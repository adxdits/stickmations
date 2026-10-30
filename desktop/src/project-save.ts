import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type SaveDialogOptions,
} from 'electron';
import { randomUUID } from 'node:crypto';
import { createWriteStream, type WriteStream } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, type Gzip } from 'node:zlib';
import { sanitizeFileName, withExtension } from './file-name.js';
import {
  PROJECT_SAVE_CHANNELS,
  type CompleteProjectSaveResult,
  type StartProjectSaveOptions,
  type StartProjectSaveResult,
} from './project-save-contract.js';

const PROJECT_FILE_EXTENSION = '.stickmation';
const MAX_PROJECT_CHUNK_BYTES = 1024 * 1024;
const MAX_PROJECT_RAW_BYTES = 512 * 1024 * 1024;

interface ProjectSaveSession {
  readonly id: string;
  readonly senderId: number;
  readonly outputPath: string;
  readonly outputKey: string;
  readonly temporaryPath: string;
  readonly gzip: Gzip;
  readonly completion: Promise<void>;
  rawBytes: number;
  chunksWritten: number;
  acceptingChunks: boolean;
}

export class ProjectSaveManager {
  private readonly sessions = new Map<string, ProjectSaveSession>();
  private readonly outputPaths = new Set<string>();

  register(): void {
    ipcMain.handle(
      PROJECT_SAVE_CHANNELS.start,
      (event, options: StartProjectSaveOptions) => this.start(event, options),
    );
    ipcMain.handle(
      PROJECT_SAVE_CHANNELS.writeChunk,
      (event, sessionId: string, chunk: unknown) =>
        this.writeChunk(event, sessionId, chunk),
    );
    ipcMain.handle(PROJECT_SAVE_CHANNELS.complete, (event, sessionId: string) =>
      this.complete(event, sessionId),
    );
    ipcMain.handle(PROJECT_SAVE_CHANNELS.cancel, (event, sessionId: string) =>
      this.cancel(event, sessionId),
    );
  }

  async cancelForSender(senderId: number): Promise<void> {
    const sessions = [...this.sessions.values()].filter(
      (session) => session.senderId === senderId,
    );
    await Promise.all(sessions.map((session) => this.abort(session)));
  }

  async dispose(): Promise<void> {
    await Promise.all(
      [...this.sessions.values()].map((session) => this.abort(session)),
    );
    for (const channel of Object.values(PROJECT_SAVE_CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  }

  private async start(
    event: IpcMainInvokeEvent,
    options: StartProjectSaveOptions,
  ): Promise<StartProjectSaveResult> {
    validateOptions(options);
    await this.cancelForSender(event.sender.id);

    const saveOptions: SaveDialogOptions = {
      title: 'Save project',
      defaultPath: projectFileName(options.suggestedName),
      filters: [{ name: 'Stickmations project', extensions: ['stickmation'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    };
    const owner = BrowserWindow.fromWebContents(event.sender);
    const selection = owner
      ? await dialog.showSaveDialog(owner, saveOptions)
      : await dialog.showSaveDialog(saveOptions);
    if (selection.canceled || !selection.filePath) {
      return { status: 'cancelled' };
    }

    const outputPath = withProjectExtension(selection.filePath);
    const outputKey = outputPathKey(outputPath);
    if (this.outputPaths.has(outputKey)) {
      throw new Error('Another project save is already writing to this file.');
    }
    this.outputPaths.add(outputKey);
    const id = randomUUID();
    const temporaryPath = join(
      dirname(outputPath),
      `.${basename(outputPath)}.${id}.tmp`,
    );
    const output = createWriteStream(temporaryPath, { flags: 'wx' });
    const gzip = createGzip({ level: 9 });
    const completion = pipeline(gzip, output);

    try {
      await waitForOpen(output);
    } catch (error) {
      this.outputPaths.delete(outputKey);
      gzip.destroy();
      await completion.catch(() => undefined);
      await removeFile(temporaryPath);
      throw error;
    }

    this.sessions.set(id, {
      id,
      senderId: event.sender.id,
      outputPath,
      outputKey,
      temporaryPath,
      gzip,
      completion,
      rawBytes: 0,
      chunksWritten: 0,
      acceptingChunks: true,
    });
    return { status: 'ready', sessionId: id };
  }

  private async writeChunk(
    event: IpcMainInvokeEvent,
    sessionId: string,
    value: unknown,
  ): Promise<void> {
    const session = this.requireSession(event, sessionId);
    if (!session.acceptingChunks) {
      throw new Error('The project save is not accepting more data.');
    }

    const chunk = projectChunk(value);
    if (session.rawBytes + chunk.byteLength > MAX_PROJECT_RAW_BYTES) {
      await this.abort(session);
      throw new Error('The project exceeds the maximum supported size.');
    }

    session.rawBytes += chunk.byteLength;
    session.chunksWritten += 1;
    try {
      await writeToGzip(session.gzip, chunk);
    } catch (error) {
      await this.abort(session);
      throw error;
    }
  }

  private async complete(
    event: IpcMainInvokeEvent,
    sessionId: string,
  ): Promise<CompleteProjectSaveResult> {
    const session = this.requireSession(event, sessionId);
    if (session.chunksWritten === 0) {
      await this.abort(session);
      throw new Error('The project save did not receive any data.');
    }

    session.acceptingChunks = false;
    session.gzip.end();
    try {
      await session.completion;
      await replaceFile(session.temporaryPath, session.outputPath);
      this.removeSession(session);
      return { path: session.outputPath };
    } catch (error) {
      this.removeSession(session);
      await removeFile(session.temporaryPath);
      throw error;
    }
  }

  private async cancel(
    event: IpcMainInvokeEvent,
    sessionId: string,
  ): Promise<void> {
    await this.abort(this.requireSession(event, sessionId));
  }

  private requireSession(
    event: IpcMainInvokeEvent,
    sessionId: string,
  ): ProjectSaveSession {
    const session = this.sessions.get(sessionId);
    if (session?.senderId !== event.sender.id) {
      throw new Error('Project save session was not found.');
    }
    return session;
  }

  private async abort(session: ProjectSaveSession): Promise<void> {
    this.removeSession(session);
    session.acceptingChunks = false;
    session.gzip.destroy();
    await session.completion.catch(() => undefined);
    await removeFile(session.temporaryPath);
  }

  private removeSession(session: ProjectSaveSession): void {
    this.sessions.delete(session.id);
    this.outputPaths.delete(session.outputKey);
  }
}

function validateOptions(options: StartProjectSaveOptions): void {
  if (
    !options ||
    typeof options.suggestedName !== 'string' ||
    options.suggestedName.length > 1024
  ) {
    throw new Error('Invalid project save settings.');
  }
}

function projectFileName(suggestedName: string): string {
  return sanitizeFileName(suggestedName, 'Untitled project', PROJECT_FILE_EXTENSION);
}

function withProjectExtension(path: string): string {
  return withExtension(path, PROJECT_FILE_EXTENSION);
}

function outputPathKey(path: string): string {
  const absolutePath = resolve(path);
  return process.platform === 'win32'
    ? absolutePath.toLowerCase()
    : absolutePath;
}

function projectChunk(value: unknown): Buffer {
  if (
    !(value instanceof Uint8Array) ||
    value.byteLength === 0 ||
    value.byteLength > MAX_PROJECT_CHUNK_BYTES
  ) {
    throw new Error('Invalid project save data.');
  }
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function waitForOpen(stream: WriteStream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.once('open', () => resolve());
    stream.once('error', reject);
  });
}

function writeToGzip(gzip: Gzip, chunk: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    gzip.write(chunk, (error) => (error ? reject(error) : resolve()));
  });
}

async function replaceFile(
  temporaryPath: string,
  outputPath: string,
): Promise<void> {
  try {
    await rename(temporaryPath, outputPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST' && code !== 'EPERM') {
      throw error;
    }

    const backupPath = `${temporaryPath}.previous`;
    try {
      await rename(outputPath, backupPath);
    } catch (backupError) {
      if ((backupError as NodeJS.ErrnoException).code === 'ENOENT') {
        await rename(temporaryPath, outputPath);
        return;
      }
      throw backupError;
    }

    try {
      await rename(temporaryPath, outputPath);
    } catch (replaceError) {
      try {
        await rename(backupPath, outputPath);
      } catch (restoreError) {
        throw new AggregateError(
          [replaceError, restoreError],
          `The project could not be replaced. The previous file remains at ${backupPath}.`,
        );
      }
      throw replaceError;
    }
    await removeFile(backupPath);
  }
}

async function removeFile(path: string): Promise<void> {
  await unlink(path).catch(() => undefined);
}

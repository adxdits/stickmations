import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type SaveDialogOptions,
} from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, extname, join } from 'node:path';
import {
  MP4_EXPORT_CHANNELS,
  type CompleteMp4ExportResult,
  type StartMp4ExportOptions,
  type StartMp4ExportResult,
} from './mp4-export-contract.js';

const MAX_FRAME_BYTES = 32 * 1024 * 1024;
const MAX_FRAME_COUNT = 100_000;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const require = createRequire(import.meta.url);

interface ExportProcessResult {
  readonly code: number | null;
  readonly error?: Error;
}

interface ExportSession {
  readonly id: string;
  readonly senderId: number;
  readonly outputPath: string;
  readonly frameCount: number;
  readonly process: ChildProcessWithoutNullStreams;
  readonly completion: Promise<ExportProcessResult>;
  readonly stderr: { value: string };
  framesWritten: number;
  acceptingFrames: boolean;
}

export class Mp4ExportManager {
  private readonly sessions = new Map<string, ExportSession>();

  register(): void {
    ipcMain.handle(
      MP4_EXPORT_CHANNELS.start,
      (event, options: StartMp4ExportOptions) => this.start(event, options),
    );
    ipcMain.handle(
      MP4_EXPORT_CHANNELS.writeFrame,
      (event, sessionId: string, frame: unknown) =>
        this.writeFrame(event, sessionId, frame),
    );
    ipcMain.handle(MP4_EXPORT_CHANNELS.complete, (event, sessionId: string) =>
      this.complete(event, sessionId),
    );
    ipcMain.handle(MP4_EXPORT_CHANNELS.cancel, (event, sessionId: string) =>
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
    for (const channel of Object.values(MP4_EXPORT_CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  }

  private async start(
    event: IpcMainInvokeEvent,
    options: StartMp4ExportOptions,
  ): Promise<StartMp4ExportResult> {
    validateOptions(options);
    await this.cancelForSender(event.sender.id);

    const saveOptions: SaveDialogOptions = {
      title: 'Export MP4',
      defaultPath: mp4FileName(options.suggestedName),
      filters: [{ name: 'MP4 video', extensions: ['mp4'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    };
    const owner = BrowserWindow.fromWebContents(event.sender);
    const selection = owner
      ? await dialog.showSaveDialog(owner, saveOptions)
      : await dialog.showSaveDialog(saveOptions);
    if (selection.canceled || !selection.filePath) {
      return { status: 'cancelled' };
    }

    const child = spawn(
      resolveFfmpegPath(),
      ffmpegArguments(options.fps, selection.filePath),
      {
        stdio: 'pipe',
        windowsHide: true,
      },
    );
    const stderr = { value: '' };
    child.stdout.resume();
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr.value = `${stderr.value}${chunk}`.slice(-16_384);
    });
    const completion = processCompletion(child);

    try {
      await waitForSpawn(child);
    } catch (error) {
      await removePartialFile(selection.filePath);
      throw error;
    }

    const id = randomUUID();
    this.sessions.set(id, {
      id,
      senderId: event.sender.id,
      outputPath: selection.filePath,
      frameCount: options.frameCount,
      process: child,
      completion,
      stderr,
      framesWritten: 0,
      acceptingFrames: true,
    });
    return { status: 'ready', sessionId: id };
  }

  private async writeFrame(
    event: IpcMainInvokeEvent,
    sessionId: string,
    value: unknown,
  ): Promise<void> {
    const session = this.requireSession(event, sessionId);
    if (
      !session.acceptingFrames ||
      session.framesWritten >= session.frameCount
    ) {
      throw new Error('The MP4 export is not accepting more frames.');
    }

    const frame = frameBuffer(value);
    await writeToStdin(session.process, frame);
    session.framesWritten += 1;
  }

  private async complete(
    event: IpcMainInvokeEvent,
    sessionId: string,
  ): Promise<CompleteMp4ExportResult> {
    const session = this.requireSession(event, sessionId);
    if (session.framesWritten !== session.frameCount) {
      await this.abort(session);
      throw new Error(
        `MP4 export received ${session.framesWritten} of ${session.frameCount} frames.`,
      );
    }

    session.acceptingFrames = false;
    session.process.stdin.end();
    const result = await session.completion;
    this.sessions.delete(session.id);
    if (result.error || result.code !== 0) {
      await removePartialFile(session.outputPath);
      const detail = session.stderr.value.trim();
      throw new Error(
        detail ||
          result.error?.message ||
          'FFmpeg could not encode the MP4 file.',
      );
    }
    return { path: session.outputPath };
  }

  private async cancel(
    event: IpcMainInvokeEvent,
    sessionId: string,
  ): Promise<void> {
    const session = this.requireSession(event, sessionId);
    await this.abort(session);
  }

  private requireSession(
    event: IpcMainInvokeEvent,
    sessionId: string,
  ): ExportSession {
    const session = this.sessions.get(sessionId);
    if (session?.senderId !== event.sender.id) {
      throw new Error('MP4 export session was not found.');
    }
    return session;
  }

  private async abort(session: ExportSession): Promise<void> {
    this.sessions.delete(session.id);
    session.acceptingFrames = false;
    session.process.stdin.destroy();
    session.process.kill();
    await session.completion;
    await removePartialFile(session.outputPath);
  }
}

function validateOptions(options: StartMp4ExportOptions): void {
  if (
    !options ||
    typeof options.suggestedName !== 'string' ||
    !Number.isInteger(options.fps) ||
    options.fps < 1 ||
    options.fps > 60 ||
    !Number.isInteger(options.frameCount) ||
    options.frameCount < 1 ||
    options.frameCount > MAX_FRAME_COUNT
  ) {
    throw new Error('Invalid MP4 export settings.');
  }
}

function mp4FileName(suggestedName: string): string {
  const fileName = basename(suggestedName)
    .replace(/[<>:"/|?*\u0000-\u001f]/g, '_')
    .replaceAll('\\', '_')
    .trim();
  const safeName = fileName || 'animation';
  return extname(safeName).toLowerCase() === '.mp4'
    ? safeName
    : `${safeName}.mp4`;
}

function resolveFfmpegPath(): string {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'ffmpeg-static',
      process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
    );
  }
  const developmentFfmpegPath = require('ffmpeg-static') as string | null;
  if (!developmentFfmpegPath) {
    throw new Error(
      `FFmpeg is not available for ${process.platform}/${process.arch}.`,
    );
  }
  return developmentFfmpegPath;
}

function ffmpegArguments(fps: number, outputPath: string): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'image2pipe',
    '-framerate',
    String(fps),
    '-vcodec',
    'png',
    '-i',
    'pipe:0',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '12',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ];
}

function frameBuffer(value: unknown): Buffer {
  if (
    !(value instanceof Uint8Array) ||
    value.byteLength === 0 ||
    value.byteLength > MAX_FRAME_BYTES
  ) {
    throw new Error('Invalid MP4 frame data.');
  }
  const frame = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (
    frame.byteLength < PNG_SIGNATURE.byteLength ||
    !frame.subarray(0, 8).equals(PNG_SIGNATURE)
  ) {
    throw new Error('MP4 frames must be PNG images.');
  }
  return frame;
}

function waitForSpawn(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
}

function processCompletion(
  child: ChildProcessWithoutNullStreams,
): Promise<ExportProcessResult> {
  return new Promise((resolve) => {
    let settled = false;
    child.once('error', (error) => {
      if (!settled) {
        settled = true;
        resolve({ code: null, error });
      }
    });
    child.once('close', (code) => {
      if (!settled) {
        settled = true;
        resolve({ code });
      }
    });
  });
}

function writeToStdin(
  child: ChildProcessWithoutNullStreams,
  frame: Buffer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    child.stdin.write(frame, (error) => (error ? reject(error) : resolve()));
  });
}

async function removePartialFile(path: string): Promise<void> {
  await unlink(path).catch(() => undefined);
}

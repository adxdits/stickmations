import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type SaveDialogOptions,
} from 'electron';
import { randomUUID } from 'node:crypto';
import { rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import {
  FIGURE_SAVE_CHANNELS,
  type SaveFigureOptions,
  type SaveFigureResult,
} from './figure-save-contract.js';

const FIGURE_FILE_EXTENSION = '.json';
/** A stick figure is a small document; this only guards against a runaway renderer. */
const MAX_FIGURE_BYTES = 16 * 1024 * 1024;

export class FigureSaveManager {
  register(): void {
    ipcMain.handle(FIGURE_SAVE_CHANNELS.save, (event, options: SaveFigureOptions) =>
      this.save(event, options),
    );
  }

  dispose(): void {
    for (const channel of Object.values(FIGURE_SAVE_CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  }

  private async save(
    event: IpcMainInvokeEvent,
    options: SaveFigureOptions,
  ): Promise<SaveFigureResult> {
    const contents = validateOptions(options);

    const saveOptions: SaveDialogOptions = {
      title: 'Save stick figure',
      defaultPath: figureFileName(options.suggestedName),
      filters: [{ name: 'Stick figure', extensions: ['json'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    };
    const owner = BrowserWindow.fromWebContents(event.sender);
    const selection = owner
      ? await dialog.showSaveDialog(owner, saveOptions)
      : await dialog.showSaveDialog(saveOptions);
    if (selection.canceled || !selection.filePath) {
      return { status: 'cancelled' };
    }

    const outputPath = withFigureExtension(selection.filePath);
    await writeAtomically(outputPath, contents);
    return { status: 'saved', path: outputPath };
  }
}

function validateOptions(options: SaveFigureOptions): string {
  if (
    !options ||
    typeof options.suggestedName !== 'string' ||
    options.suggestedName.length > 1024 ||
    typeof options.contents !== 'string' ||
    options.contents.length === 0
  ) {
    throw new Error('Invalid figure save settings.');
  }
  if (Buffer.byteLength(options.contents, 'utf8') > MAX_FIGURE_BYTES) {
    throw new Error('The figure exceeds the maximum supported size.');
  }
  return options.contents;
}

/** Writes beside the target and renames, so an interrupted save cannot truncate an existing file. */
async function writeAtomically(outputPath: string, contents: string): Promise<void> {
  const temporaryPath = join(
    dirname(outputPath),
    `.${basename(outputPath)}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function figureFileName(suggestedName: string): string {
  const fileName = basename(suggestedName)
    .replace(/[<>:"/|?*\u0000-\u001f]/g, '_')
    .replaceAll('\\', '_')
    .trim();
  return withFigureExtension(fileName || 'Untitled figure');
}

function withFigureExtension(path: string): string {
  return extname(path).toLowerCase() === FIGURE_FILE_EXTENSION
    ? path
    : `${path}${FIGURE_FILE_EXTENSION}`;
}

export const FIGURE_SAVE_CHANNELS = {
  save: 'figure-save:save',
} as const;

export interface SaveFigureOptions {
  readonly suggestedName: string;
  readonly contents: string;
}

export type SaveFigureResult =
  | Readonly<{ status: 'saved'; path: string }>
  | Readonly<{ status: 'cancelled' }>;

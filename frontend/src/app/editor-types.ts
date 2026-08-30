export type ControlMode = 'none' | 'joints' | 'camera' | 'pan';

export interface PanOffset {
  readonly x: number;
  readonly y: number;
}

export interface ZoomRequest {
  readonly factor: number;
  readonly anchor: PanOffset | null;
}

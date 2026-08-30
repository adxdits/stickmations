import type { FrameTransform, TransformProperty } from '../../domain/animation-frame';
import type { CameraProperty, SceneCamera } from '../../domain/scene-frame';

export type TimelineTrackId = 'position' | 'rotation' | 'scale' | 'camera';

interface TimelineInputDefinition {
  readonly prefix: string;
  readonly ariaLabel: string;
  readonly value: number | string;
  readonly min?: number;
  readonly placeholder?: string;
  readonly wide?: boolean;
}

export type TimelineTrackInput = TimelineInputDefinition &
  (
    | Readonly<{ target: 'transform'; property: TransformProperty }>
    | Readonly<{ target: 'camera'; property: CameraProperty }>
  );

export interface TimelineTrackRow {
  readonly label: string;
  readonly inputs?: readonly TimelineTrackInput[];
}

export interface TimelineTrackDescriptor {
  readonly id: TimelineTrackId;
  readonly label: string;
  readonly inputs: readonly TimelineTrackInput[];
  readonly rows: readonly TimelineTrackRow[];
}

export function createTimelineTracks(
  transform: FrameTransform | null,
  camera: SceneCamera | null,
): readonly TimelineTrackDescriptor[] {
  const uniformScale =
    !transform || transform.scaleX === transform.scaleY ? (transform?.scaleX ?? 100) : '';
  return [
    {
      id: 'position',
      label: 'Position',
      inputs: [
        transformInput('positionX', 'X', 'Timeline position X', transform?.positionX ?? 0),
        transformInput('positionY', 'Y', 'Timeline position Y', transform?.positionY ?? 0),
      ],
      rows: [{ label: 'X Position' }, { label: 'Y Position' }],
    },
    {
      id: 'rotation',
      label: 'Rotation',
      inputs: [
        transformInput('rotation', '°', 'Timeline rotation', transform?.rotation ?? 0, {
          wide: true,
        }),
      ],
      rows: [{ label: 'Angle' }],
    },
    {
      id: 'scale',
      label: 'Scale',
      inputs: [
        transformInput('scaleX', 'X', 'Timeline scale X', transform?.scaleX ?? 100, { min: 1 }),
        transformInput('scaleY', 'Y', 'Timeline scale Y', transform?.scaleY ?? 100, { min: 1 }),
      ],
      rows: [
        {
          label: 'Uniform',
          inputs: [
            transformInput('scale', '%', 'Timeline uniform scale', uniformScale, {
              min: 1,
              placeholder: 'Mixed',
              wide: true,
            }),
          ],
        },
        { label: 'X Scale' },
        { label: 'Y Scale' },
      ],
    },
    {
      id: 'camera',
      label: 'Camera',
      inputs: [
        cameraInput('positionX', 'X', 'Timeline camera position X', camera?.positionX ?? 0),
        cameraInput('positionY', 'Y', 'Timeline camera position Y', camera?.positionY ?? 0),
      ],
      rows: [
        {
          label: 'Rotation',
          inputs: [
            cameraInput('rotation', '°', 'Timeline camera rotation', camera?.rotation ?? 0, {
              wide: true,
            }),
          ],
        },
        {
          label: 'Frame',
          inputs: [
            cameraInput('width', 'W', 'Timeline camera width', camera?.width ?? 640, { min: 1 }),
            cameraInput('height', 'H', 'Timeline camera height', camera?.height ?? 360, { min: 1 }),
          ],
        },
      ],
    },
  ];
}

type InputOptions = Pick<TimelineTrackInput, 'min' | 'placeholder' | 'wide'>;

function transformInput(
  property: TransformProperty,
  prefix: string,
  ariaLabel: string,
  value: number | string,
  options: InputOptions = {},
): TimelineTrackInput {
  return { target: 'transform', property, prefix, ariaLabel, value, ...options };
}

function cameraInput(
  property: CameraProperty,
  prefix: string,
  ariaLabel: string,
  value: number | string,
  options: InputOptions = {},
): TimelineTrackInput {
  return { target: 'camera', property, prefix, ariaLabel, value, ...options };
}

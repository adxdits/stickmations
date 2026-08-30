import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  LucideCamera,
  LucideChevronDown,
  LucideChevronRight,
  LucidePause,
  LucidePersonStanding,
  LucidePlay,
  LucideSkipBack,
  LucideSkipForward,
} from '@lucide/angular';
import type { FrameTransform, TransformChange, TransformProperty } from './animation-frame';
import type { CameraChange, CameraProperty, SceneCamera } from './scene-frame';

type TimelineTrack = 'position' | 'rotation' | 'scale' | 'camera';

const FRAME_WIDTH = 44;
const MIN_TIMELINE_WIDTH = 720;

@Component({
  selector: 'app-timeline',
  imports: [
    LucideChevronDown,
    LucideChevronRight,
    LucideCamera,
    LucidePause,
    LucidePersonStanding,
    LucidePlay,
    LucideSkipBack,
    LucideSkipForward,
  ],
  templateUrl: './timeline.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Timeline implements OnDestroy {
  readonly figureName = input.required<string>();
  readonly currentFrame = input.required<number>();
  readonly totalFrames = input.required<number>();
  readonly fps = input.required<number>();
  readonly transform = input<FrameTransform | null>(null);
  readonly camera = input<SceneCamera | null>(null);
  readonly currentFrameChange = output<number>();
  readonly fpsChange = output<number>();
  readonly playbackChange = output<boolean>();
  readonly transformChange = output<TransformChange>();
  readonly cameraChange = output<CameraChange>();
  protected readonly isPlaying = signal(false);
  protected readonly expandedTracks = signal<ReadonlySet<TimelineTrack>>(new Set(['position']));
  protected readonly timecode = computed(() => formatTimecode(this.currentFrame(), this.fps()));
  protected readonly uniformScale = computed(() => {
    const transform = this.transform();
    if (!transform) {
      return 100;
    }
    return transform.scaleX === transform.scaleY ? transform.scaleX : '';
  });
  protected readonly frameNumbers = computed(() =>
    Array.from({ length: this.totalFrames() }, (_, index) => index + 1),
  );
  protected readonly maxFrame = computed(() => Math.max(this.totalFrames(), 1));
  protected readonly timelineWidth = computed(() =>
    Math.max(this.totalFrames() * FRAME_WIDTH, MIN_TIMELINE_WIDTH),
  );
  private playbackTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.stopPlayback();
  }
  protected togglePlayback(): void {
    if (this.isPlaying()) {
      this.stopPlayback();
      return;
    }
    this.isPlaying.set(true);
    this.playbackChange.emit(true);
    this.scheduleNextFrame();
  }
  protected stepFrame(offset: number): void {
    this.selectFrame(
      Math.min(Math.max(this.totalFrames(), 1), Math.max(1, this.currentFrame() + offset)),
    );
  }
  protected selectFrame(frame: number): void {
    this.stopPlayback();
    this.currentFrameChange.emit(frame);
  }

  protected selectFrameFromInput(event: Event): void {
    this.selectFrame(Number((event.target as HTMLInputElement).value));
  }

  protected changeFps(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.fpsChange.emit(value);
    }
  }

  protected framePosition(frame: number): number {
    return (frame - 1) * FRAME_WIDTH + FRAME_WIDTH / 2;
  }

  protected toggleTrack(track: TimelineTrack): void {
    this.expandedTracks.update((tracks) => {
      const next = new Set(tracks);
      if (next.has(track)) {
        next.delete(track);
      } else {
        next.add(track);
      }
      return next;
    });
  }

  protected isTrackExpanded(track: TimelineTrack): boolean {
    return this.expandedTracks().has(track);
  }

  protected changeTransform(property: TransformProperty, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.transformChange.emit({ property, value });
    }
  }

  protected changeCamera(property: CameraProperty, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.cameraChange.emit({ property, value });
    }
  }

  protected scrollHorizontally(event: WheelEvent, viewport: HTMLElement): void {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      viewport.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }
  private stopPlayback(): void {
    const wasPlaying = this.isPlaying();
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying.set(false);
    if (wasPlaying) {
      this.playbackChange.emit(false);
    }
  }

  private scheduleNextFrame(): void {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
    }
    this.playbackTimer = setTimeout(
      () => {
        const totalFrames = this.totalFrames();
        if (this.isPlaying() && totalFrames > 0) {
          this.currentFrameChange.emit(
            this.currentFrame() >= totalFrames ? 1 : this.currentFrame() + 1,
          );
          this.scheduleNextFrame();
        }
      },
      1000 / Math.max(this.fps(), 1),
    );
  }
}

function formatTimecode(frameNumber: number, fps: number): string {
  const safeFps = Math.max(1, Math.round(fps));
  const elapsedFrames = Math.max(0, frameNumber - 1);
  const frames = elapsedFrames % safeFps;
  const elapsedSeconds = Math.floor(elapsedFrames / safeFps);
  const seconds = elapsedSeconds % 60;
  const minutes = Math.floor(elapsedSeconds / 60) % 60;
  const hours = Math.floor(elapsedSeconds / 3600);
  return [hours, minutes, seconds, frames]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

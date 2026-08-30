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
  LucideChevronDown,
  LucideChevronRight,
  LucidePause,
  LucidePersonStanding,
  LucidePlay,
  LucideSkipBack,
  LucideSkipForward,
} from '@lucide/angular';
import type { FrameTransform, TransformChange, TransformProperty } from './animation-frame';

type TimelineTrack = 'position' | 'rotation' | 'scale';

const FRAME_WIDTH = 44;
const MIN_TIMELINE_WIDTH = 720;

@Component({
  selector: 'app-timeline',
  imports: [
    LucideChevronDown,
    LucideChevronRight,
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
  readonly transform = input<FrameTransform | null>(null);
  readonly currentFrameChange = output<number>();
  readonly transformChange = output<TransformChange>();
  protected readonly isPlaying = signal(false);
  protected readonly expandedTracks = signal<ReadonlySet<TimelineTrack>>(new Set(['position']));
  protected readonly frameLabel = computed(() => this.currentFrame().toString().padStart(2, '0'));
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
  private playbackTimer: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    this.stopPlayback();
  }
  protected togglePlayback(): void {
    if (this.isPlaying()) {
      this.stopPlayback();
      return;
    }
    this.isPlaying.set(true);
    this.playbackTimer = setInterval(() => {
      const totalFrames = this.totalFrames();
      if (totalFrames > 0) {
        this.currentFrameChange.emit(
          this.currentFrame() >= totalFrames ? 1 : this.currentFrame() + 1,
        );
      }
    }, 1000 / 12);
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

  protected scrollHorizontally(event: WheelEvent, viewport: HTMLElement): void {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      viewport.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }
  private stopPlayback(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying.set(false);
  }
}

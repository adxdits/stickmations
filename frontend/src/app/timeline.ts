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
  LucidePause,
  LucidePersonStanding,
  LucidePlay,
  LucideSkipBack,
  LucideSkipForward,
} from '@lucide/angular';

@Component({
  selector: 'app-timeline',
  imports: [LucidePause, LucidePersonStanding, LucidePlay, LucideSkipBack, LucideSkipForward],
  templateUrl: './timeline.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Timeline implements OnDestroy {
  readonly figureName = input.required<string>();
  readonly currentFrame = input.required<number>();
  readonly currentFrameChange = output<number>();
  protected readonly isPlaying = signal(false);
  protected readonly frameLabel = computed(() => this.currentFrame().toString().padStart(2, '0'));
  protected readonly ticks = Array.from({ length: 13 }, (_, index) => index * 5);
  protected readonly keyframes = [1, 10, 30, 45, 60];
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
    this.playbackTimer = setInterval(
      () => this.currentFrameChange.emit(this.currentFrame() >= 60 ? 1 : this.currentFrame() + 1),
      1000 / 12,
    );
  }
  protected stepFrame(offset: number): void {
    this.selectFrame(Math.min(60, Math.max(1, this.currentFrame() + offset)));
  }
  protected selectFrame(frame: number): void {
    this.stopPlayback();
    this.currentFrameChange.emit(frame);
  }
  private stopPlayback(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying.set(false);
  }
}

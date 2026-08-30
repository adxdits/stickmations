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
  readonly totalFrames = input.required<number>();
  readonly currentFrameChange = output<number>();
  protected readonly isPlaying = signal(false);
  protected readonly frameLabel = computed(() => this.currentFrame().toString().padStart(2, '0'));
  protected readonly frameNumbers = computed(() =>
    Array.from({ length: this.totalFrames() }, (_, index) => index + 1),
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
  protected framePosition(frame: number): number {
    const range = Math.max(this.totalFrames() - 1, 1);
    return ((frame - 1) / range) * 100;
  }
  private stopPlayback(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying.set(false);
  }
}

/**
 * 逐帧动画时钟：把经过的毫秒换算成帧号，与渲染无关。
 * 累加器计时，不受 requestAnimationFrame 抖动影响；单次推进有上限，避免长时间挂起后追帧。
 */

export type FrameClockOptions = {
  frameCount: number;
  /** 每帧时长（毫秒） */
  frameDelayMs: number;
  /** 是否循环，默认 true */
  loop?: boolean;
};

const MAX_STEP_MS = 250;

export class FrameClock {
  readonly frameCount: number;
  readonly frameDelayMs: number;
  readonly loop: boolean;

  #elapsedMs = 0;

  constructor(options: FrameClockOptions) {
    this.frameCount = options.frameCount;
    this.frameDelayMs = options.frameDelayMs;
    this.loop = options.loop ?? true;
  }

  /** 当前帧号（0 起） */
  get frame(): number {
    const steps = Math.floor(this.#elapsedMs / this.frameDelayMs);
    return this.loop
      ? ((steps % this.frameCount) + this.frameCount) % this.frameCount
      : Math.min(steps, this.frameCount - 1);
  }

  /** 本轮进度 0..1 */
  get progress(): number {
    return (this.#elapsedMs % (this.frameCount * this.frameDelayMs)) / (this.frameCount * this.frameDelayMs);
  }

  /** 非循环模式是否已播完 */
  get completed(): boolean {
    return !this.loop && this.#elapsedMs >= this.frameCount * this.frameDelayMs;
  }

  /** 推进时间，返回新的帧号 */
  advance(deltaMs: number): number {
    this.#elapsedMs += deltaMs < 0 ? 0 : Math.min(deltaMs, MAX_STEP_MS);
    return this.frame;
  }

  /** 跳到指定帧（内部计时同步对齐，保证后续推进从该帧继续） */
  seek(frame: number): void {
    const clamped = Math.min(Math.max(Math.floor(frame), 0), this.frameCount - 1);
    this.#elapsedMs = clamped * this.frameDelayMs;
  }
}

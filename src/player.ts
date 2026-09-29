import { FrameClock } from "./clock.js";
import { DEFAULT_FRAMES_URL, DEFAULT_SPRITE_URL, loadSpriteData, type SpriteData } from "./frames.js";
import { loadSpriteSheet, type Rect, type SpriteSheet } from "./sprite.js";

/**
 * 逐帧动画播放组件（框架无关，Canvas 2D）。
 * 尺寸、适配方式、播放状态均可配置；框架接入见 `./react.js` 与 `./vue.js`。
 */

export type PaimonFit = "contain" | "cover";

export type PaimonOptions = {
  /** 承载画布，与 `container` 二选一 */
  canvas?: HTMLCanvasElement;
  /** 容器：组件会自动创建一个画布并跟随容器尺寸 */
  container?: HTMLElement;
  /**
   * 容器模式下画布高度的取法：
   * `"auto"`（默认）容器高度由 CSS 决定时铺满、否则按动画比例；
   * `"fill"` 始终铺满容器；`"aspect"` 始终按动画比例。
   */
  containerHeight?: "auto" | "fill" | "aspect";
  /** 雪碧图地址，默认包内 assets/paimon.png */
  spriteUrl?: string;
  /** 帧表地址，默认包内 assets/paimon.frames.json */
  framesUrl?: string;
  /** 直接给帧表数据（给了就不再请求 framesUrl） */
  data?: SpriteData;
  /** 画布宽度（CSS px） */
  width?: number;
  /** 画布高度（CSS px） */
  height?: number;
  /** 只给宽度的简写：`size: 64` → 宽 64px、高按雪碧图比例 */
  size?: number;
  /** 画布内如何摆放：contain 等比完整显示（默认）/ cover 铺满可能裁切 */
  fit?: PaimonFit;
  /** 每帧时长（毫秒），默认取帧表里的 55.6ms ≈ 18fps */
  frameDelayMs?: number;
  /** 是否循环，默认 true；false 时播到末帧自动暂停并触发 onEnd */
  loop?: boolean;
  /** 时间倍率，默认 1 */
  speed?: number;
  /** 是否播放，默认 true */
  playing?: boolean;
  /** 设备像素比，默认 min(devicePixelRatio, 3) */
  dpr?: number;
  /** 预烘焙每帧为 ImageBitmap（默认 true，播放最省 CPU） */
  bake?: boolean;
  /** 跟随容器尺寸自动重排，默认 true */
  autoResize?: boolean;
  /** 页面切到后台自动暂停，默认 true */
  pauseOnHidden?: boolean;
  /** 尊重 prefers-reduced-motion：命中时静止在代表帧，默认 true */
  respectReducedMotion?: boolean;
  /** 画布背景色，默认透明 */
  backgroundColor?: string | null;
  /** 每帧回调（帧号变化时才触发） */
  onFrame?: (frame: number, player: PaimonPlayer) => void;
  /** 素材就绪回调 */
  onReady?: (player: PaimonPlayer) => void;
  /** 单次播放结束回调（`loop: false` 时） */
  onEnd?: (player: PaimonPlayer) => void;
  /** 出错回调 */
  onError?: (error: Error) => void;
};

type SizeInput = { size?: number; width?: number; height?: number; fit?: PaimonFit };

/** 保留两位小数，避免浮点噪声写进样式 */
const round = (value: number): number => Math.round(value * 100) / 100;

/** reduced motion 下静止展示的代表帧 */
const STILL_FRAME = 45;

export class PaimonPlayer {
  readonly canvas: HTMLCanvasElement;

  #context: CanvasRenderingContext2D;
  #options: {
    fit: PaimonFit;
    speed: number;
    dpr: number;
    bake: boolean;
    autoResize: boolean;
    pauseOnHidden: boolean;
    respectReducedMotion: boolean;
    backgroundColor: string | null;
    spriteUrl: string;
    framesUrl: string;
    data?: SpriteData;
    frameDelayMs?: number;
    loop: boolean;
    onFrame?: (frame: number, player: PaimonPlayer) => void;
    onReady?: (player: PaimonPlayer) => void;
    onEnd?: (player: PaimonPlayer) => void;
    onError?: (error: Error) => void;
    container?: HTMLElement;
    containerHeight: "auto" | "fill" | "aspect";
    ownsCanvas: boolean;
    playing: boolean;
  };

  #aspectRatio = 1;
  /** 初始尺寸请求；真实宽高比确定后据此重算一次 */
  #sizeRequest: SizeInput;
  #clock: FrameClock | null = null;
  #sheet: SpriteSheet | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #abort = new AbortController();
  #rafId = 0;
  #lastTimestamp = 0;
  #playing = false;
  #destroyed = false;
  #pausedByVisibility = false;
  /** 尺寸来源：显式参数 / 容器内容盒 / 画布自身（宽度 100% + 动画比例） */
  #sizeMode: "explicit" | "container" | "canvas" = "canvas";
  /** 显式尺寸参数，供无参 `resize()` 时重新套用 */
  #explicitSize: { size?: number; width?: number; height?: number } = {};
  #stillFrame: number | null = null;
  #drawnFrame = -1;

  private constructor(canvas: HTMLCanvasElement, options: PaimonOptions) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法获取 2D 画布上下文");
    this.canvas = canvas;
    this.canvas.style.display = "block";
    this.#context = context;
    this.#options = {
      fit: options.fit ?? "contain",
      speed: options.speed ?? 1,
      dpr: options.dpr ?? 0,
      bake: options.bake ?? true,
      autoResize: options.autoResize ?? true,
      pauseOnHidden: options.pauseOnHidden ?? true,
      respectReducedMotion: options.respectReducedMotion ?? true,
      backgroundColor: options.backgroundColor ?? null,
      spriteUrl: options.spriteUrl ?? DEFAULT_SPRITE_URL,
      framesUrl: options.framesUrl ?? DEFAULT_FRAMES_URL,
      ...(options.data ? { data: options.data } : {}),
      loop: options.loop ?? true,
      ...(options.frameDelayMs !== undefined ? { frameDelayMs: options.frameDelayMs } : {}),
      ...(options.onFrame ? { onFrame: options.onFrame } : {}),
      ...(options.onReady ? { onReady: options.onReady } : {}),
      ...(options.onEnd ? { onEnd: options.onEnd } : {}),
      ...(options.onError ? { onError: options.onError } : {}),
      ...(options.container ? { container: options.container } : {}),
      containerHeight: options.containerHeight ?? "auto",
      ownsCanvas: options.canvas === undefined,
      playing: options.playing ?? true,
    };
    this.#sizeRequest = {
      ...(options.size !== undefined ? { size: options.size } : {}),
      ...(options.width !== undefined ? { width: options.width } : {}),
      ...(options.height !== undefined ? { height: options.height } : {}),
      ...(options.fit !== undefined ? { fit: options.fit } : {}),
    };
    const hasExplicit = options.size !== undefined || options.width !== undefined || options.height !== undefined;
    this.#sizeMode = hasExplicit ? "explicit" : options.container ? "container" : "canvas";
    this.#applySize(this.#sizeRequest);
  }

  /** 创建实例：加载帧表与雪碧图，就绪后按 `playing` 决定是否自动播放 */
  static async create(options: PaimonOptions): Promise<PaimonPlayer> {
    const canvas = options.canvas ?? (options.container ? PaimonPlayer.#mountCanvas(options.container) : null);
    if (!canvas) throw new Error("需要提供 canvas 或 container 之一");

    const player = new PaimonPlayer(canvas, options);
    player.#observeVisibility();

    try {
      const data = options.data ?? (await loadSpriteData(player.#options.framesUrl, player.#abort.signal));
      if (player.#destroyed) return player;
      player.#aspectRatio = data.frameBox.width / data.frameBox.height;
      player.#clock = new FrameClock({
        frameCount: data.frames.length,
        frameDelayMs: player.#options.frameDelayMs ?? data.frameDelayMs,
        loop: player.#options.loop,
      });
      player.#sheet = await loadSpriteSheet(
        { imageUrl: player.#options.spriteUrl, data, bake: player.#options.bake },
        player.#abort.signal,
      );
      // 宽高比此时才确定，用真实比例重算一次尺寸
      player.#applySize(player.#sizeRequest);
    } catch (error) {
      const reason = error instanceof Error ? error : new Error(String(error));
      player.#options.onError?.(reason);
      throw reason;
    }

    if (player.#destroyed) return player;
    // reduced motion：不播动画，直接停在代表帧
    player.#stillFrame =
      player.#options.respectReducedMotion &&
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
        ? STILL_FRAME
        : null;

    player.#observeResize(options.container);
    player.#syncCanvasPixels();
    player.render();
    player.#options.onReady?.(player);
    if (player.#options.playing && player.#stillFrame === null) player.play();
    return player;
  }

  static #mountCanvas(container: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);
    return canvas;
  }

  /** 帧总数 */
  get frameCount(): number {
    return this.#clock?.frameCount ?? 0;
  }

  /** 当前帧号（0 起） */
  get frame(): number {
    return this.#stillFrame ?? this.#clock?.frame ?? 0;
  }

  /** 本轮进度 0..1 */
  get progress(): number {
    return this.#stillFrame === null ? (this.#clock?.progress ?? 0) : 0;
  }

  /** 是否正在播放 */
  get playing(): boolean {
    return this.#playing;
  }

  /** 素材是否就绪 */
  get ready(): boolean {
    return this.#sheet !== null;
  }

  /** 动画宽高比（帧画布宽/高） */
  get aspectRatio(): number {
    return this.#aspectRatio;
  }

  /** 画布当前 CSS 尺寸 */
  get size(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  play(): void {
    if (this.#destroyed || this.#playing || this.#stillFrame !== null) return;
    if (this.#clock && !this.#clock.loop && this.#clock.completed) this.#clock.seek(0);
    this.#playing = true;
    this.#lastTimestamp = 0;
    this.#rafId = requestAnimationFrame(this.#tick);
  }

  pause(): void {
    if (!this.#playing) return;
    this.#playing = false;
    cancelAnimationFrame(this.#rafId);
  }

  /** 播放/暂停切换 */
  toggle(): void {
    if (this.#playing) this.pause();
    else this.play();
  }

  /** 跳到指定帧并立即重绘 */
  seek(frame: number): void {
    this.#clock?.seek(frame);
    this.render();
  }

  /** 改时间倍率（1 = 帧表设定的速度） */
  setSpeed(speed: number): void {
    this.#options.speed = speed;
  }

  /** 改每帧时长（毫秒），保留当前帧 */
  setFrameDelay(frameDelayMs: number): void {
    if (!this.#clock) return;
    const current = this.#clock.frame;
    this.#clock = new FrameClock({
      frameCount: this.#clock.frameCount,
      frameDelayMs,
      loop: this.#clock.loop,
    });
    this.#clock.seek(current);
  }

  /** 改是否循环（保留当前帧） */
  setLoop(loop: boolean): void {
    if (!this.#clock) return;
    const current = this.#clock.frame;
    this.#clock = new FrameClock({
      frameCount: this.#clock.frameCount,
      frameDelayMs: this.#clock.frameDelayMs,
      loop,
    });
    this.#clock.seek(current);
    if (loop && this.#options.playing && this.#stillFrame === null) this.play();
  }

  /** 调整尺寸；不传参数则按当前布局同步画布分辨率 */
  resize(size: SizeInput = {}): void {
    this.#applySize(size);
    if (!this.#playing) this.render();
  }

  /** 立即重绘当前帧 */
  render(): void {
    const { width, height } = this.canvas;
    const context = this.#context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    if (this.#options.backgroundColor) {
      context.fillStyle = this.#options.backgroundColor;
      context.fillRect(0, 0, width, height);
    } else {
      context.clearRect(0, 0, width, height);
    }
    if (!this.#sheet) return;
    const frame = this.frame;
    this.#sheet.draw(context, frame, this.#targetRect(width, height));
    this.#drawnFrame = frame;
  }

  destroy(): void {
    this.#destroyed = true;
    this.pause();
    this.#abort.abort();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    this.#sheet?.dispose();
    this.#sheet = null;
    this.#clock = null;
    if (this.#options.ownsCanvas) this.canvas.remove();
  }

  /** 套用尺寸配置：显式尺寸优先，其次容器内容盒，最后退化为 100% 宽 + 动画比例 */
  #applySize(size: SizeInput): void {
    if (size.fit) this.#options.fit = size.fit;
    if (size.size !== undefined || size.width !== undefined || size.height !== undefined) {
      this.#sizeMode = "explicit";
      this.#explicitSize = { size: size.size, width: size.width, height: size.height };
    }

    if (this.#sizeMode === "explicit") {
      const { size: onlyWidth, width, height } = this.#explicitSize;
      this.canvas.style.aspectRatio = "";
      if (onlyWidth !== undefined) {
        this.canvas.style.width = `${onlyWidth}px`;
        this.canvas.style.height = `${onlyWidth / this.#aspectRatio}px`;
      } else {
        const resolvedWidth = width ?? (height ?? 0) * this.#aspectRatio;
        this.canvas.style.width = `${resolvedWidth}px`;
        this.canvas.style.height = `${height ?? resolvedWidth / this.#aspectRatio}px`;
      }
    } else if (this.#sizeMode === "container") {
      // 尺寸交给 #syncCanvasPixels 按容器内容盒计算
    } else {
      this.canvas.style.width = "100%";
      this.canvas.style.height = "auto";
      this.canvas.style.aspectRatio = `${this.#aspectRatio}`;
    }
    this.#syncCanvasPixels();
  }

  /** 容器模式：按容器内容盒定尺；高度取法见 `containerHeight` */
  #sizeToContainer(container: HTMLElement): void {
    const style = getComputedStyle(container);
    const paddingX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const paddingY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    const width = Math.max(1, container.clientWidth - paddingX);
    const height = Math.max(1, this.#containerHeight(container, width, paddingY));
    this.canvas.style.width = `${round(width)}px`;
    this.canvas.style.height = `${round(height)}px`;
  }

  /**
   * 容器高度：`fill` 直接取容器内容高；`aspect` 用动画比例；
   * `auto` 通过「隐藏画布后容器高度是否变化」判断——不变说明容器高度由 CSS 决定（可安全铺满），
   * 变则说明容器高度由画布撑开（此时必须按比例，否则会自我放大）。
   */
  #containerHeight(container: HTMLElement, width: number, paddingY: number): number {
    const mode = this.#options.containerHeight;
    if (mode === "aspect") return width / this.#aspectRatio;
    if (mode === "fill") return container.clientHeight - paddingY;

    const withCanvas = container.clientHeight;
    const previousDisplay = this.canvas.style.display;
    this.canvas.style.display = "none";
    const withoutCanvas = container.clientHeight;
    this.canvas.style.display = previousDisplay;
    // 隐藏画布后容器高度不变 → 容器高度由 CSS 决定，可以安全铺满
    return Math.abs(withCanvas - withoutCanvas) < 1
      ? container.clientHeight - paddingY
      : width / this.#aspectRatio;
  }

  /** 画布分辨率 = CSS 尺寸 × DPR（默认上限 3） */
  #syncCanvasPixels(): void {
    const container = this.#options.container;
    if (this.#sizeMode === "container" && container) this.#sizeToContainer(container);

    // 画布无 CSS 尺寸时，width/height 属性会决定布局尺寸，读取 rect 再改属性会自我放大；
    // 检测到属性驱动布局时把当前尺寸固化为内联样式。
    const rect = this.canvas.getBoundingClientRect();
    if (
      this.canvas.style.width === "" &&
      this.canvas.style.height === "" &&
      rect.width === this.canvas.width &&
      rect.height === this.canvas.height
    ) {
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
    }

    const cssWidth = Math.max(1, Math.round(rect.width || this.canvas.clientWidth || 1));
    const cssHeight = Math.max(1, Math.round(rect.height || this.canvas.clientHeight || 1));
    const dpr = this.#options.dpr || Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 3);
    const width = Math.round(cssWidth * dpr);
    const height = Math.round(cssHeight * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.#context.imageSmoothingQuality = "high";
  }

  /** 按 fit 算出图集画布在目标画布里的矩形（设备像素） */
  #targetRect(width: number, height: number): Rect {
    const box = this.#sheet?.box ?? { width: 1, height: 1 };
    const scale =
      this.#options.fit === "cover"
        ? Math.max(width / box.width, height / box.height)
        : Math.min(width / box.width, height / box.height);
    const paintWidth = box.width * scale;
    const paintHeight = box.height * scale;
    return {
      x: (width - paintWidth) / 2,
      y: (height - paintHeight) / 2,
      width: paintWidth,
      height: paintHeight,
    };
  }

  #observeResize(container: HTMLElement | undefined): void {
    if (!this.#options.autoResize || typeof ResizeObserver === "undefined") return;
    this.#resizeObserver = new ResizeObserver(() => this.resize());
    this.#resizeObserver.observe(container ?? this.canvas);
  }

  #observeVisibility(): void {
    if (!this.#options.pauseOnHidden || typeof document === "undefined") return;
    document.addEventListener("visibilitychange", this.#onVisibilityChange);
  }

  #onVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.#playing) {
        this.pause();
        this.#pausedByVisibility = true;
      }
      return;
    }
    if (this.#pausedByVisibility) {
      this.#pausedByVisibility = false;
      this.play();
    }
  };

  #tick = (timestamp: number): void => {
    if (!this.#playing || !this.#clock) return;
    const rawDelta = this.#lastTimestamp === 0 ? 1000 / 60 : timestamp - this.#lastTimestamp;
    this.#lastTimestamp = timestamp;
    const frame = this.#clock.advance(rawDelta * this.#options.speed);

    if (frame !== this.#drawnFrame) {
      this.render();
      this.#options.onFrame?.(frame, this);
    }

    if (this.#clock.completed && !this.#clock.loop) {
      this.pause();
      this.#options.onEnd?.(this);
      return;
    }
    this.#rafId = requestAnimationFrame(this.#tick);
  };
}

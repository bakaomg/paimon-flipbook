import type { SpriteData, SpriteFrame } from "./frames.js";

/**
 * 雪碧图切帧与绘制。
 * 默认把每帧「旋转还原 + 对齐到帧画布」预烘焙为 ImageBitmap，播放时一次 drawImage；
 * `bake: false` 时改为每帧一次矩阵变换，省显存。
 */

export type Rect = { x: number; y: number; width: number; height: number };

export type SpriteSheet = {
  /** 帧总数 */
  readonly frameCount: number;
  /** 统一画布尺寸（图集像素） */
  readonly box: { width: number; height: number };
  /** 把第 index 帧画到画布上的目标矩形（设备像素） */
  draw(context: CanvasRenderingContext2D, index: number, target: Rect): void;
  /** 释放 ImageBitmap */
  dispose(): void;
};

export type LoadSheetOptions = {
  imageUrl: string;
  data: SpriteData;
  bake?: boolean;
};

const useOffscreen = typeof OffscreenCanvas !== "undefined";
const useImageBitmap = typeof createImageBitmap === "function";

async function loadImage(url: string, signal?: AbortSignal): Promise<CanvasImageSource> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`雪碧图加载失败：${url} → HTTP ${response.status}`);
  const blob = await response.blob();
  if (useImageBitmap) return createImageBitmap(blob);
  const image = new Image();
  image.src = URL.createObjectURL(blob);
  await image.decode();
  return image;
}

function release(source: CanvasImageSource): void {
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close();
}

/** 把一帧画进逻辑矩形 (0,0,w,h)：旋转过的存储区需要先转回来 */
function paintFrame(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: CanvasImageSource,
  frame: SpriteFrame,
): void {
  const { source, size } = frame;
  if (!frame.rotated) {
    context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, size.width, size.height);
    return;
  }
  // 存储区是 h×w，顺时针转 90° 后正好落进 w×h
  context.save();
  context.translate(size.width, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, source.width, source.height);
  context.restore();
}

async function bakeFrames(
  image: CanvasImageSource,
  data: SpriteData,
  signal: AbortSignal | undefined,
): Promise<CanvasImageSource[]> {
  const { width, height } = data.frameBox;
  const baked: CanvasImageSource[] = [];

  for (const frame of data.frames) {
    if (signal?.aborted) throw new DOMException("加载已取消", "AbortError");
    const canvas = useOffscreen
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
    const context = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!context) throw new Error("无法创建 2D 上下文");
    context.imageSmoothingQuality = "high";
    context.save();
    context.translate(frame.place.x, frame.place.y);
    paintFrame(context, image, frame);
    context.restore();
    baked.push(useImageBitmap ? await createImageBitmap(canvas as CanvasImageSource) : canvas);
  }
  return baked;
}

export async function loadSpriteSheet(
  options: LoadSheetOptions,
  signal?: AbortSignal,
): Promise<SpriteSheet> {
  const { data } = options;
  const bake = options.bake ?? true;
  const image = await loadImage(options.imageUrl, signal);

  if (!bake) {
    return {
      frameCount: data.frames.length,
      box: { ...data.frameBox },
      draw(context, index, target) {
        const frame = data.frames[index];
        if (!frame) return;
        const scaleX = target.width / data.frameBox.width;
        const scaleY = target.height / data.frameBox.height;
        context.save();
        context.translate(target.x + frame.place.x * scaleX, target.y + frame.place.y * scaleY);
        context.scale(scaleX, scaleY);
        paintFrame(context, image, frame);
        context.restore();
      },
      dispose() {
        release(image);
      },
    };
  }

  const frames = await bakeFrames(image, data, signal);
  release(image);

  return {
    frameCount: frames.length,
    box: { ...data.frameBox },
    draw(context, index, target) {
      const frame = frames[index];
      if (frame) context.drawImage(frame, target.x, target.y, target.width, target.height);
    },
    dispose() {
      for (const frame of frames) release(frame);
      frames.length = 0;
    },
  };
}

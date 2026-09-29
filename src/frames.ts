/** 帧表数据结构与读取：播放器只依赖这份 JSON，换素材不需要改代码。 */

/** 雪碧图里的一帧 */
export type SpriteFrame = {
  /** 帧名，如 `paimon-1` */
  name: string;
  /** 在图集里的存储矩形（旋转区域已换算成实际存储宽高） */
  source: { x: number; y: number; width: number; height: number };
  /** 旋转还原后的逻辑尺寸 */
  size: { width: number; height: number };
  /** 存储区是否旋转了 90° */
  rotated: boolean;
  /** 内容在帧画布里的左上角落点（y 向下，已按底边基准换算） */
  place: { x: number; y: number };
  /** 该帧的未裁剪画布尺寸 */
  box: { width: number; height: number };
};

/** 一整份逐帧动画数据 */
export type SpriteData = {
  /** 动画名 */
  name: string;
  /** 图集文件名 */
  image: string;
  /** 图集尺寸与打包缩放 */
  sheet: { width: number; height: number; scale: number };
  /** 所有帧统一的未裁剪画布尺寸（决定动画宽高比） */
  frameBox: { width: number; height: number };
  /** 每帧时长（毫秒） */
  frameDelayMs: number;
  frames: SpriteFrame[];
};

/** 组件自带的雪碧图与帧表（随包发布，默认就指向它们） */
export const DEFAULT_SPRITE_URL = new URL("../assets/paimon.png", import.meta.url).href;
export const DEFAULT_FRAMES_URL = new URL("../assets/paimon.frames.json", import.meta.url).href;

/** 读取帧表 JSON；也可以直接把对象传给播放器（`options.data`） */
export async function loadSpriteData(url: string, signal?: AbortSignal): Promise<SpriteData> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`帧表加载失败：${url} → HTTP ${response.status}`);
  const data = (await response.json()) as SpriteData;
  if (!Array.isArray(data.frames) || data.frames.length === 0) {
    throw new Error(`帧表内容不合法：${url}`);
  }
  return data;
}

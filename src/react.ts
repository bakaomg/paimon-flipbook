import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PaimonPlayer } from "./player.js";
import type { PaimonOptions } from "./player.js";
import type { SpriteData } from "./frames.js";

export type PaimonProps = Omit<PaimonOptions, "canvas" | "container"> & {
  className?: string;
  style?: CSSProperties;
  /** 无障碍描述；不传则视为装饰性元素（aria-hidden） */
  title?: string;
  /** 实例就绪回调；也可用 `ref` 取实例 */
  onReady?: (player: PaimonPlayer) => void;
};

/**
 * React 组件 `<Paimon />`：props 与 `PaimonPlayer` 选项一致（去掉 canvas/container），
 * `ref` 暴露播放器实例。内部使用 createElement，无需 JSX 转换。
 */
export const Paimon = forwardRef<PaimonPlayer | null, PaimonProps>(function Paimon(props, ref) {
  const {
    className,
    style,
    title,
    onReady,
    onFrame,
    onEnd,
    onError,
    size,
    width,
    height,
    fit,
    playing,
    speed,
    loop,
    frameDelayMs,
    spriteUrl,
    framesUrl,
    data,
    dpr,
    bake,
    autoResize,
    pauseOnHidden,
    respectReducedMotion,
    backgroundColor,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [player, setPlayer] = useState<PaimonPlayer | null>(null);
  useImperativeHandle<PaimonPlayer | null, PaimonPlayer | null>(ref, () => player, [player]);

  // 回调随时可能变，用 ref 保证组件里读到的永远是最新的那个
  const callbacks = useRef({ onReady, onFrame, onEnd, onError });
  callbacks.current = { onReady, onFrame, onEnd, onError };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let disposed = false;

    PaimonPlayer.create({
      canvas,
      spriteUrl,
      framesUrl,
      data,
      size,
      width,
      height,
      fit,
      dpr,
      bake,
      autoResize,
      pauseOnHidden,
      respectReducedMotion,
      backgroundColor,
      onFrame: (frame, instance) => callbacks.current.onFrame?.(frame, instance),
      onEnd: (instance) => callbacks.current.onEnd?.(instance),
      onError: (error) => {
        if (callbacks.current.onError) callbacks.current.onError(error);
        else console.error("[paimon]", error);
      },
    }).then((instance) => {
      if (disposed) {
        instance.destroy();
        return;
      }
      setPlayer(instance);
      callbacks.current.onReady?.(instance);
    });

    return () => {
      disposed = true;
      setPlayer((current) => {
        current?.destroy();
        return null;
      });
    };
    // 只创建一次；其余参数由下面的 effect 增量同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    player?.resize({
      ...(size !== undefined ? { size } : {}),
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(fit !== undefined ? { fit } : {}),
    });
  }, [player, size, width, height, fit]);

  useEffect(() => {
    if (player && frameDelayMs !== undefined) player.setFrameDelay(frameDelayMs);
  }, [player, frameDelayMs]);

  useEffect(() => {
    if (player && loop !== undefined) player.setLoop(loop);
  }, [player, loop]);

  useEffect(() => {
    if (player && speed !== undefined) player.setSpeed(speed);
  }, [player, speed]);

  useEffect(() => {
    if (!player || playing === undefined) return;
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);

  return createElement("canvas", {
    ref: canvasRef,
    className,
    title,
    role: title ? "img" : "presentation",
    "aria-hidden": title ? undefined : true,
    style: { display: "block", ...style },
  });
});

export { PaimonPlayer };
export type { PaimonOptions, SpriteData };

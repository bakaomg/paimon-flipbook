import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from "vue";
import { PaimonPlayer } from "./player.js";
import type { PaimonFit, PaimonOptions } from "./player.js";

type PaimonExposed = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (frame: number) => void;
  resize: (size: { size?: number; width?: number; height?: number; fit?: PaimonFit }) => void;
  setSpeed: (speed: number) => void;
  /** 就绪后的播放器实例（未就绪为 null） */
  readonly player: PaimonPlayer | null;
};

/**
 * Vue 3 组件 `<Paimon />`：props 与 `PaimonPlayer` 选项一致（去掉 canvas/container），
 * `ref` 暴露 `{ play, pause, toggle, seek, resize, setSpeed, player }`。
 * 渲染函数实现，无需 SFC 编译器。
 */
export const Paimon = defineComponent({
  name: "Paimon",
  props: {
    size: { type: Number, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    fit: { type: String as PropType<PaimonFit>, default: undefined },
    frameDelayMs: { type: Number, default: undefined },
    loop: { type: Boolean, default: undefined },
    speed: { type: Number, default: undefined },
    playing: { type: Boolean, default: undefined },
    spriteUrl: { type: String, default: undefined },
    framesUrl: { type: String, default: undefined },
    dpr: { type: Number, default: undefined },
    bake: { type: Boolean, default: undefined },
    autoResize: { type: Boolean, default: undefined },
    pauseOnHidden: { type: Boolean, default: undefined },
    respectReducedMotion: { type: Boolean, default: undefined },
    backgroundColor: { type: String as PropType<string | null>, default: undefined },
    title: { type: String, default: undefined },
  },
  emits: {
    ready: (player: PaimonPlayer) => player instanceof PaimonPlayer,
    frame: (frame: number, player: PaimonPlayer) => Number.isFinite(frame) && player instanceof PaimonPlayer,
    end: () => true,
    error: (error: Error) => error instanceof Error,
  },
  setup(props, { emit, expose }) {
    const canvas = ref<HTMLCanvasElement | null>(null);
    // 类实例用 shallowRef，避免被 Vue 深度代理（也会破坏私有字段）
    const player = shallowRef<PaimonPlayer | null>(null);
    let disposed = false;

    expose<PaimonExposed>({
      play: () => player.value?.play(),
      pause: () => player.value?.pause(),
      toggle: () => player.value?.toggle(),
      seek: (frame) => player.value?.seek(frame),
      resize: (size) => player.value?.resize(size),
      setSpeed: (speed) => player.value?.setSpeed(speed),
      get player() {
        return player.value;
      },
    });

    const createPlayer = (element: HTMLCanvasElement): void => {
      const optional: Partial<PaimonOptions> = {};
      if (props.spriteUrl !== undefined) optional.spriteUrl = props.spriteUrl;
      if (props.framesUrl !== undefined) optional.framesUrl = props.framesUrl;
      if (props.dpr !== undefined) optional.dpr = props.dpr;
      if (props.bake !== undefined) optional.bake = props.bake;
      if (props.autoResize !== undefined) optional.autoResize = props.autoResize;
      if (props.pauseOnHidden !== undefined) optional.pauseOnHidden = props.pauseOnHidden;
      if (props.respectReducedMotion !== undefined) optional.respectReducedMotion = props.respectReducedMotion;
      if (props.backgroundColor !== undefined) optional.backgroundColor = props.backgroundColor;

      PaimonPlayer.create({
        canvas: element,
        ...optional,
        playing: props.playing ?? true,
        ...(props.frameDelayMs !== undefined ? { frameDelayMs: props.frameDelayMs } : {}),
        ...(props.loop !== undefined ? { loop: props.loop } : {}),
        ...(props.speed !== undefined ? { speed: props.speed } : {}),
        ...(props.size !== undefined ? { size: props.size } : {}),
        ...(props.width !== undefined ? { width: props.width } : {}),
        ...(props.height !== undefined ? { height: props.height } : {}),
        ...(props.fit !== undefined ? { fit: props.fit } : {}),
        onFrame: (frame, instance) => emit("frame", frame, instance),
        onEnd: () => emit("end"),
        onError: (error) => emit("error", error),
      })
        .then((instance) => {
          if (disposed) {
            instance.destroy();
            return;
          }
          player.value = instance;
          emit("ready", instance);
        })
        .catch((error: unknown) => {
          emit("error", error instanceof Error ? error : new Error(String(error)));
        });
    };

    onMounted(() => {
      if (canvas.value) createPlayer(canvas.value);
    });

    watch(
      () => [props.size, props.width, props.height, props.fit] as const,
      ([size, width, height, fit]) => {
        if (!player.value) return;
        player.value.resize({
          ...(size !== undefined ? { size } : {}),
          ...(width !== undefined ? { width } : {}),
          ...(height !== undefined ? { height } : {}),
          ...(fit !== undefined ? { fit } : {}),
        });
      },
    );

    watch(
      () => props.frameDelayMs,
      (frameDelayMs) => {
        if (frameDelayMs !== undefined) player.value?.setFrameDelay(frameDelayMs);
      },
    );

    watch(
      () => props.loop,
      (loop) => {
        if (loop !== undefined) player.value?.setLoop(loop);
      },
    );

    watch(
      () => props.speed,
      (speed) => {
        if (speed !== undefined) player.value?.setSpeed(speed);
      },
    );

    watch(
      () => props.playing,
      (playing) => {
        if (playing === undefined) return;
        if (playing) player.value?.play();
        else player.value?.pause();
      },
    );

    onBeforeUnmount(() => {
      disposed = true;
      player.value?.destroy();
      player.value = null;
    });

    return () =>
      h("canvas", {
        ref: canvas,
        title: props.title,
        role: props.title ? "img" : "presentation",
        "aria-hidden": props.title ? undefined : "true",
        style: { display: "block" },
      });
  },
});

export { PaimonPlayer };
export type { PaimonFit, PaimonOptions, PaimonExposed };

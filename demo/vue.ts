import { createApp, defineComponent, h, ref, type VNode } from "vue";
import { Paimon } from "@bakaomg/paimon-flipbook/vue";
import { SNIPPETS, copySnippet, highlight } from "./snippets.js";
import type { PaimonExposed } from "@bakaomg/paimon-flipbook/vue";

// 演示页与包内目录结构不同，显式指定资源地址
const ASSETS = { spriteUrl: "../assets/paimon.png", framesUrl: "../assets/paimon.frames.json" };

/** 代码块右上角的复制按钮（复制源码原文） */
const CopyButton = defineComponent({
  name: "SnippetCopyButton",
  props: { code: { type: String, required: true } },
  setup(props) {
    const label = ref("复制");
    return () =>
      h(
        "button",
        {
          class: "snippet-copy",
          type: "button",
          onClick: async () => {
            label.value = (await copySnippet({ title: "", language: "ts", code: props.code })) ? "已复制" : "复制失败";
            window.setTimeout(() => (label.value = "复制"), 1500);
          },
        },
        label.value,
      );
  },
});

/** 带说明文字的格子，和原生版保持同一套 DOM 结构 */
function cell(caption: string, node: VNode): VNode {
  return h("div", { class: "cell" }, [h("span", null, caption), node]);
}

const Demo = defineComponent({
  name: "PaimonDemo",
  setup() {
    const size = ref(104);
    const playing = ref(true);
    const speed = ref(1);
    const loop = ref(true);
    const status = ref("");
    const player = ref<PaimonExposed | null>(null);

    const inputNumber = (event: Event): number => Number((event.target as HTMLInputElement).value);

    return () =>
      h("main", { class: "app" }, [
        h("h1", null, "Vue 3 用法"),

        h("section", { class: "block" }, [
          h("h2", null, '① 固定盒子 320×200 fit: "cover"'),
          h("div", { class: "hero-box" }, [h(Paimon, { width: 320, height: 200, fit: "cover", ...ASSETS })]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, "② 自适应宽度（不给尺寸，高度按动画比例）"),
          h("div", { class: "fluid-box" }, [h(Paimon, { ...ASSETS })]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, "③ 固定尺寸 size"),
          h("div", { class: "row" }, [
            cell("24px", h(Paimon, { size: 24, ...ASSETS })),
            cell("40px", h(Paimon, { size: 40, ...ASSETS })),
            cell("72px", h(Paimon, { size: 72, ...ASSETS })),
          ]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, "④ 状态驱动 size / playing / speed / loop"),
          h("div", { class: "row" }, [
            cell(
              `${size.value}px`,
              h(Paimon, {
                ref: player,
                size: size.value,
                playing: playing.value,
                speed: speed.value,
                loop: loop.value,
                onFrame: (frame: number, instance) => (status.value = `第 ${frame + 1} / ${instance.frameCount} 帧`),
                ...ASSETS,
              }),
            ),
          ]),
          h("div", { class: "controls" }, [
            h("label", null, [
              "尺寸",
              h("input", {
                type: "range",
                min: 16,
                max: 200,
                value: size.value,
                onInput: (event: Event) => (size.value = inputNumber(event)),
              }),
              h("span", null, `${size.value}px`),
            ]),
            h("button", { onClick: () => (playing.value = !playing.value) }, playing.value ? "暂停" : "播放"),
            h("label", null, [
              "速度",
              h("input", {
                type: "range",
                min: 0.25,
                max: 3,
                step: 0.25,
                value: speed.value,
                onInput: (event: Event) => (speed.value = inputNumber(event)),
              }),
              h("span", null, `${speed.value.toFixed(2)}×`),
            ]),
            h("label", null, [
              h("input", {
                type: "checkbox",
                checked: loop.value,
                onChange: (event: Event) => (loop.value = (event.target as HTMLInputElement).checked),
              }),
              "循环",
            ]),
            h("span", { class: "status" }, status.value),
          ]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, "用法示例"),
          h("details", { class: "snippet" }, [
            h("summary", null, SNIPPETS.vue.title),
            h(CopyButton, { code: SNIPPETS.vue.code }),
            h("pre", null, [h("code", { class: "language-vue", innerHTML: highlight(SNIPPETS.vue.code) })]),
          ]),
        ]),

        h("nav", { class: "links" }, [
          h("a", { href: "./index.html" }, "原生版"),
          h("a", { href: "./react.html" }, "React 版"),
        ]),
      ]);
  },
});

const mount = document.querySelector("#app");
if (!mount) throw new Error("缺少 #app");
createApp(Demo).mount(mount);

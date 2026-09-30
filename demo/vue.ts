import { createApp, defineComponent, h, ref, type VNode } from "vue";
import { Paimon } from "@bakaomg/paimon-flipbook/vue";
import { LOCALES, frameStatus, getLocale, initPage, localeLabel, onLocaleChange, setLocale, t } from "./i18n.js";
import { copyLabels, copySnippet, highlight, snippet } from "./snippets.js";
import type { PaimonExposed } from "@bakaomg/paimon-flipbook/vue";

// 演示页与包内目录结构不同，显式指定资源地址
const ASSETS = { spriteUrl: "../assets/paimon.png", framesUrl: "../assets/paimon.frames.json" };

initPage("title.vue");

/** 代码块右上角的复制按钮（复制源码原文） */
const CopyButton = defineComponent({
  name: "SnippetCopyButton",
  props: { code: { type: String, required: true } },
  setup(props) {
    const state = ref<"idle" | "done" | "failed">("idle");
    return () =>
      h(
        "button",
        {
          class: "snippet-copy",
          type: "button",
          onClick: async () => {
            state.value = (await copySnippet(props.code)) ? "done" : "failed";
            window.setTimeout(() => (state.value = "idle"), 1500);
          },
        },
        copyLabels()[state.value],
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
    const locale = ref(getLocale());
    onLocaleChange(() => (locale.value = getLocale()));

    const size = ref(104);
    const playing = ref(true);
    const speed = ref(1);
    const loop = ref(true);
    const status = ref("");
    const player = ref<PaimonExposed | null>(null);

    const inputNumber = (event: Event): number => Number((event.target as HTMLInputElement).value);

    return () => {
      const usage = snippet("vue");
      return h("main", { class: "app" }, [
        h(
          "div",
          { class: "locale-switch" },
          LOCALES.map((item) =>
            h(
              "button",
              {
                key: item,
                type: "button",
                "data-locale": item,
                class: item === locale.value ? "is-active" : "",
                onClick: () => setLocale(item),
              },
              localeLabel(item),
            ),
          ),
        ),

        h("h1", null, t("h1.vue")),

        h("section", { class: "block" }, [
          h("h2", null, t("block.hero")),
          h("div", { class: "hero-box" }, [h(Paimon, { width: 320, height: 200, fit: "cover", ...ASSETS })]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, t("block.fluid")),
          h("div", { class: "fluid-box" }, [h(Paimon, { ...ASSETS })]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, t("block.fixed")),
          h("div", { class: "row" }, [
            cell("24px", h(Paimon, { size: 24, ...ASSETS })),
            cell("40px", h(Paimon, { size: 40, ...ASSETS })),
            cell("72px", h(Paimon, { size: 72, ...ASSETS })),
          ]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, t("block.state")),
          h("div", { class: "row" }, [
            cell(
              `${size.value}px`,
              h(Paimon, {
                ref: player,
                size: size.value,
                playing: playing.value,
                speed: speed.value,
                loop: loop.value,
                onFrame: (frame: number, instance) => (status.value = frameStatus(frame + 1, instance.frameCount)),
                ...ASSETS,
              }),
            ),
          ]),
          h("div", { class: "controls" }, [
            h("label", null, [
              h("span", null, t("control.size")),
              h("input", {
                type: "range",
                min: 16,
                max: 200,
                value: size.value,
                onInput: (event: Event) => (size.value = inputNumber(event)),
              }),
              h("span", null, `${size.value}px`),
            ]),
            h("button", { onClick: () => (playing.value = !playing.value) }, t(playing.value ? "control.pause" : "control.play")),
            h("label", null, [
              h("span", null, t("control.speed")),
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
              h("span", null, t("control.loop")),
            ]),
            h("span", { class: "status" }, status.value),
          ]),
        ]),

        h("section", { class: "block" }, [
          h("h2", null, t("block.usage")),
          h("details", { class: "snippet" }, [
            h("summary", null, usage.title),
            h(CopyButton, { code: usage.code }),
            h("pre", null, [h("code", { class: `language-${usage.language}`, innerHTML: highlight(usage.code) })]),
          ]),
        ]),

        h("nav", { class: "links" }, [
          h("a", { href: "./index.html" }, t("nav.vanilla")),
          h("a", { href: "./react.html" }, t("nav.react")),
        ]),
      ]);
    };
  },
});

const mount = document.querySelector("#app");
if (!mount) throw new Error("缺少 #app");
createApp(Demo).mount(mount);

import { createElement, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Paimon } from "@bakaomg/paimon-flipbook/react";
import {
  LOCALES,
  getLocale,
  initPage,
  localeLabel,
  onLocaleChange,
  setLocale,
  t,
  frameStatus,
  type Locale,
} from "./i18n.js";
import { copyLabels, copySnippet, highlight, snippet } from "./snippets.js";
import type { PaimonPlayer } from "@bakaomg/paimon-flipbook/react";

// 演示页与包内目录结构不同，显式指定资源地址
const ASSETS = { spriteUrl: "../assets/paimon.png", framesUrl: "../assets/paimon.frames.json" };

initPage("title.react");

/** 语言变化时触发重渲染 */
function useLocale(): Locale {
  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => onLocaleChange(() => setLocaleState(getLocale())), []);
  return locale;
}

/** 带说明文字的格子，和原生版保持同一套 DOM 结构 */
function cell(caption: string, node: ReactNode): ReactNode {
  return createElement("div", { className: "cell" }, createElement("span", null, caption), node);
}

/** 代码块右上角的复制按钮（复制源码原文） */
function CopyButton({ code }: { code: string }): ReactNode {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return createElement(
    "button",
    {
      className: "snippet-copy",
      type: "button",
      onClick: async () => {
        setState((await copySnippet(code)) ? "done" : "failed");
        window.setTimeout(() => setState("idle"), 1500);
      },
    },
    copyLabels()[state],
  );
}

function Demo() {
  const locale = useLocale();
  const [size, setSize] = useState(104);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [status, setStatus] = useState("");
  const player = useRef<PaimonPlayer | null>(null);
  const usage = snippet("react");

  const number = (event: ChangeEvent<HTMLInputElement>): number => Number(event.target.value);

  return createElement(
    "main",
    { className: "app" },
    createElement(
      "div",
      { className: "locale-switch" },
      LOCALES.map((item) =>
        createElement(
          "button",
          {
            key: item,
            type: "button",
            "data-locale": item,
            className: item === locale ? "is-active" : "",
            onClick: () => setLocale(item),
          },
          localeLabel(item),
        ),
      ),
    ),

    createElement("h1", null, t("h1.react")),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, t("block.hero")),
      createElement(
        "div",
        { className: "hero-box" },
        createElement(Paimon, { width: 320, height: 200, fit: "cover", ...ASSETS }),
      ),
    ),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, t("block.fluid")),
      createElement("div", { className: "fluid-box" }, createElement(Paimon, { ...ASSETS })),
    ),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, t("block.fixed")),
      createElement(
        "div",
        { className: "row" },
        cell("24px", createElement(Paimon, { size: 24, ...ASSETS })),
        cell("40px", createElement(Paimon, { size: 40, ...ASSETS })),
        cell("72px", createElement(Paimon, { size: 72, ...ASSETS })),
      ),
    ),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, t("block.state")),
      createElement(
        "div",
        { className: "row" },
        cell(
          `${size}px`,
          createElement(Paimon, {
            ref: player,
            size,
            playing,
            speed,
            loop,
            onFrame: (frame, instance) => setStatus(frameStatus(frame + 1, instance.frameCount)),
            ...ASSETS,
          }),
        ),
      ),
      createElement(
        "div",
        { className: "controls" },
        createElement(
          "label",
          null,
          createElement("span", null, t("control.size")),
          createElement("input", { type: "range", min: 16, max: 200, value: size, onChange: (e: ChangeEvent<HTMLInputElement>) => setSize(number(e)) }),
          createElement("span", null, `${size}px`),
        ),
        createElement("button", { onClick: () => setPlaying((value) => !value) }, t(playing ? "control.pause" : "control.play")),
        createElement(
          "label",
          null,
          createElement("span", null, t("control.speed")),
          createElement("input", { type: "range", min: 0.25, max: 3, step: 0.25, value: speed, onChange: (e: ChangeEvent<HTMLInputElement>) => setSpeed(number(e)) }),
          createElement("span", null, `${speed.toFixed(2)}×`),
        ),
        createElement(
          "label",
          null,
          createElement("input", { type: "checkbox", checked: loop, onChange: (e: ChangeEvent<HTMLInputElement>) => setLoop(e.target.checked) }),
          createElement("span", null, t("control.loop")),
        ),
        createElement("span", { className: "status" }, status),
      ),
    ),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, t("block.usage")),
      createElement(
        "details",
        { className: "snippet" },
        createElement("summary", null, usage.title),
        createElement(CopyButton, { code: usage.code }),
        createElement(
          "pre",
          null,
          createElement("code", {
            className: `language-${usage.language}`,
            dangerouslySetInnerHTML: { __html: highlight(usage.code) },
          }),
        ),
      ),
    ),

    createElement(
      "nav",
      { className: "links" },
      createElement("a", { href: "./index.html" }, t("nav.vanilla")),
      createElement("a", { href: "./vue.html" }, t("nav.vue")),
    ),
  );
}

const root = document.querySelector("#root");
if (!root) throw new Error("缺少 #root");
createRoot(root).render(createElement(Demo));

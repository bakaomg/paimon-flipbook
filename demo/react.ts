import { createElement, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Paimon } from "@bakaomg/paimon-flipbook/react";
import { SNIPPETS, copySnippet, highlight } from "./snippets.js";
import type { PaimonPlayer } from "@bakaomg/paimon-flipbook/react";

// 演示页与包内目录结构不同，显式指定资源地址
const ASSETS = { spriteUrl: "../assets/paimon.png", framesUrl: "../assets/paimon.frames.json" };

/** 带说明文字的格子，和原生版保持同一套 DOM 结构 */
function cell(caption: string, node: ReactNode): ReactNode {
  return createElement("div", { className: "cell" }, createElement("span", null, caption), node);
}

/** 代码块右上角的复制按钮（复制源码原文） */
function CopyButton({ code }: { code: string }): ReactNode {
  const [label, setLabel] = useState("复制");
  return createElement(
    "button",
    {
      className: "snippet-copy",
      type: "button",
      onClick: async () => {
        setLabel((await copySnippet({ title: "", language: "ts", code })) ? "已复制" : "复制失败");
        window.setTimeout(() => setLabel("复制"), 1500);
      },
    },
    label,
  );
}

function Demo() {
  const [size, setSize] = useState(104);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [status, setStatus] = useState("");
  const player = useRef<PaimonPlayer | null>(null);

  const number = (event: ChangeEvent<HTMLInputElement>): number => Number(event.target.value);

  return createElement(
    "main",
    { className: "app" },
    createElement("h1", null, "React 用法"),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, '① 固定盒子 320×200 fit: "cover"'),
      createElement(
        "div",
        { className: "hero-box" },
        createElement(Paimon, { width: 320, height: 200, fit: "cover", ...ASSETS }),
      ),
    ),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, "② 自适应宽度（不给尺寸，高度按动画比例）"),
      createElement("div", { className: "fluid-box" }, createElement(Paimon, { ...ASSETS })),
    ),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, "③ 固定尺寸 size"),
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
      createElement("h2", null, "④ 状态驱动 size / playing / speed / loop"),
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
            onFrame: (frame, instance) => setStatus(`第 ${frame + 1} / ${instance.frameCount} 帧`),
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
          "尺寸",
          createElement("input", { type: "range", min: 16, max: 200, value: size, onChange: (e: ChangeEvent<HTMLInputElement>) => setSize(number(e)) }),
          createElement("span", null, `${size}px`),
        ),
        createElement("button", { onClick: () => setPlaying((value) => !value) }, playing ? "暂停" : "播放"),
        createElement(
          "label",
          null,
          "速度",
          createElement("input", { type: "range", min: 0.25, max: 3, step: 0.25, value: speed, onChange: (e: ChangeEvent<HTMLInputElement>) => setSpeed(number(e)) }),
          createElement("span", null, `${speed.toFixed(2)}×`),
        ),
        createElement(
          "label",
          null,
          createElement("input", { type: "checkbox", checked: loop, onChange: (e: ChangeEvent<HTMLInputElement>) => setLoop(e.target.checked) }),
          "循环",
        ),
        createElement("span", { className: "status" }, status),
      ),
    ),

    createElement(
      "section",
      { className: "block" },
      createElement("h2", null, "用法示例"),
      createElement(
        "details",
        { className: "snippet" },
        createElement("summary", null, SNIPPETS.react.title),
        createElement(CopyButton, { code: SNIPPETS.react.code }),
        createElement(
          "pre",
          null,
          createElement("code", {
            className: "language-tsx",
            dangerouslySetInnerHTML: { __html: highlight(SNIPPETS.react.code) },
          }),
        ),
      ),
    ),

    createElement(
      "nav",
      { className: "links" },
      createElement("a", { href: "./index.html" }, "原生版"),
      createElement("a", { href: "./vue.html" }, "Vue 3 版"),
    ),
  );
}

const root = document.querySelector("#root");
if (!root) throw new Error("缺少 #root");
createRoot(root).render(createElement(Demo));

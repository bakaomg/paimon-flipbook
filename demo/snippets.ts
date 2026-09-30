/**
 * 演示页共用的用法示例：中英两套文案（代码逐字一致，只译注释与标题）+ 零依赖高亮器 + 折叠面板 + 复制。
 * 三份演示页（原生 / React / Vue）都渲染同一套片段，样式与结构保持一致。
 */
import { getLocale, t, type Locale, type StringKey } from "./i18n.js";

export type SnippetName = "vanilla" | "react" | "vue";

export type Snippet = {
  /** 折叠框标题 */
  title: string;
  /** 代码语言（同时作为 code 元素的 class） */
  language: "ts" | "tsx" | "vue";
  /** 源码原文，复制时复制它 */
  code: string;
};

const TITLE_KEYS: Record<SnippetName, StringKey> = {
  vanilla: "snippet.vanilla.title",
  react: "snippet.react.title",
  vue: "snippet.vue.title",
};

const CODE: Record<Locale, Record<SnippetName, Pick<Snippet, "language" | "code">>> = {
  en: {
    vanilla: {
      language: "ts",
      code: `import { PaimonPlayer } from "@bakaomg/paimon-flipbook";

// container-driven size: with only a width, the canvas height follows the animation ratio
const player = await PaimonPlayer.create({
  container: document.querySelector("#slot"),
  fit: "contain",   // contain: fully visible at the animation ratio (default) / cover: fills, may crop
  frameDelayMs: 55.6, // duration of one frame, defaults to the frame table
  speed: 1,         // time multiplier
  loop: true,       // false pauses on the last frame and fires onEnd
  onFrame: (frame) => console.log(frame),
});

player.pause();     // hold it while the data is not ready
await loadData();
player.play();      // data is ready, keep playing
player.resize({ size: 120 }); // resize when needed
player.destroy();   // release the frame cache and in-flight requests on unmount`,
    },
    react: {
      language: "tsx",
      code: `import { useRef, useState } from "react";
import { Paimon } from "@bakaomg/paimon-flipbook/react";
import type { PaimonPlayer } from "@bakaomg/paimon-flipbook";

export function Loading() {
  const [playing, setPlaying] = useState(true);
  const player = useRef<PaimonPlayer | null>(null);

  return (
    <>
      {/* size is a width only, the height follows the animation ratio; playing / speed / loop apply immediately */}
      <Paimon ref={player} size={64} playing={playing} speed={1} />

      <button onClick={() => setPlaying((value) => !value)}>play / pause</button>
      <button onClick={() => player.current?.seek(45)}>jump to frame 46</button>
    </>
  );
}`,
    },
    vue: {
      language: "vue",
      code: `<script setup lang="ts">
import { ref } from "vue";
import { Paimon } from "@bakaomg/paimon-flipbook/vue";

const size = ref(64); // width only, height follows the animation ratio
const player = ref<{ seek: (frame: number) => void } | null>(null);
</script>

<template>
  <!-- the ref exposes seek / play / pause / resize / setSpeed -->
  <Paimon ref="player" :size="size" @ready="(p) => console.log(p.frameCount)" />
  <input type="range" v-model.number="size" min="16" max="200" />
  <button @click="player?.seek(45)">jump to frame 46</button>
</template>`,
    },
  },
  zh: {
    vanilla: {
      language: "ts",
      code: `import { PaimonPlayer } from "@bakaomg/paimon-flipbook";

// 用容器驱动尺寸：容器只给宽度时，画布高度按动画比例自动计算
const player = await PaimonPlayer.create({
  container: document.querySelector("#slot"),
  fit: "contain",   // contain 等比完整显示（默认）/ cover 铺满容器、可能裁切
  frameDelayMs: 55.6, // 每帧时长，默认取帧表
  speed: 1,         // 时间倍率
  loop: true,       // false 时播到末帧自动暂停并触发 onEnd
  onFrame: (frame) => console.log(frame),
});

player.pause();     // 数据未就绪时先停住
await loadData();
player.play();      // 数据就绪继续播放
player.resize({ size: 120 }); // 需要时改尺寸
player.destroy();   // 卸载时释放帧缓存与在途请求`,
    },
    react: {
      language: "tsx",
      code: `import { useRef, useState } from "react";
import { Paimon } from "@bakaomg/paimon-flipbook/react";
import type { PaimonPlayer } from "@bakaomg/paimon-flipbook";

export function Loading() {
  const [playing, setPlaying] = useState(true);
  const player = useRef<PaimonPlayer | null>(null);

  return (
    <>
      {/* size 只给宽度，高度按动画比例推导；playing / speed / loop 改动立即生效 */}
      <Paimon ref={player} size={64} playing={playing} speed={1} />

      <button onClick={() => setPlaying((value) => !value)}>播放 / 暂停</button>
      <button onClick={() => player.current?.seek(45)}>跳到第 46 帧</button>
    </>
  );
}`,
    },
    vue: {
      language: "vue",
      code: `<script setup lang="ts">
import { ref } from "vue";
import { Paimon } from "@bakaomg/paimon-flipbook/vue";

const size = ref(64); // 只给宽度，高度按动画比例
const player = ref<{ seek: (frame: number) => void } | null>(null);
</script>

<template>
  <!-- ref 暴露 seek / play / pause / resize / setSpeed -->
  <Paimon ref="player" :size="size" @ready="(p) => console.log(p.frameCount)" />
  <input type="range" v-model.number="size" min="16" max="200" />
  <button @click="player?.seek(45)">跳到第 46 帧</button>
</template>`,
    },
  },
};

/** 取当前语言的片段 */
export function snippet(name: SnippetName): Snippet {
  const locale = getLocale();
  return { title: t(TITLE_KEYS[name]), ...CODE[locale][name] };
}

const RULES: { className: string; pattern: RegExp }[] = [
  { className: "tok-comment", pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/y },
  { className: "tok-string", pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/y },
  { className: "tok-tag", pattern: /<\/?[A-Za-z][\w-]*|\/?>/y },
  {
    className: "tok-keyword",
    pattern:
      /\b(?:import|from|export|default|const|let|var|new|await|async|function|return|if|else|true|false|null|undefined|as|type|interface|void|number|string|boolean)\b/y,
  },
  { className: "tok-number", pattern: /\b\d+(?:\.\d+)?\b/y },
  { className: "tok-fn", pattern: /[A-Za-z_$][\w$]*(?=\()/y },
  { className: "tok-prop", pattern: /(?:[A-Za-z_$][\w$]*:)|(?:@[a-z-]+)|(?::[a-z-]+)/y },
];

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const escapeHtml = (text: string): string => text.replace(/[&<>]/g, (char) => ESCAPES[char] ?? char);

/** 极简语法高亮：单遍扫描，按规则表匹配注释 / 字符串 / 标签 / 关键字 / 数字 / 函数名 */
export function highlight(code: string): string {
  let out = "";
  let index = 0;
  while (index < code.length) {
    let matched = false;
    for (const rule of RULES) {
      rule.pattern.lastIndex = index;
      const match = rule.pattern.exec(code);
      if (match && match[0].length > 0) {
        out += `<span class="${rule.className}">${escapeHtml(match[0])}</span>`;
        index += match[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += escapeHtml(code[index] ?? "");
      index += 1;
    }
  }
  return out;
}

/** 复制源码到剪贴板；返回是否成功 */
export async function copySnippet(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    return false;
  }
}

/** 复制按钮的三种状态文案，语言切换后由调用方重新取值 */
export const copyLabels = (): Record<"idle" | "done" | "failed", string> => ({
  idle: t("snippet.copy"),
  done: t("snippet.copied"),
  failed: t("snippet.copyFailed"),
});

export type SnippetPanel = {
  element: HTMLDetailsElement;
  /** 换语言后就地刷新标题与代码，保留展开状态与复制按钮状态 */
  update: (name: SnippetName) => void;
};

/** 原生演示用的折叠面板：<details> + 复制按钮 + 高亮代码 */
export function createSnippetPanel(name: SnippetName): SnippetPanel {
  let current = snippet(name);

  const details = document.createElement("details");
  details.className = "snippet";

  const summary = document.createElement("summary");
  summary.textContent = current.title;

  const button = document.createElement("button");
  button.className = "snippet-copy";
  button.type = "button";
  const resetLabel = () => (button.textContent = copyLabels().idle);
  resetLabel();
  button.addEventListener("click", async () => {
    button.textContent = (await copySnippet(current.code)) ? copyLabels().done : copyLabels().failed;
    window.setTimeout(resetLabel, 1500);
  });

  const code = document.createElement("code");
  code.className = `language-${current.language}`;
  code.innerHTML = highlight(current.code);
  const pre = document.createElement("pre");
  pre.append(code);

  details.append(summary, button, pre);

  return {
    element: details,
    update: (next: SnippetName) => {
      current = snippet(next);
      summary.textContent = current.title;
      code.className = `language-${current.language}`;
      code.innerHTML = highlight(current.code);
      resetLabel();
    },
  };
}

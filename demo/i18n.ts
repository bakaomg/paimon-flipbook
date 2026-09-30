/**
 * 演示页共用的多语言支持：默认英文，浏览器语言是中文时用中文；右上角可手动切换并记住选择。
 * 三份演示页（原生 / React / Vue）都用这里的文案，保证切换后结构与文字完全一致。
 */

export type Locale = "en" | "zh";

export const LOCALES: readonly Locale[] = ["en", "zh"];

/** 切换按钮上的语言名，两种语言下都一样 */
export const localeLabel = (locale: Locale): string => (locale === "en" ? "EN" : "中文");

const STORAGE_KEY = "paimon-demo-locale";

const STRINGS = {
  en: {
    "title.vanilla": "Paimon flipbook component · Vanilla usage",
    "title.react": "Paimon flipbook component · React usage",
    "title.vue": "Paimon flipbook component · Vue 3 usage",
    "h1.vanilla": "Vanilla usage",
    "h1.react": "React usage",
    "h1.vue": "Vue 3 usage",
    "block.hero": '① Fixed box 320×200 fit: "cover"',
    "block.fluid": "② Fluid width (no size, height follows the animation ratio)",
    "block.fixed": "③ Fixed size",
    "block.state": "④ State-driven size / playing / speed / loop",
    "block.usage": "Usage examples",
    "control.size": "size",
    "control.speed": "speed",
    "control.loop": "loop",
    "control.pause": "pause",
    "control.play": "play",
    "nav.vanilla": "Vanilla",
    "nav.react": "React",
    "nav.vue": "Vue 3",
    "snippet.vanilla.title": "Vanilla usage (framework-agnostic)",
    "snippet.react.title": "React usage",
    "snippet.vue.title": "Vue 3 usage",
    "snippet.copy": "copy",
    "snippet.copied": "copied",
    "snippet.copyFailed": "copy failed",
    "footer.assets": "Image assets: © miHoYo / HoYoverse. All rights reserved.",
    "footer.restriction": "Used here for personal, non-commercial study only. Redistribution is not permitted.",
    "footer.developed":
      'Developed by <a href="https://github.com/bakaomg" target="_blank" rel="noopener noreferrer">ohmyga</a>, with assistance from DeepSeek v4.1 Flash.',
  },
  zh: {
    "title.vanilla": "Paimon 逐帧动画组件 · 原生用法",
    "title.react": "Paimon 逐帧动画组件 · React 用法",
    "title.vue": "Paimon 逐帧动画组件 · Vue 3 用法",
    "h1.vanilla": "原生用法",
    "h1.react": "React 用法",
    "h1.vue": "Vue 3 用法",
    "block.hero": '① 固定盒子 320×200 fit: "cover"',
    "block.fluid": "② 自适应宽度（不给尺寸，高度按动画比例）",
    "block.fixed": "③ 固定尺寸 size",
    "block.state": "④ 状态驱动 size / playing / speed / loop",
    "block.usage": "用法示例",
    "control.size": "尺寸",
    "control.speed": "速度",
    "control.loop": "循环",
    "control.pause": "暂停",
    "control.play": "播放",
    "nav.vanilla": "原生版",
    "nav.react": "React 版",
    "nav.vue": "Vue 3 版",
    "snippet.vanilla.title": "原生用法（框架无关）",
    "snippet.react.title": "React 用法",
    "snippet.vue.title": "Vue 3 用法",
    "snippet.copy": "复制",
    "snippet.copied": "已复制",
    "snippet.copyFailed": "复制失败",
    "footer.assets": "图片资源版权归 miHoYo / HoYoverse 所有。",
    "footer.restriction": "仅供个人学习研究，不得用于任何商业用途，亦不得再分发。",
    "footer.developed":
      '本项目由 <a href="https://github.com/bakaomg" target="_blank" rel="noopener noreferrer">ohmyga</a> 开发，使用 DeepSeek v4.1 Flash 辅助。',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

/** 手动选择记在 localStorage；否则看浏览器语言——只有中文用中文，其余一律英文 */
function detect(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

let current: Locale = detect();
const listeners = new Set<() => void>();

export const getLocale = (): Locale => current;

export const t = (key: StringKey): string => STRINGS[current][key];

/** 帧计数文案按语言拼，数字位置不同，单独给格式化函数 */
export const frameStatus = (frame: number, total: number): string =>
  current === "zh" ? `第 ${frame} / ${total} 帧` : `frame ${frame} / ${total}`;

/** 把 <html lang> 与页面标题同步成当前语言（标题取 `title.<页面>` 对应的键） */
function applyDocument(titleKey: StringKey): void {
  document.documentElement.lang = current === "zh" ? "zh-cn" : "en";
  document.title = t(titleKey);
}

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  for (const listener of listeners) listener();
}

export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 静态骨架里的文案：这些节点由 HTML 给出，带 data-i18n / data-i18n-html 标记 */
export function applyStaticStrings(root: ParentNode = document): void {
  for (const element of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n as StringKey);
  }
  for (const element of root.querySelectorAll<HTMLElement>("[data-i18n-html]")) {
    element.innerHTML = t(element.dataset.i18nHtml as StringKey);
  }
}

/** 演示页初始化：同步语言与标题，并在切换时重刷静态文案 */
export function initPage(titleKey: StringKey): void {
  applyDocument(titleKey);
  applyStaticStrings();
  onLocaleChange(() => {
    applyDocument(titleKey);
    applyStaticStrings();
  });
}

/** 原生演示页用的切换控件；React / Vue 版按同一套 DOM 结构自行渲染 */
export function createLocaleSwitch(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "locale-switch";
  for (const locale of LOCALES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.locale = locale;
    button.textContent = localeLabel(locale);
    button.addEventListener("click", () => setLocale(locale));
    wrapper.append(button);
  }
  const sync = () => {
    for (const button of wrapper.querySelectorAll<HTMLElement>("button")) {
      button.classList.toggle("is-active", button.dataset.locale === current);
    }
  };
  sync();
  onLocaleChange(sync);
  return wrapper;
}

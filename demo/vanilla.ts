import { PaimonPlayer } from "@bakaomg/paimon-flipbook";
import { SNIPPETS, createSnippetPanel } from "./snippets.js";

// 演示页与包内目录结构不同，显式指定资源地址
const ASSETS = { spriteUrl: "../assets/paimon.png", framesUrl: "../assets/paimon.frames.json" };

/** 带说明文字的格子，和 React/Vue 版保持同一套 DOM 结构 */
function cell(caption: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "cell";
  const label = document.createElement("span");
  label.textContent = caption;
  wrapper.append(label);
  return wrapper;
}

const status = document.querySelector<HTMLElement>("#status");

// ① 固定盒子 + cover：画布撑满容器，动画铺满容器（可能裁切）
const hero = await PaimonPlayer.create({
  container: document.querySelector<HTMLElement>("#hero")!,
  fit: "cover",
  ...ASSETS,
});

// ② 自适应宽度：不给尺寸，画布宽度跟随容器，高度按动画比例
const fluid = await PaimonPlayer.create({
  container: document.querySelector<HTMLElement>("#fluid")!,
  ...ASSETS,
});

// ③ 固定尺寸：只给宽度，高度按动画比例推导
const fixed = await Promise.all(
  [24, 40, 72].map(async (size) => {
    const wrapper = cell(`${size}px`);
    document.querySelector("#row")!.append(wrapper);
    return PaimonPlayer.create({ container: wrapper, size, ...ASSETS });
  }),
);

// ④ 状态驱动：滑块改尺寸，按钮改播放/速度/循环
const stateCell = cell("104px");
document.querySelector("#state")!.append(stateCell);
const drivenPlayer = await PaimonPlayer.create({
  container: stateCell,
  size: 104,
  onFrame: (frame, player) => {
    if (status) status.textContent = `第 ${frame + 1} / ${player.frameCount} 帧`;
  },
  ...ASSETS,
});
const driven = [drivenPlayer, ...fixed];
const all = [hero, fluid, ...driven];

document.querySelector<HTMLInputElement>("#size")?.addEventListener("input", (event) => {
  const size = Number((event.target as HTMLInputElement).value);
  const label = stateCell.querySelector("span");
  if (label) label.textContent = `${size}px`;
  drivenPlayer.resize({ size });
});

const toggleButton = document.querySelector<HTMLElement>('[data-action="toggle"]');
toggleButton?.addEventListener("click", () => {
  const playing = !drivenPlayer.playing;
  for (const player of driven) {
    if (playing) player.play();
    else player.pause();
  }
  toggleButton.textContent = playing ? "暂停" : "播放";
});

document.querySelector<HTMLInputElement>("#speed")?.addEventListener("input", (event) => {
  const speed = Number((event.target as HTMLInputElement).value);
  for (const element of document.querySelectorAll<HTMLElement>("[data-speed-value]")) {
    element.textContent = `${speed.toFixed(2)}×`;
  }
  for (const player of all) player.setSpeed(speed);
});

document.querySelector<HTMLInputElement>("#loop")?.addEventListener("change", (event) => {
  const loop = (event.target as HTMLInputElement).checked;
  for (const player of all) player.setLoop(loop);
});

// ⑤ 用法示例：折叠面板 + 高亮 + 一键复制
document.querySelector("#usage")?.append(createSnippetPanel(SNIPPETS.vanilla));

Object.assign(globalThis, { hero, fluid, fixed, drivenPlayer });

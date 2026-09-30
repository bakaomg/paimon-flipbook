# Paimon 逐帧动画组件

[English](./README.md) | [简体中文]

> GI 6th Anniversary Event Page - Paimon Loading Icon

零依赖的逐帧动画（flipbook）播放组件：纯 Canvas 2D + TypeScript，不依赖任何框架与动画库，
可直接用在原生页面、Vue 3、React 中。尺寸、适配方式、播放状态、速度、循环全部可配置。

- 运行时零依赖；构建期只有 `typescript`
- 数据与渲染分离：帧表是一份 JSON，换素材不需要改代码
- 一帧一次 `drawImage`，无变换、无抖动；后台自动暂停，尊重 `prefers-reduced-motion`

## 快速开始

```bash
pnpm install
pnpm build          # 产出 dist/：四份压缩单行 ESM（无 sourcemap）+ 类型声明
pnpm demo           # http://127.0.0.1:8899/demo/index.html
pnpm site           # 组装可部署站点到 site/（GitHub Pages 产物）
pnpm typecheck      # 组件 + 演示 + 脚本三份 tsconfig 全查
```

构建产物（`dist/`）：

| 文件 | 内容 | 模块说明符 |
| --- | --- | --- |
| `native.js` | 核心组件（框架无关） | `@bakaomg/paimon-flipbook` |
| `react.js` | React 包装（`react` 为 peer） | `@bakaomg/paimon-flipbook/react` |
| `vue.js` | Vue 3 包装（`vue` 为 peer） | `@bakaomg/paimon-flipbook/vue` |
| `all.js` | 核心 + 两个包装 | `@bakaomg/paimon-flipbook/all` |
| `types/**` | `.d.ts` 类型声明（无逐模块 js） | — |

演示页有三份，覆盖三种接入方式：`demo/index.html`（原生）、`demo/react.html`、`demo/vue.html`；
`demo/`、`scripts/` 都是源码（要能部署就必须入库），只有构建产物被 `.gitignore` 排除，
见下文「目录结构与各文件去向」。

## 用法

### 1. 原生

```html
<canvas id="paimon"></canvas>
<script type="module">
  import { PaimonPlayer } from "@bakaomg/paimon-flipbook";

  const player = await PaimonPlayer.create({
    canvas: document.querySelector("#paimon"),
    size: 64,                                  // 只给宽度，高度按动画比例
    spriteUrl: "/static/paimon/paimon.png",
    framesUrl: "/static/paimon/paimon.frames.json",
  });

  player.pause();     // 需要时暂停
  player.play();
</script>
```

容器驱动（尺寸交给 CSS，组件自动跟随）通常更省事：

```js
const player = await PaimonPlayer.create({ container: document.querySelector("#slot") });
```

容器只给宽度、高度为 `auto` 时，组件按动画比例计算画布高度；容器给了确定高度则铺满。

### 2. React

```tsx
import { useRef, useState } from "react";
import { Paimon } from "@bakaomg/paimon-flipbook/react";
import type { PaimonPlayer } from "@bakaomg/paimon-flipbook";

export function Loading() {
  const [playing, setPlaying] = useState(true);
  const playerRef = useRef<PaimonPlayer | null>(null);

  return (
    <>
      <Paimon ref={playerRef} size={64} playing={playing} />
      <button onClick={() => setPlaying((v) => !v)}>播放 / 暂停</button>
      <button onClick={() => playerRef.current?.seek(45)}>跳到第 46 帧</button>
    </>
  );
}
```

`size` / `width` / `height` / `fit` / `playing` / `speed` / `loop` / `frameDelayMs` 改动立即生效。

### 3. Vue 3

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Paimon } from "@bakaomg/paimon-flipbook/vue";

const size = ref(64);
const player = ref<{ seek: (frame: number) => void } | null>(null);
</script>

<template>
  <Paimon ref="player" :size="size" @ready="(p) => console.log(p.frameCount)" />
  <input type="range" v-model.number="size" min="16" max="200" />
  <button @click="player?.seek(45)">跳到第 46 帧</button>
</template>
```

组件用渲染函数实现，不需要 SFC 编译器或额外插件；事件为 `ready` / `frame` / `end` / `error`。

### 4. 只要计时与切帧

```js
import { FrameClock, loadSpriteData, loadSpriteSheet } from "@bakaomg/paimon-flipbook";

const data = await loadSpriteData(FRAMES_URL);
const sheet = await loadSpriteSheet({ imageUrl: SPRITE_URL, data });
const clock = new FrameClock({ frameCount: data.frames.length, frameDelayMs: data.frameDelayMs });

function tick(now) {
  clock.advance(now - last);
  sheet.draw(ctx, clock.frame, { x: 0, y: 0, width: 200, height: 175 });
  requestAnimationFrame(tick);
}
```

## 尺寸与适配

| 传入 | 画布 CSS 尺寸 | 适用场景 |
| --- | --- | --- |
| `size: 64` | 64 × 64/比例 | 固定大小，高度按动画比例推导 |
| `width` / `height` | 按传入值，另一个按比例补齐 | 需要精确控制 |
| 都不给 + `container` | 容器内容盒（高度取法见 `containerHeight`） | 响应式布局（推荐） |
| 都不给 + 只有 `canvas` | 宽度 100%，高度由动画比例决定 | 画布已在 CSS 中定位 |

- `containerHeight`：容器模式下画布高度的取法——`"auto"`（默认）在容器高度由 CSS 决定时铺满、
  容器高度被画布撑开时改用动画比例；也可显式指定 `"fill"` 或 `"aspect"`。
- `fit`：`contain`（默认，等比完整显示，可能留白）/ `cover`（铺满，可能裁切）。
- `dpr`：默认 `min(devicePixelRatio, 3)`，画布分辨率 = CSS 尺寸 × dpr。
- 画布没有 CSS 尺寸时，组件会把当前布局尺寸固化成内联样式，避免 `width/height` 属性反向影响布局。

## API

### `PaimonPlayer.create(options) → Promise<PaimonPlayer>`

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `canvas` / `container` | `HTMLCanvasElement` / `HTMLElement` | 二选一 | 给定画布或容器（容器模式自动建画布并跟随尺寸） |
| `spriteUrl` | `string` | 包内 `assets/paimon.png` | 雪碧图地址 |
| `framesUrl` | `string` | 包内 `assets/paimon.frames.json` | 帧表地址 |
| `data` | `SpriteData` | — | 直接传帧表对象，省一次请求 |
| `size` / `width` / `height` | `number` | — | 见上一节 |
| `fit` | `"contain" \| "cover"` | `"contain"` | 画布内摆放方式 |
| `frameDelayMs` | `number` | 帧表的 `55.6` | 每帧时长（≈18fps） |
| `loop` | `boolean` | `true` | `false` 时播到末帧暂停并触发 `onEnd` |
| `speed` | `number` | `1` | 时间倍率 |
| `playing` | `boolean` | `true` | 创建后是否立即播放 |
| `dpr` | `number` | `min(dpr, 3)` | 设备像素比 |
| `bake` | `boolean` | `true` | 预烘焙每帧为 `ImageBitmap`；`false` 改为逐帧变换 |
| `autoResize` | `boolean` | `true` | 跟随容器/画布尺寸变化 |
| `pauseOnHidden` | `boolean` | `true` | 页面隐藏时暂停，恢复时继续 |
| `respectReducedMotion` | `boolean` | `true` | 命中 `prefers-reduced-motion` 时静止在代表帧 |
| `backgroundColor` | `string \| null` | `null` | 画布背景色 |
| `onFrame` / `onReady` / `onEnd` / `onError` | `function` | — | 帧回调 / 就绪 / 单次播完 / 出错 |

实例成员：

| 成员 | 说明 |
| --- | --- |
| `play()` / `pause()` / `toggle()` | 播放控制 |
| `seek(frame)` | 跳到指定帧并立即重绘（0 起） |
| `resize({ size?, width?, height?, fit? })` | 调整尺寸与适配方式 |
| `setSpeed(n)` / `setFrameDelay(ms)` / `setLoop(bool)` | 运行期调速、改帧时长、改循环（保留当前帧） |
| `render()` | 立即重绘当前帧 |
| `destroy()` | 停止动画、断开观察器、释放在途请求与 `ImageBitmap` |
| `frame` / `progress` / `playing` / `ready` / `frameCount` / `aspectRatio` / `size` / `canvas` | 只读状态 |

React 组件的 props 与上表一致（去掉 `canvas`/`container`，增加 `className`/`style`/`title`），
Vue 组件同理；两者都通过 `ref` 暴露播放器或等价方法集。

## 数据格式

帧表 JSON 就是组件与素材之间的契约：

```json
{
  "name": "paimon",
  "image": "paimon.png",
  "sheet": { "width": 1580, "height": 2038, "scale": 0.7 },
  "frameBox": { "width": 223, "height": 195 },
  "frameDelayMs": 55.6,
  "frames": [
    {
      "name": "paimon-1",
      "source": { "x": 1515, "y": 907, "width": 65, "height": 223 },
      "size": { "width": 223, "height": 65 },
      "rotated": true,
      "place": { "x": 0, "y": 125 },
      "box": { "width": 223, "height": 195 }
    }
  ]
}
```

| 字段 | 含义 |
| --- | --- |
| `frameBox` | 所有帧共用的帧画布尺寸，决定动画宽高比与默认尺寸 |
| `frameDelayMs` | 每帧时长（毫秒） |
| `frames[].source` | 帧在雪碧图里的存储矩形（`drawImage` 的 sx/sy/sw/sh） |
| `frames[].size` | 旋转还原后的逻辑尺寸 |
| `frames[].rotated` | 存储区是否旋转了 90° |
| `frames[].place` | 内容在帧画布里的左上角落点（y 向下，已按底边基准换算） |
| `frames[].box` | 该帧的帧画布尺寸 |

约定两条，实现外部数据时务必遵守：

1. 所有帧必须对齐到同一个帧画布尺寸，否则播放时会抖动；
2. 裁剪内容的落点用 `place` 表达，已换算成「距画布顶部」的距离——图集原始偏移以底边为基准
   （y 向上空间里内容下边 = `-H/2 + offsetY`），换算公式为 `place.y = 画布高 - offsetY - 内容高`。
   若直接按「距顶部」摆放，逐帧内容底边会大幅跳动。

## 目录结构

```
paimon-flipbook/
├── assets/          雪碧图 + 帧表
├── src/             组件源码（TS，零依赖）
├── demo/            演示页 HTML/CSS/TS + 语言切换（默认英文，中文浏览器自动切中文）
├── scripts/         开发脚本
│   ├── atlas-to-json.ts      图集 txt → 帧表 JSON
│   ├── vendor-frameworks.ts  把 React / Vue 运行时拷进 demo/vendor
│   ├── serve.ts              本地预览服务
│   └── build-site.ts         组装 site/ 供部署
└── .github/workflows/demo-pages.yml  构建 site/ 并发布到 GitHub Pages
```

## 本地预览

```bash
pnpm install
pnpm demo        # 构建并起服务 → http://127.0.0.1:8899/demo/index.html
```

演示页全部使用相对路径（`../dist/`、`../assets/`、`./vendor/`、`../demo-dist/`），
所以本地服务、站点根目录、任意子路径托管三种情况下都能直接跑。

## 实现要点

- **一帧一次 `drawImage`**：默认把每帧「旋转还原 + 对齐到帧画布」预烘焙为 `ImageBitmap`；
  显存紧张时用 `bake: false` 改为逐帧矩阵变换。
- **累加器计时**：按累计毫秒计算帧号，不受 `requestAnimationFrame` 抖动影响；单次推进上限 250ms。
- **帧号不变不重绘**：18fps 的动画在 60Hz 屏幕上只绘制必要帧，`onFrame` 也只在帧号变化时触发。
- **自动让路**：`pause()` 立即停止调度；页面隐藏时暂停；`prefers-reduced-motion` 下只渲染代表帧。
- **释放干净**：`destroy()` 中断在途 `fetch`、关闭所有 `ImageBitmap`、断开 `ResizeObserver`。
- **构建产出**：esbuild 打包压缩（单行、无 sourcemap、中文字符不转义），`tsc` 只产出 `.d.ts`；
  React/Vue 作为 peer 依赖不被打进产物。

## 免责声明

- 本组件仅供个人学习与技术研究使用，不得用于任何商业用途。
- `assets/` 下的图像素材版权归 miHoYo / HoYoverse 所有（Image assets: © miHoYo / HoYoverse.
  All rights reserved.），不随本项目的代码授权一并授权；请勿再分发或用于商业产品。
  如权利人认为不妥，请立即停止使用并删除相关素材。
- `src/` 下的代码为独立实现；使用本组件产生的一切后果由使用者自行承担。
- 本项目由 [ohmyga](https://github.com/bakaomg) 开发，使用 DeepSeek v4.1 Flash 辅助。

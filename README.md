# Paimon flipbook component

[English] | [简体中文](./README_zh.md)

> GI 6th Anniversary Event Page - Paimon Loading Icon

A zero-dependency flipbook player: plain Canvas 2D + TypeScript, with no framework and no animation
library. It drops straight into a vanilla page, Vue 3 or React. Size, fitting, playback state, speed
and looping are all configurable.

- Zero runtime dependencies; `typescript` is the only build-time one
- Data and rendering are separate: the frame table is a JSON file, swapping the art needs no code change
- One `drawImage` per frame, no transforms, no jitter; pauses in the background, respects `prefers-reduced-motion`

## Quick start

```bash
pnpm install
pnpm build          # writes dist/: four minified single-line ESM bundles (no sourcemap) + type declarations
pnpm demo           # http://127.0.0.1:8899/demo/index.html
pnpm site           # assembles the deployable site into site/ (GitHub Pages artifact)
pnpm typecheck      # checks all three tsconfigs: component + demo + scripts
```

Build output (`dist/`):

| File | Contents | Module specifier |
| --- | --- | --- |
| `native.js` | Core component (framework-agnostic) | `@bakaomg/paimon-flipbook` |
| `react.js` | React wrapper (`react` as a peer) | `@bakaomg/paimon-flipbook/react` |
| `vue.js` | Vue 3 wrapper (`vue` as a peer) | `@bakaomg/paimon-flipbook/vue` |
| `all.js` | Core + both wrappers | `@bakaomg/paimon-flipbook/all` |
| `types/**` | `.d.ts` type declarations (no per-module js) | — |

There are three demo pages, one per way in: `demo/index.html` (vanilla), `demo/react.html`,
`demo/vue.html`; `demo/` and `scripts/` are source (they have to be committed for deployment to work),
only build output is excluded by `.gitignore` — see "Directory layout" below.

## Usage

### 1. Vanilla

```html
<canvas id="paimon"></canvas>
<script type="module">
  import { PaimonPlayer } from "@bakaomg/paimon-flipbook";

  const player = await PaimonPlayer.create({
    canvas: document.querySelector("#paimon"),
    size: 64,                                  // width only, height follows the animation ratio
    spriteUrl: "/static/paimon/paimon.png",
    framesUrl: "/static/paimon/paimon.frames.json",
  });

  player.pause();     // pause when needed
  player.play();
</script>
```

Container-driven sizing (hand the size to CSS and let the component follow) is usually less work:

```js
const player = await PaimonPlayer.create({ container: document.querySelector("#slot") });
```

When the container only has a width and its height is `auto`, the component derives the canvas height
from the animation ratio; a definite container height is filled instead.

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
      <button onClick={() => setPlaying((v) => !v)}>play / pause</button>
      <button onClick={() => playerRef.current?.seek(45)}>jump to frame 46</button>
    </>
  );
}
```

`size` / `width` / `height` / `fit` / `playing` / `speed` / `loop` / `frameDelayMs` take effect immediately.

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
  <button @click="player?.seek(45)">jump to frame 46</button>
</template>
```

The component is written with render functions, so no SFC compiler or extra plugin is needed; events are
`ready` / `frame` / `end` / `error`.

### 4. Timing and frame cutting only

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

## Sizing and fitting

| Passed | Canvas CSS size | Use when |
| --- | --- | --- |
| `size: 64` | 64 × 64/ratio | Fixed size, height derived from the animation ratio |
| `width` / `height` | The values given, the other filled from the ratio | Exact control is needed |
| Neither + `container` | Container content box (height rule below: `containerHeight`) | Responsive layouts (recommended) |
| Neither + `canvas` only | 100% width, height from the animation ratio | The canvas is already positioned in CSS |

- `containerHeight`: how the canvas height is chosen in container mode — `"auto"` (default) fills when the
  container height is decided by CSS and falls back to the animation ratio when the canvas would stretch
  the container; `"fill"` and `"aspect"` can also be set explicitly.
- `fit`: `contain` (default, fully visible at the animation ratio, may letterbox) / `cover` (fills, may crop).
- `dpr`: defaults to `min(devicePixelRatio, 3)`; canvas resolution = CSS size × dpr.
- When the canvas has no CSS size, the component freezes the current layout size into inline styles, so the
  `width`/`height` attributes cannot feed back into layout.

## API

### `PaimonPlayer.create(options) → Promise<PaimonPlayer>`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `canvas` / `container` | `HTMLCanvasElement` / `HTMLElement` | one of the two | A canvas or a container (container mode creates the canvas and follows its size) |
| `spriteUrl` | `string` | bundled `assets/paimon.png` | Sprite sheet URL |
| `framesUrl` | `string` | bundled `assets/paimon.frames.json` | Frame table URL |
| `data` | `SpriteData` | — | Pass the frame table object directly, saving one request |
| `size` / `width` / `height` | `number` | — | See the previous section |
| `fit` | `"contain" \| "cover"` | `"contain"` | How the animation is placed inside the canvas |
| `frameDelayMs` | `number` | the table's `55.6` | Duration of one frame (≈18fps) |
| `loop` | `boolean` | `true` | `false` pauses on the last frame and fires `onEnd` |
| `speed` | `number` | `1` | Time multiplier |
| `playing` | `boolean` | `true` | Whether to start playing right after creation |
| `dpr` | `number` | `min(dpr, 3)` | Device pixel ratio |
| `bake` | `boolean` | `true` | Pre-bake each frame into an `ImageBitmap`; `false` uses per-frame transforms |
| `autoResize` | `boolean` | `true` | Follow container/canvas size changes |
| `pauseOnHidden` | `boolean` | `true` | Pause while the page is hidden, resume after |
| `respectReducedMotion` | `boolean` | `true` | Rest on a representative frame when `prefers-reduced-motion` matches |
| `backgroundColor` | `string \| null` | `null` | Canvas background colour |
| `onFrame` / `onReady` / `onEnd` / `onError` | `function` | — | Frame callback / ready / played through once / error |

Instance members:

| Member | Notes |
| --- | --- |
| `play()` / `pause()` / `toggle()` | Playback control |
| `seek(frame)` | Jump to a frame and redraw immediately (0-based) |
| `resize({ size?, width?, height?, fit? })` | Adjust size and fitting |
| `setSpeed(n)` / `setFrameDelay(ms)` / `setLoop(bool)` | Change speed, frame duration or looping at runtime (keeps the current frame) |
| `render()` | Redraw the current frame immediately |
| `destroy()` | Stop the animation, disconnect observers, release in-flight requests and `ImageBitmap`s |
| `frame` / `progress` / `playing` / `ready` / `frameCount` / `aspectRatio` / `size` / `canvas` | Read-only state |

React component props match the table above (minus `canvas`/`container`, plus `className`/`style`/`title`),
and the Vue component likewise; both expose the player, or an equivalent set of methods, through `ref`.

## Data format

The frame table JSON is the contract between the component and the art:

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

| Field | Meaning |
| --- | --- |
| `frameBox` | Frame canvas size shared by every frame; decides the aspect ratio and default size |
| `frameDelayMs` | Duration of one frame (milliseconds) |
| `frames[].source` | Rectangle of the frame inside the sprite sheet (`drawImage`'s sx/sy/sw/sh) |
| `frames[].size` | Logical size after undoing the rotation |
| `frames[].rotated` | Whether the stored region is rotated 90° |
| `frames[].place` | Top-left placement of the content inside the frame canvas (y down, converted from a bottom baseline) |
| `frames[].box` | Frame canvas size of that frame |

Two rules to follow when implementing external data:

1. Every frame must align to the same frame canvas size, otherwise playback jitters;
2. Cropped content placement is expressed with `place`, already converted to a distance from the top of the
   canvas — atlas offsets are bottom-based (in the y-up space the content's bottom edge is
   `-H/2 + offsetY`), and the conversion is `place.y = canvas height - offsetY - content height`.
   Placing by "distance from the top" directly makes the bottom edge of the content jump badly from frame
   to frame.

## Directory layout

```
animations/paimon-loading/
├── assets/          sprite sheet + frame table
├── src/             component source (TS, zero dependencies)
├── demo/            demo pages HTML/TS/CSS + framework shims
├── scripts/         development and release scripts
│   ├── vendor-frameworks.ts  copies the React / Vue runtimes into demo/vendor
│   ├── serve.ts              local preview server
│   ├── build-site.ts         assembles site/ for deployment
│   └── github-pages.yml      Pages workflow template (copy to the repository root .github/workflows/)
```

## Local preview

```bash
pnpm install
pnpm demo        # builds and serves → http://127.0.0.1:8899/demo/index.html
```

The demo pages use relative paths only (`../dist/`, `../assets/`, `./vendor/`, `../demo-dist/`), so they
run as-is from a local server, from a site root, or from any sub-path host.

## Implementation notes

- **One `drawImage` per frame**: by default every frame is pre-baked ("rotation undone + aligned to the
  frame canvas") into an `ImageBitmap`; under video-memory pressure use `bake: false` for per-frame matrix
  transforms.
- **Accumulator timing**: the frame number comes from accumulated milliseconds, so
  `requestAnimationFrame` jitter cannot affect it; a single step is capped at 250ms.
- **No redraw while the frame number is unchanged**: an 18fps animation draws only the frames it needs on a
  60Hz display, and `onFrame` fires only when the frame number changes.
- **Yields by itself**: `pause()` stops scheduling immediately; a hidden page pauses; under
  `prefers-reduced-motion` it only renders a representative frame.
- **Clean teardown**: `destroy()` aborts in-flight `fetch` calls, closes every `ImageBitmap` and disconnects
  the `ResizeObserver`.
- **Build output**: esbuild bundles and minifies (single line, no sourcemap, Chinese characters not
  escaped), `tsc` emits `.d.ts` only; React/Vue stay peer dependencies and are not bundled into the output.

## Disclaimer

- This component is for personal study and technical research only; it must not be used commercially.
- The image assets under `assets/` are copyright miHoYo / HoYoverse (Image assets: © miHoYo / HoYoverse.
  All rights reserved.) and are not covered by this project's code license; do not redistribute them or use
  them in a commercial product. If a rights holder objects, stop using them and delete the assets
  immediately.
- The code under `src/` is an independent implementation; any consequence of using this component is the
  user's own responsibility.
- Developed by [ohmyga](https://github.com/bakaomg), with assistance from DeepSeek v4.1 Flash.

/**
 * 把演示用的 React / Vue 运行时拷进 `demo/vendor/`。
 *
 * 演示页完全静态、可整目录搬迁（本地、GitHub Pages、任意子路径托管都能跑），
 * 因此不引用 `node_modules` 路径，也不依赖 CDN。这两个文件由本脚本从依赖里复制生成，
 * `demo/vendor/` 已在 .gitignore 中排除。
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(ROOT, "demo/vendor");

const FILES: [string, string][] = [
  ["node_modules/react/umd/react.production.min.js", "react.umd.js"],
  ["node_modules/react-dom/umd/react-dom.production.min.js", "react-dom.umd.js"],
  ["node_modules/vue/dist/vue.esm-browser.prod.js", "vue.js"],
];

await mkdir(VENDOR, { recursive: true });
for (const [from, to] of FILES) {
  await copyFile(join(ROOT, from), join(VENDOR, to));
  console.log(`demo/vendor/${to} ← ${from}`);
}

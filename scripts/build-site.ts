/**
 * 组装可部署的静态站点到 `site/`（GitHub Pages / 任意静态托管直接上传这个目录）。
 *
 * 产出结构与仓库一致，因此演示页里全部使用相对路径，放在站点根或任意子路径下都能跑：
 *
 *   site/
 *   ├── index.html          跳转到 demo/index.html
 *   ├── demo/               演示页（HTML/CSS/shims/vendor）
 *   ├── demo-dist/          演示页编译产物
 *   ├── dist/               组件四份压缩产物 + types/
 *   └── assets/             雪碧图 + 帧表
 *
 * 用法：pnpm site
 */
import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");

const DIRECTORIES = ["demo", "demo-dist", "dist", "assets"];

await mkdir(SITE, { recursive: true });
for (const directory of DIRECTORIES) {
  await cp(join(ROOT, directory), join(SITE, directory), {
    recursive: true,
    filter: (source) => !source.endsWith(".ts") && !source.includes(`${sep}types${sep}`),
  });
}
await writeFile(
  join(SITE, "index.html"),
  `<!doctype html>
<meta charset="utf-8" />
<title>Paimon 逐帧动画组件</title>
<meta http-equiv="refresh" content="0; url=./demo/index.html" />
<a href="./demo/index.html">演示页</a>
`,
);

console.log(`site/ 已生成（${DIRECTORIES.join("、")}）；本地预览：npx serve site 或任意静态服务器`);

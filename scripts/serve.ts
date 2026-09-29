/**
 * 演示用静态服务器（零依赖）：`node scripts/serve.ts [端口]`
 *
 * 以包根目录为根，暴露的目录结构与 `pnpm site` 生成的 site/ 一致
 * （demo/、demo-dist/、dist/、assets/），因此本地预览与部署后的行为相同：
 * 演示页里的引用全是相对路径，React / Vue 的运行时由 scripts/vendor-frameworks.ts
 * 拷进 demo/vendor/，不需要打包器或 CDN。
 * 根路径 "/" 直接跳演示页。
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8899);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (url.pathname === "/") {
    // 必须重定向而不是直接吐文件，否则页面里的相对路径会以 "/" 为基准解析
    response.writeHead(302, { location: "/demo/index.html" }).end();
    return;
  }
  const relative = decodeURIComponent(url.pathname).replace(/^\//, "");
  const target = resolve(join(ROOT, normalize(relative)));

  if (!target.startsWith(ROOT + sep)) {
    response.writeHead(403).end("forbidden");
    return;
  }
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      response.writeHead(302, { location: `${url.pathname.replace(/\/$/, "")}/index.html` }).end();
      return;
    }
    response.writeHead(200, {
      "content-type": CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
      "content-length": info.size,
      "cache-control": "no-store",
    });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end(`404 ${relative}`);
  }
}).listen(PORT, () => {
  console.log(`@bakaomg/paimon-flipbook demo: http://127.0.0.1:${PORT}/demo/index.html`);
});

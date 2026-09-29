/** import map 垫片：裸模块名 "react-dom/client" → ReactDOM UMD 全局 */
const ReactDOM = globalThis.ReactDOM;
if (!ReactDOM) throw new Error("请先加载 react-dom UMD 构建");

export const { createRoot, hydrateRoot } = ReactDOM;
export default ReactDOM;

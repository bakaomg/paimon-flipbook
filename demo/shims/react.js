/**
 * import map 垫片：把裸模块名 "react" 指向页面上的 React UMD 全局，
 * 这样 `dist/react.js` 里 `import { useEffect } from "react"` 无需打包器即可运行。
 */
const React = globalThis.React;
if (!React) throw new Error("请先加载 react UMD 构建");

export const {
  Children,
  Fragment,
  createElement,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} = React;

export default React;

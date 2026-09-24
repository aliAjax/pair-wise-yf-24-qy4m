/**
 * SSR 冒烟测试：通过 Vite SSR 加载真实 .vue 页面并 renderToString，
 * 捕获组件实例化/模板阶段的运行时错误。运行：node --import tsx scripts/ssr-smoke.ts
 * 或 node scripts/ssr-smoke.mjs（构建产物外的开发态检查）。
 */
import { createServer } from "vite";

class MemoryStorage {
  map = new Map();
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, v); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
globalThis.window = {
  localStorage: new MemoryStorage(),
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  setTimeout: (fn) => { fn(); return 0; },
  clearTimeout: () => undefined
};
globalThis.localStorage = globalThis.window.localStorage;

import { createSSRApp, defineComponent, h } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { renderToString } from "vue/server-renderer";
import ElementPlus from "element-plus";

const vite = await createServer({
  root: process.cwd(),
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom"
});

const pages = [
  ["DocumentsPage", "/src/pages/DocumentsPage.vue"],
  ["ComparePage", "/src/pages/ComparePage.vue"],
  ["RisksPage", "/src/pages/RisksPage.vue"],
  ["ReviewPage", "/src/pages/ReviewPage.vue"]
];

let failures = 0;
for (const [name, path] of pages) {
  try {
    const mod = await vite.ssrLoadModule(path);
    setActivePinia(createPinia());
    const app = createSSRApp(defineComponent({ render: () => h(mod.default) }));
    app.use(ElementPlus);
    const html = await renderToString(app);
    if (html.length < 100) throw new Error("渲染内容过短");
    console.log(`✅ ${name} SSR 渲染 ${html.length} 字符`);
  } catch (error) {
    failures += 1;
    console.error(`❌ ${name} SSR 失败:`, error);
  }
}

// DiffViewer 实体内容
try {
  const mod = await vite.ssrLoadModule("/src/components/common/DiffViewer.vue");
  setActivePinia(createPinia());
  const app = createSSRApp(
    defineComponent({
      render: () =>
        h(mod.default, {
          oldNo: "4", newNo: "4", oldHeading: "保存期限", newHeading: "保存期限",
          oldText: "注销后三十日内删除。",
          newText: "注销后六十日内删除或匿名化处理。",
          diffType: "MODIFIED"
        })
    })
  );
  app.use(ElementPlus);
  const html = await renderToString(app);
  if (!html.includes("十日内删除")) throw new Error("差异公共文本缺失");
  if (!html.includes("seg-removed") || !html.includes("seg-added")) {
    throw new Error("缺少新增/删除高亮片段");
  }
  if (!html.includes("匿名化处理")) throw new Error("新版新增内容缺失");
  console.log("✅ DiffViewer SSR 渲染包含新旧两版文本与改写高亮（三→六）");
} catch (error) {
  failures += 1;
  console.error("❌ DiffViewer SSR 失败:", error);
}

await vite.close();
process.exit(failures === 0 ? 0 : 1);

/** 路由元信息同时被 App.vue 侧边导航和 router/index.ts 使用 */
export interface AppRouteMeta {
  title: string;
  description: string;
  icon: string;
}

export const routes = [
  {
    path: "/documents",
    name: "documents",
    title: "文档导入",
    description: "粘贴旧版与新版政策文本，按编号自动分段",
    icon: "Document",
    component: () => import("../pages/DocumentsPage.vue")
  },
  {
    path: "/compare",
    name: "compare",
    title: "版本对比",
    description: "左右对照两版段落，识别新增、移除、改写与换序",
    icon: "Switch",
    component: () => import("../pages/ComparePage.vue")
  },
  {
    path: "/risks",
    name: "risks",
    title: "风险标注",
    description: "为数据收集、共享、保存期限等条款标注风险等级",
    icon: "Warning",
    component: () => import("../pages/RisksPage.vue")
  },
  {
    path: "/review",
    name: "review",
    title: "审阅清单",
    description: "按状态处理待办，结论随新版内容变化自动回退",
    icon: "Finished",
    component: () => import("../pages/ReviewPage.vue")
  }
] as const;

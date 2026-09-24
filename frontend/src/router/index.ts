import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/compare" },
    ...routes.map((route) => ({
      path: route.path,
      name: route.name,
      component: route.component,
      meta: { title: route.title, description: route.description, icon: route.icon }
    })),
    { path: "/:pathMatch(.*)*", redirect: "/compare" }
  ]
});

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? "";
  document.title = title ? `${title} · 隐私政策差异对比器` : "隐私政策差异对比器";
});

export default router;

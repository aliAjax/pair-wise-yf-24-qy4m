import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import App from "./App.vue";
import router from "./router";
import { ensureSeed } from "./api/_base";
import "./styles.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// 注册全部 Element Plus 图标（导航与按钮按名称引用）
for (const [iconName, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(iconName, component);
}

// 首次启动播种两版示例政策
ensureSeed();

app.mount("#app");

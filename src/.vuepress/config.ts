import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",
  lang: "zh-CN",
  title: "Yung's Blog",
  description: "AYung妙妙屋",
  theme,
  // 和 PWA 一起启用
  // shouldPrefetch: false,
});

import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/blog/",

  lang: "zh-CN",
  title: "Yanger's Blog",
  description: "阿阳妙妙屋",
  
  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});

import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "如何使用",
      icon: "laptop-code",
      prefix: "cyber/",
      link: "cyber/",
      children: "structure",
    },
    "intro"
  ],
});

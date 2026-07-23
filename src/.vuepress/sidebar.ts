import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    {
      text: "Cyber",
      icon: "laptop-code",
      prefix: "cyber/",
      link: "cyber/",
      children: "structure",
    },
  ],
});

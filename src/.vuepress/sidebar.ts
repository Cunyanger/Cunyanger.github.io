import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    {
      text: "Cyber Guide",
      icon: "laptop-code",
      prefix: "cyber/",
      link: "cyber/",
      children: "structure",
    },
  ],
});

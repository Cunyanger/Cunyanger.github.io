import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  "/cyber/",
  {
    text: "简语集文",
    icon: "twemoji:books",
    prefix: "/notes/",
    children: [
      {
        text: "专业",
        icon: "noto:laptop",
        prefix: "software/",
        children: [
          { text: "人月神话", icon: "book", link: "The Mythical Man-Month" },
          { text: "Head First设计模式", icon: "book", link: "Head First Design Patterns" },
          { text: "计算机网络：自顶向下方法", icon: "book", link: "Computer Networking A Top-Down Approach" },
          { text: "On Java 8", icon: "book", link: "On Java 8" },
          { text: "Effective Java", icon: "book", link: "Effective Java" },
          { text: "SQL 反模式", icon: "book", link: "SQL Antipatterns-Avoiding the Pitfalls of Database Programming" },
          { text: "敏捷软件开发：原则、模式与实践", icon: "book", link: "Agile Software Development, Principles, Patterns, and Practices" },
          { text: "JavaScript高级程序设计", icon: "book", link: "Professional JavaScript for Web Developers" },
          { text: "JavaScript权威指南", icon: "book", link: "JavaScript-The Definitive Guide" },
          { text: "鸟哥的Linux私房菜", icon: "book", link: "Linux Private Dishes" },
        ],
      },
      {
        text: "社科",
        icon: "book",
        prefix: "social_sciences/",
        children: [
          { text: "周易", icon: "openmoji:yin-yang", link: "1" },
          { text: "孙子兵法", icon: "book", link: "2" },
          { text: "商君书", icon: "book", link: "1" },
          { text: "毛选", icon: "book", link: "2" },
          { text: "黄帝内经", icon: "book", link: "1" },
          { text: "道德经", icon: "book", link: "2" },
          { text: "资本论", icon: "book", link: "1" },
          { text: "自控力", icon: "lucide:book-heart", link: "2" },
          { text: "心流", icon: "lucide:book-heart", link: "1" },
          { text: "乌合之众", icon: "lucide:book-heart", link: "2" },
          { text: "可乐牛奶经济学", icon: "book", link: "1" },
          { text: "蛤蟆先生去看心理医生", icon: "lucide:book-heart", link: "2" },
        ],
      },
      {
        text: "文学",
        icon: "book",
        prefix: "literature/",
        children: [
          { text: "活着", icon: "book", link: "1" },
          { text: "1984", icon: "book", link: "1" },
        ],
      },
    ],
  },
  "/website"
  
]);

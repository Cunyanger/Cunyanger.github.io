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
          { text: "On Java 8", icon: "book", link: "On Java 8" },
          { text: "Effective Java", icon: "book", link: "Effective Java" },
          { text: "Head First设计模式", icon: "book", link: "Head First Design Patterns" },
          { text: "计算机网络：自顶向下方法", icon: "book", link: "Computer Networking A Top-Down Approach" },
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
          { text: "谈判", icon: "book", link: "Freakonomics" },
          { text: "蛤蟆先生去看心理医生", icon: "lucide:book-heart", link: "Mr. Toad Goes to Therapy" },
          { text: "心流", icon: "lucide:book-heart", link: "Flow" },
          { text: "自控力", icon: "lucide:book-heart", link: "The Willpower Instinct" },
          { text: "道德经", icon: "book", link: "Tao Te Ching" },
          { text: "黄帝内经", icon: "book", link: "Huangdi Neijing" },
          { text: "周易", icon: "openmoji:yin-yang", link: "I Ching" },
          { text: "孙子兵法", icon: "book", link: "The Art of War" },
          { text: "乌合之众", icon: "lucide:book-heart", link: "The Crowd" },
          { text: "毛选", icon: "book", link: "Selected Works of Mao Zedong" },
          { text: "资本论", icon: "book", link: "Das Kapital" },
          { text: "可乐牛奶经济学", icon: "book", link: "Freakonomics" },
          { text: "商君书", icon: "book", link: "Shang Jun Shu" },
        ],
      },
      {
        text: "文学",
        icon: "book",
        prefix: "literature/",
        children: [
          { text: "活着", icon: "book", link: "To Live" },
          { text: "1984", icon: "book", link: "1984" },
          { text: "百年孤独", icon: "book", link: "1984" },
        ],
      },
    ],
  },
  "/website"
  
]);

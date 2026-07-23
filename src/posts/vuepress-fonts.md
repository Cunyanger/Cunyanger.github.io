---
title: VuePress 更换字体，局部字体和全局字体
date: 2026-07-18
category: VuePress
tag:
  - VuePress
  - 字体
  - 样式
isOriginal: true
excerpt: 整理 VuePress 中全局字体、标题字体、代码字体和局部字体覆盖方式。
---

# VuePress 更换字体，局部字体和全局字体

字体会直接影响博客的阅读质感。VuePress 站点里最常见的需求有三类：全局正文字体、标题字体、代码字体，以及某个页面或组件的局部字体。

这篇文章记录当前站点的字体替换方案。

## 字体选择

当前站点采用中英文混排字体栈：

- 英文正文：`Inter`
- 中文正文：`Noto Sans SC`、`PingFang SC`、`HarmonyOS Sans SC`、`Microsoft YaHei UI`
- 标题：`Noto Serif SC`、`Source Han Serif SC`、`Songti SC`
- 代码：`JetBrains Mono`、`Cascadia Code`、`Consolas`

这样做的好处是：英文有清晰的现代感，中文正文保持屏幕可读性，标题则有更强的内容气质。

## 引入 Web 字体

在 `docs/.vuepress/styles/index.scss` 顶部引入字体：

```scss
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Serif+SC:wght@600;700;900&display=swap");
```

`display=swap` 可以避免页面等待字体下载导致长时间空白。

如果不希望依赖外部字体服务，也可以删除这行，只保留系统字体栈。

## 定义全局字体变量

建议先把字体写成 CSS 变量：

```scss
:root {
  --font-sans: "Inter", "Noto Sans SC", "PingFang SC", "HarmonyOS Sans SC",
    "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif;

  --font-heading: "Noto Serif SC", "Source Han Serif SC", "Songti SC",
    "STSong", "SimSun", serif;

  --font-mono: "JetBrains Mono", "Cascadia Code", "SFMono-Regular",
    Consolas, "Liberation Mono", monospace;

  --vp-font: var(--font-sans);
}
```

`--vp-font` 是 VuePress / theme-hope 会用到的主题字体变量。

## 替换全局正文

正文、按钮、输入框统一使用无衬线字体：

```scss
body,
button,
input,
textarea,
select {
  font-family: var(--font-sans);
}
```

这样导航、表单和正文会保持一致。

## 替换标题字体

标题可以使用更有气质的中文衬线字体：

```scss
h1,
h2,
h3,
h4,
h5,
h6,
.vp-page-title h1,
.vp-blog-hero-title,
.vp-hero-title {
  font-family: var(--font-heading);
  font-weight: 700;
}
```

如果某个视觉区不适合衬线字体，比如霓虹 Hero，也可以在组件里单独覆盖。

## 替换代码字体

代码块和行内代码使用等宽字体：

```scss
code,
kbd,
samp,
pre,
.vp-code {
  font-family: var(--font-mono);
}
```

这样命令、路径、变量名会更容易对齐和扫描。

## 局部字体覆盖

如果只想让某个页面使用不同字体，可以在 frontmatter 里加一个容器类：

```md
---
containerClass: custom-font-page
---
```

然后在全局样式中只覆盖这个页面：

```scss
.custom-font-page [vp-content] {
  font-family: var(--font-heading);
}
```

如果是 Vue 组件内部局部覆盖，可以直接写在组件的 scoped style 中：

```vue
<style scoped>
.hero-title {
  font-family: "Inter", "Noto Sans SC", sans-serif;
}
</style>
```

组件内字体适合用于 Hero、卡片、按钮等视觉元素；文章正文更适合走全局变量，维护成本更低。

## 字体排查

改完字体后建议检查三件事：

1. 中文是否缺字或回退到宋体。
2. 标题在移动端是否过宽。
3. 代码块是否仍然是等宽字体。

生产构建检查：

```powershell
npm run docs:build
```

如果构建通过，再打开首页和文章页看实际阅读效果。

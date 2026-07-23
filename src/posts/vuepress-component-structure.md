---
title: VuePress 组件目录分层和组件说明
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - 组件
  - 前端
isOriginal: true
excerpt: 整理当前博客组件目录分层，并说明每个组件的职责和使用位置。
---

# VuePress 组件目录分层和组件说明

当 VuePress 博客逐渐加入首页、搜索、动效、卡片和加载页后，所有组件都放在 `components` 根目录会变得难以维护。更清晰的方式是按职责分层。

## 当前目录结构

当前组件分成四类：

```text
docs/.vuepress/components/
  effects/
    FluidCursor.vue
    PageParticleBackdrop.vue
    ParticleBackground.vue
  pages/
    ArticleLoadingPage.vue
    HomeExperience.vue
  search/
    ArticleSearch.vue
    FloatingArticleSearch.vue
  ui/
    AnimatedCircularProgressbar.vue
    ThreeDCard.vue
```

## 页面组件

页面组件负责组织完整页面结构，通常会组合多个 UI 组件和动效组件。

### `pages/HomeExperience.vue`

首页主组件。负责：

- 首屏 Hero。
- 霓虹标题和打字机副标题。
- 首页文章列表。
- 右侧 Flip Card 博主信息。
- 首页分页。

它会导入：

```js
import ParticleBackground from "../effects/ParticleBackground.vue";
import ThreeDCard from "../ui/ThreeDCard.vue";
```

### `pages/ArticleLoadingPage.vue`

文章跳转中间加载页。负责：

- 读取 `/loading/?to=目标文章路径`。
- 播放圆形进度条。
- 完成后跳转到目标文章。
- 做站内路径校验。

它会导入：

```js
import ParticleBackground from "../effects/ParticleBackground.vue";
import AnimatedCircularProgressbar from "../ui/AnimatedCircularProgressbar.vue";
```

## UI 组件

UI 组件是可复用的视觉单元，不直接关心页面路由。

### `ui/ThreeDCard.vue`

首页文章卡片组件。负责：

- 文章标题、日期、分类和摘要展示。
- 封面区域展示。
- 无封面时展示文章内容摘要。
- 3D hover 倾斜。
- `Visit` 交互悬停按钮。
- 将文章链接转成 `/loading/?to=...`。

### `ui/AnimatedCircularProgressbar.vue`

圆形进度条组件。负责：

- 接收 `value`。
- 使用 SVG circle 绘制进度。
- 通过 `stroke-dashoffset` 推进动画。

它可以继续复用于其他加载、上传、阅读进度等场景。

## 动效组件

动效组件通常依赖浏览器 API，所以要把 `window`、`document`、`canvas` 等访问放到 `onMounted` 中。

### `effects/ParticleBackground.vue`

粒子背景组件。负责：

- 绘制粒子。
- 绘制粒子连线。
- 鼠标靠近时产生轻微扰动。
- 支持 `track-window` 模式。

局部区域使用：

```vue
<ParticleBackground />
```

全屏背景使用：

```vue
<ParticleBackground track-window />
```

### `effects/PageParticleBackdrop.vue`

文章详情页背景组件。负责：

- 判断当前路由是否是文章详情页。
- 在文章页显示固定粒子背景。
- 给 `html` 添加 `article-particles-enabled` 类。
- 让正文、顶部栏、侧栏使用半透明背景。

这个组件通过 `rootComponents` 全站挂载。

### `effects/FluidCursor.vue`

流体鼠标组件。负责：

- 桌面端鼠标拖尾。
- 移动端自动禁用。
- 用户开启减少动效时自动禁用。

它也通过 `rootComponents` 全站挂载。

## 搜索组件

搜索组件负责读取构建好的搜索索引。

### `search/ArticleSearch.vue`

搜索页组件。负责：

- 加载 `/search-index.json`。
- 全量展示或按关键词过滤文章。
- 显示文章摘要和标签。

### `search/FloatingArticleSearch.vue`

右上角浮动搜索组件。负责：

- 默认只显示搜索按钮。
- 点击后展开 Halo Search 输入框。
- 显示最多 6 条即时搜索结果。
- 支持跳转到搜索页。

这个组件通过 `rootComponents` 全站挂载。

## `client.js` 注册方式

页面中通过 Markdown 使用的组件，需要注册为全局组件：

```js
app.component("ArticleLoadingPage", ArticleLoadingPage);
app.component("ArticleSearch", ArticleSearch);
app.component("HomeExperience", HomeExperience);
```

需要全站运行的组件，放到 `rootComponents`：

```js
rootComponents: [FloatingArticleSearch, FluidCursor, PageParticleBackdrop];
```

## 分层原则

以后新增组件时可以按这个规则放：

- 完整页面：放 `pages/`
- 可复用卡片、按钮、进度条：放 `ui/`
- canvas、鼠标、背景、全局视觉效果：放 `effects/`
- 搜索输入、搜索结果、索引读取：放 `search/`

这样目录结构会随着功能增长保持清晰。

---
title: VuePress 自定义主页和 Inspira UI 引入
date: 2026-07-18
category: VuePress
tag:
  - VuePress
  - Inspira UI
  - 前端
isOriginal: true
excerpt: 记录如何在 VuePress 中接管首页，并加入粒子背景、3D 卡片和流体鼠标效果。
---

# VuePress 自定义主页和 Inspira UI 引入

这篇文章记录一次 VuePress 2 + vuepress-theme-hope 博客首页改造：用自定义 Vue 组件接管首页，并参考 Inspira UI 的粒子背景、3D 卡片和流体鼠标效果完成交互。最后还会整理一套通用流程，后续可以按同样方式继续引入其他 Inspira UI 动效组件。

参考组件：

- [Particles Bg](https://inspira-ui.com/docs/cn/components/backgrounds/particles-bg)
- [3D Card](https://inspira-ui.com/docs/cn/components/cards/3d-card)
- [Fluid Cursor](https://inspira-ui.com/docs/cn/components/cursors/fluid-cursor)

## 为什么会出现两个 Hero

一开始首页使用了 `home: true`。在 vuepress-theme-hope 中，只要页面被识别为 Home 页面，主题就会渲染自己的 Hero 区域。即使额外写了自定义首页组件，也会出现“主题 Hero + 自定义 Hero”的重复。

解决方式是把首页改成普通页面，用 `containerClass` 标记它，再通过样式隐藏普通页面自带的标题、面包屑和元信息。

```md
---
article: false
title: 首页
sidebar: false
breadcrumb: false
toc: false
pageInfo: false
lastUpdated: false
contributors: false
containerClass: custom-home-page
---

<HomeExperience />
```

## 注册首页组件

在 `docs/.vuepress/client.js` 中注册首页组件和全局鼠标效果：

```js
import { defineClientConfig } from 'vuepress/client'

import FluidCursor from './components/FluidCursor.vue'
import HomeExperience from './components/HomeExperience.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('HomeExperience', HomeExperience)
  },
  rootComponents: [FluidCursor],
})
```

如果项目里已有其他组件，保留原有注册逻辑，只把新组件追加进去。

## 自定义首页结构

首页主体放在 `HomeExperience.vue` 中，结构分成两块：

1. Hero 区域：放 Logo、标题、简介和操作按钮。
2. 最新文章区域：用 3D 卡片展示文章。

```vue
<template>
  <main class="custom-home">
    <section class="custom-home__hero">
      <ParticleBackground />

      <div class="custom-home__hero-inner">
        <img class="custom-home__logo" :src="logoSrc" alt="My Space" />
        <h1>My Space</h1>
        <p>记录技术实践、阅读笔记和写作工作流。</p>
      </div>
    </section>

    <section class="custom-home__latest">
      <ThreeDCard v-for="post in posts" :key="post.link" :item="post" />
    </section>
  </main>
</template>
```

静态资源不要直接写成 `/images/logo.svg`，在 VuePress 中更稳妥的方式是使用 `withBase`：

```js
import { withBase } from 'vuepress/client'

const logoSrc = withBase('/images/logo.svg')
```

## 粒子背景组件

粒子背景用 `canvas` 实现，核心思路是：

- 根据屏幕宽度生成不同数量的粒子。
- 每一帧更新粒子位置。
- 距离较近的粒子之间绘制连线。
- 鼠标经过时对附近粒子产生轻微推开效果。
- 对 `prefers-reduced-motion` 做降级。

组件放在 `docs/.vuepress/components/ParticleBackground.vue`，只在浏览器端 `onMounted` 后访问 `window` 和 `canvas`，避免 SSR 构建报错。

这个组件还提供了一个 `trackWindow` 开关：

```vue
<ParticleBackground />
<ParticleBackground track-window />
```

- 默认模式只监听组件内部的鼠标移动，适合 Hero 或局部区域。
- `track-window` 模式监听整个窗口，适合文章页这种固定背景。

## 统一首页上下背景

如果把 `ParticleBackground` 分别放进 Hero 和最新文章 section，就会得到两个互相独立的背景。更好的方式是把粒子背景放到首页最外层，让 Hero 和文章区共享同一个背景：

```vue
<main class="custom-home">
  <ParticleBackground />

  <section class="custom-home__hero">
    <!-- Hero 内容 -->
  </section>

  <section class="custom-home__latest">
    <!-- 最新文章卡片 -->
  </section>
</main>
```

对应样式：

```scss
.custom-home {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  width: 100vw;
  margin-left: calc(50% - 50vw);
}

.custom-home__hero,
.custom-home__latest {
  position: relative;
  z-index: 1;
}
```

这样 Hero 和 Hero 下方文章卡片区域就会共用一整张 Inspira UI 粒子背景，不会出现上下背景割裂或左右两边露出其他底色的问题。

## 透明导航栏

首页顶部导航栏可以只在首页变成透明磨砂效果，融入背景，但不影响文章页默认可读性：

```scss
.custom-home-page .vp-navbar {
  border-bottom-color: transparent;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.custom-home-page .vp-navbar a,
.custom-home-page .vp-site-name {
  color: #e5f3ff;
  text-shadow: 0 0 12px rgba(34, 211, 238, 0.36);
}
```

## 全屏 Hero 和霓虹标题

如果希望进入页面第一屏全是 Hero，先让首页容器向上覆盖导航栏高度，再让 Hero 占满整个视口：

```scss
.custom-home {
  min-height: 100svh;
  margin-top: calc(var(--navbar-height, 3.6rem) * -1);
}

.custom-home__hero {
  min-height: 100svh;
}

.custom-home__hero-inner {
  padding-top: calc(var(--navbar-height, 3.6rem) + 56px);
}
```

标题可以用渐变文字和多层阴影做霓虹感。为了避免动画循环末尾出现突兀跳变，渐变色要首尾衔接：

```scss
.custom-home h1 {
  color: transparent;
  background: linear-gradient(
    90deg,
    #22d3ee 0%,
    #a78bfa 12.5%,
    #fb7185 25%,
    #facc15 37.5%,
    #22d3ee 50%,
    #a78bfa 62.5%,
    #fb7185 75%,
    #facc15 87.5%,
    #22d3ee 100%
  );
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  text-shadow:
    0 0 14px rgba(34, 211, 238, 0.5),
    0 0 28px rgba(167, 139, 250, 0.42),
    0 0 54px rgba(251, 113, 133, 0.35);
  animation:
    neon-gradient 7s linear infinite,
    neon-pulse 3.6s ease-in-out infinite alternate;
}
```

副标题的打字机效果可以用 `steps` 动画完成：

```scss
.custom-home__tagline span {
  display: inline-block;
  overflow: hidden;
  border-right: 2px solid rgba(125, 211, 252, 0.9);
  white-space: nowrap;
  animation:
    typewriter-loop 6.6s steps(18, end) 0.4s infinite,
    typing-caret 760ms steps(1, end) infinite;
}
```

移动端空间有限，可以关闭打字机的 `nowrap`，避免文字溢出。

## 文章列表和博主信息

首屏之后再展示文章列表。文章区可以做成左右布局：左侧是文章卡片，右侧是博主信息。

```vue
<section class="custom-home__latest">
  <div class="custom-home__content">
    <div class="custom-home__cards">
      <ThreeDCard v-for="post in posts" :key="post.link" :item="post" />
    </div>

    <aside class="blogger-panel">
      <img :src="logoSrc" alt="My Space" />
      <h2>My Space</h2>
      <p>技术实践、写作工作流和长期笔记。</p>
    </aside>
  </div>
</section>
```

桌面端保持右侧信息栏粘性定位，移动端改为单列：

```scss
.custom-home__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 22px;
}

.blogger-panel {
  position: sticky;
  top: calc(var(--navbar-height, 3.6rem) + 18px);
}
```

## 右侧博主 Flip Card

右侧信息卡片可以参考 Inspira UI 的 [Flip Card](https://inspira-ui.com/docs/cn/components/cards/flip-card)：正面只展示头像、名称和博客描述；反面展示文章、标签、分类和关于入口。

结构上需要一个外层透视容器、一个可旋转内层、两个正反面：

```vue
<aside class="blogger-panel">
  <div class="blogger-panel__inner">
    <section class="blogger-panel__face blogger-panel__face--front">
      <img :src="logoSrc" alt="My Space" />
      <h2>My Space</h2>
      <p>技术实践、写作工作流和长期笔记。</p>
    </section>

    <section class="blogger-panel__face blogger-panel__face--back">
      <!-- 标签、分类、密码输入、关于按钮 -->
    </section>
  </div>
</aside>
```

核心 CSS：

```scss
.blogger-panel {
  perspective: 1200px;
}

.blogger-panel__inner {
  transform-style: preserve-3d;
  transition: transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
}

.blogger-panel:hover .blogger-panel__inner,
.blogger-panel.is-flipped .blogger-panel__inner {
  transform: rotateY(180deg);
}

.blogger-panel__face {
  backface-visibility: hidden;
}

.blogger-panel__face--back {
  transform: rotateY(180deg);
}
```

## 彩虹 About 按钮和页面密码

About 按钮可以参考 Inspira UI 的 [Rainbow Button](https://inspira-ui.com/docs/cn/components/buttons/rainbow-button)，但按钮本身不负责输入密码。密码交互交给 vuepress-theme-hope 的页面加密能力处理。

按钮可以做小一点，和时间轴按钮并排：

```vue
<div class="blogger-panel__actions">
  <a class="panel-button" href="/timeline/">时间轴</a>
  <a class="rainbow-button rainbow-button--small" href="/about/">关于</a>
</div>
```

彩虹按钮通过旋转的 `conic-gradient` 做边框：

```scss
.rainbow-button::before {
  position: absolute;
  inset: -2px;
  content: "";
  background: conic-gradient(from 0deg, #22d3ee, #a78bfa, #fb7185, #facc15, #22d3ee);
  animation: rainbow-spin 2.8s linear infinite;
}
```

然后在 `docs/.vuepress/config.js` 中配置 theme-hope 加密：

```js
theme: hopeTheme({
  encrypt: {
    config: {
      '/about/': {
        password: '123',
        hint: '输入访问密码：123',
      },
    },
  },
})
```

这样用户点击“关于”进入 `/about/` 时，会看到 theme-hope 自带的密码输入界面。这个方案比把密码输入放在卡片里更符合主题机制，也更容易维护。

## 文章 3D 卡片结构

文章卡片可以参考 Inspira UI 的 3D Card 示例，做成竖版卡片，并把内容分成四层：

1. 文章日期和分类。
2. 标题和摘要。
3. 封面图片区域。
4. 底部阅读时间和 `Visit` 交互按钮。

如果文章没有封面，封面区域也可以展示文章内容摘要：

```vue
<span class="three-d-card__preview">
  <img v-if="item.cover" :src="item.cover" :alt="item.title" />
  <span v-else>{{ item.preview || item.excerpt }}</span>
</span>
```

底部按钮可以参考 Inspira UI 的 [Interactive Hover Button](https://inspira-ui.com/docs/cn/components/buttons/interactive-hover-button)，保持明确的访问动作：

```vue
<span class="three-d-card__footer">
  <span>{{ item.readingTime }}</span>
  <span class="three-d-card__visit">Visit</span>
</span>
```

按钮的核心是一个圆形背景在 hover 时展开：

```scss
.three-d-card__visit {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.three-d-card__visit::before {
  position: absolute;
  right: 9px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  content: "";
  background: #e5f3ff;
  z-index: -1;
  transition: width 220ms ease, height 220ms ease, right 220ms ease;
}

.three-d-card:hover .three-d-card__visit::before {
  right: 0;
  width: 100%;
  height: 100%;
}
```

3D 层次通过 `translateZ` 做出来：

```scss
.three-d-card strong {
  transform: translateZ(54px);
}

.three-d-card__preview {
  transform: translateZ(64px);
}

.three-d-card__footer {
  transform: translateZ(34px);
}
```

鼠标移动时，根据鼠标在卡片中的位置计算 `rotateX` 和 `rotateY`，再写入 CSS 变量。移动端和减少动效模式下关闭旋转。

## 文章详情页背景

文章详情页需要页面级背景，不能把背景写进每一篇 Markdown。更好的方式是做一个根组件 `PageParticleBackdrop.vue`，根据当前路由判断是否显示：

```vue
<template>
  <div v-if="visible" class="page-particle-backdrop" aria-hidden="true">
    <ParticleBackground track-window />
  </div>
</template>
```

判断文章详情页路由：

```js
const visible = computed(() => /^\/posts\/[^/]+\.html$/.test(route.path))
```

然后在 `client.js` 中作为根组件注册：

```js
import PageParticleBackdrop from './components/PageParticleBackdrop.vue'

export default defineClientConfig({
  rootComponents: [PageParticleBackdrop],
})
```

如果已经有其他根组件，继续追加即可：

```js
rootComponents: [FloatingArticleSearch, FluidCursor, PageParticleBackdrop]
```

为了让背景贯穿正文、顶部栏和左侧导航栏，可以只在文章详情页给主题容器设置透明背景，再把正文、导航栏和侧栏做成半透明层：

```scss
.article-particles-enabled body,
.article-particles-enabled .theme-container {
  background: transparent;
}

.article-particles-enabled .vp-navbar,
.article-particles-enabled .vp-sidebar {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(18px);
}

.article-particles-enabled .vp-page [vp-content]:not(.custom) {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(18px);
}
```

这里的关键点是不要全局覆盖所有页面，只在根组件检测到文章详情页时给 `html` 加上 `article-particles-enabled` 类。

## 3D 文章卡片

3D 卡片用 CSS `perspective` 和 `rotateX/rotateY` 实现：

- `pointermove` 时根据鼠标在卡片中的位置计算旋转角度。
- 用 CSS 变量把角度传给样式。
- 卡片内部的标题、摘要和底部信息使用 `translateZ` 拉开层次。
- 移动端和减少动效模式下关闭旋转。

这样可以接近 Inspira UI 3D Card 的交互效果，同时不需要额外依赖。

## 流体鼠标

流体鼠标作为 `rootComponents` 注册，页面加载后挂在全站根部：

- 只在 `pointer: fine` 的设备启用，手机和平板不会强行显示。
- 如果用户开启减少动效，则不启用。
- 鼠标移动时向数组中追加光点。
- 每一帧扩大半径并降低透明度，形成流体拖尾。
- 使用 `pointer-events: none`，不会挡住页面点击。

## 首页样式收口

为了不影响文章页，只对 `custom-home-page` 这个首页容器覆盖主题样式：

```scss
.custom-home-page .vp-breadcrumb,
.custom-home-page .vp-page-title,
.custom-home-page [vp-toc],
.custom-home-page .vp-page-meta,
.custom-home-page .vp-page-nav {
  display: none;
}

.custom-home-page [vp-content]:not(.custom) {
  max-width: none;
  padding-inline: 0;
}
```

这样首页可以全宽展示 Hero，而文章页仍然保留主题默认排版。

## 继续引入其他 Inspira UI 动效组件

后续引入其他 Inspira UI 组件时，可以按下面的流程走。

### 1. 确认组件类型

先判断组件属于哪一类：

- 背景类：通常放到局部 section 或根组件背景层，例如粒子背景、网格背景。
- 卡片类：通常作为内容组件使用，例如 3D Card。
- 鼠标/光标类：通常作为 `rootComponents` 注册。
- 文本/按钮动效：通常只在具体页面组件里局部引入。

### 2. 放到 `.vuepress/components`

把组件放在：

```text
docs/.vuepress/components/
```

如果组件只在首页使用，可以在 `HomeExperience.vue` 里局部导入：

```js
import DemoEffect from './DemoEffect.vue'
```

如果组件要在 Markdown 中直接使用，需要在 `client.js` 里注册：

```js
app.component('DemoEffect', DemoEffect)
```

如果组件要全站运行，比如鼠标效果或页面背景，需要放进 `rootComponents`：

```js
rootComponents: [DemoEffect]
```

### 3. 处理 SSR

VuePress 构建时会执行服务端渲染，所以组件里不能在顶层直接访问：

- `window`
- `document`
- `canvas`
- `localStorage`
- `matchMedia`

这些代码应该放到 `onMounted` 里：

```js
import { onMounted } from 'vue'

onMounted(() => {
  const width = window.innerWidth
})
```

### 4. 处理静态资源路径

在 Vue 组件里引用 `public` 下的资源时，用 `withBase`：

```js
import { withBase } from 'vuepress/client'

const image = withBase('/images/demo.png')
```

模板中使用：

```vue
<img :src="image" alt="" />
```

### 5. 控制作用范围

不要把动效样式直接写成全站覆盖。建议给页面或组件加专用类：

```md
---
containerClass: custom-home-page
---
```

然后只覆盖这个范围：

```scss
.custom-home-page .demo-effect {
  position: relative;
}
```

文章页这种按路由启用的效果，可以在根组件里给 `html` 加类：

```js
document.documentElement.classList.toggle('article-particles-enabled', visible)
```

### 6. 做动效降级

对动画、鼠标跟随、canvas、WebGL 类组件，建议加两类判断：

```js
const supportsFinePointer = window.matchMedia('(pointer: fine)').matches
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

移动端或减少动效模式下，可以减少粒子数量、停止鼠标跟随，或者直接不启用。

### 7. 验证构建

每次引入新组件后先跑：

```powershell
npm run docs:build
```

重点检查：

- 是否有 SSR 报错。
- 是否有静态资源路径解析失败。
- 是否影响文章页、分类页、标签页。
- 是否在移动端产生遮挡或文本溢出。

### 8. 再启动预览

构建通过后启动：

```powershell
npm run docs:dev
```

打开首页和至少一篇文章详情页，确认背景、卡片、鼠标动效都在正确页面出现。

## 构建检查

改完后运行：

```powershell
npm run docs:build
```

如果构建通过，再启动本地开发服务：

```powershell
npm run docs:dev
```

这次改造的关键点不是简单堆效果，而是先让首页脱离主题默认 Hero，再把交互组件作为普通 Vue 组件接入。局部效果放在页面组件里，全站或按路由启用的效果放在 `rootComponents` 里。这样后续继续引入 Inspira UI 其他动效组件时，也不会破坏 VuePress 原本的内容组织方式。

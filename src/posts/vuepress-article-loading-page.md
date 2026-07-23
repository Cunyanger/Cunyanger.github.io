---
title: VuePress 文章跳转加载页面
date: 2026-07-18
category: VuePress
tag:
  - VuePress
  - Inspira UI
  - 交互动效
isOriginal: true
excerpt: 用中间加载页承接文章跳转，并加入圆形进度条动画。
---

# VuePress 文章跳转加载页面

文章卡片直接跳转到详情页时，视觉上会比较突然。可以新增一个中间加载页，让用户先看到一段短暂的过渡动画，再进入文章详情。

这篇文章记录如何在 VuePress 中实现文章跳转加载页，并参考 Inspira UI 的 [Animated Circular Progressbar](https://inspira-ui.com/docs/cn/components/miscellaneous/animated-circular-progressbar) 做圆形进度条。

## 整体思路

流程如下：

1. 文章卡片不直接跳到文章页。
2. 先跳转到 `/loading/?to=目标文章路径`。
3. 加载页读取 `to` 参数。
4. 页面中央播放圆形进度条动画，同时预加载目标文章路由组件。
5. 目标文章准备好后，用 0.1 秒把进度补到 100%。
6. 进度到 100% 后通过 Vue Router 进入目标文章。

## 新增加载页

在 `docs/loading/README.md` 中创建一个普通页面：

```md
---
article: false
title: 加载中
navbar: false
sidebar: false
breadcrumb: false
toc: false
pageInfo: false
lastUpdated: false
contributors: false
containerClass: article-loading-container
---

<ArticleLoadingPage />
```

`article: false` 可以避免这个页面出现在文章列表里。

## 注册加载页组件

在 `docs/.vuepress/client.js` 中注册组件：

```js
import ArticleLoadingPage from './components/ArticleLoadingPage.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('ArticleLoadingPage', ArticleLoadingPage)
  },
})
```

如果项目已经有其他组件，保留原来的注册，只追加 `ArticleLoadingPage`。

## 圆形进度条组件

创建 `AnimatedCircularProgressbar.vue`，用 SVG 的 `stroke-dasharray` 和 `stroke-dashoffset` 控制进度：

```vue
<template>
  <div class="animated-progress" :style="{ '--progress': value }">
    <svg viewBox="0 0 120 120">
      <circle class="animated-progress__track" cx="60" cy="60" r="52" />
      <circle class="animated-progress__bar" cx="60" cy="60" r="52" />
    </svg>
    <span>{{ Math.round(value) }}%</span>
  </div>
</template>
```

核心样式：

```scss
.animated-progress__bar {
  stroke-dasharray: var(--circumference);
  stroke-dashoffset: calc(
    var(--circumference) - (var(--progress) / 100 * var(--circumference))
  );
  transition: stroke-dashoffset 120ms linear;
}
```

这样只要更新 `value`，圆形进度条就会自动推进。

## 加载页跳转逻辑

`ArticleLoadingPage.vue` 使用 `useRoute` 获取目标文章路径，使用 `useRouter` 完成跳转：

```js
const resolveTarget = () => {
  const rawTarget = Array.isArray(route.query.to) ? route.query.to[0] : route.query.to
  const target = typeof rawTarget === 'string' ? rawTarget : '/article/'

  return target.startsWith('/') && !target.startsWith('//') ? target : '/article/'
}
```

这里做了一个简单校验：只允许跳转到站内路径。如果 `to` 不合法，就回到 `/article/`。

加载页会先解析目标路由，并预加载目标路由对应的异步组件：

```js
const preloadTargetRoute = async (target) => {
  const resolved = router.resolve(target)
  const loaders = resolved.matched
    .flatMap(getRouteComponents)
    .filter((component) => typeof component === 'function')
    .map((loader) => loader())

  await Promise.all(loaders)
}
```

进度条分成两个阶段。目标路由还没准备好时，进度最多在 1.2 秒内走到 97%，不会直接到 100%：

```js
const animatePending = (timestamp) => {
  if (!startTime) startTime = timestamp
  if (isCompleting) return

  const elapsed = timestamp - startTime
  progress.value = Math.min(97, (elapsed / 1200) * 97)

  if (progress.value < 97) {
    animationFrame = window.requestAnimationFrame(animatePending)
  }
}
```

目标路由准备好后，再用 0.1 秒快速补到 100%，然后跳转：

```js
preloadTargetRoute(target).finally(() => {
  completeAndRedirect(target)
})
```

这样加载快时不需要强行等待完整 1.2 秒；加载慢时也不会出现进度条很早到 100% 但页面还没切换的情况。

## 改造文章卡片链接

文章卡片原本直接指向文章：

```vue
<a :href="item.link">
```

现在改成先进入加载页：

```js
const loadingLink = computed(() =>
  withBase(`/loading/?to=${encodeURIComponent(props.item.link)}`)
)
```

模板中使用：

```vue
<a :href="loadingLink">
```

这样点击卡片时，会先进入加载页，再由加载页跳转到文章详情。

## 隐藏默认页面元素

加载页不需要默认标题、面包屑、页脚等元素，可以用 `containerClass` 单独隐藏：

```scss
.article-loading-container .vp-breadcrumb,
.article-loading-container .vp-page-title,
.article-loading-container [vp-toc],
.article-loading-container .vp-page-meta,
.article-loading-container .vp-page-nav,
.article-loading-container [vp-footer] {
  display: none;
}
```

不要全局隐藏这些元素，否则会影响正常文章页。

## 构建验证

改完后运行：

```powershell
npm run docs:build
```

再访问：

```text
/loading/?to=/posts/vuepress-article-loading-page.html
```

如果进度条完成后能进入目标文章，说明加载页流程已经接通。

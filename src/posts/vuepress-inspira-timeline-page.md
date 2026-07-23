---
title: VuePress 时间线页面接入 Inspira UI Timeline
date: 2026-07-22
category: VuePress
tag:
  - VuePress
  - Inspira UI
  - 组件
  - 样式
isOriginal: true
excerpt: 拆解时间线页如何接入官方 Timeline 结构、如何按年份分组文章、以及如何把博客默认页面改成统一的首页视觉风格。
---

# VuePress 时间线页面接入 Inspira UI Timeline

这次时间线页不再沿用主题默认的 blog timeline 外观，而是改成和首页一致的一套背景、渐变标题和毛玻璃卡片语言。内容上继续用博客文章数据，视觉上换成更统一的页面。

相关文件：

```text
docs/.vuepress/components/ui/InspiraTimeline.vue
docs/.vuepress/components/pages/TimelineExperience.vue
docs/.vuepress/layouts/Blog.vue
```

## 官方 Timeline 的参数

官方 Timeline 组件主要有这些参数：

- `items`：时间线节点。
- `title`：标题。
- `description`：说明文字。
- `containerClass`：外层容器类名。
- `class`：组件自身类名。

官方版本还支持按 `item.id` 提供命名插槽。这个设计很适合把“年份”当成节点，把每一年的文章列表作为内容区。

## 数据怎么来的

博客时间线并不是手写数组，而是直接读主题提供的 `useTimeline()`。

它返回的 `config` 已经按年份分组好了，每组里包含：

- `year`
- `items`

每个 `item` 又包含：

- `date`
- `path`
- `info`

所以页面层只需要把它映射成组件需要的结构即可。

## 页面为什么要单独包一层

主题默认的 timeline 页面更偏信息索引页，和首页的视觉气质不一致。这里做了一层 `TimelineExperience.vue`，目的有两个：

1. 统一背景和标题样式。
2. 保留文章时间线本身的内容结构。

这样改的是外壳，不是数据。

## 布局如何切换

`docs/.vuepress/layouts/Blog.vue` 会检查当前 frontmatter：

```js
blog.type === "type" && blog.key === "timeline"
```

如果是 timeline 页，就直接渲染自定义页面；其他 blog 页面继续走主题原来的 `Blog` 布局。

这个分流比单独写一个新页面更稳，因为它不会碰坏文章页、分类页和标签页。

## Timeline 组件的实现思路

本地版本保留了官方的“中轴线 + 年份块 + 条目列表”结构，但把依赖 `motion-v` 的滚动动画换成了更轻的 scroll progress 计算。

核心逻辑是：

1. 先测量整条时间线的高度。
2. 监听页面滚动。
3. 用滚动位置算出进度值。
4. 用这个进度值控制中轴线高亮高度。

这样不依赖额外动画库，也能保留“读到哪里，线亮到哪里”的感觉。

## 样式统一点

时间线页和首页统一了这些视觉词汇：

- 同一套背景图。
- 同一套浅色和深色渐变。
- 同一套毛玻璃卡片边框和阴影。
- 同一套渐变标题。

所以用户从首页切到时间线，不会感觉像跳到另一个主题。

## 这套结构的优点

这次改造的重点不是单独做一个时间线列表，而是把它当成博客首页体系的一部分。

数据仍然来自博客，布局仍然来自主题，视觉则由本地组件统一收口。这样后面如果再加“最近更新”“收藏”“项目时间线”，可以直接复用这套结构。

## 官方来源

- [Inspira UI Timeline 文档](https://inspira-ui.com/docs/en/components/miscellaneous/timeline)
- [官方 Timeline 源码](https://github.com/unovue/inspira-ui/blob/main/app/components/inspira/ui/timeline/Timeline.vue)


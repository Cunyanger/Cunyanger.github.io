---
title: VuePress 首页文章卡片移动端兼容完整教程
date: 2026-07-21
category: VuePress
tag:
  - VuePress
  - 移动端
  - 响应式
  - 布局
  - 组件
isOriginal: true
excerpt: 以首页文章卡片列表为例，详细讲解如何做移动端兼容：响应式网格、动态分页、卡片等高、侧栏排序、媒体查询断点和常见问题排查。
---

# VuePress 首页文章卡片移动端兼容完整教程

这篇文章用首页文章列表作为例子，记录一次完整的移动端兼容改造。

目标效果：

- 桌面端一行 3 张文章卡片，一页显示 3 行，也就是 9 篇文章。
- 中等窗口一行 2 张文章卡片，一页显示 3 行，也就是 6 篇文章。
- 移动端一行 1 张文章卡片，一页显示 3 行，也就是 3 篇文章。
- 窗口变窄时，博主信息面板从右侧栏移动到文章列表上方。
- 卡片标题、摘要和预览文字做行数限制，超出部分用省略号。
- 不同文章卡片高度保持一致。

相关文件：

```text
docs/.vuepress/components/pages/HomeExperience.vue
docs/.vuepress/components/ui/ThreeDCard.vue
```

## 第一步：先明确移动端兼容不是只写一个 media query

移动端兼容通常包含四层问题：

1. 内容数量：一页展示多少内容。
2. 布局结构：一行几列，侧栏放哪里。
3. 组件尺寸：卡片高度、图片比例、按钮尺寸是否稳定。
4. 文本溢出：标题、摘要、按钮文字是否会撑破布局。

这次改造同时处理这四层。

如果只写：

```css
@media (max-width: 719px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
```

视觉上确实变成了一列，但分页仍然可能一次加载 9 篇文章。移动端一页就会变成 9 行，用户滚动成本很高。这就是为什么分页逻辑也要响应窗口变化。

## 第二步：确定断点

当前首页使用三个卡片布局断点：

```text
>= 1360px：3 列
720px - 1359px：2 列
< 720px：1 列
```

这个断点不是随便定的。

3D 卡片有透视、阴影、毛玻璃和 hover 效果，卡片太窄会显得拥挤。保守做法是：

- 桌面宽屏给 3 列。
- 平板和窄桌面给 2 列。
- 手机给 1 列。

断点可以根据实际卡片复杂度调整。卡片越复杂，越应该少列。

## 第三步：把“一页显示 3 行”转成数据规则

用户看到的是“3 行”，代码里要算的是“每页多少篇文章”。

公式是：

```text
每页文章数 = 当前列数 * 3
```

所以：

```text
3 列：3 * 3 = 9
2 列：2 * 3 = 6
1 列：1 * 3 = 3
```

在 Vue 组件中添加当前列数：

```js
const articleColumns = ref(3);
const pageRows = 3;
const pageSize = computed(() => articleColumns.value * pageRows);
```

这样 `pageSize` 不再是固定数字，而是跟随窗口宽度变化。

## 第四步：监听窗口宽度

首页组件里用 `window.innerWidth` 判断当前列数：

```js
const syncArticleColumns = () => {
  if (window.innerWidth < 720) {
    articleColumns.value = 1;
    return;
  }

  if (window.innerWidth < 1360) {
    articleColumns.value = 2;
    return;
  }

  articleColumns.value = 3;
};
```

因为 VuePress 会做构建和服务端渲染，不能在组件顶层直接访问 `window`。所以监听逻辑放在 `onMounted()` 里：

```js
onMounted(() => {
  syncArticleColumns();
  window.addEventListener("resize", syncArticleColumns);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncArticleColumns);
});
```

这里有两个移动端兼容知识点：

1. `window` 只在浏览器存在，SSR 构建阶段不存在。
2. 监听事件要在组件卸载时移除，避免重复监听和内存泄漏。

## 第五步：让分页使用动态 pageSize

原来分页可能是固定的：

```js
const pageSize = 6;
```

改成动态后，分页要使用 `.value`：

```js
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;

  return posts.value.slice(start, start + pageSize.value);
});
```

总页数也要跟随变化：

```js
const totalPages = computed(() =>
  Math.ceil(posts.value.length / pageSize.value),
);
```

## 第六步：窗口变化时修正当前页

假设桌面端一页 9 篇，总共 18 篇时有 2 页。

如果切到移动端一页 3 篇，就会变成 6 页。

反过来，如果用户在移动端第 6 页，然后把窗口放大回桌面端，总页数变成 2 页，此时 `currentPage = 6` 就越界了。

需要监听 `totalPages`，把当前页夹回合法范围：

```js
watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = Math.max(1, pages);
  }
});
```

这一步是响应式分页里很容易漏掉的细节。

## 第七步：用 CSS Grid 做卡片列数

桌面默认 3 列：

```css
.custom-home__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
```

`minmax(0, 1fr)` 比直接写 `1fr` 更稳。

原因是：卡片内部有长标题、摘要、图片和按钮。`minmax(0, 1fr)` 允许网格列在空间不足时真正收缩，避免长内容把列撑破。

## 第八步：中等窗口改成 2 列

在 720px 到 1359px 之间，卡片列表改成 2 列：

```css
@media (min-width: 720px) and (max-width: 959px) {
  .custom-home__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 960px) and (max-width: 1199px) {
  .custom-home__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) and (max-width: 1359px) {
  .custom-home__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

可以合并成一个断点，但分开写有一个好处：每个宽度段可以单独控制侧栏、容器宽度和卡片列数。

## 第九步：移动端改成 1 列

手机宽度下：

```css
@media (max-width: 719px) {
  .custom-home__cards {
    grid-template-columns: 1fr;
  }
}
```

移动端一列的好处是：

- 标题不用挤。
- 摘要可读性更好。
- 触摸点击区域更稳定。
- 3D hover 效果在无 hover 设备上不会造成布局压力。

## 第十步：侧栏在窄屏移动到文章列表上方

桌面端布局是：

```text
文章列表 | 博主信息面板
```

窄屏下如果仍然保持两列，文章卡片会太窄。因此整体改成一列：

```css
@media (max-width: 1199px) {
  .custom-home__content {
    grid-template-columns: 1fr;
  }
}
```

然后把博主面板排到文章列表上方：

```css
@media (max-width: 1199px) {
  .blogger-panel {
    position: relative;
    order: -1;
    top: auto;
  }
}
```

这里用到了 CSS Grid/Flex 都支持的 `order`。

默认 DOM 顺序是：

```text
文章列表
博主信息面板
```

设置 `order: -1` 后，视觉顺序变成：

```text
博主信息面板
文章列表
```

注意：`order` 只改变视觉排序，不改变 DOM 顺序。如果页面对无障碍阅读顺序要求很高，可以考虑在模板中调整 DOM 顺序，或者在移动端使用更明确的结构。

## 第十一步：为什么要取消 sticky

桌面端博主面板是 sticky：

```css
.blogger-panel {
  position: sticky;
  top: calc(var(--navbar-height, 3.6rem) + 18px);
}
```

移动端如果继续 sticky，会有几个问题：

1. 面板可能占据太多屏幕高度。
2. 用户滚动文章时面板一直挂在上方，干扰阅读。
3. 翻转卡片在小屏里 sticky 时更容易遮挡内容。

所以窄屏下改成普通流：

```css
.blogger-panel {
  position: relative;
  top: auto;
}
```

## 第十二步：卡片等高的核心是限制文字行数

文章标题和摘要长度不一致，是卡片高度不一致的主要原因。

标题最多 2 行：

```css
.three-d-card strong {
  display: -webkit-box;
  min-height: calc(1.28em * 2);
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
```

摘要最多 3 行：

```css
.three-d-card__excerpt {
  display: -webkit-box;
  min-height: calc(1.7em * 3);
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
```

这里同时用了两件事：

1. `-webkit-line-clamp` 控制最多显示几行。
2. `min-height` 给短内容也保留同样高度。

只写省略号是不够的。短内容如果不占位，卡片高度仍然不一致。

## 第十三步：预览区也要固定高度

有封面图时，图片高度固定：

```css
.three-d-card__preview img {
  height: 176px;
}
```

没有封面图时，预览文字也可能撑高卡片。所以预览容器本身要固定高度：

```css
.three-d-card__preview {
  height: 176px;
  min-height: 176px;
}
```

预览文字最多 4 行：

```css
.three-d-card__preview span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}
```

这样无论有没有封面，预览区域都保持稳定。

## 第十四步：移动端字体和按钮不要用视口缩放

移动端常见错误是：

```css
font-size: 4vw;
```

这会让文字随窗口宽度连续变化，容易出现某些宽度下突然过大或过小。

更稳的方式是给明确断点：

```css
@media (max-width: 719px) {
  .custom-home h1 {
    font-size: 3.6rem;
  }
}
```

卡片内部标题可以用有限范围的 `clamp()`：

```css
font-size: clamp(1.22rem, 2vw, 1.48rem);
```

`clamp()` 有最小值和最大值，比裸 `vw` 稳定。

## 第十五步：移动端 hover 效果要降级

3D 卡片依赖 hover 和 pointer move。移动设备上没有稳定 hover，所以需要降级：

```css
@media (hover: none), (prefers-reduced-motion: reduce) {
  .three-d-card__body {
    transform: none;
  }

  .three-d-card__meta,
  .three-d-card__footer,
  .three-d-card strong,
  .three-d-card__excerpt,
  .three-d-card__preview,
  .three-d-card__preview img,
  .three-d-card__preview span {
    transition: none;
  }
}
```

这体现了一个移动端兼容原则：

```text
触摸设备优先保证稳定和可读，不强求桌面 hover 动效完整复刻。
```

## 第十六步：当前实现的完整断点策略

最终策略可以总结为：

```text
>= 1360px
  内容区：文章列表 + 右侧博主面板
  卡片：3 列
  每页：9 篇

1200px - 1359px
  内容区：文章列表 + 右侧博主面板
  卡片：2 列
  每页：6 篇

960px - 1199px
  内容区：博主面板在上，文章列表在下
  卡片：2 列
  每页：6 篇

720px - 959px
  内容区：博主面板在上，文章列表在下
  卡片：2 列
  每页：6 篇

< 720px
  内容区：博主面板在上，文章列表在下
  卡片：1 列
  每页：3 篇
```

这比单纯的“手机一列”更完整，因为分页数量也跟着变了。

## 第十七步：验证方式

构建验证：

```bash
npm.cmd run docs:build
```

浏览器验证：

1. 宽屏下是否一行 3 张卡片。
2. 宽屏下每页是否显示 9 篇文章。
3. 缩小到 1200px - 1359px 是否变成 2 列。
4. 2 列时每页是否显示 6 篇文章。
5. 缩小到 1199px 以下时博主信息面板是否在文章列表上方。
6. 缩小到手机宽度时是否变成 1 列。
7. 1 列时每页是否显示 3 篇文章。
8. 标题、摘要、预览文字是否超出省略。
9. 不同卡片高度是否一致。
10. 分页切换后布局是否仍然稳定。

## 常见问题

### 只改 CSS，分页数量没变

这是最常见问题。

视觉上一列了，但数据仍然一次渲染 9 篇，移动端就会变成 9 行。

解决方式是让 `pageSize` 跟列数联动：

```js
const pageSize = computed(() => articleColumns.value * 3);
```

### 缩放窗口后当前页为空

原因是当前页超过新总页数。

解决方式：

```js
watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = Math.max(1, pages);
  }
});
```

### 卡片高度仍然不一致

检查是否只设置了 `line-clamp`，但没有设置 `min-height`。

短文本也要占同样高度：

```css
min-height: calc(1.7em * 3);
```

### 博主面板没有移动到上方

检查父容器是不是 grid 或 flex，`order` 只对 grid/flex item 有效。

当前父容器：

```css
.custom-home__content {
  display: grid;
}
```

所以子元素可以使用：

```css
.blogger-panel {
  order: -1;
}
```

### 横向出现滚动条

移动端出现横向滚动通常来自：

- 固定宽度卡片。
- 图片没有 `max-width: 100%`。
- grid 子项没有 `minmax(0, 1fr)`。
- 容器用了 `100vw` 后又加 padding。

当前文章卡片网格使用：

```css
grid-template-columns: repeat(2, minmax(0, 1fr));
```

可以减少内容撑破列宽的问题。

## 移动端兼容的一般原则

通过这个例子，可以总结出几条通用原则：

1. 布局断点要和内容复杂度匹配，不是所有卡片都适合手机两列。
2. CSS 响应式只解决视觉列数，数据分页也要同步响应。
3. 侧栏在移动端通常应该移动到主内容上方或下方。
4. sticky 侧栏在移动端经常要取消。
5. 标题、摘要、按钮文字必须处理溢出。
6. 等高卡片不能只靠 `min-height`，还要限制文本行数。
7. hover 动效在触摸设备上要降级。
8. resize 后要处理状态越界，比如分页页码。
9. 使用 `minmax(0, 1fr)` 可以减少 grid 内容撑破。
10. 每次改移动端兼容，都要同时检查桌面、平板、手机三个范围。

## 完整改造流程总结

这次首页移动端兼容流程可以按下面顺序复用：

1. 先定断点：3 列、2 列、1 列。
2. 把“每页 3 行”换算成动态 `pageSize`。
3. 监听窗口宽度，更新当前列数。
4. 分页计算使用动态 `pageSize.value`。
5. 监听总页数变化，修正越界页码。
6. CSS Grid 默认写 3 列。
7. 中等窗口改 2 列。
8. 手机窗口改 1 列。
9. 窄屏下主内容改一列布局。
10. 博主面板用 `order: -1` 移到文章列表上方。
11. 窄屏取消博主面板 sticky。
12. 限制标题、摘要、预览文字行数。
13. 固定预览区高度。
14. 为触摸设备降级 hover 动效。
15. 构建并用不同窗口宽度逐项验证。

按照这套流程，其他 Vue 或 VuePress 项目也可以把“桌面多列 + 移动单列 + 动态分页 + 侧栏重排”稳定地接起来。

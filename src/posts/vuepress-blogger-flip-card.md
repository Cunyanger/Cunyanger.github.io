---
title: VuePress 博主信息翻转卡片实现详解
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - 组件
  - 交互动效
  - 样式
isOriginal: true
excerpt: 拆解首页博主信息翻转卡片的结构、状态控制、3D 翻转、毛玻璃面板和键盘交互实现。
---

# VuePress 博主信息翻转卡片实现详解

首页右侧的博主信息区域是一个 3D 翻转卡片。正面展示博主简介，背面展示文章统计、标签分类和快捷入口。

当前代码位置：

```text
docs/.vuepress/components/pages/HomeExperience.vue
```

这个效果通常可以叫：

```text
Flip Card
```

如果强调 3D 旋转，也可以叫：

```text
3D Flip Card
```

## 第一步：用状态控制是否翻转

组件里先定义一个响应式状态：

```js
const isProfileFlipped = ref(false)
```

这个状态只有两种值：

- `false`：显示正面。
- `true`：显示背面。

模板里通过 class 绑定状态：

```vue
<aside
  class="blogger-panel"
  :class="{ 'is-flipped': isProfileFlipped }"
>
```

当 `isProfileFlipped` 为 `true` 时，外层会多一个 `is-flipped` 类。CSS 根据这个类触发 `rotateY(180deg)`，完成翻转。

## 第二步：绑定鼠标和键盘交互

当前外层面板写法如下：

```vue
<aside
  class="blogger-panel"
  :class="{ 'is-flipped': isProfileFlipped }"
  aria-label="博主信息"
  tabindex="0"
  @click="isProfileFlipped = !isProfileFlipped"
  @keydown.enter.prevent="isProfileFlipped = !isProfileFlipped"
>
```

这里处理了两类交互。

点击面板时：

```vue
@click="isProfileFlipped = !isProfileFlipped"
```

每次点击都会在正面和背面之间切换。

键盘按 Enter 时：

```vue
@keydown.enter.prevent="isProfileFlipped = !isProfileFlipped"
```

这样键盘用户也可以操作翻转卡片。

`tabindex="0"` 很关键。`aside` 默认不能被键盘聚焦，添加 `tabindex="0"` 后，它才能通过 Tab 键获得焦点。

## 第三步：搭建三层 DOM 结构

翻转卡片需要三层结构：

```vue
<aside class="blogger-panel">
  <div class="blogger-panel__inner">
    <section class="blogger-panel__face blogger-panel__face--front">
      正面内容
    </section>

    <section class="blogger-panel__face blogger-panel__face--back">
      背面内容
    </section>
  </div>
</aside>
```

三层结构分别负责不同事情：

- `.blogger-panel`：外层容器，负责定位、尺寸和透视空间。
- `.blogger-panel__inner`：真正执行 3D 旋转的元素。
- `.blogger-panel__face`：正反两面，负责展示内容。

不要直接旋转正面或背面。更稳定的方式是旋转中间层 `.blogger-panel__inner`，让正反两面作为它的子元素一起运动。

## 第四步：让外层成为固定侧栏卡片

```css
.blogger-panel {
  position: sticky;
  top: calc(var(--navbar-height, 3.6rem) + 18px);
  z-index: 1;
  min-height: 520px;
  perspective: 1200px;
  outline: none;
}
```

这段样式有两个重点。

`position: sticky` 让博主信息卡片在文章列表右侧保持吸附。用户向下滚动文章卡片时，右侧面板不会立刻离开视口。

`perspective: 1200px` 给子元素提供 3D 透视空间。没有 `perspective`，`rotateY(180deg)` 仍然会旋转，但缺少真实的空间透视感。

## 第五步：让中间层支持 3D 翻转

```css
.blogger-panel__inner {
  position: relative;
  min-height: 520px;
  transform-style: preserve-3d;
  transition: transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

`transform-style: preserve-3d` 是 3D 翻转的关键。它告诉浏览器：子元素应该保留自己的 3D 位置，而不是被压平成一个平面。

`transition` 控制翻转动画的速度和手感。当前使用：

```css
cubic-bezier(0.22, 1, 0.36, 1)
```

这个曲线会让动画开始较快、结束更柔和，比普通 `ease` 更像卡片翻过去后自然停住。

## 第六步：触发翻转

```css
.blogger-panel:hover .blogger-panel__inner,
.blogger-panel:focus-within .blogger-panel__inner,
.blogger-panel.is-flipped .blogger-panel__inner {
  transform: rotateY(180deg);
}
```

这段代码支持三种触发方式：

- 鼠标悬停：`.blogger-panel:hover`
- 内部元素获得焦点：`.blogger-panel:focus-within`
- 点击后添加状态类：`.blogger-panel.is-flipped`

其中 `is-flipped` 是最稳定的交互状态。鼠标 hover 离开后会恢复，但点击状态可以保留，适合移动端和键盘场景。

## 第七步：设置正反两面

正反两面共用基础样式：

```css
.blogger-panel__face {
  position: absolute;
  inset: 0;
  display: grid;
  justify-items: center;
  align-content: center;
  border-radius: 8px;
  padding: 28px 22px;
  text-align: center;
  overflow: hidden;
  backface-visibility: hidden;
}
```

`position: absolute` 和 `inset: 0` 让正反两面重叠在同一个位置。

`backface-visibility: hidden` 用来隐藏元素背面。否则卡片翻转到背面时，正面内容可能会反着显示出来。

背面需要先旋转 180 度：

```css
.blogger-panel__face--back {
  align-content: start;
  transform: rotateY(180deg);
}
```

这样当中间层 `.blogger-panel__inner` 再整体旋转 180 度时，背面就会刚好转到用户面前。

## 第八步：正面内容

正面主要展示博主身份：

```vue
<section class="blogger-panel__face blogger-panel__face--front" aria-label="博主介绍">
  <img class="blogger-panel__avatar" :src="logoSrc" alt="My Space" />
  <p class="blogger-panel__level">LV.01</p>
  <h2>My Space</h2>
  <p class="blogger-panel__bio">技术实践、写作工作流和长期笔记。</p>
  <p class="blogger-panel__motto">把日常问题写清楚，把可复用经验留下来。</p>
</section>
```

这部分内容比较少，所以 `.blogger-panel__face` 默认使用：

```css
align-content: center;
```

让头像、名称和简介整体居中。

## 第九步：背面内容

背面展示文章索引能力：

```vue
<section class="blogger-panel__face blogger-panel__face--back" aria-label="文章标签分类与关于入口" @click.stop>
  <p class="blogger-panel__level">Archive</p>
  <h2>文章索引</h2>

  <div class="blogger-panel__stats" aria-label="站点统计">
    <a href="/article/"><strong>{{ articleCount }}</strong><span>文章</span></a>
    <a href="/tag/"><strong>8</strong><span>标签</span></a>
    <a href="/category/"><strong>3</strong><span>分类</span></a>
  </div>

  <div class="blogger-panel__actions" aria-label="快捷入口">
    <a class="panel-button" href="/timeline/">时间轴</a>
    <a class="rainbow-button rainbow-button--small" href="/about/">关于</a>
  </div>
</section>
```

背面有链接，所以加了：

```vue
@click.stop
```

它的作用是阻止点击背面内部链接区域时继续冒泡到外层 `aside`。否则用户点击链接时，外层也会收到点击事件，卡片可能先翻回去，交互会变得不稳定。

## 第十步：实现毛玻璃面板

当前面板已经改成半透明毛玻璃：

```css
.blogger-panel__face {
  border: 1px solid rgba(255, 255, 255, 0.42);
  color: #0f172a;
  background: rgba(255, 255, 255, 0.66);
  box-shadow:
    0 24px 58px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
}
```

毛玻璃效果由三部分组成：

- 半透明背景：`rgba(255, 255, 255, 0.66)`
- 背景模糊：`backdrop-filter: blur(22px)`
- 内侧高光：`inset 0 1px 0 rgba(...)`

`-webkit-backdrop-filter` 是为了兼容 Safari 和部分 WebKit 浏览器。

## 第十一步：兼容黑夜模式

黑夜模式通过主题选择器覆盖面板颜色：

```css
[data-theme="dark"] .blogger-panel__face {
  border-color: rgba(148, 163, 184, 0.22);
  color: #e5f3ff;
  background: rgba(15, 23, 42, 0.56);
  box-shadow:
    0 24px 58px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

白天模式用浅色玻璃和深色文字，黑夜模式用深色玻璃和浅色文字。这样切换主题时，面板仍然保持可读性。

## 第十二步：去掉网格背景

之前面板使用过网格纹理，现在已经关闭：

```css
.blogger-panel__face::before {
  display: none;
}
```

如果要做纯净的毛玻璃效果，就不要再叠加网格、噪点或复杂纹理。毛玻璃本身依赖背景透出和模糊，额外纹理会削弱透明感。

## 第十三步：移动端布局

桌面端右侧面板是 sticky：

```css
.blogger-panel {
  position: sticky;
}
```

移动端和中等屏幕会取消 sticky：

```css
@media (max-width: 719px) {
  .blogger-panel {
    position: relative;
    top: auto;
  }
}
```

这样小屏幕上文章列表和博主面板会自然上下排列，不会出现右侧栏挤压内容的问题。

## 完整实现流程

这个翻转卡片可以按下面顺序理解：

1. 用 `isProfileFlipped` 记录当前是否翻到背面。
2. 外层 `aside` 绑定点击和 Enter 键事件。
3. 外层 `.blogger-panel` 提供尺寸、sticky 定位和 `perspective`。
4. 中间层 `.blogger-panel__inner` 负责真正旋转。
5. 正反两面绝对定位并重叠。
6. 正面正常显示，背面预先 `rotateY(180deg)`。
7. 外层 hover、focus 或 `is-flipped` 时，让中间层 `rotateY(180deg)`。
8. 用 `backface-visibility: hidden` 隐藏背面穿帮。
9. 用半透明背景、模糊和内高光做毛玻璃质感。
10. 用 `[data-theme="dark"]` 覆盖黑夜模式颜色。

这类 3D 翻转卡片适合少量信息的正反面切换，例如个人资料、文章索引、产品参数、快捷入口等。内容过多时不适合放进翻转卡片，因为用户需要先触发交互才能看到背面信息。

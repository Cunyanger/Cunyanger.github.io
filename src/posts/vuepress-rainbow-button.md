---
title: VuePress 彩虹按钮实现和明暗模式兼容
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - Inspira UI
  - 组件
  - 样式
isOriginal: true
excerpt: 从结构、薄彩虹边框、底部光晕和明暗模式变量四个部分拆解 Rainbow Button 的实现。
---

# VuePress 彩虹按钮实现和明暗模式兼容

首页博主卡片背面有一个 `关于` 按钮，样式参考 Rainbow Button：按钮本体保持干净，彩虹色主要出现在底部和两侧下半段，边框较薄，并带一点柔和光晕。

当前代码写在：

```text
docs/.vuepress/components/pages/HomeExperience.vue
```

## 第一步：准备按钮结构

模板里按钮本质上是一个普通链接：

```vue
<a class="rainbow-button rainbow-button--small" href="/about/">关于</a>
```

这里用了两个类：

- `rainbow-button`：负责主要视觉效果。
- `rainbow-button--small`：负责小尺寸按钮的宽度和字号。

这样写的好处是按钮可以先作为普通链接工作，再通过 CSS 增强视觉效果。

## 第二步：用 CSS 变量管理主题颜色

按钮先定义白天模式的默认变量：

```css
.rainbow-button {
  --rainbow-button-bg: #ffffff;
  --rainbow-button-fg: #020617;
  --rainbow-button-cover: rgba(255, 255, 255, 0.98);
  --rainbow-button-cover-clear: rgba(255, 255, 255, 0);
  --rainbow-button-glow: rgba(125, 211, 252, 0.42);
  --rainbow-button-shadow: rgba(15, 23, 42, 0.14);
}
```

这些变量分别控制：

- `--rainbow-button-bg`：按钮内部底色。
- `--rainbow-button-fg`：按钮文字颜色。
- `--rainbow-button-cover`：遮住上半部分彩虹边框的颜色。
- `--rainbow-button-cover-clear`：遮罩渐隐到透明后的颜色。
- `--rainbow-button-glow`：光晕颜色。
- `--rainbow-button-shadow`：普通阴影颜色。

先把颜色抽成变量，后面兼容黑夜模式时只需要覆盖变量，不需要重写整段按钮样式。

## 第三步：建立按钮基础盒子

```css
.rainbow-button {
  position: relative;
  display: inline-grid;
  place-items: center;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0 13px;
  color: var(--rainbow-button-fg);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  overflow: visible;
  isolation: isolate;
}
```

关键点有三个。

第一，`border: 1px solid transparent` 预留一圈真实边框空间。彩虹不是画在伪元素里的，而是通过多层背景显示在这圈透明边框上。

第二，`overflow: visible` 允许底部光晕溢出按钮盒子。如果这里写成 `hidden`，光晕会被按钮自身裁掉。

第三，`isolation: isolate` 让按钮和伪元素形成独立层级，避免光晕跑到其他元素层级里。

## 第四步：用三层背景做薄彩虹边框

核心效果来自 `background` 的三层渐变：

```css
.rainbow-button {
  background:
    linear-gradient(var(--rainbow-button-bg), var(--rainbow-button-bg)) padding-box,
    linear-gradient(
      180deg,
      var(--rainbow-button-cover) 0%,
      var(--rainbow-button-cover) 58%,
      var(--rainbow-button-cover-clear) 100%
    ) border-box,
    linear-gradient(90deg, #ffbe7b, #7dd3fc, #c084fc, #fb7185, #ffbe7b) border-box;
  background-origin: border-box;
  background-clip: padding-box, border-box, border-box;
  background-size: 200% auto;
}
```

三层背景从上到下分别是：

1. 第一层：按钮内部底色，裁剪在 `padding-box`，不会覆盖边框。
2. 第二层：竖向遮罩，盖住上半部分边框，越往下越透明。
3. 第三层：真正的彩虹渐变，铺在 `border-box`。

第二层是实现“只有下方和侧面一般有彩虹效果”的关键。它在顶部使用接近按钮底色的遮罩，把顶部彩虹边框压住；到按钮底部逐渐透明，让下方和侧边下半段的彩虹露出来。

`background-clip: padding-box, border-box, border-box` 用来明确每一层背景的裁剪区域，避免浏览器把内部底色也画到边框上。

## 第五步：让彩虹缓慢流动

按钮本体和光晕都使用同一个动画：

```css
.rainbow-button {
  animation: rainbow-button-shift 2s linear infinite;
}

@keyframes rainbow-button-shift {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 200% 50%;
  }
}
```

因为彩虹渐变设置了 `background-size: 200% auto`，所以移动 `background-position` 时，会看到彩虹颜色沿横向流动。

## 第六步：用伪元素做底部光晕

按钮底部的光晕通过 `::before` 实现：

```css
.rainbow-button::before {
  position: absolute;
  right: 10%;
  bottom: -5px;
  left: 10%;
  z-index: -1;
  height: 10px;
  border-radius: 999px;
  content: "";
  opacity: 0.72;
  background: linear-gradient(90deg, #ffbe7b, #7dd3fc, #c084fc, #fb7185, #ffbe7b);
  background-size: 200% auto;
  filter: blur(10px);
  pointer-events: none;
  animation: rainbow-button-shift 2s linear infinite;
}
```

这里没有把光晕铺满整个按钮，而是只放在下方：

- `left` 和 `right` 都是 `10%`，让光晕比按钮略窄。
- `bottom: -5px` 让光晕从按钮底部外侧透出来。
- `filter: blur(10px)` 把硬边缘变成柔光。
- `z-index: -1` 把光晕放到按钮背后。

这样视觉上更接近“底部有一圈发光的彩虹边缘”，不会变成整块高饱和背景。

## 第七步：处理 hover 和 focus

```css
.rainbow-button:hover,
.rainbow-button:focus-visible {
  transform: translateY(-1px);
  box-shadow:
    0 0 22px var(--rainbow-button-glow),
    0 8px 20px var(--rainbow-button-shadow);
}

.rainbow-button:hover::before,
.rainbow-button:focus-visible::before {
  opacity: 0.92;
}
```

悬停和键盘聚焦时，按钮轻微上移，外部光晕增强。这里同时写 `focus-visible`，是为了让键盘用户也能获得明确的焦点反馈。

## 第八步：兼容黑夜模式

黑夜模式只覆盖变量：

```css
[data-theme="dark"] .rainbow-button {
  --rainbow-button-bg: #020617;
  --rainbow-button-fg: #f8fafc;
  --rainbow-button-cover: rgba(2, 6, 23, 0.98);
  --rainbow-button-cover-clear: rgba(2, 6, 23, 0);
  --rainbow-button-glow: rgba(34, 211, 238, 0.5);
  --rainbow-button-shadow: rgba(34, 211, 238, 0.16);
}
```

这样同一套按钮结构可以在两个主题下复用：

- 白天模式：白色按钮底、深色文字、较轻的蓝色光晕。
- 黑夜模式：深色按钮底、浅色文字、更明显的青色光晕。

需要注意的是，第二层遮罩必须跟随按钮底色变化。白天模式用白色遮罩盖住顶部彩虹；黑夜模式用深色遮罩盖住顶部彩虹。否则黑夜模式下会看到一圈不该出现的亮边。

## 第九步：小尺寸变体

当前按钮在博主面板里使用小尺寸：

```css
.rainbow-button--small {
  min-width: 64px;
  font-size: 0.86rem;
  text-decoration: none;
}
```

这个变体只控制尺寸，不改变视觉机制。以后如果要做大按钮，可以新增：

```css
.rainbow-button--large {
  min-width: 112px;
  min-height: 42px;
  padding: 0 18px;
  font-size: 0.95rem;
}
```

## 完整流程

这个按钮的效果可以按下面顺序理解：

1. 用透明 `1px` 边框预留彩虹显示区域。
2. 用第一层背景填充按钮内部。
3. 用第三层背景铺满彩虹边框。
4. 用第二层竖向遮罩盖住上半部分彩虹，只露出下方和侧边。
5. 用 `::before` 在底部放一条模糊彩虹光晕。
6. 用 `background-position` 动画让彩虹横向流动。
7. 用 CSS 变量覆盖白天和黑夜模式的底色、文字、遮罩和光晕。

这种写法的优势是 HTML 很干净，主题兼容也集中在变量层。后续如果要抽成真正的 `RainbowButton.vue` 组件，只需要保留 `<slot />` 和这套 class 样式即可。

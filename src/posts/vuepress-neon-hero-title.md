---
title: VuePress Hero 霓虹渐变标题实现详解
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - 交互动效
  - 样式
isOriginal: true
excerpt: 拆解首页 Hero 标题的 Neon Glow Text 和 Animated Gradient Text 效果，包括渐变文字、发光阴影、动画和裁剪问题处理。
---

# VuePress Hero 霓虹渐变标题实现详解

首页 Hero 里的 `My Space` 标题使用的是一种常见的霓虹灯文字效果，英文通常叫：

- `Neon Text`
- `Neon Glow Text`
- `Glowing Text`

当前实现还叠加了流动渐变，所以更准确地说是：

```text
Animated Gradient Neon Text
```

也就是“带动画渐变的霓虹发光文字”。

当前代码位置：

```text
docs/.vuepress/components/pages/HomeExperience.vue
```

## 第一步：准备标题结构

模板里只需要一个普通标题：

```vue
<h1 id="home-title">My Space</h1>
```

不要为了视觉效果拆成多个字母或多个 `span`。当前效果主要靠 CSS 完成，这样结构更干净，也能保留标题本身的语义。

## 第二步：建立标题盒子

```css
.custom-home h1 {
  display: inline-block;
  max-width: 900px;
  margin: 14px 0 0;
  padding: 0 0.04em 0.18em;
  overflow: visible;
  font-size: 6.6rem;
  font-weight: 900;
  line-height: 1.22;
  letter-spacing: 0;
}
```

这一步主要解决排版和裁剪问题。

- `display: inline-block`：让标题形成独立绘制盒，方便渐变背景和 padding 生效。
- `padding-bottom: 0.18em`：给字母下沿、发光阴影和字体 descender 留空间。
- `overflow: visible`：避免文字阴影被标题盒子裁掉。
- `line-height: 1.22`：比默认更稳定，避免大字号标题底部显示不全。
- `letter-spacing: 0`：避免超大标题因为负字距产生不可控挤压。

如果标题底部像被切掉，通常就是 `line-height` 太小、父级 `overflow: hidden` 或渐变文字绘制盒太紧导致的。

## 第三步：把文字变成渐变色

核心写法是先给标题设置背景渐变，再把背景裁剪到文字形状里：

```css
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
  -webkit-text-fill-color: transparent;
}
```

这里有几个关键点。

`color: transparent` 让原本的文字颜色透明，否则会盖住背景渐变。

`background-clip: text` 把背景裁剪成文字形状，渐变只显示在字形内部。

`-webkit-background-clip: text` 和 `-webkit-text-fill-color: transparent` 是为了兼容 Chrome、Edge、Safari 等 WebKit/Blink 浏览器。

`background-size: 200% 100%` 让背景宽度变成文字区域的两倍。后面移动背景位置时，渐变才有足够空间流动。

## 第四步：设置霓虹发光

霓虹感主要由多层 `text-shadow` 做出来：

```css
.custom-home h1 {
  text-shadow:
    0 0 14px rgba(34, 211, 238, 0.5),
    0 0 28px rgba(167, 139, 250, 0.42),
    0 0 54px rgba(251, 113, 133, 0.35);
}
```

每一层阴影的作用不同：

- 第一层半径小，贴近文字边缘，制造亮边。
- 第二层半径中等，让发光向外扩散。
- 第三层半径最大，制造远距离的柔光氛围。

颜色没有全部使用同一种蓝色，而是用青色、紫色、粉色叠加。这样发光会更丰富，不会变成单一颜色的普通阴影。

## 第五步：让渐变横向流动

标题使用 `neon-gradient` 动画：

```css
.custom-home h1 {
  animation:
    neon-gradient 7s linear infinite,
    neon-pulse 3.6s ease-in-out infinite alternate;
}

@keyframes neon-gradient {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 200% 50%;
  }
}
```

动画只改变 `background-position`，不会移动 DOM，也不会影响布局。

因为前面设置了 `background-size: 200% 100%`，所以背景位置从 `0%` 移到 `200%` 时，用户会看到渐变色在文字内部缓慢流动。

## 第六步：让霓虹灯有呼吸感

第二个动画是 `neon-pulse`：

```css
@keyframes neon-pulse {
  from {
    filter: saturate(1);
  }

  to {
    filter: saturate(1.35) brightness(1.12);
  }
}
```

它通过 `filter` 轻微提高饱和度和亮度，让标题像霓虹灯一样有呼吸感。

`alternate` 表示动画会正向播放一次，再反向播放一次。这样亮度变化会更自然，不会突然跳回初始状态。

## 第七步：处理移动端字号

大屏标题是：

```css
font-size: 6.6rem;
```

移动端单独降到：

```css
@media (max-width: 719px) {
  .custom-home h1 {
    font-size: 3.6rem;
  }
}
```

中等屏幕使用：

```css
@media (min-width: 720px) and (max-width: 959px) {
  .custom-home h1 {
    font-size: 5rem;
  }
}
```

这里没有用 `vw` 直接缩放字体，是为了避免极窄屏或超宽屏下字号失控。固定几个断点会更稳定。

## 第八步：避免标题显示不全

霓虹渐变文字最常见的问题是下方被截断。当前用三处来处理：

```css
.custom-home__hero {
  overflow: visible;
}

.custom-home__hero-inner {
  overflow: visible;
}

.custom-home h1 {
  display: inline-block;
  padding: 0 0.04em 0.18em;
  overflow: visible;
  line-height: 1.22;
}
```

父级允许溢出，标题自身增加行高和底部 padding，这样字母下沿和光晕都不会被裁掉。

## 完整实现流程

这个霓虹标题可以按下面顺序理解：

1. 用普通 `h1` 保留标题语义。
2. 用 `inline-block`、`line-height` 和 `padding-bottom` 建立稳定绘制盒。
3. 用 `linear-gradient` 创建多色文字背景。
4. 用 `background-clip: text` 把背景裁剪成文字。
5. 用多层 `text-shadow` 做霓虹光晕。
6. 用 `background-position` 动画让渐变流动。
7. 用 `filter` 动画做轻微明暗呼吸。
8. 用媒体查询控制不同屏幕下的字号。

这个效果适合用在 Hero 标题、活动页主标题、个人站首页标题等需要强视觉记忆点的位置。普通正文标题不建议使用，因为发光和动画会降低长文本阅读效率。

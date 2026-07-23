---
title: VuePress 毛玻璃卡片和工具栏样式实现详解
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - 组件
  - 样式
  - 交互动效
isOriginal: true
excerpt: 拆解博客首页博主信息、文章 3D Card、右下角工具栏和设置弹窗里的毛玻璃样式实现。
---

# VuePress 毛玻璃卡片和工具栏样式实现详解

毛玻璃风格通常叫：

```text
Glassmorphism
```

它的核心不是单纯把背景调透明，而是同时使用半透明背景、背景模糊、轻边框、内高光和阴影，让组件像一层浮在页面上的磨砂玻璃。

当前博客里主要应用在三个位置：

- 首页文章 `ThreeDCard`
- 右侧博主信息翻转面板
- 右下角工具栏和设置弹窗

相关文件：

```text
docs/.vuepress/components/ui/ThreeDCard.vue
docs/.vuepress/components/pages/HomeExperience.vue
docs/.vuepress/components/ui/FloatingToolDock.vue
```

## 第一步：毛玻璃的基本配方

一个稳定的毛玻璃面板通常由五部分组成：

```css
.glass-panel {
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.54);
  box-shadow:
    0 24px 58px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.64);
  backdrop-filter: blur(28px) saturate(1.24);
  -webkit-backdrop-filter: blur(28px) saturate(1.24);
}
```

每一项都有明确作用：

- `border`：模拟玻璃边缘的反光。
- `background`：半透明底色，保证文字可读。
- `box-shadow`：外部阴影让面板浮起来。
- `inset box-shadow`：内部上边高光，增强玻璃边缘感。
- `backdrop-filter`：模糊面板背后的内容。

只写 `background: rgba(...)` 只能得到透明卡片，不是毛玻璃。真正的玻璃质感来自 `backdrop-filter` 和高光层。

## 第二步：给文章 3D Card 加毛玻璃

文章卡片主体在 `ThreeDCard.vue` 中：

```css
.three-d-card__body {
  border: 1px solid rgba(255, 255, 255, 0.46);
  background: rgba(255, 255, 255, 0.58);
  box-shadow:
    0 24px 58px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(26px) saturate(1.22);
  -webkit-backdrop-filter: blur(26px) saturate(1.22);
}
```

这里使用 `0.58` 的白色透明度，是为了兼顾两件事：

- 背景能透出来，保持玻璃感。
- 文字仍然有足够对比度，不会因为太透明而看不清。

`blur(26px)` 负责模糊背景，`saturate(1.22)` 稍微提高背景饱和度，让玻璃后面的色彩更有活力。

## 第三步：文章卡片的暗色模式

黑夜模式不能继续使用白色玻璃底，否则会和整体深色背景冲突。所以单独覆盖：

```css
[data-theme="dark"] .three-d-card__body {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.58);
  box-shadow:
    0 24px 58px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

暗色模式的重点是降低内高光强度。白天模式可以用 `0.58` 的白色内高光，黑夜模式只保留 `0.1`，否则边缘会显得太亮。

## 第四步：保留 3D Card 的交互光斑

毛玻璃卡片仍然保留鼠标跟随光斑：

```css
.three-d-card__body::before {
  background: radial-gradient(
    circle at var(--card-glow-x) var(--card-glow-y),
    rgba(255, 255, 255, 0.5),
    rgba(255, 255, 255, 0.08) 18%,
    transparent 38%
  );
}
```

光斑的位置由 JavaScript 写入 CSS 变量：

```js
body.style.setProperty('--card-glow-x', `${event.clientX - rect.left}px`)
body.style.setProperty('--card-glow-y', `${event.clientY - rect.top}px`)
```

这样卡片既有玻璃质感，也能在鼠标移动时出现局部高光。

## 第五步：博主信息面板的毛玻璃

博主信息翻转卡片写在 `HomeExperience.vue`：

```css
.blogger-panel__face {
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.54);
  box-shadow:
    0 24px 58px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.64);
  backdrop-filter: blur(28px) saturate(1.24);
  -webkit-backdrop-filter: blur(28px) saturate(1.24);
}
```

它和文章卡片使用相近参数，但 blur 更高。原因是博主面板面积更大，背景透出更多，模糊强一点会让文字区域更干净。

## 第六步：去掉网状背景

毛玻璃不适合再叠加明显网格纹理。当前直接关闭伪元素：

```css
.blogger-panel__face::before {
  display: none;
}
```

如果保留网格，视觉焦点会从内容转移到纹理上，玻璃的通透感也会下降。毛玻璃更适合干净的背景、轻边框和柔和阴影。

## 第七步：工具栏也使用同一套玻璃语言

右下角工具栏在 `FloatingToolDock.vue` 中：

```css
.tool-dock {
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.54);
  box-shadow:
    0 20px 48px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
}
```

工具栏面积小，所以 blur 比大面板略低。小组件如果 blur 太强，边缘会显得发糊；`22px` 更适合按钮容器。

## 第八步：设置弹窗的玻璃层

设置弹窗面板使用更强的背景模糊：

```css
.tool-modal__panel {
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.74);
  box-shadow:
    0 30px 90px rgba(15, 23, 42, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(30px) saturate(1.2);
  -webkit-backdrop-filter: blur(30px) saturate(1.2);
}
```

弹窗是高优先级界面，需要更强的可读性，所以背景透明度比卡片更高。这里用 `0.74`，让用户能看出毛玻璃，但不会影响设置项阅读。

## 第九步：明暗模式变量思路

所有玻璃组件都遵循同一个原则：

- 白天模式：浅色半透明背景 + 深色文字。
- 黑夜模式：深色半透明背景 + 浅色文字。
- 白天模式内高光更明显。
- 黑夜模式内高光更克制。

示例：

```css
[data-theme="dark"] .tool-dock {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.56);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

不要只改背景色。明暗模式切换时，边框、阴影、文字和内高光都应该一起调整。

## 第十步：毛玻璃的可读性原则

毛玻璃效果容易做得好看，但也容易牺牲可读性。当前实现遵守几个规则：

- 正文容器透明度不低于 `0.52`。
- 大面板 blur 比小工具栏更强。
- 边框使用低透明度白色或灰蓝色。
- 文字颜色根据主题单独设置。
- 不叠加网格纹理。
- hover 只增强边框和阴影，不大幅改变背景透明度。

这样视觉上会有通透感，但不会变成难以阅读的透明浮层。

## 完整实现流程

实现毛玻璃可以按这个顺序处理：

1. 先确定组件底色和文字颜色。
2. 用 `rgba` 设置半透明背景。
3. 用 `backdrop-filter: blur(...) saturate(...)` 模糊背景。
4. 用 `-webkit-backdrop-filter` 补 Safari 兼容。
5. 用半透明边框模拟玻璃边缘。
6. 用外阴影制造浮起层级。
7. 用 `inset` 内阴影增加顶部高光。
8. 单独写 `[data-theme="dark"]` 覆盖暗色模式。
9. 移除网格纹理等会干扰玻璃感的装饰。
10. 最后检查白天和黑夜模式下的文字对比度。

毛玻璃适合卡片、工具栏、弹窗、侧边栏等浮层组件。正文长文本区域不建议过度使用，因为透明和模糊都会增加阅读成本。

---
title: VuePress Hero 打字机效果实现详解
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - 交互动效
  - 样式
isOriginal: true
excerpt: 拆解首页 Hero 副标题的 Typewriter Effect，包括宽度动画、steps 分段、光标闪烁、循环删除和移动端兼容。
---

# VuePress Hero 打字机效果实现详解

首页 Hero 标题下方的副标题使用的是打字机效果，英文通常叫：

```text
Typewriter Effect
```

它的视觉特点是文字像被逐字输入出来，右侧有一个闪烁光标，停留一段时间后再逐字收回并循环播放。

当前代码位置：

```text
docs/.vuepress/components/pages/HomeExperience.vue
```

## 第一步：准备文本结构

模板结构如下：

```vue
<p class="custom-home__tagline" aria-label="记录技术实践、阅读笔记和写作工作流">
  <span>记录技术实践、阅读笔记和写作工作流。</span>
</p>
```

外层 `p` 负责段落语义和整体样式，内层 `span` 负责动画。

`aria-label` 的作用是给辅助技术提供完整句子。因为打字机动画会不断改变视觉宽度，屏幕阅读器不应该被动画过程干扰，而应该直接读出完整文本。

## 第二步：设置副标题基础样式

```css
.custom-home__tagline {
  max-width: 700px;
  margin: 24px 0 0;
  color: #7dd3fc;
  font-size: 1.18rem;
  line-height: 1.8;
  text-shadow: 0 0 14px rgba(125, 211, 252, 0.48);
}
```

这一步只负责副标题整体观感：

- `max-width` 控制文本区域，不让副标题过长。
- `color` 使用浅蓝色，和霓虹标题保持同一视觉体系。
- `line-height: 1.8` 给中文句子留足阅读空间。
- `text-shadow` 增加轻微发光感，让它和 Hero 标题呼应。

真正的打字机动画不写在外层 `p` 上，而是写在里面的 `span` 上。

## 第三步：让文本可以被宽度裁剪

```css
.custom-home__tagline span {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
}
```

这几行是打字机效果的基础。

`display: inline-block` 让 `span` 可以设置和动画化宽度。普通行内元素的宽度不适合直接做动画。

`overflow: hidden` 会把超出当前宽度的文字裁掉。动画从 `width: 0` 走到 `width: 100%` 时，文字就像一点点显示出来。

`white-space: nowrap` 禁止换行。如果文字中途换行，宽度动画会变得不可控，打字机效果也会断掉。

## 第四步：用右边框模拟光标

```css
.custom-home__tagline span {
  border-right: 2px solid rgba(125, 211, 252, 0.9);
}
```

打字机光标不是额外的 DOM，而是 `span` 的右边框。

这样做有两个好处：

- 光标会自动跟着文字宽度移动。
- 不需要额外写一个光标元素，结构更简单。

当 `span` 宽度从 `0` 增加到 `100%` 时，右边框就在当前文字末尾，看起来就像输入光标。

## 第五步：用 steps 做逐字输入

动画绑定如下：

```css
.custom-home__tagline span {
  animation:
    typewriter-loop 6.6s steps(18, end) 0.4s infinite,
    typing-caret 760ms steps(1, end) infinite;
}
```

`steps(18, end)` 是关键。普通 `linear` 动画会让宽度连续变化，文字会像被平滑拉开，不像逐字输入。

`steps` 会把动画拆成固定次数的跳变。这里的文本是：

```text
记录技术实践、阅读笔记和写作工作流。
```

它按视觉字符数大约分成 18 步，所以使用 `steps(18, end)`。每一步宽度跳一次，就形成接近逐字出现的效果。

如果你换了文案，最好同步调整 `steps` 数量。文案越长，步数越多；文案越短，步数越少。

## 第六步：编写输入、停留和删除动画

```css
@keyframes typewriter-loop {
  0%,
  8% {
    width: 0;
  }

  45%,
  76% {
    width: 100%;
  }

  100% {
    width: 0;
  }
}
```

这个动画分成三个阶段：

- `0% - 8%`：宽度保持 `0`，开始前短暂停顿。
- `8% - 45%`：宽度从 `0` 逐步变到 `100%`，模拟输入。
- `45% - 76%`：宽度保持 `100%`，让用户读完句子。
- `76% - 100%`：宽度回到 `0`，模拟删除并准备下一轮。

完整动画时长是 `6.6s`，所以一次循环里既有输入，也有停留，还有删除。

## 第七步：让光标闪烁

```css
@keyframes typing-caret {
  50% {
    border-color: transparent;
  }
}
```

光标动画只改变 `border-color`。默认状态下右边框是蓝色，动画到 50% 时变透明，然后再回到蓝色。

绑定动画时使用：

```css
typing-caret 760ms steps(1, end) infinite
```

`steps(1, end)` 会让颜色在可见和不可见之间直接切换，而不是渐变过渡。这样才像真实光标闪烁。

## 第八步：移动端关闭打字机动画

当前移动端样式里关闭了这个效果：

```css
@media (max-width: 719px) {
  .custom-home__tagline span {
    white-space: normal;
    border-right: 0;
    animation: none;
  }
}
```

移动端关闭动画有两个原因。

第一，手机屏幕窄，副标题可能需要换行。如果继续强制 `nowrap`，文本可能溢出屏幕。

第二，打字机动画会不断改变文字宽度，移动端上更容易造成视觉跳动。直接显示完整句子更稳定。

## 第九步：换文案时要改哪些地方

如果你把副标题换成别的句子，需要检查三处。

第一，模板里的文本：

```vue
<span>新的副标题文案</span>
```

第二，`aria-label`：

```vue
aria-label="新的副标题文案"
```

第三，`steps` 数量：

```css
typewriter-loop 6.6s steps(新的字符数, end) 0.4s infinite
```

如果 `steps` 太少，文字会几个字一跳；如果 `steps` 太多，动画会出现空跳，看起来节奏不均匀。

## 完整实现流程

这个打字机效果可以按下面顺序理解：

1. 外层 `p` 承载语义和整体文字样式。
2. 内层 `span` 作为动画容器。
3. 用 `inline-block` 让 `span` 支持宽度动画。
4. 用 `overflow: hidden` 裁掉还没输入出来的文字。
5. 用 `white-space: nowrap` 保证文字在一行内被裁剪。
6. 用 `border-right` 模拟输入光标。
7. 用 `steps` 把宽度动画拆成逐字跳变。
8. 用第二个动画让光标闪烁。
9. 移动端关闭动画，避免文本溢出和布局跳动。

这个效果适合短句、口号、副标题和命令行风格提示，不适合长段落。文案越短，效果越清晰；文案过长时，用户会等太久才能读完整内容。

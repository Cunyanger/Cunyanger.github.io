---
title: VuePress 首页叠加 Inspira UI 神经网络和雪花背景教程
date: 2026-07-21
category: VuePress
tag:
  - VuePress
  - Inspira UI
  - 背景
  - 交互动效
  - 组件
isOriginal: true
excerpt: 详细记录如何在保留原有背景图和渐变样式的前提下，引入 Inspira UI 官方 Neural Background 和 Snowfall Bg，让白天模式显示神经网络效果、夜间模式显示雪花效果。
---

# VuePress 首页叠加 Inspira UI 神经网络和雪花背景教程

这篇教程记录一次完整的背景动效接入流程：在不改变原来首页背景图、渐变阴影、卡片毛玻璃样式的前提下，额外叠加两个 Inspira UI 官方背景组件。

最终效果：

- 白天模式：保留原来的白天背景图，同时叠加 `Neural Background` 神经网络效果。
- 夜间模式：保留原来的夜间背景图，同时叠加 `Snowfall Bg` 雪花效果。
- Hero 区和下方文章列表区都能看到动效。
- 原背景图片、原渐变阴影、原卡片样式不被替换。
- 主题切换时不会出现 canvas 尺寸为 0、雪花不显示、背景跳动等问题。

参考来源：

- `Neural Background` 文档：https://inspira-ui.com/docs/cn/components/backgrounds/neural-background
- `Snowfall Bg` 文档：https://inspira-ui.com/docs/cn/components/backgrounds/snowfall-bg
- Inspira UI 开源仓库：https://github.com/unovue/inspira-ui
- 官方 registry：`https://registry.inspira-ui.com/bg-neural.json`
- 官方 registry：`https://registry.inspira-ui.com/snowfall-bg.json`

## 适用前提

这套步骤适合 Vue 3 / VuePress 2 / Vite 项目。其他 Vue 系统也可以按同样思路接入，只要满足这些条件：

1. 项目能使用 Vue 3 单文件组件。
2. 项目能安装 npm 依赖。
3. 页面有一个可以放背景层的根容器。
4. 项目有明暗主题标识，例如 `data-theme="dark"`。

当前项目的关键文件是：

```text
docs/.vuepress/components/pages/HomeExperience.vue
docs/.vuepress/components/effects/NeuralBackground.vue
docs/.vuepress/components/effects/SnowfallBg.vue
package.json
```

## 第一步：确认目标不是替换背景

这一步很重要。原首页已经有一套背景系统：

- 白天背景图：`--blog-bg-image`
- 夜间背景图：`--blog-bg-image-dark`
- 首屏上方淡出渐变
- 中下方阴影渐变
- 文章卡片和博主卡片的毛玻璃样式

这次接入 Inspira UI 动效时，不应该把这套背景删掉，也不应该让神经网络或雪花组件成为新的背景底色。

正确的层级应该是：

```text
内容层：Hero 标题、文章卡片、博主卡片
渐变阴影层：原来的遮罩、过渡和明暗压暗
动效层：白天神经网络 / 夜间雪花
背景图片层：原来的白天 / 夜间背景图
页面底色：白色 / 深色兜底
```

也就是说，Inspira UI 组件只做“叠加效果”，不接管原视觉系统。

## 第二步：安装依赖

官方 `Neural Background` 依赖 `ogl`，官方 `Snowfall Bg` 依赖 `@vueuse/core`。

安装命令：

```bash
npm install ogl @vueuse/core
```

安装后 `package.json` 中应该出现：

```json
{
  "dependencies": {
    "@vueuse/core": "^14.3.0",
    "ogl": "^1.0.11"
  }
}
```

如果 Windows 上遇到 npm cache 权限问题，可以临时把缓存放到项目目录：

```powershell
$env:npm_config_cache = Join-Path (Get-Location) '.npm-cache'
npm.cmd install ogl @vueuse/core
```

安装完成后，`.npm-cache` 只是临时缓存，不需要提交。

## 第三步：从官方 registry 获取组件源码

Inspira UI 的组件可以从官方 registry 获取。用 Node 自带 `fetch` 可以直接查看内容：

```bash
node -e "fetch('https://registry.inspira-ui.com/bg-neural.json').then(r=>r.json()).then(j=>console.log(j.files[0].path))"
node -e "fetch('https://registry.inspira-ui.com/snowfall-bg.json').then(r=>r.json()).then(j=>console.log(j.files[0].path))"
```

返回的核心文件分别是：

```text
ui/bg-neural/NeuralBg.vue
ui/snowfall-bg/SnowfallBg.vue
```

如果要查看官方组件完整内容：

```bash
node -e "fetch('https://registry.inspira-ui.com/bg-neural.json').then(r=>r.json()).then(j=>console.log(j.files[0].content))"
node -e "fetch('https://registry.inspira-ui.com/snowfall-bg.json').then(r=>r.json()).then(j=>console.log(j.files[0].content))"
```

## 第四步：创建本地效果目录

在 VuePress 项目里，把背景动效组件放到 `effects` 目录：

```text
docs/.vuepress/components/effects/
```

新增两个文件：

```text
docs/.vuepress/components/effects/NeuralBackground.vue
docs/.vuepress/components/effects/SnowfallBg.vue
```

命名可以和官方稍有不同，但建议保持语义清晰：

- 官方 `NeuralBg.vue` -> 本地 `NeuralBackground.vue`
- 官方 `SnowfallBg.vue` -> 本地 `SnowfallBg.vue`

## 第五步：移植 Neural Background

官方 `Neural Background` 的核心是：

1. 用 `ogl` 创建 WebGL renderer。
2. 用一个全屏 `Plane` 承载 shader。
3. fragment shader 里生成神经网络形状。
4. 鼠标位置通过 uniform 传入，影响图形扰动。
5. 滚动进度通过 uniform 传入，影响颜色变化。

如果你的项目是 TypeScript，可以直接保留官方 `<script setup lang="ts">` 写法。

当前项目使用普通 JavaScript SFC，所以需要做这些适配：

1. 去掉 `lang="ts"`。
2. 去掉 `import type { HTMLAttributes } from "vue"`。
3. 去掉 `@inspira-ui/plugins` 的 `cn` 工具。
4. 把官方 props 类型改成 Vue 运行时 props。
5. 模板里用 Vue 的数组 class 代替 `cn(...)`。

本地组件开头类似这样：

```vue
<script setup>
import { Camera, Mesh, Plane, Program, Renderer, Transform } from "ogl";
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  hue: {
    type: Number,
    default: 200,
  },
  saturation: {
    type: Number,
    default: 0.8,
  },
  chroma: {
    type: Number,
    default: 0.6,
  },
  class: {
    type: [String, Array, Object],
    default: "",
  },
});
</script>
```

模板改成：

```vue
<template>
  <canvas
    ref="canvasRef"
    :class="[
      'pointer-events-none absolute inset-0 size-full opacity-95',
      props.class,
    ]"
  />
</template>
```

其余 shader、`initOGL()`、`resizeCanvas()`、`render()`、鼠标事件和 watch 逻辑可以按官方 registry 保留。

当前项目的完整实现见：

```text
docs/.vuepress/components/effects/NeuralBackground.vue
```

## 第六步：移植 Snowfall Bg

官方 `Snowfall Bg` 的核心是：

1. 创建一个容器 `div`。
2. 在容器里放一个 `canvas`。
3. 用 `useDevicePixelRatio()` 处理高清屏。
4. 随机生成雪花数组。
5. 每帧清空 canvas，再更新雪花位置并重绘。
6. 雪花落出底部后，从顶部重新出现。

同样，如果项目不用 TypeScript，需要把官方接口类型改成运行时 props。

本地组件开头类似这样：

```vue
<script setup>
import { useDevicePixelRatio } from "@vueuse/core";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";

const props = defineProps({
  color: {
    type: String,
    default: "#FFF",
  },
  quantity: {
    type: Number,
    default: 100,
  },
  speed: {
    type: Number,
    default: 1,
  },
  maxRadius: {
    type: Number,
    default: 3,
  },
  minRadius: {
    type: Number,
    default: 1,
  },
  class: {
    type: String,
    default: "",
  },
});
</script>
```

模板保持官方结构：

```vue
<template>
  <div ref="canvasContainerRef" :class="$props.class" aria-hidden="true">
    <canvas ref="canvasRef" />
  </div>
</template>
```

当前项目额外做了一个小修正：官方代码中 `requestAnimationFrame(animate)` 没有保存 id。为了组件卸载时能停止动画，本地保存了 `animationId`：

```js
let animationId = 0;

function animate() {
  // 绘制雪花...
  animationId = requestAnimationFrame(animate);
}

onBeforeUnmount(() => {
  window.removeEventListener("resize", initCanvas);
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
```

当前项目的完整实现见：

```text
docs/.vuepress/components/effects/SnowfallBg.vue
```

## 第七步：在首页组件中引入两个效果

打开首页组件：

```text
docs/.vuepress/components/pages/HomeExperience.vue
```

在 `<script setup>` 里引入：

```js
import NeuralBackground from "../effects/NeuralBackground.vue";
import SnowfallBg from "../effects/SnowfallBg.vue";
```

如果你的目录不一样，按实际相对路径调整。

## 第八步：设计背景层结构

首页根节点是：

```vue
<main class="custom-home">
  <!-- 背景层 -->
  <!-- 内容层 -->
</main>
```

背景层结构应该放在内容之前：

```vue
<div class="custom-home__backdrop" aria-hidden="true">
  <div class="custom-home__backdrop-image" />

  <div class="custom-home__effect-layer">
    <div class="custom-home__backdrop-mode custom-home__backdrop-mode--light">
      <NeuralBackground
        class="custom-home__neural-bg"
        :hue="204"
        :saturation="0.82"
        :chroma="0.72"
      />
    </div>

    <div class="custom-home__backdrop-mode custom-home__backdrop-mode--dark">
      <SnowfallBg
        class="custom-home__snowfall-bg"
        color="#e5f3ff"
        :quantity="140"
        :speed="0.9"
        :min-radius="0.8"
        :max-radius="2.8"
      />
    </div>
  </div>

  <div class="custom-home__backdrop-shadow" />
  <div class="custom-home__backdrop-top-fade" />
</div>
```

这个结构的顺序不能随便调：

1. `.custom-home__backdrop-image` 是原背景图。
2. `.custom-home__effect-layer` 是新增动效。
3. `.custom-home__backdrop-shadow` 是原中下方渐变阴影。
4. `.custom-home__backdrop-top-fade` 是原顶部渐变。

这样动效不会替换原背景，也不会压在内容上。

## 第九步：保留原背景图

原背景图来自全局 CSS 变量：

```scss
:root {
  --blog-bg-image: url("https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/bg_mor_stu.png");
  --blog-bg-image-dark: url("https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/bg_nig_stu.png");
}
```

首页里继续使用这两个变量：

```css
.custom-home__backdrop-image {
  position: sticky;
  top: calc(100svh - 132svh);
  height: 132svh;
  z-index: 0;
  opacity: 0.86;
  background-image: var(--blog-bg-image);
  background-position: center 42svh;
  background-size: cover;
  background-repeat: no-repeat;
  filter: blur(2px) saturate(1.04);
  pointer-events: none;
}

[data-theme="dark"] .custom-home__backdrop-image {
  background-image: var(--blog-bg-image-dark);
}
```

这里继续使用 `sticky`，是为了保留之前“背景图滚动到合适位置后固定”的视觉逻辑。

## 第十步：让动效覆盖整个视口

如果动效层只跟背景图片容器一样高，那么滚到文章区时就看不到特效。

正确做法是让动效层 `fixed` 到视口：

```css
.custom-home__effect-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}
```

这一步解决两个问题：

1. Hero 区有特效。
2. 下方文章区也有特效。

`pointer-events: none` 必须保留，否则背景 canvas 可能挡住按钮、链接、卡片 hover。

## 第十一步：切换白天和夜间效果

两个动效层都挂载，但根据主题显示不同层：

```css
.custom-home__backdrop-mode {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.custom-home__backdrop-mode--dark {
  opacity: 0;
  visibility: hidden;
}

[data-theme="dark"] .custom-home__backdrop-mode--light {
  opacity: 0;
  visibility: hidden;
}

[data-theme="dark"] .custom-home__backdrop-mode--dark {
  opacity: 1;
  visibility: visible;
}
```

不要用 `display: none` 隐藏雪花层。

原因是 `SnowfallBg` 在 `onMounted()` 时会读取容器宽高。如果组件挂载时父级是 `display: none`，它读到的宽高可能是 0，canvas 就会初始化成 0 尺寸，表现为“夜间模式没有雪花”。

用 `opacity: 0` 和 `visibility: hidden` 隐藏，元素仍然有尺寸，canvas 可以正确初始化。

## 第十二步：修复 scoped CSS 下的 canvas 尺寸

`SnowfallBg.vue` 内部的 canvas 是子组件里的元素。父组件 `HomeExperience.vue` 使用 scoped CSS 时，普通选择器：

```css
.custom-home__snowfall-bg canvas {
  width: 100%;
  height: 100%;
}
```

可能匹配不到子组件内部 canvas。

应该使用 `:deep()`：

```css
.custom-home__snowfall-bg :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
```

这是让雪花铺满整屏的关键。

## 第十三步：设置动效透明度和混合方式

动效只是叠加层，不能抢掉原背景视觉。

白天神经网络建议弱一点：

```css
.custom-home__neural-bg {
  opacity: 0.5;
  mix-blend-mode: multiply;
}
```

夜间雪花可以稍明显：

```css
.custom-home__snowfall-bg {
  opacity: 0.72;
}
```

如果在其他系统里背景更亮，可以提高神经网络透明度到 `0.6`。如果背景更暗，可以把雪花透明度调到 `0.85`。

## 第十四步：保留原渐变阴影

原来的渐变阴影用于控制首屏过渡、文字可读性和下方卡片区域的氛围，不应该删除。

白天渐变示例：

```css
.custom-home__backdrop-shadow {
  position: absolute;
  inset: 0 0 -120px;
  z-index: 2;
  background: linear-gradient(
    180deg,
    transparent 0,
    transparent 3svh,
    rgba(255, 255, 255, 0.99) 39svh,
    rgba(255, 255, 255, 0.95) 49svh,
    rgba(255, 255, 255, 0.58) 58svh,
    rgba(255, 255, 255, 0.14) 72svh,
    rgba(2, 6, 23, 0.34) 150svh,
    rgba(2, 6, 23, 0.72) 176svh
  );
}
```

夜间渐变示例：

```css
[data-theme="dark"] .custom-home__backdrop-shadow {
  background: linear-gradient(
    180deg,
    transparent 0,
    transparent 3svh,
    rgba(0, 0, 0, 0.97) 41svh,
    rgba(2, 6, 23, 0.88) 54svh,
    rgba(15, 23, 42, 0.62) 74svh,
    rgba(15, 23, 42, 0.18) 122svh,
    rgba(2, 6, 23, 0.44) 150svh,
    rgba(2, 6, 23, 0.76) 176svh
  );
}
```

顶部渐变也继续保留：

```css
.custom-home__backdrop-top-fade {
  position: absolute;
  inset: 0 0 auto;
  z-index: 3;
  height: 42svh;
  background: linear-gradient(
    180deg,
    transparent 0,
    transparent 3svh,
    rgba(255, 255, 255, 0.99) 39svh,
    rgba(255, 255, 255, 0.2) 100%
  );
}
```

如果你的需求是“渐变阴影随页面滚动移走”，这里就不要写 `position: fixed`。保持 `absolute` 即可。

## 第十五步：保证内容层在背景之上

背景容器的 `z-index` 是 0，动效层和渐变层都在背景容器内部。

内容层需要高于背景：

```css
.custom-home__hero {
  position: relative;
  z-index: 2;
}

.custom-home__latest {
  position: relative;
  z-index: 2;
}
```

如果内容突然消失，优先检查：

1. 内容层是否有 `position: relative`。
2. 内容层 `z-index` 是否高于背景层。
3. 背景 canvas 是否没有 `pointer-events: none`。
4. 父级是否创建了新的 stacking context。

## 第十六步：在其他系统中复用

如果不是 VuePress，而是普通 Vue / Vite 项目，可以按这个结构接：

```vue
<template>
  <main class="home-page">
    <div class="home-bg" aria-hidden="true">
      <div class="home-bg__image" />
      <div class="home-bg__effects">
        <NeuralBackground class="home-bg__neural" />
        <SnowfallBg class="home-bg__snow" />
      </div>
      <div class="home-bg__mask" />
    </div>

    <section class="home-content">
      <!-- 页面内容 -->
    </section>
  </main>
</template>
```

然后用你的主题标识切换：

```css
.home-bg__snow {
  opacity: 0;
  visibility: hidden;
}

[data-theme="dark"] .home-bg__neural {
  opacity: 0;
  visibility: hidden;
}

[data-theme="dark"] .home-bg__snow {
  opacity: 1;
  visibility: visible;
}
```

如果你的系统用的是类名，例如 `.dark`：

```css
.dark .home-bg__neural {
  opacity: 0;
  visibility: hidden;
}

.dark .home-bg__snow {
  opacity: 1;
  visibility: visible;
}
```

## 第十七步：构建验证

当前 VuePress 项目执行：

```bash
npm run docs:build
```

Windows PowerShell 如果因为执行策略不允许 `npm.ps1`，可以使用：

```bash
npm.cmd run docs:build
```

成功时会看到：

```text
success VuePress build completed
```

## 第十八步：浏览器验证清单

构建通过不代表视觉一定正确，还需要在浏览器里检查：

1. 白天模式是否仍然显示原来的白天背景图。
2. 白天模式是否有神经网络动效。
3. 夜间模式是否仍然显示原来的夜间背景图。
4. 夜间模式是否有雪花飘落。
5. 滚到文章列表区域后，动效是否仍然存在。
6. 卡片、分页按钮、导航链接是否可以正常点击。
7. 切换明暗模式后，雪花 canvas 是否没有变成 0 宽高。
8. Hero 标题和下方文章是否没有被背景层盖住。

## 常见问题

### 夜间模式没有雪花

优先检查是否用了 `display: none` 隐藏雪花层。

错误写法：

```css
.snow-layer {
  display: none;
}
```

推荐写法：

```css
.snow-layer {
  opacity: 0;
  visibility: hidden;
}
```

### 文章区没有特效

说明动效层高度只覆盖了 Hero 区。

把动效层改成：

```css
.effect-layer {
  position: fixed;
  inset: 0;
}
```

### 雪花只出现在一个很小的区域

通常是 canvas 没有铺满父容器，或者 scoped CSS 没有穿透子组件。

Vue scoped CSS 中使用：

```css
.snow-layer :deep(canvas) {
  width: 100%;
  height: 100%;
}
```

### 背景盖住内容

检查 `z-index`：

```css
.background {
  z-index: 0;
}

.content {
  position: relative;
  z-index: 2;
}
```

同时确认背景层有：

```css
pointer-events: none;
```

### 原背景样式被改变

说明把 Neural / Snowfall 组件当成了背景底图。

正确方式是保留原来的 `.backdrop-image` 和渐变层，只把动效放在中间：

```text
image -> effects -> masks -> content
```

## 最终文件关系

当前项目最后形成的文件关系：

```text
package.json
  dependencies:
    @vueuse/core
    ogl

docs/.vuepress/components/effects/NeuralBackground.vue
  来自官方 bg-neural，适配为本项目 JS SFC。

docs/.vuepress/components/effects/SnowfallBg.vue
  来自官方 snowfall-bg，适配为本项目 JS SFC。

docs/.vuepress/components/pages/HomeExperience.vue
  保留原背景图和渐变阴影。
  白天叠加 NeuralBackground。
  夜间叠加 SnowfallBg。
  动效层 fixed 覆盖视口，文章区也持续生效。
```

## 完整接入流程总结

1. 明确目标是“叠加动效”，不是替换原背景。
2. 安装 `ogl` 和 `@vueuse/core`。
3. 从官方 registry 获取 `bg-neural` 和 `snowfall-bg` 源码。
4. 创建 `NeuralBackground.vue` 和 `SnowfallBg.vue`。
5. 如果项目不用 TypeScript，把官方类型写法改成运行时 props。
6. 去掉 `@inspira-ui/plugins` 的 `cn`，改用 Vue class 数组。
7. 在首页引入两个效果组件。
8. 保留原背景图层。
9. 在背景图之上放 fixed 动效层。
10. 在动效层之上保留原渐变阴影。
11. 用主题选择器切换白天神经网络和夜间雪花。
12. 不用 `display: none` 隐藏 canvas 动效层。
13. 用 `:deep(canvas)` 修复 scoped CSS 下的 canvas 尺寸。
14. 确保内容层 `z-index` 高于背景层。
15. 运行构建命令验证。
16. 在浏览器里检查白天、夜间、Hero、文章区和主题切换。

按这个流程迁移到其他 Vue 系统时，只需要替换背景图变量、主题选择器和页面容器类名，核心组件和层级逻辑可以保持一致。

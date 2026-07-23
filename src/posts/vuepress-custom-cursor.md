---
title: VuePress 页面替换自定义鼠标光标教程
date: 2026-07-22
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - Vue
  - 样式
  - 交互动效
  - 鼠标光标
isOriginal: true
excerpt: 记录如何把本地 Windows 鼠标光标包接入 VuePress 博客页面，包括资源整理、public 目录、CSS cursor 映射、状态覆盖和构建验证。
---

# VuePress 页面替换自定义鼠标光标教程

这篇文章记录如何把一套本地鼠标光标包应用到 VuePress 博客页面中。

当前使用的是本地目录：

```text
C:\Users\13511\Downloads\Ori2.0\Ori鼠标光标2.0
```

这个目录里包含两类文件：

- `.cur`：静态鼠标光标，网页中兼容性更稳定。
- `.ani`：Windows 动态鼠标光标，部分浏览器支持有限，不支持时会回退到 CSS 后面的默认光标。

最终目标是让页面在不同交互状态下显示不同的 Ori 光标：

- 普通页面：正常选择光标。
- 链接和按钮：链接选择光标。
- 输入框和文本区域：文本选择光标。
- 禁用按钮：不可用光标。
- 设置按钮、关闭按钮：帮助选择光标。

## 第一步：确认光标文件

先查看本地光标包里有哪些文件。

在 PowerShell 中可以执行：

```powershell
Get-ChildItem -Recurse -File "C:\Users\13511\Downloads\Ori2.0\Ori鼠标光标2.0" |
  Select-Object FullName, Length, Extension
```

当前光标包中包含：

```text
正常选择.cur
链接选择.cur
文本选择.cur
手写.cur
移动.cur
水平调整.cur
垂直调整.cur
沿对角线调整1.cur
沿对角线调整2.cur
候选.cur
不可用.ani
忙.ani
后台运行.ani
帮助选择.ani
精确选择.ani
```

这里不要直接在 CSS 中引用中文文件名。浏览器能够处理中文 URL，但在不同构建工具、服务器和编码环境中更容易出问题。

更稳妥的做法是：复制到项目 public 目录时，把文件名改成英文。

## 第二步：放到 VuePress 的 public 目录

VuePress 中，`docs/.vuepress/public` 会被当作静态资源目录。

也就是说，放在：

```text
docs/.vuepress/public/cursors/ori/normal.cur
```

构建后可以通过下面这个路径访问：

```text
/cursors/ori/normal.cur
```

这和组件里的 `import` 不同。光标文件不需要参与 JavaScript 打包，只需要让浏览器能通过 URL 访问到它。

当前项目使用的目录结构是：

```text
docs/.vuepress/public/
  cursors/
    ori/
      normal.cur
      link.cur
      text.cur
      handwriting.cur
      move.cur
      resize-x.cur
      resize-y.cur
      resize-diagonal-1.cur
      resize-diagonal-2.cur
      alternate.cur
      not-allowed.ani
      wait.ani
      progress.ani
      help.ani
      crosshair.ani
```

可以用下面的 PowerShell 命令复制并重命名：

```powershell
$target = "D:\WorkSpace\codex\blog\docs\.vuepress\public\cursors\ori"
New-Item -ItemType Directory -Force -Path $target | Out-Null

$source = "C:\Users\13511\Downloads\Ori2.0\Ori鼠标光标2.0"

Copy-Item -LiteralPath (Join-Path $source "正常选择.cur") -Destination (Join-Path $target "normal.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "链接选择.cur") -Destination (Join-Path $target "link.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "文本选择.cur") -Destination (Join-Path $target "text.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "手写.cur") -Destination (Join-Path $target "handwriting.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "移动.cur") -Destination (Join-Path $target "move.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "水平调整.cur") -Destination (Join-Path $target "resize-x.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "垂直调整.cur") -Destination (Join-Path $target "resize-y.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "沿对角线调整1.cur") -Destination (Join-Path $target "resize-diagonal-1.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "沿对角线调整2.cur") -Destination (Join-Path $target "resize-diagonal-2.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "候选.cur") -Destination (Join-Path $target "alternate.cur") -Force
Copy-Item -LiteralPath (Join-Path $source "不可用.ani") -Destination (Join-Path $target "not-allowed.ani") -Force
Copy-Item -LiteralPath (Join-Path $source "忙.ani") -Destination (Join-Path $target "wait.ani") -Force
Copy-Item -LiteralPath (Join-Path $source "后台运行.ani") -Destination (Join-Path $target "progress.ani") -Force
Copy-Item -LiteralPath (Join-Path $source "帮助选择.ani") -Destination (Join-Path $target "help.ani") -Force
Copy-Item -LiteralPath (Join-Path $source "精确选择.ani") -Destination (Join-Path $target "crosshair.ani") -Force
```

这里使用 `-LiteralPath` 是为了安全处理中文路径。

如果使用 `-Path`，PowerShell 可能会把某些字符当作通配符处理。`-LiteralPath` 会把路径当作字面值读取，更适合处理中文文件名和特殊字符。

## 第三步：为什么不用 Vue 组件 import 光标

鼠标光标是 CSS `cursor` 属性控制的，不需要用 Vue 组件渲染。

下面这种方式不适合这个场景：

```js
import cursorUrl from './normal.cur'
```

原因有三个：

- VuePress 的全局样式已经可以直接引用 public 目录资源。
- `cursor` 是 CSS 能力，不需要 JavaScript 参与。
- 光标属于全站基础交互，写在全局 SCSS 中更容易覆盖所有页面。

所以当前实现放在：

```text
docs/.vuepress/styles/index.scss
```

## 第四步：定义光标变量

先在 `:root` 中定义一组 CSS 变量：

```scss
:root {
  --cursor-default: url("/cursors/ori/normal.cur");
  --cursor-link: url("/cursors/ori/link.cur");
  --cursor-text: url("/cursors/ori/text.cur");
  --cursor-help: url("/cursors/ori/help.ani");
  --cursor-alternate: url("/cursors/ori/alternate.cur");
  --cursor-move: url("/cursors/ori/move.cur");
  --cursor-resize-x: url("/cursors/ori/resize-x.cur");
  --cursor-resize-y: url("/cursors/ori/resize-y.cur");
  --cursor-resize-diagonal-1: url("/cursors/ori/resize-diagonal-1.cur");
  --cursor-resize-diagonal-2: url("/cursors/ori/resize-diagonal-2.cur");
  --cursor-wait: url("/cursors/ori/wait.ani");
  --cursor-progress: url("/cursors/ori/progress.ani");
  --cursor-not-allowed: url("/cursors/ori/not-allowed.ani");
}
```

这样做的好处是：

- 路径集中管理。
- 后面修改光标文件时不用到处找选择器。
- 可以给不同主题或页面单独覆盖变量。

例如以后想让暗色模式使用另一套光标，只需要写：

```scss
[data-theme="dark"] {
  --cursor-default: url("/cursors/ori/dark-normal.cur");
}
```

## 第五步：设置默认光标

最基础的写法是：

```scss
html,
body {
  cursor: var(--cursor-default), auto;
}
```

这里有两个关键点。

第一，写在 `html, body` 上，可以覆盖大多数普通区域。

第二，`auto` 是回退值。

完整的 cursor URL 写法必须带一个通用回退类型：

```scss
cursor: url("/cursors/ori/normal.cur"), auto;
```

如果浏览器无法加载这个文件，或者不支持该格式，就会使用 `auto`。

## 第六步：给链接和按钮设置指针光标

链接、按钮、工具栏按钮、导航按钮都应该使用链接选择光标：

```scss
a,
button,
[role="button"],
summary,
.tool-dock__button,
.tool-dock__trigger,
.tool-modal__options button,
.tool-modal__footer button,
.article-pagination button,
.floating-search__trigger,
.floating-search__panel a,
.book-note__summary a,
.vp-navbar a,
.vp-navbar button,
.vp-sidebar a {
  cursor: var(--cursor-link), pointer !important;
}
```

这里用了 `!important`，原因是项目中有一些组件自己写了：

```scss
cursor: pointer;
```

例如分页按钮、工具栏按钮、搜索按钮等。

如果不用 `!important`，组件内的局部样式可能会把全局光标覆盖掉。

## 第七步：给输入框设置文本光标

输入框、文本域、可编辑区域应该用文本选择光标：

```scss
input,
textarea,
select,
[contenteditable="true"],
.halo-search input,
.article-search__field input {
  cursor: var(--cursor-text), text !important;
}
```

`text` 是回退值。  
如果 `text.cur` 没加载成功，浏览器会回到系统文本光标。

这里包含了项目里的两个搜索输入：

- `.halo-search input`
- `.article-search__field input`

这样普通表单和自定义搜索组件都能显示同一套文本光标。

## 第八步：给禁用状态设置不可用光标

禁用按钮应该使用不可用光标：

```scss
[disabled],
button:disabled,
.article-pagination button:disabled {
  cursor: var(--cursor-not-allowed), not-allowed !important;
}
```

这里也保留了 `not-allowed` 回退。

`.ani` 动态光标在网页中不一定稳定，所以回退值很重要。

如果浏览器支持 `.ani`，会显示光标包里的不可用动画。  
如果不支持，至少还能显示系统的禁止光标。

## 第九步：给帮助和设置类按钮设置帮助光标

当前项目中，右下角工具栏的设置按钮和弹窗关闭按钮适合用帮助选择光标：

```scss
.tool-dock__button[aria-label*="设置"],
.tool-modal__close {
  cursor: var(--cursor-help), help !important;
}
```

这里使用了属性选择器：

```scss
[aria-label*="设置"]
```

它的含义是：匹配 `aria-label` 中包含“设置”的元素。

这样不需要给按钮额外加 class，也能精确选中设置按钮。

不过这个写法依赖中文文案。  
如果后续站点切换到英文，可以改成更稳定的类名，例如：

```html
<button class="tool-dock__button tool-dock__button--settings">
```

然后写：

```scss
.tool-dock__button--settings {
  cursor: var(--cursor-help), help !important;
}
```

## 第十步：去掉旧的 Canvas 光标效果

在接入真实鼠标光标前，项目里曾经使用过 canvas 光标拖尾组件，例如：

```text
docs/.vuepress/components/effects/SleekLineCursor.vue
```

这种组件的原理是：

- 页面上放一个全屏 canvas。
- 监听鼠标位置。
- 在 canvas 中绘制拖尾线条。
- 有些实现还会用 `cursor: none` 隐藏系统鼠标。

如果同时使用 canvas 光标和系统 cursor 文件，会出现两个问题：

- 用户会看到“真实鼠标 + canvas 拖尾”叠在一起。
- 如果组件里有 `cursor: none`，会把刚接入的 Ori 光标隐藏掉。

所以当前项目把 `SleekLineCursor` 从根组件中移除了。

原来类似这样：

```js
import SleekLineCursor from './components/effects/SleekLineCursor.vue'

export default defineClientConfig({
  rootComponents: [FloatingToolDock, SleekLineCursor, PageParticleBackdrop],
})
```

现在改成：

```js
import { defineClientConfig } from 'vuepress/client'

import PageParticleBackdrop from './components/effects/PageParticleBackdrop.vue'
import ArticleLoadingPage from './components/pages/ArticleLoadingPage.vue'
import BookShelf from './components/pages/BookShelf.vue'
import HomeExperience from './components/pages/HomeExperience.vue'
import ArticleSearch from './components/search/ArticleSearch.vue'
import FloatingToolDock from './components/ui/FloatingToolDock.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('ArticleLoadingPage', ArticleLoadingPage)
    app.component('ArticleSearch', ArticleSearch)
    app.component('BookShelf', BookShelf)
    app.component('HomeExperience', HomeExperience)
  },
  rootComponents: [FloatingToolDock, PageParticleBackdrop],
})
```

这样页面只使用浏览器原生 cursor，不再叠加 canvas 光标。

## 第十一步：为什么放在全局样式而不是组件样式

鼠标光标是全站体验，不是某个局部组件的样式。

如果把它写在组件的 scoped style 里，会遇到这些问题：

- scoped 样式只影响组件内部。
- 主题导航、侧栏、文章正文可能不在该组件作用域里。
- 动态生成的主题 DOM 不一定能被组件样式覆盖。

全局光标应该写在：

```text
docs/.vuepress/styles/index.scss
```

这样 VuePress 主题、自定义组件、Markdown 内容都会使用同一套光标规则。

## 第十二步：构建验证

修改完成后运行：

```bash
npm run docs:build
```

如果构建通过，说明：

- SCSS 语法没有问题。
- VuePress 能正常处理 public 静态资源。
- `client.js` 中的根组件配置没有错误。

构建完成后，还可以检查输出目录：

```text
docs/.vuepress/dist/cursors/ori/
```

这里应该能看到复制后的光标文件。

## 第十三步：本地预览检查

启动开发服务：

```bash
npm run docs:dev
```

然后打开：

```text
http://127.0.0.1:8080
```

重点检查这些位置：

- 页面空白区域是否显示 Ori 普通光标。
- 顶部导航链接是否显示 Ori 链接光标。
- 搜索输入框是否显示 Ori 文本光标。
- 右下角工具栏按钮是否显示 Ori 链接光标。
- 禁用分页按钮是否显示不可用光标。
- 设置按钮或弹窗关闭按钮是否显示帮助光标。

如果没有变化，优先检查浏览器缓存。  
光标文件常常会被缓存，刷新页面不一定立即重新加载。

可以尝试：

- 强制刷新：`Ctrl + F5`
- 打开浏览器开发者工具后勾选 Disable cache
- 修改文件名后重新引用

## 第十四步：兼容性说明

网页中的自定义光标有几个限制。

### `.cur` 更稳定

`.cur` 是静态光标，适合作为主要方案。

当前项目中这些状态都优先使用 `.cur`：

```text
normal.cur
link.cur
text.cur
move.cur
resize-x.cur
resize-y.cur
resize-diagonal-1.cur
resize-diagonal-2.cur
```

### `.ani` 不一定稳定

`.ani` 是 Windows 动态光标格式。

在 Windows 系统中安装主题时，它通常能正常使用。  
但在网页 CSS 中，不同浏览器对 `.ani` 的支持并不完全一致。

所以 `.ani` 后面必须写通用回退：

```scss
cursor: var(--cursor-not-allowed), not-allowed !important;
```

如果动态光标不生效，浏览器会显示系统 `not-allowed` 光标。

### 光标图片不要太大

浏览器对自定义 cursor 图片尺寸有限制。  
如果图片太大，可能会直接失效并回退到系统光标。

当前 `.cur` 文件约 4KB，体积很小，比较适合网页使用。

## 第十五步：完整实现代码

当前项目最终使用的核心代码如下。

`docs/.vuepress/styles/index.scss`：

```scss
:root {
  --cursor-default: url("/cursors/ori/normal.cur");
  --cursor-link: url("/cursors/ori/link.cur");
  --cursor-text: url("/cursors/ori/text.cur");
  --cursor-help: url("/cursors/ori/help.ani");
  --cursor-alternate: url("/cursors/ori/alternate.cur");
  --cursor-move: url("/cursors/ori/move.cur");
  --cursor-resize-x: url("/cursors/ori/resize-x.cur");
  --cursor-resize-y: url("/cursors/ori/resize-y.cur");
  --cursor-resize-diagonal-1: url("/cursors/ori/resize-diagonal-1.cur");
  --cursor-resize-diagonal-2: url("/cursors/ori/resize-diagonal-2.cur");
  --cursor-wait: url("/cursors/ori/wait.ani");
  --cursor-progress: url("/cursors/ori/progress.ani");
  --cursor-not-allowed: url("/cursors/ori/not-allowed.ani");
}

html,
body {
  cursor: var(--cursor-default), auto;
}

a,
button,
[role="button"],
summary,
.tool-dock__button,
.tool-dock__trigger,
.tool-modal__options button,
.tool-modal__footer button,
.article-pagination button,
.floating-search__trigger,
.floating-search__panel a,
.book-note__summary a,
.vp-navbar a,
.vp-navbar button,
.vp-sidebar a {
  cursor: var(--cursor-link), pointer !important;
}

input,
textarea,
select,
[contenteditable="true"],
.halo-search input,
.article-search__field input {
  cursor: var(--cursor-text), text !important;
}

[disabled],
button:disabled,
.article-pagination button:disabled {
  cursor: var(--cursor-not-allowed), not-allowed !important;
}

.tool-dock__button[aria-label*="设置"],
.tool-modal__close {
  cursor: var(--cursor-help), help !important;
}
```

`docs/.vuepress/client.js`：

```js
import { defineClientConfig } from 'vuepress/client'

import PageParticleBackdrop from './components/effects/PageParticleBackdrop.vue'
import ArticleLoadingPage from './components/pages/ArticleLoadingPage.vue'
import BookShelf from './components/pages/BookShelf.vue'
import HomeExperience from './components/pages/HomeExperience.vue'
import ArticleSearch from './components/search/ArticleSearch.vue'
import FloatingToolDock from './components/ui/FloatingToolDock.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('ArticleLoadingPage', ArticleLoadingPage)
    app.component('ArticleSearch', ArticleSearch)
    app.component('BookShelf', BookShelf)
    app.component('HomeExperience', HomeExperience)
  },
  rootComponents: [FloatingToolDock, PageParticleBackdrop],
})
```

## 常见问题

### 为什么我改了光标文件但页面没变化

通常是缓存。

光标文件属于静态资源，浏览器可能会缓存。  
可以强制刷新，或者临时改文件名验证。

### 为什么 `.ani` 没有动画

浏览器不一定支持 `.ani`。  
这不是 VuePress 的问题，而是浏览器对 cursor 格式的支持差异。

稳定方案是优先使用 `.cur`，把 `.ani` 只用于增强体验。

### 为什么按钮还是系统手型

可能是组件局部样式覆盖了全局 cursor。

解决方式是提高选择器优先级，或者像当前项目这样加：

```scss
cursor: var(--cursor-link), pointer !important;
```

### 为什么之前的流线光标还在

检查 `client.js` 的 `rootComponents`。

如果还挂载了 canvas 光标组件，例如：

```js
SleekLineCursor
```

就会和系统 cursor 同时出现。  
如果只想使用 Ori 鼠标主题，就应该移除这个 root component。

## 总结

VuePress 替换页面鼠标光标的核心流程是：

1. 准备 `.cur` 或 `.ani` 光标文件。
2. 把文件复制到 `docs/.vuepress/public`。
3. 使用英文文件名，避免 URL 编码问题。
4. 在全局 SCSS 中定义 cursor 变量。
5. 给普通区域、链接、输入框、禁用状态分别设置 cursor。
6. 移除旧的 canvas 光标组件，避免两套光标叠加。
7. 构建并本地预览验证。

这个方案不依赖额外 npm 包，也不需要复杂 JavaScript。  
只要光标文件能被浏览器访问，CSS `cursor` 就能完成大部分页面鼠标替换需求。

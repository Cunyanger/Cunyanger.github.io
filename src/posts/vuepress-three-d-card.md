---
title: ThreeDCard.vue 组件逐步说明
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - 组件
  - 交互动效
isOriginal: true
excerpt: 逐步拆解 ThreeDCard.vue 的模板结构、数据处理、鼠标事件和 3D 样式实现。
---

# ThreeDCard.vue 组件逐步说明

`ThreeDCard.vue` 是首页文章列表里的文章卡片组件。它接收一条文章数据，负责展示标题、日期、分类、摘要、封面和阅读时间，并在鼠标悬停时生成带光斑、倾斜和层级景深的 3D 交互效果。

组件位置：

```text
docs/.vuepress/components/ui/ThreeDCard.vue
```

## 第一步：接收文章数据

组件通过 `defineProps` 接收一个必填的 `item` 对象：

```js
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})
```

这个对象由首页组件传入，主要包含：

- `date`：文章日期。
- `category`：文章分类。
- `title`：文章标题。
- `excerpt`：文章摘要。
- `preview`：没有封面时的预览文本。
- `readingTime`：阅读时间。
- `cover`：封面图片地址。
- `link`：文章真实链接。

这一步的作用是把卡片组件做成可复用 UI。组件本身不负责查文章列表，只负责渲染传进来的单条文章数据。

## 第二步：保存卡片主体 DOM 引用

```js
const bodyRef = ref(null)
```

`bodyRef` 绑定到模板里的卡片主体：

```vue
<span ref="bodyRef" class="three-d-card__body">
```

后面的鼠标事件需要直接修改这个主体元素的 `classList`、`transform` 和 CSS 变量，所以这里先用 `ref` 保存 DOM 引用。

## 第三步：把文章链接转成加载页链接

```js
const loadingLink = computed(() => withBase(`/loading/?to=${encodeURIComponent(props.item.link)}`))
```

卡片最外层是一个链接：

```vue
<a class="three-d-card" :href="loadingLink">
```

这里没有直接跳到文章页，而是跳到 `/loading/` 中间页，并把真实文章地址放进 `to` 参数。

这一步的作用是让用户点击文章时先进入加载动画页，再由加载页跳转到目标文章。`encodeURIComponent` 用来处理路径里的特殊字符，`withBase` 用来兼容 VuePress 站点部署在子路径下的情况。

## 第四步：处理封面图片路径

```js
const coverSrc = computed(() => {
  const cover = props.item.cover

  if (!cover) return ''
  if (/^(https?:)?\/\//.test(cover) || cover.startsWith('data:')) return cover

  return withBase(cover)
})
```

这段逻辑分三种情况：

- 没有 `cover`：返回空字符串，模板会显示文本预览。
- `http`、`https`、协议相对地址或 `data:` 图片：直接使用原地址。
- 站内相对路径：用 `withBase` 补上 VuePress 的 base 路径。

这样组件既能显示外链图片，也能显示放在 `public` 目录里的本地图片。

## 第五步：渲染卡片内容

模板里的主体内容分成五块：

```vue
<span class="three-d-card__meta">{{ item.date }} / {{ item.category }}</span>
<strong>{{ item.title }}</strong>
<span class="three-d-card__excerpt">{{ item.excerpt }}</span>
```

这三块显示文章基础信息：日期、分类、标题和摘要。

封面区域根据 `coverSrc` 判断显示图片还是文本：

```vue
<span class="three-d-card__preview" :class="{ 'has-cover': coverSrc }">
  <img v-if="coverSrc" :src="coverSrc" :alt="item.title" />
  <span v-else>{{ item.preview || item.excerpt }}</span>
</span>
```

底部显示阅读时间和访问按钮：

```vue
<span class="three-d-card__footer">
  <span>{{ item.readingTime }}</span>
  <span class="three-d-card__visit">Visit</span>
</span>
```

这一步的作用是完成卡片的信息层级：上方是元信息和标题，中间是摘要与视觉预览，下方是阅读时间和操作入口。

## 第六步：鼠标进入时标记交互状态

```js
const handlePointerEnter = () => {
  bodyRef.value?.classList.add('is-pointer-inside')
}
```

模板绑定了 `pointerenter`：

```vue
@pointerenter="handlePointerEnter"
```

鼠标进入卡片后，组件给主体元素加上 `is-pointer-inside` 类。CSS 会根据这个类把标题、摘要、封面和底部信息向 Z 轴推出，形成层级感。

## 第七步：鼠标移动时计算倾斜角度

```js
const handlePointerMove = (event) => {
  const body = bodyRef.value

  if (!body) return

  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left - rect.width / 2) / 25
  const y = (event.clientY - rect.top - rect.height / 2) / 25

  body.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`
  body.style.setProperty('--card-glow-x', `${event.clientX - rect.left}px`)
  body.style.setProperty('--card-glow-y', `${event.clientY - rect.top}px`)
}
```

这一步做了两件事。

第一，计算鼠标相对卡片中心点的位置。鼠标越靠右，`x` 越大；鼠标越靠下，`y` 越大。除以 `25` 是为了降低旋转幅度，避免卡片晃动过强。

第二，把计算结果写进样式：

- `rotateY(${x}deg)` 控制左右方向的 3D 倾斜。
- `rotateX(${y}deg)` 控制上下方向的 3D 倾斜。
- `--card-glow-x` 和 `--card-glow-y` 控制光斑出现的位置。

## 第八步：鼠标离开或获得焦点时重置卡片

```js
const resetCard = (event) => {
  const body = bodyRef.value

  if (!body) return

  body.classList.remove('is-pointer-inside')
  body.style.transform = 'rotateY(0deg) rotateX(0deg)'
  body.style.setProperty('--card-glow-x', '50%')
  body.style.setProperty('--card-glow-y', '0%')
}
```

重置逻辑会移除交互类，并把旋转角度和光斑位置恢复到初始状态。

鼠标离开时调用：

```js
const handlePointerLeave = (event) => {
  resetCard(event)
}
```

模板中同时绑定了：

```vue
@pointerleave="handlePointerLeave"
@focus="resetCard"
```

这样鼠标离开后卡片会回正；键盘焦点进入时也会先归位，避免保留上一次鼠标移动产生的角度。

## 第九步：建立 3D 空间

最外层 `.three-d-card` 设置了透视距离：

```css
.three-d-card {
  perspective: 620px;
}
```

主体元素启用 3D 子元素渲染：

```css
.three-d-card__body {
  transform-style: preserve-3d;
  transition: transform 200ms linear, border-color 180ms ease, box-shadow 180ms ease;
}
```

`perspective` 决定用户看到的 3D 透视强度，`transform-style: preserve-3d` 让子元素的 `translateZ` 生效。没有这两项，后续标题、摘要和图片的 Z 轴位移就不会形成明显景深。

## 第十步：用 CSS 变量控制跟随光斑

主体元素默认设置光斑位置：

```css
.three-d-card__body {
  --card-glow-x: 50%;
  --card-glow-y: 0%;
}
```

伪元素用这两个变量生成径向渐变：

```css
.three-d-card__body::before {
  background: radial-gradient(
    circle at var(--card-glow-x) var(--card-glow-y),
    rgba(255, 255, 255, 0.62),
    transparent 30%
  );
}
```

鼠标移动时 JavaScript 会不断更新 `--card-glow-x` 和 `--card-glow-y`，所以光斑会跟着鼠标位置移动。

## 第十一步：悬停时推出不同层级

组件通过 `translateZ` 把不同内容推到不同深度：

```css
.three-d-card:hover strong,
.three-d-card__body.is-pointer-inside strong {
  transform: translateZ(50px);
}

.three-d-card:hover .three-d-card__excerpt,
.three-d-card__body.is-pointer-inside .three-d-card__excerpt {
  transform: translateZ(60px);
}

.three-d-card:hover .three-d-card__preview img,
.three-d-card__body.is-pointer-inside .three-d-card__preview img {
  transform: translateZ(100px);
}
```

这些层级让图片最靠前，摘要和标题次之，底部信息更靠后。配合卡片主体的旋转，就会产生类似立体卡片的效果。

## 第十二步：区分有封面和无封面状态

当有封面时，模板会给预览区加上 `has-cover`：

```vue
:class="{ 'has-cover': coverSrc }"
```

CSS 中会关闭无封面状态使用的渐变背景和网格纹理：

```css
.three-d-card__preview.has-cover {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.three-d-card__preview.has-cover::before,
.three-d-card__preview.has-cover::after {
  display: none;
}
```

这样有封面时重点展示图片；无封面时则用渐变背景、网格纹理和预览文本补足视觉区域。

## 第十三步：处理深色模式

组件针对暗色主题单独覆盖主体背景和阴影：

```css
[data-theme="dark"] .three-d-card__body {
  border-color: rgba(148, 163, 184, 0.18);
  box-shadow: 0 24px 58px rgba(0, 0, 0, 0.26);
}
```

这一步的作用是让卡片在浅色主题和深色主题下都有合适的对比度。

## 第十四步：兼容触屏和减少动效设置

最后的媒体查询处理两类场景：

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

- `hover: none`：触屏设备通常没有稳定的悬停状态，禁用复杂 hover 动画。
- `prefers-reduced-motion: reduce`：用户系统设置了减少动效时，关闭过渡动画。

这一步能减少移动端误触问题，也能照顾对动效敏感的用户。

## 整体执行流程

组件运行时可以按这个顺序理解：

1. 首页把一条文章对象传给 `ThreeDCard`。
2. 组件计算加载页链接 `loadingLink`。
3. 组件计算封面地址 `coverSrc`。
4. 模板渲染文章元信息、标题、摘要、预览区和底部按钮。
5. 鼠标进入时添加 `is-pointer-inside`。
6. 鼠标移动时计算卡片倾斜角度，并更新光斑位置。
7. CSS 根据 hover、focus 和 `is-pointer-inside` 把内容推向不同 Z 轴层级。
8. 鼠标离开或焦点进入时重置卡片状态。
9. 触屏设备或减少动效场景下关闭主要动画。

## 可以继续优化的点

- `item` 可以补充更明确的类型校验，避免字段缺失时页面显示空值。
- `resetCard` 当前没有使用 `event` 参数，可以去掉参数让函数更简洁。
- `Visit` 箭头如果出现乱码，建议把伪元素的 `content` 改成明确的 ASCII 字符或 HTML 实体。
- 鼠标倾斜方向可以根据视觉习惯微调，例如把 `rotateX` 改成负值，让卡片向鼠标方向倾斜。

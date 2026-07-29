---
title: VuePress 读书栏目和 Inspira UI Book 组件实现详解
date: 2026-07-18
category: VuePress
cover: https://gcore.jsdelivr.net/gh/Cunyanger/pic_bed@master/images/rain_sta_b.png
tag:
  - VuePress
  - Inspira UI
  - 组件
  - 样式
isOriginal: true
excerpt: 记录如何新增读书栏目，移植 Inspira UI Book 组件，并用《1984》创建第一篇读书笔记。
---

# VuePress 读书栏目和 Inspira UI Book 组件实现详解

这次新增了一个独立的读书栏目：

```text
/books/
```

每条读书笔记不使用普通 card，而是使用 Inspira UI 的 `Book` 组件作为书籍视觉入口。当前示例是 George Orwell 的《1984》。

相关文件：

```text
docs/books/README.md
docs/.vuepress/components/pages/BookShelf.vue
docs/.vuepress/components/ui/book/Book.vue
docs/.vuepress/components/ui/book/BookHeader.vue
docs/.vuepress/components/ui/book/BookTitle.vue
docs/.vuepress/components/ui/book/BookDescription.vue
docs/.vuepress/components/ui/book/index.js
docs/.vuepress/components/ui/halo-search/HaloSearch.vue
```

## 第一步：从官方 registry 获取 Book 组件

Inspira UI 的 Book 组件在官方 registry 中由五个文件组成：

```text
ui/book/Book.vue
ui/book/BookHeader.vue
ui/book/BookTitle.vue
ui/book/BookDescription.vue
ui/book/index.ts
```

官方组件的核心设计包括：

- `Book`：3D 书本主体。
- `BookHeader`：封面顶部标签区域。
- `BookTitle`：封面标题。
- `BookDescription`：封面描述。
- `index.ts`：尺寸、圆角、阴影、颜色映射和导出入口。

当前项目没有 Tailwind CSS 和 `@inspira-ui/plugins`，所以移植时保留了官方组件结构、props、尺寸映射、阴影映射和 3D 层级，但把 Tailwind utility class 改成了 scoped CSS。

## 第二步：保留官方 props 设计

`Book.vue` 支持这些 props：

```js
const props = defineProps({
  class: {
    type: [String, Array, Object],
    default: "",
  },
  duration: {
    type: Number,
    default: 1000,
  },
  color: {
    type: String,
    default: "zinc",
  },
  isStatic: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: "md",
  },
  radius: {
    type: String,
    default: "md",
  },
  shadowSize: {
    type: String,
    default: "lg",
  },
});
```

这些参数分别控制：

- `duration`：hover 翻转动画时长。
- `color`：书籍封面的渐变色。
- `isStatic`：是否默认保持打开角度。
- `size`：书本尺寸。
- `radius`：圆角大小。
- `shadowSize`：背面投影强度。

保留这些 props 后，以后可以继续按 Inspira UI 的使用方式配置每本书。

## 第三步：建立尺寸、圆角、阴影和颜色映射

`index.js` 中维护组件配置：

```js
export const BOOK_SIZE_MAP = {
  sm: { width: "180px", spineTranslation: "152px" },
  md: { width: "220px", spineTranslation: "192px" },
  lg: { width: "260px", spineTranslation: "232px" },
  xl: { width: "300px", spineTranslation: "272px" },
};
```

`width` 控制书本正面宽度，`spineTranslation` 控制书页侧边的位置。书本要有 3D 厚度，侧边页不能简单贴在左侧，而是需要通过 `translateX(...) rotateY(90deg)` 放到书脊位置。

阴影映射：

```js
export const BOOK_SHADOW_SIZE_MAP = {
  sm: "-5px 0 15px 5px var(--shadowColor)",
  md: "-7px 0 25px 7px var(--shadowColor)",
  lg: "-10px 0 35px 10px var(--shadowColor)",
  xl: "-12px 0 45px 12px var(--shadowColor)",
};
```

这个阴影主要用于书本背面，增强厚度和空间感。

## 第四步：Book 的三层 3D 结构

Book 组件内部有三层视觉结构：

```vue
<div class="book-stage">
  <div class="book-cover book-cover--front">
    <slot />
  </div>

  <div class="book-pages" />

  <div class="book-cover book-cover--back" />
</div>
```

对应含义：

- `book-cover--front`：书本正面封面。
- `book-pages`：侧边书页。
- `book-cover--back`：书本背面。

父级使用：

```css
.book-stage {
  transform-style: preserve-3d;
}
```

这样正面、侧边页、背面才能在 3D 空间里各自占位。

## 第五步：实现 hover 翻转

```css
.book-root:hover .book-stage,
.book-stage.is-static {
  transform: rotateY(-30deg);
}
```

普通状态下书本正对用户。hover 时整体向左旋转 `-30deg`，侧边书页露出来，看起来像一本有厚度的书。

如果传入 `isStatic`，书本会一直保持这个角度：

```vue
<Book is-static />
```

## 第六步：实现封面和书页厚度

封面正面向前推：

```css
transform: translateZ(25px);
```

背面向后推：

```css
transform: translateZ(-25px);
```

侧边书页旋转到 90 度：

```js
transform: `translateX(${computedSize.spineTranslation}) rotateY(90deg)`;
```

这三步组合起来，书本就不再是平面图片，而是一个有正面、背面和侧边厚度的 3D 对象。

## 第七步：添加封面书脊高光

封面左侧的书脊高光来自一层渐变：

```css
.book-spine-highlight {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  min-width: 8.2%;
  opacity: 0.2;
  background: linear-gradient(...), linear-gradient(...);
}
```

这层高光模拟纸质书脊上的折痕、暗部和反光。没有它，封面会更像一张普通矩形图片。

## 第八步：创建读书栏目首页

读书栏目页面文件：

```text
docs/books/README.md
```

内容很简单：

```md
---
title: 读书
article: false
sidebar: false
breadcrumb: false
toc: false
pageInfo: false
lastUpdated: false
contributors: false
containerClass: books-page
---

<BookShelf />
```

`article: false` 用来避免这个栏目页被当作普通文章收录。

## 第九步：把每本书写成 Markdown

读书笔记不写死在 `BookShelf.vue` 中，而是放到 `docs/books/` 目录下。比如《1984》：

```text
docs/books/1984.md
```

frontmatter 示例：

```md
---
title: 1984
date: 2026-07-18
article: false
category: 读书
bookCategory: 反乌托邦
bookAuthor: George Orwell
bookColor: zinc
bookCover: https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg
tag:
  - 读书
  - 反乌托邦
isOriginal: true
excerpt: 读《1984》时最值得记录的，不只是高压社会的想象，而是语言、历史、记忆和个人判断如何被系统性改变。
---
```

这些字段的作用：

- `title`：书名，也会显示在读书列表中。
- `bookAuthor`：作者。
- `bookCategory`：读书栏目里的分类。
- `bookColor`：没有封面时的 Book 渐变色。
- `bookCover`：真实书籍封面图。
- `excerpt`：读书列表中的摘要。
- `article: false`：不进入普通文章列表，保持读书栏目独立。

## 第十步：从路由读取 books 目录

`BookShelf.vue` 使用 `useRoutes()` 读取所有页面路由，再筛选 `/books/` 下的 Markdown。因为 `article: false` 的页面在 `route.meta` 里只保留基础信息，所以需要调用路由的 `loader()` 读取完整 `_pageData.frontmatter`：

```js
const loadBooks = async () => {
  const bookRoutes = Object.entries(routes.value)
    .filter(([link, route]) => link.startsWith('/books/') && link !== '/books/' && route.meta?.title)
  const loadedBooks = await Promise.all(
    bookRoutes.map(async ([link, route]) => {
      const module = await route.loader()
      const pageData = module._pageData || {}
      const frontmatter = pageData.frontmatter || {}

      return {
        link,
        title: pageData.title || route.meta.title,
        author: frontmatter.bookAuthor || frontmatter.author || '未知作者',
        category: frontmatter.bookCategory || frontmatter.category || '读书',
        cover: normalizeAsset(frontmatter.bookCover || frontmatter.cover),
        bookColor: frontmatter.bookColor || 'zinc',
        excerpt: frontmatter.excerpt || pageData.excerpt || '',
      }
    })
  )

  books.value = loadedBooks.sort(...)
}
```

这样 `bookCover` 会真正来自每篇 Markdown 的 frontmatter。后续新增读书笔记时，只要添加新的 Markdown 文件，不需要修改列表页面模板。

## 第十一步：用 Book 渲染每条读书笔记

列表中每一条都使用 `Book` 组件：

```vue
<Book
  :color="book.bookColor"
  size="lg"
  radius="lg"
  shadow-size="xl"
  :cover="book.cover"
  :cover-alt="book.title"
>
  <BookHeader>
    <span v-for="tag in book.tags" :key="tag" class="book-badge">{{ tag }}</span>
  </BookHeader>
  <BookTitle>{{ book.title }}</BookTitle>
  <BookDescription>{{ book.author }}</BookDescription>
</Book>
```

`book.cover` 来自 Markdown frontmatter 的 `bookCover`。如果配置了封面，Book 正面会显示真实书封；如果没有封面，则回退到 `bookColor` 对应的渐变封面。

## 第十二步：在标题下方加入 Halo Search

读书页标题下方使用 Inspira UI 的 `HaloSearch` 搜索框：

```vue
<HaloSearch
  v-model="searchKeyword"
  class="book-shelf__search"
  placeholder="搜索书名..."
  aria-label="搜索书名"
/>
```

搜索框的输入值只过滤书名：

```js
const filteredBooks = computed(() => {
  const keyword = searchKeyword.value.trim().toLocaleLowerCase("zh-CN");

  if (!keyword) return books.value;

  return books.value.filter((book) =>
    book.title.toLocaleLowerCase("zh-CN").includes(keyword),
  );
});
```

模板中渲染 `filteredBooks`：

```vue
<article v-for="book in filteredBooks" :key="book.link" class="book-note">
```

当前项目没有 Nuxt Icon，所以 Halo Search 保留官方光环、边框、hover/focus 动画结构，只把官方示例里的图标替换成内联搜索 SVG。

## 第十三步：注册页面组件

在 `client.js` 中注册 `BookShelf`：

```js
import BookShelf from "./components/pages/BookShelf.vue";

export default defineClientConfig({
  enhance({ app }) {
    app.component("BookShelf", BookShelf);
  },
});
```

这样 Markdown 页面里就可以直接使用：

```vue
<BookShelf />
```

## 第十四步：添加导航入口

在 `config.js` 的 navbar 中加入：

```js
{ text: '读书', link: '/books/' }
```

这样顶部导航会出现独立的读书栏目入口。

## 完整实现流程

新增读书栏目的流程可以总结为：

1. 从 Inspira UI registry 获取 Book 组件结构。
2. 保留 `Book / BookHeader / BookTitle / BookDescription / index` 的拆分方式。
3. 保留官方 props、尺寸映射、阴影映射和颜色名称。
4. 把 Tailwind utility 改成当前项目可运行的 scoped CSS。
5. 新增 `BookShelf.vue` 组织读书笔记列表。
6. 新增 `docs/books/README.md` 作为独立栏目页。
7. 把每本书写成 `docs/books/*.md`。
8. 在 frontmatter 中配置作者、分类、封面和摘要。
9. 用 `useRoutes()` 自动读取 `/books/` 下的读书笔记。
10. 在标题下方加入 `HaloSearch`。
11. 用 `filteredBooks` 按书名过滤列表。
12. 在 `client.js` 注册 `BookShelf`。
13. 在 `config.js` 加入 `读书` 导航。
14. 用《1984》写第一条示例读书笔记。

后续新增读书笔记时，只需要创建新的 Markdown 文件，例如：

```text
docs/books/the-little-prince.md
```

读书栏目会自动把它渲染成一条 Book 读书笔记。

---
title: VuePress 支持导图：用 Markmap 写可交互思维导图
date: 2026-07-21
category: VuePress
tag:
  - VuePress
  - Markmap
  - 导图
  - Markdown
isOriginal: true
excerpt: 记录在 VuePress Theme Hope 博客中开启 Markmap 导图支持的配置方式、依赖安装、Markdown 写法、使用场景和常见问题。
---

# VuePress 支持导图：用 Markmap 写可交互思维导图

## 背景

博客文章里经常需要表达层级关系，例如学习路线、系统架构、排查流程、知识目录。普通列表能表达结构，但不够直观；图片导图又不好维护，每次改内容都要重新截图。

更适合技术博客的方式是：直接在 Markdown 中写导图源码，由 VuePress 在页面中渲染成交互式导图。

本博客使用的是：

```text
VuePress 2
vuepress-theme-hope
@vuepress/plugin-markdown-chart
Markmap
```

Theme Hope 已经集成了 `@vuepress/plugin-markdown-chart`，只需要安装 Markmap 相关运行依赖并打开配置。

## 最终效果

下面这段就是实际渲染的导图：

```markmap
---
markmap:
  colorFreezeLevel: 2
---

# VuePress 导图支持

## 安装依赖

### markmap-lib
### markmap-view
### markmap-toolbar

## 开启配置

### docs/.vuepress/config.js
### markdown.markmap = true

## 编写文章

### 使用 ```markmap 代码块
### 用 Markdown 标题表达层级
### 支持折叠、缩放、拖拽

## 构建验证

### npm run docs:build
### 检查 dist 产物
```

## 安装依赖

Markmap 是 `@vuepress/plugin-markdown-chart` 的可选能力，因此需要额外安装三个 peer 依赖：

```sh
npm install -D markmap-lib markmap-view markmap-toolbar
```

安装完成后，`package.json` 中会出现：

```json
{
  "devDependencies": {
    "markmap-lib": "...",
    "markmap-toolbar": "...",
    "markmap-view": "..."
  }
}
```

## 开启 VuePress 配置

修改：

```text
docs/.vuepress/config.js
```

在 `hopeTheme` 配置中增加 `markdown.markmap`：

```js
import { viteBundler } from '@vuepress/bundler-vite'
import { hopeTheme } from 'vuepress-theme-hope'

export default {
  lang: 'zh-CN',
  title: 'My Space',
  bundler: viteBundler(),
  theme: hopeTheme({
    markdown: {
      markmap: true,
    },
  }),
}
```

当前博客中保留了原来的主题配置，只新增这一段：

```js
markdown: {
  markmap: true,
},
```

## Markdown 写法

导图使用代码块：

````md
```markmap
# 学习路线

## 基础
### Markdown
### VuePress
### Frontmatter

## 进阶
### 主题配置
### 插件扩展
### 构建部署
```
````

规则很简单：

- `#` 是中心节点。
- `##` 是一级分支。
- `###` 是二级分支。
- 层级越深，导图分支越细。
- 内容仍然是 Markdown，维护成本比图片低。

## Markmap 参数

可以在 `markmap` 代码块顶部加 frontmatter：

````md
```markmap
---
markmap:
  colorFreezeLevel: 2
  maxWidth: 240
---

# RAG 学习路线

## 文档处理
### 解析
### 清洗
### 分块

## 检索
### 向量检索
### BM25
### Rerank
```
````

常用参数：

| 参数 | 说明 |
| --- | --- |
| `colorFreezeLevel` | 固定前几层颜色，便于区分主分支 |
| `maxWidth` | 节点最大宽度 |
| `duration` | 展开、收起动画时长 |
| `initialExpandLevel` | 初始展开层级 |

具体参数由 Markmap 支持，VuePress 只是负责把代码块交给 Markmap 渲染。

## 适合写什么

导图适合表达“层级清晰”的内容：

- 学习路线
- 知识体系
- 项目模块
- 排查流程
- 文章提纲
- 架构分层
- 技术选型树

例如 RAG 知识体系：

```markmap
# RAG 知识体系

## 离线索引
### 文档解析
### 数据清洗
### Chunking
### Embedding
### 向量库

## 在线问答
### Query Rewrite
### Hybrid Search
### Rerank
### Prompt
### Citation

## 工程治理
### 权限过滤
### Prompt Injection 防护
### 评估集
### 日志追踪
```

## 和 Mermaid mindmap 的区别

VuePress Theme Hope 的图表插件也支持 Mermaid。Mermaid 也有 `mindmap` 语法，但两者侧重点不同：

| 方案 | 特点 |
| --- | --- |
| Markmap | Markdown 风格强，适合写文章大纲和知识树，交互体验好 |
| Mermaid mindmap | Mermaid 生态统一，适合已经大量使用 Mermaid 的文档 |

如果主要目标是“把 Markdown 标题树变成导图”，Markmap 更顺手。

## 构建验证

修改配置和文章后执行：

```sh
npm run docs:build
```

构建成功后，检查产物：

```text
docs/.vuepress/dist/posts/vuepress-markmap-mindmap-guide.html
```

如果页面中导图没有渲染，优先检查：

1. 是否安装了 `markmap-lib`、`markmap-view`、`markmap-toolbar`。
2. 是否在 `hopeTheme` 中配置了 `markdown.markmap: true`。
3. 代码块语言是否写成了 `markmap`。
4. 代码块内是否至少有一个 `#` 标题节点。
5. 浏览器控制台是否有依赖加载错误。

## 当前项目改动

本次博客项目改动如下：

```text
package.json
package-lock.json
docs/.vuepress/config.js
docs/posts/vuepress-markmap-mindmap-guide.md
docs/posts/README.md
```

核心配置：

```js
theme: hopeTheme({
  markdown: {
    markmap: true,
  },
})
```

之后写文章时，只要使用 ` ```markmap ` 代码块，就可以直接插入导图。

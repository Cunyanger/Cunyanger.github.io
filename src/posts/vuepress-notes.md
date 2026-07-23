---
title: VuePress 使用笔记
date: 2026-07-17
category: VuePress
tag:
  - VuePress
  - 前端
isOriginal: true
excerpt: 整理 VuePress 站点配置、主题、导航、搜索和构建命令。
---

# VuePress 使用笔记

VuePress 适合用 Markdown 维护内容，再构建成静态站点。它的核心优势是简单、可版本管理、部署成本低。

## 常用命令

本地开发：

```powershell
npm run docs:dev
```

生产构建：

```powershell
npm run docs:build
```

清理缓存后启动：

```powershell
npm run docs:clean-dev
```

## 内容组织

当前项目把文章放在 `docs/posts` 下：

```text
docs/
  README.md
  posts/
    README.md
    getting-started.md
    vuepress-notes.md
    workflow.md
```

`docs/README.md` 是首页，`docs/posts/README.md` 是文章索引。

## 后续可以扩展

当文章变多后，可以继续加入评论、全文搜索、RSS、站点地图和自动部署。

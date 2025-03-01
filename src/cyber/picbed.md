---
# 这是文章的标题
title: Github+PicGo 搭建图床
# 你可以自定义封面图片
cover:
# 这是页面的图标
icon: mdi:image-multiple-outline
# 这是侧边栏的顺序
order: 0
# 一个页面可以有多个分类
category:
  - 使用指南
# 一个页面可以有多个标签
tag:
  - 博客
  - 图床
# 此页面会在文章列表置顶
sticky: true
# 此页面会出现在星标文章中
star: true
---

github 作为云存储，jsDeliv 作为 CDN，PicGo 充作为图片 git push 工具

<!-- more -->

## Github

[https://github.com/](https://link.zhihu.com/?target=https%3A//github.com/)

### 新建 Repository

可以创建一个`images`文件夹，在 CDN 中图片所在项目目录填写`images`

### 创建访问令牌

**Settings** --> **Developer settings**--> **Personal access tokens** --> **New personal access token** --> **copy token**

::: tip token 权限

- 打开所有权限

:::

## jsDelivr

[https://www.jsdelivr.com/?docs=gh](https://link.zhihu.com/?target=https%3A//www.jsdelivr.com/%3Fdocs%3Dgh)

·https://cdn.jsdelivr.net/gh/github用户名/仓库名称@分支/图片所在项目目录·

## PicGo

PicList使用更加方便，也支持Typora

---

## 遇到问题

使用代理可能出现 picGo 上传图片失败的情况，需要关闭代理上传文件

可以使用 PicList 删除云端的图片，PicGo 能删除云端图片，会出现图片名重复的问题

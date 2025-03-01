## 官方文档

[首页 | VuePress (vuejs.press)](https://vuejs.press/zh/)

[主页 | vuepress-theme-hope](https://theme-hope.vuejs.press/zh/)

https://cunyanger.github.io/blog/

## 项目结构

```
.
├── .github (可选的) → GitHub 配置文件存放路径
│    └── workflow → GitHub 工作流配置
│         └── docs-deploy.yml → 自动部署文档的工作流
│
├── src → 文档文件夹
│    │
│    ├── .vuepress (可选的) → VuePress 配置文件夹
│    │    │
│    │    ├── dist (默认的) → 构建输出目录
│    │    │
│    │    ├── public (可选的) → 静态资源目录
│    │    │
│    │    ├── styles (可选的) → 用于存放样式相关的文件
│    │    │
│    │    ├── config.{js,ts} (可选的) → 配置文件的入口文件
│    │    │
│    │    └── client.{js,ts} (可选的) → 客户端文件
│    │
│    ├── ... → 其他项目文档
│    │
│    └── README.md → 项目主页
│
└── package.json → Nodejs 配置文件
```



## git使用SSH连接仓库

1. ssh连接github需要修改设置 ` ~/.ssh/config`

``````
# GitHub Account
Host github.com
HostName ssh.github.com
Port 443
PreferredAuthentications publickey
IdentityFile <path to your private ssh key>
``````

2. 修改后测试连接

```shell 
ssh -T -p 443 git@ssh.github.com
```



## .gitignore文件

```
node_modules
# VuePress 默认临时文件目录
docs/.vuepress/.temp
# VuePress 默认缓存目录
docs/.vuepress/.cache
# VuePress 默认构建生成的静态文件目录
docs/.vuepress/dist
```



## 修改配置文件

出现部署后无样式问题需要再配置文件中设置 `base`属性， `/blog/` 为git仓库名称

```js
base: "/blog/",
```

>## [部署到 GitHub Pages](https://theme-hope.vuejs.press/zh/get-started/deploy.html#部署到-github-pages)
>
>如果你在使用模板，且在创建过程中选择了创建自动部署文档的 GitHub 工作流，那么你唯一要做的就是设置正确的 [base 选项](https://vuejs.press/zh/reference/config.html#base)。
>
>- 如果你准备发布到 `https://<USERNAME>.github.io/`，你必须将整个项目上传至 `https://github.com/<USERNAME>/<USERNAME>.github.io` 仓库。在这种情况下你无需进行任何更改，因为 base 默认就是 `"/"`。
>- 如果你的仓库地址是一个普通的形如 `https://github.com/<USERNAME>/<REPO>` 的格式，网站将会被发布到 `https://<USERNAME>.github.io/<REPO>/` ，也就是说，你需要将 base 设置为 `"/<REPO>/"`。
>- 当操作完成后，你应该前往 GitHub 仓库的设置页面，选择 `gh-pages` 作为 GitHub Pages 的源。

## 打包部署脚本 deploy.sh

```sh
#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# 生成静态文件
npm run docs:build

# 进入生成的文件夹
cd docs/.vuepress/dist

# 如果是发布到自定义域名
# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'deploy'

# 发布到 git@github.com:<username>/<repos-name>.git master:<branch>
 git push -f git@github.com:Cunyanger/blog.git master:gh-pages


```



## 部署命令

```sh
sh deploy.sh
```


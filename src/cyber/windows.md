---
title: 命令激活Windows、Office
icon: ri:windows-fill
category:
  - 使用指南
tag:
  - 激活
  - Windows
  - Office

# 此页面会在文章列表置顶
sticky: true

---

<!-- more -->

**联网情况下，以管理员模式启动PowerShell,复制以下命令到Powershell窗口, 回车**

```sh
irm https://get.activated.win | iex
```

```sh
     Activation Methods: 激活方法

 [1] HWID        |  Windows             |   Permanent 永久
 [2] Ohook       |  Office              |   Permanent 永久
 [3] TSforge     |  Windows/Office/ESU  |   Permanent 永久, 2025年2月19日新增，最新的3.0版才有
 [4] KMS38       |  Windows             |   Year 2038 到2038年
 [5] Online KMS  |  Windows / Office    |   180 Days 180天
 __________________________________________________

 [6] Check Activation Status 检查激活状态
 [7] Change Windows Edition 改Windows版本
 [8] Change Office Edition 改Office版本
 __________________________________________________

 [9] Troubleshoot 疑难排解
 [E] Extras 附加选项
 [H] Help 帮助
 [0] Exit 退出
 ______________________________________________________

      用键盘输入选择项，方括号中为可选项 [1,2,3,4,5,6,7,8,9,E,H,0] :
```

**看到 Successful关闭窗口即可**,对于不能成功的，尝试选3[【TSforge激活方式详解】](https://www.500599.xyz/posts/win/mas-tsforge/)方式

转自：

[一行命令永久激活Win11,Win10，Office, 无需找激活码，无需下载安装；目前看到最最简单，安全，可靠的激活方法，开源免费，一直有效 - jopny - 博客园](https://www.cnblogs.com/jopny/p/window_office_onekey_activate_free.html)

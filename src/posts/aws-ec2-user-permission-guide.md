---
title: 亚马逊 EC2 服务器账号与权限分配实战指南
date: 2026-07-20
category: 云服务器
tag:
  - AWS
  - EC2
  - Linux
  - SSH
  - 权限管理
isOriginal: true
excerpt: 以“我买了一台亚马逊 EC2 服务器，要给 B 开通可使用账号”为场景，讲清楚 IAM、Linux 用户、SSH 密钥、sudo 权限和回收权限的完整流程。
---

# 亚马逊 EC2 服务器账号与权限分配实战指南

假设你购买了一台亚马逊云服务器，也就是 AWS EC2。现在你想让另一个人 B 使用这台服务器，但又不想把自己的主账号、root 权限或私钥直接交给对方。

正确做法不是“把自己的 `.pem` 私钥发给 B”，而是根据 B 要做的事情，给他分配合适的账号和权限。

这篇文章按一个实际场景展开：

> 我有一台 EC2 Linux 服务器，要让 B 可以登录服务器、部署或维护项目，但不能随意控制我的 AWS 账号和其他云资源。

## 先分清两类权限

在 AWS 上谈“给别人使用服务器”，至少要区分两层权限。

第一层是 AWS 控制台权限，也就是 IAM 权限。

它决定 B 能不能登录 AWS 控制台，能不能查看 EC2 实例，能不能重启服务器，能不能改安全组，能不能创建磁盘、快照、负载均衡等云资源。

第二层是服务器系统权限，也就是 Linux 用户权限。

它决定 B 能不能通过 SSH 登录这台机器，登录后能访问哪些目录，能不能运行 `sudo`，能不能重启 Nginx、Docker、Node.js 服务，能不能修改系统配置。

很多权限事故都来自这两层混在一起：

- B 只是要部署代码，却拿到了你的 AWS root 账号。
- B 只是要登录服务器，却拿到了你的主 SSH 私钥。
- B 只需要维护一个项目目录，却被加入了完整 `sudo` 管理员组。

实际操作时，应该按最小权限原则分配：只给完成任务所需的权限，不多给。

## 推荐方案

如果 B 只是要使用服务器，例如上传代码、启动服务、查看日志，推荐做法是：

1. 不给 B 你的 AWS root 账号。
2. 不给 B 你的 EC2 主私钥。
3. 让 B 自己生成 SSH 密钥对。
4. 你在服务器上创建一个 Linux 用户，例如 `buser`。
5. 把 B 的 SSH 公钥放到 `buser` 的 `authorized_keys`。
6. 根据需要决定是否给 `sudo` 权限。
7. 用项目目录、用户组和 systemd/Docker 权限控制 B 能操作的范围。

如果 B 还需要管理 AWS 控制台里的 EC2，例如查看实例状态、重启实例、修改安全组，那么再额外创建 IAM 用户或使用 IAM Identity Center，并授予有限的 AWS 权限。

## 第一步：确认你能登录服务器

你作为服务器所有者，先用现有密钥登录 EC2。

Amazon Linux 常见默认用户是 `ec2-user`：

```bash
ssh -i my-key.pem ec2-user@your-server-public-ip
```

Ubuntu 镜像常见默认用户是 `ubuntu`：

```bash
ssh -i my-key.pem ubuntu@your-server-public-ip
```

不同 AMI 的默认用户名可能不同。登录失败时，先确认用户名、密钥文件、服务器公网 IP、安全组 `22` 端口是否正确。

## 第二步：让 B 生成自己的 SSH 密钥

让 B 在自己的电脑上生成一对 SSH 密钥。

macOS、Linux、Windows PowerShell 都可以使用：

```bash
ssh-keygen -t ed25519 -C "b@example.com"
```

如果某些旧环境不支持 ED25519，也可以使用 RSA：

```bash
ssh-keygen -t rsa -b 4096 -C "b@example.com"
```

生成后，B 会得到两个文件：

```text
id_ed25519      私钥，B 自己保管，不能发给别人
id_ed25519.pub  公钥，可以发给你
```

B 应该只把 `.pub` 公钥内容发给你。你不需要、也不应该索要 B 的私钥。

查看公钥内容：

```bash
cat ~/.ssh/id_ed25519.pub
```

公钥一般长这样：

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExamplePublicKey b@example.com
```

## 第三步：在服务器上创建 B 的 Linux 用户

你登录服务器后，创建一个单独用户。这里用 `buser` 举例。

```bash
sudo adduser buser
```

在部分 Amazon Linux 系统上，也可以使用：

```bash
sudo useradd -m -s /bin/bash buser
```

确认用户家目录存在：

```bash
ls -ld /home/buser
```

给每个人创建独立系统用户的好处是：

- 可以独立管理 SSH 公钥。
- 可以通过用户和用户组控制文件权限。
- 可以从日志里区分是谁执行了操作。
- 离职或合作结束时，可以单独禁用这个用户。

## 第四步：给 B 配置 SSH 公钥

切换到 root 权限或使用 `sudo` 创建 `.ssh` 目录：

```bash
sudo mkdir -p /home/buser/.ssh
sudo chmod 700 /home/buser/.ssh
```

把 B 发给你的公钥写入 `authorized_keys`。

```bash
sudo nano /home/buser/.ssh/authorized_keys
```

粘贴 B 的公钥，一行一个公钥。保存后设置权限：

```bash
sudo chmod 600 /home/buser/.ssh/authorized_keys
sudo chown -R buser:buser /home/buser/.ssh
```

现在 B 可以这样登录：

```bash
ssh -i ~/.ssh/id_ed25519 buser@your-server-public-ip
```

如果服务器绑定了域名，也可以使用：

```bash
ssh -i ~/.ssh/id_ed25519 buser@server.example.com
```

## 第五步：决定是否给 B sudo 权限

创建用户后，B 默认通常不是管理员。是否给 `sudo` 权限，要看他的工作范围。

### 场景一：B 只维护一个项目

如果 B 只需要维护 `/var/www/myapp` 或 `/home/buser/app`，不要给完整 `sudo` 权限。

可以创建项目目录并把所有权交给 B：

```bash
sudo mkdir -p /var/www/myapp
sudo chown -R buser:buser /var/www/myapp
```

B 登录后就能在这个目录下上传代码、拉取 Git 仓库、安装项目依赖。

如果项目由 systemd 管理，建议你自己先写好服务文件，只给 B 查看日志或重启指定服务的能力。

### 场景二：B 需要执行完整服务器维护

如果 B 需要安装软件、修改 Nginx、重启 Docker、调整系统服务，可以给 `sudo` 权限。

Ubuntu 常用：

```bash
sudo usermod -aG sudo buser
```

Amazon Linux、CentOS、RHEL 常用：

```bash
sudo usermod -aG wheel buser
```

B 重新登录后检查：

```bash
groups
sudo whoami
```

如果返回 `root`，说明 `sudo` 可用。

完整 `sudo` 权限风险很高，等同于让 B 可以成为 root。除非 B 是可信管理员，否则不要随意开放。

### 场景三：B 只允许重启某个服务

更精细的方式是用 sudoers 限制 B 只能执行指定命令。

例如只允许 B 重启和查看 `myapp`：

```bash
sudo visudo -f /etc/sudoers.d/buser-myapp
```

写入：

```text
buser ALL=(root) NOPASSWD: /bin/systemctl restart myapp.service, /bin/systemctl status myapp.service, /bin/journalctl -u myapp.service
```

保存后，B 可以执行：

```bash
sudo systemctl restart myapp.service
sudo systemctl status myapp.service
sudo journalctl -u myapp.service
```

这种方式比加入完整管理员组更安全。

不同系统里 `systemctl` 和 `journalctl` 的路径可能不同，可以用下面命令确认：

```bash
which systemctl
which journalctl
```

sudoers 语法写错可能影响 sudo 使用，所以一定要用 `visudo`，不要直接用普通编辑器修改 sudoers。

## 第六步：控制项目目录权限

如果服务器上有多个项目，建议按项目创建目录和用户组。

例如你有一个项目目录：

```text
/srv/apps/blog
```

可以创建项目组：

```bash
sudo groupadd blogteam
sudo usermod -aG blogteam buser
```

把目录分配给这个组：

```bash
sudo mkdir -p /srv/apps/blog
sudo chown -R root:blogteam /srv/apps/blog
sudo chmod -R 775 /srv/apps/blog
```

这样属于 `blogteam` 的用户可以读写这个项目目录，但不一定能操作其他项目。

如果你希望新建文件自动继承目录所属组，可以给目录加 setgid 位：

```bash
sudo chmod g+s /srv/apps/blog
```

对多人协作服务器来说，用户组比“大家共用一个账号”更容易管理。

## 第七步：如果使用 Docker，要谨慎分配 docker 组

很多项目会用 Docker 部署。你可能会想让 B 执行：

```bash
docker ps
docker compose up -d
```

这时需要注意：把用户加入 `docker` 组，通常等同于给了接近 root 的能力。因为 Docker 可以挂载宿主机目录、启动特权容器，权限边界很容易被绕过。

如果你确认 B 是可信维护者，可以执行：

```bash
sudo usermod -aG docker buser
```

B 重新登录后生效。

如果只是让 B 发布一个固定应用，更建议你封装好部署脚本，或限制他只能重启指定 systemd 服务。

## 第八步：是否需要给 B AWS 控制台权限

如果 B 只需要 SSH 进入服务器，不需要 AWS 控制台账号。

只有当 B 需要做下面这些事时，才考虑给 AWS 控制台权限：

- 查看 EC2 实例状态
- 启动、停止或重启实例
- 修改安全组端口
- 查看 CloudWatch 日志或监控
- 管理 EBS 磁盘、快照、弹性 IP

这类权限应该通过 IAM 分配，而不是共享你的 AWS root 账号。

基本原则：

1. root 账号只用于极少数账号级操作。
2. 日常管理使用 IAM 用户、角色或 IAM Identity Center。
3. 给 B 绑定最小权限策略。
4. 开启多因素认证 MFA。
5. 不给 B 创建长期 Access Key，除非他确实需要通过程序调用 AWS API。

例如，B 只需要查看 EC2 实例，不应该给 `AdministratorAccess`。可以给只读权限，或写一个限制资源范围的自定义策略。

如果 B 还需要通过 EC2 Instance Connect 登录服务器，则需要 IAM 授权让他向实例临时推送 SSH 公钥。AWS 文档说明，EC2 Instance Connect 会把 SSH 公钥临时推送到实例元数据中，通常用于短时间登录，而不是长期维护 `authorized_keys`。

## 第九步：安全组和防火墙

服务器账号创建好了，B 仍然可能连不上。常见原因是 AWS 安全组没有开放 SSH。

在 EC2 安全组里，入站规则至少要允许：

```text
Type: SSH
Protocol: TCP
Port: 22
Source: B 的公网 IP/32
```

不要把 SSH 长期开放给所有 IP：

```text
0.0.0.0/0
```

更好的做法是只允许你和 B 的固定公网 IP。如果 B 的 IP 经常变化，可以考虑 VPN、堡垒机、AWS Systems Manager Session Manager 或 EC2 Instance Connect。

服务器内部如果启用了 `ufw`、`firewalld` 或其他防火墙，也要确认 `22` 端口没有被拦截。

## 第十步：给 B 的连接说明模板

你可以把下面这段发给 B。

```text
服务器地址：your-server-public-ip 或 server.example.com
登录用户：buser
登录方式：SSH 公钥登录

请先生成 SSH 密钥：
ssh-keygen -t ed25519 -C "你的邮箱"

把公钥发给我：
~/.ssh/id_ed25519.pub

我配置完成后，你使用下面命令登录：
ssh -i ~/.ssh/id_ed25519 buser@your-server-public-ip

你的项目目录：
/srv/apps/blog

你可以执行：
cd /srv/apps/blog
git pull
npm install
npm run build

如果需要重启服务：
sudo systemctl restart myapp.service
```

具体命令要按你的服务器地址、项目目录和部署方式调整。

## 第十一步：如何回收 B 的权限

合作结束或 B 不再需要使用服务器时，要及时回收权限。

如果只是暂停登录，可以锁定账号：

```bash
sudo usermod -L buser
```

如果使用 SSH 公钥登录，建议同时清空或删除他的公钥：

```bash
sudo rm /home/buser/.ssh/authorized_keys
```

如果要彻底删除用户：

```bash
sudo deluser buser
```

在 Amazon Linux、CentOS、RHEL 上常用：

```bash
sudo userdel buser
```

如果要连家目录一起删除：

```bash
sudo userdel -r buser
```

删除前先确认是否有重要代码、配置或日志在他的家目录下。

还要检查：

- 是否从 `sudo` 或 `wheel` 组移除。
- 是否删除 `/etc/sudoers.d/` 下给他的规则。
- 是否从项目用户组移除。
- 是否回收 AWS IAM 用户或权限。
- 是否删除不再需要的 Access Key。
- 是否从安全组里移除 B 的 IP。

## 常见错误

不要把自己的 EC2 `.pem` 私钥发给别人。私钥一旦泄露，你很难确认是否被复制。

不要多人共用 `ec2-user`、`ubuntu` 或 `root`。共用账号很难追踪责任，也不方便单独回收权限。

不要默认给所有人完整 `sudo` 权限。能用项目目录权限解决的，就不要给系统管理员权限。

不要把 AWS root 账号当成日常协作账号。root 账号权限太大，应该只用于少数账号级操作。

不要长期开放 SSH 到 `0.0.0.0/0`。至少限制来源 IP，更进一步可以使用 VPN、堡垒机或 Session Manager。

## 一套推荐落地流程

如果你只是想让 B 使用你买的 EC2 服务器，可以按下面流程执行：

1. 让 B 生成 SSH 密钥，并把公钥发给你。
2. 你用自己的密钥登录 EC2。
3. 创建 `buser` 用户。
4. 把 B 的公钥写入 `/home/buser/.ssh/authorized_keys`。
5. 给 B 分配项目目录权限。
6. 根据需要决定是否给 `sudo`、指定 sudoers 命令或 Docker 权限。
7. 安全组只允许必要 IP 访问 `22` 端口。
8. 把登录命令、项目目录和可执行操作发给 B。
9. 定期检查用户、SSH 公钥、sudoers、IAM 权限和安全组。
10. 合作结束后删除公钥、锁定或删除用户，并回收 IAM 权限。

## 参考资料

- [AWS EC2：管理 Amazon EC2 Linux 实例上的系统用户](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/managing-users.html)
- [AWS EC2：使用 SSH 连接 Linux 实例](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-linux-instance.html)
- [AWS EC2：EC2 key pairs 与 Linux authorized_keys](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [AWS IAM：安全最佳实践与最小权限](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS IAM：访问密钥最佳实践](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)

## 总结

给别人使用你的亚马逊 EC2 服务器，核心不是共享账号，而是拆分权限。

AWS IAM 管云平台权限，Linux 用户管服务器登录权限，目录、用户组、sudoers、Docker 组和安全组再进一步限制具体操作范围。只要按“独立账号、独立公钥、最小权限、可回收”的思路设计，就能让别人顺畅使用服务器，同时把风险控制在可接受范围内。

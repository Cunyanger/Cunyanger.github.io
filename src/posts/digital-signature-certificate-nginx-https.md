---
title: 一文搞懂数字签名、数字证书与 Nginx HTTPS 反向代理
date: 2026-07-20
category: 网络与安全
tag:
  - HTTPS
  - Nginx
  - 数字签名
  - 数字证书
  - 反向代理
isOriginal: true
excerpt: 从数字签名和数字证书讲起，理解 HTTPS 信任链、Nginx 如何通过反向代理绑定 HTTPS 域名，以及一台服务器如何托管多个 HTTPS 子域名。
---

# 一文搞懂数字签名、数字证书与 Nginx HTTPS 反向代理

很多人第一次配置 HTTPS 时，会同时遇到几个看起来分散的问题：

- 数字签名到底签了什么？
- 数字证书为什么能证明一个网站可信？
- Nginx 为什么可以把 `api.example.com` 转发到后端服务？
- 一台服务器为什么能同时跑多个 HTTPS 子域名？

这些问题本质上都围绕一件事：客户端如何确认自己正在和正确的服务器通信，并把请求交给正确的后端应用。

## 先理解数字签名

数字签名解决的不是“加密内容”，而是两个更关键的问题：

1. 内容有没有被篡改。
2. 内容是不是某个私钥持有者发出来的。

它通常会配合哈希算法和非对称加密使用。

假设 Alice 要给 Bob 发一份文件：

1. Alice 先对文件做哈希，得到摘要。
2. Alice 用自己的私钥对摘要进行签名。
3. Alice 把原文和签名一起发给 Bob。
4. Bob 用 Alice 的公钥验证签名。
5. Bob 再对收到的原文做一次哈希，比对验证结果。

如果验证通过，说明两件事：

- 原文没有被改过，因为内容一变，哈希摘要就会变。
- 签名确实来自 Alice 的私钥，因为只有对应私钥才能生成可被 Alice 公钥验证的签名。

这里要注意：签名通常不直接处理整份大文件，而是处理文件的哈希摘要。这样效率更高，也更符合签名的目标。

## 数字证书解决了什么问题

数字签名依赖一个前提：你拿到的公钥必须是真的。

如果攻击者把自己的公钥伪装成 `example.com` 的公钥发给你，那么后续签名验证依然可能“看起来正确”。所以还需要一个可信第三方来证明：

> 这个域名确实绑定了这个公钥。

这个证明文件就是数字证书。

一个常见的 HTTPS 证书里通常包含：

- 域名，例如 `example.com` 或 `*.example.com`
- 公钥
- 证书持有者信息
- 签发者，也就是 CA
- 有效期
- 支持的域名列表，也就是 SAN
- CA 对证书内容生成的数字签名

浏览器信任证书，并不是因为它天然相信这个网站，而是因为它信任操作系统或浏览器内置的根 CA。根 CA 可以签发中间 CA，中间 CA 再签发网站证书，这就形成了证书链。

浏览器访问 `https://example.com` 时，会检查：

1. 证书是不是由可信 CA 签发。
2. 证书链是否完整。
3. 证书是否在有效期内。
4. 当前访问的域名是否包含在证书的域名范围里。
5. 证书是否被吊销或存在明显风险。

这些检查通过后，浏览器才会认为这个站点身份可信。

## HTTPS 握手在做什么

HTTPS 可以理解为 HTTP 跑在 TLS 之上。TLS 负责身份验证、密钥协商和加密传输。

一次简化的 HTTPS 连接大致如下：

1. 浏览器连接服务器的 `443` 端口。
2. 浏览器发送 TLS ClientHello，其中包含支持的 TLS 版本、加密套件和要访问的域名。
3. 服务器根据域名选择对应证书并返回给浏览器。
4. 浏览器验证证书是否可信。
5. 双方协商出本次连接使用的会话密钥。
6. 后续 HTTP 请求和响应都通过这个会话密钥加密传输。

这里有一个很重要的点：浏览器会在 TLS 握手阶段告诉服务器自己要访问哪个域名，这个机制叫 SNI。

如果没有 SNI，同一个 IP 和端口上很难区分多个 HTTPS 域名，因为服务器必须先选择证书，才能继续 TLS 握手。有了 SNI，Nginx 就可以根据域名选择不同的证书和不同的站点配置。

## Nginx 如何通过反向代理绑定 HTTPS 域名

Nginx 常见的职责是站在公网入口处，处理 HTTPS 连接，然后把请求转发给内网或本机端口上的应用服务。

这个模式叫反向代理。

例如：

- 用户访问 `https://api.example.com`
- DNS 把 `api.example.com` 解析到服务器公网 IP
- Nginx 监听服务器的 `443` 端口
- Nginx 根据 `server_name api.example.com` 命中对应配置
- Nginx 使用该域名的证书完成 TLS 握手
- Nginx 把解密后的 HTTP 请求转发到 `127.0.0.1:3000`

后端应用可以只监听本机端口，不直接暴露公网 HTTPS。HTTPS 证书、TLS 配置、域名路由都由 Nginx 统一处理。

一个最小的 HTTPS 反向代理配置如下：

```nginx
server {
    listen 80;
    server_name api.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

这段配置里，`server_name` 负责绑定域名，`ssl_certificate` 和 `ssl_certificate_key` 负责绑定证书，`proxy_pass` 负责绑定后端服务。

## 一台服务器如何管理多个 HTTPS 子域名

一台服务器管理多个 HTTPS 子域名，通常依赖三件事：

1. DNS：多个子域名都解析到同一台服务器。
2. SNI：TLS 握手时让 Nginx 知道客户端访问的是哪个域名。
3. Nginx `server` 块：为每个域名配置独立证书和代理目标。

比如你有三个服务：

- `api.example.com` 转发到 `127.0.0.1:3000`
- `admin.example.com` 转发到 `127.0.0.1:8080`
- `blog.example.com` 转发到 `127.0.0.1:8081`

DNS 可以这样配置：

```text
api.example.com    A    203.0.113.10
admin.example.com  A    203.0.113.10
blog.example.com   A    203.0.113.10
```

如果使用 CNAME，也可以让多个子域名指向同一个主机名：

```text
api.example.com    CNAME    server.example.com
admin.example.com  CNAME    server.example.com
blog.example.com   CNAME    server.example.com
```

Nginx 则通过多个 `server` 块区分域名：

```nginx
server {
    listen 80;
    server_name api.example.com admin.example.com blog.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.example.com;

    ssl_certificate /etc/letsencrypt/live/admin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name blog.example.com;

    ssl_certificate /etc/letsencrypt/live/blog.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blog.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

用户看到的是三个独立 HTTPS 网站，但在服务器内部，它们只是三个不同端口上的服务。

## 多子域名证书怎么选

管理多个 HTTPS 子域名时，证书通常有三种选择。

第一种是每个子域名单独申请证书：

```text
api.example.com
admin.example.com
blog.example.com
```

优点是隔离清晰，某个证书出问题不会影响其他域名。缺点是证书数量多，配置文件也更多。

第二种是申请通配符证书：

```text
*.example.com
```

它可以覆盖 `api.example.com`、`admin.example.com`、`blog.example.com` 这类一级子域名。注意它通常不能覆盖 `a.b.example.com` 这种更深层级的子域名，也不能自动覆盖根域名 `example.com`，根域名需要单独包含。

第三种是申请 SAN 证书，在同一张证书里写多个域名：

```text
example.com
api.example.com
admin.example.com
blog.example.com
```

这种方式适合域名数量相对固定的场景。

如果使用 Let's Encrypt，常见做法是用 Certbot 申请和续期证书。续期后需要 reload Nginx，让 Nginx 读取新的证书文件。

```bash
certbot --nginx -d api.example.com -d admin.example.com -d blog.example.com
certbot renew --dry-run
nginx -t
systemctl reload nginx
```

如果是通配符证书，通常需要 DNS 验证，因为 CA 要确认你对整个域名区域有控制权。

## 反向代理里常见的几个请求头

Nginx 转发请求时，建议保留一些原始请求信息：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

它们分别表示：

- `Host`：用户访问的原始域名。
- `X-Real-IP`：直接连接 Nginx 的客户端 IP。
- `X-Forwarded-For`：代理链路上的客户端 IP 列表。
- `X-Forwarded-Proto`：用户访问 Nginx 时使用的是 `http` 还是 `https`。

很多后端框架需要这些信息来生成正确链接、记录真实访问 IP、判断是否启用安全 Cookie。

## 一个完整的访问链路

以 `https://admin.example.com/users` 为例：

1. 浏览器查询 DNS，得到服务器 IP。
2. 浏览器连接服务器 `443` 端口。
3. 浏览器通过 SNI 告诉服务器访问的是 `admin.example.com`。
4. Nginx 命中 `server_name admin.example.com` 的配置。
5. Nginx 返回 `admin.example.com` 对应证书。
6. 浏览器验证证书可信后完成 TLS 握手。
7. 浏览器发送加密的 HTTP 请求。
8. Nginx 解密请求，转发到 `127.0.0.1:8080/users`。
9. 后端服务返回响应给 Nginx。
10. Nginx 再通过 HTTPS 把响应返回给浏览器。

所以，域名绑定 HTTPS 并不意味着后端应用本身必须直接处理 HTTPS。实际生产中，很多服务都是由 Nginx 统一终止 HTTPS，再转发到本机或内网 HTTP 服务。

## 常见排查思路

如果配置后访问失败，可以按这个顺序检查：

1. DNS 是否解析到正确公网 IP。
2. 服务器安全组或防火墙是否开放 `80` 和 `443`。
3. Nginx 配置是否通过 `nginx -t`。
4. `server_name` 是否写对。
5. 证书是否包含当前访问的域名。
6. 后端服务是否正在监听对应端口。
7. `proxy_pass` 地址是否能从 Nginx 所在机器访问。
8. 应用是否正确处理代理头，例如 HTTPS 回调地址、安全 Cookie 和真实 IP。

证书错误通常优先看域名、证书链和有效期。502 错误通常优先看后端端口、进程状态和 `proxy_pass`。

## 总结

数字签名用私钥证明“内容没有被改过，并且确实来自某个私钥持有者”。数字证书进一步证明“这个公钥确实属于这个域名”。HTTPS 借助证书完成身份验证，再协商会话密钥保护传输内容。

Nginx 在 HTTPS 反向代理中负责公网入口：它根据 SNI 和 `server_name` 选择证书与站点配置，然后把请求转发给不同后端服务。一台服务器能承载多个 HTTPS 子域名，核心就是 DNS 指向同一 IP、Nginx 监听同一端口、不同 `server` 块按域名分流。

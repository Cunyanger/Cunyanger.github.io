---
title: MQTT TLS 证书签发与 EMQX 配置
date: 2026-08-10
category: SSL
tag:
  - SSL
isOriginal: true
excerpt: 结合EMQX案例学习CA证书

---

# MQTT TLS 证书签发与 EMQX 配置

本文档说明两种 MQTT TLS 证书方案：

- 推荐方案：使用私有 CA 签发 EMQX 服务端证书。
- 简化方案：直接生成服务端自签名证书。

当前后端通过 Paho MQTT 连接 `ssl://mqtt.ecoaxon.com:8883`，并读取 `backend/src/main/resources/certs/ca.crt` 作为信任证书。因此服务端证书变更后，后端信任的 `ca.crt` 必须同步更新，否则会出现：

```text
PKIX path building failed: unable to find valid certification path to requested target
```

## 方案选择

推荐使用“私有 CA + 服务端证书”：

- CA 证书长期稳定，后端只需要信任 CA。
- 服务端证书到期或重签时，只要仍由同一个 CA 签发，后端不需要更新 `ca.crt`。
- 后续如果需要双向 TLS，设备端证书也可以由同一个 CA 或专用设备 CA 签发。

仅在测试环境使用“服务端自签名证书”：

- 每次 EMQX 服务端证书变化，所有客户端都要重新信任新的服务端证书。
- 不适合多设备、多应用、生产部署。

## 单向 TLS 证书放置规则

单向 TLS 的含义是：客户端校验 EMQX 服务端证书，EMQX 不校验客户端证书。当前后端 Paho MQTT 连接属于单向 TLS。

### 私有 CA 签发服务端证书

服务器 EMQX 放置：

- `mqtt.ecoaxon.com.crt`：服务端证书，配置到 EMQX `certfile`。如果存在中间 CA，应使用 `fullchain.pem` 或把服务端证书和中间 CA 证书按顺序拼接到同一个文件。
- `mqtt.ecoaxon.com.key`：服务端私钥，配置到 EMQX `keyfile`。
- `ca.crt`：签发服务端证书的 CA 证书。单向 TLS 下 EMQX 不靠它校验客户端，但可以放在服务器上并配置到 `cacertfile`，方便后续切换到双向 TLS。

客户端携带或信任：

- `ca.crt`：客户端用它校验 EMQX 服务端证书。
- 客户端不需要携带 `mqtt.ecoaxon.com.crt`。
- 客户端不需要携带 `mqtt.ecoaxon.com.key`，服务端私钥绝不能分发给客户端。

当前后端项目中应把私有 CA 的 `ca.crt` 放到：

```text
backend/src/main/resources/certs/ca.crt
```

### 服务端自签名证书

服务器 EMQX 放置：

- `mqtt.ecoaxon.com.crt`：服务端自签名证书，配置到 EMQX `certfile`。
- `mqtt.ecoaxon.com.key`：服务端私钥，配置到 EMQX `keyfile`。

客户端携带或信任：

- `mqtt.ecoaxon.com.crt`：由于没有独立 CA，客户端需要直接信任服务端证书本身。
- 为了兼容当前后端代码，应把 `mqtt.ecoaxon.com.crt` 复制并命名为 `backend/src/main/resources/certs/ca.crt`。
- 客户端不需要也不能携带 `mqtt.ecoaxon.com.key`。

### 公共 CA 自动续期证书

服务器 EMQX 放置：

- `fullchain.pem`：公共 CA 签发的服务端完整证书链，配置到 EMQX `certfile`。
- `privkey.pem`：服务端私钥，配置到 EMQX `keyfile`。

客户端携带或信任：

- 普通系统客户端通常不需要额外携带证书，因为操作系统或 JVM 默认信任公共 CA。
- 当前后端代码显式创建了只包含 `certs/ca.crt` 的 trustStore，会覆盖 JVM 默认信任根。因此如果继续使用这段代码，需要把签发链对应的公共根 CA 或稳定中间 CA 放到 `backend/src/main/resources/certs/ca.crt`，或者改造代码让它使用 JVM 默认 trustStore。

### 速查表

| 方案 | EMQX `certfile` | EMQX `keyfile` | EMQX `cacertfile` | 客户端信任文件 |
| --- | --- | --- | --- | --- |
| 私有 CA | `mqtt.ecoaxon.com.crt` 或服务端 fullchain | `mqtt.ecoaxon.com.key` | `ca.crt` | `ca.crt` |
| 服务端自签名 | `mqtt.ecoaxon.com.crt` | `mqtt.ecoaxon.com.key` | 可不配或同证书 | `mqtt.ecoaxon.com.crt` |
| 公共 CA 自动续期 | `fullchain.pem` | `privkey.pem` | 通常不需要 | JVM/系统默认 CA，或项目指定的公共 CA |

## 准备目录

以下命令以 Linux shell 为例。Windows 可以使用 Git Bash、WSL 或安装 OpenSSL 后在 PowerShell 中执行等价命令。

```bash
mkdir -p certs
cd certs
```

本文使用的域名为：

```text
mqtt.ecoaxon.com
```

如果还有备用域名或内网地址，需要写入证书 SAN，例如：

```text
backup-mqtt.ecoaxon.com
127.0.0.1
192.168.1.10
```

现代 TLS 客户端主要校验 SAN，不要只依赖证书的 CN。

## 方案一：私有 CA 签发服务端证书

### 1. 生成 CA 私钥

```bash
openssl genrsa -out ca.key 4096
```

妥善保管 `ca.key`，它是签发所有证书的根私钥，不应放到 EMQX 服务器或代码仓库中。

### 2. 生成 CA 证书

```bash
openssl req -x509 -new -nodes \
  -key ca.key \
  -sha256 \
  -days 3650 \
  -out ca.crt \
  -subj "/C=AU/ST=NewSouthWales/L=Sydney/O=EcoAxon/OU=IoT/CN=EcoAxon MQTT Root CA" \
  -addext "basicConstraints=critical,CA:TRUE,pathlen:1" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -addext "subjectKeyIdentifier=hash"
```

生成结果：

- `ca.key`：CA 私钥，只用于签发证书。
- `ca.crt`：CA 证书，分发给后端、设备端、测试工具作为信任根。

### 3. 生成 EMQX 服务端私钥

```bash
openssl genrsa -out mqtt.ecoaxon.com.key 2048
```

### 4. 生成服务端 CSR

```bash
openssl req -new \
  -key mqtt.ecoaxon.com.key \
  -out mqtt.ecoaxon.com.csr \
  -subj "/C=AU/ST=NewSouthWales/L=Sydney/O=EcoAxon/OU=MQTT/CN=mqtt.ecoaxon.com"
```

### 5. 创建服务端证书扩展文件

创建 `server.ext`：

```ini
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
DNS.1=mqtt.ecoaxon.com
DNS.2=backup-mqtt.ecoaxon.com
IP.1=127.0.0.1
```

按实际情况调整 `DNS` 和 `IP`。如果客户端使用的是 `mqtt.ecoaxon.com`，则 `DNS.1` 必须包含 `mqtt.ecoaxon.com`。

### 6. 用 CA 签发服务端证书

```bash
openssl x509 -req \
  -in mqtt.ecoaxon.com.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out mqtt.ecoaxon.com.crt \
  -days 825 \
  -sha256 \
  -extfile server.ext
```

生成结果：

- `mqtt.ecoaxon.com.key`：EMQX 服务端私钥。
- `mqtt.ecoaxon.com.crt`：EMQX 服务端证书。
- `ca.crt`：客户端需要信任的 CA 证书。

### 7. 检查证书

```bash
openssl x509 -in mqtt.ecoaxon.com.crt -noout -subject -issuer -dates
openssl x509 -in mqtt.ecoaxon.com.crt -noout -text | grep -A 5 "Subject Alternative Name"
openssl verify -CAfile ca.crt mqtt.ecoaxon.com.crt
```

期望结果：

```text
mqtt.ecoaxon.com.crt: OK
```

## 方案二：服务端自签名证书

该方案没有独立 CA，服务端证书自己签自己。后端 `ca.crt` 需要放这个服务端证书本身。

### 1. 生成服务端自签名证书

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout mqtt.ecoaxon.com.key \
  -out mqtt.ecoaxon.com.crt \
  -days 825 \
  -sha256 \
  -subj "/C=AU/ST=NewSouthWales/L=Sydney/O=EcoAxon/OU=MQTT/CN=mqtt.ecoaxon.com" \
  -addext "basicConstraints=CA:FALSE" \
  -addext "keyUsage=digitalSignature,keyEncipherment" \
  -addext "extendedKeyUsage=serverAuth" \
  -addext "subjectAltName=DNS:mqtt.ecoaxon.com,DNS:backup-mqtt.ecoaxon.com,IP:127.0.0.1"
```

生成结果：

- `mqtt.ecoaxon.com.key`：EMQX 服务端私钥。
- `mqtt.ecoaxon.com.crt`：EMQX 服务端自签名证书。

后端需要信任此证书：

```bash
cp mqtt.ecoaxon.com.crt ../backend/src/main/resources/certs/ca.crt
```

## EMQX 配置：文件方式

以下配置适用于 EMQX 5 的 HOCON 配置风格。EMQX 官方文档中，MQTT SSL listener 默认使用 `8883`，TLS 监听器配置项为 `listeners.ssl.default`，证书路径位于 `ssl_options` 中。

### 1. 上传证书到 EMQX 服务器

建议目录：

```text
/opt/emqx/etc/certs/
```

复制文件：

```bash
sudo mkdir -p /opt/emqx/etc/certs
sudo cp ca.crt /opt/emqx/etc/certs/ca.crt
sudo cp mqtt.ecoaxon.com.crt /opt/emqx/etc/certs/mqtt.ecoaxon.com.crt
sudo cp mqtt.ecoaxon.com.key /opt/emqx/etc/certs/mqtt.ecoaxon.com.key
sudo chown -R emqx:emqx /opt/emqx/etc/certs
sudo chmod 600 /opt/emqx/etc/certs/mqtt.ecoaxon.com.key
sudo chmod 644 /opt/emqx/etc/certs/*.crt
```

如果是 Docker 部署，可以把宿主机目录挂载到容器：

```bash
docker run -d --name emqx \
  -p 1883:1883 \
  -p 8883:8883 \
  -p 18083:18083 \
  -v /data/emqx/certs:/opt/emqx/etc/certs \
  emqx/emqx:latest
```

生产环境不要直接使用 `latest`，应固定 EMQX 版本号。

### 2. 修改 EMQX 配置

编辑 EMQX 配置文件，例如：

```text
/opt/emqx/etc/base.hocon
```

添加或修改：

```hocon
listeners.ssl.default {
  bind = "0.0.0.0:8883"
  max_connections = 1024000

  ssl_options {
    cacertfile = "/opt/emqx/etc/certs/ca.crt"
    certfile = "/opt/emqx/etc/certs/mqtt.ecoaxon.com.crt"
    keyfile = "/opt/emqx/etc/certs/mqtt.ecoaxon.com.key"
    verify = verify_none
    fail_if_no_peer_cert = false
  }
}
```

这是单向 TLS，也就是客户端校验 EMQX 证书，EMQX 不校验客户端证书。当前后端 Paho 连接属于这种模式。

配置项说明：

- `bind`：TLS MQTT 监听地址和端口。
- `certfile`：EMQX 对外提供的服务端证书。如果使用中间 CA，需要把服务端证书和中间 CA 证书按顺序拼接到该文件中。
- `keyfile`：服务端证书对应的私钥。
- `cacertfile`：CA 证书。双向 TLS 时用于校验客户端证书；单向 TLS 中保留该配置也可以。
- `verify = verify_none`：不校验客户端证书。
- `fail_if_no_peer_cert = false`：客户端不提供证书时不拒绝连接。

### 3. 重启或热更新 EMQX

不同部署方式命令不同：

```bash
sudo systemctl restart emqx
```

或：

```bash
emqx ctl listeners
emqx ctl conf reload
```

如果是 Docker：

```bash
docker restart emqx
```

## EMQX 配置：Dashboard 方式

1. 登录 EMQX Dashboard，默认地址通常是：

```text
http://<emqx-host>:18083
```

2. 进入 `Management` -> `Listeners`。
3. 找到 SSL 类型的 MQTT listener，通常是 `ssl:default` 或监听端口 `8883`。
4. 编辑 Listener。
5. 配置证书文件：

```text
CA Certificate: /opt/emqx/etc/certs/ca.crt
Certificate:    /opt/emqx/etc/certs/mqtt.ecoaxon.com.crt
Private Key:    /opt/emqx/etc/certs/mqtt.ecoaxon.com.key
```

6. 单向 TLS 配置：

```text
Verify Peer: Disabled
Force Verify Peer Certificate: Disabled
```

7. 保存并确认 listener 状态为 Running。

## 可选：双向 TLS 配置

如果后续要求设备或后端必须使用客户端证书连接 EMQX，则需要启用 mTLS。

EMQX listener 配置改为：

```hocon
listeners.ssl.default {
  bind = "0.0.0.0:8883"

  ssl_options {
    cacertfile = "/opt/emqx/etc/certs/ca.crt"
    certfile = "/opt/emqx/etc/certs/mqtt.ecoaxon.com.crt"
    keyfile = "/opt/emqx/etc/certs/mqtt.ecoaxon.com.key"
    verify = verify_peer
    fail_if_no_peer_cert = true
  }
}
```

mTLS 下还需要为每个客户端签发客户端证书，并在 Paho 或设备端配置：

- 客户端证书。
- 客户端私钥。
- 用于校验 EMQX 服务端证书的 CA 证书。

当前后端代码只配置了 trustStore，没有配置 client keyStore，因此不支持 mTLS。启用 mTLS 前需要改后端 MQTT SSL 初始化逻辑。

## 长期证书方案

长期证书方案适合设备数量多、设备升级困难、MQTT broker 域名稳定、证书分发成本高的场景。

推荐做法不是生成一张超长期服务端自签名证书，而是：

- 建立一个长期私有 CA。
- 客户端长期信任这个 CA 的 `ca.crt`。
- EMQX 服务端证书由该 CA 签发。
- 服务端证书可以定期更换，只要签发 CA 不变，客户端不用更新信任证书。

### 证书有效期建议

- 私有 Root CA：`10` 年或更长，离线保存私钥。
- EMQX 服务端证书：`1` 到 `3` 年。封闭内网或设备升级极困难时可以更长，但风险也更高。
- 不建议把服务端私钥和 CA 私钥设置为同一把私钥。

### 实现步骤

1. 按“方案一：私有 CA 签发服务端证书”生成：

```text
ca.key
ca.crt
mqtt.ecoaxon.com.key
mqtt.ecoaxon.com.crt
```

2. EMQX 使用：

```text
certfile = /opt/emqx/etc/certs/mqtt.ecoaxon.com.crt
keyfile  = /opt/emqx/etc/certs/mqtt.ecoaxon.com.key
```

3. 后端和设备端信任：

```text
ca.crt
```

4. 当前后端项目复制：

```bash
cp ca.crt backend/src/main/resources/certs/ca.crt
```

5. 服务端证书到期前，重新签发新的 `mqtt.ecoaxon.com.crt`：

```bash
openssl req -new \
  -key mqtt.ecoaxon.com.key \
  -out mqtt.ecoaxon.com.csr \
  -subj "/C=AU/ST=NewSouthWales/L=Sydney/O=EcoAxon/OU=MQTT/CN=mqtt.ecoaxon.com"

openssl x509 -req \
  -in mqtt.ecoaxon.com.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out mqtt.ecoaxon.com.crt \
  -days 825 \
  -sha256 \
  -extfile server.ext
```

6. 覆盖 EMQX 服务端证书并重启或 reload：

```bash
sudo cp mqtt.ecoaxon.com.crt /opt/emqx/etc/certs/mqtt.ecoaxon.com.crt
sudo chown emqx:emqx /opt/emqx/etc/certs/mqtt.ecoaxon.com.crt
sudo systemctl restart emqx
```

只要仍由同一个 `ca.crt` 签发，后端不需要更新 `backend/src/main/resources/certs/ca.crt`。

### 长期方案的风险控制

- `ca.key` 离线保存，不放服务器。
- EMQX 服务器上只放服务端证书和服务端私钥。
- 服务端私钥泄露时，只需要重签服务端证书；CA 私钥泄露时必须替换所有客户端信任根。
- 定期记录证书指纹和有效期：

```bash
openssl x509 -in ca.crt -noout -subject -issuer -dates -fingerprint -sha256
openssl x509 -in mqtt.ecoaxon.com.crt -noout -subject -issuer -dates -fingerprint -sha256
```

## 自动续期证书方案

自动续期方案适合公网域名 `mqtt.ecoaxon.com`，并且服务器可以通过 HTTP-01 或 DNS-01 完成 ACME 校验的场景。常见实现是 Let’s Encrypt + Certbot 或 acme.sh。

### 推荐条件

- `mqtt.ecoaxon.com` 是公网可解析域名。
- EMQX 使用 `8883` 提供 MQTT TLS。
- 可以开放 `80` 端口做 HTTP-01，或能配置 DNS API 做 DNS-01。
- 后端和设备端能信任公共 CA。

如果大量设备不方便更新 CA 信任库，应优先使用“长期私有 CA 方案”，不要依赖公共 CA 链变化。

### 方案 A：Certbot HTTP-01

该方案要求 `mqtt.ecoaxon.com` 的 `80` 端口可以被 Let’s Encrypt 访问。MQTT 的 `8883` 不影响 HTTP-01 校验。

1. 安装 Certbot。

Ubuntu/Debian 示例：

```bash
sudo apt update
sudo apt install -y certbot
```

2. 签发证书。

如果服务器没有 Nginx/Apache 占用 `80` 端口：

```bash
sudo certbot certonly --standalone -d mqtt.ecoaxon.com
```

如果已有 Web 服务，可使用 webroot：

```bash
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d mqtt.ecoaxon.com
```

3. 证书路径通常为：

```text
/etc/letsencrypt/live/mqtt.ecoaxon.com/fullchain.pem
/etc/letsencrypt/live/mqtt.ecoaxon.com/privkey.pem
```

4. 配置 EMQX：

```hocon
listeners.ssl.default {
  bind = "0.0.0.0:8883"

  ssl_options {
    certfile = "/etc/letsencrypt/live/mqtt.ecoaxon.com/fullchain.pem"
    keyfile = "/etc/letsencrypt/live/mqtt.ecoaxon.com/privkey.pem"
    verify = verify_none
    fail_if_no_peer_cert = false
  }
}
```

5. 给 EMQX 用户读取权限。

不同系统权限策略不同。可以把证书同步到 EMQX 专用目录，避免直接放开 `/etc/letsencrypt`：

```bash
sudo mkdir -p /opt/emqx/etc/certs/letsencrypt
sudo cp /etc/letsencrypt/live/mqtt.ecoaxon.com/fullchain.pem /opt/emqx/etc/certs/letsencrypt/fullchain.pem
sudo cp /etc/letsencrypt/live/mqtt.ecoaxon.com/privkey.pem /opt/emqx/etc/certs/letsencrypt/privkey.pem
sudo chown -R emqx:emqx /opt/emqx/etc/certs/letsencrypt
sudo chmod 600 /opt/emqx/etc/certs/letsencrypt/privkey.pem
```

然后 EMQX 配置使用复制后的路径：

```hocon
ssl_options {
  certfile = "/opt/emqx/etc/certs/letsencrypt/fullchain.pem"
  keyfile = "/opt/emqx/etc/certs/letsencrypt/privkey.pem"
  verify = verify_none
  fail_if_no_peer_cert = false
}
```

6. 配置续期后部署 hook。

创建 `/usr/local/bin/deploy-emqx-cert.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

DOMAIN="mqtt.ecoaxon.com"
SRC="/etc/letsencrypt/live/${DOMAIN}"
DST="/opt/emqx/etc/certs/letsencrypt"

install -d -o emqx -g emqx "${DST}"
install -m 0644 -o emqx -g emqx "${SRC}/fullchain.pem" "${DST}/fullchain.pem"
install -m 0600 -o emqx -g emqx "${SRC}/privkey.pem" "${DST}/privkey.pem"

systemctl restart emqx
```

赋权：

```bash
sudo chmod +x /usr/local/bin/deploy-emqx-cert.sh
```

手动测试续期 hook：

```bash
sudo certbot renew --dry-run --deploy-hook /usr/local/bin/deploy-emqx-cert.sh
```

Certbot 通常会安装 systemd timer 自动续期。检查：

```bash
systemctl list-timers | grep certbot
```

### 方案 B：acme.sh DNS-01

DNS-01 适合不想开放 `80` 端口，或 broker 只开放 `8883` 的场景。需要域名 DNS 服务商 API 权限。

1. 安装 acme.sh：

```bash
curl https://get.acme.sh | sh
```

2. 配置 DNS API 环境变量。

不同 DNS 服务商变量不同。以下是占位示例：

```bash
export DNS_API_KEY="<dns-api-key>"
export DNS_API_SECRET="<dns-api-secret>"
```

3. 签发证书。

命令中的 `--dns` 参数需要替换为实际 DNS 插件，例如 Cloudflare、Aliyun、Route53 等：

```bash
~/.acme.sh/acme.sh --issue \
  --dns <dns-provider> \
  -d mqtt.ecoaxon.com
```

4. 安装证书到 EMQX 目录，并在续期后自动重启 EMQX：

```bash
sudo mkdir -p /opt/emqx/etc/certs/letsencrypt

~/.acme.sh/acme.sh --install-cert -d mqtt.ecoaxon.com \
  --fullchain-file /opt/emqx/etc/certs/letsencrypt/fullchain.pem \
  --key-file /opt/emqx/etc/certs/letsencrypt/privkey.pem \
  --reloadcmd "chown -R emqx:emqx /opt/emqx/etc/certs/letsencrypt && chmod 600 /opt/emqx/etc/certs/letsencrypt/privkey.pem && systemctl restart emqx"
```

5. EMQX 使用：

```hocon
ssl_options {
  certfile = "/opt/emqx/etc/certs/letsencrypt/fullchain.pem"
  keyfile = "/opt/emqx/etc/certs/letsencrypt/privkey.pem"
  verify = verify_none
  fail_if_no_peer_cert = false
}
```

### 自动续期下的后端处理

如果 EMQX 使用公共 CA 证书，后端有两种处理方式。

方式一，推荐：改后端 MQTT SSL 逻辑，使用 JVM 默认 trustStore。

当 `ssl://mqtt.ecoaxon.com:8883` 使用 Let’s Encrypt 等公共 CA 时，JVM 默认 trustStore 通常已经信任对应根 CA。后端不应再创建“只包含一个 `ca.crt` 的 trustStore”，否则会屏蔽 JVM 默认 CA。

方式二，保持当前代码：维护 `backend/src/main/resources/certs/ca.crt`。

此时 `ca.crt` 应放稳定的公共根 CA 或对应签发链中的稳定 CA 证书，而不是每次续期生成的 `fullchain.pem`。但公共 CA 链可能调整，设备端和后端仍存在维护成本。

当前项目如果要支持自动续期公共证书，建议后续把 MQTT 配置扩展成：

```yaml
mqtt:
  broker: ssl://mqtt.ecoaxon.com:8883
  tls:
    use-default-trust-store: true
    ca-cert: classpath:certs/ca.crt
```

行为建议：

- `use-default-trust-store: true`：不设置自定义 `SocketFactory`，使用 JVM 默认 CA。
- `use-default-trust-store: false`：继续加载 `ca-cert`，用于私有 CA 或服务端自签名证书。

## 后端配置

当前项目中 MQTT 地址在：

```text
backend/src/main/resources/application.yaml
```

配置示例：

```yaml
mqtt:
  broker: ssl://mqtt.ecoaxon.com:8883
  client-id: ecoaxon-config-web-mqtt-client-dev
  username: <mqtt-username>
  password: <mqtt-password>
```

当前项目中信任证书路径为：

```text
backend/src/main/resources/certs/ca.crt
```

代码读取位置：

```java
SslUtil.getSocketFactoryFromClasspath("certs/ca.crt")
```

按证书方案复制正确文件：

- 私有 CA 方案：把 `ca.crt` 复制到 `backend/src/main/resources/certs/ca.crt`。
- 服务端自签名方案：把 `mqtt.ecoaxon.com.crt` 复制到 `backend/src/main/resources/certs/ca.crt`。

然后重新构建并发布后端。

```bash
cd backend
./mvnw -DskipTests package
```

Windows：

```powershell
cd backend
.\mvnw.cmd -DskipTests package
```

## 客户端验证

### OpenSSL 验证服务端证书链

```bash
openssl s_client \
  -connect mqtt.ecoaxon.com:8883 \
  -servername mqtt.ecoaxon.com \
  -CAfile ca.crt \
  -verify_return_error
```

成功时应看到：

```text
Verify return code: 0 (ok)
```

### MQTTX CLI 验证

订阅：

```bash
mqttx sub \
  -h mqtt.ecoaxon.com \
  -p 8883 \
  -l mqtts \
  --ca certs/ca.crt \
  -u '<mqtt-username>' \
  -P '<mqtt-password>' \
  -t test/topic
```

发布：

```bash
mqttx pub \
  -h mqtt.ecoaxon.com \
  -p 8883 \
  -l mqtts \
  --ca certs/ca.crt \
  -u '<mqtt-username>' \
  -P '<mqtt-password>' \
  -t test/topic \
  -m 'hello tls'
```

如果只是临时验证服务端是否能建立 TLS，可以使用不校验证书的方式：

```bash
mqttx sub -h mqtt.ecoaxon.com -p 8883 -l mqtts --insecure -t test/topic
```

`--insecure` 只能用于排障，不应作为生产配置。

## 常见问题

### 1. 后端报 PKIX path building failed

含义：JVM 不信任 EMQX 返回的服务端证书。

检查项：

- `backend/src/main/resources/certs/ca.crt` 是否是正确 CA 证书。
- 如果使用服务端自签名证书，`ca.crt` 是否就是 EMQX 当前服务端证书。
- EMQX 是否已重启并实际加载了新证书。
- 连接域名是否包含在服务端证书 SAN 中。

### 2. 本次 CA 证书问题复盘

本次后端启动时报错：

```text
MqttException (0) - javax.net.ssl.SSLHandshakeException: PKIX path building failed
Caused by: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target
```

直接原因：

- 后端代码通过 `SslUtil.getSocketFactoryFromClasspath("certs/ca.crt")` 创建了一个只包含项目内 `ca.crt` 的 trustStore。
- `backend/src/main/resources/certs/ca.crt` 中保存的是旧证书。
- `mqtt.ecoaxon.com:8883` 当前返回的是另一张新的自签名服务端证书。
- 两张证书的 `Subject` 都是 `mqtt.ecoaxon.com`，但证书指纹不同，所以它们不是同一张证书。
- JVM 只信任项目内旧的 `ca.crt`，无法用它验证 EMQX 当前返回的新证书，因此 TLS 握手失败。

本次排查时看到的关键现象：

```text
本地 ca.crt:
Subject: CN=mqtt.ecoaxon.com
SHA1: AC:09:72:67:9A:3F:08:D1:7D:13:61:A7:CF:44:19:91:41:70:D7:34

远端 mqtt.ecoaxon.com:8883:
Subject: CN=mqtt.ecoaxon.com
SHA1: EB:78:79:40:7E:37:A5:4E:42:A0:34:53:1F:4B:9D:A4:7C:1A:DE:4D
```

解决方式：

1. 如果当前 EMQX 使用服务端自签名证书，把 EMQX 当前实际加载的 `mqtt.ecoaxon.com.crt` 复制到后端：

```bash
cp mqtt.ecoaxon.com.crt backend/src/main/resources/certs/ca.crt
```

2. 重新构建并发布后端：

```bash
cd backend
./mvnw -DskipTests package
```

3. 验证 Java 是否能用该证书完成 TLS 握手：

```bash
openssl s_client \
  -connect mqtt.ecoaxon.com:8883 \
  -servername mqtt.ecoaxon.com \
  -CAfile backend/src/main/resources/certs/ca.crt \
  -verify_return_error
```

4. 长期修复应改为私有 CA 签发服务端证书。后端只信任长期稳定的 `ca.crt`，EMQX 服务端证书后续重签时不再需要更新后端证书文件。

### 3. 为什么报错后程序仍然可以正常运行

这个报错只表示 MQTT TLS 连接失败，不等于整个 Spring Boot 应用启动失败。

当前项目中 MQTT 连接由 Spring Integration MQTT 和 Eclipse Paho 维护。Paho 的连接异常发生在后台连接线程中，堆栈里可以看到：

```text
org.eclipse.paho.client.mqttv3.internal.ClientComms$ConnectBG.run
java.base/java.lang.Thread.run
```

因此它不是主启动线程中的致命异常。Spring Boot 的 Web 容器、数据库连接、Controller、普通 HTTP API 等模块仍然可以继续启动和运行。

同时配置里启用了自动重连：

```java
options.setAutomaticReconnect(true);
```

所以 MQTT 客户端连接失败后通常会记录异常并继续重试，而不是直接终止整个应用进程。

但是这不代表 MQTT 功能正常。报错期间以下功能会受影响：

- MQTT 订阅收不到设备上报。
- MQTT 发布可能失败或堆积到异常路径。
- 设备在线、离线、属性上报、固件升级进度、配置响应等依赖 MQTT 的业务不会正常更新。
- HTTP 页面和普通接口可能看起来正常，但实时设备数据不可靠。

判断标准：

- 应用能启动，只说明 Spring Boot 进程存活。
- MQTT 握手成功并完成订阅，才说明 MQTT 相关业务可用。

### 4. 证书主体相同但仍然失败

主体 `Subject` 相同不代表是同一张证书。需要比对 SHA256 指纹：

```bash
openssl x509 -in ca.crt -noout -fingerprint -sha256
```

远端证书：

```bash
openssl s_client -connect mqtt.ecoaxon.com:8883 -servername mqtt.ecoaxon.com -showcerts
```

### 5. Hostname verification failed

含义：客户端连接的域名或 IP 不在服务端证书 SAN 中。

解决：

- 使用证书 SAN 中已有的域名连接。
- 重新签发服务端证书，把实际连接域名或 IP 加入 `subjectAltName`。

### 6. key values mismatch

含义：`certfile` 和 `keyfile` 不匹配。

检查：

```bash
openssl x509 -noout -modulus -in mqtt.ecoaxon.com.crt | openssl md5
openssl rsa -noout -modulus -in mqtt.ecoaxon.com.key | openssl md5
```

两个输出必须一致。

### 7. EMQX 监听端口未开放

检查 listener：

```bash
emqx ctl listeners
```

检查端口：

```bash
ss -lntp | grep 8883
```

Docker 需要确认端口映射：

```bash
docker ps
```

## 生产建议

- 生产环境优先使用正式公共 CA 或稳定的企业私有 CA。
- 不要把 CA 私钥 `ca.key` 放进代码仓库、EMQX 运行目录或容器镜像。
- 服务端私钥 `mqtt.ecoaxon.com.key` 权限应限制为 EMQX 运行用户可读。
- 证书到期前至少提前 30 天更换并验证。
- 服务端证书重签后，用 `openssl s_client` 和实际后端服务都验证一次。
- 如果使用自签名服务端证书，证书每次变化都必须同步更新所有客户端信任证书。

## 参考

- [EMQX Enable SSL/TLS Connections](https://docs.emqx.com/en/emqx/latest/network/emqx-mqtt-tls.html)
- [EMQX Listener Configuration](https://docs.emqx.com/en/emqx/latest/configuration/listener.html)
- [EMQX Network and TLS](https://docs.emqx.com/en/emqx/latest/network/overview.html)

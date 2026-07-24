---
title: Spring Boot 多配置文件实践：dev / pro 环境拆分
date: 2026-07-21
category: Java
tag:
  - Spring Boot
  - 配置管理
  - 环境变量
  - Java
isOriginal: true
excerpt: 以 yin 多模块 Spring Boot 项目为例，整理 application.yaml、application-dev.yaml、application-pro.yaml 的拆分方式、启动命令、环境变量和 PowerShell 脚本用法。
---
# Spring Boot 多配置文件实践：dev / pro 环境拆分

## 背景

当前 `yin` 后端是 Maven 多模块单体项目，真正的 Spring Boot 启动模块是：

```text
yin-admin
```

因此 Spring Boot 配置文件应放在：

```text
yin-admin/src/main/resources
```

本次将原来的单个 `application.yaml` 拆分为公共配置、开发环境配置和生产环境配置。

## 配置文件结构

```text
yin-admin/src/main/resources
├── application.yaml
├── application-dev.yaml
└── application-pro.yaml
```

### application.yaml

公共配置文件，放所有环境都通用的配置，例如：

- 应用名称
- 默认 profile
- 端口和 context-path
- Jackson 配置
- MyBatis Plus 公共配置
- SpringDoc 配置
- Hikari 通用连接池配置

当前默认 profile 设置为 `dev`：

```yaml
spring:
  profiles:
    default: dev
```

这样本地开发和测试时，即使没有手动指定环境，也会默认使用 `application-dev.yaml`。

### application-dev.yaml

开发环境配置，适合本地调试：

- 默认使用本地 MySQL
- 日志级别更详细
- MyBatis SQL 日志开启
- JWT 使用开发默认密钥

开发环境允许默认值，是为了降低本地启动成本。

### application-pro.yaml

生产环境配置，适合服务器部署：

- 数据库地址、账号、密码必须来自环境变量
- JWT 密钥必须来自环境变量
- 日志级别收敛为 `INFO`
- 不开启 MyBatis SQL stdout 日志

生产环境不在配置文件里写死密码，是为了避免敏感信息进入代码仓库或打包产物。

## 启动命令

### 1. 使用默认 dev 启动

项目根目录为 `yin` 时执行：

```powershell
.\mvnw.cmd -pl yin-admin -am spring-boot:run
```

因为 `application.yaml` 中配置了 `spring.profiles.default=dev`，所以不指定 profile 时默认使用 dev。

### 2. 显式使用 dev 启动

```powershell
.\mvnw.cmd -pl yin-admin -am spring-boot:run "-Dspring-boot.run.profiles=dev"
```

也可以使用环境变量：

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
.\mvnw.cmd -pl yin-admin -am spring-boot:run
```

### 3. 显式使用 pro 启动

开发方式运行生产 profile：

```powershell
$env:SPRING_PROFILES_ACTIVE = "pro"
.\mvnw.cmd -pl yin-admin -am spring-boot:run
```

生产部署通常使用 jar：

```powershell
java -jar .\yin-admin\target\yin-admin-0.0.1-SNAPSHOT.jar --spring.profiles.active=pro
```

## 打包命令

### 1. 完整打包并运行测试

```powershell
.\mvnw.cmd clean package
```

### 2. 跳过测试打包

```powershell
.\mvnw.cmd clean package -DskipTests
```

### 3. 只打包启动模块及其依赖模块

```powershell
.\mvnw.cmd -pl yin-admin -am clean package
```

打包产物位置：

```text
yin-admin/target/yin-admin-0.0.1-SNAPSHOT.jar
```

## 环境变量说明

项目使用以下环境变量：

| 变量名 | 说明 |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | 当前激活环境，取值 `dev` 或 `pro` |
| `SERVER_PORT` | 服务端口，默认 `8848` |
| `YIN_DATASOURCE_URL` | MySQL JDBC 地址 |
| `YIN_DATASOURCE_USERNAME` | 数据库用户名 |
| `YIN_DATASOURCE_PASSWORD` | 数据库密码 |
| `YIN_JWT_SECRET` | JWT 签名密钥，生产环境必须设置 |
| `YIN_JWT_EXPIRATION` | JWT 过期时间，单位毫秒 |

## PowerShell 脚本

脚本目录：

```text
scripts/env
├── set-dev-env.ps1
├── set-pro-env.ps1
└── clear-env.ps1
```

### 1. 设置 dev 环境变量

```powershell
.\scripts\env\set-dev-env.ps1
```

默认设置到当前 PowerShell 进程，关闭终端后失效。

如果要写入当前 Windows 用户环境变量：

```powershell
.\scripts\env\set-dev-env.ps1 -Scope User
```

写入 User 作用域后，需要重新打开终端才能稳定读取到最新环境变量。

### 2. 设置 pro 环境变量

生产环境脚本不会写死真实密码，需要通过参数传入：

```powershell
.\scripts\env\set-pro-env.ps1 `
  -DatasourceUrl "jdbc:mysql://prod-host:3306/yin_yang?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8" `
  -DatasourceUsername "prod_user" `
  -DatasourcePassword "prod_password" `
  -JwtSecret "replace-with-a-long-random-secret-at-least-32-bytes"
```

如果要写入当前 Windows 用户环境变量：

```powershell
.\scripts\env\set-pro-env.ps1 `
  -Scope User `
  -DatasourceUrl "jdbc:mysql://prod-host:3306/yin_yang?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8" `
  -DatasourceUsername "prod_user" `
  -DatasourcePassword "prod_password" `
  -JwtSecret "replace-with-a-long-random-secret-at-least-32-bytes"
```

### 3. 删除环境变量

删除当前 PowerShell 进程中的变量：

```powershell
.\scripts\env\clear-env.ps1
```

删除当前 Windows 用户环境变量：

```powershell
.\scripts\env\clear-env.ps1 -Scope User
```

## 不使用脚本时的手动命令

### PowerShell 设置环境变量

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:SERVER_PORT = "8848"
$env:YIN_DATASOURCE_URL = "jdbc:mysql://localhost:3306/yin_yang?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8"
$env:YIN_DATASOURCE_USERNAME = "root"
$env:YIN_DATASOURCE_PASSWORD = "root"
$env:YIN_JWT_SECRET = "yin-yang-dev-secret-key-32bytes-minimum"
$env:YIN_JWT_EXPIRATION = "3600000"
```

### PowerShell 删除环境变量

```powershell
Remove-Item Env:SPRING_PROFILES_ACTIVE -ErrorAction SilentlyContinue
Remove-Item Env:SERVER_PORT -ErrorAction SilentlyContinue
Remove-Item Env:YIN_DATASOURCE_URL -ErrorAction SilentlyContinue
Remove-Item Env:YIN_DATASOURCE_USERNAME -ErrorAction SilentlyContinue
Remove-Item Env:YIN_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:YIN_JWT_SECRET -ErrorAction SilentlyContinue
Remove-Item Env:YIN_JWT_EXPIRATION -ErrorAction SilentlyContinue
```

### Windows 用户级环境变量

设置：

```powershell
[Environment]::SetEnvironmentVariable("SPRING_PROFILES_ACTIVE", "pro", "User")
```

删除：

```powershell
[Environment]::SetEnvironmentVariable("SPRING_PROFILES_ACTIVE", $null, "User")
```

## 推荐使用方式

本地开发：

```powershell
.\scripts\env\set-dev-env.ps1
.\mvnw.cmd -pl yin-admin -am spring-boot:run
```

生产打包：

```powershell
.\mvnw.cmd -pl yin-admin -am clean package -DskipTests
```

生产启动：

```powershell
.\scripts\env\set-pro-env.ps1 `
  -DatasourceUrl "jdbc:mysql://prod-host:3306/yin_yang?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8" `
  -DatasourceUsername "prod_user" `
  -DatasourcePassword "prod_password" `
  -JwtSecret "replace-with-a-long-random-secret-at-least-32-bytes"

java -jar .\yin-admin\target\yin-admin-0.0.1-SNAPSHOT.jar
```

清理本机变量：

```powershell
.\scripts\env\clear-env.ps1
```

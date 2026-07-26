---
title: Yin 单体多模块改造记录
date: 2026-07-24
category: Java
tag:
  - Spring Boot
  - 架构
  - 模块重构
isOriginal: true
excerpt: 记录 Yin 项目从单模块 Spring Boot 应用调整为单体多模块结构的拆分思路、依赖方向、代码优化和运行方式。
---

# Yin 单体多模块改造记录

## 改造目标

将原来的单模块 Spring Boot 项目调整为单体多模块结构，保持一个应用进程启动，同时把公共能力、系统业务、启动 API 层和代码生成器拆开，降低后续业务扩展时的耦合。

## 模块结构

```text
yin
├── pom.xml                  # 父工程，统一版本和插件管理
├── yin-common               # 公共基础能力
├── yin-system               # system 业务模块
├── yin-admin                # Spring Boot 启动模块和 Web/API 层
└── yin-generator            # 代码生成器和模板
```

模块依赖方向：

```text
yin-admin -> yin-system -> yin-common
yin-generator 独立
```

## 迁移内容

1. 根 `pom.xml` 改为 `packaging=pom`，声明 `yin-common`、`yin-system`、`yin-admin`、`yin-generator` 四个子模块，并集中管理 MapStruct、MyBatis Plus、JWT、Apache POI、SpringDoc、Velocity 等版本。
2. `yin-common` 保留公共树工具、时间工具、统一响应对象、基础实体和基础分页/转换器。
3. `yin-system` 承载系统业务的实体、DTO、Query、Mapper、Service、MapStruct Converter，并把 MyBatis XML 统一迁移到 `src/main/resources/mapper/system`。
4. `yin-admin` 承载启动类、Controller、安全认证、全局异常/响应处理、MyBatis Plus 配置、Swagger 配置、Excel 帮助类、应用配置和测试。
5. `yin-generator` 承载 `CodeGenerator` 和 Velocity 模板，避免生成器依赖进入主应用启动模块。

## 业务和代码优化

1. 启动类删除固定密码 BCrypt 生成和 `System.out` 输出，只保留应用启动逻辑。
2. `@MapperScan` 从扫描整个 `com.yinyang.yin` 收窄到 `com.yinyang.yin.mapper`。
3. 数据库地址、账号、密码和 JWT 配置改为环境变量读取，默认使用本地开发配置：
   - `YIN_DATASOURCE_URL`
   - `YIN_DATASOURCE_USERNAME`
   - `YIN_DATASOURCE_PASSWORD`
   - `YIN_JWT_SECRET`
   - `YIN_JWT_EXPIRATION`
4. `mybatis-plus.mapper-locations` 显式配置为 `classpath*:mapper/**/*.xml`，保证模块内 XML Mapper 能被加载。
5. `UserService` 改为注入 `PasswordEncoder`，修复导入用户时调用 `encode` 但未写回哈希值的问题。
6. 用户更新时如果未传新密码，会保留数据库中已有密码哈希，避免空密码覆盖。
7. 全局异常处理改为日志记录，不再 `printStackTrace`，并统一返回 `Result`。
8. 登录失败不再向前端透出异常细节，统一返回 `Invalid username or password`。
9. 代码生成器去掉硬编码远程数据库连接和密码，改用环境变量：
   - `YIN_GENERATOR_DATASOURCE_URL`
   - `YIN_GENERATOR_DATASOURCE_USERNAME`
   - `YIN_GENERATOR_DATASOURCE_PASSWORD`
   - `YIN_GENERATOR_OUTPUT_DIR`
10. 业务模块中的 `io.jsonwebtoken.lang.Assert` 改为 `org.springframework.util.Assert`，避免非安全业务代码依赖 JWT 包。
11. 补充 `spring-boot-starter-validation`，让 Controller 上的 `@Validated` 有实际校验提供者。
12. 登录请求补充 `username` 和 `password` 非空校验，用户不存在时使用 Spring Security 的 `UsernameNotFoundException`。

## 构建和验证

已执行：

```bash
./mvnw.cmd -q test
./mvnw.cmd -q package
```

结果：测试和完整打包均通过。

## 运行方式

主应用入口在 `yin-admin` 模块：

```bash
./mvnw.cmd -pl yin-admin -am spring-boot:run
```

使用非本地数据库时，先设置环境变量，例如：

```bash
set YIN_DATASOURCE_URL=jdbc:mysql://host:3306/db?allowPublicKeyRetrieval=true^&useSSL=false^&serverTimezone=Asia/Shanghai^&characterEncoding=utf8
set YIN_DATASOURCE_USERNAME=root
set YIN_DATASOURCE_PASSWORD=your_password
set YIN_JWT_SECRET=replace-with-at-least-32-bytes-secret
```

# 后端代码结构规范化重构记录

## 背景

本次重构围绕系统管理后端的职责边界展开。原有代码中，`AuthController` 同时承担登录、当前用户信息、角色权限管理等职责，随着“我的账号”功能加入，继续在同一个 Controller 中追加接口会让认证、账号资料和角色管理耦合在一起。

因此，本次调整遵循两个原则：

- 业务模块优先：系统业务代码统一放在 `com.yinyang.yin.system` 下，再按文件类型分层。
- Controller 单一职责：认证、当前账号、角色管理分别由独立 Controller 承担。

## 目录规范

系统业务模块采用模块优先结构：

```text
com.yinyang.yin.system
├── controller
├── converter
├── dto
├── entity
├── mapper
├── query
└── service
```

其中：

- `controller`：HTTP API 入口，只做参数接收、当前用户解析和服务调用。
- `service`：业务规则和事务边界。
- `dto`：接口输入输出对象，避免直接暴露实体。
- `entity`：数据库实体。
- `mapper`：MyBatis Plus Mapper。
- `converter`：DTO 与实体转换。
- `query`：查询条件对象。

## Controller 拆分

重构前，`AuthController` 同时包含：

- `/auth/login`
- `/auth/me`
- `/auth/page`
- `/auth/select`
- `/auth/{id}`
- 角色新增、修改、删除

重构后拆分为：

```text
AuthController
├── POST /auth/login
└── GET  /auth/me

AuthorityController
├── GET    /auth/page
├── GET    /auth/select
├── GET    /auth/{id}
├── POST   /auth
├── PUT    /auth
└── DELETE /auth/{ids}

AccountController
├── GET /account
└── PUT /account
```

角色管理接口路径保持不变，前端角色管理页面不需要调整 API 地址。

## 我的账号功能

新增 `AccountDTO`，只暴露当前账号允许维护的字段：

```text
id
login
password
firstName
lastName
nickname
email
imageUrl
langKey
```

`PUT /account` 的更新规则：

- 当前用户 id 从 Spring Security 上下文读取，不信任前端传入的 id。
- 不允许当前账号接口修改角色、启用状态、登录名等管理字段。
- `password` 为空时不修改密码。
- `password` 非空时由 `PasswordEncoder` 重新加密后保存。

## 影响范围

后端新增和调整文件：

```text
yin-admin/src/main/java/com/yinyang/yin/system/controller/AccountController.java
yin-admin/src/main/java/com/yinyang/yin/system/controller/AuthController.java
yin-admin/src/main/java/com/yinyang/yin/system/controller/AuthorityController.java
yin-system/src/main/java/com/yinyang/yin/system/dto/AccountDTO.java
yin-system/src/main/java/com/yinyang/yin/system/converter/UserConverter.java
yin-system/src/main/java/com/yinyang/yin/system/service/UserService.java
```

## 验证方式

后端应执行：

```bash
./mvnw.cmd -q -pl yin-admin -am clean test
```

前端应执行：

```bash
pnpm build
```

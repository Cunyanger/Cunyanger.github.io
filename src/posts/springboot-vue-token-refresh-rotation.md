---
title: Spring Boot + Vue Token 自动续期方案：从 JWT 现状分析到 Refresh Token 轮换实践
date: 2026-08-23
category: Java
tag:
  - Spring Boot
  - Vue
  - Spring Security
  - JWT
  - Token 续期
  - 系统安全
isOriginal: true
excerpt: 以 Taichi2.0 的 Spring Boot + Vue 认证代码为例，梳理主流 Token 自动续期方案，分析当前 JWT 实现的风险与边界，并给出短期 Access Token、HttpOnly Refresh Token、轮换和重放检测的完整落地架构。
---

# Spring Boot + Vue Token 自动续期方案：从 JWT 现状分析到 Refresh Token 轮换实践

## 一、为什么要重新设计 Token 续期

前后端分离系统通常会把登录凭证拆成两件事：

- **Access Token**：访问业务接口时携带，生命周期短，泄露后的影响窗口小。
- **Refresh Token**：只用于换取新的 Access Token，生命周期较长，不直接访问业务接口。

如果只有一个长期有效的 JWT，系统很难同时做到“用户不频繁登录”和“令牌泄露后可控”。Token 自动续期的目标不是让一个 token 永不过期，而是让短期凭证在可信的长期会话仍然有效时平滑更新，并且保留撤销、审计和风险控制能力。

本文以 `D:\WorkSpace\Ecoaxon\cloud-web\03.Code\Taichi2.0` 为实际代码背景，给出一套可以分阶段实施的方案。

## 二、Taichi2.0 当前认证链路

### 2.1 后端：一个无状态 JWT

登录入口位于 `yin-admin` 的 `AuthController`：

```java
@PostMapping("/login")
public Result<LoginDTO> login(@Validated @RequestBody LoginRequest req) {
    // 校验用户名和密码，加载角色和权限
    String token = tokenProvider.createToken(
            loginUser.getUserId(), user.getUsername(), roles, permissions);
    loginDTO.setToken(token);
    return Result.ok(i18n.get("common.ok"), loginDTO);
}
```

`JwtTokenProvider` 使用 HMAC-SHA256 签名，并把用户标识、角色和权限写入 JWT：

```java
return Jwts.builder()
        .setSubject(username)
        .claim("userId", userId)
        .claim("roles", roles)
        .claim("permissions", permissions)
        .setExpiration(new Date(System.currentTimeMillis() + EXPIRE))
        .signWith(key(), SignatureAlgorithm.HS256)
        .compact();
```

开发环境配置中的有效期为 3,600,000 ms，即 1 小时：

```yaml
security:
  jwt:
    expiration: ${YIN_JWT_EXPIRATION:3600000}
```

每个请求由 `JwtAuthenticationFilter` 解析 `Authorization: Bearer ...`，解析成功后直接从 JWT claims 恢复 Spring Security 的 `Authentication`。`SecurityConfig` 使用 `STATELESS` 会话策略，服务端当前不保存登录会话。

### 2.2 前端：localStorage + 401 退出

Pinia store 初始化时从 localStorage 读取 token：

```ts
return {
  token: localStorage.getItem("token") || "",
  userInfo: storedUserInfo,
};
```

Axios 请求拦截器统一增加 Bearer 头：

```ts
if (userStore.token) {
  config.headers.Authorization = `Bearer ${userStore.token}`;
}
```

当前响应拦截器遇到 401 会清空用户信息，并跳转 `/login`。项目没有 `/auth/refresh`，所以用户只能重新输入密码。

### 2.3 当前实现的边界和风险

1. **没有续期通道**：Access Token 过期后只能重新登录。
2. **localStorage 暴露凭证**：一旦页面存在 XSS，脚本可以读取 token。
3. **无法主动撤销 JWT**：服务端没有 token 黑名单或 refresh 会话表。
4. **权限存在缓存窗口**：角色和权限写入 JWT 后，旧 token 在过期前仍会被信任。
5. **配置项没有统一使用**：`app.ts` 中配置了 `ACCESS_TOKEN`，但 `user.ts` 固定使用 `token`。
6. **密钥不能使用默认值**：`application-dev.yaml` 和生产配置中的 JWT 默认密钥只能作为开发占位，生产环境必须由环境变量或密钥管理系统注入。

## 三、主流自动续期方案对比

### 3.1 延长 JWT 有效期

把过期时间从 1 小时改成 7 天、30 天甚至更长。实现成本最低，但 token 一旦泄露，攻击者可以在很长时间内调用接口；用户退出登录也无法让已经签发的 JWT 立即失效。它适合临时内部工具，不适合包含用户管理、设备控制或敏感配置的后台系统。

### 3.2 滑动过期 JWT

每次请求发现 JWT 即将过期时重新签发一个 JWT。这种方式不需要额外的 refresh token 存储，但会带来并发更新、响应头传递新 token、重放难检测等问题。若攻击者持续使用被盗 token，过期时间可能被不断向后推移。

### 3.3 Access Token + Refresh Token

Access Token 只保留 10～15 分钟，Refresh Token 负责换新。Refresh Token 可以是 JWT，也可以是不可读的随机字符串。后者可以在服务端撤销，安全性更好，是目前后台 SPA 最常用的基础方案。

### 3.4 Refresh Token 轮换

每次刷新都让旧 Refresh Token 失效并生成新的 Refresh Token。如果旧 token 再次出现，说明 token 可能被复制或重放，可以撤销同一会话家族。这是对普通 refresh 方案的安全增强，推荐用于生产环境。

### 3.5 服务端 Session + HttpOnly Cookie

浏览器只保存一个 sessionId，真正的会话、权限和过期时间都在 Redis 或数据库。它具有很强的撤销能力，但需要维护集中式会话存储，并处理多实例部署的一致性。

### 3.6 OAuth2/OIDC + PKCE

将登录、MFA、单点登录和令牌管理交给 Keycloak、Auth0、Azure AD 等身份平台。适合多个系统共享身份的组织；对于当前单体项目，直接引入身份平台会增加部署和迁移成本。

## 四、Taichi2.0 推荐方案

建议采用：

> **短生命周期 JWT Access Token + HttpOnly Cookie Refresh Token + Refresh Token 轮换 + 服务端可撤销存储**

建议初始参数：

| 参数 | 建议值 | 说明 |
| --- | --- | --- |
| Access Token | 10～15 分钟 | 只访问业务接口 |
| Refresh Token 空闲有效期 | 14～30 天 | 长时间不使用自动失效 |
| Refresh Token 绝对有效期 | 30～90 天 | 防止无限续期 |
| 轮换策略 | 每次刷新一次 | 旧 token 立即标记为已使用 |
| 单用户会话数 | 3～5 个 | 控制设备数量 |

选择它的原因有四点：

1. 可以复用当前 JWT Filter 和 Spring Security 结构。
2. 普通业务请求仍然保持无状态，不必每次查数据库。
3. Refresh Token 放在 HttpOnly Cookie，降低 XSS 直接窃取风险。
4. 刷新时可以重新读取用户权限，并支持注销、改密和风控撤销。

## 五、推荐架构

```text
浏览器
  │
  ├─ Authorization: Bearer Access Token ───────► 业务接口
  │                                             │
  │                                             └─ 过期返回 401
  │
  └─ HttpOnly refresh_token Cookie ───────────► POST /auth/refresh
                                                │
                                      校验、轮换、签发新 Token
                                                │
                                      返回新的 Access Token
```

### 5.1 后端模块职责

```text
security/
├── JwtTokenProvider.java          # Access JWT 的签发和解析
├── JwtAuthenticationFilter.java   # 只验证 typ=access 的 JWT
├── RefreshTokenService.java       # 创建、校验、轮换和撤销
├── RefreshTokenRepository.java    # MySQL 或 Redis 存储
├── AuthCookieService.java         # 设置、清除 Cookie
└── TokenService.java              # 登录、刷新、退出的统一编排
```

Controller 提供四个接口：

```text
POST /auth/login    登录并设置 refresh_token Cookie
POST /auth/refresh  轮换 Refresh Token，返回新 Access Token
POST /auth/logout   撤销会话并清理 Cookie
GET  /auth/me       查询当前用户和最新权限
```

### 5.2 Refresh Token 表

当前项目已经使用 MySQL，第一阶段可以不增加 Redis，直接增加以下表：

```sql
CREATE TABLE sys_refresh_token (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token_hash CHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    family_id VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    replaced_by_hash CHAR(64) NULL,
    last_used_at DATETIME NULL,
    user_agent VARCHAR(512),
    client_ip VARCHAR(64),
    created_at DATETIME NOT NULL,
    INDEX idx_refresh_user (user_id),
    INDEX idx_refresh_family (family_id)
);
```

数据库中只保存 token 哈希，不保存 Cookie 中的明文。哈希可以使用 SHA-256 加服务端 pepper；pepper 必须从环境变量或密钥管理系统读取。

如果未来部署多个实例，或者刷新频率很高，可以把存储迁移到 Redis：

```text
auth:refresh:{tokenHash}
  userId
  familyId
  expiresAt
  status
```

读取旧 token、标记旧 token、写入新 token必须使用 Redis 事务或 Lua 脚本，避免两个并发请求同时刷新成功。

## 六、后端实施步骤

### 步骤一：拆分 Access Token 和 Refresh Token

将现有 `JwtTokenProvider.createToken()` 改成短期 Access Token，并增加标准声明：

```java
return Jwts.builder()
        .setId(UUID.randomUUID().toString())
        .setSubject(username)
        .claim("typ", "access")
        .claim("userId", userId)
        .claim("roles", roles)
        .claim("permissions", permissions)
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + accessExpiration))
        .signWith(key(), SignatureAlgorithm.HS256)
        .compact();
```

Refresh Token 不建议继续使用 JWT，而是使用安全随机字符串：

```java
String rawToken = SecureRandomString.generate(64);
String tokenHash = refreshTokenHasher.hash(rawToken);
```

Refresh Token 只用于 `/auth/refresh`，不能放进 `Authorization` 请求头访问业务接口。

### 步骤二：改造登录接口

登录成功后完成以下动作：

```text
认证用户名密码
  ↓
查询最新角色、权限和菜单
  ↓
签发 15 分钟 Access Token
  ↓
创建 14 天 Refresh Token
  ↓
保存 Refresh Token 哈希和 familyId
  ↓
通过 Set-Cookie 写入 HttpOnly Cookie
```

响应体可以改为：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900,
  "user": {
    "id": "1",
    "login": "admin",
    "roles": ["ROLE_ADMIN"],
    "permissions": [],
    "menus": []
  }
}
```

### 步骤三：实现 `/auth/refresh`

刷新接口的关键是轮换，而不是简单重新签发：

```text
读取 Cookie
  ↓
计算 tokenHash 并查询记录
  ↓
不存在、过期或 revoked → 401
  ↓
已使用的 token 再次出现 → 撤销整个 family，记录安全日志
  ↓
加载用户最新权限
  ↓
旧 token 标记 revoked/replaced
  ↓
生成新的 Access Token 和 Refresh Token
  ↓
返回 Access Token，重新设置 Cookie
```

Cookie 建议设置为：

```java
ResponseCookie cookie = ResponseCookie.from("refresh_token", rawRefreshToken)
        .httpOnly(true)
        .secure(true)
        .sameSite("Lax")
        .path("/api/auth")
        .maxAge(Duration.ofDays(14))
        .build();
```

如果前端和后端不是同站点，需要改成 `SameSite=None`，并在前端请求中设置 `withCredentials: true`，同时配置严格的 CORS 来源。

### 步骤四：实现注销和撤销

`POST /auth/logout` 至少要做到：

1. 撤销当前 Refresh Token 或当前 family。
2. 清除 Cookie。
3. 返回成功响应，即使 Cookie 已经不存在也要保持幂等。

以下场景需要撤销用户全部 Refresh Token：

- 用户修改密码。
- 管理员禁用或删除用户。
- 检测到 Refresh Token 重放。
- 用户执行“退出所有设备”。

### 步骤五：完善 SecurityConfig

只允许登录、刷新、注销接口匿名访问：

```java
.requestMatchers("/auth/login", "/auth/refresh", "/auth/logout").permitAll()
.anyRequest().authenticated()
```

`JwtAuthenticationFilter` 继续作为业务请求的认证入口，但必须确保只接受 Access Token 类型，并将异常统一转换为 HTTP 401。

## 七、前端实施步骤

### 步骤一：统一 token 存储

当前 `user.ts` 固定使用 `localStorage.getItem("token")`，建议抽出统一模块：

```ts
const ACCESS_TOKEN_KEY = config.tokenKey || "ACCESS_TOKEN";

export function readAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

export function writeAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}
```

更严格的安全策略是只放 Pinia 内存；为了支持浏览器刷新页面，可以先使用 `sessionStorage`，后续再根据安全要求决定是否完全内存化。

### 步骤二：Axios 单例刷新队列

多个请求同时遇到 401 时，不能让每个请求都调用一次 refresh。应当使用单例 Promise：

```ts
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then((response) => {
        const token = response.data.data.accessToken;
        useUserStore().setToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
```

响应拦截器应满足以下规则：

- 只有 HTTP 401 才触发 refresh。
- `/auth/login`、`/auth/refresh`、`/auth/logout` 不触发 refresh。
- 原请求增加 `_retry = true`，最多重放一次。
- refresh 成功后更新 Pinia 中的 Access Token，并重放原请求。
- refresh 失败后清理用户状态并跳转登录页。

伪代码如下：

```ts
if (error.response?.status === 401 && !requestConfig._retry) {
  requestConfig._retry = true;

  try {
    const token = await refreshAccessToken();
    requestConfig.headers.Authorization = `Bearer ${token}`;
    return service(requestConfig);
  } catch {
    useUserStore().clearUser();
    window.location.href = "/login";
  }
}
```

refresh 请求最好使用一个不带业务响应拦截器的原始 Axios 实例，避免 refresh 失败后再次进入 refresh，造成死循环。

### 步骤三：应用启动恢复登录状态

当前路由守卫发现没有 token 就直接跳转 `/login`。使用 HttpOnly Cookie 后，浏览器刷新时内存中没有 Access Token，因此需要增加初始化过程：

```text
应用启动
  ↓
如果没有 Access Token，先调用 /auth/refresh
  ↓
成功：保存新 Access Token，再调用 /auth/me
  ↓
失败：进入登录页
```

可以在 `main.ts` 挂载前初始化，也可以在 `router/guard.ts` 中使用一次性 `authInitialized` 标记。菜单和权限加载应放在 Access Token 恢复成功之后。

### 步骤四：主动刷新和页面恢复

被动 401 只能覆盖“请求已经失败”的情况。为了减少用户感知，可以在 Access Token 剩余 60～120 秒时主动刷新，并在以下事件中补偿刷新：

- 页面从后台切换到前台。
- 浏览器窗口重新获得焦点。
- 长时间空闲后重新操作。

无论主动刷新还是被动刷新，都必须复用同一个 `refreshPromise`，避免并发轮换冲突。

## 八、配置建议

```yaml
security:
  jwt:
    secret: ${YIN_JWT_SECRET}
    access-expiration: ${YIN_JWT_ACCESS_EXPIRATION:900000}
    refresh-expiration-days: ${YIN_JWT_REFRESH_EXPIRATION_DAYS:14}
    refresh-cookie-name: ${YIN_JWT_REFRESH_COOKIE_NAME:refresh_token}
    refresh-cookie-secure: ${YIN_JWT_REFRESH_COOKIE_SECURE:true}
    refresh-cookie-same-site: ${YIN_JWT_REFRESH_COOKIE_SAME_SITE:Lax}
```

生产环境不要保留类似 `yin-yang-dev-secret-key-32bytes-minimum` 的默认密钥。密钥轮换时，可以短期支持旧密钥解析、新密钥签发，待旧 Access Token 自然过期后移除旧密钥。

## 九、并发、重放和异常处理

### 9.1 并发刷新

浏览器可能同时发出多个请求。若每个 401 都独立刷新，轮换机制会把后发请求误判为重放。解决方法是：

- 前端使用单例 Promise 合并刷新请求。
- 后端使用数据库行锁、Redis Lua 或分布式锁保证轮换原子性。

### 9.2 Refresh Token 重放

如果旧 Refresh Token 已经被轮换，但之后再次出现，通常表示 token 被复制。不要只返回普通 401，而应：

1. 记录用户、设备、IP、User-Agent 和 familyId。
2. 撤销整个 family 的 Refresh Token。
3. 通知用户重新登录，必要时触发安全告警。

### 9.3 时钟偏差

多实例部署时，服务器时钟可能存在偏差。JWT 校验可配置 30～60 秒的 clock skew，但不能用过大的容忍时间掩盖过期问题。

### 9.4 权限变化

Access Token 只在短时间内携带权限 claims；刷新时重新查询数据库。对于极高风险操作，还可以在服务端再次检查用户状态或权限版本号。

## 十、测试清单

上线前至少验证以下场景：

| 场景 | 预期结果 |
| --- | --- |
| Access Token 有效 | 业务接口正常访问 |
| Access Token 过期、Refresh Token 有效 | 自动刷新并重放原请求 |
| 多个请求同时 401 | 只发送一次 refresh，其余请求等待结果 |
| Refresh Token 过期 | 清理状态并跳转登录 |
| 旧 Refresh Token 再次使用 | 撤销整个 family 并记录安全事件 |
| 调用 logout 后刷新 | 返回 401 |
| 修改密码后刷新 | 原会话失效，要求重新登录 |
| 用户权限被修改 | 下一次 refresh 获取最新权限 |
| Cookie 缺少 HttpOnly/Secure | 安全检查失败 |
| refresh 接口异常 | 不发生无限重试或死循环 |

## 十一、分阶段上线建议

### 第一阶段：兼容性改造

先增加 `/auth/refresh` 和前端刷新队列，Access Token 暂时保留 1 小时。确认流程稳定后再缩短到 15 分钟。这样可以降低一次性切换带来的风险。

### 第二阶段：安全加固

将 Refresh Token 从响应体或 localStorage 迁移到 HttpOnly Cookie，增加轮换、family 撤销、改密撤销和重放检测。

### 第三阶段：运维治理

增加 Redis、多实例原子操作、登录设备管理、指标监控和安全告警。

旧版本用户因为没有 Refresh Token Cookie，升级后需要重新登录一次，这是正常的迁移行为。可以在前端检测旧的 localStorage token，仅用于过渡请求，成功后立即删除；更安全的做法是直接让旧 token 失效并要求重新登录。

## 十二、结论

Taichi2.0 当前的“单 JWT + localStorage + 401 退出”适合原型或低风险内部系统，但不适合作为长期生产方案。最合理的升级路径是：

```text
单 JWT（1小时）
  ↓
短期 Access JWT（15分钟）
  +
HttpOnly Refresh Token（14天）
  ↓
Refresh Token 轮换与重放检测
  ↓
可撤销、可审计、可扩展的认证体系
```

该设计保留了 JWT 的性能优势，又补齐了当前缺失的自动续期、主动注销、权限更新和安全撤销能力，是当前项目改造成本和安全收益之间较平衡的方案。

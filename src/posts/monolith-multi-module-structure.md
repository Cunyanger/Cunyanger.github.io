# 单体多模块项目目录结构与模块职责

## 为什么单体也需要拆模块

单体应用不是所有代码都放在一个模块里。比较稳妥的做法是保持一个启动进程，同时按依赖方向拆出模块边界，让业务代码、通用能力、启动入口和开发工具互不污染。

当前项目采用：

```text
yin
├── pom.xml
├── yin-common
├── yin-system
├── yin-admin
└── yin-generator
```

依赖方向必须保持单向：

```text
yin-admin -> yin-system -> yin-common
yin-generator 独立
```

业务模块不能反向依赖启动模块，公共模块不能依赖具体业务模块。这样后期新增 `order`、`crm`、`workflow` 等业务模块时，可以直接按同样规则扩展。

## yin-common 放什么

`yin-common` 放跨业务、跨入口可复用的基础能力。判断标准是：换一个启动模块或新增一个业务模块后，是否仍然可以直接使用。

适合放在 `yin-common`：

- 统一响应对象，例如 `Result`
- 基础实体、审计实体、分页转换器、基础转换器
- 通用工具类，例如时间工具、树工具
- Excel 注解和 Excel 读写工具
- 国际化消息服务，例如 `I18nMessageService`
- 全局异常处理和响应包装
- 通用 Web 配置，例如 Locale 解析
- 通用 MyBatis Plus 配置，例如分页拦截器

不适合放在 `yin-common`：

- 具体业务 Service、Mapper、Entity、DTO
- 依赖当前登录用户业务语义的逻辑
- JWT 生成、登录鉴权、接口白名单
- Swagger 文档标题这类启动应用展示信息

这次将 `GlobalExceptionHandler`、`GlobalResponseBodyAdvice`、`I18nConfig`、`I18nMessageService`、`MyBatisPlusConfig`、`ExcelHelper` 迁入 `yin-common`，原因是它们是通用基础设施，不属于 `yin-admin` 启动入口本身。

## yin-system 放什么

`yin-system` 是系统业务模块。它承载“系统管理”领域的核心业务能力，而不是 Web 启动能力。

适合放在 `yin-system`：

- `entity`
- `dto`
- `query`
- `mapper`
- `service`
- `converter`
- `mapper XML`
- 系统业务相关枚举、常量、领域校验

不适合放在 `yin-system`：

- Controller
- Spring Security 配置
- Swagger 配置
- 启动类
- 全局异常处理

如果后续新增业务模块，例如 `yin-order`，建议结构与 `yin-system` 对齐：

```text
yin-order
└── src/main
    ├── java/com/yinyang/yin/order
    │   ├── entity
    │   ├── dto
    │   ├── query
    │   ├── mapper
    │   ├── service
    │   └── converter
    └── resources/mapper/order
```

## yin-admin 放什么

`yin-admin` 是 Spring Boot 启动模块，也是 Web/API 入口层。它负责把业务模块暴露成接口，并承载和“当前这个应用如何启动、如何鉴权、如何展示 API 文档”相关的配置。

适合放在 `yin-admin`：

- `YinApplication`
- Controller
- Spring Security 配置
- JWT Filter、Token Provider、登录用户上下文
- Swagger/OpenAPI 展示配置
- 当前应用的配置文件
- 和安全上下文强绑定的审计填充器

不适合放在 `yin-admin`：

- 可复用工具类
- 基础 DTO/Entity
- 业务 Service
- Mapper 和 Mapper XML
- 通用异常处理、通用响应包装

`AuditHandler` 当前仍保留在 `yin-admin`，因为它直接依赖 Spring Security 的 `SecurityContextHolder` 和当前登录用户模型。如果后期需要多个入口共用审计能力，可以再抽象一个 `CurrentUserProvider` 接口放到 `common`，由 `admin` 提供实现。

## yin-generator 放什么

`yin-generator` 是开发期工具模块，不应被业务模块依赖，也不应该被启动应用打包进运行时依赖。

适合放在 `yin-generator`：

- 代码生成入口
- MyBatis Plus Generator 配置
- Velocity 模板
- 前后端代码模板
- 国际化片段模板

生成器输出的后端包结构应遵循业务模块规范：

```text
com.yinyang.yin.<module>.entity
com.yinyang.yin.<module>.dto
com.yinyang.yin.<module>.query
com.yinyang.yin.<module>.mapper
com.yinyang.yin.<module>.service
com.yinyang.yin.<module>.converter
```

生成器环境变量统一使用 `YIN_GENERATOR_*`，不再保留旧代码生成器变量。

常用变量：

```text
YIN_GENERATOR_DATASOURCE_URL
YIN_GENERATOR_DATASOURCE_USERNAME
YIN_GENERATOR_DATASOURCE_PASSWORD
YIN_GENERATOR_TABLES
YIN_GENERATOR_MODULE
YIN_GENERATOR_OUTPUT_DIR
YIN_GENERATOR_WEB_OUTPUT_DIR
YIN_GENERATOR_I18N_OUTPUT_DIR
YIN_GENERATOR_PARENT_PACKAGE
```

## 新业务功能应该写在哪里

以新增“订单管理”为例：

- Entity/DTO/Query/Mapper/Service/Converter：放 `yin-order`
- Controller：放 `yin-admin`
- 通用 Excel 能力：使用 `yin-common`
- 订单专用 Excel 导入规则：放 `yin-order` 或 `yin-admin`，取决于是否属于领域规则
- 全局异常格式：使用 `yin-common`
- 订单不存在、订单状态不允许修改：业务异常或断言写在 `yin-order`
- 接口鉴权规则：放 `yin-admin`
- 菜单、权限、路由元数据：属于系统管理，放 `yin-system`

## 判断代码归属的规则

可以按下面几个问题判断：

1. 这段代码是否依赖 HTTP、Controller、JWT、Security Filter？
   是，则优先放 `yin-admin`。

2. 这段代码是否属于某个业务领域的核心规则？
   是，则放对应业务模块，例如 `yin-system`、`yin-order`。

3. 这段代码是否可以被多个业务模块复用，且不依赖具体业务？
   是，则放 `yin-common`。

4. 这段代码是否只在开发生成代码时使用？
   是，则放 `yin-generator`。

5. 这段代码是否会让下层模块反向依赖上层模块？
   是，则需要重新抽象或调整位置。

## 推荐后续优化

- 新增 `yin-order`、`yin-crm` 等业务模块时，保持与 `yin-system` 一致的目录结构。
- 当通用能力继续增多时，可以进一步拆出 `yin-common-core`、`yin-common-web`、`yin-common-excel`，但当前规模下一个 `yin-common` 更简单。
- 业务异常可以逐步从 `IllegalArgumentException` 收敛为自定义 `BusinessException`，异常中只携带 message key 和参数，由全局异常处理统一国际化。
- Controller 只做参数接收和响应返回，业务编排尽量放 Service。
- 生成器生成的国际化片段应经过人工确认后合并进前后端正式语言文件，避免覆盖已有人工维护文案。

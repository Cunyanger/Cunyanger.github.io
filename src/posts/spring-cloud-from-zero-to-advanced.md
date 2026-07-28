---
title: Spring Cloud 从入门到进阶：构建 Java 微服务体系
date: 2026-07-20
category: Java
tag:
  - Spring Cloud
  - Spring Boot
  - 微服务
  - Gateway
  - OpenFeign
isOriginal: true
excerpt: 从微服务背景讲起，按照学习路线系统介绍 Spring Cloud 的项目搭建、注册中心、配置中心、网关、OpenFeign、负载均衡、熔断限流、认证授权、分布式事务、链路追踪、监控部署和生产问题治理。
---

# Spring Cloud 从入门到进阶：构建 Java 微服务体系

Spring Cloud 是 Spring 生态中用于构建分布式系统和微服务架构的一组工具集合。它不是一个单独框架，而是一套围绕 Spring Boot 的微服务能力组合。

Spring Boot 解决的是“一个服务怎么快速开发和运行”，Spring Cloud 解决的是“多个服务之间怎么协作、治理和稳定运行”。如果已经熟悉 Spring Boot、MVC、配置文件、依赖注入和常见中间件，那么 Spring Cloud 是进入 Java 微服务体系的自然下一步。

典型能力包括：

- 服务注册与发现
- 配置中心
- API 网关
- 服务间调用
- 负载均衡
- 熔断、限流和重试
- 认证与授权
- 链路追踪和指标监控
- 消息驱动
- 分布式事务
- 容器化部署
- Kubernetes 集成
- 灰度发布和生产治理

学习 Spring Cloud 不能只背组件名称。更重要的是理解这些组件分别解决什么分布式问题，以及它们在生产链路中怎么组合。

## 学习路线总览

建议按照“先闭环、再治理、再生产化”的节奏学习，而不是一开始就把所有组件接满。

完整路线：

```text
Spring Boot
-> 微服务基础
-> Maven 多模块项目
-> Nacos 注册中心
-> OpenFeign 服务调用
-> Spring Cloud Gateway
-> Nacos Config 配置中心
-> Spring Cloud LoadBalancer
-> Sentinel / Resilience4j 熔断限流
-> Spring Security / JWT / OAuth2
-> MQ 异步通信
-> Seata / Saga / 消息最终一致性
-> Micrometer Tracing / Zipkin / SkyWalking
-> Actuator / Prometheus / Grafana
-> Docker / Kubernetes / 灰度发布
```

如果时间有限，先完成最小闭环：

```text
Nacos 注册发现
-> OpenFeign 服务调用
-> Gateway 统一入口
-> Nacos Config 统一配置
```

这个闭环掌握后，你就能搭建一个最基本的 Spring Cloud 微服务系统。后面的熔断、限流、认证、事务、监控和部署，都是围绕“让系统稳定上线”继续补能力。

## 为什么需要 Spring Cloud

单体应用阶段，一个系统通常这样部署：

```text
浏览器 -> Nginx -> Spring Boot 应用 -> MySQL
```

这种结构简单直接，开发、测试、部署和排查问题都比较容易。一个请求基本只经过一个应用，事务也通常可以由本地数据库事务解决。

随着业务增长，单体应用会逐渐变得臃肿：

- 代码模块越来越多，改一个功能容易影响其他模块。
- 不同业务的发布节奏不同，但只能整体发布。
- 某个模块流量暴涨时，必须扩容整个应用。
- 一个模块出现慢查询或线程阻塞，可能拖慢整个系统。
- 团队规模扩大后，代码合并、测试、发布冲突明显增加。

于是系统可能拆成多个服务：

```text
用户服务
订单服务
支付服务
库存服务
商品服务
营销服务
文件服务
```

拆分之后，复杂度没有消失，而是从“单体内部复杂度”转移为“分布式协作复杂度”。新的问题会出现：

- 服务地址如何发现？
- 配置如何统一管理？
- 服务之间如何调用？
- 某个服务故障如何隔离？
- 外部请求如何路由到内部服务？
- 如何统一鉴权、限流、日志？
- 一次请求跨多个服务时如何排查？
- 多个服务共同完成一个业务流程时，数据一致性如何保证？

Spring Cloud 就是围绕这些问题提供基础设施能力。它让开发者不用从零实现注册中心客户端、配置刷新、服务调用、网关路由、熔断限流等通用能力，而是把精力放在业务边界和稳定性设计上。

实践中要记住一点：微服务不是为了“拆”而拆，而是为了让业务边界、团队协作、部署扩容和系统治理更清晰。如果业务规模不大、团队人数少、发布频率低，单体或模块化单体往往更合适。

## Spring Boot 和 Spring Cloud 的关系

Spring Boot 是单个应用的开发基础，提供自动配置、内嵌容器、配置管理、监控端点和依赖版本管理。

Spring Cloud 是多个 Spring Boot 应用组成分布式系统时的治理能力集合。它依赖 Spring Boot，但关注点不同：

```text
Spring Boot：把一个服务开发好、启动好、运行好
Spring Cloud：让多个服务发现彼此、调用彼此、保护彼此、观测彼此
```

常见组合关系如下：

| 能力 | Spring Boot 关注点 | Spring Cloud 关注点 |
| --- | --- | --- |
| 应用启动 | 自动配置、内嵌 Tomcat、配置文件 | 注册到注册中心、加载远程配置 |
| Web 接口 | Controller、Filter、Interceptor | Gateway 路由、统一鉴权、限流 |
| 配置 | application.yml、多环境 profile | 配置中心、动态刷新、权限治理 |
| 调用 | RestTemplate、WebClient | OpenFeign、LoadBalancer、熔断 |
| 监控 | Actuator、本地健康检查 | 链路追踪、跨服务指标、告警 |

版本上，Spring Cloud 与 Spring Boot 有兼容矩阵。不要随意组合版本，否则可能遇到自动配置不生效、类找不到、依赖冲突等问题。创建项目时建议使用 Spring Initializr 推荐组合，或者参考 Spring Cloud 官方发布说明。

生产项目一般通过父工程统一管理版本：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>${spring-cloud.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

这样每个子服务只声明需要的 starter，具体传递依赖由 BOM 统一控制。

## 微服务基础结构

一个常见 Spring Cloud 架构可以抽象为：

```text
Client
  -> Spring Cloud Gateway
  -> user-service
  -> order-service
  -> payment-service
  -> inventory-service

Config Server / Nacos Config
Service Registry / Nacos / Eureka / Consul
Observability / Prometheus / Grafana / Zipkin / Jaeger / OpenTelemetry
Message Queue / Kafka / RabbitMQ / RocketMQ
```

各组件职责如下：

- Gateway：系统统一入口，负责路由、鉴权、限流、跨域、日志和灰度。
- Registry：服务注册中心，保存服务实例地址，让调用方通过服务名发现实例。
- Config：配置中心，集中管理环境配置、功能开关和部分动态参数。
- Service：具体业务服务，如用户、订单、库存、支付。
- Feign / WebClient：服务间 HTTP 调用工具。
- LoadBalancer：在多个服务实例之间选择目标实例。
- Resilience4j：提供熔断、限流、重试、隔离等稳定性能力。
- Observability：日志、指标、链路追踪和告警体系。
- MQ：用于异步解耦、削峰填谷和最终一致性。

一条典型请求链路可能是：

```text
用户请求
  -> Gateway 鉴权和路由
  -> order-service 创建订单
  -> user-service 查询用户
  -> inventory-service 扣减库存
  -> payment-service 创建支付单
  -> MQ 发布订单事件
```

微服务架构的重点不是组件堆叠，而是边界清晰、依赖可控、失败可恢复、问题可观测。

## Spring Cloud 项目基础

正式学习组件之前，建议先搭一个 Maven 多模块工程。多模块不是微服务的必要条件，但它非常适合学习阶段统一管理依赖、公共代码和本地启动。

示例结构：

```text
mall-cloud
├── mall-common
├── mall-auth
├── mall-gateway
├── mall-user
├── mall-product
├── mall-order
├── mall-inventory
└── mall-pay
```

模块职责：

- `mall-common`：公共 DTO、枚举、异常、统一响应、工具类。
- `mall-auth`：登录、认证、Token 签发、刷新 Token。
- `mall-gateway`：统一入口、路由、鉴权、限流、跨域。
- `mall-user`：用户资料、会员信息、收货地址。
- `mall-product`：商品、分类、SKU、价格基础信息。
- `mall-order`：订单创建、订单状态、订单查询。
- `mall-inventory`：库存查询、锁定、扣减、释放。
- `mall-pay`：支付单、支付渠道、支付回调。

父工程主要负责版本管理：

```xml
<packaging>pom</packaging>

<modules>
    <module>mall-common</module>
    <module>mall-gateway</module>
    <module>mall-user</module>
    <module>mall-order</module>
</modules>
```

公共模块要克制使用。它适合放稳定的基础设施代码，不适合放业务逻辑。常见原则：

- 可以放：统一响应、异常码、基础 DTO、分页对象、工具类、通用配置。
- 谨慎放：业务枚举、跨服务查询对象、认证上下文。
- 不要放：订单计算逻辑、库存扣减逻辑、支付渠道逻辑。

本地开发时，可以先用固定端口启动：

```yaml
server:
  port: 8081

spring:
  application:
    name: mall-user
```

多服务启动后，先用最简单的调用链验证系统：

```text
浏览器
-> mall-gateway
-> mall-order
-> mall-user
```

这个阶段不要急着接入所有中间件。先保证每个服务职责清晰、接口能调通、日志能看懂，再逐步引入注册中心、配置中心、熔断限流和监控。

## 服务注册与发现

服务注册与发现解决“服务在哪里”的问题。

在单体或少量应用中，可以把目标地址写在配置文件里：

```text
http://192.168.1.10:8081
```

但微服务里，实例会动态扩缩容，IP 和端口可能经常变化。容器化、Kubernetes、弹性伸缩、滚动发布都会让固定地址变得不可靠。

服务注册发现的基本流程：

1. 服务实例启动。
2. 服务把自己的应用名、IP、端口、健康状态注册到注册中心。
3. 调用方通过服务名从注册中心获取实例列表。
4. 调用方通过负载均衡选择一个实例。
5. 实例下线、异常或扩容时，注册中心通知调用方更新列表。

调用方不再写死 IP，而是使用服务名：

```text
http://user-service
```

在 Spring Cloud 中，网关或 Feign 可以通过 `lb://user-service`、`@FeignClient(name = "user-service")` 这样的方式按服务名调用。

常见注册中心：

- Eureka：Netflix 体系中的经典注册中心，早期 Spring Cloud 项目常见。
- Consul：支持服务发现、健康检查和 KV 存储。
- Nacos：国内项目常见，既能做注册中心，也能做配置中心。
- Kubernetes Service：云原生场景下常见，依赖 K8s 原生服务发现。

以 Nacos 为例，服务提供方和调用方都需要接入 discovery starter：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

基础配置：

```yaml
spring:
  application:
    name: mall-user
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848
```

启动后可以在 Nacos 控制台看到 `mall-user` 实例。订单服务调用用户服务时，不需要知道用户服务具体 IP，只需要使用服务名：

```java
@FeignClient(name = "mall-user")
public interface UserClient {

    @GetMapping("/users/{id}")
    UserDTO getById(@PathVariable("id") Long id);
}
```

Nacos 中要理解几个概念：

- Namespace：用于环境隔离，例如 dev、test、prod。
- Group：用于业务分组或项目分组。
- Service：服务名，例如 `mall-user`。
- Instance：具体服务实例，包含 IP、端口、权重、健康状态和元数据。
- 临时实例：依赖心跳保活，实例异常后会自动摘除。
- 持久实例：更适合需要人工管理的固定服务，异常后不会简单删除。

生产注意点：

- 服务名要稳定，避免随意改名。
- 健康检查不能只检查进程存活，还要关注关键依赖是否可用。
- 注册中心要高可用部署。
- 服务下线要优雅，先摘流量，再停止进程。
- 调用方要设置超时和熔断，不能完全依赖注册中心健康状态。

一个常见误区是认为“注册中心能发现服务，所以服务就一定可用”。注册中心只能提供实例信息，真正的可用性还要靠健康检查、超时、熔断、负载均衡和监控共同保证。

## 配置中心

配置中心解决“配置如何统一管理”的问题。

单个服务可以用本地 `application.yml` 管理配置。但当服务数量变多、环境变多、实例变多时，本地配置会带来明显问题：

- 修改配置需要重新打包或重新发布。
- dev、test、pre、prod 配置容易混乱。
- 密码、Token、密钥容易散落在代码仓库。
- 多个实例配置不一致，排查困难。
- 开关类配置无法快速生效。

常见配置包括：

- 数据库连接
- Redis 地址
- MQ 地址
- 第三方 API 地址
- 功能开关
- 限流参数
- 日志级别
- 线程池参数
- 灰度规则

配置中心的价值：

- 集中管理多环境配置。
- 配置变更有审计记录。
- 支持权限控制。
- 支持部分配置动态刷新。
- 减少重新打包。
- 配合灰度和回滚降低发布风险。

常见方案：

- Spring Cloud Config
- Nacos Config
- Apollo
- Consul KV
- Kubernetes ConfigMap / Secret

以 Nacos Config 为例，常见组织方式是“环境 namespace + 公共配置 + 服务私有配置”：

```text
dev namespace
├── common.yaml
├── mall-gateway.yaml
├── mall-user.yaml
└── mall-order.yaml

prod namespace
├── common.yaml
├── mall-gateway.yaml
├── mall-user.yaml
└── mall-order.yaml
```

依赖示例：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
```

配置导入示例：

```yaml
spring:
  application:
    name: mall-user
  config:
    import:
      - optional:nacos:common.yaml
      - optional:nacos:mall-user.yaml
  cloud:
    nacos:
      config:
        server-addr: localhost:8848
        namespace: dev
        group: DEFAULT_GROUP
```

公共配置适合放所有服务共享的内容，例如日志格式、Redis 基础地址、监控开关。服务私有配置适合放当前服务独有的数据库、线程池、业务开关。

配置中心不是“万能远程 properties 文件”。使用时要区分配置类型：

| 配置类型 | 是否适合动态刷新 | 示例 |
| --- | --- | --- |
| 功能开关 | 适合 | 是否开启新推荐算法 |
| 限流阈值 | 适合 | 每秒最大请求数 |
| 日志级别 | 适合 | 将某包日志临时调成 DEBUG |
| 数据库连接核心参数 | 谨慎 | URL、连接池大小 |
| Bean 创建条件 | 通常不适合 | 是否启用某个核心组件 |

动态刷新有边界。已经创建的对象、连接池、线程池、缓存和第三方客户端，不一定能安全地随着配置变更自动重建。生产中对动态配置要分级管理，关键配置变更仍然应走发布流程或灰度流程。

敏感配置要加密或接入专门的密钥管理方案，不要把数据库密码、私钥、第三方 Token 明文散落在 Git 仓库或普通配置页面。

## Spring Cloud Gateway

Spring Cloud Gateway 是微服务统一入口。

没有网关时，前端或外部调用方需要知道每个后端服务地址：

```text
/user-api -> user-service
/order-api -> order-service
/pay-api -> payment-service
```

这会导致外部调用方和内部服务强绑定。服务拆分、接口迁移、鉴权规则、跨域处理、限流策略都会变得分散。

Gateway 的核心职责包括：

- 路由：把请求转发到对应后端服务。
- 鉴权：统一校验 Token、签名、权限。
- 限流：按用户、IP、接口或租户限制请求。
- 跨域：统一处理 CORS。
- 灰度发布：按 Header、Cookie、用户或权重转发不同版本。
- 请求改写：修改 Path、Header、Query。
- 统一日志：记录入口请求、耗时、状态码和 traceId。
- TLS 终止或转发：统一处理 HTTPS 入口。

示例配置：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1
```

关键概念：

- Route：一条路由规则，由 ID、目标 URI、断言和过滤器组成。
- Predicate：判断请求是否匹配路由，例如 Path、Host、Method、Header。
- Filter：对请求或响应做处理，例如改路径、加 Header、限流。
- `lb://`：表示通过服务发现和负载均衡转发。

如果需要统一鉴权，可以写 `GlobalFilter`。网关只做身份确认和粗粒度权限判断，具体业务权限仍然应该由业务服务兜底。

```java
@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");
        String path = exchange.getRequest().getURI().getPath();

        if (path.startsWith("/auth/login")) {
            return chain.filter(exchange);
        }

        if (!TokenUtils.isValid(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        ServerHttpRequest request = exchange.getRequest()
                .mutate()
                .header("X-User-Id", TokenUtils.getUserId(token))
                .build();

        return chain.filter(exchange.mutate().request(request).build());
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
```

跨域也通常在网关统一配置：

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "https://example.com"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
            allowedHeaders:
              - "*"
            allowCredentials: true
```

Gateway 适合放横切逻辑，不适合堆业务逻辑。比如：

- 适合：Token 校验、权限粗过滤、流量控制、日志、路由改写。
- 不适合：订单价格计算、库存扣减、复杂业务编排。

如果把大量业务逻辑放进网关，网关会变成新的“大单体”，同时也会成为系统瓶颈和发布风险点。

生产注意点：

- 网关必须多实例部署。
- 网关限流要有兜底策略。
- 路由规则变更要可回滚。
- 鉴权失败、限流失败、下游超时要有统一响应格式。
- 日志中必须包含 traceId，便于串联后端服务。
- 不要在网关中读取大请求体做复杂计算。

## 认证与授权

微服务里的认证授权比单体更复杂。单体应用通常在一个进程里完成登录、Session、权限判断和业务处理。微服务拆分后，请求会经过网关和多个业务服务，用户身份需要在服务之间可信传递。

常见方案：

```text
用户登录
-> auth 服务校验账号密码
-> auth 服务签发 JWT 或访问令牌
-> 请求进入 Gateway
-> Gateway 校验 Token
-> Gateway 将用户 ID、租户 ID、角色等写入内部 Header
-> 业务服务从 Header 读取用户上下文
-> 业务服务执行细粒度权限判断
```

核心知识点：

- JWT：适合无状态认证，Token 中可携带用户标识、过期时间、签名。
- OAuth2：适合第三方授权、统一认证中心和多客户端授权。
- Spring Security：负责认证、授权、过滤器链和安全上下文。
- RBAC：基于角色的权限模型，常见于后台管理系统。
- 用户上下文：用户 ID、租户 ID、角色、数据权限范围等。
- Token 刷新：访问令牌短有效期，刷新令牌长有效期。

网关统一鉴权的优点是入口规则集中，能减少重复代码。但业务服务不能完全依赖网关。原因很简单：内部服务可能被其他内部任务、测试工具或错误配置绕过网关调用。因此关键业务服务仍然要做必要的权限兜底。

常见实践：

- 外部请求必须走 Gateway。
- Gateway 校验 Token，业务服务不重复解析完整 Token。
- Gateway 只透传可信的内部 Header，例如 `X-User-Id`、`X-Tenant-Id`。
- 业务服务用拦截器把 Header 转成 `UserContext`。
- 管理端接口使用 RBAC，核心数据接口再叠加数据权限。
- 服务间调用使用内部签名、mTLS 或网段隔离增强可信度。

常见问题：

- Token 过期时间太长，泄露后风险大。
- Gateway 校验了登录态，但业务服务没有做资源归属校验。
- 前端可以伪造 `X-User-Id`，而后端没有区分外部 Header 和内部 Header。
- 权限逻辑写在前端或网关，业务服务缺少兜底。
- 多租户系统只校验用户，不校验租户边界。

一个稳妥原则是：认证在入口统一完成，授权在业务边界最终确认。

## OpenFeign

OpenFeign 用声明式接口调用 HTTP 服务。

传统方式可能这样调用：

```java
String url = "http://user-service/users/" + userId;
UserDTO user = restTemplate.getForObject(url, UserDTO.class);
```

Feign 把 HTTP 调用封装成 Java 接口：

```java
@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/users/{id}")
    UserDTO getUser(@PathVariable("id") Long id);
}
```

业务代码像调用本地方法一样调用远程接口：

```java
@Service
public class OrderService {

    private final UserClient userClient;

    public OrderService(UserClient userClient) {
        this.userClient = userClient;
    }

    public OrderDetail getOrderDetail(Long orderId) {
        Order order = orderRepository.findById(orderId);
        UserDTO user = userClient.getUser(order.getUserId());
        return OrderDetail.of(order, user);
    }
}
```

Feign 的好处：

- 接口声明清晰。
- 与 Spring MVC 注解风格一致。
- 可以集成服务发现和负载均衡。
- 可以统一配置超时、日志、拦截器和错误解码。
- 便于封装内部服务 SDK。

但 Feign 只是让远程调用“写起来像本地调用”，并不会让远程调用真的变成本地调用。远程调用仍然存在网络失败、超时、序列化、下游异常、版本兼容等问题。

常见配置：

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:
            connectTimeout: 1000
            readTimeout: 3000
            loggerLevel: basic
```

启动类或配置类中启用 Feign：

```java
@SpringBootApplication
@EnableFeignClients(basePackages = "com.example.mall")
public class OrderApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}
```

服务间传递 Token 或用户上下文时，通常使用 Feign 拦截器。注意不要直接信任前端传入的用户 Header，应该由网关校验 Token 后再写入可信 Header。

```java
@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor userContextInterceptor() {
        return template -> {
            String userId = UserContext.getUserId();
            if (userId != null) {
                template.header("X-User-Id", userId);
            }
        };
    }
}
```

Feign 异常处理建议统一封装。下游返回业务错误码时，可以通过 `ErrorDecoder` 转成调用方能识别的业务异常；下游超时或不可用时，要进入降级、重试或快速失败逻辑。

使用 Feign 的实践原则：

- 每个 Feign 调用都要有超时。
- 查询接口可以有限重试，写接口谨慎重试。
- 不要在循环里逐条调用远程接口，优先提供批量接口。
- 不要让服务调用形成复杂网状依赖。
- Feign Client 最好按被调用服务聚合，不要散落重复定义。
- 返回 DTO，不要暴露后端 Entity 或内部框架对象。

常见坏味道：

```java
for (Long userId : userIds) {
    UserDTO user = userClient.getUser(userId);
    users.add(user);
}
```

这会产生 N 次远程调用，数据量稍大就会放大延迟和失败概率。更好的方式是由用户服务提供批量接口：

```java
@PostMapping("/users/batch")
List<UserDTO> listUsers(@RequestBody List<Long> userIds);
```

## 负载均衡

服务通常有多个实例：

```text
user-service-1
user-service-2
user-service-3
```

调用方需要在多个实例之间选择一个。Spring Cloud LoadBalancer 提供客户端负载均衡能力，Gateway 和 OpenFeign 都可以与它配合。

负载均衡的基本流程：

1. 调用方根据服务名获取实例列表。
2. 负载均衡器按策略选择一个实例。
3. 发起请求。
4. 请求失败时根据配置决定是否重试或快速失败。

常见策略：

- 轮询：按顺序依次调用实例，简单均衡。
- 随机：随机选择实例，实现简单。
- 权重：高配置机器分配更多流量。
- 按区域：优先调用同机房、同可用区实例。
- 健康状态过滤：过滤不可用或异常实例。

负载均衡不是越复杂越好。大多数业务使用默认策略即可，真正重要的是：

- 实例健康状态准确。
- 下线时能优雅摘流量。
- 调用方有超时和熔断。
- 指标能看出单实例异常。

如果某个实例 CPU 飙高、GC 频繁或依赖数据库变慢，注册中心未必能立刻感知。调用方仍然可能把请求打过去。因此生产治理要把健康检查、负载均衡、熔断和指标监控组合起来看。

## 熔断、限流和重试

微服务系统里，故障会传播。

例如支付服务变慢：

```text
payment-service 响应变慢
  -> order-service 等待支付服务
  -> order-service 线程池被占满
  -> gateway 请求堆积
  -> 用户看到整个系统都慢
```

常见治理手段：

- 超时：不要无限等待下游。
- 重试：短暂网络抖动可以重试，但必须限制次数。
- 熔断：下游持续失败时快速失败，避免请求继续打爆下游。
- 限流：保护服务不被突发流量打穿。
- 隔离：用线程池、连接池、舱壁模式限制故障范围。
- 降级：返回兜底结果或提示用户稍后再试。

Resilience4j 是 Spring 生态中常见的熔断限流库。它提供 CircuitBreaker、RateLimiter、Retry、Bulkhead、TimeLimiter 等能力。

在国内 Spring Cloud Alibaba 项目中，Sentinel 也很常见。它更强调流量治理，提供控制台、限流规则、熔断规则、热点参数限流和系统自适应保护。

Sentinel 常见依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```

典型使用方式：

```java
@SentinelResource(
        value = "createOrder",
        blockHandler = "createOrderBlocked",
        fallback = "createOrderFallback"
)
public OrderDTO createOrder(CreateOrderCommand command) {
    return orderApplicationService.create(command);
}

public OrderDTO createOrderBlocked(CreateOrderCommand command, BlockException ex) {
    return OrderDTO.rejected("系统繁忙，请稍后再试");
}

public OrderDTO createOrderFallback(CreateOrderCommand command, Throwable ex) {
    return OrderDTO.failed("创建订单失败，请稍后重试");
}
```

`blockHandler` 通常处理限流、熔断等规则触发；`fallback` 通常处理业务异常或运行时异常。两者语义不同，不要混用。

核心原则：

```text
所有远程调用都必须有超时。
重试只用于幂等操作。
熔断要有清晰降级结果。
限流要区分用户、接口和服务级别。
隔离要保护自己的核心线程和连接资源。
```

超时、重试和熔断之间要配合，不能各配各的。例如一次 Feign 调用读取超时 3 秒，又配置重试 3 次，那么最坏情况下可能阻塞接近 9 秒甚至更久。上游如果也重试，就会形成请求放大。

写接口尤其要谨慎重试。比如扣款、下单、发券等操作，如果没有幂等设计，重试可能造成重复扣款、重复订单或重复发放。

一个可接受的降级结果要根据业务场景设计：

- 商品推荐失败：返回默认推荐列表。
- 用户等级查询失败：按普通用户处理，或提示稍后再试。
- 支付创建失败：不能假装成功，应明确失败并保留可重试入口。
- 库存扣减失败：不能静默忽略，应中断下单流程。

稳定性设计的关键不是“所有失败都兜底”，而是区分哪些可以降级、哪些必须失败、哪些可以异步补偿。

## 服务拆分原则

不要为了微服务而微服务。

服务拆分要考虑：

- 业务边界是否清晰。
- 数据所有权是否清晰。
- 团队是否能独立维护。
- 部署是否需要独立。
- 调用频率是否可接受。
- 一致性要求是否强。
- 故障是否应该隔离。

常见拆分：

- 用户服务：账号、登录、用户资料、会员信息。
- 商品服务：商品 SPU、SKU、分类、价格基础信息。
- 订单服务：订单创建、订单状态、订单查询。
- 库存服务：库存查询、锁定、扣减、释放。
- 支付服务：支付单、支付渠道、支付回调。
- 营销服务：优惠券、活动、满减、积分。

拆分的核心是业务能力，而不是数据库表。不要把每张表都拆成一个服务。过细拆分会导致：

- 远程调用数量暴涨。
- 查询链路变长。
- 分布式事务复杂。
- 接口版本管理困难。
- 本来简单的功能需要多个团队协作。

更合理的思路是先做模块化单体，把领域边界、包结构、数据归属和接口契约理清楚。等业务规模、团队协作和部署诉求真的出现，再把稳定边界拆成独立服务。

判断一个模块是否适合拆成服务，可以问几个问题：

1. 它是否有独立的业务语义？
2. 它的数据是否可以明确归属？
3. 它是否经常需要独立发布？
4. 它的流量是否需要独立扩容？
5. 它故障时是否应该隔离，不影响其他核心流程？

如果答案大多是否定的，暂时留在单体或模块化单体中通常更稳。

## 分布式事务

微服务拆分后，本地事务不再覆盖多个服务。

例如下单流程：

1. 创建订单。
2. 扣减库存。
3. 创建支付单。
4. 发放优惠券。
5. 发送订单创建消息。

如果这些步骤分布在多个服务中，一个本地数据库事务无法同时保证它们全部成功或全部回滚。

常见方案：

- 最终一致性：允许短时间不一致，通过异步流程最终达到一致。
- 可靠消息：本地事务和消息发送绑定，消费者完成后续动作。
- Saga：把长事务拆成多个本地事务，每步都有补偿动作。
- TCC：Try、Confirm、Cancel 三阶段，适合强业务约束场景。
- 本地消息表：业务数据和待发送消息在同一个本地事务中落库。
- 事务补偿：通过定时任务或事件修复异常状态。
- Seata AT：通过全局事务协调器、分支事务和 `undo_log` 尝试简化跨库事务。

常见下单设计：

```text
订单服务创建订单和本地消息
  -> MQ 投递订单创建事件
  -> 库存服务消费事件并扣减库存
  -> 支付服务创建支付单
  -> 各服务通过状态机和补偿任务保证最终一致
```

设计分布式事务时，优先顺序通常是：

1. 通过业务设计避免跨服务强一致。
2. 使用最终一致性和可靠消息。
3. 对确实需要强约束的场景，再考虑 TCC 或事务框架。

不是所有流程都需要分布式事务框架。框架能降低一部分编码成本，但不能替代业务语义设计。比如“库存是否可以预占”“优惠券发放失败是否影响下单”“支付单创建失败如何恢复”，这些都必须由业务规则明确。

以 Seata AT 模式为例，核心概念包括：

- TC：事务协调器，维护全局事务和分支事务状态。
- TM：事务管理器，负责开启、提交或回滚全局事务。
- RM：资源管理器，管理本地数据库资源并注册分支事务。
- `undo_log`：记录回滚所需的前镜像和后镜像。
- 全局事务：跨多个服务和数据库的一次整体事务。
- 分支事务：每个参与服务内部的本地事务。

示例：

```java
@GlobalTransactional
public void createOrder(CreateOrderCommand command) {
    orderRepository.save(command.toOrder());
    inventoryClient.deduct(command.getSkuId(), command.getCount());
    accountClient.deduct(command.getUserId(), command.getAmount());
}
```

这类写法看起来简单，但生产中要谨慎。跨服务强事务会增加锁持有时间、协调器依赖和异常恢复复杂度。订单、库存、支付这类核心流程，更常见的做法是状态机 + 可靠消息 + 补偿对账。

什么时候适合强事务：

- 链路短。
- 参与方少。
- 并发不高。
- 业务确实不能接受短暂不一致。
- 团队能处理事务协调器高可用和异常恢复。

什么时候更适合最终一致性：

- 流程长。
- 参与服务多。
- 需要削峰。
- 用户可以接受“处理中”状态。
- 可以通过补偿任务或对账修复异常。

## 可观测性

微服务没有可观测性就很难排错。

单体应用中，请求大多在一个进程内完成。微服务中，一次请求可能跨网关、多个业务服务、数据库、缓存、消息队列和第三方系统。任何一个环节慢或失败，用户看到的都可能只是“请求失败”。

至少要有：

- 结构化日志
- traceId
- 指标监控
- 链路追踪
- 告警
- 慢请求分析
- 错误聚合
- 依赖拓扑

一次请求跨多个服务时，要能串起来：

```text
gateway -> order-service -> user-service -> payment-service
```

日志中至少包含：

- traceId
- spanId
- userId 或租户 ID
- 请求路径
- 响应状态码
- 耗时
- 错误码
- 下游服务名

指标监控中至少关注：

- QPS
- 平均耗时、P95、P99
- 错误率
- CPU、内存、GC
- 线程池状态
- 连接池状态
- 数据库慢查询
- MQ 堆积
- 熔断和限流次数

OpenTelemetry 是当前常见的可观测性标准之一，可以与 Prometheus、Grafana、Jaeger、Zipkin 等工具组合。

排查问题时，不要只看单个服务日志。更有效的方式是：

1. 从告警或用户报错定位时间窗口。
2. 通过 traceId 查看完整链路。
3. 找到耗时最高或报错的 span。
4. 查看对应服务日志和指标。
5. 判断是代码问题、依赖问题、资源问题还是流量问题。

可观测性不是上线后再补的功能，而是微服务系统的基础设施。没有 traceId、指标和告警，服务拆得越多，排查成本越高。

## 监控体系

链路追踪解决“一次请求经过了哪里”，监控体系解决“系统整体是否健康、资源是否够用、趋势是否异常”。

Spring Boot Actuator 是最基础的入口。常用端点包括：

- `/actuator/health`：健康检查。
- `/actuator/metrics`：指标。
- `/actuator/prometheus`：Prometheus 抓取格式。
- `/actuator/info`：应用信息。
- `/actuator/loggers`：日志级别查看与调整。

依赖示例：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

基础配置：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      probes:
        enabled: true
      show-details: when_authorized
```

生产中至少要监控：

- 应用指标：QPS、响应时间、错误率、慢接口、状态码分布。
- JVM 指标：堆内存、非堆内存、GC 次数和耗时、线程数。
- 资源指标：CPU、内存、磁盘、网络。
- 依赖指标：数据库连接池、Redis、MQ、第三方接口。
- 网关指标：路由耗时、限流次数、鉴权失败次数、下游错误率。
- Feign 指标：下游服务耗时、错误率、超时次数。
- MQ 指标：生产速率、消费速率、堆积数量、死信数量。

告警不要只看机器 CPU。微服务系统更应该围绕业务链路设置告警，例如：

- 下单接口 P95 超过阈值。
- 支付回调失败率升高。
- 库存扣减失败率异常。
- MQ 堆积持续增长。
- 某个下游服务错误率超过阈值。
- 网关 5xx 比例上升。

Grafana 面板也要分层：入口总览、服务总览、单服务详情、JVM 详情、依赖详情、业务大盘。这样从告警到定位会更快。

## 消息驱动

消息驱动不是 Spring Cloud 的唯一核心，但在微服务架构中非常常见。

服务间调用有两种典型模式：

- 同步调用：调用方等待结果，例如 Feign HTTP 调用。
- 异步消息：调用方发布事件，消费者异步处理。

同步调用适合需要立即返回结果的场景，例如查询用户信息、校验库存是否充足。异步消息适合解耦、削峰和最终一致性，例如订单创建后发送通知、更新积分、生成报表。

常见消息中间件：

- Kafka
- RabbitMQ
- RocketMQ
- Pulsar

消息驱动要重点关注：

- 消息是否可能重复消费。
- 消费失败如何重试。
- 重试多次失败后是否进入死信队列。
- 消息顺序是否有业务要求。
- 消息堆积如何告警。
- 生产者发送成功但本地事务失败怎么办。
- 本地事务成功但消息发送失败怎么办。

消费者必须具备幂等能力。因为在网络抖动、消费超时、重平衡、手动重试等情况下，同一条消息可能被消费多次。

幂等常见实现：

- 使用业务唯一键。
- 使用去重表。
- 使用状态机判断。
- 使用数据库唯一索引。
- 使用 Redis 短期去重，但关键业务仍应有数据库兜底。

不要把 MQ 当成“异步万能药”。消息会引入延迟、重复、乱序、堆积和排查复杂度。只有当解耦、削峰或最终一致性收益明确时，才值得引入。

## 配置与部署

微服务从本地跑起来到生产可用，中间还需要配置、镜像、编排、发布和回滚能力。

多环境配置通常至少包括：

```text
dev：开发环境
test：测试环境
pre：预发环境
prod：生产环境
```

不同环境要隔离：

- Nacos namespace 隔离。
- 数据库、Redis、MQ 地址隔离。
- 第三方接口账号隔离。
- 日志级别和采样率隔离。
- 限流阈值和线程池参数隔离。

一个简单 Dockerfile：

```dockerfile
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY target/app.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
```

本地可以用 Docker Compose 编排 Nacos、数据库和业务服务：

```yaml
services:
  nacos:
    image: nacos/nacos-server
    ports:
      - "8848:8848"
    environment:
      MODE: standalone

  mall-user:
    image: mall-user:latest
    ports:
      - "8081:8081"
    environment:
      SPRING_PROFILES_ACTIVE: dev

  mall-order:
    image: mall-order:latest
    ports:
      - "8082:8082"
    environment:
      SPRING_PROFILES_ACTIVE: dev
```

生产发布要关注：

- 滚动发布：逐批替换实例，降低中断风险。
- 蓝绿发布：新旧两套环境切换，回滚清晰但资源成本高。
- 灰度发布：按用户、Header、地区或比例放量。
- 优雅停机：先摘除流量，再等待请求处理完成。
- 健康检查：readiness 失败时不接收新流量。
- 回滚策略：镜像、配置、数据库脚本都要可回退或可兼容。

数据库变更尤其要谨慎。服务可以灰度，但数据库通常是共享依赖。建议遵循“先兼容、再发布、后清理”的节奏：

```text
新增字段，保持旧代码可用
-> 发布兼容新字段的新代码
-> 数据迁移和验证
-> 清理旧字段或旧逻辑
```

## Kubernetes 集成

Spring Cloud 可以和 Kubernetes 组合使用，但两者职责有重叠。

Kubernetes 本身提供：

- 服务发现：Service、DNS。
- 配置管理：ConfigMap、Secret。
- 健康检查：livenessProbe、readinessProbe。
- 弹性伸缩：HPA。
- 滚动发布：Deployment。
- 流量入口：Ingress、Gateway API。

Spring Cloud 提供：

- 应用层服务发现客户端。
- 配置中心客户端。
- Gateway 网关能力。
- OpenFeign 调用能力。
- LoadBalancer 客户端负载均衡。
- 熔断限流与应用治理。

在 K8s 环境中，常见选择有两种：

```text
方案一：使用 Nacos / Consul 等注册配置中心
应用通过 Spring Cloud 组件完成服务发现和配置管理

方案二：更多使用 Kubernetes 原生能力
应用通过 K8s Service DNS 调用，配置使用 ConfigMap / Secret
```

选择取决于团队基础设施、跨环境诉求和治理习惯。已经有 Nacos 体系的团队，继续用 Nacos 管理注册和配置很常见。更云原生的团队可能倾向于把服务发现交给 K8s，把高级流量治理交给 Service Mesh 或网关。

注意不要重复建设同一层能力。例如同一套服务发现同时依赖 Nacos、K8s Service 和自定义路由规则，复杂度会迅速上升。生产架构要明确“谁负责服务发现、谁负责配置、谁负责入口流量、谁负责熔断限流”。

## 推荐学习项目

可以做一个简单电商微服务项目：

```text
gateway-service
user-service
product-service
order-service
inventory-service
payment-service
```

建议功能：

1. 用户注册登录。
2. 商品查询。
3. 创建订单。
4. 调用库存服务锁定库存。
5. 调用支付服务创建支付单。
6. 网关统一鉴权。
7. 配置中心管理环境配置。
8. 注册中心管理服务发现。
9. Feign 调用内部服务。
10. 增加熔断、日志和 traceId。
11. MQ 处理订单创建后的异步事件。
12. 用状态机处理订单生命周期。

推荐模块结构：

```text
mall-cloud
  common-core
  common-web
  common-security
  gateway-service
  user-service
  product-service
  order-service
  inventory-service
  payment-service
```

每个业务服务可以采用类似结构：

```text
src/main/java
  controller
  application
  domain
  infrastructure
  client
  config
```

练习顺序：

1. 先让每个服务能独立启动。
2. 接入注册中心，用服务名互相调用。
3. 接入网关，所有外部请求走 Gateway。
4. 接入配置中心，区分 dev、test、prod。
5. 给 Feign 调用配置超时和降级。
6. 给网关和核心接口加限流。
7. 接入日志 traceId 和链路追踪。
8. 用 MQ 改造非核心同步调用。
9. 加入健康检查和监控面板。
10. 做一次服务下线、超时、异常和回滚演练。

这个项目能覆盖 Spring Cloud 的核心知识，也能暴露真实微服务开发中的主要问题。

## 现实常见问题与 Spring Cloud 解决方案

Spring Cloud 的价值通常不是在“正常情况下能调用成功”，而是在异常、扩容、发布和排障时仍然可控。

### 1. 服务地址写死，扩容后调用方不知道新实例

问题表现：

- 配置文件里写死 `http://192.168.x.x:8080`。
- 新增实例后调用方不走新实例。
- 服务迁移机器后调用失败。

解决方案：

- 使用 Nacos、Consul、Eureka 或 Kubernetes Service 做服务发现。
- 调用方通过服务名访问，例如 `lb://mall-user` 或 `@FeignClient(name = "mall-user")`。
- 服务下线前先从注册中心摘除或等待 readiness 变为不可用。

### 2. 下游服务变慢，拖垮上游

问题表现：

- 某个下游接口超时，上游线程大量阻塞。
- 网关请求堆积。
- 用户感觉整个系统都慢。

解决方案：

- Feign 配置连接超时和读取超时。
- 使用 Sentinel 或 Resilience4j 做熔断、限流和隔离。
- 对非核心能力做降级，例如推荐、标签、营销信息。
- 对核心链路做容量评估和压测。

### 3. 重试导致请求放大

问题表现：

- 下游短暂故障，上游和网关层层重试。
- 原本 1 次请求变成多次请求。
- 下游服务被重试流量彻底打挂。

解决方案：

- 明确每一层的重试责任，避免多层重复重试。
- 写接口默认不重试，除非有幂等保证。
- 查询接口使用有限次数重试，并配置退避。
- 通过熔断快速失败，避免持续请求异常下游。

### 4. 网关变成业务大杂烩

问题表现：

- 网关里写订单校验、价格计算、库存判断。
- 网关发布频率越来越高。
- 一个业务改动影响所有入口流量。

解决方案：

- Gateway 只做路由、鉴权、限流、日志、协议适配等横切能力。
- 业务规则放回对应领域服务。
- 复杂编排可以放在应用服务层或独立 BFF，而不是塞进网关过滤器。

### 5. 配置修改引发生产事故

问题表现：

- 改错生产配置，所有实例立即异常。
- dev 配置误用到 prod。
- 密钥明文泄露。

解决方案：

- Nacos namespace 区分环境，group 区分项目或业务线。
- 配置变更要有权限、审批和审计。
- 关键配置不要随意动态刷新。
- 敏感配置接入密钥管理或加密存储。
- 变更前备份配置，变更后观察指标。

### 6. 跨服务查库导致边界失效

问题表现：

- 订单服务直接查用户库。
- 用户表结构变更导致订单服务报错。
- 数据库账号权限混乱。

解决方案：

- 每个服务拥有自己的数据库或 schema 边界。
- 跨服务数据通过 API、事件、搜索索引或报表库获取。
- 高频查询可以做数据冗余，但要明确同步和修复机制。

### 7. 分布式事务过度使用

问题表现：

- 所有跨服务写操作都上强事务。
- 事务链路长，锁等待严重。
- 事务协调器异常后业务不可用。

解决方案：

- 优先通过业务状态机和最终一致性设计流程。
- 使用 MQ、本地消息表、补偿任务和对账机制。
- 只有短链路、强一致、低并发场景才考虑 Seata AT 或 TCC。

### 8. MQ 重复消费导致脏数据

问题表现：

- 重复发短信、重复发券、重复加积分。
- 消费失败后重试，数据状态异常。

解决方案：

- 消费者必须幂等。
- 使用业务唯一键、去重表、唯一索引或状态机控制。
- 消费失败进入重试队列，多次失败进入死信队列。
- 定期对账修复异常数据。

### 9. 没有 traceId，线上问题靠猜

问题表现：

- 用户报错只能搜索单个服务日志。
- 不知道请求经过了哪些服务。
- 找不到真正慢的下游。

解决方案：

- 网关生成或接收 traceId。
- HTTP、Feign、MQ 都要透传 traceId。
- 日志格式统一输出 traceId。
- 接入 Micrometer Tracing、OpenTelemetry、Zipkin、Jaeger 或 SkyWalking。

### 10. 灰度发布不可控

问题表现：

- 新版本一发布影响所有用户。
- 出问题只能整体回滚。
- 多服务版本不兼容。

解决方案：

- Gateway 根据 Header、Cookie、用户 ID 或权重做灰度路由。
- 服务接口保持向后兼容。
- 配置中心控制功能开关。
- 发布前压测和预发验证。
- 保留清晰的镜像回滚和配置回滚方案。

## 生产 Checklist

上线前至少检查以下内容：

1. 服务间调用设置连接超时和读取超时。
2. Feign 写接口没有随意重试。
3. 网关统一鉴权、跨域和限流。
4. 配置中心区分环境、权限和敏感配置。
5. 服务注册健康检查可靠。
6. 服务下线支持优雅停机和摘流量。
7. 日志包含 traceId，并能跨服务串联。
8. 指标监控覆盖 QPS、耗时、错误率和资源使用。
9. 核心接口有熔断、限流或降级策略。
10. 数据库归属清晰，禁止跨服务直接访问数据库。
11. 接口版本管理明确。
12. MQ 消费者具备幂等能力。
13. 分布式事务有补偿和对账机制。
14. 灰度发布和回滚流程可执行。
15. 告警阈值经过压测或线上数据校准。

很多线上事故不是因为不会配置组件，而是因为超时、重试、限流、幂等、监控和回滚这些基础治理没有做好。

## 常考面试题和答案

### 1. Spring Cloud 是什么？它和 Spring Boot 有什么区别？

Spring Cloud 是构建分布式系统和微服务架构的一组工具集合，包括服务注册发现、配置中心、网关、服务调用、负载均衡、熔断限流、链路追踪等能力。

Spring Boot 关注单个应用的快速开发和运行，Spring Cloud 关注多个 Spring Boot 应用之间的协作和治理。可以理解为 Spring Boot 是微服务的应用基础，Spring Cloud 是微服务的治理体系。

### 2. 微服务一定比单体好吗？

不一定。微服务提升的是边界隔离、独立部署、独立扩容和团队协作能力，但会引入远程调用、分布式事务、链路追踪、部署运维和服务治理复杂度。

如果业务规模小、团队人数少、发布频率不高，模块化单体通常更合适。微服务适合业务边界清晰、团队规模较大、不同模块需要独立演进和扩容的场景。

### 3. 服务注册与发现的原理是什么？

服务启动后把自己的服务名、IP、端口和健康状态注册到注册中心。调用方通过服务名订阅或查询实例列表，再通过负载均衡选择一个实例发起调用。

实例扩容、下线或异常时，注册中心会更新实例列表。调用方不需要写死 IP，只需要按服务名调用。

### 4. Eureka、Nacos、Consul 有什么区别？

Eureka 是早期 Spring Cloud Netflix 体系常见注册中心，设计上强调可用性。Consul 支持服务发现、健康检查和 KV 存储，也常用于基础设施层。Nacos 同时支持服务注册发现和配置管理，国内 Java 微服务项目使用较多。

选型时要看团队基础设施、运维经验、配置中心需求、生态适配和高可用能力，而不是只看组件名。

### 5. 配置中心解决什么问题？

配置中心解决多服务、多环境、多实例下的配置集中管理问题。它可以统一管理数据库地址、Redis 地址、功能开关、限流参数、日志级别等配置，并提供权限控制、变更审计和部分动态刷新能力。

但不是所有配置都适合动态刷新。连接池、线程池、核心 Bean 创建条件等配置变更要谨慎处理。

### 6. Spring Cloud Gateway 的核心概念有哪些？

核心概念是 Route、Predicate 和 Filter。

Route 表示一条路由规则。Predicate 用来判断请求是否匹配这条路由，例如 Path、Method、Header。Filter 用来在请求转发前后做处理，例如鉴权、限流、改写路径、添加 Header、记录日志。

### 7. Gateway 和 Nginx 有什么区别？

Nginx 更偏通用反向代理、静态资源、负载均衡和入口代理。Spring Cloud Gateway 更偏应用层网关，和 Spring 生态集成更深，适合做基于服务名的路由、鉴权、限流、灰度、请求改写和统一日志。

生产中两者可以组合：公网入口先到 Nginx 或云负载均衡，再转发到 Gateway，Gateway 再路由到内部微服务。

### 8. OpenFeign 的原理是什么？

OpenFeign 根据接口和注解生成动态代理。业务代码调用接口方法时，代理会把方法调用转换为 HTTP 请求，完成参数编码、请求发送、响应解码和异常处理。

它通常会和服务发现、负载均衡、超时配置、拦截器、错误解码器、熔断降级等能力结合使用。

### 9. Feign 调用需要注意什么？

远程调用必须设置超时，不能无限等待。写接口不要随意重试，除非业务具备幂等能力。不要在循环中大量调用 Feign，应提供批量接口。返回值使用 DTO，不要暴露 Entity。服务间依赖要控制，避免形成复杂网状调用。

### 10. 什么是客户端负载均衡？

客户端负载均衡是调用方自己从服务实例列表中选择一个目标实例发起请求。Spring Cloud LoadBalancer 就是客户端负载均衡组件。

它和服务端负载均衡的区别是：服务端负载均衡由 Nginx、SLB 等统一接收请求再转发；客户端负载均衡由调用方在本地选择实例。

### 11. 什么是熔断？和降级有什么区别？

熔断是当下游服务持续失败或响应过慢时，调用方暂时停止访问该下游，直接快速失败或走降级逻辑，避免故障扩散。

降级是失败后的替代处理方式，例如返回默认值、缓存值、空结果或友好错误提示。熔断是一种保护机制，降级是用户侧或业务侧的兜底结果。

### 12. 限流、熔断、降级有什么区别？

限流是限制进入系统或接口的请求量，防止流量过大打垮服务。熔断是下游异常时主动切断调用，防止故障扩散。降级是能力不可用时返回替代结果。

简单理解：限流防流量，熔断防故障传播，降级保核心体验。

### 13. 重试为什么可能导致事故？

重试会放大请求量。如果下游已经变慢，上游大量重试会让下游压力更大，甚至引发雪崩。写接口如果没有幂等，重试还可能造成重复下单、重复扣款、重复发券。

因此重试要限制次数、设置退避策略，并且只用于适合重试的幂等操作。

### 14. 什么是服务雪崩？如何防止？

服务雪崩是一个服务故障或变慢后，调用它的上游服务也被拖慢，进而影响更多服务，最终导致大面积不可用。

防止手段包括：超时、熔断、限流、隔离、降级、缓存、异步化、依赖拆分、容量评估和压测。

### 15. 微服务如何拆分？

优先按业务能力和领域边界拆分，而不是按数据库表拆分。每个服务应该有清晰的数据所有权、业务语义、接口契约和独立发布价值。

拆分前可以先做模块化单体，等边界稳定后再独立部署。过细拆分会导致远程调用爆炸、事务复杂和排查困难。

### 16. 微服务之间能不能直接访问对方数据库？

不建议。每个服务应该拥有自己的数据边界，其他服务通过 API 或事件获取数据。跨服务直接访问数据库会破坏封装，导致表结构变更影响多个服务，也会让服务边界失去意义。

如果确实有跨域查询需求，可以通过 API 聚合、CQRS、数据同步、搜索索引或报表库解决。

### 17. 分布式事务有哪些常见方案？

常见方案包括最终一致性、可靠消息、本地消息表、Saga、TCC 和事务补偿。

一般优先通过业务设计减少强一致需求，再使用可靠消息和最终一致性。TCC 适合强约束场景，但实现复杂，需要 Try、Confirm、Cancel 都具备明确业务语义和幂等能力。

### 18. MQ 在微服务中有什么作用？

MQ 主要用于异步解耦、削峰填谷和最终一致性。例如订单创建后，发送通知、更新积分、生成报表可以通过消息异步处理，避免阻塞主链路。

使用 MQ 要处理重复消费、消费失败、死信队列、消息堆积、顺序消息和消息丢失等问题。消费者必须做幂等。

### 19. 什么是链路追踪？为什么重要？

链路追踪用于记录一次请求经过哪些服务、每个服务耗时多少、哪里报错。微服务中一次请求可能跨多个服务，没有 traceId 和链路追踪，很难定位问题。

常见做法是在入口生成 traceId，并在 HTTP、RPC、MQ 调用中继续传递。日志、指标和 trace 系统都要能按 traceId 查询。

### 20. Spring Cloud 项目上线前最重要的检查项是什么？

重点检查服务调用超时、重试策略、熔断限流、网关鉴权、配置权限、注册中心高可用、日志 traceId、指标告警、接口幂等、数据库边界、灰度发布和回滚流程。

面试中回答这类问题时，不要只说组件名，要说明它们解决的风险。例如超时防止线程长期阻塞，熔断防止故障扩散，幂等防止重复请求造成脏数据，traceId 用于跨服务排查。

## 推荐书籍

Spring Cloud 版本变化比较快，读书时要特别关注出版时间和示例版本。书可以用来建立体系，具体 API 和依赖版本仍然要以官方文档为准。

1. [Microservices with Spring Boot and Spring Cloud, Fourth Edition](https://www.amazon.com/Microservices-Spring-Boot-Cloud-microservices/dp/1805801279)

   Magnus Larsson 的实战型书籍，覆盖 Spring Boot、Spring Cloud、Docker、Kubernetes、Istio、安全、测试和可观测性。第四版信息显示覆盖 Spring Boot 3.5、Spring Cloud 2025 和 Java 24，适合想按完整项目路线学习的人。

2. [Spring Microservices in Action, Second Edition](https://www.manning.com/books/spring-microservices-in-action-second-edition)

   Manning 的经典微服务实践书，适合有 Java 和 Spring 基础的人。内容覆盖微服务设计、Spring Cloud Config、Gateway、Resilience4j、LoadBalancer、Prometheus、Grafana、Zipkin、ELK、Kubernetes 和 Istio。它更适合理解微服务工程化，而不是只抄配置。

3. [Cloud Native Spring in Action](https://www.manning.com/books/cloud-native-spring-in-action)

   更偏云原生 Spring 和 Kubernetes 的生产实践，适合已经掌握 Spring Boot / Spring Cloud 基础后继续学习容器化、部署、配置、可观测性和云原生应用设计。

4. [Learning Spring Boot 3.0, Third Edition](https://www.oreilly.com/library/view/learning-spring-boot/9781803233307/)

   这本不是 Spring Cloud 专书，但适合补 Spring Boot 3 基础。Spring Cloud 建立在 Spring Boot 之上，如果对自动配置、Actuator、测试、Web、数据访问和应用打包不熟，建议先补这部分。

5. 《微服务架构设计模式》

   Chris Richardson 的微服务架构经典书，重点不在 Spring Cloud 配置，而在服务拆分、Saga、事件驱动、事务一致性、查询模式和部署模式。适合用来提升架构判断力。

阅读建议：

- 第一阶段读 Spring Boot 基础书，补齐单服务能力。
- 第二阶段读 Spring Cloud 实战书，跟着项目做注册、网关、调用、配置和熔断。
- 第三阶段读微服务架构和云原生书，重点理解边界、事务、观测、部署和治理。
- 中文资料可以辅助入门，但版本容易滞后，生产项目要回到官方文档和当前依赖版本验证。

## 参考资料

- [Spring Cloud 官方文档](https://spring.io/projects/spring-cloud)
- [Spring Cloud Reference Documentation](https://docs.spring.io/spring-cloud/docs/current/reference/html/)
- [Spring Cloud Gateway 文档](https://docs.spring.io/spring-cloud-gateway/reference/)
- [Spring Cloud OpenFeign 文档](https://docs.spring.io/spring-cloud-openfeign/reference/)
- [Resilience4j 官方文档](https://resilience4j.readme.io/)
- [Spring Cloud Alibaba 文档](https://sca.aliyun.com/)
- [Nacos 官方文档](https://nacos.io/)
- [Sentinel 官方文档](https://sentinelguard.io/)
- [Seata 官方文档](https://seata.apache.org/)
- [Micrometer 官方文档](https://micrometer.io/docs)

## 总结

Spring Cloud 是 Java 微服务体系的基础工具箱。它帮助你解决服务发现、配置管理、网关路由、服务调用、负载均衡、故障隔离和可观测性问题。

学习 Spring Cloud 时，不要只学组件配置。真正重要的是理解微服务拆分边界、远程调用风险、分布式事务、幂等设计、链路追踪和生产治理。组件只是手段，系统稳定性才是目标。

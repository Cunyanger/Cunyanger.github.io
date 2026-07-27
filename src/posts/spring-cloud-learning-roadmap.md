---
title: Spring Cloud 学习大纲：从微服务基础到生产实践
date: 2026-07-28
category: Java
tag:
  - Spring Cloud
  - Spring Boot
  - 微服务
  - Nacos
  - Gateway
isOriginal: true
excerpt: 一份面向实战的 Spring Cloud 学习路线，覆盖微服务基础、注册中心、服务调用、网关、配置中心、熔断限流、分布式事务、消息队列、认证授权、链路追踪、监控和部署。
---

# Spring Cloud 学习大纲：从微服务基础到生产实践

Spring Cloud 不是一个单独的框架，而是一套围绕微服务开发的技术体系。它解决的核心问题包括：服务怎么发现、服务之间怎么调用、请求如何统一进入、配置如何统一管理、故障如何隔离、分布式事务如何处理、日志和链路如何追踪。

这份大纲适合已经掌握 Spring Boot、REST API、MySQL、Redis 基础的人，目标是从零搭建一个可以用于生产思维训练的微服务系统。

## 1. 微服务基础

先不要急着学组件，先理解微服务要解决的问题。

需要掌握：

- 单体架构与微服务架构的区别。
- 微服务的优点和代价。
- 服务拆分原则。
- 分布式系统常见问题。
- CAP、BASE、最终一致性。
- Spring Boot 与 Spring Cloud 的关系。
- Spring Cloud 常见组件生态。

重点理解：

```text
微服务不是把项目拆小这么简单。
它引入了网络调用、服务治理、分布式事务、链路追踪、部署复杂度等问题。
```

## 2. Spring Cloud 项目基础

建议先用 Maven 多模块工程搭建基础项目。

需要掌握：

- 多模块 Maven 项目搭建。
- 父子工程依赖管理。
- 服务模块划分。
- 公共模块设计。
- 配置文件拆分。
- 本地多服务启动方式。
- 接口调用链路理解。

示例结构：

```text
mall-cloud
├── mall-common
├── mall-auth
├── mall-gateway
├── mall-user
├── mall-order
├── mall-product
└── mall-pay
```

模块职责：

- `mall-common`：公共 DTO、工具类、异常、统一响应。
- `mall-auth`：登录、认证、Token 签发。
- `mall-gateway`：统一入口、路由、鉴权、限流。
- `mall-user`：用户服务。
- `mall-product`：商品服务。
- `mall-order`：订单服务。
- `mall-pay`：支付服务。

## 3. 服务注册与发现

推荐学习：Nacos。

为什么需要注册中心：

```text
服务实例数量会变化。
服务地址不能写死。
服务调用方需要动态发现可用实例。
```

需要掌握：

- 服务注册。
- 服务发现。
- 服务上下线。
- 健康检查。
- 临时实例与持久实例。
- Nacos 控制台使用。
- Spring Cloud 接入 Nacos。

核心链路：

```text
服务启动 -> 注册到 Nacos
服务调用 -> 从 Nacos 获取服务实例
服务下线 -> 从注册中心移除
```

示例依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

示例配置：

```yaml
spring:
  application:
    name: mall-user
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848
```

## 4. 远程服务调用

推荐学习：OpenFeign。

需要掌握：

- RestTemplate、WebClient、OpenFeign 的区别。
- OpenFeign 基础使用。
- Feign 接口声明。
- 参数传递。
- 超时时间配置。
- 日志配置。
- Feign 拦截器。
- 服务间传递 Token。
- Feign 异常处理。

示例：

```java
@FeignClient(name = "mall-user")
public interface UserClient {

    @GetMapping("/users/{id}")
    UserDTO getById(@PathVariable Long id);
}
```

调用方：

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final UserClient userClient;

    public OrderDTO createOrder(Long userId) {
        UserDTO user = userClient.getById(userId);
        // 创建订单
        return new OrderDTO();
    }
}
```

重点理解：

```text
Feign 本质是声明式 HTTP 客户端。
服务名会交给注册中心和负载均衡组件解析。
```

## 5. 网关 Gateway

推荐学习：Spring Cloud Gateway。

网关是微服务系统的统一入口。

需要掌握：

- API Gateway 的作用。
- 路由配置。
- Predicate 断言。
- Filter 过滤器。
- GlobalFilter 全局过滤器。
- 鉴权拦截。
- Token 校验。
- 跨域配置。
- 请求日志。
- 网关限流。
- 灰度路由。

常见职责：

```text
统一入口
鉴权
路由转发
限流
日志
跨域
协议适配
```

示例配置：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://mall-user
          predicates:
            - Path=/user/**
          filters:
            - StripPrefix=1
```

这里的 `lb://mall-user` 表示通过服务发现和负载均衡转发到 `mall-user` 服务。

## 6. 配置中心

推荐学习：Nacos Config。

为什么需要配置中心：

```text
多服务、多环境配置分散。
修改配置后不希望重新打包发布。
公共配置需要统一维护。
```

需要掌握：

- 本地配置与远程配置。
- 配置分组。
- 命名空间。
- 配置热更新。
- 多环境配置。
- 公共配置与服务私有配置。
- 敏感配置管理。

配置组织示例：

```text
dev
├── common.yaml
├── mall-user.yaml
├── mall-order.yaml
└── mall-gateway.yaml
```

示例：

```yaml
spring:
  config:
    import:
      - optional:nacos:mall-user.yaml
      - optional:nacos:common.yaml
```

## 7. 负载均衡

推荐学习：Spring Cloud LoadBalancer。

需要掌握：

- 客户端负载均衡。
- 服务实例选择。
- 轮询策略。
- 权重策略。
- 灰度策略。
- 与 OpenFeign 结合使用。
- 服务实例元数据。

典型场景：

```text
mall-order 调用 mall-user
-> 从注册中心拿到多个 mall-user 实例
-> 负载均衡选择其中一个实例
-> 发起 HTTP 请求
```

## 8. 服务容错与熔断

推荐学习：Sentinel 或 Resilience4j。

需要掌握：

- 服务雪崩。
- 超时控制。
- 熔断。
- 降级。
- 限流。
- 热点参数限流。
- 系统自适应保护。
- Sentinel 控制台。
- 资源规则配置。
- Feign fallback。

重点理解：

```text
限流：防止流量过大。
熔断：防止故障扩散。
降级：保留核心功能。
隔离：避免资源耗尽。
```

示例场景：

```text
订单服务调用库存服务超时
-> 熔断库存服务调用
-> 返回降级结果
-> 避免订单服务线程被拖死
```

## 9. 分布式事务

推荐学习：Seata。

需要掌握：

- 本地事务与分布式事务区别。
- 分布式事务产生原因。
- 2PC、TCC、Saga、消息最终一致性。
- Seata AT 模式。
- `undo_log` 原理。
- 全局事务。
- 分支事务。
- 常见异常处理。
- 事务边界设计。
- 什么时候不要使用强事务。

实战场景：

```text
创建订单
-> 扣库存
-> 扣余额
-> 修改订单状态
```

注意：

```text
分布式事务不是默认方案。
能用本地事务解决就不要跨服务事务。
能用最终一致性解决就不要强一致性。
```

## 10. 消息队列集成

推荐学习：RabbitMQ、RocketMQ 或 Kafka。

需要掌握：

- 为什么微服务需要 MQ。
- 异步解耦。
- 削峰填谷。
- 最终一致性。
- 消息可靠投递。
- 消费重试。
- 死信队列。
- 幂等消费。
- 顺序消息。
- 事务消息。

典型场景：

```text
订单创建成功
-> 发送消息
-> 扣库存
-> 发短信
-> 增加积分
```

关键问题：

- 消息是否一定发出。
- 消费是否可能重复。
- 消费失败如何重试。
- 消费顺序是否重要。
- 如何保证最终一致性。

## 11. 认证与授权

需要掌握：

- 单体登录与微服务登录区别。
- JWT。
- OAuth2 基础。
- Spring Security。
- 网关统一鉴权。
- 服务间权限传递。
- 用户上下文传递。
- RBAC 权限模型。
- Token 刷新。
- 接口权限控制。

常见方案：

```text
用户登录 -> auth 服务签发 JWT
请求进入 Gateway -> Gateway 校验 JWT
Gateway 转发请求 -> 将用户信息放到 Header
业务服务 -> 从 Header 读取用户上下文
```

注意：

```text
业务服务不能完全信任前端传来的用户信息。
用户身份应由网关或认证体系统一确认后传递。
```

## 12. 链路追踪与日志

推荐学习：Micrometer Tracing、Zipkin、SkyWalking。

需要掌握：

- 为什么需要链路追踪。
- TraceId。
- Span。
- 请求链路。
- 日志聚合。
- 网关日志。
- Feign 调用日志。
- 慢接口排查。
- 异常定位。
- 监控告警。

一个请求可能经过：

```text
Gateway
-> Order Service
-> User Service
-> Product Service
-> Pay Service
```

没有 TraceId 时，排查问题会非常困难。

## 13. 监控体系

需要掌握：

- Spring Boot Actuator。
- 健康检查。
- Prometheus。
- Grafana。
- JVM 监控。
- 接口 QPS。
- 响应时间。
- 错误率。
- 服务实例状态。
- 告警规则。

常见指标：

```text
CPU
内存
GC
线程数
接口耗时
接口错误率
服务实例健康状态
数据库连接池
MQ 积压数量
```

## 14. 配置与部署

需要掌握：

- 多环境配置。
- Docker 镜像构建。
- Docker Compose 本地部署。
- Kubernetes 基础。
- 服务发现与 K8s。
- 滚动发布。
- 灰度发布。
- 配置热更新。
- 日志目录挂载。
- 生产环境参数调优。

Dockerfile 示例：

```dockerfile
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY target/app.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
```

Docker Compose 本地编排示例：

```yaml
services:
  nacos:
    image: nacos/nacos-server
    ports:
      - "8848:8848"

  mall-user:
    image: mall-user:latest
    ports:
      - "8081:8081"

  mall-order:
    image: mall-order:latest
    ports:
      - "8082:8082"
```

## 15. 实战项目路线

建议做一个电商系统或 IoT 管理平台。

服务划分：

```text
用户服务
商品服务
订单服务
库存服务
支付服务
文件服务
通知服务
网关服务
认证服务
```

实战功能：

- 用户注册登录。
- 网关统一鉴权。
- 商品查询。
- 创建订单。
- 扣减库存。
- 支付回调。
- MQ 异步通知。
- 分布式事务。
- Sentinel 限流熔断。
- Nacos 配置中心。
- 日志链路追踪。
- Docker 部署。

推荐实现顺序：

```text
1. 搭建多模块项目
2. 接入 Nacos 注册中心
3. 接入 OpenFeign
4. 接入 Gateway
5. 接入 Nacos Config
6. 加入 JWT 鉴权
7. 加入 Sentinel
8. 加入 MQ
9. 加入 Seata
10. 加入链路追踪和监控
11. Docker Compose 部署
```

## 推荐学习顺序

完整路线：

```text
Spring Boot
-> 微服务基础
-> Nacos 注册中心
-> OpenFeign 服务调用
-> Gateway 网关
-> Nacos 配置中心
-> Spring Cloud LoadBalancer
-> Sentinel 熔断限流
-> Seata 分布式事务
-> MQ 异步通信
-> Spring Security / JWT
-> 链路追踪与监控
-> Docker / Kubernetes 部署
```

如果时间有限，先学最小闭环：

```text
Nacos
-> OpenFeign
-> Gateway
-> Nacos Config
```

这个闭环掌握后，就能搭建一个基础微服务系统。

## 学习重点

学习 Spring Cloud 不要只背组件名称，要始终追问它解决什么问题：

- 服务怎么找到？
- 服务怎么调用？
- 流量从哪里进来？
- 配置怎么统一？
- 服务挂了怎么办？
- 接口慢了怎么排查？
- 多个服务的数据一致性怎么保证？
- 上线后如何监控？

真正的 Spring Cloud 学习路径，是从业务问题出发，逐步引入对应组件。组件只是工具，服务治理能力才是重点。

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
excerpt: 从微服务背景讲起，系统介绍 Spring Cloud 的服务注册、配置中心、网关、OpenFeign、负载均衡、熔断、链路追踪和生产治理。
---

# Spring Cloud 从入门到进阶：构建 Java 微服务体系

Spring Cloud 是 Spring 生态中用于构建分布式系统和微服务架构的一组工具集合。它不是一个单独框架，而是一套围绕 Spring Boot 的微服务能力组合。

典型能力包括：

- 服务注册与发现
- 配置中心
- API 网关
- 服务间调用
- 负载均衡
- 熔断和限流
- 链路追踪
- 消息驱动
- Kubernetes 集成

如果你已经熟悉 Spring Boot，Spring Cloud 是进入 Java 微服务体系的自然下一步。

## 为什么需要 Spring Cloud

单体应用阶段，一个系统通常这样部署：

```text
浏览器 -> Nginx -> Spring Boot 应用 -> MySQL
```

随着业务增长，系统可能拆成：

```text
用户服务
订单服务
支付服务
库存服务
营销服务
文件服务
```

拆分后会出现新问题：

- 服务地址如何发现？
- 配置如何统一管理？
- 服务之间如何调用？
- 某个服务故障如何隔离？
- 外部请求如何路由到内部服务？
- 如何统一鉴权、限流、日志？
- 一次请求跨多个服务如何排查？

Spring Cloud 就是为这些问题提供基础组件。

## Spring Boot 和 Spring Cloud 的关系

Spring Boot 解决单个应用如何快速开发、配置和运行。

Spring Cloud 解决多个 Spring Boot 应用组成分布式系统时的协作问题。

可以理解为：

```text
Spring Boot：单个服务的开发基础
Spring Cloud：多个服务之间的治理能力
```

版本上，Spring Cloud 与 Spring Boot 有兼容矩阵。不要随意组合版本。创建项目时应参考 Spring Cloud 官方发布说明或 Spring Initializr 推荐组合。

## 微服务基础结构

一个常见 Spring Cloud 架构：

```text
Client
  -> Spring Cloud Gateway
  -> user-service
  -> order-service
  -> payment-service
  -> inventory-service

Config Server / Nacos Config
Service Registry / Nacos / Eureka / Consul
Observability / Prometheus / Grafana / Zipkin / OpenTelemetry
```

Gateway 负责统一入口，服务注册中心负责发现服务，配置中心负责集中配置，业务服务通过 HTTP、RPC 或消息通信。

## 服务注册与发现

服务注册解决“服务在哪里”的问题。

在微服务里，服务实例可能动态扩缩容，IP 和端口不固定。服务启动后把自己注册到注册中心，调用方通过服务名发现实例。

常见注册中心：

- Eureka
- Consul
- Nacos
- Kubernetes Service

调用方不再写死：

```text
http://192.168.1.10:8081
```

而是使用服务名：

```text
http://user-service
```

注册中心会返回可用实例列表，再由客户端或网关做负载均衡。

## 配置中心

配置中心解决“配置如何统一管理”的问题。

常见配置：

- 数据库连接
- Redis 地址
- MQ 地址
- 第三方 API 地址
- 功能开关
- 限流参数
- 日志级别

配置中心的价值：

- 配置集中管理。
- 区分 dev、test、prod 环境。
- 敏感配置统一治理。
- 动态刷新部分配置。
- 减少重新打包。

常见方案：

- Spring Cloud Config
- Nacos Config
- Apollo
- Consul KV
- Kubernetes ConfigMap / Secret

生产中要注意配置权限和密钥加密，不要把数据库密码明文散落在代码仓库。

## Spring Cloud Gateway

Gateway 是微服务统一入口。

它负责：

- 路由
- 鉴权
- 限流
- 跨域
- 灰度发布
- 请求改写
- 统一日志
- TLS 终止或转发

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

`lb://user-service` 表示通过负载均衡按服务名转发。

Gateway 不应该写太多业务逻辑。它适合做横切能力，不适合承载复杂业务规则。

## OpenFeign

OpenFeign 用声明式接口调用 HTTP 服务。

例如订单服务调用用户服务：

```java
@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/users/{id}")
    UserDTO getUser(@PathVariable("id") Long id);
}
```

业务代码：

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

Feign 的好处是接口清晰，调用方像调用本地方法一样调用远程 HTTP 服务。

但要注意：

- 远程调用可能失败。
- 延迟不可控。
- 需要设置超时。
- 需要降级策略。
- 不能在循环里大量调用。
- 不要让服务间调用形成复杂网状依赖。

## 负载均衡

服务通常有多个实例：

```text
user-service-1
user-service-2
user-service-3
```

调用方需要在多个实例之间选择一个。Spring Cloud LoadBalancer 可以提供客户端负载均衡能力。

常见策略：

- 轮询
- 随机
- 权重
- 按区域
- 健康状态过滤

生产中要结合注册中心健康检查，避免把请求发给不可用实例。

## 熔断、限流和重试

微服务系统里，故障会传播。

例如支付服务变慢，订单服务等待支付服务，网关线程被占满，最终整个系统都慢。

常见治理手段：

- 超时：不要无限等待。
- 重试：短暂故障可以重试，但要限制次数。
- 熔断：下游持续失败时快速失败。
- 限流：保护服务不被流量打穿。
- 隔离：避免一个依赖拖垮整个服务。

Resilience4j 是 Spring 生态中常见的熔断限流库。

原则：

```text
所有远程调用都必须有超时。
重试只用于幂等操作。
熔断要有清晰降级结果。
限流要区分用户、接口和服务级别。
```

## 服务拆分原则

不要为了微服务而微服务。

拆分服务要考虑：

- 业务边界是否清晰。
- 数据所有权是否清晰。
- 团队是否能独立维护。
- 部署是否需要独立。
- 调用频率是否可接受。
- 一致性要求是否强。

常见拆分：

- 用户服务
- 订单服务
- 支付服务
- 库存服务
- 商品服务

不要把每张表都拆成一个服务。过细拆分会导致远程调用爆炸和事务复杂化。

## 分布式事务

微服务拆分后，本地事务不再覆盖多个服务。

例如下单：

1. 创建订单。
2. 扣减库存。
3. 创建支付单。
4. 发优惠券。

如果分布在多个服务中，就会遇到分布式事务问题。

常见方案：

- 最终一致性
- 可靠消息
- Saga
- TCC
- 本地消息表
- 事务补偿

优先通过业务设计减少强一致需求。不是所有流程都需要分布式事务框架。

## 可观测性

微服务没有可观测性就很难排错。

至少要有：

- 结构化日志
- traceId
- 指标监控
- 链路追踪
- 告警
- 慢请求分析

一次请求跨多个服务时，要能串起来：

```text
gateway -> order-service -> user-service -> payment-service
```

OpenTelemetry 是当前常见的可观测性标准之一，可以与 Prometheus、Grafana、Jaeger、Zipkin 等工具组合。

## 推荐学习项目

可以做一个简单电商微服务：

```text
gateway-service
user-service
product-service
order-service
payment-service
```

功能：

1. 用户注册登录。
2. 商品查询。
3. 创建订单。
4. 调用库存服务。
5. 调用支付服务。
6. 网关统一鉴权。
7. 配置中心管理环境配置。
8. 注册中心管理服务发现。
9. Feign 调用内部服务。
10. 增加熔断、日志和 traceId。

这个项目能覆盖 Spring Cloud 的核心知识。

## 生产 Checklist

1. 服务间调用设置超时。
2. 网关统一鉴权和限流。
3. 配置中心区分环境和权限。
4. 服务注册健康检查可靠。
5. Feign 调用有降级策略。
6. 日志包含 traceId。
7. 敏感配置不进代码仓库。
8. 接口版本管理。
9. 数据库归属清晰。
10. 发布和回滚流程明确。

## 参考资料

- [Spring Cloud 官方文档](https://spring.io/projects/spring-cloud)
- [Spring Cloud Reference Documentation](https://docs.spring.io/spring-cloud/docs/current/reference/html/)
- [Spring Cloud Gateway 文档](https://docs.spring.io/spring-cloud-gateway/reference/)
- [Spring Cloud OpenFeign 文档](https://docs.spring.io/spring-cloud-openfeign/reference/)
- [Resilience4j 官方文档](https://resilience4j.readme.io/)

## 总结

Spring Cloud 是 Java 微服务体系的基础工具箱。它帮助你解决服务发现、配置管理、网关路由、服务调用、负载均衡和故障隔离问题。

学习 Spring Cloud 时，不要只学组件配置。更重要的是理解微服务拆分边界、远程调用风险、分布式事务、可观测性和生产治理。组件只是手段，系统稳定性才是目标。

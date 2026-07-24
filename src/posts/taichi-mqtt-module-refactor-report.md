---
title: Taichi MQTT 模块重构报告
date: 2026-07-23
category:
  - Java
tag:
  - MQTT
  - Spring Boot
  - Maven
  - 模块重构
---

# Taichi MQTT 模块重构报告

这篇记录 `D:\WorkSpace\Electric\cloud-web\03.Code\Taichi` 里 MQTT 模块的拆分过程。目标不是改业务，而是把 MQTT 的基础设施能力单独抽出来，保留现有设备、通信、固件和系统权限逻辑。

## 一、旧模块的问题

旧实现把 MQTT 基础能力和业务处理放在同一个 `com.yinyang.yin.mqtt` 包下，结果是：

1. 连接管理、订阅、发布、分发、DTO 和业务 Handler 混杂。
2. MQTT 基础层直接感知设备、固件、告警、Influx 等业务服务。
3. 业务改动会反向污染 MQTT 基础代码，单独复用也困难。
4. 后续如果想把 MQTT 给别的项目用，几乎只能整包复制。

## 二、新模块划分

现在拆成两个 Maven 模块：

1. `yin-mqtt`：放可复用的 MQTT 基础能力。
2. `yin-admin`：放原有业务代码和 MQTT 业务 Handler。

### `yin-mqtt` 保留的内容

- `config`：`MqttConfig`、`MqttProperties`、`MqttConstants`
- `core`：`MqttManager`、`PendingRequest`、`RequestTimeoutException`
- `dispatcher`：`TopicDispatcher`、`TopicHandler`
- `inbound`：`MqttInboundListener`、`DynamicTopicManager`
- `outbound`：`MqttPublishService`
- `dto`：报文对象、在线离线、升级进度等通用 DTO
- `utils`：`TopicUtil`、`SslUtil`

### `yin-admin` 保留的内容

- `mqtt/handler` 下所有业务处理器
- 设备、通信、固件、系统、权限、文件、报表等现有业务

这样做的关键点是：基础设施和业务 Handler 分离，但包名不变，迁移成本最低。

## 三、为什么要这样拆

### 1. 降低耦合

以前 MQTT 包直接依赖 `DeviceInfoService`、`FirmwareUpdatePlanDetailService`、`InfluxService` 等业务对象。现在这些依赖只留在 Handler 层，基础模块不再被业务污染。

### 2. 让基础能力可复用

`yin-mqtt` 只关心消息怎么收、怎么发、怎么分发、怎么维护动态订阅，不关心消息背后的业务语义。

### 3. 方便后续演进

以后如果要：

- 替换 MQTT 客户端实现
- 增加消息重试、超时、健康检查
- 把 MQTT 能力给别的系统复用

都能直接改 `yin-mqtt`，不会牵动整个业务工程。

## 四、代码层面的实现思路

### 1. 父 POM 改成多模块

`backend/pom.xml` 作为父工程，统一管理版本和依赖，子模块分别继承。

```xml
<modules>
  <module>yin-mqtt</module>
  <module>yin-admin</module>
</modules>
```

### 2. `yin-admin` 依赖 `yin-mqtt`

业务模块直接引用 MQTT 基础模块，Handler 仍然放在业务模块里，避免循环依赖。

### 3. `MqttManager`

负责连接建立、发布、订阅、请求超时管理，是 MQTT 的核心运行时对象。

### 4. `TopicDispatcher`

把 topic 分发给具体 Handler。这里不写业务逻辑，只做路由和调用。

### 5. `TopicHandler`

业务处理器实现点。比如设备在线、离线、配置响应、升级进度，这些都属于业务层。

## 五、对比结论

### 旧模块

- 一个包里既有连接层又有业务层
- 改动范围大
- 复用性差
- 后续维护成本高

### 新模块

- 基础 MQTT 能力独立成模块
- 业务 Handler 留在应用模块
- 边界清晰
- 更容易测试、替换和复用

## 六、还能继续改进什么

1. topic 常量外置到配置文件或数据库。
2. 增加 `HealthIndicator` 和连接状态页。
3. 给发布请求补重试、超时、幂等标识。
4. 增加 payload 校验和统一错误码。
5. 给动态订阅加缓存和恢复机制。
6. 把 Handler 单测补齐，至少覆盖 topic 分发和异常路径。

## 七、这次改造的边界

这次没有改业务逻辑，也没有重排现有页面和接口，只做了模块边界整理。业务代码继续跑在 `yin-admin`，以后如果要继续收敛，再考虑把可复用的业务通用层继续下沉。

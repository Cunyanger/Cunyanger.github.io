---
title: 代码整洁之道笔记
date: 2026-07-28
category: 编程
cover: https://ts4.tc.mm.bing.net/th/id/OIP-C.p4vtKQ5m0iQrpKZmr1BVTAHaJT?r=0&rs=1&pid=ImgDetMain&o=7&rm=3
tag:
  - Clean Code
  - 代码质量
  - 重构
  - 软件工程
  - Java
isOriginal: true
excerpt: 用半小时快速读完《代码整洁之道》的核心思想：命名、函数、注释、格式、对象、错误处理、测试、类设计、系统边界和持续重构。
---

# 代码整洁之道笔记

《代码整洁之道》讨论的不是“怎么写出能跑的代码”，而是“怎么写出别人愿意维护、未来的自己也能快速理解的代码”。

这本书的核心观点可以压缩成一句话：

```text
代码首先是写给人看的，其次才是给机器执行的。
```

机器只关心语法正确和逻辑可执行，但团队开发关心的是：能不能看懂、能不能改动、能不能测试、能不能定位问题、能不能长期演进。

## 1. 什么是整洁代码

整洁代码不等于短代码，也不等于炫技代码。

整洁代码通常具备这些特征：

- 意图明确。
- 命名准确。
- 函数短小。
- 只做一件事。
- 依赖关系清晰。
- 没有隐藏副作用。
- 测试容易写。
- 修改时影响范围可控。

坏代码的常见表现：

- 变量名看不出含义。
- 一个方法几百行。
- 一个类什么都管。
- 注释解释一堆复杂逻辑。
- 业务规则散落在各处。
- 修改一个功能会牵连很多文件。
- Bug 修完后不确定有没有引入新 Bug。

代码变脏通常不是一次性发生的，而是每天“临时改一点”“先这样写”“后面再优化”慢慢积累出来的。

## 2. 命名：好名字就是最好的文档

命名是代码可读性的第一入口。

好的命名应该回答三个问题：

- 这个东西是什么？
- 它为什么存在？
- 它如何被使用？

不好的命名：

```java
int d;
List<String> list;
String str;
User u;
boolean flag;
```

更好的命名：

```java
int elapsedDays;
List<String> deviceIds;
String gatewayId;
User currentUser;
boolean enabled;
```

命名原则：

- 不用无意义缩写。
- 不用 `data`、`info`、`temp` 这类泛词作为核心名。
- 布尔变量使用 `is`、`has`、`can`、`should`。
- 集合变量使用复数或明确含义。
- 方法名使用动词或动宾结构。

示例：

```java
public List<DeviceDTO> findOnlineDevices(String gatewayId) {
    // ...
}

public boolean hasExpired(Instant deadline) {
    // ...
}
```

不要用误导性命名：

```java
List<Device> deviceMap; // 错，名字叫 map，但类型是 List
```

更好：

```java
List<Device> devices;
Map<String, Device> deviceMap;
```

命名不是小事。一个好名字可以减少注释，一个坏名字会让每个读代码的人都付出理解成本。

## 3. 函数：只做一件事

函数应该短小、专注、层次清晰。

一个函数如果同时做这些事，就已经太复杂：

- 校验参数。
- 查询数据库。
- 拼接外部接口请求。
- 调用远程服务。
- 转换 DTO。
- 写日志。
- 处理异常。
- 更新状态。

坏例子：

```java
public void createOrder(OrderRequest request) {
    // 参数校验
    // 查询用户
    // 查询商品
    // 计算价格
    // 扣库存
    // 创建订单
    // 发送消息
    // 处理异常
}
```

更好的拆法：

```java
public OrderDTO createOrder(OrderRequest request) {
    validateCreateOrderRequest(request);
    User user = getUser(request.getUserId());
    Product product = getProduct(request.getProductId());
    BigDecimal amount = calculateAmount(product, request.getQuantity());
    reduceStock(product, request.getQuantity());
    Order order = saveOrder(user, product, amount);
    publishOrderCreatedEvent(order);
    return toDTO(order);
}
```

这样做的好处是：

- 主流程清晰。
- 每个步骤可以单独测试。
- 异常位置更容易定位。
- 后续修改影响更小。

函数设计原则：

- 一个函数只表达一个抽象层级。
- 参数越少越好。
- 避免布尔参数控制两套逻辑。
- 避免隐藏副作用。
- 返回值比修改入参更清晰。

不推荐：

```java
public void updateUser(User user, boolean sendEmail) {
    // update user
    // maybe send email
}
```

更好：

```java
public void updateUser(User user) {
    // ...
}

public void updateUserAndSendEmail(User user) {
    updateUser(user);
    sendEmail(user);
}
```

布尔参数经常意味着一个函数在做两件事。

## 4. 注释：不要用注释掩盖坏代码

注释不是越多越好。

好代码应该尽量自解释。注释适合解释：

- 为什么这样做。
- 业务背景。
- 不明显的约束。
- 临时兼容逻辑。
- 算法或协议细节。

不好的注释：

```java
// 获取用户
User user = userMapper.selectById(userId);
```

这类注释只是重复代码，没有价值。

更有价值的注释：

```java
// 老设备固件不会上报 deviceType，只能通过 deviceId 前缀兼容识别。
String deviceType = resolveLegacyDeviceType(deviceId);
```

注释的风险是会过期。代码改了，注释没改，就会产生误导。

优先顺序应该是：

```text
先改命名
再拆函数
再调整结构
最后才补注释
```

## 5. 格式：统一风格降低阅读成本

格式不是表面功夫。统一格式能让团队成员把注意力放在业务逻辑上，而不是每个人不同的写法上。

建议：

- 使用统一 formatter。
- 类中字段、构造器、公开方法、私有方法按固定顺序放置。
- 相关代码靠近。
- 空行用于分隔不同逻辑块。
- 避免一行过长。
- 不要在一个文件里混合多种风格。

示例结构：

```java
@Service
@RequiredArgsConstructor
public class DeviceTrendService {

    private final InfluxDBClient influxDBClient;

    public List<TrendSeries> queryTrend(TrendQuery query) {
        validateQuery(query);
        return doQuery(query);
    }

    private void validateQuery(TrendQuery query) {
        // ...
    }

    private List<TrendSeries> doQuery(TrendQuery query) {
        // ...
    }
}
```

代码格式要做到“无惊喜”。读者知道在哪里找公开方法，在哪里找私有实现。

## 6. 对象和数据结构：区分行为和数据

对象不只是字段集合。对象应该封装行为和规则。

贫血模型常见写法：

```java
public class Order {
    private String status;
    private BigDecimal amount;
}

public class OrderService {
    public void cancel(Order order) {
        if ("PAID".equals(order.getStatus())) {
            throw new IllegalStateException("已支付订单不能取消");
        }
        order.setStatus("CANCELED");
    }
}
```

更面向对象的写法：

```java
public class Order {
    private OrderStatus status;
    private BigDecimal amount;

    public void cancel() {
        if (status == OrderStatus.PAID) {
            throw new IllegalStateException("已支付订单不能取消");
        }
        this.status = OrderStatus.CANCELED;
    }
}
```

这样业务规则跟数据靠得更近，不容易散落在多个 Service 中。

但不是所有 DTO 都要变成领域对象。实践中可以这样区分：

- DTO：用于接口传输，主要承载数据。
- Entity：用于数据库映射，承载持久化结构。
- Domain Object：承载核心业务规则。
- VO：用于页面展示或查询结果。

## 7. 错误处理：异常也是代码结构的一部分

错误处理不能破坏主流程。

不好的写法：

```java
public Device getDevice(String id) {
    Device device = null;
    try {
        device = deviceMapper.selectById(id);
        if (device == null) {
            return null;
        }
        return device;
    } catch (Exception e) {
        log.error("query error", e);
        return null;
    }
}
```

问题：

- 返回 `null` 让调用方继续猜。
- 异常被吞掉。
- 主流程被 try-catch 包住。

更好：

```java
public Device getDevice(String id) {
    Device device = deviceMapper.selectById(id);
    if (device == null) {
        throw new NotFoundException("设备不存在: " + id);
    }
    return device;
}
```

错误处理原则：

- 不要吞异常。
- 不要返回 `null` 表示失败。
- 使用明确的业务异常。
- 在边界层统一转换异常响应。
- 日志记录要包含上下文。

Spring Boot 项目中可以统一异常处理：

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public Result<Void> handleNotFound(NotFoundException e) {
        return Result.fail(e.getMessage());
    }
}
```

## 8. 边界：隔离第三方依赖

系统经常依赖外部组件：

- 数据库。
- Redis。
- InfluxDB。
- MQ。
- HTTP API。
- 云存储。

不要让第三方 API 到处散落在业务代码中。

不推荐：

```java
public class DeviceService {

    private final InfluxDBClient influxDBClient;

    public void query() {
        influxDBClient.getQueryApi().query("...");
    }
}
```

更好：

```java
public interface DeviceMetricRepository {
    List<TrendSeries> queryTrend(TrendQuery query);
}
```

实现类：

```java
@Repository
public class InfluxDeviceMetricRepository implements DeviceMetricRepository {

    private final InfluxDBClient influxDBClient;

    @Override
    public List<TrendSeries> queryTrend(TrendQuery query) {
        // Flux 查询
    }
}
```

这样业务层只依赖自己的接口，不直接依赖 InfluxDB。以后换数据库、改查询语法、加缓存，都不会大面积影响业务代码。

## 9. 类：高内聚，低耦合

一个类应该有清晰职责。

如果一个类出现这些情况，通常说明它太大了：

- 字段很多。
- 方法很多。
- 方法之间互相没关系。
- 修改原因很多。
- 类名很泛，比如 `Manager`、`Helper`、`Util`。

坏例子：

```java
public class DeviceManager {
    public void createDevice() {}
    public void updateDevice() {}
    public void queryTrend() {}
    public void exportExcel() {}
    public void sendMqttCommand() {}
    public void uploadFile() {}
}
```

拆分后：

```text
DeviceService
DeviceTrendService
DeviceExportService
DeviceCommandService
DeviceFileService
```

类设计原则：

- 一个类只有一个主要职责。
- 类名能说明职责。
- 公共方法不要太多。
- 私有方法服务于公共方法。
- 不同变化原因应该拆到不同类。

## 10. 测试：整洁代码需要测试保护

没有测试的代码很难持续保持整洁。

测试的价值：

- 保护重构。
- 固化业务规则。
- 暴露设计问题。
- 降低修改风险。

难测试的代码通常也难维护：

- 方法太长。
- 静态方法太多。
- 强依赖外部环境。
- new 了太多具体实现。
- 全局状态太多。

好测试应该：

- 快速。
- 独立。
- 可重复。
- 意图明确。
- 只验证一个行为。

示例：

```java
@Test
void shouldRejectExpiredTelemetry() {
    PropertiesReport payload = expiredPayload();

    assertThatThrownBy(() -> telemetryService.save(payload))
            .isInstanceOf(ExpiredTelemetryException.class);
}
```

测试方法名可以直接说明业务行为。

## 11. 重构：每天小步清理

整洁代码不是一次性写出来的，更多是持续改出来的。

重构不是大规模推倒重来，而是：

- 改一个坏名字。
- 抽一个小函数。
- 删除一个重复分支。
- 补一个边界校验。
- 合并一段重复逻辑。
- 把第三方依赖隔离出去。

推荐节奏：

```text
先让代码工作
再让代码正确
最后让代码整洁
```

但是不要把“以后再整理”当借口。每次提交都应该让代码比修改前更容易理解一点。

## 12. 在 Spring Boot 项目中的落地清单

Service 层：

- 不写超长方法。
- 不直接拼复杂 SQL 或 Flux。
- 不直接暴露第三方 SDK。
- 主流程保持清晰。
- 业务异常明确。

Controller 层：

- 只处理 HTTP 入参和返回。
- 不写业务逻辑。
- 不直接操作数据库。
- 参数校验前置。

Repository / Mapper 层：

- 只负责数据访问。
- 查询方法命名明确。
- 复杂查询单独封装。

DTO / Query：

- 请求参数用 Query。
- 返回结果用 DTO 或 VO。
- 不让 Entity 直接暴露给前端。

异常处理：

- 使用统一异常响应。
- 不吞异常。
- 日志带上下文。

测试：

- 核心业务规则必须有单测。
- 边界条件必须覆盖。
- 重构前先补测试。

## 13. 一张速记表

| 主题 | 核心原则     | 反例                  |
| ---- | ------------ | --------------------- |
| 命名 | 表达意图     | `data`、`flag`、`tmp` |
| 函数 | 只做一件事   | 一个方法几百行        |
| 注释 | 解释原因     | 重复代码含义          |
| 格式 | 风格统一     | 每个人一种写法        |
| 对象 | 封装规则     | 只有 getter/setter    |
| 异常 | 明确失败     | 吞异常、返回 null     |
| 边界 | 隔离外部依赖 | SDK 到处散落          |
| 类   | 单一职责     | 万能 Manager          |
| 测试 | 保护重构     | 没测试不敢改          |
| 重构 | 小步持续     | 越堆越乱              |

## 总结

《代码整洁之道》的重点不是规则本身，而是一种职业习惯：写代码时始终考虑后续维护者。

整洁代码的目标不是追求完美，而是降低理解成本、修改成本和出错概率。

真正可持续的工程能力，就是每天让代码比昨天更清楚一点。

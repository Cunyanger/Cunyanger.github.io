---
title: Taichi2.0 项目架构实战：通信指令计划与属性单位规则设计
date: 2026-08-23
category: Java
tag:
  - Spring Boot
  - Vue
  - Spring Security
  - MQTT
  - MyBatis Plus
  - 设备管理
  - 系统架构
isOriginal: true
excerpt: 结合 Taichi2.0 的真实代码和设计文档，完整拆解通信指令计划、MQTT 响应关联、Command 工厂、属性单位规则匹配、Caffeine 缓存与 InfluxDB 数据组装，并给出可实施的可靠性重构、代码架构、测试和上线路线。
---

# Taichi2.0 项目架构实战：通信指令计划与属性单位规则设计

## 一、本文解决什么问题

Taichi2.0 是一个典型的设备云管理后台：后端负责设备、协议、指令计划、遥测数据和文件存储，前端负责管理页面、权限菜单、趋势图和设备操作。项目中有两个很值得抽出来学习的模块：

1. **通信指令计划**：把一次面向设备群组的操作拆成计划和明细，通过 MQTT 下发，等待设备响应，再更新计划状态。
2. **属性单位规则**：把 InfluxDB field 名称与展示单位的关系从代码中抽离出来，使用可配置规则、优先级和缓存统一解析。

这两个模块分别代表了两类常见问题：

- 指令计划是“异步消息 + 数据库状态 + 设备回调”的最终一致性问题；
- 单位规则是“配置驱动 + 规则冲突 + 高并发读缓存”的查询优化问题。

本文不会只罗列设计模式，而是按“现有代码如何运行—为什么这样设计—哪里存在边界—如何逐步改造”的顺序展开。文中的路径均以项目目录为准：

```text
D:\WorkSpace\Ecoaxon\cloud-web\03.Code\Taichi2.0
├── yin/   # Spring Boot 多模块后端
└── yang/  # Vue 3 + Element Plus 前端
```

Token 续期是另一个独立的安全主题，已经单独整理在《Spring Boot + Vue Token 自动续期方案：从 JWT 现状分析到 Refresh Token 轮换实践》中；本文重点放在设备业务架构。

## 二、项目代码架构总览

### 2.1 后端模块

```text
yin/
├── yin-common/           # Result、MQTT、通用工具、基础配置
├── yin-system/           # 用户、角色、菜单、权限、系统配置
├── yin-business/         # 设备、通信、遥测、InfluxDB、MinIO 等业务
├── yin-infrastructure/   # 爬虫、基础设施和外部资源实现
├── yin-generator/        # 代码生成
└── yin-admin/            # Spring Boot 启动模块、Controller、资源和 SQL
```

通信指令和单位规则主要落在 `yin-business`，Controller 和初始化 SQL 位于 `yin-admin`：

```text
yin-business/src/main/java/com/yinyang/yin/
├── entity/communication/        # CommCommandPlan、Detail、CommProtocol
├── mapper/communication/         # MyBatis Plus Mapper
├── service/communication/        # 计划、明细、协议应用服务
├── service/communication/command # Command、Factory、Executor、协议实现
├── entity/device/                # PropertyUnitRule、PropertyUnitMatchType
├── service/device/               # PropertyUnitRuleService、Resolver
└── influx/                       # InfluxService，查询并组装展示数据
```

### 2.2 前端模块

```text
yang/src/
├── api/communication/              # 指令计划和明细接口
├── views/communication/            # 计划、明细管理页面
├── api/device/                     # 单位规则接口
├── views/device/property-unit-rule # 单位规则页面和表单
├── store/                          # 用户、字典等全局状态
└── utils/request.ts                # Axios 认证、错误和响应包装
```

后端采用“Controller → Service → Mapper → Entity”的常规分层；通信模块在 Service 下又增加了一层 Command 对象，把不同协议的发送和后置动作封装起来。单位规则模块则在 Service 旁边增加了一个面向高频读取的 Resolver，它不是简单 CRUD，而是一个带规则快照和缓存的查询组件。

## 三、通信指令计划：从业务对象到 MQTT 回调

### 3.1 领域对象

通信模块至少包含三个核心对象：

| 对象 | 作用 |
| --- | --- |
| `CommProtocol` | 保存协议类型、MQTT topic、payload 模板和协议名称 |
| `CommCommandPlan` | 一次面向设备集合的业务计划，保存目标条件、状态和统计 |
| `CommCommandPlanDetail` | 计划拆分到单台设备后的执行明细 |

可以把关系理解为：

```text
CommProtocol 1 ────── N CommCommandPlan 1 ────── N CommCommandPlanDetail N ────── 1 DeviceInfo
```

计划保存的是“要对哪些设备做什么”，明细保存的是“某一台设备实际发送和响应的结果”。这一区分很重要：计划适合展示总体进度，明细适合重试、超时和故障定位。

### 3.2 创建计划的代码路径

入口是 `CommCommandPlanService.create()`。它首先验证协议，再根据 `groupType` 选择设备：

```java
GlobalConstants.GroupType groupTypeEnum =
        GlobalConstants.GroupType.fromCode(entity.getGroupType());

switch (groupTypeEnum) {
    case CUSTOMIZE:
        // 通过 DeviceInfoGroup -> DeviceGroup 查询自定义设备组
        deviceInfoList = deviceInfoMapper.selectList(mpjLambdaWrapper);
        break;
    case DNSP:
        wrapper.eq(DeviceInfo::getDnsp, dto.getFilterConditions());
        deviceInfoList = deviceInfoMapper.selectList(wrapper);
        break;
    case POSTCODE:
        wrapper.eq(DeviceInfo::getPostcode, dto.getFilterConditions());
        deviceInfoList = deviceInfoMapper.selectList(wrapper);
        break;
    case STATE:
        wrapper.eq(DeviceInfo::getState, dto.getFilterConditions());
        deviceInfoList = deviceInfoMapper.selectList(wrapper);
        break;
}
```

之后插入计划，再逐台插入明细：

```java
entity.setTargetCount(deviceInfoList.size());
entity.setStatus(GlobalConstants.CommandPlanStatus.WAITING.getCode());
commCommandPlanMapper.insert(entity);

for (DeviceInfo deviceInfo : deviceInfoList) {
    CommCommandPlanDetail detail = new CommCommandPlanDetail();
    detail.setCommCommandPlanId(entity.getId());
    detail.setDeviceInfoId(deviceInfo.getId());
    detail.setStatus(GlobalConstants.CommandPlanStatus.WAITING.getCode());
    commCommandPlanDetailMapper.insert(detail);
}
```

当前实现的优点是业务直观，创建计划和明细处于同一个数据库事务中；缺点是大批量设备会产生大量逐条 insert，后续可以改为批量插入和分页创建。

创建阶段建议完成以下校验：

1. 协议存在且处于启用状态；
2. `groupType` 和筛选条件匹配；
3. 设备 ID 去重，并过滤没有 gatewayId 的设备；
4. 空目标设备是否允许创建计划要有明确产品语义；
5. payload 模板在保存时就进行 JSON 和占位符校验，而不是发送时才发现错误。

### 3.3 执行计划的代码路径

`CommCommandPlanService.execute()` 当前做了四件事：读取计划和协议、把计划改成 `RUNNING`、查询明细、为每个明细创建 Command 并发送：

```java
CommProtocol protocol = commProtocolMapper.selectById(entity.getCommProtocolId());
String topic = protocol.getTopic();
String payload = entity.getPayload();

entity.setSentTime(Instant.now());
entity.setStatus(GlobalConstants.CommandPlanStatus.RUNNING.getCode());
commCommandPlanMapper.updateById(entity);

List<CommCommandPlanDetailDTO> details =
        commCommandPlanDetailMapper.queryGatewayIdByPlanId(entity.getId());

for (CommCommandPlanDetailDTO detail : details) {
    GlobalConstants.ProtocolType type =
            GlobalConstants.ProtocolType.fromCode(protocol.getType());
    Command command = commandFactory.create(type, detail);
    commandCache.put(String.valueOf(detail.getId()), command);
    command.execute(topic, payload);
}
```

这里体现了一个典型的应用服务（Application Service）：它不实现每一种协议细节，而是负责事务、查询和流程编排。

但是，当前方法带有数据库事务，并在事务中调用 MQTT 网络发送。如果设备 A 已发布成功，设备 B 发布失败，事务回滚只能回滚数据库，无法撤回已经发出的 MQTT 消息。因此目标架构应将“数据库事务”和“MQTT 发布”拆开，后文会用 Outbox 解决。

## 四、Command 设计：命令、策略和工厂如何协作

### 4.1 Command 统一接口

当前 `Command` 接口把一次设备操作抽象为三个阶段：

```java
public interface Command {

    void execute(String topic, String payload);

    void onResponse(CommandResponseDTO responseDTO);

    void afterResponse();

    CommCommandPlanDetailDTO getCommCommandPlanDetail();
}
```

设计意图是让批量计划只依赖接口，而不关心当前是 COMMON、EDIT 还是 CONTROL。调用方只需要执行命令，响应到达后由 `CommandExecutor` 调用回调。

### 4.2 Template Method：AbstractCommand

`AbstractCommand` 提供所有协议共有的发送步骤：替换 gatewayId、替换 requestId、生成密文并发布 MQTT：

```java
@Override
public void execute(String topic, String payload) {
    String gatewayId = detail.getGatewayId();
    String itemTopic = topic.replace("$gatewayId", gatewayId);
    String itemPayload = payload.replace(
            "\"$requestId\"", String.valueOf(detail.getId()));

    try {
        String ciphertext = dependencies.getCommProtocolService()
                .generateCiphertext(gatewayId);
        itemPayload = itemPayload.replace("$ciphertext", ciphertext);
    } catch (Exception e) {
        log.error("加密失败", e);
    }

    mqttPublisher().publish(itemTopic, itemPayload);
}
```

这是 Template Method 的雏形：父类固定公共流程，子类通过 `onResponse()` 和 `afterResponse()` 增加差异行为。建议将公共 `execute()` 声明为 `final`，并把模板渲染抽到独立的 `CommandTemplateRenderer`，避免子类覆盖关键安全流程。

### 4.3 注册表驱动的 Factory

`CommandProvider` 为每个协议类型提供创建能力，`CommandFactory` 在启动时把所有 Provider 放入 `EnumMap`：

```java
public CommandFactory(List<CommandProvider> providers) {
    EnumMap<GlobalConstants.ProtocolType, CommandProvider> map =
            new EnumMap<>(GlobalConstants.ProtocolType.class);
    for (CommandProvider provider : providers) {
        CommandProvider previous = map.put(provider.protocolType(), provider);
        if (previous != null) {
            throw new IllegalStateException("重复的命令提供者: "
                    + provider.protocolType());
        }
    }
    this.providers = Map.copyOf(map);
}
```

它同时体现了 Factory、Strategy 和 Registry 三种思想：

- `ProtocolType` 是策略选择键；
- Provider 是创建策略；
- Map 是运行时注册表；
- 新增协议时增加 Provider，不修改批量执行循环。

### 4.4 三种当前命令

```text
COMMON  -> CommonCommand
EDIT    -> EditCommand
CONTROL -> ControlCommand
```

`EditCommand.afterResponse()` 会重新拉取设备在线信息；`ControlCommand.afterResponse()` 会订阅监管 ZIP 和 JSON topic，并将文件上传 MinIO、写入 `TelemetrySupervisionFile`。这说明命令不仅有“发送”动作，还有响应后的业务副作用。

## 五、MQTT 响应关联和计划状态

### 5.1 当前响应流程

```text
MQTT /EMS/{gatewayId}/response
  ↓
ResponseHandler
  ↓
CommandExecutor.onResponse()
  ↓
解析 CommandResponseDTO
  ↓
按 requestId 从 Caffeine 找 Command
  ↓
更新 CommCommandPlanDetail
  ↓
更新计划 successCount/failCount/status
  ↓
执行 command.onResponse()/afterResponse()
```

`CommandExecutor` 已经加入了终态判断和计划进度聚合：

```java
if (isTerminal(existing.getStatus())) {
    log.info("忽略重复的命令响应, detailId={}, status={}",
            existing.getId(), existing.getStatus());
    return;
}

if (!isSuccess(responseDTO)) {
    detail.setStatus(GlobalConstants.CommandPlanStatus.FAILED.getCode());
    detail.setErrorMessage(responseDTO.getMessage());
} else {
    detail.setStatus(GlobalConstants.CommandPlanStatus.COMPLETED.getCode());
}
```

计划聚合的基本规则是：全部明细终态且存在失败，计划为 `FAILED`；全部成功则为 `COMPLETED`；还有未完成明细则保持 `RUNNING`。

### 5.2 当前 Caffeine 关联方式的问题

当前关联关系的 key 是明细 ID，value 是内存中的 Command 对象。它只能在单机、短响应窗口内可靠工作：

- 应用重启后，响应找不到 Command；
- 多实例部署时，响应可能到达没有缓存的实例；
- 缓存 30 秒过期，而设备可能晚于 30 秒响应；
- 回调上下文没有持久化，无法可靠补偿；
- 同一个 Gateway 的无 requestId 响应只能通过“最近命令”兜底，存在串单风险。

正确的原则是：**数据库中的明细状态和 requestId 是事实来源，Caffeine 只能作为加速层**。发送前应该把 requestId、gatewayId 快照、协议类型和发送时间写入明细，响应时优先按 requestId 查询数据库。

建议增加的字段：

```text
request_id
gateway_id_snapshot
protocol_type
sent_time
response_time
timeout_time
send_attempt
```

### 5.3 建议的状态机

```text
WAITING -> SENDING -> SENT -> COMPLETED
                           ├-> FAILED
                           └-> TIMEOUT
```

状态转换必须带条件，避免重复响应覆盖终态：

```sql
UPDATE comm_command_plan_detail
SET status = #{status},
    response_payload = #{responsePayload},
    response_time = NOW()
WHERE id = #{id}
  AND status NOT IN ('COMPLETED', 'FAILED', 'TIMEOUT');
```

如果更新条数为 0，说明明细已经被其他线程处理，当前响应只记录日志，不再执行后置动作。

## 六、从事务内发送到 Outbox

### 6.1 为什么需要 Outbox

错误模型如下：

```text
数据库事务开始
  ↓
计划更新 RUNNING
  ↓
设备 A MQTT 发布成功
  ↓
设备 B MQTT 发布异常
  ↓
数据库事务回滚
```

MQTT 不支持数据库事务的回滚，所以会出现“设备已经执行，但数据库显示未发送”的不一致。

### 6.2 目标流程

```text
事务 A：计划 + 明细 + command_outbox 一起提交
  ↓ commit
CommandDispatchWorker 领取 outbox
  ↓
模板渲染、加密、发布 MQTT
  ↓
outbox 标记 SENT/FAILED，记录重试信息
  ↓
响应 Handler 按 requestId 更新明细
  ↓
ProgressService 聚合计划状态
```

Outbox 表可以设计为：

```sql
CREATE TABLE comm_command_outbox (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    detail_id BIGINT NOT NULL,
    request_id VARCHAR(64) NOT NULL,
    topic VARCHAR(512) NOT NULL,
    payload_template TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    next_retry_time DATETIME NULL,
    last_error VARCHAR(1000) NULL,
    created_date DATETIME NOT NULL,
    sent_date DATETIME NULL,
    UNIQUE KEY uk_outbox_request (request_id),
    KEY idx_outbox_dispatch (status, next_retry_time)
);
```

Worker 领取任务时需要防止多个实例重复发送，可以使用数据库行锁、状态条件更新或 Redis 分布式锁：

```java
@Transactional
public Optional<CommandOutbox> claimOne() {
    CommandOutbox item = mapper.selectNextReadyForUpdate();
    if (item == null) {
        return Optional.empty();
    }
    mapper.markSending(item.getId(), item.getAttemptCount() + 1);
    return Optional.of(item);
}
```

发布失败采用指数退避，例如 1 秒、5 秒、30 秒、5 分钟，超过最大次数后转为 `FAILED`，由人工或补偿任务处理。

## 七、可靠的模板渲染器

当前使用 `String.replace()` 替换 `$gatewayId`、`$requestId` 和 `$ciphertext`，实现简单但不够可靠：JSON 嵌套、数字节点、转义字符和未知变量都会造成风险。

建议建立白名单变量和独立渲染服务：

```java
public record CommandRenderContext(
        String gatewayId,
        String requestId,
        String ciphertext,
        Long deviceId,
        String serialNumber) {
}

public interface CommandTemplateRenderer {
    RenderedCommand render(String topicTemplate,
                           String payloadTemplate,
                           CommandRenderContext context);
}
```

渲染步骤：

1. 校验 topic 不包含 MQTT 通配符；
2. 解析 payload 为 Jackson `JsonNode`；
3. 只替换白名单变量；
4. 根据原节点类型写入字符串、数字或布尔值；
5. 扫描是否仍有 `$unknown` 占位符；
6. 加密失败直接返回失败，不发布半成品消息；
7. 保存最终 topic/payload 快照，便于审计。

协议保存和更新时就完成静态校验，执行阶段只做运行时变量渲染。

## 八、Control 命令和动态订阅拆分

### 8.1 当前实现

`ControlCommand.afterResponse()` 使用 GatewayID 拼接两个监管 topic，并注册 30 分钟回调：

```java
String zipTopic = SUPERVISION_ZIP_TOPIC.replace(
        "+", detail.getGatewayId());
mqttSubscriptionManager().subscribe(
        zipTopic, this::saveOverviewFile, Duration.ofMinutes(30));
```

收到 ZIP 或 JSON 后，`ControlCommand` 还会完成 MinIO 上传和监管文件记录创建。

### 8.2 串单风险

如果同一个 Gateway 同时执行两个 Control 命令，单纯使用 `topic -> 一个回调` 会出现后注册回调覆盖前一个回调，文件也无法准确归属 requestId。订阅动作异步执行时，设备已经发布的数据还有可能早于订阅到达。

### 8.3 推荐事件化结构

命令对象只负责协议相关行为，响应后发布领域事件：

```text
CommandResponseRecordedEvent
  ├── EditDeviceRefreshHandler
  └── ControlSupervisionFileHandler
```

`ControlSupervisionFileHandler` 负责：

- 根据 requestId 注册监管上下文；
- 校验 gatewayId、计划明细和文件时间；
- 上传 MinIO；
- 创建 `TelemetrySupervisionFile`；
- 以文件摘要或 requestId 做幂等去重。

动态订阅管理器至少应支持一个 topic 多个订阅：

```java
Map<String, List<DynamicSubscription>> subscriptions;
```

更理想的协议是让设备在监管 payload 中回传 requestId，这样服务端可以使用 `requestId -> consumer`，不再依赖“最近一次命令”猜测归属。

## 九、属性单位规则：把展示语义从代码中抽离

### 9.1 业务背景

设备数据来自 InfluxDB，field 常见为 `Pt`、`Va`、`Soc`、`Tinv` 等协议名称。若每个列表、详情、汇总和趋势图都写一份 `if/else`，新增 field 就必须修改多个页面和服务。

`property_unit_rule` 将这种映射变成后台可维护的规则：

```text
属性名 + 匹配方式 + 匹配值 + 权重 -> 展示单位
```

### 9.2 表结构

项目中的 `yin/yin-admin/src/main/resources/sql/property-unit-rule.sql` 定义了核心字段：

```sql
CREATE TABLE IF NOT EXISTS property_unit_rule
(
    id BIGINT PRIMARY KEY,
    match_type VARCHAR(32) NOT NULL,
    match_value VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    weight INT NOT NULL DEFAULT 0,
    unit VARCHAR(64) NOT NULL,
    remark VARCHAR(256) DEFAULT NULL,
    created_date TIMESTAMP NULL,
    created_by VARCHAR(64) DEFAULT NULL,
    last_modified_date TIMESTAMP NULL,
    last_modified_by VARCHAR(64) DEFAULT NULL,
    UNIQUE KEY uk_property_unit_rule_match (match_type, match_value),
    KEY idx_property_unit_rule_weight (weight)
);
```

这里的 `utf8mb4_bin` 表示匹配值大小写敏感，符合 InfluxDB field 的语义。数据库唯一键保证同一种匹配类型和匹配内容不会重复配置；服务层的 `assertUnique()` 只负责提供友好错误，不能替代数据库约束。

### 9.3 四种匹配策略

`PropertyUnitMatchType` 将匹配行为封装在枚举内部：

```java
public enum PropertyUnitMatchType {
    STARTS_WITH(2),
    ENDS_WITH(2),
    CONTAINS(1),
    EXACT(3);

    private final int specificity;

    public boolean matches(String propertyName, String matchValue) {
        return switch (this) {
            case STARTS_WITH -> propertyName.startsWith(matchValue);
            case ENDS_WITH -> propertyName.endsWith(matchValue);
            case CONTAINS -> propertyName.contains(matchValue);
            case EXACT -> propertyName.equals(matchValue);
        };
    }
}
```

示例：

| 类型 | `matchValue = Va` 时的命中示例 | specificity |
| --- | --- | ---: |
| `EXACT` | `Va` | 3 |
| `STARTS_WITH` | `VaR`、`Value` | 2 |
| `ENDS_WITH` | `BusVa` | 2 |
| `CONTAINS` | `MaxVaValue` | 1 |

匹配严格区分大小写，`Va` 不会命中 `va`。

### 9.4 可解释的优先级

当一个属性命中多条规则时，解析器按照以下三元组降序排列：

```text
priority(rule) = (weight, specificity, id)
```

比较顺序为：

1. `weight` 越大越优先；
2. 权重相同，`EXACT` 优先于前缀/后缀，前缀/后缀优先于包含；
3. 前两项相同，ID 较大的规则优先，保证数据库返回顺序变化时结果仍稳定。

例如：

| 规则 | weight | specificity | `VaR` 是否命中 |
| --- | ---: | ---: | --- |
| `CONTAINS("a") -> %` | 10 | 1 | 是 |
| `STARTS_WITH("Va") -> V` | 10 | 2 | 是 |
| `EXACT("VaR") -> V` | 10 | 3 | 是 |

最终返回 `V`。需要注意，权重优先于 specificity；低权重的精确规则不会自动压过高权重的模糊规则。

### 9.5 Resolver 的缓存算法

`PropertyUnitResolver` 维护两层读取优化：

- `orderedRules`：数据库规则按优先级排序后的内存快照；
- `propertyUnitResultCache`：field 到 `Optional<String>` 的 Caffeine 结果缓存。

核心逻辑如下：

```java
public String resolve(String propertyName) {
    if (!StringUtils.hasText(propertyName)) {
        return "";
    }

    Optional<String> cached = resultCache.getIfPresent(propertyName);
    if (cached != null) {
        return cached.orElse("");
    }

    synchronized (cacheLock) {
        cached = resultCache.getIfPresent(propertyName);
        if (cached == null) {
            cached = findUnit(propertyName);
            resultCache.put(propertyName, cached);
        }
        return cached.orElse("");
    }
}

private Optional<String> findUnit(String propertyName) {
    return getOrderedRules().stream()
            .filter(rule -> PropertyUnitMatchType.parse(rule.getMatchType())
                    .matches(propertyName, rule.getMatchValue()))
            .map(PropertyUnitRule::getUnit)
            .findFirst();
}
```

`Optional.empty()` 是负缓存：未知 field 也会被缓存，避免同一个未知属性反复扫描全部规则。对外仍返回空字符串，兼容当前 InfluxService 和前端模型。

### 9.6 规则变更为什么要 after-commit 失效

规则新增、修改和删除在事务内调用 `invalidateAllAfterCommit()`：

```java
public void invalidateAllAfterCommit() {
    Runnable invalidation = this::invalidateAll;
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
        invalidation.run();
        return;
    }
    TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    invalidation.run();
                }
            });
}
```

时序是：

```text
事务内写数据库 -> commit 成功 -> 清空结果缓存和规则快照
                         |
                         └-> rollback：保留旧缓存
```

如果在事务刚开始时就清缓存，而后续数据库写入回滚，读请求会重建出旧规则，虽然最终结果正确，却产生了不必要的缓存抖动。绑定 after-commit 能让缓存失效与事实数据提交保持一致。

## 十、单位规则管理服务与前端

### 10.1 Service 的职责边界

`PropertyUnitRuleService` 负责 CRUD、参数规范化和唯一性校验，`PropertyUnitResolver` 负责运行时解析，不让 Controller 直接操作缓存：

```java
@Transactional(rollbackFor = Exception.class)
public PropertyUnitRuleDTO create(PropertyUnitRuleDTO dto) {
    normalizeAndValidate(dto);
    assertUnique(dto);
    PropertyUnitRule entity = converter.toEntity(dto);
    mapper.insert(entity);
    resolver.invalidateAllAfterCommit();
    return converter.toDTO(entity);
}
```

参数规范化包括：trim 匹配类型、匹配值、单位；空备注转为 `null`；调用 `PropertyUnitMatchType.parse()` 严格校验枚举。

### 10.2 REST 和页面

Controller 前缀为 `/device/property-unit-rule`，前端对应：

```text
GET    /page
GET    /{id}
POST   /
PUT    /
DELETE /{ids}
```

页面位于：

```text
yang/src/views/device/property-unit-rule/index.vue
yang/src/views/device/property-unit-rule/components/PropertyUnitRuleForm.vue
yang/src/api/device/property-unit-rule.ts
yang/src/types/device/property-unit-rule.ts
```

前端下拉框必须提交 `STARTS_WITH`、`ENDS_WITH`、`CONTAINS`、`EXACT` 这些大写枚举值，并在表单中明确提示“区分大小写”和“权重优先于匹配精确度”。

### 10.3 InfluxService 的统一消费

`InfluxService` 不需要理解规则细节，只调用 Resolver：

```java
device.getUnits().put(field, propertyUnitResolver.resolve(field));
summary.setConsumptionUnit(propertyUnitResolver.resolve("Pt"));
series.setUnit(propertyUnitResolver.resolve(query.getField()));
```

这样设备列表、详情、汇总卡片和趋势序列共享同一套单位语义，避免前端页面各自维护映射表。

## 十一、单位规则的扩展边界

当前规则键只有 `propertyName`，适合同一 field 在所有设备中含义一致的场景。若出现“同名 field 在不同设备类型使用不同单位”，应把解析键升级为：

```text
(deviceType, measurement, propertyName)
```

数据库增加可选 `device_type`、`measurement` 字段，并定义回退顺序：

```text
设备类型 + measurement + field
  ↓ 无命中
设备类型 + field
  ↓ 无命中
全局 field
```

多实例部署时，当前 JVM 内的 `orderedRules` 和 Caffeine 缓存不会自动同步。可使用 Redis Pub/Sub、消息队列或配置中心广播规则版本：

```text
管理实例提交规则
  ↓ after-commit 发布 RULE_VERSION_CHANGED
所有业务实例收到事件
  ↓
清理本地缓存并懒加载新快照
```

规则规模较大时，可按匹配类型优化：

- EXACT 使用 HashMap；
- STARTS_WITH 使用 Trie 或首字符分桶；
- ENDS_WITH 使用反向 Trie；
- CONTAINS 先按候选字符分桶，减少全量扫描。

同时可以将全局锁替换为 Caffeine `cache.get(key, loader)`、分段锁或按 key 的 single-flight，避免不同 field 的冷启动解析互相阻塞。

## 十二、两个模块共同体现的设计思想

### 12.1 事实来源与运行时优化分离

通信模块中，明细表应该是 requestId 和状态的事实来源，Caffeine 只能加速；单位模块中，数据库规则是事实来源，orderedRules 和结果缓存只是读模型。这个原则可以概括为：

```text
持久化数据 = Source of Truth
内存缓存   = Performance Layer
```

缓存丢失不会破坏业务，只会触发重建；如果缓存丢失会导致无法处理响应，说明缓存承担了不该承担的业务职责。

### 12.2 应用服务编排，领域对象承载变化

`CommCommandPlanService` 负责编排流程，`Command` 承载协议差异；`PropertyUnitRuleService` 负责管理写入，`PropertyUnitResolver` 承载匹配算法。Controller 不直接拼接 MQTT、不直接扫描规则，职责边界清晰后，测试和替换都会更容易。

### 12.3 显式优先级和可解释结果

指令计划通过状态机表达进度；单位规则通过 `(weight, specificity, id)` 表达命中优先级。系统不应依赖“集合遍历顺序”或“最后一次响应”这种隐式行为，否则线上问题难以解释。

### 12.4 外部系统调用采用最终一致性

MQTT、MinIO、InfluxDB 都是外部系统。数据库事务只能保证本地数据一致，不能把网络调用伪装成同一个原子事务。Outbox、事件、重试和幂等是更可靠的组合。

## 十三、推荐目标结构

```text
CommCommandPlanService
  ├── CommandPlanCreator
  ├── CommandPlanProgressService
  └── CommandOutboxService

CommandDispatchWorker
  ├── CommandFactory
  ├── CommandTemplateRenderer
  └── MqttTransport

CommandResponseHandler
  ├── ResponseParser
  ├── CommandCorrelationRepository
  ├── IdempotencyGuard
  └── CommandPlanProgressService

PropertyUnitRuleService
  ├── RuleValidator
  ├── RuleRepository
  └── RuleCacheInvalidator

PropertyUnitResolver
  ├── RuleSnapshotLoader
  ├── MatchIndex
  └── ResultCache

CommandResponseRecordedEvent
  ├── EditDeviceRefreshHandler
  └── ControlSupervisionFileHandler
```

这不是一次性重写清单，而是演进目标。当前代码中的 Command、Factory、Resolver 和缓存都可以保留，通过增加持久化关联、Outbox 和事件处理器逐步迁移。

## 十四、测试设计

### 14.1 指令计划

```text
创建计划
  - 协议不存在时拒绝
  - 设备去重和空目标策略正确
  - 明细数量等于目标设备数量

模板渲染
  - gatewayId 正确替换
  - requestId 在字符串和数字 JSON 节点中正确写入
  - 未知占位符被拒绝
  - 加密失败时不发布消息

响应关联
  - 正常响应更新明细
  - 重复响应不重复执行 afterResponse
  - 未知 requestId 被记录但不阻塞 MQTT 线程
  - gatewayId 不匹配时拒绝关联

计划聚合
  - 全部成功 -> COMPLETED
  - 存在失败 -> FAILED
  - 未完成明细超时 -> TIMEOUT
  - 并发响应下 successCount 不重复累加
```

### 14.2 Control 后置动作

- 同一个 Gateway 同时执行两个 Control 命令时不串单；
- ZIP 和 JSON 只关联正确的 detail；
- 同一文件重复到达不会重复创建记录；
- MinIO 上传失败可重试或进入补偿队列；
- 订阅尚未生效时的数据不会静默丢失。

### 14.3 单位规则

```text
匹配行为
  - 四种匹配类型的正反例
  - 大小写敏感

优先级
  - weight 优先于 specificity
  - specificity 优先于 id
  - 相同条件下结果稳定

缓存
  - 正缓存和负缓存
  - 同一冷 field 并发解析只产生一个结果
  - 新增、修改、删除 after-commit 后失效
  - 事务回滚不会清理旧缓存

数据约束
  - 相同 matchType/matchValue 由数据库唯一键拦截
  - 空匹配值、空单位和未知枚举被拒绝
```

## 十五、实施路线

### P0：先解决正确性

1. 指令明细持久化 requestId、gatewayId 和发送时间；
2. 增加终态条件更新和计划状态聚合；
3. Caffeine 降级为性能缓存，数据库成为响应关联来源；
4. 单位规则补齐 Resolver、Service 和 Controller 的测试；
5. 修复协议枚举重复 code 和 payload 基础校验。

### P1：解决外部系统一致性

1. 引入 `comm_command_outbox`；
2. 使用异步 Worker 发布 MQTT；
3. 增加重试、超时和失败补偿；
4. 将 Control 的文件处理拆成事件处理器；
5. 为动态订阅增加 requestId 级关联。

### P2：提升可维护性和性能

1. 引入 JSON 模板渲染器；
2. 单位规则增加试匹配和冲突检测接口；
3. 多实例通过消息广播缓存失效；
4. 按设备类型和 measurement 扩展单位规则维度；
5. 批量 insert、按 Gateway 分区发送和限流。

### P3：运维与安全

1. 记录 planId、detailId、requestId、gatewayId 的结构化日志；
2. 监控发送成功率、响应延迟、超时率、重放次数、规则缓存命中率；
3. 增加死信和人工补偿页面；
4. 将 JWT 密钥、MQTT 密钥、MinIO 密钥全部迁移到密钥管理系统；
5. 结合 Token 续期方案增加登录会话、设备和操作审计。

## 十六、总结

Taichi2.0 的通信指令和单位规则已经具备良好的基础：Command/Factory 将协议差异隔离，PropertyUnitResolver 将规则和缓存集中管理，MyBatis Plus 和 Vue 页面形成了完整的管理闭环。

下一步不建议直接重写全部代码，而应按照风险优先级演进：

```text
先补状态闭环和持久化关联
  ↓
再用 Outbox 拆开数据库事务和 MQTT
  ↓
再拆分 Control 后置副作用和动态订阅
  ↓
最后优化模板渲染、规则索引、多实例缓存和运维指标
```

这样既保留现有代码的可用部分，又能逐步获得可恢复、可审计、可扩展的设备云业务架构。

---
title: Taichi 预警告警模块设计与实现教程
date: 2026-07-29
category:
  - Java
  - Vue
tag:
  - Spring Boot
  - Vue3
  - MQTT
  - 告警预警
  - 邮件通知
---

# Taichi 预警告警模块设计与实现教程

本文基于 `D:\WorkSpace\Electric\cloud-web\03.Code\Taichi` 项目，整理一次从零增加预警告警能力的完整过程。这个模块的核心目标是：设备上报 `PropertiesReport` 后，系统可以按规则判断某个属性值是否异常，命中规则后发送 Email 通知，并可选地向设备下发一条自动指令，同时沉淀告警记录用于追溯。

## 一、业务目标

预警告警模块要解决四件事：

1. 管理 Email 联系人和邮箱地址。
2. 配置预警规则：选择 `PropertiesReport` 字段、比较条件、阈值、监控设备或分组、通知联系人。
3. 命中预警后自动处理：发送邮件，或者额外选择通信协议并下发自定义 Payload。
4. 保存告警记录：记录触发规则、触发设备、实际值、原始 `PropertiesReport` Payload、邮件发送结果和自动指令发送结果。

这里把“规则”和“记录”拆开，是为了让预警规则可以长期维护，而每次触发都形成独立的审计记录。

## 二、整体设计

模块可以分成三层：

1. 数据层：保存联系人、邮箱、预警规则、规则目标、规则联系人、告警事件。
2. 后端业务层：在 MQTT `PropertiesReport` 处理链路中评估规则，命中后发邮件、下发指令、保存记录。
3. 前端管理层：提供联系人管理、预警规则配置、告警记录查看和 Payload 追溯。

整体流程如下：

```text
设备上报 PropertiesReport
        |
        v
DeviceReportHandler 解析 Payload
        |
        v
WarningRuleService.evaluate(payload)
        |
        +--> 查询启用的预警规则
        +--> 判断设备/分组目标是否匹配
        +--> 按 propertyPath 读取 PropertiesReport 字段值
        +--> 按 operator + thresholdValue 比较
        +--> 判断 suppressMinutes 是否需要抑制重复告警
        +--> 保存 warning_event
        +--> 发送 Email
        +--> 如果 actionType=command，则下发自动指令
        +--> 回写邮件和指令结果
```

## 三、表结构设计

表结构追加在后端：

```text
backend/src/main/resources/sql/init.sql
```

### 1. Email 联系人表

`comm_email_contact` 保存联系人主数据。

```sql
CREATE TABLE comm_email_contact
(
    id                 BIGINT PRIMARY KEY COMMENT '主键',
    contact_name       VARCHAR(100) NOT NULL COMMENT '联系人姓名',
    phone              VARCHAR(50)           DEFAULT NULL COMMENT '手机号',
    organization       VARCHAR(100)          DEFAULT NULL COMMENT '组织',
    position_name      VARCHAR(100)          DEFAULT NULL COMMENT '职位',
    is_enable          TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否启用 1启用 0禁用',
    remark             VARCHAR(500)          DEFAULT NULL COMMENT '备注',
    created_date       TIMESTAMP             DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    created_by         VARCHAR(64)           DEFAULT NULL COMMENT '创建人员',
    last_modified_date TIMESTAMP             DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_modified_by   VARCHAR(64)           DEFAULT NULL COMMENT '更新人员',
    KEY                idx_contact_name (contact_name),
    KEY                idx_is_enable (is_enable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Email联系人';
```

### 2. Email 地址表

一个联系人可以有多个邮箱，邮箱单独成表。

```sql
CREATE TABLE comm_email_address
(
    id                 BIGINT PRIMARY KEY COMMENT '主键',
    contact_id         BIGINT       NOT NULL COMMENT '联系人ID',
    email              VARCHAR(191) NOT NULL COMMENT '邮箱地址',
    email_type         VARCHAR(50)           DEFAULT NULL COMMENT '邮箱类型',
    is_primary         TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否主邮箱 1是 0否',
    is_enable          TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否启用 1启用 0禁用',
    remark             VARCHAR(500)          DEFAULT NULL COMMENT '备注',
    UNIQUE KEY         uk_contact_email (contact_id, email),
    KEY                idx_contact_id (contact_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Email邮箱地址';
```

这样设计的好处是联系人和邮箱生命周期分离，后续支持多个通知渠道时，也可以继续扩展手机号、Webhook、企业微信等地址表。

### 3. 预警规则表

`warning_rule` 是规则主表。

关键字段如下：

| 字段 | 说明 |
| --- | --- |
| `property_path` | `PropertiesReport` 字段路径，例如 `workMode`、`fcas.fcasCtrl`、`devices[0].properties.soc` |
| `operator` | 比较符，支持 `gt/gte/lt/lte/eq/ne/contains` |
| `threshold_value` | 阈值，统一保存为字符串，比较时按 `value_type` 转换 |
| `value_type` | 值类型，支持 `number/string/boolean` |
| `target_scope` | 目标范围，支持 `all/device/group` |
| `suppress_minutes` | 重复告警抑制时间 |
| `action_type` | 触发动作，`none` 表示仅邮件，`command` 表示下发自动指令 |
| `comm_protocol_id` | 自动指令使用的通信协议 |
| `command_payload` | 自动指令 Payload |

### 4. 规则目标与联系人关联表

规则和设备/分组是多对多关系，所以单独放在 `warning_rule_target`。

规则和联系人也是多对多关系，所以单独放在 `warning_rule_contact`。

这种设计避免在 `warning_rule` 里存逗号拼接字符串，后续查询、索引和维护都更清晰。

### 5. 告警事件表

`warning_event` 保存每一次触发记录。

关键字段如下：

| 字段 | 说明 |
| --- | --- |
| `warning_rule_id` | 触发的规则 ID |
| `rule_name` | 规则名称快照 |
| `gateway_id` | 触发设备 |
| `property_path` | 触发字段 |
| `actual_value` | 触发时的实际值 |
| `threshold_value` | 触发时的阈值快照 |
| `report_payload` | 触发时完整 `PropertiesReport` Payload |
| `mail_status` | 邮件状态 |
| `command_status` | 自动指令状态 |
| `command_payload` | 自动指令 Payload 快照 |

这里保存快照非常重要。规则后续可能会被修改，如果记录只关联规则 ID，就无法还原当时到底因为什么条件触发。

## 四、后端模块结构

后端新增的主要包结构如下：

```text
com.yinyang.yin
├── controller
│   ├── communication
│   │   ├── CommEmailContactController
│   │   └── CommEmailAddressController
│   └── warning
│       ├── WarningRuleController
│       └── WarningEventController
├── dto
│   ├── communication
│   │   ├── CommEmailContactDTO
│   │   └── CommEmailAddressDTO
│   └── warning
│       ├── WarningRuleDTO
│       └── WarningEventDTO
├── entity
│   ├── communication
│   │   ├── CommEmailContact
│   │   └── CommEmailAddress
│   └── warning
│       ├── WarningRule
│       ├── WarningRuleTarget
│       ├── WarningRuleContact
│       └── WarningEvent
├── mapper
├── converter
└── service
    └── warning
        ├── WarningRuleService
        └── WarningEventService
```

这一套仍然沿用项目既有风格：`Controller -> Service -> Mapper`，实体和 DTO 通过 MapStruct Converter 转换。

## 五、Email 联系人管理

联系人接口：

```text
GET    /communication/email-contact/page
GET    /communication/email-contact/list
GET    /communication/email-contact/{id}
POST   /communication/email-contact
PUT    /communication/email-contact
DELETE /communication/email-contact/{ids}
```

联系人保存时可以携带邮箱列表：

```json
{
  "contactName": "运维值班",
  "phone": "13800000000",
  "organization": "运维中心",
  "isEnable": true,
  "emailAddresses": [
    {
      "email": "ops@example.com",
      "emailType": "work",
      "isPrimary": true,
      "isEnable": true
    }
  ]
}
```

服务层保存联系人后，会同步维护子表邮箱地址。这样前端只需要提交一个联系人对象，不需要分别调用联系人和邮箱接口。

## 六、预警规则配置

预警规则 DTO 的关键字段：

```java
public class WarningRuleDTO {
    private String id;
    private String ruleName;
    private String propertyPath;
    private String operator;
    private String thresholdValue;
    private String valueType;
    private String targetScope;
    private Boolean isEnable;
    private Integer suppressMinutes;
    private String actionType;
    private String commProtocolId;
    private String protocolName;
    private String commandPayload;
    private List<Long> deviceIds;
    private List<Long> groupIds;
    private List<Long> contactIds;
}
```

新增规则时，前端会让用户选择：

1. 监控字段：例如 `workMode` 或 `devices[0].properties.soc`。
2. 值类型：数字、字符串、布尔。
3. 比较符：大于、大于等于、小于、小于等于、等于、不等于、包含。
4. 监控范围：全部设备、指定设备、指定分组。
5. 联系人：命中后发邮件给哪些人。
6. 触发动作：仅邮件，或者自动指令。
7. 自动指令：选择 Protocol 后，可编辑 Payload。

## 七、PropertiesReport 字段读取

规则里不直接绑定 Java 字段，而是保存 `propertyPath`。这样同一个规则引擎可以处理顶层字段、嵌套对象和数组。

示例路径：

```text
workMode
fcas.fcasCtrl
fcas.fcasMode
devices[0].properties.soc
devices[0].properties.p
```

核心读取逻辑在 `WarningRuleService`：

```java
private JsonNode readPath(JsonNode root, String path) {
    if (root == null || StringUtils.isBlank(path)) {
        return null;
    }
    JsonNode current = root;
    for (String segment : path.split("\\.")) {
        if (current == null || current.isMissingNode()) {
            return null;
        }
        current = readSegment(current, segment);
    }
    return current;
}
```

数组字段通过 `readSegment` 解析 `devices[0]` 这种写法。这样前端可以用 `allow-create` 允许用户自定义字段路径，而不是只能选固定字段。

## 八、规则比较逻辑

比较时先根据 `valueType` 决定如何解释实际值和阈值。

```java
private boolean compare(String actualValue, WarningRule rule) {
    String operator = StringUtils.defaultIfBlank(rule.getOperator(), "eq");
    String valueType = StringUtils.defaultIfBlank(rule.getValueType(), "number");

    if ("number".equals(valueType)) {
        BigDecimal actual = new BigDecimal(actualValue.replace("\"", ""));
        BigDecimal threshold = new BigDecimal(rule.getThresholdValue());
        int compared = actual.compareTo(threshold);
        return switch (operator) {
            case "gt" -> compared > 0;
            case "gte" -> compared >= 0;
            case "lt" -> compared < 0;
            case "lte" -> compared <= 0;
            case "ne" -> compared != 0;
            default -> compared == 0;
        };
    }

    if ("boolean".equals(valueType)) {
        boolean actual = Boolean.parseBoolean(actualValue);
        boolean threshold = Boolean.parseBoolean(rule.getThresholdValue());
        return "ne".equals(operator) ? actual != threshold : actual == threshold;
    }

    return switch (operator) {
        case "contains" -> actualValue.contains(rule.getThresholdValue());
        case "ne" -> !Objects.equals(actualValue, rule.getThresholdValue());
        default -> Objects.equals(actualValue, rule.getThresholdValue());
    };
}
```

这里数字使用 `BigDecimal`，避免浮点数比较带来的精度问题。

## 九、目标设备匹配

规则支持三种目标范围：

| 范围 | 说明 |
| --- | --- |
| `all` | 全部设备都参与规则判断 |
| `device` | 只监控指定设备 |
| `group` | 只监控指定分组下的设备 |

设备上报时，系统先通过 `gatewayId` 找到 `device_info`，再判断规则目标是否匹配。

```java
private boolean matchTarget(WarningRule rule, DeviceInfo deviceInfo) {
    String targetScope = StringUtils.defaultIfBlank(rule.getTargetScope(), "all");
    if ("all".equals(targetScope)) {
        return true;
    }
    if (deviceInfo == null) {
        return false;
    }
    // device/group 分别查询 warning_rule_target 和 device_info_group
    return false;
}
```

如果规则是按分组配置，就查询 `device_info_group` 判断当前设备是否属于任一目标分组。

## 十、重复告警抑制

同一条规则如果每次设备上报都触发，会造成邮件轰炸。因此规则有一个 `suppressMinutes` 字段。

逻辑是：如果规则最近触发时间距当前时间小于抑制分钟数，就跳过本次告警。

```java
private boolean isSuppressed(WarningRule rule) {
    if (rule.getLastTriggeredDate() == null
            || rule.getSuppressMinutes() == null
            || rule.getSuppressMinutes() <= 0) {
        return false;
    }
    return Duration.between(rule.getLastTriggeredDate(), Instant.now()).toMinutes()
            < rule.getSuppressMinutes();
}
```

当告警真正触发后，系统会回写 `warning_rule.last_triggered_date`。

## 十一、触发邮件通知

邮件发送基于 Spring Boot Mail：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

发送前会做三层判断：

1. 规则是否配置联系人。
2. 联系人是否有启用状态的邮箱地址。
3. 系统是否配置了 `JavaMailSender`。

如果未配置邮件发送器，不会抛异常中断流程，而是在告警记录中写入：

```text
mail_status = skipped
mail_message = 未配置邮件发送器
```

这样本地开发环境即使没有 SMTP，也可以正常测试规则触发和告警记录。

## 十二、自动指令设计

新增预警时，用户可以选择触发动作：

| 动作 | 说明 |
| --- | --- |
| `none` | 只保存告警记录并发送邮件 |
| `command` | 发送邮件后，按选择的 Protocol 下发自动指令 |

当选择自动指令时，前端会根据协议填充 Payload 模板，用户可以继续修改：

```ts
const handleProtocolChange = async (value: string) => {
  const protocol = await getCommProtocolDetail(value);
  form.protocolName = protocol.name;
  form.commandPayload = protocol.payloadTemplate;
};
```

后端执行时复用已有通信模块：

```java
CommProtocol protocol = commProtocolMapper.selectById(rule.getCommProtocolId());
String payload = StringUtils.defaultIfBlank(
        rule.getCommandPayload(),
        protocol.getPayloadTemplate()
);
GlobalConstants.ProtocolType protocolType =
        GlobalConstants.ProtocolType.fromCode(protocol.getType());
Command command = commandFactory.create(protocolType, detail);
command.execute(protocol.getTopic(), payload);
```

当前实现记录的是“自动指令是否成功发布”。如果后续需要追踪设备响应，可以继续扩展 `warning_event` 与 `commandCache` 的关联，把设备响应回写到告警事件。

## 十三、告警记录追溯

告警记录接口：

```text
GET /warning/event/page
GET /warning/event/list
GET /warning/event/{id}
```

前端告警详情页展示四类信息：

1. 规则快照：规则名、字段路径、实际值、阈值、触发时间。
2. 邮件结果：`mailStatus`、`mailMessage`。
3. 自动指令结果：协议、Payload、发送状态和错误信息。
4. 原始 Payload：`reportPayload`，用 JSON 编辑器只读展示。

为了方便追溯，详情抽屉还会按 `gatewayId + warningRuleId` 查询历史记录，展示同一设备同一规则的触发轨迹。

## 十四、接入 MQTT 上报链路

设备上报处理在 `DeviceReportHandler`。原来只处理设备属性缓存，现在新增一行规则评估：

```java
try {
    warningRuleService.evaluate(propertiesReportPayload);
} catch (Exception e) {
    log.warn("PropertiesReport预警评估失败, gatewayId={}",
            propertiesReportPayload.getDeviceId(), e);
}
```

这里使用 `try/catch` 包住预警逻辑，是为了保证告警模块异常不会影响 MQTT 主链路。设备上报属于核心数据链路，告警是旁路能力，旁路失败不能拖垮主流程。

## 十五、前端页面设计

前端新增三个页面：

```text
src/views/communication/email-contact/index.vue
src/views/warning/warning-rule/index.vue
src/views/warning/warning-event/index.vue
```

路由菜单增加：

```text
Communication
  - Email Contacts

Warning
  - Warning Rules
  - Alarm Records
```

### 1. Email Contacts

联系人页面提供联系人 CRUD，并在表单内维护邮箱列表。用户不需要跳转到另一个页面维护邮箱。

### 2. Warning Rules

规则页面分成三块：

1. 基础条件：字段、类型、比较符、阈值、抑制时间。
2. 监控范围：全部设备、指定设备、指定分组。
3. 触发处理：联系人、触发动作、协议、Payload。

### 3. Alarm Records

告警记录页面以列表为入口，详情使用抽屉展示。Payload 用 `JsonEditor` 展示，方便排查字段路径和实际上报值。

## 十六、一次完整触发示例

假设设备上报：

```json
{
  "deviceId": "GW-001",
  "workMode": "auto",
  "devices": [
    {
      "properties": {
        "soc": 18,
        "p": 1200
      }
    }
  ]
}
```

配置规则：

| 配置项 | 值 |
| --- | --- |
| 字段 | `devices[0].properties.soc` |
| 值类型 | `number` |
| 比较符 | `<` |
| 阈值 | `20` |
| 目标 | 指定设备 `GW-001` |
| 联系人 | 运维值班 |
| 动作 | 自动指令 |
| 协议 | EMS Control |
| Payload | `{ "mode": "charge" }` |

处理结果：

1. `readPath` 读取到实际值 `18`。
2. `18 < 20` 成立。
3. 当前设备匹配目标设备。
4. 未处于抑制时间内。
5. 插入 `warning_event`。
6. 发送邮件给联系人。
7. 按协议 Topic 发布 `{ "mode": "charge" }`。
8. 回写邮件和自动指令执行状态。

## 十七、空字符串 ID 的坑

前端表单里未选择自动指令时，`commProtocolId` 可能是空字符串：

```json
{
  "actionType": "none",
  "commProtocolId": ""
}
```

后端实体里 `commProtocolId` 是 `Long`，DTO 里是 `String`。MapStruct 转换时会调用公共转换器：

```java
protected Long stringToLong(String value) {
    return value == null ? null : Long.parseLong(value);
}
```

这会导致：

```text
java.lang.NumberFormatException: For input string: ""
```

修复方式是把空字符串当成未填写：

```java
protected Long stringToLong(String value) {
    return StringUtils.isBlank(value) ? null : Long.parseLong(value);
}
```

这个修复不只适用于预警模块，也能避免其他 DTO 字符串 ID 为空时转换失败。

## 十八、异常处理与前端体验

后端业务异常不要返回 HTTP 401。401 只应该表示认证失败，否则前端会清除 token 并跳转登录页。

普通业务异常建议返回统一结构：

```json
{
  "code": 500,
  "message": "错误信息",
  "data": null
}
```

前端收到后只弹错误提示，不做登录态处理。只有真正认证失败时才返回 HTTP 401。

## 十九、后续可扩展点

这个模块目前已经具备基础闭环，后续可以继续增强：

1. 增加告警级别：提示、一般、严重、致命。
2. 增加恢复通知：例如 SOC 恢复到安全区间后发送恢复邮件。
3. 增加通知渠道：短信、企业微信、Webhook。
4. 增加规则表达式：支持多个条件组合，例如 `soc < 20 AND p > 1000`。
5. 增加自动指令响应追踪：把设备响应回写到 `warning_event`。
6. 增加规则命中统计：按设备、分组、规则统计告警次数。

## 二十、总结

预警告警模块的关键不是单纯做一个 CRUD，而是把设备上报、规则判断、通知、自动处理和审计追溯串成一个闭环。

这个实现里有几个设计重点：

1. 规则保存字段路径，避免写死 Java 字段。
2. 规则和目标、联系人使用关联表，保持结构化查询能力。
3. 告警事件保存快照，保证历史可追溯。
4. 预警逻辑作为 MQTT 上报旁路能力，失败不影响主链路。
5. 自动指令复用通信协议和 CommandFactory，避免重新实现下发链路。
6. 普通业务异常不返回 HTTP 401，避免前端误判登录失效。

这样后续无论是扩展更多告警条件，还是接入更多通知渠道，都可以在现有结构上继续演进。

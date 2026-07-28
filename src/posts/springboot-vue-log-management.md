---
title: Spring Boot + Vue 后台日志管理模块实战
date: 2026-07-29
category: Java
tag:
  - Spring Boot
  - Vue
  - 日志管理
  - 后台系统
  - MyBatis Plus
isOriginal: true
excerpt: 基于 yin 后端和 yang 前端项目，在 system 模块中新增操作日志、系统日志、运行日志和日志保留策略，整理数据库设计、后端 CRUD、运行状态采集、前端管理页面、权限菜单和后续自动采集扩展方案。
---

# Spring Boot + Vue 后台日志管理模块实战

## 背景

后台系统上线后，日志不应该只停留在服务器文件里。运维、审计和安全排查都需要一套能在后台界面检索、保留和清理的日志管理功能。

这次改造基于当前项目：

```text
D:\WorkSpace\yin-yang
├── yin   # Spring Boot 多模块后端
└── yang  # Vue 3 + Element Plus 前端
```

日志管理放在 `system` 模块下，新增一个前端入口“日志管理”，内部按 tab 切分为四部分：

1. 操作日志：记录用户执行的业务操作，例如新增、修改、删除、导出、登录、注销、修改密码、创建用户等。
2. 系统日志：记录系统自动触发的事件，例如运行异常、网络故障、安全事件、攻击告警等。
3. 运行日志：记录服务底层运行状态，例如 CPU、内存、磁盘、负载、线程数、运行时长等。
4. 保留策略：按日志类型配置保留天数，并支持手动清理过期日志。

## 依赖选择

本次新增了 Spring AOP 依赖，用来自动记录现有业务接口的操作日志，其余能力复用项目已有组件：

```text
Spring Boot Web             提供 REST API
Spring Security             提供后端接口权限控制
Spring Boot Starter AOP     拦截 Controller 操作并自动写入操作日志
MyBatis Plus                提供 BaseMapper、分页和条件查询
Lombok                      简化实体、DTO 样板代码
Spring Boot Actuator        项目已存在，可作为后续指标扩展入口
JDK ManagementFactory       采集 CPU、内存、线程、运行时间等运行状态
Vue 3 + Element Plus        实现日志管理页面
vue-i18n                    实现中英文文案
```

运行日志采集没有直接引入 OSHI、Micrometer Registry 等依赖，是因为当前需求只需要基础运行快照，JDK 自带的 `ManagementFactory` 已经足够。后续如果需要更细的主机指标、容器指标或 Prometheus 指标，再引入专门依赖更合适。

`yin-admin/pom.xml` 新增：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

## 数据库设计

日志模块新增 4 张表：

```text
sys_operation_log   操作日志
sys_system_log      系统日志
sys_runtime_log     运行日志
sys_log_retention   日志保留策略
```

项目实际初始化脚本在：

```text
D:\WorkSpace\yin-yang\yin\yin-admin\src\main\resources\sql\init.sql
```

用户指定的 `resources/init.sql` 原本不存在，因此本次也新增了：

```text
D:\WorkSpace\yin-yang\yin\yin-admin\src\main\resources\init.sql
```

其中 `sql/init.sql` 是完整初始化脚本，包含建表、菜单、权限和默认保留策略；`resources/init.sql` 是日志表建表 SQL 附录，保留给指定路径使用。

### 操作日志表

操作日志围绕一次用户请求或业务操作建模：

```sql
CREATE TABLE IF NOT EXISTS sys_operation_log (
    id BIGINT NOT NULL COMMENT '主键',
    trace_id VARCHAR(64) DEFAULT NULL COMMENT '链路追踪ID',
    user_id BIGINT DEFAULT NULL COMMENT '用户ID',
    username VARCHAR(64) DEFAULT NULL COMMENT '用户名',
    module VARCHAR(100) DEFAULT NULL COMMENT '操作模块',
    business_type VARCHAR(64) DEFAULT NULL COMMENT '业务类型',
    operation_type VARCHAR(64) DEFAULT NULL COMMENT '操作类型',
    request_method VARCHAR(16) DEFAULT NULL COMMENT '请求方式',
    request_uri VARCHAR(500) DEFAULT NULL COMMENT '请求地址',
    request_params TEXT DEFAULT NULL COMMENT '请求参数',
    response_status INT DEFAULT NULL COMMENT '响应状态码',
    error_message TEXT DEFAULT NULL COMMENT '错误信息',
    client_ip VARCHAR(64) DEFAULT NULL COMMENT '客户端IP',
    user_agent VARCHAR(512) DEFAULT NULL COMMENT 'User-Agent',
    duration_ms BIGINT DEFAULT NULL COMMENT '耗时毫秒',
    operation_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    last_modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_modified_by VARCHAR(64) DEFAULT NULL COMMENT '更新人',
    PRIMARY KEY (id),
    KEY idx_sys_operation_log_operation_time (operation_time),
    KEY idx_sys_operation_log_username (username),
    KEY idx_sys_operation_log_module_type (module, operation_type),
    KEY idx_sys_operation_log_trace_id (trace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';
```

字段设计重点：

- `trace_id`：后续接入链路追踪时能串起一次请求。
- `module`、`business_type`、`operation_type`：用于按业务维度筛选。
- `request_uri`、`request_params`、`response_status`：用于定位接口调用现场。
- `duration_ms`：用于发现慢操作。

### 系统日志表

系统日志记录系统主动产生的事件，不绑定某个用户请求：

```sql
CREATE TABLE IF NOT EXISTS sys_system_log (
    id BIGINT NOT NULL COMMENT '主键',
    level VARCHAR(20) NOT NULL DEFAULT 'INFO' COMMENT '日志级别',
    source VARCHAR(100) DEFAULT NULL COMMENT '日志来源',
    event_type VARCHAR(64) DEFAULT NULL COMMENT '事件类型',
    status VARCHAR(32) DEFAULT NULL COMMENT '状态',
    message VARCHAR(1000) NOT NULL COMMENT '摘要',
    detail TEXT DEFAULT NULL COMMENT '详情',
    trace_id VARCHAR(64) DEFAULT NULL COMMENT '链路追踪ID',
    host VARCHAR(128) DEFAULT NULL COMMENT '主机',
    occurred_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    last_modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_modified_by VARCHAR(64) DEFAULT NULL COMMENT '更新人',
    PRIMARY KEY (id),
    KEY idx_sys_system_log_occurred_time (occurred_time),
    KEY idx_sys_system_log_level (level),
    KEY idx_sys_system_log_source_event (source, event_type),
    KEY idx_sys_system_log_trace_id (trace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';
```

### 运行日志表

运行日志保存某一时刻的服务状态快照：

```sql
CREATE TABLE IF NOT EXISTS sys_runtime_log (
    id BIGINT NOT NULL COMMENT '主键',
    service_name VARCHAR(100) NOT NULL COMMENT '服务名称',
    instance_id VARCHAR(128) DEFAULT NULL COMMENT '实例ID',
    host VARCHAR(128) DEFAULT NULL COMMENT '主机',
    cpu_usage DECIMAL(6,2) DEFAULT NULL COMMENT 'CPU使用率',
    memory_usage DECIMAL(6,2) DEFAULT NULL COMMENT '内存使用率',
    disk_usage DECIMAL(6,2) DEFAULT NULL COMMENT '磁盘使用率',
    load_average DECIMAL(10,2) DEFAULT NULL COMMENT '系统负载',
    thread_count INT DEFAULT NULL COMMENT '线程数',
    uptime_seconds BIGINT DEFAULT NULL COMMENT '运行秒数',
    status VARCHAR(32) NOT NULL DEFAULT 'UP' COMMENT '状态',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    recorded_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    last_modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_modified_by VARCHAR(64) DEFAULT NULL COMMENT '更新人',
    PRIMARY KEY (id),
    KEY idx_sys_runtime_log_recorded_time (recorded_time),
    KEY idx_sys_runtime_log_service_host (service_name, host),
    KEY idx_sys_runtime_log_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运行日志表';
```

### 保留策略表

保留策略独立成表，便于未来加定时任务自动清理：

```sql
CREATE TABLE IF NOT EXISTS sys_log_retention (
    id BIGINT NOT NULL COMMENT '主键',
    log_type VARCHAR(32) NOT NULL COMMENT '日志类型(operation/system/runtime)',
    retention_days INT NOT NULL DEFAULT 180 COMMENT '保留天数',
    enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    last_modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_modified_by VARCHAR(64) DEFAULT NULL COMMENT '更新人',
    PRIMARY KEY (id),
    UNIQUE KEY uk_sys_log_retention_type (log_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日志保留策略表';
```

默认策略：

```sql
INSERT INTO sys_log_retention (id, log_type, retention_days, enabled, remark, created_by, last_modified_by) VALUES
    (1, 'operation', 180, 1, '操作日志默认保留 180 天', 'system', 'system'),
    (2, 'system', 365, 1, '系统日志默认保留 365 天', 'system', 'system'),
    (3, 'runtime', 30, 1, '运行日志默认保留 30 天', 'system', 'system')
ON DUPLICATE KEY UPDATE
    retention_days = VALUES(retention_days),
    enabled = VALUES(enabled),
    remark = VALUES(remark),
    last_modified_by = VALUES(last_modified_by);
```

## 后端实现

后端代码分布：

```text
yin-system/src/main/java/com/yinyang/yin/system/entity
yin-system/src/main/java/com/yinyang/yin/system/dto
yin-system/src/main/java/com/yinyang/yin/system/query
yin-system/src/main/java/com/yinyang/yin/system/mapper
yin-system/src/main/java/com/yinyang/yin/system/service
yin-admin/src/main/java/com/yinyang/yin/system/controller
```

### 实体

日志实体继承项目已有的 `BaseEntity`，复用审计字段和雪花 ID：

```java
@Getter
@Setter
@TableName("sys_operation_log")
public class SysOperationLog extends BaseEntity {
    private String traceId;
    private Long userId;
    private String username;
    private String module;
    private String businessType;
    private String operationType;
    private String requestMethod;
    private String requestUri;
    private String requestParams;
    private Integer responseStatus;
    private String errorMessage;
    private String clientIp;
    private String userAgent;
    private Long durationMs;
    private Instant operationTime;
}
```

其他三类实体分别为：

```text
SysSystemLog
SysRuntimeLog
SysLogRetention
```

### Query

每类日志单独建 Query，避免一个大查询对象到处塞空字段：

```java
@Data
public class SysOperationLogQuery {
    private String traceId;
    private String username;
    private String module;
    private String businessType;
    private String operationType;
    private String requestMethod;
    private String requestUri;
    private Integer responseStatus;
    private String clientIp;
    private LocalDate[] operationTime;
}
```

日期范围统一用 `LocalDate[]`，服务层转换为 UTC 起止时间：

```java
wrapper.ge(SysOperationLog::getOperationTime, DateTimeUtils.startOfDayUtc(query.getOperationTime()[0]));
wrapper.le(SysOperationLog::getOperationTime, DateTimeUtils.endOfDayUtc(query.getOperationTime()[1]));
```

### Mapper

日志 Mapper 直接继承 `BaseMapper`：

```java
@Mapper
public interface SysOperationLogMapper extends BaseMapper<SysOperationLog> {
}
```

目前没有复杂 SQL，不需要 XML。后续如果做归档、批量导出或分区表清理，可以再补 XML。

### Service

操作日志服务提供分页、列表、详情、创建、删除和按时间清理：

```java
@Transactional(readOnly = true)
public IPage<SysOperationLogDTO> page(IPage<SysOperationLog> page, SysOperationLogQuery query) {
    IPage<SysOperationLog> entityPage = sysOperationLogMapper.selectPage(page, createQueryWrapper(query));
    return PageConverter.convert(entityPage, this::toDTOList);
}

@Transactional(rollbackFor = Exception.class)
public int deleteBefore(Instant cutoff) {
    return sysOperationLogMapper.delete(
            new LambdaQueryWrapper<SysOperationLog>().lt(SysOperationLog::getOperationTime, cutoff)
    );
}
```

系统日志和运行日志也提供相同能力，只是排序字段不同：

```text
操作日志：operation_time
系统日志：occurred_time
运行日志：recorded_time
```

### 运行状态采集

运行日志支持手动采集快照：

```java
@Transactional(rollbackFor = Exception.class)
public SysRuntimeLogDTO captureSnapshot() {
    SysRuntimeLog entity = new SysRuntimeLog();
    entity.setServiceName(serviceName);
    entity.setInstanceId(System.getProperty("PID", ManagementFactory.getRuntimeMXBean().getName()));
    entity.setHost(resolveHost());
    entity.setCpuUsage(cpuUsage());
    entity.setMemoryUsage(memoryUsage());
    entity.setDiskUsage(diskUsage());
    entity.setLoadAverage(scale(ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage()));
    entity.setThreadCount(ManagementFactory.getThreadMXBean().getThreadCount());
    entity.setUptimeSeconds(ManagementFactory.getRuntimeMXBean().getUptime() / 1000);
    entity.setStatus("UP");
    entity.setRecordedTime(Instant.now());
    sysRuntimeLogMapper.insert(entity);
    return toDTO(entity);
}
```

CPU 使用率通过 JDK 的 `com.sun.management.OperatingSystemMXBean` 读取：

```java
private BigDecimal cpuUsage() {
    OperatingSystemMXBean bean = ManagementFactory.getOperatingSystemMXBean();
    if (bean instanceof com.sun.management.OperatingSystemMXBean systemBean) {
        return percent(systemBean.getProcessCpuLoad());
    }
    return null;
}
```

### 保留策略与清理

保留策略服务会根据 `logType` 找到策略，计算截止时间，再调用对应日志服务删除过期数据：

```java
@Transactional(rollbackFor = Exception.class)
public SysLogCleanupResultDTO clean(String logType) {
    SysLogRetention retention = sysLogRetentionMapper.selectOne(
            new LambdaQueryWrapper<SysLogRetention>().eq(SysLogRetention::getLogType, logType)
    );
    Assert.notNull(retention, "日志保留策略不存在");
    Assert.isTrue(Boolean.TRUE.equals(retention.getEnabled()), "日志保留策略未启用");

    Instant cutoff = Instant.now().minus(retention.getRetentionDays(), ChronoUnit.DAYS);
    int deletedRows = switch (logType) {
        case "operation" -> sysOperationLogService.deleteBefore(cutoff);
        case "system" -> sysSystemLogService.deleteBefore(cutoff);
        case "runtime" -> sysRuntimeLogService.deleteBefore(cutoff);
        default -> throw new IllegalArgumentException("不支持的日志类型: " + logType);
    };
    return new SysLogCleanupResultDTO(logType, retention.getRetentionDays(), deletedRows);
}
```

### Controller

接口统一挂在 `/system/logs` 下：

```text
GET    /system/logs/operation/page
POST   /system/logs/operation
DELETE /system/logs/operation/{ids}

GET    /system/logs/system/page
POST   /system/logs/system
DELETE /system/logs/system/{ids}

GET    /system/logs/runtime/page
POST   /system/logs/runtime
POST   /system/logs/runtime/snapshot
DELETE /system/logs/runtime/{ids}

GET    /system/logs/retention/page
POST   /system/logs/retention
PUT    /system/logs/retention
POST   /system/logs/retention/clean/{logType}
DELETE /system/logs/retention/{ids}
```

权限统一使用：

```text
sys:log:query    查询
sys:log:create   创建/采集
sys:log:delete   删除日志
sys:log:clean    清理日志
sys:log:config   配置保留策略
```

示例：

```java
@PostMapping("/snapshot")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:log:create')")
public ResponseEntity<SysRuntimeLogDTO> snapshot() {
    return ResponseEntity.ok(sysRuntimeLogService.captureSnapshot());
}
```

### 现有功能操作自动记录

为了让已有功能操作不需要逐个手写 `sysOperationLogService.create(...)`，本次在 `yin-admin` 中新增了：

```text
com.yinyang.yin.handle.OperationLog
com.yinyang.yin.handle.OperationLogAspect
```

切面拦截所有 controller 方法：

```java
@Around("within(com.yinyang.yin..controller..*)")
public Object recordOperation(ProceedingJoinPoint joinPoint) throws Throwable {
    ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
    if (attributes == null) {
        return joinPoint.proceed();
    }

    HttpServletRequest request = attributes.getRequest();
    if (!shouldLog(joinPoint, request)) {
        return joinPoint.proceed();
    }

    long start = System.currentTimeMillis();
    Object result = null;
    Throwable error = null;
    try {
        result = joinPoint.proceed();
        return result;
    } catch (Throwable ex) {
        error = ex;
        throw ex;
    } finally {
        writeLog(joinPoint, request, attributes.getResponse(), result, error, System.currentTimeMillis() - start);
    }
}
```

默认记录范围：

```text
所有非 GET 接口
GET /export 导出接口
POST /auth/login 登录接口
```

默认跳过：

```text
/system/logs/operation
```

这样可以避免操作日志写入接口本身触发重复记录。其他日志管理操作，例如清理运行日志、修改保留策略，仍然会被记录。

切面会自动写入：

```text
traceId
当前用户ID和用户名
模块
业务说明
操作类型
HTTP 方法
请求地址
请求参数
响应状态
错误信息
客户端 IP
User-Agent
耗时
操作时间
```

操作类型根据请求自动推断：

```java
if (uri.contains("/login")) {
    return "LOGIN";
}
if (uri.endsWith("/snapshot")) {
    return "SNAPSHOT";
}
if (uri.contains("/clean/")) {
    return "CLEAN";
}
if (uri.endsWith("/export") || name.contains("export")) {
    return "EXPORT";
}
if (uri.contains("/import") || name.contains("import")) {
    return "IMPORT";
}
return switch (request.getMethod().toUpperCase()) {
    case "POST" -> "CREATE";
    case "PUT", "PATCH" -> "UPDATE";
    case "DELETE" -> "DELETE";
    default -> request.getMethod().toUpperCase();
};
```

敏感参数会被处理：

```java
private Object sanitizeValue(Object value) {
    if (value instanceof LoginRequest request) {
        Map<String, Object> sanitized = new LinkedHashMap<>();
        sanitized.put("username", request.getUsername());
        sanitized.put("password", "******");
        return sanitized;
    }
    return value;
}
```

如果某个接口需要显式覆盖模块、业务类型或操作类型，可以加注解：

```java
@OperationLog(module = "system/user", businessType = "创建用户", operationType = "CREATE_USER")
@PostMapping
public ResponseEntity<UserDTO> create(@RequestBody UserDTO dto) {
    return ResponseEntity.ok(userService.create(dto));
}
```

### 全局异常写入系统日志

全局异常处理器位于 `yin-common`，不能直接依赖 `yin-system`，否则会产生模块反向依赖。因此异常日志采用 Spring 事件解耦：

```text
yin-common  发布 SystemExceptionLogEvent
yin-admin   监听事件并调用 SysSystemLogService 写入系统日志
```

公共模块新增事件：

```java
public class SystemExceptionLogEvent extends ApplicationEvent {
    private final Throwable throwable;
    private final int statusCode;
    private final String requestMethod;
    private final String requestUri;
    private final String clientIp;
    private final String userAgent;
    private final String traceId;
    private final Instant occurredTime;
}
```

`GlobalExceptionHandler` 在所有异常处理分支里发布事件：

```java
@ExceptionHandler(Exception.class)
public ResponseEntity<Result<Void>> handleException(Exception e, HttpServletRequest request) {
    log.error("Unhandled exception", e);
    publishExceptionEvent(e, HttpStatus.INTERNAL_SERVER_ERROR.value(), request);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Result.fail(i18n.get("error.internal-server-error")));
}
```

admin 模块新增监听器：

```java
@EventListener
public void onSystemException(SystemExceptionLogEvent event) {
    Throwable throwable = event.getThrowable();
    SysSystemLogDTO dto = new SysSystemLogDTO();
    dto.setLevel(event.getStatusCode() >= 500 ? "ERROR" : "WARN");
    dto.setSource(event.getRequestMethod() + " " + event.getRequestUri());
    dto.setEventType(throwable.getClass().getName());
    dto.setStatus(String.valueOf(event.getStatusCode()));
    dto.setMessage(message(throwable));
    dto.setDetail(detail(event));
    dto.setTraceId(event.getTraceId());
    dto.setHost(resolveHost());
    dto.setOccurredTime(event.getOccurredTime());
    sysSystemLogService.create(dto);
}
```

`detail` 字段会写入请求上下文和异常堆栈：

```text
method
uri
clientIp
userAgent
traceId
stack trace
```

前端系统日志 tab 增加“详情”操作，通过弹窗展示 `detail` 字段。这样接口异常发生后，可以直接在“日志管理 -> 系统日志 -> 详情”中查看异常堆栈。

## 前端实现

前端代码分布：

```text
yang/src/types/system/log.d.ts
yang/src/api/system/log.ts
yang/src/views/system/log/index.vue
yang/src/i18n/zh.ts
yang/src/i18n/en.ts
yang/src/utils/menuScanner.ts
```

### API

API 按日志类型拆分：

```ts
const BASE_URL = "/system/logs";

export function getOperationLogPage(params: Record<string, any>) {
  return request.get<PageResult<SysOperationLogDTO>>(`${BASE_URL}/operation/page`, { params });
}

export function captureRuntimeSnapshot() {
  return request.post<SysRuntimeLogDTO>(`${BASE_URL}/runtime/snapshot`);
}

export function cleanLogs(logType: string) {
  return request.post<SysLogCleanupResultDTO>(`${BASE_URL}/retention/clean/${logType}`);
}
```

### 页面结构

日志管理页面采用一个入口、多 tab 的结构：

```vue
<el-tabs v-model="activeTab" class="log-tabs" @tab-change="handleTabChange">
  <el-tab-pane :label="t(`${i18nKey}.operation.title`)" name="operation">
    <!-- 操作日志查询和表格 -->
  </el-tab-pane>
  <el-tab-pane :label="t(`${i18nKey}.system.title`)" name="system">
    <!-- 系统日志查询和表格 -->
  </el-tab-pane>
  <el-tab-pane :label="t(`${i18nKey}.runtime.title`)" name="runtime">
    <!-- 运行日志查询、采集快照和表格 -->
  </el-tab-pane>
  <el-tab-pane :label="t(`${i18nKey}.retention.title`)" name="retention">
    <!-- 保留策略管理 -->
  </el-tab-pane>
</el-tabs>
```

运行日志页面提供“采集快照”按钮：

```ts
async function snapshotRuntime() {
  await captureRuntimeSnapshot();
  ElMessage.success(t(`${i18nKey}.runtime.snapshotSuccess`));
  await loadRuntime();
}
```

保留策略页面提供编辑和清理：

```ts
function cleanRetention(row: SysLogRetentionDTO) {
  ElMessageBox.confirm(t(`${i18nKey}.retention.cleanConfirm`), t("common.prompt")).then(async () => {
    const res = await cleanLogs(row.logType);
    ElMessage.success(t(`${i18nKey}.retention.cleanSuccess`, { count: res.deletedRows }));
    await loadRetention();
  });
}
```

## 菜单与权限

初始化脚本新增菜单：

```sql
(1600, 1000, '日志管理', 'log', 'system/log/index', 'sys:log:query', 2, 60, NULL, 1, 1, 0, 0, 'system', 'system'),
(1601, 1600, '日志查询', '', NULL, 'sys:log:query', 3, 10, NULL, 1, 1, 0, 0, 'system', 'system'),
(1602, 1600, '日志创建', '', NULL, 'sys:log:create', 3, 20, NULL, 1, 1, 0, 0, 'system', 'system'),
(1603, 1600, '日志删除', '', NULL, 'sys:log:delete', 3, 30, NULL, 1, 1, 0, 0, 'system', 'system'),
(1604, 1600, '日志清理', '', NULL, 'sys:log:clean', 3, 40, NULL, 1, 1, 0, 0, 'system', 'system'),
(1605, 1600, '日志策略配置', '', NULL, 'sys:log:config', 3, 50, NULL, 1, 1, 0, 0, 'system', 'system')
```

前端菜单扫描也补了别名：

```ts
"system/log": { path: "log", permissionPrefix: "sys:log" }
```

## 后续扩展

当前版本已经具备日志管理闭环，并已通过 AOP 自动记录现有业务操作、通过全局异常处理器记录系统异常。生产级系统通常还会继续补定时清理任务：

   基于 `@Scheduled` 每天执行一次 `SysLogRetentionService.clean(logType)`，将手动清理升级为自动清理。

示例定时任务：

```java
@Component
@RequiredArgsConstructor
public class SysLogCleanupJob {

    private final SysLogRetentionService sysLogRetentionService;

    @Scheduled(cron = "0 30 2 * * ?")
    public void clean() {
        sysLogRetentionService.clean("operation");
        sysLogRetentionService.clean("system");
        sysLogRetentionService.clean("runtime");
    }
}
```

## 验证

本次实现完成后执行：

```bash
cd D:\WorkSpace\yin-yang\yang
pnpm run build

cd D:\WorkSpace\yin-yang\yin
mvn -pl yin-admin -am compile
```

前端构建和后端编译都通过，说明新增页面、类型、接口、实体、服务和 controller 已经能被现有工程正常识别。

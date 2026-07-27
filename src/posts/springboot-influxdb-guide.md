---
title: Spring Boot 使用 InfluxDB：设备时序数据写入、趋势查询与聚合统计
date: 2026-07-28
category: Java
tag:
  - Spring Boot
  - InfluxDB
  - 时序数据库
  - Flux
  - IoT
isOriginal: true
excerpt: 基于设备遥测数据场景，系统梳理 Spring Boot 接入 InfluxDB 的配置、写入、元数据查询、趋势曲线查询、Tag 级联筛选，以及按时间段求和、窗口聚合、多设备聚合等常用统计方法。
---

# Spring Boot 使用 InfluxDB：设备时序数据写入、趋势查询与聚合统计

InfluxDB 适合存储设备遥测、监控指标、能源功率、传感器读数这类时序数据。它的核心模型是：

- `bucket`：数据桶，可以理解为数据库或保留策略容器。
- `measurement`：指标类别，类似关系型数据库中的表。
- `tag`：索引字段，适合放设备 ID、网关 ID、设备类型等用于过滤和分组的低基数字段。
- `field`：真实数值字段，适合放功率、电压、电流、SOC、温度等随时间变化的数据。
- `_time`：数据时间。

本文用一个设备上报场景作为例子：网关周期性上报多个设备的属性值，后端写入 InfluxDB，前端再按 `DeviceType`、`Field`、`Tag` 和时间区间查询趋势曲线，并支持多个曲线对比。

## Maven 依赖

Spring Boot 项目中引入 InfluxDB Java Client：

```xml
<dependency>
    <groupId>com.influxdb</groupId>
    <artifactId>influxdb-client-java</artifactId>
    <version>7.5.0</version>
</dependency>
```

如果项目还需要提供 REST API，通常还会使用：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

## application.yaml 配置

```yaml
influx:
  url: http://localhost:8086
  token: your-token
  org: your-org
  bucket: telemetry_48h
```

生产环境中不要把 token 明文提交到仓库，建议用环境变量覆盖：

```yaml
influx:
  url: ${INFLUX_URL:http://localhost:8086}
  token: ${INFLUX_TOKEN}
  org: ${INFLUX_ORG}
  bucket: ${INFLUX_BUCKET:telemetry_48h}
```

## 配置属性类

```java
package com.example.influx;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "influx")
public class InfluxProperties {

    private String url;

    private String token;

    private String org;

    private String bucket;
}
```

## 创建 InfluxDBClient

```java
package com.example.influx;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class InfluxConfig {

    private final InfluxProperties properties;

    @Bean
    public InfluxDBClient influxDBClient() {
        return InfluxDBClientFactory.create(
                properties.getUrl(),
                properties.getToken().toCharArray(),
                properties.getOrg(),
                properties.getBucket()
        );
    }
}
```

`InfluxDBClient` 是线程安全的，作为 Spring Bean 复用即可。

## 设备数据模型设计

一个设备上报示例可以设计为：

```json
{
  "gatewayId": "GW001",
  "timestamp": 1760000000000,
  "devices": [
    {
      "deviceId": "BAT001",
      "deviceType": "BAT",
      "properties": {
        "Soc": 89,
        "Power": 1200,
        "Voltage": 512.5
      }
    }
  ]
}
```

写入 InfluxDB 后的结构：

```text
bucket      telemetry_48h
measurement bat
tags        gatewayId=GW001, deviceId=BAT001, deviceType=BAT
fields      Soc=89, Power=1200, Voltage=512.5
time        1760000000000
```

这里把 `deviceType` 映射为 measurement：

```java
private static final Map<String, String> DEVICE_TYPE_MEASUREMENT_MAP = Map.of(
        "MTR-Grid", "mtr_grid",
        "MTR-PV", "mtr_pv",
        "MTR-Hybrid", "mtr_hybrid",
        "Hybrid-Inv", "hybrid_inv",
        "PV-Inv", "pv_inv",
        "BAT", "bat"
);

private String resolveMeasurement(String deviceType) {
    return DEVICE_TYPE_MEASUREMENT_MAP.getOrDefault(deviceType, "unknown_device");
}
```

为什么这样设计：

- 不同设备类型的字段通常不同，拆成不同 measurement 更容易查询字段列表。
- `gatewayId`、`deviceId`、`deviceType` 经常用于过滤和分组，适合做 tag。
- 真实采样值放 field，适合做数值计算和聚合。

## 写入实时设备数据

```java
package com.example.influx;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class InfluxService {

    private final InfluxDBClient influxDBClient;

    private final long retentionMillis = 48L * 60 * 60 * 1000;

    public void save(PropertiesReport payload) {
        List<Point> points = new ArrayList<>();

        for (CompatibilityDevice device : payload.getDevices()) {
            long now = System.currentTimeMillis();
            if (now - payload.getTimestamp() > retentionMillis) {
                log.warn("数据时间戳过期，跳过写入: time={}, now={}", payload.getTimestamp(), now);
                return;
            }

            Point point = Point
                    .measurement(resolveMeasurement(device.getDeviceType()))
                    .addTag("gatewayId", payload.getGatewayId())
                    .addTag("deviceId", device.getDeviceId())
                    .addTag("deviceType", device.getDeviceType())
                    .time(payload.getTimestamp(), WritePrecision.MS);

            boolean hasField = false;
            for (Map.Entry<String, Object> entry : device.getProperties().entrySet()) {
                Object value = entry.getValue();
                if (value == null) {
                    continue;
                }
                addField(point, entry.getKey(), value);
                hasField = true;
            }

            if (hasField) {
                points.add(point);
            }
        }

        influxDBClient.getWriteApiBlocking().writePoints(points);
    }

    private void addField(Point point, String key, Object value) {
        if (value instanceof Number number) {
            point.addField(key, number.doubleValue());
        } else if (value instanceof Boolean bool) {
            point.addField(key, bool);
        } else {
            point.addField(key, String.valueOf(value));
        }
    }
}
```

上面包含几个关键点：

- 用 `WritePrecision.MS`，因为设备上报的 timestamp 是毫秒。
- 只要一个设备有至少一个非空 field 才写入。
- 数值统一写为 `double`，方便后续趋势和聚合查询。
- 字符串 field 也可以写入，但趋势图和聚合统计通常只处理数值字段。

## DTO 设计

趋势查询可以抽象成几组 DTO：

```java
import lombok.Data;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class DeviceTrendDTO {

    @Data
    public static class Query {
        private String measurement;
        private String field;
        private Instant startTime;
        private Instant endTime;
        private List<SeriesQuery> series = new ArrayList<>();
    }

    @Data
    public static class SeriesQuery {
        private String name;
        private List<TagFilter> tags = new ArrayList<>();
    }

    @Data
    public static class TagFilter {
        private String key;
        private String value;
    }

    @Data
    public static class Series {
        private String name;
        private List<TagFilter> tags = new ArrayList<>();
        private List<Point> points = new ArrayList<>();
    }

    @Data
    public static class Point {
        private Instant time;
        private Double value;
    }

    @Data
    public static class TagValues {
        private String tagKey;
        private List<String> values = new ArrayList<>();
    }

    @Data
    public static class TagValuesQuery {
        private String measurement;
        private String tagKey;
        private List<TagFilter> filters = new ArrayList<>();
    }

    @Data
    public static class Metadata {
        private List<String> measurements = new ArrayList<>();
        private Map<String, String> deviceTypes;
    }
}
```

`series` 的含义是“一条曲线的过滤条件”。例如前端有两个 Sub 框：

```json
[
  {
    "name": "gatewayId=GW001, deviceId=BAT001",
    "tags": [
      { "key": "gatewayId", "value": "GW001" },
      { "key": "deviceId", "value": "BAT001" }
    ]
  },
  {
    "name": "gatewayId=GW001, deviceId=BAT002",
    "tags": [
      { "key": "gatewayId", "value": "GW001" },
      { "key": "deviceId", "value": "BAT002" }
    ]
  }
]
```

后端就会返回两条曲线，前端用 ECharts 叠加展示。

## 查询 measurement 列表

前端需要先知道有哪些 `DeviceType` 可以选。InfluxDB 可以通过 `schema.measurements` 查询。

```java
public DeviceTrendDTO.Metadata getTrendMetadata() {
    DeviceTrendDTO.Metadata metadata = new DeviceTrendDTO.Metadata();
    metadata.setMeasurements(querySingleColumn("""
            import "influxdata/influxdb/schema"
            schema.measurements(bucket: "%s")
            """.formatted(escapeFluxString(properties.getBucket()))));

    Map<String, String> reverseMap = new LinkedHashMap<>();
    DEVICE_TYPE_MEASUREMENT_MAP.forEach((deviceType, measurement) -> reverseMap.put(measurement, deviceType));
    metadata.setDeviceTypes(reverseMap);
    return metadata;
}
```

这里返回两个信息：

- `measurements`：InfluxDB 中真实存在的 measurement。
- `deviceTypes`：measurement 到业务设备类型的映射，例如 `bat -> BAT`。

## 查询 Field 列表

选择了 measurement 后，查询它有哪些 field：

```java
public List<String> queryFieldKeys(String measurement) {
    requireText(measurement, "measurement");
    return querySingleColumn("""
            import "influxdata/influxdb/schema"
            schema.fieldKeys(
              bucket: "%s",
              predicate: (r) => r._measurement == "%s"
            )
            """.formatted(
            escapeFluxString(properties.getBucket()),
            escapeFluxString(measurement)
    ));
}
```

这一步可以让前端的 Field 下拉框完全动态化，不需要硬编码 `Soc`、`Power`、`Voltage`。

## 查询 Tag Key 列表

```java
public List<String> queryTagKeys(String measurement) {
    requireText(measurement, "measurement");
    return querySingleColumn("""
            import "influxdata/influxdb/schema"
            schema.tagKeys(
              bucket: "%s",
              predicate: (r) => r._measurement == "%s"
            )
            """.formatted(
            escapeFluxString(properties.getBucket()),
            escapeFluxString(measurement)
    ))
            .stream()
            .filter(value -> !value.startsWith("_"))
            .toList();
}
```

Tag 一般会返回：

```text
gatewayId
deviceId
deviceType
```

也可以继续扩展，比如 `siteId`、`tenantId`、`model`、`region` 等。

## 查询 Tag Value 列表

最简单的写法是只按 measurement 查询某个 tag 的所有值：

```java
public DeviceTrendDTO.TagValues queryTagValues(String measurement, String tagKey) {
    requireText(measurement, "measurement");
    requireText(tagKey, "tagKey");
    return queryTagValues(measurement, tagKey, List.of());
}
```

级联筛选时需要带上已经选择的 tag 条件。例如已经选择 `gatewayId=GW001`，再查 `deviceId` 时，只返回这个网关下面的设备 ID：

```java
public DeviceTrendDTO.TagValues queryTagValues(DeviceTrendDTO.TagValuesQuery query) {
    if (query == null) {
        throw new IllegalArgumentException("query不能为空");
    }
    return queryTagValues(
            query.getMeasurement(),
            query.getTagKey(),
            normalizeTagFilters(query.getFilters())
    );
}

private DeviceTrendDTO.TagValues queryTagValues(
        String measurement,
        String tagKey,
        List<DeviceTrendDTO.TagFilter> filters
) {
    requireText(measurement, "measurement");
    requireText(tagKey, "tagKey");

    DeviceTrendDTO.TagValues dto = new DeviceTrendDTO.TagValues();
    dto.setTagKey(tagKey);
    dto.setValues(querySingleColumn("""
            import "influxdata/influxdb/schema"
            schema.tagValues(
              bucket: "%s",
              tag: "%s",
              predicate: (r) => %s
            )
            """.formatted(
            escapeFluxString(properties.getBucket()),
            escapeFluxString(tagKey),
            buildTagPredicate(measurement, filters)
    )));
    return dto;
}

private String buildTagPredicate(String measurement, List<DeviceTrendDTO.TagFilter> filters) {
    StringBuilder predicate = new StringBuilder();
    predicate.append("r._measurement == \"")
            .append(escapeFluxString(measurement))
            .append("\"");

    for (DeviceTrendDTO.TagFilter filter : filters) {
        predicate.append(" and r[\"")
                .append(escapeFluxString(filter.getKey()))
                .append("\"] == \"")
                .append(escapeFluxString(filter.getValue()))
                .append("\"");
    }

    return predicate.toString();
}
```

这就是前端 Sub 框精细筛选的基础：一个 Sub 框中依次选择所有 Tag，后一个 Tag 的候选值由前面 Tag 的选择结果决定。

## 查询趋势曲线

趋势查询的核心是：

- 固定 `measurement`。
- 固定 `field`。
- 固定时间区间。
- 每条曲线使用自己的 tag 条件。

```java
public List<DeviceTrendDTO.Series> queryTrend(DeviceTrendDTO.Query query) {
    validateTrendQuery(query);

    if (CollectionUtils.isEmpty(query.getSeries())) {
        return queryGroupedTrend(query);
    }

    List<DeviceTrendDTO.Series> result = new ArrayList<>();
    for (DeviceTrendDTO.SeriesQuery seriesQuery : query.getSeries()) {
        result.add(queryTrendSeries(query, seriesQuery));
    }
    return result;
}
```

当没有传 `series` 时，可以按 InfluxDB 记录中的 tag 自动分组：

```java
private List<DeviceTrendDTO.Series> queryGroupedTrend(DeviceTrendDTO.Query query) {
    String flux = buildTrendFlux(query, List.of());
    Map<String, DeviceTrendDTO.Series> seriesMap = new LinkedHashMap<>();

    for (FluxRecord record : queryRecords(flux)) {
        Double value = toDouble(record.getValue());
        if (value == null || record.getTime() == null) {
            continue;
        }

        List<DeviceTrendDTO.TagFilter> tags = extractSeriesTags(record);
        String name = resolveSeriesName(null, query.getMeasurement(), query.getField(), tags);
        DeviceTrendDTO.Series series = seriesMap.computeIfAbsent(name, key -> {
            DeviceTrendDTO.Series item = new DeviceTrendDTO.Series();
            item.setName(key);
            item.setTags(tags);
            return item;
        });
        series.getPoints().add(buildPoint(record.getTime(), value));
    }

    return seriesMap.values()
            .stream()
            .peek(series -> series.getPoints().sort(Comparator.comparing(DeviceTrendDTO.Point::getTime)))
            .toList();
}
```

指定 tag 条件时，每个 `SeriesQuery` 对应一条曲线：

```java
private DeviceTrendDTO.Series queryTrendSeries(
        DeviceTrendDTO.Query query,
        DeviceTrendDTO.SeriesQuery seriesQuery
) {
    List<DeviceTrendDTO.TagFilter> tagFilters = normalizeTagFilters(seriesQuery.getTags());
    String flux = buildTrendFlux(query, tagFilters);

    DeviceTrendDTO.Series series = new DeviceTrendDTO.Series();
    series.setTags(tagFilters);
    series.setName(resolveSeriesName(seriesQuery.getName(), query.getMeasurement(), query.getField(), tagFilters));
    series.setPoints(queryPoints(flux));
    return series;
}
```

生成 Flux：

```java
private String buildTrendFlux(DeviceTrendDTO.Query query, List<DeviceTrendDTO.TagFilter> tagFilters) {
    StringBuilder flux = new StringBuilder();
    flux.append("""
            from(bucket: "%s")
              |> range(start: time(v: "%s"), stop: time(v: "%s"))
              |> filter(fn: (r) => r._measurement == "%s")
              |> filter(fn: (r) => r._field == "%s")
            """.formatted(
            escapeFluxString(properties.getBucket()),
            query.getStartTime(),
            query.getEndTime(),
            escapeFluxString(query.getMeasurement()),
            escapeFluxString(query.getField())
    ));

    for (DeviceTrendDTO.TagFilter tag : tagFilters) {
        flux.append("  |> filter(fn: (r) => r[\"")
                .append(escapeFluxString(tag.getKey()))
                .append("\"] == \"")
                .append(escapeFluxString(tag.getValue()))
                .append("\")\n");
    }

    flux.append("""
              |> keep(columns: ["_time", "_value", "gatewayId", "deviceId", "deviceType"])
              |> sort(columns: ["_time"])
            """);
    return flux.toString();
}
```

执行查询并转为点：

```java
private List<DeviceTrendDTO.Point> queryPoints(String flux) {
    return queryRecords(flux)
            .stream()
            .map(record -> {
                Double value = toDouble(record.getValue());
                if (value == null || record.getTime() == null) {
                    return null;
                }
                return buildPoint(record.getTime(), value);
            })
            .filter(point -> point != null)
            .sorted(Comparator.comparing(DeviceTrendDTO.Point::getTime))
            .toList();
}

private List<FluxRecord> queryRecords(String flux) {
    return influxDBClient
            .getQueryApi()
            .query(flux)
            .stream()
            .flatMap(table -> table.getRecords().stream())
            .toList();
}
```

## 通用辅助方法

字符串转义很重要，不要把用户输入直接拼到 Flux 里：

```java
private String escapeFluxString(String value) {
    return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
}
```

把结果转成数字：

```java
private Double toDouble(Object value) {
    if (value instanceof Number number) {
        return number.doubleValue();
    }
    if (value instanceof Boolean bool) {
        return bool ? 1D : 0D;
    }
    if (value instanceof String text) {
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
    return null;
}
```

读取 `_value` 列：

```java
private List<String> querySingleColumn(String flux) {
    Set<String> values = new LinkedHashSet<>();
    for (FluxRecord record : queryRecords(flux)) {
        Object value = record.getValueByKey("_value");
        if (value != null && StringUtils.hasText(String.valueOf(value))) {
            values.add(String.valueOf(value));
        }
    }
    return values.stream().sorted().toList();
}
```

校验参数：

```java
private void validateTrendQuery(DeviceTrendDTO.Query query) {
    if (query == null) {
        throw new IllegalArgumentException("query不能为空");
    }
    requireText(query.getMeasurement(), "measurement");
    requireText(query.getField(), "field");
    if (query.getStartTime() == null || query.getEndTime() == null) {
        throw new IllegalArgumentException("startTime和endTime不能为空");
    }
    if (!query.getStartTime().isBefore(query.getEndTime())) {
        throw new IllegalArgumentException("startTime必须早于endTime");
    }
}

private void requireText(String value, String field) {
    if (!StringUtils.hasText(value)) {
        throw new IllegalArgumentException(field + "不能为空");
    }
}
```

## Controller 接口

```java
package com.example.device;

import com.example.influx.InfluxService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/device-info/trend")
@RequiredArgsConstructor
public class DeviceTrendController {

    private final InfluxService influxService;

    @GetMapping("/metadata")
    public Result<DeviceTrendDTO.Metadata> metadata() {
        return Result.ok(influxService.getTrendMetadata());
    }

    @GetMapping("/fields")
    public Result<List<String>> fields(@RequestParam String measurement) {
        return Result.ok(influxService.queryFieldKeys(measurement));
    }

    @GetMapping("/tag-keys")
    public Result<List<String>> tagKeys(@RequestParam String measurement) {
        return Result.ok(influxService.queryTagKeys(measurement));
    }

    @PostMapping("/tag-values")
    public Result<DeviceTrendDTO.TagValues> tagValues(@RequestBody DeviceTrendDTO.TagValuesQuery query) {
        return Result.ok(influxService.queryTagValues(query));
    }

    @PostMapping("/query")
    public Result<List<DeviceTrendDTO.Series>> query(@RequestBody DeviceTrendDTO.Query query) {
        return Result.ok(influxService.queryTrend(query));
    }
}
```

前端调用顺序通常是：

```text
打开弹窗
-> GET /metadata
-> 用户选择 measurement
-> GET /fields?measurement=bat
-> GET /tag-keys?measurement=bat
-> 每个 Sub 内依次 POST /tag-values
-> POST /query 查询多条曲线
```

## 聚合查询：某个时段的总和

如果要查询某个时间段内某个设备的 `Power` 总和：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T01:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => r._field == "Power")
  |> filter(fn: (r) => r.gatewayId == "GW001")
  |> filter(fn: (r) => r.deviceId == "BAT001")
  |> sum()
```

Java 方法：

```java
public Double sumField(
        String measurement,
        String field,
        Instant startTime,
        Instant endTime,
        List<DeviceTrendDTO.TagFilter> tags
) {
    String flux = buildAggregateFlux(measurement, field, startTime, endTime, tags, "sum");
    return queryRecords(flux)
            .stream()
            .map(record -> toDouble(record.getValue()))
            .filter(value -> value != null)
            .findFirst()
            .orElse(0D);
}
```

通用聚合 Flux 构造：

```java
private String buildAggregateFlux(
        String measurement,
        String field,
        Instant startTime,
        Instant endTime,
        List<DeviceTrendDTO.TagFilter> tags,
        String aggregateFunction
) {
    StringBuilder flux = new StringBuilder();
    flux.append("""
            from(bucket: "%s")
              |> range(start: time(v: "%s"), stop: time(v: "%s"))
              |> filter(fn: (r) => r._measurement == "%s")
              |> filter(fn: (r) => r._field == "%s")
            """.formatted(
            escapeFluxString(properties.getBucket()),
            startTime,
            endTime,
            escapeFluxString(measurement),
            escapeFluxString(field)
    ));

    for (DeviceTrendDTO.TagFilter tag : normalizeTagFilters(tags)) {
        flux.append("  |> filter(fn: (r) => r[\"")
                .append(escapeFluxString(tag.getKey()))
                .append("\"] == \"")
                .append(escapeFluxString(tag.getValue()))
                .append("\")\n");
    }

    flux.append("  |> ").append(aggregateFunction).append("()\n");
    return flux.toString();
}
```

常见聚合函数：

```text
sum()
mean()
min()
max()
count()
first()
last()
median()
```

对应 Java 方法可以封装成一个通用入口：

```java
public Double aggregateField(
        String measurement,
        String field,
        Instant startTime,
        Instant endTime,
        List<DeviceTrendDTO.TagFilter> tags,
        String function
) {
    Set<String> supported = Set.of("sum", "mean", "min", "max", "count", "first", "last", "median");
    if (!supported.contains(function)) {
        throw new IllegalArgumentException("不支持的聚合函数: " + function);
    }

    String flux = buildAggregateFlux(measurement, field, startTime, endTime, tags, function);
    return queryRecords(flux)
            .stream()
            .map(record -> toDouble(record.getValue()))
            .filter(value -> value != null)
            .findFirst()
            .orElse(null);
}
```

## 聚合查询：按时间窗口求和

趋势图通常不应该直接画所有点，而是按窗口聚合。例如每 5 分钟求一次总和：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T06:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => r._field == "Power")
  |> filter(fn: (r) => r.gatewayId == "GW001")
  |> aggregateWindow(every: 5m, fn: sum, createEmpty: false)
  |> yield(name: "sum")
```

Java 方法：

```java
public List<DeviceTrendDTO.Point> aggregateWindow(
        String measurement,
        String field,
        Instant startTime,
        Instant endTime,
        List<DeviceTrendDTO.TagFilter> tags,
        String every,
        String function
) {
    Set<String> supported = Set.of("sum", "mean", "min", "max", "count", "first", "last");
    if (!supported.contains(function)) {
        throw new IllegalArgumentException("不支持的窗口聚合函数: " + function);
    }

    StringBuilder flux = new StringBuilder();
    flux.append("""
            from(bucket: "%s")
              |> range(start: time(v: "%s"), stop: time(v: "%s"))
              |> filter(fn: (r) => r._measurement == "%s")
              |> filter(fn: (r) => r._field == "%s")
            """.formatted(
            escapeFluxString(properties.getBucket()),
            startTime,
            endTime,
            escapeFluxString(measurement),
            escapeFluxString(field)
    ));

    for (DeviceTrendDTO.TagFilter tag : normalizeTagFilters(tags)) {
        flux.append("  |> filter(fn: (r) => r[\"")
                .append(escapeFluxString(tag.getKey()))
                .append("\"] == \"")
                .append(escapeFluxString(tag.getValue()))
                .append("\")\n");
    }

    flux.append("  |> aggregateWindow(every: ")
            .append(every)
            .append(", fn: ")
            .append(function)
            .append(", createEmpty: false)\n")
            .append("  |> sort(columns: [\"_time\"])\n");

    return queryPoints(flux.toString());
}
```

`every` 可以是：

```text
30s
1m
5m
15m
1h
1d
```

注意不要把用户输入的任意字符串直接拼到 `every` 里，生产代码应使用白名单校验。

## 聚合查询：多个设备某时段总和

例如要查一个网关下多个电池在某个时段的 `Power` 总和：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T01:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => r._field == "Power")
  |> filter(fn: (r) => r.gatewayId == "GW001")
  |> filter(fn: (r) => contains(value: r.deviceId, set: ["BAT001", "BAT002", "BAT003"]))
  |> group()
  |> sum()
```

关键是 `group()`。如果不调用 `group()`，InfluxDB 可能会按原 tag 分组分别求和；调用 `group()` 后会合并成一组再求总和。

Java 写法：

```java
public Double sumFieldForDevices(
        String measurement,
        String field,
        Instant startTime,
        Instant endTime,
        String gatewayId,
        List<String> deviceIds
) {
    if (deviceIds == null || deviceIds.isEmpty()) {
        return 0D;
    }

    String deviceSet = deviceIds.stream()
            .map(value -> "\"" + escapeFluxString(value) + "\"")
            .collect(Collectors.joining(", "));

    String flux = """
            from(bucket: "%s")
              |> range(start: time(v: "%s"), stop: time(v: "%s"))
              |> filter(fn: (r) => r._measurement == "%s")
              |> filter(fn: (r) => r._field == "%s")
              |> filter(fn: (r) => r.gatewayId == "%s")
              |> filter(fn: (r) => contains(value: r.deviceId, set: [%s]))
              |> group()
              |> sum()
            """.formatted(
            escapeFluxString(properties.getBucket()),
            startTime,
            endTime,
            escapeFluxString(measurement),
            escapeFluxString(field),
            escapeFluxString(gatewayId),
            deviceSet
    );

    return queryRecords(flux)
            .stream()
            .map(record -> toDouble(record.getValue()))
            .filter(value -> value != null)
            .findFirst()
            .orElse(0D);
}
```

## 聚合查询：按设备分别求和

如果不是查总和，而是每个设备分别返回一条结果：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T01:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => r._field == "Power")
  |> filter(fn: (r) => r.gatewayId == "GW001")
  |> group(columns: ["deviceId"])
  |> sum()
```

Java 返回 Map：

```java
public Map<String, Double> sumFieldGroupByDevice(
        String measurement,
        String field,
        Instant startTime,
        Instant endTime,
        String gatewayId
) {
    String flux = """
            from(bucket: "%s")
              |> range(start: time(v: "%s"), stop: time(v: "%s"))
              |> filter(fn: (r) => r._measurement == "%s")
              |> filter(fn: (r) => r._field == "%s")
              |> filter(fn: (r) => r.gatewayId == "%s")
              |> group(columns: ["deviceId"])
              |> sum()
            """.formatted(
            escapeFluxString(properties.getBucket()),
            startTime,
            endTime,
            escapeFluxString(measurement),
            escapeFluxString(field),
            escapeFluxString(gatewayId)
    );

    Map<String, Double> result = new LinkedHashMap<>();
    for (FluxRecord record : queryRecords(flux)) {
        Object deviceId = record.getValueByKey("deviceId");
        Double value = toDouble(record.getValue());
        if (deviceId != null && value != null) {
            result.put(String.valueOf(deviceId), value);
        }
    }
    return result;
}
```

## 聚合查询：多个字段分别求和

例如一次查询 `Power`、`Voltage`、`Current` 的总和：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T01:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => contains(value: r._field, set: ["Power", "Voltage", "Current"]))
  |> filter(fn: (r) => r.gatewayId == "GW001")
  |> group(columns: ["_field"])
  |> sum()
```

Java 返回 `field -> sum`：

```java
public Map<String, Double> sumMultipleFields(
        String measurement,
        List<String> fields,
        Instant startTime,
        Instant endTime,
        List<DeviceTrendDTO.TagFilter> tags
) {
    if (fields == null || fields.isEmpty()) {
        return Map.of();
    }

    String fieldSet = fields.stream()
            .map(value -> "\"" + escapeFluxString(value) + "\"")
            .collect(Collectors.joining(", "));

    StringBuilder flux = new StringBuilder();
    flux.append("""
            from(bucket: "%s")
              |> range(start: time(v: "%s"), stop: time(v: "%s"))
              |> filter(fn: (r) => r._measurement == "%s")
              |> filter(fn: (r) => contains(value: r._field, set: [%s]))
            """.formatted(
            escapeFluxString(properties.getBucket()),
            startTime,
            endTime,
            escapeFluxString(measurement),
            fieldSet
    ));

    for (DeviceTrendDTO.TagFilter tag : normalizeTagFilters(tags)) {
        flux.append("  |> filter(fn: (r) => r[\"")
                .append(escapeFluxString(tag.getKey()))
                .append("\"] == \"")
                .append(escapeFluxString(tag.getValue()))
                .append("\")\n");
    }

    flux.append("""
              |> group(columns: ["_field"])
              |> sum()
            """);

    Map<String, Double> result = new LinkedHashMap<>();
    for (FluxRecord record : queryRecords(flux.toString())) {
        Object field = record.getValueByKey("_field");
        Double value = toDouble(record.getValue());
        if (field != null && value != null) {
            result.put(String.valueOf(field), value);
        }
    }
    return result;
}
```

## 聚合查询：多个字段先 pivot 再计算

有时需要做跨字段计算，例如：

```text
apparentPower = Voltage * Current
```

这类计算需要先用 `pivot` 把多个 field 转成列：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T01:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => contains(value: r._field, set: ["Voltage", "Current"]))
  |> filter(fn: (r) => r.deviceId == "BAT001")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({ r with apparentPower: r.Voltage * r.Current }))
  |> sum(column: "apparentPower")
```

这种写法适合计算派生指标，但要注意字段缺失时可能报错。可以用 `exists r.Voltage` 判断：

```flux
|> filter(fn: (r) => exists r.Voltage and exists r.Current)
```

## 聚合查询：能量统计的注意点

如果 `Power` 是瞬时功率，直接对所有采样点 `sum()` 并不等于能量。能量通常要做积分：

```text
Energy(kWh) = Power(kW) * 时间间隔(h)
```

如果设备每分钟上报一次 W，可以先转 kW，再按分钟积分：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T01:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => r._field == "Power")
  |> filter(fn: (r) => r.deviceId == "BAT001")
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> map(fn: (r) => ({ r with _value: r._value / 1000.0 / 60.0 }))
  |> sum()
```

含义：

- `aggregateWindow(every: 1m, fn: mean)`：每分钟取平均功率。
- `_value / 1000.0`：W 转 kW。
- `/ 60.0`：一分钟折算为小时。
- `sum()`：累加成 kWh。

如果采样间隔不固定，应使用 Flux 的 `integral()`：

```flux
from(bucket: "telemetry_48h")
  |> range(start: time(v: "2026-07-28T00:00:00Z"), stop: time(v: "2026-07-28T01:00:00Z"))
  |> filter(fn: (r) => r._measurement == "bat")
  |> filter(fn: (r) => r._field == "Power")
  |> filter(fn: (r) => r.deviceId == "BAT001")
  |> integral(unit: 1h)
  |> map(fn: (r) => ({ r with _value: r._value / 1000.0 }))
```

`integral(unit: 1h)` 会得到 `W * h`，再除以 1000 得到 `kWh`。

## 常见问题

### Tag 和 Field 怎么选

适合做 tag：

- 设备 ID。
- 网关 ID。
- 租户 ID。
- 站点 ID。
- 设备类型。
- 区域。

适合做 field：

- 功率。
- 电压。
- 电流。
- SOC。
- 温度。
- 开关状态。
- 运行模式。

判断标准是：经常用于过滤和分组的低基数字段做 tag；真正变化的采样值做 field。

### 为什么不要把所有设备类型都写到一个 measurement

可以写到一个 measurement，但如果不同设备类型字段差异很大，会带来：

- Field 列表混杂。
- 前端选择复杂。
- 查询 predicate 更长。
- 数据语义不清晰。

如果业务上设备类型差异明显，用 `bat`、`pv_inv`、`mtr_grid` 这样的 measurement 更清晰。

### 查询字符串为什么要转义

Flux 是字符串拼接时最容易出问题的地方。如果 tag value 里包含双引号、反斜杠或换行，查询可能直接报错。最基本也要做：

```java
private String escapeFluxString(String value) {
    return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
}
```

### 聚合时为什么有时返回多条记录

InfluxDB 会按 group key 分组。比如你按 `deviceId`、`gatewayId` 保留了分组，`sum()` 会对每组分别求和。

如果要所有数据合成一个总和，用：

```flux
|> group()
|> sum()
```

如果要按设备分别求和，用：

```flux
|> group(columns: ["deviceId"])
|> sum()
```

## 总结

Spring Boot 接入 InfluxDB 的核心步骤并不复杂：

- 配置 `InfluxProperties`。
- 创建 `InfluxDBClient` Bean。
- 写入时用 `Point.measurement()`、`addTag()`、`addField()` 和时间戳。
- 查询时用 Flux 动态组合 `bucket`、`measurement`、`field`、`tag`、时间区间。
- 趋势图查询返回 `Series -> Points`。
- 聚合统计根据业务选择 `sum()`、`mean()`、`aggregateWindow()`、`group()`、`pivot()` 或 `integral()`。

在设备遥测场景中，推荐把设备标识类字段放 tag，把实时数值放 field，并为前端提供 metadata、field keys、tag keys、tag values 和 query 接口。这样前端可以完全动态地构建趋势查询和多曲线对比，不需要硬编码设备属性。

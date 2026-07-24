---
title: 新版本 Spring Boot 如何升级替换 EasyExcel
date: 2026-07-20
category: Java
tag:
  - Spring Boot
  - EasyExcel
  - Apache POI
  - Excel
  - Java
isOriginal: true
excerpt: 面向 Spring Boot 3 和新版本 Java 项目，讲清楚 EasyExcel 替换时机、旧注解兼容方案、Apache POI 方案，以及如何封装一个可维护的自定义 Excel 模块。
---

# 新版本 Spring Boot 如何升级替换 EasyExcel

很多老项目里，Excel 导入导出通常直接使用 EasyExcel：

```java
EasyExcel.read(file.getInputStream(), UserImportRow.class, listener).sheet().doRead();
EasyExcel.write(response.getOutputStream(), UserExportRow.class).sheet("用户").doWrite(rows);
```

DTO 上也会写大量 EasyExcel 注解：

```java
public class UserExportRow {

    @ExcelProperty("用户ID")
    private Long userId;

    @ExcelProperty("手机号")
    private String mobile;

    @DateTimeFormat("yyyy-MM-dd HH:mm:ss")
    @ExcelProperty("创建时间")
    private LocalDateTime createdAt;
}
```

当项目升级到 Spring Boot 3、Java 17 或更高版本时，很多团队会开始考虑是否替换 EasyExcel。原因通常不是“EasyExcel 完全不能用”，而是下面几个现实问题叠加：

- Spring Boot 3 进入 Jakarta EE 体系，老项目整体依赖要升级。
- Excel 逻辑散落在 Controller、Service、Listener、DTO 注解里，维护成本高。
- EasyExcel 仓库已经归档，后续安全修复和新版本适配预期变弱。
- 项目希望统一导入校验、错误回写、模板导出、大文件导出、审计日志。
- 业务 DTO 被 EasyExcel 注解强绑定，切换成本越来越高。

更稳妥的升级方式不是一次性大改所有接口，而是先把 Excel 能力抽象成模块，再逐步替换底层实现。

## 先判断是否必须替换

升级 Spring Boot 时，不要盲目删除 EasyExcel。先按下面几个问题判断。

如果你的项目只是少量后台导出，数据量不大，EasyExcel 仍然能通过测试，短期可以先保留，把优先级放在 Spring Boot 3 主体升级上。

如果项目有大量导入导出、模板校验、错误行回写、多 Sheet、复杂样式、大数据量导出，建议尽快做 Excel 模块抽象。否则后面每次改 Excel 都会直接牵动业务代码。

如果你的团队已经明确要求去掉无人维护或归档依赖，就应该用 Apache POI、fastexcel 或自定义封装替代。对于企业项目，Apache POI 是最稳的底座，因为它覆盖 `.xls`、`.xlsx`、样式、公式、单元格类型、流式写入等能力。

推荐路线：

1. 第一步：升级 Spring Boot，固定现有 EasyExcel 行为，补测试。
2. 第二步：新增自己的 Excel 门面接口，例如 `ExcelService`。
3. 第三步：实现一个兼容旧 EasyExcel 注解的解析器。
4. 第四步：新代码使用自定义注解，不再直接依赖 EasyExcel。
5. 第五步：底层实现从 EasyExcel 切到 Apache POI 或其他库。
6. 第六步：逐步删除 DTO 上的旧 EasyExcel 注解。

## Spring Boot 3 升级时的基础变化

Spring Boot 3 的主要门槛是 Java 17 和 Jakarta EE 迁移。Web、Servlet、Validation、Persistence 等相关依赖从 `javax.*` 迁移到 `jakarta.*`。

Excel 模块本身通常不直接依赖 Servlet API，但导入导出接口会用到 Spring Web 的 `MultipartFile`、`HttpServletResponse`、文件上传配置、异常处理等能力，所以要一起检查。

典型 Controller 在 Spring Boot 3 中仍然可以这样写：

```java
@RestController
@RequestMapping("/admin/users")
public class UserExcelController {

    private final UserExcelService userExcelService;

    public UserExcelController(UserExcelService userExcelService) {
        this.userExcelService = userExcelService;
    }

    @PostMapping("/import")
    public ImportResult importUsers(@RequestParam("file") MultipartFile file) {
        return userExcelService.importUsers(file);
    }

    @GetMapping("/export")
    public void exportUsers(HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader(
                "Content-Disposition",
                "attachment; filename*=UTF-8''users.xlsx"
        );

        userExcelService.exportUsers(response.getOutputStream());
    }
}
```

注意 Spring Boot 3 项目里 `HttpServletResponse` 应该使用：

```java
import jakarta.servlet.http.HttpServletResponse;
```

而不是旧的：

```java
import javax.servlet.http.HttpServletResponse;
```

## 替换 EasyExcel 前先做依赖梳理

老项目里 EasyExcel 往往不是唯一 Excel 依赖。先查清楚项目里到底用了什么。

Maven 项目可以执行：

```bash
mvn dependency:tree | grep -i "easyexcel\|poi\|xmlbeans"
```

Gradle 项目可以执行：

```bash
./gradlew dependencies --configuration runtimeClasspath | grep -i "easyexcel\|poi\|xmlbeans"
```

重点看：

- `com.alibaba:easyexcel` 的版本。
- 是否显式引入 `org.apache.poi:poi-ooxml`。
- 是否存在多个 POI 版本冲突。
- 是否有老的 `xmlbeans`、`commons-compress`、`commons-io`。
- 是否有安全扫描要求升级 POI 相关依赖。

如果确定替换 EasyExcel，可以先把依赖改成 Apache POI：

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.4.1</version>
</dependency>
```

如果你需要处理 `.xls`，还需要保留 HSSF 相关能力。`poi-ooxml` 主要面向 `.xlsx`，但 POI 体系本身也支持 HSSF。

## 不要让业务代码直接依赖 Excel 库

替换 EasyExcel 最容易失败的原因，是业务代码到处直接调用：

```java
EasyExcel.read(...)
EasyExcel.write(...)
```

更好的方式是先定义自己的接口。

```java
public interface ExcelService {

    <T> List<T> read(InputStream inputStream, Class<T> rowType);

    <T> void write(OutputStream outputStream, String sheetName, Class<T> rowType, List<T> rows);
}
```

业务服务只依赖这个接口：

```java
@Service
public class UserExcelService {

    private final ExcelService excelService;

    public UserExcelService(ExcelService excelService) {
        this.excelService = excelService;
    }

    public ImportResult importUsers(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            List<UserImportRow> rows = excelService.read(inputStream, UserImportRow.class);
            return saveRows(rows);
        } catch (IOException e) {
            throw new ExcelImportException("读取 Excel 文件失败", e);
        }
    }

    public void exportUsers(OutputStream outputStream) {
        List<UserExportRow> rows = queryRows();
        excelService.write(outputStream, "用户", UserExportRow.class, rows);
    }
}
```

这样以后底层用 EasyExcel、Apache POI、fastexcel，业务层都不需要知道。

## 旧版本注解怎么处理

这是替换 EasyExcel 时最关键的问题。

很多老 DTO 已经写了大量 EasyExcel 注解：

```java
public class OrderExportRow {

    @ExcelProperty(value = "订单号", index = 0)
    private String orderNo;

    @ExcelProperty(value = "支付金额", index = 1)
    @NumberFormat("#,##0.00")
    private BigDecimal payAmount;

    @ExcelProperty(value = "支付时间", index = 2)
    @DateTimeFormat("yyyy-MM-dd HH:mm:ss")
    private LocalDateTime paidAt;

    @ExcelIgnore
    private Long internalId;
}
```

直接删除这些注解风险很大。推荐用“兼容层”过渡。

### 方案一：短期继续识别 EasyExcel 注解

即使底层不再用 EasyExcel 写文件，也可以暂时保留 `@ExcelProperty`、`@ExcelIgnore`、`@DateTimeFormat`、`@NumberFormat`，通过反射读取这些注解，转换成自己的列元数据。

先定义内部列模型：

```java
public class ExcelColumnMeta {

    private String header;
    private int index;
    private Field field;
    private String datePattern;
    private String numberPattern;
    private boolean ignored;

    // getter/setter 省略
}
```

解析旧注解：

```java
public class EasyExcelAnnotationResolver {

    public List<ExcelColumnMeta> resolve(Class<?> rowType) {
        List<ExcelColumnMeta> columns = new ArrayList<>();

        for (Field field : rowType.getDeclaredFields()) {
            ExcelIgnore ignore = field.getAnnotation(ExcelIgnore.class);
            if (ignore != null) {
                continue;
            }

            ExcelProperty property = field.getAnnotation(ExcelProperty.class);
            if (property == null) {
                continue;
            }

            ExcelColumnMeta meta = new ExcelColumnMeta();
            meta.setField(field);
            meta.setIndex(property.index());
            meta.setHeader(resolveHeader(property, field));

            DateTimeFormat dateTimeFormat = field.getAnnotation(DateTimeFormat.class);
            if (dateTimeFormat != null) {
                meta.setDatePattern(dateTimeFormat.value());
            }

            NumberFormat numberFormat = field.getAnnotation(NumberFormat.class);
            if (numberFormat != null) {
                meta.setNumberPattern(numberFormat.value());
            }

            columns.add(meta);
        }

        return columns.stream()
                .sorted(Comparator.comparingInt(ExcelColumnMeta::getIndex))
                .toList();
    }

    private String resolveHeader(ExcelProperty property, Field field) {
        String[] values = property.value();
        if (values.length > 0 && !values[values.length - 1].isBlank()) {
            return values[values.length - 1];
        }
        return field.getName();
    }
}
```

这样 DTO 暂时不用改，底层 writer/reader 可以先改成 POI。

缺点是新模块仍然依赖 EasyExcel 的注解包。它适合过渡期，不适合长期保留。

### 方案二：定义自己的注解

长期更推荐定义自己的注解，例如：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface ExcelColumn {

    String value();

    int index() default Integer.MAX_VALUE;

    String datePattern() default "";

    String numberPattern() default "";
}
```

忽略字段：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface ExcelIgnoreColumn {
}
```

新 DTO 使用自己的注解：

```java
public class UserExportRow {

    @ExcelColumn(value = "用户ID", index = 0)
    private Long userId;

    @ExcelColumn(value = "手机号", index = 1)
    private String mobile;

    @ExcelColumn(value = "创建时间", index = 2, datePattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @ExcelIgnoreColumn
    private String internalRemark;
}
```

这样业务模型不再被某个第三方 Excel 库锁死。

### 方案三：同时兼容新旧注解

迁移期可以让解析器同时支持两套注解：

```java
public class CompositeExcelAnnotationResolver {

    public List<ExcelColumnMeta> resolve(Class<?> rowType) {
        List<ExcelColumnMeta> columns = new ArrayList<>();

        for (Field field : rowType.getDeclaredFields()) {
            if (field.isAnnotationPresent(ExcelIgnoreColumn.class)
                    || field.isAnnotationPresent(ExcelIgnore.class)) {
                continue;
            }

            ExcelColumn newColumn = field.getAnnotation(ExcelColumn.class);
            if (newColumn != null) {
                columns.add(fromNewAnnotation(field, newColumn));
                continue;
            }

            ExcelProperty oldColumn = field.getAnnotation(ExcelProperty.class);
            if (oldColumn != null) {
                columns.add(fromEasyExcelAnnotation(field, oldColumn));
            }
        }

        return columns.stream()
                .sorted(Comparator.comparingInt(ExcelColumnMeta::getIndex))
                .toList();
    }
}
```

迁移策略：

1. 新增自定义注解。
2. 解析器同时支持新旧注解。
3. 新增代码只允许使用新注解。
4. 老 DTO 按业务模块逐步替换。
5. 全部替换完成后，删除 EasyExcel 注解依赖。

## 用 Apache POI 实现导出

Apache POI 里常见几个模型：

- `XSSFWorkbook`：处理 `.xlsx`，适合中小文件。
- `HSSFWorkbook`：处理 `.xls`。
- `SXSSFWorkbook`：流式写 `.xlsx`，适合大文件导出。

大数据导出优先用 `SXSSFWorkbook`，它只保留窗口内的部分行在内存中，旧行会刷到临时文件。

一个基础导出实现如下：

```java
@Component
public class PoiExcelService implements ExcelService {

    private final CompositeExcelAnnotationResolver annotationResolver;

    public PoiExcelService(CompositeExcelAnnotationResolver annotationResolver) {
        this.annotationResolver = annotationResolver;
    }

    @Override
    public <T> void write(OutputStream outputStream, String sheetName, Class<T> rowType, List<T> rows) {
        List<ExcelColumnMeta> columns = annotationResolver.resolve(rowType);

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(500)) {
            workbook.setCompressTempFiles(true);

            Sheet sheet = workbook.createSheet(sheetName);
            writeHeader(sheet, columns);
            writeBody(workbook, sheet, columns, rows);

            workbook.write(outputStream);
        } catch (IOException e) {
            throw new ExcelExportException("导出 Excel 失败", e);
        }
    }

    private void writeHeader(Sheet sheet, List<ExcelColumnMeta> columns) {
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < columns.size(); i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns.get(i).getHeader());
        }
    }

    private <T> void writeBody(
            Workbook workbook,
            Sheet sheet,
            List<ExcelColumnMeta> columns,
            List<T> rows
    ) {
        Map<String, CellStyle> styleCache = new HashMap<>();

        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            Row excelRow = sheet.createRow(rowIndex + 1);
            T data = rows.get(rowIndex);

            for (int columnIndex = 0; columnIndex < columns.size(); columnIndex++) {
                ExcelColumnMeta column = columns.get(columnIndex);
                Object value = getFieldValue(column.getField(), data);

                Cell cell = excelRow.createCell(columnIndex);
                writeCell(workbook, cell, value, column, styleCache);
            }
        }
    }

    private void writeCell(
            Workbook workbook,
            Cell cell,
            Object value,
            ExcelColumnMeta column,
            Map<String, CellStyle> styleCache
    ) {
        if (value == null) {
            return;
        }

        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
            return;
        }

        if (value instanceof LocalDateTime localDateTime) {
            String pattern = column.getDatePattern().isBlank()
                    ? "yyyy-MM-dd HH:mm:ss"
                    : column.getDatePattern();
            CellStyle style = styleCache.computeIfAbsent(pattern, key -> {
                CellStyle cellStyle = workbook.createCellStyle();
                short format = workbook.getCreationHelper()
                        .createDataFormat()
                        .getFormat(key);
                cellStyle.setDataFormat(format);
                return cellStyle;
            });
            cell.setCellStyle(style);
            cell.setCellValue(localDateTime);
            return;
        }

        if (value instanceof LocalDate localDate) {
            cell.setCellValue(localDate);
            return;
        }

        if (value instanceof Boolean bool) {
            cell.setCellValue(bool);
            return;
        }

        cell.setCellValue(String.valueOf(value));
    }

    private Object getFieldValue(Field field, Object target) {
        try {
            field.setAccessible(true);
            return field.get(target);
        } catch (IllegalAccessException e) {
            throw new ExcelExportException("读取字段失败: " + field.getName(), e);
        }
    }
}
```

这个实现已经具备几个关键点：

- 业务层只依赖 `ExcelService`。
- 字段列顺序来自注解元数据。
- 旧 EasyExcel 注解可以继续被解析。
- 大文件导出使用 `SXSSFWorkbook` 降低内存压力。
- 日期样式集中缓存，避免创建过多 `CellStyle`。

生产中还应该补充：

- 表头样式。
- 列宽设置。
- 冻结首行。
- 枚举值转换。
- 金额精度处理。
- null 值策略。
- 多 Sheet 导出。
- 导出审计日志。

## 用 Apache POI 实现导入

导入比导出更复杂，因为导入要处理脏数据。

最小实现可以先使用 `XSSFWorkbook`：

```java
@Override
public <T> List<T> read(InputStream inputStream, Class<T> rowType) {
    List<ExcelColumnMeta> columns = annotationResolver.resolve(rowType);

    try (Workbook workbook = WorkbookFactory.create(inputStream)) {
        Sheet sheet = workbook.getSheetAt(0);
        Map<String, Integer> headerIndex = readHeader(sheet.getRow(0));
        List<T> result = new ArrayList<>();

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) {
                continue;
            }

            T item = rowType.getDeclaredConstructor().newInstance();
            for (ExcelColumnMeta column : columns) {
                Integer cellIndex = headerIndex.get(column.getHeader());
                if (cellIndex == null) {
                    continue;
                }

                Cell cell = row.getCell(cellIndex);
                Object value = readCellValue(cell, column.getField().getType());
                setFieldValue(column.getField(), item, value);
            }

            result.add(item);
        }

        return result;
    } catch (ReflectiveOperationException | IOException e) {
        throw new ExcelImportException("导入 Excel 失败", e);
    }
}
```

读取表头：

```java
private Map<String, Integer> readHeader(Row headerRow) {
    Map<String, Integer> headerIndex = new HashMap<>();
    if (headerRow == null) {
        return headerIndex;
    }

    for (Cell cell : headerRow) {
        cell.setCellType(CellType.STRING);
        String header = cell.getStringCellValue().trim();
        headerIndex.put(header, cell.getColumnIndex());
    }

    return headerIndex;
}
```

读取单元格值：

```java
private Object readCellValue(Cell cell, Class<?> targetType) {
    if (cell == null) {
        return null;
    }

    if (targetType == String.class) {
        cell.setCellType(CellType.STRING);
        return cell.getStringCellValue().trim();
    }

    if (targetType == Integer.class || targetType == int.class) {
        return (int) cell.getNumericCellValue();
    }

    if (targetType == Long.class || targetType == long.class) {
        return (long) cell.getNumericCellValue();
    }

    if (targetType == BigDecimal.class) {
        return BigDecimal.valueOf(cell.getNumericCellValue());
    }

    if (targetType == LocalDateTime.class) {
        return cell.getLocalDateTimeCellValue();
    }

    if (targetType == Boolean.class || targetType == boolean.class) {
        return cell.getBooleanCellValue();
    }

    throw new ExcelImportException("不支持的字段类型: " + targetType.getName());
}
```

这个简单版本适合中小文件。大文件导入要谨慎，因为 `XSSFWorkbook` 会把工作簿结构加载到内存。对于几十万行以上的 `.xlsx`，建议使用 POI 的 SAX 事件模型，或者选择一个专门封装流式读取的库。

## 导入必须设计错误模型

EasyExcel 老项目里经常把错误处理写在 Listener 中：

```java
public void invoke(UserImportRow row, AnalysisContext context) {
    // 校验并保存
}
```

替换后不要简单地返回 `List<T>` 就结束。生产导入至少需要一个结果对象：

```java
public class ExcelImportResult<T> {

    private List<T> validRows = new ArrayList<>();

    private List<ExcelRowError> errors = new ArrayList<>();

    public boolean hasError() {
        return !errors.isEmpty();
    }
}
```

错误行：

```java
public class ExcelRowError {

    private int rowIndex;

    private String column;

    private String message;
}
```

导入流程应该是：

1. 读取 Excel。
2. 校验表头是否匹配模板。
3. 逐行转换字段类型。
4. 使用 Bean Validation 校验必填、长度、格式。
5. 做业务校验，例如手机号是否重复。
6. 合法数据入库。
7. 错误数据生成错误报告，返回给用户下载。

这样用户才知道哪一行、哪一列、为什么失败。

## 旧注解和校验注解的关系

Excel 注解只负责“这一列叫什么、排第几列、怎么格式化”。业务校验不要写进 Excel 注解里，应该使用 Bean Validation。

```java
public class UserImportRow {

    @ExcelColumn(value = "手机号", index = 0)
    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^1\\d{10}$", message = "手机号格式不正确")
    private String mobile;

    @ExcelColumn(value = "昵称", index = 1)
    @Size(max = 30, message = "昵称不能超过 30 个字符")
    private String nickname;
}
```

Spring Boot 3 使用 Jakarta Validation：

```java
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
```

校验代码：

```java
@Component
public class ExcelRowValidator {

    private final Validator validator;

    public ExcelRowValidator(Validator validator) {
        this.validator = validator;
    }

    public <T> List<ExcelRowError> validate(T row, int rowIndex) {
        return validator.validate(row).stream()
                .map(error -> {
                    ExcelRowError rowError = new ExcelRowError();
                    rowError.setRowIndex(rowIndex);
                    rowError.setColumn(error.getPropertyPath().toString());
                    rowError.setMessage(error.getMessage());
                    return rowError;
                })
                .toList();
    }
}
```

这种设计可以让 Excel 导入和普通接口参数校验保持一致。

## 自定义 Excel 模块建议目录

建议把 Excel 能力从业务模块中抽出来。

```text
src/main/java/com/example/common/excel/
  annotation/
    ExcelColumn.java
    ExcelIgnoreColumn.java
  core/
    ExcelService.java
    ExcelColumnMeta.java
    ExcelSheetMeta.java
  poi/
    PoiExcelService.java
    PoiExcelWriter.java
    PoiExcelReader.java
  resolver/
    CompositeExcelAnnotationResolver.java
    EasyExcelAnnotationResolver.java
    CustomExcelAnnotationResolver.java
  converter/
    ExcelValueConverter.java
    StringConverter.java
    NumberConverter.java
    LocalDateTimeConverter.java
    EnumConverter.java
  validation/
    ExcelImportResult.java
    ExcelRowError.java
    ExcelRowValidator.java
  exception/
    ExcelImportException.java
    ExcelExportException.java
```

模块边界要清楚：

- `annotation`：只定义业务 DTO 使用的注解。
- `resolver`：把注解转换为列元数据。
- `converter`：处理 Java 类型和 Excel 单元格值互转。
- `poi`：封装 Apache POI 细节。
- `validation`：统一导入校验和错误报告。
- `exception`：统一异常类型，交给全局异常处理。

业务模块只看见 `ExcelService` 和自己的行 DTO。

## 旧 EasyExcel 代码如何逐步迁移

假设旧代码是这样：

```java
EasyExcel.write(response.getOutputStream(), UserExportRow.class)
        .sheet("用户")
        .doWrite(rows);
```

第一步，替换成自己的门面：

```java
excelService.write(response.getOutputStream(), "用户", UserExportRow.class, rows);
```

这时 `excelService` 底层仍然可以调用 EasyExcel。这样先把业务代码和 EasyExcel 静态 API 解耦。

第二步，实现 `PoiExcelService`，并通过配置切换：

```java
@Configuration
public class ExcelAutoConfiguration {

    @Bean
    @ConditionalOnProperty(name = "app.excel.engine", havingValue = "poi", matchIfMissing = true)
    public ExcelService poiExcelService(CompositeExcelAnnotationResolver resolver) {
        return new PoiExcelService(resolver);
    }

    @Bean
    @ConditionalOnProperty(name = "app.excel.engine", havingValue = "easyexcel")
    public ExcelService easyExcelService() {
        return new EasyExcelService();
    }
}
```

配置：

```yaml
app:
  excel:
    engine: poi
```

第三步，把重点接口切到 POI 实现，做对比测试：

- 导出文件列名是否一致。
- 列顺序是否一致。
- 日期格式是否一致。
- 金额精度是否一致。
- 空值显示是否一致。
- 导入错误提示是否一致。
- 大文件内存占用是否可接受。

第四步，新 DTO 改用自定义注解，旧 DTO 慢慢迁移。

## 多 Sheet 如何设计

不要在业务代码里手动操作 POI 的 `Workbook`。可以定义一个请求模型：

```java
public class ExcelSheetData<T> {

    private String sheetName;

    private Class<T> rowType;

    private List<T> rows;
}
```

接口：

```java
void write(OutputStream outputStream, List<ExcelSheetData<?>> sheets);
```

这样可以支持：

```java
excelService.write(outputStream, List.of(
        new ExcelSheetData<>("用户", UserExportRow.class, users),
        new ExcelSheetData<>("订单", OrderExportRow.class, orders)
));
```

模块内部负责逐个创建 Sheet。

## 大文件导出注意事项

使用 `SXSSFWorkbook` 不代表可以无限制导出。还要注意：

- 不要一次性把数据库所有数据查到 `List`。
- 使用分页查询或游标读取。
- 每读取一页就写一页。
- 控制窗口大小，例如 `new SXSSFWorkbook(500)`。
- 开启临时文件压缩。
- 导出完成后关闭 workbook，释放临时文件。
- 不要大量使用复杂样式、合并单元格、公式和批注。

更好的导出接口可以设计成流式：

```java
public interface ExcelRowProvider<T> {

    List<T> next(int pageNo, int pageSize);
}
```

写出时分页拉取：

```java
int pageNo = 1;
int pageSize = 1000;

while (true) {
    List<UserExportRow> page = provider.next(pageNo, pageSize);
    if (page.isEmpty()) {
        break;
    }

    writer.writeRows(page);
    pageNo++;
}
```

这比 `List<T> rows` 更适合百万级导出。

## 大文件导入注意事项

大文件导入最容易出问题的是内存和事务。

不要这样做：

```java
List<UserImportRow> rows = excelService.read(inputStream, UserImportRow.class);
userRepository.saveAll(rows);
```

如果文件很大，应该分批处理：

1. 按批次读取。
2. 每批校验。
3. 每批入库。
4. 每批记录错误。
5. 最后汇总导入结果。

事务也不要包住整个大文件。否则失败回滚代价高，数据库锁持有时间长。

建议按批次事务：

```java
@Transactional
public void saveBatch(List<UserImportRow> rows) {
    // 批量入库
}
```

如果需要全量成功或全量失败，可以先导入临时表，全部校验通过后再转正式表。

## 响应下载文件名处理

Spring Boot 导出 Excel 时，中文文件名要正确编码。

```java
String fileName = URLEncoder.encode("用户列表.xlsx", StandardCharsets.UTF_8)
        .replaceAll("\\+", "%20");

response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
response.setCharacterEncoding(StandardCharsets.UTF_8.name());
response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + fileName);
```

不要只写：

```java
response.setHeader("Content-Disposition", "attachment; filename=用户列表.xlsx");
```

它在部分浏览器和代理环境中容易乱码。

## 推荐测试清单

Excel 替换属于高回归风险改造。至少补下面这些测试：

1. 表头顺序测试。
2. 字段类型转换测试。
3. 日期格式测试。
4. 金额精度测试。
5. 空值测试。
6. 枚举转换测试。
7. 导入缺少必填列测试。
8. 导入多余列测试。
9. 错误行提示测试。
10. 大文件导出内存测试。
11. Spring Boot 3 环境下上传下载接口测试。

可以用固定 Excel 文件作为测试资源：

```text
src/test/resources/excel/user-import-success.xlsx
src/test/resources/excel/user-import-invalid-mobile.xlsx
src/test/resources/excel/user-import-missing-header.xlsx
```

不要只测“能生成文件”。要把生成的文件再读回来，断言表头、行数、关键字段值。

## 什么时候选择其他库

替换 EasyExcel 不一定只能选 Apache POI。

可以按场景选择：

- Apache POI：能力最完整，适合企业内部统一封装。
- fastexcel：API 更轻，适合简单读写 `.xlsx`。
- CSV：如果只是数据交换，优先考虑 CSV，简单、快、兼容性强。
- 数据异步导出：超大文件导出可以改成后台任务，生成后上传对象存储，再给用户下载链接。

如果你的需求只是导出报表，不需要复杂样式，CSV 通常比 Excel 更可靠。如果业务必须使用模板、样式、多 Sheet、冻结行、下拉框、错误回写，Apache POI 更合适。

## 推荐最终架构

一个可维护的 Spring Boot 3 Excel 模块，应该长这样：

```text
Controller
  -> BusinessService
    -> ExcelService
      -> AnnotationResolver
      -> ConverterRegistry
      -> Validator
      -> PoiReader / PoiWriter
```

业务代码不出现：

```java
EasyExcel.read(...)
EasyExcel.write(...)
WorkbookFactory.create(...)
new XSSFWorkbook()
new SXSSFWorkbook()
```

这些都应该收敛在 Excel 基础模块里。

DTO 可以短期这样：

```java
@ExcelProperty("手机号")
private String mobile;
```

迁移后改成：

```java
@ExcelColumn(value = "手机号", index = 0)
private String mobile;
```

最终 EasyExcel 只存在于兼容解析器里，等旧 DTO 全部迁移完成后删除。

## Yin 项目实战：Spring Boot 3.5 替换 EasyExcel

### 背景

当前项目已经升级到 Spring Boot 3.5.x。原来的 Excel 功能依赖 `com.alibaba:easyexcel:3.3.4`，它会传递较旧版本的 Apache POI 依赖，在新 Spring Boot、Java 21 和安全依赖持续升级的场景下，后续维护成本会变高。

这次改造的目标是：

- 去掉 EasyExcel 依赖，不再使用 `com.alibaba.excel.*` 包。
- 使用 Apache POI `poi-ooxml` 直接读写 `.xlsx`。
- 保留原来的 Controller 调用习惯，导出和导入仍然通过一个 helper 完成。
- 把 Excel 字段元数据改成项目自己的注解，避免业务 DTO 绑定第三方框架注解。
- 同步更新代码生成模板，后续生成的新模块默认使用新 Excel 方案。

### 改写思路

#### 1. 依赖层面

EasyExcel 的优势是封装较高，但项目当前 Excel 需求比较明确：

- 根据 DTO 字段导出表头和数据。
- 根据第一行表头把 Excel 内容读回 DTO。
- 支持常见类型，例如 `String`、数字、`Boolean`、`LocalDateTime`、`LocalDate`、`Instant`。
- 支持忽略内部字段，例如 `id`、审计字段、树形 `children`。

这些能力用 Apache POI 可以直接实现，不需要继续保留 EasyExcel。

父工程统一管理 POI 版本：

```xml
<properties>
    <poi.version>5.5.1</poi.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.apache.poi</groupId>
            <artifactId>poi-ooxml</artifactId>
            <version>${poi.version}</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

实际读写 Excel 的 `yin-admin` 模块引入：

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
</dependency>
```

`yin-system` 不再依赖 EasyExcel。DTO 只依赖 `yin-common` 中的项目自定义注解。

#### 2. 注解层面

原来 DTO 里使用的是 EasyExcel 注解：

```java
@ExcelProperty("用户名")
@ColumnWidth(20)
private String login;

@ExcelIgnore
private String id;
```

现在改成项目自己的注解：

```java
@ExcelColumn("用户名")
private String login;

@ExcelIgnore
private String id;
```

两个注解放在 `yin-common`：

```text
yin-common/src/main/java/com/yinyang/yin/excel
├── ExcelColumn.java
└── ExcelIgnore.java
```

`@ExcelColumn` 负责声明表头名和列宽：

```java
@ExcelColumn(value = "用户名", width = 20)
```

如果没有写 `width`，默认使用 `20`。这等价于原来的 `@ColumnWidth(20)` 常规用法。

#### 3. Helper 层面

原来的工具类是：

```java
EasyExcelHelper.export(...)
EasyExcelHelper.readToList(...)
```

现在替换为：

```java
ExcelHelper.export(...)
ExcelHelper.readToList(...)
```

新 helper 位置：

```text
yin-admin/src/main/java/com/yinyang/yin/helper/ExcelHelper.java
```

导出流程：

1. 根据 DTO class 反射读取字段。
2. 跳过 `@ExcelIgnore` 字段。
3. 如果字段有 `@ExcelColumn`，用注解值作为表头；否则用字段名作为表头。
4. 创建 `XSSFWorkbook` 和 sheet。
5. 写入表头、冻结首行、设置基础样式和列宽。
6. 写入数据行。
7. 通过 `HttpServletResponse` 输出 `.xlsx` 文件。

导入流程：

1. 使用 `WorkbookFactory.create(file.getInputStream())` 读取上传文件。
2. 读取第一个 sheet。
3. 用第一行表头匹配 DTO 字段。
4. 从第二行开始逐行读取。
5. 按字段类型转换单元格值。
6. 反射创建 DTO 实例并写入字段。
7. 返回 `List<T>` 给业务 service 批量保存或更新。

### 改写步骤

#### 1. 替换 Maven 依赖

根 `pom.xml` 删除：

```xml
<easyexcel.version>3.3.4</easyexcel.version>
```

以及：

```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>easyexcel</artifactId>
    <version>${easyexcel.version}</version>
</dependency>
```

新增：

```xml
<poi.version>5.5.1</poi.version>
```

和：

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>${poi.version}</version>
</dependency>
```

`yin-admin/pom.xml` 删除 EasyExcel，新增 POI：

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
</dependency>
```

`yin-system/pom.xml` 删除 EasyExcel，因为 DTO 不应该为了注解依赖 Excel 读写库。

#### 2. 新增项目自定义注解

新增 `ExcelColumn`：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface ExcelColumn {
    String value();
    int width() default 20;
}
```

新增 `ExcelIgnore`：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface ExcelIgnore {
}
```

#### 3. 替换 DTO 注解

批量替换导入：

```java
import com.alibaba.excel.annotation.ExcelIgnore;
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.write.style.ColumnWidth;
```

改为：

```java
import com.yinyang.yin.excel.ExcelColumn;
import com.yinyang.yin.excel.ExcelIgnore;
```

批量替换注解：

```java
@ExcelProperty("字典名称")
@ColumnWidth(20)
```

改为：

```java
@ExcelColumn("字典名称")
```

如果某个字段需要不同列宽，可以写成：

```java
@ExcelColumn(value = "备注说明", width = 40)
```

#### 4. 替换 Controller 调用

原调用：

```java
import com.yinyang.yin.helper.EasyExcelHelper;

EasyExcelHelper.export(response, "user_export", dataList, UserDTO.class, "user");
List<UserDTO> dataList = EasyExcelHelper.readToList(file, UserDTO.class);
```

改为：

```java
import com.yinyang.yin.helper.ExcelHelper;

ExcelHelper.export(response, "user_export", dataList, UserDTO.class, "user");
List<UserDTO> dataList = ExcelHelper.readToList(file, UserDTO.class);
```

#### 5. 更新代码生成模板

需要同步修改：

```text
yin-codegen/src/main/resources/templates/dto.java.vm
yin-codegen/src/main/resources/templates/controller.java.vm
```

DTO 模板改为生成：

```java
import com.yinyang.yin.excel.ExcelColumn;
import com.yinyang.yin.excel.ExcelIgnore;
```

Controller 模板改为生成：

```java
import com.yinyang.yin.helper.ExcelHelper;
```

这样后续通过代码生成器创建的新业务模块，会直接使用 POI 方案。

#### 6. 删除旧 Helper

删除：

```text
yin-admin/src/main/java/com/yinyang/yin/helper/EasyExcelHelper.java
```

新增：

```text
yin-admin/src/main/java/com/yinyang/yin/helper/ExcelHelper.java
```

### 使用方法

#### 1. DTO 字段声明

```java
public class UserDTO {
    @ExcelColumn("用户名")
    private String login;

    @ExcelColumn("邮箱")
    private String email;

    @ExcelColumn("是否激活")
    private Boolean activated;

    @ExcelIgnore
    private String id;
}
```

导出时会生成三列：

```text
用户名 | 邮箱 | 是否激活
```

`id` 不会导出，也不会从导入文件读取。

#### 2. 导出接口

```java
@GetMapping("/export")
public void export(UserQuery query, HttpServletResponse response) {
    try {
        List<UserDTO> dataList = userService.query(query);
        ExcelHelper.export(response, "user_export", dataList, UserDTO.class, "user");
    } catch (Exception e) {
        throw new IllegalStateException("Export users failed", e);
    }
}
```

生成的文件名格式：

```text
user_export_yyyy-MM-dd HH:mm:ss.xlsx
```

文件响应头使用：

```text
Content-Disposition: attachment; filename*=utf-8''xxx.xlsx
```

可以正确处理中文文件名。

#### 3. 导入接口

```java
@PostMapping("/import")
public Result<Void> importExcel(@RequestParam("file") MultipartFile file) {
    try {
        List<UserDTO> dataList = ExcelHelper.readToList(file, UserDTO.class);
        userService.upsert(dataList);
        return Result.ok();
    } catch (Exception e) {
        return Result.fail("Import user excel failed");
    }
}
```

导入文件第一行必须是表头。表头会优先匹配 `@ExcelColumn` 的值，也兼容字段名。

例如 DTO 是：

```java
@ExcelColumn("用户名")
private String login;
```

导入表头可以是：

```text
用户名
```

也可以是：

```text
login
```

#### 4. 支持的数据类型

当前 helper 已处理这些常用类型：

- `String`
- `Boolean` / `boolean`
- `Byte`、`Short`、`Integer`、`Long`
- `Float`、`Double`、`BigDecimal`
- `LocalDateTime`
- `LocalDate`
- `Instant`
- `Enum`

布尔值导入时兼容：

```text
true / false
1 / 0
是 / 否
yes / no
y / n
```

日期时间默认使用：

```text
yyyy-MM-dd HH:mm:ss
```

如果字段上存在：

```java
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
```

导入时也会优先尝试该格式。

### 验证方式

执行：

```powershell
.\mvnw.cmd -q test
```

本次新增了一个窄测试：

```text
yin-admin/src/test/java/com/yinyang/yin/helper/ExcelHelperTests.java
```

测试内容：

- 构造 DTO 数据。
- 通过 `ExcelHelper.export` 导出 xlsx。
- 把导出的字节重新包装成 `MockMultipartFile`。
- 通过 `ExcelHelper.readToList` 读回 DTO。
- 校验普通字段能读回，`@ExcelIgnore` 字段不会读回。

### 注意事项

1. 这套 helper 面向当前后台管理系统的常规导入导出，不是完整替代 EasyExcel 的所有高级能力。
2. 如果后续要处理超大 Excel，应该再扩展为 POI SAX 流式读取，避免一次性把 workbook 放入内存。
3. 如果需要下拉框、合并单元格、多 sheet、复杂样式，建议在 `ExcelHelper` 中按业务场景继续扩展，不要把第三方注解重新泄漏到 DTO。
4. 导入文件的第一行必须是表头，否则字段无法稳定匹配。
5. 代码生成模板已经同步更新，新生成代码会默认使用 `ExcelHelper` 和项目自定义注解。

### 参考

- Apache POI 官网：https://poi.apache.org/
- Apache POI `poi-ooxml` Maven Central：https://central.sonatype.com/artifact/org.apache.poi/poi-ooxml/5.5.1

## 参考资料

- [EasyExcel GitHub 仓库](https://github.com/alibaba/easyexcel)
- [EasyExcel Maven Central 信息](https://central.sonatype.com/artifact/com.alibaba/easyexcel)
- [Spring Boot 3.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide)
- [Spring Framework Multipart 文件上传文档](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/multipart-forms.html)
- [Spring MultipartFile API 文档](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/multipart/MultipartFile.html)
- [Apache POI 官方网站](https://poi.apache.org/)
- [Apache POI SXSSF 流式写入说明](https://poi.apache.org/components/spreadsheet/how-to.html#sxssf)

## 总结

Spring Boot 新版本升级时，EasyExcel 的替换不要从“删依赖”开始，而应该从“收口调用点”开始。

先定义自己的 `ExcelService`，让业务代码不再直接依赖 EasyExcel。然后做旧注解兼容层，保证老 DTO 能继续工作。新代码使用自定义 `@ExcelColumn` 注解，底层用 Apache POI 或其他库实现导入导出。等所有 DTO 迁移完成，再彻底移除 EasyExcel。

这样做的好处是迁移过程可控、接口行为可测试、业务代码不被第三方库锁死。后续无论是升级 Spring Boot、替换 Excel 库，还是增加模板导出、错误回写、多 Sheet、大文件处理，都只需要扩展自己的 Excel 模块。

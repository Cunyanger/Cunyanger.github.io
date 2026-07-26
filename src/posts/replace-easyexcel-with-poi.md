---
title: Spring Boot 3.5 替换 EasyExcel：改用 Apache POI 实现 Excel 导入导出
date: 2026-07-24
category: Java
tag:
  - Spring Boot
  - Excel
  - Apache POI
  - EasyExcel
isOriginal: true
excerpt: 记录在 Spring Boot 3.5 项目中移除 EasyExcel、改用 Apache POI 和自定义注解完成 Excel 导入导出的完整改造过程。
---

# Spring Boot 3.5 替换 EasyExcel：改用 Apache POI 实现 Excel 导入导出

## 背景

当前项目已经升级到 Spring Boot 3.5.x。原来的 Excel 功能依赖 `com.alibaba:easyexcel:3.3.4`，它会传递较旧版本的 Apache POI 依赖。在新 Spring Boot、Java 21 和安全依赖持续升级的场景下，后续维护成本会变高。

这次改造的目标是：

- 去掉 EasyExcel 依赖，不再使用 `com.alibaba.excel.*` 包。
- 使用 Apache POI `poi-ooxml` 直接读写 `.xlsx`。
- 保留原来的 Controller 调用习惯，导出和导入仍然通过一个 helper 完成。
- 把 Excel 字段元数据改成项目自己的注解，避免业务 DTO 绑定第三方框架注解。
- 同步更新代码生成模板，后续生成的新模块默认使用新 Excel 方案。

## 改写思路

### 1. 依赖层面

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

### 2. 注解层面

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

### 3. Helper 层面

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

## 改写步骤

### 1. 替换 Maven 依赖

从 `pom.xml` 删除：

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

### 2. 新增项目自定义注解

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

### 3. 替换 DTO 注解

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

### 4. 替换 Controller 调用

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

### 5. 更新代码生成模板

需要同步修改：

```text
yin-generator/src/main/resources/templates/dto.java.vm
yin-generator/src/main/resources/templates/controller.java.vm
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

### 6. 删除旧 Helper

删除：

```text
yin-admin/src/main/java/com/yinyang/yin/helper/EasyExcelHelper.java
```

新增：

```text
yin-admin/src/main/java/com/yinyang/yin/helper/ExcelHelper.java
```

## 使用方法

### 1. DTO 字段声明

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

### 2. 导出接口

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

### 3. 导入接口

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

### 4. 支持的数据类型

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

## 验证方式

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

## 注意事项

1. 这套 helper 面向当前后台管理系统的常规导入导出，不是完整替代 EasyExcel 的所有高级能力。
2. 如果后续要处理超大 Excel，应该再扩展成 POI SAX 流式读取，避免一次性把 workbook 放入内存。
3. 如果需要下拉框、合并单元格、多 sheet、复杂样式，建议在 `ExcelHelper` 中按业务场景继续扩展，不要把第三方注解重新泄漏到 DTO。
4. 导入文件的第一行必须是表头，否则字段无法稳定匹配。
5. 代码生成模板已经同步更新，新生成代码会默认使用 `ExcelHelper` 和项目自定义注解。

## 参考资料

- [Apache POI 官网](https://poi.apache.org/)
- [Apache POI poi-ooxml Maven Central](https://central.sonatype.com/artifact/org.apache.poi/poi-ooxml/5.5.1)

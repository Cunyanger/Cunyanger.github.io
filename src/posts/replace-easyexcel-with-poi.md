# Spring Boot 3.5 鏇挎崲 EasyExcel锛氭敼鐢?Apache POI 瀹炵幇 Excel 瀵煎叆瀵煎嚭

## 鑳屾櫙

褰撳墠椤圭洰宸茬粡鍗囩骇鍒?Spring Boot 3.5.x銆傚師鏉ョ殑 Excel 鍔熻兘渚濊禆 `com.alibaba:easyexcel:3.3.4`锛屽畠浼氫紶閫掕緝鏃х増鏈殑 Apache POI 渚濊禆锛屽湪鏂?Spring Boot銆丣ava 21 鍜屽畨鍏ㄤ緷璧栨寔缁崌绾х殑鍦烘櫙涓嬶紝鍚庣画缁存姢鎴愭湰浼氬彉楂樸€?
杩欐鏀归€犵殑鐩爣鏄細

- 鍘绘帀 EasyExcel 渚濊禆锛屼笉鍐嶄娇鐢?`com.alibaba.excel.*` 鍖呫€?- 浣跨敤 Apache POI `poi-ooxml` 鐩存帴璇诲啓 `.xlsx`銆?- 淇濈暀鍘熸潵鐨?Controller 璋冪敤涔犳儻锛屽鍑哄拰瀵煎叆浠嶇劧閫氳繃涓€涓?helper 瀹屾垚銆?- 鎶?Excel 瀛楁鍏冩暟鎹敼鎴愰」鐩嚜宸辩殑娉ㄨВ锛岄伩鍏嶄笟鍔?DTO 缁戝畾绗笁鏂规鏋舵敞瑙ｃ€?- 鍚屾鏇存柊浠ｇ爜鐢熸垚妯℃澘锛屽悗缁敓鎴愮殑鏂版ā鍧楅粯璁や娇鐢ㄦ柊 Excel 鏂规銆?
## 鏀瑰啓鎬濊矾

### 1. 渚濊禆灞傞潰

EasyExcel 鐨勪紭鍔挎槸灏佽杈冮珮锛屼絾椤圭洰褰撳墠 Excel 闇€姹傛瘮杈冩槑纭細

- 鏍规嵁 DTO 瀛楁瀵煎嚭琛ㄥご鍜屾暟鎹€?- 鏍规嵁绗竴琛岃〃澶存妸 Excel 鍐呭璇诲洖 DTO銆?- 鏀寔甯歌绫诲瀷锛屼緥濡?`String`銆佹暟瀛椼€乣Boolean`銆乣LocalDateTime`銆乣LocalDate`銆乣Instant`銆?- 鏀寔蹇界暐鍐呴儴瀛楁锛屼緥濡?`id`銆佸璁″瓧娈点€佹爲褰?`children`銆?
杩欎簺鑳藉姏鐢?Apache POI 鍙互鐩存帴瀹炵幇锛屼笉闇€瑕佺户缁繚鐣?EasyExcel銆?
鐖跺伐绋嬬粺涓€绠＄悊 POI 鐗堟湰锛?
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

瀹為檯璇诲啓 Excel 鐨?`yin-admin` 妯″潡寮曞叆锛?
```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
</dependency>
```

`yin-system` 涓嶅啀渚濊禆 EasyExcel銆侱TO 鍙緷璧?`yin-common` 涓殑椤圭洰鑷畾涔夋敞瑙ｃ€?
### 2. 娉ㄨВ灞傞潰

鍘熸潵 DTO 閲屼娇鐢ㄧ殑鏄?EasyExcel 娉ㄨВ锛?
```java
@ExcelProperty("鐢ㄦ埛鍚?)
@ColumnWidth(20)
private String login;

@ExcelIgnore
private String id;
```

鐜板湪鏀规垚椤圭洰鑷繁鐨勬敞瑙ｏ細

```java
@ExcelColumn("鐢ㄦ埛鍚?)
private String login;

@ExcelIgnore
private String id;
```

涓や釜娉ㄨВ鏀惧湪 `yin-common`锛?
```text
yin-common/src/main/java/com/yinyang/yin/excel
鈹溾攢鈹€ ExcelColumn.java
鈹斺攢鈹€ ExcelIgnore.java
```

`@ExcelColumn` 璐熻矗澹版槑琛ㄥご鍚嶅拰鍒楀锛?
```java
@ExcelColumn(value = "鐢ㄦ埛鍚?, width = 20)
```

濡傛灉娌℃湁鍐?`width`锛岄粯璁や娇鐢?`20`銆傝繖绛変环浜庡師鏉ョ殑 `@ColumnWidth(20)` 甯歌鐢ㄦ硶銆?
### 3. Helper 灞傞潰

鍘熸潵鐨勫伐鍏风被鏄細

```java
EasyExcelHelper.export(...)
EasyExcelHelper.readToList(...)
```

鐜板湪鏇挎崲涓猴細

```java
ExcelHelper.export(...)
ExcelHelper.readToList(...)
```

鏂?helper 浣嶇疆锛?
```text
yin-admin/src/main/java/com/yinyang/yin/helper/ExcelHelper.java
```

瀵煎嚭娴佺▼锛?
1. 鏍规嵁 DTO class 鍙嶅皠璇诲彇瀛楁銆?2. 璺宠繃 `@ExcelIgnore` 瀛楁銆?3. 濡傛灉瀛楁鏈?`@ExcelColumn`锛岀敤娉ㄨВ鍊间綔涓鸿〃澶达紱鍚﹀垯鐢ㄥ瓧娈靛悕浣滀负琛ㄥご銆?4. 鍒涘缓 `XSSFWorkbook` 鍜?sheet銆?5. 鍐欏叆琛ㄥご銆佸喕缁撻琛屻€佽缃熀纭€鏍峰紡鍜屽垪瀹姐€?6. 鍐欏叆鏁版嵁琛屻€?7. 閫氳繃 `HttpServletResponse` 杈撳嚭 `.xlsx` 鏂囦欢銆?
瀵煎叆娴佺▼锛?
1. 浣跨敤 `WorkbookFactory.create(file.getInputStream())` 璇诲彇涓婁紶鏂囦欢銆?2. 璇诲彇绗竴涓?sheet銆?3. 鐢ㄧ涓€琛岃〃澶村尮閰?DTO 瀛楁銆?4. 浠庣浜岃寮€濮嬮€愯璇诲彇銆?5. 鎸夊瓧娈电被鍨嬭浆鎹㈠崟鍏冩牸鍊笺€?6. 鍙嶅皠鍒涘缓 DTO 瀹炰緥骞跺啓鍏ュ瓧娈点€?7. 杩斿洖 `List<T>` 缁欎笟鍔?service 鎵归噺淇濆瓨鎴栨洿鏂般€?
## 鏀瑰啓姝ラ

### 1. 鏇挎崲 Maven 渚濊禆

鏍?`pom.xml` 鍒犻櫎锛?
```xml
<easyexcel.version>3.3.4</easyexcel.version>
```

浠ュ強锛?
```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>easyexcel</artifactId>
    <version>${easyexcel.version}</version>
</dependency>
```

鏂板锛?
```xml
<poi.version>5.5.1</poi.version>
```

鍜岋細

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>${poi.version}</version>
</dependency>
```

`yin-admin/pom.xml` 鍒犻櫎 EasyExcel锛屾柊澧?POI锛?
```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
</dependency>
```

`yin-system/pom.xml` 鍒犻櫎 EasyExcel锛屽洜涓?DTO 涓嶅簲璇ヤ负浜嗘敞瑙ｄ緷璧?Excel 璇诲啓搴撱€?
### 2. 鏂板椤圭洰鑷畾涔夋敞瑙?
鏂板 `ExcelColumn`锛?
```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface ExcelColumn {
    String value();
    int width() default 20;
}
```

鏂板 `ExcelIgnore`锛?
```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface ExcelIgnore {
}
```

### 3. 鏇挎崲 DTO 娉ㄨВ

鎵归噺鏇挎崲瀵煎叆锛?
```java
import com.alibaba.excel.annotation.ExcelIgnore;
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.write.style.ColumnWidth;
```

鏀逛负锛?
```java
import com.yinyang.yin.excel.ExcelColumn;
import com.yinyang.yin.excel.ExcelIgnore;
```

鎵归噺鏇挎崲娉ㄨВ锛?
```java
@ExcelProperty("瀛楀吀鍚嶇О")
@ColumnWidth(20)
```

鏀逛负锛?
```java
@ExcelColumn("瀛楀吀鍚嶇О")
```

濡傛灉鏌愪釜瀛楁闇€瑕佷笉鍚屽垪瀹斤紝鍙互鍐欐垚锛?
```java
@ExcelColumn(value = "澶囨敞璇存槑", width = 40)
```

### 4. 鏇挎崲 Controller 璋冪敤

鍘熻皟鐢細

```java
import com.yinyang.yin.helper.EasyExcelHelper;

EasyExcelHelper.export(response, "user_export", dataList, UserDTO.class, "user");
List<UserDTO> dataList = EasyExcelHelper.readToList(file, UserDTO.class);
```

鏀逛负锛?
```java
import com.yinyang.yin.helper.ExcelHelper;

ExcelHelper.export(response, "user_export", dataList, UserDTO.class, "user");
List<UserDTO> dataList = ExcelHelper.readToList(file, UserDTO.class);
```

### 5. 鏇存柊浠ｇ爜鐢熸垚妯℃澘

闇€瑕佸悓姝ヤ慨鏀癸細

```text
yin-generator/src/main/resources/templates/dto.java.vm
yin-generator/src/main/resources/templates/controller.java.vm
```

DTO 妯℃澘鏀逛负鐢熸垚锛?
```java
import com.yinyang.yin.excel.ExcelColumn;
import com.yinyang.yin.excel.ExcelIgnore;
```

Controller 妯℃澘鏀逛负鐢熸垚锛?
```java
import com.yinyang.yin.helper.ExcelHelper;
```

杩欐牱鍚庣画閫氳繃浠ｇ爜鐢熸垚鍣ㄥ垱寤虹殑鏂颁笟鍔℃ā鍧楋紝浼氱洿鎺ヤ娇鐢?POI 鏂规銆?
### 6. 鍒犻櫎鏃?Helper

鍒犻櫎锛?
```text
yin-admin/src/main/java/com/yinyang/yin/helper/EasyExcelHelper.java
```

鏂板锛?
```text
yin-admin/src/main/java/com/yinyang/yin/helper/ExcelHelper.java
```

## 浣跨敤鏂规硶

### 1. DTO 瀛楁澹版槑

```java
public class UserDTO {
    @ExcelColumn("鐢ㄦ埛鍚?)
    private String login;

    @ExcelColumn("閭")
    private String email;

    @ExcelColumn("鏄惁婵€娲?)
    private Boolean activated;

    @ExcelIgnore
    private String id;
}
```

瀵煎嚭鏃朵細鐢熸垚涓夊垪锛?
```text
鐢ㄦ埛鍚?| 閭 | 鏄惁婵€娲?```

`id` 涓嶄細瀵煎嚭锛屼篃涓嶄細浠庡鍏ユ枃浠惰鍙栥€?
### 2. 瀵煎嚭鎺ュ彛

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

鐢熸垚鐨勬枃浠跺悕鏍煎紡锛?
```text
user_export_yyyy-MM-dd HH:mm:ss.xlsx
```

鏂囦欢鍝嶅簲澶翠娇鐢細

```text
Content-Disposition: attachment; filename*=utf-8''xxx.xlsx
```

鍙互姝ｇ‘澶勭悊涓枃鏂囦欢鍚嶃€?
### 3. 瀵煎叆鎺ュ彛

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

瀵煎叆鏂囦欢绗竴琛屽繀椤绘槸琛ㄥご銆傝〃澶翠細浼樺厛鍖归厤 `@ExcelColumn` 鐨勫€硷紝涔熷吋瀹瑰瓧娈靛悕銆?
渚嬪 DTO 鏄細

```java
@ExcelColumn("鐢ㄦ埛鍚?)
private String login;
```

瀵煎叆琛ㄥご鍙互鏄細

```text
鐢ㄦ埛鍚?```

涔熷彲浠ユ槸锛?
```text
login
```

### 4. 鏀寔鐨勬暟鎹被鍨?
褰撳墠 helper 宸插鐞嗚繖浜涘父鐢ㄧ被鍨嬶細

- `String`
- `Boolean` / `boolean`
- `Byte`銆乣Short`銆乣Integer`銆乣Long`
- `Float`銆乣Double`銆乣BigDecimal`
- `LocalDateTime`
- `LocalDate`
- `Instant`
- `Enum`

甯冨皵鍊煎鍏ユ椂鍏煎锛?
```text
true / false
1 / 0
鏄?/ 鍚?yes / no
y / n
```

鏃ユ湡鏃堕棿榛樿浣跨敤锛?
```text
yyyy-MM-dd HH:mm:ss
```

濡傛灉瀛楁涓婂瓨鍦細

```java
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
```

瀵煎叆鏃朵篃浼氫紭鍏堝皾璇曡鏍煎紡銆?
## 楠岃瘉鏂瑰紡

鎵ц锛?
```powershell
.\mvnw.cmd -q test
```

鏈鏂板浜嗕竴涓獎娴嬭瘯锛?
```text
yin-admin/src/test/java/com/yinyang/yin/helper/ExcelHelperTests.java
```

娴嬭瘯鍐呭锛?
- 鏋勯€?DTO 鏁版嵁銆?- 閫氳繃 `ExcelHelper.export` 瀵煎嚭 xlsx銆?- 鎶婂鍑虹殑瀛楄妭閲嶆柊鍖呰鎴?`MockMultipartFile`銆?- 閫氳繃 `ExcelHelper.readToList` 璇诲洖 DTO銆?- 鏍￠獙鏅€氬瓧娈佃兘璇诲洖锛宍@ExcelIgnore` 瀛楁涓嶄細璇诲洖銆?
## 娉ㄦ剰浜嬮」

1. 杩欏 helper 闈㈠悜褰撳墠鍚庡彴绠＄悊绯荤粺鐨勫父瑙勫鍏ュ鍑猴紝涓嶆槸瀹屾暣鏇夸唬 EasyExcel 鐨勬墍鏈夐珮绾ц兘鍔涖€?2. 濡傛灉鍚庣画瑕佸鐞嗚秴澶?Excel锛屽簲璇ュ啀鎵╁睍涓?POI SAX 娴佸紡璇诲彇锛岄伩鍏嶄竴娆℃€ф妸 workbook 鏀惧叆鍐呭瓨銆?3. 濡傛灉闇€瑕佷笅鎷夋銆佸悎骞跺崟鍏冩牸銆佸 sheet銆佸鏉傛牱寮忥紝寤鸿鍦?`ExcelHelper` 涓寜涓氬姟鍦烘櫙缁х画鎵╁睍锛屼笉瑕佹妸绗笁鏂规敞瑙ｉ噸鏂版硠婕忓埌 DTO銆?4. 瀵煎叆鏂囦欢鐨勭涓€琛屽繀椤绘槸琛ㄥご锛屽惁鍒欏瓧娈垫棤娉曠ǔ瀹氬尮閰嶃€?5. 浠ｇ爜鐢熸垚妯℃澘宸茬粡鍚屾鏇存柊锛屾柊鐢熸垚浠ｇ爜浼氶粯璁や娇鐢?`ExcelHelper` 鍜岄」鐩嚜瀹氫箟娉ㄨВ銆?
## 鍙傝€?
- Apache POI 瀹樼綉锛歨ttps://poi.apache.org/
- Apache POI `poi-ooxml` Maven Central锛歨ttps://central.sonatype.com/artifact/org.apache.poi/poi-ooxml/5.5.1


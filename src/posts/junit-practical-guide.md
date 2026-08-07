---
title: JUnit 从入门到工程实践：背景、用法、验证示例与测试规范
date: 2026-08-07
category: Java
tag:
  - Java
  - JUnit
  - 单元测试
  - 自动化测试
  - Mockito
  - Spring Boot
isOriginal: true
excerpt: 系统讲解 JUnit 的诞生背景、JUnit Platform 与 Jupiter 架构、常用注解和断言、参数化测试、异常测试、Mockito 与 Spring Boot 集成，并通过一个可运行示例总结 Java 项目的测试流程和编码规范。
---

# JUnit 从入门到工程实践：背景、用法、验证示例与测试规范

很多 Java 工程师第一次接触 JUnit，是因为项目里有一个 `src/test/java` 目录，或者构建失败时看到一句 `Tests run: 1, Failures: 1`。如果只是把 JUnit 理解成“调用方法，再断言结果”，很容易写出大量脆弱、缓慢、没有实际保护作用的测试。

JUnit 真正解决的是一个工程问题：**如何用可重复执行的代码，快速证明另一段代码仍然符合预期。**

本文以 Java 17+ 和现代 JUnit Jupiter 写法为主。JUnit 6 项目可以直接使用文中的配置；仍在使用 JUnit 5 的项目只需采用对应的 5.x 版本，核心注解、断言和测试结构基本一致。

## 一、JUnit 的背景

### 1. 从手工验证到自动化测试

没有测试框架时，开发者通常这样验证代码：

```java
public static void main(String[] args) {
    Calculator calculator = new Calculator();
    int result = calculator.add(2, 3);
    System.out.println(result);
}
```

这种方式能看到结果，但存在明显问题：

- 需要人工观察输出，无法自动判断成功或失败。
- 每次修改后要手动重复操作。
- 测试数据、执行步骤和预期结果没有统一结构。
- 很难一次运行几百、几千个验证场景。
- 无法自然接入 Maven、Gradle 和 CI/CD。

测试框架把验证过程标准化为三件事：准备条件、执行行为、检查结果。只要任何检查不符合预期，构建就可以立即失败。

### 2. xUnit 家族

JUnit 属于 xUnit 测试框架家族。xUnit 的思想可以追溯到 Kent Beck 为 Smalltalk 编写的 SUnit。后来 Kent Beck 与 Erich Gamma 将这种模式带到 Java，形成了 JUnit。

它建立了几个影响深远的约定：

- 每个测试用例都可以独立执行。
- 测试前后可以运行固定的初始化和清理逻辑。
- 通过断言表达预期结果。
- 测试执行器负责发现、运行并汇总结果。
- 测试失败与测试程序本身出错要能够区分。

这套思想后来也影响了其他语言，例如 .NET 的 NUnit、Python 的 unittest、PHP 的 PHPUnit。

### 3. JUnit 的主要版本演进

| 版本 | 典型特征 | 工程意义 |
| --- | --- | --- |
| JUnit 3 | 测试类继承 `TestCase`，测试方法以 `test` 开头 | 建立了 Java 自动化测试的基础约定 |
| JUnit 4 | 引入 `@Test`、`@Before`、`@After` 等注解 | 测试不再依赖继承和方法命名 |
| JUnit 5 | 拆分为 Platform、Jupiter、Vintage | 测试发现、执行、扩展模型更加现代化 |
| JUnit 6 | 以 Java 17 为基线，延续 Platform/Jupiter 架构 | 清理历史兼容负担，适合现代 Java 项目 |

老项目里常见 JUnit 4：

```java
import org.junit.Test;

public class CalculatorTest {

    @Test
    public void testAdd() {
        // ...
    }
}
```

现代 Jupiter 使用的是 `org.junit.jupiter.api`：

```java
import org.junit.jupiter.api.Test;

class CalculatorTest {

    @Test
    void addReturnsSum() {
        // ...
    }
}
```

迁移时要特别注意导入包。`org.junit.Test` 是 JUnit 4，`org.junit.jupiter.api.Test` 才是 Jupiter。

## 二、JUnit 的作用

### 1. 提供快速反馈

一个纯业务单元测试通常在毫秒级完成。修改计算公式、校验条件或状态转换后，不必启动整个应用就能知道是否破坏了既有行为。

### 2. 防止回归

修复缺陷时，先写一个能够复现问题的测试，再修改生产代码。这个测试会成为永久的回归保护，防止同类问题以后再次出现。

### 3. 支持安全重构

重构会改变代码结构，但不应改变外部行为。稳定的测试套件相当于安全网，让工程师敢于拆分大方法、替换算法、调整依赖关系。

### 4. 促使代码可测试、可维护

如果一个类很难测试，往往意味着它承担了过多职责，或者把时间、随机数、网络、数据库等外部因素写死在内部。为了测试而进行的依赖注入和职责拆分，通常也会改善生产代码设计。

### 5. 成为可执行文档

相比注释，测试直接展示了输入、行为和预期输出，而且可以被执行。例如：

```java
@Test
void vipMemberReceivesTenPercentDiscount() {
    // ...
}
```

方法名已经说明了一条业务规则，并且测试可以证明这条规则目前仍然成立。

### 6. 接入工程质量流程

JUnit 可以被 Maven、Gradle、IDE 和 CI 平台统一执行。团队可以规定：测试未通过时禁止合并代码、发布制品或部署环境。

需要注意：JUnit 不能证明软件完全没有缺陷。它只能证明“已经编写的这些场景，在当前环境下通过了”。测试质量仍然取决于场景选择、断言内容和测试边界。

## 三、JUnit 现代架构

从 JUnit 5 开始，JUnit 不再只是一个单体测试库，而是分为三个主要部分。

### 1. JUnit Platform

Platform 是测试运行基础设施，负责：

- 发现测试。
- 启动测试引擎。
- 组织测试树和执行结果。
- 向 IDE、Maven Surefire、Gradle 等工具提供统一接口。

### 2. JUnit Jupiter

Jupiter 是现代 JUnit 的编程模型和执行引擎，提供：

- `@Test` 等注解。
- `Assertions` 断言。
- 参数化测试。
- 嵌套测试。
- 扩展模型 `Extension`。

日常所说的“写 JUnit 5/6 测试”，大多数时候就是在使用 Jupiter。

### 3. JUnit Vintage

Vintage 用于在 Platform 上运行历史 JUnit 3/4 测试，主要服务于老项目迁移。新代码不应继续按 JUnit 3/4 风格编写；迁移完成后，也应逐步移除兼容引擎。

可以把三者关系理解为：

```text
IDE / Maven / Gradle / CI
          │
     JUnit Platform
          │
   ┌──────┴────────┐
   │               │
Jupiter Engine   旧测试兼容引擎
   │
现代 JUnit 测试
```

## 四、如何接入项目

### 1. Maven 项目

Java 17+ 项目可以使用 JUnit BOM 统一管理各模块版本。下面以 JUnit 6.0.3 为例：

```xml
<properties>
    <maven.compiler.release>17</maven.compiler.release>
    <junit.version>6.0.3</junit.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.junit</groupId>
            <artifactId>junit-bom</artifactId>
            <version>${junit.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>3.5.4</version>
        </plugin>
    </plugins>
</build>
```

执行全部测试：

```bash
mvn test
```

执行一个测试类：

```bash
mvn -Dtest=OrderAmountCalculatorTest test
```

执行一个测试方法：

```bash
mvn -Dtest=OrderAmountCalculatorTest#vipMemberReceivesTenPercentDiscount test
```

### 2. Gradle 项目

```groovy
dependencies {
    testImplementation(platform("org.junit:junit-bom:6.0.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

test {
    useJUnitPlatform()
}
```

执行：

```bash
./gradlew test
```

Windows 环境通常执行：

```powershell
.\gradlew.bat test
```

### 3. Spring Boot 项目

Spring Boot 项目通常只需要：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

Starter 已经整合 JUnit Jupiter、Spring Test、AssertJ、Mockito 等测试工具。版本应交给 Spring Boot 的依赖管理，不要随意单独覆盖，否则可能造成 Platform、Jupiter Engine 和构建插件不兼容。

### 4. 推荐目录

测试包与生产代码包保持一致：

```text
src
├── main
│   └── java
│       └── com/example/order
│           └── OrderAmountCalculator.java
└── test
    └── java
        └── com/example/order
            └── OrderAmountCalculatorTest.java
```

同包测试可以访问包级可见成员，但不要为了测试把本应私有的实现细节改成 `public`。

## 五、一个测试的基本结构

推荐使用 AAA 结构：

```java
@Test
void addTwoNumbersReturnsSum() {
    // Arrange：准备对象和输入
    Calculator calculator = new Calculator();

    // Act：只执行要验证的行为
    int actual = calculator.add(2, 3);

    // Assert：检查可观察结果
    assertEquals(5, actual);
}
```

AAA 分别代表：

- Arrange：准备测试对象、依赖和数据。
- Act：执行被测行为。
- Assert：验证返回值、状态变化或协作行为。

行为驱动风格也常写成 Given、When、Then，本质相同。关键是让阅读者能快速分辨“前提、动作、结果”。

## 六、常用注解和生命周期

### 1. `@Test`

标记一个普通测试方法：

```java
@Test
void emptyCartHasZeroAmount() {
    assertEquals(BigDecimal.ZERO, cart.totalAmount());
}
```

Jupiter 的测试类和测试方法可以使用包级可见性，不必写 `public`。

### 2. `@BeforeEach` 和 `@AfterEach`

每个测试方法执行前后运行：

```java
class CartTest {

    private Cart cart;

    @BeforeEach
    void setUp() {
        cart = new Cart();
    }

    @AfterEach
    void tearDown() {
        cart.clear();
    }
}
```

默认情况下，JUnit 会为每个测试方法创建新的测试类实例，因此实例字段不会在测试间共享。这个默认隔离机制应尽量保留。

### 3. `@BeforeAll` 和 `@AfterAll`

整个测试类执行前后只运行一次。默认必须是静态方法：

```java
@BeforeAll
static void startServer() {
    // 启动成本较高的共享资源
}

@AfterAll
static void stopServer() {
    // 释放共享资源
}
```

不要因为方便就把可变业务数据放到共享静态字段中，否则测试顺序变化后可能互相污染。

### 4. `@DisplayName`

提供更易读的报告名称：

```java
@Test
@DisplayName("余额不足时应拒绝转账")
void transferFailsWhenBalanceIsInsufficient() {
    // ...
}
```

团队可以选择中文展示名或完整英文方法名，但应保持统一。

### 5. `@Nested`

按业务场景组织测试：

```java
class AccountTest {

    @Nested
    class Withdraw {

        @Test
        void succeedsWhenBalanceIsEnough() {
        }

        @Test
        void failsWhenBalanceIsInsufficient() {
        }
    }
}
```

它适合一个类包含多个行为、每个行为又有多种场景的情况。

### 6. `@Disabled`

临时禁用测试：

```java
@Disabled("等待外部接口测试环境恢复，关联任务 TEST-128")
@Test
void callsRemoteService() {
}
```

禁用测试必须说明原因并关联处理任务，不能让 `@Disabled` 成为永久墓地。

## 七、常用断言

JUnit 的断言位于 `org.junit.jupiter.api.Assertions`。

```java
import static org.junit.jupiter.api.Assertions.*;
```

常用断言如下：

```java
assertEquals(expected, actual);
assertNotEquals(unexpected, actual);
assertTrue(condition);
assertFalse(condition);
assertNull(value);
assertNotNull(value);
assertSame(expectedReference, actualReference);
assertNotSame(unexpectedReference, actualReference);
assertIterableEquals(expectedList, actualList);
assertArrayEquals(expectedArray, actualArray);
```

注意参数顺序是 `expected` 在前、`actual` 在后。错误顺序虽然不影响比较，却会让失败报告难以理解。

可以添加失败消息，并使用 lambda 避免成功时构造无用字符串：

```java
assertEquals(
        expected,
        actual,
        () -> "订单 " + orderId + " 的金额不正确"
);
```

### 组合断言

当多个断言共同描述同一个结果对象时，可以使用 `assertAll`：

```java
assertAll(
        () -> assertEquals("PAID", order.getStatus()),
        () -> assertNotNull(order.getPaidAt()),
        () -> assertEquals("user-1", order.getPaidBy())
);
```

普通连续断言会在第一个失败处停止；`assertAll` 会收集组内所有失败，便于一次看到完整差异。

### 浮点数与金额

浮点数通常要指定误差：

```java
assertEquals(0.3, 0.1 + 0.2, 0.000001);
```

金额应优先使用 `BigDecimal`。`BigDecimal.equals` 会比较数值和小数位：

```java
assertNotEquals(new BigDecimal("10.0"), new BigDecimal("10.00"));
```

如果业务只关心数值，可以统一 `setScale`，或判断 `compareTo`：

```java
assertEquals(0, actual.compareTo(new BigDecimal("10.00")));
```

## 八、异常、超时和前置条件测试

### 1. 验证异常

不要用 `try-catch` 后忘记调用 `fail()`。使用 `assertThrows`：

```java
IllegalArgumentException exception = assertThrows(
        IllegalArgumentException.class,
        () -> service.createOrder(null)
);

assertEquals("订单不能为空", exception.getMessage());
```

除了异常类型，还应在有业务意义时验证消息、错误码或异常携带的数据。

确认不抛异常：

```java
assertDoesNotThrow(() -> service.refreshCache());
```

### 2. 验证超时

```java
assertTimeout(
        Duration.ofMillis(200),
        () -> reportService.generateSummary()
);
```

`assertTimeout` 会在当前线程执行代码，结束后判断耗时。`assertTimeoutPreemptively` 会尝试在超时后中断另一个线程，但可能丢失 `ThreadLocal`、事务上下文和安全上下文，在 Spring 事务测试中尤其需要谨慎。

超时断言不应设置得过紧，否则不同性能的 CI 机器会产生不稳定测试。

### 3. 使用假设跳过不满足条件的环境

```java
assumeTrue(System.getenv("CI") != null);
```

假设不成立时，测试会被跳过而不是失败。假设适合环境条件，不应被用来绕过业务断言。

## 九、参数化测试

当同一行为需要验证多组数据时，不要复制多个几乎相同的测试。

### 1. `@ValueSource`

```java
@ParameterizedTest
@ValueSource(strings = {"", " ", "\t", "\n"})
void blankUsernameIsRejected(String username) {
    assertThrows(
            IllegalArgumentException.class,
            () -> userService.create(username)
    );
}
```

### 2. `@CsvSource`

```java
@ParameterizedTest(name = "{0} + {1} = {2}")
@CsvSource({
        "1, 2, 3",
        "0, 0, 0",
        "-1, 1, 0"
})
void addReturnsExpectedResult(int left, int right, int expected) {
    assertEquals(expected, calculator.add(left, right));
}
```

### 3. `@MethodSource`

复杂对象适合由方法提供：

```java
@ParameterizedTest
@MethodSource("invalidOrders")
void invalidOrderIsRejected(Order order) {
    assertThrows(IllegalArgumentException.class, () -> service.create(order));
}

static Stream<Order> invalidOrders() {
    return Stream.of(
            null,
            new Order(List.of()),
            new Order(List.of(new OrderItem("A", -1)))
    );
}
```

参数化测试的每组数据都是独立测试，报告能明确指出哪一组失败。

## 十、其他实用能力

### 1. 临时目录 `@TempDir`

测试文件读写时，不要写死桌面路径或项目目录：

```java
@TempDir
Path tempDir;

@Test
void reportIsWrittenToFile() throws IOException {
    Path report = tempDir.resolve("report.txt");

    Files.writeString(report, "success");

    assertEquals("success", Files.readString(report));
}
```

JUnit 会为测试创建隔离目录并负责清理。

### 2. 重复测试 `@RepeatedTest`

```java
@RepeatedTest(10)
void generatedIdIsNeverBlank() {
    assertFalse(idGenerator.nextId().isBlank());
}
```

它可以用于初步发现随机性问题，但不能代替专门的并发测试或性质测试框架。

### 3. 标签 `@Tag`

```java
@Tag("integration")
@Test
void savesOrderToDatabase() {
}
```

团队可以将快速单元测试与集成测试分组，在不同流水线阶段执行。标签应采用固定词汇，例如 `unit`、`integration`、`slow`，不要每个人自创一套名称。

### 4. 动态测试

`@TestFactory` 可以根据运行时数据生成测试：

```java
@TestFactory
Stream<DynamicTest> supportedCurrencies() {
    return Stream.of("CNY", "USD", "EUR")
            .map(currency -> dynamicTest(
                    "supports " + currency,
                    () -> assertTrue(service.supports(currency))
            ));
}
```

普通参数化测试已经足够时，不要为了“动态”而增加复杂度。

## 十一、JUnit 与 Mockito

JUnit 负责测试生命周期、执行和断言；Mockito 负责创建测试替身。两者职责不同。

Maven 依赖：

```xml
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

示例：

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void findExistingUserReturnsUser() {
        User expected = new User(1L, "Alice");
        when(userRepository.findById(1L)).thenReturn(Optional.of(expected));

        User actual = userService.findById(1L);

        assertEquals(expected, actual);
        verify(userRepository).findById(1L);
    }
}
```

Mock 的适用对象通常是数据库仓储、远程客户端、消息发布器、邮件服务等外部协作者。不要 Mock `String`、DTO、集合和值对象，也不要把被测类本身 Mock 掉。

过度验证调用顺序和内部方法会把测试绑定到实现细节。优先断言可观察结果；只有“是否发送消息”“是否调用外部系统”本身就是业务行为时，再使用 `verify`。

## 十二、JUnit 与 Spring Boot 测试

Spring Boot 提供不同范围的测试方式：

| 测试方式 | 启动范围 | 适合验证 |
| --- | --- | --- |
| 纯 JUnit + Mockito | 不启动 Spring | 领域规则、计算逻辑、服务分支 |
| `@WebMvcTest` | MVC 切片 | Controller、参数校验、JSON、状态码 |
| `@DataJpaTest` | JPA 切片 | Entity 映射、Repository 查询 |
| `@JsonTest` | JSON 切片 | Jackson 序列化与反序列化 |
| `@SpringBootTest` | 完整上下文 | 跨层集成、配置装配、关键主流程 |

不要默认给所有测试加 `@SpringBootTest`。如果只测试一个计算方法，启动完整 Spring 容器只会让测试变慢，并掩盖类之间不合理的耦合。

推荐顺序是：能用纯 JUnit 就用纯 JUnit；需要框架能力时使用切片测试；只有验证完整装配和跨层流程时才使用 `@SpringBootTest`。

## 十三、完整验证示例：订单金额计算

下面通过一个订单金额计算器演示普通场景、会员折扣、参数化测试和异常验证。

业务规则如下：

- 订单至少包含一个商品。
- 商品单价不能为负数。
- 商品数量必须大于零。
- 普通会员按原价结算。
- VIP 会员享受九折。
- 最终金额保留两位小数，使用四舍五入。

### 1. 生产代码

`MemberLevel.java`：

```java
package com.example.order;

public enum MemberLevel {
    NORMAL,
    VIP
}
```

`OrderItem.java`：

```java
package com.example.order;

import java.math.BigDecimal;

public record OrderItem(String sku, BigDecimal unitPrice, int quantity) {
}
```

`OrderAmountCalculator.java`：

```java
package com.example.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

public class OrderAmountCalculator {

    private static final BigDecimal VIP_DISCOUNT = new BigDecimal("0.90");

    public BigDecimal calculate(List<OrderItem> items, MemberLevel memberLevel) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("订单至少包含一个商品");
        }
        Objects.requireNonNull(memberLevel, "会员等级不能为空");

        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderItem item : items) {
            validate(item);
            BigDecimal itemAmount = item.unitPrice()
                    .multiply(BigDecimal.valueOf(item.quantity()));
            subtotal = subtotal.add(itemAmount);
        }

        BigDecimal finalAmount = memberLevel == MemberLevel.VIP
                ? subtotal.multiply(VIP_DISCOUNT)
                : subtotal;

        return finalAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private void validate(OrderItem item) {
        if (item == null) {
            throw new IllegalArgumentException("订单商品不能为空");
        }
        if (item.unitPrice() == null || item.unitPrice().signum() < 0) {
            throw new IllegalArgumentException("商品单价不能为负数");
        }
        if (item.quantity() <= 0) {
            throw new IllegalArgumentException("商品数量必须大于零");
        }
    }
}
```

### 2. 测试代码

`OrderAmountCalculatorTest.java`：

```java
package com.example.order;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OrderAmountCalculatorTest {

    private OrderAmountCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new OrderAmountCalculator();
    }

    @Nested
    @DisplayName("金额计算")
    class CalculateAmount {

        @Test
        @DisplayName("普通会员按商品小计结算")
        void normalMemberPaysSubtotal() {
            List<OrderItem> items = List.of(
                    item("BOOK", "12.50", 2),
                    item("PEN", "3.40", 3)
            );

            BigDecimal actual = calculator.calculate(items, MemberLevel.NORMAL);

            assertEquals(new BigDecimal("35.20"), actual);
        }

        @Test
        @DisplayName("VIP 会员享受九折")
        void vipMemberReceivesTenPercentDiscount() {
            List<OrderItem> items = List.of(item("KEYBOARD", "100.00", 1));

            BigDecimal actual = calculator.calculate(items, MemberLevel.VIP);

            assertEquals(new BigDecimal("90.00"), actual);
        }

        @ParameterizedTest(name = "会员等级 {0} 的预期金额为 {1}")
        @CsvSource({
                "NORMAL, 50.00",
                "VIP, 45.00"
        })
        void memberLevelDeterminesFinalAmount(
                MemberLevel memberLevel,
                String expectedAmount
        ) {
            List<OrderItem> items = List.of(item("MOUSE", "25.00", 2));

            BigDecimal actual = calculator.calculate(items, memberLevel);

            assertEquals(new BigDecimal(expectedAmount), actual);
        }
    }

    @Nested
    @DisplayName("参数校验")
    class ValidateInput {

        @Test
        void emptyOrderIsRejected() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> calculator.calculate(List.of(), MemberLevel.NORMAL)
            );

            assertEquals("订单至少包含一个商品", exception.getMessage());
        }

        @Test
        void nonPositiveQuantityIsRejected() {
            List<OrderItem> items = List.of(item("BOOK", "10.00", 0));

            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> calculator.calculate(items, MemberLevel.NORMAL)
            );

            assertEquals("商品数量必须大于零", exception.getMessage());
        }

        @Test
        void negativePriceIsRejected() {
            List<OrderItem> items = List.of(item("BOOK", "-0.01", 1));

            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> calculator.calculate(items, MemberLevel.NORMAL)
            );

            assertEquals("商品单价不能为负数", exception.getMessage());
        }
    }

    private static OrderItem item(String sku, String price, int quantity) {
        return new OrderItem(sku, new BigDecimal(price), quantity);
    }
}
```

### 3. 为什么这个测试有效

这组测试不是为了覆盖每一行代码，而是覆盖了主要业务风险：

- 多商品求和是否正确。
- VIP 分支是否应用正确折扣。
- 不同会员等级是否得到预期结果。
- 空订单、非法数量、非法价格是否被拒绝。
- 金额是否统一保留两位小数。

执行：

```bash
mvn test
```

预期会看到类似结果：

```text
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

如果把 `VIP_DISCOUNT` 错误地改成 `0.80`，VIP 相关测试会立即失败，并明确显示预期 `90.00`、实际 `80.00`。这就是自动化回归保护。

## 十四、推荐的测试过程

### 第一步：明确被测行为

先用一句业务语言描述要证明什么，例如：

```text
当 VIP 会员购买 100 元商品时，应付金额为 90 元。
```

不要从“我要覆盖这个 private 方法”出发。测试应关注公开行为，而不是内部实现。

### 第二步：列出场景矩阵

至少考虑：

- 正常场景。
- 边界值。
- 空值和非法值。
- 失败和异常场景。
- 不同业务分支。
- 历史缺陷对应场景。

对订单金额来说，零数量、负价格、空订单、普通会员和 VIP 都是明显边界。

### 第三步：隔离被测单元

数据库、HTTP、MQTT、文件系统、系统时间和随机数会让测试变慢或不稳定。根据需要使用：

- 依赖注入。
- Stub 或 Fake。
- Mockito Mock。
- `Clock` 替代直接调用 `Instant.now()`。
- 固定随机种子。
- `@TempDir` 隔离文件。

### 第四步：按 AAA 编写测试

一个测试通常只执行一个核心行为。准备代码太长时，可以提取测试数据工厂，但不要把关键输入隐藏到难以追踪的公共基类中。

### 第五步：先看测试失败

新增测试后，应先确认它能因为正确原因失败，再修改生产代码使其通过。否则可能出现测试根本没有验证到目标逻辑的情况。

TDD 将这个过程总结为：

```text
Red：先写一个失败测试
Green：用最小实现让测试通过
Refactor：在测试保护下整理代码
```

团队不一定所有代码都严格 TDD，但“缺陷先复现、功能先定义预期”仍是很有价值的习惯。

### 第六步：本地运行并接入 CI

提交前至少执行受影响模块测试。流水线中执行全量测试，并保存测试报告。失败或不稳定测试不应被简单重跑后忽略，而应找到根因。

## 十五、JUnit 使用规范

### 1. 测试命名表达行为

推荐以下任一种统一风格：

```text
method_condition_expectedResult
givenCondition_whenAction_thenResult
自然语言式英文方法名
```

例如：

```java
void calculate_vipMember_returnsDiscountedAmount()
void givenInsufficientBalance_whenWithdraw_thenThrowException()
void emptyOrderIsRejected()
```

避免：

```java
void test1()
void testCalculate()
void normalTest()
```

### 2. 一个测试聚焦一个行为

测试失败时，应能从名字直接知道哪条规则被破坏。不要在一个方法里连续测试新增、修改、查询、删除十几个步骤，除非它本来就是一个明确的端到端场景。

### 3. 测试必须独立

测试不能依赖：

- 另一个测试先执行。
- 固定执行顺序。
- 上一次执行遗留的数据。
- 开发者电脑上的文件或环境变量。
- 当前真实日期恰好满足条件。

任何一个测试单独运行、改变顺序或并行运行，都应得到相同结果。

### 4. 保持确定性

谨慎使用：

```java
Instant.now();
Math.random();
Thread.sleep(...);
真实网络请求；
共享数据库；
```

时间逻辑应注入 `Clock`，随机逻辑应注入可控制的生成器，异步逻辑应等待明确条件而不是盲目 `sleep`。

### 5. 断言业务结果，不断言实现细节

重构后业务行为没变，测试就不应失败。不要通过反射测试私有方法，也不要对每一次内部调用都 `verify`。如果私有逻辑复杂到必须独立测试，通常说明它值得提取为新的业务对象。

### 6. 同时覆盖成功与失败路径

只测“输入正确时返回正确结果”是不够的。参数校验、权限拒绝、余额不足、重复提交、超时和依赖异常往往才是生产事故高发区。

### 7. 避免测试代码重复，但不要过度抽象

可以提取对象构造器、测试数据工厂和公共扩展。不要创建层层继承的测试基类，让一个输入值要跨越多个文件才能找到。

### 8. 控制测试速度

测试套件应形成分层：

```text
大量快速单元测试
适量切片和组件测试
少量完整集成与端到端测试
```

快速测试适合每次提交运行；较慢测试可以分组，但关键流程仍必须在合并或发布前执行。

### 9. 不迷信覆盖率数字

覆盖率能发现“完全没测试的区域”，但 100% 行覆盖不等于业务正确。更值得关注的是：

- 关键业务规则是否有断言。
- 分支和边界是否覆盖。
- 历史缺陷是否有回归测试。
- 测试是否真的能在代码出错时失败。

必要时可以配合 JaCoCo 查看覆盖率，使用 mutation testing 检查测试是否能够识别被故意修改的逻辑。

### 10. 测试代码也要接受评审

测试和生产代码同样需要：

- 清晰命名。
- 合理拆分。
- 无重复和无废弃代码。
- 稳定、快速、可读。
- 与需求和缺陷记录对应。

一个没有断言、永远通过或长期禁用的测试，价值接近于零。

### 11. 不捕获后忽略异常

错误写法：

```java
try {
    service.execute();
} catch (Exception ignored) {
}
```

这种测试无论发生什么都可能通过。应该使用 `assertThrows`，或者让非预期异常直接导致测试失败。

### 12. 保持 CI 中零 Flaky Test

不稳定测试会破坏团队对测试结果的信任。偶发失败应当视为缺陷，排查共享状态、时区、并发、资源释放、超时阈值和外部依赖，而不是简单增加重试次数。

## 十六、常见误区

### 误区一：JUnit 只能做单元测试

JUnit 是测试运行框架，也可以承载集成测试、契约测试和端到端测试。测试属于哪一层，取决于它启动了哪些组件和外部资源。

### 误区二：用了 `@SpringBootTest` 就更真实、更好

完整上下文测试更接近运行环境，但更慢、定位失败更困难。对纯计算逻辑来说，毫秒级纯 JUnit 测试通常更合适。

### 误区三：Mock 越多，隔离越彻底

Mock 太多会让测试只是在验证自己设置的行为。优先测试真实的领域对象，只替换不可控或昂贵的边界依赖。

### 误区四：方法覆盖了就算测试完成

如果测试调用了方法却没有有效断言，即使覆盖率显示为绿色，也不能提供保护。

### 误区五：测试失败就是测试有问题

测试失败可能来自生产代码缺陷、测试缺陷或环境问题。正确做法是先读失败信息和堆栈，确认预期、实际值和失败位置，再判断应修改哪一边。

## 十七、总结

JUnit 的核心并不复杂：组织测试、执行测试、断言结果。但在真实项目中，它的价值来自一套持续的工程实践：

- 用测试描述业务行为。
- 用快速反馈支持日常开发。
- 用回归测试固定缺陷修复。
- 用隔离和确定性保持测试稳定。
- 用分层测试平衡速度与真实性。
- 用 CI 将测试结果变成合并和发布门槛。

如果刚开始为一个存量项目补测试，建议按这个顺序推进：

1. 从计算、转换、校验等纯逻辑开始。
2. 为每个线上缺陷补回归测试。
3. 使用 Mockito 隔离数据库、MQTT、HTTP 等边界。
4. 为 Controller 和 Repository 增加切片测试。
5. 为少量关键主流程增加完整集成测试。
6. 将测试稳定性和执行时间纳入持续治理。

测试不是开发结束后的附属工作，而是代码能够长期演进的重要基础设施。

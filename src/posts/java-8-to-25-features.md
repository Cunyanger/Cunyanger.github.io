---
title: Java8-Java 25新特性
date: 2026-08-03
category: Java
tag:
  - Java
isOriginal: true
excerpt: Java 8到Java 25，持续迭代提升开发效率、性能与安全性，引入函数式编程、模块化、文本块等新特性，并通过虚拟线程、垃圾收集器等技术优化并发与性能。建议根据项目需求选择LTS版本保证稳定性或尝试最新版本体验前沿特性。

---

## Java 8 - 函数式编程进入主流，Java 生态开始现代化（LTS）

> 范围说明：本文按 JDK 的 GA（General Availability，正式发布）版本整理，覆盖 Java 8 到 Java 25 的主要语言、标准库、JVM、工具和安全能力。Preview（预览）和 Incubator（孵化）特性会明确标注；它们可能在后续版本修改或移除。命令示例默认使用同一版本的 `javac` 和 `java`。

Java 8（2014）是 Java 语法和 API 的一次分水岭。Lambda、Stream、`java.time` 让代码更接近现代语言；接口默认方法则让集合框架等公共 API 可以演进而不破坏既有实现。JDK 8 同时把永久代（PermGen，Permanent Generation）替换为元空间（Metaspace），并改进了垃圾收集器和并发库。

### Lambda、方法引用与函数式接口

Lambda（lambda expression）把“行为”作为值传递。函数式接口（Functional Interface）是只包含一个抽象方法的接口，例如 `Predicate<T>`、`Function<T,R>`、`Consumer<T>`、`Supplier<T>` 和 `Runnable`。

```java
List<String> names = Arrays.asList("Ada", "Linus", "Grace");
names.stream()
    .filter(name -> name.length() >= 4)
    .map(String::toUpperCase)       // 方法引用（method reference）
    .forEach(System.out::println);

Comparator<String> byLength = Comparator.comparingInt(String::length);
```

适合把校验规则、排序规则、事件回调或重试策略注入方法。Lambda 捕获的局部变量必须是 final 或 effectively final（有效 final：初始化后没有再次赋值），这样可以避免并发修改造成的歧义。

### Stream 管道

Stream（流）描述数据处理管道，不等同于集合，也不负责存储数据。中间操作（`filter`、`map`、`sorted`）是惰性的，终端操作（`collect`、`reduce`、`forEach`）触发计算。

```java
Map<String, Long> ordersByUser = orders.stream()
    .filter(Order::isPaid)
    .collect(Collectors.groupingBy(Order::userId, Collectors.counting()));
```

`parallelStream()` 使用公共 `ForkJoinPool`，适合 CPU 密集且数据量稳定的无共享状态任务；网络 I/O、事务操作或顺序敏感逻辑通常不应直接并行化。

### 接口默认方法与静态方法

```java
interface Auditable {
    String auditId();
    default String auditLabel() { return "default"; }
    static Auditable empty() { return () -> ""; }
}
```

默认方法（default method）允许接口向后兼容地增加实现。多个接口提供同名默认方法时，实现类必须显式覆盖并可用 `InterfaceName.super.method()` 选择实现。

### Optional 与新的日期时间 API

`Optional<T>` 表示“可能没有值”，建议作为返回值而非实体字段或方法参数。

```java
String displayName = repository.findById(id)
    .map(User::displayName)
    .filter(s -> !s.trim().isEmpty())
    .orElse("匿名用户");
```

`java.time` 基于 ISO-8601（国际标准化组织日期时间格式），用不可变对象区分 `Instant`（时间线瞬间）、`LocalDate`（无时区日期）、`ZonedDateTime`（带时区日期时间）和 `Duration`/`Period`（时间量）。

```java
Instant expiresAt = Instant.now().plus(15, ChronoUnit.MINUTES);
ZonedDateTime shanghai = expiresAt.atZone(ZoneId.of("Asia/Shanghai"));
```

### CompletableFuture 与并发 API

`CompletableFuture` 表示可组合的异步结果；异常要用 `exceptionally`、`handle` 或 `whenComplete` 处理。

```java
CompletableFuture<User> user = CompletableFuture.supplyAsync(() -> loadUser(id));
CompletableFuture<List<Order>> orders = user.thenCompose(u -> loadOrders(u.id()));
return orders.thenApply(this::summarize);
```

默认执行器是公共池。服务端应为阻塞任务提供自定义线程池，避免占满公共池。

### 其他重要变化

- Nashorn（JavaScript 引擎）加入；后在 Java 11 弃用、Java 15 移除。
- `java.util.Base64` 提供基本、URL 安全和 MIME 编码。
- 类型注解（TYPE_USE）、重复注解、参数名反射（`-parameters`）和接口静态方法。
- `PermGen` 移除，类元数据进入本地内存中的 Metaspace；`-XX:MaxMetaspaceSize` 可限制上限。
- G1（Garbage-First）成为可选收集器，适合大堆和可预测暂停；并行 GC 仍常用于吞吐优先场景。

## Java 9 - 模块化解决大型应用的依赖边界问题（非 LTS）

Java 9（2017）的核心是 JPMS（Java Platform Module System，Java 平台模块系统，JEP 261）。它把包、依赖和导出关系写入模块描述符，解决类路径（classpath）下的隐式依赖、冲突和强封装缺失。

### JPMS 模块

```text
app/
├─ module-info.java
└─ com/example/Main.java
```

```java
// module-info.java
module com.example.app {
    requires java.net.http;
    exports com.example.api;
    opens com.example.model to com.fasterxml.jackson.databind; // 允许运行时反射
}
```

`requires` 声明编译和运行依赖，`exports` 只暴露公共 API，`opens` 只针对深度反射。`requires transitive` 用于把依赖传递给下游模块。编译和运行：

```bash
javac -d out --module-source-path src -m com.example.app
java --module-path out -m com.example.app/com.example.Main
```

迁移时先用 `jdeps --jdk-internals app.jar` 查找内部 API，再逐步加入模块描述符；传统三方库可先放在未命名模块（unnamed module）中。

### JShell 与集合工厂

JShell 是交互式 Java REPL（Read-Eval-Print Loop，读取-求值-输出循环），适合验证 API 和算法：

```text
jshell> var ports = List.of(80, 443)
jshell> ports
```

`List.of`、`Set.of`、`Map.of` 创建不可变集合并禁止 `null`。`List.copyOf` 等防御性副本方法到 Java 10 才加入。

### 语言与 API 细节

- 接口支持 `private` 方法，抽取默认方法的共享逻辑。
- try-with-resources 可以使用 effectively final 的已有变量：`try (socket) { ... }`。
- 匿名类中允许使用菱形操作符 `new ArrayList<>()`。
- `java.lang.ProcessHandle` 可查询进程树、PID 和退出状态，适合进程监控。
- `java.util.concurrent.Flow` 定义 Publisher/Subscriber 背压协议（back pressure：消费者控制生产速度）。
- `StackWalker` 按需遍历调用栈，避免一次性创建完整堆栈数组。
- HTTP/2 客户端、TLS 1.3 等作为孵化或底层能力出现；HTTP Client 在 Java 11 才正式标准化。
- 多版本 JAR（Multi-Release JAR）允许同一个 JAR 为不同 JDK 提供专用 class 文件。

### JVM 与运行时

G1 在 JDK 9 成为默认垃圾收集器；紧凑字符串（Compact Strings）用 Latin-1 字节数组存储可表示为单字节的字符串，降低英文文本的内存占用。统一日志（Unified JVM Logging）用 `-Xlog:gc*,safepoint` 取代多个旧日志开关。

## Java 10 - 用局部变量类型推断减少样板代码（非 LTS）

Java 10（2018）带来 `var`（JEP 286）和一批运行时优化。`var` 是编译期的局部变量类型推断，不是动态类型，也不能用于字段、方法参数或返回值。

```java
var request = HttpRequest.newBuilder(uri).GET().build();
var cache = new HashMap<String, List<Order>>();
```

初始化表达式必须能唯一确定类型；`var x = null`、`var x;` 和 Lambda 目标类型不明确都会编译失败。公共 API 仍应显式写出类型，以保持契约清晰。

### 集合与 GC 改进

- `List.copyOf`、`Set.copyOf`、`Map.copyOf` 和 `Collectors.toUnmodifiable*` 创建不可变集合。
- G1 引入并行 Full GC，降低极端回收停顿；应用类数据共享（AppCDS，Application Class-Data Sharing）扩展到应用类，可缩短多实例启动时间。
- 容器感知（Container Awareness）读取 cgroup 的 CPU 和内存限制，避免容器内 JVM 按宿主机资源配置。
- `Optional.orElseThrow()` 无参形式在空值时抛出 `NoSuchElementException`，可减少冗余 Supplier。

## Java 11 - 标准 HTTP 客户端与生产级 LTS 基线（LTS）

Java 11（2018）是第一个六个月发布节奏下的 LTS。HTTP Client、字符串/文件 API、单文件源码运行和 ZGC/Epsilon 等能力让它成为 Java 8 后的常见升级目标。

### 标准 HTTP Client

```java
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(2))
    .version(HttpClient.Version.HTTP_2)
    .build();
HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.example.com/users"))
    .header("Accept", "application/json")
    .GET().build();
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
```

异步调用返回 `CompletableFuture`：`client.sendAsync(request, BodyHandlers.ofString()).thenApply(HttpResponse::body)`。HTTP/2 多路复用减少连接数；TLS 1.3 缩短握手并提供更强密码套件。生产环境仍应设置连接、请求和整体超时。

### 字符串、文件和 Lambda 参数

```java
"  hello  ".strip();
"a\nb".lines().count();
"ha".repeat(3);
"value".isBlank();
String text = Files.readString(path, StandardCharsets.UTF_8);
Files.writeString(path, text, StandardCharsets.UTF_8);
```

Lambda 参数可以使用 `var`，并能配合注解：`(@Nonnull var value) -> value.trim()`，但一组参数必须全部使用 `var`。

## JVM、诊断和部署

- JFR（Java Flight Recorder）开源。可用 `jcmd <pid> JFR.start` 启动录制，再用 `jfr print recording.jfr` 查看低开销生产诊断数据。
- ZGC（Z Garbage Collector）和 Epsilon GC（不回收垃圾、用于性能基线/短生命周期任务）为实验性收集器。
- `java Hello.java` 可直接运行单文件源码，适合脚本、教学和运维探针；多文件项目仍应正常编译打包。
- Nest-based access 消除嵌套类访问合成桥接方法，减少反射和字节码开销。
- Java EE/CORBA 模块移除；Nashorn 弃用。升级旧项目时需显式加入 JAXB、Activation 等外部依赖。

## Java 12 - 让 switch 成为表达式，并持续降低 GC 停顿（非 LTS）

Java 12（2019）首次预览 switch 表达式，并加入 `Collectors.teeing`、紧凑数字格式和 G1 可中止混合回收。

### switch 表达式（预览）

```java
int days = switch (month) {
    case 1, 3, 5, 7, 8, 10, 12 -> 31;
    case 4, 6, 9, 11 -> 30;
    case 2 -> 28;
    default -> throw new IllegalArgumentException("month");
};
```

箭头分支不发生贯穿（fall-through），表达式必须覆盖所有输入。Java 12 的第一次预览使用 `break value` 从块中返回；Java 13 改为最终采用的 `yield value`，该特性在 Java 14 正式发布。

`Collectors.teeing(a, b, merger)` 将同一流同时交给两个下游收集器再合并，例如一次遍历计算平均值和总数。

## Java 13 - 文本块和动态 CDS 简化多行文本与启动优化（非 LTS）

Java 13（2019）第二次预览 switch 表达式，首次预览文本块（Text Block），并改进类数据共享。

```java
String json = """
    {
      "name": "Ada",
      "active": true
    }
    """;
```

文本块自动处理公共缩进并保留换行，适合 SQL、JSON、HTML 模板，但外部输入仍需参数化防注入。用于抑制换行的行末 `\\` 和用于保留尾随空格的 `\s` 是 Java 14 第二次预览时追加的改进。

动态 CDS（Class Data Sharing）可在应用运行后生成归档，使后续启动更快、共享内存更多；ZGC 支持归还未使用堆内存，长时间运行且负载波动的服务受益明显。

## Java 14 - Records、模式匹配和有帮助的空指针信息落地（非 LTS）

Java 14（2020）将 switch 表达式正式化，并预览 Records、`instanceof` 模式匹配；`jpackage`、Helpful NPE 和 JFR Event Streaming 也进入 JDK。

### Record（记录类，预览）

```java
public record Point(int x, int y) {
    public Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("坐标必须非负");
    }
}
```

编译器生成 final 组件、访问器、`equals`、`hashCode` 和 `toString`。Record 适合不可变 DTO（Data Transfer Object，数据传输对象）和值对象，不适合需要继承实体类、延迟加载或可变 JavaBean 属性的 ORM 模型。紧凑构造器可集中做校验。

### instanceof 模式匹配（预览）

```java
if (value instanceof String s && !s.isBlank()) {
    return s.strip();
}
```

类型测试成功后变量 `s` 在控制流分析确定的范围内可用，减少显式强转。Java 16 正式发布。

Helpful NPE 会指出具体哪一段表达式为空，例如 `user.getProfile().getName()` 中提示 `getProfile()` 的结果为 null，显著缩短定位时间。

`jpackage` 可把模块或类路径应用打包成 Windows MSI、macOS DMG、Linux DEB/RPM；需要目标平台的打包工具链。

## Java 15 - 文本块正式化，隐藏类和新一代 GC 可用于生产（非 LTS）

Java 15（2020）正式发布文本块；隐藏类（Hidden Classes）为框架生成不可发现、不可命名的运行时类；Sealed Classes（密封类）和 Records 继续预览。

```java
public sealed interface Shape permits Circle, Rectangle {}
public record Circle(double radius) implements Shape {}
public final class Rectangle implements Shape {}
```

密封类限制直接子类型，适合表达有限状态集合并让编译器检查穷尽性。隐藏类配合 `MethodHandles.Lookup#defineHiddenClass`，适合 Lambda、代理和动态语言实现，避免生成类污染类加载器。

ZGC 和 Shenandoah 在本版转为生产可用（Production），目标是低暂停；Epsilon 仍用于基准。EdDSA（Edwards-curve Digital Signature Algorithm，爱德华曲线数字签名算法）提供现代签名能力。

## Java 16 - Record 与 instanceof 模式匹配正式发布（非 LTS）

Java 16（2021）正式发布 Records 和 `instanceof` 模式匹配，Unix-domain socket、弹性 Metaspace、Vector API（孵化）和 Foreign Linker/Memory API（孵化）加入。

```java
record Point(int x, int y) {}

if (obj instanceof String text && !text.isBlank()) {
    System.out.println(text.strip());
}
```

Record Pattern 的解构语法到 Java 19 才首次预览，不能用于 Java 16 源码。

Unix-domain socket（Unix 域套接字）通过文件系统路径在同机进程间通信，避免 TCP 协议栈，适合本机数据库代理和 sidecar。`SocketChannel.open(UnixDomainSocketAddress.of(path))` 可直接连接。

弹性 Metaspace 将释放的类元数据内存还给操作系统，频繁动态加载/卸载类的应用 RSS（Resident Set Size，常驻集大小）更稳定。Vector API 使用 SIMD（Single Instruction, Multiple Data，单指令多数据）表达向量运算，适合图像、加密和数值计算；代码需要处理不同 CPU 的向量宽度。

## Java 17 - 强封装与密封类型成为现代 Java 的 LTS 基线（LTS）

Java 17（2021）是当前企业常用的 LTS。Sealed Classes 正式发布，JDK 内部 API 强封装，增强随机数、反序列化过滤和 macOS/AArch64 支持。

### 强封装与迁移

JEP 403 默认禁止通过反射访问 JDK 内部包。临时兼容可用 `--add-opens module/package=target`，但长期应迁移到标准 API；否则升级到 17 后常见的 `InaccessibleObjectException` 会暴露出来。

### 密封类与穷举分支

```java
static String describe(Shape shape) {
    return switch (shape) {
        case Circle c -> "圆 r=" + c.radius();
        case Rectangle r -> "矩形";
    };
}
```

上例中的 switch 模式在 17 仍是预览，需要 `--enable-preview`；完整的模式 switch 在 Java 21 正式发布。密封层次让编译器知道所有分支，新增子类会在编译期暴露遗漏。

其他变化：

- `RandomGenerator`/`RandomGeneratorFactory` 支持可插拔算法，科学计算可选择可复现实验的算法。
- JEP 415 上下文特定反序列化过滤器（Context-Specific Deserialization Filter）按调用上下文限制类和对象图，降低 Java 原生反序列化风险；不可信数据仍优先使用 JSON 等格式。
- Security Manager 弃用；RMI Activation、Applet API 等历史组件移除或弃用。
- Foreign Function & Memory API、Vector API 继续孵化；分代 ZGC 仍未成为默认。

## Java 18 - UTF-8 默认、轻量 Web Server 与开发体验改进（非 LTS）

Java 18（2022）规定 UTF-8 为默认字符集，减少不同操作系统上的乱码；提供简单 Web Server、Javadoc 代码片段和核心反射重写。

```bash
java -m jdk.httpserver
# 或在目录中启动：
jwebserver --port 8000 --directory public
```

简单 Web Server 仅用于原型、静态文件分享和测试，不提供认证、路由、压缩等生产能力。

`{@snippet lang="java" : ...}` 可在 Javadoc 中引用并校验外部代码片段。Finalization（终结器）被弃用，建议使用 try-with-resources、`AutoCloseable` 和 `Cleaner`（仅作兜底）管理资源。Vector API、Foreign Function & Memory API 继续预览/孵化。

## Java 19 - 虚拟线程和结构化并发首次登场（非 LTS）

Java 19（2022）第一次预览 Virtual Threads（虚拟线程），并孵化 Structured Concurrency（结构化并发）、Scoped Values（作用域值）和 Record Patterns。

### 虚拟线程（预览）

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    var futures = ids.stream()
        .map(id -> executor.submit(() -> fetch(id)))
        .toList();
    for (var future : futures) consume(future.get());
}
```

虚拟线程由 JVM 调度到少量载体平台线程上，阻塞 I/O 时会卸载载体线程，因此可以用同步写法承载大量并发请求。它不是更快的 CPU 线程，CPU 密集任务仍需有界平台线程池；避免长时间持有 `synchronized` 或 native 调用造成 pinning（固定载体线程）。Java 21 正式发布。

结构化并发把一组子任务绑定到词法作用域，统一取消、失败传播和生命周期，减少“泄漏”的后台任务。Scoped Values 用不可变、继承的上下文值替代部分 `ThreadLocal`，适合请求 ID、租户和安全主体传播。

## Java 20 - 并发上下文与模式解构继续演进（非 LTS）

Java 20（2023）是多个预览特性的第二次或第四次迭代：Record Patterns、Pattern Matching for switch、Virtual Threads、Structured Concurrency、Scoped Values 和 Foreign Function & Memory API。

```java
record User(String name, Address address) {}
record Address(String city) {}

if (value instanceof User(String name, Address(String city))) {
    System.out.println(name + "@" + city);
}
```

Record Pattern 可以同时做类型判断和组件解构，适合解析树、事件和 DTO。预览特性必须用 `--enable-preview --release 20` 编译运行，不能把预览 class 当作稳定公共 API 发布。

## Java 21 - 虚拟线程、模式匹配和顺序集合完成现代化（LTS）

Java 21（2023）是 LTS。它把虚拟线程、Record Patterns、Pattern Matching for switch 和 Sequenced Collections 正式化；Foreign Function & Memory API 进入第三次预览，并继续预览字符串模板、结构化并发、作用域值、未命名模式/变量和未命名类。

### 虚拟线程生产实践

```java
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    var tasks = urls.stream()
        .map(url -> executor.submit(() -> httpClient.send(request(url), BODY)))
        .toList();
    // try-with-resources 等待任务完成后再关闭执行器
}
```

连接池、数据库连接和下游限流仍要有界；虚拟线程降低线程内存和上下文切换成本，不会增加下游容量。Java 21 还通过 JFR/JDK 工具帮助定位 pinning。

## Sequenced Collections

`SequencedCollection`、`SequencedSet`、`SequencedMap` 统一了有序集合的首尾操作：`getFirst()`、`getLast()`、`addFirst()`、`reversed()`。库代码可面向接口编程，避免为 `Deque`、`List`、`LinkedHashMap` 编写重复适配。

## 模式 switch 与 Record Pattern

```java
static double area(Shape s) {
    return switch (s) {
        case Circle(var r) -> Math.PI * r * r;
        case Rectangle(var w, var h) -> w * h;
    };
}
```

`when` 守卫可写成 `case Circle c when c.radius() > 0 -> ...`。编译器根据密封层次检查穷尽性，`null` 也可单独写 `case null`。

## Foreign Function & Memory API（第三次预览）

FFM（Foreign Function & Memory，外部函数与内存）使用 `Arena` 管理生命周期、`MemorySegment` 表示内存、`Linker` 调用本地函数。相比 JNI（Java Native Interface，Java 原生接口），它减少手写胶水代码并提供边界检查；该 API 在 Java 22 才正式发布。

```java
try (Arena arena = Arena.ofConfined()) {
    MemorySegment name = arena.allocateUtf8String("Ada");
    // 通过 SymbolLookup.libraryLookup 加载本地库，再用 Linker.downcallHandle 调用函数
}
```

适用于高性能压缩、数据库驱动、系统调用和现有 C 库集成；必须明确 native 内存的所有权、对齐和线程共享规则。

其他变化：分代 ZGC（Generational ZGC）降低短命对象扫描成本；KEM（Key Encapsulation Mechanism，密钥封装机制）API 为后量子密码集成提供统一接口；字符串模板、结构化并发等仍是预览。

## Java 22 - FFM 正式化并改善构造器、集合流和启动方式（非 LTS）

Java 22（2024）将 FFM 正式化，Unnamed Variables & Patterns 正式发布，并预览 Flexible Constructor Bodies、Stream Gatherers、Class-File API、String Templates 后续方案和多文件源码启动。

```java
try (var _ = acquireLock()) { // `_` 是未命名变量，不能再次读取
    update();
}
```

Stream Gatherers（流收集器，预览）允许自定义有状态的中间操作，例如固定窗口：

```java
var windows = numbers.stream()
    .gather(Gatherers.windowFixed(3))
    .toList();
```

相比手写 `Collector`，Gatherer 可以表达中间阶段的暂停、状态和短路。生产使用前要确认目标 JDK 的预览语法，因为 API 在预览阶段可能改变。

Flexible Constructor Bodies（灵活构造器体，预览）允许在 `super()`/`this()` 之前执行不访问 `this` 的参数校验和计算，减少构造器辅助静态方法。Class-File API（预览）提供解析、生成和转换 class 文件的标准 API，框架可减少对 ASM 内部实现的绑定。

G1 增加 region pinning（区域固定）支持，JNI 临界区不必频繁触发全堆停顿；Linux/RISC-V 端口加入主线。`java --source 22 Main.java` 可启动由多个源码文件组成的简单程序。

## Java 23 - 模块导入、原始类型模式与低延迟 GC 默认策略（非 LTS）

Java 23（2024）预览 Module Import Declarations、Primitive Types in Patterns、Flexible Constructor Bodies、Stream Gatherers、Class-File API、Scoped Values、Structured Concurrency 和 Unnamed Classes/Instance Main Methods。Java 21/22 的 String Templates 没有在本版继续，不能把该预览语法作为可迁移的正式 API。

```java
import module java.base; // 导入模块导出的可访问类型（预览）

if (value instanceof int i && i > 0) { // 原始类型模式（预览）
    System.out.println(i);
}
```

ZGC 的分代模式成为默认策略（仍可用 `-XX:-ZGenerational` 关闭），短命对象多的服务通常拥有更低 GC 工作量和更好的吞吐。JEP 467 支持 Markdown 风格 Javadoc 注释，文档源码更易读；Vector API 继续孵化。

## Java 24 - AOT、紧凑对象头和结构化并发继续逼近稳定（非 LTS）

Java 24（2025）把 Class-File API 和 Stream Gatherers 正式化，加入 AOT（Ahead-Of-Time，提前）类加载/链接、Compact Object Headers（紧凑对象头，实验性）、虚拟线程去 pinning、量子抗性密码算法，并继续预览构造器体、模块导入、简单源文件、原始类型模式、作用域值和结构化并发。非分代 ZGC 被移除，Security Manager 被永久禁用，依赖这些旧行为的系统必须先迁移。

### AOT 缓存与画像

AOT 类加载/链接将已验证、已解析的类数据缓存下来，改善冷启动和首请求延迟，适合 CLI、Serverless 和大量短命实例；缓存必须在兼容的 JDK、操作系统和类路径下生成，部署流水线应把缓存视为可重建产物。AOT 方法画像到 Java 25 才加入。

### 紧凑对象头

对象头保存锁、GC 年龄和类型指针等元数据。Compact Object Headers 尝试用更少的位表示这些信息，在大量小对象（缓存、消息、集合节点）场景降低堆占用并改善缓存局部性；这是实验性能力，需用 `-XX:+UseCompactObjectHeaders`（具体开关以目标 JDK 为准）压测后再启用。

JEP 491 让虚拟线程在更多 `synchronized` 场景下不再固定载体线程，减少旧代码迁移时的 pinning 风险；但长临界区依然应缩短。量子抗性 ML-KEM/ML-DSA（Module-Lattice-Based Key Encapsulation Mechanism/Digital Signature Algorithm，基于模块格的密钥封装/数字签名）为未来量子计算威胁提供标准实现，应用层应通过 JCA（Java Cryptography Architecture，Java 加密架构）调用而非绑定具体实现。

## Java 25 - 以 LTS 汇聚并发、模块、简洁语法与运行时优化（LTS）

Java 25 于 2025 年 9 月发布，是本文范围内最新的 LTS。Module Import Declarations、Compact Source Files and Instance Main Methods、Flexible Constructor Bodies、Scoped Values 正式发布；结构化并发、原始类型模式和 Vector API 等仍处于预览/孵化阶段。

### 更适合教学和脚本的源码入口

```java
void main() {
    IO.println("Hello, Java 25");
}
```

Compact Source Files and Instance Main Methods（紧凑源文件与实例 main 方法）允许省略类声明和 `public static` 样板，适合教学、一次性工具和小型命令行程序。正式工程仍建议显式类和模块边界，便于测试、依赖注入和文档生成。

### Module Import Declarations

```java
import module java.base;
import module java.net.http;
```

模块导入一次引入模块导出的类型，减少示例和小程序的几十行 import；同名类型冲突时仍需使用显式单类型导入或限定名解决。它不会绕过模块的 `exports` 封装。

### Scoped Values（正式）

Scoped Value 是不可变、词法作用域绑定的上下文值，适合在调用树中传递请求 ID、租户或认证主体：

```java
static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

ScopedValue.where(REQUEST_ID, "req-42").run(() -> {
    serviceCall(); // 下游通过 REQUEST_ID.get() 读取
});
```

绑定只在 `run`/`call` 范围有效，不能像可变 `ThreadLocal` 那样随意修改；这让虚拟线程共享上下文时开销更低、生命周期更清楚。需要跨线程并行子任务时，配合结构化并发预览 API，并明确值的继承边界。

### GC、JFR 与安全

- Generational Shenandoah（分代 Shenandoah，实验性）按对象年龄分区，减少老年代扫描；在低暂停、堆较大的服务上应与 ZGC/G1 做同负载对比，不能把实验性收集器直接作为无验证的生产默认值。
- AOT 方法画像保存训练运行中的热点方法信息，帮助后续 JVM 更早优化关键路径，改善启动阶段吞吐；画像必须与实际生产负载有代表性的一致性。
- Compact Object Headers 转为正式特性，降低对象元数据开销；对象布局变化可能影响 JNI、Unsafe 和序列化假设，升级前检查 native 组件。
- JFR（Java Flight Recorder）增加协作采样（Cooperative Sampling）和方法计时事件，在更低开销下定位热点和延迟。
- KDF（Key Derivation Function，密钥派生函数）API 为 HKDF 等算法提供 JCA 抽象；应用可在不改业务代码的情况下替换合规提供者。
- `sun.misc.Unsafe` 的内存访问方法发出弃用警告，推动迁移到 VarHandle、MemorySegment 和标准并发原语。

### Java 25 仍在预览/孵化的方向

- Structured Concurrency（结构化并发）第五次预览：统一子任务取消、失败传播和资源关闭。
- Primitive Types in Patterns（原始类型模式）第三次预览：在模式匹配中安全处理 `int`、`long` 等原始类型并减少装箱。
- Vector API 第十次孵化：继续映射 SIMD 指令，需关注 CPU 特性探测和可移植回退。
- Stable Values（稳定值）预览：表达一次初始化后不再改变的共享值，补充 `final` 字段和懒加载场景。
- 32 位 x86 端口移除：仍运行在 32 位 x86 系统上的应用不能直接升级，应迁移到 64 位运行环境。

## 跨版本主题：如何理解这些变化

### 从 Lambda 到模式匹配：减少“样板”但保持类型安全

Java 8 先把行为（Lambda）和数据处理（Stream）组合起来；Java 14-21 再把类型判断、解构和分支结果组合起来。迁移策略是先把重复的强转和 `if/else` 改成模式 switch，再让 sealed hierarchy 保证穷举；不要为了追求新语法把复杂业务条件塞进一条超长表达式。

### 从平台线程到虚拟线程：容量模型改变而非规则消失

平台线程受 OS 栈和调度成本限制，虚拟线程把阻塞等待成本降到很低，但数据库连接、文件描述符、下游 QPS 仍是有限资源。常见做法是“每个请求一个虚拟线程 + 对外部资源设置有界信号量/连接池”，用 JFR 检查 pinning、锁竞争和实际等待时间。

### 从 JNI 到 FFM：明确内存所有权

JNI 的头文件、手写注册和异常边界容易出错；FFM 用 `Arena` 表达生命周期，用 `MemorySegment` 表达边界。无论哪种 API，都必须记录：谁分配、谁释放、哪个线程可访问、C 结构体的布局和字节序。FFM 不是自动内存管理，也不会替你验证 C 指针的业务语义。

### GC 选择与性能验证

性能优化不能只看单次吞吐。建议固定数据集、并发度和堆大小，至少比较：

| 目标 | 首选候选 | 关注指标 |
| --- | --- | --- |
| 吞吐优先、批处理 | G1/Parallel GC | 总吞吐、Full GC 次数、CPU |
| 低暂停、大堆 | ZGC/Shenandoah | P99/P999 暂停、并发 GC CPU、RSS |
| 短命实例启动 | CDS/AOT | 启动到就绪、首请求延迟、镜像体积 |
| 大量小对象 | 紧凑字符串/对象头 | 堆占用、缓存命中、分配速率 |

使用 JFR、统一日志和 `jcmd VM.native_memory` 建立升级前基线；不要仅凭“新版本更快”就改变收集器或堆参数。

## LTS 与升级路线速查

| 版本 | 发布年份 | LTS | 适合关注 |
| --- | ---: | :---: | --- |
| 8 | 2014 | 是 | Lambda、Stream、java.time、CompletableFuture |
| 9-10 | 2017-2018 | 否 | JPMS、var、集合工厂、统一日志 |
| 11 | 2018 | 是 | HTTP Client、UTF-8/字符串 API、JFR |
| 12-16 | 2019-2021 | 否 | switch、文本块、Record、模式匹配预览 |
| 17 | 2021 | 是 | 强封装、Sealed、现代安全基线 |
| 18-20 | 2022-2023 | 否 | UTF-8、虚拟线程/结构化并发预览、Record Pattern |
| 21 | 2023 | 是 | 虚拟线程、模式 switch、FFM、顺序集合 |
| 22-24 | 2024-2025 | 否 | Gatherer、Class-File API、AOT、紧凑对象头 |
| 25 | 2025 | 是 | Scoped Values、紧凑源码、分代 Shenandoah、AOT/JFR 汇聚 |

从 Java 8 升级到 17/21/25 时，应分阶段完成：先替换内部 API 和移除模块依赖，再处理强封装和反射；随后用 JFR 建立性能基线，最后按业务收益引入虚拟线程、Record、模式匹配和 FFM。每次只启用一组运行时开关，并保留可回滚的启动参数和压测结果。

## 缩写表

- **JDK**（Java Development Kit）：开发工具包，包含编译器、运行时和诊断工具。
- **JVM**（Java Virtual Machine）：执行 Java 字节码的虚拟机。
- **LTS**（Long-Term Support）：长期支持版本。
- **JEP**（JDK Enhancement Proposal）：JDK 增强提案编号。
- **GC**（Garbage Collection）：垃圾回收。
- **API**（Application Programming Interface）：应用程序编程接口。
- **AOT**（Ahead-Of-Time）：提前进行类加载、链接或方法画像。
- **FFM**（Foreign Function & Memory）：外部函数与内存 API。
- **SIMD**（Single Instruction, Multiple Data）：单指令多数据向量计算。
- **JFR**（Java Flight Recorder）：低开销 JVM 事件记录器。
- **JPMS**（Java Platform Module System）：Java 平台模块系统。
- **I/O**（Input/Output）：输入/输出，通常指网络、磁盘等外部读写。
- **CPU**（Central Processing Unit）：中央处理器。
- **JAR**（Java Archive）：打包 Java class 和资源的归档格式。
- **JNI**（Java Native Interface）：Java 调用 C/C++ 等本地代码的传统接口。
- **JCA**（Java Cryptography Architecture）：可插拔的 Java 加密架构。
- **TLS**（Transport Layer Security）：传输层安全协议。
- **MIME**（Multipurpose Internet Mail Extensions）：用于描述内容类型和编码的互联网标准。
- **CLI**（Command-Line Interface）：命令行界面。
- **DTO**（Data Transfer Object）：只用于跨边界传输数据的对象。
- **ORM**（Object-Relational Mapping）：对象关系映射，把对象模型映射到关系数据库。
- **QPS**（Queries Per Second）：每秒请求或查询数，用于衡量吞吐。
- **RSS**（Resident Set Size）：进程实际驻留在物理内存中的大小。
- **CDS/AppCDS**（Class Data Sharing/Application Class-Data Sharing）：类数据共享/应用类数据共享，用归档加快启动并减少重复内存。
- **KEM**（Key Encapsulation Mechanism）：安全协商共享密钥的密钥封装机制。
- **KDF**（Key Derivation Function）：从主密钥和上下文派生子密钥的函数。

---
article: false
icon: pen-to-square
date: 2026-07-28
category:
  - 读书
tag:
  - Effective Java
  - Java
  - 编程规范
  - 代码质量
---

# 《Effective Java》第三版

《Effective Java》第三版是 Java 开发者绕不开的一本书。它不是语法入门书，而是一本讲“如何写出可靠、清晰、可维护 Java 代码”的实践手册。

全书由 90 个条目组成，可以压缩成一句话：

```text
理解 Java 的语言机制和库设计约束，用清晰的 API、不可变对象、泛型、枚举、并发工具和异常边界降低长期维护成本。
```

## 阅读路线

1. 先读对象创建和销毁，理解 API 设计入口。
2. 再读 `Object` 通用方法，避免 equals/hashCode/compareTo 坑。
3. 重点读类、接口、泛型、枚举。
4. Java 8 后重点读 lambda、stream 和 Optional。
5. 最后读并发、异常和序列化。

## 全书章节地图

| 章节     | 核心主题         | 一句话                                                |
| -------- | ---------------- | ----------------------------------------------------- |
| 第 2 章  | 创建和销毁对象   | 控制对象生命周期和构造方式                            |
| 第 3 章  | Object 通用方法  | equals、hashCode、toString、clone、compareTo 要守契约 |
| 第 4 章  | 类和接口         | 最小可见性、不可变、组合优先                          |
| 第 5 章  | 泛型             | 编译期类型安全优于运行时强转                          |
| 第 6 章  | 枚举和注解       | 用类型系统表达有限集合和元信息                        |
| 第 7 章  | Lambda 和 Stream | 函数式工具要提升清晰度，而不是炫技                    |
| 第 8 章  | 方法             | 参数、返回值、重载和文档要清晰                        |
| 第 9 章  | 通用编程         | 局部变量、基础类型、库、命名和优化                    |
| 第 10 章 | 异常             | 异常表达异常情况，不做流程控制                        |
| 第 11 章 | 并发             | 共享可变状态必须受控                                  |
| 第 12 章 | 序列化           | Java 原生序列化要非常谨慎                             |

## 第 2 章 创建和销毁对象

核心：对象创建本身就是 API 设计的一部分。

重点条目：

- 静态工厂方法可以替代构造器。
- 构造参数多时使用 Builder。
- 单例要考虑序列化、反射和测试。
- 不要创建不必要对象。
- 资源必须关闭，优先使用 try-with-resources。
- 避免 finalizer 和 cleaner 承担核心资源释放。

典型启示：

```java
User user = User.builder()
        .id(1L)
        .name("Tom")
        .enabled(true)
        .build();
```

Builder 适合参数多、可选参数多、构造过程需要校验的对象。静态工厂方法适合表达语义，例如 `of`、`from`、`valueOf`、`getInstance`。

## 第 3 章 Object 通用方法

核心：重写 `equals`、`hashCode`、`toString`、`clone`、`compareTo` 必须遵守契约。

重点：

- 重写 `equals` 必须同时重写 `hashCode`。
- `equals` 要满足自反、对称、传递、一致和非空判断。
- `toString` 应该提供有用信息。
- 谨慎使用 `clone`，优先拷贝构造器或静态工厂。
- `Comparable` 的排序逻辑要与业务语义一致。

常见坑：

```java
Set<User> users = new HashSet<>();
users.add(new User(1L));
users.contains(new User(1L)); // 如果 hashCode 没写好，结果可能不符合预期
```

在实体类、DTO、值对象中，是否重写这些方法要看对象身份语义。值对象通常按字段相等，实体对象可能按业务 ID 或数据库 ID 判断。

## 第 4 章 类和接口

核心：类和接口设计要降低耦合，保护不变量。

重点：

- 尽量降低可见性。
- 公共类不要暴露可变字段。
- 不可变类更安全。
- 组合优于继承。
- 继承要么为扩展设计并文档化，要么禁止继承。
- 接口只暴露必要能力。
- 静态成员类优于非静态成员类。

不可变对象的价值：

- 线程安全。
- 状态简单。
- 易于缓存和复用。
- 不容易被外部修改破坏。

示例：

```java
public final class Money {

    private final BigDecimal amount;
    private final Currency currency;

    public Money(BigDecimal amount, Currency currency) {
        this.amount = amount;
        this.currency = currency;
    }
}
```

组合优于继承的原因是继承会暴露父类实现细节。想复用能力时，优先把依赖对象作为字段组合进来。

## 第 5 章 泛型

核心：让错误尽量在编译期暴露，而不是运行时 `ClassCastException`。

重点：

- 不要使用原始类型。
- 消除非受检警告。
- List 优于数组表达泛型集合。
- 优先使用泛型方法和泛型类。
- 使用有界通配符提高 API 灵活性。
- PECS：生产者用 `extends`，消费者用 `super`。

示例：

```java
public static <T> void copy(List<? extends T> source, List<? super T> target) {
    target.addAll(source);
}
```

泛型最重要的不是语法，而是 API 设计。一个好的泛型接口能让调用方少强转、少出错、少写重复代码。

## 第 6 章 枚举和注解

核心：用类型系统表达有限集合和规则。

重点：

- 用 enum 代替 int 常量。
- 枚举可以有字段、方法和策略。
- 使用 `EnumSet` 和 `EnumMap` 处理枚举集合和映射。
- 注解适合表达元数据。
- `@Override` 应该始终使用。
- 标记接口和标记注解各有适用场景。

示例：

```java
public enum OrderStatus {
    CREATED,
    PAID,
    CANCELED,
    FINISHED
}
```

枚举的价值是可读、可约束、可遍历、可配合 switch。不要用魔法数字或字符串散落表达状态。

## 第 7 章 Lambda 和 Stream

核心：函数式特性应该让代码更清晰，而不是更难懂。

重点：

- Lambda 适合简短行为。
- 方法引用能提升可读性时再用。
- 标准函数式接口优于自定义接口。
- Stream 适合数据转换流水线。
- 不要滥用 Stream 替代所有循环。
- 返回 Optional 要谨慎，字段和参数通常不建议用 Optional。

好用法：

```java
List<String> names = users.stream()
        .filter(User::isEnabled)
        .map(User::getName)
        .toList();
```

坏味道：

- Stream 链太长。
- Lambda 中写复杂业务。
- 为了函数式而牺牲调试和可读性。

## 第 8 章 方法

核心：方法是 API 的主要表达形式，参数和返回值要清晰。

重点：

- 检查参数有效性。
- 必要时做防御性拷贝。
- 谨慎设计方法签名。
- 参数列表不要太长。
- 重载要避免歧义。
- 返回空集合优于返回 null。
- 谨慎返回 Optional。
- 文档注释要说明契约、异常和边界。

Spring 项目中常见实践：

```java
public List<OrderDTO> listOrders(OrderQuery query) {
    Objects.requireNonNull(query, "query");
    return orderRepository.findByQuery(query);
}
```

参数对象比长参数列表更适合表达复杂查询条件。

## 第 9 章 通用编程

核心：写普通 Java 代码也要关注可读性、类型选择和库使用。

重点：

- 局部变量作用域越小越好。
- foreach 优于传统 for，除非需要索引。
- 精确计算避免 float/double。
- 基本类型和装箱类型要区分。
- 字符串拼接大量循环时用 StringBuilder。
- 通过接口引用对象。
- 优先使用标准库。
- 命名遵守约定。
- 不要过早优化。

最值得记住的是：能用标准库就不要手写。标准库通常已经处理了边界、性能和兼容。

## 第 10 章 异常

核心：异常应该表达异常情况，而不是控制正常流程。

重点：

- 只在异常情况下使用异常。
- 对可恢复情况使用受检异常，对编程错误使用运行时异常。
- 避免不必要地使用受检异常。
- 优先使用标准异常。
- 抛出异常要包含失败上下文。
- 不要吞异常。
- 不要忽略异常。

Spring Boot 项目中，应在边界层统一转换异常响应：

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusiness(BusinessException ex) {
        return Result.fail(ex.getCode(), ex.getMessage());
    }
}
```

## 第 11 章 并发

核心：并发的难点是共享可变状态。

重点：

- 同步访问共享可变数据。
- 避免过度同步。
- Executor、Task、Stream 并行工具优于手动创建线程。
- 并发工具优于 `wait` 和 `notify`。
- 文档化线程安全级别。
- 懒初始化要谨慎。

实践建议：

- 优先使用不可变对象。
- 使用线程安全集合。
- 使用线程池，不手动无限创建线程。
- 明确线程池大小、队列、拒绝策略。
- 不要在锁内做远程调用或慢 IO。

## 第 12 章 序列化

核心：Java 原生序列化风险大，默认不要轻易使用。

问题：

- 安全风险。
- 版本兼容复杂。
- 对象不变量可能被破坏。
- 性能和可读性差。

建议：

- 优先使用 JSON、Protocol Buffers 等明确协议。
- 必须序列化时要保护不变量。
- 谨慎实现 `Serializable`。
- 反序列化输入必须视为不可信。

在微服务和接口设计中，DTO 的序列化格式应该稳定、清晰、可演进，而不是把内部对象直接暴露出去。

## 面试高频点

### 1. 为什么重写 equals 必须重写 hashCode？

因为 HashMap、HashSet 等集合依赖 hashCode 定位桶，再用 equals 判断相等。如果两个对象 equals 相等但 hashCode 不同，它们可能落在不同桶里，集合行为就会错误。

### 2. Builder 适合什么场景？

适合构造参数多、可选参数多、对象创建需要校验且希望代码可读的场景。相比重叠构造器和 JavaBean，Builder 更清晰，也更容易保持对象不可变。

### 3. 为什么组合优于继承？

继承会把子类和父类实现细节绑定在一起，父类变化可能破坏子类。组合只依赖公开接口，更灵活，也更容易测试。

### 4. Optional 应该怎么用？

Optional 适合作为可能缺失结果的返回值，不适合作为字段、方法参数或集合元素。不要对每个可空值都套 Optional。

### 5. Java 并发最重要的原则是什么？

控制共享可变状态。能不可变就不可变，必须共享就同步，能用并发工具就不要手写底层线程协调。

## 速记

| 主题        | 核心结论                              |
| ----------- | ------------------------------------- |
| 对象创建    | 静态工厂、Builder、try-with-resources |
| Object 方法 | equals/hashCode/compareTo 必须守契约  |
| 类设计      | 最小可见性、不可变、组合优先          |
| 泛型        | 编译期类型安全                        |
| 枚举        | 用类型表达有限集合                    |
| Lambda      | 简洁才用，别牺牲可读性                |
| 方法        | 参数清晰，返回值明确                  |
| 异常        | 不吞异常，不做流程控制                |
| 并发        | 共享可变状态必须受控                  |
| 序列化      | 默认谨慎，输入不可信                  |

## 总结

《Effective Java》的价值是把 Java 语言里大量“容易写错但不一定马上暴露”的细节变成规则，记住：

```text
API 设计要清晰。
对象状态要受控。
类型系统要充分利用。
并发和序列化要保持敬畏。
```

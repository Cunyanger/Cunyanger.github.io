---
title: Java并发编程实战
date: 2026-09-19
article: false
icon: pen-to-square
bookCategory: Java与并发编程
bookAuthor: "[美] Brian Goetz、Tim Peierls、Joshua Bloch、Joseph Bowbeer、David Holmes、Doug Lea（童云兰等译）"
bookColor: zinc
category:
  - 软件开发
  - Java
bookCover: /assets/images/java-concurrency-in-practice-cover.png
cover: 
tag:
  - Java
  - 并发编程
  - 多线程
  - Java内存模型
  - 线程安全
  - java.util.concurrent
isOriginal: true
excerpt: "以《Java并发编程实战》中文版 308 页正文为主线，完整精读 16 章与并发性标注附录，并用 JDK 27 校正线程池、并发容器、虚拟线程、Scoped Values 和结构化并发的现代实践。"
---

# 《Java 并发编程实战》：从共享状态到结构化并发

> **书目信息**：Brian Goetz、Tim Peierls、Joshua Bloch、Joseph Bowbeer、David Holmes、Doug Lea 著，童云兰等译，《Java 并发编程实战》（Java Concurrency in Practice），机械工业出版社 2012 年 2 月第 1 版，ISBN 978-7-111-37004-8。英文原版写于 2006 年，核心背景是 JSR 166 为 Java 5 引入 java.util.concurrent。
>
> **文本依据**：本文以题目提供的 308 页扫描版 PDF 为一手材料，逐页 OCR 后按 PDF 书签、目录和正文交叉校正，覆盖译者序、前言、第 1～16 章、附录 A 与参考文献。短引文只保留支持分析所需的片段，代码以原书示例意图为主并做了缩写或现代化改写。
>
> **标记规则**：**【原书】**表示书中明确提出的定义、原则或案例；**【当前补充】**表示截至 2026-09-19 根据 OpenJDK/Oracle 一手资料核验的实践；**【版本变化】**表示原书 Java 5/6 语境与今天实现之间的差异；**【纠正】**表示原书示例在现代项目中不宜原样照搬。

## 一、先建立全书模型：并发不是“多开几个线程”

### 1. 为什么 Java 并发难

【原书】第 1 章开篇说：

> “编写正确的程序很难，而编写正确的并发程序则难上加难。”

前言进一步指出，并发错误通常不会稳定重现，而会在生产环境、高负载或最不方便调试的时刻出现。Java 提供了 synchronized、条件等待、volatile 等底层机制，但应用真正需要的是更高层的协议：谁拥有状态、什么条件下允许读写、任务如何取消、线程池如何关闭、失败如何传播。机制与策略之间若没有清楚映射，程序即使能编译、能跑，也可能只是“偶然正确”。

【原书】第 2 章把问题压缩成一句极有价值的规则：

> “当多个线程访问某个状态变量并且其中有一个线程执行写入操作时，必须采用同步机制来协同这些线程对变量的访问。”

这里的“同步”不只等于加锁，还包括线程封闭、不可变对象、volatile、原子变量、并发容器以及安全发布。全书真正讲的不是 Thread API，而是如何控制**共享且可变的状态**。

用通俗的话说，并发程序像多人同时修改一张表：

- 安全性解决“不能把表改坏”，即坏事永远不发生。
- 活跃性解决“工作最终能完成”，即好事最终会发生。
- 性能解决“完成得是否足够快，增加资源后能否扩展”。
- 可维护性解决“后来的人能否看懂锁保护了什么、取消如何传播、对象能否共享”。

这本书的作用，是把上述问题转化为可执行的设计规则。它解决的不是某个 API 的记忆问题，而是帮助读者建立一条分析链：**识别状态 → 确定不变性条件 → 选择所有权与同步策略 → 设计任务边界 → 处理取消和关闭 → 验证活跃性与性能 → 用内存模型证明可见性和顺序性**。

### 2. 全书逻辑框架

~~~mermaid
flowchart TD
    A[第1章 并发的价值与风险]
    B[第一部分 基础知识<br/>第2章 线程安全性<br/>第3章 对象共享<br/>第4章 对象组合<br/>第5章 基础构建模块]
    C[第二部分 结构化并发应用程序<br/>第6章 任务执行<br/>第7章 取消与关闭<br/>第8章 线程池<br/>第9章 GUI单线程模型]
    D[第三部分 活跃性、性能与测试<br/>第10章 活跃性危险<br/>第11章 性能与可伸缩性<br/>第12章 并发测试]
    E[第四部分 高级主题<br/>第13章 显式锁<br/>第14章 自定义同步器<br/>第15章 原子变量与非阻塞算法<br/>第16章 Java内存模型]
    F[附录A 并发性标注]
    A --> B --> C --> D --> E --> F
    B -.状态与可见性规则.-> E
    C -.任务生命周期.-> D
    E -.证明前面规则为何成立.-> B
~~~

还可以把全书看成一个并发组件的生命周期：

~~~mermaid
flowchart LR
    S[识别共享状态] --> I[建立不变性条件]
    I --> P[封闭、不可变或安全发布]
    P --> T[拆分任务并选择执行器]
    T --> C[取消、超时与关闭]
    C --> L[检查死锁、饥饿与活锁]
    L --> M[测量吞吐量、延迟与伸缩性]
    M --> V[用JMM与测试验证]
~~~

### 3. 与相邻并发方案的区别

| 方案 | 并发单元 | 状态管理方式 | 优势 | 主要代价与边界 |
| --- | --- | --- | --- | --- |
| 直接 Thread + synchronized | 平台线程 | 共享内存与内置锁 | 语义直接，JMM 保证明确，适合少量长期线程 | 线程创建昂贵；生命周期、异常和关闭容易散落 |
| Executor + java.util.concurrent | Task、Future、线程池 | 并发容器、同步器、显式锁、原子变量 | 解耦任务与执行策略，是原书主线 | 错误的队列或池大小会造成资源耗尽；Future 的失败传播较分散 |
| Fork/Join 与并行流 | 递归小任务、数据分块 | 尽量无共享或使用归约 | 擅长 CPU 密集型分治 | 阻塞 I/O 会占住工作线程；公共池可能发生干扰 |
| CompletableFuture / 响应式流 | 异步阶段、数据流 | 通过阶段组合减少阻塞 | I/O 管线吞吐量高，能表达回压 | 调试栈、异常链和上下文传播更复杂 |
| 虚拟线程 | 每任务一个轻量 Thread | 仍使用传统阻塞代码与 JMM | 高并发 I/O 下保留顺序代码、异常栈和调试体验 | 不会让 CPU 计算更快；不应池化虚拟线程；共享状态问题仍然存在 |
| 结构化并发 | 有词法作用域的任务树 | 父任务统一管理子任务 | 取消、失败、超时和可观测性形成整体 | JDK 27 仍为预览 API，生产采用要评估预览特性政策 |

总结：原书建立的线程安全、取消、活跃性和 JMM 原则并没有过时。后来出现的 CompletableFuture、响应式编程、虚拟线程和结构化并发，主要改变了**任务如何组织与调度**，没有取消“共享可变状态必须受控”这一根规则。

## 二、16 章在全书中的职责

| 章节 | 标题 | 核心内容 | 本章给出的解决思路 |
| --- | --- | --- | --- |
| 译者序与前言 | 从机制到设计策略 | Java 5 并发库弥合底层线程机制与应用级语义之间的落差 | 用规则、模式和高层组件构造正确且高性能的并发程序 |
| 第1章 | 简介 | 并发历史、线程优势、安全性、活跃性、性能风险 | 把线程当成建模与资源利用工具，同时接受其非确定性成本 |
| 第2章 | 线程安全性 | 状态、原子性、竞态条件、内置锁、活跃性 | 无状态优先；复合操作必须整体原子；锁保护不变性条件 |
| 第3章 | 对象的共享 | 可见性、volatile、线程封闭、不可变性、安全发布 | 不共享、共享不可变对象，或通过正确同步安全共享 |
| 第4章 | 对象的组合 | 类的不变性条件、实例封闭、监视器模式、委托 | 先定义状态空间，再将线程安全性封装或委托给组件 |
| 第5章 | 基础构建模块 | 并发容器、阻塞队列、FutureTask、信号量、栅栏 | 优先复用经过验证的库组件，不手写低层同步协议 |
| 第6章 | 任务执行 | Executor、线程池、Callable、Future、CompletionService | 将“做什么”与“在哪里、何时、用多少线程做”分离 |
| 第7章 | 取消与关闭 | 中断、Future 取消、服务关闭、异常线程、JVM 关闭 | 取消是协作协议；保存中断状态；服务必须拥有其线程 |
| 第8章 | 线程池的使用 | 饥饿死锁、池大小、队列、拒绝策略、ThreadFactory | 执行策略必须匹配任务特性，并为过载设置明确边界 |
| 第9章 | GUI 应用程序 | Swing 事件分派线程、短任务、长任务、共享模型 | 把界面状态封闭在事件线程，耗时工作转移到后台 |
| 第10章 | 避免活跃性危险 | 锁顺序死锁、资源死锁、开放调用、饥饿、活锁 | 建立全局锁顺序，避免持锁调用外部代码，支持超时诊断 |
| 第11章 | 性能与可伸缩性 | Amdahl 定律、上下文切换、内存同步、锁竞争 | 先测量再优化；减小串行比例、锁持有时间和竞争概率 |
| 第12章 | 并发程序的测试 | 正确性、阻塞、安全性、资源泄漏、性能测试 | 用栅栏同步起跑、放大交错、重复测试并监控运行时 |
| 第13章 | 显式锁 | ReentrantLock、定时锁、可中断锁、公平锁、读写锁 | 仅在需要内置锁不具备的能力时使用显式锁 |
| 第14章 | 构建自定义同步工具 | 状态依赖、条件队列、Condition、AQS | 把状态、条件谓词和等待协议封装成同步器 |
| 第15章 | 原子变量与非阻塞同步 | CAS、原子变量、非阻塞栈/队列、ABA | 用乐观重试减少锁竞争，但接受算法与证明复杂度 |
| 第16章 | Java 内存模型 | 重排序、happens-before、发布、初始化安全性 | 用同步边建立跨线程可见性和顺序性证明 |
| 附录A | 并发性标注 | Immutable、ThreadSafe、NotThreadSafe、GuardedBy | 将线程安全保证和锁保护关系写入可维护的契约 |

## 三、沿着并发组件生命周期精读全书

### 阶段一：先决定为什么并发、什么状态会被共享

#### 第1章：线程的收益必须与三类风险一起计算

本章从进程与线程的历史讲起。线程共享进程资源，创建和通信成本通常低于进程；它能在等待 I/O 时利用其他处理器执行工作，也能把“每类异步事件一个顺序流程”建模得更自然。GUI 事件线程则展示了并发对响应性的价值：后台工作不应冻结界面。

书中把线程收益归纳为四点：发挥多处理器能力、简化建模、简化异步事件处理、改善用户界面响应性。但收益对应三类风险：

- **安全性**：出现错误结果、破坏对象不变性条件或读取不一致状态。
- **活跃性**：死锁、饥饿、活锁使工作无法向前推进。
- **性能**：线程调度、上下文切换、锁竞争和缓存失效可能让并发比串行更慢。

书中用 Servlet、RMI、Timer、Swing 等框架说明“线程无处不在”：即使业务代码没有显式 new Thread，容器也可能并发调用它。判断线程安全性必须看对象**如何被访问**，不能只看类内部有没有 Thread。

术语：

- **Concurrency（并发）**：多个任务在一段时间内交错推进，不要求同一时刻物理并行。
- **Parallelism（并行）**：多个任务在同一时刻由不同处理单元执行。
- **Safety（安全性）**：坏事永远不发生。
- **Liveness（活跃性）**：好事最终会发生。
- **Responsiveness（响应性）**：系统在合理时间内对输入给出反馈。

【当前补充】现代 Java 的虚拟线程降低了“一个并发任务对应一个线程”的资源成本，但它只提高适合阻塞等待型负载的吞吐量，不会缩短 CPU 密集计算的执行时间。

### 阶段二：建立线程安全对象

#### 第2章：线程安全性的核心是管理状态访问

本章先区分对象、状态与状态变量。对象的状态不仅是自身字段，还可能包含它引用的 Map、Entry 或其他可变对象。分析线程安全时要先列出全部状态，再找出跨变量的不变性条件。

**无状态对象天然线程安全。** 原书的 StatelessFactorizer 不在请求之间保存数据，因此多个 Servlet 请求互不干扰。只要加入计数器、缓存或最近一次结果，共享状态就出现了。

**竞态条件来自“先检查后执行”或“读取—修改—写入”。** LazyInitRace 中两个线程都可能看到 instance 为空并创建不同对象；i++ 看似一句，实际包含读取、加一、写回三个步骤。

原书 Sequence 的核心可缩写为：

~~~java
@ThreadSafe
public final class Sequence {
    @GuardedBy("this")
    private int value;

    public synchronized int getNext() {
        return value++;
    }
}
~~~

synchronized 使复合操作相对同一把锁原子执行，同时建立释放锁到后续获取同一把锁的可见性关系。锁是可重入的，所以子类或同一调用链再次获取同一对象锁不会自我死锁。

需要注意，给单个字段换成 AtomicLong 只解决这个字段的复合更新；如果缓存值与命中计数之间存在联合不变性条件，仍要用同一同步策略整体保护。书中的 CachedFactorizer 就是为了说明：**锁保护的是不变性条件，而不只是某一行代码。**

术语：

- **Race condition（竞态条件）**：结果依赖多个线程不可预测的交替顺序。
- **Atomicity（原子性）**：操作从其他线程视角不可分割。
- **Compound action（复合操作）**：由多个步骤组成、必须整体原子执行的逻辑操作。
- **Intrinsic lock / monitor lock（内置锁/监视器锁）**：每个 Java 对象都隐含拥有的锁。
- **Reentrancy（可重入）**：持锁线程可以再次获得同一把锁。

局限与处理：粗粒度 synchronized 容易证明，但会扩大竞争范围；不要为了缩小临界区而破坏操作原子性；不要在持锁期间执行慢 I/O 或不可控外部调用。

#### 第3章：可见性、封闭、不可变与安全发布

如果线程 A 写入字段而线程 B 没有通过同步读取，B 可能看到旧值，也可能看到对象部分构造的状态。原书 NoVisibility 展示了没有同步时读取线程可能不终止，或看到 ready 为真但 number 仍是旧值。

本章给出四条逐级降低风险的路线：

1. **线程封闭**：状态只归一个线程访问。
2. **不可变性**：对象创建后状态不再改变。
3. **安全发布**：通过 JMM 认可的机制把对象交给其他线程。
4. **同步共享可变状态**：所有访问遵循统一锁或其他同步策略。

volatile 保证对变量的写入对后续读取可见，并限制相关重排序，但不把 value++ 变成原子操作。适合使用 volatile 的典型条件是：写入不依赖当前值，变量不参与其他状态不变性条件，访问时无需额外加锁。

~~~java
@ThreadSafe
public final class StoppableTask implements Runnable {
    private volatile boolean cancelled;

    public void cancel() {
        cancelled = true;
    }

    @Override
    public void run() {
        while (!cancelled) {
            doOneUnit();
        }
    }
}
~~~

这个例子只适合可频繁检查标志且不会永久阻塞的任务。若任务阻塞在 BlockingQueue、Socket 或 sleep 上，应优先使用中断。

安全发布可以通过静态初始化器、volatile 或 AtomicReference、锁保护字段、线程安全容器以及 final 字段初始化安全性完成。不要在构造函数中让 this 逸出，例如注册监听器或启动会访问当前对象的线程。

术语：

- **Visibility（可见性）**：一个线程的写入何时能被另一个线程观察到。
- **Thread confinement（线程封闭）**：把可变对象限制在单线程内。
- **Stack confinement（栈封闭）**：对象引用只存在于局部变量且未逸出。
- **ThreadLocal**：为每个线程维护独立值的工具，不等于自动清理资源。
- **Safe publication（安全发布）**：以 JMM 保证的方式向其他线程公开对象。
- **Immutability（不可变性）**：对象状态在构造完成后不再改变。

【当前补充】大量虚拟线程下，为每个线程保存重型 ThreadLocal 值会放大内存占用。JDK 25 正式交付 Scoped Values，用词法作用域共享不可变上下文，更适合请求身份、追踪信息等“一路只读传递”的数据。

#### 第4章：从线程安全字段组合出线程安全类

设计线程安全类时，原书要求回答三件事：哪些变量构成对象状态；哪些不变性条件约束这些变量；哪个同步策略保护并发访问。

如果多个字段存在联合约束，只让每个字段各自线程安全并不够。多个线程安全组件的组合只有在它们相互独立、组合类未增加跨组件约束时，才能直接委托线程安全性。

**实例封闭**把非线程安全对象藏在一个对象内部，并让所有访问经过同一把锁。Java 监视器模式通常使用对象自身锁，也可以使用私有锁对象；私有锁更不容易被外部代码错误占用。

**委托**是本章最重要的扩展方式。若状态完全由一个 AtomicLong 表示，外层类可把线程安全性委托给它；若车辆位置使用 ConcurrentHashMap，且 Point 不可变，则可以安全发布视图或快照。

~~~java
@Immutable
public record Point(int x, int y) {}

@ThreadSafe
public final class VehicleTracker {
    private final ConcurrentMap<String, Point> locations =
            new ConcurrentHashMap<>();

    public Map<String, Point> snapshot() {
        return Map.copyOf(locations);
    }

    public void setLocation(String id, int x, int y) {
        locations.put(id, new Point(x, y));
    }
}
~~~

这是按原书“委托车辆追踪器”意图做的现代改写。Map.copyOf 返回快照；若业务要求实时视图，应明确文档化弱一致性。

为现有线程安全类添加功能时，优先修改原类并纳入其同步策略，其次用组合包装；只有掌握原对象锁协议时才使用客户端加锁。继承容易把父类内部同步策略变成隐含依赖，通常不如组合稳健。

术语：

- **Invariant（不变性条件）**：对象在所有可观察稳定状态下都必须满足的约束。
- **Ownership（所有权）**：谁负责管理某个可变状态及其同步。
- **Instance confinement（实例封闭）**：把状态封装在实例中并控制全部访问路径。
- **Monitor pattern（监视器模式）**：对象的可变状态由对象锁或私有锁保护。
- **Delegation（委托）**：由内部线程安全组件承担外层对象的线程安全保证。

#### 第5章：优先复用并发容器和同步工具

同步包装容器能保护单次方法调用，但“若不存在则添加”、迭代、查找后删除等复合操作仍要在客户端持有正确的容器锁。快速失败迭代器抛出 ConcurrentModificationException 是错误检测机制，不是并发正确性保证。

ConcurrentHashMap 允许读操作与部分写操作并发，提供 putIfAbsent、computeIfAbsent、replace 等复合原子方法。CopyOnWriteArrayList 在修改时复制底层数组，适合读远多于写、元素数量不太大、迭代快照语义可接受的场景。

【版本变化】原书对应的早期 ConcurrentHashMap 使用分段锁。Java 8 以后实现不再以 Segment 作为主要结构，而使用 CAS、桶级同步和树化桶；今天应依赖公开并发语义，不要把“分段数量”当成实现契约。

BlockingQueue 把“等待队列非空/非满”的条件同步封装起来，是生产者—消费者模式的首选构件：

~~~java
var queue = new ArrayBlockingQueue<Job>(100);
queue.put(job);       // 满时阻塞，形成自然背压
Job next = queue.take(); // 空时阻塞
process(next);
~~~

本章还介绍 Deque 与工作窃取、CountDownLatch、FutureTask、Semaphore、CyclicBarrier。Java 7 的 ForkJoinPool 将工作窃取带入标准库；Java 8 增加 CompletableFuture；高竞争统计计数可考虑 LongAdder，但其 sum 不是原子快照，不适合账户余额一类强一致值。

### 阶段三：把线程安全对象组织成可管理的任务系统

#### 第6章：任务与执行策略解耦

直接为每个请求创建线程会带来创建开销、资源上限和管理缺失。Executor 用 execute(Runnable) 把任务提交与执行策略分开，使串行执行、固定池、缓存池或自定义执行器可以替换，而业务任务无需改写。

ExecutorService 提供 shutdown、shutdownNow 与 awaitTermination。Callable 可以返回值并抛出受检异常，Future 表示尚未完成的结果；Future.get 同时是等待点、异常传播点和内存可见性边界。

CompletionService 适合“先完成先处理”，避免按提交顺序 get 的头部阻塞：

~~~java
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    CompletionService<Image> completion =
            new ExecutorCompletionService<>(pool);
    for (Info info : imageInfos) {
        completion.submit(info::download);
    }
    for (int i = 0; i < imageInfos.size(); i++) {
        render(completion.take().get());
    }
}
~~~

书中的页面渲染与旅行预订示例说明：并行化只有在任务相对独立、开销足够大、结果组合清晰时才值得做。异构任务整体耗时受最慢任务支配；超时后应取消尚未完成的 Future。

【当前补充】JDK 21 的 Executors.newVirtualThreadPerTaskExecutor 让每个任务使用一个新虚拟线程，适合大量阻塞 I/O；真正稀缺的数据库连接、外部 API 配额仍需 Semaphore 或连接池限流。

#### 第7章：取消是协作协议，关闭是所有权责任

Java 没有安全的强制线程终止。Thread.interrupt 不会“杀死线程”，而是设置中断状态；sleep、wait、BlockingQueue 等可中断阻塞方法会抛出 InterruptedException。

处理中断的正确选择通常只有两种：向上抛出，让调用者决定；或完成必要清理后恢复中断状态。

~~~java
try {
    queue.put(item);
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    return;
}
~~~

Future.cancel(true) 只是请求中断，任务能否及时结束取决于它是否遵守中断协议。对于不响应中断的阻塞操作，可以把关闭 Socket 等资源动作封装进取消方法。

服务关闭必须由拥有线程或 Executor 的组件负责。shutdownNow 无法可靠判断已开始但未完成的业务工作，因此任务还需要幂等、补偿或持久化设计。未捕获异常可由 UncaughtExceptionHandler 记录；关闭钩子应短小且互不依赖；守护线程不保证 finally 执行，终结器不适合作为资源管理机制。

术语：

- **Interruption（中断）**：线程之间的协作式取消信号。
- **Cancellation policy（取消策略）**：谁请求取消、任务如何响应、何时算取消完成。
- **Ownership（线程所有权）**：创建并管理线程生命周期的组件负责关闭它。
- **Poison pill（毒丸对象）**：队列中的特殊终止标记，只适合拓扑已知的场景。

#### 第8章：线程池配置本质是容量规划

任务之间若存在隐式依赖，线程池可能发生线程饥饿死锁：池中所有线程都在等待由同一池中尚未获得线程的任务完成。

池大小要区分 CPU 密集与 I/O 密集任务，长短任务混合时可隔离线程池。ThreadPoolExecutor 的 corePoolSize、maximumPoolSize、keepAliveTime、workQueue、ThreadFactory 和 RejectedExecutionHandler 共同组成过载策略。

【纠正】Executors.newFixedThreadPool 使用无界 LinkedBlockingQueue，maximumPoolSize 实际不起扩容作用；newCachedThreadPool 的线程数近似无界。生产服务若没有外部限流，不应只因工厂方法简洁就默认使用。

CallerRunsPolicy 会让提交线程自己执行任务，形成反馈控制，但也会把延迟传播到调用链。扩展 beforeExecute、afterExecute、terminated 可做统计诊断；递归 CPU 分治在现代 Java 中通常优先考虑 ForkJoinPool，并避免在公共池中执行不可控阻塞。

#### 第9章：单线程模型也是一种并发策略

Swing 组件大多不是线程安全的，因此把组件状态封闭在事件分派线程 EDT 中。所有短小界面操作在 EDT 执行；耗时操作放到后台，再把结果发布回 EDT。

本章的核心是“单线程子系统”模式：单线程消除内部大量锁；进入请求必须排队；不能在单线程上执行长时间阻塞任务；与外部线程共享的数据模型仍需不可变、复制或同步。

SwingWorker 把后台计算、进度更新、取消和 EDT 回调组合起来。现代 JavaFX、Actor mailbox、事件循环都能看到同一思想。其局限是吞吐量上限与尾延迟集中到一个队列，优化方向是缩短事件线程工作并把纯计算或 I/O 移出。

### 阶段四：确保系统能前进、能扩展、能被验证

#### 第10章：避免死锁、饥饿和活锁

锁顺序死锁需要互斥、占有并等待、不可抢占、循环等待。工程上最实用的破局方法是消除循环等待，为所有锁建立稳定的全局顺序。

转账不能按“先锁转出账户，再锁转入账户”直接实现，因为相反方向转账会成环。可根据账户唯一 ID 排序，始终先锁较小 ID。

~~~java
public void transfer(Account from, Account to, Money amount) {
    Account first = from.id() < to.id() ? from : to;
    Account second = first == from ? to : from;
    synchronized (first) {
        synchronized (second) {
            debitAndCredit(from, to, amount);
        }
    }
}
~~~

动态锁顺序尤其危险。协作对象死锁发生在持有自身锁时调用另一个对象，而对方反向调用。开放调用要求只在维护本对象状态时持锁，调用未知外部代码前释放锁。

定时 tryLock 能把永久等待变成可检测失败，并支持退避重试；线程转储可显示等待环。还要关注饥饿、活锁和糟糕响应性。

#### 第11章：性能优化先找串行瓶颈

性能包含吞吐量、服务时间、等待时间、资源利用率与可伸缩性，不能只看单次执行时间。Amdahl 定律给出并行加速上限：

~~~text
Speedup(N) = 1 / (F + (1 - F) / N)
~~~

F 是必须串行执行的比例。即使处理器无限多，只要 10% 串行，理论加速也不超过 10 倍。隐藏串行部分常出现在共享队列、集中日志、唯一 ID、全局锁和结果合并。

线程成本包括调度、上下文切换、缓存失效、内存屏障和锁竞争。优化可缩短锁持有时间、降低请求锁频率、拆分独立状态、使用并发容器、不可变对象、线程封闭或原子变量。

【当前补充】高竞争统计计数可用 LongAdder；读多写少且需要乐观读可评估 StampedLock，但它们有更弱或更复杂的语义。普通短命对象通常不应池化，除非资源创建确实昂贵且测量证明收益。

#### 第12章：并发测试要验证不变性条件，而不是一次运行

并发错误依赖时序，一次测试通过几乎没有证明力。正确性测试应覆盖串行行为、阻塞与解除阻塞、取消和中断、并发不变性、线程与连接泄漏。

原书 PutTakeTest 使用 CyclicBarrier 让生产者和消费者同时起跑，并用校验和验证放入与取出元素一致。现代测试可以这样组织：

~~~java
var start = new CountDownLatch(1);
var done = new CountDownLatch(workers);
var failures = new ConcurrentLinkedQueue<Throwable>();

for (int i = 0; i < workers; i++) {
    executor.submit(() -> {
        try {
            start.await();
            exerciseSharedObject();
        } catch (Throwable t) {
            failures.add(t);
        } finally {
            done.countDown();
        }
    });
}
start.countDown();
assertTrue(done.await(10, TimeUnit.SECONDS));
assertTrue(failures.isEmpty());
~~~

性能测试要避免 GC 落入计时窗口、JIT 未预热、路径与生产不同、竞争程度不真实、结果未使用而被消除。

【当前补充】微基准应使用 JMH；并发正确性可结合 jcstress、长期压力测试、线程转储、JFR 和生产指标。静态分析不能替代对状态协议的设计审查。

### 阶段五：在确有必要时进入底层同步

#### 第13章：显式锁是能力扩展，不是默认替代品

ReentrantLock 与 synchronized 都提供互斥与相同内存语义。显式锁额外支持 tryLock、定时锁、lockInterruptibly、可选公平、多 Condition 以及非块结构。

~~~java
Lock lock = new ReentrantLock();
lock.lock();
try {
    updateState();
} finally {
    lock.unlock();
}
~~~

公平锁能减少长期饥饿，但调度与上下文切换通常使吞吐量下降。ReadWriteLock 只有在读占绝大多数、读临界区足够长、写等待可接受时才可能优于普通互斥锁。

【版本变化】现代 JVM 已长期优化 synchronized。除非需要定时、可中断、公平或多条件队列，优先使用结构更安全的 synchronized。

#### 第14章：同步器由状态、条件谓词和等待队列组成

状态依赖方法只有在前提条件为真时才能执行，例如有界缓冲区 put 要求未满，take 要求非空。轮询加 sleep 会增加延迟和无效唤醒。

Object.wait 必须在持有对象锁时调用，并放在 while 循环中重新检查条件：

~~~java
public synchronized V take() throws InterruptedException {
    while (isEmpty()) {
        wait();
    }
    V value = doTake();
    notifyAll();
    return value;
}
~~~

使用 while 是因为过早唤醒、其他线程可能先消费条件、不同条件可能共享等待集。Condition 可把一个 Lock 关联到多个等待集，分别 signal notEmpty 与 notFull。

AbstractQueuedSynchronizer（AQS）把同步器拆成整数状态、FIFO 等待队列和 tryAcquire/tryRelease 等钩子。ReentrantLock、Semaphore、CountDownLatch、FutureTask、ReentrantReadWriteLock 都建立在类似框架上。普通业务应优先使用现成类。

术语：

- **Condition predicate（条件谓词）**：决定操作当前能否执行的状态表达式。
- **Condition queue（条件队列）**：等待某个谓词变真的线程集合。
- **Spurious wakeup（虚假/过早唤醒）**：唤醒后条件未必成立，必须重检。
- **AQS**：AbstractQueuedSynchronizer，抽象队列同步器。

#### 第15章：CAS 用乐观重试换取更少的阻塞

现代处理器提供 Compare-And-Set（CAS）：仅当内存值仍等于期望值时写入新值，并返回是否成功。原子变量把 volatile 可见性与原子更新结合起来，适合单变量或可压缩成单个状态的更新。

Treiber 栈核心是反复读取栈顶并 CAS：

~~~java
public void push(E item) {
    Node<E> newHead = new Node<>(item);
    Node<E> oldHead;
    do {
        oldHead = head.get();
        newHead.next = oldHead;
    } while (!head.compareAndSet(oldHead, newHead));
}
~~~

非阻塞算法避免一个线程挂起导致其他线程全部等待，但证明线性化点、处理内存回收和边界条件非常困难。业务代码应优先使用 ConcurrentLinkedQueue、ConcurrentHashMap、AtomicReference 等成熟实现。

ABA 问题是值从 A 变 B 又回 A，CAS 看不出中间变化。可用版本戳、AtomicStampedReference、不可复用节点或特定内存管理策略解决。

#### 第16章：Java 内存模型给跨线程观察建立规则

【原书】本章用一个问题引出 JMM：“在什么条件下，读取 aVariable 的线程将看到另一个线程写入的值 3？”答案不能只靠源代码顺序，因为编译器会重排，处理器会乱序执行，值会停留在寄存器或缓存。

JMM 定义哪些同步动作建立 happens-before。若 A happens-before B，则 A 的结果对 B 可见，并且 A 在内存语义上先于 B。

重要规则：

- 程序次序：同一线程中前面的操作先行发生于后续操作。
- 监视器锁：解锁先行发生于后续对同一锁的加锁。
- volatile：写先行发生于后续对同一变量的读。
- 线程启动：start 前的操作先行发生于新线程中的操作。
- 线程终止：线程中的操作先行发生于另一个线程从 join 成功返回。
- 传递性：A → B 且 B → C，则 A → C。

双重检查加锁在 Java 5 新内存模型后只有配合 volatile 才正确：

~~~java
public final class ResourceHolder {
    private static volatile Resource instance;

    public static Resource getInstance() {
        Resource result = instance;
        if (result == null) {
            synchronized (ResourceHolder.class) {
                result = instance;
                if (result == null) {
                    result = new Resource();
                    instance = result;
                }
            }
        }
        return result;
    }
}
~~~

更简单的选择通常是静态初始化器或初始化占位类。final 字段有初始化安全性，但 final 引用指向对象的后续可变状态仍需同步。

实用结论是：使用锁、volatile、final、线程安全容器、Future、任务队列等已建立同步边的工具，并把对象发布路径写清楚。

### 阶段六：把并发契约写进代码和文档

#### 附录A：并发性标注

附录定义：

- **@Immutable**：实例构造后不可变，也隐含线程安全。
- **@ThreadSafe**：类在文档允许的并发使用下保持正确。
- **@NotThreadSafe**：调用者必须自行封闭或同步。
- **@GuardedBy**：记录字段或方法需要持有哪些锁。

标注本身不产生同步效果，价值是让评审者、维护者和静态分析工具知道设计契约。它们不属于 Java SE；项目可使用 Checker Framework、Error Prone 风格标注或自定义标注。真正重要的是保持“状态变量—不变性条件—保护锁”一致。

## 四、原书 Java 5/6 语境与 JDK 27 的关键差异

| 原书主题 | 原书时代 | 截至 JDK 27 的状态 | 实践建议 |
| --- | --- | --- | --- |
| 平台线程 | Thread 基本对应 OS 线程，通常必须池化 | JDK 21 正式提供虚拟线程 | I/O 型每任务一虚拟线程；CPU 型仍按核数限制并行度 |
| ThreadLocal | 常用于线程封闭和上下文 | 虚拟线程可用；Scoped Values 在 JDK 25 正式交付 | 只读调用上下文优先评估 ScopedValue |
| 任务组织 | Executor/Future 为主 | CompletableFuture、ForkJoin、虚拟线程、结构化并发 | 根据阻塞模型与失败传播方式选择 |
| 结构化并发 | 原书中是设计层描述 | JDK 27 StructuredTaskScope 为第七次预览 | 生产采用需评估预览特性政策 |
| ConcurrentHashMap | 分段锁实现 | Java 8 起以 CAS、桶级同步与树化为主 | 依赖 API 语义，不依赖实现细节 |
| synchronized 与 Lock | 显式锁在部分竞争场景有优势 | JVM 已长期优化内置锁 | 默认 synchronized；需要额外能力再用 Lock |
| 热点计数 | AtomicLong | Java 8 增加 LongAdder | 统计值可用 LongAdder；强一致值仍用 AtomicLong/锁 |
| 异步结果 | Future、CompletionService | Java 8 增加 CompletableFuture | 复杂异步图可用，但集中处理异常和超时 |
| 工作窃取 | 作为模式介绍 | Java 7 ForkJoinPool、Java 8 并行流 | CPU 分治可用；阻塞任务要隔离 |
| 资源清理 | 讨论终结器局限 | finalization 已弃用并走向移除 | 使用 try-with-resources、Cleaner 兜底和显式生命周期 |

### 虚拟线程的最小现代示例

~~~java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = urls.stream()
            .map(url -> executor.submit(() -> httpGet(url)))
            .toList();
    for (Future<String> future : futures) {
        consume(future.get());
    }
}
~~~

虚拟线程适合任务数量很大、任务多数时间等待网络/数据库/文件 I/O 的系统。它们“不更快”，而是允许更高并发度；CPU 密集工作仍受处理器核数限制。不要固定池化虚拟线程，应对数据库连接等外部稀缺资源单独限流。

### JDK 27 结构化并发的定位

结构化并发把同一请求衍生的子任务限制在词法作用域中，父任务统一等待、取消和处理失败。这修复普通 Future 容易出现的子任务泄漏、失败后兄弟任务仍运行、异常散落等问题。

截至 2026-09-19，JDK 27 已于 2026-09-15 GA，但 JEP 533 Structured Concurrency 仍是第七次预览。示例需启用预览：

~~~text
javac --enable-preview --release 27 Main.java
java --enable-preview Main
~~~

因此本文把它作为现代扩展，而不把预览 API 写成稳定生产契约。

## 五、今天可执行的学习与实验环境

### 1. 选择 JDK

- 日常工程：JDK 25 LTS，适合长期维护，并已正式包含虚拟线程与 Scoped Values。
- 跟踪最新并发 API：JDK 27，用于试验结构化并发第七次预览。

安装后检查：

~~~powershell
java -version
javac -version
~~~

本文所在机器实际验证环境为 OpenJDK 21 与 Maven 3.9.9；基础示例只使用 Java 21 已稳定 API。JDK 25/27 版本状态来自 OpenJDK 官方资料，未在本机安装运行。

### 2. 创建 Maven 实验项目

~~~powershell
mvn archetype:generate -DgroupId=example.concurrent -DartifactId=concurrency-lab -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false
Set-Location concurrency-lab
~~~

在 pom.xml 中设置：

~~~xml
<properties>
  <maven.compiler.release>21</maven.compiler.release>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
~~~

若使用 JDK 27 预览 API，把 release 改为 27，并为编译器和测试 JVM 增加 --enable-preview。预览 class 文件只能在对应版本、同样开启预览的 JVM 上运行。

### 3. 推荐工具链

- **JUnit 5**：业务级并发测试与超时断言。
- **JMH**：处理预热、JIT、死代码消除等微基准陷阱。
- **jcstress**：验证 JMM 下可能出现的结果集合。
- **JFR / JDK Mission Control**：观察锁竞争、线程阻塞、CPU 和分配。
- **jcmd Thread.print / jstack**：采集线程转储与定位死锁。
- **async-profiler**：分析 CPU、分配、锁和壁钟时间热点。

### 4. 实验顺序

1. 用不安全计数器复现丢失更新。
2. 用 synchronized、AtomicLong、LongAdder 修复并比较语义。
3. 用 BlockingQueue 实现有界生产者—消费者。
4. 给任务加入中断、超时和 Executor 关闭。
5. 构造固定池线程饥饿死锁，再拆池或移除任务内等待。
6. 用 JMH 比较锁竞争，不用一次 nanoTime 下结论。
7. 将阻塞 I/O 从固定平台线程池迁移到虚拟线程，比较吞吐量和下游等待。
8. 最后研究 AQS、CAS 和结构化并发。

## 六、书外方案何时更合适

### CompletableFuture

适合少量清晰的异步阶段、扇出/汇聚和非阻塞组合。组合算子丰富，但异常、取消、线程池选择和上下文传播容易分散。链路很长时，虚拟线程的顺序代码往往更易读。

### Reactor、RxJava 与响应式流

适合端到端异步、需要背压、已有响应式驱动和团队经验的系统。若依赖栈大多是同步阻塞 API，强行响应式化可能增加调试成本；虚拟线程提供了另一条扩展阻塞代码的路线。

### Actor 模型

通过消息传递和单 Actor 串行处理减少共享内存，适合状态天然按实体分片或需要监督恢复的系统。代价是邮箱积压、跨 Actor 事务和最终一致性设计。

### Kotlin 协程

Kotlin 协程提供结构化取消、挂起函数和丰富生态。它与 Java 虚拟线程都能避免一请求一昂贵平台线程，但抽象层不同：协程由语言和库组织挂起点，虚拟线程保持 Thread 与阻塞 API 模型。

最终判断：共享状态正确性先用本书规则；大量阻塞任务考虑虚拟线程；复杂异步数据管线和背压考虑响应式流；任务树失败与取消管理关注结构化并发。不要用调度模型掩盖状态模型，也不要用 CAS 替代清晰设计。

## 七、可迁移的检查清单

设计并发类：

- 列出全部可变状态和不变性条件。
- 明确状态由封闭、不可变、volatile、原子变量还是某把锁保护。
- 不在构造期间发布 this。
- 用库组件表达队列、门闩、许可、结果和取消。
- 把线程安全保证与锁策略写入文档。

设计任务系统：

- 任务与线程解耦，执行器由拥有者管理并关闭。
- 明确过载、队列边界、拒绝、超时和取消策略。
- 不吞中断，不假设 shutdownNow 能回滚业务。
- 避免池中任务同步等待同池子任务。
- 持锁时不调用不可控外部代码。

评估性能与正确性：

- 先定义吞吐量、平均延迟、尾延迟和资源目标。
- 找串行比例、锁竞争、下游容量，而不是先增加线程。
- 用真实负载、预热和专业工具测量。
- 找出建立 happens-before 的同步边。
- 测试取消、超时、阻塞解除、资源泄漏和失败路径。

## 八、结语

《Java 并发编程实战》最经得住时间检验的部分，不是 Java 5 某个类的具体实现，而是它反复训练的思维方式：线程安全来自受控状态，活跃性来自可终止的等待关系，性能来自减少串行瓶颈，正确性来自可以说清楚的同步协议。

JDK 27 已拥有虚拟线程、Scoped Values 和结构化并发预览，但工程判断仍从同一组问题开始：谁拥有状态？谁能修改它？一个写入如何对另一个线程可见？失败由谁传播？任务由谁取消？资源由谁关闭？如果这些问题没有答案，换一种并发框架只会换一种方式暴露错误。

## 九、来源与版本核验

- Brian Goetz 等：《Java 并发编程实战》，机械工业出版社，2012 年 2 月第 1 版，ISBN 978-7-111-37004-8；本文一手文本。
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)：JDK 21 正式交付虚拟线程。
- [JEP 506: Scoped Values](https://openjdk.org/jeps/506)：JDK 25 正式交付 Scoped Values。
- [JEP 533: Structured Concurrency (Seventh Preview)](https://openjdk.org/jeps/533)：JDK 27 第七次预览。
- [OpenJDK JDK 27](https://openjdk.org/projects/jdk/27/)：2026-09-15 General Availability。
- [Java SE 21 java.util.concurrent API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)：并发包公开契约。
- [Java Language Specification, Chapter 17](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)：线程、锁、内存模型与 happens-before。

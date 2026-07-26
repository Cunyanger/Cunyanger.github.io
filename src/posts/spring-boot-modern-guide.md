---
title: Spring Boot 最新通俗参考指南：从 2.x 到 4.1 的代码化理解
date: 2026-07-27
category: Java
tag:
  - Spring Boot
  - Java
  - Web
  - JPA
  - Actuator
  - Testing
isOriginal: true
excerpt: 以旧版 Spring Boot 参考指南的章节为线索，用 Spring Boot 4.1 的现代写法重新讲解启动、自动配置、配置文件、Web、数据访问、测试、监控和部署。
---

# Spring Boot 最新通俗参考指南：从 2.x 到 4.1 的代码化理解

这篇文章参考了本地 PDF《Spring Boot参考指南(最新版).pdf》。那份 PDF 实际是 2018 年的 Spring Boot 2.0.1.BUILD-SNAPSHOT 参考指南，目录覆盖入门、构建系统、自动配置、外部化配置、Web、数据访问、测试、Actuator、部署和构建插件。

但它已经明显过时。本文按 2026-07-27 的 Spring Boot 官方文档重写，默认使用 Spring Boot 4.1.x 的思路，同时会指出 2.x、3.x 和 4.x 的主要差异。

## 先理解 Spring Boot 解决什么问题

不用 Spring Boot 时，一个 Spring Web 项目通常要自己处理很多东西：

- 引入一堆 Spring、Jackson、Tomcat、日志、校验依赖。
- 写大量 XML 或 Java Config。
- 配置 MVC、JSON、错误页、静态资源。
- 手动决定使用哪个版本的第三方库。
- 打包后还要部署到外部 Tomcat。

Spring Boot 的核心价值是：

```text
给你一套默认工程约定，让一个 Spring 应用能快速创建、配置、运行、测试和部署。
```

它不是替代 Spring，而是站在 Spring Framework 上帮你把常用组合装好。

## 版本路线：2.x、3.x、4.x 差异

| 版本 | Java 要求 | 核心变化 | 迁移重点 |
| --- | --- | --- | --- |
| Spring Boot 2.x | Java 8 起步 | Spring Framework 5、`javax.*`、传统 Servlet 4/5 生态 | 旧项目常见版本 |
| Spring Boot 3.x | Java 17 起步 | Spring Framework 6、Jakarta EE 9、`javax.*` 迁到 `jakarta.*`、AOT/Native 更成熟 | 主要迁移成本是包名和依赖兼容 |
| Spring Boot 4.x | Java 17 起步 | Spring Framework 7、Jakarta EE 11、依赖和自动配置进一步模块化 | 新项目优先选择，老项目先从 2.x 到 3.x 再评估 4.x |

最重要的一条：从 Boot 2 升到 Boot 3 或 4，很多 Web、JPA、Validation、Servlet 相关包名要从 `javax.*` 改为 `jakarta.*`。

Spring Boot 4.1.0 当前要求至少 Java 17，兼容到 Java 26；构建工具要求 Maven 3.6.3+ 或 Gradle 8.14+/9.x。4.1 相对 4.0 的新增重点包括 Spring gRPC 支持、HTTP Client SSRF 防护、OpenTelemetry/可观测性增强、Jackson 配置增强、Log4j 文件轮转支持等。普通 Web 后台项目不一定马上用到这些特性，但它说明 Boot 正在把“生产运行”和“服务间通信”的能力继续前移到框架默认支持里。

例如旧代码：

```java
import javax.validation.constraints.NotBlank;
import javax.persistence.Entity;
```

新代码：

```java
import jakarta.validation.constraints.NotBlank;
import jakarta.persistence.Entity;
```

## 创建项目

现代项目建议直接用 Spring Initializr 创建：

```text
https://start.spring.io/
```

选择：

- Project：Maven
- Language：Java
- Spring Boot：4.1.x
- Java：21 或 25
- Dependencies：Spring Web、Validation、Spring Data JPA、H2 Database、Actuator、Spring Boot DevTools、Spring Boot Test

Maven 核心配置示例：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.0</version>
    <relativePath/>
</parent>

<properties>
    <java.version>21</java.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webmvc</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

说明：

- 旧 PDF 里常见 `spring-boot-starter-web`。
- Boot 4 对 starter 做了更细的命名和模块化，Servlet MVC 项目更推荐明确使用 `spring-boot-starter-webmvc`。
- 如果你使用的是 Boot 3.5 或更早版本，继续用 `spring-boot-starter-web` 是常规写法。

## 启动类

一个 Spring Boot 应用从 `main` 方法启动：

```java
package com.example.todo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TodoApplication {

    public static void main(String[] args) {
        SpringApplication.run(TodoApplication.class, args);
    }
}
```

`@SpringBootApplication` 可以理解成三个能力的组合：

- `@SpringBootConfiguration`：这是一个配置类。
- `@EnableAutoConfiguration`：开启自动配置。
- `@ComponentScan`：扫描当前包和子包里的组件。

所以启动类最好放在根包：

```text
com.example.todo
├── TodoApplication.java
├── controller
├── service
├── repository
└── entity
```

不要把启动类放到很深的子包，否则组件扫描可能扫不到同级目录。

## Starter 是什么

Starter 是一组依赖套餐。

你引入：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>
</dependency>
```

Boot 会帮你带上：

- Spring MVC
- JSON 序列化
- 嵌入式 Web 服务器
- 日志
- 自动配置

你不需要自己一个个猜版本。Boot 的依赖管理会给出一组兼容版本。

## 自动配置怎么工作

自动配置不是魔法。它大致做了这件事：

```text
如果类路径里有某个库，并且用户没有自己定义 Bean，Spring Boot 就按默认规则创建 Bean。
```

例如类路径里有 Spring MVC，Boot 就配置：

- DispatcherServlet
- JSON 转换器
- 静态资源映射
- 错误处理
- 参数绑定

例如类路径里有 HikariCP 和 JDBC，Boot 就配置：

- DataSource
- JdbcTemplate
- 事务管理器

你可以覆盖默认 Bean，也可以关闭某个自动配置：

```java
@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
public class TodoApplication {
}
```

但不要一上来就排除自动配置。先理解它为什么生效，再决定是否覆盖。

## 配置文件

现代项目推荐用 `application.yml`：

```yaml
spring:
  application:
    name: todo-service
  datasource:
    url: jdbc:h2:mem:todo
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

旧 PDF 中有些属性名已经不推荐。例如静态资源位置过去常见：

```properties
spring.resources.static-locations=classpath:/static/
```

现代写法是：

```properties
spring.web.resources.static-locations=classpath:/static/
```

学习 Boot 时要养成习惯：属性以官方当前版本的 `Application Properties` 为准，不要复制 2018 年教程里的配置。

## Profile 环境隔离

常见环境：

```text
application.yml
application-dev.yml
application-test.yml
application-prod.yml
```

启动时指定：

```bash
java -jar app.jar --spring.profiles.active=prod
```

或环境变量：

```bash
set SPRING_PROFILES_ACTIVE=prod
```

推荐做法：

- `dev` 可以用 H2、本地 MySQL、本地 Redis。
- `test` 用测试库和测试账号。
- `prod` 不把密码写进仓库，使用环境变量、Kubernetes Secret 或云厂商密钥管理。

## 类型安全配置

不要到处写 `@Value("${xxx}")`。复杂配置建议用 `@ConfigurationProperties`。

```java
package com.example.todo.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.todo")
public record TodoProperties(
        @NotBlank String defaultOwner,
        @Min(1) int pageSize
) {
}
```

注册配置：

```java
package com.example.todo.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(TodoProperties.class)
public class AppConfig {
}
```

配置文件：

```yaml
app:
  todo:
    default-owner: system
    page-size: 20
```

这样配置项有类型、有校验、能被 IDE 提示，比字符串散落在业务代码里稳定。

## 写一个 Todo API

实体：

```java
package com.example.todo.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private boolean completed;

    protected Todo() {
    }

    public Todo(String title) {
        this.title = title;
        this.completed = false;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void complete() {
        this.completed = true;
    }
}
```

Repository：

```java
package com.example.todo.repository;

import com.example.todo.entity.Todo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TodoRepository extends JpaRepository<Todo, Long> {
}
```

请求 DTO：

```java
package com.example.todo.controller;

import jakarta.validation.constraints.NotBlank;

public record CreateTodoRequest(
        @NotBlank(message = "标题不能为空") String title
) {
}
```

Service：

```java
package com.example.todo.service;

import com.example.todo.entity.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TodoService {

    private final TodoRepository repository;

    public TodoService(TodoRepository repository) {
        this.repository = repository;
    }

    public List<Todo> findAll() {
        return repository.findAll();
    }

    public Todo create(String title) {
        return repository.save(new Todo(title));
    }

    @Transactional
    public Todo complete(Long id) {
        Todo todo = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Todo 不存在"));
        todo.complete();
        return todo;
    }
}
```

Controller：

```java
package com.example.todo.controller;

import com.example.todo.entity.Todo;
import com.example.todo.service.TodoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoService service;

    public TodoController(TodoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Todo> list() {
        return service.findAll();
    }

    @PostMapping
    public Todo create(@Valid @RequestBody CreateTodoRequest request) {
        return service.create(request.title());
    }

    @PostMapping("/{id}/complete")
    public Todo complete(@PathVariable Long id) {
        return service.complete(id);
    }
}
```

这里已经覆盖了 Boot 项目的主干：

```text
HTTP 请求 -> Controller -> Service -> Repository -> Database
```

## 全局异常处理

不要在每个 Controller 里写重复的 `try catch`。用 `@RestControllerAdvice`：

```java
package com.example.todo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> handleIllegalArgument(IllegalArgumentException ex) {
        return Map.of("message", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        FieldError::getDefaultMessage,
                        (left, right) -> left
                ))
                .toString();
        return Map.of("message", message);
    }
}
```

生产项目可以定义统一响应体，例如：

```java
public record ApiError(String code, String message) {
}
```

不要直接把数据库异常、堆栈、SQL 细节返回给前端。

## 数据访问建议

JPA 适合：

- CRUD 为主。
- 表关系清晰。
- 想要 Repository 抽象。
- 项目团队熟悉 Hibernate。

MyBatis 适合：

- SQL 很复杂。
- 强调可控 SQL。
- 需要适配已有数据库。
- 团队习惯手写 SQL。

Boot 不强制你用哪一个。它只是根据你引入的 starter 自动配置对应能力。

无论用 JPA 还是 MyBatis，都建议：

- Service 层控制事务。
- Controller 不直接访问 Repository。
- 查询接口做分页。
- 不在日志里打印敏感数据。
- 生产环境不要用 `ddl-auto: update` 自动改表结构。

## 调用外部 HTTP 服务

旧教程里常见 `RestTemplate`。现代项目可以使用 `RestClient` 或 `WebClient`。

同步调用可以用 `RestClient`：

```java
package com.example.todo.client;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class UserClient {

    private final RestClient restClient;

    public UserClient(RestClient.Builder builder) {
        this.restClient = builder
                .baseUrl("https://example.com")
                .build();
    }

    public String getUserName(Long userId) {
        return restClient.get()
                .uri("/api/users/{id}", userId)
                .retrieve()
                .body(String.class);
    }
}
```

响应式项目再考虑 `WebClient`。不要为了“新”而把普通 MVC 项目强行改成响应式。

## Actuator 生产端点

加入：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

配置：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      probes:
        enabled: true
      show-details: when-authorized
```

常用端点：

- `/actuator/health`
- `/actuator/info`
- `/actuator/metrics`
- `/actuator/prometheus`

生产环境不要暴露所有端点。尤其是 `env`、`beans`、`configprops`，可能包含敏感信息。

## 测试

Controller 切片测试：

```java
package com.example.todo.controller;

import com.example.todo.service.TodoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TodoController.class)
class TodoControllerTests {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    TodoService todoService;

    @Test
    void listReturnsOk() throws Exception {
        when(todoService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/todos"))
                .andExpect(status().isOk());
    }
}
```

完整上下文测试：

```java
package com.example.todo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class TodoApplicationTests {

    @Test
    void contextLoads() {
    }
}
```

Boot 4 使用 Spring Framework 7，对测试替身的推荐 API 也在变化。旧代码里常见的 `@MockBean` 在新项目中应优先关注当前官方推荐的 `@MockitoBean`。

## 开发体验

开发期常用：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <optional>true</optional>
</dependency>
```

它可以提供：

- 本地自动重启。
- 开发期默认配置。
- LiveReload 支持。

只建议开发期使用，不要把它带到生产运行环境。

## 打包和运行

打包：

```bash
./mvnw clean package
```

运行：

```bash
java -jar target/todo-service-0.0.1-SNAPSHOT.jar
```

指定环境：

```bash
java -jar target/todo-service-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

Boot 的 Maven 插件会把应用重新打包成可执行 jar。这个 jar 内部通常包含：

```text
BOOT-INF/classes    # 你的业务类和资源
BOOT-INF/lib        # 依赖 jar
org/springframework/boot/loader
```

这就是为什么它能 `java -jar` 直接运行。

## 容器镜像

现代部署通常直接打镜像。Spring Boot Maven 插件可以构建 OCI 镜像：

```bash
./mvnw spring-boot:build-image
```

也可以写 Dockerfile：

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/todo-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

生产环境建议：

- 使用非 root 用户。
- JVM 参数通过环境变量传入。
- 暴露 health probe。
- 日志输出到标准输出。
- 配置走环境变量或配置中心。

## 从旧 PDF 学习时要避开的坑

1. PDF 是 2018 年 Spring Boot 2.0.1 快照文档，不是今天的最新版。
2. Java 8/9 的要求已经过时，新项目建议 Java 21 起步。
3. `javax.*` 示例已经过时，新代码使用 `jakarta.*`。
4. `spring.resources.*` 这类旧属性名不要继续复制。
5. `WebSecurityConfigurerAdapter` 相关旧教程不要照抄，新 Spring Security 使用 `SecurityFilterChain`。
6. 生产环境不要把 Actuator 所有端点暴露出去。
7. 旧教程强调 CLI，但现代企业项目更多使用 Maven、Gradle、IDE、Docker 和 CI/CD。
8. `RestTemplate` 还能维护老代码，新代码优先看 `RestClient` 或 `WebClient`。

## 学习顺序

推荐顺序：

1. 会创建项目，知道 starter 和依赖管理。
2. 会写启动类，理解组件扫描。
3. 会写 Controller、Service、Repository。
4. 会用 `application.yml` 和 profile。
5. 会写参数校验和全局异常处理。
6. 会写单元测试、切片测试、集成测试。
7. 会用 Actuator 看健康状态和指标。
8. 会打 jar、打镜像、指定环境变量运行。
9. 再学习 Security、缓存、消息队列、任务调度、Spring Cloud。

## 总结

Spring Boot 的核心一直没变：用约定、starter、自动配置和可执行应用把 Spring 项目的样板工作降到最低。

变化最大的是生态底座：

- Boot 2 是 `javax.*` 和 Java 8 时代。
- Boot 3 进入 Java 17 和 Jakarta 时代。
- Boot 4 进一步面向 Spring Framework 7、Jakarta EE 11、模块化 starter 和现代部署方式。

所以读旧版参考指南时，不要照搬版本和代码。应该学习它的主线：构建系统、启动类、自动配置、配置文件、Web、数据、测试、监控、部署。真正落地时，以当前 Spring Boot 官方文档和 Spring Initializr 生成的项目为准。

## 参考资料

- 本地 PDF：`D:\WorkSpace\Blog\Spring Boot参考指南(最新版).pdf`
- [Spring Boot Reference Documentation](https://docs.spring.io/spring-boot/reference/)
- [Spring Boot System Requirements](https://docs.spring.io/spring-boot/system-requirements.html)
- [Spring Boot Maven Plugin](https://docs.spring.io/spring-boot/maven-plugin/)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/reference/actuator/index.html)
- [Spring Boot 4.1.0 available now](https://spring.io/blog/2026/06/10/spring-boot-4)
- [Spring Boot 4.1 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.1-Release-Notes)
- [Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)

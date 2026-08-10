---
title: Effective TypeScript 62 Specific Ways to Improve Your TypeScript
date: 2026-08-10
article: false
icon: pen-to-square
bookCategory: TypeScript 与 JavaScript
bookAuthor: Dan Vanderkam
bookColor: zinc
category:
  - 软件开发
bookCover: /assets/images/effective-typescript-cover.png
cover: 
tag:
  - 软件开发
  - TypeScript
  - JavaScript
  - 类型系统
isOriginal: true
excerpt: 以 Dan Vanderkam 的《Effective TypeScript》第一版 PDF 为主线，逐项解释 62 条建议背后的类型系统模型、工程取舍、迁移策略和现代 TypeScript 补充。
---

# 《Effective TypeScript》深度阅读

> **书目信息**：Dan Vanderkam，_Effective TypeScript: 62 Specific Ways to Improve Your TypeScript_，O'Reilly Media，2020，ISBN 978-1-492-05374-3。本文的章节顺序、短引文、示例意图和 62 个 Item 均以题目提供的 PDF 为依据。
>
> **证据标记**：原书表示 PDF 正文直接讨论的内容；当前补充表示截至 2026-08-10 根据 TypeScript 官方文档、npm 发行信息或作者的更新页面核对的实践；纠正表示第一版中的工具或语法已经变化，不能照搬到今天。

## 一、先建立全书地图

### 1. 全局摘要：TypeScript 到底解决什么问题

书中对 TypeScript 的核心描述是：**“TypeScript is a typed superset of JavaScript.”**（前言与第 1 章）。这里的 superset 首先是语法关系：没有语法错误的 JavaScript 也是 TypeScript；但 TypeScript 增加了类型注解、类型运算等语法，因此并不是每个 TypeScript 文件都能直接交给 JavaScript 运行时。tsc 的主要工作是检查类型并把 TypeScript 生成 JavaScript，类型本身通常在生成阶段被擦除。

通俗地说，TypeScript 不是换了一台运行 JavaScript 的机器，而是在写代码时增加了一位能读懂意图的助手。它在编辑器中提前指出属性拼写错误、可能为 undefined 的值、错误的函数参数和不一致的 API 契约；最终仍由 JavaScript 引擎执行。它解决的不是“所有运行时错误”，而是把一部分只能在测试或线上发现的问题提前到编译和编辑阶段。

书中还强调两个边界：TypeScript 的类型系统并不完备（unsound），数组越界、外部 JSON、any 和类型断言都可能让静态类型与运行时现实分离；类型检查也不会自动产生运行时校验。因此正确的工程目标是让类型尽可能准确，并在边界处验证不可信数据，而不是宣称类型检查通过就绝对安全。

### 2. 全书逻辑框架

~~~mermaid
flowchart TD
  P[前言：从会写 JS 到理解 TypeScript 的取舍]
  C1[第1章 认识 TypeScript<br/>1-5：JS 关系、配置、生成、结构类型、any]
  C2[第2章 类型系统<br/>6-18：集合模型、声明、泛型、映射、readonly]
  C3[第3章 类型推断<br/>19-27：扩宽、收窄、上下文、异步、函数式]
  C4[第4章 类型设计<br/>28-37：有效状态、边界、联合、品牌类型]
  C5[第5章 使用 any<br/>38-44：隔离不安全代码、unknown、覆盖率]
  C6[第6章 声明与 @types<br/>45-52：发布 API、TSDoc、条件类型、类型测试]
  C7[第7章 编写和运行<br/>53-57：ECMAScript、DOM、private、源码映射]
  C8[第8章 迁移到 TypeScript<br/>58-62：现代 JS、JSDoc、allowJs、逐模块、noImplicitAny]
  P --> C1 --> C2 --> C3 --> C4 --> C5 --> C6 --> C7 --> C8
  C4 -.设计约束反馈.-> C3
  C5 -.不可信边界.-> C4
  C6 -.公共契约.-> C4
  C8 -.渐进落地.-> C1
~~~

全书的推进不是“把语法从头讲一遍”，而是先建立 TypeScript 与 JavaScript 的关系，再用集合和控制流解释类型系统，之后把这些模型用于 API 设计、any 隔离、声明文件和迁移。读者最终应能回答三个问题：类型表达了哪些运行时可能性？编译器在哪里无法替你验证？怎样把不确定性限制在一个可审计的边界内？

### 3. 与相邻方案的比较

| 方案 | 类型检查发生在哪里 | 与 JavaScript 的关系 | 运行时成本 | 迁移和生态 | 主要边界 |
| --- | --- | --- | --- | --- | --- |
| TypeScript | 编辑器与 tsc 静态检查 | 语法超集，生成 JS | 默认几乎为零，需自行做运行时校验 | 可渐进迁移，npm/前端/Node 生态最广 | 类型不完备，any/断言可绕过检查 |
| 纯 JavaScript + JSDoc | 编辑器/checkJs 可选检查 | 仍是原生 JS | 零 | 迁移最轻，表达能力受注释形式限制 | 大型类型设计和声明复用较笨重 |
| Flow | Babel/Flow 检查并生成 JS | 也是 JS 的静态类型层 | 默认零 | 在特定旧代码库中有效 | 社区和工具覆盖面小于 TS |
| Java/C#/Kotlin | 编译到字节码或原生目标 | 不是 JS 超集 | 有运行时/部署模型成本 | 需要重写，不能直接复用 JS | 与现有 JS 生态边界较大 |
| Elm/Reason 等更强调 soundness 的语言 | 编译器静态保证更强 | 不是 JS 超集 | 由编译器生成 JS | 适合新项目 | 迁移和 JavaScript 互操作成本更高 |

TypeScript 的优势来自折中：它保留 JavaScript 的运行时和生态，又用结构类型、推断和语言服务降低大型代码库的协调成本；代价是必须承认类型系统的漏洞，并把网络、文件、用户输入等边界交给运行时验证。它不是“更严格的 JavaScript”，而是“可以逐步采用、并与 JavaScript 共存的静态分析层”。

## 二、按章节提炼

| 章节 | 标题内容 | 核心内容 | 书中问题的解决思路 |
| --- | --- | --- | --- |
| 前言 | Who This Book Is For / How This Book Is Organized | 面向已有 JS/TS 实践者的“第二本书”，用 62 个短 Item 讲选择与理由 | 先建立心智模型，再用示例检验，而不是罗列全部语法 |
| 第一章 | Getting to Know TypeScript | JS 超集关系、tsconfig、生成与类型的分离、结构类型、any | 了解 TypeScript 的能力边界，避免把静态检查误当运行时保证 |
| 第二章 | TypeScript's Type System | 类型集合、类型空间/值空间、声明、type/interface、泛型、映射、只读 | 用类型运算表达真实约束，减少重复和可变状态 |
| 第三章 | Type Inference | 推断、扩宽/收窄、上下文类型、异步和函数式 API | 让编译器保留信息，同时在边界处显式标注 |
| 第四章 | Type Design | 有效状态、输入输出、null、联合、字符串精度、品牌类型 | 让非法状态难以表示，把领域规则写进公共类型 |
| 第五章 | Working with any | 逐步隔离 any，用 unknown、安全包装和类型覆盖率收敛风险 | 把不得不使用的动态代码压缩到最小范围 |
| 第六章 | Type Declarations and @types | 依赖版本、公共 API 类型、TSDoc、this、条件类型、类型测试 | 让库的运行时、声明和编译器版本协同工作 |
| 第七章 | Writing and Running Your Code | ECMAScript 特性、对象迭代、DOM 层级、可见性、source map | 优先选择标准运行时语义，正确调试生成后的 JS |
| 第八章 | Migrating to TypeScript | 现代 JS、@ts-check、allowJs、依赖图迁移、noImplicitAny | 用渐进路线获得真实类型收益，而不是停在“能编译” |

## 三、连续精读：从模型到工程落地

### 第一阶段：认识语言边界

#### 第一章　Getting to Know TypeScript

##### Item 1：理解 TypeScript 与 JavaScript 的关系

原书：TypeScript 是 JavaScript 的语法超集；main.js 改名为 main.ts 并不会改变代码，但加入 : string 后就不能直接由 Node 当作 JavaScript 解析。类型推断能发现 toUppercase 拼写错误，显式接口则能把 capital/capitol 这类意图错误定位到对象构造处。书中用集合图区分“所有 JS”“所有 TS”和“通过类型检查的子集”。

~~~ts
interface State { name: string; capital: string }
const states: State[] = [
  {name: 'Alabama', capital: 'Montgomery'},
  // {name: 'Alaska', capitol: 'Juneau'}, // 编译期拒绝拼写错误
];
~~~

作用是把“代码能运行”与“代码符合意图”区分开。局限是类型检查通过仍可能数组越界或收到错误 JSON；不可信输入必须在运行时解析。

- 静态类型（static typing）：运行前由工具分析类型关系。
- 结构类型（structural typing）：按成员形状判断兼容性，而不是按声明名称。
- soundness：静态类型是否能保证运行时类型事实；TypeScript 明确不保证。

##### Item 2：明确正在使用的 TypeScript 选项

原书：tsconfig.json 不只是编译开关，而是类型检查策略。重点选项包括 noImplicitAny、strictNullChecks、noImplicitThis、target、module、lib 和 noEmit；不同配置会改变同一段代码的诊断结果。用 tsc --showConfig 查看最终合并后的配置，比猜测继承结果可靠。

当前补充：新项目可从 strict: true 开始，再按目标运行时设置 target、module 和 moduleResolution；不要为了“先过编译”关闭严格项。noUncheckedIndexedAccess、exactOptionalPropertyTypes 和 verbatimModuleSyntax 能进一步暴露边界，但应结合既有代码逐步启用。

~~~json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true
  }
}
~~~

##### Item 3：理解代码生成与类型彼此独立

原书：类型检查和 JavaScript 生成是两条独立管线。默认情况下，即使有类型错误，tsc 仍可能生成输出；noEmitOnError 才会阻止它。类型注解会被擦除，重载签名不会在运行时选择分支，类型操作也不能改变值。

~~~ts
function double(x: number): number { return x * 2 }
// 生成的 JS 只剩 function double(x) { return x * 2; }
~~~

解决方案是把 tsc --noEmit 作为检查步骤，把构建工具的转译步骤单独管理，并对 API 输入使用 Zod、Valibot、JSON Schema 等运行时解析器。as Foo 不是验证器；它只告诉编译器“暂时相信我”。

##### Item 4：适应结构类型

原书：如果一个对象拥有目标类型需要的所有成员，它就可赋给该类型，这种“鸭子类型”便于 JavaScript 风格的组合，却允许一个值同时属于多个接口。对象字面量会触发额外属性检查，但先存入变量后再传递则可能绕过该检查；这不是矛盾，而是 TypeScript 对开放世界 JavaScript 的取舍。

~~~ts
interface Vector { x: number; y: number }
const p = {x: 1, y: 2, z: 3};
const v: Vector = p; // OK：p 至少具备 x、y
~~~

在跨模块、金额、用户 ID 等不能混淆的值上，用 Item 37 的品牌类型补回名义约束。结构兼容性无法表达“来自数据库”或“已经验证”等历史事实，必须在边界建立品牌或封装构造函数。

##### Item 5：限制 any

原书：any 同时关闭赋值检查、属性检查、调用检查和语言服务；它会传播，掩盖重构错误，并让类型设计失去反馈。迁移旧代码时可以暂时使用，但应缩小作用域并留下收敛计划。

~~~ts
function parseLegacy(input: string): unknown {
  return JSON.parse(input); // 不把 any 扩散到业务层
}
~~~

用 unknown 接住未知值，用类型守卫或解析器缩小它；为已有动态函数定义精确的输入输出，而不是把整个模块标成 any。noImplicitAny、no-explicit-any lint 规则和 Item 44 的覆盖率能防止回退。

### 第二阶段：用类型系统表达约束

#### 第二章　TypeScript's Type System

##### Item 6：用编辑器探查类型系统

原书：悬停、跳转定义、补全、错误信息和 TypeScript Playground 是实验工具。把光标放在表达式上，比凭直觉猜 map、泛型或联合类型的结果更可靠；书中使用 // Type is ... 注释记录推断结果。

当前补充：可把关键推断写成 expectType/tsd 测试，确保 TypeScript 升级后仍保持公共类型；调试类型时先缩小到最小 Playground，再回填真实代码。

##### Item 7：把类型看成值的集合

原书：never 是空集，字面量类型是单元素集合，联合是集合并集，交叉是交集，unknown 近似全集。子类型关系因此可以用集合包含理解：'x' 可赋给 string，但反向不行。

~~~ts
type Status = 'ready' | 'busy';
type WithId = {id: string};
type Ready = {status: 'ready'} & WithId;
~~~

这个模型解释了为什么联合读取共有成员、为什么交叉可能变成 never，也解释了泛型约束 T extends ... 的含义。它比把类型当成“类名”更适合理解 TypeScript 的结构类型。

##### Item 8：分清类型空间和值空间

原书：接口、类型别名和类型参数只存在于类型空间；变量、函数和类的构造函数存在于值空间。typeof 在类型位置是“取得值的静态类型”，在表达式位置则是 JavaScript 的运行时运算符。

~~~ts
const runtimeConfig = {retries: 3};
type Config = typeof runtimeConfig;
const key: keyof Config = 'retries';
~~~

类同时有类型和值两个名字，因此 class C {} 既可写 let x: C，也可写 new C()。理解空间边界能解释“只能作为类型使用”与 import type 错误。

##### Item 9：优先类型声明而不是类型断言

原书：const x: T = value 会检查 value 是否真的满足 T；const x = value as T 只改变编译器看法，可能隐藏错误。双重断言 as unknown as T 更应被视为危险边界。

~~~ts
interface User { id: string }
const a: User = {id: 'u1'};
const b = {id: 'u1'} as User;
~~~

当前补充：satisfies（TypeScript 4.9+）可检查形状同时保留表达式的窄类型：const cfg = {mode: 'prod'} satisfies {mode: 'prod'|'dev'}。断言只应封装在经过运行时检查的函数内部，并用注释说明不变量。

##### Item 10：避免对象包装类型

原书：使用小写原始类型 string、number、boolean、symbol、bigint，不要使用 String、Number 等包装对象。包装对象有不同的身份和方法行为，容易导致不可赋值或意外装箱。

##### Item 11：认识多余属性检查的边界

原书：多余属性检查只针对“新鲜”的对象字面量，目的是捕获拼写错误，不是实现精确对象类型。将字面量先赋给变量、使用索引签名或泛型时，额外属性可能被允许。

~~~ts
interface Options { darkMode?: boolean }
const opts = {darkmode: true};
// const x: Options = {darkmode: true}; // 直接字面量报错
const y: Options = opts; // 变量路径可能绕过检查
~~~

用显式注解或 satisfies 固定配置边界，动态字段则明确写索引签名；不要依赖这项检查实现运行时白名单。

##### Item 12：尽量给整个函数表达式加类型

原书：给整个函数表达式或回调类型标注，可以同时检查参数、返回值和 this，并让上下文类型流入参数；只给参数逐个加注解会重复信息。

~~~ts
type RequestHandler = (req: Request) => Promise<Response>;
const handler: RequestHandler = async req => new Response(req.url);
~~~

##### Item 13：理解 type 与 interface 的差异

原书：二者都可描述对象形状，但 interface 支持声明合并和 extends，type 可表达联合、交叉、条件类型和元组。书中建议根据语义选择，并保持团队一致。

~~~ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }
type Result = {ok: true; value: string} | {ok: false; error: Error};
~~~

当前补充：现代库常用 interface 作为可被消费者扩展的公共对象契约，复杂类型运算使用 type；性能和声明合并规则应以实际编译器版本测试为准。

##### Item 14：用类型运算和泛型避免重复

原书：keyof、索引访问类型、映射类型、条件类型和泛型能从一个源类型派生多个约束，避免接口和实现漂移。

~~~ts
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
};
~~~

先寻找“值之间的关系”，再选择泛型参数；过度抽象会让错误信息难读。

##### Item 15：为动态数据使用索引签名

原书：字典类数据可用 [key: string]: T 或 Record&lt;string, T&gt;，但索引签名会宣称任意键都存在，并会约束显式成员的类型。

~~~ts
type Counts = Record<string, number>;
const counts: Counts = {apples: 3};
~~~

若键集合已知，优先字面量联合；若键来自用户输入，开启 noUncheckedIndexedAccess 或返回 T | undefined。

##### Item 16：优先数组、元组和 ArrayLike

原书：数字索引签名不能表达长度、迭代和元组位置，T[]、[A, B]、ReadonlyArray&lt;T&gt; 和 ArrayLike&lt;T&gt; 更贴近实际数据结构。只有确实是任意数字键的对象才使用 [n: number]。

##### Item 17：用 readonly 避免可变状态错误

原书：readonly 可用于属性、数组和参数，阻止通过当前引用修改数据；它通常是浅只读，不能自动冻结嵌套对象，也不改变运行时对象。

~~~ts
function total(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
~~~

把只读要求放在消费端能扩大可接受输入；需要真正不可变时仍要复制或 Object.freeze。

##### Item 18：用映射类型保持值同步

原书：映射类型遍历 keyof 生成另一组属性，适合把状态、事件处理器、验证结果和原对象的键保持同步。

~~~ts
type Flags<T> = {[K in keyof T]: boolean};
type User = {name: string; age: number};
type UserFlags = Flags<User>;
~~~

### 第三阶段：让推断保留信息

#### 第三章　Type Inference

##### Item 19：不要堆积编译器已经知道的类型

原书：局部变量通常能从初值推断，重复声明会增加噪声；在函数参数、返回值、空集合和公共边界显式标注。

##### Item 20：不同类型使用不同变量

原书：不要让同一变量在 string、number、null 间反复赋值；用新变量保留窄类型。

~~~ts
const raw = '42';
const parsed = Number(raw);
if (Number.isFinite(parsed)) console.log(parsed.toFixed(1));
~~~

##### Item 21：理解类型扩宽

原书：let 的字面量初值通常扩宽为通用类型；as const 可递归得到只读字面量。

~~~ts
const action = {type: 'INCREMENT'} as const;
~~~

##### Item 22：理解类型收窄

原书：typeof、instanceof、in、相等比较、可辨识联合和用户自定义类型守卫都能收窄类型。谓词 value is T 必须真实检查 T，否则会制造隐蔽错误。

~~~ts
function format(x: string | number) {
  if (typeof x === 'number') return x.toFixed(2);
  return x.toUpperCase();
}
~~~

##### Item 23：一次性创建对象

原书：分步添加属性会产生不完整的中间类型，尽量一次构造完整对象或显式声明目标类型。

##### Item 24：一致地使用别名

原书：过早拆分联合的判别字段会让控制流丢失相关性。现代编译器改善了部分常量别名场景，但判别字段仍应紧邻使用。

##### Item 25：异步代码优先使用 async 函数

原书：async/await 让错误传播和返回类型更清楚；Promise.all 用于独立任务并发，取消和超时仍需显式设计。

~~~ts
async function loadUser(id: string): Promise<User> {
  const response = await fetch('/users/' + id);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json() as Promise<User>;
}
~~~

##### Item 26：理解上下文如何参与推断

原书：回调从使用位置获得上下文类型；先存入无上下文变量会丢失信息。

~~~ts
const names = ['Ada', 'Grace'];
names.map(name => name.length);
~~~

##### Item 27：用函数式构造和库帮助类型流动

原书：map、filter、reduce 的泛型签名能把输入传到输出；filter(Boolean) 不能总是得到期望的收窄，应使用类型谓词。

~~~ts
const values: (number | undefined)[] = [1, undefined, 3];
const isNumber = (x: number | undefined): x is number => x !== undefined;
const nums = values.filter(isNumber);
~~~

### 第四阶段：设计不会说谎的领域类型

#### 第四章　Type Design

##### Item 28：优先表示始终有效的状态

原书：用可辨识联合表达互斥状态，让非法组合无法构造，而不是用多个可选字段。

~~~ts
type Request =
  | {status: 'loading'}
  | {status: 'success'; data: string}
  | {status: 'error'; error: Error};
~~~

##### Item 29：输入宽容，输出严格

原书：参数接受合理超集，返回值承诺精确子集；对只读输入使用 readonly，避免暴露内部可变要求。

##### Item 30：不要在文档中重复类型信息

原书：类型签名是机器可检查的文档，注释应解释原因、约束和失败条件，而不是复述类型。

##### Item 31：把 null 推到类型边界

原书：开启 strictNullChecks，在 I/O 边界处理 null/undefined，核心域模型使用已验证的非空类型。

~~~ts
function requireName(input: {name?: string}): string {
  if (!input.name) throw new Error('name is required');
  return input.name;
}
~~~

##### Item 32：优先接口的联合，而不是接口的联合字段

原书：把每种状态写成一个接口，再以判别字段联合，避免可选字段组合出无效状态。

##### Item 33：用比 string 更精确的替代方案

原书：使用字面量联合、模板字面量或品牌类型；枚举有运行时和序列化成本，不能机械替代。

##### Item 34：不完整类型胜过不准确类型

原书：外部数据只声明确认过的字段，未知部分保持 unknown；不要从单个 JSON 样本臆测完整接口。

##### Item 35：从 API/规范生成类型，而不是从数据生成

原书：以 OpenAPI、JSON Schema 或 GraphQL schema 为契约生成类型，并对响应做运行时验证；生成过程应可重复。

##### Item 36：用问题域的语言命名类型

原书：UserId、Meters、Celsius 比 string、number 更能表达业务语义，命名应采用领域专家的词汇。

##### Item 37：需要名义类型时考虑品牌

原书：通过不可构造的品牌字段区分同形值，品牌只在验证后建立。

~~~ts
type UserId = string & {readonly __brand: 'UserId'};
function asUserId(value: string): UserId {
  if (!/^u_[a-z0-9]+$/.test(value)) throw new Error('invalid id');
  return value as UserId;
}
~~~

### 第五阶段：把 any 关进笼子

#### 第五章　Working with any

##### Item 38：把 any 放在最窄作用域

原书：动态库或旧模块不得不使用 any 时，把它限制在适配器内并立即转换；公共 API 不应暴露 any。

##### Item 39：优先 any 的更精确变体

原书：any[] 或 any 函数签名比裸 any 保留更多结构，但应优先 unknown、object、泛型或具体联合。

##### Item 40：把不安全断言藏在类型良好的函数里

原书：集中断言能让审计和测试围绕一个边界展开。类型谓词仍必须检查真实条件。

~~~ts
function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}
~~~

##### Item 41：理解会演化的 any

原书：空数组会从 any[] 随 push 演化；这种推断只在局部控制流内成立，传出作用域或提前读取会暴露隐患。

##### Item 42：未知类型使用 unknown

原书：unknown 能接收任意值，但使用前必须收窄，是 JSON、异常和消息的安全入口。

~~~ts
function isError(x: unknown): x is Error {
  return x instanceof Error;
}
try { throw new Error('boom'); } catch (e: unknown) {
  console.error(isError(e) ? e.message : String(e));
}
~~~

##### Item 43：以类型安全方式做 monkey patching

原书：直接增加未声明属性会破坏契约；用模块增强、包装器或显式接口扩展，并把扩展集中管理。

~~~ts
declare global { interface Window { appVersion: string } }
export {};
~~~

##### Item 44：跟踪类型覆盖率，防止回退

原书：type-coverage 等工具量化 any，在 CI 中设置趋势阈值；指标用于发现回退，不是质量本身。

### 第六阶段：把类型发布成公共契约

#### 第六章　Type Declarations and @types

##### Item 45：把 TypeScript 与 @types 放入 devDependencies

原书：编译器和声明包通常是开发依赖；运行时依赖仍放 dependencies，公开类型依赖要结合生成的 .d.ts 和消费者安装方式判断。

##### Item 46：理解声明涉及的三个版本

原书：同时管理运行时库、声明文件和 TypeScript 编译器版本；运行时与 @types 不匹配会产生假错误，typesVersions 和 peerDependencies 可用于兼容。

##### Item 47：导出公共 API 中出现的所有类型

原书：导出的函数签名引用的接口也应导出，否则消费者难以命名、扩展或生成声明。用 tsc --declaration 检查发布物。

##### Item 48：用 TSDoc 写 API 注释

原书：用 @param、@returns、@deprecated 等约定供编辑器和文档工具使用；解释原因与限制，不重复签名。

##### Item 49：为回调提供 this 类型

原书：this 参数只存在于类型层，用于约束普通回调的接收者；箭头函数使用词法 this。

~~~ts
interface Deck {
  suits: string[];
  createCardPicker(this: Deck): () => string;
}
~~~

##### Item 50：条件类型优先于大量重载声明

原书：返回类型随输入变化时，条件类型和泛型能表达对应关系；简单函数不要为追求抽象而使用复杂条件类型。

~~~ts
type MessageOf<T> = T extends {message: unknown} ? T['message'] : never;
~~~

##### Item 51：镜像类型以切断依赖

原书：公共 API 只需要第三方形状的一小部分时，在本包镜像稳定类型，并用适配器隔离运行时依赖，避免传递依赖升级破坏 API。

##### Item 52：警惕类型测试的陷阱

原书：类型测试不是运行时测试；错误位置、版本差异和过宽断言都会造成假通过。用 tsd、dtslint 或 @ts-expect-error 精确验证诊断位置。

### 第七阶段：写出可运行、可调试的代码

#### 第七章　Writing and Running Your Code

##### Item 53：优先 ECMAScript 特性而不是 TypeScript 特性

原书：优先标准 JavaScript 的 let/const、模块、箭头函数和私有字段，慎用枚举、参数属性、命名空间等需要转换的 TS 专属语法。

当前补充：Node.js 的 type stripping 只能去掉类型，不能处理所有会生成运行时代码的 TS 语法；TypeScript 5.8+ 的 erasableSyntaxOnly 可提前限制这类语法。

##### Item 54：正确迭代对象

原书：Object.keys 返回 string[] 是有意的，因为对象可能在运行时拥有额外键；不要无验证地断言成 keyof T。使用 Object.entries、for...in 加自有属性检查，或明确 Record 约束。

##### Item 55：理解 DOM 层级

原书：EventTarget、Node、Element、HTMLElement 表示不同能力；事件回调不能随意当成更具体元素，应通过 instanceof、选择器泛型或显式验证收窄。

##### Item 56：不要依赖 private 隐藏信息

原书：TypeScript private 主要是编译期限制，生成的 JS 属性仍可被访问；需要运行时私有时使用 ECMAScript #field、闭包或 WeakMap。

##### Item 57：用 source map 调试 TypeScript

原书：sourceMap 把生成 JS 的位置映射回 .ts；部署时审慎公开 .map，因为它可能暴露源码和路径。

~~~json
{"compilerOptions": {"sourceMap": true, "inlineSources": true}}
~~~

### 第八阶段：渐进迁移到 TypeScript

#### 第八章　Migrating to TypeScript

##### Item 58：先写现代 JavaScript

原书：迁移前先使用模块、let/const、解构、箭头函数和 async/await；这样迁移主要增加类型，不同时重写语法和运行时模型。

##### Item 59：用 @ts-check 和 JSDoc 做实验

原书：.js 文件顶部加入 // @ts-check，用 @param、@returns、@typedef 表达局部类型，可以在改扩展名前获得反馈。

~~~js
// @ts-check
/** @param {string} name @returns {string} */
function greet(name) { return 'Hello ' + name; }
~~~

它适合试点和第三方脚本，但复杂泛型与公共声明最终更适合 .ts。

##### Item 60：用 allowJs 混合 JavaScript 与 TypeScript

原书：allowJs 允许项目同时编译 .js 与 .ts，checkJs 决定是否检查 JavaScript；通过 include、exclude 和输出目录控制迁移范围，避免生成目录再次被纳入输入。

##### Item 61：沿依赖图逐模块转换

原书：从依赖叶子或边界模块开始，向依赖它们的上层推进；每一步保持构建可用，并用声明文件或适配器隔开尚未迁移的模块。一次性重写会失去回滚点，也难以归因错误。

##### Item 62：启用 noImplicitAny 才算迁移完成

原书：允许隐式 any 会让 .ts 文件看似迁移成功却没有真正的类型信息。最后应开启 noImplicitAny（通常随 strict 开启），逐个处理回调参数、第三方声明和动态边界，而不是用全局 any 消除诊断。

## 四、当前可复现的 TypeScript 环境（补充）

以下步骤用于验证本文示例，不是原书 2020 年的工具版本。核验日期为 2026-08-10；本机 npm latest 为 TypeScript 7.0.2，beta 为 6.0.0-beta。生产项目应锁定版本并提交 lockfile，不要盲目跟随 latest。

### 1. 初始化项目

~~~bash
mkdir effective-ts-lab
cd effective-ts-lab
npm init -y
npm install --save-dev typescript@7.0.2
npx tsc --init
~~~

将 tsconfig.json 调整为：

~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
~~~

### 2. 编写、检查和运行

~~~bash
mkdir src
printf "export const answer: number = 42;\n" > src/index.ts
npx tsc --noEmit
npx tsc
node dist/index.js
~~~

在 Windows PowerShell 中可用 Set-Content src/index.ts 'export const answer: number = 42;' 替代 printf。tsc --noEmit 只做检查，tsc 才生成 JavaScript；将两者分成 CI 的 typecheck 和 build 两个步骤，能直接观察 Item 3 所说的管线分离。

### 3. 在不可信边界运行时解析

~~~bash
npm install zod
~~~

~~~ts
import {z} from 'zod';

const User = z.object({id: z.string(), name: z.string()});
export function decodeUser(input: unknown) {
  return User.parse(input);
}
~~~

这一步补上了 TypeScript 本身不能提供的运行时保证；不要把 JSON.parse 结果直接断言成接口。

### 4. 类型测试与 CI

对公共库可安装 tsd，为错误用例使用 expectError 或 @ts-expect-error；CI 至少执行：

~~~bash
npx tsc --noEmit
npx tsc --declaration --emitDeclarationOnly
~~~

再配合 ESLint 的 no-explicit-any、consistent-type-imports 与依赖审计。类型覆盖率应作为趋势指标，而不是把所有代码都写成冗长注解。

## 五、第一版与当前生态的版本对照

官方作者网站目前介绍的是第二版 83 条建议，并明确说明其更新到 2024 年用法；题目 PDF 是第一版 62 条，本文没有把第二版的新增条目冒充成 PDF 正文。下面只列与第一版结论直接相关的变化：

| 第一版语境 | 当前补充/变化 | 阅读时的处理 |
| --- | --- | --- |
| as 与显式声明的比较 | satisfies 可检查形状并保留窄类型 | Item 9 的现代首选之一，但仍不做运行时校验 |
| any 与 unknown | useUnknownInCatchVariables、严格配置普及 | Item 42 的边界更容易自动执行 |
| private 主要是编译期 | ECMAScript #private 是运行时语义 | Item 56 的建议仍成立，安全代码应使用 # 或闭包 |
| type/interface 选择 | 条件、模板字面量、键重映射更成熟 | Item 13/14 的原则不变，先看公共扩展点和可读性 |
| allowJs 渐进迁移 | Node 22.18+ 可直接剥离部分类型语法运行 .ts | 运行不等于检查；仍需单独执行 tsc，且不能使用所有 TS 专属运行时语法 |
| 传统 module 配置 | NodeNext、Bundler 等解析模式 | Item 2 的核心是明确配置，不要复制 2020 年默认值 |
| 书中以 type-coverage 为例 | tsd、expect-type、ESLint 和 CI 组合更常见 | Item 44/52 的目标是防回退，不是追求虚假的百分比 |

## 六、术语速查

- **TypeScript compiler（tsc）**：执行类型检查并可生成 JavaScript、声明文件和 source map 的官方编译器。
- **type erasure（类型擦除）**：生成 JavaScript 时移除大多数类型语法的过程。
- **type inference（类型推断）**：编译器根据初值、上下文和控制流计算类型。
- **contextual typing（上下文类型）**：表达式从使用位置获得期望类型，例如 map 回调参数。
- **widening / narrowing（扩宽 / 收窄）**：字面量向通用类型扩展，以及控制流根据检查缩小联合类型。
- **discriminated union（可辨识联合）**：每个变体有共同的字面量判别字段的联合类型。
- **mapped type（映射类型）**：遍历 keyof T 生成新属性集合的类型运算。
- **conditional type（条件类型）**：用 T extends U ? A : B 根据类型关系选择结果。
- **declaration file（声明文件）**：.d.ts，描述 JavaScript/库的静态 API 而不包含实现。
- **TSDoc**：面向 TypeScript API 的文档注释约定。
- **@types**：为没有内置声明的 JavaScript 包提供社区类型包的命名空间。
- **source map**：把生成文件位置映射回源文件的调试映射。
- **nominal typing（名义类型）**：按显式身份而非成员形状区分类型；TypeScript 通常用品牌模拟。
- **structural typing（结构类型）**：按成员集合和成员类型判断可赋值性。
- **unknown**：安全的未知值顶类型，使用前必须收窄。
- **never**：没有任何值的底类型，常用于不可达分支和穷尽检查。

## 七、总结：把 62 条建议变成决策流程

面对一个新 API 或迁移任务，可以按下面顺序检查：

1. **运行时事实**：输入来自哪里？是否需要解析器，而不是断言？
2. **类型集合**：它是联合、交叉、字面量还是未知值？哪些状态非法？
3. **推断边界**：局部让编译器推断，公共输入输出和空集合显式标注。
4. **可变性**：消费端能否接受 readonly？是否把同一变量改成多种概念？
5. **不安全点**：any、类型谓词和断言是否被隔离、注释和测试？
6. **发布契约**：声明文件、运行时版本、@types 和编译器版本是否一致？
7. **迁移闭环**：是否启用 strict/noImplicitAny，并用 CI 防止类型覆盖率倒退？

书中真正可迁移的能力不是记住 62 个孤立规则，而是学会在“表达意图”“尊重 JavaScript 运行时”和“承认静态系统边界”之间做取舍。把非法状态设计成无法表示，把未知值留在边界，把必要的断言集中到少数可验证函数中，TypeScript 才会从装饰性的类型注解变成可维护的工程约束。

## 八、来源与核验

### 原书

- Dan Vanderkam，_Effective TypeScript: 62 Specific Ways to Improve Your TypeScript_，O'Reilly Media，2020，ISBN 978-1-492-05374-3；本文以题目提供的 PDF 版权页、目录、前言和第 1–8 章为主。
- [作者的 Effective TypeScript 网站](https://effectivetypescript.com/)：核对第二版已更新为 83 条建议，并区分第一版/第二版资源。
- [作者 GitHub 示例仓库](https://github.com/danvk/effective-typescript)：用于核对书中示例的公开代码位置；本文只保留必要的短片段并做了现代语法改写。

### 当前补充的一手资料（核验于 2026-08-10）

- [TypeScript 官方 Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript 官方 TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [TypeScript npm 发布信息](https://www.npmjs.com/package/typescript)：本次核验 latest 为 7.0.2，beta 为 6.0.0-beta。
- [TypeScript 5.8 erasableSyntaxOnly 说明](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)
- [Node.js TypeScript 类型剥离文档](https://nodejs.org/api/typescript.html)
- [Zod 文档](https://zod.dev/)

PDF 中的示例、图表和引文均只作必要的短引用；本文的完整中文解释、示例组合、版本对照和迁移步骤是基于这些材料的原创教程化整理。

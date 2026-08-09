---
title: JavaScript高级程序设计（第4版）
date: 2026-08-08
article: false
icon: pen-to-square
bookCategory: JavaScript与Web开发
bookAuthor: Matt Frisbie（李松峰 译）
bookColor: zinc
category:
  - 软件开发
  - JavaScript
  - Web开发
bookCover: /assets/images/professional-javascript-4-cover.jpg
cover:
tag:
  - JavaScript
  - ECMAScript
  - DOM
  - 浏览器API
  - 异步编程
  - Web工程
isOriginal: true
excerpt: 以 Matt Frisbie《JavaScript高级程序设计》第4版为主线，从语言、对象、函数、异步机制、DOM、网络、存储、模块、工作者线程到部署实践，按书中顺序做可直接学习的教程化整理，并把原书观点与今天的标准和工程实践明确分开。
---

# 《JavaScript高级程序设计（第4版）》深度阅读

> **版本与证据**：本文逐章核对用户提供的简体中文版 PDF（2020 年重印；ISBN 9781119366447；原书 *Professional JavaScript for Web Developers, 4th Edition*，Matt Frisbie 著，李松峰译）。正文以前言、目录、各章正文和“小结”为事实主线。**原书**表示书中观点或短示例，**当前补充**表示截至 2026-08-08 的规范与工程实践，**纠正**表示原书因时代变化需要收紧的说法。
>
> 书中附录 A～D 标为“图灵社区下载”，不在本地 PDF 正文中；本文在附录部分如实说明边界，不臆造未提供的内容。

## 一、全书先回答什么问题

### 全局摘要

前言把范围说得很清楚：第 4 版“全面深入地介绍了 JavaScript 开发者必须掌握的前端开发技术”，重点是 ECMAScript 与 DOM，并继续讨论类、期约、迭代器、代理、事件、动画、表单、JSON、Fetch API、模块、工作者线程和服务工作者线程。

第 1 章小结把 JavaScript 拆成三层：

- **ECMAScript**：由 ECMA-262 定义的核心语言。
- **DOM（Document Object Model，文档对象模型）**：操作 HTML/XML 文档的标准接口。
- **BOM（Browser Object Model，浏览器对象模型）**：与浏览器窗口、导航和设备交互的接口。

通俗地说，ECMAScript 负责“值如何表示、代码如何计算”；DOM 负责“页面内容如何读写”；BOM 负责“页面如何与浏览器和外部世界联系”。这也解释了为什么同一套 JavaScript 代码在浏览器、Node、Worker 中看到的能力不同。

### 逻辑框架图

~~~mermaid
mindmap
  root((JavaScript高级程序设计 第4版))
    语言与载入
      第1章 JavaScript组成与历史
      第2章 HTML中的JavaScript
      第3章 语言基础
      第4章 变量 作用域 内存
    数据与抽象
      第5章 基本引用类型
      第6章 集合引用类型
      第7章 迭代器与生成器
      第8章 对象 类 与OOP
      第9章 代理与反射
      第10章 函数
      第11章 期约与异步函数
    浏览器平台
      第12章 BOM
      第13章 客户端检测
      第14章 DOM
      第15章 DOM扩展
      第16章 DOM2和DOM3
      第17章 事件
      第18章 动画与Canvas图形
      第19章 表单脚本
      第20章 JavaScript API
    可靠交付
      第21章 错误处理与调试
      第22章 处理XML
      第23章 JSON
      第24章 网络请求与远程资源
      第25章 客户端存储
      第26章 模块
      第27章 工作者线程
      第28章 最佳实践
      附录A-D 下载资源
~~~

~~~mermaid
flowchart LR
  A[源码与脚本加载] --> B[值 变量 作用域]
  B --> C[对象 数组 函数]
  C --> D[类 模块 元编程]
  D --> E[迭代 Promise async]
  E --> F{宿主环境}
  F --> G[DOM 事件 Canvas 表单]
  F --> H[Fetch Storage Worker]
  G --> I[错误 性能 构建 部署]
  H --> I
~~~

### 与主流技术的比较

| 维度 | 现代 JavaScript | ES5 时代脚本 | TypeScript | WebAssembly | Java/C# |
| --- | --- | --- | --- | --- | --- |
| 执行位置 | 浏览器、Node、Worker 等直接执行 | 浏览器直接执行 | 先编译成 JavaScript | 浏览器/Node 加载二进制模块 | 各自运行时，通常不直接驱动 DOM |
| 类型模型 | 动态类型、原型对象、函数一等公民 | 动态类型，构造函数与闭包约定 | 编译期静态检查，运行时仍是 JS | 低层静态类型与线性内存 | 名义类型、类和接口体系 |
| 异步 | Promise、async/await、异步迭代 | 回调、事件、早期 XHR | 与 JS 相同并加类型约束 | 由 JS 胶水代码接入 Web API | 线程、Future、任务库 |
| 模块 | ES 模块静态依赖图 | 全局变量、IIFE、AMD/CommonJS | 类型与模块可同时检查 | 自身模块只负责导出计算 | 包/模块系统成熟 |
| Web 集成 | DOM、Fetch、Storage、Canvas 原生可用 | 兼容性分支多 | 不能替代宿主 API | 适合 CPU 密集计算 | Web 交付链更重 |
| 主要代价 | 隐式转换、运行时错误、历史包袱 | 可维护性和组合能力弱 | 构建步骤和类型维护成本 | 不能直接替代 DOM 逻辑 | 浏览器端生态不如 JS 自然 |

JavaScript 的优势不是每个指标都领先，而是它是 Web 平台的原生协调语言。TypeScript 给它增加静态约束，WebAssembly 承接计算密集部分，Java/C# 则更适合另一类服务端边界。

## 二、前言、章节与问题总表

| 章节 | 标题内容 | 核心内容 | 该章解决的问题与方案 |
| --- | --- | --- | --- |
| 前言 | 阅读对象与边界 | 语言、DOM、BOM、浏览器与 Node API | 先划分语言和宿主，避免把浏览器 API 误认为 ECMAScript |
| 第1章 | 什么是 JavaScript | 历史、ECMAScript、DOM、BOM、标准组织 | 建立“语言规范 + 宿主 API”的全景模型 |
| 第2章 | HTML 中的 JavaScript | script、defer、async、动态脚本、noscript | 控制下载、解析与执行顺序，避免阻塞渲染 |
| 第3章 | 语言基础 | 语法、声明、类型、操作符、语句、函数 | 用可预测的求值和控制流表达业务逻辑 |
| 第4章 | 变量、作用域与内存 | 原始/引用值、执行上下文、作用域链、垃圾回收 | 管理值的复制、可见范围和生命周期 |
| 第5章 | 基本引用类型 | Date、RegExp、包装类型、Global、Math | 复用标准对象完成日期、匹配、转换和数学运算 |
| 第6章 | 集合引用类型 | Object、Array、定型数组、Map、WeakMap、Set、WeakSet | 按访问模式选择对象、序列、键值映射或弱引用 |
| 第7章 | 迭代器与生成器 | 可迭代协议、迭代器协议、yield | 让生产者和消费者以统一协议解耦 |
| 第8章 | 对象、类与面向对象编程 | 属性特性、原型、继承、ES6 类 | 共享行为与实例状态，理解 class 的原型本质 |
| 第9章 | 代理与反射 | 捕获器、Reflect、代理不变式 | 在不改调用方的情况下验证、跟踪或虚拟化对象操作 |
| 第10章 | 函数 | 箭头、参数、this、递归、闭包、私有变量 | 把行为当值组合，安全保存词法状态 |
| 第11章 | 期约与异步函数 | Promise/A+、链式调用、合成、async/await | 把“未来结果”变成可组合的值 |
| 第12章 | BOM | window、location、navigator、screen、history | 与窗口、导航、设备信息和历史记录交互 |
| 第13章 | 客户端检测 | 能力检测、用户代理、平台/硬件信息 | 根据可用能力降级，而不是绑定脆弱版本号 |
| 第14章 | DOM | 节点层级、选择、文本、属性、遍历、范围 | 把文档树安全地映射到 JavaScript 对象 |
| 第15章 | DOM 扩展 | Selectors、Element Traversal、HTML5 扩展 | 用 CSS 选择器和现代元素属性降低兼容性代码 |
| 第16章 | DOM2 和 DOM3 | 样式、遍历器、Range、MutationObserver | 读写计算样式、精细遍历和观察异步 DOM 变化 |
| 第17章 | 事件 | 事件流、处理程序、事件对象、事件委托 | 让用户、设备和文档变化进入程序 |
| 第18章 | 动画与 Canvas 图形 | requestAnimationFrame、2D、WebGL1/2 | 同步渲染节奏，绘制图形和游戏基础 |
| 第19章 | 表单脚本 | 文本框、选择框、验证、序列化、富文本 | 在保留原生提交语义的同时提升交互与校验 |
| 第20章 | JavaScript API | Atomics、消息、File、Streams、Web Components、Crypto | 使用标准平台能力处理二进制、流、组件和密码学 |
| 第21章 | 错误处理与调试 | 控制台、try/catch、错误事件、调试器 | 将不可预测失败转为可观测、可恢复的状态 |
| 第22章 | 处理 XML | DOMParser、XMLSerializer、XPath、XSLT | 兼容历史 XML 服务并隔离浏览器差异 |
| 第23章 | JSON | 语法、解析、序列化选项、安全 | 用轻量文本安全交换结构化数据 |
| 第24章 | 网络请求与远程资源 | XHR、CORS、Fetch、Beacon、WebSocket | 在同源与跨源约束下可靠获取资源 |
| 第25章 | 客户端存储 | cookie、Web Storage、IndexedDB | 按会话、持久化、结构化查询选择本地存储 |
| 第26章 | 模块 | CommonJS、AMD、UMD、ES 模块 | 用显式导入导出替代全局命名空间 |
| 第27章 | 工作者线程 | 专用、共享、服务工作者、消息、传输 | 把计算或网络代理移出 UI 线程 |
| 第28章 | 最佳实践 | 可维护性、性能、构建、验证、压缩、部署 | 将语言能力变成可交付的软件 |

## 三、按程序生命周期和书中顺序逐章精读

## 阶段一：源码进入页面

### 第1章 什么是 JavaScript

作者先回顾 JavaScript 的起源，再把语言、DOM、BOM 的关系说清楚。核心不是历史本身，而是边界：ECMAScript 只定义语言，DOM 和 BOM 属于宿主能力。

- **ECMA-262**：ECMAScript 的规范文本。
- **TC39**：Technical Committee 39，负责 ECMAScript 演进的技术委员会。
- **宿主环境**：为语言提供 I/O、文档、网络、文件等能力的运行环境。

**当前补充**：现代引擎通常混合解释、JIT（Just-in-Time，即时编译）和运行时优化，因此“JavaScript 是解释型语言”只能作为粗略定位。

### 第2章 HTML 中的 JavaScript

普通 script 会阻塞 HTML 解析；defer 等解析结束后按顺序执行；async 下载完成就执行，多个脚本之间不保证顺序。动态脚本默认异步，noscript 只在脚本禁用时显示。

~~~html
<script type="module" src="/assets/app.js"></script>
<script defer src="/assets/vendor.js"></script>
~~~

**边界**：模块脚本自带延迟和严格模式语义，但跨源模块仍受 CORS 和 MIME 类型约束。有依赖顺序的脚本不要使用 async。

## 阶段二：语言运行时

### 第3章 语言基础

本章按“语法→声明→数据类型→操作符→语句→函数”建立求值模型。

- var 是函数作用域且会提升；let/const 是块级声明并存在 TDZ。
- const 只保证绑定不可重新赋值，不保证对象不可变。
- 原始类型包括 Undefined、Null、Boolean、Number、String、Symbol；ES2020 后还要补上 BigInt。
- typeof null 等于 object 是历史遗留；数组检测使用 Array.isArray。
- Number 是 IEEE 754 双精度浮点数，金融精度应使用整数缩放、BigInt 或十进制定点方案。
- for...in 枚举属性，for...of 消费可迭代协议。

~~~javascript
const count = Number("42");
if (Number.isInteger(count)) {
  for (const item of [1, 2, 3]) console.log(item + count);
}
~~~

术语：

- **TDZ**：Temporal Dead Zone，暂时性死区。
- **Coercion**：强制类型转换。
- **NaN**：Not a Number，但它仍属于 Number 类型。

### 第4章 变量、作用域与内存

原始值复制的是值本身，引用值复制的是引用。执行上下文决定作用域链与生命周期，垃圾回收通常按可达性执行标记清理。

~~~javascript
let a = { x: 1 };
let b = a;
b.x = 2; // a.x 也变成 2
~~~

**纠正**：“原始值在栈、对象在堆”是便于理解的模型，不是规范保证。真正应关注的是共享所有权、闭包保留、监听器清理和缓存上限。

### 第5章 基本引用类型

- Date 内部以时间戳表示日期；跨系统交换优先 ISO 8601。
- RegExp 的全局或粘滞匹配会修改 lastIndex，共享实例时要特别小心。
- Boolean、Number、String 包装对象解释了原始值为何能调用方法，但不应主动 new String。
- Global 与 Math 提供全局转换、URI 编码和数学运算。

### 第6章 集合引用类型

有序数据用 Array，任意键值映射用 Map，去重用 Set，弱引用元数据用 WeakMap，二进制数值用 TypedArray。

~~~javascript
const counts = new Map();
for (const word of ["js", "web", "js"]) {
  counts.set(word, (counts.get(word) ?? 0) + 1);
}
~~~

数组空位与 undefined 不同；sort 默认按字符串比较；WeakMap/WeakSet 不可枚举正是为了不暴露回收时机。

## 阶段三：可组合抽象

### 第7章 迭代器与生成器

可迭代协议要求对象实现 Symbol.iterator；迭代器的 next 返回 value 和 done。for...of、展开、解构和生成器都建立在此协议上。

~~~javascript
function* pages(total) {
  for (let page = 1; page <= total; page++) yield page;
}
for (const page of pages(3)) console.log(page);
~~~

生成器不是线程，长计算仍会阻塞当前事件循环；异步数据流应使用异步迭代器或 Streams。

### 第8章 对象、类与面向对象编程

本章从属性特性讲到工厂、构造函数、原型、组合继承和 ES6 class。class 没有消灭原型，方法仍共享在原型上。

~~~javascript
class Counter {
  #value = 0;
  increment() { return ++this.#value; }
}
~~~

私有字段是成书后的重要补充。设计上应优先组合而非深继承，因为组合更容易替换、测试和控制依赖。

### 第9章 代理与反射

Proxy 拦截 get、set、apply、construct 等底层操作，Reflect 提供对应默认行为。适用场景包括输入校验、开发期跟踪、响应式状态和虚拟对象。

~~~javascript
const state = new Proxy({ count: 0 }, {
  set(target, key, value, receiver) {
    if (key === "count" && !Number.isInteger(value)) throw new TypeError("integer");
    return Reflect.set(target, key, value, receiver);
  }
});
~~~

局限是身份判断、调试和性能更复杂，而且必须遵守不可配置属性等代理不变式。

### 第10章 函数

函数是 Function 实例，也是可传递的值。箭头函数没有自己的 this、arguments、super 或 new.target，适合回调；闭包保留词法环境，适合封装状态。

~~~javascript
function makeAccumulator(start = 0) {
  let total = start;
  return value => (total += value);
}
~~~

尾调用优化不能作为普遍可依赖的栈安全方案。闭包也不是免费存储，长期监听器和缓存要解除引用。

### 第11章 期约与异步函数

Promise 把“未来结果”表示为值，then 返回新 Promise，因此可以串行与合成。async 函数总是返回 Promise，await 只暂停当前异步函数，不阻塞主线程。

~~~javascript
async function loadJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}
~~~

**纠正**：Fetch 对 404/500 不会自动 reject，必须检查 response.ok；取消请求使用 AbortController。

## 阶段四：浏览器对象与文档

### 第12章 BOM

BOM 以 window 为核心，覆盖 location、navigator、screen、history 和定时器。不要根据 screen.width 决定布局，使用 CSS 媒体查询；定时器只保证“至少等待多久”，不保证准点执行。

### 第13章 客户端检测

作者明确给出优先级：能力检测优先，用户代理检测其次。现代项目应使用 feature detection、CSS @supports、渐进增强和权限查询，而不是根据浏览器品牌分支。

### 第14章 DOM

DOM 将文档表示成节点树。Document 是根，Element 表示标签，Text/Comment/DocumentFragment 表示内容和临时树。

~~~javascript
const fragment = document.createDocumentFragment();
const li = document.createElement("li");
li.textContent = "safe text";
fragment.append(li);
document.querySelector("ul").append(fragment);
~~~

不可信内容优先 textContent；需要富文本时先清洗。应减少重复查询和布局读写交错。

### 第15章 DOM 扩展

Selectors API 提供 querySelector、querySelectorAll、matches；Element Traversal 跳过空白文本；HTML5 扩展标准化 innerHTML、classList、dataset、焦点和滚动。

动态选择器来自外部输入时使用 CSS.escape，innerHTML 要配合 CSP、Trusted Types 或可信清洗器。

### 第16章 DOM2 和 DOM3

DOM2 Style 提供 style、getComputedStyle 和 styleSheets；Traversal/Range 提供 TreeWalker 和范围；MutationObserver 用异步记录队列替代低效 MutationEvent。

~~~javascript
const observer = new MutationObserver(records => {
  for (const record of records) console.log(record.type);
});
observer.observe(document.querySelector("#app"), { childList: true, subtree: true });
~~~

## 阶段五：交互、图形与表单

### 第17章 事件

事件流分捕获、目标和冒泡。事件委托用一个稳定祖先处理大量动态子节点，能降低监听器数量并简化销毁。

~~~javascript
list.addEventListener("click", event => {
  const item = event.target.closest("[data-id]");
  if (item) openItem(item.dataset.id);
});
~~~

滚动监听可用 passive，生命周期结束时要解除事件处理程序。

### 第18章 动画与 Canvas 图形

requestAnimationFrame 把更新与浏览器渲染周期对齐。2D 上下文覆盖路径、文本、图像、变换、渐变和像素操作；WebGL 使用着色器和定型数组完成 3D 绘制。

Canvas 是位图，不自动提供可访问语义。复杂 3D 应评估成熟 WebGL/WebGPU 引擎。

### 第19章 表单脚本

本章围绕文本框、选择框、验证、序列化和富文本展开。现代做法应优先 input 事件和原生 Validity API，并在服务器端再次校验。

~~~javascript
form.addEventListener("submit", event => {
  if (!form.checkValidity()) {
    event.preventDefault();
    form.reportValidity();
  }
});
~~~

execCommand 已属历史方案，富文本编辑应使用 Selection/Range 或成熟编辑器，并清洗输出 HTML。

## 阶段六：平台 API、数据和网络

### 第20章 JavaScript API

本章覆盖 SharedArrayBuffer/Atomics、postMessage、Encoding、File/Blob、媒体、拖放、Notifications、Streams、Timing、Web Components 与 Web Crypto。

- Streams 解决增量读写和背压。
- Shadow DOM 是封装边界，不是安全边界。
- Web Crypto 适合随机、散列、加密和签名，不应手写密码学算法。
- SharedArrayBuffer 还需要跨源隔离响应头，Atomics 也不能自动解决死锁。

### 第21章 错误处理与调试

try/catch/finally 处理可恢复边界，throw 应抛 Error 子类而不是字符串。全局 error 和 unhandledrejection 只作为最后观测兜底。

生产环境要区分可重试与不可重试错误，记录版本与请求标识，脱敏后上报，并为网络请求定义超时、取消和降级。

### 第22章 处理 XML

DOMParser 负责解析，XMLSerializer 负责序列化，XPath 负责查询，XSLT 负责转换。现代新接口通常优先 JSON，XML 更多用于既有企业协议和文档格式。

### 第23章 JSON

JSON 只表示对象、数组、字符串、数值、布尔值和 null。JSON.stringify 和 JSON.parse 可配合 replacer/reviver 改变序列化流程。

它不能原生表示 undefined、函数、Symbol、BigInt、循环引用和 Date 类型。外部 JSON 仍需模式和业务校验。

### 第24章 网络请求与远程资源

XHR 是 Ajax 的历史核心，Fetch 用 Promise、Request、Response、Headers 和 Streams 提供现代接口。CORS 是服务端明确授权的跨源访问机制，不是前端绕过同源策略的技巧。

~~~javascript
const response = await fetch("/api/data");
if (!response.ok) throw new Error("request failed");
const data = await response.json();
~~~

JSONP 只有 GET 且有脚本注入风险；WebSocket 是独立全双工协议，需要心跳、重连、鉴权和容量治理。

### 第25章 客户端存储

Cookie 适合小型会话标识；sessionStorage 保存页签会话；localStorage 简单但同步；IndexedDB 适合结构化、大容量和离线数据。

敏感数据不要放入可由脚本读取的存储。Cookie 应合理设置 HttpOnly、Secure 和 SameSite。

## 阶段七：组织、并发与交付

### 第26章 模块

CommonJS 面向同步服务器环境，AMD 面向浏览器异步加载，UMD 兼容两者；ES 模块以静态 import/export 形成可分析的依赖图。

~~~javascript
// math.js
export const square = value => value * value;
// app.js
import { square } from "./math.js";
~~~

模块顶层默认严格模式，导入是只读活绑定。Top-level await 是成书后的补充，但会传播等待并影响依赖模块初始化。

### 第27章 工作者线程

专用 Worker 只服务一个页面，共享 Worker 可被同源页面共享，服务 Worker 更像可编程网络代理。

~~~javascript
const worker = new Worker("/worker.js", { type: "module" });
worker.onmessage = event => console.log(event.data);
worker.postMessage({ values: [1, 2, 3] });
~~~

Worker 不能直接操作 DOM。消息协议要版本化，并处理错误、取消和终止；服务 Worker 随时可能被浏览器回收，不能依赖内存状态持久存在。

### 第28章 最佳实践

作者将最佳实践分为可维护性、性能和部署：

- HTML 管内容，CSS 管外观，JavaScript 管行为，保持松耦合。
- 先测量再优化，重点减少重复计算和 DOM 交互。
- 构建流程负责检查、测试、拆分、压缩、缓存指纹和产物验证。

**纠正**：书中“最好合并为一个文件”适合 HTTP/2 之前的时代。今天应结合 HTTP/2/3、多路复用、缓存命中、首屏关键路径和代码分割决定产物边界。

## 四、当前可执行的学习环境

1. 安装当前维护中的 Node.js LTS，确认 node --version 和 npm --version 正常。
2. 创建项目并初始化：

~~~powershell
mkdir js4-lab
cd js4-lab
npm init -y
~~~

3. 在 package.json 中加入 type: module，创建 app.js。
4. 浏览器示例通过 localhost 或 HTTPS 运行，不要依赖 file:。
5. 加入 ESLint、Prettier 和测试框架，并执行 lint、测试和构建。
6. Worker、Service Worker、Notifications、Web Crypto 等能力应在安全上下文中测试。

## 五、从第4版继续向前

| 书中基线 | 今日应补上的能力 | 迁移建议 |
| --- | --- | --- |
| ES2019 | BigInt、私有字段、静态块、顶层 await、Set 组合方法 | 先查目标浏览器/Node 兼容性 |
| XHR | Fetch、AbortController、ReadableStream | 统一错误、取消和重试 |
| 用户代理检测 | 能力检测、CSS 特性查询、Permission API | 把品牌分支改成能力分支 |
| execCommand 富文本 | Selection/Range 或成熟编辑器 | 对 HTML 做可信清洗 |
| 手写构建脚本 | Vite、Rollup、Webpack、esbuild | 管理依赖图、拆包和产物指标 |
| 闭包模块 | ES 模块、条件导出、import maps | 明确公共 API，避免循环依赖 |
| 服务 Worker 缓存 | Workbox 等成熟缓存策略 | 先定义离线一致性 |
| WebGL 1/2 | WebGPU（按平台支持情况） | 复杂 3D 评估成熟引擎 |

## 六、附录边界与结语

本地 PDF 只列出以下下载项，没有附录正文：

- 附录 A：ES2018 和 ES2019。
- 附录 B：严格模式。
- 附录 C：JavaScript 库和框架。
- 附录 D：JavaScript 工具。

因此本文不伪造附录内容。附录 A 的语言变化已在第 3、7、11、26 章补充，严格模式已在第 2、3、26 章说明，库框架与工具则应以对应项目的官方文档为准。

读完本书后，遇到新需求可以按下面顺序判断：

1. 它是 ECMAScript 能力，还是浏览器/Node 宿主能力？
2. 数据是原始值、对象、序列、映射，还是二进制/流？
3. 操作是同步计算，还是需要 Promise、异步迭代或 Worker？
4. 页面变化来自初始化、事件、网络响应还是 DOM 变更？
5. 输入是否不可信，是否需要类型校验、CORS、CSP、权限和错误边界？
6. 目标运行时支持什么，产物怎样验证、压缩、缓存和回滚？

## 七、来源与核验日期

- Matt Frisbie，《JavaScript高级程序设计（第4版）》中文 PDF，人民邮电出版社，2020 年重印；前言、目录和第 1～28 章正文为本文主要证据。
- ECMAScript 规范（TC39）：https://tc39.es/ecma262/ （访问核验：2026-08-08）。
- MDN JavaScript Reference：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference （访问核验：2026-08-08）。
- MDN Fetch API：https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API （访问核验：2026-08-08）。
- MDN Service Worker API：https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API （访问核验：2026-08-08）。
- Node.js 官方下载与发布页：https://nodejs.org/en/download （访问核验：2026-08-08）。

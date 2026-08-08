---
title: MySQL必知必会
date: 2026-08-08
article: false
icon: pen-to-square
bookCategory: 数据库与SQL
bookAuthor: "[英] Ben Forta（刘晓霞、钟鸣 译）"
bookColor: zinc
category:
  - 数据库
  - 软件开发
bookCover: /assets/images/mysql-crash-course-cover.png
cover:
tag:
  - MySQL
  - SQL
  - 关系型数据库
isOriginal: true
excerpt: "以 Ben Forta《MySQL必知必会》2009 年中文版为主线，从关系数据库基础、SELECT 查询、联结与子查询，推进到表设计、存储程序、事务、安全、维护和性能；逐章保留可迁移的 SQL 思维，并用 MySQL 8.4 的当前行为纠正原书的版本局限。"
---

# 《MySQL必知必会》：从查一行数据到管理完整数据库

> **文本依据**：本文以 Ben Forta 的 MySQL Crash Course 中文版《MySQL必知必会》为事实主线。该版由刘晓霞、钟鸣翻译，人民邮电出版社 2009 年 1 月第 1 版，ISBN 978-7-115-19112-0；英文原版版权年份为 2006。正文依次包含前言、30 章、附录 A～E 和索引。
>
> **内容标记**：**【原书】**表示书中明确提出的概念、顺序或由示例压缩整理的内容；**【当前补充】**表示截至 2026-08-08，依据 MySQL 8.4 官方手册补入的实践；**【纠正】**表示原书因 MySQL 5.0 时代限制而不宜原样采用的结论。文中 SQL 沿用原书 crashcourse 示例库的语义，但为减少重复、适配 MySQL 8.4，统一了格式并补全了约束。

## 一、全书真正教授的是怎样向关系数据库准确提问

### 1.1 官方描述、技术背景与通俗解释

中文版“内容提要”这样概括全书：

> “MySQL 是世界上最受欢迎的数据库管理系统之一。书中从介绍简单的数据检索开始，逐步深入一些复杂的内容，包括联结的使用、子查询、正则表达式和基于全文本的搜索、存储过程、游标、触发器、表约束，等等。”

前言进一步说明 MySQL 在不同规模项目中的定位：

> “MySQL已经成为世界上最受欢迎的数据库管理系统之一……MySQL都证明了自己是个稳定、可靠、快速、可信的系统，足以胜任任何数据存储业务的需要。”

【原书】第 1、2 章把几个容易混用的对象分开：数据库是“以某种有组织的方式存储的数据集合”，DBMS（Database Management System，数据库管理系统）是创建、操纵数据库的软件，SQL（Structured Query Language，结构化查询语言）则是与关系型 DBMS 沟通的语言。MySQL 是一个采用客户机—服务器架构的 DBMS，而不是“数据库”这个抽象概念本身。

通俗地说，应用不应该自己翻数据文件找答案。它把“我要哪些列、哪些行、怎样组合、怎样排序或汇总”声明给 MySQL，由服务器负责访问、过滤、关联和保护共享数据。SQL 解决的核心问题有三个：

- 用统一结构保存事实，避免每个程序维护一份互相矛盾的数据。
- 用声明式查询表达“要什么”，把访问路径、缓存和执行交给数据库优化器。
- 用类型、键、事务和权限维护不变量，使并发请求或其他客户端不能轻易破坏数据。

### 1.2 从认识数据到安全运维的逻辑主线

~~~mermaid
flowchart TD
  A[第1～3章<br/>数据库、MySQL、连接与元数据] --> B[第4～9章<br/>SELECT、排序、过滤、模式匹配]
  B --> C[第10～13章<br/>计算字段、函数、聚集与分组]
  C --> D[第14～18章<br/>子查询、联结、UNION、全文检索]
  D --> E[第19～22章<br/>增删改、表与视图]
  E --> F[第23～25章<br/>存储过程、游标、触发器]
  F --> G[第26～30章<br/>事务、字符集、安全、维护、性能]
  G --> H[附录A～E<br/>安装入口、样例模型、语法、类型、保留字]
~~~

这条顺序并非语法列表。它先建立“行、列、表、键”的数据模型，再逐步扩大查询范围，随后才允许修改结构和数据，最后处理服务器级的可靠性问题。前一阶段提供后一阶段的语言积木。

### 1.3 MySQL 与相关主流方案怎样选择

| 方案 | 数据模型与部署 | 主要优势 | 主要限制 | 更适合的场景 |
| --- | --- | --- | --- | --- |
| MySQL / InnoDB | 客户机—服务器、关系表、SQL、事务 | 生态成熟，读写事务与复制能力完整，Web 技术栈接入普遍 | 高级 SQL 和扩展能力与其他 DBMS 有差异；分布式能力需要额外架构 | Web 业务、订单、账户、内容和通用 OLTP |
| PostgreSQL | 客户机—服务器、关系与对象扩展 | 标准 SQL、复杂查询、类型与扩展系统强 | 运维与特性选择需要相应经验 | 复杂数据模型、分析型 SQL、地理或自定义扩展 |
| SQLite | 嵌入式单文件关系数据库 | 零服务进程、部署简单、事务可靠 | 并发写入与集中式权限模型有限 | 移动端、桌面端、测试和小型本地应用 |
| MariaDB | 与 MySQL 同源的独立 DBMS | 语法和生态有较高兼容性，开源发行选择多 | 新版本特性与 MySQL 已持续分化，不能只凭名称假定兼容 | 已验证兼容性的 MySQL 替代部署 |
| 文档数据库 | 文档聚合、弱联结或应用侧联结 | 模式演进灵活，适合按聚合整体读写 | 跨文档约束、临时联结和复杂事务通常更难 | 访问模式稳定的内容、事件或半结构化数据 |

MySQL 的优势不是简单地“能存数据”，而是让多个客户端共享同一份带类型、关系、约束和事务的数据。若数据天然具有稳定关系且需要跨对象查询，本书这条 SQL 主线仍然有效；若需求是嵌入式单机、专业分析或无固定结构，则应按数据一致性和访问模式选型，而不是把任何数据库当作万能替代品。

## 二、30 章与 5 个附录的完整路线图

| 章节 | 原书标题 | 核心内容 | 本章要解决的问题与出口 |
| --- | --- | --- | --- |
| 前言 | 写作目标与读者对象 | 从通用 SQL 教程转向 MySQL 专属能力 | 用短章和连续示例让初学者快速进入可操作状态 |
| 第 1 章 | 了解 SQL | 数据库、表、列、行、主键、模式和 SQL | 先统一关系数据库词汇，再开始写查询 |
| 第 2 章 | MySQL 简介 | DBMS、客户机—服务器、版本与客户端工具 | 区分服务器和客户端，选择执行 SQL 的入口 |
| 第 3 章 | 使用 MySQL | 连接、USE、SHOW、DESCRIBE | 登录服务器并发现可用的库、表和列 |
| 第 4 章 | 检索数据 | SELECT、DISTINCT、LIMIT、限定名 | 明确要从哪张表返回哪些列和行 |
| 第 5 章 | 排序检索数据 | ORDER BY、多列排序、ASC / DESC | 不依赖未定义的自然返回顺序 |
| 第 6 章 | 过滤数据 | WHERE、比较、BETWEEN、IS NULL | 把过滤下推到服务器，只取需要的行 |
| 第 7 章 | 数据过滤 | AND、OR、优先级、IN、NOT | 安全组合多个布尔条件 |
| 第 8 章 | 用通配符进行过滤 | LIKE、百分号、下划线 | 对未知的部分文本建立搜索模式 |
| 第 9 章 | 用正则表达式进行搜索 | REGEXP、字符类、量词、定位符 | 表达比 LIKE 更复杂的文本规则 |
| 第 10 章 | 创建计算字段 | CONCAT、别名、算术表达式 | 在查询时生成展示或计算结果而不冗余存储 |
| 第 11 章 | 使用数据处理函数 | 文本、日期时间、数值函数 | 在服务器端标准化和转换列值 |
| 第 12 章 | 汇总数据 | AVG、COUNT、MAX、MIN、SUM | 不取回明细也能得到统计答案 |
| 第 13 章 | 分组数据 | GROUP BY、HAVING、子句次序 | 针对每个供应商等分组分别汇总和过滤 |
| 第 14 章 | 使用子查询 | IN 子查询、相关计算字段 | 把一个查询的结果作为另一个查询的输入 |
| 第 15 章 | 联结表 | 关系表、等值联结、内部联结 | 按键恢复分散在多张规范化表中的信息 |
| 第 16 章 | 创建高级联结 | 别名、自联结、自然联结、外联结、聚集 | 处理层级比较、缺失匹配和联结统计 |
| 第 17 章 | 组合查询 | UNION、UNION ALL、排序 | 纵向合并多个结构兼容的结果集 |
| 第 18 章 | 全文本搜索 | FULLTEXT、MATCH、AGAINST、布尔模式 | 用索引和相关度完成词项检索 |
| 第 19 章 | 插入数据 | INSERT、批量插入、INSERT SELECT | 以明确列映射安全添加一行或多行 |
| 第 20 章 | 更新和删除数据 | UPDATE、DELETE、WHERE 安全规则 | 修改目标行而不误伤整表 |
| 第 21 章 | 创建和操纵表 | CREATE、ALTER、DROP、RENAME、引擎 | 把数据类型、默认值、键和约束落实到模式 |
| 第 22 章 | 使用视图 | 虚拟表、查询封装、更新限制 | 复用复杂查询并控制暴露的行列 |
| 第 23 章 | 使用存储过程 | CALL、参数、变量、流程控制 | 在服务器中封装多语句业务步骤 |
| 第 24 章 | 使用游标 | DECLARE、OPEN、FETCH、CLOSE、循环 | 在存储程序内逐行处理结果集 |
| 第 25 章 | 使用触发器 | INSERT / DELETE / UPDATE 触发器 | 在数据变化事件发生时自动执行规则 |
| 第 26 章 | 管理事务处理 | START TRANSACTION、COMMIT、ROLLBACK、SAVEPOINT | 让一组修改全部成功或全部撤销 |
| 第 27 章 | 全球化和本地化 | 字符集、编码、校对规则 | 正确保存 Unicode 并控制比较与排序 |
| 第 28 章 | 安全管理 | 用户、权限、GRANT、REVOKE | 以最小权限隔离不同客户端 |
| 第 29 章 | 数据库维护 | 备份、检查、分析、日志 | 让数据可以恢复，让故障可以诊断 |
| 第 30 章 | 改善性能 | 配置、慢查询、EXPLAIN、索引与测量 | 从证据定位瓶颈，而非盲目改 SQL |
| 附录 A | MySQL 入门 | 服务器与客户端的获取、安装入口 | 为无环境的读者补齐实践前提 |
| 附录 B | 样例表 | vendors、products、customers、orders 等 | 用一套连续订单模型承载全书示例 |
| 附录 C | MySQL 语句的语法 | 常用语句速查与语法记号 | 在忘记结构时快速定位语句骨架 |
| 附录 D | MySQL 数据类型 | 字符串、数值、日期时间、二进制 | 依据语义、范围和精度选择存储类型 |
| 附录 E | MySQL 保留字 | MySQL 5 时代关键字清单 | 避免对象名与 SQL 语法冲突 |

## 三、沿原书讲解顺序精读 MySQL

### 第一阶段：先知道服务器里有什么

#### 第 1 章：用行、列、表和键建立共同语言

【原书】数据库是有组织的数据集合，表保存某一种类型的数据，列描述属性，行是一条记录。模式（schema）描述表和数据库的布局及特性。主键必须唯一、非空且稳定，用来区分每一行；书中强调不要把城市、州和邮政编码塞在一个字段里，因为可独立过滤的数据就应独立存储。

~~~sql
CREATE TABLE vendors (
  vend_id   INT PRIMARY KEY,
  vend_name VARCHAR(100) NOT NULL
);
~~~

- **DBMS**：Database Management System，管理数据库、并发、恢复和权限的软件。
- **schema**：模式；在 MySQL 语境中常与 database 近似使用，也可泛指对象结构。
- **primary key**：主键；能够唯一标识一行的候选键选择。

本章只建立术语，没有展开规范化、外键或事务隔离。实际设计还应问：事实是否只存一次、依赖是否明确、业务唯一性是否需要 UNIQUE，而不能把 AUTO_INCREMENT 当成全部数据模型。

#### 第 2 章：MySQL 是服务器，客户端只是入口

【原书】MySQL 采用客户机—服务器架构：服务器负责数据访问和处理，mysql 命令行、MySQL Administrator、MySQL Query Browser 等客户端负责连接和提交请求。原书所称“最新稳定版 5.1”只是 2009 年译注的时间点。

~~~powershell
mysql -h 127.0.0.1 -P 3306 -u app_user -p
~~~

- **client/server**：客户端提交协议请求，服务器集中执行和管理数据。
- **port 3306**：MySQL 经典协议常用默认端口；端口不是身份认证。
- **mysql**：经典命令行客户端名称；参数小写 -p 表示提示输入口令，大写 -P 指端口。

**【纠正｜第 2 章】** MySQL Administrator 和 MySQL Query Browser 已是历史工具，不应再按书中下载步骤搭建。今天可使用 mysql 客户端、MySQL Shell、MySQL Workbench，或经团队批准的 DBeaver/DataGrip。工具只改变交互界面，不改变 SQL 在服务器执行这一事实。

#### 第 3 章：连接后先发现元数据，不靠猜表结构

【原书】连接需要主机、端口、用户名和口令。USE 选择默认数据库；SHOW DATABASES、SHOW TABLES、SHOW COLUMNS 和 DESCRIBE 用于发现对象；SHOW CREATE TABLE 能返回真实 DDL。

~~~sql
USE crashcourse;
SHOW TABLES;
DESCRIBE products;
SHOW CREATE TABLE products;
SELECT VERSION(), CURRENT_USER();
~~~

- **metadata**：元数据，即描述库、表、列、索引、权限的数据。
- **fully qualified name**：完全限定名，如 crashcourse.products，可避免默认库歧义。
- **INFORMATION_SCHEMA**：以可查询表暴露元数据的标准化系统库。

应用连接不应使用 root。生产客户端还需 TLS、连接池、超时与最小权限；“能登录”并不等于“能访问任意数据库”。

### 第二阶段：把单表 SELECT 写准确

#### 第 4 章：SELECT 明确列，DISTINCT 去重，LIMIT 截断

【原书】SELECT 至少说明“选什么”和“从哪里选”。星号能返回所有列，但会扩大网络、解码和模式耦合成本；没有 ORDER BY 时行顺序没有意义。DISTINCT 作用于所选列的完整组合，LIMIT 限制返回行数。

~~~sql
SELECT prod_id, prod_name, prod_price
FROM products
LIMIT 5;

SELECT DISTINCT vend_id
FROM products;
~~~

- **projection**：投影，即选择输出列。
- **DISTINCT**：对整个结果行去重，不是只修饰视觉上紧邻的一列。
- **LIMIT**：若需要稳定分页，必须搭配确定性的 ORDER BY。

深分页 LIMIT 100000, 20 会扫描并丢弃大量前置行。实际接口更适合用“上一页最后一个排序键”做键集分页。

#### 第 5 章：只有 ORDER BY 才承诺顺序

【原书】可按一列或多列排序，后一个键只在前一个键相同时生效；DESC 只作用于它前面的排序项，未声明则为 ASC。

~~~sql
SELECT prod_id, prod_price, prod_name
FROM products
ORDER BY prod_price DESC, prod_name ASC
LIMIT 5;
~~~

- **ASC / DESC**：ascending / descending，升序与降序。
- **collation**：校对规则同时影响文本比较和排序，不是显示格式。

若排序键不唯一，翻页边界仍可能漂移。可在末尾增加主键作为稳定的最终排序键。

#### 第 6 章：WHERE 把无关行留在服务器

【原书】WHERE 位于 FROM 之后，支持等于、不等于、大小比较、BETWEEN 和 IS NULL。NULL 表示未知或缺失，不能写成 = NULL。

~~~sql
SELECT prod_name, prod_price
FROM products
WHERE prod_price BETWEEN 5 AND 10;

SELECT cust_id, cust_email
FROM customers
WHERE cust_email IS NULL;
~~~

- **predicate**：谓词，对一行求值为真、假或未知的条件。
- **NULL**：未知/缺失标记，不等于空字符串或数字 0。
- **sargable**：谓词能直接利用索引范围，而非先对每行列值做函数计算。

WHERE DATE(order_date) = '2026-08-08' 通常不如 order_date >= '2026-08-08' AND order_date < '2026-08-09' 利于索引。

#### 第 7 章：组合条件时把优先级写给人看

【原书】AND 优先于 OR；括号能消除歧义。IN 适合对同一表达式匹配一个集合，NOT 对条件取反。

~~~sql
SELECT prod_name, prod_price
FROM products
WHERE (vend_id = 1002 OR vend_id = 1003)
  AND prod_price >= 10;
~~~

- **boolean precedence**：NOT、AND、OR 并非同级。
- **IN**：集合成员测试，可接字面值列表或子查询。
- **three-valued logic**：条件还可能是 UNKNOWN，因此 NOT IN 遇到 NULL 时常产生意外结果。

当子查询可能返回 NULL，优先使用 NOT EXISTS 表达“没有匹配行”。

#### 第 8 章：LIKE 适合简单模式，不是搜索引擎

【原书】百分号匹配零到多个字符，下划线只匹配一个字符。前导百分号如 '%anvil%' 很难利用普通 B-tree 索引。

~~~sql
SELECT prod_id, prod_name
FROM products
WHERE prod_name LIKE 'jet%';
~~~

- **wildcard**：LIKE 语法中的 % 与 _。
- **escape character**：搜索字面量 % 或 _ 时需要转义。

LIKE 的大小写敏感性由列的校对规则决定。需要精确大小写时应选择合适 collation，而不是假定所有安装行为相同。

#### 第 9 章：REGEXP 用模式描述文本结构

【原书】REGEXP 支持字符选择、字符类、范围、重复次数和行首行尾定位。

~~~sql
SELECT prod_name
FROM products
WHERE prod_name REGEXP '[[:digit:]]+ ton';

SELECT '1000' REGEXP '^[[:digit:]]{4}$' AS is_four_digits;
~~~

- **regular expression**：用模式语言描述字符串集合。
- **character class**：字符类，如 [abc] 或 [[:digit:]]。
- **quantifier / anchor**：量词与定位符，如 +、{n}、^、$。

**【纠正｜第 9 章】** MySQL 8 的正则实现已改用 ICU，并增加 REGEXP_LIKE、REGEXP_INSTR、REGEXP_REPLACE、REGEXP_SUBSTR。字符集、换行与大小写行为不能完全照搬 MySQL 5 示例；迁移应为 Unicode 和边界条件补测试。

### 第三阶段：在服务器完成表达式与汇总

#### 第 10 章：计算字段服务于结果，不制造重复数据

【原书】计算字段在 SELECT 执行时由表达式产生；CONCAT 拼接列，算术运算计算订单金额，AS 给结果稳定别名。

~~~sql
SELECT CONCAT(RTRIM(vend_name), ' (', RTRIM(vend_country), ')') AS vendor_title
FROM vendors;

SELECT quantity * item_price AS expanded_price
FROM orderitems
WHERE order_num = 20005;
~~~

- **computed field**：计算字段，不一定实际存储。
- **alias**：别名，为表达式结果提供列名。

金额应使用 DECIMAL 而不是 FLOAT；货币符号和千分位通常仍由应用层展示。

#### 第 11 章：函数便利，但会带来方言和索引代价

【原书】函数分为文本、日期时间和数值处理。常见函数包括 UPPER、LENGTH、LEFT、TRIM、YEAR、DATE、ABS；书中提醒函数的可移植性弱于基础 SQL。

~~~sql
SELECT vend_name, UPPER(vend_name) AS vend_name_upper
FROM vendors;

SELECT order_num
FROM orders
WHERE order_date >= '2026-08-01'
  AND order_date <  '2026-09-01';
~~~

- **scalar function**：每个输入行产生一个值的函数。
- **deterministic**：相同输入是否总返回相同结果。

日期列上包 YEAR(order_date) 可能阻止普通索引范围查找。跨时区系统还应明确保存 UTC、转换边界和 TIMESTAMP / DATETIME 语义。

#### 第 12 章：聚集函数让数据靠近计算

【原书】AVG、COUNT、MAX、MIN、SUM 汇总行集。COUNT(*) 统计行；COUNT(column) 忽略该列为 NULL 的行；DISTINCT 可在聚集内只计算不同值。

~~~sql
SELECT COUNT(*) AS product_count,
       MIN(prod_price) AS min_price,
       MAX(prod_price) AS max_price,
       AVG(prod_price) AS avg_price
FROM products;
~~~

- **aggregate function**：把一组行折叠成一个统计值。
- **cardinality**：可指行数或不同值数量。

空集合上的 SUM、AVG 可能返回 NULL。COALESCE(SUM(amount), 0) 虽能转零，但要先判断“没有记录”和“合计为零”是否语义相同。

#### 第 13 章：GROUP BY 决定统计粒度，HAVING 过滤组

【原书】GROUP BY 将行分组后为每组聚集；WHERE 在分组前过滤行，HAVING 在分组后过滤组；ORDER BY 只负责最终次序。

~~~sql
SELECT vend_id, COUNT(*) AS product_count, AVG(prod_price) AS avg_price
FROM products
WHERE prod_price >= 5
GROUP BY vend_id
HAVING COUNT(*) >= 2
ORDER BY product_count DESC, vend_id;
~~~

- **grouping key**：决定输出一行代表哪一组。
- **functional dependency**：分组键能否唯一决定另一个选出列。

**【纠正｜第 13 章】** MySQL 8.4 默认启用 ONLY_FULL_GROUP_BY：非聚集列必须出现在 GROUP BY 中或能由其函数依赖确定。旧项目依赖“每组随便取一行”的查询应明确聚集、补充分组键或用窗口函数重写。

### 第四阶段：跨表恢复关系、跨查询组合答案

#### 第 14 章：子查询把一个答案喂给另一个查询

【原书】子查询可用于 WHERE ... IN，也可作为标量计算字段。书中以“找出订购 TNT2 的顾客”为例逐层查询。

~~~sql
SELECT cust_name, cust_contact
FROM customers
WHERE cust_id IN (
  SELECT cust_id FROM orders
  WHERE order_num IN (
    SELECT order_num FROM orderitems WHERE prod_id = 'TNT2'
  )
);
~~~

- **subquery**：嵌套在另一语句中的查询。
- **correlated subquery**：引用外层当前行的子查询。
- **scalar subquery**：期望至多返回一行一列。

子查询不天然比 JOIN 慢，优化器可能改写；但层级过深会隐藏关系和重复工作，应以 EXPLAIN / EXPLAIN ANALYZE 的证据判断。

#### 第 15 章：联结按键把规范化数据拼回业务视图

【原书】供应商和产品分表能避免重复与更新异常；联结通过 vend_id 等关系键组合它们。遗漏联结条件会产生笛卡尔积。

~~~sql
SELECT v.vend_name, p.prod_name, p.prod_price
FROM vendors AS v
JOIN products AS p ON p.vend_id = v.vend_id
WHERE p.prod_price < 10;
~~~

- **inner join**：只保留两侧都匹配的行。
- **foreign key**：保证子表引用的父键存在；它不会自动编写联结。
- **Cartesian product**：所有行组合，常由遗漏条件造成。

原书还演示逗号表名加 WHERE 的等值联结。现代代码优先显式 JOIN ... ON，使连接关系与业务过滤分开。

#### 第 16 章：自联结、外联结和聚集各有明确语义

【原书】自联结用同一表的不同别名比较行；外联结保留一侧未匹配的行；联结后仍可分组聚集。自然联结依靠同名列推断连接。

~~~sql
SELECT c.cust_name, COUNT(o.order_num) AS order_count
FROM customers AS c
LEFT JOIN orders AS o ON o.cust_id = c.cust_id
GROUP BY c.cust_id, c.cust_name;
~~~

- **self join**：同一张表在一个查询中扮演多个角色。
- **LEFT JOIN**：保留左表全部行，右侧无匹配时用 NULL 补齐。
- **NATURAL JOIN**：按全部同名列隐式联结。

NATURAL JOIN 会因新增同名列而静默改变语义，生产查询应显式写 ON。外联结后若在 WHERE 中要求右表列满足条件，也可能把它变回内联结。

#### 第 17 章：UNION 是纵向叠加，不是横向联结

【原书】UNION 合并多条 SELECT；列数必须相同且对应类型兼容。UNION 去重，UNION ALL 保留重复且通常少一步去重成本。

~~~sql
SELECT cust_name, cust_email FROM customers WHERE cust_state IN ('IL', 'IN')
UNION ALL
SELECT cust_name, cust_email FROM customers WHERE cust_name = 'Fun4All'
ORDER BY cust_name;
~~~

- **set operation**：按位置组合结构兼容的结果。
- **UNION ALL**：多重集合并集，不消除重复。

若分支只是同表不同条件，单个 WHERE 可能更直接；若重复行有业务意义，误用 UNION 会悄悄丢数据。

#### 第 18 章：FULLTEXT 用倒排索引和相关度搜索词项

【原书】为文本列创建 FULLTEXT 后，MATCH(column) AGAINST(query) 可做自然语言、查询扩展和布尔模式搜索；MATCH 列清单必须与索引定义匹配。

~~~sql
CREATE FULLTEXT INDEX ft_productnotes_note_text ON productnotes(note_text);

SELECT note_id, note_text,
       MATCH(note_text) AGAINST('rabbit bait') AS relevance
FROM productnotes
WHERE MATCH(note_text) AGAINST('rabbit bait')
ORDER BY relevance DESC;

SELECT note_id
FROM productnotes
WHERE MATCH(note_text) AGAINST('+rabbit -rope' IN BOOLEAN MODE);
~~~

- **inverted index**：从词项映射到包含它的文档。
- **relevance**：匹配程度的评分。
- **stopword / minimum token size**：停用词与最小词长配置会影响入索引内容。

**【纠正｜第 18 章】** 原书称常用引擎中“只有 MyISAM 支持全文搜索，InnoDB 不支持”，这已过时。MySQL 8.4 可在 InnoDB 上创建 FULLTEXT。中文检索需评估 ngram parser；复杂召回、同义词和跨字段排序可交给 Elasticsearch/OpenSearch，但要承担索引同步与最终一致性。

### 第五阶段：改变数据和模式时先控制破坏半径

#### 第 19 章：INSERT 总是显式写列映射

【原书】INSERT 可以插入完整行、多行，也可用 INSERT SELECT 把查询结果写入另一表。省略列名会把代码绑定到表定义顺序，书中明确建议写出列名。

~~~sql
INSERT INTO customers
  (cust_name, cust_address, cust_city, cust_state, cust_zip, cust_country)
VALUES
  ('Pep E. Lapew', '100 Main Street', 'Los Angeles', 'CA', '90046', 'USA'),
  ('M. Martian', '42 Galaxy Way', 'New York', 'NY', '11213', 'USA');

INSERT INTO customers_archive(cust_id, cust_name, cust_email)
SELECT cust_id, cust_name, cust_email
FROM customers
WHERE cust_email IS NOT NULL;
~~~

- **auto-increment**：服务器分配递增值的列属性，不保证无间隙。
- **bulk insert**：一次提交多行，通常比逐行往返高效。

应用代码应使用参数化语句，不能拼接用户输入。批量导入还要确定重复键策略、事务大小和失败后的可重试边界。

#### 第 20 章：UPDATE 和 DELETE 的核心安全装置是 WHERE

【原书】两条语句都能影响特定行或整表；遗漏 WHERE 是最危险的错误。先用 SELECT 验证相同条件、使用主键定位、遵守外键关系并维护备份，是书中给出的安全原则。

~~~sql
START TRANSACTION;

SELECT cust_id, cust_email
FROM customers
WHERE cust_id = 10001
FOR UPDATE;

UPDATE customers
SET cust_email = 'new@example.com'
WHERE cust_id = 10001;

-- 检查 ROW_COUNT() 和结果；不符合预期就回滚。
ROLLBACK;
~~~

- **affected rows**：受影响行数，是防止条件过宽的重要信号。
- **soft delete**：用状态或删除时间保留记录；会增加查询过滤、唯一约束和治理复杂度。

外键 ON DELETE CASCADE 能维持引用完整性，也会扩大删除范围；应针对业务生命周期显式设计，不能当作通用清理开关。

#### 第 21 章：类型、约束和引擎把业务不变量写进数据库

【原书】CREATE TABLE 定义列、NULL、主键、AUTO_INCREMENT、默认值和存储引擎；ALTER TABLE 改结构，DROP TABLE 删除对象，RENAME TABLE 改名。书中比较 InnoDB、MyISAM 和 MEMORY，并强调外键与事务依赖支持它们的引擎。

~~~sql
CREATE TABLE orders (
  order_num  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cust_id    BIGINT UNSIGNED NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (order_num),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (cust_id) REFERENCES customers(cust_id),
  CONSTRAINT chk_orders_status
    CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
~~~

- **DDL**：Data Definition Language，定义模式对象的语句。
- **storage engine**：负责表的索引、锁、事务和物理存储。
- **constraint**：由数据库拒绝不满足规则的数据。
- **DECIMAL(p,s)**：精确十进制，p 为总位数，s 为小数位数。

**【纠正｜第 21 章】** MySQL 8.4 应以 InnoDB 为通用业务表基线；CHECK 约束在当前版本会执行，而早期 MySQL 曾解析却忽略它。ALTER 大表可能占用大量资源，应先确认目标操作的 online DDL 能力，并通过迁移、灰度和回滚方案控制风险。

#### 第 22 章：视图封装查询接口，但不会自动物化结果

【原书】视图是保存 SELECT 定义的虚拟表，可简化联结、重新格式化数据、过滤行列和复用计算字段。是否可更新取决于定义是否包含分组、聚集、UNION 等限制。

~~~sql
CREATE VIEW productcustomers AS
SELECT c.cust_id, c.cust_name, c.cust_email,
       o.order_num, oi.prod_id
FROM customers AS c
JOIN orders AS o      ON o.cust_id = c.cust_id
JOIN orderitems AS oi ON oi.order_num = o.order_num;

SELECT cust_name, cust_email
FROM productcustomers
WHERE prod_id = 'TNT2';
~~~

- **view**：保存查询定义的数据库对象。
- **materialized view**：保存结果并刷新；MySQL 没有与部分 DBMS 等价的原生通用物化视图。
- **SQL SECURITY**：以定义者或调用者权限解析对象访问。

视图不是性能缓存，层层嵌套会让计划难以理解。跨环境迁移时应避免把个人账号硬编码为 DEFINER。

### 第六阶段：把服务器端自动化控制在清晰边界内

#### 第 23 章：存储过程封装多语句操作

【原书】存储过程把一组 SQL 保存于服务器，通过 CALL 执行；可使用 IN、OUT、INOUT 参数、局部变量、IF 和 SELECT ... INTO。优点是封装、复用、减少往返和集中权限；代价是调试、移植与版本管理更复杂。

~~~sql
DELIMITER //

CREATE PROCEDURE ordertotal(
  IN  p_order_num BIGINT UNSIGNED,
  OUT p_total     DECIMAL(12,2)
)
BEGIN
  SELECT COALESCE(SUM(quantity * item_price), 0)
    INTO p_total
  FROM orderitems
  WHERE order_num = p_order_num;
END//

DELIMITER ;

CALL ordertotal(20005, @total);
SELECT @total;
~~~

- **stored procedure**：保存在服务器端、可调用的命名程序。
- **IN / OUT / INOUT**：输入、输出和双向参数模式。
- **DELIMITER**：mysql 客户端命令，用来改变语句终止符，不是服务器 SQL。

复杂业务若跨数据库、消息系统和外部 API，存储过程不能独立完成编排。适合放入过程的通常是紧贴数据、边界稳定的原子操作；源码仍应进入版本控制和迁移流程。

#### 第 24 章：游标是逐行逃生口，不是默认查询模型

【原书】MySQL 游标只能在存储过程和函数中使用。声明必须位于处理程序和可执行语句之前；流程为 DECLARE、OPEN、FETCH、CLOSE，常用 NOT FOUND handler 结束循环。

~~~sql
DELIMITER //

CREATE PROCEDURE count_orders(OUT p_count INT)
BEGIN
  DECLARE done BOOLEAN DEFAULT FALSE;
  DECLARE v_order_num BIGINT UNSIGNED;
  DECLARE order_cursor CURSOR FOR
    SELECT order_num FROM orders ORDER BY order_num;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  SET p_count = 0;
  OPEN order_cursor;
  read_loop: LOOP
    FETCH order_cursor INTO v_order_num;
    IF done THEN LEAVE read_loop; END IF;
    SET p_count = p_count + 1;
  END LOOP;
  CLOSE order_cursor;
END//

DELIMITER ;
~~~

- **cursor**：对结果集逐行读取的控制结构。
- **handler**：存储程序中处理特定 SQL 状态的逻辑。
- **set-based operation**：一条语句处理整组行。

上例用于展示控制流，真实计数应直接 SELECT COUNT(*)。能用 JOIN、聚集、窗口函数或批量 DML 完成时，应避免游标的逐行开销和更长事务。

#### 第 25 章：触发器自动守护事件，也可能隐藏副作用

【原书】触发器绑定表上的 INSERT、UPDATE、DELETE，在 BEFORE 或 AFTER 时点访问 NEW / OLD 行。常见用途是审计、校验、派生值和维护冗余信息。

~~~sql
CREATE TABLE order_audit (
  audit_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_num  BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TRIGGER orders_after_update
AFTER UPDATE ON orders
FOR EACH ROW
INSERT INTO order_audit(order_num, old_status, new_status)
SELECT NEW.order_num, OLD.status, NEW.status
WHERE NOT (OLD.status <=> NEW.status);
~~~

- **trigger**：由表事件自动触发、逐行执行的程序。
- **OLD / NEW**：变化前和变化后的伪记录。
- **null-safe equality**：MySQL 的 &lt;=&gt; 把 NULL 纳入确定性相等比较。

触发器不会出现在应用调用链上，过多逻辑会造成性能和排障困难。审计若涉及不可抵赖、跨服务事件或高吞吐变更流，应评估 binlog CDC。

### 第七阶段：可靠性、安全与性能决定系统能否长期运行

#### 第 26 章：事务把多条修改变成一个原子承诺

【原书】事务是一组必须整体成功的 SQL；START TRANSACTION 开始，COMMIT 持久化，ROLLBACK 撤销，SAVEPOINT 支持局部回退。事务能力依赖存储引擎，MyISAM 不支持而 InnoDB 支持。

~~~sql
START TRANSACTION;

UPDATE accounts
SET balance = balance - 100.00
WHERE account_id = 1 AND balance >= 100.00;

UPDATE accounts
SET balance = balance + 100.00
WHERE account_id = 2;

COMMIT;
~~~

- **ACID**：Atomicity、Consistency、Isolation、Durability，原子性、一致性、隔离性、持久性。
- **autocommit**：默认每条独立语句自动提交的会话模式。
- **savepoint**：事务内部的命名回退点。
- **isolation level**：事务可观察其他并发事务变化的规则。

必须检查第一条扣款实际影响一行，否则第二条入账会凭空增加余额。事务也不意味着“任何语句都能回滚”：许多 DDL 会隐式提交。长事务还会保留旧版本并扩大锁等待。

#### 第 27 章：字符集决定能否存，校对规则决定怎样比

【原书】字符集是字符集合，编码是内部表示，校对规则规定比较和排序。MySQL 可在服务器、数据库、表、列和表达式层设置它们。

~~~sql
CREATE DATABASE crashcourse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

SELECT cust_name
FROM customers
ORDER BY cust_name COLLATE utf8mb4_0900_as_cs;
~~~

- **utf8mb4**：MySQL 的四字节 UTF-8，支持补充字符。
- **collation**：ai / as 表示重音不敏感/敏感，ci / cs 表示大小写不敏感/敏感。
- **connection character set**：客户端与服务器传输字符串的会话编码。

**【当前补充】** MySQL 8.4 的默认服务器字符集和校对规则是 utf8mb4 与 utf8mb4_0900_ai_ci。新系统不应把 utf8（utf8mb3）当完整 UTF-8。迁移前要检查索引长度、比较语义、唯一键碰撞和连接配置。

#### 第 28 章：账号先创建，权限再最小化授予

【原书】安全原则是用户只能访问完成工作所需的数据。书中使用 CREATE USER、DROP USER、GRANT、REVOKE、SHOW GRANTS 和 SET PASSWORD，并提醒日常操作不要使用 root。

~~~sql
CREATE USER 'crash_app'@'%'
  IDENTIFIED BY 'replace-with-a-secret'
  REQUIRE SSL;

GRANT SELECT, INSERT, UPDATE, DELETE
ON crashcourse.*
TO 'crash_app'@'%';

SHOW GRANTS FOR 'crash_app'@'%';
~~~

- **authentication**：证明“你是谁”。
- **authorization**：决定“你能做什么”。
- **host part**：MySQL 账户由 user@host 共同标识。
- **least privilege**：只授予必要对象和动作。

**【纠正｜第 28 章】** MySQL 8.4 官方流程是用 CREATE USER 定义账户、口令和 TLS 等非权限属性，再用 GRANT 授权；不要依赖旧版 GRANT 顺便创建账号。口令应由密钥管理或部署环境注入，应用与迁移任务也应使用不同账户。

#### 第 29 章：备份的终点是成功恢复

【原书】普通文件复制可能捕获到不一致的打开文件。书中推荐 mysqldump，并介绍表检查/修复、ANALYZE TABLE、启动诊断和错误日志、查询日志、二进制日志、慢查询日志。

~~~powershell
mysqldump --single-transaction --routines --triggers --events --databases crashcourse > crashcourse.sql
mysql < crashcourse.sql
~~~

- **logical backup**：导出 DDL 与行数据，便于迁移但恢复大库较慢。
- **physical backup**：复制物理页或文件，恢复快但更依赖版本与工具。
- **binary log**：记录数据变更，可用于复制和时间点恢复。
- **RPO / RTO**：可接受的数据丢失窗口 / 恢复耗时目标。

仅生成转储文件不算完成备份：还要加密、异地保留、监控失败，并周期性在隔离环境恢复。--single-transaction 为 InnoDB 提供一致快照，但导出期间应避免会破坏快照语义的 DDL。

#### 第 30 章：先测量执行计划，再决定索引或改写

【原书】性能优化没有万能清单。应保持版本更新、查看配置和进程状态、用 EXPLAIN 理解查询、避免不必要的 SELECT *、为过滤和联结列评估索引，并记住索引会拖慢写入。

~~~sql
EXPLAIN ANALYZE
SELECT o.order_num, SUM(oi.quantity * oi.item_price) AS total
FROM orders AS o
JOIN orderitems AS oi ON oi.order_num = o.order_num
WHERE o.cust_id = 10001
GROUP BY o.order_num;

CREATE INDEX idx_orders_cust_date ON orders(cust_id, order_date);
~~~

- **query optimizer**：根据统计信息和访问路径选择执行计划。
- **covering index**：包含查询所需列、可减少回表的索引。
- **selectivity**：谓词过滤比例；低选择性索引未必值得使用。
- **slow query log**：按阈值记录慢 SQL 的服务器日志。

索引顺序由真实谓词、排序和分组共同决定；“给每列都建索引”会增加存储、缓存压力和写放大。可靠流程是建立基线、捕获代表性 SQL、查看实际计划、做单一改动，再以相同负载复测。

### 第八阶段：把五个附录变成可复用参考

#### 附录 A：MySQL 入门

【原书】说明学习需要可访问的 MySQL 服务器和客户端，可使用已有服务器或自行安装，并把连接、执行、退出命令与第 3 章衔接。原安装界面和版本已过时，本文第四部分给出可重复的 MySQL 8.4 容器环境。

#### 附录 B：样例表

【原书】订单模型由 vendors、products、customers、orders、orderitems、productnotes 等表组成。products.vend_id 连接供应商，orders.cust_id 连接客户，orderitems 用 order_num 与 prod_id 表达订单明细。它让第 4～30 章始终在同一组关系上增加能力。

#### 附录 C：MySQL 语句的语法

【原书】列出 ALTER TABLE、CREATE INDEX、CREATE PROCEDURE、CREATE TABLE、CREATE USER、CREATE VIEW、DELETE、DROP、INSERT、SELECT、UPDATE 等语句骨架；竖线表示选择，方括号表示可选。它是速查表而非完整规范，版本相关选项应回到对应版本的官方手册。

#### 附录 D：MySQL 数据类型

【原书】按字符串、数值、日期时间和二进制分类，强调类型既限制合法值，也影响存储效率和排序。当前设计可用以下判断缩小选择：

| 数据语义 | 建议类型 | 不应轻易使用 |
| --- | --- | --- |
| 业务整数与标识 | 合适范围的 INT / BIGINT，可按需 UNSIGNED | 用 VARCHAR 保存可计算数值 |
| 金额与精确小数 | DECIMAL(p,s) | FLOAT / DOUBLE 保存货币 |
| 可变短文本 | VARCHAR(n) + 明确 utf8mb4 collation | 无上限地统一成 TEXT |
| 时间点 | 依据范围与时区策略选 TIMESTAMP / DATETIME | 用字符串保存日期 |
| 二进制内容 | BINARY / VARBINARY / BLOB，或只存对象地址 | 把二进制误当字符文本 |
| 布尔状态 | BOOLEAN 并配合约束 | 依赖显示宽度代表范围 |

类型选择要同时考虑语义、范围、精度、索引和演进，而不是只追求字节最小。

#### 附录 E：MySQL 保留字

【原书】列出 MySQL 5 时代保留字，建议对象名不要与关键字冲突。保留字会随版本增加，例如窗口函数和 CTE 引入了新的语法词。升级前应使用目标版本文档和检查工具扫描；转义名称只能暂时缓解糟糕命名。

## 四、当前可复现环境：用 MySQL 8.4 运行全文示例

以下为**【当前补充】**。原书附录 A 的安装界面和 5.x 工具链已不适合复现；容器方案不污染宿主机，Windows、macOS 和 Linux 的 SQL 行为也更一致。MySQL 8.4 是 LTS 系列，适合观察原书语法在现代版本中的行为。

### 4.1 启动服务

先安装 Docker Desktop 或兼容的 Docker Engine，并确认客户端与服务端都可用：

~~~powershell
docker version
~~~

创建命名卷并启动数据库。示例口令只用于本机学习，请替换：

~~~powershell
docker run --name mysql-crash-course -e MYSQL_ROOT_PASSWORD=change-me-now -e MYSQL_DATABASE=crashcourse -p 3306:3306 -v mysql-crash-course-data:/var/lib/mysql -d mysql:8.4
docker logs -f mysql-crash-course
~~~

日志出现 ready for connections 后按 Ctrl+C 退出跟踪，再进入客户端：

~~~powershell
docker exec -it mysql-crash-course mysql -uroot -p
~~~

### 4.2 创建练习账户与最小样例库

在 mysql 提示符中执行：

~~~sql
CREATE DATABASE IF NOT EXISTS crashcourse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'crash_app'@'%'
  IDENTIFIED BY 'crash-app-local-only';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP,
      INDEX, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE,
      EXECUTE, TRIGGER
ON crashcourse.*
TO 'crash_app'@'%';

USE crashcourse;

CREATE TABLE vendors (
  vend_id      INT UNSIGNED PRIMARY KEY,
  vend_name    VARCHAR(100) NOT NULL,
  vend_country VARCHAR(50) NOT NULL
) ENGINE = InnoDB;

CREATE TABLE products (
  prod_id    VARCHAR(10) PRIMARY KEY,
  vend_id    INT UNSIGNED NOT NULL,
  prod_name  VARCHAR(100) NOT NULL,
  prod_price DECIMAL(10,2) NOT NULL,
  prod_desc  TEXT,
  CONSTRAINT chk_products_price CHECK (prod_price >= 0),
  CONSTRAINT fk_products_vendor
    FOREIGN KEY (vend_id) REFERENCES vendors(vend_id)
) ENGINE = InnoDB;

CREATE TABLE customers (
  cust_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cust_name    VARCHAR(100) NOT NULL,
  cust_contact VARCHAR(100),
  cust_email   VARCHAR(255),
  cust_address VARCHAR(255),
  cust_city    VARCHAR(100),
  cust_state   VARCHAR(50),
  cust_zip     VARCHAR(20),
  cust_country VARCHAR(50) NOT NULL
) ENGINE = InnoDB;

CREATE TABLE orders (
  order_num  BIGINT UNSIGNED PRIMARY KEY,
  order_date DATETIME NOT NULL,
  cust_id    BIGINT UNSIGNED NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (cust_id) REFERENCES customers(cust_id),
  CONSTRAINT chk_orders_status
    CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled'))
) ENGINE = InnoDB;

CREATE TABLE orderitems (
  order_num  BIGINT UNSIGNED NOT NULL,
  order_item SMALLINT UNSIGNED NOT NULL,
  prod_id    VARCHAR(10) NOT NULL,
  quantity   INT UNSIGNED NOT NULL,
  item_price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_num, order_item),
  CONSTRAINT fk_orderitems_order
    FOREIGN KEY (order_num) REFERENCES orders(order_num),
  CONSTRAINT fk_orderitems_product
    FOREIGN KEY (prod_id) REFERENCES products(prod_id),
  CONSTRAINT chk_orderitems_quantity CHECK (quantity > 0)
) ENGINE = InnoDB;

CREATE TABLE productnotes (
  note_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prod_id   VARCHAR(10) NOT NULL,
  note_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note_text TEXT NOT NULL,
  CONSTRAINT fk_productnotes_product
    FOREIGN KEY (prod_id) REFERENCES products(prod_id)
) ENGINE = InnoDB;

INSERT INTO vendors(vend_id, vend_name, vend_country) VALUES
  (1001, 'Anvils R Us', 'USA'),
  (1002, 'LT Supplies', 'USA'),
  (1003, 'ACME', 'USA');

INSERT INTO products(prod_id, vend_id, prod_name, prod_price, prod_desc) VALUES
  ('ANV01', 1001, '1 ton anvil', 5.99, 'Entry-level anvil'),
  ('ANV02', 1001, '2 ton anvil', 9.99, 'For heavier work'),
  ('DTNTR', 1003, 'Detonator', 13.00, 'Detonator for demonstrations'),
  ('FB',    1003, 'Bird seed', 10.00, 'Large bag of seed'),
  ('TNT2',  1003, 'TNT (2 sticks)', 10.00, 'Two sticks');

INSERT INTO customers
  (cust_id, cust_name, cust_contact, cust_email, cust_city, cust_state, cust_country)
VALUES
  (10001, 'Coyote Inc.', 'Wile E. Coyote', 'wile@example.com', 'Phoenix', 'AZ', 'USA'),
  (10002, 'Mouse House', 'Jerry Mouse', NULL, 'Chicago', 'IL', 'USA'),
  (10003, 'Fun4All', 'Jim Jones', 'jim@example.com', 'Muncie', 'IN', 'USA');

INSERT INTO orders(order_num, order_date, cust_id, status) VALUES
  (20005, '2026-08-01 10:00:00', 10001, 'paid'),
  (20006, '2026-08-02 11:30:00', 10003, 'shipped');

INSERT INTO orderitems(order_num, order_item, prod_id, quantity, item_price) VALUES
  (20005, 1, 'ANV01', 10, 5.99),
  (20005, 2, 'TNT2',   5, 10.00),
  (20006, 1, 'FB',     1, 10.00);

INSERT INTO productnotes(prod_id, note_text) VALUES
  ('TNT2', 'Customer asks whether TNT is suitable as rabbit bait.'),
  ('FB', 'Bird seed ships in a reinforced bag; keep away from rope.');
~~~

退出 root，验证最小权限账户：

~~~powershell
docker exec -it mysql-crash-course mysql -ucrash_app -p crashcourse
~~~

~~~sql
SHOW VARIABLES LIKE 'version%';
SHOW VARIABLES LIKE 'character_set_server';
SHOW VARIABLES LIKE 'collation_server';
SELECT COUNT(*) FROM products;
~~~

以后可用 docker stop mysql-crash-course 和 docker start mysql-crash-course 停启服务。命名卷会保留数据；不要在仍需练习数据时删除卷。

## 五、原书之外，MySQL 8 值得继续补上的能力

原书建立的 SELECT、联结、事务和权限基础没有过时，但 2006 年英文版不可能覆盖后来出现的能力：

~~~sql
-- CTE：给查询阶段命名，也能写递归查询
WITH customer_totals AS (
  SELECT o.cust_id, SUM(oi.quantity * oi.item_price) AS total
  FROM orders AS o
  JOIN orderitems AS oi ON oi.order_num = o.order_num
  GROUP BY o.cust_id
)
SELECT c.cust_name, ct.total
FROM customer_totals AS ct
JOIN customers AS c ON c.cust_id = ct.cust_id;

-- 窗口函数：保留明细行的同时做组内排名
SELECT prod_id, vend_id, prod_price,
       ROW_NUMBER() OVER (
         PARTITION BY vend_id
         ORDER BY prod_price DESC, prod_id
       ) AS price_rank
FROM products;
~~~

- **CTE**：Common Table Expression，公用表表达式；改善复杂查询分段，也支持递归。
- **window function**：窗口函数；在不把明细折叠为一行的前提下做排名、累计和邻行比较。
- **JSON**：MySQL 8 支持二进制 JSON 类型、路径函数及相关索引方案；核心字段若需要频繁联结和约束，仍应建成普通列。
- **generated column / functional index**：生成列与函数索引可为稳定表达式建立访问路径，但会增加写入和模式成本。
- **EXPLAIN ANALYZE**：实际执行查询并返回计划节点耗时与行数；在生产使用前必须评估查询本身的开销。

继续学习时，应按需求而不是热度选择邻近技术：复杂 SQL、扩展类型和严格标准兼容可评估 PostgreSQL；嵌入式本地数据可用 SQLite；分布式分析应考虑列式数仓；复杂全文检索可使用搜索引擎。它们补充特定负载，不会消除关系建模、查询语义和事务边界这些基本问题。

## 六、把全书压缩成一套可迁移的判断法

1. 先定义数据事实、键和约束，再写应用 CRUD。
2. SELECT 明确列，WHERE 明确行，ORDER BY 才明确顺序。
3. 聚集前确认分组粒度；跨表前确认主外键和联结基数。
4. 修改前用相同 WHERE 做只读验证，并把相关写入放进短事务。
5. 字符集、权限、备份和恢复不是上线后的附加项，而是模式与部署的一部分。
6. 性能问题先取慢 SQL、统计信息和实际计划，再改索引或查询。
7. 遇到旧书结论时保留 SQL 思想，但必须按目标 MySQL 版本重新核验工具、默认值和限制。

《MySQL必知必会》的长处，是用同一套订单数据把“取一列”逐步推进到可维护数据库。真正应该记住的不是三十章语法，而是每次向数据库提问时都说明结果的列、行、关系、粒度、顺序和一致性边界。

## 七、来源与版本核验

- Ben Forta：《MySQL必知必会》，刘晓霞、钟鸣译，人民邮电出版社，2009 年 1 月第 1 版，ISBN 978-7-115-19112-0。本文章节顺序、原书观点和短引文均来自用户提供的 PDF。
- [MySQL 8.4 Reference Manual](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/)，核验 MySQL 8.4 文档范围与当前语法，访问日期：2026-08-08。
- [MySQL Releases: Innovation and LTS](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/mysql-releases.html)，核验 8.4 的 LTS 发布轨道。
- [Setting the Storage Engine](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/storage-engine-setting.html) 与 [The InnoDB Storage Engine](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-storage-engine.html)，核验默认存储引擎与 InnoDB 能力。
- [Natural Language Full-Text Searches](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/fulltext-natural-language.html)，核验 InnoDB FULLTEXT 与 MATCH ... AGAINST。
- [Regular Expressions](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/regexp.html)，核验 ICU 正则表达式函数与操作符。
- [Server Character Set and Collation](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/charset-server.html) 与 [The utf8mb4 Character Set](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/charset-unicode-utf8mb4.html)，核验默认字符集、校对规则与四字节 UTF-8。
- [MySQL Handling of GROUP BY](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/group-by-handling.html)，核验 ONLY_FULL_GROUP_BY 的默认行为。
- [CREATE USER](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/create-user.html) 与 [GRANT](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/grant.html)，核验当前账户创建与授权流程。

---
article: false
icon: pen-to-square
date: 2026-07-28
category:
  - 读书
tag:
  - SQL 反模式
  - SQL
  - 数据库设计
  - 后端开发
---

# 《SQL 反模式》

《SQL 反模式》讲的不是 SQL 语法，而是数据库设计和使用中那些“看起来方便、长期会出事”的做法。

核心思想：

```text
数据库问题很多不是因为 SQL 不会写，而是因为模型设计、约束、索引、查询和应用边界一开始就错了。
```

这本书适合后端开发、数据库开发、数据建模人员阅读。读完后，你会更容易识别项目里的“临时方案”什么时候已经变成技术债。

## 阅读路线

1. 先看逻辑设计反模式，理解表结构如何埋雷。
2. 再看物理设计反模式，理解类型、索引和文件存储。
3. 再看查询反模式，理解 SQL 写法如何影响正确性和性能。
4. 最后看应用开发反模式，理解安全、异常和 ORM 使用边界。

## 全书结构

| 部分 | 关注点 | 典型问题 |
| --- | --- | --- |
| 逻辑数据库设计 | 表、列、关系怎么建 | 逗号分隔、树结构、EAV、多态关联 |
| 物理数据库设计 | 类型、索引、文件怎么落地 | 浮点误差、索引滥用、文件存库 |
| 查询 | SQL 怎么写 | NULL、GROUP BY、随机查询、复杂查询 |
| 应用开发 | 应用如何使用数据库 | 明文密码、SQL 注入、ORM 滥用 |

## 第一部分 逻辑数据库设计反模式

### 第 1 章 Jaywalking：逗号分隔列表

反模式：在一个字段里存多个 ID，例如 `account_id = '1,2,3'`。

问题：

- 无法建立外键。
- 查询困难。
- 更新困难。
- 索引失效。
- 数据一致性无法保证。

正确做法：使用关联表。

```text
product
account
product_account
```

核心：一个字段只存一个值，多对多关系用中间表表达。

### 第 2 章 Naive Trees：朴素树

反模式：只用 `parent_id` 表示树，然后在复杂查询中痛苦递归。

问题：

- 查询整棵子树麻烦。
- 查询祖先链麻烦。
- 移动节点影响范围大。

先用一个统一例子理解：电商后台有商品分类，层级大致如下。

```text
电子产品
  手机
    Android
    iPhone
  电脑
    笔记本
    台式机
```

如果业务只需要展示“当前分类的直接下级”，朴素的 `parent_id` 很好；如果业务经常要查“手机下面所有子分类的商品”“某分类从根到当前的面包屑”“移动一棵子树”，不同建模方式的成本差异会非常明显。

#### 方案一：邻接表

邻接表就是每行只记录自己的直接父节点。

```sql
CREATE TABLE category (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id BIGINT NULL,
  FOREIGN KEY (parent_id) REFERENCES category(id)
);
```

示例数据：

| id | name | parent_id |
| --- | --- | --- |
| 1 | 电子产品 | NULL |
| 2 | 手机 | 1 |
| 3 | Android | 2 |
| 4 | iPhone | 2 |
| 5 | 电脑 | 1 |

查询“手机”的直接子分类很简单：

```sql
SELECT *
FROM category
WHERE parent_id = 2;
```

查询“Android”的父分类也很简单：

```sql
SELECT parent.*
FROM category AS child
JOIN category AS parent ON parent.id = child.parent_id
WHERE child.id = 3;
```

但查询整棵子树需要递归查询。支持递归 CTE 的数据库可以这样写：

```sql
WITH RECURSIVE subtree AS (
  SELECT id, name, parent_id, 0 AS depth
  FROM category
  WHERE id = 2

  UNION ALL

  SELECT child.id, child.name, child.parent_id, subtree.depth + 1
  FROM category AS child
  JOIN subtree ON child.parent_id = subtree.id
)
SELECT *
FROM subtree
ORDER BY depth, id;
```

邻接表适合：

- 树层级浅，例如两三级菜单、组织部门。
- 主要操作是查直接父子节点。
- 数据会频繁新增、移动、删除。
- 数据库支持递归查询，或者应用层可以接受递归加载。

不适合：

- 每次页面都要查整棵大树。
- 经常统计某节点下所有后代。
- 数据库不支持递归 CTE，且不想在应用层循环查询。

#### 方案二：路径枚举

路径枚举是在每个节点上保存从根到当前节点的路径。

```sql
CREATE TABLE category (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  path VARCHAR(500) NOT NULL UNIQUE
);
```

示例数据：

| id | name | path |
| --- | --- | --- |
| 1 | 电子产品 | /1/ |
| 2 | 手机 | /1/2/ |
| 3 | Android | /1/2/3/ |
| 4 | iPhone | /1/2/4/ |
| 5 | 电脑 | /1/5/ |

查询“手机”的整棵子树：

```sql
SELECT *
FROM category
WHERE path LIKE '/1/2/%'
ORDER BY path;
```

查询“Android”的祖先链，可以先拿到 `path = '/1/2/3/'`，再按路径中的 ID 查询：

```sql
SELECT *
FROM category
WHERE id IN (1, 2, 3)
ORDER BY LENGTH(path);
```

实际项目里不要把 `path` 写成 `/1/12/123` 这种没有尾部分隔符的形式，否则 `LIKE '/1/2%'` 可能误匹配 `/1/20/`。常见写法是 `/1/2/3/`，或使用固定宽度编码，比如 `/000001/000002/000003/`。

路径枚举适合：

- 读多写少。
- 经常查询某节点下所有后代。
- 需要按层级顺序展示目录。
- 分类、权限菜单、内容栏目这类树整体不太频繁移动。

不适合：

- 经常移动大子树。移动 `/1/2/` 到 `/1/5/2/` 时，所有后代的 `path` 都要更新。
- 路径过长。层级很深时会遇到字段长度、索引长度和查询性能问题。
- 需要严格外键表达路径中每个祖先关系。`path` 本质是编码字符串，数据库很难对每段 ID 都建外键。

#### 方案三：嵌套集

嵌套集给每个节点维护左右边界，子节点的边界总是落在父节点边界内。

```sql
CREATE TABLE category (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  lft INT NOT NULL,
  rgt INT NOT NULL,
  UNIQUE (lft),
  UNIQUE (rgt)
);
```

示例数据：

| id | name | lft | rgt |
| --- | --- | --- | --- |
| 1 | 电子产品 | 1 | 12 |
| 2 | 手机 | 2 | 7 |
| 3 | Android | 3 | 4 |
| 4 | iPhone | 5 | 6 |
| 5 | 电脑 | 8 | 11 |
| 6 | 笔记本 | 9 | 10 |

查询“手机”的整棵子树：

```sql
SELECT child.*
FROM category AS parent
JOIN category AS child
  ON child.lft BETWEEN parent.lft AND parent.rgt
WHERE parent.id = 2
ORDER BY child.lft;
```

查询“Android”的祖先链：

```sql
SELECT parent.*
FROM category AS child
JOIN category AS parent
  ON child.lft BETWEEN parent.lft AND parent.rgt
WHERE child.id = 3
ORDER BY parent.lft;
```

嵌套集适合：

- 树结构基本稳定。
- 子树读取非常频繁。
- 需要一次查询拿到完整层级顺序。

不适合：

- 频繁插入、删除、移动节点。因为很多节点的 `lft`、`rgt` 都要重算。
- 并发写入多的场景。边界更新范围大，容易产生锁竞争。

#### 方案四：闭包表

闭包表把“祖先和后代”的关系单独存成一张表，并记录距离。

```sql
CREATE TABLE category (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE category_closure (
  ancestor_id BIGINT NOT NULL,
  descendant_id BIGINT NOT NULL,
  depth INT NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id),
  FOREIGN KEY (ancestor_id) REFERENCES category(id),
  FOREIGN KEY (descendant_id) REFERENCES category(id)
);
```

每个节点要保存一条指向自己的记录，`depth = 0`。例如“手机”的关系会包含：

| ancestor_id | descendant_id | depth | 含义 |
| --- | --- | --- | --- |
| 2 | 2 | 0 | 手机自己 |
| 2 | 3 | 1 | 手机 -> Android |
| 2 | 4 | 1 | 手机 -> iPhone |
| 1 | 3 | 2 | 电子产品 -> Android |

查询“手机”的所有后代：

```sql
SELECT child.*
FROM category_closure AS tree
JOIN category AS child ON child.id = tree.descendant_id
WHERE tree.ancestor_id = 2
ORDER BY tree.depth, child.id;
```

查询“Android”的祖先链：

```sql
SELECT parent.*
FROM category_closure AS tree
JOIN category AS parent ON parent.id = tree.ancestor_id
WHERE tree.descendant_id = 3
ORDER BY tree.depth DESC;
```

新增“iPad”作为“电子产品”的子节点时，需要插入它自己到自己的关系，以及所有“电子产品”的祖先到它的关系：

```sql
INSERT INTO category (id, name) VALUES (7, 'iPad');

INSERT INTO category_closure (ancestor_id, descendant_id, depth)
SELECT ancestor_id, 7, depth + 1
FROM category_closure
WHERE descendant_id = 1
UNION ALL
SELECT 7, 7, 0;
```

闭包表适合：

- 经常查祖先链和后代树。
- 层级深、查询灵活。
- 希望关系能用外键保证。
- 能接受额外存储空间和写入维护成本。

不适合：

- 超大规模、频繁移动的树。移动子树时需要删除旧关系、插入新关系，变更量可能很大。
- 团队不熟悉该模型，容易写错维护 SQL。

#### 如何选择

| 方法 | 子树查询 | 祖先查询 | 插入节点 | 移动子树 | 典型场景 |
| --- | --- | --- | --- | --- | --- |
| 邻接表 | 依赖递归 | 依赖递归 | 简单 | 简单 | 部门、菜单、小型分类 |
| 路径枚举 | 简单，`LIKE 'path/%'` | 需要解析路径 | 简单 | 要批量更新路径 | 内容栏目、读多写少分类 |
| 嵌套集 | 很快 | 很快 | 较复杂 | 很复杂 | 结构稳定的目录树 |
| 闭包表 | 很快 | 很快 | 中等 | 较复杂 | 权限、组织、深层分类 |

工程经验上，不要一看到树就上复杂模型：

- 后台菜单只有两三级，用邻接表通常足够。
- 分类页经常按栏目展示全部子孙节点，可以优先考虑路径枚举或闭包表。
- 树几乎不变、读性能要求高，可以考虑嵌套集。
- 权限、组织架构这类既要查上级又要查下级，闭包表更稳。

核心：树结构没有唯一最佳方案，要按读写场景选择。

### 第 3 章 ID Required：滥用 ID 主键

反模式：所有表都无脑加 `id`，忽略业务唯一性和自然键。

问题：

- 重复数据无法被数据库约束阻止。
- 业务唯一规则只能靠代码保证。
- 数据质量长期下降。

正确做法：

- 可以使用代理主键。
- 同时必须为业务唯一字段加唯一约束。
- 关系表可以使用组合主键或唯一索引。

核心：主键解决行标识，唯一约束解决业务规则。

### 第 4 章 Keyless Entry：没有外键

反模式：为了“性能”或“开发方便”完全不建外键。

问题：

- 脏数据无法阻止。
- 删除父记录后留下孤儿数据。
- 数据关系只能靠代码约定。

正确做法：

- 核心关系使用外键或至少使用数据库约束。
- 如果高并发场景不使用外键，也要有唯一索引、状态约束、数据校验和对账任务。

核心：不要把数据一致性完全交给应用层的自觉。

### 第 5 章 Entity-Attribute-Value：实体属性值模型滥用

反模式：用 `entity_id + attribute + value` 存所有属性。

问题：

- 类型无法约束。
- 查询复杂。
- 性能差。
- 业务含义隐藏在数据里。
- 报表和统计困难。

适用场景：

- 少量动态属性。
- 表单配置。
- 扩展字段。

替代方案：

- 明确字段。
- 子表扩展。
- JSON 字段加约束。
- 搜索引擎或文档数据库。

核心：EAV 灵活，但会牺牲类型、约束、查询和可维护性。

### 第 6 章 Polymorphic Associations：多态关联

反模式：一列存目标表类型，一列存目标 ID，例如评论可以关联文章、图片、视频。

问题：

- 无法建立真实外键。
- 查询和删除规则复杂。
- 数据一致性弱。

替代方案：

- 为每种目标建立独立关联表。
- 抽象公共父表。
- 使用中间实体统一被评论对象。

核心：关系数据库擅长明确关系，不擅长靠字符串表达多态关系。

### 第 7 章 Multicolumn Attributes：多列属性

反模式：用 `phone1`、`phone2`、`phone3` 或 `tag1`、`tag2`、`tag3` 表示多个同类值。

问题：

- 数量上限固定。
- 查询困难。
- 统计困难。
- 违反范式。

正确做法：拆成子表。

```text
user
user_phone
```

核心：重复列通常意味着应该建一张明细表。

### 第 8 章 Metadata Tribbles：元数据分裂

反模式：按年份、月份、租户、状态动态创建大量结构相同的表。

问题：

- 查询需要拼表名。
- 统计跨表困难。
- 迁移脚本重复。
- 权限和索引难管理。

替代方案：

- 单表加区分字段。
- 合理分区。
- 分库分表需要明确路由和治理工具。

核心：不要用动态表名代替数据建模。

## 第二部分 物理数据库设计反模式

### 第 9 章 Rounding Errors：浮点误差

反模式：用 FLOAT / DOUBLE 存金额。

问题：二进制浮点不能精确表示十进制金额，可能出现舍入误差。

正确做法：

- 金额用 DECIMAL。
- Java 中用 BigDecimal。
- 明确精度和舍入规则。

核心：钱不能用浮点数。

### 第 10 章 Thirty-One Flavors：枚举值固定在列约束里

反模式：把可变化的业务枚举硬编码在数据库类型或约束里，导致扩展困难。

替代方案：

- 稳定枚举可以使用约束。
- 经常变化的枚举用字典表。
- 应用层枚举与数据库值要有映射和兼容策略。

核心：稳定规则用约束，变化规则用数据。

### 第 11 章 Phantom Files：文件存储混乱

反模式：数据库只存文件路径，文件系统存真实文件，但没有一致性管理。

问题：

- 数据库记录存在但文件丢失。
- 文件存在但数据库记录删除。
- 备份恢复困难。

方案：

- 小文件可考虑 BLOB，但要评估性能。
- 大文件使用对象存储，数据库存元数据。
- 删除、迁移、备份要有一致性流程。

核心：文件和数据库记录必须一起治理。

### 第 12 章 Index Shotgun：索引霰弹枪

反模式：没有索引、乱加索引或加了错误索引。

问题：

- 查询慢。
- 写入变慢。
- 索引占用空间。
- 优化器无法有效使用。

正确做法：

- 根据查询条件、排序、关联字段设计索引。
- 用执行计划验证。
- 避免低选择性字段单独建索引。
- 定期清理无用索引。

核心：索引是为查询模式服务的，不是越多越好。

## 第三部分 查询反模式

### 第 13 章 Fear of the Unknown：误解 NULL

反模式：把 NULL 当成普通值比较。

问题：

- `= NULL` 不会按预期工作。
- 三值逻辑容易导致过滤错误。

正确做法：

- 使用 `IS NULL` 和 `IS NOT NULL`。
- 能避免 NULL 的字段尽量 `NOT NULL`。
- 明确未知、无值、空字符串的区别。

核心：NULL 表示未知，不是一个普通值。

### 第 14 章 Ambiguous Groups：分组歧义

反模式：`GROUP BY` 后选择未聚合、未分组的列。

问题：查询结果不确定，不同数据库行为可能不同。

正确做法：

- SELECT 中只放分组字段或聚合结果。
- 需要明细时用窗口函数或子查询。

核心：分组查询要保证每一列语义明确。

### 第 15 章 Random Selection：随机选择低效

反模式：用 `ORDER BY RAND()` 从大表随机取数据。

问题：数据库可能需要为大量行生成随机数并排序，性能很差。

替代方案：

- 预生成随机键。
- 按 ID 范围采样。
- 使用业务侧缓存。
- 小数据集再随机排序。

核心：随机查询要避免全表随机排序。

### 第 16 章 Poor Man's Search Engine：用 LIKE 做全文搜索

反模式：大量使用 `%keyword%` 做搜索。

问题：

- 普通索引难以使用。
- 排序相关性差。
- 分词能力弱。

替代方案：

- 数据库全文索引。
- Elasticsearch / OpenSearch。
- 专门搜索服务。

核心：搜索是专门领域，不要用模糊 LIKE 硬扛复杂搜索。

### 第 17 章 Spaghetti Query：意大利面查询

反模式：一个 SQL 里塞入过多 join、子查询、条件、聚合和业务逻辑。

问题：

- 难读。
- 难调试。
- 难优化。
- 改动风险高。

替代方案：

- 拆分查询步骤。
- 使用视图或临时结果。
- 把复杂业务计算放到清晰的应用服务或数据处理层。

核心：SQL 也需要可读性和边界。

### 第 18 章 Implicit Columns：隐式列

反模式：`SELECT *` 或 INSERT 不声明列名。

问题：

- 表结构变化影响结果。
- 传输多余字段。
- ORM 映射不稳定。

正确做法：

- SELECT 明确列名。
- INSERT 明确列名。
- API 返回字段要有 DTO 控制。

核心：不要让列顺序和表结构变化决定程序行为。

## 第四部分 应用开发反模式

### 第 19 章 Readable Passwords：明文密码

反模式：存储明文密码或可逆加密密码。

正确做法：

- 使用强哈希算法。
- 加盐。
- 设置合理成本因子。
- 支持密码重置而不是找回原密码。

核心：系统不应该知道用户原始密码。

### 第 20 章 SQL Injection：SQL 注入

反模式：字符串拼接 SQL。

正确做法：

- 使用参数化查询。
- 使用 ORM 或查询构造器的绑定参数。
- 不信任任何外部输入。
- 动态排序字段使用白名单。

核心：用户输入永远不能直接拼进 SQL。

### 第 21 章 Pseudokey Neat-Freak：伪主键洁癖

反模式：为了让 ID 连续而重排、复用或修改主键。

问题：

- 外键关系破坏。
- 审计和日志失真。
- 并发下风险大。

正确做法：

- 主键只保证唯一，不保证连续。
- 删除后的 ID 不需要填补。

核心：ID 是标识，不是展示序号。

### 第 22 章 See No Evil：忽略错误

反模式：不检查 SQL 执行结果，不处理异常，不记录上下文。

正确做法：

- 检查影响行数。
- 处理唯一约束、外键约束、超时等异常。
- 日志包含业务 ID 和 SQL 上下文。

核心：数据库错误是业务状态的一部分，不能假装没发生。

### 第 23 章 Diplomatic Immunity：特殊权限

反模式：应用使用数据库超级账号连接。

问题：

- SQL 注入后破坏范围巨大。
- 误操作风险高。
- 权限边界不清。

正确做法：

- 最小权限原则。
- 读写账号分离。
- 管理账号不用于应用运行。

核心：应用账号只给它需要的权限。

### 第 24 章 Magic Beans：ORM 魔法

反模式：过度依赖 ORM，误以为不用理解 SQL 和数据库。

问题：

- N+1 查询。
- 隐式懒加载。
- 事务边界不清。
- 复杂查询性能差。

正确做法：

- 理解 ORM 生成的 SQL。
- 复杂查询可以手写 SQL。
- 用日志、执行计划和索引验证性能。

核心：ORM 是工具，不是数据库知识的替代品。

### 第 25 章 Sandboxes：沙箱环境不足

反模式：直接在生产库验证 SQL 或迁移脚本。

正确做法：

- 开发、测试、预发、生产环境隔离。
- 迁移脚本先在副本验证。
- 重要变更有备份和回滚方案。

核心：数据库变更必须可验证、可回滚、可审计。

## 后端项目落地清单

1. 金额使用 DECIMAL / BigDecimal。
2. 多值字段拆关联表。
3. 树结构按读写模式选择建模方案。
4. 核心业务唯一性用唯一约束保证。
5. 不用 `SELECT *`。
6. 动态 SQL 使用参数绑定。
7. 搜索需求不要长期依赖 `%LIKE%`。
8. 复杂 SQL 要有执行计划。
9. 应用数据库账号遵循最小权限。
10. 密码只存哈希，不存明文。
11. ORM 查询要检查 N+1。
12. 数据库变更走迁移脚本和预发验证。

## 半小时速记

| 反模式 | 一句话识别 | 推荐方案 |
| --- | --- | --- |
| 逗号分隔 | 一个字段塞多个值 | 关联表 |
| 朴素树 | 树查询越来越痛苦 | 路径、闭包表、嵌套集 |
| 滥用 ID | 只有 id 无业务唯一约束 | 唯一索引 |
| 无外键 | 数据关系靠代码记忆 | 约束或对账 |
| EAV | 什么属性都塞键值表 | 明确字段或 JSON |
| 多态关联 | type + id 指向多表 | 独立关联或抽象父表 |
| 重复列 | tag1/tag2/tag3 | 明细表 |
| 乱加索引 | 索引靠感觉 | 根据查询和执行计划设计 |
| 明文密码 | 数据库能看到原密码 | 哈希加盐 |
| SQL 注入 | 拼接外部输入 | 参数化查询 |

## 总结

《SQL 反模式》的核心价值是让你提前识别数据库设计中的长期隐患。

半小时读完后，记住这句话：

```text
数据库不是只负责存数据，它也负责表达关系、约束规则和保护一致性。
```

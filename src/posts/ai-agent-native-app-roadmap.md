---
title: AI 原生应用开发入门路线：从大模型到 Agent
date: 2026-07-20
category: AI 原生应用
tag:
  - Agent
  - AI 应用
  - RAG
  - LLM
  - 工程化
isOriginal: true
excerpt: 面向初学者梳理 AI 原生应用开发路线，解释大模型、Agent、RAG、Embedding、工具调用、记忆、评估和工程化之间的关系。
---

# AI 原生应用开发入门路线：从大模型到 Agent

AI 原生应用不是简单地“调用一个大模型接口”。真正可用的应用，通常要把模型、知识库、工具、权限、用户上下文、评估和工程化系统组合起来。

如果你希望掌握 AI 原生应用开发，可以按这条路线学习：

1. 先理解大模型能做什么，不能做什么。
2. 学会用 Prompt 把任务表达清楚。
3. 学会用 Embedding 和向量检索构建知识召回。
4. 学会用 RAG 让模型基于外部资料回答。
5. 学会用 Cross Encoder 或 reranker 提升检索结果质量。
6. 学会用 LangChain、LlamaIndex 或自建编排层组织链路。
7. 学会工具调用、工作流和 Agent 的边界。
8. 最后补齐评估、权限、日志、成本和部署。

这篇文章先给出全局地图，后面的系列文章再逐个展开。

## 什么是 AI 原生应用

传统应用通常是确定性的：用户点击按钮，后端执行固定逻辑，数据库返回结果。

AI 原生应用引入了概率模型。用户输入往往是自然语言，模型输出也不是固定模板。应用的核心能力从“执行明确指令”扩展到“理解意图、检索知识、调用工具、生成结果”。

典型 AI 原生应用包括：

- 企业知识库问答
- 智能客服
- 代码助手
- 文档总结和报告生成
- 数据分析助手
- 自动化运维助手
- 销售、法务、财务等垂直领域 Copilot
- 能调用工具完成任务的 Agent

它们共同依赖几个基础能力：模型推理、上下文组织、知识检索、工具执行、状态管理和结果评估。

## LLM 是基础，但不是完整应用

LLM，也就是 Large Language Model，大语言模型，擅长根据上下文生成文本。它可以写作、总结、翻译、解释代码、提取信息、规划步骤。

但裸模型有几个限制：

- 不知道你的私有业务数据。
- 上下文长度有限。
- 可能产生幻觉。
- 不能天然访问数据库、内部系统或文件。
- 不知道当前用户权限。
- 输出质量会受到 Prompt 和上下文质量影响。

所以 AI 应用开发的核心，不是把所有问题都丢给模型，而是给模型准备正确的信息、正确的工具和正确的约束。

可以把模型理解成一个“推理和生成引擎”，它需要被应用层调度。

## Agent 是什么

Agent 可以理解为具备一定自主性的 AI 执行单元。它不仅回答问题，还会根据目标拆解步骤、选择工具、观察工具结果，再决定下一步。

一个简单 Agent 循环通常包含：

1. 接收用户目标。
2. 理解任务并生成计划。
3. 判断是否需要调用工具。
4. 调用搜索、数据库、代码执行、HTTP API 等工具。
5. 读取工具返回结果。
6. 继续推理或修正计划。
7. 输出最终结果。

例如用户说：

```text
帮我分析最近 7 天订单下降的原因，并生成一份报告。
```

一个 Agent 可能会：

1. 查询订单数据库。
2. 查询流量数据。
3. 对比渠道转化率。
4. 调用图表工具生成趋势图。
5. 总结可能原因。
6. 输出 Markdown 或 PDF 报告。

这已经不是简单聊天，而是“模型 + 工具 + 工作流”的组合。

## Agent 和 Workflow 的区别

很多人一开始会把 Agent 用得太泛。实际上，并不是所有 AI 应用都需要 Agent。

Workflow 是预先定义好的流程：

```text
用户问题 -> 检索知识库 -> 拼接上下文 -> 调用模型 -> 返回答案
```

Agent 则允许模型动态决定步骤：

```text
用户目标 -> 模型判断需要什么 -> 调用工具 -> 观察结果 -> 再决定下一步
```

如果流程明确、风险较高、结果需要稳定，优先使用 Workflow。

如果任务开放、步骤不固定、需要多轮工具调用，可以考虑 Agent。

企业应用里常见的折中方式是“受控 Agent”：大步骤由程序固定，小步骤允许模型选择工具。

## RAG 在 AI 应用中的位置

RAG 是 Retrieval-Augmented Generation，检索增强生成。

它解决的问题是：模型不知道你的私有知识，但你又不想每次把所有文档都塞进 Prompt。

典型 RAG 流程：

1. 把文档切成小块。
2. 用 Embedding 模型把文档块变成向量。
3. 把向量存进向量数据库。
4. 用户提问时，把问题也变成向量。
5. 检索最相似的文档块。
6. 把检索结果放进 Prompt。
7. 让大模型基于上下文回答。

RAG 是很多知识库问答、客服、企业 Copilot 的基础。

但 RAG 不是银弹。一个真正可用的 RAG 系统，还要处理文档清洗、切分策略、召回质量、重排序、引用、权限过滤、更新同步和答案评估。

## Embedding 是什么

Embedding 模型会把文本转换成一组数字向量。

语义相近的文本，向量距离通常更近。例如：

```text
如何重置密码
忘记登录密码怎么办
账号密码找回流程
```

这些句子字面不同，但语义接近。Embedding 的价值就在于它可以做语义检索，而不是只做关键词匹配。

Embedding 常用于：

- 语义搜索
- RAG 文档召回
- 相似问题匹配
- 推荐系统
- 文本聚类
- 去重

理解 Embedding，是理解 RAG 的前提。

## Cross Encoder 是什么

Embedding 检索通常是“双塔模型”思路：文档提前向量化，问题也向量化，然后计算向量相似度。

这种方式速度快，适合从海量文档中召回候选结果。但它也有缺点：问题和文档是分开编码的，细粒度相关性判断不够强。

Cross Encoder 会把“问题 + 文档”一起输入模型，让模型直接判断它们是否相关。

它通常更准，但更慢。

所以工程上常用两阶段检索：

1. 用 Embedding 从海量文档中召回 Top 50 或 Top 100。
2. 用 Cross Encoder 对候选结果重新排序。
3. 取 Top 5 或 Top 10 放入 Prompt。

这就是 rerank，也叫重排序。

## LangChain 解决什么问题

LangChain 是一个 AI 应用开发框架。它提供模型调用、Prompt 模板、消息管理、工具调用、检索器、Agent、链路编排等抽象。

它的价值不是“让模型变聪明”，而是让你更快搭建应用链路。

例如一个 RAG 应用需要：

- 加载文档
- 切分文本
- 生成 Embedding
- 存入向量库
- 构建 Retriever
- 拼 Prompt
- 调模型
- 返回答案

你可以自己写，也可以用 LangChain 快速组合。

但框架不是必须的。生产项目里，很多团队会先用 LangChain 验证原型，再把核心链路抽象成自己的应用层代码，便于控制日志、权限、异常和成本。

## Transformers 解决什么问题

Transformers 通常指 Transformer 架构，也指 Hugging Face 的 `transformers` 库。

Transformer 架构是现代大模型的核心基础。它通过注意力机制处理序列信息，被广泛用于语言模型、Embedding 模型、分类模型、翻译模型、视觉语言模型等。

Hugging Face Transformers 库则提供了加载和使用模型的统一接口，例如：

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis")
result = classifier("This product is excellent.")
print(result)
```

如果你要做 AI 原生应用开发，不一定一开始就要训练模型，但至少要理解 tokenizer、模型、推理、上下文长度、batch、GPU、量化这些基础概念。

## Prompt Engineering 的位置

Prompt Engineering 是设计模型输入的能力。

一个好的 Prompt 通常会明确：

- 角色：模型以什么身份回答。
- 任务：要完成什么。
- 上下文：参考哪些资料。
- 约束：不能做什么，输出要符合什么格式。
- 示例：给出输入输出样例。
- 质量标准：如何判断答案好坏。

在 RAG 中，Prompt 还要告诉模型：

- 必须基于检索内容回答。
- 不知道就说不知道。
- 引用来源。
- 不要编造不存在的内容。

Prompt 不是玄学，它是模型应用层的接口设计。

## AI 原生应用的典型架构

一个企业知识库问答系统可以这样设计：

```text
用户
  -> 前端
  -> 后端 API
  -> 权限校验
  -> 查询改写
  -> Embedding 检索
  -> Cross Encoder 重排序
  -> Prompt 组装
  -> LLM 生成
  -> 引用与安全检查
  -> 返回答案
```

如果是 Agent 应用，还会多出工具层：

```text
LLM
  -> 工具选择
  -> 调用数据库 / 搜索 / 文件 / 内部 API
  -> 观察结果
  -> 继续推理
```

这些模块都需要工程治理。

## 初学者学习顺序

建议按下面顺序学习：

1. LLM 基础：输入、输出、token、上下文窗口、温度、结构化输出。
2. Prompt Engineering：指令、约束、示例、格式化输出。
3. Embedding：语义向量、相似度、向量库。
4. RAG：文档切分、检索、引用、评估。
5. Rerank：Cross Encoder、混合检索、重排序。
6. LangChain：链、检索器、工具、Agent。
7. Transformers：tokenizer、模型加载、本地推理。
8. Agent 工程：工具调用、状态、记忆、权限、观测。
9. 生产化：评估、日志、缓存、成本、限流、安全。

不要一开始就追求“全自动 Agent”。先做稳定的 RAG，再做受控工具调用，最后再做 Agent。

## 一个最小 AI 原生应用项目

你可以从这个项目练手：

```text
企业知识库问答系统
```

功能拆解：

1. 上传 PDF、Markdown、Word 文档。
2. 抽取文本。
3. 文档切分。
4. 生成 Embedding。
5. 存入向量数据库。
6. 用户提问。
7. 检索相关文档片段。
8. 让模型基于片段回答。
9. 显示引用来源。
10. 记录用户反馈。

进阶功能：

- Cross Encoder 重排序
- 多轮对话
- 权限过滤
- 文档增量更新
- 回答质量评估
- Agent 调用内部 API
- 异步任务和消息队列

做完这个项目，你会覆盖 AI 原生应用开发中最核心的一组能力。

## 常见误区

第一，认为模型越强，工程越不重要。实际恰恰相反，模型越强，应用边界越要设计清楚，否则风险也会变大。

第二，把 Prompt 当作全部。Prompt 很重要，但检索质量、数据权限、工具返回、评估体系同样重要。

第三，过早使用复杂 Agent。很多业务问题用固定 Workflow 更稳定、更便宜、更容易排错。

第四，只看 Demo，不做评估。AI 应用很容易在演示时看起来很好，在真实数据和真实用户下失控。

第五，忽略成本。Embedding、向量库、rerank、LLM 调用、多轮 Agent 都会产生成本，要从设计阶段考虑缓存和调用次数。

## 参考资料

- [OpenAI 文档：Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [OpenAI 文档：Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [LangChain 文档](https://python.langchain.com/docs/introduction/)
- [Hugging Face Transformers 文档](https://huggingface.co/docs/transformers/index)
- [Sentence Transformers Cross Encoder 文档](https://www.sbert.net/docs/package_reference/cross_encoder/cross_encoder.html)
- [Retrieval-Augmented Generation 论文](https://arxiv.org/abs/2005.11401)

## 总结

AI 原生应用开发的核心，是把模型能力放进一个可控、可观测、可评估的工程系统里。

LLM 负责推理和生成，Prompt 负责表达任务，Embedding 和 RAG 负责接入外部知识，Cross Encoder 负责提升检索质量，LangChain 负责快速编排，Transformers 帮助你理解和使用模型。Agent 则是在这些基础能力之上，让模型可以选择工具并完成更复杂的任务。

从学习路径上看，先掌握稳定 RAG，再掌握工具调用，最后再进入 Agent，是最稳的路线。

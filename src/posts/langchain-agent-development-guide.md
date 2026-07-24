---
title: LangChain 入门：从 Chain、Retriever 到 Agent 开发
date: 2026-07-20
category: AI 原生应用
tag:
  - LangChain
  - Agent
  - RAG
  - Tool Calling
  - AI 应用
isOriginal: true
excerpt: 介绍 LangChain 的定位、核心抽象、Prompt、Model、Retriever、Tool、Chain、Agent，以及如何用它搭建 AI 原生应用。
---

# LangChain 入门：从 Chain、Retriever 到 Agent 开发

LangChain 是一个用于构建大模型应用的开发框架。它把模型调用、Prompt、检索器、工具、Agent、输出解析、链路编排等能力抽象出来，让你可以更快搭建 AI 应用。

但要先明确一点：

> LangChain 不是模型，也不会让模型天然更聪明。它是应用编排层。

如果你要做 RAG、工具调用、Agent 原型，LangChain 可以减少很多样板代码。如果你要做严格生产系统，也应该理解它的抽象，再决定哪些部分继续使用，哪些部分收敛到自己的工程代码里。

## LangChain 适合解决什么问题

裸调用模型时，你通常会写很多重复逻辑：

- 组织 Prompt。
- 调用 Chat Model。
- 解析模型输出。
- 连接向量数据库。
- 加载和切分文档。
- 调用工具。
- 管理多轮消息。
- 记录链路执行过程。
- 在多个步骤之间传递数据。

LangChain 对这些环节提供了统一抽象。

典型用途：

- 聊天机器人
- RAG 知识库问答
- 文档总结
- 数据库问答
- 工具调用
- Agent 工作流
- 多模型编排

## 核心概念总览

你可以把 LangChain 理解成几个层次：

```text
Model：调用大模型或 Embedding 模型
Prompt：组织输入
Output Parser：解析输出
Retriever：检索相关资料
Tool：给模型可调用的外部能力
Chain：把多个步骤串起来
Agent：让模型决定下一步调用什么工具
Memory / Message History：管理对话上下文
```

这些概念不是 LangChain 独有的。即使不用 LangChain，生产 AI 应用也需要类似模块。

## Model

Model 是模型接口。常见包括：

- Chat Model：聊天和文本生成。
- Embedding Model：文本向量化。
- Local Model：本地部署模型。

伪代码：

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4.1-mini")
response = llm.invoke("用一句话解释 RAG")
print(response.content)
```

生产中要注意：

- 模型名称和版本。
- 温度参数。
- token 限制。
- 超时和重试。
- 调用成本。
- 日志脱敏。
- API Key 管理。

## Prompt Template

Prompt Template 用于把变量填入提示词。

示例：

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是企业知识库助手，只能根据资料回答。"),
    ("human", "资料：{context}\n\n问题：{question}")
])
```

好处是：

- Prompt 可复用。
- 变量清晰。
- 方便测试不同版本。
- 适合与链路组合。

不要把 Prompt 零散写在业务代码各处。建议集中管理并版本化。

## Output Parser

模型默认输出文本，但应用经常需要结构化结果。

例如你希望模型返回：

```json
{
  "answer": "可以报销，但需要提供发票。",
  "citations": ["finance-policy-001"],
  "confidence": "medium"
}
```

Output Parser 可以把模型输出解析成结构化对象。

生产中更推荐使用模型支持的结构化输出能力，或者用 JSON Schema 约束输出，再进行后端校验。

注意：不要完全相信模型返回的 JSON。仍然要做解析异常处理和字段校验。

## Retriever

Retriever 是检索器。它根据用户问题返回相关文档。

RAG 中，Retriever 是核心组件。

典型流程：

```python
retrieved_docs = retriever.invoke(question)
```

Retriever 后面可以接：

- 向量数据库
- 关键词搜索
- 混合检索
- 权限过滤
- reranker

你可以把 Retriever 理解成“根据问题找上下文”的统一接口。

## Chain

Chain 是把多个步骤串起来。

一个简单 RAG Chain：

```text
question
  -> retriever
  -> format documents
  -> prompt
  -> llm
  -> output parser
```

这种流程明确、稳定、容易测试。

很多业务场景不需要 Agent，用 Chain 就够了。例如：

- 知识库问答
- 固定格式报告生成
- 文档摘要
- 邮件分类
- 合同条款提取

优先用 Chain 解决确定性流程，再考虑 Agent。

## Tool

Tool 是模型可以调用的外部能力。

例如：

- 查询订单
- 查询库存
- 搜索网页
- 执行 SQL
- 调用内部 HTTP API
- 读取文件
- 发送邮件

一个工具应该有清晰的名称、说明和参数 schema。

示例思路：

```python
from langchain_core.tools import tool

@tool
def get_order_status(order_id: str) -> str:
    """查询订单支付和发货状态。"""
    return order_service.query(order_id)
```

工具设计重点：

- 工具名要清楚。
- 描述要告诉模型何时使用。
- 参数要结构化。
- 返回值要简洁。
- 后端必须做权限校验。
- 高风险工具要有人类确认。

不要把危险能力无约束暴露给 Agent。

## Agent

Agent 的特点是：模型可以根据任务选择工具，并决定下一步。

典型循环：

```text
用户目标
  -> 模型思考下一步
  -> 选择工具
  -> 调用工具
  -> 观察结果
  -> 再决定下一步
  -> 输出结果
```

适合 Agent 的任务：

- 步骤不固定。
- 需要多工具组合。
- 需要根据中间结果调整计划。
- 用户目标比较开放。

不适合 Agent 的任务：

- 高风险交易。
- 强合规审批。
- 流程非常固定。
- 需要严格确定性的批处理。

生产中建议使用受控 Agent：工具白名单、最大步数、超时、权限、审计日志、危险操作确认。

## LangChain 与 RAG

用 LangChain 做 RAG，通常分几步。

第一，加载文档：

```python
documents = loader.load()
```

第二，切分文档：

```python
splits = text_splitter.split_documents(documents)
```

第三，生成 Embedding 并写入向量库：

```python
vectorstore = Chroma.from_documents(splits, embedding_model)
```

第四，创建 retriever：

```python
retriever = vectorstore.as_retriever(search_kwargs={"k": 6})
```

第五，组装问答链：

```python
context = retriever.invoke(question)
answer = llm.invoke(prompt.format(context=context, question=question))
```

真实项目中，你还要加权限过滤、rerank、引用、错误处理和日志。

## LangChain 的优势

优点：

- 原型开发快。
- 抽象覆盖常见 AI 应用模式。
- 集成大量模型和向量库。
- 适合学习 RAG、Tool、Agent 的基本形态。
- 社区资料多。

对初学者来说，LangChain 是理解 AI 应用编排的好工具。

## LangChain 的风险

风险也很现实：

- 抽象层较多，排错时要理解内部链路。
- 版本变化可能影响代码。
- Demo 很容易，生产治理仍然要自己做。
- Agent 示例容易让人低估权限和安全风险。

建议：

1. 用 LangChain 快速验证想法。
2. 学会它的核心抽象。
3. 生产项目中把关键链路封装成自己的服务。
4. 不要把业务规则藏在难以追踪的链里。

## 一个推荐项目结构

```text
app/
  ai/
    models.py
    prompts/
      rag_answer.txt
      query_rewrite.txt
    retrievers/
      document_retriever.py
      rerank_retriever.py
    tools/
      order_tool.py
      user_tool.py
    chains/
      rag_chain.py
      summary_chain.py
    agents/
      support_agent.py
    evaluation/
      rag_eval.py
```

这样可以避免 AI 逻辑散落在 Controller 或接口函数里。

## 生产 Checklist

使用 LangChain 做应用时，至少检查：

1. Prompt 是否版本化。
2. 模型调用是否有超时和重试。
3. API Key 是否安全管理。
4. 用户输入是否记录并脱敏。
5. 检索结果是否有权限过滤。
6. Agent 工具是否有白名单。
7. 高风险工具是否需要确认。
8. 输出是否做结构化校验。
9. 是否记录 token、延迟和成本。
10. 是否有评估集。

## 参考资料

- [LangChain 官方文档](https://python.langchain.com/docs/introduction/)
- [LangChain RAG 教程](https://python.langchain.com/docs/tutorials/rag/)
- [LangChain Concepts](https://python.langchain.com/docs/concepts/)
- [LangChain Tool Calling 概念](https://python.langchain.com/docs/concepts/tool_calling/)
- [LangChain Agents 教程](https://python.langchain.com/docs/tutorials/agents/)

## 总结

LangChain 的价值是应用编排。它帮助你把 Prompt、Model、Retriever、Tool、Chain、Agent 组合起来。

初学者可以用 LangChain 快速理解 AI 应用的结构。进入生产阶段，要把权限、日志、评估、异常、成本和业务规则纳入自己的工程体系。不要为了使用 Agent 而使用 Agent，流程明确的任务优先用 Chain，开放任务再考虑受控 Agent。

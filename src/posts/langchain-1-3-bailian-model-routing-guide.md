---
title: LangChain 1.3 到旧版本更新梳理：接入阿里百炼、模型调用和动态模型选择
date: 2026-07-27
category: AI 原生应用
tag:
  - LangChain
  - 阿里百炼
  - DashScope
  - Qwen
  - LLM
  - Tool Calling
isOriginal: true
excerpt: 按 LangChain 1.3.x 的新写法梳理版本变化、模型调用、阿里百炼 OpenAI 兼容模式接入、Models 调用和运行时动态切换模型。
---

# LangChain 1.3 到旧版本更新梳理：接入阿里百炼、模型调用和动态模型选择

本文按 2026-07-27 的公开资料整理。当前 Python 生态里的 `langchain` 主包最新版本是 `1.3.14`，这篇文章以 1.3.x 的写法为主，同时对比 1.0 以前的常见旧写法。

先给结论：

- 新项目优先使用 `langchain` 1.3.x、`langchain-core`、`langchain-openai` 和 `langgraph` 这套新体系。
- 接阿里百炼最稳妥的方式是使用 DashScope 的 OpenAI 兼容模式，把百炼当成一个 OpenAI 兼容服务。
- 固定模型调用用 `init_chat_model()` 或 `ChatOpenAI()`。
- 动态模型调用用 `configurable` 或 LangGraph middleware，根据用户、任务、成本、上下文长度选择模型。
- 旧版 Chain、LLMChain、AgentExecutor 能读懂即可，新代码尽量写 LCEL 或 LangGraph。

## 版本变化怎么理解

LangChain 早期把很多东西放在一个大包里。后来逐步拆成：

```text
langchain-core        # 核心接口：Runnable、Message、Prompt、Tool、Output Parser
langchain             # 常用链路、Agent、入口 API
langchain-community   # 社区集成
langchain-openai      # OpenAI 兼容模型集成
langgraph             # Agent 和状态图编排
```

### 1.3.x

1.3.x 是 1.x 之后继续稳定新架构的版本线。写代码时最重要的变化不是某一个小 API，而是思路变了：

- 模型统一走 `ChatModel` 接口。
- 链路优先用 Runnable 管道：`prompt | model | parser`。
- Agent 推荐用 LangGraph，方便控制状态、节点、工具调用和中断。
- 模型可以通过 `init_chat_model()` 创建，也可以运行时通过配置切换。
- 结构化输出、工具调用、流式事件和可观测性比 0.x 更统一。

### 1.2.x

1.2.x 继续强化模型调用和工具调用体验，重点是让不同模型供应商的差异更容易被抽象出来。项目代码里要避免把某个厂商的特殊字段散落在业务层，建议封装到 `model_factory.py` 或 `model_registry.py`。

### 1.1.x

1.1.x 开始能明显感受到 1.x 的稳定抽象：模型 profile、标准内容块、结构化输出、工具 schema 的行为更清晰。对业务项目来说，这意味着你可以把“模型是谁”从“业务流程怎么跑”里拆开。

### 1.0.x

1.0 是一个分水岭。它把 Agent、Model、Tool、Middleware、Runnable 的边界重新整理了一遍。旧代码里常见的 `LLMChain`、`initialize_agent` 还能在迁移资料里见到，但新项目不要围绕这些 API 继续扩展。

### 0.3.x 和更早

0.3 之前的教程很多会这样写：

```python
from langchain.chains import LLMChain

chain = LLMChain(llm=llm, prompt=prompt)
result = chain.run(question)
```

新写法更推荐：

```python
chain = prompt | llm | parser
result = chain.invoke({"question": question})
```

区别很直接：旧写法像调用一个封装好的黑盒，新写法像把多个可组合步骤接成管道，更容易插入日志、重试、分支、批处理和流式输出。

## 安装依赖

如果你只需要通过阿里百炼调用 Qwen 模型，最少安装：

```bash
pip install -U langchain langchain-openai
```

如果还要使用阿里 DashScope SDK 或旧版 `ChatTongyi` 集成，可以补充：

```bash
pip install -U dashscope langchain-community
```

配置环境变量：

```bash
set DASHSCOPE_API_KEY=sk-你的百炼APIKey
```

Linux 或 macOS：

```bash
export DASHSCOPE_API_KEY=sk-你的百炼APIKey
```

不要把 API Key 写进代码仓库。

## 阿里百炼平台准备步骤

1. 登录阿里云百炼控制台。
2. 开通模型服务。
3. 创建 API Key。
4. 确认要调用的模型名称，例如 `qwen-turbo`、`qwen-plus`、`qwen-max`、`qwen3-coder-plus`。
5. 如果走 OpenAI 兼容模式，base URL 使用：

```text
https://dashscope.aliyuncs.com/compatible-mode/v1
```

这一步很关键。LangChain 的 `langchain-openai` 不关心背后是不是真 OpenAI，只要服务实现 OpenAI 兼容接口，就可以用同一套 `ChatOpenAI` 客户端调用。

## 固定模型调用方式一：init_chat_model

`init_chat_model()` 是 LangChain 1.x 推荐的通用入口。适合业务代码里不想直接绑定具体模型类的场景。

```python
import os

from langchain.chat_models import init_chat_model

llm = init_chat_model(
    "qwen-plus",
    model_provider="openai",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    temperature=0.3,
)

response = llm.invoke("用一句话解释 Spring Boot 自动配置")
print(response.content)
```

这里的 `model_provider="openai"` 表示使用 OpenAI 兼容客户端，不表示模型来自 OpenAI。

## 固定模型调用方式二：ChatOpenAI

如果项目明确只走 OpenAI 兼容接口，直接用 `ChatOpenAI` 更直观。

```python
import os

from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="qwen-plus",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    temperature=0.3,
    timeout=30,
    max_retries=2,
)

answer = llm.invoke([
    ("system", "你是一个严谨的 Java 技术助手。"),
    ("human", "解释 @SpringBootApplication 由哪些能力组成。"),
])

print(answer.content)
```

生产项目建议显式设置：

- `temperature`
- `timeout`
- `max_retries`
- `max_tokens`
- 日志脱敏
- 调用成本记录

## 用 Prompt、Model、Parser 组装 Chain

LangChain 1.x 的日常业务链路通常这样写：

```python
import os

from langchain.chat_models import init_chat_model
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

llm = init_chat_model(
    "qwen-plus",
    model_provider="openai",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是企业内部知识库助手，只能根据给定资料回答。"),
    ("human", "资料：\n{context}\n\n问题：{question}"),
])

chain = prompt | llm | StrOutputParser()

result = chain.invoke({
    "context": "Spring Boot Starter 会帮你聚合常用依赖。",
    "question": "starter 的作用是什么？",
})

print(result)
```

这段代码分三层：

- `Prompt` 负责把变量组织成模型输入。
- `Model` 负责调用百炼上的 Qwen 模型。
- `Parser` 负责把模型消息变成业务需要的字符串。

如果以后要接 RAG，只需要把 `context` 换成检索器返回的文档内容。

## 结构化输出

业务系统经常不想要一大段自然语言，而是想要 JSON。可以用 Pydantic 定义 schema：

```python
from typing import Literal

from pydantic import BaseModel, Field


class ReviewResult(BaseModel):
    summary: str = Field(description="一句话摘要")
    risk_level: Literal["low", "medium", "high"] = Field(description="风险等级")
    suggestions: list[str] = Field(description="修改建议")


structured_llm = llm.with_structured_output(ReviewResult)

result = structured_llm.invoke("这段代码直接拼接 SQL 查询用户输入，有什么风险？")
print(result.risk_level)
print(result.suggestions)
```

注意：结构化输出仍然需要后端校验。模型返回得像 JSON，不代表它就是可信数据。

## 工具调用

工具调用适合“模型需要查询外部系统”的场景，例如查订单、查库存、查数据库。

```python
from langchain_core.tools import tool


@tool
def get_order_status(order_id: str) -> str:
    """根据订单号查询订单状态。"""
    return "已支付，待发货"


llm_with_tools = llm.bind_tools([get_order_status])

response = llm_with_tools.invoke("帮我查一下订单 A20260727001 的状态")
print(response.tool_calls)
```

工具设计要克制：

- 工具名清楚。
- 参数结构化。
- 描述写明什么时候用。
- 后端做权限校验。
- 写操作需要二次确认。
- 不把任意 SQL、任意 shell 直接暴露给模型。

## 动态模型调用方式一：运行时配置模型

如果你的系统希望普通问题用便宜模型，复杂问题用强模型，可以把模型名称作为运行时配置传入。

```python
import os

from langchain.chat_models import init_chat_model

configurable_llm = init_chat_model(
    model_provider="openai",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    temperature=0.2,
)

response = configurable_llm.invoke(
    "给我一个 Spring Boot 4 和 3 的升级差异摘要",
    config={
        "configurable": {
            "model": "qwen-plus",
            "model_provider": "openai",
        }
    },
)

print(response.content)
```

这个方式适合：

- 管理后台让用户选择模型。
- 不同租户使用不同模型。
- A/B 测试模型效果。
- 根据成本策略临时切换模型。

建议业务层只传业务语义，例如 `quality="fast"` 或 `quality="best"`，不要让前端直接传任意模型名。后端再映射到白名单：

```python
MODEL_POLICY = {
    "fast": "qwen-turbo",
    "balanced": "qwen-plus",
    "best": "qwen-max",
}
```

## 动态模型调用方式二：模型工厂

更工程化的写法是封装一个模型工厂。

```python
import os

from langchain_openai import ChatOpenAI


MODEL_REGISTRY = {
    "fast": "qwen-turbo",
    "balanced": "qwen-plus",
    "best": "qwen-max",
}


def create_bailian_model(profile: str = "balanced") -> ChatOpenAI:
    model_name = MODEL_REGISTRY.get(profile, MODEL_REGISTRY["balanced"])
    return ChatOpenAI(
        model=model_name,
        api_key=os.environ["DASHSCOPE_API_KEY"],
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        temperature=0.2,
        timeout=30,
        max_retries=2,
    )


llm = create_bailian_model("fast")
print(llm.invoke("用 50 字解释 RAG").content)
```

这种方式最容易接入你自己的权限、审计、成本和租户策略。

## 动态模型调用方式三：Agent Middleware

Agent 场景里，模型选择可能取决于会话长度、任务类型、用户等级、工具调用次数。LangChain 1.x 推荐用 middleware 控制。

```python
import os

from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, ModelResponse, wrap_model_call
from langchain_openai import ChatOpenAI


def bailian_model(model: str) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        api_key=os.environ["DASHSCOPE_API_KEY"],
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        temperature=0.2,
    )


fast_model = bailian_model("qwen-turbo")
strong_model = bailian_model("qwen-plus")


@wrap_model_call
def dynamic_model_selection(request: ModelRequest, handler) -> ModelResponse:
    message_count = len(request.state["messages"])

    if message_count > 8:
        model = strong_model
    else:
        model = fast_model

    return handler(request.override(model=model))


agent = create_agent(
    model=fast_model,
    tools=[],
    middleware=[dynamic_model_selection],
)

result = agent.invoke({
    "messages": [
        {"role": "user", "content": "帮我设计一个 Spring Boot 订单模块结构"}
    ]
})

print(result["messages"][-1].content)
```

这个模式比在 Controller 里写一堆 `if else` 更清晰，因为模型选择是 Agent 执行链路的一部分，可以和日志、限流、成本统计放在一起。

## RAG 场景里的模型分工

一个真实 RAG 系统通常不只用一个模型：

```text
用户问题
  -> qwen-turbo 做 query rewrite
  -> embedding 模型做向量检索
  -> rerank 模型重排
  -> qwen-plus 生成答案
  -> qwen-turbo 做答案格式清理
```

推荐策略：

- 改写、分类、格式化：用便宜快模型。
- 最终回答、复杂推理：用较强模型。
- 高价值用户或高风险任务：提高模型等级。
- 超出预算时：降级模型或缩短上下文。

## 常见问题

### 1. 连接失败

检查：

- `DASHSCOPE_API_KEY` 是否配置。
- base URL 是否是 OpenAI 兼容模式地址。
- 模型名称是否在百炼控制台可用。
- 账号是否开通对应模型服务。

### 2. `model_provider` 写什么

走 `langchain-openai` 的 OpenAI 兼容模式时写 `openai`。它表示使用 OpenAI 协议客户端。

### 3. 旧版 `LLMChain` 要不要迁移

新功能建议迁移。迁移方式通常是：

```python
old_chain = LLMChain(llm=llm, prompt=prompt)
```

改为：

```python
new_chain = prompt | llm | parser
```

### 4. 动态模型能不能让前端随便传

不要。前端可以传 `fast`、`balanced`、`best` 这种业务档位，后端用白名单映射到真实模型名。

## 推荐项目结构

```text
app/
  ai/
    model_factory.py
    model_policy.py
    prompts/
      rag_answer.md
      query_rewrite.md
    chains/
      rag_chain.py
      classify_chain.py
    agents/
      support_agent.py
    tools/
      order_tools.py
    telemetry/
      callbacks.py
```

不要把模型创建、Prompt、工具定义和 Controller 混在一起。AI 应用发展到后面，真正难维护的不是调用模型，而是策略、提示词、评估、成本和权限。

## 生产 Checklist

1. API Key 放环境变量或密钥管理系统。
2. 模型名走白名单。
3. 每次调用记录模型、token、耗时、错误码。
4. 对外部工具做权限校验。
5. 写操作加人工确认或二次确认。
6. RAG 检索结果做租户和权限过滤。
7. 结构化输出做后端 schema 校验。
8. 为高频链路准备评估集。
9. 对长上下文设置预算。
10. 明确降级策略，例如 `qwen-plus` 失败后降到 `qwen-turbo`。

## 参考资料

- [LangChain PyPI 项目页](https://pypi.org/project/langchain/)
- [LangChain v1 发布说明](https://docs.langchain.com/oss/python/releases/langchain-v1)
- [LangChain Changelog](https://docs.langchain.com/oss/python/releases/changelog)
- [LangChain Models 文档](https://docs.langchain.com/oss/python/langchain/models)
- [LangChain init_chat_model API](https://reference.langchain.com/python/langchain/chat_models/base/init_chat_model)
- [阿里云百炼：通过 LangChain 调用百炼](https://help.aliyun.com/zh/model-studio/use-bailian-in-langchain)
- [阿里云百炼 OpenAI Chat 接口兼容](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)

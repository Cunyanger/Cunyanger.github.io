---
title: Transformers 入门：理解现代大模型的基础组件
date: 2026-07-20
category: AI 原生应用
tag:
  - Transformers
  - Hugging Face
  - LLM
  - Tokenizer
  - 深度学习
isOriginal: true
excerpt: 面向 AI 应用开发者介绍 Transformer 架构、Hugging Face Transformers 库、Tokenizer、模型加载、推理、上下文长度和本地部署基础。
---

# Transformers 入门：理解现代大模型的基础组件

学习 AI 原生应用开发，不一定要从训练大模型开始。但你至少要理解模型是如何接收文本、如何生成结果、为什么有上下文长度、为什么推理需要 GPU、为什么同一个 Prompt 换模型会表现不同。

Transformers 这个词有两层含义：

1. Transformer 架构：现代大语言模型的重要基础。
2. Hugging Face Transformers 库：加载和使用模型的常用 Python 库。

这篇文章面向应用开发者，不深入推导数学公式，而是解释你在开发中真正会遇到的概念。

## Transformer 架构解决什么问题

语言是一种序列。模型要理解一句话，就要理解词与词之间的关系。

例如：

```text
小王把报告发给小李，因为他明天要汇报。
```

这里的“他”可能指小李，也可能指小王，要结合上下文判断。

Transformer 的核心能力之一是注意力机制。它让模型在处理某个 token 时，可以关注上下文中与它相关的其他 token。

现代 LLM、Embedding 模型、翻译模型、文本分类模型、代码模型，大多都与 Transformer 架构有关。

## Token 是什么

模型不是直接处理字符或单词，而是处理 token。

Tokenizer 会把文本切成 token，并把 token 转成数字 ID。

例如：

```text
我喜欢 AI 应用开发
```

可能被切成：

```text
["我", "喜欢", "AI", "应用", "开发"]
```

真实 tokenizer 的切分更复杂，英文单词可能被拆成子词，中文也可能按字、词或混合方式切分。

为什么 token 重要？

- 模型上下文窗口按 token 计算。
- API 费用通常按 token 计算。
- 文本过长会被截断。
- Prompt、检索内容、输出都消耗 token。

AI 应用开发要经常估算 token。

## 上下文窗口

上下文窗口是模型一次能处理的最大 token 数。

它包括：

- system prompt
- 对话历史
- 检索资料
- 用户问题
- 工具返回
- 模型输出

如果上下文超限，应用必须裁剪、摘要或重新检索。

RAG 的价值之一，就是不用把全部文档都放进上下文，而是只放最相关片段。

## Hugging Face Transformers 库

Hugging Face Transformers 提供了统一接口，用来加载 tokenizer、模型和 pipeline。

最简单的 pipeline 示例：

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis")
result = classifier("This product is excellent.")
print(result)
```

pipeline 适合快速体验任务，例如：

- 文本分类
- 文本生成
- 翻译
- 摘要
- 问答
- 命名实体识别

生产中通常会更明确地加载 tokenizer 和 model。

## AutoTokenizer 和 AutoModel

Hugging Face 提供了 Auto 系列类，根据模型名称自动选择合适实现。

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_name = "distilbert-base-uncased-finetuned-sst-2-english"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

inputs = tokenizer("This product is excellent.", return_tensors="pt")
outputs = model(**inputs)
```

关键点：

- tokenizer 必须和模型匹配。
- `from_pretrained` 会加载模型权重和配置。
- 不同任务要选择不同 `AutoModelFor...`。

常见模型类：

- `AutoModelForCausalLM`：文本生成。
- `AutoModelForSeq2SeqLM`：翻译、摘要等序列到序列任务。
- `AutoModelForSequenceClassification`：文本分类。
- `AutoModel`：获取基础隐藏状态，常用于自定义任务。

## 推理和训练

应用开发中多数时候做的是推理，也就是使用训练好的模型生成结果。

训练是更新模型参数。它成本高，需要数据、GPU、训练框架和评估。

两者区别：

```text
推理：输入文本 -> 模型 -> 输出结果
训练：输入数据和标签 -> 更新模型参数
```

大多数 AI 原生应用不需要一开始训练模型。先通过 Prompt、RAG、工具调用解决问题，只有当通用模型无法满足稳定需求时，再考虑微调或训练。

## 本地模型推理要考虑什么

如果你要本地部署模型，要考虑：

- 显存大小。
- 模型参数量。
- 量化方式。
- 并发数。
- 最大上下文长度。
- 推理框架。
- 首 token 延迟和生成速度。
- 模型许可证。

模型越大不一定越适合你的应用。很多企业场景更看重稳定、成本、隐私和可控性。

## 量化是什么

模型参数通常是浮点数。量化是用更低精度表示参数，例如从 FP16 降到 INT8 或 INT4。

量化好处：

- 降低显存占用。
- 提高部署可行性。
- 可能提升推理速度。

代价：

- 可能降低模型质量。
- 不同任务受影响程度不同。
- 需要测试。

如果只是调用云模型 API，可以先不用关心量化。如果要私有化部署，就必须理解。

## Embedding 模型也是 Transformer 吗

很多 Embedding 模型也基于 Transformer。

区别在于输出目标不同。

LLM 主要生成文本：

```text
输入上下文 -> 生成下一个 token
```

Embedding 模型主要生成向量：

```text
输入文本 -> 输出语义向量
```

Cross Encoder 也通常基于 Transformer：

```text
输入 query + document -> 输出相关性分数
```

所以理解 tokenizer、输入长度、模型推理，对 Embedding、RAG 和 rerank 都有帮助。

## Transformer 与 LangChain 的关系

Transformers 是模型层。LangChain 是应用编排层。

可以这样理解：

```text
Transformers：如何加载和运行模型
LangChain：如何把模型、Prompt、检索器、工具组织成应用
RAG：一种应用模式
Agent：一种更动态的应用模式
```

你可以用 LangChain 调用云模型，也可以通过 Transformers 加载本地模型，再接入自己的应用。

## 常见开发问题

问题一：为什么模型输出很慢？

可能是模型太大、硬件不足、输出太长、batch 不合理、没有使用合适推理框架。

问题二：为什么输入长文档报错？

超过模型上下文长度。需要切分、摘要或 RAG。

问题三：为什么中文效果不好？

模型可能主要面向英文训练，或 tokenizer 对中文不友好。应选择中文或多语言模型。

问题四：为什么同一个 Prompt 换模型结果不同？

模型训练数据、指令对齐、上下文长度、解码参数都不同。Prompt 不具备跨模型完全一致性。

## 应用开发者要掌握的最小知识

你不需要一开始掌握全部深度学习细节，但至少要懂：

1. token 和 tokenizer。
2. 上下文窗口。
3. 模型类型和任务类型。
4. 推理与训练区别。
5. Embedding、LLM、Cross Encoder 的不同输出。
6. 本地部署的显存和延迟约束。
7. 模型版本和许可证。

这些知识能帮助你判断一个 AI 应用方案是否现实。

## 参考资料

- [Hugging Face Transformers 官方文档](https://huggingface.co/docs/transformers/index)
- [Hugging Face Transformers Pipeline 教程](https://huggingface.co/docs/transformers/pipeline_tutorial)
- [Hugging Face Auto Classes 文档](https://huggingface.co/docs/transformers/model_doc/auto)
- [Attention Is All You Need 论文](https://arxiv.org/abs/1706.03762)

## 总结

Transformer 是现代大模型的重要基础，Hugging Face Transformers 是使用模型的常用工具库。

作为 AI 原生应用开发者，你不必先成为模型训练专家，但必须理解 token、上下文窗口、模型类型、推理成本和本地部署约束。这样你才能正确设计 RAG、Agent、Embedding 检索和模型调用链路。

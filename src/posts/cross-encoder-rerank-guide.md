---
title: Cross Encoder 与 Rerank 入门：提升 RAG 检索质量
date: 2026-07-20
category: AI 原生应用
tag:
  - Cross Encoder
  - Rerank
  - RAG
  - Embedding
  - 信息检索
isOriginal: true
excerpt: 解释 Cross Encoder 的原理、它和 Embedding 双塔模型的区别，以及如何在 RAG 中用 rerank 提升检索相关性。
---

# Cross Encoder 与 Rerank 入门：提升 RAG 检索质量

很多 RAG 系统的失败，不是大模型回答能力不行，而是检索出来的上下文不够好。

用户问：

```text
员工试用期请病假会影响转正吗？
```

向量检索可能召回：

- 请假制度
- 转正流程
- 考勤异常处理
- 病假工资说明
- 试用期管理办法

这些都相关，但真正最有用的可能只有其中一两段。Cross Encoder 和 rerank 的价值，就是在召回之后再次精排，把最相关的片段排到前面。

## 先理解双塔 Embedding 检索

Embedding 检索通常是双塔结构。

文档侧：

```text
document -> embedding model -> document vector
```

查询侧：

```text
query -> embedding model -> query vector
```

然后用向量相似度比较：

```text
similarity(query_vector, document_vector)
```

这种方式最大优点是快。文档向量可以提前计算，用户提问时只需要计算问题向量，再做向量搜索。

缺点是问题和文档是分别编码的，模型没有在编码阶段同时看到二者，所以对细粒度匹配的判断有限。

## Cross Encoder 是什么

Cross Encoder 会把查询和文档一起输入模型：

```text
[query, document] -> cross encoder -> relevance score
```

它直接输出相关性分数。

因为模型同时看到了 query 和 document，所以能更细致地判断：

- 这段文档是否真正回答了问题。
- 文档里是否只有关键词重合但语义无关。
- 问题里的限定条件是否被满足。
- 多个相似候选中哪一个更贴近用户意图。

代价是慢。每个候选都要单独跑一次模型，不能像向量检索那样提前把所有文档都编码好。

## 为什么不能只用 Cross Encoder

假设知识库有 100 万个 chunk。用户每问一个问题，如果用 Cross Encoder 对 100 万个 chunk 逐个打分，成本和延迟都不可接受。

所以 Cross Encoder 通常不负责全量召回，而是负责候选重排序。

标准做法：

```text
Embedding 检索 Top 50
  -> Cross Encoder 重新打分
  -> 取 Top 5
  -> 交给 LLM
```

Embedding 负责“快而广”，Cross Encoder 负责“慢而准”。

## Rerank 的完整流程

一个典型 RAG rerank 流程：

1. 用户提问。
2. 用 Embedding 模型生成 query vector。
3. 向量数据库召回 Top 50。
4. 把每个候选 chunk 与 query 组成 pair。
5. Cross Encoder 给每个 pair 打相关性分。
6. 按分数重新排序。
7. 取 Top 5 或 Top 8。
8. 放入 Prompt。
9. LLM 生成答案。

伪代码：

```python
query = "员工试用期请病假会影响转正吗？"

candidates = vector_store.search(query, top_k=50)

pairs = [(query, item.text) for item in candidates]
scores = cross_encoder.predict(pairs)

reranked = sorted(
    zip(candidates, scores),
    key=lambda item: item[1],
    reverse=True
)

context = [item.text for item, score in reranked[:5]]
answer = llm.generate(build_prompt(query, context))
```

这比直接把 Top 5 向量结果交给 LLM 更稳。

## Cross Encoder 和 Bi Encoder 的区别

Bi Encoder，也就是双塔模型，通常用于 Embedding。

特点：

- 查询和文档分别编码。
- 文档向量可以提前计算。
- 检索速度快。
- 适合大规模召回。
- 相关性判断相对粗。

Cross Encoder：

- 查询和文档一起编码。
- 不能提前计算文档最终分数。
- 速度慢。
- 适合小规模候选精排。
- 相关性判断更细。

可以用表格理解：

```text
能力              Bi Encoder / Embedding    Cross Encoder
---------------------------------------------------------
全量检索          适合                      不适合
候选重排序        可用但较弱                适合
速度              快                        慢
精度              中等                      通常更高
是否预计算文档    可以                      不可以
典型位置          召回阶段                  精排阶段
```

## 什么时候需要 Rerank

并不是所有 RAG 都必须加 rerank。

适合加 rerank 的场景：

- 知识库文档很多。
- 用户问题复杂。
- 检索 Top K 经常混入无关内容。
- 多个候选片段看起来都相似。
- 答案质量对上下文排序很敏感。
- 需要提高引用准确性。
- 你已经有检索评估集，希望进一步提升命中率。

可以先上线基础 RAG，再通过日志观察用户问题和召回结果。如果发现召回结果“有相关内容但排序不够靠前”，rerank 通常有效。

## Rerank 的参数怎么选

常见配置：

```text
向量召回 top_k: 30 到 100
rerank 后保留 top_n: 5 到 10
```

如果知识库小，可以召回 20。知识库大或问题复杂，可以召回 50 到 100。

但 top_k 越大，rerank 成本越高。因为 Cross Encoder 要对每个候选打分。

建议用评估集比较：

```text
top_k=20, top_n=5
top_k=50, top_n=5
top_k=100, top_n=8
```

观察命中率、答案质量、延迟和成本。

## Rerank 与混合检索

Rerank 可以和混合检索结合。

先做两路召回：

```text
向量检索 Top 50
关键词 BM25 Top 50
```

合并去重后：

```text
候选集合 -> Cross Encoder -> Top 5
```

这种方式对错误码、编号、API 名称、专业术语很有帮助。

例如：

```text
E2031 支付失败如何处理？
```

关键词检索能确保 `E2031` 相关文档被召回，Cross Encoder 再判断哪些片段真正解释处理方法。

## Cross Encoder 的输入长度限制

Cross Encoder 也有上下文长度限制。候选 chunk 太长会被截断，影响排序效果。

建议：

- 控制 chunk 长度。
- 对长文档先切分再 rerank。
- 把标题和章节信息拼到 chunk 前面。
- 避免把多个无关主题放进同一个 chunk。

例如 rerank 输入可以这样构造：

```text
标题：试用期管理办法
章节：请假与转正
正文：试用期员工请病假...
```

这样比只输入正文更容易判断上下文。

## 使用 Sentence Transformers CrossEncoder

Python 示例：

```python
from sentence_transformers import CrossEncoder

model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

query = "How do I reset my password?"
documents = [
    "To reset your password, click Forgot Password on the login page.",
    "You can update your billing address in account settings.",
]

pairs = [(query, doc) for doc in documents]
scores = model.predict(pairs)

for doc, score in sorted(zip(documents, scores), key=lambda x: x[1], reverse=True):
    print(score, doc)
```

这个例子演示的是英文模型。中文场景要选择适合中文或多语言的 reranker。

## 使用 LLM 做 Rerank 可以吗

可以，但要谨慎。

LLM rerank 的做法是把 query 和多个候选片段交给大模型，让它判断排序。优点是灵活，缺点是成本高、延迟高、输出稳定性需要控制。

适合：

- 候选数量很少。
- 问题复杂。
- 需要解释排序原因。
- 对延迟不敏感。

不适合：

- 高频在线检索。
- 每次候选很多。
- 对毫秒级响应有要求。

工程上常见选择是专门的 reranker 模型，而不是通用 LLM。

## Rerank 后如何构造 Prompt

不要把 rerank 分数直接暴露给用户。分数用于内部排序即可。

Prompt 中可以保留来源：

```text
资料 1：
标题：试用期管理办法
来源：HR-Policy-2026
内容：...

资料 2：
标题：请假制度
来源：Leave-Policy-2026
内容：...
```

并要求模型引用来源：

```text
请基于资料回答，并在答案末尾列出引用来源。
```

如果候选片段相关性分数都很低，可以选择拒答或提示“没有找到足够相关资料”。

## 如何评估 Rerank 是否有效

准备一批问题和标准文档：

```text
问题 -> 应该命中的 chunk 或文档
```

比较 rerank 前后：

- 正确 chunk 是否进入 Top 5。
- 正确 chunk 排名是否上升。
- LLM 答案是否更准确。
- 引用是否更准确。
- 平均延迟增加多少。
- 成本是否可接受。

如果 rerank 后答案没有提升，可能原因是：

- 初始召回没有把正确文档召回。
- Cross Encoder 模型不适合语言或领域。
- chunk 切分太差。
- query 改写有问题。
- 标准答案和文档本身不一致。

Rerank 只能重排候选，不能凭空找回没有召回的文档。

## 常见坑

第一，向量召回 Top K 太小。正确文档没进候选集，rerank 没机会发挥作用。

第二，候选 chunk 太长。Cross Encoder 输入被截断，相关性判断失真。

第三，模型语言不匹配。英文 reranker 用在中文知识库上效果可能不稳定。

第四，不做去重。向量检索和关键词检索合并后，重复内容会挤占 Prompt 空间。

第五，忽略延迟。Cross Encoder 是额外模型调用，要做超时、缓存和降级。

## 生产建议

可以把检索链路设计成可配置：

```yaml
rag:
  retrieval:
    vectorTopK: 50
    keywordTopK: 30
    rerankEnabled: true
    rerankTopN: 6
```

并记录日志：

```json
{
  "query": "员工试用期请病假会影响转正吗？",
  "vectorTopK": 50,
  "rerankTopN": 6,
  "selectedDocs": [
    {"docId": "hr-001", "score": 0.92},
    {"docId": "leave-002", "score": 0.86}
  ],
  "latencyMs": 380
}
```

这些日志对排查 RAG 质量很关键。

## 参考资料

- [Sentence Transformers CrossEncoder 文档](https://www.sbert.net/docs/package_reference/cross_encoder/cross_encoder.html)
- [Sentence Transformers Retrieve & Re-Rank 示例](https://www.sbert.net/examples/applications/retrieve_rerank/README.html)
- [LangChain 文档：Retrievers](https://python.langchain.com/docs/concepts/retrievers/)
- [OpenAI 文档：Embeddings](https://platform.openai.com/docs/guides/embeddings)

## 总结

Embedding 检索适合从海量文档中快速召回候选，Cross Encoder 适合对少量候选做精细相关性判断。

RAG 中常见的高质量链路是：向量检索和关键词检索召回候选，再用 Cross Encoder rerank，最后把最相关片段交给 LLM。掌握 rerank 后，你就能从“能搜到一些内容”的 RAG，进一步走向“稳定命中关键上下文”的 RAG。

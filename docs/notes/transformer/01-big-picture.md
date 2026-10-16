# 第一章：Transformer 全貌

> 本章定位：建立整体结构和术语关系。暂不深入推导 Attention、RoPE、KV Cache 的细节，先确保后续章节中的每个名词都有位置可放。

## 1. 本章学习目标

完成本章后，应能够：

- 画出一段文本经过 Decoder-only Transformer 的主要路径；
- 区分 Encoder-only、Encoder-Decoder、Decoder-only 三种架构；
- 说清楚 Transformer Block 中 Attention、FFN、Residual、Normalization 的职责；
- 解释训练阶段为什么可以并行，生成阶段为什么通常逐 token 进行；
- 说明现代 GPT 类模型和原始 Transformer 论文结构之间的关系；
- 根据论文 Figure 1 找到 Encoder、Decoder、Mask、Embedding 和输出层的位置。

## 2. 一句话定义

**Transformer 是一种以 Attention 为核心、可以重复堆叠的序列建模网络。**

这里有三个关键词：

| 关键词 | 含义 |
| --- | --- |
| Attention | 在序列位置之间动态交换信息 |
| 序列建模 | 根据一串 token 的上下文构造表示或生成后续 token |
| 堆叠 | 将多个相似的 Block 串联，使表示逐层变得更丰富 |

需要避免一个常见误解：Transformer 不等于 Attention。完整的 Transformer Block 通常还包括前馈网络、残差连接和归一化。

## 3. 原始论文中的整体结构

论文：**[Attention Is All You Need](https://arxiv.org/abs/1706.03762)**，Vaswani et al., 2017。

原论文提出的是 **Encoder–Decoder Transformer**，不是今天 GPT 类模型使用的完整 Decoder-only 结构。

![论文 Figure 1：Transformer 模型架构](../../assets/papers/transformer-figure-1.png){ .paper-figure }

> 图 1 来源：Vaswani et al., *Attention Is All You Need*, Figure 1。这里使用论文原图。阅读时先关注数据流和模块位置，不要一开始试图记住全部细节。

### 3.1 图中左侧：Encoder

Encoder 的作用是：

```text
输入序列 → 上下文表示
```

原论文中的一个 Encoder layer 包含：

1. Multi-Head Self-Attention；
2. Feed-Forward Network；
3. 每个子层外的 Residual Connection 和 Layer Normalization。

Encoder 的 Self-Attention 通常可以访问输入序列中的双向上下文，因此适合构造整段输入的表示。

### 3.2 图中右侧：Decoder

Decoder 的作用是：

```text
已有输出 + Encoder 表示 → 下一个输出 token
```

原论文中的一个 Decoder layer 比 Encoder 多一个子层：

1. Masked Multi-Head Self-Attention；
2. Encoder–Decoder Attention，也叫 Cross-Attention；
3. Feed-Forward Network；
4. 每个子层外的 Residual Connection 和 Layer Normalization。

其中 Mask 的作用是防止当前位置读取未来的输出 token。

### 3.3 图的顶部：输出概率

Decoder 最后的隐藏状态经过：

```text
Linear → Softmax → 输出 token 概率
```

严格来说，模型首先产生的是 **logits**，再经过 softmax 得到概率分布。实际生成时，还要经过 greedy、sampling、top-k、top-p 等解码策略。

## 4. 一段文本进入模型后的路径

以 Decoder-only LLM 为例，整体过程可以记成：

```text
原始文本
  ↓
Tokenizer
  ↓
token ids
  ↓
Token Embedding
  ↓
位置表示 / RoPE
  ↓
多个 Transformer Block
  ↓
最后一层隐藏状态
  ↓
Linear / LM Head
  ↓
词表上的 logits
  ↓
解码策略
  ↓
下一个 token
```

### 4.1 Tokenizer

模型不能直接处理字符串。Tokenizer 将文本切分为 token，并将 token 映射为整数 id。

```text
文本：The capital of France is
Token：The | capital | of | France | is
ID：   101 | 2398   | 310 | 9821   | ...
```

实际切分通常是子词级别，一个单词可能被切成多个 token。

Tokenizer 会影响：

- 同一段文本占用多少上下文长度；
- 中英文、代码、数学符号的表示效率；
- 词表大小和 embedding 参数量；
- 训练与推理成本。

### 4.2 Embedding

Token id 只是整数索引，不是有语义的连续表示。Embedding 层把每个 id 映射为一个向量。

若序列长度为 `T`，隐藏维度为 `d_model`，则输入表示可以写成：

```text
X ∈ R^(T × d_model)
```

对于现代模型，还要把位置信息加入或作用到这些表示上。

### 4.3 Transformer Blocks

输入表示依次通过 `N` 个 Transformer Block。每一层都会：

- 让不同位置之间交换信息；
- 对每个位置做非线性变换；
- 通过残差路径保留已有信息；
- 通过归一化帮助训练稳定。

随着层数增加，隐藏状态通常能够编码更复杂的上下文关系，但不能简单理解成“第一层学词义、第二层学语法、第三层学知识”。真实模型中的功能分工通常是分布式和重叠的。

### 4.4 LM Head

最后一层隐藏状态的维度通常是 `d_model`。LM Head 将它投影到词表大小 `V`：

```text
hidden state ∈ R^(d_model)
        ↓ Linear
logits ∈ R^(V)
```

如果序列长度为 `T`，训练时常见的 logits 形状是：

```text
logits ∈ R^(B × T × V)
```

其中：

- `B`：batch size；
- `T`：序列长度；
- `V`：词表大小。

## 5. Transformer Block 的组成

原始论文中的 Block 可以抽象为：

```text
输入 X
  ↓
Multi-Head Self-Attention
  ↓
Residual + Normalization
  ↓
Feed-Forward Network
  ↓
Residual + Normalization
  ↓
输出 H
```

不同模型在 Normalization 的位置和具体组件上可能不同，所以阅读代码时需要确认实际实现。

### 5.1 Self-Attention：位置之间交换信息

Self-Attention 的输入、输出都对应一组位置表示。它的核心作用是：

> 对当前位置而言，根据当前输入动态决定应该从哪些位置读取多少信息。

例如句子中出现代词时，模型可能需要参考前文的实体；代码中出现变量名时，模型可能需要参考更早的位置。

后续章节会单独展开：

- Query、Key、Value；
- `QK^T` 的相似度计算；
- 缩放因子 `sqrt(d_k)`；
- Softmax 权重；
- Causal Mask；
- Multi-Head 的并行子空间。

### 5.2 Feed-Forward Network：位置内的非线性变换

Attention 负责位置之间的信息交互，FFN 主要对每个位置的表示独立进行变换。

可以用下面的学习笔记来区分：

```text
Attention：从其他位置读取信息
FFN：对当前位置的表示进行加工
```

传统形式可以抽象为：

```text
FFN(x) = W2 σ(W1 x + b1) + b2
```

现代 LLM 常使用 SwiGLU 等变体，具体形式在后续章节讨论。

### 5.3 Residual Connection：保留已有表示

残差连接的基本形式是：

```text
x_next = x + F(x)
```

它的主要作用：

- 为信息和梯度提供较短路径；
- 让子层学习“在已有表示上需要增加什么变化”；
- 支持更深的网络堆叠。

### 5.4 Normalization：稳定数值分布

归一化用于控制隐藏状态的数值尺度，帮助深层网络训练。

常见形式：

- LayerNorm；
- RMSNorm。

还需要区分：

| 结构 | Normalization 的位置 |
| --- | --- |
| Post-Norm | 子层输出经过残差后再归一化 |
| Pre-Norm | 子层输入先归一化，再进入子层 |

许多现代 LLM 使用 Pre-Norm 或其变体，但不能只根据模型名称推断，应该查看具体源码或配置。

## 6. 三种常见 Transformer 架构

### 6.1 Encoder-only

代表：BERT。

```text
输入文本 → Encoder stack → 双向上下文表示 → 分类 / 抽取 / 向量
```

特点：

- 一个位置可以使用左右两侧上下文；
- 常用 Masked Language Modeling 进行预训练；
- 更适合理解型任务，而不是直接自回归生成长文本。

### 6.2 Encoder–Decoder

代表：原始 Transformer、T5。

```text
源序列 → Encoder → 中间表示
目标前缀 → Decoder + Cross-Attention → 下一个目标 token
```

特点：

- Encoder 负责读取输入；
- Decoder 负责生成输出；
- Decoder 通过 Cross-Attention 使用 Encoder 表示；
- 适合翻译、摘要、文本到文本等输入输出边界清晰的任务。

### 6.3 Decoder-only

代表：GPT 类模型以及许多现代通用 LLM。

```text
上下文前缀 → Causal Self-Attention → 下一个 token
```

特点：

- 只能读取当前位置及其左侧 token；
- 训练目标通常是 next-token prediction；
- 问答、翻译、代码、推理都可以统一为文本续写问题；
- 生成时自然采用自回归方式。

### 6.4 对比表

| 维度 | Encoder-only | Encoder–Decoder | Decoder-only |
| --- | --- | --- | --- |
| 主要表示 | 双向输入表示 | 输入表示 + 输出生成 | 单向上下文表示 |
| 典型任务 | 分类、匹配、抽取 | 翻译、摘要、转换 | 续写、问答、代码、推理 |
| 典型预训练目标 | Masked LM | Seq2Seq | Next-token prediction |
| 是否使用 Causal Mask | 通常不使用 | Decoder 使用 | 使用 |
| 是否有 Cross-Attention | 没有 | 有 | 通常没有 |
| 代表模型 | BERT | T5、原始 Transformer | GPT 类模型 |

## 7. 为什么现代 LLM 多采用 Decoder-only

这里不能写成“Decoder-only 一定更好”。更准确的学习结论是：

> Decoder-only 将不同任务统一成“给定前缀，预测下一个 token”，适合大规模文本预训练和通用生成。

例如：

```text
问答：问题：Transformer 是什么？回答：
翻译：Translate Chinese to English: 注意力机制
代码：def fibonacci(n):
推理：题目：如果...，答案：
```

这些输入在模型看来都只是 token 序列。训练目标仍然可以是预测后续 token。

代价：

- 生成阶段通常是逐 token 进行；
- 长上下文会增加 Attention 计算和 KV Cache 显存；
- 模型输出概率分布，不等于直接输出可靠事实；
- 训练目标统一，不代表所有任务都能被同样准确地解决。

## 8. 原始论文 Figure 2：Attention 组件位置

![论文 Figure 2：Scaled Dot-Product Attention 与 Multi-Head Attention](../../assets/papers/transformer-figure-2.png){ .paper-figure }

> 图 2 来源：Vaswani et al., *Attention Is All You Need*, Figure 2。论文原图展示了 Scaled Dot-Product Attention 和 Multi-Head Attention。这里先记住它们是 Transformer Block 中的 Attention 子层，详细推导放在下一章。

图 2 的阅读顺序：

```text
Q、K → MatMul → Scale → Mask（可选）→ Softmax
V → 与权重 MatMul → Attention 输出
```

Multi-Head Attention 则是：

```text
输入
  ↓
多个不同的线性投影
  ↓
多个 Attention head 并行计算
  ↓
Concat
  ↓
Linear
```

## 9. 训练阶段和生成阶段

### 9.1 训练阶段

训练数据可以是完整序列：

```text
输入：The capital of France is Paris .
目标：capital of France is Paris . <eos>
```

通过错位，模型在每个位置预测下一个 token。Causal Mask 保证第 `t` 个位置不能读取未来位置的信息。

训练时可以一次处理整个序列，因此 Attention 矩阵可以并行计算。

### 9.2 生成阶段

生成时，模型只能使用已经存在的前缀：

```text
The capital of France is
        ↓
Paris
        ↓
.
```

每产生一个新 token，就把它加入上下文，再预测下一个 token。

这形成了重要区别：

| 阶段 | 输入情况 | 计算特点 |
| --- | --- | --- |
| 训练 | 通常已知完整序列 | 可并行计算多个位置 |
| 生成 | 未来 token 未知 | 通常逐 token 计算 |

KV Cache 就是针对生成阶段重复计算问题的优化，后续单独学习。

## 10. 现代 LLM 中常见的结构改进

| 组件 | 主要解决的问题 | 与 Transformer 的关系 |
| --- | --- | --- |
| RoPE | 表示位置信息 | 作用于 Attention 中的 Q/K |
| RMSNorm | 稳定隐藏状态 | 替代或改造 LayerNorm |
| SwiGLU | 提升 FFN 表达能力 | FFN 的结构变体 |
| GQA / MQA | 降低 K/V Cache 开销 | Attention 的头部结构变体 |
| MoE | 在扩大参数量时控制激活计算 | FFN / Block 的稀疏化变体 |
| KV Cache | 避免生成时重复计算历史 K/V | 推理阶段的缓存机制 |

这些不是与 Transformer 无关的新模块，而是围绕 Transformer 主体的结构改进或推理优化。

## 11. 论文阅读记录

### 必读

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)：原始 Transformer 架构。

### 用于对照架构

- [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](https://arxiv.org/abs/1810.04805)：Encoder-only 和双向上下文。
- [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)：Decoder-only 模型规模化与 few-shot 能力。

### 后续章节材料

- [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)：RoPE。
- [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202)：SwiGLU 等 FFN 变体。

## 12. 易错点清单

- [ ] Transformer 不等于 Attention，Block 还包括 FFN、Residual、Normalization。
- [ ] 原始论文是 Encoder–Decoder，不是 GPT 的 Decoder-only。
- [ ] Decoder-only 的 Decoder 没有原始 Encoder–Decoder 结构中的 Cross-Attention。
- [ ] 训练阶段可以并行，不代表生成阶段也可以完全并行。
- [ ] 模型输出首先是 logits / 概率分布，不是直接得到一个完整答案。
- [ ] 参数量增加不等于事实可靠性一定增加。
- [ ] RoPE、RMSNorm、SwiGLU、GQA 是现代模型常见改进，不是原始论文中全部都有。

## 13. 复习卡片

### 问：Transformer 的核心计算单元是什么？

答：以 Attention 为核心，结合 FFN、Residual Connection 和 Normalization 的 Transformer Block。

### 问：Encoder-only 和 Decoder-only 的根本区别是什么？

答：Encoder-only 通常使用双向上下文构造输入表示；Decoder-only 使用 Causal Mask，只根据左侧上下文预测下一个 token。

### 问：为什么训练可以并行而生成不能直接并行？

答：训练时目标序列已知，可以一次计算所有位置；生成时后续 token 未知，前一个 token 的结果会影响后续预测。

### 问：原始 Transformer Figure 1 中 Decoder 比 Encoder 多了什么？

答：Decoder 多了 Encoder–Decoder Attention，也叫 Cross-Attention；同时使用 Masked Self-Attention 防止读取未来输出。

### 问：Attention 和 FFN 分别做什么？

答：Attention 负责不同位置之间的信息交互；FFN 负责对每个位置的表示进行非线性变换。

## 14. 本章总结

用下面这段话检查自己是否真正理解了本章：

> 文本先经过 Tokenizer 变成 token ids，再通过 Embedding 得到向量表示，并加入位置信息。表示经过多层 Transformer Block；每个 Block 通过 Attention 进行位置间的信息交互，通过 FFN 做位置内的非线性变换，并利用 Residual 和 Normalization 支持稳定的深层训练。Decoder-only LLM 在 Causal Mask 下学习 next-token prediction，训练时可以并行处理已知序列，生成时通常逐 token 进行。

如果这段话中的每个名词都能解释，下一章进入 **Token、Tokenizer 与 Embedding**；如果不能，建议先根据第 12 节易错点和第 13 节复习卡片回看原图。

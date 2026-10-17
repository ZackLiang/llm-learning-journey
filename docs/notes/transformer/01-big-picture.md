# 第一章 Transformer 架构与核心组件

> 参考主线：Vaswani et al., *Attention Is All You Need*。本章把 Transformer 作为一个完整的网络结构来学习，重点记录各个模块的作用、公式、张量形状、模块之间的连接方式，以及现代大语言模型对原始结构做出的改造。

## 1. Transformer 的整体计算流程

Transformer 是一种用于序列建模的神经网络架构。它最初用于机器翻译，后来成为 BERT、GPT、T5、Llama、Qwen、DeepSeek 等模型的重要基础。

从输入到输出，可以先记住下面这条主线：

```text
文本
  ↓
Tokenizer
  ↓
token ids
  ↓
Token Embedding
  ↓
Position Information
  ↓
多个 Transformer Blocks
  ↓
Hidden States
  ↓
Linear / LM Head
  ↓
Logits
  ↓
解码策略
  ↓
输出 token
```

Transformer 不是一个单独的 Attention 层。一个完整的 Transformer Block 通常包括：

```text
Attention
+ Feed-Forward Network
+ Residual Connection
+ Normalization
```

功能上可以先这样区分：

```text
Attention：不同 token 之间的信息交换
FFN：单个 token 表示内部的非线性特征变换
Residual：保留信息并提供直接的梯度路径
Normalization：稳定隐藏状态的数值尺度
```

### 1.1 各阶段的张量变化

设：

```text
B：batch size
T：sequence length
D：hidden size / d_model
V：vocabulary size
H：attention head 数量
Dh：单个 head 的维度
```

| 阶段 | 输入形状 | 输出形状 | 主要作用 |
| --- | --- | --- | --- |
| Tokenizer | 字符串 | token ids | 将文本离散化 |
| Embedding | `[B, T]` | `[B, T, D]` | 将 token id 映射为向量 |
| Position | `[B, T, D]` | `[B, T, D]` | 注入顺序信息 |
| Attention | `[B, T, D]` | `[B, T, D]` | token 间信息交互 |
| FFN | `[B, T, D]` | `[B, T, D]` | token 内部特征变换 |
| Transformer Block | `[B, T, D]` | `[B, T, D]` | 完成一层表示更新 |
| LM Head | `[B, T, D]` | `[B, T, V]` | 映射到词表 logits |

Attention 内部会进行多头拆分：

```text
[B, T, D]
    ↓ reshape
[B, T, H, Dh]
    ↓ transpose
[B, H, T, Dh]
    ↓ attention
[B, H, T, Dh]
    ↓ merge heads
[B, T, D]
```

通常满足：

```text
D = H × Dh
```

### 1.2 Transformer 相比 RNN 的变化

RNN 的计算依赖前一个时间步：

```text
h_t = f(x_t, h_(t-1))
```

因此：

- 时间步之间存在顺序依赖；
- 训练时难以充分并行；
- 长距离信息需要经过多次 hidden state 传递。

Transformer 使用 Attention，让序列中的位置能够直接建立关系：

```text
任意位置 i  ↔  任意位置 j
```

优势：

- 训练阶段适合矩阵并行；
- 长距离信息的路径更短；
- 结构容易扩展到更大的数据量和参数量。

代价：

- 标准 Self-Attention 的计算和序列长度平方相关；
- 长上下文会带来较大的显存和计算压力；
- 生成阶段仍然通常是逐 token 的自回归计算。

## 2. 原始 Transformer 架构

原始论文提出的是 Encoder–Decoder Transformer，主要用于序列到序列任务，例如机器翻译。

论文原图：

![Transformer 原始论文 Figure 1：模型架构](../../assets/papers/transformer-figure-1.png){ .paper-figure }

> 来源：Vaswani et al., *Attention Is All You Need*, Figure 1。原论文：[arXiv:1706.03762](https://arxiv.org/abs/1706.03762)。图中左侧是 Encoder stack，右侧是 Decoder stack。

### 2.1 阅读 Figure 1 的顺序

建议按照以下顺序看图：

```text
1. 看 Inputs 和 Outputs shifted right
2. 区分 Encoder stack 和 Decoder stack
3. 查看一个 Encoder Layer
4. 查看一个 Decoder Layer
5. 找到 Decoder 多出来的 Cross-Attention
6. 查看 Linear + Softmax 输出
```

原始结构的数据流：

```text
输入序列
  ↓
Input Embedding + Positional Encoding
  ↓
Encoder Stack
  ↓
Encoder 表示
  ↓
Decoder Stack
  ↓
Linear
  ↓
Softmax
  ↓
输出概率
```

Decoder 同时接收两类信息：

```text
1. 已经生成的目标序列
2. Encoder 对输入序列产生的表示
```

### 2.2 Encoder Stack

Encoder 由多个相同的 Encoder Layer 堆叠而成。原论文的 Base 配置使用：

```text
N = 6
```

`N=6` 是论文实验配置，不是 Transformer 的固定结构。

一个 Encoder Layer 包含：

```text
Multi-Head Self-Attention
        ↓
Add & Norm
        ↓
Feed-Forward Network
        ↓
Add & Norm
```

Encoder 的 Self-Attention 通常允许一个位置查看完整输入序列，因此得到的是双向上下文表示。

### 2.3 Decoder Stack

一个 Decoder Layer 比 Encoder Layer 多一个 Cross-Attention：

```text
Masked Multi-Head Self-Attention
        ↓
Add & Norm
        ↓
Encoder-Decoder Attention
        ↓
Add & Norm
        ↓
Feed-Forward Network
        ↓
Add & Norm
```

三种子层的作用：

| 子层 | 作用 |
| --- | --- |
| Masked Self-Attention | 查看已经生成的目标 token，不能查看未来 token |
| Cross-Attention | 读取 Encoder 对输入序列的表示 |
| FFN | 对当前位置的表示进行非线性变换 |

### 2.4 Self-Attention 和 Cross-Attention

| Attention 类型 | Query 来源 | Key / Value 来源 | 典型用途 |
| --- | --- | --- | --- |
| Self-Attention | 当前序列 | 当前序列 | 序列内部信息交互 |
| Cross-Attention | Decoder | Encoder 输出 | Decoder 读取输入 |

Decoder-only LLM 通常没有原始 Encoder–Decoder 结构中的 Cross-Attention。

## 3. Tokenizer、Embedding 与位置信息

### 3.1 Tokenizer

模型不能直接接收字符串。Tokenizer 将文本切分为 token，并将 token 映射为整数 id。

```text
文本：The capital of France is

Token：The | capital | of | France | is

ID：   101 | 2398   | 310 | 9821   | ...
```

实际 tokenizer 通常是子词级别。一个人类词可能对应一个 token，也可能对应多个 token。

Tokenizer 会影响：

- 同一段文本占用的 token 数量；
- 上下文窗口的有效容量；
- 训练和推理成本；
- 中文、英文、代码、数学符号的编码效率；
- 词表大小和 Embedding 参数量。

常见 tokenizer 思路：

| 类型 | 基本特点 |
| --- | --- |
| Character-level | 一个字符一个单位，序列长，词表小 |
| Word-level | 一个单词一个单位，未登录词处理困难 |
| Subword-level | 在字符和单词之间折中，现代 LLM 常用 |
| BPE | 通过频率合并子词片段 |
| WordPiece | 使用似然或得分选择子词合并 |
| SentencePiece | 直接对原始字符串进行子词建模，不依赖空格切词 |

### 3.2 Token Embedding

Token id 只是参数矩阵的行索引，不是有语义的连续数值。

Embedding 参数矩阵：

```text
E ∈ R^(V × D)
```

对于 token id `i`：

```text
embedding_i = E[i]
```

如果：

```text
input_ids.shape = [B, T]
```

那么：

```text
embedding_output.shape = [B, T, D]
```

Embedding lookup 本质上是查表，也可以理解为对 one-hot 向量执行线性映射，但工程实现通常不会真的构造完整的 one-hot 矩阵。

### 3.3 为什么需要位置信息

Attention 本身不天然知道顺序。

```text
猫追老鼠
老鼠追猫
```

两句话包含相同 token，但顺序不同，含义也不同。因此模型需要将顺序信息注入隐藏状态或 Attention 计算中。

常见方案：

| 方法 | 位置如何加入 | 典型使用 |
| --- | --- | --- |
| Sinusoidal | 加到 Embedding 上 | 原始 Transformer |
| Learned Absolute Position | 学习位置向量并相加 | 早期 BERT / GPT |
| RoPE | 对 Q/K 做旋转 | 许多现代 LLM |
| ALiBi | 在 Attention score 中加位置偏置 | 部分长上下文模型 |

本章只记录位置信息在整体结构中的位置。RoPE 的公式、旋转矩阵和上下文扩展放在 Attention 专题中详细说明。

## 4. Q、K、V 与 Self-Attention

### 4.1 Attention 的作用

Attention 解决的问题：

> 当前 token 应该从序列中的哪些 token 读取信息，以及读取多少？

例如：

```text
The animal didn't cross the street because it was tired.
```

模型处理 `it` 时，可能需要参考前面的 `animal`。Attention 根据输入内容动态计算位置之间的关联权重。

### 4.2 Q、K、V 的来源

输入隐藏状态记为：

```text
X ∈ R^(T × D)
```

通过三个可学习的线性投影得到：

```text
Q = XW_Q
K = XW_K
V = XW_V
```

Q、K、V 都来自隐藏状态，但投影参数不同，因此形成不同的表示空间。

| 向量 | 学习中的直觉 |
| --- | --- |
| Query | 当前 token 想寻找什么信息 |
| Key | 当前 token 能否与某个查询匹配 |
| Value | 当前 token 被读取时提供的实际内容 |

Q/K/V 不是固定的“问题、索引、答案”三个语义标签，它们本质上是为了完成 Attention 计算而学习出来的不同线性投影。

### 4.3 Scaled Dot-Product Attention

论文 Figure 2：

![Transformer 原始论文 Figure 2：Scaled Dot-Product Attention 与 Multi-Head Attention](../../assets/papers/transformer-figure-2.png){ .paper-figure }

> 来源：Vaswani et al., *Attention Is All You Need*, Figure 2。左侧是 Scaled Dot-Product Attention，右侧是 Multi-Head Attention。

公式：

```text
Attention(Q, K, V)
= softmax(QKᵀ / √d_k)V
```

计算步骤：

```text
1. QKᵀ：计算 Query 与 Key 的匹配分数
2. 除以 √d_k：控制点积的数值尺度
3. 加 Mask：屏蔽不允许读取的位置
4. Softmax：将分数转换为归一化权重
5. 与 V 相乘：对 Value 进行加权聚合
```

如果：

```text
Q.shape = [T_q, d_k]
K.shape = [T_k, d_k]
V.shape = [T_k, d_v]
```

则：

```text
QKᵀ.shape          = [T_q, T_k]
attention.shape     = [T_q, T_k]
output.shape        = [T_q, d_v]
```

多头形式下：

```text
Q: [B, H, T_q, D_h]
K: [B, H, T_k, D_h]
V: [B, H, T_k, D_h]

QKᵀ: [B, H, T_q, T_k]
输出: [B, H, T_q, D_h]
```

### 4.4 为什么要除以 `√d_k`

假设 Query 和 Key 的每个分量独立、均值为 0、方差为 1，则点积：

```text
q · k = Σ(q_i k_i)
```

点积的方差会随着 `d_k` 增大。如果不进行缩放，score 的绝对值可能变得很大，Softmax 容易进入饱和区：

```text
某一个位置的概率接近 1
其他位置的概率接近 0
```

这会使梯度变小，训练过程更加困难。因此使用：

```text
QKᵀ / √d_k
```

控制 score 的尺度。

### 4.5 为什么 V 不参与 score 计算

`QKᵀ` 负责计算“应该关注谁”，因此需要 Query 和 Key 的匹配关系。

`V` 负责提供“被关注后传递什么内容”。

可以分成两步：

```text
Q、K → 计算注意力权重
V    → 按照权重聚合内容
```

如果让 V 参与匹配分数，匹配关系和被传递的内容会混在一起，不再符合 Attention 中“先决定读取权重，再聚合 Value”的结构。

## 5. Multi-Head Attention

### 5.1 作用

Multi-Head Attention 将输入投影到多个不同子空间，并行计算多个 Attention。

```text
输入 X
  ↓
different linear projections
  ↓
Head 1 / Head 2 / ... / Head H
  ↓
独立 Attention
  ↓
Concat
  ↓
Output Projection
```

设：

```text
D：模型隐藏维度
H：head 数量
D_h：单个 head 维度
```

通常：

```text
D = H × D_h
```

张量变化：

```text
[B, T, D]
  ↓ reshape
[B, T, H, D_h]
  ↓ transpose
[B, H, T, D_h]
  ↓ attention
[B, H, T, D_h]
  ↓ transpose + reshape
[B, T, D]
  ↓ output projection
[B, T, D]
```

### 5.2 为什么需要多个 Head

单个 Head 只能在一个投影空间中计算关系。多个 Head 允许模型在不同子空间中建立不同类型的关系。

例如不同 Head 可能更容易捕捉：

- 局部相邻关系；
- 远距离依赖；
- 代词与实体关系；
- 代码括号或变量关系；
- 语法结构；
- 位置模式。

不能把每个 Head 永远固定解释为某种语言学功能。实际模型中的信息通常是分布式的。

### 5.3 为什么还需要 Concat 和 Output Projection

每个 Head 产生一个 `[B, T, D_h]` 的结果。多个 Head 拼接后得到：

```text
[B, T, H × D_h] = [B, T, D]
```

Concat 只是把多个子空间结果放到一起，Output Projection 负责学习如何重新混合这些 Head 的信息：

```text
Concat(head_1, ..., head_H)W_O
```

## 6. Causal Mask 与 Padding Mask

### 6.1 Causal Mask

Causal Mask 解决：

```text
当前位置不能读取未来 token
```

长度为 4 的下三角 Mask：

```text
1 0 0 0
1 1 0 0
1 1 1 0
1 1 1 1
```

实现时，通常将不允许读取的位置加上负无穷：

```text
score[future_position] = -∞
```

Softmax 后，这些位置的权重接近 0。

### 6.2 Padding Mask

一个 batch 中的序列通常需要补齐到相同长度：

```text
序列 A：我 喜欢 机器 学习
序列 B：我 喜欢 <pad> <pad>
```

Padding Mask 用于防止模型关注 `<pad>` 位置。

### 6.3 两种 Mask 的区别

| Mask | 解决的问题 | 典型使用 |
| --- | --- | --- |
| Causal Mask | 防止当前位置看到未来 | Decoder / Decoder-only |
| Padding Mask | 防止关注补齐位置 | 变长 batch |
| Attention Mask | 工程中对 mask 的统称或接口 | 具体框架实现 |

在实际模型中，Causal Mask 和 Padding Mask 可能会被合并成一个最终的 Attention Mask。

## 7. FFN 与 SwiGLU

### 7.1 FFN 的作用

Attention 层完成 token 之间的信息交换，FFN 层完成单个 token 内部的非线性特征变换。

```text
Attention：token 间信息交换
FFN：token 内部特征增强
```

FFN 本质上是两层 MLP：

```text
升维
→ 激活函数
→ 降维
```

### 7.2 传统 FFN 公式

如果使用行向量约定：

```text
FFN(x) = σ(xW₁ + b₁)W₂ + b₂
```

如果使用列向量约定：

```text
FFN(x) = W₂σ(W₁x + b₁) + b₂
```

设：

```text
x  : [B, T, D]
W₁ : [D, D_ff]
W₂ : [D_ff, D]
```

张量变化：

```text
[B, T, D]
  ↓ W₁
[B, T, D_ff]
  ↓ activation
[B, T, D_ff]
  ↓ W₂
[B, T, D]
```

升维的作用是在更大的特征空间中进行非线性变换；最后降维回 `D`，这样才能与残差分支相加。

### 7.3 SwiGLU

现代大模型经常用 SwiGLU 等门控 FFN 替代简单的 ReLU FFN。

一种常见形式：

```text
SwiGLU(x) = (SiLU(xW_gate) ⊙ xW_up)W_down
```

其中：

- `xW_gate`：门控分支；
- `SiLU`：生成平滑门控权重；
- `xW_up`：值分支；
- `⊙`：逐元素 Hadamard 乘法；
- `W_down`：降维投影。

结构：

```text
输入 x
 ├─ Linear → SiLU ─┐
 └─ Linear ────────┤→ Hadamard Product → Linear
```

SwiGLU 的直觉是：

```text
门控分支决定哪些特征被保留
值分支提供被筛选的特征
```

它不是简单地把 ReLU 换成 SiLU，而是引入了两路投影和逐元素门控。

### 7.4 激活函数对比

| 激活函数 | 特点 |
| --- | --- |
| ReLU | 形式简单，负数区域输出为 0 |
| GELU | 平滑，BERT 等模型中常见 |
| SiLU / Swish | 平滑，常用于门控结构 |
| SwiGLU | SiLU 与门控前馈结构结合 |

## 8. 残差连接

### 8.1 公式

```text
y = x + F(x)
```

在 Transformer 中，`F(x)` 可以是 Attention 子层或 FFN 子层。

### 8.2 前向传播和反向传播

前向传播时：

```text
原始特征可以沿跳跃路径保留
```

反向传播时：

```text
dy/dx = 1 + dF(x)/dx
```

其中的 `1` 提供了一条直接的梯度路径。

主要作用：

- 保留输入信息；
- 让子层学习相对于输入的增量变化；
- 为梯度提供更直接的传播路径；
- 支持很多 Transformer Layer 进行堆叠。

残差连接能够缓解深层优化困难，但不能单独保证梯度永远稳定。学习率、初始化、Normalization 和残差缩放也会产生影响。

## 9. LayerNorm、RMSNorm、Pre-Norm 与 Post-Norm

### 9.1 LayerNorm

对于单个 token 的隐藏向量：

```text
x = [x₁, x₂, ..., x_D]
```

LayerNorm 在最后一个 hidden dimension 上计算均值和方差：

```text
μ = 1/D Σx_i
σ² = 1/D Σ(x_i - μ)²
```

归一化结果：

```text
LayerNorm(x)
= γ ⊙ (x - μ) / √(σ² + ε) + β
```

其中：

- `γ`：可学习缩放参数；
- `β`：可学习偏移参数；
- `ε`：防止除零的小常数。

对于：

```text
X.shape = [B, T, D]
```

LayerNorm 通常对每个 `X[b, t, :]` 独立归一化。

### 9.2 BatchNorm 与 LayerNorm

| 方法 | 归一化对象 | Transformer 中的适配性 |
| --- | --- | --- |
| BatchNorm | 依赖 batch 或空间维度统计 | 受 batch、序列长度、padding 等因素影响 |
| LayerNorm | 单个 token 的 hidden dimension | 与 batch size 无关，适合序列模型 |
| RMSNorm | 单个 token 的 hidden dimension | 计算更简单，现代 LLM 常见 |

不建议把结论写成“BatchNorm 会破坏句子分布”。更准确的说法是：BatchNorm 的统计方式与 NLP 中可变长度序列、padding 和 batch 组织方式不够自然，因此 Transformer 更常使用 LayerNorm 或 RMSNorm。

### 9.3 RMSNorm

RMSNorm 去掉 LayerNorm 中的均值中心化，只保留基于均方根的尺度归一化：

```text
RMS(x) = √(1/D Σx_i² + ε)
```

```text
RMSNorm(x) = γ ⊙ x / RMS(x)
```

对比：

```text
LayerNorm：减均值 + 除以标准差 + γ + β
RMSNorm：  除以均方根 + γ
```

RMSNorm 的优势：

- 计算路径更简单；
- 不需要计算均值；
- 不需要执行 `x - μ`；
- 通常不使用 LayerNorm 中的偏置参数 `β`；
- 在很多现代 LLM 中能够取得接近 LayerNorm 的效果。

不应把 RMSNorm 简单解释为“Pre-Norm 输入均值天然趋近于零”。更稳妥的解释是：去掉均值中心化后，保留尺度归一化在许多设置下已经足够。

### 9.4 Post-Norm

```text
x
 ↓
F(x)
 ↓
x + F(x)
 ↓
Norm
```

公式：

```text
Output = Norm(x + F(x))
```

原始 Transformer 采用的是类似 Post-Norm 的结构。

### 9.5 Pre-Norm

```text
x
 ↓
Norm(x)
 ↓
F(Norm(x))
 ↓
x + F(Norm(x))
```

公式：

```text
Output = x + F(Norm(x))
```

Pre-Norm 的残差路径更直接，通常更容易优化，尤其是在较深的 Transformer 中。

不能绝对化地说：

```text
Pre-Norm 完全消除梯度爆炸和梯度消失
Pre-Norm 一定不需要 warm-up
Post-Norm 最终效果一定更好
```

更准确的工程总结：

| 结构 | 常见特点 |
| --- | --- |
| Pre-Norm | 深层训练通常更稳定，优化更容易 |
| Post-Norm | 更接近原始论文，对初始化和学习率更敏感 |
| 最终效果 | 依赖深度、初始化、学习率、残差缩放和训练配方 |

参考：[On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)。

## 10. Transformer Block 的完整结构

### 10.1 原始 Encoder Layer

```text
输入 x
  ↓
Multi-Head Self-Attention
  ↓
Residual Add
  ↓
LayerNorm
  ↓
Feed-Forward Network
  ↓
Residual Add
  ↓
LayerNorm
  ↓
输出
```

### 10.2 原始 Decoder Layer

```text
输入
  ↓
Masked Self-Attention
  ↓
Add & Norm
  ↓
Cross-Attention
  ↓
Add & Norm
  ↓
Feed-Forward Network
  ↓
Add & Norm
  ↓
输出
```

### 10.3 现代 Decoder-only Block

```text
输入 x
  ↓
RMSNorm
  ↓
RoPE + Causal Self-Attention / GQA
  ↓
Residual Add
  ↓
RMSNorm
  ↓
SwiGLU / MLP
  ↓
Residual Add
  ↓
输出
```

常见伪代码：

```python
hidden_states = hidden_states + self_attn(
    input_layernorm(hidden_states)
)

hidden_states = hidden_states + mlp(
    post_attention_layernorm(hidden_states)
)
```

Block 的输入输出通常保持形状不变：

```text
x.shape              = [B, T, D]
attention_output     = [B, T, D]
mlp_output           = [B, T, D]
block_output.shape   = [B, T, D]
```

Attention 内部虽然会变成：

```text
[B, H, T, Dh]
```

但经过 Head 合并和输出投影后，需要回到：

```text
[B, T, D]
```

否则无法与残差分支相加。

## 11. Encoder-only、Encoder–Decoder、Decoder-only

### 11.1 Encoder-only

代表：BERT。

```text
输入文本
  ↓
Encoder Stack
  ↓
双向上下文表示
  ↓
分类 / 匹配 / 抽取 / 向量表示
```

特点：

- 通常可以读取左右两侧上下文；
- 更偏向理解输入；
- 常使用 Masked Language Modeling 等预训练目标。

### 11.2 Encoder–Decoder

代表：原始 Transformer、T5、BART。

```text
输入序列
  ↓
Encoder
  ↓
输入上下文表示
  ↓
Decoder + Cross-Attention
  ↓
输出序列
```

适合输入和输出边界比较清楚的转换任务，例如翻译、摘要和文本到文本转换。

### 11.3 Decoder-only

代表：GPT、Llama、Qwen、DeepSeek 等模型家族中的许多模型。

```text
已有前缀
  ↓
Causal Self-Attention
  ↓
预测下一个 token
```

Decoder-only 通常去掉原始 Encoder–Decoder 结构中的 Encoder 和 Cross-Attention，只保留带因果遮罩的 Self-Attention 和 FFN。

问答、翻译、代码和推理都可以统一为：

```text
给定前缀，预测后续 token
```

## 12. LM Head、训练与生成

### 12.1 LM Head

最后一个 Transformer Block 输出：

```text
hidden_states.shape = [B, T, D]
```

LM Head 将最后一维映射到词表维度：

```text
logits.shape = [B, T, V]
```

每个位置都有一个长度为 `V` 的向量，表示词表中每个 token 的未归一化分数。

通常：

```text
probabilities = softmax(logits)
```

训练时一般直接使用 logits 计算 Cross-Entropy Loss，不需要手动先做 Softmax。

### 12.2 Weight Tying

部分语言模型会共享输入 Embedding 和输出 LM Head 的权重：

```text
W_lm_head = Eᵀ
```

这称为 weight tying，优点是：

- 减少参数量；
- 让输入和输出词表表示共享信息。

不是所有模型都必须共享，具体要看模型实现。

### 12.3 Next-token Prediction

训练文本：

```text
The capital of France is Paris
```

输入和标签错位：

```text
输入：The capital of France is
目标：capital of France is Paris
```

模型需要学习：

```text
The      → capital
capital  → of
of       → France
France   → is
is       → Paris
```

logits 形状：

```text
[B, T, V]
```

labels 形状：

```text
[B, T]
```

对每个位置的 logits 与对应 label 计算 Cross-Entropy，然后对有效 token 聚合。

### 12.4 训练阶段为什么可以并行

训练时完整序列已知。Causal Mask 只限制每个位置的可见范围，不妨碍 GPU 一次计算整段序列的矩阵运算。

```text
训练阶段：整段序列并行计算
```

### 12.5 生成阶段为什么逐 token

生成时未来 token 未知：

```text
Prompt
  ↓
预测 token 1
  ↓
追加 token 1
  ↓
预测 token 2
  ↓
追加 token 2
  ↓
...
```

```text
生成阶段：通常自回归地逐 token 计算
```

KV Cache 用于减少生成时对历史 Key / Value 的重复计算；Prefill 和 Decode 的区别将在推理章节详细讨论。

## 13. 现代 Transformer 组件

| 组件 | 解决的问题 | 典型位置或作用 |
| --- | --- | --- |
| RoPE | 表示相对位置信息 | 作用于 Attention 的 Q/K |
| RMSNorm | 稳定激活尺度、减少归一化计算 | Block 的 Norm 子层 |
| SwiGLU | 增强 FFN 表达能力 | FFN / MLP 子层 |
| GQA | 减少 K/V 头和 KV Cache | Attention |
| MQA | 更激进地共享 K/V | Attention |
| KV Cache | 避免重复计算历史 K/V | 生成阶段 |
| FlashAttention | 减少 Attention 的显存读写 | Attention kernel |
| MoE | 增大总参数、控制每 token 激活计算 | FFN / Expert 层 |

### 13.1 MHA、MQA、GQA

```text
MHA：每个 Q head 对应独立的 K/V head
MQA：所有 Q head 共享一组 K/V
GQA：多个 Q head 分组共享一组 K/V
```

GQA 处于 MHA 和 MQA 之间：

```text
Q head 数量较多
K/V head 数量较少
```

它可以降低 KV Cache 的显存占用，同时通常比 MQA 保留更多表达能力。

### 13.2 FlashAttention

FlashAttention 主要优化的是 Attention 的内存访问和中间矩阵存储，不是改变 Attention 的数学公式。

标准 Attention 可能显式构造：

```text
[B, H, T, T]
```

大小的 attention score / probability 矩阵。FlashAttention 通过分块计算、tiling 和更高效的 GPU 内存访问，减少中间结果写入显存。

重点：

```text
数学结果接近或等价
实现方式更高效
```

### 13.3 MoE

MoE 将 FFN 替换为多个 Expert，并由 Router 为每个 token 选择部分 Expert：

```text
hidden state
  ↓
Router
  ↓
选择 Top-k Experts
  ↓
Expert FFNs
  ↓
加权合并
```

MoE 可以让模型拥有较大的总参数量，但每个 token 只激活部分参数。代价包括：

- Router 训练；
- Expert 负载不均衡；
- 通信和并行调度复杂；
- 需要 load balancing loss 等机制。

## 14. 高频八股题

### 14.1 Transformer 总体架构

1. Transformer 为什么比 RNN 更适合大规模训练？
2. Transformer 为什么训练时可以并行，生成时通常不能并行？
3. 原始 Transformer 是什么架构？
4. Encoder-only、Encoder–Decoder、Decoder-only 分别适合什么任务？
5. 原始 Transformer 的 Decoder 比 Encoder 多了什么？
6. Self-Attention 和 Cross-Attention 有什么区别？
7. Transformer 一个 Layer 包含哪些模块？
8. 为什么 Transformer 可以堆叠很多层？
9. Transformer 的输入输出张量形状通常是什么？
10. 为什么现代大模型大多采用 Decoder-only？

### 14.2 Attention 与 Q/K/V

11. Q、K、V 分别是什么？
12. Q、K、V 是怎么计算出来的？
13. 为什么要计算 `QK^T`？
14. 为什么 Attention 要除以 `sqrt(d_k)`？
15. Softmax 在 Attention 中起什么作用？
16. 为什么 V 不参与 score 的计算？
17. Attention 的输出是什么？
18. Self-Attention 的时间复杂度和空间复杂度是多少？
19. Cross-Attention 中 Q、K、V 分别来自哪里？
20. 为什么 Multi-Head Attention 需要多个 Head？
21. 为什么 Multi-Head Attention 需要 Concat 和 Output Projection？
22. Head 数量和 head dimension 如何确定？
23. Attention 权重能否直接解释为模型的因果解释？

### 14.3 Mask 与位置编码

24. Causal Mask 解决什么问题？
25. Padding Mask 解决什么问题？
26. Causal Mask 和 Padding Mask 有什么区别？
27. Encoder 为什么通常不使用 Causal Mask？
28. Decoder 为什么必须使用 Causal Mask？
29. Sinusoidal Position Encoding 为什么使用 sin/cos？
30. Learned Position Embedding 和 Sinusoidal Position Encoding 有什么区别？
31. RoPE 为什么作用在 Q/K 上？
32. RoPE 为什么能够表达相对位置关系？
33. RoPE 的 base 和 scaling 是什么？
34. ALiBi 和 RoPE 有什么区别？
35. 训练长度和推理长度不一致会有什么问题？

### 14.4 FFN、残差和归一化

36. FFN 在 Transformer 中起什么作用？
37. 为什么 FFN 要先升维再降维？
38. ReLU、GELU、SiLU 有什么区别？
39. SwiGLU 比普通 FFN 多了什么？
40. SwiGLU 的两个分支分别做什么？
41. Residual Connection 为什么能够帮助深层训练？
42. LayerNorm 的归一化维度是什么？
43. LayerNorm 和 BatchNorm 有什么区别？
44. LayerNorm 和 RMSNorm 有什么区别？
45. RMSNorm 为什么可以去掉均值中心化？
46. Pre-Norm 和 Post-Norm 的公式是什么？
47. Pre-Norm 为什么通常更容易训练深层模型？
48. Post-Norm 为什么可能对 warm-up 更敏感？
49. Pre-Norm 是否一定比 Post-Norm 好？
50. Norm 中的 `epsilon` 起什么作用？

### 14.5 现代 LLM 与推理

51. MHA、MQA、GQA 分别是什么？
52. GQA 如何减少 KV Cache？
53. 为什么 GQA 只共享 K/V，不共享 Q？
54. FlashAttention 优化的是什么？
55. FlashAttention 是否改变 Attention 的数学结果？
56. MoE 为什么可以总参数量很大但每个 token 激活参数较少？
57. MoE 中 Router 做什么？
58. MoE 为什么需要 load balancing loss？
59. KV Cache 缓存的是什么？
60. 为什么缓存 K/V，不缓存 Q？
61. Prefill 和 Decode 有什么区别？
62. KV Cache 的显存占用如何计算？
63. 长上下文为什么会拖慢推理？
64. TTFT 和 TPOT 分别是什么？
65. PagedAttention 解决什么问题？

## 15. 高频八股题参考回答

### 15.1 Transformer 为什么比 RNN 更适合大规模训练？

推荐回答：

> Transformer 使用 Self-Attention 直接建模序列中不同位置之间的关系，相比 RNN 逐时间步递归计算的方式，训练阶段可以对整个序列进行并行矩阵计算，因此更适合 GPU 和大规模数据训练。同时，Attention 缩短了远距离 token 之间的信息传递路径，更容易建模长距离依赖。它的代价是 Attention 计算和序列长度有关，长上下文成本较高，并且生成阶段仍然存在逐 token 的自回归过程。

拆解：

```text
RNN 的问题：时间步依赖、并行度低、长距离路径长
Transformer 的优势：并行、直接交互、适合矩阵运算
Transformer 的代价：长序列成本高、生成阶段仍然串行
```

### 15.2 Self-Attention 和 Cross-Attention 的区别

推荐回答：

> Self-Attention 中 Q、K、V 来自同一个序列，用于序列内部不同位置之间的信息交互。Cross-Attention 中 Q 来自当前 Decoder 序列，K 和 V 来自 Encoder 输出，用于让 Decoder 读取输入序列的上下文表示。原始 Encoder–Decoder Transformer 中，Decoder 通过 Cross-Attention 使用 Encoder 信息；Decoder-only LLM 通常没有这一层。

### 15.3 为什么 FFN 先升维再降维？

推荐回答：

> FFN 先把隐藏状态投影到更高维的特征空间，通过激活函数进行非线性组合，再投影回模型隐藏维度。升维提供更大的特征表达空间，降维保证输出可以与残差分支相加。它和 Attention 的职责不同：Attention 负责 token 间信息交换，FFN 负责当前位置内部的非线性特征变换。

### 15.4 Pre-Norm 为什么更容易训练？

推荐回答：

> Pre-Norm 在 Attention 或 FFN 之前进行归一化，残差分支保留了更直接的恒等路径，梯度可以沿残差路径传播，因此深层模型通常更容易优化。它并不能从理论上完全消除梯度爆炸或梯度消失，也不能简单推导出最终效果一定优于 Post-Norm，实际结果还取决于初始化、学习率、warm-up、残差缩放和训练配方。

### 15.5 Causal Mask 和 Padding Mask 的区别

推荐回答：

> Causal Mask 用于自回归生成，防止当前位置读取未来 token；Padding Mask 用于变长 batch，防止模型关注为了对齐长度而补入的 padding token。两者解决的问题不同，但工程实现中可能会合并成一个最终的 Attention Mask。

### 15.6 GQA 为什么能降低 KV Cache 显存？

推荐回答：

> 在 MHA 中，每个 Query Head 通常都有对应的 Key 和 Value Head；GQA 让多个 Query Head 共享较少数量的 K/V Head。由于 KV Cache 主要保存历史 K/V，因此减少 K/V Head 数量就能按比例减少缓存占用，同时保留多个 Query Head 的表达能力。GQA 是 MHA 和 MQA 之间的折中方案。

## 16. 手写题与代码题

### 16.1 手写 Scaled Dot-Product Attention

要求实现：

```python
scores = Q @ K.transpose(-2, -1)
scores = scores / math.sqrt(head_dim)
scores = scores.masked_fill(mask == 0, float("-inf"))
weights = softmax(scores, dim=-1)
output = weights @ V
```

需要检查：

- `Q/K/V` 的最后一维是否相同；
- score 的最后两个维度是否为 `[T_q, T_k]`；
- mask 是否能正确广播；
- Softmax 是否在 Key 维度执行；
- 输出形状是否为 `[B, H, T_q, D_h]`。

### 16.2 手写 Multi-Head Attention

要求完成：

```text
[B, T, D]
→ Q/K/V 投影
→ reshape 为 [B, H, T, Dh]
→ Attention
→ transpose
→ merge heads
→ output projection
```

常见错误：

- `view` 前没有保证张量连续；
- `transpose` 后维度顺序错误；
- 把 `[B, T, H, Dh]` 误当成 `[B, H, T, Dh]`；
- 忘记最终的 Output Projection；
- `D` 不能被 `H` 整除。

### 16.3 手写 Causal Mask

要求生成：

```text
[1, 0, 0]
[1, 1, 0]
[1, 1, 1]
```

需要说明：

- 对角线及左下角允许读取；
- 右上角表示未来位置；
- mask 需要适配 `[B, H, T, T]` 的广播。

### 16.4 手写 RMSNorm

核心计算：

```python
variance = x.pow(2).mean(dim=-1, keepdim=True)
x = x * torch.rsqrt(variance + eps)
return weight * x
```

### 16.5 手写 SwiGLU

核心结构：

```python
return down_proj(F.silu(gate_proj(x)) * up_proj(x))
```

需要说明：

```text
gate_proj：门控分支
up_proj：值分支
down_proj：降维分支
```

### 16.6 计算 KV Cache 显存

如果：

```text
Layer 数量 = L
Batch size = B
KV head 数量 = H_kv
序列长度 = T
Head dimension = D_h
数据类型字节数 = bytes
```

K 和 V 各保存一份，因此缓存大小近似为：

```text
KV Cache bytes
= 2 × L × B × H_kv × T × D_h × bytes
```

如果使用 GQA，`H_kv` 小于 Query Head 数量，因此缓存显存下降。

## 17. 本章总结

Transformer 的输入是 token 表示，经过 Embedding 和位置相关处理后，进入多个 Transformer Block。每个 Block 通过 Attention 完成 token 之间的信息交换，通过 FFN 完成单个 token 内部的非线性变换，并通过 Residual Connection 和 Normalization 支持深层网络训练。

原始 Transformer 是 Encoder–Decoder 结构；现代 GPT 类模型通常采用 Decoder-only 结构，在 Causal Mask 下使用 next-token prediction 训练。现代 LLM 又在 Transformer 基础上加入 RoPE、RMSNorm、SwiGLU、GQA、FlashAttention、MoE 和 KV Cache 等结构或系统改进。

完整主线：

```text
Tokenizer
→ Embedding
→ Position Information
→ Attention
→ FFN
→ Residual + Normalization
→ Transformer Block × N
→ LM Head
→ Logits
→ Next-token Prediction
```

## 参考论文

1. Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
2. Shazeer, [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202)
3. Zhang and Sennrich, [Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467)
4. Xiong et al., [On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)
5. Su et al., [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
6. Dao et al., [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135)

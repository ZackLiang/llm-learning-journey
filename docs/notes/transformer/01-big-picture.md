# 第一章 Transformer 架构与核心组件

> 参考主线：Vaswani et al., *Attention Is All You Need*。本章把 Transformer 作为一个完整的网络结构来学习，重点放在：每个模块解决什么问题、模块之间如何连接、输入输出张量如何变化，以及原始 Transformer 与现代 Decoder-only LLM 的关系。

## 1. Transformer 的整体定位

Transformer 是一种面向序列建模的神经网络架构。它最初用于机器翻译，核心思想是使用 Attention 建立序列中不同位置之间的信息交互，摆脱 RNN 对时间步的严格依赖。

Transformer 不是一个单独的 Attention 层，而是由以下部分共同组成的网络结构：

```text
输入表示
  ├─ Token Embedding
  └─ Position Information

Transformer Layer
  ├─ Attention
  ├─ Feed-Forward Network
  ├─ Residual Connection
  └─ Normalization

输出层
  ├─ Hidden States
  ├─ Linear / LM Head
  └─ Logits
```

从功能上看，可以把一个 Transformer Layer 分成两类操作：

```text
Attention：完成 token 与 token 之间的信息交换
FFN：完成单个 token 表示内部的非线性变换
```

Residual 和 Normalization 不负责产生新的语义关系，但它们决定了深层网络能否稳定训练。

## 2. 原始论文中的整体结构

原始论文提出的是 Encoder–Decoder Transformer，主要用于序列到序列任务，例如机器翻译。

论文原图如下：

![Transformer 原始论文 Figure 1：模型架构](../../assets/papers/transformer-figure-1.png){ .paper-figure }

> 来源：Vaswani et al., *Attention Is All You Need*, Figure 1。原论文：[arXiv:1706.03762](https://arxiv.org/abs/1706.03762)。图中左侧是 Encoder stack，右侧是 Decoder stack。

### 2.1 从图中先看数据流

```text
Inputs
  ↓
Input Embedding + Positional Encoding
  ↓
Encoder Stack
  ↓
Encoder 输出表示

Outputs shifted right
  ↓
Output Embedding + Positional Encoding
  ↓
Decoder Stack
  ↓
Linear
  ↓
Softmax
  ↓
Output Probabilities
```

Decoder 还会读取 Encoder 的输出，因此原始结构中存在两条信息来源：

```text
Decoder 的历史输出
Encoder 对输入序列的表示
```

### 2.2 原始 Transformer Layer 的重复堆叠

论文中的 `N×` 表示同一种 Layer 重复堆叠 `N` 次。

原始配置中：

```text
N = 6
```

但 `N=6` 只是论文实验中的配置，不是 Transformer 的固定规定。现代模型可以使用几十层、上百层，具体取决于模型规模和训练目标。

## 3. 输入表示：Token、Embedding 与位置

### 3.1 Tokenizer

模型不能直接接收字符串。Tokenizer 负责把文本切分成 token，并将 token 映射成整数 id。

```text
文本：The capital of France is

Token：The | capital | of | France | is

ID：   101 | 2398   | 310 | 9821   | ...
```

实际 tokenizer 通常是子词级别，因此一个人类词可能对应一个或多个 token。

Tokenizer 会影响：

- 相同文本占用的 token 数；
- 上下文窗口的有效容量；
- 训练和推理成本；
- 中文、英文、代码、数学符号的编码效率；
- 词表大小和 Embedding 参数量。

### 3.2 Token Embedding

Token id 本身只是查表索引，不具备连续语义。Embedding 层将每个 token id 映射为一个向量。

设：

```text
B：batch size
T：sequence length
D：hidden size / d_model
V：vocabulary size
```

则：

```text
input_ids.shape = [B, T]
embedding_output.shape = [B, T, D]
```

Embedding 可以看作一个参数矩阵：

```text
E ∈ R^(V × D)
```

对于一个 token id `i`，模型取出：

```text
E[i] ∈ R^D
```

### 3.3 位置信息

Attention 本身不天然知道顺序。例如下面两个序列包含相同 token，但语义不同：

```text
猫追老鼠
老鼠追猫
```

因此输入表示还需要加入位置信息：

```text
Token Embedding
      +
Position Information
      ↓
Transformer 输入
```

原始 Transformer 使用 Sinusoidal Positional Encoding。现代大模型常使用 RoPE，RoPE 会作用在 Attention 的 Query 和 Key 上。本章先记录它们在整体架构中的位置，具体计算放到 Attention 专题中。

## 4. Attention 层：token 之间的信息交换

### 4.1 Attention 的作用

Attention 层解决的问题是：

> 当前 token 应该从序列中的哪些 token 读取信息，以及读取多少？

例如：

```text
The animal didn't cross the street because it was tired.
```

模型在处理 `it` 时，可能需要参考 `animal`。Attention 允许模型根据输入内容动态计算不同位置之间的关联权重。

Attention 不是固定规则，也不是简单地选择一个最相关的 token，而是对多个位置进行加权聚合。

### 4.2 Q、K、V 的基本角色

输入隐藏状态记为：

```text
X ∈ R^(T × D)
```

通过三个线性投影得到：

```text
Q = XW_Q
K = XW_K
V = XW_V
```

可以先按功能记忆：

| 向量 | 直观作用 |
| --- | --- |
| Query | 当前 token 想查询什么信息 |
| Key | 当前 token 可以提供什么匹配特征 |
| Value | 当前 token 实际提供的内容 |

Q 和 K 用来计算匹配程度，V 负责被加权聚合。

### 4.3 Scaled Dot-Product Attention

论文 Figure 2：

![Transformer 原始论文 Figure 2：Scaled Dot-Product Attention 与 Multi-Head Attention](../../assets/papers/transformer-figure-2.png){ .paper-figure }

> 来源：Vaswani et al., *Attention Is All You Need*, Figure 2。原图左侧展示 Scaled Dot-Product Attention，右侧展示 Multi-Head Attention。

Scaled Dot-Product Attention 的公式：

```text
Attention(Q, K, V)
= softmax(QKᵀ / √d_k)V
```

计算步骤：

```text
1. QKᵀ：计算 Query 与 Key 的匹配分数
2. 除以 √d_k：控制点积数值尺度
3. 加 Mask：屏蔽不允许读取的位置
4. Softmax：把分数转换为权重
5. 与 V 相乘：对 Value 做加权求和
```

如果：

```text
Q.shape = [T_q, d_k]
K.shape = [T_k, d_k]
V.shape = [T_k, d_v]
```

则：

```text
QKᵀ.shape = [T_q, T_k]
Attention 权重.shape = [T_q, T_k]
输出.shape = [T_q, d_v]
```

### 4.4 为什么要除以 `√d_k`

假设 Query 和 Key 的每个分量独立、均值为 0、方差为 1，则点积：

```text
q · k = Σ(q_i k_i)
```

随着维度 `d_k` 增大，点积的方差也会增大。分数过大时，Softmax 容易变得非常尖锐：一个位置接近 1，其他位置接近 0。

这样会导致：

- 梯度变小；
- 注意力分布过早饱和；
- 训练不稳定。

因此使用：

```text
QKᵀ / √d_k
```

进行尺度控制。

### 4.5 Causal Mask

在 Decoder-only LLM 中，第 `t` 个位置不能读取未来位置的信息。

长度为 4 的 Causal Mask：

```text
1 0 0 0
1 1 0 0
1 1 1 0
1 1 1 1
```

实现时，被屏蔽的位置通常加上负无穷或一个很小的数：

```text
score[future_position] = -∞
```

经过 Softmax 后，这些位置的权重接近 0。

## 5. Multi-Head Attention

单个 Attention 只在一个投影空间中建模关系。Multi-Head Attention 将输入投影到多个不同的子空间，并行计算多个 Attention。

论文中的结构可以概括为：

```text
输入 X
  ↓
多个不同的线性投影
  ↓
Head 1 / Head 2 / ... / Head h
  ↓
每个 Head 独立进行 Attention
  ↓
Concat
  ↓
Linear
  ↓
输出
```

设：

```text
D：模型隐藏维度
H：head 数量
Dh：每个 head 的维度
```

通常：

```text
D = H × Dh
```

典型张量变化：

```text
输入：        [B, T, D]
线性投影后：   [B, T, H, Dh]
转置后：       [B, H, T, Dh]
Attention：   [B, H, T, Dh]
合并 Head：    [B, T, D]
```

Multi-Head 的作用不是简单地“增加计算量”，而是让不同 Head 可以在不同表示子空间中建模关系。

需要注意：不能简单地把每个 Head 固定解释为某种语言学关系。某些 Head 可能呈现明显模式，但模型功能通常是分布式的。

## 6. FFN 层

### 6.1 作用

Attention 层做 token 间的信息交换，FFN 层做单个 token 内部的非线性特征变换。

可以这样区分：

```text
Attention：不同位置之间交换信息
FFN：当前位置内部进行特征变换
```

FFN 的本质是两层 MLP：

```text
先升维
→ 激活函数
→ 再降维
```

### 6.2 传统 FFN 公式

如果使用行向量约定：

```text
FFN(x) = σ(xW₁ + b₁)W₂ + b₂
```

如果使用列向量约定：

```text
FFN(x) = W₂σ(W₁x + b₁) + b₂
```

两种写法只是张量布局不同，本质相同。

设：

```text
x：          [B, T, D]
W₁：         [D, D_ff]
W₂：         [D_ff, D]
```

则：

```text
[B, T, D]
   ↓ W₁
[B, T, D_ff]
   ↓ 激活函数
[B, T, D_ff]
   ↓ W₂
[B, T, D]
```

FFN 中间维度 `D_ff` 通常大于模型维度 `D`。升维的目的，是在更大的特征空间中进行非线性变换；降维后重新回到残差分支要求的维度。

### 6.3 现代 LLM 中的 SwiGLU

现代大模型通常使用 SwiGLU 等门控 FFN 结构替代简单的 ReLU FFN。

一种常见形式：

```text
SwiGLU(x) = (SiLU(xW_gate) ⊙ xW_up)W_down
```

其中：

- `xW_gate`：门控分支；
- `SiLU`：激活后的门控权重；
- `xW_up`：值分支；
- `⊙`：逐元素 Hadamard 乘法；
- `W_down`：降维投影。

结构：

```text
输入 x
 ├─ 线性投影 → SiLU → 门控分支
 └─ 线性投影 ────────→ 值分支
          ↓
       逐元素相乘
          ↓
       降维投影
```

SwiGLU 的核心作用可以理解为：

```text
通过门控机制，对不同特征维度进行动态筛选
```

SiLU 相比 ReLU 更平滑，负数区域不是直接全部变成 0，因此梯度变化通常更连续。但具体效果仍取决于维度设置、初始化、训练数据和整体模型结构，不能只归因于激活函数本身。

## 7. 残差连接

### 7.1 基本公式

残差连接的基本形式：

```text
y = x + F(x)
```

在 Transformer 中，`F(x)` 可以是 Attention 子层，也可以是 FFN 子层。

### 7.2 作用

残差连接构造了恒等跳跃通路。

前向传播时：

```text
原始特征可以沿跳跃路径保留
```

反向传播时：

```text
dy/dx = 1 + dF(x)/dx
```

其中的 `1` 提供了一条直接的梯度路径。

实际作用包括：

- 缓解深层网络中的梯度传播问题；
- 保留子层输入信息；
- 让子层学习相对于输入的增量变化；
- 支持多个 Transformer Layer 进行堆叠。

更准确地说，残差连接是缓解梯度消失和深层优化困难的重要机制，但不能单独保证训练绝对稳定。学习率、初始化、Normalization 和残差缩放也会产生影响。

## 8. LayerNorm、RMSNorm 与归一化位置

### 8.1 LayerNorm 的计算

对一个 token 的隐藏向量：

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

对于输入：

```text
X.shape = [B, T, D]
```

LayerNorm 通常对每个 `X[b, t, :]` 独立归一化，而不是跨 batch 统计。

### 8.2 BatchNorm 与 LayerNorm

| 方法 | 归一化对象 | 与 Transformer 的适配性 |
| --- | --- | --- |
| BatchNorm | 通常依赖 batch 维度统计 | 受 batch、序列长度、padding 等因素影响 |
| LayerNorm | 单个 token 的 hidden dimension | 与 batch size 无关，适合序列模型 |
| RMSNorm | 单个 token 的 hidden dimension | 计算更简单，现代 LLM 中常见 |

不能简单说 BatchNorm 会“破坏句子分布”。更准确的说法是：BatchNorm 的统计方式与 NLP 中可变长度序列、padding 和 batch 组织方式不够自然，因此 Transformer 更常使用 LayerNorm 或 RMSNorm。

### 8.3 RMSNorm

RMSNorm 去掉了 LayerNorm 中的均值中心化，只保留基于均方根的尺度归一化：

```text
RMS(x) = √(1/D Σx_i² + ε)
```

```text
RMSNorm(x) = γ ⊙ x / RMS(x)
```

与 LayerNorm 相比：

```text
LayerNorm：减均值 + 除以标准差 + γ + β
RMSNorm：  除以均方根 + γ
```

RMSNorm 的主要优势：

- 计算路径更简单；
- 不需要计算均值；
- 不需要执行 `x - μ`；
- 通常不使用 LayerNorm 中的偏置参数 `β`；
- 在很多现代 LLM 中能够取得接近 LayerNorm 的效果。

不能把 RMSNorm 的动机简单写成“Pre-Norm 输入均值天然趋近于零”。更稳妥的表述是：RMSNorm 的研究表明，重新中心化不一定是归一化中最关键的部分，保持激活尺度稳定可能已经足够。

### 8.4 Pre-Norm 与 Post-Norm

#### Post-Norm

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

#### Pre-Norm

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

Pre-Norm 的残差路径更直接，通常更容易优化，尤其是在较深的 Transformer 中。Xiong et al. 的分析指出，Pre-LN 在初始化时具有更稳定的梯度特性，并且在一定设置下可以减少对 warm-up 的依赖。参考：[On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)。

但以下说法不应绝对化：

```text
Pre-Norm 完全消除梯度爆炸和梯度消失
Pre-Norm 一定不需要 warm-up
Post-Norm 最终效果一定更好
```

更严谨的总结：

| 结构 | 常见特点 |
| --- | --- |
| Pre-Norm | 优化更稳定，深层训练更容易；某些设置下可能存在残差路径主导问题 |
| Post-Norm | 原始 Transformer 使用；训练初期对初始化和学习率更敏感，但不能简单断言最终上限一定更高 |
| 实际选择 | 依赖深度、初始化、学习率、残差缩放、数据和训练配方 |

## 9. 一个完整 Transformer Block

### 9.1 原始论文中的简化结构

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

### 9.2 现代 Pre-Norm Block 的常见形式

```text
输入 x
  ↓
RMSNorm
  ↓
Self-Attention
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

可以用代码形式表示：

```python
h = x + attention(rms_norm_1(x))
h = h + mlp(rms_norm_2(h))
```

这里：

```text
attention：token 间的信息交互
mlp：单个 token 内的特征变换
rms_norm：稳定子层输入
残差加法：保留主干信息和梯度路径
```

### 9.3 Block 的输入输出形状

如果输入为：

```text
x.shape = [B, T, D]
```

则一个标准 Transformer Block 通常保持形状不变：

```text
attention_output.shape = [B, T, D]
mlp_output.shape       = [B, T, D]
block_output.shape     = [B, T, D]
```

Attention 内部可能暂时变成：

```text
[B, H, T, Dh]
```

但经过 Head 合并和输出投影后，要回到：

```text
[B, T, D]
```

这样才能与残差分支相加。

## 10. Encoder-only、Encoder–Decoder、Decoder-only

### 10.1 Encoder-only

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

- 通常可以使用左右两侧上下文；
- 更偏向理解输入；
- 常使用 Masked Language Modeling 等预训练目标。

### 10.2 Encoder–Decoder

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

Encoder–Decoder 适合输入和输出边界比较清楚的转换任务，例如翻译和摘要。

### 10.3 Decoder-only

代表：GPT、Llama、Qwen、DeepSeek 等模型家族中的许多模型。

```text
已有前缀
  ↓
Causal Self-Attention
  ↓
预测下一个 token
```

Decoder-only 通常去掉原始 Encoder–Decoder 结构中的 Encoder 和 Cross-Attention，只保留带因果遮罩的 Self-Attention 和 FFN。

问答、翻译、代码和推理可以统一成：

```text
给定前缀，预测后续 token
```

## 11. 训练阶段与生成阶段

### 11.1 Next-token Prediction

训练目标是根据前面的 token 预测下一个 token。

```text
输入：The capital of France is Paris
目标：capital of France is Paris <eos>
```

实际计算可以理解为错位：

```text
位置 1：The      → capital
位置 2：capital  → of
位置 3：of       → France
位置 4：France   → is
位置 5：is       → Paris
```

输出 logits：

```text
logits.shape = [B, T, V]
```

再与 labels 计算 Cross-Entropy Loss。

### 11.2 为什么训练可以并行

训练时完整目标序列已经存在。Causal Mask 只限制每个位置能读取的范围，但不妨碍 GPU 一次计算所有位置的矩阵运算。

因此：

```text
训练：整段序列并行计算
生成：通常逐 token 计算
```

### 11.3 自回归生成

生成时，未来 token 未知：

```text
Prompt
  ↓
预测 token 1
  ↓
拼回上下文
  ↓
预测 token 2
  ↓
拼回上下文
  ↓
...
```

Temperature、Top-k、Top-p 等方法作用于 logits 或概率分布，不改变 Transformer 的基本结构。

## 12. 原始 Transformer 与现代 LLM 的差异

| 模块 | 原始 Transformer | 现代 LLM 常见做法 |
| --- | --- | --- |
| 总体架构 | Encoder–Decoder | Decoder-only 较常见 |
| 位置编码 | Sinusoidal | RoPE 等 |
| 归一化 | LayerNorm | RMSNorm 等 |
| FFN 激活 | ReLU | SwiGLU 等 |
| Attention | Multi-Head Attention | MHA / GQA / MQA |
| 训练目标 | Seq2Seq | Next-token prediction 常见 |
| 推理缓存 | 论文未重点展开 | KV Cache |
| Attention 实现 | 标准矩阵计算 | FlashAttention 等优化 |
| 参数结构 | Dense | Dense 或 MoE |

现代 LLM 仍然属于 Transformer 家族，但不是把原始论文代码原封不动地放大。它们对架构、归一化、位置编码、FFN、Attention 和推理过程进行了大量改造。

## 13. 一道常见八股题：为什么 Transformer 比 RNN 更适合大规模训练？

推荐回答：

> Transformer 使用 Self-Attention 直接建模不同位置之间的关系，相比 RNN 逐时间步递归计算的方式，训练时可以对整个序列进行并行矩阵计算，因此更适合 GPU 和大规模数据训练。同时，Attention 缩短了远距离 token 之间的信息传递路径，更容易建模长距离依赖。它的代价是 Attention 计算和序列长度有关，长上下文成本较高，并且生成阶段仍然存在逐 token 的自回归过程。

回答拆解：

```text
RNN 的问题：
1. 时间步存在顺序依赖；
2. 训练并行度受限；
3. 长距离信息传递路径较长。

Transformer 的优势：
1. 训练阶段更容易并行；
2. 任意位置可以直接建立信息交互；
3. 计算结构适合 GPU 和大规模扩展。

Transformer 的代价：
1. 长序列 Attention 计算和显存开销较高；
2. 生成阶段通常仍然逐 token 进行；
3. 需要 KV Cache、FlashAttention 等系统优化。
```

## 14. 本章复习清单

### 结构

- [ ] 能画出原始 Transformer 的 Encoder–Decoder 结构。
- [ ] 能说出 Encoder Layer 和 Decoder Layer 的区别。
- [ ] 能解释 Decoder 中为什么需要 Masked Self-Attention。
- [ ] 能解释 Cross-Attention 的 Query、Key、Value 分别来自哪里。

### 模块

- [ ] 能说清 Attention 和 FFN 的职责差异。
- [ ] 能写出残差连接 `y = x + F(x)`。
- [ ] 能写出 LayerNorm 和 RMSNorm 的基本公式。
- [ ] 能解释 Pre-Norm 与 Post-Norm 的差异。
- [ ] 能说出 SwiGLU 相比普通 FFN 多了什么机制。

### 张量

- [ ] 知道 `input_ids` 通常是 `[B, T]`。
- [ ] 知道 hidden states 通常是 `[B, T, D]`。
- [ ] 知道 logits 通常是 `[B, T, V]`。
- [ ] 能解释 Multi-Head Attention 中 `[B, T, D]` 到 `[B, H, T, Dh]` 的变化。

### 关系

- [ ] 能解释原始 Transformer 与 Decoder-only LLM 的关系。
- [ ] 能解释训练阶段为什么可以并行。
- [ ] 能解释生成阶段为什么通常逐 token 进行。
- [ ] 能说出 RoPE、RMSNorm、SwiGLU、GQA、KV Cache 分别位于哪一层或哪个阶段。

## 15. 一段话总结

Transformer 的输入是 token 表示，经过位置编码或位置相关机制后，进入多个 Transformer Layer。每个 Layer 通过 Attention 完成不同 token 之间的信息交换，通过 FFN 完成单个 token 表示内部的非线性变换，并通过 Residual Connection 和 Normalization 支持深层网络训练。原始 Transformer 是 Encoder–Decoder 结构，现代 GPT 类模型通常采用 Decoder-only 结构，在 Causal Mask 下使用 next-token prediction 进行训练，并在生成阶段逐 token 产生输出。

## 参考论文

1. Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
2. Shazeer, [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202)
3. Zhang and Sennrich, [Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467)
4. Xiong et al., [On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)

# Model Internals

这里记录模型内部机制：Tokenizer、Embedding、Attention、Transformer Block、RoPE、RMSNorm、SwiGLU、MoE 和 KV Cache。

## 记录方式

不只摘抄定义，而是尽量回答：

- 这个机制解决了什么问题？
- 如果去掉它，模型会怎样？
- 它在真实模型代码中对应什么？
- 我能否用一个小例子解释它？

## Planned Notes

- [ ] Tokenizer 与词表
- [ ] Causal Attention
- [ ] RoPE
- [ ] KV Cache
- [ ] MoE

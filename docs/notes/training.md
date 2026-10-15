# Training & Alignment

这里记录从预训练到后训练的理解，包括 SFT、LoRA、DPO、GRPO 和 reasoning training。

## 关注的问题

- 数据质量和训练目标如何共同影响模型行为？
- SFT、Preference Optimization 和 RL 的训练信号分别是什么？
- reward 上升时，能力是否真的提升？
- 一个训练结果如何排除数据、评测或环境因素的影响？

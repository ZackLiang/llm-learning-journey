# 学习笔记

这里收纳的是概念笔记、系统设计理解和工程实践总结；论文的单篇解读放在“论文阅读”，个人项目和实现记录放在“个人项目”。

学习路线见：[学习地图](../roadmap.md)。

```mermaid
flowchart LR
    A[模型与架构] --> B[Agent 工程]
    B --> C[训练与评测]
    C --> D[推理与系统]
```

## 01. 模型与架构

| 主题 | 内容 | 入口 |
| --- | --- | --- |
| Transformer | 从整体架构、Attention、Block 到 Decoder-only 推理与现代变体 | [专题总览](transformer/index.md) |
| 模型内部结构 | 模型层级、模块关系与常见内部组件 | [笔记](model-internals.md) |

## 02. Agent 工程

| 主题 | 内容 | 入口 |
| --- | --- | --- |
| 上下文管理 | 工作集、外部化检索、可恢复摘要、子 Agent 隔离、KV/Prompt Cache | [完整笔记](context-management/index.md) |
| Codex Agent Harness | 以 Codex 公开源码为案例，理解 Agent Loop、工具路由、长任务、上下文、协作与权限边界 | [完整笔记](codex-agent-harness.md) |
| RAG 与 Agent | 检索、工具调用、记忆与工作流 | [笔记](rag-agents.md) |

## 03. 训练与评测

| 主题 | 内容 | 入口 |
| --- | --- | --- |
| 训练与对齐 | 预训练、监督微调、偏好优化与强化学习 | [笔记](training.md) |
| 评测 | 能力、可靠性与系统行为的评估方法 | [笔记](evaluation.md) |

## 04. 推理与系统

| 主题 | 内容 | 入口 |
| --- | --- | --- |
| 推理与系统 | Prefill、Decode、KV Cache、量化、吞吐、延迟与成本 | [笔记](inference.md) |

## 收纳原则

```text
一个主题需要多篇递进笔记时：建立专题文件夹，例如 Transformer。
一篇完整笔记已经能覆盖一个明确问题时：保留为单篇，例如上下文管理。
需要围绕多篇论文建立研究地图时：放入论文阅读，例如 Agent 自进化与 RSI。
需要记录代码、实验和实现过程时：放入个人项目。
```

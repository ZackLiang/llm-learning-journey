# Next-Generation Agentic RL Systems：企业级自进化系统

> 论文：**[Next-Generation Agentic Reinforcement Learning Systems Enable Self-Evolving Agents](https://arxiv.org/abs/2607.01120)**  
> 作者单位：蚂蚁集团、香港科技大学、清华大学。  
> 方向：轨迹数据协议、数据代理、演化控制平面、AReaL 2.0。

## 1. 研究问题

生产 Agent 的轨迹通常来自多种工具、多个环境和不同版本的 workflow。传统 RL 系统难以直接处理：

```text
长轨迹
异构 observation
延迟反馈
权限与隐私约束
多对象同时更新
```

论文关注的不是单一奖励算法，而是：

> 企业级 Agent 如何将真实交互转化为可治理、可训练、可回滚的自进化闭环？

## 2. 三层架构

### Agent Trajectory Data Protocol

用于统一表示：

```text
状态与 observation
工具调用与参数
中间计划或推理
环境反馈与 reward
版本、权限与来源信息
```

### Data Agent

将生产轨迹转化为可用数据：

```text
过滤低质量样本
脱敏与权限控制
标注失败类型
聚合 reward
构造训练或评测样本
```

### Evolution Control Plane

决定更新对象与继承规则：

```text
Memory
Skill
Tool Harness
Prompt / Workflow
Policy Weights
```

## 3. 为什么控制平面重要

同一条失败轨迹不一定应该更新模型权重。例如：

| 失败类型 | 更可能的更新对象 |
| --- | --- |
| 工具参数错误 | Tool wrapper / Harness |
| 重复操作流程 | Skill / SOP |
| 用户偏好与上下文 | Memory |
| 系统性策略缺口 | Prompt、Workflow 或 Policy |

控制平面用于避免“所有问题都做 RL 微调”的单一化更新策略。

## 4. AReaL 2.0 的系统意义

论文以 AReaL 2.0 作为在线 Agentic RL 系统原型。阅读时的重点应包括：

- 轨迹是否支持 credit assignment；
- 线上数据如何进行质量控制；
- policy update 是否可以追溯到具体行为数据；
- 更新是否有 canary、版本比较与回滚；
- 真实生产数据与 benchmark 数据如何区分。

## 5. 阅读结论

这篇论文说明：

> Agent 自进化的瓶颈往往不只是算法，而是缺少将真实轨迹、更新对象、验证标准和回滚机制连接起来的系统控制层。

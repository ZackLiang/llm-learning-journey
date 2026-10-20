# MUSE-Autoskill：Skill 的完整生命周期

> 阅读状态：**资料卡，待深读**。当前页面基于论文身份、摘要和已核验的公开方法信息整理；尚未完成原文图表、实验设置、结果表格与消融实验的逐项解读。

> 论文：**[MUSE-Autoskill](https://arxiv.org/abs/2605.27366)**  
> 方向：长期 Skill 资产、创建、管理、评估、复用与修订。

## 研究问题

许多 Skill 方法只展示“从一次轨迹得到一个 Skill”。但在长期系统中，真正困难的是：

```text
Skill 何时创建？
Skill 如何被记录与检索？
Skill 出错时是修复、合并还是删除？
Skill 库如何避免重复、过期和冲突？
```

## 方法视角

MUSE-Autoskill 将 Skill 视为长期资产，并将其过程组织为：

```mermaid
flowchart LR
    A[Create] --> B[Store]
    B --> C[Retrieve]
    C --> D[Execute]
    D --> E[Evaluate]
    E --> F[Refine / Merge / Retire]
    F --> B
```

这种视角的价值在于把“技能生成”提升为“技能资产治理”。

## 实验阅读重点

阅读该论文时应重点确认：

- Skill 的数据结构是否包含输入输出、依赖和测试；
- 复用收益如何定义；
- 生命周期操作如何触发；
- 修订后的 Skill 是否保留历史版本；
- 库规模增长是否受到控制。

## 证据边界

生命周期框架本身不等于实际长期泛化。需要区分：

```text
Skill 管理流程完整
vs
Skill 在长期真实任务中持续提升成功率
```

## 阅读结论

MUSE-Autoskill 的主要价值是提出：

> Skill Library 是长期运行系统中的软件资产，而非一次性 Prompt 缓存；它需要与代码库类似的版本、评估、维护和退役机制。

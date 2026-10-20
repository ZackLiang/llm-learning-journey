# CoEvoSkills：在隐藏测试下共同演化 Skill 与验证器

> 论文：**[CoEvoSkills: Self-Evolving Agent Skills via Co-Evolutionary Verification](https://arxiv.org/abs/2604.01687)**  
> 研究对象：多文件 Skill Package、Skill Generator、Surrogate Verifier、隐藏 oracle 测试。  
> 关键问题：当真实测试内容不能暴露给 Agent 时，怎样让 Agent 持续修复一个由说明、脚本、配置和资源组成的复杂 Skill？

## 1. Skill Package 为什么比 Tool 更难自演化

一个 Tool 往往是单个函数：输入、输出和调用接口都清晰。一个可执行 Skill Package 则可能包括：

```text
SKILL.md 中的使用说明
多个脚本和配置文件
资源文件与目录结构
依赖约束
测试/校验逻辑
```

这导致两个困难：

1. 一次性生成多个相互依赖文件，很容易出现“单文件看起来正确、整体无法运行”；
2. 若把 hidden test 的内容直接给 Agent，会造成评测泄漏；若完全不给反馈，Agent 又无法定位失败原因。

CoEvoSkills 的思路是在两者之间增加一个 **Surrogate Verifier**：它生成可执行的替代测试和结构化反馈，但看不到真实测试的具体内容。

## 2. 原文 Figure 3：Generator 与 Verifier 的双重演化

![CoEvoSkills 原文 Figure 3：共同演化框架](../../../assets/papers/agent-self-evolution/coevoskills/process.png){ .paper-figure }

> 图源：CoEvoSkills 原文 Figure 3。图中强调 Surrogate Verifier 与真实 oracle 的信息隔离。

完整循环如下：

```text
Skill Generator 生成/修订候选 Skill Package
→ 在任务环境中执行
→ Surrogate Verifier 产生测试断言和失败诊断
→ Generator 根据诊断修复 Skill
→ hidden oracle 只返回 pass / fail
→ 若 oracle 失败，Verifier 提高测试强度并继续演化
→ 若 oracle 通过，Skill 被部署给目标 Agent
```

这里的 oracle 只暴露一个不透明的二值结果，避免 Generator 直接拟合真实答案；但它又能告诉系统“当前替代测试没有覆盖到某种失败”，推动 verifier 加强。

## 3. 方法：两种角色如何各自更新

### 3.1 Skill Generator

Skill Generator 读取当前 Skill、任务环境和已有反馈，产生新版本 \(\mathcal{S}^{(i+1)}\)。其目标是提高在 verifier 测试上的表现：

\[
\mathcal{S}^{(i+1)}
\leftarrow
\arg\max_{\mathcal{S}}
\widetilde{\mathcal{R}}\bigl(\Phi(\mathcal{S},\mathcal{E}),\mathcal{V}^{(j)}\bigr)
\]

其中 \(\Phi\) 表示在环境 \(\mathcal{E}\) 中执行 Skill，\(\mathcal{V}^{(j)}\) 是当前 surrogate 测试集。

### 3.2 Surrogate Verifier

Verifier 不是静态规则。关键触发条件是：候选 Skill 能通过 surrogate tests，但 hidden oracle 仍失败。此时说明验证器漏掉了某类错误，系统会生成更强的 \(\mathcal{V}^{(j+1)}\)。

```text
surrogate pass + oracle fail
→ verifier coverage 不足
→ 生成更有区分力的测试
→ Skill 再次修订
```

这正是“共同演化”的含义：Generator 进步会暴露 Verifier 的盲点，Verifier 的强化又为下一次 Skill 修订提供更好的信号。

## 4. 为什么信息隔离很重要

如果 Agent 能看到 hidden oracle 的详细断言，它可能只修复测试中明确出现的边角，而不是真正提高 Skill 的泛化能力。CoEvoSkills 保留如下信息边界：

| 信息 | Generator / Verifier 可见性 |
| --- | --- |
| 任务环境和命令输出 | 可见 |
| Surrogate Verifier 的断言与诊断 | 可见 |
| Hidden oracle 测试内容 | 不可见 |
| Hidden oracle 最终 pass/fail | 可见 |

这不是完全避免过拟合的保证。Verifier 仍可能逐渐学会与当前 Generator 共振；但至少真实测试细节没有直接泄露进修订提示。

## 5. 实验设置

论文在 SkillsBench 上测试复杂 Skill 包，主要考察：

- 基于 Claude Code 和 Codex 的目标 Agent 是否因 Skill 受益；
- 一次性生成、人工 Skill、现有自生成方法和 CoEvoSkills 的差异；
- 演化轮数是否持续提高 Skill 质量；
- 由一个模型生成的 Skill 是否能迁移给其他模型；
- 在不同专业领域中，人类经验与模型可执行工作流是否存在错配。

论文摘要报告 CoEvoSkills 在 Claude Code 和 Codex 上都超过五种基线，并将 Skill 转移到另外六个 LLM 上进行测试。

## 6. 演化曲线：一次生成几乎没有价值，循环验证才开始产生收益

论文 Figure 2 跟踪五轮演化的通过率，并给出三个静态对照：

| 条件 | Pass Rate |
| --- | ---: |
| No-skill baseline | 30.6% |
| Anthropic naive skill-creator | 34.1% |
| Human-curated skills | 53.5% |
| CoEvoSkills，Round 0 | 与 no-skill 接近 |
| CoEvoSkills，Round 2 | 44% |
| CoEvoSkills，Round 3 | 63% |
| CoEvoSkills，Round 5 | 75% |

### 6.1 这条曲线最重要的结论

- Round 0 接近 no-skill，说明单次生成多文件 Skill 并不可靠；
- 到 Round 3 超过人工 Skill，表明在这组任务中，验证驱动的迭代比手工预设流程更贴近目标 Agent 的实际需求；
- Round 5 收敛到 75%，论文据此主张共同演化而不是生成 prompt 本身，才是主要改进来源；
- 附录报告平均每个任务需要 4.1 次 verification cycles、2.4 次 evolution iterations，因此收益伴随现实的评测成本。

## 7. 跨模型迁移和领域分析

论文报告将 Opus 演化出的 Skill 转给六个模型后，相比各自 no-skill baseline 仍带来 `+36` 到 `+44` 个百分点的提升；在两个主要模型上，Claude Opus 4.6 为 `+40.5 pp`，GPT-5.2 为 `+40.2 pp`。

同时，模型自演化出的 Skill 对 GPT-5.2 的表现为 69.8%，高于从 Opus 转移的 65.0%。这说明：

```text
Skill 具有跨模型可移植的工作流结构
≠
不同模型完全不需要自己的适配
```

论文在 11 个专业领域中发现，自演化 Skill 在其中 9 个超过 human-curated skills；Finance 的差距为 `+56.9 pp`，Cybersecurity 为 `+23.2 pp`。这支持一个有趣但需谨慎的解释：人工写得“像人类工作流”的 Skill，未必最适合 LLM Agent 的行动模式。

## 8. CoEvoSkills 证明了什么

论文的实验支持：

1. 多文件 Skill 的一次性生成可靠性不足，需要执行反馈；
2. 在不暴露真实测试细节时，surrogate verifier 可以提供可修复的中间反馈；
3. hidden oracle 的 pass/fail 信号能够触发对 verifier 的测试升级；
4. 在 SkillsBench 的协议中，循环演化的 Skill 可超过人工 Skill 和多种基线；
5. 部分生成 Skill 可以跨模型迁移。

不能直接推出：

```text
Surrogate Verifier 一定与真实 oracle 同步改进；
所有黑盒环境都可以构造足够有效的替代测试；
轮数增加一定单调提升；
跨模型转移无需执行验证；
75% 代表真实生产任务的通用完成率。
```

## 9. 高频问题

### Q1：Surrogate Verifier 与真实 Verifier 有什么区别？

**回答：**真实 oracle 用于最终判定，但不暴露测试内容；Surrogate Verifier 是系统内部可见、可修改的替代测试器，负责提供具体失败诊断。前者保证信息隔离，后者让修订可执行。

### Q2：为什么 oracle 只给 pass/fail 也能帮助系统进化？

**回答：**当 surrogate tests 已经通过但 oracle 仍失败时，系统知道现有验证覆盖不足。这个差异会触发 verifier 生成更强测试，再让 Generator 修复被新测试暴露的问题。

### Q3：这会不会变成 Generator 和 Verifier 互相迎合？

**回答：**有这个风险。论文通过独立的 hidden oracle 和信息隔离降低风险，但不能彻底消除。真实部署仍应保留独立评测集、版本冻结和外部回归测试。

### Q4：为什么模型自演化 Skill 有时比 human-curated Skill 更好？

**回答：**人类写的流程可能符合人的习惯，却不适合特定模型的工具调用、上下文理解和代码生成方式。论文将这种差距称为 human-machine cognitive misalignment；但这一结论基于 SkillsBench，不能直接外推到所有专业工作流。

## 10. 阅读结论

CoEvoSkills 的核心启示是：

> 在无法直接访问真实答案的复杂任务中，生成能力和验证能力应一起演化；只改 Skill 而不改反馈机制，系统很容易停在“看似合理、实际不可用”的阶段。

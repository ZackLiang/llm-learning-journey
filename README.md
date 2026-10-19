# 大模型学习记录

这是我的个人大模型学习档案。

我会把学习过程中留下的内容整理在这里：

- **学习笔记**：模型结构、训练方法、推理和评测
- **前沿开源项目解读**：系统架构、源码路径、实验设计和工程取舍
- **论文阅读**：论文的问题、方法、实验、证据边界和个人理解
- **个人项目**：亲手实现、工程实践、实验结果和复盘
- **碎碎念**：阶段性想法、开放问题和学习过程中的修正

## 在线博客

[打开网页版学习博客](https://zackliang.github.io/llm-learning-journey/)

网页版由 GitHub Pages 自动发布。修改 `docs/` 下的 Markdown 并推送到 `main` 后，GitHub Actions 会自动重新构建网站。

## 仓库结构

```text
notes/             学习笔记
projects/          前沿开源项目解读
paper-notes/       论文阅读
personal-projects/ 个人项目专题
implementations/   个人项目中的亲手实现
engineering/       个人项目中的工程记录
reflections/       碎碎念
templates/         笔记模板
docs/              网页博客的内容源文件
mkdocs.yml         博客配置
```

## 当前学习路线

1. Transformer 基础与模型内部结构
2. 预训练、SFT、LoRA 和偏好优化
3. 推理、KV Cache、量化和服务系统
4. RAG、工具调用和 Agent
5. 多模态模型与 Agent 系统

## 笔记原则

这里不追求把资料改写成标准教材。每篇笔记尽量保留自己的学习痕迹：

- 我想理解什么？
- 我原来哪里理解错了？
- 论文或代码中真正关键的地方是什么？
- 哪些结论是我已经验证过的，哪些只是暂时的判断？
- 下一步还要继续看什么？

## 本地预览

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/` 或 `http://localhost:8000/blog/`。


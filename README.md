# 墨斗 Modline

> **一念成线。**

**Modline is an AI-powered thinking tool that helps users turn scattered thoughts into structured arguments.**

它不是一个替用户生成答案的写作工具，而是帮助用户完成从「碎片想法 → 观点形成 → 论证检验 → 结构化表达」的思考过程。

---

## ✦ Why Modline

面对开放性问题时，真正困难的往往不是“写不出来”，而是：

- 脑中有很多想法，但彼此关系不清楚
- 很难从碎片中形成一个明确观点
- 形成观点后，不知道论证是否完整
- AI 很容易直接给答案，但用户没有真正完成思考

因此，我尝试设计一个 AI 思考训练工具，让 AI 从 **答案生成者** 转变为 **思考过程的辅助者**。

---

## ✦ Product Flow

**P1 · 问题输入**  
识别问题类型与思考任务

↓  

**P2 · Brain Dump**  
自由记录脑中的碎片想法

↓  

**P3 · 思考工作台**  
建立想法之间的关系，并逐步形成 Current Thesis

↓  

**P4 · 论证检验**  
从限定条件、反例、隐藏前提等角度检验观点

↓  

**P5 · 输出整合**  
将经过检验的思考整理为结构化表达

---

## ✦ Core Interaction

### P3 · Thinking Workspace

使用 Force Graph 将用户的碎片想法转化为可操作的关系网络。

用户可以连接、组合和重新组织不同观点，并通过 SynNode 对多个想法进行综合，逐步形成自己的核心判断。

### P4 · Argument Inspection

P4 不继续“替用户补充内容”，而是帮助用户检查已经形成的观点。

设计参考 **Toulmin Argument Model**，从：

- Qualifier：观点成立需要什么条件？
- Rebuttal：什么情况可能挑战这个观点？
- Warrant：这个推论依赖什么隐藏前提？

等方向继续检验论证。

---

## ✦ Product & AI Design

在 Modline 的设计过程中，我主要完成：

- 用户问题与使用场景分析
- 产品流程与交互设计
- Force Graph 思考工作台设计
- Prompt / LLM API 接入
- Agent 交互逻辑设计
- MVP 测试与多轮迭代
- Bad Case 分析与功能重构

目前项目仍在持续迭代中。

---

## ✦ Status

`Prototype / MVP`

Live Demo coming soon.

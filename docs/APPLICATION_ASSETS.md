# 趣灵投递资产

日期：2026-07-08
用途：第 4 周投递资产化材料。用于简历、作品集网站、GitHub 展示和面试讲述，口径必须与 V6 MVP 收束边界一致。

## 固定定位

一句话：趣灵是一个把“有点好奇但不想正经学习”的时刻，转化成 3-5 分钟互动知识挑战的 AI 知识轻消费产品。

作品集短句：AI 生成互动知识路径，让用户用几关小游戏把一个概念玩明白。

不要讲成：AI 学习平台、知识管理系统、智能课程生成器、个人知识操作系统、重型 RAG 知识库。

## 简历项目描述

### 一行版

趣灵 - AI 知识轻消费产品：面向轻度好奇心用户，将任意概念拆解为 3-5 分钟互动知识挑战，并通过 ConceptPlan、通用 StructureSkill、KnowledgeBlueprint 和 QualityGate 约束 LLM 生成质量。

### 简历要点版

- 从 0 到 1 设计并实现 AI 知识轻消费产品“趣灵”，支持用户在 Explore 输入任意 topic，由 AI 生成四步互动 Flow，并在 Hub 记录本机完成路径，形成“输入概念 -> 生成路径 -> 闯关反馈 -> 回顾/继续探索”的 MVP 闭环。
- 设计 V6 生成链路 Topic -> ConceptPlan -> 通用 StructureSkill -> KnowledgeBlueprint -> Flow -> QualityGate，避免 LLM 直接生成页面导致的不可控输出、后台术语外露和互动目标错位。
- 抽象 8 类通用知识结构 Skill，避免为每个概念写专用逻辑；用可复用结构覆盖因果、对比、流程、权衡、分类、模拟等常见知识理解场景。
- 建立自动化 Eval 回归体系，覆盖 schema 合法性、pattern 匹配、route 质量、payload 完整性、copy safety、concept anchor、blueprint 和 skill 质量；最近本地验证中 `eval:score`、`eval:flow`、`eval:blueprint`、`eval:skills` 均为 overall = 1。
- 收束产品边界，明确暂不做账号、数据库、多端同步、社区、长期知识图谱、Always-on RAG 和概念专属 Skill，使项目从技术 demo 转为可展示、可试用、可讲述的 AI 产品闭环。

### 精简两条版

- 设计并实现 AI 知识轻消费产品“趣灵”，支持用户输入任意概念后生成 3-5 分钟互动知识挑战，完成 Explore、Flow、Follow-up、Hub 的 MVP 闭环。
- 构建 ConceptPlan、通用 StructureSkill、KnowledgeBlueprint、QualityGate 与自动化 Eval 链路，约束 LLM 内容生成，降低 schema 词外露、互动错位和动态 Flow 不稳定问题。

## 作品集卡片文案

标题：趣灵 Aha Flash

副标题：AI 生成互动知识路径，让用户用几关小游戏把一个概念玩明白。

一句说明：面向轻度好奇心用户，趣灵把“我有点想知道”转化成一个 3-5 分钟的小挑战：输入或选择一个概念，AI 会生成四步互动 Flow，用户通过选择、分类、模拟、对比等组件获得即时反馈。

标签：AI Product / LLM Generation / Interactive Learning / Eval / Next.js

亮点指标：

- V6 MVP：Explore -> Flow -> Follow-up -> Hub 闭环完成。
- 8 类通用 StructureSkill：避免概念专属 skill 膨胀。
- 15 个 Flow eval cases：`eval:flow overall = 1`。
- 32 个 score eval cases：`eval:score overall = 1`。
- 81 个 blueprint cases：`eval:blueprint overall = 1`。

按钮文案：查看项目 / 体验 Demo / 阅读案例

推荐截图顺序：

1. Explore 输入页。
2. AI 生成阶段。
3. 四步路径预览。
4. Flow 互动卡片。
5. 完成后的继续探索分支。
6. Hub 本机回顾。

本地截图目录：`output/playwright/portfolio-2026-07-08/`。

## GitHub README 摘要

可以放在 README 顶部或作品集介绍里的版本：

> 趣灵是一个 AI 知识轻消费产品。用户输入或选择一个概念后，系统会把它拆成几步可交互的小挑战，让用户在 3-5 分钟内获得“我好像懂了”的反馈。项目重点不是做重型学习平台，而是验证一种介于短视频消遣和正式学习之间的轻量体验，并通过结构化生成链路和自动化 Eval 约束 LLM 输出质量。

## 5 分钟面试讲稿

### 0:00 - 0:40 项目是什么

我做的项目叫趣灵，是一个 AI 知识轻消费产品。它服务的不是考试用户或长期笔记用户，而是轻度好奇心用户：比如用户突然想知道贝叶斯定理、DNS 解析、沉没成本、复利效应，但不想打开课程或长文章。趣灵让用户输入一个概念，AI 把它拆成 3-5 分钟的互动挑战，让用户通过几关小游戏获得一个清楚理解。

### 0:40 - 1:30 为什么不是普通学习工具

我一开始遇到的问题是，AI 很容易把内容生成成“像教材一样的解释”，或者生成成后台 schema：factor、effect、step、payload 这种词会直接暴露给用户。另一方面，如果让 LLM 直接生成整个页面，互动经常只是“动了一下”，不一定真的服务理解。所以我把项目边界收得很小：不做账号、不做知识库、不做课程系统，只验证一个闭环：打开、输入概念、生成互动路径、完成几关、获得反馈、继续探索或进入 Hub 回顾。

### 1:30 - 2:40 技术方案

技术上我没有让 LLM 直接自由生成前台页面，而是把它放进一条受控链路里。输入 topic 后，先生成 ConceptPlan，理解这个概念要学什么；然后选择通用 StructureSkill，比如因果、对比、流程、权衡、分类、模拟；再生成 KnowledgeBlueprint，把概念拆成四步；最后生成 Flow，并通过 QualityGate 检查主题贴合、互动契约、payload 完整性和前台文案质量。前端只渲染固定的互动组件，降低自由生成的不确定性。

### 2:40 - 3:40 质量保障

我给这个项目做了多层 Eval。比如 `eval:score` 检查 schema、pattern、route、payload 和 metaphor；`eval:flow` 检查完整 Flow 的可玩性、copy safety 和 concept anchor；`eval:blueprint` 检查四步知识路径；`eval:skills` 检查 8 类通用 skill。最近一次本地验证里，`eval:score` 32 cases overall = 1，`eval:flow` 15 cases overall = 1，`eval:blueprint` 81 cases overall = 1，`eval:skills` 8 skills overall = 1。

### 3:40 - 4:30 取舍和边界

我后来刻意没有继续做完整 V7、RAG、账号、社区或长期知识图谱。因为当前最重要的不是继续堆引擎，而是把它变成一个别人能打开、玩懂、看出价值的 MVP。V7 现在被我降级成质量护栏：主题是否贴合、前台文案是否像产品文案、互动是否真的帮助理解。这个取舍让项目从工程探索回到可展示产品。

### 4:30 - 5:00 结果和下一步

现在趣灵已经具备 Explore、Flow、Follow-up、Hub 的完整闭环，也有稳定示例、动态 topic 测试记录、截图证据和 Eval 结果。下一步我会继续强化 V7 质量护栏，尤其是动态生成内容的主题匹配、文案风格和互动目标一致性，但不会把它扩成重型学习平台。

## 面试追问回答

### 为什么不直接用 RAG？

趣灵当前阶段的问题不是“缺资料”，而是“如何把一个概念变成短时间可玩的理解路径”。RAG 可以作为后续事实性增强，但不是 MVP 主线。现在先用结构化生成和 Eval 控制体验闭环，等需要更强事实依据时，再做轻量 SourcePack 或 EvidencePack。

### 为什么不用每个概念一个 skill？

概念专属 skill 会让颗粒度混乱，也很难泛化。趣灵当前更需要通用结构能力：因果、对比、流程、分类、权衡、模拟等。具体概念应该被映射到这些通用结构，而不是每来一个概念就新增一套专用逻辑。

### Eval 能证明什么，不能证明什么？

Eval 能证明生成链路稳定、结构合法、互动契约完整、前台文案没有明显 schema 泄露，能降低回归风险。但它不能完全证明知识事实永远正确，也不能替代真实用户体验。因此我把 V7 定义成质量护栏，而不是宣称已经完成完整知识库。

### 项目最难的地方是什么？

最难的是把 LLM 的自由生成能力约束成稳定产品体验。单次生成一个漂亮 demo 不难，难的是让不同 topic 都能进入类似的互动闭环，并且不暴露后台词、不出现无意义互动、不把产品做成无限膨胀的学习平台。

## 表达边界

应该强调：

- AI 知识轻消费产品。
- 轻度好奇心用户。
- 3-5 分钟互动挑战。
- 结构化生成链路。
- 通用 StructureSkill，而不是概念专属 skill。
- Eval 和 QualityGate 约束 LLM 输出。
- MVP 收束和产品边界判断。

不要强调：

- 完整学习平台。
- 严肃课程系统。
- 长期知识管理。
- 个人知识操作系统。
- 完整事实知识库。
- 大规模 RAG 或复杂 agent 系统。
- 已经商业化或已验证 PMF。

## 投递使用清单

- 简历项目经历：使用“精简两条版”或“简历要点版”。
- GitHub README：使用“GitHub README 摘要”。
- 作品集卡片：使用“作品集卡片文案”和截图顺序。
- 面试准备：背熟“5 分钟面试讲稿”，追问时使用“面试追问回答”。
- 项目复盘详情：链接到 `docs/PROJECT_CASE_STUDY.md`。
# PRODUCT_V7 - 趣灵 MVP 质量护栏

## 当前状态

V7 暂不作为接下来四周的完整开发主线。

V7 原本提出的 SourcePack、EvidencePack、Grounded Skill Engine 方向长期有效，但当前阶段的主目标是把 V6 MVP 收束成可展示、可试用、可讲述的 AI 知识轻消费产品。

因此，V7 在近期被降级为“趣灵 MVP 质量护栏”。

## V7 近期只回答三个问题

1. 生成内容是否贴合用户输入的 topic？
2. 前台文案是否像产品文案，而不是 schema、backend label 或 ToB 后台语言？
3. 互动是否真的帮助理解，而不是只是动了一下组件？

## 近期允许的小切片

- 不完整开发 SourcePack。
- 不接入 EvidencePack 检索。
- 不做 always-on RAG。
- 不建设内部 Wiki。
- 不新增概念专属 Skill。
- 只针对固定验证概念整理手工检查标准或轻量 SourcePack 草案。
- 只修直接影响用户体验和作品集展示的质量问题。

## 长期有效方向

当 V6 MVP 展示闭环稳定后，V7 可以重新展开为 Grounded Skill Engine：

```text
User topic
  -> SourcePack
  -> ConceptPlan
  -> KnowledgeBlueprint
  -> Generic Structure Skill
  -> Pattern Plan
  -> UISchema
  -> QualityGate
  -> Flow or honest failure
```

SourcePack 的长期职责：

- 固定概念定义。
- 固定核心术语。
- 固定关键关系。
- 固定公式和适用边界。
- 固定常见误区。
- 为后续 ConceptPlan 和 QualityGate 提供可检查依据。

## Generic Skill 边界

V7 仍坚持通用 Skill，而不是概念专属 Skill。

允许的 Skill 方向：

- concept-grounding-skill
- formula-explainer-skill
- system-modeling-skill
- comparison-teaching-skill
- causal-reasoning-skill
- procedure-teaching-skill
- copy-polish-skill
- quality-gate-skill

不做：

- linear-programming-skill
- sunk-cost-skill
- dns-skill
- compound-interest-skill
- 任何按单一概念命名的长期专用 Skill

## 质量指标

V7 质量护栏关注四个用户可见指标：

1. 正确率：定义、公式、例子和关键关系不明显错误。
2. 匹配率：标题、卡片、提示和反馈确实围绕用户输入 topic。
3. 文案风格：不出现 raw English schema label、后台术语、尴尬直译和 ToB 语气。
4. 交互清晰度：用户知道自己为什么要点、拖、选、排，并能看到反馈。

## 第一批验证概念

稳定示例：

- 贝叶斯定理
- DNS 解析
- 期权风险
- 工业革命
- 通胀与通缩

动态测试：

- 线性规划
- 复利效应
- 沉没成本
- 边际效用
- 缓存机制
- 监督学习 vs 无监督学习
- 操作系统进程
- 供需曲线
- 因果推断
- 资本主义 vs 社会主义

## 暂不做的证据层

V7 后续可以考虑 EvidencePack，但近期不接检索。

原因：

- 当前最重要的是作品集闭环和前台体验。
- always-on RAG 会引入成本、延迟、来源策略、引用 UI 和更多失败面。
- V6 的主要问题不是没有海量知识，而是用户可见文案、互动匹配和质量边界需要收束。

EvidencePack 仅在未来需要事实、日期、公式、时效信息或外部权威来源时再进入设计。

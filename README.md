# 趣灵 aha-flash

趣灵是一个 AI 知识轻消费产品：把用户“有点好奇但不想正经学习”的时刻，转化成 3-5 分钟的互动知识挑战。

用户输入或选择一个概念，系统会把它拆成几步可交互的小挑战，让用户在短时间内获得“我好像懂了”的反馈。

## 当前版本

当前可展示版本：V6 MVP。

V6 MVP 已完成的主链路：

```text
打开 Explore
  -> 输入或选择一个概念
  -> AI 展示真实生成阶段
  -> 生成四步互动路径预览
  -> 进入 Flow 闯关
  -> 完成后出现后续分支
  -> Hub 记录本机完成路径
```

这不是正式课程平台，也不是个人知识库。趣灵当前只服务一件事：让轻度好奇心用户用几关小游戏把一个概念玩明白。

## 在线体验

- 线上地址：`https://www.krie.me`
- 本地默认地址：`http://localhost:3000`

## 核心能力

- 自由输入任意 topic，由 AI 生成互动路径。
- 五个稳定示例 topic 作为低风险入口。
- 四步 Flow 播放器，每次只呈现一个互动组件。
- ConceptPlan、通用 Structure Skill、KnowledgeBlueprint、QualityGate 约束 LLM 输出。
- Hub 记录本机完成路径，做轻量回顾。
- Eval 体系用于证明动态生成不是随机拼接。

## 稳定示例

- 贝叶斯定理
- DNS 解析
- 期权风险
- 工业革命
- 通胀与通缩

## 第一批动态测试概念

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

验收标准不是“讲得像教材”，而是：主题贴合、互动动作合理、文案不像后台术语、用户能在 3-5 分钟获得一个清楚理解。

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

常用检查：

```bash
npm run lint
npm run typecheck
npm run build
npm run eval:score
npm run eval:flow
npm run eval:blueprint
npm run eval:skills
```

真实 LLM 动态链路检查：

```bash
npm run eval:flow-live -- --limit=8 --runs=3 --strict --threshold=1
```

需要配置 DeepSeek API Key 才能跑真实 live eval。

## 文档

- `docs/MVP_SCOPE.md`：当前 MVP 边界和四周收束计划。
- `docs/PRODUCT.md`：产品定位、用户、体验和质量标准。
- `docs/TECHNICAL.md`：技术架构、生成链路、QualityGate 和 Eval。
- `docs/CHANGELOG.md`：开发记录和验证结果。
- `docs/input-docs/PRODUCT_V7.md`：V7 质量护栏规划，非近期完整开发主线。

## 不做什么

未来四周不做账号、数据库、多设备同步、社区、创作者后台、长期知识图谱、Always-on RAG、内部 Wiki、大规模 EvidencePack、付费商业化，也不为每个具体概念创建专用 Skill。

当前主线只有一个：把趣灵收束成可展示、可试用、可讲述的 AI 知识轻消费产品。

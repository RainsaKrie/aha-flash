# Round 4 平台化转型规划

## 目标

把趣灵从“单次输入生成互动组件”的工具，升级为“探索页 ToC + 创作者工作台 Studio + 个人图鉴 Hub + Pattern Skills 引擎”的交互式知识平台。

Round 4 采用增量重构，不推翻现有 10 个 Pattern、Tool Calling、Schema fallback、状态记忆和组件注册体系。

## 三位一体平台

- Explore：面向普通用户的探索页，展示精选知识 Flow、轻量知识图谱和“自己生成”入口。
- Studio：面向创作者和高级用户的生成工作台，承接当前首页输入生成体验。
- Hub：面向个人学习资产的图鉴页，展示已完成 Flow、已学概念、收藏和点亮进度。

## Phase 1：视觉与组件底座

- 引入 `framer-motion`，仅用于 Flow 切换、角色情绪反馈、奖励和完成动画。
- 在 V2 Schema 增加 optional `visual_asset` 字段，用于匹配插画、emoji theme 和轻动画。
- 建立本地 `visualAssetRegistry`，先覆盖 10 个 Pattern 默认资源。
- 升级趣灵角色提示为状态组件，覆盖 idle、loading、success、error、reward。
- 保持现有 Generative UI 组件业务逻辑不变，只接入统一视觉资源和奖励入口。

## Phase 2：Explore 与 Flow

- 新建 `/explore`，作为默认主体验。
- 先写死 3 组 `KnowledgeFlow` mock 数据：贝叶斯入门、半导体通识、宏观经济入门。
- 实现 Flow 容器：单次展示一个互动组件，完成后出现下一关入口，切换使用 motion 过渡。
- 实现轻量知识图谱入口：静态节点点击进入对应 Flow，不引入图数据库。
- 首页保留“自己生成”入口，跳转 `/studio`。

## Phase 3：Studio 与 Hub

- 新建 `/studio`，迁移当前首页生成工作台体验。
- Studio 增加“保存草稿”和“发布到探索页”的前端 mock 行为。
- 新建 `/hub`，展示已完成 Flow、已学概念、收藏和点亮进度。
- `/sandbox` 短期保留兼容入口，文案导向知识图鉴，后续逐步复用 Hub 组件。

## 非目标

- 不做真实社区后端。
- 不做账号系统。
- 不做审核后台。
- 不做生产级发布流。
- 不重写 10 个 Pattern 组件。

## 验收标准

- `/explore` 首屏展示精选 Flow、知识图谱入口和 Studio 入口。
- `/studio` 能完整跑通输入、生成、交互和下一步推荐。
- `/hub` 有合理空态和已学资产展示。
- 旧 Schema 不带 `visual_asset` 时仍能正常渲染。
- 移动端下 Flow、输入栏、奖励反馈不重叠。
- `npm run typecheck`、`npm run build`、`npm run eval:score` 通过，固定回归评分不下降。

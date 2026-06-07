# 趣灵 aha-flash — 迭代归档

> 文档定位：归档已经完成的开发任务、验收记录和重要修复。新的增量规划先放入 `docs/input-docs/`，整合后再开发。

---

## 2026-06-07

### 文档体系收敛

完成：
- 将原本分散的产品、架构、实施、Backlog 和设计规范合并为 `PRODUCT.md` 与 `TECHNICAL.md` 两份核心文档。
- `PRODUCT.md` 统一维护产品定位、核心体验、功能边界、设计质量标准和当前路线。
- `TECHNICAL.md` 统一维护架构、Schema、状态、对话生命周期、工具边界、验证命令和技术债。
- `docs/README.md` 改为文档中心，只保留核心文档索引和增量文档工作流。
- 新增 `docs/input-docs/README.md`，明确后续用户新增规划统一放入 `docs/input-docs/` 根目录。
- 将旧输入材料归档到 `docs/input-docs/archive/legacy-2026-06-07/`，避免和后续新文档混淆。

规则：
- 以后开发前先读取 `docs/input-docs/` 的新增文档。
- 先分辨新增、重复、过期和仅归档内容。
- 先合并进 `PRODUCT.md` / `TECHNICAL.md` / `CHANGELOG.md`，再开始编码。

验证：
- 核心文档索引已切换到新结构；旧文件名只保留在历史记录和归档材料中。

---

### 文档目录整理

完成：
- 新建 `docs/`，将根目录长期文档统一迁入。
- 将外部输入材料归入 `docs/input-docs/`。
- 更新 `docs/README.md` 和 `docs/PRD.md` 的文档索引。

---

### Design Spec 基础层改造

完成：
- 新增并采用 `DESIGN_SPEC.md` 作为互动组件质量规范。
- `shared.tsx` 增加 Pattern 主色映射、进入动画包装、深度切换条、统一面板/反馈/进度微交互。
- `registry` 统一包裹所有生成组件，自动注入 Pattern 主题色、进入动画、深度切换和错误边界。
- 首页支持组件内深度切换事件，点击快懂/场景/映射会按当前概念重新请求对应深度 Schema。
- 全局 CSS 增加三层表面色、按钮按压、结果揭示、数值弹入、成功闪烁、失败抖动等动画。
- Prompt 补充 payload 最少内容量、数组最少项数和每个 Pattern 的第二条反例约束。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 验证组件顶部深度切换条已出现

### Design Spec 核心组件精修

完成：
- `gacha-simulator` 按规范统一圆角、间距、语义呼吸动画、操作高亮、结果区入场和余额数值弹入。
- `slider-explorer` / `dual-slider-explorer` 改为仪表式参数面板，输出卡片和解释区使用统一 raised/panel 层级。
- `quiz-battle` 调整题目层级和选项间距，匹配共享反馈动画。
- `narrative-branch` 迁移到 `ComponentFrame`、`ChoiceButton`、`FeedbackPanel`，补齐空态和结果揭示反馈。
- 全局增加 `.ui-breathe` 语义动画，替代组件内直接使用 `animate-pulse`。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 验证默认期权组件正常渲染

### Design Spec 记忆/时间线/分类精修

完成：
- `card_flip` 清理标题层级，翻转内容加入结果揭示动画。
- `card_grid_match` 统一 select 控件、圆角、间距，并为正确/错误匹配增加闪烁/抖动反馈。
- `vertical_timeline` 清理非规范间距。
- `quiz_combo_chain` 统一问题层级、选项间距和 combo 数值弹入。
- `classification_sort` 迁移到 `ComponentFrame`、`ChoiceButton`、`FeedbackPanel`、`ProgressMeter`，补齐空态、进度、正确/错误反馈和结果回顾。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 验证分类组件正常渲染

---

### 组件质量第二阶段

完成：
- 新增 `src/components/generative-ui/shared.tsx`，提供统一组件外壳、深度标签、面板、反馈面板、进度条、选项按钮、空态和组件级错误边界。
- `registry` 接入组件错误边界，单个互动组件渲染失败时展示可重试降级，不再拖垮整个工作台。
- `concept_memory`、`knowledge_check`、`process_timeline` 相关旧组件接入统一标题区、深度标签、空态、进度和选中/正确/错误反馈。
- 所有组件 config 类型统一支持 `depth`，匹配 registry 注入学习深度的运行时行为。
- `SCHEMA_REFERENCE` 增加跨 Pattern 的交互质量、视觉密度、空态规避规则，并为各 Pattern 补充视觉指导。
- 扩展隐喻映射表，覆盖内容创作、软件工程、产品设计、投资、教育、法律、医学、运动和更多游戏兴趣域。

验证：
- `npm run typecheck`
- `npm run lint`

---

### 组件质量第一阶段

完成：
- `comparison/split_panel` 支持维度式对比：主题 A/B、维度按钮、差异说明和总结，不再依赖无意义的顶部比例滑条。
- `parameter_explore/slider` 和 `parameter_explore/dual_slider` 支持 schema 驱动输出指标与分段洞察，避免所有概念都被硬编码成平方成本示例。
- `classification/sort` 增加即时正确/错误反馈、解释文案和已回答回顾。
- `system_builder/module_sandbox` 和 `system_builder/flow_connect` 支持必要模块、期望顺序、连接关系和完成反馈。
- 扩展 `src/types/schema.ts`、Zod 校验、mock schema 和 Prompt SCHEMA_REFERENCE，使 LLM 输出具备更明确的视觉与交互约束。

验收：
- 股票 vs. 期权 mock 渲染为多维对比卡片，包含“你拥有什么 / 先付成本 / 亏损边界 / 时间限制”维度切换。
- Prompt 约束明确要求对比优先给出 dimensions，参数探索给出 outputs / insight_rules，系统构建给出 required_module_ids / expected_sequence。
- DeepSeek 输出未通过组件约束时，页面仍能稳定落到 mock 兜底组件并展示可测试状态。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 生产服务快照验收

---

## 2026-06-06

### 文档与代码整理

完成：
- 新增 `README.md`，作为项目入口、快速开始和文档索引。
- 精简 `IMPLEMENTATION.md`，只保留当前状态、路线、工作流和环境变量。
- `ARCHITECTURE.md` 不再重复维护 Pattern 表，改为指向代码侧 `SCHEMA_CATALOG`。
- 代码侧合并学习深度标签配置，并从单一 Schema catalog 派生 V1/V2 映射。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run eval:score`

### 产品纠偏 — 输入入口

完成：
- 将 YouTube URL / 网页 URL 粘贴从主路径降级为辅助入口。
- PRD 补充自然导入方向：截图/图片、音频/视频文件、剪贴板内容、系统分享入口。
- 首页输入框文案改为鼓励输入概念、问题或直接粘贴看到的内容。
- 架构文档明确 `youtube_transcript_fetch` 只服务用户明确提供 URL 的场景。

原因：
- 用户在外部看到视频、音频或图片时，真实动作通常不是复制链接再粘贴回来。
- URL 抓取仍有价值，但只适合低频高级入口或技术兜底。

### Phase 5 — 外部集成

完成 T13-T14：联网搜索 Tool 与 source-router 调整。

新增：
- `web_search` tool
- Brave / Google / Tavily 多 provider 搜索链
- `WEB_SEARCH_PROVIDER`、`BRAVE_SEARCH_API_KEY`、`GOOGLE_SEARCH_API_KEY`、`GOOGLE_SEARCH_ENGINE_ID`、`TAVILY_API_KEY` 环境变量
- 纯文本外部信息请求的搜索触发规则
- 聊天消息来源展示支持“搜索”

行为：
- 输入包含 URL 时，继续走 `web_content_extract` 或 `youtube_transcript_fetch`。
- 输入不含 URL、但包含“最新/最近/当前/新闻/看法/观点/价格/政策/巴菲特”等外部信息信号时，触发 `web_search`。
- 默认 `WEB_SEARCH_PROVIDER=auto`，按 Brave -> Google -> Tavily 顺序尝试，以优先使用免费或便宜渠道。
- 搜索结果只作为 Prompt 上下文注入，不写入长期状态，不保存全文。
- 未配置搜索 API key 时返回可控失败，并在聊天来源中显示“读取失败 · 搜索”。

验收：
- `/api/tools` 调用 `web_search` 在无 key 时返回 `TAVILY_API_KEY is not configured`，不报 500。
- `/api/chat` 输入“巴菲特对期权的最新看法”会返回 `sources[0].type = "search"`。
- `/api/chat` 输入 URL 时返回 `type = "web"`，不误触发 search。
- 页面提交搜索类问题后，聊天消息展示“读取失败 · 搜索 · 巴菲特对期权的最新看法”。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测
- Playwright 生产服务页面快照验收

### Phase 4 — 知识沙盒体系

完成 T09：知识资产存储。

新增：
- `UserState.knowledge_assets`
- `KnowledgeAsset` 类型
- `stateStore.addKnowledgeAsset()`
- `/api/chat` 在知识类对话生成后写入概念资产
- System Prompt 注入最近知识资产
- 首页侧栏展示已学概念数量和最近概念

验收：
- 输入“期权是什么？用我能听懂的方式讲。”后，状态写入 `concept: "期权"`。
- 重复学习同一概念时，`knowledge_assets` 数量保持 1，旧资产被覆盖。
- 页面侧栏从“已学 0”更新为“已学 1”，并展示“期权”。
- 泛化表达“我能听懂的方式”不再被写入 `metaphor_preferences`。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测和 Playwright 页面快照验收

完成 T10：知识链推荐。

新增：
- Schema 支持可选 `next_concepts`
- Zod 校验支持 V1/V2 推荐链字段
- Prompt 输出规范要求知识讲解类请求给出 1-2 个后续概念
- 期权 mock 示例推荐“期货”和“保险”
- 首页工作台在组件下方展示“下一步”推荐卡片
- 点击推荐卡片会带着关系说明触发下一轮学习

验收：
- 输入“期权是什么？用我能听懂的方式讲。”后，工作台底部显示“期货”“保险”。
- 点击“期货”后触发下一轮学习，对话中出现“期货是什么？它和刚才的关系是...”。
- 用户状态中已学概念从“期权”更新为“期货、期权”。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测
- Playwright 生产服务页面快照验收

完成 T12：`/sandbox` 知识沙盒页面。

新增：
- `src/app/sandbox/page.tsx`
- 首页状态面板新增“知识沙盒”入口
- 沙盒页读取当前匿名用户状态
- 已学概念按 `topic_area` 分组展示
- 概念卡片展示 concept、pattern、template、理解深度和学习时间
- 沙盒页统计已学概念数、覆盖的交互模式数和深入理解数量

验收：
- 通过 `/api/chat` 生成“期权”“算法复杂度”“沉没成本”三个知识资产。
- 进入 `/sandbox` 后可看到 3 张概念卡片。
- 卡片展示 pattern、template、理解深度。
- 页面按“金融”“认知”等主题分组展示。
- 首页状态面板可看到并进入“知识沙盒”入口。

验证：
- `npm run typecheck`
- `npm run build`
- Playwright 生产服务页面快照验收

完成 T11：深度分级。

新增：
- Schema 支持顶层 `depth: rapid | scenario | mapping`
- `/api/chat` 接收 `depth`，并注入 Prompt 的 `<target_depth>`
- 首页输入区新增“快懂 / 场景 / 映射”三段深度切换
- 首页状态面板展示当前输出深度
- `probability` 期权示例按三档生成不同标题、说明、交互目标和反馈文案
- `narrative_branch` 沉没成本示例按三档生成不同开场、分支目标和洞察文案
- 知识资产理解深度按 `rapid -> shallow`、`scenario -> moderate`、`mapping -> deep` 写入

验收：
- 同一“期权”输入在三档下返回不同标题和不同交互目标。
- 同一“沉没成本”输入在三档下返回不同开场长度、分支洞察和理解深度。
- 页面切到“映射”后生成期权，工作台显示“期权 · 隐喻映射版”和“目标：把抽卡动作逐项对应到期权原理。”
- 状态摘要和知识资产深度与当前 depth 保持一致。

验证：
- `npm run typecheck`
- `npm run build`
- API 三档复测
- Playwright 生产服务页面快照验收

### Phase 6 — 质量体系

完成 T15-T17：测试用例集、Schema 评分脚本、Prompt 对比工具。

新增：
- `tests/fixtures/test-cases.json`
- `tests/eval/lib.ts`
- `tests/eval/score.ts`
- `tests/eval/compare.ts`
- `npm run eval:score`
- `npm run eval:compare`

覆盖：
- 14 条固定 case
- 全部 10 个 Pattern
- `rapid/scenario/mapping` 三档深度
- `knowledge/preference/casual` 三类意图

评分维度：
- JSON 合法率
- Pattern 准确率
- Template 准确率
- Depth 准确率
- Route 准确率
- 隐喻关键词贴合度
- Payload 完整度

验收：
- `npm run eval:score` 默认输出摘要，mock 基线总分为 1。
- `npm run eval:score -- --json` 可输出完整逐 case JSON。
- `npm run eval:compare -- <baseline.json> <candidate.json>` 可比较两个预测文件。
- compare 工具兼容 Windows UTF-8 BOM 临时文件。

验证：
- `npm run eval:score`
- `npm run eval:compare -- <temp-baseline.json> <temp-candidate.json>`
- `npm run typecheck`
- `npm run build`

---

## 2026-06-05

### 项目命名与仓库

- 中文名确定为“趣灵”。
- 英文名和仓库名确定为 `aha-flash`。
- 初始化 Git 仓库并推送到 GitHub：`https://github.com/RainsaKrie/aha-flash.git`。

### Phase 1 — Stateful Memory

完成：
- T01 LLM 语义意图分类
- T02 `update_user_state` Tool
- T03 回合制状态提炼

验收：
- “期权是什么”归类为 `knowledge`。
- “我是会计，爱钓鱼，之后用钓鱼讲金融概念”归类为 `preference`。
- 用户状态可写入背景、爱好、知识盲区和隐喻偏好。

### Phase 2 — Schema 协议重构

完成：
- T04 Schema 三层类型定义
- T05 Prompt 模板重写
- T06 组件注册表升级

结果：
- 新协议为 `pattern + template + payload`。
- V1 flat schema 仍兼容。
- 注册表支持二维查找。

验收：
- “算法复杂度是什么？用滑块让我感受一下。”返回 `parameter_explore/single_slider`。
- 页面侧栏显示 `parameter_explore/single_slider`，工作台渲染滑块组件。

### Phase 3 — 交互模式扩展

完成 T07：新增 3 种交互模式。

新增：
- `narrative_branch/branch_story`
- `classification_sort/category_buckets`
- `simulation_play/parameter_simulation`

验收：
- “沉没成本是什么意思？用一个分支故事讲。”返回 `narrative_branch/branch_story`。
- “价值投资和成长投资怎么分？让我做分类。”返回 `classification_sort/category_buckets`。
- “复利怎么滚起来的？做一个模拟推演。”返回 `simulation_play/parameter_simulation`。
- 页面点击“复利”可渲染滚雪球模拟组件。

完成 T08：既有 7 种模式各新增 1 个骨架变体。

新增：
- `probability/spin_wheel`
- `parameter_explore/dual_slider`
- `concept_memory/grid_match`
- `process_timeline/vertical_scroll`
- `comparison/overlay_fade`
- `knowledge_check/combo_chain`
- `system_builder/flow_connect`

验收：
- 七个变体输入均能通过 `/api/chat` 返回预期 template。
- 页面输入“股票和期权有什么区别？用叠加淡入对比。”可渲染 `comparison/overlay_fade`。

### 部署修复

问题：
- Vercel 部署页打开后显示“状态初始化失败”。

原因：
- 早期状态存储写入 `process.cwd()/data/states`。
- Vercel Serverless 运行时不能写项目目录。

修复：
- 本地开发继续写 `data/states`。
- Vercel demo 写 `/tmp/aha-flash/states`。
- 新增 `AHA_FLASH_STATE_DIR` 覆盖入口。

注意：
- `/tmp` 不提供长期持久化。
- 生产记忆应迁移到 Vercel KV、Postgres、Redis 或其他数据库。

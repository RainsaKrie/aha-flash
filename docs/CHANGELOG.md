# 趣灵 aha-flash — 迭代归档

> 文档定位：归档已经完成的开发任务、验收记录和重要修复。新的增量规划先放入 `docs/input-docs/`，整合后再开发。

---

## 2026-06-08

### Round 3 MVP 1.0 收束规划

- 读取并采纳 `docs/input-docs/BACKLOG_ROUND3.md`。
- 将 MVP 1.0 交付标准、T30-T39 任务清单和执行顺序整合进 `PRODUCT.md`。
- 将 Pattern Tool Calling、三重兜底、Prompt 简化、成本优化和安全部署目标同步进 `TECHNICAL.md`。
- T30 已完成：新增 `src/lib/tools/generative-tools.ts`，定义 10 个 Pattern Tool、默认 Template 映射和 Tool 调用结果转 V2 Schema helper。
- T31 已完成：`/api/chat` 优先使用 AI SDK Tool Calling 选择 `generate_*` Pattern Tool；Tool 失败时保留现有 JSON fallback，最终仍可 mock fallback。

## 2026-06-07

### P7 分段生成状态

完成：
- `/api/chat` 支持 `stream: true`，返回 NDJSON 阶段事件流。
- 服务端在读取状态、识别追问、整理 Prompt、生成组件、校验 Schema、更新记忆和完成时推送阶段事件。
- 首页读取流式响应并实时更新 loading 文案，最后收到完整 payload 后渲染互动组件。
- 保留非流式 JSON 兼容路径。
- P7 标记为完成。

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`

---

### P7 反馈与知识卡导出

完成：
- 首页当前组件下方新增“有帮助 / 不准确”轻量反馈。
- 反馈通过 `/api/interaction` 写入用户状态摘要，用于后续调整隐喻与组件生成。
- 知识沙盒单张概念卡支持导出 Markdown 知识卡。
- `PRODUCT.md` 当时记录：错误边界、反馈调优、知识卡片导出已完成，流式生成随后推进。

验证：
- `npm run typecheck`
- `npm run build`

---

### 对话记忆短期窗口与追问线程

完成：
- `/api/chat` 支持接收最近 6 条轻量消息作为短期窗口，只用于本轮 Prompt。
- 新增追问检测：当前线程存在时，识别“继续、刚才、为什么、怎么、展开”等延续表达；有模型时可由 LLM 轻量判别，规则兜底。
- Prompt 注入 `recent_messages`、`thread_context` 和历史 `thread_summaries`，要求追问时延续同一隐喻体系。
- 用户状态新增 `current_thread` 和 `thread_summaries`；同概念追问累加线程深度，换题时归档短摘要。
- 偏好设置和闲聊不打断当前学习线程。
- P6 对话记忆升级标记为完成。

验证：
- `npm run typecheck`
- `npm run build`

---

### 组件质量收口

完成：
- 删除首页不再使用的旧聊天历史、聊天消息和思考指示组件。
- 旧聊天式消息流不再作为产品主界面的一部分，避免与互动组件舞台竞争注意力。
- P1 组件视觉、状态和交互质量阶段标记为完成。

验证：
- 残留扫描确认旧聊天组件无引用。
- `npm run typecheck`
- `npm run build`

---

### 文档体系收敛

完成：
- 将原本分散的产品、架构、实施、Backlog 和设计规范合并为 `PRODUCT.md` 与 `TECHNICAL.md` 两份核心文档。
- `PRODUCT.md` 统一维护产品定位、核心体验、功能边界、设计质量标准和当前路线。
- `TECHNICAL.md` 统一维护架构、Schema、状态、对话生命周期、工具边界、验证命令和技术债。
- `docs/README.md` 改为文档中心，只保留核心文档索引和增量文档工作流。
- 新增 `docs/input-docs/README.md`，明确后续用户新增规划统一放入 `docs/input-docs/` 根目录。
- 审查旧输入材料，已整合或无独立追溯价值的内容不再留档。

规则：
- 以后开发前先读取 `docs/input-docs/` 的新增文档。
- 先分辨新增、重复、过期和仅归档内容。
- 先合并进 `PRODUCT.md` / `TECHNICAL.md` / `CHANGELOG.md`，再开始编码。
- 已整合、重复、过期或无独立追溯价值的输入直接删除；只有仍有来源追溯价值的材料才进入 `archive/`。

验证：
- 核心文档索引已切换到新结构；无用历史输入已删除。

---

### 产品设计规范补充

完成：
- 将新增 `DESIGN_SPEC` 中的页面信息架构合并进 `PRODUCT.md` 和 `TECHNICAL.md`。
- 当前首页目标改为 48px 顶栏、居中交互组件舞台、底部固定输入栏。
- 首页不再以侧栏状态面板、状态摘要和对话历史作为主信息架构。
- 深度交互目标改为“看一眼 → 试一下 → 拆开看”的渐进式引导，不再在输入前展示三档按钮组。
- 增补“通用语打底，领域语翻译”的隐喻语言原则。

---

### 首页布局与深度引导改造

完成：
- 首页从“侧栏 + 工作台”改为顶栏、居中组件舞台、底部输入栏三段式布局。
- 移除首页可见的当前状态调试面板、状态摘要面板和对话历史面板。
- 移除 body 网格背景，降低页面装饰对交互组件的干扰。
- 输入栏移到底部，删除输入前的深度三按钮和示例按钮。
- `registry` 不再在组件顶部渲染三档深度切换。
- 组件完成交互后，底部浮现下一档深度引导：看一眼后提示“代入真实场景试试”，试一下后提示“拆开看看原理”。
- 下一步概念推荐移动到组件下方/输入框上方的内联引导区。

验证：
- `npm run typecheck`
- `npm run build`
- Playwright 快照确认首页为顶栏、空态舞台、底部输入栏，无侧栏/对话历史残留。

---

### Design Spec 剩余组件精修

完成：
- `system_builder/module_sandbox` 接入统一组件外壳、选项按钮、进度条、反馈面板和空态。
- `system_builder/flow_connect` 接入统一组件外壳、流程路径面板、选项按钮、进度条和错误顺序反馈。
- `simulation_play/parameter_simulation` 接入统一组件外壳、参数面板、进度条、结果反馈和标准控制区。
- `comparison/split_panel` 迁移到统一组件外壳，清理旧圆角、非规范间距和 `text-lg` 标题。
- `comparison/overlay_fade` 迁移到统一组件外壳和面板层级。
- `probability/spin_wheel` 迁移到统一组件外壳和反馈面板，转盘颜色改为 Pattern 变量驱动。
- 输入基础组件清理硬编码圆角和背景色。
- 移除 `animate-pulse` 残留，统一使用 `ui-breathe`。

验证：
- `npm run typecheck`
- `npm run build`

---

### 内容质量与隐喻推理补充

完成：
- 将完整 `DESIGN_SPEC` 中的颜色、字号、间距、圆角、动效参数和可及性规则补充进 `PRODUCT.md` 与 `TECHNICAL.md`。
- `src/types/schema.ts` 新增 `MetaphorTrace`，所有组件 payload 类型通过 `ComponentDepthConfig` 支持可选 `metaphor_trace`。
- `schema-validator` 允许所有 V2/V1 payload 携带 `metaphor_trace` 调试字段。
- `prompt-templates.ts` 将隐喻规则改为“通用语打底，领域语翻译”。
- `OUTPUT_FORMAT_RULES` 增加隐喻推理流程：拆动作、找机制、验映射、统一术语、给具体对应物。
- Prompt 要求 payload 输出 `metaphor_trace`，前端不渲染，仅用于调试、评估和回归。

验证：
- `npm run typecheck`
- `npm run build`

---

### 隐喻一致性评估

完成：
- `tests/eval/lib.ts` 新增 `metaphor_consistency` 维度。
- 评分会检查 `metaphor_trace` 是否包含核心动作、来源领域、候选机制、至少 2 条映射验证和至少 2 个统一术语。
- 无预测文件时 mock 基线仍可作为满分基准；候选预测缺少 `metaphor_trace` 会被扣分。
- `tests/eval/score.ts` 和 `tests/eval/compare.ts` 输出隐喻一致性均值和差异。

验证：
- `npm run eval:score`
- `npm run typecheck`
- `npm run build`

---

### 搜索与 URL 路由清理

完成：
- `/api/chat` 移除 `collectSourceContexts()` 和 `source_context` Prompt 注入。
- 删除 `source-router`、`web-search`、`web-extractor`、`youtube-transcript` 工具实现。
- `V1_TOOLS` 只保留 `update_user_state`。
- 移除 `youtube-transcript`、`jsdom`、`@mozilla/readability` 等不再使用的依赖。
- 清理聊天消息中的 `sources` 字段和旧来源展示。
- Prompt 输出规范不再引用 `<source_context>`。
- `TECHNICAL.md` 更新为纯文本概念输入主链路。

验证：
- `npm install`
- `npm run typecheck`
- `npm run build`

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

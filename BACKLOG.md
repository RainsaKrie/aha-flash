# 趣灵 aha-flash V2 — 迭代任务清单

> 供 Codex 执行。每条任务包含：目标 / 涉及文件 / 验收标准 / 前置依赖。

---

## 当前迭代状态

| 任务 | 状态 | 说明 |
|---|---|---|
| T01 LLM 语义意图分类 | ✅ 已完成 | `conversation-router.ts` 已支持 LLM 分类 + 规则 fallback，输出 `{ route, confidence, reason, source }` |
| T02 `update_user_state` Tool | ✅ 已完成 | 已注册 `update_user_state`，服务端注入 `user_id` 后增量合并背景、爱好、知识盲区、隐喻偏好 |
| T03 回合制状态提炼 | ✅ 已完成 | `/api/chat` 每轮生成后执行 LLM/规则反思，写回 `profile_patch`、`understanding_level`、`summary` |
| T04 Schema 三层类型定义 | ✅ 已完成 | `UISchema` 支持 V1 flat 与 V2 `pattern/template/payload`，并通过 `normalizeUISchema()` 兼容渲染 |
| T05 Prompt 模板重写 | ✅ 已完成 | Prompt 已改为“选模式 → 选骨架 → 填参数”，Schema 参考按 Pattern 分组并包含正反例 |
| T06 组件注册表升级 | ✅ 已完成 | 注册表按 `PatternType + TemplateId` 查找组件，V1 会自动映射到默认 V2 骨架 |
| T07 新增 3 种交互模式 | ✅ 已完成 | 已接入 `narrative_branch`、`classification_sort`、`simulation_play`，含类型、Zod、Prompt、注册表、mock 与组件 |

**最近验收**：
- 输入“期权是什么”可归类为 `knowledge`
- 输入“我是会计，爱钓鱼，之后用钓鱼讲金融概念”可归类为 `preference`
- `User_State.json` 会写入 `background: "会计"`，`hobbies` 增加 `"钓鱼"`，`metaphor_preferences` 增加 `"钓鱼"`
- `npm run typecheck` 与 `npm run build` 通过
- 输入“算法复杂度是什么？用滑块让我感受一下。”返回 V2 Schema：`parameter_explore/single_slider`
- 页面侧栏显示 `parameter_explore/single_slider`，工作台渲染滑块组件
- 输入“沉没成本是什么意思？用一个分支故事讲。”返回 `narrative_branch/branch_story`
- 输入“价值投资和成长投资怎么分？让我做分类。”返回 `classification_sort/category_buckets`
- 输入“复利怎么滚起来的？做一个模拟推演。”返回 `simulation_play/parameter_simulation`
- 页面点击“复利”可渲染滚雪球模拟组件，侧栏显示 `simulation_play/parameter_simulation`

---

## 依赖拓扑

```
Phase 1 (Stateful Memory)
├── T01 意图分类
├── T02 特征提取 Tool
└── T03 状态提炼
      │
      ▼
Phase 2 (Schema 协议重构)
├── T04 Schema 三层协议
├── T05 Prompt 模板重写
└── T06 组件注册表升级
      │
      ├──▶ Phase 3 (模式扩展)
      │    ├── T07 新增 3 种交互模式
      │    └── T08 现有模式骨架变体
      │
      ├──▶ Phase 4 (知识沙盒)
      │    ├── T09 知识资产存储
      │    ├── T10 知识链推荐
      │    ├── T11 深度分级
      │    └── T12 /sandbox 页面
      │
      └──▶ Phase 5 (外部集成)
           ├── T13 联网搜索 Tool
           └── T14 source-router 降级
```

Phase 6 (质量体系) 可与 Phase 3-5 并行。

---

## Phase 1 — Stateful Memory Engine

> 目标：让系统在对话中自动理解意图、发现用户特征、提炼状态记忆。
> 这是 PRD 第一章的核心差异化，V1 全部缺失。

### T01 — LLM 语义意图分类

| 项 | 内容 |
|---|---|
| **现状** | `conversation-router.ts` 用 `["我喜欢","我不喜欢","偏好","背景","爱好"]` 做关键词匹配 |
| **目标** | 每次对话首轮，LLM 对用户输入做意图分类，输出路由标签 |
| **涉及文件** | `src/lib/harness/conversation-router.ts`（重写） |
| **LLM 输出格式** | `{ route: "knowledge" \| "preference" \| "casual", confidence: 0-1 }` |
| **路由定义** | `knowledge` — 知识探索（解释概念、对比、测验） / `preference` — 偏好表达（"我喜欢""换个方式"） / `casual` — 无关闲聊 |
| **验收** | 输入"期权是什么" → 返回 `{ route: "knowledge", confidence > 0.8 }`；输入"我喜欢用游戏理解东西" → 返回 `{ route: "preference", confidence > 0.8 }` |
| **依赖** | 无 |

### T02 — `update_user_state` Tool

| 项 | 内容 |
|---|---|
| **现状** | 用户特征只能通过 `/onboarding` 表单手动填写，对话中发现的背景/爱好不会被写入 |
| **目标** | 注册一个 LLM Tool，LLM 从对话中检测到用户新信息时主动调用，增量写入状态 |
| **涉及文件** | `src/lib/tools/index.ts`（新增 Tool 定义）/ `src/lib/harness/state-store.ts`（复用 `update()` 方法） |
| **Tool 参数** | `{ hobbies?: string[], background?: string, knowledge_blindspots?: string[], metaphor_preferences?: string[] }` |
| **逻辑** | 增量合并（不覆盖已有值，追加新条目）；LLM 自行判定是否需要调用 |
| **验收** | 用户说"我是会计，爱钓鱼" → LLM 自动调用 Tool → `User_State.json` 中 `background: "会计"`, `hobbies` 增加 `"钓鱼"` |
| **依赖** | T01（需要先知道这是 preference 类意图） |

### T03 — 回合制状态提炼

| 项 | 内容 |
|---|---|
| **现状** | `recordInteraction` 写死 `"已生成 card_flip 互动组件"`，无推理提炼 |
| **目标** | 每轮对话结束后，LLM 做一次轻量反思：用户暴露了什么新特征？理解深度如何？输出结构化 patch 写回状态 |
| **涉及文件** | `src/app/api/chat/route.ts`（在 `onFinish` 或响应返回前插入提炼步骤）/ `src/lib/harness/state-store.ts`（复用 `update()`） |
| **提炼 Prompt** | "根据本轮对话，判断: 1) 用户暴露了哪些新偏好/背景/盲区？ 2) 用户对这个概念的理解程度（浅/中/深）？输出 JSON patch。" |
| **输出格式** | `{ profile_patch?: Partial<Profile>, understanding_level?: "shallow" \| "moderate" \| "deep", summary: string }` |
| **验证** | 同一概念反复提问 → `understanding_level` 从 shallow 升到 deep；用户说"用摄影讲" → `metaphor_preferences` 增加摄影相关域 |
| **依赖** | T01, T02 |

---

## Phase 2 — Schema 协议三层重构

> 目标：把 LLM 职责从"生成完整 UI 结构"降级为"选择模式+骨架+填参数"。
> 解决当前 LLM 输出不可复用、质量不稳定、改进盲区三个结构性问题。

### T04 — Schema 三层类型定义

| 项 | 内容 |
|---|---|
| **现状** | `UISchema` 是扁平的 `{ type, version, config }`，LLM 每次输出完整 JSON |
| **目标** | 重新定义类型为 Pattern → Template → Payload 三层 |
| **涉及文件** | `src/types/schema.ts`（新增类型） |
| **新类型** | `PatternType` — 交互模式枚举（10+）/ `TemplateId` — 具体骨架标识 / `UIPayload<T>` — 该骨架的参数类型 |
| **向后兼容** | V2 类型需能解析 V1 Schema（读取旧 `type` 字段映射到新模式+默认骨架） |
| **V1 模式 → V2 映射** | `gacha_simulator` → `pattern: "probability"`, `template: "card_flip_reveal"`；`slider_explorer` → `pattern: "parameter_explore"`, `template: "single_slider"`；以此类推 |
| **验收** | V1 格式的 Schema JSON 仍能渲染；V2 格式新增 `pattern` 和 `template` 字段 |
| **依赖** | 无 |

### T05 — Prompt 模板重写

| 项 | 内容 |
|---|---|
| **现状** | `prompt-templates.ts` 的 `OUTPUT_FORMAT_RULES` 和 `SCHEMA_REFERENCE` 是基于 V1 flat Schema 写的 |
| **目标** | Prompt 指导 LLM 分三步输出：选模式 → 选骨架 → 填参数。每个模式带正例和反例。 |
| **涉及文件** | `src/lib/llm/prompt-templates.ts` |
| **Prompt 结构** | `SCHEMA_REFERENCE` 改为按 Pattern 分组：每个 Pattern 列出名称、适用概念类型、可选 Template 列表及选择建议、Payload 字段说明、正例和反例 |
| **反例规范** | 每个 Pattern 至少 1 条反例，标注"不要这样"（如 gacha 的 explanation 太抽象、slider 的 scenario 太少） |
| **验收** | 用 T01-T03 的测试集验证：LLM 输出的 Schema 包含 `pattern` + `template` + `payload` 三层；组件选择准确率不低于 V1 |
| **依赖** | T04 |

### T06 — 组件注册表升级

| 项 | 内容 |
|---|---|
| **现状** | `registry.tsx` 按 `UISchemaType` 做 1:1 映射（`"gacha_simulator" → GachaSimulator`） |
| **目标** | 注册表支持 `PatternType` + `TemplateId` 的二维查找（一种模式对应多个骨架组件） |
| **涉及文件** | `src/components/generative-ui/registry.tsx` |
| **新结构** | `Record<PatternType, Record<TemplateId, Component>>` |
| **渲染逻辑** | `renderBySchema(schema)` → 查 `schema.pattern` → 查 `schema.template` → 渲染对应组件（template 无效时 fallback 到该 pattern 的默认骨架） |
| **验收** | 同一 pattern 下切换 template 能渲染不同骨架组件；V1 flat Schema 仍能渲染（自动映射到默认 template） |
| **依赖** | T04 |

---

## Phase 3 — 交互模式扩展

> 目标：从 7 种交互模式扩展到 10+，覆盖更多知识类型。每种模式至少 2 个骨架变体。

### T07 — 新增 3 种交互模式

| 项 | 内容 |
|---|---|
| **现状** | 7 种模式：gacha_simulator / slider_explorer / card_flip / timeline_scrubber / comparison_split / quiz_battle / build_sandbox |
| **目标** | 新增 narrative_branch（叙事分支）/ classification_sort（分类归因）/ simulation_play（模拟推演） |
| **新增文件** | `src/components/generative-ui/narrative-branch.tsx` / `src/components/generative-ui/classification-sort.tsx` / `src/components/generative-ui/simulation-play.tsx` |
| **类型定义** | `src/types/schema.ts` 新增 3 个 Config 接口 + Zod schema |
| **注册** | 在 T06 升级后的 registry 中注册 |
| **各模式 Spec** | 见下方 |
| **验收** | 输入"沉没成本是什么意思" → 触发 narrative_branch（选择分支故事）；输入"价值投资和成长投资怎么分" → 触发 classification_sort；输入"复利怎么滚起来的" → 触发 simulation_play |
| **依赖** | T05, T06 |

**narrative_branch（叙事分支）**：
- 适用：历史事件、商业案例、逻辑谬误、人物传记
- Config: `{ title, opening: string, branches: Array<{ choice_label, outcome_description, insight }> }`
- 交互：用户选分支 → 揭示后果 → 展示 insight

**classification_sort（分类归因）**：
- 适用：逻辑谬误分类、投资风格归类、生物分类、性格类型
- Config: `{ title, items: Array<{ label, correct_category, explanation }>, categories: Array<{ id, name }> }`
- 交互：逐条拖入或点击选择分类桶 → 错误时展示隐喻解释

**simulation_play（模拟推演）**：
- 适用：供需曲线、种群演化、复利计算、网络效应
- Config: `{ title, params: Array<{ label, min, max, default, unit }>, compute_formula_description, steps: number }`
- 交互：设参数 → 播放时间推进 → 图表/数字动态变化

### T08 — 现有模式骨架变体

| 项 | 内容 |
|---|---|
| **现状** | 每种模式只有 1 个骨架（如 gacha_simulator 只有卡牌翻牌） |
| **目标** | 7 种现有模式每种增加至少 1 个骨架变体 |
| **涉及文件** | 每个模式新建 1 个变体组件文件 |
| **变体列表** | gacha → 转盘(spin_wheel)；slider → 双滑块对比(dual_slider)；card_flip → 网格配对(grid_match)；timeline → 纵向滚动(vertical_scroll)；comparison → 叠加淡入(overlay_fade)；quiz → 连答 combo(combo_chain)；sandbox → 流程图连线(flow_connect) |
| **验收** | 同一个概念输入，不同 templateId 渲染不同组件但逻辑等价；switch 切换不报错 |
| **依赖** | T06 |

---

## Phase 4 — 知识沙盒体系

> 目标：把"一次性交互"升级为"可成长的知识地图"。不改定位（玩中顿悟），改深度。

### T09 — 知识资产存储

| 项 | 内容 |
|---|---|
| **现状** | `User_State.json` 只有 `conversation_compressed`（最近主题、关键洞察），不持久化已学概念 |
| **目标** | 状态文件新增 `knowledge_assets` 字段，记录用户学过的每个概念及其渲染参数 |
| **涉及文件** | `src/types/state.ts`（新增类型）/ `src/lib/harness/state-store.ts`（新增 `addKnowledgeAsset` 方法）/ `src/app/api/chat/route.ts`（响应中写入 asset） |
| **`knowledge_assets` 结构** | `Array<{ concept: string, pattern: PatternType, template: TemplateId, learned_at: ISO8601, understanding: "shallow" \| "moderate" \| "deep", topic_area?: string }>` |
| **写入时机** | 每次 LLM 成功生成 Schema 后，从 Schema 和 T03 提炼结果中提取 `concept` + `topic_area`，写入 assets |
| **去重** | 同一 concept 只保留最新一条，覆盖旧记录 |
| **验收** | 学完期权后 `User_State.json` 出现 `{ concept: "期权", pattern: "probability", ... }`；再学一次覆盖旧值 |
| **依赖** | T04, T03 |

### T10 — 知识链推荐

| 项 | 内容 |
|---|---|
| **现状** | 每次交互是孤立原子，无前后关联 |
| **目标** | LLM 生成 Schema 时追加 `next_concepts`，推荐 1-2 个相关概念 |
| **涉及文件** | `src/types/schema.ts`（UISchema 加字段）/ `src/lib/llm/prompt-templates.ts`（Prompt 追加引导）/ 现有组件底部渲染推荐卡片 |
| **Schema 新增字段** | `next_concepts?: Array<{ label: string, relation: string }>` |
| **展示位置** | 组件下方以小型卡片组展示，点击自动填入输入框 |
| **验收** | 问完"期权"后底部出现"期货：交割方式不同"、"保险：都是风险管理工具" |
| **依赖** | T05 |

### T11 — 深度分级

| 项 | 内容 |
|---|---|
| **现状** | 所有交互只有一种深度（10 秒顿悟） |
| **目标** | 同一概念支持三档深度，用户在组件内自由切换 |
| **涉及文件** | `src/types/schema.ts`（Payload 加 `depth`）/ `src/lib/llm/prompt-templates.ts`（按 depth 分叉输出规则）/ 各组件渲染 depth 切换按钮 |
| **depth 枚举** | `"rapid"` — 10 秒顿悟（当前默认） / `"scenario"` — 真实场景决策 / `"mapping"` — 隐喻对照原理解析 |
| **组件支持** | 至少 gacha_simulator 和 narrative_branch 支持场景模式（scenario 和 mapping 可以在现有组件里加切换面板，不一定要新骨架） |
| **验收** | 同一概念切换 depth → 交互内容深度变化：rapid 给结论，scenario 给决策，mapping 给术语对照 |
| **依赖** | T05 |

### T12 — `/sandbox` 知识沙盒页面

| 项 | 内容 |
|---|---|
| **现状** | 无持久化知识展示 |
| **目标** | 新增页面展示用户已学概念的可视化地图，按主题区分区 |
| **涉及文件** | `src/app/sandbox/page.tsx`（新建）/ 相关视觉组件 |
| **展示内容** | 主题区分组（金融区、科技区、哲学区...从 `topic_area` 字段分组）；每个概念卡片显示名称 + 学过的组件类型图标 + 理解深度指示；概念间连线由 LLM 在 T10 生成的关系数据驱动 |
| **验收** | 学完 3 个概念后进入 `/sandbox`，看到 3 张卡片，同主题的概念聚合在同一区域 |
| **依赖** | T09, T10 |

---

## Phase 5 — 外部集成

### T13 — 联网搜索 Tool

| 项 | 内容 |
|---|---|
| **现状** | 外部信息获取仅靠用户手动贴 URL（`source-router.ts` 按 URL 类型分拣） |
| **目标** | 集成 Tavily Search API，LLM 在需要外部语境时自动触发搜索 |
| **涉及文件** | `src/lib/tools/index.ts`（新增 Tool 定义）/ `.env.local`（新增 `TAVILY_API_KEY`） |
| **Tool 定义** | `web_search` — 参数 `{ query: string, max_results?: number, topic?: "general" \| "news" }` |
| **实现** | `fetch("https://api.tavily.com/search", { body: { api_key, query, max_results: 3 } })` → 返回 `{ answer, results: [{ title, content, url }] }` → 注入 System Prompt |
| **调用时机** | 每次对话中 LLM 自行判断是否需要（不强制调用） |
| **验收** | 输入"巴菲特对期权的最新看法" → LLM 自动触发搜索 → 搜索结果摘要注入上下文 → 生成的隐喻引用时效性内容 |
| **依赖** | 无（独立模块） |

### T14 — source-router 降级为辅助

| 项 | 内容 |
|---|---|
| **现状** | `source-router.ts` 是唯一的外部信息入口 |
| **目标** | 降级为"用户贴链接时顺手抓取"的辅助通道，主链路让给 T13 |
| **涉及文件** | `src/lib/tools/source-router.ts`（不删，但 chat route 中的调用权重降低） |
| **改动** | `src/app/api/chat/route.ts` 中：先让 LLM 判定是否需要搜索 → 需要则调 T13；用户输入中含 URL 时额外调 source-router 抓取 |
| **验收** | 纯文字输入 → 走 T13 搜索（不触发 source-router）；输入含 URL → 同时走 T13 搜索 + source-router 抓取 |
| **依赖** | T13 |

---

## Phase 6 — 质量体系

> 可与 Phase 3-5 并行开发。

### T15 — 测试用例集

| 项 | 内容 |
|---|---|
| **现状** | 无标准化测试输入 |
| **目标** | 创建 `tests/fixtures/` 目录，含 10 个固定测试输入，覆盖全部 Pattern 类型 |
| **涉及文件** | `tests/fixtures/test-cases.json`（新建） |
| **格式** | `[{ input, expected_pattern, expected_depth, user_state_fixture, description }]` |
| **覆盖** | 至少每种 Pattern 1 条 + 深度分级 3 条 + 意图分类 2 条 |
| **验收** | 跑测试脚本能遍历全部 case |
| **依赖** | 无 |

### T16 — Schema 质量评分脚本

| 项 | 内容 |
|---|---|
| **现状** | 只有 Zod 合法性校验，无质量评分 |
| **目标** | 编写 `tests/eval/score.ts`，对 LLM 输出做四项打分 |
| **评分维度** | JSON 一次合法率（不需自修复） / 组件选择准确率（pattern 是否正确）/ 隐喻贴合度（payload 中 metaphor hints 是否匹配 user_state）/ config 完整度（必填项 + 内容长度下限） |
| **输出** | 单次评分 + 全量平均分 |
| **验收** | 跑 10 条测试用例，输出每条的 4 项分数 + 总平均 |
| **依赖** | T15 |

### T17 — Prompt 版本对比工具

| 项 | 内容 |
|---|---|
| **现状** | 改 Prompt 只能人工对比效果 |
| **目标** | `tests/eval/compare.ts` 对两个 Prompt 版本跑同一测试集，输出差异表 |
| **输出** | 每个 case 的两次评分对比 + 胜出方 |
| **验收** | 跑 `node tests/eval/compare.ts v1 v2` 输出对比报告 |
| **依赖** | T15, T16 |

---

## 不会交给 Codex 的任务（人工）

| ID | 任务 | 说明 |
|---|---|---|
| H01 | 申请 DeepSeek API Key | 写入 `.env.local`，否则一直跑 mock |
| H02 | Vercel 部署 | 需账号 + Dashboard 设环境变量 |
| H03 | 隐喻域映射表扩充 | `domain-mappings.ts` 持续补充（健身、摄影、钓鱼、烘焙...） |
| H04 | 真实用户测试 | 找 3-5 人，记录隐喻相关性、交互直觉、卡点 |
| H05 | Prompt 调优迭代 | 接入真实 LLM 后，观察输出质量，调整 T05 的 Prompt 模板 |

---

*最后更新：2026-06-05*

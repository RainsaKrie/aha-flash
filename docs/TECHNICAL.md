# 趣灵 aha-flash — 技术与实现

> 文档定位：记录当前技术真相、实现约束和验证规则。产品路线见 `PRODUCT.md`，完成记录见 `CHANGELOG.md`。

## 1. 架构总览

```text
User
  |
  v
Next.js App Router
  |
  +-- UI Shell: Explore topic feed + Flow player + Hub + internal Studio
  |
  +-- API Layer
      |
      +-- /api/state       user state init/update
      +-- /api/chat        route intent, build prompt, generate schema, reflect state
      +-- /api/interaction component event feedback
      +-- /api/tools       tool execution bridge

Harness Layer
  |
  +-- State Store
  +-- Conversation Router
  +-- Prompt Composer
  +-- State Reflection

LLM Layer
  |
  +-- DeepSeek via Vercel AI SDK
  +-- Round 3 target: Pattern Tool Calling
  +-- mock fallback when API key is absent

Generative UI Layer
  |
  +-- V2 Schema: pattern + template + payload + depth + next_concepts + visual_asset?
  +-- Registry maps pattern/template to React components
```

## 2. 技术栈

| 层 | 技术 |
|---|---|
| App | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, local UI primitives, lucide-react |
| LLM | Vercel AI SDK, DeepSeek provider |
| State | Zustand client store, file/tmp JSON server state |
| Validation | Zod |
| Tools | Tool bridge；当前仅保留用户状态更新工具 |
| Deploy | Vercel |

## 3. 目录结构

```text
src/
  app/
    api/
      chat/route.ts
      interaction/route.ts
      state/route.ts
      tools/route.ts
    onboarding/page.tsx
    sandbox/page.tsx
    page.tsx
  components/
    chat/
    generative-ui/
    onboarding/
    ui/
  lib/
    harness/
    llm/
    metaphor/
    tools/
    utils/
  stores/
  types/
tests/
  fixtures/test-cases.json
  eval/
    score.ts
    compare.ts
```

## 4. 用户状态

核心类型在 `src/types/state.ts`。

状态包含：

- `profile`
- `conversation_compressed`
- `knowledge_assets`
- `ui_preferences`
- `updated_at`

存储策略：

- 本地开发：`data/states/{user_id}.json`
- Vercel demo：`/tmp/aha-flash/states`
- 可通过 `AHA_FLASH_STATE_DIR` 覆盖
- 长期生产应迁移到 Vercel KV、Postgres、Redis 或其他持久化服务

重要约束：

- 不保存全量历史文本。
- 每轮对话只写入压缩摘要、关键洞察、当前线程和必要短期窗口。
- `/api/chat` 请求携带最近 6 条轻量消息作为短期窗口，只用于本轮 Prompt，不写入长期状态。
- `current_thread` 记录当前概念、追问深度和最后一次用户输入；换题时归档到 `thread_summaries`。
- 同一概念重复学习时覆盖旧资产，避免状态列表膨胀。
- 状态体积保持小而可读。

## 5. 对话生命周期

```text
POST /api/chat
  |
  +-- initUserState(userId)
  +-- attach recent_messages
  +-- detectFollowupByRules(input, current_thread)
  +-- classifyConversationByRules(input)
  +-- buildToolSystemPrompt(state + recent_messages + thread + route + target_depth)
  +-- stream stage events when requested
  +-- generateSchemaWithLLM()
      |
      +-- L1: Tool Calling selects one generate_* Pattern Tool
      +-- L2: JSON Schema fallback with repair prompt
      +-- L3: if model unavailable or invalid output: createMockSchema()
  +-- normalizeUISchema(schema)
  +-- if route is knowledge: stateStore.updateCurrentThread()
  +-- reflectTurnByRules(input, route, schemaType)
  +-- stateStore.applyTurnReflection()
  +-- if route is knowledge: stateStore.addKnowledgeAsset()
  +-- return schema + depth + next concepts + route + userState
```

## 6. Schema 协议

当前协议为 V2 三层结构：

```json
{
  "pattern": "comparison",
  "template": "overlay_fade",
  "version": "2.0",
  "depth": "scenario",
  "payload": {},
  "next_concepts": [
    { "label": "期货", "relation": "同属衍生品，但交易义务不同" }
  ]
}
```

兼容旧 V1：

```json
{
  "type": "comparison_split",
  "version": "1.0",
  "config": {}
}
```


ormalizeUISchema()` 会把 V1/V2 统一转成：

```ts
{
  type: UISchemaType;
  pattern: PatternType;
  template: TemplateId;
  version: string;
  config: Record<string, unknown>;
  depth: "rapid" | "scenario" | "mapping";
  next_concepts: Array<{ label: string; relation: string }>;
  visual_asset?: VisualAssetHint;
}
```

组件 payload 允许携带交互意图字段，而不仅是展示文案：

- `comparison` 可携带 `subject_a`、`subject_b`、`dimensions`、`summary`。
- `parameter_explore` 可携带 `outputs`、`insight_rules`。
- `system_builder` 可携带 `required_module_ids`、`expected_sequence`、`connections`、`success_summary`。
- 所有 payload 可携带 `metaphor_trace`，用于记录隐喻推理，不在前端渲染。Schema 顶层可携带 optional `visual_asset`，用于前端从本地资源表匹配图标、emoji theme 或轻动画。

这些字段是可选增强项；缺失时组件仍保留兼容兜底，但 Prompt 应优先输出带交互结构的 payload。

`metaphor_trace` 结构：

```ts
{
  concept_action: string;
  source_domain: string;
  candidate_mechanism: string;
  mapping_checks: string[];
  chosen_terms: string[];
}
```

使用规则：

- `concept_action` 写概念的 1-2 个核心动作。
- `source_domain` 来自用户状态中的兴趣、背景或隐喻偏好。
- `candidate_mechanism` 写用户领域中最接近的机制。
- `mapping_checks` 说明抽象概念与领域机制为何成立。
- `chosen_terms` 记录最终采用的术语体系，辅助检查是否混用。

## 7. V5/V6 Flow 路由与内容模型

V5 的主体验从“输入生成组件”改为“浏览话题 -> 全屏 Flow 闯关 -> Hub 回顾”。现有 10 个 Pattern、Schema 校验和生成链路保留为底层 Skills，不再作为用户首页心智。

路由职责：

| Route | V5 职责 | 数据来源 | 备注 |
|---|---|---|---|
| `/` | 默认跳转 Explore | - | 入口页不承载聊天流 |
| `/explore` | 自由生成主入口：输入任意 topic，AI 按 KnowledgeBlueprint 自动选择四步路径 Pattern；展示 SSE 真实阶段、知识结构和四个用户可读的关卡目标，不渲染内部 term/Pattern tag，五条精选 Flow 仅作示例起点 | `POST /api/flow` + `getShowcaseFlows()` | 公开链接优先展示“想学什么就生成什么”的核心能力 |
| `/flow/[flowId]` | 全屏三段式精选闯关：退出/进度条、单组件舞台、底部操作台 | `KnowledgeFlow` | curated 示例体验 |
| `/flow/custom` | 播放当前浏览器会话中的动态 Flow | sessionStorage | Explore 写入 draft，Custom Flow 页读取并复用播放器 |
| `/hub` | 知识路径足迹、节点回看、完成统计 | localStorage + `/api/state` | 轻量图鉴，不做知识管理 |
| `/studio` | 内部生成工作台 / 技术验证入口 | `/api/chat` | V5 V1 不作为主导航入口 |
| `/sandbox` | 旧知识沙盒兼容入口 | `/api/state` | 不再作为公开主入口 |

前端内容模型：

```ts
type TopicCategory = "科技" | "经济" | "哲学" | "心理" | "历史" | "数理";
type TopicDifficulty = "轻松" | "进阶" | "烧脑一点";

interface KnowledgePlay {
  id: string;
  title: string;
  concept: string;
  schema: UISchema;
  estimated_minutes: number;
  reward_copy: string;
}

interface KnowledgeFlow {
  id: string;
  title: string;
  concept: string;
  hook: string;
  description: string;
  category: TopicCategory;
  difficulty: TopicDifficulty;
  estimated_minutes: number;
  summary: string;
  concepts: string[];
  plays: KnowledgePlay[];
}
```

公开作品集配置：

- `src/lib/content/mock-flows.ts` 维护 `SHOWCASE_FLOW_IDS`，当前固定为 `bayes-starter`、`dns-router`、`options-risk`、`industrial-revolution`、`inflation-deflation`。
- `/explore` 主入口调用 `POST /api/flow` 生成动态 Flow；`getShowcaseFlows()` 只用于“试试这些起点”的稳定示例。
- 五个示例 topic 共同覆盖全部 10 类 Pattern；每个 topic 都有四步 fallback Flow，LLM 失败时仍可完整体验。
- 当前公开入口的目标是让用户立即体验能力闭环：自由输入或示例起点 -> 四步互动 -> AI 分支继续 -> 完成记录进入 Hub。
Flow 渲染规则：

- Explore 只展示话题卡，不内嵌互动组件。
- Flow 页每次只渲染一个 `KnowledgePlay.schema`。
- 顶栏展示退出按钮和绿色进度条，退出不弹窗、不挽留。
- 用户必须先与中央舞台互动，底部操作台才允许检查/继续。
- 最后一关完成后展示小结卡片和“继续探索”。
- 旧 Schema 不带 `visual_asset` 时仍按 Pattern 默认视觉资源渲染。

Flow Steps 生成策略：

- `src/lib/content/mock-flows.ts` 保留一组内部 mock Flow 库；`SHOWCASE_FLOW_IDS` 只作为 `/explore` 的稳定示例起点，不代表系统能力上限。
- `src/lib/content/flow-generation.ts` 以 topic spec 驱动 Flow Steps 生成，当前 LLM topic 包括 `bayes-starter`、`industrial-revolution`、`inflation-deflation`。
- Flow 生成先走 LLM；动态自由生成会要求模型输出 `grounding_terms`，服务端校验专业锚点是否实际进入四步内容，不通过时带失败原因自动 repair 一次。
- repair 后仍不贴题、无 key、网络异常或 JSON 不可解析时，回退按用户 topic 包装的通用四步 Flow，不再依赖单个概念的专用预制兜底。
- Flow 生成器会校验每个 step 的 `UISchema`，并对常见字段漂移做轻量修复，例如 `options[].text -> label`、`cards[].term -> front`、`events/stages/milestones -> events`、`comparison_dimensions/rows -> dimensions`、`scenarios[].name -> label`、`insight_rules[].description -> text`。
- Flow 生成器会修复 DeepSeek 偶发的顶层漂移：`pattern/template` 对调、`template=v1/v2` 等别名、缺失 `version`。
- `parameter_explore/single_slider` 会额外归一化 3 个 scenarios、2 个 outputs、3 条 low/mid/high insight rules，并移除 `{result}`、`{output1}`、`{calculated}` 等未替换占位符文案。
- `process_timeline` 会归一化 4-6 个阶段事件，保证每个事件都有短 label 和因果 description。
- 当 Blueprint 的学习动作是“排序”时，Flow 生成器会将 `process_timeline` 绑定为 `sequence_order`：payload 必须带 `mode: "sequence_order"` 与完整 `correct_order`。浏览型时间线若承诺排序，会被 QualityGate 拒绝。
- `comparison` 会归一化 left/right、subject_a/subject_b 和 dimensions，保证对比维度平行可切换。
- `reward_copy` 使用克制型知识反馈，发现“工具箱更新了 / 卡片已入库 / 魔力 / 升级版”等过度游戏化表达时回退为“你又想通了一层”。
- `npm run eval:flow-manual -- --runs=10 --url=http://127.0.0.1:<port>/api/flow?flowId=<flowId>` 用于手动采样，生成 Markdown 供人工判断 10 次里是否至少 8 次产生“啊哈感”；本阶段稳定性收口目标提高到 9/10 以上。
- 2026-06-11 采样：`bayes-starter` 10/10 `source=llm`，无 schema fallback。
- 2026-06-12 采样：`industrial-revolution` 10/10 `source=llm`，`inflation-deflation` 10/10 `source=llm`；固定回归 `npm run eval:score` 保持 `overall: 1`。
- Flow Steps 已纳入第一版自动 Eval：`tests/fixtures/flow-cases.json` 覆盖 probability / timeline / comparison 三种知识类型，每类 5 个固定检查点；`tests/eval/flow-score.ts` 检查步骤数量、Pattern 链、payload 完整度、文案安全和概念锚点。
- `npm run eval:flow` 默认使用本地 mock Flow，不消耗 LLM；
- `npm run eval:flow -- --url=http://127.0.0.1:<port>/api/flow?debug=1 --runs=1` 调用真实 `/api/flow` 输出。
- 2026-06-12 自动化验收：本地模式 15/15，`overall: 1`；API 模式 3 个早期垂直切片均为 `source=llm`，`overall: 1`。

视觉资源注册表：

- 位置：`src/lib/content/visual-assets.ts`。
- 输入：`pattern` 和 optional `visual_asset.tag`。
- 输出：emoji、title、description、motion tone 和轻量 CSS class。
- 只提供本地轻量资源，不依赖在线图片服务。

## 8. Pattern / Template 注册

代码侧以 `src/types/schema.ts` 中的 `SCHEMA_CATALOG` 作为协议映射源，并由 `src/components/generative-ui/registry.tsx` 将 `pattern/template` 映射到 React 组件。

原则：

- 新增 Pattern 时，先更新类型和 `SCHEMA_CATALOG`。
- 新增 Template 时，保持 Schema 校验、mock、Prompt 示例和组件注册同步。
- V1 类型只保留兼容入口，新能力优先走 V2 `pattern/template/payload`。
- 组件质量规则由 `PRODUCT.md` 的互动组件质量标准约束，具体实现优先落在 `src/components/generative-ui/shared.tsx`。

## 9. Tool 与来源输入

当前工具：

| Tool | 当前判断 |
|---|---|
| `update_user_state` | 保留，用于服务端注入 `user_id` 后增量更新用户画像 |

Round 3 目标工具：

| Tool | Pattern |
|---|---|
| `generate_probability` | `probability` |
| `generate_parameter_explore` | `parameter_explore` |
| `generate_concept_memory` | `concept_memory` |
| `generate_process_timeline` | `process_timeline` |
| `generate_comparison` | `comparison` |
| `generate_knowledge_check` | `knowledge_check` |
| `generate_system_builder` | `system_builder` |
| `generate_narrative_branch` |
arrative_branch` |
| `generate_classification_sort` | `classification_sort` |
| `generate_simulation_play` | `simulation_play` |

T30 已在 `src/lib/tools/generative-tools.ts` 定义 10 个 Pattern Tool，每个 Tool 的 `inputSchema` 包含该 Pattern 的 payload 字段、可选 `template`、`depth` 和 `next_concepts`。T31 已让 `/api/chat` 优先通过 Tool Calling 选择 Pattern，Tool 参数可携带模板 ID 以覆盖默认模板。若 DeepSeek Tool Calling 不稳定，现有 JSON Schema 生成链路作为 L2 fallback，最终仍可回退 mock schema。

来源输入技术原则：

- 文字输入是当前主路径。
- 搜索、URL 自动路由、网页抓取和 YouTube 字幕抓取已经从聊天主链路和 Tool 注册中移除。
- 用户看到外部内容时，近期优先通过直接复制文本进入输入框。
- 图片、音频、剪贴板、系统分享属于远期自然入口，需要多模态或转录能力支持。

## 10. 前端状态和交互反馈

客户端 store：`src/stores/app-store.ts`。

前端保存：

- `userId`
- `userState`
- `messages`
- `currentSchema`
- 当前学习深度
- loading/error
- 分段生成状态
- 当前组件质量反馈状态

`/sandbox` 页面通过同一个 localStorage 用户 ID 读取 `/api/state`，将 `knowledge_assets` 按 `topic_area` 分组，展示概念卡片、`pattern/template`、理解深度和学习时间。

组件交互通过 `/api/interaction` 回写摘要：

- 抽卡完成
- 滑块变化
- 时间线查看
- 测验回答
- 分类完成
- 模拟完成
- 组件质量反馈：有帮助 / 不准确

知识沙盒支持将单张知识卡导出为 Markdown 文件，内容包括概念、主题、理解深度、Pattern、Template 和学习时间。
- 模块构建完成

## 11. 质量评估

质量体系包含：

- `tests/fixtures/test-cases.json`：固定输入集合，当前 32 条，覆盖全部 Pattern、全部模板变体、深度和意图。
- `tests/eval/score.ts`：评分单个预测文件；无预测文件时使用 mock schema 作为基线。
- `tests/eval/compare.ts`：对比两个预测文件，输出总分和逐 case 分数差异。

评分维度：

- JSON 合法率
- Pattern/Template/Depth 准确率
- Route 准确率
- 隐喻关键词贴合度
- 隐喻一致性，检查 `metaphor_trace` 是否包含核心动作、来源领域、候选机制、映射验证和统一术语
- Payload 完整度

命令：

```bash
npm run eval:score
npm run eval:score -- --json
npm run eval:compare -- baseline.json candidate.json
```

## 12. 开发工作流

新增规划统一进入 `docs/input-docs/`。处理顺序：

1. 读取 `docs/input-docs/` 根目录的新文档。
2. 判断新增、重复、过期和仅归档内容。
3. 先合并到 `PRODUCT.md` / `TECHNICAL.md` / `CHANGELOG.md`。
4. 再按合并后的文档开发。
5. 开发完成后提交并推送。
6. 审查已处理输入的去留：已整合、重复、过期或无独立追溯价值的直接删除；只有仍需追溯来源的材料才进入 `docs/input-docs/archive/`。

## 13. 验证命令

每次功能提交前至少运行：

```bash
npm run typecheck
npm run build
npm run eval:score
npm run eval:flow
npm run eval:flow-dynamic
npm run eval:showcase
```

涉及前端交互时，启动本地服务并用浏览器或 Playwright 验证至少一个真实路径。

文档-only 修改可不跑构建，但必须扫描引用：

```bash
rg -n "旧入口文档|待处理输入|archive" docs/README.md docs/PRODUCT.md docs/TECHNICAL.md docs/input-docs/README.md
```

## 14. 页面布局约束

V5 页面布局以轻消费闯关为核心，不再把工作台和知识图谱作为默认体验。

Explore：

- Explore 主入口是自由输入；系统依据 KnowledgeBlueprint 自动选型，五条精选 topic 只作为“试试这些起点”的低风险示例，并覆盖全部 10 类 Pattern。
- 不内嵌 Flow、不展示聊天历史、不放 Studio 大按钮、不展示知识图谱。
- 每张话题卡必须包含概念名、hook、分类、难度、预计时长和关卡数。

Flow：

- 全屏三段式：顶部退出与进度条；中央单一交互组件；底部操作台。
- 中央舞台只承载当前关卡，不同时堆叠多个组件。
- 底部按钮根据状态变化：未互动为灰、可检查为待确认、完成为绿色继续。
- 趣灵提示只出现在底部操作台，不遮挡组件。

Hub：

- 展示“已闯过 X 关 | 邂逅了 Y 个概念”和知识路径足迹。
- Flow 完成后由 `recordCompletedFlow()` 写入 `localStorage`，记录 flowId、标题、概念、分类、摘要、概念列表、完成关卡数和完成时间。
- `/hub` 合并本地 Flow 完成记录与 `/api/state` 的 `knowledge_assets`，按最近学习时间排序，并对 Flow 已覆盖概念做去重。
- 状态接口失败时，Hub 仍展示本地完成记录并给出轻量提示，避免个人页完全空白。
- 快速回顾优先，不做知识图谱、笔记、收藏、排行或长数据看板；当前仍是本机状态，不是账号级持久化。

Studio / Sandbox：

- `/studio` 保留为内部生成工作台和 Skills 调试入口，V5 V1 不作为主消费路径。
- `/sandbox` 仅保留兼容，不在公开主导航中强调。

## 15. 组件 UI 规格

共享实现优先放在 `src/components/generative-ui/shared.tsx`：

- `patternColors`：维护 Pattern 主色表。
- `patternStyle()`：注入 `--accent`、`--pattern-surface`、`--pattern-panel`、`--pattern-raised`、`--line`。
- `ComponentFrame`：统一标题区、描述、深度 badge 和 footer。
- `Panel`、`FeedbackPanel`、`ProgressMeter`、`ChoiceButton`、`EmptyState`：统一面板、反馈、进度、选项和空态。

硬性约束：

- 组件文件不直接硬编码 Pattern 色值。
- 组件文件不使用 `rounded-[8px]`，改用 `rounded-lg`、`rounded-md`、`rounded-xl`。
- 组件文件不使用 `animate-pulse`，改用 `ui-breathe`。
- 标题使用 `text-2xl font-semibold`，阶段/卡片标题使用 `text-base font-medium`。
- 间距只使用 8/16/20/24px 节奏，避免 `gap-3` / `gap-7`。
- 所有可点击元素不低于 44px。

## 16. Prompt 与隐喻推理

当前 JSON fallback 的 `src/lib/llm/prompt-templates.ts` 必须包含：

- 输出合法 JSON，不包 Markdown。
- 优先输出 V2 `pattern/template/payload/depth/next_concepts`。
- 深度必须等于 `<target_depth>`。
- 内容底线：title 2-8 字；quote/description 至少 10 字且含具体场景；insight 至少 15 字且含因果链；explanation 至少 20 字；关键数组至少 3 项。
- 每个 Pattern 至少 2 条反例：结构反例和内容反例。
- 隐喻推理流程：拆动作、找机制、验映射、统一术语、给具体对应物。
- payload 中输出 `metaphor_trace`，前端不渲染。

Round 3 Tool Calling 目标：

- 主链路 Prompt 不再描述全部 Schema 结构。
- System Prompt 只保留角色设定、用户状态、隐喻规则和 1 句 Tool 使用提示。
- Pattern 结构约束转移到 `GENERATIVE_TOOLS` 的 `inputSchema`。
- 现有自然语言 `SCHEMA_REFERENCE` 保留为 JSON fallback，待 T34 完成后再判断是否继续保留。

## 17. 环境变量

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_APP_NAME=趣灵
NEXT_PUBLIC_MAX_STEPS=5
AHA_FLASH_STATE_DIR=
AHA_FLASH_DISABLE_TOOL_CALLING=
```

说明：

- 没有 `DEEPSEEK_API_KEY` 时使用 mock schema fallback。
- `DEEPSEEK_API_KEY` 仅在服务端 provider 中读取，不使用 `NEXT_PUBLIC_` 前缀，也不进入 API 响应。
- `AHA_FLASH_DISABLE_TOOL_CALLING=1` 时跳过 Tool Calling，直接验证 JSON fallback；开发环境也可在 `/api/chat` 请求体传 `disable_tools: true`。
- `/api/chat` 默认限制单条输入 2000 字，清理控制字符，并按 userId/IP 做 10 分钟 30 次的内存级基础限流。
- 生产环境不返回 Schema validation debug 细节；开发环境保留 `validation_error` 便于排查。
- Vercel demo 默认写 `/tmp/aha-flash/states`，不保证长期持久。
- 搜索和 URL 抓取相关环境变量已不再使用。

## 18. 关键决策

| 决策 | 当前选择 | 原因 |
|---|---|---|
| Schema 协议 | V2 `pattern/template/payload` + V1 兼容 | 降低 LLM 输出复杂度，支持骨架复用 |
| LLM fallback | 无 key 时使用 mock schema | 保证 demo 和开发链路可运行 |
| 状态存储 | 本地文件 / Vercel `/tmp` | 当前阶段轻量；生产需迁移 |
| UI 组件 | 自建 React 组件 + framer-motion 过渡 | 控制交互体验和协议映射，Flow/奖励动画不重写业务组件 |
| 路由分类 | 规则默认，LLM 预算集中给 Schema 生成 | 降低成本和延迟，避免前置分类消耗模型调用 |

## 19. Round 3 MVP 1.0 收束任务

| 任务 | 技术目标 | 状态 |
|---|---|---|
| T30 | 新建 `GENERATIVE_TOOLS`，10 个 Pattern Tool 的 inputSchema 与 Zod 协议对齐 | 完成 |
| T31 | `/api/chat` 使用 Tool Calling 选择 Pattern | 完成 |
| T32 | System Prompt 主链路降到 1000 tokens 内 | 完成 |
| T33 | Tool calling 后校验层只做轻量二次确认 | 完成 |
| T34 | 保留 Tool -> JSON fallback -> mock 三重兜底 | 完成 |
| T35a | 首页顶栏、空态舞台、底部输入栏视觉与输入联动收束 | 完成 |
| T35b | 组件视觉细节走查：色阶、滑块触控、按钮文案和重复作答状态收口 | 完成 |
| T35c | 加载、生成、渲染、错误状态的动效衔接 | 完成 |
| T36 | 合并 followup、route、schema 相关 LLM 调用，单次请求 LLM 调用不超过 3 次 | 完成 |
| T37 | 生产安全：API Key 不下发、限流、输入清洗、错误响应脱敏 | 完成 |
| T38 | 默认体验额度与自定义 API Key 请求方案 | 搁置 |
| T39 | Eval 用例扩展到 30+，score 不低于 0.9 | 完成 |

## 20. 已知技术债

- Vercel `/tmp` 状态不持久，不能作为生产记忆。
- 当前 mock schema 仍承担较多验收输入路由。
- 追问检测和路由分类已默认改为规则判别，后续需要真实对话样本回归。
- 当前流式生成是 `/api/chat` 的 NDJSON 阶段事件流，最后仍以完整 Schema 渲染；后续如需边生成边预览，需要重新设计增量 Schema 协议。
- V5 Explore 已升级为自由生成入口；动态 Flow 通过 `POST /api/flow` 接入 LLM 并保留按用户 topic 包装的 fallback，showcase Flow 继续通过 `GET /api/flow` 保留稳定示例；Hub 使用本地完成记录和 `/api/state`。真实埋点、账号系统、生产级持久化仍未实现。

<!-- AI_CHAIN_STATUS_START -->
## 21. 当前 AI 链路与 mock 边界（2026-06-21）

### 已打通的真实 AI 链路

| 链路 | 入口 | 说明 |
|---|---|---|
| 动态 Flow 生成 | `/explore` -> `POST /api/flow` | 用户输入任意 topic；服务端先生成 Blueprint，再自动选择 Pattern，返回四步 `KnowledgeFlow`，流式请求同时发送真实阶段事件。 |
| 动态 Flow 播放 | `/flow/custom?draftId=...` | Explore 将生成结果写入 sessionStorage，Custom Flow 页读取并复用 `KnowledgeFlowPlayer`。 |
| Follow-up 延伸 | Flow 完成态 -> `POST /api/flow` | 动态 Flow 优先使用 Blueprint-derived `follow_ups`，点击 AI 延伸方向会生成下一组四步。 |
| 互动组件生成 | `/studio` -> `/api/chat` | 使用 DeepSeek，经 Tool Calling 优先生成 10 类 Pattern Schema；失败进入 JSON fallback；最终 mock fallback 防崩。 |
| Showcase Flow 生成 | `/flow/[flowId]` -> `GET /api/flow` | `bayes-starter`、`industrial-revolution`、`inflation-deflation` 会请求 LLM 生成三关 Flow，失败回退本地 Flow。 |
| 状态更新 | `/api/chat` + `/api/state` | 规则优先更新当前线程、知识资产和轻量状态；不是每一步都调用 LLM。 |

### 当前 mock / 本地边界

| 功能 | 当前实现 | 原因 |
|---|---|---|
| 动态 Flow fallback | `dynamic-flow-generation.ts` 按用户 topic 包装通用四步 Flow | 无 key 或 LLM 不稳定时仍保持“输入什么就学什么”的产品承诺。 |
| Explore 示例卡片 | `getShowcaseFlows()` 静态精选 5 个起点 | 作为低风险示例入口，不再代表系统能力上限。 |
| 旧 curated follow-up | `getFlowFollowUps()` 静态映射 | 仅作为 curated Flow 或动态 Flow 无可用 Blueprint follow-up 时的 fallback。 |
| Hub 图鉴 | localStorage + `/api/state` | 记录真实本机完成路径，但不做账号级持久化。 |
| 视觉资源 | `visual-assets.ts` 本地 registry | `visual_asset` 是增强提示，不调用外部图像生成。 |


动态 Flow fallback 回归：

- `tests/eval/dynamic-flow-score.ts` 会临时移除 `DEEPSEEK_API_KEY`，直接调用 `generateDynamicFlow()`，验证无 key 时仍返回 `source=mock` 的 `custom-*` 四步 Flow。
- 覆盖 auto 与 `system_builder`、`process_timeline`、`comparison`、`parameter_explore` 四种 API 级显式 Pattern 约束，确保指定 Pattern 至少出现在一关里。Explore 公开 UI 默认只走自动选型；补充 `Agent` 与 `Kubernetes operator` 等非预制概念，禁止回退到“相近概念”等占位式文案。
- `tests/eval/showcase-pattern-score.ts` 检查公开精选集是否至少包含 5 条 Flow，并覆盖 `SCHEMA_CATALOG` 中全部 10 类 Pattern。

### 完成口径

V6 当前已经具备：`Explore 任意输入 -> AI 生成四步 Flow -> /flow/custom 播放 -> AI 分支继续 -> Hub 路径记录`。未实现项集中在生产化能力：账号、数据库、真实社区发布、审核、真实埋点和跨设备同步。
<!-- AI_CHAIN_STATUS_END -->

## Dynamic Flow ConceptPlan Pipeline

- POST /api/flow uses a two-stage chain: ConceptPlan -> KnowledgeFlow -> UISchema validation/repair.
- ConceptPlan is the grounding contract. It preserves the user topic, extracts concrete grounding_terms, chooses recommended_patterns, and lists avoid_patterns before any UI payload is generated.
- KnowledgeBlueprint pattern_strategy is authoritative after ConceptPlan. ConceptPlan recommendations are planning hints; avoid patterns can remove unsafe interaction types, and dynamic free flows never force simulation_play without an explicit formula contract.
- Debug mode (?debug=1 in dev/local) exposes concept_plan and raw_plan_output alongside raw_output and validation_error.
- If ConceptPlan fails validation after repair, fallback uses makeFallbackFlowFromPlan(plan) instead of a fixed showcase topic.
- Dynamic fallback regression covers Agent, Kubernetes operator, and linear programming; the latter must not include probability in the generated pattern chain.

## V6 Dynamic Flow Reliability Notes

The dynamic free-generation path is now structured as:

```text
Topic -> ConceptPlan -> KnowledgeBlueprint -> KnowledgeFlow -> QualityGate -> Flow or honest failure
```

Key implementation points:

- KnowledgeBlueprint pattern_strategy is authoritative after ConceptPlan. ConceptPlan recommendations are planning hints; avoid patterns can remove unsafe interaction types, and dynamic free flows never force simulation_play without an explicit formula contract.
- `TeachingTrace` is attached to each generated `KnowledgePlay` after normalization. It is derived from the Blueprint, not trusted from model output.
- `QualityGate` remains deterministic-first. It checks visible step content, schema validity, pattern fit, avoided patterns, placeholder terms, Blueprint step coverage, and trace alignment.
- Teaching metrics are emitted with every QualityGate result: trace_covered_steps, visible_term_steps, action_contract_steps, and template_affordance_steps. Trace coverage proves the Blueprint teaching contract; visible coverage proves that user-facing component copy contains topic grounding rather than internal role labels.
- Action contracts are deterministic: `connect -> module_sandbox`, `adjust -> single_slider`, `simulate -> parameter_simulation`, timeline sorting -> `sequence_order`, classification sorting -> `category_buckets`, and knowledge checks -> exactly one correct option plus an explanation for each option.
- Trace fields are for debugging and eval audit. They must not be used as a substitute for visible user-facing teaching copy.
- No-key or low-quality dynamic generation returns an honest failure state while still carrying enough draft/debug information for diagnosis.
- Knowledge structure inference uses deterministic topic hints before trusting LLM-provided `knowledge_structure`; broad terms in LLM explanations should not override the user's original topic. Broad hints are intentionally kept narrow where needed, e.g. `http request` for system flow so `HTTP status codes` can remain a classification task.
- Dynamic Flow normalization enforces the exact Blueprint Pattern per step and sanitizes unreplaced placeholders such as `{value}`, `{result}`, `{output1}`, and generic placeholder phrases before QualityGate evaluation.
- Dynamic Flow schema repair now normalizes optional `visual_asset` and `next_concepts` before validation, so an invalid mood or advisory field cannot force a good payload into fallback.
- Dynamic Flow LLM calls use a 45s timeout and one retry for transient provider failures.
- Dynamic Flow completion branches are generated from `KnowledgeBlueprint.structure_type`, `core_terms`, and `teaching_sequence` before considering model-provided or static follow-ups, so completion continues the same knowledge path instead of falling back to generic branches.
- `npm run eval:flow-live` samples the real LLM path and separates schema repair from flow/quality repair, so V6 can track both structural validity and teaching reliability.
- `eval:flow-live` also reports each repair tag by inferred knowledge structure plus the four teaching coverage rates. `eval:teaching` is a deterministic negative-contract suite; `eval:teaching-manual` writes a Markdown rubric with each step's planned goal, actual component, visible payload summary, and 1-5 human ratings.
### V6 Generic Structure Skills

The implemented V6 reliability layer uses eight generic Aha Structure Skills, not concept-specific Skills.

Runtime boundary:

Topic -> ConceptPlan -> one Structure Skill -> KnowledgeBlueprint -> Pattern chain -> Flow generation -> deterministic QualityGate

- The eight Skills correspond to reusable knowledge structures: optimisation, system process, probabilistic reasoning, historical change, comparison, classification, causal mechanism, and procedure or algorithm.
- A Skill defines only the reusable teaching contract: four required learning moves, common misconceptions, allowed and disallowed Pattern families, and forbidden framings.
- Topic routing remains in KnowledgeBlueprint inference. Topic-specific grounding terms remain in ConceptPlan. Pattern components own the actual interaction affordance. No Skill contains a prewritten topic lesson or a hard-coded term list.
- Dynamic free generation does not choose simulation_play by default. Formula-backed numeric interaction is allowed only when a verifiable formula is present; otherwise the planner chooses a non-numeric Pattern.
- docs/knowledge-skills contains one concise SKILL.md and one evals/evals.json per structure. eval:skills checks that all eight documents, the runtime registry, and Blueprint fixtures agree.
- generateDynamicFlow returns structured repair_actions so live evaluation can identify which generic contract or prompt needs improvement.

### V6 Verifiable Numerical Interaction Contract

parameter_explore output entries may declare formula: kind compound_interest, principal, periods, rate_unit, and output. simulation_play may declare formula: kind compound_interest, principal_param, rate_param, and rate_unit.

For a declared or explicitly inferred compound-interest model, runtime calculation is deterministic: future_value = principal × (1 + annual_rate)^periods.

The UI renders the formula and active substitution next to the result. simulation_play performs the same calculation for each period; it never derives a rate from parameter position. The only automatic inference is narrow: a compound-interest Flow with parameter labels that explicitly identify principal and annual rate. If a model lacks a verifiable formula, its output is labelled as a qualitative trend index rather than a factual number.

QualityGate accepts a compound-interest Flow only when a verifiable formula is attached to a slider output or simulation payload. Formula-free simulations cannot pass as numerical teaching.
### V7 Evidence Boundary

Generic Structure Skills improve teaching form and interaction fit. They are not a factual knowledge base and must not be presented as one.

V7 should introduce an Evidence Pack only when a topic needs externally verifiable facts, formulas, dates, or current information:

1. A lightweight agent decides whether evidence is required and asks a configured retrieval provider for a small set of authoritative sources.
2. The system normalizes those results into an Evidence Pack containing source, claim, date when relevant, formula or quote bounds, and allowed grounding terms.
3. ConceptPlan and KnowledgeBlueprint may use the Evidence Pack, while QualityGate deterministically verifies only its structured fields and citations.
4. There is no always-on RAG, giant internal Wiki, or uncontrolled web search in V6. Retrieval remains opt-in and provider-agnostic until source policy, latency, cost, and citation UI are designed.

### V6 Generation Visibility

`POST /api/flow` returns a sanitized `preview` payload for production UI: topic, detected knowledge structure, compact core terms, planned four-step path, source, and gate state. Its standard JSON response remains available for non-stream callers. When the client sends `stream: true`, the route emits SSE `stage` events directly from the real `generateDynamicFlow` lifecycle (`concept_plan -> blueprint -> flow -> quality_gate`, with optional `repair` or `fallback`) and then emits the same sanitized `result` payload. `/explore` consumes those events instead of local timers, shows the decomposition as an explicit checkpoint, and lets users click `进入路径` or `重新拆一次`. This makes the live generation pipeline visible without exposing raw model output or internal debug logs.

### V6 Skill-Creator Asset Standard

V6 internal Skill Packs now have a project-level, skill-creator-style asset layer under `docs/knowledge-skills/`. Each supported knowledge structure owns one skill folder named `aha-<structure>` with:

- `SKILL.md`: YAML frontmatter with `name` and a triggering `description`, plus concise teaching-contract instructions.
- `evals/evals.json`: skill-level prompts and expectations synchronized with `tests/fixtures/blueprint-cases.json`.

These folders are not user-installable Codex skills. They are the human and agent editable specification layer for the runtime generic Structure Skills in src/lib/content/skill-packs.ts. Runtime reads the TypeScript registry so behavior remains deterministic and cheap.

`npm run eval:skills` verifies that the skill folders, frontmatter, Pattern recipes, teaching steps, eval cases, and runtime prompt contracts stay aligned with the runtime generic Skills and Blueprint fixture set.

Runtime Flow generation injects a compact Structure Skill contract into both the first-pass Flow prompt and the repair prompt. It carries the selected generic Skill id, structure type, four teaching requirements, allowed and avoided Pattern families, misconceptions, and forbidden framings. It never injects a concept-specific lesson or a static topic term list.

### V6 Grounding Stabilization Update

ConceptPlan grounding is topic-owned and deterministic-first:

- normalizeConceptPlan filters generic filler from grounding_terms; it does not borrow terms from a special Skill skeleton.
- KnowledgeBlueprint selects one generic Structure Skill from the inferred knowledge structure, while ConceptPlan supplies the concrete terms for the current topic.
- Fallback ConceptPlans preserve their topic and may use known domain anchors, but public failure UI does not disguise a low-quality fallback as a completed AI lesson.
- TeachingTrace records the internal four-step contract for audit. Visible QualityGate coverage reads rendered payload fields and requires topic grounding, not raw internal action labels. It also supports a small deterministic bilingual alias layer for common teaching terms, so valid Chinese UI copy such as “目标函数/可行域/最优解” can satisfy English ConceptPlan anchors such as `objective function` / `feasible region` / `optimum` without exposing raw English tags.
- eval:flow-live supports targeted live checks, for example npm run eval:flow-live -- --case=optimization --runs=5.

Current validation:

- Non-live gates pass: typecheck, build, eval:score, eval:blueprint, eval:flow-dynamic, eval:skills, eval:teaching, and eval:math.
- A live rebaseline still requires a configured provider account and is intentionally separate from deterministic local checks.
### V6 Live Baseline After Provider Recharge

After the provider key was recharged, `eval:flow-live` was rerun successfully.

- `npm run eval:flow-live -- --case=history --runs=5`: 5/5 pass, repair reliance 0.
- `npm run eval:flow-live -- --limit=8 --runs=3`: 24/24 pass, `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, `flow_repair_rate: 0.042`, `repair_reliance_rate: 0.042`.
- The only follow-up code change was narrowing the historical-change forbidden framing from `只背年份` to `年份就是全部`, preventing QualityGate from rejecting useful wrong-answer/anti-pattern copy.

This was the post-recharge interim V6 live reliability baseline; the 2026-06-20 release smoke below supersedes it.
### V6 Flow Candidate Unwrapping

`normalizeGeneratedFlow()` now uses a deterministic `extractFlowCandidate()` layer before Flow normalization.

Supported model response shapes:

- Direct Flow object
- `{ flow: {...} }`
- `{ knowledge_flow: {...} }` / `{ knowledgeFlow: {...} }`
- `{ result: {...} }`
- `{ data: {...} }`
- `{ output: {...} }`
- Top-level play arrays, converted to `{ plays: [...] }`

This change reduces avoidable `flow_repair` without weakening schema validation or QualityGate. The 2026-06-21 full live release baseline after this change was 24/24 with repair reliance 0.

### V6 Release Smoke - 2026-06-20

V6 当前工程范围已完成并复验：`eval:blueprint` 的 80 个固定用例为 `overall: 1`；2026-06-21 的 `npm run eval:flow-live -- --limit=8 --runs=3` 24 次真实 LLM 运行全部通过，`overall: 1`、`llm_success_rate: 1`、`schema_repair_rate: 0`、`flow_repair_rate: 0`、`repair_reliance_rate: 0`。该 live Eval 还校验真实阶段顺序：`concept_plan -> blueprint -> flow -> quality_gate`。后续新增的标题具体性闸门沿用同一 live Eval，并允许记录一次受控 repair。

V6 之外的准确性增强仍按既定边界推进：V6.5 考虑低置信度 topic 的可选检索 grounding，V7 再考虑可审计的内部 Wiki / Skill Memory；这些能力不作为当前自由生成链路的硬依赖。
### V6 Project Audit - 2026-06-21

- `retry-generate-text.ts` is the only `generateText` retry implementation. It retries transient provider failures once with exponential backoff and defaults to a 45-second request timeout; chat, curated Flow, and dynamic Flow all use it.
- `POST /api/flow` now protects the public cost boundary with an in-memory per-client limit of 8 requests per 10 minutes. It returns `429` with `Retry-After` and `X-RateLimit-Remaining`, rejects malformed JSON with `400`, strips control characters, and returns `413` for topics longer than 80 characters.
- `writeFlowDraft()` returns a boolean. Explore and generated follow-up branches surface a storage-permission/quota error instead of navigating to `/flow/custom` without a readable draft. `recordCompletedFlow()` remains nonfatal so a blocked localStorage write cannot break the completed Flow UI.
- The 2026-06-21 strict release smoke passed: `npm run lint`, `npm run typecheck`, `npm run build`, `eval:score` 32/32, local `eval:flow` 15/15, `eval:blueprint` 80/80, `eval:flow-dynamic` 9/9, `eval:skills` 8/8, `eval:showcase` 10/10 Pattern coverage, and `eval:flow-live -- --limit=8 --runs=3 --strict --threshold=1` 24/24 with all repair action rates at 0.
- A diagnosed comparison drift (`dimensions[].name/title` instead of `label`) is addressed in the generation contract, not hidden by a fallback field rewrite. A targeted strict comparison sample passed 5/5 before the full smoke.
## DeepSeek JSON Output 边界

结构化生成统一经过 `src/lib/llm/retry-generate-text.ts`。当调用方传入 `jsonOutput: true` 时，包装层会给 AI SDK 设置 JSON response format，DeepSeek provider 会映射为 `response_format: { type: "json_object" }`。

当前启用范围：
- `/api/chat` 的 JSON Schema fallback 与 repair。
- 精选 Flow 的 LLM Flow Steps 生成。
- 自由 Flow 的 ConceptPlan、Flow 生成和 Flow repair。

当前不启用范围：
- Tool Calling。工具调用本身已经有工具 schema，不走纯文本 JSON。
- 规则路由、追问识别、状态提炼等非结构化输出任务。

边界说明：JSON Output 只保证模型更倾向输出合法 JSON，并不能保证教学正确、事实准确、Pattern 选择合理或文案自然。后续质量仍由 Zod Schema、KnowledgeBlueprint、Structure Skill、QualityGate 和 V7 Evidence Pack 负责。2026-07-01 live rebaseline 后，`eval:flow-live` 8/8 通过；结构质量提升来自 JSON Output + QualityGate 中英术语别名 + 分步核心术语覆盖，而不是增加概念专属 Skill。

补充：当 Flow 正文生成和 repair 都未通过 QualityGate，但 ConceptPlan / KnowledgeBlueprint 已通过时，系统会使用基于该 Blueprint 的确定性 fallback，而不是固定 topic mock。该 fallback 仍会保留 validation_error，便于开发模式定位问题。
### 2026-07-05 visible grounding closeout

Dynamic Flow visible cue selection now filters generic internal teaching-action words before choosing the learner-facing anchor term. Terms such as `condition`, `mechanism`, `result`, `intervention`, `input`, `output` and their Chinese equivalents are treated as scaffolding, not topic grounding. The UI-visible title, description, and instruction fields now prefer concrete ConceptPlan / Blueprint terms, while `teaching_trace` remains the internal audit record.

The fix is generic: it does not add concept-specific fallback content. It prevents generated cards from exposing backend teaching roles as product copy, and it gives QualityGate the same kind of concrete terms that learners see. Latest verification: focused causal live sample 5/5 with repair reliance 0; full `eval:flow-live` 8/8 with `overall=1` and all teaching metrics at 1.
## V7 Technical Planning - MVP Quality Guardrail

V7 is not the next four-week development mainline. The immediate mainline is V6 MVP public demonstration and portfolio readiness.

The V7 technical direction is kept as a quality guardrail around the existing V6 dynamic Flow chain:

```text
User topic
  -> optional lightweight SourcePack / checklist
  -> ConceptPlan
  -> KnowledgeBlueprint
  -> Generic Structure Skill
  -> TeachingFlow / Pattern Plan
  -> UISchema
  -> deterministic QualityGate
  -> Flow or honest failure
```

Near-term V7 constraints:

- Do not build a full SourcePack service yet.
- Do not add always-on retrieval, RAG, internal Wiki, or database-backed evidence storage.
- Do not create concept-specific Skills.
- Use generic Structure Skills and small quality checks only where they directly improve the MVP demo.
- Keep V6 downstream generation, Flow playback, Hub, and Eval infrastructure intact.

The practical V7 guardrail metrics are correctness, topic match, copy style, and interaction clarity. They should first be checked against the fixed validation concepts listed in `docs/MVP_SCOPE.md`, not expanded into a large new evaluation system.

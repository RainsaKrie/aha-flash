# 趣灵 aha-flash — 技术与实现

> 文档定位：记录当前技术真相、实现约束和验证规则。产品路线见 `PRODUCT.md`，完成记录见 `CHANGELOG.md`。

## 1. 架构总览

```text
User
  |
  v
Next.js App Router
  |
  +-- UI Shell: topbar + centered component stage + bottom input bar
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
  +-- V2 Schema: pattern + template + payload + depth + next_concepts
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

`normalizeUISchema()` 会把 V1/V2 统一转成：

```ts
{
  type: UISchemaType;
  pattern: PatternType;
  template: TemplateId;
  version: string;
  config: Record<string, unknown>;
  depth: "rapid" | "scenario" | "mapping";
  next_concepts: Array<{ label: string; relation: string }>;
}
```

组件 payload 允许携带交互意图字段，而不仅是展示文案：

- `comparison` 可携带 `subject_a`、`subject_b`、`dimensions`、`summary`。
- `parameter_explore` 可携带 `outputs`、`insight_rules`。
- `system_builder` 可携带 `required_module_ids`、`expected_sequence`、`connections`、`success_summary`。
- 所有 payload 可携带 `metaphor_trace`，用于记录隐喻推理，不在前端渲染。

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

## 7. Pattern / Template 注册

代码侧以 `src/types/schema.ts` 中的 `SCHEMA_CATALOG` 作为协议映射源，并由 `src/components/generative-ui/registry.tsx` 将 `pattern/template` 映射到 React 组件。

原则：

- 新增 Pattern 时，先更新类型和 `SCHEMA_CATALOG`。
- 新增 Template 时，保持 Schema 校验、mock、Prompt 示例和组件注册同步。
- V1 类型只保留兼容入口，新能力优先走 V2 `pattern/template/payload`。
- 组件质量规则由 `PRODUCT.md` 的互动组件质量标准约束，具体实现优先落在 `src/components/generative-ui/shared.tsx`。

## 8. Tool 与来源输入

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
| `generate_narrative_branch` | `narrative_branch` |
| `generate_classification_sort` | `classification_sort` |
| `generate_simulation_play` | `simulation_play` |

T30 已在 `src/lib/tools/generative-tools.ts` 定义 10 个 Pattern Tool，每个 Tool 的 `inputSchema` 只包含该 Pattern 的 payload 字段、`depth` 和 `next_concepts`。T31 已让 `/api/chat` 优先通过 Tool Calling 选择 Pattern，选 Tool 即选 Pattern。若 DeepSeek Tool Calling 不稳定，现有 JSON Schema 生成链路作为 L2 fallback，最终仍可回退 mock schema。

来源输入技术原则：

- 文字输入是当前主路径。
- 搜索、URL 自动路由、网页抓取和 YouTube 字幕抓取已经从聊天主链路和 Tool 注册中移除。
- 用户看到外部内容时，近期优先通过直接复制文本进入输入框。
- 图片、音频、剪贴板、系统分享属于远期自然入口，需要多模态或转录能力支持。

## 9. 前端状态和交互反馈

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

## 10. 质量评估

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

## 11. 开发工作流

新增规划统一进入 `docs/input-docs/`。处理顺序：

1. 读取 `docs/input-docs/` 根目录的新文档。
2. 判断新增、重复、过期和仅归档内容。
3. 先合并到 `PRODUCT.md` / `TECHNICAL.md` / `CHANGELOG.md`。
4. 再按合并后的文档开发。
5. 开发完成后提交并推送。
6. 审查已处理输入的去留：已整合、重复、过期或无独立追溯价值的直接删除；只有仍需追溯来源的材料才进入 `docs/input-docs/archive/`。

## 12. 验证命令

每次功能提交前至少运行：

```bash
npm run typecheck
npm run build
```

涉及前端交互时，启动本地服务并用浏览器或 Playwright 验证至少一个真实路径。

文档-only 修改可不跑构建，但必须扫描引用：

```bash
rg -n "旧入口文档|待处理输入|archive" docs/README.md docs/PRODUCT.md docs/TECHNICAL.md docs/input-docs/README.md
```

## 13. 首页布局约束

首页采用产品级工作台布局，不再展示开发调试侧栏：

- `src/app/page.tsx` 只渲染顶栏、组件舞台和底部输入栏。
- 用户状态、输出 pattern/template、交互次数、会话摘要只作为内部状态和 API 上下文，不在首页展示。
- 对话历史不作为首页主要信息架构。
- 下一步概念推荐和深度引导出现在组件下方/输入框上方。
- `src/app/globals.css` 的 `body` 背景保持纯背景色，不使用网格线装饰。

## 14. 组件 UI 规格

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

## 15. Prompt 与隐喻推理

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

## 16. 环境变量

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

## 17. 关键决策

| 决策 | 当前选择 | 原因 |
|---|---|---|
| Schema 协议 | V2 `pattern/template/payload` + V1 兼容 | 降低 LLM 输出复杂度，支持骨架复用 |
| LLM fallback | 无 key 时使用 mock schema | 保证 demo 和开发链路可运行 |
| 状态存储 | 本地文件 / Vercel `/tmp` | 当前阶段轻量；生产需迁移 |
| UI 组件 | 自建 React 组件 | 控制交互体验和协议映射 |
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

## 18. 已知技术债

- Vercel `/tmp` 状态不持久，不能作为生产记忆。
- 当前 mock schema 仍承担较多验收输入路由。
- 追问检测和路由分类已默认改为规则判别，后续需要真实对话样本回归。
- 当前流式生成是 `/api/chat` 的 NDJSON 阶段事件流，最后仍以完整 Schema 渲染；后续如需边生成边预览，需要重新设计增量 Schema 协议。

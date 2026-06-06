# 趣灵 aha-flash — 技术架构文档

> 文档定位：记录当前技术真相和关键决策。任务拆解放 `BACKLOG.md`，完成记录放 `CHANGELOG.md`。

---

## 1. 架构总览

```text
User
  |
  v
Next.js App Router
  |
  +-- UI Shell: chat + state panel + generative workbench
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
  +-- mock fallback when API key is absent

Generative UI Layer
  |
  +-- V2 Schema: pattern + template + payload + depth + next_concepts
  +-- Registry maps pattern/template to React components
```

---

## 2. 技术栈

| 层 | 技术 |
|---|---|
| App | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, local UI primitives, lucide-react |
| LLM | Vercel AI SDK, DeepSeek provider |
| State | Zustand client store, file/tmp JSON server state |
| Validation | Zod |
| Tools | YouTube transcript, web content extraction, Tavily web search |
| Deploy | Vercel |

---

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

---

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
- 每轮对话只写入压缩摘要和关键洞察。
- 每个知识资产只保存概念名、`pattern/template`、理解深度、主题域和学习时间。
- 同一概念重复学习时覆盖旧资产，避免状态列表膨胀。
- 状态体积保持小而可读。

---

## 5. 对话生命周期

```text
POST /api/chat
  |
  +-- initUserState(userId)
  +-- classifyConversationIntent(input)
  +-- collectSourceContexts(input)
  +-- buildSystemPrompt(state + route + target_depth + source_context)
  +-- generateSchemaWithLLM()
      |
      +-- if model unavailable or invalid output: createMockSchema()
  +-- normalizeUISchema(schema)
  +-- reflectTurn(input, route, schemaType, state)
  +-- stateStore.applyTurnReflection()
  +-- if route is knowledge: stateStore.addKnowledgeAsset()
  +-- return schema + depth + next concepts + route + userState
```

---

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

`next_concepts` 是可选输入字段，归一化后始终是数组。前端在工作台组件下方展示前两个推荐概念，点击后触发下一轮学习。

`depth` 是可选输入字段，归一化后默认为 `rapid`。`/api/chat` 会把请求中的目标深度注入 Prompt，并将最终 schema 附上该深度。知识资产理解深度按 `rapid -> shallow`、`scenario -> moderate`、`mapping -> deep` 写入。

---

## 7. 当前 Pattern / Template

| Pattern | Templates |
|---|---|
| `probability` | `card_flip_reveal`, `spin_wheel` |
| `parameter_explore` | `single_slider`, `dual_slider` |
| `concept_memory` | `term_cards`, `grid_match` |
| `process_timeline` | `horizontal_timeline`, `vertical_scroll` |
| `comparison` | `split_panel`, `overlay_fade` |
| `knowledge_check` | `single_question`, `combo_chain` |
| `system_builder` | `module_sandbox`, `flow_connect` |
| `narrative_branch` | `branch_story` |
| `classification_sort` | `category_buckets` |
| `simulation_play` | `parameter_simulation` |

组件注册在 `src/components/generative-ui/registry.tsx`。

---

## 8. Tool 系统

当前工具：

| Tool | 作用 |
|---|---|
| `youtube_transcript_fetch` | 抓取 YouTube 字幕 |
| `web_content_extract` | 提取网页正文 |
| `web_search` | 搜索外部网页，返回短摘要和 URL |
| `update_user_state` | 服务端注入 `user_id` 后增量更新用户画像 |

来源路由：
- 用户输入中含 URL 时，`source-router.ts` 会尝试抓取。
- 用户输入不含 URL 但包含外部信息信号时，`source-router.ts` 会触发 `web_search`。
- 搜索结果只注入 Prompt 上下文，不长期保存全文。
- 未配置 `TAVILY_API_KEY` 时，搜索工具返回可控失败，聊天来源中展示失败状态。

---

## 9. 前端状态和交互反馈

客户端 store：`src/stores/app-store.ts`

前端保存：
- `userId`
- `userState`
- `messages`
- `currentSchema`
- 当前学习深度
- loading/error

`/sandbox` 页面通过同一个 localStorage 用户 ID 读取 `/api/state`，将 `knowledge_assets` 按 `topic_area` 分组，展示概念卡片、`pattern/template`、理解深度和学习时间。

组件交互通过 `/api/interaction` 回写摘要：
- 抽卡完成
- 滑块变化
- 时间线查看
- 测验回答
- 分类完成
- 模拟完成
- 模块构建完成

---

## 10. 质量评估

质量体系包含：
- `tests/fixtures/test-cases.json`：固定输入集合，覆盖全部 Pattern、深度和意图。
- `tests/eval/score.ts`：评分单个预测文件；无预测文件时使用 mock schema 作为基线。
- `tests/eval/compare.ts`：对比两个预测文件，输出总分和逐 case 分数差异。

评分维度：
- JSON 合法率
- Pattern/Template/Depth 准确率
- Route 准确率
- 隐喻关键词贴合度
- Payload 完整度

命令：

```bash
npm run eval:score
npm run eval:score -- --json
npm run eval:compare -- baseline.json candidate.json
```

---

## 11. 关键决策

| 决策 | 当前选择 | 原因 |
|---|---|---|
| Schema 协议 | V2 `pattern/template/payload` + V1 兼容 | 降低 LLM 输出复杂度，支持骨架复用 |
| LLM fallback | 无 key 时使用 mock schema | 保证 demo 和开发链路可运行 |
| 状态存储 | 本地文件 / Vercel `/tmp` | 当前阶段轻量；生产需迁移 |
| UI 组件 | 自建 React 组件 | 控制交互体验和协议映射 |
| 路由分类 | LLM 优先，规则 fallback | 有 key 时更准，无 key 时稳定可演示 |

---

## 12. 已知技术债

- Vercel `/tmp` 状态不持久，不能作为生产记忆。
- 当前 mock schema 仍承担较多验收输入路由。

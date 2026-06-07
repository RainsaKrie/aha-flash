# 趣灵 aha-flash — 技术与实现

> 文档定位：记录当前技术真相、实现约束和验证规则。产品路线见 `PRODUCT.md`，完成记录见 `CHANGELOG.md`。

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

## 2. 技术栈

| 层 | 技术 |
|---|---|
| App | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, local UI primitives, lucide-react |
| LLM | Vercel AI SDK, DeepSeek provider |
| State | Zustand client store, file/tmp JSON server state |
| Validation | Zod |
| Tools | Tool bridge；搜索和 URL 路由为 Round 2 待删除表面积 |
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
- 每轮对话只写入压缩摘要和关键洞察。
- Round 2 需要增加短期对话窗口，携带最近 3 轮原文，以减少追问时的信息丢失。
- 同一概念重复学习时覆盖旧资产，避免状态列表膨胀。
- 状态体积保持小而可读。

## 5. 对话生命周期

```text
POST /api/chat
  |
  +-- initUserState(userId)
  +-- classifyConversationIntent(input)
  +-- collectSourceContexts(input)        # Round 2 待删除
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

Round 2 目标生命周期：

```text
POST /api/chat
  |
  +-- initUserState(userId)
  +-- attach recent_messages
  +-- detect follow-up vs new topic
  +-- classifyConversationIntent(input, thread context)
  +-- buildSystemPrompt(state + recent_messages + thread + target_depth)
  +-- generate / stream schema
  +-- normalize schema
  +-- reflect turn and update current thread
  +-- archive thread summary when topic breaks
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

这些字段是可选增强项；缺失时组件仍保留兼容兜底，但 Prompt 应优先输出带交互结构的 payload。

## 7. Pattern / Template 注册

代码侧以 `src/types/schema.ts` 中的 `SCHEMA_CATALOG` 作为协议映射源，并由 `src/components/generative-ui/registry.tsx` 将 `pattern/template` 映射到 React 组件。

原则：

- 新增 Pattern 时，先更新类型和 `SCHEMA_CATALOG`。
- 新增 Template 时，保持 Schema 校验、mock、Prompt 示例和组件注册同步。
- V1 类型只保留兼容入口，新能力优先走 V2 `pattern/template/payload`。
- 组件质量规则由 `PRODUCT.md` 的互动组件质量标准约束，具体实现优先落在 `src/components/generative-ui/shared.tsx`。

## 8. Tool 与来源输入

历史工具：

| Tool | 当前判断 |
|---|---|
| `youtube_transcript_fetch` | 只适合作为用户明确给 URL 的辅助入口 |
| `web_content_extract` | URL 抓取备用能力 |
| `web_search` | Round 2 标记为待删除 |
| `update_user_state` | 保留，用于服务端注入 `user_id` 后增量更新用户画像 |

来源输入技术原则：

- 文字输入是当前主路径。
- 搜索、URL 自动路由不作为核心链路。
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

`/sandbox` 页面通过同一个 localStorage 用户 ID 读取 `/api/state`，将 `knowledge_assets` 按 `topic_area` 分组，展示概念卡片、`pattern/template`、理解深度和学习时间。

组件交互通过 `/api/interaction` 回写摘要：

- 抽卡完成
- 滑块变化
- 时间线查看
- 测验回答
- 分类完成
- 模拟完成
- 模块构建完成

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

## 14. 环境变量

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_APP_NAME=趣灵
NEXT_PUBLIC_MAX_STEPS=5
AHA_FLASH_STATE_DIR=
```

说明：

- 没有 `DEEPSEEK_API_KEY` 时使用 mock schema fallback。
- Vercel demo 默认写 `/tmp/aha-flash/states`，不保证长期持久。
- 搜索相关环境变量是历史表面积，Round 2 计划移除。

## 15. 关键决策

| 决策 | 当前选择 | 原因 |
|---|---|---|
| Schema 协议 | V2 `pattern/template/payload` + V1 兼容 | 降低 LLM 输出复杂度，支持骨架复用 |
| LLM fallback | 无 key 时使用 mock schema | 保证 demo 和开发链路可运行 |
| 状态存储 | 本地文件 / Vercel `/tmp` | 当前阶段轻量；生产需迁移 |
| UI 组件 | 自建 React 组件 | 控制交互体验和协议映射 |
| 路由分类 | LLM 优先，规则 fallback | 有 key 时更准，无 key 时稳定可演示 |

## 16. 已知技术债

- Vercel `/tmp` 状态不持久，不能作为生产记忆。
- 当前 mock schema 仍承担较多验收输入路由。
- 搜索和 URL 自动路由与最新产品判断冲突，需要按 Round 2 T00 删除。
- 对话追问依赖压缩摘要，缺少短期原文窗口和线程级摘要。
- 互动组件已经开始按 Design Spec 改造，但仍需要逐组件完成质量统一。

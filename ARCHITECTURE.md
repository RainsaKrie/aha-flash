# 趣灵 aha-flash — 技术架构文档 (ARCHITECTURE.md)

> 版本: v1.0 | 日期: 2026-06-05 | 配套 PRD 版本: v1.0

---

## 一、架构总览

```
                           aha-flash System Architecture
                                  (Harness 3-Layer)

┌──────────────────────────────────────────────────────────────────────────┐
│                         🔧 Extension Layer (扩展层)                       │
│                      Next.js + Vercel AI SDK + React                     │
│                                                                          │
│   ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌──────────────┐        │
│   │Gacha     │  │Slider     │  │CardFlip    │  │Timeline      │  ...   │
│   │Simulator │  │Explorer   │  │            │  │Scrubber      │        │
│   └──────────┘  └───────────┘  └────────────┘  └──────────────┘        │
│                                                                          │
│   UI Schema → React Server Components → Interactive Widgets             │
├──────────────────────────────────────────────────────────────────────────┤
│                        🔗 Interface Layer (接口层)                        │
│                      Tools / Function Calling                            │
│                                                                          │
│   ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐    │
│   │ YouTube Transcript│  │ Web Content       │  │ Raw Text         │    │
│   │ Fetcher           │  │ Extractor         │  │ Input            │    │
│   └───────────────────┘  └───────────────────┘  └──────────────────┘    │
│                                                                          │
│   Agent判定需求 → 触发Tool调用 → 拉取外部语料 → 注入推理上下文             │
├──────────────────────────────────────────────────────────────────────────┤
│                       ⚙️ Mechanism Layer (机制层)                         │
│                   State Machine / Context Orchestration                  │
│                                                                          │
│   ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐      │
│   │ User_State.json │   │ System Prompt    │   │ Conversation     │      │
│   │ (轻量状态文件)    │   │ Composer        │   │ Router           │      │
│   └─────────────────┘   └─────────────────┘   └──────────────────┘      │
│                                                                          │
│   读取状态 → 组装System Prompt → 路由对话 → 更新状态                       │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │   LLM Provider    │
                         │ (DeepSeek/Claude) │
                         └──────────────────┘
```

---

## 二、目录结构

```
aha-flash/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 根布局
│   │   ├── page.tsx                  # 首页（知识探索入口）
│   │   ├── globals.css               # 全局样式 + Tailwind
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts          # 核心对话 API（流式）
│   │       ├── state/
│   │       │   └── route.ts          # 用户状态读写 API
│   │       └── tools/
│   │           └── route.ts          # Tool 调用结果回传 API
│   │
│   ├── components/
│   │   ├── generative-ui/            # ★ 生成式 UI 组件库
│   │   │   ├── registry.ts           # 组件注册表（type → component 映射）
│   │   │   ├── gacha-simulator.tsx   # 抽卡模拟器
│   │   │   ├── slider-explorer.tsx   # 滑块探索器
│   │   │   ├── card-flip.tsx         # 翻牌配对
│   │   │   ├── timeline-scrubber.tsx # 时间轴拖拽
│   │   │   ├── comparison-split.tsx  # 分屏对比
│   │   │   ├── quiz-battle.tsx       # 问答对战
│   │   │   └── build-sandbox.tsx     # 构建沙盒
│   │   │
│   │   ├── chat/
│   │   │   ├── chat-input.tsx        # 用户输入框
│   │   │   ├── chat-message.tsx      # 消息气泡（文字/Schema渲染）
│   │   │   ├── chat-history.tsx      # 对话历史列表
│   │   │   └── thinking-indicator.tsx # AI 思考中动画
│   │   │
│   │   ├── onboarding/
│   │   │   ├── preference-form.tsx   # 首次偏好采集表单
│   │   │   └── style-quiz.tsx        # 隐喻偏好小测验
│   │   │
│   │   └── ui/                       # 基础 UI Kit (shadcn/ui 风格)
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── harness/                  # ★ Harness 核心
│   │   │   ├── state-machine.ts      # 状态机主逻辑
│   │   │   ├── state-store.ts        # 状态持久化（文件/Redis）
│   │   │   ├── prompt-composer.ts    # System Prompt 组装器
│   │   │   └── conversation-router.ts # 对话路由器
│   │   │
│   │   ├── tools/                    # ★ Tool 定义与实现
│   │   │   ├── index.ts             # Tool 注册与导出
│   │   │   ├── youtube-transcript.ts # YouTube 字幕抓取
│   │   │   ├── web-extractor.ts      # 网页正文提取
│   │   │   └── types.ts             # Tool 类型定义
│   │   │
│   │   ├── llm/
│   │   │   ├── provider.ts           # LLM Provider 封装
│   │   │   ├── prompt-templates.ts   # Prompt 模板库
│   │   │   └── schema-validator.ts   # UI Schema JSON 校验
│   │   │
│   │   ├── metaphor/
│   │   │   ├── metaphor-engine.ts    # 隐喻域匹配引擎
│   │   │   └── domain-mappings.ts    # 爱好→隐喻域 映射表
│   │   │
│   │   └── utils/
│   │       ├── cn.ts                 # className 合并
│   │       ├── stream.ts            # 流式数据解析
│   │       └── storage.ts           # localStorage 封装
│   │
│   └── types/
│       ├── state.ts                 # UserState 类型定义
│       ├── schema.ts               # UI Schema 类型定义
│       ├── chat.ts                 # 对话消息类型
│       └── tool.ts                 # Tool 输入输出类型
│
├── data/                            # ★ 状态文件存储目录
│   └── states/
│       └── {user_id}.json           # 每个用户一个状态文件
│
├── public/
│   ├── fonts/
│   └── images/
│
├── .env.local                       # 环境变量
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 三、核心模块设计

### 3.1 机制层 (Mechanism Layer) — Harness 核心

#### 3.1.1 状态机 (`lib/harness/state-machine.ts`)

```
状态机流转:

  [初始化] ──→ [首次用户] ──→ [偏好采集] ──→ [状态建立]
       │                                          │
       └── [回访用户] ──→ [状态恢复] ←──────────────┘
                              │
                              ▼
                        [对话中] ←──→ [状态更新]
                              │
                              ▼
                        [会话结束] ──→ [状态压缩保存]
```

**核心方法**：
- `initUser(userId: string): UserState` — 初始化/恢复用户状态
- `updateUserState(userId: string, patch: Partial<UserState>): void` — 增量更新状态
- `compressHistory(state: UserState): CompressedSummary` — 对话历史摘要压缩
- `getSystemPromptContext(state: UserState): string` — 生成注入 System Prompt 的状态片段

#### 3.1.2 Prompt 组装器 (`lib/harness/prompt-composer.ts`)

**System Prompt 模板结构**：

```
[角色设定] → "你是趣灵（aha-flash），一个AI知识学习引擎..."
[状态注入] → "<User_Profile: hobby=原神, background=文科生...>"
[能力声明] → "你可以调用以下工具：youtube_transcript_fetch, web_extract..."
[输出规范] → "你必须输出合法的 UI Schema JSON，不可直接输出纯文本解释..."
[隐喻指南] → "优先使用用户的偏好隐喻域生成解释..."
[Schema参考] → 附上所有支持的 UI Schema 类型及示例
```

#### 3.1.3 对话路由器 (`lib/harness/conversation-router.ts`)

**路由判断逻辑**：
1. 是否为知识探索类问题？→ 触发隐喻引擎
2. 是否需要外部信息？→ 判定是否调用 Tool
3. 是否为非知识类闲聊？→ 简短回复，不触发 UI 生成
4. 是否为 UI 交互反馈？→ 更新用户理解状态

---

### 3.2 接口层 (Interface Layer) — 工具系统

#### 3.2.1 Tool 定义规范 (OpenAI Function Calling 格式)

```typescript
// lib/tools/types.ts
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

// V1 工具列表
const V1_TOOLS: ToolDefinition[] = [
  {
    name: "youtube_transcript_fetch",
    description: "抓取 YouTube 视频字幕/转录文本，用于提取播客、访谈等高价值语料",
    parameters: {
      type: "object",
      properties: {
        video_url: { type: "string", description: "YouTube 视频 URL" },
        language: { type: "string", description: "字幕语言，默认 zh" }
      },
      required: ["video_url"]
    }
  },
  {
    name: "web_content_extract",
    description: "提取网页正文核心内容，去除广告和导航等噪音",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "目标网页 URL" },
        max_length: { type: "number", description: "最大提取字符数，默认 3000" }
      },
      required: ["url"]
    }
  }
];
```

#### 3.2.2 Tool 调用流程

```
LLM 输出 function_call
    → 前端拦截（stream protocol）
    → 前端执行 Tool（或转发到 /api/tools 执行）
    → 结果注入回 LLM 上下文
    → LLM 继续推理，输出 UI Schema
```

#### 3.2.3 数据源抓取实现方案

| Tool | 实现方案 | 依赖 |
|---|---|---|
| YouTube Transcript | `youtube-transcript` npm 包 或 `youtubei.js` | 零 API Key |
| Web Content Extract | `@mozilla/readability` + `cheerio` 或 `jsdom` | 零 API Key |
| Raw Text Input | 直接使用用户输入，无需额外处理 | 无 |

---

### 3.3 扩展层 (Extension Layer) — 生成式 UI

#### 3.3.1 Vercel AI SDK 集成方式

```
┌──────────────────────────────────────────────────┐
│                   数据流 (Stream)                  │
│                                                  │
│  POST /api/chat                                  │
│    → Harness组装 System Prompt + 状态注入          │
│    → LLM API (stream: true, tools: V1_TOOLS)      │
│    → 检测流式输出中的 tool_calls                    │
│       ├── 有 tool_call → 执行 → 注入结果 → 继续     │
│       └── 无 → 解析 JSON → 校验 Schema             │
│    → Streaming Text Response (SSE)                │
│    → 前端 useChat() 订阅流                         │
│    → 检测 Schema JSON → 渲染对应组件                │
│    → 用户交互 → 反馈回 API                          │
└──────────────────────────────────────────────────┘
```

**核心代码骨架**（`app/api/chat/route.ts`）：
```typescript
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  // 1. 读取用户状态
  const state = await stateStore.get(userId);

  // 2. 组装 System Prompt（注入状态）
  const systemPrompt = promptComposer.build(state);

  // 3. 流式调用 LLM
  const result = streamText({
    model: createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY })('deepseek-chat'),
    system: systemPrompt,
    messages,
    tools: V1_TOOLS,
    maxSteps: 5,  // 最多5轮 tool calling
  });

  return result.toDataStreamResponse();
}
```

#### 3.3.2 组件注册表

```typescript
// components/generative-ui/registry.ts
import { GachaSimulator } from './gacha-simulator';
import { SliderExplorer } from './slider-explorer';
import { CardFlip } from './card-flip';
import { TimelineScrubber } from './timeline-scrubber';
import { ComparisonSplit } from './comparison-split';
import { QuizBattle } from './quiz-battle';
import { BuildSandbox } from './build-sandbox';

export const UI_COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  'gacha_simulator':   GachaSimulator,
  'slider_explorer':   SliderExplorer,
  'card_flip':         CardFlip,
  'timeline_scrubber': TimelineScrubber,
  'comparison_split':  ComparisonSplit,
  'quiz_battle':       QuizBattle,
  'build_sandbox':     BuildSandbox,
};

export function renderBySchema(schema: UISchema) {
  const Component = UI_COMPONENT_REGISTRY[schema.type];
  if (!Component) {
    console.warn(`Unknown schema type: ${schema.type}`);
    return null;  // fallback: 纯文本渲染
  }
  return <Component config={schema.config} />;
}
```

#### 3.3.3 前端渲染器 (`components/chat/chat-message.tsx`)

核心逻辑：
- 解析 AI 输出内容，分离纯文本和 Schema JSON
- 纯文本渲染为 Markdown
- Schema JSON 渲染为对应的交互组件
- 组件交互事件回调（如用户完成抽卡）→ 生成新的对话消息 → 发送回 /api/chat

---

## 四、数据流详解

### 4.1 完整对话生命周期

```
User Input: "期权是什么？"
    │
    ▼
[POST /api/chat] { messages: [...], userId: "u_abc123" }
    │
    ├─→ stateStore.get("u_abc123")
    │   └─→ data/states/u_abc123.json
    │       └─→ { profile: { hobby: "原神", ... }, ... }
    │
    ├─→ promptComposer.build(state)
    │   └─→ System Prompt 含:
    │       "用户爱好: 原神 → 优先使用游戏抽卡隐喻"
    │
    ├─→ LLM Stream
    │   ├─→ [Round 1] LLM 判定需要外部语料
    │   │   └─→ function_call: youtube_transcript_fetch({query: "巴菲特 期权"})
    │   │       └─→ 前端执行 → 返回转录文本
    │   │
    │   └─→ [Round 2] LLM 融合三路信息
    │       └─→ 输出: { "type": "gacha_simulator", "config": {...} }
    │
    ├─→ Schema Validator 校验
    │   └─→ 通过 ✅ → 流式输出 JSON
    │
    └─→ SSE Response → 前端 useChat()
        │
        ▼
[前端 ChatMessage 组件]
    ├─→ 检测到 JSON Schema
    ├─→ renderBySchema(schema)
    │   └─→ <GachaSimulator config={...} />
    │
    └─→ 用户交互（点击抽卡）
        └─→ 生成反馈消息
        └─→ POST /api/chat (继续对话)
        └─→ 更新 User_State
```

---

## 五、状态管理

### 5.1 使用 Zustand 管理前端状态

```typescript
// 简洁的前端状态管理（替代 Redux 等重型方案）
interface AppStore {
  userId: string;
  userState: UserState | null;
  messages: Message[];
  isStreaming: boolean;
  currentSchema: UISchema | null;

  setUserId: (id: string) => void;
  setUserState: (state: UserState) => void;
  addMessage: (msg: Message) => void;
  // ...
}
```

### 5.2 User_State.json 持久化

- **存储位置**：`data/states/{user_id}.json`
- **读写时机**：会话开始读取，会话结束写入，中间重要事件增量写入
- **文件大小硬限制**：< 5KB
- **压缩策略**：对话历史不存原文，只存 150 字以内的 LLM 摘要

---

## 六、路由设计

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | 首页 | 知识探索入口，输入框 + 对话区 |
| `/onboarding` | 首次偏好设置 | 采集用户背景、爱好、知识盲区 |
| `/history` | 历史记录 | 过去学到过的概念回顾（V2） |
| `/api/chat` | 核心对话 API | POST，流式响应 |
| `/api/state` | 状态 API | GET/PATCH 用户状态 |

---

## 七、关键决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 前端框架 | Next.js 14+ (App Router) | React Server Components 天然支持 Vercel AI SDK |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/deepseek`) | 流式渲染 React 组件最成熟的方案 |
| LLM | DeepSeek (V1) | 成本低，Function Calling 稳定，中文能力强 |
| 状态持久化 | 文件系统 JSON (V1) | 零依赖，轻量，个人项目不需要数据库 |
| 前端状态库 | Zustand | 极轻量，TS 友好，无 boilerplate |
| 样式 | Tailwind CSS + 赛博朋克暗色主题 | 开发快，定制性强 |
| 组件库 | 自建 (shadcn/ui 风格) | 完全控制样式，匹配赛博朋克美学 |
| 数据库 | 无 (V1) | 个人项目无需，文件系统足以 |
| 认证 | 无 (V1) | 匿名用户 ID (nanoid) + localStorage |

---

> 下一步：参见 `IMPLEMENTATION.md` 了解分阶段实施计划。

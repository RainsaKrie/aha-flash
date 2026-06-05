# 趣灵 aha-flash — 实施路线图 (IMPLEMENTATION.md)

> 版本: v1.0 | 日期: 2026-06-05 | 预计总工时: 40-60h (个人项目)

---

## 一、分阶段概览

```
Phase 0 — 项目脚手架        ████░░░░░░░░░░░░░░░░  2-4h
Phase 1 — 机制层（Harness）  ████████░░░░░░░░░░░░  8-12h
Phase 2 — 对话核心           ████████████░░░░░░░░  10-16h
Phase 3 — 生成式 UI 组件库   ████████████████░░░░  12-18h
Phase 4 — 工具与多源聚合     ██████████████████░░  6-10h
Phase 5 — 打磨与上线         ████████████████████  4-8h
```

---

## 二、Phase 0 — 项目脚手架（2-4h）

**目标**：跑通 Next.js + Tailwind + Vercel AI SDK 的基础链路。

### 任务清单

| # | 任务 | 产出 | 估时 |
|---|---|---|---|
| 0.1 | `npx create-next-app@latest aha-flash --typescript --tailwind --app --src-dir` | 项目骨架 | 10min |
| 0.2 | 安装依赖包 | package.json 更新 | 20min |
| 0.3 | 配置 Tailwind 主题（赛博朋克暗色） | tailwind.config.ts | 30min |
| 0.4 | 搭建基础 UI 组件 (shadcn/ui init) | components/ui/ | 30min |
| 0.5 | 配置环境变量 (.env.local) | 环境变量文件 | 10min |
| 0.6 | 创建目录结构 | 完整骨架 | 20min |
| 0.7 | 验证 `npm run dev` | 开发服务器启动 | 10min |

### 依赖安装清单

```bash
# Vercel AI SDK
npm install ai @ai-sdk/deepseek

# 工具库
npm install zod                          # Schema 校验
npm install zustand                      # 前端状态管理
npm install nanoid                       # 用户 ID 生成
npm install youtube-transcript           # YouTube 字幕
npm install @mozilla/readability         # 网页正文提取
npm install jsdom                        # Readability 的 DOM 环境

# UI / 样式
npx shadcn@latest init                   # shadcn/ui 初始化
npx shadcn@latest add button input card dialog textarea

# 开发工具
npm install -D @types/jsdom
```

### 环境变量 (.env.local)

```env
# LLM Provider
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 可选：Claude 作为备选
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# App Config
NEXT_PUBLIC_APP_NAME=趣灵
NEXT_PUBLIC_MAX_STEPS=5
```

### 产出物清单

```
src/app/layout.tsx          ✅ 基础布局
src/app/page.tsx            ✅ 空首页
src/app/globals.css         ✅ Tailwind + 赛博朋克 CSS 变量
tailwind.config.ts          ✅ 定制主题
src/components/ui/          ✅ 基础 UI 组件
.env.local                  ✅ 环境变量
```

---

## 三、Phase 1 — 机制层：Harness 核心（8-12h）

**目标**：实现轻量级状态机、Prompt 组装、对话路由。这是整个系统的"大脑"。

### 任务清单

| # | 任务 | 核心文件 | 估时 |
|---|---|---|---|
| 1.1 | 定义全部 TypeScript 类型 | `src/types/*.ts` | 1h |
| 1.2 | 实现 State Store (文件读写) | `src/lib/harness/state-store.ts` | 2h |
| 1.3 | 实现 State Machine (状态流转) | `src/lib/harness/state-machine.ts` | 2h |
| 1.4 | 实现 Prompt Composer | `src/lib/harness/prompt-composer.ts` | 2h |
| 1.5 | 编写 Prompt 模板库 | `src/lib/llm/prompt-templates.ts` | 1.5h |
| 1.6 | 实现隐喻域匹配引擎 | `src/lib/metaphor/metaphor-engine.ts` | 2h |
| 1.7 | 编写隐喻域映射表 | `src/lib/metaphor/domain-mappings.ts` | 1h |
| 1.8 | 实现 Conversation Router | `src/lib/harness/conversation-router.ts` | 1.5h |
| 1.9 | 编写状态 API 路由 | `src/app/api/state/route.ts` | 1h |
| 1.10 | 单元测试：状态机 + Prompt 组装 | `__tests__/harness/` | 2h |

### 详细设计

#### 1.1 TypeScript 类型定义

**`src/types/state.ts`**：
```typescript
export interface UserProfile {
  background: string;              // "文科生" | "理科生" | "工科生" | "艺术生" | "未知"
  hobbies: string[];              // ["原神", "F1赛车"]
  knowledge_blindspots: string[]; // ["金融", "编程"]
  metaphor_preferences: string[]; // ["游戏机制", "体育竞技"]
  learning_style: "visual" | "interactive" | "textual";
  complexity_tolerance: 1 | 2 | 3 | 4 | 5;
}

export interface CompressedSummary {
  recent_topics: string[];
  key_insights: string[];
  last_session_summary: string;   // ≤150字
  total_interactions: number;
}

export interface UIPreferences {
  theme: "cyberpunk_dark" | "cyberpunk_light";
  interaction_density: "low" | "medium" | "high";
  animation_speed: "slow" | "normal" | "fast";
}

export interface UserState {
  user_id: string;
  profile: UserProfile;
  conversation_compressed: CompressedSummary;
  ui_preferences: UIPreferences;
  updated_at: string;  // ISO 8601
}
```

**`src/types/schema.ts`**：
```typescript
// UI Schema 是所有生成式 UI 组件的统一协议
export type UISchemaType =
  | "gacha_simulator"
  | "slider_explorer"
  | "card_flip"
  | "timeline_scrubber"
  | "comparison_split"
  | "quiz_battle"
  | "build_sandbox";

export interface UISchema {
  type: UISchemaType;
  version: string;
  config: Record<string, unknown>;  // 各组件自行定义 config 结构
}

// 各组件 Config 类型（部分）
export interface GachaSimulatorConfig {
  title: string;
  quote: string;
  quote_author: string;
  pool: GachaPoolItem[];
  option_cost: number;
  strike_price: number;
  pulls_per_try: number;
  explanation_map: {
    win: string;
    lose: string;
  };
}

export interface GachaPoolItem {
  name: string;
  rarity: string;  // "5★" | "4★" | "3★"
  probability: number;
  value: number;
}
```

**`src/types/chat.ts`**：
```typescript
export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  schema?: UISchema;        // 如果 AI 输出了 UI Schema
  tool_calls?: ToolCall[];  // 如果消息包含 tool 调用
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;  // tool 执行结果
}
```

#### 1.2 State Store

**`src/lib/harness/state-store.ts`** 核心逻辑：
```typescript
import fs from 'fs/promises';
import path from 'path';
import { UserState } from '@/types/state';
import { nanoid } from 'nanoid';

const STATES_DIR = path.join(process.cwd(), 'data', 'states');

class StateStore {
  async get(userId: string): Promise<UserState | null> {
    try {
      const raw = await fs.readFile(
        path.join(STATES_DIR, `${userId}.json`), 'utf-8'
      );
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async create(): Promise<UserState> {
    const state: UserState = {
      user_id: nanoid(12),
      profile: {
        background: "未知",
        hobbies: [],
        knowledge_blindspots: [],
        metaphor_preferences: [],
        learning_style: "interactive",
        complexity_tolerance: 3,
      },
      conversation_compressed: {
        recent_topics: [],
        key_insights: [],
        last_session_summary: "",
        total_interactions: 0,
      },
      ui_preferences: {
        theme: "cyberpunk_dark",
        interaction_density: "medium",
        animation_speed: "normal",
      },
      updated_at: new Date().toISOString(),
    };

    await this.save(state);
    return state;
  }

  async update(userId: string, patch: Partial<UserState>): Promise<void> {
    const current = await this.get(userId);
    if (!current) throw new Error(`User ${userId} not found`);
    const updated = { ...current, ...patch, updated_at: new Date().toISOString() };
    // 强制大小检查
    const json = JSON.stringify(updated);
    if (json.length > 5120) {
      throw new Error(`State file exceeds 5KB limit: ${json.length} bytes`);
    }
    await this.save(updated);
  }

  private async save(state: UserState): Promise<void> {
    await fs.mkdir(STATES_DIR, { recursive: true });
    await fs.writeFile(
      path.join(STATES_DIR, `${state.user_id}.json`),
      JSON.stringify(state, null, 2)
    );
  }

  private async compress(state: UserState): Promise<UserState> {
    // LLM 调用：生成对话摘要，更新 conversation_compressed
    // 确保 overall 状态文件 < 5KB
  }
}

export const stateStore = new StateStore();
```

#### 1.3 Prompt Composer

**`src/lib/harness/prompt-composer.ts`** 核心逻辑：

把 UserState 的关键字段编译成 System Prompt 中的精简 `<state>` 标签注入片段。

```typescript
export function buildSystemPrompt(state: UserState): string {
  const stateContext = `
<user_state>
  <profile>
    <background>${state.profile.background}</background>
    <hobbies>${state.profile.hobbies.join(', ')}</hobbies>
    <knowledge_blindspots>${state.profile.knowledge_blindspots.join(', ')}</knowledge_blindspots>
    <metaphor_preferences>${state.profile.metaphor_preferences.join(', ')}</metaphor_preferences>
    <complexity_tolerance>${state.profile.complexity_tolerance}</complexity_tolerance>
  </profile>
  <recent_context>
    <topics>${state.conversation_compressed.recent_topics.join(', ')}</topics>
    <key_insights>${state.conversation_compressed.key_insights.join('; ')}</key_insights>
  </recent_context>
</user_state>
`.trim();

  return `
${SYSTEM_ROLE_PROMPT}

${stateContext}

${METAPHOR_GUIDELINES}

${OUTPUT_FORMAT_RULES}

${SCHEMA_REFERENCE}
`.trim();
}
```

#### 1.4 隐喻域映射表

**`src/lib/metaphor/domain-mappings.ts`**：
```typescript
export const HOBBY_TO_METAPHOR_DOMAIN: Record<string, MetaphorDomain> = {
  // 游戏类
  "原神":        { domain: "gacha_mechanics",    tags: ["抽卡", "概率", "角色养成", "元素反应"] },
  "崩坏：星穹铁道": { domain: "gacha_mechanics",  tags: ["回合制", "光锥", "模拟宇宙"] },
  "王者荣耀":     { domain: "moba_tactics",      tags: ["团战", "经济", "装备", "铭文"] },
  "LOL":         { domain: "moba_tactics",      tags: ["团战", "经济", "装备", "符文"] },

  // 体育类
  "F1赛车":      { domain: "racing_strategy",    tags: ["进站策略", "轮胎管理", "DRS", "排位赛"] },
  "篮球":        { domain: "basketball_tactics", tags: ["挡拆", "快攻", "三双", "绝杀"] },
  "足球":        { domain: "football_tactics",   tags: ["越位", "传控", "反击", "帽子戏法"] },

  // 艺术类
  "音乐":        { domain: "music_theory",       tags: ["和弦", "节奏", "主歌副歌", "调性"] },
  "绘画":        { domain: "visual_art",         tags: ["构图", "色彩", "透视", "笔触"] },

  // 生活类
  "烹饪":        { domain: "cooking",            tags: ["食材配比", "火候", "调味", "摆盘"] },
  "旅行":        { domain: "travel",             tags: ["路线规划", "签证", "时差", "外汇"] },
};

export const DEFAULT_METAPHOR_DOMAIN: MetaphorDomain = {
  domain: "daily_life",
  tags: ["日常类比", "通俗比喻"]
};

export function selectMetaphorDomain(hobbies: string[]): MetaphorDomain {
  for (const hobby of hobbies) {
    if (HOBBY_TO_METAPHOR_DOMAIN[hobby]) {
      return HOBBY_TO_METAPHOR_DOMAIN[hobby];
    }
  }
  return DEFAULT_METAPHOR_DOMAIN;
}
```

### 产出物清单

```
src/types/state.ts              ✅ 用户状态类型
src/types/schema.ts             ✅ UI Schema 类型
src/types/chat.ts               ✅ 对话消息类型
src/types/tool.ts               ✅ Tool 类型
src/lib/harness/state-store.ts  ✅ 状态持久化
src/lib/harness/state-machine.ts ✅ 状态流转逻辑
src/lib/harness/prompt-composer.ts ✅ Prompt 组装
src/lib/harness/conversation-router.ts ✅ 对话路由
src/lib/llm/prompt-templates.ts ✅ Prompt 模板
src/lib/metaphor/metaphor-engine.ts ✅ 隐喻引擎
src/lib/metaphor/domain-mappings.ts ✅ 隐喻映射表
src/app/api/state/route.ts      ✅ 状态 API
```

---

## 四、Phase 2 — 对话核心（10-16h）

**目标**：打通"用户输入 → LLM 流式调用 → Tool Calling → Schema 输出 → 前端渲染"的完整链路。

### 任务清单

| # | 任务 | 核心文件 | 估时 |
|---|---|---|---|
| 2.1 | 封装 LLM Provider | `src/lib/llm/provider.ts` | 1h |
| 2.2 | 实现核心对话 API (stream) | `src/app/api/chat/route.ts` | 3h |
| 2.3 | 实现 Schema Validator (Zod) | `src/lib/llm/schema-validator.ts` | 2h |
| 2.4 | 实现 Streaming 解析（前后端） | `src/lib/utils/stream.ts` | 2h |
| 2.5 | 搭建首页 UI (Chat 布局) | `src/app/page.tsx` + 相关组件 | 3h |
| 2.6 | 实现 ChatInput 组件 | `src/components/chat/chat-input.tsx` | 1.5h |
| 2.7 | 实现 ChatMessage 组件 | `src/components/chat/chat-message.tsx` | 3h |
| 2.8 | 实现 ThinkingIndicator | `src/components/chat/thinking-indicator.tsx` | 1h |
| 2.9 | 集成 Zustand 状态管理 | 前端 store | 1.5h |
| 2.10 | 实现 Onboarding 偏好采集 | `src/components/onboarding/` | 2h |
| 2.11 | 集成 localStorage (userId 持久化) | `src/lib/utils/storage.ts` | 0.5h |

### 详细设计

#### 2.1 LLM Provider

**`src/lib/llm/provider.ts`**：
```typescript
import { createDeepSeek } from '@ai-sdk/deepseek';

export function getLLMProvider() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const deepseek = createDeepSeek({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  });

  // 使用 deepseek-chat 模型，性价比最高，Function Calling 稳定
  return deepseek('deepseek-chat');
}

// 备选：Claude provider
// import { createAnthropic } from '@ai-sdk/anthropic';
// export function getClaudeProvider() {
//   return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })('claude-sonnet-4-6');
// }
```

#### 2.2 核心对话 API

**`src/app/api/chat/route.ts`** 核心逻辑：

```typescript
import { streamText, convertToCoreMessages } from 'ai';
import { getLLMProvider } from '@/lib/llm/provider';
import { stateStore } from '@/lib/harness/state-store';
import { buildSystemPrompt } from '@/lib/harness/prompt-composer';
import { V1_TOOLS } from '@/lib/tools';

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  // 1. 获取用户状态（不存在则创建）
  let state = await stateStore.get(userId);
  if (!state) {
    state = await stateStore.create();
  }

  // 2. 组装系统 Prompt（注入用户状态）
  const systemPrompt = buildSystemPrompt(state);

  // 3. 流式调用 LLM
  const result = streamText({
    model: getLLMProvider(),
    system: systemPrompt,
    messages: convertToCoreMessages(messages),
    tools: V1_TOOLS,
    maxSteps: 5,  // Tool Calling 最大轮次
    onFinish: async (event) => {
      // 4. 对话结束后：压缩状态 + 保存
      const updatedState = await stateStore.compressConversation(state, messages, event);
      await stateStore.save(updatedState);
    },
  });

  // 返回 SSE 流
  return result.toDataStreamResponse();
}
```

#### 2.3 Schema Validator

**`src/lib/llm/schema-validator.ts`**：
```typescript
import { z } from 'zod';

// Zod Schema 定义（所有 V1 组件）
export const UISchemaZod = z.discriminatedUnion('type', [
  // gacha_simulator
  z.object({
    type: z.literal('gacha_simulator'),
    version: z.string(),
    config: z.object({
      title: z.string(),
      quote: z.string().optional(),
      quote_author: z.string().optional(),
      pool: z.array(z.object({
        name: z.string(),
        rarity: z.string(),
        probability: z.number(),
        value: z.number(),
      })),
      option_cost: z.number(),
      strike_price: z.number(),
      pulls_per_try: z.number(),
      explanation_map: z.object({
        win: z.string(),
        lose: z.string(),
        push: z.string().optional(),
      }),
    }),
  }),
  // slider_explorer, card_flip, ... (以此类推)
]);

export function validateSchema(raw: unknown): UISchema | null {
  const result = UISchemaZod.safeParse(raw);
  if (!result.success) {
    console.error('Schema validation failed:', result.error.flatten());
    return null;
  }
  return result.data as UISchema;
}

export function extractSchemaFromText(text: string): UISchema | null {
  // 尝试从文本中提取 JSON 块
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
  const matches = [...text.matchAll(jsonBlockRegex)];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      const validated = validateSchema(parsed);
      if (validated) return validated;
    } catch { /* 继续尝试下一个 */ }
  }

  // 也尝试直接解析（如果 LLM 直接输出裸 JSON）
  try {
    const parsed = JSON.parse(text.trim());
    return validateSchema(parsed);
  } catch {
    return null;
  }
}

export function getSchemaErrors(raw: unknown): string {
  const result = UISchemaZod.safeParse(raw);
  if (!result.success) {
    return JSON.stringify(result.error.flatten(), null, 2);
  }
  return '';
}
```

#### 2.4 ChatMessage 渲染器

**`src/components/chat/chat-message.tsx`** 核心逻辑：

```typescript
'use client';

import { extractSchemaFromText } from '@/lib/llm/schema-validator';
import { renderBySchema } from '@/components/generative-ui/registry';
import ReactMarkdown from 'react-markdown';

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return <div className="user-message">{message.content}</div>;
  }

  // AI 消息：尝试提取 Schema，然后分离纯文本和 UI 组件
  const schema = message.schema || extractSchemaFromText(message.content);

  if (schema) {
    // 从内容中移除 JSON 块，剩余文本作为说明
    const textWithoutJson = message.content
      .replace(/```json[\s\S]*?```/g, '')
      .trim();

    return (
      <div className="assistant-message">
        {textWithoutJson && <ReactMarkdown>{textWithoutJson}</ReactMarkdown>}
        <div className="generative-ui-container">
          {renderBySchema(schema)}
        </div>
      </div>
    );
  }

  // 纯文本消息
  return (
    <div className="assistant-message">
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  );
}
```

### 产出物清单

```
src/lib/llm/provider.ts                 ✅ LLM Provider
src/lib/llm/schema-validator.ts        ✅ Schema 校验
src/lib/utils/stream.ts                ✅ 流式解析工具
src/lib/utils/storage.ts               ✅ localStorage 封装
src/app/api/chat/route.ts              ✅ 核心对话 API
src/app/page.tsx                       ✅ 首页 Chat 布局
src/components/chat/chat-input.tsx     ✅ 输入框
src/components/chat/chat-message.tsx   ✅ 消息渲染
src/components/chat/chat-history.tsx   ✅ 历史列表
src/components/chat/thinking-indicator.tsx ✅ 思考动画
src/components/onboarding/preference-form.tsx ✅ 偏好采集
src/components/onboarding/style-quiz.tsx ✅ 隐喻偏好测验
src/stores/app-store.ts                ✅ Zustand Store
```

---

## 五、Phase 3 — 生成式 UI 组件库（12-18h）

**目标**：实现全部 7 个 V1 交互组件，每个组件具备完整交互和动画。

### 组件开发优先级

| 优先级 | 组件 | 估时 | 复杂度 | 说明 |
|---|---|---|---|---|
| P0 | `gacha_simulator` | 4h | 高 | 核心卖点，动画最多 |
| P0 | `slider_explorer` | 2h | 中 | 通用性强，设参联动 |
| P1 | `card_flip` | 2h | 中 | 3D 翻转动画 |
| P1 | `comparison_split` | 2h | 中 | 拖拽分屏对比 |
| P2 | `timeline_scrubber` | 3h | 高 | 时间轴拖拽交互 |
| P2 | `quiz_battle` | 2h | 中 | 问答 + 反馈动画 |
| P3 | `build_sandbox` | 3h | 高 | 拖拽组装 |

### 各组件详细 Spec

#### 3.1 Gacha Simulator（抽卡模拟器）

**文件**: `src/components/generative-ui/gacha-simulator.tsx`

**交互流程**：
1. 展示"卡池"（概念映射的角色池）
2. 用户支付虚拟"期权费"（消耗学习积分）
3. 点击"十连抽"→ 动画滚动 → 逐一翻牌
4. 根据结果展示盈亏计算
5. 底部展示知识点总结

**状态**：
```typescript
interface GachaState {
  phase: 'idle' | 'purchasing' | 'pulling' | 'result';
  balance: number;
  ownedOptions: number;
  pullResults: GachaResult[];
  knowledgeUnlocked: string[];
}
```

**动画**：
- 抽卡滚动特效（卡牌快速切换）
- 金色流星（中5★）
- 紫色闪光（中4★）
- 盈亏数字跳动

#### 3.2 Slider Explorer（滑块探索器）

**文件**: `src/components/generative-ui/slider-explorer.tsx`

**交互流程**：
1. 展示一个核心变量滑块
2. 多变量的场景支持多个滑块
3. 拖动滑块时实时更新结果展示（图表/数值）
4. 预设几个"情景点"（如"保守"/"激进"按钮快速跳转）

**适用概念**：利率、通胀、期权定价、算法参数影响

#### 3.3 Card Flip（翻牌配对）

**文件**: `src/components/generative-ui/card-flip.tsx`

**交互流程**：
1. 正面：术语（如"看涨期权"）
2. 反面：个性化隐喻解释（如"= 如抽到5★之前锁定的低价购买权"）
3. 用户点击翻转，看到隐喻版解释
4. 翻过的牌可以"收藏到知识库"

#### 3.4 Comparison Split（分屏对比）

**文件**: `src/components/generative-ui/comparison-split.tsx`

**交互流程**：
1. 左右（或上下）两个面板
2. 中间可拖拽分隔线
3. 每个面板展示一个概念/方案
4. 拖拽分隔线改变展示比例

#### 3.5 Timeline Scrubber（时间轴拖拽）

**文件**: `src/components/generative-ui/timeline-scrubber.tsx`

**交互流程**：
1. 水平时间轴，用户可拖拽游标
2. 每个时间节点有事件标记
3. 拖到某节点时弹出事件详情
4. 展示因果链

#### 3.6 Quiz Battle（问答对战）

**文件**: `src/components/generative-ui/quiz-battle.tsx`

**交互流程**：
1. 展示一个问题 + 3-4 个选项
2. 用户选择后即时反馈（正确/错误动画）
3. 答对：用用户偏好的隐喻解释为什么对
4. 答错：展示正确答案 + 鼓励
5. 连续答对触发 combo 特效

#### 3.7 Build Sandbox（构建沙盒）

**文件**: `src/components/generative-ui/build-sandbox.tsx`

**交互流程**：
1. 左侧：可用"模块"/"组件"列表
2. 右侧：画布区域
3. 用户拖拽模块到画布上组装
4. 组装完成后点击"运行"看结果
5. 适用概念：系统架构、化学反应、金融产品结构

### 组件开发规范

每个组件遵循统一接口：

```typescript
interface GenerativeUIComponentProps<T = Record<string, unknown>> {
  config: T;                        // LLM 输出的配置
  onInteraction?: (event: InteractionEvent) => void;  // 交互回调
  onComplete?: (result: unknown) => void;  // 完成时回调
}
```

### 产出物清单

```
src/components/generative-ui/registry.ts       ✅ 组件注册表
src/components/generative-ui/gacha-simulator.tsx ✅ 抽卡模拟器
src/components/generative-ui/slider-explorer.tsx ✅ 滑块探索器
src/components/generative-ui/card-flip.tsx      ✅ 翻牌配对
src/components/generative-ui/comparison-split.tsx ✅ 分屏对比
src/components/generative-ui/timeline-scrubber.tsx ✅ 时间轴
src/components/generative-ui/quiz-battle.tsx    ✅ 问答对战
src/components/generative-ui/build-sandbox.tsx  ✅ 构建沙盒
```

---

## 六、Phase 4 — 工具与多源聚合（6-10h）

**目标**：实现 V1 的 2 个外部数据源 Tool，接入 YouTube 和网页正文提取。

### 任务清单

| # | 任务 | 核心文件 | 估时 |
|---|---|---|---|
| 4.1 | Tool 注册系统 | `src/lib/tools/index.ts` | 1h |
| 4.2 | YouTube Transcript Tool | `src/lib/tools/youtube-transcript.ts` | 2h |
| 4.3 | Web Content Extractor Tool | `src/lib/tools/web-extractor.ts` | 2h |
| 4.4 | Tool 执行代理 API | `src/app/api/tools/route.ts` | 1.5h |
| 4.5 | Tool 调用时前端 Loading 状态 | 前端组件 | 1h |
| 4.6 | 错误处理与降级策略 | 各 Tool 文件 | 1.5h |

### 详细设计

#### 4.1 Tool 注册系统

```typescript
// lib/tools/index.ts
import { ToolDefinition } from './types';
import { youtubeTranscriptFetch } from './youtube-transcript';
import { webContentExtract } from './web-extractor';

// 1. Tool 定义（给 LLM 的 Function Calling Schema）
export const V1_TOOLS: Record<string, ToolDefinition> = {
  youtube_transcript_fetch: {
    description: "抓取 YouTube 播客/访谈视频的字幕文本。当用户想了解某领域大佬的观点时使用。",
    parameters: {
      type: "object",
      properties: {
        video_url: { type: "string", description: "YouTube 视频 URL" },
        language: { type: "string", description: "字幕语言代码", default: "zh" }
      },
      required: ["video_url"]
    },
    execute: youtubeTranscriptFetch,
  },

  web_content_extract: {
    description: "提取网页正文内容。用于抓取长文、博客、访谈记录。",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "目标网页 URL" },
        max_chars: { type: "number", description: "最大提取字符数", default: 3000 }
      },
      required: ["url"]
    },
    execute: webContentExtract,
  },
};
```

#### 4.2 YouTube Transcript Tool

**使用 `youtube-transcript` npm 包**：
```typescript
import { YoutubeTranscript } from 'youtube-transcript';

async function youtubeTranscriptFetch(args: { video_url: string; language?: string }) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(args.video_url);
    // 合并为纯文本
    const text = transcript
      .map(t => t.text)
      .join(' ')
      .slice(0, 5000);  // 限制长度
    return { success: true, text, source_url: args.video_url };
  } catch (error) {
    return { success: false, error: `无法获取字幕: ${error}` };
  }
}
```

#### 4.3 Web Content Extractor Tool

**使用 `@mozilla/readability` + `jsdom`**：
```typescript
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

async function webContentExtract(args: { url: string; max_chars?: number }) {
  try {
    const response = await fetch(args.url, {
      headers: { 'User-Agent': 'aha-flash/1.0 Knowledge Bot' }
    });
    const html = await response.text();
    const dom = new JSDOM(html, { url: args.url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return { success: false, error: '无法提取网页正文' };
    }

    const text = article.textContent.slice(0, args.max_chars || 3000);
    return {
      success: true,
      title: article.title,
      text,
      excerpt: article.excerpt,
      source_url: args.url,
    };
  } catch (error) {
    return { success: false, error: `提取失败: ${error}` };
  }
}
```

### 产出物清单

```
src/lib/tools/index.ts              ✅ Tool 注册系统
src/lib/tools/types.ts             ✅ Tool 类型定义
src/lib/tools/youtube-transcript.ts ✅ YouTube Tool
src/lib/tools/web-extractor.ts     ✅ Web Extract Tool
src/app/api/tools/route.ts         ✅ Tool 执行 API
```

---

## 七、Phase 5 — 打磨与上线（4-8h）

### 任务清单

| # | 任务 | 估时 |
|---|---|---|
| 5.1 | 全局 Loading / Error / Empty 状态覆盖 | 2h |
| 5.2 | 响应式适配（移动端） | 2h |
| 5.3 | 动画打磨（framer-motion 微交互） | 1.5h |
| 5.4 | 性能优化（Lighthouse > 90） | 1h |
| 5.5 | SEO 基础（metadata） | 0.5h |
| 5.6 | 错误日志 | 0.5h |
| 5.7 | README.md + 部署文档 | 1h |

---

## 八、文件创建顺序（Codex 执行参考）

按依赖关系排序，Codex 应该严格按此顺序创建文件：

```
# Phase 0 — 脚手架
 1. package.json              # 依赖声明
 2. next.config.js            # Next.js 配置
 3. tailwind.config.ts        # Tailwind 配置
 4. tsconfig.json             # TypeScript 配置
 5. .env.local                # 环境变量
 6. src/app/globals.css       # 全局样式
 7. src/app/layout.tsx        # 根布局
 8. src/lib/utils/cn.ts       # className 工具

# Phase 1 — 类型 & Harness
 9. src/types/state.ts        # 用户状态类型
10. src/types/schema.ts       # UI Schema 类型
11. src/types/chat.ts         # 对话类型
12. src/lib/harness/state-store.ts    # 状态存储
13. src/lib/metaphor/domain-mappings.ts # 隐喻映射
14. src/lib/metaphor/metaphor-engine.ts # 隐喻引擎
15. src/lib/llm/prompt-templates.ts    # Prompt 模板
16. src/lib/harness/prompt-composer.ts # Prompt 组装
17. src/lib/harness/state-machine.ts   # 状态机
18. src/lib/harness/conversation-router.ts # 对话路由
19. src/app/api/state/route.ts         # 状态 API

# Phase 2 — 对话核心
20. src/lib/llm/provider.ts            # LLM Provider
21. src/lib/utils/storage.ts           # localStorage 工具
22. src/lib/llm/schema-validator.ts    # Schema 校验
23. src/stores/app-store.ts            # Zustand Store
24. src/app/api/chat/route.ts          # 核心对话 API
25. src/components/ui/*                # shadcn/ui 组件
26. src/components/chat/thinking-indicator.tsx
27. src/components/chat/chat-input.tsx
28. src/components/chat/chat-message.tsx
29. src/app/page.tsx                   # 首页

# Phase 3 — 生成式 UI 组件（按优先级）
30. src/components/generative-ui/registry.ts
31. src/components/generative-ui/gacha-simulator.tsx
32. src/components/generative-ui/slider-explorer.tsx
33. src/components/generative-ui/card-flip.tsx
34. src/components/generative-ui/comparison-split.tsx
35. src/components/generative-ui/timeline-scrubber.tsx
36. src/components/generative-ui/quiz-battle.tsx
37. src/components/generative-ui/build-sandbox.tsx

# Phase 4 — Tools
38. src/types/tool.ts
39. src/lib/tools/youtube-transcript.ts
40. src/lib/tools/web-extractor.ts
41. src/lib/tools/index.ts
42. src/app/api/tools/route.ts

# Phase 5 — 打磨
43. src/components/onboarding/preference-form.tsx
44. src/components/onboarding/style-quiz.tsx
45. src/app/onboarding/page.tsx
```

---

## 九、关键技术风险与缓解

| 风险 | 概率 | 缓解 |
|---|---|---|
| `youtube-transcript` 包不稳定 | 中 | 准备 fallback: 让用户手动粘贴字幕文本 |
| LLM 输出非标准 JSON | 高 | Schema Validator + retry 机制 + 降级纯文本 |
| DeepSeek Function Calling 稳定性 | 低 | 备选 Claude/GPT-4o provider |
| `@mozilla/readability` 在 Serverless 环境问题 | 中 | 移到 Client 端执行 + CORS 代理 |
| 状态文件并发写入冲突 | 低 | V1 单用户无需处理；V2 加文件锁 |

---

## 十、部署建议

- **推荐平台**：Vercel（Next.js 原生支持，免费额度够用）
- **Node Runtime**：Edge Runtime 不兼容 `jsdom`（Readability 依赖），使用 Node.js Runtime
- **环境变量**：在 Vercel Dashboard 中设置 `DEEPSEEK_API_KEY`
- **域名**：可选 Vercel 自带域名或自定义域名

```bash
# 部署命令
npm run build
# 或直接推送到 Vercel Git 集成自动部署
```

---

> 配套文档：`PRD.md`（产品需求）、`ARCHITECTURE.md`（技术架构）

# 趣灵 (aha-flash) V3 — 第二轮迭代规划

> Round 1（T01-T17）：**已全部完成。**
> 本文件为 Round 2 追加规划，供 Codex 在 Round 1 基础上执行。

---

## 为什么需要 Round 2

Round 1 核心链路已闭环（Stateful Memory → Schema 三层协议 → 10 种交互模式 → 知识沙盒 → 质量体系）。

**T13-T14（网络搜索 + URL 路由）已确认废弃。** 原因：趣灵核心是"把已有概念翻译成交互隐喻"，不需要联网查新信息；URL 贴入的用户场景不存在。Round 2 第一步是删掉这两个模块。

剩余一个结构性盲区：**对话上下文管理。**

当前架构：
```
每轮对话 → 提炼摘要 → 写入 state.json → 下轮的 system prompt 里贴摘要
```

LLM 看不到用户上轮的原话，只看到压缩过的 XML 摘要。"用一个 LLM 提炼上文，再让同一个 LLM 根据提炼结果生成下文"——级联失真风险。

具体表现：
- 用户第二轮追问时，第一轮细节已丢弃
- 第三轮追问时，第一轮摘要已被覆盖（`last_session_summary` 只保留一条）
- 系统不区分"新话题"和"追问"，两条路径走同一条分类管道

Round 2 核心目标：**让系统理解"在聊什么"和"聊了多久"。**

---

## 依赖拓扑

```
Phase 7 (对话记忆升级) ← 本轮核心
├── T18 短期对话窗口
├── T19 追问检测与深度追踪
└── T20 对话摘要升级

Phase 8 (流式生成)
├── T21 流式 Schema 生成
└── T22 渐进式 UI 渲染

Phase 9 (反馈闭环)
├── T23 用户评分回收
└── T24 交互质量自动调优

Phase 10 (导出)
└── T25 知识卡片导出

Phase 11 (运维)
├── T26 错误边界与降级
└── H06-H08 人工

Phase 12 (自然入口)
├── T27 图片粘贴/文件上传
├── T28 音频上传+转录
└── T29 剪贴板与系统分享
```

Phase 8-12 不依赖 Phase 7，可并行开发。
Phase 12 优先级最低——非 MVP，属远期规划。

---

## Phase 0 — Round 1 清理

> 目标：删掉 Round 1 中确认废弃的模块，减少代码表面积。

### T00 — 移除网络搜索与 URL 路由模块

| 项 | 内容 |
|---|---|
| **现状** | T13 实现了 web_search Tool（Brave/Google/Tavily），T14 实现了 source-router URL 自动抓取。两者均已被产品决策否决。 |
| **目标** | 移除相关代码，恢复为纯输入文本的简洁链路 |
| **涉及文件** | `src/lib/tools/web-search.ts`（删除）/ `src/lib/tools/source-router.ts`（删除）/ `src/lib/tools/index.ts`（移除 web_search 注册及 import）/ `src/app/api/chat/route.ts`（移除 source-router import 和调用）/ `.env.local` 中移除 `BRAVE_SEARCH_API_KEY` 等搜索相关变量 |
| **验收** | 项目无搜索/Tavily/Brave/SourceRouter 引用残留；LLM API 调用路径不再包含搜索步骤；`npm run build` 通过 |
| **依赖** | 无 |

---

## Phase 7 — 对话记忆升级

> 目标：从"压缩摘要"升级为"短期窗口 + 压缩摘要"双层架构。

### T18 — 短期对话窗口

| 项 | 内容 |
|---|---|
| **现状** | chat API 每次只传 `{ message, userId }`，不传历史 messages |
| **目标** | 请求体增加 `recent_messages` 字段，携带最近 N 轮原文 |
| **涉及文件** | `src/app/api/chat/route.ts` / `src/app/page.tsx` / `src/types/chat.ts` |
| **窗口大小** | N=6（最近 3 轮，每轮 user+assistant 各 1 条） |
| **注入方式** | system prompt → recent_messages → 当前输入，依次拼入 messages 数组 |
| **截断** | 单条超 500 token 截断为前 300 token + "…" |
| **验收** | 追问 3 轮后 LLM 能引用前 2 轮原文；话题切换后旧消息自然滑出窗口 |
| **依赖** | 无 |

### T19 — 追问检测与深度追踪

| 项 | 内容 |
|---|---|
| **现状** | 不区分"新话题"和"追问" |
| **目标** | 意图分类前追加追问检测，判断当前输入是否延续上一轮概念 |
| **涉及文件** | `src/lib/harness/conversation-router.ts` / `src/types/state.ts` / `src/lib/harness/state-store.ts` |
| **检测逻辑** | 规则优先（追问词："那""还有""为什么""怎么""继续""详细"）+ LLM 二分类兜底 |
| **深度追踪** | `conversation_compressed` 新增 `current_thread?: { concept, depth, started_at }` |
| **影响** | depth >= 2 时 system prompt 追加："用户正在深入追问 [concept]，保持隐喻框架，不切换交互模式" |
| **验收** | 追问 → `is_followup: true, depth: 2`；无关新消息 → `is_followup: false`，归档当前 thread |
| **依赖** | T18 |

### T20 — 对话摘要升级

| 项 | 内容 |
|---|---|
| **现状** | `reflectTurn` 只输出单轮 summary，最新一条覆盖旧值 |
| **目标** | 话题断开时合并整个追问链为结构化线程摘要 |
| **涉及文件** | `src/lib/harness/state-reflection.ts` / `src/lib/harness/state-store.ts` |
| **线程摘要** | `{ thread_id, concept, total_rounds, max_depth, key_misconceptions, final_understanding, insight }` |
| **触发时机** | T19 判定话题断开 → 合并所有 round → LLM 生成线程摘要 → 归档到 `knowledge_assets` |
| **验收** | "期权"追问 4 轮后切换话题 → `knowledge_assets` 含完整线程摘要 |
| **依赖** | T19 |

---

## Phase 8 — 流式生成

> 改善首字节等待体验。不做功能新增，做感知性能。

### T21 — 流式 Schema 生成

| 项 | 内容 |
|---|---|
| **现状** | `generateText` 非流式，3-8 秒空白等待 |
| **目标** | 切换到 `streamText`，SSE 逐 token 输出 Schema JSON |
| **涉及文件** | `src/app/api/chat/route.ts` / `src/lib/llm/prompt-templates.ts` |
| **自修复兼容** | 流结束且解析失败 → 回退 `generateText` 修复；流进行中 → 标记"需修复"并在流末尾附加结果 |
| **验收** | 输入后 1s 内见 loading 态；最终结果与非流式一致 |
| **依赖** | 无（独立模块） |

### T22 — 渐进式 UI 渲染

| 项 | 内容 |
|---|---|
| **现状** | 等完整 Schema JSON 返回后才渲染组件 |
| **目标** | 收到 pattern+template 后立即渲染骨架，payload 逐项填充 |
| **涉及文件** | `src/app/page.tsx` / `src/components/generative-ui/registry.tsx` / 各组件加 loading 态 |
| **渲染时序** | pattern → 容器+标题占位 → template → 骨架（按钮/滑块占位）→ payload → 逐项填充 |
| **降级** | SSE 断开 → 展示已填充部分 + "生成中断" + 重试 |
| **验收** | 组件逐步"长出"，不整块弹出；未到达的字段有骨架屏 |
| **依赖** | T21 |

---

## Phase 9 — 反馈闭环

> 用户评价回流到系统，驱动 Prompt 质量改进。
> 注意：需要真实用户数据才有意义，可在 H04（用户测试）之后开发。

### T23 — 用户评分回收

| 项 | 内容 |
|---|---|
| **现状** | 无用户反馈入口 |
| **目标** | 每个交互组件底部加 👍/👎 + 可选原因标签 |
| **涉及文件** | 抽取 `<RateBar />` 组件 / `src/app/api/interaction/route.ts` / `src/lib/harness/state-store.ts` |
| **评分字段** | `{ schema_id, rating, reason_tags?, timestamp }` |
| **写入** | 关联对应 `knowledge_asset`；👎 写入 `key_misconceptions` |
| **验收** | 交互完成后展示评分栏 → 点击写入 state；👎 展开原因标签 |
| **依赖** | T09（knowledge_assets 已存在） |

### T24 — 交互质量自动调优

| 项 | 内容 |
|---|---|
| **现状** | Prompt 调整靠人工观察 |
| **目标** | 扫描评分数据 → 标记低分 pattern/topic 组合 → 输出调优建议 |
| **涉及文件** | `tests/eval/tuning-suggestions.ts` |
| **阈值** | 同一 (pattern, topic) 组合 negative 率 ≥ 40% 且样本 ≥ 5 |
| **验收** | 跑脚本输出 `[ALERT] probability+finance negative率60%，检查 gacha_simulator Prompt` |
| **依赖** | T23, T16 |

---

## Phase 10 — 导出与分享

> 学习成果可被带走和传播。

### T25 — 知识卡片导出

| 项 | 内容 |
|---|---|
| **现状** | 学习成果锁在应用内 |
| **目标** | sandbox 每个概念卡片新增"导出为图片"按钮，生成 PNG 下载 |
| **涉及文件** | `src/app/sandbox/page.tsx` / `src/lib/export/card-renderer.ts` |
| **技术方案** | html2canvas：offscreen div 渲染 → 截图 → 下载 |
| **卡片内容** | 概念名、pattern 图标、核心 insight、趣灵 logo + 产品链接 |
| **验收** | 点击导出 → 下载一张包含完整信息的 PNG |
| **依赖** | T12 |

---

## Phase 11 — 运维与边界

### T26 — 错误边界与优雅降级

| 项 | 内容 |
|---|---|
| **现状** | Schema 解析失败走 LLM 自修复（1 次），再失败抛错。无超时处理 |
| **目标** | 三级降级：L1 自修复 → L2 card_flip 兜底 → L3 友好错误+重试 |
| **涉及文件** | `src/app/api/chat/route.ts` / `src/lib/llm/mock-schema.ts` |
| **超时** | LLM 调用 15s 超时，触发 L3 |
| **验收** | 断网 → 看到"暂时无法连接 AI" + 重试；Schema 解析失败 → 降级到 card_flip 不白屏 |
| **依赖** | 无 |

---

## Phase 12 — 自然导入入口

> 目标：替代"贴 URL"这个不存在用户场景的入口，让用户通过截图、文件、剪贴板等自然方式输入富媒体内容。
> 优先级最低，非 MVP 内容，在文字对话跑稳后再开发。
> 依赖切换到多模态模型（DeepSeek 当前不支持）。

### T27 — 图片粘贴与文件上传

| 项 | 内容 |
|---|---|
| **现状** | 仅支持纯文本输入 |
| **目标** | 支持 Ctrl+V 粘贴图片 + 文件上传按钮（图片/音频），前端自动检测并预处理 |
| **涉及文件** | `src/app/page.tsx`（粘贴监听、上传入口）/ `src/app/api/upload/route.ts`（新建，接收文件并转文本描述） |
| **图片处理** | 视觉模型（需换模型或用视觉 API 单独调用）将图片转为文字描述，再喂给 LLM 生成交互组件 |
| **音频处理** | 暂存待 T28 转录 |
| **验收** | 截图后 Ctrl+V → 图片出现 → 系统生成文字描述 → 正常进入 Schema 生成管道 |
| **依赖** | 需要多模态 LLM（不是 DeepSeek） |

### T28 — 音频上传与转录

| 项 | 内容 |
|---|---|
| **现状** | 不支持音频 |
| **目标** | 上传音频文件（mp3/wav/m4a）→ 自动转录为文本 → 进入正常对话管道 |
| **涉及文件** | `src/app/api/transcribe/route.ts`（新建，Whisper API 调用） |
| **技术方案** | OpenAI Whisper API 或本地 Whisper 模型 |
| **验收** | 上传一段播客片段 → 转录后显示文本 → LLM 基于转录内容生成交互组件 |
| **依赖** | 需要 Whisper API Key 或本地部署 |

### T29 — 剪贴板与系统分享

| 项 | 内容 |
|---|---|
| **现状** | 无系统级入口 |
| **目标** | 支持系统分享菜单（Share Target API）+ 自动检测剪贴板中的内容 |
| **涉及文件** | `src/app/manifest.ts`（Web Share Target 清单）/ `src/app/page.tsx`（剪贴板检测） |
| **剪贴板** | 页面加载时自动检测剪贴板是否有新内容，有则弹出"要导入吗？"提示 |
| **系统分享** | PWA Web Share Target：用户在浏览器/手机分享到趣灵，自动读取图片/URL/文本 |
| **验收** | 手机端从相册分享图片到趣灵 → 接收并预处理；桌面端复制内容后打开趣灵 → 弹提示 |
| **依赖** | T27 |

---

## 人工任务

| ID | 任务 | 说明 |
|---|---|---|
| H06 | API Key 续期与监控 | DeepSeek key 额度充足，监控日调用量 |
| H07 | 用户测试反馈整理 | 将 H04 测试结果结构化，补充到 T15 用例集 |
| H08 | Vercel 监控与日志 | Vercel Analytics / uptime 监控 |

---

*创建：2026-06-05 | 更新：2026-06-06（Round 1 已全部完成，收束整理）*

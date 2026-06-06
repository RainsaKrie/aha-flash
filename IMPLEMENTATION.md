# 趣灵 aha-flash — 实施路线与当前状态

> 文档定位：记录当前实现状态、下一阶段路线和开发流程。详细产品需求见 `PRD.md`，架构真相见 `ARCHITECTURE.md`，临时任务入口见 `BACKLOG.md`。

---

## 1. 当前状态

| 阶段 | 状态 | 说明 |
|---|---|---|
| Phase 0 项目脚手架 | 完成 | Next.js + TypeScript + Tailwind + Vercel AI SDK |
| Phase 1 Stateful Memory | 完成 | 意图分类、用户状态、回合反思、状态增量写入 |
| Phase 2 Schema 协议重构 | 完成 | V2 `pattern/template/payload`，V1 兼容，注册表升级 |
| Phase 3 交互模式扩展 | 完成 | 10 个 Pattern，既有 7 个 Pattern 各有 2 个 Template |
| Phase 4 知识沙盒体系 | 进行中 | 知识资产、知识链推荐、`/sandbox` 已完成；深度分级待开发 |
| Phase 5 外部集成 | 待开发 | 搜索工具、source-router 降级 |
| Phase 6 质量体系 | 待开发 | 测试用例、评分脚本、Prompt 对比 |

最近稳定提交：

```text
60716b5 Add knowledge asset storage
940010b Consolidate project documentation
```

---

## 2. 已实现能力

### 2.1 应用基础

- 首页工作台：输入、对话、状态面板、Generative UI stage
- `/sandbox` 知识沙盒：已学概念地图、主题分组、概念卡片
- Onboarding：背景、爱好、知识盲区、隐喻偏好
- 本地/线上 demo 可运行
- GitHub + Vercel 自动部署链路

### 2.2 Harness

- `classifyConversationIntent()`
- `stateStore`
- `reflectTurn()`
- `update_user_state`
- `/api/state`
- `/api/chat`
- `/api/interaction`
- `knowledge_assets`

### 2.3 Schema

- V1 flat schema 兼容
- V2 `pattern/template/payload`
- Zod 校验
- 修复重试
- mock fallback
- `normalizeUISchema()`
- `next_concepts` 知识链推荐字段

### 2.4 Generative UI

当前组件族：

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

### 2.5 Tools

- YouTube transcript fetch
- Web content extract
- Source router for pasted URLs
- Tool execution API

---

## 3. 当前待开发路线

优先级建议：

1. T11 深度分级
2. T15-T17 质量体系
3. T13-T14 搜索工具与 source-router 调整

原因：
- 当前核心体验已能生成组件。
- 下一步最能提升产品厚度的是让同一概念支持不同理解深度。
- 搜索工具涉及外部 API key，可并行但不应阻塞核心产品闭环。

---

## 4. 开发与文档工作流

用户以后可能把新规划写进：
- `BACKLOG.md`
- `ROADMAP.md`
- `TODO.md`
- 其他临时文档

Codex 开发时按以下规则处理：

1. 读取新规划文档，提取待执行任务。
2. 若内容与 PRD/架构重复，以“新规划文档中的任务要求”为本轮开发输入。
3. 开发完成后：
   - 代码提交并推送。
   - 验收结果写入 `CHANGELOG.md`。
   - 长期产品变化合并进 `PRD.md`。
   - 长期技术变化合并进 `ARCHITECTURE.md`。
   - 路线状态更新进 `IMPLEMENTATION.md`。
   - `BACKLOG.md` 只保留未完成任务和下一步入口。
4. 如果新规划文档已经全部完成，将其内容归档，不让它长期堆在根目录里制造重复。

---

## 5. 验证命令

每次功能提交前至少运行：

```bash
npm run typecheck
npm run build
```

涉及前端交互时：
- 启动本地预览端口
- 用 Playwright 或浏览器快照验证至少一个真实交互路径

涉及部署修复时：
- 推送 GitHub
- 等待 Vercel 自动部署
- 检查线上接口或页面

---

## 6. 环境变量

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_APP_NAME=趣灵
NEXT_PUBLIC_MAX_STEPS=5

# 可选：覆盖状态存储目录
AHA_FLASH_STATE_DIR=
```

说明：
- 没有 `DEEPSEEK_API_KEY` 时使用 mock schema fallback。
- Vercel demo 会默认把状态写到 `/tmp/aha-flash/states`。
- 生产级状态持久化应迁移到数据库或 KV。

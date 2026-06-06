# 趣灵 aha-flash — 实施状态

> 文档定位：记录当前开发状态、下一步路线和工作流。产品真相见 `PRD.md`，技术真相见 `ARCHITECTURE.md`，完成记录见 `CHANGELOG.md`。

---

## 1. 当前状态

| 阶段 | 状态 | 说明 |
|---|---|---|
| Phase 0 项目脚手架 | 完成 | Next.js + TypeScript + Tailwind + Vercel AI SDK |
| Phase 1 Stateful Memory | 完成 | 意图分类、用户状态、回合反思、状态增量写入 |
| Phase 2 Schema 协议重构 | 完成 | V2 `pattern/template/payload`，V1 兼容 |
| Phase 3 交互模式扩展 | 完成 | 10 类 Pattern，多 Template 注册 |
| Phase 4 知识沙盒体系 | 完成 | 知识资产、知识链推荐、`/sandbox`、深度分级 |
| Phase 5 外部集成 | 完成 | 搜索工具；URL 抓取降级为辅助入口 |
| Phase 6 质量体系 | 完成 | 固定 case、评分脚本、Prompt 对比 |

当前仓库已覆盖 V1 demo 闭环：用户输入概念后，系统能生成互动组件、更新轻量状态、记录已学概念，并在知识沙盒中回看。

---

## 2. 当前路线

Round 2 规划已进入仓库，详细来源为 `BACKLOG_ROUND2.md`，当前未完成任务以 `BACKLOG.md` 为执行索引。

当前顺序：
- T00：移除网络搜索与 URL 路由模块。
- T18-T20：升级对话记忆为“短期窗口 + 线程摘要”双层架构。
- T26：补错误边界和优雅降级。
- T21-T22：流式生成与渐进式 UI。
- T23-T25：反馈闭环和知识卡片导出。
- T27-T29：自然导入入口，远期处理，依赖多模态/转录能力。

最新产品判断：
- 趣灵核心是把已有概念翻译成交互隐喻，不以联网查新信息为核心能力。
- 网络搜索和 URL 自动路由在 Round 2 中被标记为废弃，下一步先删除相关代码表面积。
- 生产级长期记忆仍需从本地文件 / Vercel `/tmp` 迁移到持久化数据库或 KV。

---

## 3. 开发工作流

用户可能把新规划写入：
- `BACKLOG.md`
- `ROADMAP.md`
- `TODO.md`
- 其他临时规划文档

处理规则：

1. 读取最新规划文档，提炼新增任务和差异。
2. 以最新规划作为本轮开发输入，避免把重复内容复制进长期文档。
3. 开发完成后：
   - 代码提交并推送。
   - 验收记录写入 `CHANGELOG.md`。
   - 长期产品变化合并进 `PRD.md`。
   - 长期技术变化合并进 `ARCHITECTURE.md`。
   - 当前路线更新进 `IMPLEMENTATION.md` 或 `BACKLOG.md`。
4. `BACKLOG.md` 只保留未完成任务，不长期保存 PRD、架构说明或已完成验收。

---

## 4. 验证命令

每次功能提交前至少运行：

```bash
npm run typecheck
npm run build
```

质量评估：

```bash
npm run eval:score
npm run eval:compare -- baseline.json candidate.json
```

涉及前端交互时，启动本地服务并用浏览器或 Playwright 验证至少一个真实路径。

---

## 5. 环境变量

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
WEB_SEARCH_PROVIDER=auto
BRAVE_SEARCH_API_KEY=
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
TAVILY_API_KEY=
NEXT_PUBLIC_APP_NAME=趣灵
NEXT_PUBLIC_MAX_STEPS=5
AHA_FLASH_STATE_DIR=
```

说明：
- 没有 `DEEPSEEK_API_KEY` 时使用 mock schema fallback。
- `WEB_SEARCH_PROVIDER=auto` 时按 Brave -> Google -> Tavily 顺序尝试。
- Vercel demo 默认写 `/tmp/aha-flash/states`，不保证长期持久。

# 趣灵 aha-flash

趣灵是一款 AI 原生交互式知识学习引擎。它把复杂概念、长篇信息和外部资料编译成可操作的小组件，让用户通过点击、选择、模拟和反馈获得“啊哈”式理解。

当前版本是 V1 demo：已具备概念输入、个性化隐喻、Generative UI、轻量状态记忆、知识沙盒、学习深度切换、联网搜索辅助和质量评估脚本。

---

## 核心体验

用户输入：

```text
期权是什么？用我能听懂的方式讲。
```

系统会结合用户状态生成互动组件，例如“期权抽卡模拟器”，让用户通过一次操作理解：

```text
期权 = 未来选择权 + 有限损失 + 上涨收益暴露
```

---

## 已实现能力

- 首页工作台：输入、对话、状态面板、互动组件渲染。
- Generative UI Schema：V2 `pattern/template/payload`，兼容 V1。
- 10 类交互 Pattern：概率、参数探索、记忆卡片、时间线、对比、测验、系统搭建、分支故事、分类、模拟推演。
- Stateful Memory：背景、爱好、隐喻偏好、知识盲区、已学概念、关键洞察。
- 知识沙盒：`/sandbox` 中按主题回看已学概念。
- 学习深度：快懂、场景、映射三档。
- 外部信息：纯文本联网搜索；用户明确提供 URL 时可辅助抓取网页或 YouTube 字幕。
- 质量体系：固定 case、Schema 评分、Prompt 对比。

---

## 快速开始

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

没有配置 LLM key 时，应用会使用 mock schema fallback，方便本地演示和开发。

---

## 环境变量

创建 `.env.local`：

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
- `DEEPSEEK_API_KEY`：配置后使用 DeepSeek 实时生成 Schema。
- `WEB_SEARCH_PROVIDER=auto`：按 Brave -> Google -> Tavily 顺序尝试。
- `AHA_FLASH_STATE_DIR`：可覆盖服务端状态文件目录。
- Vercel demo 默认写入 `/tmp/aha-flash/states`，不适合作为生产长期记忆。

---

## 常用命令

```bash
npm run dev
npm run typecheck
npm run build
npm run eval:score
npm run eval:compare -- baseline.json candidate.json
```

---

## 项目结构

```text
src/
  app/                 Next.js 页面和 API routes
  components/
    chat/              对话输入、历史、消息展示
    generative-ui/     互动组件和注册表
    onboarding/        偏好设置
    ui/                本地 UI primitives
  lib/
    harness/           意图路由、状态反思、状态存储
    llm/               Prompt、Provider、Schema 校验、mock
    metaphor/          隐喻域映射
    tools/             搜索、网页抓取、YouTube 字幕、状态更新
  stores/              Zustand client store
  types/               Schema、状态、聊天、工具类型
tests/
  fixtures/            固定评估 case
  eval/                评分和对比脚本
```

---

## 文档

| 文档 | 用途 |
|---|---|
| `PRD.md` | 产品目标、用户价值、长期功能边界 |
| `ARCHITECTURE.md` | 当前技术架构和关键决策 |
| `IMPLEMENTATION.md` | 当前实施状态、路线和开发工作流 |
| `BACKLOG.md` | 当前未完成任务和临时迭代入口 |
| `BACKLOG_ROUND2.md` | Round 2 详细规划源 |
| `CHANGELOG.md` | 已完成任务、验收记录和重要修复 |

---

## 当前产品判断

Round 2 已将网络搜索和 URL 自动路由标记为废弃项，下一步先执行 T00 删除相关代码表面积。趣灵的核心仍是把已有概念翻译成交互隐喻；自然导入入口属于远期规划，依赖多模态/转录能力。

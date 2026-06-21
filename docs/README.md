# 趣灵 aha-flash 文档中心

趣灵当前以 V6 自由生成知识路径对外展示：用户输入任意概念后，系统自动识别知识结构、选择互动 Pattern、生成三关 Flow，并通过质量闸门后展示；五条精选 topic 只保留为稳定示例入口。文档只保留核心事实，避免规划稿、产品说明和实现记录互相重复。

## 当前文档

| 文档 | 用途 |
|---|---|
| `PRODUCT.md` | 当前产品定位、作品集体验、功能边界、设计质量标准和 V1 路线 |
| `TECHNICAL.md` | 技术架构、V5/V6 Flow 路由、Schema 协议、QualityGate 与验证规则 |
| `CHANGELOG.md` | 已完成任务、验收记录和重要修复 |
| `input-docs/README.md` | 后续增量规划文档的放置和处理规则 |

## 增量文档工作流

以后用户新增规划、想法或外部讨论稿时，统一放到 `docs/input-docs/`。处理规则：

1. 先读取 `docs/input-docs/` 根目录的新文档。
2. 判断内容是新增规划、旧内容重复，还是只适合归档的想法。
3. 将长期产品变化合并进 `PRODUCT.md`。
4. 将长期技术变化合并进 `TECHNICAL.md`。
5. 将已完成或已采纳的结果写进 `CHANGELOG.md`。
6. 开发前先完成文档整合，再按整合后的文档继续开发。
7. 已整合、重复或过期的输入文档直接删除；只有仍有独立追溯价值的材料才放入 `docs/input-docs/archive/`。

## 快速开始

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

当前公开体验路径：

| 路由 | 用途 |
|---|---|
| `/` | 默认跳转 `/explore` |
| `/explore` | 自由生成主入口：输入任意 topic 后由 AI 自动选择合适 Pattern；展示真实生成阶段与三关拆解预览，五条精选 topic 仅作为示例起点 |
| `/flow/[flowId]` | 全屏三关精选 Flow，当前稳定示例为 `bayes-starter`、`dns-router`、`options-risk`、`industrial-revolution`、`inflation-deflation` |
| `/flow/custom` | 播放 sessionStorage 中的动态生成 Flow，缺失草稿时引导回 `/explore` 重新生成 |
| `/hub` | 轻量个人图鉴，展示本机完成记录和快速回顾 |
| `/studio` | 内部生成工作台 / 技术验证入口，不作为公开主体验 |
| `/sandbox` | 旧知识沙盒兼容入口，不在公开主导航强调 |

常用验证：

```bash
npm run lint
npm run typecheck
npm run build
npm run eval:score
npm run eval:flow
npm run eval:blueprint
npm run eval:flow-dynamic
npm run eval:skills
npm run eval:showcase
npm run eval:flow-live -- --limit=8 --runs=3 --strict --threshold=1
```

没有配置 `DEEPSEEK_API_KEY` 时，应用会使用 mock fallback：动态输入会生成按用户 topic 包装的通用三关 Flow，五条精选示例也仍可完整走完。
<!-- DOCS_STATUS_START -->
## 当前状态速览（2026-06-21）
- V6 已完成“自由输入 -> ConceptPlan -> KnowledgeBlueprint -> 三关 Flow -> QualityGate -> 后续分支”的工程闭环；首页不再要求用户手选 Pattern，由 AI 根据知识结构自动选择。
- `/api/flow` 支持普通 JSON 与 `stream: true` SSE 两种响应；Explore 消费真实的 `concept_plan -> blueprint -> flow -> quality_gate` 阶段，而不是前端计时器。
- 生成成功后，用户先查看拆解预览，再自行进入三关或重新拆解；失败时提供重试、换概念、换拆解方式与精选示例逃逸路径。
- 质量基线：80 个 Blueprint 固定用例通过；2026-06-21 的 8 结构 x 3 次严格 live smoke 为 24/24 通过，LLM 成功率 1，所有 repair 指标均为 0。
- 动态 Flow 只保存在当前浏览器会话，Hub 完成记录写入本机 localStorage；草稿存储不可用时会明确提示，不会跳转到空 Flow。
- 当前不做：账号、数据库、多设备同步、社区发布、生产级埋点、检索/RAG 和内部 Wiki；这些是 V6.5/V7 的后续范围。
<!-- DOCS_STATUS_END -->

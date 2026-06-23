# 趣灵 aha-flash 文档中心

趣灵当前以 V6 自由生成知识路径对外展示：用户输入任意概念后，系统自动识别知识结构、选择互动 Pattern、生成四步 Flow，并通过质量闸门后展示；五条精选 topic 只保留为稳定示例入口。文档只保留核心事实，避免规划稿、产品说明和实现记录互相重复。

## 当前文档

| 文档 | 用途 |
|---|---|
| `PRODUCT.md` | 当前产品定位、作品集体验、功能边界、设计质量标准和 V1 路线 |
| `TECHNICAL.md` | 技术架构、V5/V6 Flow 路由、Schema 协议、QualityGate 与验证规则 |
| `CHANGELOG.md` | 已完成任务、验收记录和重要修复 |
| `knowledge-skills/` | 8 类运行时 Skill Pack 的教学合约与 Eval 资产 |
| `input-docs/README.md` | 后续增量规划文档的放置规则；当前仅保留前端设计参考 |

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
| `/explore` | 自由生成主入口：输入任意 topic 后由 AI 自动选择合适 Pattern；展示真实生成阶段与四步拆解预览，五条精选 topic 仅作为示例起点 |
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
npm run eval:math
npm run eval:showcase
npm run eval:flow-live -- --limit=8 --runs=3 --strict --threshold=1
npm run eval:teaching-manual -- --topics="linear programming,DNS resolution" --runs=1
```

没有配置 `DEEPSEEK_API_KEY`、provider 异常或动态 QualityGate 失败时，系统会保留 topic-aware fallback 供诊断，但公开 UI 展示诚实失败态而不是把泛化四步 Flow 伪装成 AI 教学；五条精选示例仍可完整走完。
<!-- DOCS_STATUS_START -->
## 当前状态速览（2026-06-22）
- V6 已完成“自由输入 -> ConceptPlan -> KnowledgeBlueprint -> 四步 Flow -> QualityGate -> 后续分支”的工程闭环；首页不再要求用户手选 Pattern，由 AI 根据知识结构自动选择。
- `/api/flow` 支持普通 JSON 与 `stream: true` SSE 两种响应；Explore 消费真实的 `concept_plan -> blueprint -> flow -> quality_gate` 阶段，而不是前端计时器。
- 生成成功后，用户先查看知识结构和四个面向学习者的关卡目标，再自行进入路径或重新拆解；Blueprint 核心词和 Pattern 元数据仅用于后台校验，不直接展示。失败时提供重试、换概念、换拆解方式与精选示例逃逸路径。
- 质量基线：80 个 Blueprint 固定用例通过；2026-06-21 的 8 结构 x 3 次严格 live smoke 是历史发布基线（24/24、所有 repair 指标为 0）。2026-06-22 新增“关卡标题必须具体”闸门后，复利单例真实调用通过，首轮泛称标题触发了一次可见且可追踪的 LLM 修复。
- 教学质量门已细分为四个确定性维度：每关 trace 与可见主体内容同时覆盖“教学动作术语 + topic grounding 术语”、用户动作与组件模板契约一致、模板确实可执行；`eval:teaching` 覆盖反例，`eval:flow-live` 按知识结构输出 repair 标签分布和四项覆盖率。
- 复利类数值互动采用显式公式契约：滑块显示公式和代入值，模拟器按“终值 = 本金 × (1 + 年利率)^期数”逐期计算；无法验证的模型只能显示为趋势示意，不能伪装成真实数值。
- 动态 Flow 只保存在当前浏览器会话，Hub 完成记录写入本机 localStorage；草稿存储不可用时会明确提示，不会跳转到空 Flow。
- 当前不做：账号、数据库、多设备同步、社区发布、生产级埋点、检索/RAG 和内部 Wiki；这些是 V6.5/V7 的后续范围。
<!-- DOCS_STATUS_END -->

# 趣灵 aha-flash 文档中心

趣灵当前以 V6 自由生成知识路径对外展示：用户输入任意概念后，系统自动识别知识结构、选择互动 Pattern、生成四步 Flow，并通过质量闸门后展示；五条精选 topic 只保留为稳定示例入口。文档只保留核心事实，避免规划稿、产品说明和实现记录互相重复。

## 当前文档

| 文档 | 用途 |
|---|---|
| `PRODUCT.md` | 当前产品定位、作品集体验、功能边界、设计质量标准和 V1 路线 |
| `TECHNICAL.md` | 技术架构、V5/V6 Flow 路由、Schema 协议、QualityGate 与验证规则 |
| `CHANGELOG.md` | 已完成任务、验收记录和重要修复 |
| `knowledge-skills/` | 8 类通用 Structure Skill 的教学合约与 Eval 资产 |
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
## 当前状态速览（2026-06-24）
- V6的主链路为：自由输入 -> ConceptPlan -> 八类通用Structure Skill -> KnowledgeBlueprint -> 四步Flow -> QualityGate -> 后续分支。
- 81个Blueprint固定用例覆盖八类知识结构；通用Skills不携带概念专用术语或预制关卡，概念grounding只来自当前ConceptPlan。
- 动态Flow不会为任意主题强行选择simulation_play。只有滑块输出或模拟器payload提供可验证公式时，数值结果才可作为事实显示。
- QualityGate继续做确定性结构校验：Schema、Pattern、动作与模板契约、主题grounding、占位符和禁止框架；它不把内部教学角色词写回用户界面。
- 事实准确性、时效信息和来源引用不属于V6。V7计划做按需Evidence Pack，而不是让所有请求无差别走RAG或堆积专用Skill。
- 当前不做账号、数据库、多设备同步、社区发布、生产级埋点、内部Wiki或常驻检索。
<!-- DOCS_STATUS_END -->

- 2026-07-01：结构化 LLM 调用已接入 DeepSeek JSON Output，降低非法 JSON、空 content 和格式漂移导致的 fallback；`eval:flow-live` 最新 8/8 通过，QualityGate 增加中英术语别名和分步术语覆盖；事实准确性仍规划到 V7 Evidence Pack。
- 2026-07-05: V6 visible grounding closeout passed. Dynamic Flow now filters internal teaching-action words from visible cue selection and prefers concrete ConceptPlan / Blueprint terms. Latest real `eval:flow-live` is 8/8 with `overall=1`, `llm_success_rate=1`, and all teaching metrics at 1.

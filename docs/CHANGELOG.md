# 趣灵 aha-flash — 迭代归档

> 文档定位：归档已经完成的开发任务、验收记录和重要修复。新的增量规划先放入 `docs/input-docs/`，整合后再开发。

---


## 2026-06-23

### Classification completion and progress correctness
- Reworked `classification_sort/category_buckets` into its actual learner interaction: one item at a time, then click a category card. Public copy no longer claims drag-and-drop or exposes the internal “bucket” name.
- Wrong category clicks now provide feedback but do not consume the item, add progress, trigger completion, or unlock the next Flow stage. Only a correct classification advances to the next item; all items must be correctly classified before completion.
- The Flow action bar now treats classification as an internally completed interaction, so a single click cannot bypass it with “检查这一关”.
- Classification feedback now uses one progress measure, `已分对 x / total`; the duplicate attempted-count versus correct-count display and noisy per-item technical recap were removed.
### Learner-facing copy and probability interaction
- Public Flow preview no longer exposes Blueprint structure names, source labels, raw English grounding terms, or internal generation states. It now presents a short learner-facing route with plain-language steps and actions.
- Shared Generative UI headers translate internal Pattern/template labels into learner actions, so labels such as `GACHA SIMULATOR` no longer appear in the product surface.
- Reworked the probability card component from an options/finance dashboard into a learning interaction: choose a possible outcome first, reveal the actual result second, then compare the two with a contextual explanation. Hidden compatibility fields such as option cost and strike price are no longer rendered.
- QualityGate now accepts a valid two-outcome probability choice (for example, health / infection) instead of wrongly requiring three options. Flow normalization also recovers common LLM aliases such as `options`, `outcomes`, `results`, and `cards` into the protocol `pool` field, recording the repair explicitly.
- Updated probability Flow prompting to require at least two meaningful outcomes and to keep non-financial topics free of card-pool, option, balance, and return jargon.
- Verified with a real `Bayes theorem` generation: LLM source, 4/4 trace coverage, 4/4 visible-term coverage, 4/4 action contracts, and 4/4 template affordances.

---
## 2026-06-22

### Deterministic teaching QualityGate
- Extended `QualityGateResult` with per-run teaching metrics: trace coverage, visible primary-content grounding, action-contract coverage, and template-affordance coverage across all four Blueprint steps.
- Added deterministic action/template contracts so a sorting lesson must render an orderable UI, a classification lesson must expose named buckets and items, and a quiz cannot pass without exactly one correct answer plus per-option explanations.
- Excluded `reward_copy` from visible-term evaluation: post-action encouragement can no longer make an otherwise generic card look grounded. Teaching traces now retain both step action terms and topic grounding terms without truncating the latter.
- Added `npm run eval:teaching` for deterministic negative cases (generic grounding, browse-only timeline for a sort goal, and missing quiz explanations). Added `npm run eval:teaching-manual` to output a four-step human review rubric.
- Extended `eval:flow-live` with repair-tag distributions by knowledge structure and four teaching coverage rates. Focused live checks passed for linear programming and DNS with LLM source, zero repair actions, and all teaching metrics at 4/4.
### Verifiable numerical interactions
- Extended the V2 payload contract with optional compound_interest formulas for parameter_explore outputs and simulation_play parameters.
- Compound-interest sliders now display the formula, the current substitution, and the calculated result. A 5% annual rate on a 100-unit principal for 10 periods now shows 100 × (1 + 5%)^10 = 162.89, instead of a generic multiplier result.
- simulation_play now detects explicit principal and annual-rate parameters, computes each period as 本金 × (1 + 年利率)^期数, and never treats the principal as a percentage rate. Unverifiable models are labelled as qualitative trend indices rather than factual predictions.
- Dynamic compound-interest Flow prompts require formula bindings; normalization can add the same deterministic binding only when both parameter labels are explicit. QualityGate rejects a compound-interest Flow without that binding.
- Added npm run eval:math as a deterministic regression check. The targeted real LLM compound-interest run passed with LLM source, zero repair actions, and the correct parameter-bound simulation formula.
### Four-step Flow interaction contract
- Dynamic free-generation Flow now follows a four-step KnowledgeBlueprint contract instead of stopping after three generic interactions. The system-process route is: identify modules -> order the request path -> separate normal and failure paths -> diagnose with feedback.
- Added `process_timeline/sequence_order`, a real click-to-order template. Browse-only timelines may no longer promise sorting; QualityGate rejects that affordance mismatch and normalizes Blueprint sorting steps to the orderable template.
- Quiz choices now lock after selection, show correctness and the explanation in place, and require an explicit learner acknowledgement before a Flow may advance. The generic bottom action no longer skips quiz or sequence-order feedback.
- Completion follow-up cards use a neutral branch accent rather than inheriting the final Pattern color, preventing a knowledge-check red state from making all next-step cards look like errors.
- Dynamic Flow fallback, generation prompts, preview, and deterministic evaluation now use four plays. `eval:flow-dynamic` includes a DNS regression asserting that the request-order step renders as `sequence_order`.
- Aligned ConceptPlan learning paths with the same four-step contract and tightened compound-interest slider outputs: every formula-backed terminal value must also declare `model: "exponential"`. The final focused DeepSeek compound-interest run passed with four plays and zero repair actions.
### V6 generation preview clarity
- Removed Blueprint `core_terms` and Pattern/template labels from the public Explore generation preview. They remain in the generation contract, debug payload, and QualityGate, but are no longer presented as learner-facing tags.
- Preview cards now show only the detected knowledge structure and three concise, topic-anchored learning stages. Empty titles use a topic-prefixed fallback rather than exposing Blueprint step goals.
- Added a deterministic QualityGate rule for play titles: each title must name the topic or a concrete term that appears in the component payload. Generic steps such as “识别输入与机制” or “观察最终结果与反馈” now trigger the existing one-pass LLM repair.
- Extended `eval:flow-live` to fail when a generated play title is generic. A 2026-06-22 compound-interest live run passed after repair with `连接本金输入与复利机制 -> 调整利率因素观察影响 -> 模拟观察复利终值结果`.
## 2026-06-21

### V6 project audit and reliability hardening
- Consolidated the three divergent `generateText` retry loops into `src/lib/llm/retry-generate-text.ts`: one transient-error policy, exponential backoff, and a 45-second request timeout shared by Studio chat, curated Flow, and dynamic Flow generation.
- Hardened `POST /api/flow`: per-client in-memory limit of 8 Flow requests per 10 minutes, `429`/`Retry-After`/remaining-budget headers, explicit malformed-JSON `400`, control-character cleanup, and an explicit 80-character topic limit instead of silent truncation.
- Made browser persistence failure explicit: completed-flow writes are nonfatal; dynamic draft writes return success/failure so Explore and continuation branches never navigate to an unreadable empty draft.
- Removed the custom Flow page's cascading render (`setState` inside `useEffect`) and stabilized the Flow completion callback dependencies; `npm run lint` is clean.
- Diagnosed an intermittent comparison payload drift (`dimensions[].name/title` instead of `label`) and tightened the generation contract rather than masking it in fallback repair.
- Final regression: lint, typecheck, production build, Schema 32/32, local Flow 15/15, Blueprint 80/80, dynamic fallback 9/9, Skill Packs 8/8, showcase 10/10 Pattern coverage, comparison strict 5/5, and full 8 structures x 3 strict live runs 24/24 with every repair metric at `0`.
- Documentation consolidation: removed the fully integrated V6 planning draft from `input-docs`; current truth now lives only in `PRODUCT.md`, `TECHNICAL.md`, `CHANGELOG.md`, and this README.
## 2026-06-20

### V6 engineering milestone
- Completed the V6 engineering scope: deterministic Blueprint/QualityGate, Skill Pack contracts, honest failure escapes, Blueprint-derived branches, pre-flow preview, and server-driven generation progress.
- Full release smoke passed: `eval:blueprint` 80/80 and `eval:flow-live -- --limit=8 --runs=3` 24/24 real LLM runs with `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, `flow_repair_rate: 0`, and `repair_reliance_rate: 0`.
- Kept retrieval/RAG and an internal Wiki explicitly out of V6; they remain V6.5/V7 accuracy work rather than hidden unfinished scope.
## 2026-06-19

### V6 server-driven generation progress
- `generateDynamicFlow` now emits real lifecycle stages: `concept_plan`, `blueprint`, `flow`, `quality_gate`, plus `repair` or `fallback` when needed.
- `POST /api/flow` supports `stream: true` and emits SSE `stage` events followed by the same sanitized `result` payload used by the JSON path. Explore now consumes those events instead of advancing progress with local timers.
- `eval:flow-live` records and validates the required stage order. The 2026-06-19 linear-programming live smoke passed with `concept_plan -> blueprint -> flow -> quality_gate`, LLM source, and zero repair actions.
### V6 generation preview checkpoint
- Changed `/explore` dynamic generation from automatic route jump to an explicit decomposition preview checkpoint. After `POST /api/flow` succeeds, users see the detected structure, core terms, and planned three-step path, then choose `进入三关` or `重新拆一次`.
- Added preview action styling and pending draft state cleanup so stale generated drafts are not reused after editing the topic, choosing an example, or hitting a failure state.
- Removed the native form-submit fallback from the Explore generator; the CTA now triggers generation explicitly and Enter is handled on the input, preventing accidental `/explore?` refreshes before the client event layer is ready.
### V6 post-contract live baseline
- Reran `npm run eval:flow-live -- --limit=8 --runs=3` after runtime Skill Contract injection. All 24 real LLM runs passed with `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, `flow_repair_rate: 0.083`, and `repair_reliance_rate: 0.083`.
- Remaining repair reliance is concentrated in causal/compound-interest flow repair (2/24 runs), making it the next targeted Prompt/Skill Pack tuning area.

## 2026-06-18

### V6 Skill Pack runtime contract
- Added a compact runtime formatter for Aha Skill Packs, exposing selected skeleton id, structure type, required visible terms, teaching order, Pattern family, misconceptions, forbidden framings, and example anchors.
- Injected the selected Skill Pack contract into both first-pass dynamic Flow generation and LLM repair prompts, so free generation uses the same teaching skill contract as Blueprint/QualityGate.
- Extended `eval:skills` to verify runtime prompt contracts and dynamic Flow injection do not drift from `docs/knowledge-skills/` or `src/lib/content/skill-packs.ts`.

### V6 Blueprint Stage C eval expansion
- Expanded `tests/fixtures/blueprint-cases.json` from 40 to 80 cases: 10 topics for each supported knowledge structure.
- Added broader deterministic hints and Skill Pack skeleton hints while preserving existing Chinese topic hints, so Chinese free input coverage is not weakened.
- Narrowed the system-process HTTP hint from generic `http` to `http request`, fixing the `HTTP status codes` misclassification into system flow.
- `npm run eval:blueprint` now reports 80 cases with `overall: 1`.
- Added comparison/causal natural-language anchors for QualityGate, reducing post-expansion live smoke to `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, and `repair_reliance_rate: 0.125` on an 8x1 sample.

## 2026-06-17

### V6 live generation reliability pass
- Added `npm run eval:flow-live` for real LLM sampling across 8 knowledge structures, with `--raw`, `--strict`, `--runs`, and `--limit` options.
- Split live eval repair metrics into `schema_repair_rate`, `flow_repair_rate`, and overall `repair_reliance_rate`.
- Made `KnowledgeBlueprint.pattern_strategy` authoritative: LLM `avoid_patterns` can no longer delete Blueprint core patterns, and each generated step is normalized to the exact Blueprint Pattern.
- Changed knowledge-structure inference to prefer deterministic topic hints before LLM-provided structure labels, fixing drift for classification, causal, and procedure topics.
- Added compact payload field guidance for all 10 Pattern defaults and recursive placeholder cleanup for `{value}`, `{result}`, `{output1}`, `{topic}`, and generic placeholder phrases.
- Latest full live baseline: 8 knowledge structures x 3 runs passed with `overall: 1`, `llm_success_rate: 1`, `clean_schema_rate: 1`, `schema_repair_rate: 0`, `schema_fallback_rate: 0`, `flow_repair_rate: 0`, and `repair_reliance_rate: 0`; all 24 runs used the LLM path with no mock fallback and no repair actions.
- Documented the next V6 direction: internal Aha Skill Packs plus repair action tagging, with a practical repair reliance target of `<= 0.2` rather than zero repair.
- Scoped factual accuracy for V6 to Skill Pack knowledge skeletons and deterministic QualityGate checks; full Wiki, citation-grade verification, and always-on web search remain future layers.
- Implemented structured `repair_actions` in dynamic Flow generation and live eval, so repair dependence can now be broken down by `field_fix`, `pattern_normalize`, `placeholder_clean`, `schema_repair`, `schema_fallback`, and `flow_repair`.
- Added a 45s timeout to dynamic Flow LLM calls so live eval and user generation do not hang indefinitely on provider stalls.
- Hardened dynamic Flow generation with exact Blueprint Pattern order in both user and repair prompts, probability payload numeric coercion, narrower placeholder detection, small topic core-term skeletons, and a no-brace `parameter_explore` explanation contract; full 8x3 live sample now holds at `repair_reliance_rate=0`, below the V6 target of 0.2.
- Upgraded dynamic Flow completion branches to prefer Blueprint-derived follow-ups. Generated/fallback flows now extend by structure-specific next concepts such as simplex method / dual problem / sensitivity analysis for optimization topics, while old static `getFlowFollowUps()` remains only as a fallback for curated flows.
- Added a production-safe pre-flow decomposition preview to `/api/flow` and `/explore`, so users briefly see the detected knowledge structure, core terms, and planned three-step interaction path before entering a generated Flow.
- Added the first internal Aha Skill Pack skeleton layer with 8 representative knowledge families. Blueprint and QualityGate now carry/check skeleton ids, required terms, forbidden framings, and unsuitable Patterns; `eval:blueprint` validates skeleton attachment and guards.
## 2026-06-16


### V6 Blueprint Stage B eval expansion
- Expanded `tests/fixtures/blueprint-cases.json` from 8 seed cases to 40 Stage B cases: 5 topics for each supported knowledge structure.
- Added deterministic hints for production planning, A/B testing, legal liability categories, supply and demand, and common algorithm topics.
- Added explicit structure inference priority so algorithm topics such as merge sort are not misclassified as generic classification tasks.
- `npm run eval:blueprint` now reports 40 cases with `overall: 1`.
### V6 TeachingTrace and honest failure audit
- Added `teaching_trace` to generated `KnowledgePlay` records so every dynamic step can be traced back to its Blueprint goal, required terms, intended user action, success criteria, and recommended Pattern.
- Dynamic Flow normalization now attaches trace data deterministically from `KnowledgeBlueprint`; model output does not need to invent audit fields.
- QualityGate now checks both visible step content and `teaching_trace`: trace improves debugging, but it does not replace visible teaching coverage.
- `eval:flow-dynamic` now treats no-key fallback as an honest failure path: failed generated drafts can remain diagnosable without being scored as user-facing success.


## 2026-06-14

### Dynamic Flow ConceptPlan pipeline
- Dynamic free-generation now runs in two stages: ConceptPlan first, then Flow JSON, then per-play Schema repair/validation.
- ConceptPlan records topic, domain, core question, grounding terms, recommended patterns, avoid patterns, learning path, category, topic area, and difficulty.
- /api/flow debug mode now exposes concept_plan and raw_plan_output, so failures can be diagnosed as planning error, Flow generation error, or schema repair error.
- Added a dynamic fallback regression case for linear programming; deterministic optimization/planning topics must avoid probability/gacha-style patterns.
- Manual local checks: Agent returns LLM source with system_builder -> parameter_explore -> simulation_play; linear programming returns LLM source with terms target function / constraints / feasible region / optimum / simplex and avoids probability.

### 精选集 Pattern 覆盖扩展
- 将公开精选集从 3 条扩展到 5 条：`bayes-starter`、`dns-router`、`options-risk`、`industrial-revolution`、`inflation-deflation`。
- 新增“期权选择”精选 Flow，覆盖 `probability`、`simulation_play`、`narrative_branch`。
- 重写 DNS 精选 Flow 的本地兜底，覆盖 `system_builder` 和 `classification_sort`。
- 新增 `npm run eval:showcase`，回归检查公开精选集至少 5 条 Flow，并覆盖全部 10 类 Pattern。
### 动态 Flow Pattern 选择与概率文案修正
- 动态 Flow 新增 Pattern 适配护栏：优化、规划、约束、目标函数、可行域、系统结构类主题不再接受 `probability` 抽卡模板，会自动 repair 到更合适的互动模式。
- 动态 Flow 的 `concept` 保留用户输入原词，避免把完整定义塞进页面标题或组件标题。
- `probability` payload 和抽卡组件统一归一化 20/50/30 这类百分数输入，避免显示成 2000% / 5000%。抽卡卡片主标题优先显示真实条目名，不再强行覆盖为“5 星结果”。
### 动态 Flow 贴题校验与通用 repair
- 移除 `Agent` 专用预制兜底，改为通用 `grounding_terms` 质量闸门：LLM 必须提炼 3-5 个专业锚点，并把锚点实际写入三关内容。
- 动态 Flow 首次输出不贴题时，会带失败原因自动 repair 一次；修复仍失败才回退到按用户 topic 包装的通用三关骨架。
- fallback follow-up 去掉 `相近概念` 这类占位式文案，改为机制、边界、真实场景三类通用延伸方向。
- `eval:flow-dynamic` 扩展到 7 个用例，新增 `Agent` 与 `Kubernetes operator` 非预制概念回归，确认不再依赖单概念专用内容。
### 动态 Flow 回归护栏
- 新增 `npm run eval:flow-dynamic`，覆盖无 API key 时的动态 Flow fallback。
- 回归用例验证任意 topic 会生成 `custom-*` 三关 Flow，且手选 `system_builder`、`process_timeline`、`comparison`、`parameter_explore` 时对应 Pattern 会进入关卡链。

---
## 2026-06-13

### 自由生成 Flow 主入口

完成：
- `/explore` 从固定 3 个 topic 的作品集入口升级为自由输入主入口，用户可输入任意知识点并选择 `AI 推荐` 或手选 10 类 Pattern。
- 新增 `POST /api/flow`，支持 `{ topic, preferredPattern }` 动态生成三关 `KnowledgeFlow`；`GET /api/flow` 保留三条 showcase Flow 旧链路。
- 新增 `/flow/custom?draftId=...`，通过 sessionStorage 播放动态生成的 Flow，缺失草稿时引导回首页重新生成。
- Flow 完成态优先读取 `flow.follow_ups`；点击 AI 延伸分支会再次调用动态 Flow 生成，形成连续知识穿行。
- 动态 Flow fallback 改为按用户输入 topic 生成通用三关，不再固定回退到贝叶斯、工业革命或通胀。
- Hub 完成记录增加 `source: generated`，可区分自由生成路径和精选路径。

验证：
- `npm run typecheck`
- `npm run build`

---
## 2026-06-12
### 首页路径化布局调整

完成：
- 将 `/explore` 的三张并列话题卡改为纵向学习路径，首张卡作为默认起点并增强视觉权重。
- 顶栏新增“首页”入口并高亮当前页，导航高度提升到 56px。
- 用“选择一个话题开始”替代证明条，减少自证式信息，强化行动引导。
- 话题卡内部改为横向信息展开，降低纵向堆叠感，并保留移动端单列适配。

---
### 单行文案策略修正

完成：
- 将首页 Hero 副标题、展示卡片 hook、Hub 回顾文案改为源头短文案。
- 明确“单行”不是 CSS 省略号策略，而是文案长度约束。
- V5 页面取消关键标题/说明文字的 ellipsis 隐藏，避免超长文案被样式掩盖。

---
### 活泼奶油视觉方向收口

完成：
- 将 `docs/input-docs/input.md` 的长期视觉要求整合进产品文档；该输入文档随后在内容完全合并后删除。
- 建立主蓝、行动橙、完成绿、辅助紫的配色优先级。
- Explore / Hub 进入“单色实底按钮 + 白字”“一行标题/副标题”“奶油色块卡片”的统一方向。

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`
- `npm run eval:flow`

---
### 首页与 Hub 风格统一

完成：
- `/explore` 去除“作品演示”表达，改为更像正式 ToC 产品的精选学习入口。
- 压缩首页 Hero 高度与标题尺度，收紧卡片区间距，减少下半屏空白感。
- 顶栏品牌图标和导航按钮改为中性色，避免与三张主题卡抢色。
- `/hub` 从绿色体系调整为中性暗色 + 暖白标签，统一按钮、图标、标签、弹窗和卡片圆角。

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`
- `npm run eval:flow`

---
### 首页多邻国式色彩收口

完成：
- `/explore` 作品集首页改为干净白底，移除原有绿/蓝径向渐变底色。
- 首页主 CTA 改为中性近黑按钮，次级入口改为轻量文字链接，减少配色竞争。
- 三张 showcase topic 卡片按知识类型注入独立主题色：概率紫、历史陶红、经济松石绿。
- 卡片圆角、阴影、hover 上浮、装饰编号和分类标签统一改为更偏 ToC 游戏化的视觉语言。

验证：
- `npm run typecheck`
- `npm run build`

---
### 文档整合与冗余收口

完成：
- 删除已完全吸收到 `PRODUCT.md` / `TECHNICAL.md` / `CHANGELOG.md` 的 `docs/input-docs/PRODUCT_V5.md` 与 `docs/input-docs/ROUND4_PLATFORM_TRANSFORMATION.md`，`input-docs/` 仅保留使用说明。
- 更新 `docs/README.md`，将文档中心、公开体验路径和验证命令统一到当前 V5 作品集模式。
- `output/` 加入 `.gitignore`，保留本地验证产物但不再污染 `git status`。
- `FlowRouteClient` 改为复用 `isShowcaseFlowId()`，去掉重复维护的 LLM Flow ID 列表。
- `/explore` 将 showcase flow 列表提升为模块级常量，减少 render 内重复计算。
- `/flow/[flowId]` 的静态预渲染路径收敛到 3 条作品集 Flow，生产构建页面数从 23 降到 17。
- 移除旧首页筛选遗留的未使用 `TOPIC_CATEGORIES` 常量。
- 修复 lint 报告的同步 effect setState：Hub 的 localStorage 读取延后到异步回调，Flow 的触碰状态改为按 play id 记录。
- 为抽卡转盘提供稳定空池常量，避免 `useMemo` 依赖因空数组字面量抖动。

验证：
- `npm run lint`
- `npm run typecheck`
- `npm run build`：仅预渲染 `/flow/bayes-starter`、`/flow/industrial-revolution`、`/flow/inflation-deflation`。
- `npm run eval:score`：固定 32 用例 `overall: 1`。
- `npm run eval:flow`：15 cases，3 flows，本地模式 `overall: 1`。

---
### V5 作品集部署模式收口

完成：
- `/explore` 从完整产品首页收敛为求职作品入口：固定展示 3 个精选 topic，不再暴露分类筛选、搜索和完整话题列表。
- 新增 `SHOWCASE_FLOW_IDS` / `getShowcaseFlows()`，当前展示 `bayes-starter`、`industrial-revolution`、`inflation-deflation` 三条验证过的垂直切片。
- 首页文案改为“3 分钟作品演示”，强调三张 topic 卡、每个三关、完成后写入 Hub 的最小闭环。
- 保留 Hub 入口和随机开始 CTA，确保一个公开链接打开就能玩，不需要注册、付费或多设备同步。

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`：固定 32 用例 `overall: 1`。
- `npm run eval:flow`：15 cases，3 flows，本地模式 `overall: 1`。
- 本地 `/explore` HTTP 冒烟：状态 200，包含三张 topic，且不包含搜索入口。

---
### V5 Hub 轻量化收口

完成：
- `/flow/[flowId]` 在完成最后一关后写入本地完成记录，记录 flowId、标题、概念、分类、摘要、概念列表、完成关卡数和完成时间。
- 重写 `/hub` 为 V5 轻量个人图鉴：顶部成就数字、最近点亮卡、概念卡片墙和 30 秒快速回顾弹窗。
- Hub 同时读取本地 Flow 完成记录与 `/api/state` 已学资产；状态接口失败时仍展示本机通关记录，避免个人页空白。
- 保持 Hub 轻消费定位：不做知识图谱、笔记、收藏、排行或重型数据看板。

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`：固定 32 用例 `overall: 1`。
- `npm run eval:flow`：15 cases，3 flows，本地模式 `overall: 1`。

下一步：
- 可对 `/hub` 做一次浏览器截图验收；产品侧下一轮优先考虑 Flow 多次采样稳定性或公开部署前体验细节。

---
### V5 Flow Steps 自动化 Eval

完成：
- 新增 `tests/fixtures/flow-cases.json`，覆盖 probability / timeline / comparison 三类知识类型，每类 5 个固定检查点，共 15 个 Flow Eval case。
- 新增 `tests/eval/flow-score.ts`，支持本地 mock 模式和 API 模式：默认不消耗 LLM；带 `--url` 时调用 `/api/flow` 验证真实生成链路。
- 新增 `npm run eval:flow`，输出 overall、flow_validity、pattern_fit、payload_completeness、copy_safety、concept_anchor 和 failed_cases。
- 将 `bayes-starter` 与 `industrial-revolution` 的 mock fallback 改为显式 V2 payload，使 fallback、LLM spec 和 Eval 标准对齐。
- Flow 生成后处理补齐 pattern 默认结构：parameter slider 默认 scenarios / outputs / insight_rules，timeline 默认完整 events，comparison 默认 dimensions。

验证：
- `npm run eval:flow`：15 cases，3 flows，本地模式 `overall: 1`。
- `npm run eval:flow -- --url=http://127.0.0.1:3020/api/flow?debug=1 --runs=1`：3 个 topic 均为 `source=llm`，API 模式 `overall: 1`。
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`：固定 32 用例 `overall: 1`。

下一步：
- Flow Eval 已有第一版自动化基线；后续可以把 `--runs` 提高到 3-5 做稳定性抽样，再推进 Hub V5 简化。

---
### V5 Flow Steps 多知识类型扩展

完成：
- 将 `src/lib/content/flow-generation.ts` 从 `bayes-starter` 专用生成器重构为 topic spec 驱动的通用 Flow Steps 生成器。
- 新增 LLM Flow topic：`industrial-revolution`，用于验证 timeline / process_timeline 类知识。
- 新增 LLM Flow topic：`inflation-deflation`，用于验证 comparison 类知识。
- `/api/flow` 改为按支持列表选择 LLM 生成；未接入的话题继续稳定返回 mock Flow。
- `/flow/[flowId]` 前端生成态支持三个 LLM topic，不再只对贝叶斯触发生成。
- `eval:flow-manual` 报告改为按 flowId 命名，并补充 timeline events 与 comparison dimensions 摘要。

手动采样：
- `industrial-revolution`：10/10 `source=llm`，目标 Pattern 覆盖 `knowledge_check/single_question`、`process_timeline/horizontal_timeline`、`concept_memory/term_cards`。
- `inflation-deflation`：10/10 `source=llm`，目标 Pattern 覆盖 `knowledge_check/single_question`、`comparison/split_panel`、`comparison/overlay_fade`。
- 两个报告均未命中 schema fallback、`{result}` / `{output1}` / `{calculated}` 占位符残留或过度游戏化 reward 禁词。

输出：
- `output/manual-flow-eval/industrial-revolution-2026-06-12T01-26-13-507Z.md`
- `output/manual-flow-eval/inflation-deflation-2026-06-12T01-29-01-084Z.md`

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`，固定 32 用例 `overall: 1`。

下一步：
- 三个知识类型（probability / timeline / comparison）都稳定后，再开始 Flow Steps 自动化 Eval，覆盖 3 种知识类型 × 每种 5 个固定用例。

---
## 2026-06-11

### V5 bayes-starter LLM Flow Steps 垂直切片

完成：
- 新增 `src/lib/content/flow-generation.ts`，为 `bayes-starter` 建立一次生成 3 个 `KnowledgePlay` 的 LLM Flow Steps 链路。
- 新增 `/api/flow?flowId=bayes-starter`，优先返回 LLM 生成 Flow，失败时回退 mock Flow；本地 `debug=1` 可查看失败原因和原始输出。
- 新增 `src/components/explore/flow-route-client.tsx`，`/flow/bayes-starter` 进入时先生成三关，失败时不中断用户体验。
- 新增 `npm run eval:flow-manual`，采样 10 次并输出 Markdown/JSON，支持人工判断“3 关下来是否有啊哈感”。
- 为 Flow Step schema 加入轻量字段修复，处理 DeepSeek 常见的 `text/label`、`name/label`、`description/text` 等漂移。
- 补强 Flow Step 生成稳定性：修复 pattern/template 对调、`v1/v2` 模板别名、滑块 payload 字段漂移、未替换占位符和过度游戏化 reward 文案。

手动采样：
- 命令：`npm run eval:flow-manual -- --runs=10 --url=http://127.0.0.1:3016/api/flow?flowId=bayes-starter`
- 结果：10 次中 7 次 `source=llm`，3 次回退 mock。
- 输出：`output/manual-flow-eval/bayes-starter-2026-06-11T09-47-45-906Z.md`。
- 初步人工判断：LLM 成功样本基本形成“先猜 -> 认识先验/证据/后验 -> 调证据强度”的体验链条，方向成立；下一步需要降低 3 次 fallback，并清理部分滑块文案里的占位符表达。

稳定性收口采样：
- 命令：`npm run eval:flow-manual -- --runs=10 --url=http://127.0.0.1:3018/api/flow?flowId=bayes-starter&debug=1`
- 结果：10 次全部 `source=llm`，未再出现 schema fallback；未命中 `{result}` / `{output1}` / `{calculated}` 等占位符残留。
- 输出：`output/manual-flow-eval/bayes-starter-2026-06-11T10-03-48-466Z.md`。
- 回归：`npm run eval:score` 仍为 `overall: 1`，32 个固定用例无退化。

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`

---
### V5 轻消费闯关转向

完成：
- 读取并整合 `docs/input-docs/PRODUCT_V5.md`，将正式产品定位改为“知识版休闲游戏 / 不内疚的知识消遣”。
- 更新 `docs/PRODUCT.md`：V5 取代旧版产品定位、页面架构、V1 范围和成功指标，保留互动组件质量标准与隐喻生成语言。
- 更新 `docs/TECHNICAL.md`：新增 V5 路由职责、`KnowledgeFlow` 内容模型、Flow 渲染规则和 Flow Steps 后续生成策略。
- 扩展 `src/lib/content/mock-flows.ts` 为 8 个冷启动精选话题，覆盖科技、经济、哲学、心理、历史、数理分类。
- 将 `/explore` 改为精选话题卡入口，支持分类筛选、搜索和随机体验，不再内嵌 Flow 或暴露 Studio 主入口。
- 新增 `/flow/[flowId]` 独立全屏闯关页，采用顶部退出/进度条、中央单组件舞台、底部操作台的 V5 三段式结构。

验证：
- `npm run typecheck`

---
### Round 4 Explore 消费级视觉收口

完成：
- `/explore` Hero 删除重复的 Studio/Hub 大按钮，改为单主 CTA“随机体验一个概念”。
- Flow 列表从卡片墙改为轻量左侧导航，未选中项无边框，选中项使用浅绿底和左侧激活条。
- 右侧 Flow 主舞台改为白色大容器、轻阴影和更明确的 12 列对齐关系，减少盒中盒和边框噪音。
- Explore 场景下弱化 Generative UI 外框、组件标题分割线和内部卡片边框，改用背景、留白、hover 上浮和轻阴影表达层级。
- 翻牌/选项类卡片增加角标与 hover 浮起，强化可点击暗示。
- “标记完成”改为“点亮这一关”，“下一关”改为“继续下一步”；趣灵提示改为气泡式向导呈现。

验证：
- `npm run typecheck`

---
### Round 4 平台化转型启动

完成：
- 新增 `docs/input-docs/ROUND4_PLATFORM_TRANSFORMATION.md`，记录 Explore / Studio / Hub / Pattern Skills 平台方向。
- 更新 `PRODUCT.md` 和 `TECHNICAL.md`，将 Round 4 的路由结构、Knowledge Flow、`visual_asset` 和视觉资源注册表纳入长期文档。
- 引入 `framer-motion`，作为 Flow 切换、趣灵状态提示和奖励反馈的轻量动画底座。
- V2 / Normalized Schema 新增 optional `visual_asset` 字段；Zod 校验、Tool Calling 构建和 JSON fallback Prompt 均接受该字段，旧 Schema 不带字段仍可渲染。
- 新增 `src/lib/content/visual-assets.ts`，为 10 个 Pattern 提供本地默认视觉资源映射。
- 新增 `src/lib/content/mock-flows.ts`，提供 3 组本地 Knowledge Flow：贝叶斯入门、半导体通识、宏观经济入门。
- 新增 `/explore` 默认探索页和 Flow 播放容器，支持精选 Flow、静态图谱节点、关卡切换和完成奖励。
- 将原首页生成工作台迁移到 `/studio`，`/` 默认跳转 `/explore`。
- 新增 `/hub` 个人图鉴页，复用已学资产读取和导出能力；`/sandbox` 作为兼容入口保留。
- Studio 增加“保存草稿”“发布到探索页”的前端 mock 行为，为后续真实发布流留接口。

验证：
- `npm run typecheck`

---
## 2026-06-08

### Round 3 MVP 1.0 收束规划

- 读取并采纳 `docs/input-docs/BACKLOG_ROUND3.md`。
- 将 MVP 1.0 交付标准、T30-T39 任务清单和执行顺序整合进 `PRODUCT.md`。
- 将 Pattern Tool Calling、三重兜底、Prompt 简化、成本优化和安全部署目标同步进 `TECHNICAL.md`。
- T30 已完成：新增 `src/lib/tools/generative-tools.ts`，定义 10 个 Pattern Tool、默认 Template 映射和 Tool 调用结果转 V2 Schema helper。
- T31 已完成：`/api/chat` 优先使用 AI SDK Tool Calling 选择 `generate_*` Pattern Tool；Tool 失败时保留现有 JSON fallback，最终仍可 mock fallback。
- T32 已完成：拆分 Tool 主链路 Prompt 与 JSON fallback Prompt；Tool 主链路不再注入自然语言 `SCHEMA_REFERENCE` 和输出格式长规则。
- T33 已完成：Tool Calling 路径改为已知 Pattern/Template 的直达 payload 校验；`metaphor_trace` 等调试字段无效时不再导致主组件整体 fallback。
- T34 已完成：显式返回 `generation_mode=tool|json_fallback|mock`；支持服务端开关或开发请求体跳过 Tool Calling 以验收 JSON fallback。
- T35a 已完成：顶栏、空态舞台和底部输入栏完成视觉收束；输入框改为受控输入，空态关键词可直接填入输入栏，生产模式下验证提交体能正确携带当前输入。
- T35b 已完成：逐组件走查互动模板视觉细节，统一生成组件色阶层次；滑块控件补齐 44px 触控面和 focus 状态；补充图标按钮可见文案；修复 combo quiz 重复点击刷分问题。
- T35c 已完成：生成期间舞台显示居中 loading 状态层，底部提交按钮切换为“生成中”并禁用，输入框同步禁用；错误提示使用 `role=alert` 明确失败态。
- T36 已完成：路由、追问和状态提炼默认改为确定性规则，LLM 调用预算集中给 Schema 生成；JSON fallback prompt 仅在 Tool Calling 失败后构造和发送，单次请求最坏为 Tool + JSON + Repair 三次模型调用。
- T37 已完成：`/api/chat` 增加输入控制字符清理、2000 字长度限制和基础内存限流；生产响应不再返回 `validation_error` 调试细节；非流式异常统一返回脱敏错误。
- T38 按当前优先级暂时搁置，先完成 T39。
- T39 已完成：Eval 固定集从 14 条扩展到 32 条，覆盖 10 类 Pattern、17 个模板变体、3 档深度和 3 类意图；`eval:score` 固定集 overall 保持 1。补充贝叶斯纯名词 case，并将贝叶斯/先验/后验输入强制走 `concept_memory/term_cards`，真实 API 复测不再落 mock。
- 真实泛化测试补充：对“蒸馏”“勾股定理”“牛顿第一定律”“光合作用”“正态分布”“缓存”“供需关系”“机器学习术语配对”等非固定集输入进行真实 API 复测；为 Tool Calling 增加可选 `template` 参数，并收紧 schema intent，修复纯短概念和配对记忆卡更容易落 mock 的问题。

## 2026-06-07

### P7 分段生成状态

完成：
- `/api/chat` 支持 `stream: true`，返回 NDJSON 阶段事件流。
- 服务端在读取状态、识别追问、整理 Prompt、生成组件、校验 Schema、更新记忆和完成时推送阶段事件。
- 首页读取流式响应并实时更新 loading 文案，最后收到完整 payload 后渲染互动组件。
- 保留非流式 JSON 兼容路径。
- P7 标记为完成。

验证：
- `npm run typecheck`
- `npm run build`
- `npm run eval:score`

---

### P7 反馈与知识卡导出

完成：
- 首页当前组件下方新增“有帮助 / 不准确”轻量反馈。
- 反馈通过 `/api/interaction` 写入用户状态摘要，用于后续调整隐喻与组件生成。
- 知识沙盒单张概念卡支持导出 Markdown 知识卡。
- `PRODUCT.md` 当时记录：错误边界、反馈调优、知识卡片导出已完成，流式生成随后推进。

验证：
- `npm run typecheck`
- `npm run build`

---

### 对话记忆短期窗口与追问线程

完成：
- `/api/chat` 支持接收最近 6 条轻量消息作为短期窗口，只用于本轮 Prompt。
- 新增追问检测：当前线程存在时，识别“继续、刚才、为什么、怎么、展开”等延续表达；有模型时可由 LLM 轻量判别，规则兜底。
- Prompt 注入 `recent_messages`、`thread_context` 和历史 `thread_summaries`，要求追问时延续同一隐喻体系。
- 用户状态新增 `current_thread` 和 `thread_summaries`；同概念追问累加线程深度，换题时归档短摘要。
- 偏好设置和闲聊不打断当前学习线程。
- P6 对话记忆升级标记为完成。

验证：
- `npm run typecheck`
- `npm run build`

---

### 组件质量收口

完成：
- 删除首页不再使用的旧聊天历史、聊天消息和思考指示组件。
- 旧聊天式消息流不再作为产品主界面的一部分，避免与互动组件舞台竞争注意力。
- P1 组件视觉、状态和交互质量阶段标记为完成。

验证：
- 残留扫描确认旧聊天组件无引用。
- `npm run typecheck`
- `npm run build`

---

### 文档体系收敛

完成：
- 将原本分散的产品、架构、实施、Backlog 和设计规范合并为 `PRODUCT.md` 与 `TECHNICAL.md` 两份核心文档。
- `PRODUCT.md` 统一维护产品定位、核心体验、功能边界、设计质量标准和当前路线。
- `TECHNICAL.md` 统一维护架构、Schema、状态、对话生命周期、工具边界、验证命令和技术债。
- `docs/README.md` 改为文档中心，只保留核心文档索引和增量文档工作流。
- 新增 `docs/input-docs/README.md`，明确后续用户新增规划统一放入 `docs/input-docs/` 根目录。
- 审查旧输入材料，已整合或无独立追溯价值的内容不再留档。

规则：
- 以后开发前先读取 `docs/input-docs/` 的新增文档。
- 先分辨新增、重复、过期和仅归档内容。
- 先合并进 `PRODUCT.md` / `TECHNICAL.md` / `CHANGELOG.md`，再开始编码。
- 已整合、重复、过期或无独立追溯价值的输入直接删除；只有仍有来源追溯价值的材料才进入 `archive/`。

验证：
- 核心文档索引已切换到新结构；无用历史输入已删除。

---

### 产品设计规范补充

完成：
- 将新增 `DESIGN_SPEC` 中的页面信息架构合并进 `PRODUCT.md` 和 `TECHNICAL.md`。
- 当前首页目标改为 48px 顶栏、居中交互组件舞台、底部固定输入栏。
- 首页不再以侧栏状态面板、状态摘要和对话历史作为主信息架构。
- 深度交互目标改为“看一眼 → 试一下 → 拆开看”的渐进式引导，不再在输入前展示三档按钮组。
- 增补“通用语打底，领域语翻译”的隐喻语言原则。

---

### 首页布局与深度引导改造

完成：
- 首页从“侧栏 + 工作台”改为顶栏、居中组件舞台、底部输入栏三段式布局。
- 移除首页可见的当前状态调试面板、状态摘要面板和对话历史面板。
- 移除 body 网格背景，降低页面装饰对交互组件的干扰。
- 输入栏移到底部，删除输入前的深度三按钮和示例按钮。
- `registry` 不再在组件顶部渲染三档深度切换。
- 组件完成交互后，底部浮现下一档深度引导：看一眼后提示“代入真实场景试试”，试一下后提示“拆开看看原理”。
- 下一步概念推荐移动到组件下方/输入框上方的内联引导区。

验证：
- `npm run typecheck`
- `npm run build`
- Playwright 快照确认首页为顶栏、空态舞台、底部输入栏，无侧栏/对话历史残留。

---

### Design Spec 剩余组件精修

完成：
- `system_builder/module_sandbox` 接入统一组件外壳、选项按钮、进度条、反馈面板和空态。
- `system_builder/flow_connect` 接入统一组件外壳、流程路径面板、选项按钮、进度条和错误顺序反馈。
- `simulation_play/parameter_simulation` 接入统一组件外壳、参数面板、进度条、结果反馈和标准控制区。
- `comparison/split_panel` 迁移到统一组件外壳，清理旧圆角、非规范间距和 `text-lg` 标题。
- `comparison/overlay_fade` 迁移到统一组件外壳和面板层级。
- `probability/spin_wheel` 迁移到统一组件外壳和反馈面板，转盘颜色改为 Pattern 变量驱动。
- 输入基础组件清理硬编码圆角和背景色。
- 移除 `animate-pulse` 残留，统一使用 `ui-breathe`。

验证：
- `npm run typecheck`
- `npm run build`

---

### 内容质量与隐喻推理补充

完成：
- 将完整 `DESIGN_SPEC` 中的颜色、字号、间距、圆角、动效参数和可及性规则补充进 `PRODUCT.md` 与 `TECHNICAL.md`。
- `src/types/schema.ts` 新增 `MetaphorTrace`，所有组件 payload 类型通过 `ComponentDepthConfig` 支持可选 `metaphor_trace`。
- `schema-validator` 允许所有 V2/V1 payload 携带 `metaphor_trace` 调试字段。
- `prompt-templates.ts` 将隐喻规则改为“通用语打底，领域语翻译”。
- `OUTPUT_FORMAT_RULES` 增加隐喻推理流程：拆动作、找机制、验映射、统一术语、给具体对应物。
- Prompt 要求 payload 输出 `metaphor_trace`，前端不渲染，仅用于调试、评估和回归。

验证：
- `npm run typecheck`
- `npm run build`

---

### 隐喻一致性评估

完成：
- `tests/eval/lib.ts` 新增 `metaphor_consistency` 维度。
- 评分会检查 `metaphor_trace` 是否包含核心动作、来源领域、候选机制、至少 2 条映射验证和至少 2 个统一术语。
- 无预测文件时 mock 基线仍可作为满分基准；候选预测缺少 `metaphor_trace` 会被扣分。
- `tests/eval/score.ts` 和 `tests/eval/compare.ts` 输出隐喻一致性均值和差异。

验证：
- `npm run eval:score`
- `npm run typecheck`
- `npm run build`

---

### 搜索与 URL 路由清理

完成：
- `/api/chat` 移除 `collectSourceContexts()` 和 `source_context` Prompt 注入。
- 删除 `source-router`、`web-search`、`web-extractor`、`youtube-transcript` 工具实现。
- `V1_TOOLS` 只保留 `update_user_state`。
- 移除 `youtube-transcript`、`jsdom`、`@mozilla/readability` 等不再使用的依赖。
- 清理聊天消息中的 `sources` 字段和旧来源展示。
- Prompt 输出规范不再引用 `<source_context>`。
- `TECHNICAL.md` 更新为纯文本概念输入主链路。

验证：
- `npm install`
- `npm run typecheck`
- `npm run build`

---

### 文档目录整理

完成：
- 新建 `docs/`，将根目录长期文档统一迁入。
- 将外部输入材料归入 `docs/input-docs/`。
- 更新 `docs/README.md` 和 `docs/PRD.md` 的文档索引。

---

### Design Spec 基础层改造

完成：
- 新增并采用 `DESIGN_SPEC.md` 作为互动组件质量规范。
- `shared.tsx` 增加 Pattern 主色映射、进入动画包装、深度切换条、统一面板/反馈/进度微交互。
- `registry` 统一包裹所有生成组件，自动注入 Pattern 主题色、进入动画、深度切换和错误边界。
- 首页支持组件内深度切换事件，点击快懂/场景/映射会按当前概念重新请求对应深度 Schema。
- 全局 CSS 增加三层表面色、按钮按压、结果揭示、数值弹入、成功闪烁、失败抖动等动画。
- Prompt 补充 payload 最少内容量、数组最少项数和每个 Pattern 的第二条反例约束。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 验证组件顶部深度切换条已出现

### Design Spec 核心组件精修

完成：
- `gacha-simulator` 按规范统一圆角、间距、语义呼吸动画、操作高亮、结果区入场和余额数值弹入。
- `slider-explorer` / `dual-slider-explorer` 改为仪表式参数面板，输出卡片和解释区使用统一 raised/panel 层级。
- `quiz-battle` 调整题目层级和选项间距，匹配共享反馈动画。
- `narrative-branch` 迁移到 `ComponentFrame`、`ChoiceButton`、`FeedbackPanel`，补齐空态和结果揭示反馈。
- 全局增加 `.ui-breathe` 语义动画，替代组件内直接使用 `animate-pulse`。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 验证默认期权组件正常渲染

### Design Spec 记忆/时间线/分类精修

完成：
- `card_flip` 清理标题层级，翻转内容加入结果揭示动画。
- `card_grid_match` 统一 select 控件、圆角、间距，并为正确/错误匹配增加闪烁/抖动反馈。
- `vertical_timeline` 清理非规范间距。
- `quiz_combo_chain` 统一问题层级、选项间距和 combo 数值弹入。
- `classification_sort` 迁移到 `ComponentFrame`、`ChoiceButton`、`FeedbackPanel`、`ProgressMeter`，补齐空态、进度、正确/错误反馈和结果回顾。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 验证分类组件正常渲染

---

### 组件质量第二阶段

完成：
- 新增 `src/components/generative-ui/shared.tsx`，提供统一组件外壳、深度标签、面板、反馈面板、进度条、选项按钮、空态和组件级错误边界。
- `registry` 接入组件错误边界，单个互动组件渲染失败时展示可重试降级，不再拖垮整个工作台。
- `concept_memory`、`knowledge_check`、`process_timeline` 相关旧组件接入统一标题区、深度标签、空态、进度和选中/正确/错误反馈。
- 所有组件 config 类型统一支持 `depth`，匹配 registry 注入学习深度的运行时行为。
- `SCHEMA_REFERENCE` 增加跨 Pattern 的交互质量、视觉密度、空态规避规则，并为各 Pattern 补充视觉指导。
- 扩展隐喻映射表，覆盖内容创作、软件工程、产品设计、投资、教育、法律、医学、运动和更多游戏兴趣域。

验证：
- `npm run typecheck`
- `npm run lint`

---

### 组件质量第一阶段

完成：
- `comparison/split_panel` 支持维度式对比：主题 A/B、维度按钮、差异说明和总结，不再依赖无意义的顶部比例滑条。
- `parameter_explore/slider` 和 `parameter_explore/dual_slider` 支持 schema 驱动输出指标与分段洞察，避免所有概念都被硬编码成平方成本示例。
- `classification/sort` 增加即时正确/错误反馈、解释文案和已回答回顾。
- `system_builder/module_sandbox` 和 `system_builder/flow_connect` 支持必要模块、期望顺序、连接关系和完成反馈。
- 扩展 `src/types/schema.ts`、Zod 校验、mock schema 和 Prompt SCHEMA_REFERENCE，使 LLM 输出具备更明确的视觉与交互约束。

验收：
- 股票 vs. 期权 mock 渲染为多维对比卡片，包含“你拥有什么 / 先付成本 / 亏损边界 / 时间限制”维度切换。
- Prompt 约束明确要求对比优先给出 dimensions，参数探索给出 outputs / insight_rules，系统构建给出 required_module_ids / expected_sequence。
- DeepSeek 输出未通过组件约束时，页面仍能稳定落到 mock 兜底组件并展示可测试状态。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run eval:score`
- `npm run build`
- Playwright 生产服务快照验收

---

## 2026-06-06

### 文档与代码整理

完成：
- 新增 `README.md`，作为项目入口、快速开始和文档索引。
- 精简 `IMPLEMENTATION.md`，只保留当前状态、路线、工作流和环境变量。
- `ARCHITECTURE.md` 不再重复维护 Pattern 表，改为指向代码侧 `SCHEMA_CATALOG`。
- 代码侧合并学习深度标签配置，并从单一 Schema catalog 派生 V1/V2 映射。

验证：
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run eval:score`

### 产品纠偏 — 输入入口

完成：
- 将 YouTube URL / 网页 URL 粘贴从主路径降级为辅助入口。
- PRD 补充自然导入方向：截图/图片、音频/视频文件、剪贴板内容、系统分享入口。
- 首页输入框文案改为鼓励输入概念、问题或直接粘贴看到的内容。
- 架构文档明确 `youtube_transcript_fetch` 只服务用户明确提供 URL 的场景。

原因：
- 用户在外部看到视频、音频或图片时，真实动作通常不是复制链接再粘贴回来。
- URL 抓取仍有价值，但只适合低频高级入口或技术兜底。

### Phase 5 — 外部集成

完成 T13-T14：联网搜索 Tool 与 source-router 调整。

新增：
- `web_search` tool
- Brave / Google / Tavily 多 provider 搜索链
- `WEB_SEARCH_PROVIDER`、`BRAVE_SEARCH_API_KEY`、`GOOGLE_SEARCH_API_KEY`、`GOOGLE_SEARCH_ENGINE_ID`、`TAVILY_API_KEY` 环境变量
- 纯文本外部信息请求的搜索触发规则
- 聊天消息来源展示支持“搜索”

行为：
- 输入包含 URL 时，继续走 `web_content_extract` 或 `youtube_transcript_fetch`。
- 输入不含 URL、但包含“最新/最近/当前/新闻/看法/观点/价格/政策/巴菲特”等外部信息信号时，触发 `web_search`。
- 默认 `WEB_SEARCH_PROVIDER=auto`，按 Brave -> Google -> Tavily 顺序尝试，以优先使用免费或便宜渠道。
- 搜索结果只作为 Prompt 上下文注入，不写入长期状态，不保存全文。
- 未配置搜索 API key 时返回可控失败，并在聊天来源中显示“读取失败 · 搜索”。

验收：
- `/api/tools` 调用 `web_search` 在无 key 时返回 `TAVILY_API_KEY is not configured`，不报 500。
- `/api/chat` 输入“巴菲特对期权的最新看法”会返回 `sources[0].type = "search"`。
- `/api/chat` 输入 URL 时返回 `type = "web"`，不误触发 search。
- 页面提交搜索类问题后，聊天消息展示“读取失败 · 搜索 · 巴菲特对期权的最新看法”。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测
- Playwright 生产服务页面快照验收

### Phase 4 — 知识沙盒体系

完成 T09：知识资产存储。

新增：
- `UserState.knowledge_assets`
- `KnowledgeAsset` 类型
- `stateStore.addKnowledgeAsset()`
- `/api/chat` 在知识类对话生成后写入概念资产
- System Prompt 注入最近知识资产
- 首页侧栏展示已学概念数量和最近概念

验收：
- 输入“期权是什么？用我能听懂的方式讲。”后，状态写入 `concept: "期权"`。
- 重复学习同一概念时，`knowledge_assets` 数量保持 1，旧资产被覆盖。
- 页面侧栏从“已学 0”更新为“已学 1”，并展示“期权”。
- 泛化表达“我能听懂的方式”不再被写入 `metaphor_preferences`。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测和 Playwright 页面快照验收

完成 T10：知识链推荐。

新增：
- Schema 支持可选 `next_concepts`
- Zod 校验支持 V1/V2 推荐链字段
- Prompt 输出规范要求知识讲解类请求给出 1-2 个后续概念
- 期权 mock 示例推荐“期货”和“保险”
- 首页工作台在组件下方展示“下一步”推荐卡片
- 点击推荐卡片会带着关系说明触发下一轮学习

验收：
- 输入“期权是什么？用我能听懂的方式讲。”后，工作台底部显示“期货”“保险”。
- 点击“期货”后触发下一轮学习，对话中出现“期货是什么？它和刚才的关系是...”。
- 用户状态中已学概念从“期权”更新为“期货、期权”。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测
- Playwright 生产服务页面快照验收

完成 T12：`/sandbox` 知识沙盒页面。

新增：
- `src/app/sandbox/page.tsx`
- 首页状态面板新增“知识沙盒”入口
- 沙盒页读取当前匿名用户状态
- 已学概念按 `topic_area` 分组展示
- 概念卡片展示 concept、pattern、template、理解深度和学习时间
- 沙盒页统计已学概念数、覆盖的交互模式数和深入理解数量

验收：
- 通过 `/api/chat` 生成“期权”“算法复杂度”“沉没成本”三个知识资产。
- 进入 `/sandbox` 后可看到 3 张概念卡片。
- 卡片展示 pattern、template、理解深度。
- 页面按“金融”“认知”等主题分组展示。
- 首页状态面板可看到并进入“知识沙盒”入口。

验证：
- `npm run typecheck`
- `npm run build`
- Playwright 生产服务页面快照验收

完成 T11：深度分级。

新增：
- Schema 支持顶层 `depth: rapid | scenario | mapping`
- `/api/chat` 接收 `depth`，并注入 Prompt 的 `<target_depth>`
- 首页输入区新增“快懂 / 场景 / 映射”三段深度切换
- 首页状态面板展示当前输出深度
- `probability` 期权示例按三档生成不同标题、说明、交互目标和反馈文案
- `narrative_branch` 沉没成本示例按三档生成不同开场、分支目标和洞察文案
- 知识资产理解深度按 `rapid -> shallow`、`scenario -> moderate`、`mapping -> deep` 写入

验收：
- 同一“期权”输入在三档下返回不同标题和不同交互目标。
- 同一“沉没成本”输入在三档下返回不同开场长度、分支洞察和理解深度。
- 页面切到“映射”后生成期权，工作台显示“期权 · 隐喻映射版”和“目标：把抽卡动作逐项对应到期权原理。”
- 状态摘要和知识资产深度与当前 depth 保持一致。

验证：
- `npm run typecheck`
- `npm run build`
- API 三档复测
- Playwright 生产服务页面快照验收

### Phase 6 — 质量体系

完成 T15-T17：测试用例集、Schema 评分脚本、Prompt 对比工具。

新增：
- `tests/fixtures/test-cases.json`
- `tests/eval/lib.ts`
- `tests/eval/score.ts`
- `tests/eval/compare.ts`
- `npm run eval:score`
- `npm run eval:compare`

覆盖：
- 14 条固定 case
- 全部 10 个 Pattern
- `rapid/scenario/mapping` 三档深度
- `knowledge/preference/casual` 三类意图

评分维度：
- JSON 合法率
- Pattern 准确率
- Template 准确率
- Depth 准确率
- Route 准确率
- 隐喻关键词贴合度
- Payload 完整度

验收：
- `npm run eval:score` 默认输出摘要，mock 基线总分为 1。
- `npm run eval:score -- --json` 可输出完整逐 case JSON。
- `npm run eval:compare -- <baseline.json> <candidate.json>` 可比较两个预测文件。
- compare 工具兼容 Windows UTF-8 BOM 临时文件。

验证：
- `npm run eval:score`
- `npm run eval:compare -- <temp-baseline.json> <temp-candidate.json>`
- `npm run typecheck`
- `npm run build`

---

## 2026-06-05

### 项目命名与仓库

- 中文名确定为“趣灵”。
- 英文名和仓库名确定为 `aha-flash`。
- 初始化 Git 仓库并推送到 GitHub：`https://github.com/RainsaKrie/aha-flash.git`。

### Phase 1 — Stateful Memory

完成：
- T01 LLM 语义意图分类
- T02 `update_user_state` Tool
- T03 回合制状态提炼

验收：
- “期权是什么”归类为 `knowledge`。
- “我是会计，爱钓鱼，之后用钓鱼讲金融概念”归类为 `preference`。
- 用户状态可写入背景、爱好、知识盲区和隐喻偏好。

### Phase 2 — Schema 协议重构

完成：
- T04 Schema 三层类型定义
- T05 Prompt 模板重写
- T06 组件注册表升级

结果：
- 新协议为 `pattern + template + payload`。
- V1 flat schema 仍兼容。
- 注册表支持二维查找。

验收：
- “算法复杂度是什么？用滑块让我感受一下。”返回 `parameter_explore/single_slider`。
- 页面侧栏显示 `parameter_explore/single_slider`，工作台渲染滑块组件。

### Phase 3 — 交互模式扩展

完成 T07：新增 3 种交互模式。

新增：
- `narrative_branch/branch_story`
- `classification_sort/category_buckets`
- `simulation_play/parameter_simulation`

验收：
- “沉没成本是什么意思？用一个分支故事讲。”返回 `narrative_branch/branch_story`。
- “价值投资和成长投资怎么分？让我做分类。”返回 `classification_sort/category_buckets`。
- “复利怎么滚起来的？做一个模拟推演。”返回 `simulation_play/parameter_simulation`。
- 页面点击“复利”可渲染滚雪球模拟组件。

完成 T08：既有 7 种模式各新增 1 个骨架变体。

新增：
- `probability/spin_wheel`
- `parameter_explore/dual_slider`
- `concept_memory/grid_match`
- `process_timeline/vertical_scroll`
- `comparison/overlay_fade`
- `knowledge_check/combo_chain`
- `system_builder/flow_connect`

验收：
- 七个变体输入均能通过 `/api/chat` 返回预期 template。
- 页面输入“股票和期权有什么区别？用叠加淡入对比。”可渲染 `comparison/overlay_fade`。

### 部署修复

问题：
- Vercel 部署页打开后显示“状态初始化失败”。

原因：
- 早期状态存储写入 `process.cwd()/data/states`。
- Vercel Serverless 运行时不能写项目目录。

修复：
- 本地开发继续写 `data/states`。
- Vercel demo 写 `/tmp/aha-flash/states`。
- 新增 `AHA_FLASH_STATE_DIR` 覆盖入口。

注意：
- `/tmp` 不提供长期持久化。
- 生产记忆应迁移到 Vercel KV、Postgres、Redis 或其他数据库。

### V5 Explore / Hub 统一视觉收口

- 按 frontend-design skill 的方法先确定审美方向：玩具感学习路径 + 个人图鉴册。
- Explore Hero 改为更短的产品表达“把概念玩明白。”，强化纵向学习路径和推荐起点。
- Hub 重构为同款顶栏、图鉴封面、点亮统计胶囊、最近点亮主卡和主题色回看卡片墙。
- Hub 空态与回顾弹窗统一为图鉴册语气，不再呈现 SaaS 数据面板风格。
- Explore 与 Hub 共享白底、低饱和主题色、大圆角、厚 CTA 和胶囊标签规则。
### V5 连续 Flow 分支

- 新增 `FollowUpTopic` 与 `getFlowFollowUps()`，为每个 Flow 提供下一步知识分支。
- Flow 最后一关完成后不再只回首页，改为展示“现在往哪走？”分支面板。
- 分支可直接进入后续 `/flow/[flowId]`，并将所有 mock flows 纳入静态路径生成。
- Hub 从卡片墙改为知识路径足迹，按用户走过的节点形成纵向旅程。
- 当前 follow-up 先用静态 mock 验证体验，后续可接 LLM 输出 follow-up topic spec。

### Hub 语义配色

- 将 Hub 路径节点颜色从
th-child 顺序轮换改为按知识语义映射。
- 继续复用 V5 的主蓝、行动橙、完成绿、辅助紫，不新增配色体系。
- 金融/经济记录现在稳定使用完成绿，数理/概率使用辅助紫，历史/时间线使用行动橙，技术/系统使用主蓝。

### 文档状态与 AI 链路边界同步

- 同步 `PRODUCT.md`、`TECHNICAL.md`、`README.md` 的 V5 V1 完成口径。
- 明确真实 AI 链路：Studio `/api/chat` 与 showcase Flow `/api/flow` 已打通。
- 明确 mock/静态边界：Explore 起点、follow-up 分支、非 showcase Flow、视觉资源和 Hub 本地记录。
- 修正 Hub 技术描述：当前是知识路径足迹，不再是概念卡片墙。
- 保留 `SKILL.md` 作为前端设计参考；`input.md` 在内容完成整合后删除。

### Optimization-topic teaching fallback
- Added an optimization/planning teaching fallback for dynamic Flow generation. When ConceptPlan identifies optimization_model or deterministic planning terms, repair fallback now teaches with decision variables, objective function, constraints, feasible region, and optimum instead of generic slider/card copy.
- Optimization topics now use a fixed pedagogical Pattern chain: system_builder -> parameter_explore -> simulation_play.
- Verified linear programming locally: first step builds a factory model with x/y, objective 40x+30y, labor/material constraints, and feasible region; later steps explore constraints and simulate optimum movement.

### V6 Skill-Creator style Skill Pack assets
- Added `docs/knowledge-skills/` with 8 internal Aha Skill folders, one per supported knowledge structure.
- Each skill now has a lean `SKILL.md` plus `evals/evals.json`, following the skill-creator pattern of metadata, concise instructions, and realistic test prompts.
- Added `npm run eval:skills` to verify frontmatter, Pattern recipes, teaching steps, and eval coverage stay synchronized with runtime `skill-packs.ts` and the 80-case Blueprint fixture set.

### V6 grounding stabilization and fallback quality

- Stabilized ConceptPlan `grounding_terms` with the selected Aha Skill Pack skeleton before Flow generation. Skill Pack required terms now take priority over accidental advanced or generic LLM anchors.
- Skill Pack matching now falls back from `topic + structure` to `topic` when an LLM-provided structure is too generic, so topics such as `compound interest` and `binary search algorithm` still get their causal/procedure teaching contracts.
- No-key / provider-failure fallback now uses Skill Pack terms and adds visible Blueprint step terms into fallback play copy, so fallback Flows can pass deterministic QualityGate instead of showing hollow generic mock content.
- Added `--case=` filtering to `npm run eval:flow-live` for targeted live regression runs by case id, topic, or structure.
- Verified `typecheck`, `build`, `eval:score`, `eval:blueprint`, `eval:flow-dynamic`, and `eval:skills` pass after the change.
- Live LLM rebaseline is paused because the current provider returned `Insufficient Balance`; rerun `npm run eval:flow-live -- --limit=8 --runs=3` after the API key has balance.
### V6 live rebaseline after API recharge

- Recharged the provider key and reran the full live baseline after grounding stabilization.
- Initial live run after recharge exposed one historical-change false positive: the forbidden framing `只背年份` also blocked legitimate wrong-answer / anti-pattern copy.
- Updated the historical Skill Pack forbidden framing to `年份就是全部`, preserving the shallow-history guard while allowing useful contrastive answer choices.
- Targeted history live check: `npm run eval:flow-live -- --case=history --runs=5` passed 5/5 with repair reliance 0.
- Final full live baseline: `npm run eval:flow-live -- --limit=8 --runs=3` passed 24/24 with `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, `flow_repair_rate: 0.042`, and `repair_reliance_rate: 0.042`.
- Latest live report: `output/live-flow-eval/live-flow-2026-06-19T03-03-51-560Z.json`.
### V6 zero-repair live baseline

- Added a deterministic Flow candidate unwrapping layer for LLM responses that arrive as `[{ play... }]`, `{ data: {...} }`, `{ result: {...} }`, `{ output: {...} }`, or other common wrappers instead of a direct Flow object.
- This prevents valid model content from being treated as `LLM output is not an object` and falling back to a repaired Flow.
- Targeted probability check: `npm run eval:flow-live -- --case=probability --runs=5` passed 5/5 with repair reliance 0.
- Final full live baseline: `npm run eval:flow-live -- --limit=8 --runs=3` passed 24/24 with `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, `flow_repair_rate: 0`, and `repair_reliance_rate: 0`.
- Latest live report: `output/live-flow-eval/live-flow-2026-06-19T03-19-17-050Z.json`.
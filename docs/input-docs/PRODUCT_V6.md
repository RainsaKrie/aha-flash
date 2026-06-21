# V6 Iteration Plan - Reliable AI-native Learning Engine

## 0. Why V6 Exists

V5 has proven the product loop:

`Explore free input -> LLM generates three-step Flow -> /flow/custom plays it -> follow-up branches -> Hub records progress`

But V5 still has a structural weakness: arbitrary user input can produce flows that look interactive but do not actually teach the concept well. Recent tests such as `线性规划` exposed the real issue:

- The model can identify the topic and choose plausible Pattern types.
- The UI can render a valid three-step Flow.
- But the generated steps may fail to explain the concept's essential structure.

So V6 is not about adding more Pattern types or more showcase topics. V6 is about making free generation reliable enough that users can type an arbitrary concept and get a useful learning path, or receive an honest failure/retry state instead of a polished but shallow component.

## 1. V6 Product Goal

Upgrade 趣灵 from "can generate interactive UI" to "can reliably teach an arbitrary concept through an auditable knowledge structure".

Core promise:

> User enters a concept. 趣灵 first understands the knowledge structure, then builds a teaching blueprint, then renders interactive steps. If the blueprint is weak, the product should not pretend it succeeded.


V6 should combine two goals:

1. Reliability: arbitrary input must be decomposed into a valid knowledge structure before UI generation.
2. Perceptibility: users should feel within 30 seconds that this is generated from their input, not a static demo.

Final positioning:

> V6: Verifiable free-generation knowledge paths.

This answers both product questions:

- Can the system teach an arbitrary concept reliably?
- Can users immediately perceive that the path is generated live from their own input?


## 2. Main Architecture Change

Current V5 chain:

```text
Topic -> ConceptPlan -> KnowledgeFlow -> UISchema
```

V6 target chain:

```text
Topic
  -> ConceptPlan
  -> KnowledgeBlueprint
  -> TeachingFlow
  -> UISchema
  -> QualityGate
  -> User-facing Flow or Honest Failure State
```

### 2.1 ConceptPlan

ConceptPlan remains the first grounding layer. It answers:

- What is the user actually asking about?
- What domain does it belong to?
- What are the concrete grounding terms?
- Which Pattern families are suitable or unsuitable?

### 2.2 KnowledgeBlueprint

New V6 layer. Blueprint is the teaching contract. It decides how this kind of knowledge should be taught before any UI is generated.

A Blueprint should include:

```ts
interface KnowledgeBlueprint {
  topic: string;
  structure_type: KnowledgeStructureType;
  learning_objective: string;
  prerequisite_terms: string[];
  core_terms: string[];
  misconceptions: string[];
  teaching_sequence: BlueprintStep[];
  pattern_strategy: PatternType[];
  failure_risks: string[];
  confidence: number;
}

interface BlueprintStep {
  goal: string;
  must_explain: string[];
  user_action: "choose" | "sort" | "connect" | "adjust" | "simulate" | "compare" | "recall";
  recommended_pattern: PatternType;
  success_criteria: string;
}
```

### 2.3 TeachingFlow

TeachingFlow is not just three UI cards. It must prove that each BlueprintStep is satisfied.

Each generated step should carry trace fields in dev/eval mode:

```ts
interface TeachingTrace {
  blueprint_step_goal: string;
  covered_terms: string[];
  intended_user_action: string;
  success_criteria: string;
}
```


## 2.4 Implementation Status - 2026-06-17

Current V6 reliability work is partially implemented and verified:

- Added `npm run eval:flow-live` for real LLM sampling. It reports `llm_success_rate`, `clean_schema_rate`, `schema_repair_rate`, `flow_repair_rate`, and `repair_reliance_rate`, with optional `--raw` reports for diagnosis.
- Knowledge structure inference now uses deterministic topic hints before trusting LLM-provided `knowledge_structure`, reducing misclassification for topics such as compound interest, waste classification, and binary search.
- `KnowledgeBlueprint.pattern_strategy` is authoritative. LLM-provided `avoid_patterns` can no longer remove core Blueprint patterns such as `parameter_explore` from probabilistic reasoning.
- Dynamic Flow normalization now enforces the exact Blueprint Pattern for each step instead of accepting any Pattern from the allowed set.
- Flow payload prompts include a compact field contract for all 10 Pattern defaults, reducing malformed schema output.
- Normalization removes unreplaced placeholders such as `{value}`, `{result}`, `{output1}`, `{topic}`, and generic English placeholders before QualityGate scoring.
- `repair_actions` now tags normalization and repair events as `field_fix`, `pattern_normalize`, `placeholder_clean`, `schema_repair`, `schema_fallback`, or `flow_repair`; `eval:flow-live` reports per-tag counts and rates.
- Dynamic Flow generation has a 45s LLM timeout, deterministic `visual_asset` / `next_concepts` normalization, exact Blueprint Pattern-order instructions, and a no-brace natural-language contract for slider explanations.
- Previous pre-Skill-Contract full live baseline passed 24/24 with `repair_reliance_rate: 0`. Latest post-Skill-Contract full live baseline on 2026-06-19 passed 24/24 with `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, `flow_repair_rate: 0.083`, and `repair_reliance_rate: 0.083`; remaining repair reliance is 2 flow-level repairs in causal/compound-interest.
- Added the first internal Aha Skill Pack skeleton layer in `src/lib/content/skill-packs.ts`, covering 8 representative knowledge families. `KnowledgeBlueprint` now carries `skill_skeleton_id`, required core terms, required teaching steps, and forbidden framings, and QualityGate checks these deterministically.
- Expanded `eval:blueprint` to the Stage C target: 80 fixed cases, 10 topics per supported knowledge structure, with `overall: 1`. The expansion keeps existing Chinese hints and adds broader English topic coverage such as diet problem, TCP handshake, hypothesis testing, Renaissance, SQL vs NoSQL, HTTP status codes, greenhouse effect, and dynamic programming.
- Added natural-language anchor synonyms for comparison and causal Skill Packs, so QualityGate recognizes user-facing teaching phrases such as signal, indicator, transmission mechanism, result, effect, and final value instead of overfitting to internal terms like dimension/outcome. Latest full 8x3 live baseline remains below the V6 repair threshold with `repair_reliance_rate: 0.083`.

Historical remaining V6 work (resolved by later milestones):

- Keep using `eval:flow-live -- --limit=8 --runs=3` as the release smoke test for future prompt or Skill Pack changes.
- Keep `repair_reliance_rate <= 0.2` as the release smoke-test threshold while expanding Skill Pack skeleton coverage; current post-Skill-Contract 8x3 baseline is `0.083`, with repairs concentrated in causal/compound-interest flow repair.
- Improve honest failure UX with retry/change-topic/showcase escape paths.
- Runtime Skill Pack prompt contracts are now injected into first-pass Flow generation and repair prompts; keep `eval:skills` in the release check so this contract cannot drift from `docs/knowledge-skills/` or `src/lib/content/skill-packs.ts`.
## 2.5 Next Direction - Aha Skill Packs

V6 should not rely on one large universal prompt to teach every concept. The next reliability direction is to split the generation brain into reusable Aha Skill Packs.

A Skill Pack is not prebuilt content. It is a compact teaching capability for one knowledge structure or one interaction pattern.

Suggested shape:

```text
skills/
  optimization-model/
    SKILL.md
    examples.json
    quality-rules.json
    pattern-recipe.json

  system-process/
    SKILL.md
    examples.json
    quality-rules.json
    pattern-recipe.json
```

Runtime chain:

```text
Topic
  -> ConceptPlan
  -> choose Knowledge Skill Pack
  -> load only relevant teaching recipe and Pattern recipe
  -> Flow generation
  -> skill-specific deterministic QualityGate
  -> Render or honest failure
```

Why this should improve success rate:

1. It lowers task freedom. The model no longer decides everything from scratch; it works inside a known teaching frame.
2. It reduces prompt noise. Linear programming should load the optimization skill, not timeline/comparison/classification guidance.
3. It enables skill-level eval. V6 can measure whether `optimization-model` is weak instead of only saying the whole system is unstable.
4. It keeps the product extensible. Adding a new knowledge family means adding or tuning a Skill Pack, not hand-authoring hundreds of flows.

Important boundary:

- Skill Packs improve generation stability, not factual truth by themselves.
- QualityGate remains required after generation.
- Grounding terms and examples should be included per skill, but user-facing content must still pass visible teaching checks.
- The first implementation should treat Skill Packs as internal prompt/reference modules, not as user-installable external skills.

## 2.6 Accuracy Scope - Knowledge Skeleton First

V6 should include factual accuracy work, but only as a minimum viable grounding layer. It should not attempt to build a full Wiki, search engine, citation system, or large knowledge base in this iteration.

V6 accuracy goal:

> Do not let a generated Flow look polished if it fails to teach the concept's essential structure.

The immediate solution is a Skill Pack knowledge skeleton.

Each Knowledge Skill Pack should carry a compact skeleton:

```ts
interface KnowledgeSkeleton {
  structure_type: KnowledgeStructureType;
  required_core_terms: string[];
  required_teaching_steps: string[];
  common_misconceptions: string[];
  forbidden_framings: string[];
  suitable_patterns: PatternType[];
  unsuitable_patterns: PatternType[];
  canonical_examples: string[];
}
```

Examples:

```text
linear programming
required_core_terms: decision variable, objective function, constraint, feasible region, optimum
required_teaching_steps: define variables -> set objective -> apply constraints -> search feasible region -> compare optimum
forbidden_framings: probability draw, generic parameter slider, pure quiz without model structure

DNS resolution
required_core_terms: browser, recursive resolver, root server, authoritative server, cache, IP address
required_teaching_steps: request starts -> resolver asks hierarchy -> authoritative answer returns -> cache shortens next lookup
forbidden_framings: one-step lookup, generic pipeline without actors, treating DNS as a database only
```

V6 QualityGate should use this skeleton deterministically:

- Required core terms must appear in visible user-facing content or trace-backed step content.
- Required teaching steps must be covered by the three Flow steps.
- Forbidden framings and unsuitable Patterns should fail the draft or trigger regeneration.
- Pattern choice must match the skeleton's suitable pattern set unless an explicit user request overrides it safely.

Out of scope for V6:

- Full internal Wiki.
- Real-time web search as a primary generation dependency.
- Citation-grade fact verification.
- User-generated knowledge publishing and moderation.
- Cross-topic long-term knowledge graph storage.

Future path:

1. V6: Skill Pack knowledge skeletons and deterministic accuracy checks.
2. V6.5: Optional retrieval grounding for low-confidence or unknown topics.
3. V7: Curated internal Wiki / Skill Memory that stores high-quality generated Blueprints and validated examples.

This keeps V6 focused on the current failure mode: the model often knows the topic name but teaches it too generically. The skeleton layer forces the system to cover the essential structure before the UI is allowed to look successful.
## 2.7 Current Live Baseline and Repair Policy

The latest V6 pass tightened the `parameter_explore/single_slider` prompt so `explanation_template` is a fixed natural sentence, not a `{value}` template. This removed the last observed `placeholder_clean` repair in the 8-structure live sample.

Latest live result:

```text
command: npm run eval:flow-live -- --limit=8 --runs=3 --threshold=0
report: output/live-flow-eval/live-flow-2026-06-19T01-53-40-581Z.json
24/24 runs passed
8/8 structures covered
overall: 1
llm_success_rate: 1
clean_schema_rate: 1
schema_repair_rate: 0
schema_fallback_rate: 0
flow_repair_rate: 0.083
repair_reliance_rate: 0.083
repair_action_counts: {"flow_repair":2}
```

Interpretation:

- The current live sample can generate usable three-step flows without mock fallback or schema repair; the remaining repair reliance is limited to 2 flow-level repairs in causal/compound-interest.
- Repair remains necessary as a safety layer because LLM output is probabilistic, but it should not be part of the happy path.
- The practical release threshold stays `repair_reliance_rate <= 0.2`; the current baseline is better than the threshold, not proof that repair can be removed.

Repair reduction strategy remains:

1. Do not tune the repair layer first. Tune Prompt, Blueprint constraints, and Skill Pack contracts first.
2. Use `repair_actions` (`field_fix`, `pattern_normalize`, `placeholder_clean`, `schema_repair`, `schema_fallback`, `flow_repair`) to locate the highest-frequency failure mode before changing prompts.
3. Improve one high-frequency repair type per iteration, then rerun `eval:flow-live`.
4. Report repair frequency by type, not only as one aggregate number.

This keeps the team from saying "repair is high" without knowing what is actually broken.

## 3. Knowledge Structure Taxonomy

V6 should first cover 6-8 high-frequency structure types, not hundreds of prebuilt concepts.

### 3.1 optimization_model

For: 线性规划, 整数规划, 资源分配, 最优化, 投资组合优化.

Teaching blueprint:

1. Define decision variables.
2. Write objective function.
3. Add constraints.
4. Understand feasible region.
5. Find or simulate optimum.

Good Pattern chain:

`system_builder -> parameter_explore -> simulation_play`

Reject:

- probability/gacha metaphor unless the topic itself involves uncertainty.
- generic sliders that do not explain variables, objective, constraints, and feasible region.

### 3.2 system_process

For: DNS解析, HTTP请求, Kubernetes调度, 编译器流程, Agent执行循环.

Teaching blueprint:

1. Identify actors/modules.
2. Connect information flow.
3. Show feedback or failure path.

Good Pattern chain:

`system_builder -> process_timeline -> knowledge_check`

### 3.3 probabilistic_reasoning

For: 贝叶斯定理, 概率分布, 期望值, 风险决策, 保险定价.

Teaching blueprint:

1. Start from prior/uncertainty.
2. Introduce evidence or sample.
3. Update belief or expected value.
4. Make a decision.

Good Pattern chain:

`probability -> parameter_explore -> knowledge_check`

### 3.4 historical_change

For: 工业革命, 农业革命, 冷战, 城市化, 公司发展史.

Teaching blueprint:

1. Initial condition.
2. Trigger.
3. Acceleration.
4. Turning point.
5. Consequence.

Good Pattern chain:

`process_timeline -> classification_sort -> narrative_branch`

### 3.5 comparison_frame

For: 通胀 vs 通缩, TCP vs UDP, 股票 vs 期权, 资本主义 vs 社会主义.

Teaching blueprint:

1. Shared problem.
2. Compare 3-5 stable dimensions.
3. Show boundary cases.
4. Test misconception.

Good Pattern chain:

`comparison -> classification_sort -> knowledge_check`

### 3.6 classification_rule

For: 垃圾分类, 法律责任类型, 生物分类, 机器学习任务类型.

Teaching blueprint:

1. Define categories by rule, not label.
2. Sort examples.
3. Explain boundary/confusing cases.

Good Pattern chain:

`classification_sort -> knowledge_check -> concept_memory`

### 3.7 causal_mechanism

For: 供需关系, 复利, 网络效应, 激励机制, 多巴胺.

Teaching blueprint:

1. Identify cause/input.
2. Show mechanism.
3. Show result.
4. Change one factor and observe outcome.

Good Pattern chain:

`system_builder -> parameter_explore -> simulation_play`

### 3.8 procedure_algorithm

For: 二分查找, 梯度下降, 单纯形法, A*算法, 排序算法.

Teaching blueprint:

1. State problem.
2. Show repeated rule.
3. Step through process.
4. Test edge case.

Good Pattern chain:

`process_timeline -> simulation_play -> knowledge_check`

## 4. Quality Gate

V6 must introduce a quality gate after generation. A valid Flow is not enough. It must teach.

### 4.1 Gate Checks

A generated Flow can be shown only if:

- `structure_type` is recognized with enough confidence.
- Each BlueprintStep has a corresponding Flow step.
- Each Flow step covers the required core terms.
- User action matches the teaching goal.
- Pattern chain does not conflict with structure type.
- No generic placeholder terms appear.
- The first step teaches the entry point, not a random parameter.
- The final step produces a useful insight, not just a completion message.

### 4.2 Failure Behavior

If quality gate fails:

Do not silently show generic mock.

Show an honest state:

> 我还没把这个概念拆清楚。可以换一种拆法，或者告诉我你更关心定义、应用还是例子。

Actions:

- Retry with stricter blueprint.
- Ask one clarifying question.
- Offer structure choices: "看流程 / 看对比 / 看例子 / 看公式".

## 5. Eval Plan

V6 quality cannot be validated by UI screenshots alone. It needs blueprint-level eval.

### 5.1 Dataset

Minimum fixed set:

- 8 structure types.
- 10 topics per type.
- 80 fixed topics total.

Initial examples:

optimization_model:
- 线性规划
- 整数规划
- 投资组合优化
- 资源分配
- 运输问题
- 最短路径
- 排班问题
- 生产计划
- 拉格朗日乘子
- 梯度下降

system_process:
- DNS解析
- HTTP请求
- Kubernetes调度
- Agent执行循环
- 编译器
- 垃圾回收
- 推荐系统
- 支付流程
- OAuth登录
- 消息队列

probabilistic_reasoning:
- 贝叶斯定理
- 正态分布
- 期望值
- 条件概率
- 大数定律
- 蒙特卡洛方法
- 风险定价
- A/B测试
- 抽样误差
- 马尔可夫链

### 5.2 Metrics

- structure_accuracy: correct KnowledgeStructureType.
- blueprint_completeness: required teaching elements present.
- pattern_fit: Pattern chain matches structure type.
- grounding_coverage: core terms appear in actual user-facing steps.
- teaching_sequence: steps are in pedagogically valid order.
- copy_specificity: no generic copy pretending to teach.
- schema_validity: all UISchema payloads pass validation.
- honest_failure: low-quality generations are blocked instead of shown.

Target for V6 milestone:

- 80 fixed cases, overall >= 0.85.
- optimization_model, system_process, probabilistic_reasoning each >= 0.9.
- Manual 20-case review: at least 15/20 feel genuinely useful.

## 6. UX Changes

### 6.1 Generation Transparency

Before entering the Flow, optionally show a lightweight "拆解路径":

- 我会先用什么结构理解它.
- 三关分别练什么.
- 用户可以 regenerate or choose another structure.

This should be compact and not feel like a backend debug panel.

### 6.2 Dev/Eval Inspector

In dev mode, expose:

- source: llm/mock.
- ConceptPlan.
- KnowledgeBlueprint.
- Pattern chain.
- QualityGate result.
- validation_error.

This is essential for debugging user reports like "this does not teach the topic".

### 6.3 User-facing Failure State

Replace fake-success generic fallback with an honest retry state when quality is too low.

The product should prefer:

- "我还没拆清楚，换个拆法再试一次"

over:

- rendering a polished but shallow Flow.

## 7. Implementation Phases

### Phase 1 - Blueprint Core

- Add `KnowledgeBlueprint` types.
- Add blueprint generator prompt.
- Add blueprint normalization and validation.
- Add hardcoded blueprint templates for the first 8 structure types.
- Make dynamic Flow generation consume Blueprint instead of only ConceptPlan.

Acceptance:

- `线性规划` always starts from variables/objective/constraints/feasible region.
- `DNS解析` always starts from actors/modules and request flow.
- `贝叶斯定理` always starts from prior/evidence/posterior.

### Phase 2 - Quality Gate

- Implement `evaluateBlueprint()`.
- Implement `evaluateFlowAgainstBlueprint()`.
- Add honest failure state to `/explore` and `/flow/custom`.
- Expose dev inspector fields from `/api/flow?debug=1`.

Acceptance:

- Bad generations are blocked or retried.
- Generic placeholder copy cannot reach the user-facing Flow.

### Phase 3 - Eval Expansion

- Add 80-case `tests/fixtures/blueprint-cases.json`.
- Add `npm run eval:blueprint`.
- Add `npm run eval:teaching-flow`.
- Extend dynamic eval beyond mock fallback.

Acceptance:

- Report structure-level and teaching-level scores.
- At least 0.85 overall before V6 can be considered stable.

### Phase 4 - UX Refinement

- Add compact pre-flow "拆解路径" preview.
- Add user retry/choose-structure controls.

## 8. Non-goals

V6 should not prioritize:

- New Pattern count.
- More static showcase topics.
- Community publishing.
- Accounts and sync.
- Heavy factual retrieval/RAG.
- Rewriting all UI components.

V6 is about reliability and teaching quality, not feature surface area.

## 9. Previously Discussed V6-adjacent Ideas Found

No explicit V6 document was found in the repository. Related ideas already present in current docs or conversation context:

- Free generation should be the real product promise, not the five showcase topics.
- Static fallback should not pretend to be AI success.
- AI-native value comes from content production and knowledge traversal, not from a fixed course catalog.
- Flow completion should lead to follow-up branches instead of returning users to the homepage.
- Debug visibility is necessary: source, plan, validation error, pattern chain.
- UI style should remain ToC and playful, but reliability now has higher priority than visual expansion.

## 10. Recommended Next Step

Start with Phase 1 and Phase 2 together for three representative topics:

- 线性规划: optimization_model.
- DNS解析: system_process.
- 贝叶斯定理: probabilistic_reasoning.

Only after these three become consistently useful should V6 expand to the full 80-case eval set.

## 11. AI-native Perception Layer

This section comes from the earlier V6 discussion: ??'s AI-native value exists in the generation pipeline, but the user must also feel it on the surface. Otherwise the product can be mistaken for static handcrafted courseware.

### 11.1 Why This Matters

Current risk:

- The backend can generate dynamic Flow.
- The frontend can render interactive components.
- But the first impression may still look like a curated demo page.

V6 must make the generation process visible enough that a first-time user understands:

> I typed my own concept, and ?? built this learning path for me right now.

### 11.2 Three Perceptible Signals

#### Signal 1: Free Input Is the Primary Action

The homepage should continue to prioritize:

`I want to understand ____`

Showcase topics are examples, not the product boundary. They should be framed as:

- Try these starting points.
- Not: these are the only available lessons.

Acceptance:

- A first-time tester naturally tries their own concept before clicking static cards.
- If a topic is not in showcase data, the product still feels like the main path works.

#### Signal 2: Generation Process Is Visible but Not Noisy

Generation states should map to the real pipeline, not fake loading copy.

Suggested user-facing states:

1. Recognizing knowledge structure.
2. Building a teaching blueprint.
3. Choosing interaction patterns.
4. Checking whether the path teaches the concept.

These should correspond to actual backend stages:

`ConceptPlan -> KnowledgeBlueprint -> TeachingFlow -> QualityGate`

Acceptance:

- The user can tell the system is assembling a path, not fetching a static page.
- The loading copy is short and product-like, not a debug log.
- Implemented checkpoint: after generation succeeds, Explore shows the detected structure, core terms, and three planned steps; the user explicitly enters the Flow instead of being auto-routed.
- Implemented server-driven progress: Explore consumes SSE stage events from the actual generation pipeline instead of advancing those states with a local timer.

#### Signal 3: Completion Leads to Growth

A Flow should not end by returning the user to the homepage. Completion should reveal 2-3 next branches based on the just-learned concept.

V6 follow-ups now come from Blueprint relationships first, with generic fallback copy only as a safety net.

Example after learning linear programming:

- Try integer programming.
- Compare linear programming with gradient descent.
- See how simplex method walks along feasible-region vertices.

Acceptance:

- The user feels the knowledge space continues from the current node.
- Only changing domains should require going back to the homepage.

### 11.3 Priority Relationship

Do not implement perception without reliability.

If the generation is visibly live but pedagogically weak, the product feels worse. V6 should first make Blueprint and QualityGate trustworthy, then expose the generation process as a product experience.

Recommended order:

1. Build Blueprint and QualityGate.
2. Bind loading states to real backend stages.
3. Refine homepage copy to make free generation the obvious main action.

### 11.4 30-second Test

Give the product to someone who has not seen the project. Ask them to type a concept that is not in showcase data.

Pass condition:

- Within 30 seconds, they can say: "This was generated from what I typed."
- After completing the Flow, they can also say what they learned about the concept.

The first sentence validates AI-native perception. The second validates teaching quality. V6 needs both.

## 12. V6 Planning Corrections and Open Decisions

These additions refine the V6 plan. They do not change the direction, but close several important gaps before implementation.

### 12.1 QualityGate Must Be Deterministic First

QualityGate should not be an LLM self-evaluation layer. Using one unreliable generation call to judge another unreliable generation call would make the system harder to trust.

P0 rule:

> QualityGate is a deterministic rules engine by default. LLM judgment is optional and only runs after deterministic checks pass.

Deterministic checks:

| Check | Method |
|---|---|
| `grounding_terms` appear in actual steps | string/regex match over user-facing payload text |
| teaching step count meets Blueprint minimum | numeric comparison |
| Flow patterns are allowed by Blueprint | set containment |
| avoided patterns are not used | set exclusion |
| each step payload passes Schema validation | existing Zod/schema validator |
| first step matches Blueprint entry goal | compare step trace goal/action with `BlueprintStep` |
| generic placeholders are absent | banned phrase list |

Optional LLM check:

- Only after all deterministic checks pass.
- Used for fuzzy judgment such as whether the explanation is logically coherent.
- Its result should be a warning or secondary score, not the only pass/fail gate.

### 12.2 Honest Failure Needs an Escape Path

A failure state cannot be a dead end.

Required retry ladder:

1. First failure: auto retry once with stricter Blueprint constraints.
2. Second failure: show user-facing state with actions:
   - Try another decomposition.
   - Change the concept.
   - Choose a structure manually.
3. Third failure or repeated low confidence: degrade to curated examples.

Fallback copy direction:

> This concept is not ready for a reliable interactive path yet. Try a clearer angle, or start from one of these stable examples.

The product should not trap users in endless retry loops.

### 12.3 Blueprint Is a Progressive Extension, Not a Rewrite

V6 should not throw away the V5 Flow Steps pipeline.

Recommended relationship:

```text
V5:
Topic spec -> Flow Steps -> Schema validation -> Render

V6:
Concept -> KnowledgeBlueprint -> enhanced topic spec -> existing Flow Steps -> Schema validation -> QualityGate -> Render
```

KnowledgeBlueprint should be treated as an enriched topic spec. The downstream Flow generation, Schema repair, component registry, and Eval infrastructure should be reused wherever possible.

### 12.4 Add `unclassified` Structure Type

The 8 planned knowledge structures will not cover every concept.

Add:

```ts
type KnowledgeStructureType =
  | "optimization_model"
  | "system_process"
  | "probabilistic_reasoning"
  | "historical_change"
  | "comparison_frame"
  | "classification_rule"
  | "causal_mechanism"
  | "procedure_algorithm"
  | "unclassified";
```

`unclassified` is not a bug. It is an honest uncertainty state.

Examples that may initially fall here:

- 量子纠缠
- 存在主义
- 中国书法
- 审美判断类概念
- Very broad social concepts

Behavior:

- Do not force these into `comparison_frame` or `system_process`.
- Ask a clarifying question or suggest a supported structure.
- If confidence remains low, show honest failure with curated example fallback.

### 12.5 Free Input Needs Cold-start Examples

Free input is the main action, but a blank input box creates cold-start anxiety.

Add a lightweight rotating hint under the input:

> Try: 线性规划 / DNS 解析 / 贝叶斯定理 / 复利效应 ...

Rules:

- Examples should come from supported Blueprint structures.
- They should feel like invitations, not static curriculum.
- Showcase cards can remain below as stable examples, but should not compete with the input.

### 12.6 Eval Should Roll Out in Two Stages

Do not start with 80 cases immediately.

Stage A: 8 handcrafted cases

- 1 topic per structure type.
- Manually define expected `structure_type`, core terms, minimum steps, and recommended pattern strategy.
- Goal: verify Blueprint classification and basic QualityGate behavior.

Stage B: 40 cases

- 5 topics per structure type.
- Goal: cover variation and edge cases.

Stage C: 80 cases

- 10 topics per structure type.
- Goal: regression confidence before calling V6 stable.

The 80-case target remains correct, but it is not the first implementation step.

### 12.7 Updated V6 Priority Table

| Item | Priority | Notes |
|---|---|---|
| Deterministic QualityGate rules engine | P0 | No LLM self-eval as primary gate |
| Failure-state escape path | P0 | Retry -> choose structure/change topic -> curated fallback |
| Blueprint as upstream extension of Flow Steps | P1 | Reuse V5 downstream pipeline |
| Add `unclassified` structure type | P1 | Prevent forced bad classification |
| Free-input rotating examples | P1 | Avoid cold-start regression |
| Eval staged rollout: 8 -> 40 -> 80 cases | P1 | Start small, then expand |

### 12.8 Revised First Implementation Slice

First V6 slice should include:

1. `KnowledgeBlueprint` type and 8+1 structure taxonomy.
2. Deterministic QualityGate with the P0 checks above.
3. 8 handcrafted blueprint eval cases.
4. Honest failure state with retry and curated fallback.
5. Free-input example hints.
6. Integration path that reuses existing Flow Steps and Schema validation.

Do not begin with broad UI expansion or 80 eval cases.

## 13. Implementation Status - 2026-06-16

Implemented V6 reliability slices:

- `KnowledgeBlueprint` and the 8+1 structure taxonomy are implemented in `src/lib/content/knowledge-blueprint.ts`.
- Deterministic `QualityGate` validates structure, pattern fit, schema validity, placeholder absence, visible term coverage, and per-step Blueprint alignment.
- Honest failure states are returned instead of silently showing shallow mock content when generation is unavailable, unclassified, or below gate quality.
- Explore failure UI offers retry, topic change, curated examples, and structure-choice retry paths.
- `preferredStructure` now flows from `/explore` to `/api/flow` to ConceptPlan, Blueprint, fallback generation, and dynamic Flow normalization.
- `TeachingTrace` is attached to generated plays for dev/eval audit: Blueprint goal, covered terms, intended user action, success criteria, and recommended Pattern.
- Eval coverage now includes `eval:blueprint` with 80 Stage C structure cases: 10 topics for each of the 8 supported knowledge structures. It also includes `eval:flow-dynamic` with 9 no-key dynamic fallback / honest-failure cases.
- Flow completion branches now prefer Blueprint-derived follow-ups. For example, optimization topics extend toward 单纯形法、对偶问题、敏感性分析 instead of generic mechanism/boundary/application branches.
- Explore now shows a compact pre-flow decomposition preview from the production-safe Flow preview payload: knowledge structure, core terms, and the three-step interaction path appear before entering the generated Flow.
- Internal Aha Skill Pack skeletons now cover 8 representative families and feed deterministic Blueprint/QualityGate checks for required terms, forbidden framings, and unsuitable Patterns. The Stage C expansion also narrowed the `system_process` HTTP hint to `http request`, so `HTTP status codes` correctly remains a `classification_rule` topic.

Historical remaining V6 work (resolved by later milestones):

- Full 8-structure `eval:flow-live -- --limit=8 --runs=3` baseline was rerun after runtime Skill Contract injection: 24/24 LLM runs passed with `repair_reliance_rate: 0.083`. Future work should keep the rate <= 0.2 and reduce the remaining causal/compound-interest flow repair cases.

## 14. Skill-Creator Standardization

V6 Skill Packs should now be maintained with the skill-creator loop: write a compact skill, attach realistic eval prompts, run deterministic checks, review failures, and only then tune Prompt or Blueprint constraints.

Implemented asset layer:

- `docs/knowledge-skills/aha-optimization-model`
- `docs/knowledge-skills/aha-system-process`
- `docs/knowledge-skills/aha-probabilistic-reasoning`
- `docs/knowledge-skills/aha-historical-change`
- `docs/knowledge-skills/aha-comparison-frame`
- `docs/knowledge-skills/aha-classification-rule`
- `docs/knowledge-skills/aha-causal-mechanism`
- `docs/knowledge-skills/aha-procedure-algorithm`

Each folder contains only `SKILL.md` and `evals/evals.json`, keeping the skill lean and progressively disclosed. `npm run eval:skills` checks that these files do not drift from `src/lib/content/skill-packs.ts`, the runtime prompt contract, or the 80-case Blueprint eval set.

Runtime Flow generation now injects the selected Skill Pack contract into both the first-pass prompt and the repair prompt. This makes Skill Packs operational: they are not only documentation assets, but the concise teaching contract seen by the LLM before it writes UI schemas.

This is the intended V6 working mode going forward: do not patch random fallback content for one failed topic; update the relevant Skill Pack contract, rerun skill/blueprint/live evals, and keep repair reliance under the release threshold.

## 15. V6 Grounding Stabilization Status - 2026-06-19

Implemented after the first Skill Pack runtime injection baseline:

- ConceptPlan grounding terms are now stabilized by the selected Aha Skill Pack before Flow generation.
- The stabilizer prioritizes Skill Pack required core terms, then topic-aware fallback terms, then LLM terms. This prevents a topic such as `linear programming` from drifting into over-advanced anchors like `simplex method` or `dual problem` when the current three-step lesson only teaches the modeling foundation.
- Skill Pack lookup now falls back to topic-only matching when the model supplies a generic or mismatched structure label.
- Fallback Flows now expose Blueprint step terms in user-facing play copy, so no-key/provider-failure fallback is still auditable by deterministic QualityGate.
- Local no-key checks pass for `compound interest` and `binary search algorithm` fallback Flows.

Validation completed:

- `npm run typecheck`: pass
- `npm run build`: pass
- `npm run eval:score`: overall 1
- `npm run eval:blueprint`: 80/80 pass, overall 1
- `npm run eval:flow-dynamic`: 9/9 pass, overall 1
- `npm run eval:skills`: 8/8 pass, overall 1
- Targeted live before provider balance exhaustion: `optimization` 5/5 pass with repair reliance 0; `classification` 3/3 pass with repair reliance 0.

Blocked:

- Full live rebaseline is currently blocked by provider `Insufficient Balance`. After recharge or key replacement, rerun `npm run eval:flow-live -- --limit=8 --runs=3` and update this section with the new repair reliance rate.
## 16. V6 Live Baseline After API Recharge - 2026-06-19

After the provider key was recharged, the full live baseline was rerun.

Results:

- Targeted history check: `npm run eval:flow-live -- --case=history --runs=5` passed 5/5, repair reliance 0.
- Full live baseline: `npm run eval:flow-live -- --limit=8 --runs=3` passed 24/24.
- `overall`: 1
- `llm_success_rate`: 1
- `schema_repair_rate`: 0
- `flow_repair_rate`: 0.042
- `repair_reliance_rate`: 0.042

Follow-up fix from the live run:

- Historical-change forbidden framing changed from `只背年份` to `年份就是全部`.
- Reason: `只背年份` can appear as a useful wrong answer or anti-pattern in a learning component, while `年份就是全部` better represents the harmful shallow-history framing that QualityGate should block.

Current V6 reliability status:

- The 8-structure live baseline is green.
- Repair reliance is below the 0.2 target and improved from the previous 0.083 baseline to 0.042.
- Next reliability work should focus on the remaining occasional probability/Bayes flow repair, not broad prompt rewrites.
## 17. V6 Zero-Repair Live Baseline - 2026-06-19

The remaining occasional probability/Bayes repair was traced to response shape, not teaching quality: one run returned content that parsed as a non-direct Flow object, which triggered `LLM output is not an object` and fell back to a repaired Flow.

Implemented fix:

- Added deterministic Flow candidate unwrapping for common LLM response shapes: top-level play arrays, `flow`, `knowledge_flow`, `knowledgeFlow`, `result`, `data`, and `output` wrappers.
- The fix does not relax QualityGate. It only recovers valid Flow-shaped content before normalization.

Validation:

- `npm run eval:flow-live -- --case=probability --runs=5`: 5/5 pass, repair reliance 0.
- `npm run eval:flow-live -- --limit=8 --runs=3`: 24/24 pass.
- `overall`: 1
- `llm_success_rate`: 1
- `schema_repair_rate`: 0
- `flow_repair_rate`: 0
- `repair_reliance_rate`: 0
- `npm run typecheck`, `npm run build`, `npm run eval:score`, `npm run eval:flow-dynamic`, and `npm run eval:skills` all pass.

V6 reliability status is now green at the current 8-structure live baseline. Next work should move from reliability plumbing to user-facing generation visibility and experience polish.
## 18. V6 Engineering Milestone - 2026-06-20

V6 is complete for its defined engineering scope: deterministic Blueprint/QualityGate, eight Skill Pack families, 80 fixed Blueprint cases, honest failure escape paths, Blueprint-derived continuation branches, server-driven generation visibility, and live repair telemetry.

Release baseline:
- `npm run eval:blueprint`: 80/80, `overall: 1`.
- `npm run eval:flow-live -- --limit=8 --runs=3`: 24/24 real LLM runs, `overall: 1`, `llm_success_rate: 1`, `schema_repair_rate: 0`, `flow_repair_rate: 0`, `repair_reliance_rate: 0`.
- Live evaluation records the required visible lifecycle: `concept_plan -> blueprint -> flow -> quality_gate`.

The remaining work is not unfinished V6 plumbing: the manual 30-second first-time-user test is product validation, while retrieval grounding and an internal Wiki / Skill Memory move to V6.5 and V7 respectively.
## 19. V6 Final Project Audit - 2026-06-21

V6 is complete for its defined engineering scope and has been revalidated after a project-wide reliability audit.

- Shared generation reliability: the three previous retry implementations now use one `retry-generate-text` utility with the same transient-error policy, backoff, and 45-second timeout.
- Public Flow protection: `POST /api/flow` has a per-client 8 requests / 10 minutes in-memory guard, `429` retry hints, malformed-body handling, control-character cleanup, and a visible 80-character topic boundary.
- Browser failure behavior: draft persistence is acknowledged before navigation, so storage permission or quota failures remain an actionable Explore/branch error instead of becoming an empty custom Flow page.
- React cleanup: Custom Flow derives its draft from the URL without effect-driven synchronous state, and Flow completion uses a stable callback dependency.
- Prompt repair reduction: comparison dimensions now explicitly require `label` and prohibit `name/title/dimension`; a strict 5-run comparison sample and a full strict 24-run release smoke both recorded zero repair actions.

Final verification: lint and typecheck passed; production build passed; Schema 32/32, local Flow 15/15, Blueprint 80/80, dynamic fallback 9/9, Skill Packs 8/8, showcase 10/10 Pattern coverage, and strict live Flow 24/24 all passed.

The remaining work is outside V6: V6.5 optional retrieval grounding for low-confidence topics, and V7 internal Wiki / Skill Memory. The manual 30-second first-time-user test remains product validation, not unfinished reliability plumbing.

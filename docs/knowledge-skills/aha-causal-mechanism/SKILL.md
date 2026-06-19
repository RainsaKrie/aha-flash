---
name: aha-causal-mechanism
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for causal_mechanism topics such as compound interest, greenhouse effect, network effects, supply and demand, habit formation. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: Causal Mechanism

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `causal_mechanism` topics. Teach concepts where causes, mechanisms, feedback loops, interventions, and outcomes explain why something changes.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- compound interest
- supply demand
- network effect
- incentive mechanism
- 复利
- 供需
- 网络效应
- 激励机制
- inflation spiral
- greenhouse effect
- habit formation
- viral spread
- price elasticity
- dopamine reward loop

## Teaching Contract

Structure type: `causal_mechanism`

Required core terms or acceptable anchors:

- input
- mechanism
- feedback
- outcome
- intervention
- 输入
- 机制
- 反馈
- 结果
- 干预点
- cause
- factor
- effect
- result
- feedback loop
- intervention point
- impact
- growth
- final value
- change
- result change
- 影响
- 变化
- 增长
- 最终值

Required teaching steps:

1. identify input
2. connect mechanism
3. change one factor
4. observe feedback/outcome

Common misconceptions to avoid:

- correlation is enough to prove causation
- one factor explains everything

Forbidden framings:

- single cause only
- 唯一原因

## Pattern Recipe

Preferred Pattern chain: `system_builder`, `parameter_explore`, `simulation_play`

Avoid these Patterns unless the user explicitly asks for a safe override: `concept_memory`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

For the final `simulation_play` step, make the outcome/result/feedback visible in user-facing copy. It is not enough to show a chart or number; labels, explanations, or result text should explicitly say what outcome changed and what feedback loop caused it.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `causal_mechanism`.
- The Flow uses the preferred Pattern chain: `system_builder -> parameter_explore -> simulation_play`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- interest compounds over time
- price changes demand
- network value increases with users

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

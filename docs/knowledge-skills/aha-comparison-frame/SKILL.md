---
name: aha-comparison-frame
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for comparison_frame topics such as inflation vs deflation, TCP vs UDP, SQL vs NoSQL, CPU vs GPU, renting vs buying. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: Comparison Frame

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `comparison_frame` topics. Teach concepts by comparing two terms against the same question, stable dimensions, tradeoffs, and boundary cases.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- inflation deflation
- inflation vs deflation
- tcp udp
- stocks options
- 通胀
- 通缩
- 股票
- 期权
- sql nosql
- supervised unsupervised
- cpu gpu
- renewable fossil
- renting buying
- rest graphql
- capitalism socialism

## Teaching Contract

Structure type: `comparison_frame`

Required core terms or acceptable anchors:

- shared problem
- dimension
- tradeoff
- boundary case
- 共同问题
- 维度
- 权衡
- 边界情况
- same question
- common problem
- comparison dimension
- difference
- trade-off
- edge case
- boundary
- misconception
- signal
- indicator
- cause
- mechanism
- classification
- metric
- transmission mechanism
- 信号
- 指标
- 成因
- 机制
- 分类
- 传播机制

Required teaching steps:

1. define shared problem
2. compare stable dimensions
3. test boundary case

Common misconceptions to avoid:

- two terms are compared only by definition
- one side is always better

Forbidden framings:

- always choose A
- always choose B
- A 一定更好
- B 一定更好

## Pattern Recipe

Preferred Pattern chain: `comparison`, `classification_sort`, `knowledge_check`

Avoid these Patterns unless the user explicitly asks for a safe override: `probability`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `comparison_frame`.
- The Flow uses the preferred Pattern chain: `comparison -> classification_sort -> knowledge_check`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- inflation vs deflation
- TCP vs UDP
- stocks vs options

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

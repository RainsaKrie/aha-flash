---
name: aha-procedure-algorithm
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for procedure_algorithm topics such as binary search, quicksort, dynamic programming, A* search, backpropagation. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: Procedure Algorithm

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `procedure_algorithm` topics. Teach concepts where a repeated rule, state transition, stopping condition, and edge cases define a procedure.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- binary search
- gradient descent
- dijkstra
- merge sort
- breadth first search
- 二分查找
- 梯度下降
- 归并排序
- 广度优先搜索
- quicksort
- dynamic programming
- a* search
- topological sort
- backpropagation

## Teaching Contract

Structure type: `procedure_algorithm`

Required core terms or acceptable anchors:

- state
- iteration
- rule
- termination
- edge case
- 状态
- 迭代
- 规则
- 终止条件
- 边界情况

Required teaching steps:

1. state problem and rule
2. step through process
3. track state
4. test edge case

Common misconceptions to avoid:

- algorithm is only code syntax
- edge cases do not matter

Forbidden framings:

- just memorize code
- 只背代码

## Pattern Recipe

Preferred Pattern chain: `process_timeline`, `simulation_play`, `knowledge_check`

Avoid these Patterns unless the user explicitly asks for a safe override: `probability`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `procedure_algorithm`.
- The Flow uses the preferred Pattern chain: `process_timeline -> simulation_play -> knowledge_check`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- find target in sorted list
- update gradient step
- merge two sorted lists

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

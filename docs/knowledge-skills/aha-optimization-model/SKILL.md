---
name: aha-optimization-model
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for optimization_model topics such as linear programming, integer programming, diet problem, transportation problem, resource allocation. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: Optimization Model

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `optimization_model` topics. Teach concepts where a learner must define variables, optimize an objective, and respect constraints.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- linear programming
- integer programming
- optimization
- resource allocation
- production planning
- 线性规划
- 整数规划
- 资源分配
- 生产计划
- diet problem
- transportation problem
- assignment problem
- knapsack problem
- project scheduling

## Teaching Contract

Structure type: `optimization_model`

Required core terms or acceptable anchors:

- decision variable
- objective function
- constraint
- feasible region
- optimum
- 决策变量
- 目标函数
- 约束条件
- 可行域
- 最优解

Required teaching steps:

1. define decision variables
2. set objective function
3. apply constraints
4. search feasible region
5. compare optimum

Common misconceptions to avoid:

- treating optimization as a random draw
- only changing one slider without defining constraints
- 只把线性规划当成随机选择

Forbidden framings:

- 看涨期权券
- 期权费
- 奖池
- 抽取
- random prize

## Pattern Recipe

Preferred Pattern chain: `system_builder`, `parameter_explore`, `simulation_play`

Avoid these Patterns unless the user explicitly asks for a safe override: `probability`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `optimization_model`.
- The Flow uses the preferred Pattern chain: `system_builder -> parameter_explore -> simulation_play`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- factory product mix
- diet problem
- transportation planning
- 资源分配

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

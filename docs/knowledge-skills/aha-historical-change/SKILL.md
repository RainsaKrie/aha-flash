---
name: aha-historical-change
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for historical_change topics such as industrial revolution, Renaissance, Meiji Restoration, urbanization, internet evolution. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: Historical Change

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `historical_change` topics. Teach concepts where initial conditions, triggers, accelerators, turning points, and consequences explain change over time.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- industrial revolution
- agricultural revolution
- urbanization
- 工业革命
- 农业革命
- 城市化
- cold war
- renaissance
- meiji restoration
- internet evolution
- electrification
- reform and opening-up
- company history

## Teaching Contract

Structure type: `historical_change`

Required core terms or acceptable anchors:

- steam engine
- factory system
- urbanization
- machine
- energy
- 蒸汽机
- 工厂制度
- 城市化
- 机器
- 能源

Required teaching steps:

1. initial condition
2. trigger
3. driver separation
4. turning point
5. long-term consequence

Common misconceptions to avoid:

- one invention alone caused the whole change
- history is just a date list

Forbidden framings:

- pure date memorization
- 年份就是全部

## Pattern Recipe

Preferred Pattern chain: `process_timeline`, `classification_sort`, `narrative_branch`

Avoid these Patterns unless the user explicitly asks for a safe override: `probability`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `historical_change`.
- The Flow uses the preferred Pattern chain: `process_timeline -> classification_sort -> narrative_branch`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- steam power changes factory rhythm
- rural workers move to cities

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

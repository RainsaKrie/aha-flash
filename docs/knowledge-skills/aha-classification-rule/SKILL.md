---
name: aha-classification-rule
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for classification_rule topics such as HTTP status codes, Bloom taxonomy, rock types, customer segmentation, design pattern types. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: Classification Rule

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `classification_rule` topics. Teach concepts where the learner must sort examples by explicit rules, categories, anchors, and boundary cases.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- classification
- taxonomy
- waste sorting
- legal liability
- 分类
- 归类
- 垃圾分类
- 责任类型
- biological taxonomy
- email sorting
- bloom taxonomy
- rock types
- design pattern types
- http status codes
- customer segmentation

## Teaching Contract

Structure type: `classification_rule`

Required core terms or acceptable anchors:

- rule
- category
- boundary case
- anchor example
- 规则
- 类别
- 边界样本
- 典型样本

Required teaching steps:

1. define categories by rule
2. sort examples
3. test boundary cases
4. remember anchors

Common misconceptions to avoid:

- category names are enough without rules
- borderline examples can be guessed by feeling

Forbidden framings:

- guess by name only
- 只看名称

## Pattern Recipe

Preferred Pattern chain: `classification_sort`, `knowledge_check`, `concept_memory`

Avoid these Patterns unless the user explicitly asks for a safe override: `probability`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `classification_rule`.
- The Flow uses the preferred Pattern chain: `classification_sort -> knowledge_check -> concept_memory`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- trash sorting
- legal liability
- email classification

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

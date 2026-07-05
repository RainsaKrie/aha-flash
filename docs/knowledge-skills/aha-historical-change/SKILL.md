---
name: aha-historical-change
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with historical_change. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: Historical Change

Structure type: `historical_change`

## Teaching Contract

- show the starting condition
- identify the trigger
- separate drivers
- test a consequence

## Pattern Capability

Prefer:
- `process_timeline`
- `classification_sort`
- `narrative_branch`
- `knowledge_check`

Avoid:
- `probability`

## Guardrails

Correct these common misconceptions:
- one invention caused the whole change
- history is only a date list

Do not frame the lesson as:
- pure date memorisation
- single-cause explanation

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

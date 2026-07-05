---
name: aha-comparison-frame
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with comparison_frame. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: Comparison Frame

Structure type: `comparison_frame`

## Teaching Contract

- place the alternatives in one concrete question
- compare stable dimensions
- separate relevant reasons from noise
- apply the trade-off once

## Pattern Capability

Prefer:
- `narrative_branch`
- `comparison`
- `classification_sort`
- `knowledge_check`

Avoid:
- `probability`
- `simulation_play`
- `system_builder`

## Guardrails

Correct these common misconceptions:
- comparison is only two definitions
- one option is always better
- past investment proves a future benefit

Do not frame the lesson as:
- always choose A
- always choose B
- fabricated numerical trend
- internal workflow labels

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

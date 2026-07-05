---
name: aha-classification-rule
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with classification_rule. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: Classification Rule

Structure type: `classification_rule`

## Teaching Contract

- state a sorting rule
- classify examples
- test a boundary case
- apply the rule again

## Pattern Capability

Prefer:
- `classification_sort`
- `knowledge_check`
- `concept_memory`
- `narrative_branch`

Avoid:
- `probability`

## Guardrails

Correct these common misconceptions:
- a category name is a rule
- borderline cases can be guessed by feel

Do not frame the lesson as:
- guess by name only
- claim drag-and-drop when the UI uses category choices

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

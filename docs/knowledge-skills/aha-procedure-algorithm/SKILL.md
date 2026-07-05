---
name: aha-procedure-algorithm
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with procedure_algorithm. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: Procedure Algorithm

Structure type: `procedure_algorithm`

## Teaching Contract

- state the repeated rule
- order a state change
- retain an invariant
- test a boundary

## Pattern Capability

Prefer:
- `process_timeline`
- `classification_sort`
- `concept_memory`
- `knowledge_check`

Avoid:
- `probability`
- `simulation_play`

## Guardrails

Correct these common misconceptions:
- an algorithm is only code syntax
- edge cases do not matter

Do not frame the lesson as:
- memorise code only
- unverifiable numerical simulation

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

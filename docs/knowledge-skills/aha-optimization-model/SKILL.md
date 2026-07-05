---
name: aha-optimization-model
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with optimization_model. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: Optimization Model

Structure type: `optimization_model`

## Teaching Contract

- name what can be chosen
- state the objective
- make constraints visible
- compare feasible choices

## Pattern Capability

Prefer:
- `system_builder`
- `parameter_explore`
- `comparison`
- `knowledge_check`

Avoid:
- `probability`
- `simulation_play`

## Guardrails

Correct these common misconceptions:
- treating optimisation as a random draw
- changing a value without stating the constraint

Do not frame the lesson as:
- random prize
- fabricated numerical forecast

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

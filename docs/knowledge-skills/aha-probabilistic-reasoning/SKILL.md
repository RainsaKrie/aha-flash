---
name: aha-probabilistic-reasoning
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with probabilistic_reasoning. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: Probabilistic Reasoning

Structure type: `probabilistic_reasoning`

## Teaching Contract

- start with uncertainty
- weigh evidence
- update the judgment
- make a conditional decision

## Pattern Capability

Prefer:
- `probability`
- `parameter_explore`
- `concept_memory`
- `knowledge_check`

Avoid:
- `system_builder`

## Guardrails

Correct these common misconceptions:
- new evidence erases the prior
- likelihood and conclusion are identical

Do not frame the lesson as:
- memorise a formula without a judgment
- investment jargon for non-finance topics

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

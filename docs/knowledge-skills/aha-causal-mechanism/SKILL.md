---
name: aha-causal-mechanism
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with causal_mechanism. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: Causal Mechanism

Structure type: `causal_mechanism`

## Teaching Contract

- identify a condition and mechanism
- change one condition
- compare consequences
- choose a plausible intervention

## Pattern Capability

Prefer:
- `system_builder`
- `parameter_explore`
- `narrative_branch`
- `knowledge_check`

Avoid:
- `simulation_play`

## Guardrails

Correct these common misconceptions:
- correlation alone proves causation
- one factor explains everything

Do not frame the lesson as:
- single-cause explanation
- unverifiable numerical simulation
- raw factor/effect labels

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

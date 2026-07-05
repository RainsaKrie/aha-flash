---
name: aha-system-process
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows with system_process. It defines a reusable four-step teaching contract, Pattern capability boundary, failure modes, and deterministic checks without carrying a prewritten lesson.
---

# Aha Structure Skill: System Process

Structure type: `system_process`

## Teaching Contract

- identify actors
- follow a handoff
- separate normal and failure paths
- diagnose one boundary

## Pattern Capability

Prefer:
- `system_builder`
- `process_timeline`
- `classification_sort`
- `knowledge_check`

Avoid:
- `probability`

## Guardrails

Correct these common misconceptions:
- a system process is one lookup
- two actors have the same role

Do not frame the lesson as:
- one-step lookup
- single actor explains the whole process

## Boundary

- This Skill teaches a reusable knowledge structure; it does not route topics, own topic vocabulary, or contain a prewritten lesson.
- ConceptPlan supplies topic-specific grounding terms. KnowledgeBlueprint owns the four-step order. Pattern components own their interaction affordance.
- Keep learner-facing copy natural and specific to the supplied topic. Never expose internal structure labels as lesson content.

## Evaluation

- Keep `evals/evals.json` synchronized with `tests/fixtures/blueprint-cases.json`.
- Deterministic checks verify structure, Pattern order, grounding, affordance, and forbidden framing.

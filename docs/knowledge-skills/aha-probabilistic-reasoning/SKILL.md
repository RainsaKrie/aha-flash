---
name: aha-probabilistic-reasoning
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for probabilistic_reasoning topics such as Bayes theorem, hypothesis testing, confidence interval, expected value, Markov chain. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: Probabilistic Reasoning

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `probabilistic_reasoning` topics. Teach concepts where uncertainty, evidence, samples, priors, likelihood, or expected value change a decision.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- bayes
- bayesian
- 贝叶斯
- 条件概率
- hypothesis testing
- confidence interval
- markov chain
- risk assessment
- random sampling
- normal distribution
- expected value
- monte carlo
- a/b testing

## Teaching Contract

Structure type: `probabilistic_reasoning`

Required core terms or acceptable anchors:

- prior
- likelihood
- posterior
- evidence
- conditional probability
- 先验
- 似然
- 后验
- 证据
- 条件概率

Required teaching steps:

1. start from prior
2. weigh evidence
3. update posterior
4. make decision

Common misconceptions to avoid:

- new evidence erases the prior
- posterior is just the same as likelihood

Forbidden framings:

- memorize formula only
- 只背公式

## Pattern Recipe

Preferred Pattern chain: `probability`, `parameter_explore`, `knowledge_check`

Avoid these Patterns unless the user explicitly asks for a safe override: `system_builder`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `probabilistic_reasoning`.
- The Flow uses the preferred Pattern chain: `probability -> parameter_explore -> knowledge_check`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- medical test
- spam filtering
- weather forecast

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

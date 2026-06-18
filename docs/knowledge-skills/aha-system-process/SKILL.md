---
name: aha-system-process
description: Use this skill when generating, reviewing, or improving Aha Flash learning flows for system_process topics such as DNS resolution, HTTP request, TCP handshake, CI/CD pipeline, message queue. It defines the teaching contract, Pattern recipe, common failure modes, and deterministic quality checks for this knowledge structure.
---

# Aha Skill: System Process

## Purpose

Use this skill to generate or review a three-step Aha Flash Flow for `system_process` topics. Teach concepts made of actors, modules, handoffs, feedback paths, and failure points.

Do not treat this skill as prebuilt lesson content. Treat it as a compact teaching contract that guides Blueprint creation, Pattern selection, and QualityGate checks.

## Trigger Cues

Use this skill when the topic resembles any of these cues:

- dns
- domain resolution
- 域名解析
- DNS 解析
- tcp handshake
- ci/cd pipeline
- message queue
- payment checkout
- database replication
- http request
- kubernetes scheduling
- compiler pipeline
- oauth login

## Teaching Contract

Structure type: `system_process`

Required core terms or acceptable anchors:

- browser
- recursive resolver
- root server
- authoritative server
- cache
- IP address
- 浏览器
- 递归解析器
- 根服务器
- 权威服务器
- 缓存
- IP 地址

Required teaching steps:

1. request starts
2. resolver asks hierarchy
3. authoritative answer returns
4. cache shortens next lookup

Common misconceptions to avoid:

- DNS is just one database lookup
- recursive resolver and authoritative server are the same role

Forbidden framings:

- single lookup only
- one-step lookup

## Pattern Recipe

Preferred Pattern chain: `system_builder`, `process_timeline`, `knowledge_check`

Avoid these Patterns unless the user explicitly asks for a safe override: `probability`

When generating a Flow, keep the Pattern chain aligned with the teaching steps. A visually valid component is not enough; each step must teach the corresponding part of the structure.

## QualityGate Checks

Before a Flow reaches users, verify these deterministic checks:

- The detected structure is `system_process`.
- The Flow uses the preferred Pattern chain: `system_builder -> process_timeline -> knowledge_check`.
- Visible user-facing content covers the required teaching steps.
- Required core terms or acceptable anchors appear in the Flow content or trace-backed step content.
- Forbidden framings are absent.
- Unsuitable Patterns are not used.
- Placeholder variables such as `{value}`, `{result}`, or generic filler copy are absent.

## Canonical Examples

- open example.com
- cache hit vs cache miss

## Eval Set

Use `evals/evals.json` for skill-level test prompts. Keep it synchronized with `tests/fixtures/blueprint-cases.json` and the runtime data in `src/lib/content/skill-packs.ts`.

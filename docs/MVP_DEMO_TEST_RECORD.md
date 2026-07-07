# MVP Demo Test Record

Date: 2026-07-07
Scope: Week-2 MVP playable demo checks. This is a smoke record, not a full pedagogy audit.

## Stable Entry Flows

Checked from `/explore`:

| Flow | Result | Notes |
|---|---|---|
| bayes-starter | Pass | First quiz is grounded and feedback-gated. |
| dns-router | Pass | Module-builder no longer unlocks after one click; partial hint copy is now task-oriented. |
| options-risk | Pass | Probability reveal, simulation completion, and branch feedback gates work. |
| industrial-revolution | Pass | Quiz entry and timeline entry are understandable; no obvious backend labels. |
| inflation-deflation | Pass | Wrong-answer feedback is explicit and gated before continuing. |

## Dynamic Topic Checks

| Topic | Source | Result | Notes |
|---|---|---|---|
| Linear programming | LLM | Pass after UI guard | Route covers decision variables, objective, constraints, feasible decision. Found duplicate module labels and weak short path in `system_builder`; fixed generically in `BuildSandbox`. |
| DNS resolution | LLM | Pass | Generated route covers participants, query order, cache/path classification, and boundary diagnosis. |
| Bayes theorem | LLM | Pass | Generated route covers probability judgment, evidence strength, term cards, and final judgment. |
| Compound interest | LLM | Watch | Generated route includes compound formula and parameter exploration. Later branch labels mention discount/leverage; acceptable for smoke, but should be watched in deeper copy review. |
| Sunk cost | LLM | Pass | Browser run produced a grounded movie-ticket scenario with opportunity cost, loss aversion, and decision frame. One API run also showed HonestFailure, so this remains a variance watch item. |

## Fixes Made During This Pass

- `BuildSandbox` now disambiguates duplicate module labels using role/description qualifiers.
- `BuildSandbox` hides the path rail when the generated path has fewer than four nodes, because short paths tend to be incomplete and misleading.
- `BuildSandbox` now shows a learner-facing action label for module selection instead of the flow-specific label.
- Flow bottom-bar partial-state copy now says to continue the card task instead of implying feedback already exists.

## Current Readout

The stable demo path is playable. Dynamic generation is good enough for MVP smoke demos on the tested concepts, but it still needs continued watch on topic fit and label quality for generated branches.
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
## Additional Check - 2026-07-08

| Topic | Source | Result | Notes |
|---|---|---|---|
| Marginal utility | LLM | Pass after escape | First generation entered HonestFailure because the route was not grounded enough. Failure copy now uses learner-facing reasons instead of raw QualityGate strings. Retrying with the modeling structure generated a playable four-step path around consumer choice, decision variables, utility, and feasibility. |

## Additional Fixes - 2026-07-08

- Explore failure cards now summarize QualityGate issues in product language.
- Structure-retry hints avoid backend/example labels such as DNS, Agent, Pattern, or template names.
- Custom Flow debug inspector is hidden unless the URL includes `?debug=1`.
- Custom Flow draft loading waits for client mount to avoid a hydration mismatch in local demo runs.

## Dynamic Coverage Closeout - 2026-07-08

| Topic | Source | Result | Notes |
|---|---|---|---|
| Cache mechanism | LLM | Pass | Generated a four-step path around cache conditions, replacement strategy, consistency choice, and final intervention check. |
| Supervised learning vs unsupervised learning | LLM | Pass after browser check | Preview, branch choice, comparison, classification, quiz feedback, and completion branches all played through. Classification required correct per-card choices and showed one progress counter. |
| Operating system process | LLM | Pass | Generated a process lifecycle path with resource modules, running-state timeline, process/thread classification, and scheduling check. |
| Supply and demand curve | LLM | Pass | Generated a market-participant system, price/quantity parameter exploration, market-event branch choice, and final intervention check. |
| Causal inference | LLM | Pass | Generated a cause/effect system, confounder-style parameter exploration, branch choice, and final reasoning check. |
| Capitalism vs socialism | LLM | Pass | Generated a comparison-frame path with scenario choice, multi-dimension comparison, classification, and final boundary check. |

## Browser Walkthrough - 2026-07-08

Topic: Supervised learning vs unsupervised learning.

- Explore generated four learner-facing steps without schema tags in the preview.
- Stage 1 branch feedback appeared before Flow continuation.
- Stage 2 comparison required opening every visible dimension before continuation.
- Stage 3 classification used category-card clicks, not drag-and-drop copy; wrong choices did not advance progress; duplicate 0/4 counters did not appear.
- Stage 4 quiz showed correctness and explanation before the final completion view.
- Completion branches rendered and the generated-follow-up badge now reads Continue exploring instead of AI extension.

## Additional Fixes - 2026-07-08 Dynamic Coverage

- Generalized the narrative-branch completion hint so non-sunk-cost topics no longer inherit sunk-cost wording.
- Replaced the completion branch badge AI extension with Continue exploring while keeping the internal ai_seed type unchanged.

## Portfolio Evidence Pass - 2026-07-08

Screenshots captured locally under `output/playwright/portfolio-2026-07-08/`:

- `01-explore-input.png`
- `02-generation-stage.png`
- `03-route-preview.png`
- `04-flow-interaction.png`
- `05-completion-branches.png`
- `06-hub-recap.png`

Additional finding: using `open` in Playwright starts a fresh browser context, so Hub screenshots must use `goto` in the same context to preserve localStorage. In the real app, completion records persist through same-tab navigation.

Additional fix: generated/custom Flow completion records now fall back to `[flow.concept || flow.title]` when `flow.concepts` is missing, so Hub does not silently filter them out.

Content watch: one dynamic supervised-vs-unsupervised run generated a classification item about past investment while the categories were only supervised/unsupervised. The interaction gate behaved correctly, but V7 quality guardrails should constrain category granularity and irrelevant-item wording.

---
name: idea-to-wave
description: Shape a high-level product idea into an approved interpretation, then use plan-wave to file agent-ready issues. Use when the user has a direction but has not identified the concrete gaps, behavior, scope, or tickets.
---

# Idea to Wave

Turn a high-level idea into a filed wave. Own product interpretation through approval; delegate detailed slicing and issue publication to `plan-wave`.

## 1. Orient

Read the repository instructions, domain language, product context, applicable decisions, nearby code, tests, and relevant open issues. Exercise the product when observed behavior is necessary to understand the idea. Keep this pass at product depth: establish current behavior, user impact, constraints, and the nearest implementation seams without drafting tickets.

For a broad idea, delegate bounded exploration of independent surfaces and synthesize the results yourself. Keep facts tied to repository or observed evidence.

Done when the current behavior, intended user outcome, affected surfaces, and material unknowns are evidence-backed.

## 2. Frame

Propose one product interpretation containing:

- the user-visible outcome;
- the problem or gap being solved;
- behavior that belongs inside the idea;
- adjacent behavior that remains outside it;
- constraints inherited from the repository;
- assumptions and product decisions still required;
- a recommended answer for each decision.

Choose the smallest coherent interpretation that realizes the idea. Resolve factual questions through further inspection. Reserve the user gate for choices that materially change behavior, scope, cost, or risk.

Done when the interpretation is concrete enough that `plan-wave` can design slices without inventing product intent.

## 3. Gate

Present the interpretation before any issue is created. Ask for material decisions one at a time, leading with the recommended answer and its tradeoff. Revise the interpretation when an answer changes it.

The gate passes only after the user explicitly approves the complete interpretation and every material decision is settled. Preserve exact user wording for rules, thresholds, and other acceptance-defining choices.

## 4. File the wave

Invoke `plan-wave` with the approved interpretation, the evidence gathered during orientation, and the user's exact pinned decisions. Treat `plan-wave` as the single source of truth for grounding exact code shapes, designing slices, grilling any newly discovered decisions, specifying issues, publishing dependency edges, and recording dispatch order.

If `plan-wave` discovers a new material product decision, return to the user gate, add the answer to the approved interpretation, and resume planning.

Stop when `plan-wave` has verified and reported the filed wave. Leave implementation and merging for a separate, explicit invocation of `orchestrate-wave`.

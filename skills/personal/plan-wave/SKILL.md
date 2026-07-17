---
name: plan-wave
description: Plan a wave of features and file them as fully-specified, agent-ready issues with dependency edges and a dispatch order.
disable-model-invocation: true
---

# Plan a Wave

Turn a feature request into a **wave**: a batch of GitHub issues so fully specified that an implementation agent can pick each one up cold — no conversation context, no follow-up questions. The wave ends filed, not built: this skill writes only to the issue tracker, never to the working tree, so an `/orchestrate-wave` session can run concurrently on the same repo without collision.

Subagent policy for *this* planning session: Sonnet with reasoning effort **≤ high** — state "do not exceed high reasoning effort" in each prompt. Never spawn a subagent on Fable or above. (Implementer model pins live on each issue's **slice type**; `/orchestrate-wave` reads them at dispatch.)

## Process

### 1. Ground

Spawn an Explore agent over the subsystems the wave touches: core interfaces and types, data/content shapes, UI structure, save/persistence format, test patterns, and any ADRs or domain glossary. You need facts the specs will stand on — exact type names, function signatures, established conventions (append-only arrays, tolerant-load defaults, event vocabularies), and exact file paths. Done when you can write a spec snippet and its file manifest without guessing a name or a path.

### 2. Design

Draft the wave: one slice per issue, and for each slice its deltas across every layer (types, engine/core, data, UI, save) plus its tests, and its **file manifest** — the exact paths it will `modify`, `create`, and `read` (context files an implementer reads before editing). Classify each slice up front:

- **code slice** — behavior, types, engine, UI wiring, content data, tests; no new original raster art as the primary deliverable
- **asset slice** — new or replacement icons, sprites, backdrops, or other rasters that need image generation and the repo's asset pipeline

Prefer splitting mixed work into two issues (code blocked by asset, or the reverse) rather than one issue that needs both models. Then map the cross-slice hazards:

- **Shared-file conflicts** — intersect the slices' manifest write sets (`modify` + `create`); the manifests are the single source of truth for what each slice touches.
- **Semantic conflicts** — slices that collide through behavior even with disjoint files (one slice's mechanic changes another's test conditions, shared fixtures, event timing).
- **Open decisions** — every choice the design doesn't force.

When a slice can't be behavior-complete on its own, give it a neutral **interim** — equivalent to today's behavior, labeled interim in the body — that a named later slice explicitly replaces. Every slice merges green and the replacement seam is planned, not discovered.

**Size every slice to a single fresh worker context window.** The manifest is the instrument: a write set past ~6–8 files, or a `read` set that won't hold to a tight named list, marks the slice oversized — split it before Spec, taking the first seam that fits:

1. **Interim seam** — the mechanism above: behavior-incomplete halves joined by a labeled interim.
2. **Layer seam** — when the manifest partitions naturally (core + data first, UI wiring second); the later slice's `read` set names the earlier slice's merged files.
3. **Expand–contract** — for a wide refactor whose blast radius fans across the codebase: an *expand* slice adds the new form beside the old; *migrate* slices convert call sites in batches sized by blast radius (each blocked by the expand); a *contract* slice deletes the old form, blocked by every migrate batch. Each merges green because the old form survives until contract.

Use a Plan agent for a large wave; design inline for a small one. Done when every slice has a delta list, a slice type, a file manifest within the size ceiling, and every decision is named.

### 3. Grill

Run `/grill-me` on the draft. Facts get looked up in the codebase; decisions go to the user one at a time, each with your recommended answer. A slice sitting near the size ceiling is a decision: present the candidate seams with your recommended split (or the case for keeping it whole). The user's answers are final — record their exact words where wording matters (pricing formulas, thresholds, behavioral rules). Done when the user confirms shared understanding, and only then.

### 4. Spec

Write each issue body: `## Slice type` / `## What to build` / `## Touches` / `## Acceptance criteria` / `## Blocked by`. This spec style is deliberately concrete (unlike `/to-tickets`, which avoids code in bodies — a wave issue is the implementing agent's only context):

- `## Slice type` is mandatory and machine-readable for `/orchestrate-wave`: a single line that is exactly `code` or exactly `asset`. No synonyms, no prose on that line.
- `## Touches` is mandatory: the slice's file manifest, one line per file as `modify:` / `create:` / `read:` with an exact repo-relative path and a short why. Every `modify`/`read` path exists in the codebase at planning time (Ground verified it); `create` paths follow an existing directory convention; name a directory only when the whole directory is genuinely in scope. A nonexistent path is a spec bug, same as a wrong type name. The `read` lines are the implementer's context set — the files to read before editing, replacing open-ended exploration. The manifest is expected scope, not a straitjacket: state in-body that deviations are allowed but each out-of-manifest file must be justified in the PR body.
- Exact type shapes and constants in fenced code blocks, ready to paste.
- Ordering that matters spelled out (tick-branch order, click-handler dispatch order) as pseudocode.
- Standing constraints restated in-body where they bind: append-only arrays, save-compat defaults, event-vocabulary rules — with the *why*, so the agent doesn't "improve" them away.
- One acceptance criterion per pinned decision — each user answer from the grill becomes a checkable test.
- Tuning values labeled as tuning, not spec.
- `## Blocked by` carries the dispatch notes too: which issues this one must never run concurrently with, and why — name the shared manifest paths for file conflicts, prose for semantic conflicts (from step 2). The orchestrator reads issues, not this conversation — concurrency constraints that live only in the closing report are invisible at dispatch time.

Done when each body, reread cold as the implementing agent, has no open question — and no drafting residue: a sentence still arguing with itself is a decision that didn't get made.

### 5. Publish

Create issues in dependency order (blockers first, so edges reference real numbers). Label agent-ready issues per the repo's triage vocabulary; leave deferred follow-ups unlabeled. Wire native blocking edges:

```
gh api repos/<owner>/<repo>/issues/<N>/dependencies/blocked_by -F issue_id=<blocker's global REST id>
```

(The REST id comes from `gh api repos/<owner>/<repo>/issues/<M> -q .id`. The `-F` flag is load-bearing: `issue_id` must arrive as a typed integer — `-f` sends a string and the API 422s.) Then sweep existing open issues in both directions: rewrite bodies the wave's mechanics overtake, comment sequencing warnings on issues that now conflict with a slice, and when a wave decision pins tuning or intent on an *already-filed* issue, comment it there — a decision recorded only in conversation dies with the conversation.

### 6. Record

Verify: issue list shows the wave with correct labels; every agent-ready issue has `## Slice type` as `code` or `asset` and a `## Touches` manifest whose `modify`/`read` paths exist in the tree; spot-check edges via the `dependencies/blocked_by` endpoint; `git status --porcelain` is empty (the tree was never touched). Close with a report the orchestrator can execute from: issue numbers and titles, each issue's slice type, the dependency graph, and a **dispatch order** — which issues are parallel-safe, which are strictly serialized (summarizing the in-body dispatch notes, which remain the source of truth).

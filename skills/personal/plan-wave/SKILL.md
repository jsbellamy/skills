---
name: plan-wave
description: Plan a wave of features and file them as fully-specified, agent-ready issues with dependency edges and a dispatch order.
---

# Plan a Wave

Turn a feature request into a **wave**: a batch of GitHub issues so fully specified that an implementation agent can pick each one up cold — no conversation context, no follow-up questions. The wave ends filed, not built: this skill writes only to the issue tracker, never to the working tree — except **authority** capture during Grill via `/domain-modeling` — so an `/orchestrate-wave` session can run concurrently on the same repo without collision.

Subagent policy for *this* planning session: Sonnet with reasoning effort **≤ high** — state "do not exceed high reasoning effort" in each prompt. Never spawn a subagent on Fable or above. (Implementer model pins live on each issue's **slice type**; `/orchestrate-wave` reads them at dispatch.)

## Process

### 1. Ground

Spawn an Explore agent over the subsystems the wave touches: core interfaces and types, data/content shapes, UI structure, save/persistence format, test patterns, and the repo's **authority** corpus (`CONTEXT.md`, `docs/DECISIONS.md` when present, `docs/adr/`, `docs/agents/domain.md` when present). You need facts the specs will stand on — exact type names, function signatures, established conventions (append-only arrays, tolerant-load defaults, event vocabularies), and exact file paths. Done when you can write a spec snippet and its file manifest without guessing a name or a path.

### 2. Design

Draft the wave: one slice per issue, and for each slice its current → target deltas across every layer (types, engine/core, data, UI, save) plus its proof obligations, and its **file manifest** — the exact paths it will `modify`, `create`, and `read` (context files an implementer reads before editing). Give every existing text-file `modify` and `read` entry an anchor that resolves mechanically: the name of a definition (function, class, constant) or an exact heading title, written as a `Parent → Child` path when the title repeats in the document. Locating prose — "the call preceding `_validate_record`", "implementation item 1", "the Slicing seam bullet" — is not an anchor. It names a site no grep reaches, so the implementer opens the whole file to find it and then carries that file for the rest of the task. When a site has no name of its own, anchor the enclosing definition or heading and put the locating detail in the purpose note, which is what the note is for. `create` paths, directory scopes, and binary assets carry a purpose but no source anchor; the resolver must report them explicitly for the appropriate later action. Classify `read` entries as an `authority` (normative contract), `seam` (interface the change joins), or `pattern` (example to imitate). Classify each slice up front:

- **code slice** — behavior, types, engine, UI wiring, content data, tests; no new original raster art as the primary deliverable
- **asset slice** — new or replacement icons, sprites, backdrops, or other rasters that need image generation and the repo's asset pipeline

Prefer splitting mixed work into two issues (code blocked by asset, or the reverse) rather than one issue that needs both models. Then map the cross-slice hazards:

- **Shared-file conflicts** — intersect the slices' manifest write sets (`modify` + `create`); the manifests are the single source of truth for what each slice touches.
- **Semantic conflicts** — slices that collide through behavior even with disjoint files (one slice's mechanic changes another's test conditions, shared fixtures, event timing).
- **Open decisions** — every choice the design doesn't force and no **authority** already pins.

When a slice can't be behavior-complete on its own, give it a neutral **interim** — equivalent to today's behavior, labeled interim in the body — that a named later slice explicitly replaces. Every slice merges green and the replacement seam is planned, not discovered.

**Size every slice to a single fresh worker context window.** The manifest is the instrument: a write set past ~6–8 files, or a `read` set that won't hold to a tight named list, marks the slice oversized — split it before Spec, taking the first seam that fits. Size the `read` set by the lines its anchors resolve to, not by file count: anchoring three functions in a two-thousand-line module is a small read set, while naming that module bare is not. Past roughly a thousand resolved lines, the slice is carrying a subsystem rather than a seam.

1. **Interim seam** — the mechanism above: behavior-incomplete halves joined by a labeled interim.
2. **Layer seam** — when the manifest partitions naturally (core + data first, UI wiring second); the later slice's `read` set names the earlier slice's merged files.
3. **Expand–contract** — for a wide refactor whose blast radius fans across the codebase: an *expand* slice adds the new form beside the old; *migrate* slices convert call sites in batches sized by blast radius (each blocked by the expand); a *contract* slice deletes the old form, blocked by every migrate batch. Each merges green because the old form survives until contract.

Use a Plan agent for a large wave; design inline for a small one. Done when every slice has a delta list, a slice type, a file manifest within the size ceiling, and every decision is named.

### 3. Grill

Run a `/grilling` session on **open decisions** only. Facts and pins already in the **authority** corpus are lookup during Ground and Spec — cite them, don't re-ask. Route each new pin through `/domain-modeling` **authority routing** as it crystallises. Decisions go to the user one at a time, each with your recommended answer. A slice sitting near the size ceiling is a decision: present the candidate seams with your recommended split (or the case for keeping it whole). The user's answers are final — record their exact words where wording matters (pricing formulas, thresholds, behavioral rules). Done when the user confirms shared understanding and every grill pin is either in an authority file or scoped to this wave's issue `## Contract` claims only.

### 4. Spec

Write each issue body as an agent contract: `## Slice type` / `## Delta` / `## Contract` / `## Touches` / `## Proof` / optional `## Invariants` / `## Blocked by`. The implementing agent is the only reader. Optimize for cold-start execution, not human reassurance.

- `## Slice type` is mandatory and machine-readable for `/orchestrate-wave`: a single line that is exactly `code` or exactly `asset`. No synonyms, no prose on that line.
- `## Delta` is mandatory: state the smallest useful current → target diff so the implementer opens files with a hypothesis instead of reconstructing the change through exploration. For a wholly new capability, use absent → target. Do not explain unchanged behavior here.
- `## Contract` is the single source of truth for requirements. Give each claim a stable ID (`C1`, `C2`, or an existing evidence slug) and state it exactly once. Put exact type shapes, constants, and load-bearing pseudocode under the claim they define. When a manifest `authority` already states the behavior, cite its exact heading and record only this slice's additions or overrides. Retain procedural steps only when their order is observable behavior or a load-bearing implementation constraint.
- `## Touches` is mandatory: the slice's file manifest, one line per file as `modify:` / `create:` / `read:` with an exact repo-relative path and a short purpose. Existing text-file `modify`/`read` entries also carry the mechanically resolvable anchor defined in §2; `create` paths, directory scopes, and binary assets are explicitly unanchored. Use `- modify: \`path\` :: anchor — delta`, `- create: \`path\` — purpose`, and `- read: [authority|seam|pattern] \`path\` :: anchor — question`. Every `modify`/`read` path exists in the codebase at planning time (Ground verified it); `create` paths follow an existing directory convention; name a directory only when the whole directory is genuinely in scope. A nonexistent existing-file path is a spec bug, same as a wrong type name; so is a named text anchor that resolves to nothing. The `read` lines are the implementer's bounded context set, replacing open-ended exploration.

  A manifest also carries the companions of what it changes. For every modified public library entry point that can raise, trace its callers to the catch site. When a CLI or handler reaches it, name that caller and its test module in the manifest as `modify` or `read` according to the expected impact, even when the exception type itself is unchanged. This is not only a read-set gap: `/orchestrate-wave` computes parallel-safety by intersecting write sets, so a companion missing from the manifest is a shared-write hazard missing from the dependency graph, and the slice can be dispatched concurrently with one that owns the same file. End the section with one compact scope rule: the manifest is expected scope; justify each deviation in the PR body.
- `## Proof` maps every Contract claim ID to its proving test, evidence slug, inspection, or command. Point to claims; never paraphrase them. Include the repository's required validation commands once here.
- `## Invariants` is optional and contains only boundaries that would otherwise be easy to violate. State the preserved behavior positively, once, with the why only when it prevents a plausible wrong turn. Put append-only arrays, save-compat defaults, event-vocabulary rules, and tuning labels here rather than repeating them beside multiple claims.
- An asset slice carries its **generation prompt**: the finished prompt text, written against the repo's prompt kit for that asset class, in a fenced block ready to paste into the generator — plus the intended read beside it (subject, composition, facing, palette/theme keys). The implementer runs the plan's prompt and judges the result against the stated read; authoring the prompt is planning work, not implementation work.
- Each pinned decision from the grill becomes one Contract claim with a Proof mapping.
- `## Blocked by` is the only dependency declaration in the body. Use `blocked_by: [numbers]`, `never_concurrent: [numbers]`, `shared_writes: [paths]`, and `semantic_conflicts: [short reasons]`; omit empty keys. The orchestrator reads issues, not this conversation — concurrency constraints that live only in the closing report are invisible at dispatch time.

Run a compression audit on every body. Every sentence must serve Delta, Contract, Touches, Proof, Invariants, or Blocked by; delete anything that does not. Every Contract claim has Proof, every Proof entry names a claim, and no requirement, boundary, command, or dependency has more than one authoritative occurrence.

Done when each body, reread cold as the implementing agent, has no open question, passes the compression audit, and contains no drafting residue: a sentence still arguing with itself is a decision that did not get made.

### 5. Publish

Create issues in dependency order (blockers first, so edges reference real numbers). Label agent-ready issues per the repo's triage vocabulary; leave deferred follow-ups unlabeled. Wire native blocking edges:

```
gh api repos/<owner>/<repo>/issues/<N>/dependencies/blocked_by -F issue_id=<blocker's global REST id>
```

(The REST id comes from `gh api repos/<owner>/<repo>/issues/<M> -q .id`. The `-F` flag is load-bearing: `issue_id` must arrive as a typed integer — `-f` sends a string and the API 422s.) Then sweep existing open issues in both directions: rewrite bodies the wave's mechanics overtake, comment sequencing warnings on issues that now conflict with a slice, and when a wave decision pins tuning or intent on an *already-filed* issue, comment it there — a decision recorded only in conversation dies with the conversation.

### 6. Record

Verify: issue list shows the wave with correct labels; every agent-ready issue has `## Slice type` as `code` or `asset`, every required agent-contract section, complete Contract ↔ Proof mapping, and a `## Touches` manifest whose `modify`/`read` paths exist in the tree and whose named text anchors resolve — mechanically where the repo ships an anchor extractor (in Underline, `npm run agents:anchors -- --issue <N>`), by grepping each symbol and heading otherwise. The resolver must account explicitly for every unanchored `create` path, directory scope, and binary asset; an unresolved named text anchor sends the issue back to Design. Every asset issue has a fenced generation prompt; spot-check edges via the `dependencies/blocked_by` endpoint; `git status --porcelain` is empty (the tree was never touched). Close with a report the orchestrator can execute from: issue numbers and titles, each issue's slice type, the dependency graph, and a **dispatch order** — which issues are parallel-safe, which are strictly serialized (summarizing the in-body dispatch notes, which remain the source of truth).

---
name: orchestrate-wave
description: Orchestrate implementation of a wave of agent-ready issues — dispatch implementer subagents in worktrees, verify PRs, audit their /code-review verdicts, merge with approval.
disable-model-invocation: true
---

# Orchestrate a Wave

Drive a **wave** of agent-ready GitHub issues from open to merged. You are the orchestrator: you dispatch implementer subagents into isolated worktrees, verify their PRs, audit the `/code-review` verdicts they publish, and merge — you never implement or review diffs yourself, and implementers never merge. This session owns the repo's working tree and all merges; a concurrent `/plan-wave` session writes only to the issue tracker, so both can run at once.

## Cursor shell

Cursor sandboxes shell commands by default. Every `gh` call (`gh run list`, `gh issue view`, `gh pr checks`, `gh pr merge`, etc.) must request elevated permissions or it will fail with `Forbidden` — the sandbox cannot read the keyring token. Use `full_network` for read-only GitHub API calls; use `all` for merge, push, and other writes that need keyring-backed auth.

## Slice type → model

Every wave issue must declare **`## Slice type`** with exactly one of `code` or `asset`. Detect the host runtime once (Cursor vs Claude Code) and pin implementers from this table — never cross-wire models across runtimes:

| Slice | Cursor | Claude Code |
| ----- | ------ | ----------- |
| **code slice** (`code`) | Composer 2.5 (`composer-2.5`, never fast) | Sonnet (`sonnet`, reasoning ≤ high) |
| **asset slice** (`asset`) | Grok 4.5 medium (`cursor-grok-4.5-medium`) | Grok 4.5 medium if available; otherwise ask before dispatching |

Asset implementers must have image generation and follow the repo's asset pipeline when one exists. For visually authored output, they receive a visual reference set and preserve the original sample's identity while matching the existing cohort's style. Never spawn Fable or above. Never invent a slice type: if `## Slice type` is missing or not exactly `code` / `asset`, stop and ask — do not dispatch.

## Loop

### 1. Preflight

In the repo: `main` clean (`git status --porcelain` empty), up to date, full test suite green, latest CI run on `main` green. Read the wave's issues and their native `blocked_by` edges, plus any dispatch order recorded by `/plan-wave`. For each issue, read `## Slice type` and record it on the dispatch plan. Classify each asset slice as visually authored or mechanical-only from the issue: a mechanical-only slice must prove rendered-pixel equivalence; any intended visual delta makes it visually authored. For every visually authored asset slice, build the visual reference set before dispatch: the issue's original sample plus two to five closest existing assets from the same family, atlas, role, or rendered context; when fewer than two peers exist, use every available peer and say so. If the original sample is unavailable, or no existing asset can establish the requested style, stop and ask rather than dispatching an identity- or style-blind generation. An issue is **parallel-safe** only when it is both file-disjoint *and* semantically disjoint from everything in flight. Compute file-disjointness mechanically: intersect the issues' `## Touches` write sets (`modify` + `create`) — any overlap is a conflict. Semantic disjointness still needs judgment — slices can collide through shared fixtures, test conditions, or event timing even when their manifests never overlap. Writers of the same core file are strictly serial. When in doubt, serialize.

### 2. Dispatch

For each issue going out, from the current tip of `main`. **`cd <repo>` first** — worktree paths are relative to repo root, not the shell's starting cwd (a bare `sidescape-wt-<N>` from `.vscode/` lands in `.vscode/`). Each worktree is a **sibling** of the repo: `../<repo-basename>-wt-<N>` (for `sidescape` #341 → `../sidescape-wt-341` beside the repo).

```
cd <repo>
git worktree add --detach ../<repo-basename>-wt-<N> main
cd ../<repo-basename>-wt-<N> && npm install
```

Spawn a background implementer on the runtime's general-purpose coding subagent (`generalPurpose` in Cursor; `claude` in Claude Code). Pin the model from the runtime × slice table above. For `asset`, require image generation for new rasters.

Custom agent types from `.claude/agents/` only register at session start — inline the implementer process into the prompt instead (source it from the repo's `.claude/agents/issue-implementer.md` if present). The prompt must pin: the worktree path as the only working directory; fetch the issue with `gh issue view <N>` and treat its acceptance criteria as the definition of done; read every `## Touches` `read` file before editing and treat the manifest as expected scope — verify manifest paths against the current tree first (a sibling merge may have moved them), and justify any out-of-manifest file in the PR body; branch `issue-<N>-<slug>`; test-first; hooks must pass (never `--no-verify`); run `/code-review` on its own branch before publishing and rework every Spec finding, `unmet` criterion row, and hard Standards violation; push and open a PR with `Closes #<N>`; post the verbatim Standards and Spec output as a PR comment and return a verdict table rather than the reports themselves — pasting what the reviewers wrote, never a summary of its own review; never merge. On Cursor, its review subagents must run Composer 2.5 non-fast (`composer-2.5[fast=false]`) whatever the slice type; on Claude Code, the general-purpose subagent the `code-review` skill names. Require the implementer to read the repo's instruction files and their applicable references before editing, build a companion-artifact checklist for required documentation, indexes, manifests, generated files, changelogs, and other synchronized surfaces, complete it before opening the PR, and include concrete evidence for every row in the PR body and final report. For a visually authored asset slice, the prompt also names the visual reference set and requires the final report to identify the original sample, style cohort, and concrete identity/style choices preserved in the delivered asset. For a mechanical-only asset slice, require rendered-pixel-equivalence evidence instead. Include a one-paragraph issue summary but mark the live issue body as authoritative. If a sibling issue already merged into a shared surface this one also touches (a UI panel, a module), say so explicitly — the issue text's description of that surface may predate the merge; the current file state is authoritative there, not the issue body.

### 3. Verify

When an implementer reports back: `gh pr checks <N>` green; `gh pr view <N> --json mergeable,mergeStateStatus,files` — the file set must match the issue's `## Touches` write set (`modify` + `create`). Chase any out-of-manifest file down to its PR-body justification and its diff before accepting (a required-field update to an existing test literal is fine; core changes in a content-only issue are not). An implementer claiming success is a claim; the checks are the verification.

Verify is a **claims audit**, not a code read — the one deep read of the diff
belongs to Review, and the orchestrator keeps verdicts in context, not diffs.
Re-read the live issue and build an independent checklist containing every
acceptance criterion; Review audits the implementer's verdict table against it. Require the
implementer to include the same checklist in the PR body and final report, with
concrete evidence per row: test names, code/diff locations, command output, or
a named manual native-app observation. A missing or evidence-free row sends the
PR back to the original implementer before Review. Green CI, a passing test
suite, and a scope-matching file list prove only those facts; whether each
criterion is actually met at its seams is Review's finding, not Verify's.

Audit the implementer's companion-artifact checklist the same way — rows present, and every required companion present in the diff's file list. Missing rows or absent companions send the PR back before Review; whether a present companion's meaning is stale is judged in Review.

For an asset slice, confirm the referenced artifacts exist and are reachable: the changed asset, original sample, and every selected style-cohort member for a visually authored slice; the rendered-pixel-equivalence evidence for a mechanical-only slice. Anything inaccessible sends the PR back before Review; a legitimately small cohort is not a missing reference. The visual judgment itself happens in Review — the review agent needs the actual pixels, not a prose claim about them.

### 4. Review

The **implementer** runs `/code-review` on its own branch before opening the PR, reworks its findings, and posts the verbatim reports as a **PR comment** — the deep read happens there, inside the worktree where the context is already hot, and rework lands before the PR ever reaches you. What the implementer returns to this session is a **verdict table**, not the reports.

Storage and readership are deliberately split: the reports live in the PR, where they survive compaction and you can read them without asking an agent; the orchestrator holds one table per issue across the whole wave. Audit the table against the checklists you built in Verify, and fetch the comment (`gh pr view <N> --comments`) only when a verdict is non-clean:

- **Every acceptance criterion has a verdict row** — `met` / `unmet` / `needs manual` — with an evidence pointer. A missing row, an evidence-free row, or a surviving `unmet` row sends the PR back to the original implementer; the review was incomplete, not passed.
- **A `needs manual` row routes to you** (a UI/native observation a sub-agent cannot drive): run the stated manual check yourself or require a precise recorded result, and record it on the checklist before Gate — an unperformed check or a unit test is not a substitute.
- **Every companion-artifact row has a Standards verdict** on whether its meaning is stale against the diff.
- For a visually authored asset slice, the table carries the per-asset Style alignment / Identity continuity verdicts against the verified visual reference set; every `fail` or `unverified` row goes back. For a mechanical-only asset slice, it carries the pixel-equivalence verdict, and a visual difference reclassifies the slice as visually authored — send it back with the reference set.
- **Spot-audit for depth.** Pull the full comment whenever Verify flagged anything — an out-of-manifest file, a thin test, a criterion whose seam the diff never touches — and on a sampled PR per wave regardless. A table reporting zero blocking findings on a diff Verify flagged means the review missed them; send it back naming what to look at. This is the check that a self-review was real, and it costs one comment read, not a diff.

Run Review for every slice type; asset PRs still get Spec against the issue (Standards may be empty when the diff is mostly binaries).

Treat findings as follows:

- Unreworked **Spec** findings (missing/partial, scope creep, wrong implementation, any `unmet` criterion row, any `fail`/`unverified` asset verdict row) → back to the original implementer; do not Gate.
- Unreworked **Standards** hard violations (documented repo-standard breaches) → same, rework.
- **Standards** judgement-call smells (Fowler baseline only) → include in the Gate summary for the user; do not block alone.

A complete table whose blocking rows are all reworked clear (or only judgement-call smells remain) → proceed to Gate. The implementer re-runs its own review after any rework push and posts a fresh comment; you re-audit the new table before Gate.

### 5. Gate

Merges need user approval. Ask per-PR, or accept a blanket "merge as they go green" for the wave — but a blanket approval covers merging only after Review is complete with every acceptance-criterion row `met` (or its `needs manual` check recorded), not fixes to `main` or scope deviations, which go back to the user. Surface any judgement-call Standards smells in the approval ask. Never merge a PR whose `Closes #<N>` reference would close an issue with an unmet or unverified acceptance criterion, or with unresolved Spec / hard-Standards review findings.

### 6. Merge

Remove the issue's worktree *before* merging — verification and review are already done by this point, so the worktree is no longer needed, and `--delete-branch` cannot delete a branch that's still checked out somewhere:

```
cd <repo> && git worktree remove ../<repo-basename>-wt-<N>
```

Then squash-merge **from inside the repo directory in a single command** — the shell cwd resets between calls, and `gh pr merge` from elsewhere can silently no-op:

```
cd <repo> && gh pr merge <N> --squash --delete-branch
```

Confirm `state: MERGED` afterwards, then pull `main`, run the full suite locally, and wait for the **post-merge CI run on `main`** to pass before dispatching anything on top. Two individually-green PRs can auto-merge into a broken `main` — git happily combines non-overlapping hunks into duplicate code with no conflict.

If the worktree removal step above was skipped and `--delete-branch` fails naming the worktree, that's benign (the remote branch is still gone) — just remove the worktree and `git branch -D` the local ref afterward.

### 7. Break glass

- `main` broken: fix via a branch and PR through CI, never a direct push to `main`.
- PR needs rework (failed checks, out-of-scope files, Spec / hard-Standards review findings, semantic conflict after a rebase): resume the **original** implementer via SendMessage with specific instructions — it has the context; a fresh agent starts cold. Force-pushes you explicitly directed after a rebase are expected; any other force-push is a stop-and-look.
- Implementer killed or interrupted before opening a PR (session compaction, a stop request): its process is gone, so SendMessage can't resume it — but its worktree may hold uncommitted work. Don't discard it. Dispatch a fresh subagent pointed at the same worktree and branch, telling it what's already there and to verify it (re-read the diff, rerun tests) before continuing, rather than restarting cold. Keep the same slice-type model pin as the original dispatch.
- Semantic test conflict from a merged sibling: prefer a locally-tuned test fixture in the affected PR over editing shared fixtures.

### 8. Advance

After each merge, re-check the edges: dispatch newly-unblocked issues from the updated `main` (fresh worktrees — never reuse one across issues). Loop until the wave's issues are all closed, then report: merged PRs with issue numbers and slice types, final test count on `main`, anything skipped or deviated, and the remaining queue.

---
name: orchestrate-wave
description: Orchestrate implementation of a wave of agent-ready issues — dispatch implementer subagents in worktrees, verify PRs, audit their /code-review verdicts, merge with approval.
disable-model-invocation: true
---

# Orchestrate a Wave

Drive a **wave** of agent-ready GitHub issues from open to merged. You are the orchestrator: you dispatch implementer subagents into isolated worktrees, verify their PRs, audit the `/code-review` verdicts they publish, and merge — you never implement or review diffs yourself, and implementers never merge. This session owns the repo's working tree and all merges; a concurrent `/plan-wave` session writes only to the issue tracker, so both can run at once.

## Cursor shell

Cursor sandboxes shell commands by default. Every `gh` call (`gh run list`, `gh issue view`, `gh pr checks`, `gh pr merge`, etc.) must request elevated permissions or it will fail with `Forbidden` — the sandbox cannot read the keyring token. Use `full_network` for read-only GitHub API calls; use `all` for merge, push, and other writes that need keyring-backed auth.

## Slice type

Every wave issue must declare **`## Slice type`** with exactly one of `code` or `asset`. Never invent a slice type: if `## Slice type` is missing or not exactly `code` / `asset`, stop and ask — do not dispatch.

Asset implementers must have image generation and follow the repo's asset pipeline when one exists. For visually authored output, they receive a visual reference set and preserve the original sample's identity while matching the existing cohort's style.

## Loop

Keep one ledger row per issue: issue number, slice type, write set, base SHA,
worktree, branch, implementer type and ID, state, PR number, and PR head SHA.
States advance only through `ready` → `running` → `returned` → `verified` →
`review-clear` → `approved` → `merging` → `merged` → `settled`.

### 1. Preflight

Dispatch is the last point where a manifest can be repaired cheaply, so every gate below clears before any implementer goes out.

- **Green base.** `main` clean (`git status --porcelain` empty), up to date, full test suite green, latest CI run on `main` green.
- **Wave shape.** Read the wave's issues, their native `blocked_by` edges, and any dispatch order recorded by `/plan-wave`. Record each issue's slice type on the dispatch plan.
- **Contract completeness.** Every issue contains `## Slice type`, `## Delta`, `## Contract`, `## Touches`, `## Proof`, and `## Blocked by`; `## Invariants` is optional. Stop and ask when a required section is missing. Treat each Contract claim as a **completion claim** and its Proof mapping as the required evidence.
- **Manifest resolution.** Resolve each issue's `## Touches` anchors — mechanically where the repo ships an anchor extractor (in Underline, `npm run agents:anchors -- --issue <N>`), by grep otherwise. Every existing text-file `modify`/`read` entry has a named symbol or heading that resolves; every unanchored `create` path, directory scope, and binary asset is accounted for explicitly. An unresolved named text anchor goes back to `/plan-wave` for repair rather than becoming a whole-module read in the implementer's context.
- **Asset readiness.** Classify each asset slice as visually authored or mechanical-only from the issue: a mechanical-only slice must prove rendered-pixel equivalence; any intended visual delta makes it visually authored. For every visually authored slice, build the visual reference set before dispatch — the issue's original sample plus two to five closest existing assets from the same family, atlas, role, or rendered context; when fewer than two peers exist, use every available peer and say so. If the original sample is unavailable, or no existing asset can establish the requested style, stop and ask rather than dispatching an identity- or style-blind generation.
- **Parallel-safety.** An issue is **parallel-safe** only when it is both file-disjoint *and* semantically disjoint from everything in flight. Compute file-disjointness mechanically: intersect the issues' `## Touches` write sets (`modify` + `create`) — any overlap is a conflict. Semantic disjointness still needs judgment — slices can collide through shared fixtures, test conditions, or event timing even when their manifests never overlap. Writers of the same core file are strictly serial. When in doubt, serialize.

Record every issue that clears Preflight as `ready`.

### 2. Dispatch

For each issue going out, from the current tip of `main`. **`cd <repo>` first** — worktree paths are relative to repo root, not the shell's starting cwd (a bare `sidescape-wt-<N>` from `.vscode/` lands in `.vscode/`). Each worktree is a **sibling** of the repo: `../<repo-basename>-wt-<N>` (for `sidescape` #341 → `../sidescape-wt-341` beside the repo).

```
cd <repo>
git worktree add --detach ../<repo-basename>-wt-<N> main
cd ../<repo-basename>-wt-<N> && npm install
```

Spawn a background implementer by slice type. On **Cursor**, the binding is
exact: `code` → `subagent_type: issue-implementer-code`; `asset` →
`subagent_type: issue-implementer-asset`; set `run_in_background: true`.
Omitting or substituting the type — including `generalPurpose` — is a failed
dispatch. Dispatch every parallel-ready issue together in one response, one
subagent call per issue. On **Claude Code**, inline
`docs/agents/issue-implementer.md`. Do not inline the implementer process into
the envelope.

The dispatch **envelope** (parent prompt) carries only what the preloaded agent cannot know: absolute worktree path as the only working directory; issue number; wave context — especially sibling merges that changed a shared surface this issue also touches (current file state beats stale issue text there). For a visually authored asset slice, name the visual reference set (original sample plus cohort peers). Do not cherry-pick implementer steps into the envelope — `docs/agents/issue-implementer.md` is the single process source.

Record each returned implementer ID and mark the issue `running` before doing
other work. Dispatch is complete when every selected issue has the exact worker
type, an ID, and a `running` ledger row.

### 3. Running

A background implementer remains `running` until the agent runtime reports
`completed`, `failed`, `cancelled`, or `interrupted`. Silence, elapsed time,
files appearing, commits, a pushed branch, or a missing/present PR are progress
signals, not terminal evidence.

On Cursor, end the turn and rely on the background completion notification.
Do not await or poll the subagent, its transcript, its worktree, or GitHub to
infer completion. Do not resume, replace, remove the worktree, or begin Verify
while its ledger state is `running`; the implementer may still be writing.

On terminal success, capture the final report and mark the issue `returned`.
On an explicit terminal failure, cancellation, or interruption, enter the
matching Break glass branch. Running is complete for an issue only when that
implementer has an authoritative terminal state recorded; returned siblings
may advance while other parallel workers remain `running`.

### 4. Verify

When an implementer reports back: `gh pr checks <N>` green; `gh pr view <N> --json mergeable,mergeStateStatus,files` — the file set must match the issue's `## Touches` write set (`modify` + `create`). Chase any out-of-manifest file down to its PR-body justification and its diff before accepting (a required-field update to an existing test literal is fine; core changes in a content-only issue are not). When the same *kind* of file keeps arriving out of manifest across a wave — a CLI module beside the library it wraps, a CLI test beside a library test — accept the PR on its justification but treat the pattern as a planning defect: fix the remaining issues' manifests before dispatching them, rather than paying the same rediscovery once per slice. An implementer claiming success is a claim; the checks are the verification.

Verify is a **claims audit**, not a code read — the one deep read of the diff
belongs to Review, and the orchestrator keeps verdicts in context, not diffs.
Re-read the live issue and build an independent checklist containing every
completion claim and its required Proof; Review audits the implementer's verdict table against it. Require the
implementer to include the same checklist in the PR body and final report, with
concrete evidence per row: test names, code/diff locations, command output, or
a named manual native-app observation. A missing or evidence-free row sends the
PR back to the original implementer before Review. Green CI, a passing test
suite, and a scope-matching file list prove only those facts; whether each
completion claim is actually met at its seams is Review's finding, not Verify's.

Audit the implementer's companion-artifact checklist the same way — rows present, and every required companion present in the diff's file list. Missing rows or absent companions send the PR back before Review; whether a present companion's meaning is stale is judged in Review.

For an asset slice, confirm the referenced artifacts exist and are reachable: the changed asset, original sample, and every selected style-cohort member for a visually authored slice; the rendered-pixel-equivalence evidence for a mechanical-only slice. Anything inaccessible sends the PR back before Review; a legitimately small cohort is not a missing reference. The visual judgment itself happens in Review — the review agent needs the actual pixels, not a prose claim about them.

When every Verify audit above passes, record the current PR head SHA and mark
the issue `verified`.

### 5. Review

The **implementer** runs `/code-review` on its own branch before opening the PR, reworks its findings, and posts the verbatim reports as a **PR comment** — the deep read happens there, inside the worktree where the context is already hot, and rework lands before the PR ever reaches you. What the implementer returns to this session is a **verdict table**, not the reports.

Storage and readership are deliberately split: the reports live in the PR, where they survive compaction and you can read them without asking an agent; the orchestrator holds one table per issue across the whole wave. Audit the table against the checklists you built in Verify, and fetch the comment (`gh pr view <N> --comments`) only when a verdict is non-clean:

- **Every completion claim has a verdict row** — `met` / `unmet` / `needs manual` — with an evidence pointer satisfying its Proof mapping. A missing row, an evidence-free row, or a surviving `unmet` row sends the PR back to the original implementer; the review was incomplete, not passed.
- **A `needs manual` row routes to you** (a UI/native observation a sub-agent cannot drive): run the stated manual check yourself or require a precise recorded result, and record it on the checklist before Gate — an unperformed check or a unit test is not a substitute.
- **Every companion-artifact row has a Standards verdict** on whether its meaning is stale against the diff.
- For a visually authored asset slice, the table carries the per-asset Style alignment / Identity continuity verdicts against the verified visual reference set; every `fail` or `unverified` row goes back. For a mechanical-only asset slice, it carries the pixel-equivalence verdict, and a visual difference reclassifies the slice as visually authored — send it back with the reference set.
- **Spot-audit for depth.** Pull the full comment whenever Verify flagged anything — an out-of-manifest file, a thin test, a completion claim whose seam the diff never touches — and on a sampled PR per wave regardless. A table reporting zero blocking findings on a diff Verify flagged means the review missed them; send it back naming what to look at. This is the check that a self-review was real, and it costs one comment read, not a diff.

Run Review for every slice type; asset PRs still get Spec against the issue (Standards may be empty when the diff is mostly binaries).

Treat findings as follows:

- Unreworked **Spec** findings (missing/partial, scope creep, wrong implementation, any `unmet` completion-claim row, any `fail`/`unverified` asset verdict row) → back to the original implementer; do not Gate.
- Unreworked **Standards** hard violations (documented repo-standard breaches) → same, rework.
- **Standards** judgement-call smells (Fowler baseline only) → include in the Gate summary for the user; do not block alone.

A complete table whose blocking rows are all reworked clear (or only judgement-call smells remain) → proceed to Gate. The implementer re-runs its own review after any rework push and posts a fresh comment; you re-audit the new table before Gate.

Count the rework rounds per PR. When the same finding survives a second send-back, the Contract is ambiguous rather than the implementation wrong: stop dispatching rework and bring the user the finding plus both attempts, since a third round spends a fresh implementer context re-deriving a question only the issue text can answer.

When the complete table is clear and every required manual result is recorded,
mark the issue `review-clear`.

### 6. Gate

Merges need user approval. Ask per-PR, or accept a blanket "merge as they go green" for the wave — but a blanket approval covers merging only after Review is complete with every completion-claim row `met` (or its `needs manual` check recorded), not fixes to `main` or scope deviations, which go back to the user. Surface any judgement-call Standards smells in the approval ask. Never merge a PR whose `Closes #<N>` reference would close an issue with an unmet or unverified completion claim, or with unresolved Spec / hard-Standards review findings.

Treat "merge when CI is green" and equivalent wording as blanket approval only;
it satisfies `approved`, not the other merge gates.

When approval exists for a `review-clear` issue, mark it `approved`.

### 7. Merge

An issue is **merge-ready** only when all of these are recorded in its ledger:

- implementer terminal success;
- PR number and current head SHA;
- CI green for that exact head SHA;
- GitHub reports the PR mergeable;
- Verify complete;
- Review clear, including every required manual result;
- user approval, per-PR or blanket.

Re-fetch the PR head SHA, checks, and mergeability immediately before merging;
if the head changed, return to Verify. CI green alone is never merge-ready.
Mark the issue `merging` only after this final predicate passes.

Squash-merge from inside the repo without deleting the checked-out branch, then
confirm GitHub reports `state: MERGED`:

```
cd <repo> && gh pr merge <N> --squash
```

After merge confirmation, mark the issue `merged`, remove the terminal implementer's worktree, and
delete its local branch; delete the remote branch if the repository did not do
so automatically. A merge failure leaves the worktree intact for recovery.

Then pull `main`, run the full suite locally, and wait for the **post-merge CI
run on `main` for that merge SHA** to pass before dispatching dependent work.
Independent siblings already running from the approved base may finish. Two
individually-green PRs can auto-merge into a broken `main` — git happily
combines non-overlapping hunks into duplicate code with no conflict. Mark the
issue `settled` only after both local and post-merge checks pass.

### 8. Break glass

- `main` broken: fix via a branch and PR through CI, never a direct push to `main`.
- PR needs rework (failed checks, out-of-scope files, Spec / hard-Standards review findings, semantic conflict after a rebase): resume the **original** implementer via SendMessage with specific instructions — it has the context; a fresh agent starts cold. Force-pushes you explicitly directed after a rebase are expected; any other force-push is a stop-and-look.
- Implementer killed or interrupted before opening a PR (session compaction, a stop request): its process is gone, so SendMessage can't resume it — but its worktree may hold uncommitted work. Don't discard it. Spawn a fresh implementer from the same `.cursor/agents/issue-implementer-*.md` pointed at the same worktree and branch, telling it what's already there and to verify it (re-read the diff, rerun tests) before continuing, rather than restarting cold.
- Implementer returns **blocked** (an anchor that resolves to nothing, an open predecessor, a `needs manual` observation nobody can perform) or opens a `Diagnostic:` draft PR: the defect is in the spec, so route the named blocker to `/plan-wave` for repair, leave the issue open, remove its worktree, and carry it as **deferred** in Advance. A `Diagnostic:` draft PR stays open and unmerged; it never carries `Closes #<N>`.
- Semantic test conflict from a merged sibling: prefer a locally-tuned test fixture in the affected PR over editing shared fixtures.

### 9. Advance

After each merge, re-check the edges: dispatch newly-unblocked issues from the updated `main` (fresh worktrees — never reuse one across issues). Loop until every wave issue is closed or deferred, then report: merged PRs with issue numbers and slice types, final test count on `main`, deferred issues with the blocker each is waiting on, anything skipped or deviated, and the remaining queue. Close with `git worktree list` empty of wave worktrees.

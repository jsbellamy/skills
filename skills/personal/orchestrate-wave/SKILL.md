---
name: orchestrate-wave
description: Orchestrate implementation of a wave of agent-ready issues — dispatch implementer subagents in worktrees, verify PRs, run /code-review, merge with approval.
disable-model-invocation: true
---

# Orchestrate a Wave

Drive a **wave** of agent-ready GitHub issues from open to merged. You are the orchestrator: you dispatch implementer subagents into isolated worktrees, verify their PRs, run `/code-review`, and merge — you never implement issues yourself, and implementers never merge. This session owns the repo's working tree and all merges; a concurrent `/plan-wave` session writes only to the issue tracker, so both can run at once.

## Cursor shell

Cursor sandboxes shell commands by default. Every `gh` call (`gh run list`, `gh issue view`, `gh pr checks`, `gh pr merge`, etc.) must request elevated permissions or it will fail with `Forbidden` — the sandbox cannot read the keyring token. Use `full_network` for read-only GitHub API calls; use `all` for merge, push, and other writes that need keyring-backed auth.

## Slice type → model

Every wave issue must declare **`## Slice type`** with exactly one of `code` or `asset`. Detect the host runtime once (Cursor vs Claude Code) and pin implementers from this table — never cross-wire models across runtimes:

| Slice | Cursor | Claude Code |
| ----- | ------ | ----------- |
| **code slice** (`code`) | Composer 2.5 (`composer-2.5`, never fast) | Sonnet (`sonnet`, reasoning ≤ high) |
| **asset slice** (`asset`) | Grok 4.5 high (`cursor-grok-4.5-high`) | Grok 4.5 high if available; otherwise ask before dispatching |

Asset implementers must have image generation and follow the repo's asset pipeline when one exists. Never spawn Fable or above. Never invent a slice type: if `## Slice type` is missing or not exactly `code` / `asset`, stop and ask — do not dispatch.

## Loop

### 1. Preflight

In the repo: `main` clean (`git status --porcelain` empty), up to date, full test suite green, latest CI run on `main` green. Read the wave's issues and their native `blocked_by` edges, plus any dispatch order recorded by `/plan-wave`. For each issue, read `## Slice type` and record it on the dispatch plan. An issue is **parallel-safe** only when it is both file-disjoint *and* semantically disjoint from everything in flight — slices can collide through shared fixtures, test conditions, or event timing even when their files never overlap. Writers of the same core file are strictly serial. When in doubt, serialize.

### 2. Dispatch

For each issue going out, from the current tip of `main`. **`cd <repo>` first** — worktree paths are relative to repo root, not the shell's starting cwd (a bare `sidescape-wt-<N>` from `.vscode/` lands in `.vscode/`). Each worktree is a **sibling** of the repo: `../<repo-basename>-wt-<N>` (for `sidescape` #341 → `../sidescape-wt-341` beside the repo).

```
cd <repo>
git worktree add --detach ../<repo-basename>-wt-<N> main
cd ../<repo-basename>-wt-<N> && npm install
```

Spawn a background implementer on the runtime's general-purpose coding subagent (`generalPurpose` in Cursor; `claude` in Claude Code). Pin the model from the runtime × slice table above. For `asset`, require image generation for new rasters.

Custom agent types from `.claude/agents/` only register at session start — inline the implementer process into the prompt instead (source it from the repo's `.claude/agents/issue-implementer.md` if present). The prompt must pin: the worktree path as the only working directory; fetch the issue with `gh issue view <N>` and treat its acceptance criteria as the definition of done; branch `issue-<N>-<slug>`; test-first; hooks must pass (never `--no-verify`); push and open a PR with `Closes #<N>`; never merge. Include a one-paragraph issue summary but mark the live issue body as authoritative. If a sibling issue already merged into a shared surface this one also touches (a UI panel, a module), say so explicitly — the issue text's description of that surface may predate the merge; the current file state is authoritative there, not the issue body.

### 3. Verify

When an implementer reports back: `gh pr checks <N>` green; `gh pr view <N> --json mergeable,mergeStateStatus,files` — the file set must match the issue's scope. Chase any file outside scope down to its diff before accepting (a required-field update to an existing test literal is fine; core changes in a content-only issue are not). An implementer claiming success is a claim; the checks are the verification.

Acceptance criteria are a separate, required verification gate. Re-read the live
issue and make an independent checklist containing every acceptance criterion.
Require the implementer to include the same checklist in the PR body and final
report, with concrete evidence per row: test names, code/diff locations,
command output, or a named manual native-app observation. Independently inspect
the implementation and tests at the seams each criterion names. Green CI, a
passing test suite, and a scope-matching file list prove only those facts; they
never prove omitted or visual/integration requirements. For a UI/native/manual
criterion, run the stated manual check or require a precise recorded result;
do not accept an unperformed manual check or a unit test as a substitute. Any
missing, contradicted, untested-at-the-right-seam, or merely asserted row sends
the PR back to the original implementer for rework.

### 4. Review

After Verify passes, the **orchestrator** runs `/code-review` on the PR branch — not the implementer, and not as a substitute for the acceptance-criteria gate above. Fixed point is `main` (`git diff main...HEAD`); Spec source is the live issue body (already fetched for Verify). Follow the `code-review` skill: Standards and Spec as parallel sub-agents, reports kept under separate headings.

On Cursor, both review subagents must run Composer 2.5 non-fast (`composer-2.5`, never fast) — same pin as `/implement`. On Claude Code, use the same general-purpose subagent the `code-review` skill names. Run Review for every slice type; asset PRs still get Spec against the issue (Standards may be empty when the diff is mostly binaries).

Treat findings as follows:

- **Spec** findings (missing/partial, scope creep, wrong implementation) → send back to the original implementer for rework; do not Gate.
- **Standards** hard violations (documented repo-standard breaches) → same, rework.
- **Standards** judgement-call smells (Fowler baseline only) → include in the Gate summary for the user; do not block alone.

Empty findings (or only judgement-call smells) → proceed to Gate. Re-run Review after any rework push before Gate.

### 5. Gate

Merges need user approval. Ask per-PR, or accept a blanket "merge as they go green" for the wave — but a blanket approval covers merging only after the acceptance-criteria gate **and** Review are complete, not fixes to `main` or scope deviations, which go back to the user. Surface any judgement-call Standards smells in the approval ask. Never merge a PR whose `Closes #<N>` reference would close an issue with an unmet or unverified acceptance criterion, or with unresolved Spec / hard-Standards review findings.

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

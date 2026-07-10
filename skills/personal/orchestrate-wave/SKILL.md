---
name: orchestrate-wave
description: Orchestrate implementation of a wave of agent-ready issues — dispatch implementer subagents in worktrees, verify PRs, merge with approval.
disable-model-invocation: true
---

# Orchestrate a Wave

Drive a **wave** of agent-ready GitHub issues from open to merged. You are the orchestrator: you dispatch implementer subagents into isolated worktrees, verify their PRs, and merge — you never implement issues yourself, and implementers never merge. This session owns the repo's working tree and all merges; a concurrent `/plan-wave` session writes only to the issue tracker, so both can run at once.

Subagent policy: every subagent runs on **Sonnet** with reasoning effort **≤ high** — state "do not exceed high reasoning effort" in each prompt. Never spawn a subagent on Fable or above.

## Loop

### 1. Preflight

In the repo: `main` clean (`git status --porcelain` empty), up to date, full test suite green, latest CI run on `main` green. Read the wave's issues and their native `blocked_by` edges, plus any dispatch order recorded by `/plan-wave`. Build the dispatch plan: an issue is **parallel-safe** only when it is both file-disjoint *and* semantically disjoint from everything in flight — slices can collide through shared fixtures, test conditions, or event timing even when their files never overlap. Writers of the same core file are strictly serial. When in doubt, serialize.

### 2. Dispatch

For each issue going out, from the current tip of `main`:

```
git worktree add --detach <repo>-wt-<N> main
cd <repo>-wt-<N> && npm install
```

Spawn a background subagent with `subagent_type: "claude"`, `model: "sonnet"`. Custom agent types from `.claude/agents/` only register at session start — inline the implementer process into the prompt instead (source it from the repo's `.claude/agents/issue-implementer.md` if present). The prompt must pin: the worktree path as the only working directory; fetch the issue with `gh issue view <N>` and treat its acceptance criteria as the definition of done; branch `issue-<N>-<slug>`; test-first; hooks must pass (never `--no-verify`); push and open a PR with `Closes #<N>`; never merge. Include a one-paragraph issue summary but mark the live issue body as authoritative. If a sibling issue already merged into a shared surface this one also touches (a UI panel, a module), say so explicitly — the issue text's description of that surface may predate the merge; the current file state is authoritative there, not the issue body.

### 3. Verify

When an implementer reports back: `gh pr checks <N>` green; `gh pr view <N> --json mergeable,mergeStateStatus,files` — the file set must match the issue's scope. Chase any file outside scope down to its diff before accepting (a required-field update to an existing test literal is fine; core changes in a content-only issue are not). An implementer claiming success is a claim; the checks are the verification.

### 4. Gate

Merges need user approval. Ask per-PR, or accept a blanket "merge as they go green" for the wave — but a blanket approval covers merging only, not fixes to `main` or scope deviations, which go back to the user.

### 5. Merge

Squash-merge **from inside the repo directory in a single command** — the shell cwd resets between calls, and `gh pr merge` from elsewhere can silently no-op:

```
cd <repo> && gh pr merge <N> --squash --delete-branch
```

Confirm `state: MERGED` afterwards. A branch-delete failure naming the worktree is benign (the remote branch is gone); then remove the worktree, pull `main`, run the full suite locally, and wait for the **post-merge CI run on `main`** to pass before dispatching anything on top. Two individually-green PRs can auto-merge into a broken `main` — git happily combines non-overlapping hunks into duplicate code with no conflict.

### 6. Break glass

- `main` broken: fix via a branch and PR through CI, never a direct push to `main`.
- PR needs rework (failed checks, out-of-scope files, semantic conflict after a rebase): resume the **original** implementer via SendMessage with specific instructions — it has the context; a fresh agent starts cold. Force-pushes you explicitly directed after a rebase are expected; any other force-push is a stop-and-look.
- Implementer killed or interrupted before opening a PR (session compaction, a stop request): its process is gone, so SendMessage can't resume it — but its worktree may hold uncommitted work. Don't discard it. Dispatch a fresh subagent pointed at the same worktree and branch, telling it what's already there and to verify it (re-read the diff, rerun tests) before continuing, rather than restarting cold.
- Semantic test conflict from a merged sibling: prefer a locally-tuned test fixture in the affected PR over editing shared fixtures.

### 7. Advance

After each merge, re-check the edges: dispatch newly-unblocked issues from the updated `main` (fresh worktrees — never reuse one across issues). Loop until the wave's issues are all closed, then report: merged PRs with issue numbers, final test count on `main`, anything skipped or deviated, and the remaining queue.

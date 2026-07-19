---
name: code-review
description: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/PRD asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to "review since X".
---

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** — does the code conform to this repo's documented coding standards?
- **Spec** — does the code faithfully implement the originating issue / PRD / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

The issue tracker should have been provided to you — run `/setup-matt-pocock-skills` if `docs/agents/issue-tracker.md` is missing.

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. If they didn't specify one, ask for it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here — not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) — fetch via the workflow in `docs/agents/issue-tracker.md`.
2. A path the user passed as an argument.
3. A PRD/spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify standards sources and companion artifacts

Read the repo's instruction files (`AGENTS.md`, `CLAUDE.md`, and any references they point to for the changed areas), plus anything else that documents how work must be completed, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

Build a **companion-artifact checklist** from those instructions and the diff: for every changed behavior or artifact, list the documentation, indexes, manifests, generated files, changelogs, or other synchronized surfaces the repo requires. Check the required surfaces even when they are absent from the diff — an omitted companion file has no hunk to inspect. Where a companion document exists, compare its meaning with the changed behavior rather than accepting its presence as proof that it is current.

The checklist is complete when every changed behavior and artifact has been tested against every applicable repository instruction, with each required companion surface marked current, missing, or stale. A missing or stale required companion is a documented-standard violation, not a judgement-call smell.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below — a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation — and, like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Build the visual reference set for asset changes

Inspect asset diffs for a visual delta first. For a mechanical recompression, atlas repack, or export-only change, compare the rendered pixels with the fixed-point version. If they are visually identical, record pixel equivalence and leave identity/style review to any separate visually changed assets; Standards still enforces documented pipeline rules. Activate this branch for every remaining generated or authored raster, sprite, sprite sheet, or other visual game asset whose rendered appearance is new or changed, including visually authored output in an asset slice. The asset guard belongs to **Spec**: it asks whether the delivered visual is the intended thing.

Build a **visual reference set** before spawning reviewers:

- The changed asset rendered from `HEAD` at inspectable resolution.
- The original sample or generation reference named by the spec, issue, attachments, or repository. This is the identity reference.
- Two to five closest existing assets from the same family, atlas, role, or rendered context. This is the style cohort; choose by visual role, not merely filename proximity. If fewer exist, use all of them and say so.

The Spec reviewer must inspect the actual images, not infer their appearance from filenames, prompts, metadata, or binary diffs. For every changed asset, require a verdict table with:

- **Style alignment — pass / fail / unverified.** Compare silhouette language, proportions and scale, outline treatment, palette and contrast, shading and lighting, texture, perspective, and detail density against the style cohort, using only dimensions relevant to that asset.
- **Identity continuity — pass / fail / unverified.** Compare the defining silhouette, features, proportions, costume or props, markings, and dominant/accent colors against the original sample. A difference explicitly required by the spec is not drift.

Each verdict names its references and cites concrete visual matches or mismatches. A missing identity reference, an unavailable asset, or a reviewer unable to inspect the pixels produces `unverified`, never an assumed pass. Every `fail` or `unverified` row is a Spec finding.

### 5. Spawn both sub-agents in parallel

Detect the host runtime once (Cursor vs Claude Code).

Send a single message with two parallel sub-agent spawns on the general-purpose coding subagent (`generalPurpose` in Cursor; `general-purpose` in Claude Code).

On **Cursor**, pass `model: "composer-2.5[fast=false]"` on both spawns — never `composer-2.5-fast` or plain `composer-2.5` (the backend may upgrade to fast).

**Standards sub-agent prompt** — include:

- The full diff command and commit list.
- The list of standards-source files and the companion-artifact checklist from step 3, **plus the smell baseline from step 3** pasted in full — the sub-agent has no other access to it. The standards-source list is mandatory in the prompt: when step 3 found nothing, write "no documented standards found" there, so a baseline-only review is always an explicit, reported condition rather than a silent default.
- The brief: "Report (a) every place the diff violates a documented standard, including every missing or stale companion artifact: cite the standard (file + rule) and the triggering change when the required artifact has no hunk; and (b) any baseline smell you spot: name it and quote the hunk. Verify companion documents semantically, not by filename presence. Distinguish hard violations from judgement calls — documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** — include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- For assets that activate the visual-fidelity branch, the visual reference set from step 4 and the requirement to inspect each image and return the Style alignment / Identity continuity verdict table before reporting findings. A mechanical-only, pixel-equivalent diff carries its equivalence evidence instead and requires no original-sample/cohort verdicts.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong; and, for assets in the visual-fidelity branch, (d) every failed or unverified verdict row. Quote the spec line for each non-visual finding; for visual findings, name the changed asset and references and cite concrete visible evidence. Under 400 words, excluding the required asset verdict table."

If the spec is missing and no asset activates the visual-fidelity branch, skip the Spec sub-agent and note this in the final report. A pixel-equivalent mechanical-only diff does not activate the branch. Visually changed assets never skip the Spec sub-agent: missing original samples or inaccessible pixels are `unverified` visual-fidelity findings.

### 6. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings — the two axes are deliberately separate (see _Why two axes_).

End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes — that's the reranking the separation exists to prevent.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.

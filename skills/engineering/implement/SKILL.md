---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Before editing, read the repo's instruction files (`AGENTS.md`, `CLAUDE.md`, and any references they point to for the affected areas). Build a **companion-artifact checklist** from those instructions and the planned behavior changes: required documentation, indexes, manifests, generated files, changelogs, and other synchronized surfaces. Keep the checklist current as the implementation changes shape.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Before review, complete the companion-artifact checklist. Verify each required document against the implemented behavior; a touched filename is not evidence that its meaning is current. The implementation is incomplete while any required companion is missing or stale.

Once done, use /code-review to review the work. On Cursor, its two parallel review subagents must run Composer 2.5 non-fast (`composer-2.5[fast=false]`).

Commit your work to the current branch.

---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Before editing, read the repo's instruction files (`AGENTS.md`, `CLAUDE.md`, and any references they point to for the affected areas). Build a **companion-artifact checklist** from those instructions and the planned behavior changes: required documentation, indexes, manifests, generated files, changelogs, and other synchronized surfaces. Keep the checklist current as the implementation changes shape.

Call the Skill tool with "tdd" where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Before review, complete the companion-artifact checklist. Verify each required document against the implemented behavior; a touched filename is not evidence that its meaning is current. The implementation is incomplete while any required companion is missing or stale.

Once done, call the Skill tool with "code-review" to review the work.

Commit your work to the current branch.

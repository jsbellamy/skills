---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work. On Cursor, its two parallel review subagents must run Composer 2.5 non-fast (`composer-2.5[fast=false]`).

Commit your work to the current branch.

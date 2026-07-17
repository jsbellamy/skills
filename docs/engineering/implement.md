Quickstart:

```bash
npx skills add mattpocock/skills --skill=implement
```

```bash
npx skills update implement
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/implement)

## What it does

`implement` builds the work described in a spec or a set of tickets — driving it through test-driven development, typechecking, the full test suite, and the repo's required companion artifacts before handing off to review and committing to the current branch.

It does **not** decide what to build. The spec is already settled and the seams are already agreed; `implement` executes that plan rather than reopening it. It is the hands, not the head — the thinking happened upstream.

## When to reach for it

You invoke this by typing `/implement` — the agent won't reach for it on its own.

Reach for it once the work is written down as a spec or split into tickets and you're ready to turn that into code. If the spec doesn't exist yet, write it first — for that, use [to-spec](https://aihero.dev/skills-to-spec), or [to-tickets](https://aihero.dev/skills-to-tickets) to break a spec into tickets. If you just want to build something test-first without a full spec, drop to [tdd](https://aihero.dev/skills-tdd) directly.

## Pre-agreed seams

The idea `implement` runs on is the **seam** — the stable interface a feature is tested at, chosen before any code is written. It doesn't invent seams mid-build; it uses the ones already picked (during [to-spec](https://aihero.dev/skills-to-spec)) and writes tests against them via [tdd](https://aihero.dev/skills-tdd). Working at pre-agreed seams is what keeps the implementation honest: the tests target something durable, so the code underneath can move without the tests moving.

Around that core it keeps the loop tight. Before editing, it reads the repo instructions and builds a **companion-artifact checklist** for required docs, indexes, manifests, generated files, changelogs, and other synchronized surfaces. It typechecks often, runs single test files as it goes, runs the whole suite once at the end, and verifies each companion's meaning against the implemented behavior before closing out with a [code-review](https://aihero.dev/skills-code-review) pass (on Cursor, its two parallel review subagents run Composer 2.5 non-fast) and a commit to the current branch.

The implementation is not complete while any required companion is missing or stale. Touching a documentation filename is not enough; its content has to describe the behavior that was actually built.

## Where it fits

`implement` is the build step near the end of the main chain, just before the review:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

Reach for it after the work has been specced and sequenced, not before. Its key neighbours are [to-tickets](https://aihero.dev/skills-to-tickets), which produces the tickets — each declaring its blocking edges — that it works through, and [tdd](https://aihero.dev/skills-tdd), which it drives internally to write the tests at each seam before running its own [code-review](https://aihero.dev/skills-code-review) pass and committing. When you're unsure which skill or flow fits, [ask-matt](https://aihero.dev/skills-ask-matt) routes you.

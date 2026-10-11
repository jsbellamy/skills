# Decision Register Format

The register is two layers: an **index** at `docs/DECISIONS.md` and one **living topic file** per subject under `docs/decisions/`. The index is what a cold-start agent reads first; a topic file is what it reads for the rules its task touches. Each topic's history sits apart, in a same-named **changelog** under `docs/decisions/changelog/`, which is audit history and on no read path. Nothing in the register is dated except a changelog.

## Index: `docs/DECISIONS.md`

```md
# Decisions

Locked product and technical choices, as they hold now. One topic file per
line under `docs/decisions/`. Each states its rules once, with no dates and
no superseded wording. Their history is audit history, kept apart under
`docs/decisions/changelog/` so that reading a topic never loads it.

Read this index, then only the topic files your task touches.

## Topics

- `docs/decisions/ordering.md` — Ordering: order states, cancellation, and partial fulfilment.
- `docs/decisions/billing.md` — Billing: invoice timing, currencies, and refunds.
```

One line per topic: the path, the topic name, and a clause naming what it covers so a reader can pick topics without opening them. Keep the index to one screen; if it will not fit, topics are too fine.

## Topic file: `docs/decisions/<topic>.md`

```md
# Ordering

An Order is cancelled whole. Partial cancellation is a Return against the
shipped lines and is handled by Fulfilment (`docs/decisions/fulfilment.md`).

An Order holds at most one payment method. A second method is a second Order.

Rationale: `docs/adr/0003-one-payment-method-per-order.md`
```

The topic ends at its body.

## Changelog: `docs/decisions/changelog/<topic>.md`

```md
# Ordering — changelog

Audit history for `docs/decisions/ordering.md`: what changed and why, newest
first. The topic body is what holds; nothing here is read to learn a current
rule.

- 2026-03-02 — Partial cancellation moved to Returns; the two flows shared no
  state and the Order state machine was carrying Fulfilment's branches.
- 2026-01-14 — One payment method per Order (ADR-0003).
```

Rules for the body:

- **State the rule as it holds now**, once, as something a reader can apply. No dates, no "previously", no "supersedes". When a rule changes, the old wording is deleted.
- **Rationale is a line or an ADR link**, not an argument. Genuine alternatives and trade-offs go in an ADR; the topic links it.
- **Balance and tuning numbers are not rules.** Name the code that holds them instead of copying them in.
- **Cross-reference by path.** A rule lives in one topic; other topics point at it.
- **Anchorable.** Headings inside a topic are optional; when a topic grows sections, give them stable names so an issue can anchor `docs/decisions/<topic>.md § <Heading>`.

Rules for the changelog:

- **One line per change**: date, what changed, why in a sentence or an ADR link. Newest first.
- **It is history, not authority.** A reader who wants the current rule reads the topic. Do not put rules here that are not also in the topic.
- **Off the read path.** No Contract, manifest, or routing doc names a changelog, and an implementer never opens one; it exists for audit.

## Sizing

A topic is the unit of ownership: it has its own git history and its own line in an issue's file manifest, so two waves touching different topics never share a write. That only holds while topics are cohesive. A topic every wave edits, or one past roughly a thousand words, is a shallow topic carrying several subjects. Split it along the seam the edits keep crossing.

## Converting a dated log

When a repo already keeps a single dated, append-only `docs/DECISIONS.md`:

1. Group entries by subject and write each subject's current rule with supersession applied, reading every later entry's `Supersedes:` line against the earlier text.
2. Distribute the log into the topics' changelogs: each entry's date, title, and `Rationale:` becomes one line in the changelog of every topic it built, newest first. This is where the why survives.
3. Replace `docs/DECISIONS.md` with the index and delete the log. Git is the archive: the old wording is one `git log --follow` away and no agent greps it by accident. Do not park the log under `docs/history/`: a stale rule that a grep can land on mid-file reads as current, banner or not.
4. Re-point every anchor that named a dated entry to the topic file.

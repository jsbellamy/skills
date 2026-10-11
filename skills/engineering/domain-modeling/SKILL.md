---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `CONTEXT.md` for vocabulary is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md                        ← glossary
├── docs/
│   ├── DECISIONS.md                  ← index of the decision register
│   ├── decisions/                    ← one living topic file per subject
│   │   ├── ordering.md
│   │   └── billing.md
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/DECISIONS.md` exists, create the index and the first topic file when the first product or tech choice is locked. If no `docs/adr/` exists, create it when the first ADR is needed.

When `docs/agents/domain.md` exists, read it first for repo-specific authority paths.

## Authority routing

Route each crystallised pin to one **authority** file — the destination the next cold-start agent reads. Capture inline; don't batch pins for end of session.

| Pin | Destination |
| --- | --- |
| Canonical term or concept boundary | `CONTEXT.md` |
| Locked product or tech choice (behavior, scope, feel, stack) | The `docs/decisions/` topic file that the index `docs/DECISIONS.md` routes to; a new topic only when none fits. Format in [DECISIONS-FORMAT.md](./DECISIONS-FORMAT.md) |
| Trade-off with genuine alternatives | `docs/adr/` — only when all three criteria under **Offer ADRs sparingly** are met |

Wave-scoped constants belong in the issue `## Contract`, not an authority file. Done when every resolved pin is written to its row's destination (or an ADR was offered and declined).

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Keep the decision register live

A locked choice is a rule that holds now, and the register is where the next cold-start agent reads it. Record it as a rule, not as an event:

- **Edit in place.** Find the topic in `docs/DECISIONS.md`, open that file, and rewrite the rule so the body states the new choice once. Delete the wording it replaces — do not annotate it, date it, or write "supersedes" prose beside it. The body carries no dates.
- **Log in the topic's changelog** — `docs/decisions/changelog/<topic>.md`, the same name as the topic; a new topic gets a new changelog. One line at the top: date, what changed, why in a sentence (or the ADR link). This is where the sequence and the reasoning live, in a file of its own, so reading a topic never loads its history. The changelog is audit history: nothing reads it to learn a rule, and no read path — a Contract, a manifest, a routing doc — names it.
- **A rule that spans topics is one rule.** Put it under the topic whose seam it constrains and cross-reference from the others by file path; do not restate it.
- **Split a shallow topic.** A topic every session edits, or one past roughly a thousand words, is carrying several subjects. Split it along the seam the edits keep crossing, add the index lines, and move the changelog entries with their rules into each new topic's changelog.

Never keep a dated, append-only decisions log as the authority. It reads as current to whoever is anchored at one entry, later entries silently override earlier ones, and every reader has to rebuild the supersession graph in their head. When a repo has one, propose converting it: consolidate into topic files with supersession applied, distribute each entry's rationale into its topic's changelog, and delete the log — git is the archive.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).

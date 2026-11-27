# Demo-ready spec: design

## Overview

This slice finishes the meal rules, adds companion progression, and builds the demo path on top of the foundation shell. No contract changes: every type comes from `src/contracts/index.ts`.

## Architecture

```
src/domain/meals/        fingerprint.ts, evaluate.ts (pure), wait.ts, ledger.ts (storage + atomic XP)
src/domain/companions/   stages.ts (levels, stages, applyXp), roster.ts (names and species)
src/app/                 ProfileProvider (React state over the ledger), deals adapter, demo seed, sample receipts
src/ui/                  Sprite engine, XpBar, EvolutionOverlay, BottomNav, theme.css
src/features/<feature>/  Screens: companion, deals, feed, savings, settings
```

Domain code has no React. The ledger is the only writer of meals and companion XP.

## Components and interfaces

- `evaluateMeal(extraction, prior, rules, nowMs): MealDecision` is the pure evaluator the acceptance tests call. `evaluateMealClaim({ extraction, nowMs, history, rules })` wraps it with an object argument.
- `createMealLedger({ rules, storage })` where storage is `"memory"` or `"indexeddb"`. It exposes `submit`, `countedMeals`, `totalXp`, `snapshot`, `adopt`, `setActive`, `setHalloween`, `replaceAll` and `reset`.
- `DealsAdapter` has `getFeed()`. `mockDealsAdapter` reads the bundled fixtures. A real adapter would implement the same interface.
- `applyXp(state, xp, halloween)` returns the new `CompanionState` plus `leveledUp`, `evolved`, `fromStage` and `toStage`.

## Data models

Stored in one IndexedDB database named `hangori`:

| Store | Key | Notes |
|---|---|---|
| `meals` | `id` | Unique index on `fingerprint` enforces "a receipt counts once" in durable storage |
| `companions` | `id` | One `CompanionState` per hatched companion |
| `meta` | `key` | One row, `profile`: `activeId`, `halloween`, `demo`, `sampleEpochMs` |

XP thresholds (default rules): stage 2 at 20 XP, stage 3 at 50, stage 4 at 100. One level per 10 XP.

## Correctness properties

1. The sum of companion XP equals the sum of `xpAwarded` over counted meals, for any sequence of submissions.
2. XP never decreases after any submission.
3. A companion's stage is a monotonic function of its XP.
4. Every sprite grid is 16 by 16 and uses only palette keys.
5. The seeded profile obeys the meal rules and keeps property 1.
6. The meal acceptance and property tests in `tests/acceptance/` pass unchanged.

## Error handling

- Submitting with no hatched companion throws before the transaction and nothing is written.
- A failing transaction aborts and leaves meals and XP untouched.
- A missing IndexedDB (private modes) falls back to a visible error card on the Companion screen, not a blank page.

## Testing strategy

- Acceptance tests (already committed, test-first) cover the evaluator.
- Vitest unit and property tests cover stages, the ledger (memory and fake-indexeddb), the seed and the sprites.
- Playwright: `e2e/smoke.spec.ts` for every screen, `e2e/demo-walk.spec.ts` for the 60-second path.
- `e2e/screenshots.spec.ts` writes README screenshots when `SCREENSHOTS=1`.

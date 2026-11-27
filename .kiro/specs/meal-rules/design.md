# Meal-rules spec: design

This describes what is built in `src/domain/meals/`. It was rewritten to match the committed acceptance tests, which are the source of truth, and `hangori-rules.md`.

## Overview

The meal rules decide whether a receipt counts as a meal, how much XP it gives, and when the companion can eat again. They are the anti-gaming core of the app, so they are written as one pure function plus one small ledger, and tested harder than anything else.

The tests were written first, in a separate session, and the code was written to pass them. They were not edited.

## Architecture

```
evaluateMeal(extraction, prior, rules, nowMs)      pure, synchronous, no I/O
   |-- buildFingerprint(extraction)                 fingerprint.ts
   |-- spacingViolated / dailyViolated              the two time rules
   |-- earliestEligible                             next time a purchase could count
   `-- formatWait                                   time.ts, "2h 10m"

createMealLedger({ rules, storage, dbName? })
   |-- queue                                        one submit at a time
   |-- evaluateMeal                                 run on the stored history
   |-- applyXp                                      from domain/companions
   `-- LedgerStore                                  store.ts
         |-- memory store                           tests, fallback
         `-- IndexedDB store                        meals, companions, meta
```

## Components and interfaces

### `evaluateMeal`

```ts
evaluateMeal(extraction: ReceiptExtraction, prior: CountedMeal[], rules: MealRules, nowMs: number): MealDecision
evaluateMealClaim({ extraction, nowMs, history, rules }): MealDecision   // same thing, one argument
```

Checks run in the order in `hangori-rules.md` line 24 and the first failure returns. Boundaries use `<` and `>` so that a time exactly on a limit passes.

**Spacing.** A purchase at `t` is too close if `|t - m| < gap` for any counted meal at `m`.

**Daily limit.** Sort the counted times with `t` added. For every window of `max + 1` neighbours that contains `t`, the last minus the first must be at least 24 hours. Checking only windows that contain `t` means an old ledger that is already over the limit does not block a new receipt for the wrong reason.

**Next eligible time.** The set of times when a purchase is allowed is a union of intervals, and each interval starts at `nowMs` or at a time where one rule stops blocking. Those times are `m + gap`, `m - gap`, `m + 24h` and `m - 24h` for each counted meal `m`. The function tries `nowMs` and then those candidates in order and returns the first one that passes both rules. It does not search minute by minute.

**Reasons.** Each code has one fixed plain-words sentence. For `too_soon` and `daily_limit` the sentence ends with the wait from `formatWait`, which rounds up to the minute and drops zero parts ("2h 10m", "16h", "1d 2h").

### `createMealLedger`

```ts
createMealLedger({ rules, storage: "memory" | "indexeddb", dbName? }): MealLedger

submit(extraction, nowMs, { companionId, savedCents? }): Promise<SubmitResult>
countedMeals(): Promise<CountedMeal[]>        // oldest purchase first
totalXp(): Promise<number>
snapshot() / adopt(id) / setActive(id) / setHalloween(on) / setSampleEpoch(ms) / replaceAll(s) / reset()
```

`SubmitResult` carries the decision, the fed companion, and whether it levelled up or evolved. A submit throws if the companion is not hatched.

### Store

`LedgerStore.transact(body)` reads a snapshot, runs `body` synchronously, and writes everything `body` returned (a meal, companions, meta) as one unit. If `body` throws, nothing is written.

In IndexedDB this is one `readwrite` transaction over three stores. The `meals` store has a **unique index on `fingerprint`**, so the database refuses a second meal with the same fingerprint and rolls the whole transaction back, XP included.

## Data models

No new contracts. Everything uses `MealRules`, `ReceiptExtraction`, `MealDecision`, `CountedMeal` and `CompanionState` from `src/contracts/index.ts`. The stored profile settings (`activeId`, `halloween`, `demo`, `sampleEpochMs`) are a local type in `store.ts`.

Fingerprint example: `brumwicketbuns|29403060|1497|SB20261126001`. The second segment is minutes since the epoch.

## Correctness properties

Each property names where it is checked. "Acceptance" means `tests/acceptance/meal-rules.property.test.ts`; "extra" means `src/domain/meals/evaluate.properties.test.ts`; "ledger" means `src/domain/meals/ledger.test.ts`.

| # | Property | Checked in |
|---|---|---|
| P1 | XP is 0 or `xpPerMeal`, and 0 for every rejected or reviewed receipt | Acceptance, extra |
| P2 | No span shorter than 24 hours holds more than `maxMealsPer24h` counted meals | Acceptance |
| P3 | Any two counted meals are at least `minHoursBetweenMeals` apart, in either order | Acceptance |
| P4 | A fingerprint never counts twice, even with case, punctuation and Unicode variants | Acceptance, ledger |
| P5 | Replaying or double-submitting a sequence never adds XP | Acceptance, ledger |
| P6 | Changing `itemCount` never changes a decision. Changing `totalCents` never changes the outcome or XP when no matching receipt is already counted (the total is part of the fingerprint, so a match is the one case where it matters) | Extra |
| P7 | Every counted meal is food, confident, dated, not in the future and not too old, and was not already counted | Extra |
| P8 | Only `too_soon` and `daily_limit` carry a next time, and it is never before now | Extra |
| P9 | The reported next time is the earliest that works: a purchase then counts, and one millisecond earlier does not | Extra |
| P10 | A companion's XP and meal count always equal the sum over its counted meals | Ledger |

The extra tests include guards that fail if the generator stops producing counted or blocked meals, because a property that never reaches its interesting case passes for the wrong reason. They were also checked against a deliberately broken evaluator, which they caught.

## Error handling

- A receipt that cannot count is a normal result, not an error. It comes back as a decision with a reason.
- Submitting for a companion that is not hatched throws before anything is read or written.
- If a transaction fails (for example the unique index refuses a duplicate), nothing is saved, and the queue carries on with the next submission.
- If IndexedDB cannot open at all, the app shows a message on the Companion screen instead of a blank page.

## Testing strategy

| Layer | Where | What it covers |
|---|---|---|
| Acceptance, examples | `tests/acceptance/meal-rules.test.ts` (53 tests) | Every rule, every boundary, rule order |
| Acceptance, properties | `tests/acceptance/meal-rules.property.test.ts` (5 tests, seed 20261123) | P1 to P5 |
| Extra properties | `src/domain/meals/evaluate.properties.test.ts` (5 tests) | P1, P6 to P9 |
| Ledger | `src/domain/meals/ledger.test.ts` (memory and IndexedDB) | Serialising, atomic XP, durable duplicates, reload, P4, P5, P10 |
| Sample receipts | `src/app/demo/demo.test.ts` | Each demo scenario end to end through the ledger |

`npm run verify` runs all of them. `npm run test:acceptance` runs the acceptance suite alone, and a hook runs it when a meal-rules file is saved.

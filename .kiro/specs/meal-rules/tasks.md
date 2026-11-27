# Meal-rules spec: tasks

Everything here is done. The list records what was built and in what order, so the next slice can see where each piece lives and how it was checked.

Branch history: `slice/meal-rules` (tests first), then `slice/demo-ready` (implementation).

## Test first

- [x] 1. Write the acceptance and property tests from `hangori-rules.md` before any implementation. Done by Codex in a separate session: commit `3058f28` (all red against a throwing stub).
- [x] 2. Fold in the rule decisions made after the first review (null merchant or total, Unicode normalisation, the configurable future limit, the next-eligible-time meaning). Done in commit `5beca7a`, still before any implementation.
- [x] 3. Do not edit `tests/acceptance/` to make anything pass. Not edited by this work.

## Evaluator

- [x] 4. `fingerprint.ts`: normalisation and the `<merchant>|<minute>|<cents>|<id>` format. Checked by acceptance tests 6, 25 to 31 and property P4.
- [x] 5. `time.ts`: `formatWait`, rounding up to the minute.
- [x] 6. `evaluate.ts`: the ten checks in rule order, `evaluateMeal` and the `evaluateMealClaim` wrapper. All 58 acceptance tests pass unchanged.
- [x] 7. `nextEligibleAtMs`: the earliest time satisfying both spacing and the rolling daily limit, from a short list of candidate times. Checked by acceptance tests 32 to 42 and property P9.
- [x] 8. Extra properties in `src/domain/meals/evaluate.properties.test.ts` for the rules the acceptance properties leave out (P6 to P9), with guards against vacuous passes and a check that a deliberately broken evaluator is caught.

## Ledger

- [x] 9. `store.ts`: a memory store and an IndexedDB store with a unique fingerprint index and one transaction per write.
- [x] 10. `ledger.ts`: `createMealLedger` with serialised submits, the meal and the companion's XP saved together, and a refusal when the companion is not hatched.
- [x] 11. `ledger.test.ts`, run against both stores: counting, duplicates, simultaneous submits, XP only from counted meals, a family order giving the same XP, reload, the database refusing a duplicate and rolling XP back, and property P10.

## Wiring

- [x] 12. `src/app/ProfileProvider.tsx` runs the ledger on IndexedDB. Sample receipts and the demo den go through the same code (`src/app/demo/demo.test.ts`).
- [x] 13. `npm run verify` runs the acceptance suite as well as the unit tests (one approved line in `package.json`).

## Not in this spec

- Reading receipts from a photo, which is out of scope for this submission.
- Showing the companion's name in a wait message. The Feed screen does that.
- Any change to `src/contracts/`.

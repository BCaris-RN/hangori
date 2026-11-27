# Meal-rules acceptance tests: what each one covers

Written 2026-11-27 (machine clock; see the date note in `demo-ready.md`). This replaces an earlier draft of this log whose test table used its own numbering and counts. This version was generated from the committed test files and the real Vitest report.

## Where the tests came from

- **Written first, by Codex, in a separate session.** Commit `3058f28` ("meal-rules acceptance and property tests (red)") added them against a stub that threw "Not implemented". All failed, as intended. Details of that session are in `codex-overnight.md`.
- **Rule decisions folded in before any code.** Commit `5beca7a` updated `hangori-rules.md` and the tests (null merchant or total, Unicode normalisation, the configurable future limit, what `nextEligibleAtMs` means). Still no implementation.
- **Implemented afterwards.** `evaluateMeal` was written in the `demo-ready` run and passes all of them **unchanged**. No acceptance test was edited to make it pass.
- This is consistent with `docs/speed.yml` B1 (full) for `src/domain/meals/`: the tests exist before the code and were not written by the implementer in the same session.

## Result

58 tests in 2 files, all passing.

| File | Tests |
|---|---|
| `tests/acceptance/meal-rules.property.test.ts` | 5 (seed 20261123, 150 runs each) |
| `tests/acceptance/meal-rules.test.ts` | 53: 42 examples and 11 rule-order cases |

Numbers below follow the order Vitest reports them. Line numbers are lines of `.kiro/steering/hangori-rules.md`.

## The tests

### Properties

| # | Test | Rule covered | Rules line |
|---|---|---|---|
| 01 | XP is always zero or `xpPerMeal`, including review and rejection | Counted gives `xpPerMeal`, everything else 0 | 16 |
| 02 | Never counts more than `maxMealsPer24h` in any span shorter than 24h | Rolling daily limit | 18 |
| 03 | No two counted meals closer than `minHoursBetweenMeals` in either order | Spacing | 19 |
| 04 | The same independently normalised fingerprint never counts twice | Duplicate, with case and punctuation variants | 20 |
| 05 | Replaying or double-submitting a sequence never increases awarded XP | Duplicate, replay and double-tap (speed.yml C5) | 20 |

### Examples

| # | Test | Rule covered | Rules line |
|---|---|---|---|
| 06 | Counts one eligible purchase with default XP and its fingerprint | Counted meal, fingerprint format | 16, 20 |
| 07 | Equal XP for a $9 single item and a $120 family order | XP never depends on price or size | 15 |
| 08 | Uses the configured `xpPerMeal` | Configurable XP | 16 |
| 09 | Missing purchase time | Review, `missing_time`, plain words | 22, 27 |
| 10 | Confidence below the threshold | Review, `low_confidence` | 22 |
| 11 | Null merchant name with high confidence | Review, `low_confidence` | 23 |
| 12 | Null total with high confidence | Review, `low_confidence` | 23 |
| 13 | Unknown merchant category | Review, `unknown_category` | 22 |
| 14 | Non-food merchant | Rejected, `not_food` | 21 |
| 15 | Future by five minutes plus 1 ms | Rejected, `future_date` | 21 |
| 16 | Older than 48 hours by 1 ms | Rejected, `too_old` | 21 |
| 17 | Exactly five minutes ahead is accepted | Future boundary | 21 |
| 18 | Exactly 48 hours old is accepted | Age boundary | 21 |
| 19 | Confidence exactly 0.8 is accepted | Confidence boundary | 22 |
| 20 | Future skew of 0 minutes, at the exact boundary | Configurable future limit | 21 |
| 21 | Future skew of 0.5 minutes, at the exact boundary | Configurable future limit (fraction) | 21 |
| 22 | Future skew of 20 minutes, at the exact boundary | Configurable future limit | 21 |
| 23 | Configured maximum age | Configurable `maxReceiptAgeHours` | 21 |
| 24 | Configured confidence threshold | Configurable `minExtractionConfidence` | 22 |
| 25 | Duplicate: identical receipt | A receipt counts once | 20 |
| 26 | Duplicate: merchant case and punctuation | Merchant normalisation | 20 |
| 27 | Duplicate: receipt ID case and punctuation | Receipt ID normalisation | 20 |
| 28 | Duplicate: Unicode compatibility forms and diacritics | NFKD and diacritic stripping | 20 |
| 29 | Duplicate: same purchase minute | Time to the minute | 20 |
| 30 | Deduplicates when the receipt ID is absent | Missing ID still dedupes | 20 |
| 31 | Total and receipt ID are part of the fingerprint | Different total or ID is a different receipt | 20 |
| 32 | The fourth meal across midnight is rejected, not per calendar day | Rolling window, `nextEligibleAtMs` | 18, 27 |
| 33 | Exactly 24h between the oldest and the new meal is allowed | Window boundary | 18 |
| 34 | A 24h span shorter by 1 ms is rejected | Window boundary, `nextEligibleAtMs` | 18, 27 |
| 35 | A window containing later meals, for out-of-order submissions | Window checked both ways | 18, 27 |
| 36 | Too close, direction -1 | Spacing before the other meal | 19, 27 |
| 37 | Too close, direction +1 | Spacing after the other meal | 19, 27 |
| 38 | Exactly the minimum spacing, direction -1 | Spacing boundary | 19 |
| 39 | Exactly the minimum spacing, direction +1 | Spacing boundary | 19 |
| 40 | Configured meal limit and spacing | Configurable limits | 18, 19, 27 |
| 41 | The next purchase time when spacing blocks a meal | `nextEligibleAtMs` for `too_soon` | 27 |
| 42 | A next time that satisfies both limits even when `too_soon` wins | `nextEligibleAtMs` applies both rules | 24, 27 |
| 43 | A meal without a deal when deal-only is off | Deal-only defaults to off | 25 |
| 44 | A meal without a deal when deal-only is on | Rejected, `no_deal` | 25 |
| 45 | A deal meal when deal-only is on | Deal-only accepts a deal | 25 |
| 46 | Savings in the ledger never change XP | Savings never award XP | 26 |
| 47 | Replay and immediate double submission add no XP | Replay and double-tap (speed.yml C5) | 20 |

### Rule order: the first failing rule wins

| # | Test | Order it pins down | Rules line |
|---|---|---|---|
| 48 | Missing time before confidence, category and deal | `missing_time` first | 24 |
| 49 | Low confidence before category and future | `low_confidence` before `not_food` and `future_date` | 24 |
| 50 | Missing time before a null total | `missing_time` before `low_confidence` | 23, 24 |
| 51 | Null merchant before category | `low_confidence` before `not_food` | 23, 24 |
| 52 | Unknown category before future | `unknown_category` before `future_date` | 24 |
| 53 | Non-food before future | `not_food` before `future_date` | 24 |
| 54 | Future before duplicate | `future_date` before `duplicate` | 24 |
| 55 | Old before duplicate | `too_old` before `duplicate` | 24 |
| 56 | Duplicate before deal and spacing | `duplicate` before `no_deal` and `too_soon` | 24 |
| 57 | Deal before spacing and daily limit | `no_deal` before `too_soon` and `daily_limit` | 24 |
| 58 | Spacing before daily limit | `too_soon` before `daily_limit` | 24 |

## Brief scenarios and where they are checked

| Scenario | Checked in |
|---|---|
| Same receipt again is rejected as already eaten | 25, 47; `e2e/demo-walk.spec.ts`; `ledger.test.ts` |
| A family order counts as one meal, same XP as a $9 taco | 07; `demo.test.ts`; `ledger.test.ts` |
| 3 meals a day, 3 hours apart, 48-hour-old receipts | 02, 03, 16, 18, 32 to 40 |
| "Hangori is full. Next meal in 2h 10m." | 41; `demo.test.ts`; `e2e/demo-walk.spec.ts` (the Feed screen adds the name) |
| Future-dated receipts are rejected | 15, 17, 20 to 22 |
| No time is sent to review, not guessed | 09, 48, 50 |
| Replayed and double-tapped submissions | 05, 47; `ledger.test.ts` (simultaneous submits) |
| Non-food receipts are rejected | 14, 53; sample "hardware store" |
| Unreadable receipts get a visible reason | 09, 48; sample "too blurry to read" |

## Tests added beside these, not in `tests/acceptance/`

These close gaps the acceptance suite leaves, and live in `src/` so the acceptance folder stays untouched:

- `src/domain/meals/evaluate.properties.test.ts` (5 tests): item count never matters; total never matters unless an identical receipt is already counted; every counted meal is food, confident, dated, not in the future and not too old; only the two waiting codes carry a next time; the reported next time is the earliest that works.
- `src/domain/meals/ledger.test.ts`: both stores, serialised submits, one transaction for the meal and its XP, the database refusing a duplicate, reload.

## Open questions

None that block the rules. The ambiguities in `codex-overnight.md` about null merchant and total, Unicode normalisation, the future-date limit and the meaning of `nextEligibleAtMs` are settled by the current `hangori-rules.md` (lines 20, 21, 23 and 27). Two items from that list stay open and are outside the meal rules: how a replay behaves after the rules or the clock change, and how a candidate meal's own savings reach the UI.

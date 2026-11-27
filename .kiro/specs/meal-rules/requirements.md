# Meal-rules spec: requirements

The rules themselves live in `.kiro/steering/hangori-rules.md` and are the source of truth. This spec turns them into testable EARS statements and says where each one is checked. It does not restate the product reasons.

Line numbers below point into `hangori-rules.md`. Test names are from `tests/acceptance/` (the committed, test-first suite).

## Scope

Two modules in `src/domain/meals/`, plain TypeScript with no React:

- `evaluate.ts`: `evaluateMeal(extraction, prior, rules, nowMs)`, a pure function. `evaluateMealClaim({ extraction, nowMs, history, rules })` is the same function with an object argument.
- `ledger.ts`: `createMealLedger({ rules, storage, dbName? })`, which stores counted meals and companion XP.

Out of scope: reading receipts (extraction), UI, and any change to `src/contracts/`.

## Evaluator

### R1. Fingerprint (line 20)
**The system shall** return, in every decision, a fingerprint of the form `<merchant>|<minute>|<cents>|<id>`, where:
- `<merchant>` is the merchant name after Unicode NFKD normalisation, with combining marks removed, lowercased, keeping only `a-z` and `0-9`.
- `<minute>` is the **minute index**, `floor(purchasedAtMs / 60000)`. It is not a millisecond value.
- `<cents>` is `totalCents` as a whole number.
- `<id>` is the receipt ID after NFKD normalisation, with combining marks removed, uppercased, keeping only `A-Z` and `0-9`.
- A missing field gives an empty segment, and the three pipes are always present.

### R2. One meal, one XP amount (lines 15, 16)
**When** a receipt is counted, **the system shall** award exactly `xpPerMeal` XP.
**When** a receipt is rejected or sent to review, **the system shall** award 0 XP.
**The system shall not** let `totalCents`, `itemCount` or the size of the order change the outcome or the XP.
**The system shall not** ever lower XP.

### R3. Rule order (line 24)
**When** a receipt fails more than one rule, **the system shall** report only the first failure, checking in this order: `missing_time`, `low_confidence`, `unknown_category`, `not_food`, `future_date`, `too_old`, `duplicate`, `no_deal`, `too_soon`, `daily_limit`.

### R4. Review, not rejection (lines 22, 23)
**If** `purchasedAtMs` is null, **then the system shall** return `needs_review` with `missing_time`.
**If** `confidence` is below `minExtractionConfidence`, or `merchantName` is null, or `totalCents` is null, **then the system shall** return `needs_review` with `low_confidence`. A confidence exactly equal to the minimum passes.
**If** `merchantCategory` is `unknown`, **then the system shall** return `needs_review` with `unknown_category`.

### R5. Hard rejections (line 21)
**If** `merchantCategory` is `other`, **then the system shall** reject with `not_food`.
**If** `purchasedAtMs` is later than `nowMs + maxFutureSkewMinutes` minutes, **then the system shall** reject with `future_date`. A time exactly on the limit passes. The limit may be 0, a fraction, or any larger value.
**If** `purchasedAtMs` is earlier than `nowMs - maxReceiptAgeHours` hours, **then the system shall** reject with `too_old`. A time exactly on the limit passes.

### R6. A receipt counts once (line 20)
**If** a counted meal with the same fingerprint already exists, **then the system shall** reject with `duplicate`.
This holds when the repeat differs in merchant case or punctuation, receipt ID case or punctuation, Unicode compatibility forms and diacritics, or the seconds within the same minute. It holds when the receipt ID is missing. It does not hold when the total or the receipt ID differs.

### R7. Deal-only mode (line 25)
**While** `countOnlyDealMeals` is true, **if** `dealId` is null, **then the system shall** reject with `no_deal`. **While** it is false, a missing deal changes nothing.

### R8. Spacing (line 19)
**If** the receipt's purchase time is closer than `minHoursBetweenMeals` hours to any counted meal, in either direction, **then the system shall** reject with `too_soon`. A gap of exactly the minimum passes.

### R9. Daily limit (line 18)
**If** counting the receipt would put more than `maxMealsPer24h` counted meals inside any span shorter than 24 hours that contains the receipt, **then the system shall** reject with `daily_limit`.
- The window rolls. It is not a calendar day, so midnight resets nothing.
- A span of exactly 24 hours passes. A span one millisecond shorter fails.
- Windows that include later meals are checked, so an older receipt submitted late is held to the same limit.

### R10. When the next meal can count (line 27)
**When** the outcome is `too_soon` or `daily_limit`, **the system shall** set `nextEligibleAtMs` to the earliest time at or after `nowMs` when a new purchase would satisfy both the spacing rule and the rolling daily limit against the ledger.
**When** both rules apply, **the system shall** report `too_soon` as the reason, and the time shall still satisfy both rules.
**When** the outcome is anything else, **the system shall** set `nextEligibleAtMs` to null.

### R11. Plain words (line 27)
**When** a receipt is not counted, **the system shall** give a reason of several plain words that is not the reason code.
**When** the outcome is `too_soon` or `daily_limit`, **the system shall** include the wait in the reason as hours and minutes, rounded up to the next minute (for example "2h 10m").

### R12. Savings (line 26)
**The system shall not** let savings, on a receipt or in the ledger, change XP or any rule.

### R13. Purity
**While** it runs, `evaluateMeal` **shall not** read the clock, storage or the network. It is synchronous, and the current time comes in as `nowMs`.

## Ledger

### R14. Interface
**When** `createMealLedger` is called with `storage` set to `"memory"` or `"indexeddb"`, **the system shall** return an object with `submit`, `countedMeals`, `totalXp`, `snapshot`, `adopt`, `setActive`, `setHalloween`, `setSampleEpoch`, `replaceAll` and `reset`.
`countedMeals` returns meals oldest purchase first. `totalXp` is the sum of the XP on those meals.

### R15. Serialised submits
**When** two submissions arrive at the same moment, **the system shall** run them one at a time, in call order, so that two identical submissions count exactly one meal.
**If** one submission fails, **then the system shall** still run the ones queued behind it.

### R16. One transaction (line 16)
**When** a meal counts, **the system shall** save the meal and the companion's new XP in a single transaction.
**If** that transaction fails, **then the system shall** save neither.

### R17. Durable duplicate check (line 20)
**The system shall** enforce one meal per fingerprint in the stored data itself, with a unique index in IndexedDB, and not only in code that checks first.

### R18. A companion must exist
**If** the named companion is not hatched, **then the system shall** refuse the submission before evaluating it, and write nothing.

### R19. XP comes only from counted meals (lines 15, 16)
**The system shall** keep each companion's XP and meal count equal to what its counted meals add up to. There is no other way to gain XP.

### R20. Persistence
**When** the app reloads, **the system shall** still hold the meals, XP and active companion, and shall still reject a repeated receipt.

## Decisions already made in `hangori-rules.md`

These were open questions in the first Codex review (`docs/session-log/codex-overnight.md`) and are settled by the current rules text:
- A null merchant name or total is `low_confidence` (line 23).
- Names and receipt IDs are normalised with NFKD and diacritics are stripped (line 20).
- The future-date limit is `maxFutureSkewMinutes`, default 5, and accepts any non-negative value (line 21).
- `nextEligibleAtMs` is the earliest time a **new purchase** could count, applying both limits (line 27). It does not promise that retrying the same rejected receipt will count.

## Non-goals

Camera capture and receipt reading; calendar-day limits; showing the companion's name in the reason (the Feed screen adds that); any change to the contracts.

# Codex overnight — 2026-11-23 (Pacific/Honolulu)

## Delivery

- Foundation: `733f8ab` — Fixtures: replace names that match real restaurants; pushed to `slice/foundation`.
- Acceptance: `3058f28` — Run 2.1b: meal-rules acceptance and property tests (red); pushed to `slice/meal-rules`, branched from the fixture fix.
- No merges. evaluate.ts, ledger.ts, and shared contracts are unchanged.
- Existing uncommitted docs/kiro-journal.md and untracked .kiro/hooks/ were preserved and excluded from commits.

## Name searches and replacements

Searched each of the 18 original names with the quoted name plus “restaurant business”.
Several collisions were found, including [Taco Milagro](https://houston.eater.com/2013/5/22/6430715/taco-milagro-to-close-may-26),
[Golden Chopsticks](https://www.goldenchopsticksfl.com/tos),
[Pasta Pronto](https://pastapronto.com/story),
[Casa Verde](https://casaverdesi.com/), and
[Harbor Fish Co.](https://www.gigharbornow.org/news/business/business-spotlight-the-harbor-fish-co-is-gig-harbors-next-gen-fishing-family/).
Replaced the entire name set conservatively, rather than claiming every original was a verified business.

Each replacement below was separately submitted as an exact quoted web query; all returned no results on this run. Search absence cannot prove worldwide uniqueness or establish trademark clearance.

| Previous name (searched) | Replacement (searched; no results) |
|---|---|
| Stacked Buns | Brumwicket Buns |
| Taco Milagro | Tavvlethorn Tacos |
| Golden Chopsticks | Zindlewick Chopsticks |
| Pasta Pronto | Pellumquill Pasta |
| Sunrise Diner | Dawnquibble Diner |
| Bolt & Beam Hardware | Brassquibble Hardware |
| Wok & Roll | Wumplewick Wok |
| Burger Barn | Bramblevex Burgers |
| Noodle Nirvana | Nimblequern Noodles |
| Inferno Pies | Cindervibble Pies |
| Sakura Rolls | Petalquern Rolls |
| The Brunch Spot | Brunchwizzle Hollow |
| Night Owl Coffee | Owlvibble Coffee |
| Smoke & Ember BBQ | Emberquern BBQ |
| Spice Route | Spindlequern Spice |
| Casa Verde | Verdavibble Kitchen |
| Olive & Feta | Olivequibble Table |
| Harbor Fish Co. | Harborquern Fish |

The spike's older “Grounds Zero” coffee label was also aligned to Owlvibble Coffee. Updated fixture names, restaurant IDs and placeholder URL paths, spike source and narrative references, and regenerated all 20 receipt PNGs. Re-ran OCR instead of editing historical raw extraction text by substitution; results.json now contains fresh measurements. The OCR pass bar remains 17/20; R005, R014, R020 remain the three all-fields failures. Old names in this report are an audit trail, not demo data.

## Validation results

| Check | Result |
|---|---|
| node scripts/validate-fixtures.mjs | PASS: 8 restaurants, 16 deals, 20 extractions; repeated after ID changes |
| npm run verify (foundation) | PASS: lint + typecheck; no Vitest tests yet |
| npm run e2e | PASS: 5/5 Chromium smoke tests |
| Receipt rendering + extraction | PASS: all 20 regenerated; OCR 17/20 all-fields accuracy |
| npm run test:acceptance (final) | Expected exit 1: 49/49 failed, all messages contain Not implemented; no other failures |
| Acceptance TypeScript check | PASS using existing app compiler options with tests/acceptance included in-memory |
| npm run verify (meal-rules, after final red run) | PASS: lint + typecheck; default test run excludes acceptance and has zero tests |

Final acceptance breakdown: 44 example/order cases and 5 properties, 49 total, 49 failing as expected, 0 passing or skipped. An initial run had 48 expected failures; one explicit next-eligible-time example was added for a final count of 49. Local machine-readable evidence is in ignored test-results/acceptance-red.json. Every failure was audited for the stub error, including fast-check's wrapped error.

No expected red test is written as an assertion that the stub throws: each asserts eventual production behavior. There is no meal implementation or ledger implementation in the helpers; helpers construct synthetic prior entries and append only decisions marked counted. The fingerprint helper is an independent oracle for the documented format.

## Test list grouped by rule

### XP and one purchase per meal
- Eligible purchase yields counted, default XP, and canonical fingerprint.
- $9 / one item versus $120 / 20 items yields equal XP.
- Configurable xpPerMeal is honored.
- Ledger savings of zero versus 12000 cents never alter XP.
- Property: XP is always 0 or configured xpPerMeal; every non-counted decision gives zero.

### Review and merchant classification
- Missing time -> missing_time; low confidence -> low_confidence; unknown category -> unknown_category.
- All three review outcomes give zero XP and readable reasons.
- Non-food merchant -> not_food, rejected with zero XP and readable reason.
- Confidence exactly 0.8 counts; configured confidence threshold is honored.

### Time validity
- Exactly five minutes in the future counts; five minutes plus 1 ms -> future_date.
- Exactly 48h old counts; 48h plus 1 ms -> too_old.
- Custom maximum age: exact boundary counts; boundary plus 1 ms rejects.

### Duplicate identity
- Identical resubmission -> duplicate.
- Merchant case/punctuation changes -> duplicate.
- Receipt ID case/punctuation changes -> duplicate.
- Seconds within the same purchase minute -> duplicate.
- Missing receipt ID still deduplicates.
- Changed total or receipt ID changes the fingerprint.
- Property: repeated canonical fingerprints never count twice, including case/punctuation variants.

### Rolling daily limit
- Fourth meal across midnight -> daily_limit, next eligible at oldest counted purchase + 24h.
- Exactly 24h span is allowed; 24h minus 1 ms is rejected.
- Older receipts submitted after three later meals are rejected when all four would share a short window.
- Configured maxMealsPer24h is honored.
- Property: every window starting at a counted timestamp contains at most the configured maximum for t < start + 24h, across unordered sequences.

### Minimum spacing
- Receipt earlier or later than a prior meal by 3h minus 1 ms -> too_soon.
- Exactly 3h in either direction counts.
- Configured spacing is honored.
- A prior meal one hour ago gives nextEligibleAtMs = now + 2h.
- Property: every pair of counted purchase times is separated by at least configured spacing.

### Deal-only policy
- Deal-only disabled permits no deal.
- Deal-only enabled rejects no deal with no_deal.
- Deal-only enabled accepts an associated synthetic deal.

### Rule order (nine examples)
- Missing time before confidence/category/deal.
- Low confidence before category/future.
- Unknown category before future.
- Non-food before future.
- Future date before duplicate.
- Too old before duplicate.
- Duplicate before deal/spacing.
- No deal before spacing/daily limit.
- Too soon before daily limit.
- All failure examples check outcome, reasonCode, zero XP and a multiword reason.

### Replay and double submissions
- Three spaced purchases yield exactly three meals of XP; replay adds zero; immediate doubles do not increase XP.
- Property: replay against the resulting ledger adds zero and leaves the ledger unchanged; immediate doubles and whole-sequence replay yield the original XP.

## Determinism and test commands

All evaluator calls receive NOW = Date.UTC(2026, 10, 23, 12); no real clock calls.
Properties use seed 20261123 and 150 configured runs with nonempty generated sequences. With the throwing stub they fail on the first generated case; 150 successful trials per property have NOT occurred.

Added test:acceptance to run only tests/acceptance/, with passWithNoTests=false.
The default test command explicitly excludes tests/acceptance/**.
Kept passWithNoTests in the shared config because the default suite still contains no tests.

## Ambiguities and limits

- “When the next meal can count” does not specify whether nextEligibleAtMs describes a new purchase or retrying the same rejected receipt. Tests interpret clear spacing/daily-limit cases as the next eligible purchase timestamp; they do not require retrying a duplicate or non-food receipt to become valid.
- For older out-of-order receipts, the next eligible time may be in the past or refer to another gap. Directional spacing tests require a numeric timestamp but leave that exact policy open. The current-time spacing example has an exact unambiguous expectation.
- ReceiptExtraction permits null merchantName and totalCents even with high confidence, but the rules provide neither a missing-name/total reason code nor a specified fallback for fingerprinting. No invented policy was encoded.
- The rule says “letters and digits” without defining Unicode normalization. Tests exercise ASCII case/punctuation; Unicode/accent behavior needs a decision.
- Rules fix future skew at five minutes while the contract exposes maxFutureSkewMinutes. Tests cover the documented default, without asserting that arbitrary override values are allowed.
- Savings for a candidate meal are not an evaluateMeal input. Tested savedCents on prior ledger rows; UI/deal estimation integration is outside this acceptance boundary.
- Replay properties use a fixed now and accumulated ledger. Replaying rejected receipts after time/rules change is not specified and is not asserted.
- No exhaustive brand/nonexistence guarantee is possible from web searches. All final names had no exact-name results; generic delivery label DashDrop in the pre-existing spike is not a restaurant name and was outside this name audit.
- No unexpected command failure required three retries. Intentional Not implemented failures are the requested red baseline and were not “fixed.”


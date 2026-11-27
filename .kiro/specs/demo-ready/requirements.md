# Demo-ready spec: requirements

Goal: a judge opens Hangori on a phone and, within 60 seconds, picks a companion, logs a meal, sees XP and a level-up, and watches the companion evolve. Everything runs on synthetic data, offline, with no login.

Rules of the product live in `.kiro/steering/hangori-rules.md`. This spec does not restate them. Where a requirement says "the meal rules", it means that file and the acceptance tests in `tests/acceptance/`.

## Scope notes

- "Demo account" means a seeded local profile. The brief puts accounts and login out of scope, and the rules say nothing may require a login. No credentials exist anywhere.
- Receipts come from synthetic samples. Camera capture with on-device OCR is not part of this slice.
- Food-app and deal data come through an adapter interface backed by mock fixtures.

## Requirements (EARS)

### Meal rules
1. WHEN a receipt extraction, the counted-meal history, the rules and the current time are given, THE evaluator SHALL return a decision that follows the meal rules, with the first failing check reported.
2. WHEN a meal is counted, THE ledger SHALL save the meal and the companion's new XP in one IndexedDB transaction.
3. IF two submissions of the same fingerprint arrive together, THEN THE ledger SHALL count exactly one of them.
4. THE ledger SHALL reject a repeated fingerprint in durable storage, not only in memory.

### Companions
5. WHEN the profile has no hatched companion, THE Companion screen SHALL show five eggs to pick from.
6. WHEN the user picks an egg, THE app SHALL hatch it into a stage 1 companion with 0 XP and make it active.
7. WHEN a meal is counted, THE active companion SHALL gain the XP in the decision and no other XP.
8. WHEN XP crosses a level boundary, THE app SHALL show a level-up.
9. WHEN XP crosses a stage threshold, THE app SHALL evolve the companion and show the evolution.
10. WHILE Halloween forms are on (the default), THE app SHALL draw every companion in its Halloween form.
11. THE app SHALL never lower a companion's XP.

### Demo profile
12. WHEN the user chooses "Load demo den", THE app SHALL replace local data with a seeded profile that holds one companion at each of stages 1 to 4 and one unhatched egg.
13. THE seeded history SHALL obey the meal rules (spacing, daily limit) and total the same XP as the seeded companions.
14. WHEN the user chooses "Reset", THE app SHALL clear all local data and return to the egg picker.

### Feed and anti-gaming demo
15. THE Feed screen SHALL offer sample receipts that cover: a counted meal, a second counted meal, a family order, a duplicate, a too-soon meal, a non-food receipt, a too-old receipt, a future-dated receipt, a receipt with no time, and an unreadable receipt.
16. WHEN a sample is rejected or sent to review, THE Feed screen SHALL show the reason in plain words.
17. WHEN a meal is rejected as too soon or over the daily limit, THE Feed screen SHALL show the companion's name and the wait, for example "Hangori is full. Next meal in 2h 10m."
18. THE family-order sample SHALL award the same XP as the cheapest sample.

### Deals and savings
19. THE Deals screen SHALL list deals from the adapter and open link-outs labelled "Open in your food app".
20. THE UI SHALL contain no third-party brand names or logos.
21. THE Savings screen SHALL show the total saved on counted meals that used a deal.
22. Savings SHALL never change XP.

### Offline and install
23. WHEN the device is offline after the first load, THE app SHALL still show Deals, the Companion and the Feed samples.

### Visual pass
24. THE app SHALL use one spooky retro theme (dark purple, pumpkin orange, pixel borders, scanlines) on every screen.
25. WHEN the user prefers reduced motion, THE app SHALL turn off animation.
26. THE sprites SHALL be original pixel art drawn in code, with no assets from other games, films or brands.

### Documentation
27. THE README SHALL give setup steps, screenshots, the 60-second script, what is real and what is mocked, and how specs, steering and hooks were used.

## Edge cases

- Feeding with no hatched companion is refused before any evaluation.
- A reload after a counted meal keeps XP, level and stage.
- Sample purchase times are fixed against a stored epoch, so a repeated tap is a true duplicate, even after a reload.
- If the stored epoch is older than 12 hours, the next load creates a new one so samples stay inside the 48-hour window.
- A companion that crosses two thresholds in one meal evolves straight to the final stage, and the overlay shows that stage.

## Non-goals

- Camera capture and OCR wiring (the spike passed; integration comes later).
- Real food-app or deal APIs, accounts, payments, notifications.
- Final art and icons. Sprites are placeholder-quality original pixel art.
- Changes to `src/contracts/`.

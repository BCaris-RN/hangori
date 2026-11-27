# Demo-ready spec: tasks

Branch: `slice/demo-ready`. Run lint, typecheck and tests after each wave and commit. Never edit `tests/acceptance/`, `src/contracts/` or `package.json`.

## Wave 1: meal rules (requirements 1 to 4)
- [ ] 1.1 `fingerprint.ts` and `wait.ts`
- [ ] 1.2 `evaluate.ts` so all acceptance tests pass unchanged
- [ ] 1.3 `ledger.ts` with memory and IndexedDB stores, serialised submits, atomic meal and XP write
- [ ] 1.4 Ledger tests: duplicate, simultaneous submits, atomic XP, reload

## Wave 2: companions and demo data (requirements 5 to 14, 18, 21 to 22)
- [ ] 2.1 `stages.ts` and `roster.ts` with unit and property tests
- [ ] 2.2 Deals adapter interface and mock
- [ ] 2.3 Demo seed (one companion at each stage, rule-abiding history) with tests
- [ ] 2.4 Sample receipts built from the fixtures, with tests for every scenario

## Wave 3: UI (requirements 5 to 11, 15 to 17, 19 to 22, 24 to 26)
- [ ] 3.1 Sprite engine, XP bar, evolution overlay
- [ ] 3.2 `ProfileProvider`
- [ ] 3.3 Companion screen (egg picker, main view, den)
- [ ] 3.4 Feed, Deals, Savings, Settings screens
- [ ] 3.5 Theme: dark purple and pumpkin orange, pixel borders, scanlines, reduced motion

## Wave 4: proof and docs (requirements 23, 27)
- [ ] 4.1 `e2e/demo-walk.spec.ts` for the 60-second path, with a timing assertion
- [ ] 4.2 `e2e/screenshots.spec.ts` (runs only when `SCREENSHOTS=1`)
- [ ] 4.3 Offline check against a production build
- [ ] 4.4 README, journal entry, PR

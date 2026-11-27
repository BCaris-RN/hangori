# Demo-ready run: session log

Branch: `slice/demo-ready` (from `slice/meal-rules`). Spec: `.kiro/specs/demo-ready/`.

## What was built

- **Meal rules.** `evaluateMeal` in `src/domain/meals/evaluate.ts`, with `evaluateMealClaim` as an object-argument wrapper. All 58 acceptance tests in `tests/acceptance/` pass unchanged.
- **Ledger.** `createMealLedger` with memory and IndexedDB stores. Submits are serialised. A counted meal and the companion's new XP are saved in one transaction. A unique index on the fingerprint enforces "a receipt counts once" in the database.
- **Companions.** Levels (10 XP each) and stages (20, 50 and 100 XP) in `src/domain/companions/`.
- **Demo.** A seeded demo den (one companion at each of stages 1 to 4, an unhatched Hangori egg, 24 rule-abiding meals), ten sample receipts, and a mock `DealsAdapter`.
- **UI.** Five screens, original pixel-art sprites drawn in code (five companions, four stages, classic and Halloween forms), the evolution overlay, and the spooky retro theme.
- **Proof.** `e2e/demo-walk.spec.ts` (6 tests), `e2e/screenshots.spec.ts` (gated by `SCREENSHOTS=1`), README with screenshots.

## Verification (final tree)

| Command | Result |
|---|---|
| `npm run verify` | lint 0 errors, typecheck 0 errors (app and node), 58 unit and property tests pass |
| `npm run test:acceptance` | 58 of 58 pass |
| `npm run build` | succeeds, service worker and manifest generated, 10 precache entries |
| `npm run e2e` | 11 passed, 1 skipped (the screenshot spec, by design) |
| Happy path (e2e) | 5.1 s by machine, of which about 3 s is the hatch animation |
| Offline check | Production build served with `vite preview`; with the network off, all five screens load, all 16 deals render, and a meal counts. One-off script, not committed |

## Decisions to review

1. **"Demo account" is a seeded local profile, not a login.** The brief puts accounts out of scope and the rules say nothing may require a login.
2. **Seeded XP is fixture data.** The demo den writes companion XP directly (it matches the seeded meals exactly, and a test checks that). It is loaded only by the explicit "Load the demo den" action. If you want no XP path outside a counted meal, the seed could be dropped in favour of replaying meals.
3. **Test-first.** The acceptance tests were committed before this run (`3058f28`, plus rule decisions in `5beca7a`). They were not edited.
4. **`package.json` was not touched.** The `guard-dependencies` hook blocks edits to it. As a result `npm run verify` still excludes `tests/acceptance/`. Dropping `--exclude tests/acceptance/**` from the `test` script is a one-line change for Brandon.
5. **No new packages.** Everything uses packages already in `approved_packages`.
6. **No contract changes.** `src/contracts/` is untouched.
7. **Branch base.** This branch sits on `slice/meal-rules`, so the pull request also carries those four earlier commits (test-first tests, notes, hooks, rule decisions).
8. **`src/app/`.** A new shared folder for state and demo data that several features use. `structure.md` now lists it.
9. **Deviation from `docs/speed.yml` (B1: full).** Codex wrote the meal-rule tests in a separate earlier session, as planned, so there is no deviation in this run.

## Found and fixed during the run

- The first sample ordering gave a 16-hour wait instead of "2h 10m" after three meals, because the daily limit stretches the wait (the rules require both limits to count). The samples were reordered so the demo path shows 2h 10m, and a test now documents the 16-hour case.
- On a phone, tapping a sample near the bottom of the Feed left the result off-screen. The Feed now scrolls to the top on each result.
- The Savings nav icon (a coin emoji) rendered as an empty box. Replaced.

## Open items

- The clock and the git history disagree. The machine clock says 2026-11-26, while earlier commits are dated 2026-11-23. This run's journal line and commit times use the machine clock. Please check the date.
- `docs/kiro-journal.md` already used 2026-11-26 for Run 1.1 and Run 1.2. Left as it was.
- Untracked and not included in this branch: `.kiro/specs/meal-rules/` and `docs/session-log/meal-rules-tests.md`. Both were drafted before the acceptance tests were reviewed. The spec says `evaluateMealClaim` and a floored-millisecond fingerprint, while the tests (the source of truth) use `evaluateMeal` and a minute index. The session log's test table uses its own numbering and counts, which do not match the real files (the suites hold 58 tests in total). Both need a rewrite before they are committed.
- Camera capture and on-device reading are not wired (the spike passed, 17 of 20).
- App icons are still plain placeholder squares.
- `fixtures/deals.json` has
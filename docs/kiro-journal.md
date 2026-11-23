2026-11-22 · Run 0.2 · Steering · Kiro created product.md, tech.md, structure.md from the brief and rules; meal rules kept only in hangori-rules.md.
2026-11-22 · Run 0.3 · Spike · tesseract.js on-device: 17/20 all fields, 274 ms per receipt. R014 tilt misread → add deskew in receipt-capture.
2026-11-26 · Run 1.2 · Hook creation · Created six hooks: meal-rules-tests, verify-after-task, guard-contracts, guard-dependencies, journal, demo-walk.

---

## Run 1.1 — Foundation slice + dependency upgrades

**Date:** 2026-11-26  
**Spec:** `.kiro/specs/foundation/` (requirements.md, tasks.md, design.md)

### What Kiro built

**App shell and PWA**
- Vite + React + TypeScript project initialised from scratch at the workspace root.
- Installable PWA via `vite-plugin-pwa` with `generateSW` strategy; Workbox precaches the compiled app shell and all public assets including icons.
- Five screens with placeholder content (Companion, Deals, Feed, Savings, Settings) and a fixed bottom navigation bar using React Router `NavLink` with active-state styling.
- Global CSS reset and custom properties (`--color-bg`, `--color-accent`, etc.), mobile-first at max-width 480px.
- Placeholder PWA icons (192px, 512px PNGs) generated from pure Node built-ins — no native canvas dependency.

**Contracts**
- `src/contracts/index.ts`: 9 Zod 4 schemas with inferred TypeScript types: `MealRules`, `ReceiptExtraction`, `MealDecision`, `CountedMeal`, `Restaurant`, `Deal`, `DealsFeed`, `CompanionId`, `CompanionState`. `defaultMealRules` exports all defaults from `hangori-rules.md`.

**Fixtures**
- `fixtures/deals.json`: 8 made-up restaurants, 16 deals, generic "Open in your food app" link-outs to `example.com`. No real brand names.
- `fixtures/receipts.json`: 20 `ReceiptExtraction` objects matching spike receipts R001–R020. R005 and R020 (unreadable by design) have `confidence: 0`, all fields null.
- Fixtures imported directly in `src/fixtures/index.ts`; Vite bundles them — no separate `public/fixtures/` copy.
- `scripts/validate-fixtures.mjs` validates both files against their Zod schemas.

**Domain stubs**
- `src/domain/meals/evaluate.ts`: `evaluateMeal()` stub.
- `src/domain/meals/ledger.ts`: `getMeals()` and `recordMeal()` stubs.
- Both throw `"Not implemented"`.

**Tooling**
- `tsconfig.app.json` (src/) and `tsconfig.node.json` (config files) — both checked by `typecheck` script.
- ESLint flat config (typescript-eslint + react-hooks), `argsIgnorePattern: ^_` for stub parameters.
- Vitest v5 in `vitest.config.ts` (separate from vite config to avoid type conflicts).
- Playwright smoke test: 5 tests, one per screen, asserting `<h1>` visibility.
- `verify` script: lint → typecheck (both configs) → test.

### Spec files
- `.kiro/specs/foundation/requirements.md`
- `.kiro/specs/foundation/tasks.md`
- `.kiro/specs/foundation/design.md`
- `docs/session-log/foundation.md`

### Dependency upgrades (pre-commit)
- `npm audit fix` (non-breaking): resolved `glob`/`minimatch` moderate issues in `workbox-build`.
- `zod` → 4.6.7: updated `src/contracts/index.ts` (`z.number().int()` → `z.int()`) and `scripts/validate-fixtures.mjs` (`.format()` → `z.treeifyError()`). All schemas validated.
- `vitest` → 5.1.1: resolved 2 critical (`tinypool`) and 2 moderate (`@vitest/mocker`) issues. Config and tests pass on first attempt; no rollback needed.

### Packages approved mid-run
| Package | Type | Reason |
|---|---|---|
| `react-router-dom` | runtime | Standard client-side router; no alternative in approved list. Added to `approved_packages.runtime` in `docs/speed.yml`. |
| `@types/node` | dev | Required to typecheck `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` (use `fileURLToPath` and `process.env`). Approved by Brandon 2026-11-26. |

### Choices flagged
- `vite build` without `tsc -b`: composite build conflicted across lib targets; type errors caught by separate `typecheck` script instead.
- Vitest config in separate `vitest.config.ts`: mixing `test` block into `vite.config.ts` causes TS type conflicts between Vite and Vitest `defineConfig` signatures.
- Placeholder PNG icons: `canvas` not in approved list; generated with raw PNG byte construction.
- `passWithNoTests: true` in vitest config with TODO comment — remove when first test file lands.

### Remaining audit issues
3 moderate/high vulnerabilities all inside `workbox-build` → `@rollup/plugin-terser` → `serialize-javascript`. Dev-only. `npm audit fix` cycles between fixing them; requires upstream `vite-plugin-pwa` to update its `workbox-build` dependency. No action needed before commit.

### Test results (post-upgrade)
| Command | Result |
|---|---|
| `npm run verify` | ✓ lint 0, typecheck 0 (both configs), vitest v5.1.1 pass |
| `npm run build` | ✓ 1.16s, `dist/sw.js` + `dist/manifest.webmanifest` |
| `npm run e2e` | ✓ 5/5 passed (2.8s) |

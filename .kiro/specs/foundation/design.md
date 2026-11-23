# Foundation spec — design

## Overview

The foundation slice installs the project skeleton that every subsequent slice builds on. It delivers:

- An installable, offline-first PWA (Vite + React + TypeScript + vite-plugin-pwa).
- Five placeholder screens with a persistent bottom navigation bar.
- All shared Zod 4 contracts that domain logic and UI features will import.
- Synthetic fixture data for demos and tests.
- Quality tooling: lint, typecheck, test, e2e, verify.
- Stubs for the two domain entry points that the meals slice will implement.

Nothing in this slice does real meal evaluation, OCR, or data persistence. Those come in later slices.

---

## Architecture

```
Browser
  └── React SPA (Vite bundle, served from dist/)
        ├── BrowserRouter (react-router-dom v7)
        │     ├── / → CompanionScreen
        │     ├── /deals → DealsScreen
        │     ├── /feed → FeedScreen
        │     ├── /savings → SavingsScreen
        │     └── /settings → SettingsScreen
        └── BottomNav (fixed, outside <Routes>)

Build output
  ├── dist/index.html
  ├── dist/assets/index-*.js    (app bundle, includes bundled fixture JSON)
  ├── dist/sw.js                (Workbox service worker, precaches all assets)
  └── dist/manifest.webmanifest

Source layout
  src/
    contracts/index.ts          Zod schemas + TS types (single source of truth)
    domain/meals/               evaluate.ts, ledger.ts (stubs)
    features/<feature>/         One folder per screen
    fixtures/index.ts           Imports fixtures/ JSON; re-exports as typed values
    ui/BottomNav.tsx
    App.tsx
    main.tsx
  fixtures/                     Source JSON — bundled, not served as static files
  public/icons/                 PWA icons served as static files
  e2e/                          Playwright smoke tests
  tests/                        (empty — Vitest acceptance tests land in meals slice)
```

**No backend.** All data stays on the device. The service worker makes the app load offline after the first visit.

**TypeScript config split:** `tsconfig.app.json` covers `src/`; `tsconfig.node.json` covers `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`. Both are checked by `npm run typecheck`. The `build` script runs `vite build` only (no `tsc -b`) because the composite build pulls in conflicting `node_modules` declaration files across the two lib targets.

---

## Components and Interfaces

### App shell (`src/App.tsx`)

Wraps the whole app in `<BrowserRouter>`. Renders `<BottomNav>` outside `<Routes>` so it persists on every screen.

### BottomNav (`src/ui/BottomNav.tsx`)

Fixed to the bottom of the viewport, `max-width: 480px`, z-index 100. Five `<NavLink>` items. Uses React Router's `end` prop on the root link to prevent it matching all paths. Active item styled with `--color-accent`.

### Screen components (`src/features/<feature>/<Name>Screen.tsx`)

Each exports a default component with:
- `<div data-testid="screen-<name>">` as the root element (used by Playwright).
- `<h1>` with the screen name (asserted by the smoke test).
- `<p>` with a one-line placeholder description.

| Route | Component | `data-testid` |
|---|---|---|
| `/` | `CompanionScreen` | `screen-companion` |
| `/deals` | `DealsScreen` | `screen-deals` |
| `/feed` | `FeedScreen` | `screen-feed` |
| `/savings` | `SavingsScreen` | `screen-savings` |
| `/settings` | `SettingsScreen` | `screen-settings` |

### Domain stubs (`src/domain/meals/`)

`evaluate.ts` exports `evaluateMeal(extraction, prior, rules, nowMs)` → `MealDecision`. Throws `"Not implemented"`.

`ledger.ts` exports `getMeals()` → `Promise<CountedMeal[]>` and `recordMeal(meal)` → `Promise<void>`. Both throw `"Not implemented"`.

The meals slice will replace these with real implementations. No other code should call them until then.

### Fixtures module (`src/fixtures/index.ts`)

Imports `fixtures/deals.json` and `fixtures/receipts.json` at build time. Vite bundles them into the JS chunk — no separate static-file copies, no network request at runtime. Exports `dealsFeed: DealsFeed` and `spikeReceipts: ReceiptExtraction[]`.

---

## Data Models

All models are defined in `src/contracts/index.ts` as Zod 4 schemas. TypeScript types are inferred with `z.infer<>`. Changes require a CR at `docs/contracts/CR-<n>.md` approved by Brandon.

### MealRules

Configuration for the meal-counting engine. `defaultMealRules` exports all defaults.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `xpPerMeal` | `int > 0` | 10 | XP awarded per counted meal |
| `maxMealsPer24h` | `int > 0` | 3 | Max counted meals in any 24-hour window |
| `minHoursBetweenMeals` | `number > 0` | 3 | Minimum hours between counted meals (by purchase time) |
| `maxReceiptAgeHours` | `number > 0` | 48 | Receipts older than this are rejected |
| `minExtractionConfidence` | `number 0–1` | 0.8 | Below this, extraction goes to review |
| `countOnlyDealMeals` | `boolean` | false | When true, meals without a deal are rejected |
| `maxFutureSkewMinutes` | `number ≥ 0` | 5 | Receipt dated this many minutes in the future is rejected |

### ReceiptExtraction

Output of the OCR or manual-entry pipeline.

| Field | Type | Notes |
|---|---|---|
| `merchantName` | `string \| null` | As extracted; null if unreadable |
| `merchantCategory` | `"food" \| "other" \| "unknown"` | Determined by extractor or lookup |
| `purchasedAtMs` | `int \| null` | UTC ms; null triggers needs_review |
| `totalCents` | `int ≥ 0 \| null` | Integer cents; null if not found |
| `receiptId` | `string \| null` | As printed; null if absent |
| `itemCount` | `int ≥ 0` | Number of line items (0 if none) |
| `confidence` | `number 0–1` | Extractor confidence score |
| `source` | `"tesseract" \| "manual" \| "sample"` | `"sample"` = fixture receipt |
| `dealId` | `string \| null` | Associated deal, or null |

### MealReasonCode

Enum matching the rule-check order from `hangori-rules.md`:

`"counted"` | `"missing_time"` | `"low_confidence"` | `"unknown_category"` | `"not_food"` | `"future_date"` | `"too_old"` | `"duplicate"` | `"no_deal"` | `"too_soon"` | `"daily_limit"`

### MealDecision

Result of evaluating a `ReceiptExtraction` against `MealRules`.

| Field | Type | Notes |
|---|---|---|
| `outcome` | `"counted" \| "rejected" \| "needs_review"` | |
| `reasonCode` | `MealReasonCode` | Machine-readable; for programmatic branching |
| `reason` | `string` | Plain words shown to the user |
| `xpAwarded` | `int ≥ 0` | 0 for rejected or needs_review |
| `fingerprint` | `string` | `"<merchant>\|<minute>\|<cents>\|<id-or-empty>"` |
| `nextEligibleAtMs` | `int \| null` | When next meal can count; null if no limit |

### CountedMeal

A ledger entry written when a meal is counted.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique ledger entry ID |
| `fingerprint` | `string` | Duplicate-detection key |
| `merchantName` | `string` | |
| `purchasedAtMs` | `int` | UTC ms |
| `totalCents` | `int ≥ 0` | |
| `xpAwarded` | `int ≥ 0` | |
| `savedCents` | `int ≥ 0 \| null` | Displayed only; never affects XP |
| `dealId` | `string \| null` | |
| `recordedAtMs` | `int` | When ledger entry was written |

### Restaurant

| Field | Type |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `category` | `string` |
| `address` | `string` |

### Deal

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `restaurantId` | `string` | FK to Restaurant |
| `title` | `string` | |
| `description` | `string` | |
| `code` | `string \| null` | Promo code, or null |
| `terms` | `string` | |
| `expiresAtMs` | `int \| null` | UTC ms, or null if no expiry |
| `estimatedSavingsCents` | `int ≥ 0 \| null` | Displayed only; never affects XP |
| `linkOutUrl` | `z.url()` | Generic label in UI; no brand names |

### DealsFeed

`{ deals: Deal[], restaurants: Restaurant[], fetchedAtMs: int }`

### CompanionId

`"hangori" | "brisket" | "mochi" | "grubble" | "sprig"`

### CompanionState

| Field | Type | Notes |
|---|---|---|
| `id` | `CompanionId` | |
| `stage` | `1 \| 2 \| 3 \| 4` | Evolution stage |
| `xp` | `int ≥ 0` | Accumulated XP |
| `totalMeals` | `int ≥ 0` | Counted meals ever |
| `halloween` | `boolean` | Halloween form active |

---

## Correctness Properties

These are invariants that the meal rules guarantee, independent of receipt content. The meals slice must enforce all of them; the acceptance tests in `tests/acceptance/` assert them.

1. **XP never depends on price or order size.** Every counted meal awards exactly `xpPerMeal` XP regardless of `totalCents`. A $9 taco and a $120 family order are equal.

2. **XP never decreases.** `xpAwarded` is `int ≥ 0`. Rejected and needs_review decisions award 0, never negative.

3. **A receipt counts at most once.** The fingerprint `"<merchant-normalised>|<purchase-minute>|<total-cents>|<receipt-id-or-empty>"` is unique per physical receipt. Any submission matching an existing fingerprint is rejected with `reasonCode: "duplicate"`.

4. **At most `maxMealsPer24h` counted meals within any 24-hour window.** The window is a sliding 24-hour span measured by `purchasedAtMs`, not a calendar day.

5. **Counted meals are at least `minHoursBetweenMeals` apart.** Measured by `purchasedAtMs` in either direction against every existing counted meal.

6. **Receipts older than `maxReceiptAgeHours` are rejected.** Measured from `purchasedAtMs` to `nowMs`.

7. **Receipts dated more than `maxFutureSkewMinutes` in the future are rejected.** Measured from `nowMs` to `purchasedAtMs`.

8. **Non-food merchants are rejected.** `merchantCategory: "other"` → `reasonCode: "not_food"`. `merchantCategory: "unknown"` → `reasonCode: "unknown_category"` → needs_review.

9. **Receipts with no purchase time go to review, not rejection.** `purchasedAtMs: null` → `outcome: "needs_review"`, `reasonCode: "missing_time"`.

10. **Savings are displayed but never award XP.** `savedCents` on `CountedMeal` and `estimatedSavingsCents` on `Deal` are UI-only fields. No code path may add XP based on them.

11. **Rules are checked in order; the first failure wins.** Order: missing_time → low_confidence → unknown_category → not_food → future_date → too_old → duplicate → no_deal → too_soon → daily_limit.

---

## Error Handling

**Extraction failures** (`confidence < minExtractionConfidence`, missing time, unknown category): outcome is `"needs_review"`, not `"rejected"`. The user is told what's missing and invited to try again or enter details manually.

**Hard rejections** (future date, too old, not food, duplicate, too soon, daily limit): outcome is `"rejected"`. The reason string tells the user why in plain words, and `nextEligibleAtMs` says when they can try again (where applicable).

**Stub errors**: `evaluateMeal`, `getMeals`, and `recordMeal` currently throw `"Not implemented"`. Callers in future slices must catch this and display a recoverable error state — not a crash.

**JSON fixture import errors**: `src/fixtures/index.ts` imports are resolved at build time. A schema mismatch will cause a TypeScript error at build, not a runtime error.

---

## Testing Strategy

| Layer | Tool | Location | What it covers |
|---|---|---|---|
| Unit + property | Vitest + fast-check | `src/**/*.test.ts?(x)`, `tests/**/*.test.ts` | Domain logic, meal rules, contracts (meals slice) |
| Acceptance | Vitest | `tests/acceptance/` | End-to-end rule assertions; never edited to pass |
| Smoke (E2E) | Playwright | `e2e/smoke.spec.ts` | Each screen loads, `<h1>` is visible |
| Demo walk (E2E) | Playwright | `e2e/` | Full demo script from `docs/brief.md` (later slice) |

**`npm run verify`** runs lint + typecheck (both configs) + unit/acceptance tests. It must pass before any task is marked done.

**`npm run e2e`** runs the Playwright suite. It runs the dev server automatically via `webServer` in `playwright.config.ts`.

The `passWithNoTests: true` flag in `vitest.config.ts` prevents `verify` from failing before the first test file exists. Remove it once the meals slice lands its acceptance tests.

The 20 synthetic receipt PNGs in `spikes/receipts/output/` serve as the golden set for OCR regression tests (speed.yml C9).

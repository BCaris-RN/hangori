# Foundation spec — requirements

## What this slice builds

The app shell, shared contracts, synthetic fixtures, and quality tooling. No meal logic, no OCR. Every subsequent slice builds on top of this.

## Requirements

### R1 — Installable PWA
The app must be installable via vite-plugin-pwa. It must include a web app manifest (name, short_name, icons, theme_color, background_color, display: standalone, start_url) and a Workbox service worker that precaches the compiled app shell and the files in `fixtures/`. The app must load and display its screens in airplane mode after the first visit.

### R2 — Five screens with bottom navigation
The app must have five screens reachable from a persistent bottom navigation bar:
- **Companion** (home, default route `/`)
- **Deals** (`/deals`)
- **Feed** (`/feed`)
- **Savings** (`/savings`)
- **Settings** (`/settings`)

Each screen shows placeholder content (screen name + a one-line description). Navigation is mobile-first; the bar sits at the bottom of the viewport. No screen requires a login.

### R3 — Shared contracts
`src/contracts/index.ts` must export Zod schemas and inferred TypeScript types for:

- **MealRules** — the configurable limits from `hangori-rules.md`. Defaults: `xpPerMeal: 10`, `maxMealsPer24h: 3`, `minHoursBetweenMeals: 3`, `maxReceiptAgeHours: 48`, `minExtractionConfidence: 0.8`, `countOnlyDealMeals: false`.
- **ReceiptExtraction** — `merchantName: string | null`, `merchantCategory: "food" | "other" | "unknown"`, `purchasedAtMs: number | null`, `totalCents: number | null`, `receiptId: string | null`, `itemCount: number`, `confidence: number` (0–1), `source: "tesseract" | "textract" | "manual"`, `dealId: string | null`.
- **MealDecision** — `outcome: "counted" | "rejected" | "needs_review"`, `reason: string`, `xpAwarded: number`, `fingerprint: string`, `nextEligibleAtMs: number | null`.
- **CountedMeal** — `id: string`, `fingerprint: string`, `merchantName: string`, `purchasedAtMs: number`, `totalCents: number`, `xpAwarded: number`, `dealId: string | null`, `recordedAtMs: number`.
- **Restaurant** — `id: string`, `name: string`, `category: string`, `address: string`.
- **Deal** — `id: string`, `restaurantId: string`, `title: string`, `description: string`, `code: string | null`, `terms: string`, `expiresAtMs: number | null`, `linkOutUrl: string`.
- **DealsFeed** — `deals: Deal[]`, `restaurants: Restaurant[]`, `fetchedAtMs: number`.
- **CompanionId** — `"hangori" | "brisket" | "mochi" | "grubble" | "sprig"`.
- **CompanionState** — `id: CompanionId`, `stage: 1 | 2 | 3 | 4`, `xp: number`, `totalMeals: number`, `halloween: boolean`.

Contracts may only change via an approved CR in `docs/contracts/`.

### R4 — Synthetic fixtures
- `fixtures/deals.json` — 8 made-up restaurants, 16 deals. Each deal has a `linkOutUrl` pointing to a placeholder URL (e.g. `https://example.com/order/<restaurant-id>`). No real brand names or logos. Labels use generic wording ("Open in your food app").
- `fixtures/receipts.json` — 20 `ReceiptExtraction` objects corresponding to the spike receipts (R001–R020). Use the ground-truth values from the spike. R005 and R020 (unreadable) have `confidence: 0`, all fields null except `source`.

### R5 — npm scripts and quality bar
`package.json` must define:
- `lint` — ESLint across `src/` and `e2e/`
- `typecheck` — `tsc --noEmit`
- `test` — Vitest (unit tests in `src/` and `tests/`)
- `e2e` — Playwright (`e2e/`)
- `verify` — runs `lint`, `typecheck`, `test` in sequence (not `e2e`)

All five must pass on a clean run before the slice is done.

### R6 — Playwright smoke test
`e2e/smoke.spec.ts` must navigate to each of the five routes and assert the screen's heading is visible. It must pass with `npm run e2e`.

### R7 — Domain stubs
- `src/domain/meals/evaluate.ts` — exports a function `evaluateMeal` that throws `new Error("Not implemented")`.
- `src/domain/meals/ledger.ts` — exports a function `getMeals` and a function `recordMeal`, both throwing `new Error("Not implemented")`.

These are placeholders for the meals slice.

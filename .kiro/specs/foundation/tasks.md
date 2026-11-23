# Foundation spec — tasks

Work through these in order. Run `npm run verify` after task 10 and after task 14. Fix errors before moving on; stop after 3 failed retries on the same task.

---

## Task 1 — Initialise the project

Create `package.json` at the workspace root with:
- `"type": "module"`
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `e2e`, `verify`
- All runtime and dev dependencies from `approved_packages` in `docs/speed.yml`

Then install dependencies with `npm install`.

**Done when:** `node_modules/` exists and `npm install` exits 0.

---

## Task 2 — TypeScript and Vite config

Create:
- `tsconfig.json` — strict mode, `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, paths alias `@/*` → `src/*`
- `tsconfig.node.json` — for Vite config file itself
- `vite.config.ts` — React plugin, vite-plugin-pwa with a Workbox `generateSW` strategy, precache `fixtures/**`

**Done when:** `npm run typecheck` exits 0 (no source files yet is fine).

---

## Task 3 — ESLint config

Create `eslint.config.js` using the flat config format with `@eslint/js`, `typescript-eslint`, and `eslint-plugin-react-hooks`. Lint `src/` and `e2e/`.

**Done when:** `npm run lint` exits 0 on an empty `src/`.

---

## Task 4 — Vitest config

Add a `test` block to `vite.config.ts` (or a separate `vitest.config.ts`): environment `jsdom`, globals `true`, include `src/**/*.test.ts?(x)` and `tests/**/*.test.ts`.

**Done when:** `npm run test` exits 0 with no test files found.

---

## Task 5 — Playwright config

Create `playwright.config.ts`: one project (Chromium), `baseURL` `http://localhost:5173`, `webServer` that runs `npm run dev` and waits for the URL.

**Done when:** file exists and `npx tsc --noEmit` on the config file passes.

---

## Task 6 — Contracts

Create `src/contracts/index.ts` with all Zod schemas and exported TypeScript types from R3. Export a `defaultMealRules` constant of type `MealRules` with the values from `hangori-rules.md`.

**Done when:** `npm run typecheck` exits 0.

---

## Task 7 — Domain stubs

Create `src/domain/meals/evaluate.ts` and `src/domain/meals/ledger.ts` as described in R7.

**Done when:** `npm run typecheck` exits 0.

---

## Task 8 — Synthetic fixtures

Create `fixtures/deals.json` and `fixtures/receipts.json` as described in R4.

`deals.json` shape: `{ "restaurants": [...], "deals": [...], "fetchedAtMs": <ms> }` matching the `DealsFeed` schema.

`receipts.json` shape: array of 20 objects matching the `ReceiptExtraction` schema, one per spike receipt R001–R020 in order.

**Done when:** both files parse as valid JSON and satisfy their Zod schemas (verify with a quick `node -e` check).

---

## Task 9 — App entry point and HTML

Create:
- `index.html` — standard Vite entry, `<div id="root">`, loads `src/main.tsx`
- `src/main.tsx` — renders `<App />` into `#root`
- `src/App.tsx` — sets up React Router with the five routes and renders `<BottomNav />`
- `src/ui/BottomNav.tsx` — five nav links, `position: fixed`, bottom of viewport

**Done when:** `npm run typecheck` exits 0.

---

## Task 10 — Five screen components

Create one file per screen in `src/features/<feature>/`:
- `src/features/companion/CompanionScreen.tsx`
- `src/features/deals/DealsScreen.tsx`
- `src/features/feed/FeedScreen.tsx`
- `src/features/savings/SavingsScreen.tsx`
- `src/features/settings/SettingsScreen.tsx`

Each exports a default component that renders an `<h1>` with the screen name and a `<p>` with a one-line description. Use `data-testid="screen-<name>"` on the root element.

**Run `npm run verify` here.**

**Done when:** `npm run verify` exits 0.

---

## Task 11 — PWA manifest and icons

Add to `vite.config.ts` PWA manifest: `name: "Hangori"`, `short_name: "Hangori"`, `theme_color: "#1a1a2e"`, `background_color: "#1a1a2e"`, `display: "standalone"`, `start_url: "/"`, `icons` array with a 192×192 and a 512×512 placeholder PNG (generate simple coloured squares with a canvas script or use inline SVG data URIs).

Create `public/icons/` with the two icon files.

**Done when:** `npm run build` exits 0 and `dist/manifest.webmanifest` exists.

---

## Task 12 — Service worker precache of fixtures

Confirm the Workbox config in `vite.config.ts` includes `fixtures/deals.json` and `fixtures/receipts.json` in the precache manifest (use `globPatterns` or `additionalManifestEntries`). Copy fixtures to `public/fixtures/` so Vite serves them.

**Done when:** `npm run build` exits 0 and the built service worker references both fixture files.

---

## Task 13 — Playwright smoke test

Create `e2e/smoke.spec.ts`. For each of the five routes (`/`, `/deals`, `/feed`, `/savings`, `/settings`), navigate to it and assert that the `<h1>` matching the screen name is visible.

**Done when:** `npm run e2e` exits 0.

---

## Task 14 — Final verify

Run `npm run verify` and `npm run e2e`. Both must exit 0.

If either fails, read the error, fix it, and retry (up to 3 times total).

**Done when:** both commands exit 0.

---

## Summary checkpoint

After task 14, write a short summary in `docs/session-log/foundation.md`:
- What was built
- Test results (`npm run verify` and `npm run e2e` output)
- Any choices made (e.g. icon generation approach, router library used)
- Any open questions

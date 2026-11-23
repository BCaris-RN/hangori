---
inclusion: always
---

# Hangori: technology stack

## Runtime and framework

- **React + TypeScript + Vite** — the entire app is a client-side SPA.
- Deployed as an **installable, offline-first PWA**. No backend in this build; all logic runs in the browser.

## Key libraries

| Concern | Library |
|---|---|
| Schema and contracts | Zod |
| Local persistence | IndexedDB via `idb` |
| Unit and property tests | Vitest + fast-check |
| Demo walk (E2E) | Playwright |

## Packages

Only add packages listed in `approved_packages` in `docs/speed.yml`. Ask Brandon before adding anything else.

## Contracts

Shared types and Zod schemas live in `src/contracts/`. They may only change through a change request filed at `docs/contracts/CR-<n>.md` and approved by Brandon.

## Testing approach

- Unit and property tests (Vitest + fast-check) cover domain logic, especially the meal rules.
- Acceptance tests in `tests/acceptance/` assert the product rules end-to-end. Never edit them to make them pass — fix the code instead.
- Playwright drives the demo walk in `e2e/`.
- Run `npm run verify` (lint, typecheck, unit tests, acceptance tests) before marking any task done.

## Data

Synthetic data only in this build. Fixtures live in `fixtures/`. Never commit real receipts, real names, real card numbers, or real addresses anywhere in the repo.

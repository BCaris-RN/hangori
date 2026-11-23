---
inclusion: always
---

# Hangori: project structure

## Directory layout

```
src/
  contracts/        Zod schemas and shared TypeScript types. Change only via an approved CR.
  domain/
    meals/          Meal validation, XP calculation, duplicate detection, and the rule-check pipeline.
    companions/     Companion state, XP thresholds, evolution logic, and Halloween forms.
  features/
    <feature>/      One folder per product feature (deals, feed, receipt-scan, etc.).
                    Each feature owns its own components, hooks, and local state.
  ui/               Shared, feature-agnostic UI primitives and layout components.

fixtures/           Synthetic restaurants, receipts, and deals used for testing and demo mode.
tests/
  acceptance/       End-to-end acceptance tests that assert the product rules (Vitest).
                    Never edit these to make them pass — fix the code.
e2e/                Playwright scripts that drive the demo walk.
docs/               Project brief, playbook, contracts CRs, speed.yml, and session logs.
.kiro/
  steering/         These files, plus hangori-rules.md (the meal-rule source of truth).
  specs/            Per-slice specs. Read the relevant spec before starting any slice.
```

## Conventions

- Shared contracts (`src/contracts/`) are the boundary between features. Features import from contracts; they do not import from each other's internals.
- Domain logic in `src/domain/` has no React or Vite dependencies — plain TypeScript only. This keeps it fast to test.
- Each feature folder is self-contained: components, hooks, and any feature-local types live together. Only what other features genuinely need moves up to `src/contracts/` or `src/ui/`.
- Work only in the folders your task names. Do not reorganize shared folders without a change request.

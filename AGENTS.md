# AGENTS.md: rules for every coding agent (Kiro, Codex)

Kiro is the builder. Codex reviews and writes independent tests, and only builds a feature when Brandon asks.

## Before you start
- Read `.kiro/steering/hangori-rules.md` (product rules) and `docs/brief.md`.
- Before starting a slice, read its spec in `.kiro/specs/<name>/`. If it touches the meal rules, also read `docs/speed.yml`. The meal rules run at the strictest settings.

## Boundaries
- Work only in the folders your task names. Shared contracts in `src/contracts/` change only through a change request in `docs/contracts/CR-<n>.md` that Brandon approves.
- Don't edit tests in `tests/acceptance/` to make them pass. Fix the code. If a test looks wrong, say so and stop.
- Only add packages from `approved_packages` in `docs/speed.yml`. Ask before adding anything else.
- Don't change CI, hosting, or build configuration without Brandon's approval.
- Never weaken, skip, or delete a check to make it pass.

## Verify
- Run `npm run verify` (lint, typecheck, unit and acceptance tests) before you call a task done.
- Circuit breaker: after 3 failed verify runs in a row on the same task, stop. Write what you tried in `docs/session-log/` and hand the task back.

## Git
- One branch per slice: `slice/<spec-name>`.
- Never push, merge, tag, release, or deploy on your own. Brandon authorizes each one.
- End each task with a short summary: what changed, the tests you ran, and any open questions.

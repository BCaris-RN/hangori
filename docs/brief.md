# Hangori: project brief (Phase 0)

Playbook: Universal App Build Playbook v2.2 (`docs/playbook.md`), Recipe A (hackathon sprint).

| Question | Answer |
|---|---|
| The app in one sentence | Hangori collects restaurant coupons and food-app deals in one place, and your companion eats and evolves each time you confirm a real meal with a receipt. |
| Who relies on it | Hackathon judges and testers. Synthetic data only. Later: Gen Z and Gen Alpha diners. Real users start at 13+, since under-13 users bring COPPA. |
| Live actions it can take | None in this build. It has link-outs to food apps and reads receipts on the device. No payments, messages, or accounts. |
| Hard deadline | Kiroween 2026: Dec 4, 2026, 2:00 PM PT (12:00 PM Hawaii). Target submit: Dec 3 evening. |
| Data sensitivity | Synthetic only (Fork 4). Real receipts would be personal data and need the Pilot profile. |
| Riskiest dependency | Confirming a real purchase without food-app APIs. Answer: receipt reading. The spike tests on-device OCR against Amazon Textract AnalyzeExpense. |
| Release profile | Demo (Fork 13) |
| Category | Resurrection. It revives the 90s virtual pet and newspaper coupon clipping. |

## Demo script (under 3 minutes)

1. Open the installed Hangori app. Pick a companion (Hangori the Goblin) and watch it hatch from its egg.
2. Browse deals from made-up local restaurants and open one: code, terms, "Open in DoorDash" link-out.
3. "Eat," then tap **Feed** and snap a synthetic receipt. Hangori reads it and counts one meal. The companion eats, the XP bar fills, and the savings total goes up.
4. Try to game it:
   - The same receipt again is rejected as already eaten.
   - A $120 family order counts as one meal, with the same XP as a $9 taco.
   - A fourth meal too soon shows "Hangori is full. Next meal in 2h 10m."
5. Evolution: the companion reaches its next stage in its Halloween form.
6. Airplane mode: the deals still load.

## Out of scope for this build
Real users or receipts, accounts and login, payments, ordering inside Hangori, food-app APIs or scraping, partner portal, notifications, kids' accounts, app-store builds, and licensed characters.

## Open decisions
- Meal limits (provisional): 3 a day, 3 hours apart, receipts up to 48 hours old.
- Should only meals bought with a deal count? Default is no (`countOnlyDealMeals: false`).

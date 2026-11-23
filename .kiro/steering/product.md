---
inclusion: always
---

# Hangori: product context

## Purpose

Hangori collects restaurant coupons and food-app deals in one place. Each time the user confirms a real meal with a receipt, their companion eats, gains XP, and evolves. The core goal is helping people save money on food — not encouraging them to eat out more.

## Users

Hackathon judges and testers in this build (synthetic data only). Future real users are Gen Z and Gen Alpha diners, starting at age 13+. Under-13 users are out of scope because they trigger COPPA obligations.

## Companions

Five companions, each with four evolution stages and a Halloween form. All art is original pixel art — never use characters, names, or art from existing games, films, or brands.

| Name | Species |
|---|---|
| Hangori | Goblin |
| Brisket | Dwarf |
| Mochi | Blob |
| Grubble | Troll |
| Sprig | Wood Elf |

## Demo script (target: under 3 minutes)

1. Open the installed Hangori app. Pick Hangori the Goblin and watch it hatch from its egg.
2. Browse deals from made-up local restaurants and open one: code, terms, "Open in DoorDash" link-out.
3. Tap **Feed** and snap a synthetic receipt. Hangori reads it and counts one meal. The companion eats, the XP bar fills, and the savings total goes up.
4. Try to game it:
   - Resubmit the same receipt → rejected as already eaten.
   - Submit a $120 family order → same XP as a $9 taco.
   - Submit a fourth meal too soon → "Hangori is full. Next meal in 2h 10m."
5. The companion reaches its next stage in its Halloween form.
6. Switch to airplane mode — deals still load.

## Meal and XP rules

See `.kiro/steering/hangori-rules.md`. Never duplicate those rules here; that file is the single source of truth.

## Out of scope for this build

Real users or receipts, accounts and login, payments, ordering inside Hangori, food-app APIs or scraping, partner portal, push notifications, kids' accounts, app-store builds, and licensed characters.

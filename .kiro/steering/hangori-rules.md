---
inclusion: always
---

# Hangori product rules

These rules define the product. Never break them, and never write code that would let a user get around them. If a rule blocks something you were asked to build, stop and say so.

## What Hangori is

Hangori collects restaurant coupons and food-app deals in one place. When the user confirms a real meal with a receipt, their companion eats, gains XP, and evolves. The core purpose is helping people save money on food. It is not about getting people to eat out more.

## Meal rules (the anti-gaming core)

- One confirmed purchase is one meal. A $9 taco and a $120 family order give exactly the same XP. XP never depends on price, item count, or order size.
- A meal is worth `xpPerMeal` XP (default 10). Rejected meals and meals sent to review give 0 XP. XP never goes down.
- A companion eats like one person:
  - no more than `maxMealsPer24h` counted meals (default 3) within any span shorter than 24 hours
  - counted meals at least `minHoursBetweenMeals` apart (default 3), measured by purchase time in either order
- A receipt counts once. Resubmitting or re-photographing the same receipt is rejected as a duplicate. The fingerprint is: merchant name (lowercase, letters and digits only), purchase time to the minute, total in cents, and receipt ID (uppercase, letters and digits only) when present.
- A receipt is rejected if it's dated more than 5 minutes in the future, if it's older than `maxReceiptAgeHours` (default 48), or if the merchant isn't a food business.
- A receipt is sent to review, not counted, when there's no purchase time, the merchant category is unknown, or the extraction confidence is below `minExtractionConfidence` (default 0.8).
- Check the rules in this order, and report the first one that fails: missing purchase time, low confidence, merchant category, future date, too old, duplicate, deal-only rule, too soon, daily limit.
- `countOnlyDealMeals` defaults to false. When true, meals without a deal are rejected.
- Savings are tracked and shown, but they never award XP.
- Every rejection tells the user why in plain words, and when the next meal can count.

## Companions

Hangori the Goblin, Brisket the Dwarf, Mochi the Blob, Grubble the Troll, and Sprig the Wood Elf. Each has four stages and a Halloween form. All art is original pixel art. Never use characters, names, or art from existing games, films, or brands.

## Food apps

- No scraping, no unofficial APIs, and no automating DoorDash, Uber Eats, Grubhub, or any other app. Never ask for or store a user's food-app password.
- Connections are link-outs (open the restaurant's page in the food app or on its site) plus receipt confirmation.
- Link-out buttons use generic labels such as "Open in your food app." No third-party brand names or logos anywhere in the UI, because the Kiroween video can't show other companies' trademarks.
- Judges must be able to try every rule without a real receipt, using the Try it screen, the sample receipts, and demo mode. Nothing requires a login.
- Never put API keys or credentials in the repo.

## Data

- This build uses synthetic data only. That means made-up restaurants, receipts, and deals in `fixtures/`.
- Never add real receipts, real names, real card numbers, or real addresses to the repo, fixtures, logs, or screenshots.
- Receipt images stay on the device unless the cloud extractor is switched on. Nothing else leaves the device.

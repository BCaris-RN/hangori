import type { CompanionState, CountedMeal, ReceiptExtraction } from "@/contracts/index";
import { dealsFeed } from "@/fixtures/index";
import { buildFingerprint } from "@/domain/meals/fingerprint";
import type { LedgerSnapshot } from "@/domain/meals/ledger";
import { HOUR_MS } from "@/domain/meals/time";

/**
 * The seeded demo profile ("demo den"): one companion at each evolution stage, plus an
 * unhatched Hangori egg for the 60-second path. It is local, synthetic data, not an
 * account: nothing here is a login.
 *
 * The meal history is real ledger data that obeys the meal rules (two meals a day,
 * 8 and 16 hours apart, all older than 48 hours), and the companions' XP adds up to
 * exactly the XP of those meals.
 */
export const SEED_COMPANIONS: Array<Pick<CompanionState, "id" | "stage" | "xp" | "totalMeals">> = [
  { id: "sprig", stage: 1, xp: 10, totalMeals: 1 },
  { id: "mochi", stage: 2, xp: 30, totalMeals: 3 },
  { id: "grubble", stage: 3, xp: 70, totalMeals: 7 },
  { id: "brisket", stage: 4, xp: 130, totalMeals: 13 },
];

const XP_PER_SEEDED_MEAL = 10;

/** The extraction a seeded meal would have come from. */
function seededExtraction(i: number, purchasedAtMs: number) {
  const restaurant = dealsFeed.restaurants[i % dealsFeed.restaurants.length];
  const deal = i % 3 === 0 ? dealsFeed.deals.find((d) => d.restaurantId === restaurant.id) : undefined;
  const extraction: ReceiptExtraction = {
    merchantName: restaurant.name,
    merchantCategory: "food",
    purchasedAtMs,
    totalCents: 900 + ((i * 397) % 2200),
    receiptId: `DEMO${String(i).padStart(3, "0")}`,
    itemCount: 1 + (i % 4),
    confidence: 0.95,
    source: "sample",
    dealId: deal?.id ?? null,
  };
  return { extraction, savedCents: deal?.estimatedSavingsCents ?? null };
}

export function buildDemoSeed(nowMs: number): LedgerSnapshot {
  const totalMeals = SEED_COMPANIONS.reduce((sum, c) => sum + c.totalMeals, 0);

  const meals: CountedMeal[] = Array.from({ length: totalMeals }, (_, i) => {
    const day = 3 + Math.floor(i / 2);
    const hoursBack = day * 24 + (i % 2 === 0 ? 1 : 9);
    const purchasedAtMs = nowMs - hoursBack * HOUR_MS;
    const { extraction, savedCents } = seededExtraction(i, purchasedAtMs);
    return {
      id: `demo-meal-${i}`,
      fingerprint: buildFingerprint(extraction),
      merchantName: extraction.merchantName as string,
      purchasedAtMs,
      totalCents: extraction.totalCents as number,
      xpAwarded: XP_PER_SEEDED_MEAL,
      savedCents,
      dealId: extraction.dealId,
      recordedAtMs: purchasedAtMs + 5 * 60_000,
    };
  });

  return {
    meals,
    companions: SEED_COMPANIONS.map((c) => ({ ...c, halloween: true })),
    meta: { activeId: "brisket", halloween: true, demo: true, sampleEpochMs: nowMs },
  };
}

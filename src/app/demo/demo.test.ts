import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { defaultMealRules, type ReceiptExtraction } from "@/contracts/index";
import { createMealLedger } from "@/domain/meals/ledger";
import { evaluateMeal } from "@/domain/meals/evaluate";
import { formatWait, HOUR_MS } from "@/domain/meals/time";
import { stageForXp } from "@/domain/companions/stages";
import { buildDemoSeed, SEED_COMPANIONS } from "./seed";
import { SAMPLE_RECEIPTS, findSample } from "./samples";
import { dealsFeed } from "@/fixtures/index";
import { findDeal } from "@/app/deals";

const NOW = Date.UTC(2026, 10, 26, 18);
let n = 0;
const ledgerFor = () =>
  createMealLedger({ rules: defaultMealRules, storage: "indexeddb", dbName: `demo-test-${++n}` });

describe("demo seed", () => {
  const seed = buildDemoSeed(NOW);

  it("has one companion at each of stages 1 to 4, and no Hangori yet", () => {
    expect(seed.companions.map((c) => c.stage).sort()).toEqual([1, 2, 3, 4]);
    expect(seed.companions.some((c) => c.id === "hangori")).toBe(false);
    for (const c of seed.companions) expect(stageForXp(c.xp)).toBe(c.stage);
  });

  it("totals the same XP in companions and in counted meals", () => {
    const companionXp = seed.companions.reduce((sum, c) => sum + c.xp, 0);
    const mealXp = seed.meals.reduce((sum, m) => sum + m.xpAwarded, 0);
    expect(companionXp).toBe(mealXp);
    expect(seed.meals).toHaveLength(SEED_COMPANIONS.reduce((s, c) => s + c.totalMeals, 0));
    for (const c of seed.companions) expect(c.xp).toBe(c.totalMeals * 10);
  });

  it("has a history that obeys the meal rules, replayed in order", () => {
    const ordered = [...seed.meals].sort((a, b) => a.purchasedAtMs - b.purchasedAtMs);
    ordered.forEach((meal, i) => {
      const extraction: ReceiptExtraction = {
        merchantName: meal.merchantName,
        merchantCategory: "food",
        purchasedAtMs: meal.purchasedAtMs,
        totalCents: meal.totalCents,
        receiptId: `DEMO${meal.id.replace("demo-meal-", "").padStart(3, "0")}`,
        itemCount: 1,
        confidence: 0.95,
        source: "sample",
        dealId: meal.dealId,
      };
      const decision = evaluateMeal(extraction, ordered.slice(0, i), defaultMealRules, meal.recordedAtMs);
      expect(decision.reasonCode, meal.id).toBe("counted");
      expect(decision.fingerprint, meal.id).toBe(meal.fingerprint);
    });
  });

  it("keeps every seeded meal older than the sample window, so samples never collide", () => {
    for (const m of seed.meals) expect(NOW - m.purchasedAtMs).toBeGreaterThan(48 * HOUR_MS);
  });

  it("attaches real savings only to meals that used a deal", () => {
    const withSavings = seed.meals.filter((m) => m.savedCents !== null);
    expect(withSavings.length).toBeGreaterThan(0);
    for (const m of withSavings) {
      expect(findDeal(dealsFeed, m.dealId)?.estimatedSavingsCents).toBe(m.savedCents);
    }
  });

  it("loads into a ledger and leaves Hangori's egg waiting", async () => {
    const ledger = ledgerFor();
    await ledger.replaceAll(seed);
    const snap = await ledger.snapshot();
    expect(snap.meta).toMatchObject({ demo: true, activeId: "brisket" });
    expect(snap.companions).toHaveLength(4);
    expect(await ledger.totalXp()).toBe(240);
  });
});

describe("sample receipts", () => {
  const epoch = NOW;

  async function walk(ids: string[]) {
    const ledger = ledgerFor();
    await ledger.adopt("hangori");
    const out = [];
    for (const id of ids) {
      const sample = findSample(id);
      if (!sample) throw new Error(id);
      const extraction = sample.build(epoch);
      const deal = findDeal(dealsFeed, extraction.dealId);
      out.push(
        await ledger.submit(extraction, epoch, {
          companionId: "hangori",
          savedCents: deal?.estimatedSavingsCents ?? null,
        }),
      );
    }
    return { ledger, out };
  }

  it("covers every scenario the brief needs", () => {
    expect(SAMPLE_RECEIPTS.map((s) => s.id)).toEqual([
      "burger",
      "tacos",
      "family",
      "again",
      "noodles",
      "hardware",
      "old",
      "future",
      "notime",
      "blurry",
    ]);
  });

  it("counts the burger, tacos and family feast, and evolves on the second meal", async () => {
    const { out, ledger } = await walk(["burger", "tacos", "family"]);
    expect(out.map((r) => r.decision.reasonCode)).toEqual(["counted", "counted", "counted"]);
    expect(out.map((r) => r.leveledUp)).toEqual([true, true, true]);
    expect(out.map((r) => r.evolved)).toEqual([false, true, false]);
    expect(await ledger.totalXp()).toBe(30);
  });

  it("gives the family feast the same XP as the cheapest meal", async () => {
    const { out } = await walk(["burger", "family"]);
    expect(out[0].decision.xpAwarded).toBe(out[1].decision.xpAwarded);
  });

  it("counts the three meals in any order", async () => {
    const orders = [
      ["burger", "tacos", "family"],
      ["burger", "family", "tacos"],
      ["tacos", "burger", "family"],
      ["tacos", "family", "burger"],
      ["family", "burger", "tacos"],
      ["family", "tacos", "burger"],
    ];
    for (const order of orders) {
      const { out } = await walk(order);
      expect(out.map((r) => r.decision.reasonCode), order.join(",")).toEqual(["counted", "counted", "counted"]);
    }
  });

  it("rejects the same burger photographed again, even with different confidence", async () => {
    const { out } = await walk(["burger", "again"]);
    expect(out[1].decision.reasonCode).toBe("duplicate");
    expect(out[1].companion.xp).toBe(10);
  });

  it("shows 'Next meal in 2h 10m' for a meal right after the second counted meal", async () => {
    const { out } = await walk(["burger", "tacos", "noodles"]);
    const blocked = out[2].decision;
    expect(blocked.reasonCode).toBe("too_soon");
    expect(formatWait((blocked.nextEligibleAtMs as number) - epoch)).toBe("2h 10m");
    expect(out[2].companion.xp).toBe(20);
  });

  it("stretches the wait to 16h once three meals fill the daily limit", async () => {
    const { out } = await walk(["burger", "tacos", "family", "noodles"]);
    const blocked = out[3].decision;
    expect(blocked.reasonCode).toBe("too_soon");
    // Spacing alone would clear at 2h 10m, but a fourth meal inside 24 hours is not allowed.
    expect(formatWait((blocked.nextEligibleAtMs as number) - epoch)).toBe("16h");
    expect(out[3].companion.xp).toBe(30);
  });

  it("rejects or reviews every gaming sample with the right code and no XP", async () => {
    const expected: Record<string, string> = {
      hardware: "not_food",
      old: "too_old",
      future: "future_date",
      notime: "missing_time",
      blurry: "missing_time",
    };
    for (const [id, code] of Object.entries(expected)) {
      const { out } = await walk([id]);
      expect(out[0].decision.reasonCode, id).toBe(code);
      expect(out[0].decision.xpAwarded, id).toBe(0);
      expect(out[0].decision.reason.split(" ").length, id).toBeGreaterThan(4);
    }
  });

  it("links the deal samples to real deals so savings are tracked", async () => {
    const { ledger } = await walk(["burger", "tacos"]);
    const meals = await ledger.countedMeals();
    // Oldest purchase first: the burger (-8h) then the tacos (-50m).
    expect(meals.map((m) => m.savedCents)).toEqual([299, 499]);
  });

  it("uses fixed offsets, so the same sample built twice is the same receipt", () => {
    const sample = findSample("burger");
    expect(sample?.build(epoch)).toEqual(sample?.build(epoch));
  });
});

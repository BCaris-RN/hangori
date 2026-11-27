import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { defaultMealRules, type CountedMeal, type ReceiptExtraction } from "@/contracts/index";
import { createMealLedger, type MealLedger } from "./ledger";
import { createIdbStore } from "./store";
import { buildFingerprint } from "./fingerprint";
import { HOUR_MS } from "./time";

const NOW = Date.UTC(2026, 10, 23, 12);
let dbCounter = 0;
const freshDb = () => `hangori-test-${++dbCounter}`;

function receipt(patch: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    merchantName: "Brumwicket Buns",
    merchantCategory: "food",
    purchasedAtMs: NOW - HOUR_MS,
    totalCents: 1497,
    receiptId: "LEDGER-001",
    itemCount: 3,
    confidence: 0.95,
    source: "sample",
    dealId: null,
    ...patch,
  };
}

describe.each(["memory", "indexeddb"] as const)("meal ledger (%s)", (storage) => {
  const make = (dbName = freshDb()): MealLedger =>
    createMealLedger({ rules: defaultMealRules, storage, dbName });

  it("counts a meal, saves it, and gives the companion the XP", async () => {
    const ledger = make();
    await ledger.adopt("hangori");
    const result = await ledger.submit(receipt(), NOW, { companionId: "hangori" });
    expect(result.decision.outcome).toBe("counted");
    expect(result.companion).toMatchObject({ xp: 10, totalMeals: 1, stage: 1 });
    expect(result.leveledUp).toBe(true);
    expect(await ledger.totalXp()).toBe(10);
    expect(await ledger.countedMeals()).toHaveLength(1);
  });

  it("rejects the same receipt a second time and adds no XP", async () => {
    const ledger = make();
    await ledger.adopt("hangori");
    await ledger.submit(receipt(), NOW, { companionId: "hangori" });
    const again = await ledger.submit(receipt(), NOW, { companionId: "hangori" });
    expect(again.decision.reasonCode).toBe("duplicate");
    expect(again.companion.xp).toBe(10);
    expect(await ledger.countedMeals()).toHaveLength(1);
  });

  it("counts exactly one of two identical submits made at the same moment", async () => {
    const ledger = make();
    await ledger.adopt("hangori");
    const [a, b] = await Promise.all([
      ledger.submit(receipt(), NOW, { companionId: "hangori" }),
      ledger.submit(receipt(), NOW, { companionId: "hangori" }),
    ]);
    const counted = [a, b].filter((r) => r.decision.outcome === "counted");
    expect(counted).toHaveLength(1);
    expect([a, b].map((r) => r.decision.reasonCode).sort()).toEqual(["counted", "duplicate"]);
    expect(await ledger.totalXp()).toBe(10);
    expect((await ledger.snapshot()).companions[0].xp).toBe(10);
  });

  it("refuses to evaluate when the companion is not hatched, and writes nothing", async () => {
    const ledger = make();
    await expect(ledger.submit(receipt(), NOW, { companionId: "sprig" })).rejects.toThrow(/No hatched companion/);
    expect(await ledger.countedMeals()).toHaveLength(0);
    // The queue keeps working after a rejected job.
    await ledger.adopt("sprig");
    const ok = await ledger.submit(receipt(), NOW, { companionId: "sprig" });
    expect(ok.decision.outcome).toBe("counted");
  });

  it("gives no XP for rejected or review receipts", async () => {
    const ledger = make();
    await ledger.adopt("mochi");
    const nonFood = await ledger.submit(receipt({ merchantCategory: "other" }), NOW, { companionId: "mochi" });
    const noTime = await ledger.submit(receipt({ purchasedAtMs: null }), NOW, { companionId: "mochi" });
    expect(nonFood.decision.outcome).toBe("rejected");
    expect(noTime.decision.outcome).toBe("needs_review");
    expect((await ledger.snapshot()).companions[0]).toMatchObject({ xp: 0, totalMeals: 0 });
  });

  it("evolves the companion on the second meal and keeps savings out of XP", async () => {
    const ledger = make();
    await ledger.adopt("hangori");
    await ledger.submit(receipt({ receiptId: "A" }), NOW, { companionId: "hangori", savedCents: 299 });
    const second = await ledger.submit(
      receipt({ receiptId: "B", purchasedAtMs: NOW - 5 * HOUR_MS }),
      NOW,
      { companionId: "hangori", savedCents: 99_999 },
    );
    expect(second.evolved).toBe(true);
    expect([second.fromStage, second.toStage]).toEqual([1, 2]);
    expect(second.companion.xp).toBe(20);
    const meals = await ledger.countedMeals();
    expect(meals.map((m) => m.savedCents)).toEqual([99_999, 299]);
    expect(await ledger.totalXp()).toBe(20);
  });

  it("makes a family order worth the same XP as a small one", async () => {
    const ledger = make();
    await ledger.adopt("grubble");
    const big = await ledger.submit(
      receipt({ receiptId: "BIG", totalCents: 10850, itemCount: 40, purchasedAtMs: NOW - 8 * HOUR_MS }),
      NOW,
      { companionId: "grubble" },
    );
    const small = await ledger.submit(receipt({ receiptId: "SMALL", totalCents: 900, itemCount: 1 }), NOW, {
      companionId: "grubble",
    });
    expect(big.decision.xpAwarded).toBe(small.decision.xpAwarded);
  });

  it("switches the Halloween form for every companion", async () => {
    const ledger = make();
    await ledger.adopt("hangori");
    await ledger.adopt("sprig");
    await ledger.setHalloween(false);
    const snap = await ledger.snapshot();
    expect(snap.meta.halloween).toBe(false);
    expect(snap.companions.every((c) => c.halloween === false)).toBe(true);
  });

  it("resets to an empty profile", async () => {
    const ledger = make();
    await ledger.adopt("hangori");
    await ledger.submit(receipt(), NOW, { companionId: "hangori" });
    await ledger.reset();
    const snap = await ledger.snapshot();
    expect(snap.meals).toEqual([]);
    expect(snap.companions).toEqual([]);
    expect(snap.meta.activeId).toBeNull();
  });

  it("keeps companion XP equal to ledger XP for any sequence of receipts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: -48 * 60, max: 5 }), { minLength: 1, maxLength: 15 }),
        async (minutes) => {
          const ledger = make();
          await ledger.adopt("brisket");
          for (const [i, minute] of minutes.entries()) {
            await ledger.submit(
              receipt({ purchasedAtMs: NOW + minute * 60_000, receiptId: `P-${i}` }),
              NOW,
              { companionId: "brisket" },
            );
          }
          const snap = await ledger.snapshot();
          const ledgerXp = snap.meals.reduce((sum, m) => sum + m.xpAwarded, 0);
          expect(snap.companions[0].xp).toBe(ledgerXp);
          expect(snap.companions[0].totalMeals).toBe(snap.meals.length);
          expect(new Set(snap.meals.map((m) => m.fingerprint)).size).toBe(snap.meals.length);
        },
      ),
      { numRuns: 25 },
    );
  });
});

describe("meal ledger (indexeddb durability)", () => {
  it("keeps meals, XP and the active companion after a reload", async () => {
    const dbName = freshDb();
    const first = createMealLedger({ rules: defaultMealRules, storage: "indexeddb", dbName });
    await first.adopt("mochi");
    await first.submit(receipt(), NOW, { companionId: "mochi" });

    const second = createMealLedger({ rules: defaultMealRules, storage: "indexeddb", dbName });
    const snap = await second.snapshot();
    expect(snap.meta.activeId).toBe("mochi");
    expect(snap.companions[0]).toMatchObject({ id: "mochi", xp: 10 });
    expect(await second.countedMeals()).toHaveLength(1);
    // And the duplicate is still refused after the reload.
    const again = await second.submit(receipt(), NOW, { companionId: "mochi" });
    expect(again.decision.reasonCode).toBe("duplicate");
  });

  it("enforces one meal per fingerprint in the database itself, and rolls back the XP with it", async () => {
    const store = createIdbStore(freshDb());
    const r = receipt();
    const meal = (id: string): CountedMeal => ({
      id,
      fingerprint: buildFingerprint(r),
      merchantName: "Brumwicket Buns",
      purchasedAtMs: r.purchasedAtMs!,
      totalCents: 1497,
      xpAwarded: 10,
      savedCents: null,
      dealId: null,
      recordedAtMs: NOW,
    });
    const companion = (xp: number) => ({ id: "hangori" as const, stage: 1 as const, xp, totalMeals: 1, halloween: true });

    await store.transact(() => ({ result: undefined, meal: meal("one"), companions: [companion(10)] }));
    await expect(
      store.transact(() => ({ result: undefined, meal: meal("two"), companions: [companion(20)] })),
    ).rejects.toBeTruthy();

    const snap = await store.snapshot();
    expect(snap.meals.map((m) => m.id)).toEqual(["one"]);
    expect(snap.companions[0].xp).toBe(10);
  });

  it("writes nothing when the transaction body throws", async () => {
    const store = createIdbStore(freshDb());
    await expect(
      store.transact(() => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await store.snapshot()).meals).toEqual([]);
  });
});

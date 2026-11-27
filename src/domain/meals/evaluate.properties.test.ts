import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  defaultMealRules,
  type CountedMeal,
  type MealRules,
  type ReceiptExtraction,
} from "@/contracts/index";
import { evaluateMeal } from "./evaluate";
import { HOUR_MS, MINUTE_MS } from "./time";

/**
 * Property tests that sit beside the committed acceptance properties, covering the
 * rules they leave out: price independence, what a counted meal must satisfy, and the
 * promise made by nextEligibleAtMs.
 */
const NOW = Date.UTC(2026, 10, 23, 12);
const options = { seed: 20261126, numRuns: 150 } as const;

function receipt(patch: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    merchantName: "Brumwicket Buns",
    merchantCategory: "food",
    purchasedAtMs: NOW,
    totalCents: 900,
    receiptId: "BASE",
    itemCount: 1,
    confidence: 0.95,
    source: "sample",
    dealId: null,
    ...patch,
  };
}

/** Builds a rule-valid ledger by feeding receipts through the evaluator. */
function ledgerFrom(receipts: ReceiptExtraction[], rules: MealRules): CountedMeal[] {
  const ledger: CountedMeal[] = [];
  for (const r of receipts) {
    const d = evaluateMeal(r, ledger, rules, NOW);
    if (d.outcome !== "counted") continue;
    ledger.push({
      id: `h-${ledger.length}`,
      fingerprint: d.fingerprint,
      merchantName: r.merchantName as string,
      purchasedAtMs: r.purchasedAtMs as number,
      totalCents: r.totalCents as number,
      xpAwarded: d.xpAwarded,
      savedCents: null,
      dealId: r.dealId,
      recordedAtMs: NOW,
    });
  }
  return ledger;
}

const arbRules: fc.Arbitrary<MealRules> = fc
  .record({
    xpPerMeal: fc.integer({ min: 1, max: 50 }),
    maxMealsPer24h: fc.integer({ min: 1, max: 5 }),
    minHoursBetweenMeals: fc.integer({ min: 1, max: 6 }),
    maxReceiptAgeHours: fc.integer({ min: 1, max: 72 }),
    minExtractionConfidence: fc.constantFrom(0.5, 0.8, 0.95),
    countOnlyDealMeals: fc.boolean(),
    maxFutureSkewMinutes: fc.constantFrom(0, 5, 30),
  })
  .map((partial) => ({ ...defaultMealRules, ...partial }));

/**
 * Any extraction at all, including unreadable and out-of-range ones. It leans toward
 * plausible receipts (most fields present, mostly food, often confident) so that counted
 * meals are common enough for the properties below to say something. Fully random
 * fields almost never produce a countable meal.
 */
const arbExtraction: fc.Arbitrary<ReceiptExtraction> = fc.record({
  merchantName: fc.option(fc.constantFrom("Brumwicket Buns", "Café Ñandú", "x y z"), { nil: null, freq: 12 }),
  merchantCategory: fc.constantFrom(
    "food" as const,
    "food" as const,
    "food" as const,
    "food" as const,
    "other" as const,
    "unknown" as const,
  ),
  purchasedAtMs: fc.option(fc.integer({ min: NOW - 60 * HOUR_MS, max: NOW + HOUR_MS }), { nil: null, freq: 12 }),
  totalCents: fc.option(fc.integer({ min: 0, max: 10_000_000 }), { nil: null, freq: 12 }),
  receiptId: fc.option(fc.constantFrom("Q-1", "Q-2", "q.3"), { nil: null }),
  itemCount: fc.integer({ min: 0, max: 500 }),
  confidence: fc.oneof(fc.constant(0.96), fc.double({ min: 0, max: 1, noNaN: true })),
  source: fc.constantFrom("tesseract" as const, "manual" as const, "sample" as const),
  dealId: fc.option(fc.constantFrom("deal-a", "deal-b"), { nil: null, freq: 2 }),
});

/** Valid food receipts at various times, with receipt IDs that can never match a "Q-" receipt. */
const arbHistoryReceipts = fc
  .array(fc.integer({ min: -47 * 60, max: 5 }), { maxLength: 8 })
  .map((minutes) => minutes.map((m, i) => receipt({ purchasedAtMs: NOW + m * MINUTE_MS, receiptId: `H-${i}` })));

describe("meal rules: extra properties", () => {
  it("item count never changes a decision, whatever is in the ledger", () => {
    fc.assert(
      fc.property(arbExtraction, arbHistoryReceipts, arbRules, fc.nat(1000), (e, hist, rules, items) => {
        const ledger = ledgerFrom(hist, rules);
        const a = evaluateMeal({ ...e, itemCount: e.itemCount }, ledger, rules, NOW);
        const b = evaluateMeal({ ...e, itemCount: items }, ledger, rules, NOW);
        expect(b).toEqual(a);
      }),
      options,
    );
  });

  it("total cents never changes the outcome or XP, when no matching receipt is already counted", () => {
    fc.assert(
      fc.property(
        arbExtraction,
        arbHistoryReceipts,
        arbRules,
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        (e, hist, rules, cheap, dear) => {
          const ledger = ledgerFrom(hist, rules); // receipt IDs "H-n", the extraction uses "Q-n"
          const a = evaluateMeal({ ...e, totalCents: cheap }, ledger, rules, NOW);
          const b = evaluateMeal({ ...e, totalCents: dear }, ledger, rules, NOW);
          expect(b.outcome).toBe(a.outcome);
          expect(b.reasonCode).toBe(a.reasonCode);
          expect(b.xpAwarded).toBe(a.xpAwarded);
          expect(b.nextEligibleAtMs).toBe(a.nextEligibleAtMs);
        },
      ),
      options,
    );
  });

  it("every counted meal is food, confident, dated, not in the future and not too old", () => {
    let counted = 0;
    fc.assert(
      fc.property(arbExtraction, arbHistoryReceipts, arbRules, (e, hist, rules) => {
        const ledger = ledgerFrom(hist, rules);
        const d = evaluateMeal(e, ledger, rules, NOW);
        if (d.outcome !== "counted") return;
        counted += 1;
        expect(e.merchantCategory).toBe("food");
        expect(e.confidence).toBeGreaterThanOrEqual(rules.minExtractionConfidence);
        expect(e.merchantName).not.toBeNull();
        expect(e.totalCents).not.toBeNull();
        const t = e.purchasedAtMs as number;
        expect(t).toBeLessThanOrEqual(NOW + rules.maxFutureSkewMinutes * MINUTE_MS);
        expect(t).toBeGreaterThanOrEqual(NOW - rules.maxReceiptAgeHours * HOUR_MS);
        if (rules.countOnlyDealMeals) expect(e.dealId).not.toBeNull();
        expect(ledger.some((m) => m.fingerprint === d.fingerprint)).toBe(false);
        expect(d.xpAwarded).toBe(rules.xpPerMeal);
      }),
      options,
    );
    // Guard against a vacuous pass: the generator must really produce counted meals.
    expect(counted).toBeGreaterThan(5);
  });

  it("a rejected or reviewed receipt always gets 0 XP and a reason, and only too_soon and daily_limit give a next time", () => {
    fc.assert(
      fc.property(arbExtraction, arbHistoryReceipts, arbRules, (e, hist, rules) => {
        const d = evaluateMeal(e, ledgerFrom(hist, rules), rules, NOW);
        const waits = d.reasonCode === "too_soon" || d.reasonCode === "daily_limit";
        expect(d.nextEligibleAtMs === null).toBe(!waits);
        if (d.outcome !== "counted") {
          expect(d.xpAwarded).toBe(0);
          expect(d.reason.split(" ").length).toBeGreaterThan(3);
        }
        if (waits) expect(d.nextEligibleAtMs as number).toBeGreaterThanOrEqual(NOW);
      }),
      options,
    );
  });

  it("the reported next time is the earliest purchase time that would count", () => {
    let blockedCases = 0;
    let checkedEarlier = 0;
    fc.assert(
      fc.property(
        arbHistoryReceipts,
        arbRules,
        fc.integer({ min: -47 * 60, max: 5 }),
        (hist, rules, minute) => {
          const lenient = { ...rules, countOnlyDealMeals: false };
          const ledger = ledgerFrom(hist, lenient);
          const blocked = evaluateMeal(
            receipt({ purchasedAtMs: NOW + minute * MINUTE_MS, receiptId: "Q-1" }),
            ledger,
            lenient,
            NOW,
          );
          if (blocked.reasonCode !== "too_soon" && blocked.reasonCode !== "daily_limit") return;
          blockedCases += 1;
          const next = blocked.nextEligibleAtMs as number;

          // A new purchase at that time counts.
          const works = evaluateMeal(receipt({ purchasedAtMs: next, receiptId: "Q-2" }), ledger, lenient, next);
          expect(works.reasonCode).toBe("counted");

          // And one millisecond earlier does not (unless that is before now).
          if (next > NOW) {
            checkedEarlier += 1;
            const early = evaluateMeal(
              receipt({ purchasedAtMs: next - 1, receiptId: "Q-3" }),
              ledger,
              lenient,
              next - 1,
            );
            expect(["too_soon", "daily_limit"]).toContain(early.reasonCode);
          }
        },
      ),
      options,
    );
    // Guard against a vacuous pass: blocked meals, and waits in the future, must really occur.
    expect(blockedCases).toBeGreaterThan(10);
    expect(checkedEarlier).toBeGreaterThan(5);
  });
});

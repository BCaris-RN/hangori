import { expect } from 'vitest';
import { defaultMealRules, type ReceiptExtraction, type CountedMeal, type MealDecision, type MealRules } from '../../src/contracts/index';
import { evaluateMeal } from '../../src/domain/meals/evaluate';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const NOW = Date.UTC(2026, 10, 23, 12);
export const rules = { ...defaultMealRules };
export function receipt(patch: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return { merchantName: 'Brumwicket Buns', merchantCategory: 'food', purchasedAtMs: NOW,
    totalCents: 900, receiptId: 'SYN-001', itemCount: 1, confidence: 0.95,
    source: 'sample', dealId: null, ...patch };
}
// Test oracle from the documented fingerprint format, not production implementation.
export function fingerprint(r: ReceiptExtraction): string {
  const merchant = r.merchantName!.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = (r.receiptId ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${merchant}|${Math.floor(r.purchasedAtMs! / 60_000)}|${r.totalCents}|${id}`;
}
export function meal(r: ReceiptExtraction, patch: Partial<CountedMeal> = {}): CountedMeal {
  return { id: r.receiptId ?? 'synthetic', fingerprint: fingerprint(r), merchantName: r.merchantName!,
    purchasedAtMs: r.purchasedAtMs!, totalCents: r.totalCents!, xpAwarded: rules.xpPerMeal,
    savedCents: null, dealId: r.dealId, recordedAtMs: NOW, ...patch };
}
export function history(hours: number[]): CountedMeal[] {
  return hours.map((h, i) => meal(receipt({ purchasedAtMs: NOW + h * HOUR, receiptId: `PRIOR-${i}` })));
}
export function evaluate(r = receipt(), prior: CountedMeal[] = [], overrides: Partial<MealRules> = {}) {
  return evaluateMeal(r, prior, { ...rules, ...overrides }, NOW);
}
export function check(d: MealDecision, code: MealDecision['reasonCode']) {
  const review = ['missing_time', 'low_confidence', 'unknown_category'].includes(code);
  expect(d.reasonCode).toBe(code);
  expect(d.outcome).toBe(code === 'counted' ? 'counted' : review ? 'needs_review' : 'rejected');
  expect(d.xpAwarded).toBe(code === 'counted' ? rules.xpPerMeal : 0);
  if (code !== 'too_soon' && code !== 'daily_limit') expect(d.nextEligibleAtMs).toBeNull();
  if (code !== 'counted') {
    expect(d.reason.trim().split(/\s+/).length).toBeGreaterThan(1);
    expect(d.reason).toMatch(/[a-z]/i);
    expect(d.reason).not.toBe(code);
  }
}
export function runSequence(receipts: ReceiptExtraction[], prior: CountedMeal[] = [], config: MealRules = rules) {
  const ledger = [...prior];
  let xp = 0;
  const decisions: MealDecision[] = [];
  for (const r of receipts) {
    const d = evaluateMeal(r, ledger, config, NOW);
    decisions.push(d);
    if (d.outcome === 'counted') ledger.push(meal(r, { id: `synthetic-${ledger.length}`, fingerprint: d.fingerprint, xpAwarded: d.xpAwarded }));
    xp += d.xpAwarded;
  }
  return { ledger, xp, decisions };
}

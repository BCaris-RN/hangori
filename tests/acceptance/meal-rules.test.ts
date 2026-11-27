import { describe, it, expect } from 'vitest';
import { receipt, meal, history, evaluate, check, rules, NOW, HOUR, fingerprint, runSequence } from './helpers';
import type { ReceiptExtraction, MealDecision, MealRules, CountedMeal } from '../../src/contracts/index';

describe('meal rules: examples', () => {
  it('counts one eligible purchase with default XP and its fingerprint', () => {
    const r = receipt(); const d = evaluate(r); check(d, 'counted');
    expect(d.fingerprint).toBe(fingerprint(r));
  });
  it('awards equal XP for a $9 single item and a $120 family order', () => {
    const a = evaluate(receipt({ totalCents: 900, itemCount: 1 }));
    const b = evaluate(receipt({ totalCents: 12000, itemCount: 20 }));
    check(a, 'counted'); check(b, 'counted'); expect(a.xpAwarded).toBe(b.xpAwarded);
  });
  it('uses configured xpPerMeal', () => {
    expect(evaluate(receipt(), [], { xpPerMeal: 17 }).xpAwarded).toBe(17);
  });
  const cases: [string, Partial<ReceiptExtraction>, MealDecision['reasonCode']][] = [
    ['missing purchase time', { purchasedAtMs: null }, 'missing_time'],
    ['confidence below threshold', { confidence: 0.799999 }, 'low_confidence'],
    ['null merchant name with high confidence', { merchantName: null }, 'low_confidence'],
    ['null total with high confidence', { totalCents: null }, 'low_confidence'],
    ['unknown merchant category', { merchantCategory: 'unknown' }, 'unknown_category'],
    ['non-food merchant', { merchantCategory: 'other' }, 'not_food'],
    ['future by five minutes plus 1 ms', { purchasedAtMs: NOW + 300001 }, 'future_date'],
    ['older than 48 hours by 1 ms', { purchasedAtMs: NOW - 48 * HOUR - 1 }, 'too_old'],
  ];
  it.each(cases)('%s gives the correct outcome, zero XP and plain words', (_, patch, code) => check(evaluate(receipt(patch)), code));
  it.each([
    ['exactly five minutes ahead', { purchasedAtMs: NOW + 300000 }],
    ['exactly 48 hours old', { purchasedAtMs: NOW - 48 * HOUR }],
    ['confidence exactly 0.8', { confidence: 0.8 }],
  ] as [string, Partial<ReceiptExtraction>][])('accepts %s', (_, patch) => check(evaluate(receipt(patch)), 'counted'));
  it.each([0, 0.5, 20])('honors a future skew of %s minutes at the exact boundary', minutes => {
    const boundary = NOW + minutes * 60_000;
    check(evaluate(receipt({ purchasedAtMs: boundary }), [], { maxFutureSkewMinutes: minutes }), 'counted');
    check(evaluate(receipt({ purchasedAtMs: boundary + 1 }), [], { maxFutureSkewMinutes: minutes }), 'future_date');
  });
  it('honors configured maximum age', () => {
    check(evaluate(receipt({ purchasedAtMs: NOW - HOUR }), [], { maxReceiptAgeHours: 1 }), 'counted');
    check(evaluate(receipt({ purchasedAtMs: NOW - HOUR - 1 }), [], { maxReceiptAgeHours: 1 }), 'too_old');
  });
  it('honors configured confidence threshold', () => check(evaluate(receipt({ confidence: 0.85 }), [], { minExtractionConfidence: 0.9 }), 'low_confidence'));
  it.each([
    ['identical receipt', {}],
    ['merchant case and punctuation', { merchantName: 'BRUMWICKET... BUNS!!' }],
    ['receipt ID case and punctuation', { receiptId: 's.y.n 001' }],
    ['Unicode compatibility forms and diacritics', { merchantName: 'Ｂrúmwicke\u0301t Buns ☕', receiptId: 'ŚＹＮ-００１!' }],
    ['same purchase minute', { purchasedAtMs: NOW + 59999 }],
  ] as [string, Partial<ReceiptExtraction>][])('rejects duplicate: %s', (_, patch) => {
    check(evaluate(receipt(patch), [meal(receipt())]), 'duplicate');
  });
  it('deduplicates when receipt ID is absent', () => {
    const r = receipt({ receiptId: null }); check(evaluate(r, [meal(r)]), 'duplicate');
  });
  it('uses total and receipt ID in the fingerprint', () => {
    const base = evaluate(receipt());
    expect(evaluate(receipt({ totalCents: 901 })).fingerprint).not.toBe(base.fingerprint);
    expect(evaluate(receipt({ receiptId: 'OTHER' })).fingerprint).not.toBe(base.fingerprint);
  });
  it('rejects the fourth meal across midnight, not per calendar day', () => {
    const d = evaluate(receipt(), history([-18, -12, -6])); check(d, 'daily_limit');
    expect(d.nextEligibleAtMs).toBe(NOW + 6 * HOUR);
  });
  it('allows exactly 24h between the oldest and new meal', () => check(evaluate(receipt(), history([-24, -12, -6])), 'counted'));
  it('rejects a 24h span shorter by 1 ms', () => {
    const prior = history([-24, -12, -6]); prior[0].purchasedAtMs += 1;
    const d = evaluate(receipt(), prior);
    check(d, 'daily_limit');
    expect(d.nextEligibleAtMs).toBe(NOW + 1);
  });
  it('checks a window containing later meals for out-of-order submissions', () => {
    const d = evaluate(receipt({ purchasedAtMs: NOW - 18 * HOUR }), history([-12, -6, 0]));
    check(d, 'daily_limit');
    expect(d.nextEligibleAtMs).toBe(NOW + 12 * HOUR);
  });
  it.each([-1, 1])('rejects receipts too close in direction %s', direction => {
    const d = evaluate(receipt({ purchasedAtMs: NOW - 4 * HOUR + direction * (3 * HOUR - 1) }), history([-4]));
    check(d, 'too_soon');
    expect(d.nextEligibleAtMs).toBe(NOW);
  });
  it.each([-1, 1])('allows exactly minimum spacing in direction %s', direction => {
    check(evaluate(receipt({ purchasedAtMs: NOW - 4 * HOUR + direction * 3 * HOUR }), history([-4])), 'counted');
  });
  it('uses configured meal limit and spacing', () => {
    const daily = evaluate(receipt(), history([-4]), { maxMealsPer24h: 1 });
    check(daily, 'daily_limit');
    expect(daily.nextEligibleAtMs).toBe(NOW + 20 * HOUR);
    const spacing = evaluate(receipt(), history([-4]), { minHoursBetweenMeals: 5 });
    check(spacing, 'too_soon');
    expect(spacing.nextEligibleAtMs).toBe(NOW + HOUR);
  });
  it('reports the next purchase time when spacing currently blocks a meal', () => {
    const d = evaluate(receipt(), history([-1])); check(d, 'too_soon');
    expect(d.nextEligibleAtMs).toBe(NOW + 2 * HOUR);
  });
  it('reports a new purchase time that satisfies both limits even when too_soon wins', () => {
    const d = evaluate(receipt(), history([-18, -12, -1]));
    check(d, 'too_soon');
    expect(d.nextEligibleAtMs).toBe(NOW + 6 * HOUR);
  });
  it('allows a meal without a deal when deal-only is off', () => check(evaluate(receipt(), [], { countOnlyDealMeals: false }), 'counted'));
  it('rejects a meal without a deal when deal-only is on', () => check(evaluate(receipt(), [], { countOnlyDealMeals: true }), 'no_deal'));
  it('allows a deal meal when deal-only is on', () => check(evaluate(receipt({ dealId: 'SYN-DEAL' }), [], { countOnlyDealMeals: true }), 'counted'));
  it('savings in the ledger never change XP', () => {
    const prior = history([-6]);
    const a = evaluate(receipt(), prior.map(m => ({ ...m, savedCents: 0 })));
    const b = evaluate(receipt(), prior.map(m => ({ ...m, savedCents: 12000 })));
    check(a, 'counted'); check(b, 'counted'); expect(a.xpAwarded).toBe(b.xpAwarded);
  });
  it('replay and immediate double submission add no XP', () => {
    const rs = [-12, -6, 0].map((h,i) => receipt({ purchasedAtMs: NOW + h * HOUR, receiptId: `SEQ${i}` }));
    const first = runSequence(rs); expect(first.xp).toBe(3 * rules.xpPerMeal);
    expect(runSequence(rs, first.ledger).xp).toBe(0);
    expect(runSequence(rs.flatMap(r => [r,r])).xp).toBe(first.xp);
  });
});

describe('first failing rule wins', () => {
  type Case = [string, Partial<ReceiptExtraction>, CountedMeal[], Partial<MealRules>, MealDecision['reasonCode']];
  const cases: Case[] = [
    ['missing time before confidence/category/deal', { purchasedAtMs: null, confidence: 0, merchantCategory: 'other' }, [], { countOnlyDealMeals: true }, 'missing_time'],
    ['low confidence before category/future', { confidence: 0, merchantCategory: 'other', purchasedAtMs: NOW + HOUR }, [], {}, 'low_confidence'],
    ['missing time before a null total', { purchasedAtMs: null, totalCents: null }, [], {}, 'missing_time'],
    ['null merchant before category', { merchantName: null, merchantCategory: 'other' }, [], {}, 'low_confidence'],
    ['unknown category before future', { merchantCategory: 'unknown', purchasedAtMs: NOW + HOUR }, [], {}, 'unknown_category'],
    ['non-food before future', { merchantCategory: 'other', purchasedAtMs: NOW + HOUR }, [], {}, 'not_food'],
    ['future before duplicate', { purchasedAtMs: NOW + HOUR }, [meal(receipt({ purchasedAtMs: NOW + HOUR }))], {}, 'future_date'],
    ['old before duplicate', { purchasedAtMs: NOW - 49 * HOUR }, [meal(receipt({ purchasedAtMs: NOW - 49 * HOUR }))], {}, 'too_old'],
    ['duplicate before deal/spacing', {}, [meal(receipt())], { countOnlyDealMeals: true }, 'duplicate'],
    ['deal before spacing/daily limit', {}, history([-6, -3, -1]), { countOnlyDealMeals: true }, 'no_deal'],
    ['spacing before daily limit', {}, history([-6, -3, -1]), {}, 'too_soon'],
  ];
  it.each(cases)('%s', (_, patch, prior, overrides, code) => check(evaluate(receipt(patch), prior, overrides), code));
});

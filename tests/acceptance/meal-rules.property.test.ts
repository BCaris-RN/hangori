import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { evaluateMeal } from '../../src/domain/meals/evaluate';
import { NOW, HOUR, DAY, rules, receipt, runSequence, fingerprint } from './helpers';

const options = { seed: 20261123, numRuns: 150, verbose: true } as const;
// Nonempty sequences, deliberately unordered; repeated minutes exercise collisions.
const sequence = fc.array(fc.integer({ min: -48 * 60, max: 5 }), { minLength: 1, maxLength: 40 })
  .map(minutes => minutes.map((minute, i) => receipt({ purchasedAtMs: NOW + minute * 60000, receiptId: `SYN-${i}` })));
const configuration = fc.record({
  xpPerMeal: fc.integer({ min: 1, max: 100 }),
  maxMealsPer24h: fc.integer({ min: 1, max: 6 }),
  minHoursBetweenMeals: fc.integer({ min: 1, max: 6 }),
}).map(partial => ({ ...rules, ...partial }));

describe('meal rules: deterministic properties', () => {
  it('XP is always zero or xpPerMeal, including review and rejection', () => {
    fc.assert(fc.property(configuration, fc.record({
      purchasedAtMs: fc.option(fc.integer({ min: NOW - 72 * HOUR, max: NOW + HOUR }), { nil: null }),
      confidence: fc.constantFrom(0, 0.799, 0.8, 1),
      merchantCategory: fc.constantFrom('food' as const, 'other' as const, 'unknown' as const),
      totalCents: fc.integer({ min: 0, max: 1000000 }),
      itemCount: fc.integer({ min: 0, max: 1000 }),
    }), (config, patch) => {
      const d = evaluateMeal(receipt(patch), [], config, NOW);
      expect([0, config.xpPerMeal]).toContain(d.xpAwarded);
      expect(d.xpAwarded).toBe(d.outcome === 'counted' ? config.xpPerMeal : 0);
    }), options);
  });
  it('never counts more than maxMealsPer24h in any span shorter than 24h', () => {
    fc.assert(fc.property(sequence, configuration, (rs, config) => {
      const { ledger } = runSequence(rs, [], config);
      const times = ledger.map(m => m.purchasedAtMs).sort((a,b) => a-b);
      for (const start of times) {
        expect(times.filter(t => t >= start && t < start + DAY).length).toBeLessThanOrEqual(config.maxMealsPer24h);
      }
    }), options);
  });
  it('no two counted meals are closer than minHoursBetweenMeals in either order', () => {
    fc.assert(fc.property(sequence, configuration, (rs, config) => {
      const { ledger } = runSequence(rs, [], config);
      for (let i = 0; i < ledger.length; i++) for (let j = i+1; j < ledger.length; j++) {
        expect(Math.abs(ledger[i].purchasedAtMs - ledger[j].purchasedAtMs)).toBeGreaterThanOrEqual(config.minHoursBetweenMeals * HOUR);
      }
    }), options);
  });
  it('the same independently normalized fingerprint never counts twice', () => {
    fc.assert(fc.property(sequence, configuration, (rs, config) => {
      const doubled = rs.flatMap(r => [r, { ...r, merchantName: 'BRUMWICKET... BUNS!', receiptId: r.receiptId!.toLowerCase().replace('-', '.') }]);
      const result = runSequence(doubled, [], config);
      const counted = doubled.filter((_, i) => result.decisions[i].outcome === 'counted').map(fingerprint);
      expect(new Set(counted).size).toBe(counted.length);
      expect(new Set(result.ledger.map(m => m.fingerprint)).size).toBe(result.ledger.length);
    }), options);
  });
  it('replaying or double-submitting a sequence never increases awarded XP', () => {
    fc.assert(fc.property(sequence, configuration, (rs, config) => {
      const first = runSequence(rs, [], config);
      const replay = runSequence(rs, first.ledger, config);
      expect(replay.xp).toBe(0);
      expect(replay.ledger).toEqual(first.ledger);
      expect(runSequence(rs.flatMap(r => [r,r]), [], config).xp).toBe(first.xp);
      expect(runSequence([...rs, ...rs], [], config).xp).toBe(first.xp);
    }), options);
  });
});

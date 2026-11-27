import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  STAGE_MIN_XP,
  XP_PER_LEVEL,
  applyXp,
  hatch,
  levelForXp,
  nextStageXp,
  stageForXp,
  stageProgress,
} from "./stages";
import { COMPANIONS, COMPANION_IDS } from "./roster";

describe("stages", () => {
  it("maps XP to stages at the documented thresholds", () => {
    expect(stageForXp(0)).toBe(1);
    expect(stageForXp(19)).toBe(1);
    expect(stageForXp(20)).toBe(2);
    expect(stageForXp(49)).toBe(2);
    expect(stageForXp(50)).toBe(3);
    expect(stageForXp(99)).toBe(3);
    expect(stageForXp(100)).toBe(4);
    expect(stageForXp(10_000)).toBe(4);
  });

  it("gives one level per 10 XP, starting at level 1", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(9)).toBe(1);
    expect(levelForXp(10)).toBe(2);
    expect(levelForXp(XP_PER_LEVEL * 4)).toBe(5);
  });

  it("reports progress toward the next stage and fills the bar at the top", () => {
    expect(stageProgress({ stage: 1, xp: 10 })).toEqual({ fraction: 0.5, from: 0, to: 20 });
    expect(stageProgress({ stage: 4, xp: 400 }).fraction).toBe(1);
    expect(nextStageXp(4)).toBeNull();
    expect(nextStageXp(1)).toBe(STAGE_MIN_XP[2]);
  });

  it("hatches a new companion at stage 1 with no XP", () => {
    expect(hatch("hangori", true)).toEqual({ id: "hangori", stage: 1, xp: 0, totalMeals: 0, halloween: true });
  });

  it("levels up on every meal and evolves on the second one", () => {
    const first = applyXp(hatch("hangori", true), 10, true);
    expect(first.leveledUp).toBe(true);
    expect(first.evolved).toBe(false);
    const second = applyXp(first.state, 10, true);
    expect(second.leveledUp).toBe(true);
    expect(second.evolved).toBe(true);
    expect([second.fromStage, second.toStage]).toEqual([1, 2]);
    expect(second.state).toMatchObject({ xp: 20, stage: 2, totalMeals: 2 });
  });

  it("jumps straight to the final stage when one meal crosses two thresholds", () => {
    const result = applyXp(hatch("mochi", false), 120, false);
    expect(result.toStage).toBe(4);
    expect(result.evolved).toBe(true);
  });

  it("refuses negative or fractional XP", () => {
    expect(() => applyXp(hatch("mochi", false), -1, false)).toThrow();
    expect(() => applyXp(hatch("mochi", false), 1.5, false)).toThrow();
  });

  it("lists five companions with a name, species and blurb", () => {
    expect(COMPANION_IDS).toHaveLength(5);
    for (const id of COMPANION_IDS) {
      expect(COMPANIONS[id].name.length).toBeGreaterThan(0);
      expect(COMPANIONS[id].species.length).toBeGreaterThan(0);
      expect(COMPANIONS[id].blurb.length).toBeGreaterThan(10);
    }
  });
});

describe("stages: properties", () => {
  const xps = fc.array(fc.integer({ min: 0, max: 250 }), { maxLength: 30 });

  it("XP and stage never go down, whatever is added", () => {
    fc.assert(
      fc.property(xps, (amounts) => {
        let state = hatch("sprig", true);
        for (const amount of amounts) {
          const next = applyXp(state, amount, true);
          expect(next.state.xp).toBeGreaterThanOrEqual(state.xp);
          expect(next.state.stage).toBeGreaterThanOrEqual(state.stage);
          expect(next.state.xp).toBe(state.xp + amount);
          state = next.state;
        }
      }),
    );
  });

  it("stage is a monotonic function of XP and always matches the thresholds", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), fc.integer({ min: 0, max: 1000 }), (a, b) => {
        const [low, high] = a <= b ? [a, b] : [b, a];
        expect(stageForXp(low)).toBeLessThanOrEqual(stageForXp(high));
        expect(levelForXp(low)).toBeLessThanOrEqual(levelForXp(high));
      }),
    );
  });

  it("a level-up and an evolution only happen when XP actually grew", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 300 }), fc.integer({ min: 0, max: 100 }), (xp, add) => {
        const base = { ...hatch("grubble", false), xp, stage: stageForXp(xp) };
        const result = applyXp(base, add, false);
        if (add === 0) {
          expect(result.leveledUp).toBe(false);
          expect(result.evolved).toBe(false);
        }
        expect(result.evolved).toBe(result.toStage > result.fromStage);
      }),
    );
  });
});

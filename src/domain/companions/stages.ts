import type { CompanionId, CompanionState } from "@/contracts/index";

export type Stage = CompanionState["stage"];

/** One level per this much XP. With the default 10 XP per meal, each meal is a level. */
export const XP_PER_LEVEL = 10;

/** XP needed to reach each evolution stage. */
export const STAGE_MIN_XP: Record<Stage, number> = { 1: 0, 2: 20, 3: 50, 4: 100 };

export const STAGE_NAMES: Record<Stage, string> = {
  1: "Hatchling",
  2: "Scamp",
  3: "Fiend",
  4: "Overlord",
};

export function stageForXp(xp: number): Stage {
  if (xp >= STAGE_MIN_XP[4]) return 4;
  if (xp >= STAGE_MIN_XP[3]) return 3;
  if (xp >= STAGE_MIN_XP[2]) return 2;
  return 1;
}

export function levelForXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** XP at which the next stage starts, or null at the top stage. */
export function nextStageXp(stage: Stage): number | null {
  return stage === 4 ? null : STAGE_MIN_XP[(stage + 1) as Stage];
}

/** Progress toward the next stage, for the XP bar. Full at the top stage. */
export function stageProgress(state: Pick<CompanionState, "stage" | "xp">): {
  fraction: number;
  from: number;
  to: number | null;
} {
  const from = STAGE_MIN_XP[state.stage];
  const to = nextStageXp(state.stage);
  if (to === null) return { fraction: 1, from, to };
  return { fraction: Math.min(1, Math.max(0, (state.xp - from) / (to - from))), from, to };
}

/** A freshly hatched companion. */
export function hatch(id: CompanionId, halloween: boolean): CompanionState {
  return { id, stage: 1, xp: 0, totalMeals: 0, halloween };
}

export interface XpResult {
  state: CompanionState;
  leveledUp: boolean;
  evolved: boolean;
  fromLevel: number;
  toLevel: number;
  fromStage: Stage;
  toStage: Stage;
}

/**
 * Adds XP from a counted meal. XP only ever goes up, so a negative amount is a bug
 * and throws. A companion that crosses two stage thresholds jumps to the final stage.
 */
export function applyXp(state: CompanionState, xp: number, halloween: boolean): XpResult {
  if (!Number.isInteger(xp) || xp < 0) throw new Error(`XP must be a non-negative integer, got ${xp}`);
  const nextXp = state.xp + xp;
  const toStage = Math.max(state.stage, stageForXp(nextXp)) as Stage;
  return {
    state: {
      ...state,
      xp: nextXp,
      stage: toStage,
      totalMeals: state.totalMeals + (xp > 0 ? 1 : 0),
      halloween,
    },
    leveledUp: levelForXp(nextXp) > levelForXp(state.xp),
    evolved: toStage > state.stage,
    fromLevel: levelForXp(state.xp),
    toLevel: levelForXp(nextXp),
    fromStage: state.stage,
    toStage,
  };
}

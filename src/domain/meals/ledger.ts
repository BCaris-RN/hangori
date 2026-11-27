import type {
  CompanionId,
  CompanionState,
  CountedMeal,
  MealDecision,
  MealRules,
  ReceiptExtraction,
} from "@/contracts/index";
import { applyXp, hatch, levelForXp, type Stage } from "@/domain/companions/stages";
import { evaluateMeal } from "./evaluate";
import {
  createIdbStore,
  createMemoryStore,
  defaultMeta,
  type LedgerSnapshot,
  type LedgerStore,
} from "./store";

export type { LedgerSnapshot, ProfileMeta } from "./store";

export interface SubmitOptions {
  /** The companion that eats the meal. It must already be hatched. */
  companionId: CompanionId;
  /** Savings from the deal used, in cents. Shown to the user; never changes XP. */
  savedCents?: number | null;
}

export interface SubmitResult {
  decision: MealDecision;
  /** The fed companion after this submission (unchanged unless the meal counted). */
  companion: CompanionState;
  leveledUp: boolean;
  evolved: boolean;
  fromStage: Stage;
  toStage: Stage;
  fromLevel: number;
  toLevel: number;
}

export interface MealLedger {
  /**
   * Evaluates a receipt and, when it counts, saves the meal and the companion's new XP
   * in one transaction. Submissions run one at a time, in call order.
   */
  submit(extraction: ReceiptExtraction, nowMs: number, options: SubmitOptions): Promise<SubmitResult>;
  /** Counted meals, oldest purchase first. */
  countedMeals(): Promise<CountedMeal[]>;
  totalXp(): Promise<number>;
  snapshot(): Promise<LedgerSnapshot>;
  /** Hatches a companion (or returns it if already hatched) and makes it active. */
  adopt(id: CompanionId): Promise<CompanionState>;
  setActive(id: CompanionId): Promise<void>;
  setHalloween(on: boolean): Promise<void>;
  setSampleEpoch(ms: number): Promise<void>;
  /** Replaces everything, in one transaction. Used by the demo den. */
  replaceAll(snapshot: LedgerSnapshot): Promise<void>;
  /** Clears all local data. */
  reset(): Promise<void>;
}

export interface LedgerOptions {
  rules: MealRules;
  storage: "memory" | "indexeddb";
  /** IndexedDB database name. Tests pass a unique one. */
  dbName?: string;
}

function newId(nowMs: number): string {
  // crypto.randomUUID needs a secure context; a phone on the LAN dev server has none.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `meal-${nowMs}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMealLedger(options: LedgerOptions): MealLedger {
  const { rules } = options;
  const store: LedgerStore =
    options.storage === "indexeddb" ? createIdbStore(options.dbName) : createMemoryStore();

  // One job at a time. A rejected job must not block the ones behind it.
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = queue.then(job);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    submit(extraction, nowMs, opts) {
      return enqueue(() =>
        store.transact<SubmitResult>((snap) => {
          const companion = snap.companions.find((c) => c.id === opts.companionId);
          if (!companion) throw new Error(`No hatched companion with id "${opts.companionId}"`);

          const decision = evaluateMeal(extraction, snap.meals, rules, nowMs);
          const unchanged: SubmitResult = {
            decision,
            companion,
            leveledUp: false,
            evolved: false,
            fromStage: companion.stage,
            toStage: companion.stage,
            fromLevel: levelForXp(companion.xp),
            toLevel: levelForXp(companion.xp),
          };
          if (decision.outcome !== "counted") return { result: unchanged };

          const { purchasedAtMs, totalCents, merchantName } = extraction;
          if (purchasedAtMs === null || totalCents === null || merchantName === null) {
            throw new Error("A counted meal must have a time, a total and a merchant");
          }

          const applied = applyXp(companion, decision.xpAwarded, snap.meta.halloween);
          const saved = opts.savedCents ?? null;
          const meal: CountedMeal = {
            id: newId(nowMs),
            fingerprint: decision.fingerprint,
            merchantName,
            purchasedAtMs,
            totalCents,
            xpAwarded: decision.xpAwarded,
            savedCents: saved === null ? null : Math.max(0, Math.round(saved)),
            dealId: extraction.dealId,
            recordedAtMs: nowMs,
          };
          return {
            result: {
              decision,
              companion: applied.state,
              leveledUp: applied.leveledUp,
              evolved: applied.evolved,
              fromStage: applied.fromStage,
              toStage: applied.toStage,
              fromLevel: applied.fromLevel,
              toLevel: applied.toLevel,
            },
            meal,
            companions: [applied.state],
          };
        }),
      );
    },

    async countedMeals() {
      const { meals } = await store.snapshot();
      return [...meals].sort((a, b) => a.purchasedAtMs - b.purchasedAtMs);
    },

    async totalXp() {
      const { meals } = await store.snapshot();
      return meals.reduce((sum, m) => sum + m.xpAwarded, 0);
    },

    snapshot: () => store.snapshot(),

    adopt(id) {
      return enqueue(() =>
        store.transact<CompanionState>((snap) => {
          const existing = snap.companions.find((c) => c.id === id);
          const companion = existing ?? hatch(id, snap.meta.halloween);
          return {
            result: companion,
            companions: existing ? [] : [companion],
            meta: { ...snap.meta, activeId: id },
          };
        }),
      );
    },

    setActive(id) {
      return enqueue(() =>
        store.transact<void>((snap) => {
          if (!snap.companions.some((c) => c.id === id)) throw new Error(`"${id}" is not hatched yet`);
          return { result: undefined, meta: { ...snap.meta, activeId: id } };
        }),
      );
    },

    setHalloween(on) {
      return enqueue(() =>
        store.transact<void>((snap) => ({
          result: undefined,
          companions: snap.companions.map((c) => ({ ...c, halloween: on })),
          meta: { ...snap.meta, halloween: on },
        })),
      );
    },

    setSampleEpoch(ms) {
      return enqueue(() =>
        store.transact<void>((snap) => ({ result: undefined, meta: { ...snap.meta, sampleEpochMs: ms } })),
      );
    },

    replaceAll: (snapshot) => enqueue(() => store.replaceAll(snapshot)),

    reset: () =>
      enqueue(() => store.replaceAll({ meals: [], companions: [], meta: defaultMeta() })),
  };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultMealRules,
  type CompanionId,
  type CompanionState,
  type CountedMeal,
  type DealsFeed,
} from "@/contracts/index";
import { createMealLedger, type LedgerSnapshot, type MealLedger, type SubmitResult } from "@/domain/meals/ledger";
import { HOUR_MS } from "@/domain/meals/time";
import { findDeal, mockDealsAdapter, type DealsAdapter } from "./deals";
import { buildDemoSeed } from "./demo/seed";
import { findSample } from "./demo/samples";

/** Sample receipt times hang off a stored epoch. Refresh it once it is this old. */
const SAMPLE_EPOCH_MAX_AGE_MS = 12 * HOUR_MS;

let sharedLedger: MealLedger | null = null;
function appLedger(): MealLedger {
  return (sharedLedger ??= createMealLedger({ rules: defaultMealRules, storage: "indexeddb" }));
}

export interface FeedOutcome extends SubmitResult {
  sampleId: string;
}

export interface Profile {
  ready: boolean;
  error: string | null;
  companions: Partial<Record<CompanionId, CompanionState>>;
  activeId: CompanionId | null;
  active: CompanionState | null;
  halloween: boolean;
  demo: boolean;
  meals: CountedMeal[];
  totalXp: number;
  totalSavedCents: number;
  dealMeals: number;
  deals: DealsFeed | null;
  adopt(id: CompanionId): Promise<void>;
  setActive(id: CompanionId): Promise<void>;
  setHalloween(on: boolean): Promise<void>;
  /** Submits a sample receipt for the active companion. */
  feed(sampleId: string): Promise<FeedOutcome>;
  loadDemoDen(): Promise<void>;
  reset(): Promise<void>;
}

const ProfileContext = createContext<Profile | null>(null);

function derive(snapshot: LedgerSnapshot) {
  const companions: Partial<Record<CompanionId, CompanionState>> = {};
  for (const c of snapshot.companions) companions[c.id] = c;
  const meals = [...snapshot.meals].sort((a, b) => b.purchasedAtMs - a.purchasedAtMs);
  const activeId = snapshot.meta.activeId;
  return {
    companions,
    activeId,
    active: activeId ? (companions[activeId] ?? null) : null,
    halloween: snapshot.meta.halloween,
    demo: snapshot.meta.demo,
    meals,
    totalXp: meals.reduce((sum, m) => sum + m.xpAwarded, 0),
    totalSavedCents: meals.reduce((sum, m) => sum + (m.savedCents ?? 0), 0),
    dealMeals: meals.filter((m) => m.savedCents !== null).length,
  };
}

type Derived = ReturnType<typeof derive>;

export interface ProfileProviderProps {
  children: ReactNode;
  /** Tests and tooling can pass their own ledger. */
  ledger?: MealLedger;
  dealsAdapter?: DealsAdapter;
}

export function ProfileProvider({ children, ledger: injected, dealsAdapter = mockDealsAdapter }: ProfileProviderProps) {
  const ledger = useMemo(() => injected ?? appLedger(), [injected]);
  const [data, setData] = useState<Derived | null>(null);
  const [deals, setDeals] = useState<DealsFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setData(derive(await ledger.snapshot()));
  }, [ledger]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let snapshot = await ledger.snapshot();
        const now = Date.now();
        const epoch = snapshot.meta.sampleEpochMs;
        if (epoch === null || now - epoch > SAMPLE_EPOCH_MAX_AGE_MS) {
          await ledger.setSampleEpoch(now);
          snapshot = await ledger.snapshot();
        }
        if (!cancelled) setData(derive(snapshot));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Local storage is not available.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ledger]);

  useEffect(() => {
    let cancelled = false;
    dealsAdapter.getFeed().then((feed) => {
      if (!cancelled) setDeals(feed);
    });
    return () => {
      cancelled = true;
    };
  }, [dealsAdapter]);

  const value = useMemo<Profile>(() => {
    const base: Derived = data ?? {
      companions: {},
      activeId: null,
      active: null,
      halloween: true,
      demo: false,
      meals: [],
      totalXp: 0,
      totalSavedCents: 0,
      dealMeals: 0,
    };
    return {
      ...base,
      ready: data !== null,
      error,
      deals,
      async adopt(id) {
        await ledger.adopt(id);
        await refresh();
      },
      async setActive(id) {
        await ledger.setActive(id);
        await refresh();
      },
      async setHalloween(on) {
        await ledger.setHalloween(on);
        await refresh();
      },
      async feed(sampleId) {
        const sample = findSample(sampleId);
        if (!sample) throw new Error(`Unknown sample receipt "${sampleId}"`);
        const snapshot = await ledger.snapshot();
        const { activeId, sampleEpochMs } = snapshot.meta;
        if (!activeId) throw new Error("Pick a companion first");
        const nowMs = Date.now();
        const extraction = sample.build(sampleEpochMs ?? nowMs);
        const deal = deals ? findDeal(deals, extraction.dealId) : undefined;
        const result = await ledger.submit(extraction, nowMs, {
          companionId: activeId,
          savedCents: deal?.estimatedSavingsCents ?? null,
        });
        await refresh();
        return { ...result, sampleId };
      },
      async loadDemoDen() {
        await ledger.replaceAll(buildDemoSeed(Date.now()));
        await refresh();
      },
      async reset() {
        await ledger.reset();
        await ledger.setSampleEpoch(Date.now());
        await refresh();
      },
    };
  }, [data, deals, error, ledger, refresh]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error("useProfile must be used inside <ProfileProvider>");
  return profile;
}

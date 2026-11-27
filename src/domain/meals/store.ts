import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb";
import type { CompanionId, CompanionState, CountedMeal } from "@/contracts/index";

/** Profile settings that are not meals or companions. */
export interface ProfileMeta {
  activeId: CompanionId | null;
  /** Draw companions in their Halloween form. */
  halloween: boolean;
  /** True after the demo den was loaded. */
  demo: boolean;
  /** Anchor for sample receipt purchase times, so a repeated tap is a true duplicate. */
  sampleEpochMs: number | null;
}

export function defaultMeta(): ProfileMeta {
  return { activeId: null, halloween: true, demo: false, sampleEpochMs: null };
}

export interface LedgerSnapshot {
  meals: CountedMeal[];
  companions: CompanionState[];
  meta: ProfileMeta;
}

/** What a transaction body wants written. Everything returned is written together or not at all. */
export interface TxOutput<T> {
  result: T;
  meal?: CountedMeal;
  companions?: CompanionState[];
  meta?: ProfileMeta;
}

export interface LedgerStore {
  snapshot(): Promise<LedgerSnapshot>;
  /**
   * Reads the snapshot, runs `body` synchronously, then writes its output in one
   * atomic step. If `body` throws, nothing is written.
   */
  transact<T>(body: (snapshot: LedgerSnapshot) => TxOutput<T>): Promise<T>;
  replaceAll(snapshot: LedgerSnapshot): Promise<void>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** In-memory store used by tests and as a fallback. */
export function createMemoryStore(): LedgerStore {
  let state: LedgerSnapshot = { meals: [], companions: [], meta: defaultMeta() };
  return {
    async snapshot() {
      return clone(state);
    },
    async transact(body) {
      const out = body(clone(state));
      const next = clone(state);
      if (out.meal) {
        if (next.meals.some((m) => m.fingerprint === out.meal!.fingerprint)) {
          throw new Error("Duplicate fingerprint");
        }
        next.meals.push(out.meal);
      }
      for (const c of out.companions ?? []) {
        const i = next.companions.findIndex((x) => x.id === c.id);
        if (i >= 0) next.companions[i] = c;
        else next.companions.push(c);
      }
      if (out.meta) next.meta = out.meta;
      state = next;
      return out.result;
    },
    async replaceAll(snapshot) {
      state = clone(snapshot);
    },
  };
}

interface HangoriDB extends DBSchema {
  meals: { key: string; value: CountedMeal; indexes: { fingerprint: string } };
  companions: { key: string; value: CompanionState };
  meta: { key: string; value: ProfileMeta & { key: string } };
}

const META_KEY = "profile";

type StoreNames = ["meals", "companions", "meta"];
type AnyTx = IDBPTransaction<HangoriDB, StoreNames, "readonly" | "readwrite">;

/**
 * IndexedDB store. A unique index on `fingerprint` makes "a receipt counts once"
 * a rule of the durable data, not only of the code that checks it.
 */
export function createIdbStore(dbName = "hangori"): LedgerStore {
  let opened: Promise<IDBPDatabase<HangoriDB>> | null = null;
  const db = () =>
    (opened ??= openDB<HangoriDB>(dbName, 1, {
      upgrade(database) {
        const meals = database.createObjectStore("meals", { keyPath: "id" });
        meals.createIndex("fingerprint", "fingerprint", { unique: true });
        database.createObjectStore("companions", { keyPath: "id" });
        database.createObjectStore("meta", { keyPath: "key" });
      },
    }));

  async function read(tx: AnyTx): Promise<LedgerSnapshot> {
    const [meals, companions, metaRow] = await Promise.all([
      tx.objectStore("meals").getAll(),
      tx.objectStore("companions").getAll(),
      tx.objectStore("meta").get(META_KEY),
    ]);
    const { key: _key, ...meta } = metaRow ?? { key: META_KEY, ...defaultMeta() };
    return { meals, companions, meta };
  }

  return {
    async snapshot() {
      const tx = (await db()).transaction(["meals", "companions", "meta"], "readonly");
      const snap = await read(tx);
      await tx.done;
      return snap;
    },
    async transact(body) {
      const tx = (await db()).transaction(["meals", "companions", "meta"], "readwrite");
      try {
        const snap = await read(tx);
        const out = body(snap);
        if (out.meal) await tx.objectStore("meals").add(out.meal);
        for (const c of out.companions ?? []) await tx.objectStore("companions").put(c);
        if (out.meta) await tx.objectStore("meta").put({ key: META_KEY, ...out.meta });
        await tx.done;
        return out.result;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          // The transaction already finished or aborted.
        }
        await tx.done.catch(() => undefined);
        throw error;
      }
    },
    async replaceAll(snapshot) {
      const tx = (await db()).transaction(["meals", "companions", "meta"], "readwrite");
      await Promise.all([
        tx.objectStore("meals").clear(),
        tx.objectStore("companions").clear(),
        tx.objectStore("meta").clear(),
      ]);
      for (const m of snapshot.meals) await tx.objectStore("meals").add(m);
      for (const c of snapshot.companions) await tx.objectStore("companions").put(c);
      await tx.objectStore("meta").put({ key: META_KEY, ...snapshot.meta });
      await tx.done;
    },
  };
}

import type { ReceiptExtraction } from "@/contracts/index";
import { spikeReceipts } from "@/fixtures/index";
import { HOUR_MS } from "@/domain/meals/time";

/**
 * Sample receipts for the Feed screen, so every rule can be tried without a real
 * receipt. Each one starts from a synthetic fixture extraction and moves its purchase
 * time to an offset from a stored epoch. The offsets are fixed, so tapping the same
 * sample twice is a true duplicate, and the three meals are spaced so that they all
 * count in any order.
 */
export interface SampleReceipt {
  id: string;
  emoji: string;
  title: string;
  /** Shop and total, shown on the button. */
  detail: string;
  group: "meal" | "gaming";
  /** What a judge should see when they tap it. */
  expect: string;
  build(epochMs: number): ReceiptExtraction;
}

const MINUTE = 60_000;

function fixture(index: number): ReceiptExtraction {
  const r = spikeReceipts[index];
  if (!r) throw new Error(`No fixture receipt at index ${index}`);
  return r;
}

function at(index: number, offsetMs: number, patch: Partial<ReceiptExtraction> = {}) {
  return (epochMs: number): ReceiptExtraction => ({
    ...fixture(index),
    purchasedAtMs: epochMs + offsetMs,
    ...patch,
  });
}

const burger = at(0, -8 * HOUR_MS, { dealId: "deal-sb-01" });

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: "burger",
    emoji: "🍔",
    title: "Burger and fries",
    detail: "Brumwicket Buns · $14.97 · uses a deal",
    group: "meal",
    expect: "Counts. +10 XP and a level.",
    build: burger,
  },
  {
    id: "tacos",
    emoji: "🌮",
    title: "Street tacos",
    detail: "Tavvlethorn Tacos · $14.47 · uses a deal",
    group: "meal",
    expect: "Counts. Your companion evolves on its second meal.",
    build: at(1, -50 * MINUTE, { dealId: "deal-tm-01" }),
  },
  {
    id: "family",
    emoji: "🥡",
    title: "Family feast",
    detail: "Zindlewick Chopsticks · $108.50 · 5 items",
    group: "meal",
    expect: "Counts as one meal. Same XP as the $14 burger.",
    build: at(2, -4 * HOUR_MS),
  },
  {
    id: "again",
    emoji: "📸",
    title: "Same burger, photographed again",
    detail: "Brumwicket Buns · $14.97",
    group: "gaming",
    expect: "Rejected as already eaten.",
    build: (epochMs) => ({ ...burger(epochMs), confidence: 0.88, itemCount: 4 }),
  },
  {
    id: "noodles",
    emoji: "🍜",
    title: "Another meal right away",
    detail: "Nimblequern Noodles · $24.00",
    group: "gaming",
    expect: "Too soon. Shows when the next meal can count.",
    build: at(10, -20 * MINUTE),
  },
  {
    id: "hardware",
    emoji: "🔩",
    title: "Hardware store",
    detail: "Brassquibble Hardware · $30.23",
    group: "gaming",
    expect: "Rejected. Not a food business.",
    build: at(7, -5 * HOUR_MS),
  },
  {
    id: "old",
    emoji: "🕰️",
    title: "Three days old",
    detail: "Pellumquill Pasta · $24.49",
    group: "gaming",
    expect: "Rejected. Older than 48 hours.",
    build: at(5, -72 * HOUR_MS),
  },
  {
    id: "future",
    emoji: "🔮",
    title: "Dated tomorrow",
    detail: "Dawnquibble Diner · $16.50",
    group: "gaming",
    expect: "Rejected. Dated in the future.",
    build: at(6, 24 * HOUR_MS),
  },
  {
    id: "notime",
    emoji: "❓",
    title: "No time printed",
    detail: "Wumplewick Wok · $18.50",
    group: "gaming",
    expect: "Sent to review. No XP, and no guessing.",
    build: () => ({ ...fixture(8), purchasedAtMs: null }),
  },
  {
    id: "blurry",
    emoji: "🌫️",
    title: "Too blurry to read",
    detail: "Unreadable",
    group: "gaming",
    expect: "Sent to review with a reason.",
    build: () => fixture(4),
  },
];

export function findSample(id: string): SampleReceipt | undefined {
  return SAMPLE_RECEIPTS.find((s) => s.id === id);
}

/**
 * src/contracts/index.ts
 *
 * Shared Zod schemas and TypeScript types for the entire app.
 * Changes require an approved CR in docs/contracts/CR-<n>.md.
 *
 * Meal rules and defaults are derived from .kiro/steering/hangori-rules.md.
 */

import { z } from "zod";

// ── MealRules ─────────────────────────────────────────────────────────────────

export const MealRulesSchema = z.object({
  /** XP awarded for a counted meal. */
  xpPerMeal: z.int().positive().default(10),
  /** Maximum counted meals within any 24-hour window. */
  maxMealsPer24h: z.int().positive().default(3),
  /** Minimum hours between counted meals (measured by purchase time). */
  minHoursBetweenMeals: z.number().positive().default(3),
  /** Maximum age of a receipt in hours before it is rejected. */
  maxReceiptAgeHours: z.number().positive().default(48),
  /** Minimum extraction confidence to auto-count a meal (below → needs_review). */
  minExtractionConfidence: z.number().min(0).max(1).default(0.8),
  /** When true, meals without an associated deal are rejected. */
  countOnlyDealMeals: z.boolean().default(false),
  /**
   * How many minutes in the future a receipt's purchase time may be before it
   * is rejected as future-dated. Accounts for clock skew and timezone edge cases.
   */
  maxFutureSkewMinutes: z.number().nonnegative().default(5),
});

export type MealRules = z.infer<typeof MealRulesSchema>;

/** Singleton with all defaults applied — use this everywhere you need rule values. */
export const defaultMealRules: MealRules = MealRulesSchema.parse({});

// ── ReceiptExtraction ─────────────────────────────────────────────────────────

export const ReceiptExtractionSchema = z.object({
  /** Merchant name as extracted, or null if unreadable. */
  merchantName: z.string().nullable(),
  /** Merchant category determined by the extractor or a lookup. */
  merchantCategory: z.enum(["food", "other", "unknown"]),
  /** Purchase timestamp in milliseconds (UTC), or null if not found. */
  purchasedAtMs: z.int().nullable(),
  /** Total in integer cents, or null if not found. */
  totalCents: z.int().nonnegative().nullable(),
  /** Receipt ID printed on the receipt, or null if not found. */
  receiptId: z.string().nullable(),
  /** Number of line items extracted (0 if none). */
  itemCount: z.int().nonnegative(),
  /** Confidence score from the extractor, 0–1. */
  confidence: z.number().min(0).max(1),
  /** Which extractor produced this result. "sample" = pre-loaded fixture receipt. */
  source: z.enum(["tesseract", "manual", "sample"]),
  /** Deal ID if this meal was associated with a deal, or null. */
  dealId: z.string().nullable(),
});

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

// ── MealDecision ──────────────────────────────────────────────────────────────

/**
 * Machine-readable reason code, following the rule-check order in hangori-rules.md:
 * missing_time → low_confidence → unknown_category → not_food → future_date →
 * too_old → duplicate → no_deal → too_soon → daily_limit → counted
 */
export const MealReasonCodeSchema = z.enum([
  "counted",
  "missing_time",
  "low_confidence",
  "unknown_category",
  "not_food",
  "future_date",
  "too_old",
  "duplicate",
  "no_deal",
  "too_soon",
  "daily_limit",
]);

export type MealReasonCode = z.infer<typeof MealReasonCodeSchema>;

export const MealDecisionSchema = z.object({
  /** Result of evaluating the receipt against the meal rules. */
  outcome: z.enum(["counted", "rejected", "needs_review"]),
  /** Machine-readable reason code for programmatic branching. */
  reasonCode: MealReasonCodeSchema,
  /** Human-readable explanation shown to the user. */
  reason: z.string(),
  /** XP awarded (0 for rejected or needs_review). */
  xpAwarded: z.int().nonnegative(),
  /**
   * Deduplication fingerprint:
   * "<merchant-normalised>|<purchase-minute>|<total-cents>|<receipt-id-or-empty>"
   */
  fingerprint: z.string(),
  /** Timestamp (ms) when the next meal can be counted, or null if no limit applies. */
  nextEligibleAtMs: z.int().nullable(),
});

export type MealDecision = z.infer<typeof MealDecisionSchema>;

// ── CountedMeal ───────────────────────────────────────────────────────────────

export const CountedMealSchema = z.object({
  /** Unique ID for this ledger entry. */
  id: z.string(),
  /** Deduplication fingerprint (same scheme as MealDecision.fingerprint). */
  fingerprint: z.string(),
  /** Merchant name as it was stored. */
  merchantName: z.string(),
  /** Purchase timestamp in milliseconds (UTC). */
  purchasedAtMs: z.int(),
  /** Total in integer cents. */
  totalCents: z.int().nonnegative(),
  /** XP awarded for this meal. */
  xpAwarded: z.int().nonnegative(),
  /**
   * Amount saved on this meal in cents (deal discount), or null if unknown.
   * Displayed to the user; never affects XP.
   */
  savedCents: z.int().nonnegative().nullable(),
  /** Deal ID if a deal was used, or null. */
  dealId: z.string().nullable(),
  /** Timestamp when this record was written to the ledger. */
  recordedAtMs: z.int(),
});

export type CountedMeal = z.infer<typeof CountedMealSchema>;

// ── Restaurant ────────────────────────────────────────────────────────────────

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  address: z.string(),
});

export type Restaurant = z.infer<typeof RestaurantSchema>;

// ── Deal ──────────────────────────────────────────────────────────────────────

export const DealSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  title: z.string(),
  description: z.string(),
  /** Promo code, or null if no code is needed. */
  code: z.string().nullable(),
  terms: z.string(),
  /** Expiry timestamp in milliseconds (UTC), or null if the deal does not expire. */
  expiresAtMs: z.int().nullable(),
  /**
   * Estimated savings in cents if the user redeems this deal, or null if unknown.
   * Displayed to the user; never affects XP.
   */
  estimatedSavingsCents: z.int().nonnegative().nullable(),
  /**
   * Link-out URL — opens the restaurant's page in a food app or on its own site.
   * No third-party brand names in the UI; use generic labels like "Open in your food app".
   */
  linkOutUrl: z.url(),
});

export type Deal = z.infer<typeof DealSchema>;

// ── DealsFeed ─────────────────────────────────────────────────────────────────

export const DealsFeedSchema = z.object({
  deals: z.array(DealSchema),
  restaurants: z.array(RestaurantSchema),
  /** Timestamp when this feed snapshot was created. */
  fetchedAtMs: z.int(),
});

export type DealsFeed = z.infer<typeof DealsFeedSchema>;

// ── Companion ─────────────────────────────────────────────────────────────────

export const CompanionIdSchema = z.enum([
  "hangori",
  "brisket",
  "mochi",
  "grubble",
  "sprig",
]);

export type CompanionId = z.infer<typeof CompanionIdSchema>;

export const CompanionStateSchema = z.object({
  id: CompanionIdSchema,
  /** Evolution stage, 1–4. */
  stage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  /** Total accumulated XP. */
  xp: z.int().nonnegative(),
  /** Total counted meals. */
  totalMeals: z.int().nonnegative(),
  /** Whether the companion is showing its Halloween form. */
  halloween: z.boolean(),
});

export type CompanionState = z.infer<typeof CompanionStateSchema>;

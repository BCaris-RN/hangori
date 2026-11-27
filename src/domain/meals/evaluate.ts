import type {
  CountedMeal,
  MealDecision,
  MealReasonCode,
  MealRules,
  ReceiptExtraction,
} from "@/contracts/index";
import { buildFingerprint } from "./fingerprint";
import { DAY_MS, HOUR_MS, MINUTE_MS, formatWait } from "./time";

export { buildFingerprint } from "./fingerprint";

/** True when a purchase at `t` would sit closer than `gapMs` to any counted meal. */
function spacingViolated(t: number, times: number[], gapMs: number): boolean {
  return times.some((m) => Math.abs(t - m) < gapMs);
}

/**
 * True when adding a purchase at `t` puts more than `max` counted meals inside any
 * span shorter than 24 hours that contains `t`. Windows are checked in both
 * directions, so an older receipt submitted late is still held to the limit.
 */
function dailyViolated(t: number, times: number[], max: number): boolean {
  const all = [...times, t].sort((a, b) => a - b);
  const first = all.indexOf(t);
  const last = all.lastIndexOf(t);
  const from = Math.max(0, first - max);
  const to = Math.min(last, all.length - 1 - max);
  for (let i = from; i <= to; i++) {
    if (all[i + max] - all[i] < DAY_MS) return true;
  }
  return false;
}

/**
 * The earliest time at or after `nowMs` when a new purchase could count, applying
 * both the spacing rule and the rolling daily limit against the ledger.
 * A constraint can only start to hold again at one of the candidate times below.
 */
function earliestEligible(nowMs: number, times: number[], rules: MealRules): number {
  const gapMs = rules.minHoursBetweenMeals * HOUR_MS;
  const candidates = new Set<number>([nowMs]);
  for (const m of times) {
    for (const offset of [gapMs, -gapMs, DAY_MS, -DAY_MS]) {
      if (m + offset >= nowMs) candidates.add(m + offset);
    }
  }
  const ordered = [...candidates].sort((a, b) => a - b);
  for (const t of ordered) {
    if (!spacingViolated(t, times, gapMs) && !dailyViolated(t, times, rules.maxMealsPer24h)) return t;
  }
  return Math.max(nowMs, ...times) + Math.max(gapMs, DAY_MS);
}

function hoursLabel(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

/**
 * Decides whether a receipt counts as a meal. Pure and synchronous: no storage,
 * no clock, no network. Checks run in the order given in hangori-rules.md and the
 * first failure is reported.
 */
export function evaluateMeal(
  extraction: ReceiptExtraction,
  prior: CountedMeal[],
  rules: MealRules,
  nowMs: number,
): MealDecision {
  const fingerprint = buildFingerprint(extraction);
  const times = prior.map((m) => m.purchasedAtMs);

  const decide = (
    outcome: MealDecision["outcome"],
    reasonCode: MealReasonCode,
    reason: string,
    nextEligibleAtMs: number | null = null,
  ): MealDecision => ({
    outcome,
    reasonCode,
    reason,
    xpAwarded: reasonCode === "counted" ? rules.xpPerMeal : 0,
    fingerprint,
    nextEligibleAtMs,
  });

  const purchasedAtMs = extraction.purchasedAtMs;

  // 1. Missing purchase time.
  if (purchasedAtMs === null) {
    return decide(
      "needs_review",
      "missing_time",
      "We could not find a purchase time on this receipt, so it needs a quick review before it can count.",
    );
  }

  // 2. Low confidence, or a missing merchant name or total.
  if (
    extraction.confidence < rules.minExtractionConfidence ||
    extraction.merchantName === null ||
    extraction.totalCents === null
  ) {
    return decide(
      "needs_review",
      "low_confidence",
      "We could not read this receipt clearly enough to be sure about it, so it needs a quick review.",
    );
  }

  // 3. Unknown merchant category.
  if (extraction.merchantCategory === "unknown") {
    return decide(
      "needs_review",
      "unknown_category",
      "We could not tell what kind of business this receipt is from, so it needs a quick review.",
    );
  }

  // 4. Not a food business.
  if (extraction.merchantCategory === "other") {
    return decide(
      "rejected",
      "not_food",
      "This receipt is from a business that does not sell food, so it cannot feed your companion.",
    );
  }

  // 5. Dated in the future.
  if (purchasedAtMs > nowMs + rules.maxFutureSkewMinutes * MINUTE_MS) {
    return decide("rejected", "future_date", "This receipt is dated in the future, so it cannot count yet.");
  }

  // 6. Too old.
  if (purchasedAtMs < nowMs - rules.maxReceiptAgeHours * HOUR_MS) {
    return decide(
      "rejected",
      "too_old",
      `This receipt is more than ${hoursLabel(rules.maxReceiptAgeHours)} hours old, so it is too old to count.`,
    );
  }

  // 7. Duplicate.
  if (prior.some((m) => m.fingerprint === fingerprint)) {
    return decide("rejected", "duplicate", "You already fed your companion with this receipt, so it cannot count twice.");
  }

  // 8. Deal-only mode.
  if (rules.countOnlyDealMeals && extraction.dealId === null) {
    return decide(
      "rejected",
      "no_deal",
      "Only meals bought with a deal count right now, and this receipt is not linked to a deal.",
    );
  }

  // 9. Too soon after (or before) another counted meal.
  if (spacingViolated(purchasedAtMs, times, rules.minHoursBetweenMeals * HOUR_MS)) {
    const next = earliestEligible(nowMs, times, rules);
    return decide(
      "rejected",
      "too_soon",
      `Your companion is still full from another meal. A new purchase can count in ${formatWait(next - nowMs)}.`,
      next,
    );
  }

  // 10. Daily limit.
  if (dailyViolated(purchasedAtMs, times, rules.maxMealsPer24h)) {
    const next = earliestEligible(nowMs, times, rules);
    return decide(
      "rejected",
      "daily_limit",
      `Your companion has eaten as much as it can in one day. A new purchase can count in ${formatWait(next - nowMs)}.`,
      next,
    );
  }

  return decide("counted", "counted", `Meal counted. Your companion ate and gained ${rules.xpPerMeal} XP.`);
}

/** Object-argument form of `evaluateMeal`. */
export function evaluateMealClaim(claim: {
  extraction: ReceiptExtraction;
  nowMs: number;
  history: CountedMeal[];
  rules: MealRules;
}): MealDecision {
  return evaluateMeal(claim.extraction, claim.history, claim.rules, claim.nowMs);
}

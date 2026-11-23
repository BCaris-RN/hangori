import type { ReceiptExtraction, MealDecision, MealRules, CountedMeal } from "@/contracts/index";

/**
 * Evaluates a receipt extraction against the meal rules and the existing ledger.
 * Returns a MealDecision describing the outcome.
 *
 * Stub — will be implemented in the meals slice.
 */
export function evaluateMeal(
  _extraction: ReceiptExtraction,
  _prior: CountedMeal[],
  _rules: MealRules,
  _nowMs: number,
): MealDecision {
  throw new Error("Not implemented");
}

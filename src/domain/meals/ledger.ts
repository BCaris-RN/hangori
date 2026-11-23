import type { CountedMeal } from "@/contracts/index";

/**
 * Returns all counted meals from the local ledger, ordered by purchasedAtMs ascending.
 *
 * Stub — will be implemented in the meals slice.
 */
export function getMeals(): Promise<CountedMeal[]> {
  throw new Error("Not implemented");
}

/**
 * Records a counted meal to the local ledger.
 *
 * Stub — will be implemented in the meals slice.
 */
export function recordMeal(_meal: CountedMeal): Promise<void> {
  throw new Error("Not implemented");
}

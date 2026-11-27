import type { Deal, DealsFeed, Restaurant } from "@/contracts/index";
import { dealsFeed } from "@/fixtures/index";

/** Generic label for every link-out. No third-party brand names in the UI. */
export const LINK_OUT_LABEL = "Open in your food app";

/**
 * Where deals come from. A real food-app or coupon integration would implement this
 * interface; the build ships only the mock below, which reads bundled fixtures.
 */
export interface DealsAdapter {
  getFeed(): Promise<DealsFeed>;
}

export const mockDealsAdapter: DealsAdapter = {
  async getFeed() {
    return dealsFeed;
  },
};

export function findDeal(feed: DealsFeed, dealId: string | null): Deal | undefined {
  return dealId === null ? undefined : feed.deals.find((d) => d.id === dealId);
}

export function findRestaurant(feed: DealsFeed, restaurantId: string): Restaurant | undefined {
  return feed.restaurants.find((r) => r.id === restaurantId);
}

/** Formats cents as dollars, for example 1497 becomes "$14.97". */
export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

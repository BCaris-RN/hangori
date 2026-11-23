// Quick fixture validation — run with: node scripts/validate-fixtures.mjs
// Mirrors src/contracts/index.ts exactly. Zod 4 API throughout.

import { readFileSync } from "fs";
import { z } from "zod";

const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  address: z.string(),
});

const DealSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  title: z.string(),
  description: z.string(),
  code: z.string().nullable(),
  terms: z.string(),
  expiresAtMs: z.int().nullable(),
  estimatedSavingsCents: z.int().nonnegative().nullable(),
  linkOutUrl: z.url(),
});

const DealsFeedSchema = z.object({
  deals: z.array(DealSchema),
  restaurants: z.array(RestaurantSchema),
  fetchedAtMs: z.int(),
});

const ReceiptExtractionSchema = z.object({
  merchantName: z.string().nullable(),
  merchantCategory: z.enum(["food", "other", "unknown"]),
  purchasedAtMs: z.int().nullable(),
  totalCents: z.int().nonnegative().nullable(),
  receiptId: z.string().nullable(),
  itemCount: z.int().nonnegative(),
  confidence: z.number().min(0).max(1),
  source: z.enum(["tesseract", "manual", "sample"]),
  dealId: z.string().nullable(),
});

let ok = true;

const deals = JSON.parse(readFileSync("fixtures/deals.json", "utf8"));
const dr = DealsFeedSchema.safeParse(deals);
if (!dr.success) {
  console.error("deals.json INVALID:", JSON.stringify(z.treeifyError(dr.error), null, 2));
  ok = false;
} else {
  console.log(`deals.json OK — ${dr.data.restaurants.length} restaurants, ${dr.data.deals.length} deals`);
}

const receipts = JSON.parse(readFileSync("fixtures/receipts.json", "utf8"));
const errors = [];
receipts.forEach((r, i) => {
  const rr = ReceiptExtractionSchema.safeParse(r);
  if (!rr.success) errors.push(`[${i}] ${JSON.stringify(z.treeifyError(rr.error))}`);
});
if (errors.length) {
  console.error("receipts.json INVALID:");
  errors.forEach(e => console.error(" ", e));
  ok = false;
} else {
  console.log(`receipts.json OK — ${receipts.length} extractions`);
}

process.exit(ok ? 0 : 1);

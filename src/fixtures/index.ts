/**
 * src/fixtures/index.ts
 *
 * Imports the synthetic fixture JSON and re-exports it as typed values.
 * Vite bundles these at build time — no separate static-file copies needed.
 * The service worker precaches them as part of the JS bundle.
 */

import type { DealsFeed, ReceiptExtraction } from "@/contracts/index";
import dealsRaw from "../../fixtures/deals.json";
import receiptsRaw from "../../fixtures/receipts.json";

export const dealsFeed: DealsFeed = dealsRaw as DealsFeed;
export const spikeReceipts: ReceiptExtraction[] = receiptsRaw as ReceiptExtraction[];

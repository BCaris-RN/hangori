import type { ReceiptExtraction } from "@/contracts/index";
import { MINUTE_MS } from "./time";

function stripMarks(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "");
}

/** Merchant name: NFKD, diacritics stripped, lowercase, only a-z and 0-9. */
export function normalizeMerchant(name: string | null): string {
  return name === null ? "" : stripMarks(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Receipt ID: NFKD, diacritics stripped, uppercase, only A-Z and 0-9. */
export function normalizeReceiptId(id: string | null): string {
  return id === null ? "" : stripMarks(id).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Duplicate-detection key: `<merchant>|<purchase minute>|<total cents>|<receipt id>`.
 * The minute is the whole number of minutes since the epoch. A missing field is an
 * empty segment, so the pipes are always present.
 */
export function buildFingerprint(e: ReceiptExtraction): string {
  const minute = e.purchasedAtMs === null ? "" : String(Math.floor(e.purchasedAtMs / MINUTE_MS));
  const cents = e.totalCents === null ? "" : String(e.totalCents);
  return `${normalizeMerchant(e.merchantName)}|${minute}|${cents}|${normalizeReceiptId(e.receiptId)}`;
}

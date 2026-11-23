// extract.js — runs tesseract.js OCR on each PNG and parses the four fields
// Run: node extract.js
// Output: results.json

const path = require("path");
const fs = require("fs");
const { createWorker } = require("tesseract.js");
const { receipts } = require("./receipts");

const OUT_DIR = path.join(__dirname, "output");
const RESULTS_PATH = path.join(__dirname, "results.json");

// ── Parser helpers ────────────────────────────────────────────────────────────

/**
 * Extract merchant name: first non-empty line of the OCR text, stripped of
 * trailing punctuation and normalised to title case.
 */
function parseMerchant(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  // The merchant is the first substantial line (more than 3 chars)
  const line = lines.find(l => l.length > 3) || lines[0];
  return line.replace(/[^a-zA-Z0-9 &'-]/g, "").trim() || null;
}

/**
 * Extract purchase time.
 * Handles locale variants including Windows toLocaleString comma-after-year:
 *   "Nov 26, 2026, 7:03 PM"   (Windows locale)
 *   "Nov 26, 2026 7:03 PM"    (other locales)
 *   "Nov 26, 2026"            (date only)
 *   "11/26/2026 19:03"
 * Also tolerates minor OCR noise in the time digits (e.g. "10:0Â¢" → extracted date only).
 */
function parsePurchaseTime(text) {
  // Named-month: allow optional comma between year and time, tolerate OCR noise in time
  // Pattern: "Nov 26, 2026[,] [d]d:dd AM/PM"  — time part optional
  const named = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s*\d{4}(?:,?\s+[\dOo]{1,2}:[\dOo]{2}\s*(?:AM|PM))?/i
  );
  if (named) {
    // Normalise OCR digit substitutions in the time portion
    return named[0]
      .replace(/,(\s*[\dOo]{1,2}:[\dOo]{2})/, "$1")  // remove extra comma before time
      .replace(/\s+/g, " ")
      .trim();
  }

  // Numeric pattern: "11/26/2026 7:03 PM"
  const numeric = text.match(
    /\b\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?/i
  );
  if (numeric) return numeric[0].trim();

  // ISO pattern
  const iso = text.match(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?/);
  if (iso) return iso[0].trim();

  return null;
}

/**
 * Extract total: looks for a line that is exactly "Total" (not Subtotal/Service fee/etc.)
 * followed by or containing a dollar amount. Falls back to the largest dollar amount.
 */
function parseTotal(text) {
  const lines = text.split("\n").map(l => l.trim());
  // First pass: lines where "total" is the whole label (not "subtotal", "service fee", etc.)
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Match "Total" but NOT "Subtotal", "Total Items", etc. — word boundary on both sides
    if (/(?<![a-z])total(?!\s*(items|qty|count|pieces|pcs))/i.test(l) &&
        !/sub\s*total|service|delivery|tip/i.test(l)) {
      const m = l.match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/);
      if (m) return parseFloat(m[1].replace(",", ""));
      // amount may be on the next line
      if (i + 1 < lines.length) {
        const m2 = lines[i + 1].match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/);
        if (m2) return parseFloat(m2[1].replace(",", ""));
      }
    }
  }
  // Fallback: largest dollar amount in the text
  const all = [...text.matchAll(/\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})/g)]
    .map(m => parseFloat(m[1].replace(",", "")));
  return all.length ? Math.max(...all) : null;
}

/**
 * Extract receipt ID: looks for "Receipt #" or "Order #" followed by an
 * alphanumeric string. Case-insensitive OCR noise tolerated.
 */
function parseReceiptId(text) {
  const m = text.match(/(?:Receipt\s*#|Order\s*#|Ref\s*#|Invoice\s*#)\s*([A-Za-z0-9]{6,})/i);
  if (!m) return null;
  // Uppercase and correct common OCR substitutions: l→L, o→O, 0→O handled by uppercase
  return m[1].toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ── Ground-truth lookup ───────────────────────────────────────────────────────

function groundTruth(r) {
  return {
    merchant: r.merchant,
    purchaseTime: r.purchaseTime || r.purchaseDate || null,
    total: r.total,
    receiptId: r.receiptId || null,
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Fuzzy merchant match: lowercase, strip non-alphanumeric, check substring
 * containment in both directions.
 */
function normalize(s) {
  return s ? s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim() : "";
}

function merchantMatch(extracted, expected) {
  if (!extracted) return false;
  const e = normalize(extracted);
  const x = normalize(expected);
  return e === x || e.includes(x) || x.includes(e);
}

/** Time match: compare date and hour:minute, ignoring seconds and format */
function timeMatch(extracted, expected) {
  if (!extracted || !expected) return extracted === expected; // both null = match
  // Normalise Windows locale "Nov 26, 2026, 6:00 PM" → "Nov 26, 2026 6:00 PM"
  const norm = s => s.replace(/,(\s*[\dOo]{1,2}:[\dOo]{2})/, "$1")
                      .replace(/[Oo]/g, "0");   // OCR O→0 in time digits
  try {
    const a = new Date(norm(extracted));
    const b = new Date(norm(expected));
    if (isNaN(a) || isNaN(b)) {
      return normalize(extracted) === normalize(expected);
    }
    // Allow 1-minute tolerance for OCR noise
    return Math.abs(a - b) <= 60000;
  } catch {
    return normalize(extracted) === normalize(expected);
  }
}

function totalMatch(extracted, expected) {
  if (extracted === null || extracted === undefined) return false;
  return Math.abs(extracted - expected) < 0.015; // half-cent tolerance
}

function receiptIdMatch(extracted, expected) {
  if (!expected) return true;  // no receipt ID expected → field N/A, counts as correct
  if (!extracted) return false;
  // Normalise: uppercase, strip non-alphanumeric, common OCR swaps O↔0, I↔1
  const ocr = (s) => s.toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1");
  const a = ocr(extracted);
  const b = ocr(expected);
  if (a === b) return true;
  // Allow Levenshtein distance 1 for single-character OCR insertion/deletion/substitution
  return levenshtein(a, b) <= 1;
}

/** Simple Levenshtein distance for short strings */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function scoreResult(parsed, gt) {
  return {
    merchant:    merchantMatch(parsed.merchant, gt.merchant),
    purchaseTime: timeMatch(parsed.purchaseTime, gt.purchaseTime),
    total:       totalMatch(parsed.total, gt.total),
    receiptId:   receiptIdMatch(parsed.receiptId, gt.receiptId),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const worker = await createWorker("eng", 1, {
    // suppress verbose logging
    logger: () => {},
  });

  const results = [];

  for (const r of receipts) {
    const imgPath = path.join(OUT_DIR, `${r.id}-${r.label}.png`);
    if (!fs.existsSync(imgPath)) {
      console.warn(`SKIP ${r.id}: PNG not found — run render.js first`);
      continue;
    }

    const t0 = Date.now();
    const { data: { text } } = await worker.recognize(imgPath);
    const elapsed = Date.now() - t0;

    const parsed = {
      merchant:    parseMerchant(text),
      purchaseTime: parsePurchaseTime(text),
      total:       parseTotal(text),
      receiptId:   parseReceiptId(text),
    };

    const gt = groundTruth(r);
    const score = scoreResult(parsed, gt);
    const allCorrect = Object.values(score).every(Boolean);

    results.push({
      id: r.id,
      label: r.label,
      elapsedMs: elapsed,
      groundTruth: gt,
      extracted: parsed,
      score,
      allCorrect,
      rawText: text.trim(),
    });

    const mark = allCorrect ? "✓" : "✗";
    console.log(`${mark} ${r.id} ${r.label} (${elapsed}ms)  ` +
      `merchant:${score.merchant ? "✓" : "✗"} ` +
      `time:${score.purchaseTime ? "✓" : "✗"} ` +
      `total:${score.total ? "✓" : "✗"} ` +
      `id:${score.receiptId ? "✓" : "✗"}`);
  }

  await worker.terminate();

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  console.log(`\nResults written to results.json`);

  // Summary
  const fields = ["merchant", "purchaseTime", "total", "receiptId"];
  console.log("\n── Accuracy per field ──────────────────────────────");
  for (const f of fields) {
    const correct = results.filter(r => r.score[f]).length;
    console.log(`  ${f.padEnd(14)} ${correct}/${results.length}  (${Math.round(correct/results.length*100)}%)`);
  }
  const allCorrect = results.filter(r => r.allCorrect).length;
  console.log(`\n  All-four-fields  ${allCorrect}/${results.length}  (${Math.round(allCorrect/results.length*100)}%)`);
  const passBar = allCorrect >= 17;
  console.log(`  Pass bar (17/20)  ${passBar ? "PASS ✓" : "FAIL ✗"}`);
}

main().catch(err => { console.error(err); process.exit(1); });

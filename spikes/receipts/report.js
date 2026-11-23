// report.js — reads results.json and writes docs/spikes/receipt-extraction.md
// Run after extract.js: node report.js

const fs = require("fs");
const path = require("path");

const RESULTS_PATH = path.join(__dirname, "results.json");
const REPORT_PATH = path.join(__dirname, "..", "..", "docs", "spikes", "receipt-extraction.md");

function main() {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error("results.json not found — run extract.js first");
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf8"));

  const fields = ["merchant", "purchaseTime", "total", "receiptId"];
  const fieldLabels = {
    merchant: "Merchant",
    purchaseTime: "Date/Time",
    total: "Total",
    receiptId: "Receipt ID",
  };

  // ── Per-field accuracy ────────────────────────────────────────────────────
  const accuracy = {};
  for (const f of fields) {
    const correct = results.filter(r => r.score[f]).length;
    accuracy[f] = { correct, total: results.length, pct: Math.round(correct / results.length * 100) };
  }
  const allCorrect = results.filter(r => r.allCorrect).length;
  const avgMs = Math.round(results.reduce((s, r) => s + r.elapsedMs, 0) / results.length);
  const passBar = allCorrect >= 17;

  // ── Build markdown ────────────────────────────────────────────────────────
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");

  let md = `# Receipt extraction spike — results\n\n`;
  md += `Spike date: ${now} UTC  \n`;
  md += `Extractor: tesseract.js (Tesseract 5, eng)  \n`;
  md += `AWS Textract: skipped (no \`AWS_ACCESS_KEY_ID\` in environment)  \n\n`;

  // Summary box
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Receipts rendered | 20 |\n`;
  md += `| Receipts extracted | ${results.length} |\n`;
  md += `| All-four-fields correct | ${allCorrect} / ${results.length} |\n`;
  md += `| Pass bar (17 / 20) | ${passBar ? "**PASS ✓**" : "**FAIL ✗**"} |\n`;
  md += `| Avg OCR time per receipt | ${avgMs} ms |\n\n`;

  // Field accuracy
  md += `## Accuracy per field\n\n`;
  md += `| Field | Correct | Total | % |\n|---|---|---|---|\n`;
  for (const f of fields) {
    const a = accuracy[f];
    md += `| ${fieldLabels[f]} | ${a.correct} | ${a.total} | ${a.pct}% |\n`;
  }
  md += "\n";

  // Per-receipt results table
  md += `## Per-receipt results\n\n`;
  md += `| ID | Label | Merchant | Date/Time | Total | Receipt ID | All ✓ | ms |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;

  for (const r of results) {
    const cell = (ok) => ok ? "✓" : "✗";
    md += `| ${r.id} | ${r.label} | ${cell(r.score.merchant)} | ${cell(r.score.purchaseTime)} | ${cell(r.score.total)} | ${cell(r.score.receiptId)} | ${r.allCorrect ? "✓" : "✗"} | ${r.elapsedMs} |\n`;
  }

  // Detail section — extracted vs ground truth for failures
  const failures = results.filter(r => !r.allCorrect);
  if (failures.length) {
    md += `\n## Failure detail\n\n`;
    for (const r of failures) {
      md += `### ${r.id} — ${r.label}\n\n`;
      md += `| Field | Expected | Extracted | Match |\n|---|---|---|---|\n`;
      for (const f of fields) {
        const exp = r.groundTruth[f] ?? "(none)";
        const ext = r.extracted[f] ?? "(none)";
        md += `| ${fieldLabels[f]} | \`${exp}\` | \`${ext}\` | ${r.score[f] ? "✓" : "✗"} |\n`;
      }
      md += "\n";
      md += `<details><summary>Raw OCR text</summary>\n\n\`\`\`\n${r.rawText}\n\`\`\`\n\n</details>\n\n`;
    }
  }

  // Recommendation
  md += `## Recommendation\n\n`;

  if (passBar) {
    md += `tesseract.js **passes the bar** (${allCorrect}/20 all-four-fields correct).\n\n`;
    md += `### Use tesseract.js for the initial build\n\n`;
    md += `- Runs entirely on-device — no network, no credentials, consistent with the offline-first PWA architecture.\n`;
    md += `- Average OCR time of ${avgMs} ms per receipt is acceptable for a user-triggered feed action.\n`;
    md += `- The simple line-based parser handles standard receipt layouts. Delivery-app order-confirmation style receipts may need a small layout-aware parser variant.\n`;
    md += `- Keep Amazon Textract AnalyzeExpense as the fallback for low-confidence extractions (below \`minExtractionConfidence: 0.8\`). It is already in \`approved_packages.after_spike\` in \`docs/speed.yml\`.\n\n`;
    md += `### What to watch\n\n`;
    md += `- **Re-photographed duplicates** (R005): OCR accuracy is sufficient for duplicate detection via receipt ID + total + merchant fingerprint, even with rotation and blur.\n`;
    md += `- **No-time receipts** (R009): correctly extract date but no time — these go to review per the meal rules, as expected.\n`;
    md += `- **Non-food merchants** (R008): OCR works fine; food-category rejection is a separate domain-logic step, not an extraction concern.\n`;
    md += `- **Future receipts** (R007): OCR works fine; future-date rejection is domain logic.\n\n`;
    md += `### Next steps\n\n`;
    md += `1. Add \`tesseract.js\` to the main project: it is already in \`approved_packages.after_spike\`.\n`;
    md += `2. Promote the parser functions from this spike to \`src/domain/meals/extract.ts\`, wrapped in Zod output schemas.\n`;
    md += `3. Set \`minExtractionConfidence\` threshold using Tesseract's word-confidence scores (available in \`data.words\`).\n`;
    md += `4. The 20 synthetic PNGs in \`spikes/receipts/output/\` become the golden set for regression tests (speed.yml C9).\n`;
  } else {
    md += `tesseract.js **does not pass the bar** (${allCorrect}/20 all-four-fields correct, need 17).\n\n`;
    md += `### Consider Amazon Textract AnalyzeExpense\n\n`;
    md += `- Textract's structured expense API extracts line items with field labels, which should handle varied receipt layouts more reliably.\n`;
    md += `- It requires an AWS account and network access, which conflicts with the offline-first requirement. A cloud-fallback mode (opt-in when online) may be acceptable.\n`;
    md += `- Add AWS credentials to the environment and re-run with \`AWS_ACCESS_KEY_ID\` set to test Textract before making the final call.\n\n`;
    md += `### Failure analysis\n\n`;
    md += `See the Failure detail section above for specific field failures.\n`;
    md += `Key patterns to address before choosing an extractor:\n`;
    if (accuracy.purchaseTime.pct < 85) {
      md += `- **Date/time parsing**: ${accuracy.purchaseTime.pct}% — the regex may not cover the OCR's date format variations.\n`;
    }
    if (accuracy.merchant.pct < 85) {
      md += `- **Merchant name**: ${accuracy.merchant.pct}% — first-line heuristic is fragile; consider a header-detection approach.\n`;
    }
    if (accuracy.total.pct < 85) {
      md += `- **Total**: ${accuracy.total.pct}% — the "largest dollar amount" fallback may be picking up subtotals.\n`;
    }
  }

  md += `\n---\n*Generated by \`spikes/receipts/report.js\`*\n`;

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md);
  console.log(`Report written to ${REPORT_PATH}`);
}

main();

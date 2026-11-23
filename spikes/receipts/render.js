// render.js — renders each synthetic receipt to a PNG using Playwright
// Run: node render.js
// Output: output/<id>-<label>.png

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const { receipts } = require("./receipts");

function buildHtml(r) {
  const timeHtml = r.purchaseTime
    ? `<div class="time">${r.purchaseTime}</div>`
    : `<div class="time date-only">${r.purchaseDate}</div>`;

  let itemsHtml = "";
  for (const [name, price] of (r.items || [])) {
    itemsHtml += `<div class="item"><span>${name}</span><span>$${price.toFixed(2)}</span></div>`;
  }

  // delivery-app style shows subtotal breakdown
  const totalsHtml = r.deliveryApp
    ? `
      <div class="item sub"><span>Subtotal</span><span>$${r.subtotal.toFixed(2)}</span></div>
      <div class="item sub"><span>Delivery fee</span><span>$${r.deliveryFee.toFixed(2)}</span></div>
      <div class="item sub"><span>Service fee</span><span>$${r.serviceFee.toFixed(2)}</span></div>
      <div class="item sub"><span>Tip</span><span>$${r.tip.toFixed(2)}</span></div>
      <div class="total"><span>Total</span><span>$${r.total.toFixed(2)}</span></div>
    `
    : `<div class="total"><span>Total</span><span>$${r.total.toFixed(2)}</span></div>`;

  const headerExtra = r.deliveryApp
    ? `<div class="app-label">Order via ${r.deliveryApp}</div>`
    : "";

  const receiptIdHtml = r.receiptId
    ? `<div class="receipt-id">Receipt # ${r.receiptId}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    background: #f0ede8;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 20px;
    font-family: "Courier New", Courier, monospace;
  }
  .receipt {
    background: #fff;
    width: 320px;
    padding: 24px 20px;
    box-shadow: 2px 2px 8px rgba(0,0,0,0.15);
    border-radius: 2px;
  }
  .merchant {
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-bottom: 2px dashed #333;
    padding-bottom: 10px;
    margin-bottom: 8px;
  }
  .app-label {
    font-size: 11px;
    text-align: center;
    color: #555;
    margin-bottom: 4px;
  }
  .time, .receipt-id {
    font-size: 11px;
    text-align: center;
    color: #555;
    margin-bottom: 10px;
  }
  .date-only { font-style: italic; }
  .items { border-top: 1px dashed #aaa; padding-top: 8px; }
  .item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .item.sub { font-size: 12px; color: #666; }
  .total {
    display: flex;
    justify-content: space-between;
    font-size: 15px;
    font-weight: bold;
    border-top: 2px solid #333;
    margin-top: 8px;
    padding-top: 6px;
  }
  .footer {
    text-align: center;
    font-size: 10px;
    color: #888;
    margin-top: 14px;
    border-top: 1px dashed #aaa;
    padding-top: 8px;
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="merchant">${r.merchant}</div>
  ${headerExtra}
  ${timeHtml}
  ${receiptIdHtml}
  <div class="items">
    ${itemsHtml}
  </div>
  ${totalsHtml}
  <div class="footer">Thank you for dining with us!</div>
</div>
</body>
</html>`;
}

async function main() {
  const outDir = path.join(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 400, height: 600 },
    deviceScaleFactor: 2,  // retina — crisper text for OCR
  });

  for (const r of receipts) {
    const page = await context.newPage();
    const html = buildHtml(r);
    await page.setContent(html, { waitUntil: "load" });

    // Clip to the receipt card only so the PNG is tight
    const card = await page.$(".receipt");
    const box = await card.boundingBox();

    const fname = path.join(outDir, `${r.id}-${r.label}.png`);

    if (r.rotate || r.blur) {
      // Set a larger viewport so the rotated receipt isn't clipped
      await page.setViewportSize({ width: 600, height: 900 });
      // Add padding to body so the rotated card doesn't get clipped by the edge
      await page.evaluate(({ rotate, blur }) => {
        document.body.style.padding = "80px";
        const card = document.querySelector(".receipt");
        card.style.transform = `rotate(${rotate}deg)`;
        card.style.filter = `blur(${blur}px)`;
      }, { rotate: r.rotate || 0, blur: r.blur || 0 });
      await page.screenshot({ path: fname, fullPage: true });
    } else {
      await page.screenshot({ path: fname, clip: {
        x: box.x, y: box.y, width: box.width, height: box.height
      }});
    }

    console.log(`Rendered ${r.id} → ${r.id}-${r.label}.png`);
    await page.close();
  }

  await browser.close();
  console.log("Done. All 20 receipts rendered to output/");
}

main().catch(err => { console.error(err); process.exit(1); });

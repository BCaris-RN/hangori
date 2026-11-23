/**
 * Generates minimal valid PNG icons using only Node built-ins.
 * Creates a solid #1a1a2e square at 192×192 and 512×512.
 */
import { writeFileSync, mkdirSync } from "fs";
import { createDeflate } from "zlib";
import { Buffer } from "buffer";

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = u32be(data.length);
  const crc = u32be(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function ihdr(w, h) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(w, 0);
  data.writeUInt32BE(h, 4);
  data[8] = 8;  // bit depth
  data[9] = 2;  // colour type: RGB
  return chunk("IHDR", data);
}

// Build raw scanlines: each row is [filter=0, R, G, B, R, G, B, ...]
function rawScanlines(w, h, r, g, b) {
  const row = Buffer.alloc(1 + w * 3);
  row[0] = 0; // filter none
  for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  const rows = [];
  for (let y = 0; y < h; y++) rows.push(row);
  return Buffer.concat(rows);
}

function makePng(w, h, r, g, b) {
  return new Promise((resolve, reject) => {
    const raw = rawScanlines(w, h, r, g, b);
    const deflate = createDeflate({ level: 9 });
    const chunks = [];
    deflate.on("data", chunk => chunks.push(chunk));
    deflate.on("end", () => {
      const compressed = Buffer.concat(chunks);
      const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      const png = Buffer.concat([sig, ihdr(w, h), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
      resolve(png);
    });
    deflate.on("error", reject);
    deflate.end(raw);
  });
}

mkdirSync("public/icons", { recursive: true });

// #1a1a2e = rgb(26, 26, 46)
const [r, g, b] = [26, 26, 46];

const [png192, png512] = await Promise.all([makePng(192, 192, r, g, b), makePng(512, 512, r, g, b)]);
writeFileSync("public/icons/icon-192.png", png192);
writeFileSync("public/icons/icon-512.png", png512);

// Also write a simple SVG icon for the browser tab
writeFileSync("public/icons/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1a1a2e"/><text x="32" y="44" font-size="36" text-anchor="middle" fill="#e94560">🐉</text></svg>`
);

console.log("Icons written to public/icons/");

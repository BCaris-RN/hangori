import type { CompanionId } from "@/contracts/index";

/**
 * Original pixel art, drawn in code. Each sprite is a 16 by 16 grid built from a
 * shared head, a body for each evolution stage, and a few species features. Rows are
 * written as the left 8 columns and mirrored, so every sprite is symmetric.
 *
 * Grid keys: o outline, b body, l light, d shade, e eye white, p pupil, m mouth,
 * a species accent, w bat wing, u pumpkin, s stem, k face.
 */
export type SpriteStage = 0 | 1 | 2 | 3 | 4; // 0 is the egg
export const GRID = 16;

export interface Cell {
  x: number;
  y: number;
  fill: string;
}

export interface SpriteCells {
  cells: Cell[];
  /** Halloween-only floating jack-o'-lantern, animated separately. */
  orbit: Cell[];
}

type Half = readonly string[];
type Overlay = Readonly<Record<number, string>>;

const EGG: Half = [
  "........",
  "........",
  ".....ooo",
  "....obbb",
  "...oblbb",
  "...obbbb",
  "..obbabb",
  "..obbbbb",
  "..obabbb",
  "..obbbbb",
  "..obbbab",
  "...obbbb",
  "...odddd",
  "....oooo",
  "........",
  "........",
];

const HEAD: Half = [
  ".....ooo",
  "....obbb",
  "...obbbb",
  "...obepb",
  "...obepb",
  "...obbbb",
  "...obbmm",
  "....obbb",
];

const BODY: Record<1 | 2 | 3 | 4, Half> = {
  1: ["...obbbb", "...odddd", "...ooo.."],
  2: ["..obbbbb", ".obbblll", "..obbbbb", "..ooddd."],
  3: ["..obbbbb", ".obbblll", ".obbblll", "..obbddd", "..ooo..."],
  4: [".aobbbbb", "aobbblll", "obbbblll", ".obbblll", "..obbddd", "..ooo..."],
};

/** The head starts this many rows from the top; the body fills the rest. */
const HEAD_TOP: Record<1 | 2 | 3 | 4, number> = { 1: 5, 2: 4, 3: 3, 4: 2 };

/** Species features, as rows relative to the top of the head (negative is above it). */
const FEATURES: Record<CompanionId, Overlay> = {
  hangori: { 1: ".aa.....", 2: "aaa.....", 3: ".aa....." }, // long goblin ears
  brisket: { [-1]: "....aaaa", 7: "....oaaa", 8: ".....aaa" }, // red hair and a big beard
  mochi: { 5: "....a..." }, // blush
  grubble: { [-2]: "....a...", [-1]: "....aa..", 7: ".....e.." }, // horns and tusks
  sprig: { [-2]: ".......a", [-1]: ".....aaa", 2: ".aa.....", 3: "..a....." }, // leaf crest and ears
};

const WINGS: Half = ["w.......", "ww......", "www.....", ".ww.....", "..w....."];
const PUMPKIN: readonly string[] = [".s.", "uku", "uuu"];

interface Palette {
  [key: string]: string;
}

const SPECIES: Record<CompanionId, { b: string; l: string; d: string; a: string }> = {
  hangori: { b: "#6fbf3a", l: "#a6e36a", d: "#3f7f22", a: "#8ed44a" },
  brisket: { b: "#e3a47a", l: "#f2c4a0", d: "#b2704a", a: "#b5532a" },
  mochi: { b: "#ffd3ec", l: "#ffffff", d: "#e79bc7", a: "#ff7fb0" },
  grubble: { b: "#7f8fb5", l: "#a9b7d6", d: "#4f5b80", a: "#e8e0c8" },
  sprig: { b: "#6fd6b0", l: "#a8f0d4", d: "#3b9c80", a: "#4caf50" },
};

function mix(hex: string, into: string, amount: number): string {
  const a = hex.replace("#", "");
  const b = into.replace("#", "");
  const channel = (i: number) => {
    const from = parseInt(a.slice(i, i + 2), 16);
    const to = parseInt(b.slice(i, i + 2), 16);
    return Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export function paletteFor(id: CompanionId, halloween: boolean): Palette {
  const s = SPECIES[id];
  if (!halloween) {
    return { o: "#1b1030", ...s, e: "#fffbe8", p: "#1b1030", m: "#d6455d", w: "#6b3fa0", u: "#ff7a1a", s: "#3a7a2a", k: "#1b1030" };
  }
  const night = "#3b1a66";
  return {
    o: "#0d0620",
    b: mix(s.b, night, 0.3),
    l: mix(s.l, night, 0.22),
    d: mix(s.d, night, 0.35),
    a: mix(s.a, night, 0.15),
    e: "#fffbe8",
    p: "#ff9d00", // glowing eyes
    m: "#ff5a7a",
    w: "#6b3fa0",
    u: "#ff7a1a",
    s: "#3a7a2a",
    k: "#1b1030",
  };
}

/** Egg colours: a cream shell with the species' accent as speckles. */
function eggPalette(id: CompanionId, halloween: boolean): Palette {
  const accent = SPECIES[id].a;
  return {
    o: halloween ? "#0d0620" : "#1b1030",
    b: halloween ? "#cfc3dc" : "#efe6d2",
    l: "#ffffff",
    d: halloween ? "#8d7fa6" : "#bfb29a",
    a: accent,
  };
}

function blank(): string[][] {
  return Array.from({ length: GRID }, () => Array<string>(GRID).fill("."));
}

function stamp(grid: string[][], rows: Half, top: number): void {
  rows.forEach((row, r) => {
    const y = top + r;
    if (y < 0 || y >= GRID) return;
    for (let c = 0; c < 8; c++) {
      const ch = row[c];
      if (!ch || ch === ".") continue;
      grid[y][c] = ch;
      grid[y][GRID - 1 - c] = ch;
    }
  });
}

function stampOverlay(grid: string[][], overlay: Overlay, top: number): void {
  for (const [offset, row] of Object.entries(overlay)) stamp(grid, [row], top + Number(offset));
}

/** The 16 by 16 character grid for a sprite, before colours. Exposed for tests. */
export function spriteGrid(id: CompanionId, stage: SpriteStage, halloween: boolean): string[][] {
  const grid = blank();
  if (stage === 0) {
    stamp(grid, EGG, 0);
    return grid;
  }
  const top = HEAD_TOP[stage];
  if (halloween && stage >= 3) stamp(grid, WINGS, top + 7); // behind the body
  stamp(grid, HEAD, top);
  stamp(grid, BODY[stage], top + HEAD.length);
  stampOverlay(grid, FEATURES[id], top);
  return grid;
}

export function spriteCells(id: CompanionId, stage: SpriteStage, halloween: boolean): SpriteCells {
  const grid = spriteGrid(id, stage, halloween);
  const palette = stage === 0 ? eggPalette(id, halloween) : paletteFor(id, halloween);
  const cells: Cell[] = [];
  grid.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (ch !== "." && palette[ch]) cells.push({ x, y, fill: palette[ch] });
    }),
  );

  const orbit: Cell[] = [];
  if (halloween && stage > 0) {
    const pumpkin = paletteFor(id, true);
    PUMPKIN.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch !== "." && pumpkin[ch]) orbit.push({ x: 13 + dx, y: dy, fill: pumpkin[ch] });
      }),
    );
  }
  return { cells, orbit };
}

/** Every key a grid may use, for tests. */
export const GRID_KEYS = new Set([".", "o", "b", "l", "d", "e", "p", "m", "a", "w", "u", "s", "k"]);

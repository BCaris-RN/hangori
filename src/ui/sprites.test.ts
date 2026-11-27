import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { COMPANION_IDS } from "@/domain/companions/roster";
import { GRID, GRID_KEYS, paletteFor, spriteCells, spriteGrid, type SpriteStage } from "./sprites";

const stages: SpriteStage[] = [0, 1, 2, 3, 4];
const everySprite = COMPANION_IDS.flatMap((id) =>
  stages.flatMap((stage) => [true, false].map((halloween) => ({ id, stage, halloween }))),
);

describe("sprites", () => {
  it("builds a 16 by 16 grid of known keys for every companion, stage and form", () => {
    for (const { id, stage, halloween } of everySprite) {
      const grid = spriteGrid(id, stage, halloween);
      expect(grid, `${id} ${stage}`).toHaveLength(GRID);
      for (const row of grid) {
        expect(row).toHaveLength(GRID);
        for (const ch of row) expect(GRID_KEYS.has(ch), `${id} ${stage} key ${ch}`).toBe(true);
      }
    }
  });

  it("is left-right symmetric, so nothing is lopsided by a typo", () => {
    for (const { id, stage, halloween } of everySprite) {
      for (const row of spriteGrid(id, stage, halloween)) {
        expect([...row].reverse().join("")).toBe(row.join(""));
      }
    }
  });

  it("gives every key a colour, so no cell is silently dropped", () => {
    for (const { id, stage, halloween } of everySprite) {
      const grid = spriteGrid(id, stage, halloween);
      const filled = grid.flat().filter((ch) => ch !== ".").length;
      const { cells } = spriteCells(id, stage, halloween);
      expect(cells.length, `${id} ${stage} ${halloween}`).toBe(filled);
    }
  });

  it("grows as the companion evolves", () => {
    for (const id of COMPANION_IDS) {
      const sizes = ([1, 2, 3, 4] as const).map((s) => spriteCells(id, s, false).cells.length);
      expect(sizes[0]).toBeLessThan(sizes[1]);
      expect(sizes[1]).toBeLessThan(sizes[2]);
      expect(sizes[2]).toBeLessThan(sizes[3]);
    }
  });

  it("looks different for every companion at every stage", () => {
    for (const stage of [1, 2, 3, 4] as const) {
      const seen = new Set(COMPANION_IDS.map((id) => JSON.stringify(spriteCells(id, stage, false).cells)));
      expect(seen.size).toBe(COMPANION_IDS.length);
    }
  });

  it("gives the Halloween form glowing eyes, a jack-o'-lantern and, late on, bat wings", () => {
    for (const id of COMPANION_IDS) {
      expect(paletteFor(id, true).p).toBe("#ff9d00");
      expect(paletteFor(id, false).p).not.toBe("#ff9d00");
      expect(spriteCells(id, 2, true).orbit.length).toBeGreaterThan(0);
      expect(spriteCells(id, 2, false).orbit).toHaveLength(0);
      const wings = (stage: SpriteStage) => spriteGrid(id, stage, true).flat().filter((c) => c === "w").length;
      expect(wings(2)).toBe(0);
      expect(wings(3)).toBeGreaterThan(0);
      expect(wings(4)).toBeGreaterThan(0);
    }
  });

  it("draws eggs without eyes and without the Halloween pumpkin", () => {
    for (const id of COMPANION_IDS) {
      expect(spriteGrid(id, 0, true).flat()).not.toContain("p");
      expect(spriteCells(id, 0, true).orbit).toHaveLength(0);
    }
  });

  it("stays inside the canvas for any sprite", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...COMPANION_IDS),
        fc.constantFrom(...stages),
        fc.boolean(),
        (id, stage, halloween) => {
          const { cells, orbit } = spriteCells(id, stage, halloween);
          for (const c of [...cells, ...orbit]) {
            expect(c.x).toBeGreaterThanOrEqual(0);
            expect(c.x).toBeLessThan(GRID);
            expect(c.y).toBeGreaterThanOrEqual(0);
            expect(c.y).toBeLessThan(GRID);
          }
        },
      ),
    );
  });
});

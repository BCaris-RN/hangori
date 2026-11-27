import type { CompanionId } from "@/contracts/index";

export interface CompanionInfo {
  id: CompanionId;
  name: string;
  species: string;
  blurb: string;
}

/** Display order in the egg picker and the den. */
export const COMPANION_IDS: readonly CompanionId[] = ["hangori", "brisket", "mochi", "grubble", "sprig"];

export const COMPANIONS: Record<CompanionId, CompanionInfo> = {
  hangori: {
    id: "hangori",
    name: "Hangori",
    species: "Goblin",
    blurb: "Sneaky, loud, and always hunting for a bargain.",
  },
  brisket: {
    id: "brisket",
    name: "Brisket",
    species: "Dwarf",
    blurb: "A beard full of crumbs and a love of long lunches.",
  },
  mochi: {
    id: "mochi",
    name: "Mochi",
    species: "Blob",
    blurb: "Soft, squishy, and thrilled by anything sweet.",
  },
  grubble: {
    id: "grubble",
    name: "Grubble",
    species: "Troll",
    blurb: "Grumbles at everything except noodles.",
  },
  sprig: {
    id: "sprig",
    name: "Sprig",
    species: "Wood Elf",
    blurb: "Lives on salads and midnight snacks.",
  },
};

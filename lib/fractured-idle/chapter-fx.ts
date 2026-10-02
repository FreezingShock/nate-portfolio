import type { EStat } from "./enchant";
import type { State } from "./data";

// What each Fractured Level chapter pays when you claim it. Kept free of imports from the game's big modules on
// purpose: sagas.ts folds chapterFx() into the permanent buffs, and chapters.ts needs sagas.ts, so this tiny file
// breaks the loop.

export type ChapterBuff = [EStat, number];

export interface ChapterReward {
    tokens: number;
    eggs: number;
    ap: number; // gems
    dust: number;
    buff: ChapterBuff[];
    title: string; // the name of the perk
}

/** One per chapter, 1 to 10. Chapter 11 (the endgame) pays nothing: it is just the rest of the game. */
export const CHAPTER_REWARDS: ChapterReward[] = [
    { tokens: 5, eggs: 1, ap: 0, dust: 50, buff: [["click", 0.03]], title: "Steady Aim" },
    { tokens: 8, eggs: 1, ap: 1, dust: 100, buff: [["minion", 0.04]], title: "Busy Hands" },
    { tokens: 12, eggs: 2, ap: 1, dust: 200, buff: [["xp", 0.05]], title: "Quick Learner" },
    { tokens: 16, eggs: 2, ap: 1, dust: 350, buff: [["luck", 0.04]], title: "Fortune Seeker" },
    { tokens: 22, eggs: 3, ap: 2, dust: 600, buff: [["all", 0.02]], title: "Rising Star" },
    { tokens: 28, eggs: 3, ap: 2, dust: 900, buff: [["evPay", 0.06]], title: "Event Hunter" },
    { tokens: 36, eggs: 4, ap: 2, dust: 1400, buff: [["petXp", 0.1]], title: "Beast Whisperer" },
    { tokens: 44, eggs: 4, ap: 3, dust: 2000, buff: [["dust", 0.08]], title: "Dust Collector" },
    { tokens: 54, eggs: 5, ap: 3, dust: 3000, buff: [["critDmg", 0.15]], title: "Sharpened Edge" },
    { tokens: 70, eggs: 6, ap: 5, dust: 5000, buff: [["all", 0.04], ["click", 0.05]], title: "Mythic Dawn" },
];

/** Permanent buffs from every chapter claimed so far. */
export function chapterFx(s: State): Partial<Record<EStat, number>> {
    const out: Partial<Record<EStat, number>> = {};
    for (let i = 0; i < Math.min(s.lch, CHAPTER_REWARDS.length); i++) for (const [k, v] of CHAPTER_REWARDS[i].buff) out[k] = (out[k] ?? 0) + v;
    return out;
}

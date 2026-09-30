import type { McSymbolName } from "@/components/mc-symbol";
import { CATS, isUnlocked as lookUnlocked } from "./button";
import {
    ASC_UPS,
    LEVEL_BONUS,
    MILESTONES,
    MINIONS,
    PETS,
    PET_MAX,
    REBIRTH_UPS,
    SKILLS,
    TROPHIES,
    UPGRADES,
    petLevel,
    skillLevel,
    type State,
} from "./data";
import { colTiers } from "./engine";
import { islandOpen, masteryLevel } from "./island-logic";
import { ISLANDS, MASTERY_AT, isSpecial } from "./islands";

// Fractured Level: a slow, SkyBlock-style account level. Every level costs
// FXP_PER_LEVEL Fracture EXP. You never "spend" anything: Fracture EXP is
// earned once for each thing you unlock or achieve, across every system
// (trophies, skills, islands and their mastery, button looks, pets, minion
// collections, upgrades, popup events and plain progress). Sources are read
// from your save, so everything you have already done counts, and each
// source remembers its best value so a rebirth can never take XP away.
// Level 400 needs nearly everything; ascending keeps paying forever.
//
// Every level gives +0.15% to all shards (LEVEL_BONUS); milestone levels also
// pay tokens, eggs and ascension points, and unlock badge symbols and
// prefixes to wear next to your level.

export const FXP_PER_LEVEL = 100;
export const MAX_DISPLAY_LEVEL = 400; // where the badge turns gold and "endgame" starts

export type FxpCat = "trophies" | "skills" | "islands" | "looks" | "pets" | "minions" | "upgrades" | "events" | "progress";

export const FXP_CATS: { id: FxpCat; name: string; color: string; symbol: McSymbolName; hint: string }[] = [
    { id: "trophies", name: "Trophies", color: "var(--mc-yellow)", symbol: "pristine", hint: "Every trophy tier you unlock" },
    { id: "skills", name: "Skills", color: "var(--mc-green)", symbol: "wisdom", hint: "Each Mining, Farming, Combat and Fishing level" },
    { id: "islands", name: "Islands", color: "var(--mc-aqua)", symbol: "location", hint: "Unlocking, visiting and mastering islands" },
    { id: "looks", name: "Button looks", color: "var(--mc-light-purple)", symbol: "speed", hint: "Every look you unlock for the button" },
    { id: "pets", name: "Pets", color: "var(--mc-dark-aqua)", symbol: "petLuck", hint: "Discovering pets and levelling them" },
    { id: "minions", name: "Minions", color: "var(--mc-gold)", symbol: "forge", hint: "Collection tiers and minion milestones" },
    { id: "upgrades", name: "Upgrades", color: "var(--mc-red)", symbol: "attackSpeed", hint: "Shop, token and ascension upgrades" },
    { id: "events", name: "Popups and combo", color: "var(--mc-blue)", symbol: "flag", hint: "Popup events, quick time events, Fragments and combo" },
    { id: "progress", name: "Progress", color: "var(--mc-white, #ffffff)", symbol: "comet", hint: "Rebirths, ascensions, wealth, time and eggs" },
];

export interface FxpSource {
    id: string;
    cat: FxpCat;
    label: string;
    xp: number; // earned right now
    max: number; // the most this source can pay (0 = unbounded)
}

// Milestone ladders: [threshold, xp].
const ladder = (value: number, steps: [number, number][]) => steps.reduce((a, [n, xp]) => (value >= n ? a + xp : a), 0);
const ladderMax = (steps: [number, number][]) => steps.reduce((a, [, xp]) => a + xp, 0);

const POP_CAUGHT: [number, number][] = [[1, 10], [10, 15], [50, 25], [200, 45], [1000, 80], [5000, 140]];
const GOLDEN: [number, number][] = [[1, 12], [25, 25], [100, 50], [500, 100]];
const PERFECT: [number, number][] = [[1, 15], [10, 25], [50, 50], [250, 100]];
const CURSES: [number, number][] = [[1, 8], [5, 16], [20, 32]];
const COMBO: [number, number][] = [[2, 15], [3, 15], [4, 20], [5, 20], [7, 25], [10, 30], [15, 35], [20, 40], [30, 50], [50, 70]];
const HOURS: [number, number][] = [[1, 10], [5, 20], [12, 35], [24, 55], [72, 90], [168, 150], [500, 300]];
const EGGS: [number, number][] = [[1, 10], [10, 20], [50, 40], [200, 80], [1000, 160]];

const RARITY_XP: Record<string, number> = { common: 10, uncommon: 18, rare: 32, epic: 55, legendary: 90 };
const trophyTierXp = (k: number) => 4 + 9 * k * (1 + k / 4); // early tiers are cheap, late tiers pay a lot
const COL_XP = [6, 10, 18, 30, 50, 80];
const MILESTONE_XP = [4, 8, 14, 24, 40];
/** Each power of ten of lifetime shards past 1e3 pays 2 x its number, so deep decades pay the most. */
const decadePay = (total: number) => {
    const d = Math.max(0, Math.floor(Math.log10(Math.max(1, total))) - 2);
    return d * (d + 1);
};
const skillLevelXp = (l: number) => 3 + 2 * Math.floor(l / 10) ** 2; // levels 1-9 pay 3, 50-59 pay 53

/** Every Fracture EXP source and what it is paying right now. */
export function fxpSources(s: State): FxpSource[] {
    const out: FxpSource[] = [];
    const add = (id: string, cat: FxpCat, label: string, xp: number, max: number) => out.push({ id, cat, label, xp, max });

    // Trophies: each tier pays a little more than the last.
    for (const t of TROPHIES) {
        const n = s.tro[t.id] || 0;
        let got = 0;
        let all = 0;
        for (let k = 0; k < t.tiers.length; k++) {
            all += trophyTierXp(k);
            if (k < n) got += trophyTierXp(k);
        }
        add(`tro:${t.id}`, "trophies", `Trophy: ${t.name}`, got, all);
    }

    // Skills: per level, a bit more every ten levels.
    for (const k of SKILLS) {
        const lvl = skillLevel(s[k.id]);
        let got = 0;
        let all = 0;
        for (let l = 1; l <= 60; l++) {
            all += skillLevelXp(l);
            if (l <= lvl) got += skillLevelXp(l);
        }
        add(`skill:${k.id}`, "skills", `${k.name} levels`, got, all);
    }

    // Islands: unlocking, visiting and mastery.
    ISLANDS.forEach((i, n) => {
        const pay = isSpecial(i) ? 350 : Math.round(25 * Math.pow(1.4, n)); // deeper islands pay much more
        add(`isl:${i.id}`, "islands", `Island: ${i.name}`, islandOpen(s, i) ? pay : 0, pay);
        add(`mast:${i.id}`, "islands", `${i.name} mastery`, masteryLevel(s.isec[i.id] || 0) * 25, MASTERY_AT.length * 25);
        if (i.id !== "hub") add(`visit:${i.id}`, "islands", `Visited ${i.name}`, s.visited.includes(i.id) ? 12 : 0, 12);
    });

    // Button looks: a look that asks for something pays when you own it; ascension looks pay more.
    for (const c of CATS) {
        let got = 0;
        let all = 0;
        for (const l of c.list) {
            if (!l.need) continue;
            const xp = l.need.stat === "asc" ? 50 : 5;
            all += xp;
            if (lookUnlocked(s, l)) got += xp;
        }
        add(`looks:${c.id}`, "looks", `${c.label} looks`, got, all);
    }

    // Pets: discovery, then three level marks.
    for (const p of PETS) {
        const base = RARITY_XP[p.rarity] ?? 20;
        const st = s.pets[p.id];
        const lvl = st ? petLevel(p, st.xp) : 0;
        const got = st ? base * (1 + Number(lvl >= 25) + 3 * Number(lvl >= 60) + 8 * Number(lvl >= PET_MAX)) : 0;
        add(`pet:${p.id}`, "pets", `Pet: ${p.name}`, got, base * 13);
    }

    // Minions: collection tiers and count milestones per minion type.
    const tiers = colTiers(s);
    MINIONS.forEach((m, i) => {
        const cols = COL_XP.slice(0, tiers[i]).reduce((a, b) => a + b, 0);
        const ms = MILESTONE_XP.slice(0, MILESTONES.filter((n) => s.minions[i] >= n).length).reduce((a, b) => a + b, 0);
        add(`min:${m.id}`, "minions", m.name, cols + ms, COL_XP.reduce((a, b) => a + b, 0) + MILESTONE_XP.reduce((a, b) => a + b, 0));
    });

    // Upgrades: first level, halfway, and maxed.
    for (const u of UPGRADES) {
        const l = s.ups[u.id] || 0;
        const got = (l >= 1 ? 2 : 0) + (l >= Math.ceil(u.max / 2) ? 5 : 0) + (l >= u.max ? 11 : 0);
        add(`up:${u.id}`, "upgrades", `Upgrade: ${u.name}`, got, 18);
    }
    for (const u of REBIRTH_UPS) add(`rup:${u.id}`, "upgrades", `Token upgrade: ${u.name}`, (s.rups[u.id] || 0) * 9, u.max * 9);
    for (const u of ASC_UPS) add(`aup:${u.id}`, "upgrades", `Ascension upgrade: ${u.name}`, (s.aups[u.id] || 0) * 18, u.max * 18);

    // Popup events, Fragments and combo.
    add("ev:caught", "events", "Popups caught", ladder(s.evs.caught, POP_CAUGHT), ladderMax(POP_CAUGHT));
    add("ev:golden", "events", "Golden shards", ladder(s.evs.golden, GOLDEN), ladderMax(GOLDEN));
    add("ev:perfect", "events", "Perfect quick time events", ladder(s.evs.perfect, PERFECT), ladderMax(PERFECT));
    add("ev:curses", "events", "Curses survived", ladder(s.evs.curses, CURSES), ladderMax(CURSES));
    add("ev:frag", "events", "Fracture Fragments", Math.min(100, s.frag) * 6, 600);
    add("ev:combo", "events", "Best combo", ladder(s.bestCombo, COMBO), ladderMax(COMBO));

    // Progress that is not tied to one system.
    const rb = Math.max(s.rebirths, s.btn.rb);
    add("rebirths", "progress", "Rebirths", Math.min(150, rb) * 5, 750);
    add("ascensions", "progress", "Ascensions", s.asc * 400, 0);
    add("wealth", "progress", "Lifetime shards", decadePay(s.total), decadePay(1e45));
    add("hours", "progress", "Time played", ladder(s.playTime / 3600, HOURS), ladderMax(HOURS));
    add("eggs", "progress", "Eggs hatched", ladder(s.hatched, EGGS), ladderMax(EGGS));
    return out;
}

export const fxpTotal = (s: State) => Object.values(s.fxp).reduce((a, b) => a + b, 0);
export const levelOf = (xp: number) => Math.floor(xp / FXP_PER_LEVEL);

// ---- Rewards ----

export interface LevelReward {
    tokens: number;
    eggs: number;
    ap: number;
    unlocks: string[]; // names of badge symbols / prefixes that unlock at exactly this level
}

export function rewardFor(level: number): LevelReward {
    return {
        tokens: level % 10 === 0 ? 2 + (level % 100 === 0 ? 8 : 0) : 0,
        eggs: level % 20 === 0 ? 1 : 0,
        ap: (level % 50 === 0 ? 1 : 0) + (level % 100 === 0 ? 3 : 0),
        unlocks: [...BADGE_SYMBOLS.filter((b) => b.at === level && level > 0).map((b) => `${b.name} badge`), ...PREFIXES.filter((p) => p.need?.stat === "level" && p.need.n === level).map((p) => `${p.name} prefix`)],
    };
}

export const hasReward = (r: LevelReward) => r.tokens > 0 || r.eggs > 0 || r.ap > 0 || r.unlocks.length > 0;

export const rewardText = (r: LevelReward) =>
    [r.tokens && `${r.tokens} rebirth tokens`, r.eggs && `${r.eggs} Wooden Egg`, r.ap && `${r.ap} ascension point${r.ap > 1 ? "s" : ""}`, ...r.unlocks].filter(Boolean).join(", ");

// ---- Claiming ----

export interface FxpGain {
    label: string;
    xp: number;
    at: number;
}

// Recent gains for the little "+N Fracture EXP" pops (not saved).
const recent: FxpGain[] = [];
export const recentGains = (now: number, withinMs = 6000) => recent.filter((g) => now - g.at < withinMs);

/**
 * Claim everything currently earned, raise the level and pay level rewards.
 * `silent` is for the first pass on load, so an existing save does not flood the screen.
 * Returns the levels that were just reached.
 */
export function updateFxp(s: State, silent = false): number[] {
    const now = Date.now();
    for (const src of fxpSources(s)) {
        const cur = Math.floor(src.xp);
        const prev = s.fxp[src.id] || 0;
        if (cur > prev) {
            s.fxp[src.id] = cur;
            if (!silent) {
                recent.push({ label: src.label, xp: cur - prev, at: now });
                if (recent.length > 12) recent.shift();
            }
        }
    }
    s.lvl = levelOf(fxpTotal(s));
    const ups: number[] = [];
    while (s.lvClaim < s.lvl) {
        s.lvClaim += 1;
        const r = rewardFor(s.lvClaim);
        s.tokens += r.tokens;
        s.freeEggs += r.eggs;
        s.ap += r.ap;
        ups.push(s.lvClaim);
    }
    return ups;
}

// ---- The badge ----

/** SkyBlock-style colors: one per 40 levels. */
const BANDS = ["#aaaaaa", "#ffffff", "#ffff55", "#55ff55", "#00aa00", "#55ffff", "#00aaaa", "#5555ff", "#ff55ff", "#aa00aa", "#ffaa00"];
export const levelColor = (level: number) => BANDS[Math.min(BANDS.length - 1, Math.floor(level / 40))];

export interface BadgeSymbol {
    id: string;
    name: string;
    symbol: McSymbolName | "";
    at: number; // level needed
}

export const BADGE_SYMBOLS: BadgeSymbol[] = [
    { id: "none", name: "Plain", symbol: "", at: 0 },
    { id: "spark", name: "Spark", symbol: "speed", at: 5 },
    { id: "fist", name: "Fist", symbol: "strength", at: 15 },
    { id: "clover", name: "Clover", symbol: "fortune", at: 25 },
    { id: "steam", name: "Steam", symbol: "heat", at: 40 },
    { id: "heart", name: "Heart", symbol: "regen", at: 60 },
    { id: "moon", name: "Moon", symbol: "night", at: 80 },
    { id: "bloom", name: "Bloom", symbol: "flower", at: 100 },
    { id: "gem", name: "Gem", symbol: "pristine", at: 130 },
    { id: "comet", name: "Comet", symbol: "comet", at: 160 },
    { id: "blades", name: "Blades", symbol: "attackSpeed", at: 200 },
    { id: "star", name: "Star", symbol: "magicFind", at: 250 },
    { id: "portal", name: "Portal", symbol: "portal", at: 300 },
    { id: "skull", name: "Skull", symbol: "critDamage", at: 350 },
    { id: "banner", name: "Banner", symbol: "flag", at: 400 },
];

export type PrefixStat = "level" | "mining" | "farming" | "combat" | "fishing" | "rebirths" | "asc" | "pets" | "visited" | "islands" | "total" | "bestCombo" | "frag" | "perfect";

export interface Prefix {
    id: string;
    name: string;
    color: string;
    need?: { stat: PrefixStat; n: number; label: string };
}

export const PREFIXES: Prefix[] = [
    { id: "none", name: "None", color: "#ffffff" },
    { id: "newcomer", name: "Newcomer", color: "#aaaaaa", need: { stat: "level", n: 1, label: "Reach level 1" } },
    { id: "adventurer", name: "Adventurer", color: "#55ff55", need: { stat: "level", n: 10, label: "Reach level 10" } },
    { id: "veteran", name: "Veteran", color: "#55ffff", need: { stat: "level", n: 40, label: "Reach level 40" } },
    { id: "miner", name: "Miner", color: "#ffaa00", need: { stat: "mining", n: 20, label: "Mining level 20" } },
    { id: "farmer", name: "Farmer", color: "#55ff55", need: { stat: "farming", n: 20, label: "Farming level 20" } },
    { id: "angler", name: "Angler", color: "#55ffff", need: { stat: "fishing", n: 20, label: "Fishing level 20" } },
    { id: "slayer", name: "Slayer", color: "#ff5555", need: { stat: "combat", n: 20, label: "Combat level 20" } },
    { id: "explorer", name: "Explorer", color: "#00aaaa", need: { stat: "visited", n: 10, label: "Visit 10 islands" } },
    { id: "globetrotter", name: "Globetrotter", color: "#5555ff", need: { stat: "islands", n: 21, label: "Unlock every island" } },
    { id: "tycoon", name: "Tycoon", color: "#ffff55", need: { stat: "total", n: 1e15, label: "1 quadrillion lifetime shards" } },
    { id: "mogul", name: "Mogul", color: "#ffaa00", need: { stat: "total", n: 1e30, label: "1e30 lifetime shards" } },
    { id: "reborn", name: "Reborn", color: "#ff55ff", need: { stat: "rebirths", n: 10, label: "Reach rebirth 10" } },
    { id: "ascended", name: "Ascended", color: "#ffd23a", need: { stat: "asc", n: 1, label: "Ascend once" } },
    { id: "transcendent", name: "Transcendent", color: "#ffffff", need: { stat: "asc", n: 5, label: "Ascend 5 times" } },
    { id: "keeper", name: "Keeper", color: "#00aaaa", need: { stat: "pets", n: 12, label: "Own 12 pets" } },
    { id: "lucky", name: "Lucky", color: "#ffaa00", need: { stat: "frag", n: 5, label: "Find 5 Fracture Fragments" } },
    { id: "speedrunner", name: "Speedrunner", color: "#ff5555", need: { stat: "bestCombo", n: 10, label: "Reach a combo of x10" } },
    { id: "sharp", name: "Sharpshooter", color: "#5555ff", need: { stat: "perfect", n: 25, label: "25 perfect quick time events" } },
    { id: "legend", name: "Legend", color: "#ff55ff", need: { stat: "level", n: 200, label: "Reach level 200" } },
    { id: "fractured", name: "Fractured", color: "#aa00aa", need: { stat: "level", n: 300, label: "Reach level 300" } },
    { id: "mythic", name: "Mythic", color: "rainbow", need: { stat: "level", n: 400, label: "Reach level 400" } },
];

export function prefixStat(s: State, stat: PrefixStat): number {
    switch (stat) {
        case "level": return s.lvl;
        case "mining": return skillLevel(s.mining);
        case "farming": return skillLevel(s.farming);
        case "combat": return skillLevel(s.combat);
        case "fishing": return skillLevel(s.fishing);
        case "rebirths": return Math.max(s.rebirths, s.btn.rb);
        case "asc": return s.asc;
        case "pets": return Object.keys(s.pets).length;
        case "visited": return s.visited.length;
        case "islands": return ISLANDS.filter((i) => islandOpen(s, i)).length;
        case "total": return s.total;
        case "bestCombo": return s.bestCombo;
        case "frag": return s.frag;
        case "perfect": return s.evs.perfect;
    }
}

export const prefixOpen = (s: State, p: Prefix) => !p.need || prefixStat(s, p.need.stat) >= p.need.n;
export const symbolOpen = (s: State, b: BadgeSymbol) => s.lvl >= b.at;
export const prefixOf = (s: State) => PREFIXES.find((p) => p.id === s.pfx && prefixOpen(s, p)) ?? PREFIXES[0];
export const symbolOf = (s: State) => BADGE_SYMBOLS.find((b) => b.id === s.bsym && symbolOpen(s, b)) ?? BADGE_SYMBOLS[0];
export { LEVEL_BONUS };

/** Toast text for one or more levels reached at once. */
export function levelUpText(level: number, ups: number[]): string {
    const sum: LevelReward = { tokens: 0, eggs: 0, ap: 0, unlocks: [] };
    for (const l of ups) {
        const r = rewardFor(l);
        sum.tokens += r.tokens;
        sum.eggs += r.eggs;
        sum.ap += r.ap;
        sum.unlocks.push(...r.unlocks);
    }
    const t = rewardText(sum);
    return `Fractured Level ${level}!${t ? ` Rewards: ${t}` : ""}`;
}

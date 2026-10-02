import { fmtPct } from "./format";
import type { EStat } from "./enchant";
import type { McSymbolName } from "@/components/mc-symbol";
import { PETS, petLevel } from "./pets-data";
import type { MineState } from "./mine";
import type { FarmState } from "./farm";
import type { RunLog } from "./runs";
import type { InvState } from "./inv-core";
import type { BtnPrefs } from "./button";
import { ISLANDS } from "./islands";
import type { ActiveBuff, EventStats } from "./events";
import type { EnchState } from "./enchant";

// HOW TO EXPAND (everything below is data-driven):
//  - New minion: add a row to MINIONS (order = shop order; saves map by index,
//    so only ever append).
//  - New upgrade: add a row to UPGRADES (kind decides which stat it feeds).
//  - New skill: add to SKILLS, add its xp field to State + newState, feed xp in
//    engine.advance / the click handler, and apply its bonus in engine.derive.
//    Milestone rewards for it go in skills.ts.
//  - New island / trophy / rebirth upgrade: add a row to ISLANDS / ACHIEVEMENTS
//    / REBIRTH_UPS.
//  - New pet / egg / ascension upgrade: add a row to PETS / EGGS / ASC_UPS.
//  - New tab: add a file under components/games/fractured-idle/ and register it
//    in TABS in index.tsx.
//
// Content tables for Fractured Idle. Edit the names, colors and numbers here
// and the game picks them up. Pacing was tuned with scripts/fi-sim.ts (a
// greedy-player simulation): re-run it after touching costs or multipliers.
// Rough targets for an optimal player: first rebirth ~15 min, Spider's Den
// ~3h, The End ~13h, Fractured Islands a few days, first ascension ~a day.

export interface State {
    v: 1;
    shards: number;
    total: number; // lifetime shards, survives rebirth (unlocks islands)
    clicks: number;
    rebirths: number;
    tokens: number; // rebirth tokens, spent on permanent upgrades
    minions: number[];
    mcol: number[]; // per-minion collection (minion-seconds worked), reset on rebirth
    ups: Record<string, number>;
    rups: Record<string, number>;
    mining: number; // skill xp
    farming: number;
    combat: number;
    fishing: number;
    foraging: number; // xp from popup events
    enchanting: number; // xp from rolling enchants
    skm: Record<string, number>; // highest level whose milestone rewards were paid, per skill
    enc: EnchState; // enchanting: dust, worn enchants, codex (see enchant.ts)
    crits: number;
    bobbers: number; // treasure bobbers caught
    tro: Record<string, number>; // trophy id -> tiers unlocked
    peak: { minions: number; types: number };
    playTime: number; // seconds
    savedAt: number;
    island: string;
    visited: string[]; // island ids you have travelled to (+0.5% all shards each)
    isec: Record<string, number>; // seconds spent on each island (mastery)
    sci: boolean;
    fx: boolean;
    buy: number; // 1 | 10 | 100 | -1 (max)
    orbit: boolean; // orbiting minions around the button
    toasts: boolean; // popup messages
    // Ascension: the prestige layer above rebirth.
    asc: number; // ascensions taken since the last Transcendence (this is what multiplies shards and prices rebirths)
    ascEver: number; // ascensions ever taken: never resets, so trophies, looks and Fracture EXP never go backwards
    ap: number; // unspent gems (named ascension points in the code)
    aups: Record<string, number>;
    auto: AutoPrefs; // which auto-buyers are switched on (they must be unlocked with gems first)
    // Transcendence: the layer above ascension (trans.ts). It keeps every gem upgrade and auto-buyer.
    trans: number; // Transcendences taken
    ess: number; // unspent Essence
    essTotal: number; // Essence ever earned (each point is +3% all shards)
    eups: Record<string, number>; // Essence upgrade levels
    vow: string[]; // vows being kept this run
    vowNext: string[]; // vows chosen for the next run
    pbest: { rb: number }; // best rebirth count ever reached: rebirth milestone perks never reset
    runs: RunLog; // history of your resets (runs.ts): how long each run took and what it paid
    autoT: Record<string, number>; // seconds since each auto-buyer last fired; transient
    // Pets: survive rebirth and ascension.
    pets: Record<string, { xp: number; n: number }>; // n = copies found
    equip: string[]; // equipped pet ids, one per slot used
    hatched: number;
    freeEggs: number; // wooden eggs from treasure bobbers
    peakInc: number; // best shards/sec ever, prices eggs
    btn: BtnPrefs; // click button look (unlocks live in button.ts)
    combo: number; // live combo multiplier from holding; transient, never saved (see combo.ts)
    bestCombo: number; // highest combo multiplier reached
    buffs: ActiveBuff[]; // timed boons and curses from popup events (see events.ts)
    popups: boolean; // popup events on / off
    fxp: Record<string, number>; // Fracture EXP claimed per source (see fxp.ts)
    lvl: number; // Fractured Level
    lvClaim: number; // highest level whose milestone rewards were paid
    pfx: string; // equipped level prefix
    bsym: string; // equipped level badge symbol
    lch: number; // Fractured Level chapters claimed (see chapters.ts)
    chap: string[]; // claimed saga chapters ("<saga>:<n>") and finales ("<saga>:fin"), see sagas.ts
    frag: number; // Fracture Fragments: permanent +0.2% all shards each
    evs: EventStats; // popup event counters
    mine: MineState; // Mining: ore, pickaxe, upgrades, drills, collections (see mine.ts)
    farm: FarmState; // Farming: plots, crops, hoe, farmhands, cookhouse, collections (see farm.ts)
    inv: InvState; // Inventory and Shop: item stock, layout, boosters, shop upgrades (see inv-core.ts)
}

export interface MinionDef {
    id: string;
    name: string;
    color: string;
    symbol: McSymbolName;
    cost: number;
    cps: number;
}

export const MINION_GROWTH = 1.2;
export const MILESTONES = [25, 50, 100, 200, 400];

/** Every Fractured Level adds this much to all shards. */
export const LEVEL_BONUS = 0.0015;

export const SKILL_CAP = 60;
const XP_BASE = 20;
const XP_GROWTH = 1.45;
// Foraging and Enchanting level on gentler curves: their xp comes in small pieces.
const CURVES: Partial<Record<string, { base: number; growth: number }>> = {
    foraging: { base: 12, growth: 1.22 },
    enchanting: { base: 12, growth: 1.22 },
};
const curve = (id?: string) => (id && CURVES[id]) || { base: XP_BASE, growth: XP_GROWTH };
export const skillLevel = (xp: number, id?: SkillId) => {
    const { base, growth } = curve(id);
    return Math.min(SKILL_CAP, Math.floor(Math.log((xp * (growth - 1)) / base + 1) / Math.log(growth)));
};
export const skillXpFor = (level: number, id?: SkillId) => {
    const { base, growth } = curve(id);
    return (base * (Math.pow(growth, level) - 1)) / (growth - 1);
};

// Each tier's price is multiplied by MINION_STEEP^index on top of the table,
// so price outpaces output as you climb and the shop can't be bought out the
// moment your multipliers grow.
export const MINION_STEEP = 3;

const MINION_ROWS: MinionDef[] = [
    { id: "cobble", name: "Cobblestone Minion", color: "var(--mc-gray, #aaaaaa)", symbol: "defense", cost: 15, cps: 0.4 },
    { id: "wheat", name: "Wheat Minion", color: "var(--mc-yellow)", symbol: "fortune", cost: 120, cps: 2.4 },
    { id: "oak", name: "Oak Minion", color: "var(--mc-dark-green)", symbol: "regen", cost: 1.1e3, cps: 16 },
    { id: "coal", name: "Coal Minion", color: "var(--mc-blue)", symbol: "heat", cost: 1.3e4, cps: 94 },
    { id: "iron", name: "Iron Minion", color: "var(--mc-aqua)", symbol: "trueDefense", cost: 1.4e5, cps: 520 },
    { id: "gold", name: "Gold Minion", color: "var(--mc-gold)", symbol: "magicFind", cost: 2e6, cps: 2800 },
    { id: "diamond", name: "Diamond Minion", color: "var(--mc-aqua)", symbol: "pristine", cost: 3.3e7, cps: 15600 },
    { id: "lapis", name: "Lapis Minion", color: "var(--mc-blue)", symbol: "intelligence", cost: 5.1e8, cps: 88000 },
    { id: "emerald", name: "Emerald Minion", color: "var(--mc-green)", symbol: "petLuck", cost: 7.5e9, cps: 520000 },
    { id: "obsidian", name: "Obsidian Minion", color: "var(--mc-dark-purple)", symbol: "night", cost: 1e11, cps: 3.2e6 },
    { id: "glowstone", name: "Glowstone Minion", color: "var(--mc-yellow)", symbol: "speed", cost: 1.6e12, cps: 2e7 },
    { id: "fractured", name: "Fractured Minion", color: "var(--mc-light-purple)", symbol: "portal", cost: 3e13, cps: 1.4e8 },
    { id: "redstone", name: "Redstone Minion", color: "var(--mc-red)", symbol: "critChance", cost: 6e14, cps: 2.5e9 },
    { id: "quartz", name: "Quartz Minion", color: "#ffffff", symbol: "defense", cost: 1.2e16, cps: 4.5e10 },
    { id: "ice", name: "Ice Minion", color: "var(--mc-aqua)", symbol: "night", cost: 2.4e17, cps: 8e11 },
    { id: "prismarine", name: "Prismarine Minion", color: "var(--mc-dark-aqua)", symbol: "fishing", cost: 5e18, cps: 1.4e13 },
];

export const MINIONS: MinionDef[] = MINION_ROWS.map((m, i) => ({ ...m, cost: m.cost * Math.pow(MINION_STEEP, i) }));

// ---- Minion collections ----
// Every minion works a collection: it fills by (minions owned x seconds), is
// wiped on rebirth, and each tier pays a reward specific to that minion.

export const COL_AT = [200, 1500, 9000, 45000, 200000, 800000];

export const COL_ITEM = [
    "Cobblestone", "Wheat", "Oak Logs", "Coal", "Iron Ingots", "Gold Ingots", "Diamonds", "Lapis Lazuli",
    "Emeralds", "Obsidian", "Glowstone Dust", "Fractured Shards", "Redstone", "Nether Quartz", "Ice", "Prismarine",
];

export type ColKind = "own" | "cost" | "all" | "click" | "crit" | "critDmg" | "offline" | "next" | "per10" | "col" | "tokens";

export interface ColReward {
    name: string;
    kind: ColKind;
    value: number;
}

const R = (name: string, kind: ColKind, value: number): ColReward => ({ name, kind, value });

export const MINION_COL: ColReward[][] = [
    [R("Loose Gravel", "own", 0.1), R("Stonecutter", "cost", 0.05), R("Cobble Generator", "per10", 0.02), R("Bedrock Foundation", "all", 0.01), R("Rockslide", "click", 0.05), R("Mountain Mover", "own", 0.5)],
    [R("Seed Satchel", "own", 0.1), R("Scarecrow", "col", 0.25), R("Hay Bale Stack", "next", 0.15), R("Golden Harvest", "all", 0.01), R("Bread Winner", "offline", 0.05), R("Sea of Grain", "own", 0.5)],
    [R("Sturdy Saplings", "own", 0.1), R("Lumber Axe", "cost", 0.05), R("Treehouse", "per10", 0.02), R("Forest Blessing", "click", 0.05), R("Old Growth", "next", 0.2), R("World Tree", "all", 0.02)],
    [R("Coal Dust", "own", 0.1), R("Kindling", "col", 0.25), R("Blast Furnace", "next", 0.2), R("Deep Seam", "critDmg", 0.05), R("Diamond Pressure", "own", 0.25), R("Eternal Ember", "all", 0.02)],
    [R("Ore Cart", "own", 0.1), R("Smelter", "cost", 0.05), R("Iron Golem", "crit", 0.01), R("Reinforced Rails", "per10", 0.02), R("Steel Mill", "next", 0.2), R("Iron Will", "click", 0.1)],
    [R("Gilded Pans", "own", 0.1), R("Rich Vein", "col", 0.25), R("Midas Touch", "all", 0.01), R("Gold Rush", "click", 0.08), R("Bullion Vault", "tokens", 0.05), R("Golden Age", "own", 0.5)],
    [R("Sharp Picks", "own", 0.1), R("Gem Cutter", "cost", 0.05), R("Pristine Cut", "crit", 0.01), R("Diamond Core", "next", 0.2), R("Refracted Light", "critDmg", 0.1), R("Crown Jewel", "all", 0.02)],
    [R("Blue Dust", "own", 0.1), R("Enchant Table", "col", 0.25), R("Scholar's Tithe", "tokens", 0.05), R("Sapphire Runes", "per10", 0.02), R("Deep Wisdom", "click", 0.08), R("Grand Library", "own", 0.5)],
    [R("Trade Routes", "own", 0.1), R("Villager Haggle", "cost", 0.08), R("Emerald Ledger", "offline", 0.05), R("Hero of the Village", "all", 0.02), R("Merchant Guild", "next", 0.25), R("Green Fortune", "own", 0.6)],
    [R("Hardened Edge", "own", 0.1), R("Forge Heat", "cost", 0.05), R("Void Gaze", "crit", 0.01), R("Nether Portal", "next", 0.25), R("Crying Stone", "critDmg", 0.1), R("Obsidian Throne", "all", 0.03)],
    [R("Bright Sparks", "own", 0.1), R("Lantern Line", "col", 0.3), R("Radiant Dust", "offline", 0.05), R("Photon Feed", "next", 0.25), R("Nightless", "per10", 0.03), R("Beacon", "all", 0.03)],
    [R("Cracked Shard", "own", 0.1), R("Rift Siphon", "cost", 0.08), R("Shard Storm", "click", 0.1), R("Fracture Harmonics", "next", 0.25), R("Portal Network", "tokens", 0.08), R("Shattered Reality", "all", 0.04)],
    [R("Overclocked Dust", "own", 0.1), R("Comparator", "col", 0.3), R("Repeater Chain", "per10", 0.03), R("Piston Rush", "click", 0.1), R("Redstone Brain", "next", 0.3), R("Perpetual Motion", "own", 0.75)],
    [R("Polished Blocks", "own", 0.1), R("Chisel Set", "cost", 0.08), R("Pure Crystal", "crit", 0.015), R("Quartz Pillars", "next", 0.3), R("Resonance", "critDmg", 0.15), R("Crystal Cathedral", "all", 0.04)],
    [R("Frost Bite", "own", 0.1), R("Permafrost", "offline", 0.08), R("Glacial Drift", "per10", 0.03), R("Cold Storage", "col", 0.3), R("Whiteout", "click", 0.12), R("Ice Age", "own", 0.8)],
    [R("Sea Lantern", "own", 0.1), R("Tidal Pull", "cost", 0.1), R("Guardian's Gift", "crit", 0.015), R("Deep Currents", "per10", 0.04), R("Ocean Monument", "tokens", 0.1), R("Heart of the Sea", "all", 0.05)],
];

/** How many collection tiers `items` has reached. */
export const colTier = (items: number) => {
    let n = 0;
    while (n < COL_AT.length && items >= COL_AT[n]) n++;
    return n;
};

const pctText = (v: number) => fmtPct(v, 1);

export function colRewardText(r: ColReward, minion: string, next?: string): string {
    const m = minion.replace(" Minion", "");
    const p = pctText(r.value);
    switch (r.kind) {
        case "own": return `+${p} ${m} output`;
        case "cost": return `-${p} ${m} price`;
        case "all": return `+${p} all shards`;
        case "click": return `+${p} click power`;
        case "crit": return `+${p} crit chance`;
        case "critDmg": return `+${p} crit damage`;
        case "offline": return `+${p} offline efficiency`;
        case "next": return next ? `+${p} ${next.replace(" Minion", "")} output` : "Boosts the next minion";
        case "per10": return `+${p} ${m} output per 10 owned`;
        case "col": return `+${p} ${m} collection speed`;
        case "tokens": return `+${p} rebirth tokens`;
    }
}

export type UpKind = "click" | "minion" | "all" | "auto" | "critChance" | "critDmg" | "synergy" | "mown" | "comboMax" | "comboGain" | "comboLuck" | "evRate" | "evBobber" | "evLoot" | "evGolden" | "evLife" | "evPower" | "evCurse" | "qteSize" | "qteTime" | "qteReward" | "fx";

export interface UpgradeDef {
    id: string;
    name: string;
    desc: string;
    kind: UpKind;
    value: number; // multiplier for click/minion/all/mown, per-level amount for the rest
    cost: number;
    growth: number;
    max: number; // 1 = one-time
    symbol: McSymbolName;
    color: string;
    /** Minion-specific upgrades: which minion, and how many of it you must own. */
    minion?: number;
    req?: number;
    extra?: { col?: number; disc?: number };
    /** kind "fx": the stat it feeds (per level: `value`), read by upFx in upfx.ts. */
    stat?: EStat;
}

const once = (
    id: string,
    name: string,
    kind: "click" | "minion" | "all",
    value: number,
    cost: number,
    symbol: McSymbolName,
    color: string,
): UpgradeDef => ({
    id,
    name,
    kind,
    value,
    cost,
    growth: 1,
    max: 1,
    symbol,
    color,
    desc:
        kind === "click"
            ? `Click power x${value}`
            : kind === "minion"
              ? `Minion output x${value}`
              : `All shards x${value}`,
});

const BASE_UPGRADES: UpgradeDef[] = [
    // Repeatable
    { id: "auto", name: "Auto-Clicker", desc: "+1 automatic click per second", kind: "auto", value: 1, cost: 250, growth: 1.9, max: 25, symbol: "attackSpeed", color: "var(--mc-red)" },
    { id: "critc", name: "Critical Eye", desc: "+2% crit chance", kind: "critChance", value: 0.02, cost: 1e3, growth: 1.8, max: 25, symbol: "critChance", color: "var(--mc-blue)" },
    { id: "critd", name: "Crushing Blows", desc: "+25% crit damage", kind: "critDmg", value: 0.25, cost: 2e3, growth: 1.7, max: 30, symbol: "critDamage", color: "var(--mc-blue)" },
    { id: "syn", name: "Pocket Minion", desc: "Each click also gives +1% of your shards/sec", kind: "synergy", value: 0.01, cost: 5e3, growth: 2.2, max: 20, symbol: "intelligence", color: "var(--mc-aqua)" },
    { id: "combo", name: "Momentum", desc: "+0.25 max combo multiplier (hold the button)", kind: "comboMax", value: 0.25, cost: 2e3, growth: 1.85, max: 20, symbol: "speed", color: "var(--mc-yellow)" },
    { id: "flow", name: "Flow State", desc: "+8% combo build speed", kind: "comboGain", value: 0.08, cost: 8e3, growth: 1.9, max: 15, symbol: "attackSpeed", color: "var(--mc-gold)" },
    { id: "rod", name: "Lightning Rod", desc: "+0.4% surge chance per second of holding", kind: "comboLuck", value: 0.004, cost: 5e4, growth: 2.1, max: 10, symbol: "magicFind", color: "var(--mc-aqua)" },
    // Popup events: bobbers, golden shards and quick time events (events.ts).
    { id: "beacon", name: "Beacon", desc: "+8% more popups of every kind", kind: "evRate", value: 0.08, cost: 1.5e4, growth: 2.1, max: 15, symbol: "flag", color: "var(--mc-yellow)" },
    { id: "sonar", name: "Treasure Sonar", desc: "+12% more treasure bobbers", kind: "evBobber", value: 0.12, cost: 2e4, growth: 2.1, max: 15, symbol: "fishing", color: "var(--mc-aqua)" },
    { id: "hook", name: "Deep Hook", desc: "+15% treasure bobber loot", kind: "evLoot", value: 0.15, cost: 4e4, growth: 2.2, max: 15, symbol: "fishing", color: "var(--mc-dark-aqua)" },
    { id: "eyes", name: "Gilded Eyes", desc: "+8% more golden shards", kind: "evGolden", value: 0.08, cost: 8e4, growth: 2.2, max: 15, symbol: "magicFind", color: "var(--mc-gold)" },
    { id: "magnet", name: "Shard Magnet", desc: "Popups stay +12% longer", kind: "evLife", value: 0.12, cost: 6e4, growth: 2.1, max: 10, symbol: "arrow", color: "var(--mc-green)" },
    { id: "luck", name: "Overflowing Luck", desc: "+8% boon strength and duration", kind: "evPower", value: 0.08, cost: 3e5, growth: 2.4, max: 15, symbol: "fortune", color: "var(--mc-light-purple)" },
    { id: "lens", name: "Purifying Lens", desc: "-8% cracked shards and weaker curses", kind: "evCurse", value: 0.08, cost: 2e5, growth: 2.3, max: 9, symbol: "check", color: "var(--mc-red)" },
    { id: "hands", name: "Steady Hands", desc: "+8% bigger sweet spots in quick time events", kind: "qteSize", value: 0.08, cost: 1e5, growth: 2.2, max: 10, symbol: "critChance", color: "var(--mc-blue)" },
    { id: "fingers", name: "Quick Fingers", desc: "+0.4s more time in quick time events", kind: "qteTime", value: 0.4, cost: 1.2e5, growth: 2.2, max: 10, symbol: "attackSpeed", color: "var(--mc-red)" },
    { id: "show", name: "Showman", desc: "+10% quick time event rewards", kind: "qteReward", value: 0.1, cost: 5e5, growth: 2.3, max: 15, symbol: "pristine", color: "var(--mc-gold)" },
    { id: "gold", name: "Golden Touch", desc: "+5% to all shards", kind: "all", value: 1.05, cost: 1e6, growth: 3.5, max: 20, symbol: "magicFind", color: "var(--mc-gold)" },
    { id: "overclock", name: "Minion Overclock", desc: "+10% minion output", kind: "minion", value: 1.1, cost: 1e5, growth: 3, max: 20, symbol: "speed", color: "var(--mc-yellow)" },
    // Pickaxes (click)
    once("wood", "Wooden Pickaxe", "click", 2, 100, "strength", "var(--mc-gold)"),
    once("stone", "Stone Pickaxe", "click", 2, 2.5e3, "strength", "var(--mc-gold)"),
    once("iron", "Iron Pickaxe", "click", 2, 1e5, "strength", "var(--mc-aqua)"),
    once("goldp", "Golden Pickaxe", "click", 3, 5e6, "strength", "var(--mc-yellow)"),
    once("diap", "Diamond Pickaxe", "click", 3, 2.5e8, "strength", "var(--mc-aqua)"),
    once("nethp", "Netherite Pickaxe", "click", 4, 1e11, "strength", "var(--mc-dark-purple)"),
    once("fracp", "Fractured Pickaxe", "click", 5, 5e14, "strength", "var(--mc-light-purple)"),
    once("drill1", "Mining Drill", "click", 6, 5e16, "forge", "var(--mc-gold)"),
    once("drill2", "Titanium Drill", "click", 8, 2e18, "forge", "var(--mc-aqua)"),
    once("drill3", "Gemstone Drill", "click", 10, 1e20, "forge", "var(--mc-green)"),
    once("drill4", "Divan's Drill", "click", 15, 5e22, "forge", "var(--mc-light-purple)"),
    // Fuel (minions)
    once("fuel1", "Coal Fuel", "minion", 2, 1.5e3, "heat", "var(--mc-blue)"),
    once("fuel2", "Enchanted Coal", "minion", 2, 5e4, "heat", "var(--mc-blue)"),
    once("fuel3", "Enchanted Charcoal", "minion", 2, 2.5e6, "heat", "var(--mc-gold)"),
    once("fuel4", "Enchanted Lava Bucket", "minion", 2, 1e8, "heat", "var(--mc-red)"),
    once("fuel5", "Magma Bucket", "minion", 2, 5e9, "heat", "var(--mc-red)"),
    once("fuel6", "Plasma Bucket", "minion", 3, 2.5e11, "heat", "var(--mc-light-purple)"),
    // Talismans (everything)
    once("tal1", "Zombie Talisman", "all", 1.5, 1e5, "wisdom", "var(--mc-green)"),
    once("tal2", "Farming Talisman", "all", 1.5, 1e7, "wisdom", "var(--mc-green)"),
    once("tal3", "Speed Talisman", "all", 1.5, 1e9, "wisdom", "var(--mc-aqua)"),
    once("tal4", "Feather Talisman", "all", 1.5, 1e11, "wisdom", "var(--mc-yellow)"),
    once("tal5", "Bat Talisman", "all", 1.5, 1e13, "wisdom", "var(--mc-dark-purple)"),
    once("tal0", "Village Talisman", "all", 1.25, 2e4, "wisdom", "var(--mc-yellow)"),
    once("tal6", "Wolf Talisman", "all", 1.5, 5e15, "wisdom", "#ffffff"),
    once("tal7", "Hunter Ring", "all", 1.75, 2e17, "wisdom", "var(--mc-red)"),
    once("tal8", "Ender Artifact", "all", 2, 1e19, "wisdom", "var(--mc-light-purple)"),
    once("tal9", "Fractured Relic", "all", 3, 1e21, "wisdom", "var(--mc-blue)"),
    // The late game: the old lists stopped at 1e21, these keep the climb going.
    once("fuel7", "Fractured Fuel", "minion", 3, 5e13, "heat", "var(--mc-light-purple)"),
    once("fuel8", "Starfire Cell", "minion", 4, 5e16, "heat", "var(--mc-aqua)"),
    once("drill5", "Fractured Drill", "click", 25, 1e25, "forge", "var(--mc-light-purple)"),
    once("tal10", "Saga Charm", "all", 2.5, 5e23, "wisdom", "var(--mc-gold)"),
    once("tal11", "Mythic Idol", "all", 4, 1e27, "wisdom", "var(--mc-red)"),
];


// New systems: study and pets, the Mine, the Forge, the Farm and the Market. Each one feeds a stat through upFx (upfx.ts).
// Prices are spread over the whole game, so there is always something worth saving for, and all of them restart with a rebirth.
const fx = (id: string, name: string, desc: string, stat: EStat, value: number, cost: number, growth: number, max: number, symbol: McSymbolName, color: string): UpgradeDef =>
    ({ id, name, desc, kind: "fx", stat, value, cost, growth, max, symbol, color });
const FX_UPGRADES: UpgradeDef[] = [
    fx("study", "Study Habit", "+4% skill XP", "xp", 0.04, 6e4, 2.3, 20, "wisdom", "var(--mc-aqua)"),
    fx("treats", "Pet Treats", "+6% pet experience", "petXp", 0.06, 2.5e5, 2.35, 15, "petLuck", "var(--mc-dark-aqua)"),
    fx("motes", "Dust Collector", "+5% arcane dust", "dust", 0.05, 5e5, 2.4, 15, "intelligence", "var(--mc-light-purple)"),
    fx("charm", "Four-Leaf Charm", "+3% enchant luck", "luck", 0.03, 3e6, 2.6, 15, "fortune", "var(--mc-green)"),
    fx("lantern", "Night Lantern", "+4% offline earnings", "offline", 0.04, 8e6, 2.6, 15, "night", "var(--mc-blue)"),
    fx("tithe", "Token Tithe", "+2% rebirth tokens", "tokens", 0.02, 5e9, 3, 10, "portal", "var(--mc-yellow)"),
    fx("detect", "Ore Detector", "+4% ore from mining", "ore", 0.04, 3e5, 2.3, 25, "pick", "var(--mc-gold)"),
    fx("stoke", "Stoked Furnaces", "+4% forge speed", "forge", 0.04, 2e6, 2.4, 20, "heat", "var(--mc-red)"),
    fx("spindle", "Diamond Spindle", "+4% drill swing speed", "drill", 0.04, 2e7, 2.5, 20, "forge", "var(--mc-aqua)"),
    fx("compost", "Compost Heaps", "+4% crops per harvest", "crop", 0.04, 3e5, 2.3, 25, "flower", "var(--mc-green)"),
    fx("lamps", "Grow Lamps", "+4% crop growth speed", "grow", 0.04, 1.5e6, 2.4, 20, "day", "var(--mc-yellow)"),
    fx("hearth", "Stone Hearths", "+4% cooking speed", "cook", 0.04, 6e6, 2.4, 20, "heat", "var(--mc-gold)"),
    fx("seedvault", "Golden Seed Vault", "+0.4% golden crop chance", "goldCrop", 0.004, 4e7, 2.8, 20, "magicFind", "var(--mc-gold)"),
    fx("stall", "Roadside Stall", "+3% crop sale price", "sale", 0.03, 1.5e8, 2.7, 20, "scales", "var(--mc-green)"),
];

// Three upgrades per minion. Price is a multiple of that minion's base price
// and each needs a number of that minion owned.
const UP_NAMES: [string, string, string][] = [
    ["Stone Pickaxe Heads", "Cobble Compactor", "Infinite Generator"],
    ["Iron Hoe", "Enchanted Seeds", "Automated Harvester"],
    ["Sharpened Axe", "Growth Fertilizer", "Lumber Mill"],
    ["Coal Hopper", "Pressure Chamber", "Coal Refinery"],
    ["Iron Smelter", "Ore Cart Line", "Iron Golem Guard"],
    ["Gold Pan", "Midas Sluice", "Gilded Furnace"],
    ["Diamond Drill Bit", "Gem Polisher", "Crystal Refinery"],
    ["Lapis Grinder", "Enchant Table Link", "Blue Dye Vat"],
    ["Villager Contract", "Trading Hall", "Emerald Exchange"],
    ["Water Bucket Trick", "Lava Quench", "Obsidian Forge"],
    ["Nether Lantern", "Dust Condenser", "Light Reactor"],
    ["Shard Lens", "Rift Anchor", "Fracture Engine"],
    ["Redstone Torch Array", "Piston Assembly", "Clock Circuit"],
    ["Nether Chisel", "Crystal Lattice", "Quartz Resonator"],
    ["Frost Pick", "Packed Ice Press", "Blizzard Engine"],
    ["Sea Lantern Lamp", "Guardian Beam", "Ocean Core"],
];
const UP_COST = [60, 1200, 2e5];
const UP_REQ = [5, 25, 75];
const UP_MULT = [2, 2, 3];

export const MINION_UPS: UpgradeDef[] = MINIONS.flatMap((m, i) =>
    UP_NAMES[i].map((name, t): UpgradeDef => ({
        id: `mu-${m.id}-${t + 1}`,
        name,
        kind: "mown",
        value: UP_MULT[t],
        cost: m.cost * UP_COST[t],
        growth: 1,
        max: 1,
        symbol: m.symbol,
        color: m.color,
        minion: i,
        req: UP_REQ[t],
        extra: t === 1 ? { col: 0.5 } : t === 2 ? { disc: 0.1 } : undefined,
        desc: `${m.name} output x${UP_MULT[t]}${t === 1 ? ", collects 50% faster" : t === 2 ? ", costs 10% less" : ""}`,
    })),
);

export const MINION_UPS_BY: UpgradeDef[][] = MINIONS.map((_, i) => MINION_UPS.filter((u) => u.minion === i));

export const UPGRADES: UpgradeDef[] = [...BASE_UPGRADES, ...FX_UPGRADES, ...MINION_UPS];

export interface AutoPrefs {
    min: boolean;
    up: boolean;
    tok: boolean;
    rb: boolean;
    /** Auto-rebirth waits until this many rebirth levels are ready at once. */
    rbN: number;
    /** Auto-ascend (an Essence upgrade) and the gem auto-spender. */
    asc: boolean;
    gem: boolean;
    /** Auto-ascend waits until you have this many rebirths. */
    ascN: number;
}
export const DEFAULT_AUTO: AutoPrefs = { min: false, up: false, tok: false, rb: false, rbN: 1, asc: false, gem: false, ascN: 10 };

export interface RebirthUpDef {
    id: string;
    name: string;
    desc: string;
    cost: number; // tokens
    growth: number;
    max: number;
    symbol: McSymbolName;
    color: string;
    /** Another token upgrade that must reach `needsLvl` (default 1) before this one can be bought. */
    needs?: string;
    needsLvl?: number;
    /** A stat it feeds, and how much per level (read by upFx in upfx.ts). */
    fx?: [EStat, number];
}

export const REBIRTH_UPS: RebirthUpDef[] = [
    { id: "stack", name: "Rebirth Stack", desc: "Rebirth +1 level at once (up to 15)", cost: 2, growth: 1.3, max: 14, symbol: "portal", color: "var(--mc-light-purple)" },
    { id: "core", name: "Fractured Core", desc: "+0.05 to the rebirth multiplier base (x1.5 per rebirth)", cost: 1, growth: 2, max: 10, symbol: "comet", color: "var(--mc-aqua)" },
    { id: "magnet", name: "Token Magnet", desc: "+25% tokens from every rebirth", cost: 2, growth: 1.6, max: 10, symbol: "magicFind", color: "var(--mc-yellow)" },
    { id: "might", name: "Fractured Might", desc: "+5% click power, permanently", cost: 2, growth: 1.5, max: 20, symbol: "strength", color: "var(--mc-gold)" },
    { id: "engine", name: "Fractured Engine", desc: "+5% minion output, permanently", cost: 2, growth: 1.5, max: 20, symbol: "forge", color: "var(--mc-green)" },
    { id: "luck", name: "Lucky Charm", desc: "+1% crit chance, permanently", cost: 3, growth: 1.5, max: 15, symbol: "critChance", color: "var(--mc-blue)" },
    { id: "head", name: "Head Start", desc: "Begin each rebirth with more shards", cost: 1, growth: 2.5, max: 5, symbol: "speed", color: "var(--mc-yellow)" },
    { id: "kit", name: "Starter Kit", desc: "Begin each rebirth with free Cobblestone and Wheat Minions", cost: 3, growth: 1.8, max: 10, symbol: "fortune", color: "var(--mc-green)" },
    { id: "keep", name: "Muscle Memory", desc: "Keep 20% of your training upgrade levels through rebirth", cost: 5, growth: 2, max: 5, symbol: "attackSpeed", color: "var(--mc-red)" },
    { id: "mom", name: "Momentum Core", desc: "+0.5 max combo multiplier, permanently", cost: 2, growth: 1.6, max: 10, symbol: "speed", color: "var(--mc-yellow)" },
    { id: "omen", name: "Good Omens", desc: "+10% more popups of every kind, permanently", cost: 2, growth: 1.6, max: 10, symbol: "flag", color: "var(--mc-yellow)" },
    { id: "disc", name: "Bulk Discount", desc: "-5% minion cost", cost: 2, growth: 2, max: 10, symbol: "petLuck", color: "var(--mc-green)" },
    { id: "off", name: "Night Owl", desc: "+10% offline efficiency", cost: 1, growth: 2, max: 5, symbol: "night", color: "var(--mc-blue)" },
    // Deep upgrades: tiny steps, many levels, steep prices. Each opens once its first-tier cousin reaches level 5.
    { id: "fort", name: "Fractured Fortune", desc: "+1% to all shards, per level", cost: 6, growth: 1.15, max: 50, symbol: "magicFind", color: "var(--mc-light-purple)" },
    { id: "surge", name: "Click Surge", desc: "+2% click power, per level", cost: 5, growth: 1.2, max: 30, symbol: "strength", color: "var(--mc-gold)", needs: "might", needsLvl: 5 },
    { id: "swarm", name: "Minion Swarm", desc: "+2% minion output, per level", cost: 5, growth: 1.2, max: 30, symbol: "forge", color: "var(--mc-green)", needs: "engine", needsLvl: 5 },
    { id: "edge", name: "Keen Edge", desc: "+3% crit damage, per level", cost: 4, growth: 1.2, max: 25, symbol: "critDamage", color: "var(--mc-red)", needs: "luck", needsLvl: 5 },
    { id: "bank", name: "Token Bank", desc: "+10% rebirth tokens, per level", cost: 8, growth: 1.3, max: 15, symbol: "pristine", color: "var(--mc-yellow)", needs: "magnet", needsLvl: 5 },
    { id: "heir", name: "Heirloom", desc: "Keep 2% more of your training upgrade levels through rebirth, per level", cost: 8, growth: 1.5, max: 10, symbol: "check", color: "var(--mc-gold)", needs: "keep", needsLvl: 3 },
    // Farming and Mining: bigger gardens and richer rock.
    { id: "acres", name: "Acres", desc: "+2 plots in every garden, per level", cost: 2, growth: 1.55, max: 12, symbol: "fortune", color: "var(--mc-green)" },
    { id: "loam", name: "Rich Loam", desc: "+5% crops from every harvest, per level", cost: 3, growth: 1.4, max: 15, symbol: "flower", color: "var(--mc-green)", needs: "acres", needsLvl: 2 },
    { id: "lode", name: "Mother Lode", desc: "+5% ore from everything you mine, per level", cost: 3, growth: 1.4, max: 15, symbol: "pick", color: "var(--mc-gold)", needs: "acres", needsLvl: 2 },
    // The systems that came later: study, pets, the Forge, the Market and the deep Mine and Farm.
    { id: "scholar", name: "Scholar's Mind", desc: "+6% skill XP, per level", cost: 3, growth: 1.45, max: 15, symbol: "wisdom", color: "var(--mc-aqua)", fx: ["xp", 0.06] },
    { id: "whisper", name: "Pet Whisperer", desc: "+6% pet experience, per level", cost: 2, growth: 1.4, max: 15, symbol: "petLuck", color: "var(--mc-dark-aqua)", fx: ["petXp", 0.06] },
    { id: "dustw", name: "Dust Whisperer", desc: "+6% arcane dust, per level", cost: 3, growth: 1.45, max: 12, symbol: "intelligence", color: "var(--mc-light-purple)", fx: ["dust", 0.06] },
    { id: "star", name: "Lucky Star", desc: "+2% enchant luck, per level", cost: 4, growth: 1.5, max: 12, symbol: "fortune", color: "var(--mc-green)", fx: ["luck", 0.02] },
    { id: "thumbs", name: "Green Thumbs", desc: "+4% crop growth speed, per level", cost: 3, growth: 1.4, max: 15, symbol: "day", color: "var(--mc-yellow)", needs: "acres", needsLvl: 2, fx: ["grow", 0.04] },
    { id: "savvy", name: "Market Savvy", desc: "+4% crop sale price, per level", cost: 4, growth: 1.45, max: 15, symbol: "scales", color: "var(--mc-green)", needs: "loam", needsLvl: 3, fx: ["sale", 0.04] },
    { id: "seedl", name: "Seed Luck", desc: "+0.6% golden crop chance, per level", cost: 5, growth: 1.5, max: 12, symbol: "magicFind", color: "var(--mc-gold)", needs: "loam", needsLvl: 3, fx: ["goldCrop", 0.006] },
    { id: "hearth2", name: "Hearth Wisdom", desc: "+5% cooking speed, per level", cost: 3, growth: 1.4, max: 12, symbol: "heat", color: "var(--mc-gold)", needs: "loam", needsLvl: 1, fx: ["cook", 0.05] },
    { id: "hotf", name: "Hot Forge", desc: "+5% forge speed, per level", cost: 3, growth: 1.4, max: 15, symbol: "heat", color: "var(--mc-red)", needs: "lode", needsLvl: 2, fx: ["forge", 0.05] },
    { id: "torque", name: "Drill Torque", desc: "+4% drill swing speed, per level", cost: 4, growth: 1.45, max: 15, symbol: "forge", color: "var(--mc-aqua)", needs: "lode", needsLvl: 3, fx: ["drill", 0.04] },
    { id: "veins", name: "Deep Veins", desc: "+5% ore from mining, per level", cost: 5, growth: 1.5, max: 15, symbol: "pick", color: "var(--mc-gold)", needs: "lode", needsLvl: 5, fx: ["ore", 0.05] },
    { id: "bounty", name: "Bountiful Harvest", desc: "+4% crops per harvest, per level", cost: 5, growth: 1.5, max: 15, symbol: "flower", color: "var(--mc-green)", needs: "loam", needsLvl: 5, fx: ["crop", 0.04] },
];

/** Bonus tokens for reaching a rebirth level (level -> tokens). */
export const REBIRTH_MILESTONES: Record<number, number> = {
    1: 3, 2: 3, 3: 4, 5: 6, 7: 6, 10: 12, 15: 18, 20: 24, 25: 32, 30: 40, 40: 55, 50: 80, 75: 110, 100: 160,
};

// Each ascension makes every rebirth ASC_COST times pricier, so the extra power
// it grants has to be earned back rather than skipping the climb.
export const ASC_COST = 4;
export const REBIRTH_BASE = 1e5;
export const REBIRTH_GROWTH = 6;
export const rebirthCost = (r: number, asc = 0, discount = 1) => REBIRTH_BASE * Math.pow(REBIRTH_GROWTH, r) * Math.pow(ASC_COST, asc) * discount;

export { ISLANDS } from "./islands";
export type { IslandDef } from "./islands";

// ---- Trophies ----
// A trophy is a chain of tiers. Each tier gives a small permanent bonus, and
// later tiers give slightly more. Bonuses are fractions (0.01 = 1%).

export type RewardStat = "all" | "click" | "minion" | "critChance" | "critDmg" | "tokens" | "skillXp" | "offline" | "bobber";

export const REWARD_LABEL: Record<RewardStat, string> = {
    all: "all shards",
    click: "click power",
    minion: "minion output",
    critChance: "crit chance",
    critDmg: "crit damage",
    tokens: "rebirth tokens",
    skillXp: "skill XP",
    offline: "offline efficiency",
    bobber: "bobber rewards",
};

export interface TrophyCategory {
    id: string;
    name: string;
    color: string;
    symbol: McSymbolName;
}

export const TROPHY_CATEGORIES: TrophyCategory[] = [
    { id: "clicking", name: "Clicking", color: "var(--mc-aqua)", symbol: "strength" },
    { id: "wealth", name: "Wealth", color: "var(--mc-gold)", symbol: "magicFind" },
    { id: "minions", name: "Minions", color: "var(--mc-green)", symbol: "forge" },
    { id: "rebirth", name: "Rebirth", color: "var(--mc-light-purple)", symbol: "portal" },
    { id: "skills", name: "Skills", color: "var(--mc-red)", symbol: "wisdom" },
    { id: "explore", name: "Exploration", color: "var(--mc-blue)", symbol: "location" },
    { id: "pets", name: "Pets", color: "var(--mc-dark-aqua)", symbol: "petLuck" },
    { id: "unique", name: "Unique", color: "var(--mc-yellow)", symbol: "pristine" },
];

export interface TrophyTier {
    at: number;
    reward: number;
}

export interface TrophyDef {
    id: string;
    name: string;
    category: string;
    symbol: McSymbolName;
    stat: RewardStat;
    /** What the metric counts, e.g. "clicks". */
    unit: string;
    metric: (s: State) => number;
    tiers: TrophyTier[];
}

const tiers = (at: number[], reward: number[]): TrophyTier[] => at.map((a, i) => ({ at: a, reward: reward[i] }));
const owned = (s: State) => s.minions.reduce((a, b) => a + b, 0);
const skillSum = (s: State) => skillLevel(s.mining) + skillLevel(s.farming) + skillLevel(s.combat) + skillLevel(s.fishing) + skillLevel(s.foraging, "foraging") + skillLevel(s.enchanting, "enchanting");
const islands = (s: State) => ISLANDS.filter((i) => Number.isFinite(i.at) && s.total >= i.at).length;

export const TROPHIES: TrophyDef[] = [
    { id: "clicks", name: "Button Masher", category: "clicking", symbol: "strength", stat: "click", unit: "clicks", metric: (s) => s.clicks, tiers: tiers([100, 1e3, 1e4, 1e5, 1e6, 1e7], [0.01, 0.01, 0.02, 0.03, 0.05, 0.08]) },
    { id: "crits", name: "Sharp Eyed", category: "clicking", symbol: "critChance", stat: "critChance", unit: "critical hits", metric: (s) => s.crits, tiers: tiers([50, 500, 5e3, 5e4, 5e5], [0.005, 0.005, 0.01, 0.01, 0.02]) },
    { id: "exec", name: "Executioner", category: "clicking", symbol: "critDamage", stat: "critDmg", unit: "critical hits", metric: (s) => s.crits, tiers: tiers([1e3, 1e4, 1e5, 1e6], [0.05, 0.05, 0.1, 0.15]) },
    { id: "hoard", name: "Shard Hoarder", category: "wealth", symbol: "speed", stat: "all", unit: "lifetime shards", metric: (s) => s.total, tiers: tiers([1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24], [0.01, 0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05]) },
    { id: "hired", name: "Hired Help", category: "minions", symbol: "forge", stat: "minion", unit: "minions owned (best)", metric: (s) => Math.max(s.peak.minions, owned(s)), tiers: tiers([10, 50, 100, 250, 500, 1000], [0.01, 0.02, 0.03, 0.04, 0.06, 0.1]) },
    { id: "roster", name: "Full Roster", category: "minions", symbol: "petLuck", stat: "all", unit: "minion types owned (best)", metric: (s) => Math.max(s.peak.types, s.minions.filter((n) => n > 0).length), tiers: tiers([3, 6, 9, 12, 16], [0.01, 0.01, 0.02, 0.02, 0.03]) },
    { id: "reborn", name: "Ever Reborn", category: "rebirth", symbol: "portal", stat: "tokens", unit: "rebirths", metric: (s) => s.rebirths, tiers: tiers([1, 3, 5, 10, 15, 25, 50], [0.05, 0.05, 0.1, 0.1, 0.15, 0.2, 0.25]) },
    { id: "s-mining", name: "Master Miner", category: "skills", symbol: "strength", stat: "click", unit: "Mining level", metric: (s) => skillLevel(s.mining), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05]) },
    { id: "veins", name: "Vein Breaker", category: "skills", symbol: "pick", stat: "click", unit: "swings of the pickaxe", metric: (s) => s.mine.nodes, tiers: tiers([200, 2000, 10000, 50000, 250000], [0.01, 0.02, 0.03, 0.05, 0.08]) },
    { id: "smith", name: "Master Smith", category: "skills", symbol: "forge", stat: "all", unit: "Forge crafts collected", metric: (s) => s.mine.crafted, tiers: tiers([1, 10, 40, 150], [0.005, 0.01, 0.02, 0.03]) },
    { id: "harvester", name: "Harvest Moon", category: "skills", symbol: "fortune", stat: "minion", unit: "harvests", metric: (s) => s.farm.harvests, tiers: tiers([50, 500, 5000, 50000], [0.01, 0.02, 0.03, 0.05]) },
    { id: "baker", name: "Master Baker", category: "skills", symbol: "forge", stat: "all", unit: "Cookhouse crafts collected", metric: (s) => s.farm.crafted, tiers: tiers([1, 10, 40, 150], [0.005, 0.01, 0.02, 0.03]) },
    { id: "geodes", name: "Geode Hunter", category: "explore", symbol: "gem", stat: "tokens", unit: "geodes cracked", metric: (s) => s.mine.cracked, tiers: tiers([1, 10, 50, 200], [0.05, 0.05, 0.1, 0.15]) },
    { id: "s-farming", name: "Green Thumb", category: "skills", symbol: "fortune", stat: "minion", unit: "Farming level", metric: (s) => skillLevel(s.farming), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05]) },
    { id: "s-combat", name: "Slayer", category: "skills", symbol: "critDamage", stat: "critDmg", unit: "Combat level", metric: (s) => skillLevel(s.combat), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.02, 0.02, 0.03, 0.04, 0.05, 0.06, 0.1]) },
    { id: "s-fishing", name: "Deep Angler", category: "skills", symbol: "fishing", stat: "bobber", unit: "Fishing level", metric: (s) => skillLevel(s.fishing), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.05, 0.05, 0.1, 0.1, 0.15, 0.15, 0.25]) },
    { id: "s-forage", name: "Trailblazer", category: "skills", symbol: "flower", stat: "bobber", unit: "Foraging level", metric: (s) => skillLevel(s.foraging, "foraging"), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.05, 0.05, 0.1, 0.1, 0.15, 0.15, 0.25]) },
    { id: "s-ench", name: "Arcane Scholar", category: "skills", symbol: "intelligence", stat: "skillXp", unit: "Enchanting level", metric: (s) => skillLevel(s.enchanting, "enchanting"), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.02, 0.02, 0.04, 0.04, 0.06, 0.06, 0.1]) },
    { id: "s-total", name: "Well Rounded", category: "skills", symbol: "intelligence", stat: "skillXp", unit: "total skill levels", metric: skillSum, tiers: tiers([20, 50, 100, 150, 200, 300], [0.05, 0.05, 0.1, 0.1, 0.15, 0.2]) },
    { id: "rolls", name: "Table Regular", category: "unique", symbol: "portal", stat: "all", unit: "enchant rolls", metric: (s) => s.enc.rolls, tiers: tiers([10, 50, 250, 1000, 5000], [0.01, 0.01, 0.02, 0.03, 0.05]) },
    { id: "lucky-roll", name: "Lucky Star", category: "unique", symbol: "petLuck", stat: "critChance", unit: "best rarity rolled (1 = Common)", metric: (s) => s.enc.byR.reduce((a, n, i) => (n > 0 ? i + 1 : a), 0), tiers: tiers([3, 4, 5, 6, 7, 8], [0.005, 0.005, 0.01, 0.01, 0.015, 0.02]) },
    { id: "isles", name: "Island Hopper", category: "explore", symbol: "location", stat: "all", unit: "islands unlocked", metric: islands, tiers: tiers([2, 3, 4, 5, 6, 7], [0.01, 0.01, 0.02, 0.02, 0.03, 0.05]) },
    { id: "hunter", name: "Event Hunter", category: "explore", symbol: "flag", stat: "bobber", unit: "popups caught", metric: (s) => s.evs.caught, tiers: tiers([1, 25, 100, 500, 2500], [0.05, 0.05, 0.1, 0.1, 0.15]) },
    { id: "perfect", name: "Perfectionist", category: "explore", symbol: "critChance", stat: "critChance", unit: "perfect quick time events", metric: (s) => s.evs.perfect, tiers: tiers([1, 10, 50, 250], [0.005, 0.005, 0.01, 0.01]) },
    { id: "bobbers", name: "Gone Fishing", category: "explore", symbol: "fishing", stat: "bobber", unit: "bobbers caught", metric: (s) => s.bobbers, tiers: tiers([1, 10, 50, 250, 1000], [0.05, 0.1, 0.15, 0.2, 0.25]) },
    { id: "time", name: "Dedicated", category: "explore", symbol: "day", stat: "offline", unit: "hours played", metric: (s) => s.playTime / 3600, tiers: tiers([1, 5, 24, 100], [0.05, 0.05, 0.1, 0.1]) },
    { id: "menagerie", name: "Menagerie", category: "pets", symbol: "petLuck", stat: "all", unit: "pets found", metric: (s) => Object.keys(s.pets).length, tiers: tiers([1, 4, 8, 12, 15, 25, 40, 55], [0.01, 0.01, 0.02, 0.03, 0.05, 0.05, 0.08, 0.1]) },
    { id: "hatch", name: "Egg Hunter", category: "pets", symbol: "flower", stat: "skillXp", unit: "eggs hatched", metric: (s) => s.hatched, tiers: tiers([1, 10, 30, 100, 300, 1000], [0.05, 0.05, 0.1, 0.1, 0.15, 0.25]) },
    { id: "legend", name: "Legendary Luck", category: "pets", symbol: "magicFind", stat: "minion", unit: "legendary or better pets", metric: (s) => PETS.filter((p) => (p.rarity === "legendary" || p.rarity === "mythic" || p.rarity === "divine") && s.pets[p.id]).length, tiers: tiers([1, 2, 3, 6, 10, 14], [0.05, 0.1, 0.2, 0.2, 0.3, 0.5]) },
    { id: "bestfriend", name: "Best Friend", category: "pets", symbol: "regen", stat: "click", unit: "top pet level", metric: (s) => Math.max(0, ...PETS.map((p) => (s.pets[p.id] ? petLevel(p, s.pets[p.id].xp) : 0))), tiers: tiers([10, 25, 50, 75, 100], [0.02, 0.03, 0.05, 0.08, 0.15]) },
    { id: "ascended", name: "Ascended", category: "rebirth", symbol: "comet", stat: "tokens", unit: "ascensions", metric: (s) => s.ascEver, tiers: tiers([1, 2, 3, 5, 10], [0.1, 0.1, 0.15, 0.2, 0.3]) },
    { id: "u-first", name: "First Click", category: "unique", symbol: "check", stat: "all", unit: "clicks", metric: (s) => s.clicks, tiers: tiers([1], [0.01]) },
    { id: "u-auto", name: "Fully Automated", category: "unique", symbol: "attackSpeed", stat: "click", unit: "Auto-Clicker level", metric: (s) => s.ups.auto || 0, tiers: tiers([25], [0.1]) },
    { id: "u-speed", name: "Speedrunner", category: "unique", symbol: "speed", stat: "tokens", unit: "rebirths inside the first 30 min", metric: (s) => (s.rebirths >= 1 && s.playTime < 1800 ? 1 : 0), tiers: tiers([1], [0.1]) },
    { id: "u-crit", name: "Critical Mass", category: "unique", symbol: "critDamage", stat: "critDmg", unit: "Crushing Blows level", metric: (s) => s.ups.critd || 0, tiers: tiers([30], [0.2]) },
    { id: "u-lucky", name: "Lucky Streak", category: "unique", symbol: "critChance", stat: "critChance", unit: "Critical Eye level", metric: (s) => s.ups.critc || 0, tiers: tiers([25], [0.03]) },
];

// Not built yet: shown as locked cards so the roadmap is visible in-game.
export const COMING_SOON = [
    { name: "Bazaar", symbol: "magicFind" as McSymbolName, color: "var(--mc-gold)", desc: "A fake market where resources swing in price." },
];

// ---- Pets ----
// Pet and egg tables live in pets-data.ts (pure content, no cycle); re-exported here so every import path still works.
export * from "./pets-data";

// ---- Ascension ----
// The prestige layer above rebirth. Ascending wipes rebirths, tokens and
// token upgrades and pays Ascension Points, which buy upgrades that last
// forever. Pets, skills, trophies and islands are never touched.

export const ASC_BASE = 3; // every ascension multiplies all shards by this
export const ascReq = (asc: number) => 10 + asc; // rebirths needed
export const ascGain = (rebirths: number, asc: number) => Math.max(0, Math.floor((rebirths - 6) / 2) + asc);

export interface AscUpDef {
    id: string;
    name: string;
    desc: string;
    cost: number; // gems
    growth: number;
    max: number;
    symbol: McSymbolName;
    color: string;
    needs?: string; // another upgrade that must be bought first
    needsLvl?: number; // ...to at least this level (default 1)
    fx?: [EStat, number]; // a stat it feeds, per level (read by upFx in upfx.ts)
}

export const ASC_UPS: AscUpDef[] = [
    { id: "cosmic", name: "Cosmic Core", desc: "+25% to all shards", cost: 1, growth: 1.35, max: 20, symbol: "comet", color: "var(--mc-aqua)" },
    { id: "echo", name: "Echo Memory", desc: "Begin each ascension with +1 rebirth level", cost: 5, growth: 1.9, max: 6, symbol: "portal", color: "var(--mc-light-purple)" },
    { id: "well", name: "Token Well", desc: "+25% rebirth tokens", cost: 2, growth: 1.5, max: 10, symbol: "magicFind", color: "var(--mc-yellow)" },
    { id: "union", name: "Minion Union", desc: "+25% minion output", cost: 2, growth: 1.5, max: 10, symbol: "forge", color: "var(--mc-green)" },
    { id: "depth", name: "Deep Delvers", desc: "+30% collection speed", cost: 2, growth: 1.4, max: 10, symbol: "pristine", color: "var(--mc-blue)" },
    { id: "keep", name: "Keepsake", desc: "Keep 10% of your token upgrade levels through ascension", cost: 4, growth: 1.6, max: 8, symbol: "check", color: "var(--mc-gold)" },
    { id: "auto2", name: "Cosmic Reflexes", desc: "Begin each ascension with +3 Auto-Clicker levels", cost: 2, growth: 1.4, max: 8, symbol: "attackSpeed", color: "var(--mc-red)" },
    { id: "perch2", name: "Second Perch", desc: "Unlock a second pet slot", cost: 4, growth: 1, max: 1, symbol: "petLuck", color: "var(--mc-dark-aqua)" },
    { id: "perch3", name: "Third Perch", desc: "Unlock a third pet slot", cost: 25, growth: 1, max: 1, symbol: "petLuck", color: "var(--mc-dark-aqua)", needs: "perch2" },
    { id: "perch4", name: "Fourth Perch", desc: "Unlock a fourth pet slot", cost: 60, growth: 1, max: 1, symbol: "petLuck", color: "var(--mc-dark-aqua)", needs: "perch3" },
    { id: "nest", name: "Egg Fluency", desc: "-8% egg prices", cost: 2, growth: 1.5, max: 8, symbol: "flower", color: "var(--mc-gold)" },
    { id: "over", name: "Overdrive Core", desc: "+1 max combo multiplier and +10% combo build speed", cost: 2, growth: 1.5, max: 10, symbol: "attackSpeed", color: "var(--mc-red)" },
    { id: "horizon", name: "Event Horizon", desc: "+12% boon strength and duration, and popups last 10% longer", cost: 2, growth: 1.5, max: 10, symbol: "comet", color: "var(--mc-light-purple)" },
    { id: "mentor", name: "Pet Mentor", desc: "+30% pet experience", cost: 1, growth: 1.4, max: 10, symbol: "wisdom", color: "var(--mc-light-purple)" },
    // Deep gem upgrades, and the auto-buyers (they only ever spend what you already have).
    { id: "nova", name: "Nova Core", desc: "+3% to all shards, per level", cost: 3, growth: 1.28, max: 30, symbol: "comet", color: "var(--mc-aqua)", needs: "cosmic", needsLvl: 5 },
    { id: "forge2", name: "Rebirth Forge", desc: "+0.01 to the rebirth multiplier base, per level", cost: 6, growth: 1.4, max: 15, symbol: "portal", color: "var(--mc-light-purple)", needs: "echo", needsLvl: 1 },
    { id: "hoard", name: "Gem Hoard", desc: "+5% gems from every ascension, per level", cost: 8, growth: 1.5, max: 10, symbol: "pristine", color: "var(--mc-gold)", needs: "keep", needsLvl: 1 },
    { id: "autoMin", name: "Minion Foreman", desc: "Automatically buys the best-value minion; each level is faster", cost: 6, growth: 2.1, max: 5, symbol: "defense", color: "var(--mc-green)" },
    { id: "autoUp", name: "Upgrade Foreman", desc: "Automatically buys the cheapest shard upgrade; each level is faster", cost: 8, growth: 2.1, max: 4, symbol: "speed", color: "var(--mc-yellow)" },
    { id: "autoTok", name: "Token Steward", desc: "Automatically spends tokens on the best-value upgrade; each level is faster", cost: 12, growth: 2, max: 3, symbol: "magicFind", color: "var(--mc-light-purple)" },
    { id: "autoRb", name: "Rebirth Cycle", desc: "Automatically rebirths once the number of levels you set is ready", cost: 20, growth: 1, max: 1, symbol: "portal", color: "var(--mc-red)", needs: "autoTok", needsLvl: 1 },
    { id: "estate", name: "Estate", desc: "+6 plots in every garden, per level", cost: 3, growth: 1.5, max: 10, symbol: "fortune", color: "var(--mc-green)" },
    { id: "bedrock", name: "Bedrock Rig", desc: "+20% drill swings, per level", cost: 3, growth: 1.5, max: 10, symbol: "pick", color: "var(--mc-gold)" },
    // Deep gem upgrades for the Mine, the Farm, the Market and study.
    { id: "tome", name: "Ancient Tome", desc: "+12% skill XP, per level", cost: 2, growth: 1.4, max: 12, symbol: "wisdom", color: "var(--mc-aqua)", fx: ["xp", 0.12] },
    { id: "harvg", name: "Harvest Gods", desc: "+10% crops per harvest, per level", cost: 3, growth: 1.45, max: 12, symbol: "flower", color: "var(--mc-green)", needs: "estate", needsLvl: 2, fx: ["crop", 0.1] },
    { id: "age", name: "Golden Age", desc: "+1% golden crop chance, per level", cost: 4, growth: 1.5, max: 10, symbol: "magicFind", color: "var(--mc-gold)", needs: "harvg", needsLvl: 1, fx: ["goldCrop", 0.01] },
    { id: "broker", name: "Market Maker", desc: "+8% crop sale price, per level", cost: 3, growth: 1.45, max: 12, symbol: "scales", color: "var(--mc-green)", needs: "estate", needsLvl: 3, fx: ["sale", 0.08] },
    { id: "feast", name: "Endless Feast", desc: "+10% cooking speed, per level", cost: 3, growth: 1.45, max: 10, symbol: "heat", color: "var(--mc-gold)", needs: "estate", needsLvl: 1, fx: ["cook", 0.1] },
    { id: "coretap", name: "Core Tap", desc: "+10% ore from mining, per level", cost: 3, growth: 1.45, max: 12, symbol: "pick", color: "var(--mc-gold)", needs: "bedrock", needsLvl: 2, fx: ["ore", 0.1] },
    { id: "spindle2", name: "Drill Spindle", desc: "+10% drill swing speed, per level", cost: 4, growth: 1.5, max: 10, symbol: "forge", color: "var(--mc-aqua)", needs: "bedrock", needsLvl: 3, fx: ["drill", 0.1] },
    { id: "bellows2", name: "Eternal Bellows", desc: "+10% forge speed, per level", cost: 3, growth: 1.45, max: 12, symbol: "heat", color: "var(--mc-red)", needs: "bedrock", needsLvl: 1, fx: ["forge", 0.1] },
    { id: "dusk", name: "Eternal Night", desc: "+10% offline earnings, per level", cost: 3, growth: 1.5, max: 10, symbol: "night", color: "var(--mc-blue)", fx: ["offline", 0.1] },
    { id: "fate", name: "Cosmic Fortune", desc: "+6% enchant luck, per level", cost: 3, growth: 1.5, max: 10, symbol: "fortune", color: "var(--mc-green)", fx: ["luck", 0.06] },
    { id: "vortex", name: "Dust Vortex", desc: "+10% arcane dust, per level", cost: 3, growth: 1.45, max: 10, symbol: "intelligence", color: "var(--mc-light-purple)", fx: ["dust", 0.1] },
];

export type SkillId = "mining" | "farming" | "combat" | "fishing" | "foraging" | "enchanting";

export interface SkillDef {
    id: SkillId;
    name: string;
    symbol: McSymbolName;
    color: string;
    earn: string; // how xp is earned
    perk: string; // what a level does
    /** Bonus text at a given level, e.g. "+9%". */
    bonus: (level: number) => string;
}

export const SKILLS: SkillDef[] = [
    { id: "mining", name: "Mining", symbol: "strength", color: "var(--mc-gold)", earn: "Every swing of the pickaxe: each click mines ore, and drills keep swinging", perk: "+3% click power per level", bonus: (l) => `+${l * 3}%` },
    { id: "farming", name: "Farming", symbol: "fortune", color: "var(--mc-green)", earn: "Every harvest in the Garden: crops grow over time, and each click waters a plot", perk: "+3% minion output per level", bonus: (l) => `+${l * 3}%` },
    { id: "combat", name: "Combat", symbol: "critDamage", color: "var(--mc-red)", earn: "Critical hits", perk: "+2% crit damage per level", bonus: (l) => `+${l * 2}%` },
    { id: "fishing", name: "Fishing", symbol: "fishing", color: "var(--mc-aqua)", earn: "Treasure bobbers", perk: "+1% all shards per level, bobbers appear sooner", bonus: (l) => `+${l}%` },
    { id: "foraging", name: "Foraging", symbol: "flower", color: "#8be35a", earn: "Catching popups and a slow passive trickle", perk: "+0.5% popup frequency and +1.5% popup payouts per level", bonus: (l) => `+${(l * 0.5).toFixed(1).replace(".0", "")}% / +${(l * 1.5).toFixed(1).replace(".0", "")}%` },
    { id: "enchanting", name: "Enchanting", symbol: "intelligence", color: "var(--mc-light-purple)", earn: "Rolling, polishing and reforging enchants", perk: "+3% Arcane Dust and +2% enchant luck per level, opens slots and cosmetics", bonus: (l) => `+${l * 3}% dust / +${l * 2}% luck` },
];

import type { McSymbolName } from "@/components/mc-symbol";
import type { BtnPrefs } from "./button";
import type { ActiveBuff, EventStats } from "./events";

// HOW TO EXPAND (everything below is data-driven):
//  - New minion: add a row to MINIONS (order = shop order; saves map by index,
//    so only ever append).
//  - New upgrade: add a row to UPGRADES (kind decides which stat it feeds).
//  - New skill: add to SKILLS, add its xp field to State + newState, feed xp in
//    engine.advance / the click handler, and apply its bonus in engine.derive.
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
    crits: number;
    bobbers: number; // treasure bobbers caught
    tro: Record<string, number>; // trophy id -> tiers unlocked
    peak: { minions: number; types: number };
    playTime: number; // seconds
    savedAt: number;
    island: string;
    sci: boolean;
    fx: boolean;
    buy: number; // 1 | 10 | 100 | -1 (max)
    orbit: boolean; // orbiting minions around the button
    toasts: boolean; // popup messages
    // Ascension: the prestige layer above rebirth.
    asc: number; // ascensions taken
    ap: number; // unspent ascension points
    aups: Record<string, number>;
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
    frag: number; // Fracture Fragments: permanent +0.2% all shards each
    evs: EventStats; // popup event counters
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

export const SKILL_CAP = 60;
const XP_BASE = 20;
const XP_GROWTH = 1.45;
export const skillLevel = (xp: number) =>
    Math.min(SKILL_CAP, Math.floor(Math.log((xp * (XP_GROWTH - 1)) / XP_BASE + 1) / Math.log(XP_GROWTH)));
export const skillXpFor = (level: number) =>
    (XP_BASE * (Math.pow(XP_GROWTH, level) - 1)) / (XP_GROWTH - 1);

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

const pctText = (v: number) => `${Math.round(v * 1000) / 10}%`;

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

export type UpKind = "click" | "minion" | "all" | "auto" | "critChance" | "critDmg" | "synergy" | "mown" | "comboMax" | "comboGain" | "comboLuck" | "evRate" | "evBobber" | "evLoot" | "evGolden" | "evLife" | "evPower" | "evCurse" | "qteSize" | "qteTime" | "qteReward";

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

export const UPGRADES: UpgradeDef[] = [...BASE_UPGRADES, ...MINION_UPS];

export interface RebirthUpDef {
    id: string;
    name: string;
    desc: string;
    cost: number; // tokens
    growth: number;
    max: number;
    symbol: McSymbolName;
    color: string;
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
];

/** Bonus tokens for reaching a rebirth level (level -> tokens). */
export const REBIRTH_MILESTONES: Record<number, number> = {
    5: 5, 10: 10, 15: 15, 20: 20, 25: 30, 30: 35, 40: 50, 50: 75, 75: 100, 100: 150,
};

// Each ascension makes every rebirth ASC_COST times pricier, so the extra power
// it grants has to be earned back rather than skipping the climb.
export const ASC_COST = 12;
export const rebirthCost = (r: number, asc = 0) => 1e6 * Math.pow(16, r) * Math.pow(ASC_COST, asc);

export interface IslandDef {
    id: string;
    name: string;
    color: string;
    symbol: McSymbolName;
    at: number; // lifetime shards to unlock
    mult: number; // total island bonus while this is the best unlocked (does not stack)
    blurb: string;
}

export const ISLANDS: IslandDef[] = [
    { id: "hub", name: "The Hub", color: "var(--mc-green)", symbol: "location", at: 0, mult: 1, blurb: "Where every adventure starts." },
    { id: "mine", name: "Gold Mine", color: "var(--mc-gold)", symbol: "forge", at: 1e5, mult: 1.5, blurb: "A warm tunnel lined with veins of raw shard ore." },
    { id: "caverns", name: "Deep Caverns", color: "var(--mc-aqua)", symbol: "pristine", at: 1e9, mult: 2.5, blurb: "Crystal ceilings and the far-off echo of minecarts." },
    { id: "den", name: "Spider's Den", color: "var(--mc-dark-purple)", symbol: "night", at: 1e13, mult: 4, blurb: "Webs, egg sacs and something watching from the dark." },
    { id: "fortress", name: "Blazing Fortress", color: "var(--mc-red)", symbol: "heat", at: 1e18, mult: 7, blurb: "Lava bridges, blaze spawners and a constant, shimmering heat." },
    { id: "end", name: "The End", color: "var(--mc-light-purple)", symbol: "portal", at: 1e24, mult: 12, blurb: "Pale stone drifting in an endless dark." },
    { id: "fractured", name: "Fractured Islands", color: "var(--mc-blue)", symbol: "comet", at: 1e32, mult: 25, blurb: "The shattered home of it all." },
];

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
const skillSum = (s: State) => skillLevel(s.mining) + skillLevel(s.farming) + skillLevel(s.combat) + skillLevel(s.fishing);
const islands = (s: State) => ISLANDS.filter((i) => s.total >= i.at).length;

export const TROPHIES: TrophyDef[] = [
    { id: "clicks", name: "Button Masher", category: "clicking", symbol: "strength", stat: "click", unit: "clicks", metric: (s) => s.clicks, tiers: tiers([100, 1e3, 1e4, 1e5, 1e6, 1e7], [0.01, 0.01, 0.02, 0.03, 0.05, 0.08]) },
    { id: "crits", name: "Sharp Eyed", category: "clicking", symbol: "critChance", stat: "critChance", unit: "critical hits", metric: (s) => s.crits, tiers: tiers([50, 500, 5e3, 5e4, 5e5], [0.005, 0.005, 0.01, 0.01, 0.02]) },
    { id: "exec", name: "Executioner", category: "clicking", symbol: "critDamage", stat: "critDmg", unit: "critical hits", metric: (s) => s.crits, tiers: tiers([1e3, 1e4, 1e5, 1e6], [0.05, 0.05, 0.1, 0.15]) },
    { id: "hoard", name: "Shard Hoarder", category: "wealth", symbol: "speed", stat: "all", unit: "lifetime shards", metric: (s) => s.total, tiers: tiers([1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24], [0.01, 0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05]) },
    { id: "hired", name: "Hired Help", category: "minions", symbol: "forge", stat: "minion", unit: "minions owned (best)", metric: (s) => Math.max(s.peak.minions, owned(s)), tiers: tiers([10, 50, 100, 250, 500, 1000], [0.01, 0.02, 0.03, 0.04, 0.06, 0.1]) },
    { id: "roster", name: "Full Roster", category: "minions", symbol: "petLuck", stat: "all", unit: "minion types owned (best)", metric: (s) => Math.max(s.peak.types, s.minions.filter((n) => n > 0).length), tiers: tiers([3, 6, 9, 12, 16], [0.01, 0.01, 0.02, 0.02, 0.03]) },
    { id: "reborn", name: "Ever Reborn", category: "rebirth", symbol: "portal", stat: "tokens", unit: "rebirths", metric: (s) => s.rebirths, tiers: tiers([1, 3, 5, 10, 15, 25, 50], [0.05, 0.05, 0.1, 0.1, 0.15, 0.2, 0.25]) },
    { id: "s-mining", name: "Master Miner", category: "skills", symbol: "strength", stat: "click", unit: "Mining level", metric: (s) => skillLevel(s.mining), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05]) },
    { id: "s-farming", name: "Green Thumb", category: "skills", symbol: "fortune", stat: "minion", unit: "Farming level", metric: (s) => skillLevel(s.farming), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05]) },
    { id: "s-combat", name: "Slayer", category: "skills", symbol: "critDamage", stat: "critDmg", unit: "Combat level", metric: (s) => skillLevel(s.combat), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.02, 0.02, 0.03, 0.04, 0.05, 0.06, 0.1]) },
    { id: "s-fishing", name: "Deep Angler", category: "skills", symbol: "fishing", stat: "bobber", unit: "Fishing level", metric: (s) => skillLevel(s.fishing), tiers: tiers([5, 10, 20, 30, 40, 50, 60], [0.05, 0.05, 0.1, 0.1, 0.15, 0.15, 0.25]) },
    { id: "s-total", name: "Well Rounded", category: "skills", symbol: "intelligence", stat: "skillXp", unit: "total skill levels", metric: skillSum, tiers: tiers([20, 50, 100, 150, 200], [0.05, 0.05, 0.1, 0.1, 0.15]) },
    { id: "isles", name: "Island Hopper", category: "explore", symbol: "location", stat: "all", unit: "islands unlocked", metric: islands, tiers: tiers([2, 3, 4, 5, 6, 7], [0.01, 0.01, 0.02, 0.02, 0.03, 0.05]) },
    { id: "hunter", name: "Event Hunter", category: "explore", symbol: "flag", stat: "bobber", unit: "popups caught", metric: (s) => s.evs.caught, tiers: tiers([1, 25, 100, 500, 2500], [0.05, 0.05, 0.1, 0.1, 0.15]) },
    { id: "perfect", name: "Perfectionist", category: "explore", symbol: "critChance", stat: "critChance", unit: "perfect quick time events", metric: (s) => s.evs.perfect, tiers: tiers([1, 10, 50, 250], [0.005, 0.005, 0.01, 0.01]) },
    { id: "bobbers", name: "Gone Fishing", category: "explore", symbol: "fishing", stat: "bobber", unit: "bobbers caught", metric: (s) => s.bobbers, tiers: tiers([1, 10, 50, 250, 1000], [0.05, 0.1, 0.15, 0.2, 0.25]) },
    { id: "time", name: "Dedicated", category: "explore", symbol: "day", stat: "offline", unit: "hours played", metric: (s) => s.playTime / 3600, tiers: tiers([1, 5, 24, 100], [0.05, 0.05, 0.1, 0.1]) },
    { id: "menagerie", name: "Menagerie", category: "pets", symbol: "petLuck", stat: "all", unit: "pets found", metric: (s) => Object.keys(s.pets).length, tiers: tiers([1, 4, 8, 12, 15], [0.01, 0.01, 0.02, 0.03, 0.05]) },
    { id: "hatch", name: "Egg Hunter", category: "pets", symbol: "flower", stat: "skillXp", unit: "eggs hatched", metric: (s) => s.hatched, tiers: tiers([1, 10, 30, 100, 300], [0.05, 0.05, 0.1, 0.1, 0.15]) },
    { id: "legend", name: "Legendary Luck", category: "pets", symbol: "magicFind", stat: "minion", unit: "legendary pets", metric: (s) => PETS.filter((p) => p.rarity === "legendary" && s.pets[p.id]).length, tiers: tiers([1, 2, 3], [0.05, 0.1, 0.2]) },
    { id: "bestfriend", name: "Best Friend", category: "pets", symbol: "regen", stat: "click", unit: "top pet level", metric: (s) => Math.max(0, ...PETS.map((p) => (s.pets[p.id] ? petLevel(p, s.pets[p.id].xp) : 0))), tiers: tiers([10, 25, 50, 75, 100], [0.02, 0.03, 0.05, 0.08, 0.15]) },
    { id: "ascended", name: "Ascended", category: "rebirth", symbol: "comet", stat: "tokens", unit: "ascensions", metric: (s) => s.asc, tiers: tiers([1, 2, 3, 5, 10], [0.1, 0.1, 0.15, 0.2, 0.3]) },
    { id: "u-first", name: "First Click", category: "unique", symbol: "check", stat: "all", unit: "clicks", metric: (s) => s.clicks, tiers: tiers([1], [0.01]) },
    { id: "u-auto", name: "Fully Automated", category: "unique", symbol: "attackSpeed", stat: "click", unit: "Auto-Clicker level", metric: (s) => s.ups.auto || 0, tiers: tiers([25], [0.1]) },
    { id: "u-speed", name: "Speedrunner", category: "unique", symbol: "speed", stat: "tokens", unit: "rebirths inside the first 30 min", metric: (s) => (s.rebirths >= 1 && s.playTime < 1800 ? 1 : 0), tiers: tiers([1], [0.1]) },
    { id: "u-crit", name: "Critical Mass", category: "unique", symbol: "critDamage", stat: "critDmg", unit: "Crushing Blows level", metric: (s) => s.ups.critd || 0, tiers: tiers([30], [0.2]) },
    { id: "u-lucky", name: "Lucky Streak", category: "unique", symbol: "critChance", stat: "critChance", unit: "Critical Eye level", metric: (s) => s.ups.critc || 0, tiers: tiers([25], [0.03]) },
];

// Not built yet: shown as locked cards so the roadmap is visible in-game.
export const COMING_SOON = [
    { name: "Enchanting", symbol: "intelligence" as McSymbolName, color: "var(--mc-blue)", desc: "Enchant your pickaxe with rolling perks." },
    { name: "Bazaar", symbol: "magicFind" as McSymbolName, color: "var(--mc-gold)", desc: "A fake market where resources swing in price." },
];

// ---- Pets ----
// Hatch eggs for pets, equip up to a few, and they level while equipped.
// A pet's main stat scales with level; three perks unlock at levels 25 / 60 / 100.

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type PetStat = RewardStat | "col" | "cost";

export const RARITIES: Record<Rarity, { name: string; color: string; xp: number; dupe: number }> = {
    common: { name: "Common", color: "#ffffff", xp: 1, dupe: 600 },
    uncommon: { name: "Uncommon", color: "var(--mc-green)", xp: 1.5, dupe: 1500 },
    rare: { name: "Rare", color: "var(--mc-blue)", xp: 2.2, dupe: 4000 },
    epic: { name: "Epic", color: "var(--mc-light-purple)", xp: 3.2, dupe: 12000 },
    legendary: { name: "Legendary", color: "var(--mc-gold)", xp: 5, dupe: 40000 },
};
export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const PET_LABEL: Record<PetStat, string> = {
    ...REWARD_LABEL,
    col: "collection speed",
    cost: "minion price",
};

export const PET_MAX = 100;
export const PET_PERK_AT = [25, 60, 100];

export interface PetPerk {
    name: string;
    stat: PetStat;
    value: number;
}

export interface PetDef {
    id: string;
    name: string;
    rarity: Rarity;
    symbol: McSymbolName;
    color: string;
    stat: PetStat;
    base: number; // main stat at level 1
    per: number; // added per level
    blurb: string;
    perks: [PetPerk, PetPerk, PetPerk];
}

const P = (name: string, stat: PetStat, value: number): PetPerk => ({ name, stat, value });

export const PETS: PetDef[] = [
    { id: "silverfish", name: "Silverfish", rarity: "common", symbol: "strength", color: "#d0d0d8", stat: "click", base: 0.02, per: 0.004, blurb: "Gnaws through stone one click at a time.", perks: [P("Tunneler", "click", 0.05), P("Silver Lining", "all", 0.02), P("Swarm", "click", 0.15)] },
    { id: "rabbit", name: "Rabbit", rarity: "common", symbol: "fortune", color: "var(--mc-yellow)", stat: "minion", base: 0.02, per: 0.004, blurb: "Keeps every minion hopping.", perks: [P("Lucky Foot", "col", 0.05), P("Carrot Patch", "minion", 0.05), P("Warren", "cost", 0.03)] },
    { id: "bat", name: "Bat", rarity: "common", symbol: "night", color: "var(--mc-dark-purple)", stat: "offline", base: 0.01, per: 0.002, blurb: "Works the night shift while you are away.", perks: [P("Echolocation", "skillXp", 0.05), P("Night Owl", "offline", 0.05), P("Swarm Song", "all", 0.05)] },
    { id: "ocelot", name: "Ocelot", rarity: "uncommon", symbol: "attackSpeed", color: "var(--mc-green)", stat: "critChance", base: 0.002, per: 0.0006, blurb: "Stalks weak points.", perks: [P("Pounce", "critDmg", 0.05), P("Jungle Reflexes", "click", 0.08), P("Apex", "critChance", 0.02)] },
    { id: "squid", name: "Squid", rarity: "uncommon", symbol: "fishing", color: "var(--mc-aqua)", stat: "bobber", base: 0.05, per: 0.01, blurb: "Treasure bobbers pay far more.", perks: [P("Ink Trail", "skillXp", 0.1), P("Ink Cloud", "all", 0.02), P("Kraken's Cut", "bobber", 0.5)] },
    { id: "sheep", name: "Sheep", rarity: "uncommon", symbol: "flower", color: "#ffffff", stat: "col", base: 0.03, per: 0.007, blurb: "Wool for every collection.", perks: [P("Soft Touch", "cost", 0.03), P("Shear Luck", "minion", 0.08), P("Golden Fleece", "col", 0.25)] },
    { id: "wolf", name: "Wolf", rarity: "rare", symbol: "critDamage", color: "var(--mc-red)", stat: "critDmg", base: 0.03, per: 0.008, blurb: "Hits hardest when it counts.", perks: [P("Pack Hunter", "critChance", 0.01), P("Alpha", "click", 0.1), P("Moonhowl", "critDmg", 0.3)] },
    { id: "dolphin", name: "Dolphin", rarity: "rare", symbol: "wisdom", color: "var(--mc-aqua)", stat: "skillXp", base: 0.03, per: 0.008, blurb: "Quick learner, quicker skills.", perks: [P("Echo Sense", "bobber", 0.25), P("Pod Leader", "all", 0.03), P("Deep Dive", "skillXp", 0.25)] },
    { id: "blaze", name: "Blaze", rarity: "rare", symbol: "heat", color: "var(--mc-gold)", stat: "minion", base: 0.03, per: 0.008, blurb: "Runs the furnaces hot.", perks: [P("Ember Bargain", "cost", 0.04), P("Inferno", "minion", 0.12), P("Cinder Wake", "col", 0.2)] },
    { id: "tiger", name: "Tiger", rarity: "epic", symbol: "critChance", color: "var(--mc-gold)", stat: "critDmg", base: 0.05, per: 0.012, blurb: "Ferocity given a face.", perks: [P("Stalk", "critChance", 0.015), P("Rend", "click", 0.15), P("Apex Predator", "critDmg", 0.5)] },
    { id: "golem", name: "Golem", rarity: "epic", symbol: "defense", color: "var(--mc-gray, #aaaaaa)", stat: "minion", base: 0.05, per: 0.014, blurb: "A tireless foreman.", perks: [P("Iron Bargain", "cost", 0.05), P("Guardian", "all", 0.04), P("Colossus", "minion", 0.4)] },
    { id: "phoenix", name: "Phoenix", rarity: "epic", symbol: "regen", color: "var(--mc-red)", stat: "all", base: 0.03, per: 0.008, blurb: "Everything rises again, stronger.", perks: [P("Ashes", "offline", 0.05), P("Rebirth Flame", "tokens", 0.08), P("Eternal Flame", "all", 0.08)] },
    { id: "dragon", name: "Ender Dragon", rarity: "legendary", symbol: "comet", color: "var(--mc-light-purple)", stat: "all", base: 0.06, per: 0.018, blurb: "Lord of the End. Bends every stat your way.", perks: [P("Dragon Breath", "critDmg", 0.1), P("Wing Beat", "click", 0.25), P("Ender Sovereign", "all", 0.25)] },
    { id: "griffin", name: "Griffin", rarity: "legendary", symbol: "flag", color: "var(--mc-yellow)", stat: "tokens", base: 0.06, per: 0.012, blurb: "Carries rebirth tokens back from the sky.", perks: [P("Keen Eye", "skillXp", 0.15), P("Sky Hoard", "all", 0.06), P("Myth", "tokens", 0.3)] },
    { id: "wisp", name: "Fractured Wisp", rarity: "legendary", symbol: "portal", color: "var(--mc-blue)", stat: "col", base: 0.1, per: 0.02, blurb: "A shard of the islands that learned to float.", perks: [P("Refraction", "cost", 0.06), P("Prism", "minion", 0.3), P("Shattered Dawn", "all", 0.12)] },
];

export const PET_SLOTS_MAX = 3;

/** Level from total xp: cost to reach level L is K * (1.06^(L-1) - 1) / 0.06. */
const PET_GROWTH = 1.06;
const PET_K = 40;
export const petXpFor = (p: PetDef, level: number) =>
    (PET_K * RARITIES[p.rarity].xp * (Math.pow(PET_GROWTH, level - 1) - 1)) / (PET_GROWTH - 1);
export const petLevel = (p: PetDef, xp: number) =>
    Math.min(PET_MAX, 1 + Math.floor(Math.log(1 + (xp * (PET_GROWTH - 1)) / (PET_K * RARITIES[p.rarity].xp)) / Math.log(PET_GROWTH)));

export interface EggDef {
    id: string;
    name: string;
    color: string;
    symbol: McSymbolName;
    secs: number; // price = this many seconds of your best income
    min: number; // price floor
    odds: Partial<Record<Rarity, number>>;
    blurb: string;
}

export const EGGS: EggDef[] = [
    { id: "wood", name: "Wooden Egg", color: "var(--mc-gold)", symbol: "flower", secs: 900, min: 1e6, odds: { common: 70, uncommon: 26, rare: 4 }, blurb: "Plain, warm and full of surprises." },
    { id: "gold", name: "Golden Egg", color: "var(--mc-yellow)", symbol: "magicFind", secs: 7200, min: 5e8, odds: { uncommon: 40, rare: 42, epic: 17, legendary: 1 }, blurb: "Heavy. Something big is inside." },
    { id: "fracture", name: "Fractured Egg", color: "var(--mc-light-purple)", symbol: "portal", secs: 36000, min: 2e12, odds: { rare: 38, epic: 47, legendary: 15 }, blurb: "Cracked already, and humming." },
];

// ---- Ascension ----
// The prestige layer above rebirth. Ascending wipes rebirths, tokens and
// token upgrades and pays Ascension Points, which buy upgrades that last
// forever. Pets, skills, trophies and islands are never touched.

export const ASC_BASE = 3; // every ascension multiplies all shards by this
export const ascReq = (asc: number) => 16 + 2 * asc; // rebirths needed
export const ascGain = (rebirths: number, asc: number) => Math.max(0, Math.floor((rebirths - 10) / 2) + asc);

export interface AscUpDef {
    id: string;
    name: string;
    desc: string;
    cost: number; // ascension points
    growth: number;
    max: number;
    symbol: McSymbolName;
    color: string;
    needs?: string; // another upgrade that must be bought first
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
    { id: "nest", name: "Egg Fluency", desc: "-8% egg prices", cost: 2, growth: 1.5, max: 8, symbol: "flower", color: "var(--mc-gold)" },
    { id: "over", name: "Overdrive Core", desc: "+1 max combo multiplier and +10% combo build speed", cost: 2, growth: 1.5, max: 10, symbol: "attackSpeed", color: "var(--mc-red)" },
    { id: "horizon", name: "Event Horizon", desc: "+12% boon strength and duration, and popups last 10% longer", cost: 2, growth: 1.5, max: 10, symbol: "comet", color: "var(--mc-light-purple)" },
    { id: "mentor", name: "Pet Mentor", desc: "+30% pet experience", cost: 1, growth: 1.4, max: 10, symbol: "wisdom", color: "var(--mc-light-purple)" },
];

export type SkillId = "mining" | "farming" | "combat" | "fishing";

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
    { id: "mining", name: "Mining", symbol: "strength", color: "var(--mc-gold)", earn: "Every click", perk: "+3% click power per level", bonus: (l) => `+${l * 3}%` },
    { id: "farming", name: "Farming", symbol: "fortune", color: "var(--mc-green)", earn: "Minions working", perk: "+3% minion output per level", bonus: (l) => `+${l * 3}%` },
    { id: "combat", name: "Combat", symbol: "critDamage", color: "var(--mc-red)", earn: "Critical hits", perk: "+2% crit damage per level", bonus: (l) => `+${l * 2}%` },
    { id: "fishing", name: "Fishing", symbol: "fishing", color: "var(--mc-aqua)", earn: "Treasure bobbers", perk: "+1% all shards per level, bobbers appear sooner", bonus: (l) => `+${l}%` },
];

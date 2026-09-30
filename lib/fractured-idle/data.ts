import type { McSymbolName } from "@/components/mc-symbol";

// HOW TO EXPAND (everything below is data-driven):
//  - New minion: add a row to MINIONS (order = shop order; saves map by index,
//    so only ever append).
//  - New upgrade: add a row to UPGRADES (kind decides which stat it feeds).
//  - New skill: add to SKILLS, add its xp field to State + newState, feed xp in
//    engine.advance / the click handler, and apply its bonus in engine.derive.
//  - New island / trophy / rebirth upgrade: add a row to ISLANDS / ACHIEVEMENTS
//    / REBIRTH_UPS.
//  - New tab: add a file under components/games/fractured-idle/ and register it
//    in TABS in index.tsx.
//
// Content tables for Fractured Idle. Everything named here (minions, islands,
// upgrades, achievements) is a WORKING PLACEHOLDER: edit the names, colors and
// numbers here and the game picks them up. Balance is untuned; treat every
// cost / rate as a first pass.

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
}

export interface MinionDef {
    id: string;
    name: string;
    color: string;
    symbol: McSymbolName;
    cost: number;
    cps: number;
}

export const MINION_GROWTH = 1.17;
export const MILESTONES = [25, 50, 100, 200, 400];

export const SKILL_CAP = 60;
const XP_BASE = 20;
const XP_GROWTH = 1.45;
export const skillLevel = (xp: number) =>
    Math.min(SKILL_CAP, Math.floor(Math.log((xp * (XP_GROWTH - 1)) / XP_BASE + 1) / Math.log(XP_GROWTH)));
export const skillXpFor = (level: number) =>
    (XP_BASE * (Math.pow(XP_GROWTH, level) - 1)) / (XP_GROWTH - 1);

export const MINIONS: MinionDef[] = [
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

export type UpKind = "click" | "minion" | "all" | "auto" | "critChance" | "critDmg" | "synergy" | "mown";

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
    { id: "disc", name: "Bulk Discount", desc: "-5% minion cost", cost: 2, growth: 2, max: 10, symbol: "petLuck", color: "var(--mc-green)" },
    { id: "off", name: "Night Owl", desc: "+10% offline efficiency", cost: 1, growth: 2, max: 5, symbol: "night", color: "var(--mc-blue)" },
];

/** Bonus tokens for reaching a rebirth level (level -> tokens). */
export const REBIRTH_MILESTONES: Record<number, number> = {
    5: 5, 10: 10, 15: 15, 20: 20, 25: 30, 30: 35, 40: 50, 50: 75, 75: 100, 100: 150,
};

export const rebirthCost = (r: number) => 1e6 * Math.pow(16, r);

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
    { id: "mine", name: "Gold Mine", color: "var(--mc-gold)", symbol: "forge", at: 1e5, mult: 1.5, blurb: "Placeholder: a warm tunnel with veins of shard ore." },
    { id: "caverns", name: "Deep Caverns", color: "var(--mc-aqua)", symbol: "pristine", at: 1e9, mult: 2.5, blurb: "Placeholder: crystal ceilings and echoing minecarts." },
    { id: "den", name: "Spider's Den", color: "var(--mc-dark-purple)", symbol: "night", at: 1e13, mult: 4, blurb: "Placeholder: webs, eggs and something watching." },
    { id: "fortress", name: "Blazing Fortress", color: "var(--mc-red)", symbol: "heat", at: 1e18, mult: 7, blurb: "Placeholder: lava bridges and blaze spawners." },
    { id: "end", name: "The End", color: "var(--mc-light-purple)", symbol: "portal", at: 1e24, mult: 12, blurb: "Placeholder: pale stone floating in the dark." },
    { id: "fractured", name: "Fractured Islands", color: "var(--mc-blue)", symbol: "comet", at: 1e32, mult: 25, blurb: "Placeholder: the shattered home of it all." },
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
    { id: "bobbers", name: "Gone Fishing", category: "explore", symbol: "fishing", stat: "bobber", unit: "bobbers caught", metric: (s) => s.bobbers, tiers: tiers([1, 10, 50, 250, 1000], [0.05, 0.1, 0.15, 0.2, 0.25]) },
    { id: "time", name: "Dedicated", category: "explore", symbol: "day", stat: "offline", unit: "hours played", metric: (s) => s.playTime / 3600, tiers: tiers([1, 5, 24, 100], [0.05, 0.05, 0.1, 0.1]) },
    { id: "u-first", name: "First Click", category: "unique", symbol: "check", stat: "all", unit: "clicks", metric: (s) => s.clicks, tiers: tiers([1], [0.01]) },
    { id: "u-auto", name: "Fully Automated", category: "unique", symbol: "attackSpeed", stat: "click", unit: "Auto-Clicker level", metric: (s) => s.ups.auto || 0, tiers: tiers([25], [0.1]) },
    { id: "u-speed", name: "Speedrunner", category: "unique", symbol: "speed", stat: "tokens", unit: "rebirths inside the first 30 min", metric: (s) => (s.rebirths >= 1 && s.playTime < 1800 ? 1 : 0), tiers: tiers([1], [0.1]) },
    { id: "u-crit", name: "Critical Mass", category: "unique", symbol: "critDamage", stat: "critDmg", unit: "Crushing Blows level", metric: (s) => s.ups.critd || 0, tiers: tiers([30], [0.2]) },
    { id: "u-lucky", name: "Lucky Streak", category: "unique", symbol: "critChance", stat: "critChance", unit: "Critical Eye level", metric: (s) => s.ups.critc || 0, tiers: tiers([25], [0.03]) },
];

// Not built yet: shown as locked cards so the roadmap is visible in-game.
export const COMING_SOON = [
    { name: "Pets", symbol: "petLuck" as McSymbolName, color: "var(--mc-light-purple)", desc: "Hatch eggs, level companions and equip one for a big boost." },
    { name: "Enchanting", symbol: "intelligence" as McSymbolName, color: "var(--mc-blue)", desc: "Enchant your pickaxe with rolling perks." },
    { name: "Ascension", symbol: "comet" as McSymbolName, color: "var(--mc-aqua)", desc: "A second prestige layer above rebirths." },
    { name: "Bazaar", symbol: "magicFind" as McSymbolName, color: "var(--mc-gold)", desc: "A fake market where resources swing in price." },
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

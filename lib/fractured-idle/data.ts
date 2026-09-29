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
    ups: Record<string, number>;
    rups: Record<string, number>;
    mining: number; // skill xp
    farming: number;
    combat: number;
    fishing: number;
    crits: number;
    bobbers: number; // treasure bobbers caught
    ach: string[];
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

export type UpKind = "click" | "minion" | "all" | "auto" | "critChance" | "critDmg" | "synergy";

export interface UpgradeDef {
    id: string;
    name: string;
    desc: string;
    kind: UpKind;
    value: number; // multiplier for click/minion/all, per-level amount for the rest
    cost: number;
    growth: number;
    max: number; // 1 = one-time
    symbol: McSymbolName;
    color: string;
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

export const UPGRADES: UpgradeDef[] = [
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
];

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
    { id: "core", name: "Fractured Core", desc: "+0.05 to the rebirth multiplier base (x1.5 per rebirth)", cost: 1, growth: 2, max: 10, symbol: "portal", color: "var(--mc-light-purple)" },
    { id: "head", name: "Head Start", desc: "Begin each rebirth with more shards", cost: 1, growth: 2.5, max: 5, symbol: "speed", color: "var(--mc-yellow)" },
    { id: "disc", name: "Bulk Discount", desc: "-5% minion cost", cost: 2, growth: 2, max: 10, symbol: "fortune", color: "var(--mc-green)" },
    { id: "off", name: "Night Owl", desc: "+10% offline efficiency", cost: 1, growth: 2, max: 5, symbol: "night", color: "var(--mc-blue)" },
];

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

export interface AchDef {
    id: string;
    name: string;
    desc: string;
    check: (s: State) => boolean;
}

const owned = (s: State) => s.minions.reduce((a, b) => a + b, 0);

export const ACHIEVEMENTS: AchDef[] = [
    { id: "c1", name: "First Click", desc: "Click the button once", check: (s) => s.clicks >= 1 },
    { id: "c2", name: "Button Masher", desc: "Click 500 times", check: (s) => s.clicks >= 500 },
    { id: "c3", name: "Carpal Tunnel", desc: "Click 10,000 times", check: (s) => s.clicks >= 1e4 },
    { id: "c4", name: "Unstoppable", desc: "Click 100,000 times", check: (s) => s.clicks >= 1e5 },
    { id: "t1", name: "Pocket Change", desc: "Earn 1,000 lifetime shards", check: (s) => s.total >= 1e3 },
    { id: "t2", name: "Shard Hoarder", desc: "Earn 1 million lifetime shards", check: (s) => s.total >= 1e6 },
    { id: "t3", name: "Billionaire", desc: "Earn 1 billion lifetime shards", check: (s) => s.total >= 1e9 },
    { id: "t4", name: "Trillion Club", desc: "Earn 1 trillion lifetime shards", check: (s) => s.total >= 1e12 },
    { id: "m1", name: "Hired Help", desc: "Own 10 minions", check: (s) => owned(s) >= 10 },
    { id: "m2", name: "Small Business", desc: "Own 100 minions", check: (s) => owned(s) >= 100 },
    { id: "m3", name: "Minion Empire", desc: "Own 500 minions", check: (s) => owned(s) >= 500 },
    { id: "r1", name: "Second Wind", desc: "Rebirth once", check: (s) => s.rebirths >= 1 },
    { id: "r2", name: "Cycle of Shards", desc: "Rebirth 5 times", check: (s) => s.rebirths >= 5 },
    { id: "r3", name: "Ever Fractured", desc: "Rebirth 15 times", check: (s) => s.rebirths >= 15 },
    { id: "s1", name: "Apprentice Miner", desc: "Reach Mining 10", check: (s) => s.mining >= 20 * (Math.pow(1.45, 10) - 1) / 0.45 },
    { id: "s2", name: "Sharp Eyed", desc: "Land 1,000 critical hits", check: (s) => s.crits >= 1e3 },
    { id: "s3", name: "Gone Fishing", desc: "Catch 10 treasure bobbers", check: (s) => s.bobbers >= 10 },
    { id: "s4", name: "Bounty Hunter", desc: "Reach Combat 10", check: (s) => s.combat >= 20 * (Math.pow(1.45, 10) - 1) / 0.45 },
    { id: "u1", name: "Fully Upgraded", desc: "Max out the Auto-Clicker", check: (s) => (s.ups.auto || 0) >= 25 },
    { id: "i1", name: "Explorer", desc: "Unlock 3 islands", check: (s) => ISLANDS.filter((i) => s.total >= i.at).length >= 3 },
    { id: "i2", name: "Island Hopper", desc: "Unlock every island", check: (s) => ISLANDS.every((i) => s.total >= i.at) },
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

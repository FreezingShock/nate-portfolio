import { skillLevel, skillXpFor, type State } from "./data";
import type { McSymbolName } from "@/components/mc-symbol";
import { fmtStat, type EStat } from "./enchant";
import { colSteps, collectionRewards, craftRewards, milestonesOf, type Ladder, type Milestone, type MsReward } from "./milestones";
import { activeIsland } from "./island-logic";
import { upStat } from "./upfx";
import type { Dim } from "./islands";
import type { GrantKind } from "./skills";

// Mining: the skill page. Every press of the big button is a swing of your
// pickaxe: it hits a random ore from the island you are standing on (each
// island has its own ore table, and the Nether and the End have ores of their
// own), harder with your combo. The tool in your hands does the swinging: a
// pickaxe (each has its own power and trait) or, from about Mining 4, the Drill,
// which you assemble from an engine, a head and a core made in the Forge, and
// which swings on its own, also while you are away. Every tool keeps its own
// enchants (Efficiency, Fortune, Silk Touch...). The Forge turns ore into ingots,
// drill parts, pickaxes, consumables and permanent relics on real-time timers;
// every ore fills a collection with ten tiers of milestones; and swings
// sometimes drop geodes that pay tokens, eggs, dust, fragments and even gems. The UI is in
// components/games/fractured-idle/tab-mine.tsx; the permanent bonuses reach the
// rest of the game through mineFx() (added to enchant.allFx).

// TEMPLATE for the other skills (Farming, Foraging): a skill page is one
// lib file for the rules plus one tab file for the screen, and touches the rest
// of the game in six places only:
//   1. State: a `<skill>: <Skill>State` field, with newX() and cleanX() so old
//      saves load (data.ts State, engine.newState and parseSave).
//   2. Input: the thing the player already does feeds the skill (here the big
//      button calls swing()), and idle progress comes from tick<Skill>() that
//      advance() and the offline load both call with the same code.
//   3. Rewards: permanent stats leave through <skill>Fx() (added in enchant.allFx),
//      one-time grants and stats come from a ladder of feats.
//   4. Content tables: things to gather per island/dimension, gear, upgrades,
//      timed crafts, collections with set bonuses, geodes/chests for surprises.
//   5. Quality of life: a goal tracker and one-tap quick actions, so a long
//      session never needs more than a few taps.
//   6. UI hooks: a notes entry for the tab badge (tab-notes), XP sources
//      (fxp.ts), trophies and stats rows, and a slim strip under the big button.
// Balance it with a script like scripts/mine-sim.ts and scripts/fi-sim.ts.

export type OreId =
    | "coal" | "copper" | "iron" | "gold" | "redstone" | "lapis" | "diamond" | "emerald" | "amethyst"
    | "netherrack" | "quartz" | "glowstone" | "soulstone" | "netherite"
    | "endstone" | "purpur" | "voidcrystal" | "fracturite";

export type IngotId = "copperIngot" | "ironIngot" | "goldIngot" | "steel" | "cutDiamond" | "netherAlloy" | "netherIngot" | "voidAlloy" | "fracCore";
export type ResId = OreId | IngotId;
export type Cost = Partial<Record<ResId, number>>;

export interface OreDef {
    id: OreId;
    name: string;
    color: string;
    dim: Dim;
    need: number; // Mining level that opens it
    hard: number; // pick power that mines one unit per swing
    vm: number; // shard value multiplier
    drillCost: number; // ore for the first drill
    reach: number; // how many ores before it (same dimension) its drills also boost
    col: [EStat, number]; // collection reward per tier
    colText: string;
}

export const ORES: OreDef[] = [
    // Overworld
    { id: "coal", name: "Coal", color: "#8a8a99", dim: "overworld", need: 0, hard: 1, vm: 0.6, drillCost: 30, reach: 0, col: ["click", 0.02], colText: "click power" },
    { id: "copper", name: "Copper", color: "#e0874a", dim: "overworld", need: 3, hard: 1.7, vm: 0.8, drillCost: 40, reach: 0, col: ["minion", 0.02], colText: "minion output" },
    { id: "iron", name: "Iron", color: "#d8d8e6", dim: "overworld", need: 8, hard: 3, vm: 1, drillCost: 50, reach: 1, col: ["crit", 0.003], colText: "crit chance" },
    { id: "gold", name: "Gold", color: "#ffcc33", dim: "overworld", need: 14, hard: 5, vm: 1.3, drillCost: 60, reach: 1, col: ["all", 0.01], colText: "all shards" },
    { id: "redstone", name: "Redstone", color: "#ff4d4d", dim: "overworld", need: 20, hard: 8, vm: 1.7, drillCost: 70, reach: 2, col: ["auto", 0.15], colText: "auto-clicks/s" },
    { id: "lapis", name: "Lapis", color: "#5a7dff", dim: "overworld", need: 26, hard: 11, vm: 2.2, drillCost: 80, reach: 2, col: ["dust", 0.03], colText: "Arcane Dust" },
    { id: "diamond", name: "Diamond", color: "#55ffff", dim: "overworld", need: 33, hard: 16, vm: 3, drillCost: 90, reach: 3, col: ["click", 0.04], colText: "click power" },
    { id: "emerald", name: "Emerald", color: "#55ff77", dim: "overworld", need: 40, hard: 24, vm: 4, drillCost: 100, reach: 3, col: ["tokens", 0.05], colText: "rebirth tokens" },
    { id: "amethyst", name: "Amethyst", color: "#c58bff", dim: "overworld", need: 48, hard: 36, vm: 5.5, drillCost: 110, reach: 4, col: ["luck", 0.03], colText: "enchant luck" },
    // The Nether
    { id: "netherrack", name: "Netherrack", color: "#b5483f", dim: "nether", need: 0, hard: 1.4, vm: 0.7, drillCost: 40, reach: 0, col: ["click", 0.02], colText: "click power" },
    { id: "quartz", name: "Quartz", color: "#f1e9e0", dim: "nether", need: 24, hard: 7, vm: 2, drillCost: 70, reach: 0, col: ["minion", 0.03], colText: "minion output" },
    { id: "glowstone", name: "Glowstone", color: "#ffd86b", dim: "nether", need: 30, hard: 12, vm: 2.6, drillCost: 80, reach: 1, col: ["comboMax", 0.06], colText: "max combo" },
    { id: "soulstone", name: "Soulstone", color: "#7fc7ff", dim: "nether", need: 42, hard: 30, vm: 4.5, drillCost: 100, reach: 1, col: ["evFreq", 0.03], colText: "popup frequency" },
    { id: "netherite", name: "Netherite", color: "#c98a9a", dim: "nether", need: 56, hard: 55, vm: 8, drillCost: 130, reach: 3, col: ["all", 0.02], colText: "all shards" },
    // The End
    { id: "endstone", name: "End Stone", color: "#e6e5a8", dim: "end", need: 0, hard: 2, vm: 1, drillCost: 60, reach: 0, col: ["click", 0.02], colText: "click power" },
    { id: "purpur", name: "Purpur", color: "#c48ae0", dim: "end", need: 36, hard: 18, vm: 3.4, drillCost: 90, reach: 0, col: ["offline", 0.015], colText: "offline earnings" },
    { id: "voidcrystal", name: "Void Crystal", color: "#8a7bff", dim: "end", need: 52, hard: 45, vm: 6.5, drillCost: 120, reach: 1, col: ["luck", 0.03], colText: "enchant luck" },
    { id: "fracturite", name: "Fracturite", color: "#ff6fe0", dim: "end", need: 60, hard: 90, vm: 12, drillCost: 150, reach: 2, col: ["all", 0.03], colText: "all shards" },
];
export const ORE_BY_ID = Object.fromEntries(ORES.map((o) => [o.id, o])) as Record<OreId, OreDef>;
const ORE_IDS = new Set<string>(ORES.map((o) => o.id));
export const DIM_ORES: Record<Dim, OreDef[]> = {
    overworld: ORES.filter((o) => o.dim === "overworld"),
    nether: ORES.filter((o) => o.dim === "nether"),
    end: ORES.filter((o) => o.dim === "end"),
};
export const DIMS: Dim[] = ["overworld", "nether", "end"];
export const DIM_LABEL: Record<Dim, { name: string; color: string }> = {
    overworld: { name: "Overworld", color: "var(--mc-green)" },
    nether: { name: "The Nether", color: "var(--mc-red)" },
    end: { name: "The End", color: "var(--mc-light-purple)" },
};

export interface IngotDef {
    id: IngotId;
    name: string;
    color: string;
}
export const INGOTS: IngotDef[] = [
    { id: "copperIngot", name: "Copper Ingot", color: "#e0874a" },
    { id: "ironIngot", name: "Iron Ingot", color: "#d8d8e6" },
    { id: "goldIngot", name: "Gold Ingot", color: "#ffcc33" },
    { id: "steel", name: "Steel", color: "#9fb4c8" },
    { id: "cutDiamond", name: "Cut Diamond", color: "#55ffff" },
    { id: "netherAlloy", name: "Nether Alloy", color: "#ff8a5c" },
    { id: "netherIngot", name: "Netherite Ingot", color: "#c98a9a" },
    { id: "voidAlloy", name: "Void Alloy", color: "#8a7bff" },
    { id: "fracCore", name: "Fractured Core", color: "#ff6fe0" },
];
export const INGOT_BY_ID = Object.fromEntries(INGOTS.map((i) => [i.id, i])) as Record<IngotId, IngotDef>;
const INGOT_IDS = new Set<string>(INGOTS.map((i) => i.id));

export const isOre = (id: string): id is OreId => ORE_IDS.has(id);
export const resInfo = (id: ResId): { name: string; color: string } => (isOre(id) ? ORE_BY_ID[id] : INGOT_BY_ID[id]);

// ---- Island ore tables ----
// Which ores drop where, and how often. Ores above your Mining level stay
// locked, so a table always keeps a cheap filler (coal, netherrack, end stone).

const T = (s: string): [OreId, number][] => s.split(" ").map((p) => [p.split(":")[0] as OreId, Number(p.split(":")[1])]);

export const ISLAND_ORES: Record<string, [OreId, number][]> = {
    hub: T("coal:60 copper:30 iron:10"),
    farm: T("coal:40 copper:45 iron:15"),
    mine: T("coal:25 copper:25 iron:30 gold:15 redstone:5"),
    park: T("coal:35 copper:25 iron:12 gold:13 emerald:12"),
    caverns: T("iron:18 gold:15 redstone:17 lapis:20 diamond:20 emerald:10"),
    den: T("redstone:20 lapis:15 diamond:20 amethyst:30 emerald:15"),
    reef: T("copper:25 iron:20 lapis:25 amethyst:20 diamond:10"),
    garden: T("coal:20 copper:20 emerald:30 amethyst:30"),
    sanctuary: T("coal:30 copper:30 iron:20 gold:20"),
    casino: T("gold:45 redstone:20 diamond:15 emerald:20"),
    crimson: T("netherrack:30 quartz:40 gold:10 glowstone:20"),
    fortress: T("netherrack:20 quartz:30 glowstone:30 soulstone:15 netherite:5"),
    soul: T("netherrack:15 soulstone:40 quartz:25 glowstone:10 netherite:10"),
    forge: T("netherrack:10 netherite:25 quartz:20 glowstone:20 diamond:25"),
    arena: T("netherrack:10 soulstone:30 glowstone:25 quartz:25 netherite:10"),
    end: T("endstone:60 purpur:35 voidcrystal:5"),
    dragon: T("endstone:30 purpur:45 voidcrystal:20 fracturite:5"),
    void: T("endstone:20 purpur:25 voidcrystal:40 fracturite:15"),
    fractured: T("endstone:10 purpur:20 voidcrystal:30 fracturite:40"),
    tempest: T("endstone:10 purpur:30 voidcrystal:35 fracturite:25"),
    spire: T("endstone:5 purpur:20 voidcrystal:30 fracturite:45"),
};
const DIM_DEFAULT: Record<Dim, [OreId, number][]> = {
    overworld: ISLAND_ORES.hub,
    nether: ISLAND_ORES.crimson,
    end: ISLAND_ORES.end,
};

/** Islands that carry an ore, for the "where do I find it" hints. */
export const oreIslands = (id: OreId): string[] => Object.entries(ISLAND_ORES).filter(([, t]) => t.some(([o]) => o === id)).map(([k]) => k);

/** Mined-count thresholds for each collection tier (ten tiers; the first five are the old ones). */
export const COL_AT = [50, 250, 1500, 8000, 40000, 150000, 600000, 2000000, 8000000, 40000000];
export const colTierOf = (mined: number) => COL_AT.filter((n) => mined >= n).length;

// ---- What each dimension does to mining ----

export interface DimFxDef {
    tag: string;
    xp: number; // Mining XP multiplier
    yield: number; // ore multiplier
    rush: number; // extra swings in an Ore Rush
    geode: number; // geode chance multiplier
    drill: number; // drill swing multiplier
    blurb: string;
    lines: string[];
}
export const DIM_FX: Record<Dim, DimFxDef> = {
    overworld: { tag: "Steady", xp: 1.12, yield: 1, rush: 0, geode: 1, drill: 1, blurb: "Honest rock. The best place to learn and to level.", lines: ["+12% Mining XP"] },
    nether: { tag: "Molten", xp: 1, yield: 1.12, rush: 4, geode: 1.25, drill: 1, blurb: "Hot veins break easy and pay in bulk.", lines: ["+12% ore", "Ore Rush lasts 4 swings longer", "+25% geode chance"] },
    end: { tag: "Void", xp: 1.05, yield: 1.08, rush: 2, geode: 1.6, drill: 1.25, blurb: "Thin air, strange stone and a lot of geodes.", lines: ["+60% geode chance", "+25% drill swings", "+8% ore, +5% Mining XP", "Ore Rush lasts 2 swings longer"] },
};
/** The mining effects of the dimension you are standing in. */
export const dimFx = (s: State): DimFxDef => DIM_FX[activeIsland(s).dim];

// ---- Pickaxes: wield one. Each has its own power and a signature trait. ----

export interface PickTrait {
    yield?: number; // +ore
    geode?: number; // +geode chance
    lucky?: number; // +triple haul chance
    xp?: number; // +Mining XP
    rush?: number; // +Ore Rush swings
}
export interface PickDef {
    id: string;
    name: string;
    color: string;
    power: number;
    need: number;
    tier: number; // 1 to 10: how many enchant levels it can hold, and what it adds to the whole game
    trait: PickTrait;
    traitText: string;
    cost: Cost;
    time: number; // forge seconds
}
export const PICKS: PickDef[] = [
    { id: "wood", name: "Wooden Pickaxe", color: "#b98a4a", power: 1, need: 0, tier: 1, trait: {}, traitText: "Plain and honest", cost: {}, time: 0 },
    { id: "stone", name: "Stone Pickaxe", color: "#a0a0ac", power: 1.8, need: 1, tier: 2, trait: {}, traitText: "Plain and honest", cost: { coal: 40 }, time: 45 },
    { id: "copper", name: "Copper Pickaxe", color: "#e0874a", power: 3, need: 4, tier: 3, trait: { yield: 0.08 }, traitText: "+8% ore", cost: { copperIngot: 3, coal: 120 }, time: 90 },
    { id: "iron", name: "Iron Pickaxe", color: "#d8d8e6", power: 5, need: 9, tier: 4, trait: { lucky: 0.04 }, traitText: "+4% triple haul chance", cost: { ironIngot: 4, copperIngot: 4 }, time: 180 },
    { id: "steel", name: "Steel Pickaxe", color: "#9fb4c8", power: 8, need: 15, tier: 5, trait: { xp: 0.15 }, traitText: "+15% Mining XP", cost: { steel: 4, goldIngot: 2 }, time: 360 },
    { id: "gold", name: "Golden Pickaxe", color: "#ffcc33", power: 9, need: 20, tier: 6, trait: { yield: 0.22, lucky: 0.03 }, traitText: "+22% ore, +3% triple haul (soft, but rich)", cost: { goldIngot: 6, steel: 4 }, time: 600 },
    { id: "diamond", name: "Diamond Pickaxe", color: "#55ffff", power: 17, need: 28, tier: 7, trait: { geode: 0.3, xp: 0.1 }, traitText: "+30% geode chance, +10% Mining XP", cost: { cutDiamond: 6, steel: 6 }, time: 1200 },
    { id: "nether", name: "Netherite Pickaxe", color: "#c98a9a", power: 28, need: 40, tier: 8, trait: { yield: 0.12, xp: 0.15 }, traitText: "+12% ore, +15% Mining XP", cost: { netherIngot: 4, cutDiamond: 6 }, time: 2400 },
    { id: "void", name: "Void Pickaxe", color: "#8a7bff", power: 44, need: 50, tier: 9, trait: { geode: 0.4, rush: 3 }, traitText: "+40% geode chance, +3 Ore Rush swings", cost: { voidAlloy: 4, netherIngot: 6 }, time: 4800 },
    { id: "cosmic", name: "Cosmic Pickaxe", color: "#ffb3f2", power: 70, need: 58, tier: 10, trait: { yield: 0.2, xp: 0.2, lucky: 0.06 }, traitText: "+20% ore, +20% Mining XP, +6% triple haul", cost: { fracCore: 3, voidAlloy: 6 }, time: 9000 },
];
export const PICK_BY_ID = Object.fromEntries(PICKS.map((p) => [p.id, p])) as Record<string, PickDef>;
/** Click power every tier of your best tool adds for the rest of the game. */
export const PICK_CLICK = 0.025;

// ---- The Drill: an engine and a head (and a core) made in the Forge, installed on one drill ----

export type PartKind = "engine" | "head" | "core";
export interface CoreFx {
    yield?: number;
    geode?: number;
    rush?: number; // extra swings in an Ore Rush
    rushYield?: number;
    xp?: number;
    speed?: number; // drill swings
    power?: number;
    all?: number; // all shards, permanently while installed
}
export interface PartDef {
    id: string;
    kind: PartKind;
    name: string;
    color: string;
    tier: number; // 1 up within its kind
    need: number;
    desc: string;
    swings?: number; // engines: swings per second
    power?: number; // heads: pick power
    fx?: CoreFx; // cores
    cost: Cost;
    time: number;
}
export const PARTS: PartDef[] = [
    { id: "eng1", kind: "engine", name: "Copper Motor", color: "#e0874a", tier: 1, need: 3, swings: 0.5, desc: "A small motor: 0.5 swings a second", cost: { copperIngot: 4, coal: 80 }, time: 60 },
    { id: "eng2", kind: "engine", name: "Iron Motor", color: "#d8d8e6", tier: 2, need: 9, swings: 1.2, desc: "1.2 swings a second", cost: { ironIngot: 4, copperIngot: 3 }, time: 180 },
    { id: "eng3", kind: "engine", name: "Steel Engine", color: "#9fb4c8", tier: 3, need: 16, swings: 2.5, desc: "2.5 swings a second", cost: { steel: 4, goldIngot: 2 }, time: 600 },
    { id: "eng4", kind: "engine", name: "Diamond Engine", color: "#55ffff", tier: 4, need: 28, swings: 4.5, desc: "4.5 swings a second", cost: { cutDiamond: 5, steel: 5 }, time: 1800 },
    { id: "eng5", kind: "engine", name: "Netherite Engine", color: "#c98a9a", tier: 5, need: 42, swings: 8, desc: "8 swings a second", cost: { netherIngot: 3, cutDiamond: 5 }, time: 3600 },
    { id: "eng6", kind: "engine", name: "Void Engine", color: "#8a7bff", tier: 6, need: 54, swings: 14, desc: "14 swings a second", cost: { voidAlloy: 4, netherIngot: 5 }, time: 7200 },
    { id: "hd1", kind: "head", name: "Copper Bit", color: "#e0874a", tier: 1, need: 4, power: 3.4, desc: "Pick power 3.4", cost: { copperIngot: 3, coal: 100 }, time: 60 },
    { id: "hd2", kind: "head", name: "Iron Bit", color: "#d8d8e6", tier: 2, need: 9, power: 6.2, desc: "Pick power 6.2", cost: { ironIngot: 4, copperIngot: 3 }, time: 180 },
    { id: "hd3", kind: "head", name: "Steel Bit", color: "#9fb4c8", tier: 3, need: 15, power: 10.5, desc: "Pick power 10.5", cost: { steel: 4, goldIngot: 2 }, time: 600 },
    { id: "hd4", kind: "head", name: "Diamond Bit", color: "#55ffff", tier: 4, need: 27, power: 19, desc: "Pick power 19", cost: { cutDiamond: 5, steel: 5 }, time: 1800 },
    { id: "hd5", kind: "head", name: "Netherite Bit", color: "#c98a9a", tier: 5, need: 40, power: 33, desc: "Pick power 33", cost: { netherIngot: 3, cutDiamond: 5 }, time: 3600 },
    { id: "hd6", kind: "head", name: "Void Bit", color: "#8a7bff", tier: 6, need: 50, power: 54, desc: "Pick power 54", cost: { voidAlloy: 4, netherIngot: 5 }, time: 7200 },
    { id: "hd7", kind: "head", name: "Cosmic Bit", color: "#ffb3f2", tier: 7, need: 58, power: 88, desc: "Pick power 88", cost: { fracCore: 3, voidAlloy: 5 }, time: 14400 },
    { id: "core1", kind: "core", name: "Fortune Core", color: "#ffcc33", tier: 1, need: 14, fx: { yield: 0.25 }, desc: "+25% ore from everything", cost: { goldIngot: 6, steel: 3 }, time: 900 },
    { id: "core2", kind: "core", name: "Prospector Core", color: "#5a7dff", tier: 2, need: 22, fx: { geode: 0.6 }, desc: "+60% geode chance", cost: { cutDiamond: 3, goldIngot: 4 }, time: 1500 },
    { id: "core3", kind: "core", name: "Rush Core", color: "#ff9a4d", tier: 3, need: 26, fx: { rush: 4, rushYield: 0.2 }, desc: "+4 Ore Rush swings and +20% Rush ore", cost: { steel: 6, redstone: 200 }, time: 2400 },
    { id: "core4", kind: "core", name: "Scholar Core", color: "#55ff77", tier: 4, need: 34, fx: { xp: 0.3 }, desc: "+30% Mining XP", cost: { cutDiamond: 4, steel: 4 }, time: 3000 },
    { id: "core5", kind: "core", name: "Overclock Core", color: "#ff5a4d", tier: 5, need: 46, fx: { speed: 0.25, power: 0.1 }, desc: "+25% drill swings and +10% power", cost: { netherAlloy: 6, cutDiamond: 6 }, time: 5400 },
    { id: "core6", kind: "core", name: "Singularity Core", color: "#ff6fe0", tier: 6, need: 58, fx: { all: 0.05, yield: 0.15 }, desc: "+5% all shards and +15% ore", cost: { fracCore: 3, netherIngot: 4 }, time: 14400 },
];
export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<string, PartDef>;
export const ENGINES = PARTS.filter((p) => p.kind === "engine");
export const HEADS = PARTS.filter((p) => p.kind === "head");
export const CORES = PARTS.filter((p) => p.kind === "core");
const PART_IDS = new Set<string>(PARTS.map((p) => p.id));
export const PART_KIND_LABEL: Record<PartKind, string> = { engine: "Engine", head: "Drill head", core: "Core" };

export interface Rig {
    engine: string;
    head: string;
    core: string;
}

// ---- Enchants: levels on one tool (each pickaxe and the drill keep their own) ----

export interface EnchDef {
    id: string;
    name: string;
    desc: string;
    tool: "any" | "drill"; // drill-only enchants do nothing on a pickaxe
    color: string;
    cost: Cost; // level 0 price; each level multiplies it by growth
    growth: number;
    max: number;
    need: number;
}
export const ENCHANTS: EnchDef[] = [
    { id: "eff", name: "Efficiency", desc: "+8% power per level", tool: "any", color: "#ffd23a", cost: { coal: 15 }, growth: 1.35, max: 25, need: 0 },
    { id: "fort", name: "Fortune", desc: "+8% ore from everything per level", tool: "any", color: "#55ff77", cost: { copper: 12 }, growth: 1.38, max: 25, need: 3 },
    { id: "lucky", name: "Lucky Strike", desc: "+1.5% chance of a triple haul per level", tool: "any", color: "#9be08a", cost: { iron: 10 }, growth: 1.4, max: 20, need: 8 },
    { id: "seismic", name: "Vein Miner", desc: "The vein meter fills 4% faster per level", tool: "any", color: "#ff9a4d", cost: { gold: 8 }, growth: 1.42, max: 15, need: 14 },
    { id: "seeker", name: "Silk Touch", desc: "+10% geode chance per level", tool: "any", color: "#c58bff", cost: { redstone: 8 }, growth: 1.4, max: 20, need: 20 },
    { id: "prosp", name: "Prospector", desc: "Rarer ore shows up more often", tool: "any", color: "#5a7dff", cost: { lapis: 8 }, growth: 1.45, max: 15, need: 26 },
    { id: "explosive", name: "Explosive", desc: "+1.2% chance per level that a swing blasts for six times the ore", tool: "any", color: "#ff6a4d", cost: { diamond: 6 }, growth: 1.5, max: 15, need: 30 },
    { id: "rush", name: "Rush Rig", desc: "+2 swings and +10% ore in an Ore Rush per level", tool: "any", color: "#ffb84d", cost: { diamond: 5 }, growth: 1.5, max: 10, need: 33 },
    { id: "scholar", name: "Experience", desc: "+6% Mining XP per level", tool: "any", color: "#55ffff", cost: { emerald: 6 }, growth: 1.45, max: 15, need: 40 },
    { id: "deep", name: "Deep Core", desc: "+1% all shards per level", tool: "any", color: "#c58bff", cost: { amethyst: 5 }, growth: 1.5, max: 15, need: 48 },
    { id: "ancient", name: "Ancient Power", desc: "+1.5% all shards and +2% tokens per level", tool: "any", color: "#c98a9a", cost: { netherite: 3 }, growth: 1.6, max: 10, need: 56 },
    { id: "bit", name: "Carbide Bit", desc: "The drill hits 15% harder per level", tool: "drill", color: "#d8d8e6", cost: { iron: 12 }, growth: 1.4, max: 25, need: 5 },
    { id: "motor", name: "Turbo Motor", desc: "The drill swings 6% faster per level", tool: "drill", color: "#e0874a", cost: { copper: 15 }, growth: 1.4, max: 25, need: 5 },
    { id: "magnet", name: "Ore Magnet", desc: "+5% ore from the drill's own swings per level", tool: "drill", color: "#ffcc33", cost: { gold: 10 }, growth: 1.45, max: 25, need: 14 },
    { id: "sifter", name: "Gem Sifter", desc: "The drill finds 12% more geodes per level", tool: "drill", color: "#5a7dff", cost: { lapis: 6 }, growth: 1.45, max: 15, need: 24 },
    { id: "cracker", name: "Geode Crusher", desc: "Cracks geodes for you, faster every level", tool: "drill", color: "#9fb4c8", cost: { steel: 2 }, growth: 1.8, max: 5, need: 22 },
];
export const ENCH_BY_ID = Object.fromEntries(ENCHANTS.map((e) => [e.id, e])) as Record<string, EnchDef>;
const ENCH_IDS = new Set<string>(ENCHANTS.map((e) => e.id));

export type UpCat = "forge";

export interface MineUpDef {
    id: string;
    name: string;
    desc: string;
    cat: UpCat;
    cost: Cost; // level 0 price; each level multiplies it by growth
    growth: number;
    max: number;
    need: number;
}
export const MINE_UPS: MineUpDef[] = [
    { id: "furnace", name: "Extra Furnace", desc: "One more crafting slot", cat: "forge", cost: { copperIngot: 6 }, growth: 2.2, max: 3, need: 10 },
    { id: "bellows", name: "Bellows", desc: "Crafts finish 8% sooner per level", cat: "forge", cost: { iron: 20 }, growth: 1.35, max: 20, need: 8 },
    { id: "smelter", name: "Efficient Smelting", desc: "Ingot recipes use 3% less ore per level", cat: "forge", cost: { gold: 15 }, growth: 1.4, max: 15, need: 12 },
    { id: "tongs", name: "Auto-Tongs", desc: "Furnaces empty themselves, and a craft can repeat on its own", cat: "forge", cost: { steel: 4 }, growth: 1, max: 1, need: 18 },
    { id: "anvil", name: "Master Anvil", desc: "8% chance per level to craft a double batch", cat: "forge", cost: { steel: 3 }, growth: 1.6, max: 10, need: 26 },
];
export const MINE_UP_BY_ID = Object.fromEntries(MINE_UPS.map((u) => [u.id, u])) as Record<string, MineUpDef>;

// ---- Forge recipes ----

export type RecipeKind = "ingot" | "part" | "pick" | "item" | "relic";
export type ItemId = "dynamite" | "rushPotion" | "geodeCache";

export interface RecipeDef {
    id: string;
    kind: RecipeKind;
    name: string;
    desc: string;
    color: string;
    need: number;
    time: number; // seconds for one
    inputs: Cost;
    out: string; // ingot id, part id, pickaxe id, item id or relic id
}

export const ITEMS: { id: ItemId; name: string; desc: string; color: string }[] = [
    { id: "dynamite", name: "Dynamite", desc: "Blasts 80 swings of ore at once, right where you stand", color: "#ff6a4d" },
    { id: "rushPotion", name: "Rush Potion", desc: "Starts an Ore Rush immediately", color: "#ffd23a" },
    { id: "geodeCache", name: "Geode Cache", desc: "Opens into 3 geodes native to your current dimension", color: "#c58bff" },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, (typeof ITEMS)[number]>;
const ITEM_IDS = new Set<string>(ITEMS.map((i) => i.id));

const BASE_RECIPES: RecipeDef[] = [
    // Ingots: the materials every pickaxe, drill part and relic is made of
    { id: "copperIngot", kind: "ingot", name: "Copper Ingot", desc: "Smelt copper ore", color: "#e0874a", need: 3, time: 20, inputs: { copper: 20 }, out: "copperIngot" },
    { id: "ironIngot", kind: "ingot", name: "Iron Ingot", desc: "Smelt iron ore", color: "#d8d8e6", need: 8, time: 45, inputs: { iron: 25 }, out: "ironIngot" },
    { id: "goldIngot", kind: "ingot", name: "Gold Ingot", desc: "Smelt gold ore", color: "#ffcc33", need: 14, time: 90, inputs: { gold: 25 }, out: "goldIngot" },
    { id: "steel", kind: "ingot", name: "Steel", desc: "Iron and coal, folded hot", color: "#9fb4c8", need: 12, time: 150, inputs: { iron: 30, coal: 60 }, out: "steel" },
    { id: "cutDiamond", kind: "ingot", name: "Cut Diamond", desc: "Diamond ground with redstone grit", color: "#55ffff", need: 30, time: 360, inputs: { diamond: 30, redstone: 20 }, out: "cutDiamond" },
    { id: "netherAlloy", kind: "ingot", name: "Nether Alloy", desc: "Quartz and glowstone bound with gold", color: "#ff8a5c", need: 28, time: 600, inputs: { quartz: 30, glowstone: 20, goldIngot: 1 }, out: "netherAlloy" },
    { id: "netherIngot", kind: "ingot", name: "Netherite Ingot", desc: "Netherite scrap and a Nether Alloy", color: "#c98a9a", need: 56, time: 1800, inputs: { netherite: 20, netherAlloy: 1 }, out: "netherIngot" },
    { id: "voidAlloy", kind: "ingot", name: "Void Alloy", desc: "Purpur and void crystal under pressure", color: "#8a7bff", need: 50, time: 1200, inputs: { purpur: 30, voidcrystal: 20 }, out: "voidAlloy" },
    { id: "fracCore", kind: "ingot", name: "Fractured Core", desc: "Fracturite wrapped around Void Alloy", color: "#ff6fe0", need: 60, time: 3600, inputs: { fracturite: 15, voidAlloy: 2 }, out: "fracCore" },
    // Consumables
    { id: "dynamite", kind: "item", name: "Dynamite", desc: "Blasts 80 swings of ore at once", color: "#ff6a4d", need: 6, time: 30, inputs: { coal: 80, copper: 40 }, out: "dynamite" },
    { id: "rushPotion", kind: "item", name: "Rush Potion", desc: "Starts an Ore Rush immediately", color: "#ffd23a", need: 18, time: 120, inputs: { redstone: 40, goldIngot: 1 }, out: "rushPotion" },
    { id: "geodeCache", kind: "item", name: "Geode Cache", desc: "Three geodes from your current dimension", color: "#c58bff", need: 24, time: 300, inputs: { lapis: 30, steel: 1 }, out: "geodeCache" },
    // Relics: one of each, permanent, slow
    { id: "lamp", kind: "relic", name: "Miner's Lamp", desc: "+6% ore from everything", color: "#ffe29a", need: 5, time: 300, inputs: { copperIngot: 4, coal: 400 }, out: "lamp" },
    { id: "grip", kind: "relic", name: "Iron Grip", desc: "+10% pick power", color: "#d8d8e6", need: 12, time: 1200, inputs: { ironIngot: 6, steel: 2 }, out: "grip" },
    { id: "pan", kind: "relic", name: "Prospector's Pan", desc: "+20% geode chance, rarer ore", color: "#ffcc33", need: 18, time: 3600, inputs: { goldIngot: 6, steel: 4 }, out: "pan" },
    { id: "pebble", kind: "relic", name: "Lucky Pebble", desc: "+6% chance of a triple haul", color: "#9be08a", need: 15, time: 2400, inputs: { goldIngot: 3, ironIngot: 4 }, out: "pebble" },
    { id: "totem", kind: "relic", name: "Rush Totem", desc: "+6 swings in every Ore Rush", color: "#ffb84d", need: 22, time: 5400, inputs: { goldIngot: 8, redstone: 300 }, out: "totem" },
    { id: "compass", kind: "relic", name: "Gold Compass", desc: "+2.5% all shards", color: "#ffd23a", need: 24, time: 7200, inputs: { goldIngot: 10, lapis: 200 }, out: "compass" },
    { id: "heart", kind: "relic", name: "Steel Heart", desc: "+25% drill output, crafts 10% sooner", color: "#9fb4c8", need: 30, time: 14400, inputs: { steel: 10, redstone: 400 }, out: "heart" },
    { id: "dcore", kind: "relic", name: "Drill Core", desc: "+20% drill output, +10% drill swings", color: "#7fd0ff", need: 34, time: 28800, inputs: { steel: 8, cutDiamond: 3 }, out: "dcore" },
    { id: "core", kind: "relic", name: "Diamond Core", desc: "+8% click power", color: "#55ffff", need: 36, time: 21600, inputs: { cutDiamond: 8, steel: 8 }, out: "core" },
    { id: "lens", kind: "relic", name: "Nether Lens", desc: "+10% ore, +10% minion output", color: "#ff8a5c", need: 44, time: 28800, inputs: { netherAlloy: 6, cutDiamond: 4 }, out: "lens" },
    { id: "anchor", kind: "relic", name: "Void Anchor", desc: "+15% pick power, +5 Ore Rush swings", color: "#8a7bff", need: 52, time: 43200, inputs: { voidAlloy: 6, netherIngot: 4 }, out: "anchor" },
    { id: "crown", kind: "relic", name: "Fractured Crown", desc: "+6% all shards, +8% tokens", color: "#ff6fe0", need: 60, time: 57600, inputs: { fracCore: 4 }, out: "crown" },
];
export const RECIPES: RecipeDef[] = [
    ...BASE_RECIPES.filter((r) => r.kind === "ingot"),
    ...PARTS.map((p): RecipeDef => ({ id: p.id, kind: "part", name: p.name, desc: p.desc, color: p.color, need: p.need, time: p.time, inputs: p.cost, out: p.id })),
    ...PICKS.filter((p) => p.time > 0).map((p): RecipeDef => ({ id: `pk_${p.id}`, kind: "pick", name: p.name, desc: p.traitText, color: p.color, need: p.need, time: p.time, inputs: p.cost, out: p.id })),
    ...BASE_RECIPES.filter((r) => r.kind !== "ingot"),
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r])) as Record<string, RecipeDef>;
export const RELICS = RECIPES.filter((r) => r.kind === "relic");
const RELIC_IDS = new Set<string>(RELICS.map((r) => r.id));
const RECIPE_IDS = new Set<string>(RECIPES.map((r) => r.id));
/** Recipes that make something you keep one of. */
export const isOnce = (r: RecipeDef) => r.kind === "relic" || r.kind === "part" || r.kind === "pick";

/** Where a resource is used: the recipes (and tools) that need it, for "what is this for". */
export const usedIn = (id: string): RecipeDef[] => RECIPES.filter((r) => id in r.inputs);

export interface Job {
    r: string; // recipe id
    n: number; // batch size
    end: number; // epoch ms when it is done
    slot: number; // which furnace it sits in (stays put while others finish)
    loop?: boolean; // Auto-Tongs: collect it and start it again
}

export interface LogEntry {
    text: string;
    color: string;
    t?: number; // when it last happened (ms)
    n?: number; // how many times in a row
}

export interface MineState {
    ore: Record<string, number>; // ore in stock
    mined: Record<string, number>; // lifetime per ore (collection)
    ingots: Record<string, number>;
    items: Record<string, number>; // crafted consumables
    made: Record<string, number>; // lifetime crafted per ingot (milestones)
    relics: string[]; // crafted relics (owned)
    equipped: string[]; // relics that are switched on (limited slots)
    claimed: string[]; // milestones paid
    broken: number; // ore nodes broken by hand on the rock face
    picks: string[]; // pickaxes owned
    parts: string[]; // drill parts owned
    rig: Rig; // the parts installed on the drill
    held: string; // the tool in your hands: a pickaxe id or "drill"
    ench: Record<string, Record<string, number>>; // enchant levels per tool id
    ups: Record<string, number>; // forge upgrades
    nodes: number; // swings made (by you, by auto-clicks and by the drill)
    rushes: number; // Ore Rushes started
    geodes: Record<string, number>; // waiting to be cracked, per dimension
    cracked: number; // geodes cracked
    focus: string; // ore to prospect for ("" = anything)
    vein: number; // 0..1 toward the next Ore Rush
    rush: number; // swings left in the current Ore Rush
    gfrac: Record<string, number>; // geode progress between whole geodes (drill and offline)
    crackT: number; // seconds toward the next auto-crack
    jobs: Job[];
    crafted: number; // forge batches collected
    log: LogEntry[]; // recent finds, newest first
}

export const newMine = (): MineState => ({
    ore: {}, mined: {}, ingots: {}, items: {}, made: {}, relics: [], equipped: [], claimed: [], broken: 0, picks: ["wood"], parts: [], rig: { engine: "", head: "", core: "" }, held: "wood", ench: {},
    ups: {}, nodes: 0, rushes: 0, geodes: {}, cracked: 0, focus: "", vein: 0, rush: 0, gfrac: {}, crackT: 0, jobs: [], crafted: 0, log: [],
});

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function cleanMine(raw: unknown): MineState {
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const out = newMine();
    const rec = (src: unknown, keep: (k: string) => boolean, floor = false) => {
        const r: Record<string, number> = {};
        for (const [k, v] of Object.entries(src && typeof src === "object" ? (src as Record<string, unknown>) : {})) if (keep(k) && num(v) > 0) r[k] = floor ? Math.floor(num(v)) : num(v);
        return r;
    };
    const strs = (src: unknown, keep: (x: string) => boolean) => (Array.isArray(src) ? src : []).filter((x, i, a): x is string => typeof x === "string" && keep(x) && a.indexOf(x) === i);
    out.ore = rec(o.ore, (k) => ORE_IDS.has(k));
    out.mined = rec(o.mined, (k) => ORE_IDS.has(k));
    out.ingots = rec(o.ingots, (k) => INGOT_IDS.has(k), true);
    out.items = rec(o.items, (k) => ITEM_IDS.has(k), true);
    out.made = rec(o.made, (k) => INGOT_IDS.has(k), true);
    out.relics = strs(o.relics, (x) => RELIC_IDS.has(x));
    out.equipped = strs(Array.isArray(o.equipped) ? o.equipped : out.relics, (x) => out.relics.includes(x)).slice(0, 4);
    out.claimed = (Array.isArray(o.claimed) ? o.claimed : []).filter((x, i, a): x is string => typeof x === "string" && a.indexOf(x) === i).slice(0, 400);
    out.broken = Math.max(0, Math.floor(num(o.broken)));
    out.ups = rec(o.ups, (k) => !!MINE_UP_BY_ID[k], true);
    for (const u of MINE_UPS) if (out.ups[u.id]) out.ups[u.id] = Math.min(u.max, out.ups[u.id]);
    out.nodes = Math.max(0, Math.floor(num(o.nodes)));
    out.rushes = Math.max(0, Math.floor(num(o.rushes ?? o.golden)));
    // Older saves kept a single geode count (overworld).
    out.geodes = typeof o.geodes === "number" ? (num(o.geodes) > 0 ? { overworld: Math.floor(num(o.geodes)) } : {}) : rec(o.geodes, (k) => (DIMS as string[]).includes(k), true);
    out.cracked = Math.max(0, Math.floor(num(o.cracked)));
    out.focus = typeof o.focus === "string" && ORE_IDS.has(o.focus) ? o.focus : "";
    out.vein = Math.max(0, Math.min(1, num(o.vein)));
    out.rush = Math.max(0, Math.min(60, Math.floor(num(o.rush))));
    out.gfrac = rec(o.gfrac, (k) => (DIMS as string[]).includes(k));
    out.crackT = Math.max(0, num(o.crackT));
    out.jobs = (Array.isArray(o.jobs) ? (o.jobs as Record<string, unknown>[]) : [])
        .filter((j) => j && typeof j.r === "string" && RECIPE_IDS.has(j.r) && num(j.end) > 0)
        .map((j, i) => ({ r: String(j.r), n: Math.max(1, Math.min(50, Math.floor(num(j.n, 1)))), end: num(j.end), slot: Math.max(0, Math.floor(num(j.slot, i))), loop: j.loop === true || undefined }))
        .slice(0, 4);
    // Every job needs its own furnace, 0 to 3.
    const taken = new Set<number>();
    for (const j of out.jobs) {
        let k = j.slot > 3 || taken.has(j.slot) ? 0 : j.slot;
        while (taken.has(k)) k++;
        j.slot = k;
        taken.add(k);
    }
    out.crafted = Math.max(0, Math.floor(num(o.crafted)));
    out.log = (Array.isArray(o.log) ? (o.log as Record<string, unknown>[]) : [])
        .filter((e) => e && typeof e.text === "string" && typeof e.color === "string")
        .map((e) => ({ text: String(e.text).slice(0, 80), color: String(e.color).slice(0, 40), t: Number(e.t) > 0 ? Number(e.t) : undefined, n: Number(e.n) > 1 ? Math.min(999, Math.floor(Number(e.n))) : undefined }))
        .slice(0, 8);

    // Tools. A save from before the Drill update has `pick` (an index), hand and rig upgrades, and ore-built drills: they become a
    // pickaxe collection, enchants and an installed drill, so nothing is lost.
    const legacyPick = Math.max(0, Math.min(PICKS.length - 1, Math.floor(num(o.pick))));
    out.picks = strs(o.picks, (x) => !!PICK_BY_ID[x]);
    if (!out.picks.includes("wood")) out.picks.unshift("wood");
    if (o.picks === undefined) out.picks = PICKS.slice(0, legacyPick + 1).map((p) => p.id);
    out.parts = strs(o.parts, (x) => PART_IDS.has(x));
    const rg = (o.rig && typeof o.rig === "object" ? o.rig : {}) as Record<string, unknown>;
    out.rig = { engine: "", head: "", core: "" };
    for (const k of ["engine", "head", "core"] as const) {
        const v = rg[k];
        if (typeof v === "string" && out.parts.includes(v) && PART_BY_ID[v].kind === k) out.rig[k] = v;
    }
    const ench: Record<string, Record<string, number>> = {};
    const rawE = (o.ench && typeof o.ench === "object" ? o.ench : {}) as Record<string, unknown>;
    for (const [tool, lv] of Object.entries(rawE)) {
        if (tool !== "drill" && !PICK_BY_ID[tool]) continue;
        const e = rec(lv, (k) => ENCH_IDS.has(k), true);
        if (Object.keys(e).length) ench[tool] = e;
    }
    out.ench = ench;
    const oldDrills = Object.values((o.drills && typeof o.drills === "object" ? o.drills : {}) as Record<string, unknown>).reduce<number>((a, b) => a + Math.max(0, Math.floor(num(b))), 0);
    if (o.picks === undefined) {
        const oldUps = (o.ups && typeof o.ups === "object" ? o.ups : {}) as Record<string, unknown>;
        const pickId = PICKS[legacyPick].id;
        const tools = oldDrills > 0 ? [pickId, "drill"] : [pickId];
        for (const [k, v] of Object.entries(oldUps)) {
            const d = ENCH_BY_ID[k];
            if (!d || num(v) <= 0) continue;
            for (const t of tools) (out.ench[t] ??= {})[k] = Math.min(d.max, Math.floor(num(v)));
        }
        if (oldDrills > 0) {
            const e = ENGINES[Math.min(ENGINES.length - 1, Math.floor(Math.log2(1 + oldDrills / 6)))];
            const h = HEADS[Math.min(HEADS.length - 1, Math.floor(legacyPick * 0.7))];
            for (const p of [e, h]) if (!out.parts.includes(p.id)) out.parts.push(p.id);
            out.rig.engine = e.id;
            out.rig.head = h.id;
        }
    }
    out.held = typeof o.held === "string" && (o.held === "drill" || out.picks.includes(o.held)) ? o.held : oldDrills > 0 ? "drill" : out.picks[out.picks.length - 1];
    if (out.held === "drill" && !(out.rig.engine && out.rig.head)) out.held = out.picks.slice().sort((a, b) => PICK_BY_ID[b].tier - PICK_BY_ID[a].tier)[0];
    return out;
}

// ---- Numbers ----

export const mineLevel = (s: State) => skillLevel(s.mining);
export const oreOpen = (s: State, o: OreDef) => mineLevel(s) >= o.need;
export const upLevel = (s: State, id: string) => s.mine.ups[id] || 0;
export const haveOre = (s: State, id: OreId) => s.mine.ore[id] || 0;
export const have = (s: State, id: ResId) => (isOre(id) ? s.mine.ore[id] || 0 : s.mine.ingots[id] || 0);
/** A relic only works while it is equipped. */
export const hasRelic = (s: State, id: string) => s.mine.equipped.includes(id);
export const ownsRelic = (s: State, id: string) => s.mine.relics.includes(id);
export const relicSlots = (s: State) => 2 + (mineLevel(s) >= 25 ? 1 : 0) + (mineLevel(s) >= 45 ? 1 : 0);

export function equipRelic(s: State, id: string): boolean {
    if (!ownsRelic(s, id) || hasRelic(s, id) || s.mine.equipped.length >= relicSlots(s)) return false;
    s.mine.equipped.push(id);
    return true;
}
export function unequipRelic(s: State, id: string): boolean {
    if (!hasRelic(s, id)) return false;
    s.mine.equipped = s.mine.equipped.filter((x) => x !== id);
    return true;
}
export const geodeCount = (s: State) => Object.values(s.mine.geodes).reduce((a, b) => a + b, 0);
export const itemCount = (s: State) => Object.values(s.mine.items).reduce((a, b) => a + b, 0);

// -- The drill --
export const rigPart = (s: State, k: PartKind): PartDef | undefined => PART_BY_ID[s.mine.rig[k]];
export const hasDrill = (s: State) => !!(s.mine.rig.engine && s.mine.rig.head);
/** Mk 1 to 10: how far along both the engine and the head are. */
export function drillMk(s: State): number {
    const e = rigPart(s, "engine");
    const h = rigPart(s, "head");
    if (!e || !h) return 0;
    const f = ((e.tier - 1) / (ENGINES.length - 1) + (h.tier - 1) / (HEADS.length - 1)) / 2;
    return 1 + Math.floor(f * 9 + 1e-9);
}
export const coreFx = (s: State): CoreFx => rigPart(s, "core")?.fx ?? {};
export const drillHeld = (s: State) => s.mine.held === "drill" && hasDrill(s);

export interface ToolView {
    id: string;
    name: string;
    color: string;
    power: number;
    tier: number;
    kind: "pick" | "drill";
    trait: PickTrait;
    traitText: string;
}
export function heldTool(s: State): ToolView {
    if (drillHeld(s)) {
        const h = rigPart(s, "head")!;
        const e = rigPart(s, "engine")!;
        const mk = drillMk(s);
        const c = coreFx(s);
        return { id: "drill", name: `Mk ${mk} Drill`, color: h.color, power: (h.power ?? 1) * (1 + (c.power ?? 0)), tier: mk, kind: "drill", trait: {}, traitText: `${e.name} + ${h.name}` };
    }
    const p = PICK_BY_ID[s.mine.held] ?? PICKS[0];
    return { id: p.id, name: p.name, color: p.color, power: p.power, tier: p.tier, kind: "pick", trait: p.trait, traitText: p.traitText };
}
export const pickOf = (s: State) => heldTool(s);
export const toolById = (s: State, id: string): ToolView | null => {
    if (id === "drill") {
        if (!hasDrill(s)) return null;
        const keep = s.mine.held;
        s.mine.held = "drill";
        const v = heldTool(s);
        s.mine.held = keep;
        return v;
    }
    const p = PICK_BY_ID[id];
    return p ? { id: p.id, name: p.name, color: p.color, power: p.power, tier: p.tier, kind: "pick", trait: p.trait, traitText: p.traitText } : null;
};
/** Tier of the best tool you own: what it adds to the whole game. */
export const bestTier = (s: State) => Math.max(1, ...s.mine.picks.map((id) => PICK_BY_ID[id]?.tier ?? 1), drillMk(s));
/** Index of the best pickaxe you own (0 to 9), for old milestones. */
export const bestPickIdx = (s: State) => Math.max(0, ...s.mine.picks.map((id) => PICKS.findIndex((p) => p.id === id)));

export function holdTool(s: State, id: string): boolean {
    if (s.mine.held === id) return false;
    if (id === "drill" ? !hasDrill(s) : !s.mine.picks.includes(id)) return false;
    s.mine.held = id;
    return true;
}
export function installPart(s: State, id: string): boolean {
    const p = PART_BY_ID[id];
    if (!p || !s.mine.parts.includes(id) || s.mine.rig[p.kind] === id) return false;
    s.mine.rig[p.kind] = id;
    return true;
}
export function removeCore(s: State): boolean {
    if (!s.mine.rig.core) return false;
    s.mine.rig.core = "";
    return true;
}
/** Wear the best engine, head and the newest core you own and pick up the drill. */
export function autoRig(s: State): number {
    let n = 0;
    for (const kind of ["engine", "head"] as const) {
        const best = PARTS.filter((p) => p.kind === kind && s.mine.parts.includes(p.id)).sort((a, b) => b.tier - a.tier)[0];
        if (best && s.mine.rig[kind] !== best.id) {
            s.mine.rig[kind] = best.id;
            n++;
        }
    }
    if (hasDrill(s) && s.mine.held !== "drill") {
        s.mine.held = "drill";
        n++;
    }
    return n;
}

// -- Enchants (on the tool in your hands) --
export const toolEnch = (s: State, tool: string) => s.mine.ench[tool] ?? {};
/** The level of an enchant on the tool in your hands (drill-only enchants count only on the drill). */
export const en = (s: State, id: string): number => {
    const d = ENCH_BY_ID[id];
    if (!d || (d.tool === "drill" && !drillHeld(s))) return 0;
    return toolEnch(s, drillHeld(s) ? "drill" : s.mine.held)[id] || 0;
};
export const enchCap = (tier: number, d: EnchDef) => Math.min(d.max, 5 + 3 * tier);
export const enchOn = (tool: ToolView, d: EnchDef) => d.tool === "any" || tool.kind === "drill";

export const pickPower = (s: State) => heldTool(s).power * (1 + 0.08 * en(s, "eff") + 0.15 * en(s, "bit") + (hasRelic(s, "grip") ? 0.1 : 0) + (hasRelic(s, "anchor") ? 0.15 : 0));
/** Swings hit harder the higher your combo is. */
export const comboFactor = (combo: number) => 1 + 0.45 * Math.max(0, combo - 1);
/** Ore from everything you mine. */
export const yieldMult = (s: State) =>
    dimFx(s).yield * (1 + 0.05 * (s.rups.lode || 0)) * (1 + upStat(s, "ore")) * (1 + 0.08 * en(s, "fort")) * (1 + (heldTool(s).trait.yield ?? 0)) * (1 + (coreFx(s).yield ?? 0)) * (hasRelic(s, "lamp") ? 1.06 : 1) * (hasRelic(s, "lens") ? 1.1 : 1);
export const luckyChance = (s: State) => 0.015 * en(s, "lucky") + (heldTool(s).trait.lucky ?? 0) + (hasRelic(s, "pebble") ? 0.06 : 0);
export const explosiveChance = (s: State) => 0.012 * en(s, "explosive");
export const geodeChance = (s: State) => dimFx(s).geode * 0.0008 * (1 + 0.1 * en(s, "seeker") + (heldTool(s).trait.geode ?? 0) + (coreFx(s).geode ?? 0) + (hasRelic(s, "pan") ? 0.2 : 0));
export const veinNeed = (s: State) => Math.max(25, 70 * Math.pow(0.96, en(s, "seismic")));
export const rushLen = (s: State) => 8 + 2 * en(s, "rush") + (heldTool(s).trait.rush ?? 0) + (coreFx(s).rush ?? 0) + (hasRelic(s, "anchor") ? 5 : 0) + (hasRelic(s, "totem") ? 6 : 0) + dimFx(s).rush;
export const rushMult = (s: State) => 3 * (1 + 0.1 * en(s, "rush")) * (1 + (coreFx(s).rushYield ?? 0));
export const mineXpMult = (s: State) => (1 + 0.06 * en(s, "scholar")) * (1 + (heldTool(s).trait.xp ?? 0)) * (1 + (coreFx(s).xp ?? 0)) * dimFx(s).xp;
export const forgeSlots = (s: State) => 1 + upLevel(s, "furnace");
export const forgeSpeed = (s: State) => 1 + upStat(s, "forge") + 0.08 * upLevel(s, "bellows") + (hasRelic(s, "heart") ? 0.1 : 0);
export const crackEvery = (s: State) => (en(s, "cracker") > 0 ? 36 / en(s, "cracker") : Infinity);
export const smeltCut = (s: State) => Math.pow(0.97, upLevel(s, "smelter"));

/** Swing damage of the drill (the same as your tool: the Carbide Bit is counted in it). */
export const drillDmg = (s: State) => pickPower(s);
/** Output multiplier on everything the drill mines by itself (Ore Magnet and the Steel Heart). */
export const drillMult = (s: State) => (1 + 0.05 * en(s, "magnet")) * (hasRelic(s, "heart") ? 1.25 : 1) * (hasRelic(s, "dcore") ? 1.2 : 1);
/** Swings per second the drill makes: its engine, Turbo Motor, the Overclock Core and the dimension. */
export const drillSwings = (s: State) => (drillHeld(s) ? (rigPart(s, "engine")?.swings ?? 0) * (1 + 0.06 * en(s, "motor") + (coreFx(s).speed ?? 0) + (hasRelic(s, "dcore") ? 0.1 : 0)) * dimFx(s).drill * (1 + 0.2 * (s.aups.bedrock || 0)) * (1 + upStat(s, "drill")) : 0);
/** 1 when the drill is in your hands. */
export const totalDrills = (s: State) => (drillHeld(s) ? 1 : 0);
/** Mining never stops: a trickle of swings even with nothing pressed. */
export const passiveSwings = (s: State) => 0.25 + 0.02 * mineLevel(s);
/** All the swings that happen without you pressing anything. */
export const idleSwings = (s: State, auto: number) => drillSwings(s) + passiveSwings(s) + auto;

export const SWING_VALUE = 0.05; // shards a swing pays, in clicks, per point of ore value
const soft = (r: number) => (r <= 3 ? r : 3 + Math.pow(r - 3, 0.6));

/** Mining XP for one swing that hits this ore: a slice of the level the ore opens at, so better ore keeps levelling you. It does not grow with the amount of ore, so a strong tool never skips levels. */
export const oreXp = (o: OreDef) => 0.6 + (0.0002 * skillXpFor(o.need + 1)) / (1 + o.need / 8);

export function costOf(u: { cost: Cost; growth: number }, lvl: number): Cost {
    const out: Cost = {};
    for (const [k, v] of Object.entries(u.cost)) out[k as ResId] = Math.ceil((v ?? 0) * Math.pow(u.growth, lvl));
    return out;
}
export const upCost = (s: State, u: MineUpDef): Cost => costOf(u, upLevel(s, u.id));
export const enchCost = (lvl: number, d: EnchDef): Cost => costOf(d, lvl);

export interface Blocker {
    ok: boolean;
    why?: string;
}

const afford = (s: State, cost: Cost): Blocker => {
    for (const [id, n] of Object.entries(cost)) if (have(s, id as ResId) < (n ?? 0)) return { ok: false, why: `Needs ${resInfo(id as ResId).name}` };
    return { ok: true };
};
const spend = (s: State, cost: Cost) => {
    for (const [id, n] of Object.entries(cost)) {
        if (isOre(id)) s.mine.ore[id] = haveOre(s, id) - (n ?? 0);
        else s.mine.ingots[id] = (s.mine.ingots[id] || 0) - (n ?? 0);
    }
};
export const canAfford = (s: State, cost: Cost) => afford(s, cost).ok;

export function canBuyUp(s: State, u: MineUpDef): Blocker {
    if (mineLevel(s) < u.need) return { ok: false, why: `Mining ${u.need}` };
    if (upLevel(s, u.id) >= u.max) return { ok: false, why: "Maxed" };
    return afford(s, upCost(s, u));
}
export function buyMineUp(s: State, id: string): boolean {
    const u = MINE_UP_BY_ID[id];
    if (!u || !canBuyUp(s, u).ok) return false;
    spend(s, upCost(s, u));
    s.mine.ups[id] = upLevel(s, id) + 1;
    return true;
}

export function canBuyEnch(s: State, tool: string, d: EnchDef): Blocker {
    const t = toolById(s, tool);
    if (!t) return { ok: false, why: "You do not own that tool" };
    if (!enchOn(t, d)) return { ok: false, why: "Drill only" };
    if (mineLevel(s) < d.need) return { ok: false, why: `Mining ${d.need}` };
    const lvl = toolEnch(s, tool)[d.id] || 0;
    if (lvl >= d.max) return { ok: false, why: "Maxed" };
    if (lvl >= enchCap(t.tier, d)) return { ok: false, why: `A better tool holds more (tier ${Math.ceil((lvl + 1 - 5) / 3)})` };
    return afford(s, enchCost(lvl, d));
}
export function buyEnch(s: State, tool: string, id: string): boolean {
    const d = ENCH_BY_ID[id];
    if (!d || !canBuyEnch(s, tool, d).ok) return false;
    const lvl = toolEnch(s, tool)[id] || 0;
    spend(s, enchCost(lvl, d));
    (s.mine.ench[tool] ??= {})[id] = lvl + 1;
    return true;
}
/** Total enchant levels across every tool (for milestones). */
export const enchLevels = (s: State) => Object.values(s.mine.ench).reduce((a, e) => a + Object.values(e).reduce((x, y) => x + y, 0), 0);

export function setFocus(s: State, id: string): boolean {
    if (id && !ORE_IDS.has(id)) return false;
    s.mine.focus = id;
    return true;
}

// ---- Permanent bonuses ----

export interface DimSet {
    dim: Dim;
    tier: number; // lowest collection tier across the dimension's ores
    next: number;
    bonus: number; // all shards now
}
const SET_BONUS = [0, 0.005, 0.01, 0.02, 0.03, 0.045];
const SET_TIERS = [1, 3, 5, 8, 10];
export function dimSet(s: State, dim: Dim): DimSet {
    const low = Math.min(...DIM_ORES[dim].map((o) => colTierOf(s.mine.mined[o.id] || 0)));
    const got = SET_TIERS.filter((t) => low >= t).length;
    return { dim, tier: low, next: SET_TIERS[got] ?? 0, bonus: SET_BONUS[got] };
}
export const SET_STEPS = SET_TIERS.map((t, i) => ({ tier: t, bonus: SET_BONUS[i + 1] }));

/** Everything Mining permanently adds to the rest of the game (summed into enchant.allFx). */
export function mineFx(s: State): Partial<Record<EStat, number>> {
    const fx: Partial<Record<EStat, number>> = {};
    const add = (k: EStat, v: number) => {
        if (v) fx[k] = (fx[k] ?? 0) + v;
    };
    add("click", PICK_CLICK * (bestTier(s) - 1) + (hasRelic(s, "core") ? 0.08 : 0));
    for (const o of ORES) add(o.col[0], o.col[1] * colSteps(colTierOf(s.mine.mined[o.id] || 0)));
    add("all", 0.01 * en(s, "deep") + 0.015 * en(s, "ancient") + (coreFx(s).all ?? 0) + (hasRelic(s, "compass") ? 0.025 : 0) + (hasRelic(s, "crown") ? 0.06 : 0));
    add("tokens", 0.02 * en(s, "ancient") + (hasRelic(s, "crown") ? 0.08 : 0));
    add("minion", hasRelic(s, "lens") ? 0.1 : 0);
    for (const dim of DIMS) add("all", dimSet(s, dim).bonus);
    for (const [k, v] of Object.entries(featStats(s))) add(k as EStat, v);
    return fx;
}

// ---- The ore table of the island you are on ----

export interface TableRow {
    ore: OreDef;
    w: number;
    open: boolean;
    p: number; // chance per swing (0 while locked)
}

/** Odds of every ore on this island. Ores above your Mining level are locked; Prospector and a focus shift the odds toward rarer ore. */
export function oreTable(s: State, islandId = activeIsland(s).id, dim: Dim = activeIsland(s).dim): TableRow[] {
    const base = ISLAND_ORES[islandId] ?? DIM_DEFAULT[dim];
    const lvl = mineLevel(s);
    const pros = 0.05 * en(s, "prosp") + (coreFx(s).geode ? 0.05 : 0) + (hasRelic(s, "pan") ? 0.1 : 0);
    const rows: TableRow[] = base.map(([id, w]) => {
        const ore = ORE_BY_ID[id];
        return { ore, w: w * (1 + pros * (ore.need / 10)), open: lvl >= ore.need, p: 0 };
    });
    const total = rows.reduce((a, r) => a + (r.open ? r.w : 0), 0);
    for (const r of rows) r.p = r.open && total > 0 ? r.w / total : 0;
    const f = s.mine.focus && rows.find((r) => r.open && r.ore.id === s.mine.focus);
    if (f) {
        for (const r of rows) r.p *= 0.5;
        f.p += 0.5;
    }
    return rows;
}

type Rng = () => number;

function pickRow(rows: TableRow[], rng: Rng): TableRow {
    let r = rng();
    let last = rows[0];
    for (const row of rows) {
        if (row.p <= 0) continue;
        last = row;
        if (r < row.p) return row;
        r -= row.p;
    }
    return last;
}

// ---- Swinging ----

export interface MineCtx {
    avgClick: number;
    cps: number;
    auto: number; // auto-clicks per second
    xp: number; // Mining XP multiplier (all sources and island)
    dust: number; // Arcane Dust multiplier
}

/** The slice of derive() that mining needs. */
export const mineCtx = (d: { avgClick: number; cps: number; auto: number; xpMult: number; xpSkill: { mining: number }; dustMult: number }): MineCtx => ({
    avgClick: d.avgClick,
    cps: d.cps,
    auto: d.auto,
    xp: d.xpMult * d.xpSkill.mining,
    dust: d.dustMult,
});

export interface SwingOut {
    ore: OreId;
    units: number; // ore gained (fractional)
    whole: number; // whole ore added to the stock by this swing
    lucky: boolean;
    blast: boolean; // an Explosive blast
    rush: boolean; // swung during an Ore Rush
    rushStart: boolean;
    geode: Dim | null;
    xp: number;
    shards: number;
}

const subs = new Set<(e: SwingOut) => void>();
/** The Mine tab listens here so its picture reacts to every press of the big button. */
export const onSwing = (fn: (e: SwingOut) => void) => {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
};

export function pushLog(s: State, text: string, color: string) {
    const log = s.mine.log;
    const top = log[0];
    if (top && top.text === text) {
        top.n = (top.n ?? 1) + 1;
        top.t = Date.now();
        return;
    }
    log.unshift({ text, color, t: Date.now(), n: 1 });
    if (log.length > 10) log.length = 10;
}

const addOre = (s: State, id: OreId, units: number) => {
    const before = Math.floor(haveOre(s, id));
    s.mine.ore[id] = haveOre(s, id) + units;
    s.mine.mined[id] = (s.mine.mined[id] || 0) + units;
    return Math.floor(haveOre(s, id)) - before;
};

/** Shards a single swing pays, on top of the click itself. */
export const swingShards = (ctx: MineCtx, o: OreDef) => ctx.avgClick * SWING_VALUE * o.vm;

/** One swing of your tool (one press of the big button). */
export function swing(s: State, ctx: MineCtx, inp: { combo: number; crit: boolean }, rng: Rng = Math.random): SwingOut {
    const row = pickRow(oreTable(s), rng);
    const o = row.ore;
    const m = s.mine;
    const rush = m.rush > 0;
    const dmg = pickPower(s) * comboFactor(inp.combo) * (inp.crit ? 1.6 : 1);
    const lucky = rng() < luckyChance(s);
    const blast = rng() < explosiveChance(s);
    let units = soft(dmg / o.hard) * yieldMult(s);
    if (rush) units *= rushMult(s);
    if (lucky) units *= 3;
    if (blast) units *= 6;
    const whole = addOre(s, o.id, units);
    const xp = oreXp(o) * ctx.xp * mineXpMult(s);
    const shards = swingShards(ctx, o);
    s.mining += xp;
    s.shards += shards;
    s.total += shards;
    m.nodes += 1;
    let rushStart = false;
    if (rush) m.rush -= 1;
    else {
        m.vein += 1 / veinNeed(s);
        if (m.vein >= 1) {
            m.vein = 0;
            m.rush = rushLen(s);
            m.rushes += 1;
            rushStart = true;
        }
    }
    let geode: Dim | null = null;
    if (rng() < geodeChance(s) * (rush ? 3 : 1)) {
        geode = activeIsland(s).dim;
        m.geodes[geode] = (m.geodes[geode] || 0) + 1;
    }
    const out: SwingOut = { ore: o.id, units, whole, lucky, blast, rush, rushStart, geode, xp, shards };
    subs.forEach((fn) => fn(out));
    return out;
}

/**
 * Mining without pressing anything: the drill, auto-clicks and the passive trickle.
 * Works with any dt (offline too) by paying the expected result of the swings
 * instead of rolling each one.
 */
export function tickMine(s: State, dt: number, ctx: MineCtx, now = Date.now()) {
    tickForge(s, now);
    if (dt <= 0) return;
    const swings = idleSwings(s, ctx.auto) * dt;
    bulkSwings(s, ctx, swings, drillDmg(s), drillMult(s), true);
    // Geode Crusher: crack what has piled up.
    const every = crackEvery(s);
    if (Number.isFinite(every) && geodeCount(s) > 0) {
        s.mine.crackT += dt;
        let n = Math.min(geodeCount(s), Math.floor(s.mine.crackT / every), 40);
        s.mine.crackT -= Math.floor(s.mine.crackT / every) * every;
        while (n-- > 0) {
            const dim = DIMS.find((d) => (s.mine.geodes[d] || 0) > 0);
            if (!dim) break;
            const out = crackGeode(s, ctx, dim);
            if (out) pushLog(s, `${out.title}: ${out.sub}`, out.color);
        }
    } else s.mine.crackT = 0;
}

/** Mining XP a second from swings that need no button press (for the Skills page ETA). */
export function idleXpRate(s: State, ctx: MineCtx): number {
    let per = 0;
    for (const r of oreTable(s)) per += r.p * oreXp(r.ore);
    return idleSwings(s, ctx.auto) * per * ctx.xp * mineXpMult(s);
}

/** The expected result of `swings` swings of power `dmg` on this island. */
export function bulkSwings(s: State, ctx: MineCtx, swings: number, dmg: number, mult: number, fromDrill = false) {
    if (swings <= 0) return;
    const rows = oreTable(s);
    const lc = 1 + 2 * luckyChance(s);
    const bc = 1 + 5 * explosiveChance(s);
    const base = yieldMult(s) * mult * lc * bc;
    let avgShards = 0;
    for (const r of rows) {
        if (r.p <= 0) continue;
        const o = r.ore;
        const n = swings * r.p;
        addOre(s, o.id, n * soft(dmg / o.hard) * base);
        s.mining += n * oreXp(o) * ctx.xp * mineXpMult(s);
        avgShards += n * swingShards(ctx, o);
    }
    s.shards += avgShards;
    s.total += avgShards;
    s.mine.nodes += swings;
    // Geodes arrive as a fraction until a whole one is ready.
    const dim = activeIsland(s).dim;
    const g = swings * geodeChance(s) * (fromDrill ? 0.08 * (1 + 0.12 * en(s, "sifter")) : 1);
    const f = (s.mine.gfrac[dim] || 0) + g;
    const whole = Math.floor(f);
    s.mine.gfrac[dim] = f - whole;
    if (whole > 0) s.mine.geodes[dim] = (s.mine.geodes[dim] || 0) + whole;
}

// ---- Items ----

/** Use a crafted consumable. Returns a line for the toast, or null when you have none. */
export function consumeItem(s: State, id: ItemId, ctx: MineCtx): string | null {
    if ((s.mine.items[id] || 0) < 1) return null;
    s.mine.items[id] -= 1;
    if (id === "dynamite") {
        bulkSwings(s, ctx, 80, pickPower(s) * 1.5, 1);
        pushLog(s, "Dynamite: 80 swings of ore at once", "#ff6a4d");
        return "BOOM! 80 swings of ore, right now.";
    }
    if (id === "rushPotion") {
        s.mine.rush = rushLen(s);
        s.mine.vein = 0;
        s.mine.rushes += 1;
        pushLog(s, "Rush Potion: Ore Rush!", "#ffd23a");
        return "Ore Rush! Your next swings pay triple.";
    }
    const dim = activeIsland(s).dim;
    s.mine.geodes[dim] = (s.mine.geodes[dim] || 0) + 3;
    pushLog(s, `Geode Cache: 3 ${GEODES[dim].name}s`, GEODES[dim].color);
    return `The cache held 3 ${GEODES[dim].name}s.`;
}

// ---- Forge ----

export const jobSeconds = (s: State, r: RecipeDef, n: number) => (r.time * n) / forgeSpeed(s);
export const jobLeft = (j: Job, now = Date.now()) => Math.max(0, (j.end - now) / 1000);
export const jobsReady = (s: State, now = Date.now()) => s.mine.jobs.filter((j) => j.end <= now).length;
export const slotsFree = (s: State) => forgeSlots(s) - s.mine.jobs.length;

export function totalCost(s: State, r: RecipeDef, n: number): Cost {
    const out: Cost = {};
    const cut = r.kind === "ingot" ? smeltCut(s) : 1;
    for (const [k, v] of Object.entries(r.inputs)) out[k as ResId] = Math.max(1, Math.ceil((v ?? 0) * n * (isOre(k) ? cut : 1)));
    return out;
}

/** Whether you already own what a one-off recipe makes. */
export function ownsOutput(s: State, r: RecipeDef): boolean {
    if (r.kind === "relic") return ownsRelic(s, r.out);
    if (r.kind === "part") return s.mine.parts.includes(r.out);
    if (r.kind === "pick") return s.mine.picks.includes(r.out);
    return false;
}

export function canCraft(s: State, r: RecipeDef, n = 1): Blocker {
    if (mineLevel(s) < r.need) return { ok: false, why: `Mining ${r.need}` };
    if (isOnce(r)) {
        if (ownsOutput(s, r)) return { ok: false, why: "Already made" };
        if (s.mine.jobs.some((j) => j.r === r.id)) return { ok: false, why: "Already forging" };
        if (n > 1) return { ok: false, why: "One only" };
    }
    if (slotsFree(s) <= 0) return { ok: false, why: "Furnaces busy" };
    return afford(s, totalCost(s, r, n));
}

/** The most batches of a recipe you can afford right now (at least 1 so the button can always show a price). */
export function maxBatch(s: State, r: RecipeDef): number {
    if (isOnce(r)) return 1;
    let n = 50;
    for (const [k, v] of Object.entries(totalCost(s, r, 1))) n = Math.min(n, Math.floor(have(s, k as ResId) / (v ?? 1)));
    return Math.max(1, n);
}

export function startCraft(s: State, id: string, n = 1, now = Date.now()): boolean {
    const r = RECIPE_BY_ID[id];
    if (!r || !canCraft(s, r, n).ok) return false;
    spend(s, totalCost(s, r, n));
    let slot = 0;
    while (s.mine.jobs.some((j) => j.slot === slot)) slot++;
    s.mine.jobs.push({ r: id, n, end: now + jobSeconds(s, r, n) * 1000, slot });
    return true;
}

export interface Collected {
    text: string;
    color: string;
}

/** Collect a finished job: ingots, items, a pickaxe, a drill part or a relic. The Master Anvil sometimes doubles a batch. */
export function collectJob(s: State, i: number, now = Date.now(), rng: Rng = Math.random): Collected | null {
    const j = s.mine.jobs[i];
    if (!j || j.end > now) return null;
    const r = RECIPE_BY_ID[j.r];
    s.mine.jobs.splice(i, 1);
    s.mine.crafted += 1;
    if (!r) return null;
    if (r.kind === "relic") {
        if (!ownsRelic(s, r.out)) {
            s.mine.relics.push(r.out);
            equipRelic(s, r.out); // straight onto the pick if there is room
        }
        pushLog(s, `Forged the ${r.name}`, r.color);
        return { text: `Forged the ${r.name}: ${r.desc}`, color: r.color };
    }
    if (r.kind === "part") {
        const p = PART_BY_ID[r.out];
        if (!s.mine.parts.includes(p.id)) s.mine.parts.push(p.id);
        // A better part goes straight onto the drill; the first drill is picked up for you.
        const cur = rigPart(s, p.kind);
        const first = !hasDrill(s);
        if (!cur || cur.tier < p.tier) s.mine.rig[p.kind] = p.id;
        if (first && hasDrill(s)) s.mine.held = "drill";
        pushLog(s, `Forged the ${r.name}`, r.color);
        return { text: `Forged the ${r.name}: ${r.desc}${first && hasDrill(s) ? ". Your drill is ready and in your hands!" : ""}`, color: r.color };
    }
    if (r.kind === "pick") {
        if (!s.mine.picks.includes(r.out)) s.mine.picks.push(r.out);
        pushLog(s, `Forged the ${r.name}`, r.color);
        return { text: `Forged the ${r.name}: ${r.desc}`, color: r.color };
    }
    const double = rng() < 0.08 * upLevel(s, "anvil");
    const n = j.n * (double ? 2 : 1);
    if (r.kind === "ingot") {
        s.mine.ingots[r.out] = (s.mine.ingots[r.out] || 0) + n;
        s.mine.made[r.out] = (s.mine.made[r.out] || 0) + n;
    } else s.mine.items[r.out] = (s.mine.items[r.out] || 0) + n;
    pushLog(s, `${n}x ${r.name}${double ? " (double batch!)" : ""}`, r.color);
    return { text: `${n}x ${r.name}${double ? ", a double batch!" : ""}`, color: r.color };
}

export function collectAll(s: State, now = Date.now()): Collected[] {
    const out: Collected[] = [];
    for (let i = s.mine.jobs.length - 1; i >= 0; i--) {
        const c = collectJob(s, i, now);
        if (c) out.push(c);
    }
    return out;
}

// ---- Geodes ----

export interface GeodeOut {
    title: string;
    sub: string;
    color: string;
}

export const GEODES: Record<Dim, { name: string; color: string }> = {
    overworld: { name: "Geode", color: "#c58bff" },
    nether: { name: "Magma Geode", color: "#ff7a3d" },
    end: { name: "Chorus Geode", color: "#e0a0ff" },
};

// [dust, tokens, egg, shards, fragment, gem] weights per dimension.
export const GEODE_W: Record<Dim, number[]> = {
    overworld: [30, 28, 16, 18, 7, 1],
    nether: [22, 30, 14, 18, 13, 3],
    end: [14, 30, 12, 16, 22, 6],
};
export const GEODE_TOKENS: Record<Dim, number> = { overworld: 1, nether: 1.6, end: 2.4 };

/** Crack one geode of a dimension: dust, tokens, eggs, shards, fragments or (rarely) a gem. */
export function crackGeode(s: State, d: { avgClick: number; cps: number; dust: number }, dim: Dim, rng: Rng = Math.random): GeodeOut | null {
    if ((s.mine.geodes[dim] || 0) < 1) return null;
    s.mine.geodes[dim] -= 1;
    s.mine.cracked += 1;
    const w = GEODE_W[dim];
    let r = rng() * w.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < w.length - 1 && r >= w[k]) {
        r -= w[k];
        k++;
    }
    const tier = Math.min(3, Math.max(1, Math.floor(Math.log10(Math.max(10, s.total)) / 6)));
    if (k === 0) {
        const n = Math.round((30 + rng() * 50) * d.dust * (dim === "overworld" ? 1 : 1.5));
        s.enc.dust += n;
        s.enc.earned += n;
        return { title: "Arcane Dust", sub: `+${n} dust`, color: "#d9a8ff" };
    }
    if (k === 1) {
        const n = Math.max(1, Math.round((1 + tier + Math.floor(rng() * 2)) * GEODE_TOKENS[dim]));
        s.tokens += n;
        return { title: "Rebirth Tokens", sub: `+${n} tokens`, color: "var(--mc-yellow)" };
    }
    if (k === 2) {
        s.freeEggs += 1;
        return { title: "Wooden Egg", sub: "a free egg to hatch", color: "var(--mc-gold)" };
    }
    if (k === 3) {
        const n = (d.avgClick * 40 + d.cps * 240) * (1 + rng()) * (dim === "overworld" ? 1 : 2);
        s.shards += n;
        s.total += n;
        return { title: "Shard Vein", sub: "a rich seam of shards", color: "var(--mc-aqua)" };
    }
    if (k === 4) {
        s.frag += 1;
        return { title: "Fracture Fragment", sub: "+0.2% all shards, forever", color: "var(--mc-light-purple)" };
    }
    s.ap += 1;
    return { title: "Ascension Shard", sub: "+1 gem", color: "var(--mc-red)" };
}

// ---- Forge autopilot (Auto-Tongs) ----

/** With Auto-Tongs, finished crafts are collected as they finish, and a repeating craft starts again right away (also while away). */
export function tickForge(s: State, now = Date.now()) {
    if (upLevel(s, "tongs") < 1) return;
    for (let guard = 0; guard < 300; guard++) {
        const i = s.mine.jobs.findIndex((j) => j.end <= now);
        if (i < 0) break;
        const j = s.mine.jobs[i];
        const r = RECIPE_BY_ID[j.r];
        collectJob(s, i, now);
        if (j.loop && r && !isOnce(r) && afford(s, totalCost(s, r, j.n)).ok) {
            spend(s, totalCost(s, r, j.n));
            s.mine.jobs.push({ r: j.r, n: j.n, end: j.end + jobSeconds(s, r, j.n) * 1000, slot: j.slot, loop: true });
        }
    }
}

export function toggleLoop(s: State, slot: number): boolean {
    const j = s.mine.jobs.find((x) => x.slot === slot);
    const r = j && RECIPE_BY_ID[j.r];
    if (!j || !r || upLevel(s, "tongs") < 1 || isOnce(r)) return false;
    j.loop = !j.loop;
    return true;
}

// ---- Milestones: item collections and the things you do ----

const g = (k: GrantKind, n: number): MsReward => ({ grant: [k, n] });
const st = (k: EStat, v: number): MsReward => ({ stat: [k, v] });
const DIM_M: Record<Dim, number> = { overworld: 1, nether: 1.6, end: 2.4 };

export const oreIcon: Record<string, McSymbolName> = {
    coal: "square", copper: "ring", iron: "hex", gold: "star", redstone: "radiation", lapis: "diamondS", diamond: "gem", emerald: "spade", amethyst: "atom",
    netherrack: "square", quartz: "diamondS", glowstone: "sun", soulstone: "ankh", netherite: "hex", endstone: "square", purpur: "diamondS", voidcrystal: "atom", fracturite: "comet",
};

/** One ladder per ore: how much you have mined of it. The stat is automatic; some tiers also pay a grant to claim. */
export const ORE_LADDERS: Ladder[] = ORES.map((o) => ({
    key: `o:${o.id}`,
    group: "item" as const,
    name: o.name,
    unit: `${o.name} mined`,
    color: o.color,
    icon: oreIcon[o.id] ?? "gem",
    note: `${o.colText} from every tier`,
    metric: (s: State) => s.mine.mined[o.id] || 0,
    at: COL_AT,
    rewards: collectionRewards(DIM_M[o.dim] * (1 + o.need / 40), o.need >= 36),
    auto: (tier: number) => fmtStat(o.col[0], o.col[1] * colSteps(tier)),
}));

/** One ladder per ingot: how many you have smelted. */
export const INGOT_LADDERS: Ladder[] = INGOTS.map((i, n) => ({
    key: `i:${i.id}`,
    group: "item" as const,
    name: i.name,
    unit: `${i.name} made`,
    color: i.color,
    icon: "triangle" as McSymbolName,
    note: "Smelted in the Forge",
    metric: (s: State) => s.mine.made[i.id] || 0,
    at: [10, 50, 250, 1000],
    rewards: craftRewards(1 + n * 0.25),
}));

const ACTION_LADDERS: Ladder[] = [
    { key: "swings", group: "action", name: "Swinger", unit: "swings of your tool", color: "#e0b070", icon: "pick", metric: (s) => s.mine.nodes, at: [100, 1000, 10000, 50000, 250000], rewards: [[g("dust", 20)], [g("tokens", 1)], [g("eggs", 1)], [g("tokens", 2), st("click", 0.02)], [g("ap", 1)]] },
    { key: "ore", group: "action", name: "Hauler", unit: "ore mined", color: "#d8d8e6", icon: "hex", metric: (s) => ORES.reduce((a, o) => a + (s.mine.mined[o.id] || 0), 0), at: [500, 5000, 50000, 500000, 5000000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("click", 0.01)], [g("eggs", 1)], [st("all", 0.02)]] },
    { key: "rush", group: "action", name: "Rusher", unit: "Ore Rushes", color: "#ffd23a", icon: "bolt", metric: (s) => s.mine.rushes, at: [5, 50, 250, 1000], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("comboMax", 0.1)], [g("tokens", 2)]] },
    { key: "dig", group: "action", name: "Digger", unit: "nodes broken by hand", color: "#ff9a4d", icon: "strength", metric: (s) => s.mine.broken, at: [10, 100, 500, 2500], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("click", 0.02)], [g("frag", 1)]] },
    { key: "geode", group: "action", name: "Geologist", unit: "geodes cracked", color: "#c58bff", icon: "gem", metric: (s) => s.mine.cracked, at: [5, 25, 100, 400], rewards: [[g("dust", 30)], [g("eggs", 1)], [g("tokens", 2)], [g("frag", 1)]] },
    { key: "forge", group: "action", name: "Smith", unit: "forge crafts collected", color: "#ff8a5c", icon: "forge", metric: (s) => s.mine.crafted, at: [3, 25, 100, 400], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.03)], [g("eggs", 1)]] },
    { key: "drill", group: "action", name: "Driller", unit: "drill parts forged", color: "#7fd0ff", icon: "cog", metric: (s) => s.mine.parts.length, at: [2, 5, 10, 16], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("auto", 0.2)], [g("tokens", 2)]] },
    { key: "mk", group: "action", name: "Machinist", unit: "drill Mk reached", color: "#55ffff", icon: "atom", metric: (s) => drillMk(s), at: [1, 4, 7, 10], rewards: [[g("dust", 40)], [g("tokens", 2)], [g("eggs", 1)], [g("ap", 1)]] },
    { key: "ench", group: "action", name: "Enchanter", unit: "enchant levels on your tools", color: "#c58bff", icon: "intelligence", metric: (s) => enchLevels(s), at: [10, 50, 150, 400], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("click", 0.02)], [g("eggs", 1)]] },
    { key: "relic", group: "action", name: "Relic Hunter", unit: "relics forged", color: "#ffe29a", icon: "key", metric: (s) => s.mine.relics.length, at: [1, 4, 8, 12], rewards: [[g("dust", 40)], [g("tokens", 1)], [g("eggs", 1)], [g("frag", 2)]] },
    { key: "disc", group: "action", name: "Collector", unit: "different ores mined", color: "#55ff77", icon: "star", metric: (s) => ORES.filter((o) => (s.mine.mined[o.id] || 0) > 0).length, at: [6, 12, 18], rewards: [[g("dust", 40)], [g("tokens", 1)], [st("all", 0.02)]] },
    { key: "pick", group: "action", name: "Toolmaker", unit: "best tool tier", color: "#55ffff", icon: "crown", metric: (s) => bestTier(s), at: [4, 7, 10], rewards: [[g("dust", 40)], [g("eggs", 1)], [g("tokens", 3)]] },
    { key: "picks", group: "action", name: "Tool Collector", unit: "pickaxes forged", color: "#a0a0ac", icon: "scales", metric: (s) => s.mine.picks.length - 1, at: [3, 6, 9], rewards: [[g("dust", 30)], [g("tokens", 1)], [g("eggs", 1)]] },
];

export const LADDERS: Ladder[] = [...ORE_LADDERS, ...INGOT_LADDERS, ...ACTION_LADDERS];
export const MILESTONES: Milestone[] = milestonesOf(LADDERS);
export const FEATS = MILESTONES; // older name
export type Feat = Milestone;

export const featClaimed = (s: State, f: Milestone) => s.mine.claimed.includes(f.id);
export const featReady = (s: State, f: Milestone) => !featClaimed(s, f) && f.ladder.metric(s) >= f.at;
export const featsReady = (s: State) => MILESTONES.filter((f) => featReady(s, f));

function pay(s: State, kind: GrantKind, n: number) {
    if (kind === "dust") {
        s.enc.dust += n;
        s.enc.earned += n;
    } else if (kind === "tokens") s.tokens += n;
    else if (kind === "eggs") s.freeEggs += n;
    else if (kind === "ap") s.ap += n;
    else s.frag += n;
}

export function claimFeat(s: State, id: string): Milestone | null {
    const f = MILESTONES.find((x) => x.id === id);
    if (!f || !featReady(s, f)) return null;
    s.mine.claimed.push(id);
    for (const r of f.rewards) if (r.grant) pay(s, r.grant[0], r.grant[1]);
    return f;
}

export function claimAllFeats(s: State): Milestone[] {
    return featsReady(s).map((f) => claimFeat(s, f.id)).filter((f): f is Milestone => !!f);
}

/** Permanent stats from the milestones you have claimed. */
export function featStats(s: State): Partial<Record<EStat, number>> {
    const out: Partial<Record<EStat, number>> = {};
    for (const id of s.mine.claimed) {
        const f = MILESTONES.find((x) => x.id === id);
        if (f) for (const r of f.rewards) if (r.stat) out[r.stat[0]] = (out[r.stat[0]] ?? 0) + r.stat[1];
    }
    return out;
}

// ---- Digging by hand: the ore nodes on the rock face ----

/** Hits to break a node of this ore: harder ore takes longer, a better tool shortens it. */
export const digHits = (s: State, o: OreDef) => Math.max(4, Math.min(18, Math.round(5 + 3 * Math.log2(1 + o.hard / (pickPower(s) * 0.6)))));

export interface DigOut {
    units: number;
    whole: number;
    xp: number;
    lucky: boolean;
    geode: Dim | null;
}

/** One hit on an ore node. Small bits of ore every hit (a bit more than a swing pays), a big bonus when it breaks. Does not touch the big button, the combo or the vein. */
export function digHit(s: State, ctx: MineCtx, oreId: OreId, broke: boolean, rng: Rng = Math.random): DigOut {
    const o = ORE_BY_ID[oreId];
    const per = soft(pickPower(s) / o.hard) * yieldMult(s) * 1.5;
    const hits = digHits(s, o);
    let units = per;
    let lucky = false;
    if (broke) {
        lucky = rng() < luckyChance(s);
        units += per * hits * 0.6 * (lucky ? 3 : 1);
        s.mine.broken += 1;
    }
    const whole = addOre(s, oreId, units);
    const xp = oreXp(o) * (broke ? 2.5 : 0.5) * ctx.xp * mineXpMult(s);
    s.mining += xp;
    s.mine.nodes += 1;
    let geode: Dim | null = null;
    if (rng() < geodeChance(s) * (broke ? 6 : 0.5)) {
        geode = activeIsland(s).dim;
        s.mine.geodes[geode] = (s.mine.geodes[geode] || 0) + 1;
    }
    return { units, whole, xp, lucky, geode };
}

// ---- Goals and quick actions ----

export interface Goal {
    title: string;
    color: string;
    kind: "part" | "pick" | "relic";
    id: string; // recipe id
    need: number;
    cost: Cost;
}

const goalOfRecipe = (r: RecipeDef): Goal => ({ title: r.name, color: r.color, kind: r.kind === "part" ? "part" : r.kind === "pick" ? "pick" : "relic", id: r.id, need: r.need, cost: r.inputs });

/** What to work toward next: the first drill parts, then each better engine and head, then a core, then the next pickaxe and relic. */
export function goalOf(s: State): Goal | null {
    const owned = (p: PartDef) => s.mine.parts.includes(p.id);
    const nextOf = (list: PartDef[]) => list.find((p) => !owned(p));
    const e = nextOf(ENGINES);
    const h = nextOf(HEADS);
    const c = nextOf(CORES);
    // Whichever of the engine and head is further behind comes first, so the two stay level.
    const parts = [e, h].filter((x): x is PartDef => !!x).sort((a, b) => a.tier - b.tier || a.need - b.need);
    const part = parts[0];
    if (part) return goalOfRecipe(RECIPE_BY_ID[part.id]);
    if (c) return goalOfRecipe(RECIPE_BY_ID[c.id]);
    const pk = PICKS.find((p) => p.time > 0 && !s.mine.picks.includes(p.id));
    if (pk) return goalOfRecipe(RECIPE_BY_ID[`pk_${pk.id}`]);
    const r = RELICS.filter((x) => !ownsRelic(s, x.out)).sort((a, b) => a.need - b.need)[0];
    return r ? goalOfRecipe(r) : null;
}

/** What a cost is still short of, broken down to raw ore (ingots expand into their recipe). */
export function shortOres(s: State, cost: Cost, mult = 1, out: Record<string, number> = {}): Record<string, number> {
    for (const [id, n] of Object.entries(cost)) {
        const short = (n ?? 0) * mult - have(s, id as ResId);
        if (short <= 0) continue;
        if (isOre(id)) out[id] = (out[id] || 0) + short;
        else if (RECIPE_BY_ID[id]) shortOres(s, RECIPE_BY_ID[id].inputs, short, out);
    }
    return out;
}

/** The ore you are furthest from having for the goal. */
export function bottleneck(s: State, goal: Goal): OreId | null {
    const short = shortOres(s, goal.cost);
    let best: OreId | null = null;
    let bv = 0;
    for (const [id, n] of Object.entries(short)) {
        if (n > bv) {
            bv = n;
            best = id as OreId;
        }
    }
    return best;
}

/** Start crafts for the ingots the goal is short of (as many as the furnaces and stock allow). */
export function queueGoal(s: State, now = Date.now()): number {
    const goal = goalOf(s);
    if (!goal) return 0;
    let started = 0;
    for (const [id, n] of Object.entries(goal.cost)) {
        const r = RECIPE_BY_ID[id];
        if (!r || r.kind !== "ingot") continue;
        const queued = s.mine.jobs.filter((j) => j.r === id).reduce((a, j) => a + j.n, 0);
        const short = (n ?? 0) - have(s, id as ResId) - queued;
        if (short <= 0) continue;
        for (let k = Math.min(short, 50); k >= 1; k--) {
            if (canCraft(s, r, k).ok) {
                startCraft(s, id, k, now);
                started++;
                break;
            }
        }
    }
    return started;
}

/** Buy every ore-priced enchant you can afford for the tool in your hands, cheapest first (ingot-priced ones stay your call). */
export function enchantAll(s: State, limit = 40): number {
    const tool = heldTool(s).id;
    let n = 0;
    while (n < limit) {
        const opts = ENCHANTS.filter((d) => canBuyEnch(s, tool, d).ok && Object.keys(d.cost).every((k) => isOre(k)));
        if (!opts.length) break;
        const frac = (d: EnchDef) => Object.entries(enchCost(toolEnch(s, tool)[d.id] || 0, d)).reduce((a, [k, v]) => Math.max(a, (v ?? 0) / Math.max(1, have(s, k as ResId))), 0);
        opts.sort((a, b) => frac(a) - frac(b));
        if (!buyEnch(s, tool, opts[0].id)) break;
        n++;
    }
    return n;
}
export const upgradeAll = enchantAll;

/** Crack every geode, nearest dimension first. Returns how many and the last result. */
export function crackAll(s: State, d: { avgClick: number; cps: number; dust: number }, one = false): { n: number; last: GeodeOut | null } {
    let n = 0;
    let last: GeodeOut | null = null;
    for (const dm of DIMS) {
        while ((s.mine.geodes[dm] || 0) > 0 && !(one && n > 0)) {
            const out = crackGeode(s, d, dm);
            if (!out) break;
            n++;
            last = out;
            pushLog(s, `${GEODES[dm].name}: ${out.sub}`, out.color);
        }
    }
    return { n, last };
}

import { skillLevel, skillXpFor, type State } from "./data";
import type { McSymbolName } from "@/components/mc-symbol";
import { fmtStat, type EStat } from "./enchant";
import { colSteps, collectionRewards, craftRewards, milestonesOf, type Ladder, type Milestone, type MsReward } from "./milestones";
import { activeIsland, openIslands } from "./island-logic";
import type { Dim } from "./islands";
import type { GrantKind } from "./skills";

// Farming: the second skill page, built on the same template as Mining (see the
// comment at the top of mine.ts). The Garden is a set of plots that grow real
// crops over time: they keep growing while you are away, and with the Auto-Reaper
// they harvest and replant themselves. Every press of the big button waters a
// random plot and fills the Bloom meter; a full meter starts a Bumper Crop that
// pays triple on your next harvests. Each island has its own crop table (the
// Nether and the End grow crops of their own), farmhands speed up the crops they
// are named for, the Cookhouse turns crops into goods, consumables and permanent
// scarecrows on real-time timers, every crop fills a collection that pays
// permanent bonuses, and harvests sometimes drop seed pods that pay tokens, eggs,
// dust, fragments and even gems. The UI is in
// components/games/fractured-idle/tab-farm.tsx; permanent bonuses reach the rest
// of the game through farmFx() (added to enchant.allFx).

export type CropId =
    | "wheat" | "carrot" | "potato" | "beetroot" | "sugarcane" | "melon" | "pumpkin" | "cocoa" | "sweetberry"
    | "netherwart" | "crimsonfungus" | "warpedfungus" | "glowberry" | "emberbloom"
    | "chorus" | "voidlily" | "starfruit" | "fracflower";

export type GoodId = "flour" | "stew" | "jam" | "cake" | "pie" | "feast" | "emberTart" | "voidTea" | "starCake";
export type EnchId = `e_${CropId}`;
/** Generic currencies, so recipes never need one particular crop: "any" is Enchanted crops of any kind, "k_stalk" and friends are Enchanted crops of one kind. */
export type KindRes = `k_${"stalk" | "root" | "fruit" | "fungus" | "bloom"}`;
export type ResId = CropId | GoodId | EnchId | KindRes | "any";
export type Cost = Partial<Record<ResId, number>>;

/** What a crop is, for tools: every tool is made for one kind of crop. */
export type CropKind = "stalk" | "root" | "fruit" | "fungus" | "bloom";

export interface CropDef {
    id: CropId;
    kind: CropKind;
    name: string;
    color: string;
    dim: Dim;
    need: number; // Farming level that opens it
    time: number; // seconds to grow at speed 1
    yield: number; // crops per harvest at hoe power 1
    vm: number; // shard value multiplier
    handCost: number; // crops for the first farmhand
    reach: number; // how many crops before it (same dimension) its farmhands also speed up
    col: [EStat, number]; // collection reward per tier
    colText: string;
}

const RAW_CROPS: Omit<CropDef, "kind">[] = [
    // Overworld
    { id: "wheat", name: "Wheat", color: "#e6c85a", dim: "overworld", need: 0, time: 20, yield: 6, vm: 0.6, handCost: 30, reach: 0, col: ["minion", 0.02], colText: "minion output" },
    { id: "carrot", name: "Carrot", color: "#ff9a3d", dim: "overworld", need: 3, time: 30, yield: 6, vm: 0.8, handCost: 40, reach: 0, col: ["click", 0.02], colText: "click power" },
    { id: "potato", name: "Potato", color: "#d8b878", dim: "overworld", need: 8, time: 45, yield: 6, vm: 1, handCost: 50, reach: 1, col: ["crit", 0.003], colText: "crit chance" },
    { id: "beetroot", name: "Beetroot", color: "#c0405a", dim: "overworld", need: 14, time: 70, yield: 7, vm: 1.3, handCost: 60, reach: 1, col: ["all", 0.01], colText: "all shards" },
    { id: "sugarcane", name: "Sugar Cane", color: "#9be08a", dim: "overworld", need: 20, time: 100, yield: 8, vm: 1.7, handCost: 70, reach: 2, col: ["auto", 0.15], colText: "auto-clicks/s" },
    { id: "melon", name: "Melon", color: "#5fd06a", dim: "overworld", need: 26, time: 160, yield: 9, vm: 2.2, handCost: 80, reach: 2, col: ["dust", 0.03], colText: "Arcane Dust" },
    { id: "pumpkin", name: "Pumpkin", color: "#ff8a1f", dim: "overworld", need: 33, time: 240, yield: 10, vm: 3, handCost: 90, reach: 3, col: ["minion", 0.04], colText: "minion output" },
    { id: "cocoa", name: "Cocoa", color: "#a0663a", dim: "overworld", need: 40, time: 360, yield: 11, vm: 4, handCost: 100, reach: 3, col: ["tokens", 0.05], colText: "rebirth tokens" },
    { id: "sweetberry", name: "Sweet Berry", color: "#ff5a7a", dim: "overworld", need: 48, time: 520, yield: 12, vm: 5.5, handCost: 110, reach: 4, col: ["luck", 0.03], colText: "enchant luck" },
    // The Nether
    { id: "netherwart", name: "Nether Wart", color: "#c0405a", dim: "nether", need: 0, time: 30, yield: 6, vm: 0.7, handCost: 40, reach: 0, col: ["minion", 0.02], colText: "minion output" },
    { id: "crimsonfungus", name: "Crimson Fungus", color: "#ff5a4d", dim: "nether", need: 24, time: 200, yield: 10, vm: 2, handCost: 70, reach: 0, col: ["click", 0.03], colText: "click power" },
    { id: "warpedfungus", name: "Warped Fungus", color: "#3fe0c0", dim: "nether", need: 30, time: 300, yield: 11, vm: 2.6, handCost: 80, reach: 1, col: ["comboMax", 0.06], colText: "max combo" },
    { id: "glowberry", name: "Glow Berry", color: "#ffd86b", dim: "nether", need: 42, time: 480, yield: 12, vm: 4.5, handCost: 100, reach: 1, col: ["evFreq", 0.03], colText: "popup frequency" },
    { id: "emberbloom", name: "Ember Bloom", color: "#ff8a3d", dim: "nether", need: 56, time: 700, yield: 14, vm: 8, handCost: 130, reach: 3, col: ["all", 0.02], colText: "all shards" },
    // The End
    { id: "chorus", name: "Chorus Fruit", color: "#d8a8f0", dim: "end", need: 0, time: 40, yield: 7, vm: 1, handCost: 60, reach: 0, col: ["click", 0.02], colText: "click power" },
    { id: "voidlily", name: "Void Lily", color: "#8a7bff", dim: "end", need: 36, time: 380, yield: 11, vm: 3.4, handCost: 90, reach: 0, col: ["offline", 0.015], colText: "offline earnings" },
    { id: "starfruit", name: "Starfruit", color: "#fff27a", dim: "end", need: 52, time: 560, yield: 13, vm: 6.5, handCost: 120, reach: 1, col: ["luck", 0.03], colText: "enchant luck" },
    { id: "fracflower", name: "Fracture Flower", color: "#ff6fe0", dim: "end", need: 60, time: 800, yield: 15, vm: 12, handCost: 150, reach: 2, col: ["all", 0.03], colText: "all shards" },
];
const KIND_OF: Record<CropId, CropKind> = {
    wheat: "stalk", sugarcane: "stalk", cocoa: "stalk",
    carrot: "root", potato: "root", beetroot: "root",
    melon: "fruit", pumpkin: "fruit", sweetberry: "fruit", glowberry: "fruit", chorus: "fruit", starfruit: "fruit",
    netherwart: "fungus", crimsonfungus: "fungus", warpedfungus: "fungus",
    emberbloom: "bloom", voidlily: "bloom", fracflower: "bloom",
};
export const CROPS: CropDef[] = RAW_CROPS.map((c) => ({ ...c, kind: KIND_OF[c.id] }));
export const KIND_INFO: Record<CropKind, { name: string; tool: string; color: string; special: string; unit: string }> = {
    stalk: { name: "Stalks", tool: "Scythe", color: "#e6c85a", special: "Shards from every harvest", unit: "%" },
    root: { name: "Roots", tool: "Trowel", color: "#ff9a3d", special: "Farming XP from every harvest", unit: "%" },
    fruit: { name: "Fruits", tool: "Pruners", color: "#5fd06a", special: "Chance of a triple harvest", unit: "pts" },
    fungus: { name: "Fungi", tool: "Spore Knife", color: "#3fe0c0", special: "Seed pod chance", unit: "%" },
    bloom: { name: "Blooms", tool: "Petal Shears", color: "#ff6fe0", special: "Sale price of Enchanted crops", unit: "%" },
};
export const KINDS: CropKind[] = ["stalk", "root", "fruit", "fungus", "bloom"];
export const CROP_BY_ID = Object.fromEntries(CROPS.map((c) => [c.id, c])) as Record<CropId, CropDef>;
const CROP_IDS = new Set<string>(CROPS.map((c) => c.id));
export const DIM_CROPS: Record<Dim, CropDef[]> = {
    overworld: CROPS.filter((c) => c.dim === "overworld"),
    nether: CROPS.filter((c) => c.dim === "nether"),
    end: CROPS.filter((c) => c.dim === "end"),
};
export const DIMS: Dim[] = ["overworld", "nether", "end"];
export const DIM_LABEL: Record<Dim, { name: string; color: string }> = {
    overworld: { name: "Overworld", color: "var(--mc-green)" },
    nether: { name: "The Nether", color: "var(--mc-red)" },
    end: { name: "The End", color: "var(--mc-light-purple)" },
};

export interface GoodDef {
    id: GoodId;
    name: string;
    color: string;
}
export const GOODS: GoodDef[] = [
    { id: "flour", name: "Flour", color: "#f1e6c8" },
    { id: "stew", name: "Hearty Stew", color: "#c89a5a" },
    { id: "jam", name: "Berry Jam", color: "#c0405a" },
    { id: "cake", name: "Sugar Cake", color: "#ffd0e0" },
    { id: "pie", name: "Pumpkin Pie", color: "#ff8a1f" },
    { id: "feast", name: "Harvest Feast", color: "#e0b070" },
    { id: "emberTart", name: "Ember Tart", color: "#ff8a5c" },
    { id: "voidTea", name: "Void Tea", color: "#8a7bff" },
    { id: "starCake", name: "Star Cake", color: "#ff6fe0" },
];
export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<GoodId, GoodDef>;
const GOOD_IDS = new Set<string>(GOODS.map((g) => g.id));

export const isCrop = (id: string): id is CropId => CROP_IDS.has(id);
export const isEnch = (id: string): id is EnchId => id.startsWith("e_") && CROP_IDS.has(id.slice(2));
export const enchId = (id: CropId): EnchId => `e_${id}`;
export const resInfo = (id: ResId): { name: string; color: string } => {
    if (id === "any") return { name: "Enchanted crops (any)", color: "#d9a8ff" };
    if (isKindRes(id)) {
        const k = KIND_INFO[id.slice(2) as CropKind];
        return { name: `Enchanted ${k.name.toLowerCase()} (any)`, color: k.color };
    }
    if (isCrop(id)) return CROP_BY_ID[id];
    if (isEnch(id)) {
        const c = CROP_BY_ID[id.slice(2) as CropId];
        return { name: `Enchanted ${c.name}`, color: c.color };
    }
    return GOOD_BY_ID[id as GoodId];
};

// ---- Island crop tables: what can be planted where, and how often a mixed planting picks it ----

const T = (s: string): [CropId, number][] => s.split(" ").map((p) => [p.split(":")[0] as CropId, Number(p.split(":")[1])]);

export const ISLAND_CROPS: Record<string, [CropId, number][]> = {
    hub: T("wheat:60 carrot:30 potato:10"),
    farm: T("wheat:25 carrot:30 potato:25 beetroot:20"),
    mine: T("wheat:50 carrot:30 potato:20"),
    park: T("carrot:25 potato:25 beetroot:20 melon:15 pumpkin:15"),
    caverns: T("potato:30 beetroot:30 sugarcane:20 sweetberry:20"),
    den: T("pumpkin:25 cocoa:25 sweetberry:25 melon:25"),
    reef: T("sugarcane:30 melon:25 potato:20 cocoa:25"),
    garden: T("sweetberry:35 cocoa:25 pumpkin:20 melon:20"),
    sanctuary: T("wheat:30 carrot:30 beetroot:20 sugarcane:20"),
    casino: T("melon:30 sweetberry:30 pumpkin:20 cocoa:20"),
    crimson: T("netherwart:35 crimsonfungus:40 warpedfungus:25"),
    fortress: T("netherwart:25 crimsonfungus:30 warpedfungus:30 glowberry:15"),
    soul: T("netherwart:15 warpedfungus:40 glowberry:30 emberbloom:15"),
    forge: T("netherwart:10 crimsonfungus:25 glowberry:35 emberbloom:30"),
    arena: T("netherwart:10 warpedfungus:30 glowberry:30 emberbloom:30"),
    end: T("chorus:60 voidlily:35 starfruit:5"),
    dragon: T("chorus:35 voidlily:40 starfruit:20 fracflower:5"),
    void: T("chorus:20 voidlily:35 starfruit:30 fracflower:15"),
    fractured: T("chorus:10 voidlily:20 starfruit:35 fracflower:35"),
    tempest: T("chorus:10 voidlily:30 starfruit:35 fracflower:25"),
    spire: T("chorus:5 voidlily:20 starfruit:30 fracflower:45"),
};
const DIM_DEFAULT: Record<Dim, [CropId, number][]> = { overworld: ISLAND_CROPS.hub, nether: ISLAND_CROPS.crimson, end: ISLAND_CROPS.end };

/** Islands that grow a crop, for the "where do I find it" hints. */
export const cropIslands = (id: CropId): string[] => Object.entries(ISLAND_CROPS).filter(([, t]) => t.some(([c]) => c === id)).map(([k]) => k);

/** Harvested-count thresholds for each collection tier. */
export const COL_AT = [100, 400, 2000, 10000, 50000, 200000, 750000, 2500000, 10000000, 50000000];
export const colTierOf = (n: number) => COL_AT.filter((x) => n >= x).length;

// ---- Gear ----

export interface HoeDef {
    id: string;
    name: string;
    color: string;
    power: number;
    need: number;
    cost: Cost;
}
export const HOES: HoeDef[] = [
    { id: "wood", name: "Wooden Hoe", color: "#b98a4a", power: 1, need: 0, cost: {} },
    { id: "stone", name: "Stone Hoe", color: "#a0a0ac", power: 1.6, need: 1, cost: { wheat: 40 } },
    { id: "copper", name: "Copper Hoe", color: "#e0874a", power: 2.5, need: 4, cost: { wheat: 120, any: 2 } },
    { id: "iron", name: "Iron Hoe", color: "#d8d8e6", power: 4, need: 9, cost: { any: 6 } },
    { id: "gold", name: "Golden Hoe", color: "#ffcc33", power: 6.5, need: 15, cost: { any: 14 } },
    { id: "diamond", name: "Diamond Hoe", color: "#55ffff", power: 10, need: 22, cost: { any: 28 } },
    { id: "nether", name: "Netherite Hoe", color: "#c98a9a", power: 16, need: 32, cost: { any: 55 } },
    { id: "ember", name: "Ember Hoe", color: "#ff8a5c", power: 26, need: 44, cost: { any: 100 } },
    { id: "void", name: "Void Hoe", color: "#8a7bff", power: 42, need: 52, cost: { any: 170 } },
    { id: "cosmic", name: "Cosmic Hoe", color: "#ffb3f2", power: 70, need: 58, cost: { any: 280 } },
];
/** Click power every hoe tier adds for the rest of the game. */
export const HOE_CLICK = 0.008;

export type UpCat = "hand" | "rig" | "kitchen" | "market";

export interface FarmUpDef {
    id: string;
    name: string;
    desc: string;
    cat: UpCat;
    cost: Cost;
    growth: number;
    max: number;
    need: number;
}
export const FARM_UPS: FarmUpDef[] = [
    // Hand tools
    { id: "till", name: "Tilling", desc: "+6% hoe power per level", cat: "hand", cost: { wheat: 15 }, growth: 1.35, max: 30, need: 0 },
    { id: "fert", name: "Fertilizer", desc: "+8% crops from every harvest per level", cat: "hand", cost: { carrot: 12 }, growth: 1.38, max: 30, need: 3 },
    { id: "lucky", name: "Lucky Harvest", desc: "+1.5% chance of a triple harvest per level", cat: "hand", cost: { potato: 10 }, growth: 1.4, max: 20, need: 8 },
    { id: "water", name: "Watering Can", desc: "Every press of the big button waters 8% longer per level", cat: "hand", cost: { beetroot: 8 }, growth: 1.42, max: 15, need: 14 },
    { id: "seeker", name: "Pod Seeker", desc: "+10% seed pod chance per level", cat: "hand", cost: { sugarcane: 8 }, growth: 1.4, max: 20, need: 20 },
    { id: "prosp", name: "Seed Selector", desc: "Mixed plantings pick rarer crops more often", cat: "hand", cost: { melon: 8 }, growth: 1.45, max: 15, need: 26 },
    { id: "bumper", name: "Bumper Rig", desc: "+2 harvests and +10% yield in a Bumper Crop per level", cat: "hand", cost: { pumpkin: 5 }, growth: 1.5, max: 10, need: 33 },
    { id: "scholar", name: "Almanac Study", desc: "+6% Farming XP per level", cat: "hand", cost: { cocoa: 6 }, growth: 1.45, max: 15, need: 40 },
    { id: "deep", name: "Deep Roots", desc: "+1% all shards per level", cat: "hand", cost: { sweetberry: 5 }, growth: 1.5, max: 15, need: 48 },
    { id: "ancient", name: "Ancient Seeds", desc: "+1.5% all shards and +2% tokens per level", cat: "hand", cost: { emberbloom: 3 }, growth: 1.6, max: 10, need: 56 },
    // Garden rig
    { id: "reaper", name: "Auto-Reaper", desc: "Ripe crops harvest and replant themselves, also while you are away", cat: "rig", cost: { wheat: 80 }, growth: 1, max: 1, need: 5 },
    { id: "sprinkler", name: "Sprinklers", desc: "Every crop grows 5% faster per level", cat: "rig", cost: { carrot: 15 }, growth: 1.4, max: 25, need: 5 },
    { id: "compost", name: "Compost Heap", desc: "+5% crops from auto-harvests per level", cat: "rig", cost: { beetroot: 10 }, growth: 1.45, max: 25, need: 14 },
    { id: "sifter", name: "Pod Sifter", desc: "Auto-harvests find 12% more pods per level", cat: "rig", cost: { melon: 6 }, growth: 1.45, max: 15, need: 24 },
    { id: "cracker", name: "Pod Opener", desc: "Opens seed pods for you, faster every level", cat: "rig", cost: { stew: 2 }, growth: 1.8, max: 5, need: 22 },
    { id: "plots", name: "Extra Plot", desc: "One more plot in every garden", cat: "rig", cost: { potato: 40 }, growth: 2.4, max: 4, need: 6 },
    { id: "field", name: "Field Rows", desc: "Plots of the same crop in a garden boost each other. +4% to the cap of that field bonus per level", cat: "rig", cost: { carrot: 40 }, growth: 1.45, max: 20, need: 6 },
    // Cookhouse parts
    { id: "oven", name: "Extra Oven", desc: "One more crafting slot", cat: "kitchen", cost: { flour: 6 }, growth: 2.2, max: 3, need: 10 },
    { id: "stoker", name: "Stoker", desc: "Crafts finish 8% sooner per level", cat: "kitchen", cost: { potato: 20 }, growth: 1.35, max: 20, need: 8 },
    { id: "ladle", name: "Auto-Ladle", desc: "Ovens empty themselves, and a craft can repeat on its own", cat: "kitchen", cost: { jam: 4 }, growth: 1, max: 1, need: 18 },
    { id: "tend", name: "Green Thumb", desc: "+10% growth from every tap on a growing plot per level", cat: "hand", cost: { potato: 14 }, growth: 1.4, max: 20, need: 6 },
    { id: "rhythm", name: "Harvest Rhythm", desc: "Hand-picks chain into a streak: +0.5s window and +5% streak cap per level", cat: "hand", cost: { carrot: 30 }, growth: 1.42, max: 15, need: 8 },
    { id: "golden", name: "Golden Seeds", desc: "+1% chance that a planted crop turns golden (5x crops) per level", cat: "hand", cost: { melon: 10 }, growth: 1.5, max: 15, need: 26 },
    { id: "table", name: "Enchanting Table", desc: "Each Enchanted crop needs 6 fewer raw crops per level", cat: "market", cost: { wheat: 200 }, growth: 1.5, max: 10, need: 4 },
    { id: "market", name: "Market Stall", desc: "+6% shards from every Enchanted crop you sell per level", cat: "market", cost: { any: 2 }, growth: 1.55, max: 20, need: 8 },
    { id: "chef", name: "Master Chef", desc: "8% chance per level to cook a double batch", cat: "kitchen", cost: { cake: 3 }, growth: 1.6, max: 10, need: 26 },
];
export const FARM_UP_BY_ID = Object.fromEntries(FARM_UPS.map((u) => [u.id, u])) as Record<string, FarmUpDef>;

// ---- Cookhouse recipes ----

export type RecipeKind = "good" | "item" | "relic";
export type ItemId = "fertilizer" | "tonic" | "basket";

export interface RecipeDef {
    id: string;
    kind: RecipeKind;
    name: string;
    desc: string;
    color: string;
    need: number;
    time: number;
    inputs: Cost;
    out: string;
}

export const ITEMS: { id: ItemId; name: string; desc: string; color: string }[] = [
    { id: "fertilizer", name: "Fertilizer", desc: "Grows every plot by 10 minutes at once", color: "#9be08a" },
    { id: "tonic", name: "Harvest Tonic", desc: "Starts a Bumper Crop immediately", color: "#ffd23a" },
    { id: "basket", name: "Pod Basket", desc: "Opens into 3 seed pods native to your current dimension", color: "#c58bff" },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, (typeof ITEMS)[number]>;
const ITEM_IDS = new Set<string>(ITEMS.map((i) => i.id));

export const RECIPES: RecipeDef[] = [
    // Goods: the materials every hoe and scarecrow is made of
    { id: "flour", kind: "good", name: "Flour", desc: "Mill wheat", color: "#f1e6c8", need: 3, time: 20, inputs: { wheat: 25 }, out: "flour" },
    { id: "stew", kind: "good", name: "Hearty Stew", desc: "Potatoes, slow cooked", color: "#c89a5a", need: 8, time: 45, inputs: { potato: 25 }, out: "stew" },
    { id: "jam", kind: "good", name: "Berry Jam", desc: "Beetroot boiled down", color: "#c0405a", need: 14, time: 90, inputs: { beetroot: 25 }, out: "jam" },
    { id: "cake", kind: "good", name: "Sugar Cake", desc: "Sugar cane folded into flour", color: "#ffd0e0", need: 20, time: 150, inputs: { sugarcane: 30, flour: 1 }, out: "cake" },
    { id: "pie", kind: "good", name: "Pumpkin Pie", desc: "Pumpkin and melon in a crust", color: "#ff8a1f", need: 33, time: 360, inputs: { pumpkin: 30, melon: 20 }, out: "pie" },
    { id: "feast", kind: "good", name: "Harvest Feast", desc: "Cocoa and sweet berries, a proper spread", color: "#e0b070", need: 40, time: 600, inputs: { cocoa: 30, sweetberry: 20, jam: 1 }, out: "feast" },
    { id: "emberTart", kind: "good", name: "Ember Tart", desc: "Fungus and glow berries baked hot", color: "#ff8a5c", need: 44, time: 1200, inputs: { crimsonfungus: 30, warpedfungus: 20, glowberry: 15 }, out: "emberTart" },
    { id: "voidTea", kind: "good", name: "Void Tea", desc: "Lily and chorus steeped in the dark", color: "#8a7bff", need: 52, time: 1500, inputs: { voidlily: 30, chorus: 40, starfruit: 10 }, out: "voidTea" },
    { id: "starCake", kind: "good", name: "Star Cake", desc: "Fracture flowers on a tea-soaked sponge", color: "#ff6fe0", need: 60, time: 3600, inputs: { fracflower: 15, voidTea: 2 }, out: "starCake" },
    // Consumables
    { id: "fertilizer", kind: "item", name: "Fertilizer", desc: "Grows every plot by 10 minutes", color: "#9be08a", need: 6, time: 30, inputs: { wheat: 80, carrot: 40 }, out: "fertilizer" },
    { id: "tonic", kind: "item", name: "Harvest Tonic", desc: "Starts a Bumper Crop now", color: "#ffd23a", need: 18, time: 120, inputs: { sugarcane: 40, jam: 1 }, out: "tonic" },
    { id: "basket", kind: "item", name: "Pod Basket", desc: "Three pods from your current dimension", color: "#c58bff", need: 24, time: 300, inputs: { melon: 30, stew: 1 }, out: "basket" },
    // Scarecrows: one of each, permanent, slow, equipped into slots
    { id: "straw", kind: "relic", name: "Straw Hat", desc: "+6% crops from everything", color: "#e6c85a", need: 5, time: 300, inputs: { flour: 4, wheat: 400 }, out: "straw" },
    { id: "gloves", kind: "relic", name: "Green Gloves", desc: "+10% hoe power", color: "#9be08a", need: 12, time: 1200, inputs: { stew: 6, flour: 2 }, out: "gloves" },
    { id: "clover", kind: "relic", name: "Lucky Clover", desc: "+6% chance of a triple harvest", color: "#5fd06a", need: 15, time: 2400, inputs: { jam: 3, stew: 4 }, out: "clover" },
    { id: "shears", kind: "relic", name: "Golden Shears", desc: "+20% seed pod chance, rarer crops", color: "#ffcc33", need: 18, time: 3600, inputs: { jam: 6, stew: 4 }, out: "shears" },
    { id: "totem", kind: "relic", name: "Bumper Totem", desc: "+6 harvests in every Bumper Crop", color: "#ffb84d", need: 22, time: 5400, inputs: { jam: 8, sugarcane: 300 }, out: "totem" },
    { id: "almanac", kind: "relic", name: "Old Almanac", desc: "+2.5% all shards", color: "#e0b070", need: 24, time: 7200, inputs: { cake: 6, melon: 200 }, out: "almanac" },
    { id: "hearth", kind: "relic", name: "Hearth Stone", desc: "+25% farmhand output, crafts 10% sooner", color: "#ff9a4d", need: 30, time: 14400, inputs: { cake: 10, pumpkin: 400 }, out: "hearth" },
    { id: "sundial", kind: "relic", name: "Sun Dial", desc: "+10% growth speed and farmhand output", color: "#fff27a", need: 34, time: 28800, inputs: { pie: 8, cake: 3 }, out: "sundial" },
    { id: "sickle", kind: "relic", name: "Diamond Sickle", desc: "+8% click power", color: "#55ffff", need: 36, time: 21600, inputs: { pie: 8, cake: 8 }, out: "sickle" },
    { id: "lens", kind: "relic", name: "Ember Lens", desc: "+10% crops, +10% minion output", color: "#ff8a5c", need: 44, time: 28800, inputs: { emberTart: 6, pie: 4 }, out: "lens" },
    { id: "lantern", kind: "relic", name: "Void Lantern", desc: "+15% hoe power, +5 Bumper Crop harvests", color: "#8a7bff", need: 52, time: 43200, inputs: { voidTea: 6, emberTart: 4 }, out: "lantern" },
    { id: "plenty", kind: "relic", name: "Crown of Plenty", desc: "+6% all shards, +8% tokens", color: "#ff6fe0", need: 60, time: 57600, inputs: { starCake: 4 }, out: "plenty" },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r])) as Record<string, RecipeDef>;
export const RELICS = RECIPES.filter((r) => r.kind === "relic");
/** The recipes that use a resource, for "used in" lines. */
export const usedInRecipes = (id: string) => RECIPES.filter((r) => id in r.inputs);
const RELIC_IDS = new Set<string>(RELICS.map((r) => r.id));
const RECIPE_IDS = new Set<string>(RECIPES.map((r) => r.id));


// ---- Tools: one line per kind of crop, five tiers each, worn on the tool belt ----

export interface ToolDef {
    id: string;
    kind: CropKind;
    tier: number;
    name: string;
    need: number;
    cost: Cost;
    yield: number; // +crops from harvests of this kind
    speed: number; // +growth speed of this kind
    special: number; // see KIND_INFO.special
}
const TOOL_YIELD = [0.08, 0.18, 0.32, 0.5, 0.8];
const TOOL_SPEED = [0, 0.04, 0.08, 0.14, 0.22];
const TOOL_SPECIAL: Record<CropKind, number[]> = {
    stalk: [0.1, 0.2, 0.35, 0.55, 0.9],
    root: [0.1, 0.2, 0.35, 0.55, 0.9],
    fruit: [0.01, 0.02, 0.035, 0.05, 0.08],
    fungus: [0.1, 0.2, 0.35, 0.55, 0.9],
    bloom: [0.1, 0.2, 0.35, 0.55, 0.9],
};
/** The stat a worn tool of each kind adds to the whole game, per tier. */
export const TOOL_FX: Record<CropKind, [EStat, number]> = { stalk: ["minion", 0.006], root: ["click", 0.006], fruit: ["luck", 0.01], fungus: ["dust", 0.012], bloom: ["all", 0.004] };
const TOOL_LINES: Record<CropKind, { names: string[]; need: number[] }> = {
    stalk: { names: ["Bronze Scythe", "Iron Scythe", "Golden Scythe", "Diamond Scythe", "Cosmic Scythe"], need: [5, 12, 24, 42, 54] },
    root: { names: ["Stone Trowel", "Iron Trowel", "Golden Trowel", "Diamond Trowel", "Cosmic Trowel"], need: [6, 12, 20, 34, 50] },
    fruit: { names: ["Fruit Pruners", "Iron Pruners", "Golden Pruners", "Diamond Pruners", "Cosmic Pruners"], need: [12, 28, 36, 52, 60] },
    fungus: { names: ["Bone Spore Knife", "Iron Spore Knife", "Golden Spore Knife", "Diamond Spore Knife", "Cosmic Spore Knife"], need: [6, 26, 32, 44, 56] },
    bloom: { names: ["Petal Shears", "Iron Petal Shears", "Golden Petal Shears", "Diamond Petal Shears", "Cosmic Petal Shears"], need: [36, 44, 56, 58, 60] },
};
/** Enchanted crops of the tool's kind (any crop of it, any dimension) each tier costs. */
export const TOOL_ENCH = [6, 18, 50, 130, 320];
const toolCost = (kind: CropKind, i: number): Cost => ({ [`k_${kind}`]: TOOL_ENCH[i] } as Cost);
export const TOOLS: ToolDef[] = KINDS.flatMap((kind) =>
    TOOL_LINES[kind].names.map((name, i) => ({ id: `${kind}${i + 1}`, kind, tier: i + 1, name, need: TOOL_LINES[kind].need[i], cost: toolCost(kind, i), yield: TOOL_YIELD[i], speed: TOOL_SPEED[i], special: TOOL_SPECIAL[kind][i] })),
);
export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<string, ToolDef>;
export const toolsOf = (kind: CropKind) => TOOLS.filter((t) => t.kind === kind);

export const BASE_PLOTS: Record<Dim, number> = { overworld: 6, nether: 4, end: 4 };

export interface Job {
    r: string;
    n: number;
    end: number;
    slot: number;
    loop?: boolean;
}
export interface LogEntry {
    text: string;
    color: string;
}
export interface Plot {
    c: string; // crop id, "" = empty
    p: number; // growth in effective seconds, 0..time
    t?: number; // when it was last tended (ms)
    g?: boolean; // golden: pays 5x crops
}

export interface FarmState {
    crop: Record<string, number>; // crops in stock
    grown: Record<string, number>; // lifetime per crop (collection)
    goods: Record<string, number>;
    items: Record<string, number>;
    relics: string[];
    equipped: string[];
    claimed: string[];
    hoe: number;
    ups: Record<string, number>;
    hands: Record<string, number>;
    gardens: Record<Dim, Plot[]>; // one garden per dimension, every open one grows at once
    sow: Record<Dim, string>; // crop to plant by hand in each garden ("" = the best one open)
    ench: Record<string, number>; // Enchanted crops in stock
    enchanted: number; // Enchanted crops made, ever
    soldN: number; // Enchanted crops sold, ever
    sold: number; // shards earned from sales
    tools: string[]; // tools made
    belt: string[]; // tools worn (one per kind)
    streak: number; // hand-picks in a row
    streakAt: number;
    bestStreak: number;
    tends: number; // taps on growing plots
    goldens: number; // golden crops harvested
    waters: number; // presses of the big button that watered a plot
    harvests: number; // harvests (by hand, by Reaper, offline)
    picked: number; // harvested by hand
    bumpers: number;
    pods: Record<string, number>;
    opened: number;
    podFrac: Record<string, number>;
    openT: number;
    bloom: number; // 0..1 toward a Bumper Crop
    bumper: number; // harvests left in the current Bumper Crop
    focus: string;
    jobs: Job[];
    crafted: number;
    log: LogEntry[];
    made: Record<string, number>; // goods cooked, ever (milestones)
    crew: Record<string, number>; // level of each crew department
    auto: { pack: boolean; sell: boolean; cook: boolean; sow: "off" | "best" | "goal" }; // what the crew is allowed to do
    acc: Record<string, number>; // crew work carried between ticks
    soldRaw: number; // raw crops sold, ever
}

export const newFarm = (): FarmState => ({
    crop: {}, grown: {}, goods: {}, items: {}, relics: [], equipped: [], claimed: [], hoe: 0, ups: {}, hands: {},
    gardens: {
        overworld: Array.from({ length: BASE_PLOTS.overworld }, () => ({ c: "", p: 0 })),
        nether: Array.from({ length: BASE_PLOTS.nether }, () => ({ c: "", p: 0 })),
        end: Array.from({ length: BASE_PLOTS.end }, () => ({ c: "", p: 0 })),
    },
    sow: { overworld: "", nether: "", end: "" }, ench: {}, enchanted: 0, soldN: 0, sold: 0, tools: [], belt: [],
    streak: 0, streakAt: 0, bestStreak: 0, tends: 0, goldens: 0, waters: 0, harvests: 0, picked: 0, bumpers: 0,
    pods: {}, opened: 0, podFrac: {}, openT: 0, bloom: 0, bumper: 0, focus: "", jobs: [], crafted: 0, log: [],
    made: {}, crew: {}, auto: { pack: true, sell: true, cook: true, sow: "best" }, acc: {}, soldRaw: 0,
});

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function cleanFarm(raw: unknown): FarmState {
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const out = newFarm();
    const rec = (src: unknown, keep: (k: string) => boolean, floor = false) => {
        const r: Record<string, number> = {};
        for (const [k, v] of Object.entries(src && typeof src === "object" ? (src as Record<string, unknown>) : {})) if (keep(k) && num(v) > 0) r[k] = floor ? Math.floor(num(v)) : num(v);
        return r;
    };
    out.crop = rec(o.crop, (k) => CROP_IDS.has(k));
    out.grown = rec(o.grown, (k) => CROP_IDS.has(k));
    out.goods = rec(o.goods, (k) => GOOD_IDS.has(k), true);
    out.items = rec(o.items, (k) => ITEM_IDS.has(k), true);
    out.relics = (Array.isArray(o.relics) ? o.relics : []).filter((x, i, a): x is string => typeof x === "string" && RELIC_IDS.has(x) && a.indexOf(x) === i);
    out.equipped = (Array.isArray(o.equipped) ? o.equipped : out.relics).filter((x, i, a): x is string => typeof x === "string" && out.relics.includes(x) && a.indexOf(x) === i).slice(0, 4);
    out.claimed = (Array.isArray(o.claimed) ? o.claimed : []).filter((x, i, a): x is string => typeof x === "string" && a.indexOf(x) === i).slice(0, 500);
    out.hoe = Math.max(0, Math.min(HOES.length - 1, Math.floor(num(o.hoe))));
    out.ups = rec(o.ups, (k) => !!FARM_UP_BY_ID[k], true);
    for (const u of FARM_UPS) if (out.ups[u.id]) out.ups[u.id] = Math.min(u.max, out.ups[u.id]);
    out.hands = rec(o.hands, (k) => CROP_IDS.has(k), true);
    out.made = rec(o.made, (k) => GOOD_IDS.has(k), true);
    out.crew = rec(o.crew, (k) => !!CREW_BY_ID[k], true);
    for (const c of CREW) if (out.crew[c.id]) out.crew[c.id] = Math.min(c.max, out.crew[c.id]);
    const au = (o.auto && typeof o.auto === "object" ? o.auto : {}) as Record<string, unknown>;
    out.auto = { pack: au.pack !== false, sell: au.sell !== false, cook: au.cook !== false, sow: au.sow === "off" || au.sow === "goal" ? au.sow : "best" };
    out.acc = rec(o.acc, (k) => ["pack", "sell", "sowT", "cookT"].includes(k));
    out.soldRaw = Math.max(0, Math.floor(num(o.soldRaw)));
    const parsePlots = (src: unknown): Plot[] =>
        (Array.isArray(src) ? (src as Record<string, unknown>[]) : []).slice(0, 80).map((p) => {
            const c = typeof p?.c === "string" && CROP_IDS.has(p.c) ? p.c : "";
            const pl: Plot = { c, p: c ? Math.max(0, Math.min(CROP_BY_ID[c as CropId].time * 4, num(p?.p))) : 0 };
            if (c && p?.g === true) pl.g = true;
            return pl;
        });
    const rawG = (o.gardens && typeof o.gardens === "object" ? o.gardens : {}) as Record<string, unknown>;
    for (const dm of DIMS) out.gardens[dm] = parsePlots(rawG[dm]);
    if (Array.isArray(o.plots) && o.plots.length) {
        // an older save kept a single garden: it moves to the dimension of what is growing in it
        const old = parsePlots(o.plots);
        const first = old.find((p) => p.c);
        const dm: Dim = first ? CROP_BY_ID[first.c as CropId].dim : "overworld";
        if (!out.gardens[dm].some((p) => p.c)) out.gardens[dm] = old;
    }
    for (const dm of DIMS) while (out.gardens[dm].length < BASE_PLOTS[dm]) out.gardens[dm].push({ c: "", p: 0 });
    out.sow = { overworld: "", nether: "", end: "" };
    const rs = o.sow;
    if (typeof rs === "string" && CROP_IDS.has(rs)) out.sow[CROP_BY_ID[rs as CropId].dim] = rs;
    else if (rs && typeof rs === "object") for (const dm of DIMS) {
        const v = (rs as Record<string, unknown>)[dm];
        if (typeof v === "string" && CROP_IDS.has(v) && CROP_BY_ID[v as CropId].dim === dm) out.sow[dm] = v;
    }
    out.ench = rec(o.ench, (k) => CROP_IDS.has(k), true);
    out.enchanted = Math.max(0, Math.floor(num(o.enchanted)));
    out.soldN = Math.max(0, Math.floor(num(o.soldN)));
    out.sold = Math.max(0, num(o.sold));
    out.tools = (Array.isArray(o.tools) ? o.tools : []).filter((x, i, a2): x is string => typeof x === "string" && !!TOOL_BY_ID[x] && a2.indexOf(x) === i);
    const seenKinds = new Set<string>();
    out.belt = (Array.isArray(o.belt) ? o.belt : []).filter((x): x is string => {
        if (typeof x !== "string" || !out.tools.includes(x) || seenKinds.has(TOOL_BY_ID[x].kind)) return false;
        seenKinds.add(TOOL_BY_ID[x].kind);
        return true;
    }).slice(0, 5);
    out.streak = Math.max(0, Math.floor(num(o.streak)));
    out.streakAt = Math.max(0, num(o.streakAt));
    out.bestStreak = Math.max(0, Math.floor(num(o.bestStreak)));
    out.tends = Math.max(0, Math.floor(num(o.tends)));
    out.goldens = Math.max(0, Math.floor(num(o.goldens)));
    out.waters = Math.max(0, Math.floor(num(o.waters)));
    out.harvests = Math.max(0, Math.floor(num(o.harvests)));
    out.picked = Math.max(0, Math.floor(num(o.picked)));
    out.bumpers = Math.max(0, Math.floor(num(o.bumpers)));
    out.pods = rec(o.pods, (k) => (DIMS as string[]).includes(k), true);
    out.opened = Math.max(0, Math.floor(num(o.opened)));
    out.podFrac = rec(o.podFrac, (k) => (DIMS as string[]).includes(k));
    out.openT = Math.max(0, num(o.openT));
    out.bloom = Math.max(0, Math.min(1, num(o.bloom)));
    out.bumper = Math.max(0, Math.min(60, Math.floor(num(o.bumper))));
    out.focus = typeof o.focus === "string" && CROP_IDS.has(o.focus) ? o.focus : "";
    out.jobs = (Array.isArray(o.jobs) ? (o.jobs as Record<string, unknown>[]) : [])
        .filter((j) => j && typeof j.r === "string" && RECIPE_IDS.has(j.r) && num(j.end) > 0)
        .map((j, i) => ({ r: String(j.r), n: Math.max(1, Math.min(50, Math.floor(num(j.n, 1)))), end: num(j.end), slot: Math.max(0, Math.floor(num(j.slot, i))), loop: j.loop === true || undefined }))
        .slice(0, 4);
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
        .map((e) => ({ text: String(e.text).slice(0, 80), color: String(e.color).slice(0, 40) }))
        .slice(0, 8);
    return out;
}

// ---- What each dimension does to farming ----

export interface DimFxDef {
    tag: string;
    xp: number;
    yield: number;
    bumper: number;
    pod: number;
    speed: number;
    blurb: string;
    lines: string[];
}
export const DIM_FX: Record<Dim, DimFxDef> = {
    overworld: { tag: "Verdant", xp: 1.12, yield: 1, bumper: 0, pod: 1, speed: 1, blurb: "Good soil and gentle weather. The best place to learn and to level.", lines: ["+12% Farming XP"] },
    nether: { tag: "Ember", xp: 1, yield: 1.1, bumper: 3, pod: 1.25, speed: 1.12, blurb: "Warm ground, fast fungus and heavy yields.", lines: ["Crops grow 12% faster", "+10% crops", "Bumper Crop lasts 3 harvests longer", "+25% seed pods"] },
    end: { tag: "Void", xp: 1.05, yield: 1.08, bumper: 2, pod: 1.6, speed: 1.1, blurb: "Thin soil and strange blooms, and a lot of pods.", lines: ["+60% seed pod chance", "Crops grow 10% faster", "+8% crops, +5% Farming XP", "Bumper Crop lasts 2 harvests longer"] },
};
/** The farming effects of the dimension you are standing in. */
export const dimFx = (s: State): DimFxDef => DIM_FX[activeIsland(s).dim];
export const dimFxOf = (dim: Dim): DimFxDef => DIM_FX[dim];

// ---- Numbers ----

export const farmLevel = (s: State) => skillLevel(s.farming);
export const cropOpen = (s: State, c: CropDef) => farmLevel(s) >= c.need;
export const upLevel = (s: State, id: string) => s.farm.ups[id] || 0;
export const haveCrop = (s: State, id: CropId) => s.farm.crop[id] || 0;
export const isKindRes = (id: string): id is KindRes => id.startsWith("k_") && (KINDS as string[]).includes(id.slice(2));
const enchOfKind = (s: State, kind: CropKind) => CROPS.filter((c) => c.kind === kind).reduce((a, c) => a + (s.farm.ench[c.id] || 0), 0);
export const enchTotal = (s: State) => CROPS.reduce((a, c) => a + (s.farm.ench[c.id] || 0), 0);
export const have = (s: State, id: ResId) =>
    id === "any" ? enchTotal(s) : isKindRes(id) ? enchOfKind(s, id.slice(2) as CropKind) : isCrop(id) ? s.farm.crop[id] || 0 : isEnch(id) ? s.farm.ench[id.slice(2)] || 0 : s.farm.goods[id] || 0;
export const hoeOf = (s: State) => HOES[s.farm.hoe];

export const hasRelic = (s: State, id: string) => s.farm.equipped.includes(id);
export const ownsRelic = (s: State, id: string) => s.farm.relics.includes(id);
export const relicSlots = (s: State) => 2 + (farmLevel(s) >= 25 ? 1 : 0) + (farmLevel(s) >= 45 ? 1 : 0);
export function equipRelic(s: State, id: string): boolean {
    if (!ownsRelic(s, id) || hasRelic(s, id) || s.farm.equipped.length >= relicSlots(s)) return false;
    s.farm.equipped.push(id);
    return true;
}
export function unequipRelic(s: State, id: string): boolean {
    if (!hasRelic(s, id)) return false;
    s.farm.equipped = s.farm.equipped.filter((x) => x !== id);
    return true;
}

/** A garden is open once you can reach its dimension (or you already farmed there). The Overworld is always open. */
export const gardenOpen = (s: State, dim: Dim) =>
    dim === "overworld" || openIslands(s).some((i) => i.dim === dim) || s.farm.gardens[dim].some((p) => p.c) || DIM_CROPS[dim].some((c) => (s.farm.grown[c.id] || 0) > 0);
export const openDims = (s: State): Dim[] => DIMS.filter((d) => gardenOpen(s, d));
/** Plots in a garden: the base, three level steps, Extra Plot, and the Acres (rebirth) and Estate (ascension) upgrades. */
export const plotCount = (s: State, dim: Dim) =>
    BASE_PLOTS[dim] + (farmLevel(s) >= 10 ? 2 : 0) + (farmLevel(s) >= 25 ? 2 : 0) + (farmLevel(s) >= 40 ? 2 : 0) + upLevel(s, "plots") + (s.rups.acres || 0) * 2 + (s.aups.estate || 0) * 6;
export interface PlotRef {
    dim: Dim;
    i: number;
    pl: Plot;
}
/** Every plot of every open garden. */
export const allPlots = (s: State): PlotRef[] => openDims(s).flatMap((dim) => s.farm.gardens[dim].map((pl, i) => ({ dim, i, pl })));

// tools worn on the belt
export const toolSlots = (s: State) => 2 + (farmLevel(s) >= 18 ? 1 : 0) + (farmLevel(s) >= 34 ? 1 : 0) + (farmLevel(s) >= 50 ? 1 : 0);
export const ownsTool = (s: State, id: string) => s.farm.tools.includes(id);
export const toolWorn = (s: State, id: string) => s.farm.belt.includes(id);
export const beltTool = (s: State, kind: CropKind): ToolDef | undefined => TOOL_BY_ID[s.farm.belt.find((id) => TOOL_BY_ID[id]?.kind === kind) ?? ""];
export const toolYield = (s: State, kind: CropKind) => beltTool(s, kind)?.yield ?? 0;
export const toolSpeed = (s: State, kind: CropKind) => beltTool(s, kind)?.speed ?? 0;
export const toolSpecial = (s: State, kind: CropKind) => beltTool(s, kind)?.special ?? 0;

export const hoePower = (s: State) => hoeOf(s).power * (1 + 0.06 * upLevel(s, "till") + (hasRelic(s, "gloves") ? 0.1 : 0) + (hasRelic(s, "lantern") ? 0.15 : 0));
/** Hoe power helps crops, but with a softening curve. */
export const hoeFactor = (s: State) => Math.pow(hoePower(s), 0.55);
export const yieldMult = (s: State, dim: Dim = activeIsland(s).dim) => DIM_FX[dim].yield * (1 + 0.05 * (s.rups.loam || 0)) * (1 + 0.08 * upLevel(s, "fert")) * (hasRelic(s, "straw") ? 1.06 : 1) * (hasRelic(s, "lens") ? 1.1 : 1);
export const luckyChance = (s: State, kind?: CropKind) => 0.015 * upLevel(s, "lucky") + (hasRelic(s, "clover") ? 0.06 : 0) + (kind === "fruit" ? toolSpecial(s, "fruit") : 0);
export const goldenChance = (s: State) => 0.01 + 0.01 * upLevel(s, "golden") + 0.005 * crewLevel(s, "agron") + (hasRelic(s, "clover") ? 0.01 : 0);
export const podChance = (s: State, dim: Dim = activeIsland(s).dim, kind?: CropKind) => DIM_FX[dim].pod * 0.003 * (1 + 0.1 * upLevel(s, "seeker") + (hasRelic(s, "shears") ? 0.2 : 0) + (kind === "fungus" ? toolSpecial(s, "fungus") : 0));
export const bloomNeed = (s: State) => 90;
export const bumperLen = (s: State) => 6 + 2 * upLevel(s, "bumper") + (hasRelic(s, "lantern") ? 5 : 0) + (hasRelic(s, "totem") ? 6 : 0) + dimFx(s).bumper;
export const bumperMult = (s: State) => 3 * (1 + 0.1 * upLevel(s, "bumper"));
export const farmXpMult = (s: State, dim: Dim = activeIsland(s).dim, kind?: CropKind) => (1 + 0.06 * upLevel(s, "scholar")) * DIM_FX[dim].xp * (kind === "root" ? 1 + toolSpecial(s, "root") : 1);
export const hasReaper = (s: State) => upLevel(s, "reaper") > 0;
export const ovenSlots = (s: State) => 1 + upLevel(s, "oven");
export const cookSpeed = (s: State) => 1 + 0.08 * upLevel(s, "stoker") + 0.03 * crewLevel(s, "cooks") + (hasRelic(s, "hearth") ? 0.1 : 0);
export const openEvery = (s: State) => (upLevel(s, "cracker") > 0 ? 36 / upLevel(s, "cracker") : Infinity);
/** Seconds of growth a press of the big button gives a plot. */
export const waterBoost = (s: State, combo: number) => 0.35 * (1 + 0.45 * Math.max(0, combo - 1)) * (1 + 0.08 * upLevel(s, "water"));

export const FARM_VALUE = 0.002; // shards a harvest pays: this share of the minions' output over the crop's growing time
export const eff = (n: number) => Math.pow(n, 0.85);
export const totalHands = (s: State) => Object.values(s.farm.hands).reduce((a, b) => a + b, 0);

/** Farmhand speed-up for a crop: its own hands, and the bigger hands that reach down to it. */
export function handBoost(s: State, c: CropDef): number {
    const list = DIM_CROPS[c.dim];
    const i = list.indexOf(c);
    let n = 0;
    for (let j = i; j < list.length; j++) {
        const k = s.farm.hands[list[j].id] || 0;
        if (k && j - list[j].reach <= i) n += k;
    }
    return 0.06 * eff(n) * (hasRelic(s, "hearth") ? 1.25 : 1) * (hasRelic(s, "sundial") ? 1.2 : 1);
}
/** Growth speed of a crop right now. */
export const growSpeed = (s: State, c: CropDef) =>
    DIM_FX[c.dim].speed * (1 + 0.05 * upLevel(s, "sprinkler")) * (1 + handBoost(s, c)) * (1 + 0.03 * crewLevel(s, "tenders")) * (hasRelic(s, "sundial") ? 1.1 : 1) * (1 + toolSpeed(s, c.kind));
/** Crops one harvest gives before bumper, luck, streak and gold. */
export const cropUnits = (s: State, c: CropDef, field = 1) => c.yield * hoeFactor(s) * yieldMult(s, c.dim) * (1 + toolYield(s, c.kind)) * (1 + fieldBonus(s, field));

// ---- Fields: plots of one crop in a garden boost each other ----

/** The bonus a field of `n` plots of the same crop gives each of them, up to a cap Field Rows raises. */
export const FIELD_STEP = 0.012;
export const fieldCap = (s: State) => 0.3 + 0.04 * upLevel(s, "field");
export const fieldBonus = (s: State, n: number) => Math.min(fieldCap(s), FIELD_STEP * Math.max(0, n - 1));
/** Plots of this crop in a garden. */
export const fieldSize = (s: State, dim: Dim, id: string) => s.farm.gardens[dim].filter((p) => p.c === id).length;
/** The biggest field you have right now (for milestones and the Garden header). */
export function biggestField(s: State): { dim: Dim; crop: CropDef; n: number } | null {
    let best: { dim: Dim; crop: CropDef; n: number } | null = null;
    for (const dim of openDims(s)) {
        const counts: Record<string, number> = {};
        for (const p of s.farm.gardens[dim]) if (p.c) counts[p.c] = (counts[p.c] || 0) + 1;
        for (const [id, n] of Object.entries(counts)) if (!best || n > best.n) best = { dim, crop: CROP_BY_ID[id as CropId], n };
    }
    return best;
}
/** The hand-pick streak: picks in a row, each inside the window of the last. */
export const streakWindow = (s: State) => 4 + 0.5 * upLevel(s, "rhythm");
export const streakCap = (s: State) => 0.5 + 0.05 * upLevel(s, "rhythm");
export const streakNow = (s: State, now = Date.now()) => (s.farm.streak > 0 && now - s.farm.streakAt <= streakWindow(s) * 1000 ? s.farm.streak : 0);
export const streakBonus = (s: State, n = s.farm.streak) => Math.min(streakCap(s), 0.03 * Math.max(0, n - 1));

/** Farming XP for one harvest: a slice of the level the crop opens at, bigger for crops that take longer. */
export const cropXp = (c: CropDef) => 1 + (0.004 * skillXpFor(c.need + 1) * (c.time / 60)) / (1 + c.need / 8);

export function costOf(u: FarmUpDef, lvl: number): Cost {
    const out: Cost = {};
    for (const [k, v] of Object.entries(u.cost)) out[k as ResId] = Math.ceil((v ?? 0) * Math.pow(u.growth, lvl));
    return out;
}
export const upCost = (s: State, u: FarmUpDef): Cost => costOf(u, upLevel(s, u.id));
export const handCost = (s: State, c: CropDef) => Math.ceil(c.handCost * Math.pow(1.2, s.farm.hands[c.id] || 0));

export interface Blocker {
    ok: boolean;
    why?: string;
}
const afford = (s: State, cost: Cost): Blocker => {
    for (const [id, n] of Object.entries(cost)) if (have(s, id as ResId) < (n ?? 0)) return { ok: false, why: `Needs ${resInfo(id as ResId).name}` };
    return { ok: true };
};
/** Spend `n` Enchanted crops from a list of crops, the cheapest first (the valuable ones stay for selling). */
const spendEnch = (s: State, list: CropDef[], n: number) => {
    for (const c of list.slice().sort((a, b) => a.vm - b.vm)) {
        const k = Math.min(n, s.farm.ench[c.id] || 0);
        if (k > 0) {
            s.farm.ench[c.id] = (s.farm.ench[c.id] || 0) - k;
            n -= k;
        }
        if (n <= 0) break;
    }
};
const spend = (s: State, cost: Cost) => {
    for (const [id, n] of Object.entries(cost)) {
        if (id === "any") spendEnch(s, CROPS, n ?? 0);
        else if (isKindRes(id)) spendEnch(s, CROPS.filter((c) => c.kind === id.slice(2)), n ?? 0);
        else if (isCrop(id)) s.farm.crop[id] = haveCrop(s, id) - (n ?? 0);
        else if (isEnch(id)) s.farm.ench[id.slice(2)] = (s.farm.ench[id.slice(2)] || 0) - (n ?? 0);
        else s.farm.goods[id] = (s.farm.goods[id] || 0) - (n ?? 0);
    }
};
export const canAfford = (s: State, cost: Cost) => afford(s, cost).ok;

export function canBuyUp(s: State, u: FarmUpDef): Blocker {
    if (farmLevel(s) < u.need) return { ok: false, why: `Farming ${u.need}` };
    if (upLevel(s, u.id) >= u.max) return { ok: false, why: "Maxed" };
    return afford(s, upCost(s, u));
}
export function buyFarmUp(s: State, id: string): boolean {
    const u = FARM_UP_BY_ID[id];
    if (!u || !canBuyUp(s, u).ok) return false;
    spend(s, upCost(s, u));
    s.farm.ups[id] = upLevel(s, id) + 1;
    syncPlots(s);
    return true;
}
export function canBuyHoe(s: State): Blocker {
    const next = HOES[s.farm.hoe + 1];
    if (!next) return { ok: false, why: "Best hoe" };
    if (farmLevel(s) < next.need) return { ok: false, why: `Farming ${next.need}` };
    return afford(s, next.cost);
}
export function buyHoe(s: State): boolean {
    if (!canBuyHoe(s).ok) return false;
    spend(s, HOES[s.farm.hoe + 1].cost);
    s.farm.hoe += 1;
    return true;
}
export function canBuyHand(s: State, c: CropDef): Blocker {
    if (!cropOpen(s, c)) return { ok: false, why: `Farming ${c.need}` };
    if (haveCrop(s, c.id) < handCost(s, c)) return { ok: false, why: "Not enough crops" };
    return { ok: true };
}
export function buyHand(s: State, id: CropId, count = 1): number {
    const c = CROP_BY_ID[id];
    let n = 0;
    while (c && n < count && canBuyHand(s, c).ok) {
        s.farm.crop[id] = haveCrop(s, id) - handCost(s, c);
        s.farm.hands[id] = (s.farm.hands[id] || 0) + 1;
        n++;
    }
    return n;
}
export function setSow(s: State, id: string, dim?: Dim): boolean {
    if (id && !CROP_IDS.has(id)) return false;
    const dm = dim ?? (id ? CROP_BY_ID[id as CropId].dim : undefined);
    if (!dm) return false;
    s.farm.sow[dm] = id;
    return true;
}
export function setFocus(s: State, id: string): boolean {
    if (id && !CROP_IDS.has(id)) return false;
    s.farm.focus = id;
    return true;
}

/** Garden size follows your level and the Extra Plot upgrade. */
export function syncPlots(s: State) {
    for (const dim of DIMS) {
        const g = s.farm.gardens[dim];
        const want = plotCount(s, dim);
        while (g.length < want) g.push({ c: "", p: 0 });
    }
}

// ---- Permanent bonuses ----

export interface DimSet {
    dim: Dim;
    tier: number;
    next: number;
    bonus: number;
}
const SET_BONUS = [0, 0.005, 0.01, 0.02, 0.03, 0.045];
const SET_TIERS = [1, 3, 5, 8, 10];
export function dimSet(s: State, dim: Dim): DimSet {
    const low = Math.min(...DIM_CROPS[dim].map((c) => colTierOf(s.farm.grown[c.id] || 0)));
    const got = SET_TIERS.filter((t) => low >= t).length;
    return { dim, tier: low, next: SET_TIERS[got] ?? 0, bonus: SET_BONUS[got] };
}
export const SET_STEPS = SET_TIERS.map((t, i) => ({ tier: t, bonus: SET_BONUS[i + 1] }));

/** Everything Farming permanently adds to the rest of the game (summed into enchant.allFx). */
export function farmFx(s: State): Partial<Record<EStat, number>> {
    const fx: Partial<Record<EStat, number>> = {};
    const add = (k: EStat, v: number) => {
        if (v) fx[k] = (fx[k] ?? 0) + v;
    };
    add("click", HOE_CLICK * s.farm.hoe + (hasRelic(s, "sickle") ? 0.08 : 0));
    add("minion", 0.005 * s.farm.hoe + (hasRelic(s, "lens") ? 0.1 : 0));
    for (const c of CROPS) add(c.col[0], 0.4 * c.col[1] * colSteps(colTierOf(s.farm.grown[c.id] || 0)));
    add("minion", 0.0015 * Math.min(200, crewTotal(s))); // a big crew helps the whole game
    add("all", 0.01 * upLevel(s, "deep") + 0.015 * upLevel(s, "ancient") + (hasRelic(s, "almanac") ? 0.025 : 0) + (hasRelic(s, "plenty") ? 0.06 : 0));
    add("tokens", 0.02 * upLevel(s, "ancient") + (hasRelic(s, "plenty") ? 0.08 : 0));
    for (const dim of DIMS) add("all", dimSet(s, dim).bonus);
    for (const id of s.farm.belt) {
        const t = TOOL_BY_ID[id];
        if (t) add(TOOL_FX[t.kind][0], TOOL_FX[t.kind][1] * t.tier);
    }
    add("all", 0.003 * (openDims(s).length - 1));
    for (const [k, v] of Object.entries(featStats(s))) add(k as EStat, v);
    return fx;
}

// ---- The crop table of the island you are on ----

export interface TableRow {
    crop: CropDef;
    w: number;
    open: boolean;
    p: number;
}

/**
 * Odds of every crop in a garden for a mixed planting. The mix follows the furthest island you can reach in that
 * dimension; every crop you have the level for can still be planted by choice. Seed Selector and a focus shift the odds.
 */
export function cropTable(s: State, dim: Dim = activeIsland(s).dim): TableRow[] {
    const here = openIslands(s).filter((i) => i.dim === dim);
    const base = (here.length ? ISLAND_CROPS[here[here.length - 1].id] : undefined) ?? DIM_DEFAULT[dim];
    const lvl = farmLevel(s);
    const pros = 0.05 * upLevel(s, "prosp") + (hasRelic(s, "shears") ? 0.1 : 0);
    const rows: TableRow[] = DIM_CROPS[dim].map((crop) => {
        const w0 = base.find(([id]) => id === crop.id)?.[1] ?? 0;
        return { crop, w: w0 * (1 + pros * (crop.need / 10)), open: lvl >= crop.need, p: 0 };
    });
    const total = rows.reduce((a, r) => a + (r.open ? r.w : 0), 0);
    for (const r of rows) r.p = r.open && total > 0 ? r.w / total : 0;
    return rows;
}

/** The crop a hand planting uses: your choice for this garden, else the most valuable crop open. */
export function sowCrop(s: State, dim: Dim = activeIsland(s).dim): CropDef | null {
    const open = DIM_CROPS[dim].filter((c) => farmLevel(s) >= c.need);
    if (!open.length) return null;
    const pick = open.find((c) => c.id === s.farm.sow[dim]);
    return pick ?? open.slice().sort((a, b) => b.vm - a.vm)[0];
}

type Rng = () => number;

// ---- What to plant: the recommendation ----

export interface Rec {
    crop: CropDef;
    dim: Dim;
    why: string;
}
const worth = (c: CropDef) => c.yield * c.vm;
/** The best crop for a garden's kind of need: a raw crop the goal is short of, else the most valuable crop open. */
export function recommend(s: State, dim: Dim): Rec | null {
    const open = DIM_CROPS[dim].filter((c) => farmLevel(s) >= c.need);
    if (!open.length) return null;
    const best = open.slice().sort((a, b) => worth(b) - worth(a))[0];
    const goal = goalOf(s);
    if (goal) {
        const raw = bottleneck(s, goal);
        if (raw && CROP_BY_ID[raw].dim === dim && farmLevel(s) >= CROP_BY_ID[raw].need) return { crop: CROP_BY_ID[raw], dim, why: `${goal.title} is short of ${CROP_BY_ID[raw].name}` };
        const need = Object.entries(goal.cost).find(([k]) => k === "any" || isKindRes(k));
        if (need && have(s, need[0] as ResId) < (need[1] ?? 0)) {
            const kind = need[0] === "any" ? null : (need[0].slice(2) as CropKind);
            const pool = kind ? open.filter((c) => c.kind === kind) : open;
            if (pool.length) {
                const pick = pool.slice().sort((a, b) => worth(b) - worth(a))[0];
                return { crop: pick, dim, why: `Enchant it for the ${goal.title}` };
            }
        }
    }
    // Otherwise, whichever collection is closest to its next tier.
    const near = open
        .map((c) => ({ c, n: s.farm.grown[c.id] || 0, next: COL_AT.find((x) => x > (s.farm.grown[c.id] || 0)) }))
        .filter((x) => x.next)
        .sort((a, b) => b.n / (b.next as number) - a.n / (a.next as number))[0];
    if (near && near.n / (near.next as number) > 0.6) return { crop: near.c, dim, why: `${Math.ceil((near.next as number) - near.n)} more for the next ${near.c.name} collection tier` };
    return { crop: best, dim, why: "The most valuable crop you can plant here" };
}
/** Point every open garden at the crop the crew should plant (the best one, or the one the goal needs). */
export function autoSow(s: State): number {
    let n = 0;
    for (const dim of openDims(s)) {
        const r = s.farm.auto.sow === "goal" ? recommend(s, dim) : null;
        const want = r ? r.crop.id : (sowCrop(s, dim)?.id ?? "");
        if (s.farm.sow[dim] !== want) {
            s.farm.sow[dim] = want;
            n++;
        }
    }
    return n;
}

// ---- Context and events ----

export interface FarmCtx {
    avgClick: number;
    cps: number;
    auto: number;
    xp: number;
    dust: number;
}
/** The slice of derive() that farming needs. */
export const farmCtx = (d: { avgClick: number; cps: number; auto: number; xpMult: number; xpSkill: { farming: number }; dustMult: number }): FarmCtx => ({
    avgClick: d.avgClick,
    cps: d.cps,
    auto: d.auto,
    xp: d.xpMult * d.xpSkill.farming,
    dust: d.dustMult,
});

export interface WaterOut {
    dim: Dim | ""; // which garden the drop fell in
    plot: number; // plot index in that garden, -1 if nothing was growing
    crop: CropId | "";
    boost: number;
    ready: boolean; // that press finished the crop
    bumperStart: boolean;
}
export interface HarvestOut {
    dim: Dim;
    plot: number;
    crop: CropId;
    units: number;
    lucky: boolean;
    golden: boolean;
    bumper: boolean;
    streak: number;
    pod: Dim | null;
    xp: number;
    shards: number;
    hand: boolean;
}
export interface TendOut {
    boost: number;
    ready: boolean;
}

const subs = new Set<(e: WaterOut) => void>();
/** The Farm tab listens here so its garden reacts to every press of the big button. */
export const onWater = (fn: (e: WaterOut) => void) => {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
};

export function pushLog(s: State, text: string, color: string) {
    s.farm.log.unshift({ text, color });
    if (s.farm.log.length > 8) s.farm.log.length = 8;
}

const addCrop = (s: State, id: CropId, units: number) => {
    s.farm.crop[id] = haveCrop(s, id) + units;
    s.farm.grown[id] = (s.farm.grown[id] || 0) + units;
};

export const plotReady = (s: State, pl: Plot) => !!pl.c && pl.p >= CROP_BY_ID[pl.c as CropId].time;
export const readyCount = (s: State, dim?: Dim) => (dim ? s.farm.gardens[dim].filter((p) => plotReady(s, p)).length : allPlots(s).filter((r) => plotReady(s, r.pl)).length);

/** One press of the big button: waters a random growing plot in any open garden (speeds it up) and fills the Bloom meter. */
export function water(s: State, inp: { combo: number }, rng: Rng = Math.random): WaterOut {
    const f = s.farm;
    const growing = allPlots(s).filter((r) => r.pl.c && !plotReady(s, r.pl));
    const boost = waterBoost(s, inp.combo);
    f.waters += 1;
    let hit: PlotRef | null = null;
    let ready = false;
    if (growing.length) {
        hit = growing[Math.floor(rng() * growing.length)];
        const t = CROP_BY_ID[hit.pl.c as CropId].time;
        hit.pl.p = Math.min(t, hit.pl.p + boost);
        ready = hit.pl.p >= t;
    }
    let bumperStart = false;
    if (f.bumper <= 0) {
        f.bloom += 1 / bloomNeed(s);
        if (f.bloom >= 1) {
            f.bloom = 0;
            f.bumper = bumperLen(s);
            f.bumpers += 1;
            bumperStart = true;
        }
    }
    const out: WaterOut = { dim: hit ? hit.dim : "", plot: hit ? hit.i : -1, crop: hit ? (hit.pl.c as CropId) : "", boost, ready, bumperStart };
    subs.forEach((fn) => fn(out));
    return out;
}

/** Tap a growing plot to tend it: a burst of growth, with a short cooldown per plot. */
export function tend(s: State, dim: Dim, i: number, now = Date.now()): TendOut | null {
    const pl = s.farm.gardens[dim][i];
    if (!pl || !pl.c || plotReady(s, pl) || now - (pl.t ?? 0) < 450) return null;
    const c = CROP_BY_ID[pl.c as CropId];
    const boost = Math.max(waterBoost(s, 1) * 3, c.time * 0.015) * (1 + 0.1 * upLevel(s, "tend"));
    pl.p = Math.min(c.time, pl.p + boost);
    pl.t = now;
    s.farm.tends += 1;
    return { boost, ready: pl.p >= c.time };
}

// ---- Planting and harvesting ----

export function plant(s: State, dim: Dim, i: number, id?: CropId, rng: Rng = Math.random): boolean {
    const pl = s.farm.gardens[dim][i];
    if (!pl || pl.c) return false;
    const c = id ? CROP_BY_ID[id] : sowCrop(s, dim);
    if (!c || c.dim !== dim || !cropOpen(s, c)) return false;
    pl.c = c.id;
    pl.p = 0;
    pl.t = undefined;
    pl.g = rng() < goldenChance(s) || undefined;
    return true;
}

/** Plant every empty plot of a garden (or of every open garden): a mixed planting follows the odds when you have not picked a crop. */
export function plantAll(s: State, rng: Rng = Math.random, only?: Dim): number {
    let n = 0;
    for (const dim of only ? [only] : openDims(s)) {
        const rows = cropTable(s, dim).filter((r) => r.open);
        if (!rows.length) continue;
        const chosen = DIM_CROPS[dim].find((c) => c.id === s.farm.sow[dim] && farmLevel(s) >= c.need);
        const mix = rows.filter((r) => r.p > 0);
        for (let i = 0; i < s.farm.gardens[dim].length; i++) {
            if (s.farm.gardens[dim][i].c) continue;
            let c: CropDef | undefined = chosen;
            if (!c) {
                if (!mix.length) c = sowCrop(s, dim) ?? undefined;
                else {
                    let r = rng();
                    c = mix[mix.length - 1].crop;
                    for (const row of mix) {
                        if (r < row.p) {
                            c = row.crop;
                            break;
                        }
                        r -= row.p;
                    }
                }
            }
            if (c && plant(s, dim, i, c.id, rng)) n++;
        }
    }
    return n;
}

/**
 * Big gardens grow far more crops but must not print shards in proportion: past 14 plots, the shards a harvest, a sale
 * or a cooked good pays shrink, so doubling your plots adds about 23% more shard income (crops, collections and tools still double).
 */
export const plotScale = (s: State) => Math.pow(Math.min(1, 14 / Math.max(1, allPlots(s).length)), 0.7);
export const cropShards = (ctx: FarmCtx, c: CropDef) => ctx.cps * c.time * FARM_VALUE * c.vm;
const shardMult = (s: State, c: CropDef) => (c.kind === "stalk" ? 1 + toolSpecial(s, "stalk") : 1);

/** Harvest one ripe plot. Hand-picked crops pay 25% more and chain into a streak. The plot is empty afterwards, unless the Auto-Reaper replants it. */
export function harvest(s: State, ctx: FarmCtx, dim: Dim, i: number, hand: boolean, rng: Rng = Math.random): HarvestOut | null {
    const f = s.farm;
    const pl = f.gardens[dim][i];
    if (!pl || !plotReady(s, pl)) return null;
    const c = CROP_BY_ID[pl.c as CropId];
    const bumper = f.bumper > 0;
    const lucky = rng() < luckyChance(s, c.kind);
    const golden = !!pl.g;
    let streak = 0;
    let sb = 0;
    if (hand) {
        const now = Date.now();
        f.streak = now - f.streakAt <= streakWindow(s) * 1000 ? f.streak + 1 : 1;
        f.streakAt = now;
        f.bestStreak = Math.max(f.bestStreak, f.streak);
        streak = f.streak;
        sb = streakBonus(s);
    }
    let units = cropUnits(s, c, fieldSize(s, dim, c.id)) * (1 + 0.05 * upLevel(s, "compost") * (hand ? 0 : 1)) * (hand ? 1.25 * (1 + sb) : 1);
    if (bumper) {
        units *= bumperMult(s);
        f.bumper -= 1;
    }
    if (lucky) units *= 3;
    if (golden) {
        units *= 5;
        f.goldens += 1;
    }
    addCrop(s, c.id, units);
    const xp = cropXp(c) * ctx.xp * farmXpMult(s, c.dim, c.kind);
    const shards = cropShards(ctx, c) * plotScale(s) * shardMult(s, c) * (golden ? 3 : 1);
    s.farming += xp;
    s.shards += shards;
    s.total += shards;
    f.harvests += 1;
    if (hand) f.picked += 1;
    let pod: Dim | null = null;
    if (rng() < podChance(s, c.dim, c.kind) * (hand ? 2 : 1)) {
        pod = c.dim;
        f.pods[pod] = (f.pods[pod] || 0) + 1;
    }
    pl.p = Math.max(0, pl.p - c.time);
    pl.t = undefined;
    if (!hasReaper(s)) {
        pl.c = "";
        pl.p = 0;
        pl.g = undefined;
    } else pl.g = rng() < goldenChance(s) || undefined;
    return { dim, plot: i, crop: c.id, units, lucky, golden, bumper, streak, pod, xp, shards, hand };
}

export function harvestAll(s: State, ctx: FarmCtx, hand = true, only?: Dim): number {
    let n = 0;
    for (const dim of only ? [only] : openDims(s)) for (let i = 0; i < s.farm.gardens[dim].length; i++) if (harvest(s, ctx, dim, i, hand)) n++;
    return n;
}

// ---- Idle farming ----

/**
 * Growing without you: every planted plot grows by dt at its speed. With the
 * Auto-Reaper, ripe plots harvest and start over (any number of times for a big dt,
 * paying the expected result); without it they wait, ripe, for you to come back.
 */
export function tickFarm(s: State, dt: number, ctx: FarmCtx, now = Date.now()) {
    tickKitchen(s, now);
    syncPlots(s);
    if (dt <= 0) return;
    const f = s.farm;
    const fields: Record<string, number> = {};
    for (const { dim, pl } of allPlots(s)) if (pl.c) fields[`${dim}:${pl.c}`] = (fields[`${dim}:${pl.c}`] || 0) + 1;
    for (const { dim, pl } of allPlots(s)) {
        if (!pl.c) continue;
        const c = CROP_BY_ID[pl.c as CropId];
        pl.p += dt * growSpeed(s, c);
        if (!hasReaper(s)) {
            pl.p = Math.min(pl.p, c.time);
            continue;
        }
        const n = Math.floor(pl.p / c.time);
        if (n <= 0) continue;
        pl.p -= n * c.time;
        bulkHarvest(s, ctx, c, n, fields[`${dim}:${c.id}`] || 1);
    }
    crewTick(s, dt, ctx, now);
    // Pod Opener
    const every = openEvery(s);
    if (Number.isFinite(every) && podCount(s) > 0) {
        f.openT += dt;
        let n = Math.min(podCount(s), Math.floor(f.openT / every), 40);
        f.openT -= Math.floor(f.openT / every) * every;
        while (n-- > 0) {
            const dim = DIMS.find((d) => (f.pods[d] || 0) > 0);
            if (!dim) break;
            const out = openPod(s, ctx, dim);
            if (out) pushLog(s, `${out.title}: ${out.sub}`, out.color);
        }
    } else f.openT = 0;
}

/** The expected result of `n` automatic harvests of a crop. A Bumper Crop covers the first ones. */
function bulkHarvest(s: State, ctx: FarmCtx, c: CropDef, n: number, field = 1) {
    const f = s.farm;
    const gc = goldenChance(s);
    const base = cropUnits(s, c, field) * (1 + 0.05 * upLevel(s, "compost")) * (1 + 2 * luckyChance(s, c.kind)) * (1 + 4 * gc);
    const boosted = Math.min(n, f.bumper);
    f.bumper -= boosted;
    const units = base * (n + boosted * (bumperMult(s) - 1));
    addCrop(s, c.id, units);
    s.farming += n * cropXp(c) * ctx.xp * farmXpMult(s, c.dim, c.kind);
    const sh = n * cropShards(ctx, c) * plotScale(s) * shardMult(s, c) * (1 + 2 * gc);
    s.shards += sh;
    s.total += sh;
    f.harvests += n;
    const dim = c.dim;
    const fr = (f.podFrac[dim] || 0) + n * podChance(s, dim, c.kind) * 0.6 * (1 + 0.12 * upLevel(s, "sifter"));
    const whole = Math.floor(fr);
    f.podFrac[dim] = fr - whole;
    if (whole > 0) f.pods[dim] = (f.pods[dim] || 0) + whole;
}

/** Farming XP a second with nothing pressed (for the Skills page ETA): the garden's expected harvests. */
export function idleXpRate(s: State, ctx: FarmCtx): number {
    if (!hasReaper(s)) return 0;
    let r = 0;
    for (const { pl } of allPlots(s)) {
        if (!pl.c) continue;
        const c = CROP_BY_ID[pl.c as CropId];
        r += (growSpeed(s, c) / c.time) * cropXp(c) * farmXpMult(s, c.dim, c.kind);
    }
    return r * ctx.xp;
}

/** Crops per second, per plot, summed (for the readout). */
export function cropRate(s: State): number {
    let r = 0;
    for (const { dim, pl } of allPlots(s)) {
        if (!pl.c) continue;
        const c = CROP_BY_ID[pl.c as CropId];
        r += (growSpeed(s, c) / c.time) * cropUnits(s, c, fieldSize(s, dim, c.id));
    }
    return r;
}

// ---- Items ----

export const podCount = (s: State) => Object.values(s.farm.pods).reduce((a, b) => a + b, 0);
export const itemCount = (s: State) => Object.values(s.farm.items).reduce((a, b) => a + b, 0);

export function consumeItem(s: State, id: ItemId): string | null {
    if ((s.farm.items[id] || 0) < 1) return null;
    s.farm.items[id] -= 1;
    if (id === "fertilizer") {
        for (const { pl } of allPlots(s)) if (pl.c) pl.p = Math.min(CROP_BY_ID[pl.c as CropId].time * (hasReaper(s) ? 3 : 1), pl.p + 600);
        pushLog(s, "Fertilizer: the whole garden jumped ahead", "#9be08a");
        return "The whole garden grew by 10 minutes.";
    }
    if (id === "tonic") {
        s.farm.bumper = bumperLen(s);
        s.farm.bloom = 0;
        s.farm.bumpers += 1;
        pushLog(s, "Harvest Tonic: Bumper Crop!", "#ffd23a");
        return "Bumper Crop! Your next harvests pay triple.";
    }
    const dim = activeIsland(s).dim;
    s.farm.pods[dim] = (s.farm.pods[dim] || 0) + 3;
    pushLog(s, `Pod Basket: 3 ${PODS[dim].name}s`, PODS[dim].color);
    return `The basket held 3 ${PODS[dim].name}s.`;
}

// ---- Cookhouse ----

export const jobSeconds = (s: State, r: RecipeDef, n: number) => (r.time * n) / cookSpeed(s);
export const jobLeft = (j: Job, now = Date.now()) => Math.max(0, (j.end - now) / 1000);
export const jobsReady = (s: State, now = Date.now()) => s.farm.jobs.filter((j) => j.end <= now).length;
export const slotsFree = (s: State) => ovenSlots(s) - s.farm.jobs.length;
export function totalCost(r: RecipeDef, n: number): Cost {
    const out: Cost = {};
    for (const [k, v] of Object.entries(r.inputs)) out[k as ResId] = (v ?? 0) * n;
    return out;
}
export function canCraft(s: State, r: RecipeDef, n = 1): Blocker {
    if (farmLevel(s) < r.need) return { ok: false, why: `Farming ${r.need}` };
    if (r.kind === "relic") {
        if (ownsRelic(s, r.out)) return { ok: false, why: "Already made" };
        if (s.farm.jobs.some((j) => j.r === r.id)) return { ok: false, why: "Already cooking" };
        if (n > 1) return { ok: false, why: "One only" };
    }
    if (slotsFree(s) <= 0) return { ok: false, why: "Ovens busy" };
    return afford(s, totalCost(r, n));
}
export function maxBatch(s: State, r: RecipeDef): number {
    if (r.kind === "relic") return 1;
    let n = 50;
    for (const [k, v] of Object.entries(r.inputs)) n = Math.min(n, Math.floor(have(s, k as ResId) / (v ?? 1)));
    return Math.max(1, n);
}
export function startCraft(s: State, id: string, n = 1, now = Date.now()): boolean {
    const r = RECIPE_BY_ID[id];
    if (!r || !canCraft(s, r, n).ok) return false;
    spend(s, totalCost(r, n));
    let slot = 0;
    while (s.farm.jobs.some((j) => j.slot === slot)) slot++;
    s.farm.jobs.push({ r: id, n, end: now + jobSeconds(s, r, n) * 1000, slot });
    return true;
}
export interface Collected {
    text: string;
    color: string;
}
export function collectJob(s: State, i: number, now = Date.now(), rng: Rng = Math.random): Collected | null {
    const j = s.farm.jobs[i];
    if (!j || j.end > now) return null;
    const r = RECIPE_BY_ID[j.r];
    s.farm.jobs.splice(i, 1);
    s.farm.crafted += 1;
    if (!r) return null;
    if (r.kind === "relic") {
        if (!ownsRelic(s, r.out)) {
            s.farm.relics.push(r.out);
            equipRelic(s, r.out);
        }
        pushLog(s, `Made the ${r.name}`, r.color);
        return { text: `Made the ${r.name}: ${r.desc}`, color: r.color };
    }
    const double = rng() < 0.08 * upLevel(s, "chef");
    const n = j.n * (double ? 2 : 1);
    if (r.kind === "good") {
        s.farm.goods[r.out] = (s.farm.goods[r.out] || 0) + n;
        s.farm.made[r.out] = (s.farm.made[r.out] || 0) + n;
    } else s.farm.items[r.out] = (s.farm.items[r.out] || 0) + n;
    pushLog(s, `${n}x ${r.name}${double ? " (double batch!)" : ""}`, r.color);
    return { text: `${n}x ${r.name}${double ? ", a double batch!" : ""}`, color: r.color };
}
export function collectAll(s: State, now = Date.now()): Collected[] {
    const out: Collected[] = [];
    for (let i = s.farm.jobs.length - 1; i >= 0; i--) {
        const c = collectJob(s, i, now);
        if (c) out.push(c);
    }
    return out;
}

/** With the Auto-Ladle, finished crafts are collected as they finish and a repeating craft starts again (also while away). */
export function tickKitchen(s: State, now = Date.now()) {
    if (upLevel(s, "ladle") < 1) return;
    for (let guard = 0; guard < 300; guard++) {
        const i = s.farm.jobs.findIndex((j) => j.end <= now);
        if (i < 0) break;
        const j = s.farm.jobs[i];
        const r = RECIPE_BY_ID[j.r];
        collectJob(s, i, now);
        if (j.loop && r && r.kind !== "relic" && afford(s, totalCost(r, j.n)).ok) {
            spend(s, totalCost(r, j.n));
            s.farm.jobs.push({ r: j.r, n: j.n, end: j.end + jobSeconds(s, r, j.n) * 1000, slot: j.slot, loop: true });
        }
    }
}
export function toggleLoop(s: State, slot: number): boolean {
    const j = s.farm.jobs.find((x) => x.slot === slot);
    if (!j || upLevel(s, "ladle") < 1 || RECIPE_BY_ID[j.r]?.kind === "relic") return false;
    j.loop = !j.loop;
    return true;
}

// ---- Seed pods ----

export interface PodOut {
    title: string;
    sub: string;
    color: string;
}
export const PODS: Record<Dim, { name: string; color: string }> = {
    overworld: { name: "Seed Pod", color: "#9be08a" },
    nether: { name: "Ember Pod", color: "#ff7a3d" },
    end: { name: "Void Pod", color: "#e0a0ff" },
};
// [dust, tokens, egg, shards, fragment, gem] weights per dimension.
export const POD_W: Record<Dim, number[]> = {
    overworld: [30, 28, 16, 18, 7, 1],
    nether: [22, 30, 14, 18, 13, 3],
    end: [14, 30, 12, 16, 22, 6],
};
export const POD_TOKENS: Record<Dim, number> = { overworld: 1, nether: 1.6, end: 2.4 };

/** Open one seed pod of a dimension: dust, tokens, eggs, shards, fragments or (rarely) a gem. */
export function openPod(s: State, d: { avgClick: number; cps: number; dust: number }, dim: Dim, rng: Rng = Math.random): PodOut | null {
    if ((s.farm.pods[dim] || 0) < 1) return null;
    s.farm.pods[dim] -= 1;
    s.farm.opened += 1;
    const w = POD_W[dim];
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
        const n = Math.max(1, Math.round((1 + tier + Math.floor(rng() * 2)) * POD_TOKENS[dim]));
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
        return { title: "Bumper Basket", sub: "a heap of shards", color: "var(--mc-aqua)" };
    }
    if (k === 4) {
        s.frag += 1;
        return { title: "Fracture Fragment", sub: "+0.2% all shards, forever", color: "var(--mc-light-purple)" };
    }
    s.ap += 1;
    return { title: "Ascension Seed", sub: "+1 gem", color: "var(--mc-red)" };
}

// ---- Milestones: item collections and the things you do ----

export type FeatReward = MsReward;
export type FeatLadder = Ladder;
export type Feat = Milestone;

const g = (k: GrantKind, n: number): MsReward => ({ grant: [k, n] });
const st = (k: EStat, v: number): MsReward => ({ stat: [k, v] });
const DIM_M: Record<Dim, number> = { overworld: 1, nether: 1.6, end: 2.4 };

export const cropIcon: Record<CropId, McSymbolName> = {
    wheat: "spark8", carrot: "triangle", potato: "ring", beetroot: "heartS", sugarcane: "pencil", melon: "ring", pumpkin: "sunburst", cocoa: "hex", sweetberry: "blossom",
    netherwart: "atom", crimsonfungus: "spade", warpedfungus: "spade", glowberry: "sun", emberbloom: "bloom", chorus: "diamondS", voidlily: "daisy", starfruit: "star", fracflower: "comet",
};

/** One ladder per crop: how much you have harvested. The stat is automatic; some tiers also pay a grant to claim. */
export const CROP_LADDERS: Ladder[] = CROPS.map((c) => ({
    key: `c:${c.id}`,
    group: "item" as const,
    name: c.name,
    unit: `${c.name} harvested`,
    color: c.color,
    icon: cropIcon[c.id],
    note: `${c.colText} from every tier`,
    metric: (s: State) => s.farm.grown[c.id] || 0,
    at: COL_AT,
    rewards: collectionRewards(DIM_M[c.dim] * (1 + c.need / 40), c.need >= 36),
    auto: (tier: number) => fmtStat(c.col[0], 0.4 * c.col[1] * colSteps(tier)),
}));
/** One ladder per good: how many you have cooked. */
export const GOOD_LADDERS: Ladder[] = GOODS.map((gd, n) => ({
    key: `g:${gd.id}`,
    group: "item" as const,
    name: gd.name,
    unit: `${gd.name} cooked`,
    color: gd.color,
    icon: "forge" as McSymbolName,
    note: "Cooked in the Kitchen",
    metric: (s: State) => s.farm.made[gd.id] || 0,
    at: [10, 50, 250, 1000],
    rewards: craftRewards(1 + n * 0.25),
}));

const ACTION_LADDERS: Ladder[] = [
    { key: "water", group: "action", name: "Waterer", unit: "plots watered", color: "#6fb4ff", icon: "fishing", metric: (s) => s.farm.waters, at: [100, 1000, 10000, 50000, 250000], rewards: [[g("dust", 20)], [g("tokens", 1)], [g("eggs", 1)], [g("tokens", 2), st("click", 0.02)], [g("ap", 1)]] },
    { key: "crop", group: "action", name: "Gatherer", unit: "crops harvested", color: "#e6c85a", icon: "sunburst", metric: (s) => CROPS.reduce((a, c) => a + (s.farm.grown[c.id] || 0), 0), at: [500, 5000, 50000, 500000, 5000000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.01)], [g("eggs", 1)], [st("all", 0.02)]] },
    { key: "bumper", group: "action", name: "Bumper Grower", unit: "Bumper Crops", color: "#ffd23a", icon: "star", metric: (s) => s.farm.bumpers, at: [5, 50, 250, 1000], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("comboMax", 0.1)], [g("tokens", 2)]] },
    { key: "hand", group: "action", name: "Picker", unit: "plots harvested by hand", color: "#ff9a4d", icon: "spade", metric: (s) => s.farm.picked, at: [25, 250, 1500, 8000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("click", 0.02)], [g("frag", 1)]] },
    { key: "harv", group: "action", name: "Reaper", unit: "harvests in all", color: "#9be08a", icon: "scissors", metric: (s) => s.farm.harvests, at: [50, 500, 5000, 50000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.02)], [g("frag", 1)]] },
    { key: "pod", group: "action", name: "Seed Collector", unit: "pods opened", color: "#c58bff", icon: "gem", metric: (s) => s.farm.opened, at: [5, 25, 100, 400], rewards: [[g("dust", 30)], [g("eggs", 1)], [g("tokens", 2)], [g("frag", 1)]] },
    { key: "cook", group: "action", name: "Cook", unit: "crafts collected", color: "#ff8a5c", icon: "forge", metric: (s) => s.farm.crafted, at: [3, 25, 100, 400], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.03)], [g("eggs", 1)]] },
    { key: "hands", group: "action", name: "Foreman", unit: "specialists hired", color: "#7fd0ff", icon: "smile", metric: (s) => totalHands(s), at: [10, 50, 150, 400], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("auto", 0.2)], [g("tokens", 2)]] },
    { key: "crew", group: "action", name: "Crew Boss", unit: "crew levels", color: "#6fb4ff", icon: "command", metric: (s) => crewTotal(s), at: [10, 40, 120, 300], rewards: [[g("dust", 40)], [g("tokens", 2)], [g("eggs", 1)], [g("ap", 1)]] },
    { key: "crow", group: "action", name: "Scarecrow Maker", unit: "scarecrows made", color: "#ffe29a", icon: "ankh", metric: (s) => s.farm.relics.length, at: [1, 4, 8, 12], rewards: [[g("dust", 40)], [g("tokens", 1)], [g("eggs", 1)], [g("frag", 2)]] },
    { key: "disc", group: "action", name: "Botanist", unit: "different crops grown", color: "#55ff77", icon: "flower", metric: (s) => CROPS.filter((c) => (s.farm.grown[c.id] || 0) > 0).length, at: [6, 12, 18], rewards: [[g("dust", 40)], [g("tokens", 1)], [st("all", 0.02)]] },
    { key: "ench", group: "action", name: "Enchanter", unit: "Enchanted crops made", color: "#d9a8ff", icon: "intelligence", metric: (s) => s.farm.enchanted, at: [5, 50, 250, 1000, 5000], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("click", 0.02)], [g("eggs", 1)], [st("all", 0.02)]] },
    { key: "sold", group: "action", name: "Merchant", unit: "Enchanted crops sold", color: "#ffd23a", icon: "scales", metric: (s) => s.farm.soldN, at: [10, 100, 500, 2500], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("minion", 0.02)], [g("ap", 1)]] },
    { key: "streak", group: "action", name: "Rhythm", unit: "best hand-pick streak", color: "#ff9a4d", icon: "bolt", metric: (s) => s.farm.bestStreak, at: [10, 25, 50, 100], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("click", 0.02)], [g("frag", 1)]] },
    { key: "tend", group: "action", name: "Green Thumb", unit: "plots tended", color: "#6fb4ff", icon: "heartS", metric: (s) => s.farm.tends, at: [100, 1000, 10000, 50000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.02)], [g("eggs", 1)]] },
    { key: "gold", group: "action", name: "Gilder", unit: "golden crops harvested", color: "#ffcc33", icon: "crown", metric: (s) => s.farm.goldens, at: [1, 10, 50, 250], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("all", 0.01)], [g("frag", 1)]] },
    { key: "field", group: "action", name: "Field Hand", unit: "plots in your biggest field", color: "#9be04a", icon: "hex", metric: (s) => biggestField(s)?.n ?? 0, at: [6, 12, 24, 48], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("minion", 0.02)], [g("eggs", 1)]] },
    { key: "plots", group: "action", name: "Landscaper", unit: "plots across your gardens", color: "#55ff77", icon: "daisy", metric: (s) => allPlots(s).length, at: [10, 20, 40, 80], rewards: [[g("dust", 30)], [g("tokens", 1)], [g("eggs", 1)], [g("ap", 1)]] },
    { key: "tool", group: "action", name: "Smith", unit: "farm tools made", color: "#c8d0e0", icon: "cog", metric: (s) => s.farm.tools.length, at: [1, 5, 12, 25], rewards: [[g("dust", 30)], [g("tokens", 1)], [g("eggs", 1)], [g("ap", 1)]] },
    { key: "gard", group: "action", name: "Landowner", unit: "gardens open", color: "#55ff77", icon: "location", metric: (s) => openDims(s).length, at: [2, 3], rewards: [[g("tokens", 2)], [st("all", 0.02)]] },
    { key: "hoe", group: "action", name: "Toolmaker", unit: "hoe tiers", color: "#55ffff", icon: "fortune", metric: (s) => s.farm.hoe, at: [3, 6, 9], rewards: [[g("dust", 40)], [g("eggs", 1)], [g("tokens", 3)]] },
];

export const LADDERS: Ladder[] = [...CROP_LADDERS, ...GOOD_LADDERS, ...ACTION_LADDERS];
export const MILESTONES: Milestone[] = milestonesOf(LADDERS);
export const FEATS = MILESTONES;

export const featClaimed = (s: State, f: Milestone) => s.farm.claimed.includes(f.id);
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
    s.farm.claimed.push(id);
    for (const r of f.rewards) if (r.grant) pay(s, r.grant[0], r.grant[1]);
    return f;
}
export function claimAllFeats(s: State): Milestone[] {
    return featsReady(s).map((f) => claimFeat(s, f.id)).filter((f): f is Milestone => !!f);
}
export function featStats(s: State): Partial<Record<EStat, number>> {
    const out: Partial<Record<EStat, number>> = {};
    for (const id of s.farm.claimed) {
        const f = MILESTONES.find((x) => x.id === id);
        if (f) for (const r of f.rewards) if (r.stat) out[r.stat[0]] = (out[r.stat[0]] ?? 0) + r.stat[1];
    }
    return out;
}

// ---- Quick actions ----

export interface Goal {
    title: string;
    color: string;
    kind: "hoe" | "relic";
    need: number;
    cost: Cost;
}
/** What to work toward next: the next hoe, then the cheapest scarecrow you do not own. */
export function goalOf(s: State): Goal | null {
    const next = HOES[s.farm.hoe + 1];
    if (next) return { title: next.name, color: next.color, kind: "hoe", need: next.need, cost: next.cost };
    const r = RELICS.filter((x) => !ownsRelic(s, x.out)).sort((a, b) => a.need - b.need)[0];
    return r ? { title: r.name, color: r.color, kind: "relic", need: r.need, cost: r.inputs } : null;
}
export function shortCrops(s: State, cost: Cost, mult = 1, out: Record<string, number> = {}): Record<string, number> {
    for (const [id, n] of Object.entries(cost)) {
        const short = (n ?? 0) * mult - have(s, id as ResId);
        if (short <= 0) continue;
        if (isCrop(id)) out[id] = (out[id] || 0) + short;
        else if (isEnch(id)) out[id.slice(2)] = (out[id.slice(2)] || 0) + short * enchNeed(s);
        else if (RECIPE_BY_ID[id]) shortCrops(s, RECIPE_BY_ID[id].inputs, short, out);
    }
    return out;
}
export function bottleneck(s: State, goal: Goal): CropId | null {
    const short = shortCrops(s, goal.cost);
    let best: CropId | null = null;
    let bv = 0;
    for (const [id, n] of Object.entries(short)) {
        if (n > bv) {
            bv = n;
            best = id as CropId;
        }
    }
    return best;
}
export function queueGoal(s: State, now = Date.now()): number {
    const goal = goalOf(s);
    if (!goal) return 0;
    let started = 0;
    for (const [id, n] of Object.entries(goal.cost)) {
        const r = RECIPE_BY_ID[id];
        if (!r || r.kind !== "good") continue;
        const queued = s.farm.jobs.filter((j) => j.r === id).reduce((a, j) => a + j.n, 0);
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
export function upgradeAll(s: State, limit = 40): number {
    let n = 0;
    while (n < limit) {
        const opts = FARM_UPS.filter((u) => canBuyUp(s, u).ok && Object.keys(u.cost).every((k) => isCrop(k)));
        if (!opts.length) break;
        const frac = (u: FarmUpDef) => Object.entries(upCost(s, u)).reduce((a, [k, v]) => Math.max(a, (v ?? 0) / Math.max(1, have(s, k as ResId))), 0);
        opts.sort((a, b) => frac(a) - frac(b));
        if (!buyFarmUp(s, opts[0].id)) break;
        n++;
    }
    return n;
}
export function hireAll(s: State, limit = 60): number {
    let n = 0;
    while (n < limit) {
        const opts = CROPS.filter((c) => canBuyHand(s, c).ok && handCost(s, c) <= haveCrop(s, c.id) * 0.6);
        if (!opts.length) break;
        opts.sort((a, b) => handCost(s, a) / haveCrop(s, a.id) - handCost(s, b) / haveCrop(s, b.id));
        if (buyHand(s, opts[0].id, 1) < 1) break;
        n++;
    }
    return n;
}
/** Hire the cheapest crew levels you can afford without spending more than 60% of your shards. */
export function hireCrewAll(s: State, limit = 30): number {
    let n = 0;
    while (n < limit) {
        const opts = CREW.filter((c) => canBuyCrew(s, c).ok && crewCost(s, c).shards <= s.shards * 0.6);
        if (!opts.length) break;
        opts.sort((a, b) => crewCost(s, a).shards - crewCost(s, b).shards);
        if (buyCrew(s, opts[0].id, 1) < 1) break;
        n++;
    }
    return n;
}
export function openAll(s: State, d: { avgClick: number; cps: number; dust: number }, one = false): { n: number; last: PodOut | null } {
    let n = 0;
    let last: PodOut | null = null;
    for (const dm of DIMS) {
        while ((s.farm.pods[dm] || 0) > 0 && !(one && n > 0)) {
            const out = openPod(s, d, dm);
            if (!out) break;
            n++;
            last = out;
            pushLog(s, `${PODS[dm].name}: ${out.sub}`, out.color);
        }
    }
    return { n, last };
}


// ---- Enchanted crops, selling and the market ----

export const ENCH_BASE = 160;
/** An Enchanted crop is worth this many harvests' shards per raw crop it was made from (before your sale price bonuses): crops sold for shards pay about what harvesting them pays, more once enchanted. */
export const ENCH_PREMIUM = 1.6;
export const RAW_SHARE = 0.8; // what a raw crop sells for, per crop, as a share of its harvest's shards
export const GOOD_PREMIUM = 1.25; // a cooked good sells for this much more than the crops it was made of

/** Merchant ranks: they come from Enchanted crops sold, and each one pays more and asks less to enchant. */
export interface Rank {
    at: number;
    name: string;
    sell: number; // +sale price
    cut: number; // raw crops fewer per Enchanted crop
}
export const RANKS: Rank[] = [
    { at: 0, name: "Peddler", sell: 0, cut: 0 },
    { at: 10, name: "Hawker", sell: 0.05, cut: 2 },
    { at: 50, name: "Stallkeeper", sell: 0.1, cut: 5 },
    { at: 200, name: "Trader", sell: 0.18, cut: 8 },
    { at: 800, name: "Merchant", sell: 0.28, cut: 12 },
    { at: 3000, name: "Magnate", sell: 0.4, cut: 16 },
    { at: 12000, name: "Tycoon", sell: 0.6, cut: 22 },
];
export const rankIdx = (s: State) => RANKS.reduce((a, r, i) => (s.farm.soldN >= r.at ? i : a), 0);
export const rankOf = (s: State): Rank => RANKS[rankIdx(s)];

/** The market craves one kind of crop at a time, for twenty minutes, and pays a lot more for it. */
export const DEMAND_MS = 20 * 60 * 1000;
export const DEMAND_MULT = 1.6;
export const demandKind = (now = Date.now()): CropKind => KINDS[(Math.imul(Math.floor(now / DEMAND_MS) + 7, 2654435761) >>> 0) % KINDS.length];
export const demandLeft = (now = Date.now()) => DEMAND_MS - (now % DEMAND_MS);

export const enchNeed = (s: State) => Math.max(60, ENCH_BASE - 6 * upLevel(s, "table") - crewLevel(s, "packers") - rankOf(s).cut);
export const sellMult = (s: State, c?: CropDef, now = Date.now()) =>
    (1 + 0.06 * upLevel(s, "market")) * (1 + rankOf(s).sell) * (1 + 0.02 * crewLevel(s, "traders")) * (c?.kind === "bloom" ? 1 + toolSpecial(s, "bloom") : 1) * (c && demandKind(now) === c.kind ? DEMAND_MULT : 1);
export const enchStock = (s: State, id: CropId) => s.farm.ench[id] || 0;
const income = (ctx: FarmCtx) => Math.max(ctx.cps, ctx.avgClick);
/** Shards one harvest of this crop is worth, as the sale formulas see it (income counts clicks early on). */
const harvestWorth = (s: State, ctx: FarmCtx, c: CropDef) => income(ctx) * c.time * FARM_VALUE * c.vm * plotScale(s);
/** Per raw crop: a harvest's shards divided over the crops it gives, so more crops per harvest never means more shards per crop. */
const perCrop = (s: State, ctx: FarmCtx, c: CropDef) => harvestWorth(s, ctx, c) / Math.max(1, c.yield * hoeFactor(s));
export const sellValue = (s: State, ctx: FarmCtx, c: CropDef, now = Date.now()) => perCrop(s, ctx, c) * enchNeed(s) * ENCH_PREMIUM * sellMult(s, c, now);
export const rawValue = (s: State, ctx: FarmCtx, c: CropDef, now = Date.now()) => perCrop(s, ctx, c) * RAW_SHARE * sellMult(s, c, now);
/** A good is worth the raw crops (and goods) it is made of, plus a bonus for the cooking. */
export function goodValue(s: State, ctx: FarmCtx, id: GoodId, now = Date.now()): number {
    const r = RECIPE_BY_ID[id];
    if (!r) return 0;
    let v = 0;
    for (const [k, n] of Object.entries(r.inputs)) v += (n ?? 0) * (isCrop(k) ? rawValue(s, ctx, CROP_BY_ID[k], now) / sellMult(s, CROP_BY_ID[k], now) : isEnch(k) ? 0 : goodValue(s, ctx, k as GoodId, now) / GOOD_PREMIUM);
    return v * GOOD_PREMIUM * sellMult(s, undefined, now);
}

export function canEnchant(s: State, c: CropDef, n = 1): Blocker {
    if (!cropOpen(s, c) && !(s.farm.grown[c.id] > 0)) return { ok: false, why: `Farming ${c.need}` };
    if (haveCrop(s, c.id) < enchNeed(s) * n) return { ok: false, why: `Needs ${enchNeed(s) * n} ${c.name}` };
    return { ok: true };
}
/** How many Enchanted crops you could make from the stock of one crop. */
export const enchantable = (s: State, c: CropDef) => Math.floor(haveCrop(s, c.id) / enchNeed(s));
export function enchantCrop(s: State, id: CropId, n = 1): number {
    const c = CROP_BY_ID[id];
    const k = Math.min(n, c ? enchantable(s, c) : 0);
    if (!c || k < 1) return 0;
    s.farm.crop[id] = haveCrop(s, id) - enchNeed(s) * k;
    s.farm.ench[id] = enchStock(s, id) + k;
    s.farm.enchanted += k;
    return k;
}
function shardsIn(s: State, shards: number) {
    s.shards += shards;
    s.total += shards;
}
export function sellEnchanted(s: State, ctx: FarmCtx, id: CropId, n = Infinity, keep = 0): { n: number; shards: number } {
    const c = CROP_BY_ID[id];
    const k = Math.min(n, Math.max(0, enchStock(s, id) - keep));
    if (!c || k < 1) return { n: 0, shards: 0 };
    const shards = sellValue(s, ctx, c) * k;
    s.farm.ench[id] = enchStock(s, id) - k;
    s.farm.soldN += k;
    s.farm.sold += shards;
    shardsIn(s, shards);
    return { n: k, shards };
}
export function sellRaw(s: State, ctx: FarmCtx, id: CropId, n = Infinity, keep = 0): { n: number; shards: number } {
    const c = CROP_BY_ID[id];
    const k = Math.floor(Math.min(n, Math.max(0, haveCrop(s, id) - keep)));
    if (!c || k < 1) return { n: 0, shards: 0 };
    const shards = rawValue(s, ctx, c) * k;
    s.farm.crop[id] = haveCrop(s, id) - k;
    s.farm.soldRaw += k;
    s.farm.sold += shards;
    shardsIn(s, shards);
    return { n: k, shards };
}
export function sellGood(s: State, ctx: FarmCtx, id: GoodId, n = Infinity, keep = 0): { n: number; shards: number } {
    const k = Math.floor(Math.min(n, Math.max(0, (s.farm.goods[id] || 0) - keep)));
    if (k < 1) return { n: 0, shards: 0 };
    const shards = goodValue(s, ctx, id) * k;
    s.farm.goods[id] = (s.farm.goods[id] || 0) - k;
    s.farm.sold += shards;
    shardsIn(s, shards);
    return { n: k, shards };
}

/** Enchanted crops to keep, per crop: what the next unmade tool of every kind and the next hoe will ask for (the cheapest crops are used first). */
export function reserveMap(s: State): Record<string, number> {
    const keep: Record<string, number> = {};
    const take = (list: CropDef[], n: number) => {
        for (const c of list.slice().sort((x, y) => x.vm - y.vm)) {
            if (n <= 0) break;
            const free = (s.farm.ench[c.id] || 0) - (keep[c.id] || 0);
            const k = Math.min(n, Math.max(0, free));
            if (k > 0) {
                keep[c.id] = (keep[c.id] || 0) + k;
                n -= k;
            }
        }
    };
    for (const kind of KINDS) {
        const next = toolsOf(kind).find((x) => !ownsTool(s, x.id));
        if (next) take(CROPS.filter((c) => c.kind === kind), Number(next.cost[`k_${kind}` as KindRes] ?? 0));
    }
    const hoe = HOES[s.farm.hoe + 1];
    if (hoe?.cost.any) take(CROPS, hoe.cost.any);
    return keep;
}
export const reservedEnch = reserveMap;
export function sellAllEnchanted(s: State, ctx: FarmCtx, surplusOnly = true): { n: number; shards: number } {
    const keep = surplusOnly ? reserveMap(s) : {};
    let n = 0;
    let shards = 0;
    for (const c of CROPS) {
        const r = sellEnchanted(s, ctx, c.id, Infinity, keep[c.id] || 0);
        n += r.n;
        shards += r.shards;
    }
    return { n, shards };
}
export function enchantAll(s: State): number {
    let n = 0;
    for (const c of CROPS) n += enchantCrop(s, c.id, Infinity);
    return n;
}

// ---- The crew: five departments that take the chores off you ----

export interface CrewDef {
    id: string;
    name: string;
    color: string;
    icon: McSymbolName;
    need: number; // Farming level
    max: number;
    base: number; // seconds of your best income the first level costs
    growth: number;
    raw: number; // raw crops (any) the first level costs
    desc: string;
    effect: (l: number) => string;
}
export const packRate = (l: number) => 0.1 * l; // Enchanted crops a second
export const packFloor = (l: number) => Math.max(0, 500 - 20 * l); // raw crops of each kind it leaves alone
export const sellRate = (l: number) => 0.5 * l;
export const CREW: CrewDef[] = [
    { id: "tenders", name: "Tenders", color: "#6fb4ff", icon: "snow", need: 4, max: 50, base: 15, growth: 1.17, raw: 25, desc: "Walk the rows and tend every growing plot, in every garden.", effect: (l) => `+${3 * l}% growth speed everywhere` },
    { id: "agron", name: "Agronomists", color: "#9be04a", icon: "flower", need: 8, max: 30, base: 30, growth: 1.2, raw: 30, desc: "Choose what to plant and plant every empty plot, by themselves. Plant one crop in a garden and it becomes a field.", effect: (l) => `Auto-sow and auto-plant · +${(0.5 * l).toFixed(1)}% golden crop chance` },
    { id: "cooks", name: "Cooks", color: "#ff9a4d", icon: "forge", need: 8, max: 30, base: 25, growth: 1.2, raw: 30, desc: "Start the goods your next goal is short of, whenever an oven is free.", effect: (l) => `Auto-cook for your goal · +${3 * l}% cooking speed` },
    { id: "packers", name: "Packers", color: "#d9a8ff", icon: "intelligence", need: 10, max: 40, base: 45, growth: 1.2, raw: 40, desc: "Turn surplus raw crops into Enchanted crops. They leave a stock of each raw crop for upgrades, less as they get better.", effect: (l) => `Auto-enchant ${packRate(l).toFixed(1)}/s · leaves ${packFloor(l)} raw per crop · ${l} fewer raw per Enchanted crop` },
    { id: "traders", name: "Traders", color: "#ffd23a", icon: "scales", need: 14, max: 40, base: 60, growth: 1.2, raw: 50, desc: "Sell surplus Enchanted crops for shards, keeping what your next tool and hoe will ask for.", effect: (l) => `Auto-sell ${sellRate(l).toFixed(1)}/s · +${2 * l}% sale price` },
];
export const CREW_BY_ID = Object.fromEntries(CREW.map((c) => [c.id, c])) as Record<string, CrewDef>;
export const crewLevel = (s: State, id: string) => s.farm.crew[id] || 0;
export const crewTotal = (s: State) => Object.values(s.farm.crew).reduce((a, b) => a + b, 0);
export const CREW_MARKS = [10, 25, 50];
export const crewCost = (s: State, c: CrewDef, lvl = crewLevel(s, c.id)) => ({
    shards: Math.ceil(Math.max(s.peakInc, 20) * c.base * Math.pow(c.growth, lvl)),
    raw: Math.ceil(c.raw * Math.pow(1.12, lvl)),
});
export const totalRaw = (s: State) => CROPS.reduce((a, c) => a + haveCrop(s, c.id), 0);
export function canBuyCrew(s: State, c: CrewDef): Blocker {
    if (farmLevel(s) < c.need) return { ok: false, why: `Farming ${c.need}` };
    if (crewLevel(s, c.id) >= c.max) return { ok: false, why: "Maxed" };
    const k = crewCost(s, c);
    if (s.shards < k.shards) return { ok: false, why: "Not enough shards" };
    if (totalRaw(s) < k.raw) return { ok: false, why: "Not enough crops" };
    return { ok: true };
}
export function buyCrew(s: State, id: string, count = 1): number {
    const c = CREW_BY_ID[id];
    let n = 0;
    while (c && n < count && canBuyCrew(s, c).ok) {
        const k = crewCost(s, c);
        s.shards -= k.shards;
        let left = k.raw;
        for (const cr of CROPS.slice().sort((x, y) => haveCrop(s, y.id) - haveCrop(s, x.id))) {
            const take = Math.min(left, haveCrop(s, cr.id));
            s.farm.crop[cr.id] = haveCrop(s, cr.id) - take;
            left -= take;
            if (left <= 0) break;
        }
        s.farm.crew[id] = crewLevel(s, id) + 1;
        n++;
    }
    return n;
}

/** The raw crops a goal (or the goods it needs) is made of, so the Packers leave them alone. */
export function goalRawIds(s: State): Set<string> {
    const out = new Set<string>();
    const goal = goalOf(s);
    const walk = (cost: Cost) => {
        for (const id of Object.keys(cost)) {
            if (isCrop(id)) out.add(id);
            else if (RECIPE_BY_ID[id]) walk(RECIPE_BY_ID[id].inputs);
        }
    };
    if (goal) walk(goal.cost);
    return out;
}
/** Enchant up to `k` crops from stock above the Packers' floor (the most valuable crops first). */
export function autoPack(s: State, k: number): number {
    const need = enchNeed(s);
    const floor = packFloor(crewLevel(s, "packers"));
    const keepRaw = goalRawIds(s);
    let made = 0;
    for (const c of CROPS.slice().sort((a, b) => b.vm - a.vm)) {
        if (made >= k) break;
        if (keepRaw.has(c.id)) continue;
        const n = Math.min(Math.floor(k - made), Math.floor((haveCrop(s, c.id) - floor) / need));
        if (n > 0) {
            s.farm.crop[c.id] = haveCrop(s, c.id) - need * n;
            s.farm.ench[c.id] = enchStock(s, c.id) + n;
            s.farm.enchanted += n;
            made += n;
        }
    }
    return made;
}
/** Sell up to `k` Enchanted crops beyond what the next tool and hoe need. */
export function autoSell(s: State, ctx: FarmCtx, k: number): number {
    const keep = reserveMap(s);
    let sold = 0;
    for (const c of CROPS.slice().sort((a, b) => a.vm - b.vm)) {
        if (sold >= k) break;
        sold += sellEnchanted(s, ctx, c.id, Math.floor(k - sold), keep[c.id] || 0).n;
    }
    return sold;
}

/** What the crew does each tick: pick and plant crops, cook for the goal, pack and sell. Also catches up after time away. */
function crewTick(s: State, dt: number, ctx: FarmCtx, now: number) {
    const f = s.farm;
    const acc = f.acc;
    if (crewLevel(s, "agron") > 0 && f.auto.sow !== "off") {
        acc.sowT = (acc.sowT || 0) + dt;
        if (acc.sowT >= 2 || dt >= 2) {
            acc.sowT = 0;
            autoSow(s);
            for (const dim of openDims(s)) if (f.gardens[dim].some((p) => !p.c)) plantAll(s, Math.random, dim);
        }
    }
    if (crewLevel(s, "cooks") > 0 && f.auto.cook) {
        acc.cookT = (acc.cookT || 0) + dt;
        if (acc.cookT >= 3 || dt >= 3) {
            acc.cookT = 0;
            queueGoal(s, now);
        }
    }
    const pk = crewLevel(s, "packers");
    if (pk > 0 && f.auto.pack) {
        acc.pack = (acc.pack || 0) + packRate(pk) * dt;
        const k = Math.floor(acc.pack);
        if (k > 0) {
            const made = autoPack(s, k);
            acc.pack = made < k ? 0 : acc.pack - k;
        }
    }
    const tr = crewLevel(s, "traders");
    if (tr > 0 && f.auto.sell) {
        acc.sell = (acc.sell || 0) + sellRate(tr) * dt;
        const k = Math.floor(acc.sell);
        if (k > 0) {
            const sold = autoSell(s, ctx, k);
            acc.sell = sold < k ? 0 : acc.sell - k;
        }
    }
}

// ---- Tool belt ----

export function canBuyTool(s: State, t: ToolDef): Blocker {
    if (ownsTool(s, t.id)) return { ok: false, why: "Already made" };
    const prev = TOOL_BY_ID[`${t.kind}${t.tier - 1}`];
    if (prev && !ownsTool(s, prev.id)) return { ok: false, why: `Needs the ${prev.name}` };
    if (farmLevel(s) < t.need) return { ok: false, why: `Farming ${t.need}` };
    return afford(s, t.cost);
}
export function equipTool(s: State, id: string): boolean {
    const t = TOOL_BY_ID[id];
    if (!t || !ownsTool(s, id) || toolWorn(s, id)) return false;
    const same = s.farm.belt.findIndex((x) => TOOL_BY_ID[x]?.kind === t.kind);
    if (same >= 0) s.farm.belt[same] = id;
    else if (s.farm.belt.length < toolSlots(s)) s.farm.belt.push(id);
    else return false;
    return true;
}
export function unequipTool(s: State, id: string): boolean {
    if (!toolWorn(s, id)) return false;
    s.farm.belt = s.farm.belt.filter((x) => x !== id);
    return true;
}
export function buyTool(s: State, id: string): boolean {
    const t = TOOL_BY_ID[id];
    if (!t || !canBuyTool(s, t).ok) return false;
    spend(s, t.cost);
    s.farm.tools.push(id);
    equipTool(s, id);
    return true;
}

// The step-by-step farming guide is the Farmhand Saga now (sagas.ts, shown on the Level page).

export type FarmView = "garden" | "tools" | "market" | "crew" | "kitchen" | "crops" | "biomes" | "milestones";

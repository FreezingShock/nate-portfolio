import { skillLevel, skillXpFor, type State } from "./data";
import type { EStat } from "./enchant";
import { activeIsland } from "./island-logic";
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
export type ResId = CropId | GoodId;
export type Cost = Partial<Record<ResId, number>>;

export interface CropDef {
    id: CropId;
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

export const CROPS: CropDef[] = [
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
export const resInfo = (id: ResId): { name: string; color: string } => (isCrop(id) ? CROP_BY_ID[id] : GOOD_BY_ID[id]);

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
export const COL_AT = [100, 400, 2000, 10000, 50000];
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
    { id: "copper", name: "Copper Hoe", color: "#e0874a", power: 2.5, need: 4, cost: { flour: 3, wheat: 120 } },
    { id: "iron", name: "Iron Hoe", color: "#d8d8e6", power: 4, need: 9, cost: { stew: 4, flour: 4 } },
    { id: "gold", name: "Golden Hoe", color: "#ffcc33", power: 6.5, need: 15, cost: { jam: 4, stew: 2 } },
    { id: "diamond", name: "Diamond Hoe", color: "#55ffff", power: 10, need: 22, cost: { cake: 4, jam: 4 } },
    { id: "nether", name: "Netherite Hoe", color: "#c98a9a", power: 16, need: 32, cost: { pie: 4, cake: 4 } },
    { id: "ember", name: "Ember Hoe", color: "#ff8a5c", power: 26, need: 44, cost: { emberTart: 4, pie: 6 } },
    { id: "void", name: "Void Hoe", color: "#8a7bff", power: 42, need: 52, cost: { voidTea: 4, emberTart: 4 } },
    { id: "cosmic", name: "Cosmic Hoe", color: "#ffb3f2", power: 70, need: 58, cost: { starCake: 3, voidTea: 6 } },
];
/** Click power every hoe tier adds for the rest of the game. */
export const HOE_CLICK = 0.008;

export type UpCat = "hand" | "rig" | "kitchen";

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
    { id: "plots", name: "Extra Plot", desc: "One more plot in the garden", cat: "rig", cost: { potato: 40 }, growth: 2.4, max: 4, need: 6 },
    // Cookhouse parts
    { id: "oven", name: "Extra Oven", desc: "One more crafting slot", cat: "kitchen", cost: { flour: 6 }, growth: 2.2, max: 3, need: 10 },
    { id: "stoker", name: "Stoker", desc: "Crafts finish 8% sooner per level", cat: "kitchen", cost: { potato: 20 }, growth: 1.35, max: 20, need: 8 },
    { id: "ladle", name: "Auto-Ladle", desc: "Ovens empty themselves, and a craft can repeat on its own", cat: "kitchen", cost: { jam: 4 }, growth: 1, max: 1, need: 18 },
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
const RELIC_IDS = new Set<string>(RELICS.map((r) => r.id));
const RECIPE_IDS = new Set<string>(RECIPES.map((r) => r.id));

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
    plots: Plot[];
    sow: string; // crop to plant by hand ("" = best on this island)
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
}

export const newFarm = (): FarmState => ({
    crop: {}, grown: {}, goods: {}, items: {}, relics: [], equipped: [], claimed: [], hoe: 0, ups: {}, hands: {},
    plots: Array.from({ length: 6 }, () => ({ c: "", p: 0 })), sow: "", waters: 0, harvests: 0, picked: 0, bumpers: 0,
    pods: {}, opened: 0, podFrac: {}, openT: 0, bloom: 0, bumper: 0, focus: "", jobs: [], crafted: 0, log: [],
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
    out.claimed = (Array.isArray(o.claimed) ? o.claimed : []).filter((x, i, a): x is string => typeof x === "string" && a.indexOf(x) === i).slice(0, 200);
    out.hoe = Math.max(0, Math.min(HOES.length - 1, Math.floor(num(o.hoe))));
    out.ups = rec(o.ups, (k) => !!FARM_UP_BY_ID[k], true);
    for (const u of FARM_UPS) if (out.ups[u.id]) out.ups[u.id] = Math.min(u.max, out.ups[u.id]);
    out.hands = rec(o.hands, (k) => CROP_IDS.has(k), true);
    const plots = (Array.isArray(o.plots) ? (o.plots as Record<string, unknown>[]) : []).slice(0, 16).map((p) => {
        const c = typeof p?.c === "string" && CROP_IDS.has(p.c) ? p.c : "";
        return { c, p: c ? Math.max(0, Math.min(CROP_BY_ID[c as CropId].time * 4, num(p?.p))) : 0 };
    });
    while (plots.length < 6) plots.push({ c: "", p: 0 });
    out.plots = plots;
    out.sow = typeof o.sow === "string" && CROP_IDS.has(o.sow) ? o.sow : "";
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

// ---- Numbers ----

export const farmLevel = (s: State) => skillLevel(s.farming);
export const cropOpen = (s: State, c: CropDef) => farmLevel(s) >= c.need;
export const upLevel = (s: State, id: string) => s.farm.ups[id] || 0;
export const haveCrop = (s: State, id: CropId) => s.farm.crop[id] || 0;
export const have = (s: State, id: ResId) => (isCrop(id) ? s.farm.crop[id] || 0 : s.farm.goods[id] || 0);
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

export const plotCount = (s: State) => 6 + (farmLevel(s) >= 10 ? 2 : 0) + (farmLevel(s) >= 25 ? 2 : 0) + (farmLevel(s) >= 40 ? 2 : 0) + upLevel(s, "plots");
export const hoePower = (s: State) => hoeOf(s).power * (1 + 0.06 * upLevel(s, "till") + (hasRelic(s, "gloves") ? 0.1 : 0) + (hasRelic(s, "lantern") ? 0.15 : 0));
/** Hoe power helps crops, but with a softening curve. */
export const hoeFactor = (s: State) => Math.pow(hoePower(s), 0.55);
export const yieldMult = (s: State) => dimFx(s).yield * (1 + 0.08 * upLevel(s, "fert")) * (hasRelic(s, "straw") ? 1.06 : 1) * (hasRelic(s, "lens") ? 1.1 : 1);
export const luckyChance = (s: State) => 0.015 * upLevel(s, "lucky") + (hasRelic(s, "clover") ? 0.06 : 0);
export const podChance = (s: State) => dimFx(s).pod * 0.003 * (1 + 0.1 * upLevel(s, "seeker") + (hasRelic(s, "shears") ? 0.2 : 0));
export const bloomNeed = (s: State) => 90;
export const bumperLen = (s: State) => 6 + 2 * upLevel(s, "bumper") + (hasRelic(s, "lantern") ? 5 : 0) + (hasRelic(s, "totem") ? 6 : 0) + dimFx(s).bumper;
export const bumperMult = (s: State) => 3 * (1 + 0.1 * upLevel(s, "bumper"));
export const farmXpMult = (s: State) => (1 + 0.06 * upLevel(s, "scholar")) * dimFx(s).xp;
export const hasReaper = (s: State) => upLevel(s, "reaper") > 0;
export const ovenSlots = (s: State) => 1 + upLevel(s, "oven");
export const cookSpeed = (s: State) => 1 + 0.08 * upLevel(s, "stoker") + (hasRelic(s, "hearth") ? 0.1 : 0);
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
export const growSpeed = (s: State, c: CropDef) => dimFx(s).speed * (1 + 0.05 * upLevel(s, "sprinkler")) * (1 + handBoost(s, c)) * (hasRelic(s, "sundial") ? 1.1 : 1);

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
const spend = (s: State, cost: Cost) => {
    for (const [id, n] of Object.entries(cost)) {
        if (isCrop(id)) s.farm.crop[id] = haveCrop(s, id) - (n ?? 0);
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
export function setSow(s: State, id: string): boolean {
    if (id && !CROP_IDS.has(id)) return false;
    s.farm.sow = id;
    return true;
}
export function setFocus(s: State, id: string): boolean {
    if (id && !CROP_IDS.has(id)) return false;
    s.farm.focus = id;
    return true;
}

/** Garden size follows your level and the Extra Plot upgrade. */
export function syncPlots(s: State) {
    const want = plotCount(s);
    while (s.farm.plots.length < want) s.farm.plots.push({ c: "", p: 0 });
}

// ---- Permanent bonuses ----

export interface DimSet {
    dim: Dim;
    tier: number;
    next: number;
    bonus: number;
}
const SET_BONUS = [0, 0.005, 0.01, 0.02];
const SET_TIERS = [1, 3, 5];
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
    for (const c of CROPS) add(c.col[0], 0.4 * c.col[1] * colTierOf(s.farm.grown[c.id] || 0));
    add("all", 0.01 * upLevel(s, "deep") + 0.015 * upLevel(s, "ancient") + (hasRelic(s, "almanac") ? 0.025 : 0) + (hasRelic(s, "plenty") ? 0.06 : 0));
    add("tokens", 0.02 * upLevel(s, "ancient") + (hasRelic(s, "plenty") ? 0.08 : 0));
    for (const dim of DIMS) add("all", dimSet(s, dim).bonus);
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

/** Odds of every crop on this island for a mixed planting. Crops above your Farming level are locked; Seed Selector and a focus shift the odds. */
export function cropTable(s: State, islandId = activeIsland(s).id, dim: Dim = activeIsland(s).dim): TableRow[] {
    const base = ISLAND_CROPS[islandId] ?? DIM_DEFAULT[dim];
    const lvl = farmLevel(s);
    const pros = 0.05 * upLevel(s, "prosp") + (hasRelic(s, "shears") ? 0.1 : 0);
    const rows: TableRow[] = base.map(([id, w]) => {
        const crop = CROP_BY_ID[id];
        return { crop, w: w * (1 + pros * (crop.need / 10)), open: lvl >= crop.need, p: 0 };
    });
    const total = rows.reduce((a, r) => a + (r.open ? r.w : 0), 0);
    for (const r of rows) r.p = r.open && total > 0 ? r.w / total : 0;
    return rows;
}

/** The crop a hand planting uses: your choice if this island grows it, else the best open crop here. */
export function sowCrop(s: State): CropDef | null {
    const rows = cropTable(s).filter((r) => r.open);
    if (!rows.length) return null;
    const pick = rows.find((r) => r.crop.id === s.farm.sow);
    if (pick) return pick.crop;
    return rows.slice().sort((a, b) => b.crop.vm - a.crop.vm)[0].crop;
}

type Rng = () => number;

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
    plot: number; // plot index, -1 if nothing was growing
    crop: CropId | "";
    boost: number;
    ready: boolean; // that press finished the crop
    bumperStart: boolean;
}
export interface HarvestOut {
    plot: number;
    crop: CropId;
    units: number;
    lucky: boolean;
    bumper: boolean;
    pod: Dim | null;
    xp: number;
    shards: number;
    hand: boolean;
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
export const readyCount = (s: State) => s.farm.plots.filter((p) => plotReady(s, p)).length;

/** One press of the big button: waters a random growing plot (speeds it up) and fills the Bloom meter. */
export function water(s: State, inp: { combo: number }, rng: Rng = Math.random): WaterOut {
    const f = s.farm;
    const growing = f.plots.map((p, i) => (p.c && !plotReady(s, p) ? i : -1)).filter((i) => i >= 0);
    const boost = waterBoost(s, inp.combo);
    f.waters += 1;
    let plot = -1;
    let ready = false;
    if (growing.length) {
        plot = growing[Math.floor(rng() * growing.length)];
        const pl = f.plots[plot];
        const t = CROP_BY_ID[pl.c as CropId].time;
        pl.p = Math.min(t, pl.p + boost);
        ready = pl.p >= t;
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
    const out: WaterOut = { plot, crop: plot >= 0 ? (f.plots[plot].c as CropId) : "", boost, ready, bumperStart };
    subs.forEach((fn) => fn(out));
    return out;
}

// ---- Planting and harvesting ----

export function plant(s: State, i: number, id?: CropId): boolean {
    const pl = s.farm.plots[i];
    if (!pl || pl.c) return false;
    const c = id ? CROP_BY_ID[id] : sowCrop(s);
    if (!c || !cropOpen(s, c)) return false;
    pl.c = c.id;
    pl.p = 0;
    return true;
}

/** Plant every empty plot: a mixed planting follows the island's odds when you have not picked a crop. */
export function plantAll(s: State, rng: Rng = Math.random): number {
    let n = 0;
    const rows = cropTable(s).filter((r) => r.open);
    if (!rows.length) return 0;
    for (let i = 0; i < s.farm.plots.length; i++) {
        if (s.farm.plots[i].c) continue;
        let c = rows.find((r) => r.crop.id === s.farm.sow)?.crop;
        if (!c) {
            let r = rng();
            c = rows[rows.length - 1].crop;
            for (const row of rows) {
                if (r < row.p) {
                    c = row.crop;
                    break;
                }
                r -= row.p;
            }
        }
        if (plant(s, i, c.id)) n++;
    }
    return n;
}

export const cropShards = (ctx: FarmCtx, c: CropDef) => ctx.cps * c.time * FARM_VALUE * c.vm;

/** Harvest one ripe plot. Hand-picked crops pay 25% more. The plot is empty afterwards, unless the Auto-Reaper replants it. */
export function harvest(s: State, ctx: FarmCtx, i: number, hand: boolean, rng: Rng = Math.random): HarvestOut | null {
    const f = s.farm;
    const pl = f.plots[i];
    if (!pl || !plotReady(s, pl)) return null;
    const c = CROP_BY_ID[pl.c as CropId];
    const bumper = f.bumper > 0;
    const lucky = rng() < luckyChance(s);
    let units = c.yield * hoeFactor(s) * yieldMult(s) * (1 + 0.05 * upLevel(s, "compost") * (hand ? 0 : 1)) * (hand ? 1.25 : 1);
    if (bumper) {
        units *= bumperMult(s);
        f.bumper -= 1;
    }
    if (lucky) units *= 3;
    addCrop(s, c.id, units);
    const xp = cropXp(c) * ctx.xp * farmXpMult(s);
    const shards = cropShards(ctx, c);
    s.farming += xp;
    s.shards += shards;
    s.total += shards;
    f.harvests += 1;
    if (hand) f.picked += 1;
    let pod: Dim | null = null;
    if (rng() < podChance(s) * (hand ? 2 : 1)) {
        pod = activeIsland(s).dim;
        f.pods[pod] = (f.pods[pod] || 0) + 1;
    }
    pl.p = Math.max(0, pl.p - c.time);
    if (!hasReaper(s)) {
        pl.c = "";
        pl.p = 0;
    }
    return { plot: i, crop: c.id, units, lucky, bumper, pod, xp, shards, hand };
}

export function harvestAll(s: State, ctx: FarmCtx, hand = true): number {
    let n = 0;
    for (let i = 0; i < s.farm.plots.length; i++) if (harvest(s, ctx, i, hand)) n++;
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
    for (const pl of f.plots) {
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
        bulkHarvest(s, ctx, c, n);
    }
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
function bulkHarvest(s: State, ctx: FarmCtx, c: CropDef, n: number) {
    const f = s.farm;
    const base = c.yield * hoeFactor(s) * yieldMult(s) * (1 + 0.05 * upLevel(s, "compost")) * (1 + 2 * luckyChance(s));
    const boosted = Math.min(n, f.bumper);
    f.bumper -= boosted;
    const units = base * (n + boosted * (bumperMult(s) - 1));
    addCrop(s, c.id, units);
    s.farming += n * cropXp(c) * ctx.xp * farmXpMult(s);
    const sh = n * cropShards(ctx, c);
    s.shards += sh;
    s.total += sh;
    f.harvests += n;
    const dim = activeIsland(s).dim;
    const fr = (f.podFrac[dim] || 0) + n * podChance(s) * 0.6 * (1 + 0.12 * upLevel(s, "sifter"));
    const whole = Math.floor(fr);
    f.podFrac[dim] = fr - whole;
    if (whole > 0) f.pods[dim] = (f.pods[dim] || 0) + whole;
}

/** Farming XP a second with nothing pressed (for the Skills page ETA): the garden's expected harvests. */
export function idleXpRate(s: State, ctx: FarmCtx): number {
    if (!hasReaper(s)) return 0;
    let r = 0;
    for (const pl of s.farm.plots) {
        if (!pl.c) continue;
        const c = CROP_BY_ID[pl.c as CropId];
        r += (growSpeed(s, c) / c.time) * cropXp(c);
    }
    return r * ctx.xp * farmXpMult(s);
}

/** Crops per second, per plot, summed (for the readout). */
export function cropRate(s: State): number {
    let r = 0;
    for (const pl of s.farm.plots) {
        if (!pl.c) continue;
        const c = CROP_BY_ID[pl.c as CropId];
        r += (growSpeed(s, c) / c.time) * c.yield * hoeFactor(s) * yieldMult(s);
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
        for (const pl of s.farm.plots) if (pl.c) pl.p = Math.min(CROP_BY_ID[pl.c as CropId].time * (hasReaper(s) ? 3 : 1), pl.p + 600);
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
    if (r.kind === "good") s.farm.goods[r.out] = (s.farm.goods[r.out] || 0) + n;
    else s.farm.items[r.out] = (s.farm.items[r.out] || 0) + n;
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

// ---- Feats ----

export interface FeatReward {
    grant?: [GrantKind, number];
    stat?: [EStat, number];
}
export interface FeatLadder {
    key: string;
    name: string;
    unit: string;
    color: string;
    metric: (s: State) => number;
    at: number[];
    rewards: FeatReward[][];
}
const g = (k: GrantKind, n: number): FeatReward => ({ grant: [k, n] });
const st = (k: EStat, v: number): FeatReward => ({ stat: [k, v] });

export const FEAT_LADDERS: FeatLadder[] = [
    { key: "water", name: "Waterer", unit: "plots watered", color: "#6fb4ff", metric: (s) => s.farm.waters, at: [100, 1000, 10000, 50000, 250000], rewards: [[g("dust", 20)], [g("tokens", 1)], [g("eggs", 1)], [g("tokens", 2), st("click", 0.02)], [g("ap", 1)]] },
    { key: "crop", name: "Gatherer", unit: "crops harvested", color: "#e6c85a", metric: (s) => CROPS.reduce((a, c) => a + (s.farm.grown[c.id] || 0), 0), at: [500, 5000, 50000, 500000, 5000000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.01)], [g("eggs", 1)], [st("all", 0.02)]] },
    { key: "bumper", name: "Bumper Grower", unit: "Bumper Crops", color: "#ffd23a", metric: (s) => s.farm.bumpers, at: [5, 50, 250, 1000], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("comboMax", 0.1)], [g("tokens", 2)]] },
    { key: "hand", name: "Picker", unit: "plots harvested by hand", color: "#ff9a4d", metric: (s) => s.farm.picked, at: [25, 250, 1500, 8000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("click", 0.02)], [g("frag", 1)]] },
    { key: "harv", name: "Reaper", unit: "harvests in all", color: "#9be08a", metric: (s) => s.farm.harvests, at: [50, 500, 5000, 50000], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.02)], [g("frag", 1)]] },
    { key: "pod", name: "Seed Collector", unit: "pods opened", color: "#c58bff", metric: (s) => s.farm.opened, at: [5, 25, 100, 400], rewards: [[g("dust", 30)], [g("eggs", 1)], [g("tokens", 2)], [g("frag", 1)]] },
    { key: "cook", name: "Cook", unit: "crafts collected", color: "#ff8a5c", metric: (s) => s.farm.crafted, at: [3, 25, 100, 400], rewards: [[g("dust", 25)], [g("tokens", 1)], [st("minion", 0.03)], [g("eggs", 1)]] },
    { key: "hands", name: "Foreman", unit: "farmhands hired", color: "#7fd0ff", metric: (s) => totalHands(s), at: [10, 50, 150, 400], rewards: [[g("dust", 30)], [g("tokens", 1)], [st("auto", 0.2)], [g("tokens", 2)]] },
    { key: "crow", name: "Scarecrow Maker", unit: "scarecrows made", color: "#ffe29a", metric: (s) => s.farm.relics.length, at: [1, 4, 8, 12], rewards: [[g("dust", 40)], [g("tokens", 1)], [g("eggs", 1)], [g("frag", 2)]] },
    { key: "disc", name: "Botanist", unit: "different crops grown", color: "#55ff77", metric: (s) => CROPS.filter((c) => (s.farm.grown[c.id] || 0) > 0).length, at: [6, 12, 18], rewards: [[g("dust", 40)], [g("tokens", 1)], [st("all", 0.02)]] },
    { key: "hoe", name: "Toolmaker", unit: "hoe tiers", color: "#55ffff", metric: (s) => s.farm.hoe, at: [3, 6, 9], rewards: [[g("dust", 40)], [g("eggs", 1)], [g("tokens", 3)]] },
];

export interface Feat {
    id: string;
    ladder: FeatLadder;
    tier: number;
    at: number;
    rewards: FeatReward[];
}
export const FEATS: Feat[] = FEAT_LADDERS.flatMap((l) => l.at.map((at, tier) => ({ id: `${l.key}:${tier}`, ladder: l, tier, at, rewards: l.rewards[tier] })));
export const featClaimed = (s: State, f: Feat) => s.farm.claimed.includes(f.id);
export const featReady = (s: State, f: Feat) => !featClaimed(s, f) && f.ladder.metric(s) >= f.at;
export const featsReady = (s: State) => FEATS.filter((f) => featReady(s, f));

function pay(s: State, kind: GrantKind, n: number) {
    if (kind === "dust") {
        s.enc.dust += n;
        s.enc.earned += n;
    } else if (kind === "tokens") s.tokens += n;
    else if (kind === "eggs") s.freeEggs += n;
    else if (kind === "ap") s.ap += n;
    else s.frag += n;
}
export function claimFeat(s: State, id: string): Feat | null {
    const f = FEATS.find((x) => x.id === id);
    if (!f || !featReady(s, f)) return null;
    s.farm.claimed.push(id);
    for (const r of f.rewards) if (r.grant) pay(s, r.grant[0], r.grant[1]);
    return f;
}
export function claimAllFeats(s: State): Feat[] {
    return featsReady(s).map((f) => claimFeat(s, f.id)).filter((f): f is Feat => !!f);
}
export function featStats(s: State): Partial<Record<EStat, number>> {
    const out: Partial<Record<EStat, number>> = {};
    for (const id of s.farm.claimed) {
        const f = FEATS.find((x) => x.id === id);
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

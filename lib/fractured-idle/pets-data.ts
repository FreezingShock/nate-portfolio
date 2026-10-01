import type { McSymbolName } from "@/components/mc-symbol";
import type { Dim } from "./islands";

// Pets: pure content tables (no runtime imports, so data.ts can re-export them without a cycle).
//
// Hatch eggs, equip a few, and they level while equipped. A pet's main stat grows every level and three perks
// unlock at levels 25 / 60 / 100. Seven rarities (Common up to Divine), four dimensions, and eggs that are bought
// with different currencies. Duplicates raise a pet's star rank. Equip pets from the same dimension for a bond.
// The rules that turn this into numbers (bonuses, bonds, hatching) live in engine.ts; the UI is tab-pets.tsx.

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic" | "divine";
export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "divine"];

export const RARITIES: Record<Rarity, { name: string; color: string; xp: number; dupe: number; score: number }> = {
    common: { name: "Common", color: "#ffffff", xp: 1, dupe: 600, score: 0.005 },
    uncommon: { name: "Uncommon", color: "var(--mc-green)", xp: 1.5, dupe: 1500, score: 0.007 },
    rare: { name: "Rare", color: "var(--mc-blue)", xp: 2.2, dupe: 4000, score: 0.01 },
    epic: { name: "Epic", color: "var(--mc-light-purple)", xp: 3.2, dupe: 12000, score: 0.015 },
    legendary: { name: "Legendary", color: "var(--mc-gold)", xp: 5, dupe: 40000, score: 0.025 },
    mythic: { name: "Mythic", color: "#ff55e6", xp: 8, dupe: 120000, score: 0.04 },
    divine: { name: "Divine", color: "#5ff6ff", xp: 14, dupe: 400000, score: 0.07 },
};
/** Index of a rarity on the enchanting reveal scale (the same names: common 0 ... divine 6). */
export const rarityIdx = (r: Rarity) => RARITY_ORDER.indexOf(r);

export type PetDim = Dim | "fractured";
export const PET_DIMS: { id: PetDim; name: string; color: string; symbol: McSymbolName; blurb: string }[] = [
    { id: "overworld", name: "Overworld", color: "var(--mc-green)", symbol: "fortune", blurb: "Farm animals, sea creatures and forest guardians." },
    { id: "nether", name: "The Nether", color: "var(--mc-red)", symbol: "heat", blurb: "Fiery beasts from the fortress and the lava seas." },
    { id: "end", name: "The End", color: "var(--mc-light-purple)", symbol: "night", blurb: "Pale, strange creatures that drift between islands." },
    { id: "fractured", name: "Fractured", color: "var(--mc-aqua)", symbol: "magicFind", blurb: "Things born where the islands broke apart." },
];
export const PET_DIM_BY_ID = Object.fromEntries(PET_DIMS.map((d) => [d.id, d])) as Record<PetDim, (typeof PET_DIMS)[number]>;

export type PetStat = "all" | "click" | "minion" | "critChance" | "critDmg" | "tokens" | "skillXp" | "offline" | "bobber" | "col" | "cost" | "dust" | "combo" | "pxp" | "popup";

export const PET_LABEL: Record<PetStat, string> = {
    all: "all shards",
    click: "click power",
    minion: "minion output",
    critChance: "crit chance",
    critDmg: "crit damage",
    tokens: "rebirth tokens",
    skillXp: "skill XP",
    offline: "offline efficiency",
    bobber: "bobber rewards",
    col: "collection speed",
    cost: "minion price",
    dust: "Arcane Dust",
    combo: "max combo",
    pxp: "pet experience",
    popup: "popup frequency",
};

/** "+25%" for most stats, "+1.5" for max combo. */
export const petStatText = (stat: PetStat, v: number) => (stat === "combo" ? `+${+v.toFixed(2)} ${PET_LABEL[stat]}` : `+${+(v * 100).toFixed(v < 0.1 ? 2 : 1)}% ${PET_LABEL[stat]}`);
export const petStatValue = (stat: PetStat, v: number) => (stat === "combo" ? `+${+v.toFixed(2)}` : `+${+(v * 100).toFixed(v < 0.1 ? 2 : 1)}%`);

export const PET_MAX = 100;
export const PET_PERK_AT = [25, 60, 100];
export const PET_SLOTS_MAX = 4;
/** Each extra copy of a pet (a star) strengthens it, up to this many stars. */
export const PET_STAR_MAX = 10;
export const PET_STAR_BONUS = 0.05;
export const starMult = (copies: number) => 1 + PET_STAR_BONUS * Math.max(0, Math.min(PET_STAR_MAX, copies - 1));

export interface PetPerk {
    name: string;
    stat: PetStat;
    value: number;
}

export interface PetDef {
    id: string;
    name: string;
    rarity: Rarity;
    dim: PetDim;
    symbol: McSymbolName;
    color: string;
    stat: PetStat;
    base: number; // main stat at level 1
    per: number; // added per level
    blurb: string;
    perks: [PetPerk, PetPerk, PetPerk];
}

// ---- Generated stats: what a pet of a rarity gives at level 100, scaled per stat ----
const RT: Record<Rarity, number> = { common: 0.35, uncommon: 0.7, rare: 1.2, epic: 1.9, legendary: 3, mythic: 4.8, divine: 7.5 };
const SC: Record<PetStat, number> = { all: 0.6, click: 1, minion: 1, critChance: 0.05, critDmg: 1, tokens: 0.5, skillXp: 0.8, offline: 0.3, bobber: 0.6, col: 0.8, cost: 0.12, dust: 0.8, combo: 0.4, pxp: 0.6, popup: 0.5 };
const top = (r: Rarity, s: PetStat) => RT[r] * SC[s];
const r4 = (n: number) => +n.toFixed(4);
const perk = (name: string, stat: PetStat, r: Rarity, tier: 1 | 2 | 3): PetPerk => ({ name, stat, value: r4(top(r, stat) * [0.1, 0.25, 0.5][tier - 1]) });

type PK = [name: string, stat: PetStat];
const pet = (id: string, name: string, rarity: Rarity, dim: PetDim, symbol: McSymbolName, color: string, stat: PetStat, blurb: string, perks: [PK, PK, PK]): PetDef => ({
    id,
    name,
    rarity,
    dim,
    symbol,
    color,
    stat,
    base: r4(top(rarity, stat) * 0.08),
    per: +((top(rarity, stat) * 0.92) / 99).toFixed(5),
    blurb,
    perks: perks.map(([n, s], i) => perk(n, s, rarity, (i + 1) as 1 | 2 | 3)) as [PetPerk, PetPerk, PetPerk],
});

const P = (name: string, stat: PetStat, value: number): PetPerk => ({ name, stat, value });

export const PETS: PetDef[] = [
    // ---------------- The original fifteen (numbers unchanged so saved pets keep their strength) ----------------
    { id: "silverfish", name: "Silverfish", rarity: "common", dim: "overworld", symbol: "strength", color: "#d0d0d8", stat: "click", base: 0.02, per: 0.004, blurb: "Gnaws through stone one click at a time.", perks: [P("Tunneler", "click", 0.05), P("Silver Lining", "all", 0.02), P("Swarm", "click", 0.15)] },
    { id: "rabbit", name: "Rabbit", rarity: "common", dim: "overworld", symbol: "fortune", color: "var(--mc-yellow)", stat: "minion", base: 0.02, per: 0.004, blurb: "Keeps every minion hopping.", perks: [P("Lucky Foot", "col", 0.05), P("Carrot Patch", "minion", 0.05), P("Warren", "cost", 0.03)] },
    { id: "bat", name: "Bat", rarity: "common", dim: "overworld", symbol: "night", color: "var(--mc-dark-purple)", stat: "offline", base: 0.01, per: 0.002, blurb: "Works the night shift while you are away.", perks: [P("Echolocation", "skillXp", 0.05), P("Night Owl", "offline", 0.05), P("Swarm Song", "all", 0.05)] },
    { id: "ocelot", name: "Ocelot", rarity: "uncommon", dim: "overworld", symbol: "attackSpeed", color: "var(--mc-green)", stat: "critChance", base: 0.002, per: 0.0006, blurb: "Stalks weak points.", perks: [P("Pounce", "critDmg", 0.05), P("Jungle Reflexes", "click", 0.08), P("Apex", "critChance", 0.02)] },
    { id: "squid", name: "Squid", rarity: "uncommon", dim: "overworld", symbol: "fishing", color: "var(--mc-aqua)", stat: "bobber", base: 0.05, per: 0.01, blurb: "Treasure bobbers pay far more.", perks: [P("Ink Trail", "skillXp", 0.1), P("Ink Cloud", "all", 0.02), P("Kraken's Cut", "bobber", 0.5)] },
    { id: "sheep", name: "Sheep", rarity: "uncommon", dim: "overworld", symbol: "flower", color: "#ffffff", stat: "col", base: 0.03, per: 0.007, blurb: "Wool for every collection.", perks: [P("Soft Touch", "cost", 0.03), P("Shear Luck", "minion", 0.08), P("Golden Fleece", "col", 0.25)] },
    { id: "wolf", name: "Wolf", rarity: "rare", dim: "overworld", symbol: "critDamage", color: "var(--mc-red)", stat: "critDmg", base: 0.03, per: 0.008, blurb: "Hits hardest when it counts.", perks: [P("Pack Hunter", "critChance", 0.01), P("Alpha", "click", 0.1), P("Moonhowl", "critDmg", 0.3)] },
    { id: "dolphin", name: "Dolphin", rarity: "rare", dim: "overworld", symbol: "wisdom", color: "var(--mc-aqua)", stat: "skillXp", base: 0.03, per: 0.008, blurb: "Quick learner, quicker skills.", perks: [P("Echo Sense", "bobber", 0.25), P("Pod Leader", "all", 0.03), P("Deep Dive", "skillXp", 0.25)] },
    { id: "blaze", name: "Blaze", rarity: "rare", dim: "nether", symbol: "heat", color: "var(--mc-gold)", stat: "minion", base: 0.03, per: 0.008, blurb: "Runs the furnaces hot.", perks: [P("Ember Bargain", "cost", 0.04), P("Inferno", "minion", 0.12), P("Cinder Wake", "col", 0.2)] },
    { id: "tiger", name: "Tiger", rarity: "epic", dim: "overworld", symbol: "critChance", color: "var(--mc-gold)", stat: "critDmg", base: 0.05, per: 0.012, blurb: "Ferocity given a face.", perks: [P("Stalk", "critChance", 0.015), P("Rend", "click", 0.15), P("Apex Predator", "critDmg", 0.5)] },
    { id: "golem", name: "Golem", rarity: "epic", dim: "overworld", symbol: "defense", color: "var(--mc-gray, #aaaaaa)", stat: "minion", base: 0.05, per: 0.014, blurb: "A tireless foreman.", perks: [P("Iron Bargain", "cost", 0.05), P("Guardian", "all", 0.04), P("Colossus", "minion", 0.4)] },
    { id: "phoenix", name: "Phoenix", rarity: "epic", dim: "nether", symbol: "regen", color: "var(--mc-red)", stat: "all", base: 0.03, per: 0.008, blurb: "Everything rises again, stronger.", perks: [P("Ashes", "offline", 0.05), P("Rebirth Flame", "tokens", 0.08), P("Eternal Flame", "all", 0.08)] },
    { id: "dragon", name: "Ender Dragon", rarity: "legendary", dim: "end", symbol: "comet", color: "var(--mc-light-purple)", stat: "all", base: 0.06, per: 0.018, blurb: "Lord of the End. Bends every stat your way.", perks: [P("Dragon Breath", "critDmg", 0.1), P("Wing Beat", "click", 0.25), P("Ender Sovereign", "all", 0.25)] },
    { id: "griffin", name: "Griffin", rarity: "legendary", dim: "overworld", symbol: "flag", color: "var(--mc-yellow)", stat: "tokens", base: 0.06, per: 0.012, blurb: "Carries rebirth tokens back from the sky.", perks: [P("Keen Eye", "skillXp", 0.15), P("Sky Hoard", "all", 0.06), P("Myth", "tokens", 0.3)] },
    { id: "wisp", name: "Fractured Wisp", rarity: "legendary", dim: "fractured", symbol: "portal", color: "var(--mc-blue)", stat: "col", base: 0.1, per: 0.02, blurb: "A shard of the islands that learned to float.", perks: [P("Refraction", "cost", 0.06), P("Prism", "minion", 0.3), P("Shattered Dawn", "all", 0.12)] },

    // ---------------- Overworld ----------------
    pet("chicken", "Chicken", "common", "overworld", "daisy", "#ffe9a8", "minion", "Lays a golden egg now and then and clucks about it.", [["Egg Layer", "col"], ["Fresh Feed", "minion"], ["Coop", "cost"]]),
    pet("pig", "Pig", "common", "overworld", "heartS", "#ffb3c7", "col", "Roots up extra from every collection.", [["Truffle Nose", "col"], ["Mud Bath", "skillXp"], ["Hog Wild", "click"]]),
    pet("turtle", "Turtle", "common", "overworld", "shield", "#5fbf6a", "offline", "Slow and steady wins the idle game.", [["Shell Up", "offline"], ["Long Life", "pxp"], ["Hard Shell", "all"]]),
    pet("parrot", "Parrot", "common", "overworld", "notes", "#ff6b6b", "skillXp", "Repeats everything it learns.", [["Mimic", "skillXp"], ["Squawk", "popup"], ["Rainbow Wing", "all"]]),
    pet("bee", "Bee", "common", "overworld", "sunburst", "#ffd23a", "minion", "Busy little workers that never nap.", [["Pollinate", "minion"], ["Honey Pot", "tokens"], ["Hive Mind", "all"]]),
    pet("fox", "Fox", "uncommon", "overworld", "fleur", "#ff9a4d", "critChance", "Quick, clever and unreasonably lucky.", [["Sly Step", "critDmg"], ["Kit Luck", "bobber"], ["Nine Tails", "critChance"]]),
    pet("horse", "Horse", "uncommon", "overworld", "knight", "#c9a27a", "click", "Gallops through every click.", [["Gallop", "click"], ["Saddle Up", "combo"], ["Stampede", "all"]]),
    pet("cat", "Cat", "uncommon", "overworld", "smile", "#d8c8ff", "popup", "Curious about every popup that appears.", [["Curious", "popup"], ["Nine Lives", "offline"], ["Purrfect", "critChance"]]),
    pet("panda", "Panda", "uncommon", "overworld", "peace", "#e8e8e8", "pxp", "Naps, snacks, and makes friends fast.", [["Bamboo Snack", "pxp"], ["Chill", "offline"], ["Bear Hug", "all"]]),
    pet("axolotl", "Axolotl", "uncommon", "overworld", "bloom", "#ff9ad5", "bobber", "Regrows your luck after every miss.", [["Regrow", "bobber"], ["Pond Life", "skillXp"], ["Smile", "all"]]),
    pet("polarbear", "Polar Bear", "rare", "overworld", "snow", "#bfe6ff", "minion", "Hibernates on enormous piles of shards.", [["Frost Fur", "cost"], ["Ice Fishing", "bobber"], ["Arctic Might", "minion"]]),
    pet("guardian", "Guardian", "rare", "overworld", "eye", "#5fd6c9", "critChance", "Sees every weak point in the deep.", [["Beam", "critDmg"], ["Deep Watch", "skillXp"], ["Laser Focus", "critChance"]]),
    pet("mooshroom", "Mooshroom", "epic", "overworld", "blossom", "#ff5f5f", "col", "Mushroom stew for every collection.", [["Spore Cloud", "col"], ["Rich Milk", "tokens"], ["Mycelium", "all"]]),
    pet("kraken", "Kraken", "epic", "overworld", "anchor", "#3fa8ff", "bobber", "Drags treasure up from the abyss.", [["Tentacle", "bobber"], ["Abyss", "skillXp"], ["Maelstrom", "all"]]),
    pet("elderguardian", "Elder Guardian", "epic", "overworld", "target", "#b8d4ff", "skillXp", "Ancient, patient and very sure of itself.", [["Curse", "critDmg"], ["Ancient Wisdom", "skillXp"], ["Ocean's Will", "all"]]),
    pet("treant", "Ancient Treant", "legendary", "overworld", "bloom", "#55ff55", "all", "A forest that decided to walk beside you.", [["Deep Roots", "minion"], ["Canopy", "pxp"], ["Heart of the Wood", "all"]]),
    pet("leviathan", "Leviathan", "legendary", "overworld", "fishing", "#5fb8ff", "bobber", "Older than the sea it swims in.", [["Tidal Pull", "skillXp"], ["Hoard", "tokens"], ["Abyssal Crown", "bobber"]]),
    pet("gaia", "Gaia", "mythic", "overworld", "pinwheel", "#7dff9a", "all", "The living world itself, curled up at your feet.", [["Verdant Pulse", "minion"], ["Eternal Spring", "pxp"], ["Mother of Islands", "all"]]),

    // ---------------- The Nether ----------------
    pet("magmacube", "Magma Cube", "common", "nether", "heat", "#ff7a33", "minion", "Bounces around keeping everything warm.", [["Molten Core", "minion"], ["Splitting", "col"], ["Slag", "cost"]]),
    pet("zpiglin", "Zombie Piglin", "common", "nether", "spade", "#8fbf6a", "click", "Never stops swinging that golden sword.", [["Gold Rush", "click"], ["Undead Grit", "offline"], ["Horde", "all"]]),
    pet("piglin", "Piglin", "uncommon", "nether", "maltese", "#ffd070", "tokens", "Trades anything for anything shiny.", [["Barter", "tokens"], ["Gold Sense", "cost"], ["Bastion Pride", "all"]]),
    pet("strider", "Strider", "uncommon", "nether", "regen", "#e85a5a", "col", "Strolls over lava like it is a sidewalk.", [["Lava Walker", "col"], ["Warm Heart", "offline"], ["Shiver", "all"]]),
    pet("hoglin", "Hoglin", "uncommon", "nether", "strength", "#d98a6a", "click", "Charges first and asks nothing later.", [["Charge", "click"], ["Tusk", "critDmg"], ["Herd", "all"]]),
    pet("ghast", "Ghast", "rare", "nether", "smileB", "#f2f2f2", "critDmg", "Cries fireballs at everything.", [["Fireball", "critDmg"], ["Wail", "popup"], ["Soul Drift", "all"]]),
    pet("imp", "Fire Imp", "rare", "nether", "bolt", "#ff5533", "popup", "Sparks trouble. And popups.", [["Spark", "popup"], ["Mischief", "click"], ["Hellfire", "all"]]),
    pet("witherskel", "Wither Skeleton", "epic", "nether", "critDamage", "#6b6b7a", "critDmg", "Rattles through armor like paper.", [["Bone Saw", "critDmg"], ["Decay", "critChance"], ["Withering Blow", "all"]]),
    pet("lavagolem", "Lava Golem", "epic", "nether", "hex", "#ff6a1a", "minion", "Built from basalt and bad intentions.", [["Basalt Skin", "cost"], ["Foundry", "minion"], ["Eruption", "all"]]),
    pet("wither", "Wither", "legendary", "nether", "king", "#4a4a5a", "all", "Three heads, one very strong opinion.", [["Skull Barrage", "critDmg"], ["Decay Aura", "minion"], ["Wither Crown", "all"]]),
    pet("magmatitan", "Magma Titan", "legendary", "nether", "rook", "#ff4a1a", "minion", "A walking volcano with manners.", [["Furnace Heart", "cost"], ["Lava Flow", "col"], ["Titan Forge", "minion"]]),
    pet("infernodemon", "Inferno Demon", "mythic", "nether", "radiation", "#ff2f2f", "all", "Burns hotter the harder you play.", [["Hellmouth", "critDmg"], ["Brimstone", "tokens"], ["Infernal Crown", "all"]]),

    // ---------------- The End ----------------
    pet("endermite", "Endermite", "uncommon", "end", "rune2", "#b366ff", "col", "Tiny, purple and impossible to catch.", [["Warp Bite", "col"], ["Pearl Dust", "dust"], ["Swarm", "all"]]),
    pet("shulker", "Shulker", "uncommon", "end", "square", "#c79bff", "offline", "Closes up and keeps working while you are gone.", [["Shell Lock", "offline"], ["Levitate", "cost"], ["Purpur Pride", "all"]]),
    pet("enderman", "Enderman", "rare", "end", "caduceus", "#9d4dff", "click", "Blinks to wherever the next click lands.", [["Blink", "click"], ["Gaze", "critChance"], ["Void Step", "all"]]),
    pet("phantom", "Phantom", "rare", "end", "spark5", "#7a8fff", "popup", "Swoops in from the dark with free popups.", [["Swoop", "popup"], ["Night Terror", "critDmg"], ["Insomnia", "all"]]),
    pet("voidwalker", "Void Walker", "epic", "end", "atom", "#9b6bff", "all", "Steps between islands without looking.", [["Rift Step", "click"], ["Hollow Hunger", "minion"], ["Void Embrace", "all"]]),
    pet("chorusspirit", "Chorus Spirit", "epic", "end", "spark8", "#d3a8ff", "pxp", "Hums, and every pet around it grows.", [["Harmonize", "pxp"], ["Fruit Bloom", "dust"], ["Resonance", "all"]]),
    pet("eldervoid", "Elder Void", "legendary", "end", "ring", "#7c3aed", "all", "An eye of nothing that sees everything.", [["Event Horizon", "critDmg"], ["Hollow Tide", "minion"], ["Eternal Dark", "all"]]),
    pet("eclipsewyrm", "Eclipse Wyrm", "mythic", "end", "sun", "#ffd23a", "critDmg", "Swallows suns whole and gives them back brighter.", [["Corona", "critChance"], ["Totality", "click"], ["Sunless Crown", "all"]]),
    pet("voidseraph", "Void Seraph", "divine", "end", "star", "#f0e6ff", "all", "Six wings of pale light over an empty sky.", [["Halo", "minion"], ["Seraphic Song", "pxp"], ["Throne of the End", "all"]]),

    // ---------------- Fractured ----------------
    pet("glintmoth", "Glint Moth", "rare", "fractured", "glint", "#8fe8ff", "dust", "Drawn to anything that shimmers. Leaves dust behind.", [["Shimmer", "dust"], ["Powder Wing", "skillXp"], ["Lantern", "all"]]),
    pet("shardsprite", "Shard Sprite", "rare", "fractured", "spark6", "#ffb3ff", "combo", "A giggling splinter of the broken islands.", [["Chain Spark", "combo"], ["Prank", "popup"], ["Glitter", "all"]]),
    pet("echo", "Echo", "epic", "fractured", "ring", "#55ffff", "pxp", "Repeats your best moments back at you.", [["Reverb", "pxp"], ["Double Time", "combo"], ["Afterglow", "all"]]),
    pet("prismfox", "Prism Fox", "epic", "fractured", "fleur", "#ff8fd0", "critChance", "Bends light into critical hits.", [["Refract", "critDmg"], ["Spectrum", "critChance"], ["Rainbow Tail", "all"]]),
    pet("riftwalker", "Rift Walker", "legendary", "fractured", "gem", "#aa66ff", "tokens", "Walks the seams between rebirths.", [["Seam Step", "tokens"], ["Between", "cost"], ["Rift Sovereign", "all"]]),
    pet("singularity", "Singularity", "mythic", "fractured", "infinity", "#ffffff", "all", "Everything you own, folded into one point.", [["Gravity Well", "minion"], ["Spaghettify", "click"], ["Infinite Density", "all"]]),
    pet("fracturebeast", "Fracture Beast", "mythic", "fractured", "command", "#ff55ff", "click", "Cracks the screen with every step.", [["Shatter", "critDmg"], ["Stomp", "click"], ["Fault Line", "all"]]),
    pet("chronos", "Chronos", "divine", "fractured", "hourglass", "#ffe9a8", "all", "Time bends around it. So does your income.", [["Hourglass", "offline"], ["Slow Time", "pxp"], ["Master of Moments", "all"]]),
];

export const PET_BY_ID = new Map(PETS.map((p) => [p.id, p]));
export const petsOfDim = (d: PetDim) => PETS.filter((p) => p.dim === d);

/** Level from total xp: cost to reach level L is K * (1.06^(L-1) - 1) / 0.06. */
const PET_GROWTH = 1.06;
const PET_K = 40;
export const petXpFor = (p: PetDef, level: number) => (PET_K * RARITIES[p.rarity].xp * (Math.pow(PET_GROWTH, level - 1) - 1)) / (PET_GROWTH - 1);
export const petLevel = (p: PetDef, xp: number) => Math.min(PET_MAX, 1 + Math.floor(Math.log(1 + (xp * (PET_GROWTH - 1)) / (PET_K * RARITIES[p.rarity].xp)) / Math.log(PET_GROWTH)));

// ---- Eggs ----
// Every egg hatches pets of its own dimension, is paid for in its own currency, and has its own odds.

export type EggCur = "shards" | "tokens" | "gems" | "dust";
export const EGG_CUR: Record<EggCur, { name: string; one: string; symbol: McSymbolName; color: string }> = {
    shards: { name: "Shards", one: "shard", symbol: "speed", color: "var(--mc-aqua)" },
    tokens: { name: "Rebirth Tokens", one: "token", symbol: "magicFind", color: "var(--mc-yellow)" },
    gems: { name: "Gems", one: "gem", symbol: "pristine", color: "var(--mc-aqua)" },
    dust: { name: "Arcane Dust", one: "dust", symbol: "flask", color: "#e2b8ff" },
};

export interface EggDef {
    id: string;
    name: string;
    color: string;
    symbol: McSymbolName;
    dim: PetDim;
    cur: EggCur;
    /** shards: price = this many seconds of your best income (never below `min`). Other currencies: a flat price. */
    secs?: number;
    min?: number;
    price?: number;
    odds: Partial<Record<Rarity, number>>;
    blurb: string;
}

export const EGGS: EggDef[] = [
    { id: "wood", name: "Wooden Egg", color: "var(--mc-gold)", symbol: "flower", dim: "overworld", cur: "shards", secs: 300, min: 2e5, odds: { common: 62, uncommon: 30, rare: 8 }, blurb: "Plain, warm and full of surprises." },
    { id: "gold", name: "Golden Egg", color: "var(--mc-yellow)", symbol: "magicFind", dim: "overworld", cur: "shards", secs: 1800, min: 2e8, odds: { uncommon: 38, rare: 40, epic: 20, legendary: 2 }, blurb: "Heavy. Something big is inside." },
    { id: "magma", name: "Magma Egg", color: "#ff7a33", symbol: "heat", dim: "nether", cur: "tokens", price: 18, odds: { common: 38, uncommon: 34, rare: 22, epic: 6 }, blurb: "Warm to the touch. Paid for in rebirth tokens." },
    { id: "soul", name: "Soul Egg", color: "#7fd8ff", symbol: "ankh", dim: "nether", cur: "tokens", price: 75, odds: { rare: 40, epic: 40, legendary: 18, mythic: 2 }, blurb: "Whispers when you hold it." },
    { id: "chorus", name: "Chorus Egg", color: "#d3a8ff", symbol: "spark8", dim: "end", cur: "gems", price: 4, odds: { uncommon: 36, rare: 40, epic: 21, legendary: 3 }, blurb: "Pale purple and faintly humming. Costs gems." },
    { id: "void", name: "Void Egg", color: "#9b6bff", symbol: "atom", dim: "end", cur: "gems", price: 14, odds: { epic: 48, legendary: 40, mythic: 10, divine: 2 }, blurb: "Light goes in. Nothing comes out. Except pets." },
    { id: "arcane", name: "Arcane Egg", color: "#e2b8ff", symbol: "flask", dim: "fractured", cur: "dust", price: 400, odds: { rare: 52, epic: 36, legendary: 12 }, blurb: "Steeped in Arcane Dust from the enchant table." },
    { id: "prism", name: "Prismatic Egg", color: "#5ff6ff", symbol: "comet", dim: "fractured", cur: "gems", price: 36, odds: { legendary: 62, mythic: 29, divine: 9 }, blurb: "Every color at once. The rarest egg there is." },
];
export const EGG_BY_ID = new Map(EGGS.map((e) => [e.id, e]));

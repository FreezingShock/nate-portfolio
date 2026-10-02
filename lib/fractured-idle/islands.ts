import { fmtPct } from "./format";
import type { McSymbolName } from "@/components/mc-symbol";

// Islands: pure content tables (no runtime imports, so data.ts can re-export
// them without an import cycle). The rules that turn these into numbers live in
// island-logic.ts; the scenery is drawn by components/.../island-art.tsx.
//
// An island has three kinds of value:
//   - tier bonus (`mult`): the best one you have unlocked multiplies everything,
//     always, like before (does not stack, and only the main-path islands have one);
//   - active perks: very specific bonuses (certain minions, skills, button looks,
//     combo, popups...) that apply while THAT island is the one you are on;
//   - mastery: time spent on an island makes its perks stronger.
// Main-path islands unlock from lifetime shards. Special islands unlock by doing
// something specific (`need`), and pay bigger, narrower perks.

export type Dim = "overworld" | "nether" | "end";

export interface DimDef {
    id: Dim;
    name: string;
    color: string;
    blurb: string;
}

export const DIMENSIONS: DimDef[] = [
    { id: "overworld", name: "Overworld", color: "var(--mc-green)", blurb: "Fields, mines and deep caves." },
    { id: "nether", name: "The Nether", color: "var(--mc-red)", blurb: "Fire, basalt and old fortresses." },
    { id: "end", name: "The End", color: "var(--mc-light-purple)", blurb: "Pale stone floating in the void." },
];

// ---- Perks ----

export type SkillKey = "mining" | "farming" | "combat" | "fishing";

export type Perk =
    | { k: "minion"; ids: string[]; m: number } // output x m for these minions
    | { k: "col"; ids: string[]; m: number } // collection speed for these minions
    | { k: "minionAll"; m: number }
    | { k: "click"; m: number }
    | { k: "all"; m: number }
    | { k: "crit"; v: number } // + crit chance
    | { k: "critDmg"; v: number } // + crit damage
    | { k: "xp"; skill: SkillKey; m: number } // skill xp gain
    | { k: "eff"; skill: SkillKey; m: number } // strength of the skill's level bonus
    | { k: "combo"; max?: number; gain?: number }
    | { k: "ev"; freq?: number; life?: number; power?: number; golden?: number; bobber?: number; resist?: number; qte?: number }
    | { k: "loot"; m: number } // treasure bobber loot
    | { k: "petXp"; m: number }
    | { k: "offline"; v: number }
    | { k: "affinity"; v: number }; // + click per equipped look that matches this island

export interface Affinity {
    shape?: string[];
    skin?: string[];
    burst?: string[];
    crit?: string[];
    aura?: string[];
}

// ---- Scenery ----

export type Sil = "mountains" | "domes" | "pines" | "spires" | "crystals" | "pillars" | "mesas" | "towers" | "waves" | "islets";
export type DecoKind = "tree" | "pine" | "crystal" | "mushroom" | "wheat" | "tower" | "torch" | "lava" | "portal" | "pillar" | "web" | "coral" | "chest" | "spike";
export type FxKind = "motes" | "embers" | "snow" | "ash" | "fireflies" | "bubbles" | "rain" | "sparks";

export interface DecoSpec {
    k: DecoKind;
    x: number; // 0..100 across the island top
    y: number; // 0..100 back to front
    s?: number; // scale
    c?: string;
    c2?: string;
}

export interface Theme {
    sky: [string, string, string];
    orb?: { c: string; x: number; y: number; r: number; ring?: boolean };
    stars?: number;
    clouds?: string;
    far: [Sil, string];
    mid: [Sil, string];
    land: { top: string; edge: string; rock: string; rock2: string };
    deco: DecoSpec[];
    fx: [FxKind, string, number];
}

export type IslandStat = "bobbers" | "mining" | "farming" | "combat" | "pets" | "frag" | "bestCombo" | "asc";

export interface IslandDef {
    id: string;
    name: string;
    dim: Dim;
    color: string;
    symbol: McSymbolName;
    at: number; // lifetime shards (main path). Infinity for special islands.
    mult: number; // tier bonus while this is the best main-path island you own (1 for specials)
    blurb: string;
    lore: string;
    need?: { stat: IslandStat; n: number; label: string };
    perks: Perk[];
    affinity?: Affinity;
    theme: Theme;
}

export const isSpecial = (i: IslandDef) => !Number.isFinite(i.at);

// Mastery: seconds spent on an island. Each level makes that island's perks 6% stronger.
export const MASTERY_AT = [600, 1800, 3600, 7200, 14400, 28800, 57600, 115200, 230400, 460800];
export const MASTERY_STEP = 0.06;

const M = (ids: string[], m: number): Perk => ({ k: "minion", ids, m });

export const ISLANDS: IslandDef[] = [
    // ================= OVERWORLD =================
    {
        id: "hub", name: "The Hub", dim: "overworld", color: "var(--mc-green)", symbol: "location", at: 0, mult: 1,
        blurb: "Where every adventure starts.",
        lore: "A friendly green island with a bell tower and more paths than anyone has walked.",
        perks: [M(["cobble", "wheat"], 1.2), { k: "click", m: 1.04 }, { k: "affinity", v: 0.03 }],
        affinity: { shape: ["block", "pebble", "orb"], skin: ["island", "glass"], burst: ["ripple", "sparks"] },
        theme: {
            sky: ["#2b6cb0", "#63b3ed", "#bee3f8"], orb: { c: "#fff6b0", x: 76, y: 22, r: 9 }, clouds: "#ffffff",
            far: ["mountains", "#6f9bd1"], mid: ["domes", "#3f8f5a"],
            land: { top: "#6bbf4e", edge: "#9be07a", rock: "#7a5a3a", rock2: "#3f2c1c" },
            deco: [{ k: "tree", x: 20, y: 55 }, { k: "tower", x: 52, y: 38, c: "#d8c48a", c2: "#8a4a2a" }, { k: "tree", x: 80, y: 62, s: 0.9 }, { k: "chest", x: 38, y: 80, s: 0.8 }],
            fx: ["motes", "#fff6b0", 10],
        },
    },
    {
        id: "farm", name: "Farming Islands", dim: "overworld", color: "var(--mc-yellow)", symbol: "fortune", at: 3e3, mult: 1.13,
        blurb: "Wheat as far as the wind goes.",
        lore: "Gentle terraces of golden fields. Every scarecrow here has a name.",
        perks: [M(["wheat", "oak"], 1.25), { k: "xp", skill: "farming", m: 1.5 }, { k: "eff", skill: "farming", m: 1.4 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["grass", "toxic"], shape: ["bloom", "pebble"], burst: ["leaves", "pixels"] },
        theme: {
            sky: ["#3b82c4", "#8ecbf0", "#fff3c4"], orb: { c: "#fff2a0", x: 24, y: 24, r: 10 }, clouds: "#fffdf0",
            far: ["domes", "#9ccf7a"], mid: ["domes", "#6aa640"],
            land: { top: "#a6d94a", edge: "#d2f06a", rock: "#8a6a3a", rock2: "#4a3520" },
            deco: [{ k: "wheat", x: 24, y: 50 }, { k: "wheat", x: 52, y: 66 }, { k: "wheat", x: 76, y: 48 }, { k: "tree", x: 88, y: 66, s: 0.8 }],
            fx: ["motes", "#ffe066", 12],
        },
    },
    {
        id: "mine", name: "Gold Mine", dim: "overworld", color: "var(--mc-gold)", symbol: "forge", at: 1e5, mult: 1.3,
        blurb: "A warm tunnel lined with veins of raw shard ore.",
        lore: "Lanterns sway over rails that have not stopped rattling since the first minion arrived.",
        perks: [M(["coal", "iron", "gold"], 1.25), { k: "xp", skill: "mining", m: 1.5 }, { k: "click", m: 1.05 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["gold", "chrome", "ember"], shape: ["gear", "gem"], burst: ["coins", "pixels"] },
        theme: {
            sky: ["#2a1c10", "#6a4420", "#d89a3c"], far: ["mesas", "#5a3b1a"], mid: ["mesas", "#3d2812"],
            land: { top: "#c4944c", edge: "#e8be6a", rock: "#6a4a2a", rock2: "#22160c" },
            deco: [{ k: "crystal", x: 28, y: 54, c: "#ffd23a", c2: "#fff3a0" }, { k: "torch", x: 52, y: 40 }, { k: "chest", x: 74, y: 62 }, { k: "pillar", x: 88, y: 50, c: "#8a6a3a", c2: "#c4944c", s: 0.8 }],
            fx: ["sparks", "#ffd23a", 10],
        },
    },
    {
        id: "park", name: "The Park", dim: "overworld", color: "var(--mc-dark-green)", symbol: "regen", at: 5e6, mult: 1.52,
        blurb: "A forest old enough to have opinions.",
        lore: "Birch and jungle tangle together. Something rustles, and it is almost always friendly.",
        perks: [M(["oak"], 1.3), M(["emerald"], 1.15), { k: "ev", life: 1.25 }, { k: "combo", gain: 1.2 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["toxic", "grass"], shape: ["bloom", "heart"], burst: ["leaves", "hearts"] },
        theme: {
            sky: ["#1f5a3a", "#4aa56a", "#c8f0b0"], orb: { c: "#f4ffd0", x: 70, y: 20, r: 8 },
            far: ["pines", "#2e7d4a"], mid: ["pines", "#1f5f38"],
            land: { top: "#4fae5a", edge: "#86dd86", rock: "#6a4a2a", rock2: "#2e1f12" },
            deco: [{ k: "tree", x: 18, y: 52, c: "#2f8f4a" }, { k: "tree", x: 44, y: 70, s: 1.1, c: "#3aa25a" }, { k: "tree", x: 70, y: 48, c: "#2a7a42" }, { k: "mushroom", x: 86, y: 70, s: 0.8 }],
            fx: ["fireflies", "#d8ff7a", 12],
        },
    },
    {
        id: "caverns", name: "Deep Caverns", dim: "overworld", color: "var(--mc-aqua)", symbol: "pristine", at: 1e9, mult: 1.81,
        blurb: "Crystal ceilings and the far-off echo of minecarts.",
        lore: "The deeper you dig, the brighter it gets. Nobody has explained this.",
        perks: [M(["diamond", "lapis", "emerald"], 1.25), { k: "critDmg", v: 0.4 }, { k: "eff", skill: "mining", m: 1.3 }, { k: "col", ids: ["diamond", "lapis"], m: 1.6 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["void", "glass", "frost"], shape: ["gem", "diamond", "hex"], burst: ["stars", "sparks"] },
        theme: {
            sky: ["#050b1f", "#0b1f4a", "#14508a"], stars: 14, far: ["crystals", "#1a4a8a"], mid: ["crystals", "#0f3a6e"],
            land: { top: "#2d6ea8", edge: "#6fd0ff", rock: "#1c2c4c", rock2: "#0a1224" },
            deco: [{ k: "crystal", x: 24, y: 52, c: "#5cc8ff", c2: "#d8f6ff", s: 1.2 }, { k: "crystal", x: 52, y: 68, c: "#8a9aff", c2: "#e0e4ff" }, { k: "crystal", x: 78, y: 50, c: "#4af0d0", c2: "#d8fff6", s: 1.1 }, { k: "pillar", x: 92, y: 66, c: "#3a5a8a", c2: "#6a8ac0", s: 0.7 }],
            fx: ["motes", "#8fe8ff", 14],
        },
    },
    {
        id: "den", name: "Spider's Den", dim: "overworld", color: "var(--mc-dark-purple)", symbol: "night", at: 1e13, mult: 2.46,
        blurb: "Webs, egg sacs and something watching from the dark.",
        lore: "The moon never sets over the Den. The spiders prefer it that way.",
        perks: [M(["obsidian", "redstone", "glowstone"], 1.22), { k: "crit", v: 0.06 }, { k: "xp", skill: "combat", m: 1.5 }, { k: "eff", skill: "combat", m: 1.3 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["obsidian", "void"], crit: ["shatter", "bolt"], shape: ["diamond", "hex"] },
        theme: {
            sky: ["#0b0614", "#2a1040", "#5a1f6a"], orb: { c: "#d8c4ff", x: 74, y: 22, r: 10 }, stars: 34,
            far: ["spires", "#241036"], mid: ["spires", "#170a26"],
            land: { top: "#4a2a5a", edge: "#8a5aa0", rock: "#2a1838", rock2: "#10081a" },
            deco: [{ k: "web", x: 30, y: 52, c: "#e8d8ff" }, { k: "mushroom", x: 52, y: 70, c: "#8a4ac0", c2: "#e0c0ff" }, { k: "pillar", x: 76, y: 50, c: "#3a2a48", c2: "#6a4a80" }, { k: "spike", x: 90, y: 68, s: 0.8 }],
            fx: ["ash", "#b98aff", 12],
        },
    },
    // ================= NETHER =================
    {
        id: "crimson", name: "Crimson Wastes", dim: "nether", color: "var(--mc-red)", symbol: "heat", at: 1e16, mult: 3.03,
        blurb: "Red fungus forests under a burning sky.",
        lore: "The trees here are made of mushroom and spite. The ground is warm.",
        perks: [M(["glowstone", "redstone", "fractured"], 1.25), { k: "click", m: 1.05 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["ember", "magma"], burst: ["embers"], aura: ["embers"], shape: ["sunburst"] },
        theme: {
            sky: ["#2a0608", "#7a1414", "#e0502a"], orb: { c: "#ffb060", x: 30, y: 26, r: 11, ring: true },
            far: ["mountains", "#4a0f10"], mid: ["mountains", "#2a0708"],
            land: { top: "#8a2a2a", edge: "#d8503a", rock: "#3a1010", rock2: "#180505" },
            deco: [{ k: "mushroom", x: 24, y: 54, c: "#d8303a", c2: "#ffb0a0", s: 1.5 }, { k: "lava", x: 52, y: 70 }, { k: "torch", x: 78, y: 50 }, { k: "spike", x: 90, y: 68, s: 0.8 }],
            fx: ["embers", "#ff8a3a", 16],
        },
    },
    {
        id: "fortress", name: "Blazing Fortress", dim: "nether", color: "var(--mc-gold)", symbol: "heat", at: 1e18, mult: 3.54,
        blurb: "Lava bridges, blaze spawners and a constant, shimmering heat.",
        lore: "A fortress built by something that hated the cold. Every hall glows.",
        perks: [M(["glowstone", "obsidian"], 1.3), { k: "combo", max: 1, gain: 1.3 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["magma", "ember", "obsidian"], shape: ["octagon", "sunburst", "bastion"], burst: ["embers", "lightning"] },
        theme: {
            sky: ["#1a0404", "#5a0c0c", "#ff6a1a"], far: ["towers", "#3a0a0a"], mid: ["towers", "#210505"],
            land: { top: "#5a2a2a", edge: "#9a4a30", rock: "#2a0f0f", rock2: "#0e0404" },
            deco: [{ k: "tower", x: 50, y: 36, c: "#3a1a1a", c2: "#ff6a1a", s: 1.3 }, { k: "lava", x: 24, y: 70 }, { k: "torch", x: 80, y: 52 }, { k: "spike", x: 90, y: 70, s: 0.8 }],
            fx: ["embers", "#ff6a1a", 18],
        },
    },
    {
        id: "soul", name: "Soul Sand Valley", dim: "nether", color: "var(--mc-aqua)", symbol: "night", at: 1e21, mult: 4.17,
        blurb: "Blue flames over sand that remembers.",
        lore: "It is quiet in the Valley, and the quiet has a voice.",
        perks: [{ k: "xp", skill: "mining", m: 1.3 }, { k: "xp", skill: "farming", m: 1.3 }, { k: "xp", skill: "combat", m: 1.3 }, { k: "xp", skill: "fishing", m: 1.3 }, { k: "all", m: 1.2 }, { k: "ev", resist: 0.2 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["void", "obsidian", "neon"], aura: ["halo", "stars"], burst: ["runes", "stars"] },
        theme: {
            sky: ["#0a1a2a", "#1a4a5a", "#4ac0c0"], orb: { c: "#b8ffff", x: 68, y: 20, r: 8 }, stars: 20,
            far: ["spires", "#0f3a45"], mid: ["spires", "#0a2a34"],
            land: { top: "#6a5a48", edge: "#9a8a6a", rock: "#3a3028", rock2: "#15100c" },
            deco: [{ k: "torch", x: 26, y: 54, c2: "#5ff0ff" }, { k: "pillar", x: 50, y: 40, c: "#d8d4c0", c2: "#fffdf0" }, { k: "torch", x: 74, y: 66, c2: "#5ff0ff" }, { k: "crystal", x: 90, y: 54, c: "#3ad8e0", c2: "#d8ffff", s: 0.8 }],
            fx: ["embers", "#5ff0ff", 14],
        },
    },
    // ================= THE END =================
    {
        id: "end", name: "The End", dim: "end", color: "var(--mc-light-purple)", symbol: "portal", at: 1e24, mult: 5.03,
        blurb: "Pale stone drifting in an endless dark.",
        lore: "Nothing grows here, and that is fine. The portal hums. Nothing else does.",
        perks: [M(["fractured", "quartz", "ice"], 1.25), { k: "all", m: 1.08 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["void", "galaxy", "obsidian"], shape: ["nova", "diamond"], burst: ["stars", "spiral"], aura: ["stars", "vortex"] },
        theme: {
            sky: ["#05020f", "#140a2a", "#2a1650"], orb: { c: "#d8b4ff", x: 72, y: 26, r: 10, ring: true }, stars: 60,
            far: ["islets", "#2a1a4a"], mid: ["islets", "#1a0f33"],
            land: { top: "#e8e0a8", edge: "#fff4c0", rock: "#b8ae78", rock2: "#5a5230" },
            deco: [{ k: "portal", x: 50, y: 42 }, { k: "pillar", x: 22, y: 58, c: "#1a0a2a", c2: "#b388ff" }, { k: "pillar", x: 80, y: 62, c: "#1a0a2a", c2: "#b388ff", s: 0.9 }, { k: "crystal", x: 90, y: 50, c: "#e040fb", c2: "#ffd8ff", s: 0.7 }],
            fx: ["motes", "#d8b4ff", 14],
        },
    },
    {
        id: "dragon", name: "Dragon's Nest", dim: "end", color: "var(--mc-dark-purple)", symbol: "comet", at: 1e27, mult: 6.06,
        blurb: "The tallest pillars in the End, and something circling them.",
        lore: "Crystals crown each obsidian tower. The wings overhead are the only weather.",
        perks: [{ k: "critDmg", v: 1 }, { k: "click", m: 1.15 }, { k: "combo", gain: 1.4 }, { k: "affinity", v: 0.03 }],
        affinity: { crit: ["nova", "meteor", "implode"], skin: ["obsidian", "plasma"], shape: ["nova", "sunburst", "crown"] },
        theme: {
            sky: ["#02010a", "#0e0620", "#3a1266"], stars: 70, orb: { c: "#ff9aff", x: 26, y: 28, r: 8, ring: true },
            far: ["spires", "#1a0c33"], mid: ["pillars", "#0d0620"],
            land: { top: "#d8d09a", edge: "#f8f0b8", rock: "#9a9064", rock2: "#443e26" },
            deco: [{ k: "pillar", x: 24, y: 54, c: "#14081f", c2: "#c28bff", s: 1.3 }, { k: "crystal", x: 50, y: 40, c: "#e040fb", c2: "#ffd8ff", s: 1.3 }, { k: "pillar", x: 76, y: 60, c: "#14081f", c2: "#c28bff", s: 1.1 }, { k: "spike", x: 90, y: 70, s: 0.8 }],
            fx: ["embers", "#c28bff", 14],
        },
    },
    {
        id: "void", name: "Void Gardens", dim: "end", color: "var(--mc-blue)", symbol: "flower", at: 1e29, mult: 7.01,
        blurb: "Blooms that feed on nothing at all.",
        lore: "Whatever tends the Gardens keeps very good records and leaves no footprints.",
        perks: [M(["prismarine", "ice", "quartz", "fractured"], 1.3), { k: "col", ids: ["prismarine", "ice", "quartz", "fractured", "redstone"], m: 1.5 }, { k: "affinity", v: 0.03 }],
        affinity: { skin: ["galaxy", "aurora", "void"], shape: ["bloom", "orb"], burst: ["stars", "bubbles"], aura: ["stars"] },
        theme: {
            sky: ["#000000", "#080414", "#1a0a33"], stars: 90, orb: { c: "#9a4dff", x: 50, y: 30, r: 13, ring: true },
            far: ["islets", "#14092a"], mid: ["islets", "#0b051a"],
            land: { top: "#3a2a6a", edge: "#8a6aff", rock: "#1a1038", rock2: "#050210" },
            deco: [{ k: "mushroom", x: 22, y: 56, c: "#7a5aff", c2: "#d8ccff", s: 1.3 }, { k: "crystal", x: 48, y: 44, c: "#9a4dff", c2: "#eaddff", s: 1.2 }, { k: "mushroom", x: 74, y: 66, c: "#3a8aff", c2: "#cce0ff" }, { k: "tree", x: 90, y: 54, c: "#5a3ab0", s: 0.7 }],
            fx: ["motes", "#9a4dff", 16],
        },
    },
    {
        id: "fractured", name: "Fractured Islands", dim: "end", color: "var(--mc-blue)", symbol: "comet", at: 1e32, mult: 8.1,
        blurb: "The shattered home of it all.",
        lore: "Every island you have visited is a piece of this one. Some pieces are still falling.",
        perks: [{ k: "all", m: 1.15 }, { k: "minionAll", m: 1.15 }, { k: "ev", power: 1.2 }, { k: "affinity", v: 0.04 }],
        affinity: { skin: ["prism", "chroma", "holo", "galaxy"], shape: ["crown", "nova", "sunburst"], burst: ["fireworks", "spiral"], aura: ["vortex"] },
        theme: {
            sky: ["#04122a", "#0b2f6e", "#3aa0ff"], stars: 50, orb: { c: "#dff0ff", x: 70, y: 24, r: 11, ring: true },
            far: ["islets", "#0f3a7a"], mid: ["islets", "#0a2a5a"],
            land: { top: "#6ab0ff", edge: "#d0e8ff", rock: "#2a4a80", rock2: "#0c1a38" },
            deco: [{ k: "crystal", x: 50, y: 40, c: "#5cc8ff", c2: "#eaf8ff", s: 1.7 }, { k: "crystal", x: 24, y: 58, c: "#8a9aff", c2: "#e8ecff" }, { k: "crystal", x: 78, y: 62, c: "#4af0d0", c2: "#e0fff8", s: 1.1 }, { k: "pillar", x: 92, y: 50, c: "#3a5a9a", c2: "#8ab0ff", s: 0.7 }],
            fx: ["motes", "#bfe0ff", 16],
        },
    },
    // ================= SPECIAL ISLANDS =================
    {
        id: "reef", name: "Sunken Reef", dim: "overworld", color: "var(--mc-dark-aqua)", symbol: "fishing", at: Infinity, mult: 1,
        need: { stat: "bobbers", n: 100, label: "Catch 100 treasure bobbers" },
        blurb: "An island that has been underwater the whole time.",
        lore: "The tide never comes in because the tide is already here.",
        perks: [M(["prismarine", "ice"], 1.8), { k: "loot", m: 1.5 }, { k: "ev", bobber: 1.6 }, { k: "xp", skill: "fishing", m: 2 }, { k: "eff", skill: "fishing", m: 1.5 }, { k: "affinity", v: 0.05 }],
        affinity: { skin: ["ocean", "glass"], burst: ["bubbles"], aura: ["pulse"], shape: ["orb", "bloom"] },
        theme: {
            sky: ["#062a4a", "#0a5a8a", "#3ac0d8"], far: ["waves", "#0a4a7a"], mid: ["waves", "#083a62"],
            land: { top: "#e8d8a0", edge: "#fff2c8", rock: "#3a5a7a", rock2: "#10202f" },
            deco: [{ k: "coral", x: 24, y: 54, c: "#ff7aa8", c2: "#ffd0e0" }, { k: "coral", x: 50, y: 68, c: "#ff9a4a", c2: "#ffe0b0", s: 1.2 }, { k: "chest", x: 76, y: 56 }, { k: "coral", x: 90, y: 68, c: "#b06aff", c2: "#e8d0ff", s: 0.8 }],
            fx: ["bubbles", "#bff4ff", 16],
        },
    },
    {
        id: "garden", name: "Glowing Garden", dim: "overworld", color: "var(--mc-green)", symbol: "flower", at: Infinity, mult: 1,
        need: { stat: "farming", n: 30, label: "Reach Farming level 30" },
        blurb: "It only blooms after dark.",
        lore: "Every plant here glows a little, as if embarrassed to be noticed.",
        perks: [{ k: "col", ids: ["cobble", "wheat", "oak", "coal", "iron", "gold", "diamond", "lapis", "emerald", "obsidian", "glowstone", "fractured", "redstone", "quartz", "ice", "prismarine"], m: 1.3 }, { k: "all", m: 1.1 }, { k: "eff", skill: "farming", m: 1.6 }, M(["wheat", "oak", "emerald", "glowstone"], 1.5), { k: "affinity", v: 0.05 }],
        affinity: { skin: ["aurora", "toxic", "neon"], shape: ["bloom", "heart"], burst: ["leaves", "hearts"], aura: ["stars"] },
        theme: {
            sky: ["#10204a", "#2a3a7a", "#7a8aff"], stars: 26, orb: { c: "#e0f0ff", x: 26, y: 24, r: 8 },
            far: ["domes", "#23407a"], mid: ["domes", "#1a6a6a"],
            land: { top: "#5ae0a0", edge: "#b0ffd8", rock: "#2a4a5a", rock2: "#0c1a24" },
            deco: [{ k: "mushroom", x: 22, y: 54, c: "#3affd0", c2: "#e0fff8", s: 1.3 }, { k: "tree", x: 48, y: 44, c: "#4ac08a", s: 1.1 }, { k: "mushroom", x: 72, y: 68, c: "#ff7ad8", c2: "#ffe0f6" }, { k: "crystal", x: 90, y: 54, c: "#7affc0", c2: "#e8fff4", s: 0.8 }],
            fx: ["fireflies", "#9affc8", 16],
        },
    },
    {
        id: "sanctuary", name: "Pet Sanctuary", dim: "overworld", color: "var(--mc-light-purple)", symbol: "petLuck", at: Infinity, mult: 1,
        need: { stat: "pets", n: 8, label: "Own 8 different pets" },
        blurb: "Every pet you have ever met lives here.",
        lore: "Soft grass, warm stones and a very firm no-leash policy.",
        perks: [{ k: "petXp", m: 3 }, { k: "all", m: 1.1 }, { k: "ev", golden: 1.3 }, { k: "affinity", v: 0.05 }],
        affinity: { skin: ["candy", "glass"], shape: ["heart", "pebble", "bloom"], burst: ["hearts", "confetti"], aura: ["halo", "stars"] },
        theme: {
            sky: ["#ff9cc8", "#ffcfe4", "#fff6fa"], orb: { c: "#ffffff", x: 74, y: 22, r: 9 }, clouds: "#ffffff",
            far: ["domes", "#f0a8c8"], mid: ["domes", "#7fcf9a"],
            land: { top: "#8ae0a0", edge: "#d0ffdc", rock: "#b89a7a", rock2: "#6a5440" },
            deco: [{ k: "tree", x: 22, y: 54, c: "#ff9ac8", s: 1.2 }, { k: "tower", x: 52, y: 40, c: "#f4e4c4", c2: "#ff7aa8", s: 0.9 }, { k: "tree", x: 78, y: 62, c: "#ffb0d8" }, { k: "mushroom", x: 40, y: 82, s: 0.7, c: "#ff7aa8" }],
            fx: ["motes", "#ffd0e8", 14],
        },
    },
    {
        id: "casino", name: "Fortune Isle", dim: "overworld", color: "var(--mc-gold)", symbol: "magicFind", at: Infinity, mult: 1,
        need: { stat: "frag", n: 5, label: "Find 5 Fracture Fragments" },
        blurb: "The house always wins, except here.",
        lore: "Neon over a floating casino. The coins are real and so is the luck.",
        perks: [{ k: "ev", golden: 2, power: 1.25 }, { k: "crit", v: 0.08 }, { k: "loot", m: 1.3 }, { k: "affinity", v: 0.05 }],
        affinity: { skin: ["gold", "prism", "neon"], shape: ["crown", "gem"], burst: ["coins", "confetti"], crit: ["fireworks"] },
        theme: {
            sky: ["#1a0a2a", "#4a1a6a", "#ff4ad0"], stars: 30, orb: { c: "#ffd23a", x: 72, y: 24, r: 9, ring: true },
            far: ["towers", "#2a1040"], mid: ["towers", "#1a0828"],
            land: { top: "#5a3a8a", edge: "#ffd23a", rock: "#2a1a3a", rock2: "#0e0618" },
            deco: [{ k: "chest", x: 50, y: 58, c: "#ffd23a", c2: "#fff3a0", s: 1.3 }, { k: "tower", x: 24, y: 44, c: "#ff4ad0", c2: "#ffd23a" }, { k: "crystal", x: 78, y: 52, c: "#ffd23a", c2: "#fff8c0" }, { k: "torch", x: 90, y: 68, c2: "#ff4ad0" }],
            fx: ["sparks", "#ffd23a", 14],
        },
    },
    {
        id: "forge", name: "Dwarven Forge", dim: "nether", color: "var(--mc-gold)", symbol: "forge", at: Infinity, mult: 1,
        need: { stat: "mining", n: 30, label: "Reach Mining level 30" },
        blurb: "Anvils the size of houses, still warm.",
        lore: "Something hammers behind every wall, in perfect time.",
        perks: [M(["iron", "gold", "diamond", "lapis"], 1.8), { k: "eff", skill: "mining", m: 1.8 }, { k: "click", m: 1.2 }, { k: "xp", skill: "mining", m: 1.5 }, { k: "affinity", v: 0.05 }],
        affinity: { skin: ["magma", "chrome", "gold"], shape: ["gear", "octagon"], burst: ["pixels", "coins", "embers"] },
        theme: {
            sky: ["#140800", "#4a1a00", "#ff7a1a"], far: ["mesas", "#3a1400"], mid: ["mesas", "#210a00"],
            land: { top: "#6a4a3a", edge: "#c08a5a", rock: "#2a1810", rock2: "#0e0704" },
            deco: [{ k: "tower", x: 26, y: 42, c: "#505058", c2: "#ff9a3a", s: 1.1 }, { k: "lava", x: 54, y: 66 }, { k: "chest", x: 78, y: 54 }, { k: "crystal", x: 90, y: 68, c: "#ff9a3a", c2: "#ffe0b0", s: 0.8 }],
            fx: ["sparks", "#ffb04a", 14],
        },
    },
    {
        id: "arena", name: "Slayer Arena", dim: "nether", color: "#c02a2a", symbol: "critChance", at: Infinity, mult: 1,
        need: { stat: "combat", n: 30, label: "Reach Combat level 30" },
        blurb: "Sand, scars and a very loud crowd.",
        lore: "Nobody remembers who built it, but the floor is always freshly raked.",
        perks: [{ k: "crit", v: 0.12 }, { k: "critDmg", v: 0.6 }, { k: "eff", skill: "combat", m: 1.6 }, { k: "xp", skill: "combat", m: 2 }, { k: "affinity", v: 0.05 }],
        affinity: { crit: ["shatter", "bolt", "meteor", "cross"], skin: ["obsidian", "magma"], shape: ["diamond", "nova", "bastion"] },
        theme: {
            sky: ["#1a0a0a", "#3a1010", "#8a2a2a"], orb: { c: "#ff6a6a", x: 50, y: 24, r: 12, ring: true },
            far: ["pillars", "#2a1010"], mid: ["pillars", "#1a0808"],
            land: { top: "#6a5a4a", edge: "#a89878", rock: "#3a2a24", rock2: "#140c0a" },
            deco: [{ k: "pillar", x: 20, y: 52, c: "#4a3a34", c2: "#8a6a5a" }, { k: "spike", x: 50, y: 66 }, { k: "pillar", x: 80, y: 52, c: "#4a3a34", c2: "#8a6a5a" }, { k: "torch", x: 36, y: 78 }, { k: "torch", x: 66, y: 78 }],
            fx: ["ash", "#ff6a6a", 14],
        },
    },
    {
        id: "tempest", name: "Storm Spire", dim: "end", color: "var(--mc-blue)", symbol: "attackSpeed", at: Infinity, mult: 1,
        need: { stat: "bestCombo", n: 8, label: "Reach a combo of x8" },
        blurb: "A lightning rod taller than the sky.",
        lore: "The storm here is fed by momentum. Keep moving and it keeps listening.",
        perks: [{ k: "combo", max: 2, gain: 1.6 }, { k: "ev", freq: 1.3 }, { k: "click", m: 1.15 }, { k: "affinity", v: 0.05 }],
        affinity: { burst: ["lightning", "sparks"], skin: ["plasma", "neon", "chroma"], aura: ["vortex", "orbit"], crit: ["bolt"] },
        theme: {
            sky: ["#0a0a1f", "#23236a", "#6a6aff"], clouds: "#2a2a5a", stars: 20,
            far: ["spires", "#15154a"], mid: ["spires", "#0d0d33"],
            land: { top: "#5a5a9a", edge: "#b0b0ff", rock: "#1a1a4a", rock2: "#0a0a26" },
            deco: [{ k: "tower", x: 50, y: 34, c: "#8a8aff", c2: "#ffe066", s: 1.4 }, { k: "crystal", x: 24, y: 56, c: "#ffe066", c2: "#fff8c0" }, { k: "pillar", x: 80, y: 58, c: "#3a3a8a", c2: "#8a8aff" }],
            fx: ["rain", "#9ab0ff", 16],
        },
    },
    {
        id: "spire", name: "Ascension Spire", dim: "end", color: "var(--mc-yellow)", symbol: "comet", at: Infinity, mult: 1,
        need: { stat: "asc", n: 1, label: "Ascend once" },
        blurb: "Only reachable by leaving everything behind.",
        lore: "The stairs begin where your progress ended. They are warm and they go up.",
        perks: [{ k: "all", m: 1.15 }, { k: "offline", v: 0.15 }, { k: "xp", skill: "mining", m: 1.25 }, { k: "xp", skill: "farming", m: 1.25 }, { k: "xp", skill: "combat", m: 1.25 }, { k: "xp", skill: "fishing", m: 1.25 }, { k: "affinity", v: 0.05 }],
        affinity: { skin: ["prism", "gold", "holo", "chroma"], shape: ["crown", "sunburst", "nova"], aura: ["halo", "vortex"] },
        theme: {
            sky: ["#10061f", "#3a1a66", "#ffb84a"], orb: { c: "#ffd23a", x: 50, y: 30, r: 13, ring: true }, stars: 30,
            far: ["spires", "#2a1250"], mid: ["spires", "#1a0a33"],
            land: { top: "#d8c88a", edge: "#fff0b0", rock: "#7a6a9a", rock2: "#2a2048" },
            deco: [{ k: "tower", x: 50, y: 32, c: "#e8d08a", c2: "#ffffff", s: 1.5 }, { k: "pillar", x: 22, y: 58, c: "#b8a060", c2: "#fff0b0" }, { k: "pillar", x: 80, y: 60, c: "#b8a060", c2: "#fff0b0" }, { k: "crystal", x: 90, y: 50, c: "#ffd23a", c2: "#fff8c0", s: 0.8 }],
            fx: ["motes", "#ffd23a", 16],
        },
    },
];

export const ISLAND_BY_ID: Record<string, IslandDef> = Object.fromEntries(ISLANDS.map((i) => [i.id, i]));

/** Human-readable line for a perk. `k` scales it by mastery. */
export function perkText(p: Perk, k = 1, names: Record<string, string> = {}): string {
    const mult = (m: number) => `x${+(1 + (m - 1) * k).toFixed(2)}`;
    const add = (v: number) => `+${fmtPct(v * k, 1)}`;
    const list = (ids: string[]) => (ids.length > 4 ? `${ids.length} minion types` : ids.map((i) => names[i] ?? i).join(", "));
    const skill = (s: SkillKey) => s[0].toUpperCase() + s.slice(1);
    switch (p.k) {
        case "minion": return `${list(p.ids)}: ${mult(p.m)} output`;
        case "col": return `${list(p.ids)}: ${mult(p.m)} collection speed`;
        case "minionAll": return `All minions ${mult(p.m)}`;
        case "click": return `${mult(p.m)} click power`;
        case "all": return `${mult(p.m)} all shards`;
        case "crit": return `${add(p.v)} crit chance`;
        case "critDmg": return `${add(p.v)} crit damage`;
        case "xp": return `${mult(p.m)} ${skill(p.skill)} xp`;
        case "eff": return `${skill(p.skill)} levels ${mult(p.m)} stronger`;
        case "combo": return [p.max ? `+${+(p.max * k).toFixed(2)} max combo` : "", p.gain ? `${mult(p.gain)} combo build speed` : ""].filter(Boolean).join(", ");
        case "ev": return [p.freq && `${mult(p.freq)} popups`, p.bobber && `${mult(p.bobber)} bobbers`, p.golden && `${mult(p.golden)} golden shards`, p.life && `${mult(p.life)} popup lifetime`, p.power && `${mult(p.power)} boon strength`, p.resist && `${add(p.resist)} curse resistance`, p.qte && `+${p.qte}s QTE time`].filter(Boolean).join(", ");
        case "loot": return `${mult(p.m)} bobber loot`;
        case "petXp": return `${mult(p.m)} pet xp`;
        case "offline": return `${add(p.v)} offline efficiency`;
        case "affinity": return `${add(p.v)} click per matching button look`;
    }
}

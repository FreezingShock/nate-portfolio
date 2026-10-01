import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "./data";
import { openIslands } from "./island-logic";
import { codexCount } from "./enchant";
import { skillLevel } from "./data";

// The click button's wardrobe. Every look unlocks from progress (clicks,
// crits, rebirths, ascensions, trophies...), never from a currency. Whatever
// you equip in the functional slots (shape, skin, click effect, crit effect,
// aura) pays its bonus; colors, number styles and symbols are pure style. On
// top of that every look you own adds a small permanent "collection" bonus.
//
// To add a look: append a row with L(...) below. Ids are saved, so never
// rename one. A new shape / skin / effect / aura also needs its visual: clip
// path or CSS in button-face.tsx, particles in button-fx.ts.

export type BtnStat =
    | "clicks" | "crits" | "total" | "rebirths" | "asc" | "bobbers" | "hatched" | "pets" | "minions" | "trophies" | "hours" | "islands"
    | "combo" | "popups" | "golden" | "perfect" | "mining" | "farming" | "enchanting" | "rolls" | "codex" | "ore" | "harvests" | "feats" | "level" | "visited" | "relics" | "frag";

export interface BtnBonus {
    click?: number; // +x of click value
    crit?: number; // +x crit chance
    critDmg?: number; // +x crit damage
    hold?: number; // +clicks/s at full heat while holding
    xp?: number; // +x skill xp
    bobber?: number; // +x treasure bobber rewards
    combo?: number; // + max combo multiplier
    flow?: number; // +x combo build speed
}

export interface LookDef {
    id: string;
    name: string;
    desc: string;
    need?: { stat: BtnStat; n: number };
    bonus?: BtnBonus;
    color?: string; // crit colors: the glow color ("" = follows the skin)
    symbol?: McSymbolName; // symbols only
}

export const STAT_LABEL: Record<BtnStat, string> = {
    clicks: "clicks",
    crits: "crits",
    total: "lifetime shards",
    rebirths: "rebirths",
    asc: "ascensions",
    bobbers: "bobbers caught",
    hatched: "eggs hatched",
    pets: "pets owned",
    minions: "minions at once",
    trophies: "trophy tiers",
    hours: "hours played",
    islands: "islands unlocked",
    combo: "best combo",
    popups: "popups caught",
    golden: "golden shards",
    perfect: "perfect timings",
    mining: "Mining level",
    farming: "Farming level",
    enchanting: "Enchanting level",
    rolls: "enchant rolls",
    codex: "Codex entries",
    ore: "ore mined",
    harvests: "harvests",
    feats: "mining and farming feats",
    level: "Fractured Level",
    visited: "islands visited",
    relics: "relics and scarecrows",
    frag: "Fracture Fragments",
};

export function statValue(s: State, stat: BtnStat): number {
    switch (stat) {
        case "pets": return Object.keys(s.pets).length;
        case "minions": return s.peak.minions;
        case "rebirths": return Math.max(s.rebirths, s.btn.rb);
        case "trophies": return Object.values(s.tro).reduce((a, b) => a + b, 0);
        case "hours": return s.playTime / 3600;
        case "islands": return openIslands(s).length;
        case "combo": return s.bestCombo;
        case "popups": return s.evs.caught;
        case "golden": return s.evs.golden;
        case "perfect": return s.evs.perfect;
        case "mining": return skillLevel(s.mining);
        case "farming": return skillLevel(s.farming);
        case "enchanting": return skillLevel(s.enchanting, "enchanting");
        case "rolls": return s.enc.rolls;
        case "codex": return codexCount(s);
        case "ore": return Object.values(s.mine.mined).reduce((a, b) => a + b, 0);
        case "harvests": return s.farm.harvests;
        case "feats": return s.mine.claimed.length + s.farm.claimed.length;
        case "level": return s.lvl;
        case "visited": return s.visited.length;
        case "relics": return s.mine.relics.length + s.farm.relics.length;
        case "frag": return s.frag;
        default: return s[stat] as number;
    }
}

const L = (id: string, name: string, desc: string, stat?: BtnStat, n?: number, bonus?: BtnBonus, extra?: Partial<LookDef>): LookDef => ({
    id, name, desc, need: stat ? { stat, n: n! } : undefined, bonus, ...extra,
});

export const SHAPES: LookDef[] = [
    L("block", "Block", "The classic."),
    L("pebble", "Pebble", "Soft and smooth.", "clicks", 100, { click: 0.02 }),
    L("orb", "Orb", "Perfectly round.", "clicks", 500, { click: 0.03 }),
    L("hex", "Hexite", "Six honest sides.", "clicks", 2500, { crit: 0.01 }),
    L("diamond", "Shard", "Sharp and hungry.", "crits", 150, { critDmg: 0.1 }),
    L("octagon", "Stopper", "Built to be hammered.", "clicks", 15000, { hold: 1, combo: 0.25 }),
    L("cross", "Medic", "A little first aid for pets.", "pets", 3, { xp: 0.05 }),
    L("bastion", "Bastion", "A shield that hits back.", "rebirths", 1, { click: 0.05 }),
    L("gem", "Gem", "Cut by a patient jeweler.", "hatched", 10, { bobber: 0.1 }),
    L("heart", "Heart", "Beats with every click.", "bobbers", 10, { xp: 0.08 }),
    L("bloom", "Bloom", "Five petals of luck.", "hours", 5, { crit: 0.015 }),
    L("gear", "Cog", "Runs on minion power.", "minions", 500, { click: 0.05, flow: 0.05 }),
    L("nova", "Nova", "A star in your hand.", "crits", 5000, { crit: 0.02, critDmg: 0.1 }),
    L("sunburst", "Sunburst", "Too bright to look at.", "rebirths", 15, { click: 0.06, crit: 0.01, flow: 0.05 }),
    L("crown", "Crown", "For the ruler of the islands.", "asc", 2, { click: 0.1, combo: 0.5 }),
    L("star", "Starlet", "Five points, all of them proud.", "crits", 1000, { crit: 0.01 }),
    L("delta", "Delta", "Points the way forward.", "clicks", 8000, { click: 0.03 }),
    L("kite", "Kite", "Catches every breeze.", "hours", 8, { xp: 0.05 }),
    L("clover", "Clover", "Four leaves, one lucky click.", "popups", 50, { bobber: 0.1 }),
    L("pent", "Pentagon", "Five sides, no nonsense.", "islands", 6, { click: 0.04 }),
    L("droplet", "Droplet", "Round at the bottom, sharp on top.", "bobbers", 50, { bobber: 0.12 }),
    L("puff", "Puff", "Soft as a cloud.", "hours", 20, { xp: 0.08 }),
    L("daisy", "Daisy", "Eight petals, no waiting.", "farming", 15, { click: 0.04 }),
    L("ingot", "Ingot", "Smelted, not mined.", "mining", 20, { click: 0.05, hold: 1 }),
    L("aegis", "Aegis", "A shield for the stubborn.", "rebirths", 6, { click: 0.05, combo: 0.25 }),
    L("bolt", "Bolt", "Charged and ready.", "combo", 10, { hold: 1, flow: 0.05 }),
    L("ghost", "Phantom", "Boo.", "golden", 10, { crit: 0.015 }),
    L("obelisk", "Obelisk", "Old, tall and humming.", "level", 25, { crit: 0.02, critDmg: 0.1 }),
    L("warden", "Warden", "Hear it before you see it.", "perfect", 25, { critDmg: 0.15 }),
    L("eternity", "Eternity", "Never quite ends.", "asc", 5, { click: 0.12, combo: 0.5, flow: 0.1 }),
    L("fractal", "Fractal", "A shard of the Fractured Islands.", "feats", 40, { click: 0.1, crit: 0.03, critDmg: 0.2 }),
];

export const SKINS: LookDef[] = [
    L("island", "Island", "Takes the color of your island."),
    L("glass", "Glass", "Clear and cool.", "clicks", 100, { click: 0.02 }),
    L("grass", "Grass Block", "Straight from the overworld.", "clicks", 300, { click: 0.02 }),
    L("ember", "Ember", "Molten and restless.", "clicks", 1000, { click: 0.04 }),
    L("frost", "Frost", "Crisp ice crystal.", "crits", 50, { crit: 0.015 }),
    L("candy", "Candy", "Sweet and striped.", "hours", 2, { click: 0.03 }),
    L("toxic", "Toxic", "Bubbling green ooze.", "bobbers", 5, { bobber: 0.08 }),
    L("ocean", "Ocean", "Waves in a bottle.", "hatched", 3, { xp: 0.05 }),
    L("obsidian", "Obsidian", "Dark, glossy, sharp.", "rebirths", 2, { click: 0.04 }),
    L("circuit", "Circuit", "Live wires.", "clicks", 25000, { hold: 1, combo: 0.25 }),
    L("neon", "Neon", "Lit from within.", "trophies", 12, { critDmg: 0.1 }),
    L("sunset", "Sunset", "The last light of day.", "hours", 10, { click: 0.04 }),
    L("void", "Void", "Stars in the dark.", "total", 1e7, { critDmg: 0.15 }),
    L("magma", "Magma", "Cracked rock, lava beneath.", "total", 1e12, { click: 0.06 }),
    L("chrome", "Chrome", "Mirror polish.", "minions", 1500, { click: 0.06, flow: 0.05 }),
    L("gold", "Gold", "Polished and gleaming.", "total", 1e10, { click: 0.08 }),
    L("plasma", "Plasma", "A caged storm.", "rebirths", 8, { crit: 0.02, critDmg: 0.1, combo: 0.25 }),
    L("prism", "Prism", "Every color at once.", "asc", 1, { click: 0.05, crit: 0.02 }),
    L("aurora", "Aurora", "Northern lights, captured.", "asc", 2, { click: 0.06, xp: 0.1 }),
    L("chroma", "Chroma", "Colors that never settle.", "asc", 3, { click: 0.08, critDmg: 0.15 }),
    L("galaxy", "Galaxy", "A spiral of stars.", "asc", 4, { click: 0.1, hold: 1, combo: 0.5 }),
    L("holo", "Holo", "Pearl and rainbow foil.", "asc", 6, { click: 0.12, crit: 0.03, flow: 0.1 }),
    L("creeper", "Creeper", "Hsssss.", "mining", 12, { click: 0.03 }),
    L("slime", "Slime", "Wobbly and wet.", "harvests", 2000, { xp: 0.08 }),
    L("honey", "Honey", "Slow, golden, a little sticky.", "farming", 20, { click: 0.05, xp: 0.05 }),
    L("redstone", "Redstone", "Signals everywhere.", "ore", 5000, { hold: 1, combo: 0.25 }),
    L("deepslate", "Deepslate", "Dark and dense.", "mining", 30, { click: 0.05 }),
    L("prismarine", "Prismarine", "Sea lantern glow.", "visited", 10, { xp: 0.1 }),
    L("rune", "Runestone", "Old magic, glowing.", "rolls", 100, { crit: 0.02, xp: 0.08 }),
    L("amethyst", "Amethyst", "Crystal and chime.", "feats", 15, { crit: 0.02, critDmg: 0.1 }),
    L("bedrock", "Bedrock", "Unbreakable. Almost.", "clicks", 1e6, { click: 0.1 }),
    L("diamondore", "Diamond Ore", "Gleaming in the stone.", "ore", 100000, { click: 0.06 }),
    L("abyss", "Abyss", "The deep looks back.", "bobbers", 200, { bobber: 0.15, crit: 0.02 }),
    L("ender", "Ender", "Eyes in the dark.", "perfect", 30, { crit: 0.025, critDmg: 0.1 }),
    L("storm", "Stormcloud", "Thunder in a jar.", "combo", 15, { critDmg: 0.15, flow: 0.05 }),
    L("inferno", "Inferno", "Roaring flames.", "rebirths", 20, { click: 0.08, crit: 0.02 }),
    L("supernova", "Supernova", "A dying star, kept in a box.", "asc", 8, { click: 0.15, crit: 0.04, critDmg: 0.2 }),
    L("fractured", "Fractured", "Light through the cracks.", "level", 60, { click: 0.18, crit: 0.04, critDmg: 0.25, combo: 0.5 }),
    L("celestial", "Celestial", "Rays from beyond the sky.", "asc", 12, { click: 0.2, hold: 1, combo: 0.75, flow: 0.15 }),
];

export const BURSTS: LookDef[] = [
    L("ripple", "Ripple", "Rings on water."),
    L("sparks", "Sparks", "Quick little flecks.", "clicks", 150, { click: 0.02 }),
    L("pixels", "Pixels", "Blocky pops.", "clicks", 800, { click: 0.02 }),
    L("bubbles", "Bubbles", "Drifting upward.", "bobbers", 3, { crit: 0.01 }),
    L("stars", "Stars", "Tumbling sparkles.", "clicks", 3000, { critDmg: 0.08 }),
    L("hearts", "Hearts", "Floating affection.", "pets", 5, { xp: 0.06 }),
    L("embers", "Embers", "Rising heat.", "clicks", 12000, { click: 0.04 }),
    L("leaves", "Leaves", "An autumn breeze.", "hours", 3, { xp: 0.05 }),
    L("coins", "Coins", "Cha-ching.", "total", 1e6, { click: 0.04 }),
    L("frost", "Flurry", "Snowflakes burst out.", "crits", 250, { crit: 0.015 }),
    L("confetti", "Confetti", "Every click a party.", "crits", 500, { crit: 0.015, hold: 1, flow: 0.05 }),
    L("shock", "Shockwave", "Thunder on every hit.", "rebirths", 5, { click: 0.05, critDmg: 0.1 }),
    L("runes", "Runes", "Old magic rises.", "clicks", 100000, { click: 0.05, xp: 0.05 }),
    L("lightning", "Lightning", "Bolts crack around you.", "rebirths", 10, { click: 0.06, crit: 0.01, flow: 0.05 }),
    L("fireworks", "Fireworks", "Launch and bloom.", "asc", 1, { click: 0.07, critDmg: 0.1 }),
    L("spiral", "Spiral", "A galaxy in every click.", "asc", 3, { click: 0.1, hold: 1, combo: 0.25 }),
];

export const CRITS: LookDef[] = [
    L("pulse", "Pulse", "A ring and a spray of sparks."),
    L("bolt", "Bolt", "Lightning strikes the button.", "crits", 300, { crit: 0.01 }),
    L("cross", "Flare", "A cross of light.", "crits", 1500, { critDmg: 0.1 }),
    L("shatter", "Shatter", "Glass shards explode.", "crits", 4000, { critDmg: 0.1 }),
    L("meteor", "Meteor", "Something big is falling.", "rebirths", 4, { click: 0.04, crit: 0.01 }),
    L("implode", "Implosion", "It all pulls in, then blows out.", "crits", 15000, { critDmg: 0.15, combo: 0.25 }),
    L("nova", "Supernova", "A star dies on your button.", "asc", 1, { critDmg: 0.2, crit: 0.01 }),
    L("fireworks", "Finale", "A full fireworks show.", "asc", 4, { critDmg: 0.25, crit: 0.02, combo: 0.5 }),
];

export const COLORS: LookDef[] = [
    L("sapphire", "Sapphire", "The default blue.", undefined, undefined, undefined, { color: "#5cc8ff" }),
    L("azure", "Azure", "Deep, electric blue.", "crits", 100, undefined, { color: "#3d7bff" }),
    L("emerald", "Emerald", "Fresh green.", "crits", 400, undefined, { color: "#4dff9a" }),
    L("amber", "Amber", "Warm and golden.", "crits", 1000, undefined, { color: "#ffc94d" }),
    L("crimson", "Crimson", "Loud red.", "crits", 2500, undefined, { color: "#ff5068" }),
    L("violet", "Violet", "Royal purple.", "crits", 6000, undefined, { color: "#b98aff" }),
    L("rose", "Rose", "Hot pink.", "trophies", 15, undefined, { color: "#ff7ad9" }),
    L("frost", "Pure", "Clean white light.", "trophies", 30, undefined, { color: "#eef8ff" }),
    L("skin", "Match", "Follows your skin.", "rebirths", 3, undefined, { color: "" }),
    L("rainbow", "Rainbow", "Cycles through every hue.", "asc", 1, undefined, { color: "rainbow" }),
];

export const NUMS: LookDef[] = [
    L("classic", "Classic", "White with a shadow."),
    L("bold", "Bold", "Bigger and louder.", "clicks", 400),
    L("outline", "Outline", "Thick dark edge.", "clicks", 5000),
    L("neon", "Neon", "Glows in your skin color.", "crits", 200),
    L("ice", "Ice", "Cold gradient.", "crits", 1200),
    L("fire", "Fire", "Hot gradient.", "rebirths", 3),
    L("gold", "Gold", "Shiny gradient.", "total", 1e12),
    L("rainbow", "Rainbow", "Shifting colors.", "asc", 1),
];

export const AURAS: LookDef[] = [
    L("none", "None", "Just the button."),
    L("halo", "Halo", "A slow spinning ring.", "clicks", 1500, { click: 0.02 }),
    L("pulse", "Pulse", "Rings spreading outward.", "hours", 4, { crit: 0.01 }),
    L("stars", "Twinkle", "Little stars blinking around.", "hatched", 15, { xp: 0.06 }),
    L("snow", "Snowfall", "Soft flakes drifting down.", "crits", 600, { crit: 0.01, critDmg: 0.05 }),
    L("embers", "Embers", "Sparks climbing the air.", "rebirths", 6, { click: 0.05 }),
    L("orbit", "Orbit", "Bright dots circling.", "minions", 2500, { click: 0.05, hold: 1, combo: 0.25 }),
    L("vortex", "Vortex", "A spinning ring of color.", "asc", 2, { click: 0.08, critDmg: 0.1, flow: 0.1 }),
];

export const GLYPHS: LookDef[] = [
    L("speed", "Spark", "The original.", undefined, undefined, undefined, { symbol: "speed" }),
    L("strength", "Fist", "Hit harder.", undefined, undefined, undefined, { symbol: "strength" }),
    L("fortune", "Clover", "Feeling lucky.", undefined, undefined, undefined, { symbol: "fortune" }),
    L("heat", "Steam", "Getting hot.", "clicks", 200, undefined, { symbol: "heat" }),
    L("regen", "Heart", "With love.", "clicks", 1000, undefined, { symbol: "regen" }),
    L("comet", "Comet", "Shooting by.", "crits", 100, undefined, { symbol: "comet" }),
    L("pristine", "Gem", "Flawless.", "hatched", 5, undefined, { symbol: "pristine" }),
    L("portal", "Portal", "To somewhere else.", "rebirths", 1, undefined, { symbol: "portal" }),
    L("intelligence", "Mind", "Big brain.", "trophies", 8, undefined, { symbol: "intelligence" }),
    L("wisdom", "Wisdom", "Old and calm.", "hours", 6, undefined, { symbol: "wisdom" }),
    L("night", "Night", "After dark.", "total", 1e13, undefined, { symbol: "night" }),
    L("defense", "Guard", "Unbreakable.", "minions", 800, undefined, { symbol: "defense" }),
    L("petLuck", "Paw", "Pet approved.", "pets", 6, undefined, { symbol: "petLuck" }),
    L("magicFind", "Magic", "Find everything.", "crits", 3000, undefined, { symbol: "magicFind" }),
    L("forge", "Forge", "Hammer and heat.", "rebirths", 10, undefined, { symbol: "forge" }),
    L("fishing", "Hook", "Something's biting.", "bobbers", 25, undefined, { symbol: "fishing" }),
    L("star", "Star", "Wish upon it.", "clicks", 50, undefined, { symbol: "star" }),
    L("starO", "Outline", "Almost a star.", "clicks", 300, undefined, { symbol: "starO" }),
    L("check", "Tick", "Done and dusted.", "trophies", 3, undefined, { symbol: "check" }),
    L("day", "Sunrise", "A new day.", "hours", 3, undefined, { symbol: "day" }),
    L("arrow", "Arrow", "Onward.", "clicks", 700, undefined, { symbol: "arrow" }),
    L("flower", "Bloom", "A little color.", "hours", 8, undefined, { symbol: "flower" }),
    L("pick", "Pickaxe", "Dig dig dig.", "mining", 5, undefined, { symbol: "pick" }),
    L("location", "Marker", "You are here.", "visited", 5, undefined, { symbol: "location" }),
    L("flag", "Flag", "Planted it.", "level", 10, undefined, { symbol: "flag" }),
    L("music", "Song", "In tune.", "hours", 12, undefined, { symbol: "music" }),
    L("notes", "Note", "Hum along.", "hours", 18, undefined, { symbol: "notes" }),
    L("hazard", "Hazard", "Handle with care.", "crits", 300, undefined, { symbol: "critChance" }),
    L("blade", "Blades", "Crossed and ready.", "crits", 1000, undefined, { symbol: "attackSpeed" }),
    L("spade", "Spade", "High card.", "crits", 400, undefined, { symbol: "spade" }),
    L("hearts", "Heart", "Pets approve.", "pets", 10, undefined, { symbol: "heartS" }),
    L("snow", "Snowflake", "No two alike.", "crits", 800, undefined, { symbol: "snow" }),
    L("plus", "Cross", "First aid.", "pets", 8, undefined, { symbol: "plus" }),
    L("smile", "Smile", "Keep going.", "popups", 25, undefined, { symbol: "smile" }),
    L("sun", "Sun", "Bright side.", "hours", 25, undefined, { symbol: "sun" }),
    L("gearS", "Cog", "Gears turning.", "mining", 10, undefined, { symbol: "cog" }),
    L("fleur", "Fleur", "Fancy.", "islands", 8, undefined, { symbol: "fleur" }),
    L("bolt", "Lightning", "Zap.", "combo", 12, undefined, { symbol: "bolt" }),
    L("flowerD", "Daisy", "Fresh picked.", "farming", 10, undefined, { symbol: "daisy" }),
    L("scissors", "Shears", "Snip.", "harvests", 500, undefined, { symbol: "scissors" }),
    L("anchor", "Anchor", "Hold fast.", "bobbers", 100, undefined, { symbol: "anchor" }),
    L("pencil", "Pencil", "Write it down.", "rolls", 25, undefined, { symbol: "pencil" }),
    L("asterisk", "Asterisk", "Terms apply.", "clicks", 25000, undefined, { symbol: "asterisk" }),
    L("pinwheel", "Pinwheel", "Catch the wind.", "crits", 2500, undefined, { symbol: "pinwheel" }),
    L("ghost", "Ghost", "Friendly one.", "golden", 10, undefined, { symbol: "smileB" }),
    L("snowman", "Snowman", "Do you want to build one?", "hours", 15, undefined, { symbol: "snowman" }),
    L("gem2", "Gemstone", "Deep find.", "ore", 1000, undefined, { symbol: "gem" }),
    L("atom", "Atom", "Tiny and mighty.", "enchanting", 10, undefined, { symbol: "atom" }),
    L("flask", "Flask", "Bubbling.", "enchanting", 25, undefined, { symbol: "flask" }),
    L("peace", "Peace", "Take a breath.", "perfect", 5, undefined, { symbol: "peace" }),
    L("radiation", "Radiation", "Stand back.", "rebirths", 12, undefined, { symbol: "radiation" }),
    L("caduceus", "Caduceus", "Pet healer.", "hatched", 25, undefined, { symbol: "caduceus" }),
    L("rook", "Rook", "Castle up.", "minions", 3000, undefined, { symbol: "rook" }),
    L("knight", "Knight", "An L-shaped move.", "combo", 20, undefined, { symbol: "knight" }),
    L("king", "King", "Crowned.", "level", 20, undefined, { symbol: "king" }),
    L("queen", "Queen", "Rules the board.", "level", 40, undefined, { symbol: "queen" }),
    L("crownS", "Crown", "Heavy is the head.", "asc", 2, undefined, { symbol: "crown" }),
    L("scales", "Scales", "Balanced.", "trophies", 40, undefined, { symbol: "scales" }),
    L("blossom", "Blossom", "In full bloom.", "farming", 25, undefined, { symbol: "blossom" }),
    L("bloomS", "Flourish", "A garden in one glyph.", "farming", 40, undefined, { symbol: "bloom" }),
    L("spark8", "Glimmer", "Eight sharp rays.", "clicks", 50000, undefined, { symbol: "spark8" }),
    L("spark6", "Glitter", "Six clean rays.", "total", 1000000000.0, undefined, { symbol: "spark6" }),
    L("sunburst", "Corona", "Edge of the sun.", "rebirths", 18, undefined, { symbol: "sunburst" }),
    L("glint", "Gleam", "Catches the light.", "golden", 25, undefined, { symbol: "glint" }),
    L("shield", "Shield", "Hold the line.", "rebirths", 8, undefined, { symbol: "shield" }),
    L("target", "Reticle", "Lock on.", "crits", 6000, undefined, { symbol: "target" }),
    L("ring", "Ring", "One to rule them.", "asc", 3, undefined, { symbol: "ring" }),
    L("eye", "Eye", "It sees you.", "perfect", 15, undefined, { symbol: "eye" }),
    L("rune", "Rune", "Old letters.", "rolls", 60, undefined, { symbol: "rune" }),
    L("rune2", "Othala", "Heritage.", "codex", 30, undefined, { symbol: "rune2" }),
    L("rune3", "Algiz", "Protection.", "codex", 60, undefined, { symbol: "rune3" }),
    L("hex", "Hive", "Busy.", "harvests", 3000, undefined, { symbol: "hex" }),
    L("key", "Key", "Opens things.", "feats", 10, undefined, { symbol: "key" }),
    L("hourglass", "Hourglass", "Patience.", "hours", 100, undefined, { symbol: "hourglass" }),
    L("command", "Command", "Do the thing.", "feats", 25, undefined, { symbol: "command" }),
    L("ankh", "Ankh", "Life, again.", "asc", 5, undefined, { symbol: "ankh" }),
    L("maltese", "Maltese", "Knighted.", "asc", 4, undefined, { symbol: "maltese" }),
    L("spark5", "Pentastar", "Five-pointed spark.", "total", 1000000000000000.0, undefined, { symbol: "spark5" }),
    L("infinity", "Infinity", "Forever, give or take.", "frag", 50, undefined, { symbol: "infinity" }),
    L("skull", "Skull", "Crit crazy.", "crits", 20000, undefined, { symbol: "critDamage" }),
    L("sigil", "Sigil", "Mark of the Fractured.", "level", 80, undefined, { symbol: "trueDefense" }),
];

export const CATS: { id: Cat; label: string; list: LookDef[]; blurb: string }[] = [
    { id: "shape", label: "Shape", list: SHAPES, blurb: "The outline of your button." },
    { id: "skin", label: "Skin", list: SKINS, blurb: "What the button is made of." },
    { id: "burst", label: "Click FX", list: BURSTS, blurb: "What bursts out of every click." },
    { id: "crit", label: "Crit FX", list: CRITS, blurb: "What happens when you crit." },
    { id: "color", label: "Crit Color", list: COLORS, blurb: "The color of crit numbers and blasts." },
    { id: "nums", label: "Numbers", list: NUMS, blurb: "How the flying numbers look." },
    { id: "aura", label: "Aura", list: AURAS, blurb: "A constant glow around the button." },
    { id: "glyph", label: "Symbol", list: GLYPHS, blurb: "The icon on the button." },
];

export interface Looks {
    shape: string;
    skin: string;
    burst: string;
    crit: string;
    color: string;
    nums: string;
    aura: string;
    glyph: string;
}

/** A look category is a key of Looks, so `prefs[cat]` is the equipped id. */
export type Cat = keyof Looks;

export interface BtnPrefs extends Looks {
    hold: boolean; // hold to auto-click
    shake: boolean; // shake the button area on crits
    seen: string[]; // "cat:id" looks the player has already looked at (drives NEW badges)
    saved: (Looks | null)[]; // 3 loadout slots
    rb: number; // most rebirths ever reached: rebirths reset on ascension, looks must not relock
}

export const DEFAULT_LOOKS: Looks = { shape: "block", skin: "island", burst: "ripple", crit: "pulse", color: "sapphire", nums: "classic", aura: "none", glyph: "speed" };
export const LOADOUTS = 3;
export const DEFAULT_BTN: BtnPrefs = { ...DEFAULT_LOOKS, hold: true, shake: true, seen: [], saved: [null, null, null], rb: 0 };

export const listOf = (c: Cat) => CATS.find((x) => x.id === c)!.list;
export const isUnlocked = (s: State, l: LookDef) => !l.need || statValue(s, l.need.stat) >= l.need.n;
export const lookProgress = (s: State, l: LookDef) => (l.need ? Math.max(0, Math.min(1, statValue(s, l.need.stat) / l.need.n)) : 1);
const find = (list: LookDef[], id: string) => list.find((l) => l.id === id) ?? list[0];

function cleanLooks(raw: Partial<Looks> | null | undefined, s: State): Looks {
    const out = { ...DEFAULT_LOOKS };
    for (const c of CATS) {
        const l = c.list.find((x) => x.id === raw?.[c.id]);
        if (l && isUnlocked(s, l)) out[c.id] = l.id;
    }
    return out;
}

/** Coerce saved prefs to ids that exist and are unlocked. */
export function cleanBtn(raw: unknown, s: State): BtnPrefs {
    const r = (raw && typeof raw === "object" ? raw : {}) as Partial<BtnPrefs>;
    return {
        ...cleanLooks(r, s),
        hold: r.hold !== false,
        shake: r.shake !== false,
        rb: Math.max(Number(r.rb) || 0, s.rebirths),
        seen: Array.isArray(r.seen) ? r.seen.filter((x): x is string => typeof x === "string").slice(0, 400) : unlockedKeys(s),
        saved: Array.from({ length: LOADOUTS }, (_, i) => (r.saved?.[i] ? cleanLooks(r.saved[i], s) : null)),
    };
}

export const lookKey = (c: Cat, id: string) => `${c}:${id}`;

/** Every unlocked look as "cat:id". */
export function unlockedKeys(s: State): string[] {
    const out: string[] = [];
    for (const c of CATS) for (const l of c.list) if (isUnlocked(s, l)) out.push(lookKey(c.id, l.id));
    return out;
}
// derive() runs every tick and every click, so the collection count is
// recomputed at most once a second per state object.
const countCache = new WeakMap<State, { t: number; n: number }>();

/** Count of unlocked looks (each stat is computed once per pass). */
export function countUnlocked(s: State): number {
    const now = Date.now();
    const hit = countCache.get(s);
    if (hit && now - hit.t < 1000) return hit.n;
    const stats: Partial<Record<BtnStat, number>> = {};
    let n = 0;
    for (const c of CATS)
        for (const l of c.list) {
            if (!l.need || (stats[l.need.stat] ??= statValue(s, l.need.stat)) >= l.need.n) n++;
        }
    countCache.set(s, { t: now, n });
    return n;
}
export const totalLooks = () => CATS.reduce((a, c) => a + c.list.length, 0);

export const COLLECTION_PER_LOOK = 0.0025;

/** Bonus of the equipped functional looks, a complete-set bonus, and the collection bonus. */
export function btnBonus(s: State): Required<BtnBonus> {
    const out = { click: 0, crit: 0, critDmg: 0, hold: 0, xp: 0, bobber: 0, combo: 0, flow: 0 };
    const b = s.btn;
    const eq = [find(SHAPES, b.shape), find(SKINS, b.skin), find(BURSTS, b.burst), find(CRITS, b.crit), find(AURAS, b.aura)];
    for (const l of eq) {
        if (!isUnlocked(s, l) || !l.bonus) continue;
        for (const k of Object.keys(out) as (keyof BtnBonus)[]) out[k] += l.bonus[k] ?? 0;
    }
    const lists = [SHAPES, SKINS, BURSTS, CRITS, AURAS];
    if (eq.every((l, i) => l.id !== lists[i][0].id)) out.click += SET_BONUS;
    out.click += COLLECTION_PER_LOOK * countUnlocked(s);
    return out;
}

export const SET_BONUS = 0.05;

// ---- Best looks for value ----
// How much one point of each bonus is worth, in "percent of click income" terms.
// Click power counts fully; crit chance only matters through crit damage, held
// clicks and combo are worth a little, skill xp and bobber loot a little less.
const VALUE: Record<keyof BtnBonus, number> = { click: 1, crit: 0.6, critDmg: 0.15, hold: 0.08, xp: 0.2, bobber: 0.1, combo: 0.1, flow: 0.3 };
export const valueOf = (b?: BtnBonus) => (b ? (Object.keys(VALUE) as (keyof BtnBonus)[]).reduce((a, k) => a + (b[k] ?? 0) * VALUE[k], 0) : 0);

export const FUNCTIONAL: Cat[] = ["shape", "skin", "burst", "crit", "aura"];

/** The best unlocked look in each functional slot by value (the complete-set bonus needs none of them to be the default). Style slots are left alone. */
export function bestLooks(s: State): Looks {
    const out: Looks = { shape: s.btn.shape, skin: s.btn.skin, burst: s.btn.burst, crit: s.btn.crit, color: s.btn.color, nums: s.btn.nums, aura: s.btn.aura, glyph: s.btn.glyph };
    for (const c of FUNCTIONAL) {
        const list = listOf(c).filter((l) => isUnlocked(s, l));
        let best = list.find((l) => l.id === out[c]) ?? list[0];
        for (const l of list) if (valueOf(l.bonus) > valueOf(best.bonus) + 1e-9) best = l;
        out[c] = best.id;
    }
    return out;
}

export interface LookChange {
    cat: Cat;
    from: LookDef;
    to: LookDef;
}
/** What equipping the best looks would change. */
export function bestChanges(s: State): LookChange[] {
    const want = bestLooks(s);
    return FUNCTIONAL.filter((c) => want[c] !== s.btn[c]).map((c) => ({ cat: c, from: find(listOf(c), s.btn[c]), to: find(listOf(c), want[c]) }));
}

// ---- Holding ----
// Holding the button (or Space) clicks automatically at HOLD_BASE times the
// combo multiplier per second, up to HOLD_MAX (plus bonuses). See combo.ts.

export const HOLD_BASE = 3;
export const HOLD_MAX = 7;

export const holdMax = (s: State) => HOLD_MAX + btnBonus(s).hold;

export function bonusText(b: BtnBonus): string {
    const p: string[] = [];
    if (b.click) p.push(`+${+(b.click * 100).toFixed(1)}% click`);
    if (b.crit) p.push(`+${+(b.crit * 100).toFixed(1)}% crit chance`);
    if (b.critDmg) p.push(`+${Math.round(b.critDmg * 100)}% crit dmg`);
    if (b.hold) p.push(`+${b.hold} hold/s`);
    if (b.xp) p.push(`+${Math.round(b.xp * 100)}% skill xp`);
    if (b.bobber) p.push(`+${Math.round(b.bobber * 100)}% bobber loot`);
    if (b.combo) p.push(`+${b.combo} max combo`);
    if (b.flow) p.push(`+${Math.round(b.flow * 100)}% combo speed`);
    return p.join(", ");
}

/** Crit color id -> CSS color ("" follows the skin accent, rainbow cycles with `tick`). */
export function critColorOf(id: string, accent: string, tick: number): string {
    const l = find(COLORS, id);
    if (l.color === "rainbow") return `hsl(${(tick * 47) % 360} 100% 66%)`;
    return l.color || accent;
}

/** Crit color for this player's click (falls back to blue if the saved color is locked). */
export function critColor(s: State, accent: string, tick: number): string {
    const l = find(COLORS, s.btn.color);
    return critColorOf(isUnlocked(s, l) ? l.id : COLORS[0].id, accent, tick);
}

export function lookName(key: string): string {
    const [c, id] = key.split(":");
    const cat = CATS.find((x) => x.id === c);
    const l = cat?.list.find((x) => x.id === id);
    return l ? `${l.name} (${cat!.label})` : key;
}

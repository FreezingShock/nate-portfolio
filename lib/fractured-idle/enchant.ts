import type { McSymbolName } from "@/components/mc-symbol";
import { buffFx } from "./events";
import { skillLevel, type State } from "./data";
import { skillPerks } from "./skills";
import { mineFx } from "./mine";
import { farmFx } from "./farm";
import { journeyFx } from "./sagas";
import { upFx } from "./upfx";

// Enchanting: roll random enchants onto four things (the button, your minions,
// popup events and a universal tome), Terraria-reforge and Sol's-RNG style.
//
//  Roll      spend Arcane Dust for a brand new enchant: a random enchant of the
//            slot, a rarity (Common..Cosmic, luck and pity shift the odds), a
//            quality roll (75%-125% of its numbers) and, from Rare up, affixes.
//  Polish    re-roll only the quality of what you wear.
//  Reforge   re-roll only the affixes of what you wear.
// Every result lands as a *candidate*: compare it with what you wear, then
// equip it or keep the old one (the loser is salvaged for a little dust).
// Everything you have ever rolled is recorded in the Codex, which pays
// permanent bonuses. The Enchanting skill opens slots, actions and cosmetics.
// All numbers live in the tables below; the UI is tab-enchant.tsx.

export type SlotId = "button" | "minions" | "events" | "tome";
export const SLOT_IDS: SlotId[] = ["button", "minions", "events", "tome"];

export type EStat =
    | "click" | "minion" | "all" | "crit" | "critDmg" | "comboMax" | "comboGain" | "bobber" | "xp" | "offline" | "col" | "cost"
    | "synergy" | "auto" | "petXp" | "evFreq" | "evLife" | "evPower" | "evGolden" | "evBobber" | "evPay" | "qteSize" | "qteTime"
    | "curse" | "luck" | "dust" | "tokens" | "evDust" | "bolt" | "midas" | "echo" | "chain"
    | "ore" | "drill" | "forge" | "crop" | "grow" | "goldCrop" | "sale" | "cook";

export type EnchFx = Record<EStat, number>;
export const STAT_IDS: EStat[] = [
    "click", "minion", "all", "crit", "critDmg", "comboMax", "comboGain", "bobber", "xp", "offline", "col", "cost",
    "synergy", "auto", "petXp", "evFreq", "evLife", "evPower", "evGolden", "evBobber", "evPay", "qteSize", "qteTime",
    "curse", "luck", "dust", "tokens", "evDust", "bolt", "midas", "echo", "chain",
    "ore", "drill", "forge", "crop", "grow", "goldCrop", "sale", "cook",
];
export const zeroFx = (): EnchFx => Object.fromEntries(STAT_IDS.map((k) => [k, 0])) as EnchFx;

type Fmt = "pct" | "flat" | "chance" | "sec" | "dust" | "auto";
export const STAT_META: Record<EStat, { label: string; fmt: Fmt }> = {
    click: { label: "click power", fmt: "pct" },
    minion: { label: "minion output", fmt: "pct" },
    all: { label: "all shards", fmt: "pct" },
    crit: { label: "crit chance", fmt: "pct" },
    critDmg: { label: "crit damage", fmt: "pct" },
    comboMax: { label: "max combo", fmt: "flat" },
    comboGain: { label: "combo build speed", fmt: "pct" },
    bobber: { label: "bobber rewards", fmt: "pct" },
    xp: { label: "skill xp", fmt: "pct" },
    offline: { label: "offline earnings", fmt: "pct" },
    col: { label: "collection speed", fmt: "pct" },
    cost: { label: "minion prices", fmt: "pct" },
    synergy: { label: "click from minions", fmt: "pct" },
    auto: { label: "auto clicks per second", fmt: "auto" },
    petXp: { label: "pet experience", fmt: "pct" },
    evFreq: { label: "popup frequency", fmt: "pct" },
    evLife: { label: "popup duration", fmt: "pct" },
    evPower: { label: "boon strength", fmt: "pct" },
    evGolden: { label: "golden shard odds", fmt: "pct" },
    evBobber: { label: "bobber odds", fmt: "pct" },
    evPay: { label: "popup payouts", fmt: "pct" },
    qteSize: { label: "quick time sweet spot", fmt: "pct" },
    qteTime: { label: "quick time seconds", fmt: "sec" },
    curse: { label: "curse resistance", fmt: "pct" },
    luck: { label: "enchant luck", fmt: "pct" },
    dust: { label: "arcane dust", fmt: "pct" },
    tokens: { label: "rebirth tokens", fmt: "pct" },
    evDust: { label: "dust per popup", fmt: "dust" },
    bolt: { label: "Lightning chance per click", fmt: "chance" },
    midas: { label: "Midas chance per click", fmt: "chance" },
    echo: { label: "Echo chance per click", fmt: "chance" },
    chain: { label: "chain-popup chance", fmt: "chance" },
    ore: { label: "ore from mining", fmt: "pct" },
    drill: { label: "drill swing speed", fmt: "pct" },
    forge: { label: "forge speed", fmt: "pct" },
    crop: { label: "crops per harvest", fmt: "pct" },
    grow: { label: "crop growth speed", fmt: "pct" },
    goldCrop: { label: "golden crop chance", fmt: "pct" },
    sale: { label: "crop sale price", fmt: "pct" },
    cook: { label: "cooking speed", fmt: "pct" },
};

const trim = (n: number, d: number) => n.toFixed(d).replace(/\.?0+$/, "");

export function fmtStat(stat: EStat, v: number): string {
    const m = STAT_META[stat];
    switch (m.fmt) {
        case "pct": return `${stat === "cost" ? "-" : "+"}${trim(v * 100, v >= 0.1 ? 1 : 2)}% ${m.label}`;
        case "flat": return `+${trim(v, 2)} ${m.label}`;
        case "chance": return `${trim(v * 100, 2)}% ${m.label.replace(" chance", "").replace(" per click", "")} chance`;
        case "sec": return `+${trim(v, 2)}s ${m.label.replace(" seconds", "")}`;
        case "dust": return `+${trim(v, 2)} ${m.label}`;
        case "auto": return `+${trim(v, 2)} ${m.label}`;
    }
}

// ---- Rarities ----

export interface RarityDef {
    id: string;
    name: string;
    color: string; // hex, so effects can build gradients from it
    w: number; // base weight
    m: number; // power multiplier
    affixes: number;
}

export const RARITIES: RarityDef[] = [
    { id: "common", name: "Common", color: "#c2c7d4", w: 600, m: 1, affixes: 0 },
    { id: "uncommon", name: "Uncommon", color: "#55ff7a", w: 250, m: 1.5, affixes: 0 },
    { id: "rare", name: "Rare", color: "#4d9dff", w: 100, m: 2.3, affixes: 1 },
    { id: "epic", name: "Epic", color: "#b366ff", w: 35, m: 3.4, affixes: 1 },
    { id: "legendary", name: "Legendary", color: "#ffb21f", w: 10, m: 5, affixes: 2 },
    { id: "mythic", name: "Mythic", color: "#ff55e6", w: 3, m: 7.5, affixes: 2 },
    { id: "divine", name: "Divine", color: "#5ff6ff", w: 0.8, m: 11, affixes: 3 },
    { id: "cosmic", name: "Cosmic", color: "#ffffff", w: 0.15, m: 16, affixes: 3 },
];
export const RARITY_N = RARITIES.length;
/** Rarity CSS color; Cosmic is painted as a rainbow by the UI. */
export const rarityColor = (r: number) => RARITIES[Math.max(0, Math.min(RARITY_N - 1, r))].color;

export const PITY_EPIC = 40; // a roll is guaranteed Epic or better every this many rolls
export const PITY_LEGEND = 200; // ... and Legendary or better every this many
export const FOCUS_CHANCE = 0.4;
export const FOCUS_COST = 1.5;

// ---- Enchants and affixes ----

export interface EnchDef {
    id: string;
    slot: SlotId;
    name: string;
    symbol: McSymbolName;
    color: string;
    blurb: string;
    lines: [EStat, number][]; // stat, value at Common x 100% quality
}

export interface AffixDef {
    id: string;
    slot: SlotId;
    name: string;
    stat: EStat;
    base: number;
}

const E = (id: string, slot: SlotId, name: string, symbol: McSymbolName, color: string, blurb: string, lines: [EStat, number][]): EnchDef => ({ id, slot, name, symbol, color, blurb, lines });

export const ENCHANTS: EnchDef[] = [
    // The Button
    E("sharp", "button", "Sharpness", "strength", "#ff6b5f", "Every click lands harder.", [["click", 0.12]]),
    E("keen", "button", "Keen Edge", "critChance", "#6fd0ff", "Finds the weak point.", [["crit", 0.012], ["critDmg", 0.08]]),
    E("fury", "button", "Fury", "critDamage", "#ff4d6d", "Crits that shake the screen.", [["critDmg", 0.2]]),
    E("haste", "button", "Haste", "attackSpeed", "#ffd23a", "The combo climbs faster and higher.", [["comboGain", 0.1], ["comboMax", 0.25]]),
    E("mom", "button", "Momentum", "speed", "#ff9a3a", "Hold on and it never stops building.", [["comboMax", 0.6]]),
    E("storm", "button", "Stormcaller", "heat", "#7fd4ff", "Clicks may call down lightning for huge damage.", [["bolt", 0.008], ["click", 0.03]]),
    E("midas", "button", "Midas Touch", "magicFind", "#ffd84a", "Clicks may turn to gold.", [["midas", 0.012], ["all", 0.01]]),
    E("echo", "button", "Echo", "arrow", "#c08bff", "Clicks may ring out again, six times over.", [["echo", 0.025]]),
    // Minion Core
    E("eff", "minions", "Efficiency", "forge", "#62e0a0", "Minions work cleaner.", [["minion", 0.08]]),
    E("over", "minions", "Overclock", "speed", "#ff7a4a", "Minions click for you.", [["auto", 0.15], ["minion", 0.03]]),
    E("vein", "minions", "Deep Veins", "defense", "#9ad0ff", "Collections fill faster.", [["col", 0.12]]),
    E("hag", "minions", "Haggler", "fortune", "#ffd23a", "Minions sell for less.", [["cost", 0.015]]),
    E("syn", "minions", "Symbiosis", "regen", "#62d65a", "Your minions power your clicks.", [["synergy", 0.003]]),
    E("mentor", "minions", "Mentorship", "wisdom", "#c48bff", "Pets and skills learn quicker.", [["petXp", 0.1], ["xp", 0.04]]),
    E("hearth", "minions", "Hearthstone", "night", "#ff9a5a", "They keep working while you sleep.", [["offline", 0.02], ["minion", 0.02]]),
    // Event Lens
    E("lure", "events", "Fortune's Lure", "fishing", "#5ff0e0", "Golden things find you.", [["evFreq", 0.1], ["evGolden", 0.12]]),
    E("mag", "events", "Magnetism", "portal", "#b48bff", "Popups linger and QTEs forgive.", [["evLife", 0.12], ["qteTime", 0.15]]),
    E("res", "events", "Resonance", "intelligence", "#6fb0ff", "Boons hit harder.", [["evPower", 0.1]]),
    E("ward", "events", "Wardstone", "trueDefense", "#9ae0ff", "Curses slide off.", [["curse", 0.04]]),
    E("flow", "events", "Overflow", "pristine", "#7dff7a", "Popups pay more.", [["evPay", 0.15]]),
    E("prospect", "events", "Prospector", "petLuck", "#ffd7ff", "Popups shed Arcane Dust.", [["evDust", 0.35]]),
    E("chain", "events", "Chain Reaction", "comet", "#ff8ad8", "Catching a popup may spark another.", [["chain", 0.05]]),
    E("seer", "events", "Seer's Eye", "flag", "#ffb84d", "See the sweet spot and the bobbers.", [["qteSize", 0.1], ["evBobber", 0.08]]),
    // Fractured Tome
    E("pros", "tome", "Prosperity", "fortune", "#ffd23a", "Everything pays a little more.", [["all", 0.06]]),
    E("wis", "tome", "Wisdom", "wisdom", "#7ab8ff", "Skills gain xp faster.", [["xp", 0.1]]),
    E("fort", "tome", "Fortune", "petLuck", "#55ff9a", "Luck favors your next roll.", [["luck", 0.06]]),
    E("tide", "tome", "Dust Tides", "night", "#d99bff", "Arcane Dust pours in.", [["dust", 0.08]]),
    E("time", "tome", "Timeless", "attackSpeed", "#ffa94d", "Longer offline earnings.", [["offline", 0.03]]),
    E("bank", "tome", "Tokenmaker", "pristine", "#b8ffea", "Rebirths pay more tokens.", [["tokens", 0.05]]),
    E("reach", "tome", "Reach", "fishing", "#4dd8ff", "Treasure and bobbers.", [["bobber", 0.12], ["evBobber", 0.05]]),
    E("trinity", "tome", "Trinity", "intelligence", "#ff8bf0", "A little of everything.", [["all", 0.02], ["click", 0.02], ["minion", 0.02]]),
];
export const ENCH_BY_ID: Record<string, EnchDef> = Object.fromEntries(ENCHANTS.map((e) => [e.id, e]));
export const enchOf = (slot: SlotId) => ENCHANTS.filter((e) => e.slot === slot);

const A = (id: string, slot: SlotId, name: string, stat: EStat, base: number): AffixDef => ({ id, slot, name, stat, base });
export const AFFIXES: AffixDef[] = [
    A("swift", "button", "Swift", "comboGain", 0.05), A("brutal", "button", "Brutal", "critDmg", 0.08), A("precise", "button", "Precise", "crit", 0.006),
    A("heavy", "button", "Heavy", "click", 0.05), A("rally", "button", "Rallying", "comboMax", 0.3), A("lucky", "button", "Lucky", "luck", 0.02),
    A("indus", "minions", "Industrious", "minion", 0.04), A("thrifty", "minions", "Thrifty", "cost", 0.008), A("prolific", "minions", "Prolific", "col", 0.05),
    A("tireless", "minions", "Tireless", "offline", 0.01), A("wise", "minions", "Wise", "petXp", 0.05), A("linked", "minions", "Linked", "synergy", 0.0015),
    A("patient", "events", "Patient", "evLife", 0.05), A("bright", "events", "Bright", "evGolden", 0.06), A("hearty", "events", "Hearty", "evPay", 0.06),
    A("steady", "events", "Steadfast", "curse", 0.02), A("quick", "events", "Nimble", "qteTime", 0.08), A("plenty", "events", "Plentiful", "evDust", 0.15),
    A("golden", "tome", "Golden", "all", 0.025), A("learned", "tome", "Learned", "xp", 0.05), A("blessed", "tome", "Blessed", "luck", 0.03),
    A("enduring", "tome", "Enduring", "offline", 0.015), A("dusty", "tome", "Dusty", "dust", 0.04), A("bounty", "tome", "Bountiful", "tokens", 0.03),
];
export const AFFIX_BY_ID: Record<string, AffixDef> = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));
export const affixOf = (slot: SlotId) => AFFIXES.filter((a) => a.slot === slot);

export interface ProcDef {
    id: "bolt" | "midas" | "echo";
    name: string;
    mult: number; // payout as a multiple of the click that triggered it
    color: string;
}
export const PROCS: ProcDef[] = [
    { id: "bolt", name: "Lightning", mult: 18, color: "#7fd4ff" },
    { id: "midas", name: "Midas Touch", mult: 12, color: "#ffd84a" },
    { id: "echo", name: "Echo", mult: 6, color: "#c08bff" },
];

// ---- Slots ----

export interface SlotDef {
    id: SlotId;
    name: string;
    blurb: string;
    color: string;
    symbol: McSymbolName;
    need: number; // Enchanting level that opens it
    cost: number; // dust per roll
}
export const SLOTS: SlotDef[] = [
    { id: "button", name: "The Button", blurb: "Clicks, crits and combo", color: "var(--mc-aqua)", symbol: "speed", need: 0, cost: 15 },
    { id: "minions", name: "Minion Core", blurb: "Everything your minions do", color: "var(--mc-green)", symbol: "forge", need: 5, cost: 22 },
    { id: "events", name: "Event Lens", blurb: "Popups, quick time events, boons", color: "var(--mc-light-purple)", symbol: "portal", need: 10, cost: 30 },
    { id: "tome", name: "Fractured Tome", blurb: "Shards, skills, luck and dust", color: "var(--mc-gold)", symbol: "wisdom", need: 20, cost: 42 },
];
export const SLOT_BY_ID: Record<SlotId, SlotDef> = Object.fromEntries(SLOTS.map((x) => [x.id, x])) as Record<SlotId, SlotDef>;

/** Enchanting levels that open the actions. */
export const NEED = { polish: 3, reforge: 8, focus: 15, auto: 18 };

// ---- Cosmetics (personalization) ----

export interface CosDef {
    id: string;
    name: string;
    blurb: string;
    need: number; // Enchanting level
}
export const GLINTS: CosDef[] = [
    { id: "none", name: "Off", blurb: "Keep the button plain.", need: 0 },
    { id: "shimmer", name: "Shimmer", blurb: "A slow enchanted sweep across the face.", need: 0 },
    { id: "sparkle", name: "Sparkle", blurb: "Stars twinkling over the button.", need: 4 },
    { id: "orbit", name: "Orbit", blurb: "Motes circling the button.", need: 9 },
    { id: "runes", name: "Runes", blurb: "An arcane ring of runes.", need: 14 },
    { id: "flame", name: "Halo Flame", blurb: "A burning halo behind it.", need: 22 },
    { id: "prism", name: "Prism", blurb: "Spinning prismatic facets.", need: 30 },
    { id: "void", name: "Void Crown", blurb: "Dark rays tearing out of the button.", need: 40 },
];
export const TABLES: CosDef[] = [
    { id: "arcane", name: "Arcane", blurb: "Violet runes on dark stone.", need: 0 },
    { id: "ender", name: "Ender", blurb: "Teal portal light.", need: 6 },
    { id: "nether", name: "Nether", blurb: "Smoldering red forge.", need: 12 },
    { id: "crystal", name: "Crystal", blurb: "Cold cyan prisms.", need: 20 },
    { id: "void", name: "Void", blurb: "Pure black, pure light.", need: 35 },
    { id: "prism", name: "Prismatic", blurb: "Every color at once.", need: 50 },
];
export const GCOLORS: (CosDef & { color: string })[] = [
    { id: "auto", name: "Rarity", blurb: "Matches your best button enchant.", need: 0, color: "" },
    { id: "white", name: "White", blurb: "", need: 0, color: "#ffffff" },
    { id: "gold", name: "Gold", blurb: "", need: 2, color: "#ffc93a" },
    { id: "rose", name: "Rose", blurb: "", need: 7, color: "#ff6fb1" },
    { id: "jade", name: "Jade", blurb: "", need: 11, color: "#4dffb0" },
    { id: "azure", name: "Azure", blurb: "", need: 16, color: "#4da8ff" },
    { id: "violet", name: "Violet", blurb: "", need: 21, color: "#b36bff" },
    { id: "rainbow", name: "Rainbow", blurb: "Cycles every hue.", need: 25, color: "rainbow" },
];
export const ANIMS = [
    { id: "full", name: "Full show", blurb: "The whole ritual, every time." },
    { id: "quick", name: "Quick", blurb: "Short reveals; big pulls still get the show." },
    { id: "off", name: "Instant", blurb: "Skip the animation, keep the banner." },
];

// ---- State ----

export interface Ench {
    id: string;
    r: number; // rarity index
    q: number; // quality 0..1
    x: [string, number][]; // affix id, quality
}
export type EnchKind = "roll" | "polish" | "reforge";
export interface Cand extends Ench {
    kind: EnchKind;
}

export interface EnchOpts {
    anim: "full" | "quick" | "off";
    glint: string;
    gcol: string;
    table: string;
    stop: number; // auto-roll stops at this rarity index or better
    better: boolean; // auto-equip results that beat what you wear (auto-roll)
    smart: boolean; // manual rolls settle themselves: a better result is worn, a worse one salvaged (with a Review button)
    sound: boolean; // reserved, currently unused
}

export interface EnchState {
    dust: number;
    earned: number; // lifetime dust
    eq: Partial<Record<SlotId, Ench>>;
    pend: Partial<Record<SlotId, Cand>>;
    focus: Partial<Record<SlotId, string>>;
    rolls: number;
    polishes: number;
    byR: number[]; // rolls by rarity
    pe: number; // rolls since Epic+
    pl: number; // rolls since Legendary+
    codex: Record<string, number>; // enchant id -> bit mask of rarities found
    recent: { id: string; r: number; slot: SlotId; at: number }[];
    opts: EnchOpts;
}

export const DEFAULT_OPTS: EnchOpts = { anim: "full", glint: "shimmer", gcol: "auto", table: "arcane", stop: 4, better: true, smart: true, sound: false };
export const newEnc = (): EnchState => ({
    dust: 12,
    earned: 12,
    eq: {},
    pend: {},
    focus: {},
    rolls: 0,
    polishes: 0,
    byR: RARITIES.map(() => 0),
    pe: 0,
    pl: 0,
    codex: {},
    recent: [],
    opts: { ...DEFAULT_OPTS },
});

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function cleanEnch(raw: unknown): Ench | null {
    const o = raw as { id?: unknown; r?: unknown; q?: unknown; x?: unknown } | null;
    if (!o || typeof o.id !== "string" || !ENCH_BY_ID[o.id]) return null;
    const r = Math.max(0, Math.min(RARITY_N - 1, Math.floor(num(o.r))));
    const x = (Array.isArray(o.x) ? o.x : [])
        .filter((a): a is [string, number] => Array.isArray(a) && typeof a[0] === "string" && !!AFFIX_BY_ID[a[0]])
        .map((a) => [a[0], Math.max(0, Math.min(1, num(a[1])))] as [string, number])
        .slice(0, RARITIES[r].affixes);
    return { id: o.id, r, q: Math.max(0, Math.min(1, num(o.q))), x };
}

export function cleanEnc(raw: unknown): EnchState {
    const base = newEnc();
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const out: EnchState = { ...base };
    out.dust = Math.max(0, num(o.dust, base.dust));
    out.earned = Math.max(out.dust, num(o.earned, base.earned));
    out.rolls = Math.max(0, Math.floor(num(o.rolls)));
    out.polishes = Math.max(0, Math.floor(num(o.polishes)));
    out.pe = Math.max(0, Math.floor(num(o.pe)));
    out.pl = Math.max(0, Math.floor(num(o.pl)));
    out.byR = RARITIES.map((_, i) => Math.max(0, Math.floor(num((o.byR as unknown[] | undefined)?.[i]))));
    for (const slot of SLOT_IDS) {
        const e = cleanEnch((o.eq as Record<string, unknown> | undefined)?.[slot]);
        if (e && ENCH_BY_ID[e.id].slot === slot) out.eq[slot] = e;
        const p = cleanEnch((o.pend as Record<string, unknown> | undefined)?.[slot]);
        if (p && ENCH_BY_ID[p.id].slot === slot) {
            const k = (o.pend as Record<string, { kind?: string }>)[slot]?.kind;
            out.pend[slot] = { ...p, kind: k === "polish" || k === "reforge" ? k : "roll" };
        }
        const f = (o.focus as Record<string, unknown> | undefined)?.[slot];
        if (typeof f === "string" && ENCH_BY_ID[f]?.slot === slot) out.focus[slot] = f;
    }
    out.codex = {};
    for (const [k, v] of Object.entries(o.codex && typeof o.codex === "object" ? (o.codex as Record<string, unknown>) : {})) {
        if (ENCH_BY_ID[k]) out.codex[k] = Math.max(0, Math.floor(num(v))) & ((1 << RARITY_N) - 1);
    }
    // Wearing something always counts as having found it.
    for (const e of Object.values(out.eq)) if (e) out.codex[e.id] = (out.codex[e.id] || 0) | (1 << e.r);
    out.recent = (Array.isArray(o.recent) ? o.recent : [])
        .filter((x: { id?: unknown; r?: unknown; slot?: unknown }) => typeof x?.id === "string" && ENCH_BY_ID[x.id] && SLOT_IDS.includes(x.slot as SlotId))
        .map((x: { id: string; r: number; slot: SlotId; at?: number }) => ({ id: x.id, r: Math.max(0, Math.min(RARITY_N - 1, Math.floor(num(x.r)))), slot: x.slot, at: num(x.at) }))
        .slice(-14);
    const po = (o.opts && typeof o.opts === "object" ? o.opts : {}) as Partial<EnchOpts>;
    out.opts = {
        anim: po.anim === "quick" || po.anim === "off" ? po.anim : "full",
        glint: GLINTS.some((g) => g.id === po.glint) ? (po.glint as string) : DEFAULT_OPTS.glint,
        gcol: GCOLORS.some((g) => g.id === po.gcol) ? (po.gcol as string) : DEFAULT_OPTS.gcol,
        table: TABLES.some((g) => g.id === po.table) ? (po.table as string) : DEFAULT_OPTS.table,
        stop: Math.max(0, Math.min(RARITY_N - 1, Math.floor(num(po.stop, DEFAULT_OPTS.stop)))),
        better: po.better !== false,
        smart: po.smart !== false,
        sound: false,
    };
    return out;
}

// ---- Levels, luck and numbers ----

export const enchLevel = (s: State) => skillLevel(s.enchanting, "enchanting");
export const slotOpen = (s: State, slot: SlotId) => enchLevel(s) >= SLOT_BY_ID[slot].need;
export const cosOpen = (s: State, c: CosDef) => enchLevel(s) >= c.need;

/** Base passive dust per second before multipliers. */
export const DUST_BASE = 0.07;
/** Chance per click of a Dust mote, and per crit. */
export const DUST_CLICK = 0.004;
export const DUST_CRIT = 0.02;

export const rollCost = (s: State, slot: SlotId) => Math.ceil(SLOT_BY_ID[slot].cost * (s.enc.focus[slot] ? FOCUS_COST : 1));
export const polishCost = (s: State, slot: SlotId) => Math.ceil(SLOT_BY_ID[slot].cost * 0.4);
export const reforgeCost = (s: State, slot: SlotId) => Math.ceil(SLOT_BY_ID[slot].cost * 0.7);

const codexBits = (mask: number) => {
    let n = 0;
    for (let i = 0; i < RARITY_N; i++) if (mask & (1 << i)) n++;
    return n;
};
export const codexCount = (s: State) => Object.values(s.enc.codex).reduce((a, m) => a + codexBits(m), 0);
export const CODEX_TOTAL = ENCHANTS.length * RARITY_N;
export const CODEX_ALL = 0.0012; // all shards per entry found
export const CODEX_MILES: { n: number; luck: number; dust: number }[] = [
    { n: 15, luck: 0.02, dust: 30 },
    { n: 40, luck: 0.03, dust: 80 },
    { n: 80, luck: 0.05, dust: 200 },
    { n: 130, luck: 0.08, dust: 450 },
    { n: 190, luck: 0.12, dust: 900 },
    { n: CODEX_TOTAL, luck: 0.2, dust: 2500 },
];
export const codexLuck = (n: number) => CODEX_MILES.reduce((a, m) => a + (n >= m.n ? m.luck : 0), 0);

export const scale = (r: number, q: number) => RARITIES[r].m * (0.75 + 0.5 * q);

/** Every stat line of an enchant, with the value it is worth. */
export function enchLines(e: Ench): { stat: EStat; value: number; affix?: string }[] {
    const def = ENCH_BY_ID[e.id];
    const out: { stat: EStat; value: number; affix?: string }[] = def.lines.map(([stat, base]) => ({ stat, value: base * scale(e.r, e.q) }));
    for (const [aid, aq] of e.x) {
        const a = AFFIX_BY_ID[aid];
        if (a) out.push({ stat: a.stat, value: a.base * Math.pow(RARITIES[e.r].m, 0.8) * (0.75 + 0.5 * aq), affix: a.name });
    }
    return out;
}

/** A single number for comparing two enchants of the same slot (auto-equip, salvage). */
export const enchScore = (e: Ench) => scale(e.r, e.q) * (1 + 0.12 * e.x.length);

/** Sum of everything: worn enchants, the Codex, and Skill milestone perks. */
export function allFx(s: State): EnchFx {
    const fx = zeroFx();
    for (const slot of SLOT_IDS) {
        const e = s.enc.eq[slot];
        if (!e) continue;
        for (const l of enchLines(e)) fx[l.stat] += l.value;
    }
    const n = codexCount(s);
    fx.all += CODEX_ALL * n;
    fx.luck += codexLuck(n);
    const pk = skillPerks(s);
    for (const k of STAT_IDS) fx[k] += pk[k] ?? 0;
    const mf = mineFx(s); // Mining: pickaxe tiers, ore collections and Deep Core / Ancient Power
    for (const k of STAT_IDS) fx[k] += mf[k] ?? 0;
    const ff = farmFx(s); // Farming: hoe tiers, crop collections, scarecrows and feats
    for (const k of STAT_IDS) fx[k] += ff[k] ?? 0;
    const uf = upFx(s); // Shard, token and gem upgrades that feed the whole game
    for (const k of STAT_IDS) fx[k] += uf[k] ?? 0;
    const jf = journeyFx(s); // The Level page: saga chapters, finales and level milestone perks
    for (const k of STAT_IDS) fx[k] += jf[k] ?? 0;
    return fx;
}

/** Overall enchant luck multiplier (rarity weights scale with luck^(index/7)). */
export function luckOf(s: State, fx: EnchFx = allFx(s)): number {
    return (1 + fx.luck) * (1 + 0.02 * enchLevel(s)) * buffFx(s).luck;
}

/** Dust multiplier. */
export function dustMult(s: State, fx: EnchFx = allFx(s)): number {
    return (1 + fx.dust) * (1 + 0.03 * enchLevel(s)) * buffFx(s).dust;
}

export function weightsAt(luck: number, min = 0): number[] {
    return RARITIES.map((r, i) => (i < min ? 0 : r.w * Math.pow(Math.max(1, luck), i / 7)));
}

/** "1 in N" for rarity `i` at the given luck (ignores pity). */
export function oddsOf(i: number, luck: number): number {
    const w = weightsAt(luck);
    return w.reduce((a, b) => a + b, 0) / w[i];
}

// ---- Rolling ----

type Rng = () => number;

function pickIndex(w: number[], rng: Rng): number {
    let r = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) {
        r -= w[i];
        if (r <= 0) return i;
    }
    return w.length - 1;
}

const qroll = (rng: Rng) => Math.round(rng() * 100) / 100;

function rollAffixes(slot: SlotId, r: number, rng: Rng): [string, number][] {
    const pool = affixOf(slot).slice();
    const out: [string, number][] = [];
    for (let i = 0; i < RARITIES[r].affixes && pool.length; i++) {
        const k = Math.floor(rng() * pool.length);
        out.push([pool[k].id, qroll(rng)]);
        pool.splice(k, 1);
    }
    return out;
}

export interface Blocker {
    ok: boolean;
    why?: string;
}

/** A strong candidate must be decided on before rolling again; a weak one is simply replaced. */
export function mustDecide(s: State, slot: SlotId): boolean {
    const p = s.enc.pend[slot];
    const cur = s.enc.eq[slot];
    return !!p && (p.r >= 4 || (p.r >= 3 && (!cur || enchScore(p) > enchScore(cur))));
}

export function canRoll(s: State, slot: SlotId): Blocker {
    if (!slotOpen(s, slot)) return { ok: false, why: `Needs Enchanting ${SLOT_BY_ID[slot].need}` };
    if (mustDecide(s, slot)) return { ok: false, why: "Equip or discard the candidate first" };
    if (s.enc.dust < rollCost(s, slot)) return { ok: false, why: "Not enough dust" };
    return { ok: true };
}

export function canPolish(s: State, slot: SlotId): Blocker {
    if (enchLevel(s) < NEED.polish) return { ok: false, why: `Polish opens at Enchanting ${NEED.polish}` };
    if (!s.enc.eq[slot]) return { ok: false, why: "Nothing worn here yet" };
    if (s.enc.pend[slot]) return { ok: false, why: "Decide on the candidate first" };
    if (s.enc.dust < polishCost(s, slot)) return { ok: false, why: "Not enough dust" };
    return { ok: true };
}

export function canReforge(s: State, slot: SlotId): Blocker {
    if (enchLevel(s) < NEED.reforge) return { ok: false, why: `Reforge opens at Enchanting ${NEED.reforge}` };
    const cur = s.enc.eq[slot];
    if (!cur) return { ok: false, why: "Nothing worn here yet" };
    if (RARITIES[cur.r].affixes < 1) return { ok: false, why: "Needs a Rare or better enchant" };
    if (s.enc.pend[slot]) return { ok: false, why: "Decide on the candidate first" };
    if (s.enc.dust < reforgeCost(s, slot)) return { ok: false, why: "Not enough dust" };
    return { ok: true };
}

export interface RollOut {
    slot: SlotId;
    cand: Cand;
    fresh: boolean; // first time this enchant at this rarity
    firstRarity: boolean; // first time reaching this rarity at all
    odds: number; // 1 in N at the luck used
    pity: boolean;
    xp: number;
}

const XP_BASE = 8;
const XP_GROWTH = 1.9;
/** Enchanting skill xp for an action. */
export const enchXp = (kind: EnchKind, r: number) => (kind === "roll" ? XP_BASE * Math.pow(XP_GROWTH, r) : kind === "polish" ? 3 : 5);

function note(s: State, slot: SlotId, id: string, r: number) {
    s.enc.recent.push({ id, r, slot, at: Date.now() });
    if (s.enc.recent.length > 14) s.enc.recent.shift();
}

/** Spend dust on a brand new enchant. The result waits in `enc.pend[slot]`. */
export function rollSlot(s: State, slot: SlotId, xpMult: number, rng: Rng = Math.random): RollOut | null {
    if (!canRoll(s, slot).ok) return null;
    const enc = s.enc;
    const prev = enc.pend[slot];
    if (prev) enc.dust += Math.floor(rollCost(s, slot) * 0.12); // a replaced weak candidate is salvaged
    enc.dust -= rollCost(s, slot);
    const luck = luckOf(s);
    let min = 0;
    let pity = false;
    if (enc.pl >= PITY_LEGEND - 1) {
        min = 4;
        pity = true;
    } else if (enc.pe >= PITY_EPIC - 1) {
        min = 3;
        pity = true;
    }
    const w = weightsAt(luck, min);
    const r = pickIndex(w, rng);
    const pool = enchOf(slot);
    const focus = enc.focus[slot];
    const def = focus && ENCH_BY_ID[focus] && rng() < FOCUS_CHANCE ? ENCH_BY_ID[focus] : pool[Math.floor(rng() * pool.length)];
    const cand: Cand = { id: def.id, r, q: qroll(rng), x: rollAffixes(slot, r, rng), kind: "roll" };
    enc.rolls += 1;
    enc.byR[r] += 1;
    enc.pe = r >= 3 ? 0 : enc.pe + 1;
    enc.pl = r >= 4 ? 0 : enc.pl + 1;
    const had = enc.codex[def.id] || 0;
    const fresh = !(had & (1 << r));
    const firstRarity = fresh && !Object.values(enc.codex).some((m) => m & (1 << r));
    enc.codex[def.id] = had | (1 << r);
    enc.pend[slot] = cand;
    note(s, slot, def.id, r);
    const xp = enchXp("roll", r) * xpMult;
    s.enchanting += xp;
    return { slot, cand, fresh, firstRarity, odds: oddsOf(r, luck), pity, xp };
}

/** Re-roll the quality of the worn enchant. */
export function polishSlot(s: State, slot: SlotId, xpMult: number, rng: Rng = Math.random): RollOut | null {
    if (!canPolish(s, slot).ok) return null;
    const cur = s.enc.eq[slot]!;
    s.enc.dust -= polishCost(s, slot);
    const cand: Cand = { id: cur.id, r: cur.r, q: qroll(rng), x: cur.x.map(([id]) => [id, qroll(rng)] as [string, number]), kind: "polish" };
    s.enc.pend[slot] = cand;
    s.enc.polishes += 1;
    const xp = enchXp("polish", cur.r) * xpMult;
    s.enchanting += xp;
    return { slot, cand, fresh: false, firstRarity: false, odds: 1, pity: false, xp };
}

/** Re-roll the affixes of the worn enchant (keeps the enchant, rarity and quality). */
export function reforgeSlot(s: State, slot: SlotId, xpMult: number, rng: Rng = Math.random): RollOut | null {
    if (!canReforge(s, slot).ok) return null;
    const cur = s.enc.eq[slot]!;
    s.enc.dust -= reforgeCost(s, slot);
    const cand: Cand = { id: cur.id, r: cur.r, q: cur.q, x: rollAffixes(slot, cur.r, rng), kind: "reforge" };
    s.enc.pend[slot] = cand;
    s.enc.polishes += 1;
    const xp = enchXp("reforge", cur.r) * xpMult;
    s.enchanting += xp;
    return { slot, cand, fresh: false, firstRarity: false, odds: 1, pity: false, xp };
}

/** Dust an enchant is worth when it is replaced. */
export const salvageValue = (slot: SlotId, e: Ench) => Math.max(1, Math.round(SLOT_BY_ID[slot].cost * 0.2 * Math.pow(RARITIES[e.r].m, 0.7)));

/** Wear the candidate. The old enchant is salvaged (a polish or reforge replaces the same item, so nothing is lost). */
export function equipCand(s: State, slot: SlotId): number {
    const p = s.enc.pend[slot];
    if (!p) return 0;
    const old = s.enc.eq[slot];
    let back = 0;
    if (old && p.kind === "roll") {
        back = salvageValue(slot, old);
        s.enc.dust += back;
        s.enc.earned += back;
    }
    s.enc.eq[slot] = { id: p.id, r: p.r, q: p.q, x: p.x };
    delete s.enc.pend[slot];
    return back;
}

/** Keep what you wear; the candidate is salvaged. */
export function discardCand(s: State, slot: SlotId): number {
    const p = s.enc.pend[slot];
    if (!p) return 0;
    const back = p.kind === "roll" ? salvageValue(slot, p) : Math.floor((p.kind === "polish" ? polishCost(s, slot) : reforgeCost(s, slot)) * 0.25);
    s.enc.dust += back;
    s.enc.earned += back;
    delete s.enc.pend[slot];
    return back;
}

export function setFocus(s: State, slot: SlotId, id: string): boolean {
    if (enchLevel(s) < NEED.focus) return false;
    if (id && ENCH_BY_ID[id]?.slot !== slot) return false;
    if (id) s.enc.focus[slot] = id;
    else delete s.enc.focus[slot];
    return true;
}

/** Add dust from any source (already multiplied by the caller if it should be). */
export function addDust(s: State, n: number) {
    if (!(n > 0)) return;
    s.enc.dust += n;
    s.enc.earned += n;
}

/** Best rarity worn on the button, for the glint color. */
export function glintColor(s: State): string {
    const g = GCOLORS.find((c) => c.id === s.enc.opts.gcol);
    if (g && g.id !== "auto") return g.color;
    const e = s.enc.eq.button;
    return e ? rarityColor(e.r) : "#b98cff";
}

/** Highest rarity worn anywhere (drives glint intensity). */
export const topWorn = (s: State): number => SLOT_IDS.reduce((a, k) => Math.max(a, s.enc.eq[k]?.r ?? -1), -1);

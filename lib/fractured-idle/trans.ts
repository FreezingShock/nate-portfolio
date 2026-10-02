import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "./data";
import type { EStat } from "./enchant";
import { GEM_UPS, TOKEN_UPS, type PrestigeCat } from "./prestige";

// The third prestige layer, Transcendence, and the progression extras that go with it. Everything here is pure data
// and pure functions of the save (the engine does the actual resetting): Essence and its shop, Vows (a handicap you
// take on for a run in return for more Essence), lifetime milestone perks for rebirths and ascensions, and the family
// breakpoints on the token and gem shops.
//
// What Transcendence does: it resets everything an Ascension resets, plus your ascension count and unspent gems.
// It keeps every gem upgrade and every auto-buyer, so ascension progress is never erased.

// ---- Essence ----

export type EssBranch = "echoes" | "ascendant" | "eternal";

export const ESS_BRANCHES: { id: EssBranch; label: string; color: string; symbol: McSymbolName; blurb: string }[] = [
    { id: "echoes", label: "Echoes", color: "var(--mc-aqua)", symbol: "portal", blurb: "Climb faster: cheaper rebirths, a head start on ascensions and more kept through resets." },
    { id: "ascendant", label: "Ascendant", color: "var(--mc-gold)", symbol: "comet", blurb: "Hit harder: a bigger ascension boost, more gems and a lasting multiplier." },
    { id: "eternal", label: "Eternal", color: "var(--mc-light-purple)", symbol: "night", blurb: "Hands off: new auto-buyers, offline time and a second vow." },
];

export interface EssUp {
    id: string;
    name: string;
    desc: string;
    cost: number; // Essence
    growth: number;
    max: number;
    symbol: McSymbolName;
    branch: EssBranch;
    needs?: string;
    needsLvl?: number;
    /** A stat it feeds, per level (read by prestigeBonus). */
    fx?: [EStat, number];
}

export const ESS_UPS: EssUp[] = [
    // Echoes
    { id: "afterimage", name: "Afterimage", desc: "Begin each Transcendence at Ascension +1, per level", cost: 3, growth: 1.8, max: 6, symbol: "portal", branch: "echoes" },
    { id: "lean", name: "Lean Climb", desc: "Rebirths cost 8% less, per level", cost: 2, growth: 1.5, max: 8, symbol: "speed", branch: "echoes" },
    { id: "deepstack", name: "Deep Stack", desc: "+2 rebirths at once, per level", cost: 3, growth: 1.6, max: 5, symbol: "portal", branch: "echoes", needs: "lean", needsLvl: 2 },
    { id: "short", name: "Short Ascent", desc: "Ascension needs 1 fewer rebirth, per level", cost: 4, growth: 1.8, max: 4, symbol: "arrow", branch: "echoes", needs: "afterimage", needsLvl: 1 },
    { id: "memory", name: "Kept Memory", desc: "Keep 5% of your minions through ascension, per level", cost: 2, growth: 1.5, max: 6, symbol: "forge", branch: "echoes" },
    // Ascendant
    { id: "prism", name: "Prism Core", desc: "+0.1 to the ascension multiplier base (x3), per level", cost: 5, growth: 1.7, max: 10, symbol: "comet", branch: "ascendant" },
    { id: "well", name: "Gem Wellspring", desc: "+10% gems from every ascension, per level", cost: 2, growth: 1.4, max: 10, symbol: "pristine", branch: "ascendant" },
    { id: "dividend", name: "Gem Dividend", desc: "+2 gems from every ascension, per level", cost: 3, growth: 1.5, max: 8, symbol: "gem", branch: "ascendant", needs: "well", needsLvl: 2 },
    { id: "resonance", name: "Resonance", desc: "+2% to all shards for every 10 ascensions you have ever done, per level", cost: 4, growth: 1.6, max: 10, symbol: "magicFind", branch: "ascendant" },
    { id: "keeper", name: "Keeper", desc: "Keep 10% more of your token upgrade levels through ascension, per level", cost: 3, growth: 1.6, max: 5, symbol: "check", branch: "ascendant" },
    // Eternal
    { id: "autoAsc", name: "Auto-Ascend", desc: "Ascends for you once the rebirth count you set is reached", cost: 10, growth: 1, max: 1, symbol: "attackSpeed", branch: "eternal" },
    { id: "gemSteward", name: "Gem Steward", desc: "Automatically spends gems on the best-value upgrade; each level is faster", cost: 8, growth: 1.8, max: 3, symbol: "magicFind", branch: "eternal" },
    { id: "dilation", name: "Time Dilation", desc: "+25% offline earnings, per level", cost: 2, growth: 1.5, max: 8, symbol: "night", branch: "eternal", fx: ["offline", 0.25] },
    { id: "twin", name: "Twin Vows", desc: "Take on a second vow each run", cost: 15, growth: 1, max: 1, symbol: "flag", branch: "eternal" },
];
export const ESS_BY_ID = Object.fromEntries(ESS_UPS.map((u) => [u.id, u])) as Record<string, EssUp>;

export const essPrice = (u: { cost: number; growth: number }, l: number) => Math.ceil(u.cost * Math.pow(u.growth, l));
export const eLv = (s: State, id: string) => s.eups[id] || 0;

export function essLocked(s: State, u: EssUp): string | null {
    if (!u.needs) return null;
    const need = u.needsLvl ?? 1;
    return eLv(s, u.needs) >= need ? null : `Needs ${ESS_BY_ID[u.needs]?.name ?? u.needs} ${need}`;
}

/** Buy one level of an Essence upgrade. */
export function buyEssence(s: State, id: string): boolean {
    const u = ESS_BY_ID[id];
    if (!u) return false;
    const l = eLv(s, id);
    if (l >= u.max || essLocked(s, u)) return false;
    const p = essPrice(u, l);
    if (s.ess < p) return false;
    s.ess -= p;
    s.eups[id] = l + 1;
    return true;
}

/** Seconds between the Gem Steward's purchases. */
export const gemStewardEvery = (lvl: number) => [10, 6, 3][Math.max(0, Math.min(2, lvl - 1))];

// ---- Vows ----

export interface Vow {
    id: string;
    name: string;
    desc: string;
    bonus: number; // +x to the Essence gain, multiplicative between vows
    color: string;
    symbol: McSymbolName;
}

export const VOWS: Vow[] = [
    { id: "poverty", name: "Vow of Poverty", desc: "You cannot buy shard upgrades this run.", bonus: 0.5, color: "var(--mc-gold)", symbol: "magicFind" },
    { id: "lone", name: "Vow of the Lone Hand", desc: "Minions earn 60% less this run.", bonus: 0.6, color: "var(--mc-red)", symbol: "strength" },
    { id: "haste", name: "Vow of Haste", desc: "Ascension needs 3 more rebirths this run.", bonus: 0.4, color: "var(--mc-aqua)", symbol: "speed" },
    { id: "scarcity", name: "Vow of Scarcity", desc: "Tokens and gems are 40% lower this run.", bonus: 0.4, color: "var(--mc-green)", symbol: "pristine" },
    { id: "silence", name: "Vow of Silence", desc: "Auto-buyers are switched off this run.", bonus: 0.3, color: "var(--mc-light-purple)", symbol: "night" },
];
export const VOW_BY_ID = Object.fromEntries(VOWS.map((v) => [v.id, v])) as Record<string, Vow>;

export const vowSlots = (s: State) => 1 + eLv(s, "twin");
export const hasVow = (s: State, id: string) => s.vow.includes(id);
export const vowMult = (ids: string[]) => ids.reduce((a, id) => a * (1 + (VOW_BY_ID[id]?.bonus ?? 0)), 1);

/** Choose or drop a vow for the NEXT run (taken when you Transcend). Returns false if there is no free slot. */
export function toggleVow(s: State, id: string): boolean {
    if (!VOW_BY_ID[id]) return false;
    if (s.vowNext.includes(id)) {
        s.vowNext = s.vowNext.filter((x) => x !== id);
        return true;
    }
    if (s.vowNext.length >= vowSlots(s)) return false;
    s.vowNext = [...s.vowNext, id];
    return true;
}

/** Give up the vows of this run: no handicap, and no Essence bonus for them. */
export function abandonVows(s: State): boolean {
    if (!s.vow.length) return false;
    s.vow = [];
    return true;
}

// ---- Transcendence ----

/** Ascension number you must have reached before you can Transcend. */
export const transReq = (s: State) => 10 + s.trans;
/** Reserved for future Essence boosts: today only vows change the gain. */
export const essMult = (_s: State) => 1;

/** Essence for Transcending at ascension `asc`. */
export const essFor = (s: State, asc: number) => Math.floor(Math.pow(Math.max(0, asc - 7), 1.4) * essMult(s) * vowMult(s.vow));

export function transPlan(s: State) {
    const req = transReq(s);
    const can = s.asc >= req;
    return { req, can, gain: can ? essFor(s, s.asc) : 0, next: essFor(s, Math.max(s.asc, req) + 1) };
}

/** The permanent boost from Transcending: x2 per Transcendence and +3% per Essence ever earned. */
export const transMult = (s: State) => Math.pow(2, s.trans) * (1 + 0.03 * s.essTotal);

// ---- Echoes and Ascendant effects used by the engine ----

export const leanMult = (s: State) => Math.pow(0.92, eLv(s, "lean"));
export const ascBase = (s: State, base: number) => base + 0.1 * eLv(s, "prism");
export const resonanceMult = (s: State) => 1 + 0.02 * eLv(s, "resonance") * Math.floor(s.ascEver / 10);

// ---- Milestones (earned once, kept forever) ----

export interface Milestone {
    at: number;
    name: string;
    desc: string;
    fx?: [EStat, number][];
    /** Fraction of your minions kept through a rebirth. */
    keep?: number;
    /** Fraction of your minions kept through an ascension. */
    ascKeep?: number;
    /** Extra rebirths at once. */
    cap?: number;
    /** Extra gems from ascending, as a fraction. */
    gems?: number;
}

export const RB_MILESTONES: Milestone[] = [
    { at: 3, name: "Muscle Memory", desc: "Rebirth keeps 5% of your minions.", keep: 0.05 },
    { at: 5, name: "Token Sense", desc: "+10% rebirth tokens.", fx: [["tokens", 0.1]] },
    { at: 10, name: "Double Take", desc: "Rebirth +1 level at once.", cap: 1 },
    { at: 15, name: "Rebirth Glow", desc: "+10% all shards.", fx: [["all", 0.1]] },
    { at: 25, name: "Deep Roots", desc: "Rebirth keeps another 5% of your minions.", keep: 0.05 },
    { at: 50, name: "Token Torrent", desc: "+25% rebirth tokens.", fx: [["tokens", 0.25]] },
];
export const ASC_MILESTONES: Milestone[] = [
    { at: 1, name: "Hindsight", desc: "The Prestige page shows gain per hour and when to reset." },
    { at: 2, name: "Afterglow", desc: "Ascension keeps 10% of your minions.", ascKeep: 0.1 },
    { at: 3, name: "Wider Stack", desc: "Rebirth +1 level at once.", cap: 1 },
    { at: 5, name: "Ascendant Glow", desc: "+10% all shards.", fx: [["all", 0.1]] },
    { at: 7, name: "Gem Sense", desc: "+15% gems from ascending.", gems: 0.15 },
    { at: 10, name: "Threshold", desc: "Transcendence is within reach.", fx: [["all", 0.15]] },
];

export interface Bonus {
    fx: Partial<Record<EStat, number>>;
    keep: number;
    ascKeep: number;
    cap: number;
    gems: number;
}

// ---- Families: bonus tiers for how many levels you hold in a kind of upgrade ----

export interface Tier {
    fx?: [EStat, number][];
    cap?: number;
    gems?: number;
}
export type Fam = { at: number[]; tiers: Tier[] };
export type FamCat = Exclude<PrestigeCat, "auto">;

export const TOKEN_FAMILIES: Record<FamCat, Fam> = {
    power: { at: [25, 60, 120], tiers: [{ fx: [["all", 0.08]] }, { fx: [["all", 0.12]] }, { fx: [["all", 0.2]] }] },
    economy: { at: [20, 50, 100], tiers: [{ fx: [["tokens", 0.1]] }, { fx: [["tokens", 0.15]] }, { fx: [["tokens", 0.25]] }] },
    prestige: { at: [15, 40, 80], tiers: [{ cap: 1 }, { cap: 1 }, { fx: [["all", 0.1]] }] },
    craft: { at: [20, 50, 100], tiers: [{ fx: [["ore", 0.1], ["crop", 0.1]] }, { fx: [["ore", 0.15], ["crop", 0.15]] }, { fx: [["ore", 0.25], ["crop", 0.25]] }] },
    utility: { at: [15, 40, 80], tiers: [{ fx: [["offline", 0.1]] }, { fx: [["offline", 0.15], ["evPay", 0.1]] }, { fx: [["offline", 0.25], ["evPay", 0.2]] }] },
};
export const GEM_FAMILIES: Record<FamCat, Fam> = {
    power: { at: [20, 50, 100], tiers: [{ fx: [["all", 0.15]] }, { fx: [["all", 0.25]] }, { fx: [["all", 0.4]] }] },
    economy: { at: [15, 40, 80], tiers: [{ fx: [["tokens", 0.15]] }, { fx: [["tokens", 0.25]] }, { gems: 0.15 }] },
    prestige: { at: [10, 25, 50], tiers: [{ gems: 0.1 }, { gems: 0.15 }, { fx: [["all", 0.2]] }] },
    craft: { at: [25, 60, 120], tiers: [{ fx: [["ore", 0.2], ["crop", 0.2]] }, { fx: [["ore", 0.3], ["crop", 0.3]] }, { fx: [["ore", 0.5], ["crop", 0.5]] }] },
    utility: { at: [20, 50, 100], tiers: [{ fx: [["offline", 0.2]] }, { fx: [["offline", 0.3], ["evPay", 0.15]] }, { fx: [["offline", 0.5], ["evPay", 0.3]] }] },
};
export const FAM_CATS: FamCat[] = ["power", "economy", "prestige", "craft", "utility"];

/** Total levels held in one family of upgrades. */
export const famLevel = (s: State, cur: "tokens" | "gems", cat: FamCat) => {
    const list = cur === "tokens" ? TOKEN_UPS : GEM_UPS;
    const levels = cur === "tokens" ? s.rups : s.aups;
    return list.reduce((a, u) => (u.cat === cat ? a + (levels[u.id] || 0) : a), 0);
};
/** How many of a family's tiers are open. */
export const famTier = (s: State, cur: "tokens" | "gems", cat: FamCat) => {
    const lv = famLevel(s, cur, cat);
    return (cur === "tokens" ? TOKEN_FAMILIES : GEM_FAMILIES)[cat].at.filter((n) => lv >= n).length;
};

/** Every bonus these milestones, families and Essence upgrades give on top of the shops themselves. */
export function prestigeBonus(s: State): Bonus {
    const out: Bonus = { fx: {}, keep: 0, ascKeep: 0, cap: 0, gems: 0 };
    const addFx = (list?: [EStat, number][]) => {
        for (const [k, v] of list ?? []) out.fx[k] = (out.fx[k] ?? 0) + v;
    };
    const take = (m: Milestone | Tier) => {
        addFx(m.fx);
        out.cap += m.cap ?? 0;
        out.gems += m.gems ?? 0;
        if ("keep" in m) out.keep += m.keep ?? 0;
        if ("ascKeep" in m) out.ascKeep += m.ascKeep ?? 0;
    };
    for (const m of RB_MILESTONES) if (s.pbest.rb >= m.at) take(m);
    for (const m of ASC_MILESTONES) if (s.ascEver >= m.at) take(m);
    for (const cat of FAM_CATS) {
        for (const cur of ["tokens", "gems"] as const) {
            const fam = (cur === "tokens" ? TOKEN_FAMILIES : GEM_FAMILIES)[cat];
            const lv = famLevel(s, cur, cat);
            fam.at.forEach((n, i) => lv >= n && take(fam.tiers[i]));
        }
    }
    for (const u of ESS_UPS) if (u.fx && s.eups[u.id]) addFx([[u.fx[0], u.fx[1] * s.eups[u.id]]]);
    return out;
}

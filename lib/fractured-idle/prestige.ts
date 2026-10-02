import { ASC_UPS, REBIRTH_UPS, type AscUpDef, type RebirthUpDef } from "./data";
import type { McSymbolName } from "@/components/mc-symbol";
import { fxText } from "./upfx";

// Everything the Rebirth and Ascension shops know about an upgrade beyond what the engine needs: which family it
// belongs to, how to print "what it does at level N" (so the shop can show old -> new), and a rough "worth" used
// to rank value. Pure data and pure functions (no engine imports), shared by the shops and the auto-buyers.
//
// Adding an upgrade: put its row in REBIRTH_UPS / ASC_UPS (data.ts), wire its effect in engine.ts, then add a line
// to CAT_OF, WORTH and EFF below.

export type Currency = "tokens" | "gems";
export type PrestigeCat = "power" | "economy" | "prestige" | "craft" | "utility" | "auto";

export const PRESTIGE_CATS: { id: PrestigeCat; label: string; color: string; symbol: McSymbolName; blurb: string }[] = [
    { id: "power", label: "Power", color: "var(--mc-gold)", symbol: "strength", blurb: "More shards: clicks, minions, crits and flat multipliers." },
    { id: "economy", label: "Economy", color: "var(--mc-green)", symbol: "fortune", blurb: "Cheaper prices, bigger payouts and better starts." },
    { id: "prestige", label: "Prestige", color: "var(--mc-light-purple)", symbol: "portal", blurb: "Make rebirths and ascensions themselves stronger." },
    { id: "craft", label: "Mine and Farm", color: "var(--mc-gold)", symbol: "pick", blurb: "Ore, drills, forges, crops, growth, golden harvests and the market." },
    { id: "utility", label: "Utility", color: "var(--mc-aqua)", symbol: "wisdom", blurb: "Combo, popups, pets, offline time and other conveniences." },
    { id: "auto", label: "Automation", color: "var(--mc-red)", symbol: "attackSpeed", blurb: "Auto-buyers that spend for you while you play or are away." },
];

const CAT_OF: Record<string, PrestigeCat> = {
    // tokens
    stack: "prestige", core: "prestige", keep: "prestige", heir: "prestige",
    magnet: "economy", bank: "economy", head: "economy", kit: "economy", disc: "economy",
    might: "power", engine: "power", luck: "power", fort: "power", surge: "power", swarm: "power", edge: "power",
    mom: "utility", omen: "utility", off: "utility",
    // gems
    cosmic: "power", union: "power", depth: "power", nova: "power",
    echo: "prestige", forge2: "prestige",
    well: "economy", nest: "economy", hoard: "economy",
    perch2: "utility", perch3: "utility", perch4: "utility", over: "utility", horizon: "utility", mentor: "utility",
    scholar: "utility", whisper: "utility", dustw: "utility", star: "utility",
    thumbs: "craft", savvy: "craft", seedl: "craft", hearth2: "craft", hotf: "craft", torque: "craft", veins: "craft", bounty: "craft", acres: "craft", loam: "craft", lode: "craft",
    tome: "utility", dusk: "utility", fate: "utility", vortex: "utility",
    harvg: "craft", age: "craft", broker: "craft", feast: "craft", coretap: "craft", spindle2: "craft", bellows2: "craft", estate: "craft", bedrock: "craft",
    auto2: "auto", autoMin: "auto", autoUp: "auto", autoTok: "auto", autoRb: "auto",
};

/** Rough share of total income one level adds. It only ranks upgrades against each other ("best value"). */
const WORTH: Record<string, number> = {
    stack: 0.12, core: 0.18, magnet: 0.05, might: 0.025, engine: 0.04, luck: 0.008, head: 0.02, kit: 0.015, keep: 0.03, mom: 0.012, omen: 0.006, disc: 0.03, off: 0.008,
    fort: 0.01, surge: 0.012, swarm: 0.016, edge: 0.01, bank: 0.004, heir: 0.008,
    cosmic: 0.25, echo: 0.1, well: 0.04, union: 0.2, depth: 0.12, auto2: 0.02, perch2: 0.3, perch3: 0.2, perch4: 0.15, nest: 0.02, over: 0.03, horizon: 0.02, mentor: 0.02,
    scholar: 0.02, whisper: 0.01, dustw: 0.01, star: 0.01, thumbs: 0.02, savvy: 0.02, seedl: 0.015, hearth2: 0.01, hotf: 0.012, torque: 0.015, veins: 0.025, bounty: 0.025,
    tome: 0.04, harvg: 0.05, age: 0.04, broker: 0.04, feast: 0.02, coretap: 0.05, spindle2: 0.04, bellows2: 0.02, dusk: 0.02, fate: 0.02, vortex: 0.02,
    nova: 0.03, forge2: 0.08, hoard: 0.03, autoMin: 0.1, autoUp: 0.08, autoTok: 0.06, autoRb: 0.1,
};

/** Seconds between an auto-buyer's purchases at a given level. */
export function autoEvery(kind: "min" | "up" | "tok" | "rb", lvl: number): number {
    if (kind === "rb") return 0.5;
    if (kind === "tok") return [12, 8, 5][Math.max(0, Math.min(2, lvl - 1))];
    return Math.max(1.5, (kind === "min" ? 6 : 8) / (1 + 0.5 * Math.max(0, lvl - 1)));
}

type Lv = (id: string) => number;
const n = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0$/, ""));
const num = (x: number) => (x >= 1e6 ? x.toExponential(1).replace("e+", "e") : Math.floor(x).toLocaleString());

/** What an upgrade does at level `l`, as a short phrase. `lv` reads other upgrade levels where they matter. */
const EFF: Record<string, (l: number, lv: Lv) => string> = {
    stack: (l) => `${1 + l} rebirths at once`,
    core: (l) => `x${(1.42 + 0.03 * l).toFixed(2)} per rebirth`,
    magnet: (l) => `+${25 * l}% tokens`,
    might: (l) => `+${5 * l}% click power`,
    engine: (l) => `+${5 * l}% minion output`,
    luck: (l) => `+${l}% crit chance`,
    head: (l) => (l ? `${num(500 * Math.pow(5, l))} start shards` : "no start shards"),
    kit: (l) => `${5 * l} Cobble + ${2 * l} Wheat`,
    keep: (l) => `${20 * l}% training kept`,
    mom: (l) => `+${n(0.5 * l)} max combo`,
    omen: (l) => `+${10 * l}% popups`,
    disc: (l) => `-${5 * l}% minion cost`,
    off: (l) => `+${10 * l}% offline`,
    fort: (l) => `+${l}% all shards`,
    surge: (l) => `+${2 * l}% click power`,
    swarm: (l) => `+${2 * l}% minion output`,
    edge: (l) => `+${3 * l}% crit damage`,
    bank: (l) => `+${10 * l}% tokens`,
    heir: (l, lv) => `${20 * lv("keep") + 2 * l}% training kept`,
    cosmic: (l) => `+${25 * l}% all shards`,
    echo: (l) => `start at rebirth ${l}`,
    well: (l) => `+${25 * l}% tokens`,
    union: (l) => `+${25 * l}% minion output`,
    depth: (l) => `+${30 * l}% collection speed`,
    auto2: (l) => `${3 * l} Auto-Clicker levels`,
    perch2: (l) => (l ? "2nd pet slot" : "locked"),
    perch3: (l) => (l ? "3rd pet slot" : "locked"),
    perch4: (l) => (l ? "4th pet slot" : "locked"),
    nest: (l) => `-${8 * l}% egg price`,
    over: (l) => `+${l} max combo, +${10 * l}% build`,
    horizon: (l) => `+${12 * l}% boons, +${10 * l}% popup life`,
    mentor: (l) => `+${30 * l}% pet XP`,
    nova: (l) => `+${3 * l}% all shards`,
    forge2: (l) => `+${(0.01 * l).toFixed(2)} rebirth base`,
    hoard: (l) => `+${5 * l}% gems`,
    autoMin: (l) => (l ? `buys every ${n(autoEvery("min", l))}s` : "off"),
    autoUp: (l) => (l ? `buys every ${n(autoEvery("up", l))}s` : "off"),
    autoTok: (l) => (l ? `spends every ${n(autoEvery("tok", l))}s` : "off"),
    autoRb: (l) => (l ? "unlocked" : "locked"),
};

export interface PrestigeUp {
    id: string;
    name: string;
    desc: string;
    cost: number;
    growth: number;
    max: number;
    symbol: McSymbolName;
    color: string;
    needs?: string;
    needsLvl?: number;
    cur: Currency;
    cat: PrestigeCat;
    worth: number;
    /** What it does at level `l` (short). */
    eff: (l: number, lv: Lv) => string;
}

const make = (u: RebirthUpDef | AscUpDef, cur: Currency): PrestigeUp => ({
    ...u,
    cur,
    cat: CAT_OF[u.id] ?? "utility",
    worth: WORTH[u.id] ?? 0.01,
    eff: EFF[u.id] ?? (u.fx ? (l: number) => fxText(u.fx![0], u.fx![1] * l) : () => u.desc),
});

export const TOKEN_UPS: PrestigeUp[] = REBIRTH_UPS.map((u) => make(u, "tokens"));
export const GEM_UPS: PrestigeUp[] = ASC_UPS.map((u) => make(u, "gems"));
export const upsFor = (cur: Currency) => (cur === "tokens" ? TOKEN_UPS : GEM_UPS);

export const levelsOf = (cur: Currency, s: { rups: Record<string, number>; aups: Record<string, number> }) => (cur === "tokens" ? s.rups : s.aups);

/** Price of the next level when you own `l`. */
export const priceAt = (u: { cost: number; growth: number }, l: number) => Math.ceil(u.cost * Math.pow(u.growth, l));

/** Is the prerequisite met? Returns null when buyable, otherwise a short reason. */
export function lockedBy(u: PrestigeUp, levels: Record<string, number>): string | null {
    if (!u.needs) return null;
    const need = u.needsLvl ?? 1;
    if ((levels[u.needs] || 0) >= need) return null;
    const other = [...TOKEN_UPS, ...GEM_UPS].find((x) => x.id === u.needs && x.cur === u.cur);
    return `Needs ${other?.name ?? u.needs} ${need}`;
}

/** How many levels `budget` buys, up to `want` (-1 = as many as possible) and the upgrade's max, and what that costs. */
export function bulkBuy(u: PrestigeUp, l: number, budget: number, want: number): { n: number; cost: number } {
    let n = 0;
    let cost = 0;
    const limit = want < 0 ? Infinity : want;
    while (l + n < u.max && n < limit) {
        const p = priceAt(u, l + n);
        if (cost + p > budget) break;
        cost += p;
        n++;
    }
    return { n, cost };
}

/** Value rating of the next level: worth per price. Higher is a better buy. */
export const valueOf = (u: PrestigeUp, l: number) => (l >= u.max ? 0 : u.worth / priceAt(u, l));

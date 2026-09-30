import type { McSymbolName } from "@/components/mc-symbol";
import type { Derived } from "./engine";
import type { State } from "./data";

// Popup events: things that appear around the button for a few seconds.
//   Orbs (click them):   Treasure Bobber, Golden Shard, Cracked Shard (risky).
//   Quick time events:   Precision Strike (timing), Rapid Fire (mash), Rune Code (sequence).
// Outcomes are short-term boons (seconds), long-term boons (minutes), the rare
// permanent Fracture Fragment, instant shard windfalls and, only from Cracked
// Shards, curses. Upgrades (Events group in the Upgrades tab, plus a rebirth
// and an ascension upgrade) change how often popups appear, how long they
// last, how strong boons are, how likely curses are and how forgiving QTEs are.
// The UI lives in components/games/fractured-idle/popups.tsx and qte.tsx.

export type PopupKind = "bobber" | "golden" | "cracked" | "timing" | "mash" | "rune";
export const QTE_KINDS: PopupKind[] = ["timing", "mash", "rune"];
export const isQte = (k: PopupKind) => QTE_KINDS.includes(k);

export interface PopupSpec {
    id: number;
    kind: PopupKind;
    x: number; // percent of the button column (orbs)
    y: number;
    life: number; // seconds
}

export interface ActiveBuff {
    id: string;
    left: number; // seconds remaining
    dur: number; // seconds when granted, for the countdown bar
    power: number; // boon strength (1 = base); for curses, the strength factor after resistance
}

export interface EventStats {
    caught: number; // popups resolved (orbs clicked, QTEs attempted)
    golden: number;
    qte: number;
    perfect: number; // perfect / flawless QTE results
    curses: number;
}

export const newEventStats = (): EventStats => ({ caught: 0, golden: 0, qte: 0, perfect: 0, curses: 0 });

// ---- Buffs ----

export interface BuffFx {
    click?: number; // multiplier
    minion?: number;
    all?: number;
    combo?: number; // combo build speed multiplier
    freq?: number; // popup frequency multiplier
    crit?: number; // added crit chance
    critDmg?: number; // added crit damage
    luck?: number; // enchant luck multiplier
    dust?: number; // Arcane Dust multiplier
}

export type BuffTerm = "short" | "long" | "curse";

export interface BuffDef {
    id: string;
    name: string;
    desc: string;
    term: BuffTerm;
    dur: number; // seconds at power 1
    color: string;
    symbol: McSymbolName;
    fx: BuffFx;
}

export const BUFFS: BuffDef[] = [
    // Short term (seconds)
    { id: "frenzy", name: "Frenzy", desc: "x7 all shards", term: "short", dur: 20, color: "var(--mc-gold)", symbol: "fortune", fx: { all: 7 } },
    { id: "storm", name: "Click Storm", desc: "x20 click power", term: "short", dur: 15, color: "var(--mc-red)", symbol: "strength", fx: { click: 20 } },
    { id: "rush", name: "Minion Rush", desc: "x3 minion output", term: "short", dur: 25, color: "var(--mc-green)", symbol: "forge", fx: { minion: 3 } },
    { id: "lucky", name: "Lucky Streak", desc: "+35% crit chance, +100% crit damage", term: "short", dur: 15, color: "var(--mc-blue)", symbol: "critChance", fx: { crit: 0.35, critDmg: 1 } },
    { id: "precision", name: "Precision", desc: "+25% crit chance, +50% crit damage", term: "short", dur: 15, color: "var(--mc-aqua)", symbol: "critDamage", fx: { crit: 0.25, critDmg: 0.5 } },
    { id: "overheat", name: "Overheat", desc: "x2.5 click power, x2 combo speed", term: "short", dur: 12, color: "var(--mc-red)", symbol: "heat", fx: { click: 2.5, combo: 2 } },
    { id: "dustfall", name: "Dust Storm", desc: "x3 Arcane Dust", term: "short", dur: 45, color: "var(--mc-light-purple)", symbol: "night", fx: { dust: 3 } },
    { id: "rune", name: "Rune Power", desc: "x2.5 combo speed, x1.5 all shards", term: "short", dur: 30, color: "var(--mc-light-purple)", symbol: "portal", fx: { combo: 2.5, all: 1.5 } },
    // Long term (minutes)
    { id: "wealth", name: "Blessing of Wealth", desc: "x1.25 all shards", term: "long", dur: 300, color: "var(--mc-yellow)", symbol: "magicFind", fx: { all: 1.25 } },
    { id: "clockwork", name: "Clockwork", desc: "x1.6 combo speed", term: "long", dur: 360, color: "var(--mc-gold)", symbol: "attackSpeed", fx: { combo: 1.6 } },
    { id: "fortune", name: "Fortune's Favor", desc: "x1.5 enchant luck", term: "long", dur: 240, color: "var(--mc-green)", symbol: "petLuck", fx: { luck: 1.5 } },
    { id: "beacon", name: "Beacon", desc: "x2 popup frequency", term: "long", dur: 300, color: "var(--mc-aqua)", symbol: "flag", fx: { freq: 2 } },
    // Curses (only from Cracked Shards)
    { id: "clumsy", name: "Clumsy Minions", desc: "x0.6 minion output", term: "curse", dur: 30, color: "var(--mc-red)", symbol: "forge", fx: { minion: 0.6 } },
    { id: "numb", name: "Numb Fingers", desc: "x0.4 click power, x0.5 combo speed", term: "curse", dur: 25, color: "var(--mc-red)", symbol: "strength", fx: { click: 0.4, combo: 0.5 } },
    { id: "tax", name: "Dark Tax", desc: "x0.75 all shards", term: "curse", dur: 20, color: "var(--mc-red)", symbol: "night", fx: { all: 0.75 } },
    { id: "jinx", name: "Jinx", desc: "x0.5 popup frequency", term: "curse", dur: 60, color: "var(--mc-red)", symbol: "night", fx: { freq: 0.5 } },
];

export const BUFF_BY_ID: Record<string, BuffDef> = Object.fromEntries(BUFFS.map((b) => [b.id, b]));

/** Product of everything active, plus the Fracture Fragment bonus. */
export function buffFx(s: State) {
    const out = { click: 1, minion: 1, all: 1 + fragBonus(s), combo: 1, freq: 1, crit: 0, critDmg: 0, luck: 1, dust: 1 };
    for (const b of s.buffs) {
        const d = BUFF_BY_ID[b.id];
        if (!d) continue;
        const m = (v: number | undefined) => Math.max(0.05, 1 + ((v ?? 1) - 1) * b.power);
        if (d.fx.click) out.click *= m(d.fx.click);
        if (d.fx.minion) out.minion *= m(d.fx.minion);
        if (d.fx.all) out.all *= m(d.fx.all);
        if (d.fx.combo) out.combo *= m(d.fx.combo);
        if (d.fx.freq) out.freq *= m(d.fx.freq);
        if (d.fx.luck) out.luck *= m(d.fx.luck);
        if (d.fx.dust) out.dust *= m(d.fx.dust);
        if (d.fx.crit) out.crit += d.fx.crit * b.power;
        if (d.fx.critDmg) out.critDmg += d.fx.critDmg * b.power;
    }
    return out;
}

export const FRAG_PER = 0.002;
export const FRAG_CAP = 500;
export const fragBonus = (s: State) => FRAG_PER * Math.min(FRAG_CAP, s.frag);

export function tickBuffs(s: State, dt: number) {
    if (!s.buffs.length) return;
    for (const b of s.buffs) b.left -= dt;
    if (s.buffs.some((b) => b.left <= 0)) s.buffs = s.buffs.filter((b) => b.left > 0);
}

export function grantBuff(s: State, id: string, power: number) {
    const def = BUFF_BY_ID[id];
    if (!def) return;
    // Stronger boons last a little longer too; weaker curses are shorter.
    const dur = def.dur * (def.term === "curse" ? power : 1 + (power - 1) * 0.6);
    const cur = s.buffs.find((b) => b.id === id);
    if (cur) {
        cur.left = Math.max(cur.left, dur);
        cur.dur = Math.max(cur.dur, cur.left);
        cur.power = Math.max(cur.power, power);
    } else s.buffs.push({ id, left: dur, dur, power });
}

// ---- Numbers ----

const SEC = 1;
/** One minute of income, or 80 clicks, whichever is more: the unit popup rewards are measured in. */
export const popupBase = (d: Derived) => Math.max(d.click * 80, d.cps * 60 * SEC) * d.evPay;

export const POPUP_LIFE: Record<PopupKind, number> = { bobber: 10, golden: 13, cracked: 10, timing: 9, mash: 10, rune: 12 };

export const popupLife = (k: PopupKind, d: Derived) => POPUP_LIFE[k] * d.evLife;

/** Seconds until the next popup, before speed-ups. */
export const nextPopupIn = (rng: () => number = Math.random) => 22 + rng() * 22;

const WEIGHTS = (d: Derived): [PopupKind, number][] => [
    ["bobber", 34 * d.evBobber],
    ["golden", 22 * d.evGolden],
    ["timing", 14],
    ["mash", 12],
    ["rune", 12],
    ["cracked", 2.4 * d.evCurseChance], // very rare, and upgrades make it rarer
];

export function rollKind(d: Derived, hasQte: boolean, rng: () => number = Math.random): PopupKind {
    const list = WEIGHTS(d).filter(([k]) => !(hasQte && isQte(k)));
    const total = list.reduce((a, [, w]) => a + w, 0);
    let r = rng() * total;
    for (const [k, w] of list) {
        r -= w;
        if (r <= 0) return k;
    }
    return "bobber";
}

// ---- Outcomes ----

export interface Outcome {
    title: string;
    sub: string;
    color: string;
    tone: "good" | "long" | "perm" | "bad" | "loot";
    shards: number; // net change (negative for a pickpocket)
    buff?: string;
}

const pick = <T extends { w: number }>(list: T[], rng: () => number): T => {
    let r = rng() * list.reduce((a, x) => a + x.w, 0);
    for (const x of list) {
        r -= x.w;
        if (r <= 0) return x;
    }
    return list[0];
};

const give = (s: State, amount: number) => {
    s.shards += amount;
    s.total += Math.max(0, amount);
};

const buffOutcome = (s: State, id: string, power: number, tone: Outcome["tone"]): Outcome => {
    const def = BUFF_BY_ID[id];
    grantBuff(s, id, power);
    const secs = s.buffs.find((b) => b.id === id)?.left ?? def.dur;
    return { title: def.name, sub: `${def.desc} for ${secs >= 90 ? `${Math.round(secs / 60)} min` : `${Math.round(secs)}s`}`, color: def.color, tone, shards: 0, buff: id };
};

type GoldenRow = { id: string; w: number; run: (s: State, d: Derived) => Outcome };

const GOLDEN: GoldenRow[] = [
    { id: "frenzy", w: 26, run: (s, d) => buffOutcome(s, "frenzy", d.evPower, "good") },
    { id: "storm", w: 20, run: (s, d) => buffOutcome(s, "storm", d.evPower, "good") },
    { id: "rush", w: 18, run: (s, d) => buffOutcome(s, "rush", d.evPower, "good") },
    { id: "lucky", w: 14, run: (s, d) => buffOutcome(s, "lucky", d.evPower, "good") },
    {
        id: "jackpot",
        w: 16,
        run: (s, d) => {
            const n = popupBase(d) * 10 * (1 + (d.evPower - 1) * 0.5);
            give(s, n);
            return { title: "Jackpot!", sub: "about 10 minutes of shards", color: "var(--mc-yellow)", tone: "loot", shards: n };
        },
    },
    { id: "wealth", w: 8, run: (s, d) => buffOutcome(s, "wealth", d.evPower, "long") },
    { id: "clockwork", w: 6, run: (s, d) => buffOutcome(s, "clockwork", d.evPower, "long") },
    { id: "beacon", w: 6, run: (s, d) => buffOutcome(s, "beacon", d.evPower, "long") },
    { id: "fortune", w: 5, run: (s, d) => buffOutcome(s, "fortune", d.evPower, "long") },
    { id: "dustfall", w: 7, run: (s, d) => buffOutcome(s, "dustfall", d.evPower, "good") },
    {
        id: "fragment",
        w: 3,
        run: (s) => {
            s.frag += 1;
            return { title: "Fracture Fragment", sub: `+${FRAG_PER * 100}% all shards, forever (${s.frag} found)`, color: "var(--mc-light-purple)", tone: "perm", shards: 0 };
        },
    },
    {
        id: "egg",
        w: 3,
        run: (s) => {
            s.freeEggs += 1;
            return { title: "Golden Egg!", sub: "a free Wooden Egg", color: "var(--mc-gold)", tone: "perm", shards: 0 };
        },
    },
];

/** Chance (percent) of each Golden Shard outcome, for tooltips. */
export const goldenOdds = () => {
    const tot = GOLDEN.reduce((a, r) => a + r.w, 0);
    return GOLDEN.map((r) => ({ id: r.id, pct: (r.w / tot) * 100 }));
};

export function resolveGolden(s: State, d: Derived, rng: () => number = Math.random): Outcome {
    s.evs.golden += 1;
    return pick(GOLDEN, rng).run(s, d);
}

const CURSES = [
    { w: 3, id: "clumsy" },
    { w: 3, id: "numb" },
    { w: 3, id: "tax" },
    { w: 2, id: "jinx" },
    { w: 2, id: "thief" },
];

export const CRACKED_WIN = 0.46;
/** Chance (percent) of each curse when a Cracked Shard goes wrong, for tooltips. */
export const curseOdds = () => {
    const tot = CURSES.reduce((a, r) => a + r.w, 0);
    return CURSES.map((r) => ({ id: r.id, pct: (r.w / tot) * 100 }));
};

/** Cracked Shard: a gamble. Roughly half the time it pays a big windfall, otherwise a curse. */
export function resolveCracked(s: State, d: Derived, rng: () => number = Math.random): Outcome {
    if (rng() < CRACKED_WIN) {
        const n = popupBase(d) * 25 * (1 + (d.evPower - 1) * 0.5);
        give(s, n);
        let sub = "the gamble paid off";
        if (rng() < 0.2) {
            s.frag += 1;
            sub += " and left a Fragment";
        }
        return { title: "Devil's Bargain", sub, color: "var(--mc-yellow)", tone: "loot", shards: n };
    }
    s.evs.curses += 1;
    const c = pick(CURSES, rng);
    const strength = Math.max(0.3, 1 - d.curseResist * 0.8); // resist shortens curses
    if (c.id === "thief") {
        const n = Math.min(s.shards * 0.02, popupBase(d) * 6);
        s.shards -= n;
        return { title: "Pickpocket", sub: "a few shards went missing", color: "var(--mc-red)", tone: "bad", shards: -n };
    }
    return buffOutcome(s, c.id, strength, "bad");
}

export function resolveBobber(s: State, d: Derived, fishingLevel: number, rng: () => number = Math.random): Outcome {
    const reward = Math.max(d.click * 40, d.cps * (30 + fishingLevel)) * d.bobberMult * d.evPay;
    give(s, reward);
    s.bobbers += 1;
    s.fishing += 30 * d.xpMult * d.xpSkill.fishing;
    if (rng() < 0.1) {
        s.freeEggs += 1;
        return { title: "Treasure!", sub: "shards and a Wooden Egg", color: "var(--mc-aqua)", tone: "loot", shards: reward };
    }
    return { title: "Treasure!", sub: "a haul of shards", color: "var(--mc-aqua)", tone: "loot", shards: reward };
}

// ---- Quick time events ----

export type Grade = "perfect" | "great" | "good" | "miss";

export const GRADE_LABEL: Record<PopupKind, Record<Grade, string>> = {
    timing: { perfect: "PERFECT!", great: "GREAT!", good: "Good", miss: "Miss" },
    mash: { perfect: "BLAZING!", great: "CLEAR!", good: "Close", miss: "Too slow" },
    rune: { perfect: "FLAWLESS!", great: "CLEAR!", good: "Sloppy", miss: "Failed" },
    bobber: { perfect: "", great: "", good: "", miss: "" },
    golden: { perfect: "", great: "", good: "", miss: "" },
    cracked: { perfect: "", great: "", good: "", miss: "" },
};

const GRADE_MULT: Record<Grade, number> = { perfect: 3, great: 2, good: 1, miss: 0 };

const QTE_NAME: Record<string, string> = { timing: "Precision Strike", mash: "Rapid Fire", rune: "Rune Code" };
const QTE_BUFF: Record<string, string> = { timing: "precision", mash: "overheat", rune: "rune" };

/** Pay out a finished quick time event. */
export function resolveQte(s: State, d: Derived, kind: PopupKind, grade: Grade, rng: () => number = Math.random): Outcome {
    const label = GRADE_LABEL[kind][grade];
    if (grade === "miss") return { title: label, sub: `${QTE_NAME[kind]} fizzled`, color: "var(--muted-foreground)", tone: "bad", shards: 0 };
    s.evs.caught += 1;
    s.evs.qte += 1;
    const mult = GRADE_MULT[grade] * (1 + 0.1 * d.qteRewardLvl) * (1 + (d.evPower - 1) * 0.5);
    const n = popupBase(d) * 6 * mult;
    give(s, n);
    let sub = `${QTE_NAME[kind]}: shards`;
    let color = "var(--mc-green)";
    let buff: string | undefined;
    if (grade === "perfect") {
        s.evs.perfect += 1;
        color = "var(--mc-gold)";
        buff = QTE_BUFF[kind];
        grantBuff(s, buff, d.evPower);
        sub += ` + ${BUFF_BY_ID[buff].name}`;
        if (rng() < 0.05) {
            s.frag += 1;
            sub += " + a Fragment";
        }
    }
    return { title: label, sub, color, tone: "good", shards: n, buff };
}

/** Count a popup the player caught (orbs). */
export const noteCaught = (s: State) => {
    s.evs.caught += 1;
};

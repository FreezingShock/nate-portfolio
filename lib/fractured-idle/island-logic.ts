import { skillLevel, type State } from "./data";
import { ISLANDS, ISLAND_BY_ID, MASTERY_AT, MASTERY_STEP, isSpecial, type IslandDef, type IslandStat, type SkillKey } from "./islands";

// Rules for islands (content is in islands.ts): what is unlocked, mastery, and
// the effects of the island you are standing on, which derive() folds in.

export function islandStat(s: State, stat: IslandStat): number {
    switch (stat) {
        case "bobbers": return s.bobbers;
        case "mining": return skillLevel(s.mining);
        case "farming": return skillLevel(s.farming);
        case "combat": return skillLevel(s.combat);
        case "pets": return Object.keys(s.pets).length;
        case "frag": return s.frag;
        case "bestCombo": return s.bestCombo;
        case "asc": return s.asc;
    }
}

export const islandOpen = (s: State, i: IslandDef) => (i.need ? islandStat(s, i.need.stat) >= i.need.n : s.total >= i.at);
export const openIslands = (s: State) => ISLANDS.filter((i) => islandOpen(s, i));

/** 0..1 toward unlocking (linear in whatever the requirement counts). */
export function islandProgress(s: State, i: IslandDef): number {
    if (islandOpen(s, i)) return 1;
    return i.need ? Math.min(1, islandStat(s, i.need.stat) / i.need.n) : Math.min(1, s.total / i.at);
}

/** The island you are on; falls back to the Hub if the saved one is not unlocked. */
export function activeIsland(s: State): IslandDef {
    const i = ISLAND_BY_ID[s.island];
    return i && islandOpen(s, i) ? i : ISLANDS[0];
}

/** Best main-path island you have unlocked; its tier bonus multiplies everything. */
export function tierMult(s: State): number {
    let m = 1;
    for (const i of ISLANDS) if (!isSpecial(i) && s.total >= i.at) m = Math.max(m, i.mult);
    return m;
}

export function masteryLevel(seconds: number): number {
    let l = 0;
    while (l < MASTERY_AT.length && seconds >= MASTERY_AT[l]) l++;
    return l;
}

export function masteryInfo(seconds: number) {
    const level = masteryLevel(seconds);
    const lo = level === 0 ? 0 : MASTERY_AT[level - 1];
    const hi = MASTERY_AT[level] ?? null;
    return { level, seconds, next: hi, frac: hi === null ? 1 : (seconds - lo) / (hi - lo), strength: 1 + MASTERY_STEP * level };
}

export interface IslandFx {
    minion: Record<string, number>; // per minion id
    col: Record<string, number>;
    minionAll: number;
    click: number;
    all: number;
    crit: number;
    critDmg: number;
    xp: Record<SkillKey, number>;
    eff: Record<SkillKey, number>;
    comboMax: number;
    comboGain: number;
    ev: { freq: number; life: number; power: number; golden: number; bobber: number; resist: number; qte: number };
    loot: number;
    petXp: number;
    offline: number;
    affinity: number; // click multiplier from matching button looks
    matches: number;
}

const blank = (): IslandFx => ({
    minion: {}, col: {}, minionAll: 1, click: 1, all: 1, crit: 0, critDmg: 0,
    xp: { mining: 1, farming: 1, combat: 1, fishing: 1 },
    eff: { mining: 1, farming: 1, combat: 1, fishing: 1 },
    comboMax: 0, comboGain: 1,
    ev: { freq: 1, life: 1, power: 1, golden: 1, bobber: 1, resist: 0, qte: 0 },
    loot: 1, petXp: 1, offline: 0, affinity: 1, matches: 0,
});

/** Effects of an island's perks, scaled by its mastery. Defaults to the island you are on. */
export function islandFx(s: State, island: IslandDef = activeIsland(s)): IslandFx {
    const k = masteryInfo(s.isec[island.id] || 0).strength;
    const sc = (m: number) => 1 + (m - 1) * k; // strengthen a multiplier's gain
    const fx = blank();
    let aff = 0;
    for (const p of island.perks) {
        switch (p.k) {
            case "minion": for (const id of p.ids) fx.minion[id] = (fx.minion[id] ?? 1) * sc(p.m); break;
            case "col": for (const id of p.ids) fx.col[id] = (fx.col[id] ?? 1) * sc(p.m); break;
            case "minionAll": fx.minionAll *= sc(p.m); break;
            case "click": fx.click *= sc(p.m); break;
            case "all": fx.all *= sc(p.m); break;
            case "crit": fx.crit += p.v * k; break;
            case "critDmg": fx.critDmg += p.v * k; break;
            case "xp": fx.xp[p.skill] *= sc(p.m); break;
            case "eff": fx.eff[p.skill] *= sc(p.m); break;
            case "combo":
                fx.comboMax += (p.max ?? 0) * k;
                if (p.gain) fx.comboGain *= sc(p.gain);
                break;
            case "ev":
                if (p.freq) fx.ev.freq *= sc(p.freq);
                if (p.life) fx.ev.life *= sc(p.life);
                if (p.power) fx.ev.power *= sc(p.power);
                if (p.golden) fx.ev.golden *= sc(p.golden);
                if (p.bobber) fx.ev.bobber *= sc(p.bobber);
                if (p.resist) fx.ev.resist += p.resist * k;
                if (p.qte) fx.ev.qte += p.qte * k;
                break;
            case "loot": fx.loot *= sc(p.m); break;
            case "petXp": fx.petXp *= sc(p.m); break;
            case "offline": fx.offline += p.v * k; break;
            case "affinity": aff += p.v * k; break;
        }
    }
    // Button looks that suit the island each add a little click power.
    const a = island.affinity;
    if (a && aff > 0) {
        const b = s.btn;
        const m = Number(!!a.shape?.includes(b.shape)) + Number(!!a.skin?.includes(b.skin)) + Number(!!a.burst?.includes(b.burst)) + Number(!!a.crit?.includes(b.crit)) + Number(!!a.aura?.includes(b.aura));
        fx.matches = m;
        fx.affinity = 1 + aff * m;
    }
    return fx;
}

/** Bonus for having set foot on islands (visited list). */
export const VISIT_BONUS = 0.005;
export const visitBonus = (s: State) => VISIT_BONUS * s.visited.length;

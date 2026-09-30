import { DEFAULT_BTN, btnBonus, cleanBtn } from "./button";
import {
    ASC_BASE,
    ASC_UPS,
    EGGS,
    ISLANDS,
    MILESTONES,
    MINIONS,
    MINION_COL,
    MINION_GROWTH,
    MINION_UPS_BY,
    PETS,
    PET_MAX,
    PET_PERK_AT,
    RARITIES,
    RARITY_ORDER,
    ascGain,
    ascReq,
    colTier,
    petLevel,
    petXpFor,
    type AscUpDef,
    type EggDef,
    type PetDef,
    type PetStat,
    type Rarity,
    REBIRTH_MILESTONES,
    REBIRTH_UPS,
    SKILL_CAP,
    TROPHIES,
    UPGRADES,
    rebirthCost,
    skillLevel,
    skillXpFor,
    type RewardStat,
    type State,
    type UpgradeDef,
} from "@/lib/fractured-idle/data";

export { SKILL_CAP, skillLevel, skillXpFor };

// Pure game logic: no React, no DOM. The UI keeps one State object in a ref,
// mutates it through these functions and re-renders on a timer, so a tick
// never allocates and never triggers a render on its own.

export const SAVE_KEY = "fractured-idle-v1";
const MAX_OFFLINE_S = 8 * 3600;

export function newState(): State {
    return {
        v: 1,
        shards: 0,
        total: 0,
        clicks: 0,
        rebirths: 0,
        tokens: 0,
        minions: MINIONS.map(() => 0),
        mcol: MINIONS.map(() => 0),
        ups: {},
        rups: {},
        mining: 0,
        farming: 0,
        combat: 0,
        fishing: 0,
        crits: 0,
        bobbers: 0,
        tro: {},
        peak: { minions: 0, types: 0 },
        playTime: 0,
        savedAt: Date.now(),
        island: "hub",
        sci: false,
        fx: true,
        buy: 1,
        orbit: true,
        toasts: true,
        asc: 0,
        ap: 0,
        aups: {},
        pets: {},
        equip: [],
        hatched: 0,
        freeEggs: 0,
        peakInc: 0,
        btn: { ...DEFAULT_BTN },
    };
}

// ---- Formatting ----

const SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

export function fmt(n: number, sci = false): string {
    if (!isFinite(n)) return "∞";
    if (n <= 0) return "0";
    if (n < 0.01) return "<0.01";
    if (n < 1000) {
        if (n >= 100) return Math.floor(n).toString();
        return n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "");
    }
    const e = Math.floor(Math.log10(n) / 3);
    if (sci || e >= SUFFIX.length) return n.toExponential(2).replace("e+", "e");
    const v = n / Math.pow(1000, e);
    return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)}${SUFFIX[e]}`;
}

export function fmtTime(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${Math.floor(s % 60)}s`;
    return `${Math.floor(s)}s`;
}

// ---- Derived values ----

export interface Derived {
    cps: number;
    click: number; // non-crit click value
    avgClick: number; // expected click value including crits
    critChance: number;
    critDmg: number;
    auto: number; // automatic clicks per second
    rMult: number;
    islandMult: number;
    achMult: number; // 1 + trophy "all" bonus
    xpMult: number;
    bobberMult: number;
    bonus: Record<RewardStat, number>;
    all: number;
    mining: number; // skill levels
    farming: number;
    combat: number;
    fishing: number;
    clickUp: number; // upgrade-only multipliers, for the stats page
    minionUp: number;
    allUp: number;
    synergy: number;
    minionCps: number[]; // per-minion shards/sec, for the shop
    mult: number[]; // per-minion multiplier (everything except count, base rate and milestones)
    upOwn: number[]; // per-minion multiplier from that minion's own upgrades
    colSpeed: number[]; // per-minion collection speed
    pet: PetBonus; // equipped pets + pet collection
    ascMult: number;
}

export type PetBonus = Record<PetStat, number>;

const PET_MAP = new Map(PETS.map((p) => [p.id, p]));
export const petOf = (id: string) => PET_MAP.get(id);
export const petSlots = (s: State) => 1 + (s.aups.perch2 ? 1 : 0) + (s.aups.perch3 ? 1 : 0);
export const ascMult = (s: State) => Math.pow(ASC_BASE, s.asc) * (1 + 0.25 * (s.aups.cosmic || 0));

/** Main stat + unlocked perks of the equipped pets, plus +0.5% all shards per species found. */
export function petBonus(s: State): PetBonus {
    const b: PetBonus = { all: 0, click: 0, minion: 0, critChance: 0, critDmg: 0, tokens: 0, skillXp: 0, offline: 0, bobber: 0, col: 0, cost: 0 };
    b.all += 0.005 * Object.keys(s.pets).length;
    for (const id of s.equip) {
        const p = PET_MAP.get(id);
        const st = s.pets[id];
        if (!p || !st) continue;
        const lv = petLevel(p, st.xp);
        b[p.stat] += p.base + p.per * (lv - 1);
        for (let i = 0; i < p.perks.length; i++) if (lv >= PET_PERK_AT[i]) b[p.perks[i].stat] += p.perks[i].value;
    }
    return b;
}

export interface ColFx {
    own: number[];
    next: number[];
    per10: number[];
    cost: number[];
    col: number[];
    all: number;
    click: number;
    crit: number;
    critDmg: number;
    offline: number;
    tokens: number;
}

/** Sum of every unlocked collection tier reward. */
export function collectionEffects(s: State): ColFx {
    const z = () => MINIONS.map(() => 0);
    const fx: ColFx = { own: z(), next: z(), per10: z(), cost: z(), col: z(), all: 0, click: 0, crit: 0, critDmg: 0, offline: 0, tokens: 0 };
    for (let i = 0; i < MINIONS.length; i++) {
        const t = colTier(s.mcol[i] || 0);
        for (let k = 0; k < t; k++) {
            const r = MINION_COL[i][k];
            switch (r.kind) {
                case "own": fx.own[i] += r.value; break;
                case "next": if (i + 1 < MINIONS.length) fx.next[i + 1] += r.value; break;
                case "per10": fx.per10[i] += r.value; break;
                case "cost": fx.cost[i] += r.value; break;
                case "col": fx.col[i] += r.value; break;
                case "all": fx.all += r.value; break;
                case "click": fx.click += r.value; break;
                case "crit": fx.crit += r.value; break;
                case "critDmg": fx.critDmg += r.value; break;
                case "offline": fx.offline += r.value; break;
                case "tokens": fx.tokens += r.value; break;
            }
        }
    }
    return fx;
}

export const colTiers = (s: State) => MINIONS.map((_, i) => colTier(s.mcol[i] || 0));

/** Sum of every unlocked trophy tier's reward, per stat. */
export function trophyBonus(s: State): Record<RewardStat, number> {
    const b: Record<RewardStat, number> = { all: 0, click: 0, minion: 0, critChance: 0, critDmg: 0, tokens: 0, skillXp: 0, offline: 0, bobber: 0 };
    for (const tr of TROPHIES) {
        const n = s.tro[tr.id] || 0;
        for (let i = 0; i < n; i++) b[tr.stat] += tr.tiers[i].reward;
    }
    return b;
}

export function milestoneMult(owned: number): number {
    let m = 1;
    for (const at of MILESTONES) if (owned >= at) m *= 2;
    return m;
}

export function derive(s: State): Derived {
    let clickMult = 1;
    let minionMult = 1;
    let allUp = 1;
    let auto = 0;
    let critChance = 0.05;
    let critDmg = 0.5;
    let synergy = 0;
    const upOwn = MINIONS.map(() => 1);
    const colUp = MINIONS.map(() => 0);
    for (const u of UPGRADES) {
        const l = s.ups[u.id] || 0;
        if (!l) continue;
        switch (u.kind) {
            case "click": clickMult *= Math.pow(u.value, l); break;
            case "minion": minionMult *= Math.pow(u.value, l); break;
            case "all": allUp *= Math.pow(u.value, l); break;
            case "auto": auto += u.value * l; break;
            case "critChance": critChance += u.value * l; break;
            case "critDmg": critDmg += u.value * l; break;
            case "synergy": synergy += u.value * l; break;
            case "mown":
                upOwn[u.minion!] *= Math.pow(u.value, l);
                if (u.extra?.col) colUp[u.minion!] += u.extra.col * l;
                break;
        }
    }
    const ce = collectionEffects(s);
    const pb = petBonus(s);
    const bonus = trophyBonus(s);
    const bb = btnBonus(s);
    clickMult *= (1 + bonus.click) * (1 + ce.click) * (1 + pb.click) * (1 + bb.click) * (1 + 0.05 * (s.rups.might || 0));
    minionMult *= (1 + bonus.minion) * (1 + pb.minion) * (1 + 0.05 * (s.rups.engine || 0)) * (1 + 0.25 * (s.aups.union || 0));
    critChance += bonus.critChance + ce.crit + pb.critChance + bb.crit + 0.01 * (s.rups.luck || 0);
    critDmg += bonus.critDmg + ce.critDmg + pb.critDmg + bb.critDmg;
    const mining = skillLevel(s.mining);
    const farming = skillLevel(s.farming);
    const combat = skillLevel(s.combat);
    const fishing = skillLevel(s.fishing);
    critChance = Math.min(0.75, critChance);
    critDmg += 0.02 * combat;

    const core = s.rups.core || 0;
    const rMult = Math.pow(1.3 + 0.03 * core, s.rebirths);
    let islandMult = 1;
    for (const i of ISLANDS) if (s.total >= i.at) islandMult = Math.max(islandMult, i.mult);
    const achMult = 1 + bonus.all;
    const am = ascMult(s);
    const all = rMult * islandMult * achMult * allUp * (1 + ce.all + pb.all) * (1 + 0.01 * fishing) * am;

    const shared = minionMult * (1 + 0.03 * farming) * all;
    let cps = 0;
    const mult = MINIONS.map(
        (_, i) => shared * upOwn[i] * (1 + ce.own[i]) * (1 + ce.per10[i] * Math.floor(s.minions[i] / 10)) * (1 + ce.next[i]),
    );
    const colSpeed = MINIONS.map((_, i) => 1 + ce.col[i] + colUp[i] + pb.col + 0.3 * (s.aups.depth || 0));
    const minionCps = MINIONS.map((m, i) => {
        const c = s.minions[i] * m.cps * milestoneMult(s.minions[i]) * mult[i];
        cps += c;
        return c;
    });

    const click = clickMult * (1 + 0.03 * mining) * all + cps * synergy;
    return {
        cps,
        click,
        avgClick: click * (1 + critChance * critDmg),
        critChance,
        critDmg,
        auto,
        rMult,
        islandMult,
        achMult,
        xpMult: 1 + bonus.skillXp + pb.skillXp + bb.xp,
        bobberMult: 1 + bonus.bobber + pb.bobber + bb.bobber,
        bonus,
        all,
        mining,
        farming,
        combat,
        fishing,
        clickUp: clickMult,
        minionUp: minionMult,
        allUp,
        synergy,
        minionCps,
        mult,
        upOwn,
        colSpeed,
        pet: pb,
        ascMult: am,
    };
}

// ---- Costs ----

export const minionDiscount = (s: State) => 1 - 0.05 * (s.rups.disc || 0);
export const offlineEff = (s: State) =>
    Math.min(1, 0.5 + 0.1 * (s.rups.off || 0) + trophyBonus(s).offline + collectionEffects(s).offline + petBonus(s).offline);

/** Price of the first minion of type `i` after every discount (rebirth, collection, upgrades). */
export function minionBase(s: State, i: number): number {
    let disc = minionDiscount(s);
    let col = 0;
    const t = colTier(s.mcol[i] || 0);
    for (let k = 0; k < t; k++) if (MINION_COL[i][k].kind === "cost") col += MINION_COL[i][k].value;
    disc *= 1 - Math.min(0.75, col + petBonus(s).cost);
    for (const u of MINION_UPS_BY[i]) if (s.ups[u.id] && u.extra?.disc) disc *= 1 - u.extra.disc;
    return MINIONS[i].cost * disc;
}

export interface BuyInfo {
    n: number;
    cost: number;
    can: boolean;
    gain: number; // shards/sec added by this purchase
    payback: number; // seconds to earn the cost back
}

/** What buying at the current stack size does for minion `i`. */
export function buyInfo(s: State, d: Derived, i: number): BuyInfo {
    const owned = s.minions[i];
    const base = minionBase(s, i);
    let { n, cost } = bulk(base, MINION_GROWTH, owned, s.shards, s.buy);
    const can = n >= 1 && cost <= s.shards;
    if (n < 1) ({ n, cost } = bulk(base, MINION_GROWTH, owned, s.shards, 1));
    const per = MINIONS[i].cps * d.mult[i];
    const gain = per * ((owned + n) * milestoneMult(owned + n) - owned * milestoneMult(owned));
    return { n, cost, can, gain, payback: gain > 0 ? cost / gain : Infinity };
}

/** The (up to) three visible minions that pay themselves back fastest at the current stack size. */
export function bestBuys(s: State, d: Derived, visible: (i: number) => boolean): { i: number; info: BuyInfo }[] {
    return MINIONS.map((_, i) => ({ i, info: buyInfo(s, d, i) }))
        .filter((x) => visible(x.i) && isFinite(x.info.payback))
        .sort((a, b) => a.info.payback - b.info.payback)
        .slice(0, 3);
}

/** Cost of buying `want` items (or as many as affordable when want = -1). */
export function bulk(base: number, g: number, owned: number, money: number, want: number) {
    const first = base * Math.pow(g, owned);
    let n = want;
    if (want === -1) {
        n = Math.floor(Math.log((money * (g - 1)) / first + 1) / Math.log(g));
        if (!isFinite(n) || n < 0) n = 0;
        n = Math.min(n, 10000);
    }
    return { n, cost: (first * (Math.pow(g, n) - 1)) / (g - 1) };
}

// Shard-priced upgrades are wiped by every rebirth, so their price inflates
// with rebirth count; otherwise they'd be rebought for pocket change each run.
export const UP_INFLATION = 3;
export const upInflation = (s: State) => Math.pow(UP_INFLATION, s.rebirths);

export const upCost = (s: State, id: string, lvl: number) => {
    const u = UPGRADES.find((x) => x.id === id)!;
    return u.cost * Math.pow(u.growth, lvl) * upInflation(s);
};

// ---- Actions (return true when state changed) ----

export function buyMinion(s: State, i: number): boolean {
    const m = MINIONS[i];
    const { n, cost } = bulk(minionBase(s, i), MINION_GROWTH, s.minions[i], s.shards, s.buy);
    if (n < 1 || cost > s.shards) return false;
    s.shards -= cost;
    s.minions[i] += n;
    return true;
}

/** Minion-specific upgrades need a number of that minion owned. */
export const upAvailable = (s: State, u: UpgradeDef) => u.minion === undefined || s.minions[u.minion] >= (u.req ?? 0);

export function buyUpgrade(s: State, id: string): boolean {
    const u = UPGRADES.find((x) => x.id === id)!;
    const lvl = s.ups[id] || 0;
    if (lvl >= u.max || !upAvailable(s, u)) return false;
    const cost = upCost(s, id, lvl);
    if (s.shards < cost) return false;
    s.shards -= cost;
    s.ups[id] = lvl + 1;
    return true;
}

export function buyRebirthUp(s: State, id: string): boolean {
    const u = REBIRTH_UPS.find((x) => x.id === id)!;
    const lvl = s.rups[id] || 0;
    if (lvl >= u.max) return false;
    const cost = Math.ceil(u.cost * Math.pow(u.growth, lvl));
    if (s.tokens < cost) return false;
    s.tokens -= cost;
    s.rups[id] = lvl + 1;
    return true;
}

export const rebirthBase = (s: State) => 1.3 + 0.03 * (s.rups.core || 0);
export const rebirthMultAt = (s: State, r: number) => Math.pow(rebirthBase(s), r);

/** Base tokens for clearing rebirth cost index `r` while holding `shards`. */
export const tokensFor = (shards: number, r: number, asc = 0) =>
    Math.max(1, Math.floor(1 + Math.log10(shards / rebirthCost(r, asc)) * 2));

export const rebirthCap = (s: State) => 1 + (s.rups.stack || 0);
export const tokenMult = (s: State) => 1 + trophyBonus(s).tokens + collectionEffects(s).tokens + petBonus(s).tokens + 0.25 * (s.aups.well || 0) + 0.25 * (s.rups.magnet || 0);
export const milestoneTokens = (level: number) => REBIRTH_MILESTONES[level] || 0;

/** Tokens for taking rebirth number `level` (1-based) while holding `shards`. */
export const tokensAt = (s: State, shards: number, level: number) =>
    Math.max(1, Math.round(tokensFor(shards, level - 1, s.asc) * tokenMult(s))) + milestoneTokens(level);

/** How many rebirths you could take right now (up to your stack cap) and what they pay. */
export function rebirthPlan(s: State, take?: number) {
    const limit = Math.min(rebirthCap(s), take ?? Infinity);
    let count = 0;
    let tokens = 0;
    while (count < limit && s.shards >= rebirthCost(s.rebirths + count, s.asc)) {
        tokens += tokensAt(s, s.shards, s.rebirths + count + 1);
        count++;
    }
    return { count, tokens };
}

/** Best estimate of shards/sec for ETAs: minions + auto-clicks. */
export const income = (d: Derived) => d.cps + d.auto * d.avgClick;

export const startShards = (s: State) => (s.rups.head ? 500 * Math.pow(5, s.rups.head) : 0);

const TRAINING = ["auto", "critc", "critd", "syn"];

export function rebirth(s: State, take?: number): boolean {
    const plan = rebirthPlan(s, take);
    if (plan.count < 1) return false;
    const keep = 0.2 * (s.rups.keep || 0);
    const kept = TRAINING.map((id) => [id, Math.floor((s.ups[id] || 0) * keep)] as const);
    s.tokens += plan.tokens;
    s.rebirths += plan.count;
    s.shards = startShards(s);
    s.minions = MINIONS.map(() => 0);
    s.mcol = MINIONS.map(() => 0);
    s.minions[0] = 5 * (s.rups.kit || 0);
    s.minions[1] = 2 * (s.rups.kit || 0);
    s.ups = {};
    for (const [id, lvl] of kept) if (lvl > 0) s.ups[id] = lvl;
    return true;
}

// ---- Upgrade stat readout: "current -> next" ----

export interface UpInfo {
    label: string;
    cur: string;
    next: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function upgradeInfo(d: Derived, u: UpgradeDef, sci = false): UpInfo {
    const x = (n: number) => `x${fmt(n, sci)}`;
    switch (u.kind) {
        case "click":
            return { label: "Click power", cur: x(d.clickUp), next: x(d.clickUp * u.value) };
        case "minion":
            return { label: "Minion output", cur: x(d.minionUp), next: x(d.minionUp * u.value) };
        case "all":
            return { label: "All shards", cur: x(d.allUp), next: x(d.allUp * u.value) };
        case "auto":
            return { label: "Auto-clicks/sec", cur: fmt(d.auto, sci), next: fmt(d.auto + u.value, sci) };
        case "critChance":
            return { label: "Crit chance", cur: pct(d.critChance), next: pct(Math.min(0.75, d.critChance + u.value)) };
        case "critDmg":
            return { label: "Crit damage", cur: pct(d.critDmg), next: pct(d.critDmg + u.value) };
        case "synergy":
            return { label: "Click bonus from shards/sec", cur: pct(d.synergy), next: pct(d.synergy + u.value) };
        case "mown": {
            const cur = d.upOwn[u.minion!];
            return { label: `${MINIONS[u.minion!].name.replace(" Minion", "")} output`, cur: x(cur), next: x(cur * u.value) };
        }
    }
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Unlock any trophy tiers reached. Returns display names of the new ones. */
export function checkTrophies(s: State): string[] {
    const fresh: string[] = [];
    const owned = s.minions.reduce((a, b) => a + b, 0);
    s.peak.minions = Math.max(s.peak.minions, owned);
    s.peak.types = Math.max(s.peak.types, s.minions.filter((n) => n > 0).length);
    for (const tr of TROPHIES) {
        const m = tr.metric(s);
        let n = 0;
        while (n < tr.tiers.length && m >= tr.tiers[n].at) n++;
        const had = s.tro[tr.id] || 0;
        if (n > had) {
            s.tro[tr.id] = n;
            fresh.push(tr.tiers.length > 1 ? `${tr.name} ${ROMAN[n] ?? n}` : tr.name);
        }
    }
    return fresh;
}

// ---- Pets ----

export const eggPrice = (s: State, egg: EggDef) =>
    Math.max(egg.min, s.peakInc * egg.secs) * Math.pow(1.05, s.hatched) * (1 - 0.08 * (s.aups.nest || 0));

export const feedCost = (s: State) => Math.max(1e3, s.peakInc * 120);

export interface HatchResult {
    id: string;
    rarity: Rarity;
    isNew: boolean;
    xp: number; // xp a duplicate gave
}

export function hatch(s: State, eggId: string, free = false): HatchResult | null {
    const egg = EGGS.find((e) => e.id === eggId);
    if (!egg) return null;
    if (free) {
        if (s.freeEggs < 1 || egg.id !== "wood") return null;
        s.freeEggs--;
    } else {
        const cost = eggPrice(s, egg);
        if (s.shards < cost) return null;
        s.shards -= cost;
    }
    const total = RARITY_ORDER.reduce((a, r) => a + (egg.odds[r] || 0), 0);
    let roll = Math.random() * total;
    let rarity: Rarity = RARITY_ORDER.find((r) => egg.odds[r]) ?? "common";
    for (const r of RARITY_ORDER) {
        const w = egg.odds[r] || 0;
        if (w && roll < w) {
            rarity = r;
            break;
        }
        roll -= w;
    }
    const pool = PETS.filter((p) => p.rarity === rarity);
    const pet = pool[Math.floor(Math.random() * pool.length)];
    const cur = s.pets[pet.id];
    let xp = 0;
    if (!cur) {
        s.pets[pet.id] = { xp: 0, n: 1 };
        if (s.equip.length < petSlots(s)) s.equip.push(pet.id);
    } else {
        cur.n++;
        xp = RARITIES[rarity].dupe * (1 + 0.3 * (s.aups.mentor || 0));
        cur.xp = Math.min(petXpFor(pet, PET_MAX), cur.xp + xp);
    }
    s.hatched++;
    return { id: pet.id, rarity, isNew: !cur, xp };
}

/** Equip a pet; with every slot full the pet in the oldest slot is swapped out. */
export function equipPet(s: State, id: string): boolean {
    if (!s.pets[id] || s.equip.includes(id)) return false;
    if (s.equip.length >= petSlots(s)) s.equip.shift();
    s.equip.push(id);
    return true;
}

export function unequipPet(s: State, id: string): boolean {
    const i = s.equip.indexOf(id);
    if (i < 0) return false;
    s.equip.splice(i, 1);
    return true;
}

/** Give experience to every equipped pet (mentor bonus applied). */
export function addPetXp(s: State, amount: number) {
    const m = 1 + 0.3 * (s.aups.mentor || 0);
    for (const id of s.equip) {
        const p = PET_MAP.get(id);
        const st = s.pets[id];
        if (p && st) st.xp = Math.min(petXpFor(p, PET_MAX), st.xp + amount * m);
    }
}

/** Spend shards to give a pet 30% of the xp its current level needs. */
export function feedPet(s: State, id: string): boolean {
    const p = PET_MAP.get(id);
    const st = s.pets[id];
    if (!p || !st) return false;
    const lv = petLevel(p, st.xp);
    const cost = feedCost(s);
    if (lv >= PET_MAX || s.shards < cost) return false;
    s.shards -= cost;
    st.xp = Math.min(petXpFor(p, PET_MAX), st.xp + 0.3 * (petXpFor(p, lv + 1) - petXpFor(p, lv)) * (1 + 0.3 * (s.aups.mentor || 0)));
    return true;
}

// ---- Ascension ----

export function ascPlan(s: State) {
    const req = ascReq(s.asc);
    const can = s.rebirths >= req;
    return { req, can, ap: can ? ascGain(s.rebirths, s.asc) : 0, next: ascGain(Math.max(s.rebirths, req), s.asc) };
}

export const aupCost = (u: AscUpDef, lvl: number) => Math.ceil(u.cost * Math.pow(u.growth, lvl));

export function buyAscUp(s: State, id: string): boolean {
    const u = ASC_UPS.find((x) => x.id === id);
    if (!u) return false;
    const lvl = s.aups[id] || 0;
    if (lvl >= u.max || (u.needs && !s.aups[u.needs])) return false;
    const cost = aupCost(u, lvl);
    if (s.ap < cost) return false;
    s.ap -= cost;
    s.aups[id] = lvl + 1;
    return true;
}

export function ascend(s: State): boolean {
    const plan = ascPlan(s);
    if (!plan.can) return false;
    const keep = 0.1 * (s.aups.keep || 0);
    const kept = Object.entries(s.rups)
        .map(([id, lvl]) => [id, Math.floor(lvl * keep)] as const)
        .filter(([, lvl]) => lvl > 0);
    s.ap += plan.ap;
    s.asc += 1;
    s.tokens = 0;
    s.rups = Object.fromEntries(kept);
    s.rebirths = s.aups.echo || 0;
    s.shards = 0;
    s.minions = MINIONS.map(() => 0);
    s.mcol = MINIONS.map(() => 0);
    s.ups = {};
    if (s.aups.auto2) s.ups.auto = 3 * s.aups.auto2;
    return true;
}

/** How many trophy tiers are unlocked / exist. */
export const trophyCounts = (s: State) => ({
    got: TROPHIES.reduce((a, t) => a + (s.tro[t.id] || 0), 0),
    all: TROPHIES.reduce((a, t) => a + t.tiers.length, 0),
});

/** Advance the simulation. Production is linear between purchases, so a large dt is exact. */
export function advance(s: State, d: Derived, dt: number) {
    const gain = (d.cps + d.auto * d.avgClick) * dt;
    s.shards += gain;
    s.total += gain;
    s.clicks += d.auto * dt;
    s.mining += d.auto * dt * d.xpMult;
    const autoCrits = d.auto * d.critChance * dt;
    s.crits += autoCrits;
    s.combat += autoCrits * 3 * d.xpMult;
    s.fishing += 0.2 * dt * d.xpMult;
    s.farming += (d.cps > 0 ? 1 + 2 * Math.log10(d.cps + 1) : 0) * dt * d.xpMult;
    for (let i = 0; i < MINIONS.length; i++) if (s.minions[i] > 0) s.mcol[i] += s.minions[i] * dt * d.colSpeed[i];
    s.playTime += dt;
    if (s.equip.length) addPetXp(s, dt);
    const inc = d.cps + d.auto * d.avgClick;
    if (inc > s.peakInc) s.peakInc = inc;
}

// ---- Save / load ----

export function serialize(s: State): string {
    return JSON.stringify({ ...s, savedAt: Date.now() });
}

export function exportSave(s: State): string {
    return btoa(unescape(encodeURIComponent(serialize(s))));
}

export function parseSave(raw: string): State | null {
    try {
        const o = JSON.parse(raw);
        if (!o || typeof o !== "object" || typeof o.shards !== "number") return null;
        const base = newState();
        const s: State = { ...base, ...o };
        // Tolerate saves from older versions with fewer minions.
        s.minions = MINIONS.map((_, i) => Number(o.minions?.[i]) || 0);
        s.mcol = MINIONS.map((_, i) => Number(o.mcol?.[i]) || 0);
        s.ups = { ...(o.ups ?? {}) };
        s.rups = { ...(o.rups ?? {}) };
        s.tro = { ...(o.tro ?? {}) };
        s.peak = { minions: Number(o.peak?.minions) || 0, types: Number(o.peak?.types) || 0 };
        s.aups = { ...(o.aups ?? {}) };
        s.pets = {};
        for (const p of PETS) {
            const r = o.pets?.[p.id];
            if (r) s.pets[p.id] = { xp: Math.max(0, Number(r.xp) || 0), n: Math.max(1, Number(r.n) || 1) };
        }
        s.equip = (Array.isArray(o.equip) ? (o.equip as string[]) : []).filter((id, i, a) => s.pets[id] && a.indexOf(id) === i).slice(0, 3);
        s.peakInc = Math.max(0, Number(o.peakInc) || 0);
        s.btn = cleanBtn(o.btn, s);
        if (!isFinite(s.shards) || !isFinite(s.total)) return null;
        return s;
    } catch {
        return null;
    }
}

export function importSave(text: string): State | null {
    try {
        return parseSave(decodeURIComponent(escape(atob(text.trim()))));
    } catch {
        return null;
    }
}

export function loadGame(): { state: State; offline: number } {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        const s = raw ? parseSave(raw) : null;
        if (s) {
            const elapsed = Math.max(0, (Date.now() - s.savedAt) / 1000);
            let offline = 0;
            if (elapsed > 60) {
                const d = derive(s);
                const secs = Math.min(elapsed, MAX_OFFLINE_S);
                offline = (d.cps + d.auto * d.avgClick) * secs * offlineEff(s);
                s.shards += offline;
                s.total += offline;
                s.playTime += secs * offlineEff(s);
                addPetXp(s, secs * offlineEff(s));
                for (let i = 0; i < MINIONS.length; i++) s.mcol[i] += s.minions[i] * secs * offlineEff(s) * d.colSpeed[i];
            }
            return { state: s, offline };
        }
    } catch {
        /* storage blocked: fall through to a fresh game */
    }
    return { state: newState(), offline: 0 };
}

export function writeSave(s: State) {
    try {
        localStorage.setItem(SAVE_KEY, serialize(s));
    } catch {
        /* storage full or blocked */
    }
}

export function fmtEta(seconds: number): string {
    if (!isFinite(seconds)) return "never (earn income first)";
    if (seconds < 1) return "now";
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    if (h < 48) return `${h}h ${Math.floor((seconds % 3600) / 60)}m`;
    const days = Math.floor(h / 24);
    return days > 999 ? "practically never" : `${days}d ${h % 24}h`;
}

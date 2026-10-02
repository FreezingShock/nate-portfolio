import { DEFAULT_BTN, btnBonus, cleanBtn } from "./button";
import { COMBO_BASE_MAX, COMBO_CPS_SHARE, SURGE_BASE_CHANCE } from "./combo";
import { buffFx, newEventStats, tickBuffs } from "./events";
import { DUST_BASE, addDust, allFx, cleanEnc, newEnc } from "./enchant";
import { cleanMine, mineCtx, newMine, tickMine } from "./mine";
import { cleanFarm, farmCtx, newFarm, tickFarm } from "./farm";
import { GEM_UPS, TOKEN_UPS, autoEvery, bulkBuy, lockedBy, priceAt, valueOf } from "./prestige";
import { activeIsland, islandFx, openIslands, tierMult, visitBonus, type IslandFx } from "./island-logic";
import type { SkillKey } from "./islands";
import {
    ASC_BASE,
    DEFAULT_AUTO,
    ASC_UPS,
    EGGS,
    ISLANDS,
    LEVEL_BONUS,
    MILESTONES,
    MINIONS,
    MINION_COL,
    MINION_GROWTH,
    MINION_UPS_BY,
    PETS,
    PET_MAX,
    PET_PERK_AT,
    PET_STAR_MAX,
    EGG_BY_ID,
    RARITIES,
    RARITY_ORDER,
    PET_DIM_BY_ID,
    starMult,
    rarityIdx,
    type PetDim,
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
        foraging: 0,
        enchanting: 0,
        skm: {},
        enc: newEnc(),
        crits: 0,
        bobbers: 0,
        tro: {},
        peak: { minions: 0, types: 0 },
        playTime: 0,
        savedAt: Date.now(),
        island: "hub",
        visited: ["hub"],
        isec: {},
        sci: false,
        fx: true,
        buy: 1,
        orbit: true,
        toasts: true,
        asc: 0,
        ap: 0,
        aups: {},
        auto: { ...DEFAULT_AUTO },
        autoT: {},
        pets: {},
        equip: [],
        hatched: 0,
        freeEggs: 0,
        peakInc: 0,
        btn: { ...DEFAULT_BTN, seen: [], saved: [null, null, null] },
        combo: 1,
        bestCombo: 1,
        buffs: [],
        popups: true,
        fxp: {},
        lvl: 0,
        lvClaim: 0,
        pfx: "none",
        bsym: "none",
        chap: [],
        frag: 0,
        evs: newEventStats(),
        mine: newMine(),
        farm: newFarm(),
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
    comboMax: number; // max combo multiplier while holding
    comboGain: number; // combo build speed, 1 = base
    surgeChance: number; // per second of holding once warm
    evFreq: number; // popup frequency multiplier
    evBobber: number; // bobber spawn weight multiplier
    evGolden: number; // golden shard spawn weight multiplier
    evLife: number; // popup lifetime multiplier
    evPower: number; // boon strength / duration multiplier
    curseResist: number; // 0..0.7
    evCurseChance: number; // cracked shard weight multiplier
    qteSize: number; // QTE sweet spot multiplier
    qteTime: number; // extra QTE seconds
    qteRewardLvl: number; // Showman levels
    xpSkill: Record<SkillKey, number>; // island skill xp multipliers
    petXp: number; // island pet xp multiplier
    isl: IslandFx; // perks of the island you are on
    foraging: number; // skill levels
    enchanting: number;
    evPay: number; // popup payout multiplier
    evDust: number; // flat dust per popup caught
    chain: number; // chance a caught popup sparks another
    luck: number; // enchant luck multiplier
    dustMult: number; // Arcane Dust multiplier
    procs: { bolt: number; midas: number; echo: number }; // click proc chances from Button enchants
}

export type PetBonus = Record<PetStat, number>;

const PET_MAP = new Map(PETS.map((p) => [p.id, p]));
export const petOf = (id: string) => PET_MAP.get(id);
export const petSlots = (s: State) => 1 + (s.aups.perch2 ? 1 : 0) + (s.aups.perch3 ? 1 : 0) + (s.aups.perch4 ? 1 : 0);
export const ascMult = (s: State) => Math.pow(ASC_BASE, s.asc) * (1 + 0.25 * (s.aups.cosmic || 0));

/** Collection score: every species you own adds a little, more for rarer ones. It is added to all shards. */
export function petScore(s: State): number {
    let t = 0;
    for (const id of Object.keys(s.pets)) {
        const p = PET_MAP.get(id);
        if (p) t += RARITIES[p.rarity].score;
    }
    return t;
}

export interface PetBond {
    label: string;
    color: string;
    n: number;
    bonus: number;
}
const BOND_BY_COUNT = [0, 0, 0.08, 0.2, 0.35];
/** Equip two or more pets from one dimension for a bond; three different dimensions make a Traveler bond. */
export function petBonds(s: State): { list: PetBond[]; total: number } {
    const counts = new Map<string, number>();
    for (const id of s.equip) {
        const p = PET_MAP.get(id);
        if (p && s.pets[id]) counts.set(p.dim, (counts.get(p.dim) ?? 0) + 1);
    }
    const list: PetBond[] = [];
    for (const [dim, n] of counts) {
        if (n >= 2) list.push({ label: `${PET_DIM_BY_ID[dim as PetDim].name} bond`, color: PET_DIM_BY_ID[dim as PetDim].color, n, bonus: BOND_BY_COUNT[Math.min(4, n)] });
    }
    if (counts.size >= 3) list.push({ label: "Traveler bond", color: "var(--mc-yellow)", n: counts.size, bonus: 0.06 });
    return { list, total: list.reduce((a, x) => a + x.bonus, 0) };
}

/** Main stat + unlocked perks of the equipped pets (scaled by each pet's stars), plus the collection score and bonds. */
export function petBonus(s: State): PetBonus {
    const b: PetBonus = { all: 0, click: 0, minion: 0, critChance: 0, critDmg: 0, tokens: 0, skillXp: 0, offline: 0, bobber: 0, col: 0, cost: 0, dust: 0, combo: 0, pxp: 0, popup: 0 };
    b.all += petScore(s) + petBonds(s).total;
    for (const id of s.equip) {
        const p = PET_MAP.get(id);
        const st = s.pets[id];
        if (!p || !st) continue;
        const lv = petLevel(p, st.xp);
        const m = starMult(st.n);
        b[p.stat] += (p.base + p.per * (lv - 1)) * m;
        for (let i = 0; i < p.perks.length; i++) if (lv >= PET_PERK_AT[i]) b[p.perks[i].stat] += p.perks[i].value * m;
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
    let comboMax = COMBO_BASE_MAX;
    let comboGain = 1;
    let surge = SURGE_BASE_CHANCE;
    const ev = { rate: 0, bobber: 0, loot: 0, golden: 0, life: 0, power: 0, curse: 0, qteSize: 0, qteTime: 0, qteRew: 0 };
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
            case "comboMax": comboMax += u.value * l; break;
            case "comboGain": comboGain += u.value * l; break;
            case "comboLuck": surge += u.value * l; break;
            case "evRate": ev.rate += u.value * l; break;
            case "evBobber": ev.bobber += u.value * l; break;
            case "evLoot": ev.loot += u.value * l; break;
            case "evGolden": ev.golden += u.value * l; break;
            case "evLife": ev.life += u.value * l; break;
            case "evPower": ev.power += u.value * l; break;
            case "evCurse": ev.curse += u.value * l; break;
            case "qteSize": ev.qteSize += u.value * l; break;
            case "qteTime": ev.qteTime += u.value * l; break;
            case "qteReward": ev.qteRew += l; break;
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
    const bf = buffFx(s); // popup boons and curses, plus Fracture Fragments
    const isl = islandFx(s); // perks of the island you are on (islands.ts)
    const X = allFx(s); // worn enchants, the Codex and skill milestone perks (enchant.ts)
    const foraging = skillLevel(s.foraging, "foraging");
    const enchanting = skillLevel(s.enchanting, "enchanting");
    clickMult *= (1 + bonus.click) * (1 + ce.click) * (1 + pb.click) * (1 + bb.click) * (1 + 0.05 * (s.rups.might || 0)) * (1 + 0.02 * (s.rups.surge || 0)) * bf.click * isl.click * isl.affinity;
    minionMult *= (1 + bonus.minion) * (1 + pb.minion) * (1 + 0.05 * (s.rups.engine || 0)) * (1 + 0.25 * (s.aups.union || 0)) * (1 + 0.02 * (s.rups.swarm || 0)) * bf.minion * isl.minionAll;
    critChance += bonus.critChance + ce.crit + pb.critChance + bb.crit + bf.crit + isl.crit + 0.01 * (s.rups.luck || 0);
    critDmg += bonus.critDmg + ce.critDmg + pb.critDmg + bb.critDmg + bf.critDmg + isl.critDmg + 0.03 * (s.rups.edge || 0);
    clickMult *= 1 + X.click;
    minionMult *= 1 + X.minion;
    critChance += X.crit;
    critDmg += X.critDmg;
    auto += X.auto;
    synergy += X.synergy;
    const mining = skillLevel(s.mining);
    const farming = skillLevel(s.farming);
    const combat = skillLevel(s.combat);
    const fishing = skillLevel(s.fishing);
    critChance = Math.min(0.75, critChance);
    critDmg += 0.02 * combat * isl.eff.combat;
    // Combo: max and build speed come from upgrades, rebirth / ascension upgrades, skills and button looks.
    comboMax += 0.5 * (s.rups.mom || 0) + (s.aups.over || 0) + 0.02 * combat + bb.combo + isl.comboMax + X.comboMax + pb.combo;
    comboGain += 0.1 * (s.aups.over || 0) + 0.005 * mining + bb.flow;
    comboGain *= bf.combo * isl.comboGain * (1 + X.comboGain);
    surge += 0.0005 * fishing;

    const rMult = Math.pow(rebirthBase(s), s.rebirths);
    const islandMult = tierMult(s);
    const achMult = 1 + bonus.all;
    const am = ascMult(s);
    const all = rMult * islandMult * achMult * allUp * bf.all * (1 + ce.all + pb.all) * (1 + 0.01 * fishing * isl.eff.fishing) * am * isl.all * (1 + visitBonus(s)) * (1 + LEVEL_BONUS * s.lvl) * (1 + X.all) * (1 + 0.01 * (s.rups.fort || 0)) * (1 + 0.03 * (s.aups.nova || 0));

    const shared = minionMult * (1 + 0.03 * farming * isl.eff.farming) * all;
    let cps = 0;
    const mult = MINIONS.map(
        (m, i) => shared * upOwn[i] * (1 + ce.own[i]) * (1 + ce.per10[i] * Math.floor(s.minions[i] / 10)) * (1 + ce.next[i]) * (isl.minion[m.id] ?? 1),
    );
    const colSpeed = MINIONS.map((m, i) => (1 + ce.col[i] + colUp[i] + pb.col + 0.3 * (s.aups.depth || 0)) * (isl.col[m.id] ?? 1) * (1 + X.col));
    const minionCps = MINIONS.map((m, i) => {
        const c = s.minions[i] * m.cps * milestoneMult(s.minions[i]) * mult[i];
        cps += c;
        return c;
    });

    const click = clickMult * (1 + 0.03 * mining * isl.eff.mining) * all + cps * synergy;
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
        xpMult: 1 + bonus.skillXp + pb.skillXp + bb.xp + X.xp,
        bobberMult: (1 + bonus.bobber + pb.bobber + bb.bobber + ev.loot) * isl.loot * (1 + X.bobber),
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
        comboMax,
        comboGain,
        surgeChance: surge,
        // Popup events (events.ts)
        evFreq: ((1 + ev.rate + 0.1 * (s.rups.omen || 0)) * bf.freq * isl.ev.freq * (1 + X.evFreq) * (1 + pb.popup) * (1 + 0.005 * foraging)) / Math.max(0.4, 1 - 0.01 * fishing),
        evBobber: (1 + ev.bobber) * isl.ev.bobber * (1 + X.evBobber),
        evGolden: (1 + ev.golden) * isl.ev.golden * (1 + X.evGolden),
        evLife: (1 + ev.life + 0.1 * (s.aups.horizon || 0) + X.evLife) * isl.ev.life,
        evPower: (1 + ev.power + 0.12 * (s.aups.horizon || 0) + X.evPower) * isl.ev.power,
        curseResist: Math.min(0.7, ev.curse + isl.ev.resist + X.curse),
        evCurseChance: 1 - Math.min(0.7, ev.curse + isl.ev.resist + X.curse),
        qteSize: 1 + ev.qteSize + X.qteSize,
        qteTime: ev.qteTime + isl.ev.qte + X.qteTime,
        qteRewardLvl: ev.qteRew,
        xpSkill: isl.xp,
        petXp: isl.petXp * (1 + X.petXp) * (1 + pb.pxp),
        isl,
        foraging,
        enchanting,
        evPay: (1 + X.evPay) * (1 + 0.015 * foraging),
        evDust: X.evDust,
        chain: Math.min(0.4, X.chain),
        luck: (1 + X.luck) * (1 + 0.02 * enchanting) * bf.luck,
        dustMult: (1 + X.dust) * (1 + 0.03 * enchanting) * bf.dust * (1 + pb.dust),
        procs: { bolt: Math.min(0.5, X.bolt), midas: Math.min(0.5, X.midas), echo: Math.min(0.5, X.echo) },
    };
}

// ---- Costs ----

export const minionDiscount = (s: State) => 1 - 0.05 * (s.rups.disc || 0);
export const offlineEff = (s: State) =>
    Math.min(1, 0.5 + 0.1 * (s.rups.off || 0) + trophyBonus(s).offline + collectionEffects(s).offline + petBonus(s).offline + islandFx(s).offline + allFx(s).offline);

/** Price of the first minion of type `i` after every discount (rebirth, collection, upgrades). */
export function minionBase(s: State, i: number): number {
    let disc = minionDiscount(s);
    let col = 0;
    const t = colTier(s.mcol[i] || 0);
    for (let k = 0; k < t; k++) if (MINION_COL[i][k].kind === "cost") col += MINION_COL[i][k].value;
    disc *= 1 - Math.min(0.75, col + petBonus(s).cost + allFx(s).cost);
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
    return buyPrestige(s, "tokens", id, 1) > 0;
}

/** Buy up to `want` levels (-1 = as many as you can afford) of a token or gem upgrade. Returns how many were bought. */
export function buyPrestige(s: State, cur: "tokens" | "gems", id: string, want: number): number {
    const u = (cur === "tokens" ? TOKEN_UPS : GEM_UPS).find((x) => x.id === id);
    if (!u) return 0;
    const levels = cur === "tokens" ? s.rups : s.aups;
    const l = levels[id] || 0;
    if (lockedBy(u, levels)) return 0;
    const { n, cost } = bulkBuy(u, l, cur === "tokens" ? s.tokens : s.ap, want);
    if (n < 1) return 0;
    if (cur === "tokens") s.tokens -= cost;
    else s.ap -= cost;
    levels[id] = l + n;
    return n;
}

/** The affordable upgrade with the best value rating, or null. */
export function bestPrestige(s: State, cur: "tokens" | "gems"): { id: string; value: number } | null {
    const list = cur === "tokens" ? TOKEN_UPS : GEM_UPS;
    const levels = cur === "tokens" ? s.rups : s.aups;
    const bal = cur === "tokens" ? s.tokens : s.ap;
    let best: { id: string; value: number } | null = null;
    for (const u of list) {
        const l = levels[u.id] || 0;
        if (l >= u.max || lockedBy(u, levels) || priceAt(u, l) > bal) continue;
        const v = valueOf(u, l);
        if (!best || v > best.value) best = { id: u.id, value: v };
    }
    return best;
}

export const rebirthBase = (s: State) => 1.42 + 0.03 * (s.rups.core || 0) + 0.01 * (s.aups.forge2 || 0);
export const rebirthMultAt = (s: State, r: number) => Math.pow(rebirthBase(s), r);

/** Base tokens for clearing rebirth cost index `r` while holding `shards`. */
export const tokensFor = (shards: number, r: number, asc = 0) =>
    Math.max(2, Math.floor(2 + Math.log10(shards / rebirthCost(r, asc)) * 2.5));

export const rebirthCap = (s: State) => 1 + (s.rups.stack || 0);
export const tokenMult = (s: State) => 1 + trophyBonus(s).tokens + collectionEffects(s).tokens + petBonus(s).tokens + 0.25 * (s.aups.well || 0) + 0.25 * (s.rups.magnet || 0) + 0.1 * (s.rups.bank || 0) + allFx(s).tokens;
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
    const keep = Math.min(1, 0.2 * (s.rups.keep || 0) + 0.02 * (s.rups.heir || 0));
    const kept = TRAINING.map((id) => [id, Math.floor((s.ups[id] || 0) * keep)] as const);
    s.tokens += plan.tokens;
    addDust(s, 12 * plan.count * derive(s).dustMult); // each rebirth leaves some dust behind
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
        case "comboMax":
            return { label: "Max combo", cur: x(d.comboMax), next: x(d.comboMax + u.value) };
        case "comboGain":
            return { label: "Combo build speed", cur: x(d.comboGain), next: x(d.comboGain + u.value) };
        case "comboLuck":
            return { label: "Surge chance per second", cur: pct(d.surgeChance), next: pct(d.surgeChance + u.value) };
        case "evRate":
            return { label: "Popup frequency", cur: x(d.evFreq), next: x(d.evFreq + u.value) };
        case "evBobber":
            return { label: "Bobber frequency", cur: x(d.evBobber), next: x(d.evBobber + u.value) };
        case "evLoot":
            return { label: "Bobber loot", cur: x(d.bobberMult), next: x(d.bobberMult + u.value) };
        case "evGolden":
            return { label: "Golden shard frequency", cur: x(d.evGolden), next: x(d.evGolden + u.value) };
        case "evLife":
            return { label: "Popup lifetime", cur: x(d.evLife), next: x(d.evLife + u.value) };
        case "evPower":
            return { label: "Boon strength", cur: x(d.evPower), next: x(d.evPower + u.value) };
        case "evCurse":
            return { label: "Curse resistance", cur: pct(d.curseResist), next: pct(Math.min(0.7, d.curseResist + u.value)) };
        case "qteSize":
            return { label: "QTE sweet spot", cur: x(d.qteSize), next: x(d.qteSize + u.value) };
        case "qteTime":
            return { label: "Extra QTE time", cur: `+${d.qteTime.toFixed(1)}s`, next: `+${(d.qteTime + u.value).toFixed(1)}s` };
        case "qteReward":
            return { label: "QTE rewards", cur: pct(0.1 * d.qteRewardLvl), next: pct(0.1 * (d.qteRewardLvl + 1)) };
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

/** What an egg costs, in its own currency. Shard prices follow your best income; the rest are flat. Both creep up a little with every egg. */
export function eggPrice(s: State, egg: EggDef): number {
    const disc = Math.max(0.2, 1 - 0.08 * (s.aups.nest || 0));
    if (egg.cur === "shards") return Math.max(egg.min ?? 1, s.peakInc * (egg.secs ?? 300)) * Math.min(25, Math.pow(1.02, s.hatched)) * disc;
    return Math.max(1, Math.ceil((egg.price ?? 1) * Math.min(6, Math.pow(1.015, s.hatched)) * disc));
}

/** Everything that goes into an egg's price, for the cost tooltip. */
export function eggPriceInfo(s: State, egg: EggDef) {
    const disc = Math.max(0.2, 1 - 0.08 * (s.aups.nest || 0));
    const shards = egg.cur === "shards";
    const growth = shards ? Math.min(25, Math.pow(1.02, s.hatched)) : Math.min(6, Math.pow(1.015, s.hatched));
    const income = s.peakInc * (egg.secs ?? 300);
    const floor = egg.min ?? 1;
    const base = shards ? Math.max(floor, income) : (egg.price ?? 1);
    return { base, growth, disc, price: eggPrice(s, egg), income, floor, flooredBy: shards && floor > income, secs: egg.secs ?? 0, hatched: s.hatched, nest: s.aups.nest || 0, capped: shards ? growth >= 25 : growth >= 6 };
}

export const eggBalance = (s: State, cur: EggDef["cur"]) => (cur === "shards" ? s.shards : cur === "tokens" ? s.tokens : cur === "gems" ? s.ap : s.enc.dust);

/** Why an egg cannot be bought yet, or null when its dimension is open to you. */
export function eggLocked(s: State, egg: EggDef): string | null {
    if (egg.dim === "overworld") return null;
    if (egg.dim === "fractured") return s.rebirths >= 3 || s.asc >= 1 ? null : "Rebirth 3 times to open the Fractured eggs";
    const seen = ISLANDS.some((i) => i.dim === egg.dim && s.visited.includes(i.id));
    return seen ? null : `Visit a ${egg.dim === "nether" ? "Nether" : "End"} island to open these eggs`;
}
export const eggCan = (s: State, egg: EggDef) => !eggLocked(s, egg) && eggBalance(s, egg.cur) >= eggPrice(s, egg);

export const feedCost = (s: State) => Math.max(1e3, s.peakInc * 120);

export interface HatchResult {
    id: string;
    egg: string;
    rarity: Rarity;
    isNew: boolean;
    xp: number; // xp a duplicate gave
    copies: number; // how many of this pet you have now (stars = copies - 1)
    equipped: boolean; // it went straight into an empty slot
}

function roll(egg: EggDef): { rarity: Rarity; pet: PetDef } {
    const total = RARITY_ORDER.reduce((a, r) => a + (egg.odds[r] || 0), 0);
    let r = Math.random() * total;
    let rarity: Rarity = RARITY_ORDER.find((x) => egg.odds[x]) ?? "common";
    for (const k of RARITY_ORDER) {
        const w = egg.odds[k] || 0;
        if (w && r < w) {
            rarity = k;
            break;
        }
        r -= w;
    }
    let pool = PETS.filter((p) => p.rarity === rarity && p.dim === egg.dim);
    if (!pool.length) pool = PETS.filter((p) => p.rarity === rarity);
    return { rarity, pet: pool[Math.floor(Math.random() * pool.length)] };
}

function giveFrom(s: State, egg: EggDef): HatchResult {
    const { rarity, pet } = roll(egg);
    const cur = s.pets[pet.id];
    let xp = 0;
    let equipped = false;
    if (!cur) {
        s.pets[pet.id] = { xp: 0, n: 1 };
        if (s.equip.length < petSlots(s)) {
            s.equip.push(pet.id);
            equipped = true;
        }
    } else {
        cur.n++;
        xp = RARITIES[rarity].dupe * (1 + 0.3 * (s.aups.mentor || 0));
        cur.xp = Math.min(petXpFor(pet, PET_MAX), cur.xp + xp);
    }
    s.hatched++;
    return { id: pet.id, egg: egg.id, rarity, isNew: !cur, xp, copies: s.pets[pet.id].n, equipped };
}

/** Hatch a free Wooden Egg (from a treasure bobber) or buy and hatch one egg. */
export function hatch(s: State, eggId: string, free = false): HatchResult | null {
    const egg = EGG_BY_ID.get(eggId);
    if (!egg) return null;
    if (free) {
        if (s.freeEggs < 1 || egg.id !== "wood") return null;
        s.freeEggs--;
    } else {
        if (eggLocked(s, egg)) return null;
        const cost = eggPrice(s, egg);
        if (eggBalance(s, egg.cur) < cost) return null;
        spendEgg(s, egg.cur, cost);
    }
    return giveFrom(s, egg);
}

function spendEgg(s: State, cur: EggDef["cur"], n: number) {
    if (cur === "shards") s.shards -= n;
    else if (cur === "tokens") s.tokens -= n;
    else if (cur === "gems") s.ap -= n;
    else s.enc.dust -= n;
}

/** Buy and hatch up to `count` eggs at once, stopping when you cannot pay for the next. */
export function hatchMany(s: State, eggId: string, count: number): HatchResult[] {
    const out: HatchResult[] = [];
    for (let i = 0; i < count; i++) {
        const r = hatch(s, eggId, false);
        if (!r) break;
        out.push(r);
    }
    return out;
}

/** How many eggs of a kind you could hatch right now (up to `cap`). */
export function eggsAffordable(s: State, egg: EggDef, cap = 3): number {
    if (eggLocked(s, egg)) return 0;
    const bal = eggBalance(s, egg.cur);
    const base = eggPrice(s, egg);
    return Math.max(0, Math.min(cap, Math.floor(bal / base)));
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

/** Put a pet in a specific slot (0-based). A pet that is already equipped moves; whoever was there takes its old place. */
export function equipPetAt(s: State, id: string, slot: number): boolean {
    if (!s.pets[id]) return false;
    const max = petSlots(s);
    if (slot < 0 || slot >= max) return false;
    const from = s.equip.indexOf(id);
    if (from === slot) return false;
    const list = [...s.equip];
    if (from >= 0) {
        const there = list[slot];
        list[from] = there ?? "";
        list[slot] = id;
    } else if (slot < list.length) {
        list[slot] = id; // replaces whoever was there
    } else list.push(id);
    s.equip = list.filter(Boolean).slice(0, max);
    return true;
}

/** How strong a pet is for auto-picking: rarity first, then level, then stars. */
export const petPower = (s: State, p: PetDef) => rarityIdx(p.rarity) * 10000 + petLevel(p, s.pets[p.id]?.xp ?? 0) * 10 + Math.min(PET_STAR_MAX, (s.pets[p.id]?.n ?? 1) - 1);

/** Fill every slot with your strongest pets. */
export function equipBest(s: State): boolean {
    const best = PETS.filter((p) => s.pets[p.id])
        .sort((a, b) => petPower(s, b) - petPower(s, a))
        .slice(0, petSlots(s))
        .map((p) => p.id);
    if (best.length === s.equip.length && best.every((id) => s.equip.includes(id))) return false;
    s.equip = best;
    return true;
}

/** Pet experience per second per equipped pet, before multipliers. It grows with your best income so pets keep pace. */
export const petXpRate = (s: State) => 3 + Math.pow(Math.max(1, s.peakInc), 0.2);

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

/** Feed every equipped pet once, as far as your shards go. Returns how many were fed. */
export function feedEquipped(s: State): number {
    let n = 0;
    for (const id of [...s.equip]) if (feedPet(s, id)) n++;
    return n;
}

// ---- Ascension ----

export function ascPlan(s: State) {
    const req = ascReq(s.asc);
    const can = s.rebirths >= req;
    const hoard = 1 + 0.05 * (s.aups.hoard || 0);
    return { req, can, ap: can ? Math.floor(ascGain(s.rebirths, s.asc) * hoard) : 0, next: Math.floor(ascGain(Math.max(s.rebirths, req), s.asc) * hoard) };
}

export const aupCost = (u: AscUpDef, lvl: number) => Math.ceil(u.cost * Math.pow(u.growth, lvl));

export function buyAscUp(s: State, id: string): boolean {
    return buyPrestige(s, "gems", id, 1) > 0;
}

export function ascend(s: State): boolean {
    const plan = ascPlan(s);
    if (!plan.can) return false;
    const keep = 0.1 * (s.aups.keep || 0);
    const kept = Object.entries(s.rups)
        .map(([id, lvl]) => [id, Math.floor(lvl * keep)] as const)
        .filter(([, lvl]) => lvl > 0);
    s.ap += plan.ap;
    addDust(s, 200 * derive(s).dustMult);
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
    // While holding, the combo also gives minions a small active boost.
    const gain = (d.cps * (1 + COMBO_CPS_SHARE * Math.max(0, s.combo - 1)) + d.auto * d.avgClick) * dt;
    s.shards += gain;
    s.total += gain;
    s.clicks += d.auto * dt;
    const autoCrits = d.auto * d.critChance * dt;
    s.crits += autoCrits;
    s.combat += autoCrits * 3 * d.xpMult * d.xpSkill.combat;
    s.fishing += 0.2 * dt * d.xpMult * d.xpSkill.fishing;
    s.foraging += 0.15 * dt * d.xpMult;
    addDust(s, DUST_BASE * dt * d.dustMult);
    s.farming += (d.cps > 0 ? 1 + 2 * Math.log10(d.cps + 1) : 0) * dt * d.xpMult * d.xpSkill.farming; // the minions still work the land a little
    tickMine(s, dt, mineCtx(d));
    tickFarm(s, dt, farmCtx(d));
    for (let i = 0; i < MINIONS.length; i++) if (s.minions[i] > 0) s.mcol[i] += s.minions[i] * dt * d.colSpeed[i];
    s.playTime += dt;
    const here = activeIsland(s).id;
    s.isec[here] = (s.isec[here] || 0) + dt; // island mastery
    tickBuffs(s, dt);
    if (s.equip.length) addPetXp(s, dt * d.petXp * petXpRate(s));
    const inc = d.cps + d.auto * d.avgClick;
    if (inc > s.peakInc) s.peakInc = inc;
    tickAuto(s, d, dt);
}

// ---- Auto-buyers (unlocked with gems, switched on in the Ascension shop) ----

function autoMinion(s: State, d: Derived): boolean {
    let best = -1;
    let bestPay = Infinity;
    let bestCost = 0;
    for (let i = 0; i < MINIONS.length; i++) {
        if (!(i === 0 || s.minions[i] > 0 || s.total >= MINIONS[i].cost * 0.25)) continue;
        const cost = minionBase(s, i) * Math.pow(MINION_GROWTH, s.minions[i]);
        if (cost > s.shards) continue;
        const o = s.minions[i];
        const gain = MINIONS[i].cps * d.mult[i] * ((o + 1) * milestoneMult(o + 1) - o * milestoneMult(o));
        const pay = gain > 0 ? cost / gain : Infinity;
        if (pay < bestPay) {
            best = i;
            bestPay = pay;
            bestCost = cost;
        }
    }
    if (best < 0) return false;
    // Rich players buy a batch: as many as fit in a tenth of their shards (at least one, at most 50).
    let { n, cost } = bulk(minionBase(s, best), MINION_GROWTH, s.minions[best], Math.max(bestCost, s.shards * 0.1), -1);
    if (n < 1) ({ n, cost } = { n: 1, cost: bestCost });
    n = Math.min(n, 50);
    if (n < 1) return false;
    if (n > 1) cost = bulk(minionBase(s, best), MINION_GROWTH, s.minions[best], Infinity, n).cost;
    if (cost > s.shards) return false;
    s.shards -= cost;
    s.minions[best] += n;
    return true;
}

function autoUpgrade(s: State): boolean {
    let best: string | null = null;
    let bestCost = Infinity;
    for (const u of UPGRADES) {
        const l = s.ups[u.id] || 0;
        if (l >= u.max || !upAvailable(s, u)) continue;
        const c = upCost(s, u.id, l);
        if (c <= s.shards && c < bestCost) {
            best = u.id;
            bestCost = c;
        }
    }
    return best ? buyUpgrade(s, best) : false;
}

/** Runs each switched-on auto-buyer on its own timer. Only ever spends what the player already has. */
function tickAuto(s: State, d: Derived, dt: number) {
    const lv = { min: s.aups.autoMin || 0, up: s.aups.autoUp || 0, tok: s.aups.autoTok || 0, rb: s.aups.autoRb || 0 };
    for (const k of ["min", "up", "tok", "rb"] as const) {
        if (!s.auto[k] || lv[k] < 1) continue;
        const t = (s.autoT[k] || 0) + dt;
        if (t < autoEvery(k, lv[k])) {
            s.autoT[k] = t;
            continue;
        }
        s.autoT[k] = 0;
        if (k === "min") autoMinion(s, d);
        else if (k === "up") autoUpgrade(s);
        else if (k === "tok") {
            const b = bestPrestige(s, "tokens");
            if (b) buyPrestige(s, "tokens", b.id, 1);
        } else {
            const plan = rebirthPlan(s);
            if (plan.count >= Math.max(1, Math.min(s.auto.rbN, rebirthCap(s)))) rebirth(s, plan.count);
        }
    }
}

const ISLAND_IDS = new Set(ISLANDS.map((i) => i.id));

// ---- Save / load ----

export function serialize(s: State): string {
    return JSON.stringify({ ...s, combo: 1, savedAt: Date.now() });
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
        s.auto = { ...DEFAULT_AUTO, min: o.auto?.min === true, up: o.auto?.up === true, tok: o.auto?.tok === true, rb: o.auto?.rb === true, rbN: Math.max(1, Math.min(15, Math.floor(Number(o.auto?.rbN) || 1))) };
        s.autoT = {};
        s.pets = {};
        for (const p of PETS) {
            const r = o.pets?.[p.id];
            if (r) s.pets[p.id] = { xp: Math.max(0, Number(r.xp) || 0), n: Math.max(1, Number(r.n) || 1) };
        }
        s.equip = (Array.isArray(o.equip) ? (o.equip as string[]) : []).filter((id, i, a) => s.pets[id] && a.indexOf(id) === i).slice(0, 4);
        s.peakInc = Math.max(0, Number(o.peakInc) || 0);
        s.btn = cleanBtn(o.btn, s);
        s.combo = 1;
        s.bestCombo = Math.max(1, Number(o.bestCombo) || 1);
        s.frag = Math.max(0, Math.floor(Number(o.frag) || 0));
        s.popups = o.popups !== false;
        s.fxp = {};
        for (const [k, v] of Object.entries(o.fxp && typeof o.fxp === "object" ? o.fxp : {})) if (Number(v) > 0) s.fxp[k] = Math.floor(Number(v));
        s.lvl = Math.max(0, Math.floor(Number(o.lvl) || 0));
        s.lvClaim = Math.max(0, Math.floor(Number(o.lvClaim) || 0));
        s.pfx = typeof o.pfx === "string" ? o.pfx : "none";
        s.bsym = typeof o.bsym === "string" ? o.bsym : "none";
        s.chap = (Array.isArray(o.chap) ? (o.chap as unknown[]) : []).filter((x, i, a): x is string => typeof x === "string" && a.indexOf(x) === i).slice(0, 80);
        s.foraging = Math.max(0, Number(o.foraging) || 0);
        s.enchanting = Math.max(0, Number(o.enchanting) || 0);
        s.skm = {};
        for (const [k, v] of Object.entries(o.skm && typeof o.skm === "object" ? o.skm : {})) if (Number(v) > 0) s.skm[k] = Math.floor(Number(v));
        s.enc = cleanEnc(o.enc);
        s.mine = cleanMine(o.mine);
        s.farm = cleanFarm(o.farm);
        if (!o.enc) {
            // A save from before Enchanting: welcome gift scaled to how far you are.
            const gift = Math.min(400, 40 + 15 * Math.min(25, s.rebirths));
            s.enc.dust = gift;
            s.enc.earned = gift;
        }
        s.isec = {};
        for (const [k, v] of Object.entries(o.isec && typeof o.isec === "object" ? o.isec : {})) if (ISLAND_IDS.has(k) && Number(v) > 0) s.isec[k] = Number(v);
        s.visited = Array.isArray(o.visited) ? (o.visited as unknown[]).filter((x): x is string => typeof x === "string" && ISLAND_IDS.has(x)) : openIslands(s).map((i) => i.id);
        if (!s.visited.includes("hub")) s.visited.push("hub");
        if (!openIslands(s).some((i) => i.id === s.island)) s.island = "hub";
        s.evs = { ...newEventStats(), ...(o.evs && typeof o.evs === "object" ? o.evs : {}) };
        s.buffs = (Array.isArray(o.buffs) ? o.buffs : [])
            .filter((b: { id?: unknown; left?: unknown; power?: unknown }) => typeof b?.id === "string" && Number(b.left) > 0)
            .map((b: { id: string; left: number; dur?: number; power?: number }) => ({ id: b.id, left: Number(b.left), dur: Math.max(Number(b.left), Number(b.dur) || 0), power: Math.max(0.1, Number(b.power) || 1) }))
            .slice(0, 12);
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

/** Credit a freshly loaded save for the time since it was saved (shards, buffs, drills, crops...). Returns the shards earned. */
export function settleOffline(s: State): number {
    const elapsed = Math.max(0, (Date.now() - s.savedAt) / 1000);
    let offline = 0;
    if (elapsed > 60) {
        tickBuffs(s, elapsed); // timed buffs keep running while you are away (and do not inflate offline income)
        const d = derive(s);
        const secs = Math.min(elapsed, MAX_OFFLINE_S);
        offline = (d.cps + d.auto * d.avgClick) * secs * offlineEff(s);
        s.shards += offline;
        s.total += offline;
        s.playTime += secs * offlineEff(s);
        addPetXp(s, secs * offlineEff(s) * d.petXp * petXpRate(s));
        addDust(s, DUST_BASE * secs * offlineEff(s) * d.dustMult);
        tickMine(s, secs * offlineEff(s), mineCtx(d)); // drills, auto-clicks and the passive trickle keep digging
        tickFarm(s, secs * offlineEff(s), farmCtx(d)); // crops keep growing, and the Auto-Reaper keeps harvesting
        for (let i = 0; i < MINIONS.length; i++) s.mcol[i] += s.minions[i] * secs * offlineEff(s) * d.colSpeed[i];
    }
    return offline;
}

export function loadGame(): { state: State; offline: number } {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        const s = raw ? parseSave(raw) : null;
        if (s) return { state: s, offline: settleOffline(s) };
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

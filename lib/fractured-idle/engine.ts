import {
    ACHIEVEMENTS,
    ISLANDS,
    MILESTONES,
    MINIONS,
    MINION_GROWTH,
    REBIRTH_UPS,
    UPGRADES,
    rebirthCost,
    type State,
} from "@/lib/fractured-idle/data";

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
        ups: {},
        rups: {},
        mining: 0,
        farming: 0,
        ach: [],
        playTime: 0,
        savedAt: Date.now(),
        island: "hub",
        sci: false,
        fx: true,
        buy: 1,
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
    achMult: number;
    all: number;
    mining: number; // skill levels
    farming: number;
    minionCps: number[]; // per-minion shards/sec, for the shop
}

export const SKILL_CAP = 60;
const XP_BASE = 20;
const XP_GROWTH = 1.45;

export const skillLevel = (xp: number) =>
    Math.min(
        SKILL_CAP,
        Math.floor(Math.log((xp * (XP_GROWTH - 1)) / XP_BASE + 1) / Math.log(XP_GROWTH)),
    );
export const skillXpFor = (level: number) =>
    (XP_BASE * (Math.pow(XP_GROWTH, level) - 1)) / (XP_GROWTH - 1);

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
        }
    }
    critChance = Math.min(0.75, critChance);

    const core = s.rups.core || 0;
    const rMult = Math.pow(1.5 + 0.05 * core, s.rebirths);
    let islandMult = 1;
    for (const i of ISLANDS) if (s.total >= i.at) islandMult = Math.max(islandMult, i.mult);
    const achMult = 1 + 0.01 * s.ach.length;
    const all = rMult * islandMult * achMult * allUp;

    const mining = skillLevel(s.mining);
    const farming = skillLevel(s.farming);

    const shared = minionMult * (1 + 0.03 * farming) * all;
    let cps = 0;
    const minionCps = MINIONS.map((m, i) => {
        const c = s.minions[i] * m.cps * milestoneMult(s.minions[i]) * shared;
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
        all,
        mining,
        farming,
        minionCps,
    };
}

// ---- Costs ----

export const minionDiscount = (s: State) => 1 - 0.05 * (s.rups.disc || 0);
export const offlineEff = (s: State) => Math.min(1, 0.5 + 0.1 * (s.rups.off || 0));

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

export const upCost = (id: string, lvl: number) => {
    const u = UPGRADES.find((x) => x.id === id)!;
    return u.cost * Math.pow(u.growth, lvl);
};

// ---- Actions (return true when state changed) ----

export function buyMinion(s: State, i: number): boolean {
    const m = MINIONS[i];
    const { n, cost } = bulk(m.cost * minionDiscount(s), MINION_GROWTH, s.minions[i], s.shards, s.buy);
    if (n < 1 || cost > s.shards) return false;
    s.shards -= cost;
    s.minions[i] += n;
    return true;
}

export function buyUpgrade(s: State, id: string): boolean {
    const u = UPGRADES.find((x) => x.id === id)!;
    const lvl = s.ups[id] || 0;
    if (lvl >= u.max) return false;
    const cost = u.cost * Math.pow(u.growth, lvl);
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

export const rebirthTokens = (s: State) =>
    Math.max(1, Math.floor(1 + Math.log10(s.shards / rebirthCost(s.rebirths)) * 2));

export const startShards = (s: State) => (s.rups.head ? 500 * Math.pow(5, s.rups.head) : 0);

export function rebirth(s: State): boolean {
    if (s.shards < rebirthCost(s.rebirths)) return false;
    s.tokens += rebirthTokens(s);
    s.rebirths += 1;
    s.shards = startShards(s);
    s.minions = MINIONS.map(() => 0);
    s.ups = {};
    return true;
}

export function checkAchievements(s: State): string[] {
    const fresh: string[] = [];
    for (const a of ACHIEVEMENTS) {
        if (!s.ach.includes(a.id) && a.check(s)) {
            s.ach.push(a.id);
            fresh.push(a.name);
        }
    }
    return fresh;
}

/** Advance the simulation. Production is linear between purchases, so a large dt is exact. */
export function advance(s: State, d: Derived, dt: number) {
    const gain = (d.cps + d.auto * d.avgClick) * dt;
    s.shards += gain;
    s.total += gain;
    s.clicks += d.auto * dt;
    s.mining += d.auto * dt;
    s.farming += (d.cps > 0 ? 1 + 2 * Math.log10(d.cps + 1) : 0) * dt;
    s.playTime += dt;
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
        s.ups = { ...(o.ups ?? {}) };
        s.rups = { ...(o.rups ?? {}) };
        s.ach = Array.isArray(o.ach) ? o.ach : [];
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

import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "./data";

// Boosters: timed potions and charms bought in the Shop (or found), kept in the Inventory and switched on from there.
// Each one raises a single stat for a while. Time is wall-clock (`end` is an epoch in ms), so a booster keeps counting
// down while the game is closed. Using the same booster again tops its timer up; different ones stack with each other.

export type BoostStat = "all" | "click" | "minion" | "xp" | "tokens" | "luck" | "bobber";

export const BOOST_LABEL: Record<BoostStat, string> = {
    all: "all shards",
    click: "click power",
    minion: "minion output",
    xp: "skill XP",
    tokens: "rebirth tokens",
    luck: "egg luck",
    bobber: "bobber rewards",
};

export interface BoostDef {
    id: string; // item id: "boost:<id>"
    name: string;
    desc: string;
    color: string;
    symbol: McSymbolName;
    stat: BoostStat;
    amount: number; // 0.3 = +30%
    mins: number; // base duration
}

export const BOOSTS: BoostDef[] = [
    { id: "boost:greed", name: "Shard Greed", desc: "Everything you earn is worth more.", color: "var(--mc-gold)", symbol: "pristine", stat: "all", amount: 0.3, mins: 20 },
    { id: "boost:might", name: "Mighty Fist", desc: "Every click lands harder.", color: "var(--mc-red)", symbol: "strength", stat: "click", amount: 0.5, mins: 15 },
    { id: "boost:swarm", name: "Swarm Tonic", desc: "Your minions work overtime.", color: "var(--mc-green)", symbol: "forge", stat: "minion", amount: 0.4, mins: 20 },
    { id: "boost:wisdom", name: "Wisdom Draught", desc: "Skills level up faster.", color: "var(--mc-aqua)", symbol: "wisdom", stat: "xp", amount: 0.5, mins: 30 },
    { id: "boost:clover", name: "Lucky Clover", desc: "Eggs lean toward rarer pets.", color: "var(--mc-light-purple)", symbol: "petLuck", stat: "luck", amount: 0.25, mins: 30 },
    { id: "boost:magnet", name: "Token Magnet", desc: "Rebirths pay out more tokens.", color: "var(--mc-yellow)", symbol: "magicFind", stat: "tokens", amount: 0.3, mins: 30 },
    { id: "boost:lure", name: "Bobber Lure", desc: "Treasure bobbers carry more.", color: "#6fb4ff", symbol: "fishing", stat: "bobber", amount: 0.6, mins: 20 },
    { id: "boost:frenzy", name: "Golden Frenzy", desc: "A short, huge surge in everything you earn.", color: "#ffd24a", symbol: "sunburst", stat: "all", amount: 1, mins: 5 },
];
export const BOOST_BY_ID = new Map(BOOSTS.map((b) => [b.id, b]));

export interface ActiveBoost {
    id: string;
    end: number; // epoch ms
    dur: number; // ms of the full bar, for the countdown line
}

export const BASE_BOOST_SLOTS = 3;
export const boostSlots = (s: State) => BASE_BOOST_SLOTS + (s.inv.sup.belt || 0);
export const boostDurMul = (s: State) => 1 + 0.1 * (s.inv.sup.brew || 0);
export const boostMs = (s: State, def: BoostDef) => Math.round(def.mins * 60_000 * boostDurMul(s));

export const NO_BOOST: Record<BoostStat, number> = { all: 0, click: 0, minion: 0, xp: 0, tokens: 0, luck: 0, bobber: 0 };

/** Sum of every running booster, per stat. Cheap: at most a handful of entries. */
export function boostFx(s: State, now = Date.now()): Record<BoostStat, number> {
    const act = s.inv.active;
    if (!act.length) return NO_BOOST;
    const out = { ...NO_BOOST };
    for (const a of act) {
        if (a.end <= now) continue;
        const def = BOOST_BY_ID.get(a.id);
        if (def) out[def.stat] += def.amount;
    }
    return out;
}

export const boostLeft = (a: ActiveBoost, now = Date.now()) => Math.max(0, (a.end - now) / 1000);

/** Switch a booster on. The caller takes the item from the inventory only when this succeeds. */
export function startBoost(s: State, id: string, now = Date.now()): { ok: boolean; why?: string } {
    const def = BOOST_BY_ID.get(id);
    if (!def) return { ok: false, why: "Not a booster" };
    const dur = boostMs(s, def);
    const live = s.inv.active.filter((a) => a.end > now);
    s.inv.active = live;
    const have = live.find((a) => a.id === id);
    if (have) {
        // Topping up: the timer grows, but never past three full durations at once.
        have.end = Math.min(now + dur * 3, have.end + dur);
        have.dur = Math.max(have.dur, dur);
        return { ok: true };
    }
    if (live.length >= boostSlots(s)) return { ok: false, why: `All ${boostSlots(s)} booster slots are busy` };
    live.push({ id, end: now + dur, dur });
    return { ok: true };
}

/** Drop finished boosters. Returns the ones that just ended, for a notice. */
export function expireBoosts(s: State, now = Date.now()): string[] {
    if (!s.inv.active.length) return [];
    const gone: string[] = [];
    s.inv.active = s.inv.active.filter((a) => {
        if (a.end > now) return true;
        gone.push(a.id);
        return false;
    });
    return gone;
}

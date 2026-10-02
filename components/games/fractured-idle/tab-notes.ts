import { fmtInt } from "@/lib/fractured-idle/format";
import { CATS, isUnlocked, lookKey } from "@/lib/fractured-idle/button";
import { EGGS, MINIONS, MINION_GROWTH, PETS, SKILLS, UPGRADES, type State } from "@/lib/fractured-idle/data";
import { MILESTONES_BY_SKILL } from "@/lib/fractured-idle/skills";
import { SLOT_IDS, canRoll, slotOpen } from "@/lib/fractured-idle/enchant";
import { ascPlan, bulk, eggCan, minionBase, rebirthPlan, skillLevel, trophyCounts, upAvailable, upCost } from "@/lib/fractured-idle/engine";
import { openIslands } from "@/lib/fractured-idle/island-logic";
import { ENCHANTS, RECIPE_BY_ID, canBuyEnch, canCraft as canMineCraft, featsReady, geodeCount, goalOf as mineGoal, heldTool, isOre, jobsReady, mineLevel, slotsFree } from "@/lib/fractured-idle/mine";
import { FARM_UPS, canBuyUp as canBuyFarmUp, canBuyHoe, featsReady as farmFeatsReady, jobsReady as farmJobsReady, readyCount, podCount } from "@/lib/fractured-idle/farm";
import { SAGAS, SAGA_BY_ID, finaleReady, readyChapters, type SagaId } from "@/lib/fractured-idle/sagas";
import type { TabNote } from "./tab-bar";

// What each tab's tooltip (and its badge) says. `act` notes need a click and
// count toward the badge; the rest are just good to know. Anything that scans a
// big table (upgrades, looks, islands...) is recomputed twice a second, not on
// every 10 Hz render. Notes about things that happened ("2 new milestones") are
// counted against a baseline taken the last time you looked at that tab.

const G = "var(--mc-green)";
const Y = "var(--mc-yellow)";
const A = "var(--mc-aqua)";
const O = "var(--mc-gold)";
const P = "var(--mc-light-purple)";
const R = "var(--mc-red)";

const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;

/** A notice that starts with a number ("3 minion types you can afford") counts as that many in the tab badge. */
const withCount = (n: TabNote): TabNote => {
    if (!n.act || n.n !== undefined || typeof n.text !== "string") return n;
    const m = /^(\d+)\s/.exec(n.text);
    return m ? { ...n, n: Number(m[1]) } : n;
};

export interface NoteCache {
    t: number;
    slow: Record<string, TabNote[]>;
    seen: Record<string, number>;
}

export const newNoteCache = (): NoteCache => ({ t: 0, slow: {}, seen: {} });

function scan(s: State, since: (tab: string, cur: number) => number): Record<string, TabNote[]> {
    const out: Record<string, TabNote[]> = {};
    const add = (tab: string, n: TabNote) => (out[tab] ??= []).push(withCount(n));

    const buyable = MINIONS.filter((m, i) => bulk(minionBase(s, i), MINION_GROWTH, s.minions[i], s.shards, 1).cost <= s.shards && (i === 0 || s.minions[i] > 0 || s.total >= m.cost * 0.25)).length;
    if (buyable) add("minions", { text: `${plural(buyable, "minion type")} you can afford`, color: G, act: true });

    const ups = UPGRADES.filter((u) => (s.ups[u.id] || 0) < u.max && upAvailable(s, u) && s.shards >= upCost(s, u.id, s.ups[u.id] || 0)).length;
    if (ups) add("upgrades", { text: `${plural(ups, "upgrade")} you can afford`, color: G, act: true });

    let fresh = 0;
    for (const c of CATS) for (const l of c.list) if (l.need && isUnlocked(s, l) && !s.btn.seen.includes(lookKey(c.id, l.id))) fresh++;
    if (fresh) add("button", { text: `${plural(fresh, "new look")} unlocked`, color: A, act: true });

    const eggs = s.freeEggs;
    if (eggs > 0) add("pets", { text: `${plural(eggs, "free egg")} to hatch`, color: P, act: true });
    if (Object.keys(s.pets).length < PETS.length && EGGS.some((e) => eggCan(s, e))) add("pets", { text: "You can afford an egg", color: O, act: true });

    const geodes = geodeCount(s);
    if (geodes > 0) add("mine", { text: `${plural(geodes, "geode")} to crack`, color: "var(--mc-light-purple)", act: true });
    const mg = mineGoal(s);
    if (mg && RECIPE_BY_ID[mg.id] && canMineCraft(s, RECIPE_BY_ID[mg.id], 1).ok) add("mine", { text: `${mg.title} is ready to forge`, color: "#e0b070", act: true });
    const tool = heldTool(s).id;
    const mineUps = ENCHANTS.filter((u) => canBuyEnch(s, tool, u).ok && Object.keys(u.cost).every((k) => isOre(k))).length;
    if (mineUps) add("mine", { text: `${plural(mineUps, "enchant")} you can afford`, color: G, act: true });

    const isl = openIslands(s).filter((i) => !s.visited.includes(i.id)).length;
    if (isl) add("islands", { text: `${plural(isl, "new island")} to visit`, color: "#6fb4ff", act: true });

    const ms = SKILLS.reduce((a, k) => a + MILESTONES_BY_SKILL[k.id].filter((m) => m.at <= skillLevel(s[k.id], k.id)).length, 0);
    const newMs = since("skills", ms);
    if (newMs) add("skills", { text: `${plural(newMs, "new milestone")} reached`, color: Y, act: true });

    const tro = trophyCounts(s).got;
    const newTro = since("trophies", tro);
    if (newTro) add("trophies", { text: `${plural(newTro, "new trophy tier")} unlocked`, color: O, act: true });

    const lv = since("level", s.lvl);
    if (lv) add("level", { text: `Level up! You reached Lv ${s.lvl}`, color: G, act: true });
    return out;
}

export function buildTabNotes(s: State, current: string, cache: NoteCache, now = Date.now()): Record<string, TabNote[]> {
    // Baselines: the first reading, and every reading while you are on that tab, become "already seen".
    const since = (tab: string, cur: number) => {
        if (cache.seen[tab] === undefined || tab === current) cache.seen[tab] = cur;
        return Math.max(0, cur - cache.seen[tab]);
    };
    if (now - cache.t > 500) {
        cache.t = now;
        cache.slow = scan(s, since);
    }
    const out: Record<string, TabNote[]> = {};
    for (const k in cache.slow) out[k] = [...cache.slow[k]];
    const add = (tab: string, n: TabNote) => (out[tab] ??= []).push(withCount(n));

    // Cheap and time-critical: read every render.
    const plan = rebirthPlan(s);
    if (plan.count > 0) add("rebirth", { text: `${plan.count} rebirth${plan.count === 1 ? "" : "s"} ready: ${plural(plan.tokens, "token")}`, color: R, act: true, n: plan.count });
    if (ascPlan(s).can) add("ascension", { text: `Ascension ready: +${ascPlan(s).ap} AP`, color: O, act: true });

    const ready = jobsReady(s, now);
    if (ready) add("mine", { text: `${plural(ready, "forge craft")} ready to collect`, color: "#ff9a4d", act: true });
    const feats = featsReady(s).length;
    if (feats) add("mine", { text: `${plural(feats, "mining milestone")} to claim`, color: "#ffd23a", act: true });
    const ripe = readyCount(s);
    if (ripe) add("farm", { text: `${plural(ripe, "plot")} ripe to harvest`, color: "#9be04a", act: true });
    const oven = farmJobsReady(s, now);
    if (oven) add("farm", { text: `${plural(oven, "kitchen craft")} ready to collect`, color: "#ff9a4d", act: true });
    const pods = podCount(s);
    if (pods) add("farm", { text: `${plural(pods, "seed pod")} to open`, color: "var(--mc-light-purple)", act: true });
    const ff = farmFeatsReady(s).length;
    if (ff) add("farm", { text: `${plural(ff, "farming milestone")} to claim`, color: "#ffd23a", act: true });
    if (canBuyHoe(s).ok) add("farm", { text: "A new hoe is ready to make", color: "#9be04a", act: true });
    const fups = FARM_UPS.filter((u) => canBuyFarmUp(s, u).ok).length;
    if (fups) add("farm", { text: `${plural(fups, "farm upgrade")} you can afford`, color: G, act: true });
    const free = slotsFree(s);
    if (free > 0 && s.mine.jobs.length === 0 && mineLevel(s) >= 3) add("mine", { text: "The Forge is idle: start a craft", color: "#e0b070" });

    const pend = SLOT_IDS.filter((id) => slotOpen(s, id) && s.enc.pend[id]).length;
    if (pend) add("enchant", { text: `${plural(pend, "new enchant")} waiting: equip or keep`, color: Y, act: true });
    const rollable = SLOT_IDS.filter((id) => slotOpen(s, id) && !s.enc.pend[id] && canRoll(s, id).ok).length;
    if (rollable) add("enchant", { text: `Dust ready to roll on ${plural(rollable, "slot")}`, color: "#c58bff", act: true });

    for (const c of readyChapters(s)) add("level", { text: `${SAGA_BY_ID[c.id.split(":")[0] as SagaId].name}: ${c.name} is ready to claim`, color: "#ffd23a", act: true });
    for (const x of SAGAS) if (finaleReady(s, x)) add("level", { text: `${x.name} finale is ready to claim`, color: x.color, act: true });
    add("level", { text: `Fractured Level ${s.lvl}`, color: "var(--mc-aqua)" });
    return out;
}

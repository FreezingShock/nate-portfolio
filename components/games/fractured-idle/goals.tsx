"use client";

import { heldEggs } from "@/lib/fractured-idle/inv-core";
import { fmtPct } from "@/lib/fractured-idle/format";
import { fmtInt } from "@/lib/fractured-idle/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import { TabBar, type TabItem } from "./tab-bar";
import { CHAPTER_COUNT, CHAPTER_INFO, chapterReady, claimChapter, currentChapter, nextPicks } from "@/lib/fractured-idle/chapters";
import { claimAllJourney, journeyReady } from "@/lib/fractured-idle/sagas";
import { Tip, TipCard } from "./tooltip";
import { McSymbol } from "@/components/mc-symbol";
import { ASC_BASE, EGGS, EGG_CUR, ISLANDS, PETS, REWARD_LABEL, SKILLS, TROPHIES, rebirthCost } from "@/lib/fractured-idle/data";
import {
    ascPlan,
    eggCan,
    eggPrice,
    fmtEta,
    income,
    rebirthMultAt,
    rebirthPlan,
    skillLevel,
    skillXpFor,
    tokensAt,
    SKILL_CAP,
} from "@/lib/fractured-idle/engine";
import { islandOpen, islandProgress, islandStat } from "@/lib/fractured-idle/island-logic";
import { CATS, STAT_LABEL, isUnlocked, lookProgress } from "@/lib/fractured-idle/button";
import { SLOT_IDS, canRoll, slotOpen } from "@/lib/fractured-idle/enchant";
import {
    canBuyHoe,
    buyHoe,
    claimAllFeats as farmClaim,
    collectAll as farmCollect,
    farmCtx,
    farmLevel,
    featsReady as farmFeats,
    goalOf as farmGoal,
    harvestAll,
    hasReaper,
    have as farmHave,
    jobsReady as farmJobs,
    openAll,
    resInfo as farmRes,
    allPlots,
    readyCount,
    podCount,
    type ResId as FarmRes,
} from "@/lib/fractured-idle/farm";
import {
    RECIPE_BY_ID as MINE_RECIPES,
    canCraft as mineCanCraft,
    startCraft as mineStart,
    resInfo as mineRes,
    claimAllFeats as mineClaim,
    collectAll as mineCollect,
    crackAll,
    featsReady as mineFeats,
    geodeCount,
    goalOf as mineGoal,
    have as mineHave,
    jobsReady as mineJobs,
    mineCtx,
    mineLevel,
    type ResId as MineRes,
} from "@/lib/fractured-idle/mine";
import { tint, type Ctx, type SymbolName } from "./ui";

// The four cards under the big button: what you are working toward right now.
// Every card is a shortcut to the tab where you act on it. Bars are linear and
// exact (fill = have / need, the same number the card prints), so the big
// rebirth and island targets honestly show as small fractions. Ready goals
// come first, then the rest in a fixed order so cards do not jump around.

interface Goal {
    key: string;
    tab: string;
    symbol: SymbolName;
    color: string;
    title: string;
    chip: string;
    chipHot?: boolean;
    pct: number; // 0..1 bar fill
    left: string;
    right: string;
    ready?: boolean;
    prio: number; // lower shows first
    pctText?: string; // what the card prints next to the bar
    act?: { label: string; run: () => string }; // a one-tap action on the card; returns the toast line
}

const realPct = (have: number, need: number) => {
    const p = Math.min(100, (have / need) * 100);
    return p >= 10 ? `${p.toFixed(0)}%` : p >= 0.1 ? `${p.toFixed(1)}%` : "<0.1%";
};

const COST_FRAC = (cost: Record<string, number | undefined>, have: (id: string) => number) => {
    const e = Object.entries(cost);
    if (!e.length) return 1;
    return e.reduce((a, [k, v]) => a + Math.min(1, have(k) / Math.max(1, v ?? 1)), 0) / e.length;
};

type View = "all" | "ready" | "pinned" | "path" | "grow" | "collect" | "world";
/** Which filter a goal lives under, by the tab it opens. */
const GROUP_OF = (g: { key: string; tab: string }): View =>
    g.key === "chapter" || g.tab === "level" ? "path" : ["mine", "farm"].includes(g.tab) ? "world" : ["pets", "inventory", "shop", "button", "enchant", "trophies"].includes(g.tab) ? "collect" : "grow";
const GROUP_TABS: TabItem<View>[] = [
    { id: "path", label: "Path", symbol: "flag", group: "", color: "#7dffb8", blurb: "Your next Chapter task and saga rewards." },
    { id: "grow", label: "Grow", symbol: "attackSpeed", group: "", color: "#ff8a5c", blurb: "Rebirth, ascension, minions, upgrades, skills and islands." },
    { id: "collect", label: "Collect", symbol: "petLuck", group: "", color: "#ff8fc7", blurb: "Pets, eggs, button looks, enchants and trophies." },
    { id: "world", label: "World", symbol: "pick", group: "", color: "#e8b04a", blurb: "The Mine and the Farm." },
];

/** useState that remembers its value in the browser (and quietly works without it). */
function useStored<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void] {
    const [v, setV] = useState<T>(init);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(key);
            if (raw !== null) setV(JSON.parse(raw) as T);
        } catch {
            /* no storage */
        }
    }, [key]);
    const set = (n: T | ((p: T) => T)) =>
        setV((p) => {
            const next = typeof n === "function" ? (n as (p: T) => T)(p) : n;
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                /* no storage */
            }
            return next;
        });
    return [v, set];
}

export function Goals({ s, d, F, open, render, say }: Pick<Ctx, "s" | "d" | "F" | "render" | "say"> & { open: (tab: string) => void }) {
    const rate = income(d);
    const goals: Goal[] = [];
    const [all, setAll] = useState(false);
    const [view, setView] = useState<View>("all");
    const [shut, setShut] = useStored("fi-goals-shut", false);
    const [pins, setPins] = useStored<string[]>("fi-goal-pins", []);
    const sec = Math.floor(Date.now() / 1000);
    const nextLook = useMemo(() => {
        let n: { name: string; cat: string; f: number; have: number; need: number; stat: string } | null = null;
        for (const c of CATS) for (const l of c.list) {
            if (isUnlocked(s, l) || !l.need) continue;
            const f = lookProgress(s, l);
            if (!n || f > n.f) n = { name: l.name, cat: c.label, f, have: 0, need: l.need.n, stat: STAT_LABEL[l.need.stat] };
        }
        return n;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sec]);

    // ---- The Level chapter: what to do next for Fracture EXP ----
    const chN = currentChapter(s);
    if (chN <= CHAPTER_COUNT) {
        const info = CHAPTER_INFO[chN - 1];
        if (chapterReady(s, chN)) {
            goals.push({ key: "chapter", tab: "level", symbol: "flag", color: info.color, title: `Chapter ${chN} complete!`, chip: "Claim", chipHot: true, pct: 1, ready: true, prio: 0, left: info.name, right: "Claim the reward", act: { label: `Claim ${info.reward?.title ?? "chapter"}`, run: () => (claimChapter(s, chN) ? `Chapter ${chN}: ${info.name} complete! ${info.reward?.title} unlocked.` : "") } });
        } else {
            const pick = nextPicks(s, 1)[0];
            if (pick) {
                goals.push({ key: "chapter", tab: pick.row.tab && pick.row.tab !== "level" ? pick.row.tab : "level", symbol: "flag", color: info.color, title: pick.step.text, chip: `+${pick.step.xp} FXP`, pct: pick.frac, left: `Chapter ${chN}: ${info.name}`, right: "Level up: click to go there", prio: 1 });
            }
        }
    }

    // ---- Saga chapters and finales that are ready ----
    const sagaN = journeyReady(s);
    if (sagaN > 0) {
        goals.push({ key: "saga", tab: "level", symbol: "wisdom", color: "#ffd23a", title: `${sagaN} saga reward${sagaN === 1 ? "" : "s"} to claim`, chip: "Claim", chipHot: true, pct: 1, ready: true, prio: 0, left: "Sagas", right: "Claim your permanent buffs", act: { label: sagaN === 1 ? "Claim it" : `Claim all ${sagaN}`, run: () => { const got = claimAllJourney(s); const n = got.chapters.length + got.sagas.length; return n ? `Claimed ${n} saga reward${n === 1 ? "" : "s"}.` : ""; } } });
    }

    // ---- Rebirth ----
    const plan = rebirthPlan(s);
    const level = s.rebirths + 1;
    const cost = rebirthCost(s.rebirths, s.asc);
    if (plan.count > 0) {
        goals.push({
            key: "rebirth",
            tab: "rebirth",
            symbol: "portal",
            color: "var(--mc-light-purple)",
            title: `Rebirth x${fmtInt(plan.count)} ready!`,
            chip: `+${fmtInt(plan.tokens)} tokens`,
            chipHot: true,
            pct: 1,
            ready: true,
            prio: 0,
            left: `x${F(d.rMult)} → x${F(rebirthMultAt(s, s.rebirths + plan.count))} mult`,
            right: "Click to rebirth",
        });
    } else {
        const tokens = tokensAt(s, cost, level);
        goals.push({
            key: "rebirth",
            tab: "rebirth",
            symbol: "portal",
            color: "var(--mc-light-purple)",
            title: `Rebirth #${level}`,
            chip: fmtEta((cost - s.shards) / rate),
            pct: Math.min(1, s.shards / cost),
            prio: 1,
            left: `${F(s.shards)} / ${F(cost)}`,
            right: `x${F(d.rMult)} → x${F(rebirthMultAt(s, level))} · +${tokens}+ tokens`,
        });
    }

    // ---- Ascension (shown once you are within reach of it) ----
    const ap = ascPlan(s);
    if (ap.can || s.rebirths >= ap.req - 6) {
        goals.push({
            key: "ascension",
            tab: "ascension",
            symbol: "comet",
            color: "var(--mc-aqua)",
            title: ap.can ? "Ascension ready!" : `Ascension #${s.asc + 1}`,
            chip: ap.can ? `+${ap.ap} gems` : `${ap.req - s.rebirths} rebirths`,
            chipHot: ap.can,
            pct: Math.min(1, s.rebirths / ap.req),
            ready: ap.can,
            prio: ap.can ? 0 : 2,
            left: `Rebirth ${fmtInt(s.rebirths)} / ${ap.req}`,
            right: ap.can ? "Click to ascend" : "multiplies everything by x" + ASC_BASE,
        });
    }

    // ---- A pet egg you can hatch right now ----
    const held = heldEggs(s);
    const egg = [...EGGS].reverse().find((e) => eggCan(s, e));
    if ((held > 0 || egg) && Object.keys(s.pets).length < PETS.length) {
        goals.push({
            key: "egg",
            tab: held > 0 ? "inventory" : "shop",
            symbol: "petLuck",
            color: "var(--mc-dark-aqua)",
            title: held > 0 ? (held === 1 ? "An egg to hatch!" : `${fmtInt(held)} eggs to hatch!`) : `${egg!.name} ready to buy`,
            chip: held > 0 ? `x${fmtInt(held)}` : `${F(eggPrice(s, egg!))} ${EGG_CUR[egg!.cur].one}s`,
            chipHot: true,
            pct: 1,
            ready: true,
            prio: 0,
            left: `${Object.keys(s.pets).length}/${PETS.length} pets found`,
            right: held > 0 ? "Click to open the Inventory" : "Click to open the Shop",
        });
    }

    // ---- Island (whichever locked one is closest) ----
    let nextIsl: { i: (typeof ISLANDS)[number]; f: number } | null = null;
    for (const i of ISLANDS) {
        if (islandOpen(s, i)) continue;
        const f = islandProgress(s, i);
        if (!nextIsl || f > nextIsl.f) nextIsl = { i, f };
    }
    if (nextIsl) {
        const i = nextIsl.i;
        const have = i.need ? islandStat(s, i.need.stat) : s.total;
        const need = i.need ? i.need.n : i.at;
        goals.push({
            key: "island",
            tab: "islands",
            symbol: i.symbol,
            color: i.color,
            title: `Island: ${i.name}`,
            chip: i.need ? `${fmtPct(nextIsl.f, 0)}` : fmtEta((i.at - s.total) / rate),
            pct: nextIsl.f,
            prio: 3,
            left: `${F(have)} / ${F(need)}`,
            right: i.need ? i.need.label : `island bonus x${F(d.islandMult)} → x${i.mult}`,
        });
    } else {
        goals.push({
            key: "island",
            tab: "islands",
            symbol: "comet",
            color: "var(--mc-yellow)",
            title: "Every island unlocked",
            chip: "Done",
            pct: 1,
            prio: 9,
            left: `${ISLANDS.length}/${ISLANDS.length} islands`,
            right: `bonus x${F(d.islandMult)}`,
        });
    }

    // ---- Closest trophy tier ----
    let best: { name: string; tier: number; frac: number; have: number; at: number; text: string; stat: string; symbol: SymbolName } | null = null;
    for (const t of TROPHIES) {
        const n = s.tro[t.id] || 0;
        const tier = t.tiers[n];
        if (!tier) continue;
        const lo = n === 0 ? 0 : t.tiers[n - 1].at;
        const have = t.metric(s);
        const frac = Math.max(0, Math.min(1, (have - lo) / (tier.at - lo)));
        if (!best || frac > best.frac) {
            best = {
                name: t.name,
                tier: n + 1,
                frac,
                have,
                at: tier.at,
                text: `+${fmtPct(tier.reward, 1)} ${REWARD_LABEL[t.stat]}`,
                stat: t.unit,
                symbol: t.symbol,
            };
        }
    }
    if (best) {
        goals.push({
            key: "trophy",
            tab: "trophies",
            symbol: best.symbol,
            color: "var(--mc-yellow)",
            title: `Trophy: ${best.name}`,
            chip: `${fmtPct(best.frac, 0)}`,
            pct: best.frac,
            prio: 4,
            left: `${F(best.have)} / ${F(best.at)} ${best.stat}`,
            right: best.text,
        });
    }

    // ---- Closest skill level ----
    let skill: { name: string; color: string; symbol: SymbolName; lvl: number; frac: number; xp: number; need: number; bonus: string } | null = null;
    for (const k of SKILLS) {
        const xp = s[k.id];
        const lvl = skillLevel(xp);
        if (lvl >= SKILL_CAP) continue;
        const lo = skillXpFor(lvl);
        const hi = skillXpFor(lvl + 1);
        const frac = (xp - lo) / (hi - lo);
        if (!skill || frac > skill.frac) {
            skill = { name: k.name, color: k.color, symbol: k.symbol, lvl, frac, xp: xp - lo, need: hi - lo, bonus: k.bonus(lvl + 1) };
        }
    }
    if (skill) {
        goals.push({
            key: "skill",
            tab: "skills",
            symbol: skill.symbol,
            color: skill.color,
            title: `${skill.name} ${skill.lvl} → ${skill.lvl + 1}`,
            chip: `${fmtPct(skill.frac, 0)}`,
            pct: skill.frac,
            prio: 5,
            left: `${F(skill.xp)} / ${F(skill.need)} xp`,
            right: `${skill.bonus} bonus`,
        });
    }

    // ---- Mining ----
    const mctx = mineCtx(d);
    const ripeCount = readyCount(s);
    const geodes = geodeCount(s);
    const forgeReady = mineJobs(s);
    const mfeats = mineFeats(s).length;
    const mg = mineGoal(s);
    if (geodes > 0)
        goals.push({ key: "geodes", tab: "mine", symbol: "gem", color: "var(--mc-light-purple)", title: `${geodes} geode${geodes === 1 ? "" : "s"} to crack`, chip: "Crack", chipHot: true, pct: 1, ready: true, prio: 0, left: "dust, tokens, eggs, shards", right: "Click to open the Mine", act: { label: `Crack ${geodes}`, run: () => { const { n, last } = crackAll(s, mctx); return n && last ? `Cracked ${n}. Latest: ${last.title}, ${last.sub}` : ""; } } });
    if (forgeReady > 0)
        goals.push({ key: "forge", tab: "mine", symbol: "forge", color: "#ff9a4d", title: `${forgeReady} forge craft${forgeReady === 1 ? "" : "s"} ready`, chip: "Collect", chipHot: true, pct: 1, ready: true, prio: 0, left: "ingots, items, relics", right: "Click to open the Mine", act: { label: `Collect ${forgeReady}`, run: () => { const got = mineCollect(s); return got.length ? `Collected ${got.length} craft${got.length > 1 ? "s" : ""}.` : ""; } } });
    if (mg) {
        const mrec = MINE_RECIPES[mg.id];
        const ok = !!mrec && mineCanCraft(s, mrec, 1).ok;
        const frac = COST_FRAC(mg.cost as Record<string, number>, (id) => mineHave(s, id as MineRes));
        goals.push({ key: "minegoal", tab: "mine", symbol: "pick", color: mg.color, title: `${mg.kind === "part" ? "Drill part" : mg.kind === "pick" ? "Pickaxe" : "Relic"}: ${mg.title}`, chip: ok ? "Make" : mineLevel(s) < mg.need ? `Mining ${mg.need}` : `${fmtPct(frac, 0)}`, chipHot: ok, pct: ok ? 1 : frac, ready: ok, prio: ok ? 0 : 3.5, left: Object.entries(mg.cost).map(([k, v]) => `${v} ${mineRes(k as MineRes).name}`).slice(0, 3).join(", ") || "free", right: ok ? "Everything is ready" : mineLevel(s) < mg.need ? `Needs Mining ${mg.need}` : "Mine and smelt what is missing", act: ok ? { label: "Forge it", run: () => (mineStart(s, mg.id) ? `${mg.title} is in the furnace.` : "") } : undefined });
    }
    if (mfeats > 0)
        goals.push({ key: "minefeats", tab: "mine", symbol: "star", color: "#ffd23a", title: `${mfeats} mining milestone${mfeats === 1 ? "" : "s"} to claim`, chip: "Claim", chipHot: true, pct: 1, ready: true, prio: 0, left: "tokens, eggs, dust, stats", right: "Click to open the Mine", act: { label: `Claim ${mfeats}`, run: () => { const g = mineClaim(s); return g.length ? `Claimed ${g.length} mining milestone${g.length > 1 ? "s" : ""}.` : ""; } } });

    // ---- Farming ----
    const fctx = farmCtx(d);
    const pods = podCount(s);
    const ovenReady = farmJobs(s);
    const ffeats = farmFeats(s).length;
    const fg = farmGoal(s);
    if (ripeCount > 0)
        goals.push({ key: "harvest", tab: "farm", symbol: "fortune", color: "#9be04a", title: `${ripeCount} plot${ripeCount === 1 ? "" : "s"} ripe`, chip: "Harvest", chipHot: true, pct: 1, ready: true, prio: 0, left: `${allPlots(s).length} plots, ${hasReaper(s) ? "Reaper on" : "no Reaper yet"}`, right: "Hand-picked pays 25% more", act: { label: `Harvest ${ripeCount}`, run: () => { const n = harvestAll(s, fctx, true); return n ? `Picked ${n} plot${n > 1 ? "s" : ""}.` : ""; } } });
    if (pods > 0)
        goals.push({ key: "pods", tab: "farm", symbol: "gem", color: "var(--mc-light-purple)", title: `${pods} seed pod${pods === 1 ? "" : "s"} to open`, chip: "Open", chipHot: true, pct: 1, ready: true, prio: 0, left: "dust, tokens, eggs, shards", right: "Click to open the Farm", act: { label: `Open ${pods}`, run: () => { const { n, last } = openAll(s, fctx); return n && last ? `Opened ${n}. Latest: ${last.title}, ${last.sub}` : ""; } } });
    if (ovenReady > 0)
        goals.push({ key: "kitchen", tab: "farm", symbol: "forge", color: "#ff9a4d", title: `${ovenReady} kitchen craft${ovenReady === 1 ? "" : "s"} ready`, chip: "Collect", chipHot: true, pct: 1, ready: true, prio: 0, left: "goods, items, scarecrows", right: "Click to open the Farm", act: { label: `Collect ${ovenReady}`, run: () => { const got = farmCollect(s); return got.length ? `Collected ${got.length} craft${got.length > 1 ? "s" : ""}.` : ""; } } });
    if (fg) {
        const ok = fg.kind === "hoe" && canBuyHoe(s).ok;
        const frac = COST_FRAC(fg.cost as Record<string, number>, (id) => farmHave(s, id as FarmRes));
        goals.push({ key: "farmgoal", tab: "farm", symbol: "fortune", color: fg.color, title: `${fg.kind === "hoe" ? "Hoe" : "Scarecrow"}: ${fg.title}`, chip: ok ? "Make" : farmLevel(s) < fg.need ? `Farming ${fg.need}` : `${fmtPct(frac, 0)}`, chipHot: ok, pct: ok ? 1 : frac, ready: ok, prio: ok ? 0 : 3.6, left: Object.entries(fg.cost).map(([k, v]) => `${v} ${farmRes(k as FarmRes).name}`).slice(0, 3).join(", ") || "free", right: ok ? "Everything is ready" : farmLevel(s) < fg.need ? `Needs Farming ${fg.need}` : "Grow and cook what is missing", act: ok ? { label: "Make it", run: () => (buyHoe(s) ? `Made the ${fg.title}!` : "") } : undefined });
    }
    if (ffeats > 0)
        goals.push({ key: "farmfeats", tab: "farm", symbol: "star", color: "#ffd23a", title: `${ffeats} farming milestone${ffeats === 1 ? "" : "s"} to claim`, chip: "Claim", chipHot: true, pct: 1, ready: true, prio: 0, left: "tokens, eggs, dust, stats", right: "Click to open the Farm", act: { label: `Claim ${ffeats}`, run: () => { const g = farmClaim(s); return g.length ? `Claimed ${g.length} farming milestone${g.length > 1 ? "s" : ""}.` : ""; } } });

    // ---- Enchanting ----
    const rollable = SLOT_IDS.filter((id) => slotOpen(s, id) && !s.enc.pend[id] && canRoll(s, id).ok).length;
    const pending = SLOT_IDS.filter((id) => slotOpen(s, id) && s.enc.pend[id]).length;
    if (pending > 0 || rollable > 0)
        goals.push({ key: "enchant", tab: "enchant", symbol: "pristine", color: "var(--mc-light-purple)", title: pending > 0 ? `${pending} enchant${pending === 1 ? "" : "s"} waiting` : `Roll ready on ${rollable} slot${rollable === 1 ? "" : "s"}`, chip: pending > 0 ? "Decide" : "Roll", chipHot: true, pct: 1, ready: true, prio: 0, left: `${F(s.enc.dust)} Arcane Dust`, right: "Click to open the Enchant table" });

    // ---- Button looks ----
    if (nextLook)
        goals.push({ key: "look", tab: "button", symbol: "daisy", color: "#6fd0ff", title: `Look: ${nextLook.name}`, chip: `${fmtPct(nextLook.f, 0)}`, pct: nextLook.f, prio: 6, left: `${nextLook.cat}, ${nextLook.stat}`, right: `Needs ${F(nextLook.need)} ${nextLook.stat}` });

    // Pinned goals first, then ready ones, then by priority.
    const rank = (g: Goal) => (pins.includes(g.key) ? -2 : g.ready ? -1 : 0);
    const ordered = goals
        .map((g, i) => ({ g, i }))
        .sort((a, b) => rank(a.g) - rank(b.g) || a.g.prio - b.g.prio || a.i - b.i)
        .map((x) => x.g);
    const readyAll = ordered.filter((g) => g.ready);
    const inView = (g: Goal) => view === "all" || (view === "ready" ? !!g.ready : view === "pinned" ? pins.includes(g.key) : GROUP_OF(g) === view);
    const visible = ordered.filter(inView);
    const LIMIT = 6;
    const shown = all || view !== "all" ? visible : visible.slice(0, Math.max(LIMIT, readyAll.length));
    const countOf = (id: View) => ordered.filter((g) => (id === "ready" ? g.ready : id === "pinned" ? pins.includes(g.key) : GROUP_OF(g) === id)).length;
    const doable = readyAll.filter((g) => g.act);

    // A goal turning ready gets a one-time flash.
    const seen = useRef<Set<string> | null>(null); // null until the first render, so existing ready goals do not all flash on load
    const fresh = new Set<string>();
    if (seen.current) for (const g of readyAll) if (!seen.current.has(g.key)) fresh.add(g.key);
    useEffect(() => {
        seen.current = new Set(readyAll.map((g) => g.key));
    });

    const run = (g: Goal) => {
        const msg = g.act?.run();
        if (msg) say(msg);
        render();
    };
    const runAll = () => {
        const msgs: string[] = [];
        for (const g of doable) {
            const m = g.act!.run();
            if (m) msgs.push(m);
        }
        if (msgs.length) say(msgs.length === 1 ? msgs[0] : `Done: ${msgs.length} goals claimed.`);
        render();
    };
    const togglePin = (key: string) => setPins((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key].slice(-6)));

    const tabs: TabItem<View>[] = [
        { id: "all", label: "All", symbol: "flag", group: "", color: "#7dffb8", blurb: "Every goal, pinned and ready ones first." },
        { id: "ready", label: "Ready", symbol: "bolt", group: "", color: "var(--mc-green)", blurb: "Goals you can finish right now." },
        { id: "pinned", label: "Pinned", symbol: "star", group: "", color: "#ffd23a", blurb: "Goals you pinned with the star. They always sit on top." },
        ...GROUP_TABS,
    ];
    const hot = (id: View) => (id === "ready" && readyAll.length > 0 ? [{ text: `${readyAll.length} ready`, color: "var(--mc-green)", act: true, n: readyAll.length }] : []);

    return (
        <div className="fi-goals" data-shut={shut}>
            <div className="fi-goals-h">
                <button type="button" className="fi-goals-t" aria-expanded={!shut} onClick={() => setShut((v) => !v)}>
                    <ChevronDown /> Goals <em>{ordered.length}</em>
                </button>
                {readyAll.length > 0 && <span className="fi-goals-r">{readyAll.length} ready</span>}
                <span className="fi-goals-sp" />
                {doable.length > 1 && (
                    <button type="button" className="fi-goals-claim" onClick={runAll}>
                        Claim all ({doable.length})
                    </button>
                )}
                {!shut && view === "all" && ordered.length > LIMIT && (
                    <button type="button" className="fi-goals-all" onClick={() => setAll((v) => !v)}>
                        {all ? "Show fewer" : `Show all ${ordered.length}`}
                    </button>
                )}
            </div>
            {!shut && (
                <>
                    <TabBar
                        tabs={tabs.filter((x) => x.id === "all" || x.id === "ready" || countOf(x.id) > 0 || x.id === view)}
                        current={view}
                        label="Goal filters"
                        labels="active"
                        keys={false}
                        onSelect={setView}
                        notes={{ ready: hot("ready"), pinned: [] }}
                    />
                    <div className="fi-goals-g">
                        {shown.map((g, i) => {
                            const pinned = pins.includes(g.key);
                            const pct = Math.max(0, Math.min(1, g.pct));
                            return (
                                <div
                                    key={g.key}
                                    className="fi-goal"
                                    data-ready={!!g.ready}
                                    data-hero={g.key === "chapter"}
                                    data-pin={pinned}
                                    data-new={fresh.has(g.key)}
                                    style={{ ["--c" as string]: g.color, ["--p" as string]: Math.round(pct * 100), ["--i" as string]: i } as React.CSSProperties}
                                >
                                    <Tip tip={<TipCard title={g.title} color={g.color} tag={g.ready ? g.chip : g.pctText ?? realPct(g.pct, 1)} rows={[["Progress", g.left], ["Target", g.right]]} foot={g.act ? `Tap "${g.act.label}" or click the card.` : "Click to open."} />} box>
                                        <button type="button" className="fi-goal-main" onClick={() => open(g.tab)}>
                                            <span className="fi-goal-ring">
                                                <span className="fi-goal-i"><McSymbol name={g.symbol} /></span>
                                            </span>
                                            <span className="fi-goal-body">
                                                <span className="fi-goal-n">{g.title}</span>
                                                <span className="fi-goal-l">{g.left}</span>
                                                <span className="fi-goal-bar"><i style={{ width: `${pct * 100}%`, minWidth: pct > 0 ? 2 : 0 }} /></span>
                                            </span>
                                            <span className="fi-goal-chip" data-hot={!!g.chipHot || !!g.ready}>{g.ready ? g.chip : g.pctText ?? realPct(g.pct, 1)}</span>
                                        </button>
                                    </Tip>
                                    <button type="button" className="fi-goal-pin" aria-pressed={pinned} aria-label={pinned ? `Unpin ${g.title}` : `Pin ${g.title}`} onClick={() => togglePin(g.key)}>
                                        <Star />
                                    </button>
                                    {g.act && (
                                        <button type="button" className="fi-goal-act" onClick={() => run(g)}>
                                            {g.act.label}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {shown.length === 0 && (
                        <p className="fi-goals-none">
                            {view === "pinned" ? "Nothing pinned yet. Tap the star on a goal to keep it on top." : view === "ready" ? "Nothing is ready right now. Check the next goals in All." : "No goals here yet."}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

export const GOALS_CSS = `
.fi-goals{width:100%;max-width:30rem}
.fi-goals-h{display:flex;align-items:center;gap:.5rem;margin-bottom:.15rem}
.fi-goals-t{display:inline-flex;align-items:center;gap:.3rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted-foreground);outline:none;touch-action:manipulation}
.fi-goals-t:hover{color:var(--foreground)}
.fi-goals-t:focus-visible{outline:2px solid var(--mc-aqua);outline-offset:3px;border-radius:.3rem}
.fi-goals-t svg{width:.85rem;height:.85rem;transition:transform .2s}
.fi-goals[data-shut="true"] .fi-goals-t svg{transform:rotate(-90deg)}
.fi-goals-t em{font-style:normal;letter-spacing:0;padding:0 .4rem;border-radius:999px;font-size:.56rem;background:rgba(255,255,255,.12);color:var(--foreground)}
.fi-goals-r{padding:.05rem .45rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.58rem;color:#111;background:var(--mc-green);box-shadow:0 0 10px -2px var(--mc-green);animation:fi-pulse 1.6s ease-in-out infinite}
.fi-goals-sp{flex:1}
.fi-goals-all,.fi-goals-claim{padding:.15rem .6rem;border-radius:999px;border:1px solid rgba(255,255,255,.15);font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);transition:background .15s,color .15s,transform .12s;touch-action:manipulation;outline:none}
.fi-goals-all:hover{background:rgba(255,255,255,.08);color:var(--foreground)}
.fi-goals-claim{font-family:var(--font-minecraft,inherit);font-weight:700;color:#111;border-color:var(--mc-green);background:var(--mc-green);box-shadow:0 0 14px -4px var(--mc-green)}
.fi-goals-claim:hover{filter:brightness(1.15)}
.fi-goals-claim:active,.fi-goals-all:active{transform:scale(.94)}
.fi-goals .fi-tabs{padding:.1rem 0 .3rem}
.fi-goals .fi-tab{height:1.8rem;min-width:1.8rem;padding:0 .4rem;font-size:.64rem}
.fi-goals .fi-tg-row{gap:.12rem;padding:.12rem}
.fi-goals-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.4rem}
.fi-goals-none{margin:.3rem 0;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground);text-align:center}

.fi-goal{position:relative;display:flex;flex-direction:column;min-width:0;border-radius:.9rem;border:1px solid color-mix(in oklch,var(--c) 32%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--c) 11%,rgba(10,8,22,.55)),color-mix(in oklch,var(--c) 3%,rgba(8,6,18,.6)));overflow:hidden;transition:transform .15s cubic-bezier(.2,1.4,.4,1),border-color .15s,box-shadow .2s;animation:fi-goal-in .35s cubic-bezier(.2,1.2,.4,1) backwards;animation-delay:calc(var(--i,0)*35ms)}
.fi-goal:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--c) 70%,transparent);box-shadow:0 8px 20px -12px var(--c)}
.fi-goal[data-hero="true"]{grid-column:1/-1}
.fi-goal[data-pin="true"]{border-color:color-mix(in oklch,#ffd23a 60%,var(--c))}
.fi-goal[data-ready="true"]{border-color:var(--c);background:linear-gradient(135deg,color-mix(in oklch,var(--c) 22%,rgba(10,8,22,.5)),color-mix(in oklch,var(--c) 8%,rgba(8,6,18,.6)));box-shadow:0 0 18px -6px var(--c)}
.fi-goal[data-ready="true"]::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%);background-size:250% 100%;background-position:150% 0;animation:fi-goal-sheen 3.2s ease-in-out infinite}
.fi-goal[data-new="true"]{animation:fi-goal-in .35s cubic-bezier(.2,1.2,.4,1) backwards,fi-goal-pop .7s cubic-bezier(.2,1.6,.4,1)}
.fi-goal .fi-tw-box{display:block}
.fi-goal-main{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.55rem;width:100%;padding:.5rem 1.7rem .5rem .55rem;text-align:left;outline:none}
.fi-goal-main:focus-visible{outline:2px solid var(--c);outline-offset:-2px;border-radius:.9rem}
.fi-goal-ring{display:grid;place-items:center;width:2.3rem;height:2.3rem;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1%),rgba(255,255,255,.13) 0);box-shadow:0 0 12px -4px var(--c);transition:transform .25s cubic-bezier(.2,1.6,.4,1)}
.fi-goal-i{display:grid;place-items:center;width:calc(100% - 6px);height:calc(100% - 6px);border-radius:50%;font-size:1.05rem;color:var(--c);background:radial-gradient(circle at 35% 30%,color-mix(in oklch,var(--c) 22%,#14102a),#0c0918 80%)}
.fi-goal:hover .fi-goal-ring{transform:rotate(-8deg) scale(1.08)}
.fi-goal[data-hero="true"] .fi-goal-ring{width:2.9rem;height:2.9rem}
.fi-goal[data-hero="true"] .fi-goal-i{font-size:1.3rem}
.fi-goal-body{display:flex;flex-direction:column;gap:.18rem;min-width:0}
.fi-goal-n{min-width:0;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;line-height:1.15;color:color-mix(in oklch,var(--c) 70%,#fff);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.fi-goal[data-hero="true"] .fi-goal-n{font-size:.78rem}
.fi-goal-l{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fi-goal-bar{display:block;height:.28rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-goal-bar i{display:block;height:100%;border-radius:inherit;background:var(--c);box-shadow:0 0 6px var(--c);transition:width .25s}
.fi-goal[data-ready="true"] .fi-goal-bar i{background:linear-gradient(90deg,var(--c),#fff,var(--c));background-size:200% 100%;animation:fi-slide 1.8s linear infinite}
.fi-goal-chip{align-self:start;flex:none;padding:.08rem .4rem;border-radius:.35rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.56rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);white-space:nowrap}
.fi-goal-chip[data-hot="true"]{color:#111;background:var(--c)}
.fi-goal-pin{position:absolute;top:.3rem;right:.3rem;display:grid;place-items:center;width:1.3rem;height:1.3rem;border-radius:.4rem;color:var(--muted-foreground);opacity:.35;transition:opacity .15s,color .15s,transform .15s,background .15s;touch-action:manipulation;outline:none;z-index:2}
.fi-goal:hover .fi-goal-pin,.fi-goal-pin:focus-visible,.fi-goal-pin[aria-pressed="true"]{opacity:1}
.fi-goal-pin svg{width:.8rem;height:.8rem}
.fi-goal-pin[aria-pressed="true"]{color:#ffd23a}
.fi-goal-pin[aria-pressed="true"] svg{fill:#ffd23a}
.fi-goal-pin:hover{background:rgba(255,255,255,.1);transform:scale(1.15)}
.fi-goal-pin:focus-visible{outline:2px solid var(--c)}
@media (hover:none){.fi-goal-pin{opacity:.7}}
.fi-goal-act{margin:0 .5rem .5rem;padding:.32rem .5rem;border-radius:.55rem;border:1px solid var(--c);background:color-mix(in oklch,var(--c) 24%,transparent);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;color:#fff;transition:background .15s,transform .12s;touch-action:manipulation;outline:none;z-index:1}
.fi-goal-act:hover{background:color-mix(in oklch,var(--c) 42%,transparent)}
.fi-goal-act:active{transform:scale(.95)}
.fi-goal-act:focus-visible{outline:2px solid #fff}
@keyframes fi-goal-in{from{transform:translateY(6px) scale(.97)}to{transform:none}}
@keyframes fi-goal-pop{0%{box-shadow:0 0 0 0 var(--c)}40%{box-shadow:0 0 0 6px color-mix(in oklch,var(--c) 40%,transparent),0 0 28px 2px var(--c)}100%{box-shadow:0 0 18px -6px var(--c)}}
@keyframes fi-goal-sheen{0%{background-position:150% 0}55%,100%{background-position:-50% 0}}
@media (max-width:420px){.fi-goals-g{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.fi-goal,.fi-goals-r,.fi-goal-bar i,.fi-goal-ring,.fi-goal[data-ready="true"]::after{animation:none!important;transition:none}}
`;

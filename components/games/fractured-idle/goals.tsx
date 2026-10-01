"use client";

import { useMemo, useState } from "react";
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
    allPlots,
    readyCount,
    podCount,
    type ResId as FarmRes,
} from "@/lib/fractured-idle/farm";
import {
    buyPick,
    canBuyPick,
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

export function Goals({ s, d, F, open, render, say }: Pick<Ctx, "s" | "d" | "F" | "render" | "say"> & { open: (tab: string) => void }) {
    const rate = income(d);
    const goals: Goal[] = [];
    const [all, setAll] = useState(false);
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
            title: `Rebirth x${plan.count} ready!`,
            chip: `+${plan.tokens} tokens`,
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
            left: `Rebirth ${s.rebirths} / ${ap.req}`,
            right: ap.can ? "Click to ascend" : "multiplies everything by x" + ASC_BASE,
        });
    }

    // ---- A pet egg you can hatch right now ----
    const egg = [...EGGS].reverse().find((e) => eggCan(s, e));
    if ((s.freeEggs > 0 || egg) && Object.keys(s.pets).length < PETS.length) {
        goals.push({
            key: "egg",
            tab: "pets",
            symbol: "petLuck",
            color: "var(--mc-dark-aqua)",
            title: s.freeEggs > 0 ? "Free egg to hatch!" : `${egg!.name} ready to hatch`,
            chip: s.freeEggs > 0 ? `x${s.freeEggs}` : `${F(eggPrice(s, egg!))} ${EGG_CUR[egg!.cur].one}s`,
            chipHot: true,
            pct: 1,
            ready: true,
            prio: 0,
            left: `${Object.keys(s.pets).length}/${PETS.length} pets found`,
            right: "Click to open Pets",
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
            chip: i.need ? `${Math.round(nextIsl.f * 100)}%` : fmtEta((i.at - s.total) / rate),
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
                text: `+${+(tier.reward * 100).toFixed(1)}% ${REWARD_LABEL[t.stat]}`,
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
            chip: `${Math.round(best.frac * 100)}%`,
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
            chip: `${Math.round(skill.frac * 100)}%`,
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
        const ok = mg.kind === "pick" && canBuyPick(s).ok;
        const frac = COST_FRAC(mg.cost as Record<string, number>, (id) => mineHave(s, id as MineRes));
        goals.push({ key: "minegoal", tab: "mine", symbol: "pick", color: mg.color, title: `${mg.kind === "pick" ? "Pickaxe" : "Relic"}: ${mg.title}`, chip: ok ? "Make" : mineLevel(s) < mg.need ? `Mining ${mg.need}` : `${Math.round(frac * 100)}%`, chipHot: ok, pct: ok ? 1 : frac, ready: ok, prio: ok ? 0 : 3.5, left: Object.entries(mg.cost).map(([k, v]) => `${v} ${k}`).slice(0, 3).join(", ") || "free", right: ok ? "Everything is ready" : mineLevel(s) < mg.need ? `Needs Mining ${mg.need}` : "Mine and smelt what is missing", act: ok ? { label: "Make it", run: () => (buyPick(s) ? `Made the ${mg.title}!` : "") } : undefined });
    }
    if (mfeats > 0)
        goals.push({ key: "minefeats", tab: "mine", symbol: "star", color: "#ffd23a", title: `${mfeats} mining feat${mfeats === 1 ? "" : "s"} to claim`, chip: "Claim", chipHot: true, pct: 1, ready: true, prio: 0, left: "tokens, eggs, dust, stats", right: "Click to open the Mine", act: { label: `Claim ${mfeats}`, run: () => { const g = mineClaim(s); return g.length ? `Claimed ${g.length} mining feat${g.length > 1 ? "s" : ""}.` : ""; } } });

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
        goals.push({ key: "farmgoal", tab: "farm", symbol: "fortune", color: fg.color, title: `${fg.kind === "hoe" ? "Hoe" : "Scarecrow"}: ${fg.title}`, chip: ok ? "Make" : farmLevel(s) < fg.need ? `Farming ${fg.need}` : `${Math.round(frac * 100)}%`, chipHot: ok, pct: ok ? 1 : frac, ready: ok, prio: ok ? 0 : 3.6, left: Object.entries(fg.cost).map(([k, v]) => `${v} ${k}`).slice(0, 3).join(", ") || "free", right: ok ? "Everything is ready" : farmLevel(s) < fg.need ? `Needs Farming ${fg.need}` : "Grow and cook what is missing", act: ok ? { label: "Make it", run: () => (buyHoe(s) ? `Made the ${fg.title}!` : "") } : undefined });
    }
    if (ffeats > 0)
        goals.push({ key: "farmfeats", tab: "farm", symbol: "star", color: "#ffd23a", title: `${ffeats} farming feat${ffeats === 1 ? "" : "s"} to claim`, chip: "Claim", chipHot: true, pct: 1, ready: true, prio: 0, left: "tokens, eggs, dust, stats", right: "Click to open the Farm", act: { label: `Claim ${ffeats}`, run: () => { const g = farmClaim(s); return g.length ? `Claimed ${g.length} farming feat${g.length > 1 ? "s" : ""}.` : ""; } } });

    // ---- Enchanting ----
    const rollable = SLOT_IDS.filter((id) => slotOpen(s, id) && !s.enc.pend[id] && canRoll(s, id).ok).length;
    const pending = SLOT_IDS.filter((id) => slotOpen(s, id) && s.enc.pend[id]).length;
    if (pending > 0 || rollable > 0)
        goals.push({ key: "enchant", tab: "enchant", symbol: "pristine", color: "var(--mc-light-purple)", title: pending > 0 ? `${pending} enchant${pending === 1 ? "" : "s"} waiting` : `Roll ready on ${rollable} slot${rollable === 1 ? "" : "s"}`, chip: pending > 0 ? "Decide" : "Roll", chipHot: true, pct: 1, ready: true, prio: 0, left: `${F(s.enc.dust)} Arcane Dust`, right: "Click to open the Enchant table" });

    // ---- Button looks ----
    if (nextLook)
        goals.push({ key: "look", tab: "button", symbol: "daisy", color: "#6fd0ff", title: `Look: ${nextLook.name}`, chip: `${Math.round(nextLook.f * 100)}%`, pct: nextLook.f, prio: 6, left: `${nextLook.cat}, ${nextLook.stat}`, right: `Needs ${F(nextLook.need)} ${nextLook.stat}` });

    // Ready goals first (in the order pushed), then by priority.
    const ordered = goals
        .map((g, i) => ({ g, i }))
        .sort((a, b) => a.g.prio - b.g.prio || a.i - b.i)
        .map((x) => x.g);
    const readyN = ordered.filter((g) => g.ready).length;
    const LIMIT = 6;
    const shown = all ? ordered : ordered.slice(0, Math.max(LIMIT, readyN));

    const run = (g: Goal) => {
        const msg = g.act?.run();
        if (msg) say(msg);
        render();
    };

    return (
        <div className="fi-goals">
            <div className="fi-goals-h">
                <span className="fi-goals-t">Goals</span>
                {readyN > 0 && <span className="fi-goals-r">{readyN} ready</span>}
                <span className="fi-goals-sp" />
                {ordered.length > shown.length || all ? (
                    <button type="button" className="fi-goals-all" onClick={() => setAll((v) => !v)}>
                        {all ? "Show fewer" : `Show all ${ordered.length}`}
                    </button>
                ) : null}
            </div>
            <div className="fi-goals-g">
                {shown.map((g) => (
                    <div key={g.key} className="fi-goal" data-ready={!!g.ready} style={{ ["--c" as string]: g.color } as React.CSSProperties}>
                        <Tip tip={<TipCard title={g.title} color={g.color} tag={g.ready ? g.chip : g.pctText ?? realPct(g.pct, 1)} rows={[["Progress", g.left], ["Target", g.right]]} foot={g.act ? `Tap "${g.act.label}" or click the card to open it.` : "Click to open."} />} box>
                            <button type="button" className="fi-goal-main" onClick={() => open(g.tab)}>
                                <span className="fi-goal-top">
                                    <span className="fi-goal-i"><McSymbol name={g.symbol} /></span>
                                    <span className="fi-goal-n">{g.title}</span>
                                </span>
                                <span className="fi-goal-bar">
                                    <i style={{ width: `${g.pct * 100}%`, minWidth: g.pct > 0 ? 2 : 0 }} />
                                </span>
                                <span className="fi-goal-bot">
                                    <span className="fi-goal-l">{g.left}</span>
                                    <span className="fi-goal-chip" data-hot={!!g.chipHot}>{g.ready ? g.chip : g.pctText ?? realPct(g.pct, 1)}</span>
                                </span>
                            </button>
                        </Tip>
                        {g.act && (
                            <button type="button" className="fi-goal-act" onClick={() => run(g)}>
                                {g.act.label}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export const GOALS_CSS = `
.fi-goals{width:100%;max-width:30rem}
.fi-goals-h{display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem}
.fi-goals-t{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-goals-r{padding:.05rem .45rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.58rem;color:#111;background:var(--mc-green);box-shadow:0 0 10px -2px var(--mc-green);animation:fi-pulse 1.6s ease-in-out infinite}
.fi-goals-sp{flex:1}
.fi-goals-all{padding:.15rem .6rem;border-radius:999px;border:1px solid rgba(255,255,255,.15);font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);transition:background .15s,color .15s;touch-action:manipulation}
.fi-goals-all:hover{background:rgba(255,255,255,.08);color:var(--foreground)}
.fi-goals-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.4rem}
.fi-goal{position:relative;display:flex;flex-direction:column;min-width:0;border-radius:.75rem;border:1px solid color-mix(in oklch,var(--c) 30%,transparent);background:color-mix(in oklch,var(--c) 6%,transparent);overflow:hidden;transition:transform .12s,border-color .2s,background .2s}
.fi-goal:hover{transform:translateY(-1px);border-color:color-mix(in oklch,var(--c) 65%,transparent)}
.fi-goal[data-ready="true"]{border-color:var(--c);background:color-mix(in oklch,var(--c) 14%,transparent);box-shadow:0 0 14px -6px var(--c)}
.fi-goal .fi-tw-box{display:block}
.fi-goal-main{display:flex;flex-direction:column;gap:.3rem;width:100%;padding:.4rem .5rem;text-align:left}
.fi-goal-top{display:flex;align-items:center;gap:.35rem;min-width:0}
.fi-goal-i{font-size:.85rem;color:var(--c)}
.fi-goal-n{min-width:0;flex:1;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.68rem;line-height:1.15;color:var(--c);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.fi-goal-bar{display:block;height:.28rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-goal-bar i{display:block;height:100%;border-radius:inherit;background:var(--c);box-shadow:0 0 6px var(--c);transition:width .2s}
.fi-goal[data-ready="true"] .fi-goal-bar i{background:linear-gradient(90deg,var(--c),#fff,var(--c));background-size:200% 100%;animation:fi-slide 1.8s linear infinite}
.fi-goal-bot{display:flex;align-items:center;justify-content:space-between;gap:.4rem;font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.fi-goal-l{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fi-goal-chip{flex:none;padding:.05rem .35rem;border-radius:.3rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.56rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent)}
.fi-goal-chip[data-hot="true"]{color:#111;background:var(--c)}
.fi-goal-act{margin:0 .4rem .4rem;padding:.3rem .5rem;border-radius:.5rem;border:1px solid var(--c);background:color-mix(in oklch,var(--c) 22%,transparent);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;color:#fff;transition:background .15s,transform .1s;touch-action:manipulation}
.fi-goal-act:hover{background:color-mix(in oklch,var(--c) 40%,transparent)}
.fi-goal-act:active{transform:scale(.95)}
@media (max-width:360px){.fi-goals-g{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.fi-goal,.fi-goals-r,.fi-goal-bar i{animation:none!important;transition:none}}
`;

"use client";

import { McSymbol } from "@/components/mc-symbol";
import { ASC_BASE, EGGS, ISLANDS, PETS, REWARD_LABEL, SKILLS, TROPHIES, rebirthCost } from "@/lib/fractured-idle/data";
import {
    ascPlan,
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
import { tint, type Ctx, type SymbolName } from "./ui";

// The cards under the big button: what you are working toward right now.
// Every card is a shortcut to the tab where you act on it. Bars for rebirth
// and islands are log-scaled (those costs span many orders of magnitude) but
// the number shown is the real percentage.

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
}

const logPct = (have: number, need: number) =>
    Math.max(0, Math.min(1, Math.log10(Math.max(1, have)) / Math.log10(Math.max(10, need))));
const realPct = (have: number, need: number) => {
    const p = Math.min(100, (have / need) * 100);
    return p >= 10 ? `${p.toFixed(0)}%` : p >= 0.1 ? `${p.toFixed(1)}%` : "<0.1%";
};

export function Goals({ s, d, F, open }: Pick<Ctx, "s" | "d" | "F"> & { open: (tab: string) => void }) {
    const rate = income(d);
    const goals: Goal[] = [];

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
            left: `x${F(d.rMult)} → x${F(rebirthMultAt(s, s.rebirths + plan.count))} multiplier`,
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
            pct: logPct(s.shards, cost),
            left: `${F(s.shards)} / ${F(cost)} (${realPct(s.shards, cost)})`,
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
            chip: ap.can ? `+${ap.ap} points` : `${ap.req - s.rebirths} rebirths`,
            chipHot: ap.can,
            pct: Math.min(1, s.rebirths / ap.req),
            ready: ap.can,
            left: `Rebirth ${s.rebirths} / ${ap.req}`,
            right: ap.can ? "Click to ascend" : "multiplies everything by x" + ASC_BASE,
        });
    }

    // ---- A pet egg you can hatch right now ----
    const egg = [...EGGS].reverse().find((e) => s.shards >= eggPrice(s, e));
    if ((s.freeEggs > 0 || egg) && Object.keys(s.pets).length < PETS.length) {
        goals.push({
            key: "egg",
            tab: "pets",
            symbol: "petLuck",
            color: "var(--mc-dark-aqua)",
            title: s.freeEggs > 0 ? "Free egg to hatch!" : `${egg!.name} ready to hatch`,
            chip: s.freeEggs > 0 ? `x${s.freeEggs}` : F(eggPrice(s, egg!)),
            chipHot: true,
            pct: 1,
            ready: true,
            left: `${Object.keys(s.pets).length}/${PETS.length} pets found`,
            right: "Click to open Pets",
        });
    }

    // ---- Island ----
    const next = ISLANDS.find((i) => s.total < i.at);
    if (next) {
        goals.push({
            key: "island",
            tab: "islands",
            symbol: next.symbol,
            color: next.color,
            title: `Island: ${next.name}`,
            chip: fmtEta((next.at - s.total) / rate),
            pct: logPct(s.total, next.at),
            left: `${F(s.total)} / ${F(next.at)} lifetime (${realPct(s.total, next.at)})`,
            right: `island bonus x${F(d.islandMult)} → x${next.mult}`,
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
            left: `${F(skill.xp)} / ${F(skill.need)} xp`,
            right: `${skill.bonus} bonus`,
        });
    }

    return (
        <div className="w-full max-w-md space-y-1.5">
            <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">Goals</div>
            {goals.map((g) => (
                <button
                    key={g.key}
                    type="button"
                    onClick={() => open(g.tab)}
                    className={`group block w-full rounded-xl border p-2 text-left transition-transform hover:-translate-y-px ${g.ready ? "fi-afford" : ""}`}
                    style={{
                        ["--c" as string]: g.color,
                        borderColor: g.ready ? g.color : tint(g.color, 30),
                        backgroundColor: tint(g.color, g.ready ? 14 : 6),
                    }}
                >
                    <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm" style={{ color: g.color }}><McSymbol name={g.symbol} /></span>
                        <span className="min-w-0 flex-1 truncate font-minecraft text-[12px]" style={{ color: g.color }}>{g.title}</span>
                        <span
                            className="shrink-0 rounded-full border px-1.5 py-px font-minecraft text-[10px]"
                            style={{ borderColor: tint(g.color, 55), color: g.chipHot ? "#000" : g.color, backgroundColor: g.chipHot ? g.color : undefined }}
                        >
                            {g.chip}
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${g.pct * 100}%`, backgroundColor: g.color, boxShadow: `0 0 8px ${g.color}` }} />
                    </div>
                    <div className="mt-1 flex justify-between gap-2 font-rubik text-[10px] text-muted-foreground">
                        <span className="truncate">{g.left}</span>
                        <span className="shrink-0 truncate text-right">{g.right}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}

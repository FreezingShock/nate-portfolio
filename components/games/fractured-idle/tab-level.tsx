"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    BADGE_SYMBOLS,
    FXP_CATS,
    FXP_PER_LEVEL,
    LEVEL_BONUS,
    MAX_DISPLAY_LEVEL,
    PREFIXES,
    fxpSources,
    fxpTotal,
    hasReward,
    prefixOf,
    prefixOpen,
    recentGains,
    rewardFor,
    rewardText,
    symbolOf,
    symbolOpen,
    type FxpCat,
} from "@/lib/fractured-idle/fxp";
import { LevelBadge } from "./level-badge";
import { SectionTitle, tint, type Ctx } from "./ui";

// Fractured Level: your account level. Shows the XP bar, what pays Fracture
// EXP (by system, with the sources closest to paying), the next milestone
// rewards, and the badge symbol and prefix you can wear.

const C = "var(--mc-yellow)";

export function LevelTab({ s, F, render }: Ctx) {
    const [tick, setTick] = useState(0);
    const [openCat, setOpenCat] = useState<FxpCat | null>(null);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const sources = useMemo(() => fxpSources(s), [tick, s]); // eslint-disable-line react-hooks/exhaustive-deps
    const total = fxpTotal(s);
    const into = total - s.lvl * FXP_PER_LEVEL;
    const pfx = prefixOf(s);
    const sym = symbolOf(s);
    const gains = recentGains(Date.now(), 120000).slice(-8).reverse();

    // The next few levels that pay something.
    const upcoming: { level: number; text: string }[] = [];
    for (let l = s.lvl + 1; l <= s.lvl + 80 && upcoming.length < 6; l++) {
        const r = rewardFor(l);
        if (hasReward(r)) upcoming.push({ level: l, text: rewardText(r) });
    }

    return (
        <>
            <div className="relative overflow-hidden rounded-2xl border p-4" style={{ borderColor: tint(C, 50), backgroundImage: `linear-gradient(130deg, ${tint(C, 12)}, transparent 70%)` }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <LevelBadge level={s.lvl} sym={sym} prefix={pfx} size="lg" />
                    <div className="text-left font-rubik text-[11px] text-muted-foreground sm:text-right">
                        <div><b style={{ color: C }}>{F(total)}</b> Fracture EXP</div>
                        <div>Every level: <b style={{ color: "var(--mc-green)" }}>+{+(LEVEL_BONUS * 100).toFixed(2)}%</b> all shards (now +{+(LEVEL_BONUS * s.lvl * 100).toFixed(1)}%)</div>
                    </div>
                </div>
                <div className="mt-3 flex justify-between font-rubik text-[10px] text-muted-foreground">
                    <span>Level {s.lvl} → {s.lvl + 1}</span>
                    <span>{into} / {FXP_PER_LEVEL} XP</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(into / FXP_PER_LEVEL) * 100}%`, backgroundColor: C, boxShadow: `0 0 10px ${C}` }} />
                </div>
                <p className="mt-2 font-rubik text-[11px] text-muted-foreground">
                    You earn Fracture EXP once for each thing you unlock or achieve, in every system. Level {MAX_DISPLAY_LEVEL} needs almost all of it, and every ascension keeps paying.
                </p>
            </div>

            {upcoming.length > 0 && (
                <>
                    <SectionTitle color="var(--mc-green)">Next rewards</SectionTitle>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {upcoming.map((u) => (
                            <div key={u.level} className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 font-rubik text-[11px]">
                                <span className="font-minecraft font-bold text-xs" style={{ color: C }}>Lv {u.level}</span>
                                <span className="min-w-0 flex-1 truncate">{u.text}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <SectionTitle color="var(--mc-aqua)">Where Fracture EXP comes from</SectionTitle>
            <div className="space-y-1">
                {FXP_CATS.map((c) => {
                    const list = sources.filter((x) => x.cat === c.id);
                    const got = list.reduce((a, x) => a + Math.max(x.xp, s.fxp[x.id] || 0), 0);
                    const max = list.reduce((a, x) => a + x.max, 0);
                    const frac = max > 0 ? Math.min(1, got / max) : 0;
                    const open = openCat === c.id;
                    const todo = list
                        .filter((x) => x.max > 0 && Math.max(x.xp, s.fxp[x.id] || 0) < x.max)
                        .sort((a, b) => b.xp / b.max - a.xp / a.max)
                        .slice(0, 8);
                    return (
                        <div key={c.id} className="rounded-xl border border-white/10">
                            <button type="button" onClick={() => setOpenCat(open ? null : c.id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5">
                                <span className="text-lg" style={{ color: c.color }}><McSymbol name={c.symbol} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline justify-between gap-2 font-minecraft font-bold text-xs" style={{ color: c.color }}>
                                        {c.name}
                                        <span className="font-rubik text-[10px] text-muted-foreground">{F(got)}{max > 0 ? ` / ${F(max)}` : ""} XP</span>
                                    </span>
                                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                                        <span className="block h-full rounded-full" style={{ width: `${frac * 100}%`, backgroundColor: c.color, boxShadow: `0 0 8px ${c.color}` }} />
                                    </span>
                                </span>
                            </button>
                            {open && (
                                <div className="border-t border-white/10 px-3 py-2">
                                    <p className="mb-1.5 font-rubik text-[10px] text-muted-foreground">{c.hint}. Closest to paying more:</p>
                                    <div className="space-y-1">
                                        {todo.length === 0 && <div className="font-rubik text-[11px] text-muted-foreground">Everything here is done{c.id === "progress" ? " (ascending keeps paying)" : ""}.</div>}
                                        {todo.map((x) => (
                                            <div key={x.id} className="flex items-center gap-2 font-rubik text-[11px]">
                                                <span className="min-w-0 flex-1 truncate">{x.label}</span>
                                                <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
                                                    <span className="block h-full rounded-full" style={{ width: `${(x.xp / x.max) * 100}%`, backgroundColor: c.color }} />
                                                </span>
                                                <span className="w-16 shrink-0 text-right text-muted-foreground">{Math.floor(x.xp)}/{x.max}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <SectionTitle color="var(--mc-light-purple)">Badge symbol</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
                {BADGE_SYMBOLS.map((b) => {
                    const ok = symbolOpen(s, b);
                    const on = sym.id === b.id;
                    return (
                        <button
                            key={b.id}
                            type="button"
                            disabled={!ok}
                            title={ok ? b.name : `${b.name}: reach level ${b.at}`}
                            onClick={() => {
                                s.bsym = b.id;
                                render();
                            }}
                            className="flex items-center gap-1 rounded-lg border px-2 py-1 font-minecraft font-bold text-xs transition-colors enabled:hover:bg-white/10 disabled:opacity-50"
                            style={on ? { borderColor: C, color: C, backgroundColor: tint(C, 14) } : { borderColor: "rgba(255,255,255,.15)" }}
                        >
                            {ok ? b.symbol ? <McSymbol name={b.symbol} /> : "–" : <Lock className="size-3" />}
                            <span className="font-rubik text-[10px]">{ok ? b.name : `Lv ${b.at}`}</span>
                        </button>
                    );
                })}
            </div>

            <SectionTitle color="var(--mc-gold)">Prefix</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
                {PREFIXES.map((p) => {
                    const ok = prefixOpen(s, p);
                    const on = pfx.id === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            disabled={!ok}
                            title={ok ? p.name : (p.need?.label ?? "")}
                            onClick={() => {
                                s.pfx = p.id;
                                render();
                            }}
                            className="rounded-lg border px-2 py-1 font-rubik text-[11px] transition-colors enabled:hover:bg-white/10 disabled:opacity-50"
                            style={on ? { borderColor: p.color === "rainbow" ? "#fff" : p.color, backgroundColor: tint(p.color === "rainbow" ? "#ffffff" : p.color, 14) } : { borderColor: "rgba(255,255,255,.15)" }}
                        >
                            <span className={p.color === "rainbow" ? "fi-rainbow" : ""} style={p.color === "rainbow" ? undefined : { color: ok ? p.color : undefined }}>
                                {ok ? p.name : <><Lock className="mr-1 inline size-3" />{p.name}</>}
                            </span>
                            {!ok && p.need && <span className="ml-1.5 text-[9px] text-muted-foreground">{p.need.label}</span>}
                        </button>
                    );
                })}
            </div>

            {gains.length > 0 && (
                <>
                    <SectionTitle color="var(--mc-green)">Recent</SectionTitle>
                    <div className="space-y-0.5 font-rubik text-[11px]">
                        {gains.map((g, i) => (
                            <div key={i} className="flex justify-between gap-2">
                                <span className="truncate text-muted-foreground">{g.label}</span>
                                <span style={{ color: "var(--mc-green)" }}>+{g.xp} XP</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

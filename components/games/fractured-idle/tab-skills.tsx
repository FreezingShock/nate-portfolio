"use client";

import { useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { SKILLS, type SkillId } from "@/lib/fractured-idle/data";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { SKILL_CAP, fmt, fmtEta, skillLevel, skillXpFor } from "@/lib/fractured-idle/engine";
import { MILESTONES_BY_SKILL, nextMilestone, rewardLine } from "@/lib/fractured-idle/skills";
import { Badge, Progress, SectionTitle, tint, type Ctx } from "./ui";

// Skills: six skills with their own level curve, a per-level perk and a path
// of milestones (permanent stats, one-time grants and unlocks). The cards on
// top show every skill at a glance; the panel below shows the chosen skill's
// whole milestone path.

interface Props extends Ctx {
    open?: (tab: string) => void;
}

export function SkillsTab({ s, d, open }: Props) {
    const [sel, setSel] = useState<SkillId>("mining");
    // Passive xp/sec, the part that keeps ticking without clicks.
    const passive: Record<SkillId, number> = {
        mining: d.auto * d.xpMult,
        farming: (d.cps > 0 ? 1 + 2 * Math.log10(d.cps + 1) : 0) * d.xpMult,
        combat: d.auto * d.critChance * 3 * d.xpMult,
        fishing: 0.2 * d.xpMult,
        foraging: 0.15 * d.xpMult,
        enchanting: 0,
    };
    const levels = Object.fromEntries(SKILLS.map((k) => [k.id, skillLevel(s[k.id], k.id)])) as Record<SkillId, number>;
    const total = SKILLS.reduce((a, k) => a + levels[k.id], 0);
    const totalMax = SKILLS.length * SKILL_CAP;
    const claimed = SKILLS.reduce((a, k) => a + MILESTONES_BY_SKILL[k.id].filter((m) => m.at <= levels[k.id]).length, 0);
    const claimMax = SKILLS.reduce((a, k) => a + MILESTONES_BY_SKILL[k.id].length, 0);

    const k = SKILLS.find((x) => x.id === sel)!;
    const lvl = levels[sel];
    const xp = s[sel];
    const lo = skillXpFor(lvl, sel);
    const hi = skillXpFor(lvl + 1, sel);
    const maxed = lvl >= SKILL_CAP;
    const nm = nextMilestone(sel, lvl);
    const fx = (kk: Parameters<typeof fmtStat>[0], v: number) => fmtStat(kk, v);

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2">
                <div className="font-rubik text-[11px] text-muted-foreground">
                    Skill xp x{d.xpMult.toFixed(2)} from trophies, pets and enchants. Skills are permanent: rebirth and ascension never touch them.
                </div>
                <div className="flex gap-3 font-minecraft text-xs">
                    <span style={{ color: "var(--mc-green)" }}>Levels {total}<span className="text-muted-foreground">/{totalMax}</span></span>
                    <span style={{ color: "var(--mc-yellow)" }}>Milestones {claimed}<span className="text-muted-foreground">/{claimMax}</span></span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                {SKILLS.map((sk) => {
                    const l = levels[sk.id];
                    const a = skillXpFor(l, sk.id);
                    const b = skillXpFor(l + 1, sk.id);
                    const on = sel === sk.id;
                    const ms = MILESTONES_BY_SKILL[sk.id];
                    const next = ms.find((m) => m.at > l);
                    return (
                        <button
                            key={sk.id}
                            type="button"
                            onClick={() => setSel(sk.id)}
                            aria-pressed={on}
                            className="relative overflow-hidden rounded-xl border p-2.5 text-left transition-all hover:-translate-y-px hover:bg-white/5"
                            style={{ borderColor: on ? sk.color : "rgba(255,255,255,0.12)", backgroundImage: on ? `linear-gradient(140deg, ${tint(sk.color, 16)}, transparent 70%)` : undefined, boxShadow: on ? `0 0 18px -6px ${sk.color}` : undefined }}
                        >
                            <div className="flex items-center gap-2">
                                <Badge color={sk.color} size="sm"><McSymbol name={sk.symbol} /></Badge>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-minecraft text-[13px] leading-tight" style={{ color: sk.color }}>{sk.name}</div>
                                    <div className="font-rubik text-[10px] text-muted-foreground">{next ? `Next reward at ${next.at}` : "All rewards earned"}</div>
                                </div>
                                <div className="font-minecraft text-lg leading-none" style={{ color: sk.color }}>{l}</div>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full" style={{ width: `${(l >= SKILL_CAP ? 1 : (s[sk.id] - a) / (b - a)) * 100}%`, backgroundColor: sk.color, boxShadow: `0 0 8px ${sk.color}` }} />
                            </div>
                            <div className="mt-1.5 flex gap-[3px]" aria-hidden="true">
                                {ms.map((m) => (
                                    <i
                                        key={m.at}
                                        className={`h-1.5 flex-1 rounded-full ${next && m.at === next.at ? "fi-pulse" : ""}`}
                                        style={{ backgroundColor: m.at <= l ? sk.color : "rgba(255,255,255,0.12)", boxShadow: m.at <= l ? `0 0 5px ${sk.color}` : undefined }}
                                    />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="overflow-hidden rounded-2xl border p-3" style={{ borderColor: tint(k.color, 50), backgroundImage: `linear-gradient(150deg, ${tint(k.color, 10)}, transparent 55%)` }}>
                <div className="mb-2 flex items-center gap-3">
                    <Badge color={k.color}><McSymbol name={k.symbol} /></Badge>
                    <div className="min-w-0 flex-1">
                        <div className="font-minecraft text-sm" style={{ color: k.color }}>
                            {k.name} {lvl}<span className="text-muted-foreground">/{SKILL_CAP}</span>
                        </div>
                        <div className="font-rubik text-[11px] text-muted-foreground">{k.perk}</div>
                        <div className="font-rubik text-[10px] text-muted-foreground">XP from: {k.earn}</div>
                    </div>
                    <div className="text-right font-minecraft text-sm">
                        <div style={{ color: k.color }}>{k.bonus(lvl)}</div>
                        {!maxed && (
                            <div className="text-[11px]" style={{ color: "var(--mc-green)" }}>
                                <McSymbol name="arrow" /> {k.bonus(lvl + 1)}
                            </div>
                        )}
                    </div>
                </div>
                <Progress
                    label={maxed ? "Maxed" : `Level ${lvl + 1}`}
                    color={k.color}
                    pct={maxed ? 1 : (xp - lo) / (hi - lo)}
                    right={maxed ? "MAX" : `${fmt(xp - lo)} / ${fmt(hi - lo)}${passive[sel] > 0 ? ` · ${fmtEta((hi - xp) / passive[sel])} passive` : ""}`}
                />
                {sel === "enchanting" && open && (
                    <button type="button" onClick={() => open("enchant")} className="mt-2 rounded-lg border px-3 py-1 font-minecraft text-[11px] transition-colors hover:bg-white/10" style={{ borderColor: tint(k.color, 55), color: k.color }}>
                        Open the Enchant table
                    </button>
                )}

                <SectionTitle color={k.color}>Milestone path</SectionTitle>
                {nm && (
                    <div className="mb-2 font-rubik text-[11px] text-muted-foreground">
                        Next: <span style={{ color: k.color }}>{nm.name}</span> at level {nm.at} ({nm.at - lvl} level{nm.at - lvl === 1 ? "" : "s"} away)
                    </div>
                )}
                <div className="grid gap-1.5 sm:grid-cols-2">
                    {MILESTONES_BY_SKILL[sel].map((m) => {
                        const done = m.at <= lvl;
                        const isNext = nm?.at === m.at;
                        return (
                            <div
                                key={m.at}
                                className="flex gap-2 rounded-lg border p-2"
                                style={{
                                    borderColor: done ? tint(k.color, 55) : isNext ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)",
                                    backgroundColor: done ? tint(k.color, 9) : undefined,
                                    opacity: done || isNext ? 1 : 0.6,
                                }}
                            >
                                <span
                                    className="grid size-8 shrink-0 place-items-center rounded-full font-minecraft text-xs"
                                    style={done ? { backgroundColor: k.color, color: "#000", boxShadow: `0 0 10px ${k.color}` } : { border: "1px dashed rgba(255,255,255,0.3)", color: "var(--muted-foreground)" }}
                                >
                                    {done ? "✓" : m.at}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="truncate font-minecraft text-[12px]" style={{ color: done ? k.color : undefined }}>{m.name}</span>
                                        <span className="shrink-0 font-rubik text-[9px] text-muted-foreground">Lv {m.at}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-2 font-rubik text-[10px]">
                                        {m.rewards.map((r) => (
                                            <span key={rewardLine(r, fx)} style={{ color: r.grant ? "var(--mc-yellow)" : r.unlock ? "var(--mc-light-purple)" : "var(--mc-green)" }}>
                                                {rewardLine(r, fx)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

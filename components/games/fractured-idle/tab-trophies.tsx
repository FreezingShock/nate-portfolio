"use client";

import { useEffect, useRef, useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { REWARD_LABEL, TROPHIES, TROPHY_CATEGORIES, type RewardStat, type TrophyDef } from "@/lib/fractured-idle/data";
import { fmt, trophyCounts } from "@/lib/fractured-idle/engine";
import { SectionTitle, tint, type Ctx } from "./ui";

// Trophies use the same tile grid and cursor tooltip as Upgrades. Each tile is
// a chain of tiers; the tile shows how many tiers are unlocked and a thin bar
// toward the next one.

const pctText = (r: number) => `+${+(r * 100).toFixed(1)}%`;
const GRAY = "#aaaaaa";
const DARK = "#777777";

const catOf = (t: TrophyDef) => TROPHY_CATEGORIES.find((c) => c.id === t.category)!;

function progressOf(t: TrophyDef, m: number, tiers: number) {
    if (tiers >= t.tiers.length) return 1;
    const lo = tiers === 0 ? 0 : t.tiers[tiers - 1].at;
    const hi = t.tiers[tiers].at;
    return Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
}

export function TrophiesTab({ s, d, F, tip }: Ctx) {
    const [picked, setPicked] = useState<string | null>(null);
    const pointer = useRef("mouse");
    const counts = trophyCounts(s);

    useEffect(() => () => tip.hide(), [tip]);
    useEffect(() => {
        if (!picked) return;
        const off = (e: PointerEvent) => {
            if (!(e.target as HTMLElement).closest("[data-fi-tile]")) {
                setPicked(null);
                tip.hide();
            }
        };
        document.addEventListener("pointerdown", off);
        return () => document.removeEventListener("pointerdown", off);
    }, [picked, tip]);

    const bonuses = (Object.keys(REWARD_LABEL) as RewardStat[]).filter((k) => d.bonus[k] > 0);

    return (
        <>
            <div className="rounded-xl border border-white/10 p-3">
                <div className="mb-2 flex items-baseline justify-between font-minecraft font-bold text-sm" style={{ color: "var(--mc-yellow)" }}>
                    <span><McSymbol name="pristine" /> {counts.got}/{counts.all} tiers</span>
                    <span className="font-rubik text-[11px] text-muted-foreground">Hover a trophy for its tiers</span>
                </div>
                {bonuses.length === 0 ? (
                    <p className="font-rubik text-[11px] text-muted-foreground">No bonuses yet. Play a bit and trophies will start paying out.</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {bonuses.map((k) => (
                            <span key={k} className="rounded-full border border-white/15 px-2 py-0.5 font-rubik text-[10px]">
                                <b style={{ color: "var(--mc-green)" }}>{pctText(d.bonus[k])}</b> {REWARD_LABEL[k]}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {TROPHY_CATEGORIES.map((c) => {
                const list = TROPHIES.filter((t) => t.category === c.id);
                const got = list.reduce((a, t) => a + (s.tro[t.id] || 0), 0);
                const all = list.reduce((a, t) => a + t.tiers.length, 0);
                return (
                    <div key={c.id}>
                        <SectionTitle color={c.color}>
                            {c.name} <span className="text-muted-foreground">{got}/{all}</span>
                        </SectionTitle>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
                            {list.map((t) => {
                                const n = s.tro[t.id] || 0;
                                const maxed = n >= t.tiers.length;
                                const pr = progressOf(t, t.metric(s), n);
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        data-fi-tile
                                        aria-label={t.name}
                                        onPointerDown={(e) => { pointer.current = e.pointerType; }}
                                        onPointerEnter={(e) => e.pointerType === "mouse" && tip.show(`t:${t.id}`, e)}
                                        onPointerMove={(e) => e.pointerType === "mouse" && tip.move(e)}
                                        onPointerLeave={(e) => e.pointerType === "mouse" && tip.hide()}
                                        onFocus={(e) => e.currentTarget.matches(":focus-visible") && tip.show(`t:${t.id}`, e.currentTarget)}
                                        onBlur={() => tip.hide()}
                                        onClick={(e) => {
                                            setPicked(t.id);
                                            tip.show(`t:${t.id}`, e.currentTarget);
                                        }}
                                        style={{
                                            color: c.color,
                                            borderColor: maxed ? tint("var(--mc-yellow)", 60) : n > 0 ? tint(c.color, 70) : "rgba(255,255,255,0.1)",
                                            backgroundColor: n > 0 ? tint(c.color, 14) : tint(c.color, 4),
                                            opacity: n > 0 ? 1 : 0.5,
                                            boxShadow: maxed ? `0 0 14px -4px ${tint("var(--mc-yellow)", 70)}` : undefined,
                                        }}
                                        className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl border text-2xl transition-transform hover:-translate-y-0.5 ${picked === t.id ? "ring-2 ring-white/40" : ""}`}
                                    >
                                        <McSymbol name={t.symbol} />
                                        {t.tiers.length > 1 && (
                                            <span className="absolute right-1 top-0.5 font-minecraft text-[9px] leading-none text-white">{n}/{t.tiers.length}</span>
                                        )}
                                        {maxed && (
                                            <span className="absolute left-1 top-0.5 font-minecraft text-[10px] leading-none" style={{ color: "var(--mc-yellow)" }}>
                                                <McSymbol name="check" />
                                            </span>
                                        )}
                                        {!maxed && (
                                            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                                                <span className="block h-full" style={{ width: `${pr * 100}%`, backgroundColor: c.color }} />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

function TL({ c = GRAY, children }: { c?: string; children?: React.ReactNode }) {
    return <div className="tl" style={{ color: c, minHeight: children ? undefined : "0.7em" }}>{children}</div>;
}

/** Minecraft-style tooltip body for one trophy chain (rendered by the game root). */
export function TrophyTip({ id, s, F }: { id: string } & Pick<Ctx, "s" | "F">) {
    const t = TROPHIES.find((x) => x.id === id);
    if (!t) return null;
    const c = catOf(t);
    const n = s.tro[t.id] || 0;
    const m = t.metric(s);
    const earned = t.tiers.slice(0, n).reduce((a, x) => a + x.reward, 0);
    const label = REWARD_LABEL[t.stat];
    const next = t.tiers[n];
    return (
        <>
            <TL c={c.color}>
                <McSymbol name={t.symbol} /> {t.name}
                {t.tiers.length > 1 && <span style={{ color: DARK }}> Tier {n}/{t.tiers.length}</span>}
            </TL>
            <TL c={DARK}>{c.name} trophy</TL>
            <TL />
            {t.tiers.map((x, i) => {
                const done = i < n;
                const isNext = i === n;
                return (
                    <TL key={i} c={done ? "#55ff55" : isNext ? "#ffff55" : DARK}>
                        {done ? <McSymbol name="check" /> : "·"} {fmt(x.at, s.sci)} {t.unit}: {pctText(x.reward)} {label}
                    </TL>
                );
            })}
            <TL />
            <TL c="#ffaa00">Earned: <span style={{ color: earned > 0 ? "#55ff55" : DARK }}>{earned > 0 ? pctText(earned) : "none yet"}</span> {label}</TL>
            {next ? (
                <TL>Progress: <span style={{ color: "#ffffff" }}>{F(m)}</span> / {F(next.at)}</TL>
            ) : (
                <TL c="#55ff55"><McSymbol name="check" /> Complete</TL>
            )}
        </>
    );
}

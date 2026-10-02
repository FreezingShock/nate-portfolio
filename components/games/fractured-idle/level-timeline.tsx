"use client";

import { fmtPct } from "@/lib/fractured-idle/format";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { BADGE_SYMBOLS, FXP_PER_LEVEL, LEVEL_BONUS, MAX_DISPLAY_LEVEL, PREFIXES, hasReward, levelColor, rewardFor } from "@/lib/fractured-idle/fxp";
import { perkAt } from "@/lib/fractured-idle/sagas";
import { Buffs, GOLD, css } from "./level-parts";

// The timeline: every level from 1 to 400 on one scrolling line. Milestones (rewards, perks, badges) are bigger
// nodes with their rewards; "Every level" also shows the plain levels between them. It opens scrolled to you.

interface Row {
    level: number;
    milestone: boolean;
}

const MILESTONES: Row[] = Array.from({ length: MAX_DISPLAY_LEVEL }, (_, i) => i + 1).map((level) => ({ level, milestone: hasReward(rewardFor(level)) || !!perkAt(level) }));

const BAND = 40;

const Node = memo(function Node({ level, milestone, state }: Row & { state: "past" | "now" | "next" | "future" }) {
    const r = rewardFor(level);
    const perk = perkAt(level);
    const symbols = BADGE_SYMBOLS.filter((b) => b.at === level && !b.saga);
    const prefixes = PREFIXES.filter((p) => p.need?.stat === "level" && p.need.n === level);
    const past = state === "past" || state === "now";
    return (
        <div className="fi-lv-row" id={`fi-lvl-${level}`} data-p={past} data-m={milestone} data-now={state === "now"} data-next={state === "next"} style={css({ "--lk": levelColor(level) })}>
            <span className="fi-lv-row-l">{level}</span>
            <span className="fi-lv-dot" />
            <div className="fi-lv-card">
                <div className="fi-lv-card-t">
                    {perk ? perk.name : milestone ? `Level ${level}` : `Level ${level}`}
                    {past && state !== "now" && <span className="ok">✔</span>}
                    {state === "next" && <em>NEXT MILESTONE</em>}
                </div>
                {milestone ? (
                    <>
                        {perk && <Buffs buff={perk.buff} dim={!past} />}
                        <span className="fi-lv-chips">
                            {r.tokens > 0 && <span className="fi-lv-chip" style={css({ "--k": "#ff6a5f" })}>+{r.tokens} rebirth tokens</span>}
                            {r.eggs > 0 && <span className="fi-lv-chip" style={css({ "--k": "#ff8fc7" })}>+{r.eggs} Wooden Egg</span>}
                            {r.ap > 0 && <span className="fi-lv-chip" style={css({ "--k": "#57d8ff" })}>+{r.ap} gem{r.ap > 1 ? "s" : ""}</span>}
                            {symbols.map((b) => (
                                <span key={b.id} className="fi-lv-chip" style={css({ "--k": "#e8a8ff" })}>{b.symbol && <McSymbol name={b.symbol} />} {b.name} badge</span>
                            ))}
                            {prefixes.map((p) => (
                                <span key={p.id} className="fi-lv-chip" style={css({ "--k": p.color === "rainbow" ? "#ffffff" : p.color })}>{p.name} prefix</span>
                            ))}
                        </span>
                    </>
                ) : (
                    <p className="fi-lv-card-s">+{fmtPct(LEVEL_BONUS, 2)} all shards</p>
                )}
            </div>
        </div>
    );
});

export function TimelineView({ lvl, into }: { lvl: number; into: number }) {
    const [mode, setMode] = useState<"milestones" | "all">("milestones");
    const box = useRef<HTMLDivElement>(null);
    const rows = useMemo(() => (mode === "all" ? MILESTONES : MILESTONES.filter((r) => r.milestone)), [mode]);
    const nextM = MILESTONES.find((r) => r.milestone && r.level > lvl)?.level ?? 0;

    const jump = (level: number, smooth = true) => {
        const el = box.current?.querySelector<HTMLElement>(`#fi-lvl-${level}`);
        if (el && box.current) box.current.scrollTo({ top: Math.max(0, el.offsetTop - box.current.clientHeight / 2 + 40), behavior: smooth ? "smooth" : "auto" });
    };
    // Open on your level, and again whenever the filter changes.
    useEffect(() => {
        const id = requestAnimationFrame(() => jump(Math.max(1, lvl), false));
        return () => cancelAnimationFrame(id);
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Where the gold stops: the reached part of the line.
    const reached = rows.filter((r) => r.level <= lvl).length;
    const pr = rows.length ? Math.min(100, ((reached + (into / FXP_PER_LEVEL) * (mode === "all" ? 1 : 0)) / rows.length) * 100) : 0;

    // "you are here" sits after the last reached row, then rows for the rest. Bands (40 levels) get a sticky header.
    const out: React.ReactNode[] = [];
    let band = -1;
    let prev = 0;
    let marked = rows.some((r) => r.level === lvl); // a milestone you are standing on already marks the spot
    for (const r of rows) {
        const b = Math.floor(r.level / BAND);
        if (b !== band) {
            band = b;
            out.push(
                <div key={`b${b}`} className="fi-lv-band" style={css({ "--bk": levelColor(b * BAND) })}>
                    Levels {Math.max(1, b * BAND)} to {Math.min(MAX_DISPLAY_LEVEL, b * BAND + BAND - 1)}
                </div>,
            );
        }
        if (mode === "milestones" && r.level - prev > 1) out.push(<div key={`g${r.level}`} className="fi-lv-gap">{r.level - prev - 1} level{r.level - prev - 1 === 1 ? "" : "s"} of +{fmtPct(LEVEL_BONUS, 2)} all shards each</div>);
        const state = r.level === lvl ? "now" : r.level < lvl ? "past" : r.level === nextM ? "next" : "future";
        if (!marked && r.level > lvl && mode === "milestones" && lvl > 0) {
            marked = true;
            out.push(
                <div key="here" className="fi-lv-row" id={`fi-lvl-${lvl}`} data-p="true" data-m="false" data-now="true" style={css({ "--lk": levelColor(lvl) })}>
                    <span className="fi-lv-row-l">{lvl}</span>
                    <span className="fi-lv-dot" />
                    <div className="fi-lv-card"><div className="fi-lv-card-t">You are here <em>{into} / {FXP_PER_LEVEL} XP</em></div></div>
                </div>,
            );
        }
        out.push(<Node key={r.level} level={r.level} milestone={r.milestone} state={state} />);
        prev = r.level;
    }

    return (
        <>
            <div className="fi-lv-tl-bar" style={css({ "--sc": GOLD })}>
                <span className="fi-lv-seg" role="tablist">
                    <button type="button" data-on={mode === "milestones"} onClick={() => setMode("milestones")}>Milestones</button>
                    <button type="button" data-on={mode === "all"} onClick={() => setMode("all")}>Every level</button>
                </span>
                <button type="button" className="fi-lv-btn ghost" onClick={() => jump(Math.max(1, lvl))}>Jump to me</button>
                {nextM > 0 && <button type="button" className="fi-lv-btn" onClick={() => jump(nextM)}>Next milestone: Lv {nextM}</button>}
                <button type="button" className="fi-lv-btn ghost" onClick={() => box.current?.scrollTo({ top: 0, behavior: "smooth" })}>Top</button>
            </div>
            <div className="fi-lv-tl" ref={box}>
                <div className="fi-lv-tl-in" style={css({ "--pr": `${pr}%` })}>
                    {out}
                    <div className="fi-lv-end">
                        <b>Level {MAX_DISPLAY_LEVEL}+</b> The badge turns gold at {MAX_DISPLAY_LEVEL}, but Fracture EXP never stops: every ascension keeps paying, and each level is still +{fmtPct(LEVEL_BONUS, 2)} all shards.
                    </div>
                </div>
            </div>
        </>
    );
}

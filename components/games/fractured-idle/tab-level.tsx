"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import {
    FXP_PER_LEVEL,
    LEVEL_BONUS,
    MAX_DISPLAY_LEVEL,
    BADGE_SYMBOLS,
    fxpSources,
    fxpTotal,
    hasReward,
    levelColor,
    prefixOf,
    prefixOpen,
    rewardFor,
    rewardText,
    symbolOf,
    symbolOpen,
    PREFIXES,
} from "@/lib/fractured-idle/fxp";
import {
    CHAPTERS,
    JOURNEY_TOTAL,
    LEVEL_PERKS,
    SAGAS,
    chapterFrac,
    chapterReady,
    claimAllJourney,
    claimChapter,
    claimFinale,
    currentChapter,
    finaleReady,
    journeyDone,
    journeyReady,
    levelFx,
    perkAt,
    sagaFx,
    sagasDone,
    tasksDone,
    type Buff,
    type SagaId,
} from "@/lib/fractured-idle/sagas";
import { BadgesView } from "./level-badges";
import { LEVEL_PAGE_CSS } from "./level-css";
import { LevelBadge } from "./level-badge";
import { takeLevelWant, type LevelView } from "./level-nav";
import { Bar, Buffs, GOLD, Grants, SagaCard, css } from "./level-parts";
import { SagasView } from "./level-sagas";
import { SourcesView } from "./level-sources";
import { TimelineView } from "./level-timeline";
import type { Ctx } from "./ui";

// The Level page, in the Play group: your Fractured Level and its rewards, plus the Sagas (a story with four chapters
// for every skill; finishing them pays permanent buffs). Five views: Journey (what to do next), Sagas, Timeline of
// every level, where Fracture EXP comes from, and Badges.

const NAV: { id: LevelView; label: string; symbol: McSymbolName; color: string }[] = [
    { id: "journey", label: "Journey", symbol: "flag", color: "#7dffb8" },
    { id: "sagas", label: "Sagas", symbol: "wisdom", color: "#ffd23a" },
    { id: "timeline", label: "Timeline", symbol: "arrow", color: "#57d8ff" },
    { id: "sources", label: "EXP sources", symbol: "pristine", color: "#ff8fc7" },
    { id: "badges", label: "Badges", symbol: "star", color: "#c58bff" },
];

const Timeline = memo(TimelineView);

export function LevelTab({ s, F, act, say, render, open }: Ctx & { open: (tab: string) => void }) {
    const [init] = useState(() => takeLevelWant());
    const [view, setView] = useState<LevelView>(init?.view ?? "journey");
    const [saga, setSaga] = useState<SagaId>(() => init?.saga ?? (SAGAS.find((x) => x.chapters.some((c) => chapterReady(s, c))) ?? SAGAS.find((x) => currentChapter(s, x)) ?? SAGAS[0]).id);
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);
    // The sources are the heaviest thing here, so they are only read on that view (and once a second).
    const sources = useMemo(() => (view === "sources" ? fxpSources(s) : []), [view, tick, s]); // eslint-disable-line react-hooks/exhaustive-deps

    const total = fxpTotal(s);
    const into = total - s.lvl * FXP_PER_LEVEL;
    const lc = levelColor(s.lvl);
    const ready = journeyReady(s);
    const sym = symbolOf(s);
    const pfx = prefixOf(s);
    const nextPerk = LEVEL_PERKS.find((p) => p.at > s.lvl);
    const openSymbols = BADGE_SYMBOLS.filter((b) => b.symbol && symbolOpen(s, b)).length;
    const openPrefixes = PREFIXES.filter((p) => p.id !== "none" && prefixOpen(s, p)).length;

    const go = (v: LevelView, id?: SagaId) => {
        if (id) setSaga(id);
        setView(v);
    };

    return (
        <div className="fi-lv">
            <style>{LEVEL_PAGE_CSS}</style>

            <div className="fi-lv-hero" style={css({ "--lc": lc })}>
                <div className="fi-lv-top">
                    <LevelBadge level={s.lvl} sym={sym} prefix={pfx} size="lg" />
                    <div className="fi-lv-stats">
                        <div className="fi-lv-stat" style={css({ "--k": "var(--mc-green)" })}><b>+{+(LEVEL_BONUS * s.lvl * 100).toFixed(1)}%</b><span>all shards</span></div>
                        <div className="fi-lv-stat" style={css({ "--k": GOLD })}><b>{journeyDone(s)}/{JOURNEY_TOTAL}</b><span>chapters</span></div>
                        <div className="fi-lv-stat" style={css({ "--k": "var(--mc-light-purple)" })}><b>{LEVEL_PERKS.filter((p) => s.lvl >= p.at).length}/{LEVEL_PERKS.length}</b><span>level perks</span></div>
                    </div>
                </div>
                <div className="fi-lv-xp">
                    <div className="fi-lv-xp-r">
                        <span>Level {s.lvl} to {s.lvl + 1}</span>
                        <span><b>{into}</b> / {FXP_PER_LEVEL} XP · {F(total)} total</span>
                    </div>
                    <Bar pct={into / FXP_PER_LEVEL} />
                </div>
                <div className="fi-lv-hero-f">
                    <span className="fi-lv-note">
                        {nextPerk ? <>Next perk at level <b style={{ color: "#fff" }}>{nextPerk.at}</b>: {nextPerk.name}.</> : "Every perk unlocked."} Each level is +{+(LEVEL_BONUS * 100).toFixed(2)}% all shards.
                    </span>
                    {ready > 0 && (
                        <button
                            type="button"
                            className="fi-lv-btn go"
                            data-snd="off"
                            onClick={() =>
                                act(() => {
                                    const got = claimAllJourney(s);
                                    const n = got.chapters.length + got.sagas.length;
                                    if (n) say(`Claimed ${got.chapters.length} chapter${got.chapters.length === 1 ? "" : "s"}${got.sagas.length ? ` and ${got.sagas.length} finale${got.sagas.length === 1 ? "" : "s"}` : ""}.`);
                                    return n > 0;
                                }, "trophy")
                            }
                        >
                            Claim all ({ready})
                        </button>
                    )}
                </div>
            </div>

            <div className="fi-lv-nav" role="tablist" aria-label="Level page">
                {NAV.map((n) => (
                    <button key={n.id} type="button" role="tab" aria-selected={view === n.id} data-on={view === n.id} style={css({ "--nc": n.color })} onClick={() => setView(n.id)}>
                        <McSymbol name={n.symbol} />
                        <span className="t">{n.label}</span>
                        {n.id === "sagas" && ready > 0 && <i>{ready}</i>}
                    </button>
                ))}
            </div>

            {view === "journey" && <Journey s={s} F={F} act={act} say={say} open={open} go={go} openSymbols={openSymbols} openPrefixes={openPrefixes} />}
            {view === "sagas" && <SagasView s={s} F={F} act={act} say={say} open={open} sel={saga} setSel={setSaga} />}
            {view === "timeline" && <Timeline lvl={s.lvl} into={into} />}
            {view === "sources" && <SourcesView s={s} F={F} sources={sources} />}
            {view === "badges" && <BadgesView s={s} render={render} />}
        </div>
    );
}

// ---- Journey ----

function Journey({ s, F, act, say, open, go, openSymbols, openPrefixes }: Pick<Ctx, "s" | "F" | "act" | "say"> & { open: (tab: string) => void; go: (v: LevelView, id?: SagaId) => void; openSymbols: number; openPrefixes: number }) {
    // What to do next: every chapter that is ready, then the chapters closest to done, one per saga.
    const picks = SAGAS.map((x) => ({ x, c: currentChapter(s, x) }))
        .filter((p): p is { x: (typeof SAGAS)[number]; c: NonNullable<typeof p.c> } => !!p.c)
        .sort((a, b) => Number(chapterReady(s, b.c)) - Number(chapterReady(s, a.c)) || chapterFrac(s, b.c) - chapterFrac(s, a.c))
        .slice(0, 3);
    const finales = SAGAS.filter((x) => finaleReady(s, x));
    const fresh = s.chap.length === 0;

    const nextMs: { level: number; text: string; perk?: string; buff?: Buff[] }[] = [];
    for (let l = s.lvl + 1; l <= MAX_DISPLAY_LEVEL && nextMs.length < 4; l++) {
        const r = rewardFor(l);
        const p = perkAt(l);
        if (hasReward(r) || p) nextMs.push({ level: l, text: rewardText({ ...r, unlocks: r.unlocks.filter((u) => !u.endsWith(" perk")) }), perk: p?.name, buff: p?.buff });
    }

    const lf = Object.entries(levelFx(s)) as Buff[];
    const sf = Object.entries(sagaFx(s)) as Buff[];

    return (
        <>
            {fresh && (
                <p className="fi-lv-note" style={{ padding: ".1rem .2rem" }}>
                    <b style={{ color: "#fff" }}>Welcome to the Level page.</b> Every skill has a Saga: four chapters of simple tasks that complete on their own as you play. Finish a chapter, claim it here, and keep its buff forever. Start with whichever skill you like; the cards below always show the best next step.
                </p>
            )}

            <div className="fi-lv-h" style={css({ "--hc": "#7dffb8" })}>Continue your journey <small>{journeyDone(s)} of {JOURNEY_TOTAL} claimed</small></div>
            <div className="fi-lv-next">
                {finales.map((x) => (
                    <div key={`f${x.id}`} className="fi-lv-cont" data-ready="true" style={css({ "--sc": x.color })}>
                        <div className="fi-lv-cont-h"><McSymbol name={x.symbol} />{x.name}<em>Finale</em></div>
                        <div className="fi-lv-cont-t">{x.finale.name} is ready</div>
                        <Buffs buff={x.finale.buff} />
                        <div className="fi-lv-cont-f">
                            <Grants grant={x.finale.grant} xp={x.finale.xp} />
                            <button
                                type="button"
                                className="fi-lv-btn go"
                                data-snd="off"
                                onClick={() =>
                                    act(() => {
                                        const got = claimFinale(s, x.id);
                                        if (got) say(`${got.name} complete! ${got.finale.name} unlocked.`);
                                        return !!got;
                                    }, "tier")
                                }
                            >
                                Claim
                            </button>
                        </div>
                    </div>
                ))}
                {picks.map(({ x, c }) => {
                    const rd = chapterReady(s, c);
                    const t = c.tasks.find((k) => k.prog(s)[0] < k.prog(s)[1]);
                    const pr = t?.prog(s);
                    return (
                        <div key={c.id} className="fi-lv-cont" data-ready={rd} style={css({ "--sc": x.color })}>
                            <div className="fi-lv-cont-h">
                                <McSymbol name={x.symbol} />
                                {x.name} · Ch {c.n}
                                <em>{tasksDone(s, c)}/{c.tasks.length} tasks</em>
                            </div>
                            <div className="fi-lv-cont-t">{rd ? `${c.name} is ready to claim` : t?.text}</div>
                            {pr && !rd && (
                                <div className="fi-lv-cont-p">
                                    <Bar pct={pr[0] / pr[1]} color={x.color} thin />
                                    <span>{F(Math.min(pr[0], pr[1]))} / {F(pr[1])}</span>
                                </div>
                            )}
                            <Buffs buff={c.buff} dim={!rd} />
                            <div className="fi-lv-cont-f">
                                <button type="button" className="fi-lv-btn ghost" onClick={() => go("sagas", x.id)}>{c.name}</button>
                                {rd ? (
                                    <button
                                        type="button"
                                        className="fi-lv-btn go"
                                        data-snd="off"
                                        onClick={() =>
                                            act(() => {
                                                const got = claimChapter(s, c.id);
                                                if (got) say(`${x.name}, chapter ${got.n}: ${got.name}. Permanent buff unlocked!`);
                                                return !!got;
                                            }, "trophy")
                                        }
                                    >
                                        Claim
                                    </button>
                                ) : (
                                    t && <button type="button" className="fi-lv-btn" onClick={() => open(t.tab)}>Go</button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {picks.length === 0 && finales.length === 0 && <p className="fi-lv-note">Every chapter of every saga is claimed. Nicely done.</p>}
            </div>

            <div className="fi-lv-h" style={css({ "--hc": "#ffd23a" })}>The sagas <small>{sagasDone(s)} of {SAGAS.length} complete</small></div>
            <div className="fi-lv-sagas">
                {SAGAS.map((x) => (
                    <SagaCard key={x.id} s={s} x={x} onClick={() => go("sagas", x.id)} />
                ))}
            </div>

            <div className="fi-lv-h" style={css({ "--hc": "#57d8ff" })}>Coming up on the timeline</div>
            <div className="fi-lv-next">
                {nextMs.map((m) => (
                    <button key={m.level} type="button" className="fi-lv-cont" style={css({ "--sc": levelColor(m.level), textAlign: "left", color: "#fff" })} onClick={() => go("timeline")}>
                        <div className="fi-lv-cont-h">Level {m.level}<em>{m.level - s.lvl} to go</em></div>
                        {m.perk && <div className="fi-lv-cont-t">{m.perk}</div>}
                        {m.buff && <Buffs buff={m.buff} dim />}
                        {m.text && <span className="fi-lv-note">{m.text}</span>}
                    </button>
                ))}
            </div>

            <div className="fi-lv-h" style={css({ "--hc": "var(--mc-green)" })}>Your permanent buffs</div>
            <div className="fi-lv-led">
                <div style={css({ "--k": "#7dffb8" })}>
                    <b>From your level</b>
                    {lf.length ? <Buffs buff={lf} /> : <span className="fi-lv-note">Reach level {LEVEL_PERKS[0].at} for the first perk.</span>}
                </div>
                <div style={css({ "--k": "#ffd23a" })}>
                    <b>From sagas</b>
                    {sf.length ? <Buffs buff={sf} /> : <span className="fi-lv-note">Claim a chapter to start stacking these.</span>}
                </div>
            </div>
            <p className="fi-lv-note">
                {CHAPTERS.length} chapters, {SAGAS.length} finales and {LEVEL_PERKS.length} level perks, plus {openSymbols} badge symbols and {openPrefixes} prefixes unlocked so far.{" "}
                <button type="button" className="fi-lv-btn ghost" style={{ padding: ".1rem .5rem" }} onClick={() => go("badges")}>Open badges</button>
            </p>
        </>
    );
}

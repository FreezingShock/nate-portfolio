"use client";

import { fmtPct } from "@/lib/fractured-idle/format";
import { fmtInt } from "@/lib/fractured-idle/format";
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
import { LEVEL_PERKS, SAGAS, chapterReady as sagaChapterReady, claimAllJourney, currentChapter as sagaCurrent, journeyReady, type SagaId } from "@/lib/fractured-idle/sagas";
import { CHAPTER_COUNT, chapterReady, claimChapter } from "@/lib/fractured-idle/chapters";
import { BadgesView } from "./level-badges";
import { LEVEL_PAGE_CSS } from "./level-css";
import { LevelBadge } from "./level-badge";
import { takeLevelWant, type LevelView } from "./level-nav";
import { TabBar, type TabItem } from "./tab-bar";
import { ChaptersView } from "./level-chapters";
import { Bar, GOLD, css } from "./level-parts";
import { SagasView } from "./level-sagas";
import { SourcesView } from "./level-sources";
import { TimelineView } from "./level-timeline";
import type { Ctx } from "./ui";

// The Level page, in the Play group: your Fractured Level and its rewards, plus the Sagas (a story with four chapters
// for every skill; finishing them pays permanent buffs). Five views: Chapters (ten chapters of 40 levels, a checklist of what earns Fracture EXP), Sagas, Timeline of
// every level, where Fracture EXP comes from, and Badges.

const NAV: TabItem<LevelView>[] = [
    { id: "chapters", group: "", label: "Chapters", symbol: "flag", color: "#7dffb8", blurb: "Chapters of 40 levels. Each checklist is what earns Fracture EXP." },
    { id: "sagas", group: "", label: "Sagas", symbol: "wisdom", color: "#ffd23a" },
    { id: "timeline", group: "", label: "Timeline", symbol: "arrow", color: "#57d8ff" },
    { id: "sources", group: "", label: "EXP sources", symbol: "pristine", color: "#ff8fc7" },
    { id: "badges", group: "", label: "Badges", symbol: "star", color: "#c58bff" },
];

const Timeline = memo(TimelineView);

export function LevelTab({ s, F, act, say, render, open }: Ctx & { open: (tab: string) => void }) {
    const [init] = useState(() => takeLevelWant());
    const [view, setView] = useState<LevelView>(init?.view ?? "chapters");
    const [saga, setSaga] = useState<SagaId>(() => init?.saga ?? (SAGAS.find((x) => x.chapters.some((c) => sagaChapterReady(s, c))) ?? SAGAS.find((x) => sagaCurrent(s, x)) ?? SAGAS[0]).id);
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
    const sagaReady = journeyReady(s);
    const chReady = chapterReady(s, s.lch + 1) ? 1 : 0;
    const ready = sagaReady + chReady;
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
                        <div className="fi-lv-stat" style={css({ "--k": "var(--mc-green)" })}><b>+{fmtPct(LEVEL_BONUS * s.lvl, 1)}</b><span>all shards</span></div>
                        <div className="fi-lv-stat" style={css({ "--k": GOLD })}><b>{s.lch}/{CHAPTER_COUNT}</b><span>chapters</span></div>
                        <div className="fi-lv-stat" style={css({ "--k": "var(--mc-light-purple)" })}><b>{LEVEL_PERKS.filter((p) => s.lvl >= p.at).length}/{LEVEL_PERKS.length}</b><span>level perks</span></div>
                    </div>
                </div>
                <div className="fi-lv-xp">
                    <div className="fi-lv-xp-r">
                        <span>Level {fmtInt(s.lvl)} to {s.lvl + 1}</span>
                        <span><b>{into}</b> / {FXP_PER_LEVEL} XP · {F(total)} total</span>
                    </div>
                    <Bar pct={into / FXP_PER_LEVEL} />
                </div>
                <div className="fi-lv-hero-f">
                    <span className="fi-lv-note">
                        {nextPerk ? <>Next perk at level <b style={{ color: "#fff" }}>{nextPerk.at}</b>: {nextPerk.name}.</> : "Every perk unlocked."} Each level is +{fmtPct(LEVEL_BONUS, 2)} all shards.
                    </span>
                    {ready > 0 && (
                        <button
                            type="button"
                            className="fi-lv-btn go"
                            data-snd="off"
                            onClick={() =>
                                act(() => {
                                    const got = claimAllJourney(s);
                                    let lv = 0;
                                    while (claimChapter(s, s.lch + 1)) lv++;
                                    const n = got.chapters.length + got.sagas.length + lv;
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

            <TabBar
                tabs={NAV}
                current={view}
                label="Level page"
                keys={false}
                onSelect={setView}
                notes={{
                    chapters: chReady > 0 ? [{ text: `Chapter ${s.lch + 1} is ready to claim`, color: "#7dffb8", act: true, n: 1 }] : [],
                    sagas: sagaReady > 0 ? [{ text: `${sagaReady} saga chapter${sagaReady === 1 ? "" : "s"} to claim`, color: "#ffd23a", act: true, n: sagaReady }] : [],
                }}
            />

            {view === "chapters" && <ChaptersView s={s} F={F} act={act} say={say} open={open} goSagas={() => go("sagas")} />}
            {view === "sagas" && <SagasView s={s} F={F} act={act} say={say} open={open} sel={saga} setSel={setSaga} />}
            {view === "timeline" && <Timeline lvl={s.lvl} into={into} />}
            {view === "sources" && <SourcesView s={s} F={F} sources={sources} />}
            {view === "badges" && <BadgesView s={s} render={render} />}
        </div>
    );
}

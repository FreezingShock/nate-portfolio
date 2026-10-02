"use client";

import { useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import {
    BADGE_SYMBOLS,
} from "@/lib/fractured-idle/fxp";
import {
    SAGAS,
    SAGA_BONUS,
    chapterClaimed,
    chapterDone,
    chapterFrac,
    chapterReady,
    claimAllJourney,
    claimChapter,
    claimFinale,
    currentChapter,
    finaleClaimed,
    finaleReady,
    sagaClaimed,
    sagaComplete,
    sagasDone,
    taskDone,
    tasksDone,
    type Chapter,
    type Saga,
} from "@/lib/fractured-idle/sagas";
import { Bar, Buffs, GOLD, Grants, SagaCard, css, pipsOf } from "./level-parts";
import type { Ctx } from "./ui";

// The Sagas view: pick a saga, see its four chapters. Tasks complete as you play; a finished chapter is claimed here.

type P = Pick<Ctx, "s" | "F" | "act" | "say"> & { open: (tab: string) => void };

function ChapterCard({ s, F, act, say, open, x, c, isOpen, toggle }: P & { x: Saga; c: Chapter; isOpen: boolean; toggle: () => void }) {
    const claimed = chapterClaimed(s, c);
    const ready = chapterReady(s, c);
    const cur = currentChapter(s, x)?.id === c.id;
    const state = claimed ? "done" : ready ? "ready" : cur ? "now" : "later";
    const done = tasksDone(s, c);
    return (
        <div className="fi-lv-ch" data-s={state} id={`fi-ch-${c.id}`}>
            <button type="button" className="fi-lv-ch-h" onClick={toggle} aria-expanded={isOpen} data-snd="tab">
                <span className="fi-lv-ch-n">{claimed ? "✔" : c.n}</span>
                <span className="fi-lv-ch-t">
                    <b>Chapter {c.n}: {c.name}</b>
                    <span>{c.blurb}</span>
                </span>
                <span className="fi-lv-ch-s">{claimed ? "Claimed" : ready ? "Ready!" : `${done}/${c.tasks.length} tasks`}</span>
            </button>
            {isOpen && (
                <div className="fi-lv-ch-b">
                    <Bar pct={claimed ? 1 : chapterFrac(s, c)} color={x.color} thin />
                    <div className="fi-lv-tasks">
                        {c.tasks.map((t) => {
                            const [a, n] = t.prog(s);
                            const d = taskDone(s, t);
                            return (
                                <div key={t.id} className="fi-lv-task" data-d={d}>
                                    <span className="fi-lv-task-m">✔</span>
                                    <span className="fi-lv-task-t">
                                        {t.text}
                                        {!d && n > 1 && <Bar pct={a / n} color={x.color} thin />}
                                    </span>
                                    <span className="fi-lv-task-r">
                                        {!d && n > 1 && <span>{F(Math.min(a, n))} / {F(n)}</span>}
                                        {!d && <button type="button" className="fi-lv-task-go" onClick={() => open(t.tab)}>Go</button>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="fi-lv-pay">
                        <span className="fi-lv-pay-l">
                            <small>{claimed ? "Permanent buff" : "Reward"}</small>
                            <Buffs buff={c.buff} dim={!claimed} />
                            <Grants grant={c.grant} xp={c.xp} />
                        </span>
                        {claimed ? (
                            <span className="fi-lv-chip" style={css({ "--k": x.color })}>Claimed</span>
                        ) : (
                            <button
                                type="button"
                                className={`fi-lv-btn${ready ? " go" : ""}`}
                                disabled={!ready}
                                data-snd="off"
                                onClick={() =>
                                    act(() => {
                                        const got = claimChapter(s, c.id);
                                        if (got) say(`${x.name}, chapter ${got.n}: ${got.name}. Permanent buff unlocked!`);
                                        return !!got;
                                    }, "trophy")
                                }
                            >
                                {ready ? "Claim chapter" : chapterDone(s, c) ? "Claimed" : "Finish the tasks"}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Finale({ s, act, say, x }: Pick<P, "s" | "act" | "say"> & { x: Saga }) {
    const claimed = finaleClaimed(s, x);
    const ready = finaleReady(s, x);
    const badge = BADGE_SYMBOLS.find((b) => b.id === x.finale.badge);
    return (
        <div className="fi-lv-fin" data-s={claimed ? "done" : ready ? "ready" : "locked"}>
            <span className="fi-lv-fin-i"><McSymbol name={x.symbol} /></span>
            <span className="fi-lv-fin-t">
                <b>Finale: {x.finale.name}</b>
                <span className="fi-lv-note">Claim all four chapters to finish the saga.</span>
                <Buffs buff={x.finale.buff} dim={!claimed} />
                <Grants grant={x.finale.grant} xp={x.finale.xp} />
                {badge && (
                    <span className="fi-lv-chips" style={{ marginTop: ".25rem" }}>
                        <span className="fi-lv-chip" style={css({ "--k": x.color })}>{badge.symbol && <McSymbol name={badge.symbol} />} {badge.name} badge symbol</span>
                    </span>
                )}
            </span>
            {claimed ? (
                <span className="fi-lv-chip" style={css({ "--k": x.color })}>Saga complete</span>
            ) : (
                <button
                    type="button"
                    className={`fi-lv-btn${ready ? " go" : ""}`}
                    disabled={!ready}
                    data-snd="off"
                    onClick={() =>
                        act(() => {
                            const got = claimFinale(s, x.id);
                            if (got) say(`${got.name} complete! ${got.finale.name} unlocked.`);
                            return !!got;
                        }, "tier")
                    }
                >
                    {ready ? "Claim finale" : "Locked"}
                </button>
            )}
        </div>
    );
}

function SagaDetail({ s, F, act, say, open, x }: P & { x: Saga }) {
    const cur = currentChapter(s, x);
    const [openN, setOpenN] = useState<number>(cur?.n ?? x.chapters.length);
    const claimed = sagaClaimed(s, x);
    const pips = pipsOf(s, x);
    return (
        <>
            <div className="fi-lv-ban" style={css({ "--sc": x.color, "--bg": x.bg })}>
                <span className="fi-lv-ban-mark"><McSymbol name={x.symbol} /></span>
                <h3>{x.name}</h3>
                <p>{x.flavor}</p>
                <div className="fi-lv-ban-r">
                    <span>{sagaComplete(s, x) ? (finaleClaimed(s, x) ? "Saga complete" : "Finale ready") : `${claimed} of ${x.chapters.length} chapters`}</span>
                    <Bar pct={(claimed + (finaleClaimed(s, x) ? 1 : 0)) / (x.chapters.length + 1)} color={x.color} />
                </div>
            </div>

            <div className="fi-lv-step" style={css({ "--sc": x.color })} role="tablist" aria-label="Chapters">
                {pips.map((p, i) => {
                    const fin = i === x.chapters.length;
                    return (
                        <span key={i} style={{ display: "contents" }}>
                            {i > 0 && <hr data-on={pips[i - 1] === "done"} />}
                            <button
                                type="button"
                                data-s={p === "none" ? "" : p}
                                data-open={!fin && openN === i + 1}
                                aria-label={fin ? "Finale" : `Chapter ${i + 1}`}
                                onClick={() => {
                                    if (fin) document.getElementById(`fi-fin-${x.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    else {
                                        setOpenN(i + 1);
                                        document.getElementById(`fi-ch-${x.id}:${i + 1}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    }
                                }}
                            >
                                {fin ? <McSymbol name="star" /> : i + 1}
                            </button>
                        </span>
                    );
                })}
            </div>

            <div className="fi-lv-chs" style={css({ "--sc": x.color })}>
                {x.chapters.map((c) => (
                    <ChapterCard key={c.id} s={s} F={F} act={act} say={say} open={open} x={x} c={c} isOpen={openN === c.n} toggle={() => setOpenN(openN === c.n ? 0 : c.n)} />
                ))}
                <div id={`fi-fin-${x.id}`} style={css({ "--sc": x.color })}>
                    <Finale s={s} act={act} say={say} x={x} />
                </div>
            </div>
        </>
    );
}

export function SagasView({ s, F, act, say, open, sel, setSel }: P & { sel: Saga["id"]; setSel: (id: Saga["id"]) => void }) {
    const x = SAGAS.find((a) => a.id === sel) ?? SAGAS[0];
    const ready = SAGAS.reduce((a, g) => a + g.chapters.filter((c) => chapterReady(s, c)).length + Number(finaleReady(s, g)), 0);
    return (
        <>
            <div className="fi-lv-sagas">
                {SAGAS.map((g) => (
                    <SagaCard key={g.id} s={s} x={g} on={g.id === x.id} onClick={() => setSel(g.id)} />
                ))}
            </div>
            <div className="fi-lv-tools" style={{ justifyContent: "space-between" }}>
                <span className="fi-lv-chips">
                    {SAGA_BONUS.map((b) => (
                        <span key={b.n} className="fi-lv-chip" style={css({ "--k": sagasDone(s) >= b.n ? GOLD : "#8b86a0" })} title={`Finish ${b.n} sagas: ${b.name}`}>
                            {sagasDone(s) >= b.n ? "✔" : "◇"} {b.n} sagas: {b.name}
                        </span>
                    ))}
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
            <SagaDetail key={x.id} s={s} F={F} act={act} say={say} open={open} x={x} />
        </>
    );
}

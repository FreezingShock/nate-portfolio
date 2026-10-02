"use client";

import { useState } from "react";
import { Check, ChevronDown, Lock, Star } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import type { Ctx } from "./ui";
import { fmt, fmtInt } from "@/lib/fractured-idle/format";
import { FXP_CATS, FXP_PER_LEVEL, type FxpCat } from "@/lib/fractured-idle/fxp";
import {
    CHAPTER_COUNT,
    CHAPTER_INFO,
    CHAPTER_XP,
    ENDGAME,
    chapterOpen,
    chapterPlan,
    chapterReady,
    claimChapter,
    currentChapter,
    focusOf,
    nextPicks,
    progress,
    rowDone,
    rowFrac,
    rowNext,
    rowXpDone,
    type Row,
} from "@/lib/fractured-idle/chapters";
import { levelFx, sagaFx, type Buff } from "@/lib/fractured-idle/sagas";
import { chapterFx } from "@/lib/fractured-idle/chapter-fx";
import { Bar, Buffs, GOLD, css } from "./level-parts";

// The Level page's main view. Chapters of 40 levels each (0-40, 40-80 ... 360-400, then the Endgame). A chapter's
// checklist is made of the things that pay Fracture EXP, so finishing it is what carries you through its levels.
// Top: the chapter strip. Then what to do next, the reward, and the tasks grouped by what they are.

const CAT_BY_ID = new Map(FXP_CATS.map((c) => [c.id, c]));
const SHOW = 6; // undone rows shown per group before "Show more"

export const CHAPTERS_CSS = `
.fi-ch{display:flex;flex-direction:column;gap:.7rem;min-width:0}
.fi-ch-strip{display:grid;gap:.35rem;grid-template-columns:repeat(auto-fill,minmax(6.4rem,1fr))}
.fi-ch-card{--c:#fff;position:relative;display:flex;flex-direction:column;gap:.2rem;padding:.45rem .55rem .5rem;border-radius:.85rem;text-align:left;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:linear-gradient(180deg,color-mix(in oklch,var(--c) 8%,rgba(10,8,22,.7)),rgba(8,6,18,.75));transition:transform .14s,box-shadow .2s,border-color .15s;min-width:0;outline:none}
.fi-ch-card:hover{transform:translateY(-1px);border-color:color-mix(in oklch,var(--c) 65%,transparent)}
.fi-ch-card[data-sel="true"]{border-color:var(--c);box-shadow:0 0 0 1px var(--c),0 0 18px -6px var(--c)}
.fi-ch-card[data-state="locked"]{opacity:.55}
.fi-ch-card:focus-visible{outline:2px solid var(--c);outline-offset:2px}
.fi-ch-n{display:flex;align-items:center;justify-content:space-between;gap:.3rem;font-family:var(--font-minecraft,inherit);font-size:.62rem;color:var(--c)}
.fi-ch-n svg{width:.8rem;height:.8rem}
.fi-ch-t{font-family:var(--font-rubik,inherit);font-size:.66rem;line-height:1.15;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fi-ch-l{font-family:var(--font-rubik,inherit);font-size:.54rem;color:var(--muted-foreground)}
.fi-ch-card[data-state="ready"]::after{content:"";position:absolute;inset:-1px;border-radius:inherit;border:1px solid var(--c);animation:fi-pulse 1.5s ease-in-out infinite;pointer-events:none}

.fi-ch-head{--c:#7dffb8;display:flex;flex-direction:column;gap:.5rem;padding:.75rem;border-radius:1.1rem;border:1px solid color-mix(in oklch,var(--c) 40%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--c) 10%,rgba(10,8,22,.75)),rgba(8,6,18,.8))}
.fi-ch-ht{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .6rem}
.fi-ch-ht b{font-family:var(--font-minecraft,inherit);font-size:1rem;color:var(--c)}
.fi-ch-ht span{font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.fi-ch-meta{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .5rem}
.fi-ch-pill{display:inline-flex;align-items:center;gap:.3rem;padding:.08rem .55rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--k,var(--muted-foreground));background:color-mix(in oklch,var(--k,#fff) 12%,rgba(0,0,0,.25));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--k,#fff) 30%,transparent);white-space:nowrap}
.fi-ch-prog{display:flex;align-items:center;gap:.6rem;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-ch-prog .fi-lv-bar{flex:1}
.fi-ch-rw{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .6rem;padding-top:.15rem}
.fi-ch-rw small{font-family:var(--font-minecraft,inherit);font-size:.52rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-ch-go{margin-left:auto}

.fi-ch-next{display:grid;gap:.4rem;grid-template-columns:repeat(auto-fit,minmax(13.5rem,1fr))}
.fi-ch-pick{--k:#fff;display:flex;flex-direction:column;gap:.3rem;padding:.55rem .65rem;border-radius:.95rem;border:1px solid color-mix(in oklch,var(--k) 40%,transparent);background:linear-gradient(180deg,color-mix(in oklch,var(--k) 10%,rgba(10,8,22,.7)),rgba(8,6,18,.75));min-width:0}
.fi-ch-pick-h{display:flex;align-items:center;gap:.35rem;font-family:var(--font-minecraft,inherit);font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:var(--k)}
.fi-ch-pick-t{font-family:var(--font-rubik,inherit);font-size:.76rem;line-height:1.3;color:#fff}
.fi-ch-pick-f{display:flex;align-items:center;gap:.4rem;margin-top:auto}
.fi-ch-pick-f .fi-lv-bar{flex:1}

.fi-ch-cat{--k:#fff;border-radius:1rem;border:1px solid color-mix(in oklch,var(--k) 26%,transparent);background:color-mix(in oklch,var(--k) 4%,rgba(0,0,0,.2));overflow:hidden}
.fi-ch-cat>button{display:flex;align-items:center;gap:.5rem;width:100%;padding:.5rem .7rem;text-align:left;outline:none}
.fi-ch-cat>button:focus-visible{outline:2px solid var(--k);outline-offset:-2px}
.fi-ch-cn{font-family:var(--font-minecraft,inherit);font-size:.7rem;font-weight:700;color:var(--k)}
.fi-ch-cc{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground);white-space:nowrap}
.fi-ch-cat>button svg{width:.9rem;height:.9rem;color:var(--muted-foreground);transition:transform .2s}
.fi-ch-cat[data-open="true"]>button svg{transform:rotate(180deg)}
.fi-ch-rows{display:grid;gap:.25rem;padding:0 .45rem .5rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))}
.fi-ch-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"i t r" "i p r";align-items:center;gap:.1rem .55rem;padding:.4rem .55rem;border-radius:.7rem;background:rgba(255,255,255,.04);min-width:0}
.fi-ch-row[data-done="true"]{opacity:.5}
.fi-ch-ck{grid-area:i;display:grid;place-items:center;width:1.3rem;height:1.3rem;border-radius:50%;border:1.5px solid color-mix(in oklch,var(--k) 55%,transparent);color:var(--k)}
.fi-ch-ck svg{width:.8rem;height:.8rem}
.fi-ch-row[data-done="true"] .fi-ch-ck{background:var(--k);color:#111}
.fi-ch-rt{grid-area:t;font-family:var(--font-rubik,inherit);font-size:.7rem;line-height:1.25;color:#fff;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.fi-ch-rp{grid-area:p;display:flex;align-items:center;gap:.4rem;font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--muted-foreground)}
.fi-ch-rp .fi-lv-bar{flex:1;min-width:2rem}
.fi-ch-rr{grid-area:r;display:flex;flex-direction:column;align-items:flex-end;gap:.2rem}
.fi-ch-xp{font-family:var(--font-minecraft,inherit);font-size:.62rem;color:${GOLD};white-space:nowrap}
.fi-ch-more{grid-column:1/-1;justify-self:start;padding:.15rem .5rem;font-family:var(--font-rubik,inherit);font-size:.62rem;text-decoration:underline;color:var(--muted-foreground)}
.fi-ch-lock{display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:1.2rem .8rem;text-align:center;border-radius:1rem;border:1px dashed rgba(255,255,255,.18);background:rgba(255,255,255,.02)}
.fi-ch-lock svg{width:1.6rem;height:1.6rem;color:var(--muted-foreground)}
.fi-ch-guide{font-family:var(--font-rubik,inherit);font-size:.7rem;line-height:1.5;color:var(--muted-foreground)}
.fi-ch-guide b{color:#fff}
@media (prefers-reduced-motion:reduce){.fi-ch-card{transition:none}.fi-ch-card[data-state="ready"]::after{animation:none}}
`;

type Props = Pick<Ctx, "s" | "F" | "act" | "say"> & {
    open: (tab: string) => void;
    goSagas: () => void;
};

export function ChaptersView({ s, F, act, say, open, goSagas }: Props) {
    const cur = currentChapter(s);
    const [sel, setSel] = useState(cur);
    const [shut, setShut] = useState<Record<string, boolean>>({}); // groups the player collapsed ("n:cat")
    const [more, setMore] = useState<Record<string, boolean>>({});
    const prog = progress(s);
    const n = sel;
    const info = CHAPTER_INFO[n - 1];
    const plan = chapterPlan()[n - 1];
    const pr = prog[n - 1];
    const locked = !chapterOpen(s, n);
    const claimed = n <= s.lch;
    const ready = chapterReady(s, n);
    const endgame = n === ENDGAME;
    const focus = focusOf(n);
    const state = (i: number) => (i <= s.lch ? "claimed" : chapterReady(s, i) ? "ready" : chapterOpen(s, i) ? "open" : "locked");

    const goTo = (r: { tab: string }) => (r.tab === "level" ? goSagas() : r.tab ? open(r.tab) : undefined);
    const picks = n === cur && !ready && !claimed ? nextPicks(s, 3) : [];

    const lf = Object.entries(levelFx(s)) as Buff[];
    const sf = Object.entries(sagaFx(s)) as Buff[];
    const cf = Object.entries(chapterFx(s)) as Buff[];

    // Group this chapter's rows by what they are, in the order the Fracture EXP page lists them.
    const groups = FXP_CATS.map((c) => ({ c, rows: plan.rows.filter((r) => r.cat === c.id) })).filter((g) => g.rows.length > 0);

    const claim = () =>
        act(() => {
            const got = claimChapter(s, n);
            if (got) say(`Chapter ${got.n}: ${got.name} complete! ${got.reward?.title} unlocked.`);
            return !!got;
        }, "trophy");

    const rowEl = (r: Row, k: string) => {
        const done = rowDone(s, r);
        const st = rowNext(s, r);
        const frac = rowFrac(s, r);
        const left = r.xp - rowXpDone(s, r);
        const more = r.steps.length - 1;
        return (
            <div key={r.id} className="fi-ch-row" data-done={done} style={css({ "--k": k })}>
                <span className="fi-ch-ck">{done ? <Check /> : null}</span>
                <span className="fi-ch-rt" title={r.steps.map((x) => `${x.text} (+${x.xp})`).join("\n")}>
                    {st.text}
                    {!done && more > 0 ? ` (+${more} more step${more === 1 ? "" : "s"} here)` : ""}
                </span>
                {!done && (
                    <span className="fi-ch-rp">
                        <Bar pct={frac} color={k} thin />
                        {fmt(Math.min(st.val(s), st.need))} / {fmt(st.need)}
                    </span>
                )}
                <span className="fi-ch-rr">
                    <span className="fi-ch-xp">{done ? `+${fmtInt(r.xp)}` : `+${fmtInt(left)}`} FXP</span>
                    {!done && r.tab && (
                        <button type="button" className="fi-lv-btn" style={css({ "--sc": k, padding: ".15rem .55rem" })} onClick={() => goTo(r)}>
                            Go
                        </button>
                    )}
                </span>
            </div>
        );
    };

    return (
        <div className="fi-ch">
            <style>{CHAPTERS_CSS}</style>

            {s.lch === 0 && s.lvl < 5 && (
                <p className="fi-ch-guide">
                    <b>How levelling works.</b> Your Fractured Level goes up whenever you earn Fracture EXP, and every level is {FXP_PER_LEVEL} XP. Each chapter below is 40 levels. Its checklist is exactly what pays that XP, so do the tasks, claim the chapter for a permanent buff, and the next opens.
                </p>
            )}

            <div className="fi-ch-strip" role="tablist" aria-label="Chapters">
                {CHAPTER_INFO.map((c) => {
                    const st = state(c.n);
                    const p = prog[c.n - 1];
                    return (
                        <button key={c.n} type="button" role="tab" aria-selected={sel === c.n} className="fi-ch-card" data-sel={sel === c.n} data-state={st} style={css({ "--c": c.color })} onClick={() => setSel(c.n)}>
                            <span className="fi-ch-n">
                                {c.n === ENDGAME ? "Endgame" : `Chapter ${c.n}`}
                                {st === "claimed" ? <Check /> : st === "locked" ? <Lock /> : st === "ready" ? <Star /> : null}
                            </span>
                            <span className="fi-ch-t">{c.name}</span>
                            <span className="fi-ch-l">{c.n === ENDGAME ? "Level 400+" : `Levels ${c.from}-${c.to}`}</span>
                            <Bar pct={p.xpDone / Math.max(1, p.xp)} color={c.color} thin />
                        </button>
                    );
                })}
            </div>

            <div className="fi-ch-head" style={css({ "--c": info.color })}>
                <div className="fi-ch-ht">
                    <b>{endgame ? "Endgame" : `Chapter ${n}`}: {info.name}</b>
                    <span>{endgame ? "Level 400 and beyond" : `Levels ${info.from} to ${info.to}`} · you are level {fmtInt(s.lvl)}</span>
                </div>
                <p className="fi-ch-guide" style={{ margin: 0 }}>{info.blurb}</p>
                <div className="fi-ch-meta">
                    {focus.map((f) => (
                        <span key={f.cat} className="fi-ch-pill" style={css({ "--k": CAT_BY_ID.get(f.cat)!.color })}>
                            <McSymbol name={CAT_BY_ID.get(f.cat)!.symbol} /> {f.name} {fmtInt(Math.round(f.xp))} XP
                        </span>
                    ))}
                </div>
                {!locked && (
                    <div className="fi-ch-prog">
                        <Bar pct={pr.xpDone / Math.max(1, pr.xp)} color={info.color} />
                        <span>
                            {fmtInt(pr.stepsDone)} / {fmtInt(pr.steps)} tasks · {fmtInt(Math.round(pr.xpDone))} / {fmtInt(Math.round(pr.xp))} XP
                        </span>
                    </div>
                )}
                {info.reward && (
                    <div className="fi-ch-rw">
                        <small>{claimed ? "Claimed" : "Reward"}</small>
                        <span className="fi-ch-pill" style={css({ "--k": "#ffd23a" })}>{info.reward.title}</span>
                        <Buffs buff={info.reward.buff} dim={!claimed} />
                        <span className="fi-ch-pill" style={css({ "--k": "#ff6a5f" })}>+{info.reward.tokens} tokens</span>
                        <span className="fi-ch-pill" style={css({ "--k": "#ff8fc7" })}>+{info.reward.eggs} egg{info.reward.eggs === 1 ? "" : "s"}</span>
                        {info.reward.ap > 0 && <span className="fi-ch-pill" style={css({ "--k": "#57d8ff" })}>+{info.reward.ap} gem{info.reward.ap === 1 ? "" : "s"}</span>}
                        <span className="fi-ch-pill" style={css({ "--k": "#c58bff" })}>+{fmtInt(info.reward.dust)} dust</span>
                        {ready && (
                            <button type="button" className="fi-lv-btn go fi-ch-go" data-snd="off" style={css({ "--sc": info.color })} onClick={claim}>
                                Claim chapter
                            </button>
                        )}
                        {!ready && !claimed && !locked && <span className="fi-ch-pill fi-ch-go">Finish every task to claim</span>}
                    </div>
                )}
                {endgame && <p className="fi-ch-guide" style={{ margin: 0 }}>No claim and no cap: every task here is Fracture EXP toward level {fmtInt(CHAPTER_COUNT * 40 + 1)} and up.</p>}
            </div>

            {locked ? (
                <div className="fi-ch-lock">
                    <Lock />
                    <b className="font-minecraft text-xs" style={{ color: "#fff" }}>Chapter {n} is locked</b>
                    <p className="fi-ch-guide" style={{ margin: 0 }}>
                        Finish and claim Chapter {s.lch + 1} first. Everything here still pays Fracture EXP if you get to it early, but Chapter {s.lch + 1} is where to be.
                    </p>
                    <button type="button" className="fi-lv-btn" style={css({ "--sc": CHAPTER_INFO[s.lch].color })} onClick={() => setSel(s.lch + 1)}>
                        Go to Chapter {s.lch + 1}
                    </button>
                </div>
            ) : (
                <>
                    {picks.length > 0 && (
                        <>
                            <div className="fi-lv-h" style={css({ "--hc": "#7dffb8" })}>Do this next <small>closest to done first</small></div>
                            <div className="fi-ch-next">
                                {picks.map((p) => {
                                    const cat = CAT_BY_ID.get(p.row.cat as FxpCat)!;
                                    return (
                                        <div key={p.row.id} className="fi-ch-pick" style={css({ "--k": cat.color })}>
                                            <div className="fi-ch-pick-h"><McSymbol name={cat.symbol} /> {cat.name}</div>
                                            <div className="fi-ch-pick-t">{p.step.text}</div>
                                            <div className="fi-ch-pick-f">
                                                <Bar pct={p.frac} color={cat.color} thin />
                                                <span className="fi-ch-xp">+{p.step.xp} FXP</span>
                                                {p.row.tab && (
                                                    <button type="button" className="fi-lv-btn" style={css({ "--sc": cat.color })} onClick={() => goTo(p.row)}>
                                                        Go
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <div className="fi-lv-h" style={css({ "--hc": info.color })}>The checklist <small>{plan.rows.length} things to do, grouped by what they are</small></div>
                    {groups.map(({ c, rows }) => {
                        const key = `${n}:${c.id}`;
                        const todo = rows.filter((r) => !rowDone(s, r));
                        const done = rows.length - todo.length;
                        const xpLeft = todo.reduce((a, r) => a + (r.xp - rowXpDone(s, r)), 0);
                        const isOpen = shut[key] === undefined ? todo.length > 0 : !shut[key];
                        const all = !!more[key];
                        const shown = all ? todo : todo.slice(0, SHOW);
                        return (
                            <section key={c.id} className="fi-ch-cat" data-open={isOpen} style={css({ "--k": c.color })}>
                                <button type="button" aria-expanded={isOpen} onClick={() => setShut((o) => ({ ...o, [key]: isOpen }))}>
                                    <McSymbol name={c.symbol} />
                                    <span className="fi-ch-cn">{c.name}</span>
                                    <span className="fi-ch-cc">
                                        {done}/{rows.length} done{xpLeft > 0 ? ` · ${fmtInt(Math.round(xpLeft))} XP left` : ""}
                                    </span>
                                    <ChevronDown />
                                </button>
                                {isOpen && (
                                    <div className="fi-ch-rows">
                                        {shown.map((r) => rowEl(r, c.color))}
                                        {todo.length > SHOW && (
                                            <button type="button" className="fi-ch-more" onClick={() => setMore((o) => ({ ...o, [key]: !all }))}>
                                                {all ? "Show fewer" : `Show ${todo.length - SHOW} more`}
                                            </button>
                                        )}
                                        {done > 0 && (
                                            <details style={{ gridColumn: "1/-1" }}>
                                                <summary className="fi-ch-guide" style={{ cursor: "pointer" }}>{done} finished</summary>
                                                <div className="fi-ch-rows" style={{ padding: ".3rem 0 0" }}>{rows.filter((r) => rowDone(s, r)).map((r) => rowEl(r, c.color))}</div>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </>
            )}

            <div className="fi-lv-h" style={css({ "--hc": "var(--mc-green)" })}>Your permanent buffs</div>
            <div className="fi-lv-led">
                <div style={css({ "--k": "#7dffb8" })}>
                    <b>From chapters</b>
                    {cf.length ? <Buffs buff={cf} /> : <span className="fi-lv-note">Claim Chapter 1 for the first one.</span>}
                </div>
                <div style={css({ "--k": "#57d8ff" })}>
                    <b>From your level</b>
                    {lf.length ? <Buffs buff={lf} /> : <span className="fi-lv-note">Reach level 5 for the first perk.</span>}
                </div>
                <div style={css({ "--k": "#ffd23a" })}>
                    <b>From sagas</b>
                    {sf.length ? <Buffs buff={sf} /> : <span className="fi-lv-note">Claim a saga chapter to start stacking these.</span>}
                </div>
            </div>
            <p className="fi-lv-note">Every task above is also listed under EXP sources, and the Sagas tab keeps each skill&apos;s story. A chapter is {fmtInt(CHAPTER_XP)} XP, 40 levels.</p>
        </div>
    );
}

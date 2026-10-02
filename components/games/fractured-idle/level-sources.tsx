"use client";

import { fmtPct } from "@/lib/fractured-idle/format";
import { useMemo, useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { FXP_CATS, recentGains, type FxpCat, type FxpSource } from "@/lib/fractured-idle/fxp";
import type { State } from "@/lib/fractured-idle/data";
import { Bar, css } from "./level-parts";

// Where Fracture EXP comes from: a share bar, the quickest wins, a card per system and a searchable list for the one you pick.

type Sort = "close" | "left" | "name";
type Sel = FxpCat | "all";

export function SourcesView({ s, F, sources }: { s: State; F: (n: number) => string; sources: FxpSource[] }) {
    const [sel, setSel] = useState<Sel>("all");
    const [q, setQ] = useState("");
    const [sort, setSort] = useState<Sort>("close");
    const [showDone, setShowDone] = useState(false);

    // What each source is worth right now: the larger of today's value and the best it has ever been (a rebirth never takes XP away).
    const rows = useMemo(
        () => sources.map((x) => ({ ...x, got: Math.max(x.xp, s.fxp[x.id] || 0) })),
        [sources, s.fxp],
    );
    const stats = FXP_CATS.map((c) => {
        const list = rows.filter((x) => x.cat === c.id);
        const got = list.reduce((a, x) => a + x.got, 0);
        const max = list.reduce((a, x) => a + x.max, 0);
        const bounded = list.filter((x) => x.max > 0);
        return { c, list, got, max, done: bounded.filter((x) => x.got >= x.max).length, n: bounded.length };
    });
    const total = stats.reduce((a, x) => a + x.got, 0);
    const all = stats.reduce((a, x) => a + x.max, 0);
    const cat = FXP_CATS.find((c) => c.id === sel);
    const cc = cat?.color ?? "var(--mc-yellow)";

    const quick = rows
        .filter((x) => x.max > 0 && x.got > 0 && x.got < x.max)
        .sort((a, b) => b.got / b.max - a.got / a.max || a.max - a.got - (b.max - b.got))
        .slice(0, 6);

    const query = q.trim().toLowerCase();
    const list = rows
        .filter((x) => (sel === "all" || x.cat === sel) && (!query || x.label.toLowerCase().includes(query)))
        .filter((x) => showDone || x.max === 0 || x.got < x.max || !!query);
    const doneHidden = rows.filter((x) => (sel === "all" || x.cat === sel) && x.max > 0 && x.got >= x.max).length;
    list.sort((a, b) => {
        if (sort === "name") return a.label.localeCompare(b.label);
        const fa = a.max > 0 ? a.got / a.max : 2;
        const fb = b.max > 0 ? b.got / b.max : 2;
        if (sort === "left") return (b.max - b.got) - (a.max - a.got);
        return (fa >= 1 ? 3 : 1 - fa) - (fb >= 1 ? 3 : 1 - fb);
    });
    const gains = recentGains(Date.now(), 120000).slice(-8).reverse();

    return (
        <>
            <div className="fi-lv-h" style={css({ "--hc": "var(--mc-yellow)" })}>
                Share of your Fracture EXP <small>{F(total)} of {F(all)} possible</small>
            </div>
            <div>
                <div className="fi-lv-share" role="img" aria-label="Fracture EXP by source">
                    {stats.filter((x) => x.got > 0).map((x) => (
                        <button key={x.c.id} type="button" data-on={sel === x.c.id} style={css({ "--w": x.got, "--cc": x.c.color })} title={`${x.c.name}: ${F(x.got)} XP (${fmtPct((x.got / Math.max(1, total)), 1)})`} onClick={() => setSel(sel === x.c.id ? "all" : x.c.id)} aria-label={x.c.name} />
                    ))}
                </div>
                <div className="fi-lv-share-l">
                    {stats.filter((x) => x.got > 0).map((x) => (
                        <button key={x.c.id} type="button" data-on={sel === x.c.id} style={css({ "--cc": x.c.color })} onClick={() => setSel(sel === x.c.id ? "all" : x.c.id)}>
                            <i />{x.c.name} {fmtPct((x.got / Math.max(1, total)), 0)}
                        </button>
                    ))}
                </div>
            </div>

            {quick.length > 0 && (
                <>
                    <div className="fi-lv-h" style={css({ "--hc": "var(--mc-green)" })}>Quickest wins <small>started and close to paying out</small></div>
                    <div className="fi-lv-quick">
                        {quick.map((x) => {
                            const c = FXP_CATS.find((k) => k.id === x.cat)!;
                            return (
                                <button key={x.id} type="button" className="fi-lv-qk" style={css({ "--cc": c.color })} onClick={() => { setSel(x.cat); setQ(x.label); }}>
                                    <span><McSymbol name={c.symbol} /></span>
                                    <span style={{ minWidth: 0 }}>
                                        <b>{x.label}</b>
                                        <Bar pct={x.got / x.max} thin />
                                    </span>
                                    <em>+{F(x.max - x.got)}</em>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            <div className="fi-lv-h" style={css({ "--hc": "var(--mc-aqua)" })}>Every source <small>pick a system to break it down</small></div>
            <div className="fi-lv-cats">
                <button type="button" className="fi-lv-cat" data-on={sel === "all"} style={css({ "--cc": "var(--mc-yellow)" })} onClick={() => setSel("all")}>
                    <span className="fi-lv-cat-h"><span><McSymbol name="star" /></span>Everything</span>
                    <Bar pct={all > 0 ? total / all : 0} />
                    <span className="fi-lv-cat-n"><span>{F(total)} / {F(all)} XP</span><span>{all > 0 ? Math.floor((total / all) * 100) : 0}%</span></span>
                </button>
                {stats.map(({ c, got, max, done, n }) => (
                    <button key={c.id} type="button" className="fi-lv-cat" data-on={sel === c.id} style={css({ "--cc": c.color })} onClick={() => setSel(c.id)}>
                        <span className="fi-lv-cat-h"><span><McSymbol name={c.symbol} /></span>{c.name}</span>
                        <Bar pct={max > 0 ? got / max : 0} />
                        <span className="fi-lv-cat-n"><span>{F(got)}{max > 0 ? ` / ${F(max)}` : ""} XP</span><span>{n > 0 ? `${done}/${n}` : "∞"}</span></span>
                    </button>
                ))}
            </div>

            <div className="fi-lv-panel" style={css({ "--cc": cc })}>
                <div className="fi-lv-panel-h">
                    <b>{cat ? cat.name : "Everything"}</b>
                    <small>{cat ? cat.hint : "All sources, closest to done first"}</small>
                </div>
                <div className="fi-lv-tools">
                    <input className="fi-lv-search" type="search" placeholder="Search sources" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sources" />
                    <span className="fi-lv-seg">
                        {([["close", "Closest"], ["left", "Most left"], ["name", "A to Z"]] as const).map(([k, l]) => (
                            <button key={k} type="button" data-on={sort === k} onClick={() => setSort(k)}>{l}</button>
                        ))}
                    </span>
                    {doneHidden > 0 && (
                        <button type="button" className="fi-lv-btn ghost" onClick={() => setShowDone((v) => !v)}>
                            {showDone ? "Hide" : "Show"} {doneHidden} done
                        </button>
                    )}
                </div>
                <div className="fi-lv-list">
                    {list.length === 0 && <p className="fi-lv-note">{query ? "Nothing matches that." : "Everything here is done."}</p>}
                    {list.map((x) => {
                        const d = x.max > 0 && x.got >= x.max;
                        const c = FXP_CATS.find((k) => k.id === x.cat)!;
                        return (
                            <div key={x.id} className="fi-lv-src" data-d={d} style={sel === "all" ? css({ "--cc": c.color }) : undefined}>
                                <span className="l" title={x.label}>{x.label}</span>
                                {x.max > 0 ? <Bar pct={x.got / x.max} thin /> : <span className="r">no cap</span>}
                                <span className="r">
                                    {d ? "done" : x.max > 0 ? <><b>+{F(x.max - x.got)}</b> left</> : `${F(x.got)} XP`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {gains.length > 0 && (
                <>
                    <div className="fi-lv-h" style={css({ "--hc": "var(--mc-green)" })}>Just earned</div>
                    <div className="fi-lv-feed">
                        {gains.map((g, i) => (
                            <div key={i}><span>{g.label}</span><span>+{g.xp} XP</span></div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

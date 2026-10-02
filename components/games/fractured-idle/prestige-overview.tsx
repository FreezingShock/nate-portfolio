"use client";

import { useState, type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { fmtInt } from "@/lib/fractured-idle/format";
import { ascMultAt, ascPlan, ascend, income, layerGain, rbCost, rebirth, rebirthCap, rebirthMultAt, rebirthPlan } from "@/lib/fractured-idle/engine";
import { LAYERS, advise, runSecs, type Layer } from "@/lib/fractured-idle/runs";
import { transMult, transPlan } from "@/lib/fractured-idle/trans";
import { Tip, TipCard } from "./tooltip";
import type { PrestigeView } from "./prestige-nav";
import { Chips, Cue, LAYERS_INFO, Ring, keepsOf, losesOf, perHour, secs, type LayerInfo } from "./prestige-parts";
import type { Ctx } from "./ui";

// The Prestige overview: the whole ladder on one page. Each layer shows how close you are, what you would get now, how
// fast you earn it per hour (and whether now is a good moment), and what it keeps and erases. Under that, where your
// multiplier comes from and a history of your resets.

type Props = Pick<Ctx, "s" | "d" | "F" | "act" | "say"> & { go: (v: PrestigeView) => void };

export function Overview({ s, d, F, act, say, go }: Props) {
    const [confirm, setConfirm] = useState<Layer | null>(null);
    const transOpen = s.ascEver >= 3 || s.trans > 0;
    const avg = (k: Layer) => {
        const r = s.runs.recs[k];
        return r.length ? r.reduce((a, x) => a + x.secs, 0) / r.length : 0;
    };
    const rate = income(d);

    const info = (k: Layer) => {
        const L = LAYERS_INFO[k];
        const g = layerGain(s, k);
        const a = advise(s.runs, k, s.playTime, g.gain, g.can);
        if (k === "rb") {
            const cost = rbCost(s, s.rebirths);
            const pct = g.can ? 1 : Math.min(1, Math.log10(Math.max(1, s.shards)) / Math.log10(cost));
            const eta = g.can ? 0 : rate > 0 ? (cost - s.shards) / rate : Infinity;
            const plan = rebirthPlan(s);
            return { L, g, a, pct, eta, need: [F(cost), "shards to rebirth"] as [string, string], facts: [["Ready now", `${plan.count} / ${rebirthCap(s)}`], ["Multiplier", `x${F(rebirthMultAt(s, s.rebirths + Math.max(1, plan.count)))}`], ["Next cost", F(cost)], ["Run time", secs(runSecs(s.runs, k, s.playTime))]] as [string, string][] };
        }
        if (k === "asc") {
            const p = ascPlan(s);
            const left = Math.max(0, p.req - s.rebirths);
            const per = avg("rb");
            return { L, g, a, pct: Math.min(1, s.rebirths / p.req), eta: left === 0 ? 0 : per ? left * per : Infinity, need: [fmtInt(left), left === 1 ? "more rebirth to ascend" : "more rebirths to ascend"] as [string, string], facts: [["Rebirths", `${fmtInt(s.rebirths)} / ${fmtInt(p.req)}`], ["Multiplier", `x${F(ascMultAt(s, s.asc + 1))}`], ["Ascensions", fmtInt(s.asc)], ["Run time", secs(runSecs(s.runs, k, s.playTime))]] as [string, string][] };
        }
        const p = transPlan(s);
        const left = Math.max(0, p.req - s.asc);
        const per = avg("asc");
        return { L, g, a, pct: Math.min(1, s.asc / p.req), eta: left === 0 ? 0 : per ? left * per : Infinity, need: [fmtInt(left), left === 1 ? "more ascension to transcend" : "more ascensions to transcend"] as [string, string], facts: [["Ascensions", `${fmtInt(s.asc)} / ${fmtInt(p.req)}`], ["Boost now", `x${F(transMult(s))}`], ["Essence if next", fmtInt(p.next)], ["Run time", secs(runSecs(s.runs, k, s.playTime))]] as [string, string][] };
    };

    const doReset = (k: Layer) => {
        if (k === "rb") {
            const p = rebirthPlan(s);
            act(() => rebirth(s, p.count), "buy");
            say(`Reborn x${p.count}! +${fmtInt(p.tokens)} tokens.`);
        } else if (k === "asc") {
            const p = ascPlan(s);
            act(() => ascend(s));
            say(`Ascended! +${fmtInt(p.ap)} gems.`);
        }
        setConfirm(null);
    };

    // Where the multiplier comes from. Log shares, so a x1000 layer and a x10 layer are both visible.
    const rb = Math.max(1, d.rMult);
    const tr = transMult(s);
    const as = Math.max(1, d.ascMult / tr);
    const rest = Math.max(1, d.all / (rb * d.ascMult));
    const parts = [
        { name: "Rebirths", v: rb, c: LAYERS_INFO.rb.color },
        { name: "Ascensions", v: as, c: LAYERS_INFO.asc.color },
        { name: "Transcendence", v: tr, c: LAYERS_INFO.trans.color },
        { name: "Everything else", v: rest, c: "var(--mc-green)" },
    ];
    const logs = parts.map((p) => Math.log10(Math.max(1.0001, p.v)));
    const sum = logs.reduce((a, b) => a + b, 0) || 1;

    return (
        <>
            <div className="pr-bal">
                <span style={{ ["--c" as string]: LAYERS_INFO.rb.color } as CSSProperties}><small>Tokens</small><b>{F(s.tokens)}</b></span>
                <span style={{ ["--c" as string]: LAYERS_INFO.asc.color } as CSSProperties}><small>Gems</small><b>{F(s.ap)}</b></span>
                {(transOpen || s.ess > 0) && <span style={{ ["--c" as string]: LAYERS_INFO.trans.color } as CSSProperties}><small>Essence</small><b>{F(s.ess)}</b></span>}
                <span style={{ ["--c" as string]: "#fff" } as CSSProperties}><small>Rebirths</small><b>{fmtInt(s.rebirths)}</b></span>
                <span style={{ ["--c" as string]: "#fff" } as CSSProperties}><small>Ascensions</small><b>{fmtInt(s.asc)}{s.ascEver > s.asc ? ` (${fmtInt(s.ascEver)} ever)` : ""}</b></span>
                {s.trans > 0 && <span style={{ ["--c" as string]: LAYERS_INFO.trans.color } as CSSProperties}><small>Transcendences</small><b>{fmtInt(s.trans)}</b></span>}
            </div>

            <div className="pr-h" style={{ ["--hc" as string]: "var(--mc-light-purple)" } as CSSProperties}>The ladder <small>each reset keeps more than the one before</small></div>
            <div className="pr-ladder">
                {(["rb", "asc", "trans"] as Layer[]).map((k) => {
                    const locked = k === "trans" && !transOpen;
                    const x = info(k);
                    const L: LayerInfo = x.L;
                    const shown = locked ? null : x;
                    return (
                        <div key={k} className="pr-card" data-ready={!locked && x.g.can} data-lock={locked} style={{ ["--c" as string]: L.color } as CSSProperties}>
                            <div className="pr-card-h">
                                <Ring pct={locked ? 0 : x.pct} color={L.color}>{locked ? <Lock className="size-4" /> : <McSymbol name={L.symbol} />}</Ring>
                                <span className="pr-card-t">
                                    <b>{L.name}</b>
                                    <small>{locked ? "Ascend 3 times to see this layer" : L.blurb}</small>
                                </span>
                            </div>
                            {shown && (
                                <>
                                    <div className="pr-gain">
                                        <b>{x.g.can ? `+${F(x.g.gain)}` : x.need[0]}</b>
                                        <span>{x.g.can ? `${L.cur} if you ${L.verb.toLowerCase()} now` : x.need[1]}</span>
                                    </div>
                                    <div className="pr-row">
                                        <Cue a={x.a} />
                                        {x.g.can && (
                                            <Tip tip={<TipCard title="Gain per hour" color={L.color} lines={["How much this layer pays per hour of this run if you reset right now. It climbs, then flattens, then falls: the best moment is near the top."]} rows={[["Now", perHour(x.a.rate)], ["Best this run", perHour(x.a.peak)], ["Best ever", x.a.best > 0 ? perHour(x.a.best) : "no history yet"]]} />}>
                                                <span className="pr-note" tabIndex={0}>{perHour(x.a.rate)}</span>
                                            </Tip>
                                        )}
                                        {!x.g.can && <span className="pr-note">{Number.isFinite(x.eta) ? (x.eta > 0 ? `about ${secs(x.eta)} away` : "") : "no estimate yet"}</span>}
                                    </div>
                                    <div className="pr-facts">
                                        {x.facts.map(([a, b]) => (
                                            <div key={a} className="pr-fact"><small>{a}</small><b>{b}</b></div>
                                        ))}
                                    </div>
                                    <span className="pr-lab">Keeps</span>
                                    <Chips items={keepsOf(k, s)} tone="keep" />
                                    <span className="pr-lab">Erases</span>
                                    <Chips items={losesOf(k, s)} tone="lose" />
                                    <div className="pr-row" style={{ marginTop: "auto" }}>
                                        {confirm === k ? (
                                            <>
                                                <button type="button" className="pr-btn" style={{ ["--c" as string]: L.color } as CSSProperties} onClick={() => doReset(k)}>
                                                    Confirm {L.verb.toLowerCase()}
                                                </button>
                                                <button type="button" className="pr-link" onClick={() => setConfirm(null)}>Cancel</button>
                                            </>
                                        ) : k === "trans" ? (
                                            <button type="button" className={`pr-btn ${x.g.can ? "" : "ghost"}`} style={{ ["--c" as string]: L.color } as CSSProperties} onClick={() => go("transcend")}>
                                                {x.g.can ? "Choose vows and transcend" : "Open Transcendence"}
                                            </button>
                                        ) : (
                                            <>
                                                <button type="button" className={`pr-btn ${x.g.can ? "fi-afford" : ""}`} disabled={!x.g.can} style={{ ["--c" as string]: L.color } as CSSProperties} onClick={() => setConfirm(k)}>
                                                    {x.g.can ? `${L.verb} for +${F(x.g.gain)}` : "Not ready"}
                                                </button>
                                                <button type="button" className="pr-link" onClick={() => go(k === "rb" ? "rebirth" : "ascension")}>Open {L.name}</button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
                <div className="pr-card" data-lock="true" style={{ ["--c" as string]: "#ff55ff" } as CSSProperties}>
                    <div className="pr-card-h">
                        <Ring pct={0} color="#ff55ff"><Lock className="size-4" /></Ring>
                        <span className="pr-card-t">
                            <b>The Great Reset</b>
                            <small>Not unlocked. A huge skill tree is coming.</small>
                        </span>
                    </div>
                    <p className="pr-note">Beyond Transcendence waits a reset that wipes the whole run and pays for a branching tree of permanent upgrades. Everything you keep from the first three layers carries into it.</p>
                </div>
            </div>

            <div className="pr-h" style={{ ["--hc" as string]: "var(--mc-green)" } as CSSProperties}>Where your power comes from <small>x{F(d.all)} to all shards</small></div>
            <div className="pr-power">
                <div className="pr-stack" role="img" aria-label="Share of the multiplier by source">
                    {parts.map((p, i) => (
                        <i key={p.name} style={{ ["--c" as string]: p.c, width: `${(logs[i] / sum) * 100}%` } as CSSProperties} />
                    ))}
                </div>
                <div className="pr-leg">
                    {parts.map((p, i) => (
                        <div key={p.name} style={{ ["--c" as string]: p.c } as CSSProperties}>
                            <i />
                            {p.name}
                            <b>x{F(p.v)} · {Math.round((logs[i] / sum) * 100)}%</b>
                        </div>
                    ))}
                </div>
                <p className="pr-note">Shares are by size on a log scale: a layer worth x1,000 counts three times a layer worth x10.</p>
            </div>

            <div className="pr-h" style={{ ["--hc" as string]: "var(--mc-aqua)" } as CSSProperties}>Reset history <small>your last runs, newest first</small></div>
            {LAYERS.every((k) => s.runs.recs[k].length === 0) ? (
                <p className="pr-note">Your resets will be listed here with how long each run took and what it paid, so you can see which pace is best.</p>
            ) : (
                <div className="pr-hist">
                    {LAYERS.filter((k) => s.runs.recs[k].length > 0).map((k) => {
                        const L = LAYERS_INFO[k];
                        const recs = [...s.runs.recs[k]].reverse().slice(0, 5);
                        const rates = recs.map((r) => (r.gain * 3600) / Math.max(1, r.secs));
                        const best = Math.max(...rates, 1e-9);
                        return (
                            <section key={k} style={{ ["--c" as string]: L.color } as CSSProperties}>
                                <h4>{L.name} · {s.runs.recs[k].length} run{s.runs.recs[k].length === 1 ? "" : "s"}</h4>
                                {recs.map((r, i) => (
                                    <div key={i} className="pr-run">
                                        <span>
                                            {secs(r.secs)} · <em>+{F(r.gain)} {L.cur}</em>
                                        </span>
                                        <b>{perHour(rates[i])}</b>
                                        <span className="pr-meter"><i style={{ width: `${(rates[i] / best) * 100}%` }} /></span>
                                    </div>
                                ))}
                            </section>
                        );
                    })}
                </div>
            )}
        </>
    );
}

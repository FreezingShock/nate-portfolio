"use client";

import { type CSSProperties } from "react";
import { Lock } from "lucide-react";
import {
    CREW,
    CREW_MARKS,
    CROPS,
    DIMS,
    DIM_CROPS,
    DIM_LABEL,
    buyCrew,
    buyHand,
    canBuyCrew,
    canBuyHand,
    cropIcon,
    crewCost,
    crewLevel,
    crewTotal,
    farmLevel,
    gardenOpen,
    handBoost,
    handCost,
    haveCrop,
    totalHands,
    totalRaw,
} from "@/lib/fractured-idle/farm";
import { sfx } from "@/lib/sound/sounds";
import { C, UpgradeList, col, fmtPct } from "./farm-bits";
import { ItemIcon, NeedTile } from "./skill-kit";
import { SectionTitle, type Ctx } from "./ui";

// The Crew: five departments that take the chores off you (planting, cooking, enchanting, selling), bought in
// levels with shards and raw crops, each with milestones. Below them, the Specialists: hands hired for one crop.

type P = { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void; say: (m: string) => void };

export function Crew({ s, F, render, say }: P) {
    const f = s.farm;
    const lvl = farmLevel(s);
    const total = crewTotal(s);
    const buy = (id: string, n: number, name: string) => {
        const got = buyCrew(s, id, n);
        if (got) {
            sfx(got > 1 ? "bulk" : "buy");
            say(`${name}: +${got} level${got > 1 ? "s" : ""}.`);
            render();
        }
    };
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{total}</b> crew levels <span>+{fmtPct(0.0015 * Math.min(200, total))} minion output for the whole game</span>
                </div>
                <small>
                    Every department costs shards (counted in seconds of your best income, so it stays fair as you grow) and raw crops of any kind. Each one takes a chore off your hands for good, and works while you are away.
                </small>
            </div>

            <div className="fi-cr-auto">
                <span>Sowing</span>
                <span className="fi-lv-seg" role="tablist">
                    {([["off", "Off"], ["best", "Best crop"], ["goal", "For my goal"]] as const).map(([k, label]) => (
                        <button key={k} type="button" data-on={f.auto.sow === k} onClick={() => { f.auto.sow = k; render(); }}>{label}</button>
                    ))}
                </span>
                {([["pack", "Auto-enchant"], ["sell", "Auto-sell"], ["cook", "Auto-cook"]] as const).map(([k, label]) => (
                    <button key={k} type="button" className="fi-cr-sw" data-on={f.auto[k]} aria-pressed={f.auto[k]} onClick={() => { f.auto[k] = !f.auto[k]; render(); }}>
                        {label} <b>{f.auto[k] ? "ON" : "OFF"}</b>
                    </button>
                ))}
            </div>

            <div className="fi-cr-grid">
                {CREW.map((c) => {
                    const l = crewLevel(s, c.id);
                    const locked = lvl < c.need;
                    const can = canBuyCrew(s, c);
                    const cost = crewCost(s, c);
                    const maxed = l >= c.max;
                    return (
                        <div key={c.id} className="fi-cr" data-ready={can.ok} data-off={locked} style={col(c.color)}>
                            <div className="fi-cr-h">
                                <ItemIcon icon={c.icon} color={c.color} n={l > 0 ? l : undefined} dim={locked} />
                                <span className="tx">
                                    <b>{c.name} <small>{l}/{c.max}</small></b>
                                    <span>{locked ? <><Lock className="mr-1 inline size-3" />Opens at Farming {c.need}</> : c.desc}</span>
                                </span>
                            </div>
                            {!locked && (
                                <>
                                    <div className="fi-cr-e">
                                        {l > 0 ? c.effect(l) : "not hired yet"} <em>▸</em> <b>{maxed ? "max" : c.effect(l + 1)}</b>
                                    </div>
                                    <div className="fi-cr-m">
                                        {CREW_MARKS.map((m) => (
                                            <span key={m} data-on={l >= m}>{l >= m ? "✔" : "◇"} Lv {m}</span>
                                        ))}
                                        <small>{l >= CREW_MARKS[0] ? "Veterans: +0.15% minion output per level, all game" : ""}</small>
                                    </div>
                                    {!maxed && (
                                        <div className="fi-cr-b">
                                            <span className="fi-cb-needs">
                                                <NeedTile n={{ id: "shards", name: "Shards", color: "#55ffff", icon: "star", have: s.shards, need: cost.shards }} />
                                                <NeedTile n={{ id: "raw", name: "Raw crops (any)", color: "#9be04a", icon: "flower", have: totalRaw(s), need: cost.raw }} />
                                            </span>
                                            <span className="fi-cr-bb">
                                                <button type="button" className="fi-lv-btn" disabled={!can.ok} onClick={() => buy(c.id, 1, c.name)}>Hire</button>
                                                <button type="button" className="fi-lv-btn ghost" disabled={!can.ok} onClick={() => buy(c.id, 10, c.name)}>x10</button>
                                                <button type="button" className="fi-lv-btn ghost" disabled={!can.ok} onClick={() => buy(c.id, Infinity, c.name)}>Max</button>
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <SectionTitle color="#7fd0ff">Specialists ({totalHands(s)} hired)</SectionTitle>
            <p className="fi-mn-note">A specialist is hired for one crop and speeds it up in every garden, with a little reach to the cheaper crops before it. They cost raw crops of that kind.</p>
            {DIMS.map((dm) => {
                if (!gardenOpen(s, dm)) return null;
                const list = DIM_CROPS[dm].filter((c) => farmLevel(s) >= c.need || (s.farm.grown[c.id] || 0) > 0);
                if (!list.length) return null;
                return (
                    <div key={dm} className="fi-mn-dimblock">
                        <SectionTitle color={DIM_LABEL[dm].color}>{DIM_LABEL[dm].name}</SectionTitle>
                        <div className="fi-cb-grid">
                            {list.map((c) => {
                                const n = f.hands[c.id] || 0;
                                const can = canBuyHand(s, c);
                                const cost = handCost(s, c);
                                return (
                                    <div key={c.id} className="fi-sp" data-ready={can.ok} style={col(c.color)}>
                                        <ItemIcon icon={cropIcon[c.id]} color={c.color} n={n || undefined} />
                                        <b>{c.name}</b>
                                        <small>{n ? `+${fmtPct(handBoost(s, c))} growth` : "none hired"}</small>
                                        <button type="button" className="fi-lv-btn" disabled={!can.ok} onClick={() => { if (buyHand(s, c.id, 1)) { sfx("buy"); render(); } }}>
                                            Hire · {cost} {haveCrop(s, c.id) >= cost ? "" : `(${Math.floor(haveCrop(s, c.id))})`}
                                        </button>
                                        {n > 0 && <button type="button" className="fi-lv-btn ghost" disabled={!can.ok} onClick={() => { if (buyHand(s, c.id, 10) > 0) { sfx("bulk"); render(); } }}>x10</button>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <SectionTitle color={C}>Garden rig</SectionTitle>
            <UpgradeList s={s} cat="rig" render={render} />
        </>
    );
}

void CROPS;
void ({} as CSSProperties);

export const CREW_CSS = `
.fi-cr-auto{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .6rem;padding:.5rem .65rem;border-radius:.95rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-lv-seg{display:inline-flex;padding:.15rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25)}
.fi-lv-seg button{padding:.25rem .6rem;border-radius:.5rem;border:0;background:transparent;color:var(--muted-foreground);font-family:var(--font-rubik,inherit);font-size:.66rem;font-weight:600}
.fi-lv-seg button[data-on="true"]{background:color-mix(in oklch,#9be04a 22%,transparent);color:#9be04a}
.fi-cr-sw{display:inline-flex;align-items:center;gap:.35rem;padding:.28rem .6rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.14);background:transparent;color:var(--muted-foreground);font-family:var(--font-rubik,inherit);font-size:.66rem;font-weight:600}
.fi-cr-sw b{font-size:.58rem}
.fi-cr-sw[data-on="true"]{border-color:var(--mc-green);color:#fff}
.fi-cr-sw[data-on="true"] b{color:var(--mc-green)}
.fi-cr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(19rem,1fr));gap:.5rem}
.fi-cr{display:flex;flex-direction:column;gap:.45rem;padding:.65rem .75rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--oc) 35%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--oc) 8%,transparent),rgba(0,0,0,.2) 70%)}
.fi-cr[data-ready="true"]{border-color:color-mix(in oklch,var(--mc-green) 60%,transparent)}
.fi-cr[data-off="true"]{opacity:.55}
.fi-cr-h{display:flex;align-items:center;gap:.65rem}
.fi-cr-h .tx{display:flex;flex-direction:column;min-width:0}
.fi-cr-h b{font-family:var(--font-minecraft,inherit);font-size:.9rem;color:var(--oc)}
.fi-cr-h b small{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);font-weight:600}
.fi-cr-h .tx>span{font-family:var(--font-rubik,inherit);font-size:.64rem;line-height:1.35;color:#cfc8de}
.fi-cr-e{font-family:var(--font-rubik,inherit);font-size:.68rem;color:#cfc8de}
.fi-cr-e em{font-style:normal;color:var(--muted-foreground)}
.fi-cr-e b{color:var(--mc-green);font-weight:700}
.fi-cr-m{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.fi-cr-m span[data-on="true"]{color:var(--oc);font-weight:700}
.fi-cr-m small{font-size:.56rem;opacity:.8}
.fi-cr-b{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.4rem}
.fi-cr-bb{display:flex;gap:.3rem}
.fi-sp{display:flex;flex-direction:column;align-items:center;gap:.25rem;padding:.55rem .4rem;border-radius:.9rem;border:1px solid color-mix(in oklch,var(--oc) 30%,transparent);background:rgba(0,0,0,.2);text-align:center}
.fi-sp[data-ready="true"]{border-color:color-mix(in oklch,var(--mc-green) 55%,transparent)}
.fi-sp b{font-family:var(--font-rubik,inherit);font-size:.66rem;color:#fff}
.fi-sp small{font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--muted-foreground)}
.fi-sp .fi-lv-btn{font-size:.6rem;padding:.25rem .5rem}
`;

"use client";

import type { CSSProperties, ReactNode } from "react";
import { McSymbol } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import type { Derived } from "@/lib/fractured-idle/engine";
import { fmt, fmtInt } from "@/lib/fractured-idle/format";
import { BOOST_BY_ID, BOOST_LABEL, boostLeft, boostMs, boostSlots } from "@/lib/fractured-idle/boosters";
import { hasLicense, isLocked } from "@/lib/fractured-idle/inv-core";
import { CAT_BY_ID, ITEM_BY_ID, PET_ITEM_BY_ID, itemCount, sellBonus, unitValue } from "@/lib/fractured-idle/items";
import { RARITIES } from "@/lib/fractured-idle/pets-data";
import { CUR, balance, type Cur } from "@/lib/fractured-idle/shop";
import { Tip, TipCard } from "./tooltip";
import { lift, tint } from "./ui";

// Pieces shared by the Inventory and the Shop (the item glyph, tooltip, wallet, booster strip) and all of their CSS.
//
// Layout notes: both tabs live in a `.iv` / `.sh` *container*, and everything inside adapts to the width of that
// container, not the window, because the game shows these tabs in a half-width pane on desktop and in a full-width
// column on a phone. Breakpoints (container width): under 440 = phone, 440-640 = large phone / small pane,
// 600+ = the inventory puts its detail panel to the right of the grid and thins the columns (5, then 7, then 9
// across) so a whole page stays on screen without scrolling.

export const rarityColor = (id: string) => RARITIES[ITEM_BY_ID.get(id)!.rarity].color;

export function Glyph({ id, size = "md" }: { id: string; size?: "sm" | "md" | "lg" }) {
    const d = ITEM_BY_ID.get(id);
    if (!d) return null;
    return (
        <span className="iv-g" data-size={size} style={{ ["--ic" as string]: d.color, ["--rc" as string]: RARITIES[d.rarity].color } as CSSProperties}>
            <McSymbol name={d.symbol} />
        </span>
    );
}

const fmtLeft = (t: number) => (t >= 3600 ? `${Math.floor(t / 3600)}h ${Math.floor((t % 3600) / 60)}m` : t >= 90 ? `${Math.floor(t / 60)}m ${String(Math.floor(t % 60)).padStart(2, "0")}s` : `${Math.ceil(t)}s`);
export { fmtLeft };

/** Tooltip body for any item. Pass `s` and `d` so numbers are live. */
export function ItemTip({ s, d, id, extra }: { s: State; d: Derived; id: string; extra?: ReactNode }) {
    const def = ITEM_BY_ID.get(id);
    if (!def) return null;
    const rar = RARITIES[def.rarity];
    const cat = CAT_BY_ID.get(def.cat)!;
    const n = itemCount(s, id);
    const unit = unitValue(s, d, id) * sellBonus(s);
    const rows: [string, string, string?][] = [
        ["Rarity", rar.name, rar.color],
        ["Type", cat.label, cat.color],
        ["Owned", fmtInt(n)],
    ];
    if (def.sellable) rows.push(["Sells for", `${fmt(unit)} each`, "var(--mc-aqua)"]);
    if (def.sellable && n > 1) rows.push(["Stack worth", fmt(unit * n), "var(--mc-aqua)"]);
    const b = BOOST_BY_ID.get(id);
    if (b) rows.push(["Effect", `+${Math.round(b.amount * 100)}% ${BOOST_LABEL[b.stat]}`, "var(--mc-green)"], ["Lasts", fmtLeft(boostMs(s, b) / 1000)]);
    const p = PET_ITEM_BY_ID.get(id);
    if (p) rows.push(["Effect", p.star ? "+1 star on a pet" : `${Math.round((p.feed ?? 0) * 100)}% of a level`, "var(--mc-green)"]);
    const notes = [];
    if (isLocked(s, id)) notes.push({ text: "Locked: it will not be sold, bulk sold or auto-sold.", color: "var(--mc-gold)" });
    if (s.inv.auto[id] !== undefined) notes.push({ text: `Auto-sell: keeps ${fmtInt(s.inv.auto[id])}, sells the rest.`, color: "var(--mc-aqua)" });
    return <TipCard title={def.name} color={rar.color} tag={rar.name} lines={[def.desc, extra]} rows={rows} notes={notes} />;
}

/** The player's currencies as compact chips. */
export function Wallet({ s, F, show = ["shards", "tokens", "gems", "dust"] }: { s: State; F: (n: number) => string; show?: Cur[] }) {
    return (
        <div className="iv-wallet">
            {show.map((c) => (
                <Tip key={c} box tip={<TipCard title={CUR[c].name} color={CUR[c].color} lines={[c === "shards" ? "Earned by clicking, minions, mining and farming." : c === "tokens" ? "Earned by rebirthing." : c === "gems" ? "Earned by ascending." : "Made by enchanting and found in geodes and pods."]} />}>
                    <span className="iv-bal" style={{ ["--c" as string]: CUR[c].color } as CSSProperties}>
                        <McSymbol name={CUR[c].symbol} />
                        <b>{F(balance(s, c))}</b>
                        <small>{CUR[c].name}</small>
                    </span>
                </Tip>
            ))}
        </div>
    );
}

/** Running boosters with countdown bars. */
export function BoostStrip({ s }: { s: State }) {
    const now = Date.now();
    const live = s.inv.active.filter((a) => a.end > now);
    return (
        <div className="iv-boosts" aria-label="Active boosters">
            {live.map((a) => {
                const def = BOOST_BY_ID.get(a.id);
                if (!def) return null;
                const left = boostLeft(a, now);
                return (
                    <Tip key={a.id} box tip={<TipCard title={def.name} color={def.color} tag="Active" lines={[def.desc]} rows={[["Effect", `+${Math.round(def.amount * 100)}% ${BOOST_LABEL[def.stat]}`, "var(--mc-green)"], ["Time left", fmtLeft(left)]]} foot="Use another one to top the timer up." />}>
                        <span className="iv-boost" style={{ ["--bc" as string]: def.color } as CSSProperties}>
                            <McSymbol name={def.symbol} />
                            <span>{def.name}</span>
                            <b>{fmtLeft(left)}</b>
                            <i style={{ width: `${Math.max(0, Math.min(1, (a.end - now) / a.dur)) * 100}%` }} />
                        </span>
                    </Tip>
                );
            })}
            <span className="iv-boost-n">{live.length} / {boostSlots(s)} booster slots</span>
        </div>
    );
}

export { hasLicense, tint, lift };

export const INV_CSS = `
/* ---------- shared ---------- */
.iv,.sh{container-type:inline-size;min-width:0}
.iv-in,.sh-in{--ico:2.4rem;--nm:.64rem;--ct:.74rem;--cols:4;display:flex;flex-direction:column;gap:.5rem;min-width:0}
@container (min-width:440px){.iv-in{--cols:6}}
@container (min-width:600px){.iv-in{--cols:6;--ico:2.1rem;--nm:.6rem;--ct:.68rem}}
@container (min-width:760px){.iv-in{--cols:7;--ico:2.2rem}}
@container (min-width:1020px){.iv-in{--cols:9;--ico:2.4rem;--nm:.62rem}}
@container (min-width:1300px){.iv-in{--ico:2.9rem;--nm:.7rem;--ct:.78rem}}

.iv-g{--ic:#fff;--rc:#fff;display:inline-grid;place-items:center;flex:none;border-radius:.65rem;color:var(--ic);background:radial-gradient(circle at 30% 25%,color-mix(in oklch,var(--ic) 30%,transparent),color-mix(in oklch,var(--ic) 8%,rgba(0,0,0,.4)));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--rc) 55%,transparent),0 0 14px -8px var(--ic)}
.iv-g[data-size="sm"]{width:1.8rem;height:1.8rem;font-size:1.05rem}
.iv-g[data-size="md"]{width:2.7rem;height:2.7rem;font-size:1.55rem}
.iv-g[data-size="lg"]{width:3.6rem;height:3.6rem;font-size:2.2rem;border-radius:.95rem}

.iv-wallet{display:flex;flex-wrap:wrap;gap:.3rem}
.iv-bal{--c:var(--mc-aqua);display:inline-flex;align-items:center;gap:.35rem;height:1.9rem;padding:0 .6rem;border-radius:.7rem;color:var(--c);background:color-mix(in oklch,var(--c) 10%,rgba(0,0,0,.35));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 32%,transparent);cursor:help;outline:none;white-space:nowrap}
.iv-bal b{font-family:var(--font-minecraft,inherit);font-size:.82rem}
.iv-bal small{font-family:var(--font-rubik,inherit);font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground)}
@container (max-width:639px){.iv-bal small{display:none}}
@container (max-width:439px){.iv-seg button{padding:0 .5rem;min-width:1.6rem}.sh-nav .iv-seg button{padding:0 .6rem}}

.iv-boosts{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem}
.iv-boost{--bc:var(--mc-green);position:relative;display:inline-flex;align-items:center;gap:.35rem;height:1.7rem;padding:0 .55rem;border-radius:.65rem;overflow:hidden;color:var(--bc);font-family:var(--font-rubik,inherit);font-size:.64rem;background:color-mix(in oklch,var(--bc) 12%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--bc) 45%,transparent);white-space:nowrap}
.iv-boost b{font-family:var(--font-minecraft,inherit);font-weight:400;color:#fff}
.iv-boost i{position:absolute;left:0;bottom:0;height:2px;background:var(--bc);transition:width .3s linear}
.iv-boost-n{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);white-space:nowrap}

.iv-seg{display:inline-flex;flex:none;padding:.15rem;gap:.1rem;border-radius:.8rem;background:rgba(0,0,0,.32);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.iv-seg button{--c:var(--mc-aqua);display:inline-flex;align-items:center;justify-content:center;gap:.3rem;height:1.8rem;min-width:2rem;padding:0 .7rem;border-radius:.6rem;font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:var(--muted-foreground);transition:background .15s,color .15s;outline:none;white-space:nowrap}
.iv-seg button:hover{color:var(--foreground);background:rgba(255,255,255,.07)}
.iv-seg button[data-on="true"]{color:var(--c);background:color-mix(in oklch,var(--c) 20%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 55%,transparent)}
.iv-seg button[data-lock="true"]{opacity:.55}
.iv-seg button em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.56rem;padding:0 .35rem;border-radius:999px;background:rgba(255,255,255,.14)}
.iv-seg button:focus-visible,.iv-btn:focus-visible,.iv-slot:focus-visible,.iv-chip:focus-visible,.iv-sel:focus-visible,.iv-search:focus-visible,.sh-card button:focus-visible{outline:2px solid var(--mc-aqua);outline-offset:2px}

.iv-btn{--c:var(--mc-green);display:inline-flex;align-items:center;justify-content:center;gap:.3rem;height:2rem;padding:0 .8rem;border-radius:.7rem;font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:var(--c);border:1px solid color-mix(in oklch,var(--c) 50%,transparent);background:color-mix(in oklch,var(--c) 10%,transparent);transition:background .15s,transform .12s,opacity .15s;white-space:nowrap}
.iv-btn:hover:not(:disabled){background:color-mix(in oklch,var(--c) 22%,transparent);transform:translateY(-1px)}
.iv-btn:active:not(:disabled){transform:scale(.96)}
.iv-btn:disabled{opacity:.4;cursor:not-allowed}
.iv-btn[data-on="true"]{background:color-mix(in oklch,var(--c) 26%,transparent);box-shadow:inset 0 0 0 1px var(--c)}
.iv-btn[data-wide="true"]{width:100%}
.iv-note{font-family:var(--font-rubik,inherit);font-size:.66rem;line-height:1.4;color:var(--muted-foreground)}
.iv-note button{text-decoration:underline}
.iv-h{font-family:var(--font-minecraft,inherit);font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-foreground)}
.iv-step{display:inline-flex;align-items:center;gap:.25rem;font-family:var(--font-minecraft,inherit);font-size:.72rem}
.iv-step button{width:1.8rem;height:1.8rem;border-radius:.5rem;background:rgba(255,255,255,.1);color:var(--foreground);font-size:.9rem}
.iv-step button:hover{background:rgba(255,255,255,.2)}
.iv-step b{min-width:2.4rem;text-align:center;font-weight:400}

/* ---------- inventory ---------- */
.iv-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.iv-search{flex:1 1 6rem;min-width:6rem;height:2.1rem;padding:0 .7rem 0 1.9rem;border-radius:.8rem;font-family:var(--font-rubik,inherit);font-size:.74rem;color:var(--foreground);background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.12);outline:none;width:100%}
.iv-search:focus{border-color:var(--mc-aqua)}
.iv-sel{height:2.1rem;padding:0 1.6rem 0 .7rem;border-radius:.8rem;font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:var(--foreground);background:rgba(0,0,0,.32) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E") no-repeat right .6rem center;border:1px solid rgba(255,255,255,.12);appearance:none;outline:none;cursor:pointer}
.iv-sel option{background:#15121f;color:#fff}
.iv-sub{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .5rem}
.iv-cats{flex:1 1 18rem;min-width:0;display:flex;gap:.3rem;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity;padding:.05rem 0 .1rem;-webkit-mask-image:linear-gradient(90deg,#000 94%,transparent);mask-image:linear-gradient(90deg,#000 94%,transparent)}
.iv-cats::-webkit-scrollbar{display:none}
.iv-chip{--c:var(--mc-aqua);flex:none;scroll-snap-align:start;display:inline-flex;align-items:center;gap:.3rem;height:1.7rem;padding:0 .6rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground);background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);transition:background .15s,color .15s;outline:none;white-space:nowrap}
.iv-chip:hover{color:var(--foreground)}
.iv-chip[data-on="true"]{color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 55%,transparent)}
.iv-chip em{font-style:normal;opacity:.6;font-size:.58rem}
.iv-stats{display:flex;gap:.3rem;flex:none;margin-left:auto}
.iv-kv{display:flex;flex-direction:column;gap:.1rem;padding:.35rem .6rem;border-radius:.8rem;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);min-width:0}
.iv-kv small{font-family:var(--font-rubik,inherit);font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground)}
.iv-kv b{font-family:var(--font-minecraft,inherit);font-size:.82rem;font-weight:400;color:var(--c,#fff);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iv-meter{height:.3rem;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.iv-meter i{display:block;height:100%;border-radius:999px;background:var(--mc-aqua)}
.iv-stats .iv-kv{flex-direction:row;align-items:center;gap:.4rem;height:1.7rem;padding:0 .55rem;border-radius:999px}
.iv-stats .iv-kv b{font-size:.7rem}
.iv-stats .iv-meter{width:2.6rem;flex:none}
@container (max-width:599px){.iv-stats{margin-left:0;width:100%}.iv-stats .iv-kv{flex:1;justify-content:center}.iv-stats .iv-meter{display:none}}

.iv-quick{display:flex;align-items:center;gap:.35rem;overflow-x:auto;scrollbar-width:none;padding:.05rem 0}
.iv-quick::-webkit-scrollbar{display:none}
.iv-qe{--ic:var(--mc-gold);flex:none;display:inline-flex;align-items:center;gap:.2rem;padding:.15rem;border-radius:.8rem;background:color-mix(in oklch,var(--ic) 10%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--ic) 40%,transparent)}
.iv-qe-i{display:inline-flex;align-items:center;gap:.3rem;height:1.7rem;padding:0 .45rem;border-radius:.6rem;color:var(--ic);font-size:1.2rem;outline:none}
.iv-qe-i b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.7rem;color:#fff}
.iv-qe>button:not(.iv-qe-i){height:1.7rem;padding:0 .55rem;border-radius:.6rem;font-family:var(--font-minecraft,inherit);font-size:.62rem;font-weight:700;color:var(--ic);background:color-mix(in oklch,var(--ic) 18%,transparent);transition:background .15s,transform .12s;outline:none}
.iv-qe>button:not(.iv-qe-i):hover{background:color-mix(in oklch,var(--ic) 34%,transparent)}
.iv-qe>button:not(.iv-qe-i):active{transform:scale(.94)}
.iv-qe>button[data-all="true"]{color:#111;background:var(--ic)}
.iv-qe>button:focus-visible,.iv-qe-i:focus-visible{outline:2px solid var(--mc-aqua);outline-offset:1px}

.iv-main{display:grid;gap:.6rem;grid-template-columns:minmax(0,1fr);align-items:start}
@container (min-width:600px){.iv-main{grid-template-columns:minmax(0,1fr) 15rem}.iv-main>aside{position:sticky;top:.4rem;max-height:calc(100dvh - 1rem);overflow-y:auto;scrollbar-width:thin}}
@container (min-width:760px){.iv-main{grid-template-columns:minmax(0,1fr) 16.5rem}}
@container (min-width:1020px){.iv-main{grid-template-columns:minmax(0,1fr) 18rem}}
@container (min-width:1300px){.iv-main{grid-template-columns:minmax(0,1fr) 21rem}}
.iv-grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:3px;padding:4px;border-radius:1rem;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.1);position:relative}
.iv-slot{--ic:#fff;--rc:rgba(255,255,255,.22);width:100%;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:.14rem;min-width:0;min-height:calc(var(--ico) + 2.35rem);padding:.5rem .15rem .3rem;border-radius:.65rem;color:var(--ic);background:linear-gradient(180deg,color-mix(in oklch,var(--ic) 15%,rgba(12,9,26,.82)),color-mix(in oklch,var(--ic) 4%,rgba(8,6,18,.88)));border:1px solid color-mix(in oklch,var(--rc) 38%,transparent);box-shadow:inset 0 -3px 0 color-mix(in oklch,var(--rc) 70%,transparent);transition:transform .12s,box-shadow .15s,opacity .15s,filter .15s,border-color .15s;outline:none;touch-action:manipulation;cursor:pointer;text-align:center}
.iv-slot[data-empty="true"]{min-height:calc(var(--ico) + .6rem);background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.09);box-shadow:none;cursor:default}
.iv-slot:not([data-empty="true"]):hover{transform:translateY(-1px);border-color:color-mix(in oklch,var(--rc) 80%,transparent);z-index:1}
.iv-slot[data-rar="4"],.iv-slot[data-rar="5"],.iv-slot[data-rar="6"]{box-shadow:inset 0 -3px 0 var(--rc),0 0 14px -6px var(--rc)}
.iv-slot[data-sel="true"]{border-color:var(--mc-aqua);box-shadow:0 0 0 2px var(--mc-aqua),0 0 18px -2px var(--mc-aqua);z-index:2}
.iv-slot[data-dim="true"]{opacity:.2;filter:grayscale(.8)}
.iv-slot[data-drop="true"]{box-shadow:0 0 0 2px var(--mc-green)}
.iv-slot[data-moving="true"]{animation:iv-pulse .8s ease-in-out infinite}
@keyframes iv-pulse{50%{opacity:.5}}
.iv-ico{font-size:var(--ico);line-height:1;filter:drop-shadow(0 0 9px color-mix(in oklch,var(--ic) 50%,transparent))}
.iv-nm{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:100%;min-height:2.24em;font-family:var(--font-rubik,inherit);font-size:var(--nm);line-height:1.12;color:#e9e5f4;overflow-wrap:anywhere}
.iv-ct{margin-top:auto;font-family:var(--font-minecraft,inherit);font-size:var(--ct);line-height:1;color:#fff;text-shadow:0 1px 0 #000}
.iv-ct i{font-style:normal;opacity:.45}
.iv-tg{position:absolute;top:.2rem;left:.2rem;display:grid;place-items:center;width:1.05rem;height:1.05rem;border-radius:.4rem;font-size:.66rem;line-height:1;color:var(--tc);background:color-mix(in oklch,var(--tc) 18%,rgba(0,0,0,.55));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--tc) 55%,transparent);pointer-events:none}
.iv-fl{position:absolute;top:.2rem;right:.2rem;display:flex;gap:.15rem;pointer-events:none}
.iv-lk,.iv-au{font-size:.62rem;line-height:1;text-shadow:0 1px 0 #000}
.iv-lk{color:var(--mc-gold)}
.iv-au{color:var(--mc-aqua)}
.iv-lockpg{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;border-radius:1rem;background:rgba(5,3,12,.8);backdrop-filter:blur(3px);text-align:center;padding:1rem}
.iv-lockpg p{font-family:var(--font-rubik,inherit);font-size:.74rem;color:var(--muted-foreground);max-width:19rem}
.iv-over{display:grid;grid-template-columns:repeat(auto-fill,minmax(4.6rem,1fr));gap:3px;padding:4px;border-radius:1rem;border:1px dashed color-mix(in oklch,var(--mc-gold) 50%,transparent);background:color-mix(in oklch,var(--mc-gold) 6%,transparent)}

.iv-panel{display:flex;flex-direction:column;gap:.5rem;padding:.7rem;border-radius:1.1rem;background:linear-gradient(180deg,color-mix(in oklch,var(--pc,#7dd3ff) 8%,var(--card)),color-mix(in oklch,var(--card) 85%,#000));border:1px solid color-mix(in oklch,var(--pc,#7dd3ff) 30%,rgba(255,255,255,.1));scroll-margin:.5rem}
.iv-ph{display:flex;align-items:center;gap:.65rem}
.iv-pn{font-family:var(--font-minecraft,inherit);font-size:.95rem;font-weight:700;line-height:1.15}
.iv-tags{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.2rem}
.iv-tag{padding:.05rem .5rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;border:1px solid currentColor;background:rgba(0,0,0,.25)}
.iv-pd{font-family:var(--font-rubik,inherit);font-size:.72rem;line-height:1.45;color:var(--muted-foreground)}
.iv-kvs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.3rem}
.iv-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(6.4rem,1fr));gap:.35rem}
.iv-row{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.iv-sellrow{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.4rem;align-items:center}
@container (max-width:439px){.iv-sellrow{grid-template-columns:minmax(0,1fr)}}
@container (min-width:600px) and (max-width:1299px){.iv-main>aside .iv-sellrow{grid-template-columns:minmax(0,1fr)}.iv-main>aside .iv-q{display:flex}}
.iv-q{display:inline-flex;padding:.12rem;border-radius:.65rem;background:rgba(0,0,0,.32);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.iv-q button{flex:1;height:1.7rem;min-width:2.2rem;padding:0 .45rem;border-radius:.5rem;font-family:var(--font-minecraft,inherit);font-size:.62rem;font-weight:700;color:var(--muted-foreground);outline:none}
.iv-q button[data-on="true"]{color:var(--mc-aqua);background:color-mix(in oklch,var(--mc-aqua) 20%,transparent)}
.iv-pets{display:grid;grid-template-columns:repeat(auto-fill,minmax(8.4rem,1fr));gap:.3rem;max-height:12rem;overflow-y:auto;padding:.15rem}
.iv-pet{display:flex;align-items:center;gap:.4rem;padding:.35rem .45rem;border-radius:.65rem;font-family:var(--font-rubik,inherit);font-size:.64rem;text-align:left;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);transition:background .15s}
.iv-pet:hover{background:rgba(255,255,255,.1)}
.iv-pet small{display:block;color:var(--muted-foreground);font-size:.55rem}
@container (max-width:599px){.iv-empty{display:none!important}}
.iv-empty{display:flex;flex-direction:column;gap:.35rem;padding:1rem .8rem;border-radius:1.1rem;border:1px dashed rgba(255,255,255,.14);background:rgba(255,255,255,.02)}

.iv-tools{position:relative;display:flex;flex-direction:column;gap:.55rem;padding:.65rem;border-radius:1.1rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22)}
.iv-x{position:absolute;top:.4rem;right:.4rem;display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:.5rem;color:var(--muted-foreground)}
.iv-x:hover{background:rgba(255,255,255,.1);color:var(--foreground)}
@container (min-width:600px){.iv-tools .iv-form{grid-template-columns:minmax(0,1fr)}.iv-tools .iv-prev,.iv-tools .iv-lines{grid-template-columns:minmax(0,1fr)}.iv-tools .iv-prev{max-height:13rem}}
.iv-form{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.45rem .7rem;align-items:center}
@container (max-width:439px){.iv-form{grid-template-columns:minmax(0,1fr)}}
.iv-chips{display:flex;flex-wrap:wrap;gap:.3rem}
.iv-prev{display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:.25rem;max-height:11rem;overflow-y:auto}
.iv-line{display:flex;align-items:center;gap:.45rem;padding:.25rem .4rem;border-radius:.65rem;background:rgba(255,255,255,.04);font-family:var(--font-rubik,inherit);font-size:.68rem;min-width:0}
.iv-line>span:not(.iv-g){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iv-line b{font-family:var(--font-minecraft,inherit);font-weight:400;color:var(--mc-aqua);font-size:.7rem}
.iv-lines{display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:.3rem}

/* ---------- shop ---------- */
.sh-top{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .6rem}
.sh-top .iv-wallet{flex:1 1 auto}
.sh-clock{display:inline-flex;align-items:center;gap:.35rem;height:1.9rem;padding:0 .65rem;border-radius:.7rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground);background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);white-space:nowrap}
.sh-clock b{font-family:var(--font-minecraft,inherit);font-weight:400;color:var(--mc-yellow);font-size:.74rem}
.sh-nav{display:flex;align-items:center;gap:.4rem}
.sh-nav .iv-seg{overflow-x:auto;scrollbar-width:none;max-width:100%}
.sh-nav .iv-seg::-webkit-scrollbar{display:none}
.sh-nav .iv-seg button{flex:none}
.sh-nav{flex-wrap:wrap}
.sh-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-left:auto}
.sh-toggle{display:inline-flex;align-items:center;gap:.35rem;height:1.8rem;padding:0 .6rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground);background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);white-space:nowrap}
.sh-toggle[data-on="true"]{color:var(--mc-green);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--mc-green) 60%,transparent);background:color-mix(in oklch,var(--mc-green) 12%,transparent)}
.sh-group{display:flex;flex-direction:column;gap:.35rem}
.sh-gh{display:flex;align-items:center;gap:.5rem;font-family:var(--font-minecraft,inherit);font-size:.62rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gc,var(--mc-aqua))}
.sh-gh::after{content:"";flex:1;height:1px;background:color-mix(in oklch,var(--gc,var(--mc-aqua)) 35%,transparent)}
.sh-gh small{font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.04em;text-transform:none;color:var(--muted-foreground);font-weight:400}

.sh-grid{display:grid;gap:.4rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))}
.sh-deals{display:grid;gap:.4rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,10.5rem),1fr))}
.sh-card{--c:var(--mc-aqua);position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"i t b" "o o o";align-items:center;gap:.35rem .65rem;padding:.55rem .65rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--c) 9%,rgba(10,8,22,.7)),color-mix(in oklch,var(--c) 3%,rgba(8,6,18,.75)));transition:transform .15s,box-shadow .2s,border-color .15s;min-width:0}
.sh-card[data-can="true"]{border-color:color-mix(in oklch,var(--c) 62%,transparent);box-shadow:0 0 18px -10px var(--c)}
.sh-card[data-lock="true"]{opacity:.55;filter:grayscale(.5)}
.sh-card[data-out="true"]{opacity:.5}
.sh-card:hover{transform:translateY(-1px)}
.sh-i{grid-area:i}
.sh-t{grid-area:t;min-width:0}
.sh-b{grid-area:b;display:flex;flex-direction:column;align-items:flex-end;gap:.25rem}
.sh-o{grid-area:o}
.sh-n{display:block;font-family:var(--font-minecraft,inherit);font-size:.78rem;font-weight:700;line-height:1.15;color:color-mix(in oklch,var(--c) 70%,#fff)}
.sh-d{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-family:var(--font-rubik,inherit);font-size:.62rem;line-height:1.3;color:var(--muted-foreground)}
.sh-meta{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.25rem}
.sh-pill{padding:.02rem .45rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.54rem;color:var(--muted-foreground);background:rgba(255,255,255,.07)}
.sh-pill[data-hot="true"]{color:var(--mc-gold);background:color-mix(in oklch,var(--mc-gold) 14%,transparent)}
.sh-price{display:inline-flex;align-items:center;gap:.3rem;font-family:var(--font-minecraft,inherit);font-size:.8rem;white-space:nowrap}
.sh-price s{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.sh-need{font-family:var(--font-rubik,inherit);font-size:.54rem;color:var(--muted-foreground);white-space:nowrap}
.sh-bar{height:3px;width:100%;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:.1rem}
.sh-bar i{display:block;height:100%;background:var(--c)}
.sh-b .iv-btn{height:1.9rem;min-width:5.6rem}
@container (max-width:459px){
  .sh-card{grid-template-columns:auto minmax(0,1fr);grid-template-areas:"i t" "b b" "o o"}
  .sh-b{flex-direction:row;align-items:center;justify-content:space-between;gap:.5rem}
  .sh-b>.sh-pr{display:flex;flex-direction:column;align-items:flex-start;gap:.15rem;min-width:0}
  .sh-b .iv-btn{flex:1;max-width:11rem}
}
.sh-odds{display:flex;height:5px;border-radius:999px;overflow:hidden;gap:1px}
.sh-odds i{display:block;height:100%}
.sh-odds-l{display:flex;flex-wrap:wrap;gap:.1rem .5rem;margin-top:.2rem;font-family:var(--font-rubik,inherit);font-size:.54rem}

.sh-deal{--c:var(--mc-yellow);position:relative;display:flex;flex-direction:column;align-items:center;gap:.35rem;padding:.7rem .5rem .6rem;border-radius:1rem;text-align:center;border:1px solid color-mix(in oklch,var(--c) 32%,transparent);background:linear-gradient(180deg,color-mix(in oklch,var(--c) 12%,rgba(10,8,22,.75)),rgba(8,6,18,.8));min-width:0;transition:transform .15s,box-shadow .2s}
.sh-deal[data-can="true"]{border-color:color-mix(in oklch,var(--c) 65%,transparent);box-shadow:0 0 20px -10px var(--c)}
.sh-deal[data-out="true"]{opacity:.45;filter:grayscale(.6)}
.sh-deal[data-lock="true"]{opacity:.55}
.sh-deal:hover{transform:translateY(-1px)}
.sh-deal .iv-g{margin-top:.1rem}
.sh-off{position:absolute;top:.35rem;right:.4rem;padding:.04rem .42rem;border-radius:999px;background:var(--mc-red);color:#fff;font-family:var(--font-minecraft,inherit);font-size:.56rem}
.sh-left{display:flex;gap:2px;justify-content:center}
.sh-left i{width:.5rem;height:.28rem;border-radius:999px;background:rgba(255,255,255,.14)}
.sh-left i[data-on="true"]{background:var(--c)}
.sh-deal .iv-btn{width:100%}

.sh-pips{display:flex;gap:.15rem;margin-top:.3rem}
.sh-pips i{width:.6rem;height:.3rem;border-radius:999px;background:rgba(255,255,255,.14)}
.sh-pips i[data-on="true"]{background:var(--c)}
.sh-bb{display:flex;align-items:center;gap:.6rem;padding:.4rem .55rem;border-radius:.9rem;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);font-family:var(--font-rubik,inherit);font-size:.7rem;min-width:0}
.sh-bb>span:not(.iv-g){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.iv-slot,.iv-btn,.sh-card,.sh-deal{transition:none}.iv-slot[data-moving="true"]{animation:none}}
`;

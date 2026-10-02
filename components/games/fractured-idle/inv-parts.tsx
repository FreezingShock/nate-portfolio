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

// Pieces shared by the Inventory and the Shop: the item glyph, the item tooltip, the wallet bar, the booster strip.

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
    if (b) rows.push(["Effect", `+${Math.round(b.amount * 100)}% ${BOOST_LABEL[b.stat]}`, "var(--mc-green)"], ["Lasts", fmtLeft((boostMs(s, b)) / 1000)]);
    const p = PET_ITEM_BY_ID.get(id);
    if (p) rows.push(["Effect", p.star ? "+1 star on a pet" : `${Math.round((p.feed ?? 0) * 100)}% of a level`, "var(--mc-green)"]);
    const notes = [];
    if (isLocked(s, id)) notes.push({ text: "Locked: it will not be sold, bulk sold or auto-sold.", color: "var(--mc-gold)" });
    if (s.inv.auto[id] !== undefined) notes.push({ text: `Auto-sell: keeps ${fmtInt(s.inv.auto[id])}, sells the rest.`, color: "var(--mc-aqua)" });
    return <TipCard title={def.name} color={rar.color} tag={rar.name} lines={[def.desc, extra]} rows={rows} notes={notes} />;
}

/** The player's four currencies as a sticky bar. */
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
.iv{display:flex;flex-direction:column;gap:.65rem;container-type:inline-size}
.iv-g{--ic:#fff;--rc:#fff;display:inline-grid;place-items:center;flex:none;border-radius:.6rem;color:var(--ic);background:radial-gradient(circle at 30% 25%,color-mix(in oklch,var(--ic) 28%,transparent),color-mix(in oklch,var(--ic) 8%,rgba(0,0,0,.35)));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--rc) 55%,transparent)}
.iv-g[data-size="sm"]{width:1.7rem;height:1.7rem;font-size:1rem}
.iv-g[data-size="md"]{width:2.4rem;height:2.4rem;font-size:1.35rem}
.iv-g[data-size="lg"]{width:3.4rem;height:3.4rem;font-size:2rem;border-radius:.9rem}
.iv-wallet{position:sticky;top:.4rem;z-index:15;display:flex;flex-wrap:wrap;gap:.4rem;padding:.4rem .5rem;border-radius:1rem;background:color-mix(in oklch,var(--card) 88%,#000);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.1);box-shadow:0 10px 26px -14px rgba(0,0,0,.8)}
.iv-bal{--c:var(--mc-aqua);display:inline-flex;align-items:center;gap:.4rem;padding:.25rem .6rem;border-radius:.7rem;color:var(--c);background:color-mix(in oklch,var(--c) 10%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 30%,transparent);cursor:help;outline:none}
.iv-bal b{font-family:var(--font-minecraft,inherit);font-size:.85rem}
.iv-bal small{font-family:var(--font-rubik,inherit);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground)}
.iv-boosts{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem}
.iv-boost{--bc:var(--mc-green);position:relative;display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .55rem;border-radius:.7rem;overflow:hidden;color:var(--bc);font-family:var(--font-rubik,inherit);font-size:.66rem;background:color-mix(in oklch,var(--bc) 12%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--bc) 45%,transparent)}
.iv-boost b{font-family:var(--font-minecraft,inherit);font-weight:400;color:#fff}
.iv-boost i{position:absolute;left:0;bottom:0;height:2px;background:var(--bc);transition:width .3s linear}
.iv-boost-n{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}

.iv-top{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.iv-pg{display:inline-flex;padding:.15rem;border-radius:.7rem;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.iv-pg button{height:1.7rem;min-width:2.2rem;padding:0 .6rem;border-radius:.55rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--muted-foreground);transition:background .15s,color .15s;outline:none}
.iv-pg button:hover{color:var(--foreground);background:rgba(255,255,255,.07)}
.iv-pg button[data-on="true"]{color:var(--mc-aqua);background:color-mix(in oklch,var(--mc-aqua) 20%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--mc-aqua) 55%,transparent)}
.iv-pg button[data-lock="true"]{opacity:.55}
.iv-pg button:focus-visible,.iv-btn:focus-visible,.iv-slot:focus-visible,.iv-chip:focus-visible,.iv-q button:focus-visible{outline:2px solid var(--mc-aqua);outline-offset:2px}
.iv-search{flex:1;min-width:8rem;max-width:16rem;height:2rem;padding:0 .7rem;border-radius:.7rem;font-family:var(--font-rubik,inherit);font-size:.72rem;color:var(--foreground);background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);outline:none}
.iv-search:focus{border-color:var(--mc-aqua)}
.iv-btn{display:inline-flex;align-items:center;gap:.3rem;height:1.9rem;padding:0 .75rem;border-radius:.7rem;font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:var(--c,var(--mc-green));border:1px solid color-mix(in oklch,var(--c,var(--mc-green)) 50%,transparent);background:color-mix(in oklch,var(--c,var(--mc-green)) 10%,transparent);transition:background .15s,transform .12s,opacity .15s}
.iv-btn:hover:not(:disabled){background:color-mix(in oklch,var(--c,var(--mc-green)) 22%,transparent);transform:translateY(-1px)}
.iv-btn:active:not(:disabled){transform:scale(.95)}
.iv-btn:disabled{opacity:.4;cursor:not-allowed}
.iv-btn[data-on="true"]{background:color-mix(in oklch,var(--c,var(--mc-green)) 26%,transparent);box-shadow:inset 0 0 0 1px var(--c,var(--mc-green))}
.iv-chips{display:flex;flex-wrap:wrap;gap:.3rem}
.iv-chip{--c:var(--mc-aqua);display:inline-flex;align-items:center;gap:.3rem;height:1.6rem;padding:0 .6rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground);background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);transition:background .15s,color .15s;outline:none}
.iv-chip:hover{color:var(--foreground)}
.iv-chip[data-on="true"]{color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 55%,transparent)}
.iv-main{display:grid;gap:.7rem;grid-template-columns:minmax(0,1fr);align-items:start}
@container (min-width:780px){.iv-main{grid-template-columns:minmax(0,1fr) 20rem}}
.iv-grid{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:.3rem;padding:.45rem;border-radius:1rem;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.1);position:relative}
.iv-slot{--ic:#fff;--rc:rgba(255,255,255,.25);position:relative;aspect-ratio:1;display:grid;place-items:center;min-width:0;border-radius:.55rem;color:var(--ic);font-size:clamp(.95rem,3.4vw,1.55rem);background:radial-gradient(circle at 30% 25%,color-mix(in oklch,var(--ic) 20%,transparent),color-mix(in oklch,var(--ic) 6%,rgba(8,6,18,.7)));border:1px solid color-mix(in oklch,var(--rc) 55%,transparent);transition:transform .12s,box-shadow .15s,opacity .15s,filter .15s;outline:none;touch-action:manipulation;cursor:pointer}
.iv-slot[data-empty="true"]{background:rgba(255,255,255,.025);border:1px dashed rgba(255,255,255,.1);cursor:default}
.iv-slot:not([data-empty="true"]):hover{transform:translateY(-1px) scale(1.04);box-shadow:0 0 14px -4px var(--rc)}
.iv-slot[data-rar="4"],.iv-slot[data-rar="5"],.iv-slot[data-rar="6"]{box-shadow:0 0 12px -4px var(--rc),inset 0 0 10px -6px var(--rc)}
.iv-slot[data-sel="true"]{box-shadow:0 0 0 2px var(--mc-aqua),0 0 16px -2px var(--mc-aqua);transform:scale(1.06)}
.iv-slot[data-dim="true"]{opacity:.22;filter:grayscale(.7)}
.iv-slot[data-drop="true"]{box-shadow:0 0 0 2px var(--mc-green)}
.iv-slot[data-moving="true"]{animation:iv-pulse .8s ease-in-out infinite}
@keyframes iv-pulse{50%{opacity:.5}}
.iv-n{position:absolute;right:.12rem;bottom:.05rem;font-family:var(--font-minecraft,inherit);font-size:clamp(.5rem,1.6vw,.68rem);color:#fff;text-shadow:0 1px 0 #000,0 0 4px #000;pointer-events:none}
.iv-lk,.iv-au{position:absolute;top:.08rem;font-size:.55rem;pointer-events:none;text-shadow:0 1px 0 #000}
.iv-lk{left:.15rem;color:var(--mc-gold)}
.iv-au{right:.15rem;color:var(--mc-aqua)}
.iv-lockpg{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;border-radius:1rem;background:rgba(5,3,12,.78);backdrop-filter:blur(3px);text-align:center;padding:1rem}
.iv-lockpg p{font-family:var(--font-rubik,inherit);font-size:.72rem;color:var(--muted-foreground);max-width:18rem}
.iv-panel{display:flex;flex-direction:column;gap:.55rem;padding:.7rem;border-radius:1rem;background:color-mix(in oklch,var(--card) 80%,#000);border:1px solid rgba(255,255,255,.12)}
.iv-ph{display:flex;align-items:center;gap:.6rem}
.iv-pn{font-family:var(--font-minecraft,inherit);font-size:.9rem;font-weight:700}
.iv-pr{font-family:var(--font-rubik,inherit);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase}
.iv-pd{font-family:var(--font-rubik,inherit);font-size:.7rem;line-height:1.45;color:var(--muted-foreground)}
.iv-rows{display:grid;grid-template-columns:auto 1fr;gap:.15rem .8rem;font-family:var(--font-rubik,inherit);font-size:.68rem}
.iv-rows dt{color:var(--muted-foreground)}
.iv-rows dd{text-align:right;font-family:var(--font-minecraft,inherit);font-size:.72rem}
.iv-h{font-family:var(--font-minecraft,inherit);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground);margin-top:.2rem}
.iv-row{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem}
.iv-q{display:inline-flex;padding:.12rem;border-radius:.6rem;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.iv-q button{height:1.5rem;min-width:2rem;padding:0 .4rem;border-radius:.45rem;font-family:var(--font-minecraft,inherit);font-size:.6rem;font-weight:700;color:var(--muted-foreground);outline:none}
.iv-q button[data-on="true"]{color:var(--mc-aqua);background:color-mix(in oklch,var(--mc-aqua) 20%,transparent)}
.iv-step{display:inline-flex;align-items:center;gap:.2rem;font-family:var(--font-minecraft,inherit);font-size:.72rem}
.iv-step button{width:1.5rem;height:1.5rem;border-radius:.4rem;background:rgba(255,255,255,.1);color:var(--foreground)}
.iv-step button:hover{background:rgba(255,255,255,.2)}
.iv-pets{display:grid;grid-template-columns:repeat(auto-fill,minmax(8rem,1fr));gap:.3rem;max-height:12rem;overflow-y:auto;padding:.2rem}
.iv-pet{display:flex;align-items:center;gap:.35rem;padding:.3rem .4rem;border-radius:.6rem;font-family:var(--font-rubik,inherit);font-size:.62rem;text-align:left;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);transition:background .15s}
.iv-pet:hover{background:rgba(255,255,255,.1)}
.iv-pet small{display:block;color:var(--muted-foreground);font-size:.55rem}
.iv-card{padding:.65rem .75rem;border-radius:1rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.2)}
.iv-over{display:flex;flex-wrap:wrap;gap:.3rem;padding:.4rem;border-radius:.9rem;border:1px dashed color-mix(in oklch,var(--mc-gold) 50%,transparent);background:color-mix(in oklch,var(--mc-gold) 6%,transparent)}
.iv-over .iv-slot{width:2.6rem;aspect-ratio:1}
.iv-note{font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.iv-prev{max-height:10rem;overflow-y:auto;display:flex;flex-direction:column;gap:.15rem;font-family:var(--font-rubik,inherit);font-size:.66rem}
.iv-prev div{display:flex;align-items:center;gap:.4rem}
.iv-prev span:not(.iv-g){flex:1}
.iv-rule{display:flex;align-items:center;gap:.5rem;padding:.3rem .4rem;border-radius:.7rem;background:rgba(255,255,255,.04);font-family:var(--font-rubik,inherit);font-size:.68rem}
.iv-rule span:not(.iv-g){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.sh-tabs{display:flex;flex-wrap:wrap;gap:.3rem}
.sh-tab{--c:var(--mc-aqua);display:inline-flex;align-items:center;gap:.35rem;height:2rem;padding:0 .8rem;border-radius:.8rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--muted-foreground);background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transition:background .15s,color .15s;outline:none}
.sh-tab:hover{color:var(--foreground)}
.sh-tab:focus-visible{outline:2px solid var(--c);outline-offset:2px}
.sh-tab[data-on="true"]{color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 55%,transparent)}
.sh-tab em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.58rem;padding:0 .35rem;border-radius:999px;background:rgba(255,255,255,.12)}
.sh-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}
.sh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.5rem}
.sh-card{--c:var(--mc-aqua);position:relative;display:flex;flex-direction:column;gap:.45rem;padding:.65rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 30%,transparent);background:color-mix(in oklch,var(--c) 6%,rgba(0,0,0,.25));transition:transform .15s,box-shadow .2s,border-color .15s}
.sh-card[data-can="true"]{border-color:color-mix(in oklch,var(--c) 65%,transparent);box-shadow:0 0 18px -10px var(--c)}
.sh-card[data-lock="true"]{opacity:.55;filter:grayscale(.5)}
.sh-card[data-out="true"]{opacity:.5}
.sh-h{display:flex;align-items:center;gap:.6rem}
.sh-n{display:block;font-family:var(--font-minecraft,inherit);font-size:.78rem;font-weight:700;color:color-mix(in oklch,var(--c) 70%,#fff)}
.sh-d{display:block;font-family:var(--font-rubik,inherit);font-size:.62rem;line-height:1.35;color:var(--muted-foreground)}
.sh-buy{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-top:auto}
.sh-price{display:inline-flex;align-items:center;gap:.3rem;font-family:var(--font-minecraft,inherit);font-size:.78rem;margin-right:auto}
.sh-price s{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.sh-off{position:absolute;top:.4rem;right:.5rem;padding:.05rem .45rem;border-radius:999px;background:var(--mc-red);color:#fff;font-family:var(--font-minecraft,inherit);font-size:.58rem}
.sh-own{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.sh-pips{display:flex;gap:.15rem}
.sh-pips i{width:.55rem;height:.3rem;border-radius:999px;background:rgba(255,255,255,.14)}
.sh-pips i[data-on="true"]{background:var(--c)}
.sh-bb{display:flex;align-items:center;gap:.6rem;padding:.4rem .55rem;border-radius:.8rem;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);font-family:var(--font-rubik,inherit);font-size:.7rem}
.sh-bb span:not(.iv-g){flex:1;min-width:0}
@media (prefers-reduced-motion:reduce){.iv-slot,.iv-btn,.sh-card{transition:none}.iv-slot[data-moving="true"]{animation:none}}
`;

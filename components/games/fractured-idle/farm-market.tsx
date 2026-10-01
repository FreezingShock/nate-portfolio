"use client";

import { sfx } from "@/lib/sound/sounds";
import { McSymbol } from "@/components/mc-symbol";
import {
    DIMS,
    DIM_CROPS,
    DIM_LABEL,
    ENCH_BASE,
    TOOLS,
    enchNeed,
    enchStock,
    enchantAll,
    enchantCrop,
    enchantable,
    farmCtx,
    farmLevel,
    gardenOpen,
    haveCrop,
    reservedEnch,
    sellAllEnchanted,
    sellEnchanted,
    sellMult,
    sellValue,
    type CropDef,
} from "@/lib/fractured-idle/farm";
import { C, UpgradeList, col, fmtPct } from "./farm-bits";
import { Tip, TipCard } from "./tooltip";
import { SectionTitle, type Ctx } from "./ui";

// The Market: raw crops pile up, so turn them into Enchanted crops (160 raw each, fewer with the Enchanting Table),
// sell those for shards that help the whole game, or keep them: every tool is made of them.

type P = { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void; say: (m: string) => void };

export function Market({ s, d, F, render, say }: P) {
    const f = s.farm;
    const ctx = farmCtx(d);
    const need = enchNeed(s);
    const total = DIMS.reduce((a, dm) => a + DIM_CROPS[dm].reduce((b, c) => b + enchStock(s, c.id), 0), 0);
    const makeable = DIMS.reduce((a, dm) => a + DIM_CROPS[dm].reduce((b, c) => b + enchantable(s, c), 0), 0);
    const keep = reservedEnch(s);
    const surplusValue = DIM_CROPS.overworld.concat(DIM_CROPS.nether, DIM_CROPS.end).reduce((a, c) => a + Math.max(0, enchStock(s, c.id) - (keep[c.id] || 0)) * sellValue(s, ctx, c), 0);
    const nextTools = TOOLS.filter((t) => !f.tools.includes(t.id)).length;

    const sell = (id: CropDef["id"], n: number, keepN = 0) => {
        const r = sellEnchanted(s, ctx, id, n, keepN);
        if (r.n) {
            say(`Sold ${r.n} Enchanted ${id} for ${F(r.shards)} shards.`);
            sfx("bulk");
            render();
        }
    };

    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{F(total)}</b> Enchanted crops in stock <span>{F(f.enchanted)} made · {F(f.soldN)} sold · {F(f.sold)} shards earned</span>
                </div>
                <small>
                    {ENCH_BASE === need ? `Each one takes ${need} raw crops.` : `Each one takes ${need} raw crops (${ENCH_BASE - need} fewer from the Enchanting Table).`} Sales pay shards for your whole game, +{fmtPct(sellMult(s) - 1)} from the Market Stall. Tools are made of Enchanted crops, so keep what the next tool needs: {nextTools} tools are still unmade.
                </small>
            </div>

            <div className="fi-mk-act">
                <button
                    type="button"
                    className="fi-mn-buy small"
                    disabled={makeable === 0}
                    onClick={() => {
                        const n = enchantAll(s);
                        if (n) {
                            say(`Enchanted ${n} crop${n > 1 ? "s" : ""}.`);
                            sfx("bulk");
                            render();
                        }
                    }}
                >
                    Enchant all possible {makeable ? `(${F(makeable)})` : ""}
                </button>
                <Tip box tip={<TipCard title="Sell extra" color="var(--mc-yellow)" lines={["Sells every Enchanted crop except what the next tool of each kind still needs."]} rows={[["Worth about", `${F(surplusValue)} shards`]]} />}>
                    <button
                        type="button"
                        className="fi-mn-buy small ghost"
                        disabled={surplusValue <= 0}
                        onClick={() => {
                            const r = sellAllEnchanted(s, ctx, true);
                            if (r.n) {
                                say(`Sold ${F(r.n)} Enchanted crops for ${F(r.shards)} shards.`);
                                sfx("bulk");
                                render();
                            }
                        }}
                    >
                        Sell extra
                    </button>
                </Tip>
                <Tip box tip={<TipCard title="Sell everything" color="var(--mc-red)" lines={["Sells every Enchanted crop, including ones the next tools need."]} />}>
                    <button
                        type="button"
                        className="fi-mn-buy small ghost"
                        disabled={total === 0}
                        onClick={() => {
                            const r = sellAllEnchanted(s, ctx, false);
                            if (r.n) {
                                say(`Sold ${F(r.n)} Enchanted crops for ${F(r.shards)} shards.`);
                                sfx("bulk");
                                render();
                            }
                        }}
                    >
                        Sell all
                    </button>
                </Tip>
            </div>

            {DIMS.map((dm) => {
                if (!gardenOpen(s, dm)) return null;
                const list = DIM_CROPS[dm].filter((c) => farmLevel(s) >= c.need || (f.grown[c.id] || 0) > 0);
                if (!list.length) return null;
                return (
                    <div key={dm} className="fi-mn-dimblock">
                        <SectionTitle color={DIM_LABEL[dm].color}>{DIM_LABEL[dm].name}</SectionTitle>
                        <div className="fi-mk-rows">
                            {list.map((c) => {
                                const raw = Math.floor(haveCrop(s, c.id));
                                const can = enchantable(s, c);
                                const have = enchStock(s, c.id);
                                const val = sellValue(s, ctx, c);
                                const kept = keep[c.id] || 0;
                                return (
                                    <div key={c.id} className="fi-mk-row" style={col(c.color)}>
                                        <i className="fi-mn-sw" />
                                        <div className="fi-mk-n">
                                            <b>{c.name}</b>
                                            <small>
                                                {F(raw)} raw <em>·</em> <span style={{ color: c.color }}>{F(have)} enchanted</span>
                                                {kept > 0 && <> <em>·</em> {kept} reserved for tools</>}
                                            </small>
                                            <div className="fi-mk-bar"><i style={{ width: `${Math.min(100, (raw / need) * 100)}%` }} /></div>
                                        </div>
                                        <div className="fi-mk-b">
                                            <Tip box tip={<TipCard title={`Enchanted ${c.name}`} color={c.color} lines={[`${need} raw ${c.name} become one.`]} rows={[["Sells for", `${F(val)} shards`], ["You can make", String(can)]]} foot={can ? "Click to enchant one!" : `Needs ${Math.max(0, need - raw)} more`} />}>
                                                <button type="button" className="fi-mn-buy small" disabled={can < 1} onClick={() => { if (enchantCrop(s, c.id, 1)) { sfx("equip"); render(); } }}>
                                                    <McSymbol name="spark6" /> Enchant
                                                </button>
                                            </Tip>
                                            {can > 1 && (
                                                <button type="button" className="fi-mn-buy small ghost" onClick={() => { const n = enchantCrop(s, c.id, Infinity); if (n) { sfx("bulk"); render(); } }}>
                                                    x{can}
                                                </button>
                                            )}
                                            <Tip box tip={<TipCard title={`Sell ${c.name}`} color="var(--mc-yellow)" lines={["Pays shards for your whole game."]} rows={[["Each", `${F(val)} shards`], ["All of them", `${F(val * have)} shards`]]} />}>
                                                <button type="button" className="fi-mn-buy small ghost" disabled={have < 1} onClick={() => sell(c.id, 1)}>
                                                    Sell
                                                </button>
                                            </Tip>
                                            {have > 1 && (
                                                <button type="button" className="fi-mn-buy small ghost" onClick={() => sell(c.id, Infinity, kept)} aria-label={`Sell extra Enchanted ${c.name}`}>
                                                    Extra
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <SectionTitle color="#ff9a4d">Market upgrades</SectionTitle>
            <UpgradeList s={s} cat="market" render={render} />
            <p className="fi-mn-note" style={{ color: C }}>Enchanting and selling are permanent progress: sales pay shards at your current income, so the later you sell, the more each one is worth.</p>
        </>
    );
}

export const MARKET_CSS = `
.fi-mk-act{display:flex;flex-wrap:wrap;gap:.4rem}
.fi-mk-rows{display:flex;flex-direction:column;gap:.3rem}
.fi-mk-row{display:flex;align-items:center;gap:.6rem;padding:.4rem .55rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--oc) 28%,transparent);background:linear-gradient(120deg,color-mix(in oklch,var(--oc) 7%,transparent),transparent 70%)}
.fi-mk-n{display:flex;flex-direction:column;gap:.1rem;min-width:0;flex:1}
.fi-mk-n b{font-family:var(--font-minecraft,inherit);font-size:.74rem;color:var(--oc)}
.fi-mk-n small{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.fi-mk-n em{font-style:normal;opacity:.5}
.fi-mk-bar{height:3px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-mk-bar i{display:block;height:100%;background:var(--oc);box-shadow:0 0 6px var(--oc)}
.fi-mk-b{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.25rem}
.fi-mk-b .fi-tw-box{display:block}
@media (max-width:520px){.fi-mk-row{flex-direction:column;align-items:stretch}.fi-mk-b{justify-content:flex-start}}
`;

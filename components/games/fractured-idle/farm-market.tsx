"use client";

import { useState } from "react";
import { TabBar, type TabItem } from "./tab-bar";
import { sfx } from "@/lib/sound/sounds";
import {
    DEMAND_MULT,
    DIMS,
    DIM_CROPS,
    DIM_LABEL,
    ENCH_BASE,
    GOODS,
    KIND_INFO,
    RANKS,
    TOOLS,
    cropIcon,
    demandKind,
    demandLeft,
    enchNeed,
    enchStock,
    enchantAll,
    enchantCrop,
    enchantable,
    farmCtx,
    farmLevel,
    gardenOpen,
    goodValue,
    haveCrop,
    rankIdx,
    rankOf,
    rawValue,
    reserveMap,
    sellAllEnchanted,
    sellEnchanted,
    sellGood,
    sellMult,
    sellRaw,
    sellValue,
    type CropDef,
    type GoodId,
} from "@/lib/fractured-idle/farm";
import { fmtTime } from "@/lib/fractured-idle/engine";
import { C, UpgradeList, col, fmtPct } from "./farm-bits";
import { ItemIcon, iconOf } from "./skill-kit";
import { SectionTitle, type Ctx } from "./ui";

// The Market. Raw crops pile up, so turn them into Enchanted crops (160 raw each; the Enchanting Table, your Packers
// and your merchant rank bring that down), sell those for shards that help the whole game, or keep them: every hoe
// and tool is made of them. You can also sell raw crops and goods. The market craves one kind of crop at a time.

type P = { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void; say: (m: string) => void };
type Tab = "enchant" | "raw" | "goods";
const MARKET_TABS: TabItem<Tab>[] = [
    { id: "enchant", label: "Enchant and sell", symbol: "magicFind", group: "", color: "#ffaa00", blurb: "Pack crops into Enchanted crops and sell them." },
    { id: "raw", label: "Raw crop stall", symbol: "flower", group: "", color: "#9be04a", blurb: "Sell crops as they come." },
    { id: "goods", label: "Goods", symbol: "heat", group: "", color: "#ff9a4d", blurb: "Sell the goods you cooked." },
];

export function Market({ s, d, F, render, say }: P) {
    const f = s.farm;
    const ctx = farmCtx(d);
    const [tab, setTab] = useState<Tab>("enchant");
    const need = enchNeed(s);
    const rank = rankOf(s);
    const ri = rankIdx(s);
    const nextRank = RANKS[ri + 1];
    const crops = DIMS.flatMap((dm) => (gardenOpen(s, dm) ? DIM_CROPS[dm].filter((c) => farmLevel(s) >= c.need || (f.grown[c.id] || 0) > 0) : []));
    const total = crops.reduce((a, c) => a + enchStock(s, c.id), 0);
    const makeable = crops.reduce((a, c) => a + enchantable(s, c), 0);
    const keep = reserveMap(s);
    const surplus = crops.reduce((a, c) => a + Math.max(0, enchStock(s, c.id) - (keep[c.id] || 0)) * sellValue(s, ctx, c), 0);
    const dk = demandKind();
    const nextTools = TOOLS.filter((t) => !f.tools.includes(t.id)).length;

    const tell = (t: string) => {
        say(t);
        render();
    };
    return (
        <>
            <div className="fi-mk-top">
                <div className="fi-mk-rank">
                    <small>Merchant rank</small>
                    <b>{rank.name}</b>
                    <span>+{fmtPct(rank.sell)} sale price · {rank.cut} fewer raw per Enchanted crop</span>
                    <span className="fi-mk-bar">
                        <i style={{ width: `${nextRank ? Math.min(100, ((f.soldN - rank.at) / (nextRank.at - rank.at)) * 100) : 100}%` }} />
                    </span>
                    <em>{nextRank ? `${F(f.soldN)} / ${F(nextRank.at)} Enchanted crops sold for ${nextRank.name}` : "Top rank"}</em>
                </div>
                <div className="fi-mk-demand" style={col(KIND_INFO[dk].color)}>
                    <small>In demand now</small>
                    <b>{KIND_INFO[dk].name}</b>
                    <span>+{fmtPct((DEMAND_MULT - 1), 0)} for every crop of this kind</span>
                    <em>changes in {fmtTime(Math.ceil(demandLeft() / 1000))}</em>
                </div>
            </div>

            <div className="fi-mn-sum">
                <div>
                    <b>{F(total)}</b> Enchanted crops in stock <span>{F(f.enchanted)} made · {F(f.soldN)} sold · {F(f.sold)} shards earned</span>
                </div>
                <small>
                    Each Enchanted crop takes {need} raw crops{ENCH_BASE === need ? "" : ` (${ENCH_BASE - need} fewer thanks to the Table, your Packers and your rank)`}. Sales pay shards for the whole game. Hoes and tools are made of Enchanted crops, so the next ones are kept safe when you sell extra ({nextTools} tools still unmade).
                </small>
            </div>

            <div className="fi-mk-act">
                <button type="button" className="fi-lv-btn" disabled={makeable === 0} onClick={() => { const n = enchantAll(s); if (n) { sfx("bulk"); tell(`Enchanted ${n} crop${n > 1 ? "s" : ""}.`); } }}>
                    Enchant all possible {makeable ? `(${F(makeable)})` : ""}
                </button>
                <button type="button" className="fi-lv-btn ghost" disabled={surplus <= 0} title="Keeps what your next hoe and tools need" onClick={() => { const r = sellAllEnchanted(s, ctx, true); if (r.n) { sfx("bulk"); tell(`Sold ${F(r.n)} Enchanted crops for ${F(r.shards)} shards.`); } }}>
                    Sell extra (~{F(surplus)})
                </button>
                <button type="button" className="fi-lv-btn ghost" disabled={total === 0} onClick={() => { const r = sellAllEnchanted(s, ctx, false); if (r.n) { sfx("bulk"); tell(`Sold ${F(r.n)} Enchanted crops for ${F(r.shards)} shards.`); } }}>
                    Sell all
                </button>
            </div>

            <TabBar tabs={MARKET_TABS} current={tab} label="Market views" keys={false} onSelect={setTab} />

            {tab === "enchant" && DIMS.map((dm) => {
                const list = crops.filter((c) => c.dim === dm);
                if (!list.length) return null;
                return (
                    <div key={dm} className="fi-mn-dimblock">
                        <SectionTitle color={DIM_LABEL[dm].color}>{DIM_LABEL[dm].name}</SectionTitle>
                        <div className="fi-mk-grid">
                            {list.map((c) => <EnchantCard key={c.id} s={s} c={c} F={F} ctx={ctx} need={need} kept={keep[c.id] || 0} hot={c.kind === dk} render={render} say={say} />)}
                        </div>
                    </div>
                );
            })}

            {tab === "raw" && (
                <>
                    <p className="fi-mn-note">Raw crops sell for about half of what they are worth once enchanted: fine for getting shards now, better saved for enchanting. Your Packers leave a stock of each raw crop for upgrades.</p>
                    <div className="fi-mk-grid">
                        {crops.map((c) => {
                            const n = Math.floor(haveCrop(s, c.id));
                            const v = rawValue(s, ctx, c);
                            return (
                                <div key={c.id} className="fi-mk-card" data-hot={c.kind === dk} style={col(c.color)}>
                                    <ItemIcon icon={cropIcon[c.id]} color={c.color} n={n >= 1000 ? F(n) : n} />
                                    <b>{c.name}</b>
                                    <small>{F(v)} shards each{c.kind === dk ? " (in demand)" : ""}</small>
                                    <span className="bb">
                                        <button type="button" className="fi-lv-btn ghost" disabled={n < 10} onClick={() => { const r = sellRaw(s, ctx, c.id, 10); if (r.n) { sfx("tap"); render(); } }}>10</button>
                                        <button type="button" className="fi-lv-btn ghost" disabled={n < 1} onClick={() => { const r = sellRaw(s, ctx, c.id, Infinity, 0); if (r.n) { sfx("bulk"); tell(`Sold ${F(r.n)} ${c.name} for ${F(r.shards)} shards.`); } }}>All</button>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {tab === "goods" && (
                <>
                    <p className="fi-mn-note">Goods from the Kitchen sell for shards, worth more the longer they take to cook. Scarecrows still need them, so keep a few.</p>
                    <div className="fi-mk-grid">
                        {GOODS.filter((g) => (f.goods[g.id] || 0) > 0 || (f.made[g.id] || 0) > 0).map((g) => {
                            const n = f.goods[g.id] || 0;
                            const v = goodValue(s, ctx, g.id as GoodId);
                            return (
                                <div key={g.id} className="fi-mk-card" style={col(g.color)}>
                                    <ItemIcon icon={iconOf(g.id, "forge")} color={g.color} n={n} />
                                    <b>{g.name}</b>
                                    <small>{F(v)} shards each</small>
                                    <span className="bb">
                                        <button type="button" className="fi-lv-btn ghost" disabled={n < 1} onClick={() => { const r = sellGood(s, ctx, g.id as GoodId, 1); if (r.n) { sfx("tap"); render(); } }}>1</button>
                                        <button type="button" className="fi-lv-btn ghost" disabled={n < 1} onClick={() => { const r = sellGood(s, ctx, g.id as GoodId); if (r.n) { sfx("bulk"); tell(`Sold ${r.n} ${g.name} for ${F(r.shards)} shards.`); } }}>All</button>
                                    </span>
                                </div>
                            );
                        })}
                        {GOODS.every((g) => !(f.goods[g.id] || 0) && !(f.made[g.id] || 0)) && <span className="fi-sk-hint">No goods yet: cook something in the Kitchen.</span>}
                    </div>
                </>
            )}

            <SectionTitle color="#ff9a4d">Market upgrades</SectionTitle>
            <UpgradeList s={s} cat="market" render={render} />
            <p className="fi-mn-note" style={{ color: C }}>Sales pay shards at your current income, so the later you sell, the more each one is worth. Sale price now: x{sellMult(s).toFixed(2)}.</p>
        </>
    );
}

function EnchantCard({ s, c, F, ctx, need, kept, hot, render, say }: { s: Ctx["s"]; c: CropDef; F: (n: number) => string; ctx: ReturnType<typeof farmCtx>; need: number; kept: number; hot: boolean; render: () => void; say: (m: string) => void }) {
    const raw = Math.floor(haveCrop(s, c.id));
    const can = enchantable(s, c);
    const have = enchStock(s, c.id);
    const val = sellValue(s, ctx, c);
    return (
        <div className="fi-mk-card" data-hot={hot} style={col(c.color)}>
            <ItemIcon icon={cropIcon[c.id]} color={c.color} n={have || undefined} ench={have > 0} />
            <b>{c.name}</b>
            <small>{F(raw)} raw · {F(val)} each{hot ? " ✦ in demand" : ""}</small>
            <span className="fi-mk-bar"><i style={{ width: `${Math.min(100, (raw / need) * 100)}%` }} /></span>
            <small>{kept > 0 ? `${kept} kept for tools` : `${Math.min(raw, need)} / ${need} to the next`}</small>
            <span className="bb">
                <button type="button" className="fi-lv-btn" disabled={can < 1} onClick={() => { if (enchantCrop(s, c.id, 1)) { sfx("equip"); render(); } }}>Enchant{can > 1 ? ` ${can}` : ""}</button>
                <button type="button" className="fi-lv-btn ghost" disabled={have < 1} onClick={() => { const r = sellEnchanted(s, ctx, c.id, 1); if (r.n) { sfx("tap"); render(); } }}>Sell</button>
                {have > 1 && <button type="button" className="fi-lv-btn ghost" onClick={() => { const r = sellEnchanted(s, ctx, c.id, Infinity, kept); if (r.n) { sfx("bulk"); say(`Sold ${r.n} Enchanted ${c.name} for ${F(r.shards)} shards.`); render(); } }}>Extra</button>}
            </span>
        </div>
    );
}

export const MARKET_CSS = `
.fi-mk-top{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.5rem}
.fi-mk-rank,.fi-mk-demand{display:flex;flex-direction:column;gap:.15rem;padding:.65rem .8rem;border-radius:1rem;border:1px solid color-mix(in oklch,#ffd23a 40%,transparent);background:linear-gradient(140deg,color-mix(in oklch,#ffd23a 10%,transparent),rgba(0,0,0,.2) 70%)}
.fi-mk-demand{--oc:#ffd23a;border-color:color-mix(in oklch,var(--oc) 55%,transparent);background:linear-gradient(140deg,color-mix(in oklch,var(--oc) 14%,transparent),rgba(0,0,0,.2) 70%)}
.fi-mk-rank small,.fi-mk-demand small{font-family:var(--font-rubik,inherit);font-size:.54rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-mk-rank b{font-family:var(--font-minecraft,inherit);font-size:1.05rem;color:#ffd23a}
.fi-mk-demand b{font-family:var(--font-minecraft,inherit);font-size:1.05rem;color:var(--oc)}
.fi-mk-rank span,.fi-mk-demand span{font-family:var(--font-rubik,inherit);font-size:.66rem;color:#cfc8de}
.fi-mk-rank em,.fi-mk-demand em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.fi-mk-act{display:flex;flex-wrap:wrap;gap:.4rem}
.fi-mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(8.6rem,1fr));gap:.4rem}
.fi-mk-card{display:flex;flex-direction:column;align-items:center;gap:.25rem;padding:.6rem .45rem;border-radius:.95rem;border:1px solid color-mix(in oklch,var(--oc) 30%,transparent);background:linear-gradient(160deg,color-mix(in oklch,var(--oc) 7%,transparent),rgba(0,0,0,.2) 70%);text-align:center}
.fi-mk-card[data-hot="true"]{border-color:#ffd23a;box-shadow:0 0 18px -9px #ffd23a}
.fi-mk-card b{font-family:var(--font-minecraft,inherit);font-size:.74rem;color:var(--oc)}
.fi-mk-card small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.fi-mk-card .bb{display:flex;flex-wrap:wrap;justify-content:center;gap:.25rem}
.fi-mk-card .fi-lv-btn{font-size:.6rem;padding:.25rem .5rem}
.fi-mk-bar{display:block;width:100%;height:.28rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-mk-bar i{display:block;height:100%;background:linear-gradient(90deg,color-mix(in oklch,var(--oc,#ffd23a) 55%,#000),var(--oc,#ffd23a))}
.fi-mk-rank .fi-mk-bar i{--oc:#ffd23a}
`;

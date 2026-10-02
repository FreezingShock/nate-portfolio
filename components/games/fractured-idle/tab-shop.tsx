"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { fmt, fmtInt, fmtPct } from "@/lib/fractured-idle/format";
import { BOOST_BY_ID, BOOST_LABEL, boostMs } from "@/lib/fractured-idle/boosters";
import { msToRestock, rollShopDay, slotCap, syncSlots } from "@/lib/fractured-idle/inv-core";
import { buyBack } from "@/lib/fractured-idle/inv-actions";
import { ITEM_BY_ID, itemCount } from "@/lib/fractured-idle/items";
import { EGG_BY_ID, PET_DIMS, RARITIES, RARITY_ORDER } from "@/lib/fractured-idle/pets-data";
import {
    CUR,
    SECTIONS,
    SECTION_ITEMS,
    SHOP_UPS,
    balance,
    buyGoods,
    buyUpgrade,
    dealsFor,
    maxBuy,
    quote,
    shopCur,
    shopLocked,
    unitPrice,
    upCost,
    upLevel,
    upLocked,
    type Deal,
    type Section,
    type ShopUp,
} from "@/lib/fractured-idle/shop";
import { Glyph, ItemTip, Wallet, fmtLeft } from "./inv-parts";
import { Tip, TipCard } from "./tooltip";
import { lift, type Ctx } from "./ui";

// The Shop: the one place to buy things. Eggs, pet items and boosters go straight into the Inventory; upgrades grow
// the Inventory and the Shop itself; Buy back returns anything you sold. Daily deals rotate at midnight UTC.
//
// Layout: a one-row header (wallet, restock clock), a swipeable section bar with the buy amount and an "affordable
// only" filter beside it, then card grids that fill the width: two or three cards across on a wide pane, one on a phone
// (with the price and Buy button on their own row so thumbs can reach them).

const QTYS = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "Max" },
];
const GROUPS: { title: string; blurb: string; color: string; ids: string[] }[] = [
    { title: "Inventory", blurb: "More room and auto-sell", color: "var(--mc-aqua)", ids: ["page2", "page3", "license"] },
    { title: "Prices", blurb: "Pay less, earn more", color: "var(--mc-green)", ids: ["haggle", "eye"] },
    { title: "Shelf & boosters", blurb: "More deals, more slots, longer timers", color: "var(--mc-light-purple)", ids: ["deals", "belt", "brew"] },
];

export function ShopTab({ s, d, F, act, say, go }: Ctx & { go: (id: string) => void }) {
    const [sec, setSec] = useState<Section>("deals");
    const [qty, setQty] = useState(1);
    const [afford, setAfford] = useState(false);
    rollShopDay(s);
    const deals = dealsFor(s);
    const left = msToRestock();
    const hms = `${String(Math.floor(left / 3_600_000)).padStart(2, "0")}:${String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0")}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
    const dealsOpen = deals.filter((x) => x.left > 0 && !shopLocked(s, x.id)).length;
    const overflow = syncSlots(s);
    const buying = sec === "deals" || sec === "eggs" || sec === "pet" || sec === "boost";

    const buy = (id: string, deal?: Deal) => {
        let r = { ok: false, msg: "", n: 0 };
        const n = qty === -1 ? Math.max(1, maxBuy(s, id, deal)) : qty;
        act(() => {
            r = buyGoods(s, id, n, deal);
            return r.ok;
        });
        say(r.msg);
    };

    /** Everything a product card needs, computed once. */
    const info = (id: string, deal?: Deal) => {
        const cur = deal?.cur ?? shopCur(id);
        const c = CUR[cur];
        const lock = shopLocked(s, id);
        const n = qty === -1 ? Math.max(1, maxBuy(s, id, deal)) : qty;
        const q = quote(s, id, n, deal);
        const unit = deal ? deal.price : unitPrice(s, id);
        const base = deal ? unitPrice(s, id) : 0;
        const out = !!deal && deal.left < 1;
        const can = !lock && q.n >= 1 && !out;
        const shown = q.n >= 1 ? q.cost : unit * n;
        const have = balance(s, cur);
        return { cur, c, lock, n, q, unit, base, out, can, shown, have, own: itemCount(s, id) };
    };

    const priceBlock = (i: ReturnType<typeof info>, deal?: Deal, n = i.n) => (
        <div className="sh-pr">
            <Tip
                tip={
                    <TipCard
                        title="Price"
                        color={i.c.color}
                        lines={[deal ? `Normally ${F(i.base)} ${i.c.one}s. The deal is ${Math.round(deal.off * 100)}% off.` : "Eggs get a little dearer for every egg you have hatched or hold. Other goods get 10% dearer per purchase today, and reset at the restock."]}
                        rows={[["You have", `${F(i.have)} ${i.c.one}s`, i.have >= i.unit ? "var(--mc-green)" : "var(--mc-red)"], ["Price now", `${F(i.unit)} ${i.c.one}s`, i.c.color]]}
                    />
                }
            >
                <span className="sh-price" tabIndex={0} style={{ color: i.can || i.have >= i.unit ? i.c.color : "var(--mc-red)" }}>
                    <McSymbol name={i.c.symbol} /> {F(i.shown)}
                    {deal && <s>{F(i.base * n)}</s>}
                </span>
            </Tip>
            {!i.can && !i.lock && !i.out && i.have < i.shown && (
                <>
                    <span className="sh-need">need {F(i.shown - i.have)} more</span>
                    <span className="sh-bar"><i style={{ width: `${Math.min(100, (i.have / Math.max(1e-9, i.shown)) * 100)}%`, background: i.c.color }} /></span>
                </>
            )}
        </div>
    );

    const tipFor = (id: string) => {
        const egg = id.startsWith("egg:") ? EGG_BY_ID.get(id.slice(4)) : undefined;
        const boost = BOOST_BY_ID.get(id);
        const total = egg ? RARITY_ORDER.reduce((a, r) => a + (egg.odds[r] || 0), 0) : 0;
        return (
            <ItemTip
                s={s}
                d={d}
                id={id}
                extra={
                    egg ? (
                        <span className="block text-[10px] text-muted-foreground">{RARITY_ORDER.filter((r) => egg.odds[r]).map((r) => `${RARITIES[r].name} ${fmtPct((egg.odds[r] || 0) / total, 1)}`).join(" · ")}</span>
                    ) : boost ? (
                        <span className="block text-[10px] text-muted-foreground">+{Math.round(boost.amount * 100)}% {BOOST_LABEL[boost.stat]} for {fmtLeft(boostMs(s, boost) / 1000)}.</span>
                    ) : undefined
                }
            />
        );
    };

    const buyBtn = (id: string, i: ReturnType<typeof info>, deal?: Deal, wide = false) => (
        <button type="button" className="iv-btn" data-wide={wide} style={{ ["--c" as string]: i.c.color } as CSSProperties} disabled={!i.can} onClick={() => buy(id, deal)}>
            {i.out ? "Sold out" : i.lock ? "Locked" : qty === -1 ? `Buy max (${fmtInt(i.q.n)})` : `Buy x${qty}`}
        </button>
    );

    /** A horizontal product card (eggs, pet items, boosters). */
    const card = (id: string) => {
        const def = ITEM_BY_ID.get(id);
        if (!def) return null;
        const i = info(id);
        if (afford && !i.can) return null;
        const egg = id.startsWith("egg:") ? EGG_BY_ID.get(id.slice(4)) : undefined;
        const boost = BOOST_BY_ID.get(id);
        const total = egg ? RARITY_ORDER.reduce((a, r) => a + (egg.odds[r] || 0), 0) : 0;
        const creep = !egg && (s.inv.shop.bought[id] || 0) > 0 ? (s.inv.shop.bought[id] || 0) * 10 : 0;
        return (
            <div key={id} className="sh-card" data-can={i.can} data-lock={!!i.lock} style={{ ["--c" as string]: def.color } as CSSProperties}>
                <Tip box className="sh-i" tip={() => tipFor(id)}>
                    <Glyph id={id} size="md" />
                </Tip>
                <div className="sh-t">
                    <span className="sh-n">{def.name}</span>
                    <span className="sh-d">{i.lock ?? def.desc}</span>
                    <div className="sh-meta">
                        <span className="sh-pill">Own {fmtInt(i.own)}</span>
                        {boost && <span className="sh-pill" style={{ color: "var(--mc-green)" }}>+{Math.round(boost.amount * 100)}% {BOOST_LABEL[boost.stat]} · {fmtLeft(boostMs(s, boost) / 1000)}</span>}
                        {creep > 0 && <span className="sh-pill" data-hot="true">+{creep}% today</span>}
                    </div>
                </div>
                <div className="sh-b">
                    {priceBlock(i)}
                    {buyBtn(id, i)}
                </div>
                {egg && (
                    <div className="sh-o">
                        <div className="sh-odds" aria-hidden="true">
                            {RARITY_ORDER.filter((r) => egg.odds[r]).map((r) => (
                                <i key={r} style={{ width: `${((egg.odds[r] || 0) / total) * 100}%`, backgroundColor: RARITIES[r].color }} />
                            ))}
                        </div>
                        <div className="sh-odds-l">
                            {RARITY_ORDER.filter((r) => egg.odds[r]).map((r) => (
                                <span key={r} style={{ color: lift(RARITIES[r].color) }}>{RARITIES[r].name} {fmtPct((egg.odds[r] || 0) / total, 0)}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /** A vertical deal card. */
    const dealCard = (x: Deal) => {
        const def = ITEM_BY_ID.get(x.id);
        if (!def) return null;
        const i = info(x.id, x);
        if (afford && !i.can) return null;
        return (
            <div key={x.key} className="sh-deal" data-can={i.can} data-out={i.out} data-lock={!!i.lock} style={{ ["--c" as string]: def.color } as CSSProperties}>
                <span className="sh-off">-{Math.round(x.off * 100)}%</span>
                <Tip box tip={() => tipFor(x.id)}>
                    <Glyph id={x.id} size="lg" />
                </Tip>
                <span className="sh-n">{def.name}</span>
                <span className="sh-left" aria-label={`${x.left} of ${x.limit} left today`}>
                    {Array.from({ length: x.limit }, (_, k) => <i key={k} data-on={k < x.left} />)}
                </span>
                <span className="sh-need">{x.left} / {x.limit} left · own {fmtInt(i.own)}</span>
                {priceBlock(i, x)}
                {buyBtn(x.id, i, x, true)}
            </div>
        );
    };

    const upCard = (u: ShopUp) => {
        const lvl = upLevel(s, u.id);
        const lock = upLocked(s, u);
        const cost = upCost(s, u);
        const have = s.tokens;
        const can = !lock && have >= cost;
        const maxed = lvl >= u.max;
        if (afford && !can) return null;
        return (
            <div key={u.id} className="sh-card" data-can={can} data-lock={!!lock && !maxed} style={{ ["--c" as string]: u.color } as CSSProperties}>
                <span className="iv-g sh-i" data-size="md" style={{ ["--ic" as string]: u.color, ["--rc" as string]: u.color } as CSSProperties}>
                    <McSymbol name={u.symbol} />
                </span>
                <div className="sh-t">
                    <span className="sh-n">{u.name}</span>
                    <span className="sh-d">{u.desc(lvl)}</span>
                    {u.max > 1 && (
                        <div className="sh-pips" aria-label={`Level ${lvl} of ${u.max}`}>
                            {Array.from({ length: u.max }, (_, k) => <i key={k} data-on={k < lvl} />)}
                        </div>
                    )}
                </div>
                <div className="sh-b">
                    <div className="sh-pr">
                        <span className="sh-price" style={{ color: maxed ? "var(--muted-foreground)" : have >= cost ? CUR.tokens.color : "var(--mc-red)" }}>
                            <McSymbol name="magicFind" /> {maxed ? "Done" : F(cost)}
                        </span>
                        {!maxed && !lock && have < cost && <span className="sh-need">need {F(cost - have)} more</span>}
                    </div>
                    <button
                        type="button"
                        className="iv-btn"
                        style={{ ["--c" as string]: u.color } as CSSProperties}
                        disabled={!can}
                        onClick={() => {
                            let r = { ok: false, msg: "" };
                            act(() => {
                                r = buyUpgrade(s, u.id);
                                return r.ok;
                            });
                            say(r.msg);
                        }}
                    >
                        {maxed ? "Maxed" : lock ?? (u.max > 1 ? `Level ${lvl + 1}` : "Unlock")}
                    </button>
                </div>
            </div>
        );
    };

    const meta = SECTIONS.find((x) => x.id === sec)!;
    const none = <p className="iv-note">Nothing here is affordable right now. Turn off &quot;Affordable only&quot; to see everything.</p>;
    /** A card grid that says so when the filter hides everything. */
    const gridOf = (cards: (ReactNode | null)[], cls = "sh-grid") => {
        const shown = cards.filter(Boolean);
        return shown.length ? <div className={cls}>{shown}</div> : none;
    };
    return (
        <div className="sh">
            <div className="sh-in">
                <div className="sh-top">
                    <Wallet s={s} F={F} />
                    <span className="sh-clock" title="Daily deals and per-day price creep reset at midnight UTC">
                        Restock <b>{hms}</b>
                    </span>
                </div>

                <div className="sh-nav">
                    <div className="iv-seg" role="tablist" aria-label="Shop sections">
                        {SECTIONS.map((x) => (
                            <button key={x.id} type="button" role="tab" aria-selected={sec === x.id} data-on={sec === x.id} style={{ ["--c" as string]: x.color } as CSSProperties} onClick={() => setSec(x.id)}>
                                <McSymbol name={x.symbol} /> {x.label.replace("Today's deals", "Deals")}
                                {x.id === "deals" && dealsOpen > 0 && <em>{dealsOpen}</em>}
                                {x.id === "buyback" && s.inv.buyback.length > 0 && <em>{s.inv.buyback.length}</em>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sh-nav">
                    <span className="iv-note" style={{ color: lift(meta.color), flex: "1 1 12rem" }}>{meta.blurb}</span>
                    <div className="sh-tools">
                        {buying && (
                            <div className="iv-seg" role="group" aria-label="Buy amount" style={{ padding: ".1rem" }}>
                                {QTYS.map((o) => (
                                    <button key={o.v} type="button" data-on={qty === o.v} style={{ height: "1.6rem", padding: "0 .5rem" }} onClick={() => setQty(o.v)}>{o.label}</button>
                                ))}
                            </div>
                        )}
                        {sec !== "buyback" && (
                            <button type="button" className="sh-toggle" data-on={afford} aria-pressed={afford} onClick={() => setAfford((a) => !a)}>
                                Affordable only
                            </button>
                        )}
                    </div>
                </div>

                {overflow.length > 0 && (
                    <p className="iv-note" style={{ color: "var(--mc-gold)" }}>
                        Your inventory is full ({slotCap(s)} slots), so new kinds of items wait outside the grid. <button type="button" onClick={() => go("inventory")}>Open inventory</button> or buy a page under Upgrades.
                    </p>
                )}

                {sec === "deals" && gridOf(deals.map(dealCard), "sh-deals")}

                {sec === "eggs" && afford && SECTION_ITEMS.eggs.every((id) => !info(id).can) && none}
                {sec === "eggs" &&
                    PET_DIMS.map((dim) => {
                        const ids = SECTION_ITEMS.eggs.filter((id) => EGG_BY_ID.get(id.slice(4))?.dim === dim.id);
                        const cards = ids.map(card).filter(Boolean);
                        if (!cards.length) return null;
                        return (
                            <div key={dim.id} className="sh-group" style={{ ["--gc" as string]: dim.color } as CSSProperties}>
                                <div className="sh-gh">
                                    <McSymbol name={dim.symbol} /> {dim.name} <small>{dim.blurb}</small>
                                </div>
                                <div className="sh-grid">{cards}</div>
                            </div>
                        );
                    })}

                {sec === "pet" && gridOf(SECTION_ITEMS.pet.map(card))}
                {sec === "boost" && gridOf(SECTION_ITEMS.boost.map(card))}

                {sec === "upgrades" &&
                    GROUPS.map((g) => {
                        const cards = g.ids.map((id) => upCard(SHOP_UPS.find((u) => u.id === id)!)).filter(Boolean);
                        if (!cards.length) return null;
                        return (
                            <div key={g.title} className="sh-group" style={{ ["--gc" as string]: g.color } as CSSProperties}>
                                <div className="sh-gh">
                                    {g.title} <small>{g.blurb}</small>
                                </div>
                                <div className="sh-grid">{cards}</div>
                            </div>
                        );
                    })}
                {sec === "upgrades" && afford && SHOP_UPS.every((u) => !(!upLocked(s, u) && s.tokens >= upCost(s, u))) && none}

                {sec === "buyback" && (
                    <div className="iv-lines">
                        {s.inv.buyback.length === 0 && <p className="iv-note">Nothing sold lately. Items you sell show up here, newest first, and you can take them back for exactly what they paid.</p>}
                        {s.inv.buyback.map((b, i) => (
                            <div key={b.id} className="sh-bb">
                                <Glyph id={b.id} size="sm" />
                                <span>{ITEM_BY_ID.get(b.id)?.name} x{fmtInt(b.n)}</span>
                                <button
                                    type="button"
                                    className="iv-btn"
                                    style={{ ["--c" as string]: "var(--mc-red)", height: "1.7rem" } as CSSProperties}
                                    disabled={s.shards < b.paid}
                                    onClick={() => {
                                        let r = { ok: false, msg: "" };
                                        act(() => {
                                            r = buyBack(s, i);
                                            return r.ok;
                                        });
                                        say(r.msg);
                                    }}
                                >
                                    {fmt(b.paid)}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

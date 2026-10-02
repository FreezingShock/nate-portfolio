"use client";

import { useState, type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { fmt, fmtInt, fmtPct } from "@/lib/fractured-idle/format";
import { BOOST_BY_ID, BOOST_LABEL, boostMs } from "@/lib/fractured-idle/boosters";
import { dayNow, msToRestock, rollShopDay, slotCap, syncSlots } from "@/lib/fractured-idle/inv-core";
import { buyBack } from "@/lib/fractured-idle/inv-actions";
import { ITEM_BY_ID, itemCount } from "@/lib/fractured-idle/items";
import { EGG_BY_ID, RARITIES, RARITY_ORDER } from "@/lib/fractured-idle/pets-data";
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
} from "@/lib/fractured-idle/shop";
import { Glyph, ItemTip, Wallet, fmtLeft } from "./inv-parts";
import { Tip, TipCard } from "./tooltip";
import { lift, type Ctx } from "./ui";

// The Shop: the one place to buy things. Eggs, pet items and boosters go straight into the Inventory; upgrades grow
// the Inventory and the Shop itself; Buy back returns anything you sold. Daily deals rotate at midnight UTC.

const QTYS = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "Max" },
];

export function ShopTab({ s, d, F, act, say, go }: Ctx & { go: (id: string) => void }) {
    const [sec, setSec] = useState<Section>("deals");
    const [qty, setQty] = useState(1);
    rollShopDay(s);
    const deals = dealsFor(s);
    const left = msToRestock();
    const hms = `${String(Math.floor(left / 3_600_000)).padStart(2, "0")}:${String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0")}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
    const dealsOpen = deals.filter((x) => x.left > 0 && !shopLocked(s, x.id)).length;
    const overflow = syncSlots(s);

    const buy = (id: string, deal?: Deal) => {
        let r = { ok: false, msg: "", n: 0 };
        const n = qty === -1 ? Math.max(1, maxBuy(s, id, deal)) : qty;
        act(() => {
            r = buyGoods(s, id, n, deal);
            return r.ok;
        });
        say(r.msg);
    };

    const card = (id: string, deal?: Deal) => {
        const def = ITEM_BY_ID.get(id);
        if (!def) return null;
        const cur = deal?.cur ?? shopCur(id);
        const c = CUR[cur];
        const lock = shopLocked(s, id);
        const n = qty === -1 ? Math.max(1, maxBuy(s, id, deal)) : qty;
        const q = quote(s, id, n, deal);
        const unit = deal ? deal.price : unitPrice(s, id);
        const base = deal ? unitPrice(s, id) : 0;
        const can = !lock && q.n >= 1 && (!deal || deal.left > 0);
        const out = !!deal && deal.left < 1;
        const own = itemCount(s, id);
        const shown = q.n >= 1 ? q.cost : unit * n;
        const egg = id.startsWith("egg:") ? EGG_BY_ID.get(id.slice(4)) : undefined;
        const boost = BOOST_BY_ID.get(id);
        const total = egg ? RARITY_ORDER.reduce((a, r) => a + (egg.odds[r] || 0), 0) : 0;
        return (
            <div key={deal?.key ?? id} className="sh-card" data-can={can} data-lock={!!lock} data-out={out} style={{ ["--c" as string]: def.color } as CSSProperties}>
                {deal && <span className="sh-off">-{Math.round(deal.off * 100)}%</span>}
                <Tip
                    box
                    tip={() => (
                        <ItemTip
                            s={s}
                            d={d}
                            id={id}
                            extra={
                                egg ? (
                                    <span className="block text-[10px] text-muted-foreground">
                                        {RARITY_ORDER.filter((r) => egg.odds[r]).map((r) => `${RARITIES[r].name} ${fmtPct((egg.odds[r] || 0) / total, 1)}`).join(" · ")}
                                    </span>
                                ) : boost ? (
                                    <span className="block text-[10px] text-muted-foreground">
                                        +{Math.round(boost.amount * 100)}% {BOOST_LABEL[boost.stat]} for {fmtLeft(boostMs(s, boost) / 1000)}.
                                    </span>
                                ) : undefined
                            }
                        />
                    )}
                >
                    <div className="sh-h">
                        <Glyph id={id} size="md" />
                        <span className="min-w-0 flex-1">
                            <span className="sh-n">{def.name}</span>
                            <span className="sh-d">{lock ?? def.desc}</span>
                        </span>
                    </div>
                </Tip>
                <div className="sh-own">
                    In inventory: {fmtInt(own)}
                    {deal ? ` · ${deal.left} / ${deal.limit} left today` : !id.startsWith("egg:") && (s.inv.shop.bought[id] || 0) > 0 ? ` · +${(s.inv.shop.bought[id] || 0) * 10}% today` : ""}
                </div>
                <div className="sh-buy">
                    <Tip tip={<TipCard title="Price" color={c.color} lines={[deal ? `Normally ${fmt(base)} ${c.one}s. The deal is ${Math.round(deal.off * 100)}% off.` : id.startsWith("egg:") ? "Eggs get a little dearer for every egg you have hatched or hold." : "Each one bought today makes the next 10% dearer. It resets at the daily restock."]} rows={[["You have", `${F(balance(s, cur))} ${c.one}s`, balance(s, cur) >= unit ? "var(--mc-green)" : "var(--mc-red)"], ["Price now", `${F(unit)} ${c.one}s`, c.color]]} />}>
                        <span className="sh-price" tabIndex={0} style={{ color: can || balance(s, cur) >= unit ? c.color : "var(--mc-red)" }}>
                            <McSymbol name={c.symbol} /> {F(shown)}
                            {deal && <s>{F(base * n)}</s>}
                        </span>
                    </Tip>
                    <button type="button" className="iv-btn" style={{ ["--c" as string]: c.color } as CSSProperties} disabled={!can} onClick={() => buy(id, deal)}>
                        {out ? "Sold out" : lock ? "Locked" : `Buy ${qty === -1 ? `max (${fmtInt(q.n)})` : `x${qty}`}`}
                    </button>
                </div>
            </div>
        );
    };

    const upgrades = SHOP_UPS.map((u) => {
        const lvl = upLevel(s, u.id);
        const lock = upLocked(s, u);
        const cost = upCost(s, u);
        const can = !lock && s.tokens >= cost;
        const maxed = lvl >= u.max;
        return (
            <div key={u.id} className="sh-card" data-can={can} data-lock={!!lock && !maxed} style={{ ["--c" as string]: u.color } as CSSProperties}>
                <div className="sh-h">
                    <span className="iv-g" data-size="md" style={{ ["--ic" as string]: u.color, ["--rc" as string]: u.color } as CSSProperties}><McSymbol name={u.symbol} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="sh-n">{u.name}</span>
                        <span className="sh-d">{u.desc(lvl)}</span>
                    </span>
                </div>
                {u.max > 1 && (
                    <div className="sh-pips" aria-label={`Level ${lvl} of ${u.max}`}>
                        {Array.from({ length: u.max }, (_, i) => <i key={i} data-on={i < lvl} />)}
                    </div>
                )}
                <div className="sh-buy">
                    <span className="sh-price" style={{ color: maxed ? "var(--muted-foreground)" : s.tokens >= cost ? CUR.tokens.color : "var(--mc-red)" }}>
                        <McSymbol name="magicFind" /> {maxed ? "Done" : F(cost)}
                    </span>
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
                        {maxed ? "Maxed" : lock ?? (u.max > 1 ? `Buy level ${lvl + 1}` : "Unlock")}
                    </button>
                </div>
            </div>
        );
    });

    const meta = SECTIONS.find((x) => x.id === sec)!;
    return (
        <div className="iv">
            <Wallet s={s} F={F} />
            <div className="sh-bar">
                <div className="sh-tabs" role="tablist" aria-label="Shop sections">
                    {SECTIONS.map((x) => (
                        <button key={x.id} type="button" role="tab" aria-selected={sec === x.id} className="sh-tab" data-on={sec === x.id} style={{ ["--c" as string]: x.color } as CSSProperties} onClick={() => setSec(x.id)}>
                            <McSymbol name={x.symbol} /> {x.label}
                            {x.id === "deals" && dealsOpen > 0 && <em>{dealsOpen}</em>}
                            {x.id === "buyback" && s.inv.buyback.length > 0 && <em>{s.inv.buyback.length}</em>}
                        </button>
                    ))}
                </div>
                {(sec === "deals" || sec === "eggs" || sec === "pet" || sec === "boost") && (
                    <div className="iv-q" role="group" aria-label="Buy amount" style={{ marginLeft: "auto" }}>
                        {QTYS.map((o) => (
                            <button key={o.v} type="button" data-on={qty === o.v} onClick={() => setQty(o.v)}>{o.label}</button>
                        ))}
                    </div>
                )}
            </div>
            <p className="iv-note" style={{ color: lift(meta.color) }}>
                {meta.blurb}
                {sec === "deals" && (
                    <>
                        {" "}
                        Restocks in <b className="font-minecraft">{hms}</b> (day {dayNow() % 1000}).
                    </>
                )}
            </p>
            {overflow.length > 0 && (
                <p className="iv-note" style={{ color: "var(--mc-gold)" }}>
                    Your inventory is full ({slotCap(s)} slots). New kinds of items wait outside the grid until you free a slot.{" "}
                    <button type="button" className="underline" onClick={() => go("inventory")}>Open inventory</button> or buy a page in Upgrades.
                </p>
            )}

            {sec === "deals" && <div className="sh-grid">{deals.map((x) => card(x.id, x))}</div>}
            {(sec === "eggs" || sec === "pet" || sec === "boost") && <div className="sh-grid">{SECTION_ITEMS[sec].map((id) => card(id))}</div>}
            {sec === "upgrades" && <div className="sh-grid">{upgrades}</div>}
            {sec === "buyback" && (
                <div className="flex flex-col gap-1.5">
                    {s.inv.buyback.length === 0 && <p className="iv-note">Nothing sold lately. Items you sell show up here, newest first.</p>}
                    {s.inv.buyback.map((b, i) => (
                        <div key={b.id} className="sh-bb">
                            <Glyph id={b.id} size="sm" />
                            <span>
                                {ITEM_BY_ID.get(b.id)?.name} x{fmtInt(b.n)}
                            </span>
                            <button
                                type="button"
                                className="iv-btn"
                                style={{ ["--c" as string]: "var(--mc-red)" } as CSSProperties}
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
                                Buy back {fmt(b.paid)}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

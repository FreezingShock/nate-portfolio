"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Lock, Search } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { fmt, fmtInt } from "@/lib/fractured-idle/format";
import { PETS, PET_BY_ID, RARITIES, RARITY_ORDER, petLevel, type EggDef, type Rarity } from "@/lib/fractured-idle/pets-data";
import { BOOST_BY_ID } from "@/lib/fractured-idle/boosters";
import { CATS, CAT_BY_ID, ITEM_BY_ID, PET_ITEM_BY_ID, itemCount, rarityRank, sellBonus, unitValue, type ItemCat } from "@/lib/fractured-idle/items";
import { MAX_PAGES, PAGE_SIZE, SORTS, hasLicense, isLocked, moveSlot, placeOverflow, setAutoRule, slotCap, sortSlots, syncSlots, toggleLock } from "@/lib/fractured-idle/inv-core";
import { buyBack, hatchFromInv, openCache, petTargets, runSellPlan, sellFromInv, sellPlan, activateBooster, consumeFromInv, applyPetItem } from "@/lib/fractured-idle/inv-actions";
import { EGG_BY_ID } from "@/lib/fractured-idle/pets-data";
import { BoostStrip, Glyph, ItemTip } from "./inv-parts";
import { Tip, TipCard } from "./tooltip";
import { SectionTitle, lift, type Ctx } from "./ui";

// The Inventory: a 9 x 3 grid per page (one page at the start, two more unlocked in the Shop). It holds eggs, pet
// items and boosters directly, and shows the Mine and Farm stock (ore, ingots, crops, goods, geodes, pods...) in the
// same grid, so everything you own is in one place. Click a slot for details and actions, drag to rearrange (or use
// Move on a touch screen), lock what you want to keep, sort, search, bulk sell, or set auto-sell rules.

type Qty = 1 | 10 | 100 | -1;
const QTYS: { v: Qty; label: string }[] = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "All" },
];
const SELL_CATS = CATS.filter((c) => c.id !== "cache");

export function InventoryTab({ s, d, F, act, render, say, eggFx, go }: Ctx & { go: (id: string) => void }) {
    const [page, setPage] = useState(0);
    const [sel, setSel] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [cat, setCat] = useState<ItemCat | "all">("all");
    const [qty, setQty] = useState<Qty>(1);
    const [picker, setPicker] = useState(false);
    const [moving, setMoving] = useState<string | null>(null); // "s:<slot>" or "o:<item id>"
    const [over, setOver] = useState<number | null>(null);
    const [bulk, setBulk] = useState(false);
    const [rules, setRules] = useState(false);
    const [bulkCats, setBulkCats] = useState<Set<ItemCat>>(() => new Set<ItemCat>(["ore", "crop", "good"]));
    const [bulkRar, setBulkRar] = useState<Rarity>("rare");
    const [bulkKeep, setBulkKeep] = useState(0);
    const [confirm, setConfirm] = useState(false);

    const inv = s.inv;
    const overflow = syncSlots(s);
    const cap = slotCap(s);
    const used = inv.slots.filter(Boolean).length;
    const needle = q.trim().toLowerCase();
    const match = (id: string) => {
        const def = ITEM_BY_ID.get(id);
        if (!def) return false;
        return (cat === "all" || def.cat === cat) && (!needle || def.name.toLowerCase().includes(needle));
    };
    const eye = sellBonus(s);

    // Stock worth is the costliest number on the page, so refresh it about once a second.
    const worth = useRef({ t: 0, v: 0 });
    if (Date.now() - worth.current.t > 1000) {
        let v = 0;
        for (const id of [...inv.slots, ...overflow]) if (id && ITEM_BY_ID.get(id)?.sellable) v += unitValue(s, d, id) * itemCount(s, id);
        worth.current = { t: Date.now(), v: v * eye };
    }

    const counts = useMemo(() => {
        const m = new Map<string, number>();
        for (const id of [...inv.slots, ...overflow]) if (id) m.set(ITEM_BY_ID.get(id)!.cat, (m.get(ITEM_BY_ID.get(id)!.cat) ?? 0) + 1);
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inv.slots.join("|"), overflow.join("|")]);

    const selN = sel ? itemCount(s, sel) : 0;
    const selDef = sel && selN > 0 ? ITEM_BY_ID.get(sel) : undefined; // a stack that ran out simply shows nothing

    // ---- actions ----
    const sell = (id: string, n: number) => {
        let r = { n: 0, shards: 0 };
        act(() => {
            r = sellFromInv(s, d, id, n);
            return r.n > 0;
        }, "buy");
        if (r.n > 0) say(`Sold ${fmtInt(r.n)} ${ITEM_BY_ID.get(id)!.name} for ${F(r.shards)} shards`);
        else if (isLocked(s, id)) say("That item is locked.");
    };
    const hatch = (id: string, n: number) => {
        const egg = EGG_BY_ID.get(id.slice(4));
        if (!egg) return;
        let res: ReturnType<typeof hatchFromInv> = [];
        act(() => {
            res = hatchFromInv(s, egg.id, n);
            return res.length > 0;
        });
        if (res.length) {
            if (eggFx) eggFx(egg as EggDef, res);
            else say(`Hatched ${res.length} egg${res.length > 1 ? "s" : ""}`);
        }
    };
    const run = (fn: () => { ok: boolean; msg: string }) => {
        let r = { ok: false, msg: "" };
        act(() => {
            r = fn();
            return r.ok;
        });
        if (r.msg) say(r.msg);
    };
    const place = (from: string, to: number) => {
        if (from.startsWith("s:")) moveSlot(s, Number(from.slice(2)), to);
        else placeOverflow(s, from.slice(2), to);
        render();
    };

    const primary = (id: string) => {
        const def = ITEM_BY_ID.get(id);
        if (!def) return;
        if (def.cat === "egg") hatch(id, 1);
        else if (def.cat === "booster") run(() => activateBooster(s, id));
        else if (def.cat === "consumable") run(() => consumeFromInv(s, d, id));
        else if (def.cat === "cache") run(() => openCache(s, d, id, false));
    };

    const pageSlots = (p: number) => Array.from({ length: PAGE_SIZE }, (_, i) => p * PAGE_SIZE + i);
    const unlocked = page * PAGE_SIZE < cap;

    // bulk-sell preview
    const plan = useMemo(
        () => (bulk ? sellPlan(s, d, (id) => bulkCats.has(ITEM_BY_ID.get(id)!.cat) && rarityRank(ITEM_BY_ID.get(id)!.rarity) <= RARITY_ORDER.indexOf(bulkRar), bulkKeep) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [bulk, bulkCats, bulkRar, bulkKeep, Math.floor(Date.now() / 1000)],
    );
    const planTotal = plan.reduce((a, p) => a + p.shards, 0) * eye;

    const slotBtn = (idx: number, id: string | null, small = false) => {
        const def = id ? ITEM_BY_ID.get(id) : undefined;
        const n = id ? itemCount(s, id) : 0;
        const dim = !!id && !match(id);
        const key = small ? `o${id}` : idx;
        const style = def ? ({ ["--ic" as string]: def.color, ["--rc" as string]: RARITIES[def.rarity].color } as CSSProperties) : undefined;
        const btn = (
            <button
                key={key}
                type="button"
                className="iv-slot"
                style={style}
                data-empty={!def}
                data-sel={!!id && sel === id}
                data-dim={dim}
                data-drop={over === idx && !small}
                data-moving={!!id && moving === (small ? `o:${id}` : `s:${idx}`)}
                data-rar={def ? rarityRank(def.rarity) : undefined}
                aria-label={def ? `${def.name}, ${fmtInt(n)}` : `Empty slot ${idx + 1}`}
                draggable={!!def}
                onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", small ? `o:${id}` : `s:${idx}`);
                    e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                    if (small) return;
                    e.preventDefault();
                    setOver(idx);
                }}
                onDragLeave={() => setOver((o) => (o === idx ? null : o))}
                onDrop={(e) => {
                    if (small) return;
                    e.preventDefault();
                    setOver(null);
                    const v = e.dataTransfer.getData("text/plain");
                    if (v) place(v, idx);
                }}
                onDoubleClick={() => id && primary(id)}
                onClick={() => {
                    if (moving && !small) {
                        place(moving, idx);
                        setMoving(null);
                        return;
                    }
                    if (id) {
                        setSel(id);
                        setPicker(false);
                    } else if (sel) setSel(null);
                }}
            >
                {def && (
                    <>
                        <McSymbol name={def.symbol} />
                        {isLocked(s, id!) && <span className="iv-lk"><McSymbol name="key" /></span>}
                        {inv.auto[id!] !== undefined && <span className="iv-au"><McSymbol name="scales" /></span>}
                        <span className="iv-n">{n > 1 ? fmtInt(n) : ""}</span>
                    </>
                )}
            </button>
        );
        return id ? (
            <Tip key={key} box className="contents" tip={() => <ItemTip s={s} d={d} id={id} extra={<span className="text-[10px] text-muted-foreground">Click for actions. Double-click to {def!.cat === "egg" ? "hatch one" : def!.cat === "booster" || def!.cat === "consumable" ? "use" : def!.cat === "cache" ? "open" : "select"}. Drag to move.</span>} />}>
                {btn}
            </Tip>
        ) : (
            btn
        );
    };

    return (
        <div className="iv">
            <div className="iv-top">
                <div className="iv-pg" role="tablist" aria-label="Inventory pages">
                    {Array.from({ length: MAX_PAGES }, (_, p) => (
                        <button key={p} type="button" role="tab" aria-selected={page === p} data-on={page === p} data-lock={p * PAGE_SIZE >= cap} onClick={() => setPage(p)}>
                            {p * PAGE_SIZE >= cap && <Lock className="mr-1 inline size-3" />}
                            {["I", "II", "III"][p]}
                        </button>
                    ))}
                </div>
                <label className="relative flex-1" style={{ minWidth: "8rem", maxWidth: "16rem" }}>
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                    <input className="iv-search w-full" style={{ paddingLeft: "1.6rem" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" />
                </label>
                <div className="iv-chips" aria-label="Sort inventory">
                    {SORTS.map((o) => (
                        <button key={o.id} type="button" className="iv-chip" data-on={inv.sort === o.id} onClick={() => { sortSlots(s, o.id, (id) => unitValue(s, d, id)); render(); }}>
                            {o.label}
                        </button>
                    ))}
                </div>
                <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-yellow)" } as CSSProperties} data-on={bulk} onClick={() => { setBulk((b) => !b); setConfirm(false); }}>
                    Sell...
                </button>
                <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties} data-on={rules} onClick={() => setRules((r) => !r)}>
                    Auto-sell
                </button>
            </div>

            <div className="iv-chips" aria-label="Filter by type">
                <button type="button" className="iv-chip" data-on={cat === "all"} onClick={() => setCat("all")}>All <em className="not-italic opacity-60">{used + overflow.length}</em></button>
                {CATS.map((c) => (
                    <button key={c.id} type="button" className="iv-chip" data-on={cat === c.id} style={{ ["--c" as string]: c.color } as CSSProperties} onClick={() => setCat(cat === c.id ? "all" : c.id)}>
                        <McSymbol name={c.symbol} /> {c.label} <em className="not-italic opacity-60">{counts.get(c.id) ?? 0}</em>
                    </button>
                ))}
            </div>

            <BoostStrip s={s} />

            <div className="iv-main">
                <div>
                    <div className="iv-grid" role="grid" aria-label={`Inventory page ${page + 1}`} data-page={page}>
                        {pageSlots(page).map((idx) => slotBtn(idx, unlocked ? inv.slots[idx] : null))}
                        {!unlocked && (
                            <div className="iv-lockpg">
                                <Lock className="size-6" style={{ color: "var(--mc-aqua)" }} />
                                <p>Page {["I", "II", "III"][page]} is locked. Unlock it with tokens in the Shop to get 27 more slots.</p>
                                <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties} onClick={() => go("shop")}>Open the Shop</button>
                            </div>
                        )}
                    </div>
                    <div className="iv-note mt-1 flex flex-wrap justify-between gap-2">
                        <span>{used} / {cap} slots used · {fmtInt(Object.keys(inv.locked).length)} locked</span>
                        <span>Stock worth about {fmt(worth.current.v)} shards</span>
                    </div>
                    {overflow.length > 0 && (
                        <div className="mt-2">
                            <div className="iv-note mb-1" style={{ color: "var(--mc-gold)" }}>
                                No room for {overflow.length} item type{overflow.length > 1 ? "s" : ""}. They are safe: sell them, or free a slot and Move them in. Unlock another page in the Shop.
                            </div>
                            <div className="iv-over">{overflow.map((id) => slotBtn(-1, id, true))}</div>
                        </div>
                    )}
                    {moving && (
                        <p className="iv-note mt-2" style={{ color: "var(--mc-green)" }}>
                            Moving: tap the slot to put it in. <button type="button" className="underline" onClick={() => setMoving(null)}>Cancel</button>
                        </p>
                    )}
                </div>

                <aside className="iv-panel" aria-live="polite">
                    {!selDef ? (
                        <div className="iv-pd">
                            <b className="font-minecraft" style={{ color: "var(--mc-aqua)" }}>Select an item</b>
                            <p className="mt-1">Click any slot to see what it does and what it sells for. Drag items to rearrange, double-click an egg to hatch it, a booster to switch it on.</p>
                            <p className="mt-1">Mine and Farm stock lives here too: sell it, lock it, or set an auto-sell rule. The crafting itself still happens in those tabs.</p>
                        </div>
                    ) : (
                        panel()
                    )}
                </aside>
            </div>

            {bulk && (
                <div className="iv-card">
                    <SectionTitle color="var(--mc-yellow)">Bulk sell</SectionTitle>
                    <p className="iv-note mb-2">Pick what to sell. Locked items are never sold. Mine and Farm items sell for what those tabs would pay.</p>
                    <div className="iv-chips mb-2">
                        {SELL_CATS.map((c) => (
                            <button key={c.id} type="button" className="iv-chip" data-on={bulkCats.has(c.id)} style={{ ["--c" as string]: c.color } as CSSProperties} onClick={() => { setBulkCats((o) => { const n = new Set(o); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }); setConfirm(false); }}>
                                <McSymbol name={c.symbol} /> {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="iv-row mb-2">
                        <span className="iv-note">Up to rarity</span>
                        {RARITY_ORDER.map((r) => (
                            <button key={r} type="button" className="iv-chip" data-on={bulkRar === r} style={{ ["--c" as string]: lift(RARITIES[r].color) } as CSSProperties} onClick={() => { setBulkRar(r); setConfirm(false); }}>{RARITIES[r].name}</button>
                        ))}
                    </div>
                    <div className="iv-row mb-2">
                        <span className="iv-note">Keep of each</span>
                        <span className="iv-step">
                            <button type="button" aria-label="Keep fewer" onClick={() => { setBulkKeep((k) => Math.max(0, k - (k > 100 ? 100 : k > 10 ? 10 : 1))); setConfirm(false); }}>-</button>
                            <b>{fmtInt(bulkKeep)}</b>
                            <button type="button" aria-label="Keep more" onClick={() => { setBulkKeep((k) => k + (k >= 100 ? 100 : k >= 10 ? 10 : 1)); setConfirm(false); }}>+</button>
                        </span>
                    </div>
                    <div className="iv-prev">
                        {plan.slice(0, 8).map((p) => (
                            <div key={p.id}>
                                <Glyph id={p.id} size="sm" />
                                <span>{ITEM_BY_ID.get(p.id)!.name} x{fmtInt(p.n)}</span>
                                <b style={{ color: "var(--mc-aqua)" }}>{fmt(p.shards * eye)}</b>
                            </div>
                        ))}
                        {plan.length > 8 && <div className="iv-note">and {plan.length - 8} more...</div>}
                        {plan.length === 0 && <div className="iv-note">Nothing matches.</div>}
                    </div>
                    <div className="iv-row mt-2">
                        <button
                            type="button"
                            className="iv-btn"
                            style={{ ["--c" as string]: confirm ? "var(--mc-red)" : "var(--mc-yellow)" } as CSSProperties}
                            disabled={plan.length === 0}
                            onClick={() => {
                                if (!confirm) {
                                    setConfirm(true);
                                    return;
                                }
                                let r = { n: 0, shards: 0 };
                                act(() => {
                                    r = runSellPlan(s, d, plan);
                                    return r.n > 0;
                                }, "bulk");
                                if (r.n > 0) say(`Sold ${fmtInt(r.n)} items for ${F(r.shards)} shards`);
                                setConfirm(false);
                            }}
                        >
                            {confirm ? `Confirm: sell ${fmtInt(plan.reduce((a, p) => a + p.n, 0))} items for ${fmt(planTotal)}` : `Sell ${fmtInt(plan.reduce((a, p) => a + p.n, 0))} items for ${fmt(planTotal)}`}
                        </button>
                        {confirm && <button type="button" className="iv-note underline" onClick={() => setConfirm(false)}>Cancel</button>}
                    </div>
                </div>
            )}

            {rules && (
                <div className="iv-card">
                    <SectionTitle color="var(--mc-aqua)">Auto-sell rules</SectionTitle>
                    {!hasLicense(s) ? (
                        <p className="iv-note">
                            Auto-sell needs the Merchant&apos;s Licence from the Shop.{" "}
                            <button type="button" className="underline" onClick={() => go("shop")}>Open the Shop</button>
                        </p>
                    ) : (
                        <>
                            <p className="iv-note mb-2">Every second, anything above the amount you keep is sold. Select an item and use its panel to add a rule. Locked items are skipped.</p>
                            {Object.keys(inv.auto).length === 0 && <p className="iv-note">No rules yet.</p>}
                            <div className="flex flex-col gap-1">
                                {Object.entries(inv.auto).map(([id, keep]) => (
                                    <div key={id} className="iv-rule">
                                        <Glyph id={id} size="sm" />
                                        <span>{ITEM_BY_ID.get(id)?.name}{isLocked(s, id) ? " (locked, skipped)" : ""}</span>
                                        <span className="iv-step" style={{ flex: "none" }}>
                                            <button type="button" aria-label="Keep fewer" onClick={() => { setAutoRule(s, id, Math.max(0, keep - (keep > 100 ? 100 : keep > 10 ? 10 : 1))); render(); }}>-</button>
                                            <b>keep {fmtInt(keep)}</b>
                                            <button type="button" aria-label="Keep more" onClick={() => { setAutoRule(s, id, keep + (keep >= 100 ? 100 : keep >= 10 ? 10 : 1)); render(); }}>+</button>
                                        </span>
                                        <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-red)" } as CSSProperties} onClick={() => { setAutoRule(s, id, null); render(); }}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {inv.buyback.length > 0 && (
                <div className="iv-card">
                    <SectionTitle color="var(--mc-red)">Recently sold</SectionTitle>
                    <p className="iv-note mb-1">Take a sale back for exactly what it paid.</p>
                    <div className="flex flex-col gap-1">
                        {inv.buyback.slice(0, 4).map((b, i) => (
                            <div key={b.id} className="iv-rule">
                                <Glyph id={b.id} size="sm" />
                                <span>{ITEM_BY_ID.get(b.id)?.name} x{fmtInt(b.n)}</span>
                                <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-red)" } as CSSProperties} disabled={s.shards < b.paid} onClick={() => run(() => buyBack(s, i))}>
                                    Buy back {fmt(b.paid)}
                                </button>
                            </div>
                        ))}
                    </div>
                    {inv.buyback.length > 4 && <p className="iv-note mt-1">More in the Shop&apos;s Buy back shelf.</p>}
                </div>
            )}
        </div>
    );

    // The detail panel for the selected item.
    function panel() {
        const def = selDef!;
        const id = def.id;
        const rar = RARITIES[def.rarity];
        const cat = CAT_BY_ID.get(def.cat)!;
        const n = selN;
        const unit = unitValue(s, d, id) * eye;
        const sellN = qty === -1 ? n : Math.min(qty, n);
        const locked = isLocked(s, id);
        const keep = inv.auto[id];
        const pet = PET_ITEM_BY_ID.get(id);
        const boost = BOOST_BY_ID.get(id);
        return (
            <>
                <div className="iv-ph">
                    <Glyph id={id} size="lg" />
                    <div className="min-w-0 flex-1">
                        <div className="iv-pn" style={{ color: lift(def.color) }}>{def.name}</div>
                        <div className="iv-pr" style={{ color: rar.color }}>{rar.name} · {cat.label}</div>
                    </div>
                    <button type="button" className="iv-btn" style={{ ["--c" as string]: locked ? "var(--mc-gold)" : "var(--muted-foreground)" } as CSSProperties} data-on={locked} aria-pressed={locked} onClick={() => { toggleLock(s, id); render(); }}>
                        <McSymbol name="key" /> {locked ? "Locked" : "Lock"}
                    </button>
                </div>
                <p className="iv-pd">{def.desc}</p>
                <dl className="iv-rows">
                    <dt>You have</dt>
                    <dd>{fmtInt(n)}</dd>
                    {def.sellable && (
                        <>
                            <dt>Sells for</dt>
                            <dd style={{ color: "var(--mc-aqua)" }}>{fmt(unit)} each</dd>
                            <dt>Stack worth</dt>
                            <dd style={{ color: "var(--mc-aqua)" }}>{fmt(unit * n)}</dd>
                        </>
                    )}
                </dl>

                <div className="iv-h">Use</div>
                <div className="iv-row">
                    {def.cat === "egg" && (
                        <>
                            <button type="button" className="iv-btn" onClick={() => hatch(id, 1)}>Hatch</button>
                            {n >= 3 && <button type="button" className="iv-btn" onClick={() => hatch(id, 3)}>x3</button>}
                            {n > 3 && <button type="button" className="iv-btn" onClick={() => hatch(id, 500)}>Hatch all ({fmtInt(n)})</button>}
                        </>
                    )}
                    {boost && (
                        <button type="button" className="iv-btn" onClick={() => run(() => activateBooster(s, id))}>Switch on</button>
                    )}
                    {pet && (
                        <button type="button" className="iv-btn" data-on={picker} onClick={() => setPicker((p) => !p)}>
                            Use on a pet...
                        </button>
                    )}
                    {def.cat === "consumable" && <button type="button" className="iv-btn" onClick={() => run(() => consumeFromInv(s, d, id))}>Use</button>}
                    {def.cat === "cache" && (
                        <>
                            <button type="button" className="iv-btn" onClick={() => run(() => openCache(s, d, id, false))}>Open</button>
                            {n > 1 && <button type="button" className="iv-btn" onClick={() => run(() => openCache(s, d, id, true))}>Open all</button>}
                        </>
                    )}
                    {def.home && (
                        <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties} onClick={() => go(def.home!)}>
                            Open {def.home === "mine" ? "Mine" : def.home === "farm" ? "Farm" : "Pets"}
                        </button>
                    )}
                    {!boost && !pet && def.cat !== "egg" && def.cat !== "consumable" && def.cat !== "cache" && !def.home && <span className="iv-note">Nothing to use. It is for selling or crafting.</span>}
                </div>
                {pet && picker && (
                    <div className="iv-pets">
                        {petTargets(s, id).slice(0, 40).map((pid) => {
                            const p = PET_BY_ID.get(pid)!;
                            const st = s.pets[pid];
                            return (
                                <button key={pid} type="button" className="iv-pet" onClick={() => run(() => applyPetItem(s, id, pid))}>
                                    <span style={{ color: p.color }}><McSymbol name={p.symbol} /></span>
                                    <span className="min-w-0">
                                        <span style={{ color: rarityColor_(p.rarity) }}>{p.name}</span>
                                        <small>Lv {petLevel(p, st.xp)} · {st.n - 1} star{st.n === 2 ? "" : "s"}{s.equip.includes(pid) ? " · equipped" : ""}</small>
                                    </span>
                                </button>
                            );
                        })}
                        {petTargets(s, id).length === 0 && <p className="iv-note">{PETS.some((p) => s.pets[p.id]) ? "No pet can use this right now." : "Hatch a pet first."}</p>}
                    </div>
                )}

                {def.sellable && (
                    <>
                        <div className="iv-h">Sell</div>
                        <div className="iv-row">
                            <div className="iv-q" role="group" aria-label="Amount to sell">
                                {QTYS.map((o) => (
                                    <button key={o.v} type="button" data-on={qty === o.v} onClick={() => setQty(o.v)}>{o.label}</button>
                                ))}
                            </div>
                            <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-yellow)" } as CSSProperties} disabled={locked || n < 1} onClick={() => sell(id, sellN)}>
                                {locked ? "Locked" : `Sell ${fmtInt(sellN)} for ${fmt(unit * sellN)}`}
                            </button>
                        </div>
                        <div className="iv-h">Auto-sell</div>
                        {hasLicense(s) ? (
                            <div className="iv-row">
                                {keep === undefined ? (
                                    <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties} onClick={() => { setAutoRule(s, id, 0); render(); }}>Sell everything automatically</button>
                                ) : (
                                    <>
                                        <span className="iv-step">
                                            <button type="button" aria-label="Keep fewer" onClick={() => { setAutoRule(s, id, Math.max(0, keep - (keep > 100 ? 100 : keep > 10 ? 10 : 1))); render(); }}>-</button>
                                            <b>keep {fmtInt(keep)}</b>
                                            <button type="button" aria-label="Keep more" onClick={() => { setAutoRule(s, id, keep + (keep >= 100 ? 100 : keep >= 10 ? 10 : 1)); render(); }}>+</button>
                                        </span>
                                        <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-red)" } as CSSProperties} onClick={() => { setAutoRule(s, id, null); render(); }}>Remove rule</button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="iv-note">
                                Needs the Merchant&apos;s Licence. <button type="button" className="underline" onClick={() => go("shop")}>Open the Shop</button>
                            </p>
                        )}
                    </>
                )}

                <div className="iv-h">Place</div>
                <div className="iv-row">
                    <button
                        type="button"
                        className="iv-btn"
                        style={{ ["--c" as string]: "var(--mc-green)" } as CSSProperties}
                        data-on={!!moving}
                        onClick={() => {
                            const at = inv.slots.indexOf(id);
                            setMoving(at >= 0 ? `s:${at}` : `o:${id}`);
                        }}
                    >
                        Move...
                    </button>
                    <Tip tip={<TipCard title="Moving items" color="var(--mc-green)" lines={["On a computer, drag a slot onto another. On a touch screen, press Move, then tap the slot you want."]} />}>
                        <span className="iv-note" tabIndex={0}>?</span>
                    </Tip>
                </div>
            </>
        );
    }
}

const rarityColor_ = (r: Rarity) => lift(RARITIES[r].color);

"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Lock, Search, X } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { fmt, fmtInt } from "@/lib/fractured-idle/format";
import { EGG_BY_ID, PETS, PET_BY_ID, RARITIES, RARITY_ORDER, petLevel, type EggDef, type Rarity } from "@/lib/fractured-idle/pets-data";
import { BOOST_BY_ID, boostSlots } from "@/lib/fractured-idle/boosters";
import { CATS, CAT_BY_ID, ITEM_BY_ID, PET_ITEM_BY_ID, itemCount, rarityRank, sellBonus, unitValue, type ItemCat } from "@/lib/fractured-idle/items";
import { MAX_PAGES, PAGE_SIZE, SORTS, hasLicense, isLocked, moveSlot, placeOverflow, setAutoRule, slotCap, sortSlots, syncSlots, toggleLock, type SortKey } from "@/lib/fractured-idle/inv-core";
import { activateBooster, applyPetItem, buyBack, consumeFromInv, hatchFromInv, openCache, petTargets, runSellPlan, sellFromInv, sellPlan } from "@/lib/fractured-idle/inv-actions";
import { BoostStrip, Glyph, ItemTip } from "./inv-parts";
import { Tip, TipCard } from "./tooltip";
import { lift, type Ctx } from "./ui";

// The Inventory. A 9 x 3 grid per page (one page to start, two more unlocked in the Shop) of big, touching tiles:
// icon, name, then the stack size underneath. It holds eggs, pet items and boosters directly and shows the Mine and
// Farm stock in the same grid. Select a tile for its panel (to the right of the grid on anything wider than a phone, under it
// on a phone): use it, sell it, lock it, set an auto-sell rule. Bulk sell / auto-sell / sold open in that same panel so
// nothing pushes the page down. Every tile carries a small tag for its type (an egg for eggs, a bolt for boosters...)
// and eggs have a quick-hatch bar above the grid. Keys: arrows move, Enter selects, H or U uses (hatches) it, A hatches
// every egg of the kind, L locks, Esc clears, / searches. Drag tiles to rearrange (or Move on a touch screen), sort, search,
// filter by type, bulk sell, and keep an eye on booster slots. Arrow keys move between tiles, Enter selects, L locks.

type Qty = 1 | 10 | 100 | -1;
const QTYS: { v: Qty; label: string }[] = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "All" },
];
const SELL_CATS = CATS.filter((c) => c.id !== "cache");
type Tool = "none" | "sell" | "auto" | "sold";
const ROMAN = ["I", "II", "III"];

export function InventoryTab({ s, d, F, act, render, say, eggFx, go }: Ctx & { go: (id: string) => void }) {
    const [page, setPage] = useState(0);
    const [sel, setSel] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [cat, setCat] = useState<ItemCat | "all">("all");
    const [qty, setQty] = useState<Qty>(1);
    const [picker, setPicker] = useState(false);
    const [moving, setMoving] = useState<string | null>(null); // "s:<slot>" or "o:<item id>"
    const [over, setOver] = useState<number | null>(null);
    const [tool, setTool] = useState<Tool>("none");
    const [bulkCats, setBulkCats] = useState<Set<ItemCat>>(() => new Set<ItemCat>(["ore", "crop", "good"]));
    const [bulkRar, setBulkRar] = useState<Rarity>("rare");
    const [bulkKeep, setBulkKeep] = useState(0);
    const [confirm, setConfirm] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const inv = s.inv;
    const overflow = syncSlots(s);
    const cap = slotCap(s);
    const used = inv.slots.filter(Boolean).length + overflow.length;
    const needle = q.trim().toLowerCase();
    const match = (id: string) => {
        const def = ITEM_BY_ID.get(id);
        if (!def) return false;
        return (cat === "all" || def.cat === cat) && (!needle || def.name.toLowerCase().includes(needle));
    };
    const eye = sellBonus(s);
    const liveBoosts = inv.active.filter((a) => a.end > Date.now()).length;

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

    const eggIds = [...inv.slots, ...overflow].filter((id): id is string => !!id && id.startsWith("egg:") && itemCount(s, id) > 0);
    const selN = sel ? itemCount(s, sel) : 0;
    const selDef = sel && selN > 0 ? ITEM_BY_ID.get(sel) : undefined; // a stack that ran out simply shows nothing

    // On a phone the panel sits under the grid, so bring it into view when something is picked.
    useEffect(() => {
        const el = panelRef.current;
        const box = root.current;
        if (!el || !box || box.clientWidth >= 600) return;
        if (sel || tool !== "none") el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sel, tool]);

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
    const stepKeep = (k: number, dir: 1 | -1) => (dir > 0 ? k + (k >= 100 ? 100 : k >= 10 ? 10 : 1) : Math.max(0, k - (k > 100 ? 100 : k > 10 ? 10 : 1)));

    const unlocked = page * PAGE_SIZE < cap;
    const pageSlots = Array.from({ length: PAGE_SIZE }, (_, i) => page * PAGE_SIZE + i);

    // bulk-sell preview
    const plan = useMemo(
        () => (tool === "sell" ? sellPlan(s, d, (id) => bulkCats.has(ITEM_BY_ID.get(id)!.cat) && rarityRank(ITEM_BY_ID.get(id)!.rarity) <= RARITY_ORDER.indexOf(bulkRar), bulkKeep) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tool, bulkCats, bulkRar, bulkKeep, Math.floor(Date.now() / 1000)],
    );
    const planItems = plan.reduce((a, p) => a + p.n, 0);
    const planTotal = plan.reduce((a, p) => a + p.shards, 0) * eye;

    const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const grid = gridRef.current;
        const el = (e.target as HTMLElement).closest(".iv-slot") as HTMLElement | null;
        if (!grid || !el) return;
        const all = [...grid.querySelectorAll<HTMLElement>(".iv-slot")];
        const i = all.indexOf(el);
        const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length || 1;
        const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowDown" ? i + cols : e.key === "ArrowUp" ? i - cols : e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : -1;
        if (to >= 0 && to < all.length) {
            e.preventDefault();
            all[to].focus();
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            const id = el.dataset.item;
            const k = e.key.toLowerCase();
            if (!id) return;
            if (k === "l") {
                e.preventDefault();
                toggleLock(s, id);
                render();
            } else if (k === "h" || k === "u") {
                e.preventDefault();
                setSel(id);
                primary(id);
            } else if (k === "a" && id.startsWith("egg:")) {
                e.preventDefault();
                hatch(id, 500);
            }
        }
    };
    const onRootKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const tag = (e.target as HTMLElement).tagName;
        const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
        if (e.key === "Escape") {
            if (moving) setMoving(null);
            else if (tool !== "none") setTool("none");
            else if (sel) setSel(null);
            else if (q) setQ("");
            else return;
            e.preventDefault();
        } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            searchRef.current?.focus();
        }
    };

    const slotBtn = (idx: number, id: string | null, spill = false) => {
        const def = id ? ITEM_BY_ID.get(id) : undefined;
        const n = id ? itemCount(s, id) : 0;
        const key = spill ? `o${id}` : idx;
        const style = def ? ({ ["--ic" as string]: def.color, ["--rc" as string]: RARITIES[def.rarity].color } as CSSProperties) : undefined;
        const btn = (
            <button
                key={key}
                type="button"
                className="iv-slot"
                style={style}
                data-item={id ?? undefined}
                data-empty={!def}
                data-sel={!!id && sel === id}
                data-dim={!!id && !match(id)}
                data-drop={over === idx && !spill}
                data-moving={!!id && moving === (spill ? `o:${id}` : `s:${idx}`)}
                data-rar={def ? rarityRank(def.rarity) : undefined}
                aria-label={def ? `${def.name}, ${fmtInt(n)}` : `Empty slot ${idx + 1}`}
                aria-pressed={!!id && sel === id}
                draggable={!!def}
                onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", spill ? `o:${id}` : `s:${idx}`);
                    e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                    if (spill) return;
                    e.preventDefault();
                    setOver(idx);
                }}
                onDragLeave={() => setOver((o) => (o === idx ? null : o))}
                onDrop={(e) => {
                    if (spill) return;
                    e.preventDefault();
                    setOver(null);
                    const v = e.dataTransfer.getData("text/plain");
                    if (v) place(v, idx);
                }}
                onDoubleClick={() => id && primary(id)}
                onClick={() => {
                    if (moving && !spill) {
                        place(moving, idx);
                        setMoving(null);
                        return;
                    }
                    if (id) {
                        setSel(id);
                        setPicker(false);
                        setTool("none");
                    } else setSel(null);
                }}
            >
                {def && (
                    <>
                        <span className="iv-tg" style={{ ["--tc" as string]: CAT_BY_ID.get(def.cat)!.color } as CSSProperties} aria-hidden="true"><McSymbol name={CAT_BY_ID.get(def.cat)!.symbol} /></span>
                        <span className="iv-fl">
                            {isLocked(s, id!) && <span className="iv-lk"><McSymbol name="key" /></span>}
                            {inv.auto[id!] !== undefined && <span className="iv-au"><McSymbol name="scales" /></span>}
                        </span>
                        <span className="iv-ico"><McSymbol name={def.symbol} /></span>
                        <span className="iv-nm">{def.name}</span>
                        <span className="iv-ct"><i>x</i>{fmtInt(n)}</span>
                    </>
                )}
            </button>
        );
        return id ? (
            <Tip key={key} box className="contents" tip={() => <ItemTip s={s} d={d} id={id} extra={<span className="text-[10px] text-muted-foreground">Click for actions. Double-click to {def!.cat === "egg" ? "hatch one" : def!.cat === "booster" || def!.cat === "consumable" ? "use" : def!.cat === "cache" ? "open" : "select"}. Drag to move. L locks{def!.cat === "egg" ? ", A hatches all" : ""}.</span>} />}>
                {btn}
            </Tip>
        ) : (
            btn
        );
    };

    const toolsNode = tool !== "none" ? (
                    <div className="iv-tools">
                        <button type="button" className="iv-x" aria-label="Close tool" onClick={() => setTool("none")}><X className="size-4" /></button>
                        {tool === "sell" && (
                            <>
                                <div className="iv-h" style={{ color: "var(--mc-yellow)" }}>Bulk sell</div>
                                <div className="iv-form">
                                    <span className="iv-h">Types</span>
                                    <div className="iv-chips">
                                        {SELL_CATS.map((c) => (
                                            <button key={c.id} type="button" className="iv-chip" data-on={bulkCats.has(c.id)} style={{ ["--c" as string]: c.color } as CSSProperties} onClick={() => { setBulkCats((o) => { const n = new Set(o); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }); setConfirm(false); }}>
                                                <McSymbol name={c.symbol} /> {c.label}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="iv-h">Up to rarity</span>
                                    <div className="iv-chips">
                                        {RARITY_ORDER.map((r) => (
                                            <button key={r} type="button" className="iv-chip" data-on={bulkRar === r} style={{ ["--c" as string]: lift(RARITIES[r].color) } as CSSProperties} onClick={() => { setBulkRar(r); setConfirm(false); }}>{RARITIES[r].name}</button>
                                        ))}
                                    </div>
                                    <span className="iv-h">Keep of each</span>
                                    <span className="iv-step">
                                        <button type="button" aria-label="Keep fewer" onClick={() => { setBulkKeep((k) => stepKeep(k, -1)); setConfirm(false); }}>-</button>
                                        <b>{fmtInt(bulkKeep)}</b>
                                        <button type="button" aria-label="Keep more" onClick={() => { setBulkKeep((k) => stepKeep(k, 1)); setConfirm(false); }}>+</button>
                                    </span>
                                </div>
                                <div className="iv-prev">
                                    {plan.slice(0, 12).map((p) => (
                                        <div key={p.id} className="iv-line">
                                            <Glyph id={p.id} size="sm" />
                                            <span>{ITEM_BY_ID.get(p.id)!.name} x{fmtInt(p.n)}</span>
                                            <b>{fmt(p.shards * eye)}</b>
                                        </div>
                                    ))}
                                    {plan.length > 12 && <div className="iv-note">and {plan.length - 12} more...</div>}
                                    {plan.length === 0 && <div className="iv-note">Nothing matches. Locked items are never sold.</div>}
                                </div>
                                <div className="iv-row">
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
                                        {confirm ? "Confirm: " : ""}Sell {fmtInt(planItems)} items for {fmt(planTotal)}
                                    </button>
                                    {confirm && <button type="button" className="iv-note underline" onClick={() => setConfirm(false)}>Cancel</button>}
                                </div>
                            </>
                        )}

                        {tool === "auto" && (
                            <>
                                <div className="iv-h" style={{ color: "var(--mc-aqua)" }}>Auto-sell rules</div>
                                {!hasLicense(s) ? (
                                    <p className="iv-note">
                                        Auto-sell needs the Merchant&apos;s Licence from the Shop. <button type="button" onClick={() => go("shop")}>Open the Shop</button>
                                    </p>
                                ) : (
                                    <>
                                        <p className="iv-note">Every second, anything above the amount you keep is sold. Select an item and use its panel to add a rule. Locked items are skipped.</p>
                                        {Object.keys(inv.auto).length === 0 && <p className="iv-note">No rules yet.</p>}
                                        <div className="iv-lines">
                                            {Object.entries(inv.auto).map(([id, keep]) => (
                                                <div key={id} className="iv-line">
                                                    <Glyph id={id} size="sm" />
                                                    <span>{ITEM_BY_ID.get(id)?.name}{isLocked(s, id) ? " (locked)" : ""}</span>
                                                    <span className="iv-step" style={{ flex: "none" }}>
                                                        <button type="button" aria-label="Keep fewer" onClick={() => { setAutoRule(s, id, stepKeep(keep, -1)); render(); }}>-</button>
                                                        <b>keep {fmtInt(keep)}</b>
                                                        <button type="button" aria-label="Keep more" onClick={() => { setAutoRule(s, id, stepKeep(keep, 1)); render(); }}>+</button>
                                                    </span>
                                                    <button type="button" aria-label="Remove rule" className="text-muted-foreground hover:text-foreground" onClick={() => { setAutoRule(s, id, null); render(); }}>
                                                        <X className="size-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {tool === "sold" && (
                            <>
                                <div className="iv-h" style={{ color: "var(--mc-red)" }}>Recently sold</div>
                                <p className="iv-note">Take a sale back for exactly what it paid.</p>
                                {inv.buyback.length === 0 && <p className="iv-note">Nothing sold lately.</p>}
                                <div className="iv-lines">
                                    {inv.buyback.map((b, i) => (
                                        <div key={b.id} className="iv-line">
                                            <Glyph id={b.id} size="sm" />
                                            <span>{ITEM_BY_ID.get(b.id)?.name} x{fmtInt(b.n)}</span>
                                            <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-red)", height: "1.7rem" } as CSSProperties} disabled={s.shards < b.paid} onClick={() => run(() => buyBack(s, i))}>
                                                {fmt(b.paid)}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
    ) : null;

    return (
        <div className="iv" ref={root} onKeyDown={onRootKey}>
            <div className="iv-in">
                <div className="iv-bar">
                    <div className="iv-seg" role="tablist" aria-label="Inventory pages">
                        {Array.from({ length: MAX_PAGES }, (_, p) => (
                            <button key={p} type="button" role="tab" aria-selected={page === p} data-on={page === p} data-lock={p * PAGE_SIZE >= cap} onClick={() => setPage(p)}>
                                {p * PAGE_SIZE >= cap && <Lock className="size-3" />}
                                {ROMAN[p]}
                            </button>
                        ))}
                    </div>
                    <label className="relative flex-1" style={{ minWidth: "7rem" }}>
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input ref={searchRef} className="iv-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ( / )" aria-label="Search items" />
                        {q && (
                            <button type="button" aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setQ("")}>
                                <X className="size-3.5" />
                            </button>
                        )}
                    </label>
                    <select
                        className="iv-sel"
                        aria-label="Sort inventory"
                        value=""
                        onChange={(e) => {
                            if (!e.target.value) return;
                            sortSlots(s, e.target.value as SortKey, (id) => unitValue(s, d, id));
                            render();
                        }}
                    >
                        <option value="">Sort: {SORTS.find((o) => o.id === inv.sort)?.label}</option>
                        {SORTS.map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                    </select>
                    <div className="iv-seg" role="group" aria-label="Inventory tools">
                        {([["sell", "Sell", "var(--mc-yellow)"], ["auto", "Auto", "var(--mc-aqua)"], ["sold", "Sold", "var(--mc-red)"]] as const).map(([id, label, c]) => (
                            <button key={id} type="button" data-on={tool === id} style={{ ["--c" as string]: c } as CSSProperties} onClick={() => { setTool((t) => (t === id ? "none" : id)); setConfirm(false); }}>
                                {label}
                                {id === "sold" && inv.buyback.length > 0 && <em>{inv.buyback.length}</em>}
                                {id === "auto" && Object.keys(inv.auto).length > 0 && <em>{Object.keys(inv.auto).length}</em>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="iv-sub">
                    <div className="iv-cats" aria-label="Filter by type">
                        <button type="button" className="iv-chip" data-on={cat === "all"} onClick={() => setCat("all")}>All <em>{used}</em></button>
                        {CATS.map((c) => (
                            <button key={c.id} type="button" className="iv-chip" data-on={cat === c.id} style={{ ["--c" as string]: c.color } as CSSProperties} onClick={() => setCat(cat === c.id ? "all" : c.id)}>
                                <McSymbol name={c.symbol} /> {c.label} <em>{counts.get(c.id) ?? 0}</em>
                            </button>
                        ))}
                    </div>
                    <div className="iv-stats">
                        <div className="iv-kv" title="Slots used">
                            <small>Slots</small>
                            <b style={used >= cap ? ({ ["--c" as string]: "var(--mc-red)" } as CSSProperties) : undefined}>{used}/{cap}</b>
                            <div className="iv-meter"><i style={{ width: `${Math.min(100, (used / Math.max(1, cap)) * 100)}%`, background: used >= cap ? "var(--mc-red)" : undefined }} /></div>
                        </div>
                        <div className="iv-kv" title="What your sellable stock would fetch">
                            <small>Worth</small>
                            <b style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties}>{fmt(worth.current.v)}</b>
                        </div>
                        <div className="iv-kv" title="Boosters running / slots">
                            <small>Boosts</small>
                            <b>{liveBoosts}/{boostSlots(s)}</b>
                        </div>
                    </div>
                </div>
                {liveBoosts > 0 && <BoostStrip s={s} />}

                {eggIds.length > 0 && (
                    <div className="iv-quick" aria-label="Quick hatch">
                        <span className="iv-h">Hatch</span>
                        {eggIds.map((id) => {
                            const def = ITEM_BY_ID.get(id)!;
                            const n = itemCount(s, id);
                            return (
                                <div key={id} className="iv-qe" style={{ ["--ic" as string]: def.color } as CSSProperties}>
                                    <Tip tip={() => <ItemTip s={s} d={d} id={id} />}>
                                        <button type="button" className="iv-qe-i" onClick={() => { setSel(id); setTool("none"); }} aria-label={`Select ${def.name}`}>
                                            <McSymbol name={def.symbol} />
                                            <b>{fmtInt(n)}</b>
                                        </button>
                                    </Tip>
                                    <button type="button" onClick={() => hatch(id, 1)}>Hatch</button>
                                    {n >= 3 && <button type="button" onClick={() => hatch(id, 3)}>x3</button>}
                                    {n > 1 && <button type="button" data-all="true" onClick={() => hatch(id, 500)}>All</button>}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="iv-main">
                    <div className="min-w-0">
                        <div className="iv-grid" ref={gridRef} role="grid" aria-label={`Inventory page ${page + 1}`} onKeyDown={onGridKey}>
                            {pageSlots.map((idx) => slotBtn(idx, unlocked ? inv.slots[idx] : null))}
                            {!unlocked && (
                                <div className="iv-lockpg">
                                    <Lock className="size-6" style={{ color: "var(--mc-aqua)" }} />
                                    <p>Page {ROMAN[page]} is locked. Unlock it with tokens in the Shop for 27 more slots.</p>
                                    <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties} onClick={() => go("shop")}>Open the Shop</button>
                                </div>
                            )}
                        </div>
                        {moving && (
                            <p className="iv-note mt-1.5" style={{ color: "var(--mc-green)" }}>
                                Moving: tap the slot to drop it in. <button type="button" onClick={() => setMoving(null)}>Cancel</button>
                            </p>
                        )}
                        {overflow.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1">
                                <p className="iv-note" style={{ color: "var(--mc-gold)" }}>
                                    No room for {overflow.length} item type{overflow.length > 1 ? "s" : ""}. They are safe: sell them, free a slot and Move them in, or <button type="button" onClick={() => go("shop")}>unlock a page</button>.
                                </p>
                                <div className="iv-over">{overflow.map((id) => slotBtn(-1, id, true))}</div>
                            </div>
                        )}
                    </div>

                    <aside ref={panelRef} aria-live="polite" className="min-w-0">
                        {toolsNode ?? (selDef ? (
                            panel()
                        ) : (
                            <div className="iv-empty">
                                <b className="font-minecraft text-xs" style={{ color: "var(--mc-aqua)" }}>Select an item</b>
                                <p className="iv-pd">Click a tile for its actions. Double-click (or press H) to hatch an egg or switch a booster on. Drag tiles to rearrange.</p>
                                <p className="iv-pd">Mine and Farm stock lives here too: sell it, lock it, or set an auto-sell rule. Crafting still happens in those tabs.</p>
                            </div>
                        ))}
                    </aside>
                </div>

            </div>
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
        const hasUse = def.cat === "egg" || !!boost || !!pet || def.cat === "consumable" || def.cat === "cache";
        return (
            <div className="iv-panel" style={{ ["--pc" as string]: def.color } as CSSProperties}>
                <div className="iv-ph">
                    <Glyph id={id} size="lg" />
                    <div className="min-w-0 flex-1">
                        <div className="iv-pn" style={{ color: lift(def.color) }}>{def.name}</div>
                        <div className="iv-tags">
                            <span className="iv-tag" style={{ color: rar.color }}>{rar.name}</span>
                            <span className="iv-tag" style={{ color: cat.color }}>{cat.label}</span>
                        </div>
                    </div>
                    <button type="button" aria-label="Close details" className="self-start rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground" onClick={() => setSel(null)}>
                        <X className="size-4" />
                    </button>
                </div>

                <div className="iv-kvs">
                    <div className="iv-kv"><small>Owned</small><b>{fmtInt(n)}</b></div>
                    <div className="iv-kv"><small>Each</small><b style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties}>{def.sellable ? fmt(unit) : "-"}</b></div>
                    <div className="iv-kv"><small>Stack</small><b style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties}>{def.sellable ? fmt(unit * n) : "-"}</b></div>
                </div>
                <p className="iv-pd">{def.desc}</p>

                {(hasUse || def.home) && (
                    <>
                        <div className="iv-h">Use</div>
                        <div className="iv-acts">
                            {def.cat === "egg" && (
                                <>
                                    <button type="button" className="iv-btn" onClick={() => hatch(id, 1)}>Hatch</button>
                                    {n >= 3 && <button type="button" className="iv-btn" onClick={() => hatch(id, 3)}>Hatch x3</button>}
                                    {n > 3 && <button type="button" className="iv-btn" onClick={() => hatch(id, 500)}>Hatch all ({fmtInt(n)})</button>}
                                </>
                            )}
                            {boost && <button type="button" className="iv-btn" onClick={() => run(() => activateBooster(s, id))}>Switch on</button>}
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
                                    Go to {def.home === "mine" ? "Mine" : def.home === "farm" ? "Farm" : "Pets"}
                                </button>
                            )}
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
                                                <span style={{ color: lift(RARITIES[p.rarity].color) }}>{p.name}</span>
                                                <small>Lv {petLevel(p, st.xp)} · {st.n - 1} star{st.n === 2 ? "" : "s"}{s.equip.includes(pid) ? " · equipped" : ""}</small>
                                            </span>
                                        </button>
                                    );
                                })}
                                {petTargets(s, id).length === 0 && <p className="iv-note">{PETS.some((p) => s.pets[p.id]) ? "No pet can use this right now." : "Hatch a pet first."}</p>}
                            </div>
                        )}
                    </>
                )}

                {def.sellable && (
                    <>
                        <div className="iv-h">Sell</div>
                        <div className="iv-sellrow">
                            <div className="iv-q" role="group" aria-label="Amount to sell">
                                {QTYS.map((o) => (
                                    <button key={o.v} type="button" data-on={qty === o.v} onClick={() => setQty(o.v)}>{o.label}</button>
                                ))}
                            </div>
                            <button type="button" className="iv-btn" data-wide="true" style={{ ["--c" as string]: "var(--mc-yellow)" } as CSSProperties} disabled={locked || n < 1} onClick={() => sell(id, sellN)}>
                                {locked ? "Locked" : `Sell ${fmtInt(sellN)} for ${fmt(unit * sellN)}`}
                            </button>
                        </div>
                    </>
                )}

                <div className="iv-row" style={{ justifyContent: "space-between" }}>
                    <button type="button" className="iv-btn" style={{ ["--c" as string]: locked ? "var(--mc-gold)" : "var(--muted-foreground)" } as CSSProperties} data-on={locked} aria-pressed={locked} onClick={() => { toggleLock(s, id); render(); }}>
                        <McSymbol name="key" /> {locked ? "Locked" : "Lock"}
                    </button>
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
                    <Tip tip={<TipCard title="Moving items" color="var(--mc-green)" lines={["On a computer, drag a tile onto another. On a touch screen, press Move, then tap the slot you want."]} />}>
                        <span className="iv-note" tabIndex={0}>?</span>
                    </Tip>
                </div>

                {def.sellable && (
                    <>
                        <div className="iv-h">Auto-sell</div>
                        {hasLicense(s) ? (
                            <div className="iv-row">
                                {keep === undefined ? (
                                    <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-aqua)" } as CSSProperties} onClick={() => { setAutoRule(s, id, 0); render(); }}>Sell everything automatically</button>
                                ) : (
                                    <>
                                        <span className="iv-step">
                                            <button type="button" aria-label="Keep fewer" onClick={() => { setAutoRule(s, id, stepKeep(keep, -1)); render(); }}>-</button>
                                            <b>keep {fmtInt(keep)}</b>
                                            <button type="button" aria-label="Keep more" onClick={() => { setAutoRule(s, id, stepKeep(keep, 1)); render(); }}>+</button>
                                        </span>
                                        <button type="button" className="iv-btn" style={{ ["--c" as string]: "var(--mc-red)" } as CSSProperties} onClick={() => { setAutoRule(s, id, null); render(); }}>Remove rule</button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="iv-note">
                                Needs the Merchant&apos;s Licence. <button type="button" onClick={() => go("shop")}>Open the Shop</button>
                            </p>
                        )}
                    </>
                )}
            </div>
        );
    }
}

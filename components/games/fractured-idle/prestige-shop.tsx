"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Lock, Star } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import { bestPrestige, buyPrestige, rebirthCap, rebirthPlan } from "@/lib/fractured-idle/engine";
import { GEM_UPS, PRESTIGE_CATS, autoEvery, bulkBuy, levelsOf, lockedBy, priceAt, upsFor, valueOf, type Currency, type PrestigeCat, type PrestigeUp } from "@/lib/fractured-idle/prestige";
import { Tip, TipCard } from "./tooltip";
import type { Ctx } from "./ui";

// The shop used by both the Rebirth tab (tokens) and the Ascension tab (gems). One component, so both read the same:
//   a wallet bar that stays on screen with your balance and a quantity picker, a "best value" ranking, family
//   filters, and compact cards that show level, old -> new, price and how many you can afford. Hover for details.

const CUR = {
    tokens: { name: "Tokens", one: "token", symbol: "magicFind", color: "var(--mc-yellow)", verb: "Rebirth to earn more" },
    gems: { name: "Gems", one: "gem", symbol: "pristine", color: "var(--mc-aqua)", verb: "Ascend to earn more" },
} as const;

const QTY = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "Max" },
];

type Filter = "all" | "best" | PrestigeCat;

const spentOn = (u: PrestigeUp, l: number) => {
    let t = 0;
    for (let i = 0; i < l; i++) t += priceAt(u, i);
    return t;
};

export function PrestigeShop({ cur, s, F, act, say }: Pick<Ctx, "s" | "F" | "act" | "say"> & { cur: Currency }) {
    const c = CUR[cur];
    const ups = upsFor(cur);
    const levels = levelsOf(cur, s);
    const bal = cur === "tokens" ? s.tokens : s.ap;
    const [qty, setQty] = useState(1);
    const [filter, setFilter] = useState<Filter>("all");
    const [hideMax, setHideMax] = useState(false);

    const rows = useMemo(() => ups.map((u) => ({ u, l: levels[u.id] || 0 })), [ups, levels, s.tokens, s.ap]); // eslint-disable-line react-hooks/exhaustive-deps
    const spent = rows.reduce((a, r) => a + spentOn(r.u, r.l), 0);
    const best = bestPrestige(s, cur);
    const ranked = rows
        .filter((r) => r.l < r.u.max && !lockedBy(r.u, levels))
        .map((r) => ({ ...r, v: valueOf(r.u, r.l) }))
        .sort((a, b) => b.v - a.v);
    const rank = new Map(ranked.map((r, i) => [r.u.id, i + 1]));

    const buy = (u: PrestigeUp, want: number) => {
        let got = 0;
        act(() => {
            got = buyPrestige(s, cur, u.id, want);
            return got > 0;
        });
        if (got > 1) say(`${u.name} +${got}`);
    };
    const spendAll = () => {
        let n = 0;
        act(() => {
            for (let i = 0; i < 400; i++) {
                const b = bestPrestige(s, cur);
                if (!b || buyPrestige(s, cur, b.id, 1) < 1) break;
                n++;
            }
            return n > 0;
        });
        say(n ? `Bought ${n} level${n === 1 ? "" : "s"}, best value first.` : `Nothing affordable yet.`);
    };

    let list = rows;
    if (filter === "best") list = ranked.map((r) => ({ u: r.u, l: r.l }));
    else if (filter !== "all") list = rows.filter((r) => r.u.cat === filter);
    if (hideMax && filter !== "best") list = list.filter((r) => r.l < r.u.max);

    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.u.cat] = (counts[r.u.cat] || 0) + (r.l < r.u.max ? 1 : 0);

    return (
        <div className="ps" style={{ ["--cc" as string]: c.color } as CSSProperties}>
            <div className="ps-wallet">
                <Tip tip={<TipCard title={c.name} color={c.color} lines={[cur === "tokens" ? "Earned by rebirthing. Spend them here on permanent upgrades." : "Earned by ascending. Gems buy upgrades that survive every reset."]} rows={[["You have", F(bal), c.color], ["Spent on upgrades", F(spent)], ["Levels owned", String(rows.reduce((a, r) => a + r.l, 0))]]} foot={c.verb} />}>
                    <div className="ps-bal" tabIndex={0}>
                        <span className="ps-bal-i"><McSymbol name={c.symbol} /></span>
                        <span>
                            <span className="ps-bal-l">{c.name}</span>
                            <b className="ps-bal-v">{F(bal)}</b>
                        </span>
                    </div>
                </Tip>
                <div className="ps-qty" role="radiogroup" aria-label="Buy amount">
                    {QTY.map((o) => (
                        <Tip key={o.v} tip={<TipCard title={o.v === -1 ? "Buy as many as possible" : `Buy ${o.v} at a time`} color={c.color} lines={["Applies to every card below. The button on each card shows the real cost."]} />}>
                            <button type="button" role="radio" aria-checked={qty === o.v} data-on={qty === o.v} onClick={() => setQty(o.v)}>{o.label}</button>
                        </Tip>
                    ))}
                </div>
                <Tip tip={<TipCard title="Buy best value" color="var(--mc-green)" lines={["Buys one level of the upgrade with the best rating you can afford right now."]} rows={best ? [["Would buy", ups.find((x) => x.id === best.id)?.name ?? ""]] : undefined} cta={best ? "Click to buy!" : undefined} ctaDim={!best} />}>
                    <button type="button" className="ps-act" disabled={!best} onClick={() => { const u = ups.find((x) => x.id === best?.id); if (u) buy(u, 1); }}><Star className="size-3.5" /> Best</button>
                </Tip>
                <Tip tip={<TipCard title="Spend all" color="var(--mc-green)" lines={["Keeps buying the best-value upgrade you can afford until you run out. Nothing is wasted: every level is real."]} cta={best ? "Click to spend!" : undefined} ctaDim={!best} />}>
                    <button type="button" className="ps-act" disabled={!best} onClick={spendAll}>Spend all</button>
                </Tip>
            </div>

            <div className="ps-chips" role="tablist" aria-label="Upgrade families">
                {([
                    { id: "all", label: "All", color: c.color, symbol: "wisdom", blurb: "Every upgrade." },
                    { id: "best", label: "Best value", color: "var(--mc-green)", symbol: "magicFind", blurb: "Unlocked upgrades ranked by estimated benefit per price. The top one is marked." },
                    ...PRESTIGE_CATS.filter((k) => rows.some((r) => r.u.cat === k.id)).map((k) => ({ id: k.id, label: k.label, color: k.color, symbol: k.symbol, blurb: k.blurb })),
                ] as { id: Filter; label: string; color: string; symbol: never; blurb: string }[]).map((f) => (
                    <Tip key={f.id} tip={<TipCard title={f.label} color={f.color} lines={[f.blurb]} />}>
                        <button type="button" role="tab" aria-selected={filter === f.id} data-on={filter === f.id} onClick={() => setFilter(f.id)} style={{ ["--c" as string]: f.color } as CSSProperties}>
                            <McSymbol name={f.symbol} /> {f.label}
                            {f.id !== "all" && f.id !== "best" && <em>{counts[f.id] || 0}</em>}
                        </button>
                    </Tip>
                ))}
                <span className="flex-1" />
                {filter !== "best" && (
                    <label className="ps-hide"><input type="checkbox" checked={hideMax} onChange={(e) => setHideMax(e.target.checked)} /> Hide maxed</label>
                )}
            </div>

            {list.length === 0 && <p className="ps-empty">{filter === "best" ? "Nothing unlocked is left to buy." : "Nothing here."}</p>}

            <div className="ps-grid">
                {list.map(({ u, l }) => {
                    const lock = lockedBy(u, levels);
                    const maxed = l >= u.max;
                    const price = priceAt(u, l);
                    const afford = bulkBuy(u, l, bal, -1);
                    const want = bulkBuy(u, l, bal, qty);
                    const state = maxed ? "max" : lock ? "locked" : want.n > 0 ? "buy" : "poor";
                    const isBest = best?.id === u.id && !maxed;
                    const r = rank.get(u.id);
                    const now = u.eff(l, (id) => levels[id] || 0);
                    const next = u.eff(l + 1, (id) => levels[id] || 0);
                    const catColor = PRESTIGE_CATS.find((k) => k.id === u.cat)?.color ?? u.color;
                    return (
                        <Tip
                            key={u.id}
                            box
                            tip={
                                <TipCard
                                    title={u.name}
                                    color={u.color}
                                    tag={`Level ${l} / ${u.max}`}
                                    lines={[u.desc]}
                                    rows={[
                                        ["Now", now],
                                        ...(maxed ? [] : ([["Next level", next, "var(--mc-green)"], ["Price", `${F(price)} ${c.one}${price === 1 ? "" : "s"}`, price <= bal ? c.color : "var(--mc-red)"]] as [string, string, string][])),
                                        ...(!maxed && afford.n > 0 ? ([["You can buy", `x${afford.n} for ${F(afford.cost)}`, c.color]] as [string, string, string][]) : []),
                                        ["Spent so far", `${F(spentOn(u, l))} ${c.one}s`],
                                        ...(r ? ([["Value rank", `#${r} of ${ranked.length}`, r === 1 ? "var(--mc-green)" : undefined]] as [string, string, string | undefined][]) : []),
                                    ] as [string, string, string?][]}
                                    notes={lock ? [{ text: lock, color: "var(--mc-red)" }] : maxed ? [{ text: "Maxed out", color: "var(--mc-green)" }] : price > bal ? [{ text: `Need ${F(price - bal)} more ${c.one}s`, color: "var(--mc-gold)" }] : undefined}
                                    foot={`${PRESTIGE_CATS.find((k) => k.id === u.cat)?.label} upgrade. The value rank is an estimate of benefit per price.`}
                                    cta={state === "buy" ? `Click to buy x${want.n}!` : undefined}
                                />
                            }
                        >
                            <button type="button" disabled={state !== "buy"} onClick={() => buy(u, qty)} className="ps-card" data-state={state} data-best={isBest} style={{ ["--c" as string]: u.color, ["--k" as string]: catColor } as CSSProperties}>
                                {isBest && <span className="ps-star"><Star className="size-3" /> Best value</span>}
                                <span className="ps-ic"><McSymbol name={lock ? "check" : u.symbol} />{lock && <Lock className="ps-lock size-3" />}</span>
                                <span className="ps-body">
                                    <span className="ps-name">{u.name}<em>{l}/{u.max}</em></span>
                                    <span className="ps-bar"><i style={{ width: `${(l / u.max) * 100}%` }} /></span>
                                    <span className="ps-eff">
                                        {lock ? (
                                            <span className="ps-lockt">{lock}</span>
                                        ) : maxed ? (
                                            <b>{now}</b>
                                        ) : (
                                            <>
                                                <span className="ps-old">{now}</span>
                                                <McSymbol name="arrow" />
                                                <b>{next}</b>
                                            </>
                                        )}
                                    </span>
                                </span>
                                <span className="ps-buy">
                                    {maxed ? (
                                        <span className="ps-max">MAX</span>
                                    ) : lock ? (
                                        <span className="ps-need">locked</span>
                                    ) : (
                                        <>
                                            <b className="ps-price">{F(want.n > 0 ? want.cost : price)}</b>
                                            <span className="ps-sub">{want.n > 0 ? (qty === 1 ? `1 level` : `x${want.n}`) : `need ${F(price - bal)}`}</span>
                                        </>
                                    )}
                                </span>
                            </button>
                        </Tip>
                    );
                })}
            </div>
        </div>
    );
}

// ---- Auto-buyers ----

const AUTOS: { key: "min" | "up" | "tok" | "rb"; up: string; name: string; blurb: string; color: string; symbol: never }[] = [
    { key: "min", up: "autoMin", name: "Minion Foreman", blurb: "Buys the minion that pays itself back fastest.", color: "var(--mc-green)", symbol: "defense" as never },
    { key: "up", up: "autoUp", name: "Upgrade Foreman", blurb: "Buys the cheapest shard upgrade you can afford.", color: "var(--mc-yellow)", symbol: "speed" as never },
    { key: "tok", up: "autoTok", name: "Token Steward", blurb: "Spends tokens on the best-value upgrade.", color: "var(--mc-light-purple)", symbol: "magicFind" as never },
    { key: "rb", up: "autoRb", name: "Rebirth Cycle", blurb: "Rebirths by itself once enough levels are ready.", color: "var(--mc-red)", symbol: "portal" as never },
];

type AutoKey = "min" | "up" | "tok" | "rb";

/** Compact auto-buyer switches. Shown at the top of the shop tabs (all four) and on the tabs they act on (`only`). */
export function AutoBar({ s, act, only }: Pick<Ctx, "s" | "act"> & { only?: AutoKey[] }) {
    const cap = Math.min(15, rebirthCap(s));
    const list = AUTOS.filter((a) => !only || only.includes(a.key));
    // On a tab they act on, hide the bar until one is unlocked; on the shops always show it so the unlock is discoverable.
    if (only && !list.some((a) => (s.aups[a.up] || 0) > 0)) return null;
    const rbN = Math.max(1, Math.min(s.auto.rbN, cap));
    return (
        <div className="ps-ab" role="group" aria-label="Auto-buyers">
            <span className="ps-ab-h"><McSymbol name="attackSpeed" /> Auto</span>
            {list.map((a) => {
                const lv = s.aups[a.up] || 0;
                const max = GEM_UPS.find((g) => g.id === a.up)?.max ?? 1;
                const lock = lv < 1;
                const on = s.auto[a.key] && !lock;
                const rb = a.key === "rb";
                const ready = rb && !lock ? rebirthPlan(s).count : 0;
                const status = lock
                    ? "locked"
                    : !on
                      ? "off"
                      : rb
                        ? ready >= rbN ? "firing" : `${ready}/${rbN} ready`
                        : `every ${autoEvery(a.key, lv)}s`;
                const missing = rb && lock && !(s.aups.autoTok > 0) ? "Needs Token Steward first." : null;
                const lines = [a.blurb, lock ? "Buy it with gems in the Ascension tab." : on ? "It is running." : "Click to switch it on."];
                if (rb && !lock) lines.push(`Rebirths once ${rbN} level${rbN > 1 ? "s are" : " is"} ready, checked every ${autoEvery("rb", lv)}s. Use - and + to change the number.`);
                if (rb && s.autoT.rbAt) lines.push(`Last auto-rebirth: ${Math.max(0, Math.round((Date.now() - s.autoT.rbAt) / 1000))}s ago (+${s.autoT.rbCount} levels, +${s.autoT.rbTokens} tokens).`);
                return (
                    <Tip key={a.key} box tip={<TipCard title={a.name} color={a.color} tag={lock ? "Locked" : `Level ${lv} / ${max}`} lines={lines} rows={lock ? undefined : [["Fires every", `${autoEvery(a.key, lv)}s`], ...(lv < max ? ([["Next level", `${autoEvery(a.key, lv + 1)}s`, "var(--mc-green)"]] as [string, string, string][]) : [])]} notes={missing ? [{ text: missing, color: "var(--mc-gold)" }] : undefined} />}>
                        <span className="ps-abc" data-on={on} data-lock={lock} data-fire={rb && on && ready >= rbN} style={{ ["--c" as string]: a.color } as CSSProperties}>
                            <button type="button" role="switch" aria-checked={on} aria-label={a.name} disabled={lock} onClick={() => act(() => { s.auto[a.key] = !s.auto[a.key]; return true; })} className="ps-abb">
                                <McSymbol name={a.symbol} />
                                <span className="ps-abn">{a.name.split(" ")[0]}</span>
                                <span className="ps-abs">{status}</span>
                            </button>
                            {rb && !lock && (
                                <span className="ps-step">
                                    <button type="button" aria-label="Fewer levels" onClick={() => act(() => { s.auto.rbN = Math.max(1, s.auto.rbN - 1); return true; })}>-</button>
                                    <b>{rbN}</b>
                                    <button type="button" aria-label="More levels" onClick={() => act(() => { s.auto.rbN = Math.min(cap, s.auto.rbN + 1); return true; })}>+</button>
                                </span>
                            )}
                        </span>
                    </Tip>
                );
            })}
            {!only && <span className="ps-ab-t">Unlock with gems in Ascension.</span>}
        </div>
    );
}

export const PS_CSS = `
.ps{display:flex;flex-direction:column;gap:.65rem}
.ps-wallet{position:sticky;top:.4rem;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;padding:.5rem .6rem;border-radius:1rem;background:color-mix(in oklch,var(--card) 88%,#000);backdrop-filter:blur(14px);border:1px solid color-mix(in oklch,var(--cc) 45%,transparent);box-shadow:0 10px 26px -14px rgba(0,0,0,.8),0 0 22px -12px var(--cc)}
.ps-bal{display:flex;align-items:center;gap:.6rem;padding:.25rem .7rem .25rem .35rem;border-radius:.8rem;background:color-mix(in oklch,var(--cc) 12%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--cc) 35%,transparent);cursor:help;outline:none;margin-right:auto}
.ps-bal-i{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:.65rem;font-size:1.2rem;color:var(--cc);background:color-mix(in oklch,var(--cc) 20%,transparent);box-shadow:0 0 14px -4px var(--cc)}
.ps-bal-l{display:block;font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.ps-bal-v{display:block;font-family:var(--font-minecraft,inherit);font-size:1.15rem;line-height:1;color:var(--cc);text-shadow:0 0 12px color-mix(in oklch,var(--cc) 50%,transparent)}
.ps-qty{display:inline-flex;padding:.15rem;border-radius:.7rem;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.ps-qty button{height:1.7rem;min-width:2.3rem;padding:0 .5rem;border-radius:.55rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--muted-foreground);transition:background .15s,color .15s,transform .12s;outline:none}
.ps-qty button:hover{color:var(--foreground);background:rgba(255,255,255,.07)}
.ps-qty button:active{transform:scale(.93)}
.ps-qty button[data-on="true"]{color:var(--cc);background:color-mix(in oklch,var(--cc) 20%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--cc) 55%,transparent)}
.ps-qty button:focus-visible,.ps-act:focus-visible,.ps-chips button:focus-visible,.ps-card:focus-visible{outline:2px solid var(--cc);outline-offset:2px}
.ps-act{display:inline-flex;align-items:center;gap:.3rem;height:2rem;padding:0 .75rem;border-radius:.7rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--mc-green);border:1px solid color-mix(in oklch,var(--mc-green) 50%,transparent);background:color-mix(in oklch,var(--mc-green) 10%,transparent);transition:background .15s,transform .12s,opacity .15s}
.ps-act:hover:not(:disabled){background:color-mix(in oklch,var(--mc-green) 22%,transparent);transform:translateY(-1px)}
.ps-act:active:not(:disabled){transform:scale(.95)}
.ps-act:disabled{opacity:.4;cursor:not-allowed}
.ps-chips{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem}
.ps-chips button{--c:var(--cc);display:inline-flex;align-items:center;gap:.35rem;height:1.9rem;padding:0 .7rem;border-radius:.65rem;font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:var(--muted-foreground);background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transition:background .15s,color .15s,box-shadow .15s,transform .12s;outline:none}
.ps-chips button em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;padding:0 .3rem;border-radius:999px;background:rgba(255,255,255,.1)}
.ps-chips button:hover{color:var(--foreground);transform:translateY(-1px)}
.ps-chips button[data-on="true"]{color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 55%,transparent)}
.ps-hide{display:inline-flex;align-items:center;gap:.35rem;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground);cursor:pointer}
.ps-empty{margin:0;padding:1rem;text-align:center;font-family:var(--font-rubik,inherit);font-size:.75rem;color:var(--muted-foreground)}
.ps-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(17.5rem,1fr));gap:.5rem}
.ps-card{--c:var(--mc-aqua);--k:var(--mc-aqua);position:relative;display:flex;align-items:center;gap:.7rem;width:100%;padding:.6rem .7rem;border-radius:.95rem;text-align:left;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:color-mix(in oklch,var(--c) 6%,rgba(0,0,0,.22));transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s,background .15s,opacity .15s;outline:none}
.ps-card[data-state="buy"]{cursor:pointer;border-color:color-mix(in oklch,var(--c) 60%,transparent);box-shadow:0 0 18px -8px var(--c)}
.ps-card[data-state="buy"]:hover,.ps-card[data-state="buy"]:focus-visible{transform:translateY(-2px);background:color-mix(in oklch,var(--c) 14%,rgba(0,0,0,.2));box-shadow:0 12px 26px -14px var(--c)}
.ps-card[data-state="buy"]:active{transform:scale(.985)}
.ps-card[data-state="poor"]{cursor:not-allowed}
.ps-card[data-state="locked"]{opacity:.55;cursor:not-allowed;filter:grayscale(.5)}
.ps-card[data-state="max"]{cursor:default;border-color:color-mix(in oklch,var(--mc-gold) 55%,transparent);background:color-mix(in oklch,var(--mc-gold) 7%,rgba(0,0,0,.22))}
.ps-card[data-best="true"]{border-color:var(--mc-green);box-shadow:0 0 0 1px var(--mc-green),0 0 22px -8px var(--mc-green)}
.ps-star{position:absolute;right:.5rem;top:-.55rem;display:inline-flex;align-items:center;gap:.2rem;padding:.02rem .45rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-size:.55rem;font-weight:700;color:#06210f;background:var(--mc-green);box-shadow:0 0 12px -2px var(--mc-green)}
.ps-ic{position:relative;display:grid;place-items:center;flex:none;width:2.4rem;height:2.4rem;border-radius:.75rem;font-size:1.25rem;color:var(--c);background:color-mix(in oklch,var(--c) 17%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 38%,transparent)}
.ps-lock{position:absolute;right:-.25rem;bottom:-.25rem;color:var(--muted-foreground);background:var(--card);border-radius:50%;padding:1px}
.ps-body{display:flex;flex-direction:column;gap:.2rem;min-width:0;flex:1}
.ps-name{display:flex;align-items:center;gap:.4rem;font-family:var(--font-minecraft,inherit);font-size:.78rem;font-weight:700;color:var(--c);line-height:1.15}
.ps-name em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;font-weight:500;padding:0 .35rem;border-radius:999px;color:var(--muted-foreground);background:rgba(255,255,255,.08)}
.ps-bar{display:block;height:.26rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.ps-bar i{display:block;height:100%;border-radius:999px;background:var(--c);box-shadow:0 0 8px var(--c);transition:width .4s}
.ps-eff{display:flex;align-items:center;flex-wrap:wrap;gap:.3rem;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.ps-eff b{font-weight:600;color:var(--mc-green)}
.ps-old{color:#a59fb8}
.ps-lockt{color:var(--mc-gold)}
.ps-buy{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:3.6rem}
.ps-price{font-family:var(--font-minecraft,inherit);font-size:.95rem;color:var(--muted-foreground)}
.ps-card[data-state="buy"] .ps-price{color:var(--cc);text-shadow:0 0 10px color-mix(in oklch,var(--cc) 45%,transparent)}
.ps-sub{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.ps-max{font-family:var(--font-minecraft,inherit);font-size:.8rem;color:var(--mc-gold);text-shadow:0 0 10px color-mix(in oklch,var(--mc-gold) 50%,transparent)}
.ps-need{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.ps-ab{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;padding:.3rem .4rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--mc-red) 28%,transparent);background:color-mix(in oklch,var(--mc-red) 5%,rgba(0,0,0,.2))}
.ps-ab-h{display:inline-flex;align-items:center;gap:.3rem;padding:0 .3rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--mc-red)}
.ps-ab-t{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.ps-abc{--c:var(--mc-green);display:inline-flex;align-items:center;gap:.25rem;padding-right:.2rem;border-radius:.65rem;border:1px solid color-mix(in oklch,var(--c) 25%,transparent);background:rgba(255,255,255,.03);transition:border-color .15s,box-shadow .2s,background .15s}
.ps-abc[data-on="true"]{border-color:var(--c);background:color-mix(in oklch,var(--c) 12%,transparent);box-shadow:0 0 12px -6px var(--c)}
.ps-abc[data-fire="true"]{animation:ps-fire 1s ease-in-out infinite}
@keyframes ps-fire{50%{box-shadow:0 0 16px -2px var(--c)}}
.ps-abc[data-lock="true"]{opacity:.5}
.ps-abb{display:inline-flex;align-items:center;gap:.35rem;height:1.8rem;padding:0 .5rem;border-radius:.6rem;color:var(--c);outline:none}
.ps-abb:focus-visible{outline:2px solid var(--c);outline-offset:1px}
.ps-abb:disabled{cursor:not-allowed}
.ps-abn{font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700}
.ps-abs{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.ps-abc[data-on="true"] .ps-abs{color:var(--c)}
.ps-step{display:inline-flex;align-items:center;gap:.2rem;font-family:var(--font-minecraft,inherit);font-size:.72rem}
.ps-step button{width:1.35rem;height:1.35rem;border-radius:.4rem;background:rgba(255,255,255,.1);color:var(--foreground)}
.ps-step button:hover{background:rgba(255,255,255,.2)}
@media (prefers-reduced-motion:reduce){.ps-card,.ps-qty button,.ps-act,.ps-chips button{transition:none}}
`;


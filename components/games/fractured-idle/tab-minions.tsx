"use client";

import { useState } from "react";
import { Check, ChevronDown, Lock, Sparkles } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { COL_AT, COL_ITEM, MILESTONES, MINIONS, MINION_COL, MINION_UPS_BY, colRewardText, colTier } from "@/lib/fractured-idle/data";
import { bestBuys, buyInfo, buyMinion, buyUpgrade, fmtEta, income, milestoneMult, upAvailable, upCost } from "@/lib/fractured-idle/engine";
import { BUY_OPTIONS, Teaser, lift, tint, type Ctx } from "./ui";

// Minions tab: a sticky buy-amount bar, a "best value" ribbon, and one card
// per minion. Each card opens into that minion's collection (resets on
// rebirth) and its own upgrades.

const RANKS = [
    { label: "Best value", color: "var(--mc-gold)" },
    { label: "#2 value", color: "#d8d8ea" },
    { label: "#3 value", color: "#e0955a" },
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, isFinite(n) ? n : 0));
const pctOf = (a: number, b: number) => {
    const p = b > 0 ? (a / b) * 100 : 0;
    return `${p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)}%`;
};

/** A row of segments, each filling smoothly between the previous threshold and its own. */
function SegTrack({ at, value, color, h = 6, labels }: { at: number[]; value: number; color: string; h?: number; labels?: string[] }) {
    return (
        <div className="flex gap-1">
            {at.map((a, k) => {
                const p = clamp01((value - (k ? at[k - 1] : 0)) / (a - (k ? at[k - 1] : 0)));
                const done = p >= 1;
                return (
                    <div key={a} className="min-w-0 flex-1">
                        <div className="overflow-hidden rounded-full bg-white/10" style={{ height: h }}>
                            <div
                                className="h-full rounded-full transition-[width] duration-300 ease-linear"
                                style={{ width: `${p * 100}%`, backgroundColor: color, boxShadow: done ? `0 0 8px ${color}` : undefined, opacity: done ? 1 : 0.85 }}
                            />
                        </div>
                        {labels && (
                            <div className="mt-0.5 truncate text-right font-minecraft text-[9px]" style={{ color: done ? color : "var(--muted-foreground)" }}>
                                {labels[k]}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function BuyBar({ s, render }: Pick<Ctx, "s" | "render">) {
    const order = BUY_OPTIONS.map((o) => o.v);
    const cycle = () => {
        s.buy = order[(order.indexOf(s.buy) + 1) % order.length];
        render();
    };
    const aqua = "var(--mc-aqua)";
    return (
        <div className="sticky -top-3 z-10 -mx-3 -mt-3 px-3 pb-2 pt-3 backdrop-blur-md" style={{ backgroundColor: "color-mix(in oklch, var(--background) 45%, transparent)" }}>
            <div
                role="button"
                tabIndex={0}
                title="Click to change how many you buy at once (B)"
                onClick={cycle}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        cycle();
                    }
                }}
                className="flex cursor-pointer select-none items-center gap-3 rounded-xl border px-3 py-2 transition-colors hover:bg-white/5"
                style={{ borderColor: tint(aqua, 60), backgroundImage: `linear-gradient(110deg, ${tint(aqua, 26)}, ${tint(aqua, 8)} 70%)`, boxShadow: `0 0 22px -8px ${aqua}, inset 0 1px 0 rgba(255,255,255,0.12)` }}
            >
                <div className="w-16 leading-none">
                    <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">Buying</div>
                    <div className="font-minecraft font-bold text-3xl" style={{ color: aqua, textShadow: `0 0 12px ${tint(aqua, 60)}` }}>
                        {s.buy === -1 ? "MAX" : `x${s.buy}`}
                    </div>
                </div>
                <div className="flex flex-1 gap-1">
                    {BUY_OPTIONS.map((o) => {
                        const on = s.buy === o.v;
                        return (
                            <button
                                key={o.v}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    s.buy = o.v;
                                    render();
                                }}
                                className="flex-1 rounded-lg border py-1.5 font-minecraft font-bold text-xs transition-colors hover:bg-white/10"
                                style={on ? { borderColor: aqua, backgroundColor: tint(aqua, 22), color: aqua } : { borderColor: "rgba(255,255,255,0.12)", color: "var(--muted-foreground)" }}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>
                <span className="hidden font-rubik text-[10px] text-muted-foreground sm:block">Click to cycle</span>
            </div>
        </div>
    );
}

export function MinionsTab({ s, d, F, act, render }: Ctx) {
    const [open, setOpen] = useState<Record<number, boolean>>({});
    // Minions appear once you have earned a quarter of their price.
    const visible = (i: number) => i === 0 || s.minions[i] > 0 || s.total >= MINIONS[i].cost * 0.25;
    const firstHidden = MINIONS.findIndex((_, i) => !visible(i));

    const top = bestBuys(s, d, visible);
    const rankOf = (i: number) => top.findIndex((t) => t.i === i);
    const stack = s.buy === -1 ? "max" : `x${s.buy}`;

    return (
        <>
            <BuyBar s={s} render={render} />

            {top.length > 0 && (
                <div>
                    <div className="mb-1.5 flex items-center gap-1.5 font-minecraft text-[10px] uppercase tracking-widest" style={{ color: RANKS[0].color }}>
                        <Sparkles className="size-3" /> Best value at {stack}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        {top.map((t, r) => {
                            const m = MINIONS[t.i];
                            const c = RANKS[r].color;
                            const buy = () => t.info.can && act(() => buyMinion(s, t.i), s.buy === 1 ? undefined : "bulk");
                            return (
                                <div
                                    key={t.i}
                                    role="button"
                                    tabIndex={0}
                                    aria-disabled={!t.info.can}
                                    onClick={buy}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            buy();
                                        }
                                    }}
                                    title={`${m.name}: pays itself back in ${fmtEta(t.info.payback)}`}
                                    style={{ ["--c" as string]: c, borderColor: tint(c, t.info.can ? 75 : 40), backgroundColor: tint(c, 10) }}
                                    className={`fi-afford relative min-w-0 select-none overflow-hidden rounded-xl border px-2 py-1.5 text-left transition-transform ${t.info.can ? "cursor-pointer hover:-translate-y-px" : "cursor-not-allowed opacity-75"}`}
                                >
                                    <span className="fi-shine pointer-events-none absolute inset-0" aria-hidden="true" />
                                    <span className="relative flex items-center gap-1.5">
                                        <span className="grid size-5 shrink-0 place-items-center rounded-full font-minecraft text-[10px] text-black" style={{ backgroundColor: c }}>{r + 1}</span>
                                        <span className="truncate font-minecraft font-bold text-xs" style={{ color: lift(m.color) }}>{m.name.replace(" Minion", "")}</span>
                                    </span>
                                    <span className="relative mt-0.5 block truncate font-rubik text-[10px] text-muted-foreground">
                                        {t.info.n > 1 ? `x${t.info.n} · ` : ""}back in {fmtEta(t.info.payback)}
                                    </span>
                                    <span
                                        className="relative mt-1 flex items-center justify-between rounded-md border px-1.5 py-0.5 font-minecraft font-bold text-[11px]"
                                        style={{ borderColor: tint(m.color, t.info.can ? 70 : 30), backgroundColor: tint(m.color, t.info.can ? 22 : 6), color: m.color }}
                                    >
                                        <span className="uppercase tracking-wider">Buy</span>
                                        <span style={{ color: t.info.can ? "var(--mc-yellow)" : undefined }}>{F(t.info.cost)}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {MINIONS.map((m, i) => {
                if (!visible(i)) {
                    return i === firstHidden ? <Teaser key={m.id} text="More minions appear as you grow" /> : null;
                }
                const owned = s.minions[i];
                const info = buyInfo(s, d, i);
                const rank = rankOf(i);
                const mm = milestoneMult(owned);
                const nextMs = MILESTONES.find((x) => x > owned);
                const each = d.minionCps[i] / Math.max(1, owned);
                const items = s.mcol[i] || 0;
                const tier = colTier(items);
                const isOpen = !!open[i];
                const rate = owned * d.colSpeed[i];
                const rk = rank >= 0 ? RANKS[rank] : null;
                const next = MINIONS[i + 1]?.name;

                return (
                    <div
                        key={m.id}
                        className={`relative rounded-xl border ${rk ? "mt-3" : ""}`}
                        style={{
                            ["--c" as string]: rk?.color ?? m.color,
                            borderColor: rk ? tint(rk.color, 55) : info.can ? tint(m.color, 50) : "rgba(255,255,255,0.1)",
                            backgroundImage: rk ? `linear-gradient(120deg, ${tint(rk.color, 9)}, transparent 55%)` : undefined,
                            boxShadow: rk ? `0 0 18px -8px ${rk.color}` : info.can ? `0 0 14px -8px ${m.color}` : undefined,
                        }}
                    >
                        {rk && (
                            <span className="fi-afford absolute -top-2.5 left-3 z-[1] overflow-hidden rounded-full px-2 py-px font-minecraft text-[9px] uppercase tracking-wider text-black" style={{ backgroundColor: rk.color }}>
                                <span className="fi-shine pointer-events-none absolute inset-0" aria-hidden="true" />
                                <span className="relative">{rk.label}</span>
                            </span>
                        )}

                        <div className="flex flex-col items-stretch gap-2 p-2.5 sm:flex-row">
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-0.5 text-left transition-colors hover:bg-white/5"
                            >
                                {/* Count plate */}
                                <span
                                    className="relative grid size-14 shrink-0 place-items-center rounded-xl"
                                    style={{ color: m.color, backgroundColor: tint(m.color, 14), boxShadow: `inset 0 0 0 1px ${tint(m.color, 40)}${mm > 1 ? `, 0 0 14px -4px ${m.color}` : ""}` }}
                                >
                                    <span className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden rounded-xl leading-none opacity-30" style={{ fontSize: "2.3rem", textShadow: `0 0 14px ${m.color}` }}><McSymbol name={m.symbol} /></span>
                                    <span className="relative z-[1] mt-1.5 font-minecraft font-bold text-xl leading-none text-white" style={{ textShadow: `0 2px 0 #000, 0 0 10px ${m.color}` }}>{owned.toLocaleString()}</span>
                                    <span className="absolute inset-x-0 bottom-0.5 z-[1] text-center font-minecraft text-[8px] uppercase tracking-widest opacity-80" style={{ textShadow: "0 1px 0 #000" }}>owned</span>
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="truncate font-minecraft font-bold text-sm" style={{ color: lift(m.color) }}>
                                            {m.name.replace(" Minion", "")}<span className="hidden sm:inline"> Minion</span>
                                        </span>
                                        {mm > 1 && (
                                            <span className="hidden shrink-0 sm:inline rounded-full px-1.5 font-minecraft text-[10px] text-black" style={{ backgroundColor: m.color }}>x{mm}</span>
                                        )}
                                        <span
                                            className="ml-auto flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px"
                                            title={`${COL_ITEM[i]} collection tier ${tier}/${COL_AT.length}`}
                                            style={{ borderColor: tint(m.color, tier > 0 ? 55 : 20), backgroundColor: tint(m.color, tier > 0 ? 14 : 4), color: tier > 0 ? m.color : "var(--muted-foreground)" }}
                                        >
                                            <span className="font-minecraft text-[9px] leading-none">{tier >= COL_AT.length ? "MAX" : `T${tier}`}</span>
                                            <span className="flex gap-0.5">
                                                {COL_AT.map((_, k) => (
                                                    <span key={k} className="size-1.5 rounded-full" style={{ backgroundColor: k < tier ? m.color : "rgba(255,255,255,0.18)", boxShadow: k < tier ? `0 0 5px ${m.color}` : undefined }} />
                                                ))}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="block truncate font-rubik text-[11px] text-muted-foreground">
                                        {F(each)}/s each{owned > 0 ? `  ·  ${F(d.minionCps[i])}/s total` : ""}
                                    </span>
                                    <span className="mt-1 block">
                                        <SegTrack at={MILESTONES} value={owned} color={m.color} h={4} labels={MILESTONES.map((x) => String(x))} />
                                    </span>
                                    <span className="block font-rubik text-[10px] text-muted-foreground">
                                        {nextMs ? `${nextMs - owned} more for x${mm * 2}` : "All milestones reached"}
                                    </span>
                                </span>
                                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>

                            <button
                                type="button"
                                disabled={!info.can}
                                onClick={() => act(() => buyMinion(s, i), s.buy === 1 ? undefined : "bulk")}
                                className="flex shrink-0 flex-row items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-center transition-colors sm:min-w-[92px] sm:flex-col sm:justify-center sm:px-2 sm:py-0 enabled:hover:brightness-125 enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                    color: m.color,
                                    borderColor: info.can ? tint(m.color, 75) : "rgba(255,255,255,0.12)",
                                    backgroundColor: info.can ? tint(m.color, 20) : "rgba(255,255,255,0.03)",
                                }}
                            >
                                <span className="font-minecraft font-bold text-[11px] uppercase tracking-wider">Buy x{info.n}</span>
                                <span className="font-minecraft font-bold text-sm" style={{ color: info.can ? "var(--mc-yellow)" : undefined }}>{F(info.cost)}</span>
                                <span className="font-rubik text-[10px] text-muted-foreground">+{F(info.gain)}/s</span>
                            </button>
                        </div>

                        {/* Collection + upgrades */}
                        <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                            <div className="overflow-hidden">
                                {isOpen && <div className="space-y-3 border-t border-white/10 p-3">
                                    <div>
                                        <div className="mb-1 flex items-baseline justify-between gap-2">
                                            <span className="font-minecraft font-bold text-xs uppercase tracking-widest" style={{ color: m.color }}>Statistics</span>
                                            <span className="font-rubik text-[10px] text-muted-foreground">
                                                {pctOf(d.minionCps[i], d.cps)} of minion income
                                            </span>
                                        </div>
                                        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                            <div className="h-full rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${clamp01(d.cps > 0 ? d.minionCps[i] / d.cps : 0) * 100}%`, backgroundColor: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                                            {[
                                                ["Income", `${F(d.minionCps[i])}/s`],
                                                ["Share of total", pctOf(d.minionCps[i], income(d))],
                                                ["Per minion", `${F(each)}/s`],
                                                ["Base rate", `${F(m.cps)}/s`],
                                                ["Total multiplier", `x${F(mm * d.mult[i])}`],
                                                ["Milestones", `x${mm}`],
                                                ["Upgrades", `x${F(d.upOwn[i])}`],
                                                ["Next buy adds", owned > 0 ? `+${pctOf(info.gain, d.minionCps[i])}` : `+${F(info.gain)}/s`],
                                                ["Pays back in", fmtEta(info.payback)],
                                            ].map(([k, v]) => (
                                                <div key={k} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                                                    <div className="font-rubik text-[9px] uppercase tracking-wider text-muted-foreground">{k}</div>
                                                    <div className="truncate font-minecraft font-bold text-xs" style={{ color: m.color }}>{v}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-baseline justify-between gap-2">
                                            <span className="font-minecraft font-bold text-xs uppercase tracking-widest" style={{ color: m.color }}>{COL_ITEM[i]} Collection</span>
                                            <span className="font-rubik text-[10px] text-muted-foreground">
                                                Tier {tier}/{COL_AT.length}  ·  {F(items)} collected
                                            </span>
                                        </div>
                                        <SegTrack at={COL_AT} value={items} color={m.color} h={8} labels={COL_AT.map((x) => F(x))} />
                                        <div className="mt-1 font-rubik text-[10px] text-muted-foreground">
                                            {tier >= COL_AT.length
                                                ? "Collection complete. It resets on rebirth."
                                                : rate > 0
                                                  ? `Next tier in ${fmtEta((COL_AT[tier] - items) / rate)}  ·  ${F(rate)}/s`
                                                  : "Buy this minion to start collecting."}
                                            {d.colSpeed[i] > 1 && rate > 0 ? `  ·  speed x${d.colSpeed[i].toFixed(2).replace(/\.?0+$/, "")}` : ""}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        {MINION_COL[i].map((r, k) => {
                                            const got = tier > k;
                                            const isNext = tier === k;
                                            return (
                                                <div
                                                    key={r.name}
                                                    className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 ${got ? "fi-pop" : ""}`}
                                                    style={{
                                                        borderColor: got ? tint(m.color, 50) : isNext ? tint(m.color, 30) : "rgba(255,255,255,0.08)",
                                                        backgroundColor: got ? tint(m.color, 10) : undefined,
                                                        opacity: got || isNext ? 1 : 0.5,
                                                    }}
                                                >
                                                    <span
                                                        className="grid size-6 shrink-0 place-items-center rounded-md font-minecraft font-bold text-[11px]"
                                                        style={{ color: got ? "#000" : m.color, backgroundColor: got ? m.color : tint(m.color, 14), boxShadow: got ? `0 0 10px ${tint(m.color, 60)}` : undefined }}
                                                    >
                                                        {got ? <Check className="size-3.5" /> : k + 1}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-baseline gap-2">
                                                            <span className="truncate font-minecraft font-bold text-xs" style={{ color: got ? m.color : undefined }}>{r.name}</span>
                                                            <span className="shrink-0 font-rubik text-[10px] text-muted-foreground">{F(COL_AT[k])} {COL_ITEM[i]}</span>
                                                        </span>
                                                        <span className="block font-rubik text-[11px] text-muted-foreground">{colRewardText(r, m.name, next)}</span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div>
                                        <div className="mb-1 font-minecraft font-bold text-xs uppercase tracking-widest text-muted-foreground">Minion upgrades</div>
                                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                                            {MINION_UPS_BY[i].map((u) => {
                                                const have = !!s.ups[u.id];
                                                const avail = upAvailable(s, u);
                                                const cost = upCost(s, u.id, 0);
                                                const can = !have && avail && s.shards >= cost;
                                                return (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        disabled={!can}
                                                        onClick={() => act(() => buyUpgrade(s, u.id))}
                                                        className={`rounded-lg border p-2 text-left transition-transform enabled:hover:-translate-y-px disabled:cursor-not-allowed ${can ? "fi-afford" : ""}`}
                                                        style={{
                                                            ["--c" as string]: m.color,
                                                            borderColor: have ? tint("var(--mc-yellow)", 55) : can ? m.color : "rgba(255,255,255,0.1)",
                                                            backgroundColor: have ? tint(m.color, 8) : can ? tint(m.color, 14) : undefined,
                                                            opacity: have || can ? 1 : 0.55,
                                                        }}
                                                    >
                                                        <span className="flex items-center gap-1 font-minecraft font-bold text-xs" style={{ color: m.color }}>
                                                            <McSymbol name={u.symbol} /> <span className="truncate">{u.name}</span>
                                                        </span>
                                                        <span className="mt-0.5 block font-rubik text-[10px] leading-snug text-muted-foreground">{u.desc}</span>
                                                        <span className="mt-1 flex items-center gap-1 font-minecraft font-bold text-[11px]" style={{ color: have ? "var(--mc-green)" : avail ? "var(--mc-yellow)" : "var(--muted-foreground)" }}>
                                                            {have ? (
                                                                <><Check className="size-3" /> Owned</>
                                                            ) : avail ? (
                                                                F(cost)
                                                            ) : (
                                                                <><Lock className="size-3" /> Own {u.req}</>
                                                            )}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
}

"use client";

import { useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { rebirthCost } from "@/lib/fractured-idle/data";
import {
    fmtEta,
    income,
    milestoneTokens,
    rebirth,
    rebirthBase,
    rebirthCap,
    rebirthMultAt,
    rebirthPlan,
    startShards,
    tokenMult,
    tokensAt,
} from "@/lib/fractured-idle/engine";
import { AutoPanel, PrestigeShop } from "./prestige-shop";
import { SectionTitle, tint, type Ctx } from "./ui";

// Rebirth view. The path previews the next max(5, stack cap) rebirth levels
// (15 at full Rebirth Stack). Nodes glow when you can take them right now,
// clicking a ready node chooses how many levels to take, and milestone levels
// (5, 10, 15...) pay bonus tokens. "Scale" shows the same levels as log bars.

const MIN_PREVIEW = 5;
const NODE_COLORS = [
    "var(--mc-aqua)",
    "var(--mc-green)",
    "var(--mc-yellow)",
    "var(--mc-gold)",
    "var(--mc-red)",
    "var(--mc-light-purple)",
];

export function RebirthTab({ s, d, F, act, say }: Ctx) {
    const [view, setView] = useState<"timeline" | "scale">("timeline");
    const [sel, setSel] = useState(1);
    const [take, setTake] = useState<number | null>(null);
    const [confirm, setConfirm] = useState(false);

    const cap = rebirthCap(s);
    const plan = rebirthPlan(s);
    const takeN = Math.max(0, Math.min(take ?? plan.count, plan.count));
    const chosen = rebirthPlan(s, takeN || undefined);
    const rate = income(d);
    const total = Math.max(MIN_PREVIEW, cap);

    const nodes = Array.from({ length: total }, (_, k) => {
        const level = s.rebirths + k + 1;
        const cost = rebirthCost(level - 1, s.asc);
        const ready = s.shards >= cost;
        return {
            k: k + 1,
            level,
            cost,
            ready,
            inStack: k + 1 <= cap,
            color: NODE_COLORS[(k + 1) % NODE_COLORS.length],
            progress: Math.min(1, Math.log10(Math.max(1, s.shards)) / Math.log10(cost)),
            eta: ready ? 0 : rate > 0 ? (cost - s.shards) / rate : Infinity,
            mult: rebirthMultAt(s, level),
            tokens: tokensAt(s, ready ? s.shards : cost, level),
            bonus: milestoneTokens(level),
        };
    });
    const cur = nodes.find((n) => n.k === sel) ?? nodes[0];
    const afterMult = rebirthMultAt(s, s.rebirths + chosen.count);
    const maxLog = Math.log10(nodes[nodes.length - 1].cost);
    const pickNode = (n: (typeof nodes)[number]) => {
        setSel(n.k);
        if (n.ready && n.inStack) setTake(n.k);
    };

    return (
        <>
            {/* Take rebirth */}
            <div className="rounded-xl border p-4" style={{ borderColor: tint("var(--mc-light-purple)", 45), backgroundColor: tint("var(--mc-light-purple)", 8) }}>
                <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-minecraft font-bold text-sm" style={{ color: "var(--mc-light-purple)" }}>
                    <span><McSymbol name="portal" /> {plan.count > 0 ? `Rebirth x${takeN} of ${plan.count} ready` : `Rebirth ${s.rebirths + 1}`}</span>
                    <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint("var(--mc-light-purple)", 50) }}>
                        Stack {cap}/15
                    </span>
                    <span className="font-rubik text-xs text-muted-foreground">
                        Tokens <b style={{ color: "var(--mc-yellow)" }}>{s.tokens}</b>
                        {startShards(s) > 0 && `  ·  start with ${F(startShards(s))} shards`}
                    </span>
                </div>
                <p className="font-rubik text-xs text-muted-foreground">
                    Resets shards, minions and upgrades. Keeps islands, skills, trophies and token upgrades. Every rebirth multiplies everything by x{rebirthBase(s).toFixed(2)}
                    {takeN > 0 && <> (x{F(d.rMult)} <McSymbol name="arrow" /> <b style={{ color: "var(--mc-green)" }}>x{F(afterMult)}</b>)</>}. Tokens are x{tokenMult(s).toFixed(2)}.
                </p>
                {cap < 15 && (
                    <p className="mt-1 font-rubik text-[11px] text-muted-foreground">
                        Rebirth Stack (token upgrade below) lets you take more levels at once, up to 15.
                    </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {confirm ? (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    act(() => rebirth(s, takeN));
                                    setConfirm(false);
                                    setTake(null);
                                    setSel(1);
                                    say(`Reborn x${takeN}! +${chosen.tokens} tokens. Spend them below.`);
                                }}
                                className="rounded-lg px-4 py-2 font-minecraft font-bold text-xs text-black"
                                style={{ backgroundColor: "var(--mc-light-purple)" }}
                            >
                                Confirm: x{takeN} for +{chosen.tokens} tokens
                            </button>
                            <button type="button" onClick={() => setConfirm(false)} className="font-rubik text-xs text-muted-foreground underline">Cancel</button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                disabled={plan.count < 1}
                                onClick={() => setConfirm(true)}
                                className={`rounded-lg px-4 py-2 font-minecraft font-bold text-xs text-black transition-opacity disabled:opacity-40 ${plan.count > 0 ? "fi-afford" : ""}`}
                                style={{ backgroundColor: "var(--mc-light-purple)", ["--c" as string]: "var(--mc-light-purple)" }}
                            >
                                {plan.count > 0 ? `Rebirth x${takeN} for +${chosen.tokens} tokens` : `Need ${F(nodes[0].cost)} shards`}
                            </button>
                            {plan.count > 1 && (
                                <div className="flex overflow-hidden rounded-lg border border-white/15 font-rubik text-[11px]">
                                    {[
                                        { label: "1", n: 1 },
                                        { label: "Half", n: Math.ceil(plan.count / 2) },
                                        { label: "Max", n: plan.count },
                                    ].map((o) => (
                                        <button key={o.label} type="button" onClick={() => setTake(o.n)} className="px-2.5 py-1.5" style={takeN === o.n ? { backgroundColor: tint("var(--mc-light-purple)", 25), color: "var(--mc-light-purple)" } : { color: "var(--muted-foreground)" }}>
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* View switch */}
            <div className="flex items-center justify-between">
                <SectionTitle color="var(--mc-light-purple)">Rebirth path · next {total}</SectionTitle>
                <div className="flex overflow-hidden rounded-lg border border-white/15 font-rubik text-[11px]">
                    {(["timeline", "scale"] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setView(v)} className="px-2.5 py-1 capitalize" style={view === v ? { backgroundColor: tint("var(--mc-light-purple)", 22), color: "var(--mc-light-purple)" } : { color: "var(--muted-foreground)" }}>
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {view === "timeline" ? (
                <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
                    <div className="flex min-w-max items-center px-2 pt-6">
                        {/* You are here */}
                        <div className="flex w-20 flex-col items-center gap-1">
                            <div className="grid size-12 place-items-center rounded-full border-2 font-minecraft font-bold text-sm" style={{ borderColor: "var(--mc-yellow)", color: "var(--mc-yellow)", backgroundColor: tint("var(--mc-yellow)", 14), boxShadow: `0 0 18px -2px ${tint("var(--mc-yellow)", 60)}` }}>
                                {s.rebirths}
                            </div>
                            <div className="font-rubik text-[10px] text-muted-foreground">You are here</div>
                            <div className="font-minecraft font-bold text-[11px]" style={{ color: "var(--mc-yellow)" }}>{s.tokens} tokens</div>
                        </div>
                        {nodes.map((n) => {
                            const size = Math.min(56, 32 + n.k * 2);
                            const active = sel === n.k;
                            const taking = n.ready && n.inStack && n.k <= takeN;
                            return (
                                <div key={n.k} className="flex items-center">
                                    <div className="h-1 w-6 overflow-hidden rounded-full bg-white/10 sm:w-10">
                                        <div className="h-full rounded-full" style={{ width: `${n.progress * 100}%`, backgroundColor: n.color, boxShadow: `0 0 8px ${n.color}` }} />
                                    </div>
                                    <button
                                        type="button"
                                        onPointerEnter={(e) => e.pointerType === "mouse" && setSel(n.k)}
                                        onFocus={() => setSel(n.k)}
                                        onClick={() => pickNode(n)}
                                        className="flex w-[72px] flex-col items-center gap-1 outline-none"
                                        aria-label={`Rebirth ${n.level}`}
                                    >
                                        <span
                                            className={`relative grid place-items-center rounded-full border-2 font-minecraft transition-transform ${n.ready && n.inStack ? "fi-afford" : ""} ${active ? "scale-110" : ""}`}
                                            style={{
                                                ["--c" as string]: n.color,
                                                width: size,
                                                height: size,
                                                fontSize: 11 + Math.min(4, n.k / 3),
                                                color: n.color,
                                                borderColor: n.ready || active ? n.color : tint(n.color, 40),
                                                backgroundColor: tint(n.color, taking ? 38 : n.ready ? 22 : 8),
                                                opacity: n.ready || active ? 1 : 0.7,
                                                outline: taking ? `2px solid ${n.color}` : undefined,
                                                outlineOffset: 3,
                                            }}
                                        >
                                            {n.ready ? <McSymbol name="check" /> : n.level}
                                        </span>
                                        <span className="font-rubik text-[10px] text-muted-foreground">#{n.level}</span>
                                        <span className="font-minecraft font-bold text-[11px]" style={{ color: n.color }}>{F(n.cost)}</span>
                                        {n.bonus > 0 && (
                                            <span className="rounded-full border px-1.5 font-minecraft text-[9px]" style={{ color: "var(--mc-yellow)", borderColor: tint("var(--mc-yellow)", 55) }}>
                                                <McSymbol name="pristine" /> +{n.bonus}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {nodes.map((n) => (
                        <button
                            key={n.k}
                            type="button"
                            onPointerEnter={(e) => e.pointerType === "mouse" && setSel(n.k)}
                            onFocus={() => setSel(n.k)}
                            onClick={() => pickNode(n)}
                            className="block w-full text-left"
                        >
                            <div className="mb-0.5 flex justify-between font-rubik text-[10px] text-muted-foreground">
                                <span style={{ color: n.color }}>
                                    Rebirth #{n.level}
                                    {n.bonus > 0 && <span style={{ color: "var(--mc-yellow)" }}> · milestone +{n.bonus}</span>}
                                </span>
                                <span>{F(n.cost)} · {n.ready ? "ready" : fmtEta(n.eta)}</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-white/10" style={{ width: `${(Math.log10(n.cost) / maxLog) * 100}%`, boxShadow: sel === n.k ? `0 0 0 1px ${n.color}` : undefined }}>
                                <div className="h-full rounded-full" style={{ width: `${n.progress * 100}%`, backgroundColor: n.color }} />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Hover / selected detail */}
            <div className="rounded-xl border p-3" style={{ borderColor: tint(cur.color, 50), backgroundColor: tint(cur.color, 7) }}>
                <div className="flex flex-wrap items-center gap-2 font-minecraft font-bold text-sm" style={{ color: cur.color }}>
                    Rebirth #{cur.level}
                    <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(cur.color, 50) }}>
                        {cur.ready ? "Ready now" : `In ${fmtEta(cur.eta)}`}
                    </span>
                    {!cur.inStack && (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 font-rubik text-[10px] text-muted-foreground">Needs a bigger Rebirth Stack</span>
                    )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-rubik text-xs sm:grid-cols-3">
                    <Fact label="Shards needed" value={F(cur.cost)} />
                    <Fact label="You have" value={`${F(s.shards)} (${Math.min(100, (s.shards / cur.cost) * 100).toFixed(s.shards / cur.cost < 0.1 ? 2 : 0)}%)`} />
                    <Fact label="Missing" value={cur.ready ? "nothing" : F(cur.cost - s.shards)} />
                    <Fact label="Multiplier then" value={`x${F(cur.mult)}`} />
                    <Fact label="Gain vs now" value={`x${F(cur.mult / d.rMult)}`} />
                    <Fact label={cur.ready ? "Tokens if taken" : "Tokens (at least)"} value={`${cur.tokens}${cur.bonus ? ` (incl. +${cur.bonus} milestone)` : ""}`} />
                </div>
                {!cur.ready && rate > 0 && (
                    <p className="mt-2 font-rubik text-[10px] text-muted-foreground">
                        ETA uses your current {F(rate)}/s, so it shrinks as you buy more.
                    </p>
                )}
                {cur.ready && cur.inStack && <p className="mt-2 font-rubik text-[10px] text-muted-foreground">Click this node to take rebirths up to here.</p>}
            </div>

            <SectionTitle color="var(--mc-yellow)">Token upgrades</SectionTitle>
            <PrestigeShop cur="tokens" s={s} F={F} act={act} say={say} />
            <AutoPanel s={s} act={act} />
        </>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="font-minecraft font-bold text-[13px]">{value}</div>
        </div>
    );
}

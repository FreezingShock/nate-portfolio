"use client";

import { useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { ASC_BASE, ASC_COST, ASC_UPS } from "@/lib/fractured-idle/data";
import { ascMult, ascPlan, ascend, aupCost } from "@/lib/fractured-idle/engine";
import { AutoPanel, PrestigeShop } from "./prestige-shop";
import { SectionTitle, lift, tint, type Ctx } from "./ui";

// Ascension: the second prestige layer. It resets rebirths, tokens and token
// upgrades (plus everything a rebirth resets) and pays Gems for
// upgrades that never reset.

const C = "var(--mc-aqua)";
const G = "var(--mc-gold)";

const KEEPS = ["Islands and lifetime shards", "Skills", "Trophies", "Pets and eggs", "Ascension upgrades"];
const LOSES = ["Shards, minions and collections", "Upgrades", "Rebirths and rebirth multiplier", "Tokens and token upgrades"];

export function AscensionTab({ s, d, F, act, say }: Ctx) {
    const [confirm, setConfirm] = useState(false);
    const plan = ascPlan(s);
    const multNow = ascMult(s);
    const multAfter = Math.pow(ASC_BASE, s.asc + 1) * (1 + 0.25 * (s.aups.cosmic || 0));
    const frac = Math.min(1, s.rebirths / plan.req);

    return (
        <>
            <div className="relative overflow-hidden rounded-xl border p-4" style={{ borderColor: tint(C, 55), backgroundImage: `linear-gradient(130deg, ${tint(C, 14)}, ${tint(G, 8)} 70%)` }}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-minecraft font-bold text-sm" style={{ color: lift(C) }}>
                    <span><McSymbol name="comet" /> Ascension {s.asc}</span>
                    <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(C, 55) }}>x{F(multNow)} all shards</span>
                    <span className="font-rubik text-xs text-muted-foreground">
                        Gems <b style={{ color: G }}>{s.ap}</b>
                    </span>
                </div>
                <p className="mt-1 font-rubik text-xs text-muted-foreground">
                    Ascend to trade your rebirths for Gems and a x{ASC_BASE} boost to everything. Each ascension makes rebirths x{ASC_COST} pricier, so the climb is never skipped, only easier.
                </p>

                <div className="mt-3">
                    <div className="mb-1 flex justify-between font-rubik text-[10px] text-muted-foreground">
                        <span>Rebirth {s.rebirths} / {plan.req} needed</span>
                        <span>{plan.can ? `Ready: +${plan.ap} gems` : `${plan.req - s.rebirths} more rebirths`}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full transition-[width] duration-300 ${plan.can ? "fi-pulse" : ""}`} style={{ width: `${frac * 100}%`, backgroundColor: C, boxShadow: `0 0 10px ${C}` }} />
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-rubik text-xs sm:grid-cols-4">
                    <Fact label="Gems if ascended now" value={plan.can ? `+${plan.ap}` : "not yet"} />
                    <Fact label="Multiplier after" value={`x${F(multAfter)}`} />
                    <Fact label="Rebirth price after" value={`x${ASC_COST} each`} />
                    <Fact label="Total gems earned" value={String(s.ap + Object.entries(s.aups).reduce((a, [id, l]) => a + spent(id, l), 0))} />
                </div>
                <p className="mt-2 font-rubik text-[10px] text-muted-foreground">
                    Going deeper before you ascend pays more gems: every 2 rebirths past 10 adds 1, plus 1 per ascension you already have.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Box title="Keeps" color="var(--mc-green)" items={KEEPS} />
                    <Box title="Resets" color="var(--mc-red)" items={LOSES} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {confirm ? (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    act(() => ascend(s));
                                    setConfirm(false);
                                    say(`Ascended! +${plan.ap} gems. Spend them below.`);
                                }}
                                className="rounded-lg px-4 py-2 font-minecraft font-bold text-xs text-black"
                                style={{ backgroundColor: C }}
                            >
                                Confirm: ascend for +{plan.ap} gems
                            </button>
                            <button type="button" onClick={() => setConfirm(false)} className="font-rubik text-xs text-muted-foreground underline">Cancel</button>
                        </>
                    ) : (
                        <button
                            type="button"
                            disabled={!plan.can}
                            onClick={() => setConfirm(true)}
                            className={`rounded-lg px-4 py-2 font-minecraft font-bold text-xs text-black transition-opacity disabled:opacity-40 ${plan.can ? "fi-afford" : ""}`}
                            style={{ backgroundColor: C, ["--c" as string]: C }}
                        >
                            {plan.can ? `Ascend for +${plan.ap} gems` : `Reach rebirth ${plan.req}`}
                        </button>
                    )}
                </div>
            </div>

            <SectionTitle color={G}>Gem upgrades</SectionTitle>
            <PrestigeShop cur="gems" s={s} F={F} act={act} say={say} />
            <AutoPanel s={s} act={act} />
            <p className="font-rubik text-[10px] text-muted-foreground">Current all-shards multiplier from other sources: x{F(d.all / multNow)}.</p>
        </>
    );
}

/** Gems spent on upgrade `id` up to level `lvl`. */
function spent(id: string, lvl: number) {
    const u = ASC_UPS.find((x) => x.id === id);
    if (!u) return 0;
    let t = 0;
    for (let i = 0; i < lvl; i++) t += aupCost(u, i);
    return t;
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="font-minecraft font-bold text-[13px]">{value}</div>
        </div>
    );
}

function Box({ title, color, items }: { title: string; color: string; items: string[] }) {
    return (
        <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: tint(color, 35), backgroundColor: tint(color, 6) }}>
            <div className="mb-0.5 font-minecraft font-bold text-[11px] uppercase tracking-widest" style={{ color }}>{title}</div>
            <ul className="space-y-0.5 font-rubik text-[11px] text-muted-foreground">
                {items.map((i) => <li key={i}>· {i}</li>)}
            </ul>
        </div>
    );
}

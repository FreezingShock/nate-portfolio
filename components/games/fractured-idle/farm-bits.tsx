"use client";

import type { CSSProperties } from "react";
import { Lock } from "lucide-react";
import { fmtTime } from "@/lib/fractured-idle/engine";
import { ISLAND_BY_ID } from "@/lib/fractured-idle/islands";
import {
    COL_AT,
    DIM_LABEL,
    FARM_UPS,
    KIND_INFO,
    buyFarmUp,
    canBuyUp,
    colTierOf,
    cropIcon,
    cropIslands,
    cropUnits,
    cropShards,
    plotScale,
    cropXp,
    enchNeed,
    farmCtx,
    farmLevel,
    growSpeed,
    have,
    resInfo,
    upCost,
    upLevel,
    type Cost,
    type CropDef,
    type FarmUpDef,
    type ResId,
} from "@/lib/fractured-idle/farm";
import { TipCard } from "./tooltip";
import type { Ctx } from "./ui";
import { NeedTile, iconOf, type Need } from "./skill-kit";
import { colSteps } from "@/lib/fractured-idle/milestones";
import { KIND_ICON_MAP } from "./farm-icons";

// Small pieces the farm's tabs share.

export const C = "#9be04a";

export const fmtPct = (n: number) => `${+(n * 100).toFixed(1)}%`;
export const amt = (F: (n: number) => string, n: number) => (n >= 1000 ? F(Math.floor(n)) : n >= 100 ? String(Math.floor(n)) : String(+n.toFixed(n < 10 ? 1 : 0)));
export const col = (c: string) => ({ ["--oc" as string]: c }) as CSSProperties;

export function ResChip({ s, id, n }: { s: Ctx["s"]; id: ResId; n: number }) {
    const r = resInfo(id);
    return (
        <span className="fi-mn-chip small" data-ok={have(s, id) >= n} style={col(r.color)}>
            <i />
            {n} {r.name}
        </span>
    );
}
/** One cost line as an icon tile with what you have and what it needs. */
export const farmNeed = (s: Ctx["s"], id: ResId, n: number): Need => {
    const r = resInfo(id);
    const icon = id === "any" ? "intelligence" : id.startsWith("k_") ? KIND_ICON_MAP[id.slice(2) as keyof typeof KIND_ICON_MAP] : id.startsWith("e_") ? cropIcon[id.slice(2) as keyof typeof cropIcon] : id in cropIcon ? cropIcon[id as keyof typeof cropIcon] : iconOf(id, "forge");
    return { id, name: r.name, color: r.color, icon, have: have(s, id), need: n };
};
export const farmNeeds = (s: Ctx["s"], cost: Cost): Need[] => (Object.entries(cost) as [ResId, number][]).map(([id, n]) => farmNeed(s, id, n));
export function CostRow({ s, cost }: { s: Ctx["s"]; cost: Cost }) {
    return (
        <span className="fi-cb-needs">
            {farmNeeds(s, cost).map((n) => (
                <NeedTile key={n.id} n={n} />
            ))}
        </span>
    );
}

export function upEffect(u: FarmUpDef, l: number): string {
    switch (u.id) {
        case "till": return `+${l * 6}% hoe power`;
        case "fert": return `+${l * 8}% crops`;
        case "lucky": return `${+(l * 1.5).toFixed(1)}% triple harvest`;
        case "water": return `+${l * 8}% watering`;
        case "seeker": return `+${l * 10}% pods`;
        case "prosp": return l ? `rarer crops, level ${l}` : "off";
        case "bumper": return `${6 + l * 2} harvests, +${l * 10}% yield`;
        case "scholar": return `+${l * 6}% Farming XP`;
        case "deep": return `+${l}% all shards`;
        case "ancient": return `+${+(l * 1.5).toFixed(1)}% shards, +${l * 2}% tokens`;
        case "reaper": return l ? "on" : "off";
        case "sprinkler": return `+${l * 5}% growth speed`;
        case "compost": return `+${l * 5}% auto crops`;
        case "sifter": return `+${l * 12}% auto pods`;
        case "cracker": return l ? `opens one every ${Math.round(36 / l)}s` : "off";
        case "plots": return `+${l} plot${l === 1 ? "" : "s"} in every garden`;
        case "field": return `field bonus cap +${30 + l * 4}%`;
        case "oven": return `${1 + l} ovens`;
        case "stoker": return `+${l * 8}% craft speed`;
        case "ladle": return l ? "on" : "off";
        case "tend": return `+${l * 10}% tap growth`;
        case "rhythm": return `${4 + l * 0.5}s window, streak cap +${50 + l * 5}%`;
        case "golden": return `${1 + l}% golden crops`;
        case "table": return `${160 - l * 6} crops per Enchanted`;
        case "market": return `+${l * 6}% sale price`;
        default: return `${l * 8}% double batches`;
    }
}

export function UpgradeList({ s, cat, render }: { s: Ctx["s"]; cat: FarmUpDef["cat"]; render: () => void }) {
    const lvl = farmLevel(s);
    return (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {FARM_UPS.filter((u) => u.cat === cat).map((u) => {
                const l = upLevel(s, u.id);
                const locked = lvl < u.need;
                const maxed = l >= u.max;
                const c = canBuyUp(s, u);
                const first = Object.keys(u.cost)[0] as ResId;
                return (
                    <div key={u.id} className="fi-mn-up" data-locked={locked} data-ready={c.ok} style={{ ["--c" as string]: resInfo(first).color } as CSSProperties}>
                        <div className="fi-mn-up-h">
                            <b>{u.name}</b>
                            <span>{l}/{u.max}</span>
                        </div>
                        <div className="fi-mn-up-d">{locked ? <><Lock className="mr-1 inline size-3" />Opens at Farming {u.need}</> : u.desc}</div>
                        <div className="fi-mn-up-e">
                            {l > 0 ? upEffect(u, l) : "no bonus yet"} <em>▸</em> <b>{maxed ? "max" : upEffect(u, l + 1)}</b>
                        </div>
                        <div className="fi-mn-up-f">
                            {maxed ? <span className="fi-mn-maxed">Maxed</span> : <CostRow s={s} cost={upCost(s, u)} />}
                            <button
                                type="button"
                                disabled={!c.ok}
                                onClick={() => {
                                    if (buyFarmUp(s, u.id)) render();
                                }}
                                className="fi-mn-buy small"
                            >
                                {u.max === 1 ? "Build" : "Upgrade"}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function CropTip({ s, c, p, F, d }: { s: Ctx["s"]; c: CropDef; p: number; F: (n: number) => string; d?: Ctx["d"] }) {
    const tier = colTierOf(s.farm.grown[c.id] || 0);
    const ctx = d ? farmCtx(d) : null;
    const secs = c.time / growSpeed(s, c);
    const k = KIND_INFO[c.kind];
    return (
        <TipCard
            title={c.name}
            color={c.color}
            tag={c.need ? `Farming ${c.need}` : DIM_LABEL[c.dim].name}
            lines={farmLevel(s) < c.need ? [`Opens at Farming ${c.need}.`] : undefined}
            rows={[
                ["Kind", `${k.name} (${k.tool})`, k.color],
                ["Mixed planting", p > 0 ? fmtPct(p) : "choose it by hand / locked"],
                ["Grows in", fmtTime(secs)],
                ["Crops per harvest", F(cropUnits(s, c))],
                ...(ctx ? ([["Farming XP per harvest", F(cropXp(c) * ctx.xp)], ["Shards per harvest", F(cropShards(ctx, c) * plotScale(s))]] as [string, string][]) : []),
                ["Enchanted needs", `${enchNeed(s)} raw`],
                ["Collection", `tier ${tier}/${COL_AT.length}`, c.color],
            ]}
            notes={[{ text: `Collection pays +${fmtPct(0.4 * c.col[1])} ${c.colText} per tier (half rate after tier 5): ${fmtPct(0.4 * c.col[1] * colSteps(tier))} now`, color: c.color }, { text: `Mixed plantings on: ${cropIslands(c.id).map((id) => ISLAND_BY_ID[id]?.name ?? id).slice(0, 4).join(", ")}`, color: "var(--mc-aqua)" }]}
        />
    );
}

"use client";

import { fmtPct } from "@/lib/fractured-idle/format";
import {
    INGOTS,
    MINE_UPS,
    PART_BY_ID,
    PART_KIND_LABEL,
    PICK_BY_ID,
    RECIPES,
    RECIPE_BY_ID,
    buyMineUp,
    canBuyUp,
    canCraft,
    collectAll,
    collectJob,
    forgeSlots,
    forgeSpeed,
    isOnce,
    jobLeft,
    jobSeconds,
    jobsReady,
    maxBatch,
    mineLevel,
    ownsOutput,
    slotsFree,
    startCraft,
    toggleLoop,
    totalCost,
    upCost,
    upLevel,
    usedIn,
    type RecipeDef,
} from "@/lib/fractured-idle/mine";
import { sfx } from "@/lib/sound/sounds";
import { mineNeeds } from "./mine-bits";
import { CraftBoard, ItemIcon, Slots, iconOf, type CraftItem, type SlotView } from "./skill-kit";
import { SectionTitle, type Ctx } from "./ui";
import { Lock } from "lucide-react";
import type { CSSProperties } from "react";

// The Forge: furnaces on real timers, and a grid of everything you can make. Ingots feed pickaxes, drill parts
// and relics; the board shows what is ready, what is short and what is still locked.

type P = { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void };
const C = "#ff9a4d";
const GROUPS = [
    { id: "ingot", label: "Ingots" },
    { id: "part", label: "Drill parts" },
    { id: "pick", label: "Pickaxes" },
    { id: "item", label: "Consumables" },
    { id: "relic", label: "Relics" },
];

const iconFor = (r: RecipeDef) => (r.kind === "part" ? (PART_BY_ID[r.out].kind === "engine" ? "cog" : PART_BY_ID[r.out].kind === "head" ? "pick" : "atom") : r.kind === "pick" ? "pick" : r.kind === "relic" ? "key" : iconOf(r.id, "triangle"));

function toItem(s: Ctx["s"], r: RecipeDef): CraftItem {
    const lock = mineLevel(s) < r.need ? `Mining ${r.need}` : undefined;
    const once = isOnce(r);
    const p = r.kind === "part" ? PART_BY_ID[r.out] : null;
    return {
        id: r.id,
        name: r.name,
        desc: r.desc,
        color: r.color,
        icon: iconFor(r),
        group: r.kind,
        tag: p ? `${PART_KIND_LABEL[p.kind]}, tier ${p.tier}` : r.kind === "pick" ? `Pickaxe, tier ${PICK_BY_ID[r.out]?.tier}` : r.kind === "relic" ? "Relic" : undefined,
        lock,
        far: !!lock && r.need > mineLevel(s) + 12,
        owned: once && ownsOutput(s, r),
        stock: r.kind === "ingot" ? s.mine.ingots[r.out] || 0 : r.kind === "item" ? s.mine.items[r.out] || 0 : 0,
        inputs: mineNeeds(s, totalCost(s, r, 1)),
        time: jobSeconds(s, r, 1),
        once,
        maxBatch: maxBatch(s, r),
        blocked: slotsFree(s) <= 0 ? "Furnaces busy" : undefined,
        usedIn: r.kind === "ingot" ? usedIn(r.out).map((x) => x.name) : undefined,
        note: r.kind === "pick" ? PICK_BY_ID[r.out]?.traitText : undefined,
    };
}

export function Forge({ s, render, say }: P) {
    const m = s.mine;
    const now = Date.now();
    const slots = forgeSlots(s);
    const tongs = upLevel(s, "tongs") > 0;
    const ready = jobsReady(s, now);
    const live = RECIPES.map((r) => toItem(s, r));
    const views: SlotView[] = Array.from({ length: slots }, (_, i) => {
        const ji = m.jobs.findIndex((x) => x.slot === i);
        const j = ji >= 0 ? m.jobs[ji] : undefined;
        const r = j ? RECIPE_BY_ID[j.r] : undefined;
        return { slot: i, job: j && r ? { i: ji, name: r.name, color: r.color, icon: iconFor(r), n: j.n, left: jobLeft(j, now), total: jobSeconds(s, r, j.n), loop: j.loop } : undefined };
    });
    const doneText = (t: string) => {
        say(t);
        render();
    };
    const bag = INGOTS.filter((g) => (m.ingots[g.id] || 0) > 0);
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{slots}</b> {slots === 1 ? "furnace" : "furnaces"} · crafts finish <b>{fmtPct((forgeSpeed(s) - 1), 0)}</b> faster <span>and keep cooking while you are away</span>
                </div>
                <small>Pick something on the grid, press Forge, and come back. A finished craft waits in its furnace until you collect it.</small>
            </div>

            <Slots
                slots={views}
                color={C}
                noun="Furnace"
                loopOk={tongs}
                onCollect={(i) => {
                    const c = collectJob(s, i, Date.now());
                    if (c) {
                        sfx("collect");
                        doneText(c.text);
                    }
                }}
                onLoop={(slot) => {
                    toggleLoop(s, slot);
                    render();
                }}
            />
            {ready > 1 && (
                <button
                    type="button"
                    className="fi-cb-go slim"
                    style={{ alignSelf: "flex-start" }}
                    data-snd="off"
                    onClick={() => {
                        const got = collectAll(s, Date.now());
                        if (got.length) {
                            sfx("bulk");
                            doneText(`Collected ${got.length} crafts.`);
                        }
                    }}
                >
                    Collect all {ready}
                </button>
            )}

            <SectionTitle color={C}>In your bag</SectionTitle>
            <div className="fi-bag">
                {bag.map((g) => (
                    <span key={g.id} className="fi-bag-i" title={g.name}>
                        <ItemIcon icon={iconOf(g.id, "triangle")} color={g.color} n={m.ingots[g.id]} />
                        <em>{g.name}</em>
                    </span>
                ))}
                {Object.entries(m.items).filter(([, n]) => n > 0).map(([id, n]) => (
                    <span key={id} className="fi-bag-i" title={id}>
                        <ItemIcon icon={iconOf(id)} color={RECIPE_BY_ID[id]?.color ?? "#ffd23a"} n={n} />
                        <em>{RECIPE_BY_ID[id]?.name ?? id}</em>
                    </span>
                ))}
                {bag.length === 0 && Object.keys(m.items).length === 0 && <span className="fi-sk-hint">Nothing yet. Smelt copper first: it opens pickaxes and your first drill.</span>}
            </div>

            <SectionTitle color={C}>What can I make?</SectionTitle>
            <CraftBoard
                items={live}
                groups={GROUPS}
                color={C}
                verb="Forge"
                onCraft={(id, n) => {
                    const r = RECIPE_BY_ID[id];
                    if (r && canCraft(s, r, n).ok && startCraft(s, id, n)) {
                        sfx("buy");
                        say(`${n > 1 ? `${n}x ` : ""}${r.name} is in the furnace.`);
                        render();
                    }
                }}
            />

            <SectionTitle color="#ff9a4d">Forge upgrades</SectionTitle>
            <div className="fi-cb-grid" style={{ ["--k" as string]: C } as CSSProperties}>
                {MINE_UPS.map((u) => {
                    const l = upLevel(s, u.id);
                    const can = canBuyUp(s, u);
                    const locked = mineLevel(s) < u.need;
                    return (
                        <div key={u.id} className="fi-up" data-ready={can.ok} data-off={locked}>
                            <b>{u.name} <small>{l}/{u.max}</small></b>
                            <span>{locked ? <><Lock className="mr-1 inline size-3" />Mining {u.need}</> : u.desc}</span>
                            {l < u.max && !locked && (
                                <button type="button" className="fi-lv-btn" disabled={!can.ok} onClick={() => { if (buyMineUp(s, u.id)) { sfx("buy"); render(); } }}>
                                    Upgrade: {Object.entries(upCost(s, u)).map(([k, v]) => `${v} ${k}`).join(", ")}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export const FORGE_CSS = `
.fi-bag{display:flex;flex-wrap:wrap;gap:.55rem}
.fi-bag-i{display:flex;flex-direction:column;align-items:center;gap:.2rem;width:3.8rem}
.fi-bag-i em{font-style:normal;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.54rem;color:var(--muted-foreground)}
.fi-up{display:flex;flex-direction:column;gap:.25rem;padding:.55rem .65rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2)}
.fi-up[data-ready="true"]{border-color:color-mix(in oklch,var(--mc-green) 55%,transparent)}
.fi-up[data-off="true"]{opacity:.55}
.fi-up b{font-family:var(--font-minecraft,inherit);font-size:.78rem;color:#fff}
.fi-up b small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.fi-up span{font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-up .fi-lv-btn{font-size:.62rem;white-space:normal;text-align:left}
`;

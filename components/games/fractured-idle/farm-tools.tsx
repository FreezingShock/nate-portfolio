"use client";

import { useState, type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { sfx } from "@/lib/sound/sounds";
import {
    CROPS,
    HOES,
    HOE_CLICK,
    KINDS,
    KIND_INFO,
    RELICS,
    TOOL_FX,
    buyHoe,
    buyTool,
    canBuyHoe,
    canBuyTool,
    equipRelic,
    equipTool,
    farmLevel,
    haveCrop,
    hasRelic,
    hoeOf,
    hoePower,
    relicSlots,
    toolSlots,
    TOOLS,
    toolsOf,
    toolWorn,
    unequipRelic,
    unequipTool,
    upLevel,
    ownsTool,
    type CropKind,
    type RecipeDef,
    type ToolDef,
} from "@/lib/fractured-idle/farm";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { CostRow, UpgradeList, C, col, fmtPct } from "./farm-bits";
import { ItemIcon } from "./skill-kit";
import { Tip, TipCard } from "./tooltip";
import { SectionTitle, type Ctx } from "./ui";

// The Tools page: the hoe, the tool belt (one tool of each kind, worn for yield, growth and a special), the toolbox
// that makes them, the scarecrow loadout and the hand tools.

type P = { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void };

export const KIND_ICON: Record<CropKind, McSymbolName> = { stalk: "sunburst", root: "spade", fruit: "scissors", fungus: "atom", bloom: "blossom" };
const SPECIAL_TEXT: Record<CropKind, (v: number) => string> = {
    stalk: (v) => `+${Math.round(v * 100)}% shards`,
    root: (v) => `+${Math.round(v * 100)}% Farming XP`,
    fruit: (v) => `+${+(v * 100).toFixed(1)}% triple harvests`,
    fungus: (v) => `+${Math.round(v * 100)}% seed pods`,
    bloom: (v) => `+${Math.round(v * 100)}% sale price`,
};
const statLine = (t: ToolDef) => `+${Math.round(t.yield * 100)}% crops${t.speed ? ` · +${Math.round(t.speed * 100)}% growth` : ""} · ${SPECIAL_TEXT[t.kind](t.special)}`;
const gameLine = (t: ToolDef) => fmtStat(TOOL_FX[t.kind][0], TOOL_FX[t.kind][1] * t.tier);
const cropsOf = (k: CropKind) => CROPS.filter((c) => c.kind === k).map((c) => c.name).join(", ");

export function Tools({ s, F, render, say }: P) {
    const cur = hoeOf(s);
    const next = HOES[s.farm.hoe + 1];
    const can = canBuyHoe(s);
    const lvl = farmLevel(s);
    const slots = toolSlots(s);
    return (
        <>
            <div className="fi-tl-hand" style={col(cur.color)}>
                <ItemIcon icon="fortune" color={cur.color} size="lg" />
                <div className="fi-tl-hand-t">
                    <small>Your hoe</small>
                    <b style={{ color: cur.color }}>{cur.name}</b>
                    <span>Bigger harvests from every plot, in every garden.</span>
                </div>
                <div className="fi-tl-rows">
                    <span>Power <b>x{hoePower(s).toFixed(hoePower(s) < 10 ? 2 : 1)}</b></span>
                    <span>Tilling <b>+{upLevel(s, "till") * 6}%</b></span>
                    <span>Belt <b>{s.farm.belt.length}/{slots} tools</b></span>
                    <span>To the game <b>+{fmtPct(HOE_CLICK * s.farm.hoe)} click</b></span>
                </div>
            </div>
            {next ? (
                <div className="fi-ft-next" style={col(next.color)}>
                    <span className="fi-ft-path">
                        <ItemIcon icon="fortune" color={cur.color} size="sm" />
                        <span className="ar" aria-hidden="true">➜</span>
                        <ItemIcon icon="fortune" color={next.color} />
                    </span>
                    <div className="tx">
                        <b style={{ color: next.color }}>{next.name}</b>
                        <span>Power x{cur.power} <em>▸</em> <b>x{next.power}</b> · +{fmtPct(HOE_CLICK)} click power forever</span>
                        <CostRow s={s} cost={next.cost} />
                        {!can.ok && lvl >= next.need && <small>Enchanted crops come from the Market tab.</small>}
                    </div>
                    <Tip box tip={<TipCard title={`Make ${next.name}`} color={next.color} lines={["Consumes the crops shown and replaces your hoe."]} foot={can.ok ? "Click to make!" : can.why} />}>
                        <button
                            type="button"
                            disabled={!can.ok}
                            onClick={() => {
                                if (buyHoe(s)) {
                                    say(`Made the ${next.name}!`);
                                    sfx("equip");
                                    render();
                                }
                            }}
                            className="fi-cb-go slim"
                            data-snd="off"
                        >
                            {lvl < next.need ? <><Lock className="mr-1 inline size-3" />Farming {next.need}</> : "Make"}
                        </button>
                    </Tip>
                </div>
            ) : (
                <p className="fi-mn-note">You hold the best hoe there is.</p>
            )}
            <ToolBelt s={s} render={render} />
            <Toolbox s={s} render={render} say={say} />
            <Loadout s={s} render={render} say={say} />
            <SectionTitle color={C}>Hand tools</SectionTitle>
            <UpgradeList s={s} cat="hand" render={render} />
            <p className="fi-mn-note">Everything here is permanent: rebirths and ascensions never touch your farm. Crops in stock: {F(Math.floor(CROPS.reduce((a, c) => a + haveCrop(s, c.id), 0)))}.</p>
        </>
    );
}

// ---- The tool belt ----

function ToolBelt({ s, render }: Pick<P, "s" | "render">) {
    const slots = toolSlots(s);
    const belt = s.farm.belt;
    return (
        <>
            <SectionTitle color="var(--mc-aqua)">Tool belt ({belt.length}/{slots})</SectionTitle>
            <div className="fi-tb">
                {Array.from({ length: slots }, (_, i) => {
                    const t = TOOLS.find((x) => x.id === belt[i]);
                    if (!t) {
                        return (
                            <div key={i} className="fi-tb-slot" data-empty>
                                <small>Empty slot</small>
                                <small>wear a tool below</small>
                            </div>
                        );
                    }
                    const k = KIND_INFO[t.kind];
                    return (
                        <Tip key={i} box tip={<TipCard title={t.name} color={k.color} tag={`${k.name} tier ${t.tier}`} lines={[statLine(t)]} notes={[{ text: `Whole game: ${gameLine(t)}`, color: "var(--mc-aqua)" }]} foot="Click to take it off" />}>
                            <button type="button" className="fi-tb-slot" data-on style={{ ["--c" as string]: k.color } as CSSProperties} onClick={() => { unequipTool(s, t.id); sfx("close"); render(); }}>
                                <span className="fi-tb-top">
                                    <ItemIcon icon={KIND_ICON[t.kind]} color={k.color} size="sm" n={`T${t.tier}`} />
                                    <b>{t.name}</b>
                                </span>
                                <small>{statLine(t)}</small>
                            </button>
                        </Tip>
                    );
                })}
            </div>
            <p className="fi-mn-note">
                The belt holds one tool of each kind. A worn tool helps only the crops of its kind in <b>every</b> garden, and adds a permanent bonus to the whole game. {slots < 5 ? `More slots open at Farming ${farmLevel(s) < 18 ? 18 : farmLevel(s) < 34 ? 34 : 50}.` : "Every slot is open."}
            </p>
        </>
    );
}

// ---- The toolbox: one line of five tools per crop kind, picked from a ladder ----

function Toolbox({ s, render, say }: Pick<P, "s" | "render" | "say">) {
    const [kind, setKind] = useState<CropKind>("stalk");
    const [pick, setPick] = useState("");
    const k = KIND_INFO[kind];
    const list = toolsOf(kind);
    const nextIdx = list.findIndex((t) => !ownsTool(s, t.id));
    const cur = list.find((t) => t.id === pick) ?? list[nextIdx === -1 ? list.length - 1 : nextIdx];
    const owned = cur ? ownsTool(s, cur.id) : false;
    const worn = cur ? toolWorn(s, cur.id) : false;
    const can = cur ? canBuyTool(s, cur) : null;
    const ready = (kd: CropKind) => {
        const nx = toolsOf(kd).find((t) => !ownsTool(s, t.id));
        return !!nx && canBuyTool(s, nx).ok;
    };
    return (
        <>
            <SectionTitle color="#c8d0e0">Toolbox</SectionTitle>
            <p className="fi-mn-note">Every kind of crop has its own line of five tools. Each tier needs the one before it, goods from the Kitchen and Enchanted crops from the Market.</p>
            <div className="fi-cb-groups" role="tablist" style={{ ["--k" as string]: k.color } as CSSProperties}>
                {KINDS.map((kd) => {
                    const own = toolsOf(kd).filter((t) => ownsTool(s, t.id)).length;
                    return (
                        <button key={kd} type="button" data-on={kind === kd} onClick={() => { setKind(kd); setPick(""); }} style={{ ["--k" as string]: KIND_INFO[kd].color } as CSSProperties}>
                            <McSymbol name={KIND_ICON[kd]} /> {KIND_INFO[kd].tool}s <small className="fi-ft-n">{own}/5</small>
                            {ready(kd) && <i>!</i>}
                        </button>
                    );
                })}
            </div>
            <div className="fi-tx-k" style={{ ["--c" as string]: k.color } as CSSProperties}>
                <small className="fi-tx-sub">For {k.name.toLowerCase()}: {cropsOf(kind)}. Special: {k.special.toLowerCase()}.</small>
                <div className="fi-ft-ladder">
                    {list.map((t, i) => {
                        const o = ownsTool(s, t.id);
                        const w = toolWorn(s, t.id);
                        const isNext = i === nextIdx;
                        const locked = !o && !isNext;
                        return (
                            <div key={t.id} className="fi-ft-step">
                                {i > 0 && <span className="ar" aria-hidden="true" data-on={o}>➜</span>}
                                <button type="button" className="fi-cb-tile" data-s={w ? "owned" : o ? "ready" : isNext ? (canBuyTool(s, t).ok ? "ready" : "missing") : "locked"} data-on={cur?.id === t.id} style={{ ["--k" as string]: k.color } as CSSProperties} onClick={() => setPick(t.id)}>
                                    <ItemIcon icon={KIND_ICON[kind]} color={k.color} n={`T${t.tier}`} dim={locked} />
                                    <span className="nm">{locked && !(farmLevel(s) >= t.need) ? "???" : t.name.replace(k.tool, "").trim() || t.name}</span>
                                    <span className="st">{w ? "Worn" : o ? "Owned" : isNext ? "Next" : "Locked"}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
                {cur && can && (
                    <div className="fi-cb-detail" data-s={owned ? "ready" : can.ok ? "ready" : "missing"} style={{ ["--k" as string]: k.color } as CSSProperties}>
                        <div className="fi-cb-dh">
                            <ItemIcon icon={KIND_ICON[kind]} color={k.color} size="lg" dim={!owned && cur.id !== list[nextIdx]?.id} />
                            <div className="fi-cb-dt">
                                <b style={{ color: k.color }}>{cur.name}</b>
                                <span>{statLine(cur)}</span>
                                <em>Whole game: {gameLine(cur)}</em>
                            </div>
                        </div>
                        {!owned && cur.id === list[nextIdx]?.id && <CostRow s={s} cost={cur.cost} />}
                        {!owned && cur.id !== list[nextIdx]?.id && <p className="fi-cb-lock"><Lock className="mr-1 inline size-3" />Make the tier before it first.</p>}
                        <div className="fi-cb-act">
                            {owned ? (
                                <button
                                    type="button"
                                    className="fi-cb-go"
                                    data-snd="off"
                                    onClick={() => {
                                        if (worn) {
                                            unequipTool(s, cur.id);
                                            sfx("close");
                                        } else if (equipTool(s, cur.id)) sfx("equip");
                                        else {
                                            say("The belt is full. Take a tool off first.");
                                            return;
                                        }
                                        render();
                                    }}
                                >
                                    {worn ? "Take it off the belt" : "Wear it"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="fi-cb-go"
                                    disabled={!can.ok}
                                    data-snd="off"
                                    onClick={() => {
                                        if (buyTool(s, cur.id)) {
                                            say(`Made the ${cur.name}${toolWorn(s, cur.id) ? " and put it on the belt" : ""}!`);
                                            sfx("equip");
                                            render();
                                        }
                                    }}
                                >
                                    {farmLevel(s) < cur.need ? `Opens at Farming ${cur.need}` : can.ok ? "Make it" : can.why}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ---- Scarecrows ----

function Loadout({ s, render, say }: Pick<P, "s" | "render" | "say">) {
    const slots = relicSlots(s);
    const eq = s.farm.equipped;
    const owned = s.farm.relics.map((id) => RELICS.find((r) => r.out === id)).filter((r): r is RecipeDef => !!r);
    const off = owned.filter((r) => !eq.includes(r.out));
    const toggle = (r: RecipeDef) => {
        if (hasRelic(s, r.out)) unequipRelic(s, r.out);
        else if (!equipRelic(s, r.out)) {
            say("Every slot is full. Take a scarecrow down first.");
            return;
        }
        render();
    };
    return (
        <>
            <SectionTitle color="var(--mc-yellow)">Scarecrow loadout ({eq.length}/{slots})</SectionTitle>
            <div className="fi-mn-loadout">
                {Array.from({ length: slots }, (_, i) => {
                    const r = RELICS.find((x) => x.out === eq[i]);
                    return r ? (
                        <Tip key={i} box tip={<TipCard title={r.name} color={r.color} lines={[r.desc]} foot="Click to take down" />}>
                            <button type="button" className="fi-mn-slotr" data-on style={col(r.color)} onClick={() => toggle(r)}>
                                <McSymbol name="gem" />
                                <b>{r.name}</b>
                                <small>{r.desc}</small>
                            </button>
                        </Tip>
                    ) : (
                        <div key={i} className="fi-mn-slotr" data-empty>
                            <small>Empty slot</small>
                        </div>
                    );
                })}
            </div>
            {off.length > 0 && (
                <div className="fi-mn-shelf">
                    {off.map((r) => (
                        <Tip key={r.id} box tip={<TipCard title={r.name} color={r.color} lines={[r.desc]} foot={eq.length < slots ? "Click to put up" : "Every slot is full"} />}>
                            <button type="button" className="fi-mn-relic" data-own="true" data-off style={col(r.color)} onClick={() => toggle(r)} aria-label={`Put up ${r.name}`}>
                                <McSymbol name="gem" />
                            </button>
                        </Tip>
                    ))}
                </div>
            )}
            <p className="fi-mn-note">Scarecrows only work while they stand in a slot. {slots < 4 ? `More slots open at Farming ${farmLevel(s) < 25 ? 25 : 45}.` : "Every slot is open."} {owned.length === 0 ? "Make your first scarecrow in the Kitchen tab." : ""}</p>
        </>
    );
}

export const TOOLS_CSS = `
.fi-tb{display:grid;grid-template-columns:repeat(auto-fill,minmax(8.4rem,1fr));gap:.4rem}
.fi-tb .fi-tw-box{display:block;min-width:0}
.fi-tb-slot{display:flex;flex-direction:column;align-items:flex-start;gap:.1rem;width:100%;min-height:4.4rem;padding:.5rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--c,#fff) 40%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--c,#fff) 16%,transparent),transparent 80%);text-align:left;transition:transform .12s,background .15s;touch-action:manipulation}
.fi-tb-slot:hover{transform:translateY(-1px);background:linear-gradient(150deg,color-mix(in oklch,var(--c,#fff) 28%,transparent),transparent 80%)}
.fi-tb-slot b{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:var(--c)}
.fi-tb-slot small{font-family:var(--font-rubik,inherit);font-size:.58rem;line-height:1.3;color:var(--muted-foreground)}
.fi-tb-slot[data-empty]{align-items:center;justify-content:center;border-style:dashed;border-color:rgba(255,255,255,.18);background:transparent}
.fi-tb-i{display:grid;place-items:center;font-size:1.35rem;line-height:1;color:var(--c,${C});text-shadow:0 0 12px var(--c,${C})}
.fi-tb-top{display:flex;align-items:center;gap:.4rem;min-width:0}
.fi-tb-top b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-ft-next{display:flex;flex-wrap:wrap;align-items:center;gap:.7rem;padding:.6rem .75rem;border-radius:1rem;border:1px dashed color-mix(in oklch,var(--oc) 55%,transparent);background:color-mix(in oklch,var(--oc) 6%,transparent)}
.fi-ft-path{display:flex;align-items:center;gap:.4rem}
.fi-ft-path .ar,.fi-ft-step .ar{color:var(--muted-foreground);font-size:.85rem}
.fi-ft-next .tx{flex:1;min-width:11rem;display:flex;flex-direction:column;gap:.25rem}
.fi-ft-next .tx>b{font-family:var(--font-minecraft,inherit);font-size:.9rem}
.fi-ft-next .tx>span{font-family:var(--font-rubik,inherit);font-size:.66rem;color:#cfc8de}
.fi-ft-next .tx>span em{font-style:normal;color:var(--muted-foreground)}
.fi-ft-next .tx>span b{color:var(--mc-green)}
.fi-ft-next .tx small{font-family:var(--font-rubik,inherit);font-size:.6rem;color:#ff9a4d}
.fi-ft-n{font-size:.56rem;opacity:.7}
.fi-tx-sub{font-family:var(--font-rubik,inherit);font-size:.62rem;line-height:1.35;color:var(--muted-foreground)}
.fi-ft-ladder{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .1rem}
.fi-ft-step{display:flex;align-items:center;gap:.3rem;margin-right:.3rem}
.fi-ft-step .ar[data-on="true"]{color:var(--c)}
.fi-ft-ladder .fi-cb-tile{width:5.2rem}
.fi-tx{display:flex;flex-direction:column;gap:.5rem}
.fi-tx-k{display:flex;flex-direction:column;gap:.35rem;padding:.55rem .65rem;border-radius:.95rem;border:1px solid color-mix(in oklch,var(--c) 30%,transparent);background:linear-gradient(140deg,color-mix(in oklch,var(--c) 8%,transparent),transparent 70%)}
.fi-tx-h{display:flex;align-items:center;gap:.6rem}
.fi-tx-h b{display:block;font-family:var(--font-minecraft,inherit);font-size:.8rem;color:var(--c)}
.fi-tx-h small{display:block;font-family:var(--font-rubik,inherit);font-size:.6rem;line-height:1.35;color:var(--muted-foreground)}
.fi-tx-list{display:flex;flex-direction:column;gap:.25rem}
.fi-tx-row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem .5rem;border-radius:.6rem;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);opacity:.55}
.fi-tx-row[data-owned="true"],.fi-tx-row[data-next="true"]{opacity:1}
.fi-tx-row[data-worn="true"]{border-color:color-mix(in oklch,var(--c) 70%,transparent);background:color-mix(in oklch,var(--c) 14%,transparent)}
.fi-tx-row[data-next="true"]{border-color:color-mix(in oklch,var(--c) 40%,transparent)}
.fi-tx-t{display:flex;flex-direction:column;gap:.1rem;min-width:0}
.fi-tx-t b{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:#fff}
.fi-tx-t small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.fi-tx-g{color:var(--mc-aqua)!important}
`;

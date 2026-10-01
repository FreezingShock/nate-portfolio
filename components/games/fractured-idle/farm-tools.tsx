"use client";

import type { CSSProperties } from "react";
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
    relicSlots,
    toolSlots,
    TOOLS,
    toolsOf,
    toolWorn,
    unequipRelic,
    unequipTool,
    ownsTool,
    type CropKind,
    type RecipeDef,
    type ToolDef,
} from "@/lib/fractured-idle/farm";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { CostRow, UpgradeList, C, col, fmtPct } from "./farm-bits";
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
    return (
        <>
            <div className="fi-mn-pick" style={{ ["--c" as string]: (next ?? cur).color } as CSSProperties}>
                <span className="fi-mn-pick-i"><McSymbol name="fortune" /></span>
                <div className="min-w-0 flex-1">
                    <div className="fi-mn-pick-t">{next ? next.name : cur.name}</div>
                    <div className="fi-mn-pick-s">
                        {next ? (
                            <>
                                Power x{cur.power} <em>▸</em> <b>x{next.power}</b> · +{fmtPct(HOE_CLICK)} click power forever
                            </>
                        ) : (
                            "The best hoe there is."
                        )}
                    </div>
                    {next && <CostRow s={s} cost={next.cost} />}
                    {next && !can.ok && lvl >= next.need && <div className="fi-mn-pick-h">Goods come from the Kitchen tab.</div>}
                </div>
                {next && (
                    <Tip box tip={<TipCard title={`Make ${next.name}`} color={next.color} lines={["Consumes the goods shown and replaces your hoe."]} foot={can.ok ? "Click to make!" : can.why} />}>
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
                            className="fi-mn-buy"
                        >
                            {lvl < next.need ? <><Lock className="mr-1 inline size-3" />Farming {next.need}</> : "Make"}
                        </button>
                    </Tip>
                )}
            </div>
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
                                <span className="fi-tb-i"><McSymbol name={KIND_ICON[t.kind]} /></span>
                                <b>{t.name}</b>
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

// ---- The toolbox ----

function Toolbox({ s, render, say }: Pick<P, "s" | "render" | "say">) {
    return (
        <>
            <SectionTitle color="#c8d0e0">Toolbox</SectionTitle>
            <p className="fi-mn-note">Every kind of crop has its own line of five tools. Each tier needs the one before it, goods from the Kitchen and Enchanted crops from the Market.</p>
            <div className="fi-tx">
                {KINDS.map((kind) => {
                    const k = KIND_INFO[kind];
                    const list = toolsOf(kind);
                    const nextIdx = list.findIndex((t) => !ownsTool(s, t.id));
                    return (
                        <div key={kind} className="fi-tx-k" style={{ ["--c" as string]: k.color } as CSSProperties}>
                            <div className="fi-tx-h">
                                <span className="fi-tb-i"><McSymbol name={KIND_ICON[kind]} /></span>
                                <div className="min-w-0 flex-1">
                                    <b>{k.tool}s</b>
                                    <small>For {k.name.toLowerCase()}: {cropsOf(kind)}. Special: {k.special.toLowerCase()}.</small>
                                </div>
                            </div>
                            <div className="fi-tx-list">
                                {list.map((t, i) => {
                                    const owned = ownsTool(s, t.id);
                                    const worn = toolWorn(s, t.id);
                                    const can = canBuyTool(s, t);
                                    const isNext = i === nextIdx;
                                    return (
                                        <div key={t.id} className="fi-tx-row" data-owned={owned} data-next={isNext} data-worn={worn}>
                                            <div className="fi-tx-t">
                                                <b>{t.name}</b>
                                                <small>{statLine(t)}</small>
                                                {(owned || isNext) && <small className="fi-tx-g">Whole game: {gameLine(t)}</small>}
                                                {isNext && <CostRow s={s} cost={t.cost} />}
                                            </div>
                                            {owned ? (
                                                <button
                                                    type="button"
                                                    className="fi-mn-buy small"
                                                    data-snd="off"
                                                    onClick={() => {
                                                        if (worn) {
                                                            unequipTool(s, t.id);
                                                            sfx("close");
                                                        } else if (equipTool(s, t.id)) sfx("equip");
                                                        else {
                                                            say("The belt is full. Take a tool off first.");
                                                            return;
                                                        }
                                                        render();
                                                    }}
                                                >
                                                    {worn ? "Take off" : "Wear"}
                                                </button>
                                            ) : (
                                                <Tip box tip={<TipCard title={`Make ${t.name}`} color={k.color} lines={[statLine(t)]} foot={can.ok ? "Click to make!" : can.why} />}>
                                                    <button
                                                        type="button"
                                                        className="fi-mn-buy small"
                                                        disabled={!can.ok}
                                                        data-snd="off"
                                                        onClick={() => {
                                                            if (buyTool(s, t.id)) {
                                                                say(`Made the ${t.name}${toolWorn(s, t.id) ? " and put it on the belt" : ""}!`);
                                                                sfx("equip");
                                                                render();
                                                            }
                                                        }}
                                                    >
                                                        {farmLevel(s) < t.need ? <><Lock className="mr-1 inline size-3" />{t.need}</> : "Make"}
                                                    </button>
                                                </Tip>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
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

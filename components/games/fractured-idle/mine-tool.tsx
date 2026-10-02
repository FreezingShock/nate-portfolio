"use client";

import { type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    CORES,
    ENCHANTS,
    ENGINES,
    HEADS,
    PARTS,
    PART_KIND_LABEL,
    PICKS,
    PICK_CLICK,
    RELICS,
    autoRig,
    bestTier,
    buyEnch,
    canBuyEnch,
    coreFx,
    drillHeld,
    drillMk,
    drillSwings,
    enchCap,
    enchCost,
    enchantAll,
    enchOn,
    equipRelic,
    explosiveChance,
    geodeChance,
    hasDrill,
    hasRelic,
    heldTool,
    holdTool,
    installPart,
    luckyChance,
    mineLevel,
    pickPower,
    relicSlots,
    removeCore,
    rigPart,
    toolEnch,
    unequipRelic,
    veinNeed,
    yieldMult,
    type EnchDef,
    type PartDef,
    type PartKind,
    type RecipeDef,
    RECIPES,
} from "@/lib/fractured-idle/mine";
import { sfx } from "@/lib/sound/sounds";
import { mineNeeds } from "./mine-bits";
import { ItemIcon, NeedTile } from "./skill-kit";
import { Tip, TipCard } from "./tooltip";
import { SectionTitle, type Ctx } from "./ui";

// The Tool page: what is in your hands (a pickaxe or the Drill), the toolbox, the drill rig (engine, head
// and core), the enchants on your tool, and the relics you wear. Parts and pickaxes are made in the Forge.

type P = { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void; goForge: () => void };
const C = "#e0b070";
const fmtPct = (n: number) => `${+(n * 100).toFixed(1)}%`;
const col = (c: string) => ({ ["--oc" as string]: c }) as CSSProperties;

/** What an enchant does at a level. */
function enchText(d: EnchDef, l: number): string {
    switch (d.id) {
        case "eff": return `+${l * 8}% power`;
        case "fort": return `+${l * 8}% ore`;
        case "lucky": return `${+(l * 1.5).toFixed(1)}% triple haul`;
        case "seismic": return `vein: ${Math.max(25, Math.round(70 * Math.pow(0.96, l)))} swings`;
        case "seeker": return `+${l * 10}% geodes`;
        case "prosp": return l ? `rarer ore, level ${l}` : "off";
        case "explosive": return `${+(l * 1.2).toFixed(1)}% blast (x6 ore)`;
        case "rush": return `${8 + l * 2} swings, +${l * 10}% ore`;
        case "scholar": return `+${l * 6}% Mining XP`;
        case "deep": return `+${l}% all shards`;
        case "ancient": return `+${+(l * 1.5).toFixed(1)}% shards, +${l * 2}% tokens`;
        case "bit": return `+${l * 15}% drill power`;
        case "motor": return `+${l * 6}% drill swings`;
        case "magnet": return `+${l * 5}% drill ore`;
        case "sifter": return `+${l * 12}% drill geodes`;
        case "cracker": return l ? `cracks one every ${Math.round(36 / l)}s` : "off";
        default: return "";
    }
}

export function ToolView({ s, F, render, say, goForge }: P) {
    const t = heldTool(s);
    const drill = drillHeld(s);
    return (
        <>
            <div className="fi-tl-hand" style={col(t.color)}>
                <ItemIcon icon={t.kind === "drill" ? "cog" : "pick"} color={t.color} size="lg" />
                <div className="fi-tl-hand-t">
                    <small>In your hands</small>
                    <b style={{ color: t.color }}>{t.name}</b>
                    <span>{t.kind === "drill" ? `${rigPart(s, "engine")?.name} + ${rigPart(s, "head")?.name}${rigPart(s, "core") ? ` + ${rigPart(s, "core")!.name}` : ""}` : t.traitText}</span>
                </div>
                <div className="fi-tl-rows">
                    <span>Power <b>x{pickPower(s).toFixed(pickPower(s) < 10 ? 2 : 1)}</b></span>
                    <span>Ore <b>x{yieldMult(s).toFixed(2)}</b></span>
                    <span>Triple haul <b>{fmtPct(luckyChance(s))}</b></span>
                    <span>Geodes <b>{fmtPct(geodeChance(s))}</b></span>
                    {drill && <span>Drill swings <b>{drillSwings(s).toFixed(2)}/s</b></span>}
                    <span>Vein <b>{Math.round(veinNeed(s))} swings</b></span>
                    <span>To the game <b>+{fmtPct(PICK_CLICK * (bestTier(s) - 1))} click</b></span>
                </div>
            </div>

            <SectionTitle color={C}>Toolbox</SectionTitle>
            <Toolbox s={s} render={render} say={say} goForge={goForge} />

            <SectionTitle color="var(--mc-aqua)">The drill</SectionTitle>
            <Rig s={s} render={render} say={say} goForge={goForge} F={F} />

            <Enchants s={s} F={F} render={render} say={say} goForge={goForge} />

            <Loadout s={s} render={render} say={say} />
        </>
    );
}

// ---- The toolbox: wield any tool you own ----

function Toolbox({ s, render, say, goForge }: Pick<P, "s" | "render" | "say" | "goForge">) {
    const held = s.mine.held;
    const wield = (id: string, name: string) => {
        if (holdTool(s, id)) {
            sfx("equip");
            say(`${name} in hand.`);
            render();
        }
    };
    return (
        <div className="fi-cb-grid" style={col(C)}>
            <button type="button" className="fi-cb-tile" data-s={hasDrill(s) ? "owned" : "missing"} data-on={held === "drill" && hasDrill(s)} style={{ ["--k" as string]: "#7fd0ff" } as CSSProperties} onClick={() => (hasDrill(s) ? wield("drill", `Mk ${drillMk(s)} Drill`) : goForge())} title="The Drill">
                <ItemIcon icon="cog" color="#7fd0ff" n={hasDrill(s) ? `Mk${drillMk(s)}` : undefined} dim={!hasDrill(s)} />
                <span className="nm">{hasDrill(s) ? "The Drill" : "Drill"}</span>
                <span className="st">{held === "drill" && hasDrill(s) ? "In hand" : hasDrill(s) ? "Wield" : "Forge parts"}</span>
            </button>
            {PICKS.map((p) => {
                const own = s.mine.picks.includes(p.id);
                const lvlLock = mineLevel(s) < p.need;
                return (
                    <Tip key={p.id} box tip={<TipCard title={p.name} color={p.color} tag={`Tier ${p.tier}`} lines={[p.traitText]} rows={[["Power", `x${p.power}`], ["Holds", `enchants up to level ${5 + 3 * p.tier}`]]} foot={own ? (held === p.id ? "In your hands" : "Click to wield") : lvlLock ? `Opens at Mining ${p.need}` : "Forge it in the Forge tab"} />}>
                        <button type="button" className="fi-cb-tile" data-s={own ? (held === p.id ? "owned" : "ready") : lvlLock ? "locked" : "missing"} data-on={held === p.id} style={{ ["--k" as string]: p.color } as CSSProperties} onClick={() => (own ? wield(p.id, p.name) : goForge())}>
                            <ItemIcon icon="pick" color={p.color} n={`T${p.tier}`} dim={!own} />
                            <span className="nm">{own || !lvlLock ? p.name.replace(" Pickaxe", "") : "???"}</span>
                            <span className="st">{held === p.id ? "In hand" : own ? "Wield" : lvlLock ? <><Lock className="inline size-2.5" /> {p.need}</> : "Forge it"}</span>
                        </button>
                    </Tip>
                );
            })}
        </div>
    );
}

// ---- The drill rig ----

function Rig({ s, render, say, goForge, F }: P) {
    void F;
    const mk = drillMk(s);
    const kinds: { k: PartKind; list: PartDef[] }[] = [
        { k: "engine", list: ENGINES },
        { k: "head", list: HEADS },
        { k: "core", list: CORES },
    ];
    const install = (p: PartDef) => {
        if (installPart(s, p.id)) {
            sfx("equip");
            say(`${p.name} installed.`);
            render();
        }
    };
    const need = !hasDrill(s);
    return (
        <>
            {need && (
                <div className="fi-tl-guide">
                    <b>Your first drill</b>
                    <span>A drill is the best tool you can have this early: it swings by itself, also while you are away. Forge an <em>engine</em> and a <em>drill head</em> (both need copper ingots) and it assembles itself.</span>
                    <button type="button" className="fi-lv-btn" onClick={goForge}>Open the Forge</button>
                </div>
            )}
            <div className="fi-tl-rig">
                {kinds.map(({ k, list }) => {
                    const cur = rigPart(s, k);
                    return (
                        <div key={k} className="fi-tl-slot" data-empty={!cur} style={col(cur?.color ?? "#6b6580")}>
                            <ItemIcon icon={k === "engine" ? "cog" : k === "head" ? "pick" : "atom"} color={cur?.color ?? "#6b6580"} dim={!cur} />
                            <span className="tx">
                                <small>{PART_KIND_LABEL[k]}{k === "core" ? " (optional)" : ""}</small>
                                <b>{cur ? cur.name : "Empty"}</b>
                                <em>{cur ? cur.desc : k === "core" ? "A special core adds a perk" : "Needed for the drill"}</em>
                            </span>
                            {k === "core" && cur && (
                                <button type="button" className="fi-tl-x" onClick={() => { removeCore(s); render(); }} aria-label="Remove the core">✕</button>
                            )}
                        </div>
                    );
                })}
                <div className="fi-tl-mk">
                    <small>Drill</small>
                    <b>{mk ? `Mk ${mk}` : "none"}</b>
                    {mk > 0 && <em>{drillSwings({ ...s, mine: { ...s.mine, held: "drill" } } as Ctx["s"]).toFixed(2)} swings/s</em>}
                </div>
            </div>
            {kinds.map(({ k, list }) => (
                <div key={k} className="fi-tl-parts">
                    <small>{PART_KIND_LABEL[k]}s</small>
                    <div className="fi-cb-grid">
                        {list.map((p) => {
                            const own = s.mine.parts.includes(p.id);
                            const on = s.mine.rig[k] === p.id;
                            const lock = mineLevel(s) < p.need;
                            return (
                                <Tip key={p.id} box tip={<TipCard title={p.name} color={p.color} tag={`${PART_KIND_LABEL[k]} · tier ${p.tier}`} lines={[p.desc]} foot={own ? (on ? "Installed" : "Click to install") : lock ? `Opens at Mining ${p.need}` : "Forge it in the Forge tab"} />}>
                                    <button type="button" className="fi-cb-tile" data-s={own ? (on ? "owned" : "ready") : lock ? "locked" : "missing"} data-on={on} style={{ ["--k" as string]: p.color } as CSSProperties} onClick={() => (own ? install(p) : goForge())}>
                                        <ItemIcon icon={k === "engine" ? "cog" : k === "head" ? "pick" : "atom"} color={p.color} n={`T${p.tier}`} dim={!own} />
                                        <span className="nm">{own || !lock ? p.name : "???"}</span>
                                        <span className="st">{on ? "Installed" : own ? "Install" : lock ? <><Lock className="inline size-2.5" /> {p.need}</> : "Forge it"}</span>
                                    </button>
                                </Tip>
                            );
                        })}
                    </div>
                </div>
            ))}
            {s.mine.parts.length > 0 && (
                <button
                    type="button"
                    className="fi-lv-btn ghost"
                    onClick={() => {
                        const n = autoRig(s);
                        if (n) {
                            say("Best engine and head installed and the drill is in your hands.");
                            render();
                        }
                    }}
                >
                    Install my best parts
                </button>
            )}
            {coreFx(s).all ? <p className="fi-mn-note">The Singularity Core also adds +5% to all shards while it is installed.</p> : null}
        </>
    );
}

// ---- Enchants on the tool in your hands ----

function Enchants({ s, F, render, say }: P) {
    const t = heldTool(s);
    const lv = toolEnch(s, t.id);
    const total = Object.values(lv).reduce((a, b) => a + b, 0);
    const buyAll = () => {
        const n = enchantAll(s);
        if (n) {
            sfx("bulk");
            say(`Bought ${n} enchant level${n > 1 ? "s" : ""} for your ${t.name}.`);
            render();
        }
    };
    return (
        <>
            <SectionTitle color="#c58bff">Enchants on your {t.name}</SectionTitle>
            <p className="fi-mn-note">
                Every tool keeps its own enchants, so a new tool starts bare. A better tool holds higher levels: yours holds up to <b style={{ color: "#fff" }}>{5 + 3 * t.tier}</b>. Drill-only enchants work when the drill is in your hands.
                {total > 0 ? ` ${total} levels on it now.` : ""}
            </p>
            <button type="button" className="fi-lv-btn" style={{ alignSelf: "flex-start" }} onClick={buyAll}>Buy every enchant I can afford</button>
            <div className="fi-tl-ench">
                {ENCHANTS.map((d) => {
                    const l = lv[d.id] || 0;
                    const cap = enchCap(t.tier, d);
                    const can = canBuyEnch(s, t.id, d);
                    const off = !enchOn(t, d);
                    const locked = mineLevel(s) < d.need;
                    return (
                        <div key={d.id} className="fi-tl-en" data-ready={can.ok} data-off={off || locked} style={col(d.color)}>
                            <ItemIcon icon="intelligence" color={d.color} ench={l > 0} n={l > 0 ? l : undefined} dim={off || locked} />
                            <div className="tx">
                                <b>{d.name} <small>{l}/{Math.min(cap, d.max)}</small></b>
                                <span>{locked ? <><Lock className="mr-1 inline size-3" />Opens at Mining {d.need}</> : off ? "Drill only: take the drill in your hands" : d.desc}</span>
                                {!locked && !off && <em>{l > 0 ? enchText(d, l) : "no bonus yet"} ▸ <b>{l >= d.max ? "max" : enchText(d, l + 1)}</b></em>}
                            </div>
                            {!locked && !off && (l >= d.max ? <span className="fi-mn-maxed">Maxed</span> : l >= cap ? <span className="fi-tl-cap">Needs a better tool</span> : (
                                <div className="buy">
                                    <span className="fi-cb-needs">{mineNeeds(s, enchCost(l, d)).map((n) => <NeedTile key={n.id} n={n} />)}</span>
                                    <button type="button" className="fi-lv-btn" disabled={!can.ok} onClick={() => { if (buyEnch(s, t.id, d.id)) { sfx("buy"); render(); } }}>Enchant</button>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
            <p className="fi-mn-note">Explosive chance now: {fmtPct(explosiveChance(s))}. Ore in stock is spent on enchants. Ore: {F(Math.floor(Object.values(s.mine.ore).reduce((a, b) => a + b, 0)))}.</p>
        </>
    );
}

// ---- Loadout: which relics are switched on ----

function Loadout({ s, render, say }: Pick<P, "s" | "render" | "say">) {
    const slots = relicSlots(s);
    const eq = s.mine.equipped;
    const owned = s.mine.relics.map((id) => RELICS.find((r) => r.out === id)).filter((r): r is RecipeDef => !!r);
    const off = owned.filter((r) => !eq.includes(r.out));
    const toggle = (r: RecipeDef) => {
        if (hasRelic(s, r.out)) unequipRelic(s, r.out);
        else if (!equipRelic(s, r.out)) {
            say("Every slot is full. Take a relic off first.");
            return;
        }
        render();
    };
    return (
        <>
            <SectionTitle color="var(--mc-yellow)">Relic loadout ({eq.length}/{slots})</SectionTitle>
            <div className="fi-mn-loadout">
                {Array.from({ length: slots }, (_, i) => {
                    const r = RELICS.find((x) => x.out === eq[i]);
                    return r ? (
                        <Tip key={i} box tip={<TipCard title={r.name} color={r.color} lines={[r.desc]} foot="Click to take off" />}>
                            <button type="button" className="fi-mn-slotr" data-on style={col(r.color)} onClick={() => toggle(r)}>
                                <McSymbol name="key" />
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
                        <Tip key={r.id} box tip={<TipCard title={r.name} color={r.color} lines={[r.desc]} foot={eq.length < slots ? "Click to equip" : "Every slot is full"} />}>
                            <button type="button" className="fi-mn-relic" data-own="true" data-off style={col(r.color)} onClick={() => toggle(r)} aria-label={`Equip ${r.name}`}>
                                <McSymbol name="key" />
                            </button>
                        </Tip>
                    ))}
                </div>
            )}
            <p className="fi-mn-note">Relics only work while equipped. {slots < 4 ? `More slots open at Mining ${mineLevel(s) < 25 ? 25 : 45}.` : "Every slot is open."} {owned.length === 0 ? "Forge your first relic in the Forge tab." : ""} {PARTS.length} drill parts and {PICKS.length - 1} pickaxes are made there too.</p>
        </>
    );
}

export const MINE_TOOL_CSS = `
.fi-tl-hand{display:flex;flex-wrap:wrap;align-items:center;gap:.8rem;padding:.8rem .9rem;border-radius:1.1rem;border:1px solid color-mix(in oklch,var(--oc) 55%,transparent);background:radial-gradient(circle at 0 0,color-mix(in oklch,var(--oc) 22%,transparent),transparent 60%),rgba(0,0,0,.2)}
.fi-tl-hand-t{display:flex;flex-direction:column;gap:.1rem;min-width:9rem;flex:1}
.fi-tl-hand-t small{font-family:var(--font-minecraft,inherit);font-size:.56rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-tl-hand-t b{font-family:var(--font-minecraft,inherit);font-size:1.15rem;line-height:1.1}
.fi-tl-hand-t span{font-family:var(--font-rubik,inherit);font-size:.66rem;color:#cfc8de}
.fi-tl-rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(8.2rem,1fr));gap:.25rem .8rem;flex:2;min-width:14rem}
.fi-tl-rows span{display:flex;justify-content:space-between;gap:.5rem;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground);border-bottom:1px dashed rgba(255,255,255,.08);padding-bottom:.1rem}
.fi-tl-rows b{color:#fff;font-weight:700}
.fi-tl-guide{display:flex;flex-direction:column;align-items:flex-start;gap:.4rem;padding:.7rem .8rem;border-radius:1rem;border:1px dashed color-mix(in oklch,#7fd0ff 55%,transparent);background:color-mix(in oklch,#7fd0ff 7%,transparent)}
.fi-tl-guide b{font-family:var(--font-minecraft,inherit);font-size:.85rem;color:#7fd0ff}
.fi-tl-guide span{font-family:var(--font-rubik,inherit);font-size:.7rem;line-height:1.45;color:#cfc8de}
.fi-tl-guide em{font-style:normal;color:#fff;font-weight:700}
.fi-tl-rig{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.4rem}
.fi-tl-slot{position:relative;display:flex;align-items:center;gap:.6rem;padding:.55rem .6rem;border-radius:.95rem;border:1px solid color-mix(in oklch,var(--oc) 50%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--oc) 12%,transparent),rgba(0,0,0,.2))}
.fi-tl-slot[data-empty="true"]{border-style:dashed;opacity:.8}
.fi-tl-slot .tx{display:flex;flex-direction:column;min-width:0}
.fi-tl-slot small{font-family:var(--font-rubik,inherit);font-size:.54rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-tl-slot b{font-family:var(--font-minecraft,inherit);font-size:.8rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-tl-slot em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;color:#cfc8de}
.fi-tl-x{position:absolute;top:.25rem;right:.3rem;border:0;background:transparent;color:var(--muted-foreground);font-size:.7rem}
.fi-tl-mk{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:.4rem .7rem;border-radius:.95rem;border:1px solid color-mix(in oklch,#7fd0ff 45%,transparent);background:color-mix(in oklch,#7fd0ff 8%,transparent);text-align:center}
.fi-tl-mk small{font-family:var(--font-rubik,inherit);font-size:.54rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-tl-mk b{font-family:var(--font-minecraft,inherit);font-size:1.15rem;color:#7fd0ff}
.fi-tl-mk em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;color:#cfc8de}
.fi-tl-parts{display:flex;flex-direction:column;gap:.25rem}
.fi-tl-parts>small{font-family:var(--font-rubik,inherit);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-tl-ench{display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:.4rem}
.fi-tl-en{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.5rem .65rem;align-items:center;padding:.55rem .65rem;border-radius:.95rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2)}
.fi-tl-en[data-ready="true"]{border-color:color-mix(in oklch,var(--oc) 60%,transparent);background:color-mix(in oklch,var(--oc) 8%,rgba(0,0,0,.2))}
.fi-tl-en[data-off="true"]{opacity:.55}
.fi-tl-en .tx{display:flex;flex-direction:column;gap:.1rem;min-width:0}
.fi-tl-en .tx>b{font-family:var(--font-minecraft,inherit);font-size:.8rem;color:#fff}
.fi-tl-en .tx>b small{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);font-weight:600}
.fi-tl-en .tx>span{font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-tl-en .tx>em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.62rem;color:#cfc8de}
.fi-tl-en .tx>em b{color:var(--mc-green)}
.fi-tl-en .buy{grid-column:1 / -1;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.4rem}
.fi-tl-cap{grid-column:1 / -1;font-family:var(--font-rubik,inherit);font-size:.62rem;color:#ff9a4d}
`;

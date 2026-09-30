"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { SKILL_CAP, skillXpFor } from "@/lib/fractured-idle/engine";
import {
    COL_AT,
    MINE_UPS,
    ORES,
    ORE_BY_ID,
    PICKS,
    PICK_CLICK,
    breakNode,
    buyDrill,
    buyMineUp,
    buyPick,
    canBuyDrill,
    canBuyPick,
    canBuyUp,
    colTierOf,
    crackGeode,
    drillCost,
    drillRate,
    geodeChance,
    have,
    luckyChance,
    mineLevel,
    newNode,
    nodeShards,
    openOres,
    oreOpen,
    oreXp,
    pickOf,
    pickPower,
    respawnMs,
    setFocus,
    totalDrillRate,
    upCost,
    upLevel,
    yieldMult,
    type GeodeOut,
    type MineUpDef,
    type Node,
    type OreDef,
    type OreId,
} from "@/lib/fractured-idle/mine";
import { Tip, TipCard } from "./tooltip";
import { Progress, SectionTitle, type Ctx } from "./ui";

// The Mine. Tap ore nodes until they crack for ore, Mining XP and shards; spend
// ore on pickaxes, upgrades and drills; fill each ore's collection for permanent
// bonuses; crack geodes for tokens, eggs and the odd ascension point. The rules
// live in lib/fractured-idle/mine.ts. The Roll-style layout rule applies here
// too: everything the player taps stays in a fixed place while nodes come and go.

const C = "#e0b070";
const SLOTS = 6;
type View = "dig" | "forge" | "drills" | "collection";

const fmtPct = (n: number) => `${+(n * 100).toFixed(1)}%`;

export function MineTab({ s, d, F, render, say }: Ctx) {
    const m = s.mine;
    const lvl = mineLevel(s);
    const [view, setView] = useState<View>("dig");
    const [, bump] = useReducer((x: number) => x + 1, 0);
    const [lastGeode, setLastGeode] = useState<GeodeOut | null>(null);
    const nodes = useRef<(Node | null)[]>([]);
    const hits = useRef<number[]>(Array.from({ length: SLOTS }, () => 0));
    const gens = useRef<number[]>(Array.from({ length: SLOTS }, () => 0));
    const stage = useRef<HTMLDivElement>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const live = useRef({ s, d, say, render });
    useEffect(() => {
        live.current = { s, d, say, render };
    });
    if (nodes.current.length === 0) nodes.current = Array.from({ length: SLOTS }, () => newNode(s));
    useEffect(
        () => () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            timers.current.forEach(clearTimeout);
        },
        [],
    );

    // ---- Effects layer (DOM, so a fast tapper never waits on React) ----
    const pop = useCallback((slot: number, text: string, color: string, big = false) => {
        const host = stage.current;
        const cell = host?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
        if (!host || !cell) return;
        const hb = host.getBoundingClientRect();
        const cb = cell.getBoundingClientRect();
        const el = document.createElement("span");
        el.className = `fi-mn-pop${big ? " big" : ""}`;
        el.textContent = text;
        el.style.color = color;
        el.style.left = `${cb.left - hb.left + cb.width / 2}px`;
        el.style.top = `${cb.top - hb.top + cb.height * 0.3}px`;
        host.appendChild(el);
        el.onanimationend = () => el.remove();
    }, []);

    const sparks = useCallback((slot: number, color: string, n: number) => {
        if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const host = stage.current;
        const cell = host?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
        if (!host || !cell) return;
        const hb = host.getBoundingClientRect();
        const cb = cell.getBoundingClientRect();
        const cx = cb.left - hb.left + cb.width / 2;
        const cy = cb.top - hb.top + cb.height / 2;
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const dist = 18 + Math.random() * 34;
            const el = document.createElement("i");
            el.className = "fi-mn-spark";
            el.style.background = color;
            el.style.left = `${cx}px`;
            el.style.top = `${cy}px`;
            host.appendChild(el);
            el.animate(
                [
                    { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                    { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) scale(0)`, opacity: 0 },
                ],
                { duration: 380 + Math.random() * 260, easing: "cubic-bezier(.1,.7,.3,1)" },
            ).onfinish = () => el.remove();
        }
    }, []);

    // ---- Tapping ----
    const tap = useCallback(
        (i: number) => {
            const { s: st, d: dd, say: tell } = live.current;
            const n = nodes.current[i];
            if (!n) return;
            n.hp -= pickPower(st);
            hits.current[i]++;
            const o = ORE_BY_ID[n.ore];
            if (n.hp > 0) {
                sparks(i, o.color, 2);
                bump();
                return;
            }
            const r = breakNode(st, n, dd);
            nodes.current[i] = null;
            sparks(i, o.color, n.golden ? 16 : 9);
            pop(i, `+${r.amount} ${o.name}`, o.color, r.lucky || n.golden);
            if (r.lucky) pop(i, "LUCKY x3!", "var(--mc-yellow)", true);
            if (r.geode) tell("A geode dropped! Crack it below.");
            bump();
            const t = setTimeout(() => {
                timers.current = timers.current.filter((x) => x !== t);
                nodes.current[i] = newNode(live.current.s);
                gens.current[i]++;
                bump();
                live.current.render();
            }, respawnMs(st));
            timers.current.push(t);
            live.current.render();
        },
        [pop, sparks],
    );

    const crack = () => {
        const out = crackGeode(s, d);
        if (!out) return;
        setLastGeode(out);
        say(`Geode: ${out.title}, ${out.sub}`);
        render();
    };

    const hi = skillXpFor(lvl + 1, undefined);
    const lo = skillXpFor(lvl, undefined);
    const open = openOres(s);
    const nextOre = ORES.find((o) => !oreOpen(s, o));
    const totalMined = ORES.reduce((a, o) => a + (m.mined[o.id] || 0), 0);
    const pp = pickPower(s);

    return (
        <div className="fi-mn">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Pick power" value={`x${pp.toFixed(pp < 10 ? 2 : 1)}`} sub={pickOf(s).name} color={pickOf(s).color} tip={<TipCard title="Pick power" color={pickOf(s).color} lines={["Damage dealt by every tap. A node breaks when its health runs out."]} rows={[["Pickaxe", pickOf(s).name], ["Efficiency", `+${upLevel(s, "eff") * 10}%`], ["Each pickaxe tier", `+${fmtPct(PICK_CLICK)} click power`]]} />} />
                <Stat label="Ore mined" value={F(Math.floor(totalMined))} sub={`${F(m.nodes)} nodes broken`} color={C} tip={<TipCard title="Ore mined" color={C} lines={["Everything you have ever mined, by hand or by drill."]} rows={[["Nodes broken", F(m.nodes)], ["Golden nodes", F(m.golden)]]} />} />
                <Stat label="Drills" value={`${totalDrillRate(s).toFixed(totalDrillRate(s) < 10 ? 2 : 1)}/s`} sub="ore per second" color="var(--mc-aqua)" tip={<TipCard title="Drills" color="var(--mc-aqua)" lines={["Drills mine ore for you, and keep going while you are away."]} rows={[["Drill tech", `+${upLevel(s, "drillt") * 15}%`]]} />} />
                <Stat label="Geodes" value={String(m.geodes)} sub={`${F(m.cracked)} cracked`} color="var(--mc-light-purple)" tip={<TipCard title="Geodes" color="var(--mc-light-purple)" lines={["Crack them for tokens, eggs, dust, shards, Fragments and rarely an ascension point."]} rows={[["Drop chance per node", fmtPct(geodeChance(s))]]} />} />
            </div>
            <Progress label={`Mining ${lvl}`} color={C} pct={lvl >= SKILL_CAP ? 1 : (s.mining - lo) / (hi - lo)} right={lvl >= SKILL_CAP ? "MAX" : `${Math.floor(Math.max(0, (s.mining - lo) / (hi - lo)) * 100)}% to ${lvl + 1}`} />

            <div className="fi-mn-seg" role="tablist">
                {([["dig", "Dig"], ["forge", "Forge"], ["drills", "Drills"], ["collection", "Collection"]] as const).map(([v, label]) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} data-on={view === v} onClick={() => setView(v)}>
                        {label}
                    </button>
                ))}
            </div>

            {view === "dig" && (
                <>
                    <div ref={stage} className="fi-mn-stage" style={{ ["--pc" as string]: pickOf(s).color } as CSSProperties}>
                        {nodes.current.map((n, i) => {
                            const o = n ? ORE_BY_ID[n.ore] : null;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    data-slot={i}
                                    data-empty={!n}
                                    data-gold={n?.golden}
                                    disabled={!n}
                                    className="fi-mn-node"
                                    aria-label={n && o ? `${n.golden ? "Golden " : ""}${o.name} ore, ${Math.max(1, Math.ceil(n.hp))} of ${n.max} health left. Tap to mine.` : "Mined out, regrowing"}
                                    style={{ ["--oc" as string]: o?.color ?? "#555", ["--dmg" as string]: n ? 1 - Math.max(0, n.hp) / n.max : 0 } as CSSProperties}
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        tap(i);
                                    }}
                                    onClick={(e) => {
                                        if (e.detail === 0) tap(i); // keyboard (Enter)
                                    }}
                                >
                                    <span className={`fi-mn-rock ${hits.current[i] % 2 ? "a" : "b"}`} key={`${i}:${gens.current[i]}:${hits.current[i]}`} />
                                    {n && o && (
                                        <>
                                            <span className="fi-mn-name">{n.golden ? "Golden " : ""}{o.name}</span>
                                            <span className="fi-mn-hp">
                                                <i style={{ width: `${Math.max(0, n.hp / n.max) * 100}%` }} />
                                            </span>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="fi-mn-geode">
                        <span className="fi-mn-geode-n">
                            <McSymbol name="gem" /> <b>{m.geodes}</b> {m.geodes === 1 ? "geode" : "geodes"}
                        </span>
                        <Tip box tip={<TipCard title="Crack a geode" color="var(--mc-light-purple)" lines={["A random reward: dust, tokens, an egg, shards, a Fragment or an ascension point."]} foot={m.geodes ? undefined : "Break nodes to find geodes."} />}>
                            <button type="button" disabled={!m.geodes} onClick={crack} className="fi-mn-crack" data-ready={m.geodes > 0}>
                                Crack
                            </button>
                        </Tip>
                        <span className="fi-mn-result" key={m.cracked} style={lastGeode ? { color: lastGeode.color } : undefined}>
                            {lastGeode ? `${lastGeode.title}: ${lastGeode.sub}` : "Geodes drop from nodes."}
                        </span>
                    </div>

                    <div className="fi-mn-info">
                        <span>
                            Tap power <b>x{pp.toFixed(pp < 10 ? 2 : 1)}</b> · Ore per node <b>x{yieldMult(s).toFixed(2)}</b> · Triple haul <b>{fmtPct(luckyChance(s))}</b>
                        </span>
                        {lvl >= 10 && (
                            <label className="fi-mn-focus">
                                Prospect
                                <select
                                    value={m.focus}
                                    onChange={(e) => {
                                        setFocus(s, e.target.value);
                                        render();
                                    }}
                                >
                                    <option value="">Anything</option>
                                    {open.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>

                    <div className="fi-mn-stock">
                        {open.map((o) => (
                            <Tip key={o.id} tip={<OreTip s={s} d={d} o={o} F={F} />}>
                                <span className="fi-mn-chip" style={{ ["--oc" as string]: o.color } as CSSProperties}>
                                    <i />
                                    {o.name} <b>{F(Math.floor(have(s, o.id)))}</b>
                                </span>
                            </Tip>
                        ))}
                        {nextOre && (
                            <span className="fi-mn-chip locked">
                                <Lock className="size-3" /> {nextOre.name} at Mining {nextOre.need}
                            </span>
                        )}
                    </div>
                </>
            )}

            {view === "forge" && <Forge s={s} F={F} render={render} say={say} />}
            {view === "drills" && <Drills s={s} F={F} render={render} />}
            {view === "collection" && <Collection s={s} F={F} />}
        </div>
    );
}

// ---- Small pieces ----

function Stat({ label, value, sub, color, tip }: { label: string; value: string; sub: string; color: string; tip: React.ReactNode }) {
    return (
        <Tip tip={tip}>
            <div className="fi-mn-stat" style={{ ["--c" as string]: color } as CSSProperties}>
                <span>{label}</span>
                <b>{value}</b>
                <small>{sub}</small>
            </div>
        </Tip>
    );
}

function OreTip({ s, d, o, F }: { s: Ctx["s"]; d: Ctx["d"]; o: OreDef; F: (n: number) => string }) {
    const tier = colTierOf(s.mine.mined[o.id] || 0);
    return (
        <TipCard
            title={o.name}
            color={o.color}
            tag={`Mining ${o.need}`}
            rows={[
                ["Health", `${o.hp} taps at power 1`],
                ["Shards per node", F(nodeShards(d, o, false))],
                ["Mining XP per node", F(oreXp(o))],
                ["Drill", `${o.drill}/s each`],
                ["Collection", `tier ${tier}/${COL_AT.length}`, o.color],
            ]}
            notes={[{ text: `Collection pays +${fmtPct(o.col[1])} ${o.colText} per tier`, color: o.color }]}
        />
    );
}

function Cost({ s, cost }: { s: Ctx["s"]; cost: Partial<Record<OreId, number>> }) {
    return (
        <span className="fi-mn-cost">
            {Object.entries(cost).map(([id, n]) => {
                const o = ORE_BY_ID[id as OreId];
                const ok = have(s, o.id) >= (n ?? 0);
                return (
                    <span key={id} className="fi-mn-chip small" data-ok={ok} style={{ ["--oc" as string]: o.color } as CSSProperties}>
                        <i />
                        {n} {o.name}
                    </span>
                );
            })}
        </span>
    );
}

// ---- Forge: pickaxes and upgrades ----

function upEffect(u: MineUpDef, lvl: number): string {
    switch (u.id) {
        case "eff": return `+${lvl * 10}% pick power`;
        case "fort": return `+${lvl * 8}% ore per node`;
        case "haste": return `${(Math.pow(0.94, lvl) * 100).toFixed(0)}% respawn time`;
        case "lucky": return `${+(lvl * 1.5).toFixed(1)}% triple haul`;
        case "seeker": return `+${lvl * 10}% geode chance`;
        case "prosp": return `${lvl} levels of rarer ore`;
        case "drillt": return `+${lvl * 15}% drill output`;
        case "scholar": return `+${lvl * 6}% Mining XP`;
        case "deep": return `+${lvl}% all shards`;
        default: return `+${+(lvl * 1.5).toFixed(1)}% all shards, +${lvl * 2}% tokens`;
    }
}

function Forge({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    const cur = pickOf(s);
    const next = PICKS[s.mine.pick + 1];
    const can = canBuyPick(s);
    const lvl = mineLevel(s);
    return (
        <>
            <div className="fi-mn-pick" style={{ ["--c" as string]: (next ?? cur).color } as CSSProperties}>
                <span className="fi-mn-pick-i"><McSymbol name="pick" /></span>
                <div className="min-w-0 flex-1">
                    <div className="fi-mn-pick-t">{next ? next.name : cur.name}</div>
                    <div className="fi-mn-pick-s">
                        {next ? (
                            <>
                                Power x{cur.power} <em>▸</em> <b>x{next.power}</b> · +{fmtPct(PICK_CLICK)} click power forever
                            </>
                        ) : (
                            "The best pickaxe there is."
                        )}
                    </div>
                    {next && <Cost s={s} cost={next.cost} />}
                </div>
                {next && (
                    <Tip box tip={<TipCard title={`Forge ${next.name}`} color={next.color} lines={["Consumes the ore shown and replaces your pickaxe."]} foot={can.ok ? "Click to forge!" : can.why} />}>
                        <button
                            type="button"
                            disabled={!can.ok}
                            onClick={() => {
                                if (buyPick(s)) {
                                    say(`Forged the ${next.name}!`);
                                    render();
                                }
                            }}
                            className="fi-mn-buy"
                        >
                            {lvl < next.need ? <><Lock className="mr-1 inline size-3" />Mining {next.need}</> : "Forge"}
                        </button>
                    </Tip>
                )}
            </div>

            <SectionTitle color={C}>Upgrades</SectionTitle>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {MINE_UPS.map((u) => {
                    const l = upLevel(s, u.id);
                    const locked = lvl < u.need;
                    const maxed = l >= u.max;
                    const c = canBuyUp(s, u);
                    const o = ORE_BY_ID[u.ore];
                    return (
                        <div key={u.id} className="fi-mn-up" data-locked={locked} style={{ ["--c" as string]: o.color } as CSSProperties}>
                            <div className="fi-mn-up-h">
                                <b>{u.name}</b>
                                <span>{l}/{u.max}</span>
                            </div>
                            <div className="fi-mn-up-d">{locked ? <><Lock className="mr-1 inline size-3" />Opens at Mining {u.need}</> : u.desc}</div>
                            <div className="fi-mn-up-e">
                                {l > 0 ? upEffect(u, l) : "no bonus yet"} <em>▸</em> <b>{maxed ? "max" : upEffect(u, l + 1)}</b>
                            </div>
                            <div className="fi-mn-up-f">
                                {maxed ? <span className="fi-mn-maxed">Maxed</span> : <Cost s={s} cost={{ [u.ore]: upCost(s, u) }} />}
                                <button
                                    type="button"
                                    disabled={!c.ok}
                                    onClick={() => {
                                        if (buyMineUp(s, u.id)) render();
                                    }}
                                    className="fi-mn-buy small"
                                >
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="fi-mn-note">Everything here is permanent: rebirths and ascensions never touch your mine. Current pickaxe: {cur.name}. Ore in stock: {F(Math.floor(ORES.reduce((a, o) => a + have(s, o.id), 0)))}.</p>
        </>
    );
}

// ---- Drills ----

function Drills({ s, F, render }: { s: Ctx["s"]; F: (n: number) => string; render: () => void }) {
    const rows = ORES.filter((o, i) => oreOpen(s, o) || (i > 0 && oreOpen(s, ORES[i - 1])) || i === 0);
    return (
        <>
            <p className="fi-mn-note">Drills mine ore on their own, while you play and while you are away. Each drill is paid for in the ore it mines.</p>
            <div className="fi-mn-drills">
                {rows.map((o) => {
                    const n = s.mine.drills[o.id] || 0;
                    const open = oreOpen(s, o);
                    const c = canBuyDrill(s, o);
                    return (
                        <div key={o.id} className="fi-mn-drill" data-locked={!open} style={{ ["--oc" as string]: o.color } as CSSProperties}>
                            <span className="fi-mn-chip big">
                                <i />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="fi-mn-drill-t">
                                    {o.name} <span>x{n}</span>
                                </div>
                                <div className="fi-mn-drill-s">
                                    {open ? `${drillRate(s, o).toFixed(2)}/s total · ${o.drill}/s each` : <><Lock className="mr-1 inline size-3" />Opens at Mining {o.need}</>}
                                </div>
                            </div>
                            {open && <Cost s={s} cost={{ [o.id]: drillCost(s, o) }} />}
                            <button
                                type="button"
                                disabled={!c.ok}
                                onClick={() => {
                                    if (buyDrill(s, o.id)) render();
                                }}
                                className="fi-mn-buy small"
                            >
                                Build
                            </button>
                        </div>
                    );
                })}
            </div>
            <p className="fi-mn-note">Total: {totalDrillRate(s).toFixed(2)} ore/s · {F(Object.values(s.mine.drills).reduce((a, b) => a + b, 0))} drills built.</p>
        </>
    );
}

// ---- Collection ----

function Collection({ s, F }: { s: Ctx["s"]; F: (n: number) => string }) {
    return (
        <>
            <p className="fi-mn-note">Every ore you mine fills its collection. Each tier pays a permanent bonus for the rest of the game.</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ORES.map((o) => {
                    const mined = s.mine.mined[o.id] || 0;
                    const tier = colTierOf(mined);
                    const next = COL_AT[tier];
                    const prev = tier > 0 ? COL_AT[tier - 1] : 0;
                    const open = oreOpen(s, o) || mined > 0;
                    return (
                        <div key={o.id} className="fi-mn-col" data-locked={!open} style={{ ["--oc" as string]: o.color } as CSSProperties}>
                            <div className="fi-mn-col-h">
                                <span className="fi-mn-chip big">
                                    <i />
                                </span>
                                <b>{open ? o.name : "???"}</b>
                                <span className="fi-mn-col-n">{F(Math.floor(mined))} mined</span>
                            </div>
                            <div className="fi-mn-pips">
                                {COL_AT.map((_, i) => (
                                    <i key={i} data-on={i < tier} />
                                ))}
                            </div>
                            <div className="fi-mn-col-r">
                                {open ? (
                                    <>
                                        <span style={{ color: o.color }}>+{fmtPct(o.col[1] * tier)}</span> {o.colText}
                                        {next ? <em> · next tier +{fmtPct(o.col[1])} at {F(next)}</em> : <em> · complete</em>}
                                    </>
                                ) : (
                                    <>Opens at Mining {o.need}</>
                                )}
                            </div>
                            {next && open && <div className="fi-mn-col-bar"><i style={{ width: `${Math.min(1, (mined - prev) / (next - prev)) * 100}%` }} /></div>}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export const MINE_CSS = `
.fi-mn{display:flex;flex-direction:column;gap:.55rem}
.fi-mn-stat{display:flex;flex-direction:column;border-radius:.75rem;border:1px solid color-mix(in oklch,var(--c) 40%,transparent);background:linear-gradient(140deg,color-mix(in oklch,var(--c) 10%,transparent),transparent);padding:.4rem .6rem;min-width:0}
.fi-mn-stat span{font-family:var(--font-minecraft,inherit);font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-mn-stat b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:1.1rem;line-height:1.15;color:var(--c);text-shadow:0 0 12px color-mix(in oklch,var(--c) 60%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-stat small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-seg{display:flex;border-radius:.6rem;border:1px solid rgba(255,255,255,.14);overflow:hidden}
.fi-mn-seg button{flex:1;padding:.4rem;font-family:var(--font-minecraft,inherit);font-size:.72rem;color:var(--muted-foreground);transition:background .15s,color .15s}
.fi-mn-seg button[data-on="true"]{background:color-mix(in oklch,${C} 22%,transparent);color:${C};box-shadow:inset 0 -2px 0 ${C}}
.fi-mn-stage{--pc:${C};position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:.55rem;height:15.5rem;padding:.65rem;border-radius:1.1rem;overflow:hidden;border:1px solid color-mix(in oklch,var(--pc) 45%,transparent);background:radial-gradient(ellipse at 50% 0%,color-mix(in oklch,var(--pc) 12%,#1b1710),#0d0b08 75%);box-shadow:inset 0 0 40px rgba(0,0,0,.55),0 0 26px -12px var(--pc);isolation:isolate;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.fi-mn-stage::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.5;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.2px);background-size:16px 16px}
.fi-mn-node{position:relative;display:block;min-width:0;min-height:0;border-radius:.8rem;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;outline:none}
.fi-mn-node:focus-visible{outline:2px solid var(--oc);outline-offset:2px}
.fi-mn-rock{position:absolute;inset:0;border-radius:.8rem;background:radial-gradient(circle at 26% 30%,var(--oc) 0 8%,transparent 9%),radial-gradient(circle at 70% 24%,var(--oc) 0 6.5%,transparent 7.5%),radial-gradient(circle at 52% 62%,var(--oc) 0 10%,transparent 11%),radial-gradient(circle at 22% 74%,var(--oc) 0 5.5%,transparent 6.5%),radial-gradient(circle at 80% 70%,var(--oc) 0 7.5%,transparent 8.5%),linear-gradient(145deg,#5d5d6b,#383843);box-shadow:inset 0 0 0 2px rgba(255,255,255,.08),inset 0 -8px 14px rgba(0,0,0,.42),0 4px 0 rgba(0,0,0,.4),0 0 16px -8px var(--oc);animation:fi-mn-in .3s cubic-bezier(.2,1.6,.4,1) both}
.fi-mn-rock.a{animation:fi-mn-hit-a .16s ease-out}
.fi-mn-rock.b{animation:fi-mn-hit-b .16s ease-out}
.fi-mn-rock::after{content:"";position:absolute;inset:0;border-radius:inherit;opacity:calc(var(--dmg) * .95);background:linear-gradient(115deg,transparent 46%,rgba(0,0,0,.65) 47% 48.5%,transparent 50%),linear-gradient(35deg,transparent 52%,rgba(0,0,0,.6) 53% 54.5%,transparent 56%),linear-gradient(160deg,transparent 30%,rgba(0,0,0,.5) 31% 32.5%,transparent 34%)}
.fi-mn-node:active:not(:disabled) .fi-mn-rock{filter:brightness(1.25)}
.fi-mn-node[data-gold="true"] .fi-mn-rock{box-shadow:inset 0 0 0 2px #ffd23a,inset 0 -8px 14px rgba(0,0,0,.35),0 4px 0 rgba(0,0,0,.4),0 0 22px 0 #ffd23a;animation:fi-mn-in .3s cubic-bezier(.2,1.6,.4,1) both,fi-mn-gold 1.3s ease-in-out .3s infinite}
.fi-mn-node[data-empty="true"]{cursor:default}
.fi-mn-node[data-empty="true"] .fi-mn-rock{display:none}
.fi-mn-node[data-empty="true"]::before{content:"";position:absolute;inset:.35rem;border-radius:.7rem;border:2px dashed rgba(255,255,255,.12);animation:fi-pulse 1.4s ease-in-out infinite}
.fi-mn-name{position:absolute;left:.2rem;right:.2rem;top:.3rem;text-align:center;font-family:var(--font-minecraft,inherit);font-size:.62rem;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.8),0 0 6px rgba(0,0,0,.8);pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-hp{position:absolute;left:.4rem;right:.4rem;bottom:.4rem;height:.28rem;border-radius:999px;background:rgba(0,0,0,.55);overflow:hidden;pointer-events:none}
.fi-mn-hp i{display:block;height:100%;border-radius:inherit;background:var(--oc);box-shadow:0 0 6px var(--oc);transition:width .08s}
.fi-mn-pop{position:absolute;z-index:5;transform:translateX(-50%);pointer-events:none;font-family:var(--font-minecraft,inherit);font-size:.8rem;white-space:nowrap;text-shadow:0 1px 0 #000,0 0 8px rgba(0,0,0,.8);animation:fi-mn-pop 1s ease-out forwards}
.fi-mn-pop.big{font-size:1rem;animation-duration:1.3s}
.fi-mn-spark{position:absolute;z-index:4;width:.3rem;height:.3rem;border-radius:1px;pointer-events:none}
@keyframes fi-mn-in{from{transform:scale(.3);opacity:0}}
@keyframes fi-mn-hit-a{0%{transform:scale(.9) rotate(-2.5deg)}100%{transform:none}}
@keyframes fi-mn-hit-b{0%{transform:scale(.9) rotate(2.5deg)}100%{transform:none}}
@keyframes fi-mn-gold{50%{filter:brightness(1.25)}}
@keyframes fi-mn-pop{0%{opacity:0;margin-top:.4rem}12%{opacity:1}100%{opacity:0;margin-top:-2.2rem}}
.fi-mn-geode{display:flex;align-items:center;gap:.6rem;min-height:2.6rem;padding:.3rem .55rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--mc-light-purple) 40%,transparent);background:linear-gradient(120deg,color-mix(in oklch,var(--mc-light-purple) 9%,transparent),transparent)}
.fi-mn-geode-n{flex:none;font-family:var(--font-minecraft,inherit);font-size:.78rem;color:var(--mc-light-purple)}
.fi-mn-geode-n b{font-weight:400;font-size:1rem}
.fi-mn-crack{flex:none;min-width:4.6rem;padding:.4rem .8rem;border-radius:.6rem;border:1px solid color-mix(in oklch,var(--mc-light-purple) 65%,transparent);background:color-mix(in oklch,var(--mc-light-purple) 20%,transparent);color:#fff;font-family:var(--font-minecraft,inherit);font-size:.75rem;transition:transform .1s,background .15s,opacity .15s;touch-action:manipulation}
.fi-mn-crack[data-ready="true"]{animation:fi-mn-ready 1.6s ease-in-out infinite}
.fi-mn-crack:hover:not(:disabled){background:color-mix(in oklch,var(--mc-light-purple) 34%,transparent)}
.fi-mn-crack:active:not(:disabled){transform:scale(.94)}
.fi-mn-crack:disabled{opacity:.4;cursor:not-allowed}
@keyframes fi-mn-ready{50%{box-shadow:0 0 18px 0 var(--mc-light-purple)}}
.fi-mn-result{min-width:0;flex:1;font-family:var(--font-rubik,inherit);font-size:.7rem;font-weight:600;color:var(--muted-foreground);animation:fi-mn-res .4s ease-out;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes fi-mn-res{from{opacity:0;transform:translateX(6px)}}
.fi-mn-info{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.3rem .8rem;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.fi-mn-info b{font-weight:600;color:#fff}
.fi-mn-focus{display:flex;align-items:center;gap:.4rem}
.fi-mn-focus select{border-radius:.5rem;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.4);color:#fff;padding:.2rem .4rem;font-size:.7rem}
.fi-mn-stock{display:flex;flex-wrap:wrap;gap:.3rem}
.fi-mn-chip{display:inline-flex;align-items:center;gap:.35rem;padding:.12rem .55rem .12rem .3rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--oc) 45%,transparent);background:color-mix(in oklch,var(--oc) 10%,transparent);font-family:var(--font-rubik,inherit);font-size:.66rem;color:#e6e2f0;white-space:nowrap}
.fi-mn-chip i{display:block;flex:none;width:.7rem;height:.7rem;border-radius:.2rem;background:var(--oc);box-shadow:0 0 6px var(--oc)}
.fi-mn-chip b{font-family:var(--font-minecraft,inherit);font-weight:400;color:var(--oc)}
.fi-mn-chip.locked{border-style:dashed;border-color:rgba(255,255,255,.18);background:transparent;color:var(--muted-foreground);padding-left:.5rem}
.fi-mn-chip.small{font-size:.6rem;padding:.05rem .45rem .05rem .3rem}
.fi-mn-chip.small[data-ok="false"]{border-color:color-mix(in oklch,var(--mc-red) 55%,transparent);color:#ffb3b3}
.fi-mn-chip.big{padding:.3rem;border-radius:.6rem}
.fi-mn-chip.big i{width:1.4rem;height:1.4rem;border-radius:.35rem}
.fi-mn-cost{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.25rem}
.fi-mn-pick{display:flex;align-items:center;gap:.7rem;padding:.6rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 50%,transparent);background:linear-gradient(130deg,color-mix(in oklch,var(--c) 14%,transparent),transparent 70%)}
.fi-mn-pick-i{display:grid;place-items:center;flex:none;width:2.8rem;height:2.8rem;border-radius:.8rem;font-size:1.6rem;color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 40%,transparent)}
.fi-mn-pick-t{font-family:var(--font-minecraft,inherit);font-size:.95rem;color:var(--c);text-shadow:0 0 10px color-mix(in oklch,var(--c) 50%,transparent)}
.fi-mn-pick-s{font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.fi-mn-pick-s b,.fi-mn-up-e b{color:var(--mc-green);font-weight:600}
.fi-mn-pick-s em,.fi-mn-up-e em{font-style:normal;opacity:.55;margin:0 .1rem}
.fi-mn-buy{flex:none;min-width:5rem;padding:.5rem .8rem;border-radius:.65rem;border:1px solid color-mix(in oklch,var(--mc-green) 65%,transparent);background:color-mix(in oklch,var(--mc-green) 16%,transparent);color:var(--mc-green);font-family:var(--font-minecraft,inherit);font-size:.75rem;transition:transform .1s,background .15s,opacity .15s;touch-action:manipulation}
.fi-mn-buy.small{min-width:4.2rem;padding:.35rem .6rem;font-size:.7rem}
.fi-mn-buy:hover:not(:disabled){background:color-mix(in oklch,var(--mc-green) 28%,transparent)}
.fi-mn-buy:active:not(:disabled){transform:scale(.94)}
.fi-mn-buy:disabled{opacity:.4;border-color:rgba(255,255,255,.18);background:transparent;color:var(--muted-foreground);cursor:not-allowed}
.fi-mn-up{display:flex;flex-direction:column;gap:.2rem;padding:.5rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--c) 30%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--c) 7%,transparent),transparent 70%);min-width:0}
.fi-mn-up[data-locked="true"]{opacity:.55}
.fi-mn-up-h{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-minecraft,inherit);font-size:.82rem;color:var(--c)}
.fi-mn-up-h b{font-weight:400}
.fi-mn-up-h span{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-mn-up-d{font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-mn-up-e{font-family:var(--font-rubik,inherit);font-size:.68rem;color:#e6e2f0}
.fi-mn-up-f{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.15rem}
.fi-mn-up-f .fi-mn-cost{margin-top:0}
.fi-mn-maxed{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:var(--mc-yellow)}
.fi-mn-note{margin:0;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-mn-drills{display:flex;flex-direction:column;gap:.35rem}
.fi-mn-drill{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.45rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--oc) 30%,transparent);background:linear-gradient(120deg,color-mix(in oklch,var(--oc) 7%,transparent),transparent 70%)}
.fi-mn-drill[data-locked="true"]{opacity:.5}
.fi-mn-drill-t{font-family:var(--font-minecraft,inherit);font-size:.82rem;color:var(--oc)}
.fi-mn-drill-t span{font-family:var(--font-rubik,inherit);font-size:.65rem;color:var(--muted-foreground)}
.fi-mn-drill-s{font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-mn-drill .fi-mn-cost{margin-top:0}
.fi-mn-col{display:flex;flex-direction:column;gap:.3rem;padding:.5rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--oc) 30%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--oc) 7%,transparent),transparent 70%);min-width:0}
.fi-mn-col[data-locked="true"]{opacity:.5}
.fi-mn-col-h{display:flex;align-items:center;gap:.5rem}
.fi-mn-col-h b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.85rem;color:var(--oc)}
.fi-mn-col-n{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-mn-pips{display:flex;gap:.25rem}
.fi-mn-pips i{flex:1;height:.3rem;border-radius:999px;background:rgba(255,255,255,.1)}
.fi-mn-pips i[data-on="true"]{background:var(--oc);box-shadow:0 0 6px var(--oc)}
.fi-mn-col-r{font-family:var(--font-rubik,inherit);font-size:.66rem;color:#e6e2f0}
.fi-mn-col-r em{font-style:normal;color:var(--muted-foreground)}
.fi-mn-col-bar{height:2px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.fi-mn-col-bar i{display:block;height:100%;background:var(--oc)}
@media (max-width:639px){.fi-mn-stage{height:13.5rem;gap:.45rem;padding:.5rem}.fi-mn-geode{flex-wrap:wrap}.fi-mn-result{flex-basis:100%}}
@media (prefers-reduced-motion:reduce){.fi-mn-rock,.fi-mn-crack,.fi-mn-pop,.fi-mn-result,.fi-mn-node[data-empty="true"]::before{animation:none!important}}
`;


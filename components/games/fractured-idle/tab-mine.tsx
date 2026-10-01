"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { SKILL_CAP, fmtTime, skillXpFor } from "@/lib/fractured-idle/engine";
import { ISLAND_BY_ID, type Dim } from "@/lib/fractured-idle/islands";
import { activeIsland, openIslands } from "@/lib/fractured-idle/island-logic";
import {
    COL_AT,
    DIMS,
    DIM_LABEL,
    DIM_ORES,
    GEODES,
    INGOTS,
    ITEMS,
    MINE_UPS,
    ORES,
    ORE_BY_ID,
    PICKS,
    PICK_CLICK,
    RECIPES,
    RELICS,
    SET_STEPS,
    buyDrill,
    buyMineUp,
    buyPick,
    canAfford,
    canBuyDrill,
    canBuyPick,
    canBuyUp,
    canCraft,
    collectAll,
    collectJob,
    colTierOf,
    comboFactor,
    crackGeode,
    dimSet,
    drillBoost,
    drillCost,
    drillDmg,
    drillMult,
    drillSwings,
    eff,
    forgeSlots,
    forgeSpeed,
    geodeChance,
    geodeCount,
    have,
    haveOre,
    hasRelic,
    idleSwings,
    itemCount,
    jobLeft,
    jobSeconds,
    jobsReady,
    luckyChance,
    maxBatch,
    mineCtx,
    mineLevel,
    onSwing,
    oreIslands,
    oreTable,
    oreXp,
    passiveSwings,
    pickOf,
    pickPower,
    pushLog,
    resInfo,
    rushLen,
    rushMult,
    setFocus,
    slotsFree,
    startCraft,
    swingShards,
    totalCost,
    totalDrills,
    upCost,
    upLevel,
    consumeItem,
    veinNeed,
    yieldMult,
    type Cost,
    type ItemId,
    type MineUpDef,
    type OreDef,
    type OreId,
    type RecipeDef,
    type ResId,
    type SwingOut,
} from "@/lib/fractured-idle/mine";
import { Tip, TipCard } from "./tooltip";
import { Progress, SectionTitle, type Ctx } from "./ui";

// The Mine. Every press of the big button is a swing of the pickaxe (the rules
// live in lib/fractured-idle/mine.ts): this tab shows what the swings are
// hitting, spends the ore, and runs the Forge. Nothing here needs tapping: the
// rock face reacts to the big button, drills and the passive trickle keep mining
// whether this tab is open or not, and Forge crafts finish on real time so there
// is always something waiting when you come back. Taps and buttons stay where
// they are while numbers change, like the Roll button in Enchant.

const C = "#e0b070";
type View = "dig" | "gear" | "drills" | "forge" | "ores";

const fmtPct = (n: number) => `${+(n * 100).toFixed(1)}%`;
const amt = (F: (n: number) => string, n: number) => (n >= 1000 ? F(Math.floor(n)) : n >= 100 ? String(Math.floor(n)) : String(+n.toFixed(n < 10 ? 2 : 1)));
const col = (c: string) => ({ ["--oc" as string]: c }) as CSSProperties;

// The ore blobs drawn on the rock face: fixed spots, shared out by the island's odds.
const BLOBS: [number, number, number][] = [
    [8, 22, 11], [22, 62, 9], [31, 18, 7], [42, 48, 12], [55, 20, 8], [64, 66, 10], [74, 30, 11], [86, 58, 8],
    [14, 82, 7], [48, 80, 9], [90, 16, 7], [36, 34, 6], [70, 84, 7], [58, 46, 6], [82, 80, 6], [26, 40, 6],
];

export function MineTab({ s, d, F, render, say }: Ctx) {
    const m = s.mine;
    const lvl = mineLevel(s);
    const [view, setView] = useState<View>("dig");
    const ready = jobsReady(s);
    const hi = skillXpFor(lvl + 1, undefined);
    const lo = skillXpFor(lvl, undefined);
    const pp = pickPower(s);
    const ctx = mineCtx(d);
    const idle = idleSwings(s, d.auto);
    const mined = ORES.reduce((a, o) => a + (m.mined[o.id] || 0), 0);
    const geodes = geodeCount(s);

    return (
        <div className="fi-mn">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Pick power" value={`x${pp.toFixed(pp < 10 ? 2 : 1)}`} sub={pickOf(s).name} color={pickOf(s).color} tip={<TipCard title="Pick power" color={pickOf(s).color} lines={["Damage of every swing. Hard ore needs a strong pick to give a whole ore per swing."]} rows={[["Pickaxe", pickOf(s).name], ["Efficiency", `+${upLevel(s, "eff") * 6}%`], ["Relics", `+${(hasRelic(s, "grip") ? 10 : 0) + (hasRelic(s, "anchor") ? 15 : 0)}%`], ["Each pickaxe tier", `+${fmtPct(PICK_CLICK)} click power`]]} />} />
                <Stat label="Idle swings" value={`${idle.toFixed(idle < 10 ? 1 : 0)}/s`} sub={`${F(totalDrills(s))} drills, always on`} color="var(--mc-aqua)" tip={<IdleTip s={s} auto={d.auto} />} />
                <Stat label="Ore mined" value={F(Math.floor(mined))} sub={`${F(Math.floor(m.nodes))} swings`} color={C} tip={<TipCard title="Ore mined" color={C} lines={["Everything you have mined, by hand, by auto-click or by drill."]} rows={[["Swings", F(Math.floor(m.nodes))], ["Ore Rushes", F(m.rushes)], ["Crafts collected", F(m.crafted)]]} />} />
                <Stat label="Geodes" value={String(geodes)} sub={`${F(m.cracked)} cracked`} color="var(--mc-light-purple)" tip={<TipCard title="Geodes" color="var(--mc-light-purple)" lines={["Swings sometimes drop one. The Nether and the End drop richer ones."]} rows={[["Chance per swing", fmtPct(geodeChance(s))], ...DIMS.map((dm) => [GEODES[dm].name, String(m.geodes[dm] || 0), GEODES[dm].color] as [string, string, string])]} />} />
            </div>
            <Progress label={`Mining ${lvl}`} color={C} pct={lvl >= SKILL_CAP ? 1 : (s.mining - lo) / (hi - lo)} right={lvl >= SKILL_CAP ? "MAX" : `${Math.floor(Math.max(0, (s.mining - lo) / (hi - lo)) * 100)}% to ${lvl + 1}`} />

            <div className="fi-mn-seg" role="tablist">
                {([["dig", "Mine"], ["gear", "Gear"], ["drills", "Drills"], ["forge", "Forge"], ["ores", "Ores"]] as const).map(([v, label]) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} data-on={view === v} onClick={() => setView(v)}>
                        {label}
                        {v === "forge" && ready > 0 && <i className="fi-mn-dot">{ready}</i>}
                        {v === "dig" && geodes > 0 && <i className="fi-mn-dot gem">{geodes}</i>}
                    </button>
                ))}
            </div>

            {view === "dig" && <DigView s={s} d={d} F={F} render={render} say={say} />}
            {view === "gear" && <Gear s={s} F={F} render={render} say={say} />}
            {view === "drills" && <Drills s={s} d={d} F={F} render={render} />}
            {view === "forge" && <Forge s={s} d={d} F={F} render={render} say={say} ctx={ctx} />}
            {view === "ores" && <Ores s={s} F={F} />}
        </div>
    );
}

// ---- Small pieces ----

function Stat({ label, value, sub, color, tip }: { label: string; value: string; sub: string; color: string; tip: ReactNode }) {
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

function IdleTip({ s, auto }: { s: Ctx["s"]; auto: number }) {
    const dr = drillSwings(s);
    const pa = passiveSwings(s);
    return (
        <TipCard
            title="Idle swings"
            color="var(--mc-aqua)"
            lines={["Swings that happen with no button press. They run while you play and while you are away."]}
            rows={[["Drills", `${dr.toFixed(2)}/s`], ["Auto-clicks", `${auto.toFixed(2)}/s`], ["Pocket miner (level)", `${pa.toFixed(2)}/s`]]}
            notes={[{ text: "Each one hits a random ore from your island", color: "var(--mc-aqua)" }]}
        />
    );
}

function ResChip({ s, id, n, small = true }: { s: Ctx["s"]; id: ResId; n: number; small?: boolean }) {
    const r = resInfo(id);
    const ok = have(s, id) >= n;
    return (
        <span className={`fi-mn-chip${small ? " small" : ""}`} data-ok={ok} style={col(r.color)}>
            <i />
            {n} {r.name}
        </span>
    );
}

function CostRow({ s, cost }: { s: Ctx["s"]; cost: Cost }) {
    return (
        <span className="fi-mn-cost">
            {(Object.entries(cost) as [ResId, number][]).map(([id, n]) => (
                <ResChip key={id} s={s} id={id} n={n} />
            ))}
        </span>
    );
}

function upEffect(u: MineUpDef, l: number): string {
    switch (u.id) {
        case "eff": return `+${l * 6}% pick power`;
        case "fort": return `+${l * 8}% ore`;
        case "lucky": return `${+(l * 1.5).toFixed(1)}% triple haul`;
        case "seismic": return `vein: ${Math.max(25, Math.round(70 * Math.pow(0.96, l)))} swings`;
        case "seeker": return `+${l * 10}% geodes`;
        case "prosp": return l ? `rarer ore, level ${l}` : "off";
        case "rush": return `${8 + l * 2} swings, +${l * 10}% yield`;
        case "scholar": return `+${l * 6}% Mining XP`;
        case "deep": return `+${l}% all shards`;
        case "ancient": return `+${+(l * 1.5).toFixed(1)}% shards, +${l * 2}% tokens`;
        case "bit": return `+${l * 15}% drill damage`;
        case "motor": return `+${l * 6}% drill swings`;
        case "magnet": return `+${l * 5}% drill ore`;
        case "sifter": return `+${l * 12}% drill geodes`;
        case "cracker": return l ? `cracks one every ${Math.round(36 / l)}s` : "off";
        case "furnace": return `${1 + l} furnaces`;
        case "bellows": return `+${l * 8}% craft speed`;
        default: return `${l * 8}% double batches`;
    }
}

function UpgradeList({ s, cat, render }: { s: Ctx["s"]; cat: MineUpDef["cat"]; render: () => void }) {
    const lvl = mineLevel(s);
    return (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {MINE_UPS.filter((u) => u.cat === cat).map((u) => {
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
                        <div className="fi-mn-up-d">{locked ? <><Lock className="mr-1 inline size-3" />Opens at Mining {u.need}</> : u.desc}</div>
                        <div className="fi-mn-up-e">
                            {l > 0 ? upEffect(u, l) : "no bonus yet"} <em>▸</em> <b>{maxed ? "max" : upEffect(u, l + 1)}</b>
                        </div>
                        <div className="fi-mn-up-f">
                            {maxed ? <span className="fi-mn-maxed">Maxed</span> : <CostRow s={s} cost={upCost(s, u)} />}
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
    );
}

// ---- Mine: the rock face ----

function DigView({ s, d, F, render, say }: { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    const m = s.mine;
    const isl = activeIsland(s);
    const dim = DIM_LABEL[isl.dim];
    const rows = oreTable(s);
    const pp = pickPower(s);
    const rush = m.rush > 0;
    const face = useRef<HTMLDivElement>(null);
    const last = useRef<SwingOut | null>(null);
    const stamp = useRef({ pop: 0, spark: 0 });
    const [, bump] = useReducer((x: number) => x + 1, 0);
    const live = useRef({ s, d });
    useEffect(() => {
        live.current = { s, d };
    });

    // Blobs per ore, shared out by odds (the rock face is a picture of the table).
    const blobs: OreId[] = [];
    const open = rows.filter((r) => r.p > 0).sort((a, b) => b.p - a.p);
    if (open.length) {
        const left = BLOBS.length;
        const want = open.map((r) => Math.max(1, Math.round(r.p * left)));
        let i = 0;
        while (blobs.length < left) {
            const k = i % open.length;
            if (want[k] > 0) {
                blobs.push(open[k].ore.id);
                want[k]--;
            }
            i++;
            if (i > 200) break;
        }
        while (blobs.length < left) blobs.push(open[0].ore.id);
    }

    // The rock face reacts to every press of the big button (DOM only, so a fast hold never waits on React).
    useEffect(() => {
        const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const spark = (host: HTMLElement, color: string, n: number) => {
            if (reduced) return;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const dist = 22 + Math.random() * 46;
                const el = document.createElement("i");
                el.className = "fi-mn-spark";
                el.style.background = color;
                el.style.left = `${30 + Math.random() * 40}%`;
                el.style.top = `${30 + Math.random() * 40}%`;
                host.appendChild(el);
                el.animate(
                    [
                        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                        { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) scale(0)`, opacity: 0 },
                    ],
                    { duration: 380 + Math.random() * 260, easing: "cubic-bezier(.1,.7,.3,1)" },
                ).onfinish = () => el.remove();
            }
        };
        const pop = (host: HTMLElement, text: string, color: string, big = false) => {
            const el = document.createElement("span");
            el.className = `fi-mn-pop${big ? " big" : ""}`;
            el.textContent = text;
            el.style.color = color;
            el.style.left = `${35 + Math.random() * 30}%`;
            host.appendChild(el);
            el.onanimationend = () => el.remove();
        };
        const off = onSwing((e) => {
            const host = face.current;
            if (!host) return;
            last.current = e;
            const o = ORE_BY_ID[e.ore];
            const now = performance.now();
            if (!reduced) {
                host.querySelector<HTMLElement>(".fi-mn-pickfx")?.animate([{ transform: "rotate(-48deg)" }, { transform: "rotate(22deg)" }, { transform: "rotate(0deg)" }], { duration: 170, easing: "ease-out" });
                host.querySelectorAll<HTMLElement>(`[data-ore="${e.ore}"]`).forEach((b) => b.animate([{ filter: "brightness(2.4)", transform: "translate(-50%,-50%) scale(1.3)" }, { filter: "none", transform: "translate(-50%,-50%) scale(1)" }], { duration: 280 }));
                host.animate([{ transform: "translate(2px,1px)" }, { transform: "translate(-1px,0)" }, { transform: "none" }], { duration: 110 });
            }
            if (now - stamp.current.spark > 45) {
                stamp.current.spark = now;
                spark(host, o.color, e.rush ? 5 : e.lucky ? 6 : 3);
            }
            if (now - stamp.current.pop > 120 || e.rushStart || e.lucky || e.geode) {
                stamp.current.pop = now;
                pop(host, `+${amt((n) => String(Math.round(n)), e.units)} ${o.name}`, o.color, e.rush);
            }
            if (e.rushStart) pop(host, "ORE RUSH!", "#ffd23a", true);
            else if (e.lucky) pop(host, "TRIPLE HAUL!", "#ffe29a", true);
            if (e.geode) pop(host, `${GEODES[e.geode].name}!`, GEODES[e.geode].color, true);
        });
        // Drills and the passive trickle: soft sparks in the ore's colour, a few a second.
        const id = setInterval(() => {
            const host = face.current;
            if (!host || reduced) return;
            const { s: st, d: dd } = live.current;
            const rate = idleSwings(st, dd.auto);
            const t = oreTable(st).filter((r) => r.p > 0);
            if (!t.length) return;
            const n = Math.min(3, Math.round(rate * 0.25 + Math.random()));
            for (let i = 0; i < n; i++) {
                const r = t[Math.floor(Math.random() * t.length)];
                const el = document.createElement("i");
                el.className = "fi-mn-spark soft";
                el.style.background = r.ore.color;
                el.style.left = `${6 + Math.random() * 88}%`;
                el.style.top = `${12 + Math.random() * 70}%`;
                host.appendChild(el);
                el.animate([{ transform: "translate(-50%,-50%) scale(1.3)", opacity: 0.9 }, { transform: "translate(-50%,-90%) scale(0)", opacity: 0 }], { duration: 700 }).onfinish = () => el.remove();
            }
            bump();
        }, 500);
        return () => {
            off();
            clearInterval(id);
        };
    }, []);

    const geodes = geodeCount(s);
    const dimWithGeodes = DIMS.filter((x) => (m.geodes[x] || 0) > 0);
    const crackOne = (all: boolean) => {
        const ctx = mineCtx(d);
        let n = 0;
        let lastOut = "";
        for (const dm of DIMS) {
            while ((m.geodes[dm] || 0) > 0 && (all || n === 0)) {
                const out = crackGeode(s, ctx, dm);
                if (!out) break;
                n++;
                lastOut = `${out.title}: ${out.sub}`;
                pushLog(s, `${GEODES[dm].name}: ${out.sub}`, out.color);
            }
            if (!all && n) break;
        }
        if (n) {
            say(n === 1 ? `Geode: ${lastOut}` : `Cracked ${n} geodes. Latest: ${lastOut}`);
            render();
        }
    };
    const consume = (id: ItemId) => {
        const text = consumeItem(s, id, mineCtx(d));
        if (text) {
            say(text);
            render();
        }
    };
    const lo = last.current;

    return (
        <>
            <div ref={face} className="fi-mn-face" data-rush={rush} data-dim={isl.dim} style={{ ["--pc" as string]: pickOf(s).color, ["--dc" as string]: isl.dim === "overworld" ? "#8a7a60" : isl.dim === "nether" ? "#b5483f" : "#c48ae0" } as CSSProperties} role="img" aria-label={`The rock face on ${isl.name}: ${open.map((r) => `${Math.round(r.p * 100)}% ${r.ore.name}`).join(", ")}`}>
                {BLOBS.map(([x, y, r], i) => (
                    <i key={i} className="fi-mn-blob" data-ore={blobs[i]} style={{ left: `${x}%`, top: `${y}%`, width: `clamp(1.1rem, ${r * 0.9}%, 3rem)`, aspectRatio: "1", ["--oc" as string]: ORE_BY_ID[blobs[i] ?? "coal"].color } as CSSProperties} />
                ))}
                <span className="fi-mn-pickfx" style={{ ["--pc" as string]: pickOf(s).color } as CSSProperties}>
                    <McSymbol name="pick" />
                </span>
                <span className="fi-mn-where" style={{ color: dim.color }}>
                    {isl.name} <em>· {dim.name}</em>
                </span>
                <span className="fi-mn-hint">{lo ? "" : "Press the big button to swing!"}</span>
            </div>

            <div className="fi-mn-vein" data-rush={rush}>
                <div className="fi-mn-vein-h">
                    {rush ? (
                        <>
                            <b>ORE RUSH</b> <span>x{rushMult(s).toFixed(1)} ore · {m.rush} swings left</span>
                        </>
                    ) : (
                        <>
                            <b>Vein</b> <span>{Math.floor(m.vein * 100)}% to an Ore Rush</span>
                        </>
                    )}
                </div>
                <div className="fi-mn-vein-bar">
                    <i style={{ width: `${(rush ? m.rush / rushLen(s) : m.vein) * 100}%` }} />
                </div>
            </div>

            <div className="fi-mn-last">
                {lo ? (
                    <>
                        Last swing: <b style={{ color: ORE_BY_ID[lo.ore].color }}>+{amt(F, lo.units)} {ORE_BY_ID[lo.ore].name}</b>
                        {lo.lucky && <em> triple!</em>}
                        <span> · damage x{(pp * comboFactor(s.combo)).toFixed(pp < 10 ? 1 : 0)} at combo x{s.combo.toFixed(1)}</span>
                    </>
                ) : (
                    <>Swing damage is <b>x{pp.toFixed(pp < 10 ? 2 : 1)}</b>, and goes up with your combo. Hold the button!</>
                )}
            </div>

            <SectionTitle color={C}>Ore here</SectionTitle>
            <div className="fi-mn-table">
                {rows.map((r) => {
                    const o = r.ore;
                    const focus = m.focus === o.id;
                    return (
                        <Tip key={o.id} tip={<OreTip s={s} d={d} o={o} p={r.p} F={F} />}>
                            <div className="fi-mn-row" data-locked={!r.open} data-focus={focus} style={col(o.color)}>
                                <i className="fi-mn-sw" />
                                <span className="fi-mn-rn">{r.open ? o.name : "???"}</span>
                                <span className="fi-mn-bar">
                                    <i style={{ width: `${r.p * 100}%` }} />
                                </span>
                                <span className="fi-mn-pc">{r.open ? `${r.p >= 0.1 ? Math.round(r.p * 100) : +(r.p * 100).toFixed(1)}%` : <><Lock className="inline size-3" /> {o.need}</>}</span>
                                <span className="fi-mn-stk">{r.open ? F(Math.floor(haveOre(s, o.id))) : ""}</span>
                                {r.open && lvlOpen(s) && (
                                    <button
                                        type="button"
                                        className="fi-mn-star"
                                        data-on={focus}
                                        aria-pressed={focus}
                                        aria-label={focus ? `Stop prospecting ${o.name}` : `Prospect for ${o.name}`}
                                        onClick={() => {
                                            setFocus(s, focus ? "" : o.id);
                                            render();
                                        }}
                                    >
                                        ★
                                    </button>
                                )}
                            </div>
                        </Tip>
                    );
                })}
            </div>
            <p className="fi-mn-note">{lvlOpen(s) ? "Tap a star to prospect: that ore gets 35% of your swings. " : ""}Other islands and dimensions carry other ore. Travel with I to hunt the ones you need.</p>

            {(geodes > 0 || itemCount(s) > 0) && (
                <div className="fi-mn-actions">
                    {geodes > 0 && (
                        <div className="fi-mn-geode">
                            <span className="fi-mn-geode-n">
                                <McSymbol name="gem" /> {dimWithGeodes.map((x, i) => <span key={x} style={{ color: GEODES[x].color }}>{i ? " · " : ""}<b>{m.geodes[x]}</b> {GEODES[x].name}{m.geodes[x] === 1 ? "" : "s"}</span>)}
                            </span>
                            <Tip box tip={<TipCard title="Crack a geode" color="var(--mc-light-purple)" lines={["A random reward: dust, tokens, an egg, shards, a Fragment or an ascension point. Nether and End geodes pay more."]} foot="Click to crack!" />}>
                                <button type="button" onClick={() => crackOne(false)} className="fi-mn-crack" data-ready>
                                    Crack
                                </button>
                            </Tip>
                            {geodes > 1 && (
                                <button type="button" onClick={() => crackOne(true)} className="fi-mn-crack all">
                                    All {geodes}
                                </button>
                            )}
                        </div>
                    )}
                    {ITEMS.filter((it) => (m.items[it.id] || 0) > 0).map((it) => (
                        <Tip key={it.id} box tip={<TipCard title={it.name} color={it.color} lines={[it.desc]} foot="Click to use!" />}>
                            <button type="button" className="fi-mn-item" onClick={() => consume(it.id)} style={col(it.color)}>
                                <i />
                                {it.name} <b>x{m.items[it.id]}</b>
                            </button>
                        </Tip>
                    ))}
                </div>
            )}

            {m.log.length > 0 && (
                <>
                    <SectionTitle color={C}>Recent finds</SectionTitle>
                    <ul className="fi-mn-log" aria-live="polite">
                        {m.log.slice(0, 5).map((l, i) => (
                            <li key={`${i}:${l.text}`} style={{ color: l.color }}>{l.text}</li>
                        ))}
                    </ul>
                </>
            )}
        </>
    );
}

const lvlOpen = (s: Ctx["s"]) => mineLevel(s) >= 5;

/** A dimension shows up in the Drills and Ores lists once you can reach one of its islands (or already mined its ore). */
const dimOpen = (s: Ctx["s"], dm: Dim) => dm === "overworld" || openIslands(s).some((i) => i.dim === dm) || DIM_ORES[dm].some((o) => (s.mine.mined[o.id] || 0) > 0);

function OreTip({ s, d, o, p, F }: { s: Ctx["s"]; d: Ctx["d"]; o: OreDef; p: number; F: (n: number) => string }) {
    const tier = colTierOf(s.mine.mined[o.id] || 0);
    const dmg = pickPower(s) * comboFactor(Math.max(1, s.combo));
    const ratio = dmg / o.hard;
    const perSwing = (ratio <= 3 ? ratio : 3 + Math.pow(ratio - 3, 0.6)) * yieldMult(s) * (1 + drillBoost(s, o) * 0.5);
    const ctx = mineCtx(d);
    return (
        <TipCard
            title={o.name}
            color={o.color}
            tag={o.need ? `Mining ${o.need}` : DIM_LABEL[o.dim].name}
            lines={mineLevel(s) < o.need ? [`Opens at Mining ${o.need}.`] : undefined}
            rows={[
                ["Chance per swing", p > 0 ? fmtPct(p) : "not here / locked"],
                ["Hardness", `${o.hard} pick power`],
                ["Ore per swing now", `${perSwing.toFixed(2)}`],
                ["Mining XP per swing", F(oreXp(o) * ctx.xp)],
                ["Shards per swing", F(swingShards(ctx, o))],
                ["Collection", `tier ${tier}/${COL_AT.length}`, o.color],
            ]}
            notes={[{ text: `Collection pays +${fmtPct(o.col[1])} ${o.colText} per tier`, color: o.color }, { text: `Found on: ${oreIslands(o.id).map((id) => ISLAND_BY_ID[id]?.name ?? id).slice(0, 5).join(", ")}`, color: "var(--mc-aqua)" }]}
            foot={p > 0 ? undefined : "Travel to an island that has it"}
        />
    );
}

// ---- Gear: pickaxes and hand tools ----

function Gear({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
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
                    {next && <CostRow s={s} cost={next.cost} />}
                    {next && !can.ok && lvl >= next.need && <div className="fi-mn-pick-h">Ingots come from the Forge tab.</div>}
                </div>
                {next && (
                    <Tip box tip={<TipCard title={`Forge ${next.name}`} color={next.color} lines={["Consumes the materials shown and replaces your pickaxe."]} foot={can.ok ? "Click to forge!" : can.why} />}>
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
                            {lvl < next.need ? <><Lock className="mr-1 inline size-3" />Mining {next.need}</> : "Make"}
                        </button>
                    </Tip>
                )}
            </div>
            <SectionTitle color={C}>Hand tools</SectionTitle>
            <UpgradeList s={s} cat="hand" render={render} />
            <p className="fi-mn-note">Everything here is permanent: rebirths and ascensions never touch your mine. Ore in stock: {F(Math.floor(ORES.reduce((a, o) => a + haveOre(s, o.id), 0)))}.</p>
        </>
    );
}

// ---- Drills ----

function Drills({ s, d, F, render }: { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void }) {
    const lvl = mineLevel(s);
    const dr = drillSwings(s);
    const pa = passiveSwings(s);
    const total = totalDrills(s);
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{(dr + pa + d.auto).toFixed(1)}</b> idle swings a second <span>= drills {dr.toFixed(1)} + auto-clicks {d.auto.toFixed(1)} + pocket miner {pa.toFixed(2)}</span>
                </div>
                <small>Each one hits a random ore on your island with drill damage x{drillDmg(s).toFixed(1)}. They run while you play, in other tabs, and while you are away. Every drill also boosts the ore it is named for, and big drills boost the smaller ores before them too.</small>
            </div>
            {DIMS.map((dm) => {
                const list = DIM_ORES[dm];
                const shown = list.filter((o, i) => lvl >= o.need || (i > 0 && lvl >= list[i - 1].need) || i === 0);
                if (!dimOpen(s, dm)) return null;
                return (
                    <div key={dm} className="fi-mn-dimblock">
                        <SectionTitle color={DIM_LABEL[dm].color}>{DIM_LABEL[dm].name} drills</SectionTitle>
                        <div className="fi-mn-drills">
                            {shown.map((o) => (
                                <DrillRow key={o.id} s={s} o={o} F={F} render={render} />
                            ))}
                        </div>
                    </div>
                );
            })}
            <SectionTitle color="var(--mc-aqua)">Rig parts</SectionTitle>
            <UpgradeList s={s} cat="rig" render={render} />
            <p className="fi-mn-note">{F(total)} drills built. A drill&apos;s ore comes from your island, so the End&apos;s ore needs a trip to the End. Drills lose a little power the more you stack: ten act like seven.</p>
        </>
    );
}

function DrillRow({ s, o, F, render }: { s: Ctx["s"]; o: OreDef; F: (n: number) => string; render: () => void }) {
    const n = s.mine.drills[o.id] || 0;
    const open = mineLevel(s) >= o.need;
    const c = canBuyDrill(s, o);
    const covers = DIM_ORES[o.dim].filter((x, i) => i >= DIM_ORES[o.dim].indexOf(o) - o.reach && i <= DIM_ORES[o.dim].indexOf(o));
    const buy = (k: number) => {
        if (buyDrill(s, o.id, k) > 0) render();
    };
    return (
        <div className="fi-mn-drill" data-locked={!open} style={col(o.color)}>
            <span className="fi-mn-chip big">
                <i />
            </span>
            <div className="min-w-0 flex-1">
                <div className="fi-mn-drill-t">
                    {o.name} <span>x{n}</span>
                </div>
                <div className="fi-mn-drill-s">
                    {open ? (
                        <>
                            +{fmtPct(0.06 * (eff(n + 1) - eff(n)))} ore from the next one{covers.length > 1 ? `, to ${covers.map((x) => x.name).join(", ")}` : ""}
                        </>
                    ) : (
                        <>
                            <Lock className="mr-1 inline size-3" />Opens at Mining {o.need}
                        </>
                    )}
                </div>
            </div>
            {open && <ResChip s={s} id={o.id} n={drillCost(s, o)} />}
            <button type="button" disabled={!c.ok} onClick={() => buy(1)} className="fi-mn-buy small">
                Build
            </button>
            {open && (
                <button type="button" disabled={!c.ok} onClick={() => buy(10)} className="fi-mn-buy small ghost" aria-label={`Build up to 10 ${o.name} drills`}>
                    x10
                </button>
            )}
        </div>
    );
}

// ---- Forge ----

function Forge({ s, d, F, render, say, ctx }: { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void; say: (m: string) => void; ctx: ReturnType<typeof mineCtx> }) {
    void d;
    void ctx;
    const m = s.mine;
    const lvl = mineLevel(s);
    const now = Date.now();
    const slots = forgeSlots(s);
    const ready = jobsReady(s, now);
    const [kind, setKind] = useState<RecipeDef["kind"]>("ingot");
    const list = RECIPES.filter((r) => r.kind === kind);
    const doneText = (t: string) => {
        say(t);
        render();
    };
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{slots}</b> {slots === 1 ? "furnace" : "furnaces"} · crafts finish <b>{Math.round((forgeSpeed(s) - 1) * 100)}%</b> faster <span>and keep cooking while you are away</span>
                </div>
                <small>Smelt ore into ingots, brew consumables and forge permanent relics. A finished craft waits in its furnace until you collect it, and a furnace is busy until you do.</small>
            </div>

            <div className="fi-mn-slots">
                {Array.from({ length: slots }, (_, i) => {
                    const ji = m.jobs.findIndex((x) => x.slot === i);
                    const j = ji >= 0 ? m.jobs[ji] : undefined;
                    const r = j ? RECIPES.find((x) => x.id === j.r) : null;
                    if (!j || !r) {
                        return (
                            <div key={i} className="fi-mn-slot" data-empty>
                                <span className="fi-mn-slot-n">Furnace {i + 1}</span>
                                <span className="fi-mn-slot-s">Idle: start a craft below</span>
                            </div>
                        );
                    }
                    const total = jobSeconds(s, r, j.n);
                    const left = jobLeft(j, now);
                    const done = left <= 0;
                    return (
                        <div key={i} className="fi-mn-slot" data-done={done} style={col(r.color)}>
                            <span className="fi-mn-slot-n">{j.n > 1 ? `${j.n}x ` : ""}{r.name}</span>
                            <span className="fi-mn-slot-s">{done ? "Ready!" : `${fmtTime(left)} left`}</span>
                            <span className="fi-mn-slot-bar">
                                <i style={{ width: `${Math.min(100, (1 - left / Math.max(1, total)) * 100)}%` }} />
                            </span>
                            <button
                                type="button"
                                disabled={!done}
                                className="fi-mn-buy small"
                                onClick={() => {
                                    const c = collectJob(s, ji, Date.now());
                                    if (c) doneText(c.text);
                                }}
                            >
                                Collect
                            </button>
                        </div>
                    );
                })}
            </div>
            {ready > 1 && (
                <button
                    type="button"
                    className="fi-mn-buy wide"
                    onClick={() => {
                        const got = collectAll(s, Date.now());
                        if (got.length) doneText(`Collected ${got.length} crafts.`);
                    }}
                >
                    Collect all {ready}
                </button>
            )}

            <div className="fi-mn-stock">
                {INGOTS.filter((g) => (m.ingots[g.id] || 0) > 0).map((g) => (
                    <span key={g.id} className="fi-mn-chip" style={col(g.color)}>
                        <i />
                        {g.name} <b>{m.ingots[g.id]}</b>
                    </span>
                ))}
                {Object.keys(m.ingots).length === 0 && <span className="fi-mn-chip locked">No ingots yet: smelt copper first</span>}
            </div>

            {slotsFree(s) <= 0 && <p className="fi-mn-note warn">Every furnace is busy. Collect a finished craft to free one.</p>}
            <div className="fi-mn-seg small" role="tablist">
                {([["ingot", "Ingots"], ["item", "Consumables"], ["relic", "Relics"]] as const).map(([k, label]) => (
                    <button key={k} type="button" role="tab" aria-selected={kind === k} data-on={kind === k} onClick={() => setKind(k)}>
                        {label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {list.map((r) => (
                    <RecipeCard key={r.id} s={s} r={r} F={F} lvl={lvl} onDone={doneText} />
                ))}
            </div>
            {kind === "relic" && <RelicShelf s={s} />}

            <SectionTitle color="#ff9a4d">Forge parts</SectionTitle>
            <UpgradeList s={s} cat="forge" render={render} />
        </>
    );
}

function RecipeCard({ s, r, F, lvl, onDone }: { s: Ctx["s"]; r: RecipeDef; F: (n: number) => string; lvl: number; onDone: (t: string) => void }) {
    const locked = lvl < r.need;
    const owned = r.kind === "relic" && hasRelic(s, r.out);
    const batch = maxBatch(s, r);
    const one = canCraft(s, r, 1);
    const five = Math.min(5, batch);
    const many = canCraft(s, r, five);
    const stock = r.kind === "ingot" ? s.mine.ingots[r.out] || 0 : r.kind === "item" ? s.mine.items[r.out] || 0 : 0;
    const go = (n: number) => {
        if (startCraft(s, r.id, n)) onDone(`${n > 1 ? `${n}x ` : ""}${r.name} is cooking.`);
    };
    const reason = !one.ok ? one.why : undefined;
    return (
        <div className="fi-mn-rec" data-locked={locked} data-owned={owned} style={col(r.color)}>
            <div className="fi-mn-rec-h">
                <i className="fi-mn-sw" />
                <b>{r.name}</b>
                {stock > 0 && <span className="fi-mn-rec-n">x{stock}</span>}
                {owned && <span className="fi-mn-rec-n owned">Forged</span>}
            </div>
            <div className="fi-mn-up-d">{locked ? <><Lock className="mr-1 inline size-3" />Opens at Mining {r.need}</> : r.desc}</div>
            <CostRow s={s} cost={r.inputs} />
            <div className="fi-mn-up-f">
                <span className="fi-mn-time">{fmtTime(jobSeconds(s, r, 1))}{owned ? "" : " each"}</span>
                {!owned && (
                    <span className="fi-mn-btns">
                        <Tip box tip={<TipCard title={r.name} color={r.color} lines={[r.desc]} rows={[["Takes", fmtTime(jobSeconds(s, r, 1))], ["Slots", reason === "Furnaces busy" ? "all busy" : "free"]]} foot={one.ok ? "Click to start!" : reason} />}>
                            <button type="button" disabled={!one.ok} onClick={() => go(1)} className="fi-mn-buy small">
                                {r.kind === "relic" ? "Forge" : "Start"}
                            </button>
                        </Tip>
                        {r.kind !== "relic" && five > 1 && (
                            <Tip box tip={<TipCard title={`${five}x ${r.name}`} color={r.color} rows={[["Takes", fmtTime(jobSeconds(s, r, five))]]} notes={[{ text: `Costs ${Object.entries(totalCost(r, five)).map(([k, v]) => `${v} ${resInfo(k as ResId).name}`).join(", ")}`, color: r.color }]} foot={many.ok ? "Click to start!" : many.why} />}>
                                <button type="button" disabled={!many.ok} onClick={() => go(five)} className="fi-mn-buy small ghost" aria-label={`Start ${five} ${r.name}`}>
                                    x{five}
                                </button>
                            </Tip>
                        )}
                    </span>
                )}
            </div>
        </div>
    );
}

function RelicShelf({ s }: { s: Ctx["s"] }) {
    return (
        <>
            <SectionTitle color="var(--mc-yellow)">Relic shelf ({s.mine.relics.length}/{RELICS.length})</SectionTitle>
            <div className="fi-mn-shelf">
                {RELICS.map((r) => {
                    const own = hasRelic(s, r.out);
                    return (
                        <Tip key={r.id} tip={<TipCard title={own ? r.name : mineLevel(s) >= r.need ? r.name : "???"} color={r.color} lines={[own || mineLevel(s) >= r.need ? r.desc : `Opens at Mining ${r.need}`]} tag={own ? "Forged" : undefined} />}>
                            <span className="fi-mn-relic" data-own={own} style={col(r.color)}>
                                <McSymbol name="gem" />
                            </span>
                        </Tip>
                    );
                })}
            </div>
        </>
    );
}

// ---- Ores: collections ----

function Ores({ s, F }: { s: Ctx["s"]; F: (n: number) => string }) {
    return (
        <>
            <p className="fi-mn-note">Every ore you mine fills its collection, and each tier pays a permanent bonus for the rest of the game. Finish a whole dimension to earn a set bonus on top.</p>
            {DIMS.map((dm) => {
                const set = dimSet(s, dm);
                const list = DIM_ORES[dm];
                if (!dimOpen(s, dm)) return null;
                return (
                    <div key={dm} className="fi-mn-dimblock">
                        <SectionTitle color={DIM_LABEL[dm].color}>{DIM_LABEL[dm].name}</SectionTitle>
                        <div className="fi-mn-setrow">
                            {SET_STEPS.map((st) => (
                                <span key={st.tier} className="fi-mn-set" data-on={set.tier >= st.tier} style={{ ["--oc" as string]: DIM_LABEL[dm].color } as CSSProperties}>
                                    All tier {st.tier}: +{fmtPct(st.bonus)} shards
                                </span>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {list.map((o) => (
                                <OreCard key={o.id} s={s} o={o} F={F} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

function OreCard({ s, o, F }: { s: Ctx["s"]; o: OreDef; F: (n: number) => string }) {
    const mined = s.mine.mined[o.id] || 0;
    const tier = colTierOf(mined);
    const next = COL_AT[tier];
    const prev = tier > 0 ? COL_AT[tier - 1] : 0;
    const open = mineLevel(s) >= o.need || mined > 0;
    const where = oreIslands(o.id).map((id) => ISLAND_BY_ID[id]?.name ?? id);
    return (
        <div className="fi-mn-col" data-locked={!open} style={col(o.color)}>
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
            {open && <div className="fi-mn-col-w">Found on {where.slice(0, 3).join(", ")}{where.length > 3 ? ` +${where.length - 3}` : ""}</div>}
            {next && open && <div className="fi-mn-col-bar"><i style={{ width: `${Math.min(1, (mined - prev) / (next - prev)) * 100}%` }} /></div>}
        </div>
    );
}

export const MINE_CSS = `
.fi-mn{display:flex;flex-direction:column;gap:.55rem}
.fi-mn-stat{display:flex;flex-direction:column;border-radius:.75rem;border:1px solid color-mix(in oklch,var(--c) 40%,transparent);background:linear-gradient(140deg,color-mix(in oklch,var(--c) 10%,transparent),transparent);padding:.4rem .6rem;min-width:0}
.fi-mn-stat span{font-family:var(--font-minecraft,inherit);font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-mn-stat b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:1.1rem;line-height:1.15;color:var(--c);text-shadow:0 0 12px color-mix(in oklch,var(--c) 60%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-stat small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-seg{display:flex;border-radius:.6rem;border:1px solid rgba(255,255,255,.14);overflow:hidden}
.fi-mn-seg button{position:relative;flex:1;padding:.4rem .2rem;font-family:var(--font-minecraft,inherit);font-size:.72rem;color:var(--muted-foreground);transition:background .15s,color .15s}
.fi-mn-seg.small button{font-size:.66rem;padding:.3rem .2rem}
.fi-mn-seg button[data-on="true"]{background:color-mix(in oklch,${C} 22%,transparent);color:${C};font-weight:700;box-shadow:inset 0 -2px 0 ${C}}
.fi-mn-dot{position:absolute;top:.1rem;right:.15rem;display:grid;place-items:center;min-width:.95rem;height:.95rem;padding:0 .22rem;border-radius:999px;background:#ff9a4d;color:#1b1206;font-style:normal;font-family:var(--font-rubik,inherit);font-size:.56rem;font-weight:700;line-height:1}
.fi-mn-dot.gem{background:var(--mc-light-purple)}
.fi-mn-face{position:relative;height:11.5rem;border-radius:1.1rem;overflow:hidden;isolation:isolate;border:1px solid color-mix(in oklch,var(--dc) 55%,transparent);background:radial-gradient(ellipse at 50% 0%,color-mix(in oklch,var(--dc) 22%,#1b1710),#0d0b08 78%);box-shadow:inset 0 0 44px rgba(0,0,0,.6),0 0 26px -12px var(--dc);user-select:none;-webkit-user-select:none}
.fi-mn-face::before{content:"";position:absolute;inset:0;z-index:-1;background-image:linear-gradient(rgba(0,0,0,.28) 2px,transparent 2px),linear-gradient(90deg,rgba(0,0,0,.28) 2px,transparent 2px);background-size:52px 34px;opacity:.7}
.fi-mn-face[data-rush="true"]{border-color:#ffd23a;box-shadow:inset 0 0 44px rgba(0,0,0,.5),0 0 34px -4px #ffd23a;animation:fi-mn-rush 1s ease-in-out infinite}
@keyframes fi-mn-rush{50%{box-shadow:inset 0 0 44px rgba(0,0,0,.4),0 0 46px 0 #ffd23a}}
.fi-mn-blob{position:absolute;transform:translate(-50%,-50%);border-radius:36% 64% 52% 48%/48% 40% 60% 52%;background:radial-gradient(circle at 32% 30%,#fff9 0 12%,transparent 30%),var(--oc);box-shadow:0 0 14px -2px var(--oc),inset 0 -3px 5px rgba(0,0,0,.35)}
.fi-mn-pickfx{position:absolute;right:7%;top:8%;z-index:2;font-size:2.4rem;line-height:1;color:var(--pc);transform-origin:80% 90%;filter:drop-shadow(0 2px 0 rgba(0,0,0,.7)) drop-shadow(0 0 10px var(--pc));pointer-events:none}
.fi-mn-where{position:absolute;left:.7rem;top:.5rem;z-index:2;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.78rem;text-shadow:0 1px 0 #000,0 0 8px rgba(0,0,0,.9);pointer-events:none}
.fi-mn-where em{font-style:normal;font-weight:400;color:#fffc;font-size:.64rem}
.fi-mn-hint{position:absolute;left:0;right:0;bottom:.55rem;z-index:2;text-align:center;font-family:var(--font-rubik,inherit);font-size:.7rem;font-weight:600;color:#fffd;text-shadow:0 1px 0 #000,0 0 8px #000;pointer-events:none;animation:fi-pulse 1.8s ease-in-out infinite}
.fi-mn-pop{position:absolute;z-index:5;top:46%;transform:translateX(-50%);pointer-events:none;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.82rem;white-space:nowrap;text-shadow:0 1px 0 #000,0 0 8px rgba(0,0,0,.85);animation:fi-mn-pop 1s ease-out forwards}
.fi-mn-pop.big{font-size:1.05rem;top:30%;animation-duration:1.3s}
.fi-mn-spark{position:absolute;z-index:4;width:.3rem;height:.3rem;border-radius:1px;pointer-events:none}
.fi-mn-spark.soft{width:.22rem;height:.22rem;border-radius:50%;opacity:.8}
@keyframes fi-mn-pop{0%{opacity:0;margin-top:.5rem}12%{opacity:1}100%{opacity:0;margin-top:-2.6rem}}
.fi-mn-vein{display:flex;flex-direction:column;gap:.2rem}
.fi-mn-vein-h{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.fi-mn-vein-h b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.78rem;color:${C}}
.fi-mn-vein[data-rush="true"] .fi-mn-vein-h b{color:#ffd23a}
.fi-mn-vein-bar{height:.55rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-mn-vein-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#b9803c,${C});box-shadow:0 0 10px color-mix(in oklch,${C} 60%,transparent);transition:width .15s linear}
.fi-mn-vein[data-rush="true"] .fi-mn-vein-bar i{background:linear-gradient(90deg,#ffb020,#ffe066);box-shadow:0 0 14px #ffd23a}
.fi-mn-last{font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground);min-height:1.1rem}
.fi-mn-last b{font-weight:700}
.fi-mn-last em{font-style:normal;color:#ffe29a;font-weight:700}
.fi-mn-table{display:flex;flex-direction:column;gap:.25rem}
.fi-mn-row{display:grid;grid-template-columns:.9rem minmax(0,6.2rem) minmax(0,1fr) 2.7rem 3.2rem 1.8rem;align-items:center;gap:.5rem;padding:.2rem .5rem;border-radius:.6rem;border:1px solid color-mix(in oklch,var(--oc) 25%,transparent);background:linear-gradient(110deg,color-mix(in oklch,var(--oc) 7%,transparent),transparent 70%)}
.fi-mn-row[data-locked="true"]{opacity:.5}
.fi-mn-row[data-focus="true"]{border-color:var(--oc);box-shadow:0 0 12px -4px var(--oc)}
.fi-mn-sw{display:block;width:.8rem;height:.8rem;border-radius:.22rem;background:var(--oc);box-shadow:0 0 6px var(--oc)}
.fi-mn-rn{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.74rem;color:var(--oc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-bar{height:.4rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-mn-bar i{display:block;height:100%;background:var(--oc);box-shadow:0 0 6px var(--oc);transition:width .3s}
.fi-mn-pc{font-family:var(--font-rubik,inherit);font-size:.66rem;font-weight:600;color:#e6e2f0;text-align:right}
.fi-mn-stk{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;color:var(--oc);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-star{display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:.4rem;font-size:.95rem;line-height:1;color:var(--muted-foreground);transition:color .15s,transform .1s,background .15s;touch-action:manipulation}
.fi-mn-star:hover{color:#ffe066}
.fi-mn-star[data-on="true"]{color:#ffd23a;background:color-mix(in oklch,#ffd23a 18%,transparent);text-shadow:0 0 8px #ffd23a}
.fi-mn-star:active{transform:scale(.88)}
.fi-mn-actions{display:flex;flex-wrap:wrap;gap:.45rem}
.fi-mn-geode{display:flex;flex:1 1 100%;align-items:center;gap:.5rem;flex-wrap:wrap;min-height:2.6rem;padding:.3rem .55rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--mc-light-purple) 40%,transparent);background:linear-gradient(120deg,color-mix(in oklch,var(--mc-light-purple) 9%,transparent),transparent)}
.fi-mn-geode-n{flex:1;min-width:0;font-family:var(--font-minecraft,inherit);font-size:.74rem;color:var(--mc-light-purple)}
.fi-mn-geode-n b{font-size:.95rem}
.fi-mn-crack{flex:none;min-width:4.4rem;padding:.4rem .8rem;border-radius:.6rem;border:1px solid color-mix(in oklch,var(--mc-light-purple) 65%,transparent);background:color-mix(in oklch,var(--mc-light-purple) 20%,transparent);color:#fff;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.75rem;transition:transform .1s,background .15s,opacity .15s;touch-action:manipulation}
.fi-mn-crack[data-ready]{animation:fi-mn-ready 1.6s ease-in-out infinite}
.fi-mn-crack.all{animation:none;background:transparent}
.fi-mn-crack:hover:not(:disabled){background:color-mix(in oklch,var(--mc-light-purple) 34%,transparent)}
.fi-mn-crack:active:not(:disabled){transform:scale(.94)}
@keyframes fi-mn-ready{50%{box-shadow:0 0 18px 0 var(--mc-light-purple)}}
.fi-mn-item{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .7rem;border-radius:.7rem;border:1px solid color-mix(in oklch,var(--oc) 60%,transparent);background:color-mix(in oklch,var(--oc) 14%,transparent);color:#fff;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.72rem;transition:transform .1s,background .15s;touch-action:manipulation}
.fi-mn-item i{display:block;width:.7rem;height:.7rem;border-radius:.2rem;background:var(--oc);box-shadow:0 0 6px var(--oc)}
.fi-mn-item b{color:var(--oc)}
.fi-mn-item:hover{background:color-mix(in oklch,var(--oc) 28%,transparent)}
.fi-mn-item:active{transform:scale(.94)}
.fi-mn-log{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.15rem;font-family:var(--font-rubik,inherit);font-size:.68rem;font-weight:600}
.fi-mn-log li{animation:fi-mn-res .4s ease-out;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes fi-mn-res{from{opacity:0;transform:translateX(6px)}}
.fi-mn-chip{display:inline-flex;align-items:center;gap:.35rem;padding:.12rem .55rem .12rem .3rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--oc) 45%,transparent);background:color-mix(in oklch,var(--oc) 10%,transparent);font-family:var(--font-rubik,inherit);font-size:.66rem;color:#e6e2f0;white-space:nowrap}
.fi-mn-chip i{display:block;flex:none;width:.7rem;height:.7rem;border-radius:.2rem;background:var(--oc);box-shadow:0 0 6px var(--oc)}
.fi-mn-chip b{font-family:var(--font-minecraft,inherit);font-weight:700;color:var(--oc)}
.fi-mn-chip.locked{border-style:dashed;border-color:rgba(255,255,255,.18);background:transparent;color:var(--muted-foreground);padding-left:.5rem}
.fi-mn-chip.small{font-size:.6rem;padding:.05rem .45rem .05rem .3rem}
.fi-mn-chip.small[data-ok="false"]{border-color:color-mix(in oklch,var(--mc-red) 55%,transparent);color:#ffb3b3}
.fi-mn-chip.big{padding:.3rem;border-radius:.6rem}
.fi-mn-chip.big i{width:1.4rem;height:1.4rem;border-radius:.35rem}
.fi-mn-stock{display:flex;flex-wrap:wrap;gap:.3rem}
.fi-mn-cost{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.25rem}
.fi-mn-pick{display:flex;align-items:center;gap:.7rem;padding:.6rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 50%,transparent);background:linear-gradient(130deg,color-mix(in oklch,var(--c) 14%,transparent),transparent 70%)}
.fi-mn-pick-i{display:grid;place-items:center;flex:none;width:2.8rem;height:2.8rem;border-radius:.8rem;font-size:1.6rem;color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 40%,transparent)}
.fi-mn-pick-t{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.95rem;color:var(--c);text-shadow:0 0 10px color-mix(in oklch,var(--c) 50%,transparent)}
.fi-mn-pick-s{font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.fi-mn-pick-h{margin-top:.2rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:#ff9a4d}
.fi-mn-pick-s b,.fi-mn-up-e b{color:var(--mc-green);font-weight:600}
.fi-mn-pick-s em,.fi-mn-up-e em{font-style:normal;opacity:.55;margin:0 .1rem}
.fi-mn-buy{flex:none;min-width:5rem;padding:.5rem .8rem;border-radius:.65rem;border:1px solid color-mix(in oklch,var(--mc-green) 65%,transparent);background:color-mix(in oklch,var(--mc-green) 16%,transparent);color:var(--mc-green);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.75rem;transition:transform .1s,background .15s,opacity .15s;touch-action:manipulation}
.fi-mn-buy.small{min-width:3.6rem;padding:.35rem .6rem;font-size:.7rem}
.fi-mn-buy.ghost{min-width:2.4rem;background:transparent}
.fi-mn-buy.wide{width:100%}
.fi-mn-buy:hover:not(:disabled){background:color-mix(in oklch,var(--mc-green) 28%,transparent)}
.fi-mn-buy:active:not(:disabled){transform:scale(.94)}
.fi-mn-buy:disabled{opacity:.4;border-color:rgba(255,255,255,.18);background:transparent;color:var(--muted-foreground);cursor:not-allowed}
.fi-mn-up{display:flex;flex-direction:column;gap:.2rem;padding:.5rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--c) 30%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--c) 7%,transparent),transparent 70%);min-width:0}
.fi-mn-up[data-locked="true"]{opacity:.55}
.fi-mn-up[data-ready="true"]{border-color:color-mix(in oklch,var(--mc-green) 55%,transparent)}
.fi-mn-up-h{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-minecraft,inherit);font-size:.82rem;color:var(--c)}
.fi-mn-up-h b{font-weight:700}
.fi-mn-up-h span{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-mn-up-d{font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-mn-up-e{font-family:var(--font-rubik,inherit);font-size:.68rem;color:#e6e2f0}
.fi-mn-up-f{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.15rem}
.fi-mn-up-f .fi-mn-cost{margin-top:0}
.fi-mn-maxed{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;color:var(--mc-yellow)}
.fi-mn-note{margin:0;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-mn-note.warn{color:#ff9a4d;font-weight:600}
.fi-mn-sum{display:flex;flex-direction:column;gap:.15rem;padding:.55rem .7rem;border-radius:.85rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);font-family:var(--font-rubik,inherit);font-size:.74rem;color:#e6e2f0}
.fi-mn-sum b{font-family:var(--font-minecraft,inherit);font-weight:700;color:var(--mc-aqua);font-size:.95rem}
.fi-mn-sum span{color:var(--muted-foreground);font-size:.64rem}
.fi-mn-sum small{color:var(--muted-foreground);font-size:.64rem}
.fi-mn-dimblock{display:flex;flex-direction:column;gap:.4rem}
.fi-mn-drills{display:flex;flex-direction:column;gap:.35rem}
.fi-mn-drill{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;padding:.45rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--oc) 30%,transparent);background:linear-gradient(120deg,color-mix(in oklch,var(--oc) 7%,transparent),transparent 70%)}
.fi-mn-drill[data-locked="true"]{opacity:.5}
.fi-mn-drill-t{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.82rem;color:var(--oc)}
.fi-mn-drill-t span{font-family:var(--font-rubik,inherit);font-weight:400;font-size:.65rem;color:var(--muted-foreground)}
.fi-mn-drill-s{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-mn-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.45rem}
.fi-mn-slot{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto auto;gap:.15rem .5rem;padding:.5rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--oc,#888) 45%,transparent);background:linear-gradient(130deg,color-mix(in oklch,var(--oc,#888) 11%,transparent),transparent 75%);min-height:4rem}
.fi-mn-slot[data-empty]{border-style:dashed;border-color:rgba(255,255,255,.2);background:transparent}
.fi-mn-slot[data-done="true"]{border-color:var(--oc);animation:fi-mn-ready 1.6s ease-in-out infinite;box-shadow:0 0 14px -4px var(--oc)}
.fi-mn-slot-n{grid-column:1;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.78rem;color:var(--oc,#e6e2f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-mn-slot-s{grid-column:1;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-mn-slot[data-done="true"] .fi-mn-slot-s{color:var(--mc-green);font-weight:700}
.fi-mn-slot-bar{grid-column:1 / -1;grid-row:3;height:.3rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-mn-slot-bar i{display:block;height:100%;background:var(--oc);box-shadow:0 0 6px var(--oc);transition:width .3s linear}
.fi-mn-slot .fi-mn-buy{grid-column:2;grid-row:1 / 3;align-self:center}
.fi-mn-rec{display:flex;flex-direction:column;gap:.25rem;padding:.5rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--oc) 30%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--oc) 7%,transparent),transparent 70%);min-width:0}
.fi-mn-rec[data-locked="true"]{opacity:.55}
.fi-mn-rec[data-owned="true"]{border-color:var(--oc);box-shadow:0 0 14px -6px var(--oc)}
.fi-mn-rec-h{display:flex;align-items:center;gap:.45rem;font-family:var(--font-minecraft,inherit);font-size:.82rem;color:var(--oc)}
.fi-mn-rec-h b{font-weight:700}
.fi-mn-rec-n{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-mn-rec-n.owned{color:var(--mc-yellow);font-weight:700}
.fi-mn-time{font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-mn-btns{display:flex;gap:.3rem}
.fi-mn-shelf{display:flex;flex-wrap:wrap;gap:.4rem}
.fi-mn-relic{display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:.7rem;font-size:1.2rem;color:var(--oc);border:1px dashed rgba(255,255,255,.2);opacity:.4}
.fi-mn-relic[data-own="true"]{opacity:1;border:1px solid var(--oc);background:color-mix(in oklch,var(--oc) 16%,transparent);box-shadow:0 0 14px -2px var(--oc)}
.fi-mn-col{display:flex;flex-direction:column;gap:.3rem;padding:.5rem .6rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--oc) 30%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--oc) 7%,transparent),transparent 70%);min-width:0}
.fi-mn-col[data-locked="true"]{opacity:.5}
.fi-mn-col-h{display:flex;align-items:center;gap:.5rem}
.fi-mn-col-h b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.85rem;color:var(--oc)}
.fi-mn-col-n{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-mn-pips{display:flex;gap:.25rem}
.fi-mn-pips i{flex:1;height:.3rem;border-radius:999px;background:rgba(255,255,255,.1)}
.fi-mn-pips i[data-on="true"]{background:var(--oc);box-shadow:0 0 6px var(--oc)}
.fi-mn-col-r{font-family:var(--font-rubik,inherit);font-size:.66rem;color:#e6e2f0}
.fi-mn-col-r em{font-style:normal;color:var(--muted-foreground)}
.fi-mn-col-w{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.fi-mn-col-bar{height:2px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.fi-mn-col-bar i{display:block;height:100%;background:var(--oc)}
.fi-mn-setrow{display:flex;flex-wrap:wrap;gap:.3rem}
.fi-mn-set{padding:.12rem .55rem;border-radius:999px;border:1px dashed rgba(255,255,255,.2);font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-mn-set[data-on="true"]{border-style:solid;border-color:var(--oc);color:#fff;background:color-mix(in oklch,var(--oc) 16%,transparent);font-weight:700}
@media (max-width:639px){.fi-mn-face{height:10rem}.fi-mn-row{grid-template-columns:.8rem minmax(0,5rem) minmax(0,1fr) 2.3rem 2.6rem 2rem;gap:.3rem}.fi-mn-star{width:2rem;height:2rem}.fi-mn-pickfx{font-size:2rem}}
@media (prefers-reduced-motion:reduce){.fi-mn-face,.fi-mn-pop,.fi-mn-hint,.fi-mn-log li,.fi-mn-crack,.fi-mn-slot{animation:none!important}}
`;

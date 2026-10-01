"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { SKILL_CAP, fmtTime, skillXpFor } from "@/lib/fractured-idle/engine";
import { activeIsland, openIslands } from "@/lib/fractured-idle/island-logic";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { ISLANDS, ISLAND_BY_ID, type Dim } from "@/lib/fractured-idle/islands";
import { GRANT_LABEL } from "@/lib/fractured-idle/skills";
import {
    COL_AT,
    CROPS,
    CROP_BY_ID,
    DIMS,
    DIM_CROPS,
    DIM_FX,
    DIM_LABEL,
    FARM_UPS,
    FEATS,
    FEAT_LADDERS,
    GOODS,
    HOES,
    HOE_CLICK,
    ISLAND_CROPS,
    ITEMS,
    PODS,
    POD_TOKENS,
    POD_W,
    RECIPES,
    RELICS,
    SET_STEPS,
    bloomNeed,
    bottleneck,
    buyFarmUp,
    buyHand,
    buyHoe,
    canBuyHand,
    canBuyHoe,
    canBuyUp,
    canCraft,
    claimAllFeats,
    claimFeat,
    collectAll,
    collectJob,
    colTierOf,
    consumeItem,
    cropIslands,
    cropRate,
    cropShards,
    cropTable,
    cropXp,
    dimSet,
    eff,
    equipRelic,
    farmCtx,
    farmLevel,
    featClaimed,
    featReady,
    featsReady,
    goalOf,
    growSpeed,
    handBoost,
    handCost,
    harvest,
    harvestAll,
    have,
    haveCrop,
    hireAll,
    hoeOf,
    hoePower,
    isCrop,
    itemCount,
    jobLeft,
    jobSeconds,
    jobsReady,
    maxBatch,
    onWater,
    openAll,
    ovenSlots,
    ownsRelic,
    plant,
    plantAll,
    plotReady,
    podChance,
    podCount,
    queueGoal,
    readyCount,
    relicSlots,
    resInfo,
    setFocus,
    setSow,
    slotsFree,
    sowCrop,
    startCraft,
    toggleLoop,
    totalCost,
    totalHands,
    unequipRelic,
    upCost,
    upLevel,
    upgradeAll,
    bumperLen,
    bumperMult,
    cookSpeed,
    hasRelic,
    type CropDef,
    type Cost,
    type FarmUpDef,
    type FeatReward,
    type RecipeDef,
    type ResId,
} from "@/lib/fractured-idle/farm";
import { Tip, TipCard } from "./tooltip";
import { Progress, SectionTitle, type Ctx } from "./ui";

// The Farm. The same shape as the Mine (see tab-mine.tsx): the Garden grows real
// crops on timers, every press of the big button waters a random plot, crops can be
// tapped to harvest, and everything else (hoes, farmhands, the Cookhouse, collections,
// biomes, feats) is spent and read from here. Nothing needs tapping to progress: with
// the Auto-Reaper the garden harvests itself, also while you are away. It reuses the
// Mine's layout classes (fi-mn-*) and adds only the garden itself (fi-fm-*).

const C = "#9be04a";
type View = "garden" | "tools" | "hands" | "kitchen" | "crops" | "biomes" | "feats";

const fmtPct = (n: number) => `${+(n * 100).toFixed(1)}%`;
const amt = (F: (n: number) => string, n: number) => (n >= 1000 ? F(Math.floor(n)) : n >= 100 ? String(Math.floor(n)) : String(+n.toFixed(n < 10 ? 1 : 0)));
const col = (c: string) => ({ ["--oc" as string]: c }) as CSSProperties;

export function FarmTab({ s, d, F, render, say }: Ctx) {
    const f = s.farm;
    const lvl = farmLevel(s);
    const [view, setView] = useState<View>("garden");
    const hi = skillXpFor(lvl + 1, undefined);
    const lo = skillXpFor(lvl, undefined);
    const ready = jobsReady(s);
    const pods = podCount(s);
    const harvested = CROPS.reduce((a, c) => a + (f.grown[c.id] || 0), 0);
    const rate = cropRate(s) * 60;

    return (
        <div className="fi-mn fi-fm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Hoe power" value={`x${hoePower(s).toFixed(hoePower(s) < 10 ? 2 : 1)}`} sub={hoeOf(s).name} color={hoeOf(s).color} tip={<TipCard title="Hoe power" color={hoeOf(s).color} lines={["Bigger harvests from every plot. It helps with a softening curve."]} rows={[["Hoe", hoeOf(s).name], ["Tilling", `+${upLevel(s, "till") * 6}%`], ["Each hoe tier", `+${fmtPct(HOE_CLICK)} click power`]]} />} />
                <Stat label="Garden" value={`${amt(F, rate)}/min`} sub={`${f.plots.length} plots, ${readyCount(s)} ripe`} color="var(--mc-green)" tip={<TipCard title="Garden" color="var(--mc-green)" lines={["Crops a minute if every plot keeps growing and is harvested. Plots grow while you are away; with the Auto-Reaper they also harvest and replant."]} rows={[["Plots", String(f.plots.length)], ["Auto-Reaper", upLevel(s, "reaper") ? "on" : "not built"], ["Farmhands", F(totalHands(s))]]} />} />
                <Stat label="Harvested" value={F(Math.floor(harvested))} sub={`${F(f.harvests)} harvests`} color={C} tip={<TipCard title="Harvested" color={C} lines={["Every crop the garden has ever given you."]} rows={[["Harvests", F(f.harvests)], ["By hand", F(f.picked)], ["Bumper Crops", F(f.bumpers)], ["Plots watered", F(f.waters)]]} />} />
                <Stat label="Seed pods" value={String(pods)} sub={`${F(f.opened)} opened`} color="var(--mc-light-purple)" tip={<TipCard title="Seed pods" color="var(--mc-light-purple)" lines={["Harvests sometimes drop one. The Nether and the End drop richer ones."]} rows={[["Chance per harvest", fmtPct(podChance(s))], ...DIMS.map((dm) => [PODS[dm].name, String(f.pods[dm] || 0), PODS[dm].color] as [string, string, string])]} />} />
            </div>
            <Progress label={`Farming ${lvl}`} color={C} pct={lvl >= SKILL_CAP ? 1 : (s.farming - lo) / (hi - lo)} right={lvl >= SKILL_CAP ? "MAX" : `${Math.floor(Math.max(0, (s.farming - lo) / (hi - lo)) * 100)}% to ${lvl + 1}`} />

            <QuickBar s={s} d={d} render={render} say={say} />

            <div className="fi-mn-seg" role="tablist">
                {([["garden", "Garden"], ["tools", "Tools"], ["hands", "Hands"], ["kitchen", "Kitchen"], ["crops", "Crops"], ["biomes", "Biomes"], ["feats", "Feats"]] as const).map(([v, label]) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} data-on={view === v} onClick={() => setView(v)}>
                        {label}
                        {v === "kitchen" && ready > 0 && <i className="fi-mn-dot">{ready}</i>}
                        {v === "garden" && readyCount(s) > 0 && <i className="fi-mn-dot feat">{readyCount(s)}</i>}
                        {v === "feats" && featsReady(s).length > 0 && <i className="fi-mn-dot feat">{featsReady(s).length}</i>}
                    </button>
                ))}
            </div>

            {view === "garden" && <Garden s={s} d={d} F={F} render={render} say={say} />}
            {view === "tools" && <Tools s={s} F={F} render={render} say={say} />}
            {view === "hands" && <Hands s={s} d={d} F={F} render={render} />}
            {view === "kitchen" && <Kitchen s={s} F={F} render={render} say={say} />}
            {view === "crops" && <Crops s={s} F={F} />}
            {view === "biomes" && <Biomes s={s} F={F} />}
            {view === "feats" && <Feats s={s} F={F} render={render} say={say} />}
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

function ResChip({ s, id, n }: { s: Ctx["s"]; id: ResId; n: number }) {
    const r = resInfo(id);
    return (
        <span className="fi-mn-chip small" data-ok={have(s, id) >= n} style={col(r.color)}>
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

function upEffect(u: FarmUpDef, l: number): string {
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
        case "plots": return `${6 + l} base plots`;
        case "oven": return `${1 + l} ovens`;
        case "stoker": return `+${l * 8}% craft speed`;
        case "ladle": return l ? "on" : "off";
        default: return `${l * 8}% double batches`;
    }
}

function UpgradeList({ s, cat, render }: { s: Ctx["s"]; cat: FarmUpDef["cat"]; render: () => void }) {
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

// ---- Garden ----

const dim_ = (d: Dim) => DIM_LABEL[d];

function Garden({ s, d, F, render, say }: { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    const f = s.farm;
    const isl = activeIsland(s);
    const dim = dim_(isl.dim);
    const rows = cropTable(s);
    const sow = sowCrop(s);
    const bump = f.bumper > 0;
    const grid = useRef<HTMLDivElement>(null);
    const stamp = useRef(0);
    const live = useRef({ s, d, say, render });
    useEffect(() => {
        live.current = { s, d, say, render };
    });

    const popAt = (i: number, text: string, color: string, big = false) => {
        const el = grid.current?.querySelector<HTMLElement>(`[data-p="${i}"]`);
        if (!el) return;
        const span = document.createElement("span");
        span.className = `fi-mn-pop${big ? " big" : ""}`;
        span.textContent = text;
        span.style.color = color;
        span.style.left = "50%";
        span.style.top = "20%";
        el.appendChild(span);
        span.onanimationend = () => span.remove();
    };
    const burst = (i: number, color: string, n: number) => {
        const el = grid.current?.querySelector<HTMLElement>(`[data-p="${i}"]`);
        if (!el || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
        for (let k = 0; k < n; k++) {
            const a = Math.random() * Math.PI * 2;
            const dist = 14 + Math.random() * 40;
            const p = document.createElement("i");
            p.className = "fi-mn-spark";
            p.style.background = color;
            p.style.left = "50%";
            p.style.top = "50%";
            el.appendChild(p);
            p.animate(
                [
                    { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                    { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist - 8}px)) scale(0)`, opacity: 0 },
                ],
                { duration: 380 + Math.random() * 240, easing: "cubic-bezier(.1,.7,.3,1)" },
            ).onfinish = () => p.remove();
        }
    };

    // The big button waters a random plot: a drop falls on it (DOM only, so a fast hold never waits on React).
    useEffect(() => {
        const off = onWater((e) => {
            if (e.plot < 0) return;
            const el = grid.current?.querySelector<HTMLElement>(`[data-p="${e.plot}"]`);
            if (!el) return;
            const now = performance.now();
            if (now - stamp.current > 60 && !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
                stamp.current = now;
                const drop = document.createElement("i");
                drop.className = "fi-fm-drop";
                el.appendChild(drop);
                drop.animate([{ transform: "translate(-50%,-140%) scale(.6)", opacity: 0 }, { transform: "translate(-50%,10%) scale(1)", opacity: 1, offset: 0.7 }, { transform: "translate(-50%,40%) scale(1.5)", opacity: 0 }], { duration: 420, easing: "ease-in" }).onfinish = () => drop.remove();
                el.animate([{ transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 160 });
            }
            if (e.ready) burst(e.plot, CROP_BY_ID[e.crop as keyof typeof CROP_BY_ID]?.color ?? "#fff", 8);
            if (e.bumperStart) popAt(e.plot, "BUMPER CROP!", "#ffd23a", true);
        });
        return off;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tapPlot = (i: number) => {
        const { s: st, d: dd, say: tell } = live.current;
        const pl = st.farm.plots[i];
        if (!pl) return;
        if (!pl.c) {
            if (plant(st, i)) {
                const c = CROP_BY_ID[st.farm.plots[i].c as keyof typeof CROP_BY_ID];
                popAt(i, c.name, c.color);
                live.current.render();
            } else tell("Nothing to plant here yet.");
            return;
        }
        const out = harvest(st, farmCtx(dd), i, true);
        if (!out) return;
        const c = CROP_BY_ID[out.crop];
        burst(i, c.color, out.lucky ? 14 : 9);
        popAt(i, `+${amt((n) => String(Math.round(n)), out.units)} ${c.name}`, c.color, out.bumper || out.lucky);
        if (out.lucky) popAt(i, "TRIPLE!", "#ffe29a", true);
        if (out.pod) tell(`A ${PODS[out.pod].name} dropped! Open it below.`);
        live.current.render();
    };

    const pods = podCount(s);
    const dimWithPods = DIMS.filter((x) => (f.pods[x] || 0) > 0);
    const openPods = (all: boolean) => {
        const { n, last } = openAll(s, farmCtx(d), !all);
        if (n && last) {
            say(n === 1 ? `Pod: ${last.title}, ${last.sub}` : `Opened ${n} pods. Latest: ${last.title}, ${last.sub}`);
            render();
        }
    };
    const use = (id: (typeof ITEMS)[number]["id"]) => {
        const text = consumeItem(s, id);
        if (text) {
            say(text);
            render();
        }
    };
    const goal = goalOf(s);
    const ripe = readyCount(s);
    const empty = f.plots.filter((p) => !p.c).length;

    return (
        <>
            <div className="fi-fm-head" style={{ color: dim.color }}>
                {isl.name} <em>· {dim.name}</em>
            </div>
            <div ref={grid} className="fi-fm-grid" data-bump={bump} role="group" aria-label="Garden plots">
                {f.plots.map((pl, i) => {
                    const c = pl.c ? CROP_BY_ID[pl.c as keyof typeof CROP_BY_ID] : null;
                    const g = c ? Math.min(1, pl.p / c.time) : 0;
                    const rdy = !!c && plotReady(s, pl);
                    const left = c ? Math.max(0, (c.time - pl.p) / growSpeed(s, c)) : 0;
                    return (
                        <button
                            key={i}
                            type="button"
                            data-p={i}
                            data-state={!c ? "empty" : rdy ? "ready" : "growing"}
                            className="fi-fm-plot"
                            style={{ ["--oc" as string]: c?.color ?? "#6a4a2a", ["--g" as string]: g } as CSSProperties}
                            aria-label={!c ? `Empty plot ${i + 1}. Tap to plant ${sow?.name ?? "a crop"}.` : rdy ? `${c.name} is ripe. Tap to harvest.` : `${c.name} growing, ${fmtTime(left)} left.`}
                            onClick={() => tapPlot(i)}
                        >
                            {c ? (
                                <>
                                    <span className="fi-fm-crop" />
                                    <span className="fi-fm-n">{c.name}</span>
                                    <span className="fi-fm-t">{rdy ? "ripe!" : fmtTime(left)}</span>
                                    <span className="fi-fm-bar">
                                        <i style={{ width: `${g * 100}%` }} />
                                    </span>
                                </>
                            ) : (
                                <span className="fi-fm-plus">+</span>
                            )}
                        </button>
                    );
                })}
            </div>
            <p className="fi-mn-tip">
                <b>Tap a ripe plot</b> to pick it (hand-picked crops pay 25% more); tap an empty one to plant. Every press of the big button waters a random plot.
            </p>

            <div className="fi-fm-ctl">
                <button type="button" className="fi-mn-buy small" disabled={ripe === 0} onClick={() => { const n = harvestAll(s, farmCtx(d), true); if (n) { say(`Picked ${n} plot${n > 1 ? "s" : ""}.`); render(); } }}>
                    Harvest {ripe || ""}
                </button>
                <button type="button" className="fi-mn-buy small ghost" disabled={empty === 0 || !sow} onClick={() => { const n = plantAll(s); if (n) { say(`Planted ${n} plot${n > 1 ? "s" : ""}.`); render(); } }}>
                    Plant {empty || ""}
                </button>
                <span className="fi-mn-note">{sow ? `Planting ${s.farm.sow ? "" : "the best crop: "}` : "Nothing to plant here."}<b style={{ color: sow?.color }}>{sow?.name}</b></span>
            </div>

            <div className="fi-mn-vein" data-rush={bump}>
                <div className="fi-mn-vein-h">
                    {bump ? (
                        <>
                            <b>BUMPER CROP</b> <span>x{bumperMult(s).toFixed(1)} crops · {f.bumper} harvests left</span>
                        </>
                    ) : (
                        <>
                            <b>Bloom</b> <span>{Math.floor(f.bloom * 100)}% to a Bumper Crop</span>
                        </>
                    )}
                </div>
                <div className="fi-mn-vein-bar">
                    <i style={{ width: `${(bump ? f.bumper / bumperLen(s) : f.bloom) * 100}%` }} />
                </div>
            </div>

            {goal && <GoalCard s={s} goal={goal} render={render} say={say} />}

            <SectionTitle color={C}>Grows here</SectionTitle>
            <div className="fi-mn-table">
                {rows.map((r) => {
                    const c = r.crop;
                    const picked = f.sow === c.id;
                    return (
                        <Tip key={c.id} tip={<CropTip s={s} c={c} p={r.p} F={F} d={d} />}>
                            <div className="fi-mn-row" data-locked={!r.open} data-focus={picked} style={col(c.color)}>
                                <i className="fi-mn-sw" />
                                <span className="fi-mn-rn">{r.open ? c.name : "???"}</span>
                                <span className="fi-mn-bar">
                                    <i style={{ width: `${r.p * 100}%` }} />
                                </span>
                                <span className="fi-mn-pc">{r.open ? `${r.p >= 0.1 ? Math.round(r.p * 100) : +(r.p * 100).toFixed(1)}%` : <><Lock className="inline size-3" /> {c.need}</>}</span>
                                <span className="fi-mn-stk">{r.open ? F(Math.floor(haveCrop(s, c.id))) : ""}</span>
                                {r.open && (
                                    <button
                                        type="button"
                                        className="fi-mn-star"
                                        data-on={picked}
                                        aria-pressed={picked}
                                        aria-label={picked ? `Stop choosing ${c.name}` : `Plant ${c.name}`}
                                        onClick={() => {
                                            setSow(s, picked ? "" : c.id);
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
            <p className="fi-mn-note">Tap a star to plant that crop. Other islands and dimensions grow other crops: see the Biomes tab, and travel with I.</p>

            {(pods > 0 || itemCount(s) > 0) && (
                <div className="fi-mn-actions">
                    {pods > 0 && (
                        <div className="fi-mn-geode">
                            <span className="fi-mn-geode-n">
                                <McSymbol name="gem" /> {dimWithPods.map((x, i) => <span key={x} style={{ color: PODS[x].color }}>{i ? " · " : ""}<b>{f.pods[x]}</b> {PODS[x].name}{f.pods[x] === 1 ? "" : "s"}</span>)}
                            </span>
                            <Tip box tip={<TipCard title="Open a pod" color="var(--mc-light-purple)" lines={["A random reward: dust, tokens, an egg, shards, a Fragment or a gem. Nether and End pods pay more."]} foot="Click to open!" />}>
                                <button type="button" onClick={() => openPods(false)} className="fi-mn-crack" data-ready>
                                    Open
                                </button>
                            </Tip>
                            {pods > 1 && (
                                <button type="button" onClick={() => openPods(true)} className="fi-mn-crack all">
                                    All {pods}
                                </button>
                            )}
                        </div>
                    )}
                    {ITEMS.filter((it) => (f.items[it.id] || 0) > 0).map((it) => (
                        <Tip key={it.id} box tip={<TipCard title={it.name} color={it.color} lines={[it.desc]} foot="Click to use!" />}>
                            <button type="button" className="fi-mn-item" onClick={() => use(it.id)} style={col(it.color)}>
                                <i />
                                {it.name} <b>x{f.items[it.id]}</b>
                            </button>
                        </Tip>
                    ))}
                </div>
            )}

            {f.log.length > 0 && (
                <>
                    <SectionTitle color={C}>Recent finds</SectionTitle>
                    <ul className="fi-mn-log" aria-live="polite">
                        {f.log.slice(0, 5).map((l, i) => (
                            <li key={`${i}:${l.text}`} style={{ color: l.color }}>{l.text}</li>
                        ))}
                    </ul>
                </>
            )}
        </>
    );
}

function CropTip({ s, c, p, F, d }: { s: Ctx["s"]; c: CropDef; p: number; F: (n: number) => string; d?: Ctx["d"] }) {
    const tier = colTierOf(s.farm.grown[c.id] || 0);
    const ctx = d ? farmCtx(d) : null;
    const secs = c.time / growSpeed(s, c);
    return (
        <TipCard
            title={c.name}
            color={c.color}
            tag={c.need ? `Farming ${c.need}` : DIM_LABEL[c.dim].name}
            lines={farmLevel(s) < c.need ? [`Opens at Farming ${c.need}.`] : undefined}
            rows={[
                ["Mixed planting", p > 0 ? fmtPct(p) : "not here / locked"],
                ["Grows in", fmtTime(secs)],
                ["Crops per harvest", F(c.yield * Math.pow(hoePower(s), 0.55))],
                ...(ctx ? ([["Farming XP per harvest", F(cropXp(c) * ctx.xp)], ["Shards per harvest", F(cropShards(ctx, c))]] as [string, string][]) : []),
                ["Collection", `tier ${tier}/${COL_AT.length}`, c.color],
            ]}
            notes={[{ text: `Collection pays +${fmtPct(c.col[1])} ${c.colText} per tier`, color: c.color }, { text: `Grows on: ${cropIslands(c.id).map((id) => ISLAND_BY_ID[id]?.name ?? id).slice(0, 5).join(", ")}`, color: "var(--mc-aqua)" }]}
        />
    );
}

function GoalCard({ s, goal, render, say }: { s: Ctx["s"]; goal: NonNullable<ReturnType<typeof goalOf>>; render: () => void; say: (m: string) => void }) {
    const lvlOk = farmLevel(s) >= goal.need;
    const short = bottleneck(s, goal);
    const crop = short ? CROP_BY_ID[short] : null;
    const missing = Object.entries(goal.cost).some(([k, v]) => have(s, k as ResId) < (v ?? 0));
    const startable = Object.entries(goal.cost).some(([k]) => RECIPES.find((r) => r.id === k && r.kind === "good") && have(s, k as ResId) < (goal.cost[k as ResId] ?? 0));
    return (
        <div className="fi-mn-goal" style={{ ["--c" as string]: goal.color } as CSSProperties}>
            <div className="fi-mn-goal-h">
                <span>Next goal</span>
                <b>{goal.title}</b>
                {!lvlOk && <em><Lock className="inline size-3" /> Farming {goal.need}</em>}
            </div>
            <CostRow s={s} cost={goal.cost} />
            <div className="fi-mn-goal-f">
                {crop && missing && (
                    <button
                        type="button"
                        className="fi-mn-buy small ghost"
                        onClick={() => {
                            setSow(s, crop.id);
                            say(`Planting ${crop.name} by hand from now on.`);
                            render();
                        }}
                    >
                        Plant {crop.name}
                    </button>
                )}
                {startable && missing && (
                    <button
                        type="button"
                        className="fi-mn-buy small ghost"
                        onClick={() => {
                            const n = queueGoal(s);
                            say(n ? `Started ${n} craft${n > 1 ? "s" : ""} for the ${goal.title}.` : "Nothing to start: check crops and free ovens.");
                            render();
                        }}
                    >
                        Cook what is missing
                    </button>
                )}
                {crop && missing && <span className="fi-mn-goal-w">{crop.name} grows on {cropIslands(crop.id).slice(0, 2).map((id) => ISLAND_BY_ID[id]?.name ?? id).join(" and ")}</span>}
            </div>
        </div>
    );
}

// ---- Quick actions ----

function QuickBar({ s, d, render, say }: { s: Ctx["s"]; d: Ctx["d"]; render: () => void; say: (m: string) => void }) {
    const ctx = farmCtx(d);
    const f = s.farm;
    const ripe = readyCount(s);
    const empty = f.plots.filter((p) => !p.c).length;
    const sow = sowCrop(s);
    const ready = jobsReady(s);
    const pods = podCount(s);
    const feats = featsReady(s).length;
    const ups = FARM_UPS.filter((u) => canBuyUp(s, u).ok && Object.keys(u.cost).every((k) => isCrop(k))).length;
    const hands = CROPS.filter((c) => canBuyHand(s, c).ok && handCost(s, c) <= haveCrop(s, c.id) * 0.6).length;
    const hoe = canBuyHoe(s).ok;
    const goal = goalOf(s);
    const cook = !!goal && slotsFree(s) > 0 && Object.entries(goal.cost).some(([k, v]) => {
        const r = RECIPES.find((x) => x.id === k && x.kind === "good");
        return !!r && have(s, k as ResId) + f.jobs.filter((j) => j.r === k).reduce((a, j) => a + j.n, 0) < (v ?? 0) && canCraft(s, r, 1).ok;
    });
    const tonic = (f.items.tonic || 0) > 0 && f.bumper <= 0;

    const run = {
        harvest: () => {
            const n = harvestAll(s, ctx, true);
            return n ? `Picked ${n} plot${n > 1 ? "s" : ""}.` : "";
        },
        plant: () => {
            const n = plantAll(s);
            return n ? `Planted ${n} plot${n > 1 ? "s" : ""}.` : "";
        },
        collect: () => {
            const got = collectAll(s, Date.now());
            return got.length ? `Collected ${got.length} craft${got.length > 1 ? "s" : ""}.` : "";
        },
        open: () => {
            const { n, last } = openAll(s, ctx);
            return n && last ? `Opened ${n} pod${n > 1 ? "s" : ""}. Latest: ${last.title}, ${last.sub}` : "";
        },
        claim: () => {
            const got = claimAllFeats(s);
            return got.length ? `Claimed ${got.length} feat${got.length > 1 ? "s" : ""}.` : "";
        },
        hoe: () => {
            if (!canBuyHoe(s).ok) return "";
            const nm = HOES[s.farm.hoe + 1].name;
            return buyHoe(s) ? `Made the ${nm}!` : "";
        },
        ups: () => {
            const n = upgradeAll(s);
            return n ? `Bought ${n} upgrade${n > 1 ? "s" : ""}.` : "";
        },
        hands: () => {
            const n = hireAll(s);
            return n ? `Hired ${n} farmhand${n > 1 ? "s" : ""}.` : "";
        },
        cook: () => {
            const n = queueGoal(s);
            return n ? `Started ${n} craft${n > 1 ? "s" : ""} for your goal.` : "";
        },
        tonic: () => consumeItem(s, "tonic") ?? "",
    };
    const go = (keys: (keyof typeof run)[]) => {
        const out = keys.map((k) => run[k]()).filter(Boolean);
        if (out.length) {
            say(out.slice(0, 3).join(" "));
            render();
        }
    };
    const all = ripe + ready + pods + feats + ups + hands + (hoe ? 1 : 0) + (cook ? 1 : 0) + (empty && sow ? 1 : 0) > 0;
    const B = (k: keyof typeof run, label: string, tip: string, on: boolean, n?: number) => (
        <Tip key={k} box tip={<TipCard title={label} color={C} lines={[tip]} foot={on ? "Click!" : "Nothing to do right now"} />}>
            <button type="button" className="fi-mn-q" data-on={on} disabled={!on} onClick={() => go([k])}>
                {label}
                {on && n ? <i>{n}</i> : null}
            </button>
        </Tip>
    );
    return (
        <div className="fi-mn-quick" role="group" aria-label="Quick actions">
            {B("harvest", "Harvest", "Pick every ripe plot by hand (hand-picked crops pay 25% more).", ripe > 0, ripe)}
            {B("plant", "Plant", "Plant every empty plot with your chosen crop, or the best one here.", empty > 0 && !!sow, empty)}
            {B("collect", "Collect", "Collect every finished Cookhouse craft.", ready > 0, ready)}
            {B("open", "Open", "Open every seed pod you are holding.", pods > 0, pods)}
            {B("claim", "Claim", "Claim every feat you have earned.", feats > 0, feats)}
            {B("hoe", "Hoe", "Make the next hoe, if you have everything for it.", hoe)}
            {B("ups", "Upgrade", "Buy every crop-priced upgrade you can afford, cheapest first.", ups > 0, ups)}
            {B("hands", "Hands", "Hire farmhands while they cost under 60% of that crop's stock.", hands > 0, hands)}
            {B("cook", "Cook", "Start crafts for the goods your next goal is short of.", cook)}
            {B("tonic", "Tonic", "Drink a Harvest Tonic to start a Bumper Crop now.", tonic)}
            <button type="button" className="fi-mn-q all" data-on={all} disabled={!all} onClick={() => go(["harvest", "plant", "collect", "open", "claim", "hoe", "ups", "hands", "cook"])}>
                Do everything
            </button>
        </div>
    );
}

// ---- Tools: hoes, scarecrows, hand tools ----

function Tools({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
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
            <Loadout s={s} render={render} say={say} />
            <SectionTitle color={C}>Hand tools</SectionTitle>
            <UpgradeList s={s} cat="hand" render={render} />
            <p className="fi-mn-note">Everything here is permanent: rebirths and ascensions never touch your farm. Crops in stock: {F(Math.floor(CROPS.reduce((a, c) => a + haveCrop(s, c.id), 0)))}.</p>
        </>
    );
}

function Loadout({ s, render, say }: { s: Ctx["s"]; render: () => void; say: (m: string) => void }) {
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

// ---- Hands: farmhands and garden rig ----

function Hands({ s, d, F, render }: { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void }) {
    void d;
    const lvl = farmLevel(s);
    const dimOpen = (dm: Dim) => dm === "overworld" || openIslands(s).some((i) => i.dim === dm) || DIM_CROPS[dm].some((c) => (s.farm.grown[c.id] || 0) > 0);
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{F(totalHands(s))}</b> farmhands <span>each speeds up the crop it is hired for, and the bigger ones help the crops before them too</span>
                </div>
                <small>Farmhands work in every dimension at once, and crops keep growing while you are away. Hired hands act like they are slightly fewer as you stack them: ten act like seven.</small>
            </div>
            {DIMS.map((dm) => {
                if (!dimOpen(dm)) return null;
                const list = DIM_CROPS[dm];
                const shown = list.filter((c, i) => lvl >= c.need || (i > 0 && lvl >= list[i - 1].need) || i === 0);
                return (
                    <div key={dm} className="fi-mn-dimblock">
                        <SectionTitle color={DIM_LABEL[dm].color}>{DIM_LABEL[dm].name} farmhands</SectionTitle>
                        <div className="fi-mn-drills">
                            {shown.map((c) => (
                                <HandRow key={c.id} s={s} c={c} render={render} />
                            ))}
                        </div>
                    </div>
                );
            })}
            <SectionTitle color="var(--mc-aqua)">Garden rig</SectionTitle>
            <UpgradeList s={s} cat="rig" render={render} />
        </>
    );
}

function HandRow({ s, c, render }: { s: Ctx["s"]; c: CropDef; render: () => void }) {
    const n = s.farm.hands[c.id] || 0;
    const open = farmLevel(s) >= c.need;
    const can = canBuyHand(s, c);
    const list = DIM_CROPS[c.dim];
    const covers = list.filter((x, i) => i >= list.indexOf(c) - c.reach && i <= list.indexOf(c));
    const buy = (k: number) => {
        if (buyHand(s, c.id, k) > 0) render();
    };
    return (
        <div className="fi-mn-drill" data-locked={!open} style={col(c.color)}>
            <span className="fi-mn-chip big">
                <i />
            </span>
            <div className="min-w-0 flex-1">
                <div className="fi-mn-drill-t">
                    {c.name} <span>x{n}</span>
                </div>
                <div className="fi-mn-drill-s">
                    {open ? <>+{fmtPct(0.06 * (eff(n + 1) - eff(n)))} growth from the next one{covers.length > 1 ? `, to ${covers.map((x) => x.name).join(", ")}` : ""} <em>(now +{fmtPct(handBoost(s, c))})</em></> : <><Lock className="mr-1 inline size-3" />Opens at Farming {c.need}</>}
                </div>
            </div>
            {open && <ResChip s={s} id={c.id} n={handCost(s, c)} />}
            <button type="button" disabled={!can.ok} onClick={() => buy(1)} className="fi-mn-buy small">
                Hire
            </button>
            {open && (
                <button type="button" disabled={!can.ok} onClick={() => buy(10)} className="fi-mn-buy small ghost" aria-label={`Hire up to 10 ${c.name} farmhands`}>
                    x10
                </button>
            )}
        </div>
    );
}

// ---- Kitchen ----

function Kitchen({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    const f = s.farm;
    const lvl = farmLevel(s);
    const now = Date.now();
    const slots = ovenSlots(s);
    const ladle = upLevel(s, "ladle") > 0;
    const ready = jobsReady(s, now);
    const [kind, setKind] = useState<RecipeDef["kind"]>("good");
    const list = RECIPES.filter((r) => r.kind === kind);
    const done = (t: string) => {
        say(t);
        render();
    };
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{slots}</b> {slots === 1 ? "oven" : "ovens"} · crafts finish <b>{Math.round((cookSpeed(s) - 1) * 100)}%</b> faster <span>and keep cooking while you are away</span>
                </div>
                <small>Cook crops into goods, brew consumables and make permanent scarecrows. A finished craft waits in its oven until you collect it, and an oven is busy until you do.</small>
            </div>
            <div className="fi-mn-slots">
                {Array.from({ length: slots }, (_, i) => {
                    const ji = f.jobs.findIndex((x) => x.slot === i);
                    const j = ji >= 0 ? f.jobs[ji] : undefined;
                    const r = j ? RECIPES.find((x) => x.id === j.r) : null;
                    if (!j || !r) {
                        return (
                            <div key={i} className="fi-mn-slot" data-empty>
                                <span className="fi-mn-slot-n">Oven {i + 1}</span>
                                <span className="fi-mn-slot-s">Idle: start a craft below</span>
                            </div>
                        );
                    }
                    const total = jobSeconds(s, r, j.n);
                    const left = jobLeft(j, now);
                    const isDone = left <= 0;
                    return (
                        <div key={i} className="fi-mn-slot" data-done={isDone} style={col(r.color)}>
                            <span className="fi-mn-slot-n">{j.n > 1 ? `${j.n}x ` : ""}{r.name}</span>
                            <span className="fi-mn-slot-s">{isDone ? "Ready!" : `${fmtTime(left)} left`}</span>
                            <span className="fi-mn-slot-bar">
                                <i style={{ width: `${Math.min(100, (1 - left / Math.max(1, total)) * 100)}%` }} />
                            </span>
                            <button
                                type="button"
                                disabled={!isDone}
                                className="fi-mn-buy small"
                                onClick={() => {
                                    const c = collectJob(s, ji, Date.now());
                                    if (c) done(c.text);
                                }}
                            >
                                Collect
                            </button>
                            {ladle && r.kind !== "relic" && (
                                <button type="button" className="fi-mn-loop" data-on={!!j.loop} aria-pressed={!!j.loop} onClick={() => { toggleLoop(s, i); render(); }}>
                                    {j.loop ? "Repeating" : "Repeat"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            {ready > 1 && (
                <button type="button" className="fi-mn-buy wide" onClick={() => { const got = collectAll(s, Date.now()); if (got.length) done(`Collected ${got.length} crafts.`); }}>
                    Collect all {ready}
                </button>
            )}
            <div className="fi-mn-stock">
                {GOODS.filter((g) => (f.goods[g.id] || 0) > 0).map((g) => (
                    <span key={g.id} className="fi-mn-chip" style={col(g.color)}>
                        <i />
                        {g.name} <b>{f.goods[g.id]}</b>
                    </span>
                ))}
                {Object.keys(f.goods).length === 0 && <span className="fi-mn-chip locked">No goods yet: mill some wheat first</span>}
            </div>
            {slotsFree(s) <= 0 && <p className="fi-mn-note warn">Every oven is busy. Collect a finished craft to free one.</p>}
            <div className="fi-mn-seg small" role="tablist">
                {([["good", "Goods"], ["item", "Consumables"], ["relic", "Scarecrows"]] as const).map(([k, label]) => (
                    <button key={k} type="button" role="tab" aria-selected={kind === k} data-on={kind === k} onClick={() => setKind(k)}>
                        {label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {list.map((r) => (
                    <RecipeCard key={r.id} s={s} r={r} lvl={lvl} onDone={done} />
                ))}
            </div>
            <SectionTitle color="#ff9a4d">Kitchen parts</SectionTitle>
            <UpgradeList s={s} cat="kitchen" render={render} />
            <p className="fi-mn-note">Goods in stock: {F(Object.values(f.goods).reduce((a, b) => a + b, 0))}.</p>
        </>
    );
}

function RecipeCard({ s, r, lvl, onDone }: { s: Ctx["s"]; r: RecipeDef; lvl: number; onDone: (t: string) => void }) {
    const locked = lvl < r.need;
    const owned = r.kind === "relic" && ownsRelic(s, r.out);
    const batch = maxBatch(s, r);
    const one = canCraft(s, r, 1);
    const five = Math.min(5, batch);
    const many = canCraft(s, r, five);
    const stock = r.kind === "good" ? s.farm.goods[r.out] || 0 : r.kind === "item" ? s.farm.items[r.out] || 0 : 0;
    const go = (n: number) => {
        if (startCraft(s, r.id, n)) onDone(`${n > 1 ? `${n}x ` : ""}${r.name} is cooking.`);
    };
    return (
        <div className="fi-mn-rec" data-locked={locked} data-owned={owned} style={col(r.color)}>
            <div className="fi-mn-rec-h">
                <i className="fi-mn-sw" />
                <b>{r.name}</b>
                {stock > 0 && <span className="fi-mn-rec-n">x{stock}</span>}
                {owned && <span className="fi-mn-rec-n owned">Made</span>}
            </div>
            <div className="fi-mn-up-d">{locked ? <><Lock className="mr-1 inline size-3" />Opens at Farming {r.need}</> : r.desc}</div>
            <CostRow s={s} cost={r.inputs} />
            <div className="fi-mn-up-f">
                <span className="fi-mn-time">{fmtTime(jobSeconds(s, r, 1))}{owned ? "" : " each"}</span>
                {!owned && (
                    <span className="fi-mn-btns">
                        <Tip box tip={<TipCard title={r.name} color={r.color} lines={[r.desc]} rows={[["Takes", fmtTime(jobSeconds(s, r, 1))]]} foot={one.ok ? "Click to start!" : one.why} />}>
                            <button type="button" disabled={!one.ok} onClick={() => go(1)} className="fi-mn-buy small">
                                {r.kind === "relic" ? "Make" : "Start"}
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

// ---- Crops: collections ----

function Crops({ s, F }: { s: Ctx["s"]; F: (n: number) => string }) {
    const dimOpen = (dm: Dim) => dm === "overworld" || openIslands(s).some((i) => i.dim === dm) || DIM_CROPS[dm].some((c) => (s.farm.grown[c.id] || 0) > 0);
    return (
        <>
            <p className="fi-mn-note">Every crop you harvest fills its collection, and each tier pays a permanent bonus for the rest of the game. Finish a whole dimension to earn a set bonus on top.</p>
            {DIMS.map((dm) => {
                if (!dimOpen(dm)) return null;
                const set = dimSet(s, dm);
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
                            {DIM_CROPS[dm].map((c) => (
                                <CropCard key={c.id} s={s} c={c} F={F} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

function CropCard({ s, c, F }: { s: Ctx["s"]; c: CropDef; F: (n: number) => string }) {
    const grown = s.farm.grown[c.id] || 0;
    const tier = colTierOf(grown);
    const next = COL_AT[tier];
    const prev = tier > 0 ? COL_AT[tier - 1] : 0;
    const open = farmLevel(s) >= c.need || grown > 0;
    const where = cropIslands(c.id).map((id) => ISLAND_BY_ID[id]?.name ?? id);
    return (
        <div className="fi-mn-col" data-locked={!open} style={col(c.color)}>
            <div className="fi-mn-col-h">
                <span className="fi-mn-chip big">
                    <i />
                </span>
                <b>{open ? c.name : "???"}</b>
                <span className="fi-mn-col-n">{F(Math.floor(grown))} grown</span>
            </div>
            <div className="fi-mn-pips">
                {COL_AT.map((_, i) => (
                    <i key={i} data-on={i < tier} />
                ))}
            </div>
            <div className="fi-mn-col-r">
                {open ? (
                    <>
                        <span style={{ color: c.color }}>+{fmtPct(c.col[1] * tier)}</span> {c.colText}
                        {next ? <em> · next tier +{fmtPct(c.col[1])} at {F(next)}</em> : <em> · complete</em>}
                    </>
                ) : (
                    <>Opens at Farming {c.need}</>
                )}
            </div>
            {open && <div className="fi-mn-col-w">Grows on {where.slice(0, 3).join(", ")}{where.length > 3 ? ` +${where.length - 3}` : ""}</div>}
            {next && open && <div className="fi-mn-col-bar"><i style={{ width: `${Math.min(1, (grown - prev) / (next - prev)) * 100}%` }} /></div>}
        </div>
    );
}

// ---- Biomes: the dimensions ----

const POD_ROWS = ["Arcane Dust", "Rebirth Tokens", "Free egg", "Heap of shards", "Fracture Fragment", "Gem"];

function Biomes({ s, F }: { s: Ctx["s"]; F: (n: number) => string }) {
    const here = activeIsland(s).dim;
    const openIds = new Set(openIslands(s).map((i) => i.id));
    const lvl = farmLevel(s);
    return (
        <>
            <p className="fi-mn-note">Each dimension grows its own crops, drops its own seed pods and changes how farming works. You cannot change dimension from here: travel from the Islands tab (press I), and the garden follows you. Plots keep what is planted in them.</p>
            {DIMS.map((dm) => {
                const lab = DIM_LABEL[dm];
                const fx = DIM_FX[dm];
                const isls = ISLANDS.filter((i) => i.dim === dm);
                const reach = isls.some((i) => openIds.has(i.id));
                const firstLocked = isls.filter((i) => !openIds.has(i.id) && Number.isFinite(i.at)).sort((a, b) => a.at - b.at)[0];
                const set = dimSet(s, dm);
                const w = POD_W[dm];
                const wt = w.reduce((a, b) => a + b, 0);
                return (
                    <div key={dm} className="fi-mn-world" data-here={here === dm} data-locked={!reach} style={{ ["--c" as string]: lab.color } as CSSProperties}>
                        <div className="fi-mn-world-h">
                            <b>{lab.name}</b>
                            <span className="fi-mn-tag">{fx.tag}</span>
                            {here === dm && <span className="fi-mn-here">You are here</span>}
                            {!reach && <span className="fi-mn-lock"><Lock className="inline size-3" /> {firstLocked ? `${F(firstLocked.at)} shards` : "Locked"}</span>}
                        </div>
                        <p className="fi-mn-world-b">{fx.blurb}</p>
                        <div className="fi-mn-fx">
                            {fx.lines.map((l) => (
                                <span key={l}>{l}</span>
                            ))}
                        </div>
                        <div className="fi-mn-world-s">Islands</div>
                        <div className="fi-mn-isl">
                            {isls.map((i) => (
                                <span key={i.id} data-open={openIds.has(i.id)} style={{ ["--oc" as string]: i.color } as CSSProperties}>
                                    {openIds.has(i.id) ? "" : <Lock className="inline size-3" />} {i.name}
                                </span>
                            ))}
                        </div>
                        <div className="fi-mn-world-s">Crops</div>
                        <div className="fi-mn-pool">
                            {DIM_CROPS[dm].map((c) => {
                                const odds = cropIslands(c.id).map((id) => {
                                    const t = ISLAND_CROPS[id];
                                    return (t.find(([k]) => k === c.id)?.[1] ?? 0) / t.reduce((a, [, x]) => a + x, 0);
                                }).filter((x) => x > 0);
                                const lo = Math.min(...odds);
                                const hi = Math.max(...odds);
                                const open = lvl >= c.need;
                                return (
                                    <Tip key={c.id} tip={<CropTip s={s} c={c} p={0} F={F} />}>
                                        <div className="fi-mn-prow" data-locked={!open} style={col(c.color)}>
                                            <i className="fi-mn-sw" />
                                            <span className="fi-mn-rn">{open ? c.name : "???"}</span>
                                            <span className="fi-mn-pc">{odds.length ? `${Math.round(lo * 100)}${hi - lo > 0.01 ? `-${Math.round(hi * 100)}` : ""}%` : "-"}</span>
                                            <span className="fi-mn-pn">{c.need ? <><Lock className="inline size-3" /> {c.need}</> : "any"}</span>
                                        </div>
                                    </Tip>
                                );
                            })}
                        </div>
                        <div className="fi-mn-world-s">{PODS[dm].name}</div>
                        <div className="fi-mn-geo" style={{ ["--oc" as string]: PODS[dm].color } as CSSProperties}>
                            {POD_ROWS.map((n, k) => (
                                <span key={n}>
                                    {n} <b>{Math.round((w[k] / wt) * 100)}%</b>
                                </span>
                            ))}
                        </div>
                        <p className="fi-mn-world-b">Tokens from these pods x{POD_TOKENS[dm]}. {fx.pod > 1 ? `Found ${Math.round((fx.pod - 1) * 100)}% more often here.` : "Found at the normal rate."}</p>
                        <div className="fi-mn-world-s">Set bonus</div>
                        <div className="fi-mn-setrow">
                            {SET_STEPS.map((st) => (
                                <span key={st.tier} className="fi-mn-set" data-on={set.tier >= st.tier} style={{ ["--oc" as string]: lab.color } as CSSProperties}>
                                    All tier {st.tier}: +{fmtPct(st.bonus)} shards
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

// ---- Feats ----

const rewardText = (r: FeatReward) => (r.stat ? fmtStat(r.stat[0], r.stat[1]) : r.grant ? `+${r.grant[1]} ${GRANT_LABEL[r.grant[0]]}` : "");

function Feats({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    const ready = featsReady(s);
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{s.farm.claimed.length}</b> of {FEATS.length} feats claimed <span>{ready.length ? `${ready.length} ready` : "keep farming"}</span>
                </div>
                <small>Every kind of thing you do on the farm has a ladder of feats. Each one pays tokens, eggs, dust or a permanent stat, and some pay a gem.</small>
            </div>
            <button
                type="button"
                className="fi-mn-buy wide"
                disabled={ready.length === 0}
                onClick={() => {
                    const got = claimAllFeats(s);
                    if (got.length) {
                        say(`Claimed ${got.length} feat${got.length > 1 ? "s" : ""}: ${got.slice(0, 2).map((f) => `${f.ladder.name} ${f.tier + 1}`).join(", ")}${got.length > 2 ? "..." : ""}`);
                        render();
                    }
                }}
            >
                {ready.length ? `Claim all ${ready.length}` : "Nothing to claim"}
            </button>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {FEAT_LADDERS.map((l) => {
                    const v = l.metric(s);
                    const nextIdx = l.at.findIndex((a, i) => !s.farm.claimed.includes(`${l.key}:${i}`) && v < a);
                    const prev = nextIdx > 0 ? l.at[nextIdx - 1] : 0;
                    return (
                        <div key={l.key} className="fi-mn-feat" style={{ ["--c" as string]: l.color } as CSSProperties}>
                            <div className="fi-mn-up-h">
                                <b>{l.name}</b>
                                <span>{F(Math.floor(v))} {l.unit}</span>
                            </div>
                            <div className="fi-mn-tiers">
                                {l.at.map((a, i) => {
                                    const f = FEATS.find((x) => x.id === `${l.key}:${i}`)!;
                                    const claimed = featClaimed(s, f);
                                    const rdy = featReady(s, f);
                                    return (
                                        <Tip key={a} box tip={<TipCard title={`${l.name} ${i + 1}`} color={l.color} lines={[`${F(a)} ${l.unit}`]} notes={f.rewards.map((r) => ({ text: rewardText(r), color: l.color }))} foot={claimed ? "Claimed" : rdy ? "Click to claim!" : `${F(Math.max(0, Math.ceil(a - v)))} to go`} />}>
                                            <button
                                                type="button"
                                                className="fi-mn-tier"
                                                data-state={claimed ? "done" : rdy ? "ready" : "locked"}
                                                disabled={!rdy}
                                                onClick={() => {
                                                    const c = claimFeat(s, f.id);
                                                    if (c) {
                                                        say(`${l.name} ${i + 1}: ${c.rewards.map(rewardText).join(", ")}`);
                                                        render();
                                                    }
                                                }}
                                            >
                                                {claimed ? "✓" : F(a)}
                                            </button>
                                        </Tip>
                                    );
                                })}
                            </div>
                            {nextIdx >= 0 && <div className="fi-mn-col-bar"><i style={{ width: `${Math.min(1, Math.max(0, (v - prev) / (l.at[nextIdx] - prev))) * 100}%` }} /></div>}
                            <div className="fi-mn-up-d">{nextIdx >= 0 ? `Next: ${l.rewards[nextIdx].map(rewardText).join(", ")}` : "Every tier claimed"}</div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export const FARM_CSS = `
.fi-fm .fi-mn-seg button[data-on="true"]{background:color-mix(in oklch,${C} 22%,transparent);color:${C};box-shadow:inset 0 -2px 0 ${C}}
.fi-fm .fi-mn-vein-h b{color:${C}}
.fi-fm .fi-mn-vein[data-rush="true"] .fi-mn-vein-h b{color:#ffd23a}
.fi-fm .fi-mn-vein-bar i{background:linear-gradient(90deg,#5aa02a,${C});box-shadow:0 0 10px color-mix(in oklch,${C} 60%,transparent)}
.fi-fm .fi-mn-vein[data-rush="true"] .fi-mn-vein-bar i{background:linear-gradient(90deg,#ffb020,#ffe066);box-shadow:0 0 14px #ffd23a}
.fi-fm .fi-mn-q[data-on="true"]{border-color:color-mix(in oklch,${C} 65%,transparent);background:color-mix(in oklch,${C} 16%,transparent)}
.fi-fm .fi-mn-q[data-on="true"]:hover{background:color-mix(in oklch,${C} 28%,transparent)}
.fi-fm .fi-mn-q.all[data-on="true"]{background:linear-gradient(90deg,color-mix(in oklch,${C} 30%,transparent),color-mix(in oklch,#ffd23a 24%,transparent))}
.fi-fm .fi-mn-tip b{color:${C}}
.fi-mn-quick .fi-tw-box{display:block;min-width:0}
.fi-mn-quick .fi-mn-q{width:100%}
.fi-fm-head{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.78rem}
.fi-fm-head em{font-style:normal;font-weight:400;color:#fffc;font-size:.64rem}
.fi-fm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(4.6rem,1fr));gap:.45rem;width:100%;max-width:40rem;margin:0 auto;padding:.6rem;border-radius:1.1rem;border:1px solid color-mix(in oklch,${C} 40%,transparent);background:radial-gradient(ellipse at 50% 0%,color-mix(in oklch,${C} 10%,#15120a),#0b0a06 80%);box-shadow:inset 0 0 40px rgba(0,0,0,.55)}
.fi-fm-grid[data-bump="true"]{border-color:#ffd23a;box-shadow:inset 0 0 40px rgba(0,0,0,.5),0 0 28px -4px #ffd23a;animation:fi-mn-rush 1s ease-in-out infinite}
.fi-fm-plot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:.15rem;aspect-ratio:1;min-width:0;padding:.3rem .2rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,#4a3320,#2c1d12);box-shadow:inset 0 -6px 10px rgba(0,0,0,.4),0 3px 0 rgba(0,0,0,.35);overflow:visible;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .1s,border-color .2s}
.fi-fm-plot:active{transform:scale(.95)}
.fi-fm-plot[data-state="empty"]{background:rgba(255,255,255,.03);border-style:dashed;border-color:rgba(255,255,255,.2);box-shadow:none;justify-content:center}
.fi-fm-plot[data-state="ready"]{border-color:var(--oc);animation:fi-mn-ready 1.4s ease-in-out infinite;box-shadow:inset 0 -6px 10px rgba(0,0,0,.4),0 0 16px -2px var(--oc)}
.fi-fm-plus{font-family:var(--font-minecraft,inherit);font-size:1.4rem;color:var(--muted-foreground)}
.fi-fm-crop{position:absolute;left:50%;top:44%;width:calc(24% + 46% * var(--g));aspect-ratio:1;transform:translate(-50%,-50%);border-radius:48% 52% 44% 56%/56% 44% 56% 44%;background:radial-gradient(circle at 32% 30%,#fff9 0 12%,transparent 30%),var(--oc);box-shadow:0 0 12px -2px var(--oc),inset 0 -3px 5px rgba(0,0,0,.3);transition:width .2s linear}
.fi-fm-plot[data-state="ready"] .fi-fm-crop{animation:fi-fm-bob 1s ease-in-out infinite}
@keyframes fi-fm-bob{50%{transform:translate(-50%,-58%) scale(1.06)}}
.fi-fm-n{position:relative;z-index:1;max-width:100%;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.52rem;color:#fff;text-shadow:0 1px 0 #000,0 0 6px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-fm-t{position:relative;z-index:1;font-family:var(--font-rubik,inherit);font-size:.5rem;font-weight:600;color:#fffd;text-shadow:0 1px 0 #000}
.fi-fm-bar{position:relative;z-index:1;width:86%;height:.2rem;border-radius:999px;background:rgba(0,0,0,.5);overflow:hidden}
.fi-fm-bar i{display:block;height:100%;background:var(--oc);box-shadow:0 0 5px var(--oc);transition:width .15s linear}
.fi-fm-drop{position:absolute;left:50%;top:30%;z-index:4;width:.5rem;height:.7rem;border-radius:50% 50% 50% 50%/65% 65% 35% 35%;background:#6fb4ff;box-shadow:0 0 8px #6fb4ff;pointer-events:none}
.fi-fm-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
@media (max-width:420px){.fi-fm-grid{gap:.3rem;padding:.4rem}.fi-fm-n{font-size:.46rem}}
@media (prefers-reduced-motion:reduce){.fi-fm-plot,.fi-fm-grid,.fi-fm-crop{animation:none!important}}
`;

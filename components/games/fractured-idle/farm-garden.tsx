"use client";

import { fmtInt } from "@/lib/fractured-idle/format";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { sfx } from "@/lib/sound/sounds";
import { fmtTime } from "@/lib/fractured-idle/engine";
import { ISLANDS } from "@/lib/fractured-idle/islands";
import type { Dim } from "@/lib/fractured-idle/islands";
import { activeIsland } from "@/lib/fractured-idle/island-logic";
import {
    CROP_BY_ID,
    DIMS,
    DIM_FX,
    DIM_LABEL,
    ITEMS,
    KIND_INFO,
    PODS,
    RECIPES,
    bloomNeed,
    bottleneck,
    bumperLen,
    bumperMult,
    consumeItem,
    cropIcon,
    cropTable,
    cropUnits,
    fieldBonus,
    fieldCap,
    fieldSize,
    recommend,
    crewLevel,
    farmCtx,
    gardenOpen,
    goalOf,
    growSpeed,
    harvest,
    harvestAll,
    have,
    haveCrop,
    itemCount,
    onWater,
    openAll,
    plant,
    plantAll,
    plotReady,
    podCount,
    queueGoal,
    readyCount,
    setSow,
    sowCrop,
    streakBonus,
    streakNow,
    streakWindow,
    tend,
    cropIslands,
    type ResId,
} from "@/lib/fractured-idle/farm";
import { ISLAND_BY_ID } from "@/lib/fractured-idle/islands";
import { CostRow, CropTip, amt, col, fmtPct, C } from "./farm-bits";
import { Tip, TipCard } from "./tooltip";
import { SectionTitle, type Ctx } from "./ui";
import { ItemIcon, RecentFinds } from "./skill-kit";
import { SAGA_BY_ID, chapterFrac, chapterReady, currentChapter, tasksDone } from "@/lib/fractured-idle/sagas";

// The Garden: one garden per dimension (a biome), every open one growing at once, with a tab for each. Tap an empty
// plot to plant, tap a growing one to tend it (a burst of growth), tap a ripe one to pick it; picking back to back builds a
// streak. A card at the top shows the current Farmhand Saga chapter and opens the Level page.

type P = { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void; say: (m: string) => void };

const BIOME_ICON: Record<Dim, "flower" | "heat" | "comet"> = { overworld: "flower", nether: "heat", end: "comet" };
// ---- The saga card (the old guide lives in the Farmhand Saga now) ----

function SagaNudge({ s, open }: { s: Ctx["s"]; open: () => void }) {
    const saga = SAGA_BY_ID.farming;
    const ch = currentChapter(s, saga);
    if (!ch) {
        return (
            <button type="button" className="fi-fg" data-done="" onClick={open} style={{ textAlign: "left" }}>
                <div className="fi-fg-h"><span>Farmhand Saga</span><b>Complete</b></div>
                <p className="fi-fg-p">You have finished every chapter. Open the Level page for the finale and your other sagas.</p>
            </button>
        );
    }
    const ready = chapterReady(s, ch);
    const next = ch.tasks.find((t) => t.prog(s)[0] < t.prog(s)[1]);
    const pr = next?.prog(s);
    return (
        <button type="button" className="fi-fg" data-ready={ready} onClick={open} style={{ textAlign: "left" }}>
            <div className="fi-fg-h">
                <span>Farmhand Saga · Chapter {ch.n}</span>
                <b>{tasksDone(s, ch)} of {ch.tasks.length} tasks</b>
            </div>
            <div className="fi-fg-bar"><i style={{ width: `${chapterFrac(s, ch) * 100}%` }} /></div>
            <div className="fi-fg-t">
                <span className="fi-fg-mark">{ready ? "✔" : "➜"}</span>
                {ready ? `${ch.name} is ready to claim` : next?.text}
                <em>{ready ? "Open the Level page" : ch.name}</em>
            </div>
            {pr && !ready && (
                <div className="fi-fg-prog">
                    <span><i style={{ width: `${Math.min(100, (pr[0] / pr[1]) * 100)}%` }} /></span>
                    <small>{fmtInt(Math.min(pr[0], pr[1]))} / {fmtInt(pr[1])}</small>
                </div>
            )}
        </button>
    );
}

export function Garden({ s, d, F, render, say, openSaga }: P & { openSaga: () => void }) {
    const f = s.farm;
    const here = activeIsland(s).dim;
    const [pick, setPick] = useState<Dim>(here);
    const dim: Dim = gardenOpen(s, pick) ? pick : "overworld";
    const lab = DIM_LABEL[dim];
    const fx = DIM_FX[dim];
    const plots = f.gardens[dim];
    const rows = cropTable(s, dim);
    const sow = sowCrop(s, dim);
    const bump = f.bumper > 0;
    const grid = useRef<HTMLDivElement>(null);
    const stamp = useRef(0);
    const live = useRef({ s, d, say, render, dim });
    useEffect(() => {
        live.current = { s, d, say, render, dim };
    });

    const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
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
        if (!el || reduced()) return;
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
    const dropAt = (i: number, color = "#6fb4ff") => {
        const el = grid.current?.querySelector<HTMLElement>(`[data-p="${i}"]`);
        if (!el || reduced()) return;
        const drop = document.createElement("i");
        drop.className = "fi-fm-drop";
        drop.style.background = color;
        drop.style.boxShadow = `0 0 8px ${color}`;
        el.appendChild(drop);
        drop.animate([{ transform: "translate(-50%,-140%) scale(.6)", opacity: 0 }, { transform: "translate(-50%,10%) scale(1)", opacity: 1, offset: 0.7 }, { transform: "translate(-50%,40%) scale(1.5)", opacity: 0 }], { duration: 420, easing: "ease-in" }).onfinish = () => drop.remove();
        el.animate([{ transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 160 });
    };

    // The big button waters a random plot in any garden: the drop only falls here when it was this garden's plot.
    useEffect(() => {
        const off = onWater((e) => {
            if (e.plot < 0 || e.dim !== live.current.dim) return;
            const now = performance.now();
            if (now - stamp.current > 60) {
                stamp.current = now;
                dropAt(e.plot);
            }
            if (e.ready) burst(e.plot, CROP_BY_ID[e.crop as keyof typeof CROP_BY_ID]?.color ?? "#fff", 8);
            if (e.bumperStart) popAt(e.plot, "BUMPER CROP!", "#ffd23a", true);
        });
        return off;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tapPlot = (i: number) => {
        const { s: st, d: dd, say: tell, dim: dm } = live.current;
        const pl = st.farm.gardens[dm][i];
        if (!pl) return;
        if (!pl.c) {
            if (plant(st, dm, i)) {
                const c = CROP_BY_ID[st.farm.gardens[dm][i].c as keyof typeof CROP_BY_ID];
                popAt(i, c.name, c.color);
                sfx("on");
                live.current.render();
            } else tell("Nothing to plant here yet.");
            return;
        }
        if (!plotReady(st, pl)) {
            const t = tend(st, dm, i);
            if (t) {
                const c = CROP_BY_ID[pl.c as keyof typeof CROP_BY_ID];
                sfx("tap");
                dropAt(i, "#9be0ff");
                popAt(i, `+${amt((n) => String(Math.round(n)), t.boost)}s`, "#9be0ff");
                if (t.ready) burst(i, c.color, 8);
                live.current.render();
            }
            return;
        }
        const out = harvest(st, farmCtx(dd), dm, i, true);
        if (!out) return;
        const c = CROP_BY_ID[out.crop];
        burst(i, out.golden ? "#ffd23a" : c.color, out.lucky || out.golden ? 16 : 9);
        popAt(i, `+${amt((n) => String(Math.round(n)), out.units)} ${c.name}`, out.golden ? "#ffd23a" : c.color, out.bumper || out.lucky || out.golden);
        sfx(out.golden ? "trophy" : "collect");
        if (out.golden) popAt(i, "GOLDEN!", "#ffd23a", true);
        else if (out.lucky) popAt(i, "TRIPLE!", "#ffe29a", true);
        if (out.streak > 1 && out.streak % 5 === 0) popAt(i, `STREAK x${out.streak}`, "#ff9a4d", true);
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
    const rec = recommend(s, dim);
    const fld = sow ? fieldSize(s, dim, sow.id) : 0;
    const ripe = readyCount(s, dim);
    const empty = plots.filter((p) => !p.c).length;
    const sn = streakNow(s);
    const sb = streakBonus(s, sn);
    const win = streakWindow(s);
    const left = sn > 0 ? Math.max(0, win - (Date.now() - f.streakAt) / 1000) : 0;

    return (
        <>
            <SagaNudge s={s} open={openSaga} />

            <div className="fi-fb" role="tablist" aria-label="Gardens">
                {DIMS.map((dm) => {
                    const open = gardenOpen(s, dm);
                    const l = DIM_LABEL[dm];
                    const r = open ? readyCount(s, dm) : 0;
                    const growing = open ? f.gardens[dm].filter((p) => p.c && !plotReady(s, p)).length : 0;
                    const firstLocked = ISLANDS.filter((i) => i.dim === dm && Number.isFinite(i.at)).sort((a, b) => a.at - b.at)[0];
                    return (
                        <Tip
                            key={dm}
                            box
                            tip={
                                <TipCard
                                    title={l.name}
                                    color={l.color}
                                    tag={DIM_FX[dm].tag}
                                    lines={[open ? DIM_FX[dm].blurb : `Travel to a ${l.name} island to open this garden${firstLocked ? ` (first one at ${F(firstLocked.at)} shards)` : ""}. It then grows alongside the others.`]}
                                    rows={open ? [["Plots", String(f.gardens[dm].length)], ["Ripe", String(r), r ? "var(--mc-green)" : undefined], ["Growing", String(growing)]] : undefined}
                                    notes={open ? DIM_FX[dm].lines.map((t) => ({ text: t, color: l.color })) : undefined}
                                    cta={open && dm !== dim ? "Click to look at this garden!" : undefined}
                                />
                            }
                        >
                            <button type="button" role="tab" aria-selected={dm === dim} data-on={dm === dim} data-locked={!open} aria-disabled={!open} className="fi-fb-t" style={{ ["--c" as string]: l.color } as CSSProperties} onClick={() => open && setPick(dm)}>
                                <span className="fi-fb-i">{open ? <McSymbol name={BIOME_ICON[dm]} /> : <Lock className="size-4" />}</span>
                                <span className="fi-fb-n">{l.name}</span>
                                <span className="fi-fb-s">{open ? `${f.gardens[dm].length} plots` : "locked"}</span>
                                {r > 0 && <i className="fi-fb-r">{r}</i>}
                            </button>
                        </Tip>
                    );
                })}
            </div>

            <div className="fi-fm-head" style={{ color: lab.color }}>
                {lab.name} <em>· {fx.tag} · {fx.lines.join(" · ")}</em>
            </div>

            {rec && (
                <div className="fi-fm-rec" style={col(rec.crop.color)}>
                    <ItemIcon icon={cropIcon[rec.crop.id]} color={rec.crop.color} />
                    <span className="tx">
                        <small>Recommended crop</small>
                        <b>{rec.crop.name}</b>
                        <em>{rec.why}</em>
                    </span>
                    {sow?.id === rec.crop.id ? (
                        <span className="fi-lv-chip" style={{ ["--k" as string]: rec.crop.color } as CSSProperties}>You are planting it</span>
                    ) : (
                        <button type="button" className="fi-lv-btn" onClick={() => { setSow(s, rec.crop.id, dim); say(`Planting ${rec.crop.name} in the ${lab.name}.`); render(); }}>
                            Plant it here
                        </button>
                    )}
                </div>
            )}
            {sow && fld > 0 && (
                <div className="fi-fm-field">
                    <b>Field of {sow.name}: {fld} plot{fld === 1 ? "" : "s"}</b>
                    <span>+{fmtPct(fieldBonus(s, fld), 0)} crops from each (cap +{fmtPct(fieldCap(s), 0)}). {fld < plots.length ? "Plant the whole garden with one crop for the biggest bonus and the fastest collection." : "The whole garden is one field."}{crewLevel(s, "agron") > 0 ? " Your Agronomists keep it planted." : ""}</span>
                </div>
            )}

            <div className="fi-fm-streak" data-on={sn > 0} style={{ ["--w" as string]: win } as CSSProperties}>
                <div className="fi-fm-streak-h">
                    <b>{sn > 0 ? `Streak x${sn}` : "Streak"}</b>
                    <span>{sn > 0 ? `+${fmtPct(sb, 0)} crops on your next hand-pick` : `Pick ripe plots back to back, within ${win}s of each other`}</span>
                </div>
                <div className="fi-fm-streak-bar"><i key={f.streakAt} style={sn > 0 ? { animationDuration: `${Math.max(0.2, left)}s`, width: `${(left / win) * 100}%` } : { width: 0 }} /></div>
            </div>

            <div ref={grid} className="fi-fm-grid" data-dim={dim} data-bump={bump} role="group" aria-label={`${lab.name} garden plots`}>
                {plots.map((pl, i) => {
                    const c = pl.c ? CROP_BY_ID[pl.c as keyof typeof CROP_BY_ID] : null;
                    const g = c ? Math.min(1, pl.p / c.time) : 0;
                    const rdy = !!c && plotReady(s, pl);
                    const eta = c ? Math.max(0, (c.time - pl.p) / growSpeed(s, c)) : 0;
                    return (
                        <Tip
                            key={i}
                            delay={90}
                            tip={() => {
                                const st = live.current.s;
                                const p2 = st.farm.gardens[live.current.dim][i];
                                const cc = p2?.c ? CROP_BY_ID[p2.c as keyof typeof CROP_BY_ID] : null;
                                if (!cc || !p2) return <TipCard title="Empty plot" color={lab.color} lines={[sow ? `Tap to plant ${sow.name}.` : "Nothing is open to plant here yet."]} cta={sow ? "Click to plant!" : undefined} />;
                                const ready = plotReady(st, p2);
                                return (
                                    <TipCard
                                        title={cc.name}
                                        color={cc.color}
                                        tag={p2.g ? "GOLDEN" : KIND_INFO[cc.kind].name}
                                        rows={[
                                            ["Growth", ready ? "ripe" : `${Math.floor(Math.min(1, p2.p / cc.time) * 100)}%`],
                                            ...(ready ? [] : ([["Ripe in", fmtTime(Math.max(0, (cc.time - p2.p) / growSpeed(st, cc)))]] as [string, string][])),
                                            ["Pays about", `${amt(F, cropUnits(st, cc) * (p2.g ? 5 : 1) * (live.current.s.farm.bumper > 0 ? bumperMult(st) : 1))} crops`, p2.g ? "#ffd23a" : undefined],
                                        ]}
                                        notes={p2.g ? [{ text: "Golden: 5x crops and 3x shards", color: "#ffd23a" }] : undefined}
                                        cta={ready ? "Click to pick it!" : "Click to tend it!"}
                                    />
                                );
                            }}
                        >
                            <button
                                type="button"
                                data-p={i}
                                data-state={!c ? "empty" : rdy ? "ready" : "growing"}
                                data-gold={pl.g ? "" : undefined}
                                data-snd="off"
                                className="fi-fm-plot"
                                style={{ ["--oc" as string]: c?.color ?? "#6a4a2a", ["--g" as string]: g } as CSSProperties}
                                aria-label={!c ? `Empty plot ${i + 1}. Tap to plant ${sow?.name ?? "a crop"}.` : rdy ? `${c.name} is ripe. Tap to harvest.` : `${c.name} growing, ${fmtTime(eta)} left. Tap to tend.`}
                                onClick={() => tapPlot(i)}
                            >
                                {c ? (
                                    <>
                                        <span className="fi-fm-crop" />
                                        <span className="fi-fm-n">{c.name}</span>
                                        <span className="fi-fm-t">{rdy ? "ripe!" : fmtTime(eta)}</span>
                                        <span className="fi-fm-bar">
                                            <i style={{ width: `${g * 100}%` }} />
                                        </span>
                                    </>
                                ) : (
                                    <span className="fi-fm-plus">+</span>
                                )}
                            </button>
                        </Tip>
                    );
                })}
            </div>
            <p className="fi-mn-tip">
                <b>Tap a ripe plot</b> to pick it (hand-picks pay 25% more and chain a streak), <b>tap a growing one</b> to tend it, tap an empty one to plant. Every press of the big button waters a random plot in <b>any</b> garden.
            </p>

            <div className="fi-fm-ctl">
                <button type="button" className="fi-mn-buy small" disabled={ripe === 0} onClick={() => { const n = harvestAll(s, farmCtx(d), true, dim); if (n) { say(`Picked ${n} plot${n > 1 ? "s" : ""} in the ${lab.name}.`); sfx("bulk"); render(); } }}>
                    Harvest {ripe || ""}
                </button>
                <button type="button" className="fi-mn-buy small ghost" disabled={empty === 0 || !sow} onClick={() => { const n = plantAll(s, Math.random, dim); if (n) { say(`Planted ${n} plot${n > 1 ? "s" : ""} in the ${lab.name}.`); render(); } }}>
                    Plant {empty || ""}
                </button>
                <span className="fi-mn-note">{sow ? `Planting ${f.sow[dim] ? "" : "the best crop: "}` : "Nothing to plant here yet."}<b style={{ color: sow?.color }}>{sow?.name}</b></span>
            </div>

            <div className="fi-mn-vein" data-rush={bump}>
                <div className="fi-mn-vein-h">
                    {bump ? (
                        <>
                            <b>BUMPER CROP</b> <span>x{bumperMult(s).toFixed(1)} crops · {f.bumper} harvests left (every garden)</span>
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

            <SectionTitle color={lab.color}>Crops in the {lab.name}</SectionTitle>
            <div className="fi-mn-table">
                {rows.map((r) => {
                    const c = r.crop;
                    const picked = f.sow[dim] === c.id;
                    return (
                        <Tip key={c.id} tip={<CropTip s={s} c={c} p={r.p} F={F} d={d} />}>
                            <div className="fi-mn-row" data-locked={!r.open} data-focus={picked} style={col(c.color)}>
                                <i className="fi-mn-sw" />
                                <span className="fi-mn-rn">{r.open ? c.name : "???"}{rec?.crop.id === c.id && <em className="fi-fm-recdot"> ◂ best now</em>}</span>
                                <span className="fi-mn-bar">
                                    <i style={{ width: `${r.p * 100}%` }} />
                                </span>
                                <span className="fi-mn-pc">{r.open ? (r.p > 0 ? `${r.p >= 0.1 ? Math.round(r.p * 100) : fmtPct(r.p, 1)}` : "pick") : <><Lock className="inline size-3" /> {c.need}</>}</span>
                                <span className="fi-mn-stk">{r.open ? F(Math.floor(haveCrop(s, c.id))) : ""}</span>
                                {r.open && (
                                    <button
                                        type="button"
                                        className="fi-mn-star"
                                        data-on={picked}
                                        aria-pressed={picked}
                                        aria-label={picked ? `Stop choosing ${c.name}` : `Plant ${c.name}`}
                                        onClick={() => {
                                            setSow(s, picked ? "" : c.id, dim);
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
            <p className="fi-mn-note">Tap a star to plant that crop in this garden. The odds are for a mixed planting and follow the furthest {lab.name} island you can reach; every crop you have the level for can be picked by hand.</p>

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

            <RecentFinds log={f.log} color={C} noun="harvests" />
        </>
    );
}

function GoalCard({ s, goal, render, say }: { s: Ctx["s"]; goal: NonNullable<ReturnType<typeof goalOf>>; render: () => void; say: (m: string) => void }) {
    const short = bottleneck(s, goal);
    const crop = short ? CROP_BY_ID[short] : null;
    const missing = Object.entries(goal.cost).some(([k, v]) => have(s, k as ResId) < (v ?? 0));
    const startable = Object.entries(goal.cost).some(([k]) => RECIPES.find((r) => r.id === k && r.kind === "good") && have(s, k as ResId) < (goal.cost[k as ResId] ?? 0));
    const plantable = crop && gardenOpen(s, crop.dim);
    return (
        <div className="fi-mn-goal" style={{ ["--c" as string]: goal.color } as CSSProperties}>
            <div className="fi-mn-goal-h">
                <span>Next goal</span>
                <b>{goal.title}</b>
            </div>
            <CostRow s={s} cost={goal.cost} />
            <div className="fi-mn-goal-f">
                {crop && missing && plantable && (
                    <button
                        type="button"
                        className="fi-mn-buy small ghost"
                        onClick={() => {
                            setSow(s, crop.id);
                            say(`Planting ${crop.name} by hand in the ${DIM_LABEL[crop.dim].name} from now on.`);
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
                {crop && missing && <span className="fi-mn-goal-w">{plantable ? `${crop.name} grows in the ${DIM_LABEL[crop.dim].name}` : `${crop.name} needs a ${DIM_LABEL[crop.dim].name} island: ${cropIslands(crop.id).slice(0, 2).map((id) => ISLAND_BY_ID[id]?.name ?? id).join(" or ")}`}</span>}
            </div>
        </div>
    );
}

export const GARDEN_CSS = `
.fi-fm-rec{display:flex;align-items:center;gap:.6rem;padding:.5rem .65rem;border-radius:.95rem;border:1px solid color-mix(in oklch,var(--oc) 50%,transparent);background:linear-gradient(120deg,color-mix(in oklch,var(--oc) 14%,transparent),rgba(0,0,0,.2) 80%)}
.fi-fm-rec .tx{flex:1;min-width:0;display:flex;flex-direction:column}
.fi-fm-rec small{font-family:var(--font-rubik,inherit);font-size:.54rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-fm-rec b{font-family:var(--font-minecraft,inherit);font-size:.9rem;color:var(--oc)}
.fi-fm-rec em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.64rem;color:#cfc8de}
.fi-fm-field{display:flex;flex-direction:column;gap:.1rem;padding:.4rem .65rem;border-radius:.8rem;border:1px dashed color-mix(in oklch,var(--mc-green) 45%,transparent);background:color-mix(in oklch,var(--mc-green) 6%,transparent)}
.fi-fm-field b{font-family:var(--font-minecraft,inherit);font-size:.74rem;color:var(--mc-green)}
.fi-fm-field span{font-family:var(--font-rubik,inherit);font-size:.64rem;color:#cfc8de}
.fi-fm-recdot{font-style:normal;color:var(--mc-green);font-size:.6rem}
.fi-fg{display:flex;flex-direction:column;gap:.3rem;padding:.6rem .7rem;border-radius:1rem;border:1px solid color-mix(in oklch,${C} 45%,transparent);background:linear-gradient(135deg,color-mix(in oklch,${C} 12%,transparent),transparent 70%)}
.fi-fg[data-ready="true"]{border-color:#ffd23a;box-shadow:0 0 22px -8px #ffd23a;animation:fi-qp-glow 2.2s ease-in-out infinite}
.fi-fg[data-done]{opacity:.8}
.fi-fg-h{display:flex;justify-content:space-between;align-items:center;font-family:var(--font-minecraft,inherit);font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:${C}}
.fi-fg-h b{font-size:.6rem;letter-spacing:.06em;color:var(--muted-foreground)}
.fi-fg-bar{height:3px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-fg-bar i{display:block;height:100%;background:${C};box-shadow:0 0 8px ${C}}
.fi-fg-t{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.92rem;color:#fff}
.fi-fg-t em{margin-left:auto;font-style:normal;font-family:var(--font-rubik,inherit);font-size:.62rem;font-weight:600;color:#ffd23a}
.fi-fg-mark{color:${C}}
.fi-fg[data-ready="true"] .fi-fg-mark{color:#ffd23a}
.fi-fg-p{margin:0;font-family:var(--font-rubik,inherit);font-size:.7rem;line-height:1.4;color:var(--muted-foreground)}
.fi-fg-prog{display:flex;align-items:center;gap:.5rem}
.fi-fg-prog span{flex:1;height:.4rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-fg-prog i{display:block;height:100%;background:linear-gradient(90deg,#5aa02a,${C});box-shadow:0 0 8px ${C}}
.fi-fg-prog small{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-fg-f{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}
.fi-fg-next{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);opacity:.8}
.fi-fb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4rem}
.fi-fb .fi-tw-box{display:block;min-width:0}
.fi-fb-t{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;align-items:center;column-gap:.5rem;width:100%;padding:.45rem .6rem;border-radius:.9rem;text-align:left;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:color-mix(in oklch,var(--c) 6%,transparent);color:var(--c);transition:background .15s,border-color .15s,transform .12s;touch-action:manipulation}
.fi-fb-i{grid-row:1 / span 2;display:grid;place-items:center;font-size:1.4rem;line-height:1}
.fi-fb-n{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.72rem;line-height:1.1}
.fi-fb-s{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.fi-fb-t:hover:not([aria-disabled="true"]){background:color-mix(in oklch,var(--c) 16%,transparent);transform:translateY(-1px)}
.fi-fb-t[data-on="true"]{border-color:var(--c);background:color-mix(in oklch,var(--c) 20%,transparent);box-shadow:0 0 18px -6px var(--c)}
.fi-fb-t[data-locked="true"]{opacity:.5;cursor:default;filter:grayscale(.6)}
.fi-fb-r{position:absolute;right:-.25rem;top:-.35rem;display:grid;place-items:center;min-width:1rem;height:1rem;padding:0 .24rem;border-radius:999px;background:#ffd23a;color:#14100a;font:700 .58rem/1 var(--font-rubik,inherit);font-style:normal;box-shadow:0 0 0 2px color-mix(in oklch,var(--background) 90%,#000),0 0 8px #ffd23a;animation:fi-qp-pop .4s cubic-bezier(.2,1.8,.4,1)}
.fi-fm-streak{display:flex;flex-direction:column;gap:.2rem;padding:.35rem .6rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.02)}
.fi-fm-streak[data-on="true"]{border-color:color-mix(in oklch,#ff9a4d 55%,transparent);background:color-mix(in oklch,#ff9a4d 8%,transparent)}
.fi-fm-streak-h{display:flex;flex-wrap:wrap;gap:.2rem .6rem;align-items:baseline;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-fm-streak-h b{font-family:var(--font-minecraft,inherit);font-size:.8rem;color:#ff9a4d}
.fi-fm-streak-bar{height:.3rem;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.fi-fm-streak-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff7a2d,#ffd23a);box-shadow:0 0 8px #ff9a4d;animation:fi-fm-drain linear forwards}
@keyframes fi-fm-drain{to{width:0}}
.fi-fm-grid[data-dim="nether"]{border-color:color-mix(in oklch,#ff5a4d 45%,transparent);background:radial-gradient(ellipse at 50% 0%,color-mix(in oklch,#ff5a4d 16%,#1a0a08),#0d0504 80%)}
.fi-fm-grid[data-dim="nether"] .fi-fm-plot{background:linear-gradient(180deg,#4a1f1a,#2a0f0c)}
.fi-fm-grid[data-dim="end"]{border-color:color-mix(in oklch,#c58bff 45%,transparent);background:radial-gradient(ellipse at 50% 0%,color-mix(in oklch,#c58bff 16%,#100a1c),#07040f 80%)}
.fi-fm-grid[data-dim="end"] .fi-fm-plot{background:linear-gradient(180deg,#2c2540,#16102a)}
.fi-fm-grid[data-dim="nether"] .fi-fm-plot[data-state="empty"],.fi-fm-grid[data-dim="end"] .fi-fm-plot[data-state="empty"]{background:rgba(255,255,255,.03)}
.fi-fm-plot[data-gold]{border-color:#ffd23a;box-shadow:inset 0 -6px 10px rgba(0,0,0,.4),0 0 14px -2px #ffd23a}
.fi-fm-plot[data-gold]::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 30%,rgba(255,226,102,.35) 50%,transparent 70%);background-size:220% 100%;animation:fi-fm-shine 2.2s linear infinite;pointer-events:none}
.fi-fm-plot[data-gold] .fi-fm-crop{box-shadow:0 0 16px 2px #ffd23a,inset 0 -3px 5px rgba(0,0,0,.3)}
@keyframes fi-fm-shine{from{background-position:120% 0}to{background-position:-120% 0}}
@media (max-width:420px){.fi-fb-s{display:none}.fi-fb-t{padding:.4rem .45rem}}
@media (prefers-reduced-motion:reduce){.fi-fm-plot[data-gold]::after,.fi-fm-streak-bar i{animation:none!important}}
`;

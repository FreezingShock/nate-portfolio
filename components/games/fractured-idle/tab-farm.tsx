"use client";

import { sfx } from "@/lib/sound/sounds";
import { QUICK_CSS, QuickPanel, type QuickAct } from "./quick-actions";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { SKILL_CAP, fmtTime, skillXpFor } from "@/lib/fractured-idle/engine";
import { activeIsland, openIslands } from "@/lib/fractured-idle/island-logic";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { ISLANDS, ISLAND_BY_ID, type Dim } from "@/lib/fractured-idle/islands";
import { GRANT_LABEL } from "@/lib/fractured-idle/skills";
import {
    COL_AT,
    CROPS,
    DIMS,
    DIM_CROPS,
    DIM_FX,
    DIM_LABEL,
    FEATS,
    FEAT_LADDERS,
    GOODS,
    HOES,
    ISLAND_CROPS,
    PODS,
    POD_TOKENS,
    POD_W,
    RECIPES,
    SET_STEPS,
    allPlots,
    buyHand,
    canBuyHand,
    canBuyHoe,
    buyHoe,
    canCraft,
    claimAllFeats,
    claimAllGuide,
    claimFeat,
    collectAll,
    collectJob,
    colTierOf,
    consumeItem,
    cropIslands,
    cropRate,
    dimSet,
    eff,
    farmCtx,
    farmLevel,
    featClaimed,
    featReady,
    featsReady,
    gardenOpen,
    goalOf,
    guideReady,
    handBoost,
    handCost,
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
    openAll,
    openDims,
    ovenSlots,
    ownsRelic,
    plantAll,
    podChance,
    podCount,
    queueGoal,
    readyCount,
    resInfo,
    slotsFree,
    sowCrop,
    startCraft,
    toggleLoop,
    totalCost,
    totalHands,
    upLevel,
    upgradeAll,
    canBuyUp,
    cookSpeed,
    HOE_CLICK,
    FARM_UPS,
    type CropDef,
    type FarmView,
    type FeatReward,
    type RecipeDef,
    type ResId,
} from "@/lib/fractured-idle/farm";
import { Tip, TipCard } from "./tooltip";
import { Progress, SectionTitle, type Ctx } from "./ui";
import { C, CostRow, CropTip, ResChip, UpgradeList, col, fmtPct } from "./farm-bits";
import { GARDEN_CSS, Garden } from "./farm-garden";
import { Market, MARKET_CSS } from "./farm-market";
import { TOOLS_CSS, Tools } from "./farm-tools";

// The Farm. The same shape as the Mine (see tab-mine.tsx): gardens grow real crops on timers (one garden per
// dimension, every open one at once), every press of the big button waters a random plot, crops can be tapped to
// tend or harvest, and everything else (tools, the market, farmhands, the Cookhouse, collections, biomes, feats) is
// spent and read from here. A guide at the top of the Garden always names the next thing to do. Nothing needs
// tapping to progress: with the Auto-Reaper every garden harvests itself, also while you are away. It reuses the
// Mine's layout classes (fi-mn-*); the pieces live in farm-garden.tsx, farm-tools.tsx and farm-market.tsx.

type View = FarmView;

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
    const plots = allPlots(s).length;
    const gardens = openDims(s).length;

    return (
        <div className="fi-mn fi-fm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Hoe power" value={`x${hoePower(s).toFixed(hoePower(s) < 10 ? 2 : 1)}`} sub={hoeOf(s).name} color={hoeOf(s).color} tip={<TipCard title="Hoe power" color={hoeOf(s).color} lines={["Bigger harvests from every plot. It helps with a softening curve."]} rows={[["Hoe", hoeOf(s).name], ["Tilling", `+${upLevel(s, "till") * 6}%`], ["Each hoe tier", `+${fmtPct(HOE_CLICK)} click power`], ["Tools worn", `${f.belt.length}`]]} />} />
                <Stat label="Gardens" value={`${amtRate(F, rate)}/min`} sub={`${plots} plots in ${gardens} garden${gardens === 1 ? "" : "s"}, ${readyCount(s)} ripe`} color="var(--mc-green)" tip={<TipCard title="Gardens" color="var(--mc-green)" lines={["Crops a minute if every plot keeps growing and is harvested. Every open garden grows at once, also while you are away; with the Auto-Reaper they also harvest and replant."]} rows={[...openDims(s).map((dm): [string, string, string] => [DIM_LABEL[dm].name, `${f.gardens[dm].length} plots, ${readyCount(s, dm)} ripe`, DIM_LABEL[dm].color]), ["Auto-Reaper", upLevel(s, "reaper") ? "on" : "not built"], ["Farmhands", F(totalHands(s))]]} />} />
                <Stat label="Harvested" value={F(Math.floor(harvested))} sub={`${F(f.harvests)} harvests`} color={C} tip={<TipCard title="Harvested" color={C} lines={["Every crop the gardens have ever given you."]} rows={[["Harvests", F(f.harvests)], ["By hand", F(f.picked)], ["Best streak", F(f.bestStreak)], ["Golden crops", F(f.goldens)], ["Bumper Crops", F(f.bumpers)], ["Plots watered", F(f.waters)], ["Plots tended", F(f.tends)]]} />} />
                <Stat label="Seed pods" value={String(pods)} sub={`${F(f.opened)} opened`} color="var(--mc-light-purple)" tip={<TipCard title="Seed pods" color="var(--mc-light-purple)" lines={["Harvests sometimes drop one, from the garden they grew in. The Nether and the End drop richer ones."]} rows={[["Overworld chance", fmtPct(podChance(s, "overworld"))], ...DIMS.map((dm) => [PODS[dm].name, String(f.pods[dm] || 0), PODS[dm].color] as [string, string, string])]} />} />
            </div>
            <Progress label={`Farming ${lvl}`} color={C} pct={lvl >= SKILL_CAP ? 1 : (s.farming - lo) / (hi - lo)} right={lvl >= SKILL_CAP ? "MAX" : `${Math.floor(Math.max(0, (s.farming - lo) / (hi - lo)) * 100)}% to ${lvl + 1}`} />

            <QuickBar s={s} d={d} render={render} say={say} />

            <div className="fi-mn-seg" role="tablist">
                {([["garden", "Garden"], ["tools", "Tools"], ["market", "Market"], ["hands", "Hands"], ["kitchen", "Kitchen"], ["crops", "Crops"], ["biomes", "Biomes"], ["feats", "Feats"]] as const).map(([v, label]) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} data-on={view === v} onClick={() => setView(v)}>
                        {label}
                        {v === "kitchen" && ready > 0 && <i className="fi-mn-dot">{ready}</i>}
                        {v === "garden" && (readyCount(s) > 0 || guideReady(s)) && <i className="fi-mn-dot feat">{guideReady(s) ? "!" : readyCount(s)}</i>}
                        {v === "feats" && featsReady(s).length > 0 && <i className="fi-mn-dot feat">{featsReady(s).length}</i>}
                    </button>
                ))}
            </div>

            {view === "garden" && <Garden s={s} d={d} F={F} render={render} say={say} go={setView} />}
            {view === "tools" && <Tools s={s} F={F} render={render} say={say} />}
            {view === "market" && <Market s={s} d={d} F={F} render={render} say={say} />}
            {view === "hands" && <Hands s={s} d={d} F={F} render={render} />}
            {view === "kitchen" && <Kitchen s={s} F={F} render={render} say={say} />}
            {view === "crops" && <Crops s={s} F={F} />}
            {view === "biomes" && <Biomes s={s} F={F} />}
            {view === "feats" && <Feats s={s} F={F} render={render} say={say} />}
        </div>
    );
}

const amtRate = (F: (n: number) => string, n: number) => (n >= 1000 ? F(Math.floor(n)) : n >= 100 ? String(Math.floor(n)) : String(+n.toFixed(n < 10 ? 1 : 0)));

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

// ---- Quick actions ----

function QuickBar({ s, d, render, say }: { s: Ctx["s"]; d: Ctx["d"]; render: () => void; say: (m: string) => void }) {
    const ctx = farmCtx(d);
    const f = s.farm;
    const ripe = readyCount(s);
    const empty = allPlots(s).filter((r) => !r.pl.c).length;
    const sow = openDims(s).some((dm) => !!sowCrop(s, dm));
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
    const acts: QuickAct[] = [
        { k: "harvest", label: "Harvest", icon: "scissors", tip: "Pick every ripe plot by hand (hand-picked crops pay 25% more).", on: ripe > 0, n: ripe },
        { k: "plant", label: "Plant", icon: "spade", tip: "Plant every empty plot with your chosen crop, or the best one here.", on: empty > 0 && !!sow, n: empty },
        { k: "collect", label: "Collect", icon: "check", tip: "Collect every finished Cookhouse craft.", on: ready > 0, n: ready },
        { k: "open", label: "Open", icon: "bloom", tip: "Open every seed pod you are holding.", on: pods > 0, n: pods },
        { k: "claim", label: "Claim", icon: "crown", tip: "Claim every feat you have earned.", on: feats > 0, n: feats },
        { k: "hoe", label: "Hoe", icon: "flower", tip: "Make the next hoe, if you have everything for it.", on: hoe },
        { k: "ups", label: "Upgrade", icon: "plus", tip: "Buy every crop-priced upgrade you can afford, cheapest first.", on: ups > 0, n: ups },
        { k: "hands", label: "Hands", icon: "smile", tip: "Hire farmhands while they cost under 60% of that crop's stock.", on: hands > 0, n: hands },
        { k: "cook", label: "Cook", icon: "heat", tip: "Start crafts for the goods your next goal is short of.", on: cook },
        { k: "tonic", label: "Tonic", icon: "flask", tip: "Drink a Harvest Tonic to start a Bumper Crop now.", on: tonic },
    ];
    return (
        <>
            <style>{QUICK_CSS}</style>
            <QuickPanel
                actions={acts}
                color={C}
                allIcon="sunburst"
                allTip="Harvest, plant, collect, open pods, claim, upgrade, hire hands and cook for your goal, all in one press."
                onRun={(k) => {
                    sfx("collect");
                    go([k as keyof typeof run]);
                }}
                onAll={() => go(["harvest", "plant", "collect", "open", "claim", "hoe", "ups", "hands", "cook"])}
            />
        </>
    );
}

// ---- Hands: farmhands and garden rig ----

function Hands({ s, d, F, render }: { s: Ctx["s"]; d: Ctx["d"]; F: (n: number) => string; render: () => void }) {
    void d;
    const lvl = farmLevel(s);
    const dimOpen = (dm: Dim) => gardenOpen(s, dm);
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
            <p className="fi-mn-note">Each dimension is a biome with its own garden, its own crops and seed pods, and its own way of changing how farming works. Every garden you have open grows at once: travel from the Islands tab (press I) to reach a new dimension and its garden opens beside the others, with nothing lost in the ones you left.</p>
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

export const FARM_CSS = GARDEN_CSS + TOOLS_CSS + MARKET_CSS + `
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

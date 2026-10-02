"use client";

import { sfx } from "@/lib/sound/sounds";
import { QUICK_CSS, QuickPanel, type QuickAct } from "./quick-actions";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { SKILL_CAP, fmtTime, skillXpFor } from "@/lib/fractured-idle/engine";
import { activeIsland, openIslands } from "@/lib/fractured-idle/island-logic";
import { ISLANDS, ISLAND_BY_ID, type Dim } from "@/lib/fractured-idle/islands";
import {
    COL_AT,
    CROPS,
    DIMS,
    DIM_CROPS,
    DIM_FX,
    DIM_LABEL,
    GOODS,
    HOES,
    ISLAND_CROPS,
    LADDERS,
    PODS,
    POD_TOKENS,
    POD_W,
    RECIPES,
    RECIPE_BY_ID,
    SET_STEPS,
    allPlots,
    biggestField,
    canBuyHand,
    canBuyHoe,
    buyHoe,
    canCraft,
    claimAllFeats,
    claimFeat,
    collectAll,
    collectJob,
    colTierOf,
    consumeItem,
    cropIcon,
    cropIslands,
    cropRate,
    crewTotal,
    dimSet,
    farmCtx,
    farmLevel,
    featsReady,
    goalOf,
    handCost,
    harvestAll,
    have,
    haveCrop,
    hireAll,
    hireCrewAll,
    hoeOf,
    hoePower,
    isCrop,
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
    slotsFree,
    sowCrop,
    startCraft,
    toggleLoop,
    totalCost,
    totalHands,
    upLevel,
    upgradeAll,
    usedInRecipes,
    canBuyUp,
    cookSpeed,
    HOE_CLICK,
    FARM_UPS,
    type CropDef,
    type FarmView,
    type RecipeDef,
    type ResId,
} from "@/lib/fractured-idle/farm";
import { colSteps } from "@/lib/fractured-idle/milestones";
import { Tip, TipCard } from "./tooltip";
import { Progress, SectionTitle, type Ctx } from "./ui";
import { C, CropTip, UpgradeList, col, farmNeeds, fmtPct } from "./farm-bits";
import { CREW_CSS, Crew } from "./farm-crew";
import { CraftBoard, ItemIcon, MilestoneBoard, Slots, SKILL_KIT_CSS, iconOf, type CraftItem, type SlotView } from "./skill-kit";
import { GARDEN_CSS, Garden } from "./farm-garden";
import { wantLevel } from "./level-nav";
import { TabBar, type TabGroup, type TabItem } from "./tab-bar";
import { Market, MARKET_CSS } from "./farm-market";
import { CREW as CREW_LIST, canBuyCrew as canBuyCrewLevel, crewCost } from "@/lib/fractured-idle/farm";
import { TOOLS_CSS, Tools } from "./farm-tools";

// The Farm. The same shape as the Mine (see tab-mine.tsx): gardens grow real crops on timers (one garden per
// dimension, every open one at once), every press of the big button waters a random plot, crops can be tapped to
// tend or harvest, and everything else (tools, the market, farmhands, the Cookhouse, collections, biomes, feats) is
// spent and read from here. The Garden shows the current Farmhand Saga chapter. Nothing needs
// tapping to progress: with the Auto-Reaper every garden harvests itself, also while you are away. It reuses the
// Mine's layout classes (fi-mn-*); the pieces live in farm-garden.tsx, farm-tools.tsx and farm-market.tsx.

type View = FarmView;
const FARM_TABS: TabItem<View>[] = [
    { id: "garden", label: "Garden", symbol: "flower", group: "grow", color: "#9be04a", blurb: "Your plots: plant, tend and harvest." },
    { id: "tools", label: "Tools", symbol: "strength", group: "grow", color: "#ffd23a", blurb: "Hoes and the tools you wear for each crop type." },
    { id: "crew", label: "Crew", symbol: "intelligence", group: "grow", color: "#6fb4ff", blurb: "Hire hands that plant, pack, cook and sell for you." },
    { id: "market", label: "Market", symbol: "magicFind", group: "sell", color: "#ffaa00", blurb: "Enchant and sell crops, and follow the demand." },
    { id: "kitchen", label: "Kitchen", symbol: "heat", group: "sell", color: "#ff9a4d", blurb: "Cook goods that feed tools, upgrades and goals." },
    { id: "crops", label: "Crops", symbol: "fortune", group: "know", color: "#55ff55", blurb: "The crop codex with ten collection tiers each." },
    { id: "biomes", label: "Biomes", symbol: "location", group: "know", color: "#55ffff", blurb: "What each dimension's garden grows." },
    { id: "milestones", label: "Milestones", symbol: "pristine", group: "know", color: "#c58bff", blurb: "Tiers for every crop and action, with permanent rewards." },
];
const FARM_GROUPS: TabGroup[] = [
    { id: "grow", label: "Grow", color: "#9be04a" },
    { id: "sell", label: "Sell", color: "#ffaa00" },
    { id: "know", label: "Know", color: "#55ffff" },
];

export function FarmTab({ s, d, F, render, say, open }: Ctx & { open: (tab: string) => void }) {
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
                <Stat label="Gardens" value={`${amtRate(F, rate)}/min`} sub={`${plots} plots in ${gardens} garden${gardens === 1 ? "" : "s"}, ${readyCount(s)} ripe`} color="var(--mc-green)" tip={<TipCard title="Gardens" color="var(--mc-green)" lines={["Crops a minute if every plot keeps growing and is harvested. Every open garden grows at once, also while you are away; with the Auto-Reaper they also harvest and replant."]} rows={[...openDims(s).map((dm): [string, string, string] => [DIM_LABEL[dm].name, `${f.gardens[dm].length} plots, ${readyCount(s, dm)} ripe`, DIM_LABEL[dm].color]), ["Auto-Reaper", upLevel(s, "reaper") ? "on" : "not built"], ["Biggest field", biggestField(s) ? `${biggestField(s)!.n} x ${biggestField(s)!.crop.name}` : "none"], ["Crew levels", F(crewTotal(s))], ["Specialists", F(totalHands(s))]]} />} />
                <Stat label="Harvested" value={F(Math.floor(harvested))} sub={`${F(f.harvests)} harvests`} color={C} tip={<TipCard title="Harvested" color={C} lines={["Every crop the gardens have ever given you."]} rows={[["Harvests", F(f.harvests)], ["By hand", F(f.picked)], ["Best streak", F(f.bestStreak)], ["Golden crops", F(f.goldens)], ["Bumper Crops", F(f.bumpers)], ["Plots watered", F(f.waters)], ["Plots tended", F(f.tends)]]} />} />
                <Stat label="Seed pods" value={String(pods)} sub={`${F(f.opened)} opened`} color="var(--mc-light-purple)" tip={<TipCard title="Seed pods" color="var(--mc-light-purple)" lines={["Harvests sometimes drop one, from the garden they grew in. The Nether and the End drop richer ones."]} rows={[["Overworld chance", fmtPct(podChance(s, "overworld"))], ...DIMS.map((dm) => [PODS[dm].name, String(f.pods[dm] || 0), PODS[dm].color] as [string, string, string])]} />} />
            </div>
            <Progress label={`Farming ${lvl}`} color={C} pct={lvl >= SKILL_CAP ? 1 : (s.farming - lo) / (hi - lo)} right={lvl >= SKILL_CAP ? "MAX" : `${Math.floor(Math.max(0, (s.farming - lo) / (hi - lo)) * 100)}% to ${lvl + 1}`} />

            <QuickBar s={s} d={d} render={render} say={say} />

            <TabBar
                tabs={FARM_TABS}
                groups={FARM_GROUPS}
                current={view}
                keys={false}
                notes={{
                    kitchen: ready > 0 ? [{ text: `${ready} dish${ready === 1 ? "" : "es"} ready to collect`, color: "#ff9a4d", act: true, n: ready }] : [],
                    garden: readyCount(s) > 0 ? [{ text: `${readyCount(s)} plot${readyCount(s) === 1 ? "" : "s"} ripe`, color: "#9be04a", act: true, n: readyCount(s) }] : [],
                    milestones: featsReady(s).length > 0 ? [{ text: `${featsReady(s).length} milestone reward${featsReady(s).length === 1 ? "" : "s"} to claim`, color: "#ffd23a", act: true, n: featsReady(s).length }] : [],
                }}
                onSelect={setView}
            />

            {view === "garden" && <Garden s={s} d={d} F={F} render={render} say={say} openSaga={() => { wantLevel("sagas", "farming"); open("level"); }} />}
            {view === "tools" && <Tools s={s} F={F} render={render} say={say} />}
            {view === "market" && <Market s={s} d={d} F={F} render={render} say={say} />}
            {view === "crew" && <Crew s={s} d={d} F={F} render={render} say={say} />}
            {view === "kitchen" && <Kitchen s={s} F={F} render={render} say={say} />}
            {view === "crops" && <Crops s={s} F={F} go={() => setView("milestones")} />}
            {view === "biomes" && <Biomes s={s} F={F} />}
            {view === "milestones" && <Milestones s={s} F={F} render={render} say={say} />}
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
    const hands = CROPS.filter((c) => canBuyHand(s, c).ok && handCost(s, c) <= haveCrop(s, c.id) * 0.6).length + (crewAffordable(s) ? 1 : 0);
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
            return got.length ? `Claimed ${got.length} milestone${got.length > 1 ? "s" : ""}.` : "";
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
            const n = hireAll(s) + hireCrewAll(s);
            return n ? `Hired ${n} crew member${n > 1 ? "s" : ""} and specialists.` : "";
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
        { k: "claim", label: "Claim", icon: "crown", tip: "Claim every milestone you have earned.", on: feats > 0, n: feats },
        { k: "hoe", label: "Hoe", icon: "flower", tip: "Make the next hoe, if you have everything for it.", on: hoe },
        { k: "ups", label: "Upgrade", icon: "plus", tip: "Buy every crop-priced upgrade you can afford, cheapest first.", on: ups > 0, n: ups },
        { k: "hands", label: "Crew", icon: "smile", tip: "Hire crew levels (under 60% of your shards) and specialists (under 60% of that crop's stock).", on: hands > 0, n: hands },
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

/** Whether a crew level is affordable without spending more than 60% of the shards. */
const crewAffordable = (s: Ctx["s"]) => CREW_LIST.some((c) => canBuyCrewLevel(s, c).ok && crewCost(s, c).shards <= s.shards * 0.6);

// ---- Kitchen ----

const KITCHEN_GROUPS = [
    { id: "good", label: "Goods" },
    { id: "item", label: "Consumables" },
    { id: "relic", label: "Scarecrows" },
];

function toItem(s: Ctx["s"], r: RecipeDef): CraftItem {
    const once = r.kind === "relic";
    return {
        id: r.id,
        name: r.name,
        desc: r.desc,
        color: r.color,
        icon: r.kind === "relic" ? "ankh" : iconOf(r.id, "forge"),
        group: r.kind,
        tag: r.kind === "relic" ? "Scarecrow" : undefined,
        lock: farmLevel(s) < r.need ? `Farming ${r.need}` : undefined,
        far: farmLevel(s) < r.need - 12,
        owned: once && ownsRelic(s, r.out),
        stock: r.kind === "good" ? s.farm.goods[r.out] || 0 : r.kind === "item" ? s.farm.items[r.out] || 0 : 0,
        inputs: farmNeeds(s, totalCost(r, 1)),
        time: jobSeconds(s, r, 1),
        once,
        maxBatch: maxBatch(s, r),
        blocked: slotsFree(s) <= 0 ? "Ovens busy" : undefined,
        usedIn: r.kind === "good" ? usedInRecipes(r.id).map((x) => x.name) : undefined,
    };
}

function Kitchen({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    const f = s.farm;
    const now = Date.now();
    const slots = ovenSlots(s);
    const ladle = upLevel(s, "ladle") > 0;
    const ready = jobsReady(s, now);
    const done = (t: string) => {
        say(t);
        render();
    };
    const views: SlotView[] = Array.from({ length: slots }, (_, i) => {
        const ji = f.jobs.findIndex((x) => x.slot === i);
        const j = ji >= 0 ? f.jobs[ji] : undefined;
        const r = j ? RECIPE_BY_ID[j.r] : undefined;
        return { slot: i, job: j && r ? { i: ji, name: r.name, color: r.color, icon: r.kind === "relic" ? "ankh" : iconOf(r.id, "forge"), n: j.n, left: jobLeft(j, now), total: jobSeconds(s, r, j.n), loop: j.loop } : undefined };
    });
    const live = RECIPES.map((r) => toItem(s, r));
    const bag = GOODS.filter((g) => (f.goods[g.id] || 0) > 0);
    return (
        <>
            <div className="fi-mn-sum">
                <div>
                    <b>{slots}</b> {slots === 1 ? "oven" : "ovens"} · crafts finish <b>{Math.round((cookSpeed(s) - 1) * 100)}%</b> faster <span>and keep cooking while you are away</span>
                </div>
                <small>Pick something on the grid, press Cook, and come back. Cooks (in the Crew tab) start the goods your next goal is short of for you. A finished craft waits in its oven until you collect it.</small>
            </div>
            <Slots
                slots={views}
                color="#ff9a4d"
                noun="Oven"
                loopOk={ladle}
                onCollect={(i) => {
                    const c = collectJob(s, i, Date.now());
                    if (c) {
                        sfx("collect");
                        done(c.text);
                    }
                }}
                onLoop={(slot) => {
                    toggleLoop(s, slot);
                    render();
                }}
            />
            {ready > 1 && (
                <button type="button" className="fi-cb-go slim" style={{ alignSelf: "flex-start" }} data-snd="off" onClick={() => { const got = collectAll(s, Date.now()); if (got.length) { sfx("bulk"); done(`Collected ${got.length} crafts.`); } }}>
                    Collect all {ready}
                </button>
            )}
            <SectionTitle color="#ff9a4d">In your pantry</SectionTitle>
            <div className="fi-bag">
                {bag.map((g) => (
                    <span key={g.id} className="fi-bag-i" title={g.name}>
                        <ItemIcon icon={iconOf(g.id, "forge")} color={g.color} n={f.goods[g.id]} />
                        <em>{g.name}</em>
                    </span>
                ))}
                {Object.entries(f.items).filter(([, n]) => n > 0).map(([id, n]) => (
                    <span key={id} className="fi-bag-i" title={id}>
                        <ItemIcon icon={iconOf(id)} color={RECIPE_BY_ID[id]?.color ?? "#ffd23a"} n={n} />
                        <em>{RECIPE_BY_ID[id]?.name ?? id}</em>
                    </span>
                ))}
                {bag.length === 0 && <span className="fi-sk-hint">Nothing yet. Mill some wheat into flour first.</span>}
            </div>
            <SectionTitle color="#ff9a4d">What can I cook?</SectionTitle>
            <CraftBoard
                items={live}
                groups={KITCHEN_GROUPS}
                color="#ff9a4d"
                verb="Cook"
                onCraft={(id, n) => {
                    const r = RECIPE_BY_ID[id];
                    if (r && canCraft(s, r, n).ok && startCraft(s, id, n)) {
                        sfx("buy");
                        done(`${n > 1 ? `${n}x ` : ""}${r.name} is in the oven.`);
                    }
                }}
            />
            <SectionTitle color="#ff9a4d">Kitchen upgrades</SectionTitle>
            <UpgradeList s={s} cat="kitchen" render={render} />
            <p className="fi-mn-note">Goods in stock: {F(Object.values(f.goods).reduce((a, b) => a + b, 0))}. Goods also sell at the Market.</p>
        </>
    );
}

// ---- Crops: collections ----

function Crops({ s, F, go }: { s: Ctx["s"]; F: (n: number) => string; go: () => void }) {
    const dimOpen = (dm: Dim) => dm === "overworld" || openIslands(s).some((i) => i.dim === dm) || DIM_CROPS[dm].some((c) => (s.farm.grown[c.id] || 0) > 0);
    return (
        <>
            <p className="fi-mn-note">Every crop you harvest fills its collection: ten tiers, each paying a permanent bonus for the rest of the game. Plant a big field of one crop to climb it fast. Finish a whole dimension for a set bonus. <button type="button" className="fi-lv-btn ghost" onClick={go}>Claim rewards in Milestones</button></p>
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
                        <span style={{ color: c.color }}>+{fmtPct(0.4 * c.col[1] * colSteps(tier))}</span> {c.colText}
                        {next ? <em> · next tier +{fmtPct(0.4 * c.col[1] * (tier < 5 ? 1 : 0.5))} at {F(next)}</em> : <em> · complete</em>}
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

// ---- Milestones ----

const dimKeys = (dm: Dim) => new Set(DIM_CROPS[dm].map((c) => `c:${c.id}`));
const OW = dimKeys("overworld");
const NE = dimKeys("nether");
const EN = dimKeys("end");
const MS_CATS = {
    item: [
        { id: "ow", label: "Overworld crops", test: (l: { key: string }) => OW.has(l.key) },
        { id: "ne", label: "Nether crops", test: (l: { key: string }) => NE.has(l.key) },
        { id: "en", label: "End crops", test: (l: { key: string }) => EN.has(l.key) },
        { id: "gd", label: "Goods", test: (l: { key: string }) => l.key.startsWith("g:") },
    ],
    action: [],
};

function Milestones({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    return (
        <MilestoneBoard
            s={s}
            F={F}
            ladders={LADDERS}
            claimed={s.farm.claimed}
            color={C}
            cats={MS_CATS}
            onClaim={(id) => {
                const c = claimFeat(s, id);
                if (c) {
                    sfx("trophy");
                    say(`${c.ladder.name}, tier ${c.tier + 1}: ${c.rewards.map((r) => (r.grant ? `+${r.grant[1]} ${r.grant[0]}` : "")).filter(Boolean).join(", ")}`);
                    render();
                }
            }}
            onAll={() => {
                const got = claimAllFeats(s);
                if (got.length) {
                    sfx("bulk");
                    say(`Claimed ${got.length} milestone${got.length > 1 ? "s" : ""}.`);
                    render();
                }
            }}
        />
    );
}
void cropIcon;

export const FARM_CSS = GARDEN_CSS + TOOLS_CSS + MARKET_CSS + CREW_CSS + SKILL_KIT_CSS + `
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

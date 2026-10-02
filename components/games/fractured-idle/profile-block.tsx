"use client";

import { fmtInt, fmtPct } from "@/lib/fractured-idle/format";
import { useNotation } from "@/lib/fractured-idle/use-notation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { ShineBorder } from "@/components/ui/shine-border";
import { PETS, RARITIES, SKILLS, petLevel, skillLevel, skillXpFor, type State } from "@/lib/fractured-idle/data";
import { fmt } from "@/lib/fractured-idle/engine";
import { FXP_PER_LEVEL, LEVEL_BONUS, fxpTotal, levelColor, prefixOf, prefixStat, symbolOf } from "@/lib/fractured-idle/fxp";
import { activeIsland, islandOpen, masteryInfo } from "@/lib/fractured-idle/island-logic";
import { DIMENSIONS, ISLANDS, MASTERY_AT, isSpecial } from "@/lib/fractured-idle/islands";
import { ISLAND_CSS, IslandScene } from "./island-art";
import { PetTipBody } from "./pet-tip";
import { LEVEL_CSS, LevelBadge } from "./level-badge";
import { TABBAR_CSS, TabBar, type TabItem } from "./tab-bar";
import { TIP_CSS, Tip, TipCard, TipProvider } from "./tooltip";

// THE Fractured Idle profile block. The strip under the game and the card on every profile page render this one
// component, so they always match. It takes a plain game State (the live local save under the game, a cloud save
// on a profile), so it never depends on where that came from.
//
// The island you are standing on is the background: the real game scene, drifting with your pointer. On top sit
// the tier (frame and glow grow with progression), your level, and five tabs: Overview, Skills, Islands, Pets and
// Records. Numbers count up when they change and `live` marks a block that follows a running game.

interface Tier {
    idx: number;
    id: string;
    name: string;
    color: string;
    glow: number;
    blurb: string;
    next?: string;
}

const TIERS: Omit<Tier, "idx" | "next">[] = [
    { id: "wanderer", name: "Wanderer", color: "#aab0bd", glow: 0, blurb: "Just getting started." },
    { id: "adept", name: "Adept", color: "#55ff55", glow: 10, blurb: "Fractured Level 20 or higher." },
    { id: "veteran", name: "Veteran", color: "#55ffff", glow: 18, blurb: "Fractured Level 60, or 3 rebirths." },
    { id: "ascended", name: "Ascended", color: "#c084fc", glow: 26, blurb: "Ascended at least once." },
    { id: "transcendent", name: "Transcendent", color: "#ffd23a", glow: 34, blurb: "Ascended 3 times." },
    { id: "fractured", name: "Fractured", color: "#ff55ff", glow: 44, blurb: "Ascended 5 times, or Fractured Level 200." },
];
const NEXT: string[] = ["Reach Fractured Level 20", "Reach Fractured Level 60 or 3 rebirths", "Ascend once", "Ascend 3 times", "Ascend 5 times or reach level 200", ""];

export function tierOf(s: State): Tier {
    const lvl = s.lvl;
    const idx = s.asc >= 5 || lvl >= 200 ? 5 : s.asc >= 3 ? 4 : s.asc >= 1 ? 3 : lvl >= 60 || s.rebirths >= 3 ? 2 : lvl >= 20 ? 1 : 0;
    return { ...TIERS[idx], idx, next: NEXT[idx] };
}

const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;
const hours = (sec: number) => (sec >= 3600 ? `${fmt(Math.round((sec / 3600) * 10) / 10)}h` : `${Math.floor(sec / 60)}m`);
const F = (n: number) => fmt(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A number that eases to its new value instead of jumping, so a block following a running game visibly ticks. */
function Num({ v, f = F }: { v: number; f?: (n: number) => string }) {
    const [shown, setShown] = useState(0);
    const from = useRef(0);
    useEffect(() => {
        if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setShown(v);
            return;
        }
        const a = from.current;
        const t0 = performance.now();
        let raf = 0;
        const step = (t: number) => {
            const k = Math.min(1, (t - t0) / 700);
            const e = 1 - Math.pow(1 - k, 3);
            const cur = a + (v - a) * e;
            from.current = cur;
            setShown(cur);
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [v]);
    return <>{f(shown)}</>;
}

/** "saved 2m ago", refreshed twice a minute. */
function Ago({ at }: { at: number }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const iv = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(iv);
    }, []);
    const s = Math.max(0, Math.round((now - at) / 1000));
    return <>{s < 45 ? "just now" : s < 3600 ? `${Math.round(s / 60)}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`}</>;
}

function Tile({ symbol, label, value, color, tip }: { symbol: McSymbolName; label: string; value: ReactNode; color: string; tip: ReactNode }) {
    return (
        <Tip box tip={tip}>
            <div className="fi-pb-tile" style={{ ["--c" as string]: color } as CSSProperties} tabIndex={0}>
                <span className="fi-pb-ti"><McSymbol name={symbol} /></span>
                <span className="min-w-0">
                    <span className="fi-pb-tl">{label}</span>
                    <span className="fi-pb-tv">{value}</span>
                </span>
            </div>
        </Tip>
    );
}

type TabId = "overview" | "skills" | "islands" | "pets" | "records";
const TABS: TabItem<TabId>[] = [
    { id: "overview", group: "", label: "Overview", symbol: "wisdom", color: "var(--mc-aqua)", blurb: "The headline numbers." },
    { id: "skills", group: "", label: "Skills", symbol: "strength", color: "var(--mc-green)", blurb: "Every skill level and how close the next one is." },
    { id: "islands", group: "", label: "Islands", symbol: "location", color: "var(--mc-gold)", blurb: "Where you have been, and your mastery of each." },
    { id: "pets", group: "", label: "Pets", symbol: "petLuck", color: "var(--mc-light-purple)", blurb: "Your collection and what is equipped." },
    { id: "records", group: "", label: "Records", symbol: "pristine", color: "var(--mc-yellow)", blurb: "Personal bests and lifetime totals." },
];

export function FracturedIdleBlock({ s, owner, footer, live, savedAt }: { s: State; owner?: string; footer?: ReactNode; live?: boolean; savedAt?: number }) {
    useNotation(); // follow the suffix / scientific switch even though this block sits outside the game's render loop
    const tier = tierOf(s);
    const lvlColor = levelColor(s.lvl);
    const into = Math.max(0, fxpTotal(s) - s.lvl * FXP_PER_LEVEL);
    const islands = prefixStat(s, "islands");
    const pets = prefixStat(s, "pets");
    const trophies = Object.values(s.tro).reduce((a, b) => a + b, 0);
    const island = activeIsland(s);
    const mast = masteryInfo(s.isec[island.id] || 0);
    const [tab, setTab] = useState<TabId>("overview");
    const root = useRef<HTMLElement>(null);

    // The scene drifts with the pointer (the game's own parallax reads --px / --py on the scene element).
    const drift = (e: React.PointerEvent) => {
        if (e.pointerType !== "mouse" || !root.current) return;
        const r = root.current.getBoundingClientRect();
        const sc = root.current.querySelector<HTMLElement>(".fi-scene");
        sc?.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        sc?.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    };
    const settle = () => {
        const sc = root.current?.querySelector<HTMLElement>(".fi-scene");
        sc?.style.setProperty("--px", "0");
        sc?.style.setProperty("--py", "0");
    };

    const skills = SKILLS.map((k) => ({ k, lv: skillLevel(s[k.id], k.id) }));
    const topSkill = skills.reduce((a, b) => (b.lv > a.lv ? b : a));
    const ownedPets = PETS.filter((p) => s.pets[p.id]);
    const bestPet = ownedPets.reduce<{ p: (typeof PETS)[number]; lv: number } | null>((a, p) => {
        const lv = petLevel(p, s.pets[p.id].xp);
        return !a || lv > a.lv ? { p, lv } : a;
    }, null);

    const stats: { symbol: McSymbolName; label: string; value: ReactNode; color: string; tip: ReactNode }[] = [
        { symbol: "speed", label: "Shards", value: <Num v={s.total} />, color: "var(--mc-aqua)", tip: <TipCard title="Lifetime shards" color="var(--mc-aqua)" lines={["Every shard you have ever earned. It survives rebirths and unlocks islands."]} rows={[["Right now", F(s.shards)], ["Best income", `${F(s.peakInc)}/s`]]} /> },
        { symbol: "portal", label: "Rebirths", value: <Num v={s.rebirths} />, color: "var(--mc-light-purple)", tip: <TipCard title="Rebirths" color="var(--mc-light-purple)" lines={["Reset your minions for permanent rebirth tokens."]} rows={[["Tokens held", fmtInt(s.tokens)]]} /> },
        { symbol: "comet", label: "Ascensions", value: <Num v={s.asc} />, color: "var(--mc-gold)", tip: <TipCard title="Ascensions" color="var(--mc-gold)" lines={["The prestige layer above rebirth. Each one pays gems and permanent power."]} rows={[["Gems held", fmtInt(s.ap)]]} /> },
        { symbol: "critChance", label: "Clicks", value: <Num v={s.clicks} />, color: "var(--mc-red)", tip: <TipCard title="Clicks" color="var(--mc-red)" lines={["Every press of the big button."]} rows={[["Critical hits", F(s.crits)], ["Best combo", `x${prefixStat(s, "bestCombo")}`]]} /> },
        { symbol: "regen", label: "Play time", value: hours(s.playTime), color: "var(--mc-green)", tip: <TipCard title="Play time" color="var(--mc-green)" lines={["Time spent playing, plus offline time at a reduced rate."]} /> },
        { symbol: "location", label: "Islands", value: `${fmtInt(s.visited.length)} / ${ISLANDS.length}`, color: "#00aaaa", tip: <TipCard title="Islands" color="#00aaaa" lines={["Islands you have travelled to. Each visit adds a little to all shards."]} rows={[["Unlocked", `${islands} / ${ISLANDS.length}`]]} /> },
        { symbol: "petLuck", label: "Pets", value: <Num v={pets} />, color: "var(--mc-green)", tip: <TipCard title="Pets" color="var(--mc-green)" lines={["Different pets you have discovered."]} rows={[["Hatched", fmtInt(s.hatched)]]} /> },
        { symbol: "pristine", label: "Trophies", value: <Num v={trophies} />, color: "var(--mc-yellow)", tip: <TipCard title="Trophies" color="var(--mc-yellow)" lines={["Trophy tiers unlocked across every system."]} rows={[["Fracture Fragments", fmtInt(s.frag)], ["Treasure bobbers", F(s.bobbers)]]} /> },
        { symbol: "attackSpeed", label: "Best income", value: <>{<Num v={s.peakInc} />}/s</>, color: "var(--mc-aqua)", tip: <TipCard title="Best income" color="var(--mc-aqua)" lines={["The highest shards per second this account has ever reached. It prices pet eggs."]} /> },
        { symbol: "critDamage", label: "Critical hits", value: <Num v={s.crits} />, color: "var(--mc-red)", tip: <TipCard title="Critical hits" color="var(--mc-red)" lines={["Clicks that hit a weak point. Combat levels come from these."]} /> },
        { symbol: "magicFind", label: "Best combo", value: `x${prefixStat(s, "bestCombo")}`, color: "var(--mc-gold)", tip: <TipCard title="Best combo" color="var(--mc-gold)" lines={["The highest combo multiplier reached by holding the button."]} /> },
        { symbol: "fortune", label: "Fragments", value: <Num v={s.frag} />, color: "var(--mc-light-purple)", tip: <TipCard title="Fracture Fragments" color="var(--mc-light-purple)" lines={["Rare finds worth a permanent +0.2% to all shards each."]} rows={[["Bonus", `+${fmtPct(s.frag * 0.002, 1)} all shards`, "var(--mc-green)"]]} /> },
    ];

    const records: [McSymbolName, string, string, string][] = [
        ["attackSpeed", "Peak income", `${F(s.peakInc)}/s`, "var(--mc-aqua)"],
        ["magicFind", "Best combo", `x${prefixStat(s, "bestCombo")}`, "var(--mc-gold)"],
        ["critChance", "Total clicks", F(s.clicks), "var(--mc-red)"],
        ["critDamage", "Critical hits", F(s.crits), "var(--mc-red)"],
        ["fishing", "Treasure bobbers", F(s.bobbers), "var(--mc-aqua)"],
        ["petLuck", "Eggs hatched", fmtInt(s.hatched), "var(--mc-green)"],
        ["defense", "Peak minions", F(s.peak.minions), "var(--mc-gold)"],
        ["trueDefense", "Minion types", fmtInt(s.peak.types), "var(--mc-aqua)"],
        ["check", "Perfect events", F(s.evs.perfect), "var(--mc-green)"],
        ["fortune", "Fracture Fragments", fmtInt(s.frag), "var(--mc-light-purple)"],
        ["pristine", "Trophy tiers", String(trophies), "var(--mc-yellow)"],
        ["wisdom", "Total Fracture EXP", F(fxpTotal(s)), "var(--mc-yellow)"],
        ["regen", "Play time", hours(s.playTime), "var(--mc-green)"],
        ["speed", "Lifetime shards", F(s.total), "var(--mc-aqua)"],
    ];

    return (
        <TipProvider>
            <style>{TIP_CSS + LEVEL_CSS + ISLAND_CSS + BLOCK_CSS + TABBAR_CSS}</style>
            <section ref={root} onPointerMove={drift} onPointerLeave={settle} className="fi-pb" data-tier={tier.idx} style={{ ["--tc" as string]: tier.color, ["--glow" as string]: `${tier.glow}px`, ["--ic" as string]: island.color } as CSSProperties}>
                <IslandScene key={island.id} island={island} variant="stage" className="fi-pb-scene absolute inset-0" />
                <div aria-hidden className="fi-pb-shade" />
                {tier.idx >= 3 && <ShineBorder shineColor={tier.idx === 5 ? ["#ff55ff", "#55ffff", "#ffd23a", "#55ff55"] : [tier.color, "#ffffff55", tier.color]} borderWidth={tier.idx >= 4 ? 2 : 1.5} duration={tier.idx >= 4 ? 8 : 14} />}
                {tier.idx >= 4 && <span aria-hidden className="fi-pb-deco"><McSymbol name={tier.idx === 5 ? "magicFind" : "crown"} /></span>}

                <header className="fi-pb-head">
                    <div className="fi-pb-left">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="fi-pb-logo"><McSymbol name="wisdom" /></span>
                            <div className="min-w-0">
                                <h3 className={`fi-pb-title ${tier.idx === 5 ? "fi-pb-title-prism" : ""}`}>Fractured Idle</h3>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <Tip tip={<TipCard title={`${tier.name} tier`} color={tier.color} tag={`Tier ${tier.idx + 1} / ${TIERS.length}`} lines={[tier.blurb, "This card changes its frame and glow as you progress."]} notes={tier.next ? [{ text: `Next: ${tier.next}`, color: "var(--mc-yellow)" }] : [{ text: "Top tier reached", color: "var(--mc-green)" }]} />}>
                                        <span className="fi-pb-tier" tabIndex={0}><McSymbol name={tier.idx >= 3 ? "comet" : "speed"} /> {tier.name}</span>
                                    </Tip>
                                    {live && (
                                        <Tip tip={<TipCard title="Live" color="var(--mc-green)" lines={["This card follows the running game and updates by itself."]} rows={savedAt ? [["Last saved", <Ago key="a" at={savedAt} />]] : undefined} />}>
                                            <span className="fi-pb-live" tabIndex={0}><i /> LIVE{savedAt ? <> · <Ago at={savedAt} /></> : null}</span>
                                        </Tip>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Tip tip={<TipCard title={island.name} color={island.color} tag={DIMENSIONS.find((d) => d.id === island.dim)?.name} lines={[island.blurb, island.lore]} rows={[["Mastery", `Level ${mast.level} / ${MASTERY_AT.length}`, "var(--mc-yellow)"], ["Time here", hours(s.isec[island.id] || 0)], ["Perk strength", `x${mast.strength.toFixed(2)}`, "var(--mc-green)"]]} foot="The scene behind this card is the island they are on." />}>
                            <div className="fi-pb-isle" tabIndex={0}>
                                <span className="fi-pb-isle-i" style={{ color: island.color }}><McSymbol name={island.symbol} /></span>
                                <span className="min-w-0">
                                    <span className="fi-pb-tl">Now on</span>
                                    <span className="fi-pb-isle-n">{island.name}</span>
                                </span>
                                <span className="fi-pb-pips" aria-label={`Mastery ${mast.level}`}>
                                    {MASTERY_AT.map((_, i) => <i key={i} data-on={i < mast.level} />)}
                                </span>
                            </div>
                        </Tip>

                        <Tip
                            tip={
                                <TipCard
                                    title={`Fractured Level ${fmtInt(s.lvl)}`}
                                    color={lvlColor}
                                    tag={`${Math.floor(into)} / ${FXP_PER_LEVEL} EXP`}
                                    lines={["Earn Fracture EXP by unlocking things across every system. Each level adds to all shards."]}
                                    rows={[["Bonus", `+${fmtPct(LEVEL_BONUS * s.lvl, 2)} all shards`, "var(--mc-green)"], ["To next level", `${Math.max(0, Math.ceil(FXP_PER_LEVEL - into))} EXP`, "var(--mc-yellow)"]]}
                                />
                            }
                        >
                            <div className="fi-pb-level" tabIndex={0}>
                                <div className="fi-pb-lh">Fractured Level</div>
                                <LevelBadge level={s.lvl} sym={symbolOf(s)} prefix={prefixOf(s)} size="md" />
                                <div className="fi-pb-bar"><i style={{ width: `${(into / FXP_PER_LEVEL) * 100}%`, backgroundColor: "var(--mc-yellow)" }} /></div>
                            </div>
                        </Tip>
                    </div>
                </header>

                <TabBar tabs={TABS} current={tab} label="Fractured Idle sections" keys={false} onSelect={setTab} />

                <div key={tab} className="fi-pb-panel" role="tabpanel">
                    {tab === "overview" && (
                        <>
                            <div className="fi-pb-grid">{stats.map((x) => <Tile key={x.label} {...x} />)}</div>
                            <div className="fi-pb-hl">
                                <Tip tip={<TipCard title={`Top skill: ${topSkill.k.name}`} color={topSkill.k.color} lines={[topSkill.k.perk]} rows={[["Level", String(topSkill.lv)], ["Bonus now", topSkill.k.bonus(topSkill.lv), "var(--mc-green)"]]} />}>
                                    <span className="fi-pb-chip" tabIndex={0} style={{ ["--c" as string]: topSkill.k.color } as CSSProperties}><McSymbol name={topSkill.k.symbol} /> {topSkill.k.name} {topSkill.lv}</span>
                                </Tip>
                                {bestPet && (
                                    <Tip tip={<TipCard title={bestPet.p.name} color={RARITIES[bestPet.p.rarity].color} tag={RARITIES[bestPet.p.rarity].name} lines={[bestPet.p.blurb]} rows={[["Level", String(bestPet.lv)]]} />}>
                                        <span className="fi-pb-chip" tabIndex={0} style={{ ["--c" as string]: bestPet.p.color } as CSSProperties}><McSymbol name={bestPet.p.symbol} /> {bestPet.p.name} {bestPet.lv}</span>
                                    </Tip>
                                )}
                                <span className="fi-pb-chip" style={{ ["--c" as string]: "var(--mc-gold)" } as CSSProperties}>{islands} islands unlocked</span>
                                <span className="fi-pb-chip" style={{ ["--c" as string]: "var(--mc-light-purple)" } as CSSProperties}>{pets}/{PETS.length} pets</span>
                            </div>
                            {owner && <p className="fi-pb-run">{F(s.total)} lifetime shards, {fmtInt(s.rebirths)} rebirth{s.rebirths === 1 ? "" : "s"}, {fmtInt(s.asc)} ascension{s.asc === 1 ? "" : "s"}, {hours(s.playTime)} played.</p>}
                        </>
                    )}

                    {tab === "skills" && (
                        <div className="fi-pb-skills">
                            {skills.map(({ k, lv }) => {
                                const lo = skillXpFor(lv, k.id);
                                const hi = skillXpFor(lv + 1, k.id);
                                const pct = lv >= 60 ? 1 : Math.max(0, Math.min(1, (s[k.id] - lo) / Math.max(1, hi - lo)));
                                return (
                                    <Tip key={k.id} box tip={<TipCard title={`${k.name} ${lv}`} color={k.color} tag={lv >= 60 ? "Maxed" : `${Math.floor(pct * 100)}% to ${lv + 1}`} lines={[k.perk, `Earned by: ${k.earn}.`]} rows={[["Bonus now", k.bonus(lv), "var(--mc-green)"], ["Total xp", F(s[k.id])]]} />}>
                                        <div className="fi-pb-skill" tabIndex={0} style={{ ["--c" as string]: k.color } as CSSProperties}>
                                            <span className="fi-pb-si"><McSymbol name={k.symbol} /></span>
                                            <span className="min-w-0 flex-1">
                                                <span className="fi-pb-sn">{k.name}</span>
                                                <span className="fi-pb-sbar"><i style={{ width: `${pct * 100}%` }} /></span>
                                            </span>
                                            <b>{lv}</b>
                                        </div>
                                    </Tip>
                                );
                            })}
                        </div>
                    )}

                    {tab === "islands" && (
                        <div className="space-y-3">
                            {DIMENSIONS.map((d) => {
                                const list = ISLANDS.filter((i) => i.dim === d.id);
                                return (
                                    <div key={d.id}>
                                        <div className="fi-pb-dim" style={{ color: d.color }}>{d.name}</div>
                                        <div className="fi-pb-isles">
                                            {list.map((i) => {
                                                const open = islandOpen(s, i);
                                                const here = i.id === island.id;
                                                const visited = s.visited.includes(i.id);
                                                const m = masteryInfo(s.isec[i.id] || 0);
                                                return (
                                                    <Tip key={i.id} box tip={<TipCard title={i.name} color={i.color} tag={here ? "Standing here" : visited ? "Visited" : open ? "Unlocked" : "Locked"} lines={[open ? i.blurb : i.need ? i.need.label : isSpecial(i) ? "A special island." : `Earn ${F(i.at)} lifetime shards.`]} rows={open ? [["Mastery", `Level ${m.level} / ${MASTERY_AT.length}`, "var(--mc-yellow)"], ["Time here", hours(s.isec[i.id] || 0)]] : undefined} />}>
                                                        <div className="fi-pb-isl" tabIndex={0} data-here={here} data-open={open} style={{ ["--c" as string]: i.color } as CSSProperties}>
                                                            <span className="fi-pb-isl-i"><McSymbol name={open ? i.symbol : "check"} /></span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="fi-pb-isl-n">{open ? i.name : "???"}</span>
                                                                <span className="fi-pb-pips fi-pb-pips-sm">{MASTERY_AT.map((_, k) => <i key={k} data-on={open && k < m.level} />)}</span>
                                                            </span>
                                                            {here && <span className="fi-pb-here" />}
                                                        </div>
                                                    </Tip>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {tab === "pets" && (
                        <div className="fi-pb-pets">
                            {PETS.map((p) => {
                                const own = s.pets[p.id];
                                const r = RARITIES[p.rarity];
                                const lv = own ? petLevel(p, own.xp) : 0;
                                const eq = s.equip.includes(p.id);
                                return (
                                    <Tip key={p.id} box tip={() => <PetTipBody p={p} owned={own} equipped={eq} slot={s.equip.indexOf(p.id)} />}>
                                        <div className="fi-pb-pet" tabIndex={0} data-own={!!own} data-eq={eq} style={{ ["--c" as string]: own ? p.color : r.color } as CSSProperties}>
                                            <span className="fi-pb-pet-i"><McSymbol name={own ? p.symbol : "check"} /></span>
                                            <span className="fi-pb-pet-n">{own ? p.name : "?"}</span>
                                            {own && <b>{lv}</b>}
                                            {eq && <span className="fi-pb-star"><McSymbol name="magicFind" /></span>}
                                        </div>
                                    </Tip>
                                );
                            })}
                        </div>
                    )}

                    {tab === "records" && (
                        <dl className="fi-pb-rec">
                            {records.map(([sym, k, v, c]) => (
                                <div key={k} style={{ ["--c" as string]: c } as CSSProperties}>
                                    <dt><McSymbol name={sym} /> {k}</dt>
                                    <dd>{v}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>

                {(owner || footer) && (
                    <footer className="fi-pb-foot">
                        {owner && <span>{owner}</span>}
                        {footer}
                    </footer>
                )}
            </section>
        </TipProvider>
    );
}

const BLOCK_CSS = `
.fi-pb{--tc:#aab0bd;--glow:0px;--ic:var(--mc-aqua);position:relative;isolation:isolate;overflow:hidden;border-radius:1.4rem;padding:1.1rem;border:1px solid color-mix(in oklch,var(--tc) 50%,transparent);background:#0a0716;box-shadow:0 0 var(--glow) -6px var(--tc),0 18px 40px -26px rgba(0,0,0,.8);display:flex;flex-direction:column;gap:.8rem;min-height:30rem}
.fi-pb[data-tier="0"]{box-shadow:0 18px 40px -26px rgba(0,0,0,.8)}
.fi-pb>*:not(.fi-pb-scene):not(.fi-pb-deco):not(.fi-pb-shade){position:relative;z-index:2}
.fi-pb-scene{position:absolute!important;inset:0;z-index:0;width:100%;height:100%}
.fi-pb-scene .fi-herolayer{place-items:start end;padding:1.1rem 6% 0 0}
.fi-pb-scene .fi-hero{--hw:min(30cqw,36cqh);margin:0}
.fi-pb-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(6,4,14,.82) 0%,rgba(6,4,14,.5) 50%,rgba(6,4,14,.12) 100%),linear-gradient(0deg,rgba(6,4,14,.92) 0%,rgba(6,4,14,.4) 45%,transparent 70%)}
@media (max-width:640px){.fi-pb-scene .fi-herolayer{opacity:.5}.fi-pb-shade{background:linear-gradient(0deg,rgba(6,4,14,.92) 0%,rgba(6,4,14,.6) 60%,rgba(6,4,14,.35) 100%)}}
.fi-pb-deco{position:absolute!important;right:.6rem;top:.2rem;z-index:1!important;font-size:5.5rem;line-height:1;color:var(--tc);opacity:.14;transform:rotate(12deg);pointer-events:none;filter:drop-shadow(0 0 20px var(--tc))}
.fi-pb-head{display:flex}
.fi-pb-left{display:flex;flex-direction:column;align-items:flex-start;gap:.7rem;max-width:min(100%,25rem)}
.fi-pb-logo{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:.8rem;font-size:1.3rem;color:var(--tc);background:color-mix(in oklch,var(--tc) 18%,rgba(0,0,0,.4));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--tc) 45%,transparent),0 0 16px -4px var(--tc)}
.fi-pb-title{margin:0;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:1.2rem;line-height:1.1;color:var(--tc);text-shadow:0 0 14px color-mix(in oklch,var(--tc) 55%,transparent),0 2px 0 rgba(0,0,0,.6)}
.fi-pb-title-prism{background:linear-gradient(90deg,#ff5f9f,#ffd95f,#5fffb0,#5fe6ff,#b05fff,#ff5f9f);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fi-slide 4s linear infinite;text-shadow:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.5))}
.fi-pb-tier,.fi-pb-live{display:inline-flex;align-items:center;gap:.3rem;padding:.05rem .55rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;cursor:help;outline:none}
.fi-pb-tier{color:var(--tc);border:1px solid color-mix(in oklch,var(--tc) 55%,transparent);background:color-mix(in oklch,var(--tc) 14%,rgba(0,0,0,.4))}
.fi-pb-live{color:var(--mc-green);border:1px solid color-mix(in oklch,var(--mc-green) 55%,transparent);background:color-mix(in oklch,var(--mc-green) 12%,rgba(0,0,0,.45))}
.fi-pb-live i{width:.42rem;height:.42rem;border-radius:50%;background:var(--mc-green);box-shadow:0 0 8px var(--mc-green);animation:fi-pb-blink 1.4s ease-in-out infinite}
@keyframes fi-pb-blink{0%,100%{opacity:.35}50%{opacity:1}}
.fi-pb-isle{display:flex;align-items:center;gap:.6rem;padding:.4rem .7rem;border-radius:.9rem;background:rgba(8,6,18,.6);backdrop-filter:blur(10px);border:1px solid color-mix(in oklch,var(--ic) 40%,transparent);cursor:help;outline:none;transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .2s}
.fi-pb-isle:hover,.fi-pb-isle:focus-visible{transform:translateY(-2px);box-shadow:0 8px 22px -12px var(--ic)}
.fi-pb-isle-i{display:grid;place-items:center;width:1.9rem;height:1.9rem;border-radius:.55rem;font-size:1.05rem;background:color-mix(in oklch,var(--ic) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--ic) 40%,transparent)}
.fi-pb-isle-n{display:block;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.9rem;color:#fff;white-space:nowrap}
.fi-pb-pips{display:inline-flex;gap:2px;margin-left:.3rem}
.fi-pb-pips i{width:.3rem;height:.7rem;border-radius:1px;background:rgba(255,255,255,.14)}
.fi-pb-pips i[data-on="true"]{background:var(--mc-yellow);box-shadow:0 0 6px var(--mc-yellow)}
.fi-pb-pips-sm{display:flex;margin:.15rem 0 0}
.fi-pb-pips-sm i{width:.22rem;height:.4rem;flex:1;max-width:.4rem}
.fi-pb-level{position:relative;display:flex;flex-direction:column;gap:.25rem;padding:.45rem .75rem;border-radius:.9rem;background:rgba(8,6,18,.6);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);cursor:help;outline:none}
.fi-pb-lh{font-family:var(--font-minecraft,inherit);font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:#b9b3cc}
.fi-pb-bar{height:.28rem;width:11rem;max-width:100%;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.12)}
.fi-pb-bar i{display:block;height:100%;border-radius:999px;box-shadow:0 0 8px var(--mc-yellow);transition:width .5s}
.fi-pb-panel{padding:.7rem;border-radius:1rem;background:rgba(8,6,18,.62);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);animation:fi-pb-in .28s cubic-bezier(.2,.9,.3,1) both;display:flex;flex-direction:column;gap:.6rem}
@keyframes fi-pb-in{from{opacity:0;transform:translateY(6px)}}
.fi-pb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.2rem,1fr));gap:.5rem}
.fi-pb-tile{--c:var(--mc-aqua);display:flex;align-items:center;gap:.55rem;min-width:0;padding:.5rem .6rem;border-radius:.85rem;background:color-mix(in oklch,var(--c) 9%,rgba(0,0,0,.3));border:1px solid color-mix(in oklch,var(--c) 26%,transparent);cursor:help;outline:none;transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s}
.fi-pb-tile:hover,.fi-pb-tile:focus-visible{transform:translateY(-2px);border-color:color-mix(in oklch,var(--c) 65%,transparent);box-shadow:0 8px 20px -12px var(--c)}
.fi-pb-ti{display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:.55rem;font-size:1rem;color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 38%,transparent)}
.fi-pb-tl{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:#a59fb8}
.fi-pb-tv{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.9rem;color:#fff}
.fi-pb-hl{display:flex;flex-wrap:wrap;gap:.4rem}
.fi-pb-chip{--c:var(--mc-aqua);display:inline-flex;align-items:center;gap:.35rem;padding:.12rem .65rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:var(--c);border:1px solid color-mix(in oklch,var(--c) 45%,transparent);background:color-mix(in oklch,var(--c) 11%,rgba(0,0,0,.3));outline:none}
.fi-pb-chip[tabindex]{cursor:help}
.fi-pb-skills{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.45rem}
.fi-pb-skill{--c:var(--mc-green);display:flex;align-items:center;gap:.6rem;padding:.5rem .65rem;border-radius:.85rem;background:color-mix(in oklch,var(--c) 8%,rgba(0,0,0,.3));border:1px solid color-mix(in oklch,var(--c) 28%,transparent);cursor:help;outline:none;transition:background .15s,transform .15s}
.fi-pb-skill:hover,.fi-pb-skill:focus-visible{background:color-mix(in oklch,var(--c) 18%,rgba(0,0,0,.3));transform:translateY(-1px)}
.fi-pb-si{display:grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:.55rem;font-size:.95rem;color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent)}
.fi-pb-sn{display:block;font-family:var(--font-rubik,inherit);font-size:.68rem;color:#cfc8dd}
.fi-pb-sbar{display:block;height:.28rem;margin-top:.2rem;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.fi-pb-sbar i{display:block;height:100%;background:var(--c);box-shadow:0 0 8px var(--c);border-radius:999px;transition:width .6s}
.fi-pb-skill b{font-family:var(--font-minecraft,inherit);font-size:1.05rem;color:var(--c);text-shadow:0 0 8px color-mix(in oklch,var(--c) 45%,transparent)}
.fi-pb-dim{margin-bottom:.3rem;font-family:var(--font-minecraft,inherit);font-size:.6rem;letter-spacing:.18em;text-transform:uppercase}
.fi-pb-isles{display:grid;grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));gap:.4rem}
.fi-pb-isl{--c:var(--mc-green);position:relative;display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem;border-radius:.75rem;background:color-mix(in oklch,var(--c) 8%,rgba(0,0,0,.3));border:1px solid color-mix(in oklch,var(--c) 28%,transparent);cursor:help;outline:none;transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .2s}
.fi-pb-isl[data-open="false"]{opacity:.5;filter:grayscale(.7)}
.fi-pb-isl:hover,.fi-pb-isl:focus-visible{transform:translateY(-2px);box-shadow:0 8px 20px -12px var(--c)}
.fi-pb-isl[data-here="true"]{border-color:var(--c);box-shadow:0 0 0 1px var(--c),0 0 18px -6px var(--c)}
.fi-pb-isl-i{display:grid;place-items:center;flex:none;width:1.6rem;height:1.6rem;border-radius:.5rem;font-size:.9rem;color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent)}
.fi-pb-isl-n{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-minecraft,inherit);font-size:.72rem;font-weight:700;color:#fff}
.fi-pb-here{position:absolute;right:.35rem;top:.35rem;width:.45rem;height:.45rem;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c);animation:fi-pb-blink 1.4s ease-in-out infinite}
.fi-pb-pets{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.4rem,1fr));gap:.4rem}
.fi-pb-pet{--c:var(--mc-green);position:relative;display:flex;flex-direction:column;align-items:center;gap:.2rem;padding:.55rem .3rem .45rem;border-radius:.85rem;background:color-mix(in oklch,var(--c) 8%,rgba(0,0,0,.3));border:1px solid color-mix(in oklch,var(--c) 30%,transparent);cursor:help;outline:none;transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .2s}
.fi-pb-pet[data-own="false"]{opacity:.45;filter:grayscale(.8)}
.fi-pb-pet:hover,.fi-pb-pet:focus-visible{transform:translateY(-3px) rotate(-1deg);box-shadow:0 10px 22px -12px var(--c)}
.fi-pb-pet[data-eq="true"]{border-color:var(--mc-green);box-shadow:0 0 0 1px var(--mc-green),0 0 16px -6px var(--mc-green)}
.fi-pb-pet-i{display:grid;place-items:center;width:2.2rem;height:2.2rem;border-radius:.65rem;font-size:1.2rem;color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent)}
.fi-pb-pet:hover .fi-pb-pet-i{animation:fi-bob 1s ease-in-out infinite}
.fi-pb-pet-n{font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:#fff;text-align:center}
.fi-pb-pet b{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:var(--c)}
.fi-pb-star{position:absolute;right:.3rem;top:.25rem;font-size:.75rem;color:var(--mc-yellow);filter:drop-shadow(0 0 4px var(--mc-yellow))}
.fi-pb-rec{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.35rem .8rem}
.fi-pb-rec>div{display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.35rem .5rem;border-radius:.6rem;background:rgba(255,255,255,.035)}
.fi-pb-rec dt{display:flex;align-items:center;gap:.4rem;font-family:var(--font-rubik,inherit);font-size:.7rem;color:#b9b3cc}
.fi-pb-rec dt span{color:var(--c)}
.fi-pb-rec dd{margin:0;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.85rem;color:var(--c);text-shadow:0 0 8px color-mix(in oklch,var(--c) 40%,transparent)}
.fi-pb-run{margin:0;font-family:var(--font-rubik,inherit);font-size:.7rem;color:#a59fb8}
.fi-pb-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem;border-top:1px dashed rgba(255,255,255,.14);padding-top:.5rem;font-family:var(--font-rubik,inherit);font-size:.65rem;color:#b9b3cc}
@keyframes fi-slide{to{background-position:200% 0}}
@keyframes fi-bob{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-4px) rotate(6deg)}}
@media (prefers-reduced-motion:reduce){.fi-pb-title-prism,.fi-pb-live i,.fi-pb-here,.fi-pb-panel{animation:none}.fi-pb-tile,.fi-pb-skill,.fi-pb-tab,.fi-pb-isl,.fi-pb-pet,.fi-pb-isle{transition:none}}
`;

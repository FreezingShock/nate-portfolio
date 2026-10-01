"use client";

import { useState, type CSSProperties } from "react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { openIslands } from "@/lib/fractured-idle/island-logic";
import { COL_AT, ISLANDS, MINIONS, PETS, PET_LABEL, REWARD_LABEL, SKILLS, type PetStat, type RewardStat } from "@/lib/fractured-idle/data";
import { colTiers, fmtTime, income, offlineEff, petSlots, rebirthCap, tokenMult, trophyCounts } from "@/lib/fractured-idle/engine";
import { CODEX_TOTAL, RARITIES, SLOTS, codexCount, enchLevel } from "@/lib/fractured-idle/enchant";
import { idleSwings, pickOf, pickPower, totalDrills } from "@/lib/fractured-idle/mine";
import { makeSources, type SourceFn } from "./stats-sources";
import { Tip, TipCard } from "./tooltip";
import type { Ctx } from "./ui";

// The Stats tab: every number behind your income, grouped into colored
// categories. Each stat has an icon, a value and a one-line hint; hover, focus
// or tap one to see exactly which sources add up to it (see stats-sources.ts).
// Pick a category chip to focus on one group, or "All" to scroll them all.

interface Stat {
    id: string;
    label: string;
    value: string;
    icon: McSymbolName;
    color?: string;
    hint?: string;
    bar?: number; // 0..1 progress under the tile
    src?: string; // key into makeSources: makes the tooltip a breakdown
    srcFn?: SourceFn;
}
interface Cat {
    id: string;
    title: string;
    blurb: string;
    color: string;
    icon: McSymbolName;
    stats: Stat[];
}

const AQUA = "var(--mc-aqua)";
const GREEN = "var(--mc-green)";
const GOLD = "var(--mc-gold)";
const YELLOW = "var(--mc-yellow)";
const PURPLE = "var(--mc-light-purple)";
const RED = "var(--mc-red)";
const BLUE = "#6fb4ff";
const TEAL = "var(--mc-dark-aqua)";

export function StatsTab({ s, d, F }: Ctx) {
    const [cat, setCat] = useState<string>("all");
    const pct = (n: number) => `${(n * 100).toFixed(n * 100 < 10 ? 1 : 0)}%`;
    const owned = s.minions.reduce((a, b) => a + b, 0);
    const types = s.minions.filter((n) => n > 0).length;
    const unlocked = openIslands(s).length;
    const tiers = colTiers(s).reduce((a, b) => a + b, 0);
    const tro = trophyCounts(s);
    const src = makeSources(s, d, F);
    const bestPull = s.enc.byR.some((n) => n > 0) ? RARITIES[s.enc.byR.reduce((a, n, i) => (n > 0 ? i : a), 0)] : null;
    const skillRows = SKILLS.map((k): Stat => ({ id: `sk-${k.id}`, label: k.name, value: `Lv ${d[k.id as "mining"]}`, icon: k.symbol, color: k.color, hint: k.bonus(d[k.id as "mining"]) }));

    const cats: Cat[] = [
        {
            id: "clicking",
            title: "Clicking",
            blurb: "What a press is worth",
            color: AQUA,
            icon: "strength",
            stats: [
                { id: "click", label: "Press power", value: F(d.click), icon: "strength", color: RED, hint: "shards per normal click", src: "click" },
                { id: "avg", label: "Average click", value: F(d.avgClick), icon: "speed", hint: "including crits" },
                { id: "cc", label: "Crit chance", value: pct(d.critChance), icon: "critChance", color: BLUE, hint: "capped at 75%", bar: d.critChance / 0.75, src: "critChance" },
                { id: "cd", label: "Crit damage", value: `+${pct(d.critDmg)}`, icon: "critDamage", color: RED, hint: `crit click = ${F(d.click * (1 + d.critDmg))}`, src: "critDmg" },
                { id: "auto", label: "Auto-clicks", value: `${F(d.auto)}/s`, icon: "attackSpeed", color: YELLOW, hint: "clicks you don't have to make", src: "auto" },
                { id: "combo", label: "Max combo", value: `x${d.comboMax.toFixed(2)}`, icon: "heat", color: GOLD, hint: `best so far x${s.bestCombo.toFixed(2)}`, src: "combo" },
                { id: "clicks", label: "Total clicks", value: F(s.clicks), icon: "check", color: GREEN },
                { id: "crits", label: "Critical hits", value: F(s.crits), icon: "critDamage", color: RED },
            ],
        },
        {
            id: "production",
            title: "Production",
            blurb: "Minions and income",
            color: GREEN,
            icon: "forge",
            stats: [
                { id: "cps", label: "Minion output", value: `${F(d.cps)}/s`, icon: "forge", hint: "all minions together", src: "minion" },
                { id: "autoout", label: "Auto-click output", value: `${F(d.auto * d.avgClick)}/s`, icon: "attackSpeed", color: YELLOW },
                { id: "inc", label: "Total income", value: `${F(income(d))}/s`, icon: "speed", color: AQUA, hint: "minions plus auto-clicks" },
                { id: "own", label: "Minions owned", value: F(owned), icon: "petLuck", color: GOLD, hint: `${types}/${MINIONS.length} types`, bar: types / MINIONS.length },
                { id: "col", label: "Collection tiers", value: `${tiers}/${MINIONS.length * COL_AT.length}`, icon: "pristine", color: PURPLE, hint: "reset on rebirth", bar: tiers / (MINIONS.length * COL_AT.length) },
                { id: "syn", label: "Pocket Minion bonus", value: `+${pct(d.synergy)}`, icon: "intelligence", color: AQUA, hint: "of shards/sec added to each click" },
            ],
        },
        {
            id: "mult",
            title: "Multipliers",
            blurb: "Everything stacks here",
            color: GOLD,
            icon: "fortune",
            stats: [
                { id: "all", label: "Everything", value: `x${F(d.all)}`, icon: "fortune", hint: "all sources combined", src: "all" },
                { id: "asc", label: "Ascensions", value: `x${F(d.ascMult)}`, icon: "comet", color: PURPLE },
                { id: "reb", label: "Rebirths", value: `x${F(d.rMult)}`, icon: "portal", color: RED },
                { id: "pet", label: "Pets", value: `x${F(1 + d.pet.all)}`, icon: "petLuck", color: TEAL, hint: "all-shards bonus from pets" },
                { id: "isl", label: "Island", value: `x${F(d.islandMult)}`, icon: "location", color: BLUE },
                { id: "tro", label: "Trophies", value: `x${F(d.achMult)}`, icon: "pristine", color: YELLOW },
                { id: "tal", label: "Talismans & Golden Touch", value: `x${F(d.allUp)}`, icon: "magicFind", color: GOLD },
                { id: "cu", label: "Click upgrades", value: `x${F(d.clickUp)}`, icon: "strength", color: RED },
                { id: "mu", label: "Minion upgrades", value: `x${F(d.minionUp)}`, icon: "forge", color: GREEN },
            ],
        },
        {
            id: "skills",
            title: "Skills",
            blurb: "Six skills, each with a perk",
            color: GREEN,
            icon: "wisdom",
            stats: [...skillRows, { id: "pick", label: "Pick power", value: `x${pickPower(s).toFixed(2)}`, icon: "pick", color: "#e0b070", hint: pickOf(s).name }, { id: "ore", label: "Ore mined", value: F(Math.floor(Object.values(s.mine.mined).reduce((a, n) => a + n, 0))), icon: "gem", color: "#e0b070", hint: `${F(Math.floor(s.mine.nodes))} swings, ${F(s.mine.cracked)} geodes` }, { id: "drill", label: "Swings per second", value: `${idleSwings(s, d.auto).toFixed(1)}/s`, icon: "forge", color: AQUA, hint: `${F(totalDrills(s))} drills, always on` }, { id: "bob", label: "Bobbers caught", value: F(s.bobbers), icon: "fishing", color: AQUA }, { id: "xp", label: "Skill XP gain", value: `x${d.xpMult.toFixed(2)}`, icon: "wisdom", color: GREEN, hint: "all skills", src: "xp" }],
        },
        {
            id: "enchant",
            title: "Enchanting",
            blurb: "Dust, luck and worn enchants",
            color: PURPLE,
            icon: "intelligence",
            stats: [
                { id: "dust", label: "Arcane Dust", value: F(s.enc.dust), icon: "night", color: "#d9a8ff", hint: `${F(s.enc.earned)} earned in total` },
                { id: "dustm", label: "Dust gain", value: `x${d.dustMult.toFixed(2)}`, icon: "night", color: "#d9a8ff", src: "dust" },
                { id: "rolls", label: "Rolls", value: F(s.enc.rolls), icon: "intelligence", color: YELLOW, hint: `${s.enc.polishes} polishes and reforges` },
                { id: "luck", label: "Luck", value: `x${d.luck.toFixed(2)}`, icon: "petLuck", color: GREEN, hint: `table level ${enchLevel(s)}`, src: "luck" },
                { id: "best", label: "Best pull", value: bestPull ? bestPull.name : "none yet", icon: "magicFind", color: bestPull ? bestPull.color : undefined },
                { id: "codex", label: "Codex", value: `${codexCount(s)}/${CODEX_TOTAL}`, icon: "wisdom", color: PURPLE, bar: codexCount(s) / CODEX_TOTAL },
                ...SLOTS.map((sl): Stat => {
                    const e = s.enc.eq[sl.id];
                    return { id: `slot-${sl.id}`, label: sl.name, value: e ? RARITIES[e.r].name : "empty", icon: sl.symbol, color: e ? RARITIES[e.r].color : sl.color };
                }),
                { id: "procs", label: "Click procs", value: `${(d.procs.bolt * 100).toFixed(1)}% / ${(d.procs.midas * 100).toFixed(1)}% / ${(d.procs.echo * 100).toFixed(1)}%`, icon: "critDamage", color: YELLOW, hint: "Lightning / Midas / Echo per click" },
            ],
        },
        {
            id: "pets",
            title: "Pets",
            blurb: "Companions and their perks",
            color: TEAL,
            icon: "petLuck",
            stats: [
                { id: "found", label: "Pets found", value: `${Object.keys(s.pets).length}/${PETS.length}`, icon: "petLuck", bar: Object.keys(s.pets).length / PETS.length },
                { id: "hatched", label: "Eggs hatched", value: String(s.hatched), icon: "pristine", color: GOLD },
                { id: "slots", label: "Slots", value: `${s.equip.length}/${petSlots(s)}`, icon: "flag", color: AQUA, hint: "equipped / unlocked" },
                ...(Object.keys(d.pet) as PetStat[]).filter((k) => d.pet[k] > 0).map((k): Stat => ({ id: `pet-${k}`, label: PET_LABEL[k], value: `+${+(d.pet[k] * 100).toFixed(1)}%`, icon: "petLuck", color: GREEN })),
            ],
        },
        {
            id: "popups",
            title: "Popup events",
            blurb: "Orbs, quick time events and combos",
            color: GOLD,
            icon: "flag",
            stats: [
                { id: "freq", label: "Popup frequency", value: `x${d.evFreq.toFixed(2)}`, icon: "flag", color: AQUA, hint: "how often orbs appear", src: "popups" },
                { id: "caught", label: "Popups caught", value: F(s.evs.caught), icon: "check", color: GREEN },
                { id: "gold", label: "Golden shards", value: F(s.evs.golden), icon: "magicFind", color: GOLD },
                { id: "qte", label: "Quick time events", value: F(s.evs.qte), icon: "attackSpeed", color: BLUE, hint: `${F(s.evs.perfect)} perfect` },
                { id: "frag", label: "Fracture Fragments", value: String(s.frag), icon: "comet", color: PURPLE, hint: `+${+(Math.min(500, s.frag) * 0.2).toFixed(1)}% all shards` },
                { id: "curse", label: "Curses taken", value: String(s.evs.curses), icon: "heat", color: RED },
                { id: "lvl", label: "Fractured Level", value: `${s.lvl}`, icon: "flag", color: YELLOW, hint: `+${+(s.lvl * 0.15).toFixed(1)}% all shards` },
            ],
        },
        {
            id: "progress",
            title: "Progress",
            blurb: "How far you have come",
            color: YELLOW,
            icon: "comet",
            stats: [
                { id: "life", label: "Lifetime shards", value: F(s.total), icon: "speed", color: AQUA },
                { id: "rb", label: "Rebirths", value: String(s.rebirths), icon: "portal", color: RED },
                { id: "tok", label: "Tokens", value: String(s.tokens), icon: "pristine", color: PURPLE },
                { id: "isl2", label: "Islands", value: `${unlocked}/${ISLANDS.length}`, icon: "location", color: BLUE, bar: unlocked / ISLANDS.length },
                { id: "tro2", label: "Trophy tiers", value: `${tro.got}/${tro.all}`, icon: "pristine", color: YELLOW, bar: tro.got / Math.max(1, tro.all) },
                { id: "as", label: "Ascensions", value: String(s.asc), icon: "comet", color: PURPLE, hint: `${s.ap} points unspent` },
                { id: "stack", label: "Rebirth stack", value: `${rebirthCap(s)}/15`, icon: "portal", color: RED, hint: "levels per rebirth", bar: rebirthCap(s) / 15 },
                { id: "peak", label: "Best income", value: `${F(s.peakInc)}/s`, icon: "speed", color: GREEN, hint: "prices your eggs" },
                { id: "tm", label: "Token bonus", value: `x${tokenMult(s).toFixed(2)}`, icon: "pristine", color: PURPLE, hint: "trophies + Token Magnet" },
                { id: "time", label: "Play time", value: fmtTime(s.playTime), icon: "night", color: "#b9b3cc" },
                { id: "off", label: "Offline efficiency", value: pct(offlineEff(s)), icon: "night", color: TEAL, hint: "up to 8 hours", bar: offlineEff(s), src: "offline" },
            ],
        },
    ];

    const bonusStats: Stat[] = (Object.keys(REWARD_LABEL) as RewardStat[])
        .filter((k) => d.bonus[k] > 0)
        .map((k) => ({ id: `tb-${k}`, label: REWARD_LABEL[k], value: `+${+(d.bonus[k] * 100).toFixed(1)}%`, icon: "pristine" as McSymbolName, color: YELLOW }));
    if (bonusStats.length) cats.push({ id: "trophy", title: "Trophy bonuses", blurb: "Permanent rewards from trophies", color: YELLOW, icon: "pristine", stats: bonusStats });

    const hero: Stat[] = [
        { id: "h-inc", label: "Income", value: `${F(income(d))}/s`, icon: "speed", color: GREEN, hint: "per second" },
        { id: "h-click", label: "Per click", value: F(d.avgClick), icon: "strength", color: AQUA, hint: "with crits", src: "click" },
        { id: "h-all", label: "Everything", value: `x${F(d.all)}`, icon: "fortune", color: GOLD, hint: "total multiplier", src: "all" },
        { id: "h-lvl", label: "Level", value: String(s.lvl), icon: "flag", color: YELLOW, hint: "Fractured Level" },
    ];

    const shown = cat === "all" ? cats : cats.filter((c) => c.id === cat);

    return (
        <div className="fi-st-root">
            <div className="fi-st-hero">
                {hero.map((h) => (
                    <StatTile key={h.id} stat={h} cat={{ color: h.color ?? AQUA, title: "Overview" }} src={h.src ? src[h.src] : undefined} big />
                ))}
            </div>

            <div className="fi-st-chips" role="tablist" aria-label="Stat categories">
                <button type="button" role="tab" aria-selected={cat === "all"} data-on={cat === "all"} onClick={() => setCat("all")} className="fi-st-chip" style={{ ["--c" as string]: "#fff" } as CSSProperties}>
                    All
                </button>
                {cats.map((c) => (
                    <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} data-on={cat === c.id} onClick={() => setCat(c.id)} className="fi-st-chip" style={{ ["--c" as string]: c.color } as CSSProperties}>
                        <McSymbol name={c.icon} /> {c.title}
                    </button>
                ))}
            </div>
            <p className="fi-st-tip">Hover, focus or tap any stat with a dot to see where it comes from.</p>

            {shown.map((c) => (
                <section key={c.id} className="fi-st-cat" style={{ ["--c" as string]: c.color } as CSSProperties}>
                    <header className="fi-st-cat-h">
                        <span className="fi-st-cat-i">
                            <McSymbol name={c.icon} />
                        </span>
                        <span className="min-w-0">
                            <b>{c.title}</b>
                            <small>{c.blurb}</small>
                        </span>
                        <span className="fi-st-cat-n">{c.stats.length}</span>
                    </header>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {c.stats.map((st) => (
                            <StatTile key={st.id} stat={st} cat={c} src={st.src ? src[st.src] : st.srcFn} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function StatTile({ stat, cat, src, big }: { stat: Stat; cat: { color: string; title: string }; src?: SourceFn; big?: boolean }) {
    const color = stat.color ?? cat.color;
    return (
        <Tip
            tip={() => {
                const rows = src?.() ?? [];
                return (
                    <TipCard
                        title={stat.label}
                        color={color}
                        tag={stat.value}
                        rawTag
                        lines={stat.hint ? [stat.hint] : undefined}
                        rows={rows.length ? rows.filter((r) => r.value).map((r) => [r.label, r.value, r.color] as [string, string, string]) : undefined}
                        notes={[
                            ...rows.filter((r) => !r.value).map((r) => ({ text: r.label, color: "#9a94b0" })),
                            ...(src && !rows.length ? [{ text: "Nothing is adding to this yet.", color: "#9a94b0" }] : []),
                        ]}
                        foot={src ? undefined : cat.title}
                    />
                );
            }}
        >
            <div className={`fi-st ${big ? "fi-st-big" : ""}`} tabIndex={0} data-src={src ? "" : undefined} style={{ ["--c" as string]: color } as CSSProperties}>
                <span className="fi-st-i">
                    <McSymbol name={stat.icon} />
                </span>
                <span className="fi-st-b">
                    <span className="fi-st-l">{stat.label}</span>
                    {stat.hint && <span className="fi-st-h">{stat.hint}</span>}
                </span>
                <b className="fi-st-v">{stat.value}</b>
                {stat.bar !== undefined && <i className="fi-st-bar" style={{ ["--p" as string]: `${Math.max(0, Math.min(1, stat.bar)) * 100}%` } as CSSProperties} />}
            </div>
        </Tip>
    );
}

export const STATS_CSS = `
.fi-st-root{display:flex;flex-direction:column;gap:.7rem}
.fi-st-hero{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}
@media (min-width:640px){.fi-st-hero{grid-template-columns:repeat(4,minmax(0,1fr))}}
.fi-st-chips{display:flex;gap:.3rem;overflow-x:auto;padding:.1rem .05rem .3rem;scrollbar-width:none;margin:0 -.1rem}
.fi-st-chip{flex:none;display:inline-flex;align-items:center;gap:.3rem;height:1.9rem;padding:0 .7rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-size:.68rem;color:color-mix(in oklch,var(--c) 75%,#fff);background:color-mix(in oklch,var(--c) 7%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 26%,transparent);white-space:nowrap;transition:background .15s,box-shadow .15s,transform .12s;touch-action:manipulation}
.fi-st-chip:hover{background:color-mix(in oklch,var(--c) 16%,transparent)}
.fi-st-chip:active{transform:scale(.95)}
.fi-st-chip[data-on="true"]{background:color-mix(in oklch,var(--c) 26%,transparent);box-shadow:inset 0 0 0 1px var(--c),0 0 14px -5px var(--c);color:var(--c)}
.fi-st-tip{margin:-.3rem 0 0;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-st-cat{border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:linear-gradient(160deg,color-mix(in oklch,var(--c) 7%,transparent),transparent 55%);padding:.55rem}
.fi-st-cat-h{display:flex;align-items:center;gap:.6rem;margin-bottom:.45rem}
.fi-st-cat-i{display:grid;place-items:center;width:2rem;height:2rem;flex:none;border-radius:.6rem;font-size:1.15rem;color:var(--c);background:color-mix(in oklch,var(--c) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 40%,transparent)}
.fi-st-cat-h b{display:block;font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.9rem;color:var(--c);text-shadow:0 0 10px color-mix(in oklch,var(--c) 50%,transparent)}
.fi-st-cat-h small{display:block;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-st-cat-n{margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.6rem;padding:.05rem .45rem;border-radius:999px;color:var(--c);background:color-mix(in oklch,var(--c) 14%,transparent)}
.fi-st{position:relative;display:flex;align-items:center;gap:.55rem;min-width:0;padding:.42rem .6rem .5rem .45rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);overflow:hidden;cursor:default;outline:none;transition:transform .14s,background .15s,border-color .15s,box-shadow .15s}
.fi-st:hover,.fi-st:focus-visible{transform:translateY(-1px);background:color-mix(in oklch,var(--c) 10%,rgba(255,255,255,.02));border-color:color-mix(in oklch,var(--c) 55%,transparent);box-shadow:0 4px 14px -8px var(--c)}
.fi-st[data-src]{cursor:help}
.fi-st[data-src]::after{content:"";position:absolute;right:.35rem;top:.35rem;width:.3rem;height:.3rem;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c);opacity:.85}
.fi-st-i{display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:.55rem;font-size:1.05rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 30%,transparent);transition:transform .2s cubic-bezier(.2,1.7,.4,1)}
.fi-st:hover .fi-st-i,.fi-st:focus-visible .fi-st-i{transform:scale(1.12) rotate(-6deg)}
.fi-st-b{display:flex;flex-direction:column;min-width:0;flex:1}
.fi-st-l{font-family:var(--font-rubik,inherit);font-size:.74rem;color:#e6e2f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-st-h{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-st-v{flex:none;max-width:48%;font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.82rem;color:var(--c);text-shadow:0 0 10px color-mix(in oklch,var(--c) 40%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right}
.fi-st-bar{position:absolute;left:.45rem;right:.45rem;bottom:.18rem;height:2px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.fi-st-bar::after{content:"";display:block;height:100%;width:var(--p);border-radius:inherit;background:var(--c);box-shadow:0 0 6px var(--c);transition:width .4s}
.fi-st-big{flex-direction:column;align-items:flex-start;gap:.3rem;padding:.6rem .7rem .7rem;border-color:color-mix(in oklch,var(--c) 35%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--c) 14%,transparent),rgba(255,255,255,.02) 70%)}
.fi-st-big .fi-st-i{position:absolute;right:.5rem;top:.5rem;width:1.7rem;height:1.7rem}
.fi-st-big .fi-st-b{order:-1;flex:none}
.fi-st-big .fi-st-v{max-width:100%;font-size:1.25rem;text-align:left}
.fi-st-big[data-src]::after{display:none}
@media (max-width:639px){.fi-st{padding-block:.5rem .55rem}.fi-st-v{font-size:.78rem}.fi-st-big .fi-st-v{font-size:1.1rem}}
@media (prefers-reduced-motion:reduce){.fi-st,.fi-st-i,.fi-st-chip{transition:none}.fi-st:hover,.fi-st:focus-visible{transform:none}}
`;

"use client";

import { sfx } from "@/lib/sound/sounds";
import { QUICK_CSS, QuickPanel, type QuickAct } from "./quick-actions";
import { useEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { SKILL_CAP, fmtTime, skillXpFor } from "@/lib/fractured-idle/engine";
import { ISLANDS, ISLAND_BY_ID, type Dim } from "@/lib/fractured-idle/islands";
import { activeIsland, openIslands } from "@/lib/fractured-idle/island-logic";
import {
    COL_AT,
    DIMS,
    DIM_FX,
    GEODE_TOKENS,
    GEODE_W,
    ISLAND_ORES,
    LADDERS,
    MILESTONES,
    ORE_BY_ID,
    bottleneck,
    claimAllFeats,
    claimFeat,
    crackAll,
    digHit,
    digHits,
    drillHeld,
    ENCHANTS,
    PARTS,
    canBuyEnch,
    featsReady,
    goalOf,
    isOre,
    autoRig,
    enchantAll,
    heldTool,
    canCraft,
    queueGoal,
    DIM_LABEL,
    DIM_ORES,
    GEODES,
    ITEMS,
    ORES,
    RECIPES,
    RECIPE_BY_ID,
    SET_STEPS,
    collectAll,
    colTierOf,
    comboFactor,
    dimSet,
    drillMk,
    drillSwings,
    geodeChance,
    geodeCount,
    have,
    haveOre,
    hasDrill,
    idleSwings,
    itemCount,
    jobsReady,
    mineCtx,
    mineLevel,
    onSwing,
    oreIslands,
    oreTable,
    oreXp,
    passiveSwings,
    pickPower,
    resInfo,
    rushLen,
    rushMult,
    setFocus,
    slotsFree,
    startCraft,
    swingShards,
    consumeItem,
    veinNeed,
    yieldMult,
    type ItemId,
    type OreDef,
    type OreId,
    type ResId,
    type SwingOut,
} from "@/lib/fractured-idle/mine";
import { colSteps } from "@/lib/fractured-idle/milestones";
import { SAGA_BY_ID, chapterFrac, chapterReady, currentChapter, tasksDone } from "@/lib/fractured-idle/sagas";
import { Forge, FORGE_CSS } from "./mine-forge";
import { MINE_TOOL_CSS, ToolView } from "./mine-tool";
import { mineNeeds } from "./mine-bits";
import { MilestoneBoard, NeedTile, RecentFinds, SKILL_KIT_CSS } from "./skill-kit";
import { wantLevel } from "./level-nav";
import { TabBar, type TabGroup, type TabItem } from "./tab-bar";
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
type View = "dig" | "tool" | "forge" | "ores" | "worlds" | "milestones";
const MINE_TABS: TabItem<View>[] = [
    { id: "dig", label: "Mine", symbol: "pick", group: "work", color: "#e0b070", blurb: "The rock face: swing, crack geodes and watch what drops." },
    { id: "tool", label: "Tool", symbol: "strength", group: "work", color: "#ffd23a", blurb: "Pickaxes, the drill, its parts and your enchants." },
    { id: "forge", label: "Forge", symbol: "forge", group: "work", color: "#ff9a4d", blurb: "Smelt ingots and craft drill parts, pickaxes and relics." },
    { id: "ores", label: "Ores", symbol: "gem", group: "know", color: "#55ffff", blurb: "Every ore, where it drops and what it makes." },
    { id: "worlds", label: "Worlds", symbol: "portal", group: "know", color: "#c58bff", blurb: "What each island and dimension gives." },
    { id: "milestones", label: "Milestones", symbol: "pristine", group: "know", color: "#55ff55", blurb: "Tiers for every item and action, with permanent rewards." },
];
const MINE_GROUPS: TabGroup[] = [
    { id: "work", label: "Work", color: "#ff9a4d" },
    { id: "know", label: "Know", color: "#55ffff" },
];

const fmtPct = (n: number) => `${+(n * 100).toFixed(1)}%`;
const amt = (F: (n: number) => string, n: number) => (n >= 1000 ? F(Math.floor(n)) : n >= 100 ? String(Math.floor(n)) : String(+n.toFixed(n < 10 ? 2 : 1)));
const col = (c: string) => ({ ["--oc" as string]: c }) as CSSProperties;

// The ore blobs drawn on the rock face: fixed spots, shared out by the island's odds.
const BLOBS: [number, number, number][] = [
    [8, 22, 11], [22, 62, 9], [31, 18, 7], [42, 48, 12], [55, 20, 8], [64, 66, 10], [74, 30, 11], [86, 58, 8],
    [14, 82, 7], [48, 80, 9], [90, 16, 7], [36, 34, 6], [70, 84, 7], [58, 46, 6], [82, 80, 6], [26, 40, 6],
];

export function MineTab({ s, d, F, render, say, open }: Ctx & { open: (tab: string) => void }) {
    const m = s.mine;
    const lvl = mineLevel(s);
    const [view, setView] = useState<View>("dig");
    const ready = jobsReady(s);
    const hi = skillXpFor(lvl + 1, undefined);
    const lo = skillXpFor(lvl, undefined);
    const pp = pickPower(s);
    const idle = idleSwings(s, d.auto);
    const tool = heldTool(s);
    const mined = ORES.reduce((a, o) => a + (m.mined[o.id] || 0), 0);
    const geodes = geodeCount(s);

    return (
        <div className="fi-mn">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Tool" value={`x${pp.toFixed(pp < 10 ? 2 : 1)}`} sub={tool.name} color={tool.color} tip={<TipCard title={tool.name} color={tool.color} lines={["Damage of every swing. Hard ore needs a strong tool to give a whole ore per swing."]} rows={[["Power", `x${pp.toFixed(2)}`], ["Tier", String(tool.tier)], ["Trait", tool.traitText]]} foot="Wield or build tools on the Tool tab" />} />
                <Stat label="Idle swings" value={`${idle.toFixed(idle < 10 ? 1 : 0)}/s`} sub={drillHeld(s) ? `Mk ${drillMk(s)} drill, always on` : hasDrill(s) ? "drill is in your toolbox" : "forge a drill to boost it"} color="var(--mc-aqua)" tip={<IdleTip s={s} auto={d.auto} />} />
                <Stat label="Ore mined" value={F(Math.floor(mined))} sub={`${F(Math.floor(m.nodes))} swings`} color={C} tip={<TipCard title="Ore mined" color={C} lines={["Everything you have mined, by hand, by auto-click or by drill."]} rows={[["Swings", F(Math.floor(m.nodes))], ["Ore Rushes", F(m.rushes)], ["Crafts collected", F(m.crafted)]]} />} />
                <Stat label="Geodes" value={String(geodes)} sub={`${F(m.cracked)} cracked`} color="var(--mc-light-purple)" tip={<TipCard title="Geodes" color="var(--mc-light-purple)" lines={["Swings sometimes drop one. The Nether and the End drop richer ones."]} rows={[["Chance per swing", fmtPct(geodeChance(s))], ...DIMS.map((dm) => [GEODES[dm].name, String(m.geodes[dm] || 0), GEODES[dm].color] as [string, string, string])]} />} />
            </div>
            <Progress label={`Mining ${lvl}`} color={C} pct={lvl >= SKILL_CAP ? 1 : (s.mining - lo) / (hi - lo)} right={lvl >= SKILL_CAP ? "MAX" : `${Math.floor(Math.max(0, (s.mining - lo) / (hi - lo)) * 100)}% to ${lvl + 1}`} />

            <SagaNudge s={s} open={() => { wantLevel("sagas", "mining"); open("level"); }} />

            <QuickBar s={s} d={d} render={render} say={say} />

            <TabBar
                tabs={MINE_TABS}
                groups={MINE_GROUPS}
                current={view}
                keys={false}
                notes={{
                    forge: ready > 0 ? [{ text: `${ready} craft${ready === 1 ? "" : "s"} ready to collect`, color: "#ff9a4d", act: true, n: ready }] : [],
                    dig: geodes > 0 ? [{ text: `${geodes} geode${geodes === 1 ? "" : "s"} to crack`, color: "#c58bff", act: true, n: geodes }] : [],
                    milestones: featsReady(s).length > 0 ? [{ text: `${featsReady(s).length} milestone reward${featsReady(s).length === 1 ? "" : "s"} to claim`, color: "#ffd23a", act: true, n: featsReady(s).length }] : [],
                }}
                onSelect={setView}
            />

            {view === "dig" && <DigView s={s} d={d} F={F} render={render} say={say} />}
            {view === "tool" && <ToolView s={s} F={F} render={render} say={say} goForge={() => setView("forge")} />}
            {view === "forge" && <Forge s={s} F={F} render={render} say={say} />}
            {view === "ores" && <Ores s={s} F={F} go={() => setView("milestones")} />}
            {view === "worlds" && <Worlds s={s} F={F} />}
            {view === "milestones" && <Milestones s={s} F={F} render={render} say={say} />}
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

// ---- Mine: the rock face ----

type Spot = { hp: number; max: number };

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
    const spots = useRef<Spot[]>([]);
    const sig = useRef("");
    const held = useRef<{ id: ReturnType<typeof setInterval> | null }>({ id: null });
    const [, bump] = useReducer((x: number) => x + 1, 0);
    const live = useRef({ s, d, say, render });
    useEffect(() => {
        live.current = { s, d, say, render };
    });

    // Blobs per ore, shared out by odds (the rock face is a picture of the table).
    const blobs: OreId[] = [];
    const open = rows.filter((r) => r.p > 0).sort((a, b) => b.p - a.p);
    if (open.length) {
        const left = BLOBS.length;
        const want = open.map((r) => Math.max(1, Math.round(r.p * left)));
        let i = 0;
        while (blobs.length < left && i < 400) {
            const k = i % open.length;
            if (want[k] > 0) {
                blobs.push(open[k].ore.id);
                want[k]--;
            }
            i++;
        }
        while (blobs.length < left) blobs.push(open[0].ore.id);
    }
    const nowSig = blobs.join(",");
    if (sig.current !== nowSig) {
        sig.current = nowSig;
        spots.current = blobs.map((id) => {
            const h = digHits(s, ORE_BY_ID[id]);
            return { hp: h, max: h };
        });
    }

    // Everything that happens on the rock face is DOM work, so a fast hold never waits on React.
    const fx = useRef({
        reduced: false,
        spark(color: string, x: number, y: number, n: number, far = 40) {
            const host = face.current;
            if (!host || this.reduced) return;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const dist = 14 + Math.random() * far;
                const el = document.createElement("i");
                el.className = "fi-mn-spark";
                el.style.background = color;
                el.style.left = `${x}%`;
                el.style.top = `${y}%`;
                host.appendChild(el);
                el.animate(
                    [
                        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                        { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist + 10}px)) scale(0)`, opacity: 0 },
                    ],
                    { duration: 360 + Math.random() * 260, easing: "cubic-bezier(.1,.7,.3,1)" },
                ).onfinish = () => el.remove();
            }
        },
        pop(text: string, color: string, x: number, y: number, big = false) {
            const host = face.current;
            if (!host) return;
            const el = document.createElement("span");
            el.className = `fi-mn-pop${big ? " big" : ""}`;
            el.textContent = text;
            el.style.color = color;
            el.style.left = `${Math.max(12, Math.min(88, x))}%`;
            el.style.top = `${y}%`;
            host.appendChild(el);
            el.onanimationend = () => el.remove();
        },
        /** The pickaxe flies to a node and swings. */
        swingAt(i: number) {
            const host = face.current;
            const pick = host?.querySelector<HTMLElement>(".fi-mn-pickfx");
            if (!pick) return;
            const [x, y] = BLOBS[i];
            pick.style.left = `${x}%`;
            pick.style.top = `${y}%`;
            if (!this.reduced) pick.animate([{ rotate: "-55deg" }, { rotate: "25deg", offset: 0.5 }, { rotate: "0deg" }], { duration: 190, easing: "ease-out" });
        },
        /** Wear a node down; breaks it (with a burst) at zero and grows it back a moment later. */
        chip(i: number, amount: number, color: string) {
            const sp = spots.current[i];
            const el = face.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
            if (!sp || !el || sp.hp <= 0) return false;
            sp.hp -= amount;
            el.style.setProperty("--dmg", String(Math.max(0, 1 - sp.hp / sp.max)));
            if (!this.reduced) el.animate([{ transform: "translate(-50%,-50%) scale(.82) rotate(-6deg)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 150 });
            if (sp.hp > 0) return false;
            el.dataset.broken = "true";
            const [x, y] = BLOBS[i];
            this.spark(color, x, y, 14, 70);
            setTimeout(() => {
                const id = blobs[i];
                if (!id || !el.isConnected) return;
                const h = digHits(live.current.s, ORE_BY_ID[id]);
                sp.hp = sp.max = h;
                el.style.setProperty("--dmg", "0");
                el.dataset.broken = "false";
                if (!this.reduced) el.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1.15)", opacity: 1, offset: 0.7 }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 380 });
            }, 950);
            return true;
        },
    });

    // The big button swings the pickaxe at a matching node (the ore is already paid; this is the picture of it).
    useEffect(() => {
        const f = fx.current;
        f.reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const off = onSwing((e) => {
            const host = face.current;
            if (!host) return;
            last.current = e;
            const o = ORE_BY_ID[e.ore];
            const now = performance.now();
            const idx: number[] = [];
            blobs.forEach((id, i) => {
                if (id === e.ore && spots.current[i]?.hp > 0) idx.push(i);
            });
            const i = idx.length ? idx[Math.floor(Math.random() * idx.length)] : -1;
            if (i >= 0) {
                f.swingAt(i);
                f.chip(i, 0.34, o.color);
                f.spark(o.color, BLOBS[i][0], BLOBS[i][1], e.rush ? 5 : e.lucky ? 6 : 3);
            }
            if (now - stamp.current.pop > 130 || e.rushStart || e.lucky || e.geode) {
                stamp.current.pop = now;
                const [x, y] = i >= 0 ? BLOBS[i] : [50, 50];
                f.pop(`+${amt((n) => String(Math.round(n)), e.units)} ${o.name}`, o.color, x, y - 8, e.rush);
            }
            if (e.rushStart) f.pop("ORE RUSH!", "#ffd23a", 50, 30, true);
            else if (e.lucky) f.pop("TRIPLE HAUL!", "#ffe29a", 50, 30, true);
            if (e.geode) f.pop(`${GEODES[e.geode].name}!`, GEODES[e.geode].color, 50, 20, true);
        });
        // Drills and the passive trickle: soft sparks in the ore's colour, a few a second.
        const id = setInterval(() => {
            const host = face.current;
            if (!host || f.reduced) return;
            const { s: st, d: dd } = live.current;
            const rate = idleSwings(st, dd.auto);
            const t = oreTable(st).filter((r) => r.p > 0);
            if (!t.length) return;
            const n = Math.min(3, Math.round(rate * 0.25 + Math.random()));
            for (let k = 0; k < n; k++) {
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
            if (held.current.id) clearInterval(held.current.id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Digging by hand: each hit pays small bits of ore, the break pays a lot. It is not a press of the big button.
    const hit = (i: number) => {
        const { s: st, d: dd, say: tell } = live.current;
        const id = blobs[i];
        const sp = spots.current[i];
        if (!id || !sp || sp.hp <= 0) return;
        const o = ORE_BY_ID[id];
        const f = fx.current;
        const broke = sp.hp <= 1;
        const out = digHit(st, mineCtx(dd), id, broke);
        f.swingAt(i);
        f.chip(i, 1, o.color);
        const [x, y] = BLOBS[i];
        f.spark(o.color, x, y, broke ? 6 : 3);
        f.pop(`+${amt((n) => String(Math.round(n)), out.units)} ${o.name}`, o.color, x, y - 10, broke);
        if (out.lucky) f.pop("TRIPLE BREAK!", "#ffe29a", 50, 26, true);
        if (out.geode) tell(`A ${GEODES[out.geode].name} dropped! Crack it below.`);
    };
    const stop = () => {
        if (held.current.id) clearInterval(held.current.id);
        held.current.id = null;
    };
    const press = (i: number) => {
        stop();
        hit(i);
        held.current.id = setInterval(() => hit(i), 150);
        const up = () => {
            stop();
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
        };
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
    };

    const geodes = geodeCount(s);
    const dimWithGeodes = DIMS.filter((x) => (m.geodes[x] || 0) > 0);
    const crackOne = (all: boolean) => {
        const { n, last: out } = crackAll(s, mineCtx(d), !all);
        if (n && out) {
            say(n === 1 ? `Geode: ${out.title}, ${out.sub}` : `Cracked ${n} geodes. Latest: ${out.title}, ${out.sub}`);
            sfx(n === 1 ? "collect" : "bulk");
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
    const goal = goalOf(s);

    return (
        <>
            <div ref={face} className="fi-mn-face" data-rush={rush} data-dim={isl.dim} style={{ ["--pc" as string]: heldTool(s).color, ["--dc" as string]: isl.dim === "overworld" ? "#8a7a60" : isl.dim === "nether" ? "#b5483f" : "#c48ae0" } as CSSProperties}>
                {BLOBS.map(([x, y, r], i) => {
                    const o = ORE_BY_ID[blobs[i] ?? "coal"];
                    return (
                        <button
                            key={`${i}:${blobs[i]}`}
                            type="button"
                            className="fi-mn-blob"
                            data-i={i}
                            data-ore={blobs[i]}
                            data-broken="false"
                            aria-label={`Dig ${o.name} ore. About ${spots.current[i]?.max ?? 8} hits to break. Hold to keep digging.`}
                            style={{ left: `${x}%`, top: `${y}%`, width: `clamp(2rem, ${r * 0.9}%, 3.1rem)`, ["--oc" as string]: o.color, ["--dmg" as string]: spots.current[i] ? Math.max(0, 1 - spots.current[i].hp / spots.current[i].max) : 0 } as CSSProperties}
                            onPointerDown={(e) => {
                                if (e.pointerType === "mouse" && e.button !== 0) return;
                                e.preventDefault();
                                press(i);
                            }}
                            onClick={(e) => {
                                if (e.detail === 0) hit(i); // keyboard
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                        />
                    );
                })}
                <span className="fi-mn-pickfx" style={{ ["--pc" as string]: heldTool(s).color } as CSSProperties} aria-hidden="true">
                    <McSymbol name={drillHeld(s) ? "cog" : "pick"} />
                </span>
                <span className="fi-mn-where" style={{ color: dim.color }}>
                    {isl.name} <em>· {dim.name}</em>
                </span>
            </div>
            <p className="fi-mn-tip">
                <b>Tap or hold an ore</b> to dig it yourself: small bits every hit, a big haul when it breaks. The big button swings at random ore.
            </p>

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
                    <>Swing damage is <b>x{pp.toFixed(pp < 10 ? 2 : 1)}</b>, and goes up with your combo. Hold the big button!</>
                )}
            </div>

            {goal && <GoalCard s={s} goal={goal} F={F} render={render} say={say} />}

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
            <p className="fi-mn-note">{lvlOpen(s) ? "Tap a star to prospect: that ore gets half of your swings, so one ore fills its collection fast. " : ""}Other islands and dimensions carry other ore: see the Worlds tab, and travel with I.</p>

            {(geodes > 0 || itemCount(s) > 0) && (
                <div className="fi-mn-actions">
                    {geodes > 0 && (
                        <div className="fi-mn-geode">
                            <span className="fi-mn-geode-n">
                                <McSymbol name="gem" /> {dimWithGeodes.map((x, i) => <span key={x} style={{ color: GEODES[x].color }}>{i ? " · " : ""}<b>{m.geodes[x]}</b> {GEODES[x].name}{m.geodes[x] === 1 ? "" : "s"}</span>)}
                            </span>
                            <Tip box tip={<TipCard title="Crack a geode" color="var(--mc-light-purple)" lines={["A random reward: dust, tokens, an egg, shards, a Fragment or a gem. Nether and End geodes pay more."]} foot="Click to crack!" />}>
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

            <RecentFinds log={m.log} color={C} noun="digging" />
        </>
    );
}

/** What you are working toward, what is missing, and one-tap ways to get it. */
function GoalCard({ s, goal, render, say }: { s: Ctx["s"]; goal: NonNullable<ReturnType<typeof goalOf>>; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    const lvlOk = mineLevel(s) >= goal.need;
    const short = bottleneck(s, goal);
    const ore = short ? ORE_BY_ID[short] : null;
    const missing = Object.entries(goal.cost).some(([k, v]) => have(s, k as ResId) < (v ?? 0));
    const startable = Object.entries(goal.cost).some(([k]) => RECIPES.find((r) => r.id === k && r.kind === "ingot") && have(s, k as ResId) < (goal.cost[k as ResId] ?? 0));
    const rec = RECIPE_BY_ID[goal.id];
    const can = !!rec && canCraft(s, rec, 1).ok;
    return (
        <div className="fi-mn-goal" style={{ ["--c" as string]: goal.color } as CSSProperties}>
            <div className="fi-mn-goal-h">
                <span>Next goal</span>
                <b>{goal.title}</b>
                {!lvlOk && <em><Lock className="inline size-3" /> Mining {goal.need}</em>}
            </div>
            <span className="fi-cb-needs">{mineNeeds(s, goal.cost).map((n) => <NeedTile key={n.id} n={n} />)}</span>
            <div className="fi-mn-goal-f">
                {can && (
                    <button
                        type="button"
                        className="fi-mn-buy small"
                        onClick={() => {
                            if (startCraft(s, goal.id)) {
                                say(`${goal.title} is in the furnace.`);
                                render();
                            }
                        }}
                    >
                        Forge it now
                    </button>
                )}
                {ore && missing && (
                    <button
                        type="button"
                        className="fi-mn-buy small ghost"
                        onClick={() => {
                            setFocus(s, ore.id);
                            say(`Prospecting ${ore.name}: it now gets half of your swings.`);
                            render();
                        }}
                    >
                        Prospect {ore.name}
                    </button>
                )}
                {startable && missing && (
                    <button
                        type="button"
                        className="fi-mn-buy small ghost"
                        onClick={() => {
                            const n = queueGoal(s);
                            say(n ? `Started ${n} craft${n > 1 ? "s" : ""} for the ${goal.title}.` : "Nothing to start: check ore and free furnaces.");
                            render();
                        }}
                    >
                        Smelt what is missing
                    </button>
                )}
                {ore && missing && <span className="fi-mn-goal-w">{ore.name} is on {oreIslands(ore.id).slice(0, 2).map((id) => ISLAND_BY_ID[id]?.name ?? id).join(" and ")}</span>}
            </div>
        </div>
    );
}

/** The current Spelunking Saga chapter, with a way into the Level page. */
function SagaNudge({ s, open }: { s: Ctx["s"]; open: () => void }) {
    const saga = SAGA_BY_ID.mining;
    const ch = currentChapter(s, saga);
    if (!ch) return null;
    const ready = chapterReady(s, ch);
    const next = ch.tasks.find((t) => t.prog(s)[0] < t.prog(s)[1]);
    return (
        <button type="button" className="fi-fg fi-mn-saga" data-ready={ready} onClick={open} style={{ textAlign: "left" }}>
            <span className="fi-fg-h"><span>Spelunking Saga · Chapter {ch.n}</span><b>{tasksDone(s, ch)} of {ch.tasks.length} tasks</b></span>
            <span className="fi-fg-bar"><i style={{ width: `${chapterFrac(s, ch) * 100}%` }} /></span>
            <span className="fi-fg-t"><span className="fi-fg-mark">{ready ? "✔" : "➜"}</span>{ready ? `${ch.name} is ready to claim` : next?.text}<em>{ready ? "Open the Level page" : ch.name}</em></span>
        </button>
    );
}

// ---- Quick actions ----

function QuickBar({ s, d, render, say }: { s: Ctx["s"]; d: Ctx["d"]; render: () => void; say: (m: string) => void }) {
    const ctx = mineCtx(d);
    const ready = jobsReady(s);
    const geodes = geodeCount(s);
    const feats = featsReady(s).length;
    const tool = heldTool(s);
    const goal = goalOf(s);
    const rec = goal ? RECIPE_BY_ID[goal.id] : undefined;
    const make = !!rec && canCraft(s, rec, 1).ok;
    const ench = ORES.length > 0 && enchantableNow(s);
    const rig = s.mine.parts.length > 0 && (!drillHeld(s) || PART_BEST(s));
    const smelt = !!goal && slotsFree(s) > 0 && Object.entries(goal.cost).some(([k, v]) => {
        const r = RECIPES.find((x) => x.id === k && x.kind === "ingot");
        return !!r && have(s, k as ResId) + s.mine.jobs.filter((j) => j.r === k).reduce((a, j) => a + j.n, 0) < (v ?? 0) && canCraft(s, r, 1).ok;
    });
    const rushPot = (s.mine.items.rushPotion || 0) > 0 && s.mine.rush <= 0;

    const run = {
        collect: () => {
            const got = collectAll(s, Date.now());
            return got.length ? `Collected ${got.length} craft${got.length > 1 ? "s" : ""}.` : "";
        },
        crack: () => {
            const { n, last } = crackAll(s, ctx);
            return n && last ? `Cracked ${n} geode${n > 1 ? "s" : ""}. Latest: ${last.title}, ${last.sub}` : "";
        },
        claim: () => {
            const got = claimAllFeats(s);
            return got.length ? `Claimed ${got.length} milestone${got.length > 1 ? "s" : ""}.` : "";
        },
        make: () => (goal && make && startCraft(s, goal.id) ? `${goal.title} is in the furnace.` : ""),
        ench: () => {
            const n = enchantAll(s);
            return n ? `Bought ${n} enchant level${n > 1 ? "s" : ""}.` : "";
        },
        rig: () => (autoRig(s) ? "Best parts installed, drill in hand." : ""),
        smelt: () => {
            const n = queueGoal(s);
            return n ? `Started ${n} craft${n > 1 ? "s" : ""} for your goal.` : "";
        },
        rush: () => (consumeItem(s, "rushPotion", ctx) ?? ""),
    };
    const go = (keys: (keyof typeof run)[]) => {
        const out = keys.map((k) => run[k]()).filter(Boolean);
        if (out.length) {
            say(out.slice(0, 3).join(" "));
            render();
        }
    };
    const acts: QuickAct[] = [
        { k: "collect", label: "Collect", icon: "forge", tip: "Collect every finished Forge craft.", on: ready > 0, n: ready },
        { k: "crack", label: "Crack", icon: "gem", tip: "Crack every geode you are holding.", on: geodes > 0, n: geodes },
        { k: "claim", label: "Claim", icon: "crown", tip: "Claim every milestone you have earned.", on: feats > 0, n: feats },
        { k: "make", label: "Make", icon: "pick", tip: goal ? `Start the ${goal.title} if you have everything for it.` : "Nothing to make.", on: make },
        { k: "ench", label: "Enchant", icon: "intelligence", tip: `Buy every ore-priced enchant you can afford for your ${tool.name}.`, on: ench },
        { k: "rig", label: "Rig", icon: "cog", tip: "Install your best engine and head and take the drill in hand.", on: rig },
        { k: "smelt", label: "Smelt", icon: "heat", tip: "Start crafts for the ingots your next goal is short of.", on: smelt },
        { k: "rush", label: "Rush", icon: "bolt", tip: "Drink a Rush Potion to start an Ore Rush now.", on: rushPot },
    ];
    return (
        <>
            <style>{QUICK_CSS}</style>
            <QuickPanel
                actions={acts}
                color={C}
                allIcon="sunburst"
                allTip="Collect, crack, claim, make your goal, enchant, rig the drill and smelt for your goal, all in one press."
                onRun={(k) => {
                    sfx("collect");
                    go([k as keyof typeof run]);
                }}
                onAll={() => go(["collect", "crack", "claim", "make", "ench", "rig", "smelt"])}
            />
        </>
    );
}

/** Whether Enchant All would buy something. */
function enchantableNow(s: Ctx["s"]): boolean {
    return ENCHANTS.some((e) => canBuyEnch(s, heldTool(s).id, e).ok && Object.keys(e.cost).every((k) => isOre(k)));
}
/** Whether a better engine or head is waiting to be installed. */
function PART_BEST(s: Ctx["s"]): boolean {
    return (["engine", "head"] as const).some((k) => {
        const best = PARTS.filter((p) => p.kind === k && s.mine.parts.includes(p.id)).sort((a, b) => b.tier - a.tier)[0];
        return !!best && s.mine.rig[k] !== best.id;
    });
}

const lvlOpen = (s: Ctx["s"]) => mineLevel(s) >= 5;

/** A dimension shows up in the Drills and Ores lists once you can reach one of its islands (or already mined its ore). */
const dimOpen = (s: Ctx["s"], dm: Dim) => dm === "overworld" || openIslands(s).some((i) => i.dim === dm) || DIM_ORES[dm].some((o) => (s.mine.mined[o.id] || 0) > 0);

function OreTip({ s, d, o, p, F, brief }: { s: Ctx["s"]; d?: Ctx["d"]; o: OreDef; p: number; F: (n: number) => string; brief?: boolean }) {
    const tier = colTierOf(s.mine.mined[o.id] || 0);
    const dmg = pickPower(s) * comboFactor(Math.max(1, s.combo));
    const ratio = dmg / o.hard;
    const perSwing = (ratio <= 3 ? ratio : 3 + Math.pow(ratio - 3, 0.6)) * yieldMult(s);
    const ctx = d ? mineCtx(d) : null;
    return (
        <TipCard
            title={o.name}
            color={o.color}
            tag={o.need ? `Mining ${o.need}` : DIM_LABEL[o.dim].name}
            lines={mineLevel(s) < o.need ? [`Opens at Mining ${o.need}.`] : undefined}
            rows={
                brief || !ctx
                    ? [["Hardness", `${o.hard} pick power`], ["Hits to dig", `${digHits(s, o)}`], ["Collection", `tier ${tier}/${COL_AT.length}`, o.color]]
                    : [
                          ["Chance per swing", p > 0 ? fmtPct(p) : "not here / locked"],
                          ["Hardness", `${o.hard} pick power`],
                          ["Ore per swing now", `${perSwing.toFixed(2)}`],
                          ["Hits to dig by hand", `${digHits(s, o)}`],
                          ["Mining XP per swing", F(oreXp(o) * ctx.xp)],
                          ["Shards per swing", F(swingShards(ctx, o))],
                          ["Collection", `tier ${tier}/${COL_AT.length}`, o.color],
                      ]
            }
            notes={[{ text: `Collection pays +${fmtPct(o.col[1])} ${o.colText} per tier (half rate after tier 5)`, color: o.color }, { text: `Found on: ${oreIslands(o.id).map((id) => ISLAND_BY_ID[id]?.name ?? id).slice(0, 5).join(", ")}`, color: "var(--mc-aqua)" }]}
            foot={p > 0 ? undefined : "Travel to an island that has it"}
        />
    );
}

// ---- Ores: collections ----

function Ores({ s, F, go }: { s: Ctx["s"]; F: (n: number) => string; go: () => void }) {
    return (
        <>
            <p className="fi-mn-note">Every ore you mine fills its collection: ten tiers, each paying a permanent bonus for the rest of the game. Finish a whole dimension to earn a set bonus on top. <button type="button" className="fi-lv-btn ghost" onClick={go}>Claim rewards in Milestones</button></p>
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
                        <span style={{ color: o.color }}>+{fmtPct(o.col[1] * colSteps(tier))}</span> {o.colText}
                        {next ? <em> · next tier +{fmtPct(o.col[1] * (tier < 5 ? 1 : 0.5))} at {F(next)}</em> : <em> · complete</em>}
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


// ---- Worlds: the dimensions ----

const GEODE_ROWS = ["Arcane Dust", "Rebirth Tokens", "Free egg", "Shard Vein", "Fracture Fragment", "Gem"];

function Worlds({ s, F }: { s: Ctx["s"]; F: (n: number) => string }) {
    const here = activeIsland(s).dim;
    const openIds = new Set(openIslands(s).map((i) => i.id));
    const lvl = mineLevel(s);
    return (
        <>
            <p className="fi-mn-note">Each dimension has its own ore, its own geodes and its own effect on mining. You cannot change dimension from here: travel from the Islands tab (press I), and the mine follows you.</p>
            {DIMS.map((dm) => {
                const lab = DIM_LABEL[dm];
                const fx = DIM_FX[dm];
                const isls = ISLANDS.filter((i) => i.dim === dm);
                const reach = isls.some((i) => openIds.has(i.id));
                const firstLocked = isls.filter((i) => !openIds.has(i.id) && Number.isFinite(i.at)).sort((a, b) => a.at - b.at)[0];
                const set = dimSet(s, dm);
                const w = GEODE_W[dm];
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

                        <div className="fi-mn-world-s">Loot pool</div>
                        <div className="fi-mn-pool">
                            {DIM_ORES[dm].map((o) => {
                                const odds = oreIslands(o.id).map((id) => {
                                    const t = ISLAND_ORES[id];
                                    const tot = t.reduce((a, [, x]) => a + x, 0);
                                    return (t.find(([k]) => k === o.id)?.[1] ?? 0) / tot;
                                }).filter((x) => x > 0 && isls.some((i) => oreIslands(o.id).includes(i.id)));
                                const lo = Math.min(...odds);
                                const hi = Math.max(...odds);
                                const open = lvl >= o.need;
                                return (
                                    <Tip key={o.id} tip={<OreTip s={s} d={undefined} o={o} p={0} F={F} brief />}>
                                        <div className="fi-mn-prow" data-locked={!open} style={col(o.color)}>
                                            <i className="fi-mn-sw" />
                                            <span className="fi-mn-rn">{open ? o.name : "???"}</span>
                                            <span className="fi-mn-pc">{odds.length ? `${Math.round(lo * 100)}${hi - lo > 0.01 ? `-${Math.round(hi * 100)}` : ""}%` : "-"}</span>
                                            <span className="fi-mn-pn">{o.need ? <><Lock className="inline size-3" /> {o.need}</> : "any"}</span>
                                        </div>
                                    </Tip>
                                );
                            })}
                        </div>

                        <div className="fi-mn-world-s">{GEODES[dm].name}</div>
                        <div className="fi-mn-geo" style={{ ["--oc" as string]: GEODES[dm].color } as CSSProperties}>
                            {GEODE_ROWS.map((n, k) => (
                                <span key={n}>
                                    {n} <b>{Math.round((w[k] / wt) * 100)}%</b>
                                </span>
                            ))}
                        </div>
                        <p className="fi-mn-world-b">Tokens from these geodes x{GEODE_TOKENS[dm]}. {fx.geode > 1 ? `Found ${Math.round((fx.geode - 1) * 100)}% more often here.` : "Found at the normal rate."}</p>

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

const OW_ORES = new Set(DIM_ORES.overworld.map((o) => `o:${o.id}`));
const NE_ORES = new Set(DIM_ORES.nether.map((o) => `o:${o.id}`));
const EN_ORES = new Set(DIM_ORES.end.map((o) => `o:${o.id}`));
const MS_CATS = {
    item: [
        { id: "ow", label: "Overworld ores", test: (l: { key: string }) => OW_ORES.has(l.key) },
        { id: "ne", label: "Nether ores", test: (l: { key: string }) => NE_ORES.has(l.key) },
        { id: "en", label: "End ores", test: (l: { key: string }) => EN_ORES.has(l.key) },
        { id: "ig", label: "Ingots", test: (l: { key: string }) => l.key.startsWith("i:") },
    ],
    action: [],
};

function Milestones({ s, F, render, say }: { s: Ctx["s"]; F: (n: number) => string; render: () => void; say: (m: string) => void }) {
    return (
        <MilestoneBoard
            s={s}
            F={F}
            ladders={LADDERS}
            claimed={s.mine.claimed}
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
void MILESTONES;

export const MINE_CSS = SKILL_KIT_CSS + MINE_TOOL_CSS + FORGE_CSS + `
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
.fi-mn-seg{overflow-x:auto;scrollbar-width:none}
.fi-mn-seg::-webkit-scrollbar{display:none}
.fi-mn-seg button{flex:1 0 auto;min-width:4rem;padding-left:.7rem;padding-right:.7rem;white-space:nowrap}
.fi-mn-dot.feat{background:#ffd23a}
.fi-mn-blob{position:absolute;transform:translate(-50%,-50%);aspect-ratio:1;padding:0;border-radius:36% 64% 52% 48%/48% 40% 60% 52%;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;background:radial-gradient(circle at 32% 30%,#fff9 0 12%,transparent 30%),var(--oc);box-shadow:0 0 14px -2px var(--oc),inset 0 -3px 5px rgba(0,0,0,.35);transition:filter .12s,opacity .3s}
.fi-mn-blob::before{content:"";position:absolute;inset:-.45rem}
.fi-mn-blob::after{content:"";position:absolute;inset:0;border-radius:inherit;opacity:calc(var(--dmg,0) * .95);background:linear-gradient(115deg,transparent 44%,rgba(0,0,0,.7) 46% 49%,transparent 51%),linear-gradient(40deg,transparent 52%,rgba(0,0,0,.6) 54% 57%,transparent 59%),linear-gradient(160deg,transparent 28%,rgba(0,0,0,.55) 30% 33%,transparent 35%);pointer-events:none}
.fi-mn-blob:hover{filter:brightness(1.25)}
.fi-mn-blob:active{filter:brightness(1.5)}
.fi-mn-blob:focus-visible{outline:2px solid #fff;outline-offset:2px}
.fi-mn-blob[data-broken="true"]{opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.3)}
.fi-mn-pickfx{position:absolute;z-index:3;font-size:2.2rem;line-height:1;color:var(--pc);translate:-70% -88%;left:88%;top:18%;transform-origin:78% 92%;filter:drop-shadow(0 2px 0 rgba(0,0,0,.7)) drop-shadow(0 0 10px var(--pc));pointer-events:none;transition:left .13s cubic-bezier(.2,.9,.3,1),top .13s cubic-bezier(.2,.9,.3,1)}
.fi-mn-tip{margin:0;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.fi-mn-tip b{color:#ff9a4d}
.fi-mn-quick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.3rem}
.fi-mn-q{position:relative;padding:.4rem .2rem;border-radius:.6rem;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;color:var(--muted-foreground);transition:transform .1s,background .15s,border-color .15s,color .15s;touch-action:manipulation;white-space:nowrap}
.fi-mn-q[data-on="true"]{border-color:color-mix(in oklch,${C} 65%,transparent);background:color-mix(in oklch,${C} 16%,transparent);color:#fff}
.fi-mn-q[data-on="true"]:hover{background:color-mix(in oklch,${C} 28%,transparent)}
.fi-mn-q:active:not(:disabled){transform:scale(.94)}
.fi-mn-q:disabled{cursor:not-allowed;opacity:.55}
.fi-mn-q i{position:absolute;top:-.3rem;right:-.15rem;display:grid;place-items:center;min-width:.95rem;height:.95rem;padding:0 .2rem;border-radius:999px;background:#ff9a4d;color:#1b1206;font-style:normal;font-family:var(--font-rubik,inherit);font-size:.56rem;font-weight:700;line-height:1}
.fi-mn-q.all{grid-column:1 / -1;border-color:rgba(255,255,255,.14)}
.fi-mn-q.all[data-on="true"]{background:linear-gradient(90deg,color-mix(in oklch,${C} 30%,transparent),color-mix(in oklch,#ffd23a 24%,transparent));color:#fff}
.fi-mn-goal{display:flex;flex-direction:column;gap:.3rem;padding:.55rem .65rem;border-radius:.9rem;border:1px solid color-mix(in oklch,var(--c) 45%,transparent);background:linear-gradient(130deg,color-mix(in oklch,var(--c) 11%,transparent),transparent 70%)}
.fi-mn-goal-h{display:flex;align-items:baseline;flex-wrap:wrap;gap:.2rem .5rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:.12em}
.fi-mn-goal-h b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.88rem;letter-spacing:0;text-transform:none;color:var(--c)}
.fi-mn-goal-h em{font-style:normal;color:#ff9a4d;text-transform:none;letter-spacing:0}
.fi-mn-goal-f{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.fi-mn-goal-w{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-mn-loadout{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.4rem}
.fi-mn-slotr{display:flex;flex-direction:column;gap:.1rem;min-height:3.6rem;padding:.45rem .6rem;border-radius:.8rem;border:1px dashed rgba(255,255,255,.2);text-align:left;font-family:var(--font-rubik,inherit);color:var(--muted-foreground)}
.fi-mn-slotr[data-on]{border:1px solid var(--oc);background:linear-gradient(130deg,color-mix(in oklch,var(--oc) 14%,transparent),transparent 75%);box-shadow:0 0 14px -6px var(--oc);transition:transform .1s}
.fi-mn-slotr[data-on]:active{transform:scale(.97)}
.fi-mn-slotr b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.78rem;color:var(--oc)}
.fi-mn-slotr small{font-size:.62rem;color:#e6e2f0}
.fi-mn-slotr[data-empty]{place-content:center;align-items:center}
.fi-mn-relic[data-off]{opacity:.85;border-style:solid;cursor:pointer;transition:transform .1s}
.fi-mn-relic[data-off]:active{transform:scale(.9)}
button.fi-mn-relic[data-own="true"]{cursor:pointer}
.fi-mn-loop{grid-column:2;grid-row:3;justify-self:end;margin-top:.1rem;padding:.2rem .6rem;border-radius:999px;border:1px solid rgba(255,255,255,.2);font-family:var(--font-rubik,inherit);font-size:.6rem;font-weight:700;color:var(--muted-foreground);touch-action:manipulation}
.fi-mn-loop[data-on="true"]{border-color:var(--oc,#7fd0ff);color:#fff;background:color-mix(in oklch,var(--oc,#7fd0ff) 22%,transparent)}
.fi-mn-world{display:flex;flex-direction:column;gap:.4rem;padding:.7rem .75rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 35%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--c) 9%,transparent),transparent 65%)}
.fi-mn-world[data-here="true"]{border-color:var(--c);box-shadow:0 0 18px -6px var(--c)}
.fi-mn-world[data-locked="true"]{opacity:.7}
.fi-mn-world-h{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem}
.fi-mn-world-h b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:1rem;color:var(--c);text-shadow:0 0 10px color-mix(in oklch,var(--c) 50%,transparent)}
.fi-mn-tag,.fi-mn-here,.fi-mn-lock{padding:.08rem .5rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.6rem;font-weight:700}
.fi-mn-tag{border:1px solid color-mix(in oklch,var(--c) 60%,transparent);color:var(--c)}
.fi-mn-here{background:var(--c);color:#12100c}
.fi-mn-lock{border:1px dashed rgba(255,255,255,.3);color:var(--muted-foreground)}
.fi-mn-world-b{margin:0;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.fi-mn-world-s{margin-top:.2rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--c)}
.fi-mn-fx{display:flex;flex-wrap:wrap;gap:.3rem}
.fi-mn-fx span{padding:.1rem .55rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--mc-green) 45%,transparent);background:color-mix(in oklch,var(--mc-green) 9%,transparent);font-family:var(--font-rubik,inherit);font-size:.64rem;font-weight:600;color:#cfeccf}
.fi-mn-isl{display:flex;flex-wrap:wrap;gap:.3rem}
.fi-mn-isl span{padding:.1rem .55rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--oc) 50%,transparent);font-family:var(--font-rubik,inherit);font-size:.62rem;color:#fff}
.fi-mn-isl span[data-open="false"]{border-style:dashed;color:var(--muted-foreground);border-color:rgba(255,255,255,.2)}
.fi-mn-pool{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.25rem}
.fi-mn-prow{display:grid;grid-template-columns:.8rem minmax(0,1fr) auto auto;align-items:center;gap:.4rem;padding:.2rem .5rem;border-radius:.55rem;border:1px solid color-mix(in oklch,var(--oc) 25%,transparent);background:color-mix(in oklch,var(--oc) 6%,transparent)}
.fi-mn-prow[data-locked="true"]{opacity:.55}
.fi-mn-pn{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);white-space:nowrap}
.fi-mn-geo{display:grid;grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr));gap:.2rem .6rem;font-family:var(--font-rubik,inherit);font-size:.64rem;color:#e6e2f0}
.fi-mn-geo b{color:var(--oc);font-weight:700}
.fi-mn-feat{display:flex;flex-direction:column;gap:.35rem;padding:.55rem .65rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--c) 30%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--c) 7%,transparent),transparent 70%);min-width:0}
.fi-mn-tiers{display:flex;gap:.3rem;flex-wrap:wrap}
.fi-mn-tier{min-width:2.4rem;padding:.25rem .5rem;border-radius:.5rem;border:1px solid rgba(255,255,255,.16);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;color:var(--muted-foreground);transition:transform .1s;touch-action:manipulation}
.fi-mn-tier[data-state="done"]{border-color:var(--c);color:var(--c);background:color-mix(in oklch,var(--c) 14%,transparent)}
.fi-mn-tier[data-state="ready"]{border-color:#ffd23a;background:color-mix(in oklch,#ffd23a 22%,transparent);color:#fff;animation:fi-mn-ready 1.4s ease-in-out infinite}
.fi-mn-tier:active:not(:disabled){transform:scale(.92)}
.fi-mn-tier:disabled{cursor:default}
.fi-mn-sum{gap:.25rem}
@media (max-width:420px){.fi-mn-q{font-size:.6rem}}

@media (max-width:639px){.fi-mn-face{height:10rem}.fi-mn-row{grid-template-columns:.8rem minmax(0,5rem) minmax(0,1fr) 2.3rem 2.6rem 2rem;gap:.3rem}.fi-mn-star{width:2rem;height:2rem}.fi-mn-pickfx{font-size:2rem}}
@media (prefers-reduced-motion:reduce){.fi-mn-face,.fi-mn-pop,.fi-mn-hint,.fi-mn-log li,.fi-mn-crack,.fi-mn-slot{animation:none!important}}
`;

"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { skillLevel, skillXpFor, type State } from "@/lib/fractured-idle/data";
import { CODEX_TOTAL, DUST_BASE, DUST_CLICK, DUST_CRIT, ENCH_BY_ID, PITY_EPIC, PITY_LEGEND, RARITIES, SLOTS, canRoll, codexCount, dustMult, enchLevel, luckOf, rarityColor, rollCost, slotOpen } from "@/lib/fractured-idle/enchant";
import { SKILL_CAP, fmt, fmtTime } from "@/lib/fractured-idle/engine";
import { activeIsland } from "@/lib/fractured-idle/island-logic";
import { allPlots, openDims, readyCount, CROP_BY_ID, DIM_FX as FARM_DIM, FEATS as FARM_FEATS, bumperLen, bumperMult, cropRate, cropTable, farmLevel, goalOf as farmGoal, growSpeed, hasReaper, hoeOf, hoePower, onWater, ovenSlots, plotReady, podCount, relicSlots as farmSlots, totalHands, crewTotal, type WaterOut } from "@/lib/fractured-idle/farm";
import { DIM_FX as MINE_DIM, FEATS as MINE_FEATS, comboFactor, drillSwings, forgeSlots, geodeCount, goalOf as mineGoal, idleSwings, mineLevel, onSwing, oreTable, passiveSwings, pickOf, pickPower, relicSlots as mineSlots, rushLen, rushMult, totalDrills, veinNeed, type SwingOut } from "@/lib/fractured-idle/mine";
import { ORE_BY_ID } from "@/lib/fractured-idle/mine";
import { dockBus } from "./dock-bus";
import { Tip, TipCard, type TipNote } from "./tooltip";
import type { Derived } from "@/lib/fractured-idle/engine";

// The skill dock: three slim bars above the big button, one each for Mining,
// Farming and Enchanting. Each one is a small instrument: a colored meter that
// shows what the next payoff is (the vein toward an Ore Rush, the bloom toward a
// Bumper Crop, the dust toward your next roll), a line that flashes what the last
// click did, a dot that pulses when something needs you, and a big tooltip with
// everything about that skill. Clicking opens the tab.

const FLASH_MS = 1100;
type Flash = { t: number; text: ReactNode; color: string };

interface BarProps {
    k: "mine" | "farm" | "ench";
    color: string;
    icon: McSymbolName;
    title: string;
    lvl: number;
    xp: number; // 0..1 toward the next level
    status: ReactNode;
    statusColor?: string;
    flash: Flash | null;
    pct: number;
    hot: boolean; // meter is in its payoff state (Ore Rush, Bumper Crop, roll ready)
    right?: ReactNode;
    dot: number;
    dotColor: string;
    onRead: () => void;
    tip: () => ReactNode;
    onOpen: () => void;
    aria: string;
}

function Bar({ k, color, icon, title, lvl, xp, status, statusColor, flash, pct, hot, right, dot, dotColor, onRead, tip, onOpen, aria }: BarProps) {
    const live = flash && performance.now() - flash.t < FLASH_MS ? flash : null;
    return (
        <Tip box tip={tip} delay={120}>
            <button type="button" className="fi-dk" data-k={k} data-hot={hot} data-flash={!!live} onClick={onOpen} onPointerEnter={(e) => e.pointerType === "mouse" && onRead()} onFocus={onRead} aria-label={aria} style={{ ["--c" as string]: color } as CSSProperties}>
                <span className="fi-dk-i">
                    <McSymbol name={icon} />
                    {dot > 0 && (
                        <b className="fi-dk-dot" style={{ ["--dc" as string]: dotColor } as CSSProperties}>
                            {dot > 9 ? "9+" : dot}
                        </b>
                    )}
                </span>
                <span className="fi-dk-b">
                    <span className="fi-dk-t">
                        <span className="fi-dk-n">
                            {title} <em>{lvl >= SKILL_CAP ? "MAX" : lvl}</em>
                        </span>
                        {live ? (
                            <span key={live.t} className="fi-dk-fl" style={{ color: live.color }}>
                                {live.text}
                            </span>
                        ) : (
                            <span className="fi-dk-s" style={statusColor ? { color: statusColor } : undefined}>
                                {status}
                            </span>
                        )}
                        {right && <span className="fi-dk-r">{right}</span>}
                    </span>
                    <span className="fi-dk-m" data-hot={hot}>
                        <i style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} />
                    </span>
                    <span className="fi-dk-x">
                        <i style={{ width: `${Math.max(0, Math.min(1, xp)) * 100}%` }} />
                    </span>
                </span>
            </button>
        </Tip>
    );
}

const xpFrac = (xp: number, id?: "foraging" | "enchanting") => {
    const l = skillLevel(xp, id);
    if (l >= SKILL_CAP) return 1;
    const lo = skillXpFor(l, id);
    const hi = skillXpFor(l + 1, id);
    return (xp - lo) / (hi - lo);
};
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const pc = (n: number) => `${+(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

export function SkillDock({ s, d, notes, onOpen }: { s: State; d: Derived; notes: Partial<Record<string, TipNote[]>>; onOpen: (tab: "mine" | "farm" | "enchant") => void }) {
    const flash = useRef<{ mine: Flash | null; farm: Flash | null; ench: Flash | null }>({ mine: null, farm: null, ench: null });
    const lastDust = useRef(0);
    useEffect(() => {
        const a = onSwing((e: SwingOut) => {
            const o = ORE_BY_ID[e.ore];
            flash.current.mine = {
                t: performance.now(),
                text: e.rushStart ? "ORE RUSH!" : e.geode ? "GEODE!" : e.lucky ? `TRIPLE ${o.name}` : `+${e.units >= 10 ? Math.round(e.units) : +e.units.toFixed(1)} ${o.name}`,
                color: e.rushStart ? "#ffd23a" : e.geode ? "#c58bff" : o.color,
            };
        });
        const b = onWater((e: WaterOut) => {
            const c = e.crop ? CROP_BY_ID[e.crop] : null;
            flash.current.farm = {
                t: performance.now(),
                text: e.bumperStart ? "BUMPER CROP!" : e.ready && c ? `${c.name} ripe!` : c ? `Watered ${c.name}` : "Nothing growing",
                color: e.bumperStart ? "#ffd23a" : e.ready && c ? c.color : c ? "#6fb4ff" : "#9a94b0",
            };
        });
        return () => {
            a();
            b();
        };
    }, []);
    // Arcane Dust finds come from the button's mailbox.
    useEffect(() => {
        if (dockBus.dust.t === lastDust.current) return;
        lastDust.current = dockBus.dust.t;
        flash.current.ench = { t: performance.now(), text: `+${+dockBus.dust.n.toFixed(1)} dust`, color: "#d9a8ff" };
    });

    // A dot is read once you hover or focus its bar; it comes back when the count changes.
    const readAt = useRef<Record<string, number>>({});
    const act = (id: string) => (notes[id] ?? []).filter((n) => n.act).reduce((a, n) => a + (n.n ?? 1), 0);
    const dotOf = (k: string, n: number) => {
        if (n === 0) readAt.current[k] = 0;
        return readAt.current[k] === n ? 0 : n;
    };

    // ---------- Mining ----------
    const mlvl = mineLevel(s);
    const rush = s.mine.rush > 0;
    const mDotRaw = act("mine");
    const mDot = dotOf("mine", mDotRaw);
    const mineTip = () => {
        const pp = pickPower(s);
        const isl = activeIsland(s);
        const dfx = MINE_DIM[isl.dim];
        const rows = oreTable(s).filter((r) => r.open).sort((a, b) => b.p - a.p);
        const goal = mineGoal(s);
        const idle = idleSwings(s, d.auto);
        return (
            <TipCard
                title="Mining"
                color="#e0b070"
                tag={`Lv ${mlvl}`}
                lines={[`Every press of the big button is a swing of your ${pickOf(s).name}. Drills and the pocket miner keep swinging when you stop.`]}
                rows={[
                    ["Pick power", `x${pp.toFixed(pp < 10 ? 2 : 1)}`, pickOf(s).color],
                    ["Swing damage now", `x${(pp * comboFactor(s.combo)).toFixed(1)} at combo x${s.combo.toFixed(1)}`],
                    ["Idle swings", `${idle.toFixed(idle < 10 ? 1 : 0)}/s`],
                    ["Drill / auto / passive", `${totalDrills(s) ? "in hand" : "none"} (${drillSwings(s).toFixed(1)}/s) / ${d.auto.toFixed(1)}/s / ${passiveSwings(s).toFixed(2)}/s`],
                    [rush ? "Ore Rush" : "Vein", rush ? `x${rushMult(s).toFixed(1)} ore, ${s.mine.rush} of ${rushLen(s)} swings left` : `${Math.floor(s.mine.vein * 100)}% (${Math.ceil((1 - s.mine.vein) * veinNeed(s))} swings to go)`, "#ffd23a"],
                    ...rows.slice(0, 4).map((r): [string, string, string] => [`${r.ore.name} on ${isl.name}`, pc(r.p), r.ore.color]),
                    [`${dfx.tag} ${isl.dim}`, dfx.lines.join(", ")],
                    ["Geodes waiting", String(geodeCount(s))],
                    ["Forge", `${s.mine.jobs.length}/${forgeSlots(s)} busy`],
                    ["Relics worn", `${s.mine.equipped.length}/${mineSlots(s)}`],
                    ["Milestones claimed", `${s.mine.claimed.length}/${MINE_FEATS.length}`],
                    ...(goal ? ([["Next goal", goal.title, goal.color]] as [string, string, string][]) : []),
                ]}
                notes={notes.mine}
                foot="Click to open the Mine."
            />
        );
    };

    // ---------- Farming ----------
    const flvl = farmLevel(s);
    const bump = s.farm.bumper > 0;
    const ripe = readyCount(s);
    const fDotRaw = act("farm");
    const fDot = dotOf("farm", fDotRaw);
    const farmTip = () => {
        const isl = activeIsland(s);
        const dfx = FARM_DIM[isl.dim];
        const rows = cropTable(s).filter((r) => r.open).sort((a, b) => b.p - a.p);
        const goal = farmGoal(s);
        const growing = allPlots(s).filter((r) => r.pl.c && !plotReady(s, r.pl)).length;
        const speeds = allPlots(s).filter((r) => r.pl.c).map((r) => growSpeed(s, CROP_BY_ID[r.pl.c as keyof typeof CROP_BY_ID]));
        const avg = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 1;
        return (
            <TipCard
                title="Farming"
                color="#9be04a"
                tag={`Lv ${flvl}`}
                lines={["Crops grow on real timers in the Garden, also while you are away. Every press of the big button waters a random plot and fills the Bloom meter."]}
                rows={[
                    ["Hoe", `${hoeOf(s).name} x${hoePower(s).toFixed(hoePower(s) < 10 ? 2 : 1)}`, hoeOf(s).color],
                    ["Plots", `${allPlots(s).length} in ${openDims(s).length} garden${openDims(s).length === 1 ? "" : "s"}: ${ripe} ripe, ${growing} growing, ${allPlots(s).length - ripe - growing} empty`],
                    ["Auto-Reaper", hasReaper(s) ? "on: harvests and replants itself" : "not built: ripe crops wait for you"],
                    ["Growth speed", `x${avg.toFixed(2)} on average`],
                    ["Crops a minute", `${Math.round(cropRate(s) * 60)}`],
                    [bump ? "Bumper Crop" : "Bloom", bump ? `x${bumperMult(s).toFixed(1)} crops, ${s.farm.bumper} of ${bumperLen(s)} harvests left` : `${Math.floor(s.farm.bloom * 100)}% to a Bumper Crop`, "#ffd23a"],
                    ...rows.slice(0, 4).map((r): [string, string, string] => [`${r.crop.name} on ${isl.name}`, pc(r.p), r.crop.color]),
                    [`${dfx.tag} ${isl.dim}`, dfx.lines.join(", ")],
                    ["Crew levels / specialists", `${crewTotal(s)} / ${totalHands(s)}`],
                    ["Seed pods waiting", String(podCount(s))],
                    ["Kitchen", `${s.farm.jobs.length}/${ovenSlots(s)} busy`],
                    ["Scarecrows up", `${s.farm.equipped.length}/${farmSlots(s)}`],
                    ["Milestones claimed", `${s.farm.claimed.length}/${FARM_FEATS.length}`],
                    ...(goal ? ([["Next goal", goal.title, goal.color]] as [string, string, string][]) : []),
                ]}
                notes={notes.farm}
                foot="Click to open the Farm."
            />
        );
    };

    // ---------- Enchanting ----------
    const elvl = enchLevel(s);
    const open = SLOTS.filter((sl) => slotOpen(s, sl.id));
    const cheapest = open.length ? Math.min(...open.map((sl) => rollCost(s, sl.id))) : 0;
    const ready = open.some((sl) => canRoll(s, sl.id).ok);
    const pending = SLOTS.some((sl) => s.enc.pend[sl.id]);
    const dm = dustMult(s);
    const eDotRaw = act("enchant");
    const eDot = dotOf("ench", eDotRaw);
    const enchTip = () => {
        const perSec = DUST_BASE * dm;
        return (
            <TipCard
                title="Enchanting"
                color="var(--mc-light-purple)"
                tag={`Lv ${elvl}`}
                lines={[pending ? "An enchant is waiting for your decision." : ready ? "You have enough Arcane Dust to roll." : "Arcane Dust pays for rolls. It trickles in, drops from clicks and popups, and comes with rebirths."]}
                rows={[
                    ["Arcane Dust", `${fmt(s.enc.dust, s.sci)}`, "#d9a8ff"],
                    ["Dust income", `${perSec.toFixed(2)}/s idle, ${pc(DUST_CLICK)} per click (${pc(DUST_CRIT)} on a crit), x${dm.toFixed(2)} bonus`],
                    ...SLOTS.map((sl): [string, string, string?] => {
                        if (!slotOpen(s, sl.id)) return [sl.name, `locked: Enchanting ${sl.need}`];
                        const e = s.enc.eq[sl.id];
                        const cost = rollCost(s, sl.id);
                        const eta = s.enc.dust >= cost ? "ready" : `${fmtTime((cost - s.enc.dust) / Math.max(1e-9, perSec))} to go`;
                        return [sl.name, `${e ? `${RARITIES[e.r].name} ${ENCH_BY_ID[e.id].name}` : "empty"}, roll ${fmt(cost, s.sci)} (${eta})`, e ? rarityColor(e.r) : undefined];
                    }),
                    ["Luck", `x${luckOf(s).toFixed(2)}`, "var(--mc-green)"],
                    ["Epic pity", `${s.enc.pe}/${PITY_EPIC} rolls`],
                    ["Legendary pity", `${s.enc.pl}/${PITY_LEGEND} rolls`],
                    ["Rolls made", fmt(s.enc.rolls, s.sci)],
                    ["Codex", `${codexCount(s)}/${CODEX_TOTAL} entries`],
                ]}
                notes={notes.enchant}
                foot="Click to open the Enchant table."
            />
        );
    };

    const lastMine = flash.current.mine;
    return (
        <div className="fi-dock" role="group" aria-label="Skills">
            <Bar
                k="mine"
                color="#e0b070"
                icon="pick"
                title="Mining"
                lvl={mlvl}
                xp={xpFrac(s.mining)}
                pct={rush ? s.mine.rush / rushLen(s) : s.mine.vein}
                hot={rush}
                status={rush ? <b>ORE RUSH x{rushMult(s).toFixed(1)} · {s.mine.rush}</b> : lastMine ? <span style={{ color: "var(--muted-foreground)" }}>{Math.floor(s.mine.vein * 100)}% to Ore Rush</span> : "Press to swing"}
                statusColor={rush ? "#ffd23a" : undefined}
                flash={flash.current.mine}
                right={<span className="fi-dk-pw">x{pickPower(s).toFixed(pickPower(s) < 10 ? 1 : 0)}</span>}
                dot={mDot}
                dotColor="#ff9a4d"
                onRead={() => (readAt.current.mine = mDotRaw)}
                tip={mineTip}
                onOpen={() => onOpen("mine")}
                aria={`Mining level ${mlvl}. ${rush ? "Ore Rush!" : `Vein ${Math.floor(s.mine.vein * 100)} percent`}. ${mDot ? `${plural(mDot, "thing")} to check. ` : ""}Open the Mine.`}
            />
            <Bar
                k="farm"
                color="#9be04a"
                icon="fortune"
                title="Farming"
                lvl={flvl}
                xp={xpFrac(s.farming)}
                pct={bump ? s.farm.bumper / bumperLen(s) : s.farm.bloom}
                hot={bump}
                status={bump ? <b>BUMPER x{bumperMult(s).toFixed(1)} · {s.farm.bumper}</b> : ripe > 0 ? <b>{ripe} ripe</b> : `${Math.floor(s.farm.bloom * 100)}% to Bumper`}
                statusColor={bump ? "#ffd23a" : ripe > 0 ? "#9be04a" : undefined}
                flash={flash.current.farm}
                right={<span className="fi-dk-pw">{allPlots(s).length} plots</span>}
                dot={fDot}
                dotColor="#9be04a"
                onRead={() => (readAt.current.farm = fDotRaw)}
                tip={farmTip}
                onOpen={() => onOpen("farm")}
                aria={`Farming level ${flvl}. ${ripe} plots ripe. ${bump ? "Bumper Crop!" : `Bloom ${Math.floor(s.farm.bloom * 100)} percent`}. ${fDot ? `${plural(fDot, "thing")} to check. ` : ""}Open the Farm.`}
            />
            <Bar
                k="ench"
                color="#c58bff"
                icon="pristine"
                title="Enchanting"
                lvl={elvl}
                xp={xpFrac(s.enchanting, "enchanting")}
                pct={cheapest ? s.enc.dust / cheapest : 0}
                hot={ready || pending}
                status={pending ? <b>candidate waiting!</b> : ready ? <b>roll ready</b> : `${Math.round(Math.min(1, cheapest ? s.enc.dust / cheapest : 0) * 100)}% to a roll`}
                statusColor={pending ? "#ffd23a" : ready ? "#c58bff" : undefined}
                flash={flash.current.ench}
                right={
                    <span className="fi-dk-gems">
                        <span className="fi-dk-dust">✧ {fmt(s.enc.dust, s.sci)}</span>
                        {SLOTS.map((sl) => {
                            const e = s.enc.eq[sl.id];
                            const col = e ? rarityColor(e.r) : "rgba(255,255,255,.3)";
                            return (
                                <span key={sl.id} className="fi-dk-gem" style={{ color: col, borderColor: col, opacity: slotOpen(s, sl.id) ? 1 : 0.35, boxShadow: e && e.r >= 3 ? `0 0 7px ${col}` : undefined }}>
                                    <McSymbol name={e ? ENCH_BY_ID[e.id].symbol : sl.symbol} />
                                </span>
                            );
                        })}
                    </span>
                }
                dot={eDot}
                dotColor="#c58bff"
                onRead={() => (readAt.current.ench = eDotRaw)}
                tip={enchTip}
                onOpen={() => onOpen("enchant")}
                aria={`Enchanting level ${elvl}. ${fmt(s.enc.dust, s.sci)} Arcane Dust. ${pending ? "An enchant is waiting." : ready ? "A roll is ready." : ""} Open the Enchant table.`}
            />
        </div>
    );
}

export const DOCK_CSS = `
.fi-dock{display:flex;flex-direction:column;gap:.3rem;width:100%;max-width:22rem;margin:0 auto}
.fi-dk{position:relative;display:flex;align-items:center;gap:.55rem;width:100%;padding:.32rem .6rem .32rem .4rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--c) 38%,transparent);background:linear-gradient(115deg,color-mix(in oklch,var(--c) 12%,transparent),transparent 78%),rgba(0,0,0,.18);text-align:left;overflow:visible;transition:background .15s,border-color .2s,transform .1s,box-shadow .25s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.fi-dk:hover{background:linear-gradient(115deg,color-mix(in oklch,var(--c) 22%,transparent),transparent 82%),rgba(0,0,0,.2);border-color:color-mix(in oklch,var(--c) 65%,transparent)}
.fi-dk:active{transform:scale(.985)}
.fi-dk[data-hot="true"]{border-color:var(--c);box-shadow:0 0 18px -5px var(--c)}
.fi-dk[data-k="mine"][data-hot="true"],.fi-dk[data-k="farm"][data-hot="true"]{border-color:#ffd23a;box-shadow:0 0 18px -4px #ffd23a}
.fi-dk[data-flash="true"]{border-color:color-mix(in oklch,var(--c) 85%,#fff)}
.fi-dk-i{position:relative;display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:.6rem;font-size:1.1rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 30%,transparent)}
.fi-dk[data-hot="true"] .fi-dk-i{animation:fi-dk-bob 1s ease-in-out infinite}
.fi-dk-dot{position:absolute;right:-.4rem;top:-.4rem;min-width:.95rem;height:.95rem;padding:0 .2rem;display:grid;place-items:center;border-radius:999px;font:700 .56rem/1 var(--font-rubik,inherit);color:#120c06;background:var(--dc);box-shadow:0 0 0 2px color-mix(in oklch,var(--background) 90%,#000),0 0 9px var(--dc);animation:fi-dk-ping .5s cubic-bezier(.2,1.8,.4,1)}
.fi-dk-dot::before{content:"";position:absolute;inset:-2px;border-radius:inherit;border:1px solid var(--dc);animation:fi-tab-ring 1.6s ease-out infinite}
.fi-dk-b{display:flex;flex-direction:column;gap:.18rem;flex:1;min-width:0}
.fi-dk-t{display:flex;align-items:baseline;gap:.4rem;min-width:0;white-space:nowrap}
.fi-dk-n{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.72rem;color:var(--c);text-shadow:0 0 10px color-mix(in oklch,var(--c) 45%,transparent)}
.fi-dk-n em{font-style:normal;font-family:var(--font-rubik,inherit);font-weight:700;font-size:.6rem;color:var(--muted-foreground);margin-left:.1rem}
.fi-dk-s,.fi-dk-fl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-dk-s b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.66rem}
.fi-dk-fl{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.68rem;animation:fi-dk-flash .35s cubic-bezier(.2,1.6,.4,1);text-shadow:0 0 8px currentColor}
.fi-dk-r{flex:none;margin-left:auto}
.fi-dk-pw{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.62rem;color:color-mix(in oklch,var(--c) 70%,#fff)}
.fi-dk-m{position:relative;display:block;height:.42rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.5)}
.fi-dk-m i{display:block;height:100%;border-radius:inherit;transition:width .15s linear}
.fi-dk-m::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5}
.fi-dk[data-k="mine"] .fi-dk-m i{background:linear-gradient(90deg,#8a5a26,#e0b070);box-shadow:0 0 8px color-mix(in oklch,#e0b070 55%,transparent)}
.fi-dk[data-k="mine"] .fi-dk-m::after{background:repeating-linear-gradient(115deg,rgba(0,0,0,.35) 0 2px,transparent 2px 7px)}
.fi-dk[data-k="farm"] .fi-dk-m i{background:linear-gradient(90deg,#4a8a22,#9be04a);box-shadow:0 0 8px color-mix(in oklch,#9be04a 55%,transparent)}
.fi-dk[data-k="farm"] .fi-dk-m::after{background:repeating-linear-gradient(90deg,rgba(0,0,0,.3) 0 1px,transparent 1px 6px)}
.fi-dk[data-k="ench"] .fi-dk-m i{background:linear-gradient(90deg,#6a35b0,#c58bff,#f0d8ff);box-shadow:0 0 8px color-mix(in oklch,#c58bff 60%,transparent)}
.fi-dk[data-k="ench"] .fi-dk-m::after{background:radial-gradient(circle,rgba(255,255,255,.5) 0 1px,transparent 1.5px) 0 0/8px 100%}
.fi-dk-m[data-hot="true"] i{animation:fi-dk-glow 1s ease-in-out infinite alternate}
.fi-dk[data-k="mine"] .fi-dk-m[data-hot="true"] i,.fi-dk[data-k="farm"] .fi-dk-m[data-hot="true"] i{background:linear-gradient(90deg,#ffb020,#ffe066);box-shadow:0 0 12px #ffd23a}
.fi-dk[data-k="ench"] .fi-dk-m[data-hot="true"] i{background:linear-gradient(90deg,#c58bff,#7fd0ff,#ff9de0,#c58bff);background-size:200% 100%;animation:fi-slide 1.4s linear infinite}
.fi-dk-x{display:block;height:2px;border-radius:2px;background:rgba(255,255,255,.07);overflow:hidden}
.fi-dk-x i{display:block;height:100%;background:var(--c);opacity:.75}
.fi-dk-gems{display:flex;align-items:center;gap:.25rem}
.fi-dk-dust{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;color:#e2b8ff;margin-right:.1rem}
.fi-dk-gem{display:grid;place-items:center;width:.95rem;height:.95rem;border:1px solid;border-radius:.3rem;font-size:.62rem}
@keyframes fi-dk-flash{0%{transform:translateY(5px) scale(.9);opacity:0}100%{transform:none;opacity:1}}
@keyframes fi-dk-ping{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes fi-dk-bob{50%{transform:translateY(-2px) scale(1.06)}}
@keyframes fi-dk-glow{from{filter:brightness(1)}to{filter:brightness(1.35)}}
@media (max-width:420px){.fi-dk-gems .fi-dk-gem:nth-child(n+4){display:none}.fi-dk{padding:.3rem .5rem .3rem .35rem}}
@media (prefers-reduced-motion:reduce){.fi-dk,.fi-dk-i,.fi-dk-m i,.fi-dk-fl,.fi-dk-dot,.fi-dk-dot::before{animation:none!important;transition:none}}
`;

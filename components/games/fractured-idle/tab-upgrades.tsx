"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Lock, ShoppingCart } from "lucide-react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { MINIONS, UPGRADES, type UpgradeDef } from "@/lib/fractured-idle/data";
import { buyUpgrade, upAvailable, upgradeInfo, upCost } from "@/lib/fractured-idle/engine";
import { AutoBar } from "./prestige-shop";
import { TabBar, type TabItem } from "./tab-bar";
import { Tip, TipCard } from "./tooltip";
import { tint, type Ctx } from "./ui";

// Upgrades. A summary strip (how much you own, what you can afford, the next one to save for), a filter bar built on
// the tab helper, and one colored panel per kind of upgrade. Tiles show the symbol, its level and what it costs; hover
// (or focus, or tap once on touch) opens the Minecraft-style tooltip. Anything maxed moves into Owned. The persistent bar
// at the top holds the auto-buyer switch and Buy all, so both stay in reach while you scroll.

const FX_STUDY = ["xp", "petXp", "dust", "luck", "offline", "tokens"];
const FX_MINE = ["ore", "drill", "forge"];
const FX_FARM = ["crop", "grow", "goldCrop", "sale", "cook"];
interface Group {
    id: string;
    title: string;
    blurb: string;
    color: string;
    symbol: McSymbolName;
    kinds: UpgradeDef["kind"][];
    stats?: string[];
}
const GROUPS: Group[] = [
    { id: "train", title: "Training", blurb: "Auto-clicks, crits, combos and synergy.", color: "var(--mc-red)", symbol: "attackSpeed", kinds: ["auto", "critChance", "critDmg", "synergy", "comboMax", "comboGain", "comboLuck"] },
    { id: "pick", title: "Pickaxes and Drills", blurb: "More shards on every click.", color: "var(--mc-gold)", symbol: "strength", kinds: ["click"] },
    { id: "minion", title: "Minion Upgrades", blurb: "Make every minion earn more.", color: "var(--mc-blue)", symbol: "forge", kinds: ["minion", "mown"] },
    { id: "talis", title: "Talismans", blurb: "Boost everything at once.", color: "var(--mc-green)", symbol: "magicFind", kinds: ["all"] },
    { id: "study", title: "Study and Pets", blurb: "Skill xp, pets, dust and luck.", color: "var(--mc-aqua)", symbol: "wisdom", kinds: ["fx"], stats: FX_STUDY },
    { id: "mine", title: "Mining and the Forge", blurb: "Ore, drills and the forge.", color: "#e8b04a", symbol: "pick", kinds: ["fx"], stats: FX_MINE },
    { id: "farm", title: "Farming and the Market", blurb: "Crops, growth and selling.", color: "#8fdc4a", symbol: "flower", kinds: ["fx"], stats: FX_FARM },
    { id: "event", title: "Events", blurb: "Popups, bobbers and quick time events.", color: "var(--mc-light-purple)", symbol: "bolt", kinds: ["evRate", "evBobber", "evLoot", "evGolden", "evLife", "evPower", "evCurse", "qteSize", "qteTime", "qteReward"] },
];
type View = "all" | "ready" | "owned" | string;
const TABS: TabItem<View>[] = [
    { id: "all", label: "All", symbol: "flag", group: "", color: "#7dffb8", blurb: "Every upgrade, grouped by kind." },
    { id: "ready", label: "Ready", symbol: "bolt", group: "", color: "var(--mc-green)", blurb: "Upgrades you can buy right now." },
    ...GROUPS.map((g): TabItem<View> => ({ id: g.id, label: g.title, symbol: g.symbol, group: "", color: g.color, blurb: g.blurb })),
    { id: "owned", label: "Owned", symbol: "check", group: "", color: "var(--mc-yellow)", blurb: "Everything you have maxed out." },
];

export function UpgradesTab({ s, F, act, render, say, tip }: Ctx) {
    const [picked, setPicked] = useState<string | null>(null);
    const [view, setView] = useState<View>("all");
    const [ping, setPing] = useState(0);
    const pointer = useRef("mouse");
    const costOf = (u: UpgradeDef) => upCost(s, u.id, s.ups[u.id] || 0);
    const isOwned = (u: UpgradeDef) => (s.ups[u.id] || 0) >= u.max;
    const canBuy = (u: UpgradeDef) => !isOwned(u) && upAvailable(s, u) && s.shards >= costOf(u);

    // The tooltip belongs to the game root, so close it if this tab goes away.
    useEffect(() => () => tip.hide(), [tip]);

    // Touch: tapping anywhere but a tile dismisses the selection.
    useEffect(() => {
        if (!picked) return;
        const off = (e: PointerEvent) => {
            if (!(e.target as HTMLElement).closest("[data-fi-tile]")) {
                setPicked(null);
                tip.hide();
            }
        };
        document.addEventListener("pointerdown", off);
        return () => document.removeEventListener("pointerdown", off);
    }, [picked, tip]);

    // What Buy all would do, worked out on a copy of the levels: always the cheapest affordable upgrade next. It is the
    // same rule the button follows, so the number on it is what you get. Refreshed a few times a second at most.
    const planRef = useRef<{ at: number; shards: number; v: ReturnType<typeof makePlan> | null }>({ at: 0, shards: -1, v: null });
    const makePlan = () => {
        let shards = s.shards;
        const lv: Record<string, number> = {};
        const lvl = (u: UpgradeDef) => lv[u.id] ?? (s.ups[u.id] || 0);
        const bought = new Map<string, number>();
        let spent = 0;
        let n = 0;
        for (let guard = 0; guard < 300; guard++) {
            let best: UpgradeDef | null = null;
            let bc = Infinity;
            for (const u of UPGRADES) {
                if (lvl(u) >= u.max || !upAvailable(s, u)) continue;
                const c = upCost(s, u.id, lvl(u));
                if (c <= shards && c < bc) {
                    best = u;
                    bc = c;
                }
            }
            if (!best) break;
            shards -= bc;
            spent += bc;
            lv[best.id] = lvl(best) + 1;
            bought.set(best.id, (bought.get(best.id) ?? 0) + 1);
            n++;
        }
        return { n, spent, bought };
    };
    const now = Date.now();
    if (!planRef.current.v || now - planRef.current.at > 400 || planRef.current.shards > s.shards) planRef.current = { at: now, shards: s.shards, v: makePlan() };
    const plan = planRef.current.v!;

    const buyAll = () => {
        let bought = 0;
        let spent = 0;
        act(() => {
            for (let guard = 0; guard < 300; guard++) {
                let best: UpgradeDef | null = null;
                let bc = Infinity;
                for (const u of UPGRADES) {
                    if (isOwned(u) || !upAvailable(s, u)) continue;
                    const c = costOf(u);
                    if (c <= s.shards && c < bc) {
                        best = u;
                        bc = c;
                    }
                }
                if (!best) break;
                const before = s.shards;
                if (!buyUpgrade(s, best.id)) break;
                spent += before - s.shards;
                bought++;
            }
            return bought > 0;
        }, "bulk");
        planRef.current.v = null;
        if (bought) {
            setPing((p) => p + 1);
            say(`Bought ${bought} upgrade level${bought === 1 ? "" : "s"} for ${F(spent)} shards.`);
        } else say("Nothing affordable yet.");
        render();
    };

    const tile = (u: UpgradeDef, color: string) => {
        const lvl = s.ups[u.id] || 0;
        const maxed = lvl >= u.max;
        const avail = upAvailable(s, u);
        const cost = costOf(u);
        const can = !maxed && avail && s.shards >= cost;
        return (
            <button
                key={u.id}
                type="button"
                data-fi-tile
                data-can={can}
                data-max={maxed}
                data-picked={picked === u.id}
                aria-label={`${u.name}${maxed ? ", owned" : `, ${F(cost)} shards`}`}
                onPointerDown={(e) => { pointer.current = e.pointerType; }}
                onPointerEnter={(e) => e.pointerType === "mouse" && tip.show(u.id, e)}
                onPointerMove={(e) => e.pointerType === "mouse" && tip.move(e)}
                onPointerLeave={(e) => e.pointerType === "mouse" && tip.hide()}
                onFocus={(e) => e.currentTarget.matches(":focus-visible") && tip.show(u.id, e.currentTarget)}
                onBlur={() => tip.hide()}
                onClick={(e) => {
                    if (pointer.current === "touch" && picked !== u.id) {
                        setPicked(u.id);
                        return tip.show(u.id, e.currentTarget);
                    }
                    act(() => buyUpgrade(s, u.id));
                }}
                style={{ ["--c" as string]: u.color, ["--g" as string]: color }}
                className={`up-tile ${can ? "fi-afford" : ""}`}
            >
                <span className="up-ic"><McSymbol name={u.symbol} /></span>
                {u.max > 1 && (
                    <span className="up-pips" aria-hidden="true">
                        {u.max <= 10 ? Array.from({ length: u.max }, (_, k) => <i key={k} data-on={k < lvl} />) : <b>{lvl}/{u.max}</b>}
                    </span>
                )}
                <span className="up-cost" data-can={can}>
                    {maxed ? <Check className="size-3" /> : !avail ? <Lock className="size-3" /> : F(cost)}
                </span>
            </button>
        );
    };

    const owned = UPGRADES.filter(isOwned).sort((a, b) => a.cost - b.cost);
    const listFor = (g: Group) =>
        UPGRADES.filter((u) => g.kinds.includes(u.kind) && (!g.stats || g.stats.includes(u.stat ?? "")) && !isOwned(u) && (u.minion === undefined || s.minions[u.minion] > 0)).sort((a, b) => a.cost - b.cost);
    const ready = UPGRADES.filter(canBuy).length;
    const shown = (g: Group) => {
        const l = listFor(g);
        return view === "ready" ? l.filter(canBuy) : l;
    };
    const total = UPGRADES.length;
    const next = UPGRADES.filter((u) => !isOwned(u) && upAvailable(s, u) && s.shards < costOf(u)).sort((a, b) => costOf(a) - costOf(b))[0];

    const groups = view === "owned" ? [] : GROUPS.filter((g) => view === "all" || view === "ready" || view === g.id).map((g) => ({ g, list: shown(g) })).filter((x) => x.list.length > 0);
    const showOwned = (view === "all" || view === "owned") && owned.length > 0;

    return (
        <div className="up">
            <AutoBar s={s} act={act} only={["up"]} sticky>
                <Tip
                    box
                    tip={
                        <TipCard
                            title="Buy all"
                            color="var(--mc-green)"
                            tag={plan.n > 0 ? `${plan.n} level${plan.n === 1 ? "" : "s"}` : "nothing yet"}
                            lines={["Buys the cheapest upgrade you can afford, again and again, until the shards run out."]}
                            rows={[...[...plan.bought.entries()].slice(0, 6).map(([id, n]): [string, string, string?] => [UPGRADES.find((u) => u.id === id)!.name, `x${n}`]), ...(plan.n > 0 ? [["Total cost", `${F(plan.spent)} shards`, "var(--mc-yellow)"] as [string, string, string]] : [])]}
                            cta={plan.n > 0 ? "Click to buy!" : undefined}
                        />
                    }
                >
                    <button key={ping} type="button" className="up-buy" data-ready={plan.n > 0} data-ping={ping > 0} disabled={plan.n === 0} onClick={buyAll} aria-label={plan.n > 0 ? `Buy all: ${plan.n} upgrade levels for ${F(plan.spent)} shards` : "Buy all: nothing affordable yet"}>
                        <ShoppingCart className="size-3.5" />
                        <span className="up-buy-t">Buy all</span>
                        {plan.n > 0 && <b className="up-buy-n">{plan.n}</b>}
                    </button>
                </Tip>
            </AutoBar>

            <div className="up-sum">
                <div className="up-sum-c" style={{ ["--k" as string]: "var(--mc-yellow)" }}>
                    <small>Owned</small>
                    <b>{owned.length} / {total}</b>
                    <span className="up-meter"><i style={{ width: `${(owned.length / Math.max(1, total)) * 100}%` }} /></span>
                </div>
                <div className="up-sum-c" style={{ ["--k" as string]: "var(--mc-green)" }}>
                    <small>Affordable</small>
                    <b>{ready}</b>
                    <span className="up-sum-s">{ready > 0 ? "glowing now" : "none yet"}</span>
                </div>
                <div className="up-sum-c wide" style={{ ["--k" as string]: next?.color ?? "var(--mc-aqua)" }}>
                    <small>Save for next</small>
                    {next ? (
                        <>
                            <b className="up-next"><McSymbol name={next.symbol} /> {next.name}</b>
                            <span className="up-meter"><i style={{ width: `${Math.min(100, (s.shards / Math.max(1, costOf(next))) * 100)}%` }} /></span>
                            <span className="up-sum-s">{F(Math.max(0, costOf(next) - s.shards))} more of {F(costOf(next))}</span>
                        </>
                    ) : (
                        <b>Nothing left to save for</b>
                    )}
                </div>
            </div>

            <TabBar
                tabs={TABS}
                current={view}
                label="Upgrade filters"
                labels="active"
                keys={false}
                onSelect={setView}
                notes={{ ready: ready > 0 ? [{ text: `${ready} you can buy now`, color: "var(--mc-green)", act: true, n: ready }] : [] }}
            />
            <p className="up-hint">Hover an upgrade for details. Glowing tiles are affordable; the number is the price.</p>

            {groups.map(({ g, list }) => {
                const aff = list.filter(canBuy).length;
                return (
                    <section key={g.id} className="up-g" style={{ ["--g" as string]: g.color }}>
                        <header className="up-gh">
                            <span className="up-gi"><McSymbol name={g.symbol} /></span>
                            <span className="up-gt">
                                <b>{g.title}</b>
                                <small>{g.blurb}</small>
                            </span>
                            <span className="up-gc">{list.length}{aff > 0 && <em>{aff} ready</em>}</span>
                        </header>
                        <div className="up-grid">{list.map((u) => tile(u, g.color))}</div>
                    </section>
                );
            })}

            {showOwned && (
                <section className="up-g" style={{ ["--g" as string]: "var(--mc-yellow)" }}>
                    <header className="up-gh">
                        <span className="up-gi"><McSymbol name="check" /></span>
                        <span className="up-gt">
                            <b>Owned</b>
                            <small>Upgrades you have maxed out.</small>
                        </span>
                        <span className="up-gc">{owned.length}</span>
                    </header>
                    <div className="up-grid">{owned.map((u) => tile(u, "var(--mc-yellow)"))}</div>
                </section>
            )}

            {groups.length === 0 && !showOwned && (
                <p className="up-hint" style={{ textAlign: "center", padding: "1rem 0" }}>
                    {view === "ready" ? "Nothing is affordable right now. Earn some shards and check back." : "Nothing here yet."}
                </p>
            )}
        </div>
    );
}

export const UPG_CSS = `
.up{display:flex;flex-direction:column;gap:.6rem;min-width:0}
.up-buy{--c:var(--mc-green);position:relative;display:inline-flex;align-items:center;gap:.4rem;height:1.9rem;padding:0 .75rem;border-radius:.7rem;overflow:hidden;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:#111;border:1px solid color-mix(in oklch,var(--c) 70%,#fff);background:linear-gradient(135deg,var(--c),color-mix(in oklch,var(--c) 55%,#ffd23a));box-shadow:0 0 16px -4px var(--c);transition:transform .12s,filter .15s,box-shadow .2s;touch-action:manipulation;outline:none;white-space:nowrap}
.up-buy::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);background-size:250% 100%;background-position:150% 0;animation:up-sheen 2.8s ease-in-out infinite;pointer-events:none}
.up-buy:hover:not(:disabled){filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 6px 18px -6px var(--c)}
.up-buy:active:not(:disabled){transform:scale(.94)}
.up-buy:focus-visible{outline:2px solid #fff;outline-offset:2px}
.up-buy:disabled{cursor:not-allowed;color:var(--muted-foreground);background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);box-shadow:none}
.up-buy:disabled::after{display:none}
.up-buy[data-ping="true"]:not(:disabled){animation:up-ping .5s cubic-bezier(.2,1.6,.4,1)}
.up-buy-n{display:grid;place-items:center;min-width:1.15rem;height:1.15rem;padding:0 .3rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-size:.6rem;font-weight:700;color:var(--c);background:#111}
.up-sum{display:grid;gap:.4rem;grid-template-columns:repeat(2,minmax(0,1fr))}
.up-sum-c{--k:#fff;display:flex;flex-direction:column;gap:.15rem;min-width:0;padding:.45rem .65rem;border-radius:.9rem;border:1px solid color-mix(in oklch,var(--k) 30%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--k) 10%,rgba(10,8,22,.6)),rgba(8,6,18,.6))}
.up-sum-c.wide{grid-column:1/-1}
.up-sum-c small{font-family:var(--font-rubik,inherit);font-size:.52rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.up-sum-c b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.86rem;color:var(--k);text-shadow:0 0 12px color-mix(in oklch,var(--k) 40%,transparent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.up-next{display:flex;align-items:center;gap:.4rem}
.up-sum-s{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.up-meter{display:block;height:.28rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.up-meter i{display:block;height:100%;border-radius:inherit;background:var(--k);box-shadow:0 0 6px var(--k);transition:width .3s}
@media (min-width:520px){.up-sum{grid-template-columns:1fr 1fr 2fr}.up-sum-c.wide{grid-column:auto}}
.up .fi-tabs{padding:.1rem 0}
.up-hint{margin:0;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.up-g{--g:#fff;border-radius:1.05rem;border:1px solid color-mix(in oklch,var(--g) 30%,transparent);background:linear-gradient(180deg,color-mix(in oklch,var(--g) 8%,rgba(10,8,22,.55)),rgba(8,6,18,.55));overflow:hidden}
.up-gh{display:flex;align-items:center;gap:.6rem;padding:.55rem .7rem;border-bottom:1px solid color-mix(in oklch,var(--g) 18%,transparent);background:linear-gradient(90deg,color-mix(in oklch,var(--g) 16%,transparent),transparent 70%)}
.up-gi{display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:.6rem;font-size:1.05rem;color:var(--g);background:color-mix(in oklch,var(--g) 18%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--g) 45%,transparent),0 0 14px -5px var(--g)}
.up-gt{display:flex;flex-direction:column;min-width:0;flex:1}
.up-gt b{font-family:var(--font-minecraft,inherit);font-size:.76rem;font-weight:700;color:color-mix(in oklch,var(--g) 75%,#fff)}
.up-gt small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.up-gc{display:inline-flex;align-items:center;gap:.4rem;font-family:var(--font-minecraft,inherit);font-size:.7rem;color:var(--g)}
.up-gc em{font-style:normal;padding:.02rem .45rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.56rem;color:#111;background:var(--mc-green)}
.up-grid{display:grid;gap:.4rem;padding:.55rem;grid-template-columns:repeat(auto-fill,minmax(4.1rem,1fr))}
.up-tile{--c:#fff;--g:#fff;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.15rem;min-width:0;padding:.45rem .2rem .35rem;border-radius:.8rem;color:var(--c);border:1px solid color-mix(in oklch,var(--c) 22%,rgba(255,255,255,.06));background:linear-gradient(180deg,color-mix(in oklch,var(--c) 7%,rgba(12,9,26,.7)),rgba(8,6,18,.75));opacity:.62;transition:transform .14s cubic-bezier(.2,1.5,.4,1),opacity .15s,border-color .15s,box-shadow .2s,background .15s;touch-action:manipulation;outline:none}
.up-tile:hover{opacity:1;transform:translateY(-2px);border-color:color-mix(in oklch,var(--c) 70%,transparent)}
.up-tile[data-can="true"]{opacity:1;border-color:var(--c);background:linear-gradient(180deg,color-mix(in oklch,var(--c) 20%,rgba(12,9,26,.6)),color-mix(in oklch,var(--c) 6%,rgba(8,6,18,.7)))}
.up-tile[data-max="true"]{opacity:1;border-color:color-mix(in oklch,var(--mc-yellow) 55%,transparent)}
.up-tile[data-picked="true"]{box-shadow:0 0 0 2px rgba(255,255,255,.5)}
.up-tile:active{transform:scale(.94)}
.up-tile:focus-visible{outline:2px solid #fff;outline-offset:2px}
.up-ic{font-size:1.7rem;line-height:1;filter:drop-shadow(0 0 8px color-mix(in oklch,var(--c) 45%,transparent))}
.up-pips{display:flex;gap:2px;height:.3rem;align-items:center}
.up-pips i{width:.3rem;height:.3rem;border-radius:50%;background:rgba(255,255,255,.18)}
.up-pips i[data-on="true"]{background:var(--c);box-shadow:0 0 5px var(--c)}
.up-pips b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.52rem;line-height:.6rem;color:#fff}
.up-cost{display:flex;align-items:center;justify-content:center;max-width:100%;overflow:hidden;font-family:var(--font-minecraft,inherit);font-size:.58rem;line-height:1;color:var(--muted-foreground);white-space:nowrap}
.up-cost[data-can="true"]{color:var(--mc-green)}
.up-tile[data-max="true"] .up-cost{color:var(--mc-yellow)}
@keyframes up-sheen{0%{background-position:150% 0}55%,100%{background-position:-50% 0}}
@keyframes up-ping{0%{transform:scale(.9)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.up-buy,.up-buy::after,.up-tile{animation:none!important;transition:none}}
`;

const GRAY = "#aaaaaa";
const DARK = "#777777";

function TL({ c = GRAY, children }: { c?: string; children?: React.ReactNode }) {
    return <div className="tl" style={{ color: c, minHeight: children ? undefined : "0.7em" }}>{children}</div>;
}

/** Minecraft-style tooltip body for one upgrade (rendered by the game root). */
export function UpgradeTip({ id, s, d, F }: { id: string } & Pick<Ctx, "s" | "d" | "F">) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return null;
    const lvl = s.ups[u.id] || 0;
    const maxed = lvl >= u.max;
    const cost = upCost(s, u.id, lvl);
    const can = s.shards >= cost;
    const avail = upAvailable(s, u);
    const info = upgradeInfo(d, u, s.sci, lvl);
    return (
        <>
            <TL c={u.color}>
                <McSymbol name={u.symbol} /> {u.name}
                {u.max > 1 && <span style={{ color: DARK }}> Lv {lvl}/{u.max}</span>}
            </TL>
            {u.minion !== undefined && <TL c={DARK}>{MINIONS[u.minion].name} upgrade</TL>}
            <TL />
            <TL>{u.desc}</TL>
            <TL />
            <TL>
                {info.label}: <span style={{ color: "#ffffff" }}>{info.cur}</span>
                {!maxed && (
                    <>
                        <span style={{ color: DARK }}> <McSymbol name="arrow" /> </span>
                        <span style={{ color: "#55ff55" }}>{info.next}</span>
                    </>
                )}
            </TL>
            <TL />
            {maxed ? (
                <TL c="#55ff55"><McSymbol name="check" /> Owned</TL>
            ) : (
                <>
                    <TL c="#ffaa00">Cost: <span style={{ color: can ? "#55ff55" : "#ff5555" }}>{F(cost)}</span> shards</TL>
                    {!avail ? (
                        <TL c="#ff5555">Requires {u.req} {MINIONS[u.minion!].name}s (you have {s.minions[u.minion!]})</TL>
                    ) : can ? (
                        <TL c="#ffff55">Click to purchase!</TL>
                    ) : (
                        <TL c="#ff5555">Need {F(cost - s.shards)} more</TL>
                    )}
                </>
            )}
        </>
    );
}

"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { fmt, fmtTime } from "@/lib/fractured-idle/engine";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { msId, tierOf, type Ladder, type MsReward } from "@/lib/fractured-idle/milestones";
import { GRANT_LABEL } from "@/lib/fractured-idle/skills";
import type { State } from "@/lib/fractured-idle/data";
import { TabBar, type TabItem } from "./tab-bar";
import { Tip, TipCard } from "./tooltip";

const MS_TABS: TabItem<"item" | "action">[] = [
    { id: "item", label: "Item milestones", symbol: "pristine", group: "", color: "#ffd23a", blurb: "Tiers for every item you collect." },
    { id: "action", label: "Action milestones", symbol: "bolt", group: "", color: "#57d8ff", blurb: "Tiers for the things you do." },
];

// The pieces the Mine and the Farm share: item icon tiles, a grid craft board (Forge and Kitchen),
// furnace / oven slots and the Milestones board. Everything is a grid of tiles with an icon, so a
// player can tell at a glance what they have, what they can make and what is missing.

const css = (o: Record<string, string | number>) => o as CSSProperties;

// ---- Icons ----

export function ItemIcon({ icon, color, n, size = "md", dim, ench }: { icon: McSymbolName; color: string; n?: number | string; size?: "sm" | "md" | "lg"; dim?: boolean; ench?: boolean }) {
    return (
        <span className="fi-ik" data-size={size} data-dim={!!dim} data-ench={!!ench} style={css({ "--k": color })}>
            <span className="g"><McSymbol name={icon} /></span>
            {n !== undefined && <b>{n}</b>}
        </span>
    );
}

const GOOD_ICON: Record<string, McSymbolName> = { flour: "spark6", stew: "ring", jam: "heartS", cake: "crown", pie: "sun", feast: "king", emberTart: "heat", voidTea: "atom", starCake: "star" };
const INGOT_ICON: Record<string, McSymbolName> = { copperIngot: "triangle", ironIngot: "triangle", goldIngot: "triangle", steel: "cog", cutDiamond: "gem", netherAlloy: "heat", netherIngot: "hex", voidAlloy: "atom", fracCore: "comet" };
const ITEM_ICON: Record<string, McSymbolName> = { dynamite: "bolt", rushPotion: "flask", geodeCache: "gem", fertilizer: "flower", tonic: "flask", basket: "gem" };
export const iconOf = (id: string, fallback: McSymbolName = "square"): McSymbolName => GOOD_ICON[id] ?? INGOT_ICON[id] ?? ITEM_ICON[id] ?? fallback;

// ---- A small amount chip: icon, "have / need" and a name ----

export interface Need {
    id: string;
    name: string;
    color: string;
    icon: McSymbolName;
    have: number;
    need: number;
}
const short = (n: number) => {
    if (n < 100) return String(+n.toFixed(n < 10 ? 1 : 0));
    if (n < 1e4) return String(Math.floor(n));
    return fmt(n);
};

export function NeedTile({ n }: { n: Need }) {
    const ok = n.have >= n.need;
    return (
        <span className="fi-nt" data-ok={ok} title={`${n.name}: you have ${short(n.have)}, it needs ${short(n.need)}`} style={css({ "--k": n.color })}>
            <ItemIcon icon={n.icon} color={n.color} size="sm" />
            <span className="t">
                <b>{short(n.need)}</b>
                <em>{n.name}</em>
            </span>
            <i>{short(n.have)}</i>
        </span>
    );
}

// ---- The craft board ----

export interface CraftItem {
    id: string;
    name: string;
    desc: string;
    color: string;
    icon: McSymbolName;
    group: string;
    tag?: string;
    lock?: string; // why it is not open yet ("Mining 12")
    owned?: boolean; // a one-off you already have
    stock?: number; // how many you hold, shown on the tile
    inputs: Need[];
    time: number; // seconds for one, already sped up
    once?: boolean;
    maxBatch: number;
    blocked?: string; // why it cannot start right now ("Furnaces busy")
    usedIn?: string[];
    note?: string;
    far?: boolean; // locked and a long way off: hidden until you are closer
}

export type CraftState = "ready" | "missing" | "locked" | "owned";
export const stateOf = (it: CraftItem): CraftState => (it.owned ? "owned" : it.lock ? "locked" : it.inputs.every((i) => i.have >= i.need) && !it.blocked ? "ready" : "missing");

export function CraftBoard({ items, groups, color, verb, onCraft }: { items: CraftItem[]; groups: { id: string; label: string }[]; color: string; verb: string; onCraft: (id: string, n: number) => void }) {
    const [group, setGroup] = useState("all");
    const [sel, setSel] = useState<string>("");
    const [batch, setBatch] = useState<number>(1);
    const shown = useMemo(() => items.filter((i) => (group === "all" || i.group === group) && !i.far), [items, group]);
    const hidden = items.filter((i) => (group === "all" || i.group === group) && i.far).length;
    const cur = items.find((i) => i.id === sel) ?? shown.find((i) => stateOf(i) === "ready") ?? shown[0];
    const st = cur ? stateOf(cur) : "locked";
    const readyN = (id: string) => items.filter((i) => i.group === id && stateOf(i) === "ready").length;
    const n = cur ? (cur.once ? 1 : Math.max(1, Math.min(batch, cur.maxBatch))) : 1;
    return (
        <div className="fi-cb" style={css({ "--k": color })}>
            <div className="fi-cb-groups" role="tablist">
                <button type="button" data-on={group === "all"} onClick={() => setGroup("all")}>All</button>
                {groups.map((g) => (
                    <button key={g.id} type="button" data-on={group === g.id} onClick={() => setGroup(g.id)}>
                        {g.label}
                        {readyN(g.id) > 0 && <i>{readyN(g.id)}</i>}
                    </button>
                ))}
            </div>
            <div className="fi-cb-grid">
                {shown.map((it) => {
                    const state = stateOf(it);
                    return (
                        <button key={it.id} type="button" className="fi-cb-tile" data-s={state} data-on={cur?.id === it.id} onClick={() => setSel(it.id)} aria-label={`${it.name}: ${state}`} title={it.name}>
                            <ItemIcon icon={it.icon} color={it.color} n={it.stock ? short(it.stock) : undefined} dim={state === "locked"} />
                            <span className="nm">{state === "locked" ? "???" : it.name}</span>
                            <span className="st">{state === "owned" ? "Made" : state === "locked" ? <><Lock className="inline size-2.5" /> {it.lock}</> : state === "ready" ? "Ready" : "Missing"}</span>
                        </button>
                    );
                })}
            </div>
            {hidden > 0 && <p className="fi-sk-hint">{hidden} more recipe{hidden === 1 ? "" : "s"} unlock{hidden === 1 ? "s" : ""} at much higher levels.</p>}
            {cur && (
                <div className="fi-cb-detail" data-s={st}>
                    <div className="fi-cb-dh">
                        <ItemIcon icon={cur.icon} color={cur.color} size="lg" dim={st === "locked"} />
                        <div className="fi-cb-dt">
                            <b style={{ color: cur.color }}>{cur.name}</b>
                            <span>{cur.tag ? `${cur.tag} · ` : ""}{cur.desc}</span>
                            {cur.note && <em>{cur.note}</em>}
                        </div>
                        <div className="fi-cb-tm">
                            <small>{cur.once ? "Takes" : n > 1 ? `${n} take` : "Takes"}</small>
                            <b>{fmtTime(cur.time * (cur.once ? 1 : n))}</b>
                        </div>
                    </div>
                    {st === "locked" ? (
                        <p className="fi-cb-lock"><Lock className="mr-1 inline size-3" />Opens at {cur.lock}</p>
                    ) : (
                        <>
                            <div className="fi-cb-needs">
                                {cur.inputs.map((i) => (
                                    <NeedTile key={i.id} n={{ ...i, need: i.need * n }} />
                                ))}
                                {cur.inputs.length === 0 && <span className="fi-cb-free">Free</span>}
                            </div>
                            {cur.usedIn && cur.usedIn.length > 0 && <p className="fi-cb-used">Used in: {cur.usedIn.slice(0, 6).join(", ")}{cur.usedIn.length > 6 ? ` and ${cur.usedIn.length - 6} more` : ""}</p>}
                            <div className="fi-cb-act">
                                {!cur.once && (
                                    <span className="fi-cb-batch">
                                        {[1, 5, 10, 0].map((b) => {
                                            const val = b === 0 ? cur.maxBatch : b;
                                            const on = b === 0 ? batch >= cur.maxBatch && cur.maxBatch > 1 : batch === b;
                                            return (
                                                <button key={b} type="button" data-on={on} disabled={b !== 0 && b > cur.maxBatch} onClick={() => setBatch(val)}>
                                                    {b === 0 ? "Max" : `x${b}`}
                                                </button>
                                            );
                                        })}
                                    </span>
                                )}
                                <button type="button" className="fi-cb-go" data-snd="off" disabled={st !== "ready"} onClick={() => onCraft(cur.id, n)}>
                                    {st === "owned" ? "Already made" : st === "ready" ? `${verb}${n > 1 ? ` x${n}` : ""}` : cur.blocked ?? "Missing materials"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ---- Furnace / oven slots ----

export interface SlotView {
    slot: number;
    job?: { i: number; name: string; color: string; icon: McSymbolName; n: number; left: number; total: number; loop?: boolean };
}
export function Slots({ slots, color, noun, loopOk, onCollect, onLoop }: { slots: SlotView[]; color: string; noun: string; loopOk: boolean; onCollect: (i: number) => void; onLoop: (slot: number) => void }) {
    return (
        <div className="fi-sl" style={css({ "--k": color })}>
            {slots.map((sl) => {
                const j = sl.job;
                const ready = !!j && j.left <= 0;
                return (
                    <div key={sl.slot} className="fi-sl-c" data-s={!j ? "free" : ready ? "ready" : "busy"} style={j ? css({ "--k": j.color }) : undefined}>
                        {j ? (
                            <>
                                <ItemIcon icon={j.icon} color={j.color} n={j.n > 1 ? `x${j.n}` : undefined} />
                                <span className="tx">
                                    <b>{j.name}</b>
                                    <span className="bar"><i style={{ width: `${Math.min(100, (1 - j.left / Math.max(1, j.total)) * 100)}%` }} /></span>
                                    <em>{ready ? "Done!" : fmtTime(j.left)}</em>
                                </span>
                                {ready ? (
                                    <button type="button" className="fi-sl-b" data-snd="off" onClick={() => onCollect(j.i)}>Collect</button>
                                ) : (
                                    loopOk && <button type="button" className="fi-sl-l" data-on={!!j.loop} onClick={() => onLoop(sl.slot)} title="Repeat this craft">↻</button>
                                )}
                            </>
                        ) : (
                            <span className="empty">{noun} {sl.slot + 1} is free<small>Pick something below</small></span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ---- Milestones ----

export const rewardLine = (r: MsReward) => (r.stat ? fmtStat(r.stat[0], r.stat[1]) : r.grant ? `+${r.grant[1]} ${GRANT_LABEL[r.grant[0]]}${r.grant[0] === "ap" && r.grant[1] > 1 ? "s" : ""}` : "");

interface MsCat {
    id: string;
    label: string;
    test: (l: Ladder) => boolean;
}
export function MilestoneBoard({ s, F, ladders, claimed, color, cats, onClaim, onAll }: { s: State; F: (n: number) => string; ladders: Ladder[]; claimed: string[]; color: string; cats: { item: MsCat[]; action: MsCat[] }; onClaim: (id: string) => void; onAll: () => void }) {
    const [group, setGroup] = useState<"item" | "action">("item");
    const [cat, setCat] = useState("all");
    const [sel, setSel] = useState("");
    const info = (l: Ladder) => {
        const v = l.metric(s);
        const tier = tierOf(l, s);
        const ready = l.at.map((at, i) => ({ at, i })).filter(({ at, i }) => v >= at && (l.rewards[i]?.length ?? 0) > 0 && !claimed.includes(msId(l, i)));
        return { v, tier, ready, next: l.at[tier] };
    };
    const inGroup = ladders.filter((l) => l.group === group && (cat === "all" || cats[group].find((c) => c.id === cat)?.test(l)));
    const totalReady = (g: "item" | "action") => ladders.filter((l) => l.group === g).reduce((a, l) => a + info(l).ready.length, 0);
    const list = inGroup.slice().sort((a, b) => info(b).ready.length - info(a).ready.length);
    const cur = sel ? ladders.find((l) => l.key === sel) : undefined;
    const ci = cur ? info(cur) : null;
    const all = totalReady("item") + totalReady("action");
    const back = () => { setSel(""); };
    if (cur && ci) {
        const nextAt = cur.at[ci.tier];
        const prevAt = cur.at[ci.tier - 1] ?? 0;
        const done = ci.tier >= cur.at.length;
        const pct = done ? 100 : Math.min(100, Math.max(0, ((ci.v - prevAt) / (nextAt - prevAt)) * 100));
        const claimable = ci.ready.length;
        return (
            <div className="fi-ms fi-ms-page" key={cur.key} style={css({ "--k": cur.color })}>
                <div className="fi-ms-bar">
                    <button type="button" className="fi-ms-back" onClick={back} aria-label="Back to milestones"><span className="ar">←</span> Back</button>
                    <span className="fi-ms-crumb">{cur.group === "item" ? "Item milestones" : "Action milestones"}</span>
                    {claimable > 0 && (
                        <button type="button" className="fi-cb-go slim" data-snd="off" onClick={() => ci.ready.forEach(({ i }) => onClaim(msId(cur, i)))}>Claim {claimable}</button>
                    )}
                </div>
                <div className="fi-ms-hero">
                    <ItemIcon icon={cur.icon} color={cur.color} size="lg" />
                    <div className="tx">
                        <b>{cur.name}</b>
                        <span>{F(Math.floor(ci.v))} {cur.unit}</span>
                        {cur.note && <em>{cur.note}</em>}
                    </div>
                    <div className="tier"><small>Tier</small><b>{ci.tier}<i>/{cur.at.length}</i></b></div>
                </div>
                <div className="fi-ms-prog">
                    <span className="bar"><i style={{ width: `${pct}%` }} /></span>
                    <em>{done ? "Every tier reached" : `${F(Math.floor(ci.v))} / ${F(nextAt)} for tier ${ci.tier + 1}`}</em>
                </div>
                <div className="fi-ms-tiers tall">
                    {cur.at.map((at, k) => {
                        const rw = cur.rewards[k] ?? [];
                        const got = ci.v >= at;
                        const isClaimed = claimed.includes(msId(cur, k));
                        const canClaim = got && rw.length > 0 && !isClaimed;
                        return (
                            <div key={k} className="fi-ms-t" data-got={got} data-ready={canClaim} data-next={!got && k === ci.tier} style={{ animationDelay: `${Math.min(k, 12) * 30}ms` }}>
                                <span className="no">{got ? "✔" : k + 1}</span>
                                <span className="tx">
                                    <b>{F(at)} <small>{cur.unit}</small></b>
                                    <span className="fi-lv-chips">
                                        {cur.auto && <span className="fi-lv-chip buff" style={css({ "--k": "var(--mc-green)" })}>{cur.auto(k + 1)} (automatic)</span>}
                                        {rw.map((r, x) => (
                                            <span key={x} className="fi-lv-chip" style={css({ "--k": r.stat ? "var(--mc-green)" : "#ffd23a" })}>{rewardLine(r)}</span>
                                        ))}
                                        {!cur.auto && rw.length === 0 && <span className="fi-lv-chip dim">no reward</span>}
                                    </span>
                                </span>
                                {canClaim ? (
                                    <button type="button" className="fi-cb-go slim" data-snd="off" onClick={() => onClaim(msId(cur, k))}>Claim</button>
                                ) : (
                                    <em>{rw.length === 0 ? (got ? "reached" : "") : isClaimed ? "claimed" : got ? "" : k === ci.tier ? "next" : "locked"}</em>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return (
        <div className="fi-ms fi-ms-list" style={css({ "--k": color })}>
            <div className="fi-ms-top">
                <TabBar
                    tabs={MS_TABS}
                    current={group}
                    label="Milestone kinds"
                    keys={false}
                    onSelect={(g) => { setGroup(g); setCat("all"); setSel(""); }}
                    notes={{
                        item: totalReady("item") > 0 ? [{ text: `${totalReady("item")} to claim`, color: "#ffd23a", act: true, n: totalReady("item") }] : [],
                        action: totalReady("action") > 0 ? [{ text: `${totalReady("action")} to claim`, color: "#ffd23a", act: true, n: totalReady("action") }] : [],
                    }}
                />
                {all > 0 && (
                    <button type="button" className="fi-cb-go slim" data-snd="off" onClick={onAll}>Claim all ({all})</button>
                )}
            </div>
            <p className="fi-ms-note">
                {group === "item"
                    ? "One card for every item. Open one to see every tier. Its bonus grows on its own; some tiers also pay a reward you claim."
                    : "Everything you do, in tiers. Open one to see what each tier pays."}
            </p>
            <div className="fi-cb-groups">
                <button type="button" data-on={cat === "all"} onClick={() => setCat("all")}>All</button>
                {cats[group].map((c) => (
                    <button key={c.id} type="button" data-on={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>
                ))}
            </div>
            <div className="fi-ms-grid">
                {list.map((l) => {
                    const i = info(l);
                    const done = i.tier >= l.at.length;
                    return (
                        <button key={l.key} type="button" className="fi-ms-card" data-ready={i.ready.length > 0} data-done={done} style={css({ "--k": l.color })} onClick={() => setSel(l.key)}>
                            <ItemIcon icon={l.icon} color={l.color} size="md" />
                            <span className="tx">
                                <b>{l.name}</b>
                                <span className="bar"><i style={{ width: `${done ? 100 : Math.min(100, ((i.v - (l.at[i.tier - 1] ?? 0)) / (l.at[i.tier] - (l.at[i.tier - 1] ?? 0))) * 100)}%` }} /></span>
                                <em>{done ? "All tiers" : `${F(Math.floor(i.v))} / ${F(l.at[i.tier])}`}</em>
                            </span>
                            <span className="pips">
                                {l.at.map((_, k) => (
                                    <u key={k} data-s={claimed.includes(msId(l, k)) || (k < i.tier && (l.rewards[k]?.length ?? 0) === 0) ? "done" : k < i.tier ? "ready" : "none"} />
                                ))}
                            </span>
                            {i.ready.length > 0 && <i className="dot">{i.ready.length}</i>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ---- Recent finds: what just dropped, as icon rows with a time and a tooltip ----

interface FindEntry {
    text: string;
    color: string;
    t?: number;
    n?: number;
}
const FIND_ICONS: [RegExp, McSymbolName, string][] = [
    [/geode|pod/i, "gem", "A drop from a geode or a seed pod"],
    [/forged|made the|double batch|^\d+x /i, "forge", "Something you crafted"],
    [/dynamite|rush|tonic|bumper/i, "bolt", "A boost firing"],
    [/fertilizer|jumped/i, "flower", "A garden boost"],
    [/egg/i, "petLuck", "An egg"],
    [/token/i, "portal", "Rebirth tokens"],
    [/dust/i, "intelligence", "Arcane dust"],
    [/shard/i, "magicFind", "Shards"],
    [/fragment/i, "comet", "A Fracture Fragment"],
];
const ago = (t: number | undefined, now: number) => {
    if (!t) return "";
    const sec = Math.max(0, Math.floor((now - t) / 1000));
    return sec < 5 ? "just now" : sec < 60 ? `${sec}s ago` : sec < 3600 ? `${Math.floor(sec / 60)}m ago` : `${Math.floor(sec / 3600)}h ago`;
};

export function RecentFinds({ log, color, title = "Recent finds", noun }: { log: FindEntry[]; color: string; title?: string; noun: string }) {
    const now = Date.now();
    if (!log.length) return null;
    return (
        <section className="fi-rf" style={css({ "--k": color })} aria-label={title}>
            <header>
                <b>{title}</b>
                <small>last {Math.min(log.length, 6)} of your {noun}</small>
            </header>
            <ul aria-live="polite">
                {log.slice(0, 6).map((l, i) => {
                    const [head, ...rest] = l.text.split(": ");
                    const hit = FIND_ICONS.find(([re]) => re.test(l.text));
                    const fresh = !!l.t && now - l.t < 4000;
                    const sub = rest.join(": ");
                    return (
                        <Tip key={`${l.text}:${l.t ?? i}`} box tip={<TipCard title={head} color={l.color} lines={[sub || l.text, hit?.[2] ?? "A find"]} rows={[["Seen", `${l.n ?? 1} time${(l.n ?? 1) === 1 ? "" : "s"} in a row`], ["Last", ago(l.t, now) || "a while ago"]]} />}>
                            <li data-fresh={fresh} style={css({ "--c": l.color })}>
                                <ItemIcon icon={hit?.[1] ?? "star"} color={l.color} size="sm" />
                                <span className="tx">
                                    <b>{head}</b>
                                    {sub && <em>{sub}</em>}
                                </span>
                                {(l.n ?? 1) > 1 && <i className="n">x{l.n}</i>}
                                <time>{ago(l.t, now)}</time>
                            </li>
                        </Tip>
                    );
                })}
            </ul>
        </section>
    );
}

export const Hint =({ children }: { children: ReactNode }) => <p className="fi-sk-hint">{children}</p>;

export const SKILL_KIT_CSS = `
.fi-lv-chips{display:flex;flex-wrap:wrap;gap:.25rem}
.fi-lv-chip{display:inline-flex;align-items:center;gap:.25rem;padding:.12rem .45rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--k,#fff) 38%,transparent);background:color-mix(in oklch,var(--k,#fff) 10%,transparent);font-family:var(--font-rubik,inherit);font-size:.62rem;font-weight:600;color:var(--k,#fff);white-space:nowrap}
.fi-lv-chip.dim{opacity:.55}
.fi-lv-btn{display:inline-flex;align-items:center;justify-content:center;gap:.3rem;padding:.38rem .7rem;border-radius:.65rem;border:1px solid color-mix(in oklch,var(--sc,#ffd23a) 60%,transparent);background:color-mix(in oklch,var(--sc,#ffd23a) 14%,transparent);color:var(--sc,#ffd23a);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;white-space:nowrap;transition:transform .1s,background .15s}
.fi-lv-btn:hover:not(:disabled){background:color-mix(in oklch,var(--sc,#ffd23a) 26%,transparent)}
.fi-lv-btn:active:not(:disabled){transform:scale(.94)}
.fi-lv-btn:disabled{opacity:.4;cursor:not-allowed}
.fi-lv-btn.ghost{background:transparent;border-color:rgba(255,255,255,.18);color:var(--muted-foreground);font-weight:500}
@keyframes fi-lv-glow{0%,100%{box-shadow:0 0 0 0 rgba(255,210,58,0)}50%{box-shadow:0 0 18px -2px rgba(255,210,58,.55)}}
.fi-ik{--sz:2.7rem;position:relative;display:grid;place-items:center;flex:none;width:var(--sz);height:var(--sz);border-radius:.75rem;background:linear-gradient(145deg,color-mix(in oklch,var(--k) 40%,#0e0a16),color-mix(in oklch,var(--k) 12%,#0e0a16));border:1px solid color-mix(in oklch,var(--k) 65%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -6px 10px rgba(0,0,0,.25),0 0 14px -7px var(--k)}
.fi-ik[data-size="sm"]{--sz:1.7rem;border-radius:.5rem}
.fi-ik[data-size="lg"]{--sz:3.7rem;border-radius:.95rem}
.fi-ik .g{font-size:calc(var(--sz) * .5);line-height:1;color:color-mix(in oklch,var(--k) 38%,#fff);text-shadow:0 0 10px color-mix(in oklch,var(--k) 70%,transparent),0 2px 0 rgba(0,0,0,.45)}
.fi-ik b{position:absolute;right:-.2rem;bottom:-.25rem;min-width:1rem;padding:0 .22rem;border-radius:.45rem;background:#120d18;border:1px solid color-mix(in oklch,var(--k) 55%,transparent);font-family:var(--font-rubik,inherit);font-size:.56rem;font-weight:800;line-height:1.1rem;text-align:center;color:#fff}
.fi-ik[data-dim="true"]{filter:grayscale(.85) brightness(.6)}
.fi-ik[data-ench="true"]{box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 0 2px color-mix(in oklch,#c58bff 60%,transparent),0 0 16px -4px #c58bff}
.fi-nt{display:inline-grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.4rem;padding:.25rem .5rem .25rem .3rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25)}
.fi-nt[data-ok="true"]{border-color:color-mix(in oklch,var(--mc-green) 45%,transparent)}
.fi-nt[data-ok="false"]{border-color:color-mix(in oklch,var(--mc-red) 50%,transparent)}
.fi-nt .t{display:flex;flex-direction:column;min-width:0;line-height:1.15}
.fi-nt .t b{font-family:var(--font-minecraft,inherit);font-size:.78rem;color:#fff}
.fi-nt .t em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-nt i{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.62rem;font-weight:700;color:var(--mc-red)}
.fi-nt[data-ok="true"] i{color:var(--mc-green)}

.fi-cb,.fi-ms{display:flex;flex-direction:column;gap:.55rem}
.fi-cb-groups{display:flex;flex-wrap:wrap;gap:.3rem}
.fi-cb-groups button{display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .65rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2);color:var(--muted-foreground);font-family:var(--font-rubik,inherit);font-size:.68rem;font-weight:600;transition:background .15s,color .15s}
.fi-cb-groups button:hover{color:#fff}
.fi-cb-groups button[data-on="true"]{border-color:var(--k);background:color-mix(in oklch,var(--k) 18%,transparent);color:var(--k)}
.fi-cb-groups button i{font-style:normal;display:grid;place-items:center;min-width:.95rem;height:.95rem;padding:0 .25rem;border-radius:999px;background:var(--mc-green);color:#07200f;font-size:.58rem;font-weight:800}
.fi-cb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(5.6rem,1fr));gap:.4rem}
.fi-cb-tile{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.55rem .3rem .45rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);color:#fff;transition:transform .12s,border-color .15s,background .15s}
.fi-cb-tile:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--k) 55%,transparent)}
.fi-cb-tile[data-on="true"]{border-color:var(--k);background:color-mix(in oklch,var(--k) 12%,rgba(0,0,0,.2));box-shadow:0 0 0 1px var(--k)}
.fi-cb-tile[data-s="ready"]{border-color:color-mix(in oklch,var(--mc-green) 60%,transparent);background:color-mix(in oklch,var(--mc-green) 8%,rgba(0,0,0,.2))}
.fi-cb-tile[data-s="ready"] .st{color:var(--mc-green)}
.fi-cb-tile[data-s="owned"]{opacity:.7}
.fi-cb-tile[data-s="owned"] .st{color:var(--k)}
.fi-cb-tile[data-s="locked"]{opacity:.55}
.fi-cb-tile .nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.64rem;font-weight:600}
.fi-cb-tile .st{font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--muted-foreground);white-space:nowrap}
.fi-cb-detail{display:flex;flex-direction:column;gap:.55rem;padding:.7rem .8rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--k) 40%,transparent);background:linear-gradient(160deg,color-mix(in oklch,var(--k) 8%,transparent),rgba(0,0,0,.2) 65%)}
.fi-cb-detail[data-s="ready"]{border-color:color-mix(in oklch,var(--mc-green) 55%,transparent)}
.fi-cb-dh{display:flex;align-items:center;gap:.7rem}
.fi-cb-dt{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem}
.fi-cb-dt b{font-family:var(--font-minecraft,inherit);font-size:1rem;line-height:1.1}
.fi-cb-dt span{font-family:var(--font-rubik,inherit);font-size:.68rem;color:#cfc8de}
.fi-cb-dt em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--mc-green)}
.fi-cb-tm{flex:none;text-align:right;display:flex;flex-direction:column;font-family:var(--font-rubik,inherit)}
.fi-cb-tm small{font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-cb-tm b{font-family:var(--font-minecraft,inherit);font-size:.85rem;color:#fff}
.fi-cb-needs{display:flex;flex-wrap:wrap;gap:.35rem}
.fi-cb-free{font-family:var(--font-rubik,inherit);font-size:.7rem;color:var(--mc-green)}
.fi-cb-lock,.fi-cb-used{margin:0;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-cb-act{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}
.fi-cb-batch{display:inline-flex;padding:.15rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25)}
.fi-cb-batch button{padding:.22rem .55rem;border-radius:.5rem;border:0;background:transparent;color:var(--muted-foreground);font-family:var(--font-rubik,inherit);font-size:.66rem;font-weight:700}
.fi-cb-batch button[data-on="true"]{background:color-mix(in oklch,var(--k) 25%,transparent);color:var(--k)}
.fi-cb-batch button:disabled{opacity:.35}
.fi-cb-go{flex:1;min-width:8rem;padding:.5rem .9rem;border-radius:.75rem;border:1px solid color-mix(in oklch,var(--mc-green) 65%,transparent);background:color-mix(in oklch,var(--mc-green) 18%,transparent);color:var(--mc-green);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.78rem;transition:transform .1s,background .15s}
.fi-cb-go.slim{flex:none;min-width:0;padding:.3rem .7rem;font-size:.7rem}
.fi-cb-go:hover:not(:disabled){background:color-mix(in oklch,var(--mc-green) 30%,transparent)}
.fi-cb-go:active:not(:disabled){transform:scale(.97)}
.fi-cb-go:disabled{opacity:.45;border-color:rgba(255,255,255,.18);background:transparent;color:var(--muted-foreground);cursor:not-allowed}

.fi-sl{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.4rem}
.fi-sl-c{display:flex;align-items:center;gap:.6rem;padding:.5rem .6rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);min-height:3.9rem}
.fi-sl-c[data-s="busy"]{border-color:color-mix(in oklch,var(--k) 50%,transparent)}
.fi-sl-c[data-s="ready"]{border-color:var(--mc-green);box-shadow:0 0 20px -8px var(--mc-green)}
.fi-sl-c .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:.2rem}
.fi-sl-c .tx b{font-family:var(--font-minecraft,inherit);font-size:.78rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-sl-c .tx em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-sl-c .bar{display:block;height:.35rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-sl-c .bar i{display:block;height:100%;background:linear-gradient(90deg,color-mix(in oklch,var(--k) 55%,#000),var(--k));box-shadow:0 0 8px var(--k);transition:width .5s linear}
.fi-sl-c .empty{display:flex;flex-direction:column;font-family:var(--font-rubik,inherit);font-size:.72rem;color:var(--muted-foreground)}
.fi-sl-c .empty small{font-size:.58rem;opacity:.75}
.fi-sl-b{flex:none;padding:.35rem .7rem;border-radius:.65rem;border:1px solid var(--mc-green);background:color-mix(in oklch,var(--mc-green) 22%,transparent);color:#fff;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;animation:fi-lv-glow 2s ease-in-out infinite}
.fi-sl-l{flex:none;width:1.7rem;height:1.7rem;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:transparent;color:var(--muted-foreground);font-size:.85rem;line-height:1}
.fi-sl-l[data-on="true"]{border-color:var(--k);background:color-mix(in oklch,var(--k) 25%,transparent);color:#fff}

.fi-ms-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem}
.fi-ms-note{margin:0;font-family:var(--font-rubik,inherit);font-size:.68rem;line-height:1.45;color:var(--muted-foreground)}
.fi-ms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(12.2rem,1fr));gap:.4rem}
.fi-ms-card{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto;align-items:center;gap:.25rem .6rem;padding:.55rem .6rem;border-radius:.95rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);text-align:left;color:#fff;transition:transform .12s,border-color .15s}
.fi-ms-card:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--k) 55%,transparent)}
.fi-ms-card[data-on="true"]{border-color:var(--k);box-shadow:0 0 0 1px var(--k),0 0 22px -10px var(--k)}
.fi-ms-card[data-ready="true"]{border-color:#ffd23a;box-shadow:0 0 22px -9px #ffd23a}
.fi-ms-card[data-done="true"] .tx em{color:var(--k)}
.fi-ms-card .tx{display:flex;flex-direction:column;gap:.18rem;min-width:0}
.fi-ms-card .tx b{font-family:var(--font-minecraft,inherit);font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-ms-card .tx em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.fi-ms-card .bar{display:block;height:.3rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-ms-card .bar i{display:block;height:100%;background:var(--k);box-shadow:0 0 6px var(--k)}
.fi-ms-card .pips{grid-column:1 / -1;display:flex;gap:.18rem}
.fi-ms-card .pips u{flex:1;height:.28rem;border-radius:2px;background:rgba(255,255,255,.14);text-decoration:none}
.fi-ms-card .pips u[data-s="done"]{background:var(--k)}
.fi-ms-card .pips u[data-s="ready"]{background:#ffd23a;box-shadow:0 0 6px #ffd23a}
.fi-ms-card .dot{position:absolute;top:-.35rem;right:-.2rem;font-style:normal;display:grid;place-items:center;min-width:1.05rem;height:1.05rem;padding:0 .3rem;border-radius:999px;background:#ffd23a;color:#201800;font-family:var(--font-rubik,inherit);font-size:.6rem;font-weight:800}
.fi-ms-detail{display:flex;flex-direction:column;gap:.5rem;padding:.7rem .8rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--k) 35%,transparent);background:rgba(0,0,0,.2)}
.fi-ms-tiers{display:flex;flex-direction:column;gap:.25rem;max-height:20rem;overflow-y:auto}
.fi-ms-t{display:grid;grid-template-columns:1.6rem minmax(0,1fr) auto;align-items:center;gap:.5rem;padding:.35rem .5rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)}
.fi-ms-t[data-got="true"]{border-color:color-mix(in oklch,var(--mc-green) 35%,transparent)}
.fi-ms-t[data-ready="true"]{border-color:#ffd23a;background:color-mix(in oklch,#ffd23a 8%,transparent)}
.fi-ms-t .no{display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:.45rem;background:rgba(255,255,255,.08);font-family:var(--font-minecraft,inherit);font-size:.72rem;color:var(--muted-foreground)}
.fi-ms-t[data-got="true"] .no{background:var(--k);color:#120d18}
.fi-ms-t .tx{display:flex;flex-direction:column;gap:.2rem;min-width:0}
.fi-ms-t .tx>b{font-family:var(--font-minecraft,inherit);font-size:.72rem}
.fi-ms-t>em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
@keyframes fi-ms-in{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}
@keyframes fi-ms-row{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes fi-ms-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes fi-ms-list-in{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
.fi-ms-page{animation:fi-ms-in .28s cubic-bezier(.2,.8,.2,1) both}
.fi-ms-list{animation:fi-ms-list-in .25s ease both}
.fi-ms-bar{display:flex;align-items:center;gap:.6rem}
.fi-ms-back{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem .35rem .65rem;border-radius:.7rem;border:1px solid color-mix(in oklch,var(--k) 50%,transparent);background:color-mix(in oklch,var(--k) 12%,transparent);color:#fff;font-family:var(--font-minecraft,inherit);font-size:.72rem;font-weight:700;transition:transform .12s,background .15s}
.fi-ms-back .ar{display:inline-block;transition:transform .18s;font-size:.95rem;line-height:1}
.fi-ms-back:hover{background:color-mix(in oklch,var(--k) 24%,transparent)}
.fi-ms-back:hover .ar{transform:translateX(-4px)}
.fi-ms-back:active{transform:scale(.95)}
.fi-ms-crumb{flex:1;font-family:var(--font-rubik,inherit);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-ms-hero{display:flex;align-items:center;gap:.9rem;padding:.8rem .9rem;border-radius:1.1rem;border:1px solid color-mix(in oklch,var(--k) 45%,transparent);background:radial-gradient(120% 140% at 0% 0%,color-mix(in oklch,var(--k) 20%,transparent),rgba(0,0,0,.25) 70%)}
.fi-ms-hero .fi-ik{animation:fi-ms-pop .45s .1s cubic-bezier(.2,1.4,.4,1) both}
.fi-ms-hero .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:.15rem}
.fi-ms-hero .tx b{font-family:var(--font-minecraft,inherit);font-size:1.15rem;color:var(--k);line-height:1.1}
.fi-ms-hero .tx span{font-family:var(--font-rubik,inherit);font-size:.72rem;color:#cfc8de}
.fi-ms-hero .tx em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--mc-green)}
.fi-ms-hero .tier{display:flex;flex-direction:column;align-items:flex-end;font-family:var(--font-rubik,inherit)}
.fi-ms-hero .tier small{font-size:.56rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-ms-hero .tier b{font-family:var(--font-minecraft,inherit);font-size:1.4rem;color:#fff}
.fi-ms-hero .tier b i{font-style:normal;font-size:.8rem;color:var(--muted-foreground)}
.fi-ms-prog{display:flex;flex-direction:column;gap:.25rem}
.fi-ms-prog .bar{display:block;height:.6rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-ms-prog .bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,color-mix(in oklch,var(--k) 55%,#000),var(--k));box-shadow:0 0 10px var(--k);transition:width .6s cubic-bezier(.2,.8,.2,1)}
.fi-ms-prog em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-ms-tiers.tall{max-height:none}
.fi-ms-t{animation:fi-ms-row .3s ease both}
.fi-ms-t[data-next="true"]{border-color:color-mix(in oklch,var(--k) 60%,transparent);border-style:dashed}
.fi-ms-t .tx>b small{font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--muted-foreground);font-weight:500}
.fi-rf{display:flex;flex-direction:column;gap:.4rem;padding:.6rem .7rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--k) 30%,transparent);background:linear-gradient(160deg,color-mix(in oklch,var(--k) 7%,transparent),rgba(0,0,0,.22) 70%)}
.fi-rf header{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem}
.fi-rf header b{font-family:var(--font-minecraft,inherit);font-size:.8rem;color:var(--k)}
.fi-rf header small{font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--muted-foreground)}
.fi-rf ul{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.3rem}
.fi-rf li{display:flex;align-items:center;gap:.5rem;min-width:0;padding:.3rem .5rem .3rem .35rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.2);transition:border-color .2s,background .2s}
.fi-rf li:hover{border-color:color-mix(in oklch,var(--c) 55%,transparent)}
.fi-rf li[data-fresh="true"]{border-color:color-mix(in oklch,var(--c) 70%,transparent);background:color-mix(in oklch,var(--c) 10%,rgba(0,0,0,.2));animation:fi-rf-in .5s cubic-bezier(.2,1.2,.4,1)}
@keyframes fi-rf-in{from{opacity:0;transform:translateY(-8px) scale(.96)}to{opacity:1;transform:none}}
.fi-rf .tx{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15}
.fi-rf .tx b{font-family:var(--font-rubik,inherit);font-size:.7rem;font-weight:700;color:var(--c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-rf .tx em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;color:#cfc8de;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-rf .n{font-style:normal;flex:none;padding:0 .35rem;border-radius:999px;background:color-mix(in oklch,var(--c) 25%,transparent);font-family:var(--font-rubik,inherit);font-size:.58rem;font-weight:800;color:#fff}
.fi-rf time{flex:none;font-family:var(--font-rubik,inherit);font-size:.54rem;color:var(--muted-foreground)}
@media (prefers-reduced-motion:reduce){.fi-rf li{animation:none!important}}
.fi-sk-hint{margin:0;font-family:var(--font-rubik,inherit);font-size:.68rem;line-height:1.45;color:var(--muted-foreground)}
`;

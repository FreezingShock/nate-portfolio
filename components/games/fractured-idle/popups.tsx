"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { BUFF_BY_ID, CRACKED_WIN, curseOdds, goldenOdds, isQte, nextPopupIn, noteCaught, popupBase, popupLife, resolveBobber, resolveCracked, resolveGolden, resolveQte, rollKind, type Grade, type Outcome, type PopupKind, type PopupSpec } from "@/lib/fractured-idle/events";
import { COMBO_BOBBER_SHARE } from "@/lib/fractured-idle/combo";
import type { State } from "@/lib/fractured-idle/data";
import { fmt, skillLevel, type Derived } from "@/lib/fractured-idle/engine";
import { addDust } from "@/lib/fractured-idle/enchant";
import { eventBurst, eventLabel } from "./button-fx";
import { dustPop } from "./enchant-fx";
import { QteCard } from "./qte";
import { Tip, TipCard, type TipNote, type TipRow } from "./tooltip";

// Popup events around the button. This component owns the scheduler (a slow
// interval, so it never competes with the click loop), the floating orbs
// (Treasure Bobber, Golden Shard, Cracked Shard) and the quick time event card.
// Rules and payouts live in lib/fractured-idle/events.ts.

const MAX_POPUPS = 3;
const ORB: Record<string, { color: string; name: string; hint: string }> = {
    bobber: { color: "var(--mc-aqua)", name: "Treasure Bobber", hint: "Catch it for shards" },
    golden: { color: "var(--mc-gold)", name: "Golden Shard", hint: "Something good" },
    cracked: { color: "var(--mc-red)", name: "Cracked Shard", hint: "A gamble: riches or a curse" },
};

interface Props {
    stateRef: MutableRefObject<State | null>;
    dRef: MutableRefObject<Derived | null>;
    getCombo: () => number;
    say: (msg: string) => void;
    enabled: boolean;
}

export function Popups({ stateRef, dRef, getCombo, say, enabled }: Props) {
    const [items, setItems] = useState<PopupSpec[]>([]);
    const itemsRef = useRef<PopupSpec[]>([]);
    const layer = useRef<HTMLDivElement>(null);
    const fx = useRef<HTMLDivElement>(null);
    const qteKey = useRef<((k: string) => boolean) | null>(null);
    const sched = useRef({ next: 9, id: 1, last: 0 });

    const set = useCallback((fn: (cur: PopupSpec[]) => PopupSpec[]) => {
        itemsRef.current = fn(itemsRef.current);
        setItems(itemsRef.current);
    }, []);
    const drop = useCallback((id: number) => set((c) => c.filter((i) => i.id !== id)), [set]);

    // Scheduler.
    useEffect(() => {
        if (!enabled) {
            set(() => []);
            return;
        }
        sched.current.last = performance.now();
        const iv = setInterval(() => {
            const s = stateRef.current;
            const d = dRef.current;
            const now = performance.now();
            const dt = Math.min(1, (now - sched.current.last) / 1000);
            sched.current.last = now;
            if (!s || !d || document.hidden) return;
            const sc = sched.current;
            // A hot combo brings popups sooner; upgrades, Beacon and Jinx scale it too.
            sc.next -= dt * d.evFreq * (1 + COMBO_BOBBER_SHARE * (getCombo() - 1));
            if (sc.next > 0) return;
            sc.next = nextPopupIn();
            const cur = itemsRef.current;
            if (cur.length >= MAX_POPUPS) return;
            const kind = rollKind(d, cur.some((i) => isQte(i.kind)));
            set((c) => [...c, { id: sc.id++, kind, x: 10 + Math.random() * 76, y: 20 + Math.random() * 46, life: popupLife(kind, d) }]);
        }, 250);
        return () => clearInterval(iv);
    }, [enabled, stateRef, dRef, getCombo, set]);

    // Dev only: window.__fiSpawn("golden") etc. to try a popup without waiting for the scheduler.
    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        const w = window as unknown as { __fiSpawn?: (k: PopupKind) => void };
        w.__fiSpawn = (kind) => {
            const d = dRef.current;
            if (d) set((c) => [...c, { id: sched.current.id++, kind, x: 10 + Math.random() * 76, y: 20 + Math.random() * 46, life: popupLife(kind, d) }]);
        };
        return () => {
            delete w.__fiSpawn;
        };
    }, [dRef, set]);

    // E, arrows and WASD go to the open quick time event.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))) return;
            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (qteKey.current?.(k)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, []);

    const show = (o: Outcome, x: number, y: number) => {
        const host = fx.current;
        if (host) {
            eventLabel(host, x, y, o.title, o.sub, o.color);
            eventBurst(host, x, y, o.color, o.tone);
        }
        if (o.tone === "perm") say(`${o.title}: ${o.sub}`);
    };

    // Every caught popup also pays Arcane Dust and Foraging xp, and Chain Reaction may spark another one.
    const extras = (s: State, d: Derived, xp: number, dust: number, x: number, y: number) => {
        s.foraging += xp * d.xpMult;
        const amt = (dust + d.evDust) * d.dustMult;
        addDust(s, amt);
        if (fx.current) dustPop(fx.current, x + 26, y + 20, amt);
        if (d.chain > 0 && Math.random() < d.chain) {
            sched.current.next = Math.min(sched.current.next, 0.8);
            say("Chain Reaction! Another popup is coming.");
        }
    };

    const local = (cx: number, cy: number) => {
        const r = layer.current?.getBoundingClientRect();
        return r ? { x: cx - r.left, y: cy - r.top } : { x: 0, y: 0 };
    };

    const catchOrb = (spec: PopupSpec, e: React.PointerEvent<HTMLButtonElement>) => {
        const s = stateRef.current;
        const d = dRef.current;
        if (!s || !d) return;
        const r = e.currentTarget.getBoundingClientRect();
        const p = local(r.left + r.width / 2, r.top + r.height / 2);
        let out: Outcome;
        if (spec.kind === "bobber") {
            out = resolveBobber(s, d, skillLevel(s.fishing));
            noteCaught(s);
        } else if (spec.kind === "golden") {
            noteCaught(s);
            out = resolveGolden(s, d);
        } else {
            noteCaught(s);
            out = resolveCracked(s, d);
        }
        show(out, p.x, p.y);
        extras(s, d, spec.kind === "bobber" ? 6 : 8, spec.kind === "cracked" ? 1.4 : 1.2, p.x, p.y);
        drop(spec.id);
    };

    const resolve = (spec: PopupSpec, grade: Grade, at: { cx: number; cy: number } | null) => {
        const s = stateRef.current;
        const d = dRef.current;
        if (!s || !d) return;
        const out = resolveQte(s, d, spec.kind, grade);
        const p = at ? local(at.cx, at.cy) : { x: 120, y: 80 };
        if (grade !== "miss") {
            show(out, p.x, p.y + 30);
            extras(s, d, grade === "perfect" ? 22 : grade === "great" ? 12 : 6, grade === "perfect" ? 6 : grade === "great" ? 3 : 1.5, p.x, p.y + 30);
        }
    };

    // Orb tooltips: what it is, what it can pay right now (from your live numbers), the odds, and the time left.
    const orbTip = (spec: PopupSpec, left: number): ReactNode => {
        const s = stateRef.current;
        const d = dRef.current;
        const o = ORB[spec.kind];
        const time: TipRow = ["Time left", `${Math.max(0, Math.ceil(left))}s`, left < 4 ? "var(--mc-red)" : undefined];
        const cta = "Click to catch!";
        if (!s || !d) return <TipCard title={o.name} color={o.color} lines={[o.hint]} cta={cta} />;
        const F = (n: number) => fmt(n, s.sci);
        const power = 1 + (d.evPower - 1) * 0.5;
        const notes: TipNote[] = [{ text: "Also pays Arcane Dust and Foraging XP", color: "#d9a8ff" }];
        if (spec.kind === "bobber") {
            const reward = Math.max(d.click * 40, d.cps * (30 + skillLevel(s.fishing))) * d.bobberMult * d.evPay;
            return (
                <TipCard
                    title={o.name}
                    color={o.color}
                    tag="Always pays"
                    lines={["A treasure bobber from the fishing spots. A sure haul of shards and Fishing XP."]}
                    rows={[["Shards", `~${F(reward)}`, "var(--mc-yellow)"], ["Wooden Egg", "10% chance", "var(--mc-gold)"], time]}
                    notes={notes}
                    cta={cta}
                />
            );
        }
        if (spec.kind === "golden") {
            const odds = goldenOdds().sort((a, b) => b.pct - a.pct);
            const label = (id: string): [string, string] =>
                id === "jackpot" ? ["Jackpot", "var(--mc-yellow)"] : id === "fragment" ? ["Fracture Fragment", "var(--mc-light-purple)"] : id === "egg" ? ["Golden Egg", "var(--mc-gold)"] : [BUFF_BY_ID[id]?.name ?? id, BUFF_BY_ID[id]?.color ?? "#fff"];
            const shown = odds.slice(0, 5);
            const jackpot = popupBase(d) * 10 * power;
            return (
                <TipCard
                    title={o.name}
                    color={o.color}
                    tag="Always good"
                    lines={["Something good every time: a timed boon, a jackpot or a permanent find."]}
                    rows={[...shown.map((x): TipRow => { const [n, c] = label(x.id); return [n, `${x.pct.toFixed(0)}%`, c]; }), ["and more", `${odds.length - shown.length} rarer`], time]}
                    notes={[{ text: `Jackpot is worth ~${F(jackpot)} shards`, color: "var(--mc-yellow)" }, ...(d.evPower > 1.05 ? [{ text: `Boons are x${d.evPower.toFixed(2)} stronger`, color: "var(--mc-green)" }] : []), ...notes]}
                    cta={cta}
                />
            );
        }
        const win = popupBase(d) * 25 * power;
        const resist = Math.max(0.3, 1 - d.curseResist * 0.8);
        return (
            <TipCard
                title={o.name}
                color={o.color}
                tag="Gamble"
                lines={["Crack it open: a big windfall, or a curse. Roughly even odds."]}
                rows={[["Windfall", `${Math.round(CRACKED_WIN * 100)}% · ~${F(win)}`, "var(--mc-yellow)"], ["Curse", `${Math.round((1 - CRACKED_WIN) * 100)}%`, "var(--mc-red)"], time]}
                notes={[
                    ...curseOdds().map((c): TipNote => {
                        const b = BUFF_BY_ID[c.id];
                        return { text: b ? `${b.name}: ${b.desc}` : "Pickpocket: a few shards go missing", color: "var(--mc-red)" };
                    }),
                    { text: "A windfall has a 20% chance to leave a Fragment", color: "var(--mc-light-purple)" },
                    ...(d.curseResist > 0 ? [{ text: `Curse resist: curses last ${Math.round(resist * 100)}% as long`, color: "var(--mc-green)" }] : []),
                    ...notes,
                ]}
                cta={cta}
            />
        );
    };

    if (!enabled) return null;
    const qte = items.find((i) => isQte(i.kind));
    return (
        <div ref={layer} className="pointer-events-none absolute inset-0 z-10">
            {items.filter((i) => !isQte(i.kind)).map((i) => (
                <Orb key={i.id} spec={i} onCatch={catchOrb} onExpire={drop} tipOf={orbTip} />
            ))}
            {qte && (
                <div className="fi-qte-slot">
                    <QteCard key={qte.id} spec={qte} d={dRef.current!} keyRef={qteKey} onResolve={(g, at) => resolve(qte, g, at)} onClose={() => drop(qte.id)} />
                </div>
            )}
            <div ref={fx} className="pointer-events-none absolute inset-0 z-20" aria-hidden="true" />
        </div>
    );
}

function Orb({ spec, onCatch, onExpire, tipOf }: { spec: PopupSpec; onCatch: (s: PopupSpec, e: React.PointerEvent<HTMLButtonElement>) => void; onExpire: (id: number) => void; tipOf: (s: PopupSpec, left: number) => ReactNode }) {
    const born = useRef(0);
    useEffect(() => {
        born.current = performance.now();
    }, []);
    useEffect(() => {
        const t = setTimeout(() => onExpire(spec.id), spec.life * 1000);
        return () => clearTimeout(t);
    }, [spec.id, spec.life, onExpire]);
    const o = ORB[spec.kind];
    return (
        <Tip tip={() => tipOf(spec, spec.life - (performance.now() - born.current) / 1000)} delay={0} closeOnPress>
        <button
            type="button"
            className="fi-orb"
            data-kind={spec.kind}
            aria-label={`${o.name}. ${o.hint}`}
            onPointerDown={(e) => {
                e.preventDefault();
                onCatch(spec, e);
            }}
            style={{ left: `${spec.x}%`, top: `${spec.y}%`, ["--oc" as string]: o.color, ["--life" as string]: `${spec.life}s` }}
        >
            <span className="fi-orb-halo" />
            <svg className="fi-orb-ring" viewBox="0 0 64 64" aria-hidden="true">
                <circle className="track" cx="32" cy="32" r="28" />
                <circle className="run" cx="32" cy="32" r="28" />
            </svg>
            <span className="fi-orb-core">{spec.kind === "cracked" ? "☠" : <McSymbol name={spec.kind === "bobber" ? "fishing" : "magicFind"} />}</span>
            <span className="fi-orb-spark" />
            <span className="fi-orb-spark" style={{ animationDelay: "-1.1s" }} />
        </button>
        </Tip>
    );
}

const fmtLeft = (t: number) => (t < 90 ? `${Math.ceil(t)}s` : `${Math.floor(t / 60)}m ${String(Math.ceil(t % 60) % 60).padStart(2, "0")}s`);

/** Active boons and curses, as small pills with a countdown line. */
export function BuffBar({ s }: { s: State }) {
    if (!s.buffs.length) return null;
    return (
        <div className="fi-buffs">
            {s.buffs.map((b) => {
                const def = BUFF_BY_ID[b.id];
                if (!def) return null;
                return (
                    <Tip
                        key={b.id}
                        tip={() => (
                            <TipCard
                                title={def.name}
                                color={def.color}
                                tag={def.term === "curse" ? "Curse" : def.term === "long" ? "Long boon" : "Short boon"}
                                lines={[<b key="d" style={{ color: def.term === "curse" ? "var(--mc-red)" : "var(--mc-green)", fontWeight: 600 }}>{def.desc}</b>]}
                                rows={[["Time left", fmtLeft(b.left), b.left < 6 ? (def.term === "curse" ? "var(--mc-green)" : "var(--mc-red)") : undefined], ["Lasts", fmtLeft(b.dur)], ...(b.power > 1.05 && def.term !== "curse" ? [["Strength", `x${b.power.toFixed(2)}`, "var(--mc-green)"] as TipRow] : [])]}
                                notes={[def.term === "curse" ? { text: "From a Cracked Shard. It wears off on its own.", color: "var(--mc-red)" } : { text: def.term === "long" ? "A long boon: it lasts for minutes." : "A short boon: make the most of it.", color: "var(--mc-green)" }]}
                            />
                        )}
                    >
                    <div
                        className="fi-buff"
                        data-term={def.term}
                        style={{ ["--bc" as string]: def.color }}
                    >
                        <McSymbol name={def.symbol} />
                        <span>{def.name}</span>
                        <b className="font-minecraft font-normal">{fmtLeft(b.left)}</b>
                        <i className="fi-buff-bar" style={{ width: `${Math.max(0, Math.min(1, b.left / b.dur)) * 100}%` }} />
                    </div>
                    </Tip>
                );
            })}
        </div>
    );
}

export type { PopupKind };

export const POPUP_CSS = `
.fi-orb{position:absolute;width:3.7rem;height:3.7rem;margin:-1.85rem 0 0 -1.85rem;pointer-events:auto;border:0;background:none;padding:0;cursor:pointer;outline:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;animation:fi-orb-in .5s cubic-bezier(.2,1.7,.4,1) both,fi-orb-float 2.8s ease-in-out .5s infinite}
.fi-orb:hover{filter:brightness(1.25)}
.fi-orb::before{content:"";position:absolute;inset:.3rem;border-radius:50%;border:2px solid var(--oc);opacity:0;animation:fi-orb-ping 1s ease-out .3s both;pointer-events:none}
@keyframes fi-orb-ping{0%{transform:scale(.8);opacity:.9}100%{transform:scale(2.6);opacity:0}}
.fi-orb:focus-visible .fi-orb-core{outline:2px solid #fff}
.fi-orb::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid #fff;opacity:0;animation:fi-orb-warn .4s steps(2) infinite;animation-delay:calc(var(--life) - 3s)}
.fi-orb-core{position:absolute;inset:.4rem;border-radius:50%;display:grid;place-items:center;font-size:1.5rem;color:#fff;background:radial-gradient(circle at 35% 28%,#fff 0,var(--oc) 42%,color-mix(in oklch,var(--oc) 35%,#000));border:2px solid color-mix(in oklch,var(--oc) 55%,#fff);box-shadow:0 0 22px var(--oc),inset 0 -6px 10px rgba(0,0,0,.25);text-shadow:0 2px 0 rgba(0,0,0,.4)}
.fi-orb[data-kind="cracked"] .fi-orb-core{background:radial-gradient(circle at 35% 28%,#ff9a9a 0,var(--oc) 35%,#1a0008);animation:fi-jitter .24s steps(2) infinite}
.fi-orb-halo{position:absolute;inset:-.35rem;border-radius:50%;background:radial-gradient(circle,var(--oc),transparent 68%);opacity:.5;animation:fi-orb-halo 1.6s ease-in-out infinite;pointer-events:none}
.fi-orb-ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible;pointer-events:none}
.fi-orb-ring circle{fill:none;stroke-width:3.5;stroke-linecap:round}
.fi-orb-ring .track{stroke:rgba(255,255,255,.14)}
.fi-orb-ring .run{stroke:var(--oc);stroke-dasharray:176;animation:fi-orb-count var(--life) linear forwards;filter:drop-shadow(0 0 4px var(--oc))}
.fi-orb-spark{position:absolute;left:50%;top:50%;width:.32rem;height:.32rem;margin:-.16rem;border-radius:50%;background:#fff;box-shadow:0 0 8px var(--oc);animation:fi-orb-orbit 2.2s linear infinite;pointer-events:none}
@keyframes fi-orb-in{from{transform:scale(0) rotate(-120deg);opacity:0}}
@keyframes fi-orb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes fi-orb-halo{0%,100%{transform:scale(.9);opacity:.35}50%{transform:scale(1.15);opacity:.65}}
@keyframes fi-orb-count{to{stroke-dashoffset:176}}
@keyframes fi-orb-orbit{from{transform:rotate(0) translateX(1.95rem)}to{transform:rotate(360deg) translateX(1.95rem)}}
@keyframes fi-orb-warn{from{opacity:0}to{opacity:.9}}
@keyframes fi-jitter{0%{transform:translate(0,0)}50%{transform:translate(1px,-1px)}100%{transform:translate(-1px,1px)}}
.fi-qte-slot{position:absolute;left:50%;top:.5rem;transform:translateX(-50%);width:min(16.5rem,92%);pointer-events:auto;z-index:15}
.fi-qte{position:relative;overflow:hidden;border-radius:.9rem;padding:.5rem .6rem .75rem;background:linear-gradient(180deg,color-mix(in oklch,var(--qc) 14%,#0b0912),#0b0912 70%);border:1px solid color-mix(in oklch,var(--qc) 65%,transparent);box-shadow:0 0 24px -6px var(--qc),0 10px 26px rgba(0,0,0,.55);animation:fi-qte-in .38s cubic-bezier(.2,1.4,.4,1) both;color:#fff}
.fi-qte[data-grade="perfect"]{animation:fi-qte-win .6s ease-out}
.fi-qte-head{display:flex;align-items:center;gap:.4rem;font-family:var(--font-minecraft,inherit);font-size:.72rem;color:var(--qc);text-shadow:0 0 10px var(--qc);margin-bottom:.4rem}
.fi-qte-head kbd{font-family:var(--font-rubik,inherit);font-size:.55rem;color:var(--muted-foreground);border:1px solid rgba(255,255,255,.2);border-radius:.3rem;padding:0 .25rem;text-shadow:none}
.fi-qte-track{position:relative;height:1.4rem;border-radius:.45rem;background:rgba(255,255,255,.07);box-shadow:inset 0 1px 3px rgba(0,0,0,.6);overflow:hidden}
.fi-qte-zone{position:absolute;top:0;bottom:0;background:color-mix(in oklch,var(--mc-green) 26%,transparent)}
.fi-qte-zone-great{background:color-mix(in oklch,var(--mc-green) 55%,transparent)}
.fi-qte-zone-perfect{background:var(--mc-gold);box-shadow:0 0 10px var(--mc-gold)}
.fi-qte-marker{position:absolute;top:0;bottom:0;width:.32rem;margin-left:-.16rem;border-radius:.15rem;background:#fff;box-shadow:0 0 10px 2px #fff}
.fi-qte-btn{margin-top:.45rem;width:100%;padding:.4rem;border-radius:.55rem;border:1px solid color-mix(in oklch,var(--qc) 70%,transparent);background:color-mix(in oklch,var(--qc) 18%,transparent);color:var(--qc);font-family:var(--font-minecraft,inherit);font-size:.75rem;letter-spacing:.12em;cursor:pointer;touch-action:manipulation;transition:background .15s}
.fi-qte-btn:hover{background:color-mix(in oklch,var(--qc) 30%,transparent)}
.fi-qte-btn:active{transform:scale(.97)}
.fi-qte-time{position:absolute;left:0;right:0;bottom:0;height:.24rem;background:rgba(255,255,255,.08)}
.fi-qte-time i{display:block;height:100%;width:100%;background:var(--qc);box-shadow:0 0 8px var(--qc);animation:fi-qte-time var(--life) linear forwards;transform-origin:left}
.fi-qte-result{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.6);backdrop-filter:blur(2px);font-family:var(--font-minecraft,inherit);font-size:1.6rem;color:var(--gc);text-shadow:0 0 14px var(--gc),0 2px 0 rgba(0,0,0,.6);animation:fi-qte-res .4s cubic-bezier(.2,1.6,.4,1) both}
.fi-mash{position:relative;width:4.7rem;height:4.7rem;flex:none;border-radius:50%;border:0;padding:0;cursor:pointer;touch-action:manipulation;color:#fff;background:radial-gradient(circle at 35% 30%,color-mix(in oklch,var(--qc) 55%,#fff),var(--qc) 45%,color-mix(in oklch,var(--qc) 40%,#000));box-shadow:0 0 18px -2px var(--qc);-webkit-tap-highlight-color:transparent}
.fi-mash::after{content:"";position:absolute;inset:.5rem;border-radius:50%;background:radial-gradient(circle at 35% 25%,rgba(255,255,255,.4),transparent 60%)}
.fi-mash:active{transform:scale(.93)}
.fi-mash-core{position:relative;z-index:1;font-family:var(--font-minecraft,inherit);font-size:.85rem;text-shadow:0 2px 0 rgba(0,0,0,.5);display:block;animation:fi-mash-pop .16s ease-out}
.fi-rune-row{display:flex;gap:.3rem}
.fi-rune-row[data-oops="1"]{animation:fi-qte-shake .3s}
.fi-rune-glyph{width:1.95rem;height:2.25rem;display:grid;place-items:center;border-radius:.45rem;font-size:1.25rem;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:var(--muted-foreground);transition:all .12s}
.fi-rune-glyph[data-state="done"]{color:var(--mc-green);border-color:var(--mc-green);background:color-mix(in oklch,var(--mc-green) 18%,transparent)}
.fi-rune-glyph[data-state="now"]{color:#fff;border-color:var(--qc);box-shadow:0 0 12px var(--qc);animation:fi-blink2 .5s ease-in-out infinite alternate}
.fi-rune-pad{display:grid;grid-template-areas:". up ." "left down right";grid-template-columns:repeat(3,1.65rem);gap:.2rem}
.fi-rune-key{width:1.65rem;height:1.65rem;border-radius:.4rem;border:1px solid color-mix(in oklch,var(--qc) 55%,transparent);background:color-mix(in oklch,var(--qc) 14%,transparent);color:var(--qc);font-size:.9rem;cursor:pointer;touch-action:manipulation;padding:0}
.fi-rune-key:active{transform:scale(.92)}
.fi-rune-key.up{grid-area:up}.fi-rune-key.left{grid-area:left}.fi-rune-key.down{grid-area:down}.fi-rune-key.right{grid-area:right}
@keyframes fi-qte-in{from{transform:translateY(-14px) scale(.92);opacity:0}}
@keyframes fi-qte-time{to{transform:scaleX(0)}}
@keyframes fi-qte-res{from{transform:scale(.5);opacity:0}}
@keyframes fi-qte-win{0%{box-shadow:0 0 60px 6px var(--mc-gold)}}
@keyframes fi-qte-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes fi-mash-pop{from{transform:scale(1.4)}}
.fi-buffs{display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem;max-width:100%}
.fi-buff{position:relative;display:flex;align-items:center;gap:.3rem;padding:.14rem .5rem .25rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--bc) 55%,transparent);background:color-mix(in oklch,var(--bc) 12%,transparent);font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--bc);overflow:hidden;animation:fi-orb-in .3s ease-out;white-space:nowrap}
.fi-buff b{color:#fff;opacity:.85}
.fi-buff-bar{position:absolute;left:0;bottom:0;height:2px;background:var(--bc);box-shadow:0 0 6px var(--bc)}
.fi-buff[data-term="long"]{border-radius:.45rem}
.fi-buff[data-term="curse"]{border-style:dashed;animation:fi-curse .9s ease-in-out infinite alternate}
@keyframes fi-curse{from{background-color:color-mix(in oklch,var(--bc) 8%,transparent)}to{background-color:color-mix(in oklch,var(--bc) 24%,transparent)}}
@media (prefers-reduced-motion:reduce){.fi-orb,.fi-orb-halo,.fi-orb-spark,.fi-orb::after,.fi-qte,.fi-buff,.fi-orb[data-kind="cracked"] .fi-orb-core,.fi-rune-glyph[data-state="now"]{animation:none}}
`;

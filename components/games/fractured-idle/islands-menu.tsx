"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Lock, Star, X } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { CATS } from "@/lib/fractured-idle/button";
import { MINIONS } from "@/lib/fractured-idle/data";
import { derive, fmtTime, income, type Derived } from "@/lib/fractured-idle/engine";
import { activeIsland, islandFx, islandOpen, islandProgress, islandStat, masteryInfo, tierMult } from "@/lib/fractured-idle/island-logic";
import { DIMENSIONS, ISLANDS, MASTERY_AT, MASTERY_STEP, isSpecial, perkText, type Affinity, type Dim, type IslandDef } from "@/lib/fractured-idle/islands";
import type { State } from "@/lib/fractured-idle/data";
import { IslandScene } from "./island-art";
import { tint } from "./ui";

// The travel map: a full-screen, one-island-at-a-time view. The scene is the
// whole screen and follows the pointer; the left shows the island's name and
// story, the right its perks and mastery, and a strip along the bottom lets you
// jump between the three dimensions' islands. Arrow keys browse, Enter travels,
// Esc closes.

const NAMES: Record<string, string> = Object.fromEntries(MINIONS.map((m) => [m.id, m.name.replace(" Minion", "")]));
const AFF_CAT: [keyof Affinity, string][] = [["shape", "shape"], ["skin", "skin"], ["burst", "burst"], ["crit", "crit"], ["aura", "aura"]];

const byDim = (d: Dim) => ISLANDS.filter((i) => i.dim === d);
const lookLabel = (cat: string, id: string) => CATS.find((c) => c.id === cat)?.list.find((l) => l.id === id)?.name ?? id;

interface Props {
    s: State;
    d: Derived;
    F: (n: number) => string;
    startId?: string;
    onClose: () => void;
    onTravel: (id: string) => void;
}

export function IslandsMenu({ s, d, F, startId, onClose, onTravel }: Props) {
    const here = activeIsland(s);
    const [focusId, setFocusId] = useState(startId ?? here.id);
    const [dir, setDir] = useState(1);
    const [warp, setWarp] = useState<string | null>(null);
    const root = useRef<HTMLDivElement>(null);
    const sceneHost = useRef<HTMLDivElement>(null);
    const strip = useRef<HTMLDivElement>(null);
    const [, tick] = useState(0);

    const focus = ISLANDS.find((i) => i.id === focusId) ?? ISLANDS[0];
    const dim = DIMENSIONS.find((x) => x.id === focus.dim)!;
    const open = islandOpen(s, focus);
    const isHere = here.id === focus.id;
    const list = byDim(focus.dim);

    // What each open island would pay you right now, so the menu can point at the best one.
    const gains = useMemo(() => {
        const base = income(d);
        const out: Record<string, number> = {};
        let best = "";
        let bestV = -1;
        for (const i of ISLANDS) {
            if (!islandOpen(s, i)) continue;
            const v = income(derive({ ...s, island: i.id }));
            out[i.id] = base > 0 ? v / base - 1 : 0;
            if (v > bestV) {
                bestV = v;
                best = i.id;
            }
        }
        return { out, best, base };
        // Recomputed when the island you are on changes (perks change everything else).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [s.island, s.btn.shape, s.btn.skin, s.btn.burst, s.btn.crit, s.btn.aura]);

    const go = useCallback((id: string, d: number) => {
        setDir(d);
        setFocusId(id);
    }, []);
    const step = useCallback(
        (n: number) => {
            const l = byDim(ISLANDS.find((i) => i.id === focusId)!.dim);
            const i = l.findIndex((x) => x.id === focusId);
            go(l[(i + n + l.length) % l.length].id, n);
        },
        [focusId, go],
    );
    const jumpDim = useCallback(
        (n: number) => {
            const cur = DIMENSIONS.findIndex((x) => x.id === ISLANDS.find((i) => i.id === focusId)!.dim);
            const next = DIMENSIONS[(cur + n + DIMENSIONS.length) % DIMENSIONS.length];
            const l = byDim(next.id);
            go((l.find((i) => i.id === here.id) ?? l[0]).id, n);
        },
        [focusId, go, here.id],
    );

    const travel = useCallback(() => {
        if (!open || isHere || warp) return;
        setWarp(focus.id);
        setTimeout(() => {
            onTravel(focus.id);
            onClose();
        }, 720);
    }, [open, isHere, warp, focus.id, onTravel, onClose]);

    // Keys, focus and scroll lock.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowRight") step(1);
            else if (e.key === "ArrowLeft") step(-1);
            else if (e.key === "ArrowUp") jumpDim(-1);
            else if (e.key === "ArrowDown") jumpDim(1);
            else if (e.key === "Enter") travel();
            else return;
            e.preventDefault();
            e.stopPropagation();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose, step, jumpDim, travel]);
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        root.current?.focus();
        const id = setInterval(() => tick((t) => t + 1), 1000); // mastery time and progress bars
        return () => {
            document.body.style.overflow = prev;
            clearInterval(id);
        };
    }, []);
    useEffect(() => {
        strip.current?.querySelector<HTMLElement>(`[data-isl="${focusId}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }, [focusId]);

    // Pointer parallax: write the offsets straight to the scene, no re-render.
    // Touch swipe between islands.
    const swipe = useRef<number | null>(null);
    const onDown = (e: React.PointerEvent) => {
        swipe.current = e.pointerType === "touch" ? e.clientX : null;
    };
    const onUp = (e: React.PointerEvent) => {
        if (swipe.current === null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 70) step(dx < 0 ? 1 : -1);
    };
    const onMove = (e: React.PointerEvent) => {
        const el = sceneHost.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    };

    const mast = masteryInfo(s.isec[focus.id] || 0);
    const k = open ? mast.strength : 1;
    const gain = gains.out[focus.id];
    const aff = focus.affinity;
    const affChips: { id: string; label: string; on: boolean }[] = [];
    if (aff) {
        for (const [key, cat] of AFF_CAT) {
            for (const id of aff[key] ?? []) affChips.push({ id: `${cat}:${id}`, label: lookLabel(cat, id), on: s.btn[cat as "shape"] === id });
        }
    }
    const need = focus.need;
    const prog = islandProgress(s, focus);

    const node = (
        <div
            ref={root}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Travel"
            onPointerMove={onMove}
            onPointerDown={onDown}
            onPointerUp={onUp}
            className={`fi-menu fixed inset-0 z-[300] overflow-hidden bg-black text-foreground outline-none ${warp ? "fi-travelling" : ""}`}
            style={{ ["--dc" as string]: dim.color, ["--ic" as string]: focus.color, ["--dir" as string]: dir }}
        >
            <div ref={sceneHost} key={focus.id} className="fi-isl-stage absolute inset-0">
                <IslandScene island={focus} variant="stage" locked={!open} className="absolute inset-0 size-full" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.72),transparent_46%),linear-gradient(0deg,rgba(0,0,0,.85),transparent_38%),linear-gradient(180deg,rgba(0,0,0,.6),transparent_22%)]" />

            {/* Top bar */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-3 py-3 sm:px-6">
                <div className="hidden min-w-0 sm:block">
                    <div className="font-minecraft text-[10px] uppercase tracking-[0.3em] text-white/60">Travel</div>
                    <div className="truncate font-rubik text-xs text-white/80">
                        You are on <b style={{ color: here.color }}>{here.name}</b>
                    </div>
                </div>
                <div className="mx-auto flex gap-1 rounded-2xl border border-white/15 bg-black/40 p-1 backdrop-blur-md">
                    {DIMENSIONS.map((x, di) => {
                        const all = byDim(x.id);
                        const got = all.filter((i) => islandOpen(s, i)).length;
                        const on = x.id === focus.dim;
                        return (
                            <button
                                key={x.id}
                                type="button"
                                onClick={() => jumpDim(di - DIMENSIONS.findIndex((y) => y.id === focus.dim))}
                                className="whitespace-nowrap rounded-xl px-2.5 py-1.5 font-minecraft text-[10px] transition-colors sm:px-4 sm:text-xs"
                                style={on ? { backgroundColor: tint(x.color, 24), color: x.color, boxShadow: `inset 0 0 0 1px ${tint(x.color, 60)}, 0 0 18px -4px ${x.color}` } : { color: "rgba(255,255,255,.6)" }}
                            >
                                {x.name} <span className="font-rubik text-[9px] opacity-70">{got}/{all.length}</span>
                            </button>
                        );
                    })}
                </div>
                <button type="button" onClick={onClose} aria-label="Close travel map" className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-black/40 backdrop-blur-md transition-colors hover:bg-white/15">
                    <X className="size-4" />
                </button>
            </div>

            {/* Prev / next */}
            {(["prev", "next"] as const).map((w) => (
                <button
                    key={w}
                    type="button"
                    onClick={() => step(w === "next" ? 1 : -1)}
                    aria-label={w === "next" ? "Next island" : "Previous island"}
                    className={`absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 backdrop-blur-md transition hover:scale-110 hover:bg-white/15 sm:grid ${w === "next" ? "right-[23.5rem]" : "left-4"}`}
                >
                    {w === "next" ? <ChevronRight className="size-6" /> : <ChevronLeft className="size-6" />}
                </button>
            ))}

            {/* Title block */}
            <div key={"t" + focus.id} className="fi-panel-in pointer-events-none absolute left-4 top-20 z-10 max-w-[min(32rem,88vw)] sm:left-10 sm:top-28">
                <div className="mb-2 flex flex-wrap items-center gap-2 font-rubik text-[10px]">
                    <span className="rounded-full border px-2 py-0.5" style={{ borderColor: tint(dim.color, 60), color: dim.color, backgroundColor: tint(dim.color, 14) }}>{dim.name}</span>
                    {isSpecial(focus) ? (
                        <span className="flex items-center gap-1 rounded-full border px-2 py-0.5" style={{ borderColor: tint("var(--mc-yellow)", 60), color: "var(--mc-yellow)", backgroundColor: tint("var(--mc-yellow)", 14) }}>
                            <Star className="size-3" /> Special island
                        </span>
                    ) : (
                        <span className="rounded-full border px-2 py-0.5" style={{ borderColor: tint(focus.color, 55), color: focus.color }}>tier bonus x{focus.mult}</span>
                    )}
                    {isHere && <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-black">You are here</span>}
                    {open && gains.best === focus.id && !isHere && <span className="rounded-full px-2 py-0.5 font-semibold text-black" style={{ backgroundColor: "var(--mc-green)" }}>★ Best for you now</span>}
                </div>
                <h2 className="font-minecraft text-[2.1rem] leading-none sm:text-6xl" style={{ color: focus.color, textShadow: `0 0 28px ${focus.color}, 0 4px 0 rgba(0,0,0,.6)` }}>
                    <McSymbol name={focus.symbol} /> {focus.name}
                </h2>
                <p className="mt-2 font-rubik text-sm text-white/90 sm:text-base">{focus.blurb}</p>
                <p className="mt-1 hidden font-rubik text-xs italic text-white/60 sm:block">{focus.lore}</p>
            </div>

            {/* Info panel */}
            <aside
                key={"p" + focus.id}
                className="fi-panel-in absolute inset-x-3 bottom-[8.4rem] z-10 max-h-[38dvh] overflow-y-auto rounded-2xl border bg-black/55 p-3 backdrop-blur-xl [scrollbar-width:thin] sm:inset-x-auto sm:bottom-40 sm:right-6 sm:top-20 sm:max-h-none sm:w-[21.5rem] sm:p-4"
                style={{ borderColor: tint(focus.color, 45), boxShadow: `0 0 40px -12px ${focus.color}` }}
            >
                <div className="mb-1.5 flex items-center justify-between font-minecraft text-[11px] uppercase tracking-widest" style={{ color: focus.color }}>
                    {open ? "While you are here" : "Perks"}
                    {open && gain !== undefined && (
                        <span className="rounded-full px-2 py-0.5 font-rubik text-[10px] normal-case tracking-normal" style={{ backgroundColor: tint(gain >= 0 ? "var(--mc-green)" : "var(--mc-red)", 20), color: gain >= 0 ? "var(--mc-green)" : "var(--mc-red)" }}>
                            {gain >= 0 ? "+" : ""}{+(gain * 100).toFixed(gain < 0.1 ? 1 : 0)}% income vs now
                        </span>
                    )}
                </div>
                <ul className="space-y-1">
                    {focus.perks.filter((p) => p.k !== "affinity").map((p, i) => (
                        <li key={i} className="flex items-start gap-2 font-rubik text-xs leading-snug">
                            <span className="mt-0.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: focus.color, boxShadow: `0 0 8px ${focus.color}` }} />
                            <span className={open ? "" : "text-white/70"}>{perkText(p, k, NAMES)}</span>
                        </li>
                    ))}
                </ul>

                {affChips.length > 0 && (
                    <div className="mt-3">
                        <div className="mb-1 flex justify-between font-rubik text-[10px] text-white/60">
                            <span>Matching button looks</span>
                            <span>{perkText(focus.perks.find((p) => p.k === "affinity")!, k)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {affChips.map((c) => (
                                <span key={c.id} className="rounded-full border px-1.5 py-0.5 font-rubik text-[10px]" style={c.on ? { borderColor: "var(--mc-green)", color: "var(--mc-green)", backgroundColor: tint("var(--mc-green)", 16) } : { borderColor: "rgba(255,255,255,.18)", color: "rgba(255,255,255,.65)" }}>
                                    {c.on && "✓ "}{c.label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {open ? (
                    <div className="mt-3">
                        <div className="flex items-center justify-between font-rubik text-[10px] text-white/70">
                            <span>Mastery {mast.level}/{MASTERY_AT.length}</span>
                            <span>{fmtTime(mast.seconds)} here{mast.next ? ` · next at ${fmtTime(mast.next)}` : " · maxed"}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full" style={{ width: `${mast.frac * 100}%`, backgroundColor: focus.color, boxShadow: `0 0 8px ${focus.color}` }} />
                        </div>
                        <div className="mt-1 font-rubik text-[10px] text-white/50">Every level makes these perks {MASTERY_STEP * 100}% stronger (now x{mast.strength.toFixed(2)}).</div>
                    </div>
                ) : (
                    <div className="mt-3 rounded-xl border border-white/15 bg-black/30 p-2.5">
                        <div className="flex items-center gap-1.5 font-minecraft text-[11px]" style={{ color: "var(--mc-yellow)" }}>
                            <Lock className="size-3.5" /> Locked
                        </div>
                        <div className="mt-1 font-rubik text-xs">{need ? need.label : `Reach ${F(focus.at)} lifetime shards`}</div>
                        <div className="mt-0.5 font-rubik text-[10px]" style={{ color: "var(--mc-yellow)" }}>Unlocking pays {isSpecial(focus) ? 300 : 160} Fracture EXP</div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full" style={{ width: `${prog * 100}%`, backgroundColor: "var(--mc-yellow)", boxShadow: "0 0 8px var(--mc-yellow)" }} />
                        </div>
                        <div className="mt-1 text-right font-rubik text-[10px] text-white/60">
                            {need ? `${F(islandStat(s, need.stat))} / ${F(need.n)}` : `${F(s.total)} / ${F(focus.at)}`}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={travel}
                    disabled={!open || isHere}
                    className="mt-3 w-full rounded-xl border py-2.5 font-minecraft text-sm tracking-wide transition enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:cursor-default"
                    style={
                        open && !isHere
                            ? { borderColor: focus.color, color: "#000", backgroundImage: `linear-gradient(180deg, color-mix(in oklch, ${focus.color} 70%, white), ${focus.color})`, boxShadow: `0 0 26px -4px ${focus.color}` }
                            : { borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.55)", backgroundColor: "rgba(255,255,255,.05)" }
                    }
                >
                    {isHere ? "You are here" : open ? `Travel to ${focus.name}` : "Not unlocked yet"}
                </button>
                <div className="mt-2 flex justify-between font-rubik text-[10px] text-white/55">
                    <span>Tier bonus now x{F(tierMult(s))}</span>
                    <span>Explorer bonus +{+(s.visited.length * 0.5).toFixed(1)}%</span>
                </div>
            </aside>

            {/* Island strip */}
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-2 pb-3 pt-6 sm:px-6">
                <div ref={strip} className="flex items-end gap-2 overflow-x-auto pb-1 pt-2 [scrollbar-width:none]" role="listbox" aria-label="Islands">
                    {DIMENSIONS.map((x) => (
                        <div key={x.id} className="flex shrink-0 items-end gap-2">
                            <div className="mb-1 self-stretch border-l pl-2 font-minecraft text-[9px] uppercase tracking-widest [writing-mode:vertical-rl]" style={{ borderColor: tint(x.color, 50), color: x.color }}>
                                {x.name}
                            </div>
                            {byDim(x.id).map((i) => (
                                <Thumb key={i.id} island={i} s={s} on={i.id === focus.id} here={i.id === here.id} best={gains.best === i.id} onPick={() => go(i.id, ISLANDS.indexOf(i) > ISLANDS.indexOf(focus) ? 1 : -1)} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {warp && <div className="fi-warp" style={{ ["--wc" as string]: focus.color }} />}
        </div>
    );
    return createPortal(node, document.body);
}

function Thumb({ island, s, on, here, best, onPick }: { island: IslandDef; s: State; on: boolean; here: boolean; best: boolean; onPick: () => void }) {
    const open = islandOpen(s, island);
    const lvl = open ? masteryInfo(s.isec[island.id] || 0).level : 0;
    return (
        <button
            type="button"
            role="option"
            aria-selected={on}
            data-isl={island.id}
            onClick={onPick}
            className="group relative h-[4.6rem] w-[6.6rem] shrink-0 overflow-hidden rounded-xl border-2 text-left outline-none transition-all focus-visible:ring-2 sm:h-24 sm:w-32"
            style={{
                borderColor: on ? island.color : "rgba(255,255,255,.14)",
                transform: on ? "translateY(-6px) scale(1.06)" : undefined,
                boxShadow: on ? `0 0 26px -2px ${island.color}` : undefined,
            }}
            title={island.name}
        >
            <IslandScene island={island} variant="thumb" locked={!open} className="absolute inset-0 size-full" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-4 font-minecraft text-[9px] leading-tight text-white sm:text-[10px]">
                {island.name}
            </span>
            {!open && <Lock className="absolute right-1.5 top-1.5 size-3.5 text-white/80" />}
            {isSpecial(island) && <Star className="absolute left-1.5 top-1.5 size-3" style={{ color: "var(--mc-yellow)", fill: "var(--mc-yellow)" }} />}
            {here && <span className="absolute right-1 top-1 rounded-full bg-white px-1.5 font-rubik text-[8px] font-bold text-black">HERE</span>}
            {best && !here && <span className="absolute right-1 top-1 rounded-full px-1 font-rubik text-[9px] font-bold text-black" style={{ backgroundColor: "var(--mc-green)" }}>★</span>}
            {lvl > 0 && (
                <span className="absolute bottom-1 right-1 flex gap-px">
                    {Array.from({ length: Math.min(5, Math.ceil(lvl / 2)) }, (_, n) => (
                        <i key={n} className="block size-1 rounded-full" style={{ backgroundColor: island.color, boxShadow: `0 0 4px ${island.color}` }} />
                    ))}
                </span>
            )}
        </button>
    );
}

export const MENU_CSS = `
.fi-isl-stage{animation:fi-isl-in .55s cubic-bezier(.2,.8,.2,1) both}
@keyframes fi-isl-in{from{opacity:0;transform:translateX(calc(var(--dir,1)*4%)) scale(1.05)}}
.fi-panel-in{animation:fi-panel-in .45s cubic-bezier(.2,.8,.2,1) .05s both}
@keyframes fi-panel-in{from{opacity:0;transform:translateY(14px)}}
.fi-menu{animation:fi-menu-in .3s ease-out both}
.fi-backdrop{opacity:.42;animation:fi-menu-in .9s ease-out both}
@keyframes fi-menu-in{from{opacity:0}}
.fi-warp{position:absolute;inset:0;z-index:50;pointer-events:none;background:radial-gradient(circle at 50% 55%,#fff 0,var(--wc) 22%,transparent 68%);animation:fi-warp .75s ease-in both}
@keyframes fi-warp{0%{opacity:0;transform:scale(.15)}55%{opacity:1}100%{opacity:1;transform:scale(2.8)}}
.fi-travelling .fi-isl-stage{animation:fi-zoom .75s ease-in both}
@keyframes fi-zoom{to{transform:scale(1.45);filter:blur(7px) brightness(1.6)}}
@media (prefers-reduced-motion:reduce){.fi-isl-stage,.fi-panel-in,.fi-menu,.fi-warp,.fi-travelling .fi-isl-stage{animation:none}}
`;

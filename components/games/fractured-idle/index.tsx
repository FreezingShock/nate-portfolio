"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { Expand, Minimize } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { ISLANDS, MINIONS, MINION_GROWTH, UPGRADES } from "@/lib/fractured-idle/data";
import {
    advance,
    bulk,
    checkAchievements,
    derive,
    fmt,
    income,
    loadGame,
    minionDiscount,
    rebirthPlan,
    skillLevel,
    upCost,
    writeSave,
} from "@/lib/fractured-idle/engine";
import { rebirthCost, type State } from "@/lib/fractured-idle/data";
import { Orbit } from "./orbit";
import { CSS, IconBtn, Kbd, Progress, Stat, tint, type Ctx, type TipApi, type TipSource } from "./ui";
import { MinionsTab } from "./tab-minions";
import { UpgradeTip, UpgradesTab } from "./tab-upgrades";
import { IslandsTab } from "./tab-islands";
import { SkillsTab } from "./tab-skills";
import { StatsTab } from "./tab-stats";
import { RebirthTab } from "./tab-rebirth";
import { SettingsTab, SoonTab, TrophiesTab } from "./tab-misc";

// Fractured Idle: a button-simulator incremental with SkyBlock flavor.
// State lives in a ref and is mutated by the pure functions in
// lib/fractured-idle/engine; a 50ms interval advances the simulation and a
// 100ms re-render keeps the UI live, so clicking never waits on React.
// To add a tab: write a component that takes Ctx and register it in TABS.

type TabId = "minions" | "upgrades" | "islands" | "skills" | "stats" | "rebirth" | "trophies" | "soon" | "settings";

const TABS: { id: TabId; label: string; symbol: React.ComponentProps<typeof McSymbol>["name"] }[] = [
    { id: "minions", label: "Minions", symbol: "forge" },
    { id: "upgrades", label: "Upgrades", symbol: "strength" },
    { id: "islands", label: "Islands", symbol: "location" },
    { id: "skills", label: "Skills", symbol: "wisdom" },
    { id: "stats", label: "Stats", symbol: "intelligence" },
    { id: "rebirth", label: "Rebirth", symbol: "portal" },
    { id: "trophies", label: "Trophies", symbol: "pristine" },
    { id: "soon", label: "Soon", symbol: "comet" },
    { id: "settings", label: "Settings", symbol: "defense" },
];

const BUY_OPTIONS = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "Max" },
];

const BOBBER_LIFETIME = 10; // seconds a bobber stays clickable

export function FracturedIdle() {
    const ref = useRef<State | null>(null);
    const [ready, setReady] = useState(false);
    const [, render] = useReducer((x: number) => x + 1, 0);
    const [tab, setTab] = useState<TabId>("minions");
    const [toast, setToast] = useState<string | null>(null);
    const [isFs, setIsFs] = useState(false);
    const [pseudoFs, setPseudoFs] = useState(false);
    const [bobber, setBobber] = useState<{ x: number; y: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const floatRef = useRef<HTMLDivElement>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const bob = useRef({ left: 0, next: 25 });
    const tipRef = useRef<HTMLDivElement>(null);
    const anchor = useRef({ x: 0, y: 0 });
    const [tipState, setTipState] = useState<{ id: string; open: boolean }>({ id: "", open: false });

    // Tooltip: position is written straight to the DOM (no re-render per mouse
    // move); open/close and content go through state so they can fade.
    const placeTip = useCallback(() => {
        const el = tipRef.current;
        const root = rootRef.current;
        if (!el || !root) return;
        const r = root.getBoundingClientRect();
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const cx = anchor.current.x - r.left;
        const cy = anchor.current.y - r.top;
        let x = cx + 14;
        let y = cy - 14 - h;
        if (x + w > r.width - 6) x = cx - 14 - w; // flip to the left of the cursor
        if (y < 6) y = Math.min(cy + 18, r.height - h - 6); // flip below
        x = Math.max(6, Math.min(x, r.width - w - 6));
        y = Math.max(6, Math.min(y, r.height - h - 6));
        el.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
    }, []);

    const tip: TipApi = useMemo(() => {
        const at = (src: TipSource) => {
            if ("clientX" in src) {
                anchor.current = { x: src.clientX, y: src.clientY };
            } else {
                const b = src.getBoundingClientRect(); // keyboard / touch: anchor to the tile
                anchor.current = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
            }
        };
        return {
            show: (id, src) => {
                at(src);
                setTipState({ id, open: true });
                placeTip();
            },
            move: (src) => {
                at(src);
                placeTip();
            },
            hide: () => setTipState((t) => (t.open ? { ...t, open: false } : t)),
        };
    }, [placeTip]);

    // Re-place after every render: the content (and so its size) may have changed.
    useLayoutEffect(() => {
        if (tipState.open) placeTip();
    });

    const say = useCallback((msg: string) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    const nextBobber = (s: State) =>
        (25 + Math.random() * 20) * Math.max(0.4, 1 - 0.01 * skillLevel(s.fishing));

    // ---- Load + game loop ----
    useEffect(() => {
        const { state, offline } = loadGame();
        ref.current = state;
        bob.current.next = nextBobber(state);
        setReady(true);
        if (offline > 0) say(`Welcome back! Your minions earned ${fmt(offline, state.sci)} shards while you were away.`);

        let last = performance.now();
        let sinceRender = 0;
        let sinceSave = 0;
        let sinceAch = 0;
        const id = setInterval(() => {
            const s = ref.current;
            if (!s) return;
            const now = performance.now();
            const dt = Math.min((now - last) / 1000, 86400);
            last = now;
            advance(s, derive(s), dt);
            sinceRender += dt;
            sinceSave += dt;
            sinceAch += dt;

            // Treasure bobbers (fishing mini-event)
            const b = bob.current;
            if (b.left > 0) {
                b.left -= dt;
                if (b.left <= 0) {
                    setBobber(null);
                    b.next = nextBobber(s);
                }
            } else {
                b.next -= dt;
                if (b.next <= 0) {
                    b.left = BOBBER_LIFETIME;
                    setBobber({ x: 8 + Math.random() * 84, y: 14 + Math.random() * 62 });
                }
            }

            if (sinceAch >= 1) {
                sinceAch = 0;
                const fresh = checkAchievements(s);
                if (fresh.length) say(`Trophy unlocked: ${fresh.join(", ")}`);
            }
            if (sinceSave >= 10) {
                sinceSave = 0;
                writeSave(s);
            }
            if (sinceRender >= 0.1) {
                sinceRender = 0;
                render();
            }
        }, 50);

        const flush = () => ref.current && writeSave(ref.current);
        const onVis = () => document.visibilityState === "hidden" && flush();
        window.addEventListener("beforeunload", flush);
        document.addEventListener("visibilitychange", onVis);
        return () => {
            clearInterval(id);
            flush();
            window.removeEventListener("beforeunload", flush);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [say]);

    // ---- Fullscreen ----
    useEffect(() => {
        const onFs = () => setIsFs(document.fullscreenElement === rootRef.current);
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    const toggleFs = useCallback(async () => {
        const el = rootRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
        } else if (pseudoFs) {
            setPseudoFs(false);
        } else if (el.requestFullscreen) {
            await el.requestFullscreen().catch(() => setPseudoFs(true));
        } else {
            setPseudoFs(true); // iOS Safari: no Fullscreen API on elements
        }
    }, [pseudoFs]);

    useEffect(() => {
        document.body.style.overflow = pseudoFs ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [pseudoFs]);

    // ---- Clicking ----
    const spawnFloat = (x: number, y: number, text: string, crit: boolean) => {
        const host = floatRef.current;
        if (!host) return;
        if (host.childElementCount > 24) host.firstElementChild?.remove();
        const el = document.createElement("span");
        el.className = crit ? "fi-float fi-crit" : "fi-float";
        el.textContent = (crit ? "☠ " : "+") + text;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.addEventListener("animationend", () => el.remove());
        host.appendChild(el);
    };

    const doClick = (x?: number, y?: number) => {
        const s = ref.current;
        if (!s) return;
        const d = derive(s);
        const crit = Math.random() < d.critChance;
        const v = d.click * (crit ? 1 + d.critDmg : 1);
        s.shards += v;
        s.total += v;
        s.clicks += 1;
        s.mining += 1;
        if (crit) {
            s.crits += 1;
            s.combat += 3;
        }
        if (s.fx && x !== undefined && y !== undefined) {
            spawnFloat(x + (Math.random() - 0.5) * 60, y - 20, fmt(v, s.sci), crit);
        }
    };

    const onPress = (e: React.PointerEvent<HTMLButtonElement>) => {
        const host = floatRef.current?.getBoundingClientRect();
        doClick(host ? e.clientX - host.left : undefined, host ? e.clientY - host.top : undefined);
    };

    const catchBobber = () => {
        const s = ref.current;
        if (!s) return;
        const d = derive(s);
        const lvl = skillLevel(s.fishing);
        const reward = Math.max(d.click * 40, d.cps * (30 + lvl));
        s.shards += reward;
        s.total += reward;
        s.bobbers += 1;
        s.fishing += 30;
        bob.current.left = 0;
        bob.current.next = nextBobber(s);
        setBobber(null);
        say(`Treasure! +${fmt(reward, s.sci)} shards`);
    };

    const replaceState = (n: State) => {
        ref.current = n;
        writeSave(n);
        render();
    };

    // ---- Keyboard ----
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
            if (e.code === "Space") {
                e.preventDefault();
                const host = floatRef.current?.getBoundingClientRect();
                doClick(host ? host.width / 2 : undefined, host ? host.height * 0.45 : undefined);
            } else if (e.key === "f" || e.key === "F") {
                toggleFs();
            } else if (e.key === "b" || e.key === "B") {
                const s = ref.current;
                if (s) {
                    const order = [1, 10, 100, -1];
                    s.buy = order[(order.indexOf(s.buy) + 1) % order.length];
                    render();
                }
            } else if (/^[1-9]$/.test(e.key)) {
                setTab(TABS[Number(e.key) - 1].id);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const s = ref.current;
    if (!ready || !s) {
        return (
            <div className="grid min-h-[480px] place-items-center rounded-3xl border border-white/10 font-minecraft text-sm text-muted-foreground">
                Loading your islands...
            </div>
        );
    }

    const d = derive(s);
    const island = ISLANDS.find((i) => i.id === s.island && s.total >= i.at) ?? ISLANDS[0];
    const nextIsland = ISLANDS.find((i) => s.total < i.at);
    const plan = rebirthPlan(s);
    const F = (n: number) => fmt(n, s.sci);
    const full = isFs || pseudoFs;
    const totalMinions = s.minions.reduce((a, b) => a + b, 0);

    const act = (fn: () => boolean) => {
        if (fn()) render();
    };
    const ctx: Ctx = { s, d, F, act, render, say, tip };

    // Dots on tabs that have something to spend on.
    const disc = minionDiscount(s);
    const dots: Partial<Record<TabId, boolean>> = {
        minions: MINIONS.some((m, i) => bulk(m.cost * disc, MINION_GROWTH, s.minions[i], s.shards, 1).cost <= s.shards && (i === 0 || s.minions[i] > 0 || s.total >= m.cost * 0.25)),
        upgrades: UPGRADES.some((u) => (s.ups[u.id] || 0) < u.max && s.shards >= upCost(u.id, s.ups[u.id] || 0)),
        rebirth: plan.count > 0,
    };

    return (
        <div
            ref={rootRef}
            className={
                full
                    ? "fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background"
                    : "relative flex flex-col overflow-hidden rounded-3xl border border-white/15"
            }
            style={{
                backgroundImage: `radial-gradient(ellipse at 25% -10%, ${tint(island.color, 24)}, transparent 60%), radial-gradient(ellipse at 90% 110%, ${tint(island.color, 14)}, transparent 55%)`,
                backgroundColor: "color-mix(in oklch, var(--background) 92%, black)",
            }}
        >
            <style>{CSS}</style>

            {/* HUD */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                    <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">Shards</div>
                    <div className="rainbow-text truncate font-minecraft text-3xl leading-none sm:text-4xl">
                        <McSymbol name="speed" /> {F(s.shards)}
                    </div>
                </div>
                <Stat label="Per second" value={F(income(d))} color="var(--mc-green)" />
                <Stat label="Per click" value={F(d.click)} color="var(--mc-aqua)" />
                <Stat label="Multiplier" value={`x${F(d.all)}`} color="var(--mc-gold)" />
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-white/15">
                        {BUY_OPTIONS.map((o) => (
                            <button
                                key={o.v}
                                type="button"
                                onClick={() => {
                                    s.buy = o.v;
                                    render();
                                }}
                                className="px-2.5 py-1.5 font-rubik text-xs font-semibold transition-colors"
                                style={s.buy === o.v ? { backgroundColor: tint("var(--mc-aqua)", 25), color: "var(--mc-aqua)" } : { color: "var(--muted-foreground)" }}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                    <IconBtn label={full ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={toggleFs}>
                        {full ? <Minimize className="size-4" /> : <Expand className="size-4" />}
                    </IconBtn>
                </div>
            </div>

            <div className={`grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] ${full ? "" : "lg:h-[680px]"}`}>
                {/* Button side */}
                <div className="relative flex flex-col items-center justify-center gap-5 overflow-hidden px-4 py-8 lg:border-r lg:border-white/10">
                    <div className="flex flex-wrap items-center justify-center gap-2 font-minecraft text-sm" style={{ color: island.color }}>
                        <McSymbol name={island.symbol} color={island.color} /> {island.name}
                        <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(island.color, 50) }}>x{island.mult}</span>
                        <span className="rounded-full border border-white/15 px-2 py-0.5 font-rubik text-[10px] text-muted-foreground">
                            {totalMinions.toLocaleString()} minion{totalMinions === 1 ? "" : "s"}
                        </span>
                    </div>

                    <div className="relative my-6">
                        <div className="fi-pulse pointer-events-none absolute -inset-6 rounded-[2.5rem] blur-2xl" style={{ backgroundColor: tint(island.color, 40) }} />
                        <Orbit counts={s.minions} />
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-label="Click for shards"
                            onPointerDown={onPress}
                            className="fi-btn relative z-[1] grid size-48 touch-manipulation select-none place-items-center rounded-[2rem] border-4 sm:size-56"
                            style={{
                                borderColor: island.color,
                                backgroundImage: `linear-gradient(160deg, ${tint(island.color, 55)}, ${tint(island.color, 18)})`,
                                boxShadow: `0 8px 0 ${tint(island.color, 70)}, 0 0 40px ${tint(island.color, 45)}, inset 0 2px 0 rgba(255,255,255,0.35)`,
                                WebkitTapHighlightColor: "transparent",
                            }}
                        >
                            <span className="text-7xl text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.5)] sm:text-8xl">
                                <McSymbol name="speed" />
                            </span>
                        </button>
                        <div ref={floatRef} className="pointer-events-none absolute -inset-16 z-[4]" aria-hidden="true" />
                    </div>

                    <div className="text-center font-rubik text-xs text-muted-foreground">
                        Press <Kbd>Space</Kbd> or click. Crit {Math.round(d.critChance * 100)}% for +{Math.round(d.critDmg * 100)}%.
                    </div>

                    <div className="w-full max-w-sm space-y-2">
                        {nextIsland && (
                            <Progress label={`Next island: ${nextIsland.name}`} color={nextIsland.color} pct={Math.log10(Math.max(1, s.total)) / Math.log10(nextIsland.at)} right={F(nextIsland.at)} />
                        )}
                        <Progress
                            label={plan.count > 0 ? `Rebirth x${plan.count} ready!` : `Rebirth ${s.rebirths + 1}`}
                            color="var(--mc-light-purple)"
                            pct={Math.log10(Math.max(1, s.shards)) / Math.log10(rebirthCost(s.rebirths))}
                            right={F(rebirthCost(s.rebirths))}
                        />
                    </div>

                    {bobber && (
                        <button
                            type="button"
                            onClick={catchBobber}
                            aria-label="Catch the treasure bobber"
                            className="fi-bob fi-pop absolute z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-2xl"
                            style={{
                                left: `${bobber.x}%`,
                                top: `${bobber.y}%`,
                                color: "var(--mc-aqua)",
                                borderColor: "var(--mc-aqua)",
                                backgroundColor: tint("var(--mc-aqua)", 25),
                                boxShadow: `0 0 24px ${tint("var(--mc-aqua)", 70)}`,
                            }}
                        >
                            <McSymbol name="fishing" />
                        </button>
                    )}
                </div>

                {/* Panels */}
                <div className="flex min-h-0 flex-col">
                    <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-2 [scrollbar-width:none]">
                        {TABS.map((t, i) => {
                            const on = tab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                        tip.hide();
                                        setTab(t.id);
                                    }}
                                    title={`${t.label} (${i + 1})`}
                                    className="relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-minecraft text-xs transition-colors"
                                    style={on ? { backgroundColor: tint("var(--mc-aqua)", 18), color: "var(--mc-aqua)", boxShadow: `inset 0 0 0 1px ${tint("var(--mc-aqua)", 45)}` } : { color: "var(--muted-foreground)" }}
                                >
                                    <McSymbol name={t.symbol} /> {t.label}
                                    {dots[t.id] && !on && (
                                        <span className="absolute right-1 top-1 size-1.5 rounded-full" style={{ backgroundColor: "var(--mc-green)", boxShadow: "0 0 6px var(--mc-green)" }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="min-h-[360px] flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
                        {tab === "minions" && <MinionsTab {...ctx} />}
                        {tab === "upgrades" && <UpgradesTab {...ctx} />}
                        {tab === "islands" && <IslandsTab {...ctx} />}
                        {tab === "skills" && <SkillsTab {...ctx} />}
                        {tab === "stats" && <StatsTab {...ctx} />}
                        {tab === "rebirth" && <RebirthTab {...ctx} />}
                        {tab === "trophies" && <TrophiesTab {...ctx} />}
                        {tab === "soon" && <SoonTab {...ctx} />}
                        {tab === "settings" && <SettingsTab {...ctx} replaceState={replaceState} />}
                    </div>
                </div>
            </div>

            <div ref={tipRef} className="pointer-events-none absolute left-0 top-0 z-30" aria-hidden="true">
                <div className="fi-tip" data-open={tipState.open}>
                    {tipState.id && <UpgradeTip id={tipState.id} s={s} d={d} F={F} />}
                </div>
            </div>

            {toast && (
                <div
                    role="status"
                    className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[90%] -translate-x-1/2 rounded-xl border px-4 py-2 text-center font-rubik text-xs backdrop-blur-md"
                    style={{ borderColor: tint("var(--mc-yellow)", 55), backgroundColor: "color-mix(in oklch, var(--background) 85%, transparent)", color: "var(--mc-yellow)" }}
                >
                    {toast}
                </div>
            )}
        </div>
    );
}

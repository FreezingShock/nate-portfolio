"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Download, Expand, Lock, Minimize, RotateCcw, Save, Upload } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    ACHIEVEMENTS,
    COMING_SOON,
    ISLANDS,
    MILESTONES,
    MINIONS,
    MINION_GROWTH,
    REBIRTH_UPS,
    UPGRADES,
    rebirthCost,
    type State,
} from "@/lib/fractured-idle/data";
import {
    SKILL_CAP,
    advance,
    bulk,
    buyMinion,
    buyRebirthUp,
    buyUpgrade,
    checkAchievements,
    derive,
    exportSave,
    fmt,
    fmtTime,
    importSave,
    loadGame,
    milestoneMult,
    minionDiscount,
    newState,
    offlineEff,
    rebirth,
    rebirthTokens,
    skillLevel,
    skillXpFor,
    startShards,
    writeSave,
} from "@/lib/fractured-idle/engine";

// Fractured Idle: a button-simulator incremental with SkyBlock flavor.
// State lives in a ref and is mutated by the pure functions in
// lib/fractured-idle/engine; a 50ms interval advances the simulation and a
// 100ms re-render keeps the UI live, so clicking never waits on React.

const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;

const TABS = [
    { id: "minions", label: "Minions", symbol: "forge" },
    { id: "upgrades", label: "Upgrades", symbol: "strength" },
    { id: "islands", label: "Islands", symbol: "location" },
    { id: "skills", label: "Skills", symbol: "wisdom" },
    { id: "rebirth", label: "Rebirth", symbol: "portal" },
    { id: "trophies", label: "Trophies", symbol: "pristine" },
    { id: "soon", label: "Soon", symbol: "comet" },
    { id: "settings", label: "Settings", symbol: "defense" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BUY_OPTIONS = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "Max" },
];

const CSS = `
.fi-float{position:absolute;transform:translate(-50%,-50%);font-family:var(--font-minecraft,inherit);font-size:1.05rem;color:#fff;text-shadow:0 2px 0 #000,0 0 10px currentColor;animation:fi-rise .9s ease-out forwards;pointer-events:none;will-change:transform,opacity;white-space:nowrap}
.fi-crit{color:var(--mc-yellow);font-size:1.5rem}
@keyframes fi-rise{from{opacity:1;transform:translate(-50%,-50%) scale(.9)}to{opacity:0;transform:translate(-50%,-260%) scale(1.15)}}
.fi-btn{transition:transform .06s ease,box-shadow .2s ease}
.fi-btn:active{transform:translateY(6px) scale(.98)}
@keyframes fi-pulse{0%,100%{opacity:.55}50%{opacity:1}}
.fi-pulse{animation:fi-pulse 2.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.fi-float{animation-duration:.01s}.fi-pulse{animation:none}.fi-btn{transition:none}}
`;

export function FracturedIdle() {
    const ref = useRef<State | null>(null);
    const [ready, setReady] = useState(false);
    const [, render] = useReducer((x: number) => x + 1, 0);
    const [tab, setTab] = useState<TabId>("minions");
    const [toast, setToast] = useState<string | null>(null);
    const [isFs, setIsFs] = useState(false);
    const [pseudoFs, setPseudoFs] = useState(false);
    const [confirmRebirth, setConfirmRebirth] = useState(false);
    const [saveText, setSaveText] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);
    const floatRef = useRef<HTMLDivElement>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const say = useCallback((msg: string) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    // ---- Load + game loop ----
    useEffect(() => {
        const { state, offline } = loadGame();
        ref.current = state;
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
        if (s.fx && x !== undefined && y !== undefined) {
            spawnFloat(x + (Math.random() - 0.5) * 60, y - 20, fmt(v, s.sci), crit);
        }
    };

    const onPress = (e: React.PointerEvent<HTMLButtonElement>) => {
        const host = floatRef.current?.getBoundingClientRect();
        doClick(host ? e.clientX - host.left : undefined, host ? e.clientY - host.top : undefined);
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
            } else if (/^[1-8]$/.test(e.key)) {
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
    const rCost = rebirthCost(s.rebirths);
    const canRebirth = s.shards >= rCost;
    const F = (n: number) => fmt(n, s.sci);
    const full = isFs || pseudoFs;

    const act = (fn: () => boolean) => {
        if (fn()) render();
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
                    <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">
                        Shards
                    </div>
                    <div className="rainbow-text truncate font-minecraft text-3xl leading-none sm:text-4xl">
                        <McSymbol name="speed" /> {F(s.shards)}
                    </div>
                </div>
                <Stat label="Per second" value={F(d.cps + d.auto * d.avgClick)} color="var(--mc-green)" />
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
                                style={
                                    s.buy === o.v
                                        ? { backgroundColor: tint("var(--mc-aqua)", 25), color: "var(--mc-aqua)" }
                                        : { color: "var(--muted-foreground)" }
                                }
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

            <div
                className={`grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] ${full ? "" : "lg:h-[640px]"}`}
            >
                {/* Button side */}
                <div className="relative flex flex-col items-center justify-center gap-5 px-4 py-8 lg:border-r lg:border-white/10">
                    <div className="flex items-center gap-2 font-minecraft text-sm" style={{ color: island.color }}>
                        <McSymbol name={island.symbol} color={island.color} /> {island.name}
                        <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(island.color, 50) }}>
                            x{island.mult}
                        </span>
                    </div>

                    <div className="relative">
                        <div
                            className="fi-pulse pointer-events-none absolute -inset-6 rounded-[2.5rem] blur-2xl"
                            style={{ backgroundColor: tint(island.color, 40) }}
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-label="Click for shards"
                            onPointerDown={onPress}
                            className="fi-btn relative grid size-52 touch-manipulation select-none place-items-center rounded-[2rem] border-4 sm:size-60"
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
                        <div ref={floatRef} className="pointer-events-none absolute -inset-16" aria-hidden="true" />
                    </div>

                    <div className="text-center font-rubik text-xs text-muted-foreground">
                        Press <Kbd>Space</Kbd> or click. Crit {Math.round(d.critChance * 100)}% for +{Math.round(d.critDmg * 100)}%.
                    </div>

                    <div className="w-full max-w-sm space-y-2">
                        {nextIsland && (
                            <Progress
                                label={`Next island: ${nextIsland.name}`}
                                color={nextIsland.color}
                                pct={Math.log10(Math.max(1, s.total)) / Math.log10(nextIsland.at)}
                                right={F(nextIsland.at)}
                            />
                        )}
                        <Progress
                            label={`Rebirth ${s.rebirths + 1}`}
                            color="var(--mc-light-purple)"
                            pct={Math.log10(Math.max(1, s.shards)) / Math.log10(rCost)}
                            right={F(rCost)}
                        />
                    </div>
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
                                    onClick={() => setTab(t.id)}
                                    title={`${t.label} (${i + 1})`}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-minecraft text-xs transition-colors"
                                    style={
                                        on
                                            ? { backgroundColor: tint("var(--mc-aqua)", 18), color: "var(--mc-aqua)", boxShadow: `inset 0 0 0 1px ${tint("var(--mc-aqua)", 45)}` }
                                            : { color: "var(--muted-foreground)" }
                                    }
                                >
                                    <McSymbol name={t.symbol} /> {t.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="min-h-[360px] flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
                        {tab === "minions" &&
                            MINIONS.map((m, i) => {
                                const owned = s.minions[i];
                                const { n, cost } = bulk(m.cost * minionDiscount(s), MINION_GROWTH, owned, s.shards, s.buy);
                                const shown = n < 1 ? bulk(m.cost * minionDiscount(s), MINION_GROWTH, owned, s.shards, 1) : { n, cost };
                                const can = n >= 1 && cost <= s.shards;
                                const next = MILESTONES.find((x) => x > owned);
                                const visible = i === 0 || owned > 0 || s.total >= m.cost * 0.25;
                                if (!visible) {
                                    const firstHidden = MINIONS.findIndex((x, j) => j > 0 && s.minions[j] === 0 && s.total < x.cost * 0.25);
                                    return i === firstHidden ? <Teaser key={m.id} text="More minions appear as you grow" /> : null;
                                }
                                return (
                                    <ShopRow
                                        key={m.id}
                                        color={m.color}
                                        symbol={m.symbol}
                                        title={m.name}
                                        badge={owned > 0 ? `x${owned}` : undefined}
                                        sub={`${F(d.minionCps[i] / Math.max(1, owned))} /s each${milestoneMult(owned) > 1 ? `  ·  milestone x${milestoneMult(owned)}` : ""}${next ? `  ·  next x2 at ${next}` : ""}`}
                                        price={`${F(shown.cost)}`}
                                        buyLabel={`Buy ${shown.n > 1 ? shown.n : ""}`.trim()}
                                        can={can}
                                        onClick={() => act(() => buyMinion(s, i))}
                                    />
                                );
                            })}

                        {tab === "upgrades" &&
                            [...UPGRADES]
                                .sort((a, b) => Number(a.max === 1) - Number(b.max === 1) || a.cost - b.cost)
                                .map((u) => {
                                    const lvl = s.ups[u.id] || 0;
                                    const maxed = lvl >= u.max;
                                    const cost = u.cost * Math.pow(u.growth, lvl);
                                    if (maxed && u.max === 1) return null;
                                    return (
                                        <ShopRow
                                            key={u.id}
                                            color={u.color}
                                            symbol={u.symbol}
                                            title={u.name}
                                            badge={u.max > 1 ? `${lvl}/${u.max}` : undefined}
                                            sub={u.desc}
                                            price={maxed ? "MAX" : F(cost)}
                                            buyLabel="Buy"
                                            can={!maxed && s.shards >= cost}
                                            onClick={() => act(() => buyUpgrade(s, u.id))}
                                        />
                                    );
                                })}

                        {tab === "islands" &&
                            ISLANDS.map((i) => {
                                const open = s.total >= i.at;
                                const active = island.id === i.id;
                                return (
                                    <button
                                        key={i.id}
                                        type="button"
                                        disabled={!open}
                                        onClick={() => {
                                            s.island = i.id;
                                            render();
                                        }}
                                        className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors enabled:hover:bg-white/5 disabled:opacity-50"
                                        style={{ borderColor: active ? i.color : "rgba(255,255,255,0.1)", backgroundColor: active ? tint(i.color, 12) : undefined }}
                                    >
                                        <Badge color={i.color}>{open ? <McSymbol name={i.symbol} /> : <Lock className="size-4" />}</Badge>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-minecraft text-sm" style={{ color: i.color }}>{i.name}</div>
                                            <div className="font-rubik text-[11px] text-muted-foreground">{open ? i.blurb : `Unlocks at ${F(i.at)} lifetime shards`}</div>
                                        </div>
                                        <div className="font-minecraft text-sm" style={{ color: i.color }}>x{i.mult}</div>
                                    </button>
                                );
                            })}

                        {tab === "skills" && (
                            <>
                                <SkillCard name="Mining" symbol="strength" color="var(--mc-gold)" xp={s.mining} blurb="Every click grants XP. +3% click power per level." />
                                <SkillCard name="Farming" symbol="fortune" color="var(--mc-green)" xp={s.farming} blurb="Minions grant XP over time. +3% minion output per level." />
                                <Teaser text="Combat, Fishing and Foraging skills: planned" />
                            </>
                        )}

                        {tab === "rebirth" && (
                            <>
                                <div className="rounded-xl border p-4" style={{ borderColor: tint("var(--mc-light-purple)", 45), backgroundColor: tint("var(--mc-light-purple)", 8) }}>
                                    <div className="mb-1 font-minecraft text-sm" style={{ color: "var(--mc-light-purple)" }}>
                                        <McSymbol name="portal" /> Rebirth {s.rebirths + 1}
                                    </div>
                                    <p className="font-rubik text-xs text-muted-foreground">
                                        Resets your shards, minions and upgrades. You keep islands, skills, trophies and rebirth upgrades.
                                        Each rebirth multiplies everything by x{(1.5 + 0.05 * (s.rups.core || 0)).toFixed(2)} (now x{F(d.rMult)} total) and grants tokens.
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        {confirmRebirth ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        act(() => rebirth(s));
                                                        setConfirmRebirth(false);
                                                        say("Reborn! Spend your tokens below.");
                                                    }}
                                                    className="rounded-lg px-4 py-2 font-minecraft text-xs text-black"
                                                    style={{ backgroundColor: "var(--mc-light-purple)" }}
                                                >
                                                    Confirm rebirth
                                                </button>
                                                <button type="button" onClick={() => setConfirmRebirth(false)} className="font-rubik text-xs text-muted-foreground underline">
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={!canRebirth}
                                                onClick={() => setConfirmRebirth(true)}
                                                className="rounded-lg px-4 py-2 font-minecraft text-xs text-black transition-opacity disabled:opacity-40"
                                                style={{ backgroundColor: "var(--mc-light-purple)" }}
                                            >
                                                {canRebirth ? `Rebirth for +${rebirthTokens(s)} tokens` : `Need ${F(rCost)} shards`}
                                            </button>
                                        )}
                                        <span className="font-rubik text-xs text-muted-foreground">
                                            Tokens: <b style={{ color: "var(--mc-yellow)" }}>{s.tokens}</b>
                                            {startShards(s) > 0 && `  ·  start with ${F(startShards(s))}`}
                                        </span>
                                    </div>
                                </div>
                                {REBIRTH_UPS.map((u) => {
                                    const lvl = s.rups[u.id] || 0;
                                    const maxed = lvl >= u.max;
                                    const cost = Math.ceil(u.cost * Math.pow(u.growth, lvl));
                                    return (
                                        <ShopRow
                                            key={u.id}
                                            color={u.color}
                                            symbol={u.symbol}
                                            title={u.name}
                                            badge={`${lvl}/${u.max}`}
                                            sub={u.desc}
                                            price={maxed ? "MAX" : `${cost} tokens`}
                                            buyLabel="Buy"
                                            can={!maxed && s.tokens >= cost}
                                            onClick={() => act(() => buyRebirthUp(s, u.id))}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {tab === "trophies" && (
                            <>
                                <p className="font-rubik text-xs text-muted-foreground">
                                    {s.ach.length}/{ACHIEVEMENTS.length} unlocked. Each trophy adds +1% to everything.
                                </p>
                                {ACHIEVEMENTS.map((a) => {
                                    const got = s.ach.includes(a.id);
                                    return (
                                        <div key={a.id} className={`flex items-center gap-3 rounded-xl border border-white/10 p-3 ${got ? "" : "opacity-45"}`}>
                                            <Badge color={got ? "var(--mc-yellow)" : "var(--muted-foreground)"}>
                                                {got ? <McSymbol name="check" /> : <Lock className="size-4" />}
                                            </Badge>
                                            <div>
                                                <div className="font-minecraft text-sm" style={{ color: got ? "var(--mc-yellow)" : undefined }}>{a.name}</div>
                                                <div className="font-rubik text-[11px] text-muted-foreground">{a.desc}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {tab === "soon" &&
                            COMING_SOON.map((c) => (
                                <div key={c.name} className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 p-3 opacity-80">
                                    <Badge color={c.color}><McSymbol name={c.symbol} /></Badge>
                                    <div className="flex-1">
                                        <div className="font-minecraft text-sm" style={{ color: c.color }}>{c.name}</div>
                                        <div className="font-rubik text-[11px] text-muted-foreground">{c.desc}</div>
                                    </div>
                                    <span className="rounded-full border border-white/15 px-2 py-0.5 font-rubik text-[10px] text-muted-foreground">Planned</span>
                                </div>
                            ))}

                        {tab === "settings" && (
                            <>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <MiniStat label="Clicks" value={F(s.clicks)} />
                                    <MiniStat label="Lifetime shards" value={F(s.total)} />
                                    <MiniStat label="Rebirths" value={String(s.rebirths)} />
                                    <MiniStat label="Play time" value={fmtTime(s.playTime)} />
                                </div>
                                <Toggle label="Scientific notation" on={s.sci} onChange={(v) => { s.sci = v; render(); }} />
                                <Toggle label="Floating click numbers" on={s.fx} onChange={(v) => { s.fx = v; render(); }} />
                                <p className="font-rubik text-[11px] text-muted-foreground">
                                    Offline progress: {Math.round(offlineEff(s) * 100)}% efficiency, up to 8 hours. Saves to this browser every 10 seconds.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <ActionBtn icon={<Save className="size-4" />} onClick={() => { writeSave(s); say("Saved."); }}>Save now</ActionBtn>
                                    <ActionBtn icon={<Download className="size-4" />} onClick={() => { setSaveText(exportSave(s)); say("Save code ready below. Copy it somewhere safe."); }}>Export</ActionBtn>
                                    <ActionBtn
                                        icon={<Upload className="size-4" />}
                                        onClick={() => {
                                            const n = importSave(saveText);
                                            if (!n) return say("That save code isn't valid.");
                                            ref.current = n;
                                            writeSave(n);
                                            render();
                                            say("Save imported.");
                                        }}
                                    >
                                        Import
                                    </ActionBtn>
                                    <ActionBtn
                                        icon={<RotateCcw className="size-4" />}
                                        danger
                                        onClick={() => {
                                            if (!window.confirm("Delete your Fractured Idle save? This cannot be undone.")) return;
                                            const n = newState();
                                            ref.current = n;
                                            writeSave(n);
                                            render();
                                        }}
                                    >
                                        Hard reset
                                    </ActionBtn>
                                </div>
                                <textarea
                                    value={saveText}
                                    onChange={(e) => setSaveText(e.target.value)}
                                    placeholder="Save code appears here after Export. Paste one and press Import."
                                    className="h-24 w-full resize-none rounded-lg border border-white/15 bg-black/30 p-2 font-mono text-[11px]"
                                />
                                <p className="font-rubik text-[11px] text-muted-foreground">
                                    Keys: Space click · F fullscreen · B buy amount · 1-8 tabs
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {toast && (
                <div
                    role="status"
                    className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-xl border px-4 py-2 text-center font-rubik text-xs backdrop-blur-md"
                    style={{ borderColor: tint("var(--mc-yellow)", 55), backgroundColor: "color-mix(in oklch, var(--background) 85%, transparent)", color: "var(--mc-yellow)" }}
                >
                    {toast}
                </div>
            )}
        </div>
    );
}

// ---- Small pieces ----

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="font-minecraft text-lg leading-none" style={{ color }}>{value}</div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-white/10 p-2 text-center">
            <div className="font-rubik text-[10px] text-muted-foreground">{label}</div>
            <div className="font-minecraft text-sm">{value}</div>
        </div>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">{children}</kbd>;
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl text-lg" style={{ color, backgroundColor: tint(color, 16), boxShadow: `inset 0 0 0 1px ${tint(color, 35)}` }}>
            {children}
        </span>
    );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" title={label} aria-label={label} onClick={onClick} className="grid size-9 place-items-center rounded-lg border border-white/15 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
            {children}
        </button>
    );
}

function ActionBtn({ icon, onClick, danger, children }: { icon: React.ReactNode; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-rubik text-xs font-semibold transition-colors hover:bg-white/10"
            style={{ borderColor: danger ? tint("var(--mc-red)", 55) : "rgba(255,255,255,0.15)", color: danger ? "var(--mc-red)" : undefined }}
        >
            {icon} {children}
        </button>
    );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 font-rubik text-xs">
            {label}
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: tint(on ? "var(--mc-green)" : "var(--muted-foreground)", 20), color: on ? "var(--mc-green)" : undefined }}>
                {on ? "ON" : "OFF"}
            </span>
        </button>
    );
}

function Teaser({ text }: { text: string }) {
    return <div className="rounded-xl border border-dashed border-white/15 p-3 text-center font-rubik text-xs text-muted-foreground">{text}</div>;
}

function Progress({ label, pct, color, right }: { label: string; pct: number; color: string; right: string }) {
    const p = Math.max(0, Math.min(1, pct));
    return (
        <div>
            <div className="mb-1 flex justify-between font-rubik text-[10px] text-muted-foreground">
                <span>{label}</span>
                <span>{right}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${p * 100}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
            </div>
        </div>
    );
}

function ShopRow({
    color, symbol, title, badge, sub, price, buyLabel, can, onClick,
}: {
    color: string;
    symbol: React.ComponentProps<typeof McSymbol>["name"];
    title: string;
    badge?: string;
    sub: string;
    price: string;
    buyLabel: string;
    can: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={!can}
            onClick={onClick}
            className="group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all enabled:hover:-translate-y-px enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-55"
            style={{ borderColor: can ? tint(color, 55) : "rgba(255,255,255,0.1)", boxShadow: can ? `0 0 16px -6px ${color}` : undefined }}
        >
            <Badge color={color}><McSymbol name={symbol} /></Badge>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate font-minecraft text-sm" style={{ color }}>{title}</span>
                    {badge && <span className="rounded-full border border-white/15 px-1.5 font-rubik text-[10px] text-muted-foreground">{badge}</span>}
                </div>
                <div className="truncate font-rubik text-[11px] text-muted-foreground">{sub}</div>
            </div>
            <div className="shrink-0 text-right">
                <div className="font-minecraft text-sm" style={{ color: can ? "var(--mc-yellow)" : undefined }}>{price}</div>
                <div className="font-rubik text-[10px] text-muted-foreground">{buyLabel}</div>
            </div>
        </button>
    );
}

function SkillCard({ name, symbol, color, xp, blurb }: { name: string; symbol: React.ComponentProps<typeof McSymbol>["name"]; color: string; xp: number; blurb: string }) {
    const lvl = skillLevel(xp);
    const lo = skillXpFor(lvl);
    const hi = skillXpFor(lvl + 1);
    return (
        <div className="rounded-xl border border-white/10 p-3">
            <div className="mb-1 flex items-center gap-3">
                <Badge color={color}><McSymbol name={symbol} /></Badge>
                <div className="flex-1">
                    <div className="font-minecraft text-sm" style={{ color }}>{name} {lvl}<span className="text-muted-foreground">/{SKILL_CAP}</span></div>
                    <div className="font-rubik text-[11px] text-muted-foreground">{blurb}</div>
                </div>
                <div className="font-minecraft text-sm" style={{ color }}>+{lvl * 3}%</div>
            </div>
            <Progress label={lvl >= SKILL_CAP ? "Maxed" : "XP to next level"} color={color} pct={lvl >= SKILL_CAP ? 1 : (xp - lo) / (hi - lo)} right={lvl >= SKILL_CAP ? "MAX" : `${fmt(xp - lo)} / ${fmt(hi - lo)}`} />
        </div>
    );
}

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Dices, Lock, RotateCcw, Save, Sparkles } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    CATS,
    COLLECTION_PER_LOOK,
    DEFAULT_LOOKS,
    HEAT_SECONDS,
    HOLD_BASE,
    LOADOUTS,
    PREF_KEY,
    SET_BONUS,
    STAT_LABEL,
    bonusText,
    btnBonus,
    critColorOf,
    holdMax,
    isUnlocked,
    lookKey,
    lookProgress,
    statValue,
    totalLooks,
    countUnlocked,
    type Cat,
    type Looks,
    type LookDef,
} from "@/lib/fractured-idle/button";
import { ISLANDS } from "@/lib/fractured-idle/data";
import { kick, spawnBurst, spawnCrit, spawnNumber } from "./button-fx";
import { Aura, ButtonFace, skinAccent } from "./button-face";
import { Toggle, tint, type Ctx } from "./ui";

// Button tab: the wardrobe for the click button. A sticky stage on top shows
// your button live; hovering (or tapping) any look previews it there, and
// clicking equips it. Looks unlock from progress; the functional ones pay a
// bonus while equipped, and every look you own adds to a collection bonus.

const C = "var(--mc-aqua)";
type Page = Cat | "setup";

const FX_ICON: Record<string, string> = {
    ripple: "◎", sparks: "✷", pixels: "▦", bubbles: "○", stars: "✦", hearts: "♥", embers: "♨", leaves: "❦", coins: "●", frost: "❄", confetti: "✺", shock: "☄", runes: "ᚠ", lightning: "ϟ", fireworks: "✹", spiral: "꩜",
    pulse: "◉", bolt: "ϟ", cross: "✚", shatter: "✧", meteor: "☄", implode: "◍", nova: "✸",
};

function Bar({ f, color = C }: { f: number; color?: string }) {
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        </div>
    );
}

function Chip({ children, color = "var(--mc-green)" }: { children: ReactNode; color?: string }) {
    return (
        <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(color, 55), color }}>
            {children}
        </span>
    );
}

export function ButtonTab({ s, render, F }: Ctx) {
    const b = s.btn;
    const [page, setPage] = useState<Page>("shape");
    const [ov, setOv] = useState<Partial<Looks>>({});
    const [hint, setHint] = useState<string | null>(null);
    const host = useRef<HTMLDivElement>(null);
    const face = useRef<HTMLButtonElement>(null);
    const wrap = useRef<HTMLDivElement>(null);
    const flip = useRef(false);
    const island = ISLANDS.find((i) => i.id === s.island && s.total >= i.at) ?? ISLANDS[0];
    const looks: Looks = { ...b, ...ov };
    const accent = skinAccent(looks.skin, island.color);
    const bonus = btnBonus(s);
    const looksRef = useRef(looks);
    looksRef.current = looks;

    // ---- Stage ----
    const fire = useCallback(
        (crit: boolean, at?: { x: number; y: number }) => {
            const h = host.current;
            if (!h) return;
            const r = h.getBoundingClientRect();
            const x = at?.x ?? r.width / 2;
            const y = at?.y ?? r.height / 2;
            const L = looksRef.current;
            const ac = skinAccent(L.skin, island.color);
            const col = critColorOf(L.color, ac, Math.floor(Math.random() * 7));
            spawnNumber(h, x, y - 14, crit ? "✦ 1.2K" : "+240", { crit, color: col, accent: ac, style: L.nums });
            spawnBurst(h, L.burst, x, y, ac);
            if (crit) spawnCrit(h, L.crit, x, y, col);
            kick(face.current, crit, 0);
            const w = wrap.current;
            if (w) {
                flip.current = !flip.current;
                w.style.setProperty("--crit", col);
                w.classList.remove("fi-hit-a", "fi-hit-b", "fi-crit-a", "fi-crit-b");
                w.classList.add(`${crit ? "fi-crit" : "fi-hit"}-${flip.current ? "a" : "b"}`);
            }
        },
        [island.color],
    );

    // While a look is being previewed, keep playing its effect so you can judge it.
    const previewing = Object.keys(ov).length > 0;
    useEffect(() => {
        if (!previewing) return;
        const k = Object.keys(ov)[0] as keyof Looks;
        const critish = k === "crit" || k === "color";
        const t0 = setTimeout(() => fire(critish), 80);
        const id = setInterval(() => fire(critish || (k === "nums" && Math.random() < 0.4)), 950);
        return () => {
            clearTimeout(t0);
            clearInterval(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewing, Object.values(ov).join("|"), fire]);

    const stageClick = (e: React.PointerEvent, crit?: boolean) => {
        const h = host.current;
        if (!h) return;
        const r = h.getBoundingClientRect();
        fire(crit ?? Math.random() < 0.25, { x: e.clientX - r.left, y: e.clientY - r.top });
    };

    // ---- Actions ----
    const markSeen = (key: string) => {
        if (!b.seen.includes(key)) {
            b.seen.push(key);
            render();
        }
    };
    const equip = (cat: Cat, l: LookDef) => {
        const key = lookKey(cat, l.id);
        markSeen(key);
        if (!isUnlocked(s, l)) {
            setOv({ [PREF_KEY[cat]]: l.id });
            setHint(l.need ? `Locked: reach ${F(l.need.n)} ${STAT_LABEL[l.need.stat]} (you have ${F(statValue(s, l.need.stat))}).` : null);
            return;
        }
        b[PREF_KEY[cat]] = l.id;
        setOv({});
        setHint(null);
        render();
        setTimeout(() => fire(cat === "crit" || cat === "color"), 40);
    };
    const preview = (cat: Cat, l: LookDef, e?: React.PointerEvent) => {
        if (e && e.pointerType !== "mouse") return;
        markSeen(lookKey(cat, l.id));
        setOv({ [PREF_KEY[cat]]: l.id });
    };
    const unpreview = (e?: React.PointerEvent) => {
        if (e && e.pointerType !== "mouse") return;
        setOv({});
    };
    const randomize = () => {
        for (const c of CATS) {
            const ok = c.list.filter((l) => isUnlocked(s, l));
            b[PREF_KEY[c.id]] = ok[Math.floor(Math.random() * ok.length)].id;
        }
        setOv({});
        render();
        setTimeout(() => fire(true), 40);
    };
    const pickLooks = (L: Looks) => {
        Object.assign(b, L);
        setOv({});
        render();
        setTimeout(() => fire(false), 40);
    };

    // ---- Derived for display ----
    const total = totalLooks();
    const have = countUnlocked(s);
    const newIn = (c: Cat) => CATS.find((x) => x.id === c)!.list.filter((l) => l.need && isUnlocked(s, l) && !b.seen.includes(lookKey(c, l.id))).length;
    const cat = CATS.find((c) => c.id === page);

    // Closest look still locked, across everything.
    let next: { cat: Cat; l: LookDef; f: number } | null = null;
    for (const c of CATS) for (const l of c.list) if (!isUnlocked(s, l)) {
        const f = lookProgress(s, l);
        if (!next || f > next.f) next = { cat: c.id, l, f };
    }

    // What the stage is currently showing.
    const shown = previewing ? CATS.find((c) => PREF_KEY[c.id] === Object.keys(ov)[0])! : null;
    const shownLook = shown ? shown.list.find((l) => l.id === Object.values(ov)[0]) : null;
    const locked = shownLook ? !isUnlocked(s, shownLook) : false;

    const equippedOf = (c: { id: Cat; list: LookDef[] }) => b[PREF_KEY[c.id]];

    return (
        <>
            {/* Sticky stage + category pills */}
            <div className="sticky -top-3 z-20 -mx-3 -mt-3 border-b border-white/10 px-3 pb-2 pt-3 backdrop-blur-md" style={{ backgroundColor: "color-mix(in oklch, var(--background) 88%, black)" }}>
                <div className="flex gap-3">
                    <div ref={host} className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 sm:h-40 sm:w-64" style={{ backgroundImage: `radial-gradient(circle at 50% 55%, ${tint(accent, 18)}, transparent 65%)` }}>
                        <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 sm:size-28">
                            <Aura id={looks.aura} accent={accent} />
                            <ButtonFace
                                as="button"
                                shape={looks.shape}
                                skin={looks.skin}
                                glyph={looks.glyph}
                                color={island.color}
                                depth={5}
                                className="relative z-[1] size-full"
                                btnRef={face}
                                wrapRef={wrap}
                                btnProps={{ onPointerDown: (e) => stageClick(e), onContextMenu: (e) => e.preventDefault(), "aria-label": "Test your button look" }}
                            />
                        </div>
                        <span className="pointer-events-none absolute bottom-1 left-2 font-rubik text-[9px] text-muted-foreground">tap to test</span>
                        <button
                            type="button"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                stageClick(e, true);
                            }}
                            className="absolute bottom-1 right-1 z-[5] rounded-md border px-2 py-0.5 font-minecraft text-[10px] transition-colors hover:bg-white/10"
                            style={{ borderColor: tint(critColorOf(looks.color, accent, 0), 70), color: critColorOf(looks.color, accent, 0) }}
                        >
                            Crit!
                        </button>
                    </div>
                    <div className="hidden min-w-0 flex-1 flex-col justify-center gap-1.5 font-rubik text-xs sm:flex">
                        <div className="truncate font-minecraft text-sm" style={{ color: locked ? "var(--mc-yellow)" : C }}>
                            {shownLook ? `${locked ? "Preview: " : "Trying: "}${shownLook.name}` : "Your button"}
                        </div>
                        <p className="line-clamp-2 text-muted-foreground">
                            {hint ?? (shownLook ? `${shown!.label}. ${shownLook.desc}` : "Hover a look to preview it here, click to equip. Tap the button to test.")}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {bonus.click > 0 && <Chip>+{+(bonus.click * 100).toFixed(1)}% click</Chip>}
                            {bonus.crit > 0 && <Chip>+{+(bonus.crit * 100).toFixed(1)}% crit</Chip>}
                            {bonus.critDmg > 0 && <Chip>+{Math.round(bonus.critDmg * 100)}% crit dmg</Chip>}
                            {bonus.hold > 0 && <Chip>+{bonus.hold} hold/s</Chip>}
                            {bonus.xp > 0 && <Chip>+{Math.round(bonus.xp * 100)}% xp</Chip>}
                            {bonus.bobber > 0 && <Chip>+{Math.round(bonus.bobber * 100)}% bobber</Chip>}
                        </div>
                    </div>
                </div>

                <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                    {CATS.map((c) => {
                        const on = page === c.id;
                        const n = newIn(c.id);
                        const got = c.list.filter((l) => isUnlocked(s, l)).length;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                    setPage(c.id);
                                    setOv({});
                                    setHint(null);
                                }}
                                className="relative shrink-0 rounded-lg px-2.5 py-1 font-minecraft text-[11px] transition-colors"
                                style={on ? { backgroundColor: tint(C, 18), color: C, boxShadow: `inset 0 0 0 1px ${tint(C, 45)}` } : { color: "var(--muted-foreground)" }}
                            >
                                {c.label} <span className="font-rubik text-[9px] opacity-70">{got}/{c.list.length}</span>
                                {n > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full font-rubik text-[9px] font-bold text-black" style={{ backgroundColor: "var(--mc-green)" }}>{n}</span>}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => {
                            setPage("setup");
                            setOv({});
                            setHint(null);
                        }}
                        className="shrink-0 rounded-lg px-2.5 py-1 font-minecraft text-[11px] transition-colors"
                        style={page === "setup" ? { backgroundColor: tint("var(--mc-yellow)", 18), color: "var(--mc-yellow)", boxShadow: `inset 0 0 0 1px ${tint("var(--mc-yellow)", 45)}` } : { color: "var(--muted-foreground)" }}
                    >
                        Setup
                    </button>
                </div>
            </div>

            {cat && (
                <>
                    <div className="flex items-center justify-between gap-2 px-0.5 pt-2 font-rubik text-[11px] text-muted-foreground">
                        <span>{cat.blurb}</span>
                        {next && next.cat === cat.id && (
                            <span className="shrink-0" style={{ color: "var(--mc-yellow)" }}>
                                Next: {next.l.name} {Math.floor(next.f * 100)}%
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {cat.list.map((l) => {
                            const key = lookKey(cat.id, l.id);
                            const on = equippedOf(cat) === l.id;
                            const lock = !isUnlocked(s, l);
                            const isNew = !lock && !!l.need && !b.seen.includes(key);
                            const f = lookProgress(s, l);
                            return (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => equip(cat.id, l)}
                                    onPointerEnter={(e) => preview(cat.id, l, e)}
                                    onPointerLeave={(e) => unpreview(e)}
                                    onFocus={() => preview(cat.id, l)}
                                    onBlur={() => unpreview()}
                                    className="flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all hover:-translate-y-px hover:bg-white/5"
                                    style={{
                                        borderColor: on ? C : isNew ? "var(--mc-green)" : lock ? "rgba(255,255,255,0.1)" : tint(C, 35),
                                        backgroundColor: on ? tint(C, 12) : undefined,
                                        boxShadow: on ? `0 0 16px -6px ${C}` : isNew ? "0 0 14px -5px var(--mc-green)" : undefined,
                                    }}
                                >
                                    <span className={`grid size-12 shrink-0 place-items-center ${lock ? "opacity-40 grayscale" : ""}`}>
                                        <Preview cat={cat.id} l={l} looks={b} island={island.color} accent={accent} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5 font-minecraft text-xs" style={{ color: lock ? undefined : on ? C : "var(--foreground)" }}>
                                            <span className="truncate">{l.name}</span>
                                            {lock && <Lock className="size-3 shrink-0 text-muted-foreground" />}
                                            {on && <span className="rounded-full px-1.5 font-rubik text-[9px] text-black" style={{ backgroundColor: C }}>On</span>}
                                            {isNew && <span className="fi-afford rounded-full px-1.5 font-rubik text-[9px] text-black" style={{ backgroundColor: "var(--mc-green)", ["--c" as string]: "var(--mc-green)" }}>NEW</span>}
                                        </span>
                                        {lock && l.need ? (
                                            <>
                                                <span className="block truncate font-rubik text-[10px] text-muted-foreground">
                                                    {F(statValue(s, l.need.stat))} / {F(l.need.n)} {STAT_LABEL[l.need.stat]}
                                                </span>
                                                <span className="mt-1 block"><Bar f={f} color="var(--mc-yellow)" /></span>
                                            </>
                                        ) : (
                                            <span className="block truncate font-rubik text-[10px] text-muted-foreground">{l.desc}</span>
                                        )}
                                        {l.bonus && <span className="block truncate font-rubik text-[10px]" style={{ color: lock ? "var(--muted-foreground)" : "var(--mc-green)" }}>{bonusText(l.bonus)}</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {page === "setup" && (
                <div className="space-y-2 pt-2">
                    <div className="rounded-xl border p-3" style={{ borderColor: tint("var(--mc-yellow)", 45), backgroundImage: `linear-gradient(130deg, ${tint("var(--mc-yellow)", 8)}, transparent 70%)` }}>
                        <div className="flex items-center justify-between font-minecraft text-sm" style={{ color: "var(--mc-yellow)" }}>
                            <span><Sparkles className="mr-1 inline size-4" />Collection</span>
                            <span>{have} / {total}</span>
                        </div>
                        <div className="mt-2"><Bar f={have / total} color="var(--mc-yellow)" /></div>
                        <p className="mt-2 font-rubik text-[11px] text-muted-foreground">
                            Every look you own gives +{+(COLLECTION_PER_LOOK * 100).toFixed(2)}% click value forever: currently <b style={{ color: "var(--mc-green)" }}>+{+(COLLECTION_PER_LOOK * have * 100).toFixed(2)}%</b>.
                            {next && <> Closest unlock: <b style={{ color: "var(--mc-yellow)" }}>{next.l.name}</b> ({CATS.find((c) => c.id === next!.cat)!.label}), {Math.floor(next.f * 100)}% there.</>}
                        </p>
                        <p className="mt-1 font-rubik text-[11px] text-muted-foreground">
                            Set bonus: equip a non-default shape, skin, click fx, crit fx and aura together for <b style={{ color: "var(--mc-green)" }}>+{SET_BONUS * 100}% click</b>.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={randomize} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 font-rubik text-xs font-semibold transition-colors hover:bg-white/10">
                            <Dices className="size-4" /> Randomize
                        </button>
                        <button type="button" onClick={() => pickLooks(DEFAULT_LOOKS)} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 font-rubik text-xs font-semibold transition-colors hover:bg-white/10">
                            <RotateCcw className="size-4" /> Reset looks
                        </button>
                    </div>

                    <div className="font-minecraft text-[11px] uppercase tracking-widest" style={{ color: "var(--mc-light-purple)" }}>Loadouts</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {Array.from({ length: LOADOUTS }, (_, i) => {
                            const L = b.saved[i];
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-white/10 p-2.5">
                                    <div className="grid size-14 place-items-center">
                                        {L ? <ButtonFace shape={L.shape} skin={L.skin} glyph={L.glyph} color={island.color} depth={4} className="size-12" /> : <span className="font-rubik text-[10px] text-muted-foreground">Empty</span>}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                b.saved[i] = { shape: b.shape, skin: b.skin, burst: b.burst, crit: b.crit, color: b.color, nums: b.nums, aura: b.aura, glyph: b.glyph };
                                                render();
                                            }}
                                            className="flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 font-rubik text-[10px] font-semibold hover:bg-white/10"
                                        >
                                            <Save className="size-3" /> Save
                                        </button>
                                        <button type="button" disabled={!L} onClick={() => L && pickLooks(L)} className="rounded-md border px-2 py-1 font-rubik text-[10px] font-semibold enabled:hover:bg-white/10 disabled:opacity-40" style={{ borderColor: tint(C, 45), color: C }}>
                                            Equip
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="font-minecraft text-[11px] uppercase tracking-widest" style={{ color: "var(--mc-yellow)" }}>Clicking</div>
                    <Toggle label="Hold the button or Space to keep clicking" on={b.hold} onChange={(v) => { b.hold = v; render(); }} />
                    <Toggle label="Shake the button on crits" on={b.shake} onChange={(v) => { b.shake = v; render(); }} />
                    <p className="font-rubik text-[11px] text-muted-foreground">
                        Holding clicks {HOLD_BASE} times a second and heats up over {HEAT_SECONDS} seconds to {holdMax(s)} a second. Held clicks are full clicks, crits included.
                    </p>
                </div>
            )}
        </>
    );
}

function Preview({ cat, l, looks, island, accent }: { cat: Cat; l: LookDef; looks: Looks; island: string; accent: string }) {
    switch (cat) {
        case "shape":
            return <ButtonFace shape={l.id} skin={looks.skin} glyph={looks.glyph} color={island} depth={3} className="size-10" />;
        case "skin":
            return <ButtonFace shape={looks.shape} skin={l.id} glyph={looks.glyph} color={island} depth={3} className="size-10" />;
        case "aura":
            return (
                <span className="relative block size-9">
                    <Aura id={l.id} accent={accent} />
                    <ButtonFace shape="orb" skin={looks.skin} glyph={looks.glyph} color={island} depth={2} className="relative z-[1] size-full" />
                </span>
            );
        case "color": {
            const c = l.color === "rainbow" ? "conic-gradient(#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5f5f)" : l.color || accent;
            return <span className="block size-8 rounded-full" style={{ background: c, boxShadow: `0 0 14px ${l.color === "rainbow" ? "#b05fff" : l.color || accent}` }} />;
        }
        case "nums":
            return (
                <span className={`fi-ns-${l.id} font-minecraft text-sm`} style={{ ["--ac" as string]: accent, color: "#fff", textShadow: "0 2px 0 #000" }}>
                    123
                </span>
            );
        case "glyph":
            return <span className="grid size-10 place-items-center rounded-xl text-xl" style={{ color: C, backgroundColor: tint(C, 14) }}><McSymbol name={l.symbol!} /></span>;
        default:
            return (
                <span className="grid size-10 place-items-center rounded-full text-xl" style={{ color: cat === "crit" ? "var(--mc-aqua)" : "var(--mc-light-purple)", backgroundColor: tint(cat === "crit" ? "var(--mc-aqua)" : "var(--mc-light-purple)", 16) }}>
                    {FX_ICON[l.id] ?? "✦"}
                </span>
            );
    }
}

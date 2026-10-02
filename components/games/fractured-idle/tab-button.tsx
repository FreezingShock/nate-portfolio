"use client";

import { fmtPct } from "@/lib/fractured-idle/format";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    CATS,
    STAT_LABEL,
    bonusText,
    FUNCTIONAL,
    bestChanges,
    btnBonus,
    critColorOf,
    valueOf,
    isUnlocked,
    lookKey,
    lookProgress,
    statValue,
    type Cat,
    type Looks,
    type LookDef,
} from "@/lib/fractured-idle/button";
import { activeIsland } from "@/lib/fractured-idle/island-logic";
import { kick, spawnBurst, spawnCrit, spawnNumber } from "./button-fx";
import { Aura, ButtonFace, skinAccent } from "./button-face";
import { SetupPage, randomLooks } from "./button-setup";
import { LookGrid } from "./look-grid";
import { Tip, TipCard } from "./tooltip";
import { TabBar, type TabGroup, type TabItem, type TabNote } from "./tab-bar";
import { tint, type Ctx } from "./ui";

// Button tab: the wardrobe for the click button. A sticky stage on top shows
// your button live; hovering / focusing / tapping a look previews it there (and
// plays its effect), clicking equips it. Looks unlock from progress, the
// functional ones pay a bonus while equipped, and every look you own adds to a
// collection bonus. The picker itself lives in look-grid.tsx, loadouts and
// bonus breakdown in button-setup.tsx.

const C = "var(--mc-aqua)";
const Y = "var(--mc-yellow)";
type Page = Cat | "setup";
type Focus = { cat: Cat; id: string } | null;

const catOf = (c: Cat) => CATS.find((x) => x.id === c)!;

// The wardrobe switcher is the same component as the main tab bar: grouped,
// every page colored, a badge for new looks, and a tooltip with what is inside.
const PAGES: TabItem<Page>[] = [
    { id: "shape", label: "Shape", symbol: "hex", group: "form", color: "#6fd0ff", blurb: "The outline of your button." },
    { id: "skin", label: "Skin", symbol: "gem", group: "form", color: "#c58bff", blurb: "What the button is made of. The grand skins animate." },
    { id: "glyph", label: "Symbol", symbol: "star", group: "form", color: "#ffd23a", blurb: "The icon on the button." },
    { id: "burst", label: "Click FX", symbol: "spark8", group: "fx", color: "#ff9a4d", blurb: "What bursts out of every click." },
    { id: "crit", label: "Crit FX", symbol: "bolt", group: "fx", color: "#ffe14d", blurb: "What happens when you crit." },
    { id: "aura", label: "Aura", symbol: "sunburst", group: "fx", color: "#7fd0ff", blurb: "A constant glow around the button." },
    { id: "color", label: "Color", symbol: "daisy", group: "style", color: "#ff7ad9", blurb: "The color of crit numbers and blasts." },
    { id: "nums", label: "Numbers", symbol: "pencil", group: "style", color: "#5dffb0", blurb: "How the flying numbers look." },
    { id: "setup", label: "Setup", symbol: "cog", group: "set", color: "#9a94b0", blurb: "Loadouts, randomize and the full bonus breakdown." },
];
const PAGE_GROUPS: TabGroup[] = [
    { id: "form", label: "Form", color: "#6fd0ff" },
    { id: "fx", label: "Effects", color: "#ff9a4d" },
    { id: "style", label: "Style", color: "#ff7ad9" },
    { id: "set", label: "Loadout", color: "#ffd23a" },
];

export function ButtonTab({ s, render, F }: Ctx) {
    const b = s.btn;
    const [page, setPage] = useState<Page>("shape");
    const [focus, setFocus] = useState<Focus>(null);
    const [tick, setTick] = useState(0);
    const fxRef = useRef<HTMLDivElement>(null);
    const faceRef = useRef<HTMLButtonElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const flip = useRef(false);

    const island = activeIsland(s);
    const looks: Looks = {
        shape: b.shape, skin: b.skin, burst: b.burst, crit: b.crit, color: b.color, nums: b.nums, aura: b.aura, glyph: b.glyph,
        ...(focus ? { [focus.cat]: focus.id } : {}),
    };
    const accent = skinAccent(looks.skin, island.color);
    const critCol = critColorOf(looks.color, accent, 0);

    // The game re-renders ten times a second; anything heavy here runs off this slower clock instead.
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // ---- Stage ----
    const looksRef = useRef(looks);
    useEffect(() => {
        looksRef.current = looks;
    });

    const fire = useCallback(
        (crit: boolean, at?: { x: number; y: number }) => {
            const layer = fxRef.current;
            if (!layer) return;
            const r = layer.getBoundingClientRect();
            const x = at?.x ?? r.width / 2;
            const y = at?.y ?? r.height * 0.46;
            const L = looksRef.current;
            const ac = skinAccent(L.skin, island.color);
            const col = critColorOf(L.color, ac, Math.floor(Math.random() * 7));
            spawnNumber(layer, x, y - 14, crit ? "✦ 1.2K" : "+240", { crit, color: col, accent: ac, style: L.nums });
            spawnBurst(layer, L.burst, x, y, ac);
            if (crit) spawnCrit(layer, L.crit, x, y, col);
            kick(faceRef.current, crit, 0);
            const w = wrapRef.current;
            if (w) {
                flip.current = !flip.current;
                w.style.setProperty("--crit", col);
                w.classList.remove("fi-hit-a", "fi-hit-b", "fi-crit-a", "fi-crit-b");
                w.classList.add(`${crit ? "fi-crit" : "fi-hit"}-${flip.current ? "a" : "b"}`);
            }
        },
        [island.color],
    );

    // While a look is previewed, keep playing its effect so it can be judged.
    const focusKey = focus ? `${focus.cat}:${focus.id}` : "";
    useEffect(() => {
        if (!focus) return;
        const critish = focus.cat === "crit" || focus.cat === "color";
        const t0 = setTimeout(() => fire(critish), 90);
        const id = setInterval(() => fire(critish || (focus.cat === "nums" && Math.random() < 0.4)), 950);
        return () => {
            clearTimeout(t0);
            clearInterval(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusKey, fire]);

    const stageClick = (e: React.PointerEvent, crit?: boolean) => {
        const r = fxRef.current?.getBoundingClientRect();
        if (!r) return;
        fire(crit ?? Math.random() < 0.3, { x: e.clientX - r.left, y: e.clientY - r.top });
    };

    // ---- Picker actions (stable, so the memoized grid does not re-render) ----
    const live = useRef({ s, render, fire });
    useEffect(() => {
        live.current = { s, render, fire };
    });
    const onFocusLook = useCallback((cat: Cat, id: string) => {
        // Looking at a new look is enough to read it.
        const st = live.current.s;
        const key = lookKey(cat, id);
        if (!st.btn.seen.includes(key)) st.btn.seen.push(key);
        setFocus((f) => (f && f.cat === cat && f.id === id ? f : { cat, id }));
    }, []);
    /** Mark the new looks of one page (or every page) as read. */
    const markSeen = useCallback((cat?: Cat) => {
        const { s: st, render: draw } = live.current;
        let changed = false;
        for (const c of CATS) {
            if (cat && c.id !== cat) continue;
            for (const l of c.list) {
                const k = lookKey(c.id, l.id);
                if (l.need && isUnlocked(st, l) && !st.btn.seen.includes(k)) {
                    st.btn.seen.push(k);
                    changed = true;
                }
            }
        }
        if (changed) draw();
    }, []);

    // ---- Equip best: wear the best unlocked look in every functional slot, one by one so you can watch it happen ----
    const [bestLog, setBestLog] = useState<{ cat: Cat; name: string }[]>([]);
    const equipBest = useCallback(() => {
        const { s: st, render: draw, fire: play } = live.current;
        const ch = bestChanges(st);
        if (!ch.length) return;
        setBestLog([]);
        ch.forEach((c, i) => {
            setTimeout(() => {
                live.current.s.btn[c.cat] = c.to.id;
                const k = lookKey(c.cat, c.to.id);
                if (!live.current.s.btn.seen.includes(k)) live.current.s.btn.seen.push(k);
                setBestLog((l) => [...l, { cat: c.cat, name: c.to.name }]);
                setFocus({ cat: c.cat, id: c.to.id });
                draw();
                play(c.cat === "crit");
            }, i * 260);
        });
        setTimeout(() => {
            setBestLog([]);
            setFocus(null);
        }, ch.length * 260 + 2800);
    }, []);
    const onLeave = useCallback(() => setFocus(null), []);
    const onPick = useCallback((cat: Cat, l: LookDef) => {
        const { s, render, fire } = live.current;
        const key = lookKey(cat, l.id);
        if (!s.btn.seen.includes(key)) s.btn.seen.push(key);
        setFocus({ cat, id: l.id });
        if (!isUnlocked(s, l)) return render();
        s.btn[cat] = l.id;
        render();
        setTimeout(() => fire(cat === "crit" || cat === "color"), 40);
    }, []);
    const apply = useCallback((L: Looks) => {
        Object.assign(live.current.s.btn, L);
        setFocus(null);
        live.current.render();
        setTimeout(() => live.current.fire(true), 40);
    }, []);
    const randomize = useCallback(() => apply(randomLooks(live.current.s)), [apply]);

    // ---- Counts for the pills and the closest unlock (once a second is plenty) ----
    const { counts, next, nextIn } = useMemo(() => {
        const counts = {} as Record<Cat, { got: number; fresh: number }>;
        const nextIn = {} as Record<Cat, { l: LookDef; f: number } | null>;
        let next: { cat: Cat; l: LookDef; f: number } | null = null;
        for (const c of CATS) {
            let got = 0;
            let fresh = 0;
            nextIn[c.id] = null;
            for (const l of c.list) {
                if (isUnlocked(s, l)) {
                    got++;
                    if (l.need && !s.btn.seen.includes(lookKey(c.id, l.id))) {
                        fresh++;
                    }
                } else {
                    const f = lookProgress(s, l);
                    if (!nextIn[c.id] || f > nextIn[c.id]!.f) nextIn[c.id] = { l, f };
                    if (!next || f > next.f) next = { cat: c.id, l, f };
                }
            }
            counts[c.id] = { got, fresh };
        }
        return { counts, next, nextIn };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, b.seen.length, s]);

    // ---- Info panel: the focused look, else what is equipped in this category ----
    const infoCat: Cat = focus?.cat ?? (page === "setup" ? "shape" : page);
    const infoList = catOf(infoCat).list;
    const info = infoList.find((l) => l.id === (focus?.id ?? b[infoCat])) ?? infoList[0];
    const infoLocked = !isUnlocked(s, info);
    const infoOn = b[infoCat] === info.id;
    const total = btnBonus(s);

    // Notes for the switcher: new looks need a click (they badge the tab), the rest is information.
    const notes: Partial<Record<Page, TabNote[]>> = {};
    for (const c of CATS) {
        const n: TabNote[] = counts[c.id].fresh > 0 ? [{ text: `${counts[c.id].fresh} new ${counts[c.id].fresh === 1 ? "look" : "looks"}`, color: "var(--mc-green)", act: true, n: counts[c.id].fresh }] : [];
        n.push({ text: `${counts[c.id].got} of ${c.list.length} looks unlocked`, color: "var(--mc-aqua)" });
        const ni = nextIn[c.id];
        if (ni) n.push({ text: `Next: ${ni.l.name} ${Math.floor(ni.f * 100)}%${ni.l.need ? ` (${STAT_LABEL[ni.l.need.stat]})` : ""}`, color: "var(--mc-yellow)" });
        notes[c.id] = n;
    }
    notes.setup = [
        { text: `Total: ${bonusText(total) || "none yet"}`, color: "var(--mc-green)" },
        ...(next ? [{ text: `Closest unlock: ${next.l.name} ${Math.floor(next.f * 100)}%`, color: "var(--mc-yellow)" }] : []),
    ];

    return (
        <>
            <div className="sticky -top-3 z-20 -mx-3 -mt-3 border-b border-white/10 px-3 pb-2 pt-3" style={{ backgroundColor: "color-mix(in oklch, var(--background) 94%, black)" }}>
                <div className="flex items-stretch gap-3">
                    {/* Stage */}
                    <div
                        className="relative h-[7.5rem] w-[7.5rem] shrink-0 overflow-hidden rounded-2xl transition-[background,box-shadow] duration-300 sm:h-36 sm:w-52"
                        style={{
                            backgroundImage: `radial-gradient(ellipse 70% 55% at 50% 62%, ${tint(accent, 30)}, transparent 72%), linear-gradient(180deg, color-mix(in oklch, var(--background) 82%, black), color-mix(in oklch, var(--background) 96%, black))`,
                            boxShadow: `inset 0 0 0 1px ${tint(accent, 28)}, inset 0 -22px 34px -26px ${tint(accent, 55)}`,
                        }}
                    >
                        <div className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_50%_58%,#000,transparent_75%)]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.22) 1px, transparent 1.2px)", backgroundSize: "14px 14px" }} />
                        <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-3 w-[58%] -translate-x-1/2 rounded-[50%] blur-[5px]" style={{ backgroundColor: "rgba(0,0,0,.55)" }} />
                        <div className="pointer-events-none absolute bottom-[15%] left-1/2 h-2 w-[46%] -translate-x-1/2 rounded-[50%]" style={{ boxShadow: `0 0 18px ${tint(accent, 45)}`, border: `1px solid ${tint(accent, 35)}` }} />
                        <div className="absolute left-1/2 top-[44%] size-[4.6rem] -translate-x-1/2 -translate-y-1/2 sm:size-24">
                            <Aura id={looks.aura} accent={accent} />
                            <ButtonFace
                                as="button"
                                shape={looks.shape}
                                skin={looks.skin}
                                glyph={looks.glyph}
                                color={island.color}
                                depth={5}
                                className="relative z-[1] size-full"
                                btnRef={faceRef}
                                wrapRef={wrapRef}
                                btnProps={{ onPointerDown: (e) => stageClick(e), onContextMenu: (e) => e.preventDefault(), "aria-label": "Test your button look" }}
                            />
                        </div>
                        {/* Particles live on their own layer so the preview button can never be evicted by the particle cap. */}
                        <div ref={fxRef} className="pointer-events-none absolute inset-0 z-[4]" aria-hidden="true" />
                        <button
                            type="button"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                stageClick(e, true);
                            }}
                            className="absolute right-1.5 top-1.5 z-[5] rounded-full border px-2 py-0.5 font-minecraft text-[10px] backdrop-blur-sm transition-colors hover:bg-white/10"
                            style={{ borderColor: tint(critCol, 60), color: critCol, backgroundColor: "rgba(0,0,0,.25)" }}
                        >
                            Crit!
                        </button>
                    </div>

                    {/* Info */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 font-rubik text-xs">
                        <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className="truncate font-minecraft font-bold text-sm" style={{ color: infoLocked ? Y : C }}>{info.name}</span>
                                <span
                                    className="shrink-0 rounded-full border px-1.5 py-px text-[9px]"
                                    style={{ borderColor: tint(infoLocked ? Y : infoOn ? C : "var(--muted-foreground)", 55), color: infoLocked ? Y : infoOn ? C : "var(--muted-foreground)" }}
                                >
                                    {infoLocked ? "Locked" : infoOn ? "Equipped" : "Click to equip"}
                                </span>
                            </div>
                            <div className="truncate text-[10px] text-muted-foreground"><span className="uppercase tracking-widest">{catOf(infoCat).label}</span> · {catOf(infoCat).blurb}</div>
                            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{info.desc}</p>
                            {info.bonus && <div className="truncate text-[11px]" style={{ color: infoLocked ? "var(--muted-foreground)" : "var(--mc-green)" }}>{bonusText(info.bonus)}</div>}
                            {infoLocked && info.need && (
                                <div className="pt-0.5">
                                    <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
                                        <span className="truncate">{STAT_LABEL[info.need.stat]}</span>
                                        <span>{F(statValue(s, info.need.stat))} / {F(info.need.n)}</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full" style={{ width: `${lookProgress(s, info) * 100}%`, backgroundColor: Y, boxShadow: `0 0 8px ${Y}` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 space-y-0.5 text-[10px] text-muted-foreground">
                            {next && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPage(next.cat);
                                        setFocus({ cat: next.cat, id: next.l.id });
                                    }}
                                    className="block max-w-full truncate text-left transition-colors hover:text-foreground"
                                    title="Jump to the closest look you can unlock"
                                >
                                    Next: <span style={{ color: Y }}>{next.l.name}</span> ({catOf(next.cat).label}) {Math.floor(next.f * 100)}%
                                </button>
                            )}
                            <div className="truncate" title="Everything your equipped looks and collection give">
                                Total: <span style={{ color: "var(--mc-green)" }}>{bonusText(total) || "none yet"}</span>
                            </div>
                            <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
                                <Tip
                                    box
                                    tip={() => {
                                        const ch = bestChanges(s);
                                        const gain = ch.reduce((a, c) => a + valueOf(c.to.bonus) - valueOf(c.from.bonus), 0);
                                        return ch.length ? (
                                            <TipCard
                                                title="Equip best looks"
                                                color="#ffd23a"
                                                tag={`${ch.length} change${ch.length === 1 ? "" : "s"}`}
                                                lines={["Wears the best unlocked shape, skin, click FX, crit FX and aura for value. Colors, numbers and symbols stay as they are."]}
                                                rows={ch.map((c): [string, string, string] => [catOf(c.cat).label, `${c.from.name} → ${c.to.name}`, "var(--mc-green)"])}
                                                notes={[{ text: `About +${fmtPct(gain, 1)} click value`, color: "var(--mc-green)" }, ...ch.map((c) => ({ text: `${c.to.name}: ${c.to.bonus ? bonusText(c.to.bonus) : "no bonus"}`, color: "var(--mc-aqua)" }))]}
                                                cta="Click to equip!"
                                            />
                                        ) : (
                                            <TipCard title="Equip best looks" color="#ffd23a" lines={["You are already wearing the best unlocked look in every slot."]} foot="Unlock more looks to improve it." />
                                        );
                                    }}
                                >
                                    <button type="button" className="fi-eq" data-on={bestChanges(s).length > 0} disabled={bestChanges(s).length === 0 && bestLog.length === 0} onClick={equipBest}>
                                        <span>{bestLog.length > 0 ? "…" : bestChanges(s).length > 0 ? "⚡" : "✓"}</span> {bestLog.length > 0 ? "Equipping" : bestChanges(s).length > 0 ? `Equip best (${bestChanges(s).length})` : "Best equipped"}
                                    </button>
                                </Tip>
                                <span className="fi-eq-log" aria-live="polite">
                                    {bestLog.map((b) => (
                                        <i key={b.cat}>{b.name}</i>
                                    ))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <TabBar
                    tabs={PAGES}
                    groups={PAGE_GROUPS}
                    current={page}
                    notes={notes}
                    keys={false}
                    onRead={(id) => id !== "setup" && markSeen(id as Cat)}
                    onReadAll={() => markSeen()}
                    onSelect={(id) => {
                        setPage(id);
                        setFocus(null);
                    }}
                />
            </div>

            {page === "setup" ? (
                <SetupPage s={s} island={island.color} next={next ? { name: next.l.name, cat: catOf(next.cat).label, f: next.f } : null} render={render} apply={apply} randomize={randomize} />
            ) : (
                <div className="pt-2">
                    <LookGrid
                        s={s}
                        cat={page}
                        rev={tick * 1000 + b.seen.length}
                        equipped={b[page]}
                        focusId={focus && focus.cat === page ? focus.id : null}
                        shape={b.shape}
                        skin={b.skin}
                        glyph={b.glyph}
                        island={island.color}
                        accent={skinAccent(b.skin, island.color)}
                        onFocus={onFocusLook}
                        onLeave={onLeave}
                        onPick={onPick}
                    />
                </div>
            )}
        </>
    );
}

export const BUTTON_TAB_CSS = `
.fi-eq{display:inline-flex;align-items:center;gap:.3rem;flex:none;height:1.6rem;padding:0 .65rem;border-radius:.6rem;border:1px solid rgba(255,255,255,.14);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;color:var(--muted-foreground);transition:transform .1s,background .15s,box-shadow .2s;touch-action:manipulation;white-space:nowrap}
.fi-eq span{font-size:.8rem}
.fi-eq[data-on="true"]{color:#1b1400;border-color:#ffd23a;background:linear-gradient(180deg,#ffe97a,#ffc21a);box-shadow:0 0 14px -3px #ffd23a;animation:fi-eq-glow 1.8s ease-in-out infinite}
.fi-eq[data-on="true"]:hover{filter:brightness(1.08)}
.fi-eq:active:not(:disabled){transform:scale(.94)}
.fi-eq:disabled{opacity:.6;cursor:default}
.fi-eq-log{display:flex;flex-wrap:wrap;gap:.2rem;min-width:0;overflow:hidden}
.fi-eq-log i{font-style:normal;padding:.05rem .4rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--mc-green) 60%,transparent);background:color-mix(in oklch,var(--mc-green) 14%,transparent);font-family:var(--font-rubik,inherit);font-size:.58rem;font-weight:700;color:var(--mc-green);animation:fi-eq-pop .35s cubic-bezier(.2,1.7,.4,1)}
@keyframes fi-eq-pop{from{transform:scale(0) translateY(6px);opacity:0}}
@keyframes fi-eq-glow{50%{box-shadow:0 0 20px -1px #ffd23a}}
@media (prefers-reduced-motion:reduce){.fi-eq,.fi-eq-log i{animation:none!important}}
`;

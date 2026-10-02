"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { EGG_CUR, PET_BY_ID, PET_DIM_BY_ID, RARITIES, RARITY_ORDER, petStatValue, PET_LABEL, rarityIdx, type EggDef, type Rarity, type State } from "@/lib/fractured-idle/data";
import type { HatchResult } from "@/lib/fractured-idle/engine";
import { chargeFx, flashScreen, revealFx } from "./enchant-fx";
import { lift } from "./ui";
import { PetTipBody } from "./pet-tip";
import { Tip, useTipHost } from "./tooltip";

// The egg opening. It covers the screen with a 3D particle tunnel whose colors follow the best rarity in the batch
// (it drifts from the egg's color toward that rarity while the eggs shake, then locks in on the crack). Each egg
// shakes (longer for rarer pulls), cracks in a burst of the rarity's colors and shows the pet. It reuses the
// enchanting reveal's DOM effects (charge motes, rings, beams, flashes). Tap or click anywhere (or press Space,
// Enter or Escape) to skip the wait; tap again to close. Up to three eggs open side by side, sized to fit a phone.

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const shakeMs = (r: HatchResult) => (reduced() ? 350 : 1400 + rarityIdx(r.rarity) * 300);

type RGB = [number, number, number];
/** Canvas-friendly colors for each rarity (the game's own colors are CSS variables, which a canvas cannot read). */
const RARITY_RGB: Record<Rarity, RGB> = {
    common: [214, 222, 240],
    uncommon: [85, 255, 85],
    rare: [105, 135, 255],
    epic: [255, 85, 255],
    legendary: [255, 170, 0],
    mythic: [255, 85, 230],
    divine: [95, 246, 255],
};

/** Turns any CSS color (including var(--x)) into rgb by letting the browser resolve it. */
function resolveRgb(host: HTMLElement, css: string, fallback: RGB): RGB {
    try {
        const probe = document.createElement("span");
        probe.style.color = css;
        probe.style.display = "none";
        host.appendChild(probe);
        const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
        probe.remove();
        return m && m.length >= 3 ? [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])] : fallback;
    } catch {
        return fallback;
    }
}

interface Fx {
    rgb: RGB; // where the particle color is heading
    rainbow: boolean; // divine pulls cycle through hues
    speed: number; // forward speed of the tunnel
    pulse: number; // 1 right after a crack, decays to 0
}

const hsl = (h: number): RGB => {
    const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return Math.round(255 * (0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return [f(0), f(8), f(4)];
};

/** A starfield tunnel drawn with a plain 2D canvas and a perspective projection (no 3D library needed). */
function Particles({ fx }: { fx: MutableRefObject<Fx> }) {
    const cv = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = cv.current;
        if (!canvas || reduced()) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const narrow = Math.min(window.innerWidth, window.innerHeight) < 600;
        const N = narrow ? 90 : 170;
        const dprCap = narrow ? 1.5 : 2;
        let w = 1;
        let h = 1;
        const fit = () => {
            const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
            w = Math.max(1, canvas.clientWidth);
            h = Math.max(1, canvas.clientHeight);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(canvas);

        // Particles live on rings around the viewing axis so the tunnel reads as 3D.
        const ps = Array.from({ length: N }, (_, i) => ({
            a: Math.random() * Math.PI * 2,
            r: 0.15 + Math.random() * 1.1,
            z: Math.random(),
            s: 0.6 + Math.random() * 0.8,
            i,
        }));
        let cur: RGB = [...fx.current.rgb];
        let raf = 0;
        let last = performance.now();
        let t = 0;

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            t += dt;
            const f = fx.current;
            f.pulse = Math.max(0, f.pulse - dt * 1.4);
            const target = f.rainbow ? hsl((t * 0.25) % 1) : f.rgb;
            const k = Math.min(1, dt * 3);
            cur = [cur[0] + (target[0] - cur[0]) * k, cur[1] + (target[1] - cur[1]) * k, cur[2] + (target[2] - cur[2]) * k];
            const speed = f.speed + f.pulse * 2.4;
            const scale = Math.max(w, h) * 0.55;
            const cx = w / 2;
            const cy = h * 0.46;
            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";
            for (const p of ps) {
                const zPrev = p.z;
                p.z -= dt * speed * 0.35 * p.s;
                p.a += dt * (0.18 + f.pulse * 0.5);
                if (p.z <= 0.04) {
                    p.z = 1;
                    p.a = Math.random() * Math.PI * 2;
                    p.r = 0.15 + Math.random() * 1.1;
                    continue;
                }
                const x = Math.cos(p.a) * p.r;
                const y = Math.sin(p.a) * p.r * 0.8;
                const sx = cx + (x / p.z) * scale * 0.5;
                const sy = cy + (y / p.z) * scale * 0.5;
                if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
                const px = cx + (x / zPrev) * scale * 0.5;
                const py = cy + (y / zPrev) * scale * 0.5;
                const depth = 1 - p.z;
                const c = f.rainbow ? hsl(((p.i / N) + t * 0.1) % 1) : cur;
                const a = Math.min(1, 0.28 + depth * 0.9) * (0.7 + f.pulse * 0.3);
                const col = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
                ctx.strokeStyle = col;
                ctx.lineWidth = 0.9 + depth * 3.2;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.stroke();
                if (depth > 0.6) {
                    ctx.fillStyle = col;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 0.8 + depth * 2.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalCompositeOperation = "source-over";
        };
        raf = requestAnimationFrame(frame);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [fx]);
    return <canvas ref={cv} className="fi-eg-cv" aria-hidden="true" />;
}

type RevealProps = { egg: EggDef; results: HatchResult[]; onClose: () => void; fixed?: boolean; s?: State };

/** Up to three eggs open one by one; bigger batches (Hatch all) use the compact bulk reveal. */
export function EggReveal(props: RevealProps) {
    return props.results.length > 3 ? <BulkReveal {...props} /> : <RowReveal {...props} />;
}

type Phase = "charge" | "pour" | "done";

/** Hatch all: one egg shakes under an "xN" badge, cracks, and every unique pet flies out of it into a grid with its count. */
function BulkReveal({ egg, results, onClose, fixed = false, s }: RevealProps) {
    const tipHost = useTipHost();
    const touch = useRef(false);
    useEffect(() => () => tipHost?.hide(), [tipHost]);
    const host = useRef<HTMLDivElement>(null);
    const eggEl = useRef<HTMLDivElement>(null);
    const tiles = useRef<(HTMLDivElement | null)[]>([]);
    const anims = useRef<Animation[]>([]);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [phase, setPhase] = useState<Phase>("charge");
    const phaseRef = useRef<Phase>("charge");
    const fast = useRef(false);
    const doneAt = useRef(0);
    const alive = useRef(true);
    const fx = useRef<Fx>({ rgb: [200, 200, 220], rainbow: false, speed: 0.8, pulse: 0 });

    const go = useCallback((ph: Phase) => {
        phaseRef.current = ph;
        setPhase(ph);
    }, []);

    const { groups, best, fresh, xp, byRarity } = useMemo(() => {
        const m = new Map<string, { id: string; n: number; isNew: boolean; rarity: Rarity }>();
        let xpSum = 0;
        for (const r of results) {
            const g = m.get(r.id);
            if (g) {
                g.n++;
                g.isNew = g.isNew || r.isNew;
            } else m.set(r.id, { id: r.id, n: 1, isNew: r.isNew, rarity: r.rarity });
            xpSum += r.xp;
        }
        const list = [...m.values()].sort((a, b) => rarityIdx(b.rarity) - rarityIdx(a.rarity) || b.n - a.n);
        return {
            groups: list,
            best: list[0].rarity,
            fresh: list.filter((g) => g.isNew).length,
            xp: xpSum,
            byRarity: RARITY_ORDER.map((r) => ({ r, n: results.filter((x) => x.rarity === r).length })).filter((x) => x.n > 0).reverse(),
        };
    }, [results]);

    const center = useCallback(() => {
        const h = host.current;
        const e = eggEl.current;
        if (!h || !e) return null;
        const rc = e.getBoundingClientRect();
        const hr = h.getBoundingClientRect();
        if (!rc.width || !hr.width) return null;
        return { x: rc.left - hr.left + rc.width / 2, y: rc.top - hr.top + rc.height / 2 };
    }, []);

    const startPour = useCallback(() => {
        if (!alive.current || phaseRef.current !== "charge") return;
        timers.current.forEach(clearTimeout);
        timers.current = [];
        const c = center();
        const h = host.current;
        const r = rarityIdx(best);
        if (c && h) {
            revealFx(h, c.x, c.y, Math.min(7, r + 1));
            flashScreen(h, Math.min(7, r + 1), true);
        }
        fx.current.rgb = RARITY_RGB[best];
        fx.current.rainbow = best === "divine";
        fx.current.speed = 1.6;
        fx.current.pulse = 1;
        go("pour");
    }, [best, center, go]);

    // Charge: the egg shakes while the tunnel drifts toward the best rarity, then it cracks open.
    useEffect(() => {
        alive.current = true;
        const h = host.current;
        const eggRgb = h ? resolveRgb(h, egg.color, [200, 200, 220]) : ([200, 200, 220] as RGB);
        const bestRgb = RARITY_RGB[best];
        const ms = reduced() ? 300 : 1000;
        fx.current.rgb = eggRgb;
        for (let k = 1; k <= 4; k++) {
            const m = (k / 5) * 0.85;
            timers.current.push(
                setTimeout(() => {
                    if (phaseRef.current === "charge") {
                        fx.current.rgb = [0, 1, 2].map((c) => eggRgb[c] + (bestRgb[c] - eggRgb[c]) * m) as RGB;
                        fx.current.speed = 0.8 + m * 1.4;
                    }
                }, (ms * k) / 5),
            );
        }
        const c = center();
        if (h && c) chargeFx(h, c.x, c.y, rarityIdx(best), ms);
        timers.current.push(setTimeout(startPour, ms));
        const list = timers.current;
        const running = anims.current;
        return () => {
            alive.current = false;
            list.forEach(clearTimeout);
            timers.current.forEach(clearTimeout);
            running.forEach((a) => a.cancel());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pour: each pet tile flies from the egg to its spot in the grid, rarest first.
    useLayoutEffect(() => {
        if (phase !== "pour") return;
        const c = center();
        const hr = host.current?.getBoundingClientRect();
        const step = fast.current ? 12 : Math.max(24, Math.min(90, Math.round(1100 / groups.length)));
        let end = 0;
        tiles.current.forEach((el, i) => {
            if (!el || !c || !hr) return;
            const rc = el.getBoundingClientRect();
            const dx = c.x + hr.left - (rc.left + rc.width / 2);
            const dy = c.y + hr.top - (rc.top + rc.height / 2);
            const delay = i * step;
            const dur = reduced() ? 1 : 560;
            end = Math.max(end, delay + dur);
            anims.current.push(
                el.animate(
                    [
                        { transform: `translate(${dx}px,${dy}px) scale(.15) rotate(${i % 2 ? 40 : -40}deg)`, opacity: 0 },
                        { opacity: 1, offset: 0.2 },
                        { transform: "translate(0,0) scale(1.12) rotate(0deg)", opacity: 1, offset: 0.78 },
                        { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
                    ],
                    { duration: dur, delay, easing: "cubic-bezier(.25,.8,.35,1)", fill: "both" },
                ),
            );
        });
        timers.current.push(
            setTimeout(() => {
                if (!alive.current || phaseRef.current !== "pour") return;
                doneAt.current = Date.now();
                go("done");
            }, end + 150),
        );
    }, [phase, center, go, groups.length]);

    const skip = useCallback(() => {
        const ph = phaseRef.current;
        if (ph === "charge") {
            fast.current = true;
            startPour();
        } else if (ph === "pour") {
            timers.current.forEach(clearTimeout);
            timers.current = [];
            anims.current.forEach((a) => a.finish());
            doneAt.current = Date.now();
            go("done");
        } else if (Date.now() - doneAt.current > 350) onClose();
    }, [go, onClose, startPour]);

    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                skip();
            }
        };
        window.addEventListener("keydown", key, true);
        return () => window.removeEventListener("keydown", key, true);
    }, [skip]);

    const cur = EGG_CUR[egg.cur];
    const bestColor = RARITIES[best].color;
    return (
        <div
            ref={host}
            role="dialog"
            aria-modal="true"
            aria-label={`Hatching ${results.length} ${egg.name}s`}
            className="fi-eg-ov fi-bk-ov"
            data-fixed={fixed}
            data-n="1"
            style={{ ["--gc" as string]: phase === "charge" ? egg.color : bestColor, ["--ec" as string]: egg.color } as CSSProperties}
            onMouseDown={(e) => e.preventDefault()}
            onDoubleClick={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
                touch.current = e.pointerType !== "mouse";
            }}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // On touch, tapping a pet shows its tooltip instead of skipping or closing.
                if (touch.current && (e.target as HTMLElement).closest(".fi-bk-t")) return;
                skip();
            }}
        >
            <Particles fx={fx} />
            <div className="fi-eg-top">
                <span className="fi-eg-title" style={{ color: egg.color }}>
                    <McSymbol name={egg.symbol} /> Hatching all {egg.name}s
                </span>
                <span className="fi-eg-sub">{PET_DIM_BY_ID[egg.dim].name} · paid with {cur.name.toLowerCase()}</span>
            </div>

            <div className="fi-bk">
                <div className="fi-bk-l">
                    <div className="fi-bk-mult" style={{ color: egg.color }}>x{results.length.toLocaleString()}</div>
                    <div ref={eggEl} className="fi-bk-egg" data-ph={phase}>
                        <div className="fi-eg">
                            <span className="fi-eg-sym"><McSymbol name={egg.symbol} /></span>
                            {phase === "charge" && (
                                <svg className="fi-eg-crack" viewBox="0 0 100 130" aria-hidden="true" style={{ ["--sd" as string]: "1000ms" } as CSSProperties}>
                                    <path d="M52 0 L44 24 L58 40 L40 62 L56 82 L46 104 L54 130" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" pathLength={100} />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>

                <div className="fi-bk-g" data-done={phase === "done"}>
                    {phase === "charge" ? (
                        <div className="fi-bk-ph">Hatching {results.length.toLocaleString()} eggs…</div>
                    ) : (
                        groups.map((g, i) => {
                            const p = PET_BY_ID.get(g.id)!;
                            const rc = RARITIES[g.rarity].color;
                            const tile = (
                                <div ref={(el) => { tiles.current[i] = el; }} className="fi-bk-t" data-r={rarityIdx(g.rarity)} aria-label={`${p.name}, ${RARITIES[g.rarity].name}, x${g.n}`} style={{ ["--rc" as string]: rc, ["--pc" as string]: p.color } as CSSProperties}>
                                    <span className="fi-bk-i"><McSymbol name={p.symbol} /></span>
                                    <span className="fi-bk-n">{p.name}</span>
                                    <b className="fi-bk-c">x{g.n}</b>
                                    {g.isNew && <i className="fi-bk-new">NEW</i>}
                                </div>
                            );
                            return s ? (
                                <Tip key={g.id} box className="fi-bk-w" tip={() => <PetTipBody p={p} owned={s.pets[g.id]} equipped={s.equip.includes(g.id)} slot={s.equip.indexOf(g.id)} />}>
                                    {tile}
                                </Tip>
                            ) : (
                                <span key={g.id} className="fi-bk-w">{tile}</span>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="fi-bk-f" data-show={phase === "done"}>
                <div className="fi-bk-chips">
                    {byRarity.map(({ r, n }) => (
                        <span key={r} style={{ color: lift(RARITIES[r].color), borderColor: RARITIES[r].color }}>{RARITIES[r].name} x{n}</span>
                    ))}
                </div>
                <div className="fi-bk-s">
                    {groups.length} species · {fresh ? `${fresh} new` : "none new"}
                    {xp > 0 ? ` · duplicates gave ${Math.round(xp).toLocaleString()} xp` : ""}
                </div>
            </div>
            <div className="fi-eg-hint">{phase === "done" ? "Tap anywhere to continue" : "Tap to skip"}</div>
        </div>
    );
}

function RowReveal({ egg, results, onClose, fixed = false }: RevealProps) {
    const host = useRef<HTMLDivElement>(null);
    const eggs = useRef<(HTMLDivElement | null)[]>([]);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [shown, setShown] = useState<boolean[]>(() => results.map(() => false));
    const shownRef = useRef<boolean[]>(results.map(() => false));
    const done = shown.every(Boolean);
    const best = useMemo(() => results.reduce((a, r) => (rarityIdx(r.rarity) > rarityIdx(a.rarity) ? r : a), results[0]), [results]);
    const bestColor = RARITIES[best.rarity].color;
    const doneRef = useRef(false);
    doneRef.current = done;
    const doneAt = useRef(0);
    const alive = useRef(true);
    const fx = useRef<Fx>({ rgb: [200, 200, 220], rainbow: false, speed: 0.8, pulse: 0 });

    const burst = useCallback(
        (i: number) => {
            const h = host.current;
            const e = eggs.current[i];
            if (!alive.current || !h || !e) return;
            const rc = e.getBoundingClientRect();
            const hr = h.getBoundingClientRect();
            if (!rc.width || !hr.width) return; // detached or hidden: never draw at the corner
            const r = rarityIdx(results[i].rarity);
            revealFx(h, rc.left - hr.left + rc.width / 2, rc.top - hr.top + rc.height / 2, Math.min(7, r + 1));
            flashScreen(h, Math.min(7, r + 1), true);
        },
        [results],
    );

    const reveal = useCallback(
        (i: number) => {
            if (!alive.current || shownRef.current[i]) return;
            shownRef.current = shownRef.current.map((v, k) => (k === i ? true : v));
            setShown(shownRef.current);
            burst(i);
            const r = results[i].rarity;
            fx.current.pulse = 1;
            // Lock the tunnel onto the best rarity once anything cracks.
            fx.current.rgb = RARITY_RGB[best.rarity];
            fx.current.rainbow = best.rarity === "divine" && r === "divine";
            fx.current.speed = 1.6;
            if (shownRef.current.every(Boolean)) doneAt.current = Date.now();
        },
        [burst, results, best.rarity],
    );

    // The timeline: charge motes at the start, then each egg cracks after its own shake (staggered).
    useEffect(() => {
        alive.current = true;
        const h = host.current;
        const eggRgb = h ? resolveRgb(h, egg.color, [200, 200, 220]) : ([200, 200, 220] as RGB);
        const bestRgb = RARITY_RGB[best.rarity];
        const total = Math.max(...results.map((r, i) => shakeMs(r) + i * 520));
        fx.current.rgb = eggRgb;
        fx.current.speed = 0.8;
        // Drift from the egg's color toward the best rarity while the shaking builds.
        const steps = 6;
        for (let k = 1; k <= steps; k++) {
            const m = (k / steps) * 0.85;
            timers.current.push(
                setTimeout(() => {
                    if (!shownRef.current.some(Boolean)) {
                        fx.current.rgb = [0, 1, 2].map((c) => eggRgb[c] + (bestRgb[c] - eggRgb[c]) * m) as RGB;
                        fx.current.speed = 0.8 + m * 1.4;
                    }
                }, (total * k) / (steps + 1)),
            );
        }
        results.forEach((r, i) => {
            const e = eggs.current[i];
            const ms = shakeMs(r);
            if (h && e) {
                const rc = e.getBoundingClientRect();
                const hr = h.getBoundingClientRect();
                chargeFx(h, rc.left - hr.left + rc.width / 2, rc.top - hr.top + rc.height / 2, rarityIdx(r.rarity), ms);
            }
            timers.current.push(setTimeout(() => reveal(i), ms + i * 520));
        });
        const list = timers.current;
        return () => {
            alive.current = false;
            list.forEach(clearTimeout);
            timers.current.forEach(clearTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [results]);

    const skip = useCallback(() => {
        if (doneRef.current) {
            // A quick extra tap right as the last egg opens should not close it before it can be read.
            if (Date.now() - doneAt.current > 350) onClose();
            return;
        }
        timers.current.forEach(clearTimeout);
        timers.current = [];
        results.forEach((_, i) => timers.current.push(setTimeout(() => reveal(i), i * 140)));
    }, [onClose, results, reveal]);

    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                skip();
            }
        };
        window.addEventListener("keydown", key, true);
        return () => window.removeEventListener("keydown", key, true);
    }, [skip]);

    const cur = EGG_CUR[egg.cur];
    const n = Math.min(3, results.length);
    return (
        <div
            ref={host}
            role="dialog"
            aria-modal="true"
            aria-label={`Hatching ${egg.name}`}
            className="fi-eg-ov"
            data-fixed={fixed}
            data-n={n}
            style={{ ["--gc" as string]: done ? bestColor : egg.color, ["--ec" as string]: egg.color } as CSSProperties}
            onMouseDown={(e) => e.preventDefault()}
            onDoubleClick={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                skip();
            }}
        >
            <Particles fx={fx} />
            <div className="fi-eg-top">
                <span className="fi-eg-title" style={{ color: egg.color }}>
                    <McSymbol name={egg.symbol} /> {egg.name}{results.length > 1 ? ` x${results.length}` : ""}
                </span>
                <span className="fi-eg-sub">{PET_DIM_BY_ID[egg.dim].name} · paid with {cur.name.toLowerCase()}</span>
            </div>

            <div className="fi-eg-row">
                {results.map((r, i) => {
                    const p = PET_BY_ID.get(r.id)!;
                    const rar = RARITIES[r.rarity];
                    const ri = rarityIdx(r.rarity);
                    return (
                        <div key={i} className="fi-eg-slot" style={{ ["--rc" as string]: rar.color, ["--pc" as string]: p.color, ["--sd" as string]: `${shakeMs(r)}ms` } as CSSProperties}>
                            {shown[i] && ri >= 3 && <span className="fi-eg-rays" data-r={ri} aria-hidden="true" />}
                            <div ref={(el) => { eggs.current[i] = el; }} className="fi-eg-wrap" data-shown={shown[i]}>
                                {!shown[i] ? (
                                    <div className="fi-eg" data-ph="shake">
                                        <span className="fi-eg-sym"><McSymbol name={egg.symbol} /></span>
                                        <svg className="fi-eg-crack" viewBox="0 0 100 130" aria-hidden="true">
                                            <path d="M52 0 L44 24 L58 40 L40 62 L56 82 L46 104 L54 130" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" pathLength={100} />
                                        </svg>
                                    </div>
                                ) : (
                                    <>
                                        <div className="fi-eg fi-eg-half fi-eg-l" aria-hidden="true" />
                                        <div className="fi-eg fi-eg-half fi-eg-r" aria-hidden="true" />
                                    </>
                                )}
                            </div>

                            {shown[i] && (
                                <div className="fi-eg-card" data-r={ri}>
                                    <div className="fi-eg-pet"><McSymbol name={p.symbol} /></div>
                                    <div className="fi-eg-rarity">{rar.name}</div>
                                    <div className="fi-eg-name">{p.name}</div>
                                    <div className="fi-eg-tags">
                                        {r.isNew ? <span className="fi-eg-new">NEW</span> : <span className="fi-eg-dup">{"★".repeat(Math.min(5, r.copies - 1))}{r.copies > 6 ? ` x${r.copies}` : ""} +{Math.round(r.xp).toLocaleString()} xp</span>}
                                        <span style={{ color: PET_DIM_BY_ID[p.dim].color }}>{PET_DIM_BY_ID[p.dim].name}</span>
                                    </div>
                                    <div className="fi-eg-stat">{petStatValue(p.stat, p.base)} {PET_LABEL[p.stat]} at Lv 1</div>
                                    {r.equipped && <div className="fi-eg-eq">Equipped!</div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="fi-eg-hint">{done ? "Tap anywhere to continue" : "Tap to skip"}</div>
        </div>
    );
}

export const EGG_CSS = `
.fi-eg-ov{--es:clamp(5rem,30vw,8rem);position:absolute;inset:0;z-index:130;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(.6rem,2.4vh,1.4rem);padding:max(1rem,env(safe-area-inset-top)) max(.6rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(.6rem,env(safe-area-inset-left));background:radial-gradient(ellipse at 50% 42%,color-mix(in oklch,var(--gc) 26%,#06040e) 0%,rgba(5,3,12,.97) 72%);cursor:pointer;animation:fi-eg-in .25s ease-out both;transition:background .6s;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;outline:none}
.fi-eg-ov[data-fixed="true"]{position:fixed;height:100vh;height:100dvh}
.fi-eg-ov[data-n="1"]{--es:clamp(6rem,38vw,9.5rem)}
.fi-eg-ov[data-n="2"]{--es:clamp(5rem,27vw,8.5rem)}
.fi-eg-ov[data-n="3"]{--es:clamp(3.6rem,19vw,7.5rem)}
.fi-eg-ov *{user-select:none;-webkit-user-select:none}
.fi-eg-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
.fi-eg-top,.fi-eg-row,.fi-eg-hint{position:relative;z-index:1}
@keyframes fi-eg-in{from{opacity:0}}
.fi-eg-top{display:flex;flex-direction:column;align-items:center;gap:.2rem;text-align:center}
.fi-eg-title{font-family:var(--font-minecraft,inherit);font-size:clamp(1rem,4.6vw,1.5rem);text-shadow:0 0 18px currentColor,0 3px 0 rgba(0,0,0,.6)}
.fi-eg-sub{font-family:var(--font-rubik,inherit);font-size:clamp(.55rem,2.2vw,.7rem);letter-spacing:.12em;text-transform:uppercase;color:#a59fb8}
.fi-eg-row{display:flex;flex-wrap:nowrap;align-items:flex-start;justify-content:center;gap:clamp(.3rem,2.5vw,2rem);width:100%;max-width:46rem}
.fi-eg-slot{position:relative;flex:1 1 0;min-width:0;max-width:14rem;display:flex;flex-direction:column;align-items:center;gap:.5rem;min-height:calc(var(--es)*2.5)}
.fi-eg-wrap{position:relative;width:var(--es);height:calc(var(--es)*1.27);margin-top:.6rem;flex:none}
.fi-eg{position:absolute;inset:0;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:radial-gradient(ellipse at 34% 28%,rgba(255,255,255,.7),transparent 42%),linear-gradient(160deg,color-mix(in oklch,var(--ec) 78%,#fff),var(--ec) 55%,color-mix(in oklch,var(--ec) 42%,#000));box-shadow:0 0 34px -2px var(--ec),0 0 80px -10px var(--ec),inset 0 -12px 26px rgba(0,0,0,.38);display:grid;place-items:center;transform-origin:50% 92%}
.fi-eg-sym{font-size:calc(var(--es)*.37);color:rgba(0,0,0,.5);text-shadow:0 1px 0 rgba(255,255,255,.4)}
.fi-eg[data-ph="shake"]{animation:fi-eg-bob 1.4s ease-in-out infinite,fi-eg-shake var(--sd) cubic-bezier(.45,0,.55,1) both,fi-eg-glow .45s ease-in-out infinite alternate}
@keyframes fi-eg-bob{50%{translate:0 -4%}}
@keyframes fi-eg-shake{0%,100%{transform:rotate(0) scale(1)}10%{transform:rotate(-4deg)}20%{transform:rotate(4deg)}30%{transform:rotate(-6deg) scale(1.02)}40%{transform:rotate(6deg)}50%{transform:rotate(-9deg) scale(1.04)}60%{transform:rotate(9deg)}70%{transform:rotate(-12deg) scale(1.07)}80%{transform:rotate(12deg)}90%{transform:rotate(-15deg) scale(1.11)}97%{transform:rotate(2deg) scale(1.16)}}
@keyframes fi-eg-glow{from{filter:brightness(1)}to{filter:brightness(1.28) saturate(1.2)}}
.fi-eg-crack{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 0 6px #fff);stroke-dasharray:100;stroke-dashoffset:100;animation:fi-eg-crack calc(var(--sd)*.62) ease-in calc(var(--sd)*.34) both}
@keyframes fi-eg-crack{to{stroke-dashoffset:0}}
.fi-eg-half{animation:none}
.fi-eg-l{clip-path:polygon(0 0,52% 0,44% 18%,58% 34%,40% 52%,56% 70%,46% 100%,0 100%);animation:fi-eg-l .75s cubic-bezier(.2,.7,.3,1) both}
.fi-eg-r{clip-path:polygon(52% 0,100% 0,100% 100%,46% 100%,56% 70%,40% 52%,58% 34%,44% 18%);animation:fi-eg-r .75s cubic-bezier(.2,.7,.3,1) both}
@keyframes fi-eg-l{to{transform:translate(-120%,40%) rotate(-38deg);opacity:0}}
@keyframes fi-eg-r{to{transform:translate(120%,40%) rotate(38deg);opacity:0}}
.fi-eg-rays{position:absolute;left:50%;top:calc(var(--es)*.9);width:calc(var(--es)*3);height:calc(var(--es)*3);translate:-50% -50%;border-radius:50%;pointer-events:none;background:repeating-conic-gradient(from 0deg,color-mix(in oklch,var(--rc) 55%,transparent) 0 6deg,transparent 6deg 18deg);-webkit-mask-image:radial-gradient(circle,#000 8%,transparent 68%);mask-image:radial-gradient(circle,#000 8%,transparent 68%);animation:fi-eg-spin 14s linear infinite,fi-eg-rin .7s ease-out both}
.fi-eg-rays[data-r="6"]{animation-duration:8s,.7s}
@keyframes fi-eg-spin{to{rotate:360deg}}
@keyframes fi-eg-rin{from{opacity:0;scale:.4}}
.fi-eg-card{position:absolute;left:0;right:0;top:calc(var(--es)*.28);display:flex;flex-direction:column;align-items:center;gap:.25rem;text-align:center;animation:fi-eg-pop .6s cubic-bezier(.2,1.5,.4,1) both}
@keyframes fi-eg-pop{from{transform:translateY(24px) scale(.4);opacity:0}}
.fi-eg-pet{display:grid;place-items:center;width:calc(var(--es)*.8);height:calc(var(--es)*.8);border-radius:calc(var(--es)*.18);font-size:calc(var(--es)*.48);color:var(--pc);background:color-mix(in oklch,var(--rc) 16%,rgba(8,6,18,.7));box-shadow:inset 0 0 0 2px color-mix(in oklch,var(--rc) 70%,transparent),0 0 40px -4px var(--rc),0 0 90px -16px var(--rc);animation:fi-eg-float 2.4s ease-in-out .6s infinite}
.fi-eg-card[data-r="6"] .fi-eg-pet{box-shadow:inset 0 0 0 2px var(--rc),0 0 60px 0 var(--rc),0 0 130px -10px var(--rc)}
@keyframes fi-eg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.fi-eg-rarity{font-family:var(--font-minecraft,inherit);font-size:clamp(.7rem,3.3vw,1.15rem);letter-spacing:.12em;text-transform:uppercase;color:var(--rc);text-shadow:0 0 14px var(--rc),0 0 30px var(--rc),0 3px 0 rgba(0,0,0,.6)}
.fi-eg-card[data-r="0"] .fi-eg-rarity,.fi-eg-card[data-r="1"] .fi-eg-rarity{font-size:clamp(.62rem,2.8vw,.95rem)}
.fi-eg-card[data-r="4"] .fi-eg-rarity,.fi-eg-card[data-r="5"] .fi-eg-rarity{font-size:clamp(.8rem,3.8vw,1.35rem)}
.fi-eg-card[data-r="6"] .fi-eg-rarity{font-size:clamp(.9rem,4.4vw,1.6rem);letter-spacing:.18em}
.fi-eg-name{font-family:var(--font-minecraft,inherit);font-size:clamp(.66rem,3vw,1rem);line-height:1.15;color:#fff;overflow-wrap:anywhere;text-shadow:0 2px 0 rgba(0,0,0,.7),0 0 10px rgba(0,0,0,.6)}
.fi-eg-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem;font-family:var(--font-rubik,inherit);font-size:clamp(.5rem,2.2vw,.66rem)}
.fi-eg-tags span{padding:.05rem .45rem;border-radius:999px;border:1px solid currentColor;background:rgba(0,0,0,.35)}
.fi-eg-new{color:var(--mc-yellow);animation:fi-pulse 1s ease-in-out infinite}
.fi-eg-dup{color:#cfc8dd}
.fi-eg-stat{font-family:var(--font-rubik,inherit);font-size:clamp(.5rem,2.2vw,.68rem);color:#a59fb8}
.fi-eg-eq{font-family:var(--font-minecraft,inherit);font-size:clamp(.55rem,2.4vw,.7rem);color:var(--mc-green);text-shadow:0 0 10px var(--mc-green)}
.fi-eg-hint{font-family:var(--font-rubik,inherit);font-size:clamp(.55rem,2.2vw,.7rem);letter-spacing:.14em;text-transform:uppercase;color:#8f89a3;animation:fi-pulse 2s ease-in-out infinite}
.fi-bk-ov{padding-left:max(clamp(1rem,5vw,3rem),env(safe-area-inset-left));padding-right:max(clamp(1rem,5vw,3rem),env(safe-area-inset-right))}
.fi-bk{position:relative;z-index:1;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:clamp(.8rem,3vw,2.2rem);width:100%;max-width:56rem}
.fi-bk-l{display:flex;flex-direction:column;align-items:center;gap:.5rem;flex:none;--es:clamp(5rem,16vw,8rem)}
.fi-bk-mult{font-family:var(--font-minecraft,inherit);font-size:clamp(1.6rem,6vw,2.6rem);line-height:1;text-shadow:0 0 18px currentColor,0 3px 0 rgba(0,0,0,.65);animation:fi-bk-pop 1.1s ease-in-out infinite}
@keyframes fi-bk-pop{50%{transform:scale(1.12)}}
.fi-bk-egg{position:relative;width:var(--es);height:calc(var(--es)*1.27)}
.fi-bk-egg[data-ph="charge"] .fi-eg{animation:fi-bk-shake 1s cubic-bezier(.45,0,.55,1) both,fi-eg-glow .35s ease-in-out infinite alternate}
.fi-bk-egg[data-ph="pour"] .fi-eg{animation:fi-bk-jit .09s linear infinite,fi-eg-glow .25s ease-in-out infinite alternate}
.fi-bk-egg[data-ph="done"] .fi-eg{animation:none;filter:brightness(.7) saturate(.7);transform:scale(.94);transition:filter .5s,transform .5s}
@keyframes fi-bk-shake{0%,100%{transform:rotate(0) scale(1)}12%{transform:rotate(-5deg)}24%{transform:rotate(5deg)}36%{transform:rotate(-8deg) scale(1.03)}48%{transform:rotate(8deg)}60%{transform:rotate(-11deg) scale(1.06)}72%{transform:rotate(11deg)}84%{transform:rotate(-14deg) scale(1.1)}95%{transform:rotate(2deg) scale(1.15)}}
@keyframes fi-bk-jit{0%{transform:translate(-2px,1px) rotate(-3deg) scale(1.06)}50%{transform:translate(2px,-1px) rotate(3deg) scale(1.1)}100%{transform:translate(-1px,-2px) rotate(-2deg) scale(1.06)}}
.fi-bk-g{flex:1 1 0;min-width:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(4.6rem,1fr));gap:.4rem;align-content:start;max-height:min(58vh,26rem);overflow-y:auto;overscroll-behavior:contain;padding:.3rem;border-radius:1rem;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);scrollbar-width:thin}
.fi-bk-ph{grid-column:1/-1;display:grid;place-items:center;min-height:6rem;font-family:var(--font-rubik,inherit);font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:#8f89a3;animation:fi-pulse 1s ease-in-out infinite}
.fi-bk-w{display:block;min-width:0}
.fi-bk-t{position:relative;display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.4rem .2rem .3rem;border-radius:.7rem;border:1px solid color-mix(in oklch,var(--rc) 60%,transparent);background:color-mix(in oklch,var(--rc) 12%,rgba(8,6,18,.75));box-shadow:0 0 14px -6px var(--rc);will-change:transform,opacity}
.fi-bk-t[data-r="4"],.fi-bk-t[data-r="5"],.fi-bk-t[data-r="6"]{box-shadow:0 0 18px -2px var(--rc),inset 0 0 12px -6px var(--rc)}
.fi-bk-i{font-size:1.5rem;color:var(--pc);line-height:1}
.fi-bk-n{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.52rem;color:#d8d3e6}
.fi-bk-c{font-family:var(--font-minecraft,inherit);font-size:.72rem;color:#fff;text-shadow:0 1px 0 #000}
.fi-bk-new{position:absolute;top:-.3rem;right:-.2rem;padding:0 .3rem;border-radius:999px;background:var(--mc-yellow);color:#000;font-family:var(--font-minecraft,inherit);font-style:normal;font-size:.48rem}
.fi-bk-f{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:.3rem;opacity:0;transform:translateY(6px);transition:opacity .35s,transform .35s;pointer-events:none}
.fi-bk-f[data-show="true"]{opacity:1;transform:none}
.fi-bk-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem}
.fi-bk-chips span{padding:.05rem .5rem;border-radius:999px;border:1px solid;background:rgba(0,0,0,.35);font-family:var(--font-rubik,inherit);font-size:clamp(.5rem,2.3vw,.66rem)}
.fi-bk-s{font-family:var(--font-rubik,inherit);font-size:clamp(.55rem,2.4vw,.7rem);color:#a59fb8;text-align:center}
@media (max-width:640px){.fi-bk{flex-direction:column;gap:.6rem}.fi-bk-l{--es:clamp(4rem,22vw,5.5rem);flex-direction:row;gap:.8rem}.fi-bk-g{flex:0 1 auto;width:100%;max-height:42vh;grid-template-columns:repeat(auto-fill,minmax(4.1rem,1fr))}}
@media (max-height:520px){.fi-bk{flex-direction:row}.fi-bk-l{flex-direction:column;--es:clamp(3rem,16vh,4.5rem)}.fi-bk-g{max-height:56vh}}
@media (max-height:520px){.fi-eg-ov{gap:.3rem}.fi-eg-ov[data-n] {--es:clamp(3.2rem,16vh,5.5rem)}.fi-eg-sub{display:none}}
@media (prefers-reduced-motion:reduce){.fi-eg[data-ph="shake"],.fi-eg-crack,.fi-eg-pet,.fi-eg-hint,.fi-eg-new,.fi-eg-rays{animation:none}.fi-eg-crack{stroke-dashoffset:0}.fi-eg-l,.fi-eg-r{animation-duration:.01s}.fi-bk-mult,.fi-bk-ph,.fi-bk-egg .fi-eg{animation:none!important}}
`;

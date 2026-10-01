"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { EGG_CUR, PET_BY_ID, PET_DIM_BY_ID, RARITIES, petStatValue, PET_LABEL, rarityIdx, type EggDef } from "@/lib/fractured-idle/data";
import type { HatchResult } from "@/lib/fractured-idle/engine";
import { chargeFx, flashScreen, revealFx } from "./enchant-fx";

// The egg opening. It covers the screen, shakes each egg (longer for rarer pulls), cracks it in a burst of the
// rarity's colors and shows the pet. It reuses the enchanting reveal's effects (charge motes, rings, beams,
// full-screen flashes), so a Divine pet lands as big as a Divine enchant. Click anywhere (or press Space, Enter or
// Escape) to skip the wait; click again to close. Up to three eggs open side by side.

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const shakeMs = (r: HatchResult) => (reduced() ? 350 : 1500 + rarityIdx(r.rarity) * 330);

export function EggReveal({ egg, results, onClose, fixed = false }: { egg: EggDef; results: HatchResult[]; onClose: () => void; fixed?: boolean }) {
    const host = useRef<HTMLDivElement>(null);
    const eggs = useRef<(HTMLDivElement | null)[]>([]);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [shown, setShown] = useState<boolean[]>(() => results.map(() => false));
    const done = shown.every(Boolean);
    const best = useMemo(() => results.reduce((a, r) => (rarityIdx(r.rarity) > rarityIdx(a.rarity) ? r : a), results[0]), [results]);
    const bestColor = RARITIES[best.rarity].color;
    const doneRef = useRef(false);
    doneRef.current = done;

    const burst = useCallback(
        (i: number) => {
            const h = host.current;
            const e = eggs.current[i];
            if (!h || !e) return;
            const rc = e.getBoundingClientRect();
            const hr = h.getBoundingClientRect();
            const r = rarityIdx(results[i].rarity);
            revealFx(h, rc.left - hr.left + rc.width / 2, rc.top - hr.top + rc.height / 2, Math.min(7, r + 1));
            flashScreen(h, Math.min(7, r + 1), true);
        },
        [results],
    );

    const reveal = useCallback(
        (i: number) => {
            setShown((s) => (s[i] ? s : s.map((v, k) => (k === i ? true : v))));
            burst(i);
        },
        [burst],
    );

    // The timeline: charge motes at the start, then each egg cracks after its own shake (staggered).
    useEffect(() => {
        const h = host.current;
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
        return () => timers.current.forEach(clearTimeout);
    }, [results, reveal]);

    const skip = useCallback(() => {
        if (doneRef.current) return onClose();
        timers.current.forEach(clearTimeout);
        timers.current = [];
        results.forEach((_, i) => timers.current.push(setTimeout(() => reveal(i), i * 160)));
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
    return (
        <div ref={host} role="dialog" aria-modal="true" aria-label={`Hatching ${egg.name}`} className="fi-eg-ov" data-fixed={fixed} style={{ ["--gc" as string]: done ? bestColor : egg.color, ["--ec" as string]: egg.color } as CSSProperties} onClick={skip}>
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

            <div className="fi-eg-hint">{done ? "Click anywhere to continue" : "Click to skip"}</div>
        </div>
    );
}

export const EGG_CSS = `
.fi-eg-ov{position:absolute;inset:0;z-index:130;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;padding:1rem;background:radial-gradient(ellipse at 50% 42%,color-mix(in oklch,var(--gc) 26%,#06040e) 0%,rgba(5,3,12,.96) 70%);backdrop-filter:blur(6px);cursor:pointer;animation:fi-eg-in .25s ease-out both;transition:background .5s}
.fi-eg-ov[data-fixed="true"]{position:fixed}
@keyframes fi-eg-in{from{opacity:0}}
.fi-eg-top{display:flex;flex-direction:column;align-items:center;gap:.2rem;text-align:center}
.fi-eg-title{font-family:var(--font-minecraft,inherit);font-size:1.4rem;text-shadow:0 0 18px currentColor,0 3px 0 rgba(0,0,0,.6)}
.fi-eg-sub{font-family:var(--font-rubik,inherit);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#a59fb8}
.fi-eg-row{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:center;gap:clamp(.8rem,3vw,2.2rem);max-width:100%}
.fi-eg-slot{position:relative;width:clamp(9rem,26vw,13rem);display:flex;flex-direction:column;align-items:center;gap:.6rem;min-height:22rem}
.fi-eg-wrap{position:relative;width:7.5rem;height:9.5rem;margin-top:1rem;flex:none}
.fi-eg{position:absolute;inset:0;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:radial-gradient(ellipse at 34% 28%,rgba(255,255,255,.7),transparent 42%),linear-gradient(160deg,color-mix(in oklch,var(--ec) 78%,#fff),var(--ec) 55%,color-mix(in oklch,var(--ec) 42%,#000));box-shadow:0 0 34px -2px var(--ec),0 0 80px -10px var(--ec),inset 0 -12px 26px rgba(0,0,0,.38);display:grid;place-items:center;transform-origin:50% 92%}
.fi-eg-sym{font-size:2.8rem;color:rgba(0,0,0,.5);text-shadow:0 1px 0 rgba(255,255,255,.4)}
.fi-eg[data-ph="shake"]{animation:fi-eg-shake var(--sd) cubic-bezier(.45,0,.55,1) both,fi-eg-glow .45s ease-in-out infinite alternate}
@keyframes fi-eg-shake{0%,100%{transform:rotate(0) scale(1)}10%{transform:rotate(-4deg)}20%{transform:rotate(4deg)}30%{transform:rotate(-6deg) scale(1.02)}40%{transform:rotate(6deg)}50%{transform:rotate(-9deg) scale(1.04)}60%{transform:rotate(9deg)}70%{transform:rotate(-12deg) scale(1.07)}80%{transform:rotate(12deg)}90%{transform:rotate(-15deg) scale(1.11)}97%{transform:rotate(2deg) scale(1.16)}}
@keyframes fi-eg-glow{from{filter:brightness(1)}to{filter:brightness(1.28) saturate(1.2)}}
.fi-eg-crack{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 0 6px #fff);stroke-dasharray:100;stroke-dashoffset:100;animation:fi-eg-crack calc(var(--sd)*.62) ease-in calc(var(--sd)*.34) both}
@keyframes fi-eg-crack{to{stroke-dashoffset:0}}
.fi-eg-half{animation:none}
.fi-eg-l{clip-path:polygon(0 0,52% 0,44% 18%,58% 34%,40% 52%,56% 70%,46% 100%,0 100%);animation:fi-eg-l .75s cubic-bezier(.2,.7,.3,1) both}
.fi-eg-r{clip-path:polygon(52% 0,100% 0,100% 100%,46% 100%,56% 70%,40% 52%,58% 34%,44% 18%);animation:fi-eg-r .75s cubic-bezier(.2,.7,.3,1) both}
@keyframes fi-eg-l{to{transform:translate(-120%,40%) rotate(-38deg);opacity:0}}
@keyframes fi-eg-r{to{transform:translate(120%,40%) rotate(38deg);opacity:0}}
.fi-eg-card{position:absolute;left:0;right:0;top:2.75rem;display:flex;flex-direction:column;align-items:center;gap:.3rem;text-align:center;animation:fi-eg-pop .6s cubic-bezier(.2,1.5,.4,1) both}
@keyframes fi-eg-pop{from{transform:translateY(24px) scale(.4);opacity:0}}
.fi-eg-pet{display:grid;place-items:center;width:6rem;height:6rem;border-radius:1.4rem;font-size:3.6rem;color:var(--pc);background:color-mix(in oklch,var(--rc) 16%,rgba(8,6,18,.7));box-shadow:inset 0 0 0 2px color-mix(in oklch,var(--rc) 70%,transparent),0 0 40px -4px var(--rc),0 0 90px -16px var(--rc);animation:fi-eg-float 2.4s ease-in-out .6s infinite}
.fi-eg-card[data-r="6"] .fi-eg-pet{box-shadow:inset 0 0 0 2px var(--rc),0 0 60px 0 var(--rc),0 0 130px -10px var(--rc)}
@keyframes fi-eg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.fi-eg-rarity{font-family:var(--font-minecraft,inherit);font-size:1.15rem;letter-spacing:.14em;text-transform:uppercase;color:var(--rc);text-shadow:0 0 14px var(--rc),0 0 30px var(--rc),0 3px 0 rgba(0,0,0,.6)}
.fi-eg-card[data-r="0"] .fi-eg-rarity,.fi-eg-card[data-r="1"] .fi-eg-rarity{font-size:.95rem}
.fi-eg-card[data-r="4"] .fi-eg-rarity,.fi-eg-card[data-r="5"] .fi-eg-rarity{font-size:1.35rem}
.fi-eg-card[data-r="6"] .fi-eg-rarity{font-size:1.6rem;letter-spacing:.2em}
.fi-eg-name{font-family:var(--font-minecraft,inherit);font-size:1rem;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.7),0 0 10px rgba(0,0,0,.6)}
.fi-eg-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:.35rem;font-family:var(--font-rubik,inherit);font-size:.66rem}
.fi-eg-tags span{padding:.05rem .5rem;border-radius:999px;border:1px solid currentColor;background:rgba(0,0,0,.35)}
.fi-eg-new{color:var(--mc-yellow);animation:fi-pulse 1s ease-in-out infinite}
.fi-eg-dup{color:#cfc8dd}
.fi-eg-stat{font-family:var(--font-rubik,inherit);font-size:.68rem;color:#a59fb8}
.fi-eg-eq{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:var(--mc-green);text-shadow:0 0 10px var(--mc-green)}
.fi-eg-hint{font-family:var(--font-rubik,inherit);font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8f89a3;animation:fi-pulse 2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.fi-eg[data-ph="shake"],.fi-eg-crack,.fi-eg-pet,.fi-eg-hint,.fi-eg-new{animation:none}.fi-eg-crack{stroke-dashoffset:0}.fi-eg-l,.fi-eg-r{animation-duration:.01s}}
`;

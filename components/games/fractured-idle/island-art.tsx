"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { DecoKind, DecoSpec, IslandDef, Sil } from "@/lib/fractured-idle/islands";

// Island scenery, drawn entirely from the theme data in islands.ts: a sky, stars,
// a sun or moon, clouds, two silhouette layers, a floating island with
// decorations and drifting particles. Every layer sits at its own depth and
// shifts with the pointer (--px / --py, set by the parent), and the island
// itself tilts in 3D, so a scene reads as a small diorama.
//   stage     the full-screen hero in the travel menu
//   thumb     a tiny, still card for the picker strip
//   backdrop  a dimmed version behind the button in the game

// ---- Seeded randomness (scenes never change between renders) ----

function seeded(seed: string) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---- Silhouettes ----

const W = 400;

function silPath(kind: Sil, seed: string): string {
    const r = seeded(seed + kind);
    const p: string[] = [];
    const L = (x: number, y: number) => p.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
    p.push("M0,100");
    let x = 0;
    switch (kind) {
        case "mountains":
            L(0, 75);
            while (x < W) {
                const pw = 30 + r() * 50;
                L(x + pw / 2, 100 - (30 + r() * 55));
                x += pw;
                L(x, 100 - (8 + r() * 20));
            }
            break;
        case "domes": {
            p.push("L0,70");
            let y = 70;
            while (x < W) {
                const ny = 100 - (25 + r() * 35);
                p.push(`Q${(x + 45).toFixed(1)},${(Math.min(y, ny) - 18 - r() * 20).toFixed(1)} ${(x + 90).toFixed(1)},${ny.toFixed(1)}`);
                x += 90;
                y = ny;
            }
            break;
        }
        case "pines":
            L(0, 92);
            while (x < W) {
                const step = 9 + r() * 9;
                L(x, 96);
                L(x + step / 2, 100 - (22 + r() * 48));
                x += step;
            }
            break;
        case "spires":
            L(0, 88);
            while (x < W) {
                const w = 7 + r() * 8;
                L(x, 88);
                L(x + w / 2, 100 - (40 + r() * 55));
                x += w + r() * 10;
            }
            break;
        case "crystals":
            L(0, 90);
            while (x < W) {
                const w = 14 + r() * 18;
                const top = 100 - (35 + r() * 55);
                L(x, 90);
                L(x + w * 0.25, top);
                L(x + w * 0.75, top + 10);
                L(x + w, 90);
                x += w + r() * 8;
            }
            break;
        case "pillars":
            while (x < W) {
                const w = 10 + r() * 12;
                const top = 100 - (32 + r() * 58);
                L(x, 100 - 14);
                L(x, top);
                L(x + w * 0.6, top - 3 + r() * 6);
                L(x + w, top + 4);
                L(x + w, 100 - 14);
                x += w + 6 + r() * 26;
            }
            break;
        case "mesas":
            while (x < W) {
                const w = 34 + r() * 60;
                const top = 100 - (28 + r() * 40);
                L(x, 100);
                L(x + 6, top);
                L(x + w - 6, top);
                L(x + w, 100);
                x += w + r() * 16;
            }
            break;
        case "towers":
            L(0, 100);
            while (x < W) {
                const w = 14 + r() * 12;
                const top = 100 - (34 + r() * 52);
                L(x, 100);
                L(x, top);
                const teeth = 3;
                for (let t = 0; t < teeth; t++) {
                    L(x + (w / teeth) * t, top - 5);
                    L(x + (w / teeth) * (t + 0.5), top - 5);
                    L(x + (w / teeth) * (t + 0.5), top);
                    L(x + (w / teeth) * (t + 1), top);
                }
                L(x + w, 100);
                x += w + 4 + r() * 22;
            }
            break;
        case "waves":
            L(0, 60);
            while (x < W) {
                p.push(`Q${(x + 25).toFixed(1)},${(38 + r() * 16).toFixed(1)} ${(x + 50).toFixed(1)},${(58 + r() * 8).toFixed(1)}`);
                x += 50;
            }
            break;
        case "islets": {
            p.length = 0;
            for (let i = 0; i < 6; i++) {
                const cx = 20 + (i / 6) * 360 + r() * 40;
                const cy = 18 + r() * 52;
                const rx = 14 + r() * 26;
                const ry = 4 + r() * 6;
                p.push(`M${(cx - rx).toFixed(1)},${cy.toFixed(1)} L${(cx + rx).toFixed(1)},${cy.toFixed(1)} L${(cx + rx * 0.5).toFixed(1)},${(cy + ry * 1.6).toFixed(1)} L${cx.toFixed(1)},${(cy + ry * 3).toFixed(1)} L${(cx - rx * 0.5).toFixed(1)},${(cy + ry * 1.4).toFixed(1)} Z`);
            }
            return p.join(" ");
        }
    }
    L(W, kind === "domes" ? 70 : 100);
    p.push("L400,100 Z");
    return p.join(" ");
}

// ---- Decorations (drawn on a 40x50 box, baseline at the bottom) ----

function Deco({ d }: { d: DecoSpec }) {
    const c = d.c;
    const c2 = d.c2;
    const g = (kind: DecoKind): ReactNode => {
        switch (kind) {
            case "tree":
                return (
                    <>
                        <rect x="18" y="30" width="4" height="20" fill="#6b4423" />
                        <circle cx="20" cy="20" r="14" fill={c ?? "#3aa25a"} />
                        <circle cx="12" cy="27" r="9" fill={c ?? "#3aa25a"} />
                        <circle cx="28" cy="26" r="9" fill={c ?? "#3aa25a"} />
                        <circle cx="16" cy="14" r="6" fill="rgba(255,255,255,.2)" />
                    </>
                );
            case "pine":
                return (
                    <>
                        <rect x="18" y="38" width="4" height="12" fill="#6b4423" />
                        <polygon points="20,2 32,22 8,22" fill={c ?? "#2a7a42"} />
                        <polygon points="20,12 35,34 5,34" fill={c ?? "#2a7a42"} />
                        <polygon points="20,22 37,44 3,44" fill={c ?? "#2a7a42"} />
                    </>
                );
            case "crystal":
                return (
                    <>
                        <polygon points="10,20 15,38 10,50 5,38" fill={c ?? "#5cc8ff"} opacity=".8" />
                        <polygon points="30,24 35,40 30,50 25,40" fill={c ?? "#5cc8ff"} opacity=".8" />
                        <polygon points="20,1 27,30 20,50 13,30" fill={c ?? "#5cc8ff"} />
                        <polygon points="20,1 27,30 20,30" fill={c2 ?? "#ffffff"} opacity=".55" />
                    </>
                );
            case "mushroom":
                return (
                    <>
                        <rect x="16" y="28" width="8" height="22" rx="3" fill="#f0e6d0" />
                        <path d="M3 32 Q20 -6 37 32 Z" fill={c ?? "#d8303a"} />
                        <circle cx="14" cy="20" r="3" fill={c2 ?? "#fff"} />
                        <circle cx="25" cy="15" r="2.4" fill={c2 ?? "#fff"} />
                        <circle cx="29" cy="25" r="2" fill={c2 ?? "#fff"} />
                    </>
                );
            case "wheat":
                return (
                    <>
                        <ellipse cx="20" cy="47" rx="19" ry="4" fill="#b8923a" />
                        {[6, 11, 16, 21, 26, 31, 35].map((x, i) => (
                            <g key={x}>
                                <path d={`M${x} 48 Q${x + (i % 2 ? 2 : -2)} 34 ${x} ${22 + (i % 3) * 3}`} stroke="#7a8a2a" strokeWidth="1.4" fill="none" />
                                <ellipse cx={x} cy={20 + (i % 3) * 3} rx="2.2" ry="5" fill={c ?? "#e8c340"} />
                                <ellipse cx={x} cy={17 + (i % 3) * 3} rx="1" ry="2" fill={c2 ?? "#fff3a0"} />
                            </g>
                        ))}
                    </>
                );
            case "tower":
                return (
                    <>
                        <polygon points="7,18 20,1 33,18" fill={c2 ?? "#8a4a2a"} />
                        <rect x="10" y="18" width="20" height="32" fill={c ?? "#d8c48a"} />
                        <rect x="10" y="16" width="4" height="4" fill={c ?? "#d8c48a"} />
                        <rect x="18" y="16" width="4" height="4" fill={c ?? "#d8c48a"} />
                        <rect x="26" y="16" width="4" height="4" fill={c ?? "#d8c48a"} />
                        <rect x="17" y="24" width="6" height="9" rx="3" fill={c2 ?? "#8a4a2a"} opacity=".9" />
                        <rect x="16" y="40" width="8" height="10" rx="1" fill="rgba(0,0,0,.35)" />
                    </>
                );
            case "torch":
                return (
                    <>
                        <circle cx="20" cy="18" r="13" fill={c2 ?? "#ffb02e"} opacity=".22" />
                        <rect x="18.5" y="24" width="3" height="26" fill="#6b4423" />
                        <path className="fi-flame" d="M20 4 Q28 16 24 24 Q20 28 16 24 Q12 16 20 4 Z" fill={c2 ?? "#ffb02e"} />
                        <path className="fi-flame" d="M20 12 Q24 19 22 24 Q20 26 18 24 Q16 19 20 12 Z" fill="#fff3b0" />
                    </>
                );
            case "lava":
                return (
                    <>
                        <ellipse cx="20" cy="44" rx="19" ry="6" fill="#3a1208" />
                        <ellipse cx="20" cy="43" rx="16" ry="4.6" fill={c ?? "#ff5a14"} />
                        <ellipse cx="17" cy="42" rx="8" ry="2.2" fill={c2 ?? "#ffd23a"} />
                        <circle className="fi-bubble" cx="26" cy="40" r="2" fill={c2 ?? "#ffd23a"} />
                    </>
                );
            case "portal":
                return (
                    <>
                        <rect x="5" y="6" width="30" height="44" rx="4" fill="#1c1c24" stroke="#4a4a58" strokeWidth="1.5" />
                        <rect x="9" y="10" width="22" height="36" rx="3" fill={c ?? "#b388ff"} opacity=".9" />
                        <ellipse className="fi-swirl" cx="20" cy="28" rx="8" ry="14" fill="none" stroke="#fff" strokeWidth="1" opacity=".6" />
                        <ellipse cx="20" cy="28" rx="3" ry="6" fill="#fff" opacity=".5" />
                    </>
                );
            case "pillar":
                return (
                    <>
                        <polygon points="13,14 18,10 22,14 27,11 27,50 13,50" fill={c ?? "#8a8a9a"} />
                        <rect x="10" y="44" width="20" height="6" fill={c2 ?? "#b8b8c8"} />
                        <polygon points="13,14 18,10 22,14 27,11 27,16 13,16" fill={c2 ?? "#b8b8c8"} opacity=".8" />
                    </>
                );
            case "web":
                return (
                    <g stroke={c ?? "#e8d8ff"} strokeWidth=".9" fill="none" opacity=".9">
                        <path d="M20 28 L3 6 M20 28 L37 6 M20 28 L20 2 M20 28 L4 44 M20 28 L36 44 M20 28 L0 26 M20 28 L40 26" />
                        <path d="M11 17 Q20 22 29 17 M7 12 Q20 20 33 12 M12 37 Q20 32 28 37 M8 41 Q20 34 32 41" />
                        <circle cx="20" cy="28" r="1.6" fill={c ?? "#e8d8ff"} />
                    </g>
                );
            case "coral":
                return (
                    <g stroke={c ?? "#ff7aa8"} strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M20 50 L20 26 M20 38 L10 26 M20 33 L30 19 M10 26 L8 15 M30 19 L34 10 M20 26 L19 14" />
                        {[[8, 15], [34, 10], [19, 14]].map(([x, y]) => (
                            <circle key={x} cx={x} cy={y} r="2.4" fill={c2 ?? "#ffd0e0"} stroke="none" />
                        ))}
                    </g>
                );
            case "chest":
                return (
                    <>
                        <rect x="5" y="28" width="30" height="20" rx="2" fill={c ?? "#8a5a2a"} />
                        <path d="M5 28 Q20 12 35 28 Z" fill={c ?? "#8a5a2a"} />
                        <path d="M5 28 Q20 12 35 28" stroke={c2 ?? "#d8a84a"} strokeWidth="2.4" fill="none" />
                        <rect x="5" y="36" width="30" height="3" fill={c2 ?? "#d8a84a"} />
                        <circle cx="20" cy="34" r="2.6" fill={c2 ?? "#ffd23a"} />
                    </>
                );
            case "spike":
                return (
                    <>
                        <polygon points="6,50 13,18 20,50" fill={c ?? "#2a2030"} />
                        <polygon points="15,50 22,4 31,50" fill={c ?? "#2a2030"} />
                        <polygon points="26,50 32,24 38,50" fill={c ?? "#2a2030"} />
                        <polygon points="22,4 26,30 22,50" fill={c2 ?? "#ffffff"} opacity=".18" />
                    </>
                );
        }
    };
    const depth = 0.72 + d.y / 260; // nearer things are a touch bigger
    const style = { left: `${d.x}%`, top: `${30 + d.y * 0.62}%`, ["--ds" as string]: (d.s ?? 1) * depth, zIndex: Math.round(d.y) } as CSSProperties;
    return (
        <svg className="fi-deco" viewBox="0 0 40 50" style={style} aria-hidden="true">
            {g(d.k)}
        </svg>
    );
}

// ---- Scene ----

interface SceneProps {
    island: IslandDef;
    variant?: "stage" | "thumb" | "backdrop";
    locked?: boolean;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}

const FX_COUNT = { stage: 1, backdrop: 0.6, thumb: 0 } as const;

export function IslandScene({ island, variant = "stage", locked, className = "", style, children }: SceneProps) {
    const t = island.theme;
    const pieces = useMemo(() => {
        const r = seeded(island.id + "sky");
        const stars = Array.from({ length: t.stars ?? 0 }, (_, i) => ({ x: r() * 100, y: r() * 62, s: 0.6 + r() * 1.4, tw: i % 3 === 0 }));
        const clouds = t.clouds ? Array.from({ length: 4 }, (_, i) => ({ y: 8 + r() * 26, s: 0.7 + r() * 0.8, d: 50 + r() * 50, o: -r() * 80, i })) : [];
        return { stars, clouds, far: silPath(t.far[0], island.id + "far"), mid: silPath(t.mid[0], island.id + "mid") };
    }, [island.id, t]);
    const nFx = Math.round(t.fx[2] * FX_COUNT[variant]);
    const sky = `linear-gradient(180deg, ${t.sky[0]} 0%, ${t.sky[1]} 52%, ${t.sky[2]} 100%)`;
    return (
        <div className={`fi-scene fi-scene-${variant} ${/\babsolute\b/.test(className) ? "" : "relative"} ${locked ? "fi-scene-locked" : ""} ${variant === "thumb" ? "fi-still" : ""} ${className}`} style={{ background: sky, ...style }} data-fx={t.fx[0]}>
            {pieces.stars.length > 0 && (
                <svg className="fi-layer fi-stars" viewBox="0 0 100 62" preserveAspectRatio="none" style={{ ["--dx" as string]: 4, ["--dy" as string]: 3 } as CSSProperties} aria-hidden="true">
                    {pieces.stars.map((s, i) => (
                        <circle key={i} className={s.tw ? "fi-twink" : ""} cx={s.x} cy={s.y} r={s.s * 0.22} fill="#fff" style={{ animationDelay: `${(i % 7) * 0.4}s` }} />
                    ))}
                </svg>
            )}
            {t.orb && (
                <div className="fi-layer" style={{ ["--dx" as string]: 10, ["--dy" as string]: 7 } as CSSProperties}>
                    <div
                        className="fi-orb-body"
                        style={{
                            left: `${t.orb.x}%`,
                            top: `${t.orb.y}%`,
                            width: `${t.orb.r * 1.15}cqmin`,
                            height: `${t.orb.r * 1.15}cqmin`,
                            background: t.orb.ring ? `radial-gradient(circle, #0a0510 55%, ${t.orb.c} 58%, ${t.orb.c} 62%, transparent 72%)` : `radial-gradient(circle, #fff 0, ${t.orb.c} 45%, transparent 72%)`,
                            boxShadow: `0 0 ${t.orb.r * 2}cqmin ${t.orb.c}`,
                        }}
                    />
                </div>
            )}
            {pieces.clouds.map((c) => (
                <div key={c.i} className="fi-layer" style={{ ["--dx" as string]: 16, ["--dy" as string]: 5 } as CSSProperties}>
                    <span className="fi-cloud" style={{ top: `${c.y}%`, ["--cs" as string]: c.s, ["--cd" as string]: `${c.d}s`, animationDelay: `${c.o}s`, color: t.clouds }} />
                </div>
            ))}
            <svg className="fi-layer fi-far" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ ["--dx" as string]: 22, ["--dy" as string]: 10 } as CSSProperties} aria-hidden="true">
                <path d={pieces.far} fill={t.far[1]} />
            </svg>
            <svg className="fi-layer fi-mid" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ ["--dx" as string]: 40, ["--dy" as string]: 16 } as CSSProperties} aria-hidden="true">
                <path d={pieces.mid} fill={t.mid[1]} />
            </svg>
            <div className="fi-fog" style={{ background: `linear-gradient(180deg, transparent, ${t.sky[2]}55)` }} />
            {variant !== "backdrop" && (
                <div className="fi-layer fi-herolayer" style={{ ["--dx" as string]: 64, ["--dy" as string]: 26 } as CSSProperties}>
                    <div className="fi-hero">
                        <div className="fi-hero-shadow" style={{ background: `radial-gradient(ellipse, ${t.land.edge}55, transparent 68%)` }} />
                        <div className="fi-hero-float">
                            <div className="fi-hero-tilt">
                                <div className="fi-rock" style={{ background: `linear-gradient(180deg, ${t.land.rock}, ${t.land.rock2})` }} />
                                <div className="fi-rockfx" />
                                <div className="fi-top" style={{ background: `radial-gradient(ellipse at 50% 30%, ${t.land.edge}, ${t.land.top} 72%)` }}>
                                    {[...t.deco].sort((a, b) => a.y - b.y).map((d, i) => (
                                        <Deco key={i} d={d} />
                                    ))}
                                </div>
                                <span className="fi-islet a" style={{ background: t.land.rock }} />
                                <span className="fi-islet b" style={{ background: t.land.rock2 }} />
                                <span className="fi-islet c" style={{ background: t.land.rock }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {nFx > 0 && (
                <div className="fi-layer fi-fxlayer" style={{ ["--dx" as string]: 90, ["--dy" as string]: 34, color: t.fx[1] } as CSSProperties} aria-hidden="true">
                    {Array.from({ length: nFx }, (_, i) => (
                        <span key={i} className={`fi-p fi-p-${t.fx[0]}`} style={{ left: `${(i * 53 + 7) % 100}%`, ["--pd" as string]: `${4 + (i % 6) * 1.3}s`, ["--pl" as string]: `${-(i * 0.73)}s`, ["--pw" as string]: `${(i % 5) * 6 - 10}px`, ["--ps" as string]: 0.6 + (i % 4) * 0.25 } as CSSProperties} />
                    ))}
                </div>
            )}
            <div className="fi-vignette" />
            {children}
        </div>
    );
}

export const ISLAND_CSS = `
.fi-scene{overflow:hidden;container-type:size;isolation:isolate;--px:0;--py:0}
.fi-layer{position:absolute;inset:0;pointer-events:none;transform:translate3d(calc(var(--px)*var(--dx)*1px),calc(var(--py)*var(--dy)*1px),0);transition:transform .25s ease-out;will-change:transform}
.fi-scene-thumb .fi-layer,.fi-scene-backdrop .fi-layer{transform:none;transition:none;will-change:auto}
.fi-stars{width:100%;height:62%}
.fi-twink{animation:fi-tw 2.6s ease-in-out infinite alternate}
@keyframes fi-tw{from{opacity:.25}to{opacity:1}}
.fi-orb-body{position:absolute;border-radius:50%;transform:translate(-50%,-50%)}
.fi-cloud{position:absolute;left:-20%;width:18cqw;height:4.2cqw;border-radius:99px;background:currentColor;opacity:.78;transform:scale(var(--cs));animation:fi-drift var(--cd) linear infinite}
.fi-cloud::before,.fi-cloud::after{content:"";position:absolute;background:currentColor;border-radius:50%}
.fi-cloud::before{width:45%;height:150%;left:14%;top:-70%}
.fi-cloud::after{width:35%;height:120%;left:48%;top:-45%}
@keyframes fi-drift{from{left:-22%}to{left:108%}}
.fi-far,.fi-mid{left:-6%;width:112%;top:auto}
.fi-far{bottom:30%;height:34%;opacity:.95}
.fi-mid{bottom:20%;height:32%}
.fi-scene-backdrop .fi-far{bottom:14%;height:30%}
.fi-scene-backdrop .fi-mid{bottom:5%;height:28%}
.fi-scene-backdrop::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.55) 70%)}
.fi-fog{position:absolute;left:0;right:0;bottom:0;height:45%;pointer-events:none}
.fi-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 55%,transparent 55%,rgba(0,0,0,.55))}
.fi-scene-locked{filter:grayscale(.85) brightness(.55)}
.fi-herolayer{display:grid;place-items:center;perspective:1100px}
.fi-hero{--hw:min(42cqw,56cqh);position:relative;width:var(--hw);aspect-ratio:1/.94;margin:0 0 0 6cqw;transform-style:preserve-3d}
.fi-scene-thumb .fi-hero{--hw:min(80cqw,92cqh);margin:0}
.fi-hero-float{position:absolute;inset:0;animation:fi-float 6s ease-in-out infinite;transform-style:preserve-3d}
.fi-scene-thumb .fi-hero-float{animation:none}
.fi-hero-tilt{position:absolute;inset:0;transform-style:preserve-3d;transform:rotateX(calc(var(--py)*-7deg)) rotateY(calc(var(--px)*12deg));transition:transform .25s ease-out}
.fi-scene-thumb .fi-hero-tilt{transform:none}
@keyframes fi-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3.2%)}}
.fi-hero-shadow{position:absolute;left:14%;right:14%;bottom:-8%;height:10%;border-radius:50%;filter:blur(10px);opacity:.7;animation:fi-shadow 6s ease-in-out infinite}
@keyframes fi-shadow{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(.88);opacity:.45}}
.fi-rock{position:absolute;left:5%;width:90%;top:20%;height:80%;clip-path:polygon(0 0,100% 0,95% 14%,89% 27%,82% 38%,75% 52%,69% 63%,62% 76%,55% 100%,49% 84%,42% 72%,34% 62%,26% 48%,18% 34%,10% 20%);filter:brightness(.92)}
.fi-rockfx{position:absolute;left:5%;width:90%;top:20%;height:80%;clip-path:polygon(0 0,100% 0,95% 14%,89% 27%,82% 38%,75% 52%,69% 63%,62% 76%,55% 100%,49% 84%,42% 72%,34% 62%,26% 48%,18% 34%,10% 20%);background:repeating-linear-gradient(180deg,rgba(255,255,255,.05) 0 2px,transparent 2px 22px),linear-gradient(90deg,rgba(0,0,0,.4),transparent 40%,rgba(255,255,255,.08) 70%,rgba(0,0,0,.35));pointer-events:none}
.fi-top{position:absolute;left:0;top:0;width:100%;height:36%;border-radius:50%;box-shadow:inset 0 -.5cqw 0 rgba(0,0,0,.18),0 .5cqw 0 rgba(0,0,0,.28),0 0 3cqw rgba(255,255,255,.08)}
.fi-deco{position:absolute;width:calc(var(--hw)*.24*var(--ds,1));transform:translate(-50%,-100%);overflow:visible;filter:drop-shadow(0 .4cqw 0 rgba(0,0,0,.25))}
.fi-flame{animation:fi-flick .35s ease-in-out infinite alternate;transform-origin:50% 100%;transform-box:fill-box}
@keyframes fi-flick{from{transform:scale(1,.92) skewX(-2deg)}to{transform:scale(1.06,1.06) skewX(2deg)}}
.fi-bubble{animation:fi-bub 1.8s ease-in-out infinite alternate}
@keyframes fi-bub{from{transform:translateY(0)}to{transform:translateY(-3px)}}
.fi-swirl{animation:fi-sw 3s linear infinite;transform-origin:50% 50%;transform-box:fill-box}
@keyframes fi-sw{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.fi-islet{position:absolute;clip-path:polygon(0 0,100% 0,70% 100%,30% 75%);animation:fi-float 7s ease-in-out infinite}
.fi-islet.a{left:-6%;top:28%;width:12%;height:12%;animation-delay:-1s}
.fi-islet.b{right:-4%;top:40%;width:9%;height:10%;animation-delay:-3s}
.fi-islet.c{left:8%;top:70%;width:7%;height:8%;animation-delay:-5s}
.fi-scene-thumb .fi-islet{animation:none}
.fi-fxlayer{overflow:hidden}
.fi-p{position:absolute;width:calc(5px*var(--ps));height:calc(5px*var(--ps));border-radius:50%;background:currentColor;box-shadow:0 0 calc(10px*var(--ps)) currentColor;opacity:0;animation:var(--fxa) var(--pd) linear infinite;animation-delay:var(--pl)}
.fi-p-motes{--fxa:fi-mote;top:60%}
.fi-p-fireflies{--fxa:fi-fly;top:55%}
.fi-p-embers{--fxa:fi-ember;bottom:-4%}
.fi-p-sparks{--fxa:fi-spark;top:60%;width:2px;height:calc(9px*var(--ps));border-radius:1px}
.fi-p-ash{--fxa:fi-ash;top:-4%;box-shadow:none;opacity:.6}
.fi-p-snow{--fxa:fi-ash;top:-4%}
.fi-p-bubbles{--fxa:fi-bubble;bottom:-6%;background:transparent;border:1.5px solid currentColor;box-shadow:inset 0 0 6px currentColor;width:calc(10px*var(--ps));height:calc(10px*var(--ps))}
.fi-p-rain{--fxa:fi-rain;top:-10%;width:1.5px;height:calc(18px*var(--ps));border-radius:1px;background:linear-gradient(transparent,currentColor);box-shadow:none}
@keyframes fi-mote{0%{transform:translate(0,0);opacity:0}20%{opacity:.9}100%{transform:translate(var(--pw),-38cqh);opacity:0}}
@keyframes fi-fly{0%{transform:translate(0,0);opacity:0}15%{opacity:.95}50%{transform:translate(var(--pw),-12cqh);opacity:.4}85%{opacity:.9}100%{transform:translate(calc(var(--pw)*-1),-22cqh);opacity:0}}
@keyframes fi-ember{0%{transform:translate(0,0) scale(1);opacity:0}15%{opacity:1}100%{transform:translate(var(--pw),-70cqh) scale(.3);opacity:0}}
@keyframes fi-spark{0%{transform:translate(0,0) rotate(20deg);opacity:0}20%{opacity:1}100%{transform:translate(var(--pw),-30cqh) rotate(20deg);opacity:0}}
@keyframes fi-ash{0%{transform:translate(0,0);opacity:0}15%{opacity:.8}100%{transform:translate(var(--pw),108cqh);opacity:0}}
@keyframes fi-bubble{0%{transform:translate(0,0) scale(.6);opacity:0}15%{opacity:.8}100%{transform:translate(var(--pw),-86cqh) scale(1.2);opacity:0}}
@keyframes fi-rain{0%{transform:translate(0,0);opacity:0}10%{opacity:.8}100%{transform:translate(-14px,112cqh);opacity:0}}
@media (prefers-reduced-motion:reduce){.fi-p,.fi-cloud,.fi-hero-float,.fi-hero-shadow,.fi-islet,.fi-twink,.fi-flame,.fi-swirl,.fi-bubble{animation:none}.fi-layer,.fi-hero-tilt{transition:none}}
`;

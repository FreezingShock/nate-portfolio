"use client";

import type { ButtonHTMLAttributes, CSSProperties, Ref } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { GLYPHS } from "@/lib/fractured-idle/button";
import { tint } from "./ui";

// The click button, drawn from three independent layers so any shape can take
// any skin: wrapper (glow + depth via drop-shadow, which follows the clip),
// rim (clipped, accent colored) and face (clipped and inset, skin painted).
// Skin CSS lives in BTN_CSS; shapes are clip-paths below.

const star = (() => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 50 : 24;
        const a = (-90 + i * 36) * (Math.PI / 180);
        pts.push(`${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`);
    }
    return `polygon(${pts.join(",")})`;
})();

const CLIP: Record<string, { rim: string; face: string; glyph: number }> = {
    block: { rim: "inset(0 round 2rem)", face: "inset(0 round 1.65rem)", glyph: 1 },
    orb: { rim: "circle(50%)", face: "circle(50%)", glyph: 1 },
    hex: { rim: "polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)", face: "polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)", glyph: 0.9 },
    diamond: { rim: "polygon(50% 0,100% 50%,50% 100%,0 50%)", face: "polygon(50% 0,100% 50%,50% 100%,0 50%)", glyph: 0.7 },
    octagon: { rim: "polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)", face: "polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)", glyph: 0.95 },
    bastion: { rim: "polygon(0 0,100% 0,100% 58%,50% 100%,0 58%)", face: "polygon(0 0,100% 0,100% 58%,50% 100%,0 58%)", glyph: 0.85 },
    nova: { rim: star, face: star, glyph: 0.6 },
};

const SKIN_ACCENT: Record<string, string> = {
    glass: "#8fe8ff",
    ember: "#ff7a2a",
    frost: "#a8e2ff",
    circuit: "#39ff88",
    void: "#9a4dff",
    gold: "#ffd23a",
    prism: "#ff5fd2",
};

export const skinAccent = (skin: string, island: string) => SKIN_ACCENT[skin] ?? island;

interface Props {
    shape: string;
    skin: string;
    glyph: string;
    color: string; // island color, used by the "island" skin
    className?: string;
    depth?: number; // px of 3D lip under the button
    as?: "button" | "span";
    btnRef?: Ref<HTMLButtonElement>;
    wrapRef?: Ref<HTMLDivElement>;
    btnProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

export function ButtonFace({ shape, skin, glyph, color, className = "", depth = 8, as = "span", btnRef, wrapRef, btnProps }: Props) {
    const c = CLIP[shape] ?? CLIP.block;
    const accent = skinAccent(skin, color);
    const inset = Math.max(2, Math.round(depth * 0.6));
    const sym = GLYPHS.find((g) => g.id === glyph)?.symbol ?? "speed";
    const vars = {
        ["--a" as string]: accent,
        ["--shade" as string]: tint(accent, 70),
        ["--glow" as string]: tint(accent, 45),
        ["--depth" as string]: `${depth}px`,
    } as CSSProperties;
    const rim: CSSProperties = { clipPath: c.rim };
    const inner = (
        <>
            <span className={`fi-face fi-skin-${skin}`} style={{ clipPath: c.face, inset }}>
                <span className="fi-glyph grid size-full place-items-center text-white" style={{ ["--g" as string]: c.glyph } as CSSProperties}>
                    <McSymbol name={sym} />
                </span>
            </span>
        </>
    );
    return (
        <div ref={wrapRef} className={`fi-wrap ${className}`} style={vars}>
            {as === "button" ? (
                <button ref={btnRef} type="button" tabIndex={-1} className={`fi-rim fi-rim-${skin}`} style={rim} {...btnProps}>
                    {inner}
                </button>
            ) : (
                <span className={`fi-rim fi-rim-${skin}`} style={rim}>
                    {inner}
                </span>
            )}
        </div>
    );
}

export const BTN_CSS = `
.fi-wrap{position:relative;display:block;container-type:size;--heat:0;filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 calc(12px + var(--heat)*34px) var(--glow)) brightness(calc(1 + var(--heat)*.12))}
.fi-rim{position:absolute;inset:0;width:100%;height:100%;display:block;border:0;padding:0;cursor:pointer;background:linear-gradient(180deg,rgba(255,255,255,.4),transparent 40%),var(--a);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none}
.fi-rim-prism{background:conic-gradient(from 0deg,#ff4d4d,#ffd24d,#7dff4d,#4dffe0,#4d7dff,#d24dff,#ff4d4d);animation:fi-hue 6s linear infinite}
.fi-face{position:absolute;display:block;overflow:hidden;pointer-events:none}
.fi-face::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.26),transparent 46%);pointer-events:none}
.fi-glyph{filter:drop-shadow(0 calc(var(--depth)*.35) 0 rgba(0,0,0,.45));line-height:1;font-size:calc(var(--g,1)*40cqw)}
.fi-skin-island{background:linear-gradient(160deg,color-mix(in oklch,var(--a) 55%,#0b0b14),color-mix(in oklch,var(--a) 20%,#0b0b14))}
.fi-skin-glass{background:linear-gradient(145deg,rgba(255,255,255,.38),rgba(255,255,255,.06) 55%,rgba(255,255,255,.2)),rgba(110,215,255,.16);backdrop-filter:blur(5px);box-shadow:inset 0 0 22px rgba(255,255,255,.3)}
.fi-skin-ember{background:radial-gradient(circle at 30% 75%,#ffd23a 0,transparent 42%),radial-gradient(circle at 72% 28%,#ff5a1a 0,transparent 48%),linear-gradient(#3a0c04,#7a1c04);background-size:220% 220%;animation:fi-lava 3.5s ease-in-out infinite alternate}
.fi-skin-frost{background:repeating-linear-gradient(60deg,rgba(255,255,255,.28) 0 2px,transparent 2px 15px),linear-gradient(160deg,#eefcff,#86cdf0 55%,#3f7fbf)}
.fi-skin-circuit{background:linear-gradient(rgba(57,255,136,.3) 1px,transparent 1px) 0 0/16px 16px,linear-gradient(90deg,rgba(57,255,136,.3) 1px,transparent 1px) 0 0/16px 16px,radial-gradient(circle,#0f3d24,#03120a);animation:fi-grid 1.6s linear infinite}
.fi-skin-void{background:radial-gradient(1.5px 1.5px at 20% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 70% 22%,#d8c4ff,transparent),radial-gradient(1px 1px at 45% 68%,#fff,transparent),radial-gradient(1.5px 1.5px at 82% 74%,#fff,transparent),radial-gradient(1px 1px at 12% 80%,#c9b0ff,transparent),radial-gradient(circle at 50% 38%,#4a0f94,#07020f 72%);animation:fi-twinkle 3s ease-in-out infinite alternate}
.fi-skin-gold{background:linear-gradient(135deg,#7a5200,#ffd84a 24%,#fff4b8 44%,#d9a300 60%,#8a5d00)}
.fi-skin-gold::before{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.65) 50%,transparent 62%);background-size:250% 100%;animation:fi-shine 2.8s ease-in-out infinite;z-index:1}
.fi-skin-prism{background:conic-gradient(from 90deg,#ff6b6b,#ffd96b,#8dff6b,#6bffe6,#6b8dff,#d96bff,#ff6b6b)}
.fi-skin-prism::after{background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.65),transparent 62%)}
@keyframes fi-hue{to{filter:hue-rotate(360deg)}}
@keyframes fi-lava{from{background-position:0 0,100% 100%,0 0}to{background-position:100% 60%,0 0,0 0}}
@keyframes fi-grid{to{background-position:16px 16px,16px 16px,0 0}}
@keyframes fi-twinkle{from{filter:brightness(.85)}to{filter:brightness(1.25)}}
.fi-hit-a,.fi-hit-b{animation:fi-hit .36s ease-out}
.fi-hit-b{animation-name:fi-hit2}
.fi-crit-a,.fi-crit-b{animation:fi-crit .55s ease-out}
.fi-crit-b{animation-name:fi-crit2}
@keyframes fi-hit{from{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 30px #fff) brightness(1.25)}}
@keyframes fi-hit2{from{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 30px #fff) brightness(1.25)}}
@keyframes fi-crit{0%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 70px #2f8fff) brightness(1.55) hue-rotate(0deg)}40%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 40px #5cc8ff) brightness(1.3)}}
@keyframes fi-crit2{0%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 70px #2f8fff) brightness(1.55) hue-rotate(0deg)}40%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 40px #5cc8ff) brightness(1.3)}}
.fi-num{position:absolute;left:0;top:0;font-family:var(--font-minecraft,inherit);font-size:1.05rem;color:#fff;text-shadow:0 2px 0 #000,0 0 8px rgba(255,255,255,.35);pointer-events:none;will-change:transform,opacity;white-space:nowrap}
.fi-num-crit{font-size:1.7rem;color:#8fd6ff;text-shadow:0 0 4px #5cc8ff,0 0 12px #2f8fff,0 0 26px #1d6bff,0 2px 0 #001a4d}
.fi-part{position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity}
.fi-hold{position:absolute;inset:-14px;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .2s}
@media (prefers-reduced-motion:reduce){.fi-skin-ember,.fi-skin-circuit,.fi-skin-void,.fi-rim-prism,.fi-skin-gold::before{animation:none}.fi-hit-a,.fi-hit-b,.fi-crit-a,.fi-crit-b{animation:none}}
`;

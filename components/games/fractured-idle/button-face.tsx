"use client";

import type { ButtonHTMLAttributes, CSSProperties, Ref } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { GLYPHS } from "@/lib/fractured-idle/button";
import { FaceGlint, type GlintProps } from "./enchant-glint";
import { tint } from "./ui";

// The click button, drawn from three independent layers so any shape can take
// any skin: wrapper (glow + depth via drop-shadow, which follows the clip),
// rim (clipped, accent colored) and face (clipped and inset, skin painted).
// Shapes are clip-paths below, skins and auras are CSS in BTN_CSS.

const pct = (n: number) => `${n.toFixed(1)}%`;
const poly = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${pct(x)} ${pct(y)}`).join(",")})`;
/** Polygon from a radius function r(angle) in 0..1, centered, angle in radians from the top. */
const radial = (n: number, r: (t: number) => number) =>
    poly(Array.from({ length: n }, (_, i) => {
        const t = (i / n) * Math.PI * 2;
        const a = t - Math.PI / 2;
        return [50 + 49 * r(t) * Math.cos(a), 50 + 49 * r(t) * Math.sin(a)] as [number, number];
    }));

const STAR = radial(10, (t) => (Math.round((t / (Math.PI * 2)) * 10) % 2 === 0 ? 1 : 0.48));
const SUNBURST = radial(32, (t) => (Math.round((t / (Math.PI * 2)) * 32) % 2 === 0 ? 1 : 0.72));
const BLOOM = radial(80, (t) => 0.74 + 0.26 * Math.cos(5 * t));
const GEAR = (() => {
    const pts: [number, number][] = [];
    const teeth = 12;
    for (let k = 0; k < teeth; k++) {
        const a = (k / teeth) * 360;
        for (const [off, r] of [[2, 0.8], [6, 1], [14, 1], [18, 0.8]] as [number, number][]) {
            const t = ((a + off) * Math.PI) / 180;
            pts.push([50 + 49 * r * Math.sin(t), 50 - 49 * r * Math.cos(t)]);
        }
    }
    return poly(pts);
})();
const HEART = poly(Array.from({ length: 64 }, (_, i) => {
    const t = (i / 64) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return [50 + (x / 16) * 48, 3 + ((y + 17) / 29) * 94] as [number, number];
}));

const SAME = (c: string, glyph = 1, gy = 0) => ({ rim: c, face: c, glyph, gy });
const CLIP: Record<string, { rim: string; face: string; glyph: number; gy: number }> = {
    block: { rim: "inset(0 round 2rem)", face: "inset(0 round 1.65rem)", glyph: 1, gy: 0 },
    pebble: SAME("inset(0 round 40%)"),
    orb: SAME("circle(50%)"),
    hex: SAME("polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)", 0.9),
    diamond: SAME("polygon(50% 0,100% 50%,50% 100%,0 50%)", 0.7),
    octagon: SAME("polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)", 0.95),
    cross: SAME("polygon(33% 0,67% 0,67% 33%,100% 33%,100% 67%,67% 67%,67% 100%,33% 100%,33% 67%,0 67%,0 33%,33% 33%)", 0.8),
    bastion: SAME("polygon(0 0,100% 0,100% 58%,50% 100%,0 58%)", 0.85, -8),
    gem: SAME("polygon(22% 4%,78% 4%,100% 36%,50% 98%,0 36%)", 0.8, -6),
    heart: SAME(HEART, 0.75, -2),
    bloom: SAME(BLOOM, 0.85),
    gear: SAME(GEAR, 0.85),
    nova: SAME(STAR, 0.6),
    sunburst: SAME(SUNBURST, 0.8),
    crown: SAME("polygon(0 92%,0 26%,24% 55%,50% 6%,76% 55%,100% 26%,100% 92%)", 0.7, 8),
};

const SKIN_ACCENT: Record<string, string> = {
    glass: "#8fe8ff", grass: "#62b83d", ember: "#ff7a2a", frost: "#a8e2ff", candy: "#ff6fa8", toxic: "#7dff3a",
    ocean: "#35b8ff", obsidian: "#8a4dff", circuit: "#39ff88", neon: "#ff3df0", sunset: "#ff8a4a", void: "#9a4dff",
    magma: "#ff6a1a", chrome: "#c9d6e6", gold: "#ffd23a", plasma: "#ff55e0", prism: "#ff5fd2", aurora: "#5dffb0",
    chroma: "#ff4da6", galaxy: "#7a5cff", holo: "#ffd0f4",
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
    glint?: GlintProps; // enchant glint drawn inside the face (see enchant-glint.tsx)
}

export function ButtonFace({ shape, skin, glyph, color, className = "", depth = 8, as = "span", btnRef, wrapRef, btnProps, glint }: Props) {
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
    const inner = (
        <span className={`fi-face fi-skin-${skin}`} style={{ clipPath: c.face, inset }}>
            <span className="fi-glyph grid size-full place-items-center text-white" style={{ ["--g" as string]: c.glyph, ["--gy" as string]: `${c.gy}%` } as CSSProperties}>
                <McSymbol name={sym} />
            </span>
            {glint && <FaceGlint {...glint} />}
        </span>
    );
    return (
        <div ref={wrapRef} className={`fi-wrap ${className}`} style={vars}>
            {as === "button" ? (
                <button ref={btnRef} type="button" tabIndex={-1} className={`fi-rim fi-rim-${skin}`} style={{ clipPath: c.rim }} {...btnProps}>
                    {inner}
                </button>
            ) : (
                <span className={`fi-rim fi-rim-${skin}`} style={{ clipPath: c.rim }}>
                    {inner}
                </span>
            )}
        </div>
    );
}

const AURA_COUNT: Record<string, number> = { pulse: 2, stars: 8, snow: 10, embers: 10, orbit: 4 };
const AURA_CHAR: Record<string, string> = { stars: "✦", snow: "❄" };

/** Ambient effect behind the button. Purely CSS; sized off the button wrapper. */
export function Aura({ id, accent }: { id: string; accent: string }) {
    if (id === "none") return null;
    const n = AURA_COUNT[id] ?? 0;
    return (
        <div className={`fi-aura fi-aura-${id}`} style={{ ["--a" as string]: accent } as CSSProperties} aria-hidden="true">
            {Array.from({ length: n }, (_, i) => (
                <span
                    key={i}
                    style={{ ["--i" as string]: i, ["--x" as string]: `${(i * 37 + 11) % 100}%`, ["--d" as string]: `${3 + (i % 5) * 0.8}s`, ["--dl" as string]: `${-i * 0.9}s` } as CSSProperties}
                >
                    {AURA_CHAR[id]}
                </span>
            ))}
        </div>
    );
}

export const BTN_CSS = `
.fi-wrap{position:relative;display:block;container-type:size;--heat:0;filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 calc(12px + var(--heat)*34px) var(--glow)) drop-shadow(0 0 calc(var(--heat)*22px) var(--tier,transparent)) brightness(calc(1 + var(--heat)*.12))}
.fi-rim{position:absolute;inset:0;width:100%;height:100%;display:block;border:0;padding:0;cursor:pointer;background:linear-gradient(180deg,rgba(255,255,255,.4),transparent 40%),var(--a);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none}
.fi-rim-prism,.fi-rim-holo{background:conic-gradient(from 0deg,#ff4d4d,#ffd24d,#7dff4d,#4dffe0,#4d7dff,#d24dff,#ff4d4d);animation:fi-hue 6s linear infinite}
.fi-rim-chroma{background:linear-gradient(120deg,#ff0080,#ff8c00,#ffe600,#00ff9d,#00b7ff,#7a00ff,#ff0080);background-size:300% 100%;animation:fi-slide 4s linear infinite}
.fi-face{position:absolute;display:block;overflow:hidden;pointer-events:none}
.fi-face::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.26),transparent 46%);pointer-events:none}
.fi-glyph{filter:drop-shadow(0 calc(var(--depth)*.35) 0 rgba(0,0,0,.45));line-height:1;font-size:calc(var(--g,1)*40cqw);transform:translateY(var(--gy,0));position:relative;z-index:2}
.fi-skin-island{background:linear-gradient(160deg,color-mix(in oklch,var(--a) 55%,#0b0b14),color-mix(in oklch,var(--a) 20%,#0b0b14))}
.fi-skin-glass{background:linear-gradient(145deg,rgba(255,255,255,.38),rgba(255,255,255,.06) 55%,rgba(255,255,255,.2)),rgba(110,215,255,.16);backdrop-filter:blur(5px);box-shadow:inset 0 0 22px rgba(255,255,255,.3)}
.fi-skin-grass{background:linear-gradient(#63c03c 0 24%,#3f8a26 24% 30%,transparent 30%),repeating-linear-gradient(90deg,rgba(0,0,0,.13) 0 10%,transparent 10% 20%),repeating-linear-gradient(0deg,rgba(0,0,0,.1) 0 10%,transparent 10% 20%),linear-gradient(#8f5d34,#6b4424)}
.fi-skin-ember{background:radial-gradient(circle at 30% 75%,#ffd23a 0,transparent 42%),radial-gradient(circle at 72% 28%,#ff5a1a 0,transparent 48%),linear-gradient(#3a0c04,#7a1c04);background-size:220% 220%;animation:fi-lava 3.5s ease-in-out infinite alternate}
.fi-skin-frost{background:repeating-linear-gradient(60deg,rgba(255,255,255,.28) 0 2px,transparent 2px 15px),linear-gradient(160deg,#eefcff,#86cdf0 55%,#3f7fbf)}
.fi-skin-candy{background:repeating-linear-gradient(45deg,#ff6fa8 0 12%,#fff 12% 24%);background-size:200% 200%;animation:fi-slide 3s linear infinite}
.fi-skin-toxic{background:radial-gradient(circle at 25% 75%,rgba(215,255,140,.85) 0 7%,transparent 8%),radial-gradient(circle at 68% 62%,rgba(215,255,140,.8) 0 5%,transparent 6%),radial-gradient(circle at 45% 30%,rgba(215,255,140,.7) 0 9%,transparent 10%),linear-gradient(#0d5a1c,#3fd63a);animation:fi-twinkle 1.8s ease-in-out infinite alternate}
.fi-skin-ocean{background:repeating-radial-gradient(circle at 50% 130%,rgba(255,255,255,.28) 0 5%,transparent 5% 18%),linear-gradient(#4fd0ff,#0a4fb5);background-size:200% 100%,100% 100%;animation:fi-waves 3s linear infinite}
.fi-skin-obsidian{background:linear-gradient(145deg,#2a1646,#05030a 55%,#321a58);box-shadow:inset 0 0 18px rgba(140,80,255,.35)}
.fi-skin-circuit{background:linear-gradient(rgba(57,255,136,.3) 1px,transparent 1px) 0 0/16px 16px,linear-gradient(90deg,rgba(57,255,136,.3) 1px,transparent 1px) 0 0/16px 16px,radial-gradient(circle,#0f3d24,#03120a);animation:fi-grid 1.6s linear infinite}
.fi-skin-neon{background:radial-gradient(circle,#15061c,#06060c);box-shadow:inset 0 0 22px var(--a),inset 0 0 5px #fff;animation:fi-twinkle 2.4s ease-in-out infinite alternate}
.fi-skin-sunset{background:linear-gradient(#ffd45a,#ff7a4a 42%,#c4408a 72%,#3b1a6b)}
.fi-skin-void{background:radial-gradient(1.5px 1.5px at 20% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 70% 22%,#d8c4ff,transparent),radial-gradient(1px 1px at 45% 68%,#fff,transparent),radial-gradient(1.5px 1.5px at 82% 74%,#fff,transparent),radial-gradient(1px 1px at 12% 80%,#c9b0ff,transparent),radial-gradient(circle at 50% 38%,#4a0f94,#07020f 72%);animation:fi-twinkle 3s ease-in-out infinite alternate}
.fi-skin-magma{background:repeating-linear-gradient(115deg,transparent 0 16%,rgba(255,130,30,.95) 16% 18%,transparent 18% 36%),radial-gradient(circle at 50% 120%,#ff7a1a,transparent 60%),#1b0d08;animation:fi-twinkle 1.6s ease-in-out infinite alternate}
.fi-skin-chrome{background:linear-gradient(135deg,#6d7684,#f4f8ff 22%,#8f98a6 40%,#fff 55%,#59616e 75%,#c9d1dc)}
.fi-skin-chrome::before,.fi-skin-gold::before{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.65) 50%,transparent 62%);background-size:250% 100%;animation:fi-shine 2.8s ease-in-out infinite;z-index:1}
.fi-skin-gold{background:linear-gradient(135deg,#7a5200,#ffd84a 24%,#fff4b8 44%,#d9a300 60%,#8a5d00)}
.fi-skin-plasma{background:radial-gradient(circle at 30% 30%,#ff3df0,transparent 50%),radial-gradient(circle at 70% 60%,#3df0ff,transparent 50%),radial-gradient(circle at 40% 85%,#ffea3d,transparent 45%),#1a0a30;background-size:200% 200%;animation:fi-plasma 7s linear infinite}
.fi-skin-prism{background:conic-gradient(from 90deg,#ff6b6b,#ffd96b,#8dff6b,#6bffe6,#6b8dff,#d96bff,#ff6b6b)}
.fi-skin-prism::after{background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.65),transparent 62%)}
.fi-skin-aurora{background:linear-gradient(120deg,transparent 15%,rgba(80,255,170,.55) 38%,rgba(160,90,255,.5) 62%,transparent 85%) 0 0/250% 100%,linear-gradient(200deg,#0b1a3a,#0b3a4a 45%,#1a0b3a);animation:fi-aurora 5s ease-in-out infinite alternate}
.fi-skin-chroma{background:linear-gradient(120deg,#ff0080,#ff8c00,#ffe600,#00ff9d,#00b7ff,#7a00ff,#ff0080);background-size:400% 100%;animation:fi-slide 5s linear infinite}
.fi-skin-galaxy{background:radial-gradient(1.5px 1.5px at 22% 28%,#fff,transparent),radial-gradient(1px 1px at 76% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 58% 72%,#cfe0ff,transparent),radial-gradient(1px 1px at 14% 74%,#fff,transparent),radial-gradient(1.5px 1.5px at 86% 66%,#fff,transparent),radial-gradient(circle,#2a0f66,#080318 75%)}
.fi-skin-galaxy::before{content:"";position:absolute;inset:-45%;background:conic-gradient(from 0deg,rgba(120,60,255,.55),transparent 25%,rgba(40,120,255,.5) 45%,transparent 70%,rgba(255,80,200,.4) 85%,rgba(120,60,255,.55));animation:fi-spin 16s linear infinite}
.fi-skin-holo{background:conic-gradient(from 45deg,#ffd6f7,#c6f3ff,#d8ffd6,#fff2c2,#ffd6f7);animation:fi-hue 9s linear infinite}
.fi-skin-holo::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.75) 50%,transparent 70%);background-size:250% 100%;animation:fi-shine 3.4s ease-in-out infinite;z-index:1}
@keyframes fi-hue{to{filter:hue-rotate(360deg)}}
@keyframes fi-spin{to{transform:rotate(360deg)}}
@keyframes fi-slide{to{background-position:100% 0}}
@keyframes fi-lava{from{background-position:0 0,100% 100%,0 0}to{background-position:100% 60%,0 0,0 0}}
@keyframes fi-grid{to{background-position:16px 16px,16px 16px,0 0}}
@keyframes fi-twinkle{from{filter:brightness(.85)}to{filter:brightness(1.25)}}
@keyframes fi-waves{to{background-position:-100% 0,0 0}}
@keyframes fi-plasma{0%{background-position:0 0,100% 100%,50% 0,0 0;filter:hue-rotate(0)}50%{background-position:100% 50%,0 0,0 100%,0 0}100%{background-position:0 0,100% 100%,50% 0,0 0;filter:hue-rotate(360deg)}}
@keyframes fi-aurora{to{background-position:100% 0,0 0}}
.fi-hit-a,.fi-hit-b{animation:fi-hit .36s ease-out}
.fi-hit-b{animation-name:fi-hit2}
.fi-crit-a,.fi-crit-b{animation:fi-crit .55s ease-out}
.fi-crit-b{animation-name:fi-crit2}
@keyframes fi-hit{from{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 30px #fff) drop-shadow(0 0 0 transparent) brightness(1.25)}}
@keyframes fi-hit2{from{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 30px #fff) drop-shadow(0 0 0 transparent) brightness(1.25)}}
@keyframes fi-crit{0%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 70px var(--crit,#2f8fff)) drop-shadow(0 0 0 transparent) brightness(1.55)}40%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 40px var(--crit,#5cc8ff)) drop-shadow(0 0 0 transparent) brightness(1.3)}}
@keyframes fi-crit2{0%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 70px var(--crit,#2f8fff)) drop-shadow(0 0 0 transparent) brightness(1.55)}40%{filter:drop-shadow(0 var(--depth) 0 var(--shade)) drop-shadow(0 0 40px var(--crit,#5cc8ff)) drop-shadow(0 0 0 transparent) brightness(1.3)}}
.fi-num{position:absolute;left:0;top:0;font-family:var(--font-minecraft,inherit);font-size:1.05rem;color:#fff;text-shadow:0 2px 0 #000,0 0 8px rgba(255,255,255,.35);pointer-events:none;will-change:transform,opacity;white-space:nowrap}
.fi-num-crit{font-size:1.7rem;color:var(--cc,#8fd6ff);text-shadow:0 0 4px var(--cc,#5cc8ff),0 0 12px var(--cc,#2f8fff),0 0 26px var(--cc,#1d6bff),0 2px 0 rgba(0,0,0,.55)}
.fi-ns-bold{font-size:1.5rem;text-shadow:0 3px 0 #000,0 0 10px rgba(255,255,255,.4)}
.fi-ns-bold.fi-num-crit{font-size:2.1rem;text-shadow:0 0 4px var(--cc),0 0 12px var(--cc),0 0 26px var(--cc),0 3px 0 rgba(0,0,0,.55)}
.fi-ns-outline:not(.fi-num-crit){text-shadow:-2px 0 #000,2px 0 #000,0 -2px #000,0 2px #000,-2px -2px #000,2px 2px #000,-2px 2px #000,2px -2px #000}
.fi-ns-neon:not(.fi-num-crit){color:#fff;text-shadow:0 0 3px #fff,0 0 8px var(--ac),0 0 18px var(--ac),0 0 30px var(--ac)}
.fi-ns-ice:not(.fi-num-crit),.fi-ns-fire:not(.fi-num-crit),.fi-ns-gold:not(.fi-num-crit),.fi-ns-rainbow:not(.fi-num-crit){-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(0,0,0,.55);text-shadow:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))}
.fi-ns-ice:not(.fi-num-crit){background-image:linear-gradient(#fff,#8fdcff 55%,#3d9bff)}
.fi-ns-fire:not(.fi-num-crit){background-image:linear-gradient(#fff3a0,#ffa12a 50%,#ff3b1a)}
.fi-ns-gold:not(.fi-num-crit){background-image:linear-gradient(#fff6c2,#ffd23a 50%,#b87b00)}
.fi-ns-rainbow:not(.fi-num-crit){background-image:linear-gradient(90deg,#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff);animation:fi-hue 1.4s linear infinite}
.fi-part{position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity}
.fi-aura{position:absolute;inset:-18%;pointer-events:none;container-type:size;color:var(--a)}
.fi-aura span{position:absolute}
.fi-aura-halo::before,.fi-aura-halo::after{content:"";position:absolute;border-radius:50%}
.fi-aura-halo::before{inset:12%;border:2px dashed var(--a);opacity:.7;animation:fi-spin 16s linear infinite}
.fi-aura-halo::after{inset:5%;border:2px dotted var(--a);opacity:.45;animation:fi-spin 26s linear infinite reverse}
.fi-aura-pulse span{inset:14%;border-radius:50%;border:2px solid var(--a);opacity:0;animation:fi-ring 3.2s ease-out infinite;animation-delay:calc(var(--i)*1.6s)}
@keyframes fi-ring{0%{transform:scale(.9);opacity:.75}100%{transform:scale(1.42);opacity:0}}
.fi-aura-stars span{left:50%;top:50%;font-size:16px;line-height:1;text-shadow:0 0 10px currentColor;transform:translate(-50%,-50%) rotate(calc(var(--i)*45deg)) translateY(-46cqh);animation:fi-blink 2.4s ease-in-out infinite;animation-delay:var(--dl)}
@keyframes fi-blink{0%,100%{opacity:.15;scale:.6}50%{opacity:1;scale:1.25}}
.fi-aura-snow span{left:var(--x);top:0;font-size:14px;color:#e8f6ff;opacity:0;text-shadow:0 0 8px #9fd8ff;animation:fi-fall var(--d) linear infinite;animation-delay:var(--dl)}
@keyframes fi-fall{0%{transform:translate(0,-10cqh);opacity:0}15%{opacity:.9}100%{transform:translate(14px,105cqh);opacity:0}}
.fi-aura-embers span{left:var(--x);bottom:4%;width:5px;height:5px;border-radius:50%;background:#ff9a2a;box-shadow:0 0 8px #ff6a1a;opacity:0;animation:fi-rise2 var(--d) ease-out infinite;animation-delay:var(--dl)}
@keyframes fi-rise2{0%{transform:translate(0,0);opacity:0}20%{opacity:1}100%{transform:translate(12px,-75cqh) scale(.3);opacity:0}}
.fi-aura-orbit span{left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:var(--a);box-shadow:0 0 12px var(--a);animation:fi-orb calc(5s + var(--i)*1.3s) linear infinite;animation-delay:calc(var(--i)*-1.1s)}
@keyframes fi-orb{from{transform:rotate(0) translateX(44cqw)}to{transform:rotate(360deg) translateX(44cqw)}}
.fi-aura-vortex::before{content:"";position:absolute;inset:4%;border-radius:50%;background:conic-gradient(from 0deg,transparent,var(--a),transparent 38%,var(--a) 55%,transparent 80%);-webkit-mask:radial-gradient(circle,transparent 64%,#000 66%,#000 72%,transparent 74%);mask:radial-gradient(circle,transparent 64%,#000 66%,#000 72%,transparent 74%);animation:fi-spin 4s linear infinite}
/* Picker cells only animate while hovered / focused: 22 live skins at once is a lot of repaint. */
.fi-still:not(:hover):not(:focus-visible),.fi-still:not(:hover):not(:focus-visible) *,.fi-still:not(:hover):not(:focus-visible) *::before,.fi-still:not(:hover):not(:focus-visible) *::after{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.fi-skin-ember,.fi-skin-circuit,.fi-skin-void,.fi-skin-candy,.fi-skin-toxic,.fi-skin-ocean,.fi-skin-neon,.fi-skin-magma,.fi-skin-plasma,.fi-skin-aurora,.fi-skin-chroma,.fi-skin-holo,.fi-skin-galaxy::before,.fi-rim-prism,.fi-rim-holo,.fi-rim-chroma,.fi-skin-gold::before,.fi-skin-chrome::before,.fi-skin-holo::before,.fi-ns-rainbow,.fi-aura *,.fi-aura::before,.fi-aura::after{animation:none!important}.fi-hit-a,.fi-hit-b,.fi-crit-a,.fi-crit-b{animation:none}}
`;

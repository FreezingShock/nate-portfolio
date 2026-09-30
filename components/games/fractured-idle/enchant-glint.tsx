"use client";

import type { CSSProperties } from "react";

// How enchants show on the click button. Two parts:
//  FaceGlint  a sweep or prism inside the button face (clipped to any shape)
//  Glint      decoration around it: sparkle, orbit, runes, flame, void crown
// Both take the glint style, a color ("rainbow" cycles hues) and the power
// (best worn rarity, 0..7), which scales brightness and particle count.

const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ";
const FACE = new Set(["shimmer", "prism"]);

export interface GlintProps {
    id: string;
    color: string;
    power: number;
}

const vars = (color: string, power: number): CSSProperties => ({
    ["--gc" as string]: color === "rainbow" ? "#ff5f9a" : color,
    ["--gp" as string]: Math.max(0, power),
});

/** Inside the face (rendered by ButtonFace). */
export function FaceGlint({ id, color, power }: GlintProps) {
    if (!FACE.has(id) || power < 0) return null;
    return <span className={`fi-gf fi-gf-${id} ${color === "rainbow" ? "fi-gl-rainbow" : ""}`} style={vars(color, power)} aria-hidden="true" />;
}

/** Around the button (place next to the Aura, inside the button wrapper). */
export function Glint({ id, color, power }: GlintProps) {
    if (FACE.has(id) || id === "none" || power < 0) return null;
    const n = id === "sparkle" ? 6 + power : id === "orbit" ? 3 + Math.floor(power / 2) : id === "flame" ? 5 + power : id === "runes" ? 12 : 0;
    return (
        <div className={`fi-gl fi-gl-${id} ${color === "rainbow" ? "fi-gl-rainbow" : ""}`} style={vars(color, power)} aria-hidden="true">
            {Array.from({ length: n }, (_, i) => (
                <span key={i} style={{ ["--i" as string]: i, ["--n" as string]: n, ["--x" as string]: `${(i * 37 + 13) % 100}%`, ["--y" as string]: `${(i * 53 + 7) % 100}%`, ["--dl" as string]: `${-i * 0.7}s`, ["--d" as string]: `${2 + (i % 4) * 0.6}s` } as CSSProperties}>
                    {id === "sparkle" ? "✦" : id === "runes" ? RUNES[i % RUNES.length] : ""}
                </span>
            ))}
        </div>
    );
}

export const GLINT_CSS = `
.fi-gf{position:absolute;inset:0;z-index:1;pointer-events:none;mix-blend-mode:screen;opacity:calc(.3 + var(--gp)*.09)}
.fi-gf-shimmer{background:linear-gradient(115deg,transparent 34%,color-mix(in oklch,var(--gc) 65%,#fff) 50%,transparent 66%),repeating-linear-gradient(135deg,color-mix(in oklch,var(--gc) 16%,transparent) 0 3px,transparent 3px 15px);background-size:280% 100%,60px 60px;animation:fi-shine 3.6s ease-in-out infinite,fi-gf-crawl 9s linear infinite}
@keyframes fi-gf-crawl{to{background-position:0 0,60px 60px}}
.fi-gf-prism{background:conic-gradient(from 0deg at 50% 50%,#ff6b6b66,#ffd96b66,#8dff6b66,#6bffe666,#6b8dff66,#d96bff66,#ff6b6b66);animation:fi-spin 8s linear infinite;transform-origin:50% 50%;inset:-25%}
.fi-gf-prism::after{content:"";position:absolute;inset:25%;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);background-size:250% 100%;animation:fi-shine 2.6s ease-in-out infinite}
.fi-gl{position:absolute;inset:-18%;z-index:2;pointer-events:none;container-type:size;color:var(--gc);opacity:calc(.55 + var(--gp)*.06)}
.fi-gl span{position:absolute}
.fi-gl-rainbow{animation:fi-hue 5s linear infinite}
.fi-gf.fi-gl-rainbow{animation:fi-hue 5s linear infinite,fi-shine 3.6s ease-in-out infinite}
.fi-gl-sparkle span{left:var(--x);top:var(--y);font-size:calc(9px + var(--gp)*1.4px);line-height:1;text-shadow:0 0 10px currentColor;animation:fi-blink var(--d) ease-in-out infinite;animation-delay:var(--dl)}
.fi-gl-orbit span{left:50%;top:50%;width:calc(6px + var(--gp)*.7px);height:calc(6px + var(--gp)*.7px);margin:-4px;border-radius:50%;background:var(--gc);box-shadow:0 0 12px var(--gc),0 0 4px #fff;animation:fi-orb calc(4s + var(--i)*1.1s) linear infinite;animation-delay:calc(var(--i)*-1.3s)}
.fi-gl-runes span{left:50%;top:50%;font-size:calc(15px + var(--gp)*1px);line-height:1;text-shadow:0 0 12px currentColor,0 0 4px #fff,0 0 2px #fff;transform:rotate(calc(var(--i)/var(--n)*360deg)) translateY(-46cqh);animation:fi-gl-rune 3s ease-in-out infinite;animation-delay:calc(var(--i)*-.25s)}
.fi-gl-runes::before{content:"";position:absolute;inset:4%;border-radius:50%;border:1px dashed var(--gc);opacity:.5;animation:fi-spin 30s linear infinite}
.fi-gl-runes{animation:fi-spin 40s linear infinite}
.fi-gl-runes.fi-gl-rainbow{animation:fi-spin 40s linear infinite,fi-hue 5s linear infinite}
@keyframes fi-gl-rune{0%,100%{opacity:.35}50%{opacity:1}}
.fi-gl-flame{z-index:0;inset:-14%}
.fi-gl-flame::before{content:"";position:absolute;inset:6%;border-radius:50%;background:conic-gradient(from 0deg,transparent,var(--gc),transparent 20%,var(--gc) 38%,transparent 58%,var(--gc) 76%,transparent);filter:blur(9px);opacity:.75;animation:fi-spin 5s linear infinite}
.fi-gl-flame span{left:var(--x);bottom:8%;width:5px;height:5px;border-radius:50%;background:var(--gc);box-shadow:0 0 10px var(--gc),0 0 4px #fff;opacity:0;animation:fi-rise2 var(--d) ease-out infinite;animation-delay:var(--dl)}
.fi-gl-void{inset:-26%;z-index:0}
.fi-gl-void::before{content:"";position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(from 0deg,var(--gc) 0 2deg,transparent 2deg 12deg);-webkit-mask:radial-gradient(circle,transparent 34%,#000 36%,#000 48%,transparent 50%);mask:radial-gradient(circle,transparent 34%,#000 36%,#000 48%,transparent 50%);filter:drop-shadow(0 0 8px var(--gc));animation:fi-spin 12s linear infinite}
.fi-gl-void::after{content:"";position:absolute;inset:6%;border-radius:50%;background:radial-gradient(circle,transparent 38%,color-mix(in oklch,var(--gc) 35%,#000) 52%,transparent 66%);animation:fi-pulse 2.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.fi-gf,.fi-gf::after,.fi-gl,.fi-gl *,.fi-gl::before,.fi-gl::after{animation:none!important}}
`;

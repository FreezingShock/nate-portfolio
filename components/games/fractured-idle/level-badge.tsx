"use client";

import { McSymbol } from "@/components/mc-symbol";
import { MAX_DISPLAY_LEVEL, levelColor, type BadgeSymbol, type Prefix } from "@/lib/fractured-idle/fxp";

// The Fractured Level badge, SkyBlock style: [123] colored by bracket of 40
// levels, with an optional symbol after the number and an optional prefix.

export function LevelBadge({ level, sym, prefix, size = "md" }: { level: number; sym?: BadgeSymbol; prefix?: Prefix; size?: "sm" | "md" | "lg" }) {
    const gold = level >= MAX_DISPLAY_LEVEL;
    const color = levelColor(level);
    const px = size === "lg" ? "text-4xl" : size === "md" ? "text-xl" : "text-base";
    const rainbow = prefix?.color === "rainbow";
    return (
        <span className={`inline-flex items-baseline gap-2 font-minecraft leading-none ${px}`}>
            <span key={level} className={`fi-lvl ${gold ? "fi-lvl-gold" : ""}`} style={{ color }}>
                [{level}
                {sym && sym.symbol && <span className="ml-0.5 align-baseline"><McSymbol name={sym.symbol} /></span>}]
            </span>
            {prefix && prefix.id !== "none" && (
                <span className={`text-[0.62em] ${rainbow ? "fi-rainbow" : ""}`} style={rainbow ? undefined : { color: prefix.color, textShadow: `0 0 10px ${prefix.color}66, 0 2px 0 rgba(0,0,0,.6)` }}>
                    {prefix.name}
                </span>
            )}
        </span>
    );
}

export const LEVEL_CSS = `
.fi-lvl{text-shadow:0 0 14px currentColor,0 2px 0 rgba(0,0,0,.65);animation:fi-lvl-pop .7s cubic-bezier(.2,1.6,.4,1) both}
.fi-lvl-gold{text-shadow:0 0 18px #ffaa00,0 0 34px #ff7a00,0 2px 0 rgba(0,0,0,.65)}
.fi-rainbow{background:linear-gradient(90deg,#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5f5f);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fi-slide 3s linear infinite;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))}
@keyframes fi-lvl-pop{from{transform:scale(1.6);filter:brightness(2)}}
.fi-fxp-pop{animation:fi-fxp 6s ease-out forwards;white-space:nowrap}
@keyframes fi-fxp{0%{opacity:0;transform:translateY(6px)}8%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-4px)}}
@media (prefers-reduced-motion:reduce){.fi-lvl,.fi-rainbow,.fi-fxp-pop{animation:none}}
`;

"use client";

import { McSymbol } from "@/components/mc-symbol";
import { FXP_CATS, MAX_DISPLAY_LEVEL, levelColor, recentGains, type BadgeSymbol, type Prefix } from "@/lib/fractured-idle/fxp";

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

/**
 * "+N EXP" chip under the level badge. One chip at a time: gains that land close together add up into it,
 * and each new gain re-pops it, so a stream of trophies reads as a single ticking number instead of a stack.
 */
export function XpGain({ now }: { now: number }) {
    const g = recentGains(now, 2800);
    if (!g.length) return null;
    const last = g[g.length - 1];
    const cat = FXP_CATS.find((c) => c.id === last.cat);
    const total = g.reduce((a, x) => a + x.xp, 0);
    return (
        <span key={last.at} className="fi-xg" style={{ ["--xc" as string]: cat?.color ?? "var(--mc-yellow)" } as React.CSSProperties} aria-live="polite">
            {cat && <span className="fi-xg-i"><McSymbol name={cat.symbol} /></span>}
            <b>+{total}</b>
            <em>EXP</em>
            <span className="fi-xg-l">
                {last.label}
                {g.length > 1 ? ` +${g.length - 1} more` : ""}
            </span>
        </span>
    );
}

export const LEVEL_CSS = `
.fi-lvl{text-shadow:0 0 14px currentColor,0 2px 0 rgba(0,0,0,.65);animation:fi-lvl-pop .7s cubic-bezier(.2,1.6,.4,1) both}
.fi-lvl-gold{text-shadow:0 0 18px #ffaa00,0 0 34px #ff7a00,0 2px 0 rgba(0,0,0,.65)}
.fi-rainbow{background:linear-gradient(90deg,#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5f5f);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fi-slide 3s linear infinite;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))}
@keyframes fi-lvl-pop{from{transform:scale(1.6);filter:brightness(2)}}
.fi-xg{position:absolute;left:0;top:100%;z-index:30;margin-top:.3rem;display:inline-flex;align-items:center;gap:.3rem;max-width:min(17rem,80vw);padding:.15rem .55rem .15rem .3rem;border-radius:999px;pointer-events:none;white-space:nowrap;background:linear-gradient(120deg,color-mix(in oklch,var(--xc) 22%,#0a0812),rgba(10,8,18,.94) 75%);border:1px solid color-mix(in oklch,var(--xc) 60%,transparent);box-shadow:0 0 14px -6px var(--xc),0 6px 14px rgba(0,0,0,.45);animation:fi-xg 2.8s ease-out both}
.fi-xg-i{display:grid;place-items:center;width:1.15rem;height:1.15rem;border-radius:50%;font-size:.72rem;color:var(--xc);background:color-mix(in oklch,var(--xc) 22%,transparent)}
.fi-xg b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.8rem;color:var(--mc-yellow);text-shadow:0 0 8px rgba(255,255,85,.45),0 1px 0 rgba(0,0,0,.6)}
.fi-xg em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.55rem;letter-spacing:.14em;color:#b9b3cc}
.fi-xg-l{overflow:hidden;text-overflow:ellipsis;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--xc);font-weight:600}
@keyframes fi-xg{0%{opacity:0;transform:translateY(-6px) scale(.85)}10%{opacity:1;transform:scale(1.06)}16%{transform:none}82%{opacity:1}100%{opacity:0;transform:translateY(3px)}}
@media (max-width:639px){.fi-xg-l,.fi-xg em{display:none}.fi-xg{padding-right:.45rem}}
@media (prefers-reduced-motion:reduce){.fi-lvl,.fi-rainbow,.fi-xg{animation:none}}
`;

import type { CSSProperties } from "react";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import { RetroGrid } from "@/components/ui/retro-grid";
import { GridPattern } from "@/components/ui/grid-pattern";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Ripple } from "@/components/ui/ripple";
import { Particles } from "@/components/ui/particles";

type Variant = "interactive-grid" | "retro" | "grid" | "dot" | "ripple" | "particles";

// Each non-home page gets its own Magic UI background component (instead of
// the one shared FlickeringGrid) tinted with that page's Minecraft accent —
// same vignette-to-background fade as the home page's SiteBackground so text
// stays legible regardless of which effect is running underneath.
export function PageBackground({ variant, color }: { variant: Variant; color: string }) {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {variant === "interactive-grid" && (
                // The 3D-floor look needs a skew, and a skewY(deg) displaces
                // points sideways-in-effect by an amount proportional to
                // their distance from the transform's vertical center — on
                // a ~1920px-wide viewport that's roughly ±960px * tan(12°)
                // ≈ ±200px of vertical displacement at the left/right edges.
                // The original oversize (200% height, 0% width overflow)
                // only padded vertically, so that horizontal displacement
                // pushed the left/right edges of the grid clean outside the
                // parent's overflow-hidden clip — which is what made most
                // of a wide screen look empty. Padding width too (not just
                // height) gives the skew room on both axes. The edge fade
                // comes from the shared vignette div below, not a mask
                // here — masking an already-oversized, skewed box in its
                // own local (pre-transform) coordinate space doesn't line
                // up with what's actually visible after the transform.
                <InteractiveGridPattern
                    className="inset-x-[-25%] inset-y-[-30%] h-[200%] w-[150%] skew-y-12 opacity-40"
                    squaresClassName="hover:fill-[color-mix(in_oklch,var(--pattern-color)_25%,transparent)]"
                    style={{ "--pattern-color": color } as CSSProperties}
                />
            )}
            {variant === "retro" && (
                <RetroGrid darkLineColor={color} lightLineColor={color} opacity={0.35} cellSize={50} />
            )}
            {variant === "grid" && (
                <GridPattern
                    className="opacity-25"
                    style={{ fill: color, stroke: color } as CSSProperties}
                />
            )}
            {variant === "dot" && (
                <DotPattern glow className="opacity-50" style={{ color } as CSSProperties} />
            )}
            {variant === "ripple" && (
                <Ripple
                    className="size-full"
                    color={color}
                    mainCircleSize={140}
                    mainCircleOpacity={0.3}
                    numCircles={10}
                />
            )}
            {variant === "particles" && (
                <Particles className="size-full" quantity={70} color={color} size={0.6} />
            )}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse at center, transparent 40%, var(--background) 100%)",
                }}
            />
        </div>
    );
}

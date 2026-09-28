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
                // MagicUI's own demo applies a skew + 200%-oversize + radial
                // mask, but that combination is tuned for a small bounded
                // hero box — stretched across an entire fixed viewport the
                // skew pushes most of the grid outside the visible area and
                // the mask's percentage sizing goes wrong against the
                // oversized box, so most of the screen ends up with no grid
                // at all. A plain full-bleed grid (still using the fixed
                // viewBox/preserveAspectRatio fix so it actually stretches
                // to fill any viewport size) covers the whole screen
                // reliably instead.
                <InteractiveGridPattern
                    className="opacity-40"
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

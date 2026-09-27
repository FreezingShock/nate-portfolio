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
                <InteractiveGridPattern
                    className="opacity-40"
                    squaresClassName="hover:fill-primary/20"
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
                <div className="size-full" style={{ "--foreground": color } as CSSProperties}>
                    <Ripple mainCircleOpacity={0.15} numCircles={6} />
                </div>
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

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
                // A real 3D floor, not a 2D shear: `skewY` only slants a
                // flat plane (parallel lines stay parallel) — it can't
                // produce the converging, receding-into-the-distance look
                // MagicUI's own demo screenshot shows, because that demo
                // relies on the SAME skewY trick only reading as "3D" at a
                // small 500px-box scale, right up against a tight radial
                // mask. A CSS `perspective` on the parent plus `rotateX` on
                // the grid gives an actual perspective projection — lines
                // genuinely converge toward the horizon. The grid is
                // oversized (250%) on every axis so the corners, which move
                // inward once foreshortened by the rotation, still reach
                // past the viewport edges instead of leaving gaps.
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ perspective: "800px" }}
                >
                    <InteractiveGridPattern
                        className="inset-[-75%] h-[250%] w-[250%] opacity-50 [transform:rotateX(62deg)]"
                        squaresClassName="transition-colors duration-150 hover:fill-[color-mix(in_oklch,var(--pattern-color)_35%,transparent)]"
                        style={{ "--pattern-color": color } as CSSProperties}
                    />
                </div>
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
                <DotPattern glow cr={1.5} className="opacity-75" style={{ color } as CSSProperties} />
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

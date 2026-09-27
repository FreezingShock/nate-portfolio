"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

// Sitewide ambient background — replaces the old forest photo. Deliberately
// subtle (low maxOpacity): the Linear/Reflect reference sites use texture
// as a barely-there hint, not a visual centerpiece competing with content.
export function SiteBackground() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    // Avoid a flash of the wrong color before the theme resolves client-side.
    if (!mounted) return null;

    const color = resolvedTheme === "dark" ? "oklch(0.96 0.004 260)" : "oklch(0.16 0.014 260)";

    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
            <FlickeringGrid
                className="size-full"
                squareSize={3}
                gridGap={7}
                flickerChance={0.12}
                maxOpacity={0.12}
                color={color}
            />
            {/* Vignette toward the edges so text stays high-contrast wherever
                it sits, without capping the grid's opacity so low it disappears. */}
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

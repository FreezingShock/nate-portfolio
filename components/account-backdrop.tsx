"use client";

import { Floating3DParticles } from "@/components/ui/floating-3d-particles";

// The account page background: several layers of Magic UI's Floating 3D Particles in the site's Minecraft
// palette (purple, aqua, pink, gold, green), each at a different size and depth, over soft colored glows.
// It sits behind everything and fades to the page color at the edges, like the other page backgrounds.
const LAYERS = [
    { color: "#a855f7", quantity: 240, size: 3.2, opacity: 0.4, drift: 0.5, depth: 0.7 },
    { color: "#55ffff", quantity: 160, size: 2.4, opacity: 0.38, drift: 0.8, depth: 0.55 },
    { color: "#ff55ff", quantity: 90, size: 4.2, opacity: 0.3, drift: 0.35, depth: 0.85 },
    { color: "#ffaa00", quantity: 70, size: 2, opacity: 0.45, drift: 1.1, depth: 0.4 },
    { color: "#55ff55", quantity: 60, size: 2.6, opacity: 0.32, drift: 0.65, depth: 0.6 },
];

export function AccountBackdrop() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(60% 50% at 15% 10%, color-mix(in oklch, #a855f7 22%, transparent), transparent 70%), radial-gradient(55% 45% at 90% 20%, color-mix(in oklch, #55ffff 16%, transparent), transparent 70%), radial-gradient(60% 50% at 70% 100%, color-mix(in oklch, #ff55ff 16%, transparent), transparent 70%), radial-gradient(40% 35% at 5% 85%, color-mix(in oklch, #ffaa00 12%, transparent), transparent 70%)",
                }}
            />
            {LAYERS.map((l) => (
                <Floating3DParticles key={l.color} {...l} />
            ))}
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 45%, var(--background) 100%)" }} />
        </div>
    );
}

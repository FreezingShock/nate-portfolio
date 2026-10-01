import type { CSSProperties } from "react";

// The moving layer behind an animated banner. The motion itself is CSS (.pfx in globals.css); this only lays out
// a fixed set of particles/bands with stable pseudo-random positions, so it renders the same on server and client
// and costs a handful of elements.

const rand = (seed: string) => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
};

const COUNT: Record<string, number> = { stars: 26, embers: 16, rain: 24, matrix: 22, blobs: 3, aurora: 3, glitch: 5, prism: 1, void: 15, waves: 2 };
const HUES: Record<string, number[]> = { blobs: [310, 260, 200], aurora: [150, 190, 270] };

export function BannerFx({ fx }: { fx: string | undefined }) {
    if (!fx || fx === "none" || !(fx in COUNT)) return null;
    const r = rand(fx);
    return (
        <div className="pfx" data-fx={fx} aria-hidden="true">
            {Array.from({ length: COUNT[fx] }, (_, i) => (
                <i
                    key={i}
                    style={
                        {
                            ["--x" as string]: Math.round(r() * 100),
                            ["--y" as string]: fx === "aurora" ? i * 22 + Math.round(r() * 10) : fx === "waves" ? 18 + i * 14 : Math.round(r() * 100),
                            ["--s" as string]: (r() * 3).toFixed(2),
                            ["--d" as string]: Math.round(r() * 9),
                            ["--h" as string]: HUES[fx]?.[i % 3] ?? 200,
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    );
}

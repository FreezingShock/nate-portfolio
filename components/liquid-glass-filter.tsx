// Hidden, render-once SVG filter def that backs the `.liquid-glass` utility
// class (app/globals.css) — the feTurbulence/feDisplacementMap pair is what
// gives iOS26-style "liquid glass" its subtle warped-refraction look instead
// of a flat frosted blur. Referenced via `backdrop-filter: ... url(#id)`.
// Rendered once in the root layout; every glass surface on the site shares
// this one filter definition instead of each declaring its own <svg>.
export function LiquidGlassFilter() {
    return (
        <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
            <filter
                id="liquid-glass-distortion"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
                colorInterpolationFilters="sRGB"
            >
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.008 0.012"
                    numOctaves={2}
                    seed={7}
                    result="noise"
                />
                <feGaussianBlur in="noise" stdDeviation={2} result="blurredNoise" />
                <feDisplacementMap
                    in="SourceGraphic"
                    in2="blurredNoise"
                    scale={28}
                    xChannelSelector="R"
                    yChannelSelector="G"
                />
            </filter>
        </svg>
    );
}

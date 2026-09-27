"use client";

import {
    ScrollVelocityContainer,
    ScrollVelocityRow,
} from "@/components/ui/scroll-based-velocity";

// Five theme accents already defined in globals.css for chart use — reused
// here so every pill reads as "on-brand" instead of one flat color.
const PALETTE = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

const ROLES = [
    "Student",
    "Coder",
    "Roblox Developer",
    "Systems Designer",
    "Environmental Engineer (in training)",
    "Game Dev",
];

function Pill({ label, colorVar }: { label: string; colorVar: string }) {
    return (
        <span
            className="mx-2 inline-flex shrink-0 cursor-default items-center rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 hover:shadow-[0_0_18px_var(--glow)]"
            style={
                {
                    borderColor: `color-mix(in oklch, var(${colorVar}) 55%, transparent)`,
                    color: `var(${colorVar})`,
                    backgroundColor: `color-mix(in oklch, var(${colorVar}) 12%, transparent)`,
                    "--glow": `color-mix(in oklch, var(${colorVar}) 70%, transparent)`,
                } as React.CSSProperties
            }
        >
            {label}
        </span>
    );
}

function PillRow({
    items,
    direction,
}: {
    items: string[];
    direction: 1 | -1;
}) {
    return (
        <ScrollVelocityRow baseVelocity={2} direction={direction} className="py-2">
            {items.map((item, i) => (
                <Pill key={item} label={item} colorVar={PALETTE[i % PALETTE.length]} />
            ))}
        </ScrollVelocityRow>
    );
}

// Two rows: who Nate is (roles), and what he actually builds with (real
// Supabase tags) — scroll-velocity driven so it's a quiet crawl at rest and
// visibly reacts (speeds up, can reverse) while the page is being scrolled,
// instead of an indifferent constant auto-scroll.
export function IdentityMarquee({ stack }: { stack: string[] }) {
    return (
        <div className="relative w-full overflow-hidden border-y border-border/40 bg-card/20 py-6">
            <ScrollVelocityContainer>
                <PillRow items={ROLES} direction={1} />
                {stack.length > 0 && <PillRow items={stack} direction={-1} />}
            </ScrollVelocityContainer>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-background to-transparent sm:w-32" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-background to-transparent sm:w-32" />
        </div>
    );
}

"use client";

import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import {
    ScrollVelocityContainer,
    ScrollVelocityRow,
} from "@/components/ui/scroll-based-velocity";

// The full bright Minecraft color-code palette (all defined in globals.css),
// so pills read as "on-brand" and no two neighbors share a color.
const PALETTE = [
    "--mc-gold",
    "--mc-aqua",
    "--mc-green",
    "--mc-light-purple",
    "--mc-yellow",
    "--mc-red",
    "--mc-blue",
    "--mc-dark-aqua",
    "--mc-dark-green",
    "--mc-dark-purple",
];

// Hypixel-style glyphs rotated across pills.
const SYMBOLS: McSymbolName[] = [
    "strength", "defense", "speed", "intelligence", "magicFind", "fortune",
    "attackSpeed", "wisdom", "forge", "flower", "comet", "pristine",
];

const ROLES = [
    "Student",
    "Coder",
    "Roblox Developer",
    "Systems Designer",
    "Environmental Engineer (in training)",
    "Game Dev",
    "Runner",
    "Builder",
    "Systems Thinker",
    "3D Artist",
    "Writer",
    "Class of 2027",
];

const ABOUT = [
    "Cross Country",
    "Kierkegaard Reader",
    "Agnostic",
    "Egg Theory",
    "Blender",
    "Urban Design",
    "Sustainability",
    "Renovation Studies",
    "Philosophy",
    "Minecraft Palette",
    "Southern California",
    "Always Learning",
];

const GOALS = [
    "Santa Monica College",
    "Cal Poly Pomona",
    "Civil Engineering",
    "Recruited Athlete Path",
    "Ship Fractured Islands",
    "Sustainable Infrastructure",
    "Launch by 2031",
    "Financial Freedom",
    "Team Captain",
    "Build Things That Last",
];

function Pill({
    label,
    colorVar,
    symbol,
}: {
    label: string;
    colorVar: string;
    symbol: McSymbolName;
}) {
    return (
        <span
            className="mx-2 inline-flex shrink-0 cursor-default items-center gap-2 rounded-full border px-4 py-1.5 font-minecraft text-sm font-bold backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 hover:shadow-[0_0_20px_var(--glow)]"
            style={
                {
                    borderColor: `color-mix(in oklch, var(${colorVar}) 60%, transparent)`,
                    color: `var(${colorVar})`,
                    backgroundColor: `color-mix(in oklch, var(${colorVar}) 12%, transparent)`,
                    "--glow": `color-mix(in oklch, var(${colorVar}) 75%, transparent)`,
                } as React.CSSProperties
            }
        >
            <McSymbol name={symbol} />
            {label}
        </span>
    );
}

function PillRow({
    items,
    direction,
    velocity,
    offset,
}: {
    items: string[];
    direction: 1 | -1;
    velocity: number;
    /** Shifts the color/symbol cycle so stacked rows never line up. */
    offset: number;
}) {
    return (
        <ScrollVelocityRow baseVelocity={velocity} direction={direction} className="py-2">
            {items.map((item, i) => (
                <Pill
                    key={item}
                    label={item}
                    colorVar={PALETTE[(i + offset) % PALETTE.length]}
                    symbol={SYMBOLS[(i * 5 + offset) % SYMBOLS.length]}
                />
            ))}
        </ScrollVelocityRow>
    );
}

// Four rows at different speeds, alternating direction: who Nate is, what he
// cares about, where he's headed, and what he builds with (real Supabase
// tags). Scroll-velocity driven — a quiet crawl at rest that speeds up (and
// can reverse) while the page scrolls.
export function IdentityMarquee({ stack }: { stack: string[] }) {
    return (
        <div className="relative w-full overflow-hidden border-y border-border/40 bg-card/20 py-6">
            <ScrollVelocityContainer>
                <PillRow items={ROLES} direction={1} velocity={2} offset={0} />
                <PillRow items={ABOUT} direction={-1} velocity={2.6} offset={3} />
                <PillRow items={GOALS} direction={1} velocity={1.6} offset={6} />
                {stack.length > 0 && (
                    <PillRow items={stack} direction={-1} velocity={2.2} offset={8} />
                )}
            </ScrollVelocityContainer>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-background to-transparent sm:w-32" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-background to-transparent sm:w-32" />
        </div>
    );
}

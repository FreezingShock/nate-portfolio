import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionLabel } from "@/components/section-label";
import { GlowCard } from "@/components/glow-card";
import { NEXT_MONTHS, NEXT_YEAR } from "@/lib/upcoming";

// Timeline View: the next few months on the left as a vertical rail, and a
// preview of next year on the right. The full plan lives on /timeline.
export function LandingTimeline() {
    return (
        <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between gap-4">
                <SectionLabel accent="var(--mc-green)" symbol="arrow">
                    Timeline View
                </SectionLabel>
                <Link
                    href="/timeline"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    Full timeline <ArrowRight className="size-3.5" />
                </Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                What I&apos;m working toward{" "}
                <span className="font-minecraft" style={{ color: "var(--mc-aqua)" }}>
                    right now
                </span>{" "}
                and a look at{" "}
                <span className="font-minecraft" style={{ color: "var(--mc-gold)" }}>
                    the year ahead
                </span>
                .
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
                {/* Next months — vertical rail */}
                <div className="lg:col-span-3">
                    <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Next 3 months
                    </p>
                    <ol className="relative space-y-4 pl-8">
                        <span
                            aria-hidden
                            className="absolute bottom-2 left-[11px] top-2 w-px"
                            style={{
                                background:
                                    "linear-gradient(to bottom, var(--mc-aqua), var(--mc-gold), var(--mc-green))",
                            }}
                        />
                        {NEXT_MONTHS.map((month, i) => (
                            <li key={month.label} className="relative">
                                <span
                                    aria-hidden
                                    className="absolute -left-8 top-5 flex size-6 items-center justify-center rounded-full border-2 bg-background"
                                    style={{ borderColor: month.color, boxShadow: `0 0 12px ${month.color}` }}
                                >
                                    <span
                                        className={i === 0 ? "dot-blink size-2 rounded-full" : "size-2 rounded-full"}
                                        style={{ backgroundColor: month.color }}
                                    />
                                </span>
                                <GlowCard color={month.color} className="p-5">
                                    <div className="flex items-baseline gap-2">
                                        <h3
                                            className="font-minecraft text-lg font-bold"
                                            style={{ color: month.color }}
                                        >
                                            {month.label}
                                        </h3>
                                        <span className="font-mono text-xs text-muted-foreground">{month.year}</span>
                                        {i === 0 && (
                                            <span
                                                className="ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
                                                style={{
                                                    color: month.color,
                                                    borderColor: `color-mix(in oklch, ${month.color} 50%, transparent)`,
                                                }}
                                            >
                                                Now
                                            </span>
                                        )}
                                    </div>
                                    <ul className="mt-3 space-y-1.5">
                                        {month.goals.map((goal) => (
                                            <li key={goal} className="flex gap-2 text-sm text-muted-foreground">
                                                <span className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ backgroundColor: month.color }} />
                                                {goal}
                                            </li>
                                        ))}
                                    </ul>
                                </GlowCard>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Next year — preview */}
                <div className="lg:col-span-2">
                    <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Next year
                    </p>
                    <GlowCard color="var(--mc-light-purple)" className="h-[calc(100%-2rem)] p-5">
                        <div className="flex items-baseline justify-between gap-2">
                            <h3 className="rainbow-text font-minecraft text-4xl font-bold">{NEXT_YEAR.year}</h3>
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                Preview
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{NEXT_YEAR.blurb}</p>
                        <ul className="mt-4 space-y-3">
                            {NEXT_YEAR.milestones.map((m) => (
                                <li key={m.title} className="flex gap-3">
                                    <span
                                        className="mt-0.5 w-[4.5rem] shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider"
                                        style={{ color: m.color }}
                                    >
                                        {m.when}
                                    </span>
                                    <div className="min-w-0 border-l pl-3" style={{ borderColor: `color-mix(in oklch, ${m.color} 50%, transparent)` }}>
                                        <p className="text-sm font-semibold leading-tight">{m.title}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{m.detail}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </GlowCard>
                </div>
            </div>
        </div>
    );
}

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { GlowCard } from "@/components/glow-card";
import { SectionLabel } from "@/components/section-label";
import { NumberTicker } from "@/components/ui/number-ticker";
import { TimelineCountdowns, type Countdown } from "@/components/timeline-countdowns";
import {
    JOURNEY_END,
    JOURNEY_START,
    KEY_DATES,
    allEvents,
    getStatus,
    getUpNext,
    phases,
    progressBetween,
} from "@/lib/timeline-data";

const COUNTDOWNS: Countdown[] = [
    {
        label: "AP Exam Window",
        sublabel: "May 3 – 13, 2027",
        date: KEY_DATES.apStart,
        color: "var(--mc-gold)",
        icon: "Award",
        special: true,
    },
    {
        label: "Graduation Day",
        sublabel: "June 10, 2027",
        date: KEY_DATES.graduation,
        color: "var(--mc-yellow)",
        icon: "GraduationCap",
        special: true,
    },
    {
        label: "Santa Monica College",
        sublabel: "Fall 2027",
        date: "2027-09-01",
        color: "var(--mc-dark-aqua)",
        icon: "Rocket",
    },
];

const span = new Date(`${JOURNEY_END}T23:59:59`).getTime() - new Date(`${JOURNEY_START}T00:00:00`).getTime();
const pos = (date: string) =>
    (Math.min(Math.max(new Date(`${date}T00:00:00`).getTime() - new Date(`${JOURNEY_START}T00:00:00`).getTime(), 0), span) / span) * 100;

// Server component: static structure plus the live countdown island.
export function TimelineOverview({ nowMs }: { nowMs: number }) {
    const events = allEvents();
    const total = phases.reduce((n, p) => n + p.events.length, 0);
    const done = events.filter((e) => getStatus(e, nowMs) === "done").length;
    const journeyPct = progressBetween(JOURNEY_START, JOURNEY_END, nowMs) * 100;
    const milestones = events.filter((e) => e.special);
    const upNext = getUpNext(4, nowMs);
    const journeyPhases = phases.filter((p) => p.id !== "personal");

    return (
        <div className="space-y-8">
            <div>
                <SectionLabel accent="var(--mc-gold)" symbol="flag">
                    The Big Dates
                </SectionLabel>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    The fixed points everything else is built around, counting down live.
                </p>
                <div className="mt-5">
                    <TimelineCountdowns items={COUNTDOWNS} nowMs={nowMs} />
                </div>
            </div>

            {/* Journey bar: the whole 2026 → 2031 stretch on one line. */}
            <GlowCard color="var(--mc-green)" className="p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-minecraft text-lg font-bold" style={{ color: "var(--mc-green)" }}>
                        The Whole Journey
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground">Sept 2026 → May 2031</span>
                </div>

                <div className="relative mt-8 h-4">
                    {/* base track + phase segments */}
                    <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 10%, transparent)" }} />
                    {journeyPhases.map((p) => (
                        <div
                            key={p.id}
                            className="absolute inset-y-0 rounded-full"
                            title={`${p.short}: ${p.range}`}
                            style={{
                                left: `${pos(p.start)}%`,
                                width: `${pos(p.end) - pos(p.start)}%`,
                                backgroundColor: `color-mix(in oklch, ${p.color} 55%, transparent)`,
                                boxShadow: `0 0 12px -2px color-mix(in oklch, ${p.color} 60%, transparent)`,
                            }}
                        />
                    ))}
                    {/* elapsed overlay */}
                    <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                            width: `${Math.max(journeyPct, 0.8)}%`,
                            background: "linear-gradient(90deg, var(--mc-blue), var(--mc-aqua))",
                            boxShadow: "0 0 14px var(--mc-aqua)",
                        }}
                    />
                    {/* special milestones */}
                    {milestones.map((m) => (
                        <span
                            key={m.id}
                            title={`${m.title}: ${m.when}`}
                            className="chroma-marker absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
                            style={{ left: `${pos(m.start)}%` }}
                        />
                    ))}
                    {/* today */}
                    <span
                        className="absolute -top-6 -translate-x-1/2 font-mono text-[10px] font-bold uppercase tracking-wider"
                        style={{ left: `${Math.max(journeyPct, 3)}%`, color: "var(--mc-aqua)" }}
                    >
                        ▼ You are here
                    </span>
                </div>

                <div className="relative mt-3 h-10 text-[11px] font-semibold">
                    {journeyPhases.map((p) => (
                        <span
                            key={p.id}
                            className="absolute -translate-x-1/2 whitespace-nowrap text-center font-minecraft"
                            style={{ left: `${(pos(p.start) + pos(p.end)) / 2}%`, color: p.color }}
                        >
                            {p.short}
                        </span>
                    ))}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-3 border-t pt-4" style={{ borderColor: "color-mix(in oklch, var(--mc-green) 25%, transparent)" }}>
                    <div>
                        <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: "var(--mc-aqua)" }}>
                            {journeyPct < 1 ? journeyPct.toFixed(1) : <NumberTicker value={Math.round(journeyPct)} />}
                            <span className="text-base">%</span>
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">of the journey</p>
                    </div>
                    <div>
                        <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: "var(--mc-gold)" }}>
                            <NumberTicker value={total} />
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">milestones planned</p>
                    </div>
                    <div>
                        <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: "var(--mc-green)" }}>
                            <NumberTicker value={done} />
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">already done</p>
                    </div>
                </div>
            </GlowCard>

            {/* Up next */}
            <div>
                <h3 className="font-minecraft text-lg font-bold" style={{ color: "var(--mc-aqua)" }}>
                    Up Next
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {upNext.map((e) => {
                        const c = e.special ? "var(--mc-gold)" : e.phase.color;
                        return (
                            <Link key={e.id} href={`#${e.id}`} className="group block">
                                <GlowCard color={c} className="flex items-center gap-3 p-4">
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}` }}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: c }}>
                                            {e.when}
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold leading-tight">
                                            {e.special && <Star className="size-3.5 shrink-0" style={{ color: "#ffaa00" }} fill="#ffaa00" />}
                                            <span className="truncate">{e.title}</span>
                                        </span>
                                    </span>
                                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
                                </GlowCard>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

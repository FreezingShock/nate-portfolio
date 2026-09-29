import { GlassBar } from "@/components/glass-bar";
import { GlowCard } from "@/components/glow-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import {
    TimelineCountdowns,
    type Countdown,
} from "@/components/timeline-countdowns";
import { SectionLabel } from "@/components/section-label";
import { courses, AP_WINDOW } from "@/lib/studies-data";
import { KEY_DATES, phases, progressBetween } from "@/lib/timeline-data";

const COUNTDOWNS: Countdown[] = [
    {
        label: "AP Exam Window",
        sublabel: AP_WINDOW.label,
        date: KEY_DATES.apStart,
        color: "var(--mc-gold)",
        icon: "Award",
        special: true,
    },
    {
        label: "Senior Project Presentation",
        sublabel: "Late May 2027",
        date: "2027-05-14",
        color: "var(--mc-yellow)",
        icon: "Users",
    },
    {
        label: "Graduation Day",
        sublabel: "June 10, 2027",
        date: KEY_DATES.graduation,
        color: "var(--mc-yellow)",
        icon: "GraduationCap",
        special: true,
    },
];

// Server component: the school-year picture at a glance. Dates come from the
// same source as the Timeline page, so the two can never disagree.
export function StudiesOverview({ nowMs }: { nowMs: number }) {
    const hs = phases.find((p) => p.id === "high-school")!;
    const yearProgress = progressBetween(hs.start, KEY_DATES.graduation, nowMs);
    const apProgress = progressBetween(hs.start, KEY_DATES.apStart, nowMs);
    const apCount = courses.filter((c) => c.ap).length;

    return (
        <div className="space-y-6">
            <div>
                <SectionLabel accent="var(--mc-gold)" symbol="flag">
                    The School Year
                </SectionLabel>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Where senior year stands, and the dates it&apos;s all
                    building toward, counting down live.
                </p>
            </div>

            <TimelineCountdowns items={COUNTDOWNS} nowMs={nowMs} />

            <div className="grid gap-4 lg:grid-cols-5">
                <GlowCard
                    color="var(--mc-blue)"
                    className="space-y-5 p-5 lg:col-span-3"
                >
                    <GlassBar
                        label="Senior year"
                        value={yearProgress}
                        decimals={1}
                        from="#5555ff"
                        to="#55ffff"
                        sub="Sept 2026 → Graduation, June 10, 2027"
                    />
                    <GlassBar
                        label="Road to AP exams"
                        value={apProgress}
                        decimals={1}
                        from="#ffaa00"
                        to="#ff5555"
                        sub="Sept 2026 → May 3, 2027"
                    />
                </GlowCard>

                <div className="grid grid-cols-3 gap-4 lg:col-span-2">
                    {[
                        {
                            value: courses.length,
                            label: "classes",
                            color: "var(--mc-blue)",
                        },
                        {
                            value: apCount,
                            label: "AP exams",
                            color: "var(--mc-red)",
                        },
                        {
                            value: 1,
                            label: "capstone",
                            color: "var(--mc-gold)",
                        },
                    ].map((s) => (
                        <GlowCard
                            key={s.label}
                            color={s.color}
                            className="flex flex-col justify-center p-4 text-center"
                        >
                            <p
                                className="font-mono text-4xl font-bold tabular-nums"
                                style={{ color: s.color }}
                            >
                                <NumberTicker
                                    value={s.value}
                                    style={{ color: s.color }}
                                />
                            </p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                {s.label}
                            </p>
                        </GlowCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

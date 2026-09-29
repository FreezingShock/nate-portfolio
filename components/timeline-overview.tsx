import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { GlowCard } from "@/components/glow-card";
import { SectionLabel } from "@/components/section-label";
import {
    JourneyTracker,
    type JourneyBand,
    type JourneyMarker,
} from "@/components/journey-tracker";
import {
    TimelineCountdowns,
    type Countdown,
} from "@/components/timeline-countdowns";
import {
    CATEGORIES,
    KEY_DATES,
    allEvents,
    getStatus,
    getUpNext,
    phases,
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

// The events shown as markers on the journey axis: every rainbow milestone
// plus each major event, plus the finish line itself (Launch). Data is
// prepared here on the server; the interactive axis is a client component.
function buildMarkers(nowMs: number): JourneyMarker[] {
    const fromEvents = allEvents()
        .filter(
            (e) =>
                e.phase.id !== "personal" && (e.special || e.type === "major")
        )
        .map<JourneyMarker>((e) => ({
            id: e.id,
            title: e.title,
            when: e.when,
            start: e.start,
            description: e.description,
            tags: e.tags,
            color: CATEGORIES[e.category].color,
            categoryLabel: CATEGORIES[e.category].label,
            status: getStatus(e, nowMs),
            special: !!e.special,
            href: `#${e.id}`,
        }));
    return [
        ...fromEvents,
        {
            id: "launch",
            title: "Launch",
            when: "Spring 2031",
            start: "2031-05-31",
            description:
                "The point the whole plan builds toward: launching a sustainable infrastructure and urban design business or project, backed by an engineering degree, an executed portfolio, athletic leadership and a network of mentors.",
            tags: ["Founding", "Sustainability"],
            color: "var(--mc-gold)",
            categoryLabel: "Finish line",
            status: "upcoming",
            special: true,
            href: "#horizons",
        },
    ];
}

// Server component: static structure plus the live countdown island.
export function TimelineOverview({ nowMs }: { nowMs: number }) {
    const events = allEvents();
    const total = phases.reduce((n, p) => n + p.events.length, 0);
    const done = events.filter((e) => getStatus(e, nowMs) === "done").length;
    const markers = buildMarkers(nowMs);
    const upNext = getUpNext(4, nowMs);
    const bands: JourneyBand[] = phases
        .filter((p) => p.id !== "personal")
        .map((p) => ({
            id: p.id,
            short: p.short,
            color: p.color,
            start: p.start,
            end: p.end,
        }));

    return (
        <div className="space-y-8">
            <div>
                <SectionLabel accent="var(--mc-gold)" symbol="flag">
                    The Big Dates
                </SectionLabel>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    The fixed points everything else is built around, counting
                    down live.
                </p>
                <div className="mt-5">
                    <TimelineCountdowns items={COUNTDOWNS} nowMs={nowMs} />
                </div>
            </div>

            {/* The whole journey: interactive year/month axis with hoverable
                milestones, plus live clock and progress tickers. */}
            <JourneyTracker
                markers={markers}
                bands={bands}
                nowMs={nowMs}
                total={total}
                done={done}
            />

            {/* Up next */}
            <div>
                <h3
                    className="font-minecraft text-lg font-bold"
                    style={{ color: "var(--mc-aqua)" }}
                >
                    Up Next
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {upNext.map((e) => {
                        const c = e.special
                            ? "var(--mc-gold)"
                            : CATEGORIES[e.category].color;
                        return (
                            <Link
                                key={e.id}
                                href={`#${e.id}`}
                                className="group block"
                            >
                                <GlowCard
                                    color={c}
                                    className="flex items-center gap-3 p-4"
                                >
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: c,
                                            boxShadow: `0 0 10px ${c}`,
                                        }}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className="block font-mono text-[10px] font-semibold uppercase tracking-wider"
                                            style={{ color: c }}
                                        >
                                            {e.when}
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold leading-tight">
                                            {e.special && (
                                                <Star
                                                    className="size-3.5 shrink-0"
                                                    style={{ color: "#ffaa00" }}
                                                    fill="#ffaa00"
                                                />
                                            )}
                                            <span className="truncate">
                                                {e.title}
                                            </span>
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

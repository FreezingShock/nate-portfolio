import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { GlassBar } from "@/components/glass-bar";
import { GlowCard } from "@/components/glow-card";
import { STUDY_ICONS } from "@/components/study-icons";
import {
    READING_STATUS,
    pathway,
    readingQueue,
    toolRoadmap,
    type Program,
    type ReadingStatus,
} from "@/lib/studies-data";
import { phases, progressBetween } from "@/lib/timeline-data";

// Static sections of /studies. All server components: they render once as
// HTML, and the only client code on each is GlowCard's tiny hover spotlight.

export function ProgramCardView({ program }: { program: Program }) {
    const Icon = STUDY_ICONS[program.icon];
    const { color } = program;
    return (
        <GlowCard color={color} className="h-full p-5">
            <div className="flex items-start gap-3">
                <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl"
                    style={{
                        color,
                        backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 40%, transparent)`,
                    }}
                >
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <h4
                        className="font-minecraft text-lg font-bold leading-tight"
                        style={{
                            color,
                            textShadow: `0 0 14px color-mix(in oklch, ${color} 40%, transparent)`,
                        }}
                    >
                        {program.title}
                    </h4>
                    {program.institution && (
                        <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {program.institution}
                        </p>
                    )}
                </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {program.description}
            </p>
            <p
                className="mt-3 border-l-2 pl-3 font-mono text-xs"
                style={{
                    borderColor: `color-mix(in oklch, ${color} 55%, transparent)`,
                    color,
                }}
            >
                {program.timeline}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {program.courses.map((c) => (
                    <span
                        key={c}
                        className="rounded-full border px-2 py-0.5 font-rubik text-[11px] font-medium"
                        style={{
                            color,
                            borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
                            backgroundColor: `color-mix(in oklch, ${color} 9%, transparent)`,
                        }}
                    >
                        {c}
                    </span>
                ))}
            </div>
        </GlowCard>
    );
}

// Marker geometry, shared idea with the timeline rail: the marker and its rail
// segment live in one column on one center axis, so they cannot drift apart.
const MARKER_TOP = 18;
const MARKER_SIZE = 44;
const MARKER_CENTER = MARKER_TOP + MARKER_SIZE / 2;

export function PathwayRail({ nowMs }: { nowMs: number }) {
    return (
        <ol>
            {pathway.map((stage, i) => {
                const phase = phases.find((p) => p.id === stage.phaseId)!;
                const progress = progressBetween(phase.start, phase.end, nowMs);
                const Icon = STUDY_ICONS[stage.icon];
                const first = i === 0;
                const last = i === pathway.length - 1;
                const next = pathway[i + 1];
                return (
                    <li
                        key={stage.phaseId}
                        className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-3"
                    >
                        <div className="relative">
                            <span
                                aria-hidden
                                className="absolute left-1/2 w-[3px] -translate-x-1/2 rounded-full"
                                style={{
                                    top: first ? MARKER_CENTER : 0,
                                    bottom: last
                                        ? `calc(100% - ${MARKER_CENTER}px)`
                                        : 0,
                                    background: `linear-gradient(to bottom, ${stage.color}, ${next?.color ?? stage.color})`,
                                    opacity: 0.85,
                                }}
                            />
                            <span
                                className="absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-full border-2"
                                style={{
                                    top: MARKER_TOP,
                                    width: MARKER_SIZE,
                                    height: MARKER_SIZE,
                                    color: stage.color,
                                    borderColor: stage.color,
                                    backgroundColor: `color-mix(in oklch, ${stage.color} 18%, var(--background))`,
                                    boxShadow: `0 0 16px -2px ${stage.color}`,
                                }}
                            >
                                <Icon className="size-5" />
                            </span>
                        </div>

                        <div className="pb-10">
                            <GlowCard color={stage.color} className="p-5">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h3
                                        className="font-minecraft text-2xl font-bold"
                                        style={{
                                            color: stage.color,
                                            textShadow: `0 0 16px color-mix(in oklch, ${stage.color} 40%, transparent)`,
                                        }}
                                    >
                                        {stage.title}
                                    </h3>
                                    <span
                                        className="font-mono text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: stage.color }}
                                    >
                                        {phase.range}
                                    </span>
                                </div>
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                    {stage.blurb}
                                </p>
                                <div className="mt-4">
                                    <GlassBar
                                        label="Progress"
                                        value={progress}
                                        decimals={0}
                                        from={stage.color}
                                        to={stage.color}
                                        height="h-3"
                                        sub={
                                            progress >= 1
                                                ? "Complete"
                                                : progress > 0
                                                  ? "In progress"
                                                  : "Not started yet"
                                        }
                                    />
                                </div>
                                <Link
                                    href={`/timeline#${stage.phaseId}`}
                                    className="mt-3 inline-flex items-center gap-1 font-mono text-xs font-semibold hover:underline"
                                    style={{ color: stage.color }}
                                >
                                    See it on the timeline
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </GlowCard>

                            {stage.programs.length > 0 && (
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    {stage.programs.map((p) => (
                                        <ProgramCardView
                                            key={p.title}
                                            program={p}
                                        />
                                    ))}
                                </div>
                            )}
                            {stage.programs.length === 0 && (
                                <Link
                                    href="#classes"
                                    className="mt-4 inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground"
                                >
                                    The six classes are above
                                    <ChevronRight className="size-3.5" />
                                </Link>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

export function ReadingQueue() {
    const counts = readingQueue.reduce(
        (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
        {} as Record<ReadingStatus, number>
    );
    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {(Object.keys(READING_STATUS) as ReadingStatus[]).map((s) => (
                    <span
                        key={s}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-rubik text-[11px] font-semibold"
                        style={{
                            color: READING_STATUS[s].color,
                            borderColor: `color-mix(in oklch, ${READING_STATUS[s].color} 45%, transparent)`,
                            backgroundColor: `color-mix(in oklch, ${READING_STATUS[s].color} 10%, transparent)`,
                        }}
                    >
                        {READING_STATUS[s].label}
                        <span className="font-mono text-[10px] opacity-70">
                            {counts[s] ?? 0}
                        </span>
                    </span>
                ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {readingQueue.map((item) => {
                    const st = READING_STATUS[item.status];
                    return (
                        <GlowCard
                            key={item.title}
                            color={st.color}
                            className="p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h4
                                        className="font-minecraft text-base font-bold leading-tight"
                                        style={{ color: st.color }}
                                    >
                                        {item.title}
                                    </h4>
                                    {item.author && (
                                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                            {item.author}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
                                    style={{
                                        color: st.color,
                                        borderColor: `color-mix(in oklch, ${st.color} 50%, transparent)`,
                                    }}
                                >
                                    {item.status === "reading" && (
                                        <span
                                            className="dot-blink size-1.5 rounded-full"
                                            style={{
                                                backgroundColor: st.color,
                                            }}
                                        />
                                    )}
                                    {st.label}
                                </span>
                            </div>
                            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                                {item.note}
                            </p>
                        </GlowCard>
                    );
                })}
            </div>
        </div>
    );
}

export function ToolRoadmap() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {toolRoadmap.map((stage, i) => {
                const Icon = STUDY_ICONS[stage.icon];
                return (
                    <div key={stage.label} className="relative">
                        <GlowCard color={stage.color} className="h-full p-5">
                            <div className="flex items-center justify-between">
                                <span
                                    className="grid size-10 place-items-center rounded-lg"
                                    style={{
                                        color: stage.color,
                                        backgroundColor: `color-mix(in oklch, ${stage.color} 16%, transparent)`,
                                    }}
                                >
                                    <Icon className="size-5" />
                                </span>
                                <span
                                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                                    style={{ color: stage.color }}
                                >
                                    {stage.when}
                                </span>
                            </div>
                            <h4
                                className="mt-3 font-minecraft text-lg font-bold"
                                style={{ color: stage.color }}
                            >
                                {stage.label}
                            </h4>
                            <ul className="mt-3 space-y-1.5">
                                {stage.skills.map((s) => (
                                    <li
                                        key={s}
                                        className="flex gap-2.5 text-[13px] text-muted-foreground"
                                    >
                                        <span
                                            className="mt-[7px] size-1.5 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: stage.color,
                                            }}
                                        />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </GlowCard>
                        {i < toolRoadmap.length - 1 && (
                            <ChevronRight
                                aria-hidden
                                className="absolute -right-4 top-1/2 z-10 hidden size-6 -translate-y-1/2 text-muted-foreground md:block"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

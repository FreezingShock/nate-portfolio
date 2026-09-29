"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, Flag, Layers, ListChecks, Star } from "lucide-react";
import { GlowCard } from "@/components/glow-card";
import { TIMELINE_ICONS } from "@/components/timeline-icons";
import { useActiveSection } from "@/lib/use-active-section";
import { cn } from "@/lib/utils";
import {
    getStatus,
    progressBetween,
    type EventStatus,
    type TimelineEventData,
    type TimelinePhaseData,
} from "@/lib/timeline-data";

// The interactive heart of /timeline. The page's data is static, so this is
// server-rendered HTML that hydrates into a handful of toggles: per-event
// detail panels, per-phase collapse, expand/collapse all, and a "milestones
// only" filter. No animation library, no per-card listeners beyond GlowCard's
// throttled CSS-variable spotlight, and every panel open/close is a CSS
// grid-rows transition (compositor-friendly, no measured heights).

// Marker column geometry. Every row is a 2-column grid: [marker column | card].
// The marker and its rail segment live in the SAME column and are centered on
// the SAME axis (left: 50%), so the icon can never drift off the line, unlike
// the old absolutely-positioned dot with hand-tuned pixel offsets.
const MARKER_CELL = 40; // px: height of the cell the marker is centered in
const MARKER_TOP = 12; // px: gap above that cell, so it lines up with the card header
const MARKER_CENTER = MARKER_TOP + MARKER_CELL / 2;

// Events rotate through the Minecraft palette so a phase isn't one flat color:
// the rail segment fades from each event's color into the next one's, giving a
// flowing gradient down the line. Each phase starts at its own offset so the
// phases open on different colors (Senior Year opens on blue, matching its
// header). Phase headers, chips and progress bars keep the phase's own color.
const EVENT_PALETTE = [
    "var(--mc-blue)",
    "var(--mc-aqua)",
    "var(--mc-light-purple)",
    "var(--mc-gold)",
    "var(--mc-green)",
    "var(--mc-red)",
    "var(--mc-yellow)",
    "var(--mc-dark-aqua)",
];
const PHASE_OFFSET: Record<string, number> = { "high-school": 0, smc: 7, "cal-poly": 4, personal: 2 };

function colorAt(phaseId: string, index: number) {
    return EVENT_PALETTE[((PHASE_OFFSET[phaseId] ?? 0) + index) % EVENT_PALETTE.length];
}

const STATUS_LABEL: Record<EventStatus, string> = {
    done: "Done",
    now: "Now",
    upcoming: "Upcoming",
    ongoing: "Ongoing",
};

function Collapse({
    open,
    children,
    className,
    bleed = false,
}: {
    open: boolean;
    children: React.ReactNode;
    className?: string;
    /** Let card shadows/glows spill ~24px past the edges instead of being clipped. */
    bleed?: boolean;
}) {
    return (
        <div
            className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                className
            )}
            // `inert` keeps collapsed content out of the tab order and away
            // from screen readers.
            inert={!open}
        >
            <div
                className={cn(
                    "min-h-0",
                    bleed ? "[overflow-clip-margin:1.5rem] [overflow:clip]" : "overflow-hidden"
                )}
            >
                {children}
            </div>
        </div>
    );
}

function StatusBadge({ status, color }: { status: EventStatus; color: string }) {
    const isNow = status === "now";
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
            style={{
                color: status === "done" ? "var(--muted-foreground)" : color,
                borderColor: `color-mix(in oklch, ${status === "done" ? "var(--muted-foreground)" : color} 45%, transparent)`,
                backgroundColor: isNow ? `color-mix(in oklch, ${color} 18%, transparent)` : "transparent",
            }}
        >
            {status === "done" && <Check className="size-3" />}
            {isNow && <span className="dot-blink size-1.5 rounded-full" style={{ backgroundColor: color }} />}
            {STATUS_LABEL[status]}
        </span>
    );
}

function EventRow({
    event,
    color,
    nextColor,
    first,
    last,
    status,
    open,
    onToggle,
}: {
    event: TimelineEventData;
    color: string;
    nextColor: string;
    first: boolean;
    last: boolean;
    status: EventStatus;
    open: boolean;
    onToggle: () => void;
}) {
    const Icon = TIMELINE_ICONS[event.icon];
    const major = event.type === "major";
    const special = !!event.special;
    const hasDetails = !!event.details?.length;
    const markerSize = special ? 40 : major ? 36 : 28;

    return (
        <li
            id={event.id}
            className="group/row grid scroll-mt-40 grid-cols-[3rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-3"
        >
            {/* Marker column: rail segment + marker, one shared center axis. */}
            <div className="relative">
                <span
                    aria-hidden
                    className="absolute left-1/2 w-[3px] -translate-x-1/2 rounded-full"
                    style={{
                        top: first ? MARKER_CENTER : 0,
                        bottom: last ? `calc(100% - ${MARKER_CENTER}px)` : 0,
                        background: `linear-gradient(to bottom, ${color}, ${nextColor})`,
                        opacity: status === "upcoming" ? 0.45 : 0.9,
                    }}
                />
                <div
                    className="absolute left-0 right-0 flex items-center justify-center"
                    style={{ top: MARKER_TOP, height: MARKER_CELL }}
                >
                    {status === "now" && (
                        <span
                            aria-hidden
                            className="absolute animate-ping rounded-full opacity-40"
                            style={{ width: markerSize, height: markerSize, backgroundColor: color }}
                        />
                    )}
                    <span
                        className={cn(
                            "relative grid place-items-center rounded-full transition-transform duration-200",
                            special && "chroma-marker",
                            "group-hover/row:scale-110"
                        )}
                        style={
                            special
                                ? { width: markerSize, height: markerSize }
                                : {
                                      width: markerSize,
                                      height: markerSize,
                                      color,
                                      backgroundColor: `color-mix(in oklch, ${color} ${status === "done" ? 26 : 18}%, var(--background))`,
                                      border: `2px solid ${color}`,
                                      boxShadow:
                                          status === "now"
                                              ? `0 0 18px ${color}`
                                              : `0 0 10px -2px color-mix(in oklch, ${color} 55%, transparent)`,
                                  }
                        }
                    >
                        <Icon
                            className={special ? "size-5" : major ? "size-[18px]" : "size-3.5"}
                            style={special ? { color: "#ffaa00" } : undefined}
                            strokeWidth={2.25}
                        />
                    </span>
                </div>
            </div>

            {/* Card */}
            <div className="pb-6">
                <GlowCard color={color} className={cn(special && "chroma-card")}>
                    <button
                        type="button"
                        onClick={hasDetails ? onToggle : undefined}
                        aria-expanded={hasDetails ? open : undefined}
                        className={cn(
                            "flex w-full items-start justify-between gap-3 p-4 text-left sm:p-5",
                            !hasDetails && "cursor-default"
                        )}
                    >
                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                                <span
                                    className="font-mono text-[11px] font-bold uppercase tracking-wider"
                                    style={{ color }}
                                >
                                    {event.when}
                                </span>
                                <StatusBadge status={status} color={color} />
                                {special && (
                                    <span className="chroma-text inline-flex items-center gap-1 font-minecraft text-[10px] font-bold uppercase tracking-wider">
                                        <Star className="size-3 text-[#ffaa00]" fill="#ffaa00" /> Milestone
                                    </span>
                                )}
                            </span>
                            <span
                                className={cn(
                                    "mt-2 block font-minecraft font-bold leading-tight",
                                    special ? "chroma-text text-xl sm:text-2xl" : major ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                                )}
                                style={special ? undefined : { color, textShadow: `0 0 14px color-mix(in oklch, ${color} 35%, transparent)` }}
                            >
                                {event.title}
                            </span>
                        </span>
                        {hasDetails && (
                            <ChevronDown
                                className={cn("mt-1 size-5 shrink-0 transition-transform duration-300", open && "rotate-180")}
                                style={{ color }}
                            />
                        )}
                    </button>

                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>

                        {event.tags && event.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {event.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border px-2 py-0.5 font-rubik text-[11px] font-medium"
                                        style={{
                                            color,
                                            borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
                                            backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {hasDetails && (
                            <Collapse open={open}>
                                <ul
                                    className="mt-4 space-y-2 border-t pt-4"
                                    style={{ borderColor: `color-mix(in oklch, ${color} 30%, transparent)` }}
                                >
                                    {event.details!.map((detail) => (
                                        <li key={detail} className="flex gap-3 text-sm text-muted-foreground">
                                            <span
                                                className="mt-[7px] size-1.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: color }}
                                            />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </Collapse>
                        )}
                    </div>
                </GlowCard>
            </div>
        </li>
    );
}

export function TimelineExplorer({ phases, nowMs }: { phases: TimelinePhaseData[]; nowMs: number }) {
    // Status is computed once per render from the server's clock so server and
    // client HTML match exactly (no hydration mismatch).
    const statuses = useMemo(() => {
        const map: Record<string, EventStatus> = {};
        for (const phase of phases) for (const e of phase.events) map[e.id] = getStatus(e, nowMs);
        return map;
    }, [phases, nowMs]);

    // Details start open only for what's happening right now.
    const [open, setOpen] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const phase of phases)
            for (const e of phase.events) initial[e.id] = statuses[e.id] === "now" && e.type === "major";
        return initial;
    });
    const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
    const [milestonesOnly, setMilestonesOnly] = useState(false);

    const activePhase = useActiveSection(useMemo(() => phases.map((p) => p.id), [phases]));

    const setAll = useCallback(
        (value: boolean) => {
            const next: Record<string, boolean> = {};
            for (const phase of phases) for (const e of phase.events) next[e.id] = value;
            setOpen(next);
            if (value) setCollapsedPhases({});
        },
        [phases]
    );
    const allPhasesCollapsed = phases.every((p) => collapsedPhases[p.id]);

    return (
        <div>
            {/* Toolbar: sticky, solid (no backdrop blur: that's what makes
                long pages lag while scrolling). */}
            <div
                className="z-30 -mx-1 mb-10 flex flex-wrap items-center gap-2 rounded-2xl border p-2 shadow-lg lg:sticky lg:top-24 xl:top-4"
                style={{
                    backgroundColor: "color-mix(in oklch, var(--background) 92%, var(--foreground))",
                    borderColor: "color-mix(in oklch, var(--foreground) 14%, transparent)",
                }}
            >
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {phases.map((phase) => {
                        const active = activePhase === phase.id;
                        return (
                            <a
                                key={phase.id}
                                href={`#${phase.id}`}
                                className="rounded-full border px-3 py-1 font-rubik text-xs font-semibold transition-all hover:scale-[1.04]"
                                style={{
                                    color: phase.color,
                                    borderColor: `color-mix(in oklch, ${phase.color} ${active ? 90 : 40}%, transparent)`,
                                    backgroundColor: `color-mix(in oklch, ${phase.color} ${active ? 22 : 8}%, transparent)`,
                                    boxShadow: active ? `0 0 14px -4px ${phase.color}` : undefined,
                                }}
                            >
                                {phase.short}
                            </a>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setMilestonesOnly((v) => !v)}
                        aria-pressed={milestonesOnly}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-rubik text-xs font-semibold transition-colors",
                            milestonesOnly
                                ? "border-[#ffaa00] bg-[#ffaa00]/15 text-[#ffaa00]"
                                : "border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Flag className="size-3.5" /> Milestones only
                    </button>
                    <button
                        type="button"
                        onClick={() => setAll(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-rubik text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ListChecks className="size-3.5" /> Expand all
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setAll(false);
                            setCollapsedPhases(
                                allPhasesCollapsed ? {} : Object.fromEntries(phases.map((p) => [p.id, true]))
                            );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-rubik text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <Layers className="size-3.5" /> {allPhasesCollapsed ? "Open phases" : "Collapse all"}
                    </button>
                </div>
            </div>

            <div className="space-y-16">
                {phases.map((phase) => {
                    const PhaseIcon = TIMELINE_ICONS[phase.icon];
                    const collapsed = !!collapsedPhases[phase.id];
                    const events = milestonesOnly
                        ? phase.events.filter((e) => e.type === "major" || e.special)
                        : phase.events;
                    const done = phase.events.filter((e) => statuses[e.id] === "done").length;
                    const pct = Math.round(progressBetween(phase.start, phase.end, nowMs) * 100);
                    const started = pct > 0;

                    return (
                        <section key={phase.id} id={phase.id} className="tl-phase scroll-mt-28">
                            {/* Phase header */}
                            <div
                                className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
                                style={{
                                    borderColor: `color-mix(in oklch, ${phase.color} 45%, transparent)`,
                                    background: `linear-gradient(135deg, color-mix(in oklch, ${phase.color} 20%, var(--card)) 0%, var(--card) 60%)`,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setCollapsedPhases((c) => ({ ...c, [phase.id]: !c[phase.id] }))}
                                    aria-expanded={!collapsed}
                                    aria-controls={`${phase.id}-events`}
                                    className="flex w-full items-start gap-4 text-left"
                                >
                                    <span
                                        className="grid size-12 shrink-0 place-items-center rounded-xl sm:size-14"
                                        style={{
                                            color: phase.color,
                                            backgroundColor: `color-mix(in oklch, ${phase.color} 18%, transparent)`,
                                            boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${phase.color} 45%, transparent)`,
                                        }}
                                    >
                                        <PhaseIcon className="size-6 sm:size-7" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className="block font-mono text-xs font-semibold uppercase tracking-[0.18em]"
                                            style={{ color: phase.color }}
                                        >
                                            {phase.range}
                                        </span>
                                        <span
                                            className="mt-1 block font-minecraft text-2xl font-bold leading-tight sm:text-3xl"
                                            style={{
                                                color: phase.color,
                                                textShadow: `0 0 18px color-mix(in oklch, ${phase.color} 40%, transparent)`,
                                            }}
                                        >
                                            {phase.title}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        className={cn("mt-2 size-6 shrink-0 transition-transform duration-300", collapsed && "-rotate-90")}
                                        style={{ color: phase.color }}
                                    />
                                </button>

                                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                                    {phase.description}
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className="font-mono text-xs text-muted-foreground">
                                        <span style={{ color: phase.color }}>{phase.events.length}</span> milestones ·{" "}
                                        <span style={{ color: phase.color }}>{done}</span> done
                                    </span>
                                    <div className="flex min-w-[10rem] flex-1 items-center gap-2">
                                        <div
                                            className="h-1.5 flex-1 overflow-hidden rounded-full"
                                            style={{ backgroundColor: `color-mix(in oklch, ${phase.color} 16%, transparent)` }}
                                        >
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: phase.color,
                                                    boxShadow: `0 0 10px ${phase.color}`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-20 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                                            {pct >= 100 ? "Complete" : started ? `${pct}% through` : "Not started"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Collapse open={!collapsed} bleed className="mt-6">
                                <ol id={`${phase.id}-events`}>
                                    {events.map((event, i) => (
                                        <EventRow
                                            key={event.id}
                                            event={event}
                                            color={colorAt(phase.id, phase.events.indexOf(event))}
                                            nextColor={
                                                events[i + 1]
                                                    ? colorAt(phase.id, phase.events.indexOf(events[i + 1]))
                                                    : colorAt(phase.id, phase.events.indexOf(event))
                                            }
                                            first={i === 0}
                                            last={i === events.length - 1}
                                            status={statuses[event.id]}
                                            open={!!open[event.id]}
                                            onToggle={() => setOpen((o) => ({ ...o, [event.id]: !o[event.id] }))}
                                        />
                                    ))}
                                </ol>
                            </Collapse>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

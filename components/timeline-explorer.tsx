"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Check,
    ChevronDown,
    Flag,
    Layers,
    ListChecks,
    RotateCcw,
    Star,
} from "lucide-react";
import { Collapse } from "@/components/collapse";
import { GlowCard } from "@/components/glow-card";
import { TIMELINE_ICONS } from "@/components/timeline-icons";
import { useActiveSection } from "@/lib/use-active-section";
import { cn } from "@/lib/utils";
import {
    CATEGORIES,
    getStatus,
    progressBetween,
    type Category,
    type EventStatus,
    type TimelineEventData,
    type TimelinePhaseData,
} from "@/lib/timeline-data";

// The interactive heart of /timeline. The data is static, so this is
// server-rendered HTML that hydrates into a handful of toggles: per-event
// detail panels, per-phase collapse, expand/collapse all, a milestones-only
// filter and a category legend that filters too. No animation library and no
// per-card listeners beyond GlowCard's throttled CSS-variable spotlight;
// every panel open/close is a CSS grid-rows transition (compositor-friendly,
// no measured heights). Rows are memoized so toggling one card doesn't
// re-render the other forty.

// Marker column geometry. Every row is a 2-column grid: [marker column | card].
// The marker and its rail segment live in the SAME column and are centered on
// the SAME axis (left: 50%), so the icon can never drift off the line, unlike
// the old absolutely-positioned dot with hand-tuned pixel offsets.
const MARKER_CELL = 40; // px: height of the cell the marker is centered in
const MARKER_TOP = 12; // px: gap above that cell, so it lines up with the card header
const MARKER_CENTER = MARKER_TOP + MARKER_CELL / 2;

const STATUS_LABEL: Record<EventStatus, string> = {
    done: "Done",
    now: "Now",
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    planned: "Planned",
};

const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

function StatusBadge({
    status,
    color,
}: {
    status: EventStatus;
    color: string;
}) {
    const isNow = status === "now";
    const muted = status === "done";
    const tone = muted ? "var(--muted-foreground)" : color;
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
            style={{
                color: tone,
                borderColor: `color-mix(in oklch, ${tone} 45%, transparent)`,
                backgroundColor: isNow
                    ? `color-mix(in oklch, ${color} 18%, transparent)`
                    : "transparent",
            }}
        >
            {muted && <Check className="size-3" />}
            {isNow && (
                <span
                    className="dot-blink size-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                />
            )}
            {STATUS_LABEL[status]}
        </span>
    );
}

interface EventRowProps {
    event: TimelineEventData;
    color: string;
    nextColor: string;
    first: boolean;
    last: boolean;
    status: EventStatus;
    open: boolean;
    onToggle: (id: string) => void;
}

const EventRow = memo(function EventRow({
    event,
    color,
    nextColor,
    first,
    last,
    status,
    open,
    onToggle,
}: EventRowProps) {
    const Icon = TIMELINE_ICONS[event.icon];
    const major = event.type === "major";
    const special = !!event.special;
    const hasDetails = !!event.details?.length;
    const dim = status === "upcoming" || status === "planned";
    const markerSize = special ? 40 : major ? 36 : 28;
    const detailsId = `${event.id}-details`;

    const header = (
        <>
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
                            <Star
                                className="size-3 text-[#ffaa00]"
                                fill="#ffaa00"
                            />{" "}
                            Milestone
                        </span>
                    )}
                </span>
                <span
                    className={cn(
                        "mt-2 block font-minecraft font-bold leading-tight",
                        special
                            ? "chroma-text text-xl sm:text-2xl"
                            : major
                              ? "text-lg sm:text-xl"
                              : "text-base sm:text-lg"
                    )}
                    style={
                        special
                            ? undefined
                            : {
                                  color,
                                  textShadow: `0 0 14px color-mix(in oklch, ${color} 35%, transparent)`,
                              }
                    }
                >
                    {event.title}
                </span>
            </span>
            {hasDetails && (
                <ChevronDown
                    className={cn(
                        "mt-1 size-5 shrink-0 transition-transform duration-300",
                        open && "rotate-180"
                    )}
                    style={{ color }}
                />
            )}
        </>
    );

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
                        opacity: dim ? 0.45 : 0.9,
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
                            style={{
                                width: markerSize,
                                height: markerSize,
                                backgroundColor: color,
                            }}
                        />
                    )}
                    <span
                        className={cn(
                            "relative grid place-items-center rounded-full transition-transform duration-200 group-hover/row:scale-110",
                            special && "chroma-marker"
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
                            className={
                                special
                                    ? "size-5"
                                    : major
                                      ? "size-[18px]"
                                      : "size-3.5"
                            }
                            style={special ? { color: "#ffaa00" } : undefined}
                            strokeWidth={2.25}
                        />
                    </span>
                </div>
            </div>

            {/* Card */}
            <div className="pb-6">
                <GlowCard
                    color={color}
                    className={cn(special && "chroma-card")}
                >
                    {hasDetails ? (
                        <button
                            type="button"
                            onClick={() => onToggle(event.id)}
                            aria-expanded={open}
                            aria-controls={detailsId}
                            className="flex w-full items-start justify-between gap-3 p-4 text-left sm:p-5"
                        >
                            {header}
                        </button>
                    ) : (
                        <div className="flex w-full items-start justify-between gap-3 p-4 sm:p-5">
                            {header}
                        </div>
                    )}

                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {event.description}
                        </p>

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
                            <Collapse open={open} id={detailsId}>
                                <ul
                                    className="mt-4 space-y-2 border-t pt-4"
                                    style={{
                                        borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                                    }}
                                >
                                    {event.details!.map((detail) => (
                                        <li
                                            key={detail}
                                            className="flex gap-3 text-sm text-muted-foreground"
                                        >
                                            <span
                                                className="mt-[7px] size-1.5 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor: color,
                                                }}
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
});

export function TimelineExplorer({
    phases,
    nowMs,
}: {
    phases: TimelinePhaseData[];
    nowMs: number;
}) {
    // Status is computed once per render from the server's clock so server and
    // client HTML match exactly (no hydration mismatch).
    const statuses = useMemo(() => {
        const map: Record<string, EventStatus> = {};
        for (const phase of phases)
            for (const e of phase.events) map[e.id] = getStatus(e, nowMs);
        return map;
    }, [phases, nowMs]);

    // Details start open only for the major thing happening right now.
    const [open, setOpen] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const phase of phases)
            for (const e of phase.events)
                initial[e.id] = statuses[e.id] === "now" && e.type === "major";
        return initial;
    });
    const [collapsedPhases, setCollapsedPhases] = useState<
        Record<string, boolean>
    >({});
    const [milestonesOnly, setMilestonesOnly] = useState(false);
    const [hiddenCats, setHiddenCats] = useState<
        Partial<Record<Category, boolean>>
    >({});

    const activePhase = useActiveSection(
        useMemo(() => phases.map((p) => p.id), [phases])
    );

    const categoryCounts = useMemo(() => {
        const counts = {} as Record<Category, number>;
        for (const key of CATEGORY_KEYS) counts[key] = 0;
        for (const phase of phases)
            for (const e of phase.events) counts[e.category]++;
        return counts;
    }, [phases]);

    const filtersActive =
        milestonesOnly || CATEGORY_KEYS.some((k) => hiddenCats[k]);

    const visibleByPhase = useMemo(() => {
        const map: Record<string, TimelineEventData[]> = {};
        for (const phase of phases) {
            map[phase.id] = phase.events.filter(
                (e) =>
                    !hiddenCats[e.category] &&
                    (!milestonesOnly || e.type === "major" || e.special)
            );
        }
        return map;
    }, [phases, milestonesOnly, hiddenCats]);

    const toggleEvent = useCallback(
        (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] })),
        []
    );

    const setAll = useCallback(
        (value: boolean) => {
            const next: Record<string, boolean> = {};
            for (const phase of phases)
                for (const e of phase.events) next[e.id] = value;
            setOpen(next);
            if (value) setCollapsedPhases({});
        },
        [phases]
    );
    const allPhasesCollapsed = phases.every((p) => collapsedPhases[p.id]);

    // Deep links (#hs-7, #smc, …) must work even when the target is inside a
    // collapsed phase, is hidden by a filter, or has its details closed:
    // reveal it first, then scroll once the panels have finished animating.
    const cullingTimer = useRef(0);
    const reveal = useCallback(
        (id: string, smooth: boolean) => {
            const owner = phases.find(
                (p) => p.id === id || p.events.some((e) => e.id === id)
            );
            // Not a phase or event (#overview, #horizons, …): nothing to
            // expand, but it still needs the safe-scroll treatment below,
            // because it sits past the culled phases.
            if (!owner && !document.getElementById(id)) return false;
            if (owner) {
                setCollapsedPhases((c) => ({ ...c, [owner.id]: false }));
                if (owner.id !== id) {
                    setMilestonesOnly(false);
                    setHiddenCats({});
                    setOpen((o) => ({ ...o, [id]: true }));
                }
            }
            // Off-screen phases are skipped with `content-visibility: auto`,
            // so their heights are estimates until they render. A long
            // programmatic scroll crosses them, they render at their real
            // heights, and the target slides out from under the scroll (it
            // landed thousands of pixels off). So: render every phase for the
            // duration of the jump. Once they've all rendered, the browser
            // remembers their true sizes, so turning culling back on
            // afterwards keeps the layout stable.
            const root = document.documentElement;
            root.classList.add("tl-cv-off");
            window.clearTimeout(cullingTimer.current);
            window.setTimeout(() => {
                const target = document.getElementById(id);
                if (target) {
                    // Smooth only for short hops; a multi-screen smooth scroll
                    // is slow and disorienting, so long jumps are instant.
                    const near =
                        Math.abs(target.getBoundingClientRect().top) <
                        window.innerHeight * 3;
                    target.scrollIntoView({
                        behavior: smooth && near ? "smooth" : "auto",
                        block: !owner || owner.id === id ? "start" : "center",
                    });
                }
                cullingTimer.current = window.setTimeout(
                    () => root.classList.remove("tl-cv-off"),
                    1200
                );
            }, 350);
            return true;
        },
        [phases]
    );

    useEffect(() => {
        if (window.location.hash) reveal(window.location.hash.slice(1), false);

        function onClick(event: MouseEvent) {
            const anchor = (event.target as Element | null)?.closest?.(
                "a[href^='#']"
            );
            if (!anchor) return;
            // Not stopping propagation: the nav bubble's own click handler
            // (which closes its panel) must still run.
            if (reveal((anchor.getAttribute("href") ?? "").slice(1), true)) {
                window.history.replaceState(
                    null,
                    "",
                    anchor.getAttribute("href")
                );
            }
        }
        // Back/forward buttons and hand-edited hashes change the URL without a
        // click on any link (and without a mount), so they need their own hook.
        function onHashChange() {
            reveal(window.location.hash.slice(1), true);
        }
        document.addEventListener("click", onClick);
        window.addEventListener("hashchange", onHashChange);
        return () => {
            document.removeEventListener("click", onClick);
            window.removeEventListener("hashchange", onHashChange);
        };
    }, [reveal]);

    const chipBase =
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-rubik text-xs font-semibold transition-colors";

    return (
        <div>
            {/* Toolbar. Solid, no backdrop blur (that's what makes long pages
                lag while scrolling); sticky on desktop only, since on a phone
                it would wrap into a tall block covering the content. */}
            <div
                className="z-30 -mx-1 mb-10 space-y-2 rounded-2xl border p-2 shadow-lg lg:sticky lg:top-24 xl:top-4"
                style={{
                    backgroundColor:
                        "color-mix(in oklch, var(--background) 92%, var(--foreground))",
                    borderColor:
                        "color-mix(in oklch, var(--foreground) 14%, transparent)",
                }}
            >
                <div className="flex flex-wrap items-center gap-2">
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
                                        boxShadow: active
                                            ? `0 0 14px -4px ${phase.color}`
                                            : undefined,
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
                                chipBase,
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
                            className={cn(
                                chipBase,
                                "border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ListChecks className="size-3.5" /> Expand all
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAll(false);
                                setCollapsedPhases(
                                    allPhasesCollapsed
                                        ? {}
                                        : Object.fromEntries(
                                              phases.map((p) => [p.id, true])
                                          )
                                );
                            }}
                            className={cn(
                                chipBase,
                                "border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Layers className="size-3.5" />{" "}
                            {allPhasesCollapsed
                                ? "Open phases"
                                : "Collapse all"}
                        </button>
                    </div>
                </div>

                {/* Legend: what each color means, and a per-category filter. */}
                <div
                    className="flex flex-wrap items-center gap-1.5 border-t pt-2"
                    style={{
                        borderColor:
                            "color-mix(in oklch, var(--foreground) 10%, transparent)",
                    }}
                >
                    {CATEGORY_KEYS.map((key) => {
                        const { label, color } = CATEGORIES[key];
                        const hidden = !!hiddenCats[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={!hidden}
                                onClick={() =>
                                    setHiddenCats((h) => ({
                                        ...h,
                                        [key]: !h[key],
                                    }))
                                }
                                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-rubik text-[11px] font-semibold transition-all"
                                style={{
                                    color: hidden
                                        ? "var(--muted-foreground)"
                                        : color,
                                    borderColor: `color-mix(in oklch, ${hidden ? "var(--muted-foreground)" : color} ${hidden ? 30 : 50}%, transparent)`,
                                    backgroundColor: hidden
                                        ? "transparent"
                                        : `color-mix(in oklch, ${color} 10%, transparent)`,
                                    opacity: hidden ? 0.6 : 1,
                                    textDecoration: hidden
                                        ? "line-through"
                                        : undefined,
                                }}
                            >
                                <span
                                    className="size-2 rounded-full"
                                    style={{
                                        backgroundColor: color,
                                        opacity: hidden ? 0.4 : 1,
                                    }}
                                />
                                {label}
                                <span className="font-mono text-[10px] opacity-70">
                                    {categoryCounts[key]}
                                </span>
                            </button>
                        );
                    })}
                    {filtersActive && (
                        <button
                            type="button"
                            onClick={() => {
                                setMilestonesOnly(false);
                                setHiddenCats({});
                            }}
                            className={cn(
                                chipBase,
                                "ml-auto border-border py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <RotateCcw className="size-3" /> Reset filters
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-16">
                {phases.map((phase) => {
                    const PhaseIcon = TIMELINE_ICONS[phase.icon];
                    const collapsed = !!collapsedPhases[phase.id];
                    const events = visibleByPhase[phase.id];
                    const done = phase.events.filter(
                        (e) => statuses[e.id] === "done"
                    ).length;
                    const pct = Math.round(
                        progressBetween(phase.start, phase.end, nowMs) * 100
                    );

                    return (
                        <section
                            key={phase.id}
                            id={phase.id}
                            className="tl-phase scroll-mt-28"
                        >
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
                                    onClick={() =>
                                        setCollapsedPhases((c) => ({
                                            ...c,
                                            [phase.id]: !c[phase.id],
                                        }))
                                    }
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
                                        className={cn(
                                            "mt-2 size-6 shrink-0 transition-transform duration-300",
                                            collapsed && "-rotate-90"
                                        )}
                                        style={{ color: phase.color }}
                                    />
                                </button>

                                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                                    {phase.description}
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className="font-mono text-xs text-muted-foreground">
                                        <span style={{ color: phase.color }}>
                                            {phase.events.length}
                                        </span>{" "}
                                        milestones ·{" "}
                                        <span style={{ color: phase.color }}>
                                            {done}
                                        </span>{" "}
                                        done
                                    </span>
                                    <div className="flex min-w-[10rem] flex-1 items-center gap-2">
                                        <div
                                            className="h-1.5 flex-1 overflow-hidden rounded-full"
                                            style={{
                                                backgroundColor: `color-mix(in oklch, ${phase.color} 16%, transparent)`,
                                            }}
                                        >
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor:
                                                        phase.color,
                                                    boxShadow: `0 0 10px ${phase.color}`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-20 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                                            {pct >= 100
                                                ? "Complete"
                                                : pct > 0
                                                  ? `${pct}% through`
                                                  : "Not started"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Collapse
                                open={!collapsed}
                                bleed
                                className="mt-6"
                                id={`${phase.id}-events`}
                            >
                                {events.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                                        Nothing in this phase matches the
                                        current filters.
                                    </p>
                                ) : (
                                    <ol>
                                        {events.map((event, i) => (
                                            <EventRow
                                                key={event.id}
                                                event={event}
                                                color={
                                                    CATEGORIES[event.category]
                                                        .color
                                                }
                                                nextColor={
                                                    CATEGORIES[
                                                        (events[i + 1] ?? event)
                                                            .category
                                                    ].color
                                                }
                                                first={i === 0}
                                                last={i === events.length - 1}
                                                status={statuses[event.id]}
                                                open={!!open[event.id]}
                                                onToggle={toggleEvent}
                                            />
                                        ))}
                                    </ol>
                                )}
                            </Collapse>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

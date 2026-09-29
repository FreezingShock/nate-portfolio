"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Star } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";
import {
    JOURNEY_DAYS,
    JOURNEY_END,
    JOURNEY_START,
    daysUntil,
    dayNum,
    ptClock,
    type EventStatus,
} from "@/lib/timeline-data";

// The interactive journey: a year/month axis for the whole Sept 2026 → May
// 2031 stretch, hoverable milestones with liquid-glass tooltips, and live
// clock + progress tickers underneath.
//
// Performance notes: the axis is static (one 60s tick moves the "today"
// marker); the 1-second clock lives in its own small component so only it
// re-renders; the tooltip is a single element (portalled to <body>, since a
// fixed-position tooltip inside the transformed, overflow-hidden card would
// be clipped) that is only mounted while something is hovered or pinned; and
// the glass bars animate with transform/width only.

export interface JourneyMarker {
    id: string;
    title: string;
    when: string;
    start: string;
    description: string;
    tags?: string[];
    color: string;
    categoryLabel: string;
    status: EventStatus;
    special: boolean;
    /** Anchor the tooltip's link jumps to. */
    href: string;
}

export interface JourneyBand {
    id: string;
    short: string;
    color: string;
    start: string;
    end: string;
}

const TZ = "America/Los_Angeles";
const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
});
const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
});
const shortDateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
});
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

// Layout (px). The axis is a fixed-height stack: years, phases, the main line
// with its milestones, then month ticks and letters.
const YEAR_TOP = 0;
const YEAR_H = 26;
const BAND_TOP = 32;
const BAND_H = 26;
const AXIS_Y = 92;
const TICK_TOP = 116;
const TRACK_H = 150;

const posNum = (n: number) =>
    ((n - dayNum(JOURNEY_START)) / JOURNEY_DAYS) * 100;
const pos = (date: string) => posNum(dayNum(date));

function useNow(initial: number, ms: number) {
    const [now, setNow] = useState(initial);
    useEffect(() => {
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(id);
    }, [ms]);
    return now;
}

/** "in 3 months", "2 days ago", "in 4.6 years": short and human. */
function humanize(days: number) {
    const abs = Math.abs(days);
    let text: string;
    if (abs === 0) return "today";
    if (abs < 14) text = `${abs} day${abs === 1 ? "" : "s"}`;
    else if (abs < 60) text = `${Math.round(abs / 7)} weeks`;
    else if (abs < 700) text = `${Math.round(abs / 30.4)} months`;
    else text = `${(abs / 365.25).toFixed(1)} years`;
    return days > 0 ? `in ${text}` : `${text} ago`;
}

// ---------------------------------------------------------------- tooltip

function Tip({
    marker,
    rect,
    pinned,
    now,
    onEnter,
    onLeave,
    onClose,
}: {
    marker: JourneyMarker;
    rect: DOMRect;
    pinned: boolean;
    now: number;
    onEnter: () => void;
    onLeave: () => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [place, setPlace] = useState<{ left: number; top: number } | null>(
        null
    );
    const width = Math.min(340, window.innerWidth - 16);

    // Measure once rendered, then place above the marker (or below if there
    // isn't room), clamped inside the viewport.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const h = el.offsetHeight;
        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
        let top = rect.top - h - 14;
        if (top < 8) top = rect.bottom + 14;
        setPlace({ left, top });
    }, [rect, width, marker.id]);

    const { color, special } = marker;
    const days = daysUntil(marker.start, now);
    const statusText =
        marker.status === "now"
            ? "Happening now"
            : marker.status === "done"
              ? "Completed"
              : humanize(days);

    return createPortal(
        <div
            ref={ref}
            id="journey-tip"
            role="tooltip"
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
            className={cn("fixed z-[60] rounded-[18px]", place && "tl-tip-in")}
            style={{
                left: place?.left ?? -9999,
                top: place?.top ?? 0,
                width,
                visibility: place ? "visible" : "hidden",
                boxShadow: special
                    ? "0 18px 50px -12px rgba(255,170,0,0.45), 0 0 40px -10px rgba(85,255,255,0.4)"
                    : `0 18px 50px -12px color-mix(in oklch, ${color} 55%, transparent)`,
            }}
        >
            <div
                className="liquid-glass relative overflow-hidden rounded-[18px] p-4"
                // The stock liquid-glass blur is tiny (it leans on an SVG
                // distortion), which left whatever was behind the tooltip,
                // like the live clock, readable through the copy. A heavy
                // blur makes it proper frosted glass.
                style={{
                    backdropFilter: "blur(20px) saturate(1.6)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.6)",
                }}
            >
                {/* Dark base under the text. The glass is translucent, so
                    without this the page behind it competes with the copy. */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-background/72"
                />
                {/* themed tint bleeding in from the top-left corner */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background: special
                            ? "radial-gradient(120% 90% at 0% 0%, rgba(255,170,0,0.22), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(85,255,255,0.18), transparent 55%)"
                            : `radial-gradient(120% 90% at 0% 0%, color-mix(in oklch, ${color} 26%, transparent), transparent 60%)`,
                    }}
                />
                <div className="relative">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className="inline-flex items-center gap-1.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color }}
                        >
                            <span
                                className="size-2 rounded-full"
                                style={{
                                    backgroundColor: color,
                                    boxShadow: `0 0 8px ${color}`,
                                }}
                            />
                            {marker.categoryLabel}
                        </span>
                        {special && (
                            <span className="chroma-text inline-flex items-center gap-1 font-minecraft text-[10px] font-bold uppercase tracking-wider">
                                <Star
                                    className="size-3 text-[#ffaa00]"
                                    fill="#ffaa00"
                                />
                                Milestone
                            </span>
                        )}
                        <span
                            className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                                color:
                                    marker.status === "done"
                                        ? "var(--muted-foreground)"
                                        : color,
                                borderColor:
                                    "color-mix(in oklch, currentColor 45%, transparent)",
                            }}
                        >
                            {marker.status === "done" && (
                                <Check className="size-3" />
                            )}
                            {marker.status === "now" && (
                                <span
                                    className="dot-blink size-1.5 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                            )}
                            {statusText}
                        </span>
                    </div>

                    <h4
                        className={cn(
                            "mt-2.5 font-minecraft text-xl font-bold leading-tight",
                            special && "chroma-text"
                        )}
                        style={
                            special
                                ? undefined
                                : {
                                      color,
                                      textShadow: `0 0 16px color-mix(in oklch, ${color} 45%, transparent)`,
                                  }
                        }
                    >
                        {marker.title}
                    </h4>
                    <p
                        className="mt-1 font-mono text-[11px] font-bold uppercase tracking-wider"
                        style={{ color }}
                    >
                        {marker.when}
                    </p>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/80">
                        {marker.description}
                    </p>

                    {marker.tags && marker.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {marker.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border px-2 py-0.5 font-rubik text-[10px] font-medium"
                                    style={{
                                        color,
                                        borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
                                        backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
                                    }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                        <a
                            href={marker.href}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold hover:underline"
                            style={{ color }}
                        >
                            View on the timeline{" "}
                            <ArrowRight className="size-3.5" />
                        </a>
                        {!pinned && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                                click to pin
                            </span>
                        )}
                    </div>
                </div>
                {/* The rim: a border-only layer drawn ON TOP of the glass. (As a
                    background behind the translucent glass it flooded the whole
                    card with rainbow and made the text unreadable.) */}
                <span
                    aria-hidden
                    className={cn("tip-ring", special && "chroma-ring")}
                    style={
                        special
                            ? undefined
                            : {
                                  background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 35%, white), ${color})`,
                              }
                    }
                />
            </div>
        </div>,
        document.body
    );
}

// ------------------------------------------------------------------- axis

function Axis({
    markers,
    bands,
    nowMs,
}: {
    markers: JourneyMarker[];
    bands: JourneyBand[];
    nowMs: number;
}) {
    const now = useNow(nowMs, 60_000);
    const clock = ptClock(now);
    const nowPct = clock.journeyFrac * 100;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<{
        marker: JourneyMarker;
        rect: DOMRect;
        pinned: boolean;
    } | null>(null);
    const hideTimer = useRef(0);

    // Calendar years crossing the journey, and every month tick.
    const years = useMemo(() => {
        const out: { year: number; left: number; width: number }[] = [];
        const y0 = Number(JOURNEY_START.slice(0, 4));
        const y1 = Number(JOURNEY_END.slice(0, 4));
        for (let y = y0; y <= y1; y++) {
            const s = Math.max(dayNum(`${y}-01-01`), dayNum(JOURNEY_START));
            const e = Math.min(
                dayNum(`${y}-12-31`) + 1,
                dayNum(JOURNEY_END) + 1
            );
            out.push({
                year: y,
                left: posNum(s),
                width: posNum(e) - posNum(s),
            });
        }
        return out;
    }, []);
    const months = useMemo(() => {
        const out: {
            key: string;
            left: number;
            mid: number;
            letter: string;
            jan: boolean;
            y: number;
            m: number;
        }[] = [];
        let y = Number(JOURNEY_START.slice(0, 4));
        let m = Number(JOURNEY_START.slice(5, 7));
        const endY = Number(JOURNEY_END.slice(0, 4));
        const endM = Number(JOURNEY_END.slice(5, 7));
        while (y < endY || (y === endY && m <= endM)) {
            const start = dayNum(`${y}-${String(m).padStart(2, "0")}-01`);
            const ny = m === 12 ? y + 1 : y;
            const nm = m === 12 ? 1 : m + 1;
            const next = Math.min(
                dayNum(`${ny}-${String(nm).padStart(2, "0")}-01`),
                dayNum(JOURNEY_END) + 1
            );
            out.push({
                key: `${y}-${m}`,
                left: posNum(start),
                mid: (posNum(start) + posNum(next)) / 2,
                letter: MONTHS[m - 1][0],
                jan: m === 1,
                y,
                m,
            });
            y = ny;
            m = nm;
        }
        return out;
    }, []);

    // Start the (mobile) scroller centered on today.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || el.scrollWidth <= el.clientWidth) return;
        el.scrollLeft = Math.max(
            0,
            (el.scrollWidth * nowPct) / 100 - el.clientWidth / 2
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearHide = () => window.clearTimeout(hideTimer.current);
    const scheduleHide = useCallback(() => {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(
            () => setActive((a) => (a && !a.pinned ? null : a)),
            140
        );
    }, []);
    const show = (marker: JourneyMarker, el: HTMLElement, pinned: boolean) => {
        clearHide();
        setActive({ marker, rect: el.getBoundingClientRect(), pinned });
    };
    const close = useCallback(() => {
        window.clearTimeout(hideTimer.current);
        setActive(null);
    }, []);

    // Unpin on outside click / Escape; hide when the page or scroller moves
    // (a fixed tooltip would otherwise float away from its marker).
    useEffect(() => {
        if (!active) return;
        const onDown = (e: PointerEvent) => {
            const t = e.target as Element | null;
            if (!t?.closest?.("#journey-tip, [data-journey-marker]")) close();
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
        const scroller = scrollRef.current;
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", close, { passive: true });
        window.addEventListener("resize", close);
        scroller?.addEventListener("scroll", close, { passive: true });
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", close);
            window.removeEventListener("resize", close);
            scroller?.removeEventListener("scroll", close);
        };
    }, [active, close]);

    useEffect(() => () => window.clearTimeout(hideTimer.current), []);

    return (
        <>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">
                Swipe to explore ↔
            </p>
            <div
                ref={scrollRef}
                className="-mx-2 overflow-x-auto px-2 pb-2 pt-9 [scrollbar-width:thin]"
            >
                <div
                    className="relative mx-4 min-w-[820px]"
                    style={{ height: TRACK_H }}
                >
                    {/* year bands: the year tickers */}
                    {years.map((y, i) => (
                        <div
                            key={y.year}
                            className="absolute flex items-center justify-center rounded-lg border font-minecraft text-sm font-bold"
                            style={{
                                left: `${y.left}%`,
                                width: `calc(${y.width}% - 3px)`,
                                top: YEAR_TOP,
                                height: YEAR_H,
                                marginLeft: 1.5,
                                color:
                                    y.year === clock.year
                                        ? "var(--mc-aqua)"
                                        : "var(--muted-foreground)",
                                borderColor:
                                    y.year === clock.year
                                        ? "color-mix(in oklch, var(--mc-aqua) 55%, transparent)"
                                        : "color-mix(in oklch, var(--foreground) 14%, transparent)",
                                backgroundColor:
                                    i % 2
                                        ? "color-mix(in oklch, var(--foreground) 6%, transparent)"
                                        : "color-mix(in oklch, var(--foreground) 3%, transparent)",
                                boxShadow:
                                    y.year === clock.year
                                        ? "0 0 14px -4px var(--mc-aqua)"
                                        : undefined,
                            }}
                        >
                            {y.year}
                            {y.width < 12 && (
                                <span className="sr-only"> (partial year)</span>
                            )}
                        </div>
                    ))}

                    {/* year boundary guides */}
                    {years.slice(1).map((y) => (
                        <span
                            key={y.year}
                            aria-hidden
                            className="absolute w-px"
                            style={{
                                left: `${y.left}%`,
                                top: YEAR_H + 2,
                                height: TICK_TOP - YEAR_H + 6,
                                background:
                                    "repeating-linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 22%, transparent) 0 3px, transparent 3px 7px)",
                            }}
                        />
                    ))}

                    {/* phase bands */}
                    {bands.map((b) => (
                        <div
                            key={b.id}
                            className="absolute flex items-center justify-center overflow-hidden rounded-md border px-1 font-minecraft text-[11px] font-bold"
                            title={`${b.short}`}
                            style={{
                                left: `${pos(b.start)}%`,
                                width: `${posNum(dayNum(b.end) + 1) - pos(b.start)}%`,
                                top: BAND_TOP,
                                height: BAND_H,
                                color: b.color,
                                borderColor: `color-mix(in oklch, ${b.color} 60%, transparent)`,
                                background: `linear-gradient(180deg, color-mix(in oklch, ${b.color} 28%, transparent), color-mix(in oklch, ${b.color} 10%, transparent))`,
                                boxShadow: `0 0 14px -6px ${b.color}`,
                                textShadow: `0 0 10px color-mix(in oklch, ${b.color} 50%, transparent)`,
                            }}
                        >
                            <span className="truncate">{b.short}</span>
                        </div>
                    ))}

                    {/* the main line, filled up to today */}
                    <div
                        className="absolute inset-x-0 rounded-full"
                        style={{
                            top: AXIS_Y - 3,
                            height: 6,
                            backgroundColor:
                                "color-mix(in oklch, var(--foreground) 12%, transparent)",
                        }}
                    />
                    <div
                        className="absolute rounded-full"
                        style={{
                            left: 0,
                            width: `${Math.max(nowPct, 0.4)}%`,
                            top: AXIS_Y - 3,
                            height: 6,
                            background:
                                "linear-gradient(90deg, var(--mc-blue), var(--mc-aqua))",
                            boxShadow: "0 0 14px var(--mc-aqua)",
                        }}
                    />

                    {/* month microtickers */}
                    {months.map((mo) => {
                        const current =
                            mo.y === clock.year && mo.m === clock.month;
                        return (
                            <span key={mo.key}>
                                <span
                                    aria-hidden
                                    className="absolute w-px"
                                    style={{
                                        left: `${mo.left}%`,
                                        top: TICK_TOP,
                                        height: mo.jan ? 12 : 7,
                                        backgroundColor: mo.jan
                                            ? "var(--foreground)"
                                            : "color-mix(in oklch, var(--foreground) 35%, transparent)",
                                        opacity: mo.jan ? 0.6 : 1,
                                    }}
                                />
                                <span
                                    aria-hidden
                                    className="absolute -translate-x-1/2 font-mono text-[8px] font-bold leading-none"
                                    style={{
                                        left: `${mo.mid}%`,
                                        top: TICK_TOP + 16,
                                        color: current
                                            ? "var(--mc-aqua)"
                                            : "var(--muted-foreground)",
                                        textShadow: current
                                            ? "0 0 8px var(--mc-aqua)"
                                            : undefined,
                                    }}
                                    title={`${MONTHS[mo.m - 1]} ${mo.y}`}
                                >
                                    {mo.letter}
                                </span>
                            </span>
                        );
                    })}

                    {/* today */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute z-20"
                        style={{
                            left: `${nowPct}%`,
                            top: -30,
                            height: TICK_TOP + 14,
                        }}
                    >
                        <span
                            className="absolute left-0 top-0 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                            style={{
                                // Centered on the marker, except near either end
                                // of the axis, where the pill's edge is pinned to
                                // the marker instead so it can't be cut off.
                                transform:
                                    nowPct < 8
                                        ? "translateX(-12px)"
                                        : nowPct > 92
                                          ? "translateX(calc(-100% + 12px))"
                                          : "translateX(-50%)",
                                color: "var(--mc-aqua)",
                                borderColor:
                                    "color-mix(in oklch, var(--mc-aqua) 60%, transparent)",
                                backgroundColor:
                                    "color-mix(in oklch, var(--mc-aqua) 14%, var(--background))",
                                boxShadow: "0 0 14px -2px var(--mc-aqua)",
                            }}
                        >
                            Today · {shortDateFmt.format(now)}
                        </span>
                        <span
                            className="absolute left-0 w-px -translate-x-1/2"
                            style={{
                                top: 22,
                                bottom: 0,
                                background:
                                    "linear-gradient(to bottom, var(--mc-aqua), transparent)",
                            }}
                        />
                        <span
                            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[var(--mc-aqua)] opacity-50"
                            style={{ left: 0, top: AXIS_Y + 30 }}
                        />
                        <span
                            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[var(--mc-aqua)]"
                            style={{
                                left: 0,
                                top: AXIS_Y + 30,
                                boxShadow: "0 0 12px var(--mc-aqua)",
                            }}
                        />
                    </div>

                    {/* milestones */}
                    {markers.map((m) => {
                        const isActive = active?.marker.id === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                data-journey-marker
                                aria-label={`${m.title}, ${m.when}`}
                                aria-describedby={
                                    isActive ? "journey-tip" : undefined
                                }
                                aria-expanded={isActive}
                                className="group absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none"
                                style={{
                                    left: `${pos(m.start)}%`,
                                    top: AXIS_Y,
                                    zIndex: isActive ? 40 : m.special ? 30 : 10,
                                }}
                                onPointerEnter={(e) => {
                                    if (e.pointerType === "mouse")
                                        show(m, e.currentTarget, false);
                                }}
                                onPointerLeave={(e) => {
                                    if (e.pointerType === "mouse")
                                        scheduleHide();
                                }}
                                onFocus={(e) => show(m, e.currentTarget, false)}
                                onBlur={scheduleHide}
                                onClick={(e) => {
                                    if (isActive && active?.pinned) close();
                                    else show(m, e.currentTarget, true);
                                }}
                            >
                                {m.special ? (
                                    <span className="chroma-marker grid size-[22px] place-items-center rounded-full transition-transform duration-200 group-hover:scale-[1.4] group-focus-visible:scale-[1.4]">
                                        <Star
                                            className="size-3"
                                            style={{ color: "#ffaa00" }}
                                            fill="#ffaa00"
                                        />
                                    </span>
                                ) : (
                                    <span
                                        className="block size-3 rounded-full border-2 border-background transition-transform duration-200 group-hover:scale-[1.6] group-focus-visible:scale-[1.6]"
                                        style={{
                                            backgroundColor: m.color,
                                            boxShadow: `0 0 10px ${m.color}`,
                                            opacity:
                                                m.status === "done" ? 0.6 : 1,
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {active && (
                <Tip
                    marker={active.marker}
                    rect={active.rect}
                    pinned={active.pinned}
                    now={now}
                    onEnter={clearHide}
                    onLeave={scheduleHide}
                    onClose={close}
                />
            )}
        </>
    );
}

// ---------------------------------------------------------------- tickers

function GlassBar({
    label,
    value,
    decimals,
    from,
    to,
    gradient,
    sub,
}: {
    label: string;
    value: number;
    decimals: number;
    from: string;
    to: string;
    /** Overrides the two-stop from→to fill (e.g. a full rainbow). */
    gradient?: string;
    sub: string;
}) {
    const pct = Math.min(100, Math.max(0, value * 100));
    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <span
                    className="font-minecraft text-sm font-bold"
                    style={{ color: to, textShadow: `0 0 12px ${to}55` }}
                >
                    {label}
                </span>
                <span
                    className="font-mono text-lg font-bold tabular-nums"
                    style={{ color: to }}
                >
                    {pct.toFixed(decimals)}
                    <span className="text-xs">%</span>
                </span>
            </div>
            <div className="glass-track mt-1.5 h-4">
                <div
                    className="glass-fill"
                    style={
                        {
                            width: `${Math.max(pct, 1.5)}%`,
                            "--from": from,
                            "--to": to,
                            ...(gradient ? { background: gradient } : {}),
                        } as React.CSSProperties
                    }
                />
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {sub}
            </p>
        </div>
    );
}

function LiveTickers({
    nowMs,
    total,
    done,
}: {
    nowMs: number;
    total: number;
    done: number;
}) {
    const now = useNow(nowMs, 1000);
    const c = ptClock(now);
    const [timeMain, meridiem] = timeFmt.format(now).split(/\s+/);
    const daysLeftYear = c.daysInYear - c.dayOfYear;
    const daysLeftMonth = c.daysInMonth - c.day;
    const secLeft = Math.round((1 - c.dayFrac) * 86400);
    const hLeft = Math.floor(secLeft / 3600);
    const mLeft = Math.floor((secLeft % 3600) / 60);
    const toLaunch = daysUntil(JOURNEY_END, now);

    return (
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {/* Right now */}
            <div
                className="relative overflow-hidden rounded-2xl border p-5 lg:col-span-2"
                style={{
                    borderColor:
                        "color-mix(in oklch, var(--mc-aqua) 40%, transparent)",
                    background:
                        "linear-gradient(140deg, color-mix(in oklch, var(--mc-aqua) 14%, var(--card)), var(--card) 65%)",
                }}
            >
                <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span
                        className="dot-blink size-2 rounded-full bg-[#55ff55]"
                        style={{ boxShadow: "0 0 8px #55ff55" }}
                    />
                    Right now · Pacific Time
                </p>
                <p
                    className="mt-3 font-mono text-5xl font-bold tabular-nums sm:text-6xl"
                    style={{
                        color: "var(--mc-aqua)",
                        textShadow: "0 0 24px rgba(85,255,255,0.45)",
                    }}
                    suppressHydrationWarning
                >
                    {timeMain}
                    <span className="ml-2 text-xl text-muted-foreground sm:text-2xl">
                        {meridiem}
                    </span>
                </p>
                <p
                    className="mt-3 font-minecraft text-lg font-bold leading-tight"
                    style={{
                        color: "var(--mc-gold)",
                        textShadow: "0 0 14px rgba(255,170,0,0.4)",
                    }}
                    suppressHydrationWarning
                >
                    {dateFmt.format(now)}
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Day{" "}
                    <span style={{ color: "var(--mc-aqua)" }}>
                        {c.dayOfYear}
                    </span>{" "}
                    of {c.daysInYear} ·{" "}
                    <span style={{ color: "var(--mc-green)" }}>
                        {toLaunch.toLocaleString("en-US")}
                    </span>{" "}
                    days to launch
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                    <div>
                        <p
                            className="font-mono text-2xl font-bold tabular-nums"
                            style={{ color: "var(--mc-gold)" }}
                        >
                            <NumberTicker value={total} />
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            milestones planned
                        </p>
                    </div>
                    <div>
                        <p
                            className="font-mono text-2xl font-bold tabular-nums"
                            style={{ color: "var(--mc-green)" }}
                        >
                            <NumberTicker value={done} />
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            already done
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress tickers */}
            <div
                className="space-y-4 rounded-2xl border p-5 lg:col-span-3"
                style={{
                    borderColor:
                        "color-mix(in oklch, var(--foreground) 14%, transparent)",
                    background:
                        "linear-gradient(140deg, color-mix(in oklch, var(--mc-light-purple) 8%, var(--card)), var(--card) 70%)",
                }}
            >
                <GlassBar
                    label="Today"
                    value={c.dayFrac}
                    decimals={1}
                    from="#ffff55"
                    to="#ffaa00"
                    sub={`${hLeft}h ${mLeft}m left today`}
                />
                <GlassBar
                    label={MONTHS[c.month - 1]}
                    value={c.monthFrac}
                    decimals={2}
                    from="#55ff55"
                    to="#55ffff"
                    sub={`${daysLeftMonth} days left in ${MONTHS[c.month - 1]}`}
                />
                <GlassBar
                    label={String(c.year)}
                    value={c.yearFrac}
                    decimals={2}
                    from="#5555ff"
                    to="#ff55ff"
                    sub={`${daysLeftYear} days left in ${c.year}`}
                />
                <GlassBar
                    label="The Whole Journey"
                    value={c.journeyFrac}
                    decimals={2}
                    from="#ff5555"
                    to="#55ffff"
                    gradient="linear-gradient(90deg,#ff5555,#ffaa00,#55ff55,#55ffff,#ff55ff)"
                    sub={`${toLaunch.toLocaleString("en-US")} days until May 31, 2031`}
                />
            </div>
        </div>
    );
}

// ------------------------------------------------------------------ export

export function JourneyTracker({
    markers,
    bands,
    nowMs,
    total,
    done,
}: {
    markers: JourneyMarker[];
    bands: JourneyBand[];
    nowMs: number;
    total: number;
    done: number;
}) {
    return (
        <div>
            <div
                className="rounded-2xl border p-5 sm:p-6"
                style={{
                    borderColor:
                        "color-mix(in oklch, var(--mc-green) 40%, transparent)",
                    background:
                        "linear-gradient(140deg, color-mix(in oklch, var(--mc-green) 12%, var(--card)), var(--card) 60%)",
                }}
            >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3
                        className="font-minecraft text-xl font-bold"
                        style={{
                            color: "var(--mc-green)",
                            textShadow: "0 0 16px rgba(85,255,85,0.35)",
                        }}
                    >
                        The Whole Journey
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground">
                        Sept 2026 → May 2031 · hover a marker for details
                    </span>
                </div>
                <Axis markers={markers} bands={bands} nowMs={nowMs} />
            </div>
            <LiveTickers nowMs={nowMs} total={total} done={done} />
        </div>
    );
}

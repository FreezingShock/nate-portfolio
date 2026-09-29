"use client";

import { useEffect, useState } from "react";
import { GlowCard } from "@/components/glow-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { TIMELINE_ICONS } from "@/components/timeline-icons";
import { daysUntil, type TimelineIconName } from "@/lib/timeline-data";
import { cn } from "@/lib/utils";

export interface Countdown {
    label: string;
    sublabel: string;
    /** ISO date the countdown runs to. */
    date: string;
    color: string;
    icon: TimelineIconName;
    special?: boolean;
}

// Live "days to go" cards. The day count is computed in the browser (the page
// itself is statically generated, so a count baked in at build time would be
// stale within a day), starting from the server's value so the first paint
// matches, then refreshing every minute.
export function TimelineCountdowns({
    items,
    nowMs,
}: {
    items: Countdown[];
    nowMs: number;
}) {
    const [now, setNow] = useState(nowMs);
    useEffect(() => {
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="grid gap-4 sm:grid-cols-3">
            {items.map((item) => {
                const days = daysUntil(item.date, now);
                const Icon = TIMELINE_ICONS[item.icon];
                return (
                    <GlowCard
                        key={item.label}
                        color={item.color}
                        className={cn("p-5", item.special && "chroma-card")}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <span
                                className="grid size-10 place-items-center rounded-lg"
                                style={{
                                    color: item.special
                                        ? "#ffaa00"
                                        : item.color,
                                    backgroundColor: `color-mix(in oklch, ${item.special ? "#ffaa00" : item.color} 16%, transparent)`,
                                }}
                            >
                                <Icon className="size-5" />
                            </span>
                            <span
                                className={cn(
                                    "text-right font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
                                    item.special && "chroma-text"
                                )}
                                style={
                                    item.special
                                        ? undefined
                                        : { color: item.color }
                                }
                            >
                                {item.sublabel}
                            </span>
                        </div>
                        <p className="mt-4 font-mono text-5xl font-bold tabular-nums">
                            {days > 0 ? (
                                // The rainbow class (or accent color) goes on the
                                // ticker's own <span>, not a wrapper around it: the
                                // rainbow works by making the text fill transparent
                                // and clipping a gradient to it, and that only paints
                                // when the element holding the text carries the
                                // background. Wrapped, the number rendered invisible.
                                // (NumberTicker also hardcodes text-black/dark:text-white,
                                // which a wrapper's color could never beat.)
                                <NumberTicker
                                    value={days}
                                    className={
                                        item.special ? "chroma-text" : undefined
                                    }
                                    style={
                                        item.special
                                            ? undefined
                                            : { color: item.color }
                                    }
                                />
                            ) : (
                                <span style={{ color: item.color }}>
                                    {days === 0 ? "Today" : "Done"}
                                </span>
                            )}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {days > 0
                                ? days === 1
                                    ? "day until"
                                    : "days until"
                                : days === 0
                                  ? "it's"
                                  : "it happened:"}{" "}
                            <span
                                className="font-minecraft"
                                style={{ color: item.color }}
                            >
                                {item.label}
                            </span>
                        </p>
                    </GlowCard>
                );
            })}
        </div>
    );
}

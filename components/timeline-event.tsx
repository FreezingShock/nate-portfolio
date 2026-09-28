"use client";

import {
    ChevronDown,
    BookOpen,
    GraduationCap,
    Award,
    Zap,
    Rocket,
    CheckCircle,
    Lightbulb,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
    BookOpen,
    GraduationCap,
    Award,
    Zap,
    Rocket,
    CheckCircle,
    Lightbulb,
};

export interface TimelineEventData {
    id: string;
    title: string;
    description: string;
    date: string;
    dateRange?: string;
    type: "major" | "minor";
    phase: "high-school" | "smc" | "cal-poly" | "personal";
    icon?: keyof typeof iconMap;
    color: string;
    tags?: string[];
    details?: string[];
    isCurrent?: boolean;
}

export function TimelineEvent({
    event,
    isExpanded: initialExpanded = false,
}: {
    event: TimelineEventData;
    isExpanded?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const Icon = event.icon ? iconMap[event.icon] : undefined;

    return (
        <div
            className={`relative mb-8 transition-all duration-300 ${
                event.type === "major" ? "ml-4 sm:ml-8" : "ml-0"
            }`}
        >
            {/* Timeline dot and connector */}
            <div className="absolute -left-[22px] top-2 flex flex-col items-center">
                <div
                    className={`flex items-center justify-center rounded-full border-4 transition-all duration-300 ${
                        event.type === "major"
                            ? "size-6 border-background"
                            : "size-4 border-background"
                    }`}
                    style={{
                        backgroundColor: event.color,
                        boxShadow: event.isCurrent
                            ? `0 0 16px ${event.color}80`
                            : "none",
                    }}
                >
                    {event.type === "major" && Icon && (
                        <Icon
                            className="size-3 text-background"
                            strokeWidth={3}
                        />
                    )}
                </div>
            </div>

            {/* Event card */}
            <div
                className={`rounded-lg border transition-all duration-300 ${
                    event.type === "major"
                        ? "border-opacity-60 bg-card/40 p-4 sm:p-6 backdrop-blur-xl"
                        : "border-opacity-40 bg-background/20 p-3 sm:p-4"
                }`}
                style={{
                    borderColor: event.color,
                    backgroundColor:
                        event.type === "major"
                            ? `color-mix(in oklch, ${event.color} 8%, var(--background) 92%)`
                            : `color-mix(in oklch, ${event.color} 4%, var(--background) 96%)`,
                }}
            >
                {/* Current indicator */}
                {event.isCurrent && (
                    <div className="mb-2 inline-block">
                        <span
                            className="rounded-full px-2 py-1 font-rubik text-xs font-medium"
                            style={{
                                color: event.color,
                                backgroundColor: `color-mix(in oklch, ${event.color} 20%, var(--background) 80%)`,
                            }}
                        >
                            ● Now
                        </span>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <p
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: event.color }}
                        >
                            {event.dateRange || event.date}
                        </p>
                        <h3
                            className="mt-2 font-rubik text-base font-bold sm:text-lg"
                            style={{ color: event.color }}
                        >
                            {event.title}
                        </h3>
                    </div>
                    {event.details && event.details.length > 0 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-1 transition-transform duration-300"
                            style={{ color: event.color }}
                        >
                            <ChevronDown
                                className={`size-5 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                    )}
                </div>

                {/* Description */}
                <p className="mt-2 text-sm text-muted-foreground">
                    {event.description}
                </p>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {event.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border px-2 py-0.5 font-rubik text-xs font-medium"
                                style={{
                                    color: event.color,
                                    borderColor: `color-mix(in oklch, ${event.color} 55%, transparent)`,
                                    backgroundColor: `color-mix(in oklch, ${event.color} 15%, var(--background) 60%)`,
                                }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Expandable details */}
                {isExpanded && event.details && event.details.length > 0 && (
                    <div
                        className="mt-4 space-y-2 border-t pt-4"
                        style={{
                            borderColor: `color-mix(in oklch, ${event.color} 30%, transparent)`,
                        }}
                    >
                        {event.details.map((detail, idx) => (
                            <div
                                key={idx}
                                className="flex gap-3 text-sm text-muted-foreground"
                            >
                                <span
                                    className="mt-1 inline-block size-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: event.color }}
                                />
                                <span>{detail}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

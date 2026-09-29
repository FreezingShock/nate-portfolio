"use client";

import { memo, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ABOUT_ICONS } from "@/components/about-icons";
import { Collapse } from "@/components/collapse";
import { GlowCard } from "@/components/glow-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";
import { gameFacts, gameSystems, type GameSystem } from "@/lib/about-data";

// Fractured Islands' architecture: the headline numbers, then the four
// interlocking systems, each opening to its parts.

const SystemCard = memo(function SystemCard({
    system,
    open,
    onToggle,
}: {
    system: GameSystem;
    open: boolean;
    onToggle: (id: string) => void;
}) {
    const Icon = ABOUT_ICONS[system.icon];
    const { color } = system;
    const panelId = `${system.id}-parts`;

    return (
        <GlowCard color={color} className="h-full">
            <button
                type="button"
                onClick={() => onToggle(system.id)}
                aria-expanded={open}
                aria-controls={panelId}
                className="flex w-full items-start gap-3 p-5 text-left"
            >
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
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span
                            className="font-minecraft text-lg font-bold leading-tight"
                            style={{
                                color,
                                textShadow: `0 0 14px color-mix(in oklch, ${color} 40%, transparent)`,
                            }}
                        >
                            {system.name}
                        </span>
                        {system.priority && (
                            <span
                                className="rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
                                style={{
                                    color,
                                    borderColor: `color-mix(in oklch, ${color} 50%, transparent)`,
                                }}
                            >
                                Build #{system.priority}
                            </span>
                        )}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                        {system.description}
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        "mt-1 size-5 shrink-0 transition-transform duration-300",
                        open && "rotate-180"
                    )}
                    style={{ color }}
                />
            </button>

            <Collapse open={open} id={panelId}>
                <ul
                    className="mx-5 mb-5 space-y-2.5 border-t pt-4"
                    style={{
                        borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                    }}
                >
                    {system.parts.map((part) => (
                        <li
                            key={part.name}
                            className="text-[13px] leading-relaxed"
                        >
                            <span
                                className="font-minecraft font-bold"
                                style={{ color }}
                            >
                                {part.name}
                            </span>
                            <span className="text-muted-foreground">
                                {" "}
                                · {part.description}
                            </span>
                        </li>
                    ))}
                </ul>
            </Collapse>
        </GlowCard>
    );
});

export function SystemsExplorer() {
    const [open, setOpen] = useState<Record<string, boolean>>({
        menu: true,
    });
    const toggle = useCallback(
        (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] })),
        []
    );

    return (
        <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gameFacts.map((f) => (
                    <GlowCard
                        key={f.label}
                        color={f.color}
                        className="p-4 text-center"
                    >
                        <p
                            className="font-mono text-4xl font-bold tabular-nums"
                            style={{ color: f.color }}
                        >
                            <NumberTicker
                                value={f.value}
                                style={{ color: f.color }}
                            />
                            {f.suffix}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase leading-snug tracking-wider text-muted-foreground">
                            {f.label}
                        </p>
                    </GlowCard>
                ))}
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                <span
                    className="font-minecraft"
                    style={{ color: "var(--mc-gold)" }}
                >
                    Fractured Islands: Ascension
                </span>{" "}
                is a solo-built Roblox progression game. Its architecture
                separates concerns across four interconnected systems, each
                modular and testable on its own. Open any one to see its parts.
            </p>

            <div className="mt-5 grid items-start gap-4 sm:grid-cols-2">
                {gameSystems.map((system) => (
                    <SystemCard
                        key={system.id}
                        system={system}
                        open={!!open[system.id]}
                        onToggle={toggle}
                    />
                ))}
            </div>

            <Link
                href="/creations/fractured-islands"
                className="mt-6 inline-flex items-center gap-1.5 font-minecraft text-sm font-bold hover:underline"
                style={{ color: "var(--mc-light-purple)" }}
            >
                See the full project <ArrowRight className="size-4" />
            </Link>
        </div>
    );
}

"use client";

import { cn } from "@/lib/utils";

export interface FilterChip {
    key: string;
    label: string;
    color: string;
    count: number;
}

// Single-select filter row: an "All" chip plus one colored chip per group,
// each showing how many items it holds. Same look as the timeline's legend,
// so every filter on the site reads the same way.
export function FilterChips({
    chips,
    active,
    onChange,
    total,
    label = "All",
}: {
    chips: FilterChip[];
    /** Active chip key, or null for "All". */
    active: string | null;
    onChange: (key: string | null) => void;
    total: number;
    label?: string;
}) {
    const base =
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-rubik text-xs font-semibold transition-all";
    return (
        <div className="flex flex-wrap items-center gap-1.5" role="group">
            <button
                type="button"
                aria-pressed={active === null}
                onClick={() => onChange(null)}
                className={cn(
                    base,
                    active === null
                        ? "border-foreground/60 bg-foreground/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                )}
            >
                {label}
                <span className="font-mono text-[10px] opacity-70">
                    {total}
                </span>
            </button>
            {chips.map((chip) => {
                const on = active === chip.key;
                return (
                    <button
                        key={chip.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange(on ? null : chip.key)}
                        className={cn(base, "hover:scale-[1.04]")}
                        style={{
                            color: chip.color,
                            borderColor: `color-mix(in oklch, ${chip.color} ${on ? 90 : 40}%, transparent)`,
                            backgroundColor: `color-mix(in oklch, ${chip.color} ${on ? 22 : 8}%, transparent)`,
                            boxShadow: on
                                ? `0 0 14px -4px ${chip.color}`
                                : undefined,
                            opacity: active && !on ? 0.55 : 1,
                        }}
                    >
                        <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: chip.color }}
                        />
                        {chip.label}
                        <span className="font-mono text-[10px] opacity-70">
                            {chip.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

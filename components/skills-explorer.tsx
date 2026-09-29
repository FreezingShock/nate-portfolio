"use client";

import { memo, useMemo, useState } from "react";
import { ArrowDownWideNarrow } from "lucide-react";
import { ABOUT_ICONS } from "@/components/about-icons";
import { FilterChips, type FilterChip } from "@/components/filter-chips";
import { GlowCard } from "@/components/glow-card";
import { cn } from "@/lib/utils";
import {
    LEVELS,
    SKILL_CATEGORIES,
    skills,
    type Skill,
    type SkillCategory,
} from "@/lib/about-data";

// Skills by domain: filter by category, sort by level, and every card shows
// its description right away (the old version hid it behind hover, which a
// phone doesn't have). Plain CSS cards and no animation library, replacing the
// per-card framer-motion hover/tap springs.

const SkillCard = memo(function SkillCard({ skill }: { skill: Skill }) {
    const Icon = ABOUT_ICONS[skill.icon];
    const { color } = SKILL_CATEGORIES[skill.category];
    const level = LEVELS[skill.level - 1];

    return (
        <GlowCard color={color} className="h-full p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4
                        className="font-minecraft text-base font-bold leading-tight"
                        style={{
                            color,
                            textShadow: `0 0 12px color-mix(in oklch, ${color} 35%, transparent)`,
                        }}
                    >
                        {skill.name}
                    </h4>
                    <p
                        className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
                        style={{ color: level.color }}
                    >
                        {level.label}
                    </p>
                </div>
                <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg"
                    style={{
                        color,
                        backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
                    }}
                >
                    <Icon className="size-[18px]" />
                </span>
            </div>

            {/* Five-pip level meter, glowing where earned. */}
            <div
                className="mt-3 flex gap-1"
                role="img"
                aria-label={`${level.label}, level ${skill.level} of 5`}
            >
                {Array.from({ length: 5 }).map((_, i) => (
                    <span
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={
                            i < skill.level
                                ? {
                                      backgroundColor: color,
                                      boxShadow: `0 0 8px -1px ${color}`,
                                  }
                                : {
                                      backgroundColor:
                                          "color-mix(in oklch, var(--foreground) 12%, transparent)",
                                  }
                        }
                    />
                ))}
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {skill.description}
            </p>
        </GlowCard>
    );
});

export function SkillsExplorer() {
    const [category, setCategory] = useState<string | null>(null);
    const [byLevel, setByLevel] = useState(false);

    const chips: FilterChip[] = useMemo(
        () =>
            (Object.keys(SKILL_CATEGORIES) as SkillCategory[]).map((key) => ({
                key,
                label: SKILL_CATEGORIES[key].label,
                color: SKILL_CATEGORIES[key].color,
                count: skills.filter((s) => s.category === key).length,
            })),
        []
    );

    const visible = useMemo(() => {
        const list = category
            ? skills.filter((s) => s.category === category)
            : skills;
        return byLevel ? [...list].sort((a, b) => b.level - a.level) : list;
    }, [category, byLevel]);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <FilterChips
                    chips={chips}
                    active={category}
                    onChange={setCategory}
                    total={skills.length}
                />
                <button
                    type="button"
                    aria-pressed={byLevel}
                    onClick={() => setByLevel((v) => !v)}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-rubik text-xs font-semibold transition-colors",
                        byLevel
                            ? "border-[var(--mc-aqua)] bg-[var(--mc-aqua)]/15 text-[var(--mc-aqua)]"
                            : "border-border text-muted-foreground hover:text-foreground"
                    )}
                >
                    <ArrowDownWideNarrow className="size-3.5" /> Sort by level
                </button>
            </div>

            {/* Level legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {LEVELS.map((l, i) => (
                    <span
                        key={l.label}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                        <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: l.color }}
                        />
                        {i + 1} · {l.label}
                    </span>
                ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((skill) => (
                    <SkillCard key={skill.name} skill={skill} />
                ))}
            </div>
        </div>
    );
}

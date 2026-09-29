"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ListChecks, Layers } from "lucide-react";
import { Collapse } from "@/components/collapse";
import { FilterChips, type FilterChip } from "@/components/filter-chips";
import { GlowCard } from "@/components/glow-card";
import { STUDY_ICONS } from "@/components/study-icons";
import { cn } from "@/lib/utils";
import { STUDY_AREAS, type Course, type StudyArea } from "@/lib/studies-data";

// The senior-year class list: filter by area, open a class for its goals and
// materials right in place, or jump to its own page. Unlike the old grid,
// nothing important is hover-only (tags and actions used to appear only on
// hover, which doesn't exist on a phone), and the cards are plain CSS
// GlowCards instead of backdrop-blurred MagicCards.

const CourseCard = memo(function CourseCard({
    course,
    open,
    onToggle,
}: {
    course: Course;
    open: boolean;
    onToggle: (slug: string) => void;
}) {
    const Icon = STUDY_ICONS[course.icon];
    const area = STUDY_AREAS[course.area];
    const { color } = course;
    const panelId = `${course.slug}-panel`;

    return (
        <GlowCard color={color} className="flex h-full flex-col">
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                    <span
                        className="grid size-12 place-items-center rounded-xl"
                        style={{
                            color,
                            backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
                            boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 40%, transparent)`,
                        }}
                    >
                        <Icon className="size-6" />
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {course.ap && (
                            <span
                                className="rounded-full border px-2 py-0.5 font-rubik text-[10px] font-bold uppercase tracking-wider"
                                style={{
                                    color: "var(--mc-red)",
                                    borderColor:
                                        "color-mix(in oklch, var(--mc-red) 50%, transparent)",
                                    backgroundColor:
                                        "color-mix(in oklch, var(--mc-red) 12%, transparent)",
                                }}
                            >
                                AP
                            </span>
                        )}
                        <span
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                                color,
                                borderColor: `color-mix(in oklch, ${color} 50%, transparent)`,
                                backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
                            }}
                        >
                            <span
                                className="dot-blink size-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            {course.status}
                        </span>
                    </div>
                </div>

                <p
                    className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: area.color }}
                >
                    {area.label}
                </p>
                <h3
                    className="mt-1 font-minecraft text-xl font-bold leading-tight"
                    style={{
                        color,
                        textShadow: `0 0 14px color-mix(in oklch, ${color} 40%, transparent)`,
                    }}
                >
                    {course.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {course.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                    {course.focus.slice(0, 4).map((item) => (
                        <span
                            key={item}
                            className="rounded-full border px-2 py-0.5 font-rubik text-[11px] font-medium"
                            style={{
                                color,
                                borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
                                backgroundColor: `color-mix(in oklch, ${color} 9%, transparent)`,
                            }}
                        >
                            {item}
                        </span>
                    ))}
                </div>

                <div className="flex-1" />

                <button
                    type="button"
                    onClick={() => onToggle(course.slug)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="mt-5 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left font-rubik text-sm font-semibold transition-colors"
                    style={{
                        color,
                        borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
                        backgroundColor: `color-mix(in oklch, ${color} ${open ? 16 : 8}%, transparent)`,
                    }}
                >
                    Goals & materials
                    <ChevronDown
                        className={cn(
                            "size-4 transition-transform duration-300",
                            open && "rotate-180"
                        )}
                    />
                </button>

                <Collapse open={open} id={panelId}>
                    <div className="space-y-4 pt-4">
                        <div>
                            <p
                                className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                                style={{ color }}
                            >
                                Learning goals
                            </p>
                            <ul className="mt-2 space-y-1.5">
                                {course.goals.map((goal) => (
                                    <li
                                        key={goal}
                                        className="flex gap-2.5 text-[13px] text-muted-foreground"
                                    >
                                        <span
                                            className="mt-[7px] size-1.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: color }}
                                        />
                                        {goal}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p
                                className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                                style={{ color }}
                            >
                                Work & materials
                            </p>
                            <ul className="mt-2 space-y-1.5">
                                {course.materials.map((m) => (
                                    <li
                                        key={m}
                                        className="flex gap-2.5 text-[13px] text-muted-foreground"
                                    >
                                        <span
                                            className="mt-[7px] size-1.5 shrink-0 rounded-full opacity-60"
                                            style={{ backgroundColor: color }}
                                        />
                                        {m}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Link
                            href={`/studies/${course.slug}`}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold hover:underline"
                            style={{ color }}
                        >
                            Open the class page{" "}
                            <ArrowRight className="size-3.5" />
                        </Link>
                    </div>
                </Collapse>
            </div>
        </GlowCard>
    );
});

export function CourseExplorer({ courses }: { courses: Course[] }) {
    const [area, setArea] = useState<string | null>(null);
    const [open, setOpen] = useState<Record<string, boolean>>({});

    const chips: FilterChip[] = useMemo(
        () =>
            (Object.keys(STUDY_AREAS) as StudyArea[]).map((key) => ({
                key,
                label: STUDY_AREAS[key].label,
                color: STUDY_AREAS[key].color,
                count: courses.filter((c) => c.area === key).length,
            })),
        [courses]
    );
    const visible = area ? courses.filter((c) => c.area === area) : courses;

    const toggle = useCallback(
        (slug: string) => setOpen((o) => ({ ...o, [slug]: !o[slug] })),
        []
    );
    const setAll = (value: boolean) =>
        setOpen(Object.fromEntries(courses.map((c) => [c.slug, value])));
    const anyOpen = visible.some((c) => open[c.slug]);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <FilterChips
                    chips={chips}
                    active={area}
                    onChange={setArea}
                    total={courses.length}
                />
                <button
                    type="button"
                    onClick={() => setAll(!anyOpen)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-rubik text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                    {anyOpen ? (
                        <>
                            <Layers className="size-3.5" /> Collapse all
                        </>
                    ) : (
                        <>
                            <ListChecks className="size-3.5" /> Expand all
                        </>
                    )}
                </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((course) => (
                    <CourseCard
                        key={course.slug}
                        course={course}
                        open={!!open[course.slug]}
                        onToggle={toggle}
                    />
                ))}
            </div>
        </div>
    );
}

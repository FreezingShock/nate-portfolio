import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PageBackground } from "@/components/page-background";
import { SidebarNav } from "@/components/sidebar-nav";
import { GlowCard } from "@/components/glow-card";
import { GlassBar } from "@/components/glass-bar";
import { STUDY_ICONS } from "@/components/study-icons";
import {
    AP_WINDOW,
    STUDY_AREAS,
    courseBySlug,
    courses,
} from "@/lib/studies-data";
import {
    CATEGORIES,
    KEY_DATES,
    allEvents,
    daysUntil,
    phases,
    progressBetween,
} from "@/lib/timeline-data";

export const revalidate = 3600;

export async function generateStaticParams() {
    return courses.map((c) => ({ slug: c.slug }));
}

export default async function CourseDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const course = courseBySlug[slug];
    if (!course) notFound();

    const nowMs = Date.now();
    const Icon = STUDY_ICONS[course.icon];
    const area = STUDY_AREAS[course.area];
    const { color } = course;

    const index = courses.findIndex((c) => c.slug === slug);
    const prev = courses[(index - 1 + courses.length) % courses.length];
    const next = courses[(index + 1) % courses.length];

    const events = allEvents();
    const related = course.related
        .map((id) => events.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => !!e);

    const hs = phases.find((p) => p.id === "high-school")!;
    const courseProgress = progressBetween(
        hs.start,
        KEY_DATES.graduation,
        nowMs
    );
    const daysToExam = daysUntil(AP_WINDOW.start, nowMs);

    const facts = [
        { label: "Timeline", value: course.timeline },
        { label: "Area", value: area.label, valueColor: area.color },
        {
            label: course.ap ? "AP exam window" : "Status",
            value: course.ap ? AP_WINDOW.label : course.status,
            valueColor: color,
        },
    ];

    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="interactive-grid" color={color} />
            <SidebarNav
                sections={[
                    { id: "detail", label: course.title },
                    { id: "goals", label: "Goals & Materials" },
                    ...(related.length
                        ? [{ id: "related", label: "On the Timeline" }]
                        : []),
                ]}
            />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-4xl">
                    <Link
                        href="/studies"
                        className="-my-2 inline-flex items-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-3.5" /> Back to Studies
                    </Link>

                    <div className="mt-8">
                        <PageHero
                            eyebrow={course.ap ? "AP Course" : "Course"}
                            title={course.title}
                            description={course.fullDescription}
                            accent={color}
                            symbol="wisdom"
                        />
                    </div>

                    {/* Quick facts */}
                    <div
                        id="detail"
                        className="mt-10 grid gap-4 scroll-mt-24 sm:grid-cols-3"
                    >
                        {facts.map((f) => (
                            <GlowCard
                                key={f.label}
                                color={color}
                                className="p-5"
                            >
                                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    {f.label}
                                </p>
                                <p
                                    className="mt-2 font-minecraft text-base font-bold leading-snug"
                                    style={{
                                        color:
                                            f.valueColor ?? "var(--foreground)",
                                    }}
                                >
                                    {f.value}
                                </p>
                            </GlowCard>
                        ))}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <GlowCard color={color} className="p-5 sm:col-span-2">
                            <GlassBar
                                label="Through the school year"
                                value={courseProgress}
                                decimals={0}
                                from={color}
                                to={color}
                                sub="Sept 2026 → June 10, 2027"
                            />
                        </GlowCard>
                        {course.ap ? (
                            <GlowCard
                                color="var(--mc-gold)"
                                className="chroma-card p-5 text-center"
                            >
                                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Days to the AP window
                                </p>
                                <p className="chroma-text mt-1 font-mono text-4xl font-bold tabular-nums">
                                    {daysToExam > 0 ? daysToExam : "Now"}
                                </p>
                            </GlowCard>
                        ) : (
                            <GlowCard
                                color={color}
                                className="grid place-items-center p-5"
                            >
                                <span
                                    className="grid size-14 place-items-center rounded-2xl"
                                    style={{
                                        color,
                                        backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
                                        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 40%, transparent)`,
                                    }}
                                >
                                    <Icon className="size-7" />
                                </span>
                            </GlowCard>
                        )}
                    </div>

                    {/* Focus + goals + materials */}
                    <div
                        id="goals"
                        className="mt-10 grid gap-5 scroll-mt-24 md:grid-cols-2"
                    >
                        <GlowCard color={color} className="p-6">
                            <h3
                                className="font-minecraft text-lg font-bold"
                                style={{ color }}
                            >
                                Key Focus Areas
                            </h3>
                            <ul className="mt-4 space-y-2.5">
                                {course.focus.map((item) => (
                                    <li
                                        key={item}
                                        className="flex gap-3 text-sm text-muted-foreground"
                                    >
                                        <span
                                            className="mt-[7px] size-1.5 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: color,
                                                boxShadow: `0 0 8px ${color}`,
                                            }}
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </GlowCard>

                        <GlowCard color={color} className="p-6">
                            <h3
                                className="font-minecraft text-lg font-bold"
                                style={{ color }}
                            >
                                Learning Goals
                            </h3>
                            <ul className="mt-4 space-y-2.5">
                                {course.goals.map((goal) => (
                                    <li
                                        key={goal}
                                        className="flex gap-3 text-sm text-muted-foreground"
                                    >
                                        <Check
                                            className="mt-0.5 size-4 shrink-0"
                                            style={{ color }}
                                        />
                                        {goal}
                                    </li>
                                ))}
                            </ul>
                        </GlowCard>

                        <GlowCard color={color} className="p-6 md:col-span-2">
                            <h3
                                className="font-minecraft text-lg font-bold"
                                style={{ color }}
                            >
                                Work & Materials
                            </h3>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {course.materials.map((m) => (
                                    <div
                                        key={m}
                                        className="rounded-lg border px-3 py-2.5 text-sm text-muted-foreground"
                                        style={{
                                            borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                                            backgroundColor: `color-mix(in oklch, ${color} 6%, transparent)`,
                                        }}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 flex flex-wrap gap-1.5">
                                {course.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border px-2.5 py-0.5 font-rubik text-[11px] font-medium"
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
                        </GlowCard>
                    </div>

                    {/* Where this class shows up on the timeline */}
                    {related.length > 0 && (
                        <div id="related" className="mt-12 scroll-mt-24">
                            <h3
                                className="font-minecraft text-xl font-bold"
                                style={{ color: "var(--mc-green)" }}
                            >
                                On the Timeline
                            </h3>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {related.map((e) => {
                                    const c = e.special
                                        ? "var(--mc-gold)"
                                        : CATEGORIES[e.category].color;
                                    return (
                                        <Link
                                            key={e.id}
                                            href={`/timeline#${e.id}`}
                                            className="group block"
                                        >
                                            <GlowCard
                                                color={c}
                                                className="flex items-center gap-3 p-4"
                                            >
                                                <span
                                                    className="size-2.5 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor: c,
                                                        boxShadow: `0 0 10px ${c}`,
                                                    }}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span
                                                        className="block font-mono text-[10px] font-semibold uppercase tracking-wider"
                                                        style={{ color: c }}
                                                    >
                                                        {e.when}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-sm font-semibold">
                                                        {e.title}
                                                    </span>
                                                </span>
                                                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
                                            </GlowCard>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Previous / next class */}
                    <div className="mt-14 grid gap-4 sm:grid-cols-2">
                        {[
                            { c: prev, dir: "Previous class", arrow: "left" },
                            { c: next, dir: "Next class", arrow: "right" },
                        ].map(({ c, dir, arrow }) => (
                            <Link
                                key={dir}
                                href={`/studies/${c.slug}`}
                                className="group block"
                            >
                                <GlowCard
                                    color={c.color}
                                    className="flex items-center justify-between gap-3 p-4"
                                >
                                    {arrow === "left" && (
                                        <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-1" />
                                    )}
                                    <span
                                        className={`min-w-0 flex-1 ${arrow === "left" ? "text-right" : ""}`}
                                    >
                                        <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {dir}
                                        </span>
                                        <span
                                            className="mt-0.5 block truncate font-minecraft text-sm font-bold"
                                            style={{ color: c.color }}
                                        >
                                            {c.title}
                                        </span>
                                    </span>
                                    {arrow === "right" && (
                                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
                                    )}
                                </GlowCard>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

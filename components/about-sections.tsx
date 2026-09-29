import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { GlassBar } from "@/components/glass-bar";
import { GlowCard } from "@/components/glow-card";
import { McSymbol } from "@/components/mc-symbol";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ABOUT_ICONS } from "@/components/about-icons";
import {
    beliefs,
    building,
    designPrinciples,
    runningPlan,
    runningStats,
} from "@/lib/about-data";
import { READING_STATUS, readingQueue } from "@/lib/studies-data";
import {
    KEY_DATES,
    daysUntil,
    phases,
    progressBetween,
} from "@/lib/timeline-data";

// Static sections of /about. Server components: rendered once to HTML, with
// only GlowCard's tiny hover spotlight shipped as client code.

const glowText = (color: string) => ({
    color,
    textShadow: `0 0 14px color-mix(in oklch, ${color} 40%, transparent)`,
});

function kw(color: string, text: string) {
    return (
        <span
            className="mc-glow font-minecraft font-bold"
            style={{ ["--glow" as string]: color }}
        >
            {text}
        </span>
    );
}

export function AboutStory({ nowMs }: { nowMs: number }) {
    const daysToGrad = daysUntil(KEY_DATES.graduation, nowMs);
    const facts = [
        {
            icon: "GraduationCap" as const,
            value: "Class of 2027",
            label: "Senior year",
            color: "var(--mc-yellow)",
        },
        {
            icon: "Footprints" as const,
            value: "4 years",
            label: "Running competitively",
            color: "var(--mc-green)",
        },
        {
            icon: "Globe" as const,
            value: "SoCal",
            label: "Home, for good",
            color: "var(--mc-aqua)",
        },
    ];

    return (
        <div className="space-y-5">
            <GlowCard color="var(--mc-dark-aqua)" className="p-6 sm:p-8">
                <div className="space-y-4 text-base leading-relaxed">
                    <p className="text-foreground">
                        I&apos;m{" "}
                        <span className="chroma-text inline-block font-minecraft font-bold">
                            Nate
                        </span>
                        , a senior in high school in Southern California
                        studying toward a degree in{" "}
                        {kw("var(--mc-green)", "Environmental Engineering")}. I
                        build games, render systems, and design spaces, always
                        with an eye toward sustainable, interconnected systems.
                    </p>
                    <p className="text-muted-foreground">
                        I think through{" "}
                        {kw("var(--mc-light-purple)", "philosophy")}{" "}
                        (Kierkegaard&apos;s ethics, agnosticism, interconnected
                        systems), execute through{" "}
                        {kw("var(--mc-gold)", "discipline")} (competitive
                        running, strength training, precision), and create
                        through {kw("var(--mc-aqua)", "systems thinking")} (game
                        mechanics, urban design, code architecture).
                    </p>
                    <p className="text-muted-foreground">
                        By Spring 2031, my goal: launch a{" "}
                        {kw(
                            "var(--mc-green)",
                            "sustainable infrastructure/urban design business"
                        )}{" "}
                        after completing my degree at Cal Poly Pomona, with
                        financial freedom and athletic leadership woven through
                        the journey.
                    </p>
                </div>
            </GlowCard>

            <div className="grid gap-4 sm:grid-cols-4">
                {facts.map((f) => {
                    const Icon = ABOUT_ICONS[f.icon];
                    return (
                        <GlowCard
                            key={f.label}
                            color={f.color}
                            className="flex items-center gap-3 p-4"
                        >
                            <span
                                className="grid size-10 shrink-0 place-items-center rounded-lg"
                                style={{
                                    color: f.color,
                                    backgroundColor: `color-mix(in oklch, ${f.color} 16%, transparent)`,
                                }}
                            >
                                <Icon className="size-5" />
                            </span>
                            <span className="min-w-0">
                                <span
                                    className="block font-minecraft text-base font-bold leading-tight"
                                    style={glowText(f.color)}
                                >
                                    {f.value}
                                </span>
                                <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {f.label}
                                </span>
                            </span>
                        </GlowCard>
                    );
                })}
                <GlowCard
                    color="var(--mc-gold)"
                    className="chroma-card flex items-center gap-3 p-4"
                >
                    <span className="min-w-0">
                        <span className="chroma-text block font-mono text-3xl font-bold tabular-nums">
                            {daysToGrad > 0 ? (
                                <NumberTicker
                                    value={daysToGrad}
                                    className="chroma-text"
                                />
                            ) : (
                                "Done"
                            )}
                        </span>
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            days to graduation
                        </span>
                    </span>
                </GlowCard>
            </div>
        </div>
    );
}

export function BuildingCards() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {building.map((item) => (
                <Link key={item.title} href={item.href} className="group block">
                    <GlowCard
                        color={item.color}
                        className="flex h-full flex-col p-5"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span
                                className="text-3xl"
                                style={{ color: item.color }}
                            >
                                <McSymbol name="forge" color={item.color} />
                            </span>
                            <span
                                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
                                style={{
                                    color: item.color,
                                    borderColor: `color-mix(in oklch, ${item.color} 50%, transparent)`,
                                    backgroundColor: `color-mix(in oklch, ${item.color} 12%, transparent)`,
                                }}
                            >
                                <span
                                    className="dot-blink size-1.5 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                {item.status}
                            </span>
                        </div>
                        <h4
                            className="mt-3 font-minecraft text-lg font-bold leading-tight"
                            style={glowText(item.color)}
                        >
                            {item.title}
                        </h4>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {item.description}
                        </p>
                        <span
                            className="mt-4 inline-flex items-center gap-1 font-mono text-xs font-bold"
                            style={{ color: item.color }}
                        >
                            {item.cta}
                            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                        </span>
                    </GlowCard>
                </Link>
            ))}
        </div>
    );
}

// Marker geometry (same idea as the timeline rail): marker and rail segment
// share one column and one center axis, so they can't drift apart.
const RAIL_TOP = 14;
const RAIL_SIZE = 20;
const RAIL_CENTER = RAIL_TOP + RAIL_SIZE / 2;

export function RunningSection() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {runningStats.map((s) => (
                    <GlowCard key={s.label} color={s.color} className="p-5">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {s.label}
                        </p>
                        <p
                            className="mt-2 font-minecraft text-3xl font-bold"
                            style={glowText(s.color)}
                        >
                            {s.value}
                        </p>
                    </GlowCard>
                ))}
            </div>

            <GlowCard
                color="var(--mc-green)"
                className="flex items-center gap-3 p-4"
            >
                <Star
                    className="size-5 shrink-0"
                    style={{ color: "var(--mc-green)" }}
                    fill="var(--mc-green)"
                />
                <p className="text-sm text-muted-foreground">
                    <span
                        className="font-minecraft font-bold"
                        style={{ color: "var(--mc-green)" }}
                    >
                        Exceeds Santa Monica College&apos;s recruiting standards
                    </span>{" "}
                    on the recruited-athlete path into college running.
                </p>
            </GlowCard>

            <div>
                <h4
                    className="font-minecraft text-xl font-bold"
                    style={{ color: "var(--mc-yellow)" }}
                >
                    The Running Plan
                </h4>
                <ol className="mt-4">
                    {runningPlan.map((step, i) => {
                        const first = i === 0;
                        const last = i === runningPlan.length - 1;
                        const next = runningPlan[i + 1];
                        return (
                            <li
                                key={step.title}
                                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3"
                            >
                                <div className="relative">
                                    <span
                                        aria-hidden
                                        className="absolute left-1/2 w-[3px] -translate-x-1/2 rounded-full"
                                        style={{
                                            top: first ? RAIL_CENTER : 0,
                                            bottom: last
                                                ? `calc(100% - ${RAIL_CENTER}px)`
                                                : 0,
                                            background: `linear-gradient(to bottom, ${step.color}, ${next?.color ?? step.color})`,
                                            opacity: 0.85,
                                        }}
                                    />
                                    <span
                                        aria-hidden
                                        className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-background"
                                        style={{
                                            top: RAIL_TOP,
                                            width: RAIL_SIZE,
                                            height: RAIL_SIZE,
                                            backgroundColor: step.color,
                                            boxShadow: `0 0 12px ${step.color}`,
                                        }}
                                    />
                                </div>
                                <div className="pb-4">
                                    <Link
                                        href={step.href}
                                        className="group block"
                                    >
                                        <GlowCard
                                            color={step.color}
                                            className="p-4"
                                        >
                                            <p
                                                className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                                                style={{ color: step.color }}
                                            >
                                                {step.when}
                                            </p>
                                            <p
                                                className="mt-1 font-minecraft text-base font-bold"
                                                style={{ color: step.color }}
                                            >
                                                {step.title}
                                            </p>
                                            <p className="mt-1 text-[13px] text-muted-foreground">
                                                {step.detail}
                                            </p>
                                        </GlowCard>
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>

            <GlowCard color="var(--mc-gold)" className="p-5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Training philosophy
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Consistent training, mental resilience and continuous
                    improvement. Cross country has shaped my discipline and
                    leadership, qualities I bring to all areas of work. Racing
                    as a recruited athlete through college (SMC to Cal Poly
                    Pomona) is part of my long-term vision.
                </p>
            </GlowCard>
        </div>
    );
}

export function PhilosophySection() {
    const books = readingQueue.filter((r) => r.author);
    return (
        <div className="space-y-8">
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Philosophy shapes how I build.{" "}
                {kw("var(--mc-light-purple)", "Kierkegaard")} informs
                authenticity and ethical choice.{" "}
                {kw("var(--mc-aqua)", "Agnosticism and Egg Theory")} ground my
                systems thinking in humility and interconnection.
            </p>

            <div>
                <h4
                    className="font-minecraft text-xl font-bold"
                    style={{ color: "var(--mc-aqua)" }}
                >
                    Core Beliefs
                </h4>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {beliefs.map((b) => (
                        <GlowCard key={b.title} color={b.color} className="p-5">
                            <h5
                                className="font-minecraft text-lg font-bold"
                                style={glowText(b.color)}
                            >
                                {b.title}
                            </h5>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {b.description}
                            </p>
                        </GlowCard>
                    ))}
                </div>
            </div>

            <div>
                <h4
                    className="font-minecraft text-xl font-bold"
                    style={{ color: "var(--mc-light-purple)" }}
                >
                    What &ldquo;Authentic&rdquo; Design Means
                </h4>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {designPrinciples.map((p, i) => (
                        <GlowCard key={p.title} color={p.color} className="p-5">
                            <p
                                className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                                style={{ color: p.color }}
                            >
                                Principle {i + 1}
                            </p>
                            <h5
                                className="mt-1 font-minecraft text-lg font-bold leading-tight"
                                style={glowText(p.color)}
                            >
                                {p.title}
                            </h5>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {p.description}
                            </p>
                        </GlowCard>
                    ))}
                </div>
            </div>

            <div>
                <h4
                    className="font-minecraft text-xl font-bold"
                    style={{ color: "var(--mc-yellow)" }}
                >
                    On the Shelf
                </h4>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {books.map((b) => {
                        const st = READING_STATUS[b.status];
                        return (
                            <GlowCard
                                key={b.title}
                                color={st.color}
                                className="p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h5
                                            className="font-minecraft text-base font-bold leading-tight"
                                            style={{ color: st.color }}
                                        >
                                            {b.title}
                                        </h5>
                                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                            {b.author}
                                        </p>
                                    </div>
                                    <span
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold uppercase tracking-wider"
                                        style={{
                                            color: st.color,
                                            borderColor: `color-mix(in oklch, ${st.color} 50%, transparent)`,
                                        }}
                                    >
                                        {b.status === "reading" && (
                                            <span
                                                className="dot-blink size-1.5 rounded-full"
                                                style={{
                                                    backgroundColor: st.color,
                                                }}
                                            />
                                        )}
                                        {st.label}
                                    </span>
                                </div>
                                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                                    {b.note}
                                </p>
                            </GlowCard>
                        );
                    })}
                </div>
                <Link
                    href="/studies#reading"
                    className="mt-4 inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                    The full reading queue <ArrowRight className="size-3.5" />
                </Link>
            </div>
        </div>
    );
}

// Replaces the old EducationTimeline, which duplicated the Timeline page with
// its own (stale) copy of the plan. This reads the same dates and progress as
// /timeline and links there for the detail.
export function PathGlance({ nowMs }: { nowMs: number }) {
    const stages = phases.filter((p) => p.id !== "personal");
    return (
        <div>
            <div className="grid gap-4 md:grid-cols-3">
                {stages.map((p) => {
                    const progress = progressBetween(p.start, p.end, nowMs);
                    return (
                        <Link
                            key={p.id}
                            href={`/timeline#${p.id}`}
                            className="group block"
                        >
                            <GlowCard color={p.color} className="h-full p-5">
                                <p
                                    className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
                                    style={{ color: p.color }}
                                >
                                    {p.range}
                                </p>
                                <h4
                                    className="mt-1 font-minecraft text-lg font-bold leading-tight"
                                    style={glowText(p.color)}
                                >
                                    {p.title}
                                </h4>
                                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                                    {p.description}
                                </p>
                                <div className="mt-4">
                                    <GlassBar
                                        label="Progress"
                                        value={progress}
                                        decimals={0}
                                        from={p.color}
                                        to={p.color}
                                        height="h-3"
                                    />
                                </div>
                                <span
                                    className="mt-3 inline-flex items-center gap-1 font-mono text-xs font-bold"
                                    style={{ color: p.color }}
                                >
                                    On the timeline
                                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                                </span>
                            </GlowCard>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

import { Star } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { SectionLabel } from "@/components/section-label";
import { GlowCard } from "@/components/glow-card";
import { TimelineOverview } from "@/components/timeline-overview";
import { TimelineExplorer } from "@/components/timeline-explorer";
import { phases } from "@/lib/timeline-data";

// Statically generated and re-checked hourly: statuses ("done" / "now" /
// "upcoming") and progress are computed from real dates at render time, so
// the page moves forward on its own as time passes, with no edits needed.
export const revalidate = 3600;

const HORIZONS = [
    {
        title: "Environmental Engineering Firm",
        when: "Early career",
        description:
            "2–3 years with a leading sustainable infrastructure firm. Build the professional network and real-world project experience.",
        color: "var(--mc-dark-green)",
    },
    {
        title: "Thought Leadership",
        when: "Mid-career",
        description:
            "Write on philosophy and engineering, speak at conferences, and position as a voice for authentic, ethical design.",
        color: "var(--mc-light-purple)",
    },
    {
        title: "Independent Practice",
        when: "Long-term",
        description:
            "Founder of a design-focused sustainability consultancy, applying systems thinking to complex environmental challenges.",
        color: "var(--mc-gold)",
    },
    {
        title: "Fractured Islands Impact",
        when: "Ongoing",
        description:
            "Grow Fractured Islands to 100K+ active players and prove games can teach systems thinking at scale.",
        color: "var(--mc-blue)",
    },
];

export default function TimelinePage() {
    // One clock reading shared by every component, so the server-rendered
    // HTML and the client hydration agree exactly.
    const nowMs = Date.now();

    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="grid" color="#55ff55" />
            <SidebarNav
                sections={[
                    { id: "overview", label: "Overview" },
                    { id: "high-school", label: "Senior Year" },
                    { id: "smc", label: "Santa Monica College" },
                    { id: "cal-poly", label: "Cal Poly Pomona" },
                    { id: "personal", label: "Personal Studies" },
                    { id: "horizons", label: "Future Horizons" },
                ]}
            />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Journey"
                    title="Timeline"
                    description="The complete pathway from senior year to a 2031 launch, with real dates, live countdowns and every milestone in between. Where I am, and where I'm heading."
                    accent="var(--mc-green)"
                    symbol="arrow"
                />

                <div className="mx-auto mt-14 max-w-5xl">
                    <section id="overview" className="scroll-mt-24">
                        <TimelineOverview nowMs={nowMs} />
                    </section>

                    <div className="mt-20">
                        <TimelineExplorer phases={phases} nowMs={nowMs} />
                    </div>

                    <section
                        id="horizons"
                        className="mt-24 scroll-mt-24 border-t border-border/40 pt-16"
                    >
                        <SectionLabel accent="var(--mc-gold)" symbol="comet">
                            Future Horizons
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            After the BS in Civil Engineering (2031): a
                            trajectory toward impact in environmental
                            infrastructure, sustainable design and systems
                            thinking applied to real-world challenges.
                        </p>

                        {/* tl-phase: skips rendering (and the rainbow animation) while
                            off-screen; its padding/negative margin cancel out. */}
                        <div className="tl-phase">
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                {/* The finish line of the whole plan: rainbow, like the other
                                super-special milestones. */}
                                <GlowCard
                                    color="var(--mc-gold)"
                                    className="chroma-card p-5 sm:col-span-2 sm:p-6"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className="font-mono text-[11px] font-bold uppercase tracking-wider"
                                            style={{ color: "var(--mc-gold)" }}
                                        >
                                            Spring 2031
                                        </span>
                                        <span className="chroma-text inline-flex items-center gap-1 font-minecraft text-[10px] font-bold uppercase tracking-wider">
                                            <Star
                                                className="size-3 text-[#ffaa00]"
                                                fill="#ffaa00"
                                            />{" "}
                                            Milestone
                                        </span>
                                    </div>
                                    <h3 className="chroma-text mt-2 font-minecraft text-2xl font-bold sm:text-3xl">
                                        Launch
                                    </h3>
                                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                                        The point the whole plan builds toward:
                                        launching a sustainable infrastructure
                                        and urban design business or project,
                                        backed by an engineering degree, an
                                        executed portfolio, proven athletic
                                        leadership and a network of mentors.
                                    </p>
                                </GlowCard>

                                {HORIZONS.map((goal) => (
                                    <GlowCard
                                        key={goal.title}
                                        color={goal.color}
                                        className="p-5"
                                    >
                                        <p
                                            className="font-mono text-[11px] font-bold uppercase tracking-wider"
                                            style={{ color: goal.color }}
                                        >
                                            {goal.when}
                                        </p>
                                        <h3
                                            className="mt-1 font-minecraft text-lg font-bold"
                                            style={{
                                                color: goal.color,
                                                textShadow: `0 0 14px color-mix(in oklch, ${goal.color} 35%, transparent)`,
                                            }}
                                        >
                                            {goal.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                            {goal.description}
                                        </p>
                                    </GlowCard>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
}

export const metadata = { title: "Timeline" };

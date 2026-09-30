import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { SectionLabel } from "@/components/section-label";
import {
    AboutStory,
    BuildingCards,
    PathGlance,
    PhilosophySection,
    RunningSection,
} from "@/components/about-sections";
import { SystemsExplorer } from "@/components/systems-explorer";
import { SkillsExplorer } from "@/components/skills-explorer";

// Statically generated, refreshed hourly: the days-to-graduation figure and
// the path progress bars come from real dates at render time.
export const revalidate = 3600;

export default function AboutPage() {
    // One clock reading shared by every component, so server HTML and client
    // hydration agree exactly.
    const nowMs = Date.now();

    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="particles" color="#00aaaa" />
            <SidebarNav
                sections={[
                    { id: "hero", label: "Who I Am" },
                    { id: "building", label: "What I'm Building" },
                    { id: "running", label: "Running & Athletics" },
                    { id: "roblox", label: "Fractured Islands" },
                    { id: "philosophy", label: "Philosophy" },
                    { id: "skills", label: "Skills" },
                    { id: "timeline", label: "The Path" },
                ]}
            />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="About"
                    title="Who I Am"
                    description="Engineer, builder, runner, systems thinker. This page is the comprehensive story: how the parts connect."
                    accent="var(--mc-dark-aqua)"
                    symbol="speed"
                />

                <div className="mx-auto mt-12 max-w-6xl">
                    <section id="hero" className="scroll-mt-24">
                        <AboutStory nowMs={nowMs} />
                    </section>

                    <section id="building" className="mt-20 scroll-mt-24">
                        <SectionLabel accent="var(--mc-gold)" symbol="forge">
                            What I&apos;m Building Now
                        </SectionLabel>
                        <div className="mt-6">
                            <BuildingCards />
                        </div>
                    </section>

                    <section id="running" className="mt-20 scroll-mt-24">
                        <SectionLabel accent="var(--mc-gold)" symbol="speed">
                            Running & Athletics
                        </SectionLabel>
                        <div className="mt-6">
                            <RunningSection />
                        </div>
                    </section>

                    <section id="roblox" className="mt-20 scroll-mt-24">
                        <SectionLabel
                            accent="var(--mc-light-purple)"
                            symbol="pristine"
                        >
                            Fractured Islands: System Design
                        </SectionLabel>
                        <div className="mt-6">
                            <SystemsExplorer />
                        </div>
                    </section>

                    <section id="philosophy" className="mt-20 scroll-mt-24">
                        <SectionLabel
                            accent="var(--mc-light-purple)"
                            symbol="wisdom"
                        >
                            Philosophy & Thinking
                        </SectionLabel>
                        <div className="mt-6">
                            <PhilosophySection />
                        </div>
                    </section>

                    <section id="skills" className="mt-20 scroll-mt-24">
                        <SectionLabel
                            accent="var(--mc-aqua)"
                            symbol="magicFind"
                        >
                            Skills & Expertise
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Skills organized by domain. Each reflects hands-on
                            experience and active development.
                        </p>
                        <div className="mt-6">
                            <SkillsExplorer />
                        </div>
                    </section>

                    <section id="timeline" className="mt-20 scroll-mt-24">
                        <SectionLabel accent="var(--mc-gold)" symbol="arrow">
                            The Path
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Four years, three stages, one destination. The full
                            plan, with every milestone, lives on the timeline.
                        </p>
                        <div className="mt-6">
                            <PathGlance nowMs={nowMs} />
                        </div>
                    </section>

                    <div className="mt-20 rounded-2xl border border-mc-gold/30 bg-gradient-to-r from-mc-gold/10 to-transparent p-6 sm:p-8">
                        <h3 className="font-minecraft text-lg font-bold text-mc-gold">
                            What&apos;s Next
                        </h3>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            This page is a living document. Each section will
                            deepen as projects launch, the portfolio grows, and
                            plans materialize. To see the work in progress:
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {[
                                {
                                    href: "/creations#projects",
                                    label: "View Projects",
                                    color: "var(--mc-gold)",
                                },
                                {
                                    href: "/blog",
                                    label: "Read Essays",
                                    color: "var(--mc-aqua)",
                                },
                                {
                                    href: "/timeline",
                                    label: "Full Timeline",
                                    color: "var(--mc-green)",
                                },
                            ].map((l) => (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-minecraft text-sm font-bold transition-transform hover:-translate-y-0.5"
                                    style={{
                                        color: l.color,
                                        borderColor: `color-mix(in oklch, ${l.color} 45%, transparent)`,
                                        backgroundColor: `color-mix(in oklch, ${l.color} 9%, transparent)`,
                                    }}
                                >
                                    {l.label} <ArrowRight className="size-4" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export const metadata = { title: "About" };

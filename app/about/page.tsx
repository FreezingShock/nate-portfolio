import Link from "next/link"
import { PageHero } from "@/components/page-hero"
import { SidebarNav } from "@/components/sidebar-nav"
import { PageBackground } from "@/components/page-background"
import { SectionLabel } from "@/components/section-label"
import { ShineBorder } from "@/components/ui/shine-border"
import { RunningStatsCard } from "@/components/running-stats-card"
import { RobloxBreakdown } from "@/components/roblox-breakdown"
import { PhilosophyCard } from "@/components/philosophy-card"
import { EducationTimeline } from "@/components/education-timeline"
import { SkillsTree } from "@/components/skills-tree"

export default function AboutPage() {
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
                    { id: "timeline", label: "Education" },
                ]}
            />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                {/* Hero Section */}
                <div id="hero" className="scroll-mt-24">
                    <PageHero
                        eyebrow="About"
                        title="Who I Am"
                        description="Engineer, builder, runner, systems thinker. This page is the comprehensive story—how the parts connect."
                        accent="var(--mc-dark-aqua)"
                    />

                    <div className="relative mx-auto mt-12 max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur-xl scroll-mt-24">
                        <ShineBorder
                            borderWidth={1}
                            duration={12}
                            shineColor={["var(--mc-dark-aqua)", "var(--chart-4)"]}
                        />
                        <div className="space-y-4 text-base leading-relaxed">
                            <p className="text-foreground">
                                I'm <span className="text-mc-light-purple font-minecraft font-bold">Nate</span>, a senior in high school in Southern California studying toward a degree in <span className="text-mc-green font-minecraft font-bold">Environmental Engineering</span>. I build games, render systems, and design spaces—always with an eye toward sustainable, interconnected systems.
                            </p>
                            <p className="text-muted-foreground">
                                I think through <span className="text-mc-lightpurple font-minecraft font-bold">philosophy</span> (Kierkegaard's ethics, agnosticism, interconnected systems), execute through <span className="text-mc-gold font-minecraft font-bold">discipline</span> (competitive running, strength training, precision), and create through <span className="text-mc-aqua font-minecraft font-bold">systems thinking</span> (game mechanics, urban design, code architecture).
                            </p>
                            <p className="text-muted-foreground">
                                By Spring 2031, my goal: launch a <span className="text-mc-green font-minecraft font-bold">sustainable infrastructure/urban design business</span> after completing my degree at Cal Poly Pomona, with financial freedom and athletic leadership woven through the journey.
                            </p>
                        </div>
                    </div>
                </div>

                {/* What I'm Building Now */}
                <div id="building" className="scroll-mt-24 mt-16">
                    <SectionLabel accent="var(--mc-gold)">What I'm Building Now</SectionLabel>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                title: "Fractured Islands: Ascension",
                                desc: "Roblox game in active development. Stat systems, attribute mechanics, engagement loops.",
                                color: "#ff55ff",
                                emoji: "🎮"
                            },
                            {
                                title: "Personal Portfolio",
                                desc: "This site — a living project. Renovation studies, design work, creations across mediums.",
                                color: "#55ffff",
                                emoji: "🌐"
                            },
                            {
                                title: "Engineering Foundation",
                                desc: "College pathway through SMC → Cal Poly. Environmental specialization, capstone focus.",
                                color: "#55ff55",
                                emoji: "⚙️"
                            }
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="rounded-lg border p-4 transition-all hover:border-opacity-70"
                                style={{
                                    borderColor: `${item.color}40`,
                                    backgroundColor: `${item.color}08`,
                                }}
                            >
                                <div className="text-2xl mb-2">{item.emoji}</div>
                                <h4 className="font-minecraft font-bold text-sm" style={{ color: item.color }}>
                                    {item.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-2">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Running & Athletics */}
                <div id="running" className="scroll-mt-24 mt-16">
                    <SectionLabel accent="var(--mc-gold)">Running & Athletics</SectionLabel>
                    <div className="mt-6">
                        <RunningStatsCard />
                    </div>
                </div>

                {/* Fractured Islands System Design */}
                <div id="roblox" className="scroll-mt-24 mt-16">
                    <SectionLabel accent="var(--mc-lightpurple)">Fractured Islands: System Design</SectionLabel>
                    <div className="mt-6">
                        <RobloxBreakdown />
                    </div>
                </div>

                {/* Philosophy */}
                <div id="philosophy" className="scroll-mt-24 mt-16">
                    <SectionLabel accent="var(--mc-lightpurple)">Philosophy & Thinking</SectionLabel>
                    <div className="mt-6">
                        <PhilosophyCard />
                    </div>
                </div>

                {/* Skills */}
                <div id="skills" className="scroll-mt-24 mt-16">
                    <SectionLabel accent="var(--mc-aqua)">Skills & Expertise</SectionLabel>
                    <div className="mt-6">
                        <SkillsTree />
                    </div>
                </div>

                {/* Education Timeline */}
                <div id="timeline" className="scroll-mt-24 mt-16">
                    <SectionLabel accent="var(--mc-gold)">4-Year Education & Career Path</SectionLabel>
                    <div className="mt-6">
                        <EducationTimeline />
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-16 rounded-lg border border-mc-gold/30 bg-gradient-to-r from-mc-gold/10 to-transparent p-6 sm:p-8">
                    <h3 className="font-minecraft text-lg font-bold text-mc-gold">What's Next</h3>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        This page is a living document. Each section will deepen as projects launch, portfolio grows, and plans materialize. To see the work in progress:
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href="/creations#projects"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-mc-gold/40 text-mc-gold hover:bg-mc-gold/10 transition-colors font-minecraft text-sm font-bold"
                        >
                            → View Projects
                        </Link>
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-mc-aqua/40 text-mc-aqua hover:bg-mc-aqua/10 transition-colors font-minecraft text-sm font-bold"
                        >
                            → Read Essays
                        </Link>
                        <Link
                            href="/timeline"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-mc-green/40 text-mc-green hover:bg-mc-green/10 transition-colors font-minecraft text-sm font-bold"
                        >
                            → Full Timeline
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { SectionLabel } from "@/components/section-label";
import { StudiesOverview } from "@/components/studies-overview";
import { CourseExplorer } from "@/components/course-explorer";
import {
    PathwayRail,
    ProgramCardView,
    ReadingQueue,
    ToolRoadmap,
} from "@/components/studies-sections";
import { courses, personalStudies } from "@/lib/studies-data";

// Statically generated, refreshed hourly: progress bars and countdown starting
// values are computed from real dates at render time, so the page keeps
// moving forward on its own.
export const revalidate = 3600;

export default function StudiesPage() {
    // One clock reading shared by every component, so server HTML and client
    // hydration agree exactly.
    const nowMs = Date.now();

    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="grid" color="#5555ff" />
            <SidebarNav
                sections={[
                    { id: "overview", label: "The School Year" },
                    { id: "classes", label: "Senior Year Classes" },
                    { id: "pathway", label: "Education Pathway" },
                    { id: "personal", label: "Personal Studies" },
                    { id: "reading", label: "Reading Queue" },
                    { id: "tools", label: "Tools Roadmap" },
                ]}
            />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Learning"
                    title="Studies"
                    description="The complete educational pathway: this year's classes, the community college transfer, university specialization, and the independent research running alongside all of it. Systems thinking across technical, creative and philosophical work."
                    accent="var(--mc-blue)"
                    symbol="wisdom"
                />

                <div className="mx-auto mt-14 max-w-6xl">
                    <section id="overview" className="scroll-mt-24">
                        <StudiesOverview nowMs={nowMs} />
                    </section>

                    <section id="classes" className="mt-20 scroll-mt-24">
                        <SectionLabel
                            accent="var(--mc-blue)"
                            symbol="intelligence"
                        >
                            Senior Year Classes
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Six interdisciplinary classes building toward
                            environmental engineering and systems thinking.
                            Filter by area, and open any class for its goals and
                            materials.
                        </p>
                        <div className="mt-6">
                            <CourseExplorer courses={courses} />
                        </div>
                    </section>

                    <section id="pathway" className="mt-24 scroll-mt-24">
                        <SectionLabel accent="var(--mc-aqua)" symbol="defense">
                            Education Pathway
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            From high school through Santa Monica College to Cal
                            Poly Pomona and a 2031 degree, with live progress
                            through each stage.
                        </p>
                        <div className="mt-8">
                            <PathwayRail nowMs={nowMs} />
                        </div>
                    </section>

                    <section id="personal" className="mt-16 scroll-mt-24">
                        <SectionLabel
                            accent="var(--mc-light-purple)"
                            symbol="wisdom"
                        >
                            Personal Studies
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Self-directed learning alongside formal coursework:
                            philosophy, sustainable systems and design practice.
                            These areas inform and deepen all of the academic
                            work.
                        </p>
                        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {personalStudies.map((p) => (
                                <ProgramCardView key={p.title} program={p} />
                            ))}
                        </div>
                    </section>

                    <section id="reading" className="mt-20 scroll-mt-24">
                        <SectionLabel
                            accent="var(--mc-yellow)"
                            symbol="intelligence"
                        >
                            Reading Queue
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            What&apos;s on the shelf, in the order it&apos;s
                            getting read.
                        </p>
                        <div className="mt-6">
                            <ReadingQueue />
                        </div>
                    </section>

                    <section id="tools" className="mt-20 scroll-mt-24">
                        <SectionLabel
                            accent="var(--mc-gold)"
                            symbol="magicFind"
                        >
                            Tools Roadmap
                        </SectionLabel>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            The design and engineering toolset, in the order it
                            gets learned: SketchUp, then Revit and AutoCAD, then
                            Civil 3D.
                        </p>
                        <div className="mt-6">
                            <ToolRoadmap />
                        </div>
                    </section>

                    <div className="mt-20 flex flex-wrap gap-3">
                        {[
                            {
                                href: "/timeline",
                                label: "Full Timeline",
                                color: "var(--mc-green)",
                            },
                            {
                                href: "/about",
                                label: "About Me",
                                color: "var(--mc-dark-aqua)",
                            },
                            {
                                href: "/creations",
                                label: "See the Work",
                                color: "var(--mc-aqua)",
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
            </section>
        </div>
    );
}

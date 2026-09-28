import { Gamepad2, Axis3D, Boxes, Paintbrush, Feather } from "lucide-react";
import { getProjects, getRecentRenovations } from "@/lib/content";
import { WorkGrid } from "@/components/work-grid";
import { ComingSoon } from "@/components/coming-soon";
import { PageHero } from "@/components/page-hero";
import { SectionLabel } from "@/components/section-label";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";

export const revalidate = 60;

// Consolidated hub for everything Nate makes — used to be three separate
// Dock destinations (Projects, Renovations, Creations). One long page with
// anchored sections keeps the Dock to a single icon while still giving each
// category its own header, color accent, and grid.
export default async function CreationsPage() {
    const [projects, renovations] = await Promise.all([
        getProjects(),
        getRecentRenovations(),
    ]);

    return (
        <div className="pointer-events-none min-h-screen">
            <PageBackground variant="grid" color="#55ffff" />
            <SidebarNav
                sections={[
                    {
                        id: "projects",
                        label: "Projects",
                        items: projects.map((p) => ({
                            href: `/creations/${p.slug}`,
                            label: p.title,
                            // Matches the aqua title color that project's own
                            // /creations/[slug] page renders — the nav entry
                            // looks like the file it points to.
                            color: "var(--mc-aqua)",
                        })),
                    },
                    {
                        id: "renovations",
                        label: "Renovations",
                        items: renovations.map((r) => ({
                            href: `/creations/${r.slug}`,
                            label: r.title,
                            color: "var(--mc-gold)",
                        })),
                    },
                    { id: "artwork", label: "Artwork" },
                ]}
            />
            {/* pointer-events-none here is what actually makes the fixed
                interactive-grid background hoverable: without it, this
                w-full section — not just its visible text/cards, its whole
                box — sits in front of the -z-10 background in hit-testing
                terms and swallows every pointer event across the entire
                page, whether or not anything is visibly drawn at that
                point. MagicCard (used by every card below) explicitly
                re-enables pointer-events-auto on itself since its own
                hover-spotlight effect needs real pointer events; links
                inside cards work the same way through the card. */}
            <section className="pointer-events-none w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Made"
                    title="Creations"
                    symbol="forge"
                    description="Everything Nate builds — games and software, real-place renovation studies, and the creative practice around both."
                />

                <div id="projects" className="mx-auto mt-14 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-aqua)" symbol="magicFind">Projects</SectionLabel>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        Games and software — solo-built, systems-driven, shipped and
                        in-progress.
                    </p>
                    <div className="mt-6">
                        <WorkGrid projects={projects} icon={Gamepad2} accentColor="var(--mc-aqua)" />
                    </div>
                </div>

                <div id="renovations" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-gold)" symbol="forge">Renovations</SectionLabel>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        Studying and reimagining real places — measured, modeled, and
                        redesigned to be greener and more inviting.
                    </p>
                    <div className="mt-6">
                        <WorkGrid projects={renovations} icon={Axis3D} accentColor="var(--mc-gold)" />
                    </div>
                </div>

                <div id="artwork" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-light-purple)" symbol="flower">Artwork</SectionLabel>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        Blender renders, drawing, poetry — the creative practice around
                        the engineering.
                    </p>
                    <div className="mt-6">
                        <ComingSoon
                            accentColor="var(--mc-light-purple)"
                            cards={[
                                {
                                    title: "Blender renders",
                                    note: "Renovation studies and 3D renders will live here.",
                                    icon: Boxes,
                                },
                                {
                                    title: "Drawing",
                                    note: "Sketches and illustration work.",
                                    icon: Paintbrush,
                                },
                                {
                                    title: "Poetry",
                                    note: "Writing that doesn't fit the blog.",
                                    icon: Feather,
                                },
                            ]}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

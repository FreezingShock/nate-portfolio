import { FolderKanban, Hammer, Boxes, Paintbrush, Feather } from "lucide-react";
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
        <div className="min-h-screen">
            <PageBackground variant="interactive-grid" color="#55ffff" />
            <SidebarNav
                sections={[
                    { id: "projects", label: "Projects" },
                    { id: "renovations", label: "Renovations" },
                    { id: "artwork", label: "Artwork" },
                ]}
            />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Made"
                    title="Creations"
                    description="Everything Nate builds — games and software, real-place renovation studies, and the creative practice around both."
                />

                <div id="projects" className="mx-auto mt-14 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-aqua)">Projects</SectionLabel>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        Games and software — solo-built, systems-driven, shipped and
                        in-progress.
                    </p>
                    <div className="mt-6">
                        <WorkGrid projects={projects} icon={FolderKanban} />
                    </div>
                </div>

                <div id="renovations" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-gold)">Renovations</SectionLabel>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        Studying and reimagining real places — measured, modeled, and
                        redesigned to be greener and more inviting.
                    </p>
                    <div className="mt-6">
                        <WorkGrid projects={renovations} icon={Hammer} />
                    </div>
                </div>

                <div id="artwork" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-light-purple)">Artwork</SectionLabel>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        Blender renders, drawing, poetry — the creative practice around
                        the engineering.
                    </p>
                    <div className="mt-6">
                        <ComingSoon
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

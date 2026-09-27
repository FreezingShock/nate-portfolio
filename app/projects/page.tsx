import { FolderKanban } from "lucide-react";
import { getProjects } from "@/lib/content";
import { WorkGrid } from "@/components/work-grid";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";

export const revalidate = 60;

export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "grid", label: "All Projects" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Work"
                    title="Projects"
                    description="Games and software — solo-built, systems-driven, shipped and in-progress."
                />
                <div id="grid" className="mx-auto mt-10 max-w-6xl scroll-mt-24">
                    <WorkGrid projects={projects} icon={FolderKanban} />
                </div>
            </section>
        </div>
    );
}

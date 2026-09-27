import { FolderKanban } from "lucide-react";
import { getProjects } from "@/lib/content";
import { WorkGrid } from "@/components/work-grid";
import { SidebarNav } from "@/components/sidebar-nav";

export const revalidate = 60;

export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "grid", label: "All Projects" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-6xl">
                    <p className="text-sm uppercase tracking-[0.2em] text-primary">Work</p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        Projects
                    </h1>
                    <p className="mt-4 max-w-xl text-muted-foreground">
                        Games and software — solo-built, systems-driven, shipped and
                        in-progress.
                    </p>
                    <div id="grid" className="mt-10 scroll-mt-24">
                        <WorkGrid projects={projects} icon={FolderKanban} />
                    </div>
                </div>
            </section>
        </div>
    );
}

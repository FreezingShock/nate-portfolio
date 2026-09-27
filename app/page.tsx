import { identity, getProjects, getRecentRenovations } from "@/lib/content";
import { ProjectCard } from "@/components/project-card";

export const revalidate = 60; // re-check Supabase for new content every 60s

export default async function Home() {
    const [projects, recentRenovations] = await Promise.all([
        getProjects(),
        getRecentRenovations(),
    ]);

    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="w-full px-6 pt-28 pb-20 sm:px-10 lg:px-16">
                <div className="max-w-2xl rounded-2xl border border-border/50 bg-card/40 p-8 backdrop-blur-xl">
                    <p className="text-sm uppercase tracking-[0.2em] text-primary">
                        Portfolio
                    </p>
                    <h1 className="mt-4 font-minecraft text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                        {identity.name}
                    </h1>
                    <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                        {identity.tagline}
                    </p>
                </div>
            </section>

            {/* Projects */}
            <section id="projects" className="w-full px-6 pb-20 pt-8 scroll-mt-24 sm:px-10 lg:px-16">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Projects
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => (
                        <ProjectCard key={project.slug} project={project} />
                    ))}
                </div>
            </section>

            {/* Recent Renovations */}
            <section id="renovations" className="w-full px-6 pb-24 pt-8 scroll-mt-24 sm:px-10 lg:px-16">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Renovations
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Studying and reimagining real places — measured, modeled, and
                    redesigned to be greener and more inviting.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {recentRenovations.map((project) => (
                        <ProjectCard key={project.slug} project={project} />
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full px-6 py-10 sm:px-10 lg:px-16">
                <div className="max-w-2xl rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-sm text-muted-foreground backdrop-blur-xl">
                    © {new Date().getFullYear()} {identity.name}
                </div>
            </footer>
        </div>
    );
}

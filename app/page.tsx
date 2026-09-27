import { identity, getProjects, getRecentRenovations } from "@/lib/content";
import { ProjectCard } from "@/components/project-card";

export const revalidate = 60; // re-check Supabase for new content every 60s

export default async function Home() {
    const [projects, recentRenovations] = await Promise.all([
        getProjects(),
        getRecentRenovations(),
    ]);

    return (
        <div className="min-h-screen pl-24 sm:pl-28">
            {/* Hero */}
            <section className="mx-auto max-w-4xl px-6 pt-28 pb-20">
                <div className="rounded-2xl border border-border/50 bg-card/40 p-8 backdrop-blur-xl">
                    <p className="text-sm uppercase tracking-[0.2em] text-primary">
                        Portfolio
                    </p>
                    <h1 className="mt-4 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                        {identity.name}
                    </h1>
                    <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                        {identity.tagline}
                    </p>
                </div>
            </section>

            {/* Projects */}
            <section id="projects" className="mx-auto max-w-4xl px-6 pb-20 pt-8 scroll-mt-24">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Projects
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {projects.map((project) => (
                        <ProjectCard key={project.slug} project={project} />
                    ))}
                </div>
            </section>

            {/* Recent Renovations */}
            <section id="renovations" className="mx-auto max-w-4xl px-6 pb-24 pt-8 scroll-mt-24">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Renovations
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Studying and reimagining real places — measured, modeled, and
                    redesigned to be greener and more inviting.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {recentRenovations.map((project) => (
                        <ProjectCard key={project.slug} project={project} />
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-sm text-muted-foreground backdrop-blur-xl">
                        © {new Date().getFullYear()} {identity.name}
                    </div>
                </div>
            </footer>
        </div>
    );
}

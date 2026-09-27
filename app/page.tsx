import { identity, projects, recentRenovations } from "@/lib/content";
import { ProjectCard } from "@/components/project-card";

export default function Home() {
    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="mx-auto max-w-4xl px-6 pt-28 pb-20">
                <p className="text-sm uppercase tracking-[0.2em] text-primary">
                    Portfolio
                </p>
                <h1 className="mt-4 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                    {identity.name}
                </h1>
                <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                    {identity.tagline}
                </p>
            </section>

            {/* Projects */}
            <section className="mx-auto max-w-4xl px-6 pb-20">
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
            <section className="mx-auto max-w-4xl px-6 pb-24">
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
            <footer className="border-t border-border py-10">
                <div className="mx-auto max-w-4xl px-6 text-sm text-muted-foreground">
                    © {new Date().getFullYear()} {identity.name}
                </div>
            </footer>
        </div>
    );
}

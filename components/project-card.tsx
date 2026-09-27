import { Project, statusLabel } from "@/lib/content";

export function ProjectCard({ project }: { project: Project }) {
    return (
        <div className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {project.category}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-foreground">
                        {project.title}
                    </h3>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                    {statusLabel[project.status]}
                </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {project.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                    <span
                        key={tag}
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
}

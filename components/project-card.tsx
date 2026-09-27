import { Project, statusLabel } from "@/lib/content";
import { BorderBeam } from "@/components/ui/border-beam";

export function ProjectCard({ project }: { project: Project }) {
    return (
        <div className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/40 p-6 backdrop-blur-xl transition-colors hover:border-primary/40">
            {/* Only visible on hover — BorderBeam animates continuously
                once mounted, so opacity (not conditional render) is what's
                toggled, to avoid restarting the sweep every hover. */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <BorderBeam
                    size={80}
                    duration={6}
                    colorFrom="var(--primary)"
                    colorTo="var(--chart-4)"
                />
            </div>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {project.category}
                    </p>
                    <h3 className="mt-1 font-minecraft text-xl font-semibold text-foreground">
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

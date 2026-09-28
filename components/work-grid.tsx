import type { LucideIcon } from "lucide-react";
import { Project, statusLabel } from "@/lib/content";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { ShineBorder } from "@/components/ui/shine-border";
import { MagicCard } from "@/components/ui/magic-card";

// Shared by /projects and /renovations — same bento treatment, different
// data source and icon, per Nate's call to keep the two sections separate
// rather than merging into one "Work" grid.
export function WorkGrid({
    projects,
    icon: Icon,
    accentColor = "var(--primary)",
}: {
    projects: Project[];
    icon: LucideIcon;
    accentColor?: string;
}) {
    if (projects.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/40 p-10 text-center">
                <ShineBorder borderWidth={1} shineColor={["var(--primary)", "var(--chart-4)"]} />
                <p className="text-muted-foreground">Nothing here yet — check back soon.</p>
            </div>
        );
    }

    // Light bento asymmetry: first card spans 2 columns, rest span 1 —
    // reads as "designed," not a uniform grid, without hand-tuning every span.
    return (
        <BentoGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
                <div
                    key={project.slug}
                    className={`relative ${i === 0 ? "sm:col-span-2 lg:col-span-2" : "col-span-1"}`}
                >
                    <MagicCard
                        className="h-full rounded-xl"
                        gradientFrom={accentColor}
                        gradientTo="var(--chart-4)"
                        gradientColor="var(--accent)"
                        gradientOpacity={0.6}
                    >
                        <BentoCard
                            name={project.title}
                            className="h-full !bg-transparent [box-shadow:none] dark:[box-shadow:none]"
                            Icon={Icon}
                            accentColor={accentColor}
                            description={project.description}
                            href={`/creations/${project.slug}`}
                            cta="Learn more"
                            background={
                                <div className="absolute inset-0 flex flex-wrap items-start justify-end gap-2 p-4 pt-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    {project.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="h-fit rounded-full border border-border/60 bg-background/60 px-2 py-0.5 font-rubik text-xs text-muted-foreground"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            }
                        />
                    </MagicCard>
                    <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-border px-2.5 py-0.5 font-rubik text-xs text-muted-foreground">
                        {statusLabel[project.status]}
                    </div>
                </div>
            ))}
        </BentoGrid>
    );
}

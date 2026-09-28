import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FolderKanban, Axis3D } from "lucide-react";
import { getProjectBySlug, getAllProjectSlugs, statusLabel } from "@/lib/content";
import { PageHero } from "@/components/page-hero";
import { PageBackground } from "@/components/page-background";
import { SidebarNav } from "@/components/sidebar-nav";
import { ShineBorder } from "@/components/ui/shine-border";

export const revalidate = 60;

export async function generateStaticParams() {
    const slugs = await getAllProjectSlugs();
    return slugs.map((slug) => ({ slug }));
}

// Individual project/renovation page — the "Learn more" click-through from
// the Creations grid used to just re-scroll to the same card; this gives
// each one an actual room of its own, themed to whichever section it
// belongs to (aqua for a project, gold for a renovation), same as the
// Creations hub's own section colors.
export default async function ProjectPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const project = await getProjectBySlug(slug);

    if (!project) notFound();

    const isProject = project.section === "projects";
    const accent = isProject ? "var(--mc-aqua)" : "var(--mc-gold)";
    const Icon = isProject ? FolderKanban : Axis3D;
    const bgColor = isProject ? "#55ffff" : "#ffaa00";

    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="interactive-grid" color={bgColor} />
            <SidebarNav sections={[{ id: "detail", label: project.title }]} />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-3xl">
                    <Link
                        href="/creations"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-3.5" /> Back to Creations
                    </Link>

                    <div className="mt-6">
                        <PageHero
                            eyebrow={project.category}
                            title={project.title}
                            description={project.description}
                            accent={accent}
                        />
                    </div>

                    <div
                        id="detail"
                        className="relative mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur-xl scroll-mt-24"
                    >
                        <ShineBorder borderWidth={1} shineColor={[accent, "var(--chart-4)"]} />

                        <div className="flex flex-wrap items-center gap-3">
                            <span
                                className="flex items-center gap-1.5 rounded-full border px-3 py-1 font-rubik text-xs"
                                style={{ borderColor: accent, color: accent }}
                            >
                                <Icon className="size-3.5" />
                                {statusLabel[project.status]}
                            </span>
                            {project.href && (
                                <a
                                    href={project.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 font-rubik text-xs text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Visit <ArrowUpRight className="size-3.5" />
                                </a>
                            )}
                        </div>

                        {project.tags.length > 0 && (
                            <div className="mt-6 flex flex-wrap gap-2">
                                {project.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 font-rubik text-xs text-muted-foreground"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

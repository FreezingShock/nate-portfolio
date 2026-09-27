import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { identity, getProjects, getRecentRenovations } from "@/lib/content";
import { Marquee } from "@/components/ui/marquee";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { GlyphMatrix } from "@/components/ui/glyph-matrix";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { SidebarNav } from "@/components/sidebar-nav";

export const revalidate = 60; // re-check Supabase for new content every 60s

export default async function Home() {
    const [projects, recentRenovations] = await Promise.all([
        getProjects(),
        getRecentRenovations(),
    ]);

    // Real stack tags pulled from Supabase project rows, not a hardcoded
    // list — stays accurate as projects are added/edited.
    const stack = Array.from(
        new Set([...projects, ...recentRenovations].flatMap((p) => p.tags))
    );

    const featured = [...projects, ...recentRenovations].slice(0, 3);

    return (
        <div className="min-h-screen">
            <SidebarNav
                sections={[
                    { id: "work", label: "Selected Work" },
                    { id: "stack", label: "Stack" },
                ]}
            />

            {/* Hero — centered, Linear/Reflect-style */}
            <section className="flex min-h-[80vh] w-full flex-col items-center justify-center px-6 pt-16 text-center">
                <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-10 backdrop-blur-xl sm:p-14">
                    <ShineBorder
                        borderWidth={1.5}
                        duration={10}
                        shineColor={["var(--primary)", "var(--chart-4)"]}
                    />
                    {/* Glyph Matrix as a quiet backdrop texture behind the hero
                        copy — not a spotlight, a signature detail. */}
                    <div className="absolute inset-0 opacity-[0.35]">
                        <GlyphMatrix
                            color="var(--muted-foreground)"
                            cellSize={13}
                            mutationRate={0.03}
                            fadeBottom={0.75}
                        />
                    </div>

                    <div className="relative">
                        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5">
                            <AnimatedGradientText
                                speed={1.2}
                                colorFrom="var(--primary)"
                                colorTo="var(--chart-4)"
                                className="text-sm font-semibold uppercase tracking-[0.2em]"
                            >
                                Portfolio
                            </AnimatedGradientText>
                        </div>

                        <h1 className="mt-6 font-minecraft text-6xl font-bold tracking-tight text-foreground sm:text-7xl">
                            <DiaTextReveal text={identity.name} duration={1.2} />
                        </h1>

                        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                            {identity.tagline}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <ShimmerButton
                                background="var(--primary)"
                                shimmerColor="var(--primary-foreground)"
                                className="text-sm font-medium"
                            >
                                <Link href="/projects" className="flex items-center gap-2">
                                    <AnimatedGradientText
                                        speed={1.5}
                                        colorFrom="var(--primary-foreground)"
                                        colorTo="var(--chart-4)"
                                        className="font-medium"
                                    >
                                        View Projects
                                    </AnimatedGradientText>
                                    <ArrowRight className="size-4" />
                                </Link>
                            </ShimmerButton>
                            <Link
                                href="/about"
                                className="rounded-full border border-border/60 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                            >
                                About Me
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stack marquee */}
            {stack.length > 0 && (
                <section
                    id="stack"
                    aria-label="Tools and skills"
                    className="relative w-full overflow-hidden py-12 scroll-mt-24"
                >
                    <Marquee pauseOnHover className="[--duration:32s]">
                        {stack.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-border/50 bg-card/40 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-xl"
                            >
                                {tag}
                            </span>
                        ))}
                    </Marquee>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-background to-transparent sm:w-32" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-background to-transparent sm:w-32" />
                </section>
            )}

            {/* Selected Work preview */}
            {featured.length > 0 && (
                <section
                    id="work"
                    className="w-full px-6 pb-24 pt-8 scroll-mt-24 sm:px-10 lg:px-16"
                >
                    <div className="mx-auto max-w-6xl">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Selected Work
                            </h2>
                            <Link
                                href="/projects"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                View all <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                        <BentoGrid className="mt-6 grid-cols-1 sm:grid-cols-3">
                            {featured.map((project) => (
                                <BentoCard
                                    key={project.slug}
                                    name={project.title}
                                    className="col-span-1"
                                    Icon={FolderKanban}
                                    description={project.description}
                                    href="/projects"
                                    cta="Learn more"
                                    background={<div className="absolute inset-0" />}
                                />
                            ))}
                        </BentoGrid>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="w-full px-6 py-10 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-6xl rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-sm text-muted-foreground backdrop-blur-xl">
                    © {new Date().getFullYear()} {identity.name}
                </div>
            </footer>
        </div>
    );
}

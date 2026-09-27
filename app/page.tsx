import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { identity, getProjects, getRecentRenovations } from "@/lib/content";
import { IdentityMarquee } from "@/components/identity-marquee";
import { SiteBackground } from "@/components/site-background";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { HeroFirstName, HeroLastName } from "@/components/hero-name";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { GlyphMatrix } from "@/components/ui/glyph-matrix";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { MagicCard } from "@/components/ui/magic-card";
import { SectionLabel } from "@/components/section-label";
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
            <SiteBackground />
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
                        {/* Domain first — reads like a browser/terminal chip,
                            establishes "this is a real site with a real URL"
                            before the name even renders. */}
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-1.5 font-mono text-xs text-muted-foreground sm:text-sm">
                            <span className="relative flex size-1.5">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                            </span>
                            <TypingAnimation delay={200} typeSpeed={70} showCursor={false}>
                                nateanderson
                            </TypingAnimation>
                            <TypingAnimation
                                delay={200 + 70 * "nateanderson".length}
                                typeSpeed={70}
                                cursorStyle="block"
                                className="font-semibold text-primary"
                            >
                                .dev
                            </TypingAnimation>
                        </div>

                        {/* Full name, multisized: "Nate" is the headline,
                            "Anderson" settles in smaller right underneath —
                            both stay on screen, nothing keeps cycling. */}
                        <h1 className="mt-6 font-minecraft text-6xl font-bold tracking-tight sm:text-7xl">
                            <HeroFirstName />
                        </h1>
                        <div className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                            <HeroLastName />
                        </div>

                        <div className="mt-6 inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5">
                            <AnimatedGradientText
                                speed={1.2}
                                colorFrom="var(--primary)"
                                colorTo="var(--chart-4)"
                                className="font-mono text-sm font-semibold uppercase tracking-[0.2em]"
                            >
                                Portfolio
                            </AnimatedGradientText>
                        </div>

                        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                            {identity.tagline}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <ShimmerButton
                                background="var(--primary)"
                                shimmerColor="var(--primary-foreground)"
                                className="text-sm font-medium"
                            >
                                <Link href="/creations#projects" className="flex items-center gap-2">
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
                            <ShimmerButton
                                background="var(--chart-4)"
                                shimmerColor="#1a1408"
                                className="text-sm font-medium"
                            >
                                <Link href="/about" className="flex items-center gap-2 text-neutral-900">
                                    About Me
                                </Link>
                            </ShimmerButton>
                        </div>
                    </div>
                </div>
            </section>

            {/* Identity + stack — scroll-velocity driven, not a plain marquee */}
            <section id="stack" aria-label="Who I am and what I build with" className="scroll-mt-24">
                <IdentityMarquee stack={stack} />
            </section>

            {/* Selected Work preview */}
            {featured.length > 0 && (
                <section
                    id="work"
                    className="w-full px-6 pb-24 pt-8 scroll-mt-24 sm:px-10 lg:px-16"
                >
                    <div className="mx-auto max-w-6xl">
                        <div className="flex items-center justify-between gap-4">
                            <SectionLabel>Selected Work</SectionLabel>
                            <Link
                                href="/creations#projects"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                View all <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                        <BentoGrid className="mt-6 grid-cols-1 sm:grid-cols-3">
                            {featured.map((project) => (
                                <MagicCard
                                    key={project.slug}
                                    className="col-span-1 rounded-xl"
                                    gradientFrom="var(--primary)"
                                    gradientTo="var(--chart-4)"
                                    gradientColor="var(--accent)"
                                    gradientOpacity={0.6}
                                >
                                    <BentoCard
                                        name={project.title}
                                        className="h-full !bg-transparent [box-shadow:none] dark:[box-shadow:none]"
                                        Icon={FolderKanban}
                                        description={project.description}
                                        href="/creations#projects"
                                        cta="Learn more"
                                        background={<div className="absolute inset-0" />}
                                    />
                                </MagicCard>
                            ))}
                        </BentoGrid>
                    </div>
                </section>
            )}

        </div>
    );
}

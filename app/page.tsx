import { HeroTagline } from "@/components/hero-tagline";
import { DomainPill } from "@/components/domain-pill";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { identity, getProjects, getRecentRenovations } from "@/lib/content";
import { getProjectIcon } from "@/lib/project-icons";
import { IdentityMarquee } from "@/components/identity-marquee";
import { SiteBackground } from "@/components/site-background";
import { HeroFirstName, HeroLastName } from "@/components/hero-name";
import { GlyphMatrix } from "@/components/ui/glyph-matrix";
import { ShineBorder } from "@/components/ui/shine-border";
import { RainbowButton } from "@/components/ui/rainbow-button";
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

    // pointer-events-auto: only the Creations page opts its own root out
    // (to let its interactive-grid background receive hover) — every other
    // page restores normal pointer-events here since the shared root
    // layout wrapper is pointer-events-none for that page's benefit.
    return (
        <div className="pointer-events-auto min-h-screen">
            <SiteBackground />
            <SidebarNav
                sections={[
                    { id: "stack", label: "Stack" },
                    { id: "work", label: "Selected Work" },
                ]}
            />

            {/* Hero — centered, Linear/Reflect-style */}
            <section className="flex min-h-[80vh] w-full flex-col items-center justify-center px-6 pt-16 text-center">
                <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-10 backdrop-blur-xl sm:p-14">
                    <ShineBorder
                        borderWidth={1.5}
                        duration={10}
                        shineColor={["#ff5555", "#ffaa00", "#55ff55", "#55ffff", "#ff55ff"]}
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
                        <DomainPill />

                        {/* Full name, multisized: "Nate" is the headline,
                            "Anderson" settles in smaller right underneath —
                            both stay on screen, nothing keeps cycling. */}
                        <h1 className="mt-6 font-minecraft text-6xl font-bold tracking-tight sm:text-7xl">
                            <HeroFirstName />
                        </h1>
                        <div className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                            <HeroLastName />
                        </div>

                        <div className="rainbow-bg relative mt-6 inline-flex items-center overflow-hidden rounded-full px-4 py-1.5">
                            <ShineBorder borderWidth={1.5} duration={8} shineColor={["#ff5555", "#ffaa00", "#55ff55", "#55ffff", "#ff55ff"]} />
                            <span className="rainbow-text font-mono text-sm font-bold uppercase tracking-[0.22em]">
                                Portfolio
                            </span>
                        </div>

                        <HeroTagline />

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            {/* The showcase CTA — animated rainbow border/glow,
                                deliberately the flashier of the two since this
                                is the "look at what I've built" button. `asChild`
                                merges RainbowButton's styling directly onto the
                                Link's own <a>, so the whole pill is clickable,
                                not just the text inside it (the old ShimmerButton
                                version here only made the inner text clickable). */}
                            <RainbowButton asChild size="lg" className="rounded-full text-sm font-semibold">
                                <Link href="/creations#projects" className="gap-2">
                                    View Projects
                                    <ArrowRight className="size-4" />
                                </Link>
                            </RainbowButton>
                            <RainbowButton asChild size="lg" className="rounded-full text-sm font-semibold">
                                <Link href="/about" className="gap-2">
                                    <User className="size-4" />
                                    About Me
                                </Link>
                            </RainbowButton>
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
                            <SectionLabel accent="var(--mc-gold)" symbol="attackSpeed">
                                Selected Work
                            </SectionLabel>
                            <Link
                                href="/creations#projects"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                View all <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            A look at{" "}
                            <span className="font-minecraft" style={{ color: "var(--mc-aqua)" }}>
                                solo-built games
                            </span>
                            ,{" "}
                            <span className="font-minecraft" style={{ color: "var(--mc-gold)" }}>
                                real renovation studies
                            </span>
                            , and the{" "}
                            <span className="font-minecraft" style={{ color: "var(--mc-light-purple)" }}>
                                systems thinking
                            </span>{" "}
                            that connects them — the work that best shows how I build.
                        </p>
                        <BentoGrid className="mt-6 grid-cols-1 sm:grid-cols-3">
                            {featured.map((project) => {
                                const { icon, color } = getProjectIcon(project.slug);
                                return (
                                    <MagicCard
                                        key={project.slug}
                                        className="col-span-1 rounded-xl"
                                        gradientFrom="var(--mc-gold)"
                                        gradientTo="var(--chart-4)"
                                        gradientColor="var(--accent)"
                                        gradientOpacity={0.6}
                                    >
                                        <BentoCard
                                            name={project.title}
                                            className="h-full !bg-transparent [box-shadow:none] dark:[box-shadow:none]"
                                            Icon={icon}
                                            accentColor={color}
                                            description={project.description}
                                            href={`/creations/${project.slug}`}
                                            cta="Learn more"
                                            background={<div className="absolute inset-0" />}
                                        />
                                    </MagicCard>
                                );
                            })}
                        </BentoGrid>
                    </div>
                </section>
            )}

        </div>
    );
}

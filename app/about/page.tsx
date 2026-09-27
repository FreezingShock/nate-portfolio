import { identity } from "@/lib/content";
import { PageHero } from "@/components/page-hero";
import { ShineBorder } from "@/components/ui/shine-border";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";

export default function AboutPage() {
    return (
        <div className="min-h-screen">
            <PageBackground variant="particles" color="#00aaaa" />
            <SidebarNav sections={[{ id: "bio", label: "Bio" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero eyebrow="Who" title="About Me" description="" accent="var(--mc-dark-aqua)" />

                <div id="bio" className="relative mx-auto mt-4 max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur-xl scroll-mt-24">
                    <ShineBorder
                        borderWidth={1}
                        duration={12}
                        shineColor={["var(--mc-dark-aqua)", "var(--chart-4)"]}
                    />
                    <p className="text-lg leading-relaxed text-foreground">
                        {identity.tagline}
                    </p>
                    <p className="mt-4 text-muted-foreground">
                        This page is a starting point — the full story (background,
                        interests, how the three tracks connect) is still being
                        written. For now, the work speaks for itself: see{" "}
                        <a href="/creations#projects" className="text-primary hover:underline">
                            Projects
                        </a>
                        ,{" "}
                        <a href="/creations#renovations" className="text-primary hover:underline">
                            Renovations
                        </a>
                        , and{" "}
                        <a href="/timeline" className="text-primary hover:underline">
                            Timeline
                        </a>
                        .
                    </p>
                </div>
            </section>
        </div>
    );
}

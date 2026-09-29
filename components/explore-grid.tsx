import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionLabel } from "@/components/section-label";
import { GlowCard } from "@/components/glow-card";

import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { navItems } from "@/lib/nav";

// One entry per non-home page, matched to navItems by href so the icon and
// color always agree with the Dock and the page's own header.
const PAGE_INFO: Record<string, { description: string; tags: string[]; symbol: McSymbolName }> = {
    "/creations": {
        description:
            "Games, Blender renders and renovation studies: everything I've built, with the story behind each piece.",
        tags: ["Projects", "Renovations", "Blender"],
        symbol: "forge",
    },
    "/timeline": {
        description:
            "The full plan from senior year through Santa Monica College and Cal Poly Pomona to a 2031 launch.",
        tags: ["2026", "SMC", "Cal Poly"],
        symbol: "arrow",
    },
    "/studies": {
        description:
            "My classes, the reasoning behind each, and how they connect into an environmental engineering pathway.",
        tags: ["AP Courses", "Senior Project"],
        symbol: "wisdom",
    },
    "/blog": {
        description:
            "Essays, research notes, poetry and dev logs. Long-form thinking on systems, design and philosophy.",
        tags: ["Essays", "Research", "Poetry"],
        symbol: "intelligence",
    },
    "/history": {
        description:
            "This site's own changelog, pulled live from GitHub, with commit stats and a look at how it grew.",
        tags: ["Changelog", "Live Stats"],
        symbol: "location",
    },
    "/about": {
        description:
            "Who I am: running, Fractured Islands, philosophy, skills, and the path I'm on.",
        tags: ["Running", "Philosophy", "Skills"],
        symbol: "strength",
    },
};

// Server component: renders each card's icon as an element (functions can't
// cross into client components), while GlowCard supplies the hover
// spotlight. The page transition itself is site-wide (PageTransitions in the
// root layout), so these are plain links.
export function ExploreGrid() {
    const pages = navItems.filter((item) => PAGE_INFO[item.href]);

    return (
        <div className="mx-auto max-w-6xl">
            <SectionLabel accent="var(--mc-light-purple)" symbol="comet">
                Explore the Site
            </SectionLabel>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Every page in one place. Pick a door, and the page opens from wherever you click.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((item) => {
                    const info = PAGE_INFO[item.href];
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href} className="group block">
                            <GlowCard color={item.color} className="h-full p-5">
                                <div className="flex items-start justify-between">
                                    <span
                                        className="flex size-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                                        style={{
                                            color: item.color,
                                            backgroundColor: `color-mix(in oklch, ${item.color} 16%, transparent)`,
                                            boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${item.color} 35%, transparent)`,
                                        }}
                                    >
                                        <Icon className="size-7" />
                                    </span>
                                    <span className="text-2xl" style={{ color: item.color }}>
                                        <McSymbol name={info.symbol} />
                                    </span>
                                </div>
                                <h3 className="mt-4 font-minecraft text-xl font-bold" style={{ color: item.color }}>
                                    {item.title}
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">{info.description}</p>
                                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                                    {info.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full border px-2 py-0.5 font-rubik text-[10px] font-medium"
                                            style={{
                                                color: item.color,
                                                borderColor: `color-mix(in oklch, ${item.color} 45%, transparent)`,
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    <span
                                        className="ml-auto flex items-center gap-1 font-mono text-xs font-semibold transition-transform duration-300 group-hover:translate-x-1"
                                        style={{ color: item.color }}
                                    >
                                        Open <ArrowRight className="size-3.5" />
                                    </span>
                                </div>
                            </GlowCard>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

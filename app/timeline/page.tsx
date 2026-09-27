import { Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { cn } from "@/lib/utils";

interface Milestone {
    when: string;
    title: string;
    note: string;
    future?: boolean;
}

// Placeholder dates/milestones — structure is real, specifics are TBD until
// filled in with Nate's actual history. Future entries are goals, not facts.
const milestones: Milestone[] = [
    {
        when: "In progress",
        title: "Environmental engineering studies",
        note: "Coursework and systems thinking that feeds directly back into how Fractured Islands and the renovation studies get designed.",
    },
    {
        when: "Ongoing",
        title: "Fractured Islands: Ascension",
        note: "Solo-built Roblox incremental/RPG — the main long-running project.",
    },
    {
        when: "Ongoing",
        title: "Renovation studies",
        note: "Studying real places, modeling them in Blender, redesigning them greener.",
    },
    {
        when: "Future",
        title: "Ship an App Store app",
        note: "First iOS passion-project app shipped and in someone else's hands.",
        future: true,
    },
    {
        when: "Future",
        title: "Southern California",
        note: "Mid-20s target: financial independence, built on the three parallel tracks.",
        future: true,
    },
];

export default function TimelinePage() {
    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "line", label: "Timeline" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Journey"
                    title="Timeline"
                    description="Where things stand, and where they're headed — past and future on one line."
                />
                <div id="line" className="mx-auto mt-12 max-w-2xl scroll-mt-24">
                    <ol className="relative border-l border-border/60 pl-8">
                        {milestones.map((m, i) => (
                            <li key={i} className="mb-10 last:mb-0">
                                <span
                                    className={cn(
                                        "absolute -left-[7px] flex size-3.5 items-center justify-center rounded-full border-2 border-background",
                                        m.future ? "bg-chart-4" : "bg-primary"
                                    )}
                                />
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                    {m.when}
                                </p>
                                <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
                                    {m.title}
                                    {m.future && <Sparkles className="size-4 text-chart-4" />}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">{m.note}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
        </div>
    );
}

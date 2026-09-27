import { PageHero } from "@/components/page-hero";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SidebarNav } from "@/components/sidebar-nav";

// Bumped by hand on each major redesign pass — not a build-time git-commit
// count (Vercel's default shallow clone would make that number meaningless
// in production). Real, just manually tracked rather than auto-computed.
const SITE_ITERATION = 5;

interface LogEntry {
    date: string;
    title: string;
    detail: string;
}

const log: LogEntry[] = [
    {
        date: "2026-09-22",
        title: "Launch",
        detail: "Forked next-shadcn-tailwind-supabase, shipped the first live version at nateanderson.dev.",
    },
    {
        date: "2026-09-24",
        title: "Liquid glass nav",
        detail: "Top-center bubble nav with liquid-glass-react, fixed several rendering bugs in the library along the way.",
    },
    {
        date: "2026-09-26",
        title: "Full-width layout + Minecraft font",
        detail: "Dropped the centered column for full-width left-aligned content; added the embedded pixel font for the name and titles.",
    },
    {
        date: "2026-09-27",
        title: "First Magic UI pass",
        detail: "Border Beam, Marquee, and Animated Gradient Text added to the hero and project cards.",
    },
    {
        date: "2026-09-27",
        title: "Full relaunch",
        detail: "Multi-page site, Dock navigation, Bento Grid work sections, and a ground-up Linear/Reflect-style design system.",
    },
];

export default function HistoryPage() {
    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "log", label: "Changelog" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Meta"
                    title="Site History"
                    description="This website's own changelog — a record of how it got here, not just what it looks like now."
                />

                <div className="mx-auto mt-10 max-w-2xl">
                    <div className="flex items-baseline gap-3 rounded-xl border border-border/60 bg-card/40 px-6 py-5">
                        <span className="text-4xl font-bold tabular-nums text-foreground">
                            <NumberTicker value={SITE_ITERATION} />
                        </span>
                        <span className="text-sm text-muted-foreground">
                            major iterations since launch
                        </span>
                    </div>
                </div>

                <div id="log" className="mx-auto mt-10 max-w-2xl scroll-mt-24">
                    <ol className="relative border-l border-border/60 pl-8">
                        {log.map((entry) => (
                            <li key={entry.title} className="mb-8 last:mb-0">
                                <span className="absolute -left-[7px] size-3.5 rounded-full border-2 border-background bg-primary" />
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                    {entry.date}
                                </p>
                                <h3 className="mt-1 text-lg font-semibold text-foreground">
                                    {entry.title}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">{entry.detail}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
        </div>
    );
}

import { PageHero } from "@/components/page-hero";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import changelog from "@/lib/changelog.json";

// Real data — generated from actual `git log` by scripts/generate-changelog.mjs
// (`npm run changelog`), not hand-written. Regenerate that file whenever this
// page should reflect the latest commits; see the script for why it isn't
// wired into the Vercel build itself.
export default function HistoryPage() {
    return (
        <div className="min-h-screen">
            <PageBackground variant="ripple" color="#ff5555" />
            <SidebarNav sections={[{ id: "log", label: "Changelog" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Meta"
                    title="Site History"
                    description="This website's own changelog — generated from the real git history, not written by hand."
                    accent="var(--mc-red)"
                />

                <div className="mx-auto mt-10 max-w-2xl">
                    <div className="flex items-baseline gap-3 rounded-xl border border-border/60 bg-card/40 px-6 py-5">
                        <span className="text-4xl font-bold tabular-nums text-foreground">
                            <NumberTicker value={changelog.totalCommits} />
                        </span>
                        <span className="text-sm text-muted-foreground">
                            commits shipped to nateanderson-dev
                        </span>
                    </div>
                </div>

                <div id="log" className="mx-auto mt-10 max-w-2xl scroll-mt-24">
                    <ol className="relative border-l border-border/60 pl-8">
                        {changelog.commits.map((entry) => (
                            <li key={entry.hash} className="mb-6 last:mb-0">
                                <span
                                    className="absolute -left-[7px] size-3.5 rounded-full border-2 border-background"
                                    style={{ backgroundColor: "var(--mc-red)" }}
                                />
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                    {entry.date} ·{" "}
                                    <a
                                        href={`https://github.com/FreezingShock/nateanderson-dev/commit/${entry.hash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono hover:text-foreground"
                                    >
                                        {entry.hash}
                                    </a>
                                </p>
                                <h3 className="mt-1 text-base font-semibold text-foreground">
                                    {entry.subject}
                                </h3>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
        </div>
    );
}

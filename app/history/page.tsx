import { PageHero } from "@/components/page-hero";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { CommitHistory } from "@/components/commit-history";
import { REPO, githubHeaders, fetchCommitsPage, type CommitEntry } from "@/lib/github";
import { getRepoStats } from "@/lib/site-stats";

const INITIAL_PER_PAGE = 10;

// Auto-updating changelog: reads straight from the GitHub REST API at
// request time instead of a locally-generated lib/changelog.json. That file
// (and `npm run changelog` / scripts/generate-changelog.mjs) needed someone
// to remember to re-run it after every push — this needs nothing. The
// earlier approach existed because Vercel's default git clone depth can't
// be trusted for a build-time `git log`, but that constraint only applies
// to reading LOCAL git history; hitting GitHub's own API instead sidesteps
// it entirely and updates itself on every request (subject to the
// `revalidate` window below).
async function getCommits(): Promise<{ commits: CommitEntry[]; totalCommits: number }> {
    const headers = githubHeaders();

    const [commits, countRes] = await Promise.all([
        fetchCommitsPage(1, INITIAL_PER_PAGE, headers),
        // The commits endpoint has no total-count field — the standard trick
        // is asking for 1-per-page and reading the last page number out of
        // the pagination Link header.
        fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, {
            headers,
            next: { revalidate: 3600 },
        }),
    ]);

    if (commits === null) {
        return { commits: [], totalCommits: 0 };
    }

    let totalCommits = commits.length;
    const link = countRes.headers.get("Link");
    const lastPageMatch = link?.match(/[?&]page=(\d+)>;\s*rel="last"/);
    if (lastPageMatch) totalCommits = Number(lastPageMatch[1]);

    return { commits, totalCommits };
}

export const revalidate = 3600; // re-check GitHub for new commits every hour

const STATS_ACCENTS = ["var(--mc-red)", "var(--mc-gold)", "var(--mc-aqua)"] as const;

export default async function HistoryPage() {
    const [{ commits, totalCommits }, { fileCount, linesOfCode }] = await Promise.all([
        getCommits(),
        getRepoStats(),
    ]);

    const stats = [
        { label: "Commits", value: totalCommits },
        { label: "Lines of Code", value: linesOfCode },
        { label: "File Count", value: fileCount },
    ];

    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="ripple" color="#ff5555" />
            <SidebarNav sections={[{ id: "log", label: "Changelog" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Meta"
                    title="Site History"
                    description="This website's own changelog — pulled live from the GitHub API, not written by hand or regenerated manually."
                    accent="var(--mc-red)"
                    symbol="location"
                />

                <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
                    {stats.map((stat, i) => {
                        const accent = STATS_ACCENTS[i];
                        return (
                            <div
                                key={stat.label}
                                className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card/40 px-3 py-5 text-center"
                            >
                                {/* NumberTicker's own span hardcodes
                                    text-black/dark:text-white, which beats
                                    a `color` set on this wrapper (a class on
                                    the child always wins over an ancestor's
                                    inline style) — so the accent color is
                                    passed straight through as an inline
                                    style on NumberTicker itself instead,
                                    which always wins over any class. */}
                                <span className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">
                                    <NumberTicker value={stat.value} style={{ color: accent }} />
                                </span>
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                                    {stat.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div id="log" className="mx-auto mt-10 max-w-2xl scroll-mt-24">
                    {totalCommits === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t reach the GitHub API right now — check back shortly.
                        </p>
                    ) : (
                        <CommitHistory
                            repo={REPO}
                            totalCommits={totalCommits}
                            initialCommits={commits}
                            initialPerPage={INITIAL_PER_PAGE}
                            accent="var(--mc-red)"
                        />
                    )}
                </div>
            </section>
        </div>
    );
}

export const metadata = { title: "Site History" };

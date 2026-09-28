import { PageHero } from "@/components/page-hero";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";

const REPO = "FreezingShock/nateanderson-dev";
const SHOWN_COMMITS = 20;

interface CommitEntry {
    hash: string;
    date: string;
    subject: string;
}

interface GhCommit {
    sha: string;
    commit: {
        author: { date: string } | null;
        message: string;
    };
}

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
    const headers: HeadersInit = { Accept: "application/vnd.github+json" };

    const [listRes, countRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${REPO}/commits?per_page=${SHOWN_COMMITS}`, {
            headers,
            next: { revalidate: 3600 },
        }),
        // The commits endpoint has no total-count field — the standard trick
        // is asking for 1-per-page and reading the last page number out of
        // the pagination Link header.
        fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, {
            headers,
            next: { revalidate: 3600 },
        }),
    ]);

    if (!listRes.ok) {
        console.error(`GitHub API error fetching commits: ${listRes.status}`);
        return { commits: [], totalCommits: 0 };
    }

    const raw = (await listRes.json()) as GhCommit[];
    const commits: CommitEntry[] = raw.map((c) => ({
        hash: c.sha.slice(0, 7),
        date: (c.commit.author?.date ?? "").slice(0, 10),
        subject: c.commit.message.split("\n")[0],
    }));

    let totalCommits = commits.length;
    const link = countRes.headers.get("Link");
    const lastPageMatch = link?.match(/[?&]page=(\d+)>;\s*rel="last"/);
    if (lastPageMatch) totalCommits = Number(lastPageMatch[1]);

    return { commits, totalCommits };
}

export const revalidate = 3600; // re-check GitHub for new commits every hour

export default async function HistoryPage() {
    const { commits, totalCommits } = await getCommits();

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
                />

                <div className="mx-auto mt-10 max-w-2xl">
                    <div className="flex items-baseline gap-3 rounded-xl border border-border/60 bg-card/40 px-6 py-5">
                        <span className="text-4xl font-bold tabular-nums text-foreground">
                            <NumberTicker value={totalCommits} />
                        </span>
                        <span className="text-sm text-muted-foreground">
                            commits shipped to nateanderson-dev
                        </span>
                    </div>
                </div>

                <div id="log" className="mx-auto mt-10 max-w-2xl scroll-mt-24">
                    {commits.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t reach the GitHub API right now — check back shortly.
                        </p>
                    ) : (
                        <ol className="relative border-l border-border/60 pl-8">
                            {commits.map((entry) => (
                                <li key={entry.hash} className="mb-6 last:mb-0">
                                    <span
                                        className="absolute -left-[7px] size-3.5 rounded-full border-2 border-background"
                                        style={{ backgroundColor: "var(--mc-red)" }}
                                    />
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {entry.date} ·{" "}
                                        <a
                                            href={`https://github.com/${REPO}/commit/${entry.hash}`}
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
                    )}
                </div>
            </section>
        </div>
    );
}

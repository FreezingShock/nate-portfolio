import { PageHero } from "@/components/page-hero";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { CommitHistory } from "@/components/commit-history";
import { REPO, githubHeaders, fetchCommitsPage, type CommitEntry } from "@/lib/github";

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
interface GhTreeEntry {
    path: string;
    type: "blob" | "tree" | "commit";
    size?: number;
}

// Extensions that are text source we actually want counted as "lines of
// code" — everything else (images, fonts, lockfile binaries, etc.) is
// skipped so a handful of PNGs in public/ can't inflate the number.
const CODE_EXTENSIONS = new Set([
    "ts", "tsx", "js", "jsx", "mjs", "cjs", "css", "scss", "json", "md",
    "mdx", "html", "sql", "yml", "yaml", "sh", "toml", "txt",
]);

// File count + lines of code, both computed from the same tree walk so
// there's one source of truth instead of two flaky external calls: the
// tree API's `?recursive=1` returns every blob (file) in the repo in one
// request, no cloning needed. Lines of code used to come from
// api.codetabs.com/v1/loc, a third-party "clone + cloc" service — dropped
// after it started intermittently 522ing (Cloudflare timeout) even on a
// repo this small. Fetching each blob's raw text directly from
// raw.githubusercontent.com (uncached CDN, no api.github.com rate limit)
// and counting newlines ourselves has no external dependency beyond GitHub
// itself, which the rest of this page already trusts.
async function getRepoStats(): Promise<{ fileCount: number; linesOfCode: number }> {
    const headers = githubHeaders();
    try {
        const repoRes = await fetch(`https://api.github.com/repos/${REPO}`, {
            headers,
            next: { revalidate: 3600 },
        });
        if (!repoRes.ok) return { fileCount: 0, linesOfCode: 0 };
        const { default_branch } = (await repoRes.json()) as { default_branch: string };

        const treeRes = await fetch(
            `https://api.github.com/repos/${REPO}/git/trees/${default_branch}?recursive=1`,
            { headers, next: { revalidate: 3600 } }
        );
        if (!treeRes.ok) return { fileCount: 0, linesOfCode: 0 };
        const { tree } = (await treeRes.json()) as { tree: GhTreeEntry[] };
        const files = tree.filter((entry) => entry.type === "blob");

        const codeFiles = files.filter((f) => {
            const ext = f.path.split(".").pop()?.toLowerCase();
            return ext && CODE_EXTENSIONS.has(ext);
        });

        const lineCounts = await Promise.all(
            codeFiles.map(async (f) => {
                try {
                    const raw = await fetch(
                        `https://raw.githubusercontent.com/${REPO}/${default_branch}/${f.path}`,
                        { next: { revalidate: 3600 } }
                    );
                    if (!raw.ok) return 0;
                    const text = await raw.text();
                    return text === "" ? 0 : text.split("\n").length;
                } catch {
                    return 0;
                }
            })
        );

        return {
            fileCount: files.length,
            linesOfCode: lineCounts.reduce((sum, n) => sum + n, 0),
        };
    } catch {
        return { fileCount: 0, linesOfCode: 0 };
    }
}

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

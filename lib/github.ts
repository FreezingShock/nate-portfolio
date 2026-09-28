// Shared between app/history/page.tsx (server-rendered first page) and
// app/api/commits/route.ts (the client's pagination endpoint) so both fetch
// GitHub the exact same way instead of drifting apart.
export const REPO = "FreezingShock/nateanderson-dev";

// Unauthenticated GitHub REST calls are capped at 60/hour PER IP.
// GITHUB_TOKEN is entirely optional: if set (a fine-grained PAT with public
// read access is enough), authenticated requests get 5,000/hour instead.
export function githubHeaders(): HeadersInit {
    const headers: HeadersInit = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
}

export interface CommitEntry {
    hash: string;
    date: string;
    subject: string;
    // null (rather than 0) means "couldn't be fetched" so the UI can hide
    // the diff badge instead of confidently showing +0/-0 for a commit
    // whose stats call failed or is still loading.
    additions: number | null;
    deletions: number | null;
}

interface GhCommit {
    sha: string;
    commit: {
        author: { date: string } | null;
        message: string;
    };
}

interface GhCommitDetail extends GhCommit {
    stats?: { additions: number; deletions: number; total: number };
}

// A commit's diff stats are content-addressed and immutable — the sha can
// never point to a different diff — so this is cached far longer (30 days)
// than the list endpoint (which does need to notice new commits). Once any
// visitor has ever loaded a given commit's stats, every later view of it
// (any page, any per_page grouping, anyone) reuses that one cached call for
// the rest of the month instead of re-spending rate-limit budget on data
// that was never going to change.
async function fetchStats(
    sha: string,
    headers: HeadersInit
): Promise<{ additions: number; deletions: number } | null> {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${sha}`, {
            headers,
            next: { revalidate: 60 * 60 * 24 * 30 },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as GhCommitDetail;
        if (!data.stats) return null;
        return { additions: data.stats.additions, deletions: data.stats.deletions };
    } catch {
        return null;
    }
}

// Fetches one page of the commit list, then each commit's diff stats in
// parallel. `withStats` lets a caller opt out entirely (not needed today,
// but keeps the door open for a lightweight list-only fetch later) —
// currently always true from both call sites.
export async function fetchCommitsPage(
    page: number,
    perPage: number,
    headers: HeadersInit = githubHeaders()
): Promise<CommitEntry[] | null> {
    const res = await fetch(
        `https://api.github.com/repos/${REPO}/commits?per_page=${perPage}&page=${page}`,
        { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) {
        const remaining = res.headers.get("x-ratelimit-remaining");
        console.error(
            `GitHub API error fetching commits: ${res.status} (rate-limit remaining: ${remaining})`
        );
        return null; // distinct from a legitimately empty page (page past the end)
    }

    const raw = (await res.json()) as GhCommit[];
    return Promise.all(
        raw.map(async (c) => {
            const stats = await fetchStats(c.sha, headers);
            return {
                hash: c.sha.slice(0, 7),
                date: c.commit.author?.date ?? "",
                subject: c.commit.message.split("\n")[0],
                additions: stats?.additions ?? null,
                deletions: stats?.deletions ?? null,
            };
        })
    );
}

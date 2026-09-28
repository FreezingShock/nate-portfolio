import { NextRequest, NextResponse } from "next/server";

const REPO = "FreezingShock/nateanderson-dev";
const MAX_PER_PAGE = 20;

interface GhCommit {
    sha: string;
    commit: {
        author: { date: string } | null;
        message: string;
    };
}

// Server-side proxy for paginated commit fetches, so the browser never talks
// to api.github.com directly. Unauthenticated GitHub REST calls are capped
// at 60/hour PER IP — CommitHistory used to fetch straight from the client
// on every page/page-size change, so a handful of clicks during testing (or
// any one visitor paging around) could exhaust that budget entirely, which
// surfaced as "Couldn't reach the GitHub API" even though GitHub itself was
// fine. Routing through this route instead means:
// - Next's fetch cache (`revalidate` below) shares one real GitHub call
//   across every visitor hitting the same page/per_page combo within the
//   window, instead of each browser spending its own quota per click.
// - If GITHUB_TOKEN is ever set in the environment, authenticated requests
//   get a 5,000/hour ceiling instead of 60 — optional, not required.
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const perPageRaw = Number(searchParams.get("per_page")) || 10;
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, perPageRaw));

    const headers: HeadersInit = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const res = await fetch(
            `https://api.github.com/repos/${REPO}/commits?per_page=${perPage}&page=${page}`,
            { headers, next: { revalidate: 3600 } }
        );

        if (!res.ok) {
            const remaining = res.headers.get("x-ratelimit-remaining");
            console.error(
                `GitHub API error fetching commits: ${res.status} (rate-limit remaining: ${remaining})`
            );
            return NextResponse.json(
                { error: "Upstream GitHub API error" },
                { status: 502 }
            );
        }

        const raw = (await res.json()) as GhCommit[];
        const commits = raw.map((c) => ({
            hash: c.sha.slice(0, 7),
            date: c.commit.author?.date ?? "",
            subject: c.commit.message.split("\n")[0],
        }));

        return NextResponse.json(commits, {
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
        });
    } catch (err) {
        console.error("Failed to reach GitHub API:", err);
        return NextResponse.json({ error: "Failed to reach GitHub API" }, { status: 502 });
    }
}

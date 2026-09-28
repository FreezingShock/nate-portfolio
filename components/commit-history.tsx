"use client";

import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommitEntry {
    hash: string;
    date: string; // full ISO timestamp — kept whole so formatDate can render
    // it in the site's UTC-anchored "Month Day, Year" style without a
    // timezone-dependent off-by-one day.
    subject: string;
}

interface GhCommit {
    sha: string;
    commit: {
        author: { date: string } | null;
        message: string;
    };
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

// "September 28, 2026" — month spelled out, no leading zero on the day
// (Intl's `day: "numeric"` never adds one). `timeZone: "UTC"` keeps this in
// sync with the ISO date GitHub returns instead of drifting a day depending
// on the viewer's local timezone.
function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

function parseCommits(raw: GhCommit[]): CommitEntry[] {
    return raw.map((c) => ({
        hash: c.sha.slice(0, 7),
        date: c.commit.author?.date ?? "",
        subject: c.commit.message.split("\n")[0],
    }));
}

export function CommitHistory({
    repo,
    totalCommits,
    initialCommits,
    initialPerPage,
    accent,
}: {
    repo: string;
    totalCommits: number;
    initialCommits: CommitEntry[];
    initialPerPage: number;
    accent: string;
}) {
    const [perPage, setPerPage] = useState(initialPerPage);
    const [page, setPage] = useState(1);
    const [commits, setCommits] = useState(initialCommits);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const totalPages = Math.max(1, Math.ceil(totalCommits / perPage));

    useEffect(() => {
        // Skip the initial mount — page 1 at the server-rendered perPage is
        // already on screen via initialCommits, so this effect only needs
        // to run for a page/perPage change the user actually makes.
        if (page === 1 && perPage === initialPerPage) return;

        const controller = new AbortController();
        setLoading(true);
        setError(false);

        fetch(
            `https://api.github.com/repos/${repo}/commits?per_page=${perPage}&page=${page}`,
            { headers: { Accept: "application/vnd.github+json" }, signal: controller.signal }
        )
            .then((res) => {
                if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
                return res.json();
            })
            .then((raw: GhCommit[]) => setCommits(parseCommits(raw)))
            .catch((err) => {
                if (err.name !== "AbortError") setError(true);
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, perPage]);

    function handlePerPageChange(next: number) {
        setPerPage(next);
        setPage(1);
    }

    const startNumber = totalCommits - (page - 1) * perPage;

    const controls = (
        <div className="flex items-center justify-center gap-1.5 sm:justify-end">
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page === 1}
                onClick={() => setPage(1)}
                aria-label="First page"
            >
                <ChevronsLeft className="size-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
            >
                <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[5.5rem] px-2 text-center font-mono text-xs text-muted-foreground">
                Page {page} of {totalPages}
            </span>
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
            >
                <ChevronRight className="size-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="Last page"
            >
                <ChevronsRight className="size-4" />
            </Button>
        </div>
    );

    return (
        <div>
            {/* Top bar: page-size selector + the same first/prev/next/last
                controls that repeat at the bottom — so either end of a long
                list is one tap from re-paging, on desktop or mobile. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    Show
                    <select
                        value={perPage}
                        onChange={(e) => handlePerPageChange(Number(e.target.value))}
                        className="rounded-md border border-border/60 bg-card/60 px-2 py-1 font-mono text-xs text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        aria-label="Commits per page"
                    >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                    per page
                </label>
                {controls}
            </div>

            <ol
                className={cn(
                    "relative mt-6 border-l border-border/60 pl-8 transition-opacity",
                    loading && "opacity-50"
                )}
                aria-busy={loading}
            >
                {error ? (
                    <p className="text-sm text-muted-foreground">
                        Couldn&apos;t reach the GitHub API right now — check back shortly.
                    </p>
                ) : (
                    commits.map((entry, i) => (
                        <li key={entry.hash} className="mb-6 last:mb-0">
                            <span
                                className="absolute -left-[7px] flex size-3.5 items-center justify-center rounded-full border-2 border-background"
                                style={{ backgroundColor: accent }}
                            />
                            <p className="flex flex-wrap items-baseline gap-x-2 text-xs uppercase tracking-wider text-muted-foreground">
                                <span
                                    className="font-mono font-semibold normal-case"
                                    style={{ color: accent }}
                                >
                                    #{startNumber - i}
                                </span>
                                <span>{formatDate(entry.date)}</span>
                                <span aria-hidden>·</span>
                                <a
                                    href={`https://github.com/${repo}/commit/${entry.hash}`}
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
                    ))
                )}
            </ol>

            <div className="mt-8 flex justify-center border-t border-border/40 pt-6 sm:justify-end">
                {controls}
            </div>
        </div>
    );
}

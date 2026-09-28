"use client";

import { useEffect, useRef, useState } from "react";
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

// Clamp helper used in a few places below so "page" can never end up outside
// [1, totalPages] no matter what triggered the change — a stale prop, a
// totalCommits of 0, a page-size change that shrinks the page count out from
// under the current page, etc.
function clampPage(page: number, totalPages: number): number {
    if (!Number.isFinite(page)) return 1;
    return Math.min(Math.max(1, page), Math.max(1, totalPages));
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

    // Guards against every source of staleness at once:
    // - `isMounted`: skip exactly one fetch — the very first render, whose
    //   data the server already sent as `initialCommits`. Everything after
    //   that always fetches, so navigating back to page 1 / the default
    //   page size re-fetches instead of silently reusing whatever the OLD
    //   effect run last set (the previous bug: it compared page/perPage
    //   back to their initial VALUES, which recur — page 1 and the default
    //   page size are both things a user returns to — so the effect kept
    //   bailing out and leaving stale commits on screen with a page number
    //   that no longer matched what was rendered).
    // - `requestId`: every effect run stamps a ticket; a response only ever
    //   commits to state if its ticket is still the latest one. Two
    //   in-flight requests (e.g. someone double-clicking Next) can now only
    //   ever have the newer one win, regardless of which resolves first —
    //   the AbortController below also cancels the network request itself,
    //   but this is the guard that actually matters for correctness.
    const isMounted = useRef(false);
    const requestId = useRef(0);

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        const thisRequest = ++requestId.current;
        const controller = new AbortController();
        setLoading(true);
        setError(false);

        // Same-origin API route instead of hitting api.github.com straight
        // from the browser: GitHub's unauthenticated REST API is capped at
        // 60 requests/HOUR PER IP, and every page/page-size click used to
        // spend one of those directly — a handful of clicks (or a shared
        // office/school IP) could exhaust it and surface as "Couldn't reach
        // the GitHub API" even though GitHub itself was fine. The route
        // (app/api/commits/route.ts) fetches server-side with an hour-long
        // cache, so many visitors paging around the same page/size combo
        // share one real GitHub call instead of each spending their own.
        fetch(`/api/commits?per_page=${perPage}&page=${page}`, {
            signal: controller.signal,
        })
            .then((res) => {
                if (!res.ok) throw new Error(`Commit API error: ${res.status}`);
                return res.json();
            })
            .then((data: CommitEntry[]) => {
                if (requestId.current !== thisRequest) return; // superseded — ignore
                setCommits(data);
            })
            .catch((err) => {
                if (requestId.current !== thisRequest) return;
                if (err?.name !== "AbortError") setError(true);
            })
            .finally(() => {
                if (requestId.current === thisRequest) setLoading(false);
            });

        return () => controller.abort();
    }, [page, perPage]);

    // Defensive clamp: if totalCommits ever changes (a revalidated server
    // fetch handing this component new props) or perPage changes in a way
    // that shrinks totalPages below the current page, snap back into range
    // instead of leaving `page` pointing past the end — the direct cause of
    // the negative commit numbers, since a too-high page makes
    // `(page - 1) * perPage` exceed totalCommits.
    useEffect(() => {
        setPage((p) => clampPage(p, totalPages));
    }, [totalPages]);

    function handlePerPageChange(next: number) {
        setPerPage(next);
        setPage(1);
    }

    function goToPage(next: number) {
        setPage(clampPage(next, totalPages));
    }

    // Belt-and-suspenders against the exact symptom reported (negative
    // numbers on mobile): even if `page`/`perPage` ever momentarily
    // disagree with totalCommits between renders, neither the start number
    // nor each row's number can go below 1.
    const startNumber = Math.max(1, totalCommits - (page - 1) * perPage);
    const busy = loading;

    const controls = (
        <div className="flex items-center justify-center gap-1.5 sm:justify-end">
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={busy || page <= 1}
                onClick={() => goToPage(1)}
                aria-label="First page"
            >
                <ChevronsLeft className="size-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={busy || page <= 1}
                onClick={() => goToPage(page - 1)}
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
                disabled={busy || page >= totalPages}
                onClick={() => goToPage(page + 1)}
                aria-label="Next page"
            >
                <ChevronRight className="size-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={busy || page >= totalPages}
                onClick={() => goToPage(totalPages)}
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
                        disabled={busy}
                        onChange={(e) => handlePerPageChange(Number(e.target.value))}
                        className="rounded-md border border-border/60 bg-card/60 px-2 py-1 font-mono text-xs text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
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
                                    #{Math.max(1, startNumber - i)}
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

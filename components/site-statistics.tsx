import Link from "next/link";
import { ArrowRight, ArrowUpRight, Code2, FolderTree, GitCommitHorizontal } from "lucide-react";
import { REPO, fetchRecentCommits } from "@/lib/github";
import { getRepoStats, getTotalCommitCount } from "@/lib/site-stats";
import { SectionLabel } from "@/components/section-label";
import { GlowCard } from "@/components/glow-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Marquee } from "@/components/ui/marquee";
import { RelativeTime } from "@/components/relative-time";
import { mcColorFor } from "@/lib/mc-colors";

// Server component: pulls the same numbers as /history through the same
// cached GitHub calls. It is wrapped in <Suspense> on the landing page, so a
// cold GitHub cache never delays the hero.
export async function SiteStatistics() {
    const [commitCount, { fileCount, linesOfCode }, recent] = await Promise.all([
        getTotalCommitCount(),
        getRepoStats(),
        fetchRecentCommits(8),
    ]);

    const stats = [
        {
            label: "Commits",
            value: commitCount,
            color: "var(--mc-red)",
            Icon: GitCommitHorizontal,
            description: "Every change to this site, saved to GitHub one small step at a time.",
        },
        {
            label: "Lines of Code",
            value: linesOfCode,
            color: "var(--mc-gold)",
            Icon: Code2,
            description: "Hand-written TypeScript, CSS and content powering every page you see.",
        },
        {
            label: "Files",
            value: fileCount,
            color: "var(--mc-aqua)",
            Icon: FolderTree,
            description: "Pages, components and assets that make up the whole project.",
        },
    ];

    const latest = recent[0];

    return (
        <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between gap-4">
                <SectionLabel accent="var(--mc-red)" symbol="critDamage">
                    Site Statistics
                </SectionLabel>
                <Link
                    href="/history"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    Full history <ArrowRight className="size-3.5" />
                </Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                This site is never finished, and these numbers are{" "}
                <span className="font-minecraft" style={{ color: "var(--mc-green)" }}>
                    read live from GitHub
                </span>
                , so they climb every time something new ships.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {stats.map(({ label, value, color, Icon, description }) => (
                    <GlowCard key={label} color={color} className="p-5">
                        <div className="flex items-start justify-between">
                            <span
                                className="flex size-10 items-center justify-center rounded-lg"
                                style={{
                                    color,
                                    backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
                                }}
                            >
                                <Icon className="size-5" />
                            </span>
                            <span
                                className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                                style={{ color }}
                            >
                                {label}
                            </span>
                        </div>
                        <p className="mt-4 font-mono text-4xl font-bold tabular-nums">
                            {value > 0 ? (
                                <NumberTicker value={value} style={{ color }} />
                            ) : (
                                <span style={{ color }}>&mdash;</span>
                            )}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                    </GlowCard>
                ))}
            </div>

            {latest && (
                <GlowCard color="var(--mc-green)" className="mt-4 p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-2 font-minecraft text-xs font-bold uppercase tracking-wider text-mc-green">
                            <span
                                className="dot-blink size-2 rounded-full bg-[#55ff55]"
                                style={{ boxShadow: "0 0 8px #55ff55" }}
                            />
                            Latest commit
                        </span>
                        <span className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {latest.hash}
                        </span>
                        <RelativeTime iso={latest.date} className="text-xs text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-base font-semibold leading-snug sm:text-lg">{latest.subject}</p>
                    <a
                        href={`https://github.com/${REPO}/commit/${latest.sha}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                    >
                        View on GitHub <ArrowUpRight className="size-3.5" />
                    </a>
                </GlowCard>
            )}

            {recent.length > 1 && (
                // Ticker of recent commits — pure CSS transform scroll,
                // pauses while hovered so a commit can actually be read.
                <div className="relative mt-4 overflow-hidden rounded-xl border border-border/50">
                    <Marquee pauseOnHover className="[--duration:45s] [--gap:0.75rem]" repeat={3}>
                        {recent.map((c) => {
                            const color = mcColorFor(c.hash);
                            return (
                                <a
                                    key={c.sha}
                                    href={`https://github.com/${REPO}/commit/${c.sha}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-white/5"
                                    style={{
                                        borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
                                        backgroundColor: `color-mix(in oklch, ${color} 8%, transparent)`,
                                    }}
                                >
                                    <span className="font-mono font-bold" style={{ color }}>
                                        {c.hash}
                                    </span>
                                    <span className="max-w-[22rem] truncate text-muted-foreground">
                                        {c.subject}
                                    </span>
                                </a>
                            );
                        })}
                    </Marquee>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
                </div>
            )}
        </div>
    );
}

export function SiteStatisticsSkeleton() {
    return (
        <div className="mx-auto max-w-6xl">
            <SectionLabel accent="var(--mc-red)" symbol="critDamage">
                Site Statistics
            </SectionLabel>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-xl border border-border/50 bg-card/40" />
                ))}
            </div>
        </div>
    );
}

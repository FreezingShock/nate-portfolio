import Link from "next/link";
import { ArrowLeft, ArrowRight, ImageIcon, Lock, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GlowCard } from "@/components/glow-card";
import { McSymbol } from "@/components/mc-symbol";
import { PageBackground } from "@/components/page-background";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { SectionLabel } from "@/components/section-label";
import { mcColorFor } from "@/lib/mc-colors";
import { statusLabel, type Project } from "@/lib/content";
import { getProjectIcon } from "@/lib/project-icons";
import {
    CATEGORIES,
    GAME_STATUS,
    PRINCIPLES,
    type ArtCollection,
    type CreationCategory,
    type Game,
    type GameMode,
} from "@/lib/creations-data";

// Server components shared by /creations and its category pages, so every
// Creations page uses the same cards, headers and spacing as the rest of the
// site (GlowCard, SectionLabel, Minecraft-colored pills).

const tint = (c: string, pct: number) =>
    `color-mix(in oklch, ${c} ${pct}%, transparent)`;

export function IconBadge({
    icon: Icon,
    color,
    size = "md",
}: {
    icon: LucideIcon;
    color: string;
    size?: "md" | "lg";
}) {
    return (
        <span
            className={`grid shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${size === "lg" ? "size-14" : "size-11"}`}
            style={{
                color,
                backgroundColor: tint(color, 16),
                boxShadow: `inset 0 0 0 1px ${tint(color, 35)}`,
            }}
        >
            <Icon className={size === "lg" ? "size-7" : "size-5"} />
        </span>
    );
}

export function Pill({
    children,
    color,
    solid = false,
}: {
    children: React.ReactNode;
    color: string;
    solid?: boolean;
}) {
    return (
        <span
            className="rounded-full border px-2 py-0.5 font-rubik text-[10px] font-semibold"
            style={{
                color,
                borderColor: tint(color, 50),
                backgroundColor: solid ? tint(color, 14) : undefined,
            }}
        >
            {children}
        </span>
    );
}

/** Page frame: background, sidebar nav, hero and a back link on sub-pages. */
export function CreationsShell({
    bg,
    accent,
    nav,
    eyebrow,
    title,
    description,
    symbol,
    back,
    wide = false,
    children,
}: {
    bg: string;
    accent: string;
    nav: { id: string; label: string }[];
    eyebrow: string;
    title: string;
    description: string;
    symbol: React.ComponentProps<typeof PageHero>["symbol"];
    back?: { href: string; label: string };
    /** Let a section run edge to edge (see Section's `bleed`); the others keep the 6xl column. */
    wide?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="grid" color={bg} />
            <SidebarNav sections={nav} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                {back && (
                    <div className="mx-auto mb-6 max-w-6xl">
                        <Link
                            href={back.href}
                            className="-my-2 inline-flex items-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="size-3.5" /> {back.label}
                        </Link>
                    </div>
                )}
                <PageHero
                    eyebrow={eyebrow}
                    title={title}
                    description={description}
                    accent={accent}
                    symbol={symbol}
                />
                <div className={wide ? "mt-14" : "mx-auto mt-14 max-w-6xl"}>{children}</div>
            </section>
        </div>
    );
}

export function Section({
    id,
    accent,
    symbol,
    title,
    blurb,
    children,
    first = false,
    bleed = false,
}: {
    id: string;
    accent: string;
    symbol: React.ComponentProps<typeof SectionLabel>["symbol"];
    title: string;
    blurb?: string;
    children: React.ReactNode;
    first?: boolean;
    /** Let the content run wider than the 6xl column, up to 1800px, keeping the page margins (only inside a `wide` shell). */
    bleed?: boolean;
}) {
    return (
        <section id={id} className={`${bleed ? "scroll-mt-[-44px]" : "scroll-mt-24"} ${first ? "" : "mt-20"}`}>
            <div className="mx-auto max-w-6xl">
                <SectionLabel accent={accent} symbol={symbol}>
                    {title}
                </SectionLabel>
                {blurb && (
                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                        {blurb}
                    </p>
                )}
            </div>
            <div className={bleed ? "mx-auto mt-6 max-w-[1800px]" : "mx-auto mt-6 max-w-6xl"}>{children}</div>
        </section>
    );
}

/** The four category doors on the hub. */
export function CategoryGrid({
    counts,
}: {
    counts: Record<CreationCategory["id"], number>;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
                <Link key={c.id} href={c.href} className="group block">
                    <GlowCard color={c.color} className="h-full p-5">
                        <div className="flex items-start justify-between">
                            <IconBadge icon={c.icon} color={c.color} size="lg" />
                            <span
                                className="text-2xl"
                                style={{ color: c.color }}
                            >
                                <McSymbol name={c.symbol} />
                            </span>
                        </div>
                        <h3
                            className="mt-4 font-minecraft text-xl font-bold"
                            style={{ color: c.color }}
                        >
                            {c.title}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {c.blurb}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                            {c.tags.map((t) => (
                                <Pill key={t} color={c.color}>
                                    {t}
                                </Pill>
                            ))}
                            <span
                                className="ml-auto flex items-center gap-1 font-mono text-xs font-semibold transition-transform duration-300 group-hover:translate-x-1"
                                style={{ color: c.color }}
                            >
                                {counts[c.id]} inside <ArrowRight className="size-3.5" />
                            </span>
                        </div>
                    </GlowCard>
                </Link>
            ))}
        </div>
    );
}

export function PhilosophyGrid() {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
                <GlowCard key={p.title} color={p.color} className="h-full p-5">
                    <h3
                        className="flex items-center gap-2 font-minecraft text-lg font-bold"
                        style={{ color: p.color }}
                    >
                        <McSymbol name={p.symbol} />
                        {p.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {p.text}
                    </p>
                </GlowCard>
            ))}
        </div>
    );
}

function GameCard({ game, color }: { game: Game; color: string }) {
    const st = GAME_STATUS[game.status];
    const body = (
        <GlowCard color={color} className="h-full p-5">
            <div className="flex items-start justify-between gap-3">
                <IconBadge icon={game.icon} color={color} />
                <Pill color={st.color} solid>
                    {st.label}
                </Pill>
            </div>
            <h4
                className="mt-4 font-minecraft text-lg font-bold leading-tight"
                style={{ color }}
            >
                {game.title}
            </h4>
            <p className="mt-1.5 text-sm text-muted-foreground">{game.blurb}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
                {game.features.map((f) => (
                    <li key={f}>
                        <Pill color={mcColorFor(f)}>{f}</Pill>
                    </li>
                ))}
            </ul>
            <div
                className="mt-4 flex items-center gap-1.5 font-mono text-xs font-semibold"
                style={{ color: game.href ? color : "var(--muted-foreground)" }}
            >
                {game.href ? (
                    <>
                        <Play className="size-3.5" /> Play now
                    </>
                ) : (
                    <>
                        <Lock className="size-3.5" /> Placeholder, not built yet
                    </>
                )}
            </div>
        </GlowCard>
    );
    return game.href ? (
        <Link href={game.href} className="group block">
            {body}
        </Link>
    ) : (
        <div className="group">{body}</div>
    );
}

/** One game mode: header strip with its own color, then its game cards. */
export function GameModeSection({
    mode,
    first = false,
}: {
    mode: GameMode;
    first?: boolean;
}) {
    return (
        <Section
            id={mode.id}
            first={first}
            accent={mode.color}
            symbol={mode.symbol}
            title={mode.title}
            blurb={`${mode.tagline} ${mode.about}`}
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mode.games.map((g) => (
                    <GameCard key={g.slug} game={g} color={mode.color} />
                ))}
            </div>
        </Section>
    );
}

/** Project / renovation grid backed by Supabase rows. */
export function ProjectGrid({
    projects,
    color,
    fallbackIcon,
}: {
    projects: Project[];
    color: string;
    fallbackIcon: LucideIcon;
}) {
    if (projects.length === 0) {
        return (
            <GlowCard color={color} className="p-10 text-center">
                <p className="text-muted-foreground">
                    Nothing here yet. Check back soon.
                </p>
            </GlowCard>
        );
    }
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
                const { icon } = getProjectIcon(p.slug);
                const Icon = icon ?? fallbackIcon;
                const st = mcColorFor(p.status);
                return (
                    <Link
                        key={p.slug}
                        href={`/creations/${p.slug}`}
                        className="group block"
                    >
                        <GlowCard color={color} className="h-full p-5">
                            <div className="flex items-start justify-between gap-3">
                                <IconBadge icon={Icon} color={color} />
                                <Pill color={st} solid>
                                    {statusLabel[p.status]}
                                </Pill>
                            </div>
                            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                {p.category}
                            </p>
                            <h4
                                className="mt-1 font-minecraft text-lg font-bold leading-tight"
                                style={{ color }}
                            >
                                {p.title}
                            </h4>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                {p.description}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                {p.tags.map((t) => (
                                    <Pill key={t} color={mcColorFor(t)}>
                                        {t}
                                    </Pill>
                                ))}
                                <span
                                    className="ml-auto flex items-center gap-1 font-mono text-xs font-semibold transition-transform duration-300 group-hover:translate-x-1"
                                    style={{ color }}
                                >
                                    Open <ArrowRight className="size-3.5" />
                                </span>
                            </div>
                        </GlowCard>
                    </Link>
                );
            })}
        </div>
    );
}

/** Empty image slots, ready for real artwork. */
export function ArtCollectionSection({
    collection,
}: {
    collection: ArtCollection;
}) {
    const c = collection.color;
    return (
        <Section
            id={collection.id}
            accent={c}
            symbol={collection.symbol}
            title={collection.title}
            blurb={collection.blurb}
        >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {collection.slots.map((slot) => (
                    <GlowCard key={slot} color={c} className="overflow-hidden">
                        <div
                            className="grid aspect-[4/3] place-items-center"
                            style={{
                                backgroundImage: `repeating-linear-gradient(135deg, ${tint(c, 9)} 0 10px, transparent 10px 20px)`,
                            }}
                        >
                            <ImageIcon
                                className="size-8 opacity-60"
                                style={{ color: c }}
                            />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 p-3">
                            <span className="text-sm font-medium">{slot}</span>
                            <Pill color={c}>Placeholder</Pill>
                        </div>
                    </GlowCard>
                ))}
            </div>
        </Section>
    );
}

import Link from "next/link";
import { getProjects, getRecentRenovations } from "@/lib/content";
import { GlowCard } from "@/components/glow-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import {
    CategoryGrid,
    CreationsShell,
    PhilosophyGrid,
    Section,
} from "@/components/creations-sections";
import {
    ART_COLLECTIONS,
    GAME_MODES,
    allGames,
    categoryById,
} from "@/lib/creations-data";

export const revalidate = 60;

// The hub: overview numbers, the four doors (each its own page), and the
// philosophy behind all of it. Projects and renovations still come from
// Supabase; games and artwork live in lib/creations-data.ts.
export default async function CreationsPage() {
    const [projects, renovations] = await Promise.all([
        getProjects(),
        getRecentRenovations(),
    ]);
    const games = allGames();
    const playable = games.filter((g) => g.status === "playable").length;

    const stats = [
        { label: "Web app games", value: games.length, color: "var(--mc-green)" },
        { label: "Playable now", value: playable, color: "var(--mc-yellow)" },
        { label: "Projects", value: projects.length, color: "var(--mc-aqua)" },
        { label: "Renovations", value: renovations.length, color: "var(--mc-gold)" },
        {
            label: "Art collections",
            value: ART_COLLECTIONS.length,
            color: "var(--mc-light-purple)",
        },
    ];

    return (
        <CreationsShell
            bg="#55ffff"
            accent="var(--mc-aqua)"
            nav={[
                { id: "overview", label: "Overview" },
                { id: "explore", label: "Explore" },
                { id: "philosophy", label: "Philosophy" },
                { id: "roadmap", label: "Game Roadmap" },
            ]}
            eyebrow="Made"
            title="Creations"
            symbol="forge"
            description="Everything I build: games you can play here, coding and Roblox projects, renovation studies of real places, and the artwork around it all."
        >
            <Section
                id="overview"
                first
                accent="var(--mc-gold)"
                symbol="flag"
                title="At a Glance"
                blurb="What's on the workbench right now."
            >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {stats.map((s) => (
                        <GlowCard
                            key={s.label}
                            color={s.color}
                            className="p-4 text-center"
                        >
                            <p
                                className="font-mono text-4xl font-bold tabular-nums"
                                style={{ color: s.color }}
                            >
                                <NumberTicker
                                    value={s.value}
                                    style={{ color: s.color }}
                                />
                            </p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                {s.label}
                            </p>
                        </GlowCard>
                    ))}
                </div>
            </Section>

            <Section
                id="explore"
                accent="var(--mc-light-purple)"
                symbol="comet"
                title="Explore Creations"
                blurb="Four rooms, one workshop. Pick a door."
            >
                <CategoryGrid
                    counts={{
                        games: games.length,
                        projects: projects.length,
                        renovations: renovations.length,
                        artwork: ART_COLLECTIONS.length,
                    }}
                />
            </Section>

            <Section
                id="philosophy"
                accent="var(--mc-aqua)"
                symbol="wisdom"
                title="Creation Philosophy"
                blurb="Why I make things the way I do. (Draft wording: I'll rewrite it in my own voice.)"
            >
                <PhilosophyGrid />
            </Section>

            <Section
                id="roadmap"
                accent={categoryById("games").color}
                symbol="fortune"
                title="Game Roadmap"
                blurb="The plan for games on this site, mode by mode. Each links to its full list."
            >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {GAME_MODES.map((m) => {
                        const Icon = m.icon;
                        return (
                            <Link
                                key={m.id}
                                href={`/creations/games#${m.id}`}
                                className="group block"
                            >
                                <GlowCard color={m.color} className="h-full p-5">
                                    <Icon
                                        className="size-6"
                                        style={{ color: m.color }}
                                    />
                                    <h3
                                        className="mt-3 font-minecraft text-base font-bold"
                                        style={{ color: m.color }}
                                    >
                                        {m.title}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-muted-foreground">
                                        {m.tagline}
                                    </p>
                                    <p className="mt-3 font-mono text-xs text-muted-foreground">
                                        {m.games.length} planned or playable
                                    </p>
                                </GlowCard>
                            </Link>
                        );
                    })}
                </div>
            </Section>
        </CreationsShell>
    );
}

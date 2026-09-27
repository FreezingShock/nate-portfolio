export function PageHero({
    eyebrow,
    title,
    description,
    accent,
}: {
    eyebrow: string;
    title: string;
    description: string;
    /** CSS color (e.g. a --mc-* token) for the title. Eyebrow stays neutral gray. */
    accent?: string;
}) {
    return (
        <div className="mx-auto max-w-6xl">
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
            </p>
            <h1
                className="mt-3 font-minecraft text-4xl font-bold tracking-tight sm:text-5xl"
                style={{ color: accent ?? "var(--primary)" }}
            >
                {title}
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">{description}</p>
        </div>
    );
}

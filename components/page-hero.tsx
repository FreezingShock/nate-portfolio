export function PageHero({
    eyebrow,
    title,
    description,
    accent,
}: {
    eyebrow: string;
    title: string;
    description: string;
    /** CSS color (e.g. a --mc-* token) overriding the default primary accent. */
    accent?: string;
}) {
    return (
        <div className="mx-auto max-w-6xl">
            <p
                className="text-sm uppercase tracking-[0.2em]"
                style={{ color: accent ?? "var(--primary)" }}
            >
                {eyebrow}
            </p>
            <h1 className="mt-3 font-minecraft text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {title}
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">{description}</p>
        </div>
    );
}

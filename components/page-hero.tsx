export function PageHero({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="mx-auto max-w-6xl">
            <p className="text-sm uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {title}
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">{description}</p>
        </div>
    );
}

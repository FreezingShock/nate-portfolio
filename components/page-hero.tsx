import { McSymbol, type McSymbolName } from "@/components/mc-symbol";

export function PageHero({
    eyebrow,
    title,
    description,
    accent,
    symbol,
}: {
    eyebrow: string;
    title: React.ReactNode;
    description: string;
    /** CSS color (e.g. a --mc-* token) for the title. Eyebrow stays neutral gray. */
    accent?: string;
    /** Hypixel-style glyph shown before the title, colored like it. */
    symbol?: McSymbolName;
}) {
    return (
        <div className="mx-auto max-w-6xl">
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
            </p>
            <h1
                className="mt-3 flex items-center gap-3 font-minecraft text-4xl font-bold tracking-tight sm:text-5xl"
                style={{ color: accent ?? "var(--primary)" }}
            >
                {symbol && <McSymbol name={symbol} />}
                <span>{title}</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">{description}</p>
        </div>
    );
}

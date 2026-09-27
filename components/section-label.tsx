export function SectionLabel({
    children,
    accent,
}: {
    children: React.ReactNode;
    /** CSS color (e.g. a --mc-* token) for the whole label. */
    accent?: string;
}) {
    return (
        <h2
            className="flex items-baseline gap-2 font-minecraft text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: accent ?? "var(--primary)" }}
        >
            <span>{">"}</span>
            {children}
        </h2>
    );
}

export function SectionLabel({
    children,
    accent,
}: {
    children: React.ReactNode;
    /** CSS color (e.g. a --mc-* token) overriding the default primary accent. */
    accent?: string;
}) {
    return (
        <h2 className="flex items-baseline gap-2 font-minecraft text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <span style={{ color: accent ?? "var(--primary)" }}>{">"}</span>
            {children}
        </h2>
    );
}

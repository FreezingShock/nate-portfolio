export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="flex items-baseline gap-2 font-minecraft text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <span className="text-primary">{">"}</span>
            {children}
        </h2>
    );
}

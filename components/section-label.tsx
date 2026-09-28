import type { LucideIcon } from "lucide-react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";

export function SectionLabel({
    children,
    accent,
    icon: Icon,
    symbol = "arrow",
}: {
    children: React.ReactNode;
    /** CSS color (e.g. a --mc-* token) for the whole label (and the icon, if given). */
    accent?: string;
    /** Optional leading icon, colored the same as the label. Wins over `symbol`. */
    icon?: LucideIcon;
    /** Hypixel-style leading glyph, colored like the label. */
    symbol?: McSymbolName;
}) {
    return (
        <h2
            className="flex items-center gap-2 font-minecraft text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: accent ?? "var(--primary)" }}
        >
            {Icon ? (
                <Icon className="size-6 sm:size-7" />
            ) : (
                <McSymbol name={symbol} />
            )}
            {children}
        </h2>
    );
}

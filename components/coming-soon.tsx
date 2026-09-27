import type { LucideIcon } from "lucide-react";
import { ShineBorder } from "@/components/ui/shine-border";

interface PlaceholderCard {
    title: string;
    note: string;
    icon: LucideIcon;
}

// Shared "not written yet, but here's the shape of it" pattern for pages
// that are structurally real but don't have real entries yet (Blog,
// Creations, Studies). Each card is an honest placeholder, not fake content.
export function ComingSoon({ cards }: { cards: PlaceholderCard[] }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.title}
                        className="relative overflow-hidden rounded-xl border border-dashed border-border/60 bg-card/30 p-6"
                    >
                        <ShineBorder
                            borderWidth={1}
                            duration={16}
                            shineColor={["var(--primary)", "var(--chart-4)"]}
                        />
                        <Icon className="size-8 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold text-foreground">
                            {card.title}
                        </h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">{card.note}</p>
                        <span className="mt-4 inline-block rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground">
                            Coming soon
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

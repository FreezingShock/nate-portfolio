import type { LucideIcon } from "lucide-react";
import { mcColorFor } from "@/lib/mc-colors";
import { ShineBorder } from "@/components/ui/shine-border";
import { MagicCard } from "@/components/ui/magic-card";

export interface ProgramCard {
    title: string;
    color: string;
    icon: LucideIcon;
    description: string;
    institution?: string;
    timeline?: string;
    courses?: string[];
    placeholder?: boolean;
}

export function EducationProgramCard({
    card,
    index,
}: {
    card: ProgramCard;
    index?: number;
}) {
    const Icon = card.icon;
    return (
        <div className="relative">
            <MagicCard
                className="h-full rounded-xl"
                gradientFrom={card.color}
                gradientTo="var(--chart-4)"
                gradientColor="var(--accent)"
                gradientOpacity={0.5}
            >
                <div className="relative h-full overflow-hidden rounded-xl bg-card/40 p-6 backdrop-blur-xl">
                    <ShineBorder
                        borderWidth={1}
                        shineColor={[card.color, "var(--chart-4)"]}
                    />

                    {/* Header with icon */}
                    <div className="mb-4 flex items-start justify-between">
                        <Icon
                            className="size-6"
                            style={{ color: card.color }}
                        />
                        {card.placeholder && (
                            <span
                                className="rounded-full border px-2.5 py-0.5 font-rubik text-xs font-medium"
                                style={{
                                    color: card.color,
                                    borderColor: `color-mix(in oklch, ${card.color} 55%, transparent)`,
                                    backgroundColor: `color-mix(in oklch, ${card.color} 18%, var(--background) 60%)`,
                                }}
                            >
                                Planned
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h3
                        className="mb-2 font-rubik text-lg font-bold"
                        style={{ color: card.color }}
                    >
                        {card.title}
                    </h3>

                    {/* Institution */}
                    {card.institution && (
                        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase">
                            {card.institution}
                        </p>
                    )}

                    {/* Description */}
                    <p className="mb-4 text-sm text-muted-foreground">
                        {card.description}
                    </p>

                    {/* Timeline */}
                    {card.timeline && (
                        <div className="mb-4 border-l-2 border-opacity-30 pl-3" style={{ borderColor: card.color }}>
                            <p className="text-xs font-semibold text-muted-foreground">
                                Timeline
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {card.timeline}
                            </p>
                        </div>
                    )}

                    {/* Courses preview */}
                    {card.courses && card.courses.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {card.courses.slice(0, 3).map((course) => {
                                const courseColor = mcColorFor(course);
                                return (
                                    <span
                                        key={course}
                                        className="rounded-full border px-2 py-0.5 font-rubik text-xs font-medium"
                                        style={{
                                            color: courseColor,
                                            borderColor: `color-mix(in oklch, ${courseColor} 55%, transparent)`,
                                            backgroundColor: `color-mix(in oklch, ${courseColor} 15%, var(--background) 60%)`,
                                        }}
                                    >
                                        {course}
                                    </span>
                                );
                            })}
                            {card.courses.length > 3 && (
                                <span
                                    className="rounded-full border px-2 py-0.5 font-rubik text-xs font-medium"
                                    style={{
                                        color: card.color,
                                        borderColor: `color-mix(in oklch, ${card.color} 55%, transparent)`,
                                        backgroundColor: `color-mix(in oklch, ${card.color} 15%, var(--background) 60%)`,
                                    }}
                                >
                                    +{card.courses.length - 3} more
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </MagicCard>
        </div>
    );
}

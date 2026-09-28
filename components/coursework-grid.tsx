import type { LucideIcon } from "lucide-react";
import { mcColorFor } from "@/lib/mc-colors";
import { ShineBorder } from "@/components/ui/shine-border";
import { MagicCard } from "@/components/ui/magic-card";

export interface CourseData {
    title: string;
    slug: string;
    color: string;
    icon: LucideIcon;
    description: string;
    tags: string[];
    focus: string[];
    status: "In Progress" | "Completed" | "Upcoming";
    href?: string;
}

export function CourseworkGrid({ courses }: { courses: CourseData[] }) {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
                const Icon = course.icon;
                const CardWrapper = course.href ? 'a' : 'div';
                return (
                    <CardWrapper
                        key={course.slug}
                        href={course.href}
                        className={`relative ${course.href ? 'hover:opacity-90 transition-opacity cursor-pointer' : ''}`}
                    >
                        <MagicCard
                            className="h-full rounded-xl"
                            gradientFrom={course.color}
                            gradientTo="var(--chart-4)"
                            gradientColor="var(--accent)"
                            gradientOpacity={0.5}
                        >
                            <div className="relative h-full overflow-hidden rounded-xl bg-card/40 p-6 backdrop-blur-xl">
                                <ShineBorder
                                    borderWidth={1}
                                    shineColor={[course.color, "var(--chart-4)"]}
                                />

                                {/* Header with icon and status */}
                                <div className="mb-4 flex items-start justify-between">
                                    <Icon
                                        className="size-6"
                                        style={{ color: course.color }}
                                    />
                                    <span
                                        className="rounded-full border px-2.5 py-0.5 font-rubik text-xs font-medium"
                                        style={{
                                            color: course.color,
                                            borderColor: `color-mix(in oklch, ${course.color} 55%, transparent)`,
                                            backgroundColor: `color-mix(in oklch, ${course.color} 18%, var(--background) 60%)`,
                                        }}
                                    >
                                        {course.status}
                                    </span>
                                </div>

                                {/* Course title */}
                                <h3
                                    className="mb-2 font-rubik text-lg font-bold"
                                    style={{ color: course.color }}
                                >
                                    {course.title}
                                </h3>

                                {/* Description */}
                                <p className="mb-4 text-sm text-muted-foreground">
                                    {course.description}
                                </p>

                                {/* Focus areas */}
                                {course.focus.length > 0 && (
                                    <div className="mb-4">
                                        <p className="mb-2 text-xs font-semibold text-muted-foreground">
                                            Key Focus
                                        </p>
                                        <ul className="space-y-1">
                                            {course.focus.map((item, idx) => (
                                                <li
                                                    key={idx}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    • {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    {course.tags.map((tag) => {
                                        const tagColor = mcColorFor(tag);
                                        return (
                                            <span
                                                key={tag}
                                                className="rounded-full border px-2 py-0.5 font-rubik text-xs font-medium"
                                                style={{
                                                    color: tagColor,
                                                    borderColor: `color-mix(in oklch, ${tagColor} 55%, transparent)`,
                                                    backgroundColor: `color-mix(in oklch, ${tagColor} 15%, var(--background) 60%)`,
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </MagicCard>
                    </CardWrapper>
                );
            })}
        </div>
    );
}

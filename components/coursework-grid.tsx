import type { LucideIcon } from "lucide-react";
import { mcColorFor } from "@/lib/mc-colors";
import { ShineBorder } from "@/components/ui/shine-border";
import { MagicCard } from "@/components/ui/magic-card";
import { ArrowRight } from "lucide-react";

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
            <style>{`
                .course-card {
                    cursor: pointer;
                    position: relative;
                }
                .course-card .course-border {
                    border-color: currentColor;
                    border-opacity: 0.3;
                    transition: all 0.3s ease;
                }
                .course-card:hover .course-border {
                    border-opacity: 1;
                }
                .course-card .course-tags {
                    opacity: 0;
                    max-height: 0;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                .course-card:hover .course-tags {
                    opacity: 1;
                    max-height: 200px;
                    margin-bottom: 1rem;
                }
                .course-card .course-button {
                    opacity: 0;
                    transform: translateY(8px);
                    transition: all 0.3s ease;
                }
                .course-card:hover .course-button {
                    opacity: 1;
                    transform: translateY(0);
                }
                .course-card .course-magic-card {
                    transition: all 0.3s ease;
                }
                .course-card:hover .course-magic-card {
                    transform: scale(1.02);
                }
            `}</style>
            {courses.map((course) => {
                const Icon = course.icon;
                const CardWrapper = course.href ? 'a' : 'div';
                return (
                    <CardWrapper
                        key={course.slug}
                        href={course.href}
                        className="course-card"
                    >
                        <MagicCard
                            className="course-magic-card h-full rounded-xl"
                            gradientFrom={course.color}
                            gradientTo="var(--chart-4)"
                            gradientColor="var(--accent)"
                            gradientOpacity={0.5}
                        >
                            <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-card/40 p-6 backdrop-blur-xl">
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

                                {/* Spacer to push tags and button to bottom */}
                                <div className="flex-1" />

                                {/* Tags - Hidden by default, visible on hover */}
                                <div className="course-tags flex flex-wrap gap-2">
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

                                {/* View Class Button - Hidden by default, visible on hover */}
                                <div
                                    className="course-button flex items-center justify-between rounded-lg border px-3 py-2 font-rubik text-sm font-medium"
                                    style={{
                                        color: course.color,
                                        borderColor: `color-mix(in oklch, ${course.color} 55%, transparent)`,
                                        backgroundColor: `color-mix(in oklch, ${course.color} 18%, var(--background) 60%)`,
                                    }}
                                >
                                    <span>View Class</span>
                                    <ArrowRight className="size-4" />
                                </div>
                            </div>
                        </MagicCard>

                        {/* Clickable affordance border */}
                        <div
                            className="course-border pointer-events-none absolute inset-0 rounded-xl border"
                            style={{
                                color: course.color,
                            }}
                        />
                    </CardWrapper>
                );
            })}
        </div>
    );
}

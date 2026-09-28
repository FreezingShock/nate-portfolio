import { LucideIcon } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { ShineBorder } from "@/components/ui/shine-border";

export interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    date: string;
    status: "published" | "draft" | "coming-soon";
    color: string;
}

export interface BlogSectionProps {
    icon: LucideIcon;
    title: string;
    description: string;
    color: string;
    posts: BlogPost[];
}

export function BlogSection({ icon: Icon, title, description, color, posts }: BlogSectionProps) {
    return (
        <div className="mb-16 scroll-mt-24">
            {/* Section header */}
            <div className="mb-8 border-b border-border/40 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Icon className="size-6" style={{ color }} />
                    <p className="text-sm font-semibold uppercase tracking-widest" style={{ color }}>
                        {title}
                    </p>
                </div>
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                    {description}
                </p>
            </div>

            {/* Posts grid */}
            <div className="grid gap-6 sm:grid-cols-2">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <MagicCard
                            key={post.id}
                            gradientFrom={color}
                            gradientTo="var(--chart-4)"
                            gradientColor="var(--accent)"
                            gradientOpacity={0.5}
                            className="h-full rounded-xl"
                        >
                            <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-card/40 p-6 backdrop-blur-xl">
                                <ShineBorder
                                    borderWidth={1}
                                    shineColor={[color, "var(--chart-4)"]}
                                />

                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <span
                                            className="rounded-full border px-2 py-0.5 font-rubik text-xs font-medium"
                                            style={{
                                                color,
                                                borderColor: `color-mix(in oklch, ${color} 55%, transparent)`,
                                                backgroundColor: `color-mix(in oklch, ${color} 18%, var(--background) 60%)`,
                                            }}
                                        >
                                            {post.status === "published"
                                                ? "Published"
                                                : post.status === "draft"
                                                  ? "Draft"
                                                  : "Coming Soon"}
                                        </span>
                                        {post.date && (
                                            <span className="text-xs text-muted-foreground">
                                                {post.date}
                                            </span>
                                        )}
                                    </div>

                                    <h3
                                        className="font-minecraft text-lg font-bold mb-2"
                                        style={{ color }}
                                    >
                                        {post.title}
                                    </h3>

                                    <p className="text-sm text-muted-foreground">
                                        {post.excerpt}
                                    </p>
                                </div>

                                {post.status === "published" && (
                                    <div className="mt-4 pt-4 border-t border-border/20">
                                        <button
                                            className="text-sm font-medium transition-colors hover:opacity-80"
                                            style={{ color }}
                                        >
                                            Read more →
                                        </button>
                                    </div>
                                )}
                            </div>
                        </MagicCard>
                    ))
                ) : (
                    <div className="col-span-full rounded-lg border border-border/40 bg-background/20 p-8 text-center">
                        <p
                            className="text-sm font-semibold mb-2"
                            style={{ color }}
                        >
                            No posts yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Check back soon for {title.toLowerCase()}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

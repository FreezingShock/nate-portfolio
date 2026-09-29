import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionLabel } from "@/components/section-label";
import { GlowCard } from "@/components/glow-card";
import { blogSections, getRecentPosts } from "@/lib/blog";

function formatDate(iso: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

// Reads the same data as /blog. Shows the newest published posts; until the
// first post ships it shows a teaser for each category instead of an empty
// section, so the block is never blank.
export function RecentPosts() {
    const recent = getRecentPosts(3);
    const teasers = blogSections.slice(0, 3);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between gap-4">
                <SectionLabel accent="var(--mc-yellow)" symbol="intelligence">
                    Recent Posts
                </SectionLabel>
                <Link
                    href="/blog"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    All writing <ArrowRight className="size-3.5" />
                </Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {recent.length > 0
                    ? "The latest essays, notes and experiments."
                    : "The first posts are on the way — here's what's coming to the blog."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {recent.length > 0
                    ? recent.map((post) => (
                          <Link key={post.id} href={`/blog#${post.sectionId}`} className="block">
                              <GlowCard color={post.color} className="h-full p-5">
                                  <p
                                      className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                                      style={{ color: post.color }}
                                  >
                                      {post.category}
                                  </p>
                                  <h3 className="mt-2 font-minecraft text-base font-bold" style={{ color: post.color }}>
                                      {post.title}
                                  </h3>
                                  <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                                  <p className="mt-4 font-mono text-xs text-muted-foreground">{formatDate(post.date)}</p>
                              </GlowCard>
                          </Link>
                      ))
                    : teasers.map((section) => (
                          <Link key={section.title} href="/blog" className="block">
                              <GlowCard color={section.color} className="h-full p-5">
                                  <div className="flex items-center justify-between gap-2">
                                      <p
                                          className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                                          style={{ color: section.color }}
                                      >
                                          {section.title}
                                      </p>
                                      <span
                                          className="rounded-full border px-2 py-0.5 font-rubik text-[10px] font-medium"
                                          style={{
                                              color: section.color,
                                              borderColor: `color-mix(in oklch, ${section.color} 55%, transparent)`,
                                          }}
                                      >
                                          Coming Soon
                                      </span>
                                  </div>
                                  <p className="mt-3 text-sm text-muted-foreground">{section.description}</p>
                              </GlowCard>
                          </Link>
                      ))}
            </div>
        </div>
    );
}

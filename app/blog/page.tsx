import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { BlogSection } from "@/components/blog-section";
import { blogSections, BLOG_SECTION_IDS } from "@/lib/blog";



export default function BlogPage() {
    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="dot" color="#ffff55" />
            <SidebarNav
                sections={[
                    { id: "essays", label: "Essays" },
                    { id: "research", label: "Research" },
                    { id: "poetry", label: "Poetry" },
                    { id: "devlog", label: "Dev Log" },
                    { id: "snippets", label: "Snippets" },
                ]}
            />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Writing"
                    title="Blog & Essays"
                    description="Notes on systems design, game dev, philosophy, and whatever else is worth writing down. Long essays, research, poetry, technical writeups, and quick thoughts."
                    accent="var(--mc-yellow)"
                    symbol="intelligence"
                />

                <div className="mx-auto mt-16 max-w-4xl space-y-16 scroll-mt-24">
                    {blogSections.map((section, idx) => (
                        <div key={section.title} id={BLOG_SECTION_IDS[idx]}>
                            <BlogSection {...section} />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

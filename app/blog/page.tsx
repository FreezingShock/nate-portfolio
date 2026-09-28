import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { BlogSection, type BlogSectionProps } from "@/components/blog-section";

const blogSections: BlogSectionProps[] = [
    {
        title: "Essays & Articles",
        description: "Long-form writing on design systems, game development, philosophy, and engineering. Deep dives into problems I'm thinking about.",
        color: "var(--mc-gold)",
        posts: [
            {
                id: "essay-1",
                title: "Coming Soon",
                excerpt: "Essays exploring the intersection of philosophy, design, and engineering.",
                date: "",
                status: "coming-soon",
                color: "var(--mc-gold)",
            },
        ],
    },
    {
        title: "Research & Notes",
        description: "Research notes on sustainable systems, climate adaptation, circular design, and environmental engineering. Thinking in public.",
        color: "var(--mc-green)",
        posts: [
            {
                id: "research-1",
                title: "Coming Soon",
                excerpt: "Research on sustainable infrastructure and climate adaptation strategies.",
                date: "",
                status: "coming-soon",
                color: "var(--mc-green)",
            },
        ],
    },
    {
        title: "Poetry & Creative",
        description: "Poetry, short prose, and creative explorations. Kierkegaard-inspired existential meditations and design philosophy.",
        color: "var(--mc-light-purple)",
        posts: [
            {
                id: "poetry-1",
                title: "Coming Soon",
                excerpt: "Poetry and creative writing exploring authentic existence and design practice.",
                date: "",
                status: "coming-soon",
                color: "var(--mc-light-purple)",
            },
        ],
    },
    {
        title: "Dev & Design Log",
        description: "Technical writeups on building things. CAD, SketchUp, web development, game systems, and design iteration.",
        color: "var(--mc-blue)",
        posts: [
            {
                id: "devlog-1",
                title: "Coming Soon",
                excerpt: "Technical notes from building Fractured Islands and design experiments.",
                date: "",
                status: "coming-soon",
                color: "var(--mc-blue)",
            },
        ],
    },
    {
        title: "Snippets & Ideas",
        description: "Short-form observations, design patterns, code snippets, and random thoughts. Quick hits on things worth sharing.",
        color: "var(--mc-aqua)",
        posts: [
            {
                id: "snippet-1",
                title: "Coming Soon",
                excerpt: "Quick observations and design patterns collected from daily work.",
                date: "",
                status: "coming-soon",
                color: "var(--mc-aqua)",
            },
        ],
    },
];

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
                />

                <div className="mx-auto mt-16 max-w-4xl space-y-16 scroll-mt-24">
                    {blogSections.map((section, idx) => (
                        <div key={section.title} id={["essays", "research", "poetry", "devlog", "snippets"][idx]}>
                            <BlogSection {...section} />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

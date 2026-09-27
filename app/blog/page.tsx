import { NotebookPen, PenLine, BookOpen } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ComingSoon } from "@/components/coming-soon";
import { SidebarNav } from "@/components/sidebar-nav";

export default function BlogPage() {
    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "posts", label: "Posts" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Writing"
                    title="Blog & Essays"
                    description="Notes on systems design, game dev, and whatever else is worth writing down."
                    accent="var(--mc-yellow)"
                />
                <div id="posts" className="mt-10 scroll-mt-24">
                    <ComingSoon
                        cards={[
                            {
                                title: "First post",
                                note: "Nothing published yet — this is where posts will land.",
                                icon: NotebookPen,
                            },
                            {
                                title: "Essays",
                                note: "Longer-form pieces on design and building things.",
                                icon: PenLine,
                            },
                            {
                                title: "Reading log",
                                note: "Short reactions to what I'm reading.",
                                icon: BookOpen,
                            },
                        ]}
                    />
                </div>
            </section>
        </div>
    );
}

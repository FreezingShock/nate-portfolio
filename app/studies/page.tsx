import { GraduationCap, FlaskConical, Leaf } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ComingSoon } from "@/components/coming-soon";
import { SidebarNav } from "@/components/sidebar-nav";

export default function StudiesPage() {
    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "coursework", label: "Coursework" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Learning"
                    title="Studies"
                    description="Environmental engineering coursework and the systems-thinking it shares with game design."
                />
                <div id="coursework" className="mt-10 scroll-mt-24">
                    <ComingSoon
                        cards={[
                            {
                                title: "Coursework",
                                note: "Environmental engineering classes and projects.",
                                icon: GraduationCap,
                            },
                            {
                                title: "Research",
                                note: "Anything worth digging into further.",
                                icon: FlaskConical,
                            },
                            {
                                title: "Sustainability",
                                note: "Where the engineering meets the renovation work.",
                                icon: Leaf,
                            },
                        ]}
                    />
                </div>
            </section>
        </div>
    );
}

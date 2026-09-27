import { Boxes, Paintbrush, Feather } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ComingSoon } from "@/components/coming-soon";
import { SidebarNav } from "@/components/sidebar-nav";

export default function CreationsPage() {
    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "gallery", label: "Gallery" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Made"
                    title="Creations & Artwork"
                    description="Blender renders, drawing, poetry — the creative practice around the engineering."
                />
                <div id="gallery" className="mt-10 scroll-mt-24">
                    <ComingSoon
                        cards={[
                            {
                                title: "Blender renders",
                                note: "Renovation studies and 3D renders will live here.",
                                icon: Boxes,
                            },
                            {
                                title: "Drawing",
                                note: "Sketches and illustration work.",
                                icon: Paintbrush,
                            },
                            {
                                title: "Poetry",
                                note: "Writing that doesn't fit the blog.",
                                icon: Feather,
                            },
                        ]}
                    />
                </div>
            </section>
        </div>
    );
}

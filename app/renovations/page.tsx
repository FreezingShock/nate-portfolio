import { Hammer } from "lucide-react";
import { getRecentRenovations } from "@/lib/content";
import { WorkGrid } from "@/components/work-grid";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";

export const revalidate = 60;

export default async function RenovationsPage() {
    const renovations = await getRecentRenovations();

    return (
        <div className="min-h-screen">
            <SidebarNav sections={[{ id: "grid", label: "All Renovations" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Design"
                    title="Recent Renovations"
                    description="Studying and reimagining real places — measured, modeled, and redesigned to be greener and more inviting."
                />
                <div id="grid" className="mx-auto mt-10 max-w-6xl scroll-mt-24">
                    <WorkGrid projects={renovations} icon={Hammer} />
                </div>
            </section>
        </div>
    );
}

import { Hammer } from "lucide-react";
import { getRecentRenovations } from "@/lib/content";
import {
    CreationsShell,
    ProjectGrid,
    Section,
} from "@/components/creations-sections";
import { categoryById } from "@/lib/creations-data";

export const revalidate = 60;

const cat = categoryById("renovations");

export default async function RenovationsPage() {
    const renovations = await getRecentRenovations();
    return (
        <CreationsShell
            bg={cat.bg}
            accent={cat.color}
            nav={[{ id: "renovations", label: "All Renovations" }]}
            eyebrow="Creations"
            title="Renovations"
            symbol="forge"
            description="Studying and reimagining real places: measured, modeled and redesigned to be greener and more inviting."
            back={{ href: "/creations", label: "Back to Creations" }}
        >
            <Section
                id="renovations"
                first
                accent={cat.color}
                symbol="forge"
                title="All Renovations"
                blurb="Each study starts from a real site and ends in a redesign."
            >
                <ProjectGrid
                    projects={renovations}
                    color={cat.color}
                    fallbackIcon={Hammer}
                />
            </Section>
        </CreationsShell>
    );
}

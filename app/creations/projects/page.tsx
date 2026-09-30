import { Code2 } from "lucide-react";
import { getProjects } from "@/lib/content";
import {
    CreationsShell,
    ProjectGrid,
    Section,
} from "@/components/creations-sections";
import { categoryById } from "@/lib/creations-data";

export const revalidate = 60;

const cat = categoryById("projects");

export default async function ProjectsPage() {
    const projects = await getProjects();
    return (
        <CreationsShell
            bg={cat.bg}
            accent={cat.color}
            nav={[{ id: "projects", label: "All Projects" }]}
            eyebrow="Creations"
            title="Projects"
            symbol="magicFind"
            description="Coding and Roblox projects: solo-built, systems-driven, shipped and in progress."
            back={{ href: "/creations", label: "Back to Creations" }}
        >
            <Section
                id="projects"
                first
                accent={cat.color}
                symbol="magicFind"
                title="All Projects"
                blurb="Open any project for its status, tags and links."
            >
                <ProjectGrid
                    projects={projects}
                    color={cat.color}
                    fallbackIcon={Code2}
                />
            </Section>
        </CreationsShell>
    );
}

export const metadata = { title: "Projects" };

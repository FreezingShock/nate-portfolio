// Edit this file to add, remove, or update portfolio pieces.
// No other file needs to change — the page reads from these arrays.

export type ProjectStatus = "active" | "planning" | "idea";

export interface Project {
    slug: string;
    title: string;
    category: string;
    status: ProjectStatus;
    description: string;
    tags: string[];
    href?: string;
}

export const statusLabel: Record<ProjectStatus, string> = {
    active: "In Development",
    planning: "Planning",
    idea: "Coming Soon",
};

export const projects: Project[] = [
    {
        slug: "fractured-islands",
        title: "Fractured Islands: Ascension",
        category: "Game Development",
        status: "active",
        description:
            "A solo-built Roblox incremental/RPG combining button-based progression with deep, interdependent stat and attribute systems. Menu architecture, combo systems, and a 100+ attribute progression engine, all built from scratch in Luau.",
        tags: ["Roblox", "Luau", "Systems Design"],
    },
];

export const recentRenovations: Project[] = [
    {
        slug: "topanga-willows",
        title: "Topanga Willows",
        category: "Architecture & Urban Design",
        status: "planning",
        description:
            "An architecture and sustainable landscape redesign study, grounded in a design philosophy of authenticity and responsibility over trend.",
        tags: ["Architecture", "3D Design"],
    },
    {
        slug: "blender-studies",
        title: "Blender Renovation Studies",
        category: "3D Visualization",
        status: "idea",
        description:
            "Measuring and modeling real places, then reimagining them greener and more inviting — the practice that feeds new pieces into this section over time.",
        tags: ["Blender", "3D Rendering"],
    },
];

export const identity = {
    name: "Nate",
    tagline: "Building games, renders, and systems — studying toward environmental engineering.",
};

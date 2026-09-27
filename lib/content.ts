// Content now lives in Supabase (public.projects table).
// To add/edit a project: update the row directly, or ask Claude to run the SQL.
// No code change needed for new content — just new rows.

import { supabase } from "@/lib/supabase";

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

export const identity = {
    name: "Nate",
    tagline: "Building games, renders, and systems — studying toward environmental engineering.",
};

interface ProjectRow {
    slug: string;
    title: string;
    category: string;
    status: ProjectStatus;
    description: string;
    tags: string[];
    section: "projects" | "renovations";
    sort_order: number;
}

async function fetchSection(section: "projects" | "renovations"): Promise<Project[]> {
    const { data, error } = await supabase
        .from("projects")
        .select("slug, title, category, status, description, tags, section, sort_order")
        .eq("section", section)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error(`Failed to fetch "${section}" from Supabase:`, error.message);
        return [];
    }

    return (data as ProjectRow[]).map(
        ({ slug, title, category, status, description, tags }) => ({
            slug,
            title,
            category,
            status,
            description,
            tags,
        })
    );
}

export function getProjects() {
    return fetchSection("projects");
}

export function getRecentRenovations() {
    return fetchSection("renovations");
}

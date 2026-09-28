import { Gamepad2, Hammer, Box } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ProjectIcon {
    icon: LucideIcon;
    color: string;
}

const projectIconMap: Record<string, ProjectIcon> = {
    "fractured-islands": {
        icon: Gamepad2,
        color: "var(--mc-light-purple)",
    },
    "topanga-willows": {
        icon: Hammer,
        color: "var(--mc-blue)",
    },
    "blender-renovation": {
        icon: Box,
        color: "var(--mc-gold)",
    },
};

export function getProjectIcon(slug: string): ProjectIcon {
    return projectIconMap[slug] || { icon: Gamepad2, color: "var(--mc-gold)" };
}

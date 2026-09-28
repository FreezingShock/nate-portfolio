import { Gamepad2, Axis3D } from "lucide-react";
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
        icon: Axis3D,
        color: "var(--mc-blue)",
    },
    "blender-renovation": {
        icon: Axis3D,
        color: "var(--mc-gold)",
    },
};

export function getProjectIcon(slug: string): ProjectIcon {
    return projectIconMap[slug] || { icon: Gamepad2, color: "var(--mc-gold)" };
}

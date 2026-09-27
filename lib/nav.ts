import {
    Home,
    FolderKanban,
    Hammer,
    Sparkles,
    GitBranch,
    GraduationCap,
    NotebookPen,
    History,
    UserRound,
    type LucideIcon,
} from "lucide-react";

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

// Single source of truth for cross-page navigation — the Dock renders this
// list, and it's small enough to keep in one place rather than duplicating
// hrefs/labels across components.
export const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/renovations", label: "Renovations", icon: Hammer },
    { href: "/creations", label: "Creations", icon: Sparkles },
    { href: "/timeline", label: "Timeline", icon: GitBranch },
    { href: "/studies", label: "Studies", icon: GraduationCap },
    { href: "/blog", label: "Blog", icon: NotebookPen },
    { href: "/history", label: "History", icon: History },
    { href: "/about", label: "About", icon: UserRound },
];

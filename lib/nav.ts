import {
    Home,
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
    // Minecraft-color-code accent for this page — same palette as each
    // page's PageHero/SectionLabel accent (see project_portfolio_design_system
    // memory). Drives the Dock's active-state color and the SidebarNav
    // bubble's per-page color, so both navs read as "themed to where you are."
    color: string;
}

// Single source of truth for cross-page navigation — the Dock renders this
// list, and it's small enough to keep in one place rather than duplicating
// hrefs/labels across components. Projects and Renovations used to be their
// own Dock entries; both now live as sections inside /creations so the Dock
// stays to one icon for "everything Nate makes."
export const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home, color: "var(--primary)" },
    { href: "/creations", label: "Creations", icon: Sparkles, color: "var(--mc-aqua)" },
    { href: "/timeline", label: "Timeline", icon: GitBranch, color: "var(--mc-green)" },
    { href: "/studies", label: "Studies", icon: GraduationCap, color: "var(--mc-blue)" },
    { href: "/blog", label: "Blog", icon: NotebookPen, color: "var(--mc-yellow)" },
    { href: "/history", label: "History", icon: History, color: "var(--mc-red)" },
    { href: "/about", label: "About", icon: UserRound, color: "var(--mc-dark-aqua)" },
];

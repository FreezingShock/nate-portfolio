// Content for /about. Colors are Minecraft palette tokens (not hard-coded hex)
// so they follow the theme, and anything factual comes from Nate's own notes.
// Removed on purpose: the old page carried placeholder text ("[YOUR FAVORITE
// ESSAY…]", "[to fill]"), invented upcoming races with made-up target times,
// and a philosophy list claiming books were "read" that are still queued.

export type AboutIconName =
    | "Code2"
    | "Palette"
    | "Brain"
    | "Zap"
    | "Users"
    | "Leaf"
    | "Layers"
    | "Settings"
    | "Footprints"
    | "GraduationCap"
    | "Gamepad2"
    | "Globe";

// ------------------------------------------------------------------ skills

export type SkillCategory =
    "gamedev" | "design" | "web" | "engineering" | "leadership";

export const SKILL_CATEGORIES: Record<
    SkillCategory,
    { label: string; color: string }
> = {
    gamedev: { label: "Game Dev", color: "var(--mc-gold)" },
    design: { label: "Design", color: "var(--mc-aqua)" },
    web: { label: "Web Dev", color: "var(--mc-blue)" },
    engineering: { label: "Engineering", color: "var(--mc-green)" },
    leadership: { label: "Leadership", color: "var(--mc-light-purple)" },
};

export interface Skill {
    name: string;
    /** 1–5 */
    level: number;
    description: string;
    icon: AboutIconName;
    category: SkillCategory;
}

export const LEVELS = [
    { label: "Learning", color: "var(--mc-red)" },
    { label: "Intermediate", color: "var(--mc-gold)" },
    { label: "Proficient", color: "var(--mc-yellow)" },
    { label: "Advanced", color: "var(--mc-green)" },
    { label: "Expert", color: "var(--mc-aqua)" },
];

export const skills: Skill[] = [
    {
        name: "Roblox Development",
        level: 4,
        description:
            "Systems design, menu architecture, stat and attribute systems. An active shipping project (Fractured Islands).",
        icon: "Code2",
        category: "gamedev",
    },
    {
        name: "Luau Programming",
        level: 4,
        description:
            "Server/client architecture, ModuleScripts, event handling and optimization.",
        icon: "Code2",
        category: "gamedev",
    },
    {
        name: "Game Systems",
        level: 3,
        description:
            "Stat systems, progression mechanics, UI architecture and player engagement loops.",
        icon: "Zap",
        category: "gamedev",
    },
    {
        name: "3D Modeling",
        level: 3,
        description:
            "Blender modeling, rendering and architectural visualization: the renovation studies.",
        icon: "Palette",
        category: "design",
    },
    {
        name: "CAD & SketchUp",
        level: 2,
        description:
            "Architectural design, space planning and landscape visualization for portfolio projects.",
        icon: "Palette",
        category: "design",
    },
    {
        name: "Digital Art",
        level: 3,
        description:
            "Illustration, concept art and design exploration across multiple mediums.",
        icon: "Palette",
        category: "design",
    },
    {
        name: "Tailwind CSS",
        level: 3,
        description:
            "Responsive design, utility-first workflows and custom theming with the Minecraft color palette.",
        icon: "Palette",
        category: "design",
    },
    {
        name: "Next.js & React",
        level: 3,
        description:
            "Full-stack web development, server components and Supabase integration. Built this whole site.",
        icon: "Code2",
        category: "web",
    },
    {
        name: "TypeScript",
        level: 3,
        description:
            "Type-safe architecture, type systems and component design patterns.",
        icon: "Code2",
        category: "web",
    },
    {
        name: "Systems Thinking",
        level: 4,
        description:
            "Interconnected mechanics, optimization and constraint identification, applied to game design and engineering alike.",
        icon: "Brain",
        category: "engineering",
    },
    {
        name: "Problem Solving",
        level: 4,
        description:
            "A debug-focused mindset, constraint thinking and creative solutions under pressure.",
        icon: "Brain",
        category: "engineering",
    },
    {
        name: "Environmental Design",
        level: 2,
        description:
            "Sustainable systems, landscape design and urban design principles (the Senior Project's focus).",
        icon: "Leaf",
        category: "engineering",
    },
    {
        name: "Project Planning",
        level: 3,
        description:
            "Roadmapping, milestone tracking, iterative development and an execution focus.",
        icon: "Brain",
        category: "engineering",
    },
    {
        name: "Leadership",
        level: 3,
        description:
            "Athletic team leadership, mentoring, discipline and resilience: captain of Cross Country and Track.",
        icon: "Users",
        category: "leadership",
    },
    {
        name: "Communication",
        level: 3,
        description:
            "Technical writing, design documentation and clear explanation of complex systems.",
        icon: "Users",
        category: "leadership",
    },
];

// --------------------------------------------------- Fractured Islands

export interface GameSystem {
    id: string;
    name: string;
    color: string;
    icon: AboutIconName;
    /** Build order from the roadmap (the progression loop is the glue, unnumbered). */
    priority?: number;
    description: string;
    parts: { name: string; description: string }[];
}

export const gameSystems: GameSystem[] = [
    {
        id: "menu",
        name: "Ascension Menu",
        color: "var(--mc-gold)",
        icon: "Layers",
        priority: 1,
        description:
            "The central hub for every player interaction, and the first system being built.",
        parts: [
            {
                name: "Profile",
                description: "Armor swapping, accessories and a stats display",
            },
            {
                name: "Inventory",
                description: "Item management and organization",
            },
            {
                name: "Skills",
                description: "Skill progression and XP tracking",
            },
            {
                name: "Collections",
                description: "A milestone system with permanent buffs",
            },
        ],
    },
    {
        id: "stats",
        name: "Stat System",
        color: "var(--mc-green)",
        icon: "Zap",
        priority: 2,
        description:
            "Calculates and manages every player statistic, kept separate from attributes on purpose.",
        parts: [
            {
                name: "Health",
                description: "A base stat with multipliers from equipment",
            },
            { name: "Speed", description: "Movement speed and its bonuses" },
            {
                name: "Bonus Press",
                description: "Affects the output of button presses",
            },
            {
                name: "Skill Fortune",
                description: "Increases XP gain across all skills",
            },
        ],
    },
    {
        id: "attributes",
        name: "Attribute System",
        color: "var(--mc-blue)",
        icon: "Settings",
        priority: 3,
        description:
            "The most complex piece: 100+ interdependent attributes with cascading multipliers.",
        parts: [
            {
                name: "Button Modifiers",
                description: "Press combo multipliers and reductions",
            },
            { name: "Skill Bonuses", description: "Per-skill attribute gains" },
            {
                name: "Milestone Buffs",
                description: "Permanent progression rewards",
            },
            {
                name: "Custom Values",
                description: "Player-allocated attribute points",
            },
        ],
    },
    {
        id: "progression",
        name: "Progression Loop",
        color: "var(--mc-light-purple)",
        icon: "Users",
        description:
            "The engagement mechanics that tie the other three together and drive playtime.",
        parts: [
            {
                name: "Button Press",
                description: "The core mechanic: press buttons for rewards",
            },
            {
                name: "Press Combo",
                description:
                    "A multiplier for consecutive presses across any button",
            },
            {
                name: "Skill Leveling",
                description: "The long-term progression metric",
            },
            {
                name: "Bestiary",
                description: "A progress guide and milestone tracker",
            },
        ],
    },
];

export const gameFacts = [
    {
        value: 100,
        suffix: "+",
        label: "interdependent attributes",
        color: "var(--mc-blue)",
    },
    {
        value: 10,
        suffix: "",
        label: "menu types in one hub",
        color: "var(--mc-gold)",
    },
    {
        value: 5,
        suffix: "",
        label: "combo stages, 1.1x to 1.5x",
        color: "var(--mc-green)",
    },
    {
        value: 3,
        suffix: "",
        label: "core systems to build",
        color: "var(--mc-light-purple)",
    },
];

// -------------------------------------------------------------- philosophy

export const beliefs = [
    {
        title: "Agnosticism",
        color: "var(--mc-aqua)",
        description:
            "We can't know ultimate truths, but staying open to questioning matters. It shapes an empirical, systems-thinking approach.",
    },
    {
        title: "Egg Theory",
        color: "var(--mc-aqua)",
        description:
            "We are one consciousness experiencing itself subjectively. It informs a humane, interconnected worldview in design.",
    },
];

// From the Senior Project's design philosophy: what "authentic" design means.
export const designPrinciples = [
    {
        title: "Authenticity over trend",
        color: "var(--mc-light-purple)",
        description:
            "Solve what's actually broken, not what looks cool. If a space is empty because it's uncomfortable, adding benches and calling it fixed isn't a solution.",
    },
    {
        title: "Ethical design choices",
        color: "var(--mc-green)",
        description:
            "Every choice has consequences, and I own them: material impact, who can actually use the space, and who will maintain it.",
    },
    {
        title: "Constraints as forcing functions",
        color: "var(--mc-gold)",
        description:
            "Budget, land and climate limits don't cap creativity. They force honest solutions. Poor soil? Design for it.",
    },
    {
        title: "Community choice matters",
        color: "var(--mc-aqua)",
        description:
            "Design shapes what's possible: where the paths go, where people gather. If the space ends up empty, the design failed, however it looks.",
    },
];

// ---------------------------------------------------------------- building

export interface BuildingItem {
    title: string;
    color: string;
    status: string;
    description: string;
    href: string;
    cta: string;
}

export const building: BuildingItem[] = [
    {
        title: "Fractured Islands: Ascension",
        color: "var(--mc-light-purple)",
        status: "In development",
        description:
            "A solo-built Roblox incremental RPG in active development: stat systems, attribute mechanics and engagement loops.",
        href: "/creations/fractured-islands",
        cta: "See the project",
    },
    {
        title: "This Website",
        color: "var(--mc-aqua)",
        status: "Always building",
        description:
            "A living project: renovation studies, design work and creations across mediums, changing in public with every commit.",
        href: "/history",
        cta: "Read the changelog",
    },
    {
        title: "Engineering Foundation",
        color: "var(--mc-green)",
        status: "Senior year",
        description:
            "The college pathway through Santa Monica College to Cal Poly Pomona, with an environmental specialization and a capstone focus.",
        href: "/timeline",
        cta: "Open the timeline",
    },
];

// ----------------------------------------------------------------- running

export const runningStats = [
    { label: "XC 3-mile PR", value: "15:36", color: "var(--mc-gold)" },
    { label: "1600m", value: "4:36", color: "var(--mc-green)" },
    { label: "Years running", value: "4", color: "var(--mc-aqua)" },
    { label: "Role", value: "Captain", color: "var(--mc-light-purple)" },
];

export const runningPlan = [
    {
        when: "Now",
        title: "Captain of Cross Country & Track",
        detail: "Leading the team through senior year.",
        color: "var(--mc-light-purple)",
        href: "/timeline#personal-5",
    },
    {
        when: "Fall 2027",
        title: "Recruited athlete at SMC",
        detail: "Racing for Santa Monica College while finishing the STEM prerequisites.",
        color: "var(--mc-green)",
        href: "/timeline#smc-2",
    },
    {
        when: "2028 – 2029",
        title: "Captain goal at SMC",
        detail: "Stepping into a leadership role on the team.",
        color: "var(--mc-aqua)",
        href: "/timeline#smc-8",
    },
    {
        when: "2029 – 2031",
        title: "Captain goal at Cal Poly Pomona",
        detail: "Carrying the leadership thread through the last two years.",
        color: "var(--mc-gold)",
        href: "/timeline#cpp-2",
    },
];

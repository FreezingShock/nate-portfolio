"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { McSymbol, type McSymbolName } from "@/components/mc-symbol"
import { Code2, Palette, Brain, Zap, Users, Leaf } from "lucide-react"

interface Skill {
    name: string
    level: number
    description: string
    icon: React.ReactNode
    color: string
    category: string
}

const skillsData: Skill[] = [
    // Game Development
    {
        name: "Roblox Development",
        level: 4,
        description: "Systems design, menu architecture, stat/attribute systems. Active shipping project (Fractured Islands).",
        icon: <Code2 className="size-5" />,
        color: "#ffaa00",
        category: "Game Dev"
    },
    {
        name: "Lua Programming",
        level: 4,
        description: "Server/client architecture, ModuleScripts, event handling, optimization.",
        icon: <Code2 className="size-5" />,
        color: "#ffaa00",
        category: "Game Dev"
    },
    {
        name: "Game Systems",
        level: 3,
        description: "Stat systems, progression mechanics, UI architecture, player engagement loops.",
        icon: <Zap className="size-5" />,
        color: "#ffff55",
        category: "Game Dev"
    },

    // 3D & Visual
    {
        name: "3D Modeling",
        level: 3,
        description: "Blender: modeling, rendering, architectural visualization, renovation studies.",
        icon: <Palette className="size-5" />,
        color: "#55ffff",
        category: "Design"
    },
    {
        name: "CAD & SketchUp",
        level: 2,
        description: "Architectural design, space planning, landscape visualization for portfolio projects.",
        icon: <Palette className="size-5" />,
        color: "#55ffff",
        category: "Design"
    },
    {
        name: "Digital Art",
        level: 3,
        description: "Illustration, concept art, design exploration across multiple mediums.",
        icon: <Palette className="size-5" />,
        color: "#55ffff",
        category: "Design"
    },

    // Technical
    {
        name: "Next.js & React",
        level: 3,
        description: "Full-stack web development, server components, Supabase integration. Built this portfolio.",
        icon: <Code2 className="size-5" />,
        color: "#5555ff",
        category: "Web Dev"
    },
    {
        name: "TypeScript",
        level: 3,
        description: "Type-safe architecture, type systems, component design patterns.",
        icon: <Code2 className="size-5" />,
        color: "#5555ff",
        category: "Web Dev"
    },
    {
        name: "Tailwind CSS",
        level: 3,
        description: "Responsive design, utility-first workflows, custom theming with Minecraft colors.",
        icon: <Palette className="size-5" />,
        color: "#55ffff",
        category: "Design"
    },

    // Engineering & Systems
    {
        name: "Systems Thinking",
        level: 4,
        description: "Interconnected mechanics, optimization, constraint identification. Applied to game design and engineering.",
        icon: <Brain className="size-5" />,
        color: "#55ff55",
        category: "Engineering"
    },
    {
        name: "Environmental Design",
        level: 2,
        description: "Sustainable systems, landscape design, urban design principles (senior project focus).",
        icon: <Leaf className="size-5" />,
        color: "#55ff55",
        category: "Engineering"
    },
    {
        name: "Project Planning",
        level: 3,
        description: "Roadmapping, milestone tracking, iterative development, execution focus.",
        icon: <Brain className="size-5" />,
        color: "#55ff55",
        category: "Engineering"
    },

    // Soft Skills
    {
        name: "Leadership",
        level: 3,
        description: "Athletic team leadership, mentoring, discipline, resilience. Cross country captain aspirations.",
        icon: <Users className="size-5" />,
        color: "#ff55ff",
        category: "Leadership"
    },
    {
        name: "Communication",
        level: 3,
        description: "Technical writing, design documentation, clear explanation of complex systems.",
        icon: <Users className="size-5" />,
        color: "#ff55ff",
        category: "Leadership"
    },
    {
        name: "Problem Solving",
        level: 4,
        description: "Debug-focused mindset, constraint thinking, creative solutions under pressure.",
        icon: <Brain className="size-5" />,
        color: "#55ff55",
        category: "Engineering"
    }
]

const categorySymbols: Record<string, McSymbolName> = {
    "Game Dev": "attackSpeed",
    Design: "magicFind",
    "Web Dev": "intelligence",
    Engineering: "defense",
    Leadership: "strength",
}
const categoryColors: Record<string, string> = {
    "Game Dev": "#ffaa00",
    Design: "#55ffff",
    "Web Dev": "#5555ff",
    Engineering: "#55ff55",
    Leadership: "#ff55ff",
}

export function SkillsTree() {
    const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)

    const categories = Array.from(new Set(skillsData.map(s => s.category)))
    const skillsByCategory = categories.map(cat => ({
        category: cat,
        skills: skillsData.filter(s => s.category === cat)
    }))

    const getLevelLabel = (level: number) => {
        const labels = ["Beginner", "Intermediate", "Proficient", "Expert", "Master"]
        return labels[level - 1] || "Unknown"
    }

    const getLevelColor = (level: number) => {
        const colors = ["#ff5555", "#ffaa00", "#ffff55", "#55ff55", "#55ffff"]
        return colors[level - 1] || "#888888"
    }

    return (
        <div className="space-y-8">
            <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Skills organized by domain. Each reflects hands-on experience and active development. Level 5 = Master (depth + teaching ability); Level 1 = Learning.
                </p>
            </div>

            {skillsByCategory.map(({ category, skills }) => (
                <div key={category} className="space-y-3">
                    <h3 className="font-minecraft text-lg font-bold flex items-center gap-2"
                        style={{ color: categoryColors[category] }}>
                        <span className="text-2xl">
                            <McSymbol name={categorySymbols[category] ?? "arrow"} color={categoryColors[category]} />
                        </span>
                        {category}
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {skills.map((skill) => (
                            <motion.button
                                key={skill.name}
                                onClick={() =>
                                    setHoveredSkill(hoveredSkill === skill.name ? null : skill.name)
                                }
                                onHoverStart={() => setHoveredSkill(skill.name)}
                                onHoverEnd={() => setHoveredSkill(null)}
                                className="group text-left relative rounded-lg border p-4 transition-all"
                                style={{
                                    borderColor:
                                        hoveredSkill === skill.name
                                            ? skill.color
                                            : "var(--border)",
                                    backgroundColor:
                                        hoveredSkill === skill.name
                                            ? `${skill.color}15`
                                            : "var(--card)",
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <h4
                                            className="font-minecraft font-bold text-sm transition-colors"
                                            style={{
                                                color:
                                                    hoveredSkill === skill.name
                                                        ? skill.color
                                                        : "inherit",
                                            }}
                                        >
                                            {skill.name}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {getLevelLabel(skill.level)}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0" style={{ color: skill.color }}>
                                        {skill.icon}
                                    </div>
                                </div>

                                {/* Skill Level Bar */}
                                <div className="mt-3 flex gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-1.5 flex-1 rounded-full transition-all"
                                            style={{
                                                backgroundColor:
                                                    i < skill.level
                                                        ? skill.color
                                                        : "var(--muted)",
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Hover Description */}
                                {hoveredSkill === skill.name && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="mt-3 pt-3 border-t text-xs text-muted-foreground"
                                        style={{ borderColor: `${skill.color}20` }}
                                    >
                                        {skill.description}
                                    </motion.div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { BookOpen, Lightbulb, Compass } from "lucide-react"

interface PhilosophyItem {
    category: "book" | "belief" | "essay"
    title: string
    author?: string
    description: string
    status: "read" | "reading" | "planned"
    color: string
}

const philosophyItems: PhilosophyItem[] = [
    {
        category: "book",
        title: "Either/Or",
        author: "Søren Kierkegaard",
        description: "Foundational existential text exploring aesthetic vs. ethical modes of existence. Influences my design philosophy on authenticity.",
        status: "read",
        color: "#ff55ff"
    },
    {
        category: "book",
        title: "Fear and Trembling",
        author: "Søren Kierkegaard",
        description: "Exploration of faith, courage, and the absurd. Shaped my thinking on commitment and decision-making.",
        status: "read",
        color: "#ff55ff"
    },
    {
        category: "belief",
        title: "Agnosticism",
        description: "Believe we cannot know ultimate truths but remain open to questioning. This shapes an empirical, systems-thinking approach.",
        status: "read",
        color: "#55ffff"
    },
    {
        category: "belief",
        title: "Egg Theory",
        description: "We are one consciousness experiencing itself subjectively. Informs a humane, systems-interconnected worldview in design.",
        status: "read",
        color: "#55ffff"
    },
    {
        category: "essay",
        title: "[YOUR FAVORITE ESSAY ABOUT DESIGN PHILOSOPHY]",
        description: "Essay that shaped your thinking on design, systems, or philosophy — [to fill]",
        status: "planned",
        color: "#ffaa00"
    },
    {
        category: "book",
        title: "[PHILOSOPHY BOOK YOU WANT TO READ]",
        author: "Author — [to fill]",
        description: "Add books you're planning to read or currently reading.",
        status: "planned",
        color: "#55ff55"
    }
]

export function PhilosophyCard() {
    const [expandedItem, setExpandedItem] = useState<string | null>(null)

    const getCategoryIcon = (category: PhilosophyItem["category"]) => {
        switch (category) {
            case "book":
                return BookOpen
            case "belief":
                return Compass
            case "essay":
                return Lightbulb
        }
    }

    const getCategoryLabel = (category: PhilosophyItem["category"]) => {
        return { book: "Book", belief: "Core Belief", essay: "Essay" }[category]
    }

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Philosophy shapes how I build. <span className="text-mc-lightpurple font-minecraft">Kierkegaard</span> informs authenticity and ethical choice. <span className="text-mc-aqua font-minecraft">Agnosticism and Egg Theory</span> ground my systems thinking in humility and interconnection.
                </p>
            </div>

            <div className="space-y-3">
                {philosophyItems.map((item) => {
                    const Icon = getCategoryIcon(item.category)
                    const categoryLabel = getCategoryLabel(item.category)
                    const itemKey = `${item.category}-${item.title}`
                    const isExpanded = expandedItem === itemKey

                    return (
                        <motion.button
                            key={itemKey}
                            onClick={() => setExpandedItem(isExpanded ? null : itemKey)}
                            className="w-full text-left"
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div
                                className="rounded-lg border p-4 transition-all hover:border-opacity-70"
                                style={{
                                    borderColor: `${item.color}40`,
                                    backgroundColor: `${item.color}08`,
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon
                                        className="size-5 flex-shrink-0 mt-0.5"
                                        style={{ color: item.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <h4
                                                className="font-minecraft font-bold text-sm"
                                                style={{ color: item.color }}
                                            >
                                                {item.title}
                                            </h4>
                                            {item.author && (
                                                <p className="text-xs text-muted-foreground">
                                                    — {item.author}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className="text-xs font-semibold uppercase tracking-wider"
                                                style={{ color: item.color }}
                                            >
                                                {categoryLabel}
                                            </span>
                                            <span
                                                className="text-xs rounded px-2 py-0.5 font-semibold"
                                                style={{
                                                    color: item.color,
                                                    backgroundColor: `${item.color}20`,
                                                }}
                                            >
                                                {item.status === "read"
                                                    ? "✓ Read"
                                                    : item.status === "reading"
                                                        ? "Reading"
                                                        : "To Read"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-3 pt-3 border-t text-sm"
                                            style={{ borderColor: `${item.color}20` }}
                                        >
                                            <p className="text-muted-foreground leading-relaxed">
                                                {item.description}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.button>
                    )
                })}
            </div>

            <div className="rounded-lg border border-mc-gold/30 bg-gradient-to-r from-mc-gold/10 to-transparent p-4">
                <p className="text-xs uppercase tracking-wider text-mc-gold font-semibold mb-2">Impact</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    These philosophical foundations directly inform my design decisions. In game dev, I apply systems thinking to interconnected mechanics. In engineering, I consider human-centered sustainability. In life, I practice intentional choice and authentic commitment.
                </p>
            </div>
        </div>
    )
}

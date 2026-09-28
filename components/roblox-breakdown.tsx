"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Zap, Layers, Settings, Users } from "lucide-react"

const systemBreakdown = [
    {
        id: "menu",
        name: "Ascension Menu",
        color: "#ffaa00",
        icon: Layers,
        description: "Central hub for all player interactions",
        systems: [
            { name: "Profile", description: "Armor swapping, accessories, stats display" },
            { name: "Inventory", description: "Item management and organization" },
            { name: "Skills", description: "Skill progression and XP tracking" },
            { name: "Collections", description: "Milestone system with permanent buffs" }
        ]
    },
    {
        id: "stats",
        name: "Stat System",
        color: "#55ff55",
        icon: Zap,
        description: "Calculates and manages all player statistics",
        systems: [
            { name: "Health", description: "Base stat with multipliers from equipment" },
            { name: "Speed", description: "Movement speed and bonuses" },
            { name: "Bonus Press", description: "Affects button pressing output" },
            { name: "Skill Fortune", description: "Increases XP gain across all skills" }
        ]
    },
    {
        id: "attributes",
        name: "Attribute System",
        color: "#5555ff",
        icon: Settings,
        description: "Complex interconnected modifier system (100+ attributes)",
        systems: [
            { name: "Button Modifiers", description: "Press combo multipliers and reductions" },
            { name: "Skill Bonuses", description: "Per-skill attribute gains" },
            { name: "Milestone Buffs", description: "Permanent progression rewards" },
            { name: "Custom Values", description: "Player-allocated attribute points" }
        ]
    },
    {
        id: "progression",
        name: "Progression Loop",
        color: "#ff55ff",
        icon: Users,
        description: "Engagement mechanics that drive playtime",
        systems: [
            { name: "Button Press", description: "Core mechanic: click buttons for rewards" },
            { name: "Press Combo", description: "Multiplier system for consecutive presses" },
            { name: "Skill Leveling", description: "Long-term progression metric" },
            { name: "Bestiary", description: "Progress guide and milestone tracker" }
        ]
    }
]

export function RobloxBreakdown() {
    const [expandedSystem, setExpandedSystem] = useState<string | null>(null)

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="text-mc-gold font-minecraft">Fractured Islands: Ascension</span> is a progression-based game built in Roblox. The architecture separates concerns across four interconnected systems, each with modular designs. This breakdown shows the current development focus.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {systemBreakdown.map((system) => {
                    const Icon = system.icon
                    return (
                        <motion.button
                            key={system.id}
                            onClick={() => setExpandedSystem(expandedSystem === system.id ? null : system.id)}
                            className="text-left"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div
                                className="h-full rounded-lg border p-4 transition-all hover:border-opacity-100"
                                style={{
                                    borderColor: `${system.color}40`,
                                    backgroundColor: `${system.color}08`,
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon
                                        className="size-5 flex-shrink-0 mt-1"
                                        style={{ color: system.color }}
                                    />
                                    <div className="flex-1">
                                        <h4
                                            className="font-minecraft font-bold text-sm"
                                            style={{ color: system.color }}
                                        >
                                            {system.name}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {system.description}
                                        </p>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedSystem === system.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-4 space-y-2 border-t pt-3"
                                            style={{ borderColor: `${system.color}20` }}
                                        >
                                            {system.systems.map((subsystem) => (
                                                <div key={subsystem.name} className="text-xs">
                                                    <div
                                                        className="font-minecraft font-semibold"
                                                        style={{ color: system.color }}
                                                    >
                                                        {subsystem.name}
                                                    </div>
                                                    <p className="text-muted-foreground text-xs mt-0.5">
                                                        {subsystem.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.button>
                    )
                })}
            </div>

            {/* Development Priority */}
            <div className="rounded-lg border border-mc-yellow/30 bg-gradient-to-r from-mc-yellow/10 to-transparent p-4">
                <p className="text-xs uppercase tracking-wider text-mc-yellow font-semibold mb-2">Priority Order</p>
                <ol className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex gap-2">
                        <span className="text-mc-gold font-minecraft font-bold">1.</span>
                        <span><span className="text-mc-gold">Ascension Menu</span> — Foundation for all UX</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-mc-gold font-minecraft font-bold">2.</span>
                        <span><span className="text-mc-green">Stat System</span> — Core calculation layer</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-mc-gold font-minecraft font-bold">3.</span>
                        <span><span className="text-mc-blue">Attribute System</span> — Complex interconnects (hardest)</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-mc-gold font-minecraft font-bold">4.</span>
                        <span><span className="text-mc-lightpurple">Progression Loop</span> — Engagement mechanics</span>
                    </li>
                </ol>
            </div>
        </div>
    )
}

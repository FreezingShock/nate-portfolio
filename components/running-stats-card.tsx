"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, TrendingDown } from "lucide-react"

interface Race {
    name: string
    date: string
    distance: string
    time: string
    pace: string
    placement?: string
    link?: string
}

export function RunningStatsCard() {
    const [expandedRace, setExpandedRace] = useState<string | null>(null)

    const currentStats = {
        xc3Mile: "15:36",
        mile1600m: "4:36",
        personalBest: {
            distance: "3 miles (XC)",
            time: "15:36",
            date: "2026"
        }
    }

    const recentRaces: Race[] = [
        {
            name: "League Championship",
            date: "October 2026",
            distance: "5K XC",
            time: "15:45",
            pace: "5:02/mile",
            placement: "TBD"
        },
        {
            name: "Regional Finals",
            date: "November 2026",
            distance: "5K XC",
            time: "[UPCOMING]",
            pace: "Target: 4:55/mile",
        },
        {
            name: "State Championship",
            date: "November 2026",
            distance: "5K XC",
            time: "[UPCOMING]",
            pace: "Target: 4:50/mile",
        }
    ]

    return (
        <div className="space-y-6">
            {/* Current Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-mc-gold/30 bg-gradient-to-br from-mc-gold/10 to-transparent p-4">
                    <p className="text-xs uppercase tracking-wider text-mc-gold opacity-70">XC 3-Mile PR</p>
                    <p className="font-minecraft text-3xl font-bold text-mc-gold mt-2">{currentStats.xc3Mile}</p>
                </div>
                <div className="rounded-lg border border-mc-green/30 bg-gradient-to-br from-mc-green/10 to-transparent p-4">
                    <p className="text-xs uppercase tracking-wider text-mc-green opacity-70">1600m (1 Mile)</p>
                    <p className="font-minecraft text-3xl font-bold text-mc-green mt-2">{currentStats.mile1600m}</p>
                </div>
                <div className="rounded-lg border border-mc-aqua/30 bg-gradient-to-br from-mc-aqua/10 to-transparent p-4">
                    <p className="text-xs uppercase tracking-wider text-mc-aqua opacity-70">Status</p>
                    <p className="font-minecraft text-lg font-bold text-mc-aqua mt-2">Competitive</p>
                    <p className="text-xs text-muted-foreground mt-1">Recruited athlete path</p>
                </div>
            </div>

            {/* Race Progression */}
            <div className="space-y-3">
                <h3 className="font-minecraft text-xl font-bold text-mc-yellow flex items-center gap-2">
                    <TrendingDown className="size-5" />
                    Upcoming Races
                </h3>
                <div className="space-y-2">
                    {recentRaces.map((race) => (
                        <motion.div
                            key={race.name}
                            className="group relative"
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <button
                                onClick={() => setExpandedRace(expandedRace === race.name ? null : race.name)}
                                className="w-full text-left rounded-lg border border-border/40 bg-card/30 p-4 transition-all hover:border-mc-gold/40 hover:bg-card/50"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-minecraft text-sm font-bold text-foreground">{race.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{race.date}</p>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: expandedRace === race.name ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="size-4 text-muted-foreground" />
                                    </motion.div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {expandedRace === race.name && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-l-2 border-mc-gold/30 bg-card/20 p-4 mt-2 rounded text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Distance:</span>
                                                <span className="text-mc-aqua">{race.distance}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Target Time:</span>
                                                <span className="text-mc-green">{race.time}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Pace Goal:</span>
                                                <span className="text-mc-yellow">{race.pace}</span>
                                            </div>
                                            {race.placement && (
                                                <div className="flex justify-between pt-2 border-t border-border/20">
                                                    <span className="text-muted-foreground">Placement:</span>
                                                    <span className="text-mc-gold font-minecraft">{race.placement}</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Training Notes */}
            <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Training Philosophy</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Consistent training, mental resilience, and continuous improvement. Cross country has shaped my discipline and leadership — qualities I bring to all areas of work. Running as a recruited athlete through college (SMC → Cal Poly Pomona) is part of my long-term vision.
                </p>
            </div>
        </div>
    )
}

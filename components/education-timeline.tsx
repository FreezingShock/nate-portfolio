"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { McSymbol, type McSymbolName } from "@/components/mc-symbol"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface TimelinePhase {
    season: string
    year: string
    color: string
    icon: McSymbolName
    title: string
    description: string
    milestones: string[]
}

const phases: TimelinePhase[] = [
    {
        season: "Fall",
        year: "2026",
        color: "#ffaa00",
        icon: "intelligence",
        title: "Senior Year",
        description: "High school completion, SAT prep, college applications, portfolio foundation",
        milestones: [
            "Maintain 3.8+ GPA",
            "Retake SAT (target 1350+)",
            "Apply to Santa Monica College",
            "Build first portfolio piece"
        ]
    },
    {
        season: "Spring",
        year: "2027",
        color: "#55ff55",
        icon: "speed",
        title: "College Transition",
        description: "Graduate high school, confirm recruited athlete status, prepare for SMC",
        milestones: [
            "Graduate (Spring 2027)",
            "Secure SMC recruited status",
            "Finish portfolio project #1",
            "Establish income stream"
        ]
    },
    {
        season: "Fall",
        year: "2027",
        color: "#5555ff",
        icon: "day",
        title: "Santa Monica College",
        description: "Begin SMC with recruited athlete status. Engineering foundation, athletic leadership",
        milestones: [
            "Join SMC XC team",
            "Enroll in pre-engineering courses",
            "Build portfolio piece #2",
            "Maintain 3.5+ GPA"
        ]
    },
    {
        season: "Spring",
        year: "2028",
        color: "#55ffff",
        icon: "fortune",
        title: "SMC Year 2",
        description: "Deepen engineering skills, grow as athlete-leader, portfolio progress",
        milestones: [
            "Leadership role on XC team",
            "Continue engineering pathway",
            "Complete portfolio #2",
            "Plan Cal Poly transfer"
        ]
    },
    {
        season: "Fall",
        year: "2029",
        color: "#ff55ff",
        icon: "defense",
        title: "Cal Poly Pomona",
        description: "Transfer to 4-year program. Civil Engineering – Environmental specialization",
        milestones: [
            "Begin at Cal Poly Pomona",
            "Join Pomona XC team",
            "Civil Engineering specialization",
            "Capstone project planning"
        ]
    },
    {
        season: "Spring",
        year: "2030",
        color: "#ffff55",
        icon: "wisdom",
        title: "Pomona Year 2",
        description: "Advanced engineering coursework, portfolio maturation, mentor network",
        milestones: [
            "XC team leadership",
            "Technical specialization focus",
            "Portfolio pieces #3–4",
            "Industry connections"
        ]
    },
    {
        season: "Fall",
        year: "2030",
        color: "#ff5555",
        icon: "forge",
        title: "Capstone Year",
        description: "Capstone project, final portfolio pieces, preparation for post-grad launch",
        milestones: [
            "Capstone design project",
            "Final portfolio refinement",
            "Network building (mentors, partners)",
            "Business planning"
        ]
    },
    {
        season: "Spring",
        year: "2031",
        color: "#aa00aa",
        icon: "comet",
        title: "Launch",
        description: "Graduation, business launch, independent sustainability/urban design work",
        milestones: [
            "Graduate (BS Civil Engineering)",
            "Launch sustainable design project",
            "Stable income established",
            "Financial freedom path initiated"
        ]
    }
]

export function EducationTimeline() {
    const [activePhase, setActivePhase] = useState(0)
    const [scrollPos, setScrollPos] = useState(0)

    const scroll = (direction: "left" | "right") => {
        const container = document.getElementById("timeline-scroll")
        if (!container) return

        const scrollAmount = 300
        const newPos = scrollPos + (direction === "left" ? -scrollAmount : scrollAmount)
        setScrollPos(newPos)
        container.scrollTo({
            left: newPos,
            behavior: "smooth"
        })
    }

    const current = phases[activePhase]

    return (
        <div className="space-y-6">
            {/* Timeline Scroll */}
            <div className="relative">
                <button
                    onClick={() => scroll("left")}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-background/80 border border-border/40 hover:bg-background transition-colors hidden sm:flex"
                >
                    <ChevronLeft className="size-4" />
                </button>

                <div
                    id="timeline-scroll"
                    className="overflow-x-auto scroll-smooth"
                >
                    <div className="flex gap-3 pb-2 px-4 min-w-full sm:px-12">
                        {phases.map((phase, idx) => (
                            <motion.button
                                key={`${phase.year}-${phase.season}`}
                                onClick={() => setActivePhase(idx)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative flex-shrink-0 rounded-lg border-2 px-4 py-3 transition-all text-center whitespace-nowrap"
                                style={{
                                    borderColor: activePhase === idx ? current.color : "var(--border)",
                                    backgroundColor:
                                        activePhase === idx
                                            ? `${phase.color}20`
                                            : "transparent",
                                }}
                            >
                                <div className="mb-1 text-xl"><McSymbol name={phase.icon} color={phase.color} /></div>
                                <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: phase.color }}>
                                    {phase.season}
                                </div>
                                <div className="text-xs text-muted-foreground">{phase.year}</div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => scroll("right")}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-background/80 border border-border/40 hover:bg-background transition-colors hidden sm:flex"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>

            {/* Phase Details */}
            <motion.div
                key={activePhase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border p-6"
                style={{
                    borderColor: `${current.color}40`,
                    backgroundColor: `${current.color}08`,
                }}
            >
                <div className="flex items-start gap-4">
                    <div className="text-4xl"><McSymbol name={current.icon} color={current.color} /></div>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h3
                                className="font-minecraft text-2xl font-bold"
                                style={{ color: current.color }}
                            >
                                {current.title}
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {current.season} {current.year}
                            </span>
                        </div>
                        <p className="text-muted-foreground mt-2 leading-relaxed">
                            {current.description}
                        </p>
                    </div>
                </div>

                {/* Milestones */}
                <div className="mt-6 space-y-2">
                    <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: current.color }}>
                        Key Milestones
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {current.milestones.map((milestone, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-2 text-sm"
                            >
                                <span
                                    className="font-minecraft font-bold flex-shrink-0 mt-0.5"
                                    style={{ color: current.color }}
                                >
                                    ✓
                                </span>
                                <span className="text-muted-foreground">{milestone}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Overview */}
            <div className="rounded-lg border border-mc-gold/30 bg-gradient-to-r from-mc-gold/10 to-transparent p-4">
                <p className="text-xs uppercase tracking-wider text-mc-gold font-semibold mb-2">4-Year Strategic Plan</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    From senior year (2026) through Spring 2031, each phase builds foundation for the next. SMC → Cal Poly creates the engineering + portfolio + network base for launching a sustainable infrastructure business. Parallel income streams (Fractured Islands, apps) run throughout. By 2031: degree ✓, portfolio ✓, network ✓, financial foundation ✓.
                </p>
            </div>
        </div>
    )
}

import type { TimelinePhaseData } from "@/components/timeline-phase";
import { TimelinePhase } from "@/components/timeline-phase";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";

const phases: TimelinePhaseData[] = [
    {
        id: "high-school",
        title: "High School Senior Year",
        description:
            "Final year before college transition. Six interdisciplinary courses culminating in AP exams and Senior Project capstone. Preparing for environmental engineering pathway.",
        timeline: "September 2026 — June 2027",
        color: "var(--mc-blue)",
        events: [
            {
                id: "hs-1",
                title: "Current: Senior Year Begins",
                description:
                    "Six courses (Senior Project, AP Stats, AP Bio, Communications, Studio Art, AP Gov) building toward environmental engineering. Applying Kierkegaard's philosophy to design work.",
                date: "September 2026",
                dateRange: "Sept 2026 — Ongoing",
                type: "major",
                phase: "high-school",
                color: "var(--mc-blue)",
                icon: "BookOpen",
                tags: ["Current", "Coursework", "6 Courses"],
                isCurrent: true,
                details: [
                    "Senior Project: Public space transformation research",
                    "AP Statistics: Quantitative analysis and hypothesis testing",
                    "AP Biology: Systems thinking and ecology",
                    "Communications: Public speaking and presentation design",
                    "AP Studio Art: Visual portfolio development (12-15 pieces)",
                    "AP Government: Constitutional law and political systems",
                ],
            },
            {
                id: "hs-2",
                title: "AP Exams Week",
                description: "All AP course exams (Statistics, Biology, Government, Studio Art).",
                date: "May 2027",
                type: "minor",
                phase: "high-school",
                color: "var(--mc-blue)",
                icon: "Award",
                tags: ["Exams"],
                details: [
                    "Target: 4-5 on each exam (based on AP history)",
                    "Studio Art portfolio submission",
                    "Last checkpoint before graduation",
                ],
            },
            {
                id: "hs-3",
                title: "High School Graduation",
                description:
                    "Official end of high school. Senior Project capstone presentation complete. Ready for community college transfer pathway.",
                date: "June 2027",
                type: "major",
                phase: "high-school",
                color: "var(--mc-blue)",
                icon: "GraduationCap",
                tags: ["Graduation", "Milestone"],
                details: [
                    "Final Senior Project presentation to stakeholders",
                    "College applications pending (SMC, backup schools)",
                    "Begin summer before SMC starts",
                ],
            },
        ],
    },
    {
        id: "smc",
        title: "Santa Monica College Transfer Pathway",
        description:
            "Two-year completion of STEM prerequisites while competing as recruited cross-country athlete. Build strong foundation before upper-level engineering specialization.",
        timeline: "September 2027 — May 2029",
        color: "var(--mc-dark-aqua)",
        events: [
            {
                id: "smc-1",
                title: "SMC Enrollment & Fall 2027 Begins",
                description:
                    "Start at Santa Monica College as recruited athlete (cross-country). Foundational STEM coursework: Calculus I, Physics I, Chemistry I.",
                date: "September 2027",
                dateRange: "Fall 2027 — Spring 2029",
                type: "major",
                phase: "smc",
                color: "var(--mc-dark-aqua)",
                icon: "Rocket",
                tags: ["Transfer", "STEM", "Athlete"],
                details: [
                    "Calculus I & II sequence",
                    "Physics I & II (with labs)",
                    "Chemistry I & II (with labs)",
                    "Engineering Design electives",
                    "General Education breadth requirements",
                    "Maintain 3.5+ GPA for transfer",
                ],
            },
            {
                id: "smc-2",
                title: "Mid-Point: Spring 2028",
                description: "Halfway through SMC coursework. Solidify math foundations and plan transfer.",
                date: "Spring 2028",
                type: "minor",
                phase: "smc",
                color: "var(--mc-dark-aqua)",
                icon: "CheckCircle",
                tags: ["Checkpoint"],
                details: [
                    "Complete Calculus sequence (I & II)",
                    "Finish Physics I, start Physics II",
                    "Begin Chemistry II",
                    "Meet with Cal Poly Pomona transfer advisor",
                ],
            },
            {
                id: "smc-3",
                title: "Spring 2029: Transfer to Cal Poly Pomona",
                description:
                    "Complete SMC requirements and transfer to Cal Poly Pomona as junior. Four semesters until degree completion.",
                date: "May 2029",
                type: "major",
                phase: "smc",
                color: "var(--mc-dark-aqua)",
                icon: "Zap",
                tags: ["Transfer", "Milestone"],
                details: [
                    "Complete all STEM prerequisites (Calc, Physics, Chem)",
                    "Finish General Education requirements",
                    "Accept Cal Poly Pomona admission as junior",
                    "Prepare for upper-level engineering courses",
                ],
            },
        ],
    },
    {
        id: "cal-poly",
        title: "Cal Poly Pomona: Civil Engineering Specialization",
        description:
            "Transfer as junior. Two-year completion with focus on Environmental Engineering specialization. Capstone project + professional development track.",
        timeline: "September 2029 — May 2031",
        color: "var(--mc-dark-green)",
        events: [
            {
                id: "cpp-1",
                title: "Transfer to Cal Poly Pomona (Junior)",
                description:
                    "Begin upper-level Civil Engineering coursework with Environmental specialization. Capstone project planning starts.",
                date: "September 2029",
                dateRange: "Fall 2029 — Spring 2031",
                type: "major",
                phase: "cal-poly",
                color: "var(--mc-dark-green)",
                icon: "Rocket",
                tags: ["Upper-Level", "Specialization"],
                details: [
                    "Water Resources Engineering",
                    "Environmental Engineering (focus)",
                    "Sustainable Infrastructure Design",
                    "Civil Engineering electives",
                    "Capstone project (2 semesters)",
                    "Summer internships with environmental firms",
                ],
            },
            {
                id: "cpp-2",
                title: "Spring 2030: Capstone Planning",
                description: "Mid-point: Capstone project proposal and team formation.",
                date: "Spring 2030",
                type: "minor",
                phase: "cal-poly",
                color: "var(--mc-dark-green)",
                icon: "Lightbulb",
                tags: ["Capstone"],
                details: [
                    "Capstone team formation (3-4 engineers)",
                    "Real-world infrastructure challenge selection",
                    "Project proposal and budget planning",
                    "Begin literature review and design analysis",
                ],
            },
            {
                id: "cpp-3",
                title: "Graduation: BS Civil Engineering",
                description:
                    "Official completion of bachelor's degree in Civil Engineering with Environmental specialization. Ready for professional career in environmental design.",
                date: "May 2031",
                type: "major",
                phase: "cal-poly",
                color: "var(--mc-dark-green)",
                icon: "GraduationCap",
                tags: ["Graduation", "Degree", "Career-Ready"],
                details: [
                    "Capstone project final presentation",
                    "Degree conferment: BS Civil Engineering",
                    "Environmental specialization recognized",
                    "Job search begins with engineering firms",
                ],
            },
        ],
    },
    {
        id: "personal",
        title: "Personal Studies & Ongoing Work",
        description:
            "Independent research and creative development running parallel to formal education. Philosophy, sustainable systems, design practice, and game development.",
        timeline: "Ongoing",
        color: "var(--mc-light-purple)",
        events: [
            {
                id: "personal-1",
                title: "Philosophy & Existentialism",
                description:
                    "Deep independent study of Kierkegaard, Sartre, and existential frameworks. How authentic philosophy informs design practice and engineering ethics.",
                date: "Ongoing",
                dateRange: "Sept 2026 — Career",
                type: "major",
                phase: "personal",
                color: "var(--mc-light-purple)",
                icon: "Lightbulb",
                tags: ["Philosophy", "Self-Directed"],
                details: [
                    "Primary texts: Fear and Trembling, Either/Or, The Concept of Anxiety",
                    "Connection to design authenticity (avoid fake solutions)",
                    "Individual responsibility in engineering decisions",
                    "Build philosophical framework for life decisions",
                ],
            },
            {
                id: "personal-2",
                title: "Fractured Islands: Ascension",
                description:
                    "Long-running solo Roblox game development project. Systems-driven incremental RPG combining button simulators with skill-based progression.",
                date: "Ongoing",
                dateRange: "2026 — Indefinite",
                type: "major",
                phase: "personal",
                color: "var(--mc-light-purple)",
                icon: "Zap",
                tags: ["Game Dev", "Solo Project"],
                details: [
                    "100+ attributes and progression systems",
                    "Dual progression model (button sim + skill tree)",
                    "Community engagement and feature feedback",
                    "Parallel to academic work (systems thinking transfer)",
                ],
            },
            {
                id: "personal-3",
                title: "Sustainable Systems Research",
                description:
                    "Independent investigation of climate adaptation, circular design, and regenerative systems. Research feeds into Senior Project and future engineering work.",
                date: "Ongoing",
                dateRange: "Fall 2026 — Career",
                type: "minor",
                phase: "personal",
                color: "var(--mc-light-purple)",
                icon: "Lightbulb",
                tags: ["Sustainability", "Research"],
                details: [
                    "Climate modeling and adaptation strategies",
                    "Circular economy and regenerative design",
                    "Water systems and ecological restoration",
                    "Integration with Senior Project research",
                ],
            },
            {
                id: "personal-4",
                title: "Design & Creativity Practice",
                description:
                    "Daily creative work: sketching, visual thinking, CAD skill development. Design iteration connecting Studio Art to engineering design thinking.",
                date: "Ongoing",
                dateRange: "Daily Practice",
                type: "minor",
                phase: "personal",
                color: "var(--mc-light-purple)",
                icon: "CheckCircle",
                tags: ["Creativity", "Skills"],
                details: [
                    "SketchUp mastery and intermediate modeling",
                    "CAD fundamentals (AutoCAD, Civil 3D readiness)",
                    "Digital illustration and visual communication",
                    "Bridge between artistic and technical thinking",
                ],
            },
        ],
    },
];

export default function TimelinePage() {
    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="grid" color="#55ff55" />
            <SidebarNav
                sections={[
                    { id: "high-school", label: "High School" },
                    { id: "smc", label: "Community College" },
                    { id: "cal-poly", label: "Cal Poly Pomona" },
                    { id: "personal", label: "Personal Studies" },
                ]}
            />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Journey"
                    title="Timeline"
                    description="Complete educational pathway from high school through degree. Four phases: senior year, community college transfer, university specialization, and ongoing personal research. Where you are, and where you're heading."
                    accent="var(--mc-green)"
                />

                <div className="mx-auto mt-16 max-w-4xl space-y-20 scroll-mt-24">
                    {phases.map((phase) => (
                        <TimelinePhase key={phase.id} phase={phase} />
                    ))}

                    {/* Future goals section */}
                    <div className="mt-20 border-t border-border/40 pt-16">
                        <div className="mb-8">
                            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                                Beyond Graduation
                            </p>
                            <h2 className="mt-3 font-rubik text-3xl font-bold sm:text-4xl">
                                <span style={{ color: "var(--mc-gold)" }}>
                                    Future Horizons
                                </span>
                            </h2>
                            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                                After BS Civil Engineering (2031), trajectory toward impact in
                                environmental infrastructure, sustainable design, and systems
                                thinking applied to real-world challenges.
                            </p>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                            {[
                                {
                                    title: "Environmental Engineering Firm",
                                    description:
                                        "Early career: 2-3 years with leading sustainable infrastructure firm. Build professional network and real-world project experience.",
                                    color: "var(--mc-dark-green)",
                                },
                                {
                                    title: "Thought Leadership",
                                    description:
                                        "Mid-career: Write on philosophy + engineering, speak at conferences. Position as thought leader in authentic, ethical design.",
                                    color: "var(--mc-light-purple)",
                                },
                                {
                                    title: "Independent Practice",
                                    description:
                                        "Long-term: Founder of design-focused sustainability consultancy. Apply systems thinking to complex environmental challenges.",
                                    color: "var(--mc-gold)",
                                },
                                {
                                    title: "Fractured Islands Impact",
                                    description:
                                        "Ongoing: Grow Fractured Islands to 100K+ active players. Prove games can teach systems thinking at scale.",
                                    color: "var(--mc-blue)",
                                },
                            ].map((goal, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-opacity-40 bg-background/20 p-4 transition-all duration-300 hover:border-opacity-100 hover:bg-background/40"
                                    style={{
                                        borderColor: goal.color,
                                    }}
                                >
                                    <h3
                                        className="font-rubik text-lg font-bold"
                                        style={{ color: goal.color }}
                                    >
                                        {goal.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {goal.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

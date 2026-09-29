// Single source of truth for the /timeline page (and anything else that needs
// to know the plan): phases, events, real dates and the helpers that turn
// dates into status/progress. Edit here and the whole page follows.
//
// Dates are ISO (YYYY-MM-DD). `start`/`end` are what drive status ("done",
// "now", "upcoming") and progress, so keep them accurate; `when` is only the
// human label shown on the card. `special: true` marks the super-special
// milestones that get the animated rainbow ("chroma") treatment.

export type PhaseId = "high-school" | "smc" | "cal-poly" | "personal";

export type TimelineIconName =
    | "BookOpen"
    | "GraduationCap"
    | "Award"
    | "Zap"
    | "Rocket"
    | "CheckCircle"
    | "Lightbulb"
    | "Flag"
    | "Trophy"
    | "Send"
    | "Palette"
    | "Footprints"
    | "Briefcase"
    | "Users"
    | "Target"
    | "Sun"
    | "Compass"
    | "Code2"
    | "Leaf"
    | "Brain";

export interface TimelineEventData {
    id: string;
    title: string;
    description: string;
    /** Human label shown on the card, e.g. "May 3 – 13, 2027". */
    when: string;
    start: string;
    /** Omit for a single-day event. */
    end?: string;
    /** Open-ended, never "done" (independent work that runs alongside school). */
    ongoing?: boolean;
    type: "major" | "minor";
    icon: TimelineIconName;
    tags?: string[];
    details?: string[];
    /** Super-special milestone: animated rainbow border, title and marker. */
    special?: boolean;
}

export interface TimelinePhaseData {
    id: PhaseId;
    title: string;
    /** Short name for chips and the journey bar. */
    short: string;
    /** Range label under the title. */
    range: string;
    description: string;
    color: string;
    icon: TimelineIconName;
    start: string;
    end: string;
    events: TimelineEventData[];
}

export const JOURNEY_START = "2026-09-01";
export const JOURNEY_END = "2031-05-31";

export const KEY_DATES = {
    apStart: "2027-05-03",
    apEnd: "2027-05-13",
    graduation: "2027-06-10",
} as const;

export const phases: TimelinePhaseData[] = [
    {
        id: "high-school",
        title: "High School Senior Year",
        short: "Senior Year",
        range: "September 2026 — June 2027",
        description:
            "The final year before college. Six interdisciplinary courses, college applications, the SAT retake, AP exams and the Senior Project capstone, all pointed at an environmental engineering pathway.",
        color: "var(--mc-blue)",
        icon: "BookOpen",
        start: "2026-09-01",
        end: "2027-06-10",
        events: [
            {
                id: "hs-1",
                title: "Senior Year Begins",
                description:
                    "Six courses (Senior Project, AP Stats, AP Bio, Communications, Studio Art, AP Gov) building toward environmental engineering, with Kierkegaard's philosophy applied to design work.",
                when: "Sept 2026 — Ongoing",
                start: "2026-09-01",
                end: "2027-06-10",
                type: "major",
                icon: "BookOpen",
                tags: ["Coursework", "6 Courses"],
                details: [
                    "Senior Project: public space transformation research",
                    "AP Statistics: quantitative analysis and hypothesis testing",
                    "AP Biology: systems thinking and ecology",
                    "Communications: public speaking and presentation design",
                    "AP Studio Art: visual portfolio development (12–15 pieces)",
                    "AP Government: constitutional law and political systems",
                ],
            },
            {
                id: "hs-2",
                title: "College Outreach & SAT Registration",
                description:
                    "Open the door with Santa Monica College's cross-country program and lock in a January SAT date.",
                when: "October 2026",
                start: "2026-10-01",
                end: "2026-10-31",
                type: "minor",
                icon: "Send",
                tags: ["Athletics", "SAT"],
                details: [
                    "Reach out to the SMC cross-country coach about recruited-athlete status",
                    "Register for the January SAT",
                    "Pull together an athletic resume: race results and training history",
                ],
            },
            {
                id: "hs-3",
                title: "First Portfolio Project",
                description:
                    "Start the first real design piece: a SketchUp redesign of a local space, documented from the existing conditions forward.",
                when: "Nov — Dec 2026",
                start: "2026-11-01",
                end: "2026-12-31",
                type: "major",
                icon: "Palette",
                tags: ["Portfolio", "SketchUp", "Design"],
                details: [
                    "Choose and survey the space, then document what's there",
                    "Model the redesign in SketchUp",
                    "Write up the reasoning so the process is part of the piece",
                    "Feeds the Recent Renovations section of this site",
                ],
            },
            {
                id: "hs-4",
                title: "College Applications",
                description:
                    "Apply to Santa Monica College and line up the transfer pathway to Cal Poly Pomona.",
                when: "December 2026",
                start: "2026-12-01",
                end: "2026-12-31",
                type: "major",
                icon: "Send",
                tags: ["SMC", "Transfer"],
                details: [
                    "Submit the Santa Monica College application (rolling admissions)",
                    "Get the SMC → Cal Poly Pomona transfer agreement in writing",
                    "Confirm backup schools",
                ],
            },
            {
                id: "hs-5",
                title: "SAT Retake",
                description: "One more attempt at a stronger score, after months of steady prep.",
                when: "January 2027",
                start: "2027-01-01",
                end: "2027-01-31",
                type: "minor",
                icon: "Target",
                tags: ["SAT", "Exam"],
                details: [
                    "Sit the January SAT",
                    "Send scores to the colleges that need them",
                    "Decide whether another attempt is worth it",
                ],
            },
            {
                id: "hs-6",
                title: "AP Studio Art Portfolio Push",
                description:
                    "The long build toward the AP Studio Art submission: breadth, concentration and a body of work with a point of view.",
                when: "Feb — Apr 2027",
                start: "2027-02-01",
                end: "2027-04-30",
                type: "minor",
                icon: "Palette",
                tags: ["Studio Art", "Portfolio"],
                details: [
                    "12–15 finished pieces across the breadth and concentration sections",
                    "Steady checkpoints so nothing lands in the last week",
                    "Document the process alongside the finished work",
                ],
            },
            {
                id: "hs-7",
                title: "AP Exam Window",
                description:
                    "Two weeks of AP testing: Statistics, Biology and Government exams, plus the Studio Art portfolio submission.",
                when: "May 3 – 13, 2027",
                start: KEY_DATES.apStart,
                end: KEY_DATES.apEnd,
                type: "major",
                icon: "Award",
                special: true,
                tags: ["Exams", "Statistics", "Biology", "Government"],
                details: [
                    "May 3 – 13: the full AP testing window",
                    "Target: 4–5 on each exam, based on AP history",
                    "Studio Art portfolio submitted before the window closes",
                    "The last big checkpoint before graduation",
                ],
            },
            {
                id: "hs-8",
                title: "Senior Project Presentation",
                description:
                    "The capstone: presenting the public-space transformation research to stakeholders.",
                when: "Late May – early June 2027",
                start: "2027-05-14",
                end: "2027-06-05",
                type: "minor",
                icon: "Users",
                tags: ["Capstone", "Presentation"],
                details: [
                    "Final Senior Project presentation to stakeholders",
                    "The research, the design thinking and the case for the change",
                ],
            },
            {
                id: "hs-9",
                title: "High School Graduation",
                description:
                    "June 10, 2027: the official end of high school, and the start of the college pathway.",
                when: "June 10, 2027",
                start: KEY_DATES.graduation,
                type: "major",
                icon: "GraduationCap",
                special: true,
                tags: ["Graduation", "Milestone"],
                details: [
                    "Senior Project capstone complete",
                    "College applications settled (SMC, backup schools)",
                    "Ready for the community college transfer pathway",
                ],
            },
            {
                id: "hs-10",
                title: "Summer Before SMC",
                description:
                    "The runway between graduation and the first day of college: logistics, base training and a head start.",
                when: "Summer 2027",
                start: "2027-06-11",
                end: "2027-08-31",
                type: "minor",
                icon: "Sun",
                tags: ["Prep", "Running"],
                details: [
                    "Lock in the housing and commute plan for SMC",
                    "Build the running base for cross-country season",
                    "Placement, orientation and registration",
                ],
            },
        ],
    },
    {
        id: "smc",
        title: "Santa Monica College Transfer Pathway",
        short: "Santa Monica College",
        range: "September 2027 — May 2029",
        description:
            "Two years of STEM prerequisites while competing as a recruited cross-country athlete. A strong foundation before upper-level engineering specialization.",
        color: "var(--mc-dark-aqua)",
        icon: "Rocket",
        start: "2027-09-01",
        end: "2029-05-31",
        events: [
            {
                id: "smc-1",
                title: "SMC Enrollment & Fall 2027",
                description:
                    "Start at Santa Monica College as a recruited cross-country athlete. Foundational STEM coursework: Calculus I, Physics I, Chemistry I.",
                when: "Fall 2027",
                start: "2027-09-01",
                end: "2027-12-20",
                type: "major",
                icon: "Rocket",
                tags: ["Transfer", "STEM", "Athlete"],
                details: [
                    "Calculus I & II sequence",
                    "Physics I & II (with labs)",
                    "Chemistry I & II (with labs)",
                    "Engineering design electives",
                    "General education breadth requirements",
                    "Maintain a 3.5+ GPA for transfer",
                ],
            },
            {
                id: "smc-2",
                title: "First Cross-Country Season",
                description:
                    "Racing for SMC: the start of a leadership path that runs through both colleges.",
                when: "Fall 2027",
                start: "2027-09-01",
                end: "2027-11-30",
                type: "minor",
                icon: "Footprints",
                tags: ["Athletics", "Cross-Country"],
                details: [
                    "Compete as a recruited athlete",
                    "Build toward captain or vice-captain",
                    "Balance training load with a full STEM schedule",
                ],
            },
            {
                id: "smc-3",
                title: "Midpoint: Spring 2028",
                description:
                    "Halfway through SMC. Solidify the math foundation and plan the transfer.",
                when: "Spring 2028",
                start: "2028-01-15",
                end: "2028-05-31",
                type: "minor",
                icon: "CheckCircle",
                tags: ["Checkpoint"],
                details: [
                    "Complete the Calculus sequence (I & II)",
                    "Finish Physics I, start Physics II",
                    "Begin Chemistry II",
                    "Meet with the Cal Poly Pomona transfer advisor",
                ],
            },
            {
                id: "smc-4",
                title: "Transfer Applications",
                description:
                    "The application window for Cal Poly Pomona, with grades and prerequisites locked in.",
                when: "Fall 2028",
                start: "2028-09-01",
                end: "2028-11-30",
                type: "major",
                icon: "Send",
                tags: ["Transfer", "Applications"],
                details: [
                    "Submit the Cal Poly Pomona transfer application",
                    "Confirm every prerequisite is on track",
                    "Keep the GPA above the 3.5 target",
                ],
            },
            {
                id: "smc-5",
                title: "Two Portfolio Projects Complete",
                description:
                    "Two finished design portfolio pieces, plus real CAD and Revit skills, ready for the next step.",
                when: "By Spring 2029",
                start: "2028-01-01",
                end: "2029-05-31",
                type: "minor",
                icon: "Palette",
                tags: ["Portfolio", "CAD", "Revit"],
                details: [
                    "Two polished design projects by the end of SMC",
                    "CAD and Revit fundamentals",
                    "Each piece documents the thinking, not just the drawings",
                ],
            },
            {
                id: "smc-6",
                title: "Transfer to Cal Poly Pomona",
                description:
                    "Finish SMC and transfer to Cal Poly Pomona as a junior, with four semesters to go until the degree.",
                when: "May 2029",
                start: "2029-05-01",
                end: "2029-05-31",
                type: "major",
                icon: "Zap",
                special: true,
                tags: ["Transfer", "Milestone"],
                details: [
                    "All STEM prerequisites complete (Calc, Physics, Chem)",
                    "General education requirements finished",
                    "Accept Cal Poly Pomona admission as a junior",
                    "Prepare for upper-level engineering courses",
                ],
            },
        ],
    },
    {
        id: "cal-poly",
        title: "Cal Poly Pomona: Civil Engineering",
        short: "Cal Poly Pomona",
        range: "September 2029 — May 2031",
        description:
            "Transfer as a junior and finish in two years, specializing in Environmental Engineering. A capstone project and a professional development track.",
        color: "var(--mc-dark-green)",
        icon: "Leaf",
        start: "2029-09-01",
        end: "2031-05-31",
        events: [
            {
                id: "cpp-1",
                title: "Junior Year at Cal Poly Pomona",
                description:
                    "Upper-level Civil Engineering coursework with the Environmental specialization. Capstone planning starts.",
                when: "Fall 2029",
                start: "2029-09-01",
                end: "2029-12-20",
                type: "major",
                icon: "Rocket",
                tags: ["Upper-Level", "Specialization"],
                details: [
                    "Water Resources Engineering",
                    "Environmental Engineering (focus)",
                    "Sustainable Infrastructure Design",
                    "Civil Engineering electives",
                    "Capstone project (two semesters)",
                    "Summer internships with environmental firms",
                ],
            },
            {
                id: "cpp-2",
                title: "Leading the Cross-Country Team",
                description:
                    "Carrying the athletic leadership thread into Pomona: discipline, teamwork and resilience.",
                when: "2029 — 2031",
                start: "2029-09-01",
                end: "2031-05-31",
                type: "minor",
                icon: "Footprints",
                tags: ["Athletics", "Leadership"],
                details: [
                    "Goal: captain of the Pomona cross-country team",
                    "Team management is practice for founding a company",
                ],
            },
            {
                id: "cpp-3",
                title: "Capstone Planning",
                description: "Midpoint: the capstone proposal and team formation.",
                when: "Spring 2030",
                start: "2030-01-15",
                end: "2030-05-31",
                type: "minor",
                icon: "Lightbulb",
                tags: ["Capstone"],
                details: [
                    "Form the capstone team (3–4 engineers)",
                    "Choose a real-world infrastructure challenge",
                    "Proposal and budget planning",
                    "Start the literature review and design analysis",
                ],
            },
            {
                id: "cpp-4",
                title: "Summer Internship",
                description:
                    "Real-world project experience with an environmental engineering firm.",
                when: "Summer 2030",
                start: "2030-06-01",
                end: "2030-08-31",
                type: "minor",
                icon: "Briefcase",
                tags: ["Internship", "Career"],
                details: [
                    "Work on live infrastructure or environmental projects",
                    "Build the professional network that starts the career",
                ],
            },
            {
                id: "cpp-5",
                title: "Capstone Build",
                description:
                    "Two semesters designing and delivering the capstone: the proof-of-concept that anchors the portfolio.",
                when: "Fall 2030 — Spring 2031",
                start: "2030-09-01",
                end: "2031-04-30",
                type: "major",
                icon: "Zap",
                tags: ["Capstone", "Design"],
                details: [
                    "Design development with the capstone team",
                    "Analysis, modeling and iteration",
                    "Final presentation and documentation",
                ],
            },
            {
                id: "cpp-6",
                title: "Graduation: BS Civil Engineering",
                description:
                    "The bachelor's degree in Civil Engineering with the Environmental specialization, and the start of a professional career.",
                when: "May 2031",
                start: "2031-05-01",
                end: "2031-05-31",
                type: "major",
                icon: "GraduationCap",
                special: true,
                tags: ["Graduation", "Degree", "Career-Ready"],
                details: [
                    "Capstone final presentation",
                    "Degree conferred: BS Civil Engineering",
                    "Environmental specialization recognized",
                    "Launch the business or project the whole plan has been building toward",
                ],
            },
        ],
    },
    {
        id: "personal",
        title: "Personal Studies & Ongoing Work",
        short: "Personal Studies",
        range: "Ongoing",
        description:
            "Independent research and creative work running in parallel with formal education: philosophy, sustainable systems, design practice, game development, running and this website.",
        color: "var(--mc-light-purple)",
        icon: "Brain",
        start: "2026-09-01",
        end: "2031-05-31",
        events: [
            {
                id: "personal-1",
                title: "Philosophy & Existentialism",
                description:
                    "Deep independent study of Kierkegaard, Sartre and existential frameworks, and how authentic philosophy informs design practice and engineering ethics.",
                when: "Sept 2026 — Career",
                start: "2026-09-01",
                ongoing: true,
                type: "major",
                icon: "Lightbulb",
                tags: ["Philosophy", "Self-Directed"],
                details: [
                    "Primary texts: Fear and Trembling, Either/Or, The Concept of Anxiety",
                    "Connection to design authenticity (avoid fake solutions)",
                    "Individual responsibility in engineering decisions",
                    "A philosophical framework for life decisions",
                ],
            },
            {
                id: "personal-2",
                title: "Fractured Islands: Ascension",
                description:
                    "A long-running solo Roblox game project: a systems-driven incremental RPG combining button simulators with skill-based progression.",
                when: "2026 — Indefinite",
                start: "2026-09-01",
                ongoing: true,
                type: "major",
                icon: "Zap",
                tags: ["Game Dev", "Solo Project"],
                details: [
                    "100+ attributes and progression systems",
                    "Dual progression model (button sim + skill tree)",
                    "Community engagement and feature feedback",
                    "Systems thinking that transfers to academic work",
                ],
            },
            {
                id: "personal-3",
                title: "Sustainable Systems Research",
                description:
                    "Independent investigation of climate adaptation, circular design and regenerative systems, feeding the Senior Project and future engineering work.",
                when: "Fall 2026 — Career",
                start: "2026-09-01",
                ongoing: true,
                type: "minor",
                icon: "Leaf",
                tags: ["Sustainability", "Research"],
                details: [
                    "Climate modeling and adaptation strategies",
                    "Circular economy and regenerative design",
                    "Water systems and ecological restoration",
                    "Integration with the Senior Project research",
                ],
            },
            {
                id: "personal-4",
                title: "Design & Creativity Practice",
                description:
                    "Daily creative work: sketching, visual thinking and CAD skill development, connecting Studio Art to engineering design thinking.",
                when: "Daily practice",
                start: "2026-09-01",
                ongoing: true,
                type: "minor",
                icon: "Palette",
                tags: ["Creativity", "Skills"],
                details: [
                    "SketchUp mastery and intermediate modeling",
                    "CAD fundamentals (AutoCAD, Civil 3D readiness)",
                    "Digital illustration and visual communication",
                    "A bridge between artistic and technical thinking",
                ],
            },
            {
                id: "personal-5",
                title: "Running & Cross-Country",
                description:
                    "Staying competitive and consistent through senior year and on into college racing.",
                when: "Year-round",
                start: "2026-09-01",
                ongoing: true,
                type: "minor",
                icon: "Footprints",
                tags: ["Athletics", "Discipline"],
                details: [
                    "Training built around the recruiting and college seasons",
                    "Daily progress over grinding: calm, paced and consistent",
                ],
            },
            {
                id: "personal-6",
                title: "This Website",
                description:
                    "nateanderson.dev started as a portfolio and keeps evolving: an ever-improving personal site, and the home for renovation pieces and Blender studies.",
                when: "Always building",
                start: "2026-09-01",
                ongoing: true,
                type: "minor",
                icon: "Code2",
                tags: ["Web", "Portfolio"],
                details: [
                    "Every change is public in the Site History page",
                    "New sections, pages and experiments ship continuously",
                ],
            },
        ],
    },
];

export type EventStatus = "done" | "now" | "upcoming" | "ongoing";

const DAY = 24 * 60 * 60 * 1000;

function at(date: string, endOfDay = false) {
    return new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`).getTime();
}

export function getStatus(event: TimelineEventData, now = Date.now()): EventStatus {
    if (event.ongoing) return "ongoing";
    const start = at(event.start);
    const end = at(event.end ?? event.start, true);
    if (now > end) return "done";
    if (now >= start) return "now";
    return "upcoming";
}

/** 0–1: how far through a date range "now" is. */
export function progressBetween(start: string, end: string, now = Date.now()): number {
    const s = at(start);
    const e = at(end, true);
    return Math.min(1, Math.max(0, (now - s) / (e - s)));
}

/** Whole days from now until the start of `date` (negative once it has passed). */
export function daysUntil(date: string, now = Date.now()): number {
    return Math.ceil((at(date) - now) / DAY);
}

export function allEvents() {
    return phases.flatMap((phase) => phase.events.map((event) => ({ ...event, phase })));
}

/** The next few dated (non-ongoing) events that haven't finished yet. */
export function getUpNext(limit = 4, now = Date.now()) {
    return allEvents()
        .filter((e) => !e.ongoing && e.phase.id !== "personal" && getStatus(e, now) !== "done")
        .sort((a, b) => at(a.start) - at(b.start))
        .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
        .slice(0, limit);
}

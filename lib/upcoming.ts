// Content for the landing page's Timeline View. Kept as plain data so it is
// easy to edit as plans change. The 2027 side mirrors dates already on the
// full /timeline page; the next-months side comes from the current goals in
// the vault (see 8 - Claude/North Star.md, "Immediate Actions").
export interface UpcomingMonth {
    label: string;
    year: string;
    color: string;
    goals: string[];
}

export interface UpcomingMilestone {
    when: string;
    title: string;
    detail: string;
    color: string;
}

export const NEXT_MONTHS: UpcomingMonth[] = [
    {
        label: "October",
        year: "2026",
        color: "var(--mc-aqua)",
        goals: [
            "Reach out to the Santa Monica College cross-country coach",
            "Register for the January SAT",
            "Pick the first real portfolio project",
        ],
    },
    {
        label: "November",
        year: "2026",
        color: "var(--mc-gold)",
        goals: [
            "Steady daily SAT prep",
            "Start the first portfolio design: a SketchUp redesign of a local space",
            "Keep shipping updates to Fractured Islands: Ascension",
        ],
    },
    {
        label: "December",
        year: "2026",
        color: "var(--mc-green)",
        goals: [
            "Submit the Santa Monica College application",
            "Lock in the SMC → Cal Poly Pomona transfer agreement",
            "Finish the semester strong",
        ],
    },
];

export const NEXT_YEAR: { year: string; blurb: string; milestones: UpcomingMilestone[] } = {
    year: "2027",
    blurb: "The pivot year: finish high school, lock in college, and turn planning into shipped work.",
    milestones: [
        {
            when: "January",
            title: "SAT retake",
            detail: "One more attempt at the score, after months of prep.",
            color: "var(--mc-yellow)",
        },
        {
            when: "Spring",
            title: "First polished portfolio piece",
            detail: "One finished, presentable design project, not just sketches.",
            color: "var(--mc-light-purple)",
        },
        {
            when: "May",
            title: "AP exam week",
            detail: "Statistics, Biology, Government and the Studio Art portfolio.",
            color: "var(--mc-blue)",
        },
        {
            when: "June",
            title: "High school graduation",
            detail: "Senior Project capstone presented; the college pathway begins.",
            color: "var(--mc-red)",
        },
        {
            when: "September",
            title: "Santa Monica College begins",
            detail: "Fall 2027 kickoff: pre-engineering coursework and cross-country.",
            color: "var(--mc-dark-aqua)",
        },
    ],
};

import {
    GraduationCap,
    PieChart,
    Microscope,
    Mic,
    Palette,
    Scale,
    BookOpen,
    Lightbulb,
} from "lucide-react";
import type { CourseData } from "@/components/coursework-grid";
import { CourseworkGrid } from "@/components/coursework-grid";
import type { ProgramCard } from "@/components/education-program-card";
import { EducationProgramCard } from "@/components/education-program-card";
import { PageHero } from "@/components/page-hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageBackground } from "@/components/page-background";
import { SectionLabel } from "@/components/section-label";

const courses: CourseData[] = [
    {
        title: "Senior Project",
        slug: "senior-project",
        color: "var(--mc-gold)",
        icon: GraduationCap,
        description:
            "Landscape design and outdoor space transformation. Exploring how thoughtful design revitalizes neglected public spaces through evidence-based methodology.",
        tags: ["Design", "Engineering", "Research", "Leadership"],
        focus: [
            "Public space design",
            "User behavior analysis",
            "Systems thinking",
            "Sustainable planning",
        ],
        status: "In Progress",
        href: "/studies/senior-project",
    },
    {
        title: "AP Statistics",
        slug: "ap-statistics",
        color: "var(--mc-red)",
        icon: PieChart,
        description:
            "Statistical analysis, probability, and data interpretation. Mastering quantitative reasoning for research and decision-making.",
        tags: ["Mathematics", "Data Analysis", "Research Methods"],
        focus: [
            "Hypothesis testing",
            "Probability distributions",
            "Regression analysis",
            "Data visualization",
        ],
        status: "In Progress",
        href: "/studies/ap-statistics",
    },
    {
        title: "AP Biology",
        slug: "ap-biology",
        color: "var(--mc-green)",
        icon: Microscope,
        description:
            "Cellular and organismal biology, ecology, and genetics. Building foundational understanding of living systems and environmental interconnectedness.",
        tags: ["Life Sciences", "Laboratory", "Systems"],
        focus: [
            "Cell structure and function",
            "Genetics and evolution",
            "Ecology and ecosystems",
            "Photosynthesis & respiration",
        ],
        status: "In Progress",
        href: "/studies/ap-biology",
    },
    {
        title: "Intro to Communications & Public Speaking",
        slug: "intro-communications",
        color: "var(--mc-aqua)",
        icon: Mic,
        description:
            "Communication theory, interpersonal dynamics, and public speaking. Developing articulate presentation and persuasive messaging skills.",
        tags: ["Communication", "Public Speaking", "Interpersonal Skills"],
        focus: [
            "Communication models",
            "Public speaking",
            "Presentation design",
            "Audience analysis",
        ],
        status: "In Progress",
        href: "/studies/intro-communications",
    },
    {
        title: "AP 2-D Studio Art",
        slug: "ap-studio-art",
        color: "var(--mc-light-purple)",
        icon: Palette,
        description:
            "Visual composition, design principles, and artistic expression. Developing a portfolio demonstrating conceptual depth and technical mastery.",
        tags: ["Visual Arts", "Design", "Portfolio", "Creativity"],
        focus: [
            "Composition and balance",
            "Color theory",
            "Drawing fundamentals",
            "Mixed media techniques",
        ],
        status: "In Progress",
        href: "/studies/ap-studio-art",
    },
    {
        title: "AP Government & Politics",
        slug: "ap-government",
        color: "var(--mc-blue)",
        icon: Scale,
        description:
            "Constitutional law, political systems, and Supreme Court case studies. Understanding the mechanics of American democracy and civic governance.",
        tags: ["Government", "Law", "Civics", "Politics"],
        focus: [
            "Constitutional law",
            "Supreme Court decisions",
            "Political ideologies",
            "Federalism and separation of powers",
        ],
        status: "In Progress",
        href: "/studies/ap-government",
    },
];

const communityCollege: ProgramCard[] = [
    {
        title: "Santa Monica College",
        color: "var(--mc-dark-aqua)",
        icon: GraduationCap,
        description:
            "Transfer pathway for foundational STEM coursework. Complete core engineering prerequisites (Calculus I/II, Physics I/II, Chemistry I/II) while competing as a recruited cross-country athlete.",
        institution: "SMC - Corsairs XC",
        timeline: "Fall 2027 - Spring 2029 (2 years)",
        courses: [
            "Calculus I & II",
            "Physics I & II",
            "Chemistry I & II",
            "Engineering Design",
        ],
        placeholder: false,
    },
    {
        title: "General Education",
        color: "var(--mc-yellow)",
        icon: BookOpen,
        description:
            "Breadth requirements and electives. Explore areas that deepen systems thinking and connect to environmental engineering philosophy.",
        institution: "SMC",
        timeline: "Fall 2027 - Spring 2029",
        courses: [
            "Environmental Science",
            "Technical Writing",
            "Philosophy Electives",
        ],
        placeholder: false,
    },
];

const calPolyPomona: ProgramCard[] = [
    {
        title: "Civil Engineering",
        color: "var(--mc-dark-green)",
        icon: GraduationCap,
        description:
            "Specialization: Environmental Engineering. 2-year completion after SMC transfer. Capstone project applying systems thinking to real-world infrastructure challenges.",
        institution: "Cal Poly Pomona",
        timeline: "Fall 2029 - Spring 2031 (2 years)",
        courses: [
            "Water Resources",
            "Environmental Engineering",
            "Sustainable Infrastructure",
            "Capstone Design",
        ],
        placeholder: false,
    },
    {
        title: "Professional Development",
        color: "var(--mc-light-purple)",
        icon: Lightbulb,
        description:
            "Internships, industry projects, and professional networking. Build experience with civil engineering firms focused on environmental design.",
        institution: "Cal Poly Pomona",
        timeline: "Ongoing throughout program",
        courses: [
            "Summer Internships",
            "Industry Projects",
            "Consulting Work",
        ],
        placeholder: false,
    },
];

const personalStudies: ProgramCard[] = [
    {
        title: "Philosophy & Existentialism",
        color: "var(--mc-light-purple)",
        icon: BookOpen,
        description:
            "Independent deep dive into Kierkegaard, Sartre, and existential philosophy. How do authentic philosophical frameworks inform design practice and ethical decision-making?",
        timeline: "Ongoing (ongoing)",
        courses: [
            "Fear and Trembling",
            "Either/Or",
            "The Concept of Anxiety",
        ],
        placeholder: false,
    },
    {
        title: "Sustainable Systems Research",
        color: "var(--mc-dark-green)",
        icon: Lightbulb,
        description:
            "Investigate climate adaptation strategies, circular design, and regenerative systems. Connect personal research to Senior Project and future engineering work.",
        timeline: "Fall 2026 - ongoing",
        courses: [
            "Climate Modeling",
            "Regenerative Design",
            "Water Systems",
        ],
        placeholder: false,
    },
    {
        title: "Design & Creativity Practice",
        color: "var(--mc-gold)",
        icon: Palette,
        description:
            "Sketching, visual thinking, and design iteration. Daily creative practice connecting Studio Art coursework to engineering design thinking.",
        timeline: "Daily practice",
        courses: [
            "Digital Design Tools",
            "SketchUp Mastery",
            "CAD Fundamentals",
        ],
        placeholder: false,
    },
];

export default function StudiesPage() {
    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="grid" color="#5555ff" />
            <SidebarNav
                sections={[
                    { id: "senior-year", label: "Senior Year Classes" },
                    { id: "community-college", label: "Community College" },
                    { id: "cal-poly", label: "Cal Poly Pomona" },
                    { id: "personal", label: "Personal Studies" },
                ]}
            />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Learning"
                    title="Studies"
                    description="Complete educational pathway: high school foundation, community college transfer, university specialization, and independent research. Integrated systems thinking across technical, creative, and philosophical domains."
                    accent="var(--mc-blue)"
                />

                {/* Senior Year Classes */}
                <div id="senior-year" className="mx-auto mt-14 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-blue)">
                        Senior Year Classes
                    </SectionLabel>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Six interdisciplinary courses building toward environmental engineering
                        and systems-thinking. Click any course for details on focus areas,
                        resources, and learning goals.
                    </p>
                    <div className="mt-8">
                        <CourseworkGrid courses={courses} />
                    </div>
                </div>

                {/* Community College */}
                <div id="community-college" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-dark-aqua)">
                        Community College
                    </SectionLabel>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Santa Monica College transfer pathway (2027-2029). Complete STEM
                        prerequisites while competing as recruited athlete. Built-in flexibility
                        for foundational coursework before upper-level engineering specialization.
                    </p>
                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {communityCollege.map((card, idx) => (
                            <EducationProgramCard key={idx} card={card} index={idx} />
                        ))}
                    </div>
                </div>

                {/* Cal Poly Pomona */}
                <div id="cal-poly" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-dark-green)">
                        4-Year University: Cal Poly Pomona
                    </SectionLabel>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Transfer to Cal Poly Pomona as junior (2029). Civil Engineering with
                        Environmental specialization. Capstone project + professional development
                        pathway. Target graduation: Spring 2031.
                    </p>
                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {calPolyPomona.map((card, idx) => (
                            <EducationProgramCard key={idx} card={card} index={idx} />
                        ))}
                    </div>
                </div>

                {/* Personal Studies */}
                <div id="personal" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-light-purple)">
                        Personal Studies & Independent Research
                    </SectionLabel>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Self-directed learning alongside formal coursework. Philosophy,
                        sustainable systems, design practice, and technical skill development.
                        These areas inform and deepen engagement with all academic work.
                    </p>
                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {personalStudies.map((card, idx) => (
                            <EducationProgramCard key={idx} card={card} index={idx} />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

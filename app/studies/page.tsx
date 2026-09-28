import {
    GraduationCap,
    PieChart,
    Microscope,
    Mic,
    Palette,
    Scale,
} from "lucide-react";
import type { CourseData } from "@/components/coursework-grid";
import { CourseworkGrid } from "@/components/coursework-grid";
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
    },
];

export default function StudiesPage() {
    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="grid" color="#5555ff" />
            <SidebarNav sections={[{ id: "coursework", label: "Coursework" }]} />
            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <PageHero
                    eyebrow="Learning"
                    title="Coursework"
                    description="Senior year classes combining technical depth with creative expression—environmental design, quantitative analysis, life sciences, communication, visual arts, and civic understanding."
                    accent="var(--mc-blue)"
                />

                <div id="coursework" className="mx-auto mt-14 max-w-6xl scroll-mt-24">
                    <SectionLabel accent="var(--mc-blue)">
                        Senior Year Classes
                    </SectionLabel>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Six interdisciplinary courses building toward environmental engineering
                        and systems-thinking—grounded in philosophy, design, and rigorous
                        analysis.
                    </p>
                    <div className="mt-8">
                        <CourseworkGrid courses={courses} />
                    </div>
                </div>
            </section>
        </div>
    );
}

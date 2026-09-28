import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PageBackground } from "@/components/page-background";
import { SidebarNav } from "@/components/sidebar-nav";
import { ShineBorder } from "@/components/ui/shine-border";

interface CourseDetail {
    slug: string;
    title: string;
    color: string;
    description: string;
    fullDescription: string;
    tags: string[];
    focus: string[];
    resources: { title: string; url?: string }[];
    timeline: string;
    examDate?: string;
    status: string;
    goals: string[];
}

const courseDetails: Record<string, CourseDetail> = {
    "senior-project": {
        slug: "senior-project",
        title: "Senior Project",
        color: "#ffaa00",
        description: "Landscape design and outdoor space transformation.",
        fullDescription:
            "A comprehensive capstone project exploring how thoughtful design can revitalize neglected public spaces. This project combines research, evidence-based design methodology, user behavior analysis, and systems thinking to create sustainable solutions for real-world spaces.",
        tags: ["Design", "Engineering", "Research", "Leadership", "Capstone"],
        focus: [
            "Public space design",
            "User behavior analysis",
            "Systems thinking",
            "Sustainable planning",
            "Stakeholder engagement",
        ],
        resources: [
            { title: "Research Notes & Case Studies" },
            { title: "Design Framework Documentation" },
            { title: "User Survey Data & Analysis" },
            { title: "Final Presentation (May 2027)" },
        ],
        timeline: "September 2026 - May 2027",
        status: "In Progress",
        goals: [
            "Complete comprehensive user research (surveys, interviews, observation)",
            "Develop evidence-based design framework",
            "Create 3+ design directions with full specifications",
            "Deliver polished final presentation to stakeholders",
            "Connect philosophy (Kierkegaard) to design practice",
        ],
    },
    "ap-statistics": {
        slug: "ap-statistics",
        title: "AP Statistics",
        color: "#ff5555",
        description: "Statistical analysis, probability, and data interpretation.",
        fullDescription:
            "Master quantitative reasoning through probability theory, statistical inference, and data analysis. This course builds the mathematical foundation for research, environmental modeling, and informed decision-making.",
        tags: ["Mathematics", "Data Analysis", "Research Methods", "AP Exam"],
        focus: [
            "Hypothesis testing",
            "Probability distributions",
            "Regression analysis",
            "Data visualization",
            "Experimental design",
        ],
        resources: [
            { title: "Practice Problem Sets" },
            { title: "AP Exam FRQ Archive" },
            { title: "Khan Academy (Official Partner)" },
            { title: "Real-world datasets (Kaggle, Census)" },
        ],
        timeline: "September 2026 - May 2027",
        examDate: "May 2027",
        status: "In Progress",
        goals: [
            "Score 4-5 on AP Statistics exam",
            "Master hypothesis testing procedures",
            "Build proficiency with regression analysis",
            "Apply statistics to environmental data",
        ],
    },
    "ap-biology": {
        slug: "ap-biology",
        title: "AP Biology",
        color: "#55ff55",
        description: "Cellular and organismal biology, ecology, and genetics.",
        fullDescription:
            "Build foundational understanding of living systems and environmental interconnectedness. From cellular processes to ecosystem dynamics, this course emphasizes systems thinking and the interconnected nature of life.",
        tags: ["Life Sciences", "Laboratory", "Systems", "AP Exam", "Ecology"],
        focus: [
            "Cell structure and function",
            "Genetics and evolution",
            "Ecology and ecosystems",
            "Photosynthesis & respiration",
            "Energy flow in systems",
        ],
        resources: [
            { title: "Lab Reports & Data Analysis" },
            { title: "Concept Maps by Unit" },
            { title: "AP Exam FRQ Responses" },
            { title: "Ecology Simulation Tools" },
        ],
        timeline: "September 2026 - May 2027",
        examDate: "May 2027",
        status: "In Progress",
        goals: [
            "Score 4-5 on AP Biology exam",
            "Master photosynthesis and cellular respiration",
            "Understand population and ecosystem dynamics",
            "Connect cellular biology to environmental engineering",
        ],
    },
    "intro-communications": {
        slug: "intro-communications",
        title: "Intro to Communications & Public Speaking",
        color: "#55ffff",
        description: "Communication theory, interpersonal dynamics, and public speaking.",
        fullDescription:
            "Develop articulate presentation skills and authentic self-expression in professional and public contexts. Learn communication models, audience analysis, and persuasive messaging techniques.",
        tags: ["Communication", "Public Speaking", "Interpersonal Skills", "Presentation"],
        focus: [
            "Communication models (transmission, interactive, transactional)",
            "Public speaking techniques",
            "Presentation design",
            "Audience analysis",
            "Persuasive messaging",
        ],
        resources: [
            { title: "Speech Recordings & Feedback" },
            { title: "Presentation Design Templates" },
            { title: "Audience Analysis Worksheets" },
            { title: "Public Speaking Best Practices" },
        ],
        timeline: "September 2026 - May 2027",
        status: "In Progress",
        goals: [
            "Deliver 5+ polished presentations",
            "Develop confident public speaking voice",
            "Master audience analysis techniques",
            "Apply to Senior Project stakeholder presentations",
        ],
    },
    "ap-studio-art": {
        slug: "ap-studio-art",
        title: "AP 2-D Studio Art",
        color: "#ff55ff",
        description: "Visual composition, design principles, and artistic expression.",
        fullDescription:
            "Develop a cohesive portfolio demonstrating conceptual depth and technical mastery. Explore design principles, media techniques, and personal artistic voice through sustained inquiry.",
        tags: ["Visual Arts", "Design", "Portfolio", "Creativity", "AP Exam"],
        focus: [
            "Composition and balance",
            "Color theory",
            "Drawing fundamentals",
            "Mixed media techniques",
            "Conceptual development",
        ],
        resources: [
            { title: "Portfolio Pieces (12-15 images)" },
            { title: "Design Principles Reference" },
            { title: "Media Exploration Studies" },
            { title: "Artist Statement Draft" },
        ],
        timeline: "September 2026 - May 2027",
        examDate: "May 2027",
        status: "In Progress",
        goals: [
            "Complete 12-15 portfolio pieces",
            "Develop 4-5 pieces in depth (concentration)",
            "Demonstrate range across media and subjects",
            "Write compelling artist statement",
            "Score well on AP Portfolio review",
        ],
    },
    "ap-government": {
        slug: "ap-government",
        title: "AP Government & Politics",
        color: "#5555ff",
        description: "Constitutional law, political systems, and Supreme Court cases.",
        fullDescription:
            "Understand American democracy through constitutional law, political systems, and landmark Supreme Court decisions. Master the mechanisms that shape civic governance.",
        tags: ["Government", "Law", "Civics", "Politics", "AP Exam"],
        focus: [
            "Constitutional law & interpretation",
            "Supreme Court decisions & impact",
            "Political ideologies & systems",
            "Federalism & separation of powers",
            "Civil liberties & rights",
        ],
        resources: [
            { title: "Supreme Court Case Briefs" },
            { title: "Constitutional Framework Guide" },
            { title: "AP Exam FRQ Archive" },
            { title: "Current Political Case Study Examples" },
        ],
        timeline: "September 2026 - May 2027",
        examDate: "May 2027",
        status: "In Progress",
        goals: [
            "Score 4-5 on AP Government exam",
            "Master 20+ key Supreme Court cases",
            "Understand constitutional principles",
            "Connect civic understanding to personal responsibility",
        ],
    },
};

export async function generateStaticParams() {
    return Object.keys(courseDetails).map((slug) => ({ slug }));
}

export default async function CourseDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const course = courseDetails[slug];

    if (!course) notFound();

    const bgColor = course.color;

    return (
        <div className="pointer-events-auto min-h-screen">
            <PageBackground variant="interactive-grid" color={bgColor} />
            <SidebarNav sections={[{ id: "detail", label: course.title }]} />

            <section className="w-full px-6 pb-24 pt-28 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-3xl">
                    <Link
                        href="/studies"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-3.5" /> Back to Studies
                    </Link>

                    <div className="mt-8">
                        <PageHero
                            eyebrow="Course"
                            title={course.title}
                            description={course.fullDescription}
                            accent={course.color}
                            symbol="wisdom"
                        />
                    </div>

                    {/* Overview */}
                    <div
                        id="detail"
                        className="relative mt-10 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur-xl scroll-mt-24"
                    >
                        <ShineBorder
                            borderWidth={1}
                            shineColor={[course.color, "var(--chart-4)"]}
                        />

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                    Timeline
                                </p>
                                <p className="mt-2 text-sm">{course.timeline}</p>
                            </div>
                            {course.examDate && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                        AP Exam Date
                                    </p>
                                    <p
                                        className="mt-2 text-sm font-medium"
                                        style={{ color: course.color }}
                                    >
                                        {course.examDate}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 space-y-6">
                            {/* Key Focus */}
                            <div>
                                <h3
                                    className="mb-4 text-sm font-semibold uppercase tracking-wide"
                                    style={{ color: course.color }}
                                >
                                    Key Focus Areas
                                </h3>
                                <ul className="space-y-2">
                                    {course.focus.map((item, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-3 text-sm text-muted-foreground"
                                        >
                                            <span
                                                className="mt-1.5 inline-block size-1.5 rounded-full"
                                                style={{ backgroundColor: course.color }}
                                            />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Goals */}
                            <div>
                                <h3
                                    className="mb-4 text-sm font-semibold uppercase tracking-wide"
                                    style={{ color: course.color }}
                                >
                                    Learning Goals
                                </h3>
                                <ul className="space-y-2">
                                    {course.goals.map((goal, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-3 text-sm text-muted-foreground"
                                        >
                                            <span
                                                className="mt-1.5 inline-block size-1.5 rounded-full"
                                                style={{ backgroundColor: course.color }}
                                            />
                                            {goal}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Resources */}
                            <div>
                                <h3
                                    className="mb-4 text-sm font-semibold uppercase tracking-wide"
                                    style={{ color: course.color }}
                                >
                                    Study Resources
                                </h3>
                                <ul className="space-y-3">
                                    {course.resources.map((resource, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <BookOpen
                                                    className="size-4"
                                                    style={{ color: course.color }}
                                                />
                                                <span>{resource.title}</span>
                                            </div>
                                            {resource.url && (
                                                <ArrowUpRight className="size-4 text-muted-foreground" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 pt-4">
                                {course.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border px-3 py-1 text-xs font-medium"
                                        style={{
                                            color: course.color,
                                            borderColor: `color-mix(in oklch, ${course.color} 55%, transparent)`,
                                            backgroundColor: `color-mix(in oklch, ${course.color} 15%, var(--background) 60%)`,
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

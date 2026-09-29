import {
    BookOpen,
    Briefcase,
    Compass,
    GraduationCap,
    Leaf,
    Lightbulb,
    Microscope,
    Mic,
    Palette,
    PieChart,
    Ruler,
    Scale,
    type LucideIcon,
} from "lucide-react";
import type { StudyIconName } from "@/lib/studies-data";

// Data stores icon NAMES (plain strings cross the server → client boundary;
// component functions don't). A full Record makes a missing icon a compile
// error rather than a runtime crash.
export const STUDY_ICONS: Record<StudyIconName, LucideIcon> = {
    BookOpen,
    Briefcase,
    Compass,
    GraduationCap,
    Leaf,
    Lightbulb,
    Microscope,
    Mic,
    Palette,
    PieChart,
    Ruler,
    Scale,
};

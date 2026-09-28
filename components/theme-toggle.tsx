"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

// Controlled mode (per the component's own `theme`/`onThemeChange` props):
// next-themes stays the single source of truth for persistence and the
// `dark` class, while AnimatedThemeToggler owns only the View Transitions
// circle-reveal animation. Uncontrolled mode would have it read/write the
// class and localStorage itself, fighting next-themes for the same job.
export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    if (!mounted) {
        // Avoid a hydration mismatch flash — render a fixed-size placeholder.
        return <div className="size-8" />;
    }

    const isDark = resolvedTheme === "dark";

    return (
        <AnimatedThemeToggler
            theme={isDark ? "dark" : "light"}
            onThemeChange={(next) => setTheme(next)}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex size-8 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground [&_svg]:size-4"
        />
    );
}

"use client";

import { useState } from "react";
import LiquidGlass from "liquid-glass-react";
import Link from "next/link";
import { identity } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { useActiveSection } from "@/lib/use-active-section";

const navLinks = [
    { href: "#projects", label: "Projects", id: "projects" },
    { href: "#renovations", label: "Renovations", id: "renovations" },
];

// NOTE: liquid-glass-react computes its SVG displacement filter once against
// its children's measured size and does not reflow when that size changes
// via CSS — animating width/height *inside* it breaks the effect and the
// hit-box. So each state below is its own fixed-size LiquidGlass instance,
// and the "liquid" collapse/expand motion is a CSS opacity+scale crossfade
// layered on top — that morph is not something the library provides itself.
export function SidebarNav() {
    const [hovered, setHovered] = useState(false);
    const active = useActiveSection(navLinks.map((l) => l.id));

    return (
        <div
            className="fixed left-6 top-1/2 z-50 -translate-y-1/2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="relative">
                {/* Collapsed: round ball */}
                <div
                    className={`origin-top-left transition-all duration-300 ease-out ${
                        hovered
                            ? "pointer-events-none scale-75 opacity-0"
                            : "scale-100 opacity-100"
                    }`}
                >
                    <LiquidGlass
                        blurAmount={0.08}
                        saturation={140}
                        aberrationIntensity={1.2}
                        elasticity={0.2}
                        cornerRadius={999}
                        padding="0"
                        className="!block"
                    >
                        <Link
                            href="/"
                            aria-label={identity.name}
                            className="flex size-14 items-center justify-center text-base font-semibold text-foreground"
                        >
                            {identity.name.charAt(0)}
                        </Link>
                    </LiquidGlass>
                </div>

                {/* Expanded: full nav panel */}
                <div
                    className={`absolute left-0 top-0 origin-top-left transition-all duration-300 ease-out ${
                        hovered
                            ? "scale-100 opacity-100"
                            : "pointer-events-none scale-90 opacity-0"
                    }`}
                >
                    <LiquidGlass
                        blurAmount={0.08}
                        saturation={140}
                        aberrationIntensity={1.2}
                        elasticity={0.2}
                        cornerRadius={28}
                        padding="0"
                        className="!block"
                    >
                        <nav className="flex w-44 flex-col items-start gap-1 px-3 py-4">
                            <Link
                                href="/"
                                className="px-2 pb-2 text-sm font-semibold tracking-tight text-foreground"
                            >
                                {identity.name}
                            </Link>
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className={`w-full whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors ${
                                        active === link.id
                                            ? "bg-primary/15 text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="w-full px-2 pt-1">
                                <ThemeToggle />
                            </div>
                        </nav>
                    </LiquidGlass>
                </div>
            </div>
        </div>
    );
}

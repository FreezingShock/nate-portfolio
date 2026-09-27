"use client";

import LiquidGlass from "liquid-glass-react";
import Link from "next/link";
import { identity } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
    { href: "#projects", label: "Projects" },
    { href: "#renovations", label: "Renovations" },
];

export function Header() {
    return (
        <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <LiquidGlass
                blurAmount={0.06}
                saturation={130}
                aberrationIntensity={1}
                elasticity={0.1}
                cornerRadius={999}
                padding="0"
                className="!block"
            >
                <nav className="flex items-center gap-6 px-5 py-2.5 text-sm">
                    <Link
                        href="/"
                        className="font-semibold tracking-tight text-foreground"
                    >
                        {identity.name}
                    </Link>
                    <div className="hidden items-center gap-5 sm:flex">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                    <ThemeToggle />
                </nav>
            </LiquidGlass>
        </header>
    );
}

"use client";

import { useEffect, useRef, useState } from "react";
import LiquidGlass from "liquid-glass-react";
import Link from "next/link";
import { identity } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { useActiveSection } from "@/lib/use-active-section";

const navLinks = [
    { href: "#projects", label: "Projects", id: "projects" },
    { href: "#renovations", label: "Renovations", id: "renovations" },
];

const BALL = 48;
const PANEL_W = 176;
const PANEL_H = 168;

// NOTE (two separate liquid-glass-react bugs, both confirmed by inspecting
// live rendered rects, not guessed):
//
// 1. It computes its SVG displacement filter once against its children's
//    measured size and does not reflow when that size changes via CSS, so
//    the collapse/expand can't be one instance animating — it has to be two
//    fixed-size instances crossfaded with our own CSS opacity/scale.
//
// 2. Its internal markup stacks two invisible "ghost" divs *in normal
//    document flow* before the real content div, then applies
//    `transform: translate(-50%, -50%)` to the content div alone with no
//    matching top/left. Net effect measured directly: the visible glass
//    renders 2×size below and size/2 left of its own wrapper's true box —
//    e.g. the 48px ball's wrapper sat at (532,20) while its visible "N"
//    rendered at (508,92). A real cursor aimed at the visible bubble would
//    miss the actual hover target entirely. Fix: force every direct child
//    into the same grid cell (`.glass-anchor` in globals.css, kills the
//    flow-stacking push) and translate the whole thing by (size/2, size/2)
//    to cancel the library's own centering transform. Verified pixel-exact
//    against the wrapper's rect before wiring this in.
export function SidebarNav() {
    const [hovered, setHovered] = useState(false);
    const [pinnedOpen, setPinnedOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const active = useActiveSection(navLinks.map((l) => l.id));
    const open = hovered || pinnedOpen;

    // Hover has no equivalent on touch devices, so tapping the ball toggles
    // an "open" state that sticks until you tap outside or hit Escape —
    // without this the menu is unreachable on a phone.
    useEffect(() => {
        if (!pinnedOpen) return;

        function handlePointerDown(event: PointerEvent) {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setPinnedOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setPinnedOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [pinnedOpen]);

    return (
        <div
            ref={rootRef}
            className="fixed left-1/2 top-5 z-50 -translate-x-1/2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setHovered(false);
                }
            }}
        >
            <div className="relative" style={{ width: BALL, height: BALL }}>
                {/* Collapsed: round bubble, stays put and stays visible —
                    this is the persistent hover/tap zone. */}
                <div
                    className="glass-anchor"
                    style={{
                        width: BALL,
                        height: BALL,
                        transform: `translate(${BALL / 2}px, ${BALL / 2}px)`,
                    }}
                >
                    <LiquidGlass
                        blurAmount={0.08}
                        saturation={140}
                        aberrationIntensity={0.4}
                        elasticity={0.2}
                        cornerRadius={999}
                        padding="0"
                        style={{ width: BALL, height: BALL }}
                        className="!block"
                    >
                        <button
                            type="button"
                            aria-label={open ? "Close navigation" : "Open navigation"}
                            aria-expanded={open}
                            aria-haspopup="menu"
                            onClick={() => setPinnedOpen((v) => !v)}
                            style={{ width: BALL, height: BALL }}
                            className="flex items-center justify-center text-base font-semibold text-foreground"
                        >
                            {identity.name.charAt(0)}
                        </button>
                    </LiquidGlass>
                </div>

                {/* Expanded: drops down and to the left from the bubble.
                    Anchored to the same wrapper, so entering the menu never
                    leaves the hover zone — the whole thing (bubble + menu)
                    is one hit region while expanded. */}
                <div
                    role="menu"
                    aria-hidden={!open}
                    className={`absolute right-0 top-full mt-3 origin-top-right transition-all duration-300 ease-out ${
                        open
                            ? "scale-100 opacity-100"
                            : "pointer-events-none scale-95 opacity-0"
                    }`}
                >
                    <div
                        className="glass-anchor"
                        style={{
                            width: PANEL_W,
                            height: PANEL_H,
                            transform: `translate(${PANEL_W / 2}px, ${PANEL_H / 2}px)`,
                        }}
                    >
                        <LiquidGlass
                            blurAmount={0.08}
                            saturation={140}
                            aberrationIntensity={0.7}
                            elasticity={0.2}
                            cornerRadius={20}
                            padding="0"
                            style={{ width: PANEL_W, height: PANEL_H }}
                            className="!block"
                        >
                            <nav className="flex h-full w-full flex-col items-start gap-1 px-3 py-4">
                                <Link
                                    href="/"
                                    tabIndex={open ? 0 : -1}
                                    onClick={() => setPinnedOpen(false)}
                                    className="px-2 pb-2 text-sm font-semibold tracking-tight text-foreground"
                                >
                                    {identity.name}
                                </Link>
                                {navLinks.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        role="menuitem"
                                        tabIndex={open ? 0 : -1}
                                        onClick={() => setPinnedOpen(false)}
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
        </div>
    );
}

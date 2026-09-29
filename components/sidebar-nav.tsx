"use client";

import { ShineBorder } from "@/components/ui/shine-border";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { navItems } from "@/lib/nav";
import { useActiveSection } from "@/lib/use-active-section";

export interface PageSectionItem {
    href: string;
    label: string;
    // The item's own title color — e.g. a project's PageHero accent — so it
    // reads in the nav exactly as it does on its own page. Falls back to
    // the current page's accent when not set.
    color?: string;
}

export interface PageSection {
    id: string;
    label: string;
    // Optional real entries under this heading — e.g. on /creations, the
    // actual projects/renovations under "Projects"/"Renovations" — each a
    // real link to that item's own page, not just a scroll target. Lets the
    // bubble double as a full site map: organizations (headings) and the
    // files within them (items), one click away.
    items?: PageSectionItem[];
}

const BALL = 48;
const PANEL_W = 224;
const HOVER_MARGIN = 14;
// Same bouncy overshoot used to feel of a piece with the Dock's spring
// physics — both read as "springy," even though the Dock uses actual
// spring simulation for its own hover-magnify effect.
const LIQUID_SPRING = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.9 };

// Every page's SidebarNav gets a link to the universal footer appended for
// free — "the footer can be one [of the sections]" — so no page file needs
// to remember to add it itself.
const FOOTER_SECTION: PageSection = { id: "footer", label: "Footer" };

// This is the in-PAGE header navigator (jumps between anchors on whichever
// page renders it) — distinct from <SiteDock />, which moves between pages.
// Each page passes its own `sections`; a page with nothing to jump to just
// doesn't render this component at all.
//
// Overhaul (2026-09-27): the bubble is a real "liquid glass" shared-element
// morph now (framer-motion `layout`, not a CSS opacity/scale cross-fade) —
// it grows in place into a dark, page-tinted panel headed by that page's
// actual title (colored with the page's Minecraft accent, same as PageHero),
// followed by every section on the page including the footer.
export function SidebarNav({ sections }: { sections: PageSection[] }) {
    const [hovered, setHovered] = useState(false);
    const [pinnedOpen, setPinnedOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const allSections = [...sections, FOOTER_SECTION];
    const active = useActiveSection(allSections.map((s) => s.id));
    const open = hovered || pinnedOpen;
    // Title row (~44px) + name label row (~26px) + one row per section
    // (~34px) + one row per nested item (~28px), floor'd at a sane min.
    const itemRowCount = allSections.reduce((n, s) => n + (s.items?.length ?? 0), 0);
    const panelH = Math.max(140, 90 + allSections.length * 34 + itemRowCount * 28);

    // The bubble is a "you are here" indicator: it shows the current page's
    // initial collapsed, and the FULL page title once expanded, tinted with
    // that page's Minecraft accent color (same palette the Dock and
    // PageHero use) so all three navs visibly agree on "what page is this."
    const pathname = usePathname();
    const currentPage =
        navItems.find((item) =>
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        ) ?? navItems[0];
    const bubbleLetter = currentPage.title.charAt(0);
    const bubbleColor = currentPage.color;

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

    // Closing on navigation means clicking a section link on a phone (no
    // hover to fall back to) collapses the panel instead of leaving it
    // stuck open over the content it just scrolled to.
    function closeAndNavigate() {
        setPinnedOpen(false);
        setHovered(false);
    }

    return (
        <div
            ref={rootRef}
            // Mobile: pinned to the top-left corner so it never competes
            // with the theme toggle (top-right) and — critically — so the
            // expanded panel below grows rightward from a fixed left edge
            // instead of outward from a horizontal center, which is what
            // was pushing it off-screen on narrow viewports. Desktop keeps
            // the original top-center placement.
            // pointer-events-auto: a page can make its own content wrapper
            // pointer-events-none to let an interactive background behind
            // it receive hover/click (see app/creations/page.tsx) — this
            // nav is a fixed-position descendant of that wrapper on every
            // page, so it always re-declares auto regardless of what an
            // ancestor set.
            className="pointer-events-auto fixed left-5 top-5 z-50 sm:left-1/2 sm:-translate-x-1/2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setHovered(false);
                }
            }}
        >
            {/* A single shared box that itself springs between bubble-size
                and panel-size — the "liquid glass" morph is this box
                resizing and re-rounding via a real spring (framer-motion
                `layout`), not two elements cross-fading on top of each
                other. Anchored top-left (mobile) / top-center (desktop) so
                it always grows toward the content, never off-screen. */}
            <motion.div
                layout
                transition={LIQUID_SPRING}
                className="rainbow-bg relative origin-top-left overflow-hidden rounded-3xl backdrop-blur-xl sm:origin-top"
                style={{
                    width: (open ? PANEL_W : BALL) + HOVER_MARGIN,
                    height: (open ? panelH : BALL) + HOVER_MARGIN,
                    boxShadow: open
                        ? `0 12px 40px -12px color-mix(in oklch, ${bubbleColor} 35%, transparent)`
                        : `0 0 14px color-mix(in oklch, ${bubbleColor} 30%, transparent)`,
                }}
            >
                <ShineBorder borderWidth={1.5} duration={8} shineColor={["#ff5555", "#ffaa00", "#55ff55", "#55ffff", "#ff55ff"]} />
                <AnimatePresence mode="wait" initial={false}>
                    {!open ? (
                        <motion.button
                            key="collapsed"
                            type="button"
                            aria-label="Open navigation"
                            aria-expanded={false}
                            aria-haspopup="menu"
                            onClick={() => setPinnedOpen(true)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 flex items-center justify-center font-minecraft text-base font-semibold transition-transform hover:scale-105"
                        >
                            <span className="rainbow-text">{bubbleLetter}</span>
                        </motion.button>
                    ) : (
                        <motion.nav
                            key="expanded"
                            role="menu"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18, delay: open ? 0.1 : 0 }}
                            className="absolute inset-0 flex flex-col items-start gap-1 overflow-y-auto px-3 pb-4 pt-3"
                        >
                            {/* The title itself is the "go to this page's
                                root" link — from a project detail page under
                                /creations, clicking "Creations" here jumps
                                back to the hub, not just closes the panel. */}
                            <Link
                                href={currentPage.href}
                                tabIndex={0}
                                onClick={closeAndNavigate}
                                className="w-full px-2 pb-1 text-left"
                            >
                                <span
                                    className="block font-minecraft text-lg font-bold leading-tight tracking-tight transition-opacity hover:opacity-80"
                                    style={{ color: bubbleColor }}
                                >
                                    {currentPage.title}
                                </span>
                            </Link>
                            {allSections.map((section) => (
                                <div key={section.id} className="w-full">
                                    <a
                                        href={`#${section.id}`}
                                        role="menuitem"
                                        tabIndex={0}
                                        onClick={closeAndNavigate}
                                        className={`block w-full whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors ${
                                            active === section.id
                                                ? "text-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                        style={
                                            active === section.id
                                                ? {
                                                      backgroundColor: `color-mix(in oklch, ${bubbleColor} 16%, transparent)`,
                                                  }
                                                : undefined
                                        }
                                    >
                                        {section.label}
                                    </a>
                                    {/* The "organizations and the files within them" layer — real
                                        pages, not scroll anchors, indented under their heading and
                                        left-bordered so the hierarchy reads at a glance. */}
                                    {section.items && section.items.length > 0 && (
                                        <div
                                            className="ml-2 flex flex-col gap-0.5 border-l pl-2.5"
                                            style={{ borderColor: `color-mix(in oklch, ${bubbleColor} 30%, transparent)` }}
                                        >
                                            {section.items.map((item) => {
                                                const itemActive = pathname === item.href;
                                                const itemColor = item.color ?? bubbleColor;
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        tabIndex={0}
                                                        onClick={closeAndNavigate}
                                                        className="rounded-md px-1.5 py-1 font-minecraft text-xs leading-snug transition-opacity"
                                                        style={{
                                                            color: itemColor,
                                                            opacity: itemActive ? 1 : 0.85,
                                                        }}
                                                    >
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <Link
                                href="/"
                                tabIndex={0}
                                onClick={closeAndNavigate}
                                className="mt-3 w-full px-2 text-right font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                            >
                                nateanderson.dev
                            </Link>
                        </motion.nav>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { identity } from "@/lib/content";
import { navItems } from "@/lib/nav";
import { useActiveSection } from "@/lib/use-active-section";

export interface PageSection {
    id: string;
    label: string;
}

const BALL = 48;
const PANEL_W = 176;
const HOVER_MARGIN = 14;
// Same bouncy overshoot used to feel of a piece with the Dock's spring
// physics — both read as "springy," even though the Dock uses actual
// spring simulation and this is a CSS easing curve.
const LIQUID_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// Retheme (2026-09-27): dropped liquid-glass-react entirely — this now uses
// the same flat card/border/backdrop-blur recipe as <SiteDock /> and every
// other panel on the site (bg-card/60, border-border/60, backdrop-blur-md),
// instead of the old refractive glass look left over from the forest-photo
// era. That also removes the `.glass-anchor` ghost-div workaround from
// globals.css — it existed only to fix liquid-glass-react's own rendering
// bugs, which no longer apply now nothing here uses that library.
//
// This is the in-PAGE header navigator (jumps between anchors on whichever
// page renders it) — distinct from <SiteDock />, which moves between pages.
// Each page passes its own `sections`; a page with nothing to jump to just
// doesn't render this component at all.
export function SidebarNav({ sections }: { sections: PageSection[] }) {
    const [hovered, setHovered] = useState(false);
    const [pinnedOpen, setPinnedOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const active = useActiveSection(sections.map((s) => s.id));
    const open = hovered || pinnedOpen;
    // Name row (~56px) + one row per section (~34px), floor'd at a sane min.
    const panelH = Math.max(96, 56 + sections.length * 34);

    // The bubble now reads as a "you are here" indicator, not a static
    // logo: on Home it keeps Nate's initial (brand), everywhere else it
    // shows that page's own initial, tinted with that page's Minecraft
    // accent color (same palette the Dock and PageHero use), so the two
    // navs visibly agree on "what page is this."
    const pathname = usePathname();
    const currentPage =
        navItems.find((item) =>
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        ) ?? navItems[0];
    const isHome = currentPage.href === "/";
    const bubbleLetter = isHome ? identity.name.charAt(0) : currentPage.label.charAt(0);
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

    return (
        <div
            ref={rootRef}
            // Mobile: pinned to the top-left corner so it never competes
            // with the theme toggle (top-right) and — critically — so the
            // expanded panel below grows rightward from a fixed left edge
            // instead of outward from a horizontal center, which is what
            // was pushing it off-screen on narrow viewports. Desktop keeps
            // the original top-center placement.
            className="fixed left-5 top-5 z-50 sm:left-1/2 sm:-translate-x-1/2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setHovered(false);
                }
            }}
        >
            {/* Both states share one anchor point (top-center of this box)
                so the panel visually grows out of the bubble in place —
                never down-and-to-the-side — and only one of the two is
                ever interactive/visible at a time. Sized to whichever state
                is active (+ a small margin) so the hover/tap hit-region
                never extends past what's actually showing. */}
            <div
                className="relative"
                style={{
                    width: (open ? PANEL_W : BALL) + HOVER_MARGIN * 2,
                    height: (open ? panelH : BALL) + HOVER_MARGIN * 2,
                }}
            >
                {/* Collapsed: round bubble. Scales/fades OUT from the shared
                    top-center anchor when the menu opens. */}
                <div
                    className={`absolute left-0 top-0 origin-top-left transition-all sm:left-1/2 sm:origin-top sm:-translate-x-1/2 ${
                        open
                            ? "pointer-events-none scale-90 opacity-0"
                            : "scale-100 opacity-100"
                    }`}
                    style={{ transitionTimingFunction: LIQUID_EASE, transitionDuration: "350ms" }}
                >
                    <button
                        type="button"
                        aria-label={open ? "Close navigation" : "Open navigation"}
                        aria-expanded={open}
                        aria-haspopup="menu"
                        tabIndex={open ? -1 : 0}
                        onClick={() => setPinnedOpen((v) => !v)}
                        style={{
                            width: BALL,
                            height: BALL,
                            borderColor: `color-mix(in oklch, ${bubbleColor} 45%, transparent)`,
                            boxShadow: `0 0 14px color-mix(in oklch, ${bubbleColor} 30%, transparent)`,
                        }}
                        className="flex items-center justify-center rounded-full border bg-card/60 font-minecraft text-base font-semibold backdrop-blur-md transition-all duration-300 hover:scale-105"
                    >
                        <span style={{ color: bubbleColor }}>{bubbleLetter}</span>
                    </button>
                </div>

                {/* Expanded: menu panel. Scales/fades IN from the same
                    shared top-center anchor — grows out of where the
                    bubble was, instead of dropping down-and-left. Same
                    border/bg/blur recipe as <SiteDock /> and every other
                    panel on the site. */}
                <div
                    role="menu"
                    aria-hidden={!open}
                    className={`absolute left-0 top-0 origin-top-left transition-all sm:left-1/2 sm:origin-top sm:-translate-x-1/2 ${
                        open
                            ? "scale-100 opacity-100"
                            : "pointer-events-none scale-90 opacity-0"
                    }`}
                    style={{ transitionTimingFunction: LIQUID_EASE, transitionDuration: "350ms" }}
                >
                    <nav
                        className="flex flex-col items-start gap-1 rounded-2xl border bg-card/60 px-3 py-4 backdrop-blur-md"
                        style={{
                            width: PANEL_W,
                            height: panelH,
                            borderColor: `color-mix(in oklch, ${bubbleColor} 35%, transparent)`,
                        }}
                    >
                        <Link
                            href="/"
                            tabIndex={open ? 0 : -1}
                            onClick={() => setPinnedOpen(false)}
                            className="px-2 pb-2 font-minecraft text-sm font-semibold tracking-tight text-foreground"
                        >
                            {identity.name}
                        </Link>
                        {sections.map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                role="menuitem"
                                tabIndex={open ? 0 : -1}
                                onClick={() => setPinnedOpen(false)}
                                className={`w-full whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors ${
                                    active === section.id
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                                style={
                                    active === section.id
                                        ? { backgroundColor: `color-mix(in oklch, ${bubbleColor} 15%, transparent)` }
                                        : undefined
                                }
                            >
                                {section.label}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </div>
    );
}

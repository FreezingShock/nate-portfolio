"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { identity } from "@/lib/content";
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
                    className={`absolute left-1/2 top-0 origin-top -translate-x-1/2 transition-all ${
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
                        style={{ width: BALL, height: BALL }}
                        className="flex items-center justify-center rounded-full border border-border/60 bg-card/60 font-minecraft text-base font-semibold text-foreground backdrop-blur-md transition-colors hover:border-primary/50"
                    >
                        {identity.name.charAt(0)}
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
                    className={`absolute left-1/2 top-0 origin-top -translate-x-1/2 transition-all ${
                        open
                            ? "scale-100 opacity-100"
                            : "pointer-events-none scale-90 opacity-0"
                    }`}
                    style={{ transitionTimingFunction: LIQUID_EASE, transitionDuration: "350ms" }}
                >
                    <nav
                        className="flex flex-col items-start gap-1 rounded-2xl border border-border/60 bg-card/60 px-3 py-4 backdrop-blur-md"
                        style={{ width: PANEL_W, height: panelH }}
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
                                        ? "bg-primary/15 text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
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

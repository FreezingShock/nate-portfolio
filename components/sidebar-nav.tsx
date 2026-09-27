"use client";

import { useEffect, useRef, useState } from "react";
import LiquidGlass from "liquid-glass-react";
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
// A "liquidy" overshoot ease — settles past 100% then eases back, instead
// of a flat linear-ish ease-out. Used for both directions (collapse and
// expand) so it feels like one continuous material, not two animations.
const LIQUID_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";
// Keep the collapsed scale modest (0.9, not e.g. 0.4). liquid-glass-react
// partially re-samples its ghost/filter layer mid-transition and gets it
// wrong by roughly (scale)^2 — confirmed by inspecting live rects: a 0.4
// collapse target rendered the visible glass at ~0.16 of the real content
// box mid-animation (text spilling outside a too-small border). At 0.9 the
// same error is a couple of pixels and invisible. Get more "liquid" feel
// from LIQUID_EASE's overshoot, not from a bigger scale swing.

// NOTE: liquid-glass-react bug, confirmed by inspecting live rendered rects
// (see the long comment on `.glass-anchor` in globals.css for the full
// diagnosis). It computes its SVG displacement filter once against its
// children's measured size and does not reflow when that size changes via
// CSS, so the collapse/expand can't be one instance animating — it has to
// be two fixed-size instances crossfaded with our own CSS opacity/scale.
// The actual glass-rendering offset bug is fixed via `.glass-anchor` alone
// now — do NOT add a translate() here, it was tried and it breaks the
// glass-highlight rendering (see that comment).
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
                    <div
                        className="glass-anchor"
                        style={{ width: BALL, height: BALL }}
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
                                tabIndex={open ? -1 : 0}
                                onClick={() => setPinnedOpen((v) => !v)}
                                style={{ width: BALL, height: BALL }}
                                className="flex items-center justify-center font-minecraft text-base font-semibold leading-none text-foreground"
                            >
                                {identity.name.charAt(0)}
                            </button>
                        </LiquidGlass>
                    </div>
                </div>

                {/* Expanded: menu panel. Scales/fades IN from the same
                    shared top-center anchor — grows out of where the
                    bubble was, instead of dropping down-and-left. */}
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
                    <div
                        className="glass-anchor"
                        style={{ width: PANEL_W, height: panelH }}
                    >
                        <LiquidGlass
                            blurAmount={0.08}
                            saturation={140}
                            aberrationIntensity={0.7}
                            elasticity={0.2}
                            cornerRadius={20}
                            padding="0"
                            style={{ width: PANEL_W, height: panelH }}
                            className="!block"
                        >
                            {/* Explicit pixel size, NOT w-full/h-full: liquid-glass-react
                                measures its ghost/filter layer against children's
                                intrinsic size on first paint. Percentage sizing resolves
                                later, so the visible glass ends up smaller than this real
                                content box and text spills outside it. Fixed pixels make
                                the two agree immediately. */}
                            <nav
                                className="flex flex-col items-start gap-1 px-3 py-4"
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
                        </LiquidGlass>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dock, DockIcon } from "@/components/ui/dock";
import { SiteDockMobile } from "@/components/site-dock-mobile";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Cross-page navigation, macOS-dock style. Distinct from <SidebarNav /> (the
// top-center bubble): the Dock moves you between PAGES, the bubble moves you
// between HEADERS within the page you're already on.
//
// Two different components below `sm` vs `sm` and up, not one component with
// a responsive tooltip: the hover-magnify Dock packs icons tightly with
// floating absolute-positioned labels, which is fine on desktop where only
// the hovered one is ever visible, but on a phone (no hover — every label
// has to be always-on) those floating labels collide with their neighbors.
// <SiteDockMobile /> gives each tab its own flex column instead.
export function SiteDock() {
    const pathname = usePathname();

    return (
        <>
            <SiteDockMobile />
            {/* No overflow-hidden on the Dock itself: a magnified icon and
                the hover label both deliberately extend past the pill's own
                box (the classic macOS dock look — the label floats above the
                bar, not clipped inside it). overflow-hidden here would
                silently cut both off; `.liquid-glass`'s own rounded
                highlight doesn't need it (border-radius on a ::before clips
                only that pseudo-element's own background, not its parent's
                other children).
                No padding growth on hover — that pushed the pill's own
                bounds around instead of just letting the label float above
                it, which read as the dock going "out of bounds." The pill
                stays a fixed size; the label overflows above it. */}
            <div className="fixed inset-x-0 bottom-5 z-50 hidden justify-center sm:flex">
                {/* group/dock: the CURRENT page's label should only appear
                    while the pointer is somewhere over the dock, not
                    permanently — named so it doesn't collide with each
                    DockIcon's own `group` (that one gates an individual
                    icon's own hover state: its color and its label when
                    it's a non-active page). */}
                <Dock className="liquid-glass group/dock relative">
                    {navItems.map((item) => {
                        const active =
                            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <DockIcon
                                key={item.href}
                                className="group relative"
                                style={{ "--item-color": item.color } as CSSProperties}
                            >
                                <Link
                                    href={item.href}
                                    aria-label={item.label}
                                    aria-current={active ? "page" : undefined}
                                    className="flex size-full items-center justify-center"
                                >
                                    {/* Active page: always tinted. Any other
                                        page: tinted only while its own icon
                                        is hovered (group-hover, scoped to
                                        this DockIcon) — the arbitrary-value
                                        "color colon var" syntax below is
                                        Tailwind's escape hatch for a
                                        per-item dynamic color a plain
                                        utility class can't express, since
                                        each nav item has a different
                                        accent. */}
                                    <Icon
                                        className={cn(
                                            "size-full transition-all duration-200",
                                            active
                                                ? undefined
                                                : "text-muted-foreground group-hover:[color:var(--item-color)] group-hover:drop-shadow-[0_0_6px_color-mix(in_oklch,var(--item-color)_65%,transparent)]"
                                        )}
                                        style={{
                                            color: active ? item.color : undefined,
                                            filter: active
                                                ? `drop-shadow(0 0 6px color-mix(in oklch, ${item.color} 65%, transparent))`
                                                : undefined,
                                        }}
                                    />
                                </Link>
                                {active && (
                                    <span
                                        className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                                        style={{
                                            backgroundColor: item.color,
                                            boxShadow: `0 0 6px ${item.color}`,
                                        }}
                                    />
                                )}
                                {/* Label above the icon, tinted to that
                                    page's own color always — visibility is
                                    what's gated: the active page's label
                                    needs the pointer somewhere over the
                                    WHOLE dock (group-hover/dock), every
                                    other page's label needs its own icon
                                    hovered (plain group-hover, scoped to
                                    this DockIcon). */}
                                <span
                                    className={cn(
                                        "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 font-mono text-[10px] opacity-0 shadow-sm transition-opacity duration-150",
                                        active ? "group-hover/dock:opacity-100" : "group-hover:opacity-100"
                                    )}
                                    style={{ color: item.color }}
                                >
                                    {item.label}
                                </span>
                            </DockIcon>
                        );
                    })}
                </Dock>
            </div>
        </>
    );
}

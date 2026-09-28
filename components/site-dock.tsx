"use client";

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
                box (the classic macOS dock look — the label floats above/
                below the bar, not clipped inside it). overflow-hidden here
                would silently cut both off; `.liquid-glass`'s own rounded
                highlight doesn't need it (border-radius on a ::before clips
                only that pseudo-element's own background, not its parent's
                other children).
                `hover:pt-9`: growing the pill's own top padding on hover
                reserves room for the label above each icon, so it never
                overlaps the bar — anchored because only this element's
                padding changes, not the fixed bottom-5 wrapper's position,
                so the bar grows upward from its bottom edge rather than the
                whole thing jumping around. */}
            <div className="fixed inset-x-0 bottom-5 z-50 hidden justify-center sm:flex">
                <Dock className="liquid-glass relative pt-2 transition-[padding-top] duration-300 ease-out hover:pt-9">
                    {navItems.map((item) => {
                        const active =
                            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <DockIcon key={item.href} className="group relative">
                                <Link
                                    href={item.href}
                                    aria-label={item.label}
                                    aria-current={active ? "page" : undefined}
                                    className="flex size-full items-center justify-center"
                                >
                                    <Icon
                                        className={cn(
                                            "size-full transition-all duration-200",
                                            !active && "text-muted-foreground group-hover:text-foreground"
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
                                {/* Label sits above the icon, tinted to that
                                    page's own color always (not just while
                                    active) — visibility is what's gated on
                                    hover/active, not the color. */}
                                <span
                                    className={cn(
                                        "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 font-mono text-xs shadow-sm transition-opacity duration-150",
                                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
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

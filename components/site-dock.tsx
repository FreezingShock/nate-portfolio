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
            <div className="fixed inset-x-0 bottom-5 z-50 hidden justify-center sm:flex">
                <Dock className="border-border/60 bg-card/60">
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
                                            "size-full transition-colors",
                                            active
                                                ? "text-primary"
                                                : "text-muted-foreground group-hover:text-foreground"
                                        )}
                                    />
                                </Link>
                                <span
                                    className={cn(
                                        "pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 font-mono text-xs text-popover-foreground opacity-0 shadow-sm transition-opacity",
                                        "group-hover:opacity-100"
                                    )}
                                >
                                    {item.label}
                                </span>
                                {active && (
                                    <span className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
                                )}
                            </DockIcon>
                        );
                    })}
                </Dock>
            </div>
        </>
    );
}

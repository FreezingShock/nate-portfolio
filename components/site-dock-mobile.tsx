"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Plain equal-width tab bar for touch — the fancy hover-magnify <Dock /> packs
// icons tightly with floating labels, which collide with each other on a
// phone once every label is always-visible (no hover to gate them). Each tab
// here gets its own flex column, so icon+label are confined to that column's
// width and can never overlap a neighbor.
export function SiteDockMobile() {
    const pathname = usePathname();

    return (
        <div className="liquid-glass fixed inset-x-0 bottom-0 z-50 overflow-hidden border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] sm:hidden">
            <div className="flex">
                {navItems.map((item) => {
                    const active =
                        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className="flex flex-1 flex-col items-center gap-0.5 py-2"
                        >
                            <Icon
                                className={cn("size-5 transition-colors", !active && "text-muted-foreground")}
                                style={{
                                    color: active ? item.color : undefined,
                                    filter: active
                                        ? `drop-shadow(0 0 4px color-mix(in oklch, ${item.color} 60%, transparent))`
                                        : undefined,
                                }}
                            />
                            <span
                                className={cn(
                                    "truncate px-0.5 font-mono text-[9px] leading-none transition-colors",
                                    !active && "text-muted-foreground"
                                )}
                                style={{ color: active ? item.color : undefined }}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

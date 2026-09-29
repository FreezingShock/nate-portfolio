"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Axis3D } from "lucide-react";
import { allGames, categoryById } from "@/lib/creations-data";
import { getProjectIcon } from "@/lib/project-icons";

// The three most recent creations (a project, renovation or web app game) the
// visitor opened, shown in the Dock. Only hrefs are stored, in localStorage;
// icon, color and label are resolved from them at render time.

const KEY = "recent-creations";
const MAX = 3;
const CATEGORY_PAGES = new Set(["games", "projects", "renovations", "artwork"]);

export interface RecentCreation {
    href: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

const titleCase = (slug: string) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Map a pathname to a recent-worthy creation, or null for anything else. */
export function resolveCreation(href: string): RecentCreation | null {
    const game = allGames().find((g) => g.href === href);
    if (game) {
        return {
            href,
            label: game.title,
            icon: game.icon,
            color: categoryById("games").color,
        };
    }
    const m = /^\/creations\/([^/]+)$/.exec(href);
    if (m && !CATEGORY_PAGES.has(m[1])) {
        const { icon, color } = getProjectIcon(m[1]);
        return { href, label: titleCase(m[1]), icon: icon ?? Axis3D, color };
    }
    return null;
}

function read(): string[] {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
        return Array.isArray(raw)
            ? raw.filter((h) => typeof h === "string").slice(0, MAX)
            : [];
    } catch {
        return [];
    }
}

export function useRecentCreations(): RecentCreation[] {
    const pathname = usePathname();
    const [hrefs, setHrefs] = useState<string[]>([]);

    // Load after mount so server and first client render agree (empty).
    useEffect(() => setHrefs(read()), []);

    useEffect(() => {
        if (!resolveCreation(pathname)) return;
        const next = [pathname, ...read().filter((h) => h !== pathname)].slice(
            0,
            MAX
        );
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        setHrefs(next);
    }, [pathname]);

    return hrefs
        .map(resolveCreation)
        .filter((c): c is RecentCreation => c !== null);
}

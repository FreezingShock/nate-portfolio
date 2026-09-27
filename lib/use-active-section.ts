"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which section id is currently most visible in the viewport,
 * so the nav can highlight it as the page scrolls — the "active" link
 * moves down the list to match scroll position.
 */
export function useActiveSection(ids: string[]) {
    const [active, setActive] = useState<string | null>(null);

    useEffect(() => {
        const elements = ids
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null);

        if (elements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visible.length > 0) {
                    setActive(visible[0].target.id);
                }
            },
            { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] }
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [ids]);

    return active;
}

"use client";

import { useEffect, useState } from "react";

function format(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (seconds < 60) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Computed after mount, not during render: the server renders at build/ISR
// time, so a "3 hours ago" baked into the HTML would be stale (and would
// mismatch on hydration). Server output is the absolute date instead.
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
    const [text, setText] = useState<string | null>(null);
    useEffect(() => {
        setText(format(iso));
        const id = setInterval(() => setText(format(iso)), 60_000);
        return () => clearInterval(id);
    }, [iso]);

    const absolute = iso
        ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
        : "";
    return (
        <span className={className} title={iso} suppressHydrationWarning>
            {text ?? absolute}
        </span>
    );
}

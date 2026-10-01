"use client";

import { BADGE_SYMBOLS, PREFIXES } from "@/lib/fractured-idle/fxp";
import { LEVEL_CSS, LevelBadge } from "@/components/games/fractured-idle/level-badge";
import type { GameSummary } from "@/lib/account/cosmetics";

// The Fractured Level badge built from a cloud summary (no full save needed). It is the game's own LevelBadge,
// so it looks identical everywhere. Loaded lazily by the site menu so the game code does not ship on every page.
export default function FiLevelTag({ summary, size = "sm" }: { summary: GameSummary; size?: "sm" | "md" | "lg" }) {
    const level = typeof summary.level === "number" ? summary.level : 0;
    const sym = BADGE_SYMBOLS.find((b) => b.id === summary.bsym && b.at <= level);
    const prefix = PREFIXES.find((p) => p.id === summary.pfx);
    return (
        <>
            <style>{LEVEL_CSS}</style>
            <LevelBadge level={level} sym={sym} prefix={prefix} size={size} />
        </>
    );
}

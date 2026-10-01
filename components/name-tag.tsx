"use client";

import { McSymbol } from "@/components/mc-symbol";
import type { Equipped } from "@/lib/account/cosmetics";
import { equippedOf } from "@/lib/account/cosmetics";
import { accentOf, customOf } from "@/lib/account/custom";

// A player's name as the whole site shows it: their equipped symbol first (it may move), then the name in
// Minecraft bold, glowing in their accent color (or sliding through a rainbow for the Prismatic accent). One
// place, so every page (menu, profile, games) renders it the same way.
export function NameTag({ user, className = "" }: { user: { name: string; cosmetics?: Equipped | null; custom?: unknown }; className?: string }) {
    const eq = equippedOf(user.cosmetics);
    const accent = accentOf(user);
    const rainbow = eq.accent.anim === "rainbow" && !customOf(user.custom).accent;
    return (
        <span className={`inline-flex min-w-0 items-center gap-1.5 font-minecraft font-bold ${className}`} style={{ color: accent, textShadow: `0 0 14px color-mix(in oklch, ${accent} 55%, transparent)` }}>
            {eq.symbol.symbol && <McSymbol name={eq.symbol.symbol} className={eq.symbol.anim ? `pfa pfa-${eq.symbol.anim}` : ""} />}
            <span className={`truncate ${rainbow ? "pf-rainbow-text" : ""}`}>{user.name}</span>
        </span>
    );
}

"use client";

import { McSymbol } from "@/components/mc-symbol";
import type { Profile } from "@/lib/account/client";
import { equippedOf } from "@/lib/account/cosmetics";

// A player's name as the whole site shows it: their equipped symbol first, then the name in Minecraft bold,
// glowing in their accent color. One place, so every page (menu, profile, games) renders it the same way.
export function NameTag({ user, className = "" }: { user: Pick<Profile, "name" | "cosmetics">; className?: string }) {
    const eq = equippedOf(user.cosmetics);
    const accent = eq.accent.color ?? "#55ffff";
    return (
        <span className={`inline-flex min-w-0 items-center gap-1.5 font-minecraft font-bold ${className}`} style={{ color: accent, textShadow: `0 0 14px color-mix(in oklch, ${accent} 55%, transparent)` }}>
            {eq.symbol.symbol && <McSymbol name={eq.symbol.symbol} />}
            <span className="truncate">{user.name}</span>
        </span>
    );
}

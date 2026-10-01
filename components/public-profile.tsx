"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HeroLevel, ProfileHero, ProfileShell, WidgetGrid, type FiView, type ViewProfile } from "@/components/profile-canvas";
import { ensureAccount, useAccount } from "@/lib/account/client";
import { cleanCustom } from "@/lib/account/custom";
import type { GameSummaries } from "@/lib/account/cosmetics";
import { importSave } from "@/lib/fractured-idle/engine";

// What the get_public_profile database function returns for a shared profile.
export interface PublicData {
    id: string;
    name: string;
    handle: string | null;
    bio: string;
    cosmetics: Record<string, string>;
    custom: unknown;
    createdAt: string;
    games: GameSummaries;
    saves: Record<string, string>;
}

/** Someone else's profile: the same canvas as your own, read-only, with no owner-only sections. */
export function PublicProfile({ data }: { data: PublicData }) {
    const a = useAccount();
    useEffect(() => ensureAccount(), []);
    const u: ViewProfile = useMemo(() => ({ id: data.id, name: data.name, handle: data.handle, bio: data.bio, cosmetics: data.cosmetics, custom: cleanCustom(data.custom), games: data.games, createdAt: data.createdAt }), [data]);
    const state = useMemo(() => {
        const raw = data.saves["fractured-idle"];
        return raw ? importSave(raw) : null;
    }, [data]);
    const fi: FiView = { state, status: "ok", footer: <Link href="/creations/games/fractured-idle" className="font-minecraft font-bold text-[var(--mc-aqua)] hover:underline">Play Fractured Idle</Link> };

    return (
        <ProfileShell u={u} className="space-y-4">
            <Link href="/u" className="inline-flex items-center gap-1.5 font-minecraft text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> All players</Link>
            <ProfileHero u={u} isOwner={false} isPublic level={<HeroLevel u={u} s={state} />} signedAs={a.user?.id ?? null} />
            <WidgetGrid u={u} fi={fi} isOwner={false} />
        </ProfileShell>
    );
}

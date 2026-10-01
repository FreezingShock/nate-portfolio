"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountAvatar } from "@/components/account-avatar";
import { NameTag } from "@/components/name-tag";
import { ensureAccount, useAccount } from "@/lib/account/client";
import { equippedOf } from "@/lib/account/cosmetics";
import type { State } from "@/lib/fractured-idle/data";
import { SAVE_KEY, newState, parseSave } from "@/lib/fractured-idle/engine";
import { FracturedIdleBlock } from "./profile-block";

// The strip under the game: who is playing, then the shared Fractured Idle block (the very same component
// the profile page shows). It re-reads this browser's save every few seconds, so it follows the game
// without touching its state.
function readLocal(): State | null {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? parseSave(raw) : null;
    } catch {
        return null;
    }
}

export function FracturedIdleProfile() {
    const a = useAccount();
    const [s, setS] = useState<State | null>(null);

    useEffect(() => {
        ensureAccount();
        setS(readLocal() ?? newState());
        const h = setInterval(() => setS(readLocal() ?? newState()), 5000);
        return () => clearInterval(h);
    }, []);

    const u = a.user;
    const eq = equippedOf(u?.cosmetics);
    const cloud = u ? (a.lastSync ? `Cloud save on, last synced ${new Date(a.lastSync).toLocaleTimeString()}` : "Cloud save on, syncs every minute") : "Sign in to back this save up and play it on any device";

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-card/40 p-3 backdrop-blur-xl">
                <AccountAvatar id={u?.id} name={u?.name} size={46} frame={u ? eq.frame : undefined} />
                <div className="min-w-0 flex-1">
                    {u ? <NameTag user={u} className="text-base" /> : <span className="font-minecraft text-base font-bold text-foreground">Guest</span>}
                    <div className="truncate font-rubik text-[11px] text-muted-foreground">{cloud}</div>
                </div>
                {u ? (
                    <Link href="/profile" className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 font-minecraft text-xs font-bold hover:bg-white/10">Profile</Link>
                ) : (
                    <Link href="/account" className="shrink-0 rounded-lg border border-[var(--mc-aqua)]/60 px-3 py-1.5 font-minecraft text-xs font-bold text-[var(--mc-aqua)] hover:bg-[var(--mc-aqua)]/10">{a.email === undefined ? "…" : "Sign in"}</Link>
                )}
            </div>
            {s && <FracturedIdleBlock s={s} owner={u ? `${u.name}'s run` : "This browser's save"} />}
        </div>
    );
}

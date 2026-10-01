"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountAvatar } from "@/components/account-avatar";
import { ensureAccount, useAccount } from "@/lib/account/client";
import { fracturedIdleStats } from "@/lib/account/games";
import type { State } from "@/lib/fractured-idle/data";
import { SAVE_KEY, parseSave } from "@/lib/fractured-idle/engine";

// Placeholder profile strip under the game: who is playing, their numbers, and a short run-down.
// It reads this browser's save every few seconds, so it follows the game without touching its state.
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
        setS(readLocal());
        const h = setInterval(() => setS(readLocal()), 5000);
        return () => clearInterval(h);
    }, []);

    const u = a.user;
    const stats = s ? fracturedIdleStats(s) : null;
    const lines: string[] = [];
    if (s && stats) {
        lines.push(`${stats[0].value} lifetime shards across ${s.rebirths} rebirth${s.rebirths === 1 ? "" : "s"} and ${s.asc} ascension${s.asc === 1 ? "" : "s"}.`);
        lines.push(`${s.visited.length} island${s.visited.length === 1 ? "" : "s"} visited and ${s.hatched} pet${s.hatched === 1 ? "" : "s"} hatched.`);
        lines.push(`${stats[4].value} played over ${stats[3].value} clicks.`);
    }
    lines.push(
        u
            ? a.lastSync
                ? `Cloud save is on. Last synced ${new Date(a.lastSync).toLocaleTimeString()}.`
                : "Cloud save is on. It syncs every minute while you play."
            : "Sign in to back this save up and play it on any device."
    );

    return (
        <div className="grid gap-4 rounded-2xl border border-white/12 bg-card/40 p-4 backdrop-blur-xl sm:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-3 sm:flex-col sm:justify-center sm:text-center">
                <AccountAvatar id={u?.id} name={u?.name} size={64} />
                <div className="min-w-0">
                    <div className="truncate font-minecraft text-base text-foreground">{u ? u.name : "Guest"}</div>
                    {u ? (
                        <Link href="/profile" className="font-rubik text-xs text-[var(--mc-aqua)] hover:underline">View profile</Link>
                    ) : (
                        <Link href="/account" className="font-rubik text-xs text-[var(--mc-aqua)] hover:underline">{a.email === undefined ? "Checking…" : "Sign in"}</Link>
                    )}
                </div>
            </div>
            <div className="min-w-0 space-y-3">
                {stats ? (
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {stats.map((x) => (
                            <div key={x.label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                <dt className="font-rubik text-[10px] uppercase tracking-wide text-muted-foreground">{x.label}</dt>
                                <dd className="font-minecraft text-sm text-foreground">{x.value}</dd>
                            </div>
                        ))}
                    </dl>
                ) : (
                    <p className="font-rubik text-xs text-muted-foreground">Start playing and your stats show up here.</p>
                )}
                <ul className="list-disc space-y-1 pl-5 font-rubik text-xs text-muted-foreground">
                    {lines.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

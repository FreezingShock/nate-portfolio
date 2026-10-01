"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, LogIn, LogOut, Pencil, X } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { ACCOUNT_GAMES, type AccountGame, type GameStat } from "@/lib/account/games";
import { ensureAccount, fetchSave, renameProfile, signOut, useAccount } from "@/lib/account/client";

// The account's own page: who you are and what each game has saved. Games come from lib/account/games.ts.
type Cloud = { stats: GameStat[] | null; savedAt: number } | "none" | "loading" | "error";

function GameCard({ g }: { g: AccountGame }) {
    const [c, setC] = useState<Cloud>("loading");
    useEffect(() => {
        let dead = false;
        fetchSave(g.id).then(({ save, error }) => {
            if (dead) return;
            if (error) setC("error");
            else if (!save) setC("none");
            else setC({ stats: g.summarize(save.data), savedAt: save.savedAt });
        });
        return () => {
            dead = true;
        };
    }, [g]);

    return (
        <div className="rounded-2xl border bg-card/40 p-4 backdrop-blur-xl" style={{ borderColor: `color-mix(in oklch, ${g.color} 35%, transparent)` }}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-minecraft text-base" style={{ color: g.color }}>{g.name}</h3>
                    <p className="font-rubik text-[11px] text-muted-foreground">{g.blurb}</p>
                </div>
                <Link href={g.href} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 font-rubik text-xs hover:bg-white/10">Play</Link>
            </div>
            <div className="mt-3">
                {c === "loading" && (
                    <p className="flex items-center gap-2 font-rubik text-xs text-muted-foreground">
                        <LoaderCircle className="size-3.5 animate-spin" /> Loading cloud save…
                    </p>
                )}
                {c === "error" && <p className="font-rubik text-xs text-[var(--mc-red)]">Could not load the cloud save.</p>}
                {c === "none" && <p className="font-rubik text-xs text-muted-foreground">No cloud save yet. Open the game while signed in and it uploads within a minute.</p>}
                {typeof c === "object" && (
                    <>
                        {c.stats ? (
                            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {c.stats.map((s) => (
                                    <div key={s.label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                        <dt className="font-rubik text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</dt>
                                        <dd className="font-minecraft text-sm text-foreground">{s.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        ) : (
                            <p className="font-rubik text-xs text-muted-foreground">Save found, but its stats could not be read.</p>
                        )}
                        <p className="mt-2 font-rubik text-[11px] text-muted-foreground">Last saved {new Date(c.savedAt).toLocaleString()}</p>
                    </>
                )}
            </div>
        </div>
    );
}

export function ProfileView() {
    const a = useAccount();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [welcome, setWelcome] = useState(false);

    useEffect(() => {
        ensureAccount();
        setWelcome(new URLSearchParams(window.location.search).has("welcome"));
    }, []);

    if (a.email === undefined)
        return (
            <p className="flex items-center gap-2 font-rubik text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Loading…
            </p>
        );

    const u = a.user;
    if (!u)
        return (
            <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-card/40 p-6 text-center backdrop-blur-xl">
                <AccountAvatar size={56} className="mx-auto" />
                <h1 className="mt-3 font-minecraft text-xl">Sign in to see your profile</h1>
                <p className="mt-1 font-rubik text-xs text-muted-foreground">Your profile keeps your game progress across devices.</p>
                <Link href="/account" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--mc-aqua)] px-5 font-minecraft text-sm font-bold text-black">
                    <LogIn className="size-4" /> Sign in
                </Link>
            </div>
        );

    const save = async () => {
        setBusy(true);
        setErr(null);
        const r = await renameProfile(name);
        setBusy(false);
        if (!r.ok) return setErr(r.error ?? "Could not save.");
        setEditing(false);
    };

    return (
        <div className="space-y-6">
            {welcome && <p className="rounded-xl border border-[var(--mc-green)]/40 bg-[var(--mc-green)]/10 px-4 py-2 font-rubik text-sm text-[var(--mc-green)]">You are signed in. Welcome!</p>}

            <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/15 bg-card/40 p-6 backdrop-blur-xl sm:flex-row">
                <AccountAvatar id={u.id} name={u.name} size={84} />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                    {editing ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void save();
                            }}
                            className="flex items-center gap-2"
                        >
                            <input autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Display name" className="h-10 min-w-0 flex-1 rounded-xl border border-white/20 bg-black/30 px-3 font-minecraft text-base outline-none focus:border-[var(--mc-aqua)]" />
                            <button disabled={busy} aria-label="Save name" className="grid size-10 place-items-center rounded-xl bg-[var(--mc-aqua)] text-black disabled:opacity-60">
                                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                            </button>
                            <button type="button" onClick={() => { setEditing(false); setErr(null); }} aria-label="Cancel" className="grid size-10 place-items-center rounded-xl border border-white/15 hover:bg-white/10">
                                <X className="size-4" />
                            </button>
                        </form>
                    ) : (
                        <h1 className="flex items-center justify-center gap-2 font-minecraft text-2xl text-foreground sm:justify-start">
                            <span className="truncate">{u.name}</span>
                            <button type="button" onClick={() => { setName(u.name); setEditing(true); }} aria-label="Edit display name" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground">
                                <Pencil className="size-4" />
                            </button>
                        </h1>
                    )}
                    {err && <p role="alert" className="mt-1 font-rubik text-xs text-[var(--mc-red)]">{err}</p>}
                    <p className="mt-1 truncate font-rubik text-sm text-muted-foreground">{u.email}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <span className="rounded-full border border-white/15 px-2.5 py-0.5 font-rubik text-[11px] text-muted-foreground">{u.provider === "google" ? "Signed in with Google" : "Email account"}</span>
                        <span className="rounded-full border border-white/15 px-2.5 py-0.5 font-rubik text-[11px] text-muted-foreground">Member since {new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="mb-3 font-minecraft text-lg text-foreground">Your games</h2>
                <div className="space-y-3">
                    {ACCOUNT_GAMES.map((g) => (
                        <GameCard key={g.id} g={g} />
                    ))}
                </div>
                <p className="mt-3 font-rubik text-[11px] text-muted-foreground">More games will appear here as they gain cloud saves.</p>
            </section>

            <button type="button" onClick={() => void signOut()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mc-red)]/60 px-4 font-rubik text-sm text-[var(--mc-red)] hover:bg-[var(--mc-red)]/10">
                <LogOut className="size-4" /> Sign out
            </button>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { refreshAccount, signIn, signOut, signUp, useAccount } from "@/lib/account/client";

// Sign up / sign in / sign out. Used only to keep idle-game progress across devices.
export function AccountForm() {
    const a = useAccount();
    const [mode, setMode] = useState<"in" | "up">("in");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void refreshAccount();
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setNote(null);
        if (mode === "up" && pw !== pw2) return setErr("Passwords do not match.");
        setBusy(true);
        const r = mode === "up" ? await signUp(email, pw) : await signIn(email, pw);
        setBusy(false);
        if (!r.ok) return setErr(r.error ?? "Something went wrong.");
        setPw("");
        setPw2("");
        if ("confirm" in r && r.confirm) {
            setNote("Check your email and click the confirmation link, then sign in.");
            setMode("in");
        }
    };

    const field = "h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 font-rubik text-sm outline-none focus:border-[var(--mc-aqua)]";

    return (
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-white/15 bg-card/40 p-6 backdrop-blur-xl">
            <h1 className="font-minecraft text-xl text-[var(--mc-aqua)]">Account</h1>
            <p className="mt-1 font-rubik text-xs text-muted-foreground">An account only saves your idle game progress so it follows you between devices. Nothing else on the site uses it.</p>

            {a.email === undefined ? (
                <p className="mt-6 font-rubik text-sm text-muted-foreground">Checking…</p>
            ) : a.email ? (
                <div className="mt-6 space-y-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 font-rubik text-sm">
                        Signed in as <b className="text-[var(--mc-green)]">{a.email}</b>
                    </div>
                    <p className="font-rubik text-xs text-muted-foreground">Fractured Idle syncs automatically while you are signed in. Manage it from Settings in the game.</p>
                    <div className="flex gap-2">
                        <Link href="/creations" className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/15 font-rubik text-sm hover:bg-white/10">Back to games</Link>
                        <button type="button" onClick={() => void signOut()} className="h-10 flex-1 rounded-xl border border-[var(--mc-red)]/60 font-rubik text-sm text-[var(--mc-red)] hover:bg-[var(--mc-red)]/10">Sign out</button>
                    </div>
                </div>
            ) : (
                <form onSubmit={submit} className="mt-5 space-y-3">
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 p-1">
                        {(["in", "up"] as const).map((m) => (
                            <button key={m} type="button" onClick={() => { setMode(m); setErr(null); }} className={`h-9 rounded-lg font-rubik text-sm transition-colors ${mode === m ? "bg-[var(--mc-aqua)]/20 text-[var(--mc-aqua)]" : "text-muted-foreground hover:bg-white/5"}`}>
                                {m === "in" ? "Sign in" : "Create account"}
                            </button>
                        ))}
                    </div>
                    <input className={field} type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className={field} type="password" required minLength={8} maxLength={128} placeholder="Password (8+ characters)" autoComplete={mode === "up" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} />
                    {mode === "up" && <input className={field} type="password" required minLength={8} maxLength={128} placeholder="Repeat password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
                    {err && <p role="alert" className="font-rubik text-xs text-[var(--mc-red)]">{err}</p>}
                    {note && <p className="font-rubik text-xs text-[var(--mc-green)]">{note}</p>}
                    <button disabled={busy} className="h-11 w-full rounded-xl bg-[var(--mc-aqua)] font-minecraft text-sm font-bold text-black transition-opacity disabled:opacity-60">
                        {busy ? "…" : mode === "up" ? "Create account" : "Sign in"}
                    </button>
                </form>
            )}
        </div>
    );
}

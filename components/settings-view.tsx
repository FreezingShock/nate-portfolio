"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Check, Download, LoaderCircle, LogIn, LogOut, Monitor, Moon, Palette, Sun, Trash2 } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { NameTag } from "@/components/name-tag";
import { ACCOUNT_GAMES } from "@/lib/account/games";
import { deleteAccount, ensureAccount, fetchSave, signOut, useAccount } from "@/lib/account/client";
import { PF_CSS } from "@/components/pf-css";
import { equippedOf } from "@/lib/account/cosmetics";
import { profileHref } from "@/lib/account/custom";
import { SoundPanel } from "@/components/sound-controls";

// Account settings: how you appear, how the site looks, what is stored, and how to leave. Every section is a
// card; a new game's cloud save shows up in "Your data" automatically (lib/account/games.ts).

const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;

function Card({ symbol, color, title, blurb, children }: { symbol: McSymbolName; color: string; title: string; blurb?: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border bg-card/40 p-5 backdrop-blur-xl" style={{ borderColor: tint(color, 30) }}>
            <div className="mb-4 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ color, backgroundColor: tint(color, 16), boxShadow: `inset 0 0 0 1px ${tint(color, 38)}` }}><McSymbol name={symbol} /></span>
                <div>
                    <h2 className="font-minecraft text-base font-bold text-foreground">{title}</h2>
                    {blurb && <p className="font-rubik text-[11px] text-muted-foreground">{blurb}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

export function SettingsView() {
    const a = useAccount();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [confirm, setConfirm] = useState("");
    const [delErr, setDelErr] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        ensureAccount();
        setMounted(true);
    }, []);
    const u = a.user;

    if (a.email === undefined) return <p className="flex items-center gap-2 font-rubik text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading…</p>;
    if (!u)
        return (
            <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-card/40 p-6 text-center backdrop-blur-xl">
                <h1 className="font-minecraft text-xl font-bold">Sign in to open settings</h1>
                <Link href="/account" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--mc-aqua)] px-5 font-minecraft text-sm font-bold text-black"><LogIn className="size-4" /> Sign in</Link>
            </div>
        );

    const eq = equippedOf(u.cosmetics);

    const exportData = async () => {
        setExporting(true);
        const games: Record<string, unknown> = {};
        for (const g of ACCOUNT_GAMES) {
            const { save } = await fetchSave(g.id);
            if (save) games[g.id] = { savedAt: save.savedAt, savedBy: save.device, summary: u.games[g.id] ?? null, saveCode: save.data };
        }
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account: { id: u.id, email: u.email, name: u.name, signInMethod: u.provider, createdAt: u.createdAt, equipped: u.cosmetics }, games }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "nateanderson-dev-account-data.json";
        link.click();
        URL.revokeObjectURL(url);
        setExporting(false);
    };

    const del = async () => {
        setDeleting(true);
        setDelErr(null);
        const r = await deleteAccount(confirm);
        setDeleting(false);
        if (!r.ok) return setDelErr(r.error ?? "Could not delete the account.");
        window.location.assign("/");
    };

    const themes = [
        { id: "light", label: "Light", icon: Sun },
        { id: "dark", label: "Dark", icon: Moon },
        { id: "system", label: "System", icon: Monitor },
    ];

    return (
        <div className="pf-root space-y-5">
            <style>{PF_CSS}</style>
            <header className="flex items-center gap-4">
                <AccountAvatar id={u.id} name={u.name} size={64} frame={eq.frame} avatar={u.custom.avatar} />
                <div className="min-w-0">
                    <h1 className="font-minecraft text-2xl font-bold text-foreground">Account settings</h1>
                    <p className="font-rubik text-xs text-muted-foreground">Signed in as <NameTag user={u} className="text-sm" />. Sign-in, theme and your data live here.</p>
                </div>
            </header>

            <section className="flex flex-wrap items-center gap-3 rounded-2xl border p-4 backdrop-blur-xl" style={{ borderColor: tint("var(--mc-light-purple)", 40), background: tint("var(--mc-light-purple)", 8) }}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl text-xl" style={{ color: "var(--mc-light-purple)", backgroundColor: tint("var(--mc-light-purple)", 16) }}><McSymbol name="flower" /></span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-minecraft text-sm font-bold text-foreground">Looking for your name, picture, banner or layout?</h2>
                    <p className="font-rubik text-[11px] text-muted-foreground">All of that is on your profile, under Customize. This page is only for the account itself.</p>
                </div>
                <Link href={profileHref(u, "?tab=customize")} className="pf-btn" data-primary=""><Palette className="size-4" /> <span>Customize profile</span></Link>
                <Link href={profileHref(u)} className="pf-btn"><span>View profile</span></Link>
            </section>

            <Card symbol="night" color="var(--mc-light-purple)" title="Site theme" blurb="Light or dark for every page of the site. This is not your profile look.">
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
                    {themes.map((t) => {
                        const on = mounted && theme === t.id;
                        return (
                            <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setTheme(t.id)} className="flex h-11 items-center justify-center gap-2 rounded-xl border font-minecraft text-xs font-bold transition-colors hover:bg-white/10" style={on ? { color: "var(--mc-light-purple)", borderColor: tint("var(--mc-light-purple)", 60), backgroundColor: tint("var(--mc-light-purple)", 14) } : { color: "var(--muted-foreground)", borderColor: "rgba(255,255,255,0.15)" }}>
                                <t.icon className="size-4" /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </Card>

            <Card symbol="speed" color="var(--mc-green)" title="Sound" blurb="Soft interface sounds for the site and the games. Saved in this browser.">
                <SoundPanel />
            </Card>

            <Card symbol="trueDefense" color="var(--mc-gold)" title="Sign-in" blurb="The account you sign in with.">
                <dl className="grid gap-x-6 gap-y-2 font-rubik text-sm sm:grid-cols-2">
                    <div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</dt><dd className="break-all text-foreground">{u.email}</dd></div>
                    <div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Sign-in method</dt><dd className="text-foreground">{u.provider === "google" ? "Google" : "Email and password"}</dd></div>
                    <div><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Member since</dt><dd className="text-foreground">{new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</dd></div>
                </dl>
                <button type="button" onClick={() => void signOut()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 px-4 font-rubik text-sm hover:bg-white/10"><LogOut className="size-4" /> Sign out</button>
            </Card>

            <Card symbol="defense" color="var(--mc-green)" title="Your data" blurb="What is stored, and how to take it with you.">
                <ul className="mb-3 list-disc space-y-1 pl-5 font-rubik text-xs text-muted-foreground">
                    <li>Your email, display name, handle, bio, profile picture and the look you chose.</li>
                    <li>If your profile is public, anyone with its link can see your name, picture, bio, look and Fractured Idle stats, never your email.</li>
                    <li>One cloud save per game, plus a short summary of numbers (like your level) used to unlock cosmetics.</li>
                    <li>Your session lives in a secure cookie, never in the page. Nothing else is tracked.</li>
                </ul>
                <button type="button" onClick={() => void exportData()} disabled={exporting} className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 font-minecraft text-xs font-bold transition-colors hover:bg-white/10 disabled:opacity-60" style={{ color: "var(--mc-green)", borderColor: tint("var(--mc-green)", 55) }}>
                    {exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} Download my data
                </button>
            </Card>

            <Card symbol="critDamage" color="var(--mc-red)" title="Delete account" blurb="Permanent. Removes your profile and every cloud save.">
                <p className="mb-3 font-rubik text-xs text-muted-foreground">Saves on your devices stay in each browser, but the cloud copies and your profile are gone for good. Type your email to confirm.</p>
                <div className="flex flex-wrap items-center gap-2">
                    <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={u.email ?? "your email"} aria-label="Type your email to confirm" className="h-10 min-w-0 flex-1 rounded-xl border border-white/20 bg-black/30 px-3 font-rubik text-sm outline-none focus:border-[var(--mc-red)]" />
                    <button type="button" onClick={() => void del()} disabled={deleting || confirm.trim().toLowerCase() !== (u.email ?? "").toLowerCase()} className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 font-minecraft text-xs font-bold transition-colors hover:bg-[var(--mc-red)]/10 disabled:opacity-40" style={{ color: "var(--mc-red)", borderColor: tint("var(--mc-red)", 60) }}>
                        {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete forever
                    </button>
                </div>
                {delErr && <p role="alert" className="mt-2 font-rubik text-xs text-[var(--mc-red)]">{delErr}</p>}
            </Card>
        </div>
    );
}

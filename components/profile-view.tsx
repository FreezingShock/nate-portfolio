"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, LogIn, Settings, Users } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { McSymbol } from "@/components/mc-symbol";
import { Customizer } from "@/components/profile-customizer";
import { HeroLevel, ProfileHero, ProfileShell, WidgetGrid, tint, type FiView } from "@/components/profile-canvas";
import { Tip, TipCard } from "@/components/games/fractured-idle/tooltip";
import { ensureAccount, fetchSave, signOut, useAccount } from "@/lib/account/client";
import { accentOf } from "@/lib/account/custom";
import type { State } from "@/lib/fractured-idle/data";
import { importSave } from "@/lib/fractured-idle/engine";

// The account's own page: the profile as others see it (Overview) and every way to change it (Customize).
// The layout, hero and widgets live in profile-canvas.tsx and are shared with public profiles; the editor
// is profile-customizer.tsx. New games add their own widget and cosmetics without changing this file.

type Tab = "overview" | "customize";
type Cloud = { s: State | null; savedAt: number; device: string } | "loading" | "none" | "error";

export function ProfileView() {
    const a = useAccount();
    const [tab, setTab] = useState<Tab>("overview");
    const [cloud, setCloud] = useState<Cloud>("loading");
    const [welcome, setWelcome] = useState(false);
    const uid = a.user?.id;

    useEffect(() => {
        ensureAccount();
        const q = new URLSearchParams(window.location.search);
        setWelcome(q.has("welcome"));
        if (q.get("tab") === "customize") setTab("customize");
    }, []);

    useEffect(() => {
        if (!uid) return;
        let dead = false;
        fetchSave("fractured-idle").then(({ save, error }) => {
            if (dead) return;
            if (error) setCloud("error");
            else if (!save) setCloud("none");
            else setCloud({ s: importSave(save.data), savedAt: save.savedAt, device: save.device });
        });
        return () => {
            dead = true;
        };
    }, [uid]);

    if (a.email === undefined) return <p className="flex items-center gap-2 font-rubik text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading…</p>;

    const u = a.user;
    if (!u)
        return (
            <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-card/40 p-6 text-center backdrop-blur-xl">
                <AccountAvatar size={56} className="mx-auto" />
                <h1 className="mt-3 font-minecraft text-xl font-bold">Sign in to see your profile</h1>
                <p className="mt-1 font-rubik text-xs text-muted-foreground">Your profile keeps your game progress, unlocks and looks across devices.</p>
                <Link href="/account" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--mc-aqua)] px-5 font-minecraft text-sm font-bold text-black"><LogIn className="size-4" /> Sign in</Link>
            </div>
        );

    const accent = accentOf(u);
    const fiState = typeof cloud === "object" ? cloud.s : null;
    const fi: FiView =
        typeof cloud === "object"
            ? {
                  state: cloud.s,
                  status: "ok",
                  footer: (
                      <span className="flex items-center gap-3">
                          <span>Saved {new Date(cloud.savedAt).toLocaleString()} from {cloud.device}</span>
                          <Link href="/creations/games/fractured-idle" className="font-minecraft font-bold text-[var(--mc-aqua)] hover:underline">Play</Link>
                      </span>
                  ),
              }
            : { state: null, status: cloud };

    const tabs = [
        ["overview", "Overview", "wisdom", "Your profile as other players see it."],
        ["customize", "Customize", "magicFind", "Picture, banner, colors, layout and every cosmetic you have unlocked."],
    ] as const;

    return (
        <ProfileShell u={u} className="space-y-4">
            {welcome && <p className="rounded-xl border border-[var(--mc-green)]/40 bg-[var(--mc-green)]/10 px-4 py-2 font-rubik text-sm text-[var(--mc-green)]">You are signed in. Welcome!</p>}

            <nav className="pf-tabs" aria-label="Profile sections">
                {tabs.map(([id, label, sym, blurb]) => (
                    <Tip key={id} box tip={<TipCard title={label} color={accent} lines={[blurb]} ctaDim={tab === id} cta={tab === id ? "You are here" : "Click to open!"} />}>
                        <button type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className="pf-tab" data-on={tab === id}>
                            <McSymbol name={sym} /> {label}
                        </button>
                    </Tip>
                ))}
                <span className="flex-1" />
                <Tip tip={<TipCard title="Players" color="var(--mc-light-purple)" lines={["Browse public profiles or open one by its handle."]} cta="Click to open!" />}>
                    <Link href="/u" className="pf-tab" data-link=""><Users className="size-4" /> <span className="hidden sm:inline">Players</span></Link>
                </Tip>
            </nav>

            {tab === "overview" ? (
                <>
                    <ProfileHero u={u} isOwner isPublic={u.isPublic} level={<HeroLevel u={u} s={fiState} />} onCustomize={() => setTab("customize")} />
                    <WidgetGrid u={u} fi={fi} isOwner onCustomize={() => setTab("customize")} />
                </>
            ) : (
                <Customizer u={u} fiState={fiState} />
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
                <Link href="/settings" className="pf-btn"><Settings className="size-4" /> <span>Settings</span></Link>
                <button type="button" onClick={() => void signOut()} className="pf-btn" data-danger="">Sign out</button>
            </div>
            <style>{`.pf-tabs{display:flex;align-items:center;gap:.4rem;padding:.35rem;border-radius:1rem;border:1px solid rgba(255,255,255,.1);background:color-mix(in oklch,var(--card) 45%,transparent);backdrop-filter:blur(14px)}
.pf-tab{--c:var(--ac);display:inline-flex;align-items:center;justify-content:center;gap:.5rem;height:2.4rem;padding:0 1rem;border-radius:.75rem;font-family:var(--font-minecraft,inherit);font-size:.75rem;font-weight:700;color:var(--muted-foreground);background:transparent;box-shadow:inset 0 0 0 1px transparent;transition:background .18s,box-shadow .18s,color .18s,transform .14s cubic-bezier(.2,1.5,.4,1);outline:none;touch-action:manipulation}
.pf-tab:hover{color:var(--foreground);background:rgba(255,255,255,.06);transform:translateY(-1px)}
.pf-tab:active{transform:scale(.95)}
.pf-tab[data-on="true"]{color:var(--c);background:${tint("var(--ac)", 16)};box-shadow:inset 0 0 0 1px ${tint("var(--ac)", 50)},0 0 16px -6px var(--ac)}
.pf-tab:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.pf-tab{transition:none}}`}</style>
        </ProfileShell>
    );
}

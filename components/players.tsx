"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import FiLevelTag from "@/components/fi-level-tag";
import { NameTag } from "@/components/name-tag";
import { BannerFx } from "@/components/profile-fx";
import { ProfileShell, tint } from "@/components/profile-canvas";
import { Tip, TipCard } from "@/components/games/fractured-idle/tooltip";
import { equippedOf, type GameSummaries } from "@/lib/account/cosmetics";
import { accentOf, bannerBg, bannerFx, cleanHandle, cleanCustom } from "@/lib/account/custom";

export interface PlayerRow {
    id: string;
    name: string;
    handle: string | null;
    bio: string;
    cosmetics: Record<string, string>;
    custom: unknown;
    games: GameSummaries;
}

// The player list: everyone who switched sharing on, each as a small card drawn in their own colors, plus a box
// to open a profile by handle.
export function Players({ rows }: { rows: PlayerRow[] }) {
    const router = useRouter();
    const [q, setQ] = useState("");
    const go = () => {
        const h = cleanHandle(q);
        if (h) router.push(`/u/${h}`);
    };
    return (
        <ProfileShell u={{ cosmetics: {}, custom: {} }} className="space-y-4">
            <section className="pf-card">
                <h1 className="font-minecraft text-xl font-bold text-foreground">Players</h1>
                <p className="mt-1 font-rubik text-xs text-muted-foreground">Profiles that players chose to share. Open one by its handle, or browse below.</p>
                <form onSubmit={(e) => { e.preventDefault(); go(); }} className="mt-3 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Open a profile by handle" aria-label="Handle" autoCapitalize="none" spellCheck={false} className="cz-input pl-9" />
                    </div>
                    <Tip tip={<TipCard title="Visit" color="var(--mc-aqua)" lines={["Opens /u/ followed by the handle you typed."]} />}>
                        <button className="pf-btn" data-primary="" disabled={!cleanHandle(q)}><span>Visit</span> <ArrowRight className="size-4" /></button>
                    </Tip>
                </form>
            </section>

            {rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center font-rubik text-xs text-muted-foreground">Nobody has shared a profile yet. Turn on Public profile in Customize to be the first.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((p) => {
                        const u = { ...p, custom: cleanCustom(p.custom) };
                        const accent = accentOf(u);
                        const eq = equippedOf(p.cosmetics);
                        const fi = p.games["fractured-idle"];
                        return (
                            <Tip key={p.id} box tip={<TipCard title={p.name} color={accent} lines={[p.bio || "No bio yet."]} cta="Click to visit!" />}>
                                <Link href={`/u/${p.handle ?? p.id}`} className="pl-card group" style={{ ["--c" as string]: accent } as CSSProperties}>
                                    <span className="pl-banner" style={{ background: bannerBg(u) }}><BannerFx fx={bannerFx(u)} /></span>
                                    <span className="pl-body">
                                        <span className="pl-av"><AccountAvatar id={p.id} name={p.name} size={52} frame={eq.frame} avatar={u.custom.avatar} /></span>
                                        <span className="min-w-0 flex-1">
                                            <NameTag user={u} className="text-sm" />
                                            {p.handle && <span className="block truncate font-rubik text-[11px] text-muted-foreground">@{p.handle}</span>}
                                        </span>
                                        {fi && typeof fi.level === "number" && <span className="pl-lvl"><FiLevelTag summary={fi} /></span>}
                                    </span>
                                    {p.bio && <span className="pl-bio">{p.bio}</span>}
                                </Link>
                            </Tip>
                        );
                    })}
                </div>
            )}
            <style>{`.pl-card{display:block;overflow:hidden;border-radius:1rem;border:1px solid ${tint("var(--c)", 28)};background:color-mix(in oklch,var(--card) 50%,transparent);backdrop-filter:blur(12px);transition:transform .16s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s;outline:none}
.pl-card:hover,.pl-card:focus-visible{transform:translateY(-3px);border-color:${tint("var(--c)", 65)};box-shadow:0 14px 30px -16px var(--c)}
.pl-banner{position:relative;display:block;height:3.4rem;overflow:hidden}
.pl-body{display:flex;align-items:center;gap:.7rem;padding:0 .8rem .7rem}
.pl-av{margin-top:-1.4rem;border-radius:9999px;background:var(--background);padding:.2rem;flex:none}
.pl-lvl{flex:none;padding:.25rem .45rem;border-radius:.6rem;background:#100010d9;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.pl-bio{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;padding:0 .9rem .85rem;font-family:var(--font-rubik,inherit);font-size:.72rem;line-height:1.4;color:var(--muted-foreground)}
@media (prefers-reduced-motion:reduce){.pl-card{transition:none}}`}</style>
        </ProfileShell>
    );
}

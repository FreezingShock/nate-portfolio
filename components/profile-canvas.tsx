"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Lock, Pencil, Play, Settings, Share2 } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import FiLevelTag from "@/components/fi-level-tag";
import { McSymbol } from "@/components/mc-symbol";
import { NameTag } from "@/components/name-tag";
import { LEVEL_CSS, LevelBadge } from "@/components/games/fractured-idle/level-badge";
import { FracturedIdleBlock, tierOf } from "@/components/games/fractured-idle/profile-block";
import { TIP_CSS, Tip, TipCard, TipProvider } from "@/components/games/fractured-idle/tooltip";
import type { Profile } from "@/lib/account/client";
import { COSMETICS, COS_KINDS, equippedOf, isUnlocked, progressFor } from "@/lib/account/cosmetics";
import { PF_CSS } from "@/components/pf-css";
import { BannerFx } from "@/components/profile-fx";
import { SIZE_COLS, WIDGETS, accentOf, bannerBg, bannerFx, customOf, type WidgetId } from "@/lib/account/custom";
import type { State } from "@/lib/fractured-idle/data";
import { BADGE_SYMBOLS, PREFIXES, prefixOf, prefixOpen, symbolOf, symbolOpen } from "@/lib/fractured-idle/fxp";

// The profile as a player sees it: a hero (banner, avatar, name, status) and a grid of widgets the owner
// arranged. The owner's own page and every public profile render this one component, so a profile always
// looks the same to everyone; owner-only widgets and buttons simply do not appear for visitors. Every hover
// uses the Fractured Idle tooltip (Tip / TipCard) and every panel shares the game's look via PF_CSS.

export type ViewProfile = Pick<Profile, "id" | "name" | "handle" | "bio" | "cosmetics" | "custom" | "games"> & { createdAt: string; provider?: Profile["provider"] };
export type FiView = { state: State | null; status: "ok" | "loading" | "none" | "error"; footer?: ReactNode; live?: boolean; savedAt?: number };

export const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;
const shareUrl = (u: Pick<ViewProfile, "id" | "handle">) => `${typeof window === "undefined" ? "" : window.location.origin}/u/${u.handle ?? u.id}`;

/** Wrap anything that shows profile UI: the tooltip layer, its styles, and the card style variables. */
export function ProfileShell({ u, children, className = "" }: { u: { cosmetics?: ViewProfile["cosmetics"]; custom?: unknown }; children: ReactNode; className?: string }) {
    const accent = accentOf(u);
    return (
        <TipProvider>
            <style>{TIP_CSS + LEVEL_CSS + PF_CSS}</style>
            <div className={`pf-root ${className}`} data-card={customOf(u.custom).card} style={{ ["--ac" as string]: accent } as CSSProperties}>
                {children}
            </div>
        </TipProvider>
    );
}

export function Chip({ children, color, tip }: { children: ReactNode; color?: string; tip?: ReactNode }) {
    const el = (
        <span tabIndex={tip ? 0 : undefined} className="pf-chip" style={color ? ({ ["--c" as string]: color } as CSSProperties) : undefined} data-tip={tip ? "" : undefined}>
            {children}
        </span>
    );
    return tip ? <Tip tip={tip}>{el}</Tip> : el;
}

// ---------- share ----------
export function ShareButton({ u, isPublic }: { u: Pick<ViewProfile, "id" | "handle">; isPublic: boolean }) {
    const [done, setDone] = useState(false);
    const go = async () => {
        const url = shareUrl(u);
        try {
            if (typeof navigator.share === "function" && matchMedia("(pointer:coarse)").matches) await navigator.share({ title: "Fractured profile", url });
            else await navigator.clipboard.writeText(url);
            setDone(true);
            setTimeout(() => setDone(false), 1800);
        } catch {
            /* dismissed */
        }
    };
    return (
        <Tip tip={<TipCard title={isPublic ? "Share profile" : "Sharing is off"} color={isPublic ? "var(--mc-aqua)" : "var(--mc-gold)"} lines={isPublic ? ["Copies a link anyone can open to see your profile."] : ["Only you can see this profile right now. Turn on Public profile in Customize, then share the link."]} rows={isPublic ? [["Link", `/u/${u.handle ?? "your-id"}`]] : undefined} cta={isPublic ? "Click to copy!" : undefined} ctaDim={!isPublic} />}>
            <button type="button" onClick={() => void go()} disabled={!isPublic} className="pf-btn" data-ok={done || undefined}>
                {done ? <Check className="size-4" /> : <Share2 className="size-4" />}
                <span>{done ? "Copied" : "Share"}</span>
            </button>
        </Tip>
    );
}

// ---------- hero ----------
export function ProfileHero({ u, isOwner, level, isPublic, onCustomize, signedAs }: { u: ViewProfile; isOwner: boolean; level: ReactNode; isPublic: boolean; onCustomize?: () => void; signedAs?: string | null }) {
    const eq = equippedOf(u.cosmetics);
    const accent = accentOf(u);
    const cu = customOf(u.custom);
    return (
        <section className="pf-card pf-hero" style={{ padding: 0, overflow: "hidden" }}>
            <div className="pf-banner" style={{ background: bannerBg(u) }}>
                <BannerFx fx={bannerFx(u)} />
                <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 120% at 15% 130%, ${tint(accent, 45)}, transparent 70%)` }} />
                <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,5,14,.82) 0%, rgba(6,5,14,.45) 45%, rgba(6,5,14,.12) 100%)" }} />
                <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(to bottom, black, transparent)" }} />
                {eq.symbol.symbol && (
                    <span aria-hidden className="absolute right-4 top-2 select-none text-[7rem] leading-none sm:text-[9rem]" style={{ color: accent, opacity: 0.13, transform: "rotate(10deg)", filter: `drop-shadow(0 0 24px ${accent})` }}>
                        <McSymbol name={eq.symbol.symbol} />
                    </span>
                )}
                {isOwner && (
                    <div className="absolute right-3 top-3 flex gap-2">
                        <Tip tip={<TipCard title="Settings" color="var(--mc-aqua)" lines={["Theme, your saved data, sign-in details and account deletion."]} cta="Click to open!" />}>
                            <Link href="/settings" aria-label="Settings" className="pf-iconbtn"><Settings className="size-4" /></Link>
                        </Tip>
                    </div>
                )}
            </div>

            <div className="relative px-5 pb-5 sm:px-7">
                <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-14 sm:flex-row sm:items-end">
                    <Tip tip={<TipCard title={eq.frame.name === "Plain" ? "Profile picture" : `${eq.frame.name} frame`} color={eq.frame.color ?? "var(--mc-aqua)"} lines={[eq.frame.need ? eq.frame.need.label : "The default frame."]} />}>
                        <div className="pf-avatar"><AccountAvatar id={u.id} name={u.name} size={96} frame={eq.frame} avatar={cu.avatar} /></div>
                    </Tip>
                    <div className="min-w-0 flex-1 pb-1">
                        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl sm:text-3xl">
                            <NameTag user={u} />
                            {u.handle && <span className="font-rubik text-sm font-normal text-muted-foreground">@{u.handle}</span>}
                        </h1>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {cu.pronouns && <Chip>{cu.pronouns}</Chip>}
                            {cu.status && (
                                <Chip color={accent} tip={<TipCard title="Status" color={accent} lines={[cu.status]} />}>
                                    <span className="pf-dot" /> {cu.status}
                                </Chip>
                            )}
                            {level}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Chip tip={<TipCard title="Member since" color="var(--mc-gray, #aaaaaa)" lines={[new Date(u.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })]} />}>Member since {new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</Chip>
                    {isOwner && u.provider && <Chip tip={<TipCard title="Sign-in method" lines={["Only you can see this."]} />}>{u.provider === "google" ? "Signed in with Google" : "Email account"}</Chip>}
                    {isOwner && (
                        <Chip color={isPublic ? "var(--mc-green)" : "var(--mc-gold)"} tip={<TipCard title={isPublic ? "Public profile" : "Private profile"} color={isPublic ? "var(--mc-green)" : "var(--mc-gold)"} lines={[isPublic ? "Anyone with your link can see this page, but never your email." : "Only you can see this page. Turn on sharing in Customize."]} />}>
                            {isPublic ? "Public" : "Private"}
                        </Chip>
                    )}
                    <span className="flex-1" />
                    {isOwner ? (
                        <>
                            <ShareButton u={u} isPublic={isPublic} />
                            <Tip tip={<TipCard title="Customize" color={accent} lines={["Avatar, banner, accent, card style, layout and every cosmetic you have unlocked."]} cta="Click to open!" />}>
                                <button type="button" onClick={onCustomize} className="pf-btn" data-primary="">
                                    <Pencil className="size-4" /> <span>Customize</span>
                                </button>
                            </Tip>
                        </>
                    ) : (
                        <>
                            <ShareButton u={u} isPublic />
                            {signedAs === u.id && (
                                <Link href="/profile?tab=customize" className="pf-btn" data-primary="">
                                    <Pencil className="size-4" /> <span>Edit your profile</span>
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

/** The Fractured Idle level tag for the hero: from the full save when there is one, else from the summary. */
export function HeroLevel({ u, s }: { u: ViewProfile; s: State | null }) {
    const fi = u.games["fractured-idle"];
    if (!s && !(fi && typeof fi.level === "number")) return null;
    const t = s ? tierOf(s) : null;
    return (
        <>
            <Tip tip={<TipCard title="Fractured Level" color="var(--mc-yellow)" lines={["The account level in Fractured Idle. It grows as you unlock things across every system in the game."]} />}>
                <span className="pf-chip" tabIndex={0} data-tip="" style={{ ["--c" as string]: "var(--mc-yellow)", background: "#100010d9" } as CSSProperties}>
                    <span className="font-minecraft text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fractured Idle</span>
                    {s ? <LevelBadge level={s.lvl} sym={symbolOf(s)} prefix={prefixOf(s)} size="sm" /> : fi ? <FiLevelTag summary={fi} /> : null}
                </span>
            </Tip>
            {t && (
                <Chip color={t.color} tip={<TipCard title={`${t.name} tier`} color={t.color} lines={[t.blurb]} notes={t.next ? [{ text: `Next: ${t.next}`, color: "var(--mc-yellow)" }] : undefined} />}>
                    <McSymbol name={t.idx >= 3 ? "comet" : "speed"} /> {t.name}
                </Chip>
            )}
        </>
    );
}

// ---------- widgets ----------
export function Panel({ id, title, meta, children, className = "" }: { id: WidgetId | "custom"; title: string; meta?: ReactNode; children: ReactNode; className?: string }) {
    const w = id === "custom" ? null : WIDGETS[id];
    return (
        <section className={`pf-card h-full ${className}`} style={{ ["--wc" as string]: w?.color ?? "var(--ac)" } as CSSProperties}>
            <div className="pf-ph">
                <h2 className="pf-h">
                    {w && <span className="pf-hi"><McSymbol name={w.symbol} /></span>}
                    {title}
                </h2>
                {meta && <span className="pf-meta">{meta}</span>}
            </div>
            {children}
        </section>
    );
}

function About({ u, isOwner, onCustomize }: { u: ViewProfile; isOwner: boolean; onCustomize?: () => void }) {
    const cu = customOf(u.custom);
    const accent = accentOf(u);
    return (
        <Panel id="about" title="About">
            {u.bio ? (
                <p className="font-rubik text-sm leading-relaxed text-foreground/90" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{u.bio}</p>
            ) : isOwner ? (
                <p className="font-rubik text-xs text-muted-foreground">
                    You have not written a bio yet.{" "}
                    <button type="button" onClick={onCustomize} className="font-minecraft font-bold hover:underline" style={{ color: accent }}>Add one</button>
                </p>
            ) : (
                <p className="font-rubik text-xs text-muted-foreground">Nothing here yet.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {cu.pronouns && <Chip>{cu.pronouns}</Chip>}
                {u.handle && (
                    <Chip tip={<TipCard title="Handle" lines={["The name in this profile's link."]} rows={[["Link", `/u/${u.handle}`]]} />}>@{u.handle}</Chip>
                )}
            </div>
        </Panel>
    );
}

function Titles({ s }: { s: State }) {
    const openP = PREFIXES.filter((p) => p.id !== "none" && prefixOpen(s, p)).length;
    const totalP = PREFIXES.length - 1;
    const openB = BADGE_SYMBOLS.filter((b) => b.id !== "none" && symbolOpen(s, b)).length;
    const totalB = BADGE_SYMBOLS.length - 1;
    return (
        <Panel id="titles" title="Titles and badges" meta={`${openP}/${totalP} titles · ${openB}/${totalB} badges`}>
            <div className="flex flex-wrap gap-1.5">
                {PREFIXES.filter((p) => p.id !== "none").map((p) => {
                    const open = prefixOpen(s, p);
                    const color = p.color === "rainbow" ? "#ff8fd0" : p.color;
                    return (
                        <Tip key={p.id} tip={<TipCard title={p.name} color={color} tag={open ? "Unlocked" : "Locked"} lines={[p.need?.label ?? "Always available"]} />}>
                            <span tabIndex={0} className="pf-pill" data-open={open} style={{ ["--c" as string]: color } as CSSProperties}>
                                {open ? p.name : <><Lock className="mr-1 inline size-3" />{p.name}</>}
                            </span>
                        </Tip>
                    );
                })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {BADGE_SYMBOLS.filter((b) => b.symbol).map((b) => {
                    const open = symbolOpen(s, b);
                    return (
                        <Tip key={b.id} tip={<TipCard title={`${b.name} badge`} color="var(--mc-yellow)" tag={open ? "Unlocked" : "Locked"} lines={[`Reach Fractured Level ${b.at}`]} />}>
                            <span tabIndex={0} className="pf-badge" data-open={open}>
                                {open ? <McSymbol name={b.symbol as never} /> : <Lock className="size-3.5" />}
                            </span>
                        </Tip>
                    );
                })}
            </div>
        </Panel>
    );
}

function EquippedLook({ u }: { u: ViewProfile }) {
    const eq = equippedOf(u.cosmetics);
    const accent = accentOf(u);
    const cu = customOf(u.custom);
    const rows = COS_KINDS.map((k) => {
        const c = eq[k.id];
        const preview =
            k.id === "symbol" ? <span className="text-xl" style={{ color: accent }}>{c.symbol ? <McSymbol name={c.symbol} /> : <span className="text-xs text-muted-foreground">none</span>}</span>
            : k.id === "banner" ? <span className="relative block h-7 w-12 overflow-hidden rounded-md border border-white/15" style={{ background: bannerBg(u) }}><BannerFx fx={bannerFx(u)} /></span>
            : k.id === "frame" ? <AccountAvatar id={u.id} name={u.name} size={30} frame={c} avatar={cu.avatar} />
            : <span className="size-6 rounded-full border-2 border-white/30" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />;
        const custom = (k.id === "banner" && cu.banner.mode === "custom") || (k.id === "accent" && cu.accent);
        return (
            <Tip key={k.id} box tip={<TipCard title={custom ? "Custom" : c.name} color={k.id === "accent" ? accent : "var(--mc-aqua)"} tag={k.label.replace(/s$/, "")} lines={[custom ? "A color chosen by the player instead of the equipped cosmetic." : c.need ? c.need.label : "Free for everyone."]} />}>
                <div className="pf-look" tabIndex={0}>
                    <span className="grid h-9 w-14 shrink-0 place-items-center">{preview}</span>
                    <span className="min-w-0">
                        <span className="pf-tl">{k.label.replace(/s$/, "")}</span>
                        <span className="pf-tv">{custom ? "Custom" : c.name}</span>
                    </span>
                </div>
            </Tip>
        );
    });
    return <Panel id="locker" title="Equipped look">{<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{rows}</div>}</Panel>;
}

function NextUnlocks({ u, onCustomize }: { u: ViewProfile; onCustomize?: () => void }) {
    const next = useMemo(
        () =>
            COSMETICS.filter((c) => c.need && !isUnlocked(c, u.games))
                .map((c) => ({ c, pct: Math.min(1, progressFor(c, u.games) / c.need!.n) }))
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 4),
        [u.games],
    );
    const have = COSMETICS.filter((c) => isUnlocked(c, u.games)).length;
    return (
        <Panel id="unlocks" title="Next unlocks" meta={`${have}/${COSMETICS.length} owned`}>
            {next.length === 0 ? (
                <p className="font-rubik text-xs text-muted-foreground">Everything available so far is unlocked. New games will add more.</p>
            ) : (
                <ul className="space-y-2.5">
                    {next.map(({ c, pct }) => (
                        <li key={c.id}>
                            <Tip box tip={<TipCard title={c.name} color="var(--mc-green)" tag={COS_KINDS.find((k) => k.id === c.kind)?.label.replace(/s$/, "")} lines={[c.need!.label]} rows={[["Progress", `${Math.floor(pct * 100)}%`, "var(--mc-yellow)"]]} cta="Click to open the locker!" />}>
                                <button type="button" onClick={onCustomize} className="block w-full text-left">
                                    <div className="flex items-center justify-between gap-2 font-rubik text-[11px]">
                                        <span className="truncate font-minecraft text-xs font-bold text-foreground">{c.name} <span className="font-rubik font-normal text-muted-foreground">· {COS_KINDS.find((k) => k.id === c.kind)?.label}</span></span>
                                        <span className="shrink-0 text-muted-foreground">{Math.floor(pct * 100)}%</span>
                                    </div>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: "var(--mc-green)", boxShadow: "0 0 8px var(--mc-green)" }} /></div>
                                    <div className="mt-0.5 font-rubik text-[10.5px] text-muted-foreground">{c.need!.label}</div>
                                </button>
                            </Tip>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function MoreGames() {
    return (
        <Panel id="games" title="More games">
            <p className="font-rubik text-[11px] leading-relaxed text-muted-foreground">Every game that saves to your account gets its own card here, and its achievements unlock new symbols, banners, frames and colors for your profile.</p>
            <Link href="/creations/games" className="mt-3 inline-block font-minecraft text-xs font-bold text-[var(--mc-aqua)] hover:underline">Browse all games</Link>
        </Panel>
    );
}

function FiWidget({ u, fi, isOwner }: { u: ViewProfile; fi: FiView; isOwner: boolean }) {
    if (fi.status === "loading") return <Panel id="fi" title="Fractured Idle"><p className="flex items-center gap-2 font-rubik text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" /> Loading the cloud save…</p></Panel>;
    if (fi.status === "error") return <Panel id="fi" title="Fractured Idle"><p className="font-rubik text-xs text-[var(--mc-red)]">Could not load the cloud save.</p></Panel>;
    if (!fi.state)
        return (
            <Panel id="fi" title="Fractured Idle">
                <div className="py-4 text-center">
                    <p className="font-rubik text-xs text-muted-foreground">{isOwner ? "No cloud save yet. Open the game while signed in and it uploads within a minute." : `${u.name} has not saved a run yet.`}</p>
                    {isOwner && <Link href="/creations/games/fractured-idle" className="pf-btn mt-3 inline-flex" data-primary=""><Play className="size-4" /> <span>Play now</span></Link>}
                </div>
            </Panel>
        );
    return <FracturedIdleBlock s={fi.state} owner={`${u.name}'s run`} footer={fi.footer} live={fi.live} savedAt={fi.savedAt} />;
}

/** The grid of widgets in the owner's order and sizes. Hidden widgets, and owner-only ones for visitors, are skipped. */
export function WidgetGrid({ u, fi, isOwner, onCustomize }: { u: ViewProfile; fi: FiView; isOwner: boolean; onCustomize?: () => void }) {
    const layout = customOf(u.custom).layout.filter((w) => !w.hidden && (isOwner || !WIDGETS[w.id].ownerOnly));
    const render = (id: WidgetId): ReactNode => {
        switch (id) {
            case "about": return <About u={u} isOwner={isOwner} onCustomize={onCustomize} />;
            case "fi": return <FiWidget u={u} fi={fi} isOwner={isOwner} />;
            case "titles": return fi.state ? <Titles s={fi.state} /> : <Panel id="titles" title="Titles and badges"><p className="font-rubik text-xs text-muted-foreground">Appears once a Fractured Idle run is saved.</p></Panel>;
            case "locker": return <EquippedLook u={u} />;
            case "unlocks": return <NextUnlocks u={u} onCustomize={onCustomize} />;
            case "games": return <MoreGames />;
        }
    };
    if (layout.length === 0) return <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center font-rubik text-xs text-muted-foreground">Every section is hidden.</p>;
    return (
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            {layout.map((w) => (
                <div key={w.id} className={`min-w-0 ${SIZE_COLS[w.size]}`}>{render(w.id)}</div>
            ))}
        </div>
    );
}

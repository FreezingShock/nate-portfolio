"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Lock, LogIn, Pencil, Play, Settings, X } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import FiLevelTag from "@/components/fi-level-tag";
import { McSymbol } from "@/components/mc-symbol";
import { NameTag } from "@/components/name-tag";
import { COSMETICS, COS_KINDS, equippedOf, isUnlocked, ofKind, progressFor, type CosKind, type Cosmetic } from "@/lib/account/cosmetics";
import { ensureAccount, equipCosmetics, fetchSave, renameProfile, signOut, useAccount, type Profile } from "@/lib/account/client";
import type { State } from "@/lib/fractured-idle/data";
import { importSave } from "@/lib/fractured-idle/engine";
import { BADGE_SYMBOLS, PREFIXES, prefixOpen, symbolOpen } from "@/lib/fractured-idle/fxp";
import { LEVEL_CSS, LevelBadge } from "@/components/games/fractured-idle/level-badge";
import { FracturedIdleBlock, tierOf } from "@/components/games/fractured-idle/profile-block";
import { TIP_CSS, Tip, TipCard, TipProvider } from "@/components/games/fractured-idle/tooltip";
import { prefixOf, symbolOf } from "@/lib/fractured-idle/fxp";

// The account's own page. Everything about how you look on the site lives here: the hero (banner, avatar frame,
// name symbol, accent) is drawn from what you have equipped, the Fractured Idle card is the shared block the game
// page uses too, and the locker shows every cosmetic the games can unlock. New games add their own block and
// their own cosmetics (lib/account/cosmetics.ts) without changing the layout.

const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;
type Tab = "overview" | "customize";
type Cloud = { s: State | null; savedAt: number; device: string } | "loading" | "none" | "error";

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-rubik text-[11px]" style={color ? { color, borderColor: tint(color, 50), backgroundColor: tint(color, 10) } : { color: "var(--muted-foreground)", borderColor: "rgba(255,255,255,0.15)" }}>
            {children}
        </span>
    );
}

// ---------- the hero ----------
function Hero({ u, cloud, onTab }: { u: Profile; cloud: Cloud; onTab: (t: Tab) => void }) {
    const eq = equippedOf(u.cosmetics);
    const accent = eq.accent.color ?? "#55ffff";
    const s = typeof cloud === "object" ? cloud.s : null;
    const fi = u.games["fractured-idle"];
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        setErr(null);
        const r = await renameProfile(name);
        setBusy(false);
        if (!r.ok) return setErr(r.error ?? "Could not save.");
        setEditing(false);
    };

    return (
        <section className="overflow-hidden rounded-3xl border bg-card/40 backdrop-blur-xl" style={{ borderColor: tint(accent, 40), boxShadow: `0 0 40px -18px ${accent}` }}>
            <div className="relative h-36 sm:h-44" style={{ background: eq.banner.bg }}>
                <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 120% at 15% 130%, ${tint(accent, 45)}, transparent 70%)` }} />
                {/* a dark scrim so the name stays readable on any banner */}
                <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,5,14,.82) 0%, rgba(6,5,14,.45) 45%, rgba(6,5,14,.12) 100%)" }} />
                <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(to bottom, black, transparent)" }} />
                {eq.symbol.symbol && (
                    <span aria-hidden className="absolute right-4 top-2 select-none text-[7rem] leading-none sm:text-[9rem]" style={{ color: accent, opacity: 0.13, transform: "rotate(10deg)", filter: `drop-shadow(0 0 24px ${accent})` }}>
                        <McSymbol name={eq.symbol.symbol} />
                    </span>
                )}
                <Link href="/settings" aria-label="Settings" className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl border border-white/20 bg-black/30 text-white/90 backdrop-blur transition-colors hover:bg-black/50">
                    <Settings className="size-4" />
                </Link>
            </div>

            <div className="relative px-5 pb-5 sm:px-7">
                <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-14 sm:flex-row sm:items-end">
                    <div className="rounded-full bg-background p-1.5">
                        <AccountAvatar id={u.id} name={u.name} size={96} frame={eq.frame} />
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                        {editing ? (
                            <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="flex items-center gap-2">
                                <input autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Display name" className="h-10 min-w-0 flex-1 rounded-xl border border-white/20 bg-black/30 px-3 font-minecraft text-base font-bold outline-none focus:border-[var(--mc-aqua)]" />
                                <button disabled={busy} aria-label="Save name" className="grid size-10 place-items-center rounded-xl bg-[var(--mc-aqua)] text-black disabled:opacity-60">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}</button>
                                <button type="button" onClick={() => { setEditing(false); setErr(null); }} aria-label="Cancel" className="grid size-10 place-items-center rounded-xl border border-white/15 hover:bg-white/10"><X className="size-4" /></button>
                            </form>
                        ) : (
                            <h1 className="flex items-center gap-2 text-2xl sm:text-3xl">
                                <NameTag user={u} />
                                <button type="button" onClick={() => { setName(u.name); setEditing(true); }} aria-label="Edit display name" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
                                    <Pencil className="size-4" />
                                </button>
                            </h1>
                        )}
                        {err && <p role="alert" className="mt-1 font-rubik text-xs text-[var(--mc-red)]">{err}</p>}

                        {/* Fractured Level tag: the game's own badge */}
                        {(s || fi) && (
                            <Tip tip={<TipCard title="Fractured Level" color="var(--mc-yellow)" lines={["Your account level in Fractured Idle. It grows as you unlock things across every system in the game."]} />}>
                                <div className="mt-1.5 inline-flex cursor-help items-center gap-2 rounded-xl bg-black/20 px-2.5 py-1" tabIndex={0}>
                                    <span className="font-minecraft text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fractured Idle</span>
                                    {s ? <LevelBadge level={s.lvl} sym={symbolOf(s)} prefix={prefixOf(s)} size="sm" /> : fi ? <FiLevelTag summary={fi} /> : null}
                                </div>
                            </Tip>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Chip>{u.provider === "google" ? "Signed in with Google" : "Email account"}</Chip>
                    <Chip>Member since {new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</Chip>
                    {s && (() => { const t = tierOf(s); return <Chip color={t.color}><McSymbol name={t.idx >= 3 ? "comet" : "speed"} /> {t.name}</Chip>; })()}
                    <span className="flex-1" />
                    <button type="button" onClick={() => onTab("customize")} className="rounded-xl border px-3 py-1.5 font-minecraft text-xs font-bold transition-colors hover:bg-white/10" style={{ color: accent, borderColor: tint(accent, 55) }}>
                        Customize
                    </button>
                </div>
            </div>
        </section>
    );
}

// ---------- overview ----------
function TitlesAndBadges({ s }: { s: State }) {
    const openP = PREFIXES.filter((p) => p.id !== "none" && prefixOpen(s, p)).length;
    const totalP = PREFIXES.length - 1;
    const openB = BADGE_SYMBOLS.filter((b) => b.id !== "none" && symbolOpen(s, b)).length;
    const totalB = BADGE_SYMBOLS.length - 1;
    return (
        <section className="rounded-2xl border border-white/12 bg-card/40 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-minecraft text-sm font-bold" style={{ color: "var(--mc-yellow)" }}><McSymbol name="pristine" /> Titles and badges</h2>
                <span className="font-rubik text-[11px] text-muted-foreground">{openP}/{totalP} titles · {openB}/{totalB} badges</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {PREFIXES.filter((p) => p.id !== "none").map((p) => {
                    const open = prefixOpen(s, p);
                    const color = p.color === "rainbow" ? "#ff8fd0" : p.color;
                    return (
                        <Tip key={p.id} tip={<TipCard title={p.name} color={color} tag={open ? "Unlocked" : "Locked"} lines={[p.need?.label ?? "Always available"]} />}>
                            <span tabIndex={0} className="cursor-help rounded-full border px-2.5 py-0.5 font-minecraft text-[11px] font-bold outline-none transition-transform hover:-translate-y-0.5" style={open ? { color, borderColor: tint(color, 55), backgroundColor: tint(color, 12), textShadow: `0 0 8px ${tint(color, 50)}` } : { color: "var(--muted-foreground)", borderColor: "rgba(255,255,255,0.1)", opacity: 0.55 }}>
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
                            <span tabIndex={0} className="grid size-8 cursor-help place-items-center rounded-lg border text-base outline-none transition-transform hover:-translate-y-0.5" style={open ? { color: "var(--mc-yellow)", borderColor: tint("var(--mc-yellow)", 45), backgroundColor: tint("var(--mc-yellow)", 10) } : { color: "var(--muted-foreground)", borderColor: "rgba(255,255,255,0.1)", opacity: 0.45 }}>
                                {open ? <McSymbol name={b.symbol as never} /> : <Lock className="size-3.5" />}
                            </span>
                        </Tip>
                    );
                })}
            </div>
        </section>
    );
}

function NextUnlocks({ u, onTab }: { u: Profile; onTab: (t: Tab) => void }) {
    const next = useMemo(
        () =>
            COSMETICS.filter((c) => c.need && !isUnlocked(c, u.games))
                .map((c) => ({ c, pct: Math.min(1, progressFor(c, u.games) / c.need!.n) }))
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 4),
        [u.games]
    );
    const total = COSMETICS.length;
    const have = COSMETICS.filter((c) => isUnlocked(c, u.games)).length;
    return (
        <section className="rounded-2xl border border-white/12 bg-card/40 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-minecraft text-sm font-bold" style={{ color: "var(--mc-green)" }}><McSymbol name="forge" /> Next unlocks</h2>
                <span className="font-rubik text-[11px] text-muted-foreground">{have}/{total} owned</span>
            </div>
            {next.length === 0 ? (
                <p className="font-rubik text-xs text-muted-foreground">Everything available so far is unlocked. New games will add more.</p>
            ) : (
                <ul className="space-y-2.5">
                    {next.map(({ c, pct }) => (
                        <li key={c.id}>
                            <button type="button" onClick={() => onTab("customize")} className="block w-full text-left">
                                <div className="flex items-center justify-between gap-2 font-rubik text-[11px]">
                                    <span className="truncate font-minecraft text-xs font-bold text-foreground">{c.name} <span className="font-rubik font-normal text-muted-foreground">· {COS_KINDS.find((k) => k.id === c.kind)?.label}</span></span>
                                    <span className="shrink-0 text-muted-foreground">{Math.floor(pct * 100)}%</span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: "var(--mc-green)", boxShadow: "0 0 8px var(--mc-green)" }} /></div>
                                <div className="mt-0.5 font-rubik text-[10.5px] text-muted-foreground">{c.need!.label}</div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ---------- the locker ----------
function Preview({ c, u }: { c: Cosmetic; u: Profile }) {
    if (c.kind === "symbol") return <span className="text-2xl" style={{ color: "var(--mc-aqua)" }}>{c.symbol ? <McSymbol name={c.symbol} /> : <span className="text-base text-muted-foreground">none</span>}</span>;
    if (c.kind === "banner") return <span className="block h-9 w-full rounded-lg border border-white/15" style={{ background: c.bg }} />;
    if (c.kind === "frame") return <AccountAvatar id={u.id} name={u.name} size={34} frame={c} />;
    return <span className="size-8 rounded-full border-2 border-white/30" style={{ background: c.color, boxShadow: `0 0 14px ${c.color}` }} />;
}

function Locker({ u }: { u: Profile }) {
    const eq = equippedOf(u.cosmetics);
    const [busy, setBusy] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const equip = async (c: Cosmetic) => {
        if (eq[c.kind].id === c.id) return;
        setBusy(c.id);
        setErr(null);
        const r = await equipCosmetics({ [c.kind]: c.id });
        setBusy(null);
        if (!r.ok) setErr(r.error ?? "Could not equip that.");
    };

    return (
        <div className="space-y-5">
            {err && <p role="alert" className="rounded-xl border border-[var(--mc-red)]/40 bg-[var(--mc-red)]/10 px-3 py-2 font-rubik text-xs text-[var(--mc-red)]">{err}</p>}
            {COS_KINDS.map((k) => {
                const list = ofKind(k.id as CosKind);
                const owned = list.filter((c) => isUnlocked(c, u.games)).length;
                return (
                    <section key={k.id} className="rounded-2xl border border-white/12 bg-card/40 p-4 backdrop-blur-xl">
                        <div className="mb-3 flex items-end justify-between gap-2">
                            <div>
                                <h2 className="flex items-center gap-2 font-minecraft text-sm font-bold text-foreground"><McSymbol name={k.symbol} color="var(--mc-aqua)" /> {k.label}</h2>
                                <p className="font-rubik text-[11px] text-muted-foreground">{k.blurb}</p>
                            </div>
                            <span className="shrink-0 font-rubik text-[11px] text-muted-foreground">{owned}/{list.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                            {list.map((c) => {
                                const open = isUnlocked(c, u.games);
                                const on = eq[c.kind].id === c.id;
                                const have = progressFor(c, u.games);
                                const pct = c.need ? Math.min(1, have / c.need.n) : 1;
                                const color = on ? "var(--mc-aqua)" : open ? "var(--mc-green)" : "var(--muted-foreground)";
                                return (
                                    <Tip
                                        key={c.id}
                                        box
                                        tip={
                                            <TipCard
                                                title={c.name}
                                                color={on ? "var(--mc-aqua)" : open ? "var(--mc-green)" : "var(--mc-gold)"}
                                                tag={on ? "Equipped" : open ? "Unlocked" : "Locked"}
                                                lines={[c.need ? `Unlocked in ${c.game === "fractured-idle" ? "Fractured Idle" : c.game}.` : "Free for everyone."]}
                                                rows={c.need ? [["Requires", c.need.label], ["Your progress", open ? "Done" : `${Math.floor(Math.min(have, c.need.n)).toLocaleString()} / ${c.need.n.toLocaleString()}`, open ? "var(--mc-green)" : "var(--mc-yellow)"]] : undefined}
                                                cta={open && !on ? "Click to equip!" : undefined}
                                            />
                                        }
                                    >
                                        <button type="button" disabled={!open || busy !== null} onClick={() => void equip(c)} aria-pressed={on} className="cos-card group w-full" data-on={on} data-open={open} style={{ ["--c" as string]: color } as CSSProperties}>
                                            <span className="grid h-11 w-full place-items-center">{busy === c.id ? <LoaderCircle className="size-5 animate-spin" /> : <Preview c={c} u={u} />}</span>
                                            <span className="mt-1.5 block truncate font-minecraft text-[11px] font-bold" style={{ color: open ? "var(--foreground)" : "var(--muted-foreground)" }}>{c.name}</span>
                                            {open ? (
                                                <span className="block font-rubik text-[10px]" style={{ color }}>{on ? "Equipped" : "Owned"}</span>
                                            ) : (
                                                <>
                                                    <span className="mt-0.5 flex items-center gap-1 font-rubik text-[10px] text-muted-foreground"><Lock className="size-3" /> {c.need!.label}</span>
                                                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full" style={{ width: `${pct * 100}%`, background: "var(--mc-gold)" }} /></span>
                                                </>
                                            )}
                                        </button>
                                    </Tip>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

// ---------- page ----------
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

    const eq = equippedOf(u.cosmetics);
    const accent = eq.accent.color ?? "#55ffff";
    const fiState = typeof cloud === "object" ? cloud.s : null;

    return (
        <TipProvider>
            <style>{TIP_CSS + LEVEL_CSS + PROFILE_CSS}</style>
            <div className="space-y-5">
                {welcome && <p className="rounded-xl border border-[var(--mc-green)]/40 bg-[var(--mc-green)]/10 px-4 py-2 font-rubik text-sm text-[var(--mc-green)]">You are signed in. Welcome!</p>}

                <Hero u={u} cloud={cloud} onTab={setTab} />

                <nav className="flex gap-1.5 rounded-2xl border border-white/10 bg-card/40 p-1.5 backdrop-blur-xl" aria-label="Profile sections">
                    {([["overview", "Overview", "wisdom"], ["customize", "Customize", "magicFind"]] as const).map(([id, label, sym]) => (
                        <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl font-minecraft text-xs font-bold transition-colors" style={tab === id ? { color: accent, backgroundColor: tint(accent, 16), boxShadow: `inset 0 0 0 1px ${tint(accent, 45)}` } : { color: "var(--muted-foreground)" }}>
                            <McSymbol name={sym} /> {label}
                        </button>
                    ))}
                </nav>

                {tab === "overview" ? (
                    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
                        <div className="space-y-5">
                            {cloud === "loading" && <p className="flex items-center gap-2 font-rubik text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" /> Loading your cloud save…</p>}
                            {cloud === "error" && <p className="font-rubik text-xs text-[var(--mc-red)]">Could not load the cloud save.</p>}
                            {cloud === "none" && (
                                <div className="rounded-2xl border border-dashed border-white/20 bg-card/30 p-6 text-center">
                                    <h2 className="font-minecraft text-base font-bold" style={{ color: "var(--mc-light-purple)" }}>Fractured Idle</h2>
                                    <p className="mt-1 font-rubik text-xs text-muted-foreground">No cloud save yet. Open the game while signed in and it uploads within a minute.</p>
                                    <Link href="/creations/games/fractured-idle" className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--mc-aqua)] px-4 font-minecraft text-xs font-bold text-black"><Play className="size-4" /> Play now</Link>
                                </div>
                            )}
                            {fiState && typeof cloud === "object" && (
                                <>
                                    <FracturedIdleBlock
                                        s={fiState}
                                        owner={`${u.name}'s run`}
                                        footer={
                                            <span className="flex items-center gap-3">
                                                <span>Saved {new Date(cloud.savedAt).toLocaleString()} from {cloud.device}</span>
                                                <Link href="/creations/games/fractured-idle" className="font-minecraft font-bold text-[var(--mc-aqua)] hover:underline">Play</Link>
                                            </span>
                                        }
                                    />
                                    <TitlesAndBadges s={fiState} />
                                </>
                            )}
                        </div>
                        <div className="space-y-5">
                            <NextUnlocks u={u} onTab={setTab} />
                            <section className="rounded-2xl border border-white/12 bg-card/40 p-4 backdrop-blur-xl">
                                <h2 className="mb-2 flex items-center gap-2 font-minecraft text-sm font-bold text-foreground"><McSymbol name="defense" color="var(--mc-green)" /> More games</h2>
                                <p className="font-rubik text-[11px] leading-relaxed text-muted-foreground">Every game that saves to your account gets its own card here, and its achievements unlock new symbols, banners, frames and colors for your profile.</p>
                                <Link href="/creations/games" className="mt-3 inline-block font-minecraft text-xs font-bold text-[var(--mc-aqua)] hover:underline">Browse all games</Link>
                            </section>
                        </div>
                    </div>
                ) : (
                    <Locker u={u} />
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Link href="/settings" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 font-rubik text-sm hover:bg-white/10"><Settings className="size-4" /> Settings</Link>
                    <button type="button" onClick={() => void signOut()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mc-red)]/60 px-4 font-rubik text-sm text-[var(--mc-red)] hover:bg-[var(--mc-red)]/10">Sign out</button>
                </div>
            </div>
        </TipProvider>
    );
}

const PROFILE_CSS = `
.cos-card{--c:var(--mc-aqua);display:block;padding:.6rem .55rem;border-radius:.9rem;text-align:left;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:color-mix(in oklch,var(--c) 6%,rgba(0,0,0,.18));transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s,background .15s;outline:none}
.cos-card[data-open="true"]:hover,.cos-card[data-open="true"]:focus-visible{transform:translateY(-2px);border-color:color-mix(in oklch,var(--c) 70%,transparent);box-shadow:0 10px 24px -14px var(--c)}
.cos-card[data-on="true"]{background:color-mix(in oklch,var(--mc-aqua) 14%,rgba(0,0,0,.2));box-shadow:0 0 0 1px var(--mc-aqua),0 0 22px -8px var(--mc-aqua)}
.cos-card[data-open="false"]{opacity:.7;cursor:not-allowed}
.cos-card:disabled{cursor:not-allowed}
.cos-card[data-open="true"]:disabled{cursor:default}
@media (prefers-reduced-motion:reduce){.cos-card{transition:none}}
`;

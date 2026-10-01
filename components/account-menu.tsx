"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronRight, LogIn, LogOut, Palette, Settings, UserPlus } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { McSymbol } from "@/components/mc-symbol";
import { NameTag } from "@/components/name-tag";
import { ThemeToggle } from "@/components/theme-toggle";
import { ensureAccount, signOut, useAccount } from "@/lib/account/client";
import { equippedOf } from "@/lib/account/cosmetics";

// The Fractured Level badge pulls in the game's code, so it is fetched only once the menu is open.
const FiLevelTag = dynamic(() => import("@/components/fi-level-tag"), { ssr: false });

// Top-right account menu, sitewide. Hover (or tap) the avatar to open it. Clicking your name or avatar goes
// to your profile. Signed out it is a person icon with Sign in / Create account. The theme switcher lives here.
export function AccountMenu() {
    const a = useAccount();
    const { resolvedTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        ensureAccount();
    }, []);

    useEffect(() => {
        if (!open) return;
        const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
        const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("pointerdown", away);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("pointerdown", away);
            document.removeEventListener("keydown", esc);
        };
    }, [open]);

    const hover = (on: boolean) => (e: React.PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(on), on ? 60 : 220);
    };

    const u = a.user;
    const eq = equippedOf(u?.cosmetics);
    const fi = u?.games["fractured-idle"];
    const close = () => setOpen(false);
    const item = "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-rubik text-sm text-foreground/90 transition-colors hover:bg-foreground/10";
    const icon = "grid size-7 shrink-0 place-items-center rounded-lg bg-foreground/[0.07] text-foreground/70 transition-colors group-hover:text-foreground";

    return (
        <div ref={root} className="fixed right-5 top-5 z-50" onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
            <style>{`@keyframes acct-menu-in{from{opacity:0;transform:translateY(-6px) scale(.97)}}.acct-menu{animation:acct-menu-in .16s cubic-bezier(.2,1.2,.4,1) both;transform-origin:top right}@media (prefers-reduced-motion:reduce){.acct-menu{animation:none}}`}</style>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={u ? `Account menu for ${u.name}` : "Account menu"}
                onClick={() => setOpen((o) => !o)}
                className="flex size-10 items-center justify-center rounded-full border border-border/50 bg-card/40 backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
            >
                <AccountAvatar id={u?.id} name={u?.name} size={30} frame={u ? eq.frame : undefined} />
            </button>

            {open && (
                <div className="absolute right-0 top-full pt-2">
                    <div role="menu" className="acct-menu w-72 rounded-2xl border border-border/60 bg-card/90 p-2 shadow-2xl backdrop-blur-2xl">
                        {u ? (
                            <Link role="menuitem" href="/profile" onClick={close} className="group block rounded-xl p-2.5 transition-colors hover:bg-foreground/[0.07]" style={{ background: `linear-gradient(120deg, color-mix(in oklch, ${eq.accent.color} 14%, transparent), transparent 70%)` }}>
                                <div className="flex items-center gap-3">
                                    <AccountAvatar id={u.id} name={u.name} size={46} frame={eq.frame} />
                                    <div className="min-w-0 flex-1">
                                        <NameTag user={u} className="text-[15px]" />
                                        <div className="truncate font-rubik text-[11px] text-muted-foreground">{u.email}</div>
                                    </div>
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                                </div>
                                {fi && typeof fi.level === "number" && (
                                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
                                        <span className="flex items-center gap-1.5 font-minecraft text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <McSymbol name="wisdom" color="var(--mc-light-purple)" /> Fractured Idle
                                        </span>
                                        <FiLevelTag summary={fi} />
                                    </div>
                                )}
                            </Link>
                        ) : (
                            <div className="px-3 py-2.5">
                                <div className="font-minecraft text-sm font-bold text-foreground">{a.email === undefined ? "Checking…" : "Not signed in"}</div>
                                <div className="font-rubik text-[11px] text-muted-foreground">An account saves your games across devices.</div>
                            </div>
                        )}

                        <div className="my-1.5 h-px bg-border/60" />

                        {u ? (
                            <>
                                <Link role="menuitem" href="/profile?tab=customize" onClick={close} className={item}>
                                    <span className={icon}><Palette className="size-4" /></span> Customize profile
                                </Link>
                                <Link role="menuitem" href="/creations/games/fractured-idle" onClick={close} className={item}>
                                    <span className={icon}><McSymbol name="wisdom" /></span> Play Fractured Idle
                                </Link>
                                <Link role="menuitem" href="/settings" onClick={close} className={item}>
                                    <span className={icon}><Settings className="size-4" /></span> Settings
                                </Link>
                            </>
                        ) : (
                            a.email === null && (
                                <>
                                    <Link role="menuitem" href="/account" onClick={close} className={item}>
                                        <span className={icon}><LogIn className="size-4" /></span> Sign in
                                    </Link>
                                    <Link role="menuitem" href="/account?mode=up" onClick={close} className={item}>
                                        <span className={icon}><UserPlus className="size-4" /></span> Create account
                                    </Link>
                                </>
                            )
                        )}

                        <div className="flex items-center justify-between rounded-xl px-3 py-1.5 font-rubik text-sm text-foreground/90 hover:bg-foreground/10">
                            <span className="flex items-center gap-3">
                                <span className={icon}><McSymbol name="night" /></span>
                                {resolvedTheme === "light" ? "Light theme" : "Dark theme"}
                            </span>
                            <ThemeToggle />
                        </div>

                        {u && (
                            <>
                                <div className="my-1.5 h-px bg-border/60" />
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        close();
                                        void signOut();
                                    }}
                                    className={`${item} text-[var(--mc-red)]`}
                                >
                                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--mc-red)]/10"><LogOut className="size-4" /></span> Sign out
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

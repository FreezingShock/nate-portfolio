"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { LogIn, LogOut, UserPlus, UserRound } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ensureAccount, signOut, useAccount } from "@/lib/account/client";

// Top-right account button, sitewide. Hover (or tap) the avatar for the menu: profile, theme, sign out.
// Signed out it is a person icon with Sign in / Create account. The theme switcher lives in here now.
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
    const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-rubik text-sm text-foreground/90 transition-colors hover:bg-foreground/10";

    return (
        <div ref={root} className="fixed right-5 top-5 z-50" onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={u ? `Account menu for ${u.name}` : "Account menu"}
                onClick={() => setOpen((o) => !o)}
                className="flex size-10 items-center justify-center rounded-full border border-border/50 bg-card/40 backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
            >
                <AccountAvatar id={u?.id} name={u?.name} size={30} />
            </button>

            {open && (
                <div className="absolute right-0 top-full pt-2">
                    <div role="menu" className="w-64 rounded-2xl border border-border/60 bg-card/85 p-2 shadow-2xl backdrop-blur-2xl">
                        {u ? (
                            <div className="flex items-center gap-3 px-3 py-2.5">
                                <AccountAvatar id={u.id} name={u.name} size={40} />
                                <div className="min-w-0">
                                    <div className="truncate font-minecraft text-sm text-foreground">{u.name}</div>
                                    <div className="truncate font-rubik text-[11px] text-muted-foreground">{u.email}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-3 py-2.5">
                                <div className="font-minecraft text-sm text-foreground">{a.email === undefined ? "Checking…" : "Not signed in"}</div>
                                <div className="font-rubik text-[11px] text-muted-foreground">An account saves your games across devices.</div>
                            </div>
                        )}
                        <div className="my-1 h-px bg-border/60" />
                        {u ? (
                            <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={item}>
                                <UserRound className="size-4" /> Profile
                            </Link>
                        ) : (
                            a.email === null && (
                                <>
                                    <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={item}>
                                        <LogIn className="size-4" /> Sign in
                                    </Link>
                                    <Link role="menuitem" href="/account?mode=up" onClick={() => setOpen(false)} className={item}>
                                        <UserPlus className="size-4" /> Create account
                                    </Link>
                                </>
                            )
                        )}
                        <div className="flex items-center justify-between rounded-xl px-3 py-1.5 font-rubik text-sm text-foreground/90 hover:bg-foreground/10">
                            <span>{resolvedTheme === "light" ? "Light theme" : "Dark theme"}</span>
                            <ThemeToggle />
                        </div>
                        {u && (
                            <>
                                <div className="my-1 h-px bg-border/60" />
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setOpen(false);
                                        void signOut();
                                    }}
                                    className={`${item} text-[var(--mc-red)]`}
                                >
                                    <LogOut className="size-4" /> Sign out
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

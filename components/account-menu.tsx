"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Check, ChevronRight, LogIn, LogOut, Palette, Settings, Share2, UserPlus, Users } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { NameTag } from "@/components/name-tag";
import { ThemeToggle } from "@/components/theme-toggle";
import { TIP_CSS, Tip, TipCard, TipProvider } from "@/components/games/fractured-idle/tooltip";
import { ensureAccount, signOut, useAccount } from "@/lib/account/client";
import { equippedOf } from "@/lib/account/cosmetics";
import { accentOf, customOf } from "@/lib/account/custom";

// The Fractured Level badge pulls in the game's code, so it is fetched only once the menu is open.
const FiLevelTag = dynamic(() => import("@/components/fi-level-tag"), { ssr: false });

// Top-right account menu, sitewide. Hover (or tap) the avatar to open it. Clicking your name or avatar goes
// to your profile. Signed out it is a person icon with Sign in / Create account. The theme switcher lives here.
// It speaks the same language as the Fractured Idle menus: the game's own tooltip (hover any row), the same
// bordered panel, and tiles that lift and glow in their color. It must stay light (it loads on every page), so
// it uses only the game's tooltip module, never the profile page's components.

function Row({ icon, color, label, hint, tip, href, onClick, danger }: { icon: ReactNode; color: string; label: string; hint?: string; tip: ReactNode; href?: string; onClick?: () => void; danger?: boolean }) {
    const inner = (
        <>
            <span className="am-i">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="am-l">{label}</span>
                {hint && <span className="am-h">{hint}</span>}
            </span>
            {!danger && <ChevronRight className="am-c size-3.5 shrink-0" />}
        </>
    );
    const style = { ["--c" as string]: color } as CSSProperties;
    return (
        <Tip box tip={tip}>
            {href ? (
                <Link role="menuitem" href={href} onClick={onClick} className="am-row" style={style}>{inner}</Link>
            ) : (
                <button type="button" role="menuitem" onClick={onClick} className="am-row" style={style}>{inner}</button>
            )}
        </Tip>
    );
}

export function AccountMenu() {
    const a = useAccount();
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
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
    const cu = customOf(u?.custom);
    const accent = u ? accentOf(u) : "#55ffff";
    const fi = u?.games["fractured-idle"];
    const close = () => setOpen(false);

    const share = () => {
        if (!u) return;
        if (!u.isPublic) {
            close();
            router.push("/profile?tab=customize");
            return;
        }
        void navigator.clipboard.writeText(`${window.location.origin}/u/${u.handle ?? u.id}`).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        });
    };

    return (
        <TipProvider>
            <style>{TIP_CSS + MENU_CSS}</style>
            <div ref={root} className="fixed right-5 top-5 z-50" onPointerEnter={hover(true)} onPointerLeave={hover(false)} style={{ ["--ac" as string]: accent } as CSSProperties}>
                <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label={u ? `Account menu for ${u.name}` : "Account menu"}
                    onClick={() => setOpen((o) => !o)}
                    className="flex size-10 items-center justify-center rounded-full border border-border/50 bg-card/40 backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
                    style={u ? { borderColor: `color-mix(in oklch, ${accent} 55%, transparent)`, boxShadow: `0 0 16px -6px ${accent}` } : undefined}
                >
                    <AccountAvatar id={u?.id} name={u?.name} size={30} frame={u ? eq.frame : undefined} avatar={u ? cu.avatar : undefined} />
                </button>

                {open && (
                    <div className="absolute right-0 top-full pt-2">
                        <div role="menu" className="am-panel">
                            {u ? (
                                <Tip box tip={<TipCard title="Your profile" color={accent} lines={["Open your profile: your look, stats and layout."]} cta="Click to open!" />}>
                                    <Link role="menuitem" href="/profile" onClick={close} className="am-head group">
                                        <div className="flex items-center gap-3">
                                            <AccountAvatar id={u.id} name={u.name} size={48} frame={eq.frame} avatar={cu.avatar} />
                                            <div className="min-w-0 flex-1">
                                                <NameTag user={u} className="text-[15px]" />
                                                <div className="truncate font-rubik text-[11px] text-muted-foreground">{cu.status || (u.handle ? `@${u.handle}` : u.email)}</div>
                                            </div>
                                            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                                        </div>
                                        {fi && typeof fi.level === "number" && (
                                            <div className="am-lvl">
                                                <span className="flex items-center gap-1.5 font-minecraft text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <McSymbol name="wisdom" color="var(--mc-light-purple)" /> Fractured Idle
                                                </span>
                                                <FiLevelTag summary={fi} />
                                            </div>
                                        )}
                                    </Link>
                                </Tip>
                            ) : (
                                <div className="px-3 py-2.5">
                                    <div className="font-minecraft text-sm font-bold text-foreground">{a.email === undefined ? "Checking…" : "Not signed in"}</div>
                                    <div className="font-rubik text-[11px] text-muted-foreground">An account saves your games across devices and gives you a profile to customize.</div>
                                </div>
                            )}

                            <div className="am-sep" />

                            {u ? (
                                <>
                                    <Row icon={<Palette className="size-4" />} color="var(--mc-light-purple)" label="Customize profile" hint="Picture, banner, layout" href="/profile?tab=customize" onClick={close} tip={<TipCard title="Customize profile" color="var(--mc-light-purple)" lines={["Change your picture, banner, colors, layout and equipped cosmetics."]} cta="Click to open!" />} />
                                    <Row
                                        icon={copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                                        color={u.isPublic ? "var(--mc-green)" : "var(--mc-gold)"}
                                        label={copied ? "Link copied" : u.isPublic ? "Share profile" : "Turn on sharing"}
                                        hint={u.isPublic ? `/u/${u.handle ?? "your-id"}` : "Profile is private"}
                                        onClick={share}
                                        tip={<TipCard title={u.isPublic ? "Share profile" : "Sharing is off"} color={u.isPublic ? "var(--mc-green)" : "var(--mc-gold)"} lines={[u.isPublic ? "Copies the link to your public profile." : "Only you can see your profile. Open Customize to make it public."]} cta={u.isPublic ? "Click to copy!" : "Click to open Customize!"} />}
                                    />
                                    <Row icon={<Users className="size-4" />} color="var(--mc-aqua)" label="Players" hint="Visit shared profiles" href="/u" onClick={close} tip={<TipCard title="Players" color="var(--mc-aqua)" lines={["Browse the profiles other players have shared."]} cta="Click to open!" />} />
                                    <Row icon={<McSymbol name="wisdom" />} color="var(--mc-yellow)" label="Play Fractured Idle" href="/creations/games/fractured-idle" onClick={close} tip={<TipCard title="Fractured Idle" color="var(--mc-yellow)" lines={["Jump back into the game. Your save follows your account."]} cta="Click to play!" />} />
                                    <Row icon={<Settings className="size-4" />} color="var(--mc-gray, #aaaaaa)" label="Settings" href="/settings" onClick={close} tip={<TipCard title="Settings" lines={["Theme, your saved data, sign-in details and account deletion."]} cta="Click to open!" />} />
                                </>
                            ) : (
                                a.email === null && (
                                    <>
                                        <Row icon={<LogIn className="size-4" />} color="var(--mc-aqua)" label="Sign in" href="/account" onClick={close} tip={<TipCard title="Sign in" color="var(--mc-aqua)" lines={["Get your saves, unlocks and profile back."]} cta="Click to sign in!" />} />
                                        <Row icon={<UserPlus className="size-4" />} color="var(--mc-green)" label="Create account" href="/account?mode=up" onClick={close} tip={<TipCard title="Create account" color="var(--mc-green)" lines={["Free. Saves your games across devices and unlocks a customizable profile."]} cta="Click to start!" />} />
                                        <Row icon={<Users className="size-4" />} color="var(--mc-light-purple)" label="Players" hint="Visit shared profiles" href="/u" onClick={close} tip={<TipCard title="Players" color="var(--mc-light-purple)" lines={["You can browse shared profiles without an account."]} cta="Click to open!" />} />
                                    </>
                                )
                            )}

                            <Tip box tip={<TipCard title="Theme" color="var(--mc-blue)" lines={["Switch between the light and dark site theme."]} />}>
                                <div className="am-row" style={{ ["--c" as string]: "var(--mc-blue)" } as CSSProperties}>
                                    <span className="am-i"><McSymbol name={"night" as McSymbolName} /></span>
                                    <span className="am-l flex-1">{resolvedTheme === "light" ? "Light theme" : "Dark theme"}</span>
                                    <ThemeToggle />
                                </div>
                            </Tip>

                            {u && (
                                <>
                                    <div className="am-sep" />
                                    <Row icon={<LogOut className="size-4" />} color="var(--mc-red)" label="Sign out" danger onClick={() => { close(); void signOut(); }} tip={<TipCard title="Sign out" color="var(--mc-red)" lines={["Your progress stays saved in your account."]} />} />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </TipProvider>
    );
}

const MENU_CSS = `
@keyframes am-in{from{opacity:0;transform:translateY(-6px) scale(.97)}}
.am-panel{width:18.5rem;padding:.5rem;border-radius:3px;background:#100010f2;backdrop-filter:blur(16px);transform-origin:top right;animation:am-in .16s cubic-bezier(.2,1.2,.4,1) both;box-shadow:0 0 0 2px #100010,0 0 0 4px color-mix(in oklch,var(--ac) 40%,#2a0a55),inset 0 0 0 2px color-mix(in oklch,var(--ac) 28%,transparent),0 12px 32px rgba(0,0,0,.55)}
.am-head{display:block;padding:.6rem;border-radius:.6rem;background:linear-gradient(120deg,color-mix(in oklch,var(--ac) 16%,transparent),transparent 75%);transition:background .15s}
.am-head:hover{background:linear-gradient(120deg,color-mix(in oklch,var(--ac) 26%,transparent),transparent 80%)}
.am-lvl{margin-top:.5rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem .6rem;border-radius:.55rem;background:rgba(0,0,0,.3)}
.am-sep{height:1px;margin:.35rem .2rem;background:rgba(255,255,255,.1)}
.am-row{--c:var(--mc-aqua);display:flex;width:100%;align-items:center;gap:.7rem;padding:.35rem .5rem;border-radius:.65rem;text-align:left;color:#e7e2f3;background:transparent;box-shadow:inset 0 0 0 1px transparent;transition:background .16s,box-shadow .16s,transform .14s cubic-bezier(.2,1.5,.4,1);outline:none;cursor:pointer}
.am-row:hover,.am-row:focus-visible{background:color-mix(in oklch,var(--c) 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 45%,transparent),0 3px 12px -6px var(--c);transform:translateX(2px)}
.am-row:active{transform:scale(.97)}
.am-i{display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:.6rem;font-size:1rem;color:var(--c);background:color-mix(in oklch,var(--c) 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 28%,transparent);transition:transform .22s cubic-bezier(.2,1.7,.4,1)}
.am-row:hover .am-i{transform:scale(1.12) rotate(-5deg)}
.am-l{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-minecraft,inherit);font-size:.78rem;font-weight:700}
.am-h{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.62rem;color:#a59fb8}
.am-c{color:#7e7894;transition:transform .15s,color .15s}
.am-row:hover .am-c{transform:translateX(2px);color:#fff}
@media (prefers-reduced-motion:reduce){.am-panel{animation:none}.am-row,.am-i{transition:none}}
`;

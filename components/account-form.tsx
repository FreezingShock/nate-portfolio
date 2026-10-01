"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, AtSign, Check, Eye, EyeOff, KeyRound, LoaderCircle, Mail, RefreshCw } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { ShineBorder } from "@/components/ui/shine-border";
import { GAME_MODES } from "@/lib/creations-data";
import { pollConfirmed, refreshAccount, resendLink, signIn, signOut, signUp, startGoogle, useAccount } from "@/lib/account/client";

// The account screen for the whole site: sign in, create an account, or continue with Google, plus what an
// account does and which games it already works with. After sign-up it waits on the email link, polling so
// the screen advances by itself, with a resend button. All the styling follows Fractured Idle: Minecraft font
// in bold, colored glyph badges, tinted borders.

const POLL_MS = 5000;
const POLL_FOR_MS = 10 * 60 * 1000;
const RESEND_S = 60;
/** Games whose progress is saved to the account today (see lib/account/games.ts). Others show "account sync soon". */
const CLOUD_GAMES = new Set(["fractured-idle"]);

const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;

const strength = (p: string) => {
    let n = 0;
    if (p.length >= 8) n++;
    if (p.length >= 12) n++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) n++;
    return n;
};
const STRENGTH = [
    ["Too short", "var(--mc-red)"],
    ["Weak", "var(--mc-red)"],
    ["Okay", "var(--mc-gold)"],
    ["Good", "var(--mc-green)"],
    ["Strong", "var(--mc-aqua)"],
] as const;

const PERKS: { symbol: McSymbolName; color: string; title: string; text: string }[] = [
    { symbol: "portal", color: "var(--mc-aqua)", title: "Play anywhere", text: "Start on your laptop, keep going on your phone. The same save follows you to any browser." },
    { symbol: "defense", color: "var(--mc-green)", title: "Never lose progress", text: "Saves sync every minute and when you leave. The device that is further along wins, and older versions are kept as backups." },
    { symbol: "trueDefense", color: "var(--mc-gold)", title: "Private by design", text: "Sign-in is handled by Supabase Auth and your session lives in a secure cookie. Only your email, display name and game saves are stored." },
    { symbol: "magicFind", color: "var(--mc-light-purple)", title: "One account, every game", text: "Your profile is shared across the whole site. New games plug in and show up on your profile automatically." },
];

function Glyph({ symbol, color, size = 40 }: { symbol: McSymbolName; color: string; size?: number }) {
    return (
        <span
            className="grid shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
            style={{ width: size, height: size, fontSize: size * 0.5, color, backgroundColor: tint(color, 16), boxShadow: `inset 0 0 0 1px ${tint(color, 38)}` }}
        >
            <McSymbol name={symbol} />
        </span>
    );
}

function GoogleMark() {
    return (
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3A12 12 0 1 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.7-.4-3.9z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
        </svg>
    );
}

function Field({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            {children}
        </div>
    );
}

function PasswordInput({ value, onChange, placeholder, autoComplete, id }: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string; id: string }) {
    const [show, setShow] = useState(false);
    return (
        <Field icon={KeyRound}>
            <input id={id} className="acct-in acct-in-ip" type={show ? "text" : "password"} required minLength={8} maxLength={128} placeholder={placeholder} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </Field>
    );
}

// Every game you can play today, in the color of its category, with whether its progress is saved to the account.
const PLAYABLE = GAME_MODES.flatMap((m) => m.games.filter((g) => g.status === "playable" && g.href).map((g) => ({ ...g, color: m.color, symbol: m.symbol })));
const COMING = GAME_MODES.flatMap((m) => m.games.filter((g) => g.status !== "playable"));

export function AccountForm() {
    const a = useAccount();
    const [mode, setMode] = useState<"in" | "up">("in");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [gBusy, setGBusy] = useState(false);
    // Waiting on the email link (credentials stay in memory only, for the poll).
    const [wait, setWait] = useState<{ email: string; pw: string; since: number } | null>(null);
    const [checking, setChecking] = useState(false);
    const [cool, setCool] = useState(0);
    const [info, setInfo] = useState<string | null>(null);
    const [stale, setStale] = useState(false);
    const inflight = useRef(false);
    const stage = useRef<HTMLDivElement>(null);

    useEffect(() => {
        void refreshAccount();
        const q = new URLSearchParams(window.location.search);
        if (q.get("error") === "google") setErr("Google sign-in did not finish. Try again.");
        if (q.get("mode") === "up") setMode("up");
    }, []);

    // A soft spotlight that follows the pointer across the whole card.
    const onMove = (e: React.PointerEvent) => {
        const el = stage.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    const check = useCallback(async () => {
        if (!wait || inflight.current) return;
        inflight.current = true;
        setChecking(true);
        const r = await pollConfirmed(wait.email, wait.pw);
        setChecking(false);
        inflight.current = false;
        if (r.confirmed) setWait(null);
        else if (r.error) setInfo(r.error);
    }, [wait]);

    useEffect(() => {
        if (!wait) return;
        setStale(false);
        const h = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            if (Date.now() - wait.since > POLL_FOR_MS) {
                setStale(true);
                clearInterval(h);
                return;
            }
            void check();
        }, POLL_MS);
        return () => clearInterval(h);
    }, [wait, check]);

    useEffect(() => {
        if (cool <= 0) return;
        const h = setTimeout(() => setCool((c) => c - 1), 1000);
        return () => clearTimeout(h);
    }, [cool]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setInfo(null);
        if (mode === "up" && pw !== pw2) return setErr("Passwords do not match.");
        setBusy(true);
        const r = mode === "up" ? await signUp(email, pw) : await signIn(email, pw);
        setBusy(false);
        if (!r.ok) {
            if (mode === "in" && /confirm your email/i.test(r.error ?? "")) {
                setWait({ email: email.trim().toLowerCase(), pw, since: Date.now() });
                setCool(0);
                return;
            }
            return setErr(r.error ?? "Something went wrong.");
        }
        if ("confirm" in r && r.confirm) {
            setWait({ email: email.trim().toLowerCase(), pw, since: Date.now() });
            setCool(RESEND_S);
        }
        setPw("");
        setPw2("");
    };

    const resend = async () => {
        if (!wait || cool > 0) return;
        setInfo(null);
        const r = await resendLink(wait.email);
        if (r.ok) {
            setInfo("Sent. Check your inbox and spam folder.");
            setCool(RESEND_S);
        } else setInfo(r.error ?? "Could not send.");
    };

    const google = async () => {
        setErr(null);
        setGBusy(true);
        const e = await startGoogle();
        if (e) {
            setErr(e);
            setGBusy(false);
        }
    };

    const s = strength(pw);
    const u = a.user;

    return (
        <div className="acct pointer-events-auto mx-auto w-full max-w-5xl px-4">
            <style>{ACCT_CSS}</style>

            {/* Header */}
            <header className="mb-6 text-center sm:mb-8">
                <div className="acct-ink inline-flex items-center gap-2 rounded-full border px-3 py-1 font-minecraft text-[11px] font-bold uppercase tracking-[0.18em]" style={{ ["--c" as string]: "var(--mc-aqua)", borderColor: tint("var(--mc-aqua)", 40), backgroundColor: tint("var(--mc-aqua)", 10) }}>
                    <McSymbol name="speed" /> nateanderson.dev account
                </div>
                <h1 className="acct-title mt-3 font-minecraft text-3xl font-bold leading-tight sm:text-5xl">
                    One account.<br className="sm:hidden" /> Every game.
                </h1>
                <p className="mx-auto mt-3 max-w-xl font-rubik text-sm text-muted-foreground">
                    Keep your progress in the cloud and pick it up on any device. It works across everything you can play on this site, and new games join automatically.
                </p>
            </header>

            <div ref={stage} onPointerMove={onMove} className="acct-stage grid gap-5 lg:grid-cols-[1.1fr_1fr]">
                {/* What it does + games */}
                <section className="order-2 space-y-5 lg:order-1">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {PERKS.map((p) => (
                            <div key={p.title} className="acct-card group" style={{ ["--c" as string]: p.color } as CSSProperties}>
                                <div className="flex items-center gap-3">
                                    <Glyph symbol={p.symbol} color={p.color} />
                                    <h2 className="acct-ink font-minecraft text-sm font-bold" style={{ ["--c" as string]: p.color } as CSSProperties}>{p.title}</h2>
                                </div>
                                <p className="mt-2 font-rubik text-[11.5px] leading-relaxed text-muted-foreground">{p.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="acct-card" style={{ ["--c" as string]: "var(--mc-light-purple)" } as CSSProperties}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="acct-ink flex items-center gap-2 font-minecraft text-sm font-bold" style={{ ["--c" as string]: "var(--mc-light-purple)" } as CSSProperties}>
                                <McSymbol name="wisdom" /> Playable now
                            </h2>
                            <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint("var(--mc-green)", 45), color: "var(--mc-green)" }}>
                                {PLAYABLE.length} games
                            </span>
                        </div>
                        <ul className="space-y-1.5">
                            {PLAYABLE.map((g) => {
                                const cloud = CLOUD_GAMES.has(g.slug);
                                return (
                                    <li key={g.slug}>
                                        <Link href={g.href!} className="acct-row group" style={{ ["--c" as string]: g.color } as CSSProperties}>
                                            <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ color: g.color, backgroundColor: tint(g.color, 16), boxShadow: `inset 0 0 0 1px ${tint(g.color, 35)}` }}>
                                                <g.icon className="size-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="acct-ink block truncate font-minecraft text-[13px] font-bold" style={{ ["--c" as string]: g.color } as CSSProperties}>{g.title}</span>
                                                <span className="block truncate font-rubik text-[11px] text-muted-foreground">{g.features.join(" · ")}</span>
                                            </span>
                                            <span
                                                className="hidden shrink-0 rounded-full border px-2 py-0.5 font-rubik text-[10px] sm:inline"
                                                style={cloud ? { color: "var(--mc-green)", borderColor: tint("var(--mc-green)", 45), backgroundColor: tint("var(--mc-green)", 10) } : { color: "var(--muted-foreground)", borderColor: "rgba(255,255,255,0.14)" }}
                                            >
                                                {cloud ? "Cloud saves" : "Account sync soon"}
                                            </span>
                                            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-3 font-rubik text-[11px] text-muted-foreground">
                            Coming next: {COMING.slice(0, 4).map((g) => g.title).join(", ")}
                            {COMING.length > 4 ? ` and ${COMING.length - 4} more` : ""}.
                        </p>
                    </div>
                </section>

                {/* Sign in / create account */}
                <section className="order-1 lg:order-2">
                    <div className="acct-auth relative overflow-hidden rounded-3xl border border-white/15 bg-card/55 p-5 backdrop-blur-xl sm:p-6">
                        <ShineBorder shineColor={["#a855f7", "#55ffff", "#ff55ff", "#ffaa00"]} borderWidth={1.5} duration={10} />
                        <div className="relative">
                            {a.email === undefined ? (
                                <p className="flex items-center gap-2 py-10 font-rubik text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Checking…</p>
                            ) : a.email && u ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <AccountAvatar id={u.id} name={u.name} size={60} avatar={u.custom.avatar} />
                                        <div className="min-w-0">
                                            <div className="font-rubik text-[11px] uppercase tracking-wide text-muted-foreground">Signed in</div>
                                            <h2 className="truncate font-minecraft text-xl font-bold text-foreground">{u.name}</h2>
                                            <p className="truncate font-rubik text-xs text-[var(--mc-green)]">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Link href="/profile" className="acct-primary">Open profile <ArrowRight className="size-4" /></Link>
                                        <Link href="/creations/games/fractured-idle" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 font-rubik text-sm transition-colors hover:bg-white/10">
                                            <McSymbol name="wisdom" color="var(--mc-light-purple)" /> Play Fractured Idle
                                        </Link>
                                        <button type="button" onClick={() => void signOut()} className="h-10 rounded-xl border font-rubik text-sm transition-colors hover:bg-[var(--mc-red)]/10" style={{ color: "var(--mc-red)", borderColor: tint("var(--mc-red)", 55) }}>
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            ) : wait ? (
                                <div className="space-y-4">
                                    <div className="relative grid size-14 place-items-center rounded-2xl" style={{ color: "var(--mc-aqua)", backgroundColor: tint("var(--mc-aqua)", 14), boxShadow: `inset 0 0 0 1px ${tint("var(--mc-aqua)", 38)}` }}>
                                        <Mail className="size-7" />
                                        {!stale && <span className="absolute -right-1 -top-1 size-3 animate-ping rounded-full bg-[var(--mc-aqua)]" />}
                                    </div>
                                    <div>
                                        <h2 className="font-minecraft text-xl font-bold text-foreground">Check your email</h2>
                                        <p className="mt-1 font-rubik text-xs text-muted-foreground">We sent a link to <b className="break-all text-foreground">{wait.email}</b>. Click it and this page signs you in on its own.</p>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-rubik text-xs text-muted-foreground" aria-live="polite">
                                        {stale ? <>Paused. Press Check now once you have clicked the link.</> : <><LoaderCircle className="size-3.5 animate-spin text-[var(--mc-aqua)]" /> Waiting for you to confirm…</>}
                                    </div>
                                    {info && <p className="font-rubik text-xs text-[var(--mc-gold)]" role="status">{info}</p>}
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <button type="button" onClick={() => void check()} disabled={checking} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 font-rubik text-sm hover:bg-white/10 disabled:opacity-60">
                                            <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} /> Check now
                                        </button>
                                        <button type="button" onClick={() => void resend()} disabled={cool > 0} className="acct-primary disabled:opacity-50">
                                            {cool > 0 ? `Resend in ${cool}s` : "Send link again"}
                                        </button>
                                    </div>
                                    <button type="button" onClick={() => { setWait(null); setPw(""); setPw2(""); setInfo(null); }} className="font-rubik text-xs text-muted-foreground underline-offset-2 hover:underline">Use a different email</button>
                                </div>
                            ) : (
                                <form onSubmit={submit} className="space-y-3.5">
                                    <div>
                                        <h2 className="font-minecraft text-2xl font-bold text-foreground">{mode === "up" ? "Create your account" : "Welcome back"}</h2>
                                        <p className="mt-0.5 font-rubik text-xs text-muted-foreground">{mode === "up" ? "Takes about a minute. No spam, ever." : "Sign in to load your cloud saves."}</p>
                                    </div>

                                    <button type="button" onClick={() => void google()} disabled={gBusy} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white font-rubik text-sm font-medium text-neutral-800 transition-transform hover:scale-[1.015] active:scale-[0.98] disabled:opacity-70">
                                        {gBusy ? <LoaderCircle className="size-5 animate-spin" /> : <GoogleMark />} Continue with Google
                                    </button>
                                    <div className="flex items-center gap-3 font-rubik text-[11px] text-muted-foreground"><span className="h-px flex-1 bg-white/10" />or with email<span className="h-px flex-1 bg-white/10" /></div>

                                    <div className="acct-tabs relative grid grid-cols-2 rounded-xl border border-white/10 p-1" data-mode={mode}>
                                        <span aria-hidden className="acct-pill" />
                                        {(["in", "up"] as const).map((m) => (
                                            <button key={m} type="button" onClick={() => { setMode(m); setErr(null); }} aria-pressed={mode === m} className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-lg font-minecraft text-xs font-bold transition-colors ${mode === m ? "text-[var(--mc-aqua)]" : "text-muted-foreground hover:text-foreground"}`}>
                                                <McSymbol name={m === "in" ? "portal" : "star"} /> {m === "in" ? "Sign in" : "Create account"}
                                            </button>
                                        ))}
                                    </div>

                                    <Field icon={AtSign}>
                                        <input className="acct-in acct-in-i" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </Field>
                                    <PasswordInput id="acct-pw" value={pw} onChange={setPw} placeholder="Password (8+ characters)" autoComplete={mode === "up" ? "new-password" : "current-password"} />
                                    {mode === "up" && (
                                        <>
                                            <div aria-live="polite">
                                                <div className="flex gap-1">
                                                    {[0, 1, 2, 3].map((i) => (
                                                        <span key={i} className="h-1 flex-1 rounded-full bg-white/10 transition-colors" style={i < s ? { background: STRENGTH[s][1] } : undefined} />
                                                    ))}
                                                </div>
                                                {pw && <p className="mt-1 font-rubik text-[11px]" style={{ color: STRENGTH[s][1] }}>{STRENGTH[s][0]}</p>}
                                            </div>
                                            <PasswordInput id="acct-pw2" value={pw2} onChange={setPw2} placeholder="Repeat password" autoComplete="new-password" />
                                            {pw2 && pw !== pw2 && <p className="font-rubik text-[11px] text-[var(--mc-red)]">Passwords do not match yet.</p>}
                                        </>
                                    )}
                                    {err && <p role="alert" className="rounded-lg border border-[var(--mc-red)]/40 bg-[var(--mc-red)]/10 px-3 py-2 font-rubik text-xs text-[var(--mc-red)]">{err}</p>}
                                    <button disabled={busy} className="acct-primary w-full">
                                        {busy && <LoaderCircle className="size-4 animate-spin" />}
                                        {mode === "up" ? "Create account" : "Sign in"}
                                        {!busy && <Check className="size-4" />}
                                    </button>
                                    <p className="text-center font-rubik text-[10.5px] text-muted-foreground">Your session stays on this device in a secure cookie. Nothing sensitive is kept in the browser.</p>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

const ACCT_CSS = `
.acct-title{background:linear-gradient(100deg,#c084fc 0%,#55ffff 35%,#ff55ff 65%,#ffaa00 100%);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% 100%;animation:acct-shift 9s ease-in-out infinite alternate}
@keyframes acct-shift{to{background-position:100% 0}}
.acct-stage{position:relative;--mx:50%;--my:30%}
.acct-stage::before{content:"";position:absolute;inset:-1rem;pointer-events:none;border-radius:2rem;background:radial-gradient(420px circle at var(--mx) var(--my),color-mix(in oklch,var(--mc-aqua) 9%,transparent),transparent 70%);z-index:0}
.acct-stage>*{position:relative;z-index:1}
.acct-card{--c:var(--mc-aqua);border-radius:1.1rem;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:color-mix(in oklch,var(--c) 5%,var(--card));background-color:color-mix(in oklch,var(--c) 6%,transparent);backdrop-filter:blur(14px);padding:1rem;transition:transform .2s cubic-bezier(.2,1.4,.4,1),box-shadow .25s,border-color .2s}
.acct-card:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--c) 55%,transparent);box-shadow:0 10px 30px -14px var(--c)}
.acct-row{--c:var(--mc-aqua);display:flex;align-items:center;gap:.7rem;padding:.5rem .6rem;border-radius:.8rem;border:1px solid transparent;transition:background .15s,border-color .15s,transform .15s}
.acct-row:hover{background:color-mix(in oklch,var(--c) 10%,transparent);border-color:color-mix(in oklch,var(--c) 40%,transparent);transform:translateX(2px)}
.acct-in{height:2.75rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.3);padding:0 .8rem;font-family:var(--font-rubik,inherit);font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s}
.acct-ink{color:var(--c)}
html:not(.dark) .acct-ink{color:color-mix(in oklch,var(--c) 52%,#000)}
html:not(.dark) .acct-in{background:rgba(255,255,255,.75);border-color:rgba(0,0,0,.18)}
html:not(.dark) .acct-card{background-color:color-mix(in oklch,var(--c) 9%,rgba(255,255,255,.55))}
html:not(.dark) .acct-title{filter:saturate(1.2) brightness(.78)}
.acct-in-i{padding-left:2.5rem}
.acct-in-ip{padding-left:2.5rem;padding-right:2.75rem}
.acct-in:focus{border-color:var(--mc-aqua);box-shadow:0 0 0 3px color-mix(in oklch,var(--mc-aqua) 22%,transparent)}
.acct-primary{display:flex;height:2.75rem;align-items:center;justify-content:center;gap:.5rem;border-radius:.75rem;padding:0 1rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.85rem;color:#05161a;background:linear-gradient(180deg,#8ffcff,#3fdede);box-shadow:0 6px 20px -8px var(--mc-aqua);transition:transform .12s,filter .15s,box-shadow .2s}
.acct-primary:hover:not(:disabled){filter:brightness(1.07);box-shadow:0 8px 26px -6px var(--mc-aqua)}
.acct-primary:active:not(:disabled){transform:scale(.97)}
.acct-primary:disabled{cursor:default}
.acct-tabs .acct-pill{position:absolute;top:.25rem;bottom:.25rem;left:.25rem;width:calc(50% - .25rem);border-radius:.55rem;background:color-mix(in oklch,var(--mc-aqua) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--mc-aqua) 45%,transparent);transition:transform .28s cubic-bezier(.3,1.3,.5,1)}
.acct-tabs[data-mode="up"] .acct-pill{transform:translateX(100%)}
@media (prefers-reduced-motion:reduce){.acct *,.acct-title{animation:none!important;transition:none!important}}
`;

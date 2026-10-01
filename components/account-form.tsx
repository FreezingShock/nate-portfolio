"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Cloud, Eye, EyeOff, LoaderCircle, Mail, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { pollConfirmed, refreshAccount, resendLink, signIn, signOut, signUp, startGoogle, useAccount } from "@/lib/account/client";

// Account screen for Fractured Idle cloud saves: sign in, create an account, or continue with Google.
// After sign-up it waits on the email link, polling so the screen advances by itself, with a resend button.

const POLL_MS = 5000;
const POLL_FOR_MS = 10 * 60 * 1000;
const RESEND_S = 60;

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

function Google() {
    return (
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3A12 12 0 1 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.7-.4-3.9z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
        </svg>
    );
}

function PasswordInput({ value, onChange, placeholder, autoComplete, id }: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string; id: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input id={id} className="acct-in pr-11" type={show ? "text" : "password"} required minLength={8} maxLength={128} placeholder={placeholder} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
}

const PERKS = [
    { icon: Cloud, t: "Play anywhere", d: "Your save follows you to any browser or device." },
    { icon: RefreshCw, t: "Syncs by itself", d: "Uploads every minute while you play." },
    { icon: ShieldCheck, t: "Never loses progress", d: "The further-along save always wins." },
];

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

    useEffect(() => {
        void refreshAccount();
        const q = new URLSearchParams(window.location.search);
        if (q.get("error") === "google") setErr("Google sign-in did not finish. Try again.");
        if (q.get("mode") === "up") setMode("up");
    }, []);

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

    return (
        <div className="acct pointer-events-auto mx-auto grid w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-card/40 backdrop-blur-xl md:grid-cols-[1fr_1.1fr]">
            <style>{ACCT_CSS}</style>

            <aside className="acct-side relative hidden flex-col justify-between gap-6 overflow-hidden p-7 md:flex">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-aqua)]/40 bg-[var(--mc-aqua)]/10 px-3 py-1 font-rubik text-[11px] text-[var(--mc-aqua)]">
                        <Sparkles className="size-3.5" /> Fractured Idle
                    </div>
                    <h1 className="mt-4 font-minecraft text-2xl leading-tight text-foreground">Save your shards in the cloud</h1>
                    <p className="mt-2 font-rubik text-xs text-muted-foreground">An account does one thing: it keeps your idle game progress safe and moves it between devices.</p>
                </div>
                <ul className="space-y-3">
                    {PERKS.map((p) => (
                        <li key={p.t} className="flex gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-black/25 text-[var(--mc-aqua)]"><p.icon className="size-4" /></span>
                            <span>
                                <b className="block font-minecraft text-sm text-foreground">{p.t}</b>
                                <span className="font-rubik text-[11px] text-muted-foreground">{p.d}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </aside>

            <div className="p-6 sm:p-7">
                {a.email === undefined ? (
                    <p className="flex items-center gap-2 font-rubik text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Checking…</p>
                ) : a.email ? (
                    <div className="space-y-4">
                        <div className="grid size-12 place-items-center rounded-2xl bg-[var(--mc-green)]/15 text-[var(--mc-green)]"><Check className="size-6" /></div>
                        <div>
                            <h2 className="font-minecraft text-xl text-foreground">You are signed in</h2>
                            <p className="mt-1 break-all font-rubik text-sm text-[var(--mc-green)]">{a.email}</p>
                        </div>
                        <p className="font-rubik text-xs text-muted-foreground">Your games sync automatically while you are signed in.</p>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/profile" className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--mc-aqua)] px-3 font-minecraft text-sm font-bold text-black">Open profile</Link>
                            <Link href="/creations/games/fractured-idle" className="flex h-11 items-center justify-center rounded-xl border border-white/15 px-4 font-rubik text-sm hover:bg-white/10">Play</Link>
                            <button type="button" onClick={() => void signOut()} className="h-11 rounded-xl border border-[var(--mc-red)]/60 px-4 font-rubik text-sm text-[var(--mc-red)] hover:bg-[var(--mc-red)]/10">Sign out</button>
                        </div>
                    </div>
                ) : wait ? (
                    <div className="space-y-4">
                        <div className="relative grid size-14 place-items-center rounded-2xl bg-[var(--mc-aqua)]/15 text-[var(--mc-aqua)]">
                            <Mail className="size-7" />
                            {!stale && <span className="absolute -right-1 -top-1 size-3 animate-ping rounded-full bg-[var(--mc-aqua)]" />}
                        </div>
                        <div>
                            <h2 className="font-minecraft text-xl text-foreground">Check your email</h2>
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
                            <button type="button" onClick={() => void resend()} disabled={cool > 0} className="h-11 rounded-xl bg-[var(--mc-aqua)] font-minecraft text-sm font-bold text-black disabled:opacity-50">
                                {cool > 0 ? `Resend in ${cool}s` : "Send link again"}
                            </button>
                        </div>
                        <button type="button" onClick={() => { setWait(null); setPw(""); setPw2(""); setInfo(null); }} className="font-rubik text-xs text-muted-foreground underline-offset-2 hover:underline">Use a different email</button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-3.5">
                        <div>
                            <h2 className="font-minecraft text-xl text-foreground">{mode === "up" ? "Create your account" : "Welcome back"}</h2>
                            <p className="mt-0.5 font-rubik text-xs text-muted-foreground">{mode === "up" ? "Takes about a minute." : "Sign in to load your cloud save."}</p>
                        </div>

                        <button type="button" onClick={() => void google()} disabled={gBusy} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white font-rubik text-sm font-medium text-neutral-800 transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70">
                            {gBusy ? <LoaderCircle className="size-5 animate-spin" /> : <Google />} Continue with Google
                        </button>
                        <div className="flex items-center gap-3 font-rubik text-[11px] text-muted-foreground"><span className="h-px flex-1 bg-white/10" />or with email<span className="h-px flex-1 bg-white/10" /></div>

                        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 p-1">
                            {(["in", "up"] as const).map((m) => (
                                <button key={m} type="button" onClick={() => { setMode(m); setErr(null); }} aria-pressed={mode === m} className={`h-9 rounded-lg font-rubik text-sm transition-colors ${mode === m ? "bg-[var(--mc-aqua)]/20 text-[var(--mc-aqua)]" : "text-muted-foreground hover:bg-white/5"}`}>
                                    {m === "in" ? "Sign in" : "Create account"}
                                </button>
                            ))}
                        </div>

                        <input className="acct-in" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                        <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mc-aqua)] font-minecraft text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-60">
                            {busy && <LoaderCircle className="size-4 animate-spin" />}
                            {mode === "up" ? "Create account" : "Sign in"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

const ACCT_CSS = `
.acct-in{height:2.75rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.3);padding:0 .8rem;font-family:var(--font-rubik,inherit);font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s}
.acct-in:focus{border-color:var(--mc-aqua);box-shadow:0 0 0 3px color-mix(in oklch,var(--mc-aqua) 22%,transparent)}
.acct-side{background:radial-gradient(120% 90% at 0% 0%,color-mix(in oklch,var(--mc-aqua) 16%,transparent),transparent 60%),radial-gradient(90% 80% at 100% 100%,color-mix(in oklch,var(--mc-light-purple) 14%,transparent),transparent 60%);border-right:1px solid rgba(255,255,255,.1)}
@media (prefers-reduced-motion:reduce){.acct *{animation:none!important}}
`;

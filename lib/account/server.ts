import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cleanCustom, cleanHandle } from "@/lib/account/custom";
import { clientIp, makeLimiter, sameOrigin } from "@/lib/gate/limit";

// Accounts exist only to move idle-game progress between devices. Supabase Auth does the real work
// (password hashing, email, tokens). Its tokens are kept in HttpOnly cookies set by these routes, never
// in localStorage, so page scripts (and the console) can never read them. Saves are reached with the
// user's own token, so the row-level-security policies on idle_saves are what actually protect the data.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const AT = "acct_at";
const RT = "acct_rt";
const RT_AGE = 60 * 60 * 24 * 60;

export const noStore = { "cache-control": "no-store" };
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

export const anon = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const asUser = (token: string) =>
    createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${token}` } } });

type Sess = { access_token: string; refresh_token: string; expires_in: number };
export async function setSession(s: Sess) {
    const c = await cookies();
    const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    c.set(AT, s.access_token, { ...base, maxAge: Math.max(60, s.expires_in) });
    c.set(RT, s.refresh_token, { ...base, maxAge: RT_AGE });
}
export async function clearSession() {
    const c = await cookies();
    c.delete(AT);
    c.delete(RT);
}

/** The signed-in user and a client acting as them, refreshing the session when it has aged out. */
export async function currentUser(): Promise<{ user: User; db: SupabaseClient } | null> {
    const c = await cookies();
    let at = c.get(AT)?.value;
    const rt = c.get(RT)?.value;
    if (at) {
        const { data, error } = await anon().auth.getUser(at);
        if (!error && data.user) return { user: data.user, db: asUser(at) };
    }
    if (!rt) return null;
    const { data, error } = await anon().auth.refreshSession({ refresh_token: rt });
    if (error || !data.session || !data.user) {
        await clearSession();
        return null;
    }
    at = data.session.access_token;
    await setSession(data.session);
    return { user: data.user, db: asUser(at) };
}

/** Guards every mutating account request: same origin only. */
export const originOk = (req: Request) => sameOrigin(req);

const limiter = makeLimiter(10, 10 * 60 * 1000);
export const authLimit = {
    blocked: (req: Request) => limiter.blocked(clientIp(req)),
    fail: (req: Request) => limiter.fail(clientIp(req)),
    clear: (req: Request) => limiter.clear(clientIp(req)),
};

export const validEmail = (e: unknown): e is string => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const validPassword = (p: unknown): p is string => typeof p === "string" && p.length >= 8 && p.length <= 128;

/** Supabase error text is fine to show for sign-up; for sign-in it stays generic so emails cannot be probed. */
export const slow = () => new Promise((r) => setTimeout(r, 500));

// ---- Profile: a display name per user (the avatar is generated from the user id, nothing is stored) ----
export const cleanName = (s: string) => s.replace(/[^\p{L}\p{N} _.'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 24);

function defaultName(user: User): string {
    const m = user.user_metadata ?? {};
    return cleanName(String(m.full_name ?? m.name ?? "")) || cleanName((user.email ?? "").split("@")[0]) || "Player";
}

/** A game's summary as stored: a flat object of numbers and short ids. Anything else is dropped. */
export function cleanSummary(v: unknown): Record<string, number | string> {
    const out: Record<string, number | string> = {};
    if (!v || typeof v !== "object" || Array.isArray(v)) return out;
    for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 24)) {
        if (!/^[a-zA-Z]{1,20}$/.test(k)) continue;
        if (typeof x === "number" && Number.isFinite(x)) out[k] = Math.max(-1e300, Math.min(1e300, x));
        else if (typeof x === "string" && /^[a-zA-Z0-9_-]{0,30}$/.test(x)) out[k] = x;
    }
    return out;
}

/** The player's reported summary for every game that has a cloud save. */
export async function summariesOf(a: { user: User; db: SupabaseClient }): Promise<Record<string, Record<string, number | string>>> {
    const { data } = await a.db.from("idle_saves").select("game,summary").eq("user_id", a.user.id);
    const out: Record<string, Record<string, number | string>> = {};
    for (const r of data ?? []) out[r.game as string] = cleanSummary(r.summary);
    return out;
}

/** Give a profile its link name: the display name squeezed into handle form, with digits added if it is taken. */
async function claimHandle(a: { user: User; db: SupabaseClient }, name: string): Promise<string | null> {
    let base = cleanHandle(name).slice(0, 16);
    if (base.length < 3) base = "player";
    for (let i = 0; i < 6; i++) {
        const h = i === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
        const { error } = await a.db.from("profiles").update({ handle: h }).eq("user_id", a.user.id).is("handle", null);
        if (!error) return h;
        if (error.code !== "23505") return null;
    }
    return null;
}

/** The signed-in user as the site shows it, creating their profile row (and its link) on first sight. */
export async function profileOf(a: { user: User; db: SupabaseClient }) {
    const { data } = await a.db.from("profiles").select("display_name,cosmetics,handle,bio,is_public,custom").eq("user_id", a.user.id).maybeSingle();
    let name = data?.display_name as string | undefined;
    if (!name) {
        name = defaultName(a.user);
        await a.db.from("profiles").upsert({ user_id: a.user.id, display_name: name });
    }
    let handle = (data?.handle as string | null | undefined) ?? null;
    if (!handle) handle = await claimHandle(a, name);
    return {
        id: a.user.id,
        email: a.user.email ?? null,
        name,
        provider: a.user.app_metadata?.provider === "google" ? "google" : "email",
        createdAt: a.user.created_at,
        cosmetics: (data?.cosmetics as Record<string, string> | undefined) ?? {},
        handle,
        bio: (data?.bio as string | undefined) ?? "",
        isPublic: data?.is_public === true,
        custom: cleanCustom(data?.custom),
        games: await summariesOf(a),
    };
}

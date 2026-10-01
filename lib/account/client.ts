"use client";

import { useSyncExternalStore } from "react";

// Browser side of the account system. It holds no tokens at all: the session lives in HttpOnly
// cookies the server manages, so all this ever knows is the signed-in email (kept in memory only).

export interface AccountState {
    /** undefined while checking, null when signed out. */
    email: string | null | undefined;
    busy: boolean;
    lastSync: number | null;
    error: string | null;
}

let state: AccountState = { email: undefined, busy: false, lastSync: null, error: null };
const subs = new Set<() => void>();
const set = (p: Partial<AccountState>) => {
    state = { ...state, ...p };
    subs.forEach((f) => f());
};
export const useAccount = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state, () => state);

async function call(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
    try {
        const r = await fetch(path, { credentials: "same-origin", ...init, headers: { "content-type": "application/json", ...init?.headers } });
        return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
    } catch {
        return { ok: false, status: 0, body: { error: "Network error" } };
    }
}
const post = (path: string, body?: unknown) => call(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export async function refreshAccount(): Promise<string | null> {
    const r = await call("/api/account/me");
    const email = ((r.body.user as { email?: string } | null)?.email ?? null) as string | null;
    set({ email });
    return email;
}

export async function signUp(email: string, password: string) {
    const r = await post("/api/account/signup", { email, password });
    if (r.ok && !r.body.confirm) await refreshAccount();
    return { ok: r.ok, confirm: !!r.body.confirm, error: (r.body.error as string) ?? null };
}
export async function signIn(email: string, password: string) {
    const r = await post("/api/account/signin", { email, password });
    if (r.ok) await refreshAccount();
    return { ok: r.ok, error: (r.body.error as string) ?? null };
}
/** Ask for the confirmation email again. */
export async function resendLink(email: string) {
    const r = await post("/api/account/resend", { email });
    return { ok: r.ok, error: (r.body.error as string) ?? null };
}
/** One poll while waiting for the email link: signs in the moment the address is confirmed. */
export async function pollConfirmed(email: string, password: string): Promise<{ confirmed: boolean; error: string | null }> {
    const r = await post("/api/account/poll", { email, password });
    if (r.ok && r.body.confirmed) {
        await refreshAccount();
        return { confirmed: true, error: null };
    }
    return { confirmed: false, error: r.ok ? null : ((r.body.error as string) ?? "Could not check") };
}
/** Redirects to Google; returns an error string when it could not start. */
export async function startGoogle(): Promise<string | null> {
    const r = await post("/api/account/google");
    if (r.ok && typeof r.body.url === "string") {
        window.location.assign(r.body.url);
        return null;
    }
    return (r.body.error as string) ?? "Could not start Google sign-in.";
}

export async function signOut() {
    await post("/api/account/signout");
    set({ email: null, lastSync: null, error: null });
}

export interface CloudSave {
    data: string;
    progress: number;
    savedAt: number;
}
export async function fetchSave(game: string): Promise<{ save: CloudSave | null; error: string | null }> {
    set({ busy: true });
    const r = await call(`/api/account/save?game=${encodeURIComponent(game)}`);
    set({ busy: false });
    if (r.status === 401) set({ email: null });
    if (!r.ok) return { save: null, error: (r.body.error as string) ?? "Could not load" };
    return { save: (r.body.save as CloudSave | null) ?? null, error: null };
}
export async function putSave(game: string, data: string, progress: number, savedAt: number): Promise<boolean> {
    set({ busy: true });
    const r = await call("/api/account/save", { method: "PUT", body: JSON.stringify({ game, data, progress, savedAt }) });
    set({ busy: false, error: r.ok ? null : ((r.body.error as string) ?? "Could not save"), lastSync: r.ok ? Date.now() : state.lastSync });
    if (r.status === 401) set({ email: null });
    return r.ok;
}

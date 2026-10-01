"use client";

import { useSyncExternalStore } from "react";
import type { Equipped, GameSummaries, GameSummary } from "@/lib/account/cosmetics";

// Browser side of the account system. It holds no tokens at all: the session lives in HttpOnly
// cookies the server manages, so all this ever knows is the signed-in email (kept in memory only).

export interface Profile {
    id: string;
    email: string | null;
    name: string;
    provider: "google" | "email";
    createdAt: string;
    /** What the player has equipped (see lib/account/cosmetics.ts). */
    cosmetics: Equipped;
    /** Per-game summary numbers reported with each cloud save (level, rebirths, ...). */
    games: GameSummaries;
}

export interface AccountState {
    /** undefined while checking, null when signed out. */
    email: string | null | undefined;
    user: Profile | null;
    busy: boolean;
    lastSync: number | null;
    error: string | null;
}

let state: AccountState = { email: undefined, user: null, busy: false, lastSync: null, error: null };
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
    const user = (r.body.user as Profile | null) ?? null;
    set({ email: user?.email ?? null, user });
    return user?.email ?? null;
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
    set({ email: null, user: null, lastSync: null, error: null });
}

export interface CloudSave {
    data: string;
    progress: number;
    savedAt: number;
    /** Revision of the stored save; send it back as baseRev so a stale device cannot overwrite a newer one. */
    rev: number;
    /** Bumped by every deliberate overwrite (import, restore, reset); devices on an older epoch must yield to the cloud. */
    epoch: number;
    /** Which device wrote it last (a readable label). */
    device: string;
    updatedAt: string;
}
export async function fetchSave(game: string): Promise<{ save: CloudSave | null; error: string | null }> {
    set({ busy: true });
    const r = await call(`/api/account/save?game=${encodeURIComponent(game)}`);
    set({ busy: false });
    if (r.status === 401) set({ email: null, user: null });
    if (!r.ok) return { save: null, error: (r.body.error as string) ?? "Could not load" };
    return { save: (r.body.save as CloudSave | null) ?? null, error: null };
}
/** The version the latest save replaced (one step of history). */
export async function fetchPrevSave(game: string): Promise<{ data: string; progress: number; savedAt: number } | null> {
    const r = await call(`/api/account/save?game=${encodeURIComponent(game)}&prev=1`);
    return r.ok ? ((r.body.save as { data: string; progress: number; savedAt: number } | null) ?? null) : null;
}

export type PutResult = { ok: true; rev: number; epoch: number } | { ok: false; conflict: "rev" | "lower" | "missing" } | { ok: false; conflict?: undefined; error: string };
export async function putSave(game: string, data: string, progress: number, savedAt: number, opts: { baseRev: number | null; device: string; force?: boolean; summary?: GameSummary }): Promise<PutResult> {
    set({ busy: true });
    const r = await call("/api/account/save", { method: "PUT", body: JSON.stringify({ game, data, progress, savedAt, baseRev: opts.baseRev, device: opts.device, force: opts.force === true, summary: opts.summary }) });
    if (r.ok) {
        set({ busy: false, error: null, lastSync: Date.now() });
        return { ok: true, rev: Number(r.body.rev), epoch: Number(r.body.epoch ?? 0) };
    }
    set({ busy: false });
    if (r.status === 401) set({ email: null, user: null });
    if (r.status === 409) return { ok: false, conflict: (r.body.conflict as "rev" | "lower" | "missing") ?? "rev" };
    const error = (r.body.error as string) ?? "Could not save";
    set({ error });
    return { ok: false, error };
}
export async function updateProfile(patch: { name?: string; cosmetics?: Equipped }): Promise<{ ok: boolean; error: string | null }> {
    const r = await call("/api/account/profile", { method: "PUT", body: JSON.stringify(patch) });
    if (r.ok && state.user) {
        set({ user: { ...state.user, name: (r.body.name as string) ?? state.user.name, cosmetics: (r.body.cosmetics as Equipped | undefined) ?? state.user.cosmetics } });
    }
    return { ok: r.ok, error: (r.body.error as string) ?? null };
}
export const renameProfile = (name: string) => updateProfile({ name });
export const equipCosmetics = (cosmetics: Equipped) => updateProfile({ cosmetics });

export async function deleteAccount(confirm: string): Promise<{ ok: boolean; error: string | null }> {
    const r = await post("/api/account/delete", { confirm });
    if (r.ok) set({ email: null, user: null, lastSync: null, error: null });
    return { ok: r.ok, error: (r.body.error as string) ?? null };
}

let started = false;
/** Check the session once per page load, whichever component asks first. */
export function ensureAccount() {
    if (started) return;
    started = true;
    void refreshAccount();
}

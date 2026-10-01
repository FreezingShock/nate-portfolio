"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";
import { Cloud, CloudDownload, CloudUpload, History, RefreshCw, Undo2 } from "lucide-react";
import { fetchPrevSave, fetchSave, putSave, refreshAccount, signOut, useAccount, type CloudSave } from "@/lib/account/client";
import type { State } from "@/lib/fractured-idle/data";
import { exportSave, importSave, settleOffline } from "@/lib/fractured-idle/engine";
import { fiSummary } from "@/lib/fractured-idle/summary";
import { ActionBtn } from "./ui";

// Cloud save for Fractured Idle, built so several devices can share one account safely.
//
// The rules (the server enforces them too, see app/api/account/save/route.ts):
//  1. One device is never trusted blindly. Every upload names the revision it last saw. If another device
//     saved since, the upload is refused and this device re-checks instead of overwriting.
//  2. When two saves disagree, the one further along wins (ascensions, then rebirths, then lifetime shards).
//     Progress only moves forward, so "further along" is the safe default.
//  3. Nothing is silently destroyed: before this device's state is replaced by a cloud save, it is kept as a
//     local backup, and the server keeps the version it replaced (one step back).
//  4. Deliberate actions (Import, Restore, Hard reset) are forced uploads. They bump the cloud epoch, and a device
//     that last synced at an older epoch yields to the cloud even if it is further along, so another device
//     cannot undo a rollback. ("Further along wins" only applies within the same epoch.)
//  5. A save pulled from the cloud is credited for the time since it was saved, like a normal load.
const GAME = "fractured-idle";
const EVERY_MS = 60_000;
const DEVICE_KEY = "fi-device";
const BACKUP_KEY = "fractured-idle-backup";
const EPOCH_KEY = "fi-cloud-epoch";

/** One comparable number for "how far along": ascensions, then rebirths, then lifetime shards. */
export const progressOf = (s: State) => s.asc * 1e9 + s.rebirths * 1e6 + Math.log10(Math.max(1, s.total)) * 1e3;

/** A readable name for this browser, so a conflict can say where the other save came from. */
export function deviceLabel(): string {
    let id = "";
    try {
        id = localStorage.getItem(DEVICE_KEY) ?? "";
        if (!id) {
            id = Math.random().toString(36).slice(2, 5);
            localStorage.setItem(DEVICE_KEY, id);
        }
    } catch {
        id = "x";
    }
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
    const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "device";
    return `${browser} on ${os} #${id}`;
}

export const agoText = (t: number) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 90) return "just now";
    if (s < 5400) return `${Math.round(s / 60)} min ago`;
    if (s < 129600) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} days ago`;
};

// ---- local backups of whatever a cloud save replaced (the last few, newest first) ----
export interface Backup {
    at: number;
    code: string;
    progress: number;
}
const MAX_BACKUPS = 5;
export function readBackups(): Backup[] {
    try {
        const raw = localStorage.getItem(BACKUP_KEY);
        const v = raw ? JSON.parse(raw) : [];
        return Array.isArray(v) ? (v as Backup[]) : [v as Backup]; // older builds kept a single object
    } catch {
        return [];
    }
}
/** Keep this state as a local backup (also used right before a hard reset). */
export function keepBackup(s: State) {
    writeBackup(s);
}
function writeBackup(s: State) {
    const progress = progressOf(s);
    if (s.total < 50) return; // a brand-new game is not worth keeping
    const list = readBackups().filter((b) => Math.abs(b.progress - progress) > 0.5);
    list.unshift({ at: Date.now(), code: exportSave(s), progress });
    try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, MAX_BACKUPS)));
    } catch {
        /* storage full or blocked */
    }
}

// ---- the sync engine (module state: one per tab) ----
let baseRev: number | null = null; // the cloud revision this tab last saw
/** The epoch this device last synced at, remembered across reloads (null: never synced, so only progress decides). */
const lastEpoch = (): number | null => {
    try {
        const v = localStorage.getItem(EPOCH_KEY);
        return v === null ? null : Number(v);
    } catch {
        return null;
    }
};
const setEpoch = (n: number) => {
    try {
        localStorage.setItem(EPOCH_KEY, String(n));
    } catch {
        /* storage blocked */
    }
};
let forced = false; // the next upload is a deliberate overwrite (Import / Restore)
let running = false;

export type Outcome =
    | { kind: "pushed" }
    | { kind: "pulled"; from: string; ago: string; progress: number; reason: "ahead" | "replaced" }
    | { kind: "error"; message: string }
    | { kind: "busy" };

/** Forget what this tab knew about the cloud (sign-out, hard reset). */
export function resetSyncSession() {
    baseRev = null;
    forced = false;
    try {
        localStorage.removeItem(EPOCH_KEY);
    } catch {
        /* storage blocked */
    }
}
/** Mark the next upload as deliberate, so it replaces the cloud save even if it is behind. */
export function forceNextPush() {
    forced = true;
}
/** Hard reset while signed in: overwrite the cloud with the fresh game (a forced upload), so other devices yield to it
 *  instead of bringing their old progress back. Their own state is kept as a local backup on each of them. */
export async function overwriteCloud(fresh: State): Promise<boolean> {
    const r = await putSave(GAME, exportSave(fresh), progressOf(fresh), Date.now(), { baseRev, device: deviceLabel(), force: true, summary: fiSummary(fresh) });
    if (!r.ok) return false;
    baseRev = r.rev;
    setEpoch(r.epoch);
    forced = false;
    return true;
}

type Apply = (n: State) => void;

function pull(save: CloudSave, local: State, apply: Apply): Outcome | null {
    const cloud = importSave(save.data);
    if (!cloud) return null;
    const reason = save.progress > progressOf(local) ? "ahead" : "replaced";
    writeBackup(local);
    settleOffline(cloud);
    apply(cloud);
    baseRev = save.rev;
    setEpoch(save.epoch);
    return { kind: "pulled", from: save.device, ago: agoText(save.savedAt), progress: save.progress, reason };
}

/** Should this device give way to the cloud save? Yes if it is further along there, or the cloud was deliberately overwritten since. */
const cloudWins = (save: CloudSave, local: State) => {
    if (forced) return false;
    const mine = lastEpoch();
    return save.progress > progressOf(local) || (mine !== null && save.epoch > mine);
};

const push = (s: State, force: boolean) => putSave(GAME, exportSave(s), progressOf(s), Date.now(), { baseRev, device: deviceLabel(), force, summary: fiSummary(s) });

export async function syncNow(get: () => State | null, apply: Apply): Promise<Outcome> {
    if (running) return { kind: "busy" };
    running = true;
    try {
        for (let attempt = 0; attempt < 4; attempt++) {
            const local = get();
            if (!local) return { kind: "error", message: "No game loaded" };

            // First contact this session: look before writing, and let the save further along win.
            if (baseRev === null) {
                const { save, error } = await fetchSave(GAME);
                if (error) return { kind: "error", message: error };
                if (save) {
                    if (cloudWins(save, local)) {
                        const out = pull(save, local, apply);
                        if (out) return out;
                    }
                    baseRev = save.rev;
                    if (lastEpoch() === null) setEpoch(save.epoch);
                }
            }

            const r = await push(local, forced);
            if (r.ok) {
                baseRev = r.rev;
                setEpoch(r.epoch);
                forced = false;
                return { kind: "pushed" };
            }
            if (!r.conflict) return { kind: "error", message: r.error };

            // Someone else saved (or the save was reset). Re-read, then decide who is further along.
            const { save, error } = await fetchSave(GAME);
            if (error) return { kind: "error", message: error };
            if (!save) {
                baseRev = null; // reset elsewhere: just write ours fresh
                continue;
            }
            if (cloudWins(save, local)) {
                const out = pull(save, local, apply);
                if (out) return out;
            }
            baseRev = save.rev; // this tab is at least as far along: take the new revision and write again
        }
        return { kind: "error", message: "Too many conflicting saves. Try again in a moment." };
    } finally {
        running = false;
    }
}

// What the last replacement was, kept so the Settings panel can still say so after the 3-second popup is gone
// (or if the player turned popup messages off).
const EVENT_KEY = "fi-sync-event";
export function readSyncEvent(): { at: number; text: string } | null {
    try {
        const raw = localStorage.getItem(EVENT_KEY);
        return raw ? (JSON.parse(raw) as { at: number; text: string }) : null;
    } catch {
        return null;
    }
}
function announce(out: Outcome, say: (m: string) => void) {
    if (out.kind !== "pulled") return;
    const why = out.reason === "ahead" ? "it was further along" : "it was deliberately replaced there (import, restore or reset)";
    const text = `Loaded the save from ${out.from} (${out.ago}) because ${why}. Your previous state is kept as a local backup.`;
    try {
        localStorage.setItem(EVENT_KEY, JSON.stringify({ at: Date.now(), text }));
    } catch {
        /* storage blocked */
    }
    say(text);
}

export function useCloudSync(ref: MutableRefObject<State | null>, ready: boolean, replaceState: (n: State) => void, say: (m: string) => void) {
    const a = useAccount();
    const email = a.email;
    const keep = useRef({ replaceState, say });
    keep.current = { replaceState, say };

    useEffect(() => {
        if (ready) void refreshAccount();
    }, [ready]);

    // Forget the cloud only on a confirmed sign-out. While the account is still being checked (undefined) the
    // remembered epoch must survive, or a reload would forget that the cloud was deliberately overwritten.
    useEffect(() => {
        if (email === null) resetSyncSession();
    }, [email]);

    // Sign-in (or load while signed in): reconcile once, then keep syncing.
    useEffect(() => {
        if (!ready || !email) return;
        let dead = false;
        const run = async () => {
            const out = await syncNow(() => ref.current, (n) => keep.current.replaceState(n));
            if (!dead) announce(out, keep.current.say);
        };
        void run();
        const h = setInterval(() => document.visibilityState === "visible" && void run(), EVERY_MS);
        // Leaving the tab: push right away so the other device sees the latest.
        const onHide = () => document.visibilityState === "hidden" && void run();
        document.addEventListener("visibilitychange", onHide);
        return () => {
            dead = true;
            clearInterval(h);
            document.removeEventListener("visibilitychange", onHide);
        };
    }, [ready, email, ref]);
}

/** Settings panel section. */
export function CloudPanel({ s, say, replaceState }: { s: State; say: (m: string) => void; replaceState: (n: State) => void }) {
    const a = useAccount();
    const [cloud, setCloud] = useState<CloudSave | null | undefined>(undefined);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [event, setEvent] = useState<{ at: number; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const email = a.email;
    const lastSync = a.lastSync;

    useEffect(() => {
        setBackups(readBackups());
        setEvent(readSyncEvent());
        if (!email) return;
        let dead = false;
        fetchSave(GAME).then(({ save }) => !dead && setCloud(save));
        return () => {
            dead = true;
        };
    }, [email, lastSync]);

    if (email === undefined) return <p className="font-rubik text-[11px] text-muted-foreground">Checking account…</p>;
    if (!email)
        return (
            <div className="space-y-2">
                <p className="font-rubik text-[11px] text-muted-foreground">Sign in to keep this save on every device. It uploads automatically, and if two devices disagree, the one further along wins.</p>
                <Link href="/account" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--mc-aqua)]/60 px-3 font-rubik text-xs text-[var(--mc-aqua)] hover:bg-[var(--mc-aqua)]/10">
                    <Cloud className="size-4" /> Sign in or create account
                </Link>
                {backups.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {backups.slice(0, 3).map((b) => (
                            <ActionBtn
                                key={b.at}
                                icon={<Undo2 className="size-4" />}
                                onClick={() => {
                                    const n = importSave(b.code);
                                    if (!n || !window.confirm(`Replace the game on this device with your local backup from ${agoText(b.at)}?`)) return;
                                    writeBackup(s);
                                    replaceState(n);
                                    say("Backup restored.");
                                }}
                            >
                                Backup {agoText(b.at)}
                            </ActionBtn>
                        ))}
                    </div>
                )}
            </div>
        );

    const sync = async () => {
        setBusy(true);
        const out = await syncNow(() => s, replaceState);
        setBusy(false);
        if (out.kind === "pushed") say("Synced with your account.");
        else if (out.kind === "pulled") {
            announce(out, say);
            setEvent(readSyncEvent());
        }
        else if (out.kind === "error") say(`Sync failed: ${out.message}`);
    };

    const restore = (code: string, what: string, overwrite: boolean) => {
        const n = importSave(code);
        if (!n) return say("That save could not be read.");
        if (!window.confirm(`Replace the game on this device with ${what}?${overwrite ? " It will also replace the cloud save, and your other devices will switch to it." : ""}`)) return;
        writeBackup(s);
        if (overwrite) forceNextPush();
        replaceState(n);
        say(overwrite ? `Restored ${what}. It uploads on the next sync.` : `Loaded ${what}.`);
    };

    return (
        <div className="space-y-2">
            <p className="font-rubik text-[11px] text-muted-foreground">
                Signed in as <b className="text-[var(--mc-green)]">{email}</b>. {a.error ? <span className="text-[var(--mc-red)]">{a.error}</span> : lastSync ? `Last synced ${new Date(lastSync).toLocaleTimeString()}.` : "Syncs every minute."}
            </p>
            <p className="font-rubik text-[11px] text-muted-foreground">
                This device: <b className="text-foreground">{deviceLabel()}</b>.{" "}
                {cloud === undefined ? "" : cloud ? <>Cloud copy saved by <b className="text-foreground">{cloud.device}</b>, {agoText(cloud.savedAt)}.</> : "No cloud copy yet."}
            </p>
            {event && (
                <p className="rounded-lg border border-[var(--mc-gold)]/40 bg-[var(--mc-gold)]/10 px-2.5 py-1.5 font-rubik text-[11px] text-[var(--mc-gold)]">
                    {agoText(event.at)}: {event.text}
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                <ActionBtn icon={<RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />} onClick={sync}>Sync now</ActionBtn>
                <ActionBtn
                    icon={<CloudDownload className="size-4" />}
                    onClick={async () => {
                        const { save, error } = await fetchSave(GAME);
                        if (!save) return say(error ?? "No cloud save yet.");
                        restore(save.data, `the cloud save from ${save.device}`, false);
                    }}
                >
                    Load cloud save
                </ActionBtn>
                <ActionBtn
                    icon={<CloudUpload className="size-4" />}
                    onClick={() => {
                        if (!window.confirm("Overwrite your cloud save with this device? Other devices will pick it up.")) return;
                        forceNextPush();
                        void sync();
                    }}
                >
                    Overwrite cloud
                </ActionBtn>
                <ActionBtn
                    icon={<History className="size-4" />}
                    onClick={async () => {
                        const p = await fetchPrevSave(GAME);
                        if (!p) return say("There is no earlier cloud version yet.");
                        restore(p.data, `the earlier cloud version (${agoText(p.savedAt)})`, true);
                    }}
                >
                    Earlier cloud version
                </ActionBtn>
                {backups.slice(0, 3).map((b) => (
                    <ActionBtn key={b.at} icon={<Undo2 className="size-4" />} onClick={() => restore(b.code, `your local backup from ${agoText(b.at)}`, true)}>
                        Backup {agoText(b.at)}
                    </ActionBtn>
                ))}
                <ActionBtn icon={<Cloud className="size-4" />} danger onClick={() => void signOut()}>Sign out</ActionBtn>
            </div>
        </div>
    );
}

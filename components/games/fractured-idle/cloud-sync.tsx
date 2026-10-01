"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import Link from "next/link";
import { Cloud, CloudDownload, CloudUpload } from "lucide-react";
import { fetchSave, putSave, refreshAccount, signOut, useAccount } from "@/lib/account/client";
import type { State } from "@/lib/fractured-idle/data";
import { exportSave, importSave } from "@/lib/fractured-idle/engine";
import { ActionBtn } from "./ui";

// Cloud save for Fractured Idle. Progress is compared so a stale device can never overwrite a
// better save by accident: on load the higher-progress side wins, then it uploads every minute.
const GAME = "fractured-idle";
const EVERY_MS = 60_000;

/** One comparable number for "how far along": ascensions, then rebirths, then lifetime shards. */
export const progressOf = (s: State) => s.asc * 1e9 + s.rebirths * 1e6 + Math.log10(Math.max(1, s.total)) * 1e3;

export async function pushCloud(s: State): Promise<boolean> {
    return putSave(GAME, exportSave(s), progressOf(s), Date.now());
}

export function useCloudSync(ref: MutableRefObject<State | null>, ready: boolean, replaceState: (n: State) => void, say: (m: string) => void) {
    const a = useAccount();
    const lastPushed = useRef(0);
    const email = a.email;
    const keep = useRef({ replaceState, say });
    keep.current = { replaceState, say };

    useEffect(() => {
        if (ready) void refreshAccount();
    }, [ready]);

    // On sign-in (or load while signed in): the better save wins.
    useEffect(() => {
        if (!ready || !email) return;
        let dead = false;
        (async () => {
            const { save } = await fetchSave(GAME);
            const s = ref.current;
            if (dead || !s) return;
            if (!save) return void (await pushCloud(s));
            const cloud = importSave(save.data);
            if (cloud && progressOf(cloud) > progressOf(s)) {
                keep.current.replaceState(cloud);
                keep.current.say("Loaded your cloud save (it was further along).");
            } else await pushCloud(s);
            lastPushed.current = Date.now();
        })();
        return () => {
            dead = true;
        };
    }, [ready, email, ref]);

    useEffect(() => {
        if (!ready || !email) return;
        const h = setInterval(() => {
            const s = ref.current;
            if (s && document.visibilityState === "visible") void pushCloud(s).then((ok) => ok && (lastPushed.current = Date.now()));
        }, EVERY_MS);
        return () => clearInterval(h);
    }, [ready, email, ref]);
}

/** Settings panel section. */
export function CloudPanel({ s, say, replaceState }: { s: State; say: (m: string) => void; replaceState: (n: State) => void }) {
    const a = useAccount();
    if (a.email === undefined) return <p className="font-rubik text-[11px] text-muted-foreground">Checking account…</p>;
    if (!a.email)
        return (
            <div className="space-y-2">
                <p className="font-rubik text-[11px] text-muted-foreground">Sign in to keep this save on every device. Your progress uploads automatically and the further-along save always wins.</p>
                <Link href="/account" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--mc-aqua)]/60 px-3 font-rubik text-xs text-[var(--mc-aqua)] hover:bg-[var(--mc-aqua)]/10">
                    <Cloud className="size-4" /> Sign in or create account
                </Link>
            </div>
        );
    return (
        <div className="space-y-2">
            <p className="font-rubik text-[11px] text-muted-foreground">
                Signed in as <b className="text-[var(--mc-green)]">{a.email}</b>. {a.error ? <span className="text-[var(--mc-red)]">{a.error}</span> : a.lastSync ? `Last synced ${new Date(a.lastSync).toLocaleTimeString()}.` : "Syncs every minute."}
            </p>
            <div className="flex flex-wrap gap-2">
                <ActionBtn icon={<CloudUpload className="size-4" />} onClick={async () => say((await pushCloud(s)) ? "Uploaded to your account." : "Upload failed.")}>Upload now</ActionBtn>
                <ActionBtn
                    icon={<CloudDownload className="size-4" />}
                    onClick={async () => {
                        const { save, error } = await fetchSave(GAME);
                        const n = save && importSave(save.data);
                        if (!n) return say(error ?? "No cloud save yet.");
                        if (!window.confirm("Replace this device's save with your cloud save?")) return;
                        replaceState(n);
                        say("Cloud save loaded.");
                    }}
                >
                    Download
                </ActionBtn>
                <ActionBtn icon={<Cloud className="size-4" />} danger onClick={() => void signOut()}>Sign out</ActionBtn>
            </div>
        </div>
    );
}

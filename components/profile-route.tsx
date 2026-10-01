"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn, UserX } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { ProfileView } from "@/components/profile-view";
import { PublicProfile, type PublicData } from "@/components/public-profile";
import { ensureAccount, useAccount } from "@/lib/account/client";
import { profileHref } from "@/lib/account/custom";

const Spinner = ({ text }: { text: string }) => <p className="flex items-center gap-2 font-rubik text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> {text}</p>;

function Card({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
    return (
        <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-card/40 p-6 text-center backdrop-blur-xl">
            <div className="mx-auto grid size-14 place-items-center">{icon}</div>
            <h1 className="mt-3 font-minecraft text-xl font-bold">{title}</h1>
            <p className="mt-1 font-rubik text-xs text-muted-foreground">{text}</p>
            {action}
        </div>
    );
}

/** /profile: signed in goes to your own link, signed out asks you to sign in. */
export function ProfileRedirect() {
    const a = useAccount();
    const router = useRouter();
    useEffect(() => {
        ensureAccount();
    }, []);
    useEffect(() => {
        if (a.user) router.replace(profileHref(a.user, window.location.search));
    }, [a.user, router]);
    if (a.email === undefined || a.user) return <Spinner text="Opening your profile…" />;
    return <Card icon={<AccountAvatar size={56} />} title="Sign in to see your profile" text="Your profile keeps your game progress, unlocks and looks across devices." action={<Link href="/account" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--mc-aqua)] px-5 font-minecraft text-sm font-bold text-black"><LogIn className="size-4" /> Sign in</Link>} />;
}

/**
 * /u/<handle or id>. Your own link opens your profile with the editing tools; anyone else's opens the shared,
 * read-only view. A profile that is private (or does not exist) shows the same "not found" card to visitors.
 */
export function ProfileRoute({ keyParam, initial }: { keyParam: string; initial: PublicData | null }) {
    const a = useAccount();
    useEffect(() => {
        ensureAccount();
    }, []);
    const k = keyParam.toLowerCase();
    const mine = !!a.user && (a.user.handle === k || a.user.id === k);
    if (mine) return <ProfileView />;
    if (initial) return <PublicProfile data={initial} />;
    if (a.email === undefined) return <Spinner text="Looking for that profile…" />;
    return <Card icon={<UserX className="size-10 text-muted-foreground" />} title="Profile not found" text="This profile does not exist, or its owner has not shared it." action={<Link href="/u" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 font-minecraft text-xs font-bold hover:bg-white/10">Browse players</Link>} />;
}

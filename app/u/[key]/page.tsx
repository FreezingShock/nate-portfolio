import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfile, type PublicData } from "@/components/public-profile";
import { anon } from "@/lib/account/server";

// A shared profile, opened by handle or id. Only profiles whose owner switched sharing on come back from the
// database function; anything else is a plain 404, so a private profile cannot be told apart from a missing one.
export const dynamic = "force-dynamic";

async function load(key: string): Promise<PublicData | null> {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(key)) return null;
    const { data } = await anon().rpc("get_public_profile", { p_key: key });
    return (data as PublicData | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
    const p = await load((await params).key);
    return { title: p ? `${p.name} · Profile` : "Profile", robots: { index: false } };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ key: string }> }) {
    const p = await load((await params).key);
    if (!p) notFound();
    return (
        <div className="pointer-events-auto mx-auto w-full max-w-5xl px-4 pb-24 pt-24">
            <PublicProfile data={p} />
        </div>
    );
}

import type { Metadata } from "next";
import { Players, type PlayerRow } from "@/components/players";
import { anon } from "@/lib/account/server";

export const metadata: Metadata = { title: "Players", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
    const { data } = await anon().rpc("list_public_profiles", { p_limit: 60 });
    return (
        <div className="pointer-events-auto mx-auto w-full max-w-5xl px-4 pb-24 pt-24">
            <Players rows={(data as PlayerRow[] | null) ?? []} />
        </div>
    );
}

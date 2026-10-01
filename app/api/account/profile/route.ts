import { COSMETICS, DEFAULTS, cosmeticById, isUnlocked, type CosKind } from "@/lib/account/cosmetics";
import { cleanName, currentUser, json, originOk, summariesOf } from "@/lib/account/server";

const KINDS = Object.keys(DEFAULTS) as CosKind[];

// Rename and/or equip cosmetics. Equipping is checked against the numbers the games reported with their saves,
// so a locked cosmetic is refused. (The numbers come from the player's own save, so this keeps the UI honest;
// it is not an anti-cheat boundary, and cosmetics are only ever decoration.)
export async function PUT(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const b = await req.json().catch(() => null);
    const patch: Record<string, unknown> = { user_id: a.user.id, updated_at: new Date().toISOString() };

    if (b?.name !== undefined) {
        const name = typeof b.name === "string" ? cleanName(b.name) : "";
        if (name.length < 1) return json({ error: "Pick a name with at least one letter or number." }, 400);
        patch.display_name = name;
    }

    if (b?.cosmetics !== undefined) {
        if (!b.cosmetics || typeof b.cosmetics !== "object" || Array.isArray(b.cosmetics)) return json({ error: "Bad cosmetics" }, 400);
        const games = await summariesOf(a);
        const { data: cur } = await a.db.from("profiles").select("cosmetics").eq("user_id", a.user.id).maybeSingle();
        const next: Record<string, string> = { ...((cur?.cosmetics as Record<string, string> | undefined) ?? {}) };
        for (const k of KINDS) {
            const id = (b.cosmetics as Record<string, unknown>)[k];
            if (id === undefined) continue;
            const c = typeof id === "string" ? cosmeticById(id) : undefined;
            if (!c || c.kind !== k) return json({ error: "Unknown cosmetic" }, 400);
            if (!isUnlocked(c, games)) return json({ error: "That one is still locked." }, 403);
            next[k] = c.id;
        }
        patch.cosmetics = Object.fromEntries(Object.entries(next).filter(([k, v]) => KINDS.includes(k as CosKind) && COSMETICS.some((c) => c.id === v)));
    }

    if (!patch.display_name && !patch.cosmetics) return json({ error: "Nothing to change" }, 400);
    // A first-time upsert needs a name; keep the existing one when only cosmetics change.
    if (!patch.display_name) {
        const { data: cur } = await a.db.from("profiles").select("display_name").eq("user_id", a.user.id).maybeSingle();
        patch.display_name = cur?.display_name ?? "Player";
    }
    const { error } = await a.db.from("profiles").upsert(patch);
    if (error) return json({ error: "Could not save." }, 500);
    return json({ ok: true, name: patch.display_name, cosmetics: patch.cosmetics });
}

import { COSMETICS, DEFAULTS, cosmeticById, isUnlocked, type CosKind } from "@/lib/account/cosmetics";
import { cleanCustom, cleanHandle, validHandle } from "@/lib/account/custom";
import { cleanName, currentUser, json, originOk, profileOf, summariesOf } from "@/lib/account/server";

const KINDS = Object.keys(DEFAULTS) as CosKind[];

// Change anything about the profile: name, handle, bio, sharing, free customization, and equipped cosmetics.
// Equipping is checked against the numbers the games reported with their saves, so a locked cosmetic is refused.
// (The numbers come from the player's own save, so this keeps the UI honest; it is not an anti-cheat boundary,
// and cosmetics are only ever decoration.) Every field is optional; only the ones sent are changed.
export async function PUT(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return json({ error: "Bad request" }, 400);
    const patch: Record<string, unknown> = { user_id: a.user.id, updated_at: new Date().toISOString() };
    const cur = await profileOf(a);

    if (b.name !== undefined) {
        const name = typeof b.name === "string" ? cleanName(b.name) : "";
        if (name.length < 1) return json({ error: "Pick a name with at least one letter or number." }, 400);
        patch.display_name = name;
    }

    if (b.handle !== undefined) {
        if (b.handle === null || b.handle === "") patch.handle = null;
        else {
            const h = typeof b.handle === "string" ? cleanHandle(b.handle) : "";
            if (!validHandle(h)) return json({ error: "A handle is 3 to 20 letters, numbers or underscores." }, 400);
            patch.handle = h;
        }
    }

    if (b.bio !== undefined) {
        if (typeof b.bio !== "string") return json({ error: "Bad bio" }, 400);
        patch.bio = b.bio.replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g, "").slice(0, 200).trim();
    }

    if (b.isPublic !== undefined) {
        if (typeof b.isPublic !== "boolean") return json({ error: "Bad value" }, 400);
        patch.is_public = b.isPublic;
    }

    if (b.custom !== undefined) {
        // Merge over what is stored so a partial update (just the layout, say) keeps the rest. An upload avatar
        // is only ever created by the avatar route, so a client cannot claim one it has not uploaded.
        const merged = cleanCustom({ ...cur.custom, ...(b.custom as object) });
        if (merged.avatar.kind === "upload") merged.avatar = cur.custom.avatar.kind === "upload" ? { kind: "upload", v: cur.custom.avatar.v } : { kind: "generated" };
        patch.custom = merged;
    }

    if (b.cosmetics !== undefined) {
        if (!b.cosmetics || typeof b.cosmetics !== "object" || Array.isArray(b.cosmetics)) return json({ error: "Bad cosmetics" }, 400);
        const games = await summariesOf(a);
        const next: Record<string, string> = { ...cur.cosmetics };
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

    if (Object.keys(patch).length <= 2) return json({ error: "Nothing to change" }, 400);
    // A first-time upsert needs a name; profileOf already created the row, so this keeps the stored one.
    if (!patch.display_name) patch.display_name = cur.name;
    const { error } = await a.db.from("profiles").upsert(patch);
    if (error) {
        if (error.code === "23505") return json({ error: "That handle is taken." }, 409);
        return json({ error: "Could not save." }, 500);
    }
    return json({ ok: true, profile: await profileOf(a) });
}

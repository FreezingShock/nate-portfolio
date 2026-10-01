import { currentUser, json, originOk } from "@/lib/account/server";

// One row per (user, game). The game string is just a namespace, so any idle game can reuse this.
const game = (v: unknown) => (typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v) ? v : null);

export async function GET(req: Request) {
    const g = game(new URL(req.url).searchParams.get("game"));
    if (!g) return json({ error: "Bad game" }, 400);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const { data, error } = await a.db.from("idle_saves").select("data,progress,saved_at").eq("user_id", a.user.id).eq("game", g).maybeSingle();
    if (error) return json({ error: "Could not load" }, 500);
    return json({ save: data ? { data: data.data, progress: data.progress, savedAt: Number(data.saved_at) } : null });
}

export async function PUT(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const b = await req.json().catch(() => null);
    const g = game(b?.game);
    if (!g || typeof b?.data !== "string" || b.data.length > 1_400_000) return json({ error: "Bad save" }, 400);
    const progress = Number.isFinite(b.progress) ? Number(b.progress) : 0;
    const savedAt = Number.isFinite(b.savedAt) ? Math.floor(b.savedAt) : Date.now();
    const { error } = await a.db.from("idle_saves").upsert({ user_id: a.user.id, game: g, data: b.data, progress, saved_at: savedAt, updated_at: new Date().toISOString() });
    if (error) return json({ error: "Could not save" }, 500);
    return json({ ok: true });
}

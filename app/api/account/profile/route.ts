import { cleanName, currentUser, json, originOk } from "@/lib/account/server";

export async function PUT(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const b = await req.json().catch(() => null);
    const name = typeof b?.name === "string" ? cleanName(b.name) : "";
    if (name.length < 1) return json({ error: "Pick a name with at least one letter or number." }, 400);
    const { error } = await a.db.from("profiles").upsert({ user_id: a.user.id, display_name: name, updated_at: new Date().toISOString() });
    if (error) return json({ error: "Could not save the name." }, 500);
    return json({ ok: true, name });
}

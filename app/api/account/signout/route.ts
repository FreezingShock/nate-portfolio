import { clearSession, json, originOk } from "@/lib/account/server";

export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    await clearSession();
    return json({ ok: true });
}

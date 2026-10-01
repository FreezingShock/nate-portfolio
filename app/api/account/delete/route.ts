import { clearSession, currentUser, json, originOk } from "@/lib/account/server";

// Permanently delete the signed-in account, its profile and every cloud save (they cascade). The caller must
// type their email as confirmation, which the settings page asks for.
export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const b = await req.json().catch(() => null);
    if (typeof b?.confirm !== "string" || b.confirm.trim().toLowerCase() !== (a.user.email ?? "").toLowerCase()) return json({ error: "Type your email to confirm." }, 400);
    const { error } = await a.db.rpc("delete_my_account");
    if (error) return json({ error: "Could not delete the account." }, 500);
    await clearSession();
    return json({ ok: true });
}

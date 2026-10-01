import { anon, authLimit, json, originOk, setSession, slow, validEmail } from "@/lib/account/server";

export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    if (authLimit.blocked(req)) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
    const b = await req.json().catch(() => null);
    if (!validEmail(b?.email) || typeof b?.password !== "string" || b.password.length > 128) return json({ error: "Wrong email or password." }, 401);

    const { data, error } = await anon().auth.signInWithPassword({ email: b.email.trim().toLowerCase(), password: b.password });
    if (error || !data.session) {
        authLimit.fail(req);
        await slow();
        const unconfirmed = error?.message?.toLowerCase().includes("not confirmed");
        return json({ error: unconfirmed ? "Confirm your email first, then sign in." : "Wrong email or password." }, 401);
    }
    authLimit.clear(req);
    await setSession(data.session);
    return json({ ok: true, email: data.user.email });
}

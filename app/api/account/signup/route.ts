import { anon, authLimit, json, originOk, setSession, validEmail, validPassword } from "@/lib/account/server";

export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    if (authLimit.blocked(req)) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
    const b = await req.json().catch(() => null);
    if (!validEmail(b?.email)) return json({ error: "Enter a valid email." }, 400);
    if (!validPassword(b?.password)) return json({ error: "Password must be 8 to 128 characters." }, 400);

    const { data, error } = await anon().auth.signUp({ email: b.email.trim().toLowerCase(), password: b.password });
    authLimit.fail(req); // sign-ups count toward the limit too
    if (error) {
        const limited = /rate limit/i.test(error.message);
        return json({ error: limited ? "We have sent a lot of emails in the last hour. Please try again in a bit." : error.message }, limited ? 429 : 400);
    }
    if (data.session) {
        await setSession(data.session);
        return json({ ok: true, email: data.user?.email });
    }
    // Email confirmation is on: the account exists once the link in the email is clicked.
    return json({ ok: true, confirm: true });
}

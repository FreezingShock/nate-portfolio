import { anon, json, originOk, setSession, validEmail } from "@/lib/account/server";
import { clientIp, makeLimiter } from "@/lib/gate/limit";

// The sign-up screen calls this every few seconds while it waits for the email link to be clicked.
// It signs in with the credentials the page is holding in memory, so the moment the address is
// confirmed the visitor is signed in without doing anything. "Not confirmed yet" is a normal answer.
const limiter = makeLimiter(150, 10 * 60 * 1000);

export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const ip = clientIp(req);
    limiter.fail(ip);
    if (limiter.blocked(ip)) return json({ error: "Paused. Press Check now in a minute." }, 429);
    const b = await req.json().catch(() => null);
    if (!validEmail(b?.email) || typeof b?.password !== "string" || b.password.length > 128) return json({ error: "Bad request" }, 400);
    const { data, error } = await anon().auth.signInWithPassword({ email: b.email.trim().toLowerCase(), password: b.password });
    if (data?.session) {
        await setSession(data.session);
        return json({ confirmed: true, email: data.user.email });
    }
    if (error?.message?.toLowerCase().includes("not confirmed")) return json({ confirmed: false });
    return json({ error: "Wrong email or password." }, 401);
}

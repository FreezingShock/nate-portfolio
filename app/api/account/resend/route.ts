import { anon, json, originOk, validEmail } from "@/lib/account/server";
import { clientIp, makeLimiter } from "@/lib/gate/limit";

// Re-send the confirmation email. Capped per IP, and Supabase adds its own per-address cooldown.
const limiter = makeLimiter(5, 10 * 60 * 1000);

export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const ip = clientIp(req);
    if (limiter.blocked(ip)) return json({ error: "Too many requests. Try again in a few minutes." }, 429);
    const b = await req.json().catch(() => null);
    if (!validEmail(b?.email)) return json({ error: "Enter a valid email." }, 400);
    limiter.fail(ip);
    const { error } = await anon().auth.resend({ type: "signup", email: b.email.trim().toLowerCase() });
    if (error) return json({ error: /seconds|rate/i.test(error.message) ? "Please wait a minute before asking again." : "Could not send the email." }, 429);
    return json({ ok: true });
}

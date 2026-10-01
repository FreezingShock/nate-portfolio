import { NextResponse } from "next/server";
import { GATE } from "@/lib/gate/config";
import { clientIp, makeLimiter, sameOrigin } from "@/lib/gate/limit";
import { checkPassword, makeToken } from "@/lib/gate/token";

const limiter = makeLimiter(GATE.maxFailures, GATE.windowMs);
const noStore = { "cache-control": "no-store" };

export async function POST(req: Request) {
    if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403, headers: noStore });
    const ip = clientIp(req);
    if (limiter.blocked(ip)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429, headers: noStore });

    let pw = "";
    try {
        const b = await req.json();
        if (typeof b?.password === "string") pw = b.password.slice(0, 200);
    } catch {
        /* empty */
    }
    if (!(await checkPassword(pw))) {
        limiter.fail(ip);
        await new Promise((r) => setTimeout(r, 600));
        return NextResponse.json({ error: "Wrong password" }, { status: 401, headers: noStore });
    }
    limiter.clear(ip);
    const res = NextResponse.json({ ok: true }, { headers: noStore });
    res.cookies.set(GATE.cookie, await makeToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: GATE.maxAgeSeconds });
    return res;
}

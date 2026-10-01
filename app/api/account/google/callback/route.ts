import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { anon, setSession } from "@/lib/account/server";
import { STATE_COOKIE, exchangeCode, ownFlowEnabled } from "@/lib/account/google";
import { safeEqual } from "@/lib/gate/token";

// Where Google sends the visitor back on this domain. Checks the anti-forgery state, trades the code for an
// ID token on the server, lets Supabase turn it into a session, and stores that in HttpOnly cookies.
export async function GET(req: Request) {
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
    const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const origin = `${proto}://${host}`;
    const go = (path: string) => NextResponse.redirect(new URL(path, origin), { headers: { "cache-control": "no-store" } });
    const fail = () => go("/account?error=google");

    const jar = await cookies();
    const expected = jar.get(STATE_COOKIE)?.value;
    jar.delete({ name: STATE_COOKIE, path: "/api/account/google" });

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!ownFlowEnabled() || url.searchParams.get("error") || !code || !state || !expected || !safeEqual(state, expected)) return fail();

    const idToken = await exchangeCode(code, origin);
    if (!idToken) return fail();
    const { data, error } = await anon().auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error || !data.session) return fail();
    await setSession(data.session);
    return go("/profile?welcome=1");
}

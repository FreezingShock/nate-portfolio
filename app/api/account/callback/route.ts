import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setSession } from "@/lib/account/server";

// Google sends the visitor back here with a one-time code. It is exchanged on the server for a session,
// which goes straight into HttpOnly cookies, then the visitor lands on /account already signed in.
export async function GET(req: Request) {
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
    const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const back = (q: string) => NextResponse.redirect(new URL(`/account${q}`, `${proto}://${host}`), { headers: { "cache-control": "no-store" } });

    const code = url.searchParams.get("code");
    const jar = await cookies();
    const verifier = jar.get("acct_cv")?.value;
    jar.delete({ name: "acct_cv", path: "/api/account" });
    if (url.searchParams.get("error") || !code || !verifier) return back("?error=google");

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: {
            flowType: "pkce",
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: { getItem: (k) => (k.endsWith("code-verifier") ? verifier : null), setItem: () => {}, removeItem: () => {} },
        },
    });
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (error || !data.session) return back("?error=google");
    await setSession(data.session);
    return back("?welcome=1");
}

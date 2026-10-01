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
    let verifiers: Record<string, string> | null = null;
    try {
        const raw = jar.get("acct_cv")?.value;
        verifiers = raw ? JSON.parse(decodeURIComponent(raw)) : null;
    } catch {
        verifiers = null;
    }
    jar.delete({ name: "acct_cv", path: "/api/account" });
    if (url.searchParams.get("error") || !code || !verifiers) return back("?error=google");

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: {
            flowType: "pkce",
            persistSession: true,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: { getItem: (k) => verifiers?.[k] ?? null, setItem: () => {}, removeItem: () => {} },
        },
    });
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (error || !data.session) return back("?error=google");
    await setSession(data.session);
    return back("?welcome=1");
}

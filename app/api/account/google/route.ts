import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { json, originOk } from "@/lib/account/server";

// Starts "Continue with Google": PKCE flow handled on the server. The one-time code verifier goes into
// a short-lived HttpOnly cookie that only /api/account/callback reads, so no token ever touches the page.
const VERIFIER_COOKIE = "acct_cv";

export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const store = new Map<string, string>();
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: {
            flowType: "pkce",
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) },
        },
    });
    const origin = new URL(req.headers.get("origin")!).origin;
    const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/api/account/callback`, skipBrowserRedirect: true } });
    if (error || !data.url) return json({ error: "Could not start Google sign-in." }, 500);

    // Supabase answers 400 when the Google provider is not switched on; say so instead of sending the visitor to an error page.
    const probe = await fetch(data.url, { redirect: "manual" }).catch(() => null);
    if (!probe || probe.status >= 400) return json({ error: "Google sign-in is not set up yet." }, 503);

    const verifier = [...store.entries()].find(([k]) => k.endsWith("code-verifier"))?.[1];
    if (!verifier) return json({ error: "Could not start Google sign-in." }, 500);
    (await cookies()).set(VERIFIER_COOKIE, verifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/account", maxAge: 600 });
    return json({ url: data.url });
}

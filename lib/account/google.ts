// "Continue with Google" through this site's own redirect (not the Supabase-hosted one).
// Google sends the visitor back to /api/account/google/callback on this domain; the server swaps the
// one-time code for a Google ID token and hands that to Supabase, which creates the session.
// Needs two server-only env vars (Vercel > Settings > Environment Variables):
//   GOOGLE_CLIENT_ID      the same OAuth client ID already entered in Supabase
//   GOOGLE_CLIENT_SECRET  that client's secret (mark Sensitive)
// and this authorized redirect URI added to the client in Google Cloud:
//   https://www.nateanderson.dev/api/account/google/callback

export const STATE_COOKIE = "acct_gs";

export const ownFlowEnabled = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const redirectUri = (origin: string) => `${origin}/api/account/google/callback`;

export function randomState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function googleAuthUrl(origin: string, state: string): string {
    const q = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: redirectUri(origin),
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Exchange the one-time code for a Google ID token, server to server. */
export async function exchangeCode(code: string, origin: string): Promise<string | null> {
    const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: redirectUri(origin),
            grant_type: "authorization_code",
        }),
    }).catch(() => null);
    if (!r?.ok) return null;
    const j = (await r.json().catch(() => null)) as { id_token?: string } | null;
    return j?.id_token ?? null;
}

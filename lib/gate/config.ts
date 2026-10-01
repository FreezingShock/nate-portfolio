// Sitewide password gate: every setting lives here.
//
// Change the password WITHOUT touching code by setting these in Vercel (Project > Settings > Environment Variables):
//   SITE_PASSWORD         the password in plain text (simplest)
//   SITE_PASSWORD_SHA256  or, instead, the hex SHA-256 of it, so the plain text is never stored anywhere
//   SITE_GATE_SECRET      a long random string that signs the unlock cookie (set this in production)
// Changing the password (or the secret) signs every visitor out, because the cookie is derived from both.
// Nothing here is ever sent to the browser: this file is only imported by the proxy and API routes.

export const GATE = {
    /** Fallback used only when no env var is set. */
    defaultPassword: "dean",
    cookie: "site_unlock",
    /** Browsers cap cookie lifetime at about 400 days, so this is "once and never again". */
    maxAgeSeconds: 60 * 60 * 24 * 400,
    /** The only path reachable without the cookie. */
    unlockPath: "/api/gate",
    /** Failed attempts allowed per IP in the window before it is locked out. */
    maxFailures: 8,
    windowMs: 10 * 60 * 1000,
    title: "Private",
    hint: "Enter the password to continue.",
};

export const gatePassword = () => process.env.SITE_PASSWORD || GATE.defaultPassword;
export const gateSecret = () => process.env.SITE_GATE_SECRET || "fractured-gate-dev-secret-set-SITE_GATE_SECRET";

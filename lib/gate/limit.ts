// Best-effort failure limiter (per server instance). Callers also add a fixed delay on every miss.
type Hit = { n: number; reset: number };
export function makeLimiter(max: number, windowMs: number) {
    const hits = new Map<string, Hit>();
    return {
        blocked(key: string) {
            const h = hits.get(key);
            if (!h || h.reset < Date.now()) return false;
            return h.n >= max;
        },
        fail(key: string) {
            const now = Date.now();
            const h = hits.get(key);
            if (!h || h.reset < now) hits.set(key, { n: 1, reset: now + windowMs });
            else h.n++;
            if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
        },
        clear(key: string) {
            hits.delete(key);
        },
    };
}

export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

/** Reject cross-site POSTs: the Origin must match the Host. */
export function sameOrigin(req: Request): boolean {
    const o = req.headers.get("origin");
    if (!o) return false;
    try {
        return new URL(o).host === req.headers.get("host");
    } catch {
        return false;
    }
}

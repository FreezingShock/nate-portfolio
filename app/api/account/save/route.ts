import { currentUser, json, originOk } from "@/lib/account/server";

// One row per (user, game). The game string is just a namespace, so any idle game can reuse this.
//
// Several devices can share one account, so a write is a compare-and-set, never a blind overwrite:
//  - Every row has a revision. A device sends the revision it last saw (baseRev); if someone else saved
//    since, the write is refused with 409 and the newest summary, and the device decides what to do.
//  - A write that would LOWER progress is refused too, unless the client says force (an explicit import
//    or restore), so a stale tab can never quietly replace newer progress.
//  - Each accepted write keeps the version it replaced (one step of history) for "restore previous".
//  - A forced write (import / restore / reset) also bumps the epoch. Devices that last synced at an older epoch
//    must yield to the cloud even if they are further along, so a deliberate rollback is not undone by another device.
const game = (v: unknown) => (typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v) ? v : null);
const label = (v: unknown) => (typeof v === "string" ? v.replace(/[^\p{L}\p{N} .,()+#_-]/gu, "").trim().slice(0, 60) : "") || "unknown device";

const SUMMARY = "rev,epoch,progress,saved_at,device,updated_at";
const summary = (r: { rev: number; epoch: number; progress: number; saved_at: number; device: string; updated_at: string }) => ({
    rev: Number(r.rev),
    epoch: Number(r.epoch),
    progress: r.progress,
    savedAt: Number(r.saved_at),
    device: r.device,
    updatedAt: r.updated_at,
});

export async function GET(req: Request) {
    const q = new URL(req.url).searchParams;
    const g = game(q.get("game"));
    if (!g) return json({ error: "Bad game" }, 400);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);

    if (q.get("prev")) {
        const { data, error } = await a.db.from("idle_saves").select("prev_data,prev_progress,prev_saved_at").eq("user_id", a.user.id).eq("game", g).maybeSingle();
        if (error) return json({ error: "Could not load" }, 500);
        return json({ save: data?.prev_data ? { data: data.prev_data, progress: data.prev_progress ?? 0, savedAt: Number(data.prev_saved_at ?? 0) } : null });
    }

    const { data, error } = await a.db.from("idle_saves").select(`data,${SUMMARY}`).eq("user_id", a.user.id).eq("game", g).maybeSingle();
    if (error) return json({ error: "Could not load" }, 500);
    return json({ save: data ? { data: data.data, ...summary(data) } : null });
}

export async function PUT(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const b = await req.json().catch(() => null);
    const g = game(b?.game);
    if (!g || typeof b?.data !== "string" || b.data.length > 1_400_000) return json({ error: "Bad save" }, 400);
    const progress = Number.isFinite(b.progress) ? Number(b.progress) : 0;
    const savedAt = Number.isFinite(b.savedAt) ? Math.floor(b.savedAt) : Date.now();
    const baseRev = Number.isFinite(b.baseRev) ? Number(b.baseRev) : null;
    const force = b.force === true;
    const device = label(b.device);
    const now = new Date().toISOString();

    const { data: cur, error: readErr } = await a.db.from("idle_saves").select(`data,${SUMMARY}`).eq("user_id", a.user.id).eq("game", g).maybeSingle();
    if (readErr) return json({ error: "Could not save" }, 500);

    if (!cur) {
        // Nothing stored. A device that thought something existed was reset elsewhere; let it re-check first.
        if (baseRev !== null && !force) return json({ conflict: "missing" }, 409);
        const { error } = await a.db.from("idle_saves").insert({ user_id: a.user.id, game: g, data: b.data, progress, saved_at: savedAt, device, rev: 1, updated_at: now });
        if (error) return json({ conflict: "rev" }, 409); // someone inserted first
        return json({ ok: true, rev: 1, epoch: 0 });
    }

    const cloud = summary(cur);
    if (!force && baseRev !== cloud.rev) return json({ conflict: "rev", cloud }, 409);
    if (!force && progress < cloud.progress) return json({ conflict: "lower", cloud }, 409);

    // Compare-and-set on the revision we just read, so two simultaneous writers cannot both win.
    const { data: won, error } = await a.db
        .from("idle_saves")
        .update({ data: b.data, progress, saved_at: savedAt, device, rev: cloud.rev + 1, epoch: force ? cloud.epoch + 1 : cloud.epoch, updated_at: now, prev_data: cur.data, prev_progress: cur.progress, prev_saved_at: cur.saved_at })
        .eq("user_id", a.user.id)
        .eq("game", g)
        .eq("rev", cloud.rev)
        .select("rev,epoch");
    if (error) return json({ error: "Could not save" }, 500);
    if (!won?.length) return json({ conflict: "rev" }, 409);
    return json({ ok: true, rev: cloud.rev + 1, epoch: won[0].epoch });
}

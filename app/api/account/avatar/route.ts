import { AVATAR_BUCKET } from "@/lib/account/custom";
import { currentUser, json, originOk, profileOf } from "@/lib/account/server";

const MAX = 200 * 1024;

// A real WebP file starts "RIFF", four size bytes, then "WEBP".
const isWebp = (b: Uint8Array) => b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";

// Upload a profile picture. The browser has already cropped it square, shrunk it to 256px and re-encoded it as
// WebP (which also strips any metadata), so this only has to check it really is a small WebP before storing it
// in the signed-in user's own folder. It is then set as the avatar.
export async function POST(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return json({ error: "No file" }, 400);
    if (file.size > MAX) return json({ error: "That image is too big." }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isWebp(bytes)) return json({ error: "That is not a valid image." }, 400);

    const { error } = await a.db.storage.from(AVATAR_BUCKET).upload(`${a.user.id}/avatar.webp`, bytes, { contentType: "image/webp", upsert: true, cacheControl: "300" });
    if (error) return json({ error: "Could not store the image." }, 500);

    const cur = await profileOf(a);
    const custom = { ...cur.custom, avatar: { kind: "upload", v: Date.now() } };
    const { error: e2 } = await a.db.from("profiles").upsert({ user_id: a.user.id, display_name: cur.name, custom, updated_at: new Date().toISOString() });
    if (e2) return json({ error: "Could not save." }, 500);
    return json({ ok: true, profile: await profileOf(a) });
}

// Remove the uploaded picture and go back to a generated avatar.
export async function DELETE(req: Request) {
    if (!originOk(req)) return json({ error: "Bad origin" }, 403);
    const a = await currentUser();
    if (!a) return json({ error: "Not signed in" }, 401);
    await a.db.storage.from(AVATAR_BUCKET).remove([`${a.user.id}/avatar.webp`]);
    const cur = await profileOf(a);
    const custom = { ...cur.custom, avatar: { kind: "generated" } };
    const { error } = await a.db.from("profiles").upsert({ user_id: a.user.id, display_name: cur.name, custom, updated_at: new Date().toISOString() });
    if (error) return json({ error: "Could not save." }, 500);
    return json({ ok: true, profile: await profileOf(a) });
}

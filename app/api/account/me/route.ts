import { currentUser, json, profileOf } from "@/lib/account/server";

export async function GET() {
    const a = await currentUser();
    return json({ user: a ? await profileOf(a) : null });
}

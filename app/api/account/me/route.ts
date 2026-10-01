import { currentUser, json } from "@/lib/account/server";

export async function GET() {
    const a = await currentUser();
    return json({ user: a ? { email: a.user.email } : null });
}

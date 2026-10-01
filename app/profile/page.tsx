import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default function ProfilePage() {
    return (
        <div className="pointer-events-auto mx-auto w-full max-w-5xl px-4 pb-24 pt-24">
            <ProfileView />
        </div>
    );
}

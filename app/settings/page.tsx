import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
    return (
        <div className="pointer-events-auto mx-auto w-full max-w-2xl px-4 pb-24 pt-24">
            <SettingsView />
        </div>
    );
}

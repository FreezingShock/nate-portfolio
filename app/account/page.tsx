import type { Metadata } from "next";
import { AccountForm } from "@/components/account-form";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
    return (
        <div className="pointer-events-auto flex min-h-[70vh] items-center px-4 py-24">
            <AccountForm />
        </div>
    );
}

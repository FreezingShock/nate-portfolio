import type { Metadata } from "next";
import { AccountBackdrop } from "@/components/account-backdrop";
import { AccountForm } from "@/components/account-form";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
    return (
        <div className="pointer-events-auto relative flex min-h-[85vh] items-center py-24">
            <AccountBackdrop />
            <AccountForm />
        </div>
    );
}

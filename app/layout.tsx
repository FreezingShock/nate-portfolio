import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarNav } from "@/components/sidebar-nav";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Nate — Portfolio",
    description:
        "Games, renders, and systems — built while studying toward environmental engineering.",
    authors: [{ name: "Nate" }],
    creator: "Nate",
    openGraph: {
        type: "website",
        locale: "en_US",
        title: "Nate — Portfolio",
        description:
            "Games, renders, and systems — built while studying toward environmental engineering.",
        siteName: "Nate — Portfolio",
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {/* Background photo + overlay — also gives the glass nav
                        something real to refract. */}
                    <div
                        aria-hidden
                        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage:
                                "url('https://images.unsplash.com/photo-1757265500145-c68e8f5aee12?q=65&w=1920&auto=format&fit=crop')",
                        }}
                    />
                    {/* Plain opacity on a solid background-color, not
                        color-mix(...,transparent) — that resolved to a fully
                        OPAQUE color in testing (no alpha channel at all),
                        hiding the photo underneath completely. opacity on a
                        solid color is the reliable way to get a translucent
                        overlay across browsers. */}
                    <div
                        aria-hidden
                        className="pointer-events-none fixed inset-0 -z-10"
                        style={{
                            backgroundColor: "var(--background)",
                            opacity: 0.78,
                        }}
                    />
                    <SidebarNav />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}

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
                                "url('https://images.unsplash.com/photo-1757265500145-c68e8f5aee12?q=80&w=2400&auto=format&fit=crop')",
                        }}
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none fixed inset-0 -z-10"
                        style={{
                            background:
                                "color-mix(in oklch, var(--background) 78%, transparent)",
                        }}
                    />
                    <SidebarNav />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}

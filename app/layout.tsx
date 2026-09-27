import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteDock } from "@/components/site-dock";
import { SiteBackground } from "@/components/site-background";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://nateanderson.dev"),
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
        url: "https://nateanderson.dev",
    },
    twitter: {
        card: "summary_large_image",
        title: "Nate — Portfolio",
        description:
            "Games, renders, and systems — built while studying toward environmental engineering.",
    },
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
                    <SiteBackground />
                    <div
                        className="fixed right-5 top-5 z-50 flex items-center justify-center rounded-full border border-border/50 bg-card/40 backdrop-blur-xl"
                        style={{ width: 40, height: 40 }}
                    >
                        <ThemeToggle />
                    </div>
                    {/* Bottom padding so page content never sits under the
                        fixed Dock. */}
                    <div className="pb-24">{children}</div>
                    <SiteDock />
                </ThemeProvider>
            </body>
        </html>
    );
}

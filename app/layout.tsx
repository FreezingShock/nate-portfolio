import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteDock } from "@/components/site-dock";
import { SiteBackground } from "@/components/site-background";
import { ThemeToggle } from "@/components/theme-toggle";

// Roboto Mono for everything except the Minecraft-font signature headers —
// a monospace body/UI face reads as engineered/technical (monkeytype-style)
// rather than a default AI-template sans, and it's what Nate asked for.
const robotoMono = Roboto_Mono({
    variable: "--font-roboto-mono",
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
            <body className={`${robotoMono.variable} antialiased`}>
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

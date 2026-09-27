import type { Metadata } from "next";
import { Roboto_Mono, Rubik, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteDock } from "@/components/site-dock";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

// A deliberately "stacked" type system, four faces each with one job:
// - Minecraft (fonts.css)     -> page titles, section labels (the signature)
// - Roboto Mono (below)       -> body copy, eyebrows, general UI
// - Rubik (below)             -> pills/badges/tags — this is the actual font
//                                the Hypixel SkyBlock Wiki renders in
// - Source Serif 4 (below)    -> individual work titles ("Fractured Islands:
//                                Ascension"). Anthropic's real serif
//                                (Copernicus/Tiempos) is a licensed brand
//                                typeface, not a public web font — this is
//                                the closest freely-licensed stand-in.
const robotoMono = Roboto_Mono({
    variable: "--font-roboto-mono",
    subsets: ["latin"],
});

const rubik = Rubik({
    variable: "--font-rubik",
    subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
    variable: "--font-source-serif",
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
                className={`${robotoMono.variable} ${rubik.variable} ${sourceSerif.variable} antialiased`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div
                        className="fixed right-5 top-5 z-50 flex items-center justify-center rounded-full border border-border/50 bg-card/40 backdrop-blur-xl"
                        style={{ width: 40, height: 40 }}
                    >
                        <ThemeToggle />
                    </div>
                    {/* Bottom padding so page content never sits under the
                        fixed Dock. */}
                    <div className="flex min-h-screen flex-col pb-24">
                        <div className="flex-1">{children}</div>
                        <SiteFooter />
                    </div>
                    <SiteDock />
                </ThemeProvider>
            </body>
        </html>
    );
}

import type { Metadata, Viewport } from "next";
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
    applicationName: "Nate Anderson — Portfolio",
    formatDetection: { telephone: false },
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

export const viewport: Viewport = {
    themeColor: "#4f46e5",
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
                        fixed Dock.
                        pointer-events-none: a page can opt into an
                        interactive background that needs real hover/click
                        events to reach through wherever nothing is visibly
                        drawn (see app/creations/page.tsx and
                        components/page-background.tsx) — that only works if
                        every ancestor box between the page's content and
                        that fixed background also gets out of the way,
                        since a plain box with default pointer-events still
                        claims every hit inside its bounds even where it has
                        nothing rendered. This wrapper and `flex-1` below are
                        the two such ancestors shared by every page.
                        Every real interactive element re-declares
                        pointer-events-auto on itself instead (SiteFooter,
                        SidebarNav, MagicCard, and the plain Links/anchors
                        outside those three — see each for why). */}
                    <div className="pointer-events-none flex min-h-screen flex-col pb-24">
                        <div className="flex-1">{children}</div>
                        <SiteFooter />
                    </div>
                    <SiteDock />
                </ThemeProvider>
            </body>
        </html>
    );
}

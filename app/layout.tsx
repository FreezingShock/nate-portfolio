import type { Metadata, Viewport } from "next";
import { Noto_Sans, Roboto_Mono, Rubik, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteDock } from "@/components/site-dock";
import { SiteFooter } from "@/components/site-footer";
import { AccountMenu } from "@/components/account-menu";
import { LiquidGlassFilter } from "@/components/liquid-glass-filter";
import { PageTransitions } from "@/components/page-transitions";
import { SoundProvider } from "@/components/sound-provider";

// A deliberately "stacked" type system, five faces each with one job:
// - Minecraft (fonts.css)     -> page titles, section labels (the signature)
// - Noto Sans (below)         -> the actual default body font. Nothing set
//                                a base font-family on <body> before this,
//                                so every plain paragraph/div was silently
//                                falling through to the OS default (Segoe UI
//                                on Windows) instead of any font this site
//                                chose — this is the fix, wired up as
//                                --font-sans below and applied to <body>.
// - Roboto Mono (below)       -> monospace UI accents (the "nateanderson.dev"
//                                chip, code-styled bits) via font-mono
// - Rubik (below)             -> pills/badges/tags — this is the actual font
//                                the Hypixel SkyBlock Wiki renders in
// - Source Serif 4 (below)    -> individual work titles ("Fractured Islands:
//                                Ascension"). Anthropic's real serif
//                                (Copernicus/Tiempos) is a licensed brand
//                                typeface, not a public web font — this is
//                                the closest freely-licensed stand-in.
const notoSans = Noto_Sans({
    variable: "--font-noto-sans",
    subsets: ["latin"],
});

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
    title: { default: "Nate's Portfolio", template: "%s · Nate's Portfolio" },
    description:
        "Games, renders, and systems — built while studying toward environmental engineering.",
    authors: [{ name: "Nate" }],
    creator: "Nate",
    applicationName: "Nate's Portfolio",
    formatDetection: { telephone: false },
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        title: "Nate's Portfolio",
        description:
            "Games, renders, and systems — built while studying toward environmental engineering.",
        siteName: "Nate's Portfolio",
        url: "https://nateanderson.dev",
    },
    twitter: {
        card: "summary_large_image",
        title: "Nate's Portfolio",
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
                className={`${notoSans.variable} ${robotoMono.variable} ${rubik.variable} ${sourceSerif.variable} font-sans antialiased`}
            >
                <LiquidGlassFilter />
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <AccountMenu />
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
                        outside those three — see each for why).
                        pb-24 lives on `flex-1` (the content), not this outer
                        wrapper: it used to sit here, after <SiteFooter/>,
                        which pushed a bare strip of raw page background
                        (dot-pattern/grid, no glass) below the footer's own
                        box, in the gap left for the fixed Dock. Moving it
                        onto the content div reserves that same Dock
                        clearance above the footer instead, so the footer
                        renders flush with the bottom of the page. */}
                    <div className="pointer-events-none flex min-h-screen flex-col">
                        <div className="flex-1 pb-24">{children}</div>
                        <SiteFooter />
                    </div>
                    <SiteDock />
                    <PageTransitions />
                    <SoundProvider />
                </ThemeProvider>
            </body>
        </html>
    );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";

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
                    {/* Fixed gradient so the glass nav has something to refract —
                        a flat background gives liquid-glass-react nothing to distort. */}
                    <div
                        aria-hidden
                        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px]"
                        style={{
                            background:
                                "radial-gradient(ellipse 60% 50% at 50% -10%, color-mix(in oklch, var(--primary) 22%, transparent), transparent)",
                        }}
                    />
                    <Header />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}

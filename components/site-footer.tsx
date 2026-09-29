import Link from "next/link";
import { Github, Mail, Youtube } from "lucide-react";
import { DiscordLogoIcon, InstagramLogoIcon } from "@radix-ui/react-icons";
import { identity } from "@/lib/content";
import { navItems } from "@/lib/nav";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { FooterActions } from "@/components/footer-actions";

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
    );
}

// Each platform in its own brand color; the icon and stroke share it.
const SOCIALS = [
    { label: "GitHub", href: "https://github.com/FreezingShock", color: "#e6edf3", Icon: Github },
    { label: "Discord", href: "https://discord.com/users/724456022722215966", color: "#5865f2", Icon: DiscordLogoIcon },
    { label: "Instagram", href: "https://instagram.com/nate9anderson", color: "#e4405f", Icon: InstagramLogoIcon },
    { label: "TikTok", href: "https://www.tiktok.com/@nate9anderson", color: "#25f4ee", Icon: TikTokIcon },
    { label: "YouTube", href: "https://www.youtube.com/channel/UC_MMqRncSjzBoT2aDRhXj7Q", color: "#ff0000", Icon: Youtube },
    { label: "Email", href: "mailto:nateanderson36b2@gmail.com", color: "#ffaa00", Icon: Mail, preferred: true },
];

// Pages: Minecraft font, each in its page's Minecraft color + glyph.
const PAGE_SYMBOLS: Record<string, McSymbolName> = {
    "/": "day",
    "/creations": "forge",
    "/timeline": "arrow",
    "/studies": "wisdom",
    "/blog": "intelligence",
    "/history": "location",
    "/about": "strength",
};

// More about Nate — deep links into the About page (+ placeholders).
const ABOUT_LINKS: { label: string; href: string; color: string; symbol: McSymbolName; soon?: boolean }[] = [
    { label: "Who I Am", href: "/about#hero", color: "#55ffff", symbol: "strength" },
    { label: "Running", href: "/about#running", color: "#ffaa00", symbol: "speed" },
    { label: "Fractured Islands", href: "/about#roblox", color: "#ff55ff", symbol: "pristine" },
    { label: "Philosophy", href: "/about#philosophy", color: "#5555ff", symbol: "wisdom" },
    { label: "Skills", href: "/about#skills", color: "#55ff55", symbol: "magicFind" },
    { label: "Education Path", href: "/about#timeline", color: "#ffff55", symbol: "arrow" },
    { label: "Résumé", href: "/about", color: "#ff5555", symbol: "flag", soon: true },
];

function Heading({ children, symbol, color }: { children: React.ReactNode; symbol: McSymbolName; color: string }) {
    return (
        <p className="flex items-center gap-2 font-minecraft text-sm font-bold uppercase tracking-wider" style={{ color }}>
            <McSymbol name={symbol} />
            {children}
        </p>
    );
}

export function SiteFooter() {
    return (
        // pointer-events-auto: the root layout's shared wrapper is
        // pointer-events-none (so a page can make its own background
        // interactive — see app/creations/page.tsx) and this footer is a
        // sibling inside that same wrapper, so it always re-declares auto
        // regardless of what that ancestor set.
        <footer
            id="footer"
            className="footer-glass pointer-events-auto relative w-full scroll-mt-24 overflow-hidden px-6 py-12 sm:px-10 lg:px-16"
        >
            <style>{`
                .footer-link {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--c);
                    transition: transform 0.2s ease, filter 0.2s ease, text-shadow 0.2s ease;
                }
                .footer-link::after {
                    content: '';
                    position: absolute;
                    bottom: -3px;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: var(--c);
                    transition: width 0.25s ease;
                }
                .footer-link:hover {
                    transform: translateX(4px);
                    text-shadow: 0 0 12px var(--c);
                }
                .footer-link:hover::after { width: 100%; }
                .footer-social {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    border: 1.5px solid var(--c);
                    color: var(--c);
                    background: color-mix(in oklch, var(--c) 10%, transparent);
                    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                }
                .footer-social:hover {
                    transform: translateY(-3px) scale(1.04);
                    background: color-mix(in oklch, var(--c) 22%, transparent);
                    box-shadow: 0 0 18px color-mix(in oklch, var(--c) 65%, transparent);
                }
                .footer-social:hover svg { transform: rotate(-8deg) scale(1.15); }
                .footer-social svg { transition: transform 0.2s ease; }
                .footer-chip {
                    color: var(--c);
                    border-color: var(--c);
                    background: color-mix(in oklch, var(--c) 10%, transparent);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    cursor: pointer;
                }
                .footer-chip:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 16px color-mix(in oklch, var(--c) 60%, transparent);
                }
                .footer-glass {
                    background: linear-gradient(
                        165deg,
                        color-mix(in oklch, var(--foreground) 12%, transparent),
                        color-mix(in oklch, var(--foreground) 3%, transparent) 40%,
                        color-mix(in oklch, var(--background) 35%, transparent) 100%
                    );
                    backdrop-filter: blur(8px) saturate(1.5);
                    -webkit-backdrop-filter: blur(8px) saturate(1.5);
                    box-shadow:
                        inset 0 1px 1px color-mix(in oklch, var(--foreground) 35%, transparent),
                        inset 0 0 20px color-mix(in oklch, var(--foreground) 6%, transparent),
                        inset 0 -1px 0 color-mix(in oklch, var(--background) 60%, transparent),
                        0 8px 32px -8px rgba(0, 0, 0, 0.4);
                    border: 1px solid color-mix(in oklch, var(--foreground) 16%, transparent);
                }
                .footer-glass::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    background: linear-gradient(
                        180deg,
                        color-mix(in oklch, var(--foreground) 18%, transparent),
                        transparent 30%
                    );
                    opacity: 0.4;
                    pointer-events: none;
                }
            `}</style>

            <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <p className="rainbow-text inline-block font-minecraft text-2xl font-bold">
                        {identity.name} {identity.lastName}
                    </p>
                    <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                        {identity.tagline}
                    </p>
                    <p className="mt-4 flex items-center gap-2 font-minecraft text-xs text-mc-green">
                        <span className="dot-blink size-2 rounded-full bg-[#55ff55]" style={{ boxShadow: "0 0 8px #55ff55" }} />
                        Southern California · Class of 2027
                    </p>
                    <div className="mt-5">
                        <FooterActions />
                    </div>
                </div>

                <nav aria-label="Site pages">
                    <Heading symbol="arrow" color="#ffaa00">Pages</Heading>
                    <ul className="mt-4 space-y-2.5">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="footer-link font-minecraft text-sm font-bold"
                                    style={{ ["--c" as string]: item.color }}
                                >
                                    <McSymbol name={PAGE_SYMBOLS[item.href] ?? "arrow"} />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav aria-label="About Nate">
                    <Heading symbol="strength" color="#55ffff">About Me</Heading>
                    <ul className="mt-4 space-y-2.5">
                        {ABOUT_LINKS.map((l) => (
                            <li key={l.label}>
                                <Link
                                    href={l.href}
                                    className="footer-link font-minecraft text-sm font-bold"
                                    style={{ ["--c" as string]: l.color }}
                                >
                                    <McSymbol name={l.symbol} />
                                    {l.label}
                                    {l.soon && (
                                        <span className="rounded border border-current px-1 text-[10px] opacity-70">soon</span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div>
                    <Heading symbol="magicFind" color="#ff55ff">Find Me</Heading>
                    <ul className="mt-4 flex flex-wrap gap-2.5">
                        {SOCIALS.map(({ label, href, color, Icon, preferred }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    target={href.startsWith("mailto:") ? undefined : "_blank"}
                                    rel="noreferrer"
                                    className="footer-social rounded-full px-3 py-1.5 font-minecraft text-xs font-bold"
                                    style={{ ["--c" as string]: color }}
                                >
                                    <Icon className="size-4" />
                                    {label}
                                    {preferred && (
                                        <>
                                            <span className="text-[#aaaaaa]">-</span>
                                            <span className="font-minecraft font-bold text-[#55ff55]">PREFERRED</span>
                                        </>
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mx-auto mt-10 flex max-w-6xl flex-col items-start justify-between gap-2 border-t border-border/40 pt-6 font-minecraft text-xs text-muted-foreground sm:flex-row sm:items-center">
                <p>
                    © {new Date().getFullYear()} {identity.name} {identity.lastName}
                </p>
                <p>Built with love. &lt;3</p>
            </div>
        </footer>
    );
}

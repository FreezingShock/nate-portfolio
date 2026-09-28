import Link from "next/link";
import { Github } from "lucide-react";
import { identity } from "@/lib/content";
import { navItems } from "@/lib/nav";

export function SiteFooter() {
    return (
        // pointer-events-auto: the root layout's shared wrapper is
        // pointer-events-none (so a page can make its own background
        // interactive — see app/creations/page.tsx) and this footer is a
        // sibling inside that same wrapper, so it always re-declares auto
        // regardless of what that ancestor set.
        <footer
            id="footer"
            className="site-footer-glass pointer-events-auto relative w-full scroll-mt-24 overflow-hidden px-6 py-12 sm:px-10 lg:px-16"
        >
            <style>{`
                @keyframes nameGlow {
                    0%, 100% { text-shadow: 0 0 20px rgba(255, 85, 85, 0.3), 0 0 40px rgba(255, 170, 0, 0.2); }
                    50% { text-shadow: 0 0 30px rgba(255, 85, 85, 0.5), 0 0 60px rgba(255, 170, 0, 0.3); }
                }
                .footer-name {
                    background: linear-gradient(135deg, #ff5555, #ffaa00, #55ff55);
                    background-size: 200% 200%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: nameGlow 3s ease-in-out infinite;
                }
                .footer-link {
                    position: relative;
                    display: inline-block;
                    color: var(--muted-foreground);
                    transition: color 0.3s ease;
                }
                .footer-link::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #ff5555, #ffaa00, #55ff55);
                    transition: width 0.3s ease;
                }
                .footer-link:hover {
                    color: #ffaa00;
                }
                .footer-link:hover::after {
                    width: 100%;
                }
                .site-footer-glass {
                    background: linear-gradient(
                        165deg,
                        color-mix(in oklch, var(--foreground) 14%, transparent),
                        color-mix(in oklch, var(--foreground) 4%, transparent) 40%,
                        color-mix(in oklch, var(--background) 40%, transparent) 100%
                    );
                    backdrop-filter: blur(20px) saturate(1.6);
                    -webkit-backdrop-filter: blur(20px) saturate(1.6);
                    backdrop-filter: blur(6px) saturate(1.6) url(#liquid-glass-distortion);
                    box-shadow:
                        inset 0 1px 1px color-mix(in oklch, var(--foreground) 35%, transparent),
                        inset 0 0 24px color-mix(in oklch, var(--foreground) 8%, transparent),
                        inset 0 -1px 0 color-mix(in oklch, var(--background) 60%, transparent),
                        0 12px 40px -8px rgba(0, 0, 0, 0.55);
                    border: 1px solid color-mix(in oklch, var(--foreground) 18%, transparent);
                }
                .site-footer-glass::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    background: linear-gradient(
                        180deg,
                        color-mix(in oklch, var(--foreground) 22%, transparent),
                        transparent 35%
                    );
                    opacity: 0.5;
                    pointer-events: none;
                }
            `}</style>

            <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
                <div>
                    <p className="footer-name font-minecraft text-xl font-bold">
                        {identity.name} {identity.lastName}
                    </p>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                        {identity.tagline}
                    </p>
                </div>

                <nav aria-label="Site pages">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Site
                    </p>
                    <ul className="mt-3 space-y-2">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="footer-link text-sm"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Connect
                    </p>
                    <ul className="mt-3 space-y-2">
                        <li>
                            <a
                                href="https://github.com/FreezingShock/nateanderson-dev"
                                target="_blank"
                                rel="noreferrer"
                                className="footer-link flex items-center gap-1.5 text-sm"
                            >
                                <Github className="size-4" /> Source on GitHub
                            </a>
                        </li>
                        <li>
                            <Link
                                href="/history"
                                className="footer-link text-sm"
                            >
                                Site changelog
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mx-auto mt-10 flex max-w-6xl flex-col items-start justify-between gap-2 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
                <p>
                    © {new Date().getFullYear()} {identity.name} {identity.lastName}
                </p>
                <p>Built with Next.js, Supabase &amp; Vercel</p>
            </div>
        </footer>
    );
}

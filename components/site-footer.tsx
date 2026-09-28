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
            className="footer-glass pointer-events-auto relative w-full scroll-mt-24 overflow-hidden px-6 py-12 sm:px-10 lg:px-16"
        >
            <style>{`
                @keyframes rainbowShift {
                    0% { background-position: 0% center; }
                    50% { background-position: 100% center; }
                    100% { background-position: 0% center; }
                }
                @keyframes rainbowGlow {
                    0% { filter: drop-shadow(0 0 8px #ff5555) brightness(1.1); }
                    25% { filter: drop-shadow(0 0 12px #ffaa00) brightness(1.15); }
                    50% { filter: drop-shadow(0 0 12px #55ff55) brightness(1.15); }
                    75% { filter: drop-shadow(0 0 12px #55ffff) brightness(1.15); }
                    100% { filter: drop-shadow(0 0 8px #ff5555) brightness(1.1); }
                }
                .footer-name {
                    background: linear-gradient(
                        90deg,
                        #ff5555,
                        #ffaa00,
                        #55ff55,
                        #55ffff,
                        #ff55ff,
                        #ff5555
                    );
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: rainbowShift 4s linear infinite, rainbowGlow 4s ease-in-out infinite;
                }
                .footer-link {
                    position: relative;
                    display: inline-block;
                    transition: color 0.2s ease;
                }
                .footer-link::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 0;
                    height: 2px;
                    transition: width 0.2s ease;
                }
                .footer-link:hover::after {
                    width: 100%;
                }
                /* Essays - Gold */
                .footer-link.essays {
                    color: #ffaa00;
                }
                .footer-link.essays::after {
                    background: #ffaa00;
                }
                /* Research - Green */
                .footer-link.research {
                    color: #55ff55;
                }
                .footer-link.research::after {
                    background: #55ff55;
                }
                /* Poetry - Light Purple */
                .footer-link.poetry {
                    color: #ff55ff;
                }
                .footer-link.poetry::after {
                    background: #ff55ff;
                }
                /* Dev Log - Blue */
                .footer-link.devlog {
                    color: #5555ff;
                }
                .footer-link.devlog::after {
                    background: #5555ff;
                }
                /* Snippets - Aqua */
                .footer-link.snippets {
                    color: #55ffff;
                }
                .footer-link.snippets::after {
                    background: #55ffff;
                }
                /* Timeline - Green */
                .footer-link.timeline {
                    color: #55ff55;
                }
                .footer-link.timeline::after {
                    background: #55ff55;
                }
                /* Creations - Aqua */
                .footer-link.creations {
                    color: #55ffff;
                }
                .footer-link.creations::after {
                    background: #55ffff;
                }
                /* Social links */
                .footer-social-link {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #ffaa00;
                    transition: all 0.2s ease;
                }
                .footer-social-link::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: #ffaa00;
                    transition: width 0.2s ease;
                }
                .footer-social-link:hover {
                    filter: brightness(1.3);
                }
                .footer-social-link:hover::after {
                    width: 100%;
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
                        <li>
                            <Link
                                href="/blog"
                                className="footer-link essays text-sm"
                            >
                                Essays
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/timeline"
                                className="footer-link timeline text-sm"
                            >
                                Timeline
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/creations"
                                className="footer-link creations text-sm"
                            >
                                Creations
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/history"
                                className="footer-link text-sm"
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                Changelog
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Social
                    </p>
                    <ul className="mt-3 space-y-2">
                        <li>
                            <a
                                href="https://github.com/FreezingShock"
                                target="_blank"
                                rel="noreferrer"
                                className="footer-social-link text-sm"
                            >
                                <Github className="size-4" /> GitHub
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://discord.com"
                                target="_blank"
                                rel="noreferrer"
                                className="footer-social-link text-sm"
                            >
                                Discord
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noreferrer"
                                className="footer-social-link text-sm"
                            >
                                Instagram
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://tiktok.com"
                                target="_blank"
                                rel="noreferrer"
                                className="footer-social-link text-sm"
                            >
                                TikTok
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Contact
                    </p>
                    <ul className="mt-3 space-y-2">
                        <li>
                            <a
                                href="mailto:nateanderson36b2@gmail.com"
                                className="footer-social-link text-sm"
                            >
                                Email
                            </a>
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

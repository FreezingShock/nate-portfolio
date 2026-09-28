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
            className="liquid-glass pointer-events-auto w-full scroll-mt-24 overflow-hidden px-6 py-12 sm:px-10 lg:px-16"
        >
            <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
                <div>
                    <p className="font-minecraft text-lg font-semibold text-foreground">
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
                                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
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
                                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                            >
                                <Github className="size-4" /> Source on GitHub
                            </a>
                        </li>
                        <li>
                            <Link
                                href="/history"
                                className="text-sm text-muted-foreground transition-colors hover:text-primary"
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

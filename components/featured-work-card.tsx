import { Fragment } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { mcColorFor } from "@/lib/mc-colors";

// Landing-page Selected Work card. Replaces <BentoCard /> here because that
// one sits in a fixed 22rem-tall grid row: a long description (Fractured
// Islands') filled the row and pushed the "Learn more" button out of view.
// This card sizes to its content instead.
//
// - Title: Minecraft font in the project's accent color.
// - Description: plain gray body text, with the important phrases picked out
//   in Minecraft font + their own Minecraft color code (see KEYWORDS below).
// - "Learn more": hidden until the card is hovered or focused, then a panel
//   slides out from under the card's bottom edge (overlaying the space below,
//   so nothing on the page shifts). On touch devices there is no hover, so
//   the panel is always shown, in flow.
// - MagicCard supplies the cursor-following spotlight highlight.

// Phrases to highlight per project slug, each with a Minecraft color. Text
// comes from Supabase, so this list is matched against it case-insensitively;
// a phrase that isn't in the current text is simply skipped. Projects not
// listed here fall back to highlighting their own tags.
const KEYWORDS: Record<string, [string, string][]> = {
    "fractured-islands": [
        ["solo-built", "var(--mc-gold)"],
        ["Roblox", "var(--mc-aqua)"],
        ["incremental/RPG", "var(--mc-light-purple)"],
        ["stat and attribute systems", "var(--mc-green)"],
        ["100+ attribute progression engine", "var(--mc-yellow)"],
        ["Luau", "var(--mc-blue)"],
    ],
    "topanga-willows": [
        ["architecture", "var(--mc-aqua)"],
        ["sustainable landscape", "var(--mc-green)"],
        ["design philosophy", "var(--mc-light-purple)"],
        ["authenticity", "var(--mc-gold)"],
        ["responsibility", "var(--mc-red)"],
    ],
    "blender-studies": [
        ["Measuring and modeling", "var(--mc-aqua)"],
        ["real places", "var(--mc-gold)"],
        ["greener", "var(--mc-green)"],
        ["more inviting", "var(--mc-yellow)"],
        ["the practice", "var(--mc-light-purple)"],
    ],
};

function escapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlighted({ text, keywords }: { text: string; keywords: [string, string][] }) {
    if (keywords.length === 0) return <>{text}</>;
    // Longest first so "sustainable landscape" wins over a shorter overlap.
    const sorted = [...keywords].sort((a, b) => b[0].length - a[0].length);
    const pattern = new RegExp(`(${sorted.map(([k]) => escapeRegExp(k)).join("|")})`, "gi");
    const colorOf = new Map(sorted.map(([k, c]) => [k.toLowerCase(), c]));

    return (
        <>
            {text.split(pattern).map((part, i) => {
                const color = colorOf.get(part.toLowerCase());
                return color ? (
                    <span
                        key={i}
                        className="font-minecraft"
                        style={{ color, textShadow: `0 0 10px color-mix(in oklch, ${color} 40%, transparent)` }}
                    >
                        {part}
                    </span>
                ) : (
                    <Fragment key={i}>{part}</Fragment>
                );
            })}
        </>
    );
}

export function FeaturedWorkCard({
    slug,
    title,
    description,
    tags,
    href,
    Icon,
    color,
}: {
    slug: string;
    title: string;
    description: string;
    tags: string[];
    href: string;
    Icon: LucideIcon;
    color: string;
}) {
    const keywords: [string, string][] =
        KEYWORDS[slug] ?? tags.map((tag) => [tag, mcColorFor(tag)] as [string, string]);

    return (
        <div className="group/work relative h-full">
            <MagicCard
                className="h-full rounded-xl transition-[border-radius] duration-200 group-hover/work:rounded-b-none group-focus-within/work:rounded-b-none [@media(hover:none)]:rounded-b-none"
                gradientFrom={color}
                gradientTo="var(--chart-4)"
                gradientColor="var(--accent)"
                gradientOpacity={0.6}
            >
                <div className="flex h-full flex-col p-5">
                    <span
                        className="flex size-12 items-center justify-center rounded-xl"
                        style={{
                            color,
                            backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
                            boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 35%, transparent)`,
                        }}
                    >
                        <Icon className="size-6" />
                    </span>

                    <h3
                        className="mt-4 font-minecraft text-xl font-bold leading-tight"
                        style={{ color, textShadow: `0 0 14px color-mix(in oklch, ${color} 45%, transparent)` }}
                    >
                        {title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        <Highlighted text={description} keywords={keywords} />
                    </p>
                </div>
            </MagicCard>

            {/* Whole card is the click target (covers the card only, not the
                slide-out panel, so the button below keeps its own hover). */}
            <Link
                href={href}
                aria-label={`${title} — learn more`}
                className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ outlineColor: color }}
            />

            {/* Slide-out panel. Absolutely positioned just under the card so it
                overlays whatever is below instead of pushing the page down;
                clip-path animates it open from its top edge, with a small
                upward slide-in, so it reads as the card's bottom expanding. */}
            <div
                className="pointer-events-none absolute left-0 right-0 top-full z-20 -translate-y-2 rounded-b-xl border border-t-0 px-5 pb-4 pt-3 opacity-0 transition-[opacity,transform,clip-path] duration-300 ease-out [clip-path:inset(0_0_100%_0)] group-hover/work:pointer-events-auto group-hover/work:translate-y-0 group-hover/work:opacity-100 group-hover/work:[clip-path:inset(0)] group-focus-within/work:pointer-events-auto group-focus-within/work:translate-y-0 group-focus-within/work:opacity-100 group-focus-within/work:[clip-path:inset(0)] [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:static [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:[clip-path:none]"
                style={{
                    borderColor: `color-mix(in oklch, ${color} 55%, transparent)`,
                    backgroundColor: `color-mix(in oklch, ${color} 10%, var(--background))`,
                    boxShadow: `0 14px 30px -14px color-mix(in oklch, ${color} 55%, transparent)`,
                }}
            >
                <Link href={href} tabIndex={-1} className="inline-block">
                    <InteractiveHoverButton
                        accentColor={color}
                        tabIndex={-1}
                        className="font-minecraft text-xs font-bold"
                        style={{
                            color,
                            borderColor: color,
                            backgroundColor: `color-mix(in oklch, ${color} 12%, var(--background))`,
                        }}
                    >
                        Learn more
                    </InteractiveHoverButton>
                </Link>
            </div>
        </div>
    );
}

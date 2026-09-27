"use client";

// TEMPORARY comparison rig — not meant to ship. Lets Nate click through
// three Magic UI text-animation candidates for cycling "Nate" / "Anderson"
// in the same headline slot (no extra page space, no plain-first-name-only
// hero). Remove this file and hardcode the winner once he picks one.

import { useEffect, useState } from "react";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { MorphingText } from "@/components/ui/morphing-text";
import { WordRotate } from "@/components/ui/word-rotate";

const NAMES = ["Nate", "Anderson"];

const options = [
    { id: "dia", label: "Dia Text Reveal (cycling)" },
    { id: "morph", label: "Morphing Text" },
    { id: "rotate", label: "Word Rotate" },
] as const;

// DiaTextReveal's own multi-text mode (`text={array}`) animates the
// container width between measured word widths — with a custom embedded
// font, that measurement raced the font load and clipped "Anderson"'s last
// letter. Driving two single-string instances ourselves (remounted via
// `key` to replay the sweep) sidesteps that entirely: each is a plain,
// unclipped single reveal with natural width.
function DiaCycle() {
    const [i, setI] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setI((v) => (v + 1) % NAMES.length), 3200);
        return () => clearInterval(id);
    }, []);
    return (
        <DiaTextReveal
            key={i}
            text={NAMES[i]}
            duration={1}
            colors={["var(--primary)", "var(--chart-4)"]}
            textColor="var(--foreground)"
            className="font-minecraft"
        />
    );
}

export function NameAnimationPicker() {
    const [choice, setChoice] = useState<(typeof options)[number]["id"]>("dia");

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                {options.map((o) => (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => setChoice(o.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            choice === o.id
                                ? "border-primary bg-primary/15 text-foreground"
                                : "border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>

            <h1 className="flex min-h-[1.2em] items-center justify-center text-6xl font-bold tracking-tight sm:text-7xl">
                {choice === "dia" && <DiaCycle />}
                {choice === "morph" && (
                    // Morphing Text's goo effect is an SVG feColorMatrix
                    // filter on the ALPHA channel — it doesn't compose with
                    // bg-clip-text/text-transparent gradient fill (the fill
                    // just disappears). Solid color only for this one.
                    <MorphingText
                        texts={NAMES}
                        className="!h-auto !max-w-none font-minecraft text-[inherit] leading-none text-foreground"
                    />
                )}
                {choice === "rotate" && (
                    // Same story as Morphing Text: framer-motion animates
                    // this on its own GPU-composited layer (transform +
                    // opacity), and bg-clip-text gradient fill doesn't
                    // survive that compositing in Chromium — renders fully
                    // invisible, not just faded. Solid color only.
                    <WordRotate
                        words={NAMES}
                        duration={2200}
                        className="font-minecraft text-foreground"
                    />
                )}
            </h1>
        </div>
    );
}

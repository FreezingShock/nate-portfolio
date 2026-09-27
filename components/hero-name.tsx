"use client";

// Hero name: Dia Text Reveal plays once on load ("Nate" sweeps in with the
// same gradient as the hero border), then hands off to a center-out 3D
// flip that cycles Nate <-> Anderson forever. Replaces the earlier
// name-animation-picker.tsx comparison rig now that both are picked.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";

const WORDS = ["Nate", "Anderson"];
const REVEAL_DURATION = 1; // seconds, matches DiaTextReveal's `duration` below
const FLIP_INTERVAL = 3200; // ms between word switches once cycling starts
const STAGGER = 0.035; // seconds, per character away from the center

function FlipCycle() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setIndex((v) => (v + 1) % WORDS.length);
        }, FLIP_INTERVAL);
        return () => clearInterval(id);
    }, []);

    const word = WORDS[index];
    const chars = Array.from(word);
    const center = (chars.length - 1) / 2;

    return (
        <span className="inline-flex" style={{ perspective: 600 }}>
            <AnimatePresence mode="wait">
                <motion.span key={word} className="inline-flex">
                    {chars.map((ch, i) => (
                        <motion.span
                            key={i}
                            className="inline-block"
                            style={{ transformStyle: "preserve-3d" }}
                            initial={{ rotateX: -90, opacity: 0 }}
                            animate={{ rotateX: 0, opacity: 1 }}
                            exit={{ rotateX: 90, opacity: 0 }}
                            transition={{
                                duration: 0.4,
                                delay: Math.abs(i - center) * STAGGER,
                                ease: [0.34, 1.56, 0.64, 1],
                            }}
                        >
                            {ch}
                        </motion.span>
                    ))}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

export function HeroName() {
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setRevealed(true), REVEAL_DURATION * 1000 + 200);
        return () => clearTimeout(id);
    }, []);

    return (
        <span className="font-minecraft">
            {revealed ? (
                <FlipCycle />
            ) : (
                <DiaTextReveal
                    text={WORDS[0]}
                    duration={REVEAL_DURATION}
                    colors={["var(--primary)", "var(--chart-4)"]}
                    textColor="var(--foreground)"
                />
            )}
        </span>
    );
}

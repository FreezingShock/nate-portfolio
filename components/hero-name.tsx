"use client";

// Full name, shown together and "multisized" per Nate's brief: "Nate" is
// the big headline (Dia Text Reveal — the loved gradient sweep), "Anderson"
// settles in right after at a smaller scale via a one-time center-out 3D
// flip. Both stay on screen once revealed — this replaced an earlier
// version that cycled Nate <-> Anderson forever, which buried "Anderson"
// half the time instead of showing the full name.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";

const FIRST_NAME = "Nate";
const LAST_NAME = "Anderson";
const REVEAL_DURATION = 1; // seconds — DiaTextReveal's sweep length for "Nate"
const LAST_NAME_DELAY = REVEAL_DURATION * 1000 + 150; // start right as "Nate" settles
const STAGGER = 0.035; // seconds, per character away from the center

function LastNameFlipIn() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setShow(true), LAST_NAME_DELAY);
        return () => clearTimeout(id);
    }, []);

    const chars = Array.from(LAST_NAME);
    const center = (chars.length - 1) / 2;

    return (
        <span className="inline-flex" style={{ perspective: 600 }}>
            {chars.map((ch, i) => (
                <motion.span
                    key={i}
                    className="inline-block"
                    style={{ transformStyle: "preserve-3d" }}
                    initial={{ rotateX: -90, opacity: 0 }}
                    animate={show ? { rotateX: 0, opacity: 1 } : undefined}
                    transition={{
                        duration: 0.4,
                        delay: Math.abs(i - center) * STAGGER,
                        ease: [0.34, 1.56, 0.64, 1],
                    }}
                >
                    {ch}
                </motion.span>
            ))}
        </span>
    );
}

export function HeroFirstName() {
    return (
        <DiaTextReveal
            text={FIRST_NAME}
            duration={REVEAL_DURATION}
            colors={["var(--primary)", "var(--chart-4)"]}
            textColor="var(--foreground)"
            className="font-minecraft"
        />
    );
}

export function HeroLastName() {
    return (
        <span className="font-minecraft" style={{ color: "var(--chart-4)" }}>
            <LastNameFlipIn />
        </span>
    );
}

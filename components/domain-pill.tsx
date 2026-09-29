"use client";

import { useEffect, useState } from "react";
import { ShineBorder } from "@/components/ui/shine-border";

const DOMAIN = "nateanderson.dev";
const START_DELAY = 300; // ms before the first character
const TYPE_SPEED = 75; // ms per character
const RAINBOW = ["#ff5555", "#ffaa00", "#55ff55", "#55ffff", "#ff55ff"];

/**
 * Landing-page domain chip. The full domain is always laid out (untyped
 * letters are just transparent), so the pill never changes size or shifts
 * the layout while it writes itself in.
 */
export function DomainPill() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let i = 0;
        let interval: ReturnType<typeof setInterval> | undefined;
        const start = setTimeout(() => {
            interval = setInterval(() => {
                i += 1;
                setCount(i);
                if (i >= DOMAIN.length && interval) clearInterval(interval);
            }, TYPE_SPEED);
        }, START_DELAY);
        return () => {
            clearTimeout(start);
            if (interval) clearInterval(interval);
        };
    }, []);

    const typing = count < DOMAIN.length;

    return (
        <div
            aria-label={DOMAIN}
            className="relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-background/50 px-5 py-2 font-mono text-sm leading-none shadow-[0_0_24px_-6px_rgba(255,170,0,0.35)] backdrop-blur-md sm:text-base"
        >
            <ShineBorder borderWidth={1.5} duration={8} shineColor={RAINBOW} />
            <span
                aria-hidden="true"
                className="dot-blink size-2 rounded-full bg-[#55ff55]"
                style={{ boxShadow: "0 0 10px #55ff55" }}
            />
            <span aria-hidden="true" className="rainbow-text font-semibold tracking-wide">
                {Array.from(DOMAIN).map((ch, i) => (
                    <span key={i} style={{ opacity: i < count ? 1 : 0 }}>
                        {ch}
                    </span>
                ))}
                {typing && (
                    <span className="cursor-blink -ml-[0.4ch] inline-block w-[0.6ch]">▌</span>
                )}
            </span>
        </div>
    );
}

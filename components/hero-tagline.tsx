"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TAGLINES = [
    "Building games, renders, and systems — studying toward environmental engineering.",
    "Currently shipping Fractured Islands: Ascension, a Roblox progression game built in Luau.",
    "Senior year now, Santa Monica College next, then Cal Poly Pomona for civil engineering.",
    "I reimagine real places in 3D — renovation studies measured, modeled, and redesigned.",
    "Cross country runner chasing faster miles and a spot on a college team.",
    "Kierkegaard, agnosticism, and egg theory shape how I think about design.",
    "Every stat, menu, and attribute in my games is a system that has to fit together.",
    "This site is a living project — the Minecraft colors and symbols are on purpose.",
    "Long-term goal: a sustainable infrastructure and urban design business by 2031.",
    "Click me to keep going — there's more on the About page if you're curious.",
];

const TYPE_SPEED = 28; // ms per character
const HOLD = 5200; // ms to read a finished line before auto-advancing
const LONGEST = TAGLINES.reduce((a, b) => (b.length > a.length ? b : a));

/** Gray, self-typing tagline. Auto-rotates; click (or Enter/Space) skips ahead. */
export function HeroTagline() {
    const [index, setIndex] = useState(0);
    const [count, setCount] = useState(0);
    const reduced = useRef(false);

    const text = TAGLINES[index];
    const done = count >= text.length;

    useEffect(() => {
        reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }, []);

    // type the current line in
    useEffect(() => {
        if (reduced.current) {
            setCount(text.length);
            return;
        }
        setCount(0);
        let i = 0;
        const start = setTimeout(() => {
            const id = setInterval(() => {
                i += 1;
                setCount(i);
                if (i >= text.length) clearInterval(id);
            }, TYPE_SPEED);
            cleanup = () => clearInterval(id);
        }, 350);
        let cleanup = () => {};
        return () => {
            clearTimeout(start);
            cleanup();
        };
    }, [index, text]);

    // after a line is fully written, wait, then move on
    useEffect(() => {
        if (!done) return;
        const id = setTimeout(() => setIndex((n) => (n + 1) % TAGLINES.length), HOLD);
        return () => clearTimeout(id);
    }, [done, index]);

    const next = useCallback(() => setIndex((n) => (n + 1) % TAGLINES.length), []);

    return (
        <button
            type="button"
            onClick={next}
            aria-label={text}
            className="group mx-auto mt-5 block max-w-xl cursor-pointer text-center outline-none"
        >
            {/* Reserve the tallest line's height so nothing below jumps. */}
            <span className="relative block text-lg text-neutral-400 transition-opacity duration-300 group-hover:opacity-25 group-focus-visible:opacity-25">
                <span aria-hidden="true" className="invisible block">
                    {LONGEST}
                </span>
                <span aria-hidden="true" className="absolute inset-0 block">
                    {text.slice(0, count)}
                    <span className={`ml-0.5 inline-block w-[0.55ch] bg-neutral-400 align-[-0.1em] ${done ? "cursor-blink" : ""}`}>
                        &nbsp;
                    </span>
                </span>
            </span>
</button>
    );
}

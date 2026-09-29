"use client";

import { useRef, type CSSProperties, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// A lightweight Magic-UI-style spotlight card. The stock <MagicCard /> runs
// framer-motion springs, a theme hook and three window listeners PER CARD —
// fine for a few cards, but this is used a dozen-plus times on the landing
// page. This one does the same "spotlight follows the cursor + border lights
// up" effect with plain CSS: pointermove only writes two CSS variables
// (throttled to one write per frame) on the hovered card, and everything
// visual (gradient, border ring, lift, glow) is CSS in globals.css. No React
// re-renders, no listeners on window, nothing runs while the cursor is away.
export function GlowCard({
    color,
    className,
    children,
    ...props
}: { color: string } & HTMLAttributes<HTMLDivElement>) {
    const ref = useRef<HTMLDivElement>(null);
    const frame = useRef(0);

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        const el = ref.current;
        if (!el || frame.current) return;
        const { clientX, clientY } = event;
        frame.current = requestAnimationFrame(() => {
            frame.current = 0;
            const rect = el.getBoundingClientRect();
            el.style.setProperty("--mx", `${clientX - rect.left}px`);
            el.style.setProperty("--my", `${clientY - rect.top}px`);
        });
    }

    return (
        <div
            ref={ref}
            onPointerMove={handlePointerMove}
            className={cn("glow-card", className)}
            style={{ "--gc": color, ...props.style } as CSSProperties}
            {...props}
        >
            {children}
        </div>
    );
}

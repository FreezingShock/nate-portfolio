"use client";

import { useEffect, useMemo, useRef } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { MINIONS } from "@/lib/fractured-idle/data";

// Owned minions circle the big button: the lower half of the ellipse is in
// front of it, the upper half passes behind. One icon per few minions of a
// type (up to 6), spread over three rings. A single rAF loop writes
// transforms directly to the DOM, so orbiting never touches React.

const RINGS = [
    { scale: 1, speed: 0.32 },
    { scale: 0.86, speed: -0.26 },
    { scale: 0.72, speed: 0.2 },
];
const TILT = 0.4;
const ICON = 26;

export const iconsFor = (owned: number) =>
    owned <= 0 ? 0 : Math.min(6, 1 + Math.floor(Math.log2(owned) / 1.5));

export function Orbit({ counts }: { counts: number[] }) {
    const box = useRef<HTMLDivElement>(null);
    const els = useRef<(HTMLSpanElement | null)[]>([]);
    const key = counts.map(iconsFor).join(",");

    const items = useMemo(() => {
        const list: { type: number; ring: number; phase: number; first: boolean }[] = [];
        key.split(",").forEach((n, type) => {
            for (let k = 0; k < Number(n); k++) {
                list.push({
                    type,
                    ring: (type + k) % RINGS.length,
                    // Golden-angle spacing keeps icons evenly spread as more appear.
                    phase: (list.length * 2.399963) % (Math.PI * 2),
                    first: k === 0,
                });
            }
        });
        return list;
    }, [key]);

    useEffect(() => {
        const el = box.current;
        if (!el) return;
        let rx = el.clientWidth / 2 - ICON / 2;
        const ro = new ResizeObserver(() => {
            rx = el.clientWidth / 2 - ICON / 2;
        });
        ro.observe(el);

        const front: boolean[] = [];
        const paint = (t: number) => {
            for (let i = 0; i < items.length; i++) {
                const node = els.current[i];
                if (!node) continue;
                const it = items[i];
                const ring = RINGS[it.ring];
                const a = it.phase + t * ring.speed * Math.PI * 2;
                const sin = Math.sin(a);
                const x = Math.cos(a) * rx * ring.scale;
                const y = sin * rx * TILT * ring.scale;
                const sc = 0.72 + 0.28 * ((sin + 1) / 2);
                node.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
                const isFront = sin > 0;
                if (front[i] !== isFront) {
                    front[i] = isFront;
                    node.style.zIndex = isFront ? "3" : "0";
                    node.style.opacity = isFront ? "1" : "0.7";
                }
            }
        };

        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let raf = 0;
        const start = performance.now();
        const loop = (now: number) => {
            paint((now - start) / 1000);
            raf = requestAnimationFrame(loop);
        };
        paint(0);
        if (!still) raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [items]);

    return (
        <div ref={box} className="pointer-events-none absolute -inset-14" aria-hidden="true">
            {items.map((it, i) => {
                const m = MINIONS[it.type];
                return (
                    <span
                        key={`${it.type}-${i}`}
                        ref={(n) => {
                            els.current[i] = n;
                        }}
                        className="absolute left-1/2 top-1/2 grid place-items-center rounded-full text-[13px] will-change-transform"
                        style={{
                            width: ICON,
                            height: ICON,
                            marginLeft: -ICON / 2,
                            marginTop: -ICON / 2,
                            color: m.color,
                            backgroundColor: "color-mix(in oklch, var(--background) 70%, transparent)",
                            boxShadow: `inset 0 0 0 1.5px ${m.color}, 0 0 10px -2px ${m.color}`,
                        }}
                    >
                        <McSymbol name={m.symbol} />
                    </span>
                );
            })}
        </div>
    );
}

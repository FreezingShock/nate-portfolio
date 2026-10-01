"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { armSound } from "@/lib/sound/engine";
import { sfx, type SfxName } from "@/lib/sound/sounds";

// Site-wide interface sound. One delegated listener turns clicks on buttons, tabs, switches and menus into the soft
// tones from lib/sound, so no component needs wiring. Opt an element (and everything in it) out with data-snd="off",
// force a specific sound with data-snd="buy" (any catalogue name), or ask for a hover tick with data-snd-hover.
// Internal links stay silent on click and the route change plays one soft "nav" tone instead.

const HIT = 'button, a[href], summary, [role="tab"], [role="switch"], [role="checkbox"], [role="menuitem"], [role="option"], [role="radio"], input[type="checkbox"], input[type="radio"], [data-snd]';

function pickSound(el: HTMLElement): SfxName | null {
    const forced = el.closest("[data-snd]")?.getAttribute("data-snd");
    if (forced === "off") return null;
    if (forced) return forced as SfxName;
    if (el.closest('[data-snd="off"]')) return null;
    if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return null;
    const role = el.getAttribute("role");
    if (role === "tab") return "tab";
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return el.checked ? "on" : "off";
    if (role === "switch" || role === "checkbox") return el.getAttribute("aria-checked") === "true" ? "off" : "on";
    const ex = el.getAttribute("aria-expanded");
    if (ex !== null) return ex === "true" ? "close" : "open";
    if (el instanceof HTMLAnchorElement) {
        const href = el.getAttribute("href") ?? "";
        const internal = el.origin === location.origin && el.target !== "_blank" && !el.hasAttribute("download");
        if (internal && !href.startsWith("#")) return null; // the route change plays the nav tone
    }
    return "tap";
}

export function SoundProvider() {
    const path = usePathname();
    const first = useRef(true);

    useEffect(() => {
        armSound();
        const onClick = (e: MouseEvent) => {
            if (!(e.target instanceof Element)) return;
            const el = e.target.closest<HTMLElement>(HIT);
            if (!el) return;
            const name = pickSound(el);
            if (name) setTimeout(() => sfx(name), 0); // after the click's own handlers, so a purchase can outrank the tap
        };
        let over: Element | null = null;
        const onOver = (e: PointerEvent) => {
            if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
            const el = e.target.closest("[data-snd-hover]");
            if (el === over) return;
            over = el;
            if (el) sfx("hover");
        };
        document.addEventListener("click", onClick, true);
        document.addEventListener("pointerover", onOver, true);
        return () => {
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("pointerover", onOver, true);
        };
    }, []);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        sfx("nav");
    }, [path]);

    return null;
}

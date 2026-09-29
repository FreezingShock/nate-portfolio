"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PAGE_TRANSITION } from "@/lib/page-transition";

// Site-wide page transitions. Mounted ONCE in the root layout, so it survives
// every navigation — that matters: an earlier version put this logic inside a
// per-link component, and because the link lives on the OLD page it was
// unmounted the moment the route changed, so its "the new page rendered"
// signal never fired and every transition sat frozen until a 2.5s timeout.
//
// How it works: a capture-phase click listener on the document catches every
// internal link click. It cancels the browser/Next default, opens a View
// Transition (a snapshot of the current page), calls router.push inside it,
// and finishes the transition once this component sees the pathname change.
// The animation itself is played with the Web Animations API on the
// transition's pseudo-elements, driven by lib/page-transition.ts.
//
// Speed: a hover/focus/touch-start on any link prefetches its route, so by
// the time a click completes the destination is usually already loaded and
// the transition starts on the very next frame.

// Resolves the in-flight transition once the destination has rendered.
let pending: (() => void) | null = null;

const prefetched = new Set<string>();

function internalAnchor(target: EventTarget | null): HTMLAnchorElement | null {
    const anchor = (target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return null;
    if (anchor.target && anchor.target !== "_self") return null;
    if (anchor.hasAttribute("download") || anchor.dataset.noTransition !== undefined) return null;
    if (anchor.origin !== window.location.origin) return null;
    return anchor;
}

function play(
    style: string,
    x: number,
    y: number,
    duration: number,
    easing: string,
    depth: number
) {
    const root = document.documentElement;
    const options = (pseudoElement: string): KeyframeAnimationOptions => ({
        duration,
        easing,
        fill: "forwards",
        pseudoElement,
    });
    const NEW = "::view-transition-new(root)";
    const OLD = "::view-transition-old(root)";

    if (style === "circle") {
        const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );
        root.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${radius}px at ${x}px ${y}px)`,
                ],
            },
            options(NEW)
        );
        root.animate(
            { transform: ["scale(1)", `scale(${depth})`], opacity: [1, 0.6] },
            options(OLD)
        );
    } else if (style === "zoom") {
        root.animate({ transform: ["scale(1)", "scale(1.08)"], opacity: [1, 0] }, options(OLD));
        root.animate(
            { transform: ["scale(0.96)", "scale(1)"], opacity: [0, 1] },
            options(NEW)
        );
    } else if (style === "wipe") {
        root.animate({ clipPath: ["inset(100% 0 0 0)", "inset(0 0 0 0)"] }, options(NEW));
    } else {
        // fade
        root.animate({ opacity: [0, 1] }, options(NEW));
    }
}

export function PageTransitions() {
    const router = useRouter();
    const pathname = usePathname();
    const routerRef = useRef(router);
    routerRef.current = router;

    // The destination rendered: finish the transition's update step right
    // away. This must NOT wait on requestAnimationFrame — while a View
    // Transition is waiting for its callback the browser suppresses
    // rendering, rAF included, so waiting a frame here would deadlock until
    // the timeout. It doesn't need to: Next.js resets the scroll position in
    // a layout-phase lifecycle of the new segment, which has already run
    // before this passive effect, and the browser captures the "new"
    // snapshot on its next frame after we resolve.
    useEffect(() => {
        if (!pending) return;
        const done = pending;
        pending = null;
        done();
    }, [pathname]);

    useEffect(() => {
        const root = document.documentElement;

        function prefetch(event: Event) {
            const anchor = internalAnchor(event.target);
            if (!anchor) return;
            const href = anchor.pathname + anchor.search;
            if (prefetched.has(href) || href === window.location.pathname + window.location.search) return;
            prefetched.add(href);
            routerRef.current.prefetch(href);
        }

        function onClick(event: MouseEvent) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }
            const anchor = internalAnchor(event.target);
            if (!anchor) return;

            const samePage =
                anchor.pathname === window.location.pathname &&
                anchor.search === window.location.search;
            const { style, duration, easing, oldPageDepth, timeoutMs } = PAGE_TRANSITION;
            if (
                samePage ||
                style === "none" ||
                typeof document.startViewTransition !== "function" ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                root.dataset.pageVt ||
                root.dataset.magicuiThemeVt
            ) {
                return; // let Next.js navigate normally, instantly
            }

            // Cancel the default so Next's own click handler stands down; we
            // navigate ourselves inside the transition. (Not stopping
            // propagation: other click handlers, like the nav bubble closing
            // itself, still need to run.)
            event.preventDefault();

            // Keyboard activation reports 0,0 — start from the link's center.
            let x = event.clientX;
            let y = event.clientY;
            if (event.detail === 0 || (x === 0 && y === 0)) {
                const rect = anchor.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }

            // Pin the new page's starting state in CSS so it never flashes
            // fully visible for a frame before the animation takes over.
            root.dataset.pageVt = style;
            root.style.setProperty("--magicui-theme-vt-clip-from", `circle(0px at ${x}px ${y}px)`);
            if (style === "wipe") {
                root.style.setProperty("--magicui-theme-vt-clip-from", "inset(100% 0 0 0)");
            }

            const target = anchor.pathname + anchor.search + anchor.hash;
            const transition = document.startViewTransition(
                () =>
                    new Promise<void>((resolve) => {
                        const timeout = setTimeout(() => {
                            pending = null;
                            resolve();
                        }, timeoutMs);
                        pending = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        routerRef.current.push(target);
                    })
            );

            transition.ready
                .then(() => play(style, x, y, duration, easing, oldPageDepth))
                .catch(() => {});
            transition.finished
                .catch(() => {})
                .finally(() => {
                    delete root.dataset.pageVt;
                    root.style.removeProperty("--magicui-theme-vt-clip-from");
                });
        }

        // Capture phase so we see the click before Next's Link handler.
        document.addEventListener("click", onClick, true);
        document.addEventListener("pointerover", prefetch, true);
        document.addEventListener("focusin", prefetch, true);
        document.addEventListener("touchstart", prefetch, { capture: true, passive: true });
        return () => {
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("pointerover", prefetch, true);
            document.removeEventListener("focusin", prefetch, true);
            document.removeEventListener("touchstart", prefetch, true);
        };
    }, []);

    return null;
}

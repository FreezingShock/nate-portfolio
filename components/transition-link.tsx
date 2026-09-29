"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// A <Link> that navigates with a circle-reveal View Transition growing from
// the exact point you clicked — the same effect (and the same global CSS
// hooks in globals.css) as the animated theme toggler. The new page's
// snapshot is clipped to a circle that expands from the cursor until it
// covers the screen.
//
// Falls back to a normal instant <Link> navigation whenever the effect isn't
// safe or possible: no View Transitions support, reduced-motion preference,
// a modified click (new tab etc.), or a link that stays on the current path.
const DURATION_MS = 650;

export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
    const router = useRouter();
    const pathname = usePathname();
    const finish = useRef<(() => void) | null>(null);

    // Resolve the transition once the new route has actually rendered, so the
    // "new" snapshot is the destination page, not the old one.
    useEffect(() => {
        if (!finish.current) return;
        const done = finish.current;
        finish.current = null;
        requestAnimationFrame(() => requestAnimationFrame(done));
    }, [pathname]);

    function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
        onClick?.(event);
        const target = typeof href === "string" ? href : href.pathname ?? "";
        const path = target.split("#")[0].split("?")[0];
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            typeof document.startViewTransition !== "function" ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            !path ||
            path === pathname
        ) {
            return;
        }

        event.preventDefault();
        const { clientX: x, clientY: y } = event;
        const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );
        const clip = [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`];
        const root = document.documentElement;
        root.style.setProperty("--magicui-theme-vt-clip-from", clip[0]);

        const transition = document.startViewTransition(
            () =>
                new Promise<void>((resolve) => {
                    // Safety net: never leave the page frozen if the route
                    // is slow or fails to change.
                    const timeout = setTimeout(resolve, 2500);
                    finish.current = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                    router.push(target);
                })
        );
        transition.ready
            .then(() => {
                root.animate(
                    { clipPath: clip },
                    {
                        duration: DURATION_MS,
                        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                        fill: "forwards",
                        pseudoElement: "::view-transition-new(root)",
                    }
                );
            })
            .catch(() => {});
        transition.finished
            .finally(() => root.style.removeProperty("--magicui-theme-vt-clip-from"))
            .catch(() => {});
    }

    return <Link href={href} onClick={handleClick} {...props} />;
}

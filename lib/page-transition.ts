// Site-wide page transition settings. Everything about how a page change
// looks and feels is controlled from this one object — edit a value here and
// every link on the site (Dock, footer, nav bubble, buttons, cards) follows.
//
// style
//   "circle" — the new page opens as a circle growing from the exact point
//              you clicked, while the old page drifts back slightly (default)
//   "zoom"   — the old page pushes toward you and fades as the new one
//              settles in from slightly behind
//   "wipe"   — the new page sweeps up from the bottom edge
//   "fade"   — a plain, quick cross-fade
//   "none"   — no transition; links navigate instantly
//
// duration  — milliseconds the animation takes. ~350 feels snappy, ~500
//             feels smooth and deliberate, 700+ starts to feel slow.
// easing    — CSS timing function. The default is a fast-start "ease-out
//             expo": it reacts the instant you click and settles gently.
//             Other good ones: "cubic-bezier(0.65, 0, 0.35, 1)" (ease
//             in-out, more dramatic), "ease-out", "linear".
// oldPageDepth — for "circle": how far the outgoing page scales back
//             (1 = none, 1.05 = subtle parallax, 1.12 = strong).
// timeoutMs — how long to wait for the destination to be ready before
//             giving up on the transition and just navigating. Only reached
//             on a very slow route; normal navigations never wait on it.
export const PAGE_TRANSITION = {
    style: "circle" as "circle" | "zoom" | "wipe" | "fade" | "none",
    duration: 500,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    oldPageDepth: 1.05,
    timeoutMs: 1500,
};

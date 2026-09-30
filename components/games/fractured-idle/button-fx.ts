// DOM effects for the click button: flying numbers and click bursts. They are
// plain elements driven by the Web Animations API and removed when they end,
// so clicking (or holding at 10 clicks/s) never waits on React.

export const CRIT_BLUE = "#5cc8ff";
const MAX_PARTS = 80;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function add(host: HTMLElement, el: HTMLElement, frames: Keyframe[], dur: number, easing = "linear") {
    while (host.childElementCount > MAX_PARTS) host.firstElementChild?.remove();
    host.appendChild(el);
    const a = el.animate(frames, { duration: dur, easing, fill: "forwards" });
    a.onfinish = () => el.remove();
}

const part = (cls: string, css: Partial<CSSStyleDeclaration> = {}) => {
    const el = document.createElement("span");
    el.className = cls;
    Object.assign(el.style, css);
    return el;
};

/** Points along a parabola, for fake gravity: y(t) = -vy*t + g*t^2/2. */
function arc(x: number, y: number, vx: number, vy: number, g: number, dur: number, tail: (f: number) => string, steps = 14, fade = 0.65): Keyframe[] {
    const out: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const t = (f * dur) / 1000;
        out.push({
            offset: f,
            transform: `translate(${(x + vx * t).toFixed(1)}px,${(y - vy * t + 0.5 * g * t * t).toFixed(1)}px) ${tail(f)}`,
            opacity: f < fade ? 1 : 1 - (f - fade) / (1 - fade),
        });
    }
    return out;
}

let side = 1;

/** The number that pops off a click: rises, then falls off to one side of the cursor. */
export function spawnNumber(host: HTMLElement, x: number, y: number, text: string, crit: boolean) {
    if (Math.random() > 0.15) side = -side; // mostly alternate, so both sides fill up
    const dur = crit ? 1300 : 950;
    const dx = side * (crit ? rand(90, 150) : rand(45, 90));
    const vy = crit ? rand(430, 500) : rand(330, 380);
    const g = crit ? 900 : 880;
    const tilt = side * (crit ? rand(8, 16) : rand(3, 8));
    const el = part(crit ? "fi-num fi-num-crit" : "fi-num");
    el.textContent = text;
    if (reduced()) {
        add(host, el, [{ transform: `translate(${x}px,${y - 30}px) translate(-50%,-50%)`, opacity: 1 }, { transform: `translate(${x}px,${y - 40}px) translate(-50%,-50%)`, opacity: 0 }], 500);
        return;
    }
    const tail = (f: number) => {
        const sc = crit ? 0.55 + 0.75 * Math.min(1, f * 7) : 0.7 + 0.35 * Math.min(1, f * 8);
        return `translate(-50%,-50%) rotate(${(tilt * f).toFixed(1)}deg) scale(${sc.toFixed(2)})`;
    };
    add(host, el, arc(x, y, dx / (dur / 1000), vy, g, dur, tail, 16, crit ? 0.7 : 0.6), dur);
}

function ring(host: HTMLElement, x: number, y: number, color: string, size: number, to: number, dur: number, width = 2, glow = false) {
    const el = part("fi-part", {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: `${width}px solid ${color}`,
        boxShadow: glow ? `0 0 14px ${color}, inset 0 0 12px ${color}` : "none",
    });
    add(
        host,
        el,
        [
            { transform: `translate(${x}px,${y}px) translate(-50%,-50%) scale(.3)`, opacity: 0.9 },
            { transform: `translate(${x}px,${y}px) translate(-50%,-50%) scale(${to})`, opacity: 0 },
        ],
        dur,
        "cubic-bezier(.1,.7,.3,1)",
    );
}

function sparks(host: HTMLElement, x: number, y: number, color: string, n: number, min: number, max: number, dur: number, len = 10) {
    const off = rand(0, 360);
    for (let i = 0; i < n; i++) {
        const a = ((off + (360 / n) * i + rand(-10, 10)) * Math.PI) / 180;
        const d0 = rand(min, max);
        const el = part("fi-part", { width: `${len}px`, height: "2px", borderRadius: "2px", background: color, boxShadow: `0 0 6px ${color}` });
        const rot = `rotate(${a}rad)`;
        add(
            host,
            el,
            [
                { transform: `translate(${x + Math.cos(a) * d0 * 0.3}px,${y + Math.sin(a) * d0 * 0.3}px) translate(-50%,-50%) ${rot} scaleX(1)`, opacity: 1 },
                { transform: `translate(${x + Math.cos(a) * d0}px,${y + Math.sin(a) * d0}px) translate(-50%,-50%) ${rot} scaleX(.2)`, opacity: 0 },
            ],
            dur,
            "cubic-bezier(.1,.7,.3,1)",
        );
    }
}

function glyphs(host: HTMLElement, x: number, y: number, chars: string[], colors: string[], n: number) {
    for (let i = 0; i < n; i++) {
        const el = part("fi-part", { fontFamily: "var(--font-minecraft, inherit)", fontSize: `${rand(11, 18)}px`, color: colors[i % colors.length], textShadow: "0 0 8px currentColor", lineHeight: "1" });
        el.textContent = chars[i % chars.length];
        const dx = rand(-70, 70);
        const spin = rand(-200, 200);
        const dur = rand(650, 850);
        add(host, el, arc(x, y, dx / (dur / 1000), rand(130, 230), 620, dur, (f) => `translate(-50%,-50%) rotate(${(spin * f).toFixed(0)}deg)`, 10, 0.5), dur);
    }
}

function confetti(host: HTMLElement, x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
        const c = `hsl(${Math.floor(rand(0, 360))} 95% 62%)`;
        const el = part("fi-part", { width: "5px", height: "9px", background: c, borderRadius: "1px" });
        const dur = rand(800, 1000);
        const spin = rand(-540, 540);
        add(host, el, arc(x, y, rand(-130, 130), rand(200, 340), 900, dur, (f) => `translate(-50%,-50%) rotate(${(spin * f).toFixed(0)}deg)`, 12, 0.55), dur);
    }
}

function risers(host: HTMLElement, x: number, y: number, n: number, kind: "embers" | "bubbles") {
    for (let i = 0; i < n; i++) {
        const ember = kind === "embers";
        const s = ember ? rand(3, 6) : rand(6, 12);
        const el = part("fi-part", {
            width: `${s}px`,
            height: `${s}px`,
            borderRadius: "50%",
            background: ember ? `hsl(${Math.floor(rand(15, 45))} 100% 58%)` : "rgba(140,230,255,.18)",
            border: ember ? "none" : "1.5px solid rgba(160,240,255,.85)",
            boxShadow: ember ? "0 0 8px #ff7a1a" : "inset -2px -2px 3px rgba(255,255,255,.4)",
        });
        const dur = rand(700, 1000);
        const up = rand(55, 115);
        const x0 = x + rand(-22, 22);
        const w = rand(6, 16) * (Math.random() < 0.5 ? -1 : 1);
        const frames: Keyframe[] = [];
        for (let k = 0; k <= 8; k++) {
            const f = k / 8;
            frames.push({
                offset: f,
                transform: `translate(${(x0 + Math.sin(f * 6 + i) * w).toFixed(1)}px,${(y - up * f).toFixed(1)}px) translate(-50%,-50%) scale(${ember ? 1 - f * 0.7 : 0.6 + f * 0.7})`,
                opacity: f < 0.5 ? 1 : 1 - (f - 0.5) * 2,
            });
        }
        add(host, el, frames, dur, "ease-out");
    }
}

/** The effect chosen in the Button tab, plus an extra blue blast on crits. */
export function spawnBurst(host: HTMLElement, kind: string, x: number, y: number, color: string, crit: boolean) {
    if (reduced()) return;
    switch (kind) {
        case "sparks":
            sparks(host, x, y, color, 9, 34, 64, 420);
            break;
        case "stars":
            glyphs(host, x, y, ["✦", "✧", "✦"], ["#fff3a8", "#ffe066", color], 5);
            break;
        case "confetti":
            confetti(host, x, y, 12);
            break;
        case "embers":
            risers(host, x, y, 6, "embers");
            break;
        case "bubbles":
            risers(host, x, y, 5, "bubbles");
            break;
        case "shock":
            ring(host, x, y, color, 40, 4.5, 520, 3, true);
            ring(host, x, y, "#ffffff", 30, 6.5, 640, 1.5);
            break;
        default:
            ring(host, x, y, color, 36, 3.2, 440, 2.5);
    }
    if (crit) {
        ring(host, x, y, CRIT_BLUE, 44, 5.5, 600, 3, true);
        sparks(host, x, y, CRIT_BLUE, 12, 50, 96, 520, 14);
    }
}

/** Squash-and-rebound on the button itself (Web Animations, so holds can retrigger it every tick). */
export function kick(el: HTMLElement | null, crit: boolean, heat: number) {
    if (!el || reduced()) return;
    const dip = 5 + (crit ? 2 : 0);
    const over = crit ? 1.08 : 1.03 + heat * 0.01;
    el.animate(
        [
            { transform: "translateY(0) scale(1)" },
            { transform: `translateY(${dip}px) scale(${crit ? 0.93 : 0.96})`, offset: 0.25 },
            { transform: `translateY(-1px) scale(${over})`, offset: 0.65 },
            { transform: "translateY(0) scale(1)" },
        ],
        { duration: crit ? 230 : 150, easing: "ease-out" },
    );
}

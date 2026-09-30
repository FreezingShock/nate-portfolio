// DOM effects for enchanting: the roll ritual (charge and reveal), full-screen
// flashes for big pulls, dust motes, and the click procs from Button enchants
// (Lightning, Midas Touch, Echo). Plain elements driven by the Web Animations
// API, removed when they end. Coordinates are px inside the host element.

import { RARITIES } from "@/lib/fractured-idle/enchant";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const RAINBOW = ["#ff5f5f", "#ffb35f", "#fff35f", "#6fff5f", "#5fffe6", "#5f8bff", "#c05fff", "#ff5fd2"];

let alive = 0;
const MAX_ALIVE = 160;

function spawn(host: HTMLElement, el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    if (alive >= MAX_ALIVE) return;
    alive++;
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.top = "0";
    el.style.pointerEvents = "none";
    el.style.willChange = "transform,opacity";
    host.appendChild(el);
    const done = () => {
        alive--;
        el.remove();
    };
    const a = el.animate(frames, { fill: "forwards", ...opts });
    a.onfinish = done;
    a.oncancel = done;
}

const el = (css: Partial<CSSStyleDeclaration>, text?: string) => {
    const e = document.createElement("span");
    Object.assign(e.style, css);
    if (text) e.textContent = text;
    return e;
};
const at = (x: number, y: number, tail = "") => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) ${tail}`;
const colorAt = (r: number, i = 0) => (r >= RARITIES.length - 1 ? RAINBOW[i % RAINBOW.length] : RARITIES[r].color);

/** Expanding ring. */
export function ring(host: HTMLElement, x: number, y: number, color: string, size: number, to: number, dur: number, width = 3, delay = 0) {
    spawn(
        host,
        el({ width: `${size}px`, height: `${size}px`, borderRadius: "50%", border: `${width}px solid ${color}`, boxShadow: `0 0 18px ${color}, inset 0 0 14px ${color}` }),
        [{ transform: at(x, y, "scale(.2)"), opacity: 0.95 }, { transform: at(x, y, `scale(${to})`), opacity: 0 }],
        { duration: dur, easing: "cubic-bezier(.1,.7,.3,1)", delay },
    );
}

/** Motes spiraling in to the center while a roll charges. */
export function chargeFx(host: HTMLElement, x: number, y: number, r: number, ms: number) {
    if (reduced()) return;
    const n = Math.min(34, 8 + r * 4 + Math.round(ms / 160));
    for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const d = rand(70, 150);
        const t = rand(0.35, 1) * ms;
        const c = colorAt(Math.max(r, 1), i);
        const sz = rand(3, 6);
        spawn(
            host,
            el({ width: `${sz}px`, height: `${sz}px`, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}` }),
            [
                { transform: at(x + Math.cos(a) * d, y + Math.sin(a) * d, "scale(.3)"), opacity: 0 },
                { transform: at(x + Math.cos(a + 1.1) * d * 0.55, y + Math.sin(a + 1.1) * d * 0.55), opacity: 1, offset: 0.55 },
                { transform: at(x, y, "scale(1.4)"), opacity: 0 },
            ],
            { duration: t, delay: rand(0, ms * 0.5), easing: "ease-in" },
        );
    }
}

/** The pull lands. Bigger rarities add rings, sparks, beams and more. */
export function revealFx(host: HTMLElement, x: number, y: number, r: number) {
    if (reduced()) return;
    const color = colorAt(r);
    const big = r >= 4;
    // core flash
    spawn(
        host,
        el({ width: "170px", height: "170px", borderRadius: "50%", background: `radial-gradient(circle, #fff 0, ${color} 34%, transparent 70%)` }),
        [{ transform: at(x, y, "scale(.2)"), opacity: 1 }, { transform: at(x, y, `scale(${1.3 + r * 0.25})`), opacity: 0 }],
        { duration: 520 + r * 70, easing: "ease-out" },
    );
    const rings = 1 + Math.floor(r / 2);
    for (let i = 0; i < rings; i++) ring(host, x, y, colorAt(r, i), 90, 3 + r * 0.45 + i * 0.6, 640 + i * 130, 3, i * 110);
    // sparks
    const n = 10 + r * 9;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.12, 0.12);
        const d = rand(50, 110 + r * 22);
        const c = colorAt(r, i);
        const sz = rand(3, 5 + r * 0.5);
        spawn(
            host,
            el({ width: `${sz}px`, height: `${sz}px`, borderRadius: r >= 5 && i % 2 ? "1px" : "50%", background: c, boxShadow: `0 0 10px ${c}` }),
            [
                { transform: at(x, y, "scale(1)"), opacity: 1 },
                { transform: at(x + Math.cos(a) * d, y + Math.sin(a) * d + 18, `scale(0) rotate(${rand(-300, 300)}deg)`), opacity: 0 },
            ],
            { duration: rand(600, 1100 + r * 80), easing: "cubic-bezier(.1,.7,.3,1)" },
        );
    }
    // beams
    if (big) {
        const rays = 6 + (r - 4) * 3;
        for (let i = 0; i < rays; i++) {
            const a = (i / rays) * 360 + rand(-6, 6);
            const c = colorAt(r, i);
            spawn(
                host,
                el({ width: "4px", height: "210px", background: `linear-gradient(to top, ${c}, transparent)`, transformOrigin: "50% 100%", borderRadius: "2px", filter: "blur(.5px)" }),
                [
                    { transform: `translate(${x}px,${y}px) translate(-50%,-100%) rotate(${a}deg) scaleY(0)`, opacity: 0.95 },
                    { transform: `translate(${x}px,${y}px) translate(-50%,-100%) rotate(${a + 40}deg) scaleY(1)`, opacity: 0.8, offset: 0.45 },
                    { transform: `translate(${x}px,${y}px) translate(-50%,-100%) rotate(${a + 80}deg) scaleY(.6)`, opacity: 0 },
                ],
                { duration: 1500 + r * 100, easing: "ease-out" },
            );
        }
    }
    // embers for mythic and up, confetti for the rarest
    if (r >= 5) {
        for (let i = 0; i < 12 + r * 4; i++) {
            const c = colorAt(r, i);
            const x0 = x + rand(-90, 90);
            spawn(
                host,
                el({ width: "6px", height: "10px", background: c, boxShadow: `0 0 8px ${c}`, borderRadius: "1px" }),
                [
                    { transform: at(x0, y + 40, "rotate(0)"), opacity: 1 },
                    { transform: at(x0 + rand(-50, 50), y - rand(120, 220), `rotate(${rand(-540, 540)}deg)`), opacity: 0 },
                ],
                { duration: rand(1100, 1900), delay: rand(0, 300), easing: "cubic-bezier(.2,.7,.4,1)" },
            );
        }
    }
}

/** Full-width flash over a root element (big pulls only). */
export function flashScreen(root: HTMLElement | null, r: number) {
    if (!root || reduced() || r < 3) return;
    const c = colorAt(r);
    const cosmic = r >= RARITIES.length - 1;
    const strength = [0, 0, 0, 0.3, 0.5, 0.65, 0.8, 0.95][r] ?? 0.5;
    const e = document.createElement("div");
    Object.assign(e.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: "60",
        background: cosmic ? `linear-gradient(115deg, ${RAINBOW.join(",")})` : `radial-gradient(circle at 50% 45%, #fff 0, ${c} 35%, transparent 75%)`,
        mixBlendMode: "screen",
    } as Partial<CSSStyleDeclaration>);
    root.appendChild(e);
    const a = e.animate([{ opacity: 0 }, { opacity: strength, offset: 0.12 }, { opacity: 0 }], { duration: 650 + r * 160, easing: "ease-out" });
    a.onfinish = () => e.remove();
    a.oncancel = () => e.remove();
}

/** A drop of Arcane Dust flying up off the cursor. */
export function dustPop(host: HTMLElement, x: number, y: number, amount: number) {
    const text = `+${amount >= 10 ? Math.round(amount) : amount.toFixed(1).replace(/\.0$/, "")} ✧`;
    spawn(
        host,
        el({ fontFamily: "var(--font-minecraft, inherit)", fontSize: "0.95rem", color: "#e2b8ff", textShadow: "0 0 10px #b366ff, 0 2px 0 rgba(0,0,0,.7)", whiteSpace: "nowrap" }, text),
        [
            { transform: at(x, y - 10, "scale(.5)"), opacity: 0 },
            { transform: at(x + rand(-10, 10), y - 34, "scale(1.15)"), opacity: 1, offset: 0.2 },
            { transform: at(x + rand(-22, 22), y - 86, "scale(.9)"), opacity: 0 },
        ],
        { duration: 1200, easing: "ease-out" },
    );
    if (reduced()) return;
    for (let i = 0; i < 5; i++) {
        spawn(
            host,
            el({ width: "4px", height: "4px", borderRadius: "50%", background: "#d9a8ff", boxShadow: "0 0 8px #b366ff" }),
            [{ transform: at(x, y, "scale(1)"), opacity: 1 }, { transform: at(x + rand(-34, 34), y + rand(-44, 10), "scale(0)"), opacity: 0 }],
            { duration: rand(450, 800), easing: "ease-out" },
        );
    }
}

// ---- Click procs ----

/** A jagged bolt from above the button to the click. */
export function procBolt(host: HTMLElement, x: number, y: number) {
    if (reduced()) return;
    const top = -10;
    const pts: string[] = [];
    const steps = 9;
    let cx = x + rand(-50, 50);
    for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const py = top + (y - top) * f;
        cx += (x - cx) * 0.3 + rand(-14, 14) * (1 - f);
        pts.push(`${(i === steps ? x : cx).toFixed(1)},${py.toFixed(1)}`);
    }
    const w = host.clientWidth || 400;
    const h = host.clientHeight || 400;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `<polyline points="${pts.join(" ")}" fill="none" stroke="#7fd4ff" stroke-width="9" stroke-linejoin="round" opacity=".35"/><polyline points="${pts.join(" ")}" fill="none" stroke="#e8f8ff" stroke-width="3" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px #7fd4ff)"/>`;
    const wrap = el({ width: `${w}px`, height: `${h}px`, filter: "drop-shadow(0 0 12px #3fa8ff)" });
    wrap.appendChild(svg);
    spawn(host, wrap, [{ transform: "translate(0,0)", opacity: 1 }, { transform: "translate(0,0)", opacity: 0.25, offset: 0.25 }, { transform: "translate(0,0)", opacity: 1, offset: 0.4 }, { transform: "translate(0,0)", opacity: 0 }], { duration: 420, easing: "linear" });
    ring(host, x, y, "#7fd4ff", 50, 3, 480, 2);
    for (let i = 0; i < 8; i++) {
        const a = rand(0, Math.PI * 2);
        spawn(
            host,
            el({ width: "3px", height: "3px", background: "#dff6ff", boxShadow: "0 0 8px #7fd4ff", borderRadius: "50%" }),
            [{ transform: at(x, y), opacity: 1 }, { transform: at(x + Math.cos(a) * rand(20, 60), y + Math.sin(a) * rand(20, 60)), opacity: 0 }],
            { duration: 420, easing: "ease-out" },
        );
    }
}

/** Gold coins spilling out of the click. */
export function procMidas(host: HTMLElement, x: number, y: number) {
    if (reduced()) return;
    ring(host, x, y, "#ffd84a", 46, 3, 520, 2);
    for (let i = 0; i < 9; i++) {
        const vx = rand(-90, 90);
        const vy = rand(150, 260);
        const dur = rand(650, 950);
        const flip = rand(3, 6);
        const steps = 12;
        const frames: Keyframe[] = [];
        for (let k = 0; k <= steps; k++) {
            const f = k / steps;
            const t = (f * dur) / 1000;
            frames.push({
                offset: f,
                transform: `translate(${(x + vx * t).toFixed(1)}px,${(y - vy * t + 0.5 * 820 * t * t).toFixed(1)}px) translate(-50%,-50%) scaleX(${Math.cos(f * flip * Math.PI).toFixed(2)})`,
                opacity: f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3,
            });
        }
        spawn(host, el({ width: "11px", height: "11px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff6b0, #ffd23a 55%, #b87b00)", border: "1px solid #8a5d00" }), frames, { duration: dur, easing: "linear" });
    }
}

/** A second ring of the click, like an echo. */
export function procEcho(host: HTMLElement, x: number, y: number) {
    if (reduced()) return;
    for (let i = 0; i < 3; i++) ring(host, x, y, "#c08bff", 40, 3.4 + i * 0.7, 620 + i * 100, 2, i * 120);
}

export const PROC_LABEL = { bolt: { text: "Lightning!", color: "#9adfff" }, midas: { text: "Midas!", color: "#ffd84a" }, echo: { text: "Echo!", color: "#d0a8ff" } } as const;

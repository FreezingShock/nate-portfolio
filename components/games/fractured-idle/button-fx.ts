// DOM effects for the click button: flying numbers, click bursts and crit
// blasts. They are plain elements driven by the Web Animations API and removed
// when they end, so clicking (or holding at 10 clicks/s) never waits on React.
// Positions are px in the host element's coordinate space.

const MAX_PARTS = 110;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function add(host: HTMLElement, el: HTMLElement, frames: Keyframe[], dur: number, easing = "linear") {
    while (host.childElementCount > MAX_PARTS) host.firstElementChild?.remove();
    host.appendChild(el);
    const a = el.animate(frames, { duration: dur, easing, fill: "forwards" });
    a.onfinish = () => el.remove();
}

const later = (host: HTMLElement, ms: number, fn: () => void) => setTimeout(() => host.isConnected && fn(), ms);

const part = (cls: string, css: Partial<CSSStyleDeclaration> = {}) => {
    const el = document.createElement("span");
    el.className = cls;
    Object.assign(el.style, css);
    return el;
};

const at = (x: number, y: number, tail = "") => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) ${tail}`;

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

export interface NumOpts {
    crit: boolean;
    color: string; // crit color
    accent: string; // skin accent (neon numbers)
    style: string; // number style id
}

let side = 1;

/** The number that pops off a click: rises, then falls off to one side of the cursor. */
export function spawnNumber(host: HTMLElement, x: number, y: number, text: string, o: NumOpts) {
    if (Math.random() > 0.15) side = -side; // mostly alternate, so both sides fill up
    const { crit } = o;
    const dur = crit ? 1300 : 950;
    const dx = side * (crit ? rand(90, 150) : rand(45, 90));
    const vy = crit ? rand(430, 500) : rand(330, 380);
    const g = crit ? 900 : 880;
    const tilt = side * (crit ? rand(8, 16) : rand(3, 8));
    const el = part(`fi-num fi-ns-${o.style}${crit ? " fi-num-crit" : ""}`);
    el.style.setProperty("--cc", o.color);
    el.style.setProperty("--ac", o.accent);
    el.textContent = text;
    if (reduced()) {
        add(host, el, [{ transform: at(x, y - 30), opacity: 1 }, { transform: at(x, y - 40), opacity: 0 }], 500);
        return;
    }
    const tail = (f: number) => {
        const sc = crit ? 0.55 + 0.75 * Math.min(1, f * 7) : 0.7 + 0.35 * Math.min(1, f * 8);
        return `translate(-50%,-50%) rotate(${(tilt * f).toFixed(1)}deg) scale(${sc.toFixed(2)})`;
    };
    add(host, el, arc(x, y, dx / (dur / 1000), vy, g, dur, tail, 16, crit ? 0.7 : 0.6), dur);
}

// ---- Building blocks ----

function ring(host: HTMLElement, x: number, y: number, color: string, size: number, to: number, dur: number, width = 2, glow = false) {
    const el = part("fi-part", {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: `${width}px solid ${color}`,
        boxShadow: glow ? `0 0 14px ${color}, inset 0 0 12px ${color}` : "none",
    });
    add(host, el, [{ transform: at(x, y, "scale(.3)"), opacity: 0.9 }, { transform: at(x, y, `scale(${to})`), opacity: 0 }], dur, "cubic-bezier(.1,.7,.3,1)");
}

function flash(host: HTMLElement, x: number, y: number, color: string, size: number, dur: number) {
    const el = part("fi-part", { width: `${size}px`, height: `${size}px`, borderRadius: "50%", background: `radial-gradient(circle, #fff 0, ${color} 30%, transparent 68%)` });
    add(host, el, [{ transform: at(x, y, "scale(.2)"), opacity: 1 }, { transform: at(x, y, "scale(1.6)"), opacity: 0 }], dur, "ease-out");
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
                { transform: at(x + Math.cos(a) * d0 * 0.3, y + Math.sin(a) * d0 * 0.3, `${rot} scaleX(1)`), opacity: 1 },
                { transform: at(x + Math.cos(a) * d0, y + Math.sin(a) * d0, `${rot} scaleX(.2)`), opacity: 0 },
            ],
            dur,
            "cubic-bezier(.1,.7,.3,1)",
        );
    }
}

/** Little glyph particles thrown up and out under gravity. */
function glyphs(host: HTMLElement, x: number, y: number, chars: string[], colors: string[], n: number, o: { up?: [number, number]; size?: [number, number]; g?: number; spread?: number } = {}) {
    for (let i = 0; i < n; i++) {
        const el = part("fi-part", { fontFamily: "var(--font-minecraft, inherit)", fontSize: `${rand(...(o.size ?? [11, 18]))}px`, color: colors[i % colors.length], textShadow: "0 0 8px currentColor", lineHeight: "1" });
        el.textContent = chars[i % chars.length];
        const dx = rand(-(o.spread ?? 70), o.spread ?? 70);
        const dur = rand(650, 850);
        const spin = rand(-200, 200);
        add(host, el, arc(x, y, dx / (dur / 1000), rand(...(o.up ?? [130, 230])), o.g ?? 620, dur, (f) => `translate(-50%,-50%) rotate(${(spin * f).toFixed(0)}deg)`, 10, 0.5), dur);
    }
}

function confetti(host: HTMLElement, x: number, y: number, n: number, hues?: [number, number]) {
    for (let i = 0; i < n; i++) {
        const c = `hsl(${Math.floor(hues ? rand(...hues) : rand(0, 360))} 95% 62%)`;
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
            frames.push({ offset: f, transform: at(x0 + Math.sin(f * 6 + i) * w, y - up * f, `scale(${ember ? 1 - f * 0.7 : 0.6 + f * 0.7})`), opacity: f < 0.5 ? 1 : 1 - (f - 0.5) * 2 });
        }
        add(host, el, frames, dur, "ease-out");
    }
}

/** A jagged lightning bolt from (x1,y1) to (x2,y2), drawn as SVG that flickers out. */
function bolt(host: HTMLElement, x1: number, y1: number, x2: number, y2: number, color: string, w = 3, jag = 16) {
    const pts: string[] = [`${x1},${y1}`];
    const segs = 7;
    for (let i = 1; i < segs; i++) {
        const f = i / segs;
        pts.push(`${(x1 + (x2 - x1) * f + rand(-jag, jag)).toFixed(1)},${(y1 + (y2 - y1) * f + rand(-jag * 0.4, jag * 0.4)).toFixed(1)}`);
    }
    pts.push(`${x2},${y2}`);
    const el = part("fi-part");
    el.innerHTML = `<svg width="1" height="1" style="overflow:visible;position:absolute;left:0;top:0"><polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${w * 2.6}" stroke-linejoin="round" stroke-linecap="round" opacity=".45" style="filter:blur(3px)"/><polyline points="${pts.join(" ")}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    add(host, el, [{ opacity: 1 }, { opacity: 0.2, offset: 0.25 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], 380);
}

function beam(host: HTMLElement, x: number, y: number, horizontal: boolean, len: number, color: string, dur: number) {
    const el = part("fi-part", {
        width: horizontal ? `${len}px` : "3px",
        height: horizontal ? "3px" : `${len}px`,
        background: `linear-gradient(${horizontal ? "90deg" : "180deg"}, transparent, ${color} 30%, #fff 50%, ${color} 70%, transparent)`,
        boxShadow: `0 0 12px ${color}`,
        borderRadius: "2px",
    });
    const s0 = horizontal ? "scaleX(.1)" : "scaleY(.1)";
    const s1 = horizontal ? "scaleX(1)" : "scaleY(1)";
    add(host, el, [{ transform: at(x, y, s0), opacity: 1 }, { transform: at(x, y, s1), opacity: 1, offset: 0.35 }, { transform: at(x, y, s1), opacity: 0 }], dur, "ease-out");
}

function rocket(host: HTMLElement, x: number, y: number, rise: number, color: string, burst: (bx: number, by: number) => void) {
    const el = part("fi-part", { width: "3px", height: "12px", borderRadius: "2px", background: `linear-gradient(#fff, ${color})`, boxShadow: `0 0 8px ${color}` });
    add(host, el, [{ transform: at(x, y), opacity: 1 }, { transform: at(x, y - rise), opacity: 1 }], 340, "cubic-bezier(.2,.6,.4,1)");
    later(host, 330, () => burst(x, y - rise));
}

function dotsBurst(host: HTMLElement, x: number, y: number, colors: string[], n: number, speed: [number, number]) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
        const v = rand(...speed);
        const c = colors[i % colors.length];
        const s = rand(3, 5);
        const el = part("fi-part", { width: `${s}px`, height: `${s}px`, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}` });
        const dur = rand(650, 850);
        add(host, el, arc(x, y, Math.cos(a) * v, -Math.sin(a) * v, 240, dur, (f) => `translate(-50%,-50%) scale(${(1 - f * 0.5).toFixed(2)})`, 10, 0.45), dur, "ease-out");
    }
}

// ---- Click bursts (every click) ----

export function spawnBurst(host: HTMLElement, kind: string, x: number, y: number, color: string) {
    if (reduced()) return;
    switch (kind) {
        case "sparks":
            sparks(host, x, y, color, 9, 34, 64, 420);
            break;
        case "pixels":
            for (let i = 0; i < 9; i++) {
                const s = rand(5, 9);
                const c = pick([color, "#fff", color]);
                const el = part("fi-part", { width: `${s}px`, height: `${s}px`, background: c, boxShadow: "0 2px 0 rgba(0,0,0,.4)" });
                const dur = rand(450, 650);
                add(host, el, arc(x, y, rand(-90, 90), rand(120, 220), 780, dur, () => "translate(-50%,-50%)", 8, 0.5), dur, "steps(8,end)");
            }
            break;
        case "stars":
            glyphs(host, x, y, ["✦", "✧", "✦"], ["#fff3a8", "#ffe066", color], 5);
            break;
        case "hearts":
            glyphs(host, x, y, ["♥", "♥", "❤"], ["#ff6b8b", "#ff9bb3", "#ff4d6d"], 4, { up: [70, 130], g: 160, spread: 45, size: [13, 22] });
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
        case "leaves":
            for (let i = 0; i < 6; i++) {
                const el = part("fi-part", { width: "11px", height: "7px", borderRadius: "0 100% 0 100%", background: pick(["#6fbf3a", "#e0912b", "#c4622a", "#8fd04a"]) });
                const dur = rand(900, 1200);
                const sway = rand(14, 28);
                const frames: Keyframe[] = [];
                for (let k = 0; k <= 10; k++) {
                    const f = k / 10;
                    frames.push({ offset: f, transform: at(x + Math.sin(f * 7 + i) * sway + (i - 3) * 10 * f, y - 28 * Math.sin(f * 3) + 70 * f * f, `rotate(${(f * 360 + i * 40).toFixed(0)}deg)`), opacity: f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4 });
                }
                add(host, el, frames, dur, "ease-in-out");
            }
            break;
        case "coins":
            for (let i = 0; i < 6; i++) {
                const el = part("fi-part", { width: "11px", height: "11px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff6b0, #ffd23a 55%, #b87b00)", border: "1px solid #8a5d00" });
                const dur = rand(750, 950);
                const flip = rand(3, 6);
                add(host, el, arc(x, y, rand(-80, 80), rand(220, 320), 900, dur, (f) => `translate(-50%,-50%) scaleX(${Math.cos(f * flip * Math.PI).toFixed(2)})`, 14, 0.7), dur);
            }
            break;
        case "frost":
            glyphs(host, x, y, ["❄", "❅", "❆"], ["#e8f8ff", "#a8e2ff", "#ffffff"], 6, { up: [60, 140], g: 240, spread: 80, size: [12, 20] });
            break;
        case "shock":
            ring(host, x, y, color, 40, 4.5, 520, 3, true);
            ring(host, x, y, "#ffffff", 30, 6.5, 640, 1.5);
            break;
        case "runes":
            glyphs(host, x, y, ["ᚠ", "ᚦ", "ᚱ", "ᛉ", "ᛟ"], [color, "#fff", color], 5, { up: [90, 160], g: 120, spread: 40, size: [14, 22] });
            break;
        case "lightning":
            for (let i = 0; i < 3; i++) {
                const a = rand(0, Math.PI * 2);
                bolt(host, x, y, x + Math.cos(a) * rand(45, 75), y + Math.sin(a) * rand(45, 75), color, 2, 8);
            }
            ring(host, x, y, "#fff", 28, 2.2, 300, 1.5);
            break;
        case "fireworks":
            rocket(host, x, y, rand(40, 60), color, (bx, by) => dotsBurst(host, bx, by, [color, "#fff", "#ffd23a"], 12, [60, 110]));
            break;
        case "spiral":
            for (let i = 0; i < 12; i++) {
                const el = part("fi-part", { width: "5px", height: "5px", borderRadius: "50%", background: i % 2 ? color : "#fff", boxShadow: `0 0 8px ${color}` });
                const dur = 650;
                const a0 = (i / 12) * Math.PI * 2;
                const frames: Keyframe[] = [];
                for (let k = 0; k <= 10; k++) {
                    const f = k / 10;
                    const a = a0 + f * 3.2;
                    const r = 8 + f * 70;
                    frames.push({ offset: f, transform: at(x + Math.cos(a) * r, y + Math.sin(a) * r, `scale(${(1 - f * 0.7).toFixed(2)})`), opacity: 1 - f * f });
                }
                add(host, el, frames, dur, "ease-out");
            }
            break;
        default:
            ring(host, x, y, color, 36, 3.2, 440, 2.5);
    }
}

// ---- Crit blasts (on top of the click burst) ----

function shard(host: HTMLElement, x: number, y: number, color: string) {
    const s = rand(10, 20);
    const el = part("fi-part", { width: `${s}px`, height: `${s}px`, background: `linear-gradient(135deg, #fff, ${color})`, clipPath: `polygon(${rand(0, 30)}% 0,100% ${rand(20, 60)}%,${rand(40, 80)}% 100%)`, filter: `drop-shadow(0 0 4px ${color})` });
    const dur = rand(650, 900);
    const spin = rand(-400, 400);
    add(host, el, arc(x, y, rand(-200, 200), rand(150, 330), 900, dur, (f) => `translate(-50%,-50%) rotate(${(spin * f).toFixed(0)}deg)`, 12, 0.5), dur);
}

export function spawnCrit(host: HTMLElement, fx: string, x: number, y: number, color: string) {
    if (reduced()) return;
    switch (fx) {
        case "bolt": {
            const top = -10;
            bolt(host, x + rand(-50, 50), top, x, y, color, 4, 26);
            bolt(host, x + rand(-90, 90), top, x + rand(-8, 8), y, color, 2, 22);
            flash(host, x, y, color, 120, 380);
            ring(host, x, y, color, 40, 4, 500, 3, true);
            sparks(host, x, y, color, 10, 40, 90, 480, 12);
            break;
        }
        case "cross":
            flash(host, x, y, color, 90, 420);
            beam(host, x, y, true, 300, color, 520);
            beam(host, x, y, false, 240, color, 520);
            ring(host, x, y, color, 34, 3.6, 480, 2, true);
            break;
        case "shatter":
            ring(host, x, y, color, 40, 3, 400, 3, true);
            for (let i = 0; i < 11; i++) shard(host, x, y, color);
            break;
        case "meteor": {
            const sx = x + 140;
            const sy = y - 170;
            const ang = Math.atan2(y - sy, x - sx);
            const el = part("fi-part", { width: "70px", height: "4px", borderRadius: "4px", background: `linear-gradient(90deg, transparent, ${color}, #fff)`, boxShadow: `0 0 12px ${color}` });
            add(host, el, [{ transform: at(sx, sy, `rotate(${ang}rad)`), opacity: 0 }, { transform: at(sx + (x - sx) * 0.2, sy + (y - sy) * 0.2, `rotate(${ang}rad)`), opacity: 1, offset: 0.2 }, { transform: at(x, y, `rotate(${ang}rad)`), opacity: 1 }], 280, "cubic-bezier(.5,0,1,.6)");
            later(host, 270, () => {
                flash(host, x, y, color, 130, 420);
                ring(host, x, y, color, 40, 5, 560, 3, true);
                sparks(host, x, y, color, 14, 50, 110, 520, 14);
                for (let i = 0; i < 5; i++) shard(host, x, y, color);
            });
            break;
        }
        case "implode": {
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                const r = rand(90, 130);
                const el = part("fi-part", { width: "5px", height: "5px", borderRadius: "50%", background: i % 2 ? color : "#fff", boxShadow: `0 0 8px ${color}` });
                add(host, el, [{ transform: at(x + Math.cos(a) * r, y + Math.sin(a) * r), opacity: 0.2 }, { transform: at(x, y, "scale(.4)"), opacity: 1 }], 320, "cubic-bezier(.6,0,1,1)");
            }
            later(host, 310, () => {
                flash(host, x, y, color, 150, 480);
                ring(host, x, y, color, 40, 6, 640, 4, true);
                ring(host, x, y, "#fff", 30, 8, 720, 1.5);
                sparks(host, x, y, color, 16, 60, 130, 560, 14);
            });
            break;
        }
        case "nova":
            flash(host, x, y, color, 220, 620);
            ring(host, x, y, color, 40, 7, 700, 4, true);
            later(host, 90, () => ring(host, x, y, "#fff", 40, 9, 760, 2));
            later(host, 180, () => ring(host, x, y, color, 40, 11, 820, 2, true));
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * 360;
                const el = part("fi-part", { width: "90px", height: "3px", background: `linear-gradient(90deg, #fff, ${color} 40%, transparent)`, borderRadius: "2px", boxShadow: `0 0 10px ${color}`, transformOrigin: "0 50%" });
                add(host, el, [{ transform: `translate(${x}px,${y}px) rotate(${a}deg) scaleX(.1)`, opacity: 1 }, { transform: `translate(${x}px,${y}px) rotate(${a}deg) scaleX(1.5)`, opacity: 0 }], 600, "cubic-bezier(.1,.7,.3,1)");
            }
            sparks(host, x, y, color, 14, 70, 140, 640, 14);
            break;
        case "fireworks":
            ring(host, x, y, color, 34, 3.4, 420, 2.5, true);
            [-70, 0, 70].forEach((dx, i) =>
                later(host, i * 130, () => rocket(host, x + dx, y - 10, rand(70, 120), i === 1 ? "#fff" : color, (bx, by) => dotsBurst(host, bx, by, [color, "#fff", "#ffd23a", color], 18, [70, 130]))),
            );
            break;
        default:
            ring(host, x, y, color, 44, 5.5, 600, 3, true);
            sparks(host, x, y, color, 12, 50, 96, 520, 14);
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

/** A quick decaying shake of the whole button area on crits. */
export function shake(el: HTMLElement | null, power = 1) {
    if (!el || reduced()) return;
    const a = 5 * power;
    el.animate(
        [
            { transform: "translate(0,0)" },
            { transform: `translate(${-a}px,${a * 0.4}px)` },
            { transform: `translate(${a * 0.8}px,${-a * 0.5}px)` },
            { transform: `translate(${-a * 0.5}px,${a * 0.2}px)` },
            { transform: `translate(${a * 0.25}px,0)` },
            { transform: "translate(0,0)" },
        ],
        { duration: 260, easing: "ease-out" },
    );
}

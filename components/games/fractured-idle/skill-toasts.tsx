"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import type { SkillDef } from "@/lib/fractured-idle/data";

// On-screen skill notifications, one at a time. A level-up is a small pill
// (icon, "Mining 12 > 13", the perk); a milestone is a slightly bigger gold
// card with its name and rewards. Anything that arrives while one is showing
// waits in a queue: level-ups of the same skill merge into one, and a "+N"
// badge says how many are waiting. Each shows for a few seconds (shorter when
// others are waiting) and closes on tap. On phones they shrink to a slim pill
// and skip the particles. The parent pushes events through the ref.

export interface SkillToastEv {
    kind: "level" | "milestone";
    skill: SkillDef;
    from: number;
    to: number;
    perk: [string, string]; // bonus text before and after
    title?: string; // milestone name(s)
    rewards: string[];
}

type Item = SkillToastEv & { id: number };
export interface SkillToastApi {
    push: (ev: SkillToastEv) => void;
}

const MAX_QUEUE = 6;

export const SkillToasts = forwardRef<SkillToastApi>(function SkillToasts(_, ref) {
    // queue[0] is the one on screen.
    const [queue, setQueue] = useState<Item[]>([]);
    const id = useRef(1);
    const drop = useCallback((n: number) => setQueue((c) => c.filter((i) => i.id !== n)), []);
    useImperativeHandle(
        ref,
        () => ({
            push: (ev) =>
                setQueue((c) => {
                    const at = c.findIndex((i) => i.skill.id === ev.skill.id);
                    if (at >= 0) {
                        const old = c[at];
                        const from = Math.min(old.from || ev.from, ev.from) || ev.from;
                        if (ev.kind === "level" && old.kind === "level") {
                            // Same skill, still a plain level-up: fold it in (the card on screen keeps its timer).
                            const next = [...c];
                            next[at] = { ...old, to: ev.to, from, perk: [old.perk[0], ev.perk[1]] };
                            return next;
                        }
                        if (ev.kind === "milestone" && old.kind === "level") {
                            // A milestone replaces the plain level-up it came with.
                            const next = [...c];
                            next[at] = { ...ev, from, id: id.current++, perk: [old.perk[0], ev.perk[1]] };
                            return next;
                        }
                    }
                    let next = [...c, { ...ev, id: id.current++ }];
                    while (next.length > MAX_QUEUE) {
                        const k = next.findIndex((i, n) => n > 0 && i.kind === "level");
                        next = k > 0 ? next.filter((_, n) => n !== k) : next.slice(0, MAX_QUEUE);
                    }
                    return next;
                }),
        }),
        [],
    );
    const cur = queue[0];
    if (!cur) return null;
    return (
        <div className="fi-sk-stack" aria-live="polite">
            <Toast key={cur.id} ev={cur} more={queue.length - 1} onClose={() => drop(cur.id)} />
        </div>
    );
});

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const isPhone = () => typeof matchMedia === "function" && matchMedia("(max-width: 639px)").matches;
const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function burst(host: HTMLElement, milestone: boolean) {
    if (calm() || isPhone()) return;
    const n = milestone ? 16 : 6;
    const cx = 26;
    const cy = 24;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
        const d = rand(milestone ? 26 : 18, milestone ? 70 : 42);
        const el = document.createElement("span");
        el.className = "fi-sk-spark";
        el.style.left = `${cx}px`;
        el.style.top = `${cy}px`;
        if (milestone && i % 3 === 0) el.style.background = "#ffd23a";
        host.appendChild(el);
        el.animate(
            [
                { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
            ],
            { duration: rand(450, 750), easing: "cubic-bezier(.1,.7,.3,1)" },
        ).onfinish = () => el.remove();
    }
    const ring = document.createElement("span");
    ring.className = "fi-sk-shock";
    ring.style.left = `${cx}px`;
    ring.style.top = `${cy}px`;
    host.appendChild(ring);
    ring.animate([{ transform: "translate(-50%,-50%) scale(.3)", opacity: 0.8 }, { transform: "translate(-50%,-50%) scale(2.6)", opacity: 0 }], { duration: 600, easing: "ease-out" }).onfinish = () => ring.remove();
}

function Toast({ ev, more, onClose }: { ev: Item; more: number; onClose: () => void }) {
    const fx = useRef<HTMLDivElement>(null);
    const m = ev.kind === "milestone";
    const phone = typeof window !== "undefined" && isPhone();
    const base = m ? (phone ? 3800 : 5200) : phone ? 2200 : 3200;
    const ms = more > 0 ? Math.round(base * 0.55) : base;
    // The parent re-renders ten times a second, so keep the latest onClose in a ref and let the timer depend only on ms.
    const close = useRef(onClose);
    useEffect(() => {
        close.current = onClose;
    });
    useEffect(() => {
        const t = setTimeout(() => close.current(), ms);
        return () => clearTimeout(t);
    }, [ms]);
    useEffect(() => {
        if (fx.current) burst(fx.current, m);
    }, [m]);
    const same = ev.from === ev.to;
    return (
        <button type="button" onClick={onClose} className="fi-sk" data-kind={ev.kind} aria-label={`${ev.skill.name} ${m ? "milestone" : "level"} ${ev.to}. Tap to dismiss.`} style={{ ["--sc" as string]: ev.skill.color, ["--ms" as string]: `${ms}ms` }}>
            <span className="fi-sk-glow" />
            <div ref={fx} className="fi-sk-fx" aria-hidden="true" />
            <span className="fi-sk-ring">
                <McSymbol name={ev.skill.symbol} />
            </span>
            <span className="fi-sk-body">
                <span className="fi-sk-title">
                    {m && <span className="fi-sk-star">✦</span>}
                    {ev.skill.name}{" "}
                    {!same && ev.from > 0 && <i>{ev.from}</i>}
                    {!same && <em>▸</em>} <b key={ev.to}>{ev.to}</b>
                </span>
                {m && ev.title && <span className="fi-sk-mname">{ev.title}</span>}
                <span className="fi-sk-perk">
                    {ev.perk[0]} <em>▸</em> <b>{ev.perk[1]}</b>
                </span>
                {ev.rewards.length > 0 && (
                    <span className="fi-sk-chips">
                        {ev.rewards.map((r) => (
                            <span key={r}>{r}</span>
                        ))}
                    </span>
                )}
            </span>
            {more > 0 && <span className="fi-sk-more">+{more}</span>}
            <i className="fi-sk-time" />
        </button>
    );
}

export const SKILL_TOAST_CSS = `
.fi-sk-stack{position:fixed;right:1rem;top:4.5rem;z-index:45;display:flex;flex-direction:column;align-items:flex-end;pointer-events:none;max-width:calc(100vw - 2rem)}
.fi-sk{pointer-events:auto;position:relative;display:flex;align-items:center;gap:.6rem;width:min(16.5rem,100%);padding:.4rem .7rem .55rem .45rem;border-radius:.9rem;text-align:left;cursor:pointer;color:#fff;overflow:visible;background:linear-gradient(120deg,color-mix(in oklch,var(--sc) 22%,#0a0812),rgba(10,8,18,.94) 70%);border:1px solid color-mix(in oklch,var(--sc) 55%,transparent);box-shadow:0 0 18px -8px var(--sc),0 8px 20px rgba(0,0,0,.5);backdrop-filter:blur(6px);animation:fi-sk-in .42s cubic-bezier(.2,1.4,.35,1) both}
.fi-sk[data-kind="milestone"]{width:min(19rem,100%);padding:.55rem .8rem .7rem .55rem;border-color:#ffd23a;background:linear-gradient(120deg,color-mix(in oklch,var(--sc) 26%,#1a1204),rgba(12,10,6,.95) 70%);box-shadow:0 0 26px -6px #ffd23a,0 10px 24px rgba(0,0,0,.55)}
.fi-sk-glow{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.2) 50%,transparent 70%);background-size:250% 100%;animation:fi-sk-shine .9s ease-out .12s both;pointer-events:none}
.fi-sk-fx{position:absolute;inset:0;pointer-events:none;overflow:visible}
.fi-sk-spark{position:absolute;width:.28rem;height:.28rem;border-radius:50%;background:var(--sc);box-shadow:0 0 6px var(--sc);pointer-events:none}
.fi-sk-shock{position:absolute;width:2.6rem;height:2.6rem;border-radius:50%;border:2px solid var(--sc);pointer-events:none}
.fi-sk-ring{position:relative;flex:none;display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;font-size:1.05rem;background:radial-gradient(circle at 35% 30%,color-mix(in oklch,var(--sc) 55%,#fff),color-mix(in oklch,var(--sc) 30%,#000) 70%);box-shadow:0 0 12px -2px var(--sc),inset 0 0 8px rgba(0,0,0,.45);animation:fi-sk-spin .6s cubic-bezier(.2,1.4,.4,1) both}
.fi-sk[data-kind="milestone"] .fi-sk-ring{width:2.6rem;height:2.6rem;font-size:1.3rem}
.fi-sk-ring>*{color:#fff;filter:drop-shadow(0 1px 0 rgba(0,0,0,.5))}
.fi-sk-body{display:flex;flex-direction:column;gap:.1rem;min-width:0;flex:1}
.fi-sk-title{font-family:var(--font-minecraft,inherit);font-size:.92rem;line-height:1.1;color:var(--sc);text-shadow:0 0 8px color-mix(in oklch,var(--sc) 55%,transparent),0 1px 0 rgba(0,0,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-sk-star{color:#ffd23a;margin-right:.3rem;text-shadow:0 0 8px #ffaa00}
.fi-sk-title i{font-style:normal;opacity:.5}
.fi-sk-title b{color:#fff;font-weight:400;display:inline-block;animation:fi-sk-num .5s cubic-bezier(.2,1.8,.4,1) .12s both}
.fi-sk-title em,.fi-sk-perk em{font-style:normal;opacity:.55;margin:0 .1rem}
.fi-sk-mname{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:#ffd23a;text-shadow:0 0 8px rgba(255,170,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-sk-perk{font-family:var(--font-rubik,inherit);font-size:.66rem;color:#b9b3cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-sk-perk b{color:var(--mc-green);font-weight:600}
.fi-sk-chips{display:flex;flex-wrap:wrap;gap:.2rem;margin-top:.1rem}
.fi-sk-chips span{font-family:var(--font-rubik,inherit);font-size:.58rem;padding:.06rem .4rem;border-radius:999px;color:#ffe9a8;border:1px solid rgba(255,210,58,.5);background:rgba(255,210,58,.1);animation:fi-sk-chip .35s ease-out backwards}
.fi-sk-chips span:nth-child(2){animation-delay:.1s}.fi-sk-chips span:nth-child(3){animation-delay:.2s}
.fi-sk-chips span:nth-child(n+5){display:none}
.fi-sk-more{flex:none;align-self:flex-start;font-family:var(--font-rubik,inherit);font-size:.58rem;font-weight:700;padding:.05rem .35rem;border-radius:999px;background:rgba(255,255,255,.14);color:#fff}
.fi-sk-time{position:absolute;left:.7rem;right:.7rem;bottom:.22rem;height:2px;border-radius:2px;background:var(--sc);box-shadow:0 0 5px var(--sc);transform-origin:left;animation:fi-qte-time var(--ms) linear forwards;opacity:.7}
@keyframes fi-sk-in{from{transform:translateX(40%) scale(.9);opacity:0}}
@keyframes fi-sk-shine{from{background-position:160% 0}to{background-position:-60% 0}}
@keyframes fi-sk-spin{from{transform:rotate(-160deg) scale(.3)}}
@keyframes fi-sk-num{from{transform:scale(1.9);filter:brightness(2)}}
@keyframes fi-sk-chip{from{transform:translateY(4px) scale(.85);opacity:0}}
@media (max-width:639px){
.fi-sk-stack{right:0;left:0;top:.6rem;align-items:center;max-width:none}
.fi-sk{width:auto;max-width:calc(100vw - 1.5rem);gap:.45rem;padding:.25rem .6rem .4rem .3rem;border-radius:999px;box-shadow:0 0 14px -8px var(--sc),0 6px 16px rgba(0,0,0,.5);animation-name:fi-sk-in-m}
.fi-sk[data-kind="milestone"]{width:auto;max-width:calc(100vw - 1.5rem);border-radius:1rem;padding:.35rem .7rem .5rem .4rem}
.fi-sk-ring{width:1.55rem;height:1.55rem;font-size:.85rem}
.fi-sk[data-kind="milestone"] .fi-sk-ring{width:2rem;height:2rem;font-size:1rem}
.fi-sk-title{font-size:.8rem}
.fi-sk .fi-sk-perk{display:none}
.fi-sk-chips{flex-wrap:nowrap;overflow:hidden}
.fi-sk-chips span:nth-child(n+3){display:none}
.fi-sk-time{left:.9rem;right:.9rem;bottom:.14rem}
}
@keyframes fi-sk-in-m{from{transform:translateY(-140%) scale(.92);opacity:0}}
@media (prefers-reduced-motion:reduce){.fi-sk,.fi-sk-glow,.fi-sk-ring,.fi-sk-title b,.fi-sk-chips span{animation:none}}
`;

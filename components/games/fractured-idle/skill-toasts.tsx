"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { McSymbol } from "@/components/mc-symbol";
import type { SkillDef } from "@/lib/fractured-idle/data";

// On-screen skill notifications. A level-up slides in as a card with the
// skill's color, the old and new level, what the level's perk is now worth
// and any milestone rewards it paid. Milestones get a bigger gold card with a
// burst. Cards stack (newest on top, at most four) and close on tap or after a
// few seconds. The parent pushes events through the ref.

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

const MAX = 3;

export const SkillToasts = forwardRef<SkillToastApi>(function SkillToasts(_, ref) {
    const [items, setItems] = useState<Item[]>([]);
    const id = useRef(1);
    const drop = useCallback((n: number) => setItems((c) => c.filter((i) => i.id !== n)), []);
    useImperativeHandle(ref, () => ({
        push: (ev) => setItems((c) => [{ ...ev, id: id.current++ }, ...c].slice(0, MAX)),
    }), []);
    if (!items.length) return null;
    return (
        <div className="fi-sk-stack" aria-live="polite">
            {items.map((i) => (
                <Toast key={i.id} ev={i} onClose={() => drop(i.id)} />
            ))}
        </div>
    );
});

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function burst(host: HTMLElement, milestone: boolean) {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = milestone ? 30 : 14;
    const box = host.getBoundingClientRect();
    const cx = 34;
    const cy = Math.min(box.height / 2, 40);
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
        const d = rand(milestone ? 40 : 28, milestone ? 120 : 76);
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
            { duration: rand(520, 900), easing: "cubic-bezier(.1,.7,.3,1)" },
        ).onfinish = () => el.remove();
    }
    for (let k = 0; k < (milestone ? 3 : 1); k++) {
        const ring = document.createElement("span");
        ring.className = "fi-sk-shock";
        ring.style.left = `${cx}px`;
        ring.style.top = `${cy}px`;
        host.appendChild(ring);
        ring.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0.9 }, { transform: "translate(-50%,-50%) scale(5)", opacity: 0 }], { duration: 700 + k * 180, delay: k * 140, easing: "ease-out", fill: "backwards" }).onfinish = () => ring.remove();
    }
}

function Toast({ ev, onClose }: { ev: Item; onClose: () => void }) {
    const fx = useRef<HTMLDivElement>(null);
    const ms = ev.kind === "milestone" ? 8000 : 5200;
    useEffect(() => {
        const t = setTimeout(onClose, ms);
        return () => clearTimeout(t);
    }, [ms, onClose]);
    useEffect(() => {
        if (fx.current) burst(fx.current, ev.kind === "milestone");
    }, [ev.kind]);
    const m = ev.kind === "milestone";
    return (
        <button type="button" onClick={onClose} className="fi-sk" data-kind={ev.kind} style={{ ["--sc" as string]: ev.skill.color, ["--ms" as string]: `${ms}ms` }}>
            <span className="fi-sk-glow" />
            <div ref={fx} className="fi-sk-fx" aria-hidden="true" />
            <span className="fi-sk-ring">
                <McSymbol name={ev.skill.symbol} />
            </span>
            <span className="fi-sk-body">
                <span className="fi-sk-tag">{m ? "Skill milestone" : "Skill level up"}</span>
                <span className="fi-sk-title">
                    {ev.skill.name} {ev.from > 0 && ev.from !== ev.to && <i>{ev.from}</i>}
                    {ev.from !== ev.to && <em>▸</em>} <b>{ev.to}</b>
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
            <i className="fi-sk-time" />
        </button>
    );
}

export const SKILL_TOAST_CSS = `
.fi-sk-stack{position:absolute;right:.75rem;top:4.6rem;z-index:45;display:flex;flex-direction:column;gap:.5rem;align-items:flex-end;pointer-events:none;max-width:calc(100% - 1.5rem)}
.fi-sk{pointer-events:auto;position:relative;display:flex;align-items:center;gap:.7rem;width:min(19rem,100%);padding:.6rem .8rem .75rem .6rem;border-radius:1rem;text-align:left;cursor:pointer;color:#fff;overflow:visible;background:linear-gradient(120deg,color-mix(in oklch,var(--sc) 26%,#0a0812),#0a0812 72%);border:1px solid color-mix(in oklch,var(--sc) 70%,transparent);box-shadow:0 0 26px -6px var(--sc),0 12px 30px rgba(0,0,0,.6);animation:fi-sk-in .5s cubic-bezier(.2,1.5,.35,1) both}
.fi-sk[data-kind="milestone"]{border-color:#ffd23a;background:linear-gradient(120deg,color-mix(in oklch,var(--sc) 30%,#1a1204),#0c0a06 70%);box-shadow:0 0 38px -4px #ffd23a,0 0 18px -6px var(--sc),0 14px 34px rgba(0,0,0,.65);animation:fi-sk-in .6s cubic-bezier(.2,1.5,.35,1) both,fi-sk-pulse 1.6s ease-in-out .6s 3}
.fi-sk-glow{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.22) 50%,transparent 70%);background-size:250% 100%;animation:fi-sk-shine 1.1s ease-out .15s both;pointer-events:none}
.fi-sk-fx{position:absolute;inset:0;pointer-events:none;overflow:visible}
.fi-sk-spark{position:absolute;width:.32rem;height:.32rem;border-radius:50%;background:var(--sc);box-shadow:0 0 8px var(--sc);pointer-events:none}
.fi-sk-shock{position:absolute;width:3.4rem;height:3.4rem;border-radius:50%;border:2px solid var(--sc);pointer-events:none}
.fi-sk-ring{position:relative;flex:none;display:grid;place-items:center;width:3.1rem;height:3.1rem;border-radius:50%;font-size:1.5rem;color:var(--sc);background:radial-gradient(circle at 35% 30%,color-mix(in oklch,var(--sc) 55%,#fff),color-mix(in oklch,var(--sc) 30%,#000) 70%);box-shadow:0 0 18px var(--sc),inset 0 0 10px rgba(0,0,0,.45);animation:fi-sk-spin .9s cubic-bezier(.2,1.4,.4,1) both}
.fi-sk-ring::before{content:"";position:absolute;inset:-5px;border-radius:50%;border:2px dashed color-mix(in oklch,var(--sc) 80%,#fff);opacity:.7;animation:fi-spin 8s linear infinite}
.fi-sk-ring svg,.fi-sk-ring>*{color:#fff;filter:drop-shadow(0 2px 0 rgba(0,0,0,.5))}
.fi-sk-body{display:flex;flex-direction:column;gap:.12rem;min-width:0;flex:1}
.fi-sk-tag{font-family:var(--font-rubik,inherit);font-size:.55rem;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in oklch,var(--sc) 75%,#fff)}
.fi-sk[data-kind="milestone"] .fi-sk-tag{color:#ffd23a;text-shadow:0 0 8px #ffaa00}
.fi-sk-title{font-family:var(--font-minecraft,inherit);font-size:1rem;line-height:1.1;color:var(--sc);text-shadow:0 0 10px var(--sc),0 2px 0 rgba(0,0,0,.6)}
.fi-sk-title i{font-style:normal;opacity:.55}
.fi-sk-title b{color:#fff;font-weight:400;display:inline-block;animation:fi-sk-num .7s cubic-bezier(.2,1.8,.4,1) .2s both}
.fi-sk-title em,.fi-sk-perk em{font-style:normal;opacity:.6;margin:0 .1rem}
.fi-sk-mname{font-family:var(--font-minecraft,inherit);font-size:.72rem;color:#ffd23a;text-shadow:0 0 8px #ffaa00}
.fi-sk-perk{font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-sk-perk b{color:var(--mc-green);font-weight:600}
.fi-sk-chips{display:flex;flex-wrap:wrap;gap:.2rem;margin-top:.15rem}
.fi-sk-chips span{font-family:var(--font-rubik,inherit);font-size:.58rem;padding:.08rem .4rem;border-radius:999px;color:#ffe9a8;border:1px solid rgba(255,210,58,.55);background:rgba(255,210,58,.12);animation:fi-sk-chip .4s ease-out backwards}
.fi-sk-chips span:nth-child(2){animation-delay:.12s}.fi-sk-chips span:nth-child(3){animation-delay:.24s}.fi-sk-chips span:nth-child(4){animation-delay:.36s}
.fi-sk-time{position:absolute;left:.7rem;right:.7rem;bottom:.3rem;height:2px;border-radius:2px;background:var(--sc);box-shadow:0 0 6px var(--sc);transform-origin:left;animation:fi-qte-time var(--ms) linear forwards;opacity:.8}
@keyframes fi-sk-in{from{transform:translateX(120%) scale(.85);opacity:0}}
@keyframes fi-sk-shine{from{background-position:160% 0}to{background-position:-60% 0}}
@keyframes fi-sk-spin{from{transform:rotate(-200deg) scale(.2)}}
@keyframes fi-sk-num{from{transform:scale(2.4);filter:brightness(2.4)}}
@keyframes fi-sk-chip{from{transform:translateY(6px) scale(.8);opacity:0}}
@keyframes fi-sk-pulse{0%,100%{box-shadow:0 0 38px -4px #ffd23a,0 14px 34px rgba(0,0,0,.65)}50%{box-shadow:0 0 62px 2px #ffd23a,0 14px 34px rgba(0,0,0,.65)}}
@media (prefers-reduced-motion:reduce){.fi-sk,.fi-sk-glow,.fi-sk-ring,.fi-sk-ring::before,.fi-sk-title b,.fi-sk-chips span{animation:none}}
`;

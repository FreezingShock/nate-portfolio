"use client";

import { useState, type CSSProperties } from "react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { sfx } from "@/lib/sound/sounds";
import { Tip, TipCard } from "./tooltip";

// The quick-action pad shared by the Mine and Farm tabs. One big "Do everything" button sits in the middle and every
// single action ring it, each with a clear icon, a count badge when there is something to do, and a tooltip saying
// what it does. Disabled ones stay visible but dim, so you always see the whole set. The ring adapts to the number of
// actions: 8 gives a 3 + 2 + 3 layout, 10 gives 4 + 2 + 4 (the big button then takes the two middle cells).

export interface QuickAct {
    k: string;
    label: string;
    icon: McSymbolName;
    tip: string;
    on: boolean;
    n?: number;
}

export function QuickPanel({ actions, color, allIcon = "spark8", allLabel = "Do everything", allTip, onRun, onAll }: {
    actions: QuickAct[];
    color: string;
    allIcon?: McSymbolName;
    allLabel?: string;
    allTip: string;
    onRun: (k: string) => void;
    onAll: () => void;
}) {
    const [fire, setFire] = useState(0);
    const k = actions.length;
    const top = Math.ceil((k - 2) / 2);
    const bottom = k - 2 - top;
    const cols = Math.max(top, bottom, 3);
    const span = Math.max(1, cols - 2);
    const any = actions.some((a) => a.on);
    const total = actions.reduce((n, a) => n + (a.on ? a.n ?? 1 : 0), 0);

    const place = (i: number): CSSProperties => {
        if (i < top) return { gridRow: 1, gridColumn: i + 1 };
        if (i === top) return { gridRow: 2, gridColumn: 1 };
        if (i === top + 1) return { gridRow: 2, gridColumn: cols };
        return { gridRow: 3, gridColumn: i - top - 1 };
    };

    return (
        <div className="fi-qp" role="group" aria-label="Quick actions" style={{ ["--q" as string]: color, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } as CSSProperties}>
            {actions.map((a, i) => (
                <Tip key={a.k} box className="fi-qp-w" tip={<TipCard title={a.label} color={color} lines={[a.tip]} foot={a.on ? (a.n ? `${a.n} ready` : "Ready") : "Nothing to do right now"} cta={a.on ? "Click!" : undefined} />}>
                    <button type="button" className="fi-qp-b" data-on={a.on} aria-disabled={!a.on} aria-label={a.on && a.n ? `${a.label}, ${a.n}` : a.label} style={place(i)} onClick={() => a.on && onRun(a.k)}>
                        <span className="fi-qp-i"><McSymbol name={a.icon} /></span>
                        <span className="fi-qp-l">{a.label}</span>
                        {a.on && a.n ? <i>{a.n}</i> : null}
                    </button>
                </Tip>
            ))}
            <Tip box className="fi-qp-w fi-qp-bigw" tip={<TipCard title={allLabel} color={color} lines={[allTip]} foot={any ? `${total} thing${total === 1 ? "" : "s"} ready` : "Nothing to do right now"} cta={any ? "Click to do it all!" : undefined} />}>
                <button
                    type="button"
                    className="fi-qp-big"
                    data-on={any}
                    data-snd="off"
                    aria-disabled={!any}
                    style={{ gridRow: 2, gridColumn: `2 / span ${span}` }}
                    onClick={() => {
                        if (!any) return;
                        sfx("bulk");
                        setFire((n) => n + 1);
                        onAll();
                    }}
                >
                    {fire > 0 && <b key={fire} className="fi-qp-burst" />}
                    <span className="fi-qp-bi"><McSymbol name={allIcon} /></span>
                    <span className="fi-qp-bl">{allLabel}</span>
                    <span className="fi-qp-bs">{any ? `${total} ready` : "all done"}</span>
                </button>
            </Tip>
        </div>
    );
}

export const QUICK_CSS = `
.fi-qp{--q:#fff;display:grid;grid-template-rows:3.1rem 4.6rem 3.1rem;gap:.35rem}
.fi-qp .fi-qp-w{display:block;min-width:0;min-height:0;display:contents}
.fi-qp .fi-tw-box{display:contents}
.fi-qp-b,.fi-qp-big{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.12rem;min-width:0;border-radius:.8rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.025);color:var(--muted-foreground);font-family:var(--font-minecraft,inherit);overflow:visible;touch-action:manipulation;transition:transform .14s cubic-bezier(.2,1.5,.4,1),background .18s,border-color .18s,box-shadow .18s,color .18s}
.fi-qp-i{display:grid;place-items:center;font-size:1.25rem;line-height:1;opacity:.45;filter:grayscale(.7);transition:transform .22s cubic-bezier(.2,1.7,.4,1),filter .18s,opacity .18s}
.fi-qp-l{font-size:.58rem;font-weight:700;letter-spacing:.04em;white-space:nowrap}
.fi-qp-b[aria-disabled="true"],.fi-qp-big[aria-disabled="true"]{cursor:default}
.fi-qp-b[data-on="true"]{color:#fff;border-color:color-mix(in oklch,var(--q) 55%,transparent);background:linear-gradient(160deg,color-mix(in oklch,var(--q) 22%,transparent),color-mix(in oklch,var(--q) 7%,transparent));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--q) 14%,transparent),0 4px 14px -8px var(--q)}
.fi-qp-b[data-on="true"] .fi-qp-i{opacity:1;filter:none;color:var(--q);text-shadow:0 0 12px var(--q)}
.fi-qp-b[data-on="true"]:hover{transform:translateY(-2px);background:linear-gradient(160deg,color-mix(in oklch,var(--q) 36%,transparent),color-mix(in oklch,var(--q) 12%,transparent));box-shadow:0 8px 18px -8px var(--q)}
.fi-qp-b[data-on="true"]:hover .fi-qp-i{transform:scale(1.22) rotate(-8deg)}
.fi-qp-b[data-on="true"]:active{transform:scale(.93)}
.fi-qp-b i{position:absolute;top:-.35rem;right:-.2rem;display:grid;place-items:center;min-width:1rem;height:1rem;padding:0 .24rem;border-radius:999px;background:var(--q);color:#14100a;font-style:normal;font-family:var(--font-rubik,inherit);font-size:.58rem;font-weight:700;line-height:1;box-shadow:0 0 0 2px color-mix(in oklch,var(--background) 90%,#000),0 0 8px var(--q);animation:fi-qp-pop .4s cubic-bezier(.2,1.8,.4,1)}
.fi-qp-big{gap:.15rem;border-radius:1.1rem;border-color:rgba(255,255,255,.14);overflow:hidden}
.fi-qp-bi{display:grid;place-items:center;font-size:2.1rem;line-height:1;opacity:.4;filter:grayscale(.8);transition:transform .3s cubic-bezier(.2,1.7,.4,1)}
.fi-qp-bl{font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.fi-qp-bs{font-family:var(--font-rubik,inherit);font-size:.6rem;opacity:.8}
.fi-qp-big[data-on="true"]{color:#fff;border-color:color-mix(in oklch,var(--q) 75%,transparent);background:radial-gradient(circle at 50% 30%,color-mix(in oklch,var(--q) 42%,transparent),color-mix(in oklch,var(--q) 12%,transparent) 70%),linear-gradient(135deg,transparent,color-mix(in oklch,#ffd23a 14%,transparent));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--q) 30%,transparent),0 0 22px -6px var(--q),0 8px 22px -10px var(--q);animation:fi-qp-glow 2.4s ease-in-out infinite}
.fi-qp-big[data-on="true"] .fi-qp-bi{opacity:1;filter:none;color:#fff;text-shadow:0 0 14px var(--q),0 0 30px var(--q);animation:fi-qp-spin 9s linear infinite}
.fi-qp-big[data-on="true"]:hover{transform:translateY(-2px) scale(1.015)}
.fi-qp-big[data-on="true"]:hover .fi-qp-bi{transform:scale(1.18)}
.fi-qp-big[data-on="true"]:active{transform:scale(.96)}
.fi-qp-big::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.16) 50%,transparent 65%);transform:translateX(-120%);pointer-events:none}
.fi-qp-big[data-on="true"]:hover::before{transform:translateX(120%);transition:transform .7s ease}
.fi-qp-burst{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;border:3px solid var(--q);box-shadow:0 0 18px var(--q);animation:fi-qp-burst .7s ease-out forwards;pointer-events:none}
.fi-qp-b:focus-visible,.fi-qp-big:focus-visible{outline:2px solid var(--q);outline-offset:2px}
@keyframes fi-qp-glow{0%,100%{box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--q) 30%,transparent),0 0 16px -8px var(--q),0 8px 22px -10px var(--q)}50%{box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--q) 50%,transparent),0 0 28px -4px var(--q),0 8px 22px -10px var(--q)}}
@keyframes fi-qp-spin{to{transform:rotate(360deg)}}
@keyframes fi-qp-burst{to{transform:scale(34);opacity:0}}
@keyframes fi-qp-pop{from{transform:scale(0)}}
@media (max-width:420px){.fi-qp{grid-template-rows:2.8rem 4rem 2.8rem}.fi-qp-l{font-size:.52rem}}
@media (prefers-reduced-motion:reduce){.fi-qp-big,.fi-qp-big .fi-qp-bi{animation:none!important}}
`;

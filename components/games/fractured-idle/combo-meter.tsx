"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { COMBO_MILESTONES, COMBO_TIERS, SURGE_GAIN, comboFill } from "@/lib/fractured-idle/combo";
import { comboBurst, comboPop, comboSpark, comboSurge } from "./button-fx";
import { tint } from "./ui";

// The combo meter under the button. The game loop pushes a frame into it every
// animation frame through the imperative API (no React re-render per frame);
// it writes the DOM directly and throws sparks off the glowing head of the bar.
// Collapsed to a slim line while idle, it opens up while you hold.

export interface ComboFrame {
    mult: number;
    fill: number; // 0..1 log-scaled
    rate: number; // held clicks per second
    active: boolean; // holding, or still draining
    holding: boolean;
    surge: number; // seconds of surge left
    tier: number;
    atMax: boolean;
}

export interface ComboApi {
    frame: (f: ComboFrame) => void;
    milestone: (value: number) => void;
    max: () => void;
    surge: () => void;
}

export interface ComboInfo {
    max: number;
    gain: number;
    surge: number; // chance per second
    cap: number;
    best: number;
    base: number; // base held clicks/s
}

const fmtMult = (m: number) => (m < 10 ? m.toFixed(2) : m < 100 ? m.toFixed(1) : String(Math.round(m)));

export const ComboMeter = forwardRef<ComboApi, { info: ComboInfo; enabled: boolean }>(function ComboMeter({ info, enabled }, apiRef) {
    const root = useRef<HTMLDivElement>(null);
    const nameEl = useRef<HTMLSpanElement>(null);
    const multEl = useRef<HTMLSpanElement>(null);
    const rateEl = useRef<HTMLSpanElement>(null);
    const track = useRef<HTMLDivElement>(null);
    const fill = useRef<HTMLDivElement>(null);
    const head = useRef<HTMLDivElement>(null);
    const fx = useRef<HTMLDivElement>(null);
    const last = useRef({ active: false, surge: false, atMax: false, tier: -1, fill: 0, sparkAt: 0 });
    const [open, setOpen] = useState(false);

    const geom = () => {
        const r = root.current;
        const t = track.current;
        return { w: r?.clientWidth ?? 0, y: t ? t.offsetTop + t.offsetHeight / 2 : 0 };
    };
    const tierColor = () => COMBO_TIERS[Math.max(0, last.current.tier)].color;

    useImperativeHandle(apiRef, () => ({
        frame(f) {
            const r = root.current;
            const L = last.current;
            if (!r) return;
            if (L.active !== f.active) r.dataset.active = String(f.active);
            const surging = f.surge > 0;
            if (L.surge !== surging) r.dataset.surge = String(surging);
            if (L.atMax !== f.atMax) r.dataset.max = String(f.atMax);
            if (L.tier !== f.tier) {
                const t = COMBO_TIERS[f.tier];
                r.style.setProperty("--cs", t.color);
                if (nameEl.current) {
                    nameEl.current.textContent = t.name;
                    if (L.tier >= 0 && f.tier > L.tier) nameEl.current.animate([{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
                }
            }
            L.active = f.active;
            L.surge = surging;
            L.atMax = f.atMax;
            L.tier = f.tier;
            L.fill = f.fill;
            const pct = `${(f.fill * 100).toFixed(2)}%`;
            if (fill.current) fill.current.style.width = pct;
            if (head.current) head.current.style.left = pct;
            if (multEl.current) {
                multEl.current.textContent = `x${fmtMult(f.mult)}`;
                const j = f.holding ? f.fill * 1.8 + (surging ? 1 : 0) : 0; // the number shakes harder the hotter it gets
                multEl.current.style.transform = j ? `translate(${((Math.random() - 0.5) * j).toFixed(1)}px,${((Math.random() - 0.5) * j).toFixed(1)}px)` : "";
            }
            if (rateEl.current) rateEl.current.textContent = `${f.rate.toFixed(1)}/s`;
            r.style.setProperty("--sp", `${(0.9 - 0.65 * f.fill).toFixed(2)}s`);
            if (f.holding && fx.current && Math.random() < (0.12 + 0.5 * f.fill) * (surging ? 2 : 1)) {
                const { w, y } = geom();
                comboSpark(fx.current, w * f.fill, y, surging ? "#ffd23a" : tierColor(), f.fill);
            }
        },
        milestone(v) {
            if (!fx.current) return;
            const { w, y } = geom();
            comboPop(fx.current, `x${v}!`, Math.max(24, Math.min(w - 24, w * last.current.fill)), y, last.current.surge ? "#ffd23a" : tierColor());
            root.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }], { duration: 200, easing: "ease-out" });
        },
        max() {
            if (!fx.current) return;
            const { w, y } = geom();
            comboBurst(fx.current, w, y, tierColor());
        },
        surge() {
            if (!fx.current) return;
            const { w, y } = geom();
            comboSurge(fx.current, w, y);
        },
    }));

    if (!enabled) return null;
    const c0 = COMBO_TIERS[0].color;
    return (
        <div
            ref={root}
            className="fi-combo"
            data-active="false"
            data-surge="false"
            data-max="false"
            style={{ ["--cs" as string]: c0 }}
            onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        >
            {open && <ComboCard info={info} />}
            <button type="button" className="fi-combo-hit" aria-expanded={open} aria-label="Combo details" onClick={() => setOpen((o) => !o)}>
                <span className="fi-combo-top">
                    <span ref={nameEl} className="fi-combo-name">{COMBO_TIERS[0].name}</span>
                    <span className="fi-combo-surge">⚡ SURGE x{SURGE_GAIN}</span>
                    <span ref={multEl} className="fi-combo-mult">x1.00</span>
                    <span ref={rateEl} className="fi-combo-rate">{info.base.toFixed(1)}/s</span>
                </span>
                <span ref={track} className="fi-combo-track" role="progressbar" aria-label="Combo multiplier" aria-valuemin={1} aria-valuemax={info.max}>
                    {COMBO_MILESTONES.filter((m) => m < info.max - 0.05).map((m) => (
                        <span key={m} className="fi-combo-tick" style={{ left: `${comboFill(m, info.max) * 100}%` }} />
                    ))}
                    <span ref={fill} className="fi-combo-fill" />
                    <span ref={head} className="fi-combo-head" />
                </span>
                <span className="fi-combo-sub">
                    <span>Hold to build a combo</span>
                    <span>max x{fmtMult(info.max)}</span>
                </span>
            </button>
            <div ref={fx} className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true" />
        </div>
    );
});

function ComboCard({ info }: { info: ComboInfo }) {
    const rows: [string, string][] = [
        ["Max multiplier", `x${fmtMult(info.max)}`],
        ["Build speed", `x${info.gain.toFixed(2)}`],
        ["Surge chance", `${(info.surge * 100).toFixed(1)}% per second`],
        ["Held clicks", `${info.base}/s x combo, up to ${info.cap}/s`],
        ["Best ever", `x${fmtMult(info.best)}`],
    ];
    return (
        <div className="fi-combo-card" role="tooltip">
            <div className="font-minecraft font-bold text-xs" style={{ color: "var(--mc-yellow)" }}>Combo</div>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                Hold the button or Space. The multiplier doubles every few seconds up to your max. It multiplies click value, speeds up held clicks, gives minions a small boost and brings treasure bobbers sooner.
            </p>
            <div className="mt-1.5 space-y-0.5">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 text-[10px]">
                        <span className="text-muted-foreground">{k}</span>
                        <span style={{ color: "var(--mc-green)" }}>{v}</span>
                    </div>
                ))}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug" style={{ color: tint("var(--mc-aqua)", 90) }}>
                Raise it with Training upgrades, rebirth and ascension upgrades, Combat and Mining levels, and button looks. A rare surge builds the combo {SURGE_GAIN}x faster.
            </p>
        </div>
    );
}

export const COMBO_CSS = `
.fi-combo{position:relative;width:100%;max-width:19rem;margin:0 auto;--ct:var(--cs)}
.fi-combo[data-surge="true"]{--ct:#ffd23a}
.fi-combo-hit{display:block;width:100%;text-align:left;background:none;border:0;padding:.3rem .15rem .1rem;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}
.fi-combo-hit:focus-visible{box-shadow:0 0 0 2px var(--ct);border-radius:.5rem}
.fi-combo-top{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem;max-height:0;opacity:0;overflow:hidden;transition:max-height .28s ease,opacity .2s ease;white-space:nowrap}
.fi-combo[data-active="true"] .fi-combo-top{max-height:2.4rem;opacity:1;overflow:visible}
.fi-combo-name{font-family:var(--font-minecraft,inherit);font-size:.66rem;text-transform:uppercase;letter-spacing:.14em;color:var(--ct);text-shadow:0 0 10px var(--ct);flex:1;display:inline-block;transform-origin:left center}
.fi-combo-surge{display:none;font-family:var(--font-minecraft,inherit);font-size:.6rem;color:#ffd23a;text-shadow:0 0 8px #ffd23a;animation:fi-blink2 .5s ease-in-out infinite alternate}
.fi-combo[data-surge="true"] .fi-combo-surge{display:inline}
.fi-combo-mult{font-family:var(--font-minecraft,inherit);font-size:1.55rem;line-height:1.1;color:#fff;text-shadow:0 0 12px var(--ct),0 2px 0 rgba(0,0,0,.6);min-width:4.2rem;text-align:right;display:inline-block}
.fi-combo[data-max="true"] .fi-combo-mult::after{content:"MAX";font-size:.55rem;margin-left:.3rem;padding:.05rem .25rem;border-radius:.25rem;background:var(--ct);color:#000;text-shadow:none;vertical-align:middle;animation:fi-blink2 .6s ease-in-out infinite alternate}
.fi-combo-rate{font-family:var(--font-rubik,inherit);font-size:.65rem;color:var(--muted-foreground);min-width:2.6rem;text-align:right}
.fi-combo-track{position:relative;display:block;height:.42rem;border-radius:999px;background:rgba(255,255,255,.1);box-shadow:inset 0 1px 2px rgba(0,0,0,.5);transition:height .22s ease}
.fi-combo[data-active="true"] .fi-combo-track{height:.85rem}
.fi-combo-tick{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:rgba(255,255,255,.22);border-radius:1px;z-index:2}
.fi-combo-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background:linear-gradient(90deg,color-mix(in oklch,var(--ct) 45%,#000),var(--ct));box-shadow:0 0 14px var(--ct);overflow:hidden;z-index:1}
.fi-combo-fill::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.3) 0 6px,transparent 6px 14px);background-size:28px 100%;animation:fi-stripes var(--sp,.9s) linear infinite}
.fi-combo[data-surge="true"] .fi-combo-fill{background:linear-gradient(90deg,#b87b00,#ffd23a,#fff3a0,#ffd23a);background-size:200% 100%;animation:fi-slide 0.6s linear infinite}
.fi-combo-head{position:absolute;top:50%;left:0;width:.95rem;height:.95rem;border-radius:50%;background:radial-gradient(circle,#fff 30%,var(--ct));box-shadow:0 0 14px 4px var(--ct);transform:translate(-50%,-50%);opacity:0;transition:opacity .2s;z-index:3}
.fi-combo[data-active="true"] .fi-combo-head{opacity:1}
.fi-combo-sub{display:flex;justify-content:space-between;margin-top:.25rem;font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);opacity:.75;transition:opacity .2s}
.fi-combo[data-active="true"] .fi-combo-sub{opacity:.5}
.fi-combo-card{position:absolute;left:50%;bottom:calc(100% + .35rem);transform:translateX(-50%);width:16.5rem;max-width:92vw;padding:.55rem .65rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.18);background:color-mix(in oklch,var(--background) 92%,black);box-shadow:0 10px 30px rgba(0,0,0,.55);z-index:30;font-family:var(--font-rubik,inherit);pointer-events:none}
@keyframes fi-stripes{to{background-position:28px 0}}
@keyframes fi-blink2{from{opacity:.55}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.fi-combo-fill::after,.fi-combo[data-surge="true"] .fi-combo-fill,.fi-combo-surge,.fi-combo[data-max="true"] .fi-combo-mult::after{animation:none}.fi-combo-top,.fi-combo-track{transition:none}}
`;

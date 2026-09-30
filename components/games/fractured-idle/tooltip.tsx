"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { TipSource } from "./ui";

// One tooltip system for the whole game.
//
//   <TipProvider hostRef={ref}>  owns the single floating tooltip layer (mount it once, inside the game root)
//   <Tip tip={...}>child</Tip>   wrap anything to give it a tooltip; `tip` is content or a function that is
//                                re-evaluated while the tooltip is open, so numbers stay live
//   <TipCard title rows lines /> the standard body: title, short text, label/value rows, footnote
//
// Mouse: follows the cursor after a short delay. Keyboard: shows on focus-visible.
// Touch: tap to show, tap anywhere else (or wait a few seconds) to dismiss.
// The imperative host (show/move/hide) is also exposed for lists that want to drive it by hand.

export interface TipHost {
    show: (render: () => ReactNode, src: TipSource, delay?: number) => void;
    move: (src: TipSource) => void;
    hide: () => void;
}

const HostCtx = createContext<TipHost | null>(null);
export const useTipHost = () => useContext(HostCtx);

type Pos = { x: number; y: number; el?: Element };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

export function TipProvider({ hostRef, children }: { hostRef?: MutableRefObject<TipHost | null>; children: ReactNode }) {
    const [view, setView] = useState<{ render: (() => ReactNode) | null; open: boolean }>({ render: null, open: false });
    const [, tick] = useState(0);
    const box = useRef<HTMLDivElement>(null);
    const pos = useRef<Pos>({ x: 0, y: 0 });
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const auto = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const place = useCallback(() => {
        const el = box.current;
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const p = pos.current;
        let x: number;
        let y: number;
        if (p.el) {
            const r = p.el.getBoundingClientRect();
            x = r.left + r.width / 2 - w / 2;
            y = r.top - h - 10;
            if (y < 8) y = r.bottom + 10;
        } else {
            x = p.x + 14;
            y = p.y - 14 - h;
            if (x + w > vw - 8) x = p.x - 14 - w;
            if (y < 8) y = p.y + 18;
        }
        el.style.transform = `translate3d(${Math.round(clamp(x, 8, vw - w - 8))}px,${Math.round(clamp(y, 8, vh - h - 8))}px,0)`;
    }, []);

    const setPos = (src: TipSource) => {
        pos.current = "clientX" in src ? { x: src.clientX, y: src.clientY } : { x: 0, y: 0, el: src };
    };

    const host = useMemo<TipHost>(
        () => ({
            show: (render, src, delay = 0) => {
                setPos(src);
                clearTimeout(timer.current);
                clearTimeout(auto.current);
                const open = () => {
                    setView({ render, open: true });
                    requestAnimationFrame(place);
                };
                if (delay > 0) timer.current = setTimeout(open, delay);
                else open();
                if (!("clientX" in src)) auto.current = setTimeout(() => setView((v) => ({ ...v, open: false })), 6000);
            },
            move: (src) => {
                setPos(src);
                place();
            },
            hide: () => {
                clearTimeout(timer.current);
                clearTimeout(auto.current);
                setView((v) => (v.open ? { ...v, open: false } : v));
            },
        }),
        [place],
    );

    useEffect(() => {
        if (hostRef) hostRef.current = host;
        return () => {
            if (hostRef) hostRef.current = null;
        };
    }, [host, hostRef]);

    // Live content while open; touch taps elsewhere and scrolling dismiss it.
    useEffect(() => {
        if (!view.open) return;
        const iv = setInterval(() => tick((n) => n + 1), 250);
        const away = (e: PointerEvent) => {
            const el = pos.current.el;
            if (e.pointerType !== "mouse" && !(el && e.target instanceof Node && el.contains(e.target))) host.hide();
        };
        const off = () => host.hide();
        window.addEventListener("pointerdown", away, true);
        window.addEventListener("scroll", off, true);
        return () => {
            clearInterval(iv);
            window.removeEventListener("pointerdown", away, true);
            window.removeEventListener("scroll", off, true);
        };
    }, [view.open, host]);

    useLayoutEffect(() => {
        if (view.open) place();
    });

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            clearTimeout(auto.current);
        },
        [],
    );

    return (
        <HostCtx.Provider value={host}>
            {children}
            <div ref={box} className="fi-tipbox" aria-hidden="true">
                <div className="fi-tip" role="tooltip" data-open={view.open}>
                    {view.render?.()}
                </div>
            </div>
        </HostCtx.Provider>
    );
}

const anchorOf = (el: HTMLElement) => (el.firstElementChild as HTMLElement | null) ?? el;

interface TipProps {
    tip: ReactNode | (() => ReactNode);
    children: ReactNode;
    /** Give the wrapper a real box (needed around disabled buttons) and lay it out with `className`. */
    box?: boolean;
    className?: string;
    delay?: number;
}

/** Wrap anything to give it a tooltip. Content of `null` / `false` shows nothing. */
export function Tip({ tip, children, box, className = "", delay = 140 }: TipProps) {
    const host = useContext(HostCtx);
    const latest = useRef(tip);
    useEffect(() => {
        latest.current = tip;
    });
    if (!host || tip === null || tip === undefined || tip === false) return <>{children}</>;
    const render = () => {
        const t = latest.current;
        return typeof t === "function" ? (t as () => ReactNode)() : t;
    };
    return (
        <span
            className={box ? `fi-tw-box ${className}` : "fi-tw"}
            onPointerOver={(e) => {
                if (e.pointerType !== "mouse" || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                host.show(render, e, delay);
            }}
            onPointerMove={(e) => e.pointerType === "mouse" && host.move(e)}
            onPointerOut={(e) => {
                if (e.pointerType !== "mouse" || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                host.hide();
            }}
            onPointerDown={(e) => {
                if (e.pointerType !== "mouse") host.show(render, anchorOf(e.currentTarget), 0);
            }}
            onFocus={(e) => {
                if ((e.target as HTMLElement).matches?.(":focus-visible")) host.show(render, e.target as Element, 0);
            }}
            onBlur={() => host.hide()}
        >
            {children}
        </span>
    );
}

// ---- Standard body ----

export type TipRow = [label: string, value: ReactNode, color?: string];

export function TipCard({ title, color = "var(--mc-aqua)", tag, lines, rows, foot }: { title: string; color?: string; tag?: string; lines?: ReactNode[]; rows?: TipRow[]; foot?: ReactNode }) {
    return (
        <div className="fi-tp">
            <div className="fi-tp-h">
                <span className="tl" style={{ color }}>{title}</span>
                {tag && <em style={{ color, borderColor: `color-mix(in oklch, ${color} 55%, transparent)` }}>{tag}</em>}
            </div>
            {lines?.map((l, i) => (
                <p key={i} className="fi-tp-p">{l}</p>
            ))}
            {rows && rows.length > 0 && (
                <dl className="fi-tp-r">
                    {rows.map(([k, v, c], i) => (
                        <div key={i}>
                            <dt>{k}</dt>
                            <dd style={c ? { color: c } : undefined}>{v}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {foot && <div className="fi-tp-f">{foot}</div>}
        </div>
    );
}

export const TIP_CSS = `
.fi-tipbox{position:fixed;left:0;top:0;z-index:90;pointer-events:none;will-change:transform}
.fi-tw{display:contents}
.fi-tw-box{display:block;min-width:0}
.fi-tw-box button:disabled,.fi-tw-box [aria-disabled="true"]{pointer-events:none}
.fi-tp{display:flex;flex-direction:column;gap:.3rem;font-family:var(--font-rubik,inherit)}
.fi-tp-h{display:flex;align-items:center;justify-content:space-between;gap:.6rem}
.fi-tp-h .tl{font-family:var(--font-minecraft,inherit);font-size:13px}
.fi-tp-h em{font-style:normal;font-size:9px;letter-spacing:.08em;text-transform:uppercase;padding:0 .4rem;border:1px solid;border-radius:999px;white-space:nowrap}
.fi-tp-p{margin:0;font-size:11px;line-height:1.4;color:#d8d3e6}
.fi-tp-r{margin:0;display:flex;flex-direction:column;gap:1px;border-top:1px solid rgba(255,255,255,.12);padding-top:.3rem}
.fi-tp-r>div{display:flex;justify-content:space-between;gap:.8rem;font-size:11px}
.fi-tp-r dt{color:#a59fb8}
.fi-tp-r dd{margin:0;font-family:var(--font-minecraft,inherit);font-size:12px;color:#fff;text-align:right}
.fi-tp-f{font-size:10px;color:#8f89a3;border-top:1px dashed rgba(255,255,255,.12);padding-top:.25rem}
`;

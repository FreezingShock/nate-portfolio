"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { McSymbol } from "@/components/mc-symbol";
import type { Derived } from "@/lib/fractured-idle/engine";
import { GRADE_LABEL, type Grade, type PopupKind, type PopupSpec } from "@/lib/fractured-idle/events";

// Quick time events: small cards that drop in over the button column.
//   timing  Precision Strike: stop the sliding marker in the sweet spot.
//   mash    Rapid Fire: tap the big button enough times before the clock runs out.
//   rune    Rune Code: repeat the arrow sequence (keys, WASD or the pad).
// Each card reports one grade through onResolve (the parent pays it out and
// plays the effects) and then closes itself a moment later. `keyRef` lets the
// parent forward E / arrow / WASD key presses to whichever card is open.

export interface QteProps {
    spec: PopupSpec;
    d: Derived;
    keyRef: MutableRefObject<((key: string) => boolean) | null>;
    onResolve: (grade: Grade, at: { cx: number; cy: number } | null) => void;
    onClose: () => void;
}

const META: Record<string, { title: string; color: string; symbol: React.ComponentProps<typeof McSymbol>["name"]; hint: string }> = {
    timing: { title: "Precision Strike", color: "var(--mc-aqua)", symbol: "critChance", hint: "E or tap" },
    mash: { title: "Rapid Fire", color: "var(--mc-red)", symbol: "attackSpeed", hint: "tap / E" },
    rune: { title: "Rune Code", color: "var(--mc-light-purple)", symbol: "portal", hint: "arrows / WASD" },
};

const GRADE_COLOR: Record<Grade, string> = { perfect: "var(--mc-gold)", great: "var(--mc-green)", good: "var(--mc-aqua)", miss: "var(--muted-foreground)" };

function useFinish({ spec, onResolve, onClose }: Pick<QteProps, "spec" | "onResolve" | "onClose">) {
    const card = useRef<HTMLDivElement>(null);
    const [result, setResult] = useState<Grade | null>(null);
    const done = useRef(false);
    const cb = useRef({ onResolve, onClose });
    useEffect(() => {
        cb.current = { onResolve, onClose };
    });
    const finish = useCallback((g: Grade) => {
        if (done.current) return;
        done.current = true;
        setResult(g);
        const r = card.current?.getBoundingClientRect();
        cb.current.onResolve(g, r ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2 } : null);
        setTimeout(() => cb.current.onClose(), g === "miss" ? 700 : 1150);
    }, []);
    // Nobody tried: it just fizzles when its time is up.
    useEffect(() => {
        const t = setTimeout(() => finish("miss"), spec.life * 1000);
        return () => clearTimeout(t);
    }, [spec.life, finish]);
    return { card, result, finish, done };
}

function Shell({ kind, life, result, timeBar = true, cardRef, children }: { kind: PopupKind; life: number; result: Grade | null; timeBar?: boolean; cardRef: React.RefObject<HTMLDivElement | null>; children: ReactNode }) {
    const m = META[kind];
    return (
        <div ref={cardRef} className="fi-qte" style={{ ["--qc" as string]: m.color, ["--life" as string]: `${life}s` }} data-grade={result ?? ""}>
            <div className="fi-qte-head">
                <span className="text-sm"><McSymbol name={m.symbol} /></span>
                <span className="min-w-0 flex-1 truncate">{m.title}</span>
                <kbd>{m.hint}</kbd>
            </div>
            {children}
            {timeBar && (
                <div className="fi-qte-time">
                    <i style={{ animationPlayState: result ? "paused" : "running" }} />
                </div>
            )}
            {result && (
                <div className="fi-qte-result" style={{ ["--gc" as string]: GRADE_COLOR[result] }}>
                    {GRADE_LABEL[kind][result]}
                </div>
            )}
        </div>
    );
}

// ---- Precision Strike ----

function TimingQte(props: QteProps) {
    const { spec, d, keyRef } = props;
    const { card, result, finish, done } = useFinish(props);
    const [zone] = useState(() => 0.28 + Math.random() * 0.44);
    const sweet = Math.min(0.36, 0.14 * d.qteSize); // half-widths, as fractions of the track
    const great = sweet * 0.62;
    const perfect = sweet * 0.28;
    const marker = useRef<HTMLDivElement>(null);
    const pos = useRef(0);

    useEffect(() => {
        const phase0 = Math.random() * 2;
        const t0 = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            if (done.current) return;
            const ph = (phase0 + ((now - t0) / 1000) * 0.85) % 2;
            pos.current = ph < 1 ? ph : 2 - ph;
            if (marker.current) marker.current.style.left = `${pos.current * 100}%`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [done]);

    const strike = useCallback(() => {
        if (done.current) return;
        const dist = Math.abs(pos.current - zone);
        finish(dist <= perfect ? "perfect" : dist <= great ? "great" : dist <= sweet ? "good" : "miss");
    }, [done, finish, zone, perfect, great, sweet]);

    useEffect(() => {
        keyRef.current = (k) => {
            if (k !== "e" && k !== "Enter") return false;
            strike();
            return true;
        };
        const ref = keyRef;
        return () => {
            ref.current = null;
        };
    }, [keyRef, strike]);

    const z = (half: number) => ({ left: `${(zone - half) * 100}%`, width: `${half * 200}%` });
    return (
        <Shell kind="timing" life={spec.life} result={result} cardRef={card}>
            <div className="fi-qte-track">
                <div className="fi-qte-zone" style={z(sweet)} />
                <div className="fi-qte-zone fi-qte-zone-great" style={z(great)} />
                <div className="fi-qte-zone fi-qte-zone-perfect" style={z(perfect)} />
                <div ref={marker} className="fi-qte-marker" />
            </div>
            <button type="button" className="fi-qte-btn" onPointerDown={(e) => { e.preventDefault(); strike(); }}>
                STRIKE
            </button>
        </Shell>
    );
}

// ---- Rapid Fire ----

const MASH_NEED = 14;
const RING = 2 * Math.PI * 34;

function MashQte(props: QteProps) {
    const { spec, d, keyRef } = props;
    const { card, result, finish, done } = useFinish(props);
    const win = 4 + d.qteTime;
    const [count, setCount] = useState(0);
    const n = useRef(0);
    const started = useRef(0);
    const [go, setGo] = useState(false);

    const tap = useCallback(() => {
        if (done.current) return;
        if (!started.current) {
            started.current = performance.now();
            setGo(true);
            setTimeout(() => {
                if (done.current) return;
                finish(n.current >= MASH_NEED * 0.6 ? "good" : "miss");
            }, win * 1000);
        }
        n.current += 1;
        setCount(n.current);
        if (n.current >= MASH_NEED) {
            const left = 1 - (performance.now() - started.current) / 1000 / win;
            finish(left > 0.4 ? "perfect" : "great");
        }
    }, [done, finish, win]);

    useEffect(() => {
        keyRef.current = (k) => {
            if (k !== "e" && k !== "Enter") return false;
            tap();
            return true;
        };
        const ref = keyRef;
        return () => {
            ref.current = null;
        };
    }, [keyRef, tap]);

    return (
        <Shell kind="mash" life={spec.life} result={result} cardRef={card} timeBar={!go}>
            <div className="flex items-center justify-center gap-3 py-1">
                <button type="button" className="fi-mash" onPointerDown={(e) => { e.preventDefault(); tap(); }} aria-label="Mash">
                    <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--qc)" strokeWidth="5" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - Math.min(1, count / MASH_NEED))} style={{ transition: "stroke-dashoffset .08s linear", filter: "drop-shadow(0 0 6px var(--qc))" }} />
                    </svg>
                    <span key={count} className="fi-mash-core">{count >= MASH_NEED ? "!" : "MASH"}</span>
                </button>
                <div className="font-minecraft text-xs leading-tight">
                    <div className="text-lg" style={{ color: "var(--qc)" }}>{count}/{MASH_NEED}</div>
                    <div className="font-rubik text-[10px] text-muted-foreground">{go ? `${win.toFixed(1)}s from your first tap` : "tap to start"}</div>
                </div>
            </div>
            {go && (
                <div className="fi-qte-time">
                    <i style={{ animationDuration: `${win}s`, animationPlayState: result ? "paused" : "running" }} />
                </div>
            )}
        </Shell>
    );
}

// ---- Rune Code ----

const ARROWS = ["↑", "→", "↓", "←"];
const KEY_DIR: Record<string, number> = { ArrowUp: 0, w: 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3 };

function RuneQte(props: QteProps) {
    const { spec, keyRef } = props;
    const { card, result, finish, done } = useFinish(props);
    const [seq] = useState(() => Array.from({ length: 4 }, () => Math.floor(Math.random() * 4)));
    const [idx, setIdx] = useState(0);
    const [oops, setOops] = useState(0);
    const at = useRef(0);
    const mistakes = useRef(0);

    const press = useCallback(
        (dir: number) => {
            if (done.current) return;
            if (seq[at.current] === dir) {
                at.current += 1;
                setIdx(at.current);
                if (at.current >= seq.length) finish(mistakes.current === 0 ? "perfect" : mistakes.current <= 1 ? "great" : "good");
            } else {
                mistakes.current += 1;
                at.current = 0;
                setIdx(0);
                setOops((o) => o + 1);
            }
        },
        [done, finish, seq],
    );

    useEffect(() => {
        keyRef.current = (k) => {
            const dir = KEY_DIR[k];
            if (dir === undefined) return false;
            press(dir);
            return true;
        };
        const ref = keyRef;
        return () => {
            ref.current = null;
        };
    }, [keyRef, press]);

    const pad = (dir: number, cls: string) => (
        <button type="button" className={`fi-rune-key ${cls}`} onPointerDown={(e) => { e.preventDefault(); press(dir); }} aria-label={`Arrow ${ARROWS[dir]}`}>
            {ARROWS[dir]}
        </button>
    );
    return (
        <Shell kind="rune" life={spec.life} result={result} cardRef={card}>
            <div className="flex items-center justify-between gap-3 py-1">
                <div key={oops} className="fi-rune-row" data-oops={oops > 0 ? "1" : ""}>
                    {seq.map((dir, i) => (
                        <span key={i} className="fi-rune-glyph" data-state={i < idx ? "done" : i === idx ? "now" : "next"}>
                            {ARROWS[dir]}
                        </span>
                    ))}
                </div>
                <div className="fi-rune-pad">
                    {pad(0, "up")}
                    {pad(3, "left")}
                    {pad(2, "down")}
                    {pad(1, "right")}
                </div>
            </div>
        </Shell>
    );
}

export function QteCard(props: QteProps) {
    switch (props.spec.kind) {
        case "timing":
            return <TimingQte {...props} />;
        case "mash":
            return <MashQte {...props} />;
        default:
            return <RuneQte {...props} />;
    }
}

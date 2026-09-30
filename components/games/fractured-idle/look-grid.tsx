"use client";

import { memo, type KeyboardEvent, type PointerEvent } from "react";
import { Check, Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { CATS, isUnlocked, lookKey, lookProgress, type Cat, type LookDef } from "@/lib/fractured-idle/button";
import type { State } from "@/lib/fractured-idle/data";
import { Aura, ButtonFace } from "./button-face";
import { tint } from "./ui";

// The look picker: a dense inventory grid (owned looks first, then the ones
// still locked, closest to unlocking first). Hover / focus previews a look on
// the stage, click equips. The grid is memoized: the game re-renders ten times
// a second, so it only updates when `rev` (a once-a-second tick plus anything
// that changes what a cell shows) changes.

const C = "var(--mc-aqua)";
const FX_ICON: Record<string, string> = {
    ripple: "◎", sparks: "✷", pixels: "▦", bubbles: "○", stars: "✦", hearts: "♥", embers: "♨", leaves: "❦", coins: "●", frost: "❄", confetti: "✺", shock: "☄", runes: "ᚠ", lightning: "ϟ", fireworks: "✹", spiral: "꩜",
    pulse: "◉", bolt: "ϟ", cross: "✚", shatter: "✧", meteor: "☄", implode: "◍", nova: "✸",
};

export function Preview({ cat, l, shape, skin, glyph, island, accent }: { cat: Cat; l: LookDef; shape: string; skin: string; glyph: string; island: string; accent: string }) {
    switch (cat) {
        case "shape":
            return <ButtonFace shape={l.id} skin={skin} glyph={glyph} color={island} depth={3} className="size-9" />;
        case "skin":
            return <ButtonFace shape={shape} skin={l.id} glyph={glyph} color={island} depth={3} className="size-9" />;
        case "aura":
            return (
                <span className="relative block size-8">
                    <Aura id={l.id} accent={accent} />
                    <ButtonFace shape="orb" skin={skin} glyph={glyph} color={island} depth={2} className="relative z-[1] size-full" />
                </span>
            );
        case "color": {
            const rainbow = l.color === "rainbow";
            const c = rainbow ? "conic-gradient(#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5f5f)" : l.color || accent;
            return <span className="block size-7 rounded-full" style={{ background: c, boxShadow: `0 0 12px ${rainbow ? "#b05fff" : l.color || accent}` }} />;
        }
        case "nums":
            return (
                <span className={`fi-ns-${l.id} font-minecraft text-sm`} style={{ ["--ac" as string]: accent, color: "#fff", textShadow: "0 2px 0 #000" }}>
                    123
                </span>
            );
        case "glyph":
            return <span className="text-2xl" style={{ color: "#fff" }}><McSymbol name={l.symbol!} /></span>;
        default: {
            const c = cat === "crit" ? "var(--mc-aqua)" : "var(--mc-light-purple)";
            return (
                <span className="grid size-8 place-items-center rounded-full text-lg" style={{ color: c, backgroundColor: tint(c, 16) }}>
                    {FX_ICON[l.id] ?? "✦"}
                </span>
            );
        }
    }
}

interface GridProps {
    s: State; // mutated in place; cells read it, `rev` tells us when to
    cat: Cat;
    rev: number;
    equipped: string;
    focusId: string | null;
    shape: string;
    skin: string;
    glyph: string;
    island: string;
    accent: string;
    onFocus: (cat: Cat, id: string) => void;
    onLeave: () => void;
    onPick: (cat: Cat, l: LookDef) => void;
}

/** Arrow keys move between cells: left/right by one, up/down to the nearest cell in the next row. */
function arrows(e: KeyboardEvent<HTMLDivElement>) {
    const k = e.key;
    if (!k.startsWith("Arrow")) return;
    const cells = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-look]")];
    const i = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let next: HTMLButtonElement | undefined;
    if (k === "ArrowRight") next = cells[i + 1];
    else if (k === "ArrowLeft") next = cells[i - 1];
    else {
        const cur = cells[i];
        const dir = k === "ArrowDown" ? 1 : -1;
        const rows = [...new Set(cells.map((c) => c.offsetTop))].sort((a, b) => a - b);
        const r = rows.indexOf(cur.offsetTop) + dir;
        if (r >= 0 && r < rows.length) {
            next = cells.filter((c) => c.offsetTop === rows[r]).sort((a, b) => Math.abs(a.offsetLeft - cur.offsetLeft) - Math.abs(b.offsetLeft - cur.offsetLeft))[0];
        }
    }
    if (next) {
        e.preventDefault();
        next.focus();
    }
}

export const LookGrid = memo(function LookGrid({ s, cat, equipped, focusId, shape, skin, glyph, island, accent, onFocus, onLeave, onPick }: GridProps) {
    const list = CATS.find((c) => c.id === cat)!.list;
    const owned = list.filter((l) => isUnlocked(s, l));
    const locked = list.filter((l) => !isUnlocked(s, l)).sort((a, b) => lookProgress(s, b) - lookProgress(s, a));

    const cell = (l: LookDef) => {
        const lock = !isUnlocked(s, l);
        const on = equipped === l.id;
        const focus = focusId === l.id;
        const isNew = !lock && !!l.need && !s.btn.seen.includes(lookKey(cat, l.id));
        const f = lookProgress(s, l);
        return (
            <button
                key={l.id}
                type="button"
                data-look
                title={l.name}
                aria-label={`${l.name}${on ? ", equipped" : lock ? ", locked" : ""}`}
                aria-pressed={on}
                onClick={() => onPick(cat, l)}
                onPointerEnter={(e: PointerEvent) => e.pointerType === "mouse" && onFocus(cat, l.id)}
                onFocus={() => onFocus(cat, l.id)}
                className="fi-still relative flex aspect-[1/1.02] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border p-1 outline-none transition-[transform,background-color] hover:-translate-y-px focus-visible:ring-2"
                style={{
                    borderColor: on ? C : isNew ? "var(--mc-green)" : focus ? tint(C, 70) : lock ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.16)",
                    backgroundColor: on ? tint(C, 14) : focus ? "rgba(255,255,255,0.07)" : lock ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.025)",
                    boxShadow: on ? `0 0 14px -5px ${C}` : isNew ? "0 0 12px -5px var(--mc-green)" : undefined,
                    ["--tw-ring-color" as string]: C,
                }}
            >
                <span className={`grid size-10 place-items-center ${lock ? "opacity-40 grayscale" : ""}`}>
                    <Preview cat={cat} l={l} shape={shape} skin={skin} glyph={glyph} island={island} accent={accent} />
                </span>
                <span className="w-full truncate text-center font-minecraft text-[9px] leading-none" style={{ color: on ? C : lock ? "var(--muted-foreground)" : undefined }}>
                    {l.name}
                </span>
                {lock && <Lock className="absolute right-1 top-1 size-2.5 text-muted-foreground" />}
                {on && <Check className="absolute right-1 top-1 size-3" style={{ color: C }} />}
                {isNew && <span className="fi-afford absolute left-1.5 top-1.5 size-1.5 rounded-full" style={{ backgroundColor: "var(--mc-green)", ["--c" as string]: "var(--mc-green)" }} />}
                {lock && f > 0 && (
                    <span className="absolute inset-x-2 bottom-1 h-[3px] overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full" style={{ width: `${f * 100}%`, backgroundColor: "var(--mc-yellow)" }} />
                    </span>
                )}
            </button>
        );
    };

    const grid = "grid grid-cols-[repeat(auto-fill,minmax(66px,1fr))] gap-1.5";
    return (
        <div onKeyDown={arrows} onPointerLeave={(e) => e.pointerType === "mouse" && onLeave()} className="space-y-2">
            <div className={grid}>{owned.map(cell)}</div>
            {locked.length > 0 && (
                <>
                    <div className="flex items-center gap-2 font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">
                        Locked ({locked.length})
                        <span className="h-px flex-1 bg-white/10" />
                        <span className="font-rubik normal-case tracking-normal">closest first</span>
                    </div>
                    <div className={grid}>{locked.map(cell)}</div>
                </>
            )}
        </div>
    );
});

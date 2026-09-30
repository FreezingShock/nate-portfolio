"use client";

import { useRef, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    BURSTS,
    GLYPHS,
    HEAT_SECONDS,
    HOLD_BASE,
    SHAPES,
    SKINS,
    STAT_LABEL,
    bonusText,
    btnBonus,
    holdMax,
    isUnlocked,
    type LookDef,
} from "@/lib/fractured-idle/button";
import { ISLANDS } from "@/lib/fractured-idle/data";
import { spawnBurst, spawnNumber, kick } from "./button-fx";
import { ButtonFace, skinAccent } from "./button-face";
import { SectionTitle, Toggle, tint, type Ctx } from "./ui";

// Button tab: pick the look of the click button. Each shape, skin and click
// effect unlocks from lifetime stats and pays a small bonus while equipped.
// The preview button is a sandbox: it plays the effects but earns nothing.

const C = "var(--mc-aqua)";
const BURST_ICON: Record<string, string> = { ripple: "◎", sparks: "✷", bubbles: "○", stars: "✦", embers: "♨", confetti: "✺", shock: "☄" };

function Tile({ l, on, locked, have, onPick, preview }: { l: LookDef; on: boolean; locked: boolean; have: number; onPick: () => void; preview: ReactNode }) {
    return (
        <button
            type="button"
            disabled={locked}
            onClick={onPick}
            className="flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all enabled:hover:-translate-y-px enabled:hover:bg-white/5 disabled:cursor-not-allowed"
            style={{ borderColor: on ? C : locked ? "rgba(255,255,255,0.1)" : tint(C, 35), backgroundColor: on ? tint(C, 12) : undefined, boxShadow: on ? `0 0 16px -6px ${C}` : undefined }}
        >
            <span className={`grid size-12 shrink-0 place-items-center ${locked ? "opacity-35 grayscale" : ""}`}>{preview}</span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-minecraft text-xs" style={{ color: locked ? undefined : on ? C : "var(--foreground)" }}>
                    {l.name}
                    {locked && <Lock className="size-3 text-muted-foreground" />}
                    {on && <span className="rounded-full px-1.5 font-rubik text-[9px] text-black" style={{ backgroundColor: C }}>Equipped</span>}
                </span>
                <span className="block truncate font-rubik text-[10px] text-muted-foreground">
                    {locked && l.need ? `Needs ${l.need.n.toLocaleString("en-US", { notation: l.need.n >= 1e6 ? "compact" : "standard" })} ${STAT_LABEL[l.need.stat]} (${Math.floor(have).toLocaleString("en-US", { notation: have >= 1e6 ? "compact" : "standard" })})` : l.desc}
                </span>
                {l.bonus && (
                    <span className="block truncate font-rubik text-[10px]" style={{ color: locked ? undefined : "var(--mc-green)" }}>
                        {bonusText(l.bonus)}
                    </span>
                )}
            </span>
        </button>
    );
}

export function ButtonTab({ s, render }: Ctx) {
    const host = useRef<HTMLDivElement>(null);
    const face = useRef<HTMLButtonElement>(null);
    const b = s.btn;
    const island = ISLANDS.find((i) => i.id === s.island && s.total >= i.at) ?? ISLANDS[0];
    const total = btnBonus(s);
    const accent = skinAccent(b.skin, island.color);

    const test = (e: React.PointerEvent) => {
        const h = host.current;
        if (!h) return;
        const r = h.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const crit = Math.random() < 0.25;
        spawnNumber(h, x, y - 16, crit ? "1.2K" : "240", crit);
        spawnBurst(h, b.burst, x, y, accent, crit);
        kick(face.current, crit, 0);
    };

    const set = (key: "shape" | "skin" | "burst" | "glyph", id: string) => {
        b[key] = id;
        render();
    };

    return (
        <>
            <div className="relative overflow-hidden rounded-xl border p-3" style={{ borderColor: tint(C, 45), backgroundImage: `linear-gradient(130deg, ${tint(C, 10)}, transparent 70%)` }}>
                <div className="flex items-center gap-4">
                    <div ref={host} className="relative grid h-36 w-44 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/25">
                        <ButtonFace
                            as="button"
                            shape={b.shape}
                            skin={b.skin}
                            glyph={b.glyph}
                            color={island.color}
                            depth={5}
                            className="size-24"
                            btnRef={face}
                            btnProps={{ onPointerDown: test, onContextMenu: (e) => e.preventDefault(), "aria-label": "Test your button look" }}
                        />
                    </div>
                    <div className="min-w-0 font-rubik text-xs">
                        <div className="font-minecraft text-sm" style={{ color: C }}>Your button</div>
                        <p className="mt-1 text-muted-foreground">Tap the preview to test it. Looks unlock from your clicks, crits and progress, and the shape, skin and effect you equip each add a bonus.</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {total.click > 0 && <Chip>+{Math.round(total.click * 100)}% click</Chip>}
                            {total.crit > 0 && <Chip>+{+(total.crit * 100).toFixed(1)}% crit</Chip>}
                            {total.critDmg > 0 && <Chip>+{Math.round(total.critDmg * 100)}% crit dmg</Chip>}
                            {total.hold > 0 && <Chip>+{total.hold} hold/s</Chip>}
                            {!total.click && !total.crit && !total.critDmg && !total.hold && <span className="text-muted-foreground">No bonus yet. Equip an unlocked look.</span>}
                        </div>
                    </div>
                </div>
            </div>

            <SectionTitle color="var(--mc-yellow)">Hold to click</SectionTitle>
            <Toggle label="Hold the button or Space to keep clicking" on={b.hold} onChange={(v) => { b.hold = v; render(); }} />
            <p className="font-rubik text-[11px] text-muted-foreground">
                Holding clicks {HOLD_BASE} times a second and heats up over {HEAT_SECONDS} seconds to {holdMax(s)} a second. Every held click counts as a normal click (crits included).
            </p>

            <SectionTitle>Shape</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SHAPES.map((l) => (
                    <Tile key={l.id} l={l} on={b.shape === l.id} locked={!isUnlocked(s, l)} have={l.need ? (s[l.need.stat] as number) : 0} onPick={() => set("shape", l.id)}
                        preview={<ButtonFace shape={l.id} skin={b.skin} glyph={b.glyph} color={island.color} depth={3} className="size-10" />} />
                ))}
            </div>

            <SectionTitle color="var(--mc-gold)">Skin</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SKINS.map((l) => (
                    <Tile key={l.id} l={l} on={b.skin === l.id} locked={!isUnlocked(s, l)} have={l.need ? (s[l.need.stat] as number) : 0} onPick={() => set("skin", l.id)}
                        preview={<ButtonFace shape={b.shape} skin={l.id} glyph={b.glyph} color={island.color} depth={3} className="size-10" />} />
                ))}
            </div>

            <SectionTitle color="var(--mc-light-purple)">Click effect</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BURSTS.map((l) => (
                    <Tile key={l.id} l={l} on={b.burst === l.id} locked={!isUnlocked(s, l)} have={l.need ? (s[l.need.stat] as number) : 0} onPick={() => set("burst", l.id)}
                        preview={<span className="grid size-10 place-items-center rounded-full text-xl" style={{ color: "var(--mc-light-purple)", backgroundColor: tint("var(--mc-light-purple)", 16) }}>{BURST_ICON[l.id]}</span>} />
                ))}
            </div>

            <SectionTitle color="var(--mc-green)">Symbol</SectionTitle>
            <div className="flex flex-wrap gap-2">
                {GLYPHS.map((g) => (
                    <button
                        key={g.id}
                        type="button"
                        title={g.name}
                        aria-label={g.name}
                        onClick={() => set("glyph", g.id)}
                        className="grid size-11 place-items-center rounded-xl border text-xl transition-colors hover:bg-white/10"
                        style={b.glyph === g.id ? { borderColor: C, color: C, backgroundColor: tint(C, 14) } : { borderColor: "rgba(255,255,255,0.15)" }}
                    >
                        <McSymbol name={g.symbol} />
                    </button>
                ))}
            </div>
        </>
    );
}

function Chip({ children }: { children: ReactNode }) {
    return (
        <span className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: tint("var(--mc-green)", 55), color: "var(--mc-green)" }}>
            {children}
        </span>
    );
}

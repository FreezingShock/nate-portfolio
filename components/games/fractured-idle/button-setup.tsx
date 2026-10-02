"use client";

import { fmtPct } from "@/lib/fractured-idle/format";
import { Dices, RotateCcw, Save, Sparkles } from "lucide-react";
import {
    AURAS,
    BURSTS,
    CATS,
    COLLECTION_PER_LOOK,
    CRITS,
    HOLD_BASE,
    LOADOUTS,
    SET_BONUS,
    SHAPES,
    SKINS,
    bonusText,
    btnBonus,
    countUnlocked,
    holdMax,
    isUnlocked,
    totalLooks,
    type Looks,
} from "@/lib/fractured-idle/button";
import type { State } from "@/lib/fractured-idle/data";
import { ButtonFace } from "./button-face";
import { tint } from "./ui";

// The Setup page of the Button tab: what your bonuses are made of, loadouts,
// randomize / reset and the clicking toggles.

const C = "var(--mc-aqua)";
const Y = "var(--mc-yellow)";

function Switch({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5">
            <span className="min-w-0">
                <span className="block truncate font-rubik text-xs">{label}</span>
                <span className="block truncate font-rubik text-[10px] text-muted-foreground">{hint}</span>
            </span>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: tint(on ? "var(--mc-green)" : "var(--muted-foreground)", 20), color: on ? "var(--mc-green)" : undefined }}>
                {on ? "ON" : "OFF"}
            </span>
        </button>
    );
}

interface Props {
    s: State;
    island: string;
    next: { name: string; cat: string; f: number } | null;
    render: () => void;
    apply: (l: Looks) => void;
    randomize: () => void;
}

export function SetupPage({ s, island, next, render, apply, randomize }: Props) {
    const b = s.btn;
    const have = countUnlocked(s);
    const total = totalLooks();
    const slots = [
        ["Shape", SHAPES.find((l) => l.id === b.shape)],
        ["Skin", SKINS.find((l) => l.id === b.skin)],
        ["Click FX", BURSTS.find((l) => l.id === b.burst)],
        ["Crit FX", CRITS.find((l) => l.id === b.crit)],
        ["Aura", AURAS.find((l) => l.id === b.aura)],
    ] as const;
    const setOn = slots.every(([, l], i) => l && l.id !== [SHAPES, SKINS, BURSTS, CRITS, AURAS][i][0].id);
    const all = btnBonus(s);

    return (
        <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border p-3" style={{ borderColor: tint(Y, 40), backgroundImage: `linear-gradient(130deg, ${tint(Y, 8)}, transparent 70%)` }}>
                    <div className="flex items-center justify-between font-minecraft font-bold text-xs" style={{ color: Y }}>
                        <span><Sparkles className="mr-1 inline size-3.5" />Collection</span>
                        <span>{have} / {total}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${(have / total) * 100}%`, backgroundColor: Y, boxShadow: `0 0 8px ${Y}` }} />
                    </div>
                    <p className="mt-2 font-rubik text-[11px] leading-snug text-muted-foreground">
                        Each look you own: +{fmtPct(COLLECTION_PER_LOOK, 2)} click, permanent. Now <b style={{ color: "var(--mc-green)" }}>+{fmtPct(COLLECTION_PER_LOOK * have, 2)}</b>.
                        {next && <> Closest: <b style={{ color: Y }}>{next.name}</b> ({next.cat}), {Math.floor(next.f * 100)}%.</>}
                    </p>
                </div>

                <div className="rounded-xl border border-white/10 p-3">
                    <div className="mb-1.5 font-minecraft font-bold text-xs" style={{ color: C }}>Where your bonus comes from</div>
                    <div className="space-y-0.5 font-rubik text-[11px]">
                        {slots.map(([name, l]) => (
                            <div key={name} className="flex justify-between gap-2">
                                <span className="text-muted-foreground">{name}: <span className="text-foreground">{l?.name}</span></span>
                                <span className="shrink-0" style={{ color: l?.bonus ? "var(--mc-green)" : undefined }}>{l?.bonus ? bonusText(l.bonus) : "none"}</span>
                            </div>
                        ))}
                        <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Set bonus</span>
                            <span style={{ color: setOn ? "var(--mc-green)" : undefined }}>{setOn ? `+${SET_BONUS * 100}% click` : "all 5 non-default"}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-t border-white/10 pt-0.5">
                            <span className="text-muted-foreground">Total (with collection)</span>
                            <span className="text-right" style={{ color: "var(--mc-green)" }}>{bonusText(all) || "none"}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <div className="mb-1.5 flex items-center justify-between font-minecraft text-[10px] uppercase tracking-widest" style={{ color: "var(--mc-light-purple)" }}>
                    Loadouts
                    <span className="flex gap-1.5 normal-case tracking-normal">
                        <button type="button" onClick={randomize} className="flex items-center gap-1 rounded-md border border-white/15 px-2 py-0.5 font-rubik text-[10px] font-semibold text-foreground hover:bg-white/10">
                            <Dices className="size-3" /> Randomize
                        </button>
                        <button type="button" onClick={() => apply({ shape: "block", skin: "island", burst: "ripple", crit: "pulse", color: "sapphire", nums: "classic", aura: "none", glyph: "speed" })} className="flex items-center gap-1 rounded-md border border-white/15 px-2 py-0.5 font-rubik text-[10px] font-semibold text-foreground hover:bg-white/10">
                            <RotateCcw className="size-3" /> Reset
                        </button>
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: LOADOUTS }, (_, i) => {
                        const L = b.saved[i];
                        return (
                            <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 p-2">
                                <div className="grid size-11 place-items-center">
                                    {L ? <ButtonFace shape={L.shape} skin={L.skin} glyph={L.glyph} color={island} depth={3} className="size-10" /> : <span className="font-rubik text-[10px] text-muted-foreground">Slot {i + 1}</span>}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        title="Save the current look here"
                                        onClick={() => {
                                            b.saved[i] = { shape: b.shape, skin: b.skin, burst: b.burst, crit: b.crit, color: b.color, nums: b.nums, aura: b.aura, glyph: b.glyph };
                                            render();
                                        }}
                                        className="flex items-center gap-1 rounded-md border border-white/15 px-1.5 py-0.5 font-rubik text-[10px] font-semibold hover:bg-white/10"
                                    >
                                        <Save className="size-3" /> Save
                                    </button>
                                    <button type="button" disabled={!L} onClick={() => L && apply(L)} className="rounded-md border px-1.5 py-0.5 font-rubik text-[10px] font-semibold enabled:hover:bg-white/10 disabled:opacity-40" style={{ borderColor: tint(C, 45), color: C }}>
                                        Equip
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <div className="mb-1.5 font-minecraft text-[10px] uppercase tracking-widest" style={{ color: Y }}>Clicking</div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <Switch label="Hold to click" hint={`${HOLD_BASE}/s x combo, up to ${holdMax(s)}/s`} on={b.hold} onChange={(v) => { b.hold = v; render(); }} />
                    <Switch label="Crit shake" hint="Nudge the button area on crits" on={b.shake} onChange={(v) => { b.shake = v; render(); }} />
                </div>
            </div>
        </div>
    );
}

/** Random unlocked look in every category. */
export function randomLooks(s: State): Looks {
    const out = {} as Record<string, string>;
    for (const c of CATS) {
        const ok = c.list.filter((l) => isUnlocked(s, l));
        out[c.id] = ok[Math.floor(Math.random() * ok.length)].id;
    }
    return out as unknown as Looks;
}

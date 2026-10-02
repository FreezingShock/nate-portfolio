"use client";

import { heldEggs } from "@/lib/fractured-idle/inv-core";
import { fmtPct } from "@/lib/fractured-idle/format";
import { type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { EGGS, PET_BY_ID, PET_MAX, RARITIES, petLevel, petXpFor, type State } from "@/lib/fractured-idle/data";
import { eggCan, petBonds, petSlots } from "@/lib/fractured-idle/engine";
import { PetTipBody } from "./pet-tip";
import { Tip, TipCard } from "./tooltip";

// The pet trackers pinned to the top-left of the button screen (just under the shard counter): one circle per
// equipped pet, stacked in a vertical list, with the pet's xp as a ring around it and its level on a badge. Nothing
// here takes up room in the layout (it floats over the corner), pets drift gently and hop when you hover them, and
// the hover card is the same full pet tooltip used everywhere. An empty slot (or a free egg) is a button that opens
// the Pets tab, and a bond chip appears at the bottom when the line-up earns one.

const frac = (s: State, id: string) => {
    const p = PET_BY_ID.get(id);
    const st = s.pets[id];
    if (!p || !st) return 0;
    const lv = petLevel(p, st.xp);
    if (lv >= PET_MAX) return 1;
    const lo = petXpFor(p, lv);
    return Math.max(0, Math.min(1, (st.xp - lo) / (petXpFor(p, lv + 1) - lo)));
};

/** Whether the tracker column shows anything (the button screen adds a little left padding when it does). */
export const petBarVisible = (s: State) => s.equip.length > 0 || Object.keys(s.pets).length > 0 || heldEggs(s) > 0 || EGGS.some((e) => eggCan(s, e));

export function PetBar({ s, onOpen }: { s: State; onOpen: () => void }) {
    if (!petBarVisible(s)) return null;
    const slots = petSlots(s);
    const bonds = petBonds(s);
    const egg = heldEggs(s) > 0;
    const empty = Math.max(0, slots - s.equip.length);

    return (
        <div className="pbr" aria-label="Equipped pets">
            {s.equip.map((id, i) => {
                const p = PET_BY_ID.get(id);
                const st = s.pets[id];
                if (!p || !st) return null;
                const rar = RARITIES[p.rarity];
                const lv = petLevel(p, st.xp);
                return (
                    <Tip key={id} tip={() => <PetTipBody p={p} owned={s.pets[id]} equipped slot={i} cta="Click to open Pets!" />}>
                        <button type="button" onClick={onOpen} className="pbr-pet" aria-label={`${p.name}, level ${lv}`} style={{ ["--rc" as string]: rar.color, ["--c" as string]: p.color, ["--p" as string]: Math.round(frac(s, id) * 100), animationDelay: `${i * -0.7}s` } as CSSProperties}>
                            <span className="pbr-ring">
                                <span className="pbr-tile"><McSymbol name={p.symbol} /></span>
                            </span>
                            <span className="pbr-lv">{lv}</span>
                            {st.n > 1 && <span className="pbr-st">{"★".repeat(Math.min(3, st.n - 1))}</span>}
                        </button>
                    </Tip>
                );
            })}

            {Array.from({ length: empty }, (_, i) => (
                <Tip key={`e${i}`} tip={<TipCard title="Empty pet slot" color="var(--mc-dark-aqua)" lines={[egg ? "You have an egg you can hatch right now." : "Hatch an egg to fill it."]} cta="Click to open Pets!" />}>
                    <button type="button" onClick={onOpen} className="pbr-pet pbr-empty" data-egg={egg} aria-label="Empty pet slot">
                        <span className="pbr-ring"><span className="pbr-tile">{egg ? <McSymbol name="flower" /> : "+"}</span></span>
                    </button>
                </Tip>
            ))}

            {bonds.list.length > 0 && (
                <Tip tip={<TipCard title="Pet bonds" color="var(--mc-yellow)" lines={["Your equipped pets share a dimension, so they work better together."]} rows={bonds.list.map((b): [string, string, string?] => [b.label, `+${fmtPct(b.bonus, 0)} all shards`, b.color])} />}>
                    <span className="pbr-bond" tabIndex={0}><McSymbol name="heartS" /> +{fmtPct(bonds.total, 0)}</span>
                </Tip>
            )}
        </div>
    );
}

export const PB_CSS = `
.pbr{position:absolute;left:.6rem;top:.6rem;z-index:8;display:flex;flex-direction:column;align-items:flex-start;gap:.5rem;pointer-events:none}
.pbr>*{pointer-events:auto}
.pbr-pet{--rc:#fff;--c:#fff;--p:0;position:relative;display:block;width:2.9rem;height:2.9rem;animation:pbr-drift 3.6s ease-in-out infinite;outline:none;border-radius:50%}
@keyframes pbr-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.pbr-pet:hover,.pbr-pet:focus-visible{animation:pbr-hop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes pbr-hop{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-5px) scale(1.12) rotate(-4deg)}100%{transform:translateY(0) scale(1)}}
.pbr-ring{display:grid;place-items:center;width:100%;height:100%;padding:3px;border-radius:50%;background:conic-gradient(var(--rc) calc(var(--p)*1%),rgba(255,255,255,.18) 0);box-shadow:0 0 14px -4px var(--rc),0 4px 12px rgba(0,0,0,.45)}
.pbr-tile{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;font-size:1.35rem;color:var(--c);background:radial-gradient(circle at 35% 30%,color-mix(in oklch,var(--c) 26%,#14102a),#0c0918 75%);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--rc) 50%,transparent)}
.pbr-lv{position:absolute;right:-.2rem;bottom:-.15rem;min-width:1.1rem;padding:0 .22rem;border-radius:999px;text-align:center;font-family:var(--font-minecraft,inherit);font-size:.58rem;line-height:1.05rem;color:#fff;background:color-mix(in oklch,var(--rc) 55%,#0c0918);box-shadow:0 0 0 2px #0c0918}
.pbr-st{position:absolute;left:-.1rem;top:-.25rem;font-size:.52rem;color:var(--mc-yellow);letter-spacing:-.08em;text-shadow:0 0 6px var(--mc-yellow)}
.pbr-empty .pbr-ring{background:rgba(8,6,18,.5);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28)}
.pbr-empty .pbr-tile{background:transparent;color:var(--muted-foreground);box-shadow:none}
.pbr-empty[data-egg="true"] .pbr-ring{box-shadow:inset 0 0 0 1.5px var(--mc-gold),0 0 14px -2px var(--mc-gold);animation:fi-pulse 1.6s ease-in-out infinite}
.pbr-empty[data-egg="true"] .pbr-tile{color:var(--mc-gold)}
.pbr-bond{display:inline-flex;align-items:center;gap:.25rem;padding:.1rem .45rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-size:.58rem;font-weight:700;color:var(--mc-yellow);border:1px solid color-mix(in oklch,var(--mc-yellow) 55%,transparent);background:color-mix(in oklch,#0c0918 80%,var(--mc-yellow));cursor:help;outline:none}
@media (prefers-reduced-motion:reduce){.pbr-pet,.pbr-pet:hover,.pbr-empty[data-egg="true"] .pbr-ring{animation:none}}
`;

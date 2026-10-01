"use client";

import { type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { EGGS, PET_BY_ID, PET_DIM_BY_ID, PET_LABEL, PET_MAX, PET_PERK_AT, RARITIES, petLevel, petStatValue, petXpFor, starMult, type State } from "@/lib/fractured-idle/data";
import { eggCan, petBonds, petSlots } from "@/lib/fractured-idle/engine";
import { Tip, TipCard } from "./tooltip";

// The pets above the big button: one portrait per slot with its xp as a ring around it, its level, its stars and
// a hover card with the real numbers. Pets drift gently, hop when you hover them, and an empty slot (or a free
// egg) becomes a button that opens the Pets tab. A bond chip shows when your line-up earns one.

const frac = (s: State, id: string) => {
    const p = PET_BY_ID.get(id);
    const st = s.pets[id];
    if (!p || !st) return 0;
    const lv = petLevel(p, st.xp);
    if (lv >= PET_MAX) return 1;
    const lo = petXpFor(p, lv);
    return Math.max(0, Math.min(1, (st.xp - lo) / (petXpFor(p, lv + 1) - lo)));
};

export function PetBar({ s, onOpen }: { s: State; onOpen: () => void }) {
    const slots = petSlots(s);
    const bonds = petBonds(s);
    const egg = s.freeEggs > 0 || EGGS.some((e) => eggCan(s, e));
    const empty = Math.max(0, slots - s.equip.length);
    if (!s.equip.length && !egg && !Object.keys(s.pets).length) return null;

    return (
        <div className="pbr">
            {s.equip.map((id, i) => {
                const p = PET_BY_ID.get(id);
                const st = s.pets[id];
                if (!p || !st) return null;
                const rar = RARITIES[p.rarity];
                const lv = petLevel(p, st.xp);
                return (
                    <Tip
                        key={id}
                        tip={() => {
                            const cur = s.pets[id] ?? st;
                            const l = petLevel(p, cur.xp);
                            const m = starMult(cur.n);
                            return (
                                <TipCard
                                    title={p.name}
                                    color={p.color}
                                    tag={`${rar.name} · Lv ${l}`}
                                    lines={[p.blurb]}
                                    rows={[
                                        [PET_LABEL[p.stat], petStatValue(p.stat, (p.base + p.per * (l - 1)) * m), "var(--mc-green)"],
                                        ...p.perks.map((pk, n): [string, string, string?] => [pk.name, l >= PET_PERK_AT[n] ? petStatValue(pk.stat, pk.value * m) : `Lv ${PET_PERK_AT[n]}`, l >= PET_PERK_AT[n] ? "var(--mc-green)" : undefined]),
                                        ["Dimension", PET_DIM_BY_ID[p.dim].name, PET_DIM_BY_ID[p.dim].color],
                                    ]}
                                    foot={l >= PET_MAX ? "Max level." : `${Math.floor(frac(s, id) * 100)}% to level ${l + 1}`}
                                    cta="Click to open Pets!"
                                />
                            );
                        }}
                    >
                        <button type="button" onClick={onOpen} className="pbr-pet" aria-label={`${p.name}, level ${lv}`} style={{ ["--rc" as string]: rar.color, ["--c" as string]: p.color, ["--p" as string]: Math.round(frac(s, id) * 100), animationDelay: `${i * -0.7}s` } as CSSProperties}>
                            <span className="pbr-ring">
                                <span className="pbr-tile"><McSymbol name={p.symbol} /></span>
                            </span>
                            <span className="pbr-lv">{lv}</span>
                            {st.n > 1 && <span className="pbr-st">{"★".repeat(Math.min(3, st.n - 1))}</span>}
                            <span className="pbr-nm">{p.name}</span>
                        </button>
                    </Tip>
                );
            })}

            {Array.from({ length: empty }, (_, i) => (
                <Tip key={`e${i}`} tip={<TipCard title="Empty pet slot" color="var(--mc-dark-aqua)" lines={[egg ? "You have an egg you can hatch right now." : "Hatch an egg to fill it."]} cta="Click to open Pets!" />}>
                    <button type="button" onClick={onOpen} className="pbr-pet pbr-empty" data-egg={egg} aria-label="Empty pet slot">
                        <span className="pbr-ring"><span className="pbr-tile">{egg ? <McSymbol name="flower" /> : "+"}</span></span>
                        <span className="pbr-nm">{egg ? "Hatch!" : "Empty"}</span>
                    </button>
                </Tip>
            ))}

            {bonds.list.length > 0 && (
                <Tip tip={<TipCard title="Pet bonds" color="var(--mc-yellow)" lines={["Your equipped pets share a dimension, so they work better together."]} rows={bonds.list.map((b): [string, string, string?] => [b.label, `+${Math.round(b.bonus * 100)}% all shards`, b.color])} />}>
                    <span className="pbr-bond" tabIndex={0}><McSymbol name="heartS" /> +{Math.round(bonds.total * 100)}%</span>
                </Tip>
            )}
        </div>
    );
}

export const PB_CSS = `
.pbr{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:center;gap:.5rem .7rem}
.pbr-pet{--rc:#fff;--c:#fff;--p:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:.15rem;width:3.9rem;animation:pbr-drift 3.6s ease-in-out infinite;outline:none;transition:transform .15s}
@keyframes pbr-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.pbr-pet:hover,.pbr-pet:focus-visible{animation:pbr-hop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes pbr-hop{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-9px) scale(1.12) rotate(-4deg)}100%{transform:translateY(0) scale(1)}}
.pbr-ring{display:grid;place-items:center;width:3rem;height:3rem;padding:3px;border-radius:50%;background:conic-gradient(var(--rc) calc(var(--p)*1%),rgba(255,255,255,.14) 0);box-shadow:0 0 14px -4px var(--rc)}
.pbr-tile{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;font-size:1.45rem;color:var(--c);background:radial-gradient(circle at 35% 30%,color-mix(in oklch,var(--c) 26%,#14102a),#0c0918 75%);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--rc) 50%,transparent)}
.pbr-lv{position:absolute;right:.35rem;top:1.95rem;min-width:1.15rem;padding:0 .25rem;border-radius:999px;text-align:center;font-family:var(--font-minecraft,inherit);font-size:.6rem;line-height:1.05rem;color:#fff;background:color-mix(in oklch,var(--rc) 55%,#0c0918);box-shadow:0 0 0 2px #0c0918}
.pbr-st{position:absolute;left:.3rem;top:0;font-size:.55rem;color:var(--mc-yellow);letter-spacing:-.08em;text-shadow:0 0 6px var(--mc-yellow)}
.pbr-nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.58rem;color:#cfc8dd}
.pbr-empty .pbr-ring{background:none;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.25)}
.pbr-empty .pbr-tile{background:transparent;color:var(--muted-foreground);box-shadow:none}
.pbr-empty[data-egg="true"] .pbr-ring{box-shadow:inset 0 0 0 1.5px var(--mc-gold),0 0 14px -2px var(--mc-gold);animation:fi-pulse 1.6s ease-in-out infinite}
.pbr-empty[data-egg="true"] .pbr-tile{color:var(--mc-gold)}
.pbr-empty[data-egg="true"] .pbr-nm{color:var(--mc-gold)}
.pbr-bond{align-self:center;display:inline-flex;align-items:center;gap:.3rem;padding:.12rem .55rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-size:.64rem;font-weight:700;color:var(--mc-yellow);border:1px solid color-mix(in oklch,var(--mc-yellow) 55%,transparent);background:color-mix(in oklch,var(--mc-yellow) 10%,rgba(0,0,0,.3));cursor:help;outline:none}
@media (prefers-reduced-motion:reduce){.pbr-pet,.pbr-pet:hover,.pbr-empty[data-egg="true"] .pbr-ring{animation:none}}
`;

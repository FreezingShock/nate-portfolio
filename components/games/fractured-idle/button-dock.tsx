"use client";

import { useRef, useState, type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { CATS, GLYPHS, LOADOUTS, STAT_LABEL, bestChanges, bonusText, btnBonus, countUnlocked, listOf, lookKey, lookProgress, isUnlocked, totalLooks, type Looks, type LookDef } from "@/lib/fractured-idle/button";
import type { State } from "@/lib/fractured-idle/data";
import { activeIsland } from "@/lib/fractured-idle/island-logic";
import { ButtonFace, skinAccent } from "./button-face";
import { Tip, TipCard, type TipNote } from "./tooltip";

// The wardrobe shortcut under the combo bar: the same look as the Button page's
// tab switcher (a tinted group with a label). The main chip opens the Button
// page and shows a live miniature of what you wear and how many new looks are
// waiting; the three numbered chips wear a saved loadout; the bolt wears the best
// unlocked look in every functional slot. Hovering clears the new-look badge.

const COLOR = "#6fd0ff";
const nameOf = (cat: keyof Looks, id: string) => listOf(cat).find((l) => l.id === id)?.name ?? id;

export function ButtonDock({ s, notes, onOpen, render, say }: { s: State; notes: TipNote[]; onOpen: () => void; render: () => void; say: (m: string) => void }) {
    const fresh = notes.filter((n) => n.act).reduce((a, n) => a + (n.n ?? 1), 0);
    const [read, setRead] = useState(0);
    const seenAt = useRef(0);
    if (fresh === 0 && read !== 0) setRead(0); // a new batch of looks later should show again
    const show = fresh > 0 && fresh !== read;
    const island = activeIsland(s);
    const b = s.btn;
    const accent = skinAccent(b.skin, island.color);
    const total = btnBonus(s);
    const best = bestChanges(s);
    void seenAt;

    const wear = (L: Looks) => {
        Object.assign(s.btn, L);
        render();
    };
    const equipBest = () => {
        const ch = bestChanges(s);
        if (!ch.length) return;
        for (const c of ch) {
            s.btn[c.cat] = c.to.id;
            const k = lookKey(c.cat, c.to.id);
            if (!s.btn.seen.includes(k)) s.btn.seen.push(k);
        }
        say(`Equipped the best looks: ${ch.map((c) => c.to.name).join(", ")}`);
        render();
    };
    const next = (() => {
        let n: { l: LookDef; cat: string; f: number } | null = null;
        for (const c of CATS) for (const l of c.list) if (!isUnlocked(s, l)) {
            const f = lookProgress(s, l);
            if (!n || f > n.f) n = { l, cat: c.label, f };
        }
        return n;
    })();

    const mainTip = () => (
        <TipCard
            title="Your button"
            color={COLOR}
            tag={`${countUnlocked(s)}/${totalLooks()} looks`}
            lines={["Open the wardrobe to change what the button looks like. Looks unlock from your progress, the functional ones pay a bonus, and every look you own adds to a collection bonus."]}
            rows={[
                ...CATS.map((c): [string, string, string?] => [c.label, nameOf(c.id, b[c.id])]),
                ["Total bonus", bonusText(total) || "none yet", "var(--mc-green)"],
                ...(next ? ([["Closest unlock", `${next.l.name} (${next.cat}) ${Math.floor(next.f * 100)}%${next.l.need ? `, ${STAT_LABEL[next.l.need.stat]}` : ""}`, "var(--mc-yellow)"]] as [string, string, string][]) : []),
            ]}
            notes={notes}
            cta="Click to open the wardrobe!"
        />
    );

    return (
        <div className="fi-bd" style={{ ["--g" as string]: COLOR } as CSSProperties}>
            <span className="fi-bd-l">Wardrobe</span>
            <div className="fi-bd-row">
                <Tip box tip={mainTip} className="fi-bd-main-w">
                    <button
                        type="button"
                        className="fi-bd-main"
                        onClick={onOpen}
                        onPointerEnter={(e) => e.pointerType === "mouse" && fresh > 0 && setRead(fresh)}
                        onFocus={() => fresh > 0 && setRead(fresh)}
                        aria-label={`Customize button${fresh ? `, ${fresh} new looks` : ""}`}
                    >
                        <span className="fi-bd-face">
                            <ButtonFace shape={b.shape} skin={b.skin} glyph={b.glyph} color={island.color} depth={2} className="size-full" />
                        </span>
                        <span className="fi-bd-t">
                            <b>Customize</b>
                            <small>{countUnlocked(s)}/{totalLooks()} looks · <span style={{ color: accent }}>{nameOf("skin", b.skin)}</span></small>
                        </span>
                        {show && <i className="fi-bd-n">{fresh > 9 ? "9+" : fresh}</i>}
                    </button>
                </Tip>
                {Array.from({ length: LOADOUTS }, (_, i) => {
                    const L = s.btn.saved[i];
                    return (
                        <Tip
                            key={i}
                            box
                            tip={
                                L ? (
                                    <TipCard title={`Loadout ${i + 1}`} color={COLOR} rows={CATS.map((c): [string, string] => [c.label, nameOf(c.id, L[c.id])])} cta="Click to wear it!" />
                                ) : (
                                    <TipCard title={`Loadout ${i + 1}`} color={COLOR} lines={["Empty. Save your current look here from the Setup page in the wardrobe."]} />
                                )
                            }
                        >
                            <button type="button" className="fi-bd-slot" data-empty={!L} disabled={!L} onClick={() => L && wear(L)} aria-label={L ? `Wear loadout ${i + 1}` : `Loadout ${i + 1} is empty`}>
                                {L ? (
                                    <span className="fi-bd-mini">
                                        <ButtonFace shape={L.shape} skin={L.skin} glyph={L.glyph} color={island.color} depth={1} className="size-full" />
                                    </span>
                                ) : null}
                                <b>{i + 1}</b>
                            </button>
                        </Tip>
                    );
                })}
                <Tip
                    box
                    tip={
                        best.length ? (
                            <TipCard title="Equip best looks" color="#ffd23a" tag={`${best.length} change${best.length === 1 ? "" : "s"}`} rows={best.map((c): [string, string, string] => [CATS.find((x) => x.id === c.cat)!.label, `${c.from.name} → ${c.to.name}`, "var(--mc-green)"])} cta="Click to equip!" />
                        ) : (
                            <TipCard title="Equip best looks" color="#ffd23a" lines={["You are already wearing the best unlocked looks."]} />
                        )
                    }
                >
                    <button type="button" className="fi-bd-best" data-on={best.length > 0} disabled={best.length === 0} onClick={equipBest} aria-label="Equip the best looks">
                        <McSymbol name="bolt" />
                    </button>
                </Tip>
            </div>
        </div>
    );
}

/** Looks the miniature wears, exposed for the glyph name lookup. */
export const glyphName = (id: string) => GLYPHS.find((g) => g.id === id)?.name ?? id;

export const BUTTON_DOCK_CSS = `
.fi-bd{display:flex;flex-direction:column;gap:.15rem;width:100%;max-width:22rem;margin:0 auto}
.fi-bd-l{font-family:var(--font-minecraft,inherit);font-size:.5rem;letter-spacing:.2em;text-transform:uppercase;color:color-mix(in oklch,var(--g) 70%,#fff);opacity:.7;padding-left:.35rem}
.fi-bd-row{display:flex;align-items:stretch;gap:.25rem;padding:.2rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--g) 30%,transparent);background:color-mix(in oklch,var(--g) 6%,transparent)}
.fi-bd-main-w{flex:1;min-width:0}
.fi-bd-main{position:relative;display:flex;align-items:center;gap:.5rem;width:100%;height:2.4rem;padding:0 .6rem 0 .35rem;border-radius:.65rem;text-align:left;background:color-mix(in oklch,var(--g) 9%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--g) 22%,transparent);transition:background .18s,box-shadow .18s,transform .14s cubic-bezier(.2,1.5,.4,1);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.fi-bd-main:hover{background:color-mix(in oklch,var(--g) 20%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--g) 50%,transparent),0 3px 12px -5px var(--g);transform:translateY(-1px)}
.fi-bd-main:active{transform:scale(.97)}
.fi-bd-face{display:block;flex:none;width:1.7rem;height:1.7rem}
.fi-bd-t{display:flex;flex-direction:column;min-width:0;line-height:1.15}
.fi-bd-t b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.74rem;color:var(--g);text-shadow:0 0 10px color-mix(in oklch,var(--g) 50%,transparent)}
.fi-bd-t small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-bd-n{position:absolute;right:-.3rem;top:-.4rem;min-width:.95rem;height:.95rem;padding:0 .2rem;display:grid;place-items:center;border-radius:999px;font:700 .58rem/1 var(--font-rubik,inherit);font-style:normal;color:#111;background:var(--mc-green);box-shadow:0 0 0 2px color-mix(in oklch,var(--background) 90%,#000),0 0 9px var(--mc-green);animation:fi-tab-ping .5s cubic-bezier(.2,1.8,.4,1)}
.fi-bd-n::before{content:"";position:absolute;inset:-2px;border-radius:inherit;border:1px solid var(--mc-green);animation:fi-tab-ring 1.8s ease-out infinite}
.fi-bd-slot,.fi-bd-best{position:relative;display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:.65rem;border:1px solid color-mix(in oklch,var(--g) 30%,transparent);background:color-mix(in oklch,var(--g) 7%,transparent);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;color:var(--g);transition:background .15s,transform .12s,box-shadow .2s;touch-action:manipulation}
.fi-bd-slot[data-empty="true"]{border-style:dashed;opacity:.55;color:var(--muted-foreground)}
.fi-bd-slot:hover:not(:disabled),.fi-bd-best:hover:not(:disabled){background:color-mix(in oklch,var(--g) 22%,transparent);transform:translateY(-1px)}
.fi-bd-slot:active:not(:disabled),.fi-bd-best:active:not(:disabled){transform:scale(.92)}
.fi-bd-mini{position:absolute;inset:.3rem;opacity:.85;pointer-events:none}
.fi-bd-slot b{position:absolute;right:.2rem;bottom:.05rem;font-size:.58rem;color:#fff;text-shadow:0 1px 0 #000}
.fi-bd-best{font-size:1rem;color:var(--muted-foreground);border-color:rgba(255,255,255,.14);background:transparent}
.fi-bd-best[data-on="true"]{color:#1b1400;border-color:#ffd23a;background:linear-gradient(180deg,#ffe97a,#ffc21a);box-shadow:0 0 14px -3px #ffd23a;animation:fi-eq-glow 1.8s ease-in-out infinite}
.fi-bd-best:disabled{opacity:.5;cursor:default}
@media (prefers-reduced-motion:reduce){.fi-bd-main,.fi-bd-n,.fi-bd-n::before,.fi-bd-best{animation:none!important;transition:none}}
`;

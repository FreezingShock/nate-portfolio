"use client";

import type { CSSProperties } from "react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { rebirthCap, rebirthPlan } from "@/lib/fractured-idle/engine";
import { autoEvery } from "@/lib/fractured-idle/prestige";
import { eLv, gemStewardEvery, hasVow } from "@/lib/fractured-idle/trans";
import type { AutoPrefs } from "@/lib/fractured-idle/data";
import { fmtInt } from "@/lib/fractured-idle/format";
import type { Ctx } from "./ui";

// Every auto-buyer in one place: what it does, how fast it is, where it is unlocked, and its switch and settings.
// The first four come from gem upgrades (Ascension), the last two from Essence upgrades (Transcendence), so a
// Transcendence never takes any of them away.

type Key = keyof Pick<AutoPrefs, "min" | "up" | "tok" | "rb" | "asc" | "gem">;

interface AutoDef {
    key: Key;
    name: string;
    blurb: string;
    color: string;
    symbol: McSymbolName;
    from: string; // where to unlock it
    level: (s: Ctx["s"]) => number;
    max: number;
    every: (lvl: number) => string;
    needs?: (s: Ctx["s"]) => string | null;
}

const DEFS: AutoDef[] = [
    { key: "min", name: "Minion Foreman", blurb: "Buys the minion that pays itself back fastest.", color: "var(--mc-green)", symbol: "defense", from: "Ascension gem upgrade", level: (s) => s.aups.autoMin || 0, max: 5, every: (l) => `${autoEvery("min", l).toFixed(1)}s` },
    { key: "up", name: "Upgrade Foreman", blurb: "Buys the cheapest shard upgrade you can afford.", color: "var(--mc-yellow)", symbol: "speed", from: "Ascension gem upgrade", level: (s) => s.aups.autoUp || 0, max: 4, every: (l) => `${autoEvery("up", l).toFixed(1)}s` },
    { key: "tok", name: "Token Steward", blurb: "Spends tokens on the best-value upgrade.", color: "var(--mc-light-purple)", symbol: "magicFind", from: "Ascension gem upgrade", level: (s) => s.aups.autoTok || 0, max: 3, every: (l) => `${autoEvery("tok", l)}s` },
    { key: "rb", name: "Rebirth Cycle", blurb: "Rebirths by itself once the number of levels you set is ready.", color: "var(--mc-red)", symbol: "portal", from: "Ascension gem upgrade (needs Token Steward)", level: (s) => s.aups.autoRb || 0, max: 1, every: () => "when ready", needs: (s) => ((s.aups.autoTok || 0) < 1 ? "Needs Token Steward first." : null) },
    { key: "asc", name: "Auto-Ascend", blurb: "Ascends by itself once you reach the rebirth count you set.", color: "var(--mc-aqua)", symbol: "comet", from: "Essence upgrade, Eternal branch", level: (s) => eLv(s, "autoAsc"), max: 1, every: () => "when ready" },
    { key: "gem", name: "Gem Steward", blurb: "Spends gems on the best-value upgrade.", color: "var(--mc-gold)", symbol: "pristine", from: "Essence upgrade, Eternal branch", level: (s) => eLv(s, "gemSteward"), max: 3, every: (l) => `${gemStewardEvery(l)}s` },
];

export function Automation({ s, act }: Pick<Ctx, "s" | "act">) {
    const silenced = hasVow(s, "silence");
    const cap = Math.min(40, rebirthCap(s));
    const rbN = Math.max(1, Math.min(s.auto.rbN, cap));
    const ready = rebirthPlan(s).count;
    return (
        <>
            <p className="pr-note">
                Auto-buyers only ever spend what you already have, and they <b>stay through every reset</b>, Transcendence included.
                {silenced && <> <b style={{ color: "var(--mc-red)" }}>The Vow of Silence is switching all of them off this run.</b></>}
            </p>
            <div className="pa-grid">
                {DEFS.map((a) => {
                    const lv = a.level(s);
                    const lock = lv < 1;
                    const missing = a.needs?.(s) ?? null;
                    const on = !!s.auto[a.key] && !lock && !missing;
                    const status = lock ? "locked" : missing ? "waiting" : silenced ? "silenced" : on ? (a.key === "rb" ? (ready >= rbN ? "firing" : `${ready}/${rbN} ready`) : `every ${a.every(lv)}`) : "off";
                    return (
                        <div key={a.key} className="pa-card" data-on={on} data-lock={lock} style={{ ["--c" as string]: a.color } as CSSProperties}>
                            <span className="pa-i"><McSymbol name={a.symbol} /></span>
                            <span className="pa-t">
                                <b>{a.name}</b>
                                <small>{a.blurb}</small>
                                <small className="pa-from">{lock ? `Unlock: ${a.from}` : missing ?? `Level ${lv} / ${a.max} · ${status}`}</small>
                            </span>
                            <button type="button" role="switch" aria-checked={on} aria-label={a.name} disabled={lock || !!missing} className="pa-sw" onClick={() => act(() => { s.auto[a.key] = !s.auto[a.key]; return true; })}>
                                <i />
                            </button>
                            {a.key === "rb" && !lock && (
                                <span className="pa-set">
                                    Rebirth at <span className="ps-step">
                                        <button type="button" aria-label="Fewer levels" onClick={() => act(() => { s.auto.rbN = Math.max(1, s.auto.rbN - 1); return true; })}>-</button>
                                        <b>{rbN}</b>
                                        <button type="button" aria-label="More levels" onClick={() => act(() => { s.auto.rbN = Math.min(cap, s.auto.rbN + 1); return true; })}>+</button>
                                    </span> level{rbN === 1 ? "" : "s"} ready
                                </span>
                            )}
                            {a.key === "asc" && !lock && (
                                <span className="pa-set">
                                    Ascend at <span className="ps-step">
                                        <button type="button" aria-label="Fewer rebirths" onClick={() => act(() => { s.auto.ascN = Math.max(6, s.auto.ascN - 1); return true; })}>-</button>
                                        <b>{fmtInt(s.auto.ascN)}</b>
                                        <button type="button" aria-label="More rebirths" onClick={() => act(() => { s.auto.ascN = Math.min(60, s.auto.ascN + 1); return true; })}>+</button>
                                    </span> rebirths
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export const AUTO_CSS = `
.pa-grid{display:grid;gap:.45rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))}
.pa-card{--c:#fff;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"i t s" "x x x";align-items:center;gap:.4rem .6rem;padding:.55rem .65rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--c) 8%,rgba(10,8,22,.6)),rgba(8,6,18,.6));transition:border-color .15s,box-shadow .2s}
.pa-card[data-on="true"]{border-color:var(--c);box-shadow:0 0 16px -8px var(--c)}
.pa-card[data-lock="true"]{opacity:.55;border-style:dashed}
.pa-i{grid-area:i;display:grid;place-items:center;width:2.3rem;height:2.3rem;border-radius:.7rem;font-size:1.25rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 40%,transparent)}
.pa-t{grid-area:t;display:flex;flex-direction:column;gap:.1rem;min-width:0}
.pa-t b{font-family:var(--font-minecraft,inherit);font-size:.72rem;color:color-mix(in oklch,var(--c) 65%,#fff)}
.pa-t small{font-family:var(--font-rubik,inherit);font-size:.6rem;line-height:1.3;color:var(--muted-foreground)}
.pa-from{color:var(--c)!important}
.pa-sw{grid-area:s;position:relative;width:2.6rem;height:1.45rem;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);transition:background .2s,border-color .2s;outline:none;touch-action:manipulation}
.pa-sw i{position:absolute;top:.15rem;left:.15rem;width:1rem;height:1rem;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.2,1.5,.4,1)}
.pa-sw[aria-checked="true"]{background:color-mix(in oklch,var(--c) 70%,#000);border-color:var(--c)}
.pa-sw[aria-checked="true"] i{transform:translateX(1.15rem)}
.pa-sw:disabled{opacity:.4;cursor:not-allowed}
.pa-sw:focus-visible{outline:2px solid #fff;outline-offset:2px}
.pa-set{grid-area:x;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
@media (prefers-reduced-motion:reduce){.pa-sw,.pa-sw i,.pa-card{transition:none}}
`;

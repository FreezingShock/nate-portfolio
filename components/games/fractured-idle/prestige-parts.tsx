"use client";

import type { CSSProperties, ReactNode } from "react";
import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import { fmt, fmtInt } from "@/lib/fractured-idle/format";
import { prestigeBonus } from "@/lib/fractured-idle/trans";
import type { Advice, Layer } from "@/lib/fractured-idle/runs";
import { fmtLeft } from "./inv-parts";

// Small pieces shared by the Prestige page: what each layer is called, a progress ring, the reset cue and the
// keep/erase lists.

export interface LayerInfo {
    id: Layer;
    name: string;
    verb: string;
    cur: string; // what it pays
    color: string;
    symbol: McSymbolName;
    blurb: string;
}

export const LAYERS_INFO: Record<Layer, LayerInfo> = {
    rb: { id: "rb", name: "Rebirth", verb: "Rebirth", cur: "tokens", color: "var(--mc-light-purple)", symbol: "portal", blurb: "The quick loop. Reset your shards and minions for tokens and a permanent multiplier." },
    asc: { id: "asc", name: "Ascension", verb: "Ascend", cur: "gems", color: "var(--mc-aqua)", symbol: "comet", blurb: "Trade your rebirths for gems, a x3 boost and permanent upgrades." },
    trans: { id: "trans", name: "Transcendence", verb: "Transcend", cur: "Essence", color: "var(--mc-gold)", symbol: "night", blurb: "Start the ascensions over, keep every gem upgrade, and earn Essence for a bigger boost." },
};

/** "Resets" and "keeps" for a layer, with your own numbers filled in. */
export function keepsOf(layer: Layer, s: State): string[] {
    const b = prestigeBonus(s);
    const base = ["Pets, skills, trophies, islands, mine, farm and enchants", "Your Fractured Level and inventory"];
    if (layer === "rb") {
        const out = ["Token and gem upgrades, and every auto-buyer", ...base];
        if (b.keep > 0) out.splice(1, 0, `${Math.round(b.keep * 100)}% of your minions`);
        return out;
    }
    if (layer === "asc") {
        const out = ["Every gem upgrade and auto-buyer", "Lifetime ascensions and milestone perks", ...base];
        const m = Math.round((b.ascKeep + 0.05 * (s.eups.memory || 0)) * 100);
        if (m > 0) out.splice(1, 0, `${m}% of your minions`);
        return out;
    }
    return ["Every gem upgrade and auto-buyer", "Essence upgrades, lifetime counts and milestone perks", ...base];
}

export function losesOf(layer: Layer, s: State): string[] {
    if (layer === "rb") return ["Shards, minions and collections", "Shard upgrades (some training is kept)"];
    if (layer === "asc") return ["Rebirths, tokens and token upgrades", "Shards, minions, collections and shard upgrades"];
    return [`Your ascension count (${fmtInt(s.asc)}) and its multiplier`, `${fmtInt(s.ap)} unspent gem${s.ap === 1 ? "" : "s"}`, "Everything an ascension resets"];
}

/** A conic progress ring with content in the middle. */
export function Ring({ pct, color, size = 3.4, children }: { pct: number; color: string; size?: number; children?: ReactNode }) {
    const p = Math.max(0, Math.min(1, isFinite(pct) ? pct : 0));
    return (
        <span className="pr-ring" style={{ ["--p" as string]: Math.round(p * 100), ["--c" as string]: color, width: `${size}rem`, height: `${size}rem` } as CSSProperties}>
            <span className="pr-ring-in">{children}</span>
        </span>
    );
}

/** The reset cue: keep going, a good time, or past the peak. */
export function Cue({ a, compact }: { a: Advice; compact?: boolean }) {
    if (a.cue === "none") return null;
    return (
        <span className="pr-cue" data-cue={a.cue} title={a.label}>
            <i />
            {compact ? (a.cue === "wait" ? "Climbing" : a.cue === "good" ? "Good time" : "Reset now") : a.label}
        </span>
    );
}

export const Chips = ({ items, tone }: { items: string[]; tone: "keep" | "lose" }) => (
    <ul className="pr-chips" data-tone={tone}>
        {items.map((x) => (
            <li key={x}>{x}</li>
        ))}
    </ul>
);

export const perHour = (n: number) => `${fmt(n)}/h`;
/** Durations; anything past 100 hours just says so rather than printing a silly number. */
export const secs = (n: number) => (n >= 3.6e5 ? "100h+" : fmtLeft(n));

export const PRESTIGE_CSS = `
.pr{display:flex;flex-direction:column;gap:.7rem;min-width:0}
.pr-h{display:flex;align-items:center;gap:.5rem;margin:.2rem 0 -.1rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:var(--hc,var(--mc-aqua))}
.pr-h::after{content:"";flex:1;height:1px;background:color-mix(in oklch,var(--hc,var(--mc-aqua)) 30%,transparent)}
.pr-h small{order:2;font-family:var(--font-rubik,inherit);font-weight:500;font-size:.62rem;letter-spacing:.02em;text-transform:none;color:var(--muted-foreground)}
.pr-note{margin:0;font-family:var(--font-rubik,inherit);font-size:.7rem;line-height:1.45;color:var(--muted-foreground)}
.pr-note b{color:#fff}
.pr-bal{display:flex;flex-wrap:wrap;gap:.35rem}
.pr-bal span{--c:#fff;display:inline-flex;align-items:center;gap:.35rem;height:1.9rem;padding:0 .65rem;border-radius:.7rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground);background:color-mix(in oklch,var(--c) 10%,rgba(0,0,0,.35));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 30%,transparent);white-space:nowrap}
.pr-bal b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.82rem;color:var(--c)}

.pr-ladder{display:grid;gap:.55rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,15.5rem),1fr));align-items:stretch}
.pr-card{--c:#fff;position:relative;display:flex;flex-direction:column;gap:.5rem;min-width:0;padding:.7rem;border-radius:1.1rem;border:1px solid color-mix(in oklch,var(--c) 38%,transparent);background:linear-gradient(160deg,color-mix(in oklch,var(--c) 12%,rgba(10,8,22,.7)),rgba(8,6,18,.78));transition:box-shadow .2s,border-color .15s}
.pr-card[data-ready="true"]{border-color:var(--c);box-shadow:0 0 22px -8px var(--c)}
.pr-card[data-lock="true"]{opacity:.6;border-style:dashed}
.pr-card-h{display:flex;align-items:center;gap:.6rem}
.pr-card-t{display:flex;flex-direction:column;min-width:0;flex:1}
.pr-card-t b{font-family:var(--font-minecraft,inherit);font-size:.86rem;color:color-mix(in oklch,var(--c) 70%,#fff)}
.pr-card-t small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pr-ring{--p:0;--c:#fff;display:grid;place-items:center;flex:none;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1%),rgba(255,255,255,.12) 0);box-shadow:0 0 14px -4px var(--c)}
.pr-ring-in{display:grid;place-items:center;width:calc(100% - 7px);height:calc(100% - 7px);border-radius:50%;background:radial-gradient(circle at 35% 30%,color-mix(in oklch,var(--c) 18%,#14102a),#0c0918 80%);font-family:var(--font-minecraft,inherit);font-size:.7rem;color:var(--c)}
.pr-gain{display:flex;align-items:baseline;gap:.4rem;flex-wrap:wrap}
.pr-gain b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:1.25rem;line-height:1;color:var(--c);text-shadow:0 0 14px color-mix(in oklch,var(--c) 45%,transparent)}
.pr-gain span{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.pr-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.3rem}
.pr-fact{display:flex;flex-direction:column;gap:.05rem;padding:.3rem .5rem;border-radius:.7rem;background:rgba(255,255,255,.04)}
.pr-fact small{font-family:var(--font-rubik,inherit);font-size:.5rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground)}
.pr-fact b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.74rem;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pr-cue{display:inline-flex;align-items:center;gap:.35rem;padding:.08rem .55rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.6rem;white-space:nowrap;color:var(--k,#fff);background:color-mix(in oklch,var(--k,#fff) 14%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--k,#fff) 45%,transparent)}
.pr-cue i{width:.45rem;height:.45rem;border-radius:50%;background:var(--k,#fff);box-shadow:0 0 8px var(--k,#fff)}
.pr-cue[data-cue="wait"]{--k:var(--mc-aqua)}
.pr-cue[data-cue="good"]{--k:var(--mc-green)}
.pr-cue[data-cue="now"]{--k:var(--mc-gold)}
.pr-cue[data-cue="now"] i,.pr-cue[data-cue="good"] i{animation:fi-pulse 1.4s ease-in-out infinite}
.pr-chips{display:flex;flex-wrap:wrap;gap:.2rem;margin:0;padding:0;list-style:none}
.pr-chips li{padding:.05rem .45rem;border-radius:.45rem;font-family:var(--font-rubik,inherit);font-size:.56rem;line-height:1.35;color:var(--muted-foreground);background:rgba(255,255,255,.05)}
.pr-chips[data-tone="keep"] li{color:color-mix(in oklch,var(--mc-green) 70%,#fff);background:color-mix(in oklch,var(--mc-green) 10%,transparent)}
.pr-chips[data-tone="lose"] li{color:color-mix(in oklch,var(--mc-red) 70%,#fff);background:color-mix(in oklch,var(--mc-red) 10%,transparent)}
.pr-lab{font-family:var(--font-minecraft,inherit);font-size:.52rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.pr-btn{--c:var(--mc-light-purple);display:inline-flex;align-items:center;justify-content:center;gap:.3rem;height:2.1rem;padding:0 .9rem;border-radius:.75rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:#111;border:1px solid color-mix(in oklch,var(--c) 70%,#fff);background:var(--c);transition:filter .15s,transform .12s,opacity .15s;outline:none;white-space:nowrap}
.pr-btn:hover:not(:disabled){filter:brightness(1.15)}
.pr-btn:active:not(:disabled){transform:scale(.95)}
.pr-btn:disabled{opacity:.4;cursor:not-allowed}
.pr-btn:focus-visible,.pr-link:focus-visible{outline:2px solid #fff;outline-offset:2px}
.pr-btn.ghost{color:var(--c);background:color-mix(in oklch,var(--c) 10%,transparent);border-color:color-mix(in oklch,var(--c) 50%,transparent)}
.pr-link{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground);text-decoration:underline;outline:none}
.pr-link:hover{color:#fff}
.pr-row{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}

.pr-power{display:flex;flex-direction:column;gap:.45rem;padding:.7rem;border-radius:1.1rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22)}
.pr-stack{display:flex;height:.9rem;border-radius:999px;overflow:hidden;gap:2px}
.pr-stack i{display:block;height:100%;min-width:2px;background:var(--c);transition:width .3s}
.pr-leg{display:grid;gap:.25rem;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))}
.pr-leg div{display:flex;align-items:center;gap:.4rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.pr-leg i{width:.6rem;height:.6rem;border-radius:.2rem;background:var(--c);flex:none}
.pr-leg b{margin-left:auto;font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.68rem;color:#fff}

.pr-hist{display:grid;gap:.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,15.5rem),1fr))}
.pr-hist section{--c:#fff;padding:.55rem .65rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:color-mix(in oklch,var(--c) 5%,rgba(0,0,0,.2))}
.pr-hist h4{margin:0 0 .3rem;font-family:var(--font-minecraft,inherit);font-size:.66rem;color:var(--c)}
.pr-run{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.05rem .5rem;padding:.2rem 0;border-top:1px solid rgba(255,255,255,.06);font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.pr-run b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.66rem;color:#fff}
.pr-run em{font-style:normal;color:var(--c)}
.pr-run .pr-meter{grid-column:1/-1}
.pr-meter{display:block;height:.22rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.pr-meter i{display:block;height:100%;border-radius:inherit;background:var(--c)}
@media (prefers-reduced-motion:reduce){.pr-cue i{animation:none!important}.pr-ring,.pr-card{transition:none}}
`;

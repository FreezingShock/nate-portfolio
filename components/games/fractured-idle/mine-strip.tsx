"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import { ORE_BY_ID, onSwing, pickOf, rushLen, rushMult, type SwingOut } from "@/lib/fractured-idle/mine";

// A slim readout under the big button, on every tab: what the last swing found
// and how close the next Ore Rush is. On a phone the button and the Mine tab are
// stacked, so this is where you see that each press is a swing of the pickaxe.

const fmt = (n: number) => (n >= 100 ? String(Math.floor(n)) : String(+n.toFixed(n < 10 ? 1 : 0)));

export function MineStrip({ s, onOpen }: { s: State; onOpen: () => void }) {
    const last = useRef<SwingOut | null>(null);
    useEffect(() => onSwing((e) => (last.current = e)), []);
    const m = s.mine;
    const rush = m.rush > 0;
    const lo = last.current;
    const ore = lo ? ORE_BY_ID[lo.ore] : null;
    const pc = pickOf(s).color;
    return (
        <button
            type="button"
            onClick={onOpen}
            className="fi-ms"
            data-rush={rush}
            style={{ ["--pc" as string]: pc } as CSSProperties}
            aria-label={`Open the Mine. ${rush ? `Ore Rush, ${m.rush} swings left` : `Vein ${Math.floor(m.vein * 100)} percent to an Ore Rush`}`}
        >
            <span className="fi-ms-i">
                <McSymbol name="pick" />
            </span>
            <span className="fi-ms-b">
                <span className="fi-ms-t">
                    {rush ? <b className="rush">ORE RUSH x{rushMult(s).toFixed(1)} · {m.rush} left</b> : lo && ore ? <>Mined <b style={{ color: ore.color }}>+{fmt(lo.units)} {ore.name}</b></> : <>Every press is a swing</>}
                </span>
                <span className="fi-ms-bar">
                    <i style={{ width: `${(rush ? m.rush / rushLen(s) : m.vein) * 100}%` }} />
                </span>
            </span>
            <span className="fi-ms-go">Mine ▸</span>
        </button>
    );
}

export const STRIP_CSS = `
.fi-ms{display:flex;align-items:center;gap:.6rem;width:100%;max-width:22rem;margin:.1rem auto 0;padding:.35rem .6rem;border-radius:.8rem;border:1px solid color-mix(in oklch,#e0b070 38%,transparent);background:linear-gradient(120deg,color-mix(in oklch,#e0b070 10%,transparent),transparent 75%);text-align:left;transition:background .15s,transform .1s,border-color .2s;touch-action:manipulation}
.fi-ms:hover{background:linear-gradient(120deg,color-mix(in oklch,#e0b070 18%,transparent),transparent 75%)}
.fi-ms:active{transform:scale(.98)}
.fi-ms[data-rush="true"]{border-color:#ffd23a;box-shadow:0 0 16px -4px #ffd23a}
.fi-ms-i{display:grid;place-items:center;flex:none;width:1.7rem;height:1.7rem;border-radius:.5rem;font-size:1rem;color:var(--pc);background:color-mix(in oklch,var(--pc) 16%,transparent)}
.fi-ms-b{display:flex;flex-direction:column;gap:.2rem;flex:1;min-width:0}
.fi-ms-t{font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-ms-t b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.72rem}
.fi-ms-t b.rush{color:#ffd23a}
.fi-ms-bar{display:block;height:.3rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-ms-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#b9803c,#e0b070);transition:width .15s linear}
.fi-ms[data-rush="true"] .fi-ms-bar i{background:linear-gradient(90deg,#ffb020,#ffe066)}
.fi-ms-go{flex:none;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.64rem;color:#e0b070}
`;

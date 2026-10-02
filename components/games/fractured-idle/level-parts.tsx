"use client";

import type { CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { GRANT_LABEL } from "@/lib/fractured-idle/skills";
import { chapterClaimed, chapterReady, finaleClaimed, finaleReady, tasksDone, type Buff, type Grant, type Saga } from "@/lib/fractured-idle/sagas";

// Small pieces shared by the Level page views.

export const GOLD = "#ffd23a";

export const css = (o: Record<string, string | number>) => o as CSSProperties;

/** "+4% click power" chips, one per buff. */
export function Buffs({ buff, dim }: { buff: Buff[]; dim?: boolean }) {
    return (
        <span className="fi-lv-chips">
            {buff.map(([k, v]) => (
                <span key={k} className={`fi-lv-chip buff${dim ? " dim" : ""}`}>{fmtStat(k, v)}</span>
            ))}
        </span>
    );
}

const GRANT_COLOR: Record<Grant[0], string> = { dust: "#c58bff", tokens: "#ff6a5f", eggs: "#ff8fc7", ap: "#57d8ff", frag: GOLD };
export const grantText = ([k, n]: Grant) => `${n} ${GRANT_LABEL[k]}${k === "ap" && n > 1 ? "s" : ""}`;

export function Grants({ grant, xp }: { grant: Grant[]; xp?: number }) {
    return (
        <span className="fi-lv-chips">
            {grant.map((g) => (
                <span key={g[0]} className="fi-lv-chip" style={css({ "--k": GRANT_COLOR[g[0]] })}>+{grantText(g)}</span>
            ))}
            {xp ? <span className="fi-lv-chip" style={css({ "--k": GOLD })}>+{xp} Fracture EXP</span> : null}
        </span>
    );
}

export const Bar = ({ pct, color, thin }: { pct: number; color?: string; thin?: boolean }) => (
    <span className={`fi-lv-bar${thin ? " thin" : ""}`} style={css(color ? { "--bc": color } : {})}>
        <i style={{ width: `${Math.max(0, Math.min(1, isFinite(pct) ? pct : 0)) * 100}%` }} />
    </span>
);

export type PipState = "none" | "part" | "ready" | "done";
/** One state per chapter, plus the finale last. */
export function pipsOf(s: State, x: Saga): PipState[] {
    const out: PipState[] = x.chapters.map((c) => (chapterClaimed(s, c) ? "done" : chapterReady(s, c) ? "ready" : tasksDone(s, c) > 0 ? "part" : "none"));
    out.push(finaleClaimed(s, x) ? "done" : finaleReady(s, x) ? "ready" : "none");
    return out;
}

/** A saga tile with its themed background. Used for the overview grid and as the saga picker. */
export function SagaCard({ s, x, on, onClick }: { s: State; x: Saga; on?: boolean; onClick: () => void }) {
    const pips = pipsOf(s, x);
    const claimed = x.chapters.filter((c) => chapterClaimed(s, c)).length;
    const ready = pips.filter((p) => p === "ready").length;
    return (
        <button type="button" className="fi-lv-saga" data-on={!!on} onClick={onClick} style={css({ "--sc": x.color, "--bg": x.bg })} aria-label={`${x.name}: ${claimed} of ${x.chapters.length} chapters claimed`}>
            <span className="fi-lv-saga-mark"><McSymbol name={x.symbol} /></span>
            {ready > 0 && <span className="fi-lv-saga-b">{ready}</span>}
            <span className="fi-lv-saga-s">{x.skill}</span>
            <span className="fi-lv-saga-n">{x.name}</span>
            <span className="fi-lv-saga-f">
                <span className="fi-lv-pips">
                    {pips.map((p, i) => (
                        <span key={i} data-s={p} className={i === pips.length - 1 ? "fin" : ""} />
                    ))}
                </span>
                <span>{claimed === x.chapters.length ? (finaleClaimed(s, x) ? "Complete" : "Finale ready") : `${claimed}/${x.chapters.length}`}</span>
            </span>
        </button>
    );
}

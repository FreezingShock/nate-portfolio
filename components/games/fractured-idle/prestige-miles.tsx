"use client";

import type { CSSProperties } from "react";
import { Check, Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { fmtInt } from "@/lib/fractured-idle/format";
import { fmtStat } from "@/lib/fractured-idle/enchant";
import { PRESTIGE_CATS } from "@/lib/fractured-idle/prestige";
import { ASC_MILESTONES, FAM_CATS, GEM_FAMILIES, RB_MILESTONES, TOKEN_FAMILIES, famLevel, type Milestone, type Tier } from "@/lib/fractured-idle/trans";
import { Ring, LAYERS_INFO } from "./prestige-parts";
import type { Ctx } from "./ui";

// The milestone roadmap: every perk the three layers hand out for how far you have gone, what is next, and how close
// each shop family is to its next bonus tier. All of it is earned once and kept forever.

const tierText = (t: Tier | Milestone) => {
    const parts: string[] = [];
    for (const [k, v] of t.fx ?? []) parts.push(fmtStat(k, v));
    if (t.cap) parts.push(`+${t.cap} rebirth${t.cap === 1 ? "" : "s"} at once`);
    if (t.gems) parts.push(`+${Math.round(t.gems * 100)}% gems`);
    return parts.join(", ");
};

function Track({ title, color, symbol, value, unit, list }: { title: string; color: string; symbol: Parameters<typeof McSymbol>[0]["name"]; value: number; unit: string; list: Milestone[] }) {
    const next = list.find((m) => m.at > value);
    const prev = [...list].reverse().find((m) => m.at <= value);
    const pct = next ? (value - (prev?.at ?? 0)) / (next.at - (prev?.at ?? 0)) : 1;
    return (
        <section className="pm-track" style={{ ["--c" as string]: color } as CSSProperties}>
            <header>
                <Ring pct={pct} color={color} size={2.8}><McSymbol name={symbol} /></Ring>
                <span>
                    <b>{title}</b>
                    <small>{fmtInt(value)} {unit} · {list.filter((m) => m.at <= value).length}/{list.length} perks{next ? ` · next at ${next.at}` : ""}</small>
                </span>
            </header>
            <ol>
                {list.map((m) => {
                    const done = m.at <= value;
                    return (
                        <li key={m.at} data-done={done} data-next={m === next}>
                            <span className="pm-dot">{done ? <Check className="size-3" /> : m === next ? m.at : <Lock className="size-3" />}</span>
                            <span>
                                <b>{m.name}</b> <em>at {m.at}</em>
                                <small>{m.desc}{m.fx || m.cap || m.gems ? ` (${tierText(m)})` : ""}</small>
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

export function Milestones({ s }: Pick<Ctx, "s">) {
    return (
        <>
            <p className="pr-note">Everything here is earned once and kept forever, through every rebirth, ascension and Transcendence.</p>
            <div className="pm-tracks">
                <Track title="Rebirth milestones" color={LAYERS_INFO.rb.color} symbol="portal" value={s.pbest.rb} unit="best rebirths" list={RB_MILESTONES} />
                <Track title="Ascension milestones" color={LAYERS_INFO.asc.color} symbol="comet" value={s.ascEver} unit="ascensions" list={ASC_MILESTONES} />
            </div>

            <div className="pr-h" style={{ ["--hc" as string]: "var(--mc-gold)" } as CSSProperties}>Shop families <small>levels held across a kind of upgrade unlock bonus tiers</small></div>
            <div className="pm-fams">
                {(["tokens", "gems"] as const).map((cur) => (
                    <section key={cur} className="pm-track" style={{ ["--c" as string]: cur === "tokens" ? LAYERS_INFO.rb.color : LAYERS_INFO.asc.color } as CSSProperties}>
                        <header>
                            <span>
                                <b>{cur === "tokens" ? "Token upgrades" : "Gem upgrades"}</b>
                                <small>{cur === "tokens" ? "Spent with rebirth tokens" : "Spent with ascension gems"}</small>
                            </span>
                        </header>
                        {FAM_CATS.map((cat) => {
                            const fam = (cur === "tokens" ? TOKEN_FAMILIES : GEM_FAMILIES)[cat];
                            const info = PRESTIGE_CATS.find((c) => c.id === cat)!;
                            const lv = famLevel(s, cur, cat);
                            const nextIdx = fam.at.findIndex((n) => lv < n);
                            const target = nextIdx < 0 ? fam.at[fam.at.length - 1] : fam.at[nextIdx];
                            const base = nextIdx > 0 ? fam.at[nextIdx - 1] : 0;
                            return (
                                <div key={cat} className="pm-fam" style={{ ["--k" as string]: info.color } as CSSProperties}>
                                    <span className="pm-fam-h"><McSymbol name={info.symbol} /> {info.label}</span>
                                    <span className="pm-fam-b"><i style={{ width: `${nextIdx < 0 ? 100 : ((lv - base) / (target - base)) * 100}%` }} /></span>
                                    <span className="pm-fam-n">{fmtInt(lv)}{nextIdx < 0 ? " (all tiers)" : ` / ${fmtInt(target)}`}</span>
                                    <span className="pm-fam-t">
                                        {fam.tiers.map((t, i) => (
                                            <em key={i} data-done={lv >= fam.at[i]}>
                                                {fam.at[i]}: {tierText(t)}
                                            </em>
                                        ))}
                                    </span>
                                </div>
                            );
                        })}
                    </section>
                ))}
            </div>
        </>
    );
}

export const MILES_CSS = `
.pm-tracks,.pm-fams{display:grid;gap:.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));align-items:start}
.pm-track{--c:#fff;display:flex;flex-direction:column;gap:.4rem;padding:.6rem .7rem;border-radius:1.05rem;border:1px solid color-mix(in oklch,var(--c) 32%,transparent);background:linear-gradient(180deg,color-mix(in oklch,var(--c) 8%,rgba(10,8,22,.55)),rgba(8,6,18,.55))}
.pm-track>header{display:flex;align-items:center;gap:.6rem}
.pm-track>header span{display:flex;flex-direction:column;min-width:0}
.pm-track>header b{font-family:var(--font-minecraft,inherit);font-size:.76rem;color:color-mix(in oklch,var(--c) 75%,#fff)}
.pm-track>header small{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.pm-track ol{display:flex;flex-direction:column;gap:.25rem;margin:0;padding:0;list-style:none}
.pm-track li{display:flex;gap:.55rem;align-items:flex-start;padding:.3rem .4rem;border-radius:.7rem;background:rgba(255,255,255,.03);opacity:.6}
.pm-track li[data-done="true"]{opacity:1;background:color-mix(in oklch,var(--c) 10%,transparent)}
.pm-track li[data-next="true"]{opacity:1;box-shadow:inset 0 0 0 1px var(--c)}
.pm-dot{display:grid;place-items:center;flex:none;width:1.4rem;height:1.4rem;border-radius:50%;font-family:var(--font-minecraft,inherit);font-size:.55rem;color:var(--c);border:1.5px solid color-mix(in oklch,var(--c) 55%,transparent)}
.pm-track li[data-done="true"] .pm-dot{background:var(--c);color:#111}
.pm-track li b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:.66rem;color:#fff}
.pm-track li em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--muted-foreground)}
.pm-track li small{display:block;font-family:var(--font-rubik,inherit);font-size:.6rem;line-height:1.35;color:var(--muted-foreground)}
.pm-fam{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"h n" "b b" "t t";gap:.2rem .5rem;padding:.35rem .45rem;border-radius:.7rem;background:rgba(255,255,255,.03)}
.pm-fam-h{grid-area:h;display:flex;align-items:center;gap:.35rem;font-family:var(--font-minecraft,inherit);font-size:.64rem;color:var(--k)}
.pm-fam-n{grid-area:n;font-family:var(--font-minecraft,inherit);font-size:.6rem;color:#fff}
.pm-fam-b{grid-area:b;display:block;height:.25rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.pm-fam-b i{display:block;height:100%;background:var(--k);box-shadow:0 0 6px var(--k);transition:width .3s}
.pm-fam-t{grid-area:t;display:flex;flex-wrap:wrap;gap:.15rem .5rem}
.pm-fam-t em{font-style:normal;font-family:var(--font-rubik,inherit);font-size:.54rem;color:var(--muted-foreground)}
.pm-fam-t em[data-done="true"]{color:var(--mc-green)}
`;

"use client";

import { useState, type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { fmtInt } from "@/lib/fractured-idle/format";
import { bestPrestige, buyPrestige, layerGain, transcend } from "@/lib/fractured-idle/engine";
import { advise } from "@/lib/fractured-idle/runs";
import { ESS_BRANCHES, ESS_UPS, abandonVows, buyEssence, eLv, essLocked, essPrice, toggleVow, transMult, transPlan, vowMult, vowSlots, VOWS, type EssUp } from "@/lib/fractured-idle/trans";
import { Tip, TipCard } from "./tooltip";
import { Chips, Cue, LAYERS_INFO, Ring, keepsOf, losesOf, perHour, secs } from "./prestige-parts";
import type { Ctx } from "./ui";

// Transcendence: the third reset. Its page has the Essence you hold, the vows (a handicap for a run that pays more
// Essence), a checklist for what is lost, the Transcend button, and the Essence shop in three branches.

const L = LAYERS_INFO.trans;
const QTYS = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: -1, label: "Max" },
];

export function TranscendView({ s, F, act, say }: Pick<Ctx, "s" | "F" | "act" | "say">) {
    const [qty, setQty] = useState(1);
    const [confirm, setConfirm] = useState(false);
    const open = s.ascEver >= 3 || s.trans > 0;
    const plan = transPlan(s);
    const g = layerGain(s, "trans");
    const a = advise(s.runs, "trans", s.playTime, g.gain, g.can);
    const slots = vowSlots(s);
    const nextVowMult = vowMult(s.vowNext);

    if (!open) {
        return (
            <div className="pr-card" data-lock="true" style={{ ["--c" as string]: L.color } as CSSProperties}>
                <div className="pr-card-h">
                    <Ring pct={Math.min(1, s.ascEver / 3)} color={L.color}><Lock className="size-4" /></Ring>
                    <span className="pr-card-t">
                        <b>Transcendence is locked</b>
                        <small>Ascend 3 times to see it ({fmtInt(s.ascEver)} / 3)</small>
                    </span>
                </div>
                <p className="pr-note">{L.blurb} It keeps every gem upgrade and auto-buyer, so ascending is never wasted.</p>
            </div>
        );
    }

    const spendGems = () => {
        let n = 0;
        act(() => {
            for (let i = 0; i < 400; i++) {
                const b = bestPrestige(s, "gems");
                if (!b || buyPrestige(s, "gems", b.id, 1) < 1) break;
                n++;
            }
            return n > 0;
        });
        say(n ? `Spent gems on ${n} upgrade level${n === 1 ? "" : "s"}.` : "Nothing affordable.");
    };

    const buyN = (u: EssUp, want: number) => {
        let got = 0;
        act(() => {
            for (let i = 0; i < (want < 0 ? 200 : want); i++) {
                if (!buyEssence(s, u.id)) break;
                got++;
            }
            return got > 0;
        });
        if (got > 1) say(`${u.name} +${got}`);
    };
    const spendAll = () => {
        let n = 0;
        act(() => {
            for (let i = 0; i < 400; i++) {
                const open = ESS_UPS.filter((u) => eLv(s, u.id) < u.max && !essLocked(s, u) && essPrice(u, eLv(s, u.id)) <= s.ess).sort((x, y) => essPrice(x, eLv(s, x.id)) - essPrice(y, eLv(s, y.id)));
                if (!open.length || !buyEssence(s, open[0].id)) break;
                n++;
            }
            return n > 0;
        });
        say(n ? `Bought ${n} Essence upgrade level${n === 1 ? "" : "s"}, cheapest first.` : "Nothing affordable.");
    };

    const doTranscend = () => {
        const p = transPlan(s);
        act(() => transcend(s), "buy");
        say(`Transcended! +${fmtInt(p.gain)} Essence. Spend it in the shop below.`);
        setConfirm(false);
    };

    return (
        <>
            <div className="pr-card" data-ready={g.can} style={{ ["--c" as string]: L.color } as CSSProperties}>
                <div className="pr-card-h">
                    <Ring pct={Math.min(1, s.asc / plan.req, plan.secs / plan.minSecs)} color={L.color} size={4}><McSymbol name={L.symbol} /></Ring>
                    <span className="pr-card-t">
                        <b>Transcendence {fmtInt(s.trans + 1)}</b>
                        <small>Needs Ascension {fmtInt(plan.req)} ({fmtInt(s.asc)} now) and a run of at least {secs(plan.minSecs)}{plan.timeLeft > 0 ? ` (${secs(plan.timeLeft)} to go)` : ""}. {L.blurb}</small>
                    </span>
                </div>
                <div className="pr-gain">
                    <b>{g.can ? `+${F(g.gain)}` : `+${F(plan.next)} at Ascension ${fmtInt(Math.max(s.asc, plan.req) + (g.can ? 1 : 0))}`}</b>
                    <span>Essence{g.can ? " if you transcend now" : ""}</span>
                </div>
                <div className="pr-row">
                    <Cue a={a} />
                    {g.can && <span className="pr-note">{perHour(a.rate)}</span>}
                    {s.vow.length > 0 && <span className="pr-note">Vows this run: x{vowMult(s.vow).toFixed(2)} Essence</span>}
                </div>
                <div className="pr-facts">
                    <div className="pr-fact"><small>Essence</small><b>{F(s.ess)}</b></div>
                    <div className="pr-fact"><small>Lifetime</small><b>{F(s.essTotal)}</b></div>
                    <div className="pr-fact"><small>Boost now</small><b>x{F(transMult(s))}</b></div>
                    <div className="pr-fact"><small>Boost after</small><b>x{F(Math.pow(2, s.trans + 1) * (1 + 0.03 * (s.essTotal + plan.gain)))}</b></div>
                </div>
                <span className="pr-lab">Keeps</span>
                <Chips items={keepsOf("trans", s)} tone="keep" />
                <span className="pr-lab">Erases</span>
                <Chips items={losesOf("trans", s)} tone="lose" />
                {s.ap > 0 && (
                    <p className="pr-note">
                        <b>You hold {fmtInt(s.ap)} unspent gem{s.ap === 1 ? "" : "s"}. They are erased.</b> Spend them first.{" "}
                        <button type="button" className="pr-link" onClick={spendGems}>Spend all gems</button>
                    </p>
                )}
                <div className="pr-row">
                    {confirm ? (
                        <>
                            <button type="button" className="pr-btn" style={{ ["--c" as string]: L.color } as CSSProperties} onClick={doTranscend}>
                                Confirm: transcend for +{fmtInt(plan.gain)} Essence
                            </button>
                            <button type="button" className="pr-link" onClick={() => setConfirm(false)}>Cancel</button>
                        </>
                    ) : (
                        <button type="button" className={`pr-btn ${g.can ? "fi-afford" : ""}`} disabled={!g.can} style={{ ["--c" as string]: L.color } as CSSProperties} onClick={() => setConfirm(true)}>
                            {g.can ? `Transcend for +${fmtInt(plan.gain)} Essence` : plan.ascOk ? `Settling: ${secs(plan.timeLeft)} to go` : `Reach Ascension ${fmtInt(plan.req)}`}
                        </button>
                    )}
                </div>
            </div>

            <div className="pr-h" style={{ ["--hc" as string]: "var(--mc-red)" } as CSSProperties}>Vows <small>a handicap for a run, paid in extra Essence</small></div>
            {s.vow.length > 0 && (
                <div className="pr-card" style={{ ["--c" as string]: "var(--mc-red)" } as CSSProperties}>
                    <span className="pr-lab">Keeping this run</span>
                    <div className="pr-vows">
                        {s.vow.map((id) => {
                            const v = VOWS.find((x) => x.id === id)!;
                            return (
                                <div key={id} className="pr-vow" data-on="true" style={{ ["--c" as string]: v.color } as CSSProperties}>
                                    <McSymbol name={v.symbol} />
                                    <span><b>{v.name}</b><small>{v.desc}</small></span>
                                    <em>+{Math.round(v.bonus * 100)}%</em>
                                </div>
                            );
                        })}
                    </div>
                    <div className="pr-row">
                        <span className="pr-note">Transcend while keeping them for x{vowMult(s.vow).toFixed(2)} Essence. Giving up now ends the handicap and the bonus.</span>
                        <button type="button" className="pr-link" onClick={() => { act(() => abandonVows(s)); say("Vows abandoned."); }}>Abandon vows</button>
                    </div>
                </div>
            )}
            <p className="pr-note">
                Choose {slots === 1 ? "one vow" : `up to ${slots} vows`} for your <b>next</b> run. They take hold when you transcend and pay Essence when you transcend again.
                {s.vowNext.length > 0 && <> Chosen: <b>x{nextVowMult.toFixed(2)}</b> Essence next time.</>}
            </p>
            <div className="pr-vows">
                {VOWS.map((v) => {
                    const on = s.vowNext.includes(v.id);
                    const full = !on && s.vowNext.length >= slots;
                    return (
                        <button key={v.id} type="button" className="pr-vow" data-on={on} disabled={full} aria-pressed={on} style={{ ["--c" as string]: v.color } as CSSProperties} onClick={() => act(() => toggleVow(s, v.id))}>
                            <McSymbol name={v.symbol} />
                            <span><b>{v.name}</b><small>{v.desc}</small></span>
                            <em>+{Math.round(v.bonus * 100)}%</em>
                        </button>
                    );
                })}
            </div>

            <div className="pr-h" style={{ ["--hc" as string]: L.color } as CSSProperties}>Essence shop <small>permanent upgrades that survive every Transcendence</small></div>
            <div className="pr-row">
                <span className="pr-bal"><span style={{ ["--c" as string]: L.color } as CSSProperties}><small>Essence</small><b>{F(s.ess)}</b></span></span>
                <div className="ps-qty" role="radiogroup" aria-label="Buy amount">
                    {QTYS.map((o) => (
                        <button key={o.v} type="button" role="radio" aria-checked={qty === o.v} data-on={qty === o.v} onClick={() => setQty(o.v)}>{o.label}</button>
                    ))}
                </div>
                <button type="button" className="pr-btn ghost" style={{ ["--c" as string]: L.color } as CSSProperties} onClick={spendAll}>Spend all</button>
            </div>
            <div className="pr-branches">
                {ESS_BRANCHES.map((b) => (
                    <section key={b.id} className="pr-branch" style={{ ["--c" as string]: b.color } as CSSProperties}>
                        <header>
                            <McSymbol name={b.symbol} />
                            <span><b>{b.label}</b><small>{b.blurb}</small></span>
                        </header>
                        {ESS_UPS.filter((u) => u.branch === b.id).map((u) => {
                            const lvl = eLv(s, u.id);
                            const maxed = lvl >= u.max;
                            const lock = essLocked(s, u);
                            const price = essPrice(u, lvl);
                            const can = !maxed && !lock && s.ess >= price;
                            return (
                                <div key={u.id} className="pr-up" data-can={can} data-lock={!!lock} data-needs={!!u.needs}>
                                    <span className="pr-up-i"><McSymbol name={u.symbol} /></span>
                                    <span className="pr-up-t">
                                        <b>{u.name}</b>
                                        <small>{u.desc}</small>
                                        {u.max > 1 && (
                                            <span className="pr-pips" aria-label={`Level ${lvl} of ${u.max}`}>
                                                {u.max <= 10 ? Array.from({ length: u.max }, (_, k) => <i key={k} data-on={k < lvl} />) : <em>{lvl}/{u.max}</em>}
                                            </span>
                                        )}
                                    </span>
                                    <Tip tip={<TipCard title={u.name} color={b.color} tag={`Level ${lvl} / ${u.max}`} lines={[u.desc]} rows={maxed ? undefined : [["Next level costs", `${F(price)} Essence`]]} notes={lock ? [{ text: lock, color: "var(--mc-gold)" }] : undefined} />}>
                                        <button type="button" className="pr-buy" disabled={!can} onClick={() => buyN(u, qty)}>
                                            {maxed ? "Maxed" : lock ? <Lock className="size-3" /> : F(price)}
                                        </button>
                                    </Tip>
                                    {lock && <span className="pr-need">{lock}</span>}
                                </div>
                            );
                        })}
                    </section>
                ))}
            </div>
        </>
    );
}

export const TRANS_CSS = `
.pr-vows{display:grid;gap:.4rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))}
.pr-vow{--c:#fff;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.55rem;padding:.5rem .65rem;border-radius:.95rem;text-align:left;border:1px solid color-mix(in oklch,var(--c) 30%,transparent);background:color-mix(in oklch,var(--c) 6%,rgba(10,8,22,.6));color:var(--c);font-size:1.2rem;transition:transform .14s,border-color .15s,background .15s;outline:none}
.pr-vow:hover:not(:disabled){transform:translateY(-1px);border-color:var(--c)}
.pr-vow[data-on="true"]{border-color:var(--c);background:color-mix(in oklch,var(--c) 18%,rgba(10,8,22,.55));box-shadow:0 0 16px -6px var(--c)}
.pr-vow:disabled{opacity:.4;cursor:not-allowed}
.pr-vow:focus-visible{outline:2px solid var(--c);outline-offset:2px}
.pr-vow span{display:flex;flex-direction:column;min-width:0}
.pr-vow b{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:color-mix(in oklch,var(--c) 70%,#fff)}
.pr-vow small{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.pr-vow em{font-style:normal;padding:.04rem .45rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-size:.6rem;color:#111;background:var(--c)}
.pr-branches{display:grid;gap:.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));align-items:start}
.pr-branch{--c:#fff;display:flex;flex-direction:column;gap:.35rem;padding:.55rem;border-radius:1.05rem;border:1px solid color-mix(in oklch,var(--c) 32%,transparent);background:linear-gradient(180deg,color-mix(in oklch,var(--c) 8%,rgba(10,8,22,.55)),rgba(8,6,18,.55))}
.pr-branch>header{display:flex;align-items:center;gap:.55rem;padding:.1rem .15rem .35rem;color:var(--c);font-size:1.15rem;border-bottom:1px solid color-mix(in oklch,var(--c) 22%,transparent)}
.pr-branch>header span{display:flex;flex-direction:column}
.pr-branch>header b{font-family:var(--font-minecraft,inherit);font-size:.76rem;color:color-mix(in oklch,var(--c) 75%,#fff)}
.pr-branch>header small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground)}
.pr-up{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"i t b" "n n n";align-items:center;gap:.3rem .55rem;padding:.45rem .55rem;border-radius:.85rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);transition:border-color .15s,background .15s}
.pr-up[data-needs="true"]{margin-left:.7rem}
.pr-up[data-needs="true"]::before{content:"";position:absolute;left:-.45rem;top:-.4rem;bottom:50%;width:.4rem;border-left:2px solid color-mix(in oklch,var(--c) 40%,transparent);border-bottom:2px solid color-mix(in oklch,var(--c) 40%,transparent);border-bottom-left-radius:.4rem}
.pr-up[data-can="true"]{border-color:var(--c);background:color-mix(in oklch,var(--c) 10%,rgba(0,0,0,.2))}
.pr-up[data-lock="true"]{opacity:.55}
.pr-up-i{grid-area:i;display:grid;place-items:center;width:2rem;height:2rem;border-radius:.6rem;font-size:1.1rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 40%,transparent)}
.pr-up-t{grid-area:t;display:flex;flex-direction:column;gap:.1rem;min-width:0}
.pr-up-t b{font-family:var(--font-minecraft,inherit);font-size:.68rem;color:color-mix(in oklch,var(--c) 60%,#fff)}
.pr-up-t small{font-family:var(--font-rubik,inherit);font-size:.58rem;line-height:1.3;color:var(--muted-foreground)}
.pr-pips{display:flex;gap:2px;align-items:center;margin-top:.1rem}
.pr-pips i{width:.4rem;height:.4rem;border-radius:50%;background:rgba(255,255,255,.16)}
.pr-pips i[data-on="true"]{background:var(--c);box-shadow:0 0 5px var(--c)}
.pr-pips em{font-style:normal;font-family:var(--font-minecraft,inherit);font-size:.56rem;color:#fff}
.pr-buy{grid-area:b;min-width:3.4rem;height:1.8rem;padding:0 .55rem;border-radius:.6rem;font-family:var(--font-minecraft,inherit);font-size:.64rem;font-weight:700;color:var(--muted-foreground);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);transition:filter .15s,transform .12s;outline:none}
.pr-up[data-can="true"] .pr-buy{color:#111;background:var(--c);border-color:var(--c)}
.pr-buy:hover:not(:disabled){filter:brightness(1.15)}
.pr-buy:active:not(:disabled){transform:scale(.94)}
.pr-buy:disabled{cursor:not-allowed}
.pr-buy:focus-visible{outline:2px solid #fff;outline-offset:2px}
.pr-need{grid-area:n;font-family:var(--font-rubik,inherit);font-size:.56rem;color:var(--mc-gold)}
`;

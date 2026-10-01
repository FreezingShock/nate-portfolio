"use client";

import type { CSSProperties, ReactNode } from "react";
import { McSymbol, type McSymbolName } from "@/components/mc-symbol";
import { ShineBorder } from "@/components/ui/shine-border";
import { SKILLS, skillLevel, type State } from "@/lib/fractured-idle/data";
import { fmt } from "@/lib/fractured-idle/engine";
import { FXP_PER_LEVEL, LEVEL_BONUS, fxpTotal, levelColor, prefixOf, prefixStat, symbolOf } from "@/lib/fractured-idle/fxp";
import { ISLANDS } from "@/lib/fractured-idle/islands";
import { LEVEL_CSS, LevelBadge } from "./level-badge";
import { TIP_CSS, Tip, TipCard, TipProvider } from "./tooltip";

// THE Fractured Idle profile block. The strip under the game and the card on the profile page both render
// this one component, so they always match and any change here shows up in both. It takes a plain game State
// (the live local save under the game, the cloud save on the profile), so it never depends on where that came from.
//
// Its look follows progression: the tier below sets the frame, glow and extras, from a plain card for a new
// player up to an animated prismatic border for a Fractured one.

interface Tier {
    idx: number;
    id: string;
    name: string;
    color: string;
    glow: number;
    blurb: string;
    next?: string;
}

const TIERS: Omit<Tier, "idx" | "next">[] = [
    { id: "wanderer", name: "Wanderer", color: "#aab0bd", glow: 0, blurb: "Just getting started." },
    { id: "adept", name: "Adept", color: "#55ff55", glow: 10, blurb: "Fractured Level 20 or higher." },
    { id: "veteran", name: "Veteran", color: "#55ffff", glow: 18, blurb: "Fractured Level 60, or 3 rebirths." },
    { id: "ascended", name: "Ascended", color: "#c084fc", glow: 26, blurb: "Ascended at least once." },
    { id: "transcendent", name: "Transcendent", color: "#ffd23a", glow: 34, blurb: "Ascended 3 times." },
    { id: "fractured", name: "Fractured", color: "#ff55ff", glow: 44, blurb: "Ascended 5 times, or Fractured Level 200." },
];
const NEXT: string[] = ["Reach Fractured Level 20", "Reach Fractured Level 60 or 3 rebirths", "Ascend once", "Ascend 3 times", "Ascend 5 times or reach level 200", ""];

export function tierOf(s: State): Tier {
    const lvl = s.lvl;
    const idx = s.asc >= 5 || lvl >= 200 ? 5 : s.asc >= 3 ? 4 : s.asc >= 1 ? 3 : lvl >= 60 || s.rebirths >= 3 ? 2 : lvl >= 20 ? 1 : 0;
    return { ...TIERS[idx], idx, next: NEXT[idx] };
}

const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;
const hours = (sec: number) => (sec >= 3600 ? `${(sec / 3600).toFixed(1)}h` : `${Math.floor(sec / 60)}m`);
const F = (n: number) => fmt(n, false);

function Tile({ symbol, label, value, color, tip }: { symbol: McSymbolName; label: string; value: string; color: string; tip: ReactNode }) {
    return (
        <Tip box tip={tip}>
            <div className="fi-pb-tile" style={{ ["--c" as string]: color } as CSSProperties} tabIndex={0}>
                <span className="fi-pb-ti"><McSymbol name={symbol} /></span>
                <span className="min-w-0">
                    <span className="fi-pb-tl">{label}</span>
                    <span className="fi-pb-tv">{value}</span>
                </span>
            </div>
        </Tip>
    );
}

export function FracturedIdleBlock({ s, owner, footer }: { s: State; owner?: string; footer?: ReactNode }) {
    const tier = tierOf(s);
    const lvlColor = levelColor(s.lvl);
    const into = Math.max(0, fxpTotal(s) - s.lvl * FXP_PER_LEVEL);
    const islands = prefixStat(s, "islands");
    const pets = prefixStat(s, "pets");
    const trophies = Object.values(s.tro).reduce((a, b) => a + b, 0);

    const stats: { symbol: McSymbolName; label: string; value: string; color: string; tip: ReactNode }[] = [
        { symbol: "speed", label: "Shards", value: F(s.total), color: "var(--mc-aqua)", tip: <TipCard title="Lifetime shards" color="var(--mc-aqua)" lines={["Every shard you have ever earned. It survives rebirths and unlocks islands."]} rows={[["Right now", F(s.shards)], ["Best income", `${F(s.peakInc)}/s`]]} /> },
        { symbol: "portal", label: "Rebirths", value: String(s.rebirths), color: "var(--mc-light-purple)", tip: <TipCard title="Rebirths" color="var(--mc-light-purple)" lines={["Reset your minions for permanent rebirth tokens."]} rows={[["Tokens held", String(s.tokens)]]} /> },
        { symbol: "comet", label: "Ascensions", value: String(s.asc), color: "var(--mc-gold)", tip: <TipCard title="Ascensions" color="var(--mc-gold)" lines={["The prestige layer above rebirth. Each one pays ascension points and permanent power."]} rows={[["Points held", String(s.ap)]]} /> },
        { symbol: "critChance", label: "Clicks", value: F(s.clicks), color: "var(--mc-red)", tip: <TipCard title="Clicks" color="var(--mc-red)" lines={["Every press of the big button."]} rows={[["Critical hits", F(s.crits)], ["Best combo", `x${prefixStat(s, "bestCombo")}`]]} /> },
        { symbol: "regen", label: "Play time", value: hours(s.playTime), color: "var(--mc-green)", tip: <TipCard title="Play time" color="var(--mc-green)" lines={["Time spent playing, plus offline time at a reduced rate."]} /> },
        { symbol: "location", label: "Islands", value: `${s.visited.length} / ${ISLANDS.length}`, color: "var(--mc-dark-aqua, #00aaaa)", tip: <TipCard title="Islands" color="#00aaaa" lines={["Islands you have travelled to. Each visit adds a little to all shards."]} rows={[["Unlocked", `${islands} / ${ISLANDS.length}`]]} /> },
        { symbol: "petLuck", label: "Pets", value: `${pets}`, color: "var(--mc-green)", tip: <TipCard title="Pets" color="var(--mc-green)" lines={["Different pets you have discovered."]} rows={[["Hatched", String(s.hatched)]]} /> },
        { symbol: "pristine", label: "Trophies", value: String(trophies), color: "var(--mc-yellow)", tip: <TipCard title="Trophies" color="var(--mc-yellow)" lines={["Trophy tiers unlocked across every system."]} rows={[["Fracture Fragments", String(s.frag)], ["Treasure bobbers", F(s.bobbers)]]} /> },
    ];

    const lines = [
        `${F(s.total)} lifetime shards across ${s.rebirths} rebirth${s.rebirths === 1 ? "" : "s"} and ${s.asc} ascension${s.asc === 1 ? "" : "s"}.`,
        `${s.visited.length} of ${ISLANDS.length} islands visited, ${pets} pet${pets === 1 ? "" : "s"} discovered and ${trophies} trophy tier${trophies === 1 ? "" : "s"} earned.`,
        `${hours(s.playTime)} played over ${F(s.clicks)} clicks.`,
    ];

    return (
        <TipProvider>
            <style>{TIP_CSS + LEVEL_CSS + BLOCK_CSS}</style>
            <section className="fi-pb" data-tier={tier.idx} style={{ ["--tc" as string]: tier.color, ["--glow" as string]: `${tier.glow}px` } as CSSProperties}>
                {tier.idx >= 3 && <ShineBorder shineColor={tier.idx === 5 ? ["#ff55ff", "#55ffff", "#ffd23a", "#55ff55"] : [tier.color, "#ffffff55", tier.color]} borderWidth={tier.idx >= 4 ? 2 : 1.5} duration={tier.idx >= 4 ? 8 : 14} />}
                {tier.idx >= 4 && <span aria-hidden className="fi-pb-deco"><McSymbol name={tier.idx === 5 ? "magicFind" : "crown"} /></span>}

                <header className="fi-pb-head">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="fi-pb-logo"><McSymbol name="wisdom" /></span>
                        <div className="min-w-0">
                            <h3 className={`fi-pb-title ${tier.idx === 5 ? "fi-pb-title-prism" : ""}`}>Fractured Idle</h3>
                            <Tip tip={<TipCard title={`${tier.name} tier`} color={tier.color} tag={`Tier ${tier.idx + 1} / ${TIERS.length}`} lines={[tier.blurb, "This card changes its frame and glow as you progress."]} notes={tier.next ? [{ text: `Next: ${tier.next}`, color: "var(--mc-yellow)" }] : [{ text: "Top tier reached", color: "var(--mc-green)" }]} />}>
                                <span className="fi-pb-tier" tabIndex={0}><McSymbol name={tier.idx >= 3 ? "comet" : "speed"} /> {tier.name}</span>
                            </Tip>
                        </div>
                    </div>
                    <Tip
                        tip={
                            <TipCard
                                title={`Fractured Level ${s.lvl}`}
                                color={lvlColor}
                                tag={`${Math.floor(into)} / ${FXP_PER_LEVEL} EXP`}
                                lines={["Earn Fracture EXP by unlocking things across every system. Each level adds to all shards."]}
                                rows={[["Bonus", `+${(LEVEL_BONUS * s.lvl * 100).toFixed(2)}% all shards`, "var(--mc-green)"], ["To next level", `${Math.max(0, Math.ceil(FXP_PER_LEVEL - into))} EXP`, "var(--mc-yellow)"]]}
                            />
                        }
                    >
                        <div className="fi-pb-level" tabIndex={0}>
                            <div className="fi-pb-lh">Fractured Level</div>
                            <LevelBadge level={s.lvl} sym={symbolOf(s)} prefix={prefixOf(s)} size="md" />
                            <div className="fi-pb-bar"><i style={{ width: `${(into / FXP_PER_LEVEL) * 100}%`, backgroundColor: "var(--mc-yellow)" }} /></div>
                        </div>
                    </Tip>
                </header>

                <div className="fi-pb-grid">
                    {stats.map((x) => (
                        <Tile key={x.label} {...x} />
                    ))}
                </div>

                <div className="fi-pb-skills">
                    {SKILLS.map((k) => {
                        const lv = skillLevel(s[k.id], k.id);
                        return (
                            <Tip key={k.id} box tip={<TipCard title={`${k.name} ${lv}`} color={k.color} lines={[k.perk, `Earned by: ${k.earn}.`]} rows={[["Bonus now", k.bonus(lv), "var(--mc-green)"]]} />}>
                                <div className="fi-pb-skill" tabIndex={0} style={{ ["--c" as string]: k.color } as CSSProperties}>
                                    <span className="fi-pb-si"><McSymbol name={k.symbol} /></span>
                                    <span className="fi-pb-sn">{k.name}</span>
                                    <b>{lv}</b>
                                </div>
                            </Tip>
                        );
                    })}
                </div>

                <ul className="fi-pb-run">
                    {lines.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>

                {(owner || footer) && (
                    <footer className="fi-pb-foot">
                        {owner && <span>{owner}</span>}
                        {footer}
                    </footer>
                )}
            </section>
        </TipProvider>
    );
}

const BLOCK_CSS = `
.fi-pb{--tc:#aab0bd;--glow:0px;position:relative;isolation:isolate;overflow:hidden;border-radius:1.4rem;padding:1.1rem;border:1px solid color-mix(in oklch,var(--tc) 45%,transparent);background:radial-gradient(120% 90% at 0% 0%,color-mix(in oklch,var(--tc) 14%,transparent),transparent 60%),radial-gradient(90% 80% at 100% 100%,color-mix(in oklch,var(--tc) 9%,transparent),transparent 60%),color-mix(in oklch,var(--card) 70%,transparent);backdrop-filter:blur(14px);box-shadow:0 0 var(--glow) -6px var(--tc),0 18px 40px -26px rgba(0,0,0,.8);display:flex;flex-direction:column;gap:.9rem}
.fi-pb[data-tier="0"]{box-shadow:0 18px 40px -26px rgba(0,0,0,.8)}
.fi-pb>*{position:relative;z-index:1}
.fi-pb-deco{position:absolute!important;right:.6rem;top:.2rem;z-index:0!important;font-size:5.5rem;line-height:1;color:var(--tc);opacity:.12;transform:rotate(12deg);pointer-events:none;filter:drop-shadow(0 0 20px var(--tc))}
.fi-pb-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.8rem}
.fi-pb-logo{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:.8rem;font-size:1.3rem;color:var(--tc);background:color-mix(in oklch,var(--tc) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--tc) 40%,transparent),0 0 16px -4px var(--tc)}
.fi-pb-title{margin:0;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:1.15rem;line-height:1.1;color:var(--tc);text-shadow:0 0 14px color-mix(in oklch,var(--tc) 55%,transparent),0 2px 0 rgba(0,0,0,.5)}
.fi-pb-title-prism{background:linear-gradient(90deg,#ff5f9f,#ffd95f,#5fffb0,#5fe6ff,#b05fff,#ff5f9f);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fi-slide 4s linear infinite;text-shadow:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.5))}
.fi-pb-tier{display:inline-flex;align-items:center;gap:.3rem;margin-top:.25rem;padding:.05rem .55rem;border-radius:999px;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;color:var(--tc);border:1px solid color-mix(in oklch,var(--tc) 55%,transparent);background:color-mix(in oklch,var(--tc) 12%,transparent);cursor:help;outline:none}
.fi-pb-level{position:relative;display:flex;flex-direction:column;gap:.25rem;padding:.4rem .7rem;border-radius:.9rem;background:rgba(0,0,0,.22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);cursor:help;outline:none}
.fi-pb-lh{font-family:var(--font-minecraft,inherit);font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-pb-bar{height:.28rem;width:9rem;max-width:100%;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.1)}
.fi-pb-bar i{display:block;height:100%;border-radius:999px;box-shadow:0 0 8px var(--mc-yellow);transition:width .5s}
.fi-pb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.2rem,1fr));gap:.5rem}
.fi-pb-tile{--c:var(--mc-aqua);display:flex;align-items:center;gap:.55rem;min-width:0;padding:.5rem .6rem;border-radius:.85rem;background:color-mix(in oklch,var(--c) 7%,rgba(0,0,0,.2));border:1px solid color-mix(in oklch,var(--c) 22%,transparent);cursor:help;outline:none;transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s}
.fi-pb-tile:hover,.fi-pb-tile:focus-visible{transform:translateY(-2px);border-color:color-mix(in oklch,var(--c) 60%,transparent);box-shadow:0 8px 20px -12px var(--c)}
.fi-pb-ti{display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:.55rem;font-size:1rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 35%,transparent)}
.fi-pb-tl{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-pb-tv{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.9rem;color:var(--foreground)}
.fi-pb-skills{display:grid;grid-template-columns:repeat(auto-fit,minmax(6.6rem,1fr));gap:.4rem}
.fi-pb-skill{--c:var(--mc-green);display:flex;align-items:center;gap:.35rem;padding:.3rem .45rem;border-radius:.7rem;background:color-mix(in oklch,var(--c) 8%,transparent);border:1px solid color-mix(in oklch,var(--c) 26%,transparent);cursor:help;outline:none;transition:background .15s,transform .15s}
.fi-pb-skill:hover,.fi-pb-skill:focus-visible{background:color-mix(in oklch,var(--c) 18%,transparent);transform:translateY(-1px)}
.fi-pb-si{font-size:.9rem;color:var(--c)}
.fi-pb-sn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-pb-skill b{font-family:var(--font-minecraft,inherit);font-size:.85rem;color:var(--c);text-shadow:0 0 8px color-mix(in oklch,var(--c) 45%,transparent)}
.fi-pb-run{margin:0;padding:0 0 0 1.1rem;display:flex;flex-direction:column;gap:.2rem;font-family:var(--font-rubik,inherit);font-size:.7rem;color:var(--muted-foreground)}
.fi-pb-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem;border-top:1px dashed rgba(255,255,255,.12);padding-top:.5rem;font-family:var(--font-rubik,inherit);font-size:.65rem;color:var(--muted-foreground)}
@keyframes fi-slide{to{background-position:200% 0}}
@media (prefers-reduced-motion:reduce){.fi-pb-title-prism{animation:none}.fi-pb-tile,.fi-pb-skill{transition:none}}
`;

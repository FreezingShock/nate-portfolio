import { fmtPct } from "@/lib/fractured-idle/format";
import { McSymbol } from "@/components/mc-symbol";
import { fmt } from "@/lib/fractured-idle/format";
import { EGGS, PET_DIM_BY_ID, PET_LABEL, PET_MAX, PET_PERK_AT, PET_STAR_BONUS, PET_STAR_MAX, RARITIES, petLevel, petStatText, petStatValue, petXpFor, starMult, type PetDef } from "@/lib/fractured-idle/pets-data";

// The tooltip body for ANY pet, drawn the way SkyBlock draws pets: name and rarity, level, stars, the main stat
// (now, next level and at level 100), every perk with what it does and when it unlocks, the xp to the next level, and
// where it hatches from. It is a plain function component (no hooks), and callers hand it to <Tip> as a function, so
// nothing is built until the tooltip actually opens.

const stars = (n: number) => "★".repeat(Math.min(PET_STAR_MAX, Math.max(0, n - 1))) + "☆".repeat(Math.max(0, PET_STAR_MAX - Math.max(0, n - 1)));
const short = (n: number) => fmt(Math.floor(n));

export function PetTipBody({ p, owned, equipped, cta, slot }: { p: PetDef; owned?: { xp: number; n: number }; equipped?: boolean; cta?: string; slot?: number }) {
    const rar = RARITIES[p.rarity];
    const dim = PET_DIM_BY_ID[p.dim];
    const from = EGGS.filter((e) => e.dim === p.dim && e.odds[p.rarity]).map((e) => e.name);

    if (!owned) {
        return (
            <div className="fi-tp fi-pt">
                <div className="fi-tp-h">
                    <span className="tl" style={{ color: rar.color }}>???</span>
                    <em style={{ color: rar.color, borderColor: `color-mix(in oklch, ${rar.color} 55%, transparent)` }}>{rar.name}</em>
                </div>
                <div className="fi-pt-sub" style={{ color: dim.color }}><McSymbol name={dim.symbol} /> {dim.name} pet, not found yet</div>
                <div className="fi-pt-sec">Hatches from</div>
                <div className="fi-pt-line"><span>{from.join(", ") || "Any egg of its dimension"}</span></div>
                <div className="fi-tp-f">Its stats appear once you hatch it.</div>
            </div>
        );
    }

    const lv = petLevel(p, owned.xp);
    const m = starMult(owned.n);
    const now = (p.base + p.per * (lv - 1)) * m;
    const next = (p.base + p.per * lv) * m;
    const max = (p.base + p.per * (PET_MAX - 1)) * m;
    const maxed = lv >= PET_MAX;
    const lo = petXpFor(p, lv);
    const hi = petXpFor(p, lv + 1);
    const pct = maxed ? 100 : Math.max(0, Math.min(100, ((owned.xp - lo) / (hi - lo)) * 100));
    const starCount = Math.min(PET_STAR_MAX, owned.n - 1);

    return (
        <div className="fi-tp fi-pt">
            <div className="fi-tp-h">
                <span className="tl" style={{ color: p.color }}>
                    <McSymbol name={p.symbol} /> {p.name}
                </span>
                <em style={{ color: rar.color, borderColor: `color-mix(in oklch, ${rar.color} 55%, transparent)` }}>{rar.name}</em>
            </div>
            <div className="fi-pt-sub">
                <span style={{ color: dim.color }}><McSymbol name={dim.symbol} /> {dim.name}</span>
                <span>Lv {lv}{maxed ? " MAX" : ""}</span>
                {equipped && <span style={{ color: "var(--mc-green)" }}>{slot !== undefined ? `Slot ${slot + 1}` : "Equipped"}</span>}
            </div>
            <p className="fi-tp-p">{p.blurb}</p>

            <div className="fi-pt-stars" title={`${owned.n} found`}>
                <span style={{ color: "var(--mc-yellow)" }}>{stars(owned.n)}</span>
                <em>{starCount > 0 ? `+${fmtPct(starCount * PET_STAR_BONUS, 0)} to everything below` : `hatch duplicates: +${PET_STAR_BONUS * 100}% each`}</em>
            </div>

            <div className="fi-pt-sec">Main stat</div>
            <div className="fi-pt-main">
                <span>{PET_LABEL[p.stat]}</span>
                <b>{petStatValue(p.stat, now)}</b>
            </div>
            <div className="fi-pt-sub2">
                {!maxed && <span>Next level <i>{petStatValue(p.stat, next)}</i></span>}
                <span>Level {PET_MAX} <i>{petStatValue(p.stat, max)}</i></span>
            </div>

            <div className="fi-pt-sec">Perks</div>
            {p.perks.map((pk, i) => {
                const got = lv >= PET_PERK_AT[i];
                return (
                    <div key={pk.name} className="fi-pt-perk" data-got={got}>
                        <span className="fi-pt-mark">{got ? "✔" : "○"}</span>
                        <span className="fi-pt-pn">
                            <b style={got ? { color: p.color } : undefined}>{pk.name}</b>
                            <span>{petStatText(pk.stat, pk.value * m)}</span>
                        </span>
                        <em>{got ? "" : `Lv ${PET_PERK_AT[i]}`}</em>
                    </div>
                );
            })}

            <div className="fi-pt-xp">
                <div className="fi-pt-xp-t">
                    <span>{maxed ? "Max level" : `Progress to Level ${lv + 1}`}</span>
                    <b>{maxed ? "100%" : `${pct.toFixed(1)}%`}</b>
                </div>
                <div className="fi-pt-bar"><i style={{ width: `${pct}%`, background: p.color }} /></div>
                {!maxed && <div className="fi-pt-xp-n">{short(owned.xp - lo)} / {short(hi - lo)} xp</div>}
            </div>

            <div className="fi-tp-f">{owned.n} found · Hatches from {from.join(", ") || "its dimension's eggs"}</div>
            {cta && <div className="fi-tp-c">{cta}</div>}
        </div>
    );
}

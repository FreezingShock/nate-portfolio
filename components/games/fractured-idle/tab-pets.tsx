"use client";

import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import { Check, Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    EGGS,
    EGG_CUR,
    PETS,
    PET_BY_ID,
    PET_DIMS,
    PET_LABEL,
    PET_MAX,
    PET_SLOTS_MAX,
    RARITIES,
    RARITY_ORDER,
    petLevel,
    petStatValue,
    petXpFor,
    type EggDef,
    type PetDef,
    type PetDim,
    type PetStat,
    type Rarity,
    type State,
} from "@/lib/fractured-idle/data";
import { eggBalance, eggLocked, eggPrice, eggPriceInfo, eggsAffordable, equipBest, equipPetAt, feedCost, feedEquipped, feedPet, hatch, hatchMany, petBonds, petScore, petSlots, unequipPet, type HatchResult } from "@/lib/fractured-idle/engine";
import { PetTipBody } from "./pet-tip";
import { Tip, TipCard } from "./tooltip";
import { lift, tint, type Ctx } from "./ui";

// Pets. A header that is always there (collection, score, bonds, bonuses and the slots), then two views: Eggs (buy
// and hatch, up to three at once, each dimension paid in its own currency) and Collection (every pet by dimension
// and rarity). Pick a pet in the Collection to equip it, and choose which slot it goes into. Everything you could
// want to know about a pet is in its tooltip (the same SkyBlock-style card everywhere), so there is no separate page.
// Tooltips are built only when they open, and each collection tile re-renders only when its own numbers change.

const C = "var(--mc-dark-aqua)";
const clamp01 = (n: number) => Math.max(0, Math.min(1, isFinite(n) ? n : 0));
type View = "eggs" | "collection";

function XpBar({ p, xp, color }: { p: PetDef; xp: number; color: string }) {
    const lv = petLevel(p, xp);
    const lo = petXpFor(p, lv);
    const hi = petXpFor(p, lv + 1);
    const f = lv >= PET_MAX ? 1 : clamp01((xp - lo) / (hi - lo));
    return (
        <div className="pt-xp">
            <i style={{ width: `${f * 100}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        </div>
    );
}

const stars = (n: number) => (n <= 1 ? "" : "★".repeat(Math.min(5, n - 1)) + (n - 1 > 5 ? "+" : ""));

const PetTile = memo(function PetTile({ p, own, lv, n, on, sel, s, onPick }: { p: PetDef; own: boolean; lv: number; n: number; on: boolean; sel: boolean; s: State; onPick: (id: string) => void }) {
    const rar = RARITIES[p.rarity];
    return (
        <Tip box tip={() => <PetTipBody p={p} owned={s.pets[p.id]} equipped={s.equip.includes(p.id)} slot={s.equip.indexOf(p.id)} cta={own ? "Click to select!" : undefined} />}>
            <button type="button" onClick={() => own && onPick(p.id)} className="pt-tile" data-own={own} data-on={on} data-sel={sel} aria-label={own ? p.name : "Undiscovered pet"} style={{ ["--rc" as string]: rar.color, ["--c" as string]: own ? p.color : "var(--muted-foreground)" } as CSSProperties}>
                <span className="pt-tile-i"><McSymbol name={p.symbol} /></span>
                {own && <span className="pt-tile-lv">{lv}</span>}
                {own && n > 1 && <span className="pt-tile-st">{stars(n)}</span>}
                {on && <span className="pt-tile-eq"><Check className="size-3" /></span>}
            </button>
        </Tip>
    );
});

function EggCost({ s, e, F }: { s: State; e: EggDef; F: (n: number) => string }) {
    const cur = EGG_CUR[e.cur];
    const info = eggPriceInfo(s, e);
    const bal = eggBalance(s, e.cur);
    const rows: [string, string, string?][] = [
        ["You have", `${F(bal)} ${cur.one}${bal === 1 ? "" : "s"}`, bal >= info.price ? "var(--mc-green)" : "var(--mc-red)"],
        e.cur === "shards"
            ? ["Base", info.flooredBy ? `${F(info.floor)} (minimum)` : `${+(info.secs / 60).toFixed(0)} min of your best income = ${F(info.income)}`]
            : ["Base price", `${F(info.base)} ${cur.one}s`],
        ["Eggs hatched", `x${info.growth.toFixed(2)} (${info.hatched} so far${info.capped ? ", capped" : ""})`, info.growth > 1.01 ? "var(--mc-gold)" : undefined],
        ["Egg Fluency", info.nest ? `-${Math.round((1 - info.disc) * 100)}% (level ${info.nest})` : "none (Ascension gem upgrade)", info.nest ? "var(--mc-green)" : undefined],
        ["Price now", `${F(info.price)} ${cur.one}${info.price === 1 ? "" : "s"}`, cur.color],
    ];
    return <TipCard title={e.name} color={e.color} tag={cur.name} lines={cur.how} rows={rows} foot={e.cur === "shards" ? "Shard prices follow the best income you have ever reached." : "Prices rise a little with every egg you hatch."} />;
}

export function PetsTab({ s, d, F, act, say, eggFx }: Ctx) {
    const slots = petSlots(s);
    const owned = PETS.filter((p) => s.pets[p.id]);
    const [view, setView] = useState<View>("eggs");
    const [sel, setSel] = useState<string | null>(null);
    const [target, setTarget] = useState<number | null>(null);
    const [fDim, setFDim] = useState<PetDim | "all">("all");
    const [fRar, setFRar] = useState<Rarity | "all">("all");
    const [onlyOwned, setOnlyOwned] = useState(false);

    const score = petScore(s);
    const bonds = petBonds(s);
    const bonusChips = (Object.keys(d.pet) as PetStat[]).filter((k) => d.pet[k] > 0);
    const feedAllCost = feedCost(s) * s.equip.filter((id) => PET_BY_ID.get(id) && petLevel(PET_BY_ID.get(id)!, s.pets[id]?.xp ?? 0) < PET_MAX).length;

    const pick = useCallback(
        (id: string) => {
            if (target !== null) {
                act(() => equipPetAt(s, id, target), "equip");
                say(`${PET_BY_ID.get(id)?.name} equipped to slot ${target + 1}.`);
                setTarget(null);
            }
            setSel(id);
        },
        [act, say, s, target],
    );

    const open = (egg: EggDef, n: number, free = false) => {
        let res: HatchResult[] = [];
        act(() => {
            if (free) {
                for (let i = 0; i < n; i++) {
                    const r = hatch(s, "wood", true);
                    if (!r) break;
                    res.push(r);
                }
            } else res = hatchMany(s, egg.id, n);
            return res.length > 0;
        });
        if (!res.length) return;
        if (eggFx) eggFx(egg, res);
        else say(`Hatched ${res.map((r) => PET_BY_ID.get(r.id)?.name).join(", ")}`);
    };

    /** Open a big stack in one go: no reveal, just a summary of what came out. */
    const openAll = (egg: EggDef, free = false) => {
        const res: HatchResult[] = [];
        act(() => {
            const n = free ? s.freeEggs : 500;
            for (let i = 0; i < n; i++) {
                const r = free ? hatch(s, "wood", true) : hatch(s, egg.id, false);
                if (!r) break;
                res.push(r);
            }
            return res.length > 0;
        });
        if (!res.length) return;
        if (eggFx) eggFx(egg, res);
        else say(`Opened ${res.length} eggs`);
    };

    const shown = useMemo(
        () => PETS.filter((p) => (fDim === "all" || p.dim === fDim) && (fRar === "all" || p.rarity === fRar) && (!onlyOwned || s.pets[p.id])).sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.name.localeCompare(b.name)),
        [fDim, fRar, onlyOwned, s.pets, owned.length], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const selP = sel ? PET_BY_ID.get(sel) : undefined;
    const selSt = sel ? s.pets[sel] : undefined;
    const selSlot = sel ? s.equip.indexOf(sel) : -1;

    return (
        <div className="pt" style={{ ["--pc" as string]: C } as CSSProperties}>
            {/* ---- header: summary, bonuses ---- */}
            <div className="pt-head">
                <div className="pt-head-top">
                    <span className="pt-title"><McSymbol name="petLuck" /> Pets</span>
                    <Tip tip={<TipCard title="Collection" color={C} lines={["Every species you find adds to all shards, more for rarer ones, whether it is equipped or not."]} rows={[["Found", `${owned.length} / ${PETS.length}`], ["Score bonus", `+${(score * 100).toFixed(1)}% all shards`, "var(--mc-green)"], ["Eggs hatched", String(s.hatched)]]} />}>
                        <span className="pt-chip" tabIndex={0}>{owned.length}/{PETS.length} found</span>
                    </Tip>
                    <Tip tip={<TipCard title="Collection score" color="var(--mc-green)" lines={["+0.5% for a Common up to +7% for a Divine, per species you own."]} />}>
                        <span className="pt-chip" tabIndex={0} style={{ ["--c" as string]: "var(--mc-green)" } as CSSProperties}>+{(score * 100).toFixed(1)}% score</span>
                    </Tip>
                    {bonds.list.map((b) => (
                        <Tip key={b.label} tip={<TipCard title={b.label} color={b.color} lines={["Equip pets from the same dimension together for a bonus. Three different dimensions make a Traveler bond."]} rows={[["Pets", String(b.n)], ["Bonus", `+${Math.round(b.bonus * 100)}% all shards`, "var(--mc-green)"]]} />}>
                            <span className="pt-chip" tabIndex={0} style={{ ["--c" as string]: b.color } as CSSProperties}><McSymbol name="heartS" /> {b.label} +{Math.round(b.bonus * 100)}%</span>
                        </Tip>
                    ))}
                    <span className="flex-1" />
                    <Tip tip={<TipCard title="Equip best" color="var(--mc-green)" lines={["Fills every slot with your strongest pets: rarity first, then level, then stars."]} cta="Click to equip!" />}>
                        <button type="button" className="pt-btn" onClick={() => act(() => equipBest(s), "equip")}>Equip best</button>
                    </Tip>
                    <Tip tip={<TipCard title="Feed equipped" color="var(--mc-yellow)" lines={["Gives every equipped pet 30% of the xp its level needs."]} rows={[["Cost", `${F(feedAllCost)} shards`, s.shards >= feedAllCost ? "var(--mc-yellow)" : "var(--mc-red)"]]} cta={feedAllCost > 0 && s.shards >= feedAllCost ? "Click to feed!" : undefined} ctaDim={s.shards < feedAllCost} />}>
                        <button type="button" className="pt-btn" disabled={feedAllCost <= 0 || s.shards < feedAllCost} onClick={() => act(() => feedEquipped(s) > 0)}>Feed all</button>
                    </Tip>
                </div>
                <div className="pt-bonus">
                    {bonusChips.length ? (
                        bonusChips.map((k) => (
                            <span key={k}><b>{petStatValue(k, d.pet[k])}</b> {PET_LABEL[k]}</span>
                        ))
                    ) : (
                        <span className="text-muted-foreground">No bonuses yet. Hatch an egg and your pet goes straight into a free slot.</span>
                    )}
                </div>
            </div>

            {/* ---- slots ---- */}
            <div className="pt-slots">
                {Array.from({ length: PET_SLOTS_MAX }, (_, i) => {
                    const id = s.equip[i];
                    const p = id ? PET_BY_ID.get(id) : undefined;
                    const st = id ? s.pets[id] : undefined;
                    if (i >= slots) {
                        return (
                            <Tip key={i} box tip={<TipCard title={`Slot ${i + 1}`} color="var(--mc-gold)" lines={[`Unlock it with the ${["", "Second", "Third", "Fourth"][i]} Perch gem upgrade in Ascension.`]} />}>
                                <div className="pt-slot" data-state="locked"><Lock className="size-4 shrink-0" /><span>Slot {i + 1}<em>Ascension gems</em></span></div>
                            </Tip>
                        );
                    }
                    if (!p || !st) {
                        return (
                            <Tip key={i} box tip={<TipCard title={`Slot ${i + 1} is empty`} color={C} lines={["Click it, then pick a pet in the Collection to put it here."]} cta="Click to choose a pet!" />}>
                                <button type="button" className="pt-slot" data-state="empty" data-target={target === i} onClick={() => { setTarget(i); setView("collection"); }}>
                                    <span className="pt-plus">+</span><span>Slot {i + 1}<em>Empty</em></span>
                                </button>
                            </Tip>
                        );
                    }
                    const rar = RARITIES[p.rarity];
                    const lv = petLevel(p, st.xp);
                    return (
                        <Tip key={i} box tip={() => <PetTipBody p={p} owned={s.pets[p.id]} equipped slot={i} cta="Click to manage!" />}>
                            <button type="button" onClick={() => { setSel(p.id); setTarget(null); setView("collection"); }} className="pt-slot" data-state="on" data-target={target === i} style={{ ["--rc" as string]: rar.color, ["--c" as string]: p.color } as CSSProperties}>
                                <span className="pt-ic"><McSymbol name={p.symbol} /></span>
                                <span className="min-w-0 flex-1 text-left">
                                    <span className="pt-nm" style={{ color: lift(rar.color) }}>{p.name}</span>
                                    <span className="pt-lv">Lv {lv}{lv >= PET_MAX ? " MAX" : ""} <em>{stars(st.n)}</em></span>
                                    <XpBar p={p} xp={st.xp} color={p.color} />
                                </span>
                            </button>
                        </Tip>
                    );
                })}
            </div>

            {/* ---- view switch ---- */}
            <div className="pt-tabs" role="tablist" aria-label="Pet views">
                {([["eggs", "Eggs", "flower"], ["collection", "Collection", "petLuck"]] as const).map(([id, label, sym]) => (
                    <button key={id} type="button" role="tab" aria-selected={view === id} data-on={view === id} onClick={() => setView(id)}>
                        <McSymbol name={sym} /> {label}
                    </button>
                ))}
            </div>

            {view === "eggs" && (
                <>
                    {s.freeEggs > 0 && (
                        <div className="pt-free fi-afford" style={{ ["--c" as string]: "var(--mc-gold)" } as CSSProperties}>
                            <McSymbol name="flower" />
                            <span className="pt-free-n">Free Wooden Egg x{s.freeEggs}</span>
                            <span className="flex-1 text-[11px] text-muted-foreground">Found by a treasure bobber.</span>
                            <button type="button" className="pt-hatch" onClick={() => open(EGGS[0], 1, true)}>Hatch</button>
                            {s.freeEggs >= 3 && <button type="button" className="pt-hatch" onClick={() => open(EGGS[0], 3, true)}>x3</button>}
                            {s.freeEggs > 3 && <button type="button" className="pt-hatch" onClick={() => openAll(EGGS[0], true)}>Open all ({s.freeEggs})</button>}
                        </div>
                    )}
                    {PET_DIMS.map((dim) => {
                        const list = EGGS.filter((e) => e.dim === dim.id);
                        const have = PETS.filter((p) => p.dim === dim.id && s.pets[p.id]).length;
                        const all = PETS.filter((p) => p.dim === dim.id).length;
                        return (
                            <section key={dim.id} className="pt-dim" style={{ ["--dc" as string]: dim.color } as CSSProperties}>
                                <div className="pt-dim-h">
                                    <span className="pt-dim-i"><McSymbol name={dim.symbol} /></span>
                                    <span className="pt-dim-n">{dim.name}</span>
                                    <span className="pt-dim-s">{dim.blurb}</span>
                                    <span className="pt-dim-c">{have}/{all}</span>
                                </div>
                                <div className="pt-eggs">
                                    {list.map((e) => {
                                        const price = eggPrice(s, e);
                                        const lock = eggLocked(s, e);
                                        const bal = eggBalance(s, e.cur);
                                        const can = !lock && bal >= price;
                                        const affAll = eggsAffordable(s, e, 500);
                                        const aff = Math.min(3, affAll);
                                        const cur = EGG_CUR[e.cur];
                                        const total = RARITY_ORDER.reduce((a, r) => a + (e.odds[r] || 0), 0);
                                        const rarities = RARITY_ORDER.filter((r) => e.odds[r]);
                                        const pool = PETS.filter((p) => p.dim === e.dim && e.odds[p.rarity]);
                                        const got = pool.filter((p) => s.pets[p.id]).length;
                                        return (
                                            <div key={e.id} className="pt-egg" data-lock={!!lock} data-can={can} style={{ ["--ec" as string]: e.color } as CSSProperties}>
                                                <Tip box tip={() => <TipCard title={e.name} color={e.color} tag={dim.name} lines={[e.blurb]} rows={[...rarities.map((r): [string, string, string?] => [RARITIES[r].name, `${+(((e.odds[r] || 0) / total) * 100).toFixed(1)}%`, RARITIES[r].color]), ["Pets in this pool", `${got} / ${pool.length} found`]]} notes={lock ? [{ text: lock, color: "var(--mc-gold)" }] : undefined} />}>
                                                    <div className="pt-egg-h">
                                                        <span className="pt-egg-i"><McSymbol name={lock ? "check" : e.symbol} /></span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="pt-egg-n">{e.name}</span>
                                                            <span className="pt-egg-b">{lock ?? e.blurb}</span>
                                                        </span>
                                                    </div>
                                                </Tip>
                                                <div className="pt-odds">
                                                    {rarities.map((r) => (
                                                        <i key={r} style={{ width: `${((e.odds[r] || 0) / total) * 100}%`, backgroundColor: RARITIES[r].color }} />
                                                    ))}
                                                </div>
                                                <div className="pt-odds-l">
                                                    {rarities.map((r) => (
                                                        <span key={r} style={{ color: lift(RARITIES[r].color) }}>{RARITIES[r].name} {+(((e.odds[r] || 0) / total) * 100).toFixed(1)}%</span>
                                                    ))}
                                                </div>
                                                <div className="pt-buy">
                                                    <Tip tip={() => <EggCost s={s} e={e} F={F} />}>
                                                        <span className="pt-price" tabIndex={0} style={{ color: can ? cur.color : undefined }}>
                                                            <McSymbol name={cur.symbol} /> {F(price)}
                                                        </span>
                                                    </Tip>
                                                    <button type="button" className="pt-hatch" disabled={!can} onClick={() => open(e, 1)}>Hatch</button>
                                                    <Tip tip={<TipCard title="Hatch three" color={e.color} lines={["Opens three eggs at once on one screen."]} rows={[["Total", `${F(price * 3)} ${cur.one}s`], ["You can afford", `${aff} egg${aff === 1 ? "" : "s"}`]]} />}>
                                                        <button type="button" className="pt-hatch" disabled={aff < 3} onClick={() => open(e, 3)}>x3</button>
                                                    </Tip>
                                                    {affAll > 3 && (
                                                        <Tip tip={<TipCard title="Open all" color={e.color} lines={["Hatches every egg you can pay for with no animation, then shows what you got."]} rows={[["About", `${affAll >= 500 ? "500+" : affAll} egg${affAll === 1 ? "" : "s"}`], ["Stops", "when you run out or at 500"]]} />}>
                                                            <button type="button" className="pt-hatch" onClick={() => openAll(e)}>Open all</button>
                                                        </Tip>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                    <p className="pt-note">Each egg only hatches pets from its own dimension. Hover a price to see what it costs and where to get that currency. Prices rise a little with every egg you open.</p>
                </>
            )}

            {view === "collection" && (
                <>
                    {target !== null && (
                        <div className="pt-target">
                            <McSymbol name="arrow" /> Pick a pet for <b>slot {target + 1}</b>
                            <button type="button" onClick={() => setTarget(null)}>Cancel</button>
                        </div>
                    )}

                    {selP && selSt && (
                        <div className="pt-sel" style={{ ["--rc" as string]: RARITIES[selP.rarity].color, ["--c" as string]: selP.color } as CSSProperties}>
                            <Tip box tip={() => <PetTipBody p={selP} owned={s.pets[selP.id]} equipped={s.equip.includes(selP.id)} slot={s.equip.indexOf(selP.id)} />}>
                                <div className="pt-sel-who">
                                    <span className="pt-ic"><McSymbol name={selP.symbol} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="pt-nm" style={{ color: lift(RARITIES[selP.rarity].color) }}>{selP.name}</span>
                                        <span className="pt-lv">Lv {petLevel(selP, selSt.xp)} <em>{stars(selSt.n)}</em> · hover for everything</span>
                                        <XpBar p={selP} xp={selSt.xp} color={selP.color} />
                                    </span>
                                </div>
                            </Tip>
                            <div className="pt-sel-act">
                                <span className="pt-sel-l">Equip to slot</span>
                                <div className="pt-sel-slots">
                                    {Array.from({ length: slots }, (_, i) => {
                                        const occ = s.equip[i] ? PET_BY_ID.get(s.equip[i]) : undefined;
                                        return (
                                            <Tip key={i} tip={<TipCard title={`Slot ${i + 1}`} color={C} lines={[occ ? (selSlot === i ? `${selP.name} is already here.` : `${occ.name} is here. ${selSlot >= 0 ? "You will swap places." : "It will be replaced."}`) : "Empty."]} cta={selSlot === i ? undefined : "Click to equip here!"} ctaDim={selSlot === i} />}>
                                                <button type="button" data-cur={selSlot === i} onClick={() => act(() => equipPetAt(s, selP.id, i), "equip")} aria-label={`Equip to slot ${i + 1}`}>
                                                    <b>{i + 1}</b>
                                                    <span style={{ color: occ?.color }}>{occ ? <McSymbol name={occ.symbol} /> : "+"}</span>
                                                </button>
                                            </Tip>
                                        );
                                    })}
                                </div>
                                {selSlot >= 0 && (
                                    <button type="button" className="pt-btn" onClick={() => act(() => unequipPet(s, selP.id), "close")}>Unequip</button>
                                )}
                                {petLevel(selP, selSt.xp) < PET_MAX && (
                                    <Tip tip={<TipCard title="Feed" color="var(--mc-yellow)" lines={["Spend shards to give this pet 30% of the xp its current level needs."]} rows={[["Cost", `${F(feedCost(s))} shards`]]} />}>
                                        <button type="button" className="pt-btn" disabled={s.shards < feedCost(s)} onClick={() => act(() => feedPet(s, selP.id))}>Feed {F(feedCost(s))}</button>
                                    </Tip>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-filters">
                        <div className="pt-chipset">
                            <button type="button" data-on={fDim === "all"} onClick={() => setFDim("all")}>All dimensions</button>
                            {PET_DIMS.map((dm) => (
                                <button key={dm.id} type="button" data-on={fDim === dm.id} onClick={() => setFDim(dm.id)} style={{ ["--c" as string]: dm.color } as CSSProperties}>
                                    <McSymbol name={dm.symbol} /> {dm.name}
                                </button>
                            ))}
                        </div>
                        <div className="pt-chipset">
                            <button type="button" data-on={fRar === "all"} onClick={() => setFRar("all")}>All rarities</button>
                            {RARITY_ORDER.map((r) => (
                                <button key={r} type="button" data-on={fRar === r} onClick={() => setFRar(r)} style={{ ["--c" as string]: RARITIES[r].color } as CSSProperties}>
                                    {RARITIES[r].name}
                                </button>
                            ))}
                            <label className="pt-own"><input type="checkbox" checked={onlyOwned} onChange={(e) => setOnlyOwned(e.target.checked)} /> Owned only</label>
                        </div>
                    </div>
                    <div className="pt-grid">
                        {shown.map((p) => {
                            const st = s.pets[p.id];
                            return <PetTile key={p.id} p={p} own={!!st} lv={st ? petLevel(p, st.xp) : 0} n={st?.n ?? 0} on={s.equip.includes(p.id)} sel={sel === p.id} s={s} onPick={pick} />;
                        })}
                    </div>
                    {shown.length === 0 && <p className="pt-note">No pets match those filters.</p>}
                </>
            )}
        </div>
    );
}

export const PET_CSS = `
.pt{--pc:var(--mc-dark-aqua);display:flex;flex-direction:column;gap:.7rem}
.pt-head{padding:.7rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--pc) 45%,transparent);background:linear-gradient(130deg,color-mix(in oklch,var(--pc) 12%,transparent),transparent 70%)}
.pt-head-top{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.pt-title{display:inline-flex;align-items:center;gap:.4rem;margin-right:.3rem;font-family:var(--font-minecraft,inherit);font-size:.95rem;font-weight:700;color:color-mix(in oklch,var(--pc) 68%,#fff)}
.pt-chip{--c:var(--pc);display:inline-flex;align-items:center;gap:.3rem;padding:.08rem .6rem;border-radius:999px;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--c);border:1px solid color-mix(in oklch,var(--c) 50%,transparent);background:color-mix(in oklch,var(--c) 10%,rgba(0,0,0,.25));cursor:help;outline:none}
.pt-btn{display:inline-flex;align-items:center;justify-content:center;height:1.9rem;padding:0 .8rem;border-radius:.65rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--foreground);border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);transition:background .15s,transform .12s,opacity .15s,border-color .15s;outline:none}
.pt-btn:hover:not(:disabled){background:rgba(255,255,255,.12);transform:translateY(-1px)}
.pt-btn:active:not(:disabled){transform:scale(.95)}
.pt-btn:disabled{opacity:.4;cursor:not-allowed}
.pt-bonus{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.pt-bonus span{padding:.05rem .5rem;border-radius:.5rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
.pt-bonus b{font-weight:600;color:var(--mc-green)}
.pt-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.5rem}
.pt-slot{--rc:var(--pc);--c:var(--pc);display:flex;align-items:center;gap:.6rem;width:100%;min-height:3.6rem;padding:.5rem .6rem;border-radius:.9rem;border:1px dashed rgba(255,255,255,.2);font-family:var(--font-rubik,inherit);font-size:.7rem;color:var(--muted-foreground);transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .2s,border-color .15s;outline:none;text-align:left}
.pt-slot em{display:block;font-style:normal;font-size:.6rem;opacity:.7}
.pt-slot[data-state="locked"]{opacity:.55}
.pt-slot[data-state="empty"]{cursor:pointer}
.pt-slot[data-state="empty"]:hover{border-color:var(--pc);color:var(--foreground)}
.pt-slot[data-state="on"]{border:1px solid color-mix(in oklch,var(--rc) 65%,transparent);background:color-mix(in oklch,var(--rc) 9%,rgba(0,0,0,.25));box-shadow:0 0 18px -8px var(--rc);cursor:pointer;color:inherit}
.pt-slot[data-state="on"]:hover,.pt-slot[data-state="on"]:focus-visible{transform:translateY(-2px);box-shadow:0 10px 24px -12px var(--rc)}
.pt-slot[data-target="true"]{border-color:var(--mc-yellow);box-shadow:0 0 0 1px var(--mc-yellow),0 0 18px -6px var(--mc-yellow)}
.pt-plus{display:grid;place-items:center;width:2.2rem;height:2.2rem;border-radius:.65rem;border:1px dashed rgba(255,255,255,.25);font-size:1rem}
.pt-ic{display:grid;place-items:center;flex:none;width:2.4rem;height:2.4rem;border-radius:.7rem;font-size:1.3rem;color:var(--c);background:color-mix(in oklch,var(--c) 17%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 45%,transparent),0 0 14px -6px var(--c);animation:pt-bob 3.2s ease-in-out infinite}
@keyframes pt-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.pt-nm{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-minecraft,inherit);font-size:.74rem;font-weight:700}
.pt-lv{display:block;font-size:.62rem;color:var(--muted-foreground)}
.pt-lv em{font-style:normal;color:var(--mc-yellow)}
.pt-xp{height:.28rem;margin-top:.2rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.pt-xp i{display:block;height:100%;border-radius:999px;transition:width .3s linear}
.pt-tabs{display:flex;gap:.3rem;padding:.25rem;border-radius:.9rem;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08)}
.pt-tabs button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;height:2rem;border-radius:.65rem;font-family:var(--font-minecraft,inherit);font-size:.7rem;font-weight:700;color:var(--muted-foreground);transition:background .15s,color .15s,box-shadow .15s;outline:none}
.pt-tabs button:hover{color:var(--foreground);background:rgba(255,255,255,.06)}
.pt-tabs button[data-on="true"]{color:color-mix(in oklch,var(--pc) 68%,#fff);background:color-mix(in oklch,var(--pc) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--pc) 55%,transparent)}
.pt-free{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;padding:.55rem .75rem;border-radius:.9rem;border:1px solid var(--mc-gold);background:color-mix(in oklch,var(--mc-gold) 12%,transparent)}
.pt-free-n{font-family:var(--font-minecraft,inherit);font-size:.76rem;font-weight:700;color:var(--mc-gold)}
.pt-dim{--dc:var(--mc-green);padding:.6rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--dc) 28%,transparent);background:color-mix(in oklch,var(--dc) 5%,rgba(0,0,0,.18))}
.pt-dim-h{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:.5rem}
.pt-dim-i{display:grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:.55rem;font-size:1rem;color:var(--dc);background:color-mix(in oklch,var(--dc) 18%,transparent)}
.pt-dim-n{font-family:var(--font-minecraft,inherit);font-size:.8rem;font-weight:700;color:var(--dc)}
.pt-dim-s{flex:1;min-width:8rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.pt-dim-c{font-family:var(--font-minecraft,inherit);font-size:.7rem;color:var(--dc)}
.pt-eggs{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.5rem}
.pt-egg{--ec:var(--mc-gold);display:flex;flex-direction:column;gap:.4rem;padding:.6rem;border-radius:.9rem;border:1px solid color-mix(in oklch,var(--ec) 30%,transparent);background:color-mix(in oklch,var(--ec) 6%,rgba(0,0,0,.2));transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s}
.pt-egg[data-can="true"]{border-color:color-mix(in oklch,var(--ec) 65%,transparent);box-shadow:0 0 18px -10px var(--ec)}
.pt-egg[data-lock="true"]{opacity:.55;filter:grayscale(.6)}
.pt-egg-h{display:flex;align-items:center;gap:.6rem;cursor:help}
.pt-egg-i{display:grid;place-items:center;flex:none;width:2.4rem;height:2.9rem;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;font-size:1.2rem;color:rgba(0,0,0,.55);background:linear-gradient(160deg,color-mix(in oklch,var(--ec) 78%,#fff),var(--ec) 55%,color-mix(in oklch,var(--ec) 45%,#000));box-shadow:0 0 14px -4px var(--ec),inset 0 -4px 8px rgba(0,0,0,.3)}
.pt-egg[data-can="true"] .pt-egg-i{animation:pt-wob 2.4s ease-in-out infinite}
@keyframes pt-wob{0%,100%{transform:rotate(0)}8%{transform:rotate(-6deg)}16%{transform:rotate(6deg)}24%{transform:rotate(0)}}
.pt-egg-n{display:block;font-family:var(--font-minecraft,inherit);font-size:.76rem;font-weight:700;color:color-mix(in oklch,var(--ec) 70%,#fff)}
.pt-egg-b{display:block;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.pt-odds{display:flex;height:.4rem;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.1)}
.pt-odds i{display:block;height:100%}
.pt-odds-l{display:flex;flex-wrap:wrap;gap:.1rem .5rem;font-family:var(--font-rubik,inherit);font-size:.56rem}
.pt-buy{display:flex;align-items:center;gap:.4rem;margin-top:.1rem}
.pt-price{display:inline-flex;align-items:center;gap:.3rem;flex:1;font-family:var(--font-minecraft,inherit);font-size:.85rem;color:var(--muted-foreground);cursor:help;outline:none}
.pt-price:hover{filter:brightness(1.3)}
.pt-hatch{height:1.9rem;padding:0 .8rem;border-radius:.65rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;letter-spacing:.04em;color:color-mix(in oklch,var(--ec,var(--mc-gold)) 70%,#fff);border:1px solid color-mix(in oklch,var(--ec,var(--mc-gold)) 70%,transparent);background:color-mix(in oklch,var(--ec,var(--mc-gold)) 20%,transparent);transition:filter .15s,transform .12s,opacity .15s}
.pt-hatch:hover:not(:disabled){filter:brightness(1.25);transform:translateY(-1px)}
.pt-hatch:active:not(:disabled){transform:scale(.94)}
.pt-hatch:disabled{opacity:.4;cursor:not-allowed}
.pt-note{margin:0;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.pt-target{display:flex;align-items:center;gap:.5rem;padding:.45rem .7rem;border-radius:.8rem;border:1px solid var(--mc-yellow);background:color-mix(in oklch,var(--mc-yellow) 10%,transparent);font-family:var(--font-rubik,inherit);font-size:.72rem;color:var(--mc-yellow)}
.pt-target b{font-family:var(--font-minecraft,inherit)}
.pt-target button{margin-left:auto;font-size:.66rem;color:var(--muted-foreground);text-decoration:underline}
.pt-sel{display:flex;flex-wrap:wrap;align-items:center;gap:.7rem;padding:.6rem .7rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--rc) 55%,transparent);background:linear-gradient(130deg,color-mix(in oklch,var(--rc) 9%,transparent),transparent 70%)}
.pt-sel-who{display:flex;align-items:center;gap:.6rem;min-width:11rem;flex:1;cursor:help}
.pt-sel-act{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.pt-sel-l{font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground)}
.pt-sel-slots{display:flex;gap:.3rem}
.pt-sel-slots button{display:flex;align-items:center;gap:.3rem;height:2rem;padding:0 .55rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.04);font-size:1rem;transition:background .15s,transform .12s,border-color .15s;outline:none}
.pt-sel-slots button b{font-family:var(--font-minecraft,inherit);font-size:.66rem;color:var(--muted-foreground)}
.pt-sel-slots button:hover{background:rgba(255,255,255,.12);transform:translateY(-1px)}
.pt-sel-slots button[data-cur="true"]{border-color:var(--mc-green);background:color-mix(in oklch,var(--mc-green) 16%,transparent);box-shadow:0 0 12px -4px var(--mc-green)}
.pt-filters{display:flex;flex-direction:column;gap:.4rem}
.pt-chipset{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem}
.pt-chipset button{--c:var(--pc);display:inline-flex;align-items:center;gap:.3rem;height:1.7rem;padding:0 .6rem;border-radius:.6rem;font-family:var(--font-minecraft,inherit);font-size:.62rem;font-weight:700;color:var(--muted-foreground);background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transition:background .15s,color .15s,box-shadow .15s;outline:none}
.pt-chipset button:hover{color:var(--foreground)}
.pt-chipset button[data-on="true"]{color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 55%,transparent)}
.pt-own{display:inline-flex;align-items:center;gap:.3rem;margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground);cursor:pointer}
.pt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(4.4rem,1fr));gap:.4rem}
.pt-tile{--rc:#fff;--c:#fff;position:relative;display:grid;place-items:center;width:100%;aspect-ratio:1;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--rc) 50%,transparent);background:color-mix(in oklch,var(--rc) 9%,rgba(0,0,0,.22));color:var(--c);font-size:1.7rem;transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .2s,border-color .15s;outline:none;contain:layout paint}
.pt-tile[data-own="false"]{color:rgba(255,255,255,.16);border-color:color-mix(in oklch,var(--rc) 28%,transparent);background:rgba(255,255,255,.02);cursor:default}
.pt-tile[data-own="true"]:hover,.pt-tile[data-own="true"]:focus-visible{transform:translateY(-3px) rotate(-1.5deg);box-shadow:0 10px 22px -12px var(--rc)}
.pt-tile[data-on="true"]{border-color:var(--mc-green);box-shadow:0 0 0 1px var(--mc-green),0 0 14px -4px var(--mc-green)}
.pt-tile[data-sel="true"]{box-shadow:0 0 0 2px #fff}
.pt-tile-lv{position:absolute;right:.3rem;bottom:.15rem;font-family:var(--font-minecraft,inherit);font-size:.58rem;color:#fff}
.pt-tile-st{position:absolute;left:.3rem;bottom:.15rem;font-size:.5rem;color:var(--mc-yellow);letter-spacing:-.05em}
.pt-tile-eq{position:absolute;left:.25rem;top:.2rem;color:var(--mc-green)}
@media (prefers-reduced-motion:reduce){.pt-ic,.pt-egg[data-can="true"] .pt-egg-i{animation:none}.pt-tile,.pt-slot,.pt-egg{transition:none}}
`;

"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    EGGS,
    EGG_CUR,
    PETS,
    PET_BY_ID,
    PET_DIMS,
    PET_DIM_BY_ID,
    PET_LABEL,
    PET_MAX,
    PET_PERK_AT,
    PET_SLOTS_MAX,
    PET_STAR_BONUS,
    PET_STAR_MAX,
    RARITIES,
    RARITY_ORDER,
    petLevel,
    petStatText,
    petStatValue,
    petXpFor,
    starMult,
    type EggDef,
    type PetDef,
    type PetDim,
    type PetStat,
    type Rarity,
} from "@/lib/fractured-idle/data";
import { eggBalance, eggLocked, eggPrice, eggsAffordable, equipBest, equipPet, feedCost, feedEquipped, feedPet, hatch, hatchMany, petBonds, petScore, petSlots, unequipPet, type HatchResult } from "@/lib/fractured-idle/engine";
import { Tip, TipCard } from "./tooltip";
import { lift, tint, type Ctx } from "./ui";

// Pets. A header that is always there (collection, score, bonds, active bonuses and the four slots), then three
// views: Eggs (buy and hatch, up to three at once, each dimension paid in its own currency), Collection (every
// pet by dimension and rarity, with what is missing and where to find it) and Details (one pet: stars, level,
// perks, feeding). Hover anything for the full story.

const C = "var(--mc-dark-aqua)";
const clamp01 = (n: number) => Math.max(0, Math.min(1, isFinite(n) ? n : 0));
type View = "eggs" | "collection" | "details";

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
const eggsFor = (p: PetDef) => EGGS.filter((e) => e.dim === p.dim && e.odds[p.rarity]);

function petTip(p: PetDef, owned: { xp: number; n: number } | undefined, equipped: boolean) {
    const rar = RARITIES[p.rarity];
    if (!owned) {
        return <TipCard title="Undiscovered pet" color={rar.color} tag={rar.name} lines={[`A ${PET_DIM_BY_ID[p.dim].name} pet. ${p.blurb.length > 0 ? "Keep hatching to find it." : ""}`]} rows={[["Hatches from", eggsFor(p).map((e) => e.name).join(", ") || "any egg of its dimension"]]} foot="Its stats stay hidden until you find it." />;
    }
    const lv = petLevel(p, owned.xp);
    const m = starMult(owned.n);
    return (
        <TipCard
            title={p.name}
            color={p.color}
            tag={`${rar.name} · Lv ${lv}${owned.n > 1 ? ` ${stars(owned.n)}` : ""}`}
            lines={[p.blurb]}
            rows={[
                [PET_LABEL[p.stat], petStatValue(p.stat, (p.base + p.per * (lv - 1)) * m), "var(--mc-green)"],
                ...p.perks.map((pk, i): [string, string, string?] => [pk.name, lv >= PET_PERK_AT[i] ? petStatValue(pk.stat, pk.value * m) : `Lv ${PET_PERK_AT[i]}`, lv >= PET_PERK_AT[i] ? "var(--mc-green)" : undefined]),
            ]}
            notes={equipped ? [{ text: "Equipped", color: "var(--mc-green)" }] : undefined}
            foot={`${PET_DIM_BY_ID[p.dim].name} pet. Click for details.`}
        />
    );
}

export function PetsTab({ s, d, F, act, say, eggFx }: Ctx) {
    const slots = petSlots(s);
    const owned = PETS.filter((p) => s.pets[p.id]);
    const [view, setView] = useState<View>("eggs");
    const [sel, setSel] = useState<string | null>(s.equip[0] ?? owned[0]?.id ?? null);
    const [fDim, setFDim] = useState<PetDim | "all">("all");
    const [fRar, setFRar] = useState<Rarity | "all">("all");
    const [onlyOwned, setOnlyOwned] = useState(false);
    const top = useRef<HTMLDivElement>(null);

    const score = petScore(s);
    const bonds = petBonds(s);
    const bonusChips = (Object.keys(d.pet) as PetStat[]).filter((k) => d.pet[k] > 0);
    const feedAllCost = feedCost(s) * s.equip.filter((id) => PET_BY_ID.get(id) && petLevel(PET_BY_ID.get(id)!, s.pets[id]?.xp ?? 0) < PET_MAX).length;

    const pick = (id: string) => {
        setSel(id);
        setView("details");
        top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

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
        setSel(res[res.length - 1].id);
        if (eggFx) eggFx(egg, res);
        else say(`Hatched ${res.map((r) => PET_BY_ID.get(r.id)?.name).join(", ")}`);
    };

    const shown = useMemo(
        () =>
            PETS.filter((p) => (fDim === "all" || p.dim === fDim) && (fRar === "all" || p.rarity === fRar) && (!onlyOwned || s.pets[p.id])).sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.name.localeCompare(b.name)),
        [fDim, fRar, onlyOwned, s.pets], // eslint-disable-line react-hooks/exhaustive-deps
    );

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
                        <button type="button" className="pt-btn" onClick={() => act(() => equipBest(s))}>Equip best</button>
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
            <div className="pt-slots" ref={top}>
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
                            <Tip key={i} box tip={<TipCard title="Empty slot" color={C} lines={["Pick a pet in the Collection and press Equip. New pets fill empty slots by themselves."]} />}>
                                <div className="pt-slot" data-state="empty"><span className="pt-plus">+</span><span>Empty slot</span></div>
                            </Tip>
                        );
                    }
                    const rar = RARITIES[p.rarity];
                    const lv = petLevel(p, st.xp);
                    return (
                        <Tip key={i} box tip={petTip(p, st, true)}>
                            <button type="button" onClick={() => pick(p.id)} className="pt-slot" data-state="on" style={{ ["--rc" as string]: rar.color, ["--c" as string]: p.color } as CSSProperties}>
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
                {([["eggs", "Eggs", "flower"], ["collection", "Collection", "petLuck"], ["details", "Details", "wisdom"]] as const).map(([id, label, sym]) => (
                    <button key={id} type="button" role="tab" aria-selected={view === id} data-on={view === id} onClick={() => setView(id)} disabled={id === "details" && !sel}>
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
                                        const aff = eggsAffordable(s, e, 3);
                                        const cur = EGG_CUR[e.cur];
                                        const total = RARITY_ORDER.reduce((a, r) => a + (e.odds[r] || 0), 0);
                                        const rarities = RARITY_ORDER.filter((r) => e.odds[r]);
                                        const pool = PETS.filter((p) => p.dim === e.dim && e.odds[p.rarity]);
                                        const got = pool.filter((p) => s.pets[p.id]).length;
                                        return (
                                            <div key={e.id} className="pt-egg" data-lock={!!lock} data-can={can} style={{ ["--ec" as string]: e.color } as CSSProperties}>
                                                <Tip box tip={<TipCard title={e.name} color={e.color} tag={dim.name} lines={[e.blurb]} rows={[...rarities.map((r): [string, string, string?] => [RARITIES[r].name, `${+(((e.odds[r] || 0) / total) * 100).toFixed(1)}%`, RARITIES[r].color]), ["Pets in this pool", `${got} / ${pool.length} found`]]} notes={lock ? [{ text: lock, color: "var(--mc-gold)" }] : undefined} foot={`Costs ${cur.name.toLowerCase()}. You have ${F(bal)}.`} />}>
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
                                                    <span className="pt-price" style={{ color: can ? cur.color : undefined }} title={`${cur.name}`}>
                                                        <McSymbol name={cur.symbol} /> {F(price)}
                                                    </span>
                                                    <button type="button" className="pt-hatch" disabled={!can} onClick={() => open(e, 1)}>Hatch</button>
                                                    <Tip tip={<TipCard title="Hatch three" color={e.color} lines={["Opens three eggs at once on one screen."]} rows={[["Total", `${F(price * 3)} ${cur.one}s`], ["You can afford", `${aff} egg${aff === 1 ? "" : "s"}`]]} />}>
                                                        <button type="button" className="pt-hatch" disabled={aff < 3} onClick={() => open(e, 3)}>x3</button>
                                                    </Tip>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                    <p className="pt-note">Each egg only hatches pets from its own dimension. Prices rise a little with every egg you open. Rarer eggs use rarer currencies: tokens from rebirths, gems from ascensions, Arcane Dust from enchanting.</p>
                </>
            )}

            {view === "collection" && (
                <>
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
                            const rar = RARITIES[p.rarity];
                            const on = s.equip.includes(p.id);
                            return (
                                <Tip key={p.id} box tip={petTip(p, st, on)}>
                                    <button type="button" onClick={() => st && pick(p.id)} className="pt-tile" data-own={!!st} data-on={on} data-sel={sel === p.id} aria-label={st ? p.name : "Undiscovered pet"} style={{ ["--rc" as string]: rar.color, ["--c" as string]: st ? p.color : "var(--muted-foreground)" } as CSSProperties}>
                                        <span className="pt-tile-i"><McSymbol name={p.symbol} /></span>
                                        {st && <span className="pt-tile-lv">{petLevel(p, st.xp)}</span>}
                                        {st && st.n > 1 && <span className="pt-tile-st">{stars(st.n)}</span>}
                                        {on && <span className="pt-tile-eq"><Check className="size-3" /></span>}
                                    </button>
                                </Tip>
                            );
                        })}
                    </div>
                    {shown.length === 0 && <p className="pt-note">No pets match those filters.</p>}
                </>
            )}

            {view === "details" && sel && PET_BY_ID.get(sel) && s.pets[sel] ? (
                <PetDetail p={PET_BY_ID.get(sel)!} st={s.pets[sel]} equipped={s.equip.includes(sel)} s={s} F={F} act={act} say={say} back={() => setView("collection")} />
            ) : (
                view === "details" && <p className="pt-note">Pick a pet from the Collection or the slots above.</p>
            )}
        </div>
    );
}

function PetDetail({ p, st, equipped, s, F, act, say, back }: { p: PetDef; st: { xp: number; n: number }; equipped: boolean; s: Ctx["s"]; F: Ctx["F"]; act: Ctx["act"]; say: Ctx["say"]; back: () => void }) {
    const rar = RARITIES[p.rarity];
    const lv = petLevel(p, st.xp);
    const lo = petXpFor(p, lv);
    const hi = petXpFor(p, lv + 1);
    const maxed = lv >= PET_MAX;
    const cost = feedCost(s);
    const m = starMult(st.n);
    const now = (p.base + p.per * (lv - 1)) * m;
    const next = (p.base + p.per * lv) * m;
    const full = s.equip.length >= petSlots(s);
    return (
        <div className="pt-detail" style={{ ["--rc" as string]: rar.color, ["--c" as string]: p.color } as CSSProperties}>
            <button type="button" className="pt-back" onClick={back}>◂ Collection</button>
            <div className="pt-d-top">
                <span className="pt-d-ic"><McSymbol name={p.symbol} /></span>
                <div className="min-w-0 flex-1">
                    <div className="pt-d-name">{p.name}</div>
                    <div className="pt-d-tags">
                        <span style={{ color: lift(rar.color), borderColor: tint(rar.color, 60) }}>{rar.name}</span>
                        <span style={{ color: PET_DIM_BY_ID[p.dim].color, borderColor: tint(PET_DIM_BY_ID[p.dim].color, 55) }}>{PET_DIM_BY_ID[p.dim].name}</span>
                        <span>{st.n} found</span>
                    </div>
                    <div className="pt-d-blurb">{p.blurb}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <button
                        type="button"
                        className="pt-btn"
                        data-primary={!equipped}
                        onClick={() => {
                            act(() => (equipped ? unequipPet(s, p.id) : equipPet(s, p.id)));
                            if (!equipped && full) say(`${p.name} equipped. Your oldest pet was swapped out.`);
                        }}
                    >
                        {equipped ? "Unequip" : "Equip"}
                    </button>
                </div>
            </div>

            <div className="pt-d-bar">
                <div className="flex justify-between"><span>Level {lv}{maxed ? " (max)" : ` → ${lv + 1}`}</span><span>{maxed ? "MAX" : `${F(st.xp - lo)} / ${F(hi - lo)} xp`}</span></div>
                <XpBar p={p} xp={st.xp} color={p.color} />
            </div>

            <div className="pt-d-rows">
                <Tip box tip={<TipCard title="Main stat" color={p.color} lines={["Grows every level, then is multiplied by the pet's stars."]} rows={[["Level 1", petStatValue(p.stat, p.base * m)], ["Level 100", petStatValue(p.stat, (p.base + p.per * 99) * m), "var(--mc-green)"]]} />}>
                    <div className="pt-row">
                        <span>{PET_LABEL[p.stat]}</span>
                        <b><em>{petStatValue(p.stat, now)}</em>{!maxed && <span> → {petStatValue(p.stat, next)}</span>}</b>
                    </div>
                </Tip>
                <Tip box tip={<TipCard title={`Stars ${stars(st.n) || "-"}`} color="var(--mc-yellow)" lines={[`Every duplicate adds a star: +${PET_STAR_BONUS * 100}% to this pet's main stat and perks, up to ${PET_STAR_MAX} stars.`]} rows={[["Copies", String(st.n)], ["Bonus now", `+${Math.round((m - 1) * 100)}%`, "var(--mc-green)"], ["Max bonus", `+${PET_STAR_MAX * PET_STAR_BONUS * 100}%`]]} />}>
                    <div className="pt-row">
                        <span>Stars</span>
                        <b><em style={{ color: "var(--mc-yellow)" }}>{stars(st.n) || "none yet"}</em> <span>{m > 1 ? `+${Math.round((m - 1) * 100)}% to everything below` : "hatch duplicates to rank up"}</span></b>
                    </div>
                </Tip>
                {p.perks.map((pk, i) => {
                    const got = lv >= PET_PERK_AT[i];
                    return (
                        <div key={pk.name} className="pt-perk" data-got={got}>
                            <span className="pt-perk-i">{got ? <Check className="size-3" /> : <Lock className="size-3" />}</span>
                            <span className="min-w-0 flex-1">
                                <span className="pt-perk-n">{pk.name}</span>
                                <span className="pt-perk-s">{petStatText(pk.stat, pk.value * m)}</span>
                            </span>
                            <span className="pt-perk-l">Lv {PET_PERK_AT[i]}</span>
                        </div>
                    );
                })}
            </div>

            {!maxed && (
                <Tip box tip={<TipCard title="Feed" color="var(--mc-yellow)" lines={["Spend shards to give this pet 30% of the xp its current level needs."]} rows={[["Cost", `${F(cost)} shards`]]} />}>
                    <button type="button" className="pt-feed" disabled={s.shards < cost} onClick={() => act(() => feedPet(s, p.id))}>
                        <span>Feed: +30% of this level&apos;s xp</span>
                        <b style={{ color: s.shards >= cost ? "var(--mc-yellow)" : undefined }}>{F(cost)}</b>
                    </button>
                </Tip>
            )}
            <div className="pt-d-find">Hatches from: {eggsFor(p).map((e) => e.name).join(", ")}</div>
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
.pt-btn[data-primary="true"]{color:var(--mc-green);border-color:var(--mc-green);background:color-mix(in oklch,var(--mc-green) 18%,transparent)}
.pt-bonus{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground)}
.pt-bonus span{padding:.05rem .5rem;border-radius:.5rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
.pt-bonus b{font-weight:600;color:var(--mc-green)}
.pt-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.5rem}
.pt-slot{--rc:var(--pc);--c:var(--pc);display:flex;align-items:center;gap:.6rem;width:100%;min-height:3.6rem;padding:.5rem .6rem;border-radius:.9rem;border:1px dashed rgba(255,255,255,.2);font-family:var(--font-rubik,inherit);font-size:.7rem;color:var(--muted-foreground);transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .2s;outline:none;text-align:left}
.pt-slot em{display:block;font-style:normal;font-size:.6rem;opacity:.7}
.pt-slot[data-state="locked"]{opacity:.55}
.pt-slot[data-state="on"]{border:1px solid color-mix(in oklch,var(--rc) 65%,transparent);background:color-mix(in oklch,var(--rc) 9%,rgba(0,0,0,.25));box-shadow:0 0 18px -8px var(--rc);cursor:pointer;color:inherit}
.pt-slot[data-state="on"]:hover,.pt-slot[data-state="on"]:focus-visible{transform:translateY(-2px);box-shadow:0 10px 24px -12px var(--rc)}
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
.pt-tabs button:hover:not(:disabled){color:var(--foreground);background:rgba(255,255,255,.06)}
.pt-tabs button[data-on="true"]{color:color-mix(in oklch,var(--pc) 68%,#fff);background:color-mix(in oklch,var(--pc) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--pc) 55%,transparent)}
.pt-tabs button:disabled{opacity:.4}
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
.pt-price{display:inline-flex;align-items:center;gap:.3rem;flex:1;font-family:var(--font-minecraft,inherit);font-size:.85rem;color:var(--muted-foreground)}
.pt-hatch{height:1.9rem;padding:0 .8rem;border-radius:.65rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;letter-spacing:.04em;color:color-mix(in oklch,var(--ec,var(--mc-gold)) 70%,#fff);border:1px solid color-mix(in oklch,var(--ec,var(--mc-gold)) 70%,transparent);background:color-mix(in oklch,var(--ec,var(--mc-gold)) 20%,transparent);transition:filter .15s,transform .12s,opacity .15s}
.pt-hatch:hover:not(:disabled){filter:brightness(1.25);transform:translateY(-1px)}
.pt-hatch:active:not(:disabled){transform:scale(.94)}
.pt-hatch:disabled{opacity:.4;cursor:not-allowed}
.pt-note{margin:0;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.pt-filters{display:flex;flex-direction:column;gap:.4rem}
.pt-chipset{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem}
.pt-chipset button{--c:var(--pc);display:inline-flex;align-items:center;gap:.3rem;height:1.7rem;padding:0 .6rem;border-radius:.6rem;font-family:var(--font-minecraft,inherit);font-size:.62rem;font-weight:700;color:var(--muted-foreground);background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transition:background .15s,color .15s,box-shadow .15s;outline:none}
.pt-chipset button:hover{color:var(--foreground)}
.pt-chipset button[data-on="true"]{color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 55%,transparent)}
.pt-own{display:inline-flex;align-items:center;gap:.3rem;margin-left:auto;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground);cursor:pointer}
.pt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(4.4rem,1fr));gap:.4rem}
.pt-tile{--rc:#fff;--c:#fff;position:relative;display:grid;place-items:center;width:100%;aspect-ratio:1;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--rc) 50%,transparent);background:color-mix(in oklch,var(--rc) 9%,rgba(0,0,0,.22));color:var(--c);font-size:1.7rem;transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .2s,border-color .15s;outline:none}
.pt-tile[data-own="false"]{color:rgba(255,255,255,.16);border-color:color-mix(in oklch,var(--rc) 28%,transparent);background:rgba(255,255,255,.02);cursor:default}
.pt-tile[data-own="true"]:hover,.pt-tile[data-own="true"]:focus-visible{transform:translateY(-3px) rotate(-1.5deg);box-shadow:0 10px 22px -12px var(--rc)}
.pt-tile[data-on="true"]{border-color:var(--mc-green);box-shadow:0 0 0 1px var(--mc-green),0 0 14px -4px var(--mc-green)}
.pt-tile[data-sel="true"]{box-shadow:0 0 0 2px #fff}
.pt-tile-lv{position:absolute;right:.3rem;bottom:.15rem;font-family:var(--font-minecraft,inherit);font-size:.58rem;color:#fff}
.pt-tile-st{position:absolute;left:.3rem;bottom:.15rem;font-size:.5rem;color:var(--mc-yellow);letter-spacing:-.05em}
.pt-tile-eq{position:absolute;left:.25rem;top:.2rem;color:var(--mc-green)}
.pt-detail{display:flex;flex-direction:column;gap:.6rem;padding:.8rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--rc) 55%,transparent);background:linear-gradient(140deg,color-mix(in oklch,var(--rc) 9%,transparent),transparent 70%)}
.pt-back{align-self:flex-start;font-family:var(--font-minecraft,inherit);font-size:.66rem;font-weight:700;color:var(--muted-foreground)}
.pt-back:hover{color:var(--foreground)}
.pt-d-top{display:flex;flex-wrap:wrap;align-items:center;gap:.8rem}
.pt-d-ic{display:grid;place-items:center;flex:none;width:4rem;height:4rem;border-radius:1.1rem;font-size:2.3rem;color:var(--c);background:color-mix(in oklch,var(--c) 17%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 2px color-mix(in oklch,var(--rc) 65%,transparent),0 0 28px -6px var(--rc);animation:pt-bob 3s ease-in-out infinite}
.pt-d-name{font-family:var(--font-minecraft,inherit);font-size:1.1rem;font-weight:700;color:color-mix(in oklch,var(--rc) 70%,#fff);text-shadow:0 0 14px color-mix(in oklch,var(--rc) 50%,transparent)}
.pt-d-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin:.15rem 0}
.pt-d-tags span{padding:0 .5rem;border-radius:999px;border:1px solid rgba(255,255,255,.2);font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground)}
.pt-d-blurb{font-family:var(--font-rubik,inherit);font-size:.72rem;color:var(--muted-foreground)}
.pt-d-bar{display:flex;flex-direction:column;gap:.25rem;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.pt-d-rows{display:flex;flex-direction:column;gap:.35rem}
.pt-row{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem;padding:.4rem .6rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);font-family:var(--font-rubik,inherit);font-size:.72rem;color:var(--muted-foreground);cursor:help}
.pt-row b{font-family:var(--font-minecraft,inherit);font-size:.74rem;font-weight:700;color:var(--foreground);text-align:right}
.pt-row b em{font-style:normal;color:var(--mc-green)}
.pt-row b span{font-family:var(--font-rubik,inherit);font-weight:400;font-size:.62rem;color:var(--muted-foreground)}
.pt-perk{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.08);opacity:.55}
.pt-perk[data-got="true"]{opacity:1;border-color:color-mix(in oklch,var(--c) 50%,transparent);background:color-mix(in oklch,var(--c) 9%,transparent)}
.pt-perk-i{display:grid;place-items:center;flex:none;width:1.3rem;height:1.3rem;border-radius:.4rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent)}
.pt-perk[data-got="true"] .pt-perk-i{color:#000;background:var(--c)}
.pt-perk-n{display:block;font-family:var(--font-minecraft,inherit);font-size:.72rem;font-weight:700}
.pt-perk[data-got="true"] .pt-perk-n{color:color-mix(in oklch,var(--c) 70%,#fff)}
.pt-perk-s{display:block;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.pt-perk-l{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.pt-feed{display:flex;width:100%;align-items:center;justify-content:space-between;padding:.45rem .7rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.15);font-family:var(--font-rubik,inherit);font-size:.72rem;transition:background .15s,opacity .15s}
.pt-feed:hover:not(:disabled){background:rgba(255,255,255,.08)}
.pt-feed:disabled{opacity:.45;cursor:not-allowed}
.pt-feed b{font-family:var(--font-minecraft,inherit)}
.pt-d-find{font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
@media (prefers-reduced-motion:reduce){.pt-ic,.pt-d-ic,.pt-egg[data-can="true"] .pt-egg-i{animation:none}.pt-tile,.pt-slot,.pt-egg{transition:none}}
`;

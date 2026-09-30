"use client";

import { useState } from "react";
import { Check, Lock, Sparkles } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    EGGS,
    PETS,
    PET_LABEL,
    PET_MAX,
    PET_PERK_AT,
    PET_SLOTS_MAX,
    RARITIES,
    RARITY_ORDER,
    petLevel,
    petXpFor,
    type PetDef,
    type PetStat,
} from "@/lib/fractured-idle/data";
import { eggPrice, equipPet, feedCost, feedPet, hatch, petSlots, unequipPet, type HatchResult } from "@/lib/fractured-idle/engine";
import { SectionTitle, lift, tint, type Ctx } from "./ui";

// Pets: hatch eggs, equip up to three, level them by playing. Duplicates feed
// the pet they match. Bonuses come from the main stat (grows every level) and
// three perks unlocked at levels 25 / 60 / 100.

const pct = (v: number) => `+${+(v * 100).toFixed(v < 0.1 ? 2 : 1)}%`;
const statText = (stat: PetStat, v: number) => `${pct(v)} ${PET_LABEL[stat]}`;
const clamp01 = (n: number) => Math.max(0, Math.min(1, isFinite(n) ? n : 0));

function XpBar({ p, xp, color }: { p: PetDef; xp: number; color: string }) {
    const lv = petLevel(p, xp);
    const lo = petXpFor(p, lv);
    const hi = petXpFor(p, lv + 1);
    const f = lv >= PET_MAX ? 1 : clamp01((xp - lo) / (hi - lo));
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${f * 100}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        </div>
    );
}

export function PetsTab({ s, d, F, render, say }: Ctx) {
    const owned = PETS.filter((p) => s.pets[p.id]);
    const [sel, setSel] = useState<string | null>(s.equip[0] ?? owned[0]?.id ?? null);
    const [last, setLast] = useState<HatchResult | null>(null);
    const slots = petSlots(s);

    const doHatch = (eggId: string, free = false) => {
        const r = hatch(s, eggId, free);
        if (!r) return;
        setLast(r);
        setSel(r.id);
        const p = PETS.find((x) => x.id === r.id)!;
        say(r.isNew ? `New pet: ${p.name} (${RARITIES[r.rarity].name})!` : `${p.name} again! +${F(r.xp)} pet xp.`);
        render();
    };

    const bonusChips = (Object.keys(d.pet) as PetStat[]).filter((k) => d.pet[k] > 0);
    const cur = sel ? PETS.find((p) => p.id === sel) : undefined;
    const curState = cur ? s.pets[cur.id] : undefined;

    return (
        <>
            {/* Active bonuses */}
            <div className="rounded-xl border p-3" style={{ borderColor: tint("var(--mc-dark-aqua)", 50), backgroundColor: tint("var(--mc-dark-aqua)", 8) }}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2 font-minecraft text-sm" style={{ color: lift("var(--mc-dark-aqua)") }}>
                    <McSymbol name="petLuck" /> Pets
                    <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint("var(--mc-dark-aqua)", 55) }}>
                        {owned.length}/{PETS.length} found
                    </span>
                    <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint("var(--mc-dark-aqua)", 55) }}>
                        {s.equip.length}/{slots} equipped
                    </span>
                </div>
                <div className="flex flex-wrap gap-1">
                    {bonusChips.length ? (
                        bonusChips.map((k) => (
                            <span key={k} className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-rubik text-[11px]">
                                <span style={{ color: "var(--mc-green)" }}>{pct(d.pet[k])}</span> <span className="text-muted-foreground">{PET_LABEL[k]}</span>
                            </span>
                        ))
                    ) : (
                        <span className="font-rubik text-[11px] text-muted-foreground">No bonuses yet. Hatch an egg below and equip what you find.</span>
                    )}
                </div>
                <p className="mt-1.5 font-rubik text-[10px] text-muted-foreground">
                    Equipped pets earn xp over time and from clicks. Each species you find adds +0.5% to all shards, equipped or not.
                </p>
            </div>

            {/* Slots */}
            <SectionTitle color="var(--mc-dark-aqua)">Equipped</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {Array.from({ length: PET_SLOTS_MAX }, (_, i) => {
                    const id = s.equip[i];
                    const p = id ? PETS.find((x) => x.id === id) : undefined;
                    const st = id ? s.pets[id] : undefined;
                    if (i >= slots) {
                        return (
                            <div key={i} className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 p-2.5 opacity-60">
                                <Lock className="size-4 shrink-0 text-muted-foreground" />
                                <span className="font-rubik text-[11px] text-muted-foreground">
                                    Slot {i + 1}: Ascension upgrade {i === 1 ? "Second" : "Third"} Perch
                                </span>
                            </div>
                        );
                    }
                    if (!p || !st) {
                        return (
                            <div key={i} className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 p-2.5">
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-dashed border-white/20 text-muted-foreground">+</span>
                                <span className="font-rubik text-[11px] text-muted-foreground">Empty slot. Pick a pet below and press Equip.</span>
                            </div>
                        );
                    }
                    const rar = RARITIES[p.rarity];
                    const lv = petLevel(p, st.xp);
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setSel(p.id)}
                            className="rounded-xl border p-2.5 text-left transition-transform hover:-translate-y-px"
                            style={{ borderColor: tint(rar.color, 65), backgroundColor: tint(rar.color, 9), boxShadow: `0 0 16px -8px ${rar.color}` }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg text-lg" style={{ color: p.color, backgroundColor: tint(p.color, 16), boxShadow: `inset 0 0 0 1px ${tint(p.color, 40)}` }}>
                                    <McSymbol name={p.symbol} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-minecraft text-xs" style={{ color: lift(rar.color) }}>{p.name}</span>
                                    <span className="block font-rubik text-[10px] text-muted-foreground">Lv {lv}{lv >= PET_MAX ? " · MAX" : ""}</span>
                                </span>
                            </div>
                            <div className="mt-1.5"><XpBar p={p} xp={st.xp} color={p.color} /></div>
                        </button>
                    );
                })}
            </div>

            {/* Eggs */}
            <SectionTitle color="var(--mc-gold)">Eggs</SectionTitle>
            {s.freeEggs > 0 && (
                <button
                    type="button"
                    onClick={() => doHatch("wood", true)}
                    className="fi-afford flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left"
                    style={{ ["--c" as string]: "var(--mc-gold)", borderColor: "var(--mc-gold)", backgroundColor: tint("var(--mc-gold)", 12) }}
                >
                    <Sparkles className="size-4" style={{ color: "var(--mc-gold)" }} />
                    <span className="font-minecraft text-xs" style={{ color: "var(--mc-gold)" }}>Free Wooden Egg x{s.freeEggs}</span>
                    <span className="ml-auto font-rubik text-[11px] text-muted-foreground">Found by a treasure bobber. Click to hatch.</span>
                </button>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {EGGS.map((e) => {
                    const price = eggPrice(s, e);
                    const can = s.shards >= price;
                    const total = RARITY_ORDER.reduce((a, r) => a + (e.odds[r] || 0), 0);
                    return (
                        <div key={e.id} className="flex flex-col rounded-xl border p-2.5" style={{ borderColor: tint(e.color, can ? 60 : 25), backgroundColor: tint(e.color, 6) }}>
                            <div className="flex items-center gap-2">
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg text-lg" style={{ color: e.color, backgroundColor: tint(e.color, 16), boxShadow: `inset 0 0 0 1px ${tint(e.color, 40)}` }}>
                                    <McSymbol name={e.symbol} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-minecraft text-xs" style={{ color: lift(e.color) }}>{e.name}</span>
                                    <span className="block truncate font-rubik text-[10px] text-muted-foreground">{e.blurb}</span>
                                </span>
                            </div>
                            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
                                {RARITY_ORDER.filter((r) => e.odds[r]).map((r) => (
                                    <div key={r} title={`${RARITIES[r].name} ${Math.round(((e.odds[r] || 0) / total) * 100)}%`} style={{ width: `${((e.odds[r] || 0) / total) * 100}%`, backgroundColor: RARITIES[r].color }} />
                                ))}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-2 font-rubik text-[9px] text-muted-foreground">
                                {RARITY_ORDER.filter((r) => e.odds[r]).map((r) => (
                                    <span key={r} style={{ color: lift(RARITIES[r].color) }}>{RARITIES[r].name} {Math.round(((e.odds[r] || 0) / total) * 100)}%</span>
                                ))}
                            </div>
                            <button
                                type="button"
                                disabled={!can}
                                onClick={() => doHatch(e.id)}
                                className={`mt-2 flex items-center justify-between rounded-lg border px-2.5 py-1.5 font-minecraft text-[11px] transition-colors enabled:hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50 ${can ? "fi-afford" : ""}`}
                                style={{ ["--c" as string]: e.color, borderColor: tint(e.color, can ? 75 : 30), backgroundColor: tint(e.color, can ? 22 : 6), color: lift(e.color) }}
                            >
                                <span className="uppercase tracking-wider">Hatch</span>
                                <span style={{ color: can ? "var(--mc-yellow)" : undefined }}>{F(price)}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
            <p className="font-rubik text-[10px] text-muted-foreground">
                Prices track your best shards/sec ever, so they stay meaningful and rise a little with every egg. Duplicates give that pet a big chunk of xp.
            </p>
            {last && (
                <div className="fi-pop rounded-xl border px-3 py-2 font-rubik text-xs" style={{ borderColor: tint(RARITIES[last.rarity].color, 70), backgroundColor: tint(RARITIES[last.rarity].color, 10) }}>
                    Last hatch:{" "}
                    <b style={{ color: lift(RARITIES[last.rarity].color) }}>{PETS.find((p) => p.id === last.id)!.name}</b>{" "}
                    ({RARITIES[last.rarity].name}) {last.isNew ? <b style={{ color: "var(--mc-green)" }}>NEW!</b> : <>duplicate, +{F(last.xp)} xp</>}
                </div>
            )}

            {/* Collection */}
            <SectionTitle color="var(--mc-light-purple)">Collection</SectionTitle>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                {[...PETS].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)).map((p) => {
                    const st = s.pets[p.id];
                    const rar = RARITIES[p.rarity];
                    const on = s.equip.includes(p.id);
                    return (
                        <button
                            key={p.id}
                            type="button"
                            disabled={!st}
                            onClick={() => setSel(p.id)}
                            aria-label={st ? p.name : "Undiscovered pet"}
                            title={st ? `${p.name} (${rar.name})` : "Not found yet"}
                            className="relative grid aspect-square place-items-center rounded-xl border text-2xl transition-transform enabled:hover:-translate-y-0.5"
                            style={{
                                color: st ? p.color : "var(--muted-foreground)",
                                borderColor: sel === p.id ? "#fff" : st ? tint(rar.color, on ? 90 : 55) : "rgba(255,255,255,0.1)",
                                backgroundColor: st ? tint(rar.color, on ? 20 : 9) : "rgba(255,255,255,0.02)",
                                boxShadow: on ? `0 0 14px -4px ${rar.color}` : undefined,
                                opacity: st ? 1 : 0.4,
                            }}
                        >
                            {st ? <McSymbol name={p.symbol} /> : "?"}
                            {st && <span className="absolute bottom-0.5 right-1 font-minecraft text-[9px] leading-none text-white">{petLevel(p, st.xp)}</span>}
                            {on && <span className="absolute left-1 top-0.5 text-[10px]" style={{ color: "var(--mc-green)" }}><Check className="size-3" /></span>}
                        </button>
                    );
                })}
            </div>

            {/* Detail */}
            {cur && curState && (
                <PetDetail p={cur} xp={curState.xp} copies={curState.n} equipped={s.equip.includes(cur.id)} {...{ s, F, render, say }} />
            )}
        </>
    );
}

function PetDetail({ p, xp, copies, equipped, s, F, render, say }: { p: PetDef; xp: number; copies: number; equipped: boolean } & Pick<Ctx, "s" | "F" | "render" | "say">) {
    const rar = RARITIES[p.rarity];
    const lv = petLevel(p, xp);
    const lo = petXpFor(p, lv);
    const hi = petXpFor(p, lv + 1);
    const maxed = lv >= PET_MAX;
    const cost = feedCost(s);
    const now = p.base + p.per * (lv - 1);
    const next = p.base + p.per * lv;
    return (
        <div className="rounded-xl border p-3" style={{ borderColor: tint(rar.color, 55), backgroundColor: tint(rar.color, 6) }}>
            <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ color: p.color, backgroundColor: tint(p.color, 16), boxShadow: `inset 0 0 0 1px ${tint(p.color, 45)}, 0 0 16px -6px ${p.color}` }}>
                    <McSymbol name={p.symbol} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-minecraft text-sm" style={{ color: lift(rar.color) }}>{p.name}</span>
                        <span className="rounded-full border px-1.5 font-rubik text-[10px]" style={{ borderColor: tint(rar.color, 60), color: lift(rar.color) }}>{rar.name}</span>
                        {copies > 1 && <span className="font-rubik text-[10px] text-muted-foreground">x{copies} found</span>}
                    </div>
                    <div className="font-rubik text-[11px] text-muted-foreground">{p.blurb}</div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (equipped) unequipPet(s, p.id);
                        else {
                            const full = s.equip.length >= petSlots(s);
                            equipPet(s, p.id);
                            if (full) say(`${p.name} equipped. Your oldest pet was swapped out.`);
                        }
                        render();
                    }}
                    className="shrink-0 rounded-lg border px-3 py-1.5 font-minecraft text-xs transition-colors hover:brightness-125"
                    style={equipped ? { borderColor: "rgba(255,255,255,0.2)", color: "var(--muted-foreground)" } : { borderColor: "var(--mc-green)", backgroundColor: tint("var(--mc-green)", 20), color: "var(--mc-green)" }}
                >
                    {equipped ? "Unequip" : "Equip"}
                </button>
            </div>

            <div className="mt-3">
                <div className="mb-1 flex justify-between font-rubik text-[10px] text-muted-foreground">
                    <span>Level {lv}{maxed ? " (max)" : ` → ${lv + 1}`}</span>
                    <span>{maxed ? "MAX" : `${F(xp - lo)} / ${F(hi - lo)} xp`}</span>
                </div>
                <XpBar p={p} xp={xp} color={p.color} />
            </div>

            <div className="mt-3 grid gap-1.5">
                <div className="flex items-baseline justify-between rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                    <span className="font-rubik text-xs text-muted-foreground">{PET_LABEL[p.stat]}</span>
                    <span className="font-minecraft text-xs">
                        <span style={{ color: "var(--mc-green)" }}>{pct(now)}</span>
                        {!maxed && <span className="text-muted-foreground"> → {pct(next)}</span>}
                    </span>
                </div>
                {p.perks.map((pk, i) => {
                    const got = lv >= PET_PERK_AT[i];
                    return (
                        <div key={pk.name} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: got ? tint(p.color, 50) : "rgba(255,255,255,0.08)", backgroundColor: got ? tint(p.color, 9) : undefined, opacity: got ? 1 : 0.55 }}>
                            <span className="grid size-5 shrink-0 place-items-center rounded-md font-minecraft text-[10px]" style={{ color: got ? "#000" : p.color, backgroundColor: got ? p.color : tint(p.color, 14) }}>
                                {got ? <Check className="size-3" /> : <Lock className="size-3" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="font-minecraft text-xs" style={{ color: got ? lift(p.color) : undefined }}>{pk.name}</span>
                                <span className="block font-rubik text-[11px] text-muted-foreground">{statText(pk.stat, pk.value)}</span>
                            </span>
                            <span className="shrink-0 font-rubik text-[10px] text-muted-foreground">Lv {PET_PERK_AT[i]}</span>
                        </div>
                    );
                })}
            </div>

            {!maxed && (
                <button
                    type="button"
                    disabled={s.shards < cost}
                    onClick={() => {
                        if (feedPet(s, p.id)) render();
                    }}
                    className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/15 px-3 py-1.5 font-rubik text-xs transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span>Feed: +30% of this level's xp</span>
                    <span className="font-minecraft" style={{ color: s.shards >= cost ? "var(--mc-yellow)" : undefined }}>{F(cost)}</span>
                </button>
            )}
        </div>
    );
}

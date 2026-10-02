import "./enchant"; // load order: enchant -> sagas -> mine must be evaluated in that order (a cycle), whoever imports first
import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "./data";
import { EGGS, RARITY_ORDER, type Rarity } from "./pets-data";
import { BOOSTS } from "./boosters";
import { DIMS, GEODES, INGOTS, ITEMS as MINE_ITEMS, ORES, RECIPE_BY_ID as MINE_RECIPES } from "./mine";
import { CROPS, GOODS, ITEMS as FARM_ITEMS, PODS, farmCtx, goodValue, rawValue, sellEnchanted, sellGood, sellRaw, sellValue as enchValue, CROP_BY_ID } from "./farm";
import type { Derived } from "./engine";

// The item registry. Everything the player can own is an item with a string id "<kind>:<key>". Some items live in
// the inventory's own store (eggs, pet items, boosters); the rest are *views* over storage that Mining and Farming
// already keep (ore, ingots, crops, goods, consumables, geodes, pods), so those systems keep working untouched and
// the inventory still shows, sells and tracks them in one place.

export type ItemCat = "egg" | "booster" | "pet" | "ore" | "ingot" | "crop" | "ench" | "good" | "consumable" | "cache";

export const CATS: { id: ItemCat; label: string; color: string; symbol: McSymbolName }[] = [
    { id: "egg", label: "Eggs", color: "var(--mc-gold)", symbol: "flower" },
    { id: "booster", label: "Boosters", color: "var(--mc-yellow)", symbol: "bolt" },
    { id: "pet", label: "Pet items", color: "#ff8fc7", symbol: "petLuck" },
    { id: "ore", label: "Ores", color: "#e0b070", symbol: "pick" },
    { id: "ingot", label: "Ingots", color: "#9fb4c8", symbol: "forge" },
    { id: "crop", label: "Crops", color: "#9be04a", symbol: "fortune" },
    { id: "ench", label: "Enchanted", color: "#c58bff", symbol: "intelligence" },
    { id: "good", label: "Goods", color: "#ffd0e0", symbol: "heartS" },
    { id: "consumable", label: "Consumables", color: "#ff6a4d", symbol: "flask" },
    { id: "cache", label: "Geodes & pods", color: "var(--mc-light-purple)", symbol: "gem" },
];
export const CAT_BY_ID = new Map(CATS.map((c) => [c.id, c]));

export interface ItemDef {
    id: string;
    name: string;
    desc: string;
    color: string;
    symbol: McSymbolName;
    cat: ItemCat;
    rarity: Rarity;
    /** Where to send the player to use or make it ("mine", "farm", "pets"...). */
    home?: string;
    sellable: boolean;
    /** Native items only: sell value is max(min, peakIncome x secs). */
    secs?: number;
    min?: number;
}

const tierRarity = (i: number, n: number): Rarity => RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, Math.floor((i / Math.max(1, n)) * RARITY_ORDER.length))];

// ---- Native items ----

export interface PetItem {
    id: string;
    name: string;
    desc: string;
    color: string;
    symbol: McSymbolName;
    rarity: Rarity;
    secs: number;
    min: number;
    /** Fraction of the xp the pet's current level needs. */
    feed?: number;
    /** Adds a copy (a star). */
    star?: boolean;
}
export const PET_ITEMS: PetItem[] = [
    { id: "pet:biscuit", name: "Pet Biscuit", desc: "A crunchy snack. Gives one pet 15% of the xp its level needs.", color: "#e0b070", symbol: "daisy", rarity: "common", secs: 90, min: 2e4, feed: 0.15 },
    { id: "pet:cookie", name: "Pet Cookie", desc: "Soft and sweet. Gives one pet 40% of the xp its level needs.", color: "#ffb35f", symbol: "blossom", rarity: "uncommon", secs: 300, min: 8e4, feed: 0.4 },
    { id: "pet:feast", name: "Pet Feast", desc: "A whole banquet. Gives one pet a full level of xp.", color: "#ff8a5c", symbol: "sunburst", rarity: "rare", secs: 1200, min: 3e5, feed: 1 },
    { id: "pet:stardust", name: "Star Dust", desc: "Adds a star to a pet you own, as if you had hatched another copy.", color: "#fff35f", symbol: "star", rarity: "epic", secs: 7200, min: 1e7, star: true },
];
export const PET_ITEM_BY_ID = new Map(PET_ITEMS.map((p) => [p.id, p]));

const EGG_RARITY: Record<string, Rarity> = { wood: "common", gold: "uncommon", magma: "uncommon", soul: "rare", chorus: "rare", void: "epic", arcane: "epic", prism: "legendary" };
const EGG_VALUE: Record<string, [number, number]> = {
    wood: [120, 4e4], gold: [720, 8e7], magma: [900, 2e5], soul: [2400, 2e6], chorus: [1800, 1e6], void: [5400, 1e7], arcane: [3600, 5e6], prism: [9000, 2e7],
};

const DEFS: ItemDef[] = [];
const push = (d: ItemDef) => DEFS.push(d);

for (const e of EGGS) {
    const [secs, min] = EGG_VALUE[e.id] ?? [600, 1e5];
    push({ id: `egg:${e.id}`, name: e.name, desc: e.blurb, color: e.color, symbol: e.symbol, cat: "egg", rarity: EGG_RARITY[e.id] ?? "rare", home: "pets", sellable: true, secs, min });
}
for (const b of BOOSTS) {
    const rarity: Rarity = b.id === "boost:frenzy" ? "legendary" : b.stat === "luck" || b.stat === "tokens" ? "rare" : "uncommon";
    push({ id: b.id, name: b.name, desc: b.desc, color: b.color, symbol: b.symbol, cat: "booster", rarity, sellable: true, secs: b.mins * 18, min: 3e4 });
}
for (const p of PET_ITEMS) push({ id: p.id, name: p.name, desc: p.desc, color: p.color, symbol: p.symbol, cat: "pet", rarity: p.rarity, home: "pets", sellable: true, secs: p.secs, min: p.min });

// ---- Views over Mining and Farming ----

ORES.forEach((o, i) => push({ id: `ore:${o.id}`, name: o.name, desc: `Mined from the ${o.dim} rock. Smelt it, forge with it, or sell it.`, color: o.color, symbol: "pick", cat: "ore", rarity: tierRarity(i, ORES.length), home: "mine", sellable: true }));
INGOTS.forEach((o, i) => push({ id: `ingot:${o.id}`, name: o.name, desc: "Smelted in the forge. Pickaxes, drill parts and relics are made of these.", color: o.color, symbol: "forge", cat: "ingot", rarity: tierRarity(i + 2, INGOTS.length + 2), home: "mine", sellable: true }));
MINE_ITEMS.forEach((o) => push({ id: `mine:${o.id}`, name: o.name, desc: o.desc, color: o.color, symbol: "flask", cat: "consumable", rarity: "rare", home: "mine", sellable: true }));
CROPS.forEach((c, i) => {
    push({ id: `crop:${c.id}`, name: c.name, desc: `Grown in the ${c.dim} garden. Enchant it, cook with it, or sell it raw.`, color: c.color, symbol: "fortune", cat: "crop", rarity: tierRarity(i, CROPS.length), home: "farm", sellable: true });
    push({ id: `ench:${c.id}`, name: `Enchanted ${c.name}`, desc: "A concentrated crop: tools and hoes are made from these, and they sell for far more.", color: c.color, symbol: "intelligence", cat: "ench", rarity: tierRarity(i + 2, CROPS.length + 2), home: "farm", sellable: true });
});
GOODS.forEach((g, i) => push({ id: `good:${g.id}`, name: g.name, desc: "Cooked in the cookhouse. Worth more than the crops it is made of.", color: g.color, symbol: "heartS", cat: "good", rarity: tierRarity(i + 1, GOODS.length + 1), home: "farm", sellable: true }));
FARM_ITEMS.forEach((o) => push({ id: `farm:${o.id}`, name: o.name, desc: o.desc, color: o.color, symbol: "flask", cat: "consumable", rarity: "rare", home: "farm", sellable: true }));
for (const dim of DIMS) {
    push({ id: `geode:${dim}`, name: GEODES[dim].name, desc: "Crack it open in the Mine for dust, tokens, eggs and more.", color: GEODES[dim].color, symbol: "gem", cat: "cache", rarity: dim === "overworld" ? "uncommon" : dim === "nether" ? "rare" : "epic", home: "mine", sellable: false });
    push({ id: `pod:${dim}`, name: PODS[dim].name, desc: "Open it on the Farm for dust, tokens, eggs and more.", color: PODS[dim].color, symbol: "bloom", cat: "cache", rarity: dim === "overworld" ? "uncommon" : dim === "nether" ? "rare" : "epic", home: "farm", sellable: false });
}

export const ITEMS_ALL: readonly ItemDef[] = DEFS;
export const ITEM_BY_ID = new Map(DEFS.map((d) => [d.id, d]));
export const isItem = (id: unknown): id is string => typeof id === "string" && ITEM_BY_ID.has(id);
const CAT_ORDER = new Map(CATS.map((c, i) => [c.id, i]));
export const ITEM_ORDER = new Map(DEFS.map((d, i) => [d.id, i]));
export const catRank = (c: ItemCat) => CAT_ORDER.get(c) ?? 99;
export const rarityRank = (r: Rarity) => RARITY_ORDER.indexOf(r);

// ---- Counts ----

const kindOf = (id: string) => id.slice(0, id.indexOf(":"));
const keyOf = (id: string) => id.slice(id.indexOf(":") + 1);

function store(s: State, id: string): { rec: Record<string, number>; key: string } | null {
    const k = keyOf(id);
    switch (kindOf(id)) {
        case "ore": return { rec: s.mine.ore, key: k };
        case "ingot": return { rec: s.mine.ingots, key: k };
        case "mine": return { rec: s.mine.items, key: k };
        case "crop": return { rec: s.farm.crop, key: k };
        case "ench": return { rec: s.farm.ench, key: k };
        case "good": return { rec: s.farm.goods, key: k };
        case "farm": return { rec: s.farm.items, key: k };
        case "geode": return { rec: s.mine.geodes, key: k };
        case "pod": return { rec: s.farm.pods, key: k };
        case "egg":
        case "boost":
        case "pet": return { rec: s.inv.items, key: id };
    }
    return null;
}

/** How many of an item the player owns (whole units). */
export function itemCount(s: State, id: string): number {
    if (id === "egg:wood") return Math.floor(s.freeEggs + (s.inv.items[id] || 0));
    const st = store(s, id);
    return st ? Math.floor(st.rec[st.key] || 0) : 0;
}
export function itemAdd(s: State, id: string, n: number) {
    if (n <= 0 || !ITEM_BY_ID.has(id)) return;
    if (id === "egg:wood") {
        s.freeEggs += n;
        return;
    }
    const st = store(s, id);
    if (st) st.rec[st.key] = (st.rec[st.key] || 0) + n;
}
/** Remove up to n; returns how many were taken. */
export function itemTake(s: State, id: string, n: number): number {
    n = Math.floor(n);
    if (n <= 0) return 0;
    if (id === "egg:wood") {
        const fromFree = Math.min(n, Math.floor(s.freeEggs));
        s.freeEggs -= fromFree;
        const rest = Math.min(n - fromFree, s.inv.items[id] || 0);
        if (rest > 0) s.inv.items[id] -= rest;
        return fromFree + Math.max(0, rest);
    }
    const st = store(s, id);
    if (!st) return 0;
    const k = Math.min(n, Math.floor(st.rec[st.key] || 0));
    if (k > 0) st.rec[st.key] = (st.rec[st.key] || 0) - k;
    return k;
}

/** Every item the player owns, in registry order. */
export function ownedIds(s: State): string[] {
    const out: string[] = [];
    for (const d of DEFS) if (itemCount(s, d.id) > 0) out.push(d.id);
    return out;
}

// ---- Value ----

type Econ = Pick<Derived, "cps" | "avgClick" | "auto" | "xpMult" | "xpSkill" | "dustMult">;
const income = (d: Pick<Derived, "cps" | "avgClick">) => Math.max(d.cps, d.avgClick);
const ORE_SECS = 0.45;

/** The merchant's eye: +5% per level on everything you sell. */
export const sellBonus = (s: State) => 1 + 0.05 * (s.inv.sup.eye || 0);

/** Shards one unit sells for, before the merchant bonus. 0 = cannot be sold. */
export function unitValue(s: State, d: Econ, id: string): number {
    const def = ITEM_BY_ID.get(id);
    if (!def || !def.sellable) return 0;
    const k = keyOf(id);
    switch (def.cat) {
        case "egg":
        case "booster":
        case "pet":
            return Math.max(def.min ?? 1, s.peakInc * (def.secs ?? 60));
        case "ore": return Math.max(0.5, income(d)) * ORE_SECS * (ORES.find((o) => o.id === k)?.vm ?? 1);
        case "ingot": {
            const r = MINE_RECIPES[k];
            let v = 0;
            if (r) for (const [ik, n] of Object.entries(r.inputs)) v += (n ?? 0) * unitValue(s, d, ORES.some((o) => o.id === ik) ? `ore:${ik}` : `ingot:${ik}`);
            return v * 1.4;
        }
        case "consumable": return Math.max(50, income(d) * 25);
        case "crop": return CROP_BY_ID[k as keyof typeof CROP_BY_ID] ? rawValue(s, farmCtx(d), CROP_BY_ID[k as keyof typeof CROP_BY_ID]) : 0;
        case "ench": return CROP_BY_ID[k as keyof typeof CROP_BY_ID] ? enchValue(s, farmCtx(d), CROP_BY_ID[k as keyof typeof CROP_BY_ID]) : 0;
        case "good": return goodValue(s, farmCtx(d), k as Parameters<typeof goodValue>[2]);
    }
    return 0;
}

/** Sell up to n of an item for shards. Farm goods go through the Farm's own sale code so its stats and bonuses stay right. */
export function sellItem(s: State, d: Econ, id: string, n: number): { n: number; shards: number } {
    const def = ITEM_BY_ID.get(id);
    n = Math.floor(n);
    if (!def || !def.sellable || n < 1) return { n: 0, shards: 0 };
    const have = itemCount(s, id);
    const want = Math.min(n, have);
    if (want < 1) return { n: 0, shards: 0 };
    const k = keyOf(id);
    let sold = 0;
    let shards = 0;
    if (def.cat === "crop") ({ n: sold, shards } = sellRaw(s, farmCtx(d), k as Parameters<typeof sellRaw>[2], want));
    else if (def.cat === "ench") ({ n: sold, shards } = sellEnchanted(s, farmCtx(d), k as Parameters<typeof sellEnchanted>[2], want));
    else if (def.cat === "good") ({ n: sold, shards } = sellGood(s, farmCtx(d), k as Parameters<typeof sellGood>[2], want));
    else {
        const unit = unitValue(s, d, id);
        sold = itemTake(s, id, want);
        shards = unit * sold;
        s.shards += shards;
        s.total += shards;
    }
    const bonus = shards * (sellBonus(s) - 1);
    if (bonus > 0) {
        s.shards += bonus;
        s.total += bonus;
    }
    return { n: sold, shards: shards + bonus };
}

import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "./data";
import { eggBalance, eggLocked, eggPrice } from "./engine";
import { BOOSTS, BOOST_BY_ID } from "./boosters";
import { EGGS, EGG_BY_ID, type EggDef } from "./pets-data";
import { ITEM_BY_ID, PET_ITEMS, itemAdd } from "./items";
import { MAX_PAGES, dayNow } from "./inv-core";

// The Shop: one place to buy eggs, pet items, boosters and the upgrades that grow the inventory. Prices come in four
// currencies. Everything bought goes into the inventory. Eggs keep the old price creep (now counting eggs you hold);
// other goods get dearer by 10% per purchase today and reset with the daily restock; a rotating shelf of deals sells
// a few items cheaper in limited amounts, picked from the UTC date so everyone's shelf changes at the same time.

export type Cur = "shards" | "tokens" | "gems" | "dust";
export const CUR: Record<Cur, { name: string; one: string; color: string; symbol: McSymbolName }> = {
    shards: { name: "Shards", one: "shard", color: "var(--mc-aqua)", symbol: "pristine" },
    tokens: { name: "Tokens", one: "token", color: "var(--mc-yellow)", symbol: "magicFind" },
    gems: { name: "Gems", one: "gem", color: "var(--mc-light-purple)", symbol: "gem" },
    dust: { name: "Arcane Dust", one: "dust", color: "#d9a8ff", symbol: "flask" },
};

export const balance = (s: State, c: Cur) => (c === "shards" ? s.shards : c === "tokens" ? s.tokens : c === "gems" ? s.ap : s.enc.dust);
function spend(s: State, c: Cur, n: number) {
    if (c === "shards") s.shards -= n;
    else if (c === "tokens") s.tokens -= n;
    else if (c === "gems") s.ap -= n;
    else s.enc.dust -= n;
}

export type Section = "deals" | "eggs" | "pet" | "boost" | "upgrades" | "buyback";
export const SECTIONS: { id: Section; label: string; color: string; symbol: McSymbolName; blurb: string }[] = [
    { id: "deals", label: "Today's deals", color: "var(--mc-yellow)", symbol: "sunburst", blurb: "A few goods at a discount, in limited amounts. The shelf changes every day." },
    { id: "eggs", label: "Eggs", color: "var(--mc-gold)", symbol: "flower", blurb: "Buy eggs into your inventory, then hatch them from the Pets tab or the inventory." },
    { id: "pet", label: "Pet items", color: "#ff8fc7", symbol: "petLuck", blurb: "Food and star dust to level and upgrade the pets you own." },
    { id: "boost", label: "Boosters", color: "var(--mc-green)", symbol: "bolt", blurb: "Timed boosts. Switch them on from your inventory." },
    { id: "upgrades", label: "Upgrades", color: "var(--mc-light-purple)", symbol: "scales", blurb: "More inventory pages, better prices, more booster slots." },
    { id: "buyback", label: "Buy back", color: "var(--mc-red)", symbol: "hourglass", blurb: "Changed your mind? Take back what you sold at the price you got." },
];

// ---- Base prices ----

interface Buy {
    cur: Cur;
    /** Shards: max(min, peak income x secs). Other currencies: a flat price. */
    secs?: number;
    min?: number;
    price?: number;
    need?: (s: State) => string | null;
}
const BUY: Record<string, Buy> = {
    "pet:biscuit": { cur: "shards", secs: 240, min: 4e4 },
    "pet:cookie": { cur: "shards", secs: 800, min: 1.6e5 },
    "pet:feast": { cur: "shards", secs: 3000, min: 6e5 },
    "pet:stardust": { cur: "gems", price: 9, need: (s) => (s.asc >= 1 ? null : "Ascend once to unlock") },
    "boost:greed": { cur: "shards", secs: 1100, min: 6e4 },
    "boost:might": { cur: "shards", secs: 800, min: 5e4 },
    "boost:swarm": { cur: "shards", secs: 1100, min: 6e4 },
    "boost:wisdom": { cur: "shards", secs: 1400, min: 8e4 },
    "boost:lure": { cur: "shards", secs: 900, min: 5e4 },
    "boost:clover": { cur: "tokens", price: 12, need: (s) => (s.rebirths >= 1 || s.asc >= 1 ? null : "Rebirth once to unlock") },
    "boost:magnet": { cur: "tokens", price: 16, need: (s) => (s.rebirths >= 1 || s.asc >= 1 ? null : "Rebirth once to unlock") },
    "boost:frenzy": { cur: "gems", price: 6, need: (s) => (s.asc >= 1 ? null : "Ascend once to unlock") },
};
const eggDef = (id: string): EggDef | undefined => (id.startsWith("egg:") ? EGG_BY_ID.get(id.slice(4)) : undefined);

export const shopCur = (id: string): Cur => eggDef(id)?.cur ?? BUY[id]?.cur ?? "shards";
export const haggle = (s: State) => 1 - 0.03 * (s.inv.sup.haggle || 0);
export const bought = (s: State, key: string) => s.inv.shop.bought[key] || 0;

/** Why an item cannot be bought yet, or null. */
export function shopLocked(s: State, id: string): string | null {
    const e = eggDef(id);
    if (e) return eggLocked(s, e);
    return BUY[id]?.need?.(s) ?? null;
}

const flat = (s: State, id: string): number => {
    const b = BUY[id];
    if (!b) return Infinity;
    if (b.cur === "shards") return Math.max(b.min ?? 1, s.peakInc * (b.secs ?? 60)) * haggle(s);
    return Math.max(1, Math.ceil((b.price ?? 1) * haggle(s)));
};

/** Price of the next unit. `extra` = units already counted in this order (for bulk quotes). */
export function unitPrice(s: State, id: string, extra = 0): number {
    const e = eggDef(id);
    if (e) return eggPrice(s, e, extra);
    const creep = 1 + 0.1 * (bought(s, id) + extra);
    const p = flat(s, id) * creep;
    return BUY[id]?.cur === "shards" ? p : Math.ceil(p);
}

// ---- Daily deals ----

export interface Deal {
    key: string; // "deal:<item id>"
    id: string; // item id
    off: number; // 0.2 = 20% off
    limit: number;
    left: number;
    price: number;
    cur: Cur;
}

const mulberry = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const POOL = [...EGGS.map((e) => `egg:${e.id}`), ...PET_ITEMS.map((p) => p.id), ...BOOSTS.map((b) => b.id)];
export const dealCount = (s: State) => 4 + (s.inv.sup.deals || 0);

export function dealsFor(s: State, day = dayNow()): Deal[] {
    const rnd = mulberry(day * 2654435761);
    const pool = POOL.slice();
    const out: Deal[] = [];
    const n = Math.min(dealCount(s), pool.length);
    for (let i = 0; i < n; i++) {
        const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        const off = 0.15 + Math.floor(rnd() * 5) * 0.05; // 15% to 35%
        const limit = 2 + Math.floor(rnd() * 5); // 2 to 6
        const key = `deal:${id}`;
        const e = eggDef(id);
        const base = e ? eggPrice(s, e) : flat(s, id);
        const cur = shopCur(id);
        const price = cur === "shards" ? base * (1 - off) : Math.max(1, Math.ceil(base * (1 - off)));
        out.push({ key, id, off, limit, left: Math.max(0, limit - bought(s, key)), price, cur });
    }
    return out;
}

// ---- Upgrades ----

export interface ShopUp {
    id: string;
    name: string;
    desc: (lvl: number) => string;
    symbol: McSymbolName;
    color: string;
    max: number;
    base: number; // tokens
    growth: number;
    need?: (s: State) => string | null;
}
export const SHOP_UPS: ShopUp[] = [
    { id: "page2", name: "Inventory Page II", desc: () => "Unlocks the second page: 27 more slots.", symbol: "plus", color: "var(--mc-aqua)", max: 1, base: 25, growth: 1 },
    { id: "page3", name: "Inventory Page III", desc: () => "Unlocks the third page: 27 more slots.", symbol: "plus", color: "var(--mc-aqua)", max: 1, base: 150, growth: 1, need: (s) => (s.inv.pages >= 2 ? null : "Unlock Page II first") },
    { id: "license", name: "Merchant's Licence", desc: () => "Lets you set auto-sell rules in the inventory.", symbol: "key", color: "var(--mc-gold)", max: 1, base: 15, growth: 1 },
    { id: "haggle", name: "Haggler", desc: (l) => `Everything in the shop costs 3% less per level${l ? ` (now -${3 * l}%)` : ""}.`, symbol: "scales", color: "var(--mc-green)", max: 10, base: 12, growth: 1.6 },
    { id: "eye", name: "Merchant's Eye", desc: (l) => `Everything you sell pays 5% more per level${l ? ` (now +${5 * l}%)` : ""}.`, symbol: "eye", color: "var(--mc-yellow)", max: 10, base: 12, growth: 1.6 },
    { id: "deals", name: "Wider Shelf", desc: (l) => `One more daily deal per level${l ? ` (now ${4 + l})` : ""}.`, symbol: "sunburst", color: "#ffd24a", max: 3, base: 30, growth: 2.2 },
    { id: "belt", name: "Booster Belt", desc: (l) => `One more booster can run at once (now ${3 + l}).`, symbol: "bolt", color: "var(--mc-red)", max: 2, base: 60, growth: 3 },
    { id: "brew", name: "Long Brew", desc: (l) => `Boosters last 10% longer per level${l ? ` (now +${10 * l}%)` : ""}.`, symbol: "hourglass", color: "var(--mc-light-purple)", max: 5, base: 25, growth: 1.8 },
];
export const SHOP_UP_BY_ID = new Map(SHOP_UPS.map((u) => [u.id, u]));
export const upLevel = (s: State, id: string) => (id === "page2" ? Number(s.inv.pages >= 2) : id === "page3" ? Number(s.inv.pages >= 3) : s.inv.sup[id] || 0);
export const upCost = (s: State, u: ShopUp) => Math.ceil(u.base * Math.pow(u.growth, upLevel(s, u.id)));
export const upLocked = (s: State, u: ShopUp) => (upLevel(s, u.id) >= u.max ? "Maxed" : u.need?.(s) ?? null);

export function buyUpgrade(s: State, id: string): { ok: boolean; msg: string } {
    const u = SHOP_UP_BY_ID.get(id);
    if (!u) return { ok: false, msg: "No such upgrade" };
    const lock = upLocked(s, u);
    if (lock) return { ok: false, msg: lock };
    const cost = upCost(s, u);
    if (s.tokens < cost) return { ok: false, msg: "Not enough tokens" };
    s.tokens -= cost;
    if (id === "page2") s.inv.pages = Math.max(s.inv.pages, 2);
    else if (id === "page3") s.inv.pages = Math.min(MAX_PAGES, Math.max(s.inv.pages, 3));
    else s.inv.sup[id] = (s.inv.sup[id] || 0) + 1;
    return { ok: true, msg: `${u.name} bought` };
}

// ---- Buying goods ----

/** Cost and amount for up to n units (stops when the balance runs out). */
export function quote(s: State, id: string, n: number, deal?: Deal): { n: number; cost: number; cur: Cur } {
    const cur = deal?.cur ?? shopCur(id);
    let bal = balance(s, cur);
    let cost = 0;
    let got = 0;
    const cap = deal ? Math.min(n, deal.left) : Math.min(n, 500);
    for (let i = 0; i < cap; i++) {
        const p = deal ? deal.price : unitPrice(s, id, i);
        if (p > bal) break;
        bal -= p;
        cost += p;
        got++;
    }
    return { n: got, cost, cur };
}

/** How many the player could buy right now (price creep included). */
export const maxBuy = (s: State, id: string, deal?: Deal) => quote(s, id, 500, deal).n;

export function buyGoods(s: State, id: string, n: number, deal?: Deal): { ok: boolean; msg: string; n: number } {
    const def = ITEM_BY_ID.get(id);
    if (!def) return { ok: false, msg: "No such item", n: 0 };
    const lock = shopLocked(s, id);
    if (lock) return { ok: false, msg: lock, n: 0 };
    if (deal && deal.left < 1) return { ok: false, msg: "Sold out today", n: 0 };
    const q = quote(s, id, n, deal);
    if (q.n < 1) return { ok: false, msg: `Not enough ${CUR[q.cur].name.toLowerCase()}`, n: 0 };
    spend(s, q.cur, q.cost);
    itemAdd(s, id, q.n);
    const key = deal?.key ?? id;
    s.inv.shop.bought[key] = bought(s, key) + q.n;
    if (deal) s.inv.shop.bought[id] = bought(s, id) + q.n; // deals count toward the item's creep too
    s.inv.stats.bought += q.n;
    if (q.cur === "shards") s.inv.stats.spent += q.cost;
    return { ok: true, msg: `Bought ${q.n > 1 ? `${q.n} x ` : ""}${def.name}`, n: q.n };
}

/** Items on sale in each section (deals are separate: see dealsFor). */
export const SECTION_ITEMS: Record<"eggs" | "pet" | "boost", string[]> = {
    eggs: EGGS.map((e) => `egg:${e.id}`),
    pet: PET_ITEMS.map((p) => p.id),
    boost: BOOSTS.map((b) => b.id),
};
export const isBoost = (id: string) => BOOST_BY_ID.has(id);

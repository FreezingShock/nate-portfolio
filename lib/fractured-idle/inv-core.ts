import type { State } from "./data";
import { expireBoosts, type ActiveBoost } from "./boosters";
import { EGGS } from "./pets-data";
import { ITEM_BY_ID, ITEM_ORDER, catRank, isItem, itemCount, ownedIds, rarityRank, sellItem, unitValue } from "./items";
import type { Derived } from "./engine";

// Inventory state and the cheap, always-on parts: saving, slot layout, sorting, locks, auto-sell and the clock that
// expires boosters and rolls the shop's day. Actions that need pets or the shop live in inv-actions.ts and shop.ts.

export const PAGE_SIZE = 27; // 9 columns x 3 rows
export const MAX_PAGES = 3;
export const MAX_SLOTS = PAGE_SIZE * MAX_PAGES;
export const MAX_BUYBACK = 12;

export type SortKey = "type" | "rarity" | "name" | "value" | "count";
export const SORTS: { id: SortKey; label: string }[] = [
    { id: "type", label: "Type" },
    { id: "rarity", label: "Rarity" },
    { id: "name", label: "Name" },
    { id: "value", label: "Value" },
    { id: "count", label: "Amount" },
];

export interface BuybackEntry {
    id: string;
    n: number;
    paid: number; // shards received for the whole stack
}

export interface InvState {
    pages: number; // unlocked pages, 1 to 3
    slots: (string | null)[]; // item id per slot, MAX_SLOTS long
    locked: string[]; // protected from selling, bulk selling and auto-sell
    auto: Record<string, number>; // auto-sell rules: item id -> amount to keep
    items: Record<string, number>; // stock of items the inventory owns itself (eggs, pet items, boosters)
    active: ActiveBoost[]; // running boosters
    shop: { day: number; bought: Record<string, number> }; // UTC day the daily stock belongs to, and purchases made today
    sup: Record<string, number>; // shop upgrade levels
    buyback: BuybackEntry[]; // recent sales, newest first
    stats: { bought: number; sold: number; earned: number; spent: number; used: number; hatched: number };
    sort: SortKey; // last sort chosen
    t: number; // seconds since the last housekeeping pass; transient
    news: string[]; // notices for the UI to show (booster ended...); transient
}

export const newInv = (): InvState => ({
    pages: 1,
    slots: Array.from({ length: MAX_SLOTS }, () => null),
    locked: [],
    auto: {},
    items: {},
    active: [],
    shop: { day: 0, bought: {} },
    sup: {},
    buyback: [],
    stats: { bought: 0, sold: 0, earned: 0, spent: 0, used: 0, hatched: 0 },
    sort: "type",
    t: 0,
    news: [],
});

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const SORT_IDS = new Set<string>(SORTS.map((x) => x.id));

/** Read a saved inventory defensively: unknown ids are dropped, numbers clamped, layout repaired. */
export function cleanInv(raw: unknown): InvState {
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const out = newInv();
    out.pages = Math.max(1, Math.min(MAX_PAGES, Math.floor(num(o.pages, 1))));
    const slots = Array.isArray(o.slots) ? o.slots : [];
    const seen = new Set<string>();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const id = slots[i];
        if (isItem(id) && !seen.has(id) && i < out.pages * PAGE_SIZE) {
            out.slots[i] = id;
            seen.add(id);
        }
    }
    out.locked = (Array.isArray(o.locked) ? o.locked : []).filter((x, i, a): x is string => isItem(x) && a.indexOf(x) === i);
    for (const [k, v] of Object.entries(o.auto && typeof o.auto === "object" ? (o.auto as Record<string, unknown>) : {})) if (isItem(k) && num(v, -1) >= 0) out.auto[k] = Math.floor(num(v));
    for (const [k, v] of Object.entries(o.items && typeof o.items === "object" ? (o.items as Record<string, unknown>) : {})) if (isItem(k) && num(v) > 0 && /^(egg|boost|pet):/.test(k)) out.items[k] = Math.floor(num(v));
    out.active = (Array.isArray(o.active) ? o.active : [])
        .map((a) => a as Record<string, unknown>)
        .filter((a) => a && typeof a.id === "string" && ITEM_BY_ID.has(a.id) && num(a.end) > 0)
        .map((a) => ({ id: a.id as string, end: num(a.end), dur: Math.max(1000, num(a.dur, 60_000)) }))
        .slice(0, 8);
    const sh = (o.shop && typeof o.shop === "object" ? o.shop : {}) as Record<string, unknown>;
    out.shop.day = Math.floor(num(sh.day));
    for (const [k, v] of Object.entries(sh.bought && typeof sh.bought === "object" ? (sh.bought as Record<string, unknown>) : {})) if (num(v) > 0) out.shop.bought[k] = Math.floor(num(v));
    for (const [k, v] of Object.entries(o.sup && typeof o.sup === "object" ? (o.sup as Record<string, unknown>) : {})) if (num(v) > 0) out.sup[k] = Math.min(50, Math.floor(num(v)));
    out.buyback = (Array.isArray(o.buyback) ? o.buyback : [])
        .map((b) => b as Record<string, unknown>)
        .filter((b) => b && isItem(b.id) && num(b.n) >= 1 && num(b.paid) >= 0)
        .map((b) => ({ id: b.id as string, n: Math.floor(num(b.n)), paid: num(b.paid) }))
        .slice(0, MAX_BUYBACK);
    const st = (o.stats && typeof o.stats === "object" ? o.stats : {}) as Record<string, unknown>;
    for (const k of Object.keys(out.stats) as (keyof InvState["stats"])[]) out.stats[k] = Math.max(0, num(st[k]));
    out.sort = SORT_IDS.has(String(o.sort)) ? (o.sort as SortKey) : "type";
    return out;
}

/** Eggs in the inventory, of every kind. Eggs you hold count toward the price creep, so stockpiling is not a loophole. */
export const heldEggs = (s: State) => {
    let n = Math.floor(s.freeEggs);
    for (const e of EGGS) n += s.inv.items[`egg:${e.id}`] || 0;
    return n;
};

export const dayNow = (now = Date.now()) => Math.floor(now / 86_400_000);
export const msToRestock = (now = Date.now()) => (dayNow(now) + 1) * 86_400_000 - now;
/** Start a new shop day when the UTC date changes: stock and per-day price creep reset. */
export function rollShopDay(s: State, now = Date.now()): boolean {
    const day = dayNow(now);
    if (s.inv.shop.day === day) return false;
    s.inv.shop = { day, bought: {} };
    return true;
}

// ---- Slots ----

export const slotCap = (s: State) => s.inv.pages * PAGE_SIZE;

/**
 * Make the layout match what the player owns: empty slots of things that ran out, give new things the first free slot.
 * Items that do not fit stay safe in their storage and are returned as overflow (shown beside the grid).
 */
export function syncSlots(s: State): string[] {
    const inv = s.inv;
    const cap = slotCap(s);
    const placed = new Set<string>();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const id = inv.slots[i];
        if (!id) continue;
        if (i >= cap || placed.has(id) || itemCount(s, id) <= 0) inv.slots[i] = null;
        else placed.add(id);
    }
    const overflow: string[] = [];
    let free = 0;
    for (const id of ownedIds(s)) {
        if (placed.has(id)) continue;
        while (free < cap && inv.slots[free]) free++;
        if (free < cap) {
            inv.slots[free] = id;
            placed.add(id);
        } else overflow.push(id);
    }
    return overflow;
}

export function moveSlot(s: State, from: number, to: number): boolean {
    const cap = slotCap(s);
    if (from === to || from < 0 || to < 0 || from >= cap || to >= cap) return false;
    const a = s.inv.slots[from];
    s.inv.slots[from] = s.inv.slots[to];
    s.inv.slots[to] = a;
    return true;
}

/** Move an overflow item into a free slot (or swap with the one chosen). */
export function placeOverflow(s: State, id: string, to: number): boolean {
    const cap = slotCap(s);
    if (to < 0 || to >= cap || s.inv.slots.includes(id)) return false;
    s.inv.slots[to] = id;
    return true;
}

type ValueFn = (id: string) => number;

/** Rearrange every item (grid and overflow) in a stable order, packed from the first slot. */
export function sortSlots(s: State, key: SortKey, value: ValueFn): void {
    const ids = ownedIds(s);
    const total = (id: string) => value(id) * itemCount(s, id);
    const name = (id: string) => ITEM_BY_ID.get(id)!.name;
    const rar = (id: string) => rarityRank(ITEM_BY_ID.get(id)!.rarity);
    const type = (id: string) => catRank(ITEM_BY_ID.get(id)!.cat) * 1000 + (ITEM_ORDER.get(id) ?? 0);
    const cmp: Record<SortKey, (a: string, b: string) => number> = {
        type: (a, b) => type(a) - type(b),
        rarity: (a, b) => rar(b) - rar(a) || type(a) - type(b),
        name: (a, b) => name(a).localeCompare(name(b)),
        value: (a, b) => total(b) - total(a) || type(a) - type(b),
        count: (a, b) => itemCount(s, b) - itemCount(s, a) || type(a) - type(b),
    };
    ids.sort(cmp[key]);
    const cap = slotCap(s);
    s.inv.slots = Array.from({ length: MAX_SLOTS }, (_, i) => (i < cap ? ids[i] ?? null : null));
    s.inv.sort = key;
}

export const isLocked = (s: State, id: string) => s.inv.locked.includes(id);
export function toggleLock(s: State, id: string): boolean {
    if (!ITEM_BY_ID.has(id)) return false;
    const i = s.inv.locked.indexOf(id);
    if (i >= 0) s.inv.locked.splice(i, 1);
    else s.inv.locked.push(id);
    return true;
}

/** The merchant's auto-sell licence, bought in the Shop. */
export const hasLicense = (s: State) => (s.inv.sup.license || 0) > 0;

export function setAutoRule(s: State, id: string, keep: number | null): boolean {
    const def = ITEM_BY_ID.get(id);
    if (!def || !def.sellable || !hasLicense(s)) return false;
    if (keep === null) delete s.inv.auto[id];
    else s.inv.auto[id] = Math.max(0, Math.floor(keep));
    return true;
}

/** Once a second: expire boosters, roll the shop's day, tidy the layout, run auto-sell rules. */
export function tickInventory(s: State, d: Derived, dt: number) {
    const inv = s.inv;
    inv.t += dt;
    if (inv.t < 1) return;
    inv.t = 0;
    rollShopDay(s);
    for (const id of expireBoosts(s)) inv.news.push(`${ITEM_BY_ID.get(id)?.name ?? "A booster"} wore off`);
    if (inv.news.length > 6) inv.news.splice(0, inv.news.length - 6);
    syncSlots(s);
    if (!hasLicense(s)) return;
    for (const [id, keep] of Object.entries(inv.auto)) {
        if (isLocked(s, id)) continue;
        const extra = itemCount(s, id) - keep;
        if (extra < 1) continue;
        const r = sellItem(s, d, id, extra);
        if (r.n > 0) {
            inv.stats.sold += r.n;
            inv.stats.earned += r.shards;
        }
    }
}

/** What selling everything of a kind would pay, for the bulk-sell preview. */
export function stackValue(s: State, d: Parameters<typeof unitValue>[1], id: string, n = itemCount(s, id)) {
    return unitValue(s, d, id) * n;
}

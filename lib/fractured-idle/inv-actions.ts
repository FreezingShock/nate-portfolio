import { PET_MAX, PET_STAR_MAX, petLevel, petXpFor, PET_BY_ID, PETS } from "./pets-data";
import type { State } from "./data";
import { hatchMany, type Derived, type HatchResult } from "./engine";
import { startBoost, BOOST_BY_ID } from "./boosters";
import { ITEM_BY_ID, PET_ITEM_BY_ID, itemAdd, itemCount, itemTake, ownedIds, sellItem, unitValue } from "./items";
import { MAX_BUYBACK, isLocked } from "./inv-core";
import { consumeItem as mineConsume, crackGeode, DIMS as MINE_DIMS, GEODES, mineCtx } from "./mine";
import { consumeItem as farmConsume, openPod, farmCtx, PODS } from "./farm";
import { EGG_BY_ID } from "./pets-data";

// Everything the player does with items they own: sell, buy back, use, hatch, open. Each returns what happened so
// the UI can say it; nothing here touches React.

type Econ = Pick<Derived, "cps" | "avgClick" | "auto" | "xpMult" | "xpSkill" | "dustMult">;

export interface Result {
    ok: boolean;
    msg: string;
}
const no = (msg: string): Result => ({ ok: false, msg });

// ---- Selling and buyback ----

export function sellFromInv(s: State, d: Econ, id: string, n: number): { n: number; shards: number } {
    if (isLocked(s, id)) return { n: 0, shards: 0 };
    const r = sellItem(s, d, id, n);
    if (r.n > 0) {
        s.inv.stats.sold += r.n;
        s.inv.stats.earned += r.shards;
        pushBuyback(s, id, r.n, r.shards);
    }
    return r;
}

function pushBuyback(s: State, id: string, n: number, paid: number) {
    const b = s.inv.buyback;
    const same = b.findIndex((e) => e.id === id);
    if (same >= 0) {
        const e = b.splice(same, 1)[0];
        b.unshift({ id, n: e.n + n, paid: e.paid + paid });
    } else b.unshift({ id, n, paid });
    if (b.length > MAX_BUYBACK) b.length = MAX_BUYBACK;
}

/** Take a sold stack back for exactly what it paid. */
export function buyBack(s: State, index: number): Result {
    const e = s.inv.buyback[index];
    if (!e) return no("Nothing there");
    if (s.shards < e.paid) return no("Not enough shards");
    s.shards -= e.paid;
    itemAdd(s, e.id, e.n);
    s.inv.stats.spent += e.paid;
    s.inv.buyback.splice(index, 1);
    return { ok: true, msg: `Bought back ${e.n} ${ITEM_BY_ID.get(e.id)?.name ?? "items"}` };
}

export interface SellPick {
    id: string;
    n: number;
    shards: number;
}

/** What a bulk sale would do: every unlocked, sellable item that passes `filter`, keeping `keep` of each. */
export function sellPlan(s: State, d: Econ, filter: (id: string) => boolean, keep = 0): SellPick[] {
    const out: SellPick[] = [];
    for (const id of ownedIds(s)) {
        const def = ITEM_BY_ID.get(id);
        if (!def?.sellable || isLocked(s, id) || !filter(id)) continue;
        const n = itemCount(s, id) - keep;
        if (n < 1) continue;
        out.push({ id, n, shards: unitValue(s, d, id) * n });
    }
    return out;
}

export function runSellPlan(s: State, d: Econ, plan: SellPick[]): { n: number; shards: number } {
    let n = 0;
    let shards = 0;
    for (const p of plan) {
        const r = sellFromInv(s, d, p.id, p.n);
        n += r.n;
        shards += r.shards;
    }
    return { n, shards };
}

// ---- Using items ----

export function activateBooster(s: State, id: string): Result {
    const def = BOOST_BY_ID.get(id);
    if (!def) return no("Not a booster");
    if (itemCount(s, id) < 1) return no("You have none");
    const r = startBoost(s, id);
    if (!r.ok) return no(r.why ?? "Cannot start it");
    itemTake(s, id, 1);
    s.inv.stats.used++;
    return { ok: true, msg: `${def.name} is active` };
}

export function applyPetItem(s: State, id: string, petId: string): Result {
    const item = PET_ITEM_BY_ID.get(id);
    const pet = PET_BY_ID.get(petId);
    const st = s.pets[petId];
    if (!item || !pet || !st) return no("Pick a pet you own");
    if (itemCount(s, id) < 1) return no("You have none");
    if (item.star) {
        if (st.n - 1 >= PET_STAR_MAX) return no(`${pet.name} already has every star`);
        itemTake(s, id, 1);
        st.n++;
        s.inv.stats.used++;
        return { ok: true, msg: `${pet.name} gained a star` };
    }
    const lv = petLevel(pet, st.xp);
    if (lv >= PET_MAX) return no(`${pet.name} is already max level`);
    itemTake(s, id, 1);
    const gain = (item.feed ?? 0) * (petXpFor(pet, lv + 1) - petXpFor(pet, lv)) * (1 + 0.3 * (s.aups.mentor || 0));
    st.xp = Math.min(petXpFor(pet, PET_MAX), st.xp + gain);
    s.inv.stats.used++;
    return { ok: true, msg: `${pet.name} ate the ${item.name.toLowerCase()}` };
}

/** Pets an item could be used on right now (for the picker), best targets first. */
export function petTargets(s: State, id: string): string[] {
    const item = PET_ITEM_BY_ID.get(id);
    if (!item) return [];
    return PETS.filter((p) => {
        const st = s.pets[p.id];
        if (!st) return false;
        return item.star ? st.n - 1 < PET_STAR_MAX : petLevel(p, st.xp) < PET_MAX;
    })
        .sort((a, b) => Number(s.equip.includes(b.id)) - Number(s.equip.includes(a.id)))
        .map((p) => p.id);
}

/** Use a Mine or Farm consumable from the inventory. */
export function consumeFromInv(s: State, d: Econ, id: string): Result {
    const [kind, key] = id.split(":");
    if (itemCount(s, id) < 1) return no("You have none");
    let text: string | null = null;
    if (kind === "mine") text = mineConsume(s, key as Parameters<typeof mineConsume>[1], mineCtx(d));
    else if (kind === "farm") text = farmConsume(s, key as Parameters<typeof farmConsume>[1]);
    if (!text) return no("It had no effect");
    s.inv.stats.used++;
    return { ok: true, msg: text };
}

/** Crack geodes or open pods of one dimension. */
export function openCache(s: State, d: Econ, id: string, all: boolean): Result {
    const [kind, dim] = id.split(":");
    if (itemCount(s, id) < 1) return no("You have none");
    let n = 0;
    let last = "";
    const ctx = { avgClick: d.avgClick, cps: d.cps, dust: d.dustMult };
    if (kind === "geode" && (MINE_DIMS as string[]).includes(dim)) {
        const dm = dim as (typeof MINE_DIMS)[number];
        while ((s.mine.geodes[dm] || 0) > 0 && (all || n < 1) && n < 200) {
            const out = crackGeode(s, ctx, dm);
            if (!out) break;
            n++;
            last = out.sub;
        }
        if (n) return { ok: true, msg: `Cracked ${n} ${GEODES[dm].name}${n > 1 ? "s" : ""}: ${last}` };
    } else if (kind === "pod" && dim in PODS) {
        const dm = dim as keyof typeof PODS;
        while ((s.farm.pods[dm] || 0) > 0 && (all || n < 1) && n < 200) {
            const out = openPod(s, farmCtx(d), dm);
            if (!out) break;
            n++;
            last = out.sub;
        }
        if (n) return { ok: true, msg: `Opened ${n} ${PODS[dm].name}${n > 1 ? "s" : ""}: ${last}` };
    }
    return no("Could not open it");
}

/** Hatch eggs of one kind from the inventory; the UI plays the reveal. */
export function hatchFromInv(s: State, eggId: string, n: number): HatchResult[] {
    if (!EGG_BY_ID.has(eggId)) return [];
    return hatchMany(s, eggId, Math.min(n, itemCount(s, `egg:${eggId}`)));
}

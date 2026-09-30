import { skillLevel, skillXpFor, type State } from "./data";
import type { EStat } from "./enchant";

// Mining: the skill page. Break ore nodes in the Mine (tap a node until it
// cracks) to get ore, Mining XP and shards; spend ore on pickaxes, upgrades and
// drills; every ore has a collection that pays permanent bonuses; nodes
// sometimes drop geodes that pay tokens, eggs, dust, fragments and even
// ascension points. Drills keep mining while you are away. The UI is in
// components/games/fractured-idle/tab-mine.tsx; the permanent bonuses reach the
// rest of the game through mineFx() (added to enchant.allFx).

export type OreId = "coal" | "copper" | "iron" | "gold" | "redstone" | "lapis" | "diamond" | "emerald" | "amethyst" | "netherite";

export interface OreDef {
    id: OreId;
    name: string;
    color: string;
    need: number; // Mining level that opens it
    hp: number; // taps of pick power 1 to break a node
    vm: number; // shard value multiplier per node
    drill: number; // ore per second per drill
    drillCost: number; // ore for the first drill
    col: [EStat, number]; // collection reward per tier
    colText: string;
}

export const ORES: OreDef[] = [
    { id: "coal", name: "Coal", color: "#8a8a99", need: 0, hp: 4, vm: 0.6, drill: 0.25, drillCost: 30, col: ["click", 0.02], colText: "click power" },
    { id: "copper", name: "Copper", color: "#e0874a", need: 3, hp: 6, vm: 0.8, drill: 0.2, drillCost: 40, col: ["minion", 0.02], colText: "minion output" },
    { id: "iron", name: "Iron", color: "#d8d8e6", need: 8, hp: 10, vm: 1, drill: 0.16, drillCost: 50, col: ["crit", 0.003], colText: "crit chance" },
    { id: "gold", name: "Gold", color: "#ffcc33", need: 14, hp: 16, vm: 1.3, drill: 0.12, drillCost: 60, col: ["all", 0.01], colText: "all shards" },
    { id: "redstone", name: "Redstone", color: "#ff4d4d", need: 20, hp: 24, vm: 1.7, drill: 0.09, drillCost: 70, col: ["auto", 0.15], colText: "auto-clicks/s" },
    { id: "lapis", name: "Lapis", color: "#5a7dff", need: 26, hp: 34, vm: 2.2, drill: 0.07, drillCost: 80, col: ["dust", 0.03], colText: "Arcane Dust" },
    { id: "diamond", name: "Diamond", color: "#55ffff", need: 33, hp: 50, vm: 3, drill: 0.05, drillCost: 90, col: ["click", 0.04], colText: "click power" },
    { id: "emerald", name: "Emerald", color: "#55ff77", need: 40, hp: 75, vm: 4, drill: 0.04, drillCost: 100, col: ["tokens", 0.05], colText: "rebirth tokens" },
    { id: "amethyst", name: "Amethyst", color: "#c58bff", need: 48, hp: 110, vm: 5.5, drill: 0.03, drillCost: 110, col: ["luck", 0.03], colText: "enchant luck" },
    { id: "netherite", name: "Netherite", color: "#c98a9a", need: 56, hp: 170, vm: 8, drill: 0.02, drillCost: 120, col: ["all", 0.02], colText: "all shards" },
];
export const ORE_BY_ID = Object.fromEntries(ORES.map((o) => [o.id, o])) as Record<OreId, OreDef>;
const ORE_IDS = new Set<string>(ORES.map((o) => o.id));

/** Mined-count thresholds for each collection tier. */
export const COL_AT = [25, 100, 400, 1500, 6000];
export const colTierOf = (mined: number) => COL_AT.filter((n) => mined >= n).length;

export interface PickDef {
    id: string;
    name: string;
    color: string;
    power: number;
    need: number;
    cost: Partial<Record<OreId, number>>;
}
export const PICKS: PickDef[] = [
    { id: "wood", name: "Wooden Pickaxe", color: "#b98a4a", power: 1, need: 0, cost: {} },
    { id: "stone", name: "Stone Pickaxe", color: "#a0a0ac", power: 1.6, need: 2, cost: { coal: 60 } },
    { id: "copper", name: "Copper Pickaxe", color: "#e0874a", power: 2.5, need: 5, cost: { coal: 200, copper: 50 } },
    { id: "iron", name: "Iron Pickaxe", color: "#d8d8e6", power: 4, need: 10, cost: { copper: 200, iron: 60 } },
    { id: "gold", name: "Golden Pickaxe", color: "#ffcc33", power: 6.5, need: 16, cost: { iron: 220, gold: 60 } },
    { id: "diamond", name: "Diamond Pickaxe", color: "#55ffff", power: 10, need: 33, cost: { gold: 250, redstone: 120, diamond: 40 } },
    { id: "nether", name: "Netherite Pickaxe", color: "#c98a9a", power: 17, need: 56, cost: { diamond: 300, emerald: 80, netherite: 30 } },
    { id: "cosmic", name: "Cosmic Pickaxe", color: "#ffb3f2", power: 30, need: 60, cost: { netherite: 200, amethyst: 400 } },
];
/** Click power every pickaxe tier adds for the rest of the game. */
export const PICK_CLICK = 0.04;

export interface MineUpDef {
    id: string;
    name: string;
    desc: string;
    per: string; // what one level does, for the readout
    ore: OreId;
    base: number;
    growth: number;
    max: number;
    need: number;
}
export const MINE_UPS: MineUpDef[] = [
    { id: "eff", name: "Efficiency", desc: "Every tap hits harder", per: "+10% pick power", ore: "coal", base: 15, growth: 1.38, max: 30, need: 0 },
    { id: "fort", name: "Fortune", desc: "More ore from every node", per: "+8% ore per node", ore: "copper", base: 12, growth: 1.4, max: 30, need: 3 },
    { id: "haste", name: "Haste", desc: "Nodes grow back sooner", per: "-6% respawn time", ore: "iron", base: 10, growth: 1.4, max: 15, need: 8 },
    { id: "lucky", name: "Lucky Strike", desc: "Chance for a triple haul", per: "+1.5% triple chance", ore: "gold", base: 8, growth: 1.45, max: 20, need: 14 },
    { id: "seeker", name: "Gem Seeker", desc: "Nodes drop geodes more often", per: "+10% geode chance", ore: "redstone", base: 8, growth: 1.4, max: 20, need: 20 },
    { id: "prosp", name: "Prospector", desc: "Rarer ore shows up more often", per: "rarer ore weight", ore: "lapis", base: 8, growth: 1.45, max: 15, need: 26 },
    { id: "drillt", name: "Drill Tech", desc: "Every drill runs faster", per: "+15% drill output", ore: "diamond", base: 6, growth: 1.45, max: 20, need: 33 },
    { id: "scholar", name: "Scholar", desc: "Learn more from every swing", per: "+6% Mining XP", ore: "emerald", base: 6, growth: 1.45, max: 15, need: 40 },
    { id: "deep", name: "Deep Core", desc: "Power from the deep", per: "+1% all shards", ore: "amethyst", base: 5, growth: 1.5, max: 15, need: 48 },
    { id: "ancient", name: "Ancient Power", desc: "Netherite hums with old magic", per: "+1.5% all shards, +2% tokens", ore: "netherite", base: 3, growth: 1.6, max: 10, need: 56 },
];
export const MINE_UP_BY_ID = Object.fromEntries(MINE_UPS.map((u) => [u.id, u])) as Record<string, MineUpDef>;

export interface MineState {
    ore: Record<string, number>; // ore in stock
    mined: Record<string, number>; // lifetime per ore (collection)
    pick: number; // index into PICKS
    ups: Record<string, number>;
    drills: Record<string, number>;
    nodes: number; // nodes broken
    golden: number; // golden nodes broken
    geodes: number; // geodes waiting to be cracked
    cracked: number; // geodes cracked
    focus: string; // ore to prospect for ("" = anything)
}

export const newMine = (): MineState => ({ ore: {}, mined: {}, pick: 0, ups: {}, drills: {}, nodes: 0, golden: 0, geodes: 0, cracked: 0, focus: "" });

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function cleanMine(raw: unknown): MineState {
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const out = newMine();
    const rec = (src: unknown, keep: (k: string) => boolean, floor = false) => {
        const r: Record<string, number> = {};
        for (const [k, v] of Object.entries(src && typeof src === "object" ? (src as Record<string, unknown>) : {})) if (keep(k) && num(v) > 0) r[k] = floor ? Math.floor(num(v)) : num(v);
        return r;
    };
    out.ore = rec(o.ore, (k) => ORE_IDS.has(k));
    out.mined = rec(o.mined, (k) => ORE_IDS.has(k));
    out.ups = rec(o.ups, (k) => !!MINE_UP_BY_ID[k], true);
    for (const u of MINE_UPS) if (out.ups[u.id]) out.ups[u.id] = Math.min(u.max, out.ups[u.id]);
    out.drills = rec(o.drills, (k) => ORE_IDS.has(k), true);
    out.pick = Math.max(0, Math.min(PICKS.length - 1, Math.floor(num(o.pick))));
    out.nodes = Math.max(0, Math.floor(num(o.nodes)));
    out.golden = Math.max(0, Math.floor(num(o.golden)));
    out.geodes = Math.max(0, Math.floor(num(o.geodes)));
    out.cracked = Math.max(0, Math.floor(num(o.cracked)));
    out.focus = typeof o.focus === "string" && ORE_IDS.has(o.focus) ? o.focus : "";
    return out;
}

// ---- Numbers ----

export const mineLevel = (s: State) => skillLevel(s.mining);
export const oreOpen = (s: State, o: OreDef) => mineLevel(s) >= o.need;
export const openOres = (s: State) => ORES.filter((o) => oreOpen(s, o));
export const upLevel = (s: State, id: string) => s.mine.ups[id] || 0;
export const have = (s: State, id: OreId) => s.mine.ore[id] || 0;

export const pickOf = (s: State) => PICKS[s.mine.pick];
export const pickPower = (s: State) => pickOf(s).power * (1 + 0.1 * upLevel(s, "eff"));
export const yieldMult = (s: State) => 1 + 0.08 * upLevel(s, "fort");
export const luckyChance = (s: State) => 0.015 * upLevel(s, "lucky");
export const geodeChance = (s: State) => 0.012 * (1 + 0.1 * upLevel(s, "seeker"));
export const respawnMs = (s: State) => Math.max(250, 950 * Math.pow(0.94, upLevel(s, "haste")));
export const drillMult = (s: State) => 1 + 0.15 * upLevel(s, "drillt") + 0.5 * (yieldMult(s) - 1);
export const drillRate = (s: State, o: OreDef) => (s.mine.drills[o.id] || 0) * o.drill * drillMult(s);
export const totalDrillRate = (s: State) => openOres(s).reduce((a, o) => a + drillRate(s, o), 0);
export const mineXpMult = (s: State) => 1 + 0.06 * upLevel(s, "scholar");
export const GOLDEN_CHANCE = 0.03;

/** Mining XP for breaking one node of an ore: a fixed slice of the level the ore opens at, so better ore keeps levelling you. */
export const oreXp = (o: OreDef) => Math.max(3, 0.12 * (skillXpFor(o.need + 1) - skillXpFor(o.need)));

export function upCost(s: State, u: MineUpDef): number {
    return Math.ceil(u.base * Math.pow(u.growth, upLevel(s, u.id)));
}

export function drillCost(s: State, o: OreDef): number {
    return Math.ceil(o.drillCost * Math.pow(1.17, s.mine.drills[o.id] || 0));
}

export interface Blocker {
    ok: boolean;
    why?: string;
}

export function canBuyUp(s: State, u: MineUpDef): Blocker {
    if (mineLevel(s) < u.need) return { ok: false, why: `Mining ${u.need}` };
    if (upLevel(s, u.id) >= u.max) return { ok: false, why: "Maxed" };
    if (have(s, u.ore) < upCost(s, u)) return { ok: false, why: `Needs ${ORE_BY_ID[u.ore].name}` };
    return { ok: true };
}

export function buyMineUp(s: State, id: string): boolean {
    const u = MINE_UP_BY_ID[id];
    if (!u || !canBuyUp(s, u).ok) return false;
    s.mine.ore[u.ore] = have(s, u.ore) - upCost(s, u);
    s.mine.ups[id] = upLevel(s, id) + 1;
    return true;
}

export function canBuyPick(s: State): Blocker {
    const next = PICKS[s.mine.pick + 1];
    if (!next) return { ok: false, why: "Best pickaxe" };
    if (mineLevel(s) < next.need) return { ok: false, why: `Mining ${next.need}` };
    for (const [id, n] of Object.entries(next.cost)) if (have(s, id as OreId) < (n ?? 0)) return { ok: false, why: `Needs ${ORE_BY_ID[id as OreId].name}` };
    return { ok: true };
}

export function buyPick(s: State): boolean {
    if (!canBuyPick(s).ok) return false;
    const next = PICKS[s.mine.pick + 1];
    for (const [id, n] of Object.entries(next.cost)) s.mine.ore[id] = have(s, id as OreId) - (n ?? 0);
    s.mine.pick += 1;
    return true;
}

export function canBuyDrill(s: State, o: OreDef): Blocker {
    if (!oreOpen(s, o)) return { ok: false, why: `Mining ${o.need}` };
    if (have(s, o.id) < drillCost(s, o)) return { ok: false, why: "Not enough ore" };
    return { ok: true };
}

export function buyDrill(s: State, id: OreId): boolean {
    const o = ORE_BY_ID[id];
    if (!o || !canBuyDrill(s, o).ok) return false;
    s.mine.ore[id] = have(s, id) - drillCost(s, o);
    s.mine.drills[id] = (s.mine.drills[id] || 0) + 1;
    return true;
}

export function setFocus(s: State, id: string): boolean {
    if (id && !ORE_IDS.has(id)) return false;
    s.mine.focus = id;
    return true;
}

// ---- Permanent bonuses ----

/** Everything Mining permanently adds to the rest of the game (summed into enchant.allFx). */
export function mineFx(s: State): Partial<Record<EStat, number>> {
    const fx: Partial<Record<EStat, number>> = {};
    const add = (k: EStat, v: number) => {
        if (v) fx[k] = (fx[k] ?? 0) + v;
    };
    add("click", PICK_CLICK * s.mine.pick);
    for (const o of ORES) add(o.col[0], o.col[1] * colTierOf(s.mine.mined[o.id] || 0));
    add("all", 0.01 * upLevel(s, "deep") + 0.015 * upLevel(s, "ancient"));
    add("tokens", 0.02 * upLevel(s, "ancient"));
    return fx;
}

// ---- Nodes ----

export interface Node {
    ore: OreId;
    hp: number;
    max: number;
    golden: boolean;
}

type Rng = () => number;

/** Pick an ore for a fresh node from everything unlocked: the best ore is most common, Prospector shifts weight upward, a focus ore gets a bonus. */
export function rollOre(s: State, rng: Rng = Math.random): OreId {
    const open = openOres(s);
    const top = open.length - 1;
    const base = 0.55 / (1 + 0.05 * upLevel(s, "prosp"));
    const w = open.map((_, i) => Math.pow(base, top - i) + (i === top ? 0.25 : 0));
    const f = s.mine.focus && open.find((o) => o.id === s.mine.focus);
    if (f && rng() < 0.45) return f.id;
    let r = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < open.length; i++) {
        if (r < w[i]) return open[i].id;
        r -= w[i];
    }
    return open[top].id;
}

export function newNode(s: State, rng: Rng = Math.random): Node {
    const id = rollOre(s, rng);
    const o = ORE_BY_ID[id];
    const golden = rng() < GOLDEN_CHANCE;
    const max = Math.max(1, Math.round(o.hp * (golden ? 1.5 : 1)));
    return { ore: id, hp: max, max, golden };
}

export interface Broke {
    ore: OreId;
    amount: number;
    lucky: boolean;
    golden: boolean;
    xp: number;
    shards: number;
    geode: boolean;
}

/** Shard value of a node: a few clicks' worth plus a few seconds of passive income, scaled by the ore. */
export const nodeShards = (d: { avgClick: number; cps: number }, o: OreDef, golden: boolean) =>
    (d.avgClick * (6 + 0.6 * o.hp) + d.cps * (3 + 0.05 * o.hp)) * o.vm * (golden ? 3 : 1);

/** Pay out a broken node: ore, Mining XP, shards and maybe a geode. */
export function breakNode(s: State, node: Node, d: { avgClick: number; cps: number; xpMult: number; xpSkill: { mining: number } }, rng: Rng = Math.random): Broke {
    const o = ORE_BY_ID[node.ore];
    const lucky = rng() < luckyChance(s);
    const y = yieldMult(s);
    let amount = Math.floor(y) + (rng() < y - Math.floor(y) ? 1 : 0);
    if (node.golden) amount *= 5;
    if (lucky) amount *= 3;
    amount = Math.max(1, amount);
    const xp = oreXp(o) * (node.golden ? 2 : 1) * d.xpMult * d.xpSkill.mining * mineXpMult(s);
    const shards = nodeShards(d, o, node.golden);
    s.mine.ore[o.id] = have(s, o.id) + amount;
    s.mine.mined[o.id] = (s.mine.mined[o.id] || 0) + amount;
    s.mine.nodes += 1;
    if (node.golden) s.mine.golden += 1;
    s.mining += xp;
    s.shards += shards;
    s.total += shards;
    const geode = rng() < geodeChance(s) * (node.golden ? 3 : 1);
    if (geode) s.mine.geodes += 1;
    return { ore: o.id, amount, lucky, golden: node.golden, xp, shards, geode };
}

/** Drills: ore while you play and while you are away. */
export function tickMine(s: State, dt: number, xpRate: number) {
    if (dt <= 0) return;
    for (const o of ORES) {
        const n = s.mine.drills[o.id];
        if (!n || !oreOpen(s, o)) continue;
        const amt = drillRate(s, o) * dt;
        s.mine.ore[o.id] = have(s, o.id) + amt;
        s.mine.mined[o.id] = (s.mine.mined[o.id] || 0) + amt;
        s.mining += amt * oreXp(o) * 0.08 * xpRate * mineXpMult(s);
    }
}

// ---- Geodes ----

export interface GeodeOut {
    title: string;
    sub: string;
    color: string;
}

export interface GeodeD {
    avgClick: number;
    cps: number;
    dustMult: number;
}

/** Crack one geode: dust, tokens, eggs, shards, fragments or (rarely) an ascension point. */
export function crackGeode(s: State, d: GeodeD, rng: Rng = Math.random): GeodeOut | null {
    if (s.mine.geodes < 1) return null;
    s.mine.geodes -= 1;
    s.mine.cracked += 1;
    const r = rng();
    const tier = Math.max(1, Math.floor(Math.log10(Math.max(10, s.total)) / 6));
    if (r < 0.3) {
        const n = Math.round((30 + rng() * 50) * d.dustMult);
        s.enc.dust += n;
        s.enc.earned += n;
        return { title: "Arcane Dust", sub: `+${n} dust`, color: "#d9a8ff" };
    }
    if (r < 0.58) {
        const n = 1 + tier + Math.floor(rng() * 2);
        s.tokens += n;
        return { title: "Rebirth Tokens", sub: `+${n} tokens`, color: "var(--mc-yellow)" };
    }
    if (r < 0.74) {
        s.freeEggs += 1;
        return { title: "Wooden Egg", sub: "a free egg to hatch", color: "var(--mc-gold)" };
    }
    if (r < 0.92) {
        const n = (d.avgClick * 40 + d.cps * 240) * (1 + rng());
        s.shards += n;
        s.total += n;
        return { title: "Shard Vein", sub: "a rich seam of shards", color: "var(--mc-aqua)" };
    }
    if (r < 0.985) {
        s.frag += 1;
        return { title: "Fracture Fragment", sub: "+0.2% all shards, forever", color: "var(--mc-light-purple)" };
    }
    s.ap += 1;
    return { title: "Ascension Shard", sub: "+1 ascension point", color: "var(--mc-red)" };
}

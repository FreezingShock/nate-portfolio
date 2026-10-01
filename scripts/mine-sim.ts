// Balance simulation for Mining: a player who holds the button (a few swings a
// second at a steady combo), always buys what the next pickaxe needs and travels
// to the island that has it. Run with: npx tsx scripts/mine-sim.ts [swingsPerSec] [hours] [combo]
import { ISLANDS } from "../lib/fractured-idle/data";
import { newState } from "../lib/fractured-idle/engine";
import {
    MINE_UPS, ORES, PICKS, RECIPES, RECIPE_BY_ID, buyDrill, buyMineUp, buyPick, canBuyPick, canBuyUp, canCraft, collectAll, geodeCount, crackGeode, DIMS, haveOre, have, idleSwings, mineLevel, oreTable, startCraft, swing, tickMine, totalDrills, consumeItem, type Cost, type MineCtx, type ResId, isOre, ISLAND_ORES, drillCost, ORE_BY_ID,
} from "../lib/fractured-idle/mine";
import { skillLevel } from "../lib/fractured-idle/data";

const SPS = Number(process.argv[2] ?? 6);
const HOURS = Number(process.argv[3] ?? 6);
const COMBO = Number(process.argv[4] ?? 2.5);

const s = newState();
s.total = 1e40; // every main-path island is open
s.island = "hub";
const ctx: MineCtx = { avgClick: 100, cps: 100, auto: 0.5, xp: 1.15, dust: 1 };
const D = { avgClick: ctx.avgClick, cps: ctx.cps, dust: 1 };

let now = 1_000_000_000_000;
const DT = 2;
const log: string[] = [];
const t0 = () => `${String(Math.floor(clock / 3600)).padStart(2, "0")}:${String(Math.floor((clock % 3600) / 60)).padStart(2, "0")}`;
let clock = 0;
const seen = new Set<string>();
const mark = (k: string, m: string) => {
    if (!seen.has(k)) {
        seen.add(k);
        log.push(`${t0()}  ${m}`);
    }
};

// Everything one goal needs, with ingots expanded into their ore.
function needs(cost: Cost, mult = 1, out: Record<string, number> = {}) {
    for (const [id, n] of Object.entries(cost)) {
        const want = (n ?? 0) * mult;
        const short = want - have(s, id as ResId);
        if (short <= 0) continue;
        if (isOre(id)) out[id] = (out[id] || 0) + short;
        else {
            const r = RECIPE_BY_ID[id];
            if (r) needs(r.inputs, short, out);
        }
    }
    return out;
}

function goalCost(): Cost | null {
    const out: Cost = {};
    const next = PICKS[s.mine.pick + 1];
    const add = (c: Cost) => { for (const [k, v] of Object.entries(c)) out[k as ResId] = (out[k as ResId] || 0) + (v ?? 0); };
    if (next && mineLevel(s) >= next.need) add(next.cost);
    for (const r of RECIPES) if (r.kind === "relic" && mineLevel(s) >= r.need && !s.mine.relics.includes(r.out) && !s.mine.jobs.some((j) => j.r === r.id)) add(r.inputs);
    return Object.keys(out).length ? out : null;
}

function chooseIsland() {
    const goal = goalCost();
    const lvl = mineLevel(s);
    let want: Record<string, number> = goal ? needs(goal) : {};
    // relics too, cheapest first
    void lvl;
    let bestId = s.island;
    let bestScore = -1;
    for (const isl of ISLANDS) {
        if (!Number.isFinite(isl.at) || !ISLAND_ORES[isl.id]) continue;
        const rows = oreTable(s, isl.id, isl.dim);
        let sc = 0;
        for (const r of rows) {
            if (r.p <= 0) continue;
            if (want[r.ore.id]) sc += r.p * 10;
            sc += r.p * r.ore.need * 0.05; // xp
        }
        if (sc > bestScore) {
            bestScore = sc;
            bestId = isl.id;
        }
    }
    s.island = bestId;
}

function shop() {
    // forge: finish what is done, start what is useful
    for (const c of collectAll(s, now)) void c;
    const goal = goalCost();
    const lvl = mineLevel(s);
    const want = goal ? needs(goal) : {};
    void want;
    for (const r of RECIPES) {
        if (lvl < r.need) continue;
        if (r.kind === "relic") {
            if (canCraft(s, r).ok) startCraft(s, r.id, 1, now);
            continue;
        }
        if (r.kind === "ingot") {
            const stock = have(s, r.out as ResId);
            const needed = (goal && (goal as Record<string, number>)[r.out]) || 0;
            const cap = Math.min(40, Math.max(needed, 6));
            if (stock < cap && canCraft(s, r, 1).ok) {
                const n = Math.max(1, Math.min(cap - stock, 5));
                for (let k = n; k >= 1; k--) if (canCraft(s, r, k).ok) { startCraft(s, r.id, k, now); break; }
            }
        } else if (!process.env.NOITEMS && canCraft(s, r, 1).ok && (s.mine.items[r.out] || 0) < 3) startCraft(s, r.id, 1, now);
    }
    for (const id of ["dynamite", "rushPotion", "geodeCache"] as const) while ((s.mine.items[id] || 0) > 0) consumeItem(s, id, ctx);
    if (canBuyPick(s).ok) {
        buyPick(s);
        mark(`pick${s.mine.pick}`, `${PICKS[s.mine.pick].name} (power ${PICKS[s.mine.pick].power})`);
    }
    for (let g = 0; g < 6; g++) {
        let did = false;
        for (const u of MINE_UPS) {
            if (!canBuyUp(s, u).ok) continue;
            // keep a reserve for the goal
            const c = Object.entries(u.cost)[0];
            const stock = have(s, c[0] as ResId);
            const price = (c[1] ?? 0) * Math.pow(u.growth, s.mine.ups[u.id] || 0);
            if (u.cat !== "forge" && goal && (goal as Record<string, number>)[c[0]] && stock - price < (goal as Record<string, number>)[c[0]]) continue;
            if (buyMineUp(s, u.id)) did = true;
        }
        for (const o of ORES) {
            if (mineLevel(s) < o.need) continue;
            const stock = haveOre(s, o.id);
            const price = drillCost(s, o);
            if (stock > price * 3 && (!goal || !(goal as Record<string, number>)[o.id] || stock - price > (goal as Record<string, number>)[o.id])) if (buyDrill(s, o.id, 1)) did = true;
        }
        if (!did) break;
    }
    for (const dim of DIMS) while ((s.mine.geodes[dim] || 0) > 0) crackGeode(s, D, dim);
}

let lastLevel = 0;
let lastReport = -1;
const end = HOURS * 3600;
while (clock < end) {
    if (clock % 10 === 0) chooseIsland();
    const n = Math.round(SPS * DT);
    for (let i = 0; i < n; i++) swing(s, ctx, { combo: COMBO, crit: Math.random() < 0.1 });
    tickMine(s, DT, ctx);
    clock += DT;
    now += DT * 1000;
    if (clock % 4 === 0) shop();
    const lvl = skillLevel(s.mining);
    if (lvl > lastLevel) {
        for (let l = lastLevel + 1; l <= lvl; l++) if (l % 5 === 0 || l === 1 || l === 3) mark(`lvl${l}`, `Mining level ${l}  (island ${s.island}, pick ${PICKS[s.mine.pick].name}, ${totalDrills(s)} drills, ${idleSwings(s, ctx.auto).toFixed(1)} idle swings/s)`);
        lastLevel = lvl;
    }
    for (const r of s.mine.relics) mark(`rel${r}`, `Relic: ${r}`);
    const hr = Math.floor(clock / 3600);
    if (hr !== lastReport && clock % 3600 < DT) {
        lastReport = hr;
        const stock = ORES.filter((o) => haveOre(s, o.id) >= 1).map((o) => `${o.name} ${Math.floor(haveOre(s, o.id))}`).join(", ");
        log.push(`--- ${hr}h: level ${lvl}, ${Math.floor(s.mine.nodes)} swings, ${s.mine.cracked} geodes cracked, ${s.mine.crafted} crafts, ${geodeCount(s)} geodes waiting\n    stock: ${stock}`);
    }
}
console.log(log.join("\n"));
console.log(`\nFinal: level ${skillLevel(s.mining)}, pick ${PICKS[s.mine.pick].name}, relics ${s.mine.relics.length}/9, drills ${totalDrills(s)}, ups ${Object.values(s.mine.ups).reduce((a, b) => a + b, 0)}`);
void ORE_BY_ID;
for (const r of RECIPES.filter((x) => x.kind === "relic")) {
    const c = canCraft(s, r, 1);
    console.log(r.id.padEnd(8), s.mine.relics.includes(r.out) ? "owned" : c.ok ? "can" : c.why, JSON.stringify(Object.fromEntries(Object.entries(r.inputs).map(([k, v]) => [k, `${Math.floor(have(s, k as ResId))}/${v}`]))));
}
console.log("ingots", JSON.stringify(s.mine.ingots), "jobs", JSON.stringify(s.mine.jobs.map((j) => j.r)), "slots free", 1 + (s.mine.ups.furnace || 0) - s.mine.jobs.length);

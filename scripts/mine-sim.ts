// Balance simulation for Mining: a player who holds the button (a few swings a second at a steady combo),
// keeps the Forge busy for the next goal (drill parts, pickaxes, relics), enchants their tool and travels to the
// island that has the ore they are short of. Run with: npx tsx scripts/mine-sim.ts [swingsPerSec] [hours] [combo]
import { ISLANDS, skillLevel } from "../lib/fractured-idle/data";
import { newState } from "../lib/fractured-idle/engine";
import {
    ISLAND_ORES, RECIPES, autoRig, bottleneck, canCraft, claimAllFeats, collectAll, crackAll, drillMk, enchantAll, goalOf, hasDrill, heldTool, idleSwings,
    mineLevel, oreTable, queueGoal, startCraft, swing, tickMine, consumeItem, equipRelic, type MineCtx, type OreId,
} from "../lib/fractured-idle/mine";

const SPS = Number(process.argv[2] ?? 6);
const HOURS = Number(process.argv[3] ?? 6);
const COMBO = Number(process.argv[4] ?? 2.5);

const s = newState();
s.total = 1e40; // every main-path island is open
s.island = "hub";
const ctx: MineCtx = { avgClick: 100, cps: 100, auto: 0.5, xp: 1.15, dust: 1 };

let now = 1_000_000_000_000;
const DT = 2;
let clock = 0;
const log: string[] = [];
const seen = new Set<string>();
const t0 = () => `${String(Math.floor(clock / 3600)).padStart(2, "0")}:${String(Math.floor((clock % 3600) / 60)).padStart(2, "0")}`;
const mark = (k: string, m: string) => {
    if (!seen.has(k)) {
        seen.add(k);
        log.push(`${t0()}  ${m}`);
    }
};

function chooseIsland() {
    const goal = goalOf(s);
    const want = goal ? bottleneck(s, goal) : null;
    let best = s.island;
    let bestScore = -1;
    for (const isl of ISLANDS) {
        if (!Number.isFinite(isl.at) || !ISLAND_ORES[isl.id]) continue;
        let sc = 0;
        for (const r of oreTable(s, isl.id, isl.dim)) {
            if (r.p <= 0) continue;
            if (want && r.ore.id === (want as OreId)) sc += r.p * 10;
            sc += r.p * r.ore.need * 0.05;
        }
        if (sc > bestScore) {
            bestScore = sc;
            best = isl.id;
        }
    }
    s.island = best;
}

function shop() {
    collectAll(s, now);
    crackAll(s, ctx);
    claimAllFeats(s);
    queueGoal(s, now);
    for (const r of RECIPES) {
        if (mineLevel(s) < r.need || r.kind === "ingot" || r.kind === "item") continue;
        if (canCraft(s, r, 1).ok) startCraft(s, r.id, 1, now);
    }
    autoRig(s);
    enchantAll(s);
    for (const id of s.mine.relics) equipRelic(s, id);
    for (const id of ["dynamite", "rushPotion", "geodeCache"] as const) while ((s.mine.items[id] || 0) > 0) consumeItem(s, id, ctx);
}

let lastLevel = 0;
let lastReport = -1;
const end = HOURS * 3600;
while (clock < end) {
    if (clock % 10 === 0) chooseIsland();
    const n = Math.round(SPS * DT);
    for (let i = 0; i < n; i++) swing(s, ctx, { combo: COMBO, crit: Math.random() < 0.1 });
    tickMine(s, DT, ctx, now);
    clock += DT;
    now += DT * 1000;
    if (clock % 4 === 0) shop();
    const lvl = skillLevel(s.mining);
    if (lvl > lastLevel) {
        for (let l = lastLevel + 1; l <= lvl; l++) if (l % 5 === 0 || l === 1 || l === 3) mark(`lvl${l}`, `Mining level ${l}  (${heldTool(s).name}, ${idleSwings(s, ctx.auto).toFixed(1)} idle swings/s, on ${s.island})`);
        lastLevel = lvl;
    }
    if (hasDrill(s)) mark("drill", `First drill (Mk ${drillMk(s)})`);
    for (let mk = 2; mk <= 10; mk++) if (drillMk(s) >= mk) mark(`mk${mk}`, `Drill Mk ${mk}`);
    for (const r of s.mine.relics) mark(`rel${r}`, `Relic: ${r}`);
    for (const p of s.mine.picks) mark(`pk${p}`, `Pickaxe: ${p}`);
    const hr = Math.floor(clock / 3600);
    if (hr !== lastReport && clock % 3600 < DT) {
        lastReport = hr;
        log.push(`--- ${hr}h: level ${lvl}, ${Math.floor(s.mine.nodes)} swings, ${s.mine.cracked} geodes cracked, ${s.mine.crafted} crafts, parts ${s.mine.parts.length}, enchant levels ${Object.values(s.mine.ench).reduce((a, e) => a + Object.values(e).reduce((x, y) => x + y, 0), 0)}`);
    }
}
console.log(log.join("\n"));
console.log(`\nFinal: level ${skillLevel(s.mining)}, ${heldTool(s).name}, relics ${s.mine.relics.length}, parts ${s.mine.parts.length}, picks ${s.mine.picks.length}`);
const g = goalOf(s);
console.log("goal", g?.title, JSON.stringify(g?.cost), "need level", g?.need);
console.log("ingots", JSON.stringify(s.mine.ingots), "jobs", JSON.stringify(s.mine.jobs.map((j) => j.r)));
console.log("ore", JSON.stringify(Object.fromEntries(Object.entries(s.mine.ore).map(([k, v]) => [k, Math.floor(v)]))));

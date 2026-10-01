// Balance simulation for Fractured Idle: a greedy player who clicks a few
// times a second, always buys the best-payback item and rebirths as soon as
// it is worthwhile. Run with: npx tsx scripts/fi-sim.ts [clicksPerSec] [hours]
import { ASC_UPS, ISLANDS, MINIONS, MINION_GROWTH, REBIRTH_UPS, UPGRADES } from "../lib/fractured-idle/data";
import * as E from "../lib/fractured-idle/engine";
import type { Derived } from "../lib/fractured-idle/engine";
const { ascend, ascPlan, buyAscUp, advance, buyRebirthUp, buyUpgrade, checkTrophies, derive, fmtTime, newState, rebirth, rebirthPlan, trophyCounts, upCost, bulk, milestoneMult } = E;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const X = E as any;
const minionBase = (s: State, i: number): number => (X.minionBase ? X.minionBase(s, i) : MINIONS[i].cost * E.minionDiscount(s));
const upAvailable = (s: State, u: (typeof UPGRADES)[number]): boolean => (X.upAvailable ? X.upAvailable(s, u) : true);
import type { State } from "../lib/fractured-idle/data";
import { islandOpen } from "../lib/fractured-idle/island-logic";
import { updateFxp } from "../lib/fractured-idle/fxp";
import { DUST_CLICK, RARITIES, SLOT_IDS, addDust, canRoll, discardCand, enchScore, enchLevel, equipCand, rollSlot } from "../lib/fractured-idle/enchant";
import { claimMilestones } from "../lib/fractured-idle/skills";
import * as MN from "../lib/fractured-idle/mine";
import * as FM from "../lib/fractured-idle/farm";
void 0;

const CPS_IN = Number(process.argv[2] ?? 4);
const HOURS = Number(process.argv[3] ?? 24);
const clone = (s: State): State => JSON.parse(JSON.stringify(s));
const income = E.income; void income;
const inc = (d: Derived, clicks: number) => d.cps + (d.auto + clicks) * d.avgClick;

function click(s: State, d: Derived, n: number) {
    const v = d.click * (1 + d.critChance * d.critDmg) * n;
    s.shards += v; s.total += v; s.clicks += n;
    // Every click is a swing (expected value at a typical held combo of x2.2).
    if (!process.env.NOMINE) MN.bulkSwings(s, MN.mineCtx(d), n, MN.pickPower(s) * MN.comboFactor(2.2), 1);
    // ...and every click waters the garden (about 4 clicks a second).
    if (!process.env.NOFARM) for (let i = 0; i < Math.min(n, 60); i++) FM.water(s, { combo: 2.2 });
    const c = d.critChance * n; s.crits += c; s.combat += 3 * d.xpMult * c;
    addDust(s, n * DUST_CLICK * d.dustMult + (1.3 * d.dustMult * n) / (CPS_IN * 40)); // click motes + roughly one popup per 40s
}

// A patient player rolls whatever they can afford every 30s, round-robin over the open slots, and wears anything stronger.
function enchantStep(s: State, d: Derived) {
    if (process.env.NO_ENCH) return;
    for (let g = 0; g < 80; g++) {
        let any = false;
        for (const slot of SLOT_IDS) {
            if (!canRoll(s, slot).ok) continue;
            const out = rollSlot(s, slot, d.xpMult);
            if (!out) continue;
            any = true;
            const cur = s.enc.eq[slot];
            if (!cur || enchScore(out.cand) > enchScore(cur)) equipCand(s, slot); else discardCand(s, slot);
        }
        if (!any) break;
    }
}

// A player who uses the Mine without living in it: every few seconds they press the quick actions.
function mineBot(s: State, d: Derived, now: number) {
    if (process.env.NOMINE || process.env.NOBOT) return;
    const ctx = MN.mineCtx(d);
    MN.collectAll(s, now);
    MN.crackAll(s, ctx);
    MN.claimAllFeats(s);
    if (MN.canBuyPick(s).ok) MN.buyPick(s);
    MN.upgradeAll(s);
    MN.buildDrillsAll(s);
    for (const r of MN.RECIPES) {
        if (r.kind === "relic" && MN.canCraft(s, r, 1).ok) MN.startCraft(s, r.id, 1, now);
    }
    MN.queueGoal(s, now);
    for (const r of s.mine.relics) MN.equipRelic(s, r);
    for (const id of ["dynamite", "rushPotion", "geodeCache"] as const) while ((s.mine.items[id] || 0) > 0) MN.consumeItem(s, id, ctx);
}

// A player who tends the garden without living in it: the quick actions every few seconds.
function farmBot(s: State, d: Derived, now: number) {
    if (process.env.NOFARM || process.env.NOFARMBOT) return;
    const ctx = FM.farmCtx(d);
    FM.collectAll(s, now);
    FM.harvestAll(s, ctx, true);
    const goal = FM.goalOf(s);
    const need = goal ? FM.bottleneck(s, goal) : null;
    FM.setSow(s, need && FM.cropTable(s).some((r) => r.open && r.crop.id === need) ? need : "");
    FM.plantAll(s);
    if (!process.env.NOFARMGRANTS) { FM.openAll(s, ctx); FM.claimAllFeats(s); }
    if (FM.canBuyHoe(s).ok) FM.buyHoe(s);
    FM.upgradeAll(s);
    FM.hireAll(s);
    for (const r of FM.RECIPES) if (r.kind === "relic" && FM.canCraft(s, r, 1).ok) FM.startCraft(s, r.id, 1, now);
    FM.queueGoal(s, now);
    for (const r of s.farm.relics) FM.equipRelic(s, r);
    for (const id of ["fertilizer", "tonic", "basket"] as const) while ((s.farm.items[id] || 0) > 0) FM.consumeItem(s, id);
}

type Cand = { cost: number; payback: number; buy: () => void; name?: string };

function best(s: State, d: Derived): Cand | null {
    const base = inc(d, CPS_IN);
    let top: Cand | null = null;
    const consider = (c: Cand) => { if (isFinite(c.payback) && (!top || c.payback < top.payback)) top = c; };
    MINIONS.forEach((m, i) => {
        if (i > 0 && s.minions[i] === 0 && s.total < m.cost * 0.25) return;
        const { n, cost } = bulk(minionBase(s, i), MINION_GROWTH, s.minions[i], 0, 1);
        const tm = clone(s); tm.minions[i] += n;
        const gain = inc(derive(tm), CPS_IN) - base;
        void milestoneMult;
        consider({ cost, payback: cost / gain, name: 'minion ' + m.id, buy: () => { s.shards -= cost; s.minions[i] += n; } });
    });
    for (const u of UPGRADES) {
        const l = s.ups[u.id] || 0;
        if (l >= u.max || !upAvailable(s, u) || (u.minion !== undefined && s.minions[u.minion] === 0)) continue;
        const cost = upCost(s, u.id, l);
        const t = clone(s); t.ups[u.id] = l + 1;
        const g = inc(derive(t), CPS_IN) - base;
        consider({ cost, payback: cost / g, name: 'up ' + u.id, buy: () => { buyUpgrade(s, u.id); } });
    }
    return top;
}

const s = newState();
const log: string[] = [];
const seen = new Set<string>();
const mark = (key: string, msg: string) => { if (!seen.has(key)) { seen.add(key); log.push(`${fmtTime(s.playTime).padStart(9)}  ${msg}`); } };
let lastRebirthAt = 0;
let t = 0;
const DT = Number(process.env.DT ?? 1);
while (t < HOURS * 3600) {
    let d = derive(s);
    click(s, d, CPS_IN * DT);
    advance(s, d, DT);
    t += DT;
    if (DT >= 2 || Math.floor(t) % 2 === 0) {
        // buy loop
        for (let g = 0; g < 200; g++) {
            d = derive(s);
            const b = best(s, d);
            if (!b || b.cost > s.shards) break;
            // don't let a distant purchase starve us: only buy when it pays back within 20 min
            if (b.payback > 1200 && s.shards < b.cost * 3) break;
            const before = inc(d, CPS_IN);
            b.buy();
            if (process.env.JUMPS) {
                const ratio = inc(derive(s), CPS_IN) / before;
                if (ratio > 1.4 && t > Number(process.env.JUMPS)) console.log(`JUMP t=${Math.round(t)} r=${s.rebirths} x${ratio.toFixed(2)} ${b.name ?? ''}`);
            }
        }
        // rebirth tokens
        for (let g = 0; g < 50; g++) {
            const order = [...REBIRTH_UPS].sort((a, b) => a.cost * Math.pow(a.growth, s.rups[a.id] || 0) - b.cost * Math.pow(b.growth, s.rups[b.id] || 0));
            const pick = order.find((u) => buyRebirthUp(s, u.id));
            if (!pick) break;
        }
    }
    if (t % 30 === 0) enchantStep(s, derive(s));
    if (t % 5 === 0) mineBot(s, derive(s), Date.now() + t * 1000);
    if (t % 5 === 0) farmBot(s, derive(s), Date.now() + t * 1000);
    if (t % 1800 === 0 && !process.env.NOFARM) console.log(`FARM t=${(t / 3600).toFixed(1)}h lvl ${FM.farmLevel(s)} hoe ${FM.hoeOf(s).name} plots ${s.farm.plots.length} hands ${FM.totalHands(s)} reaper ${FM.upLevel(s, "reaper")} crows ${s.farm.relics.length} feats ${s.farm.claimed.length}/${FM.FEATS.length} harvests ${s.farm.harvests} pods ${s.farm.opened} island ${s.island}`);
    if (t % 1800 === 0 && !process.env.NOMINE) console.log(`MINE t=${(t / 3600).toFixed(1)}h lvl ${MN.mineLevel(s)} pick ${MN.pickOf(s).name} drills ${MN.totalDrills(s)} idle ${MN.idleSwings(s, derive(s).auto).toFixed(1)}/s relics ${s.mine.relics.length} feats ${s.mine.claimed.length}/${MN.FEATS.length} crafts ${s.mine.crafted} geodes ${s.mine.cracked} income ${inc(derive(s), CPS_IN).toExponential(2)}`);
    if (t % 10 === 0) claimMilestones(s);
    const fresh = checkTrophies(s);
    if (t % 10 === 0) { updateFxp(s, true); if ([3600, 21600].includes(t)) console.log(`FXP t=${t / 3600}h level ${s.lvl} (${Object.values(s.fxp).reduce((x, y) => x + y, 0)} xp)`); { const by: Record<string, number> = {}; for (const [k, v] of Object.entries(s.fxp)) by[k.split(':')[0]] = (by[k.split(':')[0]] || 0) + v; console.log('   ', JSON.stringify(by)); } }
    if (process.env.SNAP && (process.env.SNAP === "fine" ? t % 30 === 0 && t <= 900 : [600, 1200, 3600, 7200].includes(t))) {
        const dd = derive(s);
        console.log(`SNAP t=${t}s rebirths=${s.rebirths} income=${inc(dd, CPS_IN).toExponential(2)} cps=${dd.cps.toExponential(2)} click=${dd.click.toExponential(2)} all=${dd.all.toExponential(2)} rMult=${dd.rMult.toExponential(2)} island=${dd.islandMult} ach=${dd.achMult.toFixed(2)} allUp=${dd.allUp.toExponential(2)} minionUp=${dd.minionUp.toExponential(2)} clickUp=${dd.clickUp.toExponential(2)} auto=${dd.auto} syn=${dd.synergy} minions=${s.minions.join(',')}`);
    }
    ISLANDS.forEach((i) => s.total >= i.at && mark("isl" + i.id, `island: ${i.name}`));
    // Stand on whichever island pays the most right now (set NO_ISLAND=1 to stay on the Hub).
    if (t % 20 === 0 && !process.env.NO_ISLAND) {
        let best = s.island;
        let bv = -1;
        for (const i of ISLANDS) {
            if (!islandOpen(s, i)) continue;
            const v = inc(derive({ ...s, island: i.id }), CPS_IN);
            if (v > bv) { bv = v; best = i.id; }
        }
        s.island = best;
    }
    const ap = ascPlan(s);
    if (ap.can && s.rebirths >= ap.req + Number(process.env.ASC_EXTRA ?? 2)) {
        const at = s.rebirths;
        ascend(s);
        mark('asc' + s.asc, `ASCEND #${s.asc} at rebirth ${at} (+${ap.ap} AP)`);
        lastRebirthAt = t;
        for (let g = 0; g < 60; g++) {
            const pick = [...ASC_UPS].filter((u) => u.id.startsWith('perch') === false).sort((a, b) => a.cost * Math.pow(a.growth, s.aups[a.id] || 0) - b.cost * Math.pow(b.growth, s.aups[b.id] || 0)).find((u) => buyAscUp(s, u.id));
            if (!pick) break;
        }
    }
    const plan = rebirthPlan(s);
    // rebirth once the stack is full, or once we've waited long enough since the last one
    if (plan.count > 0 && (plan.count >= 1 + (s.rups.stack || 0) || t - lastRebirthAt > Number(process.env.REB_WAIT ?? 1800))) {
        const before = s.rebirths;
        rebirth(s);
        lastRebirthAt = t;
        mark("rb" + s.rebirths, `rebirth ${before} -> ${s.rebirths} (+${plan.tokens} tokens), income before ${Math.round(inc(d, CPS_IN)).toExponential(2)}`);
    }
    void fresh;
}
const d = derive(s);
console.log(log.join("\n"));
console.log(`\nAfter ${HOURS}h @ ${CPS_IN} clicks/s: rebirths ${s.rebirths}, lifetime ${s.total.toExponential(2)}, income ${inc(d, CPS_IN).toExponential(2)}/s, trophies ${trophyCounts(s).got}/${trophyCounts(s).all}`);
console.log("minions", s.minions.join(","), "tokens", s.tokens, "rups", JSON.stringify(s.rups));
const worn = SLOT_IDS.map((k) => s.enc.eq[k] ? `${k}:${RARITIES[s.enc.eq[k]!.r].name[0]}${s.enc.eq[k]!.id}` : `${k}:-`).join(" ");
console.log(`enchanting lvl ${enchLevel(s)} rolls ${s.enc.rolls} dust ${Math.round(s.enc.dust)} luck ${d.luck.toFixed(2)} all-fx x${d.all.toExponential(2)} worn ${worn} byR ${s.enc.byR.join("/")}`);


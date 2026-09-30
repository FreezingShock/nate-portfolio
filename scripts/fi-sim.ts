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
void 0;

const CPS_IN = Number(process.argv[2] ?? 4);
const HOURS = Number(process.argv[3] ?? 24);
const clone = (s: State): State => JSON.parse(JSON.stringify(s));
const income = E.income; void income;
const inc = (d: Derived, clicks: number) => d.cps + (d.auto + clicks) * d.avgClick;

function click(s: State, d: Derived, n: number) {
    const v = d.click * (1 + d.critChance * d.critDmg) * n;
    s.shards += v; s.total += v; s.clicks += n; s.mining += d.xpMult * n;
    const c = d.critChance * n; s.crits += c; s.combat += 3 * d.xpMult * c;
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
    const fresh = checkTrophies(s);
    if (process.env.SNAP && (process.env.SNAP === "fine" ? t % 30 === 0 && t <= 900 : [600, 1200, 3600, 7200].includes(t))) {
        const dd = derive(s);
        console.log(`SNAP t=${t}s rebirths=${s.rebirths} income=${inc(dd, CPS_IN).toExponential(2)} cps=${dd.cps.toExponential(2)} click=${dd.click.toExponential(2)} all=${dd.all.toExponential(2)} rMult=${dd.rMult.toExponential(2)} island=${dd.islandMult} ach=${dd.achMult.toFixed(2)} allUp=${dd.allUp.toExponential(2)} minionUp=${dd.minionUp.toExponential(2)} clickUp=${dd.clickUp.toExponential(2)} auto=${dd.auto} syn=${dd.synergy} minions=${s.minions.join(',')}`);
    }
    ISLANDS.forEach((i) => s.total >= i.at && mark("isl" + i.id, `island: ${i.name}`));
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
    if (plan.count > 0 && (plan.count >= 1 + (s.rups.stack || 0) || t - lastRebirthAt > 1800)) {
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

